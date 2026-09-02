import {describe, expect, test} from "bun:test"
import {join} from "node:path"

const componentsRoot = import.meta.dir

describe("production linked CSS theme", () => {
  test("publishes one plain CSS resource without a TypeScript theme runtime", async () => {
    const manifest = await Bun.file(join(componentsRoot, "package.json")).json()
    const theme = await Bun.file(join(componentsRoot, "theme.css")).text()

    expect(manifest.exports["./theme.css"]).toBe("./theme.css")
    expect(manifest.exports["./theme"]).toBeUndefined()
    expect(await Bun.file(join(componentsRoot, "theme.ts")).exists()).toBeFalse()
    expect(theme).toContain(":root")
    expect(theme).not.toContain("--ui-")
  })

  test("layers bounded foundations into semantic roles", async () => {
    const theme = await Bun.file(join(componentsRoot, "theme.css")).text()

    expect(declaration(theme, "--primary-500")).toBe("71 114 179")
    expect(declaration(theme, "--surface-600")).toBe("84 84 84")
    expect(declaration(theme, "--success-500")).toBe("24 134 37")
    expect(declaration(theme, "--warning-500")).toBe("172 135 55")
    expect(declaration(theme, "--error-500")).toBe("119 17 17")
    expect(declaration(theme, "--widget-regular-background"))
      .toBe("rgb(var(--surface-600))")
    expect(declaration(theme, "--widget-regular-background-selected"))
      .toBe("rgb(var(--primary-500))")
    expect(declaration(theme, "--state-success")).toBe("rgb(var(--success-500))")
  })

  test("owns shared density, typography and material foundations", async () => {
    const theme = await Bun.file(join(componentsRoot, "theme.css")).text()

    expect(declaration(theme, "--control-height-small")).toBe("18px")
    expect(declaration(theme, "--control-height-medium")).toBe("22px")
    expect(declaration(theme, "--control-height-large")).toBe("28px")
    expect(declaration(theme, "--font-size-xs")).toBe("11px")
    expect(declaration(theme, "--line-height-control")).toBe("1")
    expect(declaration(theme, "--border-width-control")).toBe("1px")
    expect(declaration(theme, "--radius-small")).toBe("3px")
    expect(declaration(theme, "--radius-medium")).toBe("4px")
    expect(declaration(theme, "--radius-large")).toBe("6px")
    expect(declaration(theme, "--control-content-gap")).toBe("var(--spacing-3)")
    expect(declaration(theme, "--material-widget-emboss"))
      .toBe("rgb(var(--surface-black) / 0.149)")
  })

  test("leaves no production owner coupled to the removed JS resolver", async () => {
    const paths = await Array.fromAsync(
      new Bun.Glob("*.tsx").scan({cwd: componentsRoot, absolute: true})
    )
    const production = (await Promise.all(paths.map(path => Bun.file(path).text()))).join("\n")

    expect(production).not.toContain("resolveWidgetColors")
    expect(production).not.toContain("rgba8ToColor")
    expect(production).not.toContain("widgetCssVariables")
    expect(production).not.toContain("uiTheme")
    expect(production).not.toContain('./theme.ts')
  })
})

function declaration(css: string, name: string): string | undefined {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`, "u").exec(css)
  return match?.[1]?.trim()
}

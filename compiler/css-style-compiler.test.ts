import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {JsxCompileError} from "./errors.ts"
import {JsxCompilerSession} from "./session.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const session = new JsxCompilerSession({
  cwd: fixtureRoot,
  sourceRoots: [fixtureRoot],
  styleSourceRootIds: ["@fixture/styles"],
})

beforeAll(() => session.prepareFiles([
  resolve(fixtureRoot, "css-style.tsx"),
  resolve(fixtureRoot, "css-alias.tsx"),
  resolve(fixtureRoot, "css-dynamic-pseudo.tsx"),
  resolve(fixtureRoot, "css-fake-global.tsx"),
  resolve(fixtureRoot, "css-fake-branded-global.tsx"),
  resolve(fixtureRoot, "css-component-prop.tsx"),
  resolve(fixtureRoot, "css-component-pseudo.tsx"),
  resolve(fixtureRoot, "css-invalid-selector.tsx"),
  resolve(fixtureRoot, "css-redundant-base.tsx"),
  resolve(fixtureRoot, "css-direct-order.tsx"),
  resolve(fixtureRoot, "css-single-use-const.tsx"),
  resolve(fixtureRoot, "css-unused-const.tsx"),
  resolve(fixtureRoot, "css-multi-declarator-const.tsx"),
  resolve(fixtureRoot, "css-extra-reference-const.tsx"),
  resolve(fixtureRoot, "css-reused-const.tsx"),
  resolve(fixtureRoot, "css-exported-const.tsx"),
  resolve(fixtureRoot, "css-export-list-const.tsx"),
  resolve(fixtureRoot, "css-shadow.tsx"),
]))
afterAll(() => session.close())

describe("Template scoped css JSX compiler", () => {
  test("lowers inline and same-module const css through existing style metadata", async () => {
    const code = await compiled("css-style.tsx")
    const component = code.slice(
      code.indexOf("export const CssButton"),
      code.indexOf("export function createCssStyleRuntimeRoot"),
    )
    const ids = [...component.matchAll(/StyleSheet\("([^"]+)"/g)].map(match => match[1]!)

    expect(ids).toHaveLength(1)
    expect(new Set(ids).size).toBe(ids.length)
    expect(component).toContain(':focus{border-color:" + String(focusColor)')
    expect(component).toContain(':hover{background:" + "var(--hover-color);color:')
    expect(component).toContain('"var(--hover-text, rgb(255 255 255))}"')
    expect(component).toContain("Boolean(props.selected)")
    expect(component).toContain('"--hover-color: " + String(props.hoverColor)')
    expect(component).toContain('"width: " + String(props.width) + "px"')
    expect(component).toContain("props.style")
    expect(component.match(/BindStyle\(__zComp0Node0\)/g)).toHaveLength(1)
    expect(component).toContain('kind: "authored-css"')
    expect(component).toContain('moduleId: "@fixture/styles/css-style.tsx"')
    expect(component).toContain('componentName: "CssButton"')
    expect(component).toContain('"&:hover{background:" + "var(--hover-color)')
    expect(component.match(/, \{kind: "authored-css"/g)).toHaveLength(1)
    expect(component).toContain(' + "\\n" + "&:hover{background:"')
    expect(component).toContain(' + "\\n" + "color:"')
    expect(component).toContain('&[data-variant=\\"text\\"]')
    expect(component).toContain('&[data-variant=\\"text\\"][aria-pressed=\\"true\\"]:hover')
    expect(component).not.toContain('cssText: "[&]')
    expect(component).not.toContain('cssText: "&{--hover-color:')
    expect(component).not.toContain("css`")
  })

  test("lowers base-only component style props into inline CSS", async () => {
    const code = await compiled("css-component-prop.tsx")
    expect(code).toContain('"style": ["color: " + "red"]')
    expect(code).not.toContain("css`")
  })

  test("admits a private CSS const only for same-module reuse", async () => {
    const reused = await compiled("css-reused-const.tsx")
    expect(reused).not.toContain("const sharedCss")
    expect(reused.match(/box-sizing:/g)).toHaveLength(2)
  })

  test("preserves mixed direct declarations, rules, fragments, and source provenance", async () => {
    const code = await compiled("css-direct-order.tsx")
    const source = code.slice(code.indexOf('{kind: "authored-css"'))
    const display = source.indexOf('cssText: "display:"')
    const focus = source.indexOf("&:focus")
    const localColor = source.indexOf("rgb(4 4 4)")
    const middlePseudo = source.indexOf("&:hover")
    const middleBase = source.indexOf("rgb(3 3 3)")
    const conditionalBase = source.indexOf('"opacity:"')
    const conditionalPseudo = source.indexOf("&:active")
    const conditionalTail = source.indexOf("height:")
    const finalBase = source.indexOf("min-width:")

    expect(display).toBeGreaterThan(-1)
    expect(focus).toBeGreaterThan(display)
    expect(localColor).toBeGreaterThan(focus)
    expect(middlePseudo).toBeGreaterThan(localColor)
    expect(middleBase).toBeGreaterThan(middlePseudo)
    expect(conditionalBase).toBeGreaterThan(middleBase)
    expect(conditionalPseudo).toBeGreaterThan(conditionalBase)
    expect(conditionalTail).toBeGreaterThan(conditionalPseudo)
    expect(finalBase).toBeGreaterThan(conditionalTail)
    expect(code).toContain('"width: " + String(props.width) + "px"')
    expect(code).toContain("Boolean(props.active)")
    expect(code).toContain("props.style")
    expect(code).not.toContain('cssText: "&{display:')
    expect(code).not.toContain("css`")
  })

  test("rejects imports, shadows, caller pseudos, invalid selectors and dynamic owner selectors", async () => {
    const cases = [
      ["css-dynamic-pseudo.tsx", "cannot depend on props or component state"],
      ["css-component-pseudo.tsx", "component style prop rejects selector &:hover"],
      ["css-invalid-selector.tsx", "must start with &"],
      ["css-redundant-base.tsx", "write base declarations directly and remove the & { } wrapper"],
      ["css-single-use-const.tsx", "private module CSS const singleUseCss requires at least two compiled style sites, received 1"],
      ["css-unused-const.tsx", "private module CSS const unusedCss requires at least two compiled style sites, received 0"],
      ["css-multi-declarator-const.tsx", "a module CSS const must be the only declaration in its const statement"],
      ["css-extra-reference-const.tsx", "private module CSS const sharedCss may only be referenced by compiled style sites"],
      ["css-exported-const.tsx", "module CSS const publicCss cannot be exported"],
      ["css-export-list-const.tsx", "module CSS const listedCss cannot be exported"],
      ["css-alias.tsx", "remove the css import"],
      ["css-shadow.tsx", "intrinsic style authoring requires a css tagged template"],
      ["css-fake-global.tsx", "intrinsic style authoring requires a css tagged template"],
      ["css-fake-branded-global.tsx", "intrinsic style authoring requires a css tagged template"],
    ] as const
    for (const [file, message] of cases) {
      try {
        await compiled(file)
        throw new Error(`${file} unexpectedly compiled`)
      } catch (error) {
        expect(error).toBeInstanceOf(JsxCompileError)
        expect((error as Error).message).toContain(message)
      }
    }
  })
})

async function compiled(file: string): Promise<string> {
  return session.transformFile(resolve(fixtureRoot, file))
}

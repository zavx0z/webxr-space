import {describe, expect, test} from "bun:test"

describe("@engine/core Storybook boundary", () => {
  test("keeps owner stories outside the production package contract", async () => {
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json()
    const tsconfig = await Bun.file(new URL("../tsconfig.json", import.meta.url)).json()

    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./default-font",
      "./fonts/jetbrains-mono-bold.ttf",
    ])
    expect(JSON.stringify(manifest)).not.toContain("@zavx0z/storybook")
    expect(tsconfig.include).toEqual(["src/**/*.ts", "test/**/*.ts"])
    expect(JSON.stringify(tsconfig)).not.toContain("storybook")
  })

  test("keeps one independent dynamic import per owner story", async () => {
    const source = await Bun.file(new URL("./catalog.ts", import.meta.url)).text()

    expect(source.match(/\bimport\("\.\//g)).toHaveLength(5)
    expect(source).toContain('import("./foundations/coordinate-space.stories")')
    expect(source).toContain('import("./geometry/instanced-boxes.stories")')
    expect(source).toContain('import("./materials/holographic-torus.stories")')
    expect(source).toContain('import("./materials/thin-film-sphere.stories")')
    expect(source).toContain('import("./text/stencil-clipping.stories")')
    expect(source).not.toMatch(/from "\.\/[^"]+\.stories"/)
  })
})

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
  resolve(fixtureRoot, "static-style.tsx"),
  resolve(fixtureRoot, "style-precedence.tsx"),
  resolve(fixtureRoot, "style-custom-property.tsx"),
  resolve(fixtureRoot, "style-dynamic-pseudo.tsx"),
  resolve(fixtureRoot, "style-object-spread.tsx"),
  resolve(fixtureRoot, "style-array-spread.tsx"),
  resolve(fixtureRoot, "style-computed-key.tsx"),
]))
afterAll(() => session.close())

describe("Template static style compiler", () => {
  test("extracts component-local static styles and pseudos into compiled metadata", async () => {
    const code = await compiled("static-style.tsx")
    expect(code).toContain("styleSheets: [__zComp0StyleSheet(")
    expect(code).toContain('StyleSheet("z:')
    expect(code).toContain("data-z-")
    expect(code).toContain(":hover{")
    expect(code).toContain(":active{")
    expect(code).toContain(":focus{")
    expect(code).toContain(":disabled{")
    expect(code).toContain("String(color(regular.inner))")
    expect(code).toContain("Boolean(props.selected)")
    expect(code).toContain("Boolean(!showLabel)")
    expect(code).toContain('["opacity: " + String(props.opacity), props.style]')
    expect(code.match(/BindStyle\(__zComp0Node/g)).toHaveLength(1)
    expect(code).not.toContain("defineStyles")
    expect(code).not.toContain('":hover": {')

    const styleSheetIds = [...code.matchAll(/StyleSheet\("([^"]+)"/g)].map(match => match[1]!)
    expect(styleSheetIds).toHaveLength(1)
    expect(new Set(styleSheetIds).size).toBe(styleSheetIds.length)
    const markers = [...code.matchAll(/data-z-[A-Za-z0-9_-]{16}/g)].map(match => match[0]!)
    expect(new Set(markers).size).toBe(8)
    expect(code.match(/, \{kind: "authored-css"/g)).toHaveLength(1)
    expect(code).toContain('moduleId: "@fixture/styles/static-style.tsx"')
    expect(code).toContain('componentName: "StyledButton"')
    expect(code).toContain('cssText: "box-sizing:"')
    expect(code).toContain(' + "\\n" + "background:"')
  })

  test("emits deterministic metadata for an unchanged source", async () => {
    const first = await compiled("static-style.tsx")
    const second = await compiled("static-style.tsx")
    expect(second).toBe(first)
  })

  test("preserves owner fragment order and leaves caller precedence in the inline channel", async () => {
    const code = await compiled("style-precedence.tsx")
    const baseRule = code.search(/cssText: "display:" \+ "inline;color:"/)
    const hiddenRule = code.search(/ \+ "\\n" \+ "display:" \+ "none;"/)
    expect(baseRule).toBeGreaterThan(-1)
    expect(hiddenRule).toBeGreaterThan(baseRule)
    expect(code).toMatch(/setAttribute\("data-z-[A-Za-z0-9_-]{16}", ""\)/)
    expect(code).toMatch(/BindProperty\(__zComp0Node0, "data-z-[A-Za-z0-9_-]{16}"\), __zComp0BindStyle\(__zComp0Node0\)/)
    expect(code).toContain("Boolean(props.hidden)")
    expect(code).toContain("__zComp0Write(__zComp0Values, 1, [props.style])")
  })

  test("keeps explicit dynamic custom properties inline for extracted static pseudos", async () => {
    const code = await compiled("style-custom-property.tsx")
    expect(code).toContain("styleSheets: [__zComp0StyleSheet(")
    expect(code).toContain('background:" + "var(--hover-color);color:')
    expect(code).toContain('"var(--hover-text, rgb(255 255 255))}"')
    expect(code).toContain('["--hover-color: " + String(props.hoverColor)]')
    expect(code.match(/BindStyle\(__zComp0Node0\)/g)).toHaveLength(1)
    expect(code).not.toMatch(/--z-[a-z0-9-]+/)
    expect(code).not.toContain('"--hover-color": String')
  })

  test("fails closed for dynamic pseudos, style spreads and computed keys", async () => {
    const cases = [
      ["style-dynamic-pseudo.tsx", "style objects and arrays are unsupported"],
      ["style-object-spread.tsx", "style objects and arrays are unsupported"],
      ["style-array-spread.tsx", "style objects and arrays are unsupported"],
      ["style-computed-key.tsx", "style objects and arrays are unsupported"],
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

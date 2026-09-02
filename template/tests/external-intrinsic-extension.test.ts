import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {resolve} from "node:path"
import {JsxCompilerSession} from "../compiler/index.ts"

test("compiles an externally augmented sibling Element intrinsic", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "template-xr-intrinsic-"))
  const sourcePath = resolve(root, "scene.tsx")
  await Bun.write(resolve(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      exactOptionalPropertyTypes: true,
      jsx: "preserve",
      jsxImportSource: "@zavx0z/template",
      lib: ["ESNext", "DOM"],
      module: "Preserve",
      moduleResolution: "bundler",
      noEmit: true,
      paths: {
        "@zavx0z/dom": [resolve(import.meta.dir, "../../dom/src/index.ts")],
        "@zavx0z/template/jsx-runtime": [resolve(import.meta.dir, "../jsx-runtime.ts")],
      },
      skipLibCheck: false,
      strict: true,
      target: "ESNext",
    },
    files: ["scene.tsx"],
  }))
  await Bun.write(sourcePath, [
    'import type {Element as SemanticElement} from "@zavx0z/dom"',
    'import type {IntrinsicElementProperties} from "@zavx0z/template/jsx-runtime"',
    "",
    "interface XRElement extends SemanticElement {",
    "  exposure: number",
    "}",
    "",
    'declare module "@zavx0z/template/jsx-runtime" {',
    "  namespace JSX {",
    "    interface IntrinsicElements {",
    '      "xr-space": IntrinsicElementProperties<XRElement>',
    "    }",
    "  }",
    "}",
    "",
    "export function Scene() {",
    "  return <xr-space",
    "    exposure={2}",
    "    onClick={event => {",
    "      const target: XRElement = event.currentTarget",
    "      void target",
    "    }}",
    "    ref={element => {",
    "      const target: XRElement | null = element",
    "      void target",
    "    }}",
    "  />",
    "}",
    "",
  ].join("\n"))

  const compiler = new JsxCompilerSession({cwd: root, sourceRoots: [root]})
  try {
    const result = await compiler.compileFile(sourcePath)
    expect(result.code).toContain('document.createElement("xr-space")')
    expect(result.code).toContain('from "@zavx0z/component"')
    expect(result.capabilityUsages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-element",
      profile: "template-extension",
      tagName: "xr-space",
    }))
  } finally {
    await compiler.close()
    await rm(root, {force: true, recursive: true})
  }
}, 30_000)

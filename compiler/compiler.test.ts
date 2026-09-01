import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {link, mkdir, mkdtemp, rename, rm, symlink, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {resolve} from "node:path"
import {createTemplateJsxBunPlugin} from "./bun.ts"
import {JsxCompileError} from "./errors.ts"
import {JsxCompilerSession} from "./session.ts"
import {jsxAuthoringProfile} from "./transform.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const application = resolve(fixtureRoot, "application.tsx")
const session = new JsxCompilerSession({cwd: fixtureRoot, sourceRoots: [fixtureRoot]})

beforeAll(() => session.prepareFiles([
  application,
  resolve(fixtureRoot, "capture-html-for.tsx")
]))
afterAll(() => session.close())

describe("Template JSX compiler", () => {
  test("lowers JSX into the shared Template ABI without a React runtime", async () => {
    const code = await session.transformFile(application)
    expect(code).not.toContain("<button")
    expect(code).not.toContain('from "react"')
    expect(code).toContain('from "@zavx0z/template/compiled"')
    expect(code).toContain('from "@zavx0z/react"')
    expect(code).toContain("defineCompiledTemplate")
    expect(jsxAuthoringProfile.styles).toMatchObject({
      baseDeclarations: "direct-only",
      privateCssConstants: "reuse-only",
      redundantBaseSelector: false,
    })
  })

  test("reuses one TypeScript project snapshot for unchanged source", async () => {
    await session.transformFile(application)
    const before = session.stats
    await session.transformFile(application)
    const after = session.stats
    expect(after.cacheHits).toBe(before.cacheHits + 1)
    expect(after.snapshots).toBe(before.snapshots)
  })

  test("rejects React imports instead of installing or aliasing React", async () => {
    for (const file of [
      "react-import.tsx",
      "react-dom-client.tsx",
      "react-dom-server.tsx",
      "react-reconciler.tsx",
      "react-export.tsx",
      "react-dynamic.tsx"
    ]) {
      await expectRejected(file, "React runtime references are forbidden")
    }
  })

  test("rejects class-based styling at the JSX compiler boundary", async () => {
    await expectRejected("class-name.tsx", "class-based component styling")
  })

  test("rejects every leftover JSX form instead of emitting a runtime fallback", async () => {
    for (const file of [
      "unsupported-arrow.tsx",
      "unrelated-render.tsx",
      "prelude-jsx.tsx",
      "shadow-root.tsx",
      "async-component.tsx",
      "default-component.tsx",
      "early-return.tsx",
      "generic-component.tsx"
    ]) {
      const error = await rejected(file)
      expect(error).toBeInstanceOf(JsxCompileError)
      expect(error.message).toMatch(
        /unknown component|JSX is outside|async components|default export|nested or early return|generic components/,
      )
    }
  })

  test("binds capture listeners and dynamic htmlFor with exact DOM semantics", async () => {
    const code = await session.transformFile(resolve(fixtureRoot, "capture-html-for.tsx"))
    expect(code).toContain('bindEvent')
    expect(code).toContain('{capture: true}')
    expect(code).toContain('"for"')
    expect(code).not.toContain('"htmlFor"')
  })

  test("enforces the bounded Rules of Hooks profile by exact import symbol", async () => {
    for (const file of ["conditional-hook.tsx", "loop-hook.tsx"]) {
      const error = await rejected(file)
      expect(error).toBeInstanceOf(JsxCompileError)
      expect(error.message).toMatch(/top level|custom or shadowed hook/)
    }
    const code = await compiled("hook-alias.tsx")
    expect(code).not.toContain("<div")
    expect(code).toContain("state(1)")
    const custom = await compiled("custom-hook.tsx")
    expect(custom).toContain("useCounter()")
    expect(custom).not.toContain("<Valid")
  })

  test("rejects namespace and type-only runtime/component imports", async () => {
    await expectRejected("namespace-runtime.tsx", "namespace imports")
    await expectRejected("type-runtime.tsx", "runtime value")
    await expectRejected("type-only-component.tsx", "Type-only import")
  })

  test("rejects unkeyed array children but allows unrelated uppercase values", async () => {
    await expectRejected("unkeyed-array.tsx", "array children require")
    const code = await compiled("uppercase-value.tsx")
    expect(code).toContain("UserModel.name")
    expect(code).not.toContain("<span")
  })

  test("lowers typed component children into direct retained bindings", async () => {
    const code = await compiled("component-children.tsx")
    expect(jsxAuthoringProfile.componentChildren).toMatchObject({
      keyedComponents: true,
      nullableComponent: true,
      primitiveText: true,
      receiver: "props.children",
      singleComponent: true
    })
    expect(code).toContain("bindChild as")
    expect(code).toContain("bindConditional as")
    expect(code).toContain("bindKeyed as")
    expect(code).toContain('"children": __zComp0Component(Child')
    expect(code).toContain('"children": __zComp0Keyed(props.items.map')
    expect(code).toContain("(props.children ?? null)")
    expect(code).not.toContain("<Pane")
    expect(code).not.toContain("jsx(")
  })

  test("fails unsupported component children at the compiler boundary", async () => {
    const cases = [
      ["component-children-fragment.tsx", "do not support JSX fragments"],
      ["component-children-intrinsic.tsx", "intrinsic elements cannot cross"],
      ["component-children-unkeyed.tsx", "non-null key on every component"],
      ["component-children-array.tsx", "compiler-owned keyed JSX map"],
      ["component-children-destructured.tsx", "direct props.children"],
      ["component-children-attribute.tsx", "authored between component tags"],
    ] as const
    for (const [file, message] of cases) await expectRejected(file, message)
  })

  test("uses exact symbols for aliased imports and ignores same-spelling shadows", async () => {
    const code = await compiled("shadow-symbols.tsx")
    expect(code).toContain("state(1)")
    expect(code).toContain("root.render(App, {})")
    expect(code).toContain('root.render("not JSX")')
  })

  test("lowers an exact createRoot binding inside an ordinary local factory", async () => {
    const code = await compiled("local-root-factory.tsx")
    expect(code).toContain("root.render(Button, {\"label\": \"Factory\"})")
    expect(code).not.toContain("<Button")
  })

  test("rejects reassignment of a compiled component binding", async () => {
    await expectRejected("reassigned-component.tsx", "cannot be reassigned")
  })

  test("injects helpers for imported-only roots and accepts governed memo wrappers", async () => {
    for (const file of ["imported-entry.tsx", "imported-memo-entry.tsx"]) {
      const code = await compiled(file)
      expect(code).toContain('from "@zavx0z/template/compiled"')
      expect(code).toContain('from "@zavx0z/react"')
      expect(code).not.toMatch(/<(?:ImportedCounter|MemoCounter)\b/)
    }
  })

  test("accepts workspace package imports only when declarations stay in governed roots", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-jsx-workspace-"))
    const applicationRoot = resolve(temporaryRoot, "app")
    const componentRoot = resolve(temporaryRoot, "components")
    const governedPackage = resolve(componentRoot, "button-package")
    const outsidePackage = resolve(temporaryRoot, "outside-package")
    const packageLinks = resolve(temporaryRoot, "node_modules/@fixture")
    await Promise.all([
      mkdir(applicationRoot, {recursive: true}),
      mkdir(governedPackage, {recursive: true}),
      mkdir(outsidePackage, {recursive: true}),
      mkdir(packageLinks, {recursive: true}),
    ])
    await Promise.all([
      writePackage(governedPackage, "@fixture/button", "Button"),
      writePackage(outsidePackage, "@fixture/outside", "OutsideButton"),
    ])
    await Promise.all([
      symlink(governedPackage, resolve(packageLinks, "button")),
      symlink(outsidePackage, resolve(packageLinks, "outside")),
    ])
    const positive = resolve(applicationRoot, "positive.tsx")
    const negative = resolve(applicationRoot, "negative.tsx")
    await writeFile(positive, workspaceEntry("@fixture/button", "Button"))
    await writeFile(negative, workspaceEntry("@fixture/outside", "OutsideButton"))
    const workspace = new JsxCompilerSession({
      cwd: temporaryRoot,
      sourceRoots: [applicationRoot, componentRoot],
    })
    try {
      expect(await workspace.transformFile(positive)).toContain("root.render(Button, {})")
      await expect(workspace.transformFile(negative))
        .rejects.toThrow("does not resolve to a governed function component")
    } finally {
      await workspace.close()
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 60_000)

  test("exposes a thin Bun onLoad adapter while compiler code stays external", async () => {
    const result = await Bun.build({
      entrypoints: [application],
      external: ["@zavx0z/react", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({sourceRoots: [fixtureRoot]})],
      target: "browser"
    })
    expect(result.success).toBe(true)
    expect(await result.outputs[0]!.text()).not.toContain("<button")
  })

  test("transforms nested node_modules JSX only through an explicit physical source root", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-jsx-node-modules-"))
    const projectRoot = resolve(temporaryRoot, "project")
    const physicalRoot = resolve(projectRoot, "node_modules/dependency")
    const sourcePath = resolve(physicalRoot, "src/component.jsx")
    await mkdir(resolve(physicalRoot, "src"), {recursive: true})
    await writeFile(sourcePath, [
      "export function NestedDependency() {",
      "  return <span>Nested dependency</span>",
      "}",
      "",
    ].join("\n"))
    const build = (sourceRoots: readonly string[]) => Bun.build({
      entrypoints: [sourcePath],
      external: [
        "@zavx0z/react",
        "@zavx0z/template/compiled",
        "@zavx0z/template/jsx-runtime",
        "react/jsx-dev-runtime",
        "react/jsx-runtime",
      ],
      plugins: [createTemplateJsxBunPlugin({cwd: projectRoot, sourceRoots})],
      target: "browser",
    })

    try {
      const broad = await build([projectRoot])
      expect(broad.success).toBe(true)
      const broadCode = await broad.outputs[0]!.text()
      expect(broadCode).not.toContain("@zavx0z/template/compiled")
      expect(broadCode).not.toContain("defineCompiledTemplate")

      const explicit = await build([projectRoot, physicalRoot])
      expect(explicit.success).toBe(true)
      const explicitCode = await explicit.outputs[0]!.text()
      expect(explicitCode).toContain("@zavx0z/template/compiled")
      expect(explicitCode).not.toContain("<span")
    } finally {
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 30_000)

  test("supports direct Bun.plugin TSX loading without intercepting plain TypeScript", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-jsx-runtime-"))
    const sourcePath = resolve(temporaryRoot, "badge.tsx")
    await writeFile(sourcePath, [
      "export function Badge() {",
      "  return <span>Runtime plugin</span>",
      "}",
      "",
    ].join("\n"))
    try {
      const child = Bun.spawn([
        process.execPath,
        resolve(import.meta.dir, "runtime-plugin-proof.ts"),
        resolve(import.meta.dir, "bun.ts"),
        sourcePath,
      ], {stderr: "pipe", stdout: "pipe"})
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(exitCode, stderr).toBe(0)
      expect(JSON.parse(stdout)).toEqual({displayName: "Badge", ok: true})
    } finally {
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 30_000)

  test("supports exact file roots and multiple governed roots", async () => {
    const roots = [application, resolve(fixtureRoot, "capture-html-for.tsx")]
    const result = await Bun.build({
      entrypoints: roots,
      external: ["@zavx0z/react", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({sourceRoots: roots})],
      target: "browser"
    })
    expect(result.success).toBe(true)
    expect(result.outputs).toHaveLength(2)
  })

  test("maps canonical and physical mirror roots to one public style source id", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-style-mirrors-"))
    const canonicalRoot = resolve(temporaryRoot, "canonical")
    const mirrorRoot = resolve(temporaryRoot, "mirror")
    await mkdir(canonicalRoot, {recursive: true})
    await mkdir(mirrorRoot, {recursive: true})
    await writeFile(resolve(temporaryRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        jsx: "preserve",
        jsxImportSource: "@zavx0z/template",
        module: "Preserve",
        moduleResolution: "bundler",
        noEmit: true,
        paths: {
          "@zavx0z/template/jsx-runtime": [resolve(import.meta.dir, "../jsx-runtime.ts")]
        },
        skipLibCheck: true,
        target: "ESNext"
      },
      include: ["canonical/**/*.tsx", "mirror/**/*.tsx"]
    }))
    const source = [
      "export function Owner() {",
      "  return <button style={css`display: block;`}>Owner</button>",
      "}",
      "",
    ].join("\n")
    const canonical = resolve(canonicalRoot, "owner.tsx")
    const mirror = resolve(mirrorRoot, "owner.tsx")
    await Promise.all([writeFile(canonical, source), writeFile(mirror, source)])
    const mirrored = new JsxCompilerSession({
      cwd: temporaryRoot,
      sourceRoots: [canonicalRoot, mirrorRoot],
      styleSourceRootIds: ["@ui/components", "@ui/components"],
    })
    try {
      const [canonicalCode, mirrorCode] = await Promise.all([
        mirrored.transformFile(canonical),
        mirrored.transformFile(mirror),
      ])
      for (const code of [canonicalCode, mirrorCode]) {
        expect(code).toContain('moduleId: "@ui/components/owner.tsx"')
        expect(code).toContain('componentName: "Owner"')
      }
    } finally {
      await mirrored.close()
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 30_000)

  test("resolves relative file roots against an explicit compiler cwd", async () => {
    const result = await Bun.build({
      entrypoints: [application],
      external: ["@zavx0z/react", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({
        cwd: fixtureRoot,
        sourceRoots: ["application.tsx"],
      })],
      target: "browser"
    })
    expect(result.success).toBe(true)
  })

  test("allows caller source maps without claiming exact authored TSX mappings", async () => {
    const result = await Bun.build({
      entrypoints: [application],
      external: ["@zavx0z/react", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({sourceRoots: [application]})],
      sourcemap: "external",
      target: "browser"
    })
    expect(result.success).toBe(true)
    expect(jsxAuthoringProfile.sourceMaps).toBe(false)
  })

  test("invalidates a cached importer when a governed dependency changes", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-jsx-cache-"))
    const dependency = resolve(temporaryRoot, "dependency.tsx")
    const entry = resolve(temporaryRoot, "entry.tsx")
    await writeFile(dependency, [
      "export function Imported() {",
      "  return <span>first</span>",
      "}",
      "",
    ].join("\n"))
    await writeFile(entry, [
      'import {createRoot} from "@zavx0z/react"',
      'import {Imported} from "./dependency.tsx"',
      "declare const container: Parameters<typeof createRoot>[0]",
      "createRoot(container).render(<Imported />)",
      "",
    ].join("\n"))
    const changing = new JsxCompilerSession({cwd: temporaryRoot, sourceRoots: [temporaryRoot]})
    try {
      const first = await changing.transformFile(entry)
      expect(first).not.toContain("<Imported")
      const before = changing.stats
      await writeFile(dependency, [
        "export const Imported = () => <span>second</span>",
        "",
      ].join("\n"))
      await expect(changing.transformFile(entry)).rejects.toThrow("governed function component")
      expect(changing.stats.snapshots).toBeGreaterThan(before.snapshots)
    } finally {
      await changing.close()
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 60_000)

  test("invalidates a cached importer when hardlink ownership changes without byte changes", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-jsx-owner-cache-"))
    const applicationRoot = resolve(temporaryRoot, "application")
    const canonicalRoot = resolve(temporaryRoot, "canonical")
    const physicalRoot = resolve(temporaryRoot, "physical")
    await Promise.all([
      mkdir(applicationRoot, {recursive: true}),
      mkdir(canonicalRoot, {recursive: true}),
      mkdir(physicalRoot, {recursive: true}),
    ])
    const source = [
      "export function Imported() {",
      "  return <span>Owner</span>",
      "}",
      "",
    ].join("\n")
    const canonical = resolve(canonicalRoot, "component.tsx")
    const physical = resolve(physicalRoot, "component.tsx")
    const entry = resolve(applicationRoot, "entry.tsx")
    await writeFile(physical, source)
    await link(physical, canonical)
    await writeFile(entry, [
      'import {createRoot} from "@zavx0z/react"',
      'import {Imported} from "../physical/component.tsx"',
      "declare const container: Parameters<typeof createRoot>[0]",
      "createRoot(container).render(<Imported />)",
      "",
    ].join("\n"))
    const changing = new JsxCompilerSession({
      cwd: temporaryRoot,
      sourceRoots: [applicationRoot, canonicalRoot],
    })
    try {
      expect(await changing.transformFile(entry)).toContain(
        "createRoot(container).render(Imported, {})",
      )
      const replacement = resolve(canonicalRoot, "replacement.tsx")
      await writeFile(replacement, source)
      await rename(replacement, canonical)
      await changing.refreshFiles([entry, canonical])
      await expect(changing.transformFile(entry))
        .rejects.toThrow("governed function component")
    } finally {
      await changing.close()
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 60_000)

  test("fails a component import that escapes the governed source roots", async () => {
    const governed = resolve(fixtureRoot, "governed")
    const isolated = new JsxCompilerSession({cwd: governed, sourceRoots: [governed]})
    try {
      await expect(isolated.transformFile(resolve(governed, "escape.tsx")))
        .rejects.toThrow("governed function component")
    } finally {
      await isolated.close()
    }
  }, 60_000)
})

async function expectRejected(file: string, message: string): Promise<void> {
  expect((await rejected(file)).message).toContain(message)
}

async function rejected(file: string): Promise<Error> {
  const sourcePath = resolve(fixtureRoot, file)
  const isolated = new JsxCompilerSession({cwd: fixtureRoot, sourceRoots: [fixtureRoot]})
  try {
    await isolated.transformFile(sourcePath)
    throw new Error(`${file} unexpectedly compiled`)
  } catch (error) {
    return error as Error
  } finally {
    await isolated.close()
  }
}

async function compiled(file: string): Promise<string> {
  const sourcePath = resolve(fixtureRoot, file)
  const isolated = new JsxCompilerSession({cwd: fixtureRoot, sourceRoots: [fixtureRoot]})
  try {
    return await isolated.transformFile(sourcePath)
  } finally {
    await isolated.close()
  }
}

async function writePackage(path: string, name: string, component: string): Promise<void> {
  await Promise.all([
    writeFile(resolve(path, "package.json"), JSON.stringify({
      exports: "./component.tsx",
      name,
      type: "module",
    })),
    writeFile(resolve(path, "component.tsx"), [
      `export function ${component}() {`,
      `  return <button>${component}</button>`,
      "}",
      "",
    ].join("\n")),
  ])
}

function workspaceEntry(packageName: string, component: string): string {
  return [
    'import {createRoot} from "@zavx0z/react"',
    `import {${component}} from ${JSON.stringify(packageName)}`,
    "declare const container: Parameters<typeof createRoot>[0]",
    "const root = createRoot(container)",
    `root.render(<${component} />)`,
    "",
  ].join("\n")
}

import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {resolve} from "node:path"
import {JsxCompilerSession} from "./session.ts"
import {
  CAPABILITY_USAGE_GENERATOR_VERSION,
  CAPABILITY_USAGE_SCHEMA_VERSION,
  createCapabilityUsageManifest,
  serializeCapabilityUsageManifest,
} from "./capability-manifest.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const sourcePath = resolve(fixtureRoot, "capability-usage.tsx")
const session = new JsxCompilerSession({cwd: fixtureRoot, sourceRoots: [fixtureRoot]})

beforeAll(() => session.prepareFiles([sourcePath]))
afterAll(() => session.close())

describe("Template neutral capability usage", () => {
  test("collects intrinsic, CSS and checker-resolved DOM member usages", async () => {
    const source = await readFile(sourcePath, "utf8")
    const result = await session.compileFile(sourcePath)
    const usages = result.capabilityUsages

    expect(result.code).toMatch(/BindProperty\([^\n]+"indeterminate"\)/)
    expect(result.code).toMatch(/BindProperty\([^\n]+"tabIndex"\)/)
    expect(result.code).not.toContain('setAttribute("indeterminate"')
    expect(result.code).not.toContain('setAttribute("tabIndex"')

    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-element",
      profile: "html",
      tagName: "input",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "checked",
      operation: "binding",
      tagName: "input",
      transport: "property",
      value: {kind: "dynamic"},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "indeterminate",
      operation: "binding",
      tagName: "input",
      transport: "property",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "tabIndex",
      operation: "binding",
      tagName: "input",
      transport: "property",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "data-state",
      operation: "mount",
      tagName: "input",
      transport: "content-attribute",
      value: {kind: "static", value: "ready"},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "aria-label",
      operation: "binding",
      tagName: "input",
      transport: "content-attribute",
      value: {kind: "dynamic"},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      capture: false,
      eventType: "change",
      kind: "event",
      propName: "onChange",
      tagName: "input",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      capture: true,
      eventType: "click",
      kind: "event",
      propName: "onClickCapture",
      tagName: "input",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "ref",
      mode: "callback",
      tagName: "input",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "css-property",
      name: "color",
      value: {kind: "static", value: "red"},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "css-property",
      name: "opacity",
      value: {kind: "static", value: "0.8"},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "css-attribute-selector",
      name: "data-state",
      value: "ready",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "css-attribute-selector",
      name: "aria-label",
      value: null,
    }))
    expect(usages).toContainEqual(expect.objectContaining({kind: "css-pseudo", name: ":hover"}))
    expect(usages).toContainEqual(expect.objectContaining({
      interfaceName: "Event",
      kind: "dom-member",
      memberName: "preventDefault",
      operation: "call",
      standardLibrary: "lib.dom",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      interfaceName: "HTMLInputElement",
      kind: "dom-member",
      memberName: "value",
      operation: "write",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      interfaceName: "HTMLInputElement",
      kind: "dom-member",
      memberName: "showPicker",
      operation: "call",
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-element",
      profile: "template-extension",
      tagName: "vector-path",
    }))
    expect(usages.flatMap(usage =>
      usage.kind === "intrinsic-attribute" && usage.name === "type"
        ? [usage.value]
        : []
    )).toEqual([
      {kind: "static", value: "checkbox"},
      {kind: "static", value: "number"},
      {kind: "static", value: "range"},
    ])
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "value",
      operation: "binding",
      transport: "property",
      value: {kind: "static", value: 4},
    }))
    expect(usages).toContainEqual(expect.objectContaining({
      kind: "intrinsic-attribute",
      name: "required",
      operation: "binding",
      transport: "content-attribute",
      value: {kind: "static", value: true},
    }))

    for (const usage of usages) {
      expect(usage.source.path).toBe(sourcePath)
      expect(usage.source.start.line).toBeGreaterThan(0)
      expect(usage.source.start.column).toBeGreaterThan(0)
      expect(source.slice(usage.source.start.offset, usage.source.end.offset).length).toBeGreaterThan(0)
    }
  })

  test("caches transformed code and the immutable usage projection together", async () => {
    const first = await session.compileFile(sourcePath)
    const before = session.stats
    const second = await session.compileFile(sourcePath)
    const after = session.stats

    expect(second).toBe(first)
    expect(second.capabilityUsages).toBe(first.capabilityUsages)
    expect(second.code).toBe(first.code)
    expect(after.cacheHits).toBe(before.cacheHits + 1)
    expect(Object.isFrozen(second)).toBe(true)
    expect(Object.isFrozen(second.capabilityUsages)).toBe(true)
  })

  test("projects usages into a deterministic neutral interchange manifest", async () => {
    const result = await session.compileFile(sourcePath)
    const first = createCapabilityUsageManifest(result.capabilityUsages)
    const second = createCapabilityUsageManifest([...result.capabilityUsages].reverse())

    expect(first).toEqual(second)
    expect(first.schemaVersion).toBe(CAPABILITY_USAGE_SCHEMA_VERSION)
    expect(first.generatorVersion).toBe(CAPABILITY_USAGE_GENERATOR_VERSION)
    expect(first.files).toHaveLength(1)
    expect(first.files[0]!.path).toBe(sourcePath)
    expect(serializeCapabilityUsageManifest(first)).toBe(
      serializeCapabilityUsageManifest(second),
    )
    expect(serializeCapabilityUsageManifest(first).endsWith("\n")).toBe(true)
  })

  test("invalidates usages through a transitive governed type-only dependency", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "template-semantic-dependency-"))
    const sourcePath = resolve(root, "source.tsx")
    const helperPath = resolve(root, "helper.ts")
    const basePath = resolve(root, "base.ts")
    await mkdir(root, {recursive: true})
    await Promise.all([
      writeFile(resolve(root, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
          allowImportingTsExtensions: true,
          jsx: "preserve",
          jsxImportSource: "@zavx0z/template",
          lib: ["ESNext", "DOM"],
          module: "Preserve",
          moduleResolution: "bundler",
          noEmit: true,
          paths: {
            "@zavx0z/template/jsx-runtime": [resolve(import.meta.dir, "../jsx-runtime.ts")],
          },
          strict: true,
          target: "ESNext",
        },
        include: ["*.ts", "*.tsx"],
      })),
      writeFile(sourcePath, [
        'import type {InputTarget} from "./helper.ts"',
        "",
        "export function SemanticDependencyProbe(props: Readonly<{target: InputTarget}>) {",
        "  props.target.showPicker()",
        "  return <input />",
        "}",
        "",
      ].join("\n")),
      writeFile(helperPath, 'export type {InputTarget} from "./base.ts"\n'),
      writeFile(basePath, "export type InputTarget = HTMLInputElement\n"),
    ])
    const changing = new JsxCompilerSession({cwd: root, sourceRoots: [root]})
    try {
      await changing.prepareFiles([sourcePath, helperPath, basePath])
      const first = await changing.compileFile(sourcePath)
      expect(first.capabilityUsages).toContainEqual(expect.objectContaining({
        interfaceName: "HTMLInputElement",
        kind: "dom-member",
        memberName: "showPicker",
        operation: "call",
      }))
      const before = changing.stats

      await writeFile(basePath, [
        "export interface InputTarget {",
        "  showPicker(): void",
        "}",
        "",
      ].join("\n"))
      const second = await changing.compileFile(sourcePath)

      expect(second).not.toBe(first)
      expect(second.code).toBe(first.code)
      expect(second.capabilityUsages).not.toContainEqual(expect.objectContaining({
        kind: "dom-member",
        memberName: "showPicker",
      }))
      expect(changing.stats.cacheMisses).toBe(before.cacheMisses + 1)
      expect(changing.stats.snapshots).toBeGreaterThan(before.snapshots)
    } finally {
      await changing.close()
      await rm(root, {force: true, recursive: true})
    }
  }, 30_000)
})

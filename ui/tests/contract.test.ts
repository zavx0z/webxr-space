import {expect, test} from "bun:test"
import {resolve} from "node:path"

const packageRoot = resolve(import.meta.dir, "..")

const expectedExports = Object.freeze([
  "./badge",
  "./divider",
  "./typography",
  "./buttons/button",
  "./buttons/toggle-button-group",
  "./fields/checkbox-field",
  "./fields/collection-field",
  "./fields/color-field",
  "./fields/color-picker-field",
  "./fields/cycle-field",
  "./fields/field-group",
  "./fields/matrix-field",
  "./fields/number-field",
  "./fields/path-field",
  "./fields/reference-field",
  "./fields/select-field",
  "./fields/slider-field",
  "./fields/switch-field",
  "./fields/text-field",
  "./fields/vector-field",
  "./surfaces/pane",
  "./surfaces/panel",
  "./surfaces/window",
  "./surfaces/frame",
  "./views/list",
  "./views/table",
  "./views/code-editor",
  "./views/timeline",
  "./feedback/notification",
  "./feedback/status-bar",
  "./widgets/inspector",
  "./themes/icons",
  "./themes/syntax-theme",
  "./themes/theme.css",
] as const)

test("[UI-001] публичные UI-компоненты распределены по принятой taxonomy", async () => {
  const packageJson = await readPackageJson()
  expect(Object.keys(packageJson.exports)).toEqual([...expectedExports])
  expect(Object.keys(packageJson.exports).some(key => key.startsWith("./menus/"))).toBe(false)

  for (const [subpath, target] of Object.entries(packageJson.exports)) {
    expect(await Bun.file(resolve(packageRoot, target)).exists()).toBe(true)
    if (subpath.startsWith("./buttons/")) expect(target).toStartWith("./buttons/")
    if (subpath.startsWith("./fields/")) expect(target).toStartWith("./fields/")
    if (subpath.startsWith("./surfaces/")) expect(target).toStartWith("./surfaces/")
    if (subpath.startsWith("./views/")) expect(target).toStartWith("./views/")
    if (subpath.startsWith("./feedback/")) expect(target).toStartWith("./feedback/")
    if (subpath.startsWith("./widgets/")) expect(target).toStartWith("./widgets/")
    if (subpath.startsWith("./themes/")) expect(target).toStartWith("./themes/")
  }
})

test("[UI-002] UI остаётся target-neutral production package", async () => {
  const packageJson = await readPackageJson()
  const forbiddenPackages = [
    "@zavx0z/browser",
    "@zavx0z/engine",
    "@zavx0z/layout",
    "@zavx0z/nodes",
    "@zavx0z/nodetree",
    "@zavx0z/renderer",
    "@zavx0z/space",
    "@zavx0z/webgpu",
  ]
  for (const packageName of forbiddenPackages) {
    expect(packageJson.dependencies?.[packageName]).toBeUndefined()
  }

  const specifiers = importSpecifiers(await productionSource())
  for (const specifier of specifiers) {
    expect(forbiddenPackages.some(packageName =>
      specifier === packageName || specifier.startsWith(`${packageName}/`),
    )).toBe(false)
  }
})

test("[UI-003] FieldGroup принадлежит fields, а ToggleButtonGroup — buttons", async () => {
  const packageJson = await readPackageJson()
  expect(packageJson.exports["./fields/field-group"]).toBe("./fields/field-group.tsx")
  expect(packageJson.exports["./buttons/toggle-button-group"]).toBe("./buttons/toggle-button-group.tsx")
  expect(packageJson.exports["./fields/toggle-button-group"]).toBeUndefined()
  expect(packageJson.exports["./fields/option-group-field"]).toBeUndefined()

  const fieldGroup = await Bun.file(resolve(packageRoot, "fields/field-group.tsx")).text()
  const toggleButtonGroup = await Bun.file(resolve(packageRoot, "buttons/toggle-button-group.tsx")).text()
  expect(fieldGroup).toContain("export function FieldGroup(")
  expect(toggleButtonGroup).toContain("export function ToggleButtonGroup(")
  expect(toggleButtonGroup).not.toContain("OptionGroupField")
})

test("[UI-004] widgets содержит только самостоятельный Inspector owner", async () => {
  const packageJson = await readPackageJson()
  expect(Object.keys(packageJson.exports).filter(key => key.startsWith("./widgets/"))).toEqual([
    "./widgets/inspector",
  ])
  const source = await Bun.file(resolve(packageRoot, "widgets/inspector.tsx")).text()
  expect(source).toContain("export function Inspector(")
  expect(source).not.toMatch(/^export\s+\{[^}]+\}\s+from/mu)
  expect(source).not.toMatch(/^export\s+\*\s+from/mu)
})

async function readPackageJson(): Promise<Readonly<{
  dependencies?: Readonly<Record<string, string>>
  exports: Readonly<Record<string, string>>
}>> {
  return Bun.file(resolve(packageRoot, "package.json")).json()
}

async function productionSource(): Promise<string> {
  const sources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.{ts,tsx}").scan({cwd: packageRoot})) {
    if (relativePath.startsWith(".storybook/") || relativePath.startsWith("tests/")) continue
    sources.push(await Bun.file(resolve(packageRoot, relativePath)).text())
  }
  return sources.join("\n")
}

function importSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map(match => match[1]!)
}

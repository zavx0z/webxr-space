import {describe, expect, test} from "bun:test"
import {readdir} from "node:fs/promises"

const componentsRoot = import.meta.dir
const publicFieldTargets = [
  "./fields/checkbox-field.tsx",
  "./fields/collection-field.tsx",
  "./fields/color-field.tsx",
  "./fields/color-picker-field.tsx",
  "./fields/cycle-field.tsx",
  "./fields/field-group.tsx",
  "./fields/matrix-field.tsx",
  "./fields/number-field.tsx",
  "./fields/option-group-field.tsx",
  "./fields/path-field.tsx",
  "./fields/reference-field.tsx",
  "./fields/select-field.tsx",
  "./fields/slider-field.tsx",
  "./fields/switch-field.tsx",
  "./fields/text-field.tsx",
  "./fields/vector-field.tsx"
] as const

function sourceImportDeclarations(source: string): string[] {
  const declarations: string[] = []
  let current: string[] = []
  for (const line of source.split("\n")) {
    if (current.length === 0) {
      if (!line.startsWith("import ")) continue
      current = [line]
    } else {
      current.push(line)
    }
    const declaration = current.join("\n")
    if (/\bfrom\s+["'][^"']+["']\s*$/u.test(declaration) || /^import\s+["'][^"']+["']\s*$/u.test(declaration)) {
      declarations.push(declaration)
      current = []
    }
  }
  return declarations
}

function isVendorDomTypeImport(declaration: string): boolean {
  if (!/\bfrom\s+["']@zavx0z\/dom(?:\/[^"']*)?["']\s*$/u.test(declaration)) return false
  return /^import\s+type\b/u.test(declaration) || /^import\s*\{[^}]*\btype\s+/su.test(declaration)
}

describe("component source layout", () => {
  test("uses standard global DOM interfaces in production TSX and authored fixtures", async () => {
    const productionConfig = await Bun.file(`${componentsRoot}/tsconfig.production.json`).json() as {
      include: string[]
    }
    const rootFilenames = await readdir(componentsRoot)
    const fieldFilenames = await readdir(`${componentsRoot}/fields`)
    const authoredSources = [
      ...productionConfig.include.filter(filename => filename.endsWith(".tsx")),
      ...rootFilenames.filter(filename => filename.endsWith(".fixture.tsx")),
      ...fieldFilenames.filter(filename => filename.endsWith(".fixture.tsx"))
        .map(filename => `fields/${filename}`)
    ]

    for (const filename of authoredSources) {
      const source = await Bun.file(`${componentsRoot}/${filename}`).text()
      const vendorTypeImports = sourceImportDeclarations(source).filter(isVendorDomTypeImport)
      expect(vendorTypeImports, `${filename} must use standard global DOM interface types`).toEqual([])
    }
  })

  test("keeps component owners, specifications and TSX fixtures on one stem", async () => {
    const rootFilenames = await readdir(componentsRoot)
    const nestedFilenames = await Promise.all(["fields"].map(async directory =>
      (await readdir(`${componentsRoot}/${directory}`)).map(filename => `${directory}/${filename}`)
    ))
    const filenames = [...rootFilenames, ...nestedFilenames.flat()].sort()
    const filenameSet = new Set(filenames)
    const productionStems = new Set(filenames.flatMap(filename => {
      const match = filename.match(/^(.+)\.(?:tsx|ts|css)$/u)
      if (match === null || filename.includes(".fixture.")) return []
      return [match[1]!]
    }))

    expect(filenames.filter(filename =>
      /-(?:consumer|dedup|children-consumer|bundle)-fixture\.(?:ts|tsx)$/u.test(filename)
      || filename.endsWith("-test-support.ts")
    )).toEqual([])

    for (const filename of filenames.filter(filename => filename.endsWith(".spec.ts"))) {
      const stem = filename.slice(0, -".spec.ts".length)
      expect(productionStems.has(stem), `${filename} must specify ${stem}.tsx, ${stem}.ts or ${stem}.css`)
        .toBe(true)
    }

    for (const filename of filenames.filter(filename => filename.endsWith(".fixture.tsx"))) {
      const stem = filename.slice(0, -".fixture.tsx".length)
      expect(filenameSet.has(`${stem}.tsx`), `${filename} must exercise ${stem}.tsx`)
        .toBe(true)
    }

    for (const filename of filenames.filter(filename => filename.endsWith(".test.ts"))) {
      const stem = filename.slice(0, -".test.ts".length)
      expect(filenameSet.has(`${stem}.tsx`), `${filename} must remain cross-owner or package-level`)
        .toBe(false)
    }

    const manifest = await Bun.file(`${componentsRoot}/package.json`).json() as {
      exports: Record<string, string>
    }
    const productionConfig = await Bun.file(`${componentsRoot}/tsconfig.production.json`).json() as {
      include: string[]
    }
    expect(Object.keys(manifest.exports).some(subpath => subpath.startsWith("./controls/"))).toBe(false)
    expect(Object.keys(manifest.exports).some(subpath => subpath.startsWith("./src/"))).toBe(false)
    expect(Object.values(manifest.exports).some(target => target.includes(".fixture.") || target.includes(".spec.")))
      .toBe(false)
    expect(Object.values(manifest.exports).filter(target => target.startsWith("./fields/")).sort())
      .toEqual([...publicFieldTargets].sort())
    const productionIncludes = new Set(productionConfig.include)
    const publicTsxTargets = Object.values(manifest.exports)
      .filter(target => target.endsWith(".tsx"))
      .map(target => target.slice(2))
    expect(publicTsxTargets).toHaveLength(29)
    for (const target of publicTsxTargets) {
      expect(productionIncludes.has(target), `${target} must participate in the production typecheck`)
        .toBe(true)
    }

    const governedComponents = Object.values(manifest.exports)
      .filter(target => /^\.\/(?:fields\/)?[^/]+\.tsx$/u.test(target))
      .map(target => target.slice(2, -".tsx".length))
    for (const stem of governedComponents) {
      expect(filenameSet.has(`${stem}.spec.ts`), `${stem}.tsx must have an adjacent focused specification`)
        .toBe(true)
      expect(filenameSet.has(`${stem}.fixture.tsx`), `${stem}.tsx must have an adjacent authored compiler fixture`)
        .toBe(true)

      const basename = stem.slice(stem.lastIndexOf("/") + 1)
      const ownerSource = await Bun.file(`${componentsRoot}/${stem}.tsx`).text()
      const specificationSource = await Bun.file(`${componentsRoot}/${stem}.spec.ts`).text()
      const fixtureSource = await Bun.file(`${componentsRoot}/${stem}.fixture.tsx`).text()
      expect(ownerSource, `${stem}.tsx must implement its public component owner`)
        .toMatch(/export function [A-Z][A-Za-z0-9_]*\s*\(/u)
      expect(ownerSource, `${stem}.tsx must own authored JSX rather than facade another file`)
        .toContain("return <")
      expect(ownerSource, `${stem}.tsx must not re-export a public component owner`)
        .not.toMatch(/^\s*export\s+(?:\*|\{[^}]*\b[A-Z][A-Za-z0-9_]*\b[^}]*\})\s+from\s+/mu)
      expect(fixtureSource, `${stem}.fixture.tsx must import the exact adjacent owner`)
        .toContain(`from "./${basename}.tsx"`)
      expect(specificationSource, `${stem}.spec.ts must exercise the exact adjacent fixture`)
        .toContain(`from "./${basename}.fixture.tsx"`)
    }
    expect(governedComponents).toHaveLength(29)
  })
})

import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const root = resolve(import.meta.dir, "../..")
const packageRoot = resolve(root, "nodes")

const publicOwners = Object.freeze({
  "./node-tree": ["./node-tree.tsx", "NodeTree"],
  "./node-editor": ["./node-editor.tsx", "NodeEditor"],
  "./frame": ["./frame.tsx", "Frame"],
  "./node": ["./node.tsx", "Node"],
  "./parameter": ["./parameter.tsx", "Parameter"],
  "./socket": ["./socket.tsx", "Socket"],
  "./link": ["./link.tsx", "Link"],
} as const)

test("[NODES-001] каждый public TSX является compilable natural owner", async () => {
  const packageJson = await readPackageJson(packageRoot)
  expect(packageJson.exports["."]).toBe("./index.ts")
  expect(Object.keys(packageJson.exports).filter(key => key !== ".")).toEqual(Object.keys(publicOwners))

  const compiler = new JsxCompilerSession({
    cwd: root,
    sourceRoots: [packageRoot, resolve(root, "ui")],
  })
  try {
    for (const [subpath, [target, owner]] of Object.entries(publicOwners)) {
      expect(packageJson.exports[subpath]).toBe(target)
      const source = await Bun.file(resolve(packageRoot, target)).text()
      expect(source).toContain(`export function ${owner}(`)
      expect(source).not.toContain(`export {${owner}} from`)
      expect(source).not.toContain(`export { ${owner} } from`)
      const compiled = await compiler.compileFile(resolve(packageRoot, target))
      expect(compiled.code).toContain('from "@zavx0z/component"')
    }
  } finally {
    await compiler.close()
  }
}, 30_000)

test("[NODES-002] скрытые presentation substitutes отсутствуют", async () => {
  const source = await productionSource()
  for (const forbidden of ["NodeCard", "ParameterRow", "SocketPort", "NodeConnection"]) {
    expect(source).not.toContain(forbidden)
  }
  for (const removedFile of ["parameter-public.ts", "node-card.tsx", "parameter-row.tsx", "socket-port.tsx"]) {
    expect(await Bun.file(resolve(packageRoot, removedFile)).exists()).toBe(false)
  }
})

test("[NODES-003] Nodes не создаёт platform owners", async () => {
  const packageJson = await readPackageJson(packageRoot)
  for (const dependency of [
    "@zavx0z/browser",
    "@zavx0z/engine",
    "@zavx0z/renderer",
    "@zavx0z/space",
    "@zavx0z/webgpu",
  ]) {
    expect(packageJson.dependencies?.[dependency]).toBeUndefined()
  }

  const source = await productionSource()
  for (const forbidden of [
    "HTMLCanvasElement",
    "createDocument(",
    "createExperience(",
    "new Renderer(",
    "new Space(",
    "requestAnimationFrame(",
  ]) {
    expect(source).not.toContain(forbidden)
  }
})

test("[NODES-004] aggregate NodeTree consumes only the supplied nodetree Store", async () => {
  const nodeTreeSource = await Bun.file(resolve(packageRoot, "node-tree.tsx")).text()
  const parameterSource = await Bun.file(resolve(packageRoot, "parameter.tsx")).text()
  const propsStart = nodeTreeSource.indexOf("export type NodeTreeProps")
  const propsEnd = nodeTreeSource.indexOf("\n}>", propsStart)
  const propsContract = nodeTreeSource.slice(propsStart, propsEnd)

  expect(propsContract).toContain("store: NodeTreeStore")
  expect(propsContract).toContain("layout: LayoutResult")
  expect(propsContract).not.toMatch(/\bnodes\s*:/u)
  expect(propsContract).not.toMatch(/\blinks\s*:/u)
  expect(nodeTreeSource).toContain("const update = store.getTopologyUpdate()")
  expect(nodeTreeSource).toContain("props.store.parameter(nodeId, parameterId)")
  expect(nodeTreeSource).not.toMatch(/\bcreateNodeTree\s*\(/u)
  expect(parameterSource).toContain("getSnapshot: () => props.snapshot")
  expect(parameterSource).toContain("useSyncExternalStore(store.subscribe, store.getSnapshot)")
  expect(parameterSource).not.toMatch(/new\s+Parameter\s*\(/u)
})

test("[NODES-005] domain imports resolve only through public package contracts", async () => {
  const manifests = new Map([
    ["@zavx0z/nodetree", await readPackageJson(resolve(root, "nodetree"))],
    ["@zavx0z/layout", await readPackageJson(resolve(root, "layout"))],
    ["@zavx0z/ui", await readPackageJson(resolve(root, "ui"))],
  ])
  const specifiers = importSpecifiers(await productionSource())
    .filter(specifier => [...manifests.keys()].some(name =>
      specifier === name || specifier.startsWith(`${name}/`),
    ))
  expect(new Set(specifiers.map(specifier => specifier.split("/").slice(0, 2).join("/")))).toEqual(
    new Set(manifests.keys()),
  )

  for (const specifier of specifiers) {
    expect(specifier).not.toContain("/src/")
    const packageName = [...manifests.keys()].find(name =>
      specifier === name || specifier.startsWith(`${name}/`),
    )!
    const subpath = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`
    expect(manifests.get(packageName)?.exports[subpath]).toBeDefined()
  }
})

test("[NODES-006] projected Parameter render и геометрия используют один resolver", async () => {
  const parameterSource = await Bun.file(resolve(packageRoot, "parameter.tsx")).text()
  const nodeSource = await Bun.file(resolve(packageRoot, "node.tsx")).text()

  expect(parameterSource).toContain("const resolved = resolveProjectedParameterPresentation(snapshot)")
  expect(parameterSource).toContain("projectedParameterFieldHeight(")
  expect(parameterSource).not.toContain("booleanSwitch")
  expect(parameterSource).not.toContain("collectionEditor")
  expect(nodeSource).toContain("const resolved = resolveProjectedParameterPresentation(parameter)")
  expect(nodeSource).toContain("projectedParameterFieldHeight(resolved)")
})

async function readPackageJson(path: string): Promise<Readonly<{
  dependencies?: Readonly<Record<string, string>>
  exports: Readonly<Record<string, string>>
}>> {
  return Bun.file(resolve(path, "package.json")).json()
}

async function productionSource(): Promise<string> {
  const sources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.{ts,tsx}").scan({cwd: packageRoot})) {
    if (relativePath.startsWith("tests/")) continue
    sources.push(await Bun.file(resolve(packageRoot, relativePath)).text())
  }
  return sources.join("\n")
}

function importSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map(match => match[1]!)
}

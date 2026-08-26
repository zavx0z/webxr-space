import {createHash} from "node:crypto"
import {mkdir} from "node:fs/promises"
import {dirname, relative, resolve, sep} from "node:path"
import ts from "typescript-classic"

export type UiComponentGraphLocation = Readonly<{
  path: string
  line: number
  column: number
}>

export type UiComponentGraphNode = Readonly<{
  id: string
  kind: "public-render-export"
  layer: "element" | "component"
  package: "@ui/elements" | "@ui/components"
  subpath: string
  exportName: string
  declaration: UiComponentGraphLocation
}>

export type UiComponentGraphCallStep = Readonly<{
  caller: string
  callee: string
  location: UiComponentGraphLocation
}>

export type UiComponentGraphEdge = Readonly<{
  kind: "calls"
  from: string
  to: string
  evidence: readonly Readonly<{
    chain: readonly UiComponentGraphCallStep[]
  }>[]
}>

export type UiComponentGraph = Readonly<{
  schemaVersion: 1
  source: Readonly<{
    path: "projects/ui"
    revision: string
    dirty: boolean
    digestSha256: string
  }>
  scope: Readonly<{
    packages: readonly ["@ui/elements", "@ui/components"]
  }>
  nodes: readonly UiComponentGraphNode[]
  edges: readonly UiComponentGraphEdge[]
}>

export type UiComponentGraphOptions = Readonly<{
  superprojectRoot?: string
}>

type PackageLayer = UiComponentGraphNode["layer"]
type PackageName = UiComponentGraphNode["package"]

type PackageSource = Readonly<{
  layer: PackageLayer
  name: PackageName
  root: string
  manifestPath: string
  exports: ReadonlyMap<string, string>
}>

type PublicRenderExport = Readonly<{
  node: UiComponentGraphNode
  symbol: ts.Symbol
}>

type FunctionCall = Readonly<{
  target: ts.Symbol
  location: UiComponentGraphLocation
}>

type FunctionRecord = Readonly<{
  symbol: ts.Symbol
  label: string
  calls: readonly FunctionCall[]
}>

type PackageManifest = Readonly<{
  name: string
  exports: Readonly<Record<string, unknown>>
}>

const PACKAGE_SPECS = Object.freeze([
  {layer: "element", name: "@ui/elements", directory: "packages/elements"},
  {layer: "component", name: "@ui/components", directory: "packages/components"},
] as const)

const BARREL_SUBPATHS = new Set([".", "./primitives"])
const DEFAULT_OUTPUT = "graphs/ui-component-graph.json"

export async function buildUiComponentGraph(
  options: UiComponentGraphOptions = {},
): Promise<UiComponentGraph> {
  const superprojectRoot = resolve(options.superprojectRoot ?? resolve(import.meta.dir, ".."))
  const uiRoot = resolve(superprojectRoot, "projects/ui")
  const packages = await Promise.all(PACKAGE_SPECS.map(async (spec) => {
    const root = resolve(uiRoot, spec.directory)
    const manifestPath = resolve(root, "package.json")
    const manifest = await Bun.file(manifestPath).json() as PackageManifest
    if (manifest.name !== spec.name) {
      throw new Error(`Unexpected UI graph package name: ${manifest.name}`)
    }
    return Object.freeze({
      layer: spec.layer,
      name: spec.name,
      root,
      manifestPath,
      exports: resolvePackageExports(root, manifest.exports),
    }) satisfies PackageSource
  }))

  const sourcePaths = await productionSourcePaths(uiRoot)
  const compilerOptions = compilerOptionsFor(uiRoot, packages)
  const program = ts.createProgram({rootNames: sourcePaths, options: compilerOptions})
  const diagnostics = ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error &&
      diagnostic.file !== undefined && packages.some(({root}) => inside(diagnostic.file!.fileName, root)))
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics))
  }
  const checker = program.getTypeChecker()
  const publicExports = collectPublicRenderExports(program, checker, packages, uiRoot)
  const publicBySymbol = new Map(publicExports.map((entry) => [entry.symbol, entry] as const))
  const functionRecords = collectFunctionRecords(program, checker, uiRoot)
  const edges = collectPublicEdges(publicExports, publicBySymbol, functionRecords)
  const revision = git(uiRoot, ["rev-parse", "HEAD"])
  const dirty = git(uiRoot, ["status", "--porcelain=v1"]).length > 0
  const digestSha256 = await sourceDigest(uiRoot, [
    ...packages.map(({manifestPath}) => manifestPath),
    ...sourcePaths,
  ])

  return Object.freeze({
    schemaVersion: 1,
    source: Object.freeze({path: "projects/ui", revision, dirty, digestSha256}),
    scope: Object.freeze({packages: Object.freeze(["@ui/elements", "@ui/components"] as const)}),
    nodes: Object.freeze(publicExports.map(({node}) => node).sort(compareNode)),
    edges: Object.freeze(edges.sort(compareEdge)),
  })
}

export function serializeUiComponentGraph(graph: UiComponentGraph): string {
  return `${JSON.stringify(graph, null, 2)}\n`
}

export async function writeUiComponentGraph(
  options: UiComponentGraphOptions & Readonly<{outputPath?: string}> = {},
): Promise<UiComponentGraph> {
  const superprojectRoot = resolve(options.superprojectRoot ?? resolve(import.meta.dir, ".."))
  const outputPath = resolve(superprojectRoot, options.outputPath ?? DEFAULT_OUTPUT)
  const graph = await buildUiComponentGraph({superprojectRoot})
  await mkdir(dirname(outputPath), {recursive: true})
  await Bun.write(outputPath, serializeUiComponentGraph(graph))
  return graph
}

function resolvePackageExports(
  packageRoot: string,
  exports: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>()
  for (const [subpath, value] of Object.entries(exports)) {
    const target = exportTarget(value)
    if (target === null) continue
    result.set(subpath, resolve(packageRoot, target))
  }
  return result
}

function exportTarget(value: unknown): string | null {
  if (typeof value === "string") return value
  if (value === null || typeof value !== "object") return null
  const record = value as Readonly<Record<string, unknown>>
  return exportTarget(record.default) ?? exportTarget(record.import) ?? exportTarget(record.types)
}

async function productionSourcePaths(uiRoot: string): Promise<string[]> {
  const glob = new Bun.Glob("packages/{elements,components}/**/*.ts")
  const paths: string[] = []
  for await (const path of glob.scan({cwd: uiRoot, onlyFiles: true})) {
    const normalized = posix(path)
    if (normalized.includes("/storybook/")) continue
    if (normalized.endsWith(".test.ts") || normalized.endsWith(".d.ts")) continue
    paths.push(resolve(uiRoot, path))
  }
  return paths.sort()
}

function compilerOptionsFor(uiRoot: string, packages: readonly PackageSource[]): ts.CompilerOptions {
  const configPath = resolve(uiRoot, "tsconfig.json")
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error !== undefined) throw new Error(formatDiagnostics([config.error]))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, uiRoot)
  if (parsed.errors.length > 0) throw new Error(formatDiagnostics(parsed.errors))
  const paths: Record<string, string[]> = {...parsed.options.paths}
  for (const owner of packages) {
    for (const [subpath, target] of owner.exports) {
      const specifier = subpath === "." ? owner.name : `${owner.name}/${subpath.slice(2)}`
      paths[specifier] = [relative(uiRoot, target)]
    }
  }
  return {
    ...parsed.options,
    baseUrl: uiRoot,
    paths,
    noEmit: true,
    ignoreDeprecations: "6.0",
  }
}

function collectPublicRenderExports(
  program: ts.Program,
  checker: ts.TypeChecker,
  packages: readonly PackageSource[],
  uiRoot: string,
): PublicRenderExport[] {
  const result: PublicRenderExport[] = []
  const ownerBySymbol = new Map<ts.Symbol, string>()
  for (const owner of packages) {
    for (const [subpath, target] of [...owner.exports].sort(([left], [right]) => left.localeCompare(right))) {
      if (BARREL_SUBPATHS.has(subpath)) continue
      const source = program.getSourceFile(target)
      if (source === undefined) throw new Error(`UI graph export source was not loaded: ${target}`)
      const moduleSymbol = checker.getSymbolAtLocation(source)
      if (moduleSymbol === undefined) throw new Error(`UI graph export has no module symbol: ${target}`)
      for (const exported of checker.getExportsOfModule(moduleSymbol).sort((left, right) => left.name.localeCompare(right.name))) {
        const symbol = unalias(checker, exported)
        const declaration = valueDeclaration(symbol)
        if (declaration === undefined || !inside(declaration.getSourceFile().fileName, owner.root)) continue
        if (!isPublicRenderExport(checker, symbol, declaration)) continue
        const previousOwner = ownerBySymbol.get(symbol)
        const exactSpecifier = `${owner.name}/${subpath.slice(2)}`
        if (previousOwner !== undefined && previousOwner !== exactSpecifier) {
          throw new Error(`Ambiguous public UI graph owner: ${previousOwner} / ${exactSpecifier}#${exported.name}`)
        }
        ownerBySymbol.set(symbol, exactSpecifier)
        const exportName = exported.getName()
        result.push(Object.freeze({
          symbol,
          node: Object.freeze({
            id: `${exactSpecifier}#${exportName}`,
            kind: "public-render-export",
            layer: owner.layer,
            package: owner.name,
            subpath: exactSpecifier,
            exportName,
            declaration: location(uiRoot, declaration.getSourceFile(), declaration.getStart()),
          }),
        }))
      }
    }
  }
  const ids = new Set<string>()
  for (const {node} of result) {
    if (ids.has(node.id)) throw new Error(`Duplicate UI graph node: ${node.id}`)
    ids.add(node.id)
  }
  return result.sort((left, right) => compareNode(left.node, right.node))
}

function isPublicRenderExport(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
): boolean {
  const signatures = checker.getTypeOfSymbolAtLocation(symbol, declaration).getCallSignatures()
  return signatures.some((signature) => {
    const parameters = signature.getParameters()
    if (parameters.length < 4) return false
    const first = parameterType(checker, parameters[0]!, declaration)
    if (!isUiSurfaceType(checker, first)) return false
    return parameters.slice(1, 4).every((parameter) => isNumberType(parameterType(checker, parameter, declaration)))
  })
}

function parameterType(checker: ts.TypeChecker, symbol: ts.Symbol, fallback: ts.Node): ts.Type {
  return checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration ?? fallback)
}

function isUiSurfaceType(checker: ts.TypeChecker, type: ts.Type): boolean {
  if (type.isUnion()) return type.types.some((entry) => isUiSurfaceType(checker, entry))
  const names = [type.getSymbol()?.getName(), type.aliasSymbol?.getName()].filter(Boolean)
  if (names.includes("UiSurface")) return true
  return checker.typeToString(type).split(/[<>&| ]/).includes("UiSurface")
}

function isNumberType(type: ts.Type): boolean {
  if (type.isUnion()) return type.types.every(isNumberType)
  return (type.flags & ts.TypeFlags.NumberLike) !== 0
}

function collectFunctionRecords(
  program: ts.Program,
  checker: ts.TypeChecker,
  uiRoot: string,
): ReadonlyMap<ts.Symbol, FunctionRecord> {
  const records = new Map<ts.Symbol, FunctionRecord>()
  for (const source of program.getSourceFiles()) {
    if (!inside(source.fileName, resolve(uiRoot, "packages/elements")) &&
      !inside(source.fileName, resolve(uiRoot, "packages/components"))) continue
    if (source.fileName.includes(`${sep}storybook${sep}`) || source.fileName.endsWith(".test.ts")) continue
    const visit = (node: ts.Node): void => {
      const record = functionRecord(node, checker, uiRoot)
      if (record !== null) records.set(record.symbol, record)
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return records
}

function functionRecord(
  node: ts.Node,
  checker: ts.TypeChecker,
  uiRoot: string,
): FunctionRecord | null {
  let symbol: ts.Symbol | undefined
  let body: ts.Node | undefined
  let aliasTarget: ts.Expression | undefined
  if (ts.isFunctionDeclaration(node) && node.name !== undefined && node.body !== undefined) {
    symbol = checker.getSymbolAtLocation(node.name)
    body = node.body
  } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
    symbol = checker.getSymbolAtLocation(node.name)
    if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) body = node.initializer.body
    else if (ts.isIdentifier(node.initializer) || ts.isPropertyAccessExpression(node.initializer)) aliasTarget = node.initializer
  }
  if (symbol === undefined || (body === undefined && aliasTarget === undefined)) return null
  symbol = unalias(checker, symbol)
  const source = node.getSourceFile()
  const calls: FunctionCall[] = []
  if (body !== undefined) {
    const visit = (child: ts.Node): void => {
      if (ts.isCallExpression(child)) {
        const target = callSymbol(checker, child.expression)
        if (target !== undefined) calls.push(Object.freeze({
          target,
          location: location(uiRoot, source, child.expression.getStart()),
        }))
      }
      ts.forEachChild(child, visit)
    }
    visit(body)
  }
  if (aliasTarget !== undefined) {
    const target = callSymbol(checker, aliasTarget)
    if (target !== undefined) calls.push(Object.freeze({
      target,
      location: location(uiRoot, source, aliasTarget.getStart()),
    }))
  }
  const name = symbol.getName()
  return Object.freeze({
    symbol,
    label: `${posix(relative(uiRoot, source.fileName))}#${name}`,
    calls: Object.freeze(calls.sort(compareCall)),
  })
}

function callSymbol(checker: ts.TypeChecker, expression: ts.Expression): ts.Symbol | undefined {
  const direct = checker.getSymbolAtLocation(expression) ??
    (ts.isPropertyAccessExpression(expression) ? checker.getSymbolAtLocation(expression.name) : undefined)
  return direct === undefined ? undefined : unalias(checker, direct)
}

function collectPublicEdges(
  publicExports: readonly PublicRenderExport[],
  publicBySymbol: ReadonlyMap<ts.Symbol, PublicRenderExport>,
  functionRecords: ReadonlyMap<ts.Symbol, FunctionRecord>,
): UiComponentGraphEdge[] {
  const edges = new Map<string, UiComponentGraphEdge>()
  for (const source of publicExports) {
    const root = functionRecords.get(source.symbol)
    if (root === undefined) continue
    const queue: Array<Readonly<{record: FunctionRecord; chain: readonly UiComponentGraphCallStep[]}>> = [
      {record: root, chain: []},
    ]
    const depthBySymbol = new Map<ts.Symbol, number>([[root.symbol, 0]])
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const call of current.record.calls) {
        const targetPublic = publicBySymbol.get(call.target)
        const targetRecord = functionRecords.get(call.target)
        const callee = targetPublic?.node.id ?? targetRecord?.label ?? call.target.getName()
        const step = Object.freeze({
          caller: current.record.label,
          callee,
          location: call.location,
        })
        const chain = Object.freeze([...current.chain, step])
        if (targetPublic !== undefined) {
          if (targetPublic.symbol === source.symbol) continue
          const key = `${source.node.id}\u0000${targetPublic.node.id}`
          const candidate = Object.freeze({
            kind: "calls" as const,
            from: source.node.id,
            to: targetPublic.node.id,
            evidence: Object.freeze([Object.freeze({chain})]),
          })
          const previous = edges.get(key)
          if (previous === undefined || compareEvidence(candidate, previous) < 0) edges.set(key, candidate)
          continue
        }
        if (targetRecord === undefined) continue
        const nextDepth = chain.length
        const previousDepth = depthBySymbol.get(targetRecord.symbol)
        if (previousDepth !== undefined && previousDepth <= nextDepth) continue
        depthBySymbol.set(targetRecord.symbol, nextDepth)
        queue.push({record: targetRecord, chain})
      }
    }
  }
  return [...edges.values()]
}

function valueDeclaration(symbol: ts.Symbol): ts.Declaration | undefined {
  return symbol.valueDeclaration ?? symbol.declarations?.find((declaration) =>
    ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration),
  )
}

function unalias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)
}

function location(uiRoot: string, source: ts.SourceFile, offset: number): UiComponentGraphLocation {
  const point = source.getLineAndCharacterOfPosition(offset)
  return Object.freeze({
    path: posix(relative(uiRoot, source.fileName)),
    line: point.line + 1,
    column: point.character + 1,
  })
}

async function sourceDigest(uiRoot: string, paths: readonly string[]): Promise<string> {
  const digest = createHash("sha256")
  for (const path of [...new Set(paths)].sort()) {
    digest.update(posix(relative(uiRoot, path)))
    digest.update("\0")
    digest.update(new Uint8Array(await Bun.file(path).arrayBuffer()))
    digest.update("\0")
  }
  return digest.digest("hex")
}

function git(cwd: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...args], {cwd, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim())
  return result.stdout.toString().trim()
}

function inside(path: string, root: string): boolean {
  const rel = relative(root, path)
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep))
}

function posix(path: string): string {
  return path.split(sep).join("/")
}

function compareNode(left: UiComponentGraphNode, right: UiComponentGraphNode): number {
  return left.id.localeCompare(right.id)
}

function compareEdge(left: UiComponentGraphEdge, right: UiComponentGraphEdge): number {
  return left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.kind.localeCompare(right.kind)
}

function compareCall(left: FunctionCall, right: FunctionCall): number {
  return compareLocation(left.location, right.location) || left.target.getName().localeCompare(right.target.getName())
}

function compareLocation(left: UiComponentGraphLocation, right: UiComponentGraphLocation): number {
  return left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column
}

function compareEvidence(left: UiComponentGraphEdge, right: UiComponentGraphEdge): number {
  const leftChain = left.evidence[0]!.chain
  const rightChain = right.evidence[0]!.chain
  return leftChain.length - rightChain.length ||
    JSON.stringify(leftChain).localeCompare(JSON.stringify(rightChain))
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  })
}

async function runCli(): Promise<void> {
  const mode = Bun.argv[2] ?? "--stdout"
  const superprojectRoot = resolve(import.meta.dir, "..")
  const outputPath = resolve(superprojectRoot, DEFAULT_OUTPUT)
  const graph = await buildUiComponentGraph({superprojectRoot})
  const serialized = serializeUiComponentGraph(graph)
  if (mode === "--write") {
    await mkdir(dirname(outputPath), {recursive: true})
    await Bun.write(outputPath, serialized)
    console.log(`UI component graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
    return
  }
  if (mode === "--check") {
    const current = Bun.file(outputPath)
    if (!await current.exists() || await current.text() !== serialized) {
      throw new Error(`UI component graph is stale: run bun run graph:ui`)
    }
    console.log(`UI component graph is current: ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
    return
  }
  if (mode !== "--stdout") throw new Error(`Unknown UI component graph mode: ${mode}`)
  process.stdout.write(serialized)
}

if (import.meta.main) await runCli()

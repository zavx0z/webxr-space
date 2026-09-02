import {statSync} from "node:fs"
import {mkdir, stat, writeFile} from "node:fs/promises"
import {dirname, extname, resolve, sep} from "node:path"
import {
  GovernedFiles,
  lexicallyInside,
  selectGovernedCompilerSource,
} from "./governed-paths.ts"
import {JsxCompilerSession} from "./session.ts"
import {
  createCapabilityUsageManifest,
  serializeCapabilityUsageManifest,
} from "./capability-manifest.ts"
import type {CapabilityUsage} from "./capability-usage.ts"

export type CreateTemplateJsxPluginOptions = Readonly<{
  /** Base for relative source roots and TypeScript project discovery. */
  cwd?: string
  /** Explicit successful-build output for the neutral capability usage manifest. */
  capabilityManifestPath?: string
  /** Keep the TypeScript session across incremental dev-server rebuilds. */
  persistent?: boolean
  sourceRoots: readonly string[]
  /** Opt-in public root ids for authored CSS source provenance. */
  styleSourceRootIds?: readonly string[]
}>

export function createTemplateJsxBunPlugin(
  options: CreateTemplateJsxPluginOptions,
): Bun.BunPlugin {
  const configuredCwd = resolve(options.cwd ?? process.cwd())
  if (options.capabilityManifestPath !== undefined &&
    options.capabilityManifestPath.trim() === "") {
    throw new TypeError("capabilityManifestPath requires a non-empty path")
  }
  const capabilityManifestPath = options.capabilityManifestPath === undefined
    ? null
    : resolve(configuredCwd, options.capabilityManifestPath)
  const roots = options.sourceRoots.map((root) => resolve(configuredCwd, root))
  if (roots.length === 0) throw new TypeError("Template JSX plugin requires at least one source root")
  const governedFiles = new GovernedFiles(roots)
  const session = new JsxCompilerSession({
    cwd: options.cwd === undefined ? commonCwd(roots) : configuredCwd,
    sourceRoots: roots,
    ...(options.styleSourceRootIds === undefined
      ? {}
      : {styleSourceRootIds: options.styleSourceRootIds}),
  })
  const capabilityUsages = new Map<string, readonly CapabilityUsage[]>()
  let refresh = Promise.resolve()
  return {
    name: "zavx0z-template-jsx",
    setup(builder) {
      const hasBuildLifecycle = typeof builder.onStart === "function" &&
        typeof builder.onEnd === "function"
      if (!hasBuildLifecycle && options.persistent !== true) {
        throw new Error(
          "runtime Bun.plugin registration requires persistent: true for the Template JSX compiler",
        )
      }
      if (!hasBuildLifecycle && capabilityManifestPath !== null) {
        throw new Error(
          "capabilityManifestPath requires Bun build start/end lifecycle hooks",
        )
      }
      if (hasBuildLifecycle) {
        builder.onStart(() => {
          capabilityUsages.clear()
          governedFiles.refresh()
          refresh = discoverSourceFiles(roots).then(files => session.refreshFiles(files))
          return refresh
        })
      }
      builder.onLoad({filter: /\.(?:[cm]?jsx|[cm]?tsx)$/}, async ({path}) => {
        if (selectGovernedCompilerSource(governedFiles, path) === null) return undefined
        await refresh
        if (capabilityManifestPath === null) {
          const code = await session.transformFile(path)
          return {contents: code, loader: sourceLoader(extname(path))}
        }
        const result = await session.compileFile(path)
        capabilityUsages.set(path, result.capabilityUsages)
        return {contents: result.code, loader: sourceLoader(extname(path))}
      })
      if (hasBuildLifecycle) {
        builder.onEnd(async result => {
          try {
            if (result.success && capabilityManifestPath !== null) {
              const usages = [...capabilityUsages]
                .sort(([left], [right]) => left.localeCompare(right))
                .flatMap(([, values]) => values)
              const manifest = createCapabilityUsageManifest(usages)
              await mkdir(dirname(capabilityManifestPath), {recursive: true})
              await writeFile(
                capabilityManifestPath,
                serializeCapabilityUsageManifest(manifest),
                "utf8",
              )
            }
          } finally {
            if (options.persistent !== true) await session.close()
          }
        })
      }
    },
  }
}

const discoverSourceFiles = async (roots: readonly string[]): Promise<readonly string[]> => {
  const files: string[] = []
  const pattern = new Bun.Glob("**/*.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx,cjs,cjsx,cts,ctsx}")
  for (const root of roots) {
    const metadata = await stat(root)
    if (metadata.isFile()) {
      files.push(root)
      continue
    }
    for await (const path of pattern.scan({cwd: root, onlyFiles: true})) {
      if (path.split(sep).includes("node_modules")) continue
      files.push(resolve(root, path))
    }
  }
  return Object.freeze(files)
}

const commonCwd = (roots: readonly string[]): string => {
  let candidate = statSync(roots[0]!).isDirectory() ? roots[0]! : dirname(roots[0]!)
  while (!roots.every(root => lexicallyInside(candidate, root))) {
    const parent = dirname(candidate)
    if (parent === candidate) return candidate
    candidate = parent
  }
  return candidate
}

const sourceLoader = (extension: string): "js" | "jsx" | "ts" | "tsx" => {
  if (extension === ".jsx") return "tsx"
  if (extension === ".tsx") return "tsx"
  if (extension.endsWith("js")) return "js"
  return "ts"
}

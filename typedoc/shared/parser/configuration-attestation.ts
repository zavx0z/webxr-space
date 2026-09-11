import {createHash} from "node:crypto"
import {dirname, extname, isAbsolute, join, resolve} from "node:path"
import {readFile, stat} from "node:fs/promises"

/**
Снимает байты ближайших project config до создания TypeScript snapshot.

Возвращённая `verify()` повторно читает те же пути и отклоняет результат, если
конфигурация изменилась во время анализа. Само разрешение `extends` остаётся
ответственностью TypeScript; активный config дополнительно входит в output sources.

@param paths - Абсолютные исходники будущего snapshot.
Поиск config следует вверх от каждого исходника так же, как configured project.

@returns Набор путей и операция побайтовой проверки их неизменности.
*/
export async function attestTypeScriptConfigurations(
  paths: readonly string[],
) {
  const digests = new Map<string, string>()
  for (const path of paths) {
    const config = await nearestConfiguration(path)
    if (config !== null) await collectConfiguration(config, digests, new Set())
  }
  return Object.freeze({
    paths: Object.freeze([...digests.keys()].sort()),
    sources: Object.freeze([...digests].sort(([left], [right]) => left.localeCompare(right))
      .map(([path, digest]) => Object.freeze({path, digest}))),
    verify: async (): Promise<void> => {
      for (const [path, expected] of digests) {
        const current = await readFile(path).catch(() => null)
        if (current === null || digest(current) !== expected) {
          throw new Error(`TypeDoc: конфигурация изменилась во время анализа: ${path}`)
        }
      }
    },
  })
}

async function collectConfiguration(
  path: string,
  digests: Map<string, string>,
  visiting: Set<string>,
): Promise<void> {
  path = resolve(path)
  if (digests.has(path)) return
  if (visiting.has(path)) throw new Error(`TypeDoc: циклическая цепочка extends: ${path}`)
  visiting.add(path)
  try {
    const bytes = await readFile(path)
    const value = Bun.JSONC.parse(new TextDecoder().decode(bytes))
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`TypeDoc: конфигурация должна быть объектом: ${path}`)
    }
    digests.set(path, digest(bytes))
    const extended = (value as Record<string, unknown>).extends
    const references = typeof extended === "string" ? [extended] : Array.isArray(extended) && extended.every(item => typeof item === "string")
      ? extended : extended === undefined ? [] : null
    if (references === null) throw new Error(`TypeDoc: extends должен быть строкой или массивом строк: ${path}`)
    for (const reference of references) {
      await collectConfiguration(await resolveConfigurationReference(path, reference), digests, visiting)
    }
  } finally {
    visiting.delete(path)
  }
}

async function resolveConfigurationReference(from: string, reference: string): Promise<string> {
  const base = dirname(from)
  if (isAbsolute(reference) || reference.startsWith(".")) {
    const resolved = await firstConfigurationCandidate(resolve(base, reference))
    if (resolved !== null) return resolved
  } else {
    try {
      const resolved = Bun.resolveSync(reference, base)
      if (extname(resolved) === ".json" && (await stat(resolved).catch(() => undefined))?.isFile()) return resolved
    } catch {
      // Package configs without an exported JSON subpath use the node_modules fallback below.
    }
    const segments = reference.split("/")
    const packageName = reference.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0]!
    const subpath = segments.slice(reference.startsWith("@") ? 2 : 1).join("/")
    for (let directory = base;; directory = dirname(directory)) {
      const packageRoot = join(directory, "node_modules", ...packageName.split("/"))
      const packageJson = join(packageRoot, "package.json")
      if ((await stat(packageJson).catch(() => undefined))?.isFile()) {
        if (subpath.length > 0) {
          const resolved = await firstConfigurationCandidate(join(packageRoot, subpath))
          if (resolved !== null) return resolved
        } else {
          const metadata = Bun.JSONC.parse(await readFile(packageJson, "utf8")) as Record<string, unknown>
          const target = typeof metadata.tsconfig === "string" ? metadata.tsconfig : "tsconfig.json"
          const resolved = await firstConfigurationCandidate(resolve(packageRoot, target))
          if (resolved !== null) return resolved
        }
      }
      const parent = dirname(directory)
      if (parent === directory) break
    }
  }
  throw new Error(`TypeDoc: не удалось разрешить extends ${reference} из ${from}`)
}

async function firstConfigurationCandidate(path: string): Promise<string | null> {
  for (const candidate of [path, `${path}.json`, join(path, "tsconfig.json")]) {
    if ((await stat(candidate).catch(() => undefined))?.isFile()) return resolve(candidate)
  }
  return null
}

async function nearestConfiguration(path: string): Promise<string | null> {
  for (let directory = dirname(path);;) {
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const candidate = join(directory, name)
      if ((await stat(candidate).catch(() => undefined))?.isFile()) return candidate
    }
    const parent = dirname(directory)
    if (parent === directory) return null
    directory = parent
  }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

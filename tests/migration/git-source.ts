import {isAbsolute, relative, resolve, sep} from "node:path"
import sourceContracts from "./source-contracts.json"

const root = resolve(import.meta.dir, "../..")
const contents = new Map<string, Promise<string>>()

/**
Читает исходник из зафиксированного Git-коммита, сохраняя все байты текста.

Рабочее дерево, индекс и текущий HEAD не используются. Обычный новый коммит
или незакоммиченная правка в исходном репозитории не меняет результат.

@param revision - Полный SHA-1 коммита; имена веток, HEAD и сокращения запрещены.
@param path - Путь файла внутри дерева коммита, без выхода через `..`.
@throws Error Если ссылка изменяемая, путь некорректен или Git-объект недоступен.
*/
export function readPinnedGitFile(checkout: string, revision: string, path: string): Promise<string> {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Migration source requires a full immutable commit id")
  if (isAbsolute(path) || path.split(/[\\/]/).some(part => part === ".." || part === "")) {
    throw new Error("Migration source path must stay inside its commit")
  }
  const key = `${resolve(checkout)}\0${revision}\0${path}`
  let value = contents.get(key)
  if (!value) {
    value = gitOutput(checkout, "show", `${revision}:${path}`)
    contents.set(key, value)
  }
  return value
}

/** Находит исторического владельца по пути из карты прежних пакетов. */
export function readMigrationSource(path: string): Promise<string> {
  const absolute = resolve(root, path)
  for (const [directory, revision] of Object.entries(sourceContracts.sources)) {
    const checkout = resolve(root, directory)
    const fromCheckout = relative(checkout, absolute)
    if (fromCheckout === ".." || fromCheckout.startsWith(`..${sep}`) || isAbsolute(fromCheckout)) continue
    return readPinnedGitFile(checkout, revision, fromCheckout.split(sep).join("/"))
  }
  throw new Error(`No historical source owner for ${path}`)
}

export async function gitOutput(checkout: string, ...arguments_: string[]): Promise<string> {
  const child = Bun.spawn(["git", "-C", checkout, ...arguments_], {stdout: "pipe", stderr: "pipe"})
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) throw new Error(`Migration Git source is unavailable: ${checkout}: ${arguments_.join(" ")}: ${stderr.trim()}`)
  return stdout
}

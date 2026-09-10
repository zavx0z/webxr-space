import {existsSync} from "node:fs"
import {dirname, relative, resolve, sep} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const registered = new Map<string, () => Promise<void>>()

export function repositoryRoot(directory: string): string {
  let current = resolve(directory)
  while (!existsSync(resolve(current, ".git"))) {
    const parent = dirname(current)
    if (parent === current) throw new Error("Для Headless нужно явно указать projectRoot")
    current = parent
  }
  return current
}

/**
Подключает обычный Template compiler к последующим импортам TSX.
Для статических импортов вызывается из Bun preload до загрузки spec.
Охватывает все пакеты выбранного проекта. Spec-файлы используют JSX-транспорт Headless.
Preload может разделять сессию между модулями и закрывать её после тестов;
обычная регистрация закрывает сессию после каждого модуля.
*/
export function registerHeadlessCompiler(projectRoot: string, sharedSession = false): () => Promise<void> {
  const root = resolve(projectRoot)
  const existing = registered.get(root)
  if (existing !== undefined) return existing
  let session: JsxCompilerSession | null = null
  const close = async () => {
    const previous = session
    session = null
    await previous?.close()
  }
  Bun.plugin({
    name: `headless-template:${root}`,
    setup(builder) {
      builder.onLoad({filter: /\.tsx$/}, async ({path}) => {
        const local = relative(root, path)
        if (local.startsWith(`..${sep}`) || local === ".." || local.split(sep).includes("node_modules")) return undefined
        if (/\.(?:spec|test)\.tsx$/.test(path)) {
          return {contents: await Bun.file(path).text(), loader: "tsx"}
        }
        const compiler = sharedSession
          ? session ??= new JsxCompilerSession({cwd: root, sourceRoots: [root]})
          : new JsxCompilerSession({cwd: root, sourceRoots: [root]})
        try {
          return {contents: await compiler.transformFile(path), loader: "ts"}
        } finally {
          if (!sharedSession) await compiler.close()
        }
      })
    },
  })
  registered.set(root, close)
  return close
}

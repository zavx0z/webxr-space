import {existsSync} from "node:fs"
import {dirname, relative, resolve, sep} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const registered = new Set<string>()

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
Вызывается из createHeadless до динамического импорта компонента.
Охватывает все пакеты выбранного проекта. Spec-файлы используют JSX-транспорт Headless.
Сессия компиляции закрывается после обработки каждого модуля.
*/
export function registerHeadlessCompiler(projectRoot: string): void {
  const root = resolve(projectRoot)
  if (registered.has(root)) return
  Bun.plugin({
    name: `headless-template:${root}`,
    setup(builder) {
      builder.onLoad({filter: /\.tsx$/}, async ({path}) => {
        const local = relative(root, path)
        if (local.startsWith(`..${sep}`) || local === ".." || local.split(sep).includes("node_modules")) return undefined
        if (/\.(?:spec|test)\.tsx$/.test(path)) {
          return {contents: await Bun.file(path).text(), loader: "tsx"}
        }
        const compiler = new JsxCompilerSession({cwd: root, sourceRoots: [root]})
        try {
          return {contents: await compiler.transformFile(path), loader: "ts"}
        } finally {
          await compiler.close()
        }
      })
    },
  })
  registered.add(root)
}

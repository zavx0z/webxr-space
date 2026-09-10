import {resolve} from "node:path"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

// Все тесты владельца используют один compiler с полным графом JSX-зависимостей.
const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: ["nodes", "ui", "markdown"].map(directory => resolve(root, directory)),
}))

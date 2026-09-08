import {inspectBrowserRoot, type Root, type RootInspection} from "./create-root.ts"

/**
Наблюдение существующего приложения для тестов и внешних инструментов.

whenReady ожидает отрисовку последнего запрошенного render; при ошибке или unmount
Promise отклоняется. Обычному запуску ожидание не требуется. Это техническая
готовность кадра, не визуальная приёмка.
*/
export function inspectRoot(root: Root): RootInspection {
  return inspectBrowserRoot(root)
}

export type {Root as Presentation} from "./src/attach.ts"

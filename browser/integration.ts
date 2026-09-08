import {createRootWithSeams, inspectBrowserRoot, type Root as ApplicationRoot, type RootOptions} from "./create-root.ts"
import {createApplicationStyleSheets} from "./src/application-stylesheets.ts"
import {createBrowserLinkedAuthorStyleSheetHost} from "./src/linked-author-style-sheet-host.ts"
import {loadDocumentDefaultFont} from "@zavx0z/engine/default-font"
import type {TrueTypeFont} from "@zavx0z/engine"
import {loadFontFaces, type BrowserFontFaceSource} from "./font-faces.ts"
import type {Root as Presentation, RootLinkedAuthorStyleSheet} from "./src/attach.ts"

export type {BrowserFontFaceSource} from "./font-faces.ts"
export type {
  RootLinkedAuthorStyleSheet, RootDocumentProjection, RootProjection, RootSpaceProjection,
  RootKeyInput, RootPointerInput, RootWheelInput, RootInput,
} from "./src/attach.ts"
export type {Presentation}

/** Настройки внешнего окружения, уже владеющего загруженными ресурсами native страницы. */
export interface IntegrationOptions extends RootOptions {
  readonly font?: TrueTypeFont
  readonly fontSources?: readonly BrowserFontFaceSource[]
  /** Заимствованные links, включая базовую тему; Browser их не создаёт и не удаляет. */
  readonly stylesheets?: readonly RootLinkedAuthorStyleSheet[]
}

export interface IntegrationRoot extends ApplicationRoot {
  /** Диагностика текущего render для внешнего инструмента; обычному App не требуется. */
  whenReady(): Promise<Presentation>
}

/**
React-shaped запуск для host-интеграций с готовыми native ресурсами.

Использует тот же Browser root и lifecycle. Обычное приложение импортирует
createRoot из корня пакета и объявляет ресурсы в TSX.

@throws TypeError При неверном Canvas или pixelRatio.
@throws Error При занятом Canvas/native Document.
*/
export function createRoot(canvas: HTMLCanvasElement, options: IntegrationOptions = {}): IntegrationRoot {
  const root = createRootWithSeams(canvas, options, {
    loadFont: () => options.font ? Promise.resolve(options.font) : loadDocumentDefaultFont(canvas.ownerDocument),
    createStyleSheets: (canvas, document, onError) => createApplicationStyleSheets(
      canvas, document, onError, createBrowserLinkedAuthorStyleSheetHost, options.stylesheets,
    ),
    createRuntime: async (input, claim) => {
      const {createDocumentSpaceRuntime} = await import("./src/space-runtime.ts")
      const fontFaces = options.fontSources === undefined ? undefined
        : await loadFontFaces(options.fontSources, canvas.ownerDocument.baseURI)
      return createDocumentSpaceRuntime({...input, ...(fontFaces === undefined ? {} : {fontFaces})}, claim)
    },
  })
  return Object.freeze({...root, whenReady: () => inspectBrowserRoot(root).whenReady()})
}

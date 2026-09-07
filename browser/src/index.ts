/**
Подключение декларативного приложения к одному Canvas.

`attach` владеет общими ресурсами, вводом и планированием кадров.
`useSpace` читает выбранные данные подключения, `useFrame` участвует в том же
цикле кадров. Сцена, камера и интерфейс остаются элементами одного Document.

@packageDocumentation
*/
export {attach} from "./attach.ts"
export type {BrowserFontFaceSource} from "../font-faces.ts"
export type {
  AttachOptions,
  Root,
  RootInput,
  RootDocumentProjection,
  RootKeyInput,
  RootLinkedAuthorStyleSheet,
  RootLinkedAuthorStyleSheetErrorHandler,
  RootProjection,
  RootProjectionKind,
  RootPointerInput,
  RootWheelInput,
  RootSpaceProjection,
} from "./attach.ts"

export {useSpace, useFrame} from "./root-context.ts"
export type {RootSize, RootState, FrameState, FrameCallback, FrameLoop} from "./root-context.ts"
export type {DocumentClipboardController, ClipboardMenuState, ClipboardResult} from "../clipboard.ts"

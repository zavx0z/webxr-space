/**
Подключение декларативного приложения к одному Canvas.

`createRoot(canvas).render(<App />)` подключает одно приложение. Browser владеет
общими ресурсами, вводом и планированием кадров.
`useSpace` читает выбранные данные подключения, `useFrame` участвует в том же
цикле кадров. Сцена, камера и интерфейс остаются элементами одного Document.

@packageDocumentation
*/
export {createRoot} from "../create-root.ts"
export type {Root, RootOptions} from "../create-root.ts"

export {useSpace, useFrame} from "./root-context.ts"
export type {RootSize, RootState, FrameState, FrameCallback, FrameLoop} from "./root-context.ts"
export type {DocumentClipboardController, ClipboardMenuState, ClipboardResult} from "../clipboard.ts"

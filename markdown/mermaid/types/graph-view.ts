import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"

/**
Содержимое JSX-моста для {@link @webxr/nodes/view#GraphView | GraphView}.
Форма {@link JsxSourceElement} допускает передачу через [внутренний адаптер children](../src/graph-view.tsx).
Допускает пустой результат и несколько элементов без дополнительного DOM-контейнера.
*/
export type GraphChildren = JsxSourceElement | readonly JsxSourceElement[] | null | undefined

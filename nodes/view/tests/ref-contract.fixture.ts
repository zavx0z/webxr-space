import type {CallbackRef} from "@zavx0z/template/jsx-runtime"
import type {Element as SemanticElement} from "@zavx0z/dom"
import type {DiagramNodeProps} from "@nodes/node/diagram/contract/input"

/** Минимальное type-воспроизведение: JSX ref типизирован нативным HTMLElement. */
export function checkRefContract(native: CallbackRef<HTMLElement>, semantic: (element: SemanticElement | null) => void) {
  const accepted: DiagramNodeProps["elementRef"] = native
  // @ts-expect-error Semantic Element структурно отличается от HTMLElement авторского JSX.
  const mismatch: CallbackRef<HTMLElement> = semantic
  return {accepted, mismatch}
}

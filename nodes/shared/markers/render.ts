import {component} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {MarkerComponent, MarkerContext, MarkerProps} from "./contracts.ts"

export type MarkerChildren = JsxSourceElement | readonly JsxSourceElement[] | null | undefined

/** Та же публичная граница compiled component transport, что у GraphView.view; DOM-типы не приводятся. */
export function renderMarker(marker: MarkerComponent, context: MarkerContext): MarkerChildren {
  return component(marker as unknown as CompiledTemplate<MarkerProps>, {context}, context.side) as unknown as JsxSourceElement
}

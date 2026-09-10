import type {FunctionComponent} from "@zavx0z/component"

/** Локальные CSS-пиксели готового маршрута; direction — единичная ось наружу от конца пути. */
export type MarkerPlacement = Readonly<{
  position: Readonly<{x: number; y: number}>
  direction: Readonly<{x: number; y: number}>
}>

/** Link владеет привязкой к пути. Маркер выбирает собственный вид, размер и отступ. */
export type MarkerContext = MarkerPlacement & Readonly<{
  ownerId: string
  side: "start" | "end"
  color: string
  strokeWidth: number
  selected: boolean
  disabled: boolean
  hidden: boolean
}>
export type MarkerProps = Readonly<{context: MarkerContext}>
export type MarkerComponent = FunctionComponent<MarkerProps>

import type {SocketKind} from "@nodes/sockets/presets"
import type {MarkerComponent} from "../../shared/markers/contracts.ts"
import type {LinkMarkerGeometry, LinkRoute} from "../../shared/routing/link-path.ts"

/** Точный адрес сокета на одном конце связи. */
export type LinkEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

/** Данные маршрута и представления одной связи графа. */
export type LinkDefinition = Readonly<{
  id: string
  title: string
  route: LinkRoute
  color?: string | undefined
  strokeWidth?: number | undefined
  markers?: readonly LinkMarkerGeometry[] | undefined
  kind?: SocketKind | undefined
  from?: LinkEndpoint | undefined
  to?: LinkEndpoint | undefined
  startMarker?: MarkerComponent | null | undefined
  endMarker?: MarkerComponent | null | undefined
  /** @deprecated Используйте `startMarker={Arrow}`. */
  startArrow?: boolean | undefined
  /** @deprecated Используйте `endMarker={Arrow}`. */
  endArrow?: boolean | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
  hidden?: boolean | undefined
}>

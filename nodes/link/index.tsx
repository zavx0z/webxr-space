import {MarkerSlot} from "../shared/markers/slot/index.tsx"
import {Arrow} from "../markers/arrow/index.tsx"
import type {MarkerComponent, MarkerContext} from "../shared/markers/contracts.ts"
/**
Link отображает маршрут владельца Layout через семантический vector-path.
Подписка на переданный Store сохраняет идентичность элемента пути; преобразование маршрута разделяется со всеми проекциями.

@packageDocumentation
*/

import type {ExternalStore} from "@nodes/tree"
import {
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/component"
import {
  createCubicLinkRoute,
  projectLinkRoute,
  projectLinkArrowheads,
  projectLinkMarkers,
  projectLinkEndpoints,
  type LinkCubicCurve,
  type LinkPathBounds,
  type LinkPathPoint,
  type LinkPathProjection,
  type LinkRoute,
  type LinkMarkerStyle,
  type LinkMarkerGeometry,
} from "../shared/routing/link-path.ts"
import {socketPreset, type SocketKind} from "@nodes/sockets/presets"

const DEFAULT_LINK_COLOR = "#9e9e9e"

export {
  createCubicLinkRoute,
  projectLinkRoute,
  projectLinkArrowheads,
  projectLinkMarkers,
  projectLinkEndpoints,
}

export type {
  LinkCubicCurve,
  LinkPathBounds,
  LinkPathPoint,
  LinkPathProjection,
  LinkRoute,
  LinkMarkerStyle,
  LinkMarkerGeometry,
}

export type LinkEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

export type LinkDefinition = Readonly<{
  id: string
  title: string
  route: LinkRoute
  /** Явный цвет имеет приоритет над kind и нейтральным default. */
  color?: string | undefined
  strokeWidth?: number | undefined
  /** Точная заполненная геометрия приоритетнее component slots и legacy boolean arrows; [] отключает стрелки. */
  markers?: readonly LinkMarkerGeometry[] | undefined
  /** Только явно заданный тип; отсутствие означает обычную нейтральную связь. */
  kind?: SocketKind | undefined
  from?: LinkEndpoint | undefined
  to?: LinkEndpoint | undefined
  /** Компоненты концов. null явно отключает legacy стрелку на соответствующем конце. */
  startMarker?: MarkerComponent | null | undefined
  endMarker?: MarkerComponent | null | undefined
  /** @deprecated Используйте startMarker={Arrow}. */
  startArrow?: boolean | undefined
  /** @deprecated Используйте endMarker={Arrow}. */
  endArrow?: boolean | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
  hidden?: boolean | undefined
}>

/**
Представление одного маршрута с прямыми props или исходным внешним Store.

@property [store] - При наличии владеет текущим LinkDefinition и обновляет существующий семантический путь.

@property [onActivate] - Вызывается для допустимой активации выбранного пути; значение модели компонент не изменяет.
*/
export type LinkProps = LinkDefinition & Readonly<{
  store?: ExternalStore<LinkDefinition> | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
}>

export function Link(props: LinkProps) {
  const direct = useMemo(() => Object.freeze({
    id: props.id,
    title: props.title,
    route: props.route,
    kind: props.kind,
    color: props.color,
    strokeWidth: props.strokeWidth,
    markers: props.markers,
    from: props.from,
    to: props.to,
    startMarker: props.startMarker,
    endMarker: props.endMarker,
    startArrow: props.startArrow,
    endArrow: props.endArrow,
    selected: props.selected,
    disabled: props.disabled,
    hidden: props.hidden,
  }), [
    props.id,
    props.title,
    props.route,
    props.kind,
    props.color,
    props.strokeWidth,
    props.markers,
    props.from,
    props.to,
    props.startMarker,
    props.endMarker,
    props.startArrow,
    props.endArrow,
    props.selected,
    props.disabled,
    props.hidden,
  ])
  const fallbackStore = useMemo(() => Object.freeze({
    subscribe: (_listener: () => void) => () => {},
    getSnapshot: () => direct,
  }), [direct])
  const store = props.store ?? fallbackStore
  const definition = useSyncExternalStore(store.subscribe, store.getSnapshot)
  validateLinkProps(definition)
  const projection = projectLinkRoute(definition.route)
  const color = definition.color ?? (definition.kind === undefined ? DEFAULT_LINK_COLOR : socketPreset(definition.kind).color)
  const endpoints = projectLinkEndpoints(definition.route)
  const Start = definition.startMarker === undefined ? definition.startArrow ? Arrow : null : definition.startMarker
  const End = definition.endMarker === undefined ? definition.endArrow ? Arrow : null : definition.endMarker
  const context = (side: "start" | "end"): MarkerContext => ({
    ...endpoints[side], ownerId: definition.id, side, color,
    strokeWidth: definition.strokeWidth ?? 2.2,
    selected: definition.selected === true,
    disabled: definition.disabled === true,
    hidden: definition.hidden === true,
  })
  const arrowheads = definition.markers ?? []
  return <>
    <vector-path
      role="option"
      tabIndex={0}
      aria-label={definition.title}
      aria-selected={String(definition.selected === true)}
      aria-disabled={String(definition.disabled === true)}
      data-link-id={definition.id}
      data-socket-kind={definition.kind}
      data-path-segments={projection.segmentCount}
      data-link-start-arrow={definition.markers ? definition.markers.some(marker => marker.side === "start") ? "true" : undefined : Start ? "true" : undefined}
      data-link-end-arrow={definition.markers ? definition.markers.some(marker => marker.side === "end") ? "true" : undefined : End ? "true" : undefined}
      hidden={definition.hidden === true}
      d={projection.d}
      onClick={props.onActivate}
      style={css`
        box-sizing: border-box;
        position: absolute;
        z-index: 1;
        display: block;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        color: ${color};
        stroke: ${color};
        fill: none;
        stroke-width: ${definition.strokeWidth ?? 2.2}px;
        pointer-hit-width: 16px;

        &[aria-selected="true"] {
          z-index: 2;
          stroke-width: 3.4px;
        }

        &[aria-disabled="true"] {
          opacity: .45;
        }

        &[hidden] {
          display: none;
        }

        ${props.style}
      `}
    ></vector-path>
    {definition.markers === undefined && Start ? <MarkerSlot
      marker={Start}
      context={context("start")}
    /> : null}
    {definition.markers === undefined && End ? <MarkerSlot
      marker={End}
      context={context("end")}
    /> : null}
    {arrowheads.map(arrow => <LinkArrow
      key={arrow.side}
      id={definition.id}
      side={arrow.side}
      d={arrow.d}
      filled={true}
      color={color}
      strokeWidth={definition.strokeWidth}
      selected={definition.selected}
      disabled={definition.disabled}
      hidden={definition.hidden}
    />)}
  </>
}

function LinkArrow(props: Readonly<{
  id: string
  side: string
  d: string
  filled: boolean
  color: string
  strokeWidth?: number | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
  hidden?: boolean | undefined
}>) {
  return <vector-path
    aria-hidden="true"
    data-link-owner={props.id}
    data-link-arrow={props.side}
    d={props.d}
    hidden={props.hidden === true}
    style={css`
      position: absolute;
      display: block;
      left: 0;
      top: 0;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 2;
      stroke: ${props.color};
      color: ${props.color};
      fill: ${props.filled ? "currentColor" : "none"};
      stroke-width: ${props.filled ? 0 : props.selected ? 3.4 : props.strokeWidth ?? 2.2}px;
      opacity: ${props.disabled ? .45 : 1};
      pointer-events: none;

      &[hidden] {
        display: none;
      }
    `}
  />
}

export type LinkComponent = FunctionComponent<LinkProps>

function validateLinkProps(props: LinkDefinition): void {
  if (props.id.trim().length === 0) throw new TypeError("Link id must be non-empty")
  if (props.title.trim().length === 0) throw new TypeError(`Link ${props.id} title must be non-empty`)
  projectLinkRoute(props.route)
}

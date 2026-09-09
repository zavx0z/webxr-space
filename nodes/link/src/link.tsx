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
  type LinkCubicCurve,
  type LinkPathBounds,
  type LinkPathPoint,
  type LinkPathProjection,
  type LinkRoute,
} from "../../shared/routing/link-path.ts"
import {socketPreset, type SocketKind} from "@nodes/sockets/presets"

export {
  createCubicLinkRoute,
  projectLinkRoute,
  projectLinkArrowheads,
}

export type {
  LinkCubicCurve,
  LinkPathBounds,
  LinkPathPoint,
  LinkPathProjection,
  LinkRoute,
}

export type LinkEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

export type LinkDefinition = Readonly<{
  id: string
  title: string
  route: LinkRoute
  kind?: SocketKind | undefined
  from?: LinkEndpoint | undefined
  to?: LinkEndpoint | undefined
  startArrow?: boolean | undefined
  endArrow?: boolean | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
  hidden?: boolean | undefined
}>

/**
Представление одного маршрута с прямыми props или исходным внешним Store.

@property [store] - При наличии владеет текущим LinkDefinition и обновляет существующий semantic путь.

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
    from: props.from,
    to: props.to,
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
    props.from,
    props.to,
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
  const arrowheads = projectLinkArrowheads(definition.route, definition.startArrow, definition.endArrow)
  const color = socketPreset(definition.kind ?? "custom").color
  return <>
    <vector-path
      role="option"
      tabIndex={0}
      aria-label={definition.title}
      aria-selected={String(definition.selected === true)}
      aria-disabled={String(definition.disabled === true)}
      data-link-id={definition.id}
      data-socket-kind={definition.kind ?? "custom"}
      data-path-segments={projection.segmentCount}
      data-link-start-arrow={definition.startArrow === true ? "true" : undefined}
      data-link-end-arrow={definition.endArrow === true ? "true" : undefined}
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
        stroke-width: 2.2px;
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
    {arrowheads.map(arrow => <LinkArrow
      key={arrow.side}
      id={definition.id}
      side={arrow.side}
      d={arrow.d}
      color={color}
      selected={definition.selected}
      disabled={definition.disabled}
      hidden={definition.hidden}
    />)}
  </>
}

function LinkArrow(props: Readonly<{id: string; side: string; d: string; color: string; selected?: boolean | undefined; disabled?: boolean | undefined; hidden?: boolean | undefined}>) {
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
      stroke-width: ${props.selected ? 3.4 : 2.2}px;
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

import type {ExternalStore} from "@nodes/core"
import {
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/react"
import {
  createCubicLinkRoute,
  projectLinkRoute,
  type LinkCubicCurve,
  type LinkPathBounds,
  type LinkPathPoint,
  type LinkPathProjection,
  type LinkRoute,
} from "./src/link-path.ts"
import {socketPreset, type SocketKind} from "./socket.tsx"

export {
  createCubicLinkRoute,
  projectLinkRoute,
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
  selected?: boolean | undefined
  disabled?: boolean | undefined
  hidden?: boolean | undefined
}>

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
  const color = socketPreset(definition.kind ?? "custom").color
  return <vector-path
    role="option"
    tabIndex={0}
    aria-label={definition.title}
    aria-selected={String(definition.selected === true)}
    aria-disabled={String(definition.disabled === true)}
    data-link-id={definition.id}
    data-socket-kind={definition.kind ?? "custom"}
    data-path-segments={projection.segmentCount}
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
}

export type LinkComponent = FunctionComponent<LinkProps>

function validateLinkProps(props: LinkDefinition): void {
  if (props.id.trim().length === 0) throw new TypeError("Link id must be non-empty")
  if (props.title.trim().length === 0) throw new TypeError(`Link ${props.id} title must be non-empty`)
  projectLinkRoute(props.route)
}

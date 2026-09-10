/**
Конкретная нода с готовыми параметрами и сокетами.

@packageDocumentation
*/

import {NODE_BORDER_WIDTH} from "@nodes/sockets/metrics"
import {Pane} from "@zavx0z/ui/surfaces/pane"
import {ParameterNodeContents} from "./contents/index.tsx"
import type {ParameterNodeProps} from "../shared/contracts.ts"
import {planProjectedNodeGeometry, NODE_HEADER_HEIGHT, NODE_MINIMUM_WIDTH} from "../geometry/src/geometry.ts"

export type {ParameterNodeProps} from "../shared/contracts.ts"

/** Составляет ноду из Pane и готовых параметров. */
export function ParameterNode(props: ParameterNodeProps) {
  const geometry = planProjectedNodeGeometry({id: props.id, parameters: props.parameters ?? [], sockets: props.sockets ?? []}, props.rect?.width,
    props.connectedSocketKeys, props.resolvedSocketSides, {collapsed: props.collapsed})
  const headerHeight = props.collapsed ? geometry.height - 2 * NODE_BORDER_WIDTH : NODE_HEADER_HEIGHT
  return <article
    ref={props.elementRef}
    role={props.embedded ? "group" : "option"}
    tabIndex={props.embedded ? -1 : 0}
    aria-label={props.label}
    aria-selected={props.embedded ? undefined : String(props.selected === true)}
    hidden={props.hidden === true}
    data-node-id={props.embedded ? undefined : props.id}
    data-frame-id={props.embedded ? undefined : props.frameId}
    data-node-kind="parameter"
    data-collapsed={props.collapsed ? "true" : undefined}
    onClick={props.embedded ? undefined : props.onActivate}
    style={css`
      box-sizing: border-box;
      position: ${props.embedded ? "relative" : "absolute"};
      display: flex;
      flex-direction: column;
      left: ${props.embedded ? 0 : props.rect?.x ?? 0}px;
      top: ${props.embedded ? 0 : props.rect?.y ?? 0}px;
      width: ${props.intrinsic || props.rect === undefined ? "auto" : `${props.rect.width}px`};
      height: ${props.collapsed ? `${geometry.height}px` : props.intrinsic || props.rect === undefined ? "auto" : `${props.rect.height}px`};
      min-width: ${NODE_MINIMUM_WIDTH}px;
      min-height: 0;
      z-index: 3;
      overflow: visible;
      --node-header-height: ${headerHeight}px;

      &[hidden] {
        display: none;
      }

      &[data-collapsed="true"] [data-node-body] {
        position: absolute;
        left: 0;
        top: 0;
        height: var(--node-header-height);
        padding: 0;
        gap: 0;
      }

      &[data-collapsed="true"] [data-parameter-field] {
        display: none;
      }

      &[data-collapsed="true"] [data-parameter-label] {
        display: none;
      }

      &[data-collapsed="true"] [data-socket-label] {
        display: none;
      }

      &[data-collapsed="true"] [data-parameter-id][data-socket-count="0"] {
        display: none;
      }

      &[data-collapsed="true"] [data-parameter-id] {
        min-height: 0;
        height: 0;
        flex-grow: 1;
        margin-top: 0;
        padding: 0;
        gap: 0;
        justify-content: space-between;
      }

      &[data-collapsed="true"] [data-socket-id][data-presentation="row"] {
        min-height: 0;
        height: 0;
        flex-grow: 1;
        margin-top: 0;
        padding: 0;
        gap: 0;
        justify-content: space-between;
      }

      ${props.style}
    `}
  >
    <Pane
      active={props.selected}
      style={css`
        position: relative;
        box-sizing: border-box;
        width: ${props.intrinsic ? "auto" : "100%"};
        height: ${props.intrinsic ? "auto" : "100%"};
        padding: 0;
        overflow: visible;
        border-radius: ${props.collapsed ? headerHeight / 2 : 6}px;
        background: #303030;
      `}
    >
      <ParameterNodeContents
        id={props.id}
        frameId={props.frameId}
        label={props.label}
        rect={props.rect}
        intrinsic={props.intrinsic}
        title={props.title}
        category={props.category}
        headerColor={props.headerColor}
        selected={props.selected}
        hidden={props.hidden}
        collapsed={props.collapsed}
        parameters={props.parameters}
        sockets={props.sockets}
        parameterStore={props.parameterStore}
        connectedSocketKeys={props.connectedSocketKeys}
        resolvedSocketSides={props.resolvedSocketSides}
        actions={props.actions}
        onActivate={props.onActivate}
        onCollapseChange={props.onCollapseChange}
        onParameterInput={props.onParameterInput}
        onParameterChange={props.onParameterChange}
        onSocketActivate={props.onSocketActivate}
        headerHeight={headerHeight}
      >
        {props.children}
      </ParameterNodeContents>
    </Pane>
  </article>
}

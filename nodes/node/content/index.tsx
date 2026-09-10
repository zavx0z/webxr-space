/**
Произвольное содержимое вместе с нодой с параметрами.

@packageDocumentation
*/

import {Pane} from "@zavx0z/ui/surfaces/pane"
import {visibilityOnIcon} from "@zavx0z/ui/themes/icons"
import {ParameterNode} from "../parameter/index.tsx"
import {ContentSurface} from "./surface/index.tsx"
import type {NodePreviewImage} from "./image/index.tsx"
import type {NodeChildren, ParameterNodeProps} from "../shared/contracts.ts"
import {planProjectedNodeGeometry} from "../geometry/src/geometry.ts"

export type {NodePreviewImage} from "./image/index.tsx"
/**
Содержимое и параметры одной ноды с независимой видимостью.

@property [children] - Авторское содержимое квадратной области; при наличии имеет приоритет над image.

@property [image] - Предпросмотр, используемый только при отсутствии children.

@property [contentVisible=true] - Скрывает область содержимого без её размонтирования.

@property [onContentVisibleChange] - Получает запрос изменения видимости; состояние меняет вызывающая сторона.
*/
export type ContentNodeProps = Omit<ParameterNodeProps, "children" | "embedded"> & Readonly<{
  children?: NodeChildren
  image?: NodePreviewImage | undefined
  contentVisible?: boolean | undefined
  onContentVisibleChange?: ((visible: boolean, event: Event) => void) | undefined
}>

/** Квадратная область содержимого и ParameterNode образуют одну ноду графа. */
export function ContentNode(props: ContentNodeProps) {
  const visible = props.contentVisible !== false
  const geometry = planProjectedNodeGeometry({id: props.id, parameters: props.parameters ?? [], sockets: props.sockets ?? []}, props.rect?.width,
    props.connectedSocketKeys, props.resolvedSocketSides, {collapsed: props.collapsed, contentVisible: visible})
  const parameterHeight = geometry.height - (visible ? geometry.width : 0)
  const actions = [...(props.actions ?? []), {
    id: "content-toggle",
    label: visible ? "Скрыть содержимое" : "Показать содержимое",
    iconSrc: visibilityOnIcon,
    selected: visible,
    disabled: props.onContentVisibleChange === undefined,
    onClick: (event: Event) => props.onContentVisibleChange?.(!visible, event),
  }]
  return <article
    ref={props.elementRef}
    role="option"
    tabIndex={0}
    aria-label={props.label}
    aria-selected={String(props.selected === true)}
    hidden={props.hidden === true}
    data-node-id={props.id}
    data-frame-id={props.frameId}
    data-node-kind="content"
    data-content-visible={String(visible)}
    data-parameters-collapsed={String(props.collapsed === true)}
    onClick={props.onActivate}
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: flex;
      flex-direction: column;
      left: ${props.rect?.x ?? 0}px;
      top: ${props.rect?.y ?? 0}px;
      width: ${props.intrinsic ? "auto" : `${geometry.width}px`};
      height: ${props.intrinsic ? "auto" : `${geometry.height}px`};
      min-width: 0;
      min-height: 0;
      overflow: visible;
      z-index: 3;

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <div
      hidden={!visible}
      data-node-content=""
      style={css`
        width: 100%;
        height: ${geometry.width}px;
        min-height: ${geometry.width}px;
        flex-shrink: 0;

        &[hidden] {
          display: none;
        }
      `}
    >
      <Pane
        active={props.selected}
        style={css`
          width: 100%;
          height: 100%;
          padding: 0;
          border-radius: 6px 6px 0 0;
        `}
      >
        <ContentSurface
          image={props.image}
          label={`${props.label}: содержимое`}
        >
          {props.children}
        </ContentSurface>
      </Pane>
    </div>
    <ParameterNode
      id={props.id}
      frameId={props.frameId}
      label={props.label}
      title={props.title}
      category={props.category}
      headerColor={props.headerColor}
      selected={props.selected}
      collapsed={props.collapsed}
      parameters={props.parameters}
      sockets={props.sockets}
      parameterStore={props.parameterStore}
      connectedSocketKeys={props.connectedSocketKeys}
      resolvedSocketSides={props.resolvedSocketSides}
      onCollapseChange={props.onCollapseChange}
      onParameterInput={props.onParameterInput}
      onParameterChange={props.onParameterChange}
      onSocketActivate={props.onSocketActivate}
      embedded
      intrinsic={props.intrinsic}
      rect={{x: 0, y: 0, width: geometry.width, height: parameterHeight}}
      actions={actions}
    />
  </article>
}

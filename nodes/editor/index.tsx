/**
Редактор использует общий GraphView и передаёт изменения владельцу модели.

@packageDocumentation
*/
import {useMemo, useState} from "@zavx0z/component"
import {metadataBoolean} from "@nodes/parameters/shared"
import {GraphView} from "../view/index.tsx"
import {useNodeTreePresentation} from "../view/tree.ts"
import {useMeasuredNodeTreePresentation, type MeasuredNodeTreeComputer} from "../shared/node-tree/measured.ts"
import type {NodeTreeProps} from "../shared/node-tree/contracts.ts"
import type {GraphViewProps} from "../shared/graph/contracts.ts"

/**
Композиция существующих инструментов изменения и общего просмотра.

@property store - Заимствованный Store модели; значения не копируются в редактор.
@property layout - Готовый результат, source-bound результат или числовая функция.
@property [measureLayout] - Числовая политика для snapshot и настоящих измерений нод/Socket anchors; выполняется до показа.
@property [onParameterInput] - Передаёт ввод значения приложению.
@property [onParameterChange] - Передаёт подтверждённое значение приложению.
@property [onSocketActivate] - Сообщает об активации сокета; жест создания связи пока отсутствует.
*/
export type GraphEditorProps = Omit<NodeTreeProps, "layout"> & Omit<GraphViewProps, "scene" | "pending" | "isCurrent" | "input" | "layout"> & Readonly<{
  layout?: NodeTreeProps["layout"] | undefined
  measureLayout?: MeasuredNodeTreeComputer | undefined
  gridSize?: number | undefined
}>

export function GraphEditor(props: GraphEditorProps) {
  if (props.layout === undefined && props.measureLayout === undefined) throw new Error("GraphEditor требует layout или measureLayout")
  const [measuring, setMeasuring] = useState(true)
  const [ownedCollapsed, setOwnedCollapsed] = useState<ReadonlySet<string>>(() => new Set(
    props.store.getTopologySnapshot().nodes.filter(node => metadataBoolean(node.metadata, "collapsed", false)).map(node => node.id),
  ))
  const [ownedPreviews, setOwnedPreviews] = useState<ReadonlySet<string>>(() => new Set(
    props.store.getTopologySnapshot().nodes.filter(node => {
      const value = node.metadata
      const preview = value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>).preview : undefined
      const enabled = preview !== null && typeof preview === "object" && !Array.isArray(preview) ? (preview as Readonly<Record<string, unknown>>).enabled : undefined
      return enabled === true || enabled === undefined && props.nodeKinds?.get(node.id) === "content"
    }).map(node => node.id),
  ))
  const collapsed = props.collapsedNodeIds ?? ownedCollapsed
  const previews = props.previewNodeIds ?? ownedPreviews
  const changeCollapse = useMemo(() => (id: string, value: boolean, event: Event) => {
    if (props.collapsedNodeIds === undefined) setOwnedCollapsed(updateSet(collapsed, id, value))
    props.onNodeCollapseChange?.(id, value, event)
  }, [props.collapsedNodeIds, props.onNodeCollapseChange, collapsed])
  const changePreview = useMemo(() => (id: string, value: boolean, event: Event) => {
    if (props.previewNodeIds === undefined) setOwnedPreviews(updateSet(previews, id, value))
    props.onNodePreviewChange?.(id, value, event)
  }, [props.previewNodeIds, props.onNodePreviewChange, previews])
  const modelProps = {
    ...props,
    collapsedNodeIds: collapsed,
    previewNodeIds: previews,
    onNodeCollapseChange: props.measureLayout !== undefined || typeof props.layout === "function" || props.onNodeCollapseChange !== undefined ? changeCollapse : undefined,
    onNodePreviewChange: props.measureLayout !== undefined || typeof props.layout === "function" || props.onNodePreviewChange !== undefined ? changePreview : undefined,
  }
  const measured = useMeasuredNodeTreePresentation(props.measureLayout === undefined ? null : {...modelProps, compute: props.measureLayout})
  const presentation = useNodeTreePresentation(props.measureLayout === undefined ? {...modelProps, layout: props.layout!} : null)
  const layoutState = useMemo(() => (value: Readonly<{pending: boolean; error: Error | null}>) => {
    measured?.layoutState(value)
    setMeasuring(value.pending)
    props.onLayoutStateChange?.(value)
  }, [measured, props.onLayoutStateChange])
  const pending = measured === null ? presentation.pending : measuring
  return <section
    data-graph-editor=""
    data-layout-pending={pending ? "true" : undefined}
    aria-busy={String(pending)}
    aria-label={props.label ?? "Редактор графа"}
    style={css`
      display: block;
      min-width: 0;
      min-height: 0;
    `}
  >
    <GraphView
      scene={measured === null ? presentation.scene : undefined}
      input={measured?.input}
      layout={measured?.layout}
      pending={measured === null ? presentation.pending : false}
      isCurrent={measured?.current ?? presentation.isCurrent}
      onLayoutStateChange={layoutState}
      label={props.label}
      title={props.title ?? "Редактор графа"}
      width={props.width}
      height={props.height}
      navigation={props.navigation ?? "pan-zoom"}
      interactive={props.interactive}
      controls={props.controls}
      gridSize={props.gridSize ?? 24}
      minScale={props.minScale}
      maxScale={props.maxScale}
      fitPadding={props.fitPadding}
      overscan={props.overscan}
      viewport={props.viewport}
      materializeCulled={props.materializeCulled}
      transform={props.transform}
      selection={props.selection}
      onSelectionChange={props.onSelectionChange}
      onTransformChange={props.onTransformChange}
      style={css`
        border: 1px solid #111111;
        border-radius: 6px;
        background: #1d1d1d;
        color: #d8d8d8;

        ${props.style}
      `}
    />
  </section>
}

function updateSet(source: ReadonlySet<string>, id: string, value: boolean): ReadonlySet<string> {
  const next = new Set(source)
  if (value) next.add(id)
  else next.delete(id)
  return next
}

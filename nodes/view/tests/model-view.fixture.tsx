import {GraphView} from "@webxr/nodes/view"
import {useNodeTreePresentation, type NodeTreeProps} from "@webxr/nodes/view/tree"

/** Собирает пример просмотра существующей модели без GraphEditor. */
export function ModelGraphView(props: NodeTreeProps) {
  const presentation = useNodeTreePresentation(props)
  return <GraphView
    scene={presentation.scene}
    pending={presentation.pending}
    isCurrent={presentation.isCurrent}
    label={props.label}
    viewport={props.viewport}
    materializeCulled={props.materializeCulled}
    transform={props.transform}
    selection={props.selection}
    onSelectionChange={props.onSelectionChange}
    style={props.style}
  />
}

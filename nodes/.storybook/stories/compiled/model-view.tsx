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

export const modelGraphViewSource = "import {GraphView} from \"@webxr/nodes/view\"\nimport {useNodeTreePresentation, type NodeTreeProps} from \"@webxr/nodes/view/tree\"\n\n/** Собирает пример просмотра существующей модели без GraphEditor. */\nfunction ModelGraphView(props: NodeTreeProps) {\n  const presentation = useNodeTreePresentation(props)\n  return <GraphView\n    scene={presentation.scene}\n    pending={presentation.pending}\n    isCurrent={presentation.isCurrent}\n    label={props.label}\n    viewport={props.viewport}\n    materializeCulled={props.materializeCulled}\n    transform={props.transform}\n    selection={props.selection}\n    onSelectionChange={props.onSelectionChange}\n    style={props.style}\n  />\n}\n"

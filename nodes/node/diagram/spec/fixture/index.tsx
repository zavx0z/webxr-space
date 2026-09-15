import {DiagramNode, type DiagramNodeProps} from "@nodes/node/diagram"

/** Общая декларация ноды для выполнения сценария и просмотра его вариантов. */
export function DiagramFixture(props: DiagramNodeProps) {
  return <DiagramNode
    id={props.id}
    description={props.description}
    rect={props.rect}
    shape={props.shape}
  />
}

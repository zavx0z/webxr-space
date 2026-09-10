/**
 Описание и форма узла диаграммы.

 @packageDocumentation
 */
import {Pane} from "@zavx0z/ui/surfaces/pane"
import {Typography} from "@zavx0z/ui/typography"
import type {NodeRect} from "../geometry/src/geometry.ts"
import type {NodeShape} from "../shared/contracts.ts"

export type DiagramNodeProps = Readonly<{
  id: string
  description: string
  rect: NodeRect
  shape?: NodeShape | undefined
  selected?: boolean | undefined
  hidden?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
}>

/** Описание заполняет Pane выбранной формы без полей редактора и видимых сокетов. */
export function DiagramNode(props: DiagramNodeProps) {
  const round = props.shape === "oval" || props.shape === "circle"
  return <article
    role="option"
    tabIndex={0}
    aria-label={props.description}
    aria-selected={String(props.selected === true)}
    hidden={props.hidden === true}
    data-node-id={props.id}
    data-node-kind="diagram"
    data-node-shape={props.shape ?? "rectangle"}
    onClick={props.onActivate}
    style={css`
      box-sizing: border-box;
      position: absolute;
      left: ${props.rect.x}px;
      top: ${props.rect.y}px;
      width: ${props.rect.width}px;
      height: ${props.shape === "circle" ? props.rect.width : props.rect.height}px;
      z-index: 3;

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <Pane
      active={props.selected}
      title={props.title}
      style={css`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        border-radius: ${round ? "50%" : "4px"};
      `}
    >
      <Typography
        text={props.description}
        style={css`
          display: block;
          width: 100%;
          text-align: center;
          white-space: normal;
        `}
      />
    </Pane>
  </article>
}

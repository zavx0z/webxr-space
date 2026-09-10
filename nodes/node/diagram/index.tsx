/**
 Описание и форма узла диаграммы.

 @packageDocumentation
 */
import {Pane} from "@zavx0z/ui/surfaces/pane"
import {Typography} from "@zavx0z/ui/typography"
import type {NodeRect} from "../geometry/src/geometry.ts"
import type {NodeShape} from "../shared/contracts.ts"
import type {CallbackRef} from "@zavx0z/template/jsx-runtime"

export type DiagramNodeProps = Readonly<{
  id: string
  description: string
  rect?: NodeRect | undefined
  intrinsic?: boolean | undefined
  elementRef?: CallbackRef<HTMLElement> | undefined
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
    ref={props.elementRef}
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
      display: flex;
      flex-direction: column;
      left: ${props.rect?.x ?? 0}px;
      top: ${props.rect?.y ?? 0}px;
      width: ${props.intrinsic || props.rect === undefined ? "auto" : `${props.rect.width}px`};
      height: ${props.rect === undefined || props.intrinsic && props.shape !== "circle" ? "auto" : `${props.shape === "circle" ? props.rect.width : props.rect.height}px`};
      min-width: ${props.intrinsic && props.shape === "circle" ? "3em" : "0"};
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
        flex: 0 0 auto;
        width: ${props.intrinsic ? "auto" : "100%"};
        height: ${props.intrinsic && props.shape !== "circle" ? "auto" : "100%"};
        border-radius: ${round ? "50%" : "4px"};
        padding-inline: var(--diagram-node-padding-inline, 8px);
        padding-block: var(--diagram-node-padding-block, 8px);
      `}
    >
      <Typography
        text={props.description}
        style={css`
          display: block;
          width: ${props.intrinsic ? "auto" : "100%"};
          text-align: center;
          white-space: normal;
          font-family: var(--diagram-node-font-family, var(--font-family));
          font-size: var(--diagram-node-font-size, var(--font-size-sm));
          line-height: var(--diagram-node-line-height, 16px);
        `}
      />
    </Pane>
  </article>
}

import {type FunctionComponent} from "@zavx0z/component"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeRect} from "./src/projection/geometry.ts"

export type FrameProps = Readonly<{
  id: string
  label: string
  rect: NodeRect
  parentFrameId?: string | undefined
  title?: string | undefined
  color?: string | undefined
  selected?: boolean | undefined
  hidden?: boolean | undefined
  children?: JsxSourceElement | null | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
}>

export function Frame(props: FrameProps) {
  if (props.id.trim().length === 0) throw new TypeError("Frame id must be non-empty")
  if (props.label.trim().length === 0) throw new TypeError(`Frame ${props.id} label must be non-empty`)
  return <section
    role="option"
    tabIndex={0}
    aria-label={props.label}
    aria-selected={String(props.selected === true)}
    data-frame-id={props.id}
    data-parent-frame-id={props.parentFrameId}
    hidden={props.hidden === true}
    title={props.title ?? props.label}
    onClick={props.onActivate}
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: block;
      left: ${props.rect.x}px;
      top: ${props.rect.y}px;
      width: ${props.rect.width}px;
      height: ${props.rect.height}px;
      overflow: visible;
      border: 1px solid ${props.color ?? "#3b3b3b"};
      border-radius: 6px;
      background: rgba(38, 38, 38, .72);
      color: #a8a8a8;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .28);

      &[aria-selected="true"] {
        border-color: #2d6880;
        box-shadow: 0 2px 10px rgba(45, 104, 128, .5);
      }

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <header
      data-frame-label=""
      style={css`
        box-sizing: border-box;
        position: relative;
        z-index: 2;
        display: block;
        width: 100%;
        height: 24px;
        padding: 5px 8px;
        border-bottom: 1px solid ${props.color ?? "#3b3b3b"};
        color: #a8a8a8;
        font-size: 11px;
      `}
    >
      {props.label}
    </header>
    {props.children}
  </section>
}

export type FrameComponent = FunctionComponent<FrameProps>

import {useState} from "@zavx0z/component"
import type {GraphNodeProps, GraphScene} from "@webxr/nodes/view"

/** Состояние принадлежит настоящему компоненту, чтобы обнаруживать remount. */
export function CounterNode(props: GraphNodeProps) {
  if (props.rect === undefined) throw new Error("CounterNode требует готовую геометрию")
  const [count, setCount] = useState(0)
  return <article
    data-node-id={props.id}
    hidden={props.hidden}
    onClick={props.onActivate}
    style={css`
      position: absolute;
      left: ${props.rect.x}px;
      top: ${props.rect.y}px;
      width: ${props.rect.width}px;
      height: ${props.rect.height}px;
    `}
  >
    <button onClick={() => setCount(value => value + 1)}>{count}</button>
  </article>
}

export const scene: GraphScene = Object.freeze({
  bounds: {x: 0, y: 0, width: 120, height: 80},
  frames: [],
  links: [],
  nodes: [{id: "counter", rect: {x: 10, y: 10, width: 100, height: 60}, view: CounterNode, data: null}],
})

/** Элемент имеет intrinsic размер; на него влияют настоящий flex, текст и CSS. */
export function MeasurementNode() {
  return <div
    style={css`
      display: flex;
      align-items: flex-start;
    `}
  >
    <section
    data-measurement-node=""
    style={css`
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      padding: 8px;
      border: 1px solid black;
      visibility: hidden;
    `}
  >
    <span>Измеряемый текст</span>
    </section>
  </div>
}

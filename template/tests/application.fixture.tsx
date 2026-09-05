import {attach, useFrame, useSpace} from "@zavx0z/browser"
import {useDocument, useState} from "@zavx0z/component"
import type {JsxSourceElement} from "../jsx-runtime.ts"

function Container(props: {children?: JsxSourceElement | readonly JsxSourceElement[] | null}) {
  return <div>{props.children}</div>
}

function Counter(props: {label: string}) {
  const document = useDocument()
  const [count, setCount] = useState(0)
  return <button
    data-document-type={document.nodeType}
    onClick={() => setCount(count + 1)}
  >
    {props.label}: {count}
  </button>
}

export function TestApp(props: {label: string}) {
  return <Container>
    <Counter label={props.label} />
    <Counter label="Второй" />
  </Container>
}

export function connect(canvas: HTMLCanvasElement) {
  return attach({canvas, app: <TestApp label="Первый" />})
}

export function BrowserHooks() {
  const size = useSpace(state => state.size)
  useFrame((_state, _delta) => {})
  return <div>{size.width}</div>
}

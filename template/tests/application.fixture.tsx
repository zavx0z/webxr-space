import type {} from "../../space/src/jsx.ts"
import {createRoot, useFrame, useSpace} from "@zavx0z/browser"
import {createRoot as createHostRoot} from "@zavx0z/browser/integration"
import {useDocument, useLayoutEffect, useRef, useState} from "@zavx0z/component"
import type {JsxSourceElement} from "../jsx-runtime.ts"

function Container(props: {children?: JsxSourceElement | readonly JsxSourceElement[] | null}) {
  return <div>{props.children}</div>
}

function Counter(props: {label: string}) {
  const document = useDocument()
  const [count, setCount] = useState(0)
  const button = useRef<HTMLButtonElement | null>(null)
  useLayoutEffect(() => {
    button.current?.setAttribute("data-ref-connected", String(button.current.isConnected))
  }, [])
  return <button
    ref={button}
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
  const root = createRoot(canvas)
  root.render(<TestApp label="Первый" />)
  return root
}

export function BrowserHooks() {
  const size = useSpace(state => state.size)
  useFrame((_state, _delta) => {})
  return <div>{size.width}</div>
}

export function ResourcesApp(props: {href: string; frameloop: "demand" | "always"}) {
  return (
    <>
      <link
        rel="stylesheet"
        href={props.href}
      />
      <xr-space frameloop={props.frameloop}>
        <xr-view-point />
      </xr-space>
    </>
  )
}

export function connectHost(canvas: HTMLCanvasElement) {
  createHostRoot(canvas).render(<TestApp label="Host" />)
}

import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {JsxSourceElement} from "../../jsx-runtime.ts"

export type ChildItem = Readonly<{id: string; label: string}>

export function createChildrenRuntimeRoot() {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return Object.freeze({document, host, root: createRoot(host)})
}

export function Child(props: Readonly<{label: string}>) {
  return <p>{props.label}</p>
}

export function Pane(props: Readonly<{children: JsxSourceElement}>) {
  return <section>{props.children}</section>
}

export function OptionalPane(props: Readonly<{children: JsxSourceElement | null}>) {
  return <article>{props.children}</article>
}

export function TextPane(props: Readonly<{children: string | number | null}>) {
  return <span>{props.children}</span>
}

export function Stack(props: Readonly<{children: readonly JsxSourceElement[]}>) {
  return <div>{props.children}</div>
}

export function SingleChildrenApplication(props: Readonly<{label: string}>) {
  return <Pane><Child label={props.label} /></Pane>
}

export function NullableChildrenApplication(
  props: Readonly<{label: string; show: boolean}>,
) {
  return <OptionalPane>{props.show ? <Child label={props.label} /> : null}</OptionalPane>
}

export function TextChildrenApplication(props: Readonly<{label: string | number}>) {
  return <TextPane>{props.label}</TextPane>
}

export function KeyedChildrenApplication(props: Readonly<{items: readonly ChildItem[]}>) {
  return <Stack>{props.items.map(item => <Child key={item.id} label={item.label} />)}</Stack>
}

export function ExplicitKeyedChildrenApplication() {
  return <Stack>
    <Child key="first" label="First" />
    <Child key="second" label="Second" />
  </Stack>
}

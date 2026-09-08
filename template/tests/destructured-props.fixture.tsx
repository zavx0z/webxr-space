import {useEffect, useState} from "@zavx0z/component"
import type {JsxSourceElement} from "../jsx-runtime.ts"

type SlotProps = Readonly<{
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
  style?: CssStyle | undefined
}>

function Slot({children = null, style}: SlotProps) {
  return (
    <section
      data-slot=""
      style={css`
        color: blue;

        ${style}
      `}
    >
      {children}
    </section>
  )
}

function ForwardingSlot({"children": content = null, style: appearance}: SlotProps) {
  return (
    <Slot style={appearance}>
      {content}
    </Slot>
  )
}

function SingleSlot({children: content}: Readonly<{children: JsxSourceElement}>) {
  return <article>{content}</article>
}

function OptionalSlot({children: content = null}: Readonly<{
  children?: JsxSourceElement | null | undefined
}>) {
  return <aside>{content}</aside>
}

function PrimitiveSlot({children = "default"}: Readonly<{children?: string}>) {
  return <p>{children}</p>
}

function Caption({value}: Readonly<{value: string}>) {
  return <span>{value}</span>
}

function Counter({id, label, onDispose}: Readonly<{
  id: string
  label: string
  onDispose(id: string): void
}>) {
  const [count, setCount] = useState(0)
  useEffect(() => () => onDispose(id), [])
  return (
    <button
      data-counter={id}
      onClick={() => setCount(value => value + 1)}
    >
      {label}:{count}
    </button>
  )
}

export function DestructuredPropsDemo(props: Readonly<{
  rows: readonly Readonly<{id: string; label: string}>[]
  caption: string
  padding: number
  show: boolean
  onDispose(id: string): void
}>) {
  return (
    <main>
      <ForwardingSlot
        style={css`
          padding: ${props.padding}px;
          color: red;
        `}
      >
        {props.rows.map(row => (
          <Counter
            key={row.id}
            id={row.id}
            label={row.label}
            onDispose={props.onDispose}
          />
        ))}
      </ForwardingSlot>
      <Slot />
      <SingleSlot>
        <Caption value={props.caption} />
      </SingleSlot>
      <OptionalSlot>
        {props.show ? (
          <Counter
            id="optional"
            label="Optional"
            onDispose={props.onDispose}
          />
        ) : null}
      </OptionalSlot>
      <PrimitiveSlot />
      <PrimitiveSlot>{props.caption}</PrimitiveSlot>
    </main>
  )
}

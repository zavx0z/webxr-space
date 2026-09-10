import {GraphView, type GraphInput, type GraphLayoutComputer} from "@webxr/nodes/view"
import {useEffect, useLayoutEffect, useRef, useState} from "@zavx0z/component"
import {Markdown} from "@webxr/markdown"

export type BrowserGraphControls = Readonly<{
  input: GraphInput
  layout: GraphLayoutComputer
  capture: (element: HTMLElement | null) => void
  mount?: ((element: HTMLElement) => () => void) | undefined
  ready?: Promise<void> | undefined
  markdown?: string | undefined
}>

function GraphContent(props: Readonly<{controls: BrowserGraphControls}>) {
  const [ready, setReady] = useState(props.controls.ready === undefined)
  useEffect(() => {
    let active = true
    props.controls.ready?.then(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [props.controls.ready])
  const ref = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => ref.current === null ? undefined : props.controls.mount?.(ref.current), [props.controls.mount])
  return <div
    ref={element => {
      ref.current = element
      props.controls.capture(element)
    }}
    style={css`
      width: 100%;
      height: 100%;
    `}
  >
    {ready && props.controls.mount === undefined && props.controls.markdown !== undefined ? <Markdown source={props.controls.markdown} /> : null}
    {ready && props.controls.markdown === undefined && props.controls.mount === undefined ? <GraphView
      input={props.controls.input}
      layout={props.controls.layout}
      navigation="scroll"
    /> : null}
  </div>
}

function HudGraph(props: Readonly<{controls: BrowserGraphControls}>) {
  return <hud>
    <GraphContent controls={props.controls} />
  </hud>
}

function DisplayGraph(props: Readonly<{controls: BrowserGraphControls}>) {
  return <display
    width={200}
    height={150}
    style={css`
      width: 700px;
      height: 500px;
    `}
  >
    <GraphContent controls={props.controls} />
  </display>
}

export function BrowserMeasuredGraph(props: Readonly<{controls: BrowserGraphControls; kind: "hud" | "display"}>) {
  return <space frameloop="demand">
    <viewpoint controls={false} />
    {props.kind === "hud" ? <HudGraph controls={props.controls} /> : <DisplayGraph controls={props.controls} />}
  </space>
}

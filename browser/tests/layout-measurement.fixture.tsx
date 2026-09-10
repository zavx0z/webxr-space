import {useLayoutEffect, useRef, useState} from "@zavx0z/component"
import {observeElementLayout, readElementLayoutRect} from "@zavx0z/dom/geometry"

export type MeasurementControls = {
  element: HTMLElement | null
  initial: DOMRectReadOnly | null | undefined
  measurements: number[]
  finish: (() => void) | null
  async: boolean
  cleaned: boolean
}

export function MeasuredContent(props: Readonly<{controls: MeasurementControls}>) {
  const ref = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [accepted, setAccepted] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = ref.current!
    const reference = rootRef.current!
    props.controls.element = element
    props.controls.initial = element.getLayoutRect(reference)
    readElementLayoutRect(element, reference)
    const stop = observeElementLayout(element, rect => {
      if (rect === null) {
        setAccepted(null)
        return
      }
      props.controls.measurements.push(rect.width)
      if (props.controls.async) {
        setAccepted(null)
        props.controls.finish = () => setAccepted(rect.width)
      } else {
        setAccepted(rect.width)
      }
    }, {relativeTo: reference})
    return () => {
      stop()
      props.controls.cleaned = true
    }
  }, [])
  return (
    <div
      ref={rootRef}
      style={css`
        display: flex;
        align-items: flex-start;
        width: 100%;
      `}
    >
      <article
        ref={ref}
        data-measured-content
        data-accepted-width={accepted}
        style={css`
          display: flex;
          flex-direction: column;
          flex: 0 0 auto;
          padding: 3.25px;
          border: 1.125px solid red;
          font-size: var(--test-font-size, 13px);
          line-height: 17.5px;
          background: red;

          ${accepted === null && css`
            visibility: hidden;
          `}
        `}
      >
        <span>Text</span>
      </article>
    </div>
  )
}

function HudMeasurement(props: Readonly<{controls: MeasurementControls}>) {
  return (
    <hud>
      <MeasuredContent controls={props.controls} />
    </hud>
  )
}

function DisplayMeasurement(props: Readonly<{controls: MeasurementControls}>) {
  return (
    <display
      width={200}
      height={150}
      style={css`
        width: 400px;
        height: 300px;
      `}
    >
      <MeasuredContent controls={props.controls} />
    </display>
  )
}

export function MeasurementApp(props: Readonly<{controls: MeasurementControls; kind: "hud" | "display"}>) {
  return (
    <space frameloop="demand">
      <viewpoint controls={false} />
      {props.kind === "hud" ? (
        <HudMeasurement controls={props.controls} />
      ) : (
        <DisplayMeasurement controls={props.controls} />
      )}
    </space>
  )
}

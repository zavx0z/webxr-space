import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerProps} from "@webxr/nodes/markers"

export function FilledMarker(props: MarkerProps) {
  return <Arrow
    context={props.context}
    variant="filled"
  />
}

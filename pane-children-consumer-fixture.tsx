import {Pane} from "./pane.tsx"

function PaneChild(props: Readonly<{label: string}>) {
  return <span data-pane-child="true">{props.label}</span>
}

export function PaneComposition(props: Readonly<{label: string}>) {
  return <Pane><PaneChild label={props.label} /></Pane>
}

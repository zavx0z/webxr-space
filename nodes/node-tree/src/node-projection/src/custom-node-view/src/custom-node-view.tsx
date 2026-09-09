import type {NodeChildren} from "@nodes/node/contracts"

/** Renders the supplied compiled node without another visual wrapper or model. */
export function CustomNodeView(props: Readonly<{children: NodeChildren}>) {
  return <>{props.children}</>
}

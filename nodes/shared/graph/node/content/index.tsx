import type {NodeChildren} from "@nodes/node/contracts"

/** Принимает обычный компонентный children transport без второго DOM-контейнера. */
export function GraphNodeSlot(props: Readonly<{children: NodeChildren}>) {
  return <>{props.children}</>
}

import type {NodeChildren} from "@nodes/node/contracts"

/** Вставляет переданную ноду без дополнительного контейнера или модели. */
export function CustomNodeView(props: Readonly<{children: NodeChildren}>) {
  return <>{props.children}</>
}

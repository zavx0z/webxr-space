import {createRoot} from "@zavx0z/react"

function Invalid({items}: Readonly<{items: readonly string[]}>) {
  return <ul>{items}</ul>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid items={["a", "b"]} />)

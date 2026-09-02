import {createRoot, useState as state} from "@zavx0z/react"

function Valid() {
  const [count] = state(1)
  return <div>{count}</div>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Valid />)

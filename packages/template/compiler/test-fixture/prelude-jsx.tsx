import {createRoot} from "@zavx0z/react"

function Invalid() {
  const icon = <span>Icon</span>
  return <div>{icon}</div>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

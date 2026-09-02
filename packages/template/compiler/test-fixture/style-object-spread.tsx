import {createRoot} from "@zavx0z/react"

const shared = {display: "flex"}

function Invalid() {
  return <button style={{...shared, color: "red"}}>Bad</button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

import {createRoot} from "@zavx0z/react"

const property = "color"

function Invalid() {
  return <button style={{[property]: "red"}}>Bad</button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

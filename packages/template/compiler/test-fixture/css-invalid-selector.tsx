import {createRoot} from "@zavx0z/react"

function Invalid() {
  return <button style={css`
    :root { color: red; }
  `}>Bad</button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

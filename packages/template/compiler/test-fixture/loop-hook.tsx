import {createRoot, useRef} from "@zavx0z/react"

function Invalid() {
  for (let index = 0; index < 1; index += 1) useRef(index)
  return <div />
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

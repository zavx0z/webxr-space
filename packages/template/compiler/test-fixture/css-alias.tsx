import {createRoot} from "@zavx0z/react"
import {css as scopedCss} from "@zavx0z/template"

function Valid() {
  return <button
    style={scopedCss`
      color: red;
    `}>
    Good
  </button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Valid />)

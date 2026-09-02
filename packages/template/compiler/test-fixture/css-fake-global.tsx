import {createRoot} from "@zavx0z/react"

declare const css: (strings: TemplateStringsArray) => string

function Invalid() {
  return <button
    style={css`
      color: red;
    `}>
    Bad
  </button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid />)

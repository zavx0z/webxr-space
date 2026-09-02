import {createRoot} from "@zavx0z/react"

function css(strings: TemplateStringsArray): string {
  return strings.join("")
}

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

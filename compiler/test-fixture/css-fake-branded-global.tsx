import {createRoot} from "@zavx0z/react"

interface FakeCss {
  readonly "@zavx0z/template/css-compiler-intrinsic": true
  (strings: TemplateStringsArray): string
}

declare const css: FakeCss

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

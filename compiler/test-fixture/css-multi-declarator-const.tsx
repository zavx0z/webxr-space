import {createRoot} from "@zavx0z/react"

const sharedCss = css`
  display: block;
`, unrelated = 1

export function FirstMultiDeclaratorCss() {
  return <main style={sharedCss}>First {unrelated}</main>
}

export function SecondMultiDeclaratorCss() {
  return <aside style={sharedCss}>Second</aside>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<FirstMultiDeclaratorCss />)

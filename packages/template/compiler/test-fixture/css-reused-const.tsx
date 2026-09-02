import {createRoot} from "@zavx0z/react"

const sharedCss = css`
  box-sizing: border-box;
`

export function FirstSharedCss() {
  return <header style={sharedCss}>First</header>
}

export function SecondSharedCss() {
  return <footer style={sharedCss}>Second</footer>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<FirstSharedCss />)

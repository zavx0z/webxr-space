import {createRoot} from "@zavx0z/react"

const sharedCss = css`
  display: block;
`
const leakedCss = sharedCss

export function FirstExtraReferenceCss() {
  return <main style={sharedCss}>First</main>
}

export function SecondExtraReferenceCss() {
  return <aside style={sharedCss}>Second</aside>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<FirstExtraReferenceCss />)

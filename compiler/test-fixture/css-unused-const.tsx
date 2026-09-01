import {createRoot} from "@zavx0z/react"

const unusedCss = css`
  display: block;
`

export function UnusedCss() {
  return <main>Unused CSS const</main>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<UnusedCss />)

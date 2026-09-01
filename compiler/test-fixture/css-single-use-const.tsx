import {createRoot} from "@zavx0z/react"

const singleUseCss = css`
  display: block;
`

export function SingleUseCss() {
  return <main style={singleUseCss}>Single use</main>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<SingleUseCss />)

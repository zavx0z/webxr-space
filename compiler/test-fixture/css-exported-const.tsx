import {createRoot} from "@zavx0z/react"

export const publicCss = css`
  box-sizing: border-box;
`

export function PublicCssOwner() {
  return <main style={publicCss}>Public CSS</main>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<PublicCssOwner />)

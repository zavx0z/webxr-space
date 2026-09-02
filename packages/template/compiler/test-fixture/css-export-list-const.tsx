import {createRoot} from "@zavx0z/react"

const listedCss = css`
  display: block;
`
export {listedCss}

export function ListedCssOwner() {
  return <aside style={listedCss}>Listed CSS</aside>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<ListedCssOwner />)

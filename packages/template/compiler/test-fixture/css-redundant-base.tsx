import {createRoot} from "@zavx0z/react"

export function RedundantBase() {
  return <button
    style={css`
      & {
        color: red;
      }
    `}>
    Bad
  </button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<RedundantBase />)

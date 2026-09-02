import {createRoot} from "@zavx0z/react"

function Invalid({enabled}: Readonly<{enabled: boolean}>) {
  if (!enabled) return null
  return <div />
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid enabled />)

import {createRoot, useState} from "@zavx0z/react"

function Invalid({enabled}: Readonly<{enabled: boolean}>) {
  if (enabled) useState(0)
  return <div />
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid enabled />)

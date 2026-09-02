import {createRoot} from "@zavx0z/react"

function Invalid(props: Readonly<{hover: string}>) {
  return <button style={{":hover": {background: props.hover}}}>Bad</button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Invalid hover="red" />)

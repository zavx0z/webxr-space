import {createRoot} from "@zavx0z/react"

function Button({label}: Readonly<{label: string}>) {
  return <button>{label}</button>
}

declare const staging: Parameters<typeof createRoot>[0]

export function createButtonStory() {
  const root = createRoot(staging)
  root.render(<Button label="Factory" />)
  return root
}

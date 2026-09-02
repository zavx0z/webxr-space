import {createRoot} from "@zavx0z/react"

function Generic<Value>({value}: Readonly<{value: Value}>) {
  return <span>{String(value)}</span>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Generic value="bad" />)

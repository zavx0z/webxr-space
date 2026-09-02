import {createRoot} from "@zavx0z/react"

function App() {
  return <div />
}

declare const container: Parameters<typeof createRoot>[0]
const root = createRoot(container)

function unrelated(root: Readonly<{render(value: unknown): void}>) {
  root.render(<App />)
}

root.render(<App />)
export {unrelated}

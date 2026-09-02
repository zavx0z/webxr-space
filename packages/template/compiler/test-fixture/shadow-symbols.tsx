import {createRoot as mount, useState as state} from "@zavx0z/react"

function App() {
  const [count] = state(1)
  return <span>{count}</span>
}

function unrelated(state: () => number, root: Readonly<{render(value: unknown): void}>) {
  state()
  root.render("not JSX")
}

declare const container: Parameters<typeof mount>[0]
const root = mount(container)
root.render(<App />)

export {unrelated}

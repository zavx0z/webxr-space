import {createRoot} from "@zavx0z/react"

function App() {
  return <div />
}

App = function Replacement() {
  return <span />
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<App />)

import {createRoot, useState} from "@zavx0z/react"

export function Counter(props: Readonly<{initial: number}>) {
  const [count, setCount] = useState(props.initial)
  return <button title="Increment" onClick={() => setCount(value => value + 1)}>{count}</button>
}

declare const container: Parameters<typeof createRoot>[0]
const root = createRoot(container)
root.render(<Counter initial={1} />)

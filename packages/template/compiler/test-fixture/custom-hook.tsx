import {createRoot, useState} from "@zavx0z/react"

function useCounter() {
  const [count] = useState(1)
  return count
}

function Valid() {
  const count = useCounter()
  return <div>{count}</div>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Valid />)

import {useState} from "react"

export function Invalid() {
  const [count] = useState(0)
  return <span>{count}</span>
}

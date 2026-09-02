import {memo} from "@zavx0z/react"

function Counter({label}: Readonly<{label: string}>) {
  return <button>{label}</button>
}

export const MemoCounter = memo(Counter)

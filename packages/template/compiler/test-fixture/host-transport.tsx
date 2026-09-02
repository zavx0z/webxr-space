import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"

export function DynamicHostTransport(props: Readonly<{
  indeterminate: boolean
  tabIndex: number
}>) {
  return <input
    indeterminate={props.indeterminate}
    tabIndex={props.tabIndex}
  />
}

export function StaticHostTransport() {
  return <input
    indeterminate={true}
    tabIndex={0}
  />
}

export function createHostTransportRoot() {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return Object.freeze({
    document,
    host,
    root: createRoot(host),
  })
}

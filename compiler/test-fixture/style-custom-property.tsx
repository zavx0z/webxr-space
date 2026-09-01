import {
  createDocument,
  readDocumentCompiledStyleSheets,
} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"

export function HoverButton(props: Readonly<{hoverColor: string}>) {
  return <button
    style={css`
      --hover-color: ${props.hoverColor};

      &:hover {
        background: var(--hover-color);
        color: var(--hover-text, rgb(255 255 255));
      }
    `}>
    Hover
  </button>
}

export function createStyleRuntimeRoot() {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return Object.freeze({
    document,
    host,
    readStyleSheets: () => readDocumentCompiledStyleSheets(document),
    root: createRoot(host),
  })
}

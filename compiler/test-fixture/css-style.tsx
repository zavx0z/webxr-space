import {
  createDocument,
  readDocumentCompiledStyleSheets,
} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"

const focusColor = "rgb(113 168 255)"

export function CssButton(props: Readonly<{
  hoverColor: string
  selected: boolean
  style?: CssStyle
  width: number
}>) {
  return <button
    style={css`
      box-sizing: border-box;
      display: flex;
      height: 22px;

      &:focus {
        border-color: ${focusColor};
      }

      &[data-variant="text"] {
        background: transparent;
      }

      &[data-variant="text"][aria-pressed="true"]:hover {
        color: rgb(255 255 255);
      }

      ${css`
        --hover-color: ${props.hoverColor};
        width: ${props.width}px;

        &:hover {
          background: var(--hover-color);
          color: var(--hover-text, rgb(255 255 255));
        }
      `}

      ${props.selected && css`
        color: rgb(255 255 255);

        &:active {
          background: rgb(71 114 179);
        }
      `}

      ${props.style}
    `}>
    CSS Button
  </button>
}

export function CallerStyledButton() {
  return <CssButton
    hoverColor="rgb(12 34 56)"
    selected={false}
    width={40}
    style={css`
      color: rgb(1 2 3);
    `}
  />
}

export function DynamicCallerStyledButton(props: Readonly<{
  color: string
  hoverColor: string
  selected: boolean
  width: number
}>) {
  return <CssButton
    hoverColor={props.hoverColor}
    selected={props.selected}
    width={props.width}
    style={css`
      color: ${props.color};
    `}
  />
}

export function createCssStyleRuntimeRoot() {
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

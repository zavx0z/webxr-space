import {createRoot} from "@zavx0z/react"

export function Label(props: Readonly<{
  hidden: boolean
  style?: CssStyle
}>) {
  return <span
    style={css`
      display: inline;
      color: rgb(230 230 230);

      ${props.hidden && css`
        display: none;
      `}

      ${props.style}
    `}>
    Label
  </span>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Label hidden={false} />)

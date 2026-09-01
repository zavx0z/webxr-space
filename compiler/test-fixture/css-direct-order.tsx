import {createRoot} from "@zavx0z/react"

export function OrderedCss(props: Readonly<{
  active: boolean
  style?: CssStyle
  width: number
}>) {
  return <main
    style={css`
      display: block;

      &:focus {
        outline-color: rgb(1 1 1);
      }

      color: rgb(4 4 4);

      ${css`
        &:hover {
          color: rgb(2 2 2);
        }

        color: rgb(3 3 3);
      `}

      width: ${props.width}px;

      ${props.active && css`
        opacity: 1;

        &:active {
          color: rgb(5 5 5);
        }

        height: 12px;
      `}

      min-width: 1px;

      ${props.style}
    `}>
    Ordered CSS
  </main>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<OrderedCss active={false} width={40} />)

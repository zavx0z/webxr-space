import {createRoot} from "@zavx0z/react"

const regular = Object.freeze({inner: "rgb(84 84 84)", outline: "rgb(42 42 42)"})
const selected = Object.freeze({inner: "rgb(71 114 179)", text: "rgb(255 255 255)"})

function color(value: string): string {
  return value
}

export function StyledButton(props: Readonly<{
  label: string
  opacity: number
  selected: boolean
  style?: CssStyle
}>) {
  const showLabel = props.label.length > 0
  return <button
    style={css`
      box-sizing: border-box;
      display: flex;
      width: 92px;
      border: 1px solid ${color(regular.outline)};
      background: ${color(regular.inner)};
      opacity: ${props.opacity};

      &:hover {
        background: rgb(101 101 101);
      }

      &:active {
        background: ${color(selected.inner)};
        color: ${color(selected.text)};
      }

      &:focus {
        border-color: rgb(113 168 255);
      }

      &:disabled {
        opacity: 0.5;
      }

      ${props.selected && css`
        background: ${color(selected.inner)};
        color: ${color(selected.text)};
      `}

      ${props.style}
    `}>
    <img
      alt=""
      style={css`
        width: 14px;
        height: 14px;

        ${!props.selected && css`
          display: none;
        `}
      `}
    />
    <span
      style={css`
        display: inline;

        ${!showLabel && css`
          display: none;
        `}
      `}>
      {props.label}
    </span>
    <img
      alt=""
      style={css`
        width: 14px;
        height: 14px;

        ${!props.selected && css`
          display: none;
        `}
      `}
    />
  </button>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<StyledButton label="Output" opacity={1} selected={false} />)

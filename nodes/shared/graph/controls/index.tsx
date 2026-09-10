import {Button} from "@zavx0z/ui/buttons/button"

/** Необязательные кнопки навигации; в просмотре Markdown не монтируются. */
export function GraphControls(props: Readonly<{
  title?: string | undefined
  scale: number
  disabled: boolean
  onFit: (event: Event) => void
}>) {
  return <header
      style={css`
        display: flex;
        align-items: center;
        box-sizing: border-box;
        height: 30px;
        min-height: 30px;
        width: 100%;
        padding: 4px 8px;
        gap: 6px;
        border-bottom: 1px solid #111111;
        background: #242424;
        color: #7edcec;
        font-size: 11px;
      `}
    >
      <strong
        style={css`
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >{props.title ?? "Граф"}</strong>
      <span
        aria-live="polite"
        style={css`
          color: #9c9c9c;
          font-size: 9px;
        `}
      >{Math.round(props.scale * 100)}%</span>
      <Button
        label="Вписать"
        aria-label="Вписать"
        size="small"
        disabled={props.disabled}
        onClick={props.onFit}
      />
    </header>
}

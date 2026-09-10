/** Простые DOM-элементы для проверки Headless без прикладных компонентов. */
export function TextBox(props: Readonly<{text: string}>) {
  return (
    <article
      style={css`
        position: absolute;
        box-sizing: border-box;
        left: 40px;
        top: 40px;
        width: 240px;
        height: 100px;
        padding: 12px;
        border: 1px solid #707070;
        background: #202020;
        color: #ffffff;
        font-size: 16px;
      `}
    >
      {props.text}
    </article>
  )
}

/** Дробные границы проверяют округление области снимка наружу. */
export function InlineText(props: Readonly<{text: string}>) {
  return (
    <span
      style={css`
        position: absolute;
        display: block;
        box-sizing: border-box;
        left: 21.25px;
        top: 11.5px;
        width: 137.5px;
        height: 24.25px;
        background: #202020;
        color: #ffffff;
        font-size: 12px;
      `}
    >
      {props.text}
    </span>
  )
}

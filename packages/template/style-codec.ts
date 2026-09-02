const replacements = Object.freeze([
  "box-sizing:border-box",
  "justify-content:center",
  "align-items:center",
  "white-space:nowrap",
  "object-fit:contain",
  "position:relative",
  "position:absolute",
  "overflow:hidden",
  "overflow:clip",
  "display:inline",
  "display:block",
  "display:flex",
  "display:none",
  "flex-shrink:0",
  "width:100%",
  "height:100%",
  "padding:0",
  "margin:0",
  "border:0",
  "[data-z-",
  "background-color:",
  "transform-origin:",
  "scrollbar-width:",
  "letter-spacing:",
  "flex-direction:",
  "border-bottom-color:",
  "border-right-color:",
  "border-left-color:",
  "border-top-color:",
  "border-bottom-width:",
  "border-right-width:",
  "border-left-width:",
  "border-top-width:",
  "border-bottom:",
  "border-right:",
  "border-left:",
  "border-top:",
  "padding-bottom:",
  "padding-right:",
  "padding-left:",
  "padding-top:",
  "margin-bottom:",
  "margin-right:",
  "margin-left:",
  "margin-top:",
  "overflow-x:",
  "overflow-y:",
  "max-height:",
  "max-width:",
  "flex-basis:",
  "flex-grow:",
  "z-index:",
  "border-radius:",
  "justify-content:",
  "background:",
  "box-sizing:",
  "border-color:",
  "align-items:",
  "text-overflow:",
  "white-space:",
  "flex-shrink:",
  "line-height:",
  "min-height:",
  "min-width:",
  "box-shadow:",
  "font-size:",
  "object-fit:",
  "position:",
  "display:",
  "padding:",
  "overflow:",
  "opacity:",
  "border:",
  "height:",
  "width:",
  "color:",
  "margin:",
  "var(--",
  "gap:",
  ":indeterminate{",
  ":focus-within{",
  ":disabled{",
  ":checked{",
  ":active{",
  ":hover{",
  ":focus{",
  "text-align:",
  "border-width:",
  "border-style:",
  "transform:",
  "currentcolor",
  "transparent",
  "border-box",
  "space-between",
  "flex-start",
  "flex-end",
  "relative",
  "absolute",
  "visible",
  "hidden",
  "contain",
  "nowrap",
  "center",
  "inline",
  "block",
  "solid",
  "clip",
  "auto",
  "none",
  "flex",
  "right:",
  "bottom:",
  "left:",
  "top:",
  "calc(",
  "rgb(",
])

const tokenOffset = 0x100
const escapeToken = String.fromCharCode(0x17f)
const replacementByToken = new Map(
  replacements.map((replacement, index) => [String.fromCharCode(tokenOffset + index), replacement])
)
const reservedTokens = new Set([...replacementByToken.keys(), escapeToken])

/** Encodes one CSS transport string without changing its decoded value. */
export function encodeCompiledStyleText(value: unknown): string {
  let encoded = ""
  for (const character of String(value)) {
    encoded += reservedTokens.has(character) ? `${escapeToken}${character}` : character
  }
  for (let index = 0; index < replacements.length; index += 1) {
    encoded = encoded.split(replacements[index]!).join(String.fromCharCode(tokenOffset + index))
  }
  return encoded
}

/** Decodes the compact compiler transport into exact execution CSS. */
export function decodeCompiledStyleText(value: unknown): string {
  const characters = [...String(value)]
  let decoded = ""
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]!
    if (character === escapeToken) {
      const literal = characters[index + 1]
      if (literal === undefined) throw new TypeError("Compiled style text ends with an escape token")
      decoded += literal
      index += 1
      continue
    }
    decoded += replacementByToken.get(character) ?? character
  }
  return decoded
}

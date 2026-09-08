export function ForeignStyle({appearance: style}: Readonly<{
  appearance: CssStyle
}>) {
  return <section style={style} />
}

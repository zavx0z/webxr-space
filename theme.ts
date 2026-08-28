/**
 * Immutable source-backed UI theme roles used by DOM/CSS components.
 *
 * Widget bytes preserve the previously verified 4.5.5/4.5.12 source contour
 * from the parent UI implementation. Blender 5.2 is the normative target, but
 * these tuples remain compatibility candidates until a bounded 5.2 source and
 * equal-scale visual check is accepted by the owner.
 */
export type Rgba8 = readonly [red: number, green: number, blue: number, alpha: number]

export type WidgetClass =
  | "regular"
  | "text"
  | "number"
  | "numberSlider"
  | "option"
  | "toggle"
  | "tool"
  | "toolbarItem"
  | "tab"
  | "menu"
  | "menuBack"
  | "menuItem"
  | "box"
  | "listItem"
  | "scroll"

export type WidgetState = Readonly<{
  hovered?: boolean
  pressed?: boolean
  selected?: boolean
  activeDefault?: boolean
  disabled?: boolean
  inactive?: boolean
  searchNoMatch?: boolean
}>

export type WidgetColorSet = Readonly<{
  outline: Rgba8
  inner: Rgba8
  innerSelected: Rgba8
  item: Rgba8
  text: Rgba8
  textSelected: Rgba8
  roundness: number
}>

export type ResolvedWidgetColors = Readonly<{
  outline: Rgba8
  inner: Rgba8
  item: Rgba8
  text: Rgba8
  roundness: number
}>

export type UiTheme = Readonly<{
  widgets: Readonly<Record<WidgetClass, WidgetColorSet>>
  state: Readonly<Record<"error" | "warning" | "info" | "success", Rgba8>>
  material: Readonly<{
    widgetEmboss: Rgba8
    menuShadowFactor: number
    menuShadowWidth: number
    editorBorder: Rgba8
    editorOutline: Rgba8
    editorOutlineActive: Rgba8
    checkerPrimary: Rgba8
    checkerSecondary: Rgba8
    checkerSize: number
    widgetTextCursor: Rgba8
  }>
  axes: Readonly<Record<"x" | "y" | "z", Rgba8>>
  spaceNode: Readonly<{
    back: Rgba8
    header: Rgba8
    navigationBar: Rgba8
    executionButtons: Rgba8
    panel: Readonly<{header: Rgba8; back: Rgba8; subBack: Rgba8}>
  }>
  spaceText: Readonly<{back: Rgba8; gutter: Rgba8; lineNumbers: Rgba8; text: Rgba8; selection: Rgba8; cursor: Rgba8}>
  statusBar: Readonly<Record<"back" | "top" | "text" | "textHighlight" | "textShadow", Rgba8>>
}>

const rgba8 = (red: number, green: number, blue: number, alpha = 255): Rgba8 =>
  Object.freeze([red, green, blue, alpha]) as Rgba8

const colorSet = (
  outline: Rgba8,
  inner: Rgba8,
  innerSelected: Rgba8,
  item: Rgba8,
  text: Rgba8,
  textSelected: Rgba8,
  roundness: number,
): WidgetColorSet => Object.freeze({outline, inner, innerSelected, item, text, textSelected, roundness})

const outline = rgba8(0x3d, 0x3d, 0x3d)
const inner = rgba8(0x54, 0x54, 0x54)
const selected = rgba8(0x47, 0x72, 0xb3)
const text = rgba8(0xe6, 0xe6, 0xe6)
const selectedText = rgba8(0xff, 0xff, 0xff)

const widgets = Object.freeze({
  regular: colorSet(outline, inner, selected, rgba8(0x1d, 0x1d, 0x1d, 0x80), text, selectedText, 0.2),
  text: colorSet(outline, rgba8(0x1d, 0x1d, 0x1d), rgba8(0x18, 0x18, 0x18), rgba8(0xff, 0xff, 0xff, 0x33), text, selectedText, 0.2),
  number: colorSet(outline, inner, rgba8(0x22, 0x22, 0x22), selected, text, selectedText, 0.2),
  numberSlider: colorSet(outline, inner, rgba8(0x22, 0x22, 0x22), selected, text, selectedText, 0.2),
  option: colorSet(outline, inner, selected, selectedText, text, selectedText, 0.2),
  toggle: colorSet(outline, inner, selected, rgba8(0x25, 0x25, 0x25), text, selectedText, 0.2),
  tool: colorSet(outline, inner, selected, selectedText, text, selectedText, 0.2),
  toolbarItem: colorSet(outline, rgba8(0x28, 0x28, 0x28), selected, rgba8(0xff, 0xff, 0xff, 0xb3), text, selectedText, 0.2),
  tab: colorSet(rgba8(0x1d, 0x1d, 0x1d), rgba8(0x1d, 0x1d, 0x1d), rgba8(0x30, 0x30, 0x30), rgba8(0x1d, 0x1d, 0x1d), rgba8(0x98, 0x98, 0x98), selectedText, 0.2),
  menu: colorSet(outline, rgba8(0x28, 0x28, 0x28), rgba8(0x47, 0x72, 0xb3, 0xb3), rgba8(0xd9, 0xd9, 0xd9), text, selectedText, 0.2),
  menuBack: colorSet(rgba8(0x24, 0x24, 0x24), rgba8(0x18, 0x18, 0x18), selected, rgba8(0xd9, 0xd9, 0xd9), rgba8(0x99, 0x99, 0x99), selectedText, 0.2),
  menuItem: colorSet(rgba8(0x3d, 0x3d, 0x3d, 0), rgba8(0x18, 0x18, 0x18, 0), selected, rgba8(0xff, 0xff, 0xff, 0x8f), rgba8(0xdd, 0xdd, 0xdd), selectedText, 0.2),
  box: colorSet(outline, rgba8(0x1d, 0x1d, 0x1d, 0x80), inner, rgba8(0x19, 0x19, 0x19), text, selectedText, 0.2),
  listItem: colorSet(rgba8(0x2d, 0x2d, 0x2d), rgba8(0xff, 0xff, 0xff, 0), selected, rgba8(0xff, 0xff, 0xff, 0x33), rgba8(0xcc, 0xcc, 0xcc), selectedText, 0.2),
  scroll: colorSet(outline, rgba8(0x22, 0x22, 0x22, 0), selectedText, inner, text, selectedText, 0.5),
}) satisfies Readonly<Record<WidgetClass, WidgetColorSet>>

export const uiTheme: UiTheme = Object.freeze({
  widgets,
  state: Object.freeze({
    error: rgba8(0x77, 0x11, 0x11),
    warning: rgba8(0xac, 0x87, 0x37),
    info: rgba8(0x28, 0x48, 0x7d),
    success: rgba8(0x18, 0x86, 0x25),
  }),
  material: Object.freeze({
    widgetEmboss: rgba8(0, 0, 0, 0x26),
    menuShadowFactor: 0.4,
    menuShadowWidth: 2,
    editorBorder: rgba8(0x16, 0x16, 0x16),
    editorOutline: rgba8(0xff, 0xff, 0xff, 0x15),
    editorOutlineActive: rgba8(0xff, 0xff, 0xff, 0x2a),
    checkerPrimary: rgba8(0x33, 0x33, 0x33),
    checkerSecondary: rgba8(0x26, 0x26, 0x26),
    checkerSize: 8,
    widgetTextCursor: rgba8(0x71, 0xa8, 0xff),
  }),
  axes: Object.freeze({
    x: rgba8(0xff, 0x33, 0x52),
    y: rgba8(0x8b, 0xdc, 0x00),
    z: rgba8(0x28, 0x90, 0xff),
  }),
  spaceNode: Object.freeze({
    back: rgba8(0x1d, 0x1d, 0x1d, 0),
    header: rgba8(0x1d, 0x1d, 0x1d, 0xb3),
    navigationBar: rgba8(0x1d, 0x1d, 0x1d),
    executionButtons: rgba8(0x30, 0x30, 0x30),
    panel: Object.freeze({
      header: rgba8(0x3d, 0x3d, 0x3d),
      back: rgba8(0x3d, 0x3d, 0x3d),
      subBack: rgba8(0, 0, 0, 0x1f),
    }),
  }),
  spaceText: Object.freeze({
    back: rgba8(0x23, 0x23, 0x23, 0),
    gutter: rgba8(0x1d, 0x1d, 0x1d),
    lineNumbers: rgba8(0x77, 0x77, 0x77),
    text: text,
    selection: rgba8(0x4d, 0x4d, 0x4d, 0xe6),
    cursor: rgba8(0x71, 0xa8, 0xff),
  }),
  statusBar: Object.freeze({
    back: rgba8(0x18, 0x18, 0x18),
    top: rgba8(0x16, 0x16, 0x16),
    text: rgba8(0x87, 0x87, 0x87),
    textHighlight: selectedText,
    textShadow: rgba8(0, 0, 0, 0xbf),
  }),
})

export function rgba8ToColor([red, green, blue, alpha]: Rgba8): string {
  return alpha === 255
    ? `rgb(${red} ${green} ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${trim(alpha / 255)})`
}

export function resolveWidgetColors(kind: WidgetClass, state: WidgetState = {}): ResolvedWidgetColors {
  const source = uiTheme.widgets[kind]
  const alpha = state.disabled ? 0.5 : state.inactive ? 0.75 : state.searchNoMatch ? 0.5 : 1
  let resolvedInner = state.selected || state.pressed || state.activeDefault
    ? source.innerSelected
    : source.inner
  let resolvedText = state.selected || state.pressed || state.activeDefault
    ? source.textSelected
    : source.text
  if (state.hovered && !state.disabled && !state.selected && !state.pressed) {
    resolvedInner = blend(resolvedInner, resolvedText, 0.2)
    resolvedText = source.textSelected
  }
  return Object.freeze({
    outline: withAlpha(source.outline, alpha),
    inner: withAlpha(resolvedInner, alpha),
    item: withAlpha(source.item, alpha),
    text: withAlpha(resolvedText, alpha),
    roundness: source.roundness,
  })
}

export function widgetCssVariables(kind: WidgetClass, state: WidgetState = {}): string {
  const colors = resolveWidgetColors(kind, state)
  return [
    `--ui-widget-outline:${rgba8ToColor(colors.outline)}`,
    `--ui-widget-inner:${rgba8ToColor(colors.inner)}`,
    `--ui-widget-item:${rgba8ToColor(colors.item)}`,
    `--ui-widget-text:${rgba8ToColor(colors.text)}`,
  ].join(";")
}

function withAlpha(color: Rgba8, factor: number): Rgba8 {
  return rgba8(color[0], color[1], color[2], Math.trunc(color[3] * factor))
}

function blend(first: Rgba8, second: Rgba8, factor: number): Rgba8 {
  const inverse = 1 - factor
  return rgba8(
    Math.round(first[0] * inverse + second[0] * factor),
    Math.round(first[1] * inverse + second[1] * factor),
    Math.round(first[2] * inverse + second[2] * factor),
    first[3],
  )
}

function trim(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}

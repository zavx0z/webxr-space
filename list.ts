import {Color, TextMaterial} from "@engine/core"
import {
  li as elementLi,
  ul as elementUl,
  type LiElementProps,
  type LiElementState,
  type UlElementContext,
  type UlElementProps,
} from "@ui/elements/list"
import {drawIconCentered} from "@ui/elements/icon"
import {span} from "@ui/elements/span"
import {
  cssColor,
  textMaterial,
  type CssColor,
  type StyleProps,
} from "@ui/elements/style"
import {rgba8ToColor, resolveWidgetColors, uiTheme} from "@ui/elements/theme-reference"
import {Z, type UiSurface} from "@layout/core/surface"
import {flexColumn, flexRow} from "@layout/core/flex"
import {Divider} from "./divider.ts"

export type ListDense = boolean
export type ListItemAlignItems = "center" | "flex-start"

export type ListItemTextProps = {
  primary?: string | number
  secondary?: string | number
  children?: string | number
  inset?: boolean
  dense?: boolean
  disabled?: boolean
  primaryColor?: CssColor
  secondaryColor?: CssColor
  style?: StyleProps
}

export type ListItemIconProps = {
  iconSrc?: string
  children?: string | number
  disabled?: boolean
  color?: CssColor
  sizePx?: number
  style?: StyleProps
}

export type ListItemProps = {
  key?: string
  primary?: string | number
  secondary?: string | number
  iconSrc?: string
  icon?: string | number
  secondaryAction?: string | number | ((rect: {x: number; y: number; w: number; h: number}) => void)
  selected?: boolean
  disabled?: boolean
  dense?: boolean
  button?: boolean
  divider?: boolean
  disableGutters?: boolean
  inset?: boolean
  alignItems?: ListItemAlignItems
  height?: number
  tooltip?: string
  tooltipDelayMs?: number
  style?: StyleProps
  onClick?: () => void
}

export type ListProps = {
  items?: readonly ListItemProps[]
  children?: (ctx: UlElementContext) => void
  key?: string
  dense?: boolean
  disablePadding?: boolean
  subheader?: string
  itemHeight?: number
  itemGap?: number
  selectedKey?: string
  style?: StyleProps
  onItemClick?: (item: ListItemProps, index: number) => void
}

export type ListSubheaderProps = {
  children?: string | number
  inset?: boolean
  style?: StyleProps
}

export type ListDividerProps = {
  inset?: boolean
  middle?: boolean
  light?: boolean
  style?: StyleProps
}

const LIST_ROW_GUTTER_X = 16
const LIST_ICON_SLOT_W = 42
const LIST_SECONDARY_ACTION_W = 76

type ListItemRenderState = LiElementState

export function List(host: UiSurface, x: number, y: number, width: number, height: number, props: ListProps = {}): void {
  const dense = props.dense === true
  const itemHeight = props.itemHeight ?? (dense ? 44 : 56)
  const itemGap = props.itemGap ?? 0
  const paddingY = props.disablePadding === true ? 0 : 8
  const subheaderH = props.subheader === undefined ? 0 : 34
  const items = props.items ?? []
  const contentHeight = listItemsContentHeight(items, itemHeight, itemGap, paddingY + subheaderH, paddingY)

  const listProps: UlElementProps = {
    dense,
    disablePadding: true,
    itemHeight,
    itemGap,
    scrollContentHeight: Math.max(height, contentHeight),
    style: {
      background: null,
      borderColor: null,
      borderRadius: 0,
      padding: 0,
      ...props.style,
    },
    children: (ctx) => {
      const rowsHeight = listItemsContentHeight(items, itemHeight, itemGap, 0, 0)
      flexColumn({
        x: ctx.contentX,
        y: ctx.contentY,
        w: ctx.viewportWidth,
        h: ctx.contentHeight,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        gap: 0,
        items: [
          props.subheader === undefined ? false : {
            height: subheaderH,
            draw: (slotX, slotY, slotW, slotH) => ListSubheader(host, slotX, slotY, slotW, slotH, {children: props.subheader!}),
          },
          {
            height: rowsHeight,
            draw: (rowsX, rowsY, rowsW, rowsH) => flexColumn({
              x: rowsX,
              y: rowsY,
              w: rowsW,
              h: rowsH,
              gap: itemGap,
              alignItems: "stretch",
              items: items.map((item, index) => ({
                height: item.height ?? itemHeight,
                draw: (rowX, rowY, rowW, rowH) => {
                  if (rowY + rowH < ctx.viewportY || rowY > ctx.viewportY + ctx.viewportHeight) return
                  const selected = item.selected === true || (props.selectedKey !== undefined && item.key === props.selectedKey)
                  const onClick = item.onClick ?? (props.onItemClick === undefined ? undefined : () => props.onItemClick?.(item, index))
                  const itemProps: ListItemProps = {
                    ...item,
                    selected,
                    dense: item.dense ?? dense,
                    height: rowH,
                  }
                  if (onClick !== undefined) itemProps.onClick = onClick
                  if (item.button === true || onClick !== undefined) ListItemButton(host, rowX, rowY, rowW, rowH, itemProps)
                  else ListItem(host, rowX, rowY, rowW, rowH, itemProps)
                },
              })),
            }),
          },
        ],
      })
      props.children?.(ctx)
    },
  }
  if (props.key !== undefined) listProps.key = props.key
  elementUl(host, x, y, width, height, listProps)
}

export function ListItem(host: UiSurface, x: number, y: number, width: number, height: number, props: ListItemProps = {}): void {
  renderListItem(host, x, y, width, height, {...props, button: false})
}

export function ListItemButton(host: UiSurface, x: number, y: number, width: number, height: number, props: ListItemProps = {}): void {
  renderListItem(host, x, y, width, height, {...props, button: true})
}

export function ListItemText(host: UiSurface, x: number, y: number, width: number, height: number, props: ListItemTextProps = {}): void {
  const primary = String(props.primary ?? props.children ?? "")
  const secondary = props.secondary === undefined ? null : String(props.secondary)
  const dense = props.dense === true
  const primaryPx = dense ? 11 : 12
  const secondaryPx = dense ? 9 : 10
  const disabledColors = resolveWidgetColors("listItem", {disabled: true, listItem: true})
  const style = props.style ?? {}
  const primaryColor = props.disabled === true
    ? rgba8ToColor(disabledColors.text)
    : props.primaryColor ?? style.color ?? rgba8ToColor(uiTheme.widgets.listItem.text)
  const secondaryColor = props.disabled === true
    ? rgba8ToColor(disabledColors.text)
    : props.secondaryColor ?? withAlpha(rgba8ToColor(uiTheme.widgets.listItem.text), 0.5)
  flexRow({
    x,
    y,
    w: width,
    h: height,
    gap: 0,
    alignItems: "stretch",
    items: [
      props.inset === true ? {width: LIST_ICON_SLOT_W, height, draw() {}} : false,
      {width: "grow", height, draw: (textX, textY, textW, textH) => drawListItemTextRows(
        host,
        textX,
        textY,
        textW,
        textH,
        primary,
        secondary,
        primaryPx,
        secondaryPx,
        primaryColor,
        secondaryColor,
        props.style,
      )},
    ],
  })
}

export function ListItemIcon(host: UiSurface, x: number, y: number, width: number, height: number, props: ListItemIconProps = {}): void {
  const size = Math.min(props.sizePx ?? 20, Math.max(1, width), Math.max(1, height))
  const cx = x + width / 2
  const cy = y + height / 2
  if (props.iconSrc !== undefined && props.iconSrc.length > 0) {
    drawIconCentered(host, props.iconSrc, cx, cy, size, {
      opacity: 1,
      tint: cssColor(props.disabled === true
        ? rgba8ToColor(resolveWidgetColors("listItem", {disabled: true, listItem: true}).text)
        : props.color ?? rgba8ToColor(uiTheme.widgets.listItem.text)),
      z: Z.TEXT,
    })
    return
  }
  const label = String(props.children ?? "")
  if (label.length === 0) return
  const material = listTextMaterial(host, props.disabled === true
    ? rgba8ToColor(resolveWidgetColors("listItem", {disabled: true, listItem: true}).text)
    : props.color ?? rgba8ToColor(uiTheme.widgets.listItem.text))
  host.drawTextCentered(label, cx, cy, {
    fontPx: Math.min(13, size),
    material,
    maxWidthPx: width,
    z: Z.TEXT,
  })
}

export function ListSubheader(host: UiSurface, x: number, y: number, width: number, height: number, props: ListSubheaderProps = {}): void {
  const inset = props.inset === true ? LIST_ROW_GUTTER_X + LIST_ICON_SLOT_W : LIST_ROW_GUTTER_X
  span(host, x + inset, y, Math.max(1, width - inset - LIST_ROW_GUTTER_X), height, {
    children: props.children ?? "",
    style: {
      color: rgba8ToColor(uiTheme.widgets.listItem.text),
      fontSize: 10,
      textAlign: "left",
      ...props.style,
    },
  })
}

export function ListDivider(host: UiSurface, x: number, y: number, width: number, props: ListDividerProps = {}): void {
  const inset = props.inset === true ? LIST_ROW_GUTTER_X + LIST_ICON_SLOT_W : props.middle === true ? LIST_ROW_GUTTER_X : 0
  Divider(host, x + inset, y, Math.max(1, width - inset - (props.middle === true ? LIST_ROW_GUTTER_X : 0)), {
    light: props.light ?? true,
    ...(props.style === undefined ? {} : {style: props.style}),
  })
}

function renderListItem(host: UiSurface, x: number, y: number, width: number, height: number, props: ListItemProps): void {
  const dense = props.dense === true
  const rowH = props.height ?? height
  const key = props.key ?? `component-list-item:${x}:${y}:${width}:${height}:${String(props.primary ?? "")}`
  const itemProps: LiElementProps = {
    key,
    style: {padding: 0, ...props.style},
    children: (state) => {
      drawListItemContent(host, x, y, width, rowH, props, state, dense)
      if (props.divider === true) ListDivider(host, x, y + rowH - 1, width, {inset: props.iconSrc !== undefined || props.icon !== undefined})
    },
  }
  if (props.tooltip !== undefined) itemProps.tooltip = props.tooltip
  if (props.tooltipDelayMs !== undefined) itemProps.tooltipDelayMs = props.tooltipDelayMs
  if (props.selected !== undefined) itemProps.selected = props.selected
  if (props.disabled !== undefined) itemProps.disabled = props.disabled
  if (props.disabled !== true) {
    if (props.onClick !== undefined) itemProps.onClick = props.onClick
  }
  elementLi(host, x, y, width, rowH, itemProps)
}

function drawListItemContent(
  host: UiSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  props: ListItemProps,
  state: ListItemRenderState,
  dense: boolean,
): void {
  const gutter = props.disableGutters === true ? 0 : LIST_ROW_GUTTER_X
  const rightPad = props.disableGutters === true ? 0 : LIST_ROW_GUTTER_X
  const iconValue = props.icon ?? undefined
  const hasIconSlot = props.iconSrc !== undefined || iconValue !== undefined || props.inset === true
  flexRow({
    x,
    y,
    w: width,
    h: height,
    paddingLeft: gutter,
    paddingRight: rightPad,
    gap: 0,
    alignItems: "stretch",
    items: [
      hasIconSlot ? {width: LIST_ICON_SLOT_W, height, draw: (slotX, slotY, slotW, slotH) => {
        if (props.iconSrc === undefined && iconValue === undefined) return
        const iconProps: ListItemIconProps = {color: rgba8ToColor(state.colors.text)}
        if (props.iconSrc !== undefined) iconProps.iconSrc = props.iconSrc
        if (iconValue !== undefined) iconProps.children = iconValue
        if (props.disabled !== undefined) iconProps.disabled = props.disabled
        ListItemIcon(host, slotX, slotY, slotW, slotH, iconProps)
      }} : false,
      {width: "grow", height, draw: (slotX, slotY, slotW, slotH) => {
        const textProps: ListItemTextProps = {
          dense,
          primaryColor: rgba8ToColor(state.colors.text),
          secondaryColor: withAlpha(rgba8ToColor(state.colors.text), 0.5),
        }
        if (props.primary !== undefined) textProps.primary = props.primary
        if (props.secondary !== undefined) textProps.secondary = props.secondary
        if (props.disabled !== undefined) textProps.disabled = props.disabled
        ListItemText(host, slotX, slotY, slotW, slotH, textProps)
      }},
      props.secondaryAction === undefined ? false : {
        width: LIST_SECONDARY_ACTION_W,
        height,
        draw: (slotX, slotY, slotW, slotH) => {
          const actionRect = {x: slotX, y: slotY, w: slotW, h: slotH}
          if (typeof props.secondaryAction === "function") {
            props.secondaryAction(actionRect)
            return
          }
          const material = listTextMaterial(host, withAlpha(rgba8ToColor(state.colors.text), 0.75))
          host.drawTextCentered(String(props.secondaryAction), slotX + slotW / 2, slotY + slotH / 2, {
            fontPx: dense ? 10 : 11,
            material,
            maxWidthPx: slotW,
            z: Z.TEXT,
          })
        },
      },
    ],
  })
}

function drawListItemTextRows(
  host: UiSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  primary: string,
  secondary: string | null,
  primaryPx: number,
  secondaryPx: number,
  primaryColor: CssColor,
  secondaryColor: CssColor,
  style: StyleProps | undefined,
): void {
  if (secondary === null || secondary.length === 0) {
    span(host, x, y, width, height, {
      children: primary,
      style: {fontSize: primaryPx, color: primaryColor, ...style},
    })
    return
  }
  const totalH = primaryPx + secondaryPx + 8
  flexColumn({
    x,
    y,
    w: width,
    h: height,
    paddingTop: Math.max(0, (height - totalH) / 2),
    gap: 4,
    alignItems: "stretch",
    items: [
      {height: primaryPx + 4, draw: (slotX, slotY, slotW, slotH) => span(host, slotX, slotY, slotW, slotH, {
        children: primary,
        style: {fontSize: primaryPx, color: primaryColor, ...style},
      })},
      {height: secondaryPx + 4, draw: (slotX, slotY, slotW, slotH) => span(host, slotX, slotY, slotW, slotH, {
        children: secondary,
        style: {fontSize: secondaryPx, color: secondaryColor},
      })},
    ],
  })
}

function listTextMaterial(host: UiSurface, color: CssColor): TextMaterial {
  return textMaterial(host, color)
}

function withAlpha(color: Color, alpha: number): Color {
  return new Color(color.r, color.g, color.b, alpha)
}

function listItemsContentHeight(items: readonly ListItemProps[], itemHeight: number, itemGap: number, paddingTop: number, paddingBottom: number): number {
  if (items.length === 0) return paddingTop + paddingBottom
  let total = paddingTop + paddingBottom + itemGap * Math.max(0, items.length - 1)
  for (const item of items) total += item.height ?? itemHeight
  return total
}

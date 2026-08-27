import {Color} from "@engine/core"
import {control} from "@ui/elements/control"
import {div} from "@ui/elements/div"
import {uiIcons} from "@ui/elements/icons"
import {uiShapeMetrics} from "@ui/elements/shape"
import {
  backgroundColor,
  cssColor,
  px,
  textMaterial,
  type StyleProps,
  type StyleStateTable,
} from "@ui/elements/style"
import {palette} from "@ui/elements/theme"
import {rgba8ToColor, resolveWidgetColors} from "@ui/elements/theme-reference"
import {Z, type UiSurface} from "@layout/core/surface"
import {flexColumn, flexRow} from "@layout/core/flex"
import {IconButton, type IconButtonProps} from "./button.ts"

export type SliderControlLayout = "header" | "track" | "inline"

export type SliderControlTone = "text" | "muted" | "cyan"
export type SliderControlTrackTone = "cyan" | "warm"

export type SliderControlProps = {
  key: string
  label: string
  value: number
  min?: number
  max: number
  step: number
  format?: (value: number) => string
  downLabel?: string
  upLabel?: string
  hintLabel?: string
  rangeStartLabel?: string
  rangeEndLabel?: string
  layout?: SliderControlLayout
  labelTone?: SliderControlTone
  valueTone?: SliderControlTone
  trackTone?: SliderControlTrackTone
  labelFontPx?: number
  valueFontPx?: number
  buttonWidth?: number
  buttonHeight?: number
  zBase?: number
  textZ?: number
  style?: StyleProps
  stateStyles?: StyleStateTable<"idle" | "hover" | "active" | "disabled">
  labelStyle?: StyleProps
  valueStyle?: StyleProps
  trackStyle?: StyleProps
  actionsStyle?: StyleProps
  onChange(value: number): void
}

export function SliderControl(host: UiSurface, x: number, y: number, w: number, props: SliderControlProps): number {
  const layout = props.layout ?? "header"
  div(host, x, y, w, sliderControlHeight(props, layout), {
    style: {background: null, borderColor: null, borderRadius: 4, padding: 0, ...props.style},
  })
  if (layout === "inline") return drawInlineLayout(host, x, y, w, props)
  if (layout === "track") return drawTrackLayout(host, x, y, w, props)
  return drawHeaderLayout(host, x, y, w, props)
}

function drawInlineLayout(host: UiSurface, x: number, y: number, w: number, props: SliderControlProps): number {
  const bounds = sliderBounds(props)
  const value = normalizedSliderValue(props.value, bounds.min, bounds.max)
  const ratio = sliderRatio(value, bounds.min, bounds.max)
  const height = props.buttonHeight ?? uiShapeMetrics.controlHeight
  const zBase = props.zBase ?? Z.ELEMENT
  const textZ = props.textZ ?? Z.TEXT
  const key = `${props.key}:inline`
  const hit = host.hitState(x, y, w, height, key)
  const colors = resolveWidgetColors("numberSlider", {hovered: hit.hovered, pressed: hit.pressed})
  const state = hit.pressed ? "active" : hit.hovered ? "hover" : "idle"
  const rootStyle: StyleProps = {
    background: rgba8ToColor(colors.inner),
    borderColor: rgba8ToColor(colors.outline),
    color: rgba8ToColor(colors.text),
    zIndex: zBase,
    ...props.style,
    ...props.stateStyles?.[state],
  }
  control(host, x, y, w, height, {style: rootStyle})
  const trackStyle: StyleProps = {
    background: rgba8ToColor(colors.item),
    borderRadius: 3,
    zIndex: zBase + 0.01,
    ...props.trackStyle,
  }
  const inset = uiShapeMetrics.borderWidth
  host.drawRoundedRect(x + inset, y + inset, Math.max(0, (w - inset * 2) * ratio), Math.max(1, height - inset * 2), {
    radius: Math.max(0, px(trackStyle.borderRadius, 4) - inset),
    fill: backgroundColor(trackStyle),
    border: null,
    z: trackStyle.zIndex ?? zBase + 0.01,
  })
  flexRow({
    x,
    y,
    w,
    h: height,
    paddingX: uiShapeMetrics.tightGap * 2,
    gap: uiShapeMetrics.tightGap * 2,
    alignItems: "center",
    items: [
      {width: "grow", height, draw: (slotX, slotY, slotW) => {
        const style: StyleProps = {
          color: props.labelTone === undefined ? rgba8ToColor(colors.text) : toneColor(props.labelTone),
          fontSize: props.labelFontPx ?? uiShapeMetrics.compactFontPx,
          zIndex: textZ,
          ...props.labelStyle,
        }
        const fontPx = px(style.fontSize, uiShapeMetrics.compactFontPx)
        return host.drawText(props.label, slotX, slotY + (height - fontPx) / 2, {
        fontPx,
        material: textMaterial(host, style.color),
        maxWidthPx: slotW,
        z: style.zIndex ?? textZ,
      })}},
      {width: Math.max(40, height * 2.4), height, draw: (slotX, slotY, slotW) => {
        const style: StyleProps = {
          color: props.valueTone === undefined ? rgba8ToColor(colors.text) : toneColor(props.valueTone),
          fontSize: props.valueFontPx ?? uiShapeMetrics.compactFontPx,
          zIndex: textZ,
          ...props.valueStyle,
        }
        const fontPx = px(style.fontSize, uiShapeMetrics.compactFontPx)
        return host.drawText(formatSliderValue(props, value), slotX, slotY + (height - fontPx) / 2, {
        fontPx,
        material: textMaterial(host, style.color),
        maxWidthPx: slotW,
        z: style.zIndex ?? textZ,
      })}},
    ],
  })
  const setFromPointer = (localX: number): void => setSliderValue(host, props, bounds.min + ((localX - x) / Math.max(1, w)) * bounds.range, bounds.min, bounds.max)
  host.hit(x, y, w, height, () => undefined, {
    key,
    cursor: "pointer",
    onPointerDown: (localX) => setFromPointer(localX),
    onPointerMove: (localX) => setFromPointer(localX),
  })
  return y + height
}

function drawHeaderLayout(host: UiSurface, x: number, y: number, w: number, props: SliderControlProps): number {
  const bounds = sliderBounds(props)
  const value = normalizedSliderValue(props.value, bounds.min, bounds.max)
  const ratio = sliderRatio(value, bounds.min, bounds.max)
  const zBase = props.zBase ?? Z.ELEMENT
  const textZ = props.textZ ?? Z.TEXT
  const buttonW = props.buttonWidth ?? 24
  const buttonH = props.buttonHeight ?? 22
  flexColumn({
    x,
    y,
    w,
    h: 46,
    gap: 6,
    items: [
      {height: 22, draw: (rowX, rowY, rowW, rowH) => flexRow({
        x: rowX,
        y: rowY,
        w: rowW,
        h: rowH,
        gap: 4,
        alignItems: "center",
        items: [
          {width: "grow", height: rowH, draw: (slotX, slotY, slotW) => {
            const style = sliderTextStyle(props, "label", props.labelFontPx ?? 10, props.labelTone ?? "text", textZ)
            return host.drawText(props.label, slotX, slotY + 3, {
            fontPx: px(style.fontSize, 10),
            material: textMaterial(host, style.color),
            maxWidthPx: Math.max(1, slotW),
            z: style.zIndex ?? textZ,
          })}},
          {width: 52, height: rowH, draw: (slotX, slotY, slotW) => {
            const style = sliderTextStyle(props, "value", props.valueFontPx ?? 10, props.valueTone ?? "muted", textZ)
            return host.drawText(formatSliderValue(props, value), slotX, slotY + 3, {
            fontPx: px(style.fontSize, 10),
            material: textMaterial(host, style.color),
            maxWidthPx: slotW,
            z: style.zIndex ?? textZ,
          })}},
          {width: buttonW, height: buttonH, draw: (slotX, slotY, slotW, slotH) => drawSliderIconButton(host, slotX, slotY, slotW, slotH, props, props.downLabel ?? `${props.label}: меньше`, uiIcons.minus, value - props.step, bounds.min, bounds.max, zBase + 0.04)},
          {width: buttonW, height: buttonH, draw: (slotX, slotY, slotW, slotH) => drawSliderIconButton(host, slotX, slotY, slotW, slotH, props, props.upLabel ?? `${props.label}: больше`, uiIcons.plus, value + props.step, bounds.min, bounds.max, zBase + 0.04)},
        ],
      })},
      {height: 18, draw: (trackX, trackY, trackW, trackH) => drawInteractiveTrack(host, trackX, trackY, trackW, trackH, ratio, props, bounds, zBase)},
    ],
  })
  return y + 46
}

function drawTrackLayout(host: UiSurface, x: number, y: number, w: number, props: SliderControlProps): number {
  const bounds = sliderBounds(props)
  const value = normalizedSliderValue(props.value, bounds.min, bounds.max)
  const ratio = sliderRatio(value, bounds.min, bounds.max)
  const zBase = props.zBase ?? 0.16
  const textZ = props.textZ ?? 0.46
  const buttonW = props.buttonWidth ?? 28
  const buttonH = props.buttonHeight ?? 22
  const hasHint = props.hintLabel !== undefined
  const hasRange = props.rangeStartLabel !== undefined || props.rangeEndLabel !== undefined
  const totalHeight = 14 + (hasHint ? 14 : 0) + 4 + 22 + (hasRange ? 17 : 0)
  flexColumn({
    x,
    y,
    w,
    h: totalHeight,
    gap: 0,
    items: [
      {height: 14, draw: (rowX, rowY, rowW, rowH) => flexRow({
        x: rowX,
        y: rowY,
        w: rowW,
        h: rowH,
        gap: 6,
        items: [
          {width: "grow", height: rowH, draw: (slotX, slotY, slotW) => {
            const style = sliderTextStyle(props, "label", props.labelFontPx ?? 9, props.labelTone ?? "muted", textZ)
            return host.drawText(props.label, slotX, slotY, {
            fontPx: px(style.fontSize, 9),
            material: textMaterial(host, style.color),
            maxWidthPx: Math.max(1, slotW),
            z: style.zIndex ?? textZ,
          })}},
          {width: 45, height: rowH, draw: (slotX, slotY, slotW) => {
            const style = sliderTextStyle(props, "value", props.valueFontPx ?? 9, props.valueTone ?? "text", textZ)
            return host.drawText(formatSliderValue(props, value), slotX, slotY, {
            fontPx: px(style.fontSize, 9),
            material: textMaterial(host, style.color),
            maxWidthPx: slotW,
            z: style.zIndex ?? textZ,
          })}},
        ],
      })},
      hasHint && {height: 14, draw: (slotX, slotY, slotW) => {
        const style = sliderTextStyle(props, "label", 8, "muted", textZ)
        return host.drawText(props.hintLabel!, slotX, slotY, {
        fontPx: px(style.fontSize, 8),
        material: textMaterial(host, style.color),
        maxWidthPx: slotW,
        z: style.zIndex ?? textZ,
      })}},
      {height: 4, draw: () => {}},
      {height: 22, draw: (rowX, rowY, rowW, rowH) => flexRow({
        x: rowX,
        y: rowY,
        w: rowW,
        h: rowH,
        gap: 10,
        alignItems: "center",
        items: [
          {width: buttonW, height: buttonH, draw: (slotX, slotY, slotW, slotH) => drawSliderIconButton(host, slotX, slotY, slotW, slotH, props, props.downLabel ?? `${props.label}: меньше`, uiIcons.minus, value - props.step, bounds.min, bounds.max, zBase + 0.04)},
          {width: "grow", height: rowH, draw: (trackX, trackY, trackW, trackH) => drawInteractiveTrack(host, trackX, trackY, trackW, trackH, ratio, props, bounds, zBase, true)},
          {width: buttonW, height: buttonH, draw: (slotX, slotY, slotW, slotH) => drawSliderIconButton(host, slotX, slotY, slotW, slotH, props, props.upLabel ?? `${props.label}: больше`, uiIcons.plus, value + props.step, bounds.min, bounds.max, zBase + 0.04)},
        ],
      })},
      hasRange && {height: 17, draw: (rowX, rowY, rowW, rowH) => flexRow({
        x: rowX,
        y: rowY,
        w: rowW,
        h: rowH,
        gap: 8,
        items: [
          {width: "grow", height: rowH, draw: (slotX, slotY, slotW) => drawRangeLabel(host, props, props.rangeStartLabel, slotX, slotY, slotW, textZ)},
          {width: "grow", height: rowH, draw: (slotX, slotY, slotW) => drawRangeLabel(host, props, props.rangeEndLabel, slotX, slotY, slotW, textZ)},
        ],
      })},
    ],
  })
  return y + totalHeight
}

function drawInteractiveTrack(
  host: UiSurface,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  props: SliderControlProps,
  bounds: {min: number; max: number; range: number},
  zBase: number,
  ticks = false,
): void {
  const raw = resolveWidgetColors("numberSlider")
  const active = props.trackTone === "warm" ? palette.orange : props.trackTone === "cyan" ? palette.cyan : rgba8ToColor(raw.item)
  const knob = props.trackTone === "warm" ? new Color(1, 0.36, 0.68, 1) : props.trackTone === "cyan" ? palette.cyan : rgba8ToColor(raw.text)
  const track = props.trackTone === undefined ? rgba8ToColor(raw.inner) : fade(palette.borderDim, 0.44)
  const style: StyleProps = {
    background: track,
    borderColor: fade(active, 0.64),
    borderRadius: 3,
    color: knob,
    height: 5,
    zIndex: zBase,
    ...props.trackStyle,
  }
  const trackHeight = px(style.height, 5)
  const trackY = y + (h - trackHeight) / 2
  drawTrack(host, x, trackY, w, ratio, style)
  if (ticks) for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
    host.drawRect(x + w * tick, trackY + trackHeight + 3, 1, 3, fade(palette.borderDim, 0.68), (style.zIndex ?? zBase) + 0.02)
  }
  const setFromPointer = (localX: number): void => setSliderValue(host, props, bounds.min + ((localX - x) / Math.max(1, w)) * bounds.range, bounds.min, bounds.max)
  host.hit(x - 4, y, w + 8, h, () => undefined, {
    key: `${props.key}:track`,
    cursor: "pointer",
    onPointerDown: (localX) => setFromPointer(localX),
    onPointerMove: (localX) => setFromPointer(localX),
  })
}

function drawSliderIconButton(
  host: UiSurface,
  x: number,
  y: number,
  w: number,
  h: number,
  props: SliderControlProps,
  label: string,
  iconSrc: string,
  value: number,
  min: number,
  max: number,
  zIndex: number,
): void {
  const buttonProps: IconButtonProps = {
    label,
    iconSrc,
    variant: "text",
    action: () => setSliderValue(host, props, value, min, max),
  }
  buttonProps.style = {zIndex, ...props.actionsStyle}
  IconButton(host, x, y, w, h, buttonProps)
}

function drawTrack(host: UiSurface, x: number, y: number, w: number, ratio: number, style: StyleProps): void {
  const height = px(style.height, 5)
  const radius = px(style.borderRadius, 3)
  const zBase = style.zIndex ?? Z.ELEMENT
  const track = backgroundColor(style)
  const active = style.borderColor === undefined || style.borderColor === null ? null : cssColor(style.borderColor)
  const knob = style.color === undefined ? palette.text : cssColor(style.color)
  host.drawRoundedRect(x, y, w, height, {radius, fill: track, border: null, z: zBase})
  host.drawRoundedRect(x, y, Math.max(radius, w * ratio), height, {radius, fill: active, border: null, z: zBase + 0.02})
  const knobX = x + w * ratio
  host.drawRoundedRect(knobX - 5, y + height / 2 - 6.5, 10, 13, {
    radius: 5,
    fill: fade(knob, 0.86),
    border: fade(palette.borderBright, 0.9),
    borderWidth: 1,
    z: zBase + 0.04,
  })
}

function sliderBounds(props: SliderControlProps): {min: number; max: number; range: number} {
  const rawMin = props.min ?? 0
  const min = Math.min(rawMin, props.max)
  const max = Math.max(rawMin, props.max)
  return {min, max, range: sliderRange(min, max)}
}

function normalizedSliderValue(value: number, min: number, max: number): number {
  return clampNumber(Number.isFinite(value) ? value : min, min, max)
}

function sliderRatio(value: number, min: number, max: number): number {
  return clampNumber((value - min) / sliderRange(min, max), 0, 1)
}

function sliderRange(min: number, max: number): number {
  return Math.max(0.000001, max - min)
}

function setSliderValue(host: UiSurface, props: SliderControlProps, value: number, min: number, max: number): void {
  props.onChange(clampNumber(value, min, max))
  host.requestRender()
}

function formatSliderValue(props: SliderControlProps, value: number): string {
  if (props.format !== undefined) return props.format(value)
  return String(Math.round(value))
}

function materialForTone(host: UiSurface, tone: SliderControlTone) {
  if (tone === "cyan") return host.materials.cyan
  if (tone === "muted") return host.materials.muted
  return host.materials.text
}

function sliderTextStyle(
  props: SliderControlProps,
  part: "label" | "value",
  fontSize: number,
  tone: SliderControlTone,
  zIndex: number,
): StyleProps {
  return {
    color: toneColor(tone),
    fontSize,
    zIndex,
    ...(part === "label" ? props.labelStyle : props.valueStyle),
  }
}

function drawRangeLabel(
  host: UiSurface,
  props: SliderControlProps,
  label: string | undefined,
  x: number,
  y: number,
  width: number,
  zIndex: number,
): number | undefined {
  if (label === undefined) return undefined
  const style = sliderTextStyle(props, "value", 8, "muted", zIndex)
  return host.drawText(label, x, y, {
    fontPx: px(style.fontSize, 8),
    material: textMaterial(host, style.color),
    maxWidthPx: width,
    z: style.zIndex ?? zIndex,
  })
}

function toneColor(tone: SliderControlTone) {
  if (tone === "cyan") return palette.cyan
  if (tone === "muted") return palette.muted
  return palette.text
}

function sliderControlHeight(props: SliderControlProps, layout: SliderControlLayout): number {
  if (layout === "inline") return props.buttonHeight ?? uiShapeMetrics.controlHeight
  if (layout === "header") return 46
  const hasHint = props.hintLabel !== undefined
  const hasRange = props.rangeStartLabel !== undefined || props.rangeEndLabel !== undefined
  return 14 + (hasHint ? 14 : 0) + 4 + 22 + (hasRange ? 17 : 0)
}

function fade(color: Color, opacity: number): Color {
  return new Color(color.r, color.g, color.b, Math.max(0, Math.min(1, color.a * opacity)))
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

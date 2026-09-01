export type ColorChannel = "r" | "g" | "b" | "a"
export type ColorValue = Readonly<Record<ColorChannel, number>>
export type ColorHsva = Readonly<{h: number; s: number; v: number; a: number}>

export function normalizeColorValue(value: Partial<ColorValue>): ColorValue {
  return Object.freeze({
    r: clampUnit(value.r ?? 0),
    g: clampUnit(value.g ?? 0),
    b: clampUnit(value.b ?? 0),
    a: clampUnit(value.a ?? 1)
  })
}

export function formatColorValue(value: Partial<ColorValue>, includeAlpha = true): string {
  const color = normalizeColorValue(value)
  const channel = (entry: number): string => Math.round(entry * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${includeAlpha ? channel(color.a) : ""}`
}

export function parseColorValue(value: string): ColorValue | null {
  const hex = value.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(hex)) return null
  const channel = (offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return normalizeColorValue({
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: hex.length === 8 ? channel(6) : 1
  })
}

export function colorValueToHsva(value: Partial<ColorValue>): ColorHsva {
  const color = normalizeColorValue(value)
  const maximum = Math.max(color.r, color.g, color.b)
  const minimum = Math.min(color.r, color.g, color.b)
  const delta = maximum - minimum
  let hue = 0
  if (delta > 0) {
    if (maximum === color.r) hue = ((color.g - color.b) / delta) % 6
    else if (maximum === color.g) hue = (color.b - color.r) / delta + 2
    else hue = (color.r - color.g) / delta + 4
    hue /= 6
  }
  return Object.freeze({
    h: wrapUnit(hue),
    s: maximum <= 0 ? 0 : delta / maximum,
    v: maximum,
    a: color.a
  })
}

export function colorHsvaToValue(value: Partial<ColorHsva>): ColorValue {
  const hue = wrapUnit(value.h ?? 0) * 6
  const saturation = clampUnit(value.s ?? 0)
  const brightness = clampUnit(value.v ?? 0)
  const chroma = brightness * saturation
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1))
  const match = brightness - chroma
  const sector = Math.floor(hue) % 6
  const rgb = sector === 0 ? [chroma, secondary, 0]
    : sector === 1 ? [secondary, chroma, 0]
      : sector === 2 ? [0, chroma, secondary]
        : sector === 3 ? [0, secondary, chroma]
          : sector === 4 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return normalizeColorValue({
    r: rgb[0]! + match,
    g: rgb[1]! + match,
    b: rgb[2]! + match,
    a: value.a ?? 1
  })
}

export function colorChannelDisplayValue(channel: "h" | "s" | "v" | "a", value: ColorHsva): number {
  return channel === "h"
    ? Math.round(value.h * 360)
    : Math.round(value[channel] * 1_000_000) / 1_000_000
}

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function wrapUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return ((value % 1) + 1) % 1
}

export function rgbaCss(value: ColorValue): string {
  const byte = (entry: number): number => Math.round(entry * 255)
  return `rgba(${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 1000) / 1000})`
}

import type {DisplayStyle} from "./display-style.ts"

export const CSS_PIXELS_PER_INCH = 96
export const MM_PER_PX = 25.4 / CSS_PIXELS_PER_INCH
export const ABSOLUTE_LENGTH_FACTORS: Readonly<Record<string, number>> = Object.freeze({
  px: 1, mm: 96 / 25.4, cm: 96 / 2.54, q: 96 / 101.6, in: 96, pt: 96 / 72, pc: 16,
})

const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?"
const dimension = new RegExp(`^(${number})([a-z%]*)$`, "i")

function length(value: string, extent: number, allowPercent = true): number {
  const match = dimension.exec(value)
  if (!match) throw new TypeError(`Invalid spatial CSS length: ${value}`)
  const numeric = Number(match[1])
  const unit = match[2]!.toLowerCase()
  const factor = unit === "%" && allowPercent ? extent / 100 : unit === "" && numeric === 0 ? 1 : ABSOLUTE_LENGTH_FACTORS[unit]
  const result = numeric * (factor ?? NaN)
  if (!Number.isFinite(result)) throw new TypeError(`Invalid spatial CSS length: ${value}`)
  return result
}

function angle(value: string): number {
  const match = dimension.exec(value)
  const factors: Record<string, number> = {deg: Math.PI / 180, rad: 1, grad: Math.PI / 200, turn: 2 * Math.PI}
  const numeric = Number(match?.[1])
  const factor = match?.[2] === "" && numeric === 0 ? 1 : factors[match?.[2]?.toLowerCase() ?? ""]
  const result = numeric * (factor ?? NaN)
  if (!Number.isFinite(result)) throw new TypeError(`Invalid spatial CSS angle: ${value}`)
  return result
}

/**
CSS-разрешение и физические размеры дают независимую плотность по осям.
Пространственные CSS-длины сохраняют канонический перевод 96 px на дюйм;
проценты отсчитываются от физической поверхности, независимо от её разрешения.

@param width - Положительная безопасная целая ширина матрицы в CSS px.
@param height - Положительная безопасная целая высота матрицы в CSS px.
@param physicalWidth - Конечная положительная ширина поверхности в миллиметрах.
@param physicalHeight - Конечная положительная высота поверхности в миллиметрах.
@throws RangeError Если размеры или вычисленная плотность недопустимы.
@throws TypeError Если пространственный CSS не поддерживается или некорректен.
*/
export function displaySurfaceStyle(
  width: number,
  height: number,
  physicalWidth: number,
  physicalHeight: number,
  read: (name: string) => string | undefined,
): DisplayStyle {
  if (!Number.isFinite(physicalWidth) || physicalWidth <= 0 || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    throw new RangeError("Display physical width and height attributes must be finite positive millimetres")
  }
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new RangeError("Display CSS pixel resolution must use positive safe integer dimensions")
  }
  if ((read("box-sizing") ?? "border-box").trim() !== "border-box") throw new TypeError("Display currently requires border-box pixel resolution")
  const worldUnitsPerPixel = physicalWidth / width
  const worldUnitsPerPixelY = physicalHeight / height
  const dpi = {x: width * 25.4 / physicalWidth, y: height * 25.4 / physicalHeight}
  if (!Number.isFinite(dpi.x) || !Number.isFinite(dpi.y) || dpi.x <= 0 || dpi.y <= 0
    || worldUnitsPerPixel <= 0 || worldUnitsPerPixelY <= 0) {
    throw new RangeError("Display derived density and pixel dimensions must be finite positive numbers")
  }
  const physicalCssWidth = physicalWidth / MM_PER_PX
  const physicalCssHeight = physicalHeight / MM_PER_PX
  const translated = (read("translate") ?? "none").trim()
  const t = translated === "none" ? ["0", "0", "0"] : translated.split(/\s+/)
  if (t.length < 1 || t.length > 3) throw new TypeError("Display translate requires one to three lengths")
  const position = {x: length(t[0]!, physicalCssWidth) * MM_PER_PX, y: length(t[1] ?? "0", physicalCssHeight) * MM_PER_PX, z: length(t[2] ?? "0", 0, false) * MM_PER_PX}
  const scaled = (read("scale") ?? "none").trim()
  const s = scaled === "none" ? ["1"] : scaled.split(/\s+/)
  const scaleNumber = (value: string) => {
    const result = value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value)
    if (!Number.isFinite(result) || result === 0) throw new RangeError("Display scale axes must be finite and non-zero")
    return result
  }
  if (s.length < 1 || s.length > 3) throw new TypeError("Display scale requires one to three numbers")
  const scale = {x: scaleNumber(s[0]!), y: scaleNumber(s[1] ?? s[0]!), z: scaleNumber(s[2] ?? "1")}
  const rotated = (read("rotate") ?? "none").trim()
  const r = rotated === "none" ? ["0deg"] : rotated.split(/\s+/)
  const degreesFirst = /(?:deg|rad|grad|turn)$/.test(r[0]!)
  if (degreesFirst && r.length > 1) r.push(r.shift()!)
  const radians = angle(r.at(-1)!)
  const axes: Record<string, number[]> = {x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1]}
  const axis = r.length === 1 ? [0, 0, 1] : r.length === 2 ? axes[r[0]!] : r.length === 4 ? r.slice(0, 3).map(Number) : undefined
  if (!axis || !axis.every(Number.isFinite)) throw new TypeError("Display rotate requires an angle and optional axis")
  const maximum = Math.max(...axis.map(Math.abs))
  const normalized = maximum === 0 ? [0, 0, 0] : axis.map(value => value / maximum)
  const magnitude = Math.hypot(...normalized)
  const sine = magnitude === 0 ? 0 : Math.sin(radians / 2) / magnitude
  const quaternion = {x: normalized[0]! * sine, y: normalized[1]! * sine, z: normalized[2]! * sine, w: magnitude === 0 ? 1 : Math.cos(radians / 2)}
  const origin = (read("transform-origin") ?? "50% 50% 0").trim().split(/\s+/)
  if (origin.length < 1 || origin.length > 3) throw new TypeError("Display transform-origin requires one to three coordinates")
  if (origin.length === 1 && ["top", "bottom"].includes(origin[0]!)) origin.unshift("center")
  if (["top", "bottom"].includes(origin[0]!) || ["left", "right"].includes(origin[1] ?? "")) {
    [origin[0], origin[1]] = [origin[1] ?? "center", origin[0]!]
  }
  if (["top", "bottom"].includes(origin[0]!) || ["left", "right"].includes(origin[1] ?? "")) {
    throw new TypeError("Display transform-origin keywords must identify different axes")
  }
  const keyword = (v: string) => ({left: "0%", top: "0%", center: "50%", right: "100%", bottom: "100%"} as Record<string, string>)[v] ?? v
  const pivot = {x: (length(keyword(origin[0]!), physicalCssWidth) - physicalCssWidth / 2) * MM_PER_PX,
    y: (physicalCssHeight / 2 - length(keyword(origin[1] ?? "50%"), physicalCssHeight)) * MM_PER_PX,
    z: length(origin[2] ?? "0", 0, false) * MM_PER_PX}
  const x = pivot.x * scale.x, y = pivot.y * scale.y, z = pivot.z * scale.z
  const q = quaternion
  const tx = 2 * (q.y * z - q.z * y), ty = 2 * (q.z * x - q.x * z), tz = 2 * (q.x * y - q.y * x)
  position.x += pivot.x - (x + q.w * tx + q.y * tz - q.z * ty)
  position.y += pivot.y - (y + q.w * ty + q.z * tx - q.x * tz)
  position.z += pivot.z - (z + q.w * tz + q.x * ty - q.y * tx)
  if ((read("transform") ?? "none").trim() !== "none") throw new TypeError("Display currently uses individual translate, rotate and scale properties")
  return {viewport: {width, height}, pixels: {width, height}, dpi,
    worldUnitsPerPixel, worldUnitsPerPixelY, transform: {position, quaternion, scale, visible: true}}
}

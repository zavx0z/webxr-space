/** Цельный конечный вектор; единицы определяет свойство: мм, градусы или масштаб. */
export type SpatialVector = Readonly<{x: number; y: number; z: number}>

/** Безразмерная ориентация; Space нормализует ненулевой конечный кватернион. */
export type SpatialQuaternion = Readonly<{x: number; y: number; z: number; w: number}>

/** Взаимоисключающие формы ориентации по [закону Space](../README.md#трансформации). */
export type OrientationProps =
  | Readonly<{rotation?: SpatialVector | undefined; quaternion?: never}>
  | Readonly<{rotation?: never; quaternion?: SpatialQuaternion | undefined}>

/** Общий авторский transform; Euler XYZ в градусах, position в мм, scale безразмерный. */
export type TransformProps = OrientationProps & Readonly<{
  position?: SpatialVector | undefined
  scale?: SpatialVector | undefined
}>

/** Размер поверхности в мм либо разрешение матрицы в пикселях по имени свойства. */
export type DisplayExtent = Readonly<{width: number; height: number}>

/**
Характеристики [физического Display](../README.md#физический-display).
Size и resolution независимы от окна и камеры; pixelRatio задаёт масштаб CSS.
*/
export type DisplayMetricsProps = Readonly<{
  size: DisplayExtent
  resolution: DisplayExtent
  pixelRatio?: number | undefined
}>

export function validateVector(value: SpatialVector | undefined, label: string, nonzero = false): void {
  if (value === undefined) return
  if (value === null || ![value.x, value.y, value.z].every(Number.isFinite) ||
    nonzero && (value.x === 0 || value.y === 0 || value.z === 0)) {
    throw new RangeError(`${label} requires three finite${nonzero ? " non-zero" : ""} axes`)
  }
}

/** Private component conversion; scalar bindings preserve numeric author-value semantics. */
export function resolveTransform(props: TransformProps): SpatialQuaternion | undefined {
  validateVector(props.position, "position")
  validateVector(props.scale, "scale", true)
  if (props.rotation !== undefined && props.quaternion !== undefined) {
    throw new TypeError("rotation and quaternion are mutually exclusive")
  }
  if (props.quaternion !== undefined) {
    const q = props.quaternion
    if (q === null || ![q.x, q.y, q.z, q.w].every(Number.isFinite)) {
      throw new RangeError("quaternion requires four finite components")
    }
    const magnitude = Math.max(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z), Math.abs(q.w))
    if (magnitude === 0) throw new RangeError("quaternion must be non-zero")
    const x = q.x / magnitude
    const y = q.y / magnitude
    const z = q.z / magnitude
    const w = q.w / magnitude
    const length = Math.hypot(x, y, z, w)
    return {x: x / length, y: y / length, z: z / length, w: w / length}
  }
  if (props.rotation === undefined) return undefined
  validateVector(props.rotation, "rotation")
  const x = (props.rotation.x % 360) * Math.PI / 360
  const y = (props.rotation.y % 360) * Math.PI / 360
  const z = (props.rotation.z % 360) * Math.PI / 360
  const cx = Math.cos(x)
  const cy = Math.cos(y)
  const cz = Math.cos(z)
  const sx = Math.sin(x)
  const sy = Math.sin(y)
  const sz = Math.sin(z)
  // Blender XYZ: Rz * Ry * Rx acting on column vectors, qz * qy * qx.
  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  }
}

export function resolveDisplayMetrics(props: DisplayMetricsProps) {
  const {size, resolution} = props
  const pixelRatio = props.pixelRatio ?? 1
  if (size == null || resolution == null ||
    ![size.width, size.height, pixelRatio].every(value => Number.isFinite(value) && value > 0) ||
    ![resolution.width, resolution.height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new RangeError("Display requires positive finite size and pixelRatio and positive integer resolution")
  }
  const width = resolution.width / pixelRatio
  const height = resolution.height / pixelRatio
  const units = size.width / width
  const aspectScale = size.height / height / units
  if (![width, height, units, aspectScale].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Display characteristics exceed finite projection dimensions")
  }
  return {width, height, units, aspectScale}
}

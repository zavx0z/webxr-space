import {resolveTransform, type TransformProps} from "../src/props.ts"
import {useMemo} from "@zavx0z/component"
import {GridHelper} from "@zavx0z/engine"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {LineSegmentsProps} from "../shapes/line-segments.tsx"
import "../src/jsx.ts"

export type GridProps = TransformProps & Omit<LineSegmentsProps, "factory" | "children"> & Readonly<{
  /** Сторона квадратной сетки в мм; конечное число строго больше нуля. */
  size?: number
  /** Число ячеек вдоль стороны; целое число от 1. */
  divisions?: number
  /** RGB центральных линий в формате 0xRRGGBB. */
  colorCenterLine?: number
  /** RGB остальных линий в формате 0xRRGGBB. */
  colorGrid?: number
}>

/**
Опорная сетка в плоскости XY, Z = 0. Transform и ref относятся к одному LineSegments.
Геометрия меняется только вместе с размером, делениями или цветами; повторный render
и перемещение сохраняют фабрику производного объекта Engine. Browser владеет его
созданием, общим кадром и освобождением ресурсов.

@throws RangeError При недопустимом размере, числе делений или RGB-цвете.
@example
```tsx
<Grid size={2400} divisions={24} />
```
*/
export function Grid(props: GridProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  const size = props.size ?? 10
  const divisions = props.divisions ?? 10
  const colorCenterLine = props.colorCenterLine ?? 0x444444
  const colorGrid = props.colorGrid ?? 0x888888
  const factory = useMemo(() => {
    if (!Number.isFinite(size) || size <= 0 || !Number.isSafeInteger(divisions) || divisions < 1) {
      throw new RangeError("Grid requires a positive finite size and a positive integer division count")
    }
    if (!validColor(colorCenterLine) || !validColor(colorGrid)) {
      throw new RangeError("Grid colors must be integers in 0x000000..0xffffff")
    }
    return () => {
      const grid = new GridHelper(size, divisions, colorCenterLine, colorGrid)
      grid.frustumCulled = false
      return grid
    }
  }, [size, divisions, colorCenterLine, colorGrid])
  return <xr-line-segments
    factory={factory}
    name={props.name}
    x={props.position?.x}
    y={props.position?.y}
    z={props.position?.z}
    quaternionX={quaternion?.x}
    quaternionY={quaternion?.y}
    quaternionZ={quaternion?.z}
    quaternionW={quaternion?.w}
    scaleX={props.scale?.x}
    scaleY={props.scale?.y}
    scaleZ={props.scale?.z}
    visible={props.visible}
    ref={props.ref}
  />
}

function validColor(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffffff
}

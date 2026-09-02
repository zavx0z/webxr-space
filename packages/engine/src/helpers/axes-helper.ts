import { LineSegments } from "../objects/line-segments"
import { LineBasicMaterial } from "../materials/line-basic-material"
import { BufferAttribute } from "../core/buffer-attribute"
import { BufferGeometry } from "../core/buffer-geometry"

export class AxesHelper extends LineSegments {
  constructor(size = 1) {
    const vertices = new Float32Array([
      0, 0, 0, size, 0, 0,
      0, 0, 0, 0, size, 0,
      0, 0, 0, 0, 0, size,
    ])

    const colors = new Float32Array([
      1, 0.2, 0.2, 1, 0.2, 0.2,
      0.2, 1, 0.2, 0.2, 1, 0.2,
      0.2, 0.6, 1, 0.2, 0.6, 1,
    ])

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(vertices, 3))
    geometry.setAttribute("color", new BufferAttribute(colors, 3))

    super(
      geometry,
      new LineBasicMaterial({
        vertexColors: true,
        opacity: 0.95,
      }),
    )

    this.frustumCulled = false
  }
}

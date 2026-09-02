import { BufferGeometry } from "../core/buffer-geometry"
import { Material } from "../materials/material"
import { Object3D } from "../core/object-3d"

/**
 * Объект для отрисовки геометрии в виде набора линий.
 */
export class LineSegments extends Object3D {
  public geometry: BufferGeometry
  public material: Material

  constructor(geometry: BufferGeometry, material: Material) {
    super()
    this.geometry = geometry
    this.material = material
  }
}

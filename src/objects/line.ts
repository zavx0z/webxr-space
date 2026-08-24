import { Object3D } from "../core/object-3d"
import { BufferGeometry } from "../core/buffer-geometry"
import { Material } from "../materials/material"

/**
 * Базовый класс для линий.
 * @see https://threejs.org/docs/#api/en/objects/Line
 */
export class Line extends Object3D {
  public readonly isLine: true = true
  public type = "Line"

  /**
   * @param geometry - Геометрия линии.
   * @param material - Материал или массив материалов для линии.
   */
  constructor(
    public geometry: BufferGeometry,
    public material: Material | Material[]
  ) {
    super()
  }
}

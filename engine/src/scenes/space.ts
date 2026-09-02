import { Object3D } from "../core/object-3d"
import { Color } from "../math"

/**
 * Space — корневое world-space пространство кадра.
 */
export class Space extends Object3D {
  public readonly isSpace: true = true
  public type = "Space"

  public background: Color = new Color(0, 0, 0)

  constructor() {
    super()
  }
}

import {Element} from "../src/element.ts"

/** Общая принадлежность пространственного элемента; определяет допустимость его включения в Space. */
export class SpatialElement extends Element {
  get spaceChildKind(): "space" | "viewpoint" | "object" | "hud" | "resource" {
    return "resource"
  }
}

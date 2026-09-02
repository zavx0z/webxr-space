import type { AttrNodeElement } from "./index.t"
import type { Attributes } from "../attribute/index.t"
import type { Node } from "./index.t"

/**
 * Узел HTML элемента в AST.
 * Представляет HTML тег с атрибутами и дочерними элементами.
 *
 * @group Nodes
 * @example
 * ```html
 * <div class="container" id="main">
 *   <h1>Заголовок</h1>
 *   <p>Текст</p>
 * </div>
 * ```
 *
 * Результат:
 * ```json
 * {
 *   "tag": "div",
 *   "type": "el",
 *   "string": {
 *     "class": "container",
 *     "id": "main"
 *   },
 *   "child": [
 *     {
 *       "tag": "h1",
 *       "type": "el",
 *       "child": [
 *         {
 *           "type": "text",
 *           "value": "Заголовок"
 *         }
 *       ]
 *     },
 *     {
 *       "tag": "p",
 *       "type": "el",
 *       "child": [
 *         {
 *           "type": "text",
 *           "value": "Текст"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 *
 * Структура узла:
 * - `tag` - имя HTML тега
 * - `type` - всегда "el" для элементов
 * - `child` - массив дочерних узлов
 * - Атрибуты: `event`, `boolean`, `array`, `string`, `style`
 */
export interface NodeElement extends Attributes {
  /**
   * Имя HTML тега
   *
   * @example
   * ```typescript
   * tag: "div"
   * ```
   *
   * @example
   * ```typescript
   * tag: "button"
   * ```
   */
  tag: string
  /**
   * Тип узла - всегда "el" для элементов
   *
   * @example
   * ```typescript
   * type: "el"
   * ```
   */
  type: "el"
  /**
   * Дочерние узлы элемента (могут быть любого типа Node)
   *
   * @example
   * ```typescript
   * child: [
   *   { type: "text", value: "Привет" },
   *   { type: "text", data: "/fields/user/name" }
   * ]
   * ```
   */
  child?: Node[]
}
export interface PartAttrElement extends AttrNodeElement {
  /** Тип узла */
  type: "el"
}

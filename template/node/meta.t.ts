import type { ValueStatic, ValueDynamic, ValueVariable } from "../parser.t"
import type { AttrNodeElement } from "./index.t"
import type { Attributes } from "../attribute/index.t"
import type { Node } from "./index.t"

/**
 * Мета-узел в AST.
 *
 * Представляет meta-элемент.
 * Поддерживает создание компонентов с динамическими именами тегов.
 *
 * @group Nodes
 * @example Статический мета-тег
 * ```html
 * <meta-component class="custom">
 *   <p>Содержимое компонента</p>
 * </meta-component>
 * ```
 *
 * @example Динамический мета-тег
 * ```html
 * <meta-${mass.actorHash} class="dynamic">
 *   <p>Динамический компонент</p>
 * </meta-${mass.actorHash}>
 * ```
 *
 * @example Мета-элемент с mass и fields
 * ```html
 * <meta-widget mass=${mass.widgetConfig} fields=${mass.userData}>
 *   <div>Виджет с конфигурацией</div>
 * </meta-widget>
 * ```
 *
 * Структура узла:
 * - `type` - всегда "meta" для мета-узлов
 * - `tag` - имя мета-тега (статическое или динамическое)
 * - `child` - дочерние элементы (опционально)
 * - Атрибуты: `event`, `boolean`, `array`, `string`, `style`
 * - Свойства: `mass`, `fields`
 */

export interface NodeMeta extends Attributes {
  /** Имя мета-тега (может быть статическим или динамическим) */
  tag: ValueStatic | ValueDynamic | ValueVariable
  /** Тип узла - всегда "meta" для мета-узлов */
  type: "meta"
  /** Синтаксическое значение `src`; его формат проверяет consumer. */
  src?: ValueStatic | ValueDynamic | ValueVariable
  /** Дочерние элементы (опционально) */
  child?: Node[]
  /** mass свойство для meta-компонентов (передача mass объекта) */
  mass?: ValueStatic | ValueDynamic | ValueVariable
  /** fields свойство для meta-компонентов (передача fields объекта) */
  fields?: ValueStatic | ValueDynamic | ValueVariable
  /** energy binding custom element. */
  energy?: ValueStatic | ValueDynamic | ValueVariable
}
export interface PartAttrMeta extends AttrNodeElement {
  /** Тип узла */
  type: "meta"
  /** mass объекты */
  mass?: string
  /** fields объекты */
  fields?: string
  /** energy объекты */
  energy?: string
}

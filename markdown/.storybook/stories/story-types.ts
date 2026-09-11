import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode,
} from "@zavx0z/dom"
import {createRoot, type ComponentRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

/**
Текстовая проекция {@link OwnerStoryPresentation.source} для инспектора исходников Storybook.

@property html - Сериализация текущего semantic Element, не отдельное исполняемое дерево.

@property typescript - Авторский пример создания представления для панели исходников.
*/
export type OwnerStorySource = Readonly<{
  html: string
  typescript: string
}>

/**
Представление истории, передаваемое runtime в существующий Document.

@property element - Корневой узел; runtime переносит и снимает его без создания другого Document.

@property componentRoot - Заимствованный доступ к stylesheet registry смонтированного компонента.

@property source - Проекция {@link OwnerStorySource}; фабрика может вычислять HTML при чтении.

@property [props] - Значения параметров для инспектора истории, без изменения component state.

@property [afterPresent] - Callback после передачи представления runtime в Storybook.

@property dispose - Освобождает component root и оставшийся узел при снятии истории.
*/
export type OwnerStoryPresentation = Readonly<{
  element: SemanticNode
  componentRoot: Pick<ComponentRoot, "readStyleSheets">
  source: OwnerStorySource
  props?: Readonly<Record<string, unknown>>
  afterPresent?(): void
  dispose(): void
}>

/**
Обёртка результата фабрики, общая для owner stories Markdown.

@property story - {@link OwnerStoryPresentation}, lifecycle которого принимает runtime.
*/
export type RoutedProductionComponentStory = Readonly<{
  story: OwnerStoryPresentation
}>

/**
Связывает маршрут каталога с фабрикой production component story.

@property route - Полный маршрут, проверяемый runtime при mount.

@property create - Монтирует представление в переданном semantic Document.
Может загрузить шаблон асинхронно; {@link RoutedProductionComponentStory} содержит ресурсы для dispose.
*/
export type OwnerStoryDescriptor = Readonly<{
  route: string
  create(document: import("@zavx0z/dom").Document):
    RoutedProductionComponentStory | Promise<RoutedProductionComponentStory>
}>

/**
Связывает маршрут с фабрикой в замороженном descriptor; фабрику при объявлении не запускает.

@param route - Полный маршрут каталога, например `components/data/markdown/basic/default`; проверку совпадения выполняет runtime.

@param create - Фабрика {@link OwnerStoryDescriptor.create}, принимающая Document существующего Experience.

@returns Замороженный descriptor без создания или публикации представления.

@example
```ts
const descriptor = defineOwnerStory("components/data/markdown/basic/default", create)
```
*/
export function defineOwnerStory(
  route: string,
  create: OwnerStoryDescriptor["create"],
): OwnerStoryDescriptor {
  return Object.freeze({route, create})
}

/**
Добавляет замороженный снимок props для инспектора, сохраняя узел и lifecycle исходной истории.
Source остаётся делегированным getter; новая обёртка не создаёт второй component root.

@param routed - Уже созданная {@link RoutedProductionComponentStory}; владение её узлом и component root сохраняется.

@param props - Объект значений для панели инспектора; его верхний уровень копируется и замораживается.

@returns Новая обёртка над той же историей с заменённым снимком props.

@example
```ts
const presented = withStoryProps(routed, {wrap: false})
```
*/
export function withStoryProps(
  routed: RoutedProductionComponentStory,
  props: Readonly<Record<string, unknown>>,
): RoutedProductionComponentStory {
  const afterPresent = routed.story.afterPresent
  return Object.freeze({
    story: Object.freeze({
      element: routed.story.element,
      componentRoot: routed.story.componentRoot,
      /** Читает актуальную проекцию исходной истории без копирования её состояния. */
      get source() { return routed.story.source },
      props: Object.freeze({...props}),
      ...(afterPresent === undefined ? {} : {afterPresent}),
      /** Передаёт освобождение владельцу исходного component root. */
      dispose: () => routed.story.dispose(),
    }),
  })
}

/**
Монтирует скомпилированный шаблон истории во временном контейнере того же Document.
Извлекает корневой Element для передачи runtime, сохраняя обслуживающий component root.

@param document - Document внешнего Storybook, которому принадлежит представление.

@param template - Скомпилированная component-фабрика сценария.

@param props - Параметры шаблона; для инспектора создаётся отдельный замороженный снимок.

@param name - Значение data-story-component и имя для диагностики отсутствующего корня.

@param typescript - Текст авторского примера для панели исходников.

@returns История с ленивой сериализацией текущего HTML и освобождением root через dispose.

@throws Error, если шаблон не создал корневой Element; пустой root предварительно освобождается.

@typeParam Props - Форма параметров скомпилированного шаблона; тот же объект
передаётся render, а инспектор получает снимок его верхнего уровня.

@example
Для `template`, заранее полученного компиляцией в {@link CompiledTemplate}:
```ts
const routed = mountOwnerStory(document, template, {wrap: true}, "markdown", source)
// После снятия истории runtime вызовет routed.story.dispose().
```
*/
export function mountOwnerStory<Props extends Readonly<Record<string, unknown>>>(
  document: SemanticDocument,
  template: CompiledTemplate<Props>,
  props: Props,
  name: string,
  typescript: string,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(template, props)
  const owner = staging.firstElementChild as SemanticHTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props: Object.freeze({...props}),
      /** Сериализует текущее поддерево при запросе исходника инспектором. */
      get source() {
        return Object.freeze({html: serializeOwnerElement(owner), typescript})
      },
      /** Размонтирует component root и снимает ещё прикреплённый узел истории. */
      dispose() {
        root.unmount()
        if (owner.parentNode !== null) owner.parentNode.removeChild(owner)
      },
    }),
  })
}

/**
Создаёт читаемую HTML-проекцию semantic Element для инспектора исходников.
Сортирует атрибуты и включает только элементы и текстовые узлы.

@param element - Корень сериализуемого поддерева истории.

@param depth - Неотрицательное целое число уровней отступа по два пробела, начиная с 0.
Рекурсивные вызовы увеличивают его на один. Отдельной валидации нет:
дробные значения нормализует {@link String.repeat}, отрицательные целые и Infinity вызывают RangeError.

@returns Сериализация поддерева с отсортированными атрибутами и экранированным текстом.

@throws RangeError, если String.repeat не может создать отступ заданной длины.

@example
При semantic Document текущей истории:
```ts
const element = document.createElement("p")
element.textContent = "A < B"
const html = serializeOwnerElement(element)
```
*/
function serializeOwnerElement(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serializeOwnerElement(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

/**
Экранирует амперсанд, угловые скобки и двойные кавычки для текстовой HTML-проекции истории.

@param value - Текст или значение атрибута для HTML-проекции; не готовая экранированная строка.

@returns Строка для безопасного включения в сериализацию без исполнения HTML.
*/
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

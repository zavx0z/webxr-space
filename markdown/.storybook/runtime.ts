import type {Document, Node} from "@zavx0z/dom"

/**
Результат {@link OwnerStoryDescriptor.create}, проверяемый {@link ownerStoryResult} перед публикацией.

@property story - Созданное представление с Element текущего {@link Document} и componentRoot для стилей.
`source` содержит проекцию HTML/TypeScript, `props` — значения для инспекции;
необязательный `afterPresent` вызывается после публикации, а `dispose` освобождает представление.
*/
type OwnerStoryResult = Readonly<{
  story: Readonly<{
    element: Node
    componentRoot: Readonly<{readStyleSheets(): unknown}>
    source: Readonly<{html: string; typescript: string}>
    props?: Readonly<Record<string, unknown>>
    afterPresent?(): void
    dispose(): void
  }>
}>

/**
Локальная форма descriptor, которую runtime проверяет на входе mount.

@property route - Точный маршрут ожидаемой истории; несовпадение отклоняет монтирование.

@property create - Создаёт представление в переданном {@link Document}, синхронно или асинхронно.
Runtime проверяет результат и берёт на себя вызов dispose при снятии истории.
*/
type OwnerStoryDescriptor = Readonly<{
  route: string
  create(document: Document): OwnerStoryResult | Promise<OwnerStoryResult>
}>

/**
Заимствованные возможности внешнего Storybook для одного экземпляра Markdown runtime.

@property document - Общий {@link Document}, которому должен принадлежать корневой узел истории.

@property signal - Отмена всего runtime, проверяемая до и после асинхронного создания истории.

@property present - Публикует story-presentation/1 с узлом, componentRoot, исходниками и props.
Сам адаптер не создаёт Canvas или Renderer.

@property reportDiagnostic - Передаёт ошибку монтирования с phase=runtime перед повторным выбросом.
*/
type RuntimeContext = Readonly<{
  document: Document
  signal: AbortSignal
  present(value: Readonly<{
    protocol: "story-presentation/1"
    node: Node
    componentRoot: Readonly<{readStyleSheets(): unknown}>
    source: Readonly<{html: string; typescript: string}>
    values: Readonly<{props: Readonly<Record<string, unknown>>}>
  }>): void
  reportDiagnostic(value: unknown): void
}>

/**
Один запрос mount/update от внешнего Storybook в {@link RuntimeContext}.

@property route - Маршрут для проверки descriptor истории.

@property story - Непроверенный {@link OwnerStoryDescriptor}; {@link ownerStory} валидирует форму.

@property signal - Отмена текущего запроса в дополнение к общему сигналу контекста.
*/
type RuntimeInput = Readonly<{route: string; story: unknown; signal: AbortSignal}>

export const runtime = Object.freeze({
  protocol: "storybook-runtime/4",
  /**
  Создаёт lifecycle одной активной истории в заимствованном контексте Storybook.

  @param context - Заимствованный {@link RuntimeContext}; экземпляр runtime хранит одну текущую историю и собственный флаг закрытия.

  @returns Операции mount/update, unmount и идемпотентный dispose над общей текущей историей.
  */
  create(context: RuntimeContext) {
    let current: OwnerStoryResult["story"] | null = null
    let disposed = false

    /**
    Снимает текущий узел с родителя и вызывает dispose истории один раз; пустое состояние не меняет.
    */
    const unmount = (): void => {
      if (current === null) return
      const previous = current
      current = null
      if (previous.element.parentNode !== null) previous.element.parentNode.removeChild(previous.element)
      previous.dispose()
    }

    /**
    Заменяет текущую историю проверенным представлением в {@link Document} контекста.
    Повторно проверяет отмену после await; при отмене освобождает ещё не показанный результат.
    Ошибка создания или публикации передаётся reportDiagnostic и вызывающему коду.

    @param input - Маршрут, descriptor и сигнал отмены текущего запроса.

    @throws TypeError при неверном descriptor/результате; AbortError при отмене или закрытом runtime.

    @returns Promise завершается после present и вызова afterPresent; при ошибке отклоняется вместо успешной публикации.
    */
    const mount = async (input: RuntimeInput): Promise<void> => {
      assertActive(disposed, context.signal, input.signal)
      const descriptor = ownerStory(input.story, input.route)
      unmount()
      try {
        const result = await descriptor.create(context.document)
        const story = ownerStoryResult(result, context.document)
        try {
          assertActive(disposed, context.signal, input.signal)
        } catch (error) {
          story.dispose()
          throw error
        }
        current = story
        context.present(Object.freeze({
          protocol: "story-presentation/1",
          node: story.element,
          componentRoot: story.componentRoot,
          source: story.source,
          values: Object.freeze({props: story.props ?? Object.freeze({})}),
        }))
        story.afterPresent?.()
      } catch (error) {
        context.reportDiagnostic(Object.freeze({
          phase: "runtime",
          message: error instanceof Error ? error.message : String(error),
        }))
        throw error
      }
    }

    return Object.freeze({
      mount,
      update: mount,
      unmount,
      /** Идемпотентно закрывает runtime и освобождает текущую историю. */
      dispose() {
        if (disposed) return
        disposed = true
        unmount()
      },
    })
  },
})

/**
Проверяет совпадение маршрута и наличие фабрики перед исполнением descriptor.

@param value - Непроверенная загрузка истории от внешнего Storybook.

@param route - Ожидаемый полный маршрут.

@throws TypeError при несовместимой форме или несовпадении маршрута.

@returns Исходный {@link OwnerStoryDescriptor} после проверки, без клонирования и запуска фабрики.
*/
function ownerStory(value: unknown, route: string): OwnerStoryDescriptor {
  if (value === null || typeof value !== "object") throw new TypeError(`Invalid Markdown owner story: ${route}`)
  const descriptor = value as Partial<OwnerStoryDescriptor>
  if (descriptor.route !== route || typeof descriptor.create !== "function") {
    throw new TypeError(`Markdown owner story does not match route: ${route}`)
  }
  return descriptor as OwnerStoryDescriptor
}

/**
Проверяет принадлежность корневого узла общему {@link Document} и lifecycle созданной истории.

@param value - Непроверенный результат фабрики истории.

@param document - Заимствованный Document текущего runtime.

@throws TypeError при несовместимом узле, componentRoot или lifecycle callbacks.

@returns Заимствованное поле story из {@link OwnerStoryResult}; эта функция его не публикует и не освобождает.
*/
function ownerStoryResult(value: unknown, document: Document): OwnerStoryResult["story"] {
  if (value === null || typeof value !== "object") throw new TypeError("Markdown owner story returned no result")
  const result = value as Partial<OwnerStoryResult>
  const story = result.story
  if (story === null || typeof story !== "object" ||
    typeof story.element !== "object" || story.element.ownerDocument !== document ||
    story.componentRoot === null || typeof story.componentRoot !== "object" ||
    typeof story.componentRoot.readStyleSheets !== "function" ||
    typeof story.dispose !== "function" ||
    (story.afterPresent !== undefined && typeof story.afterPresent !== "function")) {
    throw new TypeError("Markdown owner story returned an incompatible DOM node")
  }
  return story
}

/**
Прерывает mount, если runtime закрыт или хотя бы один сигнал отменён.

@throws DOMException с именем AbortError при прекращении текущего запроса.

@param disposed - Флаг закрытия текущего экземпляра runtime.

@param signals - Сигналы всего контекста и конкретного запроса; отмена любого запрещает продолжение.
*/
function assertActive(disposed: boolean, ...signals: readonly AbortSignal[]): void {
  if (disposed || signals.some(({aborted}) => aborted)) throw new DOMException("Story mount aborted", "AbortError")
}

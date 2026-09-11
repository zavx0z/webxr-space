import MarkdownIt from "markdown-it"
import {parseFragment, serializeOuter, type DefaultTreeAdapterTypes} from "parse5"

/**
Узел инертного дерева parse5, которое обходится при построении Markdown-модели.
Это промежуточный результат для {@link blocks} и {@link inlines}, не Element документа приложения.
*/
type HtmlNode = DefaultTreeAdapterTypes.ChildNode
/**
Ветка parse5 с именем тега и атрибутами для проекции разрешённого HTML.
Получается сужением {@link HtmlNode} через {@link isElement}; используется в {@link attribute}.
*/
type HtmlElement = DefaultTreeAdapterTypes.Element

/**
Ячейка {@link MarkdownTableRow} для общей проекции parser и компонента.

@property key - Позиционный ключ из ключа строки и индекса ячейки.
Служит JSX identity при повторном отображении структуры.

@property align - Разрешённое выравнивание из точного стиля, выдаваемого markdown-it.
При отсутствии center/right parser выбирает left; произвольный CSS не переносится.

@property content - Фрагменты {@link MarkdownInline} после фильтрации тегов и адресов.
*/
export type MarkdownTableCell = Readonly<{
  key: string
  align: "left" | "center" | "right"
  content: readonly MarkdownInline[]
}>
/**
Строка секции таблицы с порядком ячеек из исходного документа.

@property key - Позиционный ключ, включающий таблицу, thead/tbody и индекс строки.

@property cells - Записи {@link MarkdownTableCell} в порядке th/td исходной строки.
Роль заголовка передаёт представление секции, а не отдельный признак ячейки.
*/
export type MarkdownTableRow = Readonly<{key: string; cells: readonly MarkdownTableCell[]}>

/**
Разрешённый строчный фрагмент для рекурсивного отображения Markdown.
Набор полей определяется kind; parser не передаёт обработчики и произвольные HTML-атрибуты.

@property key - Позиционный путь в разобранной структуре для JSX identity.
Не является диапазоном или смещением в исходном тексте.

@property kind - Выбирает текст, оформление, перенос, ссылку или изображение.

@property value - Текст для text/code; для link — плоский текст подписи.
Оформленная подпись ссылки хранится отдельно в content.

@property content - Рекурсивные {@link MarkdownInline} для оформления или подписи ссылки.

@property href - Адрес ссылки после проверки протокола и разрешения относительно baseUrl.

@property external - Признак href с префиксом http/https для rel=noreferrer.
Не сравнивает origin с текущей страницей.

@property src - Адрес изображения, допущенный той же проверкой, что и href.

@property alt - Альтернативный текст изображения; parser использует пустую строку при отсутствии.

@property [title] - Подсказка из разрешённого атрибута изображения.

@property [width] - Ширина изображения в CSS px из положительного целого HTML-атрибута.
Неположительные, дробные и небезопасные целые parser пропускает.

@property [height] - Высота изображения в CSS px с той же проверкой, что и width.
*/
export type MarkdownInline = Readonly<{key: string; kind: "text" | "code"; value: string}>
  | Readonly<{key: string; kind: "strong" | "em" | "strike"; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "break"}>
  | Readonly<{key: string; kind: "link"; value: string; content: readonly MarkdownInline[]; href: string; external: boolean}>
  | Readonly<{key: string; kind: "image"; src: string; alt: string; title?: string; width?: number; height?: number}>

/**
Блочная модель CommonMark, таблиц и разрешённого HTML для Markdown-компонента.
Union сохраняет различия содержимого; parser замораживает создаваемые блоки.

@property key - Позиционный путь блока для JSX identity, без привязки к исходным offset.

@property kind - Определяет ветку представления и доступные в ней поля.

@property level - Уровень heading от 1 до 6, полученный из HTML-тега.

@property content - Фрагменты {@link MarkdownInline} внутри heading или paragraph.

@property ordered - Для list выбирает ol вместо ul.

@property start - Начальное число ordered-списка; parser использует 1 при отсутствии допустимого start.
Допускается только положительное безопасное целое HTML-значение.

@property items - Элементы списка в исходном порядке.
У каждого `key` служит JSX identity, `content` содержит первый paragraph,
а `blocks` — оставшиеся {@link MarkdownBlock}, включая вложенные списки.

@property languageId - Язык code из language-класса; при отсутствии используется plaintext.
Значение mermaid включает специальное представление диаграммы.

@property value - Текст code с удалённым одним завершающим переводом строки.

@property blocks - Вложенные {@link MarkdownBlock} для quote/group после того же разбора.

@property [align] - Разрешённый атрибут выравнивания quote/group без переноса произвольных стилей.

@property head - Записи {@link MarkdownTableRow} из thead, отображаемые заголовочными ячейками.

@property body - Записи {@link MarkdownTableRow} из tbody в исходном порядке.
*/
export type MarkdownBlock = Readonly<{key: string; kind: "heading"; level: number; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "paragraph"; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "list"; ordered: boolean; start: number; items: readonly Readonly<{key: string; content: readonly MarkdownInline[]; blocks: readonly MarkdownBlock[]}>[]}>
  | Readonly<{key: string; kind: "code"; languageId: string; value: string}>
  | Readonly<{key: string; kind: "quote" | "group"; blocks: readonly MarkdownBlock[]; align?: "left" | "center" | "right"}>
  | Readonly<{key: string; kind: "rule"}>
  | Readonly<{key: string; kind: "table"; head: readonly MarkdownTableRow[]; body: readonly MarkdownTableRow[]}>

/**
Результат общего разбора для визуального Markdown и поиска ресурсов.
Корневой объект заморожен; модель не содержит живых HTML-узлов.

@property blocks - Корневые {@link MarkdownBlock}; пустой исходник даёт пустой массив.
*/
export type MarkdownDocument = Readonly<{blocks: readonly MarkdownBlock[]}>
/**
Вход {@link parseMarkdown} для CommonMark с таблицами и инертной HTML-проекцией.

@property source - Исходный текст; нестроковое значение приводит к TypeError.
HTML разбирается без исполнения и проецируется в разрешённые блоки и фрагменты.

@property [baseUrl] - База для разрешения относительных href/src, абсолютный URL или путь сайта.
Без неё относительные адреса сохраняются. Разрешаются только http/https;
недопустимая ссылка теряет оболочку, недопустимое изображение пропускается.
*/
export type ParseMarkdownOptions = Readonly<{source: string; baseUrl?: string}>

const parser = new MarkdownIt("commonmark", {html: true}).enable("table")
const inlineTags = new Set(["a", "code", "strong", "b", "em", "i", "s", "del", "span", "img", "br"])

/**
Синхронно разбирает CommonMark и таблицы в замороженную модель без живого DOM.
HTML проходит через инертное дерево parse5 и разрешённую проекцию.

@param options - Исходный текст и необязательная база адресов согласно {@link ParseMarkdownOptions}.

@returns Корневые блоки в порядке документа, пригодные для отображения и поиска ресурсов.

@throws TypeError при нестроковом source.

@example
```ts
const document = parseMarkdown({source: "# Заголовок", baseUrl: "/docs/"})
```
*/
export function parseMarkdown(options: ParseMarkdownOptions): MarkdownDocument {
  if (typeof options.source !== "string") throw new TypeError("Markdown source must be text")
  const html = parseFragment(parser.render(options.source))
  return Object.freeze({blocks: blocks(html.childNodes, options.baseUrl, "block", 0)})
}

/**
Собирает уникальные адреса ссылок и изображений из той же модели, что отображает Markdown.
Обходит вложенное оформление, списки, цитаты и таблицы без разрешения относительно baseUrl.

@param source - Исходный Markdown для общего безопасного parser.

@returns Замороженный список адресов в порядке первого обнаружения.

@throws TypeError при нестроковом source.
*/
export function markdownDestinations(source: string): readonly string[] {
  const destinations = new Set<string>()
  /**
  Добавляет адреса текущих строчных фрагментов и рекурсивно обходит вложенное оформление.

  @param items - Фрагменты {@link MarkdownInline} из общего parser; адреса добавляются в захваченный Set.
  */
  const visitInline = (items: readonly MarkdownInline[]): void => {
    for (const item of items) {
      if (item.kind === "image") destinations.add(item.src)
      if (item.kind === "link") destinations.add(item.href)
      if ("content" in item) visitInline(item.content)
    }
  }
  /**
  Обходит ресурсы во всех ветках блоков, включая обе секции таблицы и элементы списка.

  @param items - Последовательность {@link MarkdownBlock}; обход дополняет общий набор destinations.
  */
  const visitBlocks = (items: readonly MarkdownBlock[]): void => {
    for (const item of items) {
      if ("content" in item) visitInline(item.content)
      if ("blocks" in item) visitBlocks(item.blocks)
      if (item.kind === "table") for (const row of [...item.head, ...item.body]) {
        for (const cell of row.cells) visitInline(cell.content)
      }
      if (item.kind === "list") for (const entry of item.items) {
        visitInline(entry.content)
        visitBlocks(entry.blocks)
      }
    }
  }
  visitBlocks(parseMarkdown({source}).blocks)
  return Object.freeze([...destinations])
}

/**
Проецирует HTML-узлы в блоки с позиционными ключами и безопасным содержимым.
Неизвестные блочные теги сохраняет как текст сериализованного HTML.

@param nodes - Дочерние узлы инертного дерева parse5 в исходном порядке.

@param baseUrl - База адресов, передаваемая общему фильтру ссылок и изображений.

@param prefix - Позиционный путь родителя для ключей вложенных блоков.

@param depth - Неотрицательный счётчик вложенных вызовов blocks/inlines, начиная с 0.
При значении больше 32 возвращается пустой массив; прочие значения отдельно не валидируются.

@returns Блоки с позиционными ключами и обработанными вложенными элементами.

@example
```ts
const fragment = parseFragment("<p>Текст</p>")
const result = blocks(fragment.childNodes, undefined, "block", 0)
```
*/
function blocks(nodes: readonly HtmlNode[], baseUrl: string | undefined, prefix: string, depth: number): readonly MarkdownBlock[] {
  if (depth > 32) return []
  const result: MarkdownBlock[] = []
  let pending: HtmlNode[] = []
  /**
  Собирает накопленные строчные HTML-узлы в paragraph и очищает буфер; пустой пробельный текст пропускает.
  */
  const paragraph = () => {
    if (pending.length === 0) return
    const content = inlines(pending, baseUrl, `${prefix}:${result.length}`, depth + 1)
    if (content.some(item => item.kind !== "text" || item.value.trim() !== "")) {
      result.push(Object.freeze({key: `${prefix}:${result.length}`, kind: "paragraph", content}))
    }
    pending = []
  }
  for (const node of nodes) {
    if (!isElement(node) || inlineTags.has(node.tagName)) { pending.push(node); continue }
    paragraph()
    const key = `${prefix}:${result.length}`
    const tag = node.tagName
    if (/^h[1-6]$/u.test(tag)) {
      result.push(Object.freeze({key, kind: "heading", level: Number(tag[1]), content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "p") {
      result.push(Object.freeze({key, kind: "paragraph", content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "pre") {
      const code = node.childNodes.find(child => isElement(child) && child.tagName === "code")
      const languageId = code !== undefined && isElement(code)
        ? /(?:^|\s)language-(\S+)/u.exec(attribute(code, "class") ?? "")?.[1] ?? "plaintext"
        : "plaintext"
      result.push(Object.freeze({key, kind: "code", languageId, value: textContent(code ?? node).replace(/\n$/u, "")}))
    } else if (tag === "ul" || tag === "ol") {
      const items = node.childNodes.filter(isElement).filter(child => child.tagName === "li").map((item, index) => {
        const itemKey = `${key}:item:${index}`
        const parsed = blocks(item.childNodes, baseUrl, itemKey, depth + 1)
        const first = parsed[0]
        return Object.freeze({
          key: itemKey,
          content: first?.kind === "paragraph" ? first.content : Object.freeze([]),
          blocks: Object.freeze(first?.kind === "paragraph" ? parsed.slice(1) : [...parsed]),
        })
      })
      result.push(Object.freeze({key, kind: "list", ordered: tag === "ol", start: dimension(attribute(node, "start")) ?? 1, items: Object.freeze(items)}))
    } else if (tag === "table") {
      const sections = node.childNodes.filter(isElement)
      /**
      Извлекает строки указанной секции thead/tbody с ключами ячеек и разрешённым выравниванием.

      @param section - Точное имя секции HTML: thead или tbody. Другая строка просто не выберет эти секции.

      @returns Замороженные строки {@link MarkdownTableRow} выбранной секции.
      */
      const rows = (section: string): readonly MarkdownTableRow[] => Object.freeze(sections
        .filter(child => child.tagName === section)
        .flatMap(child => child.childNodes.filter(isElement).filter(row => row.tagName === "tr"))
        .map((row, rowIndex) => {
          const rowKey = `${key}:${section}:${rowIndex}`
          const cells = row.childNodes.filter(isElement).filter(cell => cell.tagName === "th" || cell.tagName === "td")
          return Object.freeze({key: rowKey, cells: Object.freeze(cells.map((cell, index) => {
            const cellKey = `${rowKey}:${index}`
            // Only the exact alignment emitted by markdown-it is admitted, never arbitrary CSS.
            const style = attribute(cell, "style")
            const align = style === "text-align:center" ? "center" : style === "text-align:right" ? "right" : "left"
            return Object.freeze({key: cellKey, align, content: inlines(cell.childNodes, baseUrl, cellKey, depth + 1)})
          }))})
        }))
      result.push(Object.freeze({key, kind: "table", head: rows("thead"), body: rows("tbody")}))
    } else if (tag === "blockquote" || tag === "div") {
      const align = attribute(node, "align")
      result.push(Object.freeze({
        key, kind: tag === "blockquote" ? "quote" : "group",
        blocks: blocks(node.childNodes, baseUrl, key, depth + 1),
        ...(align === "left" || align === "center" || align === "right" ? {align} : {}),
      }))
    } else if (tag === "hr") result.push(Object.freeze({key, kind: "rule"}))
    else result.push(Object.freeze({key, kind: "paragraph", content: Object.freeze([Object.freeze({key: `${key}:text`, kind: "text", value: serializeOuter(node)})])}))
  }
  paragraph()
  return Object.freeze(result)
}

/**
Проецирует разрешённые HTML-теги в строчные фрагменты, сохраняя неизвестные теги текстом.
Недопустимые ссылки заменяет подписью, а изображения с недопустимым src пропускает.

@param nodes - Строчные дочерние узлы инертного parse5-дерева.

@param baseUrl - База адресов, передаваемая {@link safeUrl} без изменения.

@param prefix - Позиционный путь для ключей фрагментов.

@param depth - Неотрицательный целый счётчик вызовов blocks/inlines; значение больше 32
даёт пустой массив. Прочие значения отдельно не валидируются.

@returns Строчные фрагменты с разрешёнными адресами и сохранённым порядком текста.

@example
```ts
const fragment = parseFragment("<strong>Текст</strong>")
const result = inlines(fragment.childNodes, undefined, "block:0", 0)
```
*/
function inlines(nodes: readonly HtmlNode[], baseUrl: string | undefined, prefix: string, depth: number): readonly MarkdownInline[] {
  if (depth > 32) return []
  const result: MarkdownInline[] = []
  for (const [index, node] of nodes.entries()) {
    const key = `${prefix}:inline:${index}`
    if (node.nodeName === "#text") {
      result.push(Object.freeze({key, kind: "text", value: (node as DefaultTreeAdapterTypes.TextNode).value}))
      continue
    }
    if (!isElement(node)) continue
    const tag = node.tagName
    if (tag === "code") result.push(Object.freeze({key, kind: "code", value: textContent(node)}))
    else if (["strong", "b", "em", "i", "s", "del"].includes(tag)) {
      const kind = tag === "strong" || tag === "b" ? "strong" : tag === "em" || tag === "i" ? "em" : "strike"
      result.push(Object.freeze({key, kind, content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "a") {
      const content = inlines(node.childNodes, baseUrl, key, depth + 1)
      const href = safeUrl(attribute(node, "href") ?? "", baseUrl)
      if (href === null) result.push(...content)
      else result.push(Object.freeze({key, kind: "link", value: textContent(node), content, href, external: /^https?:/u.test(href)}))
    } else if (tag === "img") {
      const src = safeUrl(attribute(node, "src") ?? "", baseUrl)
      if (src === null) continue
      const title = attribute(node, "title")
      const width = dimension(attribute(node, "width"))
      const height = dimension(attribute(node, "height"))
      result.push(Object.freeze({key, kind: "image", src, alt: attribute(node, "alt") ?? "",
        ...(title === null ? {} : {title}), ...(width === undefined ? {} : {width}), ...(height === undefined ? {} : {height}),
      }))
    } else if (tag === "br") result.push(Object.freeze({key, kind: "break"}))
    else if (tag === "span") result.push(...inlines(node.childNodes, baseUrl, key, depth + 1))
    else result.push(Object.freeze({key, kind: "text", value: serializeOuter(node)}))
  }
  return Object.freeze(result)
}

/**
Сужает узел parse5 по наличию tagName для безопасного чтения атрибутов и дочерних элементов.

@param node - Узел {@link HtmlNode} из parse5, а не Element приложения.

@returns Признак наличия tagName для последующего чтения как {@link HtmlElement}.
*/
function isElement(node: HtmlNode): node is HtmlElement { return "tagName" in node }
/**
Читает первое совпадение атрибута parse5; null отличает отсутствие от пустой строки.

@param node - Уже суженный {@link HtmlElement} с массивом attrs.

@param name - Точное имя HTML-атрибута в parse5, например href или title; сравнение чувствительно к регистру.

@returns Значение первого совпавшего атрибута либо null при отсутствии.
*/
function attribute(node: HtmlElement, name: string): string | null { return node.attrs.find(attr => attr.name === name)?.value ?? null }
/**
Принимает только строку десятичных цифр с положительным безопасным целым значением.
Недопустимый размер изображения или start списка возвращает как undefined без исключения.

@param value - Необработанный width, height или start из HTML; null означает отсутствие атрибута.

@returns Положительное безопасное целое либо undefined; знак, пробелы, дробь и переполнение отклоняются.

@example
```ts
const width = dimension("320") // 320
const absent = dimension("0") // undefined
```
*/
function dimension(value: string | null): number | undefined {
  if (value === null || !/^\d+$/u.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : undefined
}
/**
Собирает текстовые узлы parse5 в порядке документа, обходя дерево стеком без исполнения HTML.

@param node - Корень инертного поддерева parse5, чей текст нужен для подписи или code.

@returns Объединённое содержимое текстовых узлов; HTML-теги сами не добавляют текст или переводы строк.
*/
function textContent(node: HtmlNode): string {
  const stack = [node]
  let value = ""
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current.nodeName === "#text") value += (current as DefaultTreeAdapterTypes.TextNode).value
    else if (isElement(current)) stack.push(...[...current.childNodes].reverse())
  }
  return value
}
/**
Проверяет адрес через URL и допускает только http/https.
Относительный адрес без базы сохраняет как написан; относительная база сайта
даёт путь с query и fragment без служебного origin markdown.invalid.

@param value - Непустой href/src из HTML-атрибута.

@param baseUrl - Необязательная абсолютная или относительная база документа.

@returns Разрешённый адрес или null при пустом значении, ошибке URL либо недопустимом протоколе.

@example
```ts
const local = safeUrl("guide.md#intro", "/docs/") // /docs/guide.md#intro
const rejected = safeUrl("javascript:alert(1)", undefined) // null
```
*/
function safeUrl(value: string, baseUrl: string | undefined): string | null {
  if (value.length === 0) return null
  try {
    const fallback = new URL("https://markdown.invalid/")
    const base = new URL(baseUrl ?? "", fallback)
    const url = new URL(value, base)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    const absolute = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu
    if (baseUrl === undefined && !absolute.test(value)) return value
    if (baseUrl !== undefined && !absolute.test(baseUrl) && !absolute.test(value) && url.origin === fallback.origin) {
      return `${url.pathname}${url.search}${url.hash}`
    }
    return url.href
  } catch { return null }
}

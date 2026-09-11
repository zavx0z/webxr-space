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


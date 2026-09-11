/**
Разбирает текст авторских doc-блоков для {@link @webxr/typedoc/parser#analyzeTypeDoc | analyzeTypeDoc}.
Сохраняет Markdown, ограждения кода и порядок примеров. Повторное `@property`
с тем же именем заменяет запись; неизвестный block tag не попадает в описание.
Inline-ссылки сохраняются текстом, без разрешения их целей.

@param comments - Полные doc-блоки или их текстовое содержимое в порядке исходника.
Допускается оформление с декоративными звёздочками или без них;
отбор комментариев конкретного AST-узла выполняет вызывающий код.

@returns `comment.summary`, массив `comment.examples` и карта `properties`.
Default хранится текстом после `=`; parser его не вычисляет и не валидирует тип.

@example
```ts
const docs = readComment(["Описание.\n@property [size=12] - Размер в CSS px."])
const size = docs.properties.get("size")
// size?.defaultValue равно "12"
```
*/
export function readComment(comments: readonly string[]) {
  const properties = new Map<string, {description: string; defaultValue?: string}>()
  const summary: string[] = []
  const examples: string[][] = []
  for (const comment of comments) {
    let target = summary
    let property: {name: string; lines: string[]; defaultValue?: string} | undefined
    let fence: {character: string; length: number} | undefined
    /**
    Сохраняет накопленные строки текущего @property и его текстовый default, затем сбрасывает буфер.
    */
    const finishProperty = () => {
      if (property) properties.set(property.name, {
        description: property.lines.join("\n").trim(),
        ...(property.defaultValue === undefined ? {} : {defaultValue: property.defaultValue}),
      })
      property = undefined
    }
    for (const raw of comment.replace(/^\/\*\*[ \t]?|\*\/$/gu, "").split(/\r?\n/u)) {
      const line = raw.replace(/^\s*\* ?/u, "").trimEnd()
      const delimiter = line.match(/^\s*(`{3,}|~{3,})(.*)$/u)
      if (fence) {
        target.push(line)
        if (delimiter && delimiter[1]![0] === fence.character && delimiter[1]!.length >= fence.length && !delimiter[2]!.trim()) fence = undefined
        continue
      }
      if (delimiter) {
        fence = {character: delimiter[1]![0]!, length: delimiter[1]!.length}
        target.push(line)
        continue
      }
      if (!/^\s*@/u.test(line)) {
        target.push(line)
        continue
      }
      finishProperty()
      const field = line.match(/^\s*@(?:property|prop)\s+(?:\{[^}]*\}\s+)?(\[[^\]]+\]|\S+)\s*(?:-\s*)?(.*)$/u)
      if (field) {
        const token = field[1]!.replace(/^\[|\]$/gu, "")
        const equals = token.indexOf("=")
        property = {
          name: equals < 0 ? token : token.slice(0, equals),
          lines: [field[2]!],
          ...(equals < 0 ? {} : {defaultValue: token.slice(equals + 1)}),
        }
        target = property.lines
      } else if (/^\s*@example\b/u.test(line)) {
        target = [line.replace(/^\s*@example\s*/u, "")]
        examples.push(target)
      } else if (/^\s*@remarks\b/u.test(line)) {
        target = summary
        target.push("", line.replace(/^\s*@remarks\s*/u, ""))
      } else {
        target = []
      }
    }
    finishProperty()
  }
  return {comment: {summary: summary.join("\n").trim(), examples: examples.map(lines => lines.join("\n").trim())}, properties}
}

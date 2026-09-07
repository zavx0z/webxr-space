import {useMemo, useRef} from "@zavx0z/component"
import type {Document as SemanticDocument} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Button} from "@zavx0z/ui/buttons/button"
import {createCodeEditorModel} from "@zavx0z/ui/code-editor-model"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {Markdown} from "@zavx0z/ui/views/markdown"
import {mountOwnerStory} from "../story-types.ts"

const editableSource = [
  'const first = "Привет"',
  'const second = "Мир"',
  "",
  "console.log(first, second)",
].join("\n")

const initialRanges = ["Привет", "Мир"].map(value => {
  const anchor = editableSource.indexOf(value)
  return {anchor, head: anchor + value.length}
})

function EditableSelectionStory(props: Readonly<{multiple: boolean}>) {
  const model = useMemo(() => createCodeEditorModel({
    value: editableSource,
    selections: props.multiple ? initialRanges : [{anchor: 0, head: 0}],
    primary: props.multiple ? 1 : 0,
  }), [])
  const editor = useRef<HTMLElement | null>(null)
  const focus = () => editor.current?.querySelector<HTMLElement>("code")?.focus({preventScroll: true})
  const heading = props.multiple ? "Один редактор — несколько выделений" : "Обычное редактирование кода"
  return <section
    aria-label={props.multiple ? "Множественное выделение кода" : "Редактируемый код"}
    style={css`
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 620px;
      padding: 12px;
      color: var(--widget-regular-content);
    `}
  >
    <h3
      style={css`
        margin: 0;
        font-size: 16px;
      `}
    >
      {heading}
    </h3>
    <p
      style={css`
        margin: 0;
        white-space: normal;
        line-height: 20px;
      `}
    >
      Нажмите в коде, выделите текст и откройте правой кнопкой глобальное меню «Копировать / Вставить».
      Alt/Meta + клик или перетаскивание добавляет диапазон. Ввод изменяет все диапазоны одним действием,
      а ⌘/Ctrl+Z отменяет его целиком. Escape оставляет только основной диапазон.
    </p>
    <div
      style={css`
        display: flex;
        flex-direction: row;
        gap: 8px;
        user-select: none;
      `}
    >
      <Button
        label="Выделить два значения"
        onClick={() => {
          model.replaceValue(editableSource, {selection: "reset"})
          model.setSelections(initialRanges, 1)
          focus()
        }}
      />
      <Button
        label="Сбросить пример"
        onClick={() => {
          model.replaceValue(editableSource, {selection: "reset"})
          model.setSelections([{anchor: 0, head: 0}])
          focus()
        }}
      />
    </div>
    <CodeEditor
      value={editableSource}
      readOnly={false}
      model={model}
      ref={root => { editor.current = root }}
      languageId="typescript"
      title="Редактируемый пример"
      style={css`
        width: 100%;
        height: 240px;
      `}
    />
    <p
      style={css`
        margin: 0;
        line-height: 20px;
      `}
    >
      Два значения копируются по порядку исходника через перевод строки. При вставке двух строк
      каждая попадёт в свой диапазон; другое число строк вставляется целиком в каждый диапазон.
      Номера строк не выделяются и не копируются.
    </p>
  </section>
}

const crossBlockMarkdown = [
  "## Markdown в том же документе",
  "",
  "Продолжите выделение через **жирный текст**, [ссылку](https://example.com/) и следующий блок кода.",
  "",
  "```typescript",
  'const message = "Выделение проходит через код"',
  "",
  "console.log(message)",
  "```",
  "",
  "Этот абзац находится после кода, но участвует в том же выделении.",
].join("\n")

function CrossBlockSelectionStory() {
  return <section
    aria-label="Выделение через обычный текст, Markdown и код"
    style={css`
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 620px;
      padding: 12px;
      color: var(--widget-regular-content);
    `}
  >
    <p
      style={css`
        margin: 0;
        line-height: 20px;
      `}
    >
      Начало: это обычный абзац, не Markdown. Начните выделение здесь и протяните его до абзаца «Конец».
    </p>
    <Markdown
      source={crossBlockMarkdown}
      style={css`
        width: 100%;
        height: auto;
        padding: 0;
      `}
    />
    <p
      style={css`
        margin: 0;
        line-height: 20px;
      `}
    >
      Конец: это снова обычный абзац. Правый клик сохраняет выделение; глобальное меню копирует его,
      не добавляя номера строк. В области ниже можно проверить вставку.
    </p>
    <CodeEditor
      value=""
      readOnly={false}
      title="Область для проверки вставки"
      showLineNumbers={false}
      style={css`
        width: 100%;
        height: 120px;
      `}
    />
  </section>
}

export function createCompiledCodeEditorEditableStory(document: SemanticDocument, multiple = false) {
  return mountOwnerStory(document, EditableSelectionStory as unknown as CompiledTemplate<{multiple: boolean}>,
    {multiple}, "code-editor-editable", [
      'import {CodeEditor} from "@zavx0z/ui/views/code-editor"',
      'import {createCodeEditorModel} from "@zavx0z/ui/code-editor-model"',
      'import {createRoot} from "@zavx0z/component"',
      "",
      `const value = ${JSON.stringify(editableSource)}`,
      `const model = createCodeEditorModel({value, selections: ${JSON.stringify(multiple ? initialRanges : [{anchor: 0, head: 0}])}})`,
      "createRoot(container).render(<CodeEditor",
      "  value={value}",
      "  model={model}",
      "  readOnly={false}",
      '  languageId="typescript"',
      "/>)",
    ].join("\n"))
}

export function createCompiledCrossBlockSelectionStory(document: SemanticDocument) {
  return mountOwnerStory(document, CrossBlockSelectionStory as unknown as CompiledTemplate<{}>,
    {}, "cross-block-selection", [
      'import {Markdown} from "@zavx0z/ui/views/markdown"',
      'import {CodeEditor} from "@zavx0z/ui/views/code-editor"',
      'import {createRoot} from "@zavx0z/component"',
      "",
      `const source = ${JSON.stringify(crossBlockMarkdown)}`,
      "createRoot(container).render(<section>",
      "  <p>Начало: обычный абзац.</p>",
      "  <Markdown source={source} />",
      "  <p>Конец: обычный абзац.</p>",
      '  <CodeEditor value="" readOnly={false} title="Вставка" />',
      "</section>)",
    ].join("\n"))
}

import {useMemo, useRef} from "@zavx0z/component"
import {Button} from "@zavx0z/ui/buttons/button"
import {createCodeEditorModel} from "@zavx0z/ui/code-editor-model"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"

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

export function EditableSelectionFixture(props: Readonly<{multiple: boolean}>) {
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

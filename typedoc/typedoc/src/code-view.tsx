import {CodeEditor} from "@zavx0z/ui/views/code-editor"

/**
Показывает TypeScript-сигнатуру, тип или default в общем {@link CodeEditor} только для чтения.
Отключает номера строк и подстраивает высоту под содержимое справочника.
Длинные строки сохраняются целиком в локальной горизонтальной прокрутке,
а ширину ограничивает родительский раздел.

Размеры текста и viewport принадлежат [контракту CodeEditor](../../../ui/views/code-editor.md).
Границы CSS-переноса определяет [строчный поток Renderer](../../../renderer/html/inline-flow.md).

@param props - TypeScript-текст value и подпись title для доступности/подсказки существующего {@link CodeEditor}.
*/
export function CodeView(props: Readonly<{value: string; title: string}>) {
  return <CodeEditor
    value={props.value}
    title={props.title}
    readOnly={true}
    languageId="typescript"
    showLineNumbers={false}
    style={css`
      width: 100%;
      height: auto;
      min-width: 0;
      flex-shrink: 0;
    `}
  />
}

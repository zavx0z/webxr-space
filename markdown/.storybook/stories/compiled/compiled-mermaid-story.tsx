import {useState} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Markdown} from "@webxr/markdown"
import {Button} from "@zavx0z/ui/buttons/button"
import {mountOwnerStory} from "../story-types.ts"

const initial = '```mermaid\nflowchart LR\n  Source["Источник"] --> Parameters(["Параметры"])\n  Parameters --> Result(("Результат"))\n```'
const changed = '```mermaid\nflowchart TB\n  Source["Источник"] --> Result(("Результат"))\n```'

const referenceGraph = `\`\`\`mermaid
flowchart TD
  ContentNode --> ContentSurface
  ContentNode --> ParameterNode
  ContentNode --> Pane
  ParameterNode --> ParameterNodeContents
  ParameterNode --> Pane
  DiagramNode --> Pane
  DiagramNode --> Typography
\`\`\``

/**
Сценарий смены исходника {@link Markdown} с Mermaid: горизонтальный, вертикальный и reference-граф.
Кнопки обновляют один компонент, позволяя проверить повторный разбор и состояние готовности.
*/
function MermaidExample() {
  const [source, setSource] = useState(initial)
  return <section
    style={css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    gap: 12px;
    padding: 12px;
    `}
  >
    <Button
      label="Изменить диаграмму"
      onClick={() => setSource(value => value === initial ? changed : initial)}
    />
    <Button
      label="Граф из обсуждения"
      onClick={() => setSource(referenceGraph)}
    />
    <Markdown source={source} />
  </section>
}

/**
Монтирует интерактивный Mermaid-сценарий в переданном {@link Document} и добавляет пример исходника.

@param document - Заимствованный semantic Document внешнего Storybook; lifecycle создаваемой истории предоставляет {@link mountOwnerStory}.

@returns Готовая owner story с исходным примером и dispose для последующего снятия.
*/
export function createMermaidStory(document: Document) {
  return mountOwnerStory(document, MermaidExample as unknown as CompiledTemplate<{}>, {}, "mermaid", [
    'import {Markdown} from "@webxr/markdown"',
    `const source = ${JSON.stringify(initial)}`,
    'export function Example() {',
    '  return <Markdown source={source} />',
    '}',
  ].join("\n"))
}

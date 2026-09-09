import {useState} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Markdown} from "@webxr/markdown"
import {Button} from "@zavx0z/ui/buttons/button"
import {mountOwnerStory} from "../story-types.ts"

const initial = '```mermaid\nflowchart LR\n  Source["Источник"] --> Parameters(["Параметры"])\n  Parameters --> Result(("Результат"))\n```'
const changed = '```mermaid\nflowchart TB\n  Source["Источник"] --> Result(("Результат"))\n```'

function MermaidExample() {
  const [alternate, setAlternate] = useState(false)
  return <section style={css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    gap: 12px;
    padding: 12px;
  `}>
    <Button
      label="Изменить диаграмму"
      onClick={() => setAlternate(value => !value)}
    />
    <Markdown source={alternate ? changed : initial} />
  </section>
}

export function createMermaidStory(document: Document) {
  return mountOwnerStory(document, MermaidExample as unknown as CompiledTemplate<{}>, {}, "mermaid", [
    'import {Markdown} from "@webxr/markdown"',
    `const source = ${JSON.stringify(initial)}`,
    'export function Example() {',
    '  return <Markdown source={source} />',
    '}',
  ].join("\n"))
}

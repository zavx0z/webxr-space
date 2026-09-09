import type {Document as SemanticDocument} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {Markdown} from "@webxr/markdown"
import {mountOwnerStory} from "../story-types.ts"

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

export function createCompiledCrossBlockSelectionStory(document: SemanticDocument) {
  return mountOwnerStory(document, CrossBlockSelectionStory as unknown as CompiledTemplate<{}>,
    {}, "cross-block-selection", [
      'import {Markdown} from "@webxr/markdown"',
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

import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {Markdown} from "@webxr/markdown"

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

/**
Составляет обычный текст, {@link Markdown} и {@link CodeEditor} в одном дереве для проверки сквозного выделения.
Последний редактор принимает вставку; selection и clipboard остаются ответственностью платформы.
*/
export function CrossBlockSelectionFixture() {
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

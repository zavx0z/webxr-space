import {useRef} from "@zavx0z/component"
import {Button} from "@zavx0z/ui/buttons/button"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"

export const codeEditorScrollSource = Array.from({length: 420}, (_, index) =>
  `        <span data-z-ycf0xbqihmrwdwse="" data-major="true" class="source-row-${index}">HTML source ${index}</span>`,
).join("\n")

type ScrollStoryProps = Readonly<{compact: boolean}>

export function CodeEditorScrollFixture(props: ScrollStoryProps) {
  const container = useRef<HTMLElement | null>(null)
  const editor = () => container.current?.querySelector<HTMLElement>('section[role="region"]')
  return <section
    aria-label="Прокрутка большого исходника"
    style={css`
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 940px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <h3
      style={css`
        margin: 0;
        font-size: 18px;
        line-height: 24px;
      `}
    >
      HTML · 420 строк
    </h3>
    <p
      style={css`
        margin: 0;
        line-height: 20px;
        white-space: normal;
      `}
    >
      Прокручивайте код по обеим осям колесом или кнопками. Соседняя панель должна оставаться на месте.
    </p>
    <div
      role="group"
      aria-label="Прокрутка исходника"
      style={css`
        display: flex;
        gap: 8px;
      `}
    >
      <Button
        label="Вниз на 320 px"
        onClick={() => {
          const element = editor()
          if (element) element.scrollTop += 320
        }}
      />
      <Button
        label="Вправо на 80 px"
        onClick={() => {
          const element = editor()
          if (element) element.scrollLeft += 80
        }}
      />
      <Button
        label="В начало"
        onClick={() => {
          const element = editor()
          if (!element) return
          element.scrollTop = 0
          element.scrollLeft = 0
        }}
      />
    </div>
    <div
      ref={element => { container.current = element }}
      style={css`
        display: flex;
        align-items: flex-start;
        gap: 16px;
      `}
    >
      <CodeEditor
        value={codeEditorScrollSource}
        languageId="html"
        readOnly={true}
        title={props.compact ? "HTML · 420 строк" : undefined}
        style={css`
          width: 700px;
          height: 440px;
          flex-shrink: 0;

          ${props.compact && css`
            height: 180px;
          `}
        `}
      />
      <aside
        aria-label="Неподвижная соседняя панель"
        style={css`
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 180px;
          padding: 12px;
          border: var(--border-width-control) solid var(--editor-border);
          border-radius: 8px;
          background: var(--editor-background);
        `}
      >
        <strong>Неподвижная панель</strong>
        <p
          style={css`
            margin: 0;
            white-space: normal;
            line-height: 20px;
          `}
        >
          Прокрутка изменяет только область кода. Текст, номера строк и соседняя панель принадлежат одному документу.
        </p>
      </aside>
    </div>
  </section>
}

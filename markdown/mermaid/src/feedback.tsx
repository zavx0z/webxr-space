import {CodeEditor} from "@zavx0z/ui/views/code-editor"

/**
Сообщает через role=status, что разбор или измерение диаграммы ещё не завершены.
*/
export function MermaidLoading() {
  return <p role="status">Подготовка Mermaid-диаграммы…</p>
}

/**
Показывает ошибку разбора через role=alert рядом с исходником в {@link CodeEditor} только для чтения.

@param props - Исходник без ограждения и текст перехваченной ошибки; source передаётся {@link CodeEditor} без исполнения.
*/
export function MermaidError(props: Readonly<{
  source: string
  error: string
}>) {
  return <div>
    <p role="alert">{props.error}</p>
    <CodeEditor
      value={props.source}
      languageId="mermaid"
      readOnly={true}
      style={css`
        width: 100%;
        height: auto;
      `}
    />
  </div>
}

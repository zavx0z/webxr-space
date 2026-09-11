import type {TypeDocDeclaration} from "../../shared/types/model.ts"
import {CodeView} from "./code-view.tsx"
import {Description} from "./text-content.tsx"
import {Members} from "./members.tsx"

/**
Выводит блоки примеров в порядке документа через Markdown, сохраняя ограждения кода.

@param props - Markdown-блоки examples из {@link TypeDocDeclaration.comment} в исходном порядке; код в примерах не исполняется.
*/
function Examples(props: Readonly<{examples: readonly string[]}>) {
  return <section
    data-typedoc-examples=""
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex-shrink: 0;
      gap: 12px;

      & [data-typedoc-heading="3"] {
        margin: 0;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        font-size: 17px;
        font-weight: 700;
      }
    `}
  >
    <h3 data-typedoc-heading="3">Примеры</h3>
    {props.examples.map((example, index) => <Description
      key={index}
      source={example}
    />)}
  </section>
}

/**
Составляет один раздел справочника из исходной сигнатуры и эффективных полей.
Пустые описания, списки полей и примеров не создают вспомогательных разделов.

@param props - Одна {@link TypeDocDeclaration}; signature и members сохраняют разные роли исходного текста и эффективного типа.
*/
export function Declaration(props: Readonly<{declaration: TypeDocDeclaration}>) {
  const declaration = props.declaration
  return <section
    data-typedoc-declaration={declaration.name}
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex-shrink: 0;
      padding-top: 20px;
      border-top: 1px solid var(--editor-border);
      gap: 12px;

      & [data-typedoc-label] {
        margin: 0;
        font-size: 11px;
      }

      & [data-typedoc-heading="2"] {
        margin: 0;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.3;
      }

      & [data-typedoc-signature] {
        min-width: 0;
        max-width: 100%;
      }
    `}
  >
    <header>
      <p data-typedoc-label="">{declaration.kind}</p>
      <h2 data-typedoc-heading="2">{declaration.name}</h2>
    </header>
    <div data-typedoc-signature="">
      <CodeView
        value={declaration.signature}
        title={declaration.name}
      />
    </div>
    {declaration.comment.summary ? <Description
      source={declaration.comment.summary}
    /> : null}
    {declaration.members.length > 0 ? <Members members={declaration.members} /> : null}
    {declaration.comment.examples.length > 0 ? <Examples
      examples={declaration.comment.examples}
    /> : null}
  </section>
}

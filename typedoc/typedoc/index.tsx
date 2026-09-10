/**
Справочник типов внутри существующего HTML-like/WebGPU Experience.

Декларации и поля остаются структурированной моделью. Markdown используется
только для авторских описаний и примеров; разбор TypeScript принадлежит parser.

@packageDocumentation
*/
import {Markdown} from "@webxr/markdown"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import type {TypeDocDeclaration, TypeDocDocument, TypeDocMember} from "../shared/model.ts"

/**
Вход готового справочника без объектов компилятора и собственного viewport.

@property document - Неизменяемый снимок разобранных деклараций.
Обновление сохраняет корневой Element; имена деклараций и полей служат ключами.

@property [title] - Видимый заголовок вместо `document.name`.

@property [style] - Финальный CSS override корневого article.
Высоту и прокрутку обычно задаёт родительская область Experience.
*/
export type TypeDocProps = Readonly<{
  document: TypeDocDocument
  title?: string | undefined
  style?: CssStyle | undefined
}>

function Description(props: Readonly<{source: string}>) {
  return <Markdown
    source={props.source}
    style={css`
      overflow: visible;
      font-size: inherit;
      line-height: inherit;
    `}
  />
}

function CodeView(props: Readonly<{value: string; title: string}>) {
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

/**
Отображает декларации, сигнатуры, поля и примеры в одном корневом article.
Не создаёт Document, Canvas, Renderer или собственный цикл кадров.
*/
export function TypeDoc(props: TypeDocProps) {
  return <article
    data-typedoc=""
    aria-label={props.title ?? props.document.name}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      width: 100%;
      min-width: 0;
      padding: 20px;
      gap: 24px;
      color: var(--widget-regular-content);
      font-size: 13px;
      line-height: 1.5;
      white-space: normal;
      overflow-wrap: anywhere;

      & [data-typedoc-heading="1"] {
        margin: 0;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        font-size: 26px;
        font-weight: 700;
        line-height: 1.25;
      }

      & [data-typedoc-label] {
        margin: 0;
        font-size: 11px;
      }

      ${props.style}
    `}
  >
    <header>
      <p data-typedoc-label="">Контракт</p>
      <h1 data-typedoc-heading="1">{props.title ?? props.document.name}</h1>
    </header>
    {props.document.declarations.length === 0 ? <EmptyDocument /> : null}
    {props.document.declarations.map(declaration => <Declaration
      key={declaration.name}
      declaration={declaration}
    />)}
  </article>
}

function EmptyDocument() {
  return <p>В этом документе нет деклараций типов.</p>
}

function OptionalLabel() {
  return <p
    data-typedoc-label=""
    style={css`
      margin: 0;
      font-size: 11px;
    `}
  >
    Необязательное
  </p>
}

function DefaultValue(props: Readonly<{value: string}>) {
  return <div
    data-typedoc-default-row=""
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 4px;

      & [data-typedoc-default] {
        display: block;
        min-width: 0;
        max-width: 100%;
      }
    `}
  >
    <span>По умолчанию:</span>
    <div data-typedoc-default="">
      <CodeView
        value={props.value}
        title="Значение по умолчанию"
      />
    </div>
  </div>
}

function Member(props: Readonly<{member: TypeDocMember}>) {
  const member = props.member
  const optionalMark = member.optional ? "?" : ""
  return <section
    data-typedoc-member={member.name}
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex-shrink: 0;
      padding: 12px;
      border-left: 2px solid var(--editor-border);
      gap: 8px;

      & [data-typedoc-heading="4"] {
        margin: 0;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        font-size: 14px;
        font-weight: 700;
      }

      & [data-typedoc-type] {
        display: block;
        min-width: 0;
        max-width: 100%;
      }
    `}
  >
    <h4 data-typedoc-heading="4">
      <code>{member.name}{optionalMark}</code>
    </h4>
    {member.optional ? <OptionalLabel /> : null}
    <div data-typedoc-type="">
      <CodeView
        value={member.type}
        title={member.name}
      />
    </div>
    {member.description ? <Description source={member.description} /> : null}
    {member.defaultValue !== undefined ? <DefaultValue
      value={member.defaultValue!}
    /> : null}
  </section>
}

function Members(props: Readonly<{members: readonly TypeDocMember[]}>) {
  return <section
    data-typedoc-members=""
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
    <h3 data-typedoc-heading="3">Поля</h3>
    {props.members.map(member => <Member
      key={member.name}
      member={member}
    />)}
  </section>
}

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

function Declaration(props: Readonly<{declaration: TypeDocDeclaration}>) {
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

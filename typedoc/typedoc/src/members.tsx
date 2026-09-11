import type {TypeDocMember} from "../../shared/types/model.ts"
import {CodeView} from "./code-view.tsx"
import {Description} from "./text-content.tsx"

/**
Показывает признак необязательности, установленный parser по типу поля или элемента tuple.
*/
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

/**
Показывает документированный default как TypeScript-код, не вычисляя его значение.

@param props - Текст value из {@link TypeDocMember.defaultValue}; пустая строка тоже считается присутствующим default.
*/
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

/**
Составляет строку поля или элемента tuple с типом, обязательностью и Markdown-описанием.
Раздел default выводится только при наличии defaultValue, включая пустую строку.

@param props - Одна запись {@link TypeDocMember}; тип, optional и описание уже подготовлены parser.
*/
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

/**
Группирует эффективные поля декларации и сохраняет их имена как ключи JSX-строк.

@param props - Массив {@link TypeDocMember} в порядке parser; имена используются как ключи внутри декларации.
*/
export function Members(props: Readonly<{members: readonly TypeDocMember[]}>) {
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

import type {TypeDocDocument} from "../shared/types/model.ts"

/** Узкая вкладка должна вмещать длинные типы, описание и многострочную сигнатуру. */
export const contractDocument: TypeDocDocument = {
  name: "DiagramNode",
  declarations: [{
    name: "DiagramNodeProps",
    kind: "type",
    signature: "type DiagramNodeProps = Readonly<{\n  title: string\n  collapsed?: boolean\n}>",
    comment: {
      summary: "Составляет **диаграмму** в общем документе. Описание с `inline code` должно переноситься по ширине области и сохранять читаемую высоту строки.",
      examples: ["```tsx\n<DiagramNode title=\"Пример\" />\n```"],
    },
    members: [{
      name: "title",
      type: "string",
      optional: false,
      description: "Видимое **название** и [описание](https://example.com/docs).",
    }, {
      name: "collapsed",
      type: "boolean",
      optional: true,
      description: "Сворачивает `содержимое`, сохраняя состояние компонента.",
      defaultValue: "false",
    }, {
      name: "onChange",
      type: "Readonly<{parameterWithAnIntentionallyLongUnbrokenIdentifier: string; update: (value: Readonly<Record<string, unknown>>) => void}>",
      optional: true,
      description: "Принимает новое значение, которое пользователь изменил через интерфейс, и сохраняет его в модели приложения.",
    }],
  }, {
    name: "Selection",
    kind: "interface",
    signature: "interface Selection { selected: boolean }",
    comment: {summary: "Текущее выделение.", examples: []},
    members: [{name: "selected", type: "boolean", optional: false, description: ""}],
  }],
}

/** Обычный текст переносится по словам; короткая сигнатура сохраняет строки. */
export const proseDocument: TypeDocDocument = {
  name: "Контракт",
  declarations: [{
    name: "Props",
    kind: "interface",
    signature: "interface Props {\n  title: string\n}",
    comment: {summary: contractDocument.declarations[0]!.comment.summary, examples: []},
    members: [{
      name: "title",
      type: "string",
      optional: false,
      description: "Текстовое описание поля должно полностью помещаться внутри своей секции и переноситься при изменении доступной ширины области.",
    }],
  }],
}

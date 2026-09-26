/**
Текстовая часть документации, общая для parser и представления {@link @webxr/typedoc#TypeDoc | TypeDoc}.
Сохраняет Markdown без ссылок на AST и без исполнения примеров.

@property summary - Описание декларации и содержимое @remarks без тегов полей.
Пустая строка означает отсутствие текста; представление скрывает этот раздел.

@property examples - Содержимое блоков @example в порядке исходника.
Ограждения кода сохраняются для последующего отображения через Markdown.
*/
export interface TypeDocComment {
  readonly summary: string
  readonly examples: readonly string[]
}

/**
Строка {@link TypeDocDeclaration} для эффективного свойства объекта или элемента кортежа.
Тип и обязательность вычисляет TypeScript; описание и default берутся из документации.

@property name - Имя свойства, метка элемента tuple или его индекс с нуля без метки.
Представление использует имя как ключ строки внутри декларации.

@property type - TypeScript-текст для подсветки, уже разрешённый в контексте декларации.

@property optional - Признак необязательности из типа, а не из оформления @property.

@property description - Markdown из @property, собственного комментария поля или наследуемого описания.
Пустая строка не создаёт раздел описания.

@property [defaultValue] - Текст после `=` в документированном `[name=value]`.
Не вычисляется и не подтверждает фактическую инициализацию во время исполнения.

@property [children] - Поля вложенного объектного типа или элементы коллекции.
Отсутствует у конечных строк, включая остановленные из-за рекурсии или лимита обхода;
массив представляет свой тип элемента единственной строкой с именем `[]`.
*/
export interface TypeDocMember {
  readonly name: string
  readonly type: string
  readonly optional: boolean
  readonly description: string
  readonly defaultValue?: string
  readonly children?: readonly TypeDocMember[]
}

/**
Одна экспортированная декларация в сериализуемой модели справочника.
Связывает исходную сигнатуру с разрешёнными компилятором полями.

@property name - Имя экспорта выбранного модуля, включая имя после реэкспорта.
Может отличаться от имени исходного объявления; служит ключом в TypeDoc.

@property kind - Форма исходного объявления до разрешения alias.

@property signature - Текст исходного объявления с его TypeScript-синтаксисом.
Не заменяется развёрнутой формой эффективного типа.

@property comment - Авторское описание и примеры в {@link TypeDocComment}, без обзора модуля.

@property members - Строки {@link TypeDocMember} для эффективного типа в порядке компилятора.
Включает наследование и mapped types; для скаляров и стандартных Promise-оболочек
остаётся пустым, без методов boxed-значений и методов Promise.

@property [schema] - JSON Schema того же разрешённого типа с описаниями из TSDoc.
Parser заполняет схему; вручную подготовленная модель представления может её не содержать.
*/
export interface TypeDocDeclaration {
  readonly name: string
  readonly kind: "type" | "interface"
  readonly signature: string
  readonly comment: TypeDocComment
  readonly members: readonly TypeDocMember[]
  readonly schema?: TypeDocSchema
}

/**
Готовый справочник одного исходного файла для {@link @webxr/typedoc#TypeDoc | TypeDoc}.
Не удерживает сессию TypeScript и может передаваться через JSON.

@property name - Имя входного файла без директорий; используется как заголовок по умолчанию.

@property declarations - Записи {@link TypeDocDeclaration} в порядке обхода экспортов компилятором.
Parser отклоняет файл без таких объявлений; вручную собранный пустой документ
компонент показывает отдельным сообщением.
*/
export interface TypeDocDocument {
  readonly name: string
  readonly declarations: readonly TypeDocDeclaration[]
}

/**
Снимок зависимости {@link TypeDocDocument} для проверки актуальности перед публикацией.
Parser записывает исходник и посещённые объявления, включая зависимости типов.

@property path - Абсолютный путь прочитанного TypeScript-источника.

@property digest - SHA-256 текста SourceFile в шестнадцатеричной записи.
Потребитель сравнивает его с текущим содержимым; это не время изменения файла.
*/
export interface TypeDocSource {
  readonly path: string
  readonly digest: string
}

/** JSON Schema 2020-12 для JSON-значений TypeScript-контракта. */
export interface TypeDocSchema {
  readonly type?: string
  readonly description?: string
  readonly const?: string | number | boolean | null
  readonly enum?: readonly (string | number | boolean | null)[]
  readonly properties?: Readonly<Record<string, TypeDocSchema>>
  readonly required?: readonly string[]
  readonly items?: TypeDocSchema | boolean
  readonly prefixItems?: readonly TypeDocSchema[]
  readonly minItems?: number
  readonly maxItems?: number
  readonly additionalProperties?: TypeDocSchema | boolean
  readonly anyOf?: readonly TypeDocSchema[]
  readonly allOf?: readonly TypeDocSchema[]
  readonly not?: TypeDocSchema
  readonly $ref?: string
}

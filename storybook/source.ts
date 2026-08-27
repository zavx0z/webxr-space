import type {StorybookStoryArgs, StorybookStorySource} from "@zavx0z/storybook/stories"

type ComponentStorySourceOptions = Readonly<{
  component: string
  section?: string
  variant: string
}>

type CssOwner = Readonly<{
  owner: string
  declarations: readonly string[]
  states?: Readonly<Record<string, readonly string[]>>
}>

type CssPath = Readonly<{
  selector?: `&${string}`
  label: string
  owners: readonly CssOwner[]
  story?: readonly string[]
}>

const divOwner: CssOwner = {
  owner: "@ui/elements/div",
  declarations: [
    "background: transparent;",
    "border-color: transparent;",
    "border-radius: 4px;",
    "border-width: 1px;",
    "overflow: visible;",
    "padding: 0;",
  ],
}

const spanOwner: CssOwner = {
  owner: "@ui/elements/span",
  declarations: [
    "color: var(--ui-text);",
    "font-size: 12px;",
    "opacity: 1;",
    "text-align: left;",
  ],
}

const buttonOwner: CssOwner = {
  owner: "@ui/elements/button",
  declarations: [
    "border-radius: 4px;",
    "border-width: 1px;",
    "font-size: 11px;",
    "gap: 3px;",
    "height: 22px;",
    "padding-inline: 6px;",
  ],
  states: {
    idle: ["background: rgb(84 84 84);", "border-color: rgb(61 61 61);", "color: rgb(230 230 230);"],
    hover: ["background: rgb(101 101 101);", "border-color: rgb(70 70 70);", "color: white;"],
    active: ["background: rgb(71 114 179);", "border-color: rgb(61 61 61);", "color: white;"],
    disabled: ["background: rgb(84 84 84 / 50%);", "border-color: rgb(61 61 61 / 50%);", "color: rgb(230 230 230 / 50%);"],
  },
}

const inputOwner: CssOwner = {
  owner: "@ui/elements/input",
  declarations: [
    "border-radius: 4px;",
    "border-width: 1px;",
    "font-size: 11px;",
    "text-align: left;",
  ],
  states: {
    idle: ["background: rgb(29 29 29);", "border-color: rgb(61 61 61);", "color: rgb(230 230 230);"],
    hover: ["background: rgb(35 35 35);", "border-color: rgb(70 70 70);", "color: white;"],
    active: ["background: rgb(24 24 24);", "border-color: rgb(61 61 61);", "color: white;"],
    disabled: ["background: rgb(29 29 29 / 50%);", "border-color: rgb(61 61 61 / 50%);", "color: rgb(230 230 230 / 50%);"],
  },
}

const selectOwner: CssOwner = {
  owner: "@ui/elements/select",
  declarations: ["border-radius: 4px;", "border-width: 1px;", "font-size: 11px;"],
  states: {
    idle: ["background: rgb(40 40 40);", "border-color: rgb(61 61 61);", "color: rgb(230 230 230);"],
    hover: ["background: rgb(48 48 48);", "border-color: rgb(70 70 70);", "color: white;"],
    active: ["background: rgb(71 114 179 / 70%);", "border-color: rgb(61 61 61);", "color: white;"],
    open: ["background: rgb(71 114 179 / 70%);", "border-color: rgb(61 61 61);", "color: white;"],
    disabled: ["background: rgb(40 40 40 / 50%);", "border-color: rgb(61 61 61 / 50%);", "color: rgb(230 230 230 / 50%);"],
  },
}

const listOwner: CssOwner = {
  owner: "@ui/components/list",
  declarations: ["background: transparent;", "border-radius: 0;", "overflow-y: auto;", "padding: 0;"],
}

/** Adds native semantic HTML and complete raw CSS without changing the exact runtime example. */
export function componentStorySource(
  options: ComponentStorySourceOptions,
  args: StorybookStoryArgs,
  typescript: string,
): StorybookStorySource {
  return Object.freeze({
    html: componentHtml(options, args),
    css: renderCss(rootSelector(options.component), componentCssPaths(options, args)),
    typescript,
  })
}

function componentHtml(options: ComponentStorySourceOptions, args: StorybookStoryArgs): string {
  const component = options.component
  const label = escapeHtml(stringArg(args, "label", defaultLabel(component)))
  const disabled = booleanArg(args, "disabled") ? " disabled" : ""
  const readOnly = booleanArg(args, "readonly") || booleanArg(args, "read-only")
  const readonly = readOnly ? " readonly" : ""
  const ariaReadonly = readOnly ? ' aria-readonly="true"' : ""
  const checked = booleanArg(args, "checked") ? " checked" : ""
  const value = escapeHtml(valueArg(args, "value", component.includes("number") || component === "slider-control" ? "0.62" : label))
  if (component === "button") return `<button class="button" type="button"${disabled}>${buttonContent(args, label)}</button>`
  if (component === "pane") return `<section class="pane pane--${escapeHtml(stringArg(args, "variant", options.variant))}"><h2>Рабочая панель</h2><p>Содержимое панели</p></section>`
  if (component === "badge") return `<span class="badge" role="status">${label}</span>`
  if (component === "typography") return `<p class="typography">${label}</p>`
  if (component === "divider") return `<hr class="divider divider--${escapeHtml(options.variant)}">`
  if (component === "control-group") return [
    '<fieldset class="control-group">',
    '  <input class="control" type="text" value="1">',
    '  <input class="control" type="text" value="2">',
    '  <input class="control" type="text" value="3">',
    "</fieldset>",
  ].join("\n")
  if (component === "field") return fieldHtml(options, args)
  if (component === "text-field") return `<input class="text-field" type="text" value="${label}"${disabled}${readonly}>`
  if (component === "number-input" || component === "integer-input") return `<input class="${component}" type="number" value="${value}"${disabled}${readonly}>`
  if (component === "color-input") return [
    '<label class="color-input">',
    '  <span class="label">Цвет</span>',
    `  <input class="trigger" type="color" value="#2f94eb"${disabled}${ariaReadonly}>`,
    '  <div class="popup" popover>RGBA picker</div>',
    "</label>",
  ].join("\n")
  if (component === "vector-input") return numericGroupHtml("vector-input", ["X", "Y", "Z"], args, disabled, readonly)
  if (component === "matrix-input") return numericGroupHtml("matrix-input", ["X1", "X2", "Y1", "Y2"], args, disabled, readonly)
  if (component === "reference-input") return [
    '<div class="reference-input">',
    `  <button class="control" type="button"${disabled}>Кирпичная текстура</button>`,
    `  <button class="pick" type="button" aria-label="Выбрать ресурс"${disabled}>…</button>`,
    `  <button class="clear" type="button" aria-label="Очистить"${disabled}>×</button>`,
    "</div>",
  ].join("\n")
  if (component === "enum-input") return enumHtml(args, disabled, ariaReadonly)
  if (component === "collection-input") return collectionHtml(args, disabled, ariaReadonly)
  if (component === "path-input") return [
    '<label class="path-input">',
    '  <span class="label">Файл</span>',
    `  <input class="control" type="text" value="${escapeHtml(stringArg(args, "value", ""))}"${disabled}${readonly}>`,
    `  <button class="browse" type="button" aria-label="Выбрать файл"${disabled}>…</button>`,
    "</label>",
  ].join("\n")
  if (component === "checkbox") return `<label class="checkbox"><input type="checkbox"${checked}${disabled}> ${label}</label>`
  if (component === "switcher") return `<button class="switcher" type="button" role="switch" aria-checked="${booleanArg(args, "checked")}"${disabled}>${label}</button>`
  if (component === "progress-checkbox") return `<label class="progress-checkbox"><input type="checkbox"${checked}${disabled}><progress max="100" value="${numberArg(args, "value", 64)}"></progress>${label}</label>`
  if (component === "slider-control") return `<label class="slider-control"><span class="label">${label}</span><input class="track" type="range" min="0" max="1" value="${value}"${disabled}><output class="value">${value}</output></label>`
  if (component === "code-editor") return `<pre class="code-editor"><code>${escapeHtml('const story = {id: "read-only"}')}</code></pre>`
  if (component === "list") return '<ul class="list"><li class="item">Engine</li><li class="item" aria-selected="true">Layout</li><li class="item">UI</li></ul>'
  if (component === "table") return [
    '<table class="table">',
    '  <thead><tr><th>Компонент</th><th>Владелец</th></tr></thead>',
    '  <tbody><tr><td>Button</td><td>@ui/components</td></tr></tbody>',
    "</table>",
  ].join("\n")
  if (component === "scrollbar") return '<div class="scrollbar" role="scrollbar" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="24"><span class="thumb"></span></div>'
  if (component === "inspector") return inspectorHtml()
  return '<output class="noti" role="status">Компонент пока не опубликован</output>'
}

function fieldHtml(options: ComponentStorySourceOptions, args: StorybookStoryArgs): string {
  const kind = options.section ?? "text"
  const disabled = booleanArg(args, "disabled") ? " disabled" : ""
  const readonly = booleanArg(args, "readonly") ? " readonly" : ""
  const label = escapeHtml(stringArg(args, "label", kind === "integer" ? "Iterations" : "Значение"))
  if (kind === "boolean") return `<label class="field field--boolean"><span class="label">${label}</span><input class="control" type="checkbox"${booleanArg(args, "value") ? " checked" : ""}${disabled}></label>`
  if (kind === "enum") return `<label class="field field--enum"><span class="label">${label}</span><select class="control"${disabled}><option selected>Умножение</option></select></label>`
  if (kind === "color") return `<label class="field field--color"><span class="label">${label}</span><input class="control" type="color" value="#2f94eb"${disabled}></label>`
  if (kind === "vector" || kind === "rotation" || kind === "matrix") return `<fieldset class="field field--${kind}"><legend class="label">${label}</legend>${numericInputs(args, kind === "matrix" ? 4 : 3, disabled, readonly)}</fieldset>`
  if (kind === "collection") return `<fieldset class="field field--collection"><legend class="label">${label}</legend><select class="control" multiple${disabled}><option selected>Позиция</option><option>Вращение</option></select></fieldset>`
  if (kind === "reference") return `<label class="field field--reference"><span class="label">${label}</span><button class="control" type="button"${disabled}>Кирпичная текстура</button></label>`
  const type = kind === "number" || kind === "integer" ? "number" : kind === "path" ? "text" : "text"
  return `<label class="field field--${escapeHtml(kind)}"><span class="label">${label}</span><input class="control" type="${type}" value="${escapeHtml(valueArg(args, "value", ""))}"${disabled}${readonly}></label>`
}

function enumHtml(args: StorybookStoryArgs, disabled: string, ariaReadonly: string): string {
  if (stringArg(args, "presentation", "cycle") === "expanded") return [
    '<fieldset class="enum-input enum-input--expanded">',
    '  <legend class="label">Операция</legend>',
    `  <button class="option" type="button"${disabled}>Сложение</button>`,
    `  <button class="option" type="button" aria-pressed="true"${disabled}>Умножение</button>`,
    `  <button class="option" type="button"${disabled}>Вычитание</button>`,
    "</fieldset>",
  ].join("\n")
  return `<label class="enum-input"><span class="label">Операция</span><select class="control"${disabled}${ariaReadonly}><option>Сложение</option><option selected>Умножение</option><option>Вычитание</option></select></label>`
}

function collectionHtml(args: StorybookStoryArgs, disabled: string, ariaReadonly: string): string {
  const items = Array.isArray(args.items) ? args.items : []
  const rows = items.length === 0
    ? ['    <li class="item item--empty">Нет элементов</li>']
    : items.slice(0, 3).map((item, index) => `    <li class="item"${index === 2 ? ' aria-selected="true"' : ""}>${escapeHtml(itemLabel(item, index))}</li>`)
  return [
    `<div class="collection-input"${ariaReadonly}>`,
    '  <ul class="list">',
    ...rows,
    "  </ul>",
    '  <div class="actions">',
    `    <button type="button" aria-label="Добавить"${disabled}>+</button>`,
    `    <button type="button" aria-label="Удалить"${disabled}>−</button>`,
    "  </div>",
    "</div>",
  ].join("\n")
}

function inspectorHtml(): string {
  return [
    '<aside class="inspector">',
    '  <header class="toolbar"><input type="search" placeholder="Поиск"></header>',
    '  <div class="body">',
    '    <nav class="rail" aria-label="Категории">',
    '      <button type="button" aria-pressed="true">Код</button>',
    '      <button type="button">События</button>',
    "    </nav>",
    '    <main class="content">',
    '      <div class="context">Button</div>',
    '      <div class="sections">',
    '        <section class="section"><button class="section-header" type="button" aria-expanded="true">HTML</button><div class="section-content">Разметка</div></section>',
    '        <section class="section"><button class="section-header" type="button" aria-expanded="true">CSS</button><div class="section-content">Стили</div></section>',
    "      </div>",
    "    </main>",
    "  </div>",
    "</aside>",
  ].join("\n")
}

function componentCssPaths(options: ComponentStorySourceOptions, args: StorybookStoryArgs): readonly CssPath[] {
  const component = options.component
  const rootOwners = componentRootOwners(component, options, args)
  const root: CssPath = {
    label: `${component} root`,
    owners: rootOwners,
    story: componentStoryDeclarations(component, options, args),
  }
  return [root, ...componentPartPaths(component, options, args)]
}

function componentRootOwners(component: string, options: ComponentStorySourceOptions, args: StorybookStoryArgs): readonly CssOwner[] {
  if (component === "button") return [divOwner, buttonOwner, owner("@ui/components/button#Button", buttonComponentDeclarations(args), componentStates("button"))]
  if (component === "pane") return [divOwner, owner("@ui/components/pane#Pane", ["background: var(--ui-glass);", "border-color: var(--ui-border-dim);", "border-radius: 4px;", "padding: 20px;"], {idle: ["outline-color: var(--ui-editor-outline);"], active: ["outline-color: var(--ui-editor-outline-active);"]})]
  if (component === "badge") return [owner("@ui/components/internal/renderers#badge", ["background: var(--ui-badge-fill);", "border-radius: 4px;", "color: var(--ui-badge-text);", "font-size: 11px;", "padding-inline: 6px;"]), owner("@ui/components/badge#Badge", [])]
  if (component === "typography") return [spanOwner, owner("@ui/components/typography#Typography", ["color: var(--ui-text);", "font-size: 12px;"])]
  if (component === "divider") return [spanOwner, owner("@ui/components/internal/renderers#divider", ["background: var(--ui-border-rule);", "block-size: 1px;"]), owner("@ui/components/divider#Divider", ["margin-inline: 0;"])]
  if (component === "control-group") return [divOwner, owner("@ui/components/control-group#ControlGroup", ["background: var(--ui-control-group);", "border-color: var(--ui-control-outline);", "border-radius: 4px;", "display: flex;", "flex-direction: column;", "gap: 0;"])]
  if (component === "field") return [divOwner, owner("@ui/components/field#Field", ["background: transparent;", "border-color: transparent;", "border-radius: 4px;", "display: flex;", "gap: 4px;", "padding: 0;"])]
  if (component === "text-field") return [inputOwner, owner("@ui/components/text-field#TextField", [])]
  if (component === "number-input") return [inputOwner, owner("@ui/components/text-field#TextField", []), owner("@ui/components/number-input#NumberInput", ["font-variant-numeric: tabular-nums;"])]
  if (component === "integer-input") return [inputOwner, owner("@ui/components/text-field#TextField", []), owner("@ui/components/number-input#NumberInput", ["font-variant-numeric: tabular-nums;"]), owner("@ui/components/integer-input#IntegerInput", [])]
  if (component === "color-input") return [divOwner, owner("@ui/components/color-input#ColorInput", ["background: transparent;", "border-color: transparent;", "border-radius: 4px;", "display: flex;", "padding: 0;"])]
  if (component === "vector-input") return [divOwner, owner("@ui/components/control-group#ControlGroup", ["border-radius: 4px;", "display: flex;", "flex-direction: column;", "gap: 0;"]), owner("@ui/components/vector-input#VectorInput", ["display: flex;", "flex-direction: column;"])]
  if (component === "matrix-input") return [divOwner, owner("@ui/components/control-group#ControlGroup", ["border-radius: 4px;", "display: flex;", "flex-direction: column;", "gap: 0;"]), owner("@ui/components/matrix-input#MatrixInput", ["display: flex;", "flex-direction: column;"])]
  if (component === "reference-input") return [divOwner, owner("@ui/components/control-group#ControlGroup", ["border-radius: 4px;", "display: flex;", "gap: 0;"]), owner("@ui/components/reference-input#ReferenceInput", [])]
  if (component === "enum-input") return [divOwner, stringArg(args, "presentation", "cycle") === "expanded" ? buttonOwner : selectOwner, owner("@ui/components/enum-input#EnumInput", ["background: transparent;", "border-color: transparent;", "border-radius: 4px;", "padding: 0;"], {open: ["z-index: var(--ui-z-popover);"]})]
  if (component === "collection-input") return [divOwner, owner("@ui/components/collection-input#CollectionInput", ["background: transparent;", "border-color: transparent;", "border-radius: 4px;", "display: flex;", "gap: 3px;", "padding: 0;"])]
  if (component === "path-input") return [divOwner, owner("@ui/components/control-group#ControlGroup", ["border-radius: 4px;", "display: flex;", "gap: 0;"]), owner("@ui/components/path-input#PathInput", [])]
  if (component === "checkbox") return [buttonOwner, owner("@ui/components/checkbox#Checkbox", ["background: transparent;", "border-color: transparent;", "border-radius: 0;", "padding: 0;"], {idle: ["opacity: 1;"], hover: ["filter: brightness(1.08);"], active: ["filter: brightness(0.92);"], selected: ["color: var(--ui-selected);"], disabled: ["opacity: 0.5;"]})]
  if (component === "switcher") return [buttonOwner, owner("@ui/components/switcher#Switcher", ["border-radius: 4px;", "min-inline-size: 44px;"], {idle: ["background: var(--ui-toggle-off);"], hover: ["filter: brightness(1.08);"], active: ["filter: brightness(0.92);"], selected: ["background: var(--ui-toggle-on);"], disabled: ["opacity: 0.5;"]})]
  if (component === "progress-checkbox") return [buttonOwner, owner("@ui/components/checkbox#Checkbox", ["border-radius: 4px;"]), owner("@ui/components/progress-checkbox#ProgressCheckbox", ["accent-color: var(--ui-progress);"])]
  if (component === "slider-control") return [divOwner, owner("@ui/components/slider-control#SliderControl", ["background: transparent;", "border-color: transparent;", "border-radius: 4px;", "display: flex;", "padding: 0;"])]
  if (component === "code-editor") return [divOwner, owner("@ui/components/pane#Pane", ["background: var(--ui-code-background);", "border-radius: 4px;", "overflow: auto;", "padding: 0;"]), owner("@ui/components/code-editor#CodeEditor", ["color: var(--ui-code-text);", "font-family: var(--ui-monospace);", "font-size: 12px;", "white-space: pre;"])]
  if (component === "list") return [divOwner, listOwner]
  if (component === "table") return [divOwner, owner("@ui/components/table#Table", ["background: transparent;", "border-collapse: collapse;", "border-radius: 0;", "font-size: 10px;", "overflow: auto;"])]
  if (component === "scrollbar") return [owner("@ui/elements/scrollbar", ["background: var(--ui-scrollbar-track);", "inline-size: 10px;"])]
  if (component === "inspector") return [divOwner, owner("@ui/components/pane#Pane", ["background: rgb(45 45 45);", "border-color: rgb(22 22 22);", "border-radius: 6px;", "overflow: hidden;", "padding: 0;"]), owner("@ui/components/inspector#Inspector", ["display: flex;", "flex-direction: column;"])]
  return [owner("@ui/components/storybook/stories/simple#noti-unavailable", ["color: var(--ui-muted);", "font-size: 13px;"])]
}

function componentPartPaths(component: string, options: ComponentStorySourceOptions, args: StorybookStoryArgs): readonly CssPath[] {
  if (component === "button") return [{selector: "& .icon", label: "button icon", owners: [owner("@ui/elements/icon", ["block-size: 16px;", "inline-size: 16px;"]), owner("@ui/components/button#Button.icon", ["flex: none;"])]}]
  if (component === "field") return [
    {selector: "& .label", label: "field label", owners: [spanOwner, owner("@ui/components/typography#Typography", ["color: var(--ui-text);", "font-size: 12px;"]), owner("@ui/components/field#Field.label", ["flex: 2 1 0;"])]},
    {selector: "& .control", label: "field control", owners: [fieldControlOwner(options.section ?? "text"), owner("@ui/components/field#Field.control", ["flex: 3 1 0;"])]},
  ]
  if (component === "vector-input" || component === "matrix-input") return [{
    selector: "& input",
    label: `${component} numeric cell`,
    owners: [
      inputOwner,
      owner("@ui/components/text-field#TextField", []),
      owner("@ui/components/number-input#NumberInput", ["font-variant-numeric: tabular-nums;"]),
      owner(`@ui/components/${component}#${component === "vector-input" ? "VectorInput" : "MatrixInput"}.cell`, ["min-inline-size: 0;"]),
    ],
  }]
  if (component === "control-group") return [{selector: "& .control", label: "control group cell", owners: [inputOwner, owner("@ui/components/control-group#ControlGroup.cell", ["border-radius: 0;", "flex: 1 1 0;"])]}]
  if (component === "color-input") return [
    {selector: "& .trigger", label: "color trigger", owners: [buttonOwner, owner("@ui/components/color-input#ColorInput.trigger", ["inline-size: 100%;"])]},
    {selector: "& .popup", label: "color popup", owners: [divOwner, owner("@ui/components/color-input#ColorInput.popup", ["background: var(--ui-menu);", "border-radius: 4px;", "padding: 8px;"])]},
  ]
  if (component === "enum-input") return [{selector: "& .option", label: "enum option", owners: [buttonOwner, owner("@ui/components/enum-input#EnumInput.option", ["flex: 1 1 0;"])]}]
  if (component === "collection-input") return [
    {selector: "& .list", label: "collection list", owners: [divOwner, listOwner, owner("@ui/components/collection-input#CollectionInput.list", ["min-block-size: 72px;"])]},
    {selector: "& .actions", label: "collection actions", owners: [divOwner, buttonOwner, owner("@ui/components/collection-input#CollectionInput.actions", ["display: flex;", "flex-direction: column;", "gap: 3px;"])]},
  ]
  if (component === "path-input") return [
    {selector: "& .control", label: "path text", owners: [inputOwner, owner("@ui/components/text-field#TextField", []), owner("@ui/components/path-input#PathInput.control", ["flex: 1 1 auto;"])]},
    {selector: "& .browse", label: "path action", owners: [buttonOwner, owner("@ui/components/button#IconButton", ["flex: none;"])]},
  ]
  if (component === "reference-input") return [
    {selector: "& .control", label: "reference value", owners: [buttonOwner, owner("@ui/components/reference-input#ReferenceInput.control", ["flex: 1 1 auto;"])]},
    {selector: "& .pick", label: "reference picker", owners: [buttonOwner, owner("@ui/components/button#IconButton", ["flex: none;"])]},
    {selector: "& .clear", label: "reference clear", owners: [buttonOwner, owner("@ui/components/button#IconButton", ["flex: none;"])]},
  ]
  if (component === "slider-control") return [
    {selector: "& .label", label: "slider label", owners: [spanOwner, owner("@ui/components/slider-control#SliderControl.label", ["font-size: 11px;"])]},
    {selector: "& .track", label: "slider track", owners: [owner("@ui/elements/control", ["background: var(--ui-track);", "border-radius: 3px;", "block-size: 5px;"]), owner("@ui/components/slider-control#SliderControl.track", [], {idle: ["filter: none;"], hover: ["filter: brightness(1.08);"], active: ["filter: brightness(0.92);"], disabled: ["opacity: 0.5;"]})]},
    {selector: "& .value", label: "slider value", owners: [spanOwner, owner("@ui/components/slider-control#SliderControl.value", ["font-size: 11px;", "text-align: right;"])]},
  ]
  if (component === "list") return [{selector: "& .item", label: "list item", owners: [divOwner, owner("@ui/components/list#ListItem", ["border-radius: 4px;", "padding: 0;"], {idle: ["background: transparent;"], hover: ["background: var(--ui-row-hover);"], active: ["background: var(--ui-row-active);"], selected: ["background: var(--ui-row-selected);"], disabled: ["opacity: 0.5;"]})]}]
  if (component === "table") return [
    {selector: "& thead", label: "table header", owners: [owner("@ui/components/table#Table.header", ["background: var(--ui-table-header);", "block-size: 27px;"])]},
    {selector: "& tbody tr", label: "table row", owners: [owner("@ui/components/table#Table.row", ["block-size: 24px;"], {idle: ["background: transparent;"], hover: ["background: var(--ui-row-hover);"], active: ["background: var(--ui-row-active);"], selected: ["background: var(--ui-row-selected);"], disabled: ["opacity: 0.5;"]})]},
  ]
  if (component === "scrollbar") return [{selector: "& .thumb", label: "scrollbar thumb", owners: [owner("@ui/elements/scrollbar#thumb", ["background: var(--ui-scrollbar-thumb);", "border-radius: 4px;", "display: block;"], {idle: ["opacity: 0.72;"], hover: ["opacity: 0.9;"], active: ["opacity: 1;"], disabled: ["opacity: 0.3;"]})]}]
  if (component === "code-editor") return [
    {selector: "& .gutter", label: "code gutter", owners: [divOwner, owner("@ui/components/code-editor#CodeEditor.gutter", ["background: var(--ui-code-gutter);", "color: var(--ui-code-line-number);"])]},
    {selector: "& code", label: "code body", owners: [spanOwner, owner("@ui/components/code-editor#CodeEditor.code", ["font-family: var(--ui-monospace);", "white-space: pre;"])]},
  ]
  if (component === "inspector") return inspectorPartPaths()
  return []
}

function inspectorPartPaths(): readonly CssPath[] {
  return [
    {selector: "& .toolbar", label: "inspector toolbar", owners: [divOwner, owner("@ui/components/inspector#Inspector.toolbar", ["background: rgb(45 45 45);", "block-size: 30px;", "border-radius: 0;", "display: flex;"])]},
    {selector: "& .body", label: "inspector body", owners: [divOwner, owner("@ui/components/inspector#Inspector.body", ["display: flex;", "min-block-size: 0;"])]},
    {selector: "& .rail", label: "inspector rail", owners: [divOwner, owner("@ui/components/inspector#Inspector.rail", ["background: rgb(24 24 24);", "border-radius: 0;", "inline-size: 30px;"])]},
    {selector: "& .content", label: "inspector content", owners: [divOwner, owner("@ui/components/inspector#Inspector.content", ["display: flex;", "flex: 1;", "flex-direction: column;", "min-inline-size: 0;"])]},
    {selector: "& .context", label: "inspector context", owners: [divOwner, owner("@ui/components/inspector#Inspector.context", ["background: rgb(45 45 45);", "block-size: 28px;"])]},
    {selector: "& .sections", label: "inspector sections", owners: [divOwner, owner("@ui/components/inspector#Inspector.sections", ["overflow-y: auto;", "padding: 7px;", "scrollbar-width: 4px;"])]},
    {selector: "& .section-header", label: "inspector section header", owners: [buttonOwner, owner("@ui/components/inspector#Inspector.sectionHeader", ["block-size: 26px;", "border-radius: 4px;"], {idle: ["background: rgb(61 61 61);"], hover: ["filter: brightness(1.08);"], active: ["filter: brightness(0.92);"], open: ["border-end-start-radius: 0;", "border-end-end-radius: 0;"], disabled: ["opacity: 0.5;"]})]},
    {selector: "& .section-content", label: "inspector section content", owners: [divOwner, owner("@ui/components/inspector#Inspector.sectionContent", ["background: rgb(61 61 61);", "border-radius: 4px;", "padding: 6px;"])]},
  ]
}

function renderCss(selector: string, paths: readonly CssPath[]): string {
  const root = paths.find((path) => path.selector === undefined)
  const parts = paths.filter((path) => path.selector !== undefined)
  const lines = [`${selector} {`]
  if (root !== undefined) lines.push(...renderCssPath(root, 2))
  for (const part of parts) lines.push(`  ${part.selector} {`, ...renderCssPath(part, 4), "  }")
  lines.push("}")
  return lines.join("\n")
}

function renderCssPath(path: CssPath, spaces: number): string[] {
  const indent = " ".repeat(spaces)
  const lines = [`${indent}/* Полная CSS-цепочка: ${path.label} */`]
  for (const [index, item] of path.owners.entries()) {
    lines.push(`${indent}/* ${index < path.owners.length - 1 ? "Унаследовано от" : "Задано в"} ${item.owner} */`)
    lines.push(...item.declarations.map((line) => `${indent}${line}`))
  }
  const states = new Set(path.owners.flatMap((item) => Object.keys(item.states ?? {})))
  for (const state of states) {
    lines.push(`${indent}&${stateSelector(state)} {`)
    for (const item of path.owners) {
      const declarations = item.states?.[state]
      if (declarations === undefined) continue
      lines.push(`${indent}  /* ${item.owner} */`, ...declarations.map((line) => `${indent}  ${line}`))
    }
    lines.push(`${indent}}`)
  }
  if ((path.story?.length ?? 0) > 0) {
    lines.push(`${indent}/* Переопределено в текущем сценарии */`, ...path.story!.map((line) => `${indent}${line}`))
  }
  return lines
}

function componentStoryDeclarations(component: string, options: ComponentStorySourceOptions, args: StorybookStoryArgs): readonly string[] {
  if (component === "button") {
    const variant = stringArg(args, "variant", options.variant)
    const size = stringArg(args, "size", "medium")
    return [
      `background: ${variant === "text" ? "transparent" : variant === "outlined" ? "transparent" : "var(--ui-button-fill)"};`,
      `border-color: ${variant === "text" ? "transparent" : "var(--ui-button-border)"};`,
      `height: ${size === "small" ? 18 : size === "large" ? 28 : 22}px;`,
      `font-size: ${size === "small" ? 10 : size === "large" ? 14 : 11}px;`,
    ]
  }
  if (component === "pane") {
    const variant = stringArg(args, "variant", options.variant)
    return [
      `background: ${variant === "filled" ? "var(--ui-bg-elevated)" : "var(--ui-glass)"};`,
      `border-color: ${variant === "outlined" ? "var(--ui-border-bright)" : "var(--ui-border-dim)"};`,
    ]
  }
  if (component === "typography") return ["text-align: center;"]
  if (component === "divider" && options.variant !== "full-width") return [`margin-inline: ${options.variant === "middle" ? "16px" : "12px 0"};`]
  if (component === "collection-input" || component === "path-input" || component === "enum-input") return [`gap: ${stringArg(args, "density", "regular") === "compact" ? 2 : 3}px;`]
  if (component === "checkbox" || component === "switcher" || component === "progress-checkbox") return booleanArg(args, "checked") ? ["accent-color: var(--ui-selected);"] : []
  return []
}

function buttonComponentDeclarations(args: StorybookStoryArgs): readonly string[] {
  const size = stringArg(args, "size", "medium")
  return [
    "align-items: center;",
    "display: flex;",
    "justify-content: center;",
    `font-size: ${size === "small" ? 10 : size === "large" ? 14 : 11}px;`,
  ]
}

function componentStates(component: string): Readonly<Record<string, readonly string[]>> {
  if (component === "button") return {
    idle: ["filter: none;"],
    hover: ["filter: brightness(1.08);"],
    active: ["filter: brightness(0.92);"],
    selected: ["background: var(--ui-selected);"],
    disabled: ["opacity: 0.5;"],
  }
  return {}
}

function fieldControlOwner(kind: string): CssOwner {
  if (kind === "enum") return selectOwner
  if (kind === "boolean") return owner("@ui/components/checkbox#Checkbox", ["border-radius: 4px;"], {idle: ["opacity: 1;"], hover: ["filter: brightness(1.08);"], active: ["filter: brightness(0.92);"], selected: ["color: var(--ui-selected);"], disabled: ["opacity: 0.5;"]})
  if (kind === "vector") return owner("@ui/components/vector-input#VectorInput", ["display: flex;", "flex-direction: column;"], inputLikeStates())
  if (kind === "rotation") return owner("@ui/components/vector-input#VectorInput", ["display: flex;", "flex-direction: column;"], inputLikeStates())
  if (kind === "matrix") return owner("@ui/components/matrix-input#MatrixInput", ["display: flex;", "flex-direction: column;"], inputLikeStates())
  if (kind === "collection") return owner("@ui/components/collection-input#CollectionInput", ["display: flex;"], {...inputLikeStates(), selected: ["background: var(--ui-row-selected);"]})
  if (kind === "reference") return owner("@ui/components/reference-input#ReferenceInput", ["display: flex;"], inputLikeStates())
  if (kind === "color") return owner("@ui/components/color-input#ColorInput", ["display: flex;"], {...inputLikeStates(), open: ["z-index: var(--ui-z-popover);"]})
  return inputOwner
}

function inputLikeStates(): Readonly<Record<string, readonly string[]>> {
  return {
    idle: ["filter: none;"],
    hover: ["filter: brightness(1.08);"],
    active: ["filter: brightness(0.92);"],
    disabled: ["opacity: 0.5;"],
  }
}

function owner(ownerName: string, declarations: readonly string[], states?: Readonly<Record<string, readonly string[]>>): CssOwner {
  return states === undefined ? {owner: ownerName, declarations} : {owner: ownerName, declarations, states}
}

function stateSelector(state: string): string {
  if (state === "hover") return ":hover"
  if (state === "active") return ":active"
  if (state === "disabled") return ':disabled, &[aria-disabled="true"]'
  if (state === "selected") return '[aria-selected="true"], &[aria-pressed="true"], &[aria-checked="true"]'
  if (state === "open") return '[aria-expanded="true"], &[data-state="open"]'
  return `[data-state="${state}"]`
}

function rootSelector(component: string): string {
  return `.${component}`
}

function buttonContent(args: StorybookStoryArgs, label: string): string {
  if (stringArg(args, "icon", "none") !== "apply") return label
  const icon = '<span class="icon" aria-hidden="true">✓</span>'
  if (label.length === 0) return icon
  return stringArg(args, "iconPosition", "start") === "end" ? `${label}${icon}` : `${icon}${label}`
}

function numericGroupHtml(className: string, labels: readonly string[], args: StorybookStoryArgs, disabled: string, readonly: string): string {
  const values = Array.isArray(args.value) ? args.value.flat(2) : []
  return [
    `<fieldset class="${className}">`,
    ...labels.map((label, index) => `  <label>${label}<input type="number" value="${escapeHtml(String(values[index] ?? 0))}"${disabled}${readonly}></label>`),
    "</fieldset>",
  ].join("\n")
}

function numericInputs(args: StorybookStoryArgs, count: number, disabled: string, readonly: string): string {
  const values = Array.isArray(args.value) ? args.value.flat(2) : []
  return Array.from({length: count}, (_, index) => `<input class="control" type="number" value="${escapeHtml(String(values[index] ?? 0))}"${disabled}${readonly}>`).join("")
}

function itemLabel(value: unknown, index: number): string {
  if (typeof value !== "object" || value === null) return `Элемент ${index + 1}`
  const label = (value as Readonly<Record<string, unknown>>).label
  return typeof label === "string" ? label : `Элемент ${index + 1}`
}

function defaultLabel(component: string): string {
  if (component === "badge") return "Готово"
  if (component === "typography") return "Типографика"
  if (component === "text-field") return "Текст"
  if (component === "slider-control") return "Интенсивность"
  return "Основная"
}

function valueArg(args: StorybookStoryArgs, key: string, fallback: string): string {
  const value = args[key]
  if (typeof value === "string" || typeof value === "number") return String(value)
  return fallback
}

function stringArg(args: StorybookStoryArgs, key: string, fallback: string): string {
  const value = args[key]
  return typeof value === "string" ? value : fallback
}

function numberArg(args: StorybookStoryArgs, key: string, fallback: number): number {
  const value = args[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function booleanArg(args: StorybookStoryArgs, key: string): boolean {
  return args[key] === true
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

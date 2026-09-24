import {useMemo, useRef, useState} from "@zavx0z/component"
import type {Document as SemanticDocument} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Editor} from "@zavx0z/ui/widgets/editor"
import {Terminal} from "@zavx0z/ui/widgets/terminal"
import {Tree, type TreeItem} from "@zavx0z/ui/widgets/tree"
import {createCodeEditorModel} from "@zavx0z/ui/code-editor-model"
import {createTerminalModel} from "@zavx0z/ui/terminal-model"
import type {CodeEditorHandle} from "@zavx0z/ui/views/code-editor"
import {mountOwnerStory} from "../story-types.ts"

function EditorWidgetStory() {
  const value = "const first = 10\nconst second = 20\n\nconsole.log(first + second)"
  const model = useMemo(() => createCodeEditorModel({value}), [])
  const handle = useRef<CodeEditorHandle | null>(null)
  return <div
    style={css`
      display: flex;
      width: 680px;
      height: 360px;
    `}
  >
    <Editor
      title="Редактор"
      subtitle="Общий виджет, без файловой модели"
      value={value}
      readOnly={false}
      model={model}
      languageId="typescript"
      onReady={value => { handle.current = value }}
      lineDecorations={[
        {line: 0, markerTone: "success", title: "Нейтральная метка строки"},
        {line: 1, lineTone: "warning", gutterTone: "info", title: "Нейтральное состояние строки"},
      ]}
      actions={[{id: "select", label: "Два диапазона", onAction() {
        model.setSelections([{anchor: 14, head: 16}, {anchor: 32, head: 34}], 1)
        handle.current?.focus()
      }}]}
    />
  </div>
}

function TerminalWidgetStory() {
  const model = useMemo(() => {
    const terminal = createTerminalModel({maxLines: 50})
    terminal.writeln("Вывод принадлежит общей модели терминала.")
    terminal.writeln("\x1b[32mГотово\x1b[0m: текст можно выделять и копировать.")
    return terminal
  }, [])
  const [input, setInput] = useState("")
  const count = useRef(0)
  return <div
    style={css`
      display: flex;
      width: 680px;
      height: 360px;
    `}
  >
    <Terminal
      title="Терминал"
      subtitle="Общий вывод и ввод"
      status="Готов"
      statusTone="success"
      model={model}
      input={input}
      placeholder="Введите строку и нажмите Enter"
      onInput={value => setInput(value)}
      onSubmit={value => { model.writeln(`> ${value}`); setInput("") }}
      actions={[
        {id: "append", label: "Добавить строку", onAction() { model.writeln(`Строка ${++count.current}`) }},
        {id: "clear", label: "Очистить", onAction() { model.clear() }},
      ]}
    />
  </div>
}

function TreeWidgetStory() {
  const [items, setItems] = useState<readonly TreeItem[]>([
    {id: "group", label: "Группа", children: [{id: "first", label: "Первый элемент", detail: "значение"},
      {id: "second", label: "Второй элемент", muted: true}]},
    {id: "lazy", label: "Отложенное содержимое", expandable: true},
  ])
  const [expanded, setExpanded] = useState<readonly string[]>(["group"])
  const [selected, setSelected] = useState<readonly string[]>(["first"])
  const [largeSelected, setLargeSelected] = useState<readonly string[]>([])
  const largeItems: readonly TreeItem[] = [{
    id: "catalog",
    label: "Каталог",
    selectable: false,
    children: Array.from({length: 1000}, (_, index) => ({id: `entry-${index}`, label: `Элемент ${index}`})),
  }]
  return <div
    style={css`
      display: flex;
      gap: 8px;
      width: 680px;
      height: 360px;
    `}
  >
    <div style={css`
      display: flex;
      flex: 1;
      min-width: 0;
    `}>
      <Tree
        title="Дерево данных"
        subtitle="Раскрытие, выбор и ленивые узлы"
        items={items}
        expandedKeys={expanded}
        selectedKeys={selected}
        selectionMode="multiple"
        onExpandedChange={keys => {
          setExpanded(keys)
          if (keys.includes("lazy")) setItems(previous => previous.map(item => item.id === "lazy"
            ? {...item, children: [{id: "loaded", label: "Загруженный элемент"}]} : item))
        }}
        onSelectionChange={keys => setSelected(keys)}
      />
    </div>
    <div style={css`
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      min-height: 0;
    `}>
      <strong
        style={css`
          color: var(--widget-regular-content);
          padding: 4px 0;
        `}
      >Большой каталог</strong>
      <Tree
        title="Большой каталог"
        items={largeItems}
        expandedKeys={["catalog"]}
        selectedKeys={largeSelected}
        embedded={true}
        selectionFollowsFocus={false}
        windowing={{size: 80, rowHeight: 24, viewRows: 12}}
        onSelectionChange={keys => setLargeSelected(keys)}
      />
    </div>
  </div>
}

export function createWidgetProductionStory(document: SemanticDocument, kind: "editor" | "terminal" | "tree") {
  const template = kind === "editor" ? EditorWidgetStory : kind === "terminal" ? TerminalWidgetStory : TreeWidgetStory
  const name = kind === "editor" ? "Editor" : kind === "terminal" ? "Terminal" : "Tree"
  return mountOwnerStory(document, template as unknown as CompiledTemplate<{}>, {}, `widget-${kind}`, [
    `import {${name}} from "@zavx0z/ui/widgets/${kind}"`,
    'import {createRoot} from "@zavx0z/component"',
    "",
    "// Родитель задаёт только область; виджет использует общие UI defaults.",
    `// ${name} не содержит файловой, процессной или debugger-модели.`,
    `createRoot(container).render(<${name}`,
    '  title="Общий виджет"',
    ...(kind === "editor" ? ['  value="const value = 1"', "  readOnly={false}"]
      : kind === "terminal" ? ['  input=""', "  lines={[]}"] : ["  items={[]}", "  selectedKeys={[]}", "  expandedKeys={[]}"]),
    "/>)",
  ].join("\n"))
}

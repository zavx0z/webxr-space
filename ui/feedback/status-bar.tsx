import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"

export type StatusBarItem = Readonly<{
  id: string
  text: string
  highlighted?: boolean | undefined
}>

export type StatusBarProps = Readonly<{
  start?: readonly StatusBarItem[] | undefined
  end?: readonly StatusBarItem[] | undefined
  separator?: string | undefined
  title?: string | undefined
  children?: JsxSourceElement | null | undefined
  style?: CssStyle | undefined
}>

type StatusBarItemViewProps = Readonly<{
  item: StatusBarItem
  first: boolean
  separator: string
}>

function StatusBarItemView(props: StatusBarItemViewProps) {
  return <span
    data-status-item={props.item.id}
    data-highlighted={props.item.highlighted === true ? "true" : undefined}
    style={css`
      display: flex;
      flex-direction: row;
      min-width: 0;
      flex-shrink: 0;
      color: var(--status-bar-content);
      white-space: nowrap;
      text-shadow: 0 1px 0 var(--status-bar-content-shadow);

      &[data-highlighted="true"] {
        color: var(--status-bar-content-highlight);
      }
    `}
  >
    <span
      aria-hidden="true"
      hidden={props.first}
      style={css`
        display: inline;

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.separator}
    </span>
    <span>{props.item.text}</span>
  </span>
}

function StatusBarItems(props: Readonly<{
  items: readonly StatusBarItem[]
  separator: string
  alignment: "start" | "end"
  hidden?: boolean | undefined
}>) {
  return <span
    data-alignment={props.alignment}
    hidden={props.hidden === true}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      min-width: 0;
      overflow: clip;

      &[data-alignment="start"] {
        flex-grow: 1;
        justify-content: flex-start;
      }

      &[data-alignment="end"] {
        justify-content: flex-end;
      }

      &[hidden] {
        display: none;
      }
    `}
  >
    {props.items.map(item => <StatusBarItemView
      key={item.id}
      item={item}
      first={item.id === props.items[0]?.id}
      separator={props.separator}
    />)}
  </span>
}

/** Passive owner-supplied status line with the preserved lower-chrome contour. */
export function StatusBar(props: StatusBarProps) {
  const start = normalizeStatusBarItems(props.start ?? [])
  const end = normalizeStatusBarItems(props.end ?? [])
  const separator = props.separator ?? " | "
  if (typeof separator !== "string") throw new TypeError("StatusBar separator must be a string")
  return <footer
    role="status"
    aria-label={props.title ?? "Status"}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      height: 24px;
      min-height: 24px;
      gap: 12px;
      padding: 2px 12px 0;
      border: 0 solid transparent;
      border-top: 2px solid var(--status-bar-top);
      border-radius: 0;
      background: var(--status-bar-background);
      color: var(--status-bar-content);
      font-size: 11px;
      line-height: 20px;
      overflow: clip;

      ${props.style}
    `}
  >
    <StatusBarItems
      items={start}
      separator={separator}
      alignment="start"
      hidden={props.children != null}
    />
    <span
      data-status-content=""
      hidden={props.children == null}
      style={css`
        display: flex;
        align-items: center;
        min-width: 0;
        height: 100%;
        flex-grow: 1;
        overflow: clip;

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.children}
    </span>
    <StatusBarItems items={end} separator={separator} alignment="end" />
  </footer>
}

export function statusBarText(items: readonly StatusBarItem[], separator = " | "): string {
  return items.map(item => item.text).join(separator)
}

function normalizeStatusBarItems(
  items: readonly StatusBarItem[]
): readonly StatusBarItem[] {
  if (!Array.isArray(items)) invalidStatusBarItems()
  const ids = new Set<string>()
  for (const item of items) {
    if (!item || typeof item !== "object") invalidStatusBarItems()
    if (typeof item.id !== "string" || item.id.length === 0) invalidStatusBarItems()
    if (ids.has(item.id)) invalidStatusBarItems()
    ids.add(item.id)
    if (typeof item.text !== "string") invalidStatusBarItems()
    if (item.highlighted !== undefined && typeof item.highlighted !== "boolean") invalidStatusBarItems()
  }
  return items
}

function invalidStatusBarItems(): never {
  throw new TypeError("Invalid StatusBar items")
}

import type {Event} from "@zavx0z/dom"

export type ListItem = Readonly<{
  key: string
  label: string
  iconSrc?: string | undefined
  detail?: string | undefined
  disabled?: boolean | undefined
}>

export type ListProps = Readonly<{
  items: readonly ListItem[]
  selectedKey?: string | null | undefined
  disabled?: boolean | undefined
  dense?: boolean | undefined
  variant?: "standalone" | "embedded" | undefined
  emptyLabel?: string | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onSelect?: ((key: string, event: Event) => void) | undefined
}>

const rootCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 300px;
    max-height: 180px;
    gap: 0;
    padding: 2px;
    overflow-y: auto;
    border: var(--border-width-control) solid var(--widget-regular-outline);
    border-radius: 4px;
    background: var(--widget-text-background);
  }
`

const itemCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    min-height: 28px;
    padding: 3px 7px;
    border-radius: 3px;
    color: var(--widget-list-content);
    font-size: var(--font-size-xs);
  }
  &:hover { background: var(--widget-regular-background); }
`

const labelCss = css`& { display: inline; min-width: 0; flex-grow: 1; }`
const iconCss = css`
  & { display: block; width: 16px; min-width: 16px; height: 16px; margin-right: 6px; object-fit: contain; }
  &[hidden] { display: none; }
`
const detailCss = css`& { display: inline; color: var(--widget-text-content-readonly); font-size: var(--font-size-2xs); }`
const emptyCss = css`
  & { display: block; min-height: 24px; padding: 4px 8px; color: var(--widget-text-content-readonly); font-size: var(--font-size-xs); }
`

type ListRowProps = Readonly<{
  item: ListItem
  selected: boolean
  disabled: boolean
  dense: boolean
  embedded: boolean
  onSelect?: ListProps["onSelect"]
}>

function ListRow(props: ListRowProps) {
  const onClick = (event: Event) => {
    if (!props.disabled) props.onSelect?.(props.item.key, event)
  }
  return <li
    role="option"
    data-item-key={props.item.key}
    aria-selected={String(props.selected)}
    aria-disabled={String(props.disabled)}
    data-dense={props.dense ? "true" : undefined}
    data-embedded={props.embedded ? "true" : undefined}
    title={props.item.detail ?? props.item.label}
    onClick={onClick}
    style={css`
      ${itemCss}
      &[data-embedded="true"] { min-height: 26px; }
      &[data-dense="true"] { min-height: 24px; padding: 2px 6px; }
      &[aria-selected="true"] { background: var(--widget-list-background-selected); color: var(--widget-list-content-selected); }
      &[aria-disabled="true"] { opacity: 0.5; }
    `}
  >
    <img
      src={props.item.iconSrc ?? ""}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      hidden={props.item.iconSrc === undefined}
      style={iconCss}
    />
    <span style={labelCss}>{props.item.label}</span>
    <span style={detailCss}>{props.item.detail ?? ""}</span>
  </li>
}

function EmptyListRow(props: Readonly<{label: string}>) {
  return <li aria-disabled="true" style={emptyCss}>{props.label}</li>
}

export function List(props: ListProps) {
  const selectedKey = assertListProps(props)
  return <ul
    role="listbox"
    title={props.title}
    aria-disabled={String(props.disabled === true)}
    style={css`${rootCss}${props.style}`}
  >
    {props.items.length === 0 ? <EmptyListRow label={props.emptyLabel ?? ""} /> : null}
    {props.items.map(item => <ListRow
      key={item.key}
      item={item}
      selected={item.key === selectedKey}
      disabled={props.disabled === true || item.disabled === true}
      dense={props.dense === true}
      embedded={props.variant === "embedded"}
      onSelect={props.onSelect}
    />)}
  </ul>
}


function assertListProps(props: ListProps): string | null {
  if (!Array.isArray(props.items)) throw new TypeError("List items must be an array")
  const keys = new Set<string>()
  for (const item of props.items) {
    if (typeof item.key !== "string" || item.key.length === 0) throw new TypeError("List item key must not be empty")
    if (keys.has(item.key)) throw new Error(`List item key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string") throw new TypeError("List item label must be a string")
  }
  const selectedKey = props.selectedKey ?? null
  if (selectedKey !== null && !keys.has(selectedKey)) throw new Error(`List selected key does not exist: ${selectedKey}`)
  return selectedKey
}

import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"

export type ListItem = Readonly<{
  key: string
  label: string
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
  style?: StyleValue
  onSelect?: ((key: string, event: Event) => void) | undefined
}>

export const listStyles = defineStyles("@ui/components/list", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    width: 300,
    maxHeight: 180,
    gap: 0,
    padding: 2,
    overflowY: "auto",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(29 29 29)"
  },
  item: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 28,
    padding: "3px 7px",
    borderRadius: 3,
    color: "rgb(204 204 204)",
    fontSize: 11,
    ":hover": {background: "rgb(84 84 84)"}
  },
  denseItem: {minHeight: 24, padding: "2px 6px"},
  embeddedItem: {minHeight: 26},
  selected: {background: "rgb(71 114 179)", color: "rgb(255 255 255)"},
  disabled: {opacity: 0.5},
  label: {display: "inline", minWidth: 0, flexGrow: 1},
  detail: {display: "inline", color: "rgb(153 153 153)", fontSize: 10},
  empty: {
    display: "block",
    minHeight: 24,
    padding: "4px 8px",
    color: "rgb(153 153 153)",
    fontSize: 11
  }
})

export const listCss = listStyles.cssText

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
    title={props.item.detail ?? props.item.label}
    onClick={onClick}
    style={[
      listStyles.item,
      props.embedded && listStyles.embeddedItem,
      props.dense && listStyles.denseItem,
      props.selected && listStyles.selected,
      props.disabled && listStyles.disabled
    ]}
  >
    <span style={listStyles.label}>{props.item.label}</span>
    <span style={listStyles.detail}>{props.item.detail ?? ""}</span>
  </li>
}

function EmptyListRow(props: Readonly<{label: string}>) {
  return <li aria-disabled="true" style={listStyles.empty}>{props.label}</li>
}

export function List(props: ListProps) {
  const selectedKey = assertListProps(props)
  return <ul
    role="listbox"
    title={props.title}
    aria-disabled={String(props.disabled === true)}
    style={[listStyles.root, props.style]}
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

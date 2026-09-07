import {useLayoutEffect, useRef} from "@zavx0z/component"
import {Button} from "../buttons/button.tsx"
import {chevronDownIcon, chevronRightIcon} from "../src/shared/icon-assets.ts"
import {WidgetHeader, WidgetActionButton, type WidgetHeaderProps, type WidgetAction} from "../src/shared/widget-header.tsx"
import type {BadgeTone} from "../badge.tsx"

export type TreeItem = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  detail?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  muted?: boolean | undefined
  expandable?: boolean | undefined
  tone?: BadgeTone | undefined
  children?: readonly TreeItem[] | undefined
  actions?: readonly WidgetAction[] | undefined
}>
export type TreeHandle = Readonly<{focus(id?: string): void}>
export type TreeProps = WidgetHeaderProps & Readonly<{
  items: readonly TreeItem[]
  expandedKeys: readonly string[]
  selectedKeys: readonly string[]
  selectionMode?: "single" | "multiple" | undefined
  emptyLabel?: string | undefined
  onExpandedChange?: ((keys: readonly string[], event: Event) => void) | undefined
  onSelectionChange?: ((keys: readonly string[], event: Event) => void) | undefined
  onActivate?: ((id: string, event: Event) => void) | undefined
  onReady?: ((handle: TreeHandle | null) => void) | undefined
  style?: CssStyle | undefined
}>
type TreeRow = Readonly<{item: TreeItem; parent: string | null}>
type TreeContext = Readonly<{
  expanded: ReadonlySet<string>
  selected: ReadonlySet<string>
  focusKey: string | null
  refs: Map<string, HTMLLIElement>
  select(id: string, event: MouseEvent): void
  toggle(id: string, event: Event): void
  activate(id: string, event: Event): void
  key(id: string, event: KeyboardEvent): void
}>

function TreeBranch(props: Readonly<{item: TreeItem; context: TreeContext; depth: number}>) {
  const item = props.item
  const children = item.children ?? []
  const expandable = item.expandable ?? children.length > 0
  const expanded = props.context.expanded.has(item.id)
  const selected = props.context.selected.has(item.id)
  return <li
    ref={element => {
      if (element) props.context.refs.set(item.id, element)
      else props.context.refs.delete(item.id)
    }}
    role="treeitem"
    data-tree-id={item.id}
    aria-level={props.depth}
    aria-selected={String(selected)}
    aria-expanded={expandable ? String(expanded) : undefined}
    aria-disabled={String(item.disabled === true)}
    tabIndex={props.context.focusKey === item.id ? 0 : -1}
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      props.context.key(item.id, event)
    }}
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      list-style: none;
    `}
  >
    <div
      data-tree-row=""
      data-selected={String(selected)}
      data-disabled={String(item.disabled === true)}
      data-muted={String(item.muted === true)}
      data-tone={item.tone}
      title={item.title ?? item.label}
      onClick={event => props.context.select(item.id, event)}
      onDoubleClick={event => props.context.activate(item.id, event)}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        min-width: 0;
        width: 100%;
        min-height: 24px;
        gap: 4px;
        padding: 2px 5px;
        border-radius: 3px;
        color: var(--widget-list-content);
        font-size: var(--font-size-xs);

        &:hover {
          background: var(--widget-regular-background);
        }

        &[data-selected="true"] {
          background: var(--widget-list-background-selected);
          color: var(--widget-list-content-selected);
        }

        &[data-disabled="true"] {
          opacity: 0.5;
        }

        &[data-muted="true"] {
          color: var(--widget-text-content-readonly);
        }

        &[data-tone="success"] {
          border-left: 2px solid var(--state-success);
        }

        &[data-tone="warning"] {
          border-left: 2px solid var(--state-warning);
        }

        &[data-tone="error"] {
          border-left: 2px solid var(--state-error);
        }

        &[data-tone="info"] {
          border-left: 2px solid var(--state-info);
        }
      `}
    >
      <span
        style={css`
          display: flex;
          width: 20px;
          min-width: 20px;
        `}
      >
        {expandable ? <Button
          label={expanded ? "Свернуть" : "Раскрыть"}
          startIcon={expanded ? chevronDownIcon : chevronRightIcon}
          iconOnly={true}
          iconSize={12}
          disabled={item.disabled === true}
          onClick={event => { event.stopPropagation(); props.context.toggle(item.id, event) }}
          style={css`
            width: 20px;
            min-width: 20px;
            height: 20px;
            padding: 0;
            border: 0;
            background: transparent;
            box-shadow: none;
          `}
        /> : null}
      </span>
      <img
        src={item.iconSrc ?? ""}
        alt=""
        hidden={item.iconSrc === undefined}
        width={16}
        height={16}
        style={css`
          width: 16px;
          height: 16px;
          object-fit: contain;
          flex-shrink: 0;

          &[hidden] {
            display: none;
          }
        `}
      />
      <span
        style={css`
          flex-grow: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {item.label}
      </span>
      <span
        style={css`
          color: var(--widget-text-content-readonly);
          white-space: nowrap;
        `}
      >
        {item.detail ?? ""}
      </span>
      {(item.actions ?? []).map(action => <WidgetActionButton
        key={action.id}
        action={action}
        stopPropagation={true}
      />)}
    </div>
    {expanded && children.length > 0 ? <TreeChildren
      items={children}
      context={props.context}
      depth={props.depth + 1}
    /> : null}
  </li>
}

function TreeChildren(props: Readonly<{items: readonly TreeItem[]; context: TreeContext; depth: number}>) {
  return <ul
    role="group"
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: 0 0 0 16px;
      list-style: none;
    `}
  >
    {props.items.map(item => <TreeBranch
      key={item.id}
      item={item}
      context={props.context}
      depth={props.depth}
    />)}
  </ul>
}

/** Controlled hierarchy without file, process or debugger semantics. */
export function Tree(props: TreeProps) {
  const refs = useRef(new Map<string, HTMLLIElement>())
  const anchor = useRef<string | null>(null)
  const expanded = new Set(props.expandedKeys)
  const selected = new Set(props.selectedKeys)
  const rows: TreeRow[] = []
  const ids = new Set<string>()
  const visit = (items: readonly TreeItem[], parent: string | null, visible: boolean) => {
    for (const item of items) {
      if (item.id === "" || ids.has(item.id)) throw new Error(`Tree item id must be non-empty and unique: ${item.id}`)
      ids.add(item.id)
      if (visible) rows.push({item, parent})
      visit(item.children ?? [], item.id, visible && expanded.has(item.id))
    }
  }
  visit(props.items, null, true)
  const focusKey = props.selectedKeys.find(key => rows.some(row => row.item.id === key && !row.item.disabled))
    ?? rows.find(row => !row.item.disabled)?.item.id ?? null
  const focus = (id = focusKey ?? "") => refs.current.get(id)?.focus({preventScroll: true})
  useLayoutEffect(() => {
    props.onReady?.(Object.freeze({focus}))
    return () => props.onReady?.(null)
  }, [props.onReady, focusKey])
  const toggle = (id: string, event: Event) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    props.onExpandedChange?.([...next], event)
  }
  const select = (id: string, event: MouseEvent | KeyboardEvent) => {
    if (rows.find(row => row.item.id === id)?.item.disabled) return
    let keys = [id]
    if (props.selectionMode === "multiple" && event.shiftKey && anchor.current !== null) {
      const first = rows.findIndex(row => row.item.id === anchor.current)
      const last = rows.findIndex(row => row.item.id === id)
      if (first >= 0) keys = rows.slice(Math.min(first, last), Math.max(first, last) + 1).filter(row => !row.item.disabled).map(row => row.item.id)
    } else if (props.selectionMode === "multiple" && (event.metaKey || event.ctrlKey)) {
      const next = new Set(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      keys = [...next]
      anchor.current = id
    } else anchor.current = id
    props.onSelectionChange?.(keys, event)
    focus(id)
  }
  const context: TreeContext = {
    expanded, selected, focusKey, refs: refs.current,
    select, toggle,
    activate: (id, event) => { if (!rows.find(row => row.item.id === id)?.item.disabled) props.onActivate?.(id, event) },
    key(id, event) {
      const index = rows.findIndex(row => row.item.id === id)
      const current = rows[index]
      if (!current || current.item.disabled) return
      let next: TreeRow | undefined
      if (event.key === "ArrowDown") next = rows.slice(index + 1).find(row => !row.item.disabled)
      else if (event.key === "ArrowUp") next = rows.slice(0, index).reverse().find(row => !row.item.disabled)
      else if (event.key === "Home") next = rows.find(row => !row.item.disabled)
      else if (event.key === "End") next = [...rows].reverse().find(row => !row.item.disabled)
      else if (event.key === "ArrowRight" && (current.item.expandable ?? (current.item.children?.length ?? 0) > 0)) {
        if (!expanded.has(id)) toggle(id, event)
        else next = rows[index + 1]
      } else if (event.key === "ArrowLeft") {
        if (expanded.has(id)) toggle(id, event)
        else next = rows.find(row => row.item.id === current.parent)
      } else if (event.key === "Enter") props.onActivate?.(id, event)
      else if (event.key === " ") select(id, event)
      else return
      event.preventDefault()
      if (next) select(next.item.id, event)
    },
  }
  const empty = props.items.length === 0 ? props.emptyLabel ?? "Нет элементов" : ""
  return <section
    data-widget="tree"
    aria-label={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border: var(--border-width-control) solid var(--widget-toolbar-outline);
      border-radius: 6px;
      background: var(--widget-text-background);

      ${props.style}
    `}
  >
    <WidgetHeader
      title={props.title}
      subtitle={props.subtitle}
      status={props.status}
      statusTone={props.statusTone}
      actions={props.actions}
    />
    <ul
      role="tree"
      aria-label={props.title}
      aria-multiselectable={String(props.selectionMode === "multiple")}
      style={css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
        min-width: 0;
        margin: 0;
        padding: 4px;
        overflow: auto;
        list-style: none;
        user-select: none;
      `}
    >
      {props.items.map(item => <TreeBranch
        key={item.id}
        item={item}
        context={context}
        depth={1}
      />)}
    </ul>
    <span
      hidden={props.items.length > 0}
      style={css`
        padding: 4px 8px;
        color: var(--widget-text-content-readonly);

        &[hidden] {
          display: none;
        }
      `}
    >
      {empty}
    </span>
  </section>
}

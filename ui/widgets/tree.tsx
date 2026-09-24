import {useLayoutEffect, useRef, useState} from "@zavx0z/component"
import {Button} from "../buttons/button.tsx"
import {chevronDownIcon, chevronRightIcon} from "../src/shared/icon-assets.ts"
import {WidgetHeader, WidgetActionButton, type WidgetHeaderProps, type WidgetAction} from "../src/shared/widget-header.tsx"
import type {BadgeTone} from "../badge.tsx"
import {
  materializedTreeRows,
  retainedTreeBlocks,
  visibleTreeRows,
  windowedTreeBlocks,
  type WindowedTreeBlock,
} from "./tree/windowing.ts"

export type TreeItem = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  detail?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  muted?: boolean | undefined
  expandable?: boolean | undefined
  /** Ветвь для раскрытия сохраняет фокус, но не входит в выбор. */
  selectable?: boolean | undefined
  /** Помечает текущую страницу независимо от выбранных ключей. */
  current?: boolean | undefined
  tone?: BadgeTone | undefined
  children?: readonly TreeItem[] | undefined
  actions?: readonly WidgetAction[] | undefined
}>
export type TreeHandle = Readonly<{
  focus(id?: string): void
  /**
  Показывает только собственную строку раскрытой ветви, сохраняя текущий фокус.
  Высота вложенных строк не участвует в выравнивании прокрутки.

  @param id - Точный ключ видимой строки; родителей раскрывает владелец expandedKeys.
  @returns false, если строка отсутствует или находится в свёрнутой ветви.
  */
  reveal(id: string): boolean
}>
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
  /** Встраивает дерево в панель вызывающего компонента без собственного заголовка. */
  embedded?: boolean | undefined
  /** При false стрелки перемещают только фокус, не изменяя выбор. */
  selectionFollowsFocus?: boolean | undefined
  /** Ограничивает число смонтированных строк большой иерархии. */
  windowing?: Readonly<{
    size: number
    rowHeight: number
    overscan?: number
    viewRows?: number
    resetKey?: string
    retainedItems?: readonly TreeItem[]
  }> | undefined
  style?: CssStyle | undefined
}>
type TreeRow = Readonly<{item: TreeItem; parent: string | null}>
type TreeItemBlock = Extract<WindowedTreeBlock<TreeItem>, {kind: "item"}>
type TreeContext = Readonly<{
  expanded: ReadonlySet<string>
  selected: ReadonlySet<string>
  focusKey: string | null
  refs: Map<string, HTMLLIElement>
  select(id: string, event: MouseEvent): void
  toggle(id: string, event: Event): void
  activate(id: string, event: Event): void
  key(id: string, event: KeyboardEvent): void
  focusIn(id: string): void
  rowHeight: number
}>

/** Отображает одну строку и её доступных потомков в том же semantic Document. */
function TreeBranch(props: Readonly<{
  item: TreeItem
  context: TreeContext
  depth: number
  block?: TreeItemBlock | undefined
}>) {
  const item = props.item
  const children = item.children ?? []
  const expandable = item.expandable ?? children.length > 0
  const expanded = props.context.expanded.has(item.id)
  const selected = props.context.selected.has(item.id)
  const toggleLabel = expanded ? "Свернуть" : "Раскрыть"
  return <li
    ref={element => {
      if (element) props.context.refs.set(item.id, element)
      else props.context.refs.delete(item.id)
    }}
    role="treeitem"
    data-tree-id={item.id}
    hidden={props.block?.hidden === true}
    aria-label={item.label}
    aria-level={props.depth}
    aria-selected={item.selectable === false ? undefined : String(selected)}
    aria-current={item.current === true ? "page" : undefined}
    aria-expanded={expandable ? String(expanded) : undefined}
    aria-disabled={String(item.disabled === true)}
    tabIndex={props.context.focusKey === item.id ? 0 : -1}
    onClick={event => {
      if (event.target === event.currentTarget) props.context.select(item.id, event)
    }}
    onDoubleClick={event => {
      if (event.target === event.currentTarget) props.context.activate(item.id, event)
    }}
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      props.context.key(item.id, event)
    }}
    onFocusIn={event => { if (event.target === event.currentTarget) props.context.focusIn(item.id) }}
    style={css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      list-style: none;

      &[hidden] {
        display: none;
      }
    `}
  >
    <div
      data-tree-row=""
      data-selected={String(selected)}
      data-disabled={String(item.disabled === true)}
      data-muted={String(item.muted === true)}
      data-tone={item.tone}
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
          label={toggleLabel}
          startIcon={expanded ? chevronDownIcon : chevronRightIcon}
          iconOnly={true}
          iconSize={12}
          title={toggleLabel}
          aria-label={toggleLabel}
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
        data-tree-label=""
        title={item.title ?? item.label}
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
    {(expanded && children.length > 0 || props.block?.children.length) ? <TreeChildren
      items={children}
      blocks={props.block?.children}
      context={props.context}
      depth={props.depth + 1}
    /> : null}
  </li>
}

/** Сохраняет вложенную ARIA-группу для обычного и ограниченного режима. */
function TreeChildren(props: Readonly<{
  items: readonly TreeItem[]
  blocks?: readonly WindowedTreeBlock<TreeItem>[] | undefined
  context: TreeContext
  depth: number
}>) {
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
    {props.blocks === undefined ? <TreePlainRows
      items={props.items}
      context={props.context}
      depth={props.depth}
    /> : <TreeWindowedRows
      blocks={props.blocks}
      context={props.context}
      depth={props.depth}
    />}
  </ul>
}

/** Отображает все строки небольшого дерева без окна материализации. */
function TreePlainRows(props: Readonly<{items: readonly TreeItem[]; context: TreeContext; depth: number}>) {
  return <>
    {props.items.map(item => <TreeBranch
      key={item.id}
      item={item}
      context={props.context}
      depth={props.depth}
    />)}
  </>
}

/** Отображает выбранные строки и распорки большого дерева. */
function TreeWindowedRows(props: Readonly<{
  blocks: readonly WindowedTreeBlock<TreeItem>[]
  context: TreeContext
  depth: number
}>) {
  return <>
    {props.blocks.map(block => <TreeBlockView
      key={block.kind === "spacer" ? block.key : block.item.id}
      block={block}
      context={props.context}
      depth={props.depth}
    />)}
  </>
}

/** Выбирает предметную строку либо распорку без знания данных владельца. */
function TreeBlockView(props: Readonly<{
  block: WindowedTreeBlock<TreeItem>
  context: TreeContext
  depth: number
}>) {
  const block = props.block
  return <>
    {block.kind === "spacer" ? <TreeSpacer
      rows={block.rows}
      rowHeight={props.context.rowHeight}
    /> : <TreeBranch
      item={block.item}
      context={props.context}
      depth={props.depth}
      block={block}
    />}
  </>
}

/** Удерживает высоту строк, не созданных в текущем окне. */
function TreeSpacer(props: Readonly<{rows: number; rowHeight: number}>) {
  return <li
    role="presentation"
    style={css`
      height: ${props.rows * props.rowHeight}px;
      min-height: ${props.rows * props.rowHeight}px;
      list-style: none;
    `}
  />
}

/** Controlled hierarchy without file, process or debugger semantics. */
export function Tree(props: TreeProps) {
  const refs = useRef(new Map<string, HTMLLIElement>())
  const anchor = useRef<string | null>(null)
  const viewport = useRef<HTMLUListElement | null>(null)
  const pendingFocus = useRef<string | null>(null)
  const pendingReveal = useRef<string | null>(null)
  const createdIds = useRef(new Set<string>())
  const previousResetKey = useRef(props.windowing?.resetKey)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [windowStart, setWindowStart] = useState(0)
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
  const focusKey = (props.selectionFollowsFocus === false && rows.some(row => row.item.id === focusedId && !row.item.disabled) ? focusedId : null)
    ?? props.selectedKeys.find(key => rows.some(row => row.item.id === key && !row.item.disabled))
    ?? rows.find(row => !row.item.disabled)?.item.id ?? null
  const windowRows = props.windowing === undefined ? [] : visibleTreeRows(props.items, expanded)
  const maximumStart = Math.max(0, windowRows.length - (props.windowing?.size ?? 0))
  const boundedStart = Math.min(maximumStart, Math.max(0, windowStart))
  const visibleBlocks = props.windowing === undefined ? [] : windowedTreeBlocks(
    props.items, windowRows, expanded, boundedStart, props.windowing.size, focusKey,
  )
  const rememberBlocks = (blocks: readonly WindowedTreeBlock<TreeItem>[]): void => {
    for (const block of blocks) {
      if (block.kind === "item") {
        createdIds.current.add(block.item.id)
        rememberBlocks(block.children)
      }
    }
  }
  rememberBlocks(visibleBlocks)
  const blocks = props.windowing === undefined ? undefined : retainedTreeBlocks(
    visibleBlocks, props.windowing.retainedItems ?? props.items, createdIds.current,
  )
  const ensureWindow = (id: string): boolean => {
    if (props.windowing === undefined) return false
    const index = windowRows.findIndex(row => row.item.id === id)
    if (index < 0) return false
    const viewportRows = props.windowing.viewRows ?? 20
    const firstVisible = Math.floor((viewport.current?.scrollTop ?? 0) / props.windowing.rowHeight)
    const outsideViewport = index < firstVisible || index >= firstVisible + viewportRows
    if (index < boundedStart || index >= boundedStart + props.windowing.size || outsideViewport) {
      const overscan = props.windowing.overscan ?? 12
      const scrollRow = Math.max(0, index - Math.floor(viewportRows / 2))
      setWindowStart(Math.min(maximumStart, Math.max(0, scrollRow - overscan)))
      viewport.current && (viewport.current.scrollTop = scrollRow * props.windowing.rowHeight)
    }
    return true
  }
  const focus = (id = focusKey ?? "", reveal = true) => {
    if (reveal) ensureWindow(id)
    const target = refs.current.get(id)
    if (target !== undefined && !target.hidden) target.focus({preventScroll: true})
    else if (reveal && ensureWindow(id)) pendingFocus.current = id
  }
  const reveal = (id: string): boolean => {
    const element = refs.current.get(id)
    if (element === undefined || element.hidden) {
      if (!ensureWindow(id)) return false
      pendingReveal.current = id
      return true
    }
    const row = element.querySelector("[data-tree-row]")
    if (row === null) return false
    row.scrollIntoView({block: "nearest", inline: "nearest"})
    return true
  }
  useLayoutEffect(() => {
    props.onReady?.(Object.freeze({focus, reveal}))
    return () => props.onReady?.(null)
  }, [props.onReady, focusKey, boundedStart])
  useLayoutEffect(() => {
    const id = pendingFocus.current
    if (id !== null && refs.current.get(id)?.hidden === false) {
      pendingFocus.current = null
      refs.current.get(id)?.focus({preventScroll: true})
    }
    const revealId = pendingReveal.current
    if (revealId !== null && refs.current.get(revealId)?.hidden === false) {
      pendingReveal.current = null
      refs.current.get(revealId)?.querySelector("[data-tree-row]")?.scrollIntoView({block: "nearest", inline: "nearest"})
    }
  })
  useLayoutEffect(() => {
    for (const [id, element] of refs.current) {
      const tabIndex = id === focusKey && !element.hidden ? 0 : -1
      if (!element.hasAttribute("tabindex") || element.tabIndex !== tabIndex) element.tabIndex = tabIndex
    }
  }, [focusKey, blocks])
  useLayoutEffect(() => {
    if (previousResetKey.current === props.windowing?.resetKey) return
    previousResetKey.current = props.windowing?.resetKey
    setWindowStart(0)
    if (viewport.current !== null) viewport.current.scrollTop = 0
  }, [props.windowing?.resetKey])
  const toggle = (id: string, event: Event) => {
    const branch = refs.current.get(id)
    const active = branch?.ownerDocument.activeElement
    if (expanded.has(id) && branch !== undefined && active != null && active !== branch && branch.contains(active)) {
      if (props.selectionFollowsFocus === false) setFocusedId(id)
      branch.focus({preventScroll: true})
    }
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    props.onExpandedChange?.([...next], event)
  }
  const select = (id: string, event: MouseEvent | KeyboardEvent) => {
    const item = rows.find(row => row.item.id === id)?.item
    if (item === undefined || item.disabled) return
    if (item.selectable === false) {
      if (item.expandable ?? (item.children?.length ?? 0) > 0) toggle(id, event)
      if (props.selectionFollowsFocus === false) setFocusedId(id)
      focus(id, event.type === "keydown")
      return
    }
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
    if (props.selectionFollowsFocus === false) setFocusedId(id)
    focus(id, event.type === "keydown")
  }
  const context: TreeContext = {
    expanded, selected, focusKey, refs: refs.current, rowHeight: props.windowing?.rowHeight ?? 24,
    select, toggle,
    focusIn: id => { if (props.selectionFollowsFocus === false) setFocusedId(id) },
    activate: (id, event) => {
      const item = rows.find(row => row.item.id === id)?.item
      if (item === undefined || item.disabled) return
      if (item.selectable === false) toggle(id, event)
      else props.onActivate?.(id, event)
    },
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
        else next = rows.slice(index + 1).find(row => !row.item.disabled && isTreeDescendant(row, id, rows))
      } else if (event.key === "ArrowLeft") {
        if (expanded.has(id)) toggle(id, event)
        else next = rows.find(row => row.item.id === current.parent)
      } else if (event.key === "Enter") context.activate(id, event)
      else if (event.key === " ") select(id, event)
      else return
      event.preventDefault()
      if (next) {
        if (props.selectionFollowsFocus === false) {
          setFocusedId(next.item.id)
          focus(next.item.id)
        } else select(next.item.id, event)
      }
    },
  }
  const empty = props.items.length === 0 ? props.emptyLabel ?? "Нет элементов" : ""
  return <section
    data-widget="tree"
    data-tree-embedded={props.embedded === true ? "true" : undefined}
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

      &[data-tree-embedded="true"] {
        border: 0;
        border-radius: 0;
      }

      ${props.style}
    `}
  >
    {props.embedded === true ? null : <WidgetHeader
      title={props.title}
      subtitle={props.subtitle}
      status={props.status}
      statusTone={props.statusTone}
      actions={props.actions}
    />}
    <ul
      ref={element => { viewport.current = element }}
      role="tree"
      aria-label={props.title}
      aria-multiselectable={String(props.selectionMode === "multiple")}
      data-tree-total={props.windowing === undefined ? undefined : String(windowRows.length)}
      data-tree-materialized={blocks === undefined ? undefined : String(materializedTreeRows(blocks))}
      data-tree-window-start={props.windowing === undefined ? undefined : String(boundedStart)}
      onScroll={event => {
        if (props.windowing === undefined) return
        const overscan = props.windowing.overscan ?? 12
        setWindowStart(Math.min(maximumStart, Math.max(0,
          Math.floor(event.currentTarget.scrollTop / props.windowing.rowHeight) - overscan,
        )))
      }}
      style={css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
        min-width: 0;
        margin: 0;
        padding: ${props.embedded === true ? 0 : 4}px;
        overflow: auto;
        list-style: none;
        user-select: none;
      `}
    >
      {blocks === undefined ? <TreePlainRows
        items={props.items}
        context={context}
        depth={1}
      /> : <TreeWindowedRows
        blocks={blocks}
        context={context}
        depth={1}
      />}
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

/** Находит принадлежность видимой строки раскрытой ветви для клавиатуры. */
function isTreeDescendant(row: TreeRow, ancestorId: string, rows: readonly TreeRow[]): boolean {
  let parent = row.parent
  while (parent !== null) {
    if (parent === ancestorId) return true
    parent = rows.find(candidate => candidate.item.id === parent)?.parent ?? null
  }
  return false
}

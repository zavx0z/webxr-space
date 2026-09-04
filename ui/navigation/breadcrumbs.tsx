export type BreadcrumbsItem = Readonly<{
  id: string
  label: string
  title?: string | undefined
  disabled?: boolean | undefined
}>

export type BreadcrumbsProps = Readonly<{
  items: readonly BreadcrumbsItem[]
  label?: string | undefined
  separator?: string | undefined
  style?: CssStyle | undefined
  onNavigate?: ((item: BreadcrumbsItem, event: PointerEvent) => void) | undefined
}>

/** Hierarchical navigation whose final item denotes the current location. */
export function Breadcrumbs(props: BreadcrumbsProps) {
  const separator = props.separator ?? "›"
  if (typeof separator !== "string" || separator.length === 0) {
    throw new TypeError("Breadcrumbs separator must be a non-empty string")
  }
  const items = normalizeItems(props.items, separator)
  return <nav
    aria-label={props.label ?? "Путь"}
    style={css`
      box-sizing: border-box;
      display: flex;
      align-items: center;
      min-width: 0;
      height: 100%;
      overflow: clip;

      ${props.style}
    `}
  >
    <ol
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        min-width: 0;
        height: 100%;
        gap: 0;
        margin: 0;
        padding: 0;
        overflow: clip;
        list-style: none;
      `}
    >
      {items.map(item => <BreadcrumbItemView
        key={item.id}
        item={item}
        current={item.current}
        onNavigate={props.onNavigate}
      />)}
    </ol>
  </nav>
}

function BreadcrumbItemView(props: Readonly<{
  item: NormalizedBreadcrumbsItem
  current: boolean
  onNavigate?: BreadcrumbsProps["onNavigate"]
}>) {
  const disabled = props.current || props.item.disabled === true || props.onNavigate === undefined
  const activate = (event: PointerEvent) => {
    if (!disabled) props.onNavigate?.(props.item, event)
  }
  return <li
    data-breadcrumb-id={props.item.id}
    data-current={props.current ? "true" : undefined}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      min-width: 0;
      height: 100%;
      flex-shrink: ${props.current ? 1 : 0};
      overflow: clip;
      color: var(--status-bar-content);
      white-space: nowrap;

      &[data-current="true"] {
        color: var(--status-bar-content-highlight);
      }
    `}
  >
    <span
      aria-hidden="true"
      style={css`
        display: inline;
        flex-shrink: 0;
        color: var(--status-bar-content);
      `}
    >
      {props.item.prefix}
    </span>
    <button
      type="button"
      aria-current={props.current ? "page" : undefined}
      title={props.item.title ?? props.item.label}
      disabled={disabled}
      onClick={activate}
      style={css`
        box-sizing: border-box;
        display: block;
        min-width: 0;
        height: 20px;
        padding: 0;
        overflow: hidden;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: 20px;
        white-space: nowrap;
        text-overflow: ellipsis;

        &:hover {
          color: var(--status-bar-content-highlight);
        }

        &:focus {
          color: var(--status-bar-content-highlight);
        }

        &:disabled {
          color: inherit;
        }
      `}
    >
      {props.item.label}
    </button>
  </li>
}

type NormalizedBreadcrumbsItem = BreadcrumbsItem & Readonly<{
  current: boolean
  prefix: string
}>

function normalizeItems(
  items: readonly BreadcrumbsItem[],
  separator: string,
): readonly NormalizedBreadcrumbsItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("Breadcrumbs items must be a non-empty array")
  }
  const ids = new Set<string>()
  const normalized = items.map((item, index) => {
    if (item === null || typeof item !== "object") throw new TypeError("Breadcrumbs item must be an object")
    if (typeof item.id !== "string" || item.id.trim().length === 0) {
      throw new TypeError("Breadcrumbs item id must be non-empty")
    }
    if (ids.has(item.id)) throw new Error(`Breadcrumbs item id must be unique: ${item.id}`)
    ids.add(item.id)
    if (typeof item.label !== "string" || item.label.trim().length === 0) {
      throw new TypeError(`Breadcrumbs item label must be non-empty: ${item.id}`)
    }
    return Object.freeze({
      ...item,
      current: index === items.length - 1,
      prefix: index === 0 ? "" : ` ${separator} `,
    })
  })
  return Object.freeze(normalized)
}

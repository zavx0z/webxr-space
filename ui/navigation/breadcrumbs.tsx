import {chevronRightIcon} from "../src/shared/icon-assets.ts"

export type BreadcrumbsItem = Readonly<{
  id: string
  label: string
  /** Заменяет видимую подпись иконкой; label сохраняется как доступное имя и подсказка. */
  iconSrc?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
}>

export type BreadcrumbsProps = Readonly<{
  items: readonly BreadcrumbsItem[]
  label?: string | undefined
  style?: CssStyle | undefined
  onNavigate?: ((item: BreadcrumbsItem, event: PointerEvent) => void) | undefined
}>

/** Последний сегмент обозначает текущую страницу; iconSrc заменяет только видимую подпись. */
export function Breadcrumbs(props: BreadcrumbsProps) {
  const items = normalizeItems(props.items)
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
  const label = props.item.iconSrc === undefined ? props.item.label : ""
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
    <img
      src={chevronRightIcon}
      alt=""
      aria-hidden="true"
      width={12}
      height={20}
      hidden={!props.item.separated}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 12px;
        height: 20px;
        padding: 5px 2px;
        flex-shrink: 0;
        object-fit: contain;
        opacity: 0.55;

        &[hidden] {
          display: none;
        }
      `}
    />
    <button
      type="button"
      aria-label={props.item.label}
      aria-current={props.current ? "page" : undefined}
      title={props.item.title ?? props.item.label}
      disabled={disabled}
      onClick={activate}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
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
        --breadcrumb-icon-opacity: 0.5;

        &:hover {
          color: var(--status-bar-content-highlight);
          --breadcrumb-icon-opacity: 1;
        }

        &[aria-current="page"] {
          --breadcrumb-icon-opacity: 1;
        }

        &:focus {
          color: var(--status-bar-content-highlight);
          --breadcrumb-icon-opacity: 1;
        }

        &:disabled {
          color: inherit;
        }
      `}
    >
      <img
        src={props.item.iconSrc ?? ""}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        hidden={props.item.iconSrc === undefined}
        style={css`
          display: block;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          object-fit: contain;
          opacity: var(--breadcrumb-icon-opacity);

          &[hidden] {
            display: none;
          }
        `}
      />
      <span
        hidden={props.item.iconSrc !== undefined}
        style={css`
          display: block;
          min-width: 0;
          line-height: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &[hidden] {
            display: none;
          }
        `}
      >
        {label}
      </span>
    </button>
  </li>
}

type NormalizedBreadcrumbsItem = BreadcrumbsItem & Readonly<{
  current: boolean
  separated: boolean
}>

function normalizeItems(
  items: readonly BreadcrumbsItem[],
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
    if (item.iconSrc !== undefined && (typeof item.iconSrc !== "string" || item.iconSrc.trim().length === 0)) {
      throw new TypeError(`Breadcrumbs item iconSrc must be non-empty: ${item.id}`)
    }
    return Object.freeze({
      ...item,
      current: index === items.length - 1,
      separated: index > 0,
    })
  })
  return Object.freeze(normalized)
}

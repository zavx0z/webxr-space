import {flexColumn, flexRow} from "@layout/core/flex"
import {Z, type UiSurface} from "@layout/core/surface"
import {div, divScrollPosition} from "@ui/elements/div"
import {drawIconCentered} from "@ui/elements/icon"
import {uiIcons} from "@ui/elements/icons"
import {uiShapeMetrics} from "@ui/elements/shape"
import {boxPadding, px, type StyleProps} from "@ui/elements/style"
import {IconButton} from "./button.ts"
import {Pane} from "./pane.ts"
import {TextField} from "./text-field.ts"
import {Typography} from "./typography.ts"

export type InspectorCategory = Readonly<{
  id: string
  label: string
  iconSrc: string
  disabled?: boolean
  dividerBefore?: boolean
  sectionIds?: readonly string[]
}>

export type InspectorAction = Readonly<{
  id: string
  label: string
  iconSrc: string
  disabled?: boolean
  selected?: boolean
  action?(): void
}>

export type InspectorContextRow = Readonly<{
  label: string
  iconSrc?: string
  actions?: readonly InspectorAction[]
}>

export type InspectorContext = InspectorContextRow & Readonly<{
  secondary?: InspectorContextRow
}>

export type InspectorSectionRect = Readonly<{x: number; y: number; w: number; h: number}>

export type InspectorSection = Readonly<{
  id: string
  label: string
  expanded: boolean
  contentHeight: number
  actions?: readonly InspectorAction[]
  render(surface: UiSurface, rect: InspectorSectionRect): void
}>

export type InspectorScrollPosition = Readonly<{left: number; top: number}>

export type InspectorProps = Readonly<{
  key: string
  categories: readonly InspectorCategory[]
  selectedCategoryId: string
  sections: readonly InspectorSection[]
  query?: string
  searchPlaceholder?: string
  toolbarLeadingActions?: readonly InspectorAction[]
  toolbarActions?: readonly InspectorAction[]
  context?: InspectorContext
  style?: StyleProps
  onCategoryChange?(id: string): void
  onQueryChange?(query: string): void
  onSectionToggle?(id: string, expanded: boolean): void
  onSectionsScrollChange?(position: InspectorScrollPosition): void
}>

export type InspectorPlannedCategory = Readonly<{id: string; frame: InspectorSectionRect}>

export type InspectorPlannedSection = Readonly<{
  id: string
  frame: InspectorSectionRect
  header: InspectorSectionRect
  content: InspectorSectionRect | null
}>

export type InspectorPlan = Readonly<{
  toolbar: InspectorSectionRect
  rail: InspectorSectionRect
  context: InspectorSectionRect | null
  contextSecondary: InspectorSectionRect | null
  sectionsFrame: InspectorSectionRect
  sectionsViewport: InspectorSectionRect
  sectionsContentHeight: number
  sectionsScrollTop: number
  categories: readonly InspectorPlannedCategory[]
  sections: readonly InspectorPlannedSection[]
}>

export const inspectorMetrics = Object.freeze({
  railWidth: 30,
  toolbarHeight: 30,
  contextHeight: 28,
  contextSecondaryHeight: 24,
  categoryHeight: 28,
  categoryGap: 1,
  sectionHeaderHeight: 26,
  sectionGap: 2,
  sectionContentInset: 6,
  contentInset: 7,
  actionSize: 22,
  iconSize: 16,
  searchWidth: 115,
  scrollbarWidth: 4,
})

const INSPECTOR_BACK = "rgba(45, 45, 45, 1)" as const
const INSPECTOR_TOOLBAR = "rgba(45, 45, 45, 1)" as const
const INSPECTOR_RAIL = "rgba(24, 24, 24, 1)" as const
const INSPECTOR_TAB = "rgba(29, 29, 29, 1)" as const
const INSPECTOR_TAB_ACTIVE = "rgba(48, 48, 48, 1)" as const
const INSPECTOR_SECTION = "rgba(61, 61, 61, 1)" as const
const INSPECTOR_RULE = "rgba(22, 22, 22, 1)" as const

type InspectorPlanProps = Pick<
  InspectorProps,
  "categories" | "selectedCategoryId" | "sections" | "query" | "context" | "style"
>

/** Pure owner geometry used by immediate rendering and retained consumers. */
export function planInspector(
  x: number,
  y: number,
  width: number,
  height: number,
  props: InspectorPlanProps,
  scrollTop = 0,
): InspectorPlan {
  validateInspectorIdentity(props.categories, props.sections)
  const outerStyle = inspectorOuterStyle(props.style)
  const border = outerStyle.borderColor === null ? 0 : px(outerStyle.borderWidth, uiShapeMetrics.borderWidth)
  const padding = boxPadding(outerStyle)
  const inner: InspectorSectionRect = {
    x: x + border + padding.left,
    y: y + border + padding.top,
    w: Math.max(0, width - border * 2 - padding.left - padding.right),
    h: Math.max(0, height - border * 2 - padding.top - padding.bottom),
  }

  let toolbar: InspectorSectionRect = {x: inner.x, y: inner.y, w: inner.w, h: 0}
  let body: InspectorSectionRect = {x: inner.x, y: inner.y, w: inner.w, h: inner.h}
  const toolbarHeight = Math.min(inspectorMetrics.toolbarHeight, inner.h)
  flexColumn({
    x: inner.x,
    y: inner.y,
    w: inner.w,
    h: inner.h,
    gap: 0,
    items: [
      {height: toolbarHeight, draw: (x, y, w, h) => { toolbar = {x, y, w, h} }},
      {height: "grow", draw: (x, y, w, h) => { body = {x, y, w, h} }},
    ],
  })

  let rail: InspectorSectionRect = {x: body.x, y: body.y, w: 0, h: body.h}
  let content: InspectorSectionRect = {x: body.x, y: body.y, w: body.w, h: body.h}
  flexRow({
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    gap: 0,
    alignItems: "stretch",
    items: [
      {width: Math.min(inspectorMetrics.railWidth, body.w), height: body.h, draw: (x, y, w, h) => { rail = {x, y, w, h} }},
      {width: "grow", height: body.h, draw: (x, y, w, h) => { content = {x, y, w, h} }},
    ],
  })

  let context: InspectorSectionRect | null = null
  let contextSecondary: InspectorSectionRect | null = null
  let sectionsFrame: InspectorSectionRect = {x: content.x, y: content.y, w: content.w, h: content.h}
  const contextHeight = props.context === undefined ? 0 : Math.min(inspectorMetrics.contextHeight, content.h)
  const secondaryHeight = props.context?.secondary === undefined
    ? 0
    : Math.min(inspectorMetrics.contextSecondaryHeight, Math.max(0, content.h - contextHeight))
  flexColumn({
    x: content.x,
    y: content.y,
    w: content.w,
    h: content.h,
    gap: 0,
    items: [
      props.context === undefined ? false : {height: contextHeight, draw: (x, y, w, h) => { context = {x, y, w, h} }},
      props.context?.secondary === undefined ? false : {height: secondaryHeight, draw: (x, y, w, h) => { contextSecondary = {x, y, w, h} }},
      {height: "grow", draw: (x, y, w, h) => { sectionsFrame = {x, y, w, h} }},
    ],
  })

  const visibleSections = visibleInspectorSections(props)
  const sectionHeights = visibleSections.map(inspectorSectionHeight)
  const sectionsContentHeight = inspectorMetrics.contentInset * 2 +
    sectionHeights.reduce((sum, value) => sum + value, 0) +
    inspectorMetrics.sectionGap * Math.max(0, visibleSections.length - 1)
  const showScrollbar = sectionsContentHeight > sectionsFrame.h
  const sectionsViewport: InspectorSectionRect = {
    x: sectionsFrame.x,
    y: sectionsFrame.y,
    w: Math.max(0, sectionsFrame.w - (showScrollbar ? inspectorMetrics.scrollbarWidth : 0)),
    h: sectionsFrame.h,
  }
  const maxScrollTop = Math.max(0, sectionsContentHeight - sectionsViewport.h)
  const sectionsScrollTop = clamp(scrollTop, 0, maxScrollTop)
  const sections: InspectorPlannedSection[] = []
  flexColumn({
    x: sectionsViewport.x + inspectorMetrics.contentInset,
    y: sectionsViewport.y + inspectorMetrics.contentInset - sectionsScrollTop,
    w: Math.max(0, sectionsViewport.w - inspectorMetrics.contentInset * 2),
    h: Math.max(0, sectionsContentHeight - inspectorMetrics.contentInset * 2),
    gap: inspectorMetrics.sectionGap,
    alignItems: "stretch",
    items: visibleSections.map((section, index) => ({
      height: sectionHeights[index] ?? inspectorMetrics.sectionHeaderHeight,
      draw: (x, y, w, h) => sections.push(planInspectorSection(section, {x, y, w, h})),
    })),
  })

  return Object.freeze({
    toolbar: freezeRect(toolbar),
    rail: freezeRect(rail),
    context: context === null ? null : freezeRect(context),
    contextSecondary: contextSecondary === null ? null : freezeRect(contextSecondary),
    sectionsFrame: freezeRect(sectionsFrame),
    sectionsViewport: freezeRect(sectionsViewport),
    sectionsContentHeight,
    sectionsScrollTop,
    categories: planInspectorCategories(rail, props.categories),
    sections: Object.freeze(sections),
  })
}

/** Controlled inspector whose semantic content remains consumer-owned. */
export function Inspector(surface: UiSurface, x: number, y: number, width: number, height: number, props: InspectorProps): void {
  if (width <= 0 || height <= 0) return
  const outerStyle = inspectorOuterStyle(props.style)
  const scrollTop = divScrollPosition(surface, `${props.key}:sections`).top
  const plan = planInspector(x, y, width, height, props, scrollTop)
  Pane(surface, x, y, width, height, {
    appearance: "panel",
    key: props.key,
    style: outerStyle,
    children: () => {
      drawInspectorToolbar(surface, plan.toolbar, props)
      drawInspectorRail(surface, plan.rail, plan.categories, props)
      if (plan.context !== null && props.context !== undefined) drawInspectorContext(surface, plan.context, props.context)
      if (plan.contextSecondary !== null && props.context?.secondary !== undefined) {
        drawInspectorContext(surface, plan.contextSecondary, props.context.secondary)
      }
      drawInspectorSections(surface, plan.sectionsFrame, x, y, width, height, props)
    },
  })
}

function drawInspectorToolbar(surface: UiSurface, frame: InspectorSectionRect, props: InspectorProps): void {
  div(surface, frame.x, frame.y, frame.w, frame.h, {
    style: {background: INSPECTOR_TOOLBAR, borderColor: null, borderRadius: 0, zIndex: Z.CONTAINER + 0.02},
  })
  const leading = props.toolbarLeadingActions ?? []
  const trailing = props.toolbarActions ?? []
  const actionGap = 2
  const leadingWidth = leading.length * inspectorMetrics.actionSize + Math.max(0, leading.length - 1) * actionGap
  const trailingWidth = trailing.length * inspectorMetrics.actionSize + Math.max(0, trailing.length - 1) * actionGap
  const sideWidth = Math.max(inspectorMetrics.actionSize, leadingWidth, trailingWidth)
  const searchWidth = Math.min(inspectorMetrics.searchWidth, Math.max(0, frame.w - sideWidth * 2 - 12))
  flexRow({
    x: frame.x + 4,
    y: frame.y + 4,
    w: Math.max(0, frame.w - 8),
    h: Math.max(0, frame.h - 8),
    gap: 0,
    alignItems: "stretch",
    items: [
      {width: sideWidth, height: Math.max(0, frame.h - 8), draw: (x, y, w, h) => drawInspectorActions(surface, {x, y, w, h}, leading, "start")},
      {width: "grow", height: Math.max(0, frame.h - 8), draw() {}},
      {width: searchWidth, height: Math.max(0, frame.h - 8), draw: (x, y, w, h) => drawInspectorSearch(surface, {x, y, w, h}, props)},
      {width: "grow", height: Math.max(0, frame.h - 8), draw() {}},
      {width: sideWidth, height: Math.max(0, frame.h - 8), draw: (x, y, w, h) => drawInspectorActions(surface, {x, y, w, h}, trailing, "end")},
    ],
  })
}

function drawInspectorSearch(surface: UiSurface, frame: InspectorSectionRect, props: InspectorProps): void {
  TextField(surface, frame.x, frame.y, frame.w, frame.h, {
    key: `${props.key}:search`,
    value: props.query ?? "",
    placeholder: props.searchPlaceholder ?? "",
    controlled: true,
    style: {borderRadius: 4, paddingLeft: 22},
    onChange: (query) => props.onQueryChange?.(query),
  })
  drawIconCentered(surface, uiIcons.search, frame.x + 11, frame.y + frame.h / 2, 13, {
    style: {opacity: 0.78, zIndex: Z.TEXT + 0.01},
  })
}

function drawInspectorActions(
  surface: UiSurface,
  frame: InspectorSectionRect,
  actions: readonly InspectorAction[],
  align: "start" | "end",
): void {
  if (actions.length === 0) return
  flexRow({
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    gap: 2,
    justifyContent: align === "start" ? "start" : "end",
    items: actions.map((action) => ({
      width: inspectorMetrics.actionSize,
      height: frame.h,
      draw: (x, y, w, h) => drawInspectorAction(surface, {x, y, w, h}, action),
    })),
  })
}

function drawInspectorRail(
  surface: UiSurface,
  frame: InspectorSectionRect,
  categories: readonly InspectorPlannedCategory[],
  props: InspectorProps,
): void {
  div(surface, frame.x, frame.y, frame.w, frame.h, {
    style: {background: INSPECTOR_RAIL, borderColor: INSPECTOR_RULE, borderRadius: 0, borderWidth: 1, zIndex: Z.CONTAINER + 0.01},
  })
  for (const [index, planned] of categories.entries()) {
    const category = props.categories.find(({id}) => id === planned.id)
    if (category === undefined) continue
    if (category.dividerBefore === true && index > 0) {
      div(surface, planned.frame.x + 5, planned.frame.y - 2, Math.max(0, planned.frame.w - 10), 1, {
        style: {background: INSPECTOR_RULE, borderColor: null, borderRadius: 0, zIndex: Z.ELEMENT_RULE},
      })
    }
    IconButton(surface, planned.frame.x + 2, planned.frame.y + 2, Math.max(1, planned.frame.w - 4), Math.max(1, planned.frame.h - 4), {
      label: category.label,
      iconSrc: category.iconSrc,
      appearance: "toolbar-item",
      selected: category.id === props.selectedCategoryId,
      ...(category.disabled === undefined ? {} : {disabled: category.disabled}),
      style: {
        background: category.id === props.selectedCategoryId ? INSPECTOR_TAB_ACTIVE : INSPECTOR_TAB,
        borderColor: category.id === props.selectedCategoryId ? INSPECTOR_RULE : null,
        borderRadius: 4,
        padding: 0,
      },
      onClick: () => props.onCategoryChange?.(category.id),
    })
  }
}

function drawInspectorContext(surface: UiSurface, frame: InspectorSectionRect, context: InspectorContextRow): void {
  div(surface, frame.x, frame.y, frame.w, frame.h, {
    style: {background: INSPECTOR_BACK, borderColor: null, borderRadius: 0, zIndex: Z.CONTAINER + 0.02},
  })
  const actions = context.actions ?? []
  flexRow({
    x: frame.x + 6,
    y: frame.y + 3,
    w: Math.max(0, frame.w - 12),
    h: Math.max(0, frame.h - 6),
    gap: 4,
    alignItems: "center",
    items: [
      context.iconSrc === undefined ? false : {
        width: inspectorMetrics.iconSize,
        height: inspectorMetrics.iconSize,
        draw: (x, y, w, h) => drawIconCentered(surface, context.iconSrc!, x + w / 2, y + h / 2, Math.min(w, h)),
      },
      {
        width: "grow",
        height: Math.max(0, frame.h - 6),
        draw: (x, y, w, h) => Typography(surface, x, y, w, h, {
          children: context.label,
          variant: "body",
          style: {textAlign: "left"},
        }),
      },
      ...actions.map((action) => ({
        width: inspectorMetrics.actionSize,
        height: Math.max(0, frame.h - 6),
        draw: (x: number, y: number, w: number, h: number) => drawInspectorAction(surface, {x, y, w, h}, action),
      })),
    ],
  })
}

function drawInspectorSections(
  surface: UiSurface,
  frame: InspectorSectionRect,
  outerX: number,
  outerY: number,
  outerWidth: number,
  outerHeight: number,
  props: InspectorProps,
): void {
  const currentPlan = planInspector(outerX, outerY, outerWidth, outerHeight, props, divScrollPosition(surface, `${props.key}:sections`).top)
  div(surface, frame.x, frame.y, frame.w, frame.h, {
    key: `${props.key}:sections`,
    scrollContentHeight: currentPlan.sectionsContentHeight,
    style: {
      background: INSPECTOR_BACK,
      borderColor: null,
      borderRadius: 0,
      overflowY: "auto",
      scrollbarWidth: inspectorMetrics.scrollbarWidth,
      padding: 0,
      zIndex: Z.CONTAINER + 0.01,
    },
    children: (scroll) => {
      notifyInspectorScroll(surface, props, scroll.scrollTop)
      const plan = planInspector(outerX, outerY, outerWidth, outerHeight, props, scroll.scrollTop)
      for (const planned of plan.sections) {
        const section = props.sections.find(({id}) => id === planned.id)
        if (section !== undefined) drawInspectorSection(surface, planned, section, props)
      }
    },
  })
}

function drawInspectorSection(
  surface: UiSurface,
  planned: InspectorPlannedSection,
  section: InspectorSection,
  props: InspectorProps,
): void {
  const {frame, header, content} = planned
  div(surface, frame.x, frame.y, frame.w, frame.h, {
    style: {background: INSPECTOR_SECTION, borderColor: null, borderRadius: 4, overflow: "hidden", zIndex: Z.CONTAINER + 0.02},
  })
  div(surface, header.x, header.y, header.w, header.h, {
    key: `${props.key}:section:${section.id}`,
    hitCursor: "pointer",
    onClick: () => props.onSectionToggle?.(section.id, !section.expanded),
    style: {background: INSPECTOR_SECTION, borderColor: null, borderRadius: 4, padding: 0, zIndex: Z.ELEMENT},
    children: () => {
      const actions = section.actions ?? []
      flexRow({
        x: header.x + 5,
        y: header.y,
        w: Math.max(0, header.w - 10),
        h: header.h,
        gap: 3,
        alignItems: "center",
        items: [
          {
            width: 14,
            height: 14,
            draw: (x, y, w, h) => drawIconCentered(
              surface,
              section.expanded ? uiIcons.chevronDown : uiIcons.chevronRight,
              x + w / 2,
              y + h / 2,
              Math.min(w, h),
            ),
          },
          {
            width: "grow",
            height: header.h,
            draw: (x, y, w, h) => Typography(surface, x, y, w, h, {
              children: section.label,
              variant: "subtitle",
              style: {textAlign: "left"},
            }),
          },
          ...actions.map((action) => ({
            width: inspectorMetrics.actionSize,
            height: inspectorMetrics.actionSize,
            draw: (x: number, y: number, w: number, h: number) => drawInspectorAction(surface, {x, y, w, h}, action),
          })),
        ],
      })
    },
  })
  if (content !== null) section.render(surface, content)
}

function drawInspectorAction(surface: UiSurface, frame: InspectorSectionRect, action: InspectorAction): void {
  IconButton(surface, frame.x, frame.y, frame.w, frame.h, {
    label: action.label,
    iconSrc: action.iconSrc,
    appearance: "toolbar-item",
    ...(action.selected === undefined ? {} : {selected: action.selected}),
    ...(action.disabled === undefined ? {} : {disabled: action.disabled}),
    style: {background: null, borderColor: null, borderRadius: 4, padding: 0},
    ...(action.action === undefined ? {} : {onClick: action.action}),
  })
}

function planInspectorSection(section: InspectorSection, frame: InspectorSectionRect): InspectorPlannedSection {
  let header: InspectorSectionRect = {x: frame.x, y: frame.y, w: frame.w, h: 0}
  let body: InspectorSectionRect | null = null
  flexColumn({
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    gap: 0,
    items: [
      {height: Math.min(inspectorMetrics.sectionHeaderHeight, frame.h), draw: (x, y, w, h) => { header = {x, y, w, h} }},
      section.expanded ? {height: "grow", draw: (x, y, w, h) => { body = {x, y, w, h} }} : false,
    ],
  })
  const bodyFrame = body as InspectorSectionRect | null
  const content = bodyFrame === null ? null : {
    x: bodyFrame.x + inspectorMetrics.sectionContentInset,
    y: bodyFrame.y + inspectorMetrics.sectionContentInset,
    w: Math.max(0, bodyFrame.w - inspectorMetrics.sectionContentInset * 2),
    h: Math.max(0, bodyFrame.h - inspectorMetrics.sectionContentInset * 2),
  }
  return Object.freeze({
    id: section.id,
    frame: freezeRect(frame),
    header: freezeRect(header),
    content: content === null ? null : freezeRect(content),
  })
}

function inspectorSectionHeight(section: InspectorSection): number {
  if (!section.expanded) return inspectorMetrics.sectionHeaderHeight
  return inspectorMetrics.sectionHeaderHeight + inspectorMetrics.sectionContentInset * 2 + Math.max(0, section.contentHeight)
}

function inspectorOuterStyle(style: StyleProps | undefined): StyleProps {
  return {
    background: INSPECTOR_BACK,
    borderColor: INSPECTOR_RULE,
    borderRadius: 6,
    borderWidth: 1,
    padding: 0,
    overflow: "hidden",
    zIndex: Z.CONTAINER,
    ...style,
  }
}

function visibleInspectorSections(props: InspectorPlanProps): readonly InspectorSection[] {
  const query = (props.query ?? "").trim().toLocaleLowerCase()
  const selectedCategory = props.categories.find(({id}) => id === props.selectedCategoryId)
  const allowedSections = selectedCategory === undefined
    ? new Set<string>()
    : selectedCategory.sectionIds === undefined
      ? null
      : new Set(selectedCategory.sectionIds)
  const categorySections = allowedSections === null
    ? props.sections
    : props.sections.filter(({id}) => allowedSections.has(id))
  return query.length === 0
    ? categorySections
    : categorySections.filter(({label}) => label.toLocaleLowerCase().includes(query))
}

function planInspectorCategories(
  rail: InspectorSectionRect,
  categories: readonly InspectorCategory[],
): readonly InspectorPlannedCategory[] {
  const frames = new Map<string, InspectorSectionRect>()
  const items: Array<Parameters<typeof flexColumn>[0]["items"][number]> = []
  for (const category of categories) {
    if (category.dividerBefore === true && items.length > 0) items.push({height: 3, width: rail.w, draw() {}})
    items.push({
      height: inspectorMetrics.categoryHeight,
      width: rail.w,
      draw: (x, y, w, h) => { frames.set(category.id, {x, y, w, h}) },
    })
  }
  flexColumn({
    x: rail.x,
    y: rail.y + 3,
    w: rail.w,
    h: Math.max(0, rail.h - 6),
    gap: inspectorMetrics.categoryGap,
    alignItems: "stretch",
    items,
  })
  return Object.freeze(categories.flatMap(({id}) => {
    const frame = frames.get(id)
    return frame === undefined ? [] : [Object.freeze({id, frame: freezeRect(frame)})]
  }))
}

const inspectorScrollPositions = new WeakMap<UiSurface, Map<string, number>>()

function notifyInspectorScroll(surface: UiSurface, props: InspectorProps, top: number): void {
  let positions = inspectorScrollPositions.get(surface)
  if (positions === undefined) {
    positions = new Map()
    inspectorScrollPositions.set(surface, positions)
  }
  const previous = positions.get(props.key)
  positions.set(props.key, top)
  if (previous === undefined || previous === top) return
  props.onSectionsScrollChange?.(Object.freeze({left: 0, top}))
}

function validateInspectorIdentity(categories: readonly InspectorCategory[], sections: readonly InspectorSection[]): void {
  assertUniqueIds("category", categories.map(({id}) => id))
  assertUniqueIds("section", sections.map(({id}) => id))
  const sectionIds = new Set(sections.map(({id}) => id))
  for (const category of categories) {
    for (const id of category.sectionIds ?? []) {
      if (!sectionIds.has(id)) throw new Error(`Inspector category references unknown section: ${category.id}/${id}`)
    }
  }
}

function assertUniqueIds(owner: string, ids: readonly string[]): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (id.length === 0) throw new Error(`Inspector ${owner} id must not be empty`)
    if (seen.has(id)) throw new Error(`Inspector ${owner} id must be unique: ${id}`)
    seen.add(id)
  }
}

function freezeRect(rect: InspectorSectionRect): InspectorSectionRect {
  return Object.freeze({...rect})
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

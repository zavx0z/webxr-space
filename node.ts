import {Color} from "@engine/core"
import {IconButton} from "@ui/components/button"
import {Field, measureFieldLayout, type FieldColor, type FieldDefinition} from "@ui/components/field"
import {Typography} from "@ui/components/typography"
import {flexColumn, flexRow} from "@layout/core/flex"
import {Z} from "@layout/core/surface"
import {uiIcons} from "@ui/elements/icons"
import {palette} from "@ui/elements/theme"
import {DEFAULT_NODE_CANVAS_OVERLAY_STATE} from "./node-editor.ts"
import {sampleLinkBezierPath} from "./link-curve.ts"
import {
  parameterRenderer,
  type Parameter,
  type ParameterPlan,
} from "./parameter.ts"
import type {
  Frame,
  FrameRenderer,
  Link,
  LinkRenderer,
  Node,
  NodeEditorRenderers,
  NodeCanvasOverlayState,
  NodeRenderer,
  NodeRect,
  PositionedNode,
  PositionedSocket,
  Socket,
  SocketRenderer,
  SocketRendererContext,
  SocketSide,
} from "./node-editor.ts"

export const SOCKET_KINDS = Object.freeze([
  "boolean",
  "float",
  "integer",
  "vector",
  "rotation",
  "color",
  "string",
  "menu",
  "object",
  "collection",
  "image",
  "material",
  "texture",
  "geometry",
  "matrix",
  "shader",
  "bundle",
  "closure",
  "custom",
] as const)

export type SocketKind = typeof SOCKET_KINDS[number]

export const SOCKET_SHAPES = Object.freeze([
  "circle",
  "square",
  "diamond",
  "circle-dot",
  "square-dot",
  "diamond-dot",
  "line",
  "volume-grid",
] as const)

export type SocketViewShape = typeof SOCKET_SHAPES[number]

export type SocketPreset = Readonly<{
  kind: SocketKind
  label: string
  color: FieldColor
  shape: SocketViewShape
  defaultFieldKind?: FieldDefinition["kind"]
}>

export type FrameView = Frame & Readonly<{
  label: string
  color?: FieldColor
  labelSize?: number
}>

export type SocketView = Socket & Readonly<{
  label: string
  socketType: SocketKind
  shape?: SocketViewShape
  side?: SocketSide
  description?: string
  hideValue?: boolean
}>

export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
}>

export type NodePreview = Readonly<{
  enabled: boolean
  image?: NodePreviewImage
  onToggle?(enabled: boolean): void
}>

export type NodeView = Omit<Node, "parameters"> & Readonly<{
  title: string
  label?: string
  category?: string
  headerColor?: FieldColor
  properties?: readonly FieldDefinition[]
  parameters?: readonly Parameter[]
  sockets?: readonly SocketView[]
  collapsed?: boolean
  preview?: NodePreview
}>

export type LinkView = Link & Readonly<{
  label?: string
  socketType?: SocketKind
}>

export type NodePlan = Readonly<{
  rect: NodeRect
  bounds: NodeRect
  header: NodeRect
  body: NodeRect
  preview: Readonly<{
    capable: boolean
    enabled: boolean
    panel: NodeRect | null
    image: (NodeRect & Readonly<{src: string}>) | null
  }>
  fields: readonly Readonly<{
    field: FieldDefinition
    rect: NodeRect
    editorRect: NodeRect
  }>[]
  parameters: readonly ParameterPlan[]
  sockets: readonly PositionedSocket<SocketView>[]
}>

export const SOCKET_PRESETS: Readonly<Record<SocketKind, SocketPreset>> = Object.freeze({
  boolean: preset("boolean", "Boolean", [0.86, 0.33, 0.52], "circle", "boolean"),
  float: preset("float", "Float", [0.62, 0.62, 0.62], "circle", "number"),
  integer: preset("integer", "Integer", [0.36, 0.62, 0.42], "circle", "integer"),
  vector: preset("vector", "Vector", [0.39, 0.54, 0.92], "circle", "vector"),
  rotation: preset("rotation", "Rotation", [0.58, 0.42, 0.88], "diamond", "rotation"),
  color: preset("color", "Color", [0.92, 0.78, 0.24], "circle", "color"),
  string: preset("string", "String", [0.42, 0.72, 0.72], "circle", "text"),
  menu: preset("menu", "Menu", [0.38, 0.42, 0.48], "diamond", "enum"),
  object: preset("object", "Object", [0.93, 0.49, 0.22], "circle", "reference"),
  collection: preset("collection", "Collection", [0.88, 0.88, 0.88], "square", "reference"),
  image: preset("image", "Image", [0.58, 0.42, 0.84], "circle", "reference"),
  material: preset("material", "Material", [0.83, 0.25, 0.30], "circle", "reference"),
  texture: preset("texture", "Texture", [0.73, 0.44, 0.20], "circle", "reference"),
  geometry: preset("geometry", "Geometry", [0.22, 0.68, 0.57], "diamond"),
  matrix: preset("matrix", "Matrix", [0.36, 0.57, 0.80], "square", "matrix"),
  shader: preset("shader", "Shader", [0.33, 0.78, 0.38], "circle"),
  bundle: preset("bundle", "Bundle", [0.18, 0.62, 0.68], "square-dot"),
  closure: preset("closure", "Closure", [0.67, 0.44, 0.29], "diamond-dot"),
  custom: preset("custom", "Custom", [0.84, 0.35, 0.82], "circle-dot"),
})

export type SocketVisualPolicy = Readonly<{
  diameter: number
  outlineWidth: number
  cornerRadius: number
  strokeWidth: number
  innerDotDiameter: number
}>

/**
 * Intrinsic local Socket geometry calibrated to the accepted compact node reference.
 *
 * The reference uses a radius of one quarter widget unit, so the ordinary Socket
 * diameter is one half unit. These metrics remain local scene geometry: the
 * retained Node parent scales them continuously and no screen-space floor is
 * applied here.
 */
export const SOCKET_VISUAL_POLICY: SocketVisualPolicy = Object.freeze({
  diameter: 10,
  outlineWidth: 1,
  cornerRadius: 1,
  strokeWidth: 2,
  innerDotDiameter: 3,
})

const NODE_HEADER_HEIGHT = 24
const NODE_HEADER_ACTION_WIDTH = 20
const NODE_RADIUS = 6
const NODE_PREVIEW_PADDING = 3
const NODE_PREVIEW_PANEL_FILL = new Color(0x2b / 255, 0x2b / 255, 0x2b / 255, 0.65)
const NODE_PREVIEW_PANEL_OUTLINE = new Color(0x11 / 255, 0x11 / 255, 0x11 / 255, 1)

/**
 * Intrinsic Node shadow mapped from the accepted reference law.
 *
 * The reference uses `shadow_width = 0.6 × widget_unit` and alpha `0.5`. The
 * local widget rhythm is 20, so the complete soft fade is 12 local units.
 * reference does not define a separate solid spread for this shadow, therefore
 * the analytical SDF keeps spread at zero. The retained Node parent scales the
 * same local values continuously; there is no fixture offset or screen floor.
 */
const NODE_SHADOW_VISUAL_POLICY = Object.freeze({
  blur: 0.6 * 20,
  spread: 0,
  opacity: 0.5,
})
const NODE_HEADER_VISUAL_POLICY = Object.freeze({
  leftPadding: 8,
  rightPadding: 6,
  iconSlotWidth: 12,
  iconGap: 4,
  chevronEnvelope: 8,
  chevronDepth: 5,
  chevronStrokeWidth: 1.5,
  chevronOpticalInset: chevronMiterOpticalInset(8, 5, 1.5),
})
const NODE_PADDING = 8
const NODE_GAP = 3
/** Accepted default width with a separate resize minimum. */
const NODE_DEFAULT_WIDTH = 140
const NODE_MIN_WIDTH = 100
/** Half-widget row rhythm at the accepted 20-unit widget scale. */
const NODE_DYS = 10
const NODE_MIN_HEIGHT = 52
const NODE_FONT_PX = 11
const NODE_FONT_LETTER_SPACING = NODE_FONT_PX * 0.05
const NODE_FONT_GLYPH_ADVANCE = NODE_FONT_PX * 0.6
const NODE_FONT_SPACE_ADVANCE = NODE_FONT_PX * 0.3
const EMPTY_CONNECTED_SOCKET_IDS: ReadonlySet<string> = new Set()

export function socketPreset(kind: SocketKind): SocketPreset {
  return SOCKET_PRESETS[kind]
}

export type NodeMeasurement = Readonly<{width: number; height: number}>

export function measureNode(
  node: NodeView,
  connectedSocketIds: ReadonlySet<string> = EMPTY_CONNECTED_SOCKET_IDS,
): NodeMeasurement {
  const width = measureNodeWidth(node)
  if (node.collapsed) {
    const sockets = node.sockets ?? []
    const maxSideCount = Math.max(
      sockets.filter((socket) => socketSide(socket) === "left").length,
      sockets.filter((socket) => socketSide(socket) === "right").length,
    )
    return {width, height: Math.max(NODE_HEADER_HEIGHT, maxSideCount * 8 + 10)}
  }
  const rows = nodeRows(node, connectedSocketIds)
  const rowsHeight = rows.reduce((height, row) => height + rowHeight(row), 0)
    + Math.max(0, rows.length - 1) * NODE_GAP
  return {
    width,
    height: Math.max(NODE_MIN_HEIGHT, NODE_HEADER_HEIGHT + NODE_PADDING * 2 + rowsHeight),
  }
}

/**
 * Plans the initial Node width from the same content later materialized by the
 * renderer. The accepted preset is 140 units with a separate 100-unit
 * resize minimum. Nodes uses the default as the initial floor, then expands
 * it for the project font, Socket/property labels and shared Field intrinsic
 * widths with the reference's 10-unit horizontal content margin. Explicit positioned
 * widths remain owned by `positionNode` / `planNode` and never
 * pass through this initial planner, so the resize contract may approach the
 * separate minimum.
 */
function measureNodeWidth(node: NodeView): number {
  const headerWidth = NODE_HEADER_VISUAL_POLICY.leftPadding
    + NODE_HEADER_VISUAL_POLICY.iconSlotWidth
    + NODE_HEADER_VISUAL_POLICY.iconGap
    + measureNodeTextWidth(node.label ?? node.title)
    + (node.preview === undefined ? 0 : NODE_HEADER_ACTION_WIDTH)
    + NODE_HEADER_VISUAL_POLICY.rightPadding
  if (node.collapsed) return Math.ceil(Math.max(NODE_MIN_WIDTH, NODE_DEFAULT_WIDTH, headerWidth))
  let contentWidth = 0
  for (const field of node.properties ?? []) {
    contentWidth = Math.max(contentWidth, measureFieldContentWidth(field, field.label))
  }
  for (const parameter of node.parameters ?? []) {
    const sockets = (node.sockets ?? []).filter((socket) => socket.parameterId === parameter.id)
    const side = sockets.length === 0 ? undefined : parameterLabelSide(sockets)
    const label = side === undefined ? parameter.label : socketPropertyLabel(parameter.label, side)
    contentWidth = Math.max(contentWidth, measureFieldContentWidth(parameter.field, label))
  }
  for (const socket of node.sockets ?? []) {
    if (socket.parameterId !== undefined) continue
    contentWidth = Math.max(contentWidth, measureNodeTextWidth(socket.label))
  }
  return Math.ceil(Math.max(
    NODE_MIN_WIDTH,
    NODE_DEFAULT_WIDTH,
    headerWidth,
    contentWidth + NODE_DYS * 2,
  ))
}

function measureFieldContentWidth(field: FieldDefinition | undefined, label: string): number {
  const intrinsicWidth = field === undefined
    ? 0
    : measureFieldLayout(field, {density: "compact"}).intrinsicWidth ?? 0
  return Math.max(intrinsicWidth, measureNodeTextWidth(label))
}

/** Mirrors the project font defaults used by `UiSurface.measureText`. */
function measureNodeTextWidth(value: string): number {
  let width = 0
  for (const character of value) {
    width += character === " "
      ? NODE_FONT_SPACE_ADVANCE
      : NODE_FONT_GLYPH_ADVANCE + NODE_FONT_LETTER_SPACING
  }
  return width
}

/** Plans Standard Node child slots and exact Socket anchors through shared Flex. */
export function planNode(
  node: NodeView,
  frame: NodeRect,
  connectedSocketIds: ReadonlySet<string> = EMPTY_CONNECTED_SOCKET_IDS,
  overlayState: NodeCanvasOverlayState = DEFAULT_NODE_CANVAS_OVERLAY_STATE,
  measured: NodeMeasurement = measureNode(node, connectedSocketIds),
): NodePlan {
  if (node.collapsed) return planCollapsedNodeView(node, frame, overlayState)
  const rect = {...frame, h: measured.height}
  const regions = nodeRegions(rect)
  const fields: Array<{
    field: FieldDefinition
    rect: NodeRect
    editorRect: NodeRect
  }> = []
  const parameters: ParameterPlan[] = []
  const sockets: PositionedSocket<SocketView>[] = []
  const rows = nodeRows(node, connectedSocketIds)
  flexColumn({
    x: regions.body.x,
    y: regions.body.y,
    w: regions.body.w,
    h: regions.body.h,
    paddingX: NODE_PADDING,
    paddingY: NODE_PADDING,
    gap: NODE_GAP,
    items: rows.map((row) => ({
      height: rowHeight(row),
      draw: (x: number, y: number, w: number, h: number) => {
        const layout = row.field === undefined ? null : measureFieldLayout(row.field, {density: "compact"})
        const intrinsicWidth = layout?.intrinsicWidth ?? w
        const fieldWidth = Math.min(w, intrinsicWidth)
        const fieldRect = {x: x + (w - fieldWidth) / 2, y, w: fieldWidth, h}
        const labelRect = layout !== null && layout.labelRowHeight > 0
          ? {x: fieldRect.x, y: fieldRect.y, w: fieldRect.w, h: layout.labelRowHeight}
          : fieldRect
        const editorVisible = row.editorVisible
        const separateLabel = row.parameter !== undefined && row.sockets.length > 0 && layout !== null && layout.labelRowHeight > 0
        const editorRect = separateLabel && layout !== null
          ? {
              x: fieldRect.x,
              y: fieldRect.y + layout.controlOffsetY,
              w: fieldRect.w,
              h: editorVisible ? layout.controlHeight : 0,
            }
          : fieldRect
        if (row.field !== undefined && row.parameter === undefined) fields.push({
          field: row.field,
          rect: fieldRect,
          editorRect,
        })
        if (row.parameter !== undefined) parameters.push({
          parameter: row.parameter,
          rect: fieldRect,
          labelRect,
          editorRect,
          editorVisible,
          separateLabel,
          ...(row.sockets.length === 0 ? {} : {side: parameterLabelSide(row.sockets)}),
        })
        for (const socket of row.sockets) sockets.push({
          socket,
          side: socketSide(socket),
          center: socketCenter(rect, labelRect, socket),
        })
      },
    })),
  })
  const preview = planNodePreview(node, rect, overlayState)
  return {
    rect,
    bounds: preview.panel === null ? rect : unionNodeRects(rect, preview.panel),
    header: regions.header,
    body: regions.body,
    preview,
    fields,
    parameters,
    sockets,
  }
}

function planCollapsedNodeView(
  node: NodeView,
  frame: NodeRect,
  overlayState: NodeCanvasOverlayState,
): NodePlan {
  const sockets: PositionedSocket<SocketView>[] = []
  for (const side of ["left", "right"] as const) {
    const entries = (node.sockets ?? []).filter((socket) => socketSide(socket) === side)
    entries.forEach((socket, index) => sockets.push({
      socket,
      side,
      center: {
        x: side === "left" ? frame.x : frame.x + frame.w,
        y: frame.y + frame.h / 2 + (index - (entries.length - 1) / 2) * 8,
      },
    }))
  }
  const preview = planNodePreview(node, frame, overlayState)
  return {
    rect: frame,
    bounds: preview.panel === null ? frame : unionNodeRects(frame, preview.panel),
    header: frame,
    body: {...frame, h: 0},
    preview,
    fields: [],
    parameters: [],
    sockets,
  }
}

function planNodePreview(
  node: NodeView,
  rect: NodeRect,
  overlayState: NodeCanvasOverlayState,
): NodePlan["preview"] {
  const preview = node.preview
  const capable = preview !== undefined
  const enabled = preview?.enabled === true
  const image = preview?.image
  if (!capable || !enabled || !overlayState.overlays || !overlayState.previews || image === undefined ||
    image.src.length === 0 || !Number.isFinite(image.width) || !Number.isFinite(image.height) ||
    image.width <= 0 || image.height <= 0) {
    return Object.freeze({capable, enabled, panel: null, image: null})
  }

  const panelWidth = Math.max(1, rect.w - NODE_PREVIEW_PADDING * 2)
  const imageEnvelopeWidth = Math.max(1, panelWidth - NODE_PREVIEW_PADDING * 2)
  let imageWidth: number
  let imageHeight: number
  let panelHeight: number
  if (image.width > image.height) {
    imageWidth = imageEnvelopeWidth
    imageHeight = imageEnvelopeWidth * image.height / image.width
    panelHeight = imageHeight + NODE_PREVIEW_PADDING * 2
  } else {
    panelHeight = panelWidth
    imageHeight = Math.max(1, panelHeight - NODE_PREVIEW_PADDING * 2)
    imageWidth = imageHeight * image.width / image.height
  }
  const panel: NodeRect = {
    x: rect.x + NODE_PREVIEW_PADDING,
    y: rect.y - panelHeight,
    w: panelWidth,
    h: panelHeight,
  }
  const imageRect = Object.freeze({
    x: panel.x + (panel.w - imageWidth) / 2,
    y: panel.y + NODE_PREVIEW_PADDING,
    w: imageWidth,
    h: imageHeight,
    src: image.src,
  })
  return Object.freeze({capable, enabled, panel: Object.freeze(panel), image: imageRect})
}

function unionNodeRects(left: NodeRect, right: NodeRect): NodeRect {
  const x = Math.min(left.x, right.x)
  const y = Math.min(left.y, right.y)
  return {
    x,
    y,
    w: Math.max(left.x + left.w, right.x + right.w) - x,
    h: Math.max(left.y + left.h, right.y + right.h) - y,
  }
}

function drawNodePreview(
  host: SocketRendererContext<SocketView>["host"],
  plan: NodePlan,
): void {
  const panel = plan.preview.panel
  const image = plan.preview.image
  if (panel === null || image === null) return
  host.drawRoundedRect(panel.x, panel.y, panel.w, panel.h, {
    radius: {tl: NODE_RADIUS, tr: NODE_RADIUS, br: 0, bl: 0},
    fill: NODE_PREVIEW_PANEL_FILL,
    border: NODE_PREVIEW_PANEL_OUTLINE,
    borderWidth: 1,
    z: Z.ELEMENT + 0.005,
  })
  host.drawImage(image.src, image.x, image.y, image.w, image.h, {
    fit: "contain",
    z: Z.ELEMENT + 0.006,
  })
}

export function positionNode(node: NodeView, rect: NodeRect): PositionedNode<NodeView, SocketView> {
  return {node, rect, sockets: planNode(node, rect).sockets}
}

export function createNodeRenderers(): NodeEditorRenderers<NodeView, SocketView, LinkView, FrameView, NodePlan> {
  return {
    frame: frameRenderer,
    node: nodeRenderer,
    parameter: parameterRenderer,
    socket: socketRenderer,
    link: linkRenderer,
  }
}

export const frameRenderer: FrameRenderer<FrameView> = Object.freeze({
  renderBackground({host, entry, selected}) {
    const color = entry.frame.color === undefined
      ? new Color(0.16, 0.34, 0.24, 1)
      : colorFrom(entry.frame.color)
    host.drawRoundedRect(entry.rect.x + 3, entry.rect.y + 5, entry.rect.w, entry.rect.h, {
      radius: 7,
      fill: new Color(0, 0, 0, 0.28),
      border: null,
      z: Z.CONTAINER,
    })
    host.drawRoundedRect(entry.rect.x, entry.rect.y, entry.rect.w, entry.rect.h, {
      radius: 7,
      fill: fade(color, 0.42),
      border: selected ? palette.orange : fade(color, 0.88),
      borderWidth: selected ? 2 : 1,
      z: Z.CONTAINER + 0.04,
    })
  },
  renderForeground({host, entry, selected}) {
    flexRow({
      x: entry.rect.x,
      y: entry.rect.y,
      w: entry.rect.w,
      h: 34,
      justifyContent: "center",
      alignItems: "center",
      items: [{
        width: "grow",
        height: 30,
        draw: (x, y, w, h) => Typography(host, x, y, w, h, {
          children: entry.frame.label,
          fontPx: entry.frame.labelSize ?? 17,
          color: selected ? "orange" : "text",
          sx: {textAlign: "center"},
        }),
      }],
    })
  },
})

export const nodeRenderer: NodeRenderer<NodeView, SocketView, NodePlan> = Object.freeze({
  measure: measureNode,
  plan({entry, connectedSocketIds, overlayState}) {
    return planNode(
      entry.node,
      entry.rect,
      connectedSocketIds,
      overlayState ?? DEFAULT_NODE_CANVAS_OVERLAY_STATE,
    )
  },
  presentation({entry}, plan) {
    return {...entry, rect: plan.rect, sockets: plan.sockets}
  },
  bounds(_context, plan) {
    return plan.bounds
  },
  render({host, entry, selected, plan, parameterRenderer}) {
    const {node} = entry
    const rect = plan.rect
    const header = nodeHeaderColor(node)
    drawNodePreview(host, plan)
    host.drawRoundedShadow(rect.x, rect.y, rect.w, rect.h, {
      radius: NODE_RADIUS,
      blur: NODE_SHADOW_VISUAL_POLICY.blur,
      spread: NODE_SHADOW_VISUAL_POLICY.spread,
      color: selected ? header : new Color(0, 0, 0, 1),
      opacity: NODE_SHADOW_VISUAL_POLICY.opacity,
      z: Z.ELEMENT - 0.02,
    })
    host.drawRoundedRect(rect.x, rect.y, rect.w, rect.h, {
      radius: NODE_RADIUS,
      fill: new Color(0.188, 0.188, 0.188, 1),
      border: new Color(0.075, 0.075, 0.075, 1),
      borderWidth: 1,
      z: Z.ELEMENT,
    })
    host.drawRoundedRect(plan.header.x, plan.header.y, plan.header.w, plan.header.h, {
      radius: NODE_RADIUS,
      fill: fade(header, 0.82),
      border: null,
      z: Z.ELEMENT + 0.01,
    })
    flexRow({
      x: plan.header.x,
      y: plan.header.y,
      w: plan.header.w,
      h: plan.header.h,
      paddingLeft: NODE_HEADER_VISUAL_POLICY.leftPadding,
      paddingRight: NODE_HEADER_VISUAL_POLICY.rightPadding,
      gap: NODE_HEADER_VISUAL_POLICY.iconGap,
      alignItems: "stretch",
      items: [
        {
          width: NODE_HEADER_VISUAL_POLICY.iconSlotWidth,
          height: plan.header.h,
          draw: (slotX, slotY, slotW, slotH) => drawNodeCollapseChevron(
            host,
            slotX,
            slotY,
            slotW,
            slotH,
            node.collapsed === true,
          ),
        },
        {width: "grow", height: plan.header.h, draw: (slotX, slotY, slotW, slotH) => Typography(host, slotX, slotY, slotW, slotH, {
          children: node.label ?? node.title,
          fontPx: 11,
          color: selected ? "orange" : "text",
        })},
        node.preview === undefined ? false : {
          width: NODE_HEADER_ACTION_WIDTH,
          height: plan.header.h,
          draw: (slotX: number, slotY: number, slotW: number, slotH: number) => IconButton(
            host,
            slotX,
            slotY,
            slotW,
            slotH,
            {
              label: "Node Preview",
              iconSrc: node.preview!.enabled ? uiIcons.visibilityOn : uiIcons.visibilityOff,
              iconSizePx: 12,
              appearance: "tool",
              size: "small",
              selected: node.preview!.enabled,
              disabled: node.preview!.onToggle === undefined,
              sx: {background: null, borderColor: null},
              onClick: () => node.preview!.onToggle?.(!node.preview!.enabled),
            },
          ),
        },
      ],
    })
    if (!node.collapsed) {
      for (const {field, rect} of plan.fields) {
        Field(host, rect.x, rect.y, rect.w, {
          ...field,
          key: `${node.id}:${field.id}`,
        }, {density: "compact"})
      }
      for (const parameter of plan.parameters) {
        parameterRenderer.render({host, nodeId: node.id, entry: parameter, selected})
      }
    }
    for (const positioned of plan.sockets) {
      if (node.collapsed) continue
      const {socket, center, side} = positioned
      if (socket.parameterId !== undefined) continue
      if (side === "left") {
        drawSideSocketLabel(host, rect, center.y, socket.label, "left")
      } else {
        drawSideSocketLabel(host, rect, center.y, socket.label, "right")
      }
    }
  },
})

export const socketRenderer: SocketRenderer<SocketView> = Object.freeze({
  render({host, entry, selected}) {
    const preset = socketPreset(entry.socket.socketType)
    drawSocketShape(
      host,
      entry.center.x,
      entry.center.y,
      entry.socket.shape ?? preset.shape,
      colorFrom(preset.color),
      selected,
    )
  },
})

export const linkRenderer: LinkRenderer<LinkView> = Object.freeze({
  render({host, entry, selected}) {
    const preset = socketPreset(entry.link.socketType ?? "custom")
    const stroke = sampleLinkBezierPath(entry.points, 10, 6)
    host.drawPolyline(
      stroke,
      colorFrom(preset.color),
      selected ? 3.4 : 2.2,
      Z.ELEMENT + (selected ? 0.05 : 0.02),
    )
  },
})

type NodeRowBase = Readonly<{
  field?: FieldDefinition
  parameter?: Parameter
  sockets: readonly SocketView[]
}>

type NodeRow = NodeRowBase & Readonly<{editorVisible: boolean}>

function nodeRows(
  node: NodeView,
  connectedSocketIds: ReadonlySet<string> = EMPTY_CONNECTED_SOCKET_IDS,
): readonly NodeRow[] {
  const rows: NodeRowBase[] = []
  const looseSockets = (node.sockets ?? []).filter((socket) => socket.parameterId === undefined)
  for (const socket of looseSockets.filter((socket) => socketSide(socket) === "right")) {
    rows.push({sockets: [socket]})
  }
  for (const field of node.properties ?? []) rows.push({field, sockets: []})
  for (const parameter of node.parameters ?? []) rows.push({
    parameter,
    field: parameter.field,
    sockets: (node.sockets ?? []).filter((socket) => socket.parameterId === parameter.id),
  })
  for (const socket of looseSockets.filter((socket) => socketSide(socket) === "left")) {
    rows.push({sockets: [socket]})
  }
  return rows.map((row) => ({
    ...row,
    editorVisible: rowFieldEditorVisible(row, connectedSocketIds),
  }))
}

function rowHeight(row: NodeRow): number {
  if (row.field === undefined) return 22
  const layout = measureFieldLayout(row.field, {density: "compact"})
  return row.editorVisible ? layout.height : Math.max(22, layout.labelRowHeight)
}

function rowFieldEditorVisible(
  row: NodeRowBase,
  connectedSocketIds: ReadonlySet<string>,
): boolean {
  if (row.field === undefined || row.parameter === undefined || row.sockets.length === 0) return true
  return row.sockets.some((socket) =>
    socket.hideValue !== true
    && (socket.direction === "output" || !connectedSocketIds.has(socket.id)))
}

function parameterLabelSide(sockets: readonly SocketView[]): SocketSide {
  return sockets.every((socket) => socketSide(socket) === "right") ? "right" : "left"
}

function socketPropertyLabel(label: string, side: SocketSide): string {
  const value = label.trimEnd()
  if (side === "right") return value.endsWith(":") ? value.slice(0, -1).trimEnd() : value
  return value.endsWith(":") ? value : `${value}:`
}

function socketSide(socket: SocketView): SocketSide {
  if (socket.side !== undefined) return socket.side
  if (socket.direction === "input") return "left"
  return "right"
}

function socketCenter(
  nodeRect: NodeRect,
  rowRect: NodeRect,
  socket: SocketView,
): Readonly<{x: number; y: number}> {
  const side = socketSide(socket)
  const controlCenterY = rowRect.y + rowRect.h / 2
  if (side === "left") return {x: nodeRect.x, y: controlCenterY}
  return {x: nodeRect.x + nodeRect.w, y: controlCenterY}
}

function nodeRegions(rect: Readonly<{x: number; y: number; w: number; h: number}>): Readonly<{
  header: Readonly<{x: number; y: number; w: number; h: number}>
  body: Readonly<{x: number; y: number; w: number; h: number}>
}> {
  let header = {x: rect.x, y: rect.y, w: rect.w, h: 0}
  let body = {x: rect.x, y: rect.y, w: rect.w, h: rect.h}
  flexColumn({
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    items: [
      {height: NODE_HEADER_HEIGHT, draw: (x, y, w, h) => { header = {x, y, w, h} }},
      {height: "grow", draw: (x, y, w, h) => { body = {x, y, w, h} }},
    ],
  })
  return {header, body}
}

function drawSideSocketLabel(
  host: SocketRendererContext<SocketView>["host"],
  rect: Readonly<{x: number; y: number; w: number; h: number}>,
  centerY: number,
  label: string,
  side: "left" | "right",
): void {
  const height = 18
  flexRow({
    x: rect.x,
    y: centerY - height / 2,
    w: rect.w,
    h: height,
    paddingX: 8,
    gap: 8,
    items: side === "left" ? [
      {width: "1fr", height, draw: (x, y, w, h) => Typography(host, x, y, w, h, {children: label, fontPx: 11})},
      {width: "1fr", height, draw: () => {}},
    ] : [
      {width: "1fr", height, draw: () => {}},
      {width: "1fr", height, draw: (x, y, w, h) => Typography(host, x, y, w, h, {children: label, fontPx: 11, sx: {textAlign: "right"}})},
    ],
  })
}

/**
 * Intrinsic open chevron calibrated against the shared Node header rhythm.
 *
 * The accepted reference starts the icon button at `0.4 × widget_unit` and the title at
 * `1.2 × widget_unit`. The retained Node keeps one local square envelope and
 * rotates the same path between down/right states. One intrinsic compensation
 * cancels the polyline miter's directional extension, so the painted bounds
 * stay centered with the title regardless of font baseline or viewport scale.
 */
function drawNodeCollapseChevron(
  host: SocketRendererContext<SocketView>["host"],
  slotX: number,
  slotY: number,
  slotW: number,
  slotH: number,
  collapsed: boolean,
): void {
  const centerX = slotX + slotW / 2
    - (collapsed ? NODE_HEADER_VISUAL_POLICY.chevronOpticalInset : 0)
  const centerY = slotY + slotH / 2
    - (collapsed ? 0 : NODE_HEADER_VISUAL_POLICY.chevronOpticalInset)
  const halfEnvelope = NODE_HEADER_VISUAL_POLICY.chevronEnvelope / 2
  const halfDepth = NODE_HEADER_VISUAL_POLICY.chevronDepth / 2
  const points = collapsed ? [
    {x: centerX - halfDepth, y: centerY - halfEnvelope},
    {x: centerX + halfDepth, y: centerY},
    {x: centerX - halfDepth, y: centerY + halfEnvelope},
  ] : [
    {x: centerX - halfEnvelope, y: centerY - halfDepth},
    {x: centerX, y: centerY + halfDepth},
    {x: centerX + halfEnvelope, y: centerY - halfDepth},
  ]
  host.drawPolyline(
    points,
    palette.text,
    NODE_HEADER_VISUAL_POLICY.chevronStrokeWidth,
    Z.TEXT + 0.03,
  )
}

function chevronMiterOpticalInset(envelope: number, depth: number, strokeWidth: number): number {
  const armRun = envelope / 2
  const armRunUnit = armRun / Math.hypot(armRun, depth)
  return strokeWidth / 4 * (1 / armRunUnit - armRunUnit)
}

function drawSocketShape(
  host: SocketRendererContext<SocketView>["host"],
  cx: number,
  cy: number,
  shape: SocketViewShape,
  color: Color,
  selected: boolean,
): void {
  const bounds = socketVisualBounds({x: cx, y: cy})
  const radius = SOCKET_VISUAL_POLICY.diameter / 2
  const diamondHalfExtent = radius - SOCKET_VISUAL_POLICY.strokeWidth / Math.SQRT2
  if (shape === "line") {
    host.drawLine(
      cx,
      cy - radius,
      cx,
      cy + radius,
      color,
      SOCKET_VISUAL_POLICY.strokeWidth,
      Z.TEXT + 0.03,
    )
    return
  }
  if (shape === "volume-grid") {
    host.drawRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, {
      radius: SOCKET_VISUAL_POLICY.cornerRadius,
      fill: color,
      border: selected ? palette.windowActiveBorder : palette.bg,
      borderWidth: SOCKET_VISUAL_POLICY.outlineWidth,
      z: Z.TEXT + 0.03,
    })
    const gridHalfExtent = SOCKET_VISUAL_POLICY.diameter / 2 - SOCKET_VISUAL_POLICY.outlineWidth
    host.drawLine(cx, cy - gridHalfExtent, cx, cy + gridHalfExtent, palette.bg, SOCKET_VISUAL_POLICY.outlineWidth, Z.TEXT + 0.04)
    host.drawLine(cx - gridHalfExtent, cy, cx + gridHalfExtent, cy, palette.bg, SOCKET_VISUAL_POLICY.outlineWidth, Z.TEXT + 0.04)
    return
  }
  const baseShape = shape.replace("-dot", "") as "circle" | "square" | "diamond"
  const border = selected ? palette.windowActiveBorder : palette.bg
  if (baseShape === "circle" || baseShape === "square") {
    host.drawRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, {
      radius: baseShape === "circle"
        ? SOCKET_VISUAL_POLICY.diameter / 2
        : SOCKET_VISUAL_POLICY.cornerRadius,
      fill: color,
      border,
      borderWidth: SOCKET_VISUAL_POLICY.outlineWidth,
      z: Z.TEXT + 0.03,
    })
  } else {
    host.drawPolyline([
      {x: cx, y: cy - diamondHalfExtent},
      {x: cx + diamondHalfExtent, y: cy},
      {x: cx, y: cy + diamondHalfExtent},
      {x: cx - diamondHalfExtent, y: cy},
      {x: cx, y: cy - diamondHalfExtent},
    ], color, SOCKET_VISUAL_POLICY.strokeWidth, Z.TEXT + 0.03)
  }
  if (shape.endsWith("-dot")) {
    const dot = SOCKET_VISUAL_POLICY.innerDotDiameter
    host.drawRoundedRect(cx - dot / 2, cy - dot / 2, dot, dot, {
      radius: dot / 2,
      fill: palette.bg,
      border: null,
      z: Z.TEXT + 0.04,
    })
  }
}

/** Visual-only bounds; interaction hit targets remain a separate policy. */
export function socketVisualBounds(center: Readonly<{x: number; y: number}>): NodeRect {
  const radius = SOCKET_VISUAL_POLICY.diameter / 2
  return {
    x: center.x - radius,
    y: center.y - radius,
    w: SOCKET_VISUAL_POLICY.diameter,
    h: SOCKET_VISUAL_POLICY.diameter,
  }
}

function preset(
  kind: SocketKind,
  label: string,
  rgb: readonly [number, number, number],
  shape: SocketViewShape,
  defaultFieldKind?: FieldDefinition["kind"],
): SocketPreset {
  return {
    kind,
    label,
    color: {r: rgb[0], g: rgb[1], b: rgb[2], a: 1},
    shape,
    ...(defaultFieldKind === undefined ? {} : {defaultFieldKind}),
  }
}

function nodeHeaderColor(node: NodeView): Color {
  return node.headerColor === undefined ? palette.bgHot : colorFrom(node.headerColor)
}

function colorFrom(value: FieldColor): Color {
  return new Color(value.r, value.g, value.b, value.a)
}

function fade(color: Color, alpha: number): Color {
  return new Color(color.r, color.g, color.b, Math.max(0, Math.min(1, color.a * alpha)))
}

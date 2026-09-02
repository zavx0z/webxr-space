import {Object3D} from "../core/object-3d"
import {ViewPoint} from "../core/view-point"
import {Space} from "../scenes/space"

export const renderCompositionBackgroundShader = /* wgsl */ `
struct BackgroundUniform {
  color: vec4f,
}

@group(0) @binding(0) var<uniform> background: BackgroundUniform;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return background.color;
}
`

/** Exact rectangle in the Renderer canvas backing store, with a top-left origin. */
export type RendererPhysicalViewport = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

/** One independently viewed Space already attached below the composition Space. */
export type RenderBoundedView = Readonly<{
  space: Space
  viewPoint: ViewPoint
  viewport: RendererPhysicalViewport
}>

export type RenderOverlay = Object3D & {
  updateForViewPoint?(viewPoint: ViewPoint): void
}

/** One ordered presentation owned by a single Renderer and native canvas. */
export type RenderComposition = Readonly<{
  space: Space
  viewPoint: ViewPoint
  overlays?: RenderOverlay | readonly RenderOverlay[] | null
  boundedViews?: readonly RenderBoundedView[]
}>

export type PlannedRenderComposition = Readonly<{
  space: Space
  viewPoint: ViewPoint
  overlays: readonly RenderOverlay[]
  boundedViews: readonly RenderBoundedView[]
  excludedBaseRoots: ReadonlySet<Object3D>
}>

/** Internal fail-closed normalization shared by Renderer and focused tests. */
export function planRenderComposition(
  value: RenderComposition,
  canvas: Readonly<{width: number; height: number}>,
): PlannedRenderComposition {
  if (value === null || typeof value !== "object") {
    throw new TypeError("Render composition is required")
  }
  if (!(value.space instanceof Space)) throw new TypeError("Render composition space must be a Space")
  if (!(value.viewPoint instanceof ViewPoint)) {
    throw new TypeError("Render composition viewPoint must be a ViewPoint")
  }
  const overlays = normalizeOverlays(value.overlays)
  const excludedBaseRoots = new Set<Object3D>()
  for (const [index, overlay] of overlays.entries()) {
    if (overlay === value.space) {
      throw new Error(`Render composition overlay ${index} cannot be the composition Space`)
    }
    for (let previous = 0; previous < index; previous += 1) {
      const other = overlays[previous]!
      if (overlay === other) throw new Error(`Render composition overlay ${index} is already registered`)
      if (isStrictDescendant(other, overlay) || isStrictDescendant(overlay, other)) {
        throw new Error("Render composition overlays must not contain one another")
      }
    }
    if (isStrictDescendant(value.space, overlay)) excludedBaseRoots.add(overlay)
  }
  const boundedValues = value.boundedViews ?? Object.freeze([])
  if (!Array.isArray(boundedValues)) {
    throw new TypeError("Render composition boundedViews must be a list")
  }
  const boundedViews: RenderBoundedView[] = []
  const boundedRoots = new Set<Space>()
  for (const [index, candidate] of boundedValues.entries()) {
    if (candidate === null || typeof candidate !== "object") {
      throw new TypeError(`Bounded render view ${index} is required`)
    }
    if (!(candidate.space instanceof Space)) {
      throw new TypeError(`Bounded render view ${index} space must be a Space`)
    }
    if (!(candidate.viewPoint instanceof ViewPoint)) {
      throw new TypeError(`Bounded render view ${index} viewPoint must be a ViewPoint`)
    }
    if (!isStrictDescendant(value.space, candidate.space)) {
      throw new Error(`Bounded render view ${index} space must be a child or descendant of the composition space`)
    }
    if (boundedRoots.has(candidate.space)) {
      throw new Error(`Bounded render view ${index} space is already registered`)
    }
    for (const existing of boundedRoots) {
      if (isStrictDescendant(existing, candidate.space) || isStrictDescendant(candidate.space, existing)) {
        throw new Error("Bounded render view spaces must not contain one another")
      }
    }
    for (const overlay of overlays) {
      if (
        overlay === candidate.space ||
        isStrictDescendant(overlay, candidate.space) ||
        isStrictDescendant(candidate.space, overlay)
      ) {
        throw new Error(`Bounded render view ${index} space must not overlap an overlay`)
      }
    }
    const viewport = rendererPhysicalViewport(candidate.viewport, canvas, index)
    boundedRoots.add(candidate.space)
    excludedBaseRoots.add(candidate.space)
    boundedViews.push(Object.freeze({
      space: candidate.space,
      viewPoint: candidate.viewPoint,
      viewport,
    }))
  }
  return Object.freeze({
    space: value.space,
    viewPoint: value.viewPoint,
    overlays,
    boundedViews: Object.freeze(boundedViews),
    excludedBaseRoots,
  })
}

function normalizeOverlays(
  value: RenderComposition["overlays"],
): readonly RenderOverlay[] {
  const overlays = value === null || value === undefined
    ? []
    : Array.isArray(value)
      ? [...value]
      : [value as RenderOverlay]
  for (const [index, overlay] of overlays.entries()) {
    if (!(overlay instanceof Object3D)) {
      throw new TypeError(`Render composition overlay ${index} must be an Object3D`)
    }
  }
  return Object.freeze(overlays)
}

function rendererPhysicalViewport(
  value: RendererPhysicalViewport,
  canvas: Readonly<{width: number; height: number}>,
  index: number,
): RendererPhysicalViewport {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`Bounded render view ${index} viewport is required`)
  }
  const x = nonNegativeInteger(value.x, `Bounded render view ${index} viewport x`)
  const y = nonNegativeInteger(value.y, `Bounded render view ${index} viewport y`)
  const width = positiveInteger(value.width, `Bounded render view ${index} viewport width`)
  const height = positiveInteger(value.height, `Bounded render view ${index} viewport height`)
  if (x + width > canvas.width || y + height > canvas.height) {
    throw new RangeError(`Bounded render view ${index} viewport must fit the Renderer backing store`)
  }
  return Object.freeze({x, y, width, height})
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`)
  }
  return value
}

function isStrictDescendant(root: Object3D, candidate: Object3D): boolean {
  const visited = new Set<Object3D>()
  let current = candidate.parent
  while (current !== null && !visited.has(current)) {
    if (current === root) return true
    visited.add(current)
    current = current.parent
  }
  return false
}

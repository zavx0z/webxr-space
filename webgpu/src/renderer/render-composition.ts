import {Object3D} from "@zavx0z/engine"
import {ViewPoint} from "@zavx0z/engine"
import {Space} from "@zavx0z/engine"
import {SkinnedMesh} from "@zavx0z/engine"
import type {RenderItem} from "./utils/render-list"

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
  updateForViewPoint?(viewPoint: ViewPoint, options?: Readonly<{updateWorldMatrix?: boolean}>): void
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

/**
 * Fits camera-locked roots before updating the composition's world matrices.
 *
 * Attached overlays and bounded Spaces are descendants of the base Space and
 * share its traversal. Detached overlays still synchronize their live ancestry
 * and children. Root ancestry is checked rather than assumed, so no overlapping
 * subtree is visited twice by this phase. Legacy custom overlays may ignore the
 * optional deferred-matrix hint; their default fitting behavior is preserved.
 */
export function prepareCompositionWorldMatrices(composition: PlannedRenderComposition): void {
  for (const overlay of composition.overlays) {
    overlay.updateForViewPoint?.(composition.viewPoint, {updateWorldMatrix: false})
  }
  const roots = compositionMatrixRoots(composition)
  for (const root of roots) {
    let covered = false
    for (let parent = root.parent; parent !== null; parent = parent.parent) {
      // Projection roots are collected independently of presentation ancestors.
      // A hidden ancestor would prune it from the enclosing root's traversal.
      if (!parent.visible) break
      if (roots.has(parent)) {
        covered = true
        break
      }
    }
    if (!covered) root.updateWorldMatrix(true, {parents: true, visibleOnly: true})
  }
}

/**
 * Visible draws may still depend on hidden clip coordinate spaces or bones.
 * Synchronize only references in composition trees that the former full walk
 * visited. Detached/manual matrix providers are sampled, never overwritten.
 */
export function prepareHiddenRenderDependencies(
  composition: PlannedRenderComposition,
  items: readonly RenderItem[],
): void {
  const roots = compositionMatrixRoots(composition)
  // 0: outside the composition, 1: visited by visible traversal, 2: hidden path.
  const ancestry = new Map<Object3D, 0 | 1 | 2>()
  const synchronized = new Set<Object3D>()
  const visited = new Set<Object3D>()
  const syncHidden = (object: Object3D): void => {
    if (synchronized.has(object)) return
    synchronized.add(object)
    const path: Object3D[] = []
    let current: Object3D | null = object
    let state: 0 | 1 | 2 = 0
    while (current !== null) {
      const cached = ancestry.get(current)
      if (cached !== undefined) {
        state = cached
        break
      }
      if (roots.has(current)) {
        state = current.visible ? 1 : 2
        ancestry.set(current, state)
        break
      }
      path.push(current)
      current = current.parent
    }
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const node = path[index]!
      if (state !== 0 && !node.visible) state = 2
      ancestry.set(node, state)
    }
    if (state === 2) object.updateWorldMatrix(true, {parents: true, children: false})
  }

  for (const item of items) {
    const object = item.object
    if (visited.has(object)) continue
    visited.add(object)
    if (object instanceof SkinnedMesh) {
      for (const bone of object.skeleton.bones) syncHidden(bone)
    }
    try {
      const shapes = object.presentationClips
      if (!Array.isArray(shapes)) continue
      for (const shape of shapes) {
        const coordinateSpace = shape?.coordinateSpace
        if (coordinateSpace instanceof Object3D) syncHidden(coordinateSpace)
      }
    } catch {
      // The encoder owns malformed-clip validation and fail-closed records.
    }
  }
}

function compositionMatrixRoots(composition: PlannedRenderComposition): Set<Object3D> {
  const roots = new Set<Object3D>([composition.space, ...composition.overlays])
  for (const view of composition.boundedViews) roots.add(view.space)
  return roots
}

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

import {Mesh} from "../core/mesh"
import {
  ColorPickerMaterial,
  ImageMaterial,
  MeshBasicMaterial,
  RadialBackdropMaterial,
  RoundedRectMaterial,
} from "../materials"
import type {RenderItem} from "./utils/render-list"

/** Renderer-internal fail-closed gate for pipelines with clip-chain support. */
export function renderItemSupportsPresentationClips(item: RenderItem): boolean {
  if (item.type === "text-stencil" || item.type === "text-cover") return true
  if (item.type === "instanced-stroked-path") return true
  if (item.type !== "static-mesh") return false
  const mesh = item.object as Mesh
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  return material instanceof MeshBasicMaterial ||
    material instanceof ImageMaterial ||
    material instanceof RoundedRectMaterial ||
    material instanceof ColorPickerMaterial ||
    (material as RadialBackdropMaterial | undefined)?.isRadialBackdropMaterial === true
}

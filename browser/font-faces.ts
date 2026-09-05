import {loadSharedFont} from "@zavx0z/engine/default-font"
import type {RendererFontFace} from "@zavx0z/webgpu"

export type BrowserFontFaceSource = Readonly<{
  family: string
  weight: number
  style: "normal" | "italic"
  src: string
}>

/** Loads declared faces through the Engine-owned shared font cache. */
export async function loadFontFaces(
  sources: readonly BrowserFontFaceSource[],
  baseUrl?: string,
): Promise<readonly RendererFontFace[]> {
  const identities = new Set<string>()
  for (const source of sources) {
    const identity = `${source.family.toLowerCase()}:${source.weight}:${source.style}`
    if (source.family.trim() === "" || source.src.trim() === "" ||
      !Number.isFinite(source.weight) || source.weight < 1 || source.weight > 1000 ||
      source.style !== "normal" && source.style !== "italic" || identities.has(identity)) {
      throw new TypeError("Invalid or duplicate font face declaration")
    }
    identities.add(identity)
  }
  return Object.freeze(await Promise.all(sources.map(async source => Object.freeze({
    family: source.family,
    weight: source.weight,
    style: source.style,
    font: await loadSharedFont(source.src, baseUrl),
  }))))
}

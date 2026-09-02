/**
Shared lazy loading for the Engine-owned default font.

Importing this optional entrypoint does not request a font. A browser document
declares its default through `<meta name="engine-default-font" content="…">`,
and the first consumer without an explicit font starts one cached fetch.

@packageDocumentation
*/

import {TrueTypeFont} from "./true-type-font"

export const DEFAULT_FONT_META_NAME = "engine-default-font"

export type DefaultFontDocument = Readonly<{
  baseURI: string
  querySelector(selector: string): {getAttribute(name: string): string | null} | null
}>

const fontLoads = new Map<string, Promise<TrueTypeFont>>()

/**
Resolves the document-level default without requesting it.

The composition root owns the `<meta>` value. Component and package code only
consumes the resulting shared font.

@param documentRef - Browser document or a document-compatible test boundary.

@returns Absolute URL declared by the document.

@throws If the declaration is absent, empty, or cannot be resolved against the
document base URL.
*/
export function documentDefaultFontUrl(documentRef: DefaultFontDocument = currentDocument()): string {
  const declaration = documentRef.querySelector(`meta[name="${DEFAULT_FONT_META_NAME}"]`)
  const source = declaration?.getAttribute("content")?.trim()
  if (!source) throw new Error(`Document must declare <meta name="${DEFAULT_FONT_META_NAME}" content="…">`)
  return resolveFontUrl(source, documentRef.baseURI)
}

/**
Loads and parses one font per absolute URL.

Concurrent and later callers receive the same promise and `TrueTypeFont`
instance. A rejected request is removed from the cache so a later call may
retry.

@param source - Absolute URL or a URL relative to `baseUrl`/the current
document. `file:` URLs are supported by Bun tests.
@param baseUrl - Base used only for a relative `source`.

@returns Shared parsed font.

@throws If the URL is invalid or {@link TrueTypeFont.fromUrl} cannot fetch or
parse the resource.
*/
export function loadSharedFont(source: string, baseUrl?: string): Promise<TrueTypeFont> {
  const url = resolveFontUrl(source, baseUrl ?? currentBaseUrl())
  const existing = fontLoads.get(url)
  if (existing !== undefined) return existing

  const pending = TrueTypeFont.fromUrl(url).catch((error: unknown) => {
    if (fontLoads.get(url) === pending) fontLoads.delete(url)
    throw error
  })
  fontLoads.set(url, pending)
  return pending
}

/**
Loads the default declared by the browser composition root.

Calling code with a custom font must not call this function; merely importing
the module has no fetch side effect.

@param documentRef - Browser document containing the default-font declaration.

@returns Shared parsed default font.
*/
export function loadDocumentDefaultFont(documentRef: DefaultFontDocument = currentDocument()): Promise<TrueTypeFont> {
  return loadSharedFont(documentDefaultFontUrl(documentRef))
}

function resolveFontUrl(source: string, baseUrl?: string): string {
  try {
    return baseUrl === undefined ? new URL(source).href : new URL(source, baseUrl).href
  } catch {
    throw new Error(`Font URL cannot be resolved: ${source}`)
  }
}

function currentBaseUrl(): string | undefined {
  return typeof document === "undefined" ? undefined : document.baseURI
}

function currentDocument(): Document {
  if (typeof document === "undefined") throw new Error("Document default font is unavailable outside a browser")
  return document
}

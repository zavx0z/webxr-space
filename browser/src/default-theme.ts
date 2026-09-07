/// <reference path="./assets.d.ts" />
import defaultThemeAsset from "@zavx0z/ui/themes/theme.css" with {type: "file"}
import type {AttachOptions, RootLinkedAuthorStyleSheet} from "./attach.ts"

const themeId = "@zavx0z/ui/themes/theme.css"
export const defaultThemeUrl = new URL(defaultThemeAsset, import.meta.url).href

/** Runtime default, not a consumer stylesheet requirement or a copy of UI tokens. */
export function withDefaultTheme(options: AttachOptions): AttachOptions {
  if (options === null || typeof options !== "object") throw new TypeError("attach options are required")
  const stylesheets = options.stylesheets ?? []
  const declaredDefault = stylesheets.find((source): source is RootLinkedAuthorStyleSheet =>
    typeof source === "object" && source !== null && source.id === themeId)
  const theme = options.theme ?? declaredDefault ?? defaultThemeUrl
  return {...options, stylesheets: [theme, ...stylesheets.filter(source => source !== theme &&
    !(options.theme !== undefined && source === declaredDefault))]}
}

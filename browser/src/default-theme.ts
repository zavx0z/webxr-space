import type {AttachOptions} from "./attach.ts"

/** Application build output, resolved by the native link against the page URL. */
export const defaultThemeUrl = "./theme.css"

/** Selects the application's stylesheet without importing its source into JavaScript. */
export function withDefaultTheme(options: AttachOptions): AttachOptions {
  if (options === null || typeof options !== "object") throw new TypeError("attach options are required")
  const stylesheets = options.stylesheets ?? []
  if (!Array.isArray(stylesheets)) throw new TypeError("Root stylesheets must be an array")
  const theme = options.theme ?? defaultThemeUrl
  return {...options, stylesheets: [theme, ...stylesheets.filter(source => source !== theme)]}
}

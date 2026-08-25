import type {StoryIcon} from "./story"

type IconDefinition = Readonly<{
  materialIcon: string
  path: string
}>

/** Local SVGs keep the static catalog independent from a remote icon font. */
export const storyIcons: Readonly<Record<StoryIcon, IconDefinition>> = Object.freeze({
  architecture: {
    materialIcon: "Hub",
    path: "M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-8.5-9h5M8 8.5l3 5M16 8.5l-3 5M9.5 18h5",
  },
  geometry: {
    materialIcon: "ViewInAr",
    path: "m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 2.3L6 7.6l6 3.3 6-3.3-6-3.3Zm-7 5v6.5l6 3.4v-6.6L5 9.3Zm8 9.9 6-3.4V9.3l-6 3.3v6.6Z",
  },
  hologram: {
    materialIcon: "AutoAwesome",
    path: "m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2Zm6 10 .9 3.1L22 16l-3.1.9L18 20l-.9-3.1L14 16l3.1-.9L18 12ZM6 13l1.1 3.9L11 18l-3.9 1.1L6 23l-1.1-3.9L1 18l3.9-1.1L6 13Z",
  },
  text: {
    materialIcon: "TextFields",
    path: "M5 4v3h5.5v13h3V7H19V4H5Z",
  },
  "thin-film": {
    materialIcon: "BlurOn",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3a7 7 0 0 1 6.3 4H5.7A7 7 0 0 1 12 5Zm0 14a7 7 0 0 1-6.3-4h12.6A7 7 0 0 1 12 19Zm-7-7c0-.35.03-.68.08-1h13.84c.05.32.08.65.08 1s-.03.68-.08 1H5.08A6.4 6.4 0 0 1 5 12Z",
  },
})

export function iconMarkup(icon: StoryIcon): string {
  const definition = storyIcons[icon]
  return `<svg viewBox="0 0 24 24" role="img" aria-label="${definition.materialIcon} icon association" data-material-icon="${definition.materialIcon}"><path d="${definition.path}"/></svg>`
}

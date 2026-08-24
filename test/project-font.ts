import {fileURLToPath} from "node:url"

export const projectFontPath = fileURLToPath(import.meta.resolve("@engine/core/fonts/jetbrains-mono-bold.ttf"))

export function projectFontBytes(): Promise<ArrayBuffer> {
  return Bun.file(projectFontPath).arrayBuffer()
}

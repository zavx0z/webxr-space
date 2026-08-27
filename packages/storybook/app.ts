/** Package-owned Storybook application manifest. */

import {fileURLToPath} from "node:url"
import {
  defineStorybookApp,
  type StorybookAppManifest,
  type StorybookStaticFile,
} from "@zavx0z/storybook/app"
import {createStorybookPage} from "./page/page.ts"

export function createStorybookApp(
  options: Readonly<{basePath?: string}> = {},
): StorybookAppManifest {
  return defineStorybookApp({
    id: "webxr-space",
    title: "webxr-space · UI component graph",
    basePath: options.basePath ?? "",
    home: {
      path: "/ui/component-graph",
      label: "Главная",
      ariaLabel: "На главную webxr-space · UI component graph",
    },
    footer: {
      lead: "Создано для",
      owner: {
        label: "webxr-space",
        href: "https://github.com/zavx0z/webxr-space",
      },
      detail: "живой UI component graph",
    },
    head: {
      meta: [{
        kind: "public-path",
        name: "engine-default-font",
        path: "/fonts/jetbrains-mono-bold.ttf",
      }],
    },
    pages: [createStorybookPage()],
  })
}

export function storybookStaticFiles(): readonly StorybookStaticFile[] {
  return Object.freeze([{
    publicPath: "/fonts/jetbrains-mono-bold.ttf",
    sourcePath: fileURLToPath(
      import.meta.resolve("@engine/core/fonts/jetbrains-mono-bold.ttf"),
    ),
  }])
}

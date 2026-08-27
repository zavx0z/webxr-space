import {Pane, type PaneVariant} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import {componentStorySource} from "../source.ts"

type PaneStoryArgs = StorybookStoryArgs & Readonly<{
  variant: PaneVariant
}>

export function createPaneStory(variant: PaneVariant): StorybookStoryModule {
  return defineStorybookStoryModule<PaneStoryArgs>({
    defaultArgs: {variant},
    controls: [
      {
        key: "variant",
        label: "Вариант",
        group: "Основные",
        kind: "select",
        options: [
          {value: "glass", label: "Стекло"},
          {value: "outlined", label: "Контурная"},
          {value: "filled", label: "Заполненная"},
        ],
      },
    ],
    render(surface, args, frame) {
      const width = Math.min(430, Math.max(260, frame.w * 0.48))
      const height = Math.min(260, Math.max(180, frame.h * 0.34))
      const x = frame.x + (frame.w - width) / 2
      const y = frame.y + (frame.h - height) / 2 + 24
      Pane(surface, x, y, width, height, {
        variant: args.variant,
      })
      Typography(surface, x + 28, y + 54, width - 56, 34, {
        children: "Рабочий компонент Pane",
        variant: "title",
        style: {textAlign: "center"},
      })
      Typography(surface, x + 28, y + 102, width - 56, 28, {
        children: `${args.variant} · Blender panel radius`,
        variant: "caption",
        color: "muted",
        style: {textAlign: "center"},
      })
    },
    source(args) {
      const typescript = [
        'import {Pane} from "@ui/components/pane"',
        "",
        "Pane(surface, x, y, w, h, {",
        `  variant: ${JSON.stringify(args.variant)},`,
        "})",
      ].join("\n")
      return componentStorySource({component: "pane", section: "variants", variant}, args, typescript)
    },
  })
}

import {
  Inspector,
  type InspectorCategory,
  type InspectorSection,
} from "@ui/components/inspector"
import {Typography} from "@ui/components/typography"
import {uiIcons} from "@ui/elements/icons"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import {componentStorySource} from "../source.ts"

type InspectorStoryArgs = StorybookStoryArgs & Readonly<{
  category: "source" | "events"
  query: string
  "html-expanded": boolean
  "css-expanded": boolean
}>

declare global {
  var __componentsStoryControlBridge: ((key: string, value: unknown) => void) | undefined
}

const CATEGORIES = Object.freeze([
  Object.freeze({id: "source", label: "Исходники", iconSrc: uiIcons.manual, sectionIds: ["html", "css"]}),
  Object.freeze({id: "events", label: "События", iconSrc: uiIcons.log, dividerBefore: true, sectionIds: ["events"]}),
]) satisfies readonly InspectorCategory[]

export function createInspectorStory(): StorybookStoryModule {
  return defineStorybookStoryModule<InspectorStoryArgs>({
    defaultArgs: {
      category: "source",
      query: "",
      "html-expanded": true,
      "css-expanded": true,
    },
    controls: [
      {
        key: "category",
        label: "Категория",
        group: "Навигация",
        kind: "select",
        options: [
          {value: "source", label: "Исходники"},
          {value: "events", label: "События"},
        ],
      },
      {key: "query", label: "Поиск", group: "Навигация", kind: "text", interactive: false},
      {key: "html-expanded", label: "HTML раскрыт", group: "Секции", kind: "boolean"},
      {key: "css-expanded", label: "CSS раскрыт", group: "Секции", kind: "boolean"},
    ],
    render(surface, args, frame) {
      const width = Math.min(480, Math.max(320, frame.w - 48))
      const height = Math.min(620, Math.max(360, frame.h - 72))
      const sections: readonly InspectorSection[] = [
        storySection("html", "HTML", args["html-expanded"], "Нативная семантическая разметка"),
        storySection("css", "CSS", args["css-expanded"], "Полная цепочка стилей владельцев"),
        storySection("events", "Events", true, "События остаются управляемыми consumer"),
      ]
      Inspector(
        surface,
        frame.x + (frame.w - width) / 2,
        frame.y + (frame.h - height) / 2 + 18,
        width,
        height,
        {
          key: "components-story-inspector",
          categories: CATEGORIES,
          selectedCategoryId: args.category,
          query: args.query,
          searchPlaceholder: "Поиск секции…",
          context: {label: "Button", iconSrc: uiIcons.resource},
          toolbarActions: [{id: "copy", label: "Копировать", iconSrc: uiIcons.copy}],
          sections,
          onCategoryChange: (category) => globalThis.__componentsStoryControlBridge?.("category", category),
          onQueryChange: (query) => globalThis.__componentsStoryControlBridge?.("query", query),
          onSectionToggle(id, expanded) {
            if (id === "html" || id === "css") globalThis.__componentsStoryControlBridge?.(`${id}-expanded`, expanded)
          },
        },
      )
    },
    source(args) {
      const typescript = [
        'import {Inspector} from "@ui/components/inspector"',
        'import {uiIcons} from "@ui/elements/icons"',
        "",
        "Inspector(surface, x, y, width, height, {",
        '  key: "component-inspector",',
        "  categories,",
        `  selectedCategoryId: ${JSON.stringify(args.category)},`,
        `  query: ${JSON.stringify(args.query)},`,
        '  context: {label: "Button", iconSrc: uiIcons.resource},',
        "  sections: [",
        `    {id: "html", label: "HTML", expanded: ${args["html-expanded"]}, contentHeight: 120, render: renderHtml},`,
        `    {id: "css", label: "CSS", expanded: ${args["css-expanded"]}, contentHeight: 140, render: renderCss},`,
        "  ],",
        "  onCategoryChange: setCategory,",
        "  onQueryChange: setQuery,",
        "  onSectionToggle: setExpanded,",
        "})",
      ].join("\n")
      return componentStorySource({component: "inspector", section: "basic", variant: "default"}, args, typescript)
    },
  })
}

function storySection(id: string, label: string, expanded: boolean, text: string): InspectorSection {
  return {
    id,
    label,
    expanded,
    contentHeight: 86,
    render(surface, rect) {
      Typography(surface, rect.x, rect.y, rect.w, rect.h, {
        children: text,
        variant: "body",
        style: {textAlign: "left"},
      })
    },
  }
}

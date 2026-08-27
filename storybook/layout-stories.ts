import {
  defineStorybookStories,
  type StorybookStoryIndexItem,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import type {StorybookNavigationItem} from "@zavx0z/storybook/workbench"

export type LayoutStoryRoute =
  | "fixed/baseline/right"
  | "fixed/baseline/down"
  | "adaptive/shared/right"
  | "adaptive/shared/down"
  | "adaptive/compound/right"
  | "adaptive/compound/down"
  | "dagre-layered/default/default"
  | "coffman-graham/default/default"

const loadFixed = (fixtureId: string) => async (): Promise<StorybookStoryModule> => {
  const {createFixedLayoutStory} = await import("./stories/fixed.ts")
  return createFixedLayoutStory(fixtureId)
}

const loadAdaptive = (fixtureId: string) => async (): Promise<StorybookStoryModule> => {
  const {createAdaptiveLayoutStory} = await import("./stories/adaptive.ts")
  return createAdaptiveLayoutStory(fixtureId)
}

const loadDagreLayered = async (): Promise<StorybookStoryModule> => {
  const {createDagreLayeredLayoutStory} = await import("./stories/dagre-layered.ts")
  return createDagreLayeredLayoutStory()
}

const loadCoffmanGraham = async (): Promise<StorybookStoryModule> => {
  const {createCoffmanGrahamLayoutStory} = await import("./stories/coffman-graham.ts")
  return createCoffmanGrahamLayoutStory()
}

export const LAYOUT_STORIES = defineStorybookStories({
  groups: [
    {
      id: "layout-policies",
      label: "Раскладка",
      components: [
        {
          id: "fixed",
          label: "Фиксированная",
          apiName: "layoutFixed",
          tags: ["west", "east", "compound"],
          sections: [{
            id: "baseline",
            label: "Базовая топология",
            variants: [
              {id: "right", label: "RIGHT", title: "Fixed · RIGHT", load: loadFixed("fixed-baseline-right")},
              {id: "down", label: "DOWN", title: "Fixed · DOWN", load: loadFixed("fixed-baseline-down")},
            ],
          }],
        },
        {
          id: "adaptive",
          label: "Адаптивная",
          apiName: "layoutAdaptive",
          tags: ["west", "east", "side-selection"],
          sections: [
            {
              id: "shared",
              label: "Общий порт",
              variants: [
                {id: "right", label: "RIGHT", title: "Adaptive shared · RIGHT", load: loadAdaptive("adaptive-shared-right")},
                {id: "down", label: "DOWN", title: "Adaptive shared · DOWN", load: loadAdaptive("adaptive-shared-down")},
              ],
            },
            {
              id: "compound",
              label: "Контейнеры",
              variants: [
                {id: "right", label: "RIGHT", title: "Adaptive compound · RIGHT", load: loadAdaptive("adaptive-compound-right")},
                {id: "down", label: "DOWN", title: "Adaptive compound · DOWN", load: loadAdaptive("adaptive-compound-down")},
              ],
            },
          ],
        },
        {
          id: "dagre-layered",
          label: "Dagre Layered",
          apiName: "layoutTopDown",
          tags: ["dagre", "layered", "dag", "south", "north"],
          sections: [{
            id: "default",
            label: "Default",
            variants: [{
              id: "default",
              label: "Default",
              title: "Dagre Layered",
              load: loadDagreLayered,
            }],
          }],
        },
        {
          id: "coffman-graham",
          label: "Coffman–Graham",
          apiName: "layoutCoffmanGraham",
          tags: ["coffman-graham", "width-bounded", "large-dag", "layered"],
          sections: [{
            id: "default",
            label: "Default",
            variants: [{
              id: "default",
              label: "W = 4",
              title: "Coffman–Graham · W = 4",
              load: loadCoffmanGraham,
            }],
          }],
        },
      ],
    },
  ],
  representative: {component: "fixed", section: "baseline", variant: "right"},
})

export function layoutStoryIndex(route: LayoutStoryRoute): StorybookStoryIndexItem {
  const index = LAYOUT_STORIES.find(route)
  if (index === undefined) throw new Error(`Unknown Layout story: ${route}`)
  return index
}

export function layoutPolicyItems(): readonly StorybookNavigationItem<string>[] {
  const seen = new Set<string>()
  return LAYOUT_STORIES.index.flatMap((item) => {
    if (seen.has(item.componentId)) return []
    seen.add(item.componentId)
    return [{
      id: item.componentId,
      label: item.componentLabel,
      route: item.componentId,
      searchText: item.searchText,
    }]
  })
}

export function layoutScenarioItems(route: LayoutStoryRoute): readonly StorybookNavigationItem<string>[] {
  const selected = layoutStoryIndex(route)
  const stories = LAYOUT_STORIES.index.filter(({componentId}) => componentId === selected.componentId)
  const multipleSections = new Set(stories.map(({sectionId}) => sectionId)).size > 1
  return stories.map((item) => ({
    id: `${item.sectionId}/${item.variantId}`,
    label: multipleSections ? `${item.sectionLabel} · ${item.variantLabel}` : item.variantLabel,
    route: item.route,
  }))
}

export function layoutComponentPath(path: string): string {
  return path.split("/")[0] ?? ""
}

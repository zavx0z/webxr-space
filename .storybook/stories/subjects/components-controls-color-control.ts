import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/color-control/basic/default", async (document) => {
  const {createCompiledColorControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "closed",
    "title": "Color control"
  } as const
  return withStoryProps(createCompiledColorControlProductionStory(document, props), props)
})

export const story_state_open = defineOwnerStory("components/controls/color-control/state/open", async (document) => {
  const {createCompiledColorControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "open",
    "title": "Color control"
  } as const
  return withStoryProps(createCompiledColorControlProductionStory(document, props), props)
})

export const story_presentation_expanded = defineOwnerStory("components/controls/color-control/presentation/expanded", async (document) => {
  const {createCompiledColorControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "expanded",
    "title": "Color control"
  } as const
  return withStoryProps(createCompiledColorControlProductionStory(document, props), props)
})

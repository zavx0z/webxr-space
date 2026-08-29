import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_color_input = defineOwnerStory("components/inputs/color-input/basic/color-input", async (document) => {
  const {createCompiledColorInputProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "closed",
    "title": "Color input"
  } as const
  return withStoryProps(createCompiledColorInputProductionStory(document, props), props)
})

export const story_state_open = defineOwnerStory("components/inputs/color-input/state/open", async (document) => {
  const {createCompiledColorInputProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "open",
    "title": "Color input"
  } as const
  return withStoryProps(createCompiledColorInputProductionStory(document, props), props)
})

export const story_presentation_expanded = defineOwnerStory("components/inputs/color-input/presentation/expanded", async (document) => {
  const {createCompiledColorInputProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    },
    "label": "Color",
    "presentation": "expanded",
    "title": "Color input"
  } as const
  return withStoryProps(createCompiledColorInputProductionStory(document, props), props)
})

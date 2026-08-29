import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_value = defineOwnerStory("components/inputs/integer-input/basic/value", async (document) => {
  const {createCompiledIntegerInputProductionStory} = await import("../compiled/compiled-integer-input-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Integer value"
  } as const
  return withStoryProps(createCompiledIntegerInputProductionStory(document, props), props)
})

export const story_basic_labeled = defineOwnerStory("components/inputs/integer-input/basic/labeled", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "integer-input-labeled",
    "label": "Iterations",
    "kind": "integer",
    "value": 8
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/inputs/integer-input/state/disabled", async (document) => {
  const {createCompiledIntegerInputProductionStory} = await import("../compiled/compiled-integer-input-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Disabled integer",
    "disabled": true
  } as const
  return withStoryProps(createCompiledIntegerInputProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/inputs/integer-input/state/readonly", async (document) => {
  const {createCompiledIntegerInputProductionStory} = await import("../compiled/compiled-integer-input-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Read-only integer",
    "readOnly": true
  } as const
  return withStoryProps(createCompiledIntegerInputProductionStory(document, props), props)
})

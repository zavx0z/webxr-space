import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_value = defineOwnerStory("components/controls/integer-control/basic/value", async (document) => {
  const {createCompiledIntegerControlProductionStory} = await import("../compiled/compiled-integer-control-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Integer control"
  } as const
  return withStoryProps(createCompiledIntegerControlProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/controls/integer-control/state/disabled", async (document) => {
  const {createCompiledIntegerControlProductionStory} = await import("../compiled/compiled-integer-control-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Disabled integer",
    "disabled": true
  } as const
  return withStoryProps(createCompiledIntegerControlProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/controls/integer-control/state/readonly", async (document) => {
  const {createCompiledIntegerControlProductionStory} = await import("../compiled/compiled-integer-control-production-story.tsx")
  const props = {
    "value": 8,
    "min": 0,
    "max": 100,
    "step": 1,
    "title": "Read-only integer",
    "readOnly": true
  } as const
  return withStoryProps(createCompiledIntegerControlProductionStory(document, props), props)
})

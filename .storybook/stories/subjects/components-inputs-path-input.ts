import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_value_path = defineOwnerStory("components/inputs/path-input/value/path", async (document) => {
  const {createCompiledPathInputProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path"
  } as const
  return withStoryProps(createCompiledPathInputProductionStory(document, props), props)
})

export const story_value_empty = defineOwnerStory("components/inputs/path-input/value/empty", async (document) => {
  const {createCompiledPathInputProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "",
    "placeholder": "Choose file",
    "title": "File path"
  } as const
  return withStoryProps(createCompiledPathInputProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/inputs/path-input/state/disabled", async (document) => {
  const {createCompiledPathInputProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "disabled": true
  } as const
  return withStoryProps(createCompiledPathInputProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/inputs/path-input/state/readonly", async (document) => {
  const {createCompiledPathInputProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "readOnly": true
  } as const
  return withStoryProps(createCompiledPathInputProductionStory(document, props), props)
})

export const story_density_compact = defineOwnerStory("components/inputs/path-input/density/compact", async (document) => {
  const {createCompiledPathInputProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "density": "compact"
  } as const
  return withStoryProps(createCompiledPathInputProductionStory(document, props), props)
})

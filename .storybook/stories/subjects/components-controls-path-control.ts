import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_value_path = defineOwnerStory("components/controls/path-control/value/path", async (document) => {
  const {createCompiledPathControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path"
  } as const
  return withStoryProps(createCompiledPathControlProductionStory(document, props), props)
})

export const story_value_empty = defineOwnerStory("components/controls/path-control/value/empty", async (document) => {
  const {createCompiledPathControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "",
    "placeholder": "Choose file",
    "title": "File path"
  } as const
  return withStoryProps(createCompiledPathControlProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/controls/path-control/state/disabled", async (document) => {
  const {createCompiledPathControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "disabled": true
  } as const
  return withStoryProps(createCompiledPathControlProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/controls/path-control/state/readonly", async (document) => {
  const {createCompiledPathControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "readOnly": true
  } as const
  return withStoryProps(createCompiledPathControlProductionStory(document, props), props)
})

export const story_density_compact = defineOwnerStory("components/controls/path-control/density/compact", async (document) => {
  const {createCompiledPathControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": "/project/output.exr",
    "placeholder": "Choose file",
    "title": "File path",
    "density": "compact"
  } as const
  return withStoryProps(createCompiledPathControlProductionStory(document, props), props)
})

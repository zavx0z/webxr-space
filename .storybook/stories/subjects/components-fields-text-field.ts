import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/text-field/basic/default", async (document) => {
  const {createCompiledTextFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Name", value: "Output", placeholder: "Name"} as const
  return withStoryProps(createCompiledTextFieldProductionStory(document, props), props)
})
export const story_state_readonly = defineOwnerStory("components/fields/text-field/state/readonly", async (document) => {
  const {createCompiledTextFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Result", value: "Output", readOnly: true, title: "Read-only result"} as const
  return withStoryProps(createCompiledTextFieldProductionStory(document, props), props)
})

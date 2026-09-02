import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/reference-field/basic/default", async (document) => {
  const {createCompiledReferenceFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Target", value: {id: "output", label: "Output", kind: "view"}, placeholder: "Not selected"} as const
  return withStoryProps(createCompiledReferenceFieldProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/reference-field/basic/default", async (document) => {
  const {createCompiledReferenceFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-reference",
    label: "Target",
    value: {id: "output", label: "Output", kind: "view"}
  } as const
  return withStoryProps(createCompiledReferenceFieldProductionStory(document, props), props)
})

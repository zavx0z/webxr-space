import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/readonly-field/basic/default", async (document) => {
  const {createCompiledReadonlyFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-readonly",
    label: "Result",
    value: "Output",
    description: "Read-only result"
  } as const
  return withStoryProps(createCompiledReadonlyFieldProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/path-field/basic/default", async (document) => {
  const {createCompiledPathFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-path",
    label: "File",
    value: "/project/output.exr"
  } as const
  return withStoryProps(createCompiledPathFieldProductionStory(document, props), props)
})

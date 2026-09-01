import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/readonly-control/basic/default", async (document) => {
  const {createCompiledReadonlyControlProductionStory} = await import("../compiled/compiled-readonly-control-production-story.tsx")
  const props = {
    value: "Output",
    title: "Read-only value"
  } as const
  return withStoryProps(createCompiledReadonlyControlProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/foundation/panel/basic/default", async (document) => {
  const {createCompiledPanelProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {label: "Свойства", expanded: true} as const
  return withStoryProps(createCompiledPanelProductionStory(document, props), props)
})

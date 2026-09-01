import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/text-control/basic/default", async (document) => {
  const {createCompiledTextControlProductionStory} = await import("../compiled/compiled-text-control-production-story.tsx")
  const props = {
    "value": "Output",
    "type": "text",
    "placeholder": "Введите значение",
    "title": "Text control"
  } as const
  return withStoryProps(createCompiledTextControlProductionStory(document, props), props)
})

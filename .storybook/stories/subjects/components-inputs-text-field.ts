import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/inputs/text-field/basic/default", async (document) => {
  const {createCompiledTextFieldProductionStory} = await import("../compiled/compiled-text-field-production-story.tsx")
  const props = {
    "value": "Output",
    "type": "text",
    "placeholder": "Введите значение",
    "title": "Text field"
  } as const
  return withStoryProps(createCompiledTextFieldProductionStory(document, props), props)
})

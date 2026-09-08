import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: import("@zavx0z/dom").Document, open: boolean) => {
  const {createCompiledColorFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Color", value: {r: 0.2, g: 0.55, b: 0.8, a: 1}, open}
  return withStoryProps(createCompiledColorFieldProductionStory(document, props), props)
}

export const story_basic_default = defineOwnerStory("components/fields/color-field/basic/default", document =>
  story(document, false)
)
export const story_state_open = defineOwnerStory("components/fields/color-field/state/open", document =>
  story(document, true)
)

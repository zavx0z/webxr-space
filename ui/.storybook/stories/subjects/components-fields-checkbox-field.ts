import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: import("@zavx0z/dom").Document, checked: boolean, indeterminate = false) => {
  const {createCompiledCheckboxFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Enabled", checked, indeterminate}
  return withStoryProps(createCompiledCheckboxFieldProductionStory(document, props), props)
}

export const story_state_unchecked = defineOwnerStory("components/fields/checkbox-field/state/unchecked", document =>
  story(document, false)
)
export const story_state_checked = defineOwnerStory("components/fields/checkbox-field/state/checked", document =>
  story(document, true)
)
export const story_state_indeterminate = defineOwnerStory("components/fields/checkbox-field/state/indeterminate", document =>
  story(document, false, true)
)

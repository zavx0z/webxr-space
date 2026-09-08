import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: import("@zavx0z/dom").Document, checked: boolean) => {
  const {createCompiledSwitchFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Enabled", checked}
  return withStoryProps(createCompiledSwitchFieldProductionStory(document, props), props)
}

export const story_state_off = defineOwnerStory("components/fields/switch-field/state/off", document =>
  story(document, false)
)
export const story_state_on = defineOwnerStory("components/fields/switch-field/state/on", document =>
  story(document, true)
)

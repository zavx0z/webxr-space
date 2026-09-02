import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: import("@zavx0z/dom").Document, route: string, state: Readonly<{step?: number; disabled?: boolean; readOnly?: boolean}>) => {
  const {createCompiledNumberFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Value", value: 42, min: 0, max: 100, step: 0.1, title: route, ...state}
  return withStoryProps(createCompiledNumberFieldProductionStory(document, props), props)
}

export const story_basic_default = defineOwnerStory("components/fields/number-field/basic/default", document =>
  story(document, "components/fields/number-field/basic/default", {})
)
export const story_step_one = defineOwnerStory("components/fields/number-field/step/one", document =>
  story(document, "components/fields/number-field/step/one", {step: 1})
)
export const story_state_disabled = defineOwnerStory("components/fields/number-field/state/disabled", document =>
  story(document, "components/fields/number-field/state/disabled", {disabled: true})
)
export const story_state_readonly = defineOwnerStory("components/fields/number-field/state/readonly", document =>
  story(document, "components/fields/number-field/state/readonly", {readOnly: true})
)

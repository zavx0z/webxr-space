import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_presentation_switch = defineOwnerStory("components/fields/boolean-field/presentation/switch", async (document) => {
  const {createCompiledBooleanFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-boolean",
    label: "Enabled",
    presentation: "switch",
    value: true
  } as const
  return withStoryProps(createCompiledBooleanFieldProductionStory(document, props), props)
})

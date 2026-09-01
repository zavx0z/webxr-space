import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/number-field/basic/default", async (document) => {
  const {createCompiledNumberFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-number",
    label: "Value",
    value: 42,
    description: "Numeric value"
  } as const
  return withStoryProps(createCompiledNumberFieldProductionStory(document, props), props)
})

export const story_presentation_slider = defineOwnerStory("components/fields/number-field/presentation/slider", async (document) => {
  const {createCompiledNumberFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-slider",
    label: "Коэффициент",
    presentation: "slider",
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.5
  } as const
  return withStoryProps(createCompiledNumberFieldProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/field-group/basic/default", async (document) => {
  const {createCompiledFieldGroupProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    label: "Transform",
    items: [
      {key: "x", label: "X", value: 1},
      {key: "y", label: "Y", value: 2},
      {key: "z", label: "Z", value: 3},
    ],
  } as const
  return withStoryProps(createCompiledFieldGroupProductionStory(document, props), props)
})

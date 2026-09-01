import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/collection-field/basic/default", async (document) => {
  const {createCompiledCollectionFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-collection",
    label: "Items",
    selectedId: "output",
    items: [
      {id: "input", label: "Input"},
      {id: "output", label: "Output"},
      {id: "viewport", label: "Viewport"}
    ]
  } as const
  return withStoryProps(createCompiledCollectionFieldProductionStory(document, props), props)
})

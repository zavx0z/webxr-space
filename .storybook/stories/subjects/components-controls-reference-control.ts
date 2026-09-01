import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/reference-control/basic/default", async (document) => {
  const {createCompiledReferenceControlProductionStory} = await import("../compiled/compiled-resource-production-stories.tsx")
  const props = {
    "value": {
      "id": "output",
      "label": "Output",
      "kind": "view"
    },
    "placeholder": "Not selected",
    "title": "Reference"
  } as const
  return withStoryProps(createCompiledReferenceControlProductionStory(document, props), props)
})

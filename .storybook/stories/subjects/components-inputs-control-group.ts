import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/inputs/control-group/basic/default", async (document) => {
  const {createCompiledControlGroupProductionStory} = await import("../compiled/compiled-group-production-stories.tsx")
  const props = {
    "title": "Vector",
    "items": [
      {
        "key": "x",
        "label": "X",
        "value": "1",
        "type": "number"
      },
      {
        "key": "y",
        "label": "Y",
        "value": "2",
        "type": "number"
      },
      {
        "key": "z",
        "label": "Z",
        "value": "3",
        "type": "number"
      }
    ]
  } as const
  return withStoryProps(createCompiledControlGroupProductionStory(document, props), props)
})

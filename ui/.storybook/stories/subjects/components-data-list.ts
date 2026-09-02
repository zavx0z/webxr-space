import {uiIcons} from "@zavx0z/ui/themes/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/data/list/basic/default", async (document) => {
  const {createCompiledListProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [
      {
        "key": "input",
        "label": "Input",
        "iconSrc": uiIcons.log,
        "detail": "Source"
      },
      {
        "key": "output",
        "label": "Output",
        "iconSrc": uiIcons.run,
        "detail": "Result"
      },
      {
        "key": "viewport",
        "label": "Viewport",
        "iconSrc": uiIcons.visibilityOn,
        "detail": "View"
      }
    ],
    "selectedKey": "output",
    "dense": true,
    "title": "List"
  } as const
  return withStoryProps(createCompiledListProductionStory(document, props), props)
})

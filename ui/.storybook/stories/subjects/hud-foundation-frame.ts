import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_inventory_default = defineOwnerStory("hud/foundation/frame/inventory/default", async (document) => {
  const {createCompiledFrameProductionStory} = await import("../compiled/compiled-hud-production-stories.tsx")
  const props = {
    "title": "Frame",
    "edge": "right",
    "handles": [
      {
        "key": "move",
        "label": "Move",
        "disabled": false
      },
      {
        "key": "resize",
        "label": "Resize",
        "disabled": false
      },
      {
        "key": "dock",
        "label": "Dock",
        "disabled": false
      }
    ]
  } as const
  return withStoryProps(createCompiledFrameProductionStory(document, props), props)
})

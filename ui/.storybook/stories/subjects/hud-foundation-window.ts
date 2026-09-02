import {uiIcons} from "@zavx0z/ui/themes/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_inventory_default = defineOwnerStory("hud/foundation/window/inventory/default", async (document) => {
  const {createCompiledWindowProductionStory} = await import("../compiled/compiled-hud-production-stories.tsx")
  const props = {
    "title": "Output",
    "subtitle": "HUD window",
    "active": true,
    "minimized": false,
    "actions": [
      {
        "key": "pin",
        "label": "Pin",
        "iconSrc": uiIcons.pin,
        "disabled": false
      },
      {
        "key": "close",
        "label": "Close",
        "iconSrc": uiIcons.close,
        "disabled": false
      }
    ]
  } as const
  return withStoryProps(createCompiledWindowProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_inventory_default = defineOwnerStory("hud/foundation/timeline/inventory/default", async (document) => {
  const {createCompiledTimelineProductionStory} = await import("../compiled/compiled-hud-production-stories.tsx")
  const props = {
    "title": "Timeline",
    "min": 0,
    "max": 100,
    "current": 50,
    "playing": false,
    "tracks": [
      {
        "key": "output",
        "label": "Output",
        "markers": [
          {
            "key": "start",
            "tick": 10,
            "label": "Start",
            "selected": false
          },
          {
            "key": "current",
            "tick": 50,
            "label": "Current",
            "selected": true
          }
        ]
      },
      {
        "key": "events",
        "label": "Events",
        "markers": [
          {
            "key": "event",
            "tick": 75,
            "label": "Event",
            "selected": false
          }
        ]
      }
    ]
  } as const
  return withStoryProps(createCompiledTimelineProductionStory(document, props), props)
})

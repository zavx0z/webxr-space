import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_inventory_default = defineOwnerStory("hud/foundation/timeline/inventory/default", async (document) => {
  const {createCompiledTimelineProductionStory} = await import("../compiled/compiled-hud-production-stories.tsx")
  const props = {
    title: "Timeline",
    frameStart: 1,
    frameEnd: 100,
    frameCurrent: 50,
    visibleStart: 1,
    visibleEnd: 100,
    previewStart: 20,
    previewEnd: 80,
    keyframes: [
      {key: "start", frame: 10, label: "Keyframe 10"},
      {key: "current", frame: 50, label: "Keyframe 50", selected: true},
      {key: "end", frame: 90, label: "Keyframe 90"}
    ],
    markers: [
      {key: "review", frame: 75, label: "Review"}
    ]
  } as const
  return withStoryProps(createCompiledTimelineProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_state_off = defineOwnerStory("components/controls/switcher/state/off", async (document) => {
  const {createCompiledSwitcherProductionStory} = await import("../compiled/compiled-switcher-production-story.tsx")
  const props = {
    "checked": false,
    "title": "Switcher off"
  } as const
  return withStoryProps(createCompiledSwitcherProductionStory(document, props), props)
})

export const story_state_on = defineOwnerStory("components/controls/switcher/state/on", async (document) => {
  const {createCompiledSwitcherProductionStory} = await import("../compiled/compiled-switcher-production-story.tsx")
  const props = {
    "checked": true,
    "title": "Switcher"
  } as const
  return withStoryProps(createCompiledSwitcherProductionStory(document, props), props)
})

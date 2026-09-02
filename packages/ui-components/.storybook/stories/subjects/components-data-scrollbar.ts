import {defineOwnerStory} from "../story-types.ts"

export const story_vertical_default = defineOwnerStory("components/data/scrollbar/vertical/default", async (document) => {
  const {createLegacyOwnerNoticeStory} = await import("../compiled/compiled-legacy-owner-story.tsx")
  return createLegacyOwnerNoticeStory(document, {
    title: "Scrollbar · legacy owner",
    detail: "Scrollbar belongs to the DOM/Renderer owner and is not an @ui/components export.",
  })
})

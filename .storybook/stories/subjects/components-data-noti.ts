import {defineOwnerStory} from "../story-types.ts"

export const story_status_unavailable = defineOwnerStory("components/data/noti/status/unavailable", async (document) => {
  const {createLegacyOwnerNoticeStory} = await import("../compiled/compiled-legacy-owner-story.tsx")
  return createLegacyOwnerNoticeStory(document, {
    title: "Noti · no production owner",
    detail: "Noti has no @ui/components production export; this route is retained as historical evidence.",
  })
})

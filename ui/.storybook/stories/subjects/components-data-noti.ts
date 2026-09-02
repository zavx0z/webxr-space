import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_status_unavailable = defineOwnerStory("components/data/noti/status/unavailable", async (document) => {
  const {createCompiledNotificationProductionStory} = await import("../compiled/compiled-status-production-stories.tsx")
  const props = {
    heading: "Production owner restored",
    message: "Notification now renders through @zavx0z/ui/feedback/notification.",
    detail: "Delivery and queue policy remain caller-owned.",
    tone: "info",
    dismissible: true,
    title: "Notification"
  } as const
  return withStoryProps(createCompiledNotificationProductionStory(document, props), props)
})

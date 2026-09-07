import {defineOwnerStory} from "../story-types.ts"

export const story_editor = defineOwnerStory("components/widgets/editor/basic/default", async document => {
  const {createWidgetProductionStory} = await import("../compiled/compiled-widget-production-stories.tsx")
  return createWidgetProductionStory(document, "editor")
})
export const story_terminal = defineOwnerStory("components/widgets/terminal/basic/default", async document => {
  const {createWidgetProductionStory} = await import("../compiled/compiled-widget-production-stories.tsx")
  return createWidgetProductionStory(document, "terminal")
})
export const story_tree = defineOwnerStory("components/widgets/tree/basic/default", async document => {
  const {createWidgetProductionStory} = await import("../compiled/compiled-widget-production-stories.tsx")
  return createWidgetProductionStory(document, "tree")
})

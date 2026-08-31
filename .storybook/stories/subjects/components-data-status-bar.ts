import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/data/status-bar/basic/default", async (document) => {
  const {createCompiledStatusBarProductionStory} = await import("../compiled/compiled-status-production-stories.tsx")
  const props = {
    start: [
      {id: "mode", text: "Ready", highlighted: true}
    ],
    end: [
      {id: "vertices", text: "Verts:8"},
      {id: "faces", text: "Faces:6"},
      {id: "version", text: "5.2.0"}
    ],
    title: "Status"
  } as const
  return withStoryProps(createCompiledStatusBarProductionStory(document, props), props)
})

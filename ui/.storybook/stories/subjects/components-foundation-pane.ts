import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_variants_glass = defineOwnerStory("components/foundation/pane/variants/glass", async (document) => {
  const {createCompiledPaneProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "content": "Area content",
    "variant": "transparent"
  } as const
  return withStoryProps(createCompiledPaneProductionStory(document, props), props)
})

export const story_variants_outlined = defineOwnerStory("components/foundation/pane/variants/outlined", async (document) => {
  const {createCompiledPaneProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "content": "Area content",
    "variant": "outlined"
  } as const
  return withStoryProps(createCompiledPaneProductionStory(document, props), props)
})

export const story_variants_filled = defineOwnerStory("components/foundation/pane/variants/filled", async (document) => {
  const {createCompiledPaneProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "content": "Area content",
    "variant": "filled"
  } as const
  return withStoryProps(createCompiledPaneProductionStory(document, props), props)
})

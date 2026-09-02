import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_variants_full_width = defineOwnerStory("components/foundation/divider/variants/full-width", async (document) => {
  const {createCompiledDividerProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "variant": "full-width",
    "title": "Divider"
  } as const
  return withStoryProps(createCompiledDividerProductionStory(document, props), props)
})

export const story_variants_inset = defineOwnerStory("components/foundation/divider/variants/inset", async (document) => {
  const {createCompiledDividerProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "variant": "inset",
    "title": "Inset divider"
  } as const
  return withStoryProps(createCompiledDividerProductionStory(document, props), props)
})

export const story_variants_middle = defineOwnerStory("components/foundation/divider/variants/middle", async (document) => {
  const {createCompiledDividerProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "variant": "middle",
    "title": "Middle divider"
  } as const
  return withStoryProps(createCompiledDividerProductionStory(document, props), props)
})

import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_variants_default = defineOwnerStory("components/foundation/typography/variants/default", async (document) => {
  const {createCompiledTypographyProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "text": "Interface text",
    "variant": "body",
    "title": "Typography"
  } as const
  return withStoryProps(createCompiledTypographyProductionStory(document, props), props)
})

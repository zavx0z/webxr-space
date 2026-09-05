import {defineOwnerStory} from "../story-types.ts"

export const story_basic_default = defineOwnerStory(
  "components/data/markdown/basic/default",
  async document => {
    const {createCompiledMarkdownProductionStory} = await import(
      "../compiled/compiled-markdown-production-story.tsx"
    )
    return createCompiledMarkdownProductionStory(document)
  },
)

export const story_rendering_wrapping = defineOwnerStory(
  "components/data/markdown/rendering/wrapping",
  async document => {
    const {createCompiledMarkdownWrappingStory} = await import(
      "../compiled/compiled-markdown-production-story.tsx"
    )
    return createCompiledMarkdownWrappingStory(document)
  },
)

export const story_rendering_no_wrap = defineOwnerStory(
  "components/data/markdown/rendering/no-wrap",
  async document => {
    const {createCompiledMarkdownWrappingStory} = await import(
      "../compiled/compiled-markdown-production-story.tsx"
    )
    return createCompiledMarkdownWrappingStory(document, false)
  },
)

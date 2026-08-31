import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_sections_default = defineOwnerStory(
  "components/data/inspector-sections/basic/default",
  async (document) => {
    const {createCompiledInspectorSectionsProductionStory} = await import(
      "../compiled/compiled-inspector-production-story.tsx"
    )
    return withStoryProps(
      createCompiledInspectorSectionsProductionStory(document),
      Object.freeze({sections: 2})
    )
  }
)

export const story_section_default = defineOwnerStory(
  "components/data/inspector-section/basic/default",
  async (document) => {
    const {createCompiledInspectorSectionProductionStory} = await import(
      "../compiled/compiled-inspector-production-story.tsx"
    )
    const props = Object.freeze({id: "properties", label: "Свойства", expanded: true})
    return withStoryProps(createCompiledInspectorSectionProductionStory(document), props)
  }
)

export const story_text_section_default = defineOwnerStory(
  "components/data/inspector-text-section/basic/default",
  async (document) => {
    const {createCompiledInspectorTextSectionProductionStory} = await import(
      "../compiled/compiled-inspector-production-story.tsx"
    )
    const props = Object.freeze({id: "source", label: "Исходный код", expanded: true})
    return withStoryProps(createCompiledInspectorTextSectionProductionStory(document), props)
  }
)

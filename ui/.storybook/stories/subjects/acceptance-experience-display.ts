import {defineOwnerStory} from "../story-types.ts"

export const story_default = defineOwnerStory(
  "acceptance/experience/display/default",
  async document => {
    const {createCompiledExperienceDisplayUiAcceptanceStory} = await import(
      "../compiled/compiled-experience-space-ui-acceptance-story.tsx"
    )
    return createCompiledExperienceDisplayUiAcceptanceStory(document)
  },
)

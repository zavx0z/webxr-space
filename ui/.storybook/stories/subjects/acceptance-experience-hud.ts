import {defineOwnerStory} from "../story-types.ts"

export const story_default = defineOwnerStory(
  "acceptance/experience/hud/default",
  async document => {
    const {createCompiledExperienceHudUiAcceptanceStory} = await import(
      "../compiled/compiled-experience-space-ui-acceptance-story.tsx"
    )
    return createCompiledExperienceHudUiAcceptanceStory(document)
  },
)

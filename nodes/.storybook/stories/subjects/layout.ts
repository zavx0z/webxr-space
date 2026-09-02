import {defineOwnerStory} from "../story-types.ts"

function layoutStory(route: string) {
  return defineOwnerStory(route, async document => {
    const {createCompiledLayoutStory} = await import("../compiled/compiled-layout-story.tsx")
    return createCompiledLayoutStory(document, route)
  })
}

export const story_fixed_baseline_right = layoutStory("layout/fixed/baseline/right")
export const story_fixed_baseline_down = layoutStory("layout/fixed/baseline/down")
export const story_adaptive_shared_right = layoutStory("layout/adaptive/shared/right")
export const story_adaptive_shared_down = layoutStory("layout/adaptive/shared/down")
export const story_adaptive_compound_right = layoutStory("layout/adaptive/compound/right")
export const story_adaptive_compound_down = layoutStory("layout/adaptive/compound/down")

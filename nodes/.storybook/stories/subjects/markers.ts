import {defineOwnerStory} from "../story-types.ts"

function story(route: string) {
  return defineOwnerStory(route, async document => {
    const {createArrowStory} = await import("../compiled/arrow-stories.tsx")
    return createArrowStory(document, route)
  })
}

export const story_arrow_open = story("markers/arrow/open")
export const story_arrow_filled = story("markers/arrow/filled")

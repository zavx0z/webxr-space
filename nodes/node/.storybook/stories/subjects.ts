import {createNodeStory} from "./nodes.tsx"
import {defineOwnerStory} from "./story-types.ts"

export const parameter_0 = defineOwnerStory("components/node/basic", document => createNodeStory(document, "components/node/basic"))
export const parameter_1 = defineOwnerStory("components/node/empty", document => createNodeStory(document, "components/node/empty"))
export const parameter_2 = defineOwnerStory("components/node/states", document => createNodeStory(document, "components/node/states"))
export const parameter_3 = defineOwnerStory("components/node/collapsed", document => createNodeStory(document, "components/node/collapsed"))
export const parameter_4 = defineOwnerStory("components/node/authored-content", document => createNodeStory(document, "components/node/authored-content"))
export const content_0 = defineOwnerStory("components/node/preview", document => createNodeStory(document, "components/node/preview"))
export const content_1 = defineOwnerStory("content/parameters-collapsed", document => createNodeStory(document, "content/parameters-collapsed"))
export const content_2 = defineOwnerStory("content/content-hidden", document => createNodeStory(document, "content/content-hidden"))
export const content_3 = defineOwnerStory("content/collapsed", document => createNodeStory(document, "content/collapsed"))
export const diagram_0 = defineOwnerStory("diagram/rectangle", document => createNodeStory(document, "diagram/rectangle"))
export const diagram_1 = defineOwnerStory("diagram/oval", document => createNodeStory(document, "diagram/oval"))
export const diagram_2 = defineOwnerStory("diagram/circle", document => createNodeStory(document, "diagram/circle"))

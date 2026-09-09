import {defineOwnerStory} from "./story-types.ts"
import {createDependencyStory} from "./dependencies.tsx"

export const dependencies_overview = defineOwnerStory("composition/dependencies", document => createDependencyStory(document, "nodes"))
export const dependencies_parameter = defineOwnerStory("composition/parameter", document => createDependencyStory(document, "parameter"))

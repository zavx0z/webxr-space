import {runCoffmanGrahamWorkerRequest} from "@nodes/worker/coffman-graham/executor"
import type {StorybookStoryModule} from "@zavx0z/storybook/stories"
import {COFFMAN_GRAHAM_WORKER_STORY_GRAPH} from "../fixtures/coffman-graham.ts"
import {defineWorkerProtocolStory} from "../worker-story.ts"

export function createCoffmanGrahamWorkerStory(): StorybookStoryModule {
  return defineWorkerProtocolStory({
    id: "coffman-graham",
    label: "Coffman–Graham",
    executorImport: "@nodes/worker/coffman-graham/executor",
    executorName: "runCoffmanGrahamWorkerRequest",
    createRequest(generation): Parameters<typeof runCoffmanGrahamWorkerRequest>[0] {
      return {
        type: "layout",
        requestId: generation,
        generation,
        graph: COFFMAN_GRAHAM_WORKER_STORY_GRAPH,
      }
    },
    execute: runCoffmanGrahamWorkerRequest,
  })
}

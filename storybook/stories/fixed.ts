import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"
import type {StorybookStoryModule} from "@zavx0z/storybook/stories"
import {FIXED_WORKER_STORY_GRAPH} from "../fixtures/fixed.ts"
import {defineWorkerProtocolStory} from "../worker-story.ts"

export function createFixedWorkerStory(): StorybookStoryModule {
  return defineWorkerProtocolStory({
    id: "fixed",
    label: "Fixed",
    executorImport: "@nodes/worker/fixed/executor",
    executorName: "runFixedWorkerRequest",
    createRequest(generation): Parameters<typeof runFixedWorkerRequest>[0] {
      return {
        type: "layout",
        requestId: generation,
        generation,
        graph: FIXED_WORKER_STORY_GRAPH,
      }
    },
    execute: runFixedWorkerRequest,
  })
}

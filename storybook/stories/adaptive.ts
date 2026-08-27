import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"
import type {StorybookStoryModule} from "@zavx0z/storybook/stories"
import {ADAPTIVE_WORKER_STORY_GRAPH} from "../fixtures/adaptive.ts"
import {defineWorkerProtocolStory} from "../worker-story.ts"

export function createAdaptiveWorkerStory(): StorybookStoryModule {
  return defineWorkerProtocolStory({
    id: "adaptive",
    label: "Adaptive",
    executorImport: "@nodes/worker/adaptive/executor",
    executorName: "runAdaptiveWorkerRequest",
    createRequest(generation): Parameters<typeof runAdaptiveWorkerRequest>[0] {
      return {
        type: "layout",
        requestId: generation,
        generation,
        graph: ADAPTIVE_WORKER_STORY_GRAPH,
      }
    },
    execute: runAdaptiveWorkerRequest,
  })
}

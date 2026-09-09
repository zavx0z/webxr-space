import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-SLIDER] SliderParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("slider")
}, 30_000)

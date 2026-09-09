import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-VECTOR] VectorParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("vector")
}, 30_000)

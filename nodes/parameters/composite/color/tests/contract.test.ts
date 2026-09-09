import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-COLOR] ColorParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("color")
}, 30_000)

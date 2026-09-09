import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-TEXT] TextParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("text")
}, 30_000)

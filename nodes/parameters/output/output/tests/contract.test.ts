import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-OUTPUT] OutputParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("output")
}, 30_000)

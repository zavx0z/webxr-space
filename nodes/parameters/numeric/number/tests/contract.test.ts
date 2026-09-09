import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-NUMBER] NumberParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("number")
}, 30_000)

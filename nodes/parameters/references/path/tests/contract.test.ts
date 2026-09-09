import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-PATH] PathParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("path")
}, 30_000)

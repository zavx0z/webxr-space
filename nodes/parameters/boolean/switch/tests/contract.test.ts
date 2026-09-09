import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-SWITCH] SwitchParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("switch")
}, 30_000)

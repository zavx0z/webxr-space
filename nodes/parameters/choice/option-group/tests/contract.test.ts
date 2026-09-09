import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-OPTION-GROUP] OptionGroupParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("option-group")
}, 30_000)

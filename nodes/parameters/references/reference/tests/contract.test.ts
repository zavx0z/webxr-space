import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-REFERENCE] ReferenceParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("reference")
}, 30_000)

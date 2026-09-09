import {test} from "bun:test"
import {verifyParameterMechanism} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-MATRIX] MatrixParameter and projected Parameter preserve fields, Socket addresses and identity", async () => {
  await verifyParameterMechanism("matrix")
}, 30_000)

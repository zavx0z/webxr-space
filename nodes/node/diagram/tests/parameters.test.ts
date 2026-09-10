import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {readParameterizedTests} from "./read-parameterized-tests.ts"

const root = resolve(import.meta.dir, "../../../..")

test("[DIAGRAM-TEST-PARAMETERS] чтение spec возвращает название теста и полную параметризацию", async () => {
  const declarations = await readParameterizedTests(root, resolve(import.meta.dir, "../spec/dependencies.spec.ts"))

  expect(declarations, "Spec должен содержать один test.each с исходным названием и полным массивом параметров DiagramNode").toEqual([
    {
      name: "[DIAGRAM-DEPENDENCIES] $name: полный граф компонентов и нативных элементов",
      parameters: [
        {
          name: "DiagramNode",
          file: "nodes/node/diagram/index.tsx",
          expected: {
            "nodes/node/diagram/index.tsx#DiagramNode": {
              uses: ["ui/surfaces/pane.tsx#Pane", "ui/typography.tsx#Typography"],
              elements: ["article"],
            },
            "ui/surfaces/pane.tsx#Pane": {uses: [], elements: ["section"]},
            "ui/typography.tsx#Typography": {uses: [], elements: ["span"]},
          },
        },
      ],
    },
  ])
})

import {test} from "bun:test"

test.todo("[SPC-001] Space, ViewPoint, Mesh, Geometry, Material, Display и HUD являются semantic Element", () => {})
test.todo("[SPC-002] Пространственные элементы принадлежат Document и не создают второй semantic graph", () => {})
test.todo("[SPC-003] Mesh принимает Geometry и Material как semantic children с устойчивой identity", () => {})
test.todo("[SPC-004] Display и HUD являются projection roots одного Space, а не отдельными деревьями", () => {})
test.todo("[SPC-005] Space не владеет Canvas, native input и frame lifecycle", () => {})

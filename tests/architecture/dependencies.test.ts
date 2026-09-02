import {test} from "bun:test"

test.todo("[PKG-003] производственные зависимости пакетов не образуют циклов", () => {})
test.todo("[PKG-004] пакет не импортирует внутренний src другого пакета", () => {})
test.todo("[PKG-005] Engine не зависит от DOM, UI, Node и WebGPU", () => {})
test.todo("[PKG-006] UI не зависит от Engine, Renderer, WebGPU и Nodes", () => {})
test.todo("[PKG-007] Nodes не создаёт Document, Canvas, Renderer и Space", () => {})

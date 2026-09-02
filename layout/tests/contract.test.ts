import { test } from "bun:test"

test.todo("[LAYOUT-001] алгоритмы layout являются чистыми и не зависят от UI, Renderer или Engine", () => {})
test.todo("[LAYOUT-002] одинаковый снимок NodeTree и одинаковые настройки дают одинаковый LayoutResult", () => {})
test.todo("[LAYOUT-003] Worker выполняет те же алгоритмы и возвращает результат, эквивалентный прямому вызову", () => {})
test.todo("[LAYOUT-004] Worker остаётся средой выполнения и не владеет второй моделью NodeTree", () => {})

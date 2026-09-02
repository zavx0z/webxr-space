import { test } from "bun:test"

test.todo("[NODES-001] каждый публичный TSX является настоящим владельцем NodeTree, NodeEditor, Frame, Node, Parameter, Socket или Link", () => {})
test.todo("[NODES-002] скрытые NodeCard, ParameterRow и SocketPort не подменяют публичные Node, Parameter и Socket", () => {})
test.todo("[NODES-003] пакет Nodes не создаёт собственные Document, Canvas, Renderer или Space", () => {})
test.todo("[NODES-004] пакет Nodes отображает единственный Store из nodetree и не хранит вторую модель", () => {})
test.todo("[NODES-005] Node presentation использует только публичные контракты nodetree, layout и ui", () => {})

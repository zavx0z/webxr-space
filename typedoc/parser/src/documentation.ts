import type {Node} from "typescript/unstable/ast"
import {getLeadingCommentRanges} from "typescript/unstable/ast/scanner"
import {readComment} from "./comments.ts"

/** Берёт только авторский комментарий декларации, исключая обзор модуля. */
export function documentation(node: Node) {
  const file = node.getSourceFile()
  const comments = (getLeadingCommentRanges(file.text, node.getFullStart()) ?? [])
    .map(range => file.text.slice(range.pos, range.end))
    .filter(value => value.startsWith("/**") && !/@packageDocumentation\b/u.test(value))
  return readComment(comments)
}

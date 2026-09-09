/**
Текстовый вывод используется и authored OutputParameter, и fallback-проекцией.
Значение сериализуется для показа без записи в Store.

@packageDocumentation
*/

import type {NodeJsonValue} from "@nodes/tree"
import {PARAMETER_OUTPUT_HEIGHT} from "../../src/metrics.ts"

export function ParameterOutput(props: Readonly<{
  value: NodeJsonValue
  title?: string | undefined
}>) {
  return <output
    data-parameter-output=""
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: block;
      width: 100%;
      min-width: 0;
      height: ${PARAMETER_OUTPUT_HEIGHT}px;
      padding: 2px 5px;
      overflow: hidden;
      border: var(--border-width-control) solid var(--widget-text-outline);
      border-radius: var(--radius-small);
      background: var(--widget-text-background-readonly);
      color: var(--widget-text-content-readonly);
      font-size: var(--font-size-xs);
      white-space: nowrap;
      text-overflow: ellipsis;
    `}
  >
    {displayValue(props.value)}
  </output>
}

function displayValue(value: NodeJsonValue): string {
  if (typeof value === "string") return value
  return JSON.stringify(value) ?? "null"
}

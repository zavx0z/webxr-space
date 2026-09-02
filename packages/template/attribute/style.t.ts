import type { ValueStatic, ValueVariable, ValueDynamic } from "../parser.t"

/**
Recursive object-literal style syntax.

Keys are preserved without interpreting CSS, selectors or at-rules. Values can
nest another object or carry the same static and dynamic descriptors used by
the rest of the template AST.

@example
```html
<button style=${{
  display: "flex",
  "&:hover": {
    color: fields.hoverColor,
    "& .icon": { opacity: fields.enabled ? 1 : 0.5 },
  },
}}>
  Save
</button>
```
*/
export interface ValueStyleObject {
  [property: string]: ValueStyle
}

export type ValueStyle = ValueStatic | ValueVariable | ValueDynamic | ValueStyleObject

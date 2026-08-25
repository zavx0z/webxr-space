import {CodeEditor} from "@ui/components/code-editor"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"

type CodeEditorStoryArgs = StorybookStoryArgs & Readonly<{
  "show-line-numbers": boolean
}>

const SOURCE = [
  'import {CodeEditor} from "@ui/components/code-editor"',
  "",
  "type Story = Readonly<{",
  "  id: string",
  "  active: boolean",
  "}>",
  "",
  "const story: Story = {id: \"read-only\", active: true}",
  "const count = story.active ? 42 : 0",
  "",
  "// Read-only code remains selectable and copyable.",
  "CodeEditor(surface, x, y, width, height, {",
  '  key: "storybook-code-editor",',
  "  value: JSON.stringify({story, count}, null, 2),",
  "  readOnly: true,",
  '  languageId: "typescript",',
  "  showLineNumbers: true,",
  "})",
  "",
  `export const longHorizontalExample = "${"source".repeat(24)}"`,
].join("\n")

export function createCodeEditorStory(): StorybookStoryModule {
  return defineStorybookStoryModule<CodeEditorStoryArgs>({
    defaultArgs: {"show-line-numbers": true},
    controls: [{
      key: "show-line-numbers",
      label: "Номера строк",
      group: "Отображение",
      kind: "boolean",
    }],
    render(surface, args, frame) {
      const inset = 24
      CodeEditor(surface, frame.x + inset, frame.y + 64, Math.max(1, frame.w - inset * 2), Math.max(1, frame.h - 88), {
        key: "code-editor-story",
        value: SOURCE,
        readOnly: true,
        languageId: "typescript",
        showLineNumbers: args["show-line-numbers"],
      })
    },
    source(args) {
      return [
        'import {CodeEditor} from "@ui/components/code-editor"',
        "",
        "CodeEditor(surface, x, y, width, height, {",
        '  key: "source-preview",',
        "  value: source,",
        "  readOnly: true,",
        '  languageId: "typescript",',
        `  showLineNumbers: ${args["show-line-numbers"]},`,
        "})",
      ].join("\n")
    },
  })
}

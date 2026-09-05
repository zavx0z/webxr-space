import {useMemo} from "@zavx0z/component"
import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from "../markdown.ts"
import {Divider} from "../divider.tsx"
import {CodeEditor} from "./code-editor.tsx"

export type MarkdownProps = Readonly<{
  source: string
  /** Wrap prose at the available width. Fenced code keeps its own scrolling. */
  wrap?: boolean | undefined
  baseUrl?: string | undefined
  title?: string | undefined
  style?: CssStyle | undefined
}>

type InlineListProps = Readonly<{content: readonly MarkdownInline[]}>
type ListProps = Readonly<{
  items: Extract<MarkdownBlock, {kind: "list"}>["items"]
}>

const headingStyle = css`
  display: block;
  margin: 0 0 8px;
  color: var(--widget-regular-content);
  font-weight: 700;
`

function Heading1(props: InlineListProps) {
  return <h1
    style={css`
      ${headingStyle}

      font-size: 24px;
      line-height: 30px;
    `}
  >
    <InlineList content={props.content} />
  </h1>
}

function Heading2(props: InlineListProps) {
  return <h2
    style={css`
      ${headingStyle}

      font-size: 20px;
      line-height: 26px;
    `}
  >
    <InlineList content={props.content} />
  </h2>
}

function Heading3(props: InlineListProps) {
  return <h3
    style={css`
      ${headingStyle}

      font-size: 18px;
      line-height: 24px;
    `}
  >
    <InlineList content={props.content} />
  </h3>
}

function Heading4(props: InlineListProps) {
  return <h4
    style={css`
      ${headingStyle}

      font-size: 16px;
      line-height: 22px;
    `}
  >
    <InlineList content={props.content} />
  </h4>
}

function Heading5(props: InlineListProps) {
  return <h5
    style={css`
      ${headingStyle}

      font-size: 14px;
      line-height: 20px;
    `}
  >
    <InlineList content={props.content} />
  </h5>
}

function Heading6(props: InlineListProps) {
  return <h6
    style={css`
      ${headingStyle}

      font-size: 12px;
      line-height: 18px;
    `}
  >
    <InlineList content={props.content} />
  </h6>
}

function InlineText(props: Readonly<{value: string}>) {
  return <span>{props.value}</span>
}

function InlineCode(props: Readonly<{value: string}>) {
  return <code
    style={css`
      display: inline;
      color: var(--editor-content);
      font-family: monospace;
    `}
  >
    {props.value}
  </code>
}

function InlineLink(props: Readonly<{content: readonly MarkdownInline[]; href: string; external: boolean}>) {
  return <a
    href={props.href}
    rel={props.external ? "noreferrer" : undefined}
    style={css`
      display: inline;
      color: var(--widget-toolbar-content-selected);
    `}
  >
    <InlineList content={props.content} />
  </a>
}

function Strong(props: InlineListProps) {
  return <strong style={css`
    font-weight: 700;
  `}>
    <InlineList content={props.content} />
  </strong>
}

function Emphasis(props: InlineListProps) {
  return <em style={css`
    font-style: italic;
  `}>
    <InlineList content={props.content} />
  </em>
}

function Strike(props: InlineListProps) {
  return <s style={css`
    text-decoration: line-through;
  `}>
    <InlineList content={props.content} />
  </s>
}

function InlineBreak() { return <br /> }

function InlineImage(props: Readonly<{image: Extract<MarkdownInline, {kind: "image"}>}>) {
  return <img
    src={props.image.src}
    alt={props.image.alt}
    title={props.image.title}
    width={props.image.width}
    height={props.image.height}
    style={css`
      max-width: 100%;
      object-fit: contain;
    `}
  />
}

function Inline(props: Readonly<{inline: MarkdownInline}>) {
  return <span data-markdown-inline={props.inline.kind}>
    {props.inline.kind === "text" ? <InlineText value={props.inline.value} /> : null}
    {props.inline.kind === "code" ? <InlineCode value={props.inline.value} /> : null}
    {props.inline.kind === "strong" ? <Strong content={props.inline.content} /> : null}
    {props.inline.kind === "em" ? <Emphasis content={props.inline.content} /> : null}
    {props.inline.kind === "strike" ? <Strike content={props.inline.content} /> : null}
    {props.inline.kind === "break" ? <InlineBreak /> : null}
    {props.inline.kind === "image" ? <InlineImage image={props.inline} /> : null}
    {props.inline.kind === "link" ? <InlineLink
      content={props.inline.content}
      href={props.inline.href}
      external={props.inline.external}
    /> : null}
  </span>
}

function InlineList(props: InlineListProps) {
  return <span>
    {props.content.map(inline => <Inline
      key={inline.key}
      inline={inline}
    />)}
  </span>
}

function Paragraph(props: InlineListProps) {
  return <p
    style={css`
      display: block;
      margin: 0 0 8px;
    `}
  >
    <InlineList content={props.content} />
  </p>
}

function ListItem(props: Readonly<{item: ListProps["items"][number]}>) {
  return <li style={css`
    display: block;
  `}>
    <InlineList content={props.item.content} />
    {props.item.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </li>
}

const listStyle = css`
  display: flex;
  flex-direction: column;
  margin: 0 0 8px;
  padding-left: 20px;
`

function OrderedList(props: ListProps & Readonly<{start: number}>) {
  return <ol
    data-markdown-list="ordered"
    start={props.start}
    style={css`${listStyle}`}
  >
    {props.items.map(item => <ListItem
      key={item.key}
      item={item}
    />)}
  </ol>
}

function UnorderedList(props: ListProps) {
  return <ul
    data-markdown-list="unordered"
    style={css`${listStyle}`}
  >
    {props.items.map(item => <ListItem
      key={item.key}
      item={item}
    />)}
  </ul>
}

function CodeBlock(props: Readonly<{languageId: string; value: string}>) {
  return <CodeEditor
    value={props.value}
    readOnly={true}
    languageId={props.languageId}
    style={css`
      width: 100%;
      height: auto;
    `}
  />
}

function BlockQuote(props: Readonly<{blocks: readonly MarkdownBlock[]}>) {
  return <blockquote style={css`
    display: block;
    margin: 8px 0;
    padding-left: 12px;
    border-left: 2px solid var(--widget-box-outline);
  `}>
    {props.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </blockquote>
}

function HtmlGroup(props: Readonly<{blocks: readonly MarkdownBlock[]; align?: "left" | "center" | "right" | undefined}>) {
  return <div
    data-align={props.align}
    style={css`
      display: block;

      &[data-align="center"] {
        text-align: center;
      }

      &[data-align="right"] {
        text-align: right;
      }

      &[data-align="left"] {
        text-align: left;
      }
    `}
  >
    {props.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </div>
}

function Block(props: Readonly<{block: MarkdownBlock}>) {
  const block = props.block
  return <div
    data-markdown-block={block.kind}
    style={css`
      min-width: 0;
      flex-shrink: 0;
    `}
  >
    {block.kind === "heading" && block.level === 1 ? <Heading1
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 2 ? <Heading2
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 3 ? <Heading3
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 4 ? <Heading4
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 5 ? <Heading5
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 6 ? <Heading6
      content={block.content}
    /> : null}
    {block.kind === "paragraph" ? <Paragraph content={block.content} /> : null}
    {block.kind === "list" && block.ordered ? <OrderedList
      items={block.items}
      start={block.start}
    /> : null}
    {block.kind === "list" && !block.ordered ? <UnorderedList items={block.items} /> : null}
    {block.kind === "code" ? <CodeBlock
      languageId={block.languageId}
      value={block.value}
    /> : null}
    {block.kind === "quote" ? <BlockQuote blocks={block.blocks} /> : null}
    {block.kind === "group" ? <HtmlGroup
      blocks={block.blocks}
      align={block.align}
    /> : null}
    {block.kind === "rule" ? <Divider /> : null}
  </div>
}

/**
 * Displays CommonMark content and an inert HTML subset through one semantic
 * article. Script, unknown HTML and executable URLs are not materialized.
 *
 * The parser is shared with resource discovery. Layout, font selection and link defaults
 * remain platform responsibilities. Caller styles set the viewport when needed.
 */
export function Markdown(props: MarkdownProps) {
  if (props.wrap !== undefined && typeof props.wrap !== "boolean") {
    throw new TypeError("Markdown wrap must be a boolean")
  }
  const markdown = useMemo(() => parseMarkdown({
    source: props.source,
    ...(props.baseUrl === undefined ? {} : {baseUrl: props.baseUrl}),
  }), [props.source, props.baseUrl])
  return <article
    data-markdown=""
    data-wrap={String(props.wrap ?? true)}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      overflow: auto;
      color: var(--widget-box-content);
      font-size: var(--font-size-sm);
      line-height: 1.45;
      white-space: normal;

      &[data-wrap="false"] {
        white-space: nowrap;
      }

      ${props.style}
    `}
  >
    {markdown.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </article>
}

import { describe, expect, it } from "bun:test"
import { parse } from "../../../index"

describe("recursive style object syntax", () => {
  it("preserves nested selectors and CSS-like layout values", () => {
    const nodes = parse(({ html }) => html`
      <section
        style=${{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "320px",
          position: "absolute",
          "&:hover": {
            background: "#383838",
            "& .part": {
              opacity: "0.8",
            },
          },
          "@media (min-width: 800px)": {
            flexDirection: "row",
          },
        }}>
      </section>
    `)

    expect(nodes).toEqual([
      {
        tag: "section",
        type: "el",
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "320px",
          position: "absolute",
          "&:hover": {
            background: "#383838",
            "& .part": {
              opacity: "0.8",
            },
          },
          "@media (min-width: 800px)": {
            flexDirection: "row",
          },
        },
      },
    ])
  })

  it("resolves paths and retains expressions at every nested level", () => {
    const nodes = parse(({ html, fields, mass }) => html`
      <button
        style=${{
          color: mass.palette.text,
          "&:hover": {
            opacity: fields.enabled ? 1 : 0.5,
            "& .icon": {
              color: fields.accent,
              transform: `translateX(${fields.offset}px)`,
            },
          },
        }}>
      </button>
    `)

    expect(nodes).toEqual([
      {
        tag: "button",
        type: "el",
        style: {
          color: { data: "/mass/palette/text" },
          "&:hover": {
            opacity: {
              data: "/fields/enabled",
              expr: "${_[0] ? 1 : 0.5}",
            },
            "& .icon": {
              color: { data: "/fields/accent" },
              transform: {
                data: "/fields/offset",
                expr: "`translateX(${_[0]}px)`",
              },
            },
          },
        },
      },
    ])
  })

  it("uses the active map context inside nested selectors", () => {
    const nodes = parse<any, { items: { color: string }[] }>(({ html, mass }) => html`
      <div>
        ${mass.items.map(
          (item) => html`
            <button
              style=${{
                "&:active": {
                  color: item.color,
                },
              }}>
            </button>
          `
        )}
      </div>
    `)

    expect(nodes[0]).toMatchObject({
      tag: "div",
      type: "el",
      child: [
        {
          type: "map",
          child: [
            {
              tag: "button",
              type: "el",
              style: {
                "&:active": {
                  color: { data: "[item]/color" },
                },
              },
            },
          ],
        },
      ],
    })
  })

  it("never invokes the authored callback", () => {
    let invocations = 0

    const nodes = parse(({ html }) => {
      invocations++
      return html`<div style=${{ "&:disabled": { opacity: "0.5" } }}></div>`
    })

    expect(invocations).toBe(0)
    expect(nodes[0]).toMatchObject({
      style: {
        "&:disabled": { opacity: "0.5" },
      },
    })
  })
})

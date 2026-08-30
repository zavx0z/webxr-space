/** Package-private tree-shakeable SVG data owners used by production Components. */
export const svgIcon = (source: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`

export function iconSvg(body: string, color = "#fff"): string {
  return svgIcon(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`)
}

export const runIcon = /* @__PURE__ */ iconSvg("<path d=\"M8 5v14l11-7-11-7Z\"/>")
export const clearIcon = /* @__PURE__ */ iconSvg("<path d=\"M4 7h16\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M6 7l1 14h10l1-14\"/><path d=\"M9 7V4h6v3\"/>")
export const plusIcon = /* @__PURE__ */ iconSvg("<path d=\"M12 5v14\"/><path d=\"M5 12h14\"/>")
export const minusIcon = /* @__PURE__ */ iconSvg("<path d=\"M5 12h14\"/>")
export const chevronRightIcon = /* @__PURE__ */ iconSvg("<path d=\"m10 7 5 5-5 5\"/>")
export const folderIcon = /* @__PURE__ */ iconSvg("<path d=\"M3 7h7l2 2h9v10H3z\"/><path d=\"M3 7V5h7l2 2\"/>")
export const pickerIcon = /* @__PURE__ */ iconSvg("<path d=\"m19 3 2 2-10.5 10.5-3.5 1 1-3.5Z\"/><path d=\"m15.5 6.5 2 2\"/><path d=\"M5 19h5\"/>")

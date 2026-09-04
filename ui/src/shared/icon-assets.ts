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
export const arrowUpIcon = /* @__PURE__ */ iconSvg("<path d=\"M12 19V5\"/><path d=\"m7 10 5-5 5 5\"/>")
export const arrowDownIcon = /* @__PURE__ */ iconSvg("<path d=\"M12 5v14\"/><path d=\"m7 14 5 5 5-5\"/>")
export const closeIcon = /* @__PURE__ */ iconSvg("<path d=\"M6 6l12 12\"/><path d=\"M18 6 6 18\"/>")
export const applyIcon = /* @__PURE__ */ iconSvg("<path d=\"m5 13 4 4L19 7\"/>")
export const searchIcon = /* @__PURE__ */ iconSvg("<circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m15.5 15.5 5 5\"/>")
export const pinIcon = /* @__PURE__ */ iconSvg("<path d=\"m9 3 6 6\"/><path d=\"m14 4 6 6\"/><path d=\"m7 10 7 7\"/><path d=\"m5 19 4-4\"/><path d=\"m8 11 7-7 5 5-7 7\"/>")
export const settingsIcon = /* @__PURE__ */ iconSvg("<path d=\"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z\"/>")
export const languageIcon = /* @__PURE__ */ iconSvg("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18\"/><path d=\"M12 3a14 14 0 0 1 0 18\"/><path d=\"M12 3a14 14 0 0 0 0 18\"/>")
export const executionPointIcon = /* @__PURE__ */ iconSvg("<path d=\"M12 3v4\"/><path d=\"M12 17v4\"/><path d=\"M3 12h4\"/><path d=\"M17 12h4\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>")
export const breakpointIcon = /* @__PURE__ */ iconSvg("<circle cx=\"12\" cy=\"12\" r=\"6\"/><path d=\"M12 6v12\"/><path d=\"M6 12h12\"/>")
export const databaseIcon = /* @__PURE__ */ iconSvg("<ellipse cx=\"12\" cy=\"5\" rx=\"7\" ry=\"3\"/><path d=\"M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5\"/><path d=\"M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6\"/>")
export const expandIcon = /* @__PURE__ */ iconSvg("<path d=\"M8 3H3v5\"/><path d=\"M16 3h5v5\"/><path d=\"M21 16v5h-5\"/><path d=\"M3 16v5h5\"/><path d=\"M3 3l6 6\"/><path d=\"M21 3l-6 6\"/><path d=\"M21 21l-6-6\"/><path d=\"M3 21l6-6\"/>")
export const imageIcon = /* @__PURE__ */ iconSvg("<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><circle cx=\"8.5\" cy=\"10\" r=\"1.5\"/><path d=\"M21 16l-5.2-5.2a1.6 1.6 0 0 0-2.2 0L5 19\"/>", "#5cf0ff")
export const visibilityOnIcon = /* @__PURE__ */ iconSvg("<path d=\"M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>")
export const chevronDownIcon = /* @__PURE__ */ iconSvg("<path d=\"m7 9 5 5 5-5\"/>")
export const chevronRightIcon = /* @__PURE__ */ iconSvg("<path d=\"m10 7 5 5-5 5\"/>")
export const folderIcon = /* @__PURE__ */ iconSvg("<path d=\"M3 7h7l2 2h9v10H3z\"/><path d=\"M3 7V5h7l2 2\"/>")
export const pickerIcon = /* @__PURE__ */ iconSvg("<path d=\"m19 3 2 2-10.5 10.5-3.5 1 1-3.5Z\"/><path d=\"m15.5 6.5 2 2\"/><path d=\"M5 19h5\"/>")
export const resourceIcon = /* @__PURE__ */ iconSvg("<path d=\"M7 4H4v3\"/><path d=\"M17 4h3v3\"/><path d=\"M20 17v3h-3\"/><path d=\"M7 20H4v-3\"/><rect x=\"7\" y=\"7\" width=\"10\" height=\"10\" rx=\"1\"/>")

/**
 * Consistent 24px icons embedded as data URLs for the Vision Pro UI.
 */
import {
  applyIcon,
  arrowDownIcon,
  arrowUpIcon,
  chevronDownIcon,
  chevronRightIcon,
  clearIcon,
  closeIcon,
  databaseIcon,
  executionPointIcon,
  expandIcon,
  folderIcon,
  imageIcon,
  iconSvg,
  languageIcon,
  minusIcon,
  pickerIcon,
  pinIcon,
  plusIcon,
  resourceIcon,
  runIcon,
  searchIcon,
  settingsIcon,
  svgIcon,
  visibilityOnIcon,
  breakpointIcon,
} from "../src/shared/icon-assets.ts"

export {
  applyIcon,
  arrowDownIcon,
  arrowUpIcon,
  chevronDownIcon,
  chevronRightIcon,
  clearIcon,
  closeIcon,
  databaseIcon,
  executionPointIcon,
  expandIcon,
  folderIcon,
  imageIcon,
  languageIcon,
  minusIcon,
  pickerIcon,
  pinIcon,
  plusIcon,
  resourceIcon,
  runIcon,
  searchIcon,
  settingsIcon,
  visibilityOnIcon,
  breakpointIcon,
} from "../src/shared/icon-assets.ts"

const restartSvg = /* @__PURE__ */ iconSvg("<path d=\"M20 7v5h-5\"/><path d=\"M20 12a8 8 0 1 0-2.34 5.66\"/>")
const pauseSvg = /* @__PURE__ */ iconSvg("<path d=\"M8 5v14\"/><path d=\"M16 5v14\"/>")
const stopSvg = /* @__PURE__ */ iconSvg("<path d=\"M7 7h10v10H7z\"/>")
const debugResumeSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M8 5.5v13l11-6.5-11-6.5Z\" fill=\"#6fdd76\" stroke=\"#c7f7c9\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/></svg>")
const debugPauseSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"7\" y=\"5\" width=\"3.8\" height=\"14\" rx=\"1.2\" fill=\"#f6c453\"/><rect x=\"13.2\" y=\"5\" width=\"3.8\" height=\"14\" rx=\"1.2\" fill=\"#f6c453\"/></svg>")
const debugStopSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"1.8\" fill=\"#ff4f4f\" stroke=\"#ffc1c1\" stroke-width=\"1.2\"/></svg>")
const debugStepOverSvg = /* @__PURE__ */ iconSvg("<path d=\"M4 12a6 6 0 0 1 10.24-4.24L17 10\"/><path d=\"M17 5v5h-5\"/><path d=\"M19 19v-7\"/><path d=\"M15.5 15.5 19 12l3.5 3.5\"/>", "#6bb8ff")
const debugStepIntoSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 4v15\"/><path d=\"M7 14l5 5 5-5\"/>", "#6bb8ff")
const debugStepOutSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 20V5\"/><path d=\"M7 10l5-5 5 5\"/>", "#6bb8ff")
const debugRestartSvg = /* @__PURE__ */ iconSvg("<path d=\"M20 7v5h-5\"/><path d=\"M20 12a8 8 0 1 0-2.34 5.66\"/>", "#6fdd76")
const debugExecutionPointSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 3v4\"/><path d=\"M12 17v4\"/><path d=\"M3 12h4\"/><path d=\"M17 12h4\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "#f6c453")
const stepOverSvg = /* @__PURE__ */ iconSvg("<path d=\"M4 12a6 6 0 0 1 10.24-4.24L17 10\"/><path d=\"M17 5v5h-5\"/><path d=\"M19 19v-7\"/><path d=\"M15.5 15.5 19 12l3.5 3.5\"/>")
const stepIntoSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 4v15\"/><path d=\"M7 14l5 5 5-5\"/>")
const stepOutSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 20V5\"/><path d=\"M7 10l5-5 5 5\"/>")
const logSvg = /* @__PURE__ */ iconSvg("<path d=\"M4 5h16v14H4z\"/><path d=\"m7 9 3 3-3 3\"/><path d=\"M12 15h5\"/>")
const codexSvg = /* @__PURE__ */ iconSvg("<path d=\"M17 6.5A7.5 7.5 0 1 0 17 17.5\"/><path d=\"M8.5 9.5 6 12l2.5 2.5\"/><path d=\"M15.5 9.5 18 12l-2.5 2.5\"/><path d=\"M13.5 8 10.5 16\"/>", "#5cf0ff")
const qwenSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"8.2\" fill=\"#111b26\" stroke=\"#5cf0ff\" stroke-width=\"1.8\"/><path d=\"M15.6 15.6 19 19\" stroke=\"#5cf0ff\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M8.2 12.2c0-2.35 1.54-4 3.82-4 2.24 0 3.78 1.65 3.78 4 0 2.32-1.54 3.98-3.78 3.98-2.28 0-3.82-1.66-3.82-3.98Z\" stroke=\"#bffbff\" stroke-width=\"1.45\"/></svg>")
const deepseekSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 3c4.7 0 8.5 3.25 8.5 7.25 0 4.75-4.55 8.1-9.75 10.25-.65-2.2-2.05-3.05-4.35-3.35C4.6 15.85 3.5 13.65 3.5 10.9 3.5 6.55 7.3 3 12 3Z\" fill=\"#071b27\" stroke=\"#5cf0ff\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/><path d=\"M8.2 10.3h.02M15.8 10.3h.02\" stroke=\"#bffbff\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><path d=\"M8.8 14c1.8 1.25 4.6 1.25 6.4 0\" stroke=\"#5cf0ff\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>")
const phoneSvg = /* @__PURE__ */ iconSvg("<rect x=\"7\" y=\"2.5\" width=\"10\" height=\"19\" rx=\"2\"/><path d=\"M10.5 18.5h3\"/>")
const autoscrollSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 4v11\"/><path d=\"M7 10l5 5 5-5\"/><path d=\"M5 20h14\"/>")
const manualSvg = /* @__PURE__ */ iconSvg("<path d=\"M5 5h14v14H5z\"/><path d=\"M9 5v14\"/><path d=\"M12 9h5\"/><path d=\"M12 13h5\"/>")
const copySvg = /* @__PURE__ */ iconSvg("<path d=\"M9 9h10v10H9z\"/><path d=\"M5 15V5h10\"/>")
const breakpointMuteSvg = /* @__PURE__ */ iconSvg("<circle cx=\"12\" cy=\"12\" r=\"6\"/><path d=\"M4 4l16 16\"/>")
const breakpointActiveSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"6.8\" fill=\"#ff4f4f\"/><circle cx=\"12\" cy=\"12\" r=\"6.8\" stroke=\"#ffc1c1\" stroke-width=\"1.4\"/></svg>")
const breakpointDisabledSvg = /* @__PURE__ */ svgIcon("<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"6.3\" stroke=\"#d8a6a6\" stroke-opacity=\"0.74\" stroke-width=\"2.2\"/></svg>")
const collapseSvg = /* @__PURE__ */ iconSvg("<path d=\"M9 3v6H3\"/><path d=\"M15 3v6h6\"/><path d=\"M21 15h-6v6\"/><path d=\"M3 15h6v6\"/>")
const chevronLeftSvg = /* @__PURE__ */ iconSvg("<path d=\"m14 7-5 5 5 5\"/>")
const micSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z\"/><path d=\"M5 10a7 7 0 0 0 14 0\"/><path d=\"M12 17v4\"/><path d=\"M8 21h8\"/>")
const keyboardSvg = /* @__PURE__ */ iconSvg("<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M7 10h.01\"/><path d=\"M11 10h.01\"/><path d=\"M15 10h.01\"/><path d=\"M19 10h.01\"/><path d=\"M7 14h10\"/>", "#5cf0ff")
const sendSvg = /* @__PURE__ */ iconSvg("<path d=\"M22 2 11 13\"/><path d=\"m22 2-7 20-4-9-9-4 20-7Z\"/>", "#5cf0ff")
const fastSvg = /* @__PURE__ */ iconSvg("<path d=\"M13 2 5 13h6l-1 9 8-11h-6l1-9Z\"/>", "#5cf0ff")
const expertSvg = /* @__PURE__ */ iconSvg("<path d=\"M12 3h4.2L21 10l-9 11-9-11 4.8-7H12Z\"/><path d=\"M4 10h16\"/><path d=\"M8 3l4 18 4-18\"/>", "#5cf0ff")
const recognitionSvg = imageIcon
const zoomInSvg = /* @__PURE__ */ iconSvg("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-4.5-4.5\"/><path d=\"M11 8v6\"/><path d=\"M8 11h6\"/>", "#5cf0ff")
const zoomOutSvg = /* @__PURE__ */ iconSvg("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-4.5-4.5\"/><path d=\"M8 11h6\"/>", "#5cf0ff")
const visibilityOffSvg = /* @__PURE__ */ iconSvg("<path d=\"M3 3l18 18\"/><path d=\"M9.2 7.45A10.7 10.7 0 0 1 12 7c6 0 9.5 5 9.5 5a15.8 15.8 0 0 1-3.05 3.2\"/><path d=\"M14.6 16.65A10.5 10.5 0 0 1 12 17c-6 0-9.5-5-9.5-5a15.8 15.8 0 0 1 3-3.15\"/>")

export const uiIcons = {
  run: runIcon,
  resume: runIcon,
  restart: restartSvg,
  pause: pauseSvg,
  stop: stopSvg,
  debugResume: debugResumeSvg,
  debugPause: debugPauseSvg,
  debugStop: debugStopSvg,
  debugStepOver: debugStepOverSvg,
  debugStepInto: debugStepIntoSvg,
  debugStepOut: debugStepOutSvg,
  debugRestart: debugRestartSvg,
  debugExecutionPoint: debugExecutionPointSvg,
  close: closeIcon,
  stepOver: stepOverSvg,
  stepInto: stepIntoSvg,
  stepOut: stepOutSvg,
  log: logSvg,
  database: databaseIcon,
  codex: codexSvg,
  qwen: qwenSvg,
  deepseek: deepseekSvg,
  phone: phoneSvg,
  clear: clearIcon,
  autoscroll: autoscrollSvg,
  manual: manualSvg,
  settings: settingsIcon,
  apply: applyIcon,
  arrowDown: arrowDownIcon,
  arrowUp: arrowUpIcon,
  language: languageIcon,
  search: searchIcon,
  copy: copySvg,
  executionPoint: executionPointIcon,
  breakpoint: breakpointIcon,
  breakpointMute: breakpointMuteSvg,
  breakpointActive: breakpointActiveSvg,
  breakpointDisabled: breakpointDisabledSvg,
  expand: expandIcon,
  collapse: collapseSvg,
  plus: plusIcon,
  minus: minusIcon,
  chevronDown: chevronDownIcon,
  chevronLeft: chevronLeftSvg,
  chevronRight: chevronRightIcon,
  mic: micSvg,
  keyboard: keyboardSvg,
  send: sendSvg,
  image: imageIcon,
  fast: fastSvg,
  expert: expertSvg,
  recognition: recognitionSvg,
  eval: runIcon,
  zoomIn: zoomInSvg,
  zoomOut: zoomOutSvg,
  folder: folderIcon,
  resource: resourceIcon,
  picker: pickerIcon,
  pin: pinIcon,
  visibilityOn: visibilityOnIcon,
  visibilityOff: visibilityOffSvg,
} as const

export type UiIcon = (typeof uiIcons)[keyof typeof uiIcons]

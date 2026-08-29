import {linkCss} from "@nodes/ui/link"
import {nodeCss} from "@nodes/ui/node"
import {nodeEditorCss} from "@nodes/ui/node-editor"
import {nodeSystemCss} from "@nodes/ui/node-system"
import {parameterCss} from "@nodes/ui/parameter"
import {socketCss} from "@nodes/ui/socket"

export const nodesProductionPreviewCss = String.raw`
.nodes-production-story {
  box-sizing: border-box;
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 240px;
  overflow: hidden;
  background: #1d1d1d;
  color: #e0e0e0;
}
.nodes-production-story--parameter {
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.nodes-production-story--parameter > .node-parameter { width: 420px; }
.nodes-production-story--socket {
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
.nodes-production-story--socket > .node-socket { margin: 0; }
.nodes-production-story--link {
  width: 640px;
  height: 300px;
  min-height: 300px;
}
.nodes-production-story--comparison {
  flex-direction: row;
  min-height: 500px;
  gap: 4px;
  padding: 4px;
  background: #161616;
}
.nodes-production-story__comparison-panel {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 0;
  overflow: hidden;
  border: 1px solid #111111;
  border-radius: 4px;
  background: #1d1d1d;
}
.nodes-production-story__comparison-label {
  box-sizing: border-box;
  display: block;
  height: 24px;
  margin: 0;
  padding: 4px 7px;
  border-bottom: 1px solid #111111;
  background: #303030;
  color: #d8d8d8;
  font-size: 11px;
}
.nodes-production-story__reference {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #181818;
}
.nodes-production-story__live { min-height: 0; }
`

export const nodesDomStoryCss = [
  nodeEditorCss,
  nodeSystemCss,
  nodeCss,
  parameterCss,
  socketCss,
  linkCss,
  nodesProductionPreviewCss,
].join("\n")

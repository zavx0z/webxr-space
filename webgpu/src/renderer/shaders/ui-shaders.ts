import meshBasicSource from "./mesh-basic.wgsl" with {type: "text"}
import textSource from "./text.wgsl" with {type: "text"}
import imageSource from "./image.wgsl" with {type: "text"}
import imageExternalSource from "./image-external.wgsl" with {type: "text"}
import roundedSource from "./rounded.wgsl" with {type: "text"}
import roundedInstancedSource from "./rounded-instanced.wgsl" with {type: "text"}
import strokedPathInstancedSource from "./stroked-path-instanced.wgsl" with {type: "text"}
import colorPickerSource from "./color-picker.wgsl" with {type: "text"}
import radialBackdropSource from "./radial-backdrop"
import {composePresentationClipShader} from "./presentation-clip"

export const meshBasicShader = composePresentationClipShader(meshBasicSource)
export const textShader = composePresentationClipShader(textSource)
export const imageShader = composePresentationClipShader(imageSource)
export const imageExternalShader = composePresentationClipShader(imageExternalSource)
export const roundedShader = composePresentationClipShader(roundedSource)
export const roundedInstancedShader = roundedInstancedSource
export const strokedPathInstancedShader = composePresentationClipShader(strokedPathInstancedSource)
export const colorPickerShader = composePresentationClipShader(colorPickerSource)
export const radialBackdropShader = composePresentationClipShader(radialBackdropSource)

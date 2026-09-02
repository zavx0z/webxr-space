import meshBasicSource from "./mesh-basic.wgsl"
import textSource from "./text.wgsl"
import imageSource from "./image.wgsl"
import imageExternalSource from "./image-external.wgsl"
import roundedSource from "./rounded.wgsl"
import roundedInstancedSource from "./rounded-instanced.wgsl"
import strokedPathInstancedSource from "./stroked-path-instanced.wgsl"
import colorPickerSource from "./color-picker.wgsl"
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

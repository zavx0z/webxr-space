struct GlobalUniforms {
    viewProjectionMatrix: mat4x4<f32>,
};
@binding(0) @group(0) var<uniform> globalUniforms: GlobalUniforms;

// @engine-presentation-clip

struct PerObjectUniforms {
    modelMatrix: mat4x4<f32>,
    normalMatrix: mat4x4<f32>,
    color: vec4<f32>,
    clipBounds: vec4<f32>,
    presentationClipPadding: array<vec4<f32>, 4>,
    presentationClipRange: vec4<f32>,
};
@binding(0) @group(1) var<uniform> perObject: PerObjectUniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPosition: vec3<f32>,
};

@vertex
fn vs_main(
    @location(0) pos: vec3<f32>,
    @location(1) normal: vec3<f32>
) -> VertexOutput {
    _ = normal;

    var out: VertexOutput;
    let worldPosition = perObject.modelMatrix * vec4<f32>(pos, 1.0);
    out.position = globalUniforms.viewProjectionMatrix * worldPosition;
    out.worldPosition = worldPosition.xyz;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let b = perObject.clipBounds;
    let clipDisabled = b.x == 0.0 && b.y == 0.0 && b.z == 0.0 && b.w == 0.0;
    if (!clipDisabled && (in.position.x < b.x || in.position.x > b.z || in.position.y < b.y || in.position.y > b.w)) {
        discard;
    }
    let coverage = presentationClipCoverage(in.worldPosition, perObject.presentationClipRange);
    if (coverage <= 0.0) { discard; }
    return vec4<f32>(perObject.color.rgb, perObject.color.a * coverage);
}

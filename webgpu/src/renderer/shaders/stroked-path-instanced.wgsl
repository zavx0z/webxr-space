struct GlobalUniforms {
    viewProjectionMatrix: mat4x4<f32>,
};
@binding(0) @group(0) var<uniform> globalUniforms: GlobalUniforms;

// @engine-presentation-clip

struct PerObjectUniforms {
    modelMatrix: mat4x4<f32>,
    presentationClipPadding: array<vec4<f32>, 10>,
    presentationClipRange: vec4<f32>,
};
@binding(0) @group(1) var<uniform> perObject: PerObjectUniforms;

struct StrokedPathStyleRecord {
    color: vec4<f32>,
    params: vec4<f32>,
};

struct StrokedPathSegmentRecord {
    endpoints: vec4<f32>,
    styleSlot: u32,
    styleGeneration: u32,
    reserved1: u32,
    reserved2: u32,
};

@binding(0) @group(2) var<storage, read> styles: array<StrokedPathStyleRecord>;
@binding(1) @group(2) var<storage, read> segments: array<StrokedPathSegmentRecord>;
@binding(2) @group(2) var<storage, read> segmentOrder: array<u32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) capsulePoint: vec2<f32>,
    @location(1) worldPosition: vec3<f32>,
    @location(2) @interpolate(flat) segmentSlot: u32,
    @location(3) @interpolate(flat) halfLength: f32,
    @location(4) @interpolate(flat) valid: u32,
};

@vertex
fn vs_main(
    @location(0) unitPosition: vec3<f32>,
    @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
    let segmentSlot = segmentOrder[instanceIndex];
    let segment = segments[segmentSlot];
    let style = styles[segment.styleSlot];
    let startPoint = segment.endpoints.xy;
    let endPoint = segment.endpoints.zw;
    let delta = endPoint - startPoint;
    let segmentLength = length(delta);
    let width = style.params.x;
    let valid = select(0u, 1u, segmentLength > 0.000001 && width > 0.0);
    let safeLength = max(segmentLength, 0.000001);
    let tangent = delta / safeLength;
    let normal = vec2<f32>(-tangent.y, tangent.x);
    let radius = max(width * 0.5, 0.0);
    let coverageSupport = radius;
    let capsulePoint = vec2<f32>(
        unitPosition.x * (segmentLength + (radius + coverageSupport) * 2.0),
        unitPosition.y * (radius + coverageSupport) * 2.0,
    );
    let center = (startPoint + endPoint) * 0.5;
    let layerPosition = center + tangent * capsulePoint.x + normal * capsulePoint.y;
    let worldPosition = perObject.modelMatrix * vec4<f32>(
        layerPosition,
        style.params.z,
        1.0,
    );

    var out: VertexOutput;
    out.position = globalUniforms.viewProjectionMatrix * worldPosition;
    out.capsulePoint = capsulePoint;
    out.worldPosition = worldPosition.xyz;
    out.segmentSlot = segmentSlot;
    out.halfLength = segmentLength * 0.5;
    out.valid = valid;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    if (in.valid == 0u) { discard; }
    let segment = segments[in.segmentSlot];
    let style = styles[segment.styleSlot];
    let radius = style.params.x * 0.5;
    let closestX = clamp(in.capsulePoint.x, -in.halfLength, in.halfLength);
    let distance = length(vec2<f32>(in.capsulePoint.x - closestX, in.capsulePoint.y)) - radius;
    let antialias = min(max(fwidth(distance), 0.000001), max(radius, 0.000001));
    let strokeCoverage = 1.0 - smoothstep(-antialias, antialias, distance);
    let clipCoverage = presentationClipCoverage(in.worldPosition, perObject.presentationClipRange);
    let opacity = clamp(style.params.y, 0.0, 1.0);
    let alpha = clamp(style.color.a, 0.0, 1.0) * opacity * strokeCoverage * clipCoverage;
    if (alpha <= 0.0) { discard; }
    return vec4<f32>(style.color.rgb, alpha);
}

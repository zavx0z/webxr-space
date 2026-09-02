struct GlobalUniforms {
    viewProjectionMatrix: mat4x4<f32>,
};
@binding(0) @group(0) var<uniform> globalUniforms: GlobalUniforms;

struct PerObjectUniforms {
    modelMatrix: mat4x4<f32>,
};
@binding(0) @group(1) var<uniform> perObject: PerObjectUniforms;

struct RoundedRectInstanceRecord {
    rect: vec4<f32>,
    transform: vec4<f32>,
    fill: vec4<f32>,
    border: vec4<f32>,
    radii: vec4<f32>,
    borderWidths: vec4<f32>,
    params: vec4<f32>,
    reserved: vec4<f32>,
};
@binding(0) @group(2) var<storage, read> records: array<RoundedRectInstanceRecord>;
@binding(1) @group(2) var<storage, read> order: array<u32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) localPos: vec2<f32>,
    @location(1) @interpolate(flat) slot: u32,
};

@vertex
fn vs_main(
    @location(0) unitPosition: vec3<f32>,
    @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
    let slot = order[instanceIndex];
    let record = records[slot];
    let expansion = record.params.y + record.params.z;
    let geometrySize = record.rect.zw + vec2<f32>(expansion * 2.0);
    let localPosition = unitPosition.xy * geometrySize;
    let sourceCenter = record.rect.xy + record.rect.zw * 0.5;
    let transformedCenter = record.transform.xy * sourceCenter + record.transform.zw;
    let layerPosition = vec3<f32>(
        transformedCenter.x + record.transform.x * localPosition.x,
        -transformedCenter.y + record.transform.y * localPosition.y,
        record.params.w,
    );
    let worldPosition = perObject.modelMatrix * vec4<f32>(layerPosition, 1.0);

    var out: VertexOutput;
    out.position = globalUniforms.viewProjectionMatrix * worldPosition;
    out.localPos = localPosition;
    out.slot = slot;
    return out;
}

fn sdRoundBox(p: vec2<f32>, halfSize: vec2<f32>, radii: vec4<f32>) -> f32 {
    var radius: f32;
    if (p.x <= 0.0 && p.y > 0.0) { radius = radii.x; }
    else if (p.x > 0.0 && p.y > 0.0) { radius = radii.y; }
    else if (p.x > 0.0 && p.y <= 0.0) { radius = radii.z; }
    else { radius = radii.w; }
    let q = abs(p) - halfSize + vec2<f32>(radius);
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - radius;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let record = records[in.slot];
    let halfSize = record.rect.zw * 0.5;
    let radiusMax = min(halfSize.x, halfSize.y);
    let radii = clamp(record.radii, vec4<f32>(0.0), vec4<f32>(radiusMax));
    let borderWidths = max(record.borderWidths, vec4<f32>(0.0));
    let opacity = record.params.x;
    let shadowBlur = record.params.y;
    let shadowSpread = record.params.z;
    let point = in.localPos;
    let outerDistance = sdRoundBox(point, halfSize, radii);
    let antialias = max(fwidth(outerDistance), 0.00001);
    let outerMask = 1.0 - smoothstep(-antialias, antialias, outerDistance);

    if (shadowBlur > 0.0 || shadowSpread > 0.0) {
        let shadowDistance = outerDistance - shadowSpread;
        var shadowMask: f32;
        if (shadowBlur > 0.0) {
            shadowMask = 1.0 - smoothstep(-shadowBlur, shadowBlur, shadowDistance);
        } else {
            shadowMask = 1.0 - smoothstep(-antialias, antialias, shadowDistance);
        }
        let alpha = record.fill.a * shadowMask * opacity;
        if (alpha <= 0.0) { discard; }
        return vec4<f32>(record.fill.rgb, alpha);
    }

    if (!any(borderWidths > vec4<f32>(0.0))) {
        let alpha = record.fill.a * outerMask * opacity;
        if (alpha <= 0.0) { discard; }
        return vec4<f32>(record.fill.rgb, alpha);
    }

    var innerMask: f32;
    let uniformWidth = borderWidths.x;
    let uniformBorderWidths = all(borderWidths == vec4<f32>(uniformWidth));
    if (uniformBorderWidths) {
        let innerHalf = max(halfSize - vec2<f32>(uniformWidth), vec2<f32>(0.0));
        let innerRadii = max(radii - vec4<f32>(uniformWidth), vec4<f32>(0.0));
        let innerDistance = sdRoundBox(point, innerHalf, innerRadii);
        innerMask = 1.0 - smoothstep(-antialias, antialias, innerDistance);
    } else {
        let innerMin = vec2<f32>(
            -halfSize.x + borderWidths.w,
            -halfSize.y + borderWidths.z,
        );
        let innerMax = vec2<f32>(
            halfSize.x - borderWidths.y,
            halfSize.y - borderWidths.x,
        );
        if (all(innerMax > innerMin)) {
            let innerCenter = (innerMin + innerMax) * 0.5;
            let innerHalf = (innerMax - innerMin) * 0.5;
            let innerDistance = sdRoundBox(
                point - innerCenter,
                innerHalf,
                vec4<f32>(0.0),
            );
            innerMask = 1.0 - smoothstep(-antialias, antialias, innerDistance);
        } else {
            innerMask = 0.0;
        }
    }

    let borderStrength = max(outerMask - innerMask, 0.0);
    let fillStrength = innerMask;
    let rgb = (
        record.fill.rgb * fillStrength * record.fill.a
        + record.border.rgb * borderStrength * record.border.a
    ) * opacity;
    let alpha = (
        fillStrength * record.fill.a
        + borderStrength * record.border.a
    ) * opacity;
    if (alpha <= 0.0) { discard; }
    return vec4<f32>(rgb / max(alpha, 0.00001), alpha);
}

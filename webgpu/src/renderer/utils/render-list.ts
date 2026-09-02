import { Object3D } from "@zavx0z/engine"
import { Mesh } from "@zavx0z/engine"
import { InstancedMesh } from "@zavx0z/engine"
import {InstancedRoundedRect} from "@zavx0z/engine"
import {InstancedStrokedPath} from "@zavx0z/engine"
import { LineSegments } from "@zavx0z/engine"
import { Text } from "@zavx0z/engine"
import { Light } from "@zavx0z/engine"
import { SkinnedMesh } from "@zavx0z/engine"
import { WireframeInstancedMesh } from "@zavx0z/engine";
import { Matrix4, Frustum, Sphere, Vector3 } from "@zavx0z/engine";

const _sphere = new Sphere();

export interface RenderItem {
  type: "static-mesh" | "skinned-mesh" | "instanced-mesh" | "instanced-rounded-rect" | "instanced-stroked-path" | "instanced-line" | "line" | "text-stencil" | "text-cover"
  object: Mesh | InstancedMesh | InstancedRoundedRect | InstancedStrokedPath | SkinnedMesh | LineSegments | Text | WireframeInstancedMesh
  worldMatrix: Matrix4
  originalIndex?: number // для сохранения порядка при сортировке
}

export interface LightItem {
  light: Light
  worldMatrix: Matrix4
}

export function collectSpaceObjects(
  object: Object3D,
  renderList: RenderItem[],
  lights: LightItem[],
  frustum?: Frustum,
  excludedRoots?: ReadonlySet<Object3D>,
): void {
  if (excludedRoots?.has(object) === true) return
  if (!object.visible) return

  const worldMatrix = object.matrixWorld;

  // Frustum Culling
  if (frustum && object.frustumCulled && (object as any).geometry) {
    const geometry = (object as any).geometry;
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere();
    }

    if (geometry.boundingSphere) {
      _sphere.copy(geometry.boundingSphere).applyMatrix4(worldMatrix);
      if (!frustum.intersectsSphere(_sphere)) {
        return;
      }
    }
  }

  if (object instanceof InstancedRoundedRect) {
    renderList.push({type: "instanced-rounded-rect", object, worldMatrix})
  } else if (object instanceof InstancedStrokedPath) {
    renderList.push({type: "instanced-stroked-path", object, worldMatrix})
  } else if (object instanceof InstancedMesh) {
    renderList.push({ type: "instanced-mesh", object, worldMatrix })
  } else if (object instanceof WireframeInstancedMesh) {
    renderList.push({ type: "instanced-line", object, worldMatrix })
  } else if (object instanceof SkinnedMesh) {
    renderList.push({ type: "skinned-mesh", object, worldMatrix })
  } else if (object instanceof Mesh) {
    renderList.push({ type: "static-mesh", object, worldMatrix })
  } else if (object instanceof LineSegments) {
    renderList.push({ type: "line", object, worldMatrix })
  } else if (object instanceof Text) {
    renderList.push({ type: "text-stencil", object, worldMatrix })
    renderList.push({ type: "text-cover", object, worldMatrix })
  } else if (object instanceof Light) {
    lights.push({ light: object, worldMatrix })
  }

  for (const child of object.children) {
    collectSpaceObjects(child, renderList, lights, frustum, excludedRoots);
  }
}

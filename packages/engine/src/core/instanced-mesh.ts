import { BufferGeometry, BufferAttribute } from "./buffer-geometry"
import { Material } from "../materials"
import { Mesh } from "./mesh"
import { Matrix4, Quaternion, Vector3 } from "../math"

export class InstancedMesh extends Mesh {
  public readonly isInstancedMesh: true = true
  public instanceMatrix: Float32Array
  public readonly instanceMatrixAttribute: BufferAttribute
  public count: number

  constructor(geometry: BufferGeometry, material: Material | Material[], count: number) {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError(`InstancedMesh count must be a non-negative integer, received ${count}`)
    }
    super(geometry, material)
    this.count = count
    this.instanceMatrix = new Float32Array(count * 16)

    // Инициализируем единичными матрицами без временного массива на инстанс.
    for (let i = 0; i < count; i++) {
      const offset = i * 16
      this.instanceMatrix[offset] = 1
      this.instanceMatrix[offset + 5] = 1
      this.instanceMatrix[offset + 10] = 1
      this.instanceMatrix[offset + 15] = 1
    }

    // Добавляем атрибут матриц инстансов в геометрию
    this.instanceMatrixAttribute = new BufferAttribute(this.instanceMatrix, 16)
    geometry.setAttribute("instanceMatrix", this.instanceMatrixAttribute)
  }

  public setMatrixAt(index: number, matrix: Matrix4): void {
    if (!Number.isInteger(index) || index >= this.count || index < 0) {
      throw new Error(`InstancedMesh.setMatrixAt: index ${index} out of range (0-${this.count-1})`)
    }

    const offset = index * 16
    this.instanceMatrix.set(matrix.elements, offset)
    this.instanceMatrixAttribute.addUpdateRange(offset, 16)
  }

  public getMatrixAt(index: number, matrix: Matrix4): void {
    if (!Number.isInteger(index) || index >= this.count || index < 0) {
      throw new Error(`InstancedMesh.getMatrixAt: index ${index} out of range (0-${this.count-1})`)
    }

    const offset = index * 16
    matrix.elements.set(this.instanceMatrix.subarray(offset, offset + 16))
  }

  public setPositionAt(index: number, position: Vector3): void {
    if (!Number.isInteger(index) || index >= this.count || index < 0) {
      throw new Error(`InstancedMesh.setPositionAt: index ${index} out of range (0-${this.count-1})`)
    }

    const offset = index * 16 + 12
    this.instanceMatrix[offset] = position.x
    this.instanceMatrix[offset + 1] = position.y
    this.instanceMatrix[offset + 2] = position.z
    this.instanceMatrixAttribute.addUpdateRange(offset, 3)
  }

  public setQuaternionAt(index: number, quaternion: Quaternion): void {
    if (!Number.isInteger(index) || index >= this.count || index < 0) {
      throw new Error(`InstancedMesh.setQuaternionAt: index ${index} out of range (0-${this.count-1})`)
    }

    const offset = index * 16
    const x2 = quaternion.x + quaternion.x
    const y2 = quaternion.y + quaternion.y
    const z2 = quaternion.z + quaternion.z
    const xx = quaternion.x * x2
    const xy = quaternion.x * y2
    const xz = quaternion.x * z2
    const yy = quaternion.y * y2
    const yz = quaternion.y * z2
    const zz = quaternion.z * z2
    const wx = quaternion.w * x2
    const wy = quaternion.w * y2
    const wz = quaternion.w * z2

    // Копируем только вращательную часть (3x3)
    this.instanceMatrix[offset] = 1 - (yy + zz)
    this.instanceMatrix[offset + 1] = xy + wz
    this.instanceMatrix[offset + 2] = xz - wy

    this.instanceMatrix[offset + 4] = xy - wz
    this.instanceMatrix[offset + 5] = 1 - (xx + zz)
    this.instanceMatrix[offset + 6] = yz + wx

    this.instanceMatrix[offset + 8] = xz + wy
    this.instanceMatrix[offset + 9] = yz - wx
    this.instanceMatrix[offset + 10] = 1 - (xx + yy)
    this.instanceMatrixAttribute.addUpdateRange(offset, 3)
    this.instanceMatrixAttribute.addUpdateRange(offset + 4, 3)
    this.instanceMatrixAttribute.addUpdateRange(offset + 8, 3)
  }

  public setScaleAt(index: number, scale: Vector3): void {
    if (!Number.isInteger(index) || index >= this.count || index < 0) {
      throw new Error(`InstancedMesh.setScaleAt: index ${index} out of range (0-${this.count-1})`)
    }

    const offset = index * 16

    // Масштабируем вращательную часть матрицы
    this.instanceMatrix![offset] = this.instanceMatrix![offset]! * scale.x
    this.instanceMatrix![offset + 1] = this.instanceMatrix![offset + 1]! * scale.x
    this.instanceMatrix![offset + 2] = this.instanceMatrix![offset + 2]! * scale.x

    this.instanceMatrix![offset + 4] = this.instanceMatrix![offset + 4]! * scale.y
    this.instanceMatrix![offset + 5] = this.instanceMatrix![offset + 5]! * scale.y
    this.instanceMatrix![offset + 6] = this.instanceMatrix![offset + 6]! * scale.y

    this.instanceMatrix![offset + 8] = this.instanceMatrix![offset + 8]! * scale.z
    this.instanceMatrix![offset + 9] = this.instanceMatrix![offset + 9]! * scale.z
    this.instanceMatrix![offset + 10] = this.instanceMatrix![offset + 10]! * scale.z
    this.instanceMatrixAttribute.addUpdateRange(offset, 3)
    this.instanceMatrixAttribute.addUpdateRange(offset + 4, 3)
    this.instanceMatrixAttribute.addUpdateRange(offset + 8, 3)
  }
}

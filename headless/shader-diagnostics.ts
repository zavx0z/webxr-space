/**
Дополняет устройство bun-webgpu диагностикой шейдеров из настоящих validation scopes Dawn.

В bun-webgpu 0.1.7 `getCompilationInfo()` бросает ошибку «not implemented».
Для каждого создаваемого модуля этот адаптер захватывает результат собственного
scope и возвращает его через ожидаемый Renderer метод. Ошибки не подавляются.
Предупреждения компилятора и точные позиции API error scope не предоставляет:
позиции возвращаются нулевыми, а исходное сообщение Dawn сохраняется полностью.

@param device - Устройство, принадлежащее отдельному процессу нативной fixture.
*/
export function installShaderCompilationDiagnostics(device: GPUDevice): void {
  const createShaderModule = device.createShaderModule.bind(device)
  device.createShaderModule = descriptor => {
    device.pushErrorScope("validation")
    let module: GPUShaderModule
    try {
      module = createShaderModule(descriptor)
    } catch (error) {
      // Закрываем именно открытый нами scope и сохраняем исходную ошибку создания.
      void device.popErrorScope().catch(() => {})
      throw error
    }
    const diagnostics: Promise<GPUCompilationInfo> = device.popErrorScope().then(error => ({
      __brand: "GPUCompilationInfo",
      messages: error === null ? [] : [{
        __brand: "GPUCompilationMessage",
        type: "error",
        message: error.message,
        lineNum: 0,
        linePos: 0,
        offset: 0,
        length: 0,
      }],
    }))
    // У модулей, чью диагностику Renderer не запрашивает, rejection всё равно
    // остаётся доступен через getCompilationInfo, но не становится unhandled.
    void diagnostics.catch(() => {})
    module.getCompilationInfo = () => diagnostics
    return module
  }
}

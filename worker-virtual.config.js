export const line = {
    debug: false,

    viewMargin: 0.9,

    // геометрия упаковки
    leafBandWidth: 12,
    firstBandOffset: 12,
    interBandGap: 0,

    // масштаб
    minScale: 0.2,
    maxScale: 1,

    // плавность/углы
    lerpPos: 0.12,
    lerpRadius: 0.18,
    angleSpeed: "static",
    angleSpeedBase: 0.12,
    angleDepthAttenuation: 1,
    angleDistribution: "uniform",

    // орбиты/связи
    drawOrbits: true,
    orbitDash: [0, 0],
    orbitAlpha: 0.22,

    linkMode: "adjacent",
    linkDash: [5, 5],
    linkMaxDist: 180,
    linkBaseAlpha: 1,

    // частицы
    particleRingThickness: 2,
    coreSize: 4,
    nodeSizeBase: 2,
    nodeSizePerDepth: 0,

    // вспышка
    flareDuration: 420,
    flareR0: 10,
    flareR1: 90,
    flareMaxAlpha: 0.6,

    // дрожание
    shakeIntensity: 1.4,
    shakeSpeed: 44.0,
    shakeVariation: 0.8,

    // пульсация
    pulseSpeed: 22.0,
    pulseAmplitude: 0.3,
    pulseBase: 0.7,
    pulseTimeVariation: 0.5,

    // орбита
    orbitLineAt: "center",
  }
import type { LightingAssessment } from './lightingAssessment.ts';
import type { CompositionAssessment } from './compositionAnalysis.ts';

export function generateGuidanceMessage(
  blurScore: number,
  lighting: LightingAssessment,
  composition: CompositionAssessment
): { message: string; type: 'success' | 'warning' | 'error' } {
  if (!composition.bottleDetected || composition.distance === 'not-detected') {
    return { message: 'camera.alignBottle', type: 'error' };
  }
  if (composition.distance === 'too-far') {
    if (!composition.isCentered && composition.visibility > 30) {
      return { message: 'camera.centreBottle', type: 'warning' };
    }
    return { message: 'camera.moveCloser', type: 'warning' };
  }
  if (composition.distance === 'too-close') {
    return { message: 'camera.moveBack', type: 'warning' };
  }
  if (lighting.status === 'too-dark') return { message: 'camera.tooDarkMessage', type: 'error' };
  if (lighting.status === 'too-bright') return { message: 'camera.tooBrightMessage', type: 'warning' };
  if (lighting.status === 'low-contrast') return { message: 'camera.lowContrast', type: 'warning' };
  if (!lighting.isAcceptable) return { message: 'camera.enhanceLighting', type: 'error' };
  if (blurScore < 30) return { message: 'camera.holdSteady', type: 'error' };
  if (blurScore < 45) return { message: 'camera.holdStill', type: 'warning' };
  if (!composition.isBrandMatch) return { message: 'camera.positionHandleRight', type: 'warning' };
  return { message: 'camera.perfect', type: 'success' };
}

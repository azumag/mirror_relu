import { describe, it, expect } from 'vitest'
import { analyzePosture, PostureResult } from './postureDetection'
import { NormalizedLandmark } from '@mediapipe/tasks-vision'

// Helper function to create a landmark
const createLandmark = (x: number, y: number, z: number = 0, visibility: number = 1): NormalizedLandmark => ({
  x,
  y,
  z,
  visibility
})

// Helper function to create a full set of landmarks for testing
const createMockLandmarks = (): NormalizedLandmark[] => {
  const landmarks: NormalizedLandmark[] = []
  // Initialize with 478 landmarks (MediaPipe Face Mesh standard)
  for (let i = 0; i < 478; i++) {
    landmarks.push(createLandmark(0.5, 0.5, 0, 1))
  }
  return landmarks
}

describe('postureDetection', () => {
  describe('analyzePosture', () => {
    it('should detect normal posture when all parameters are within range', () => {
      const landmarks = createMockLandmarks()

      // Set up normal posture landmarks
      landmarks[1] = createLandmark(0.5, 0.5, 0)    // nose tip
      landmarks[10] = createLandmark(0.5, 0.3, 0.1) // forehead top
      landmarks[152] = createLandmark(0.5, 0.7, -0.1) // chin
      landmarks[33] = createLandmark(0.4, 0.4, 0)   // left eye
      landmarks[263] = createLandmark(0.6, 0.4, 0)  // right eye
      landmarks[13] = createLandmark(0.5, 0.6, 0)   // upper lip
      landmarks[14] = createLandmark(0.5, 0.62, 0)  // lower lip

      // Set up iris landmarks (normal alignment)
      for (let i = 468; i <= 472; i++) {
        landmarks[i] = createLandmark(0.4, 0.4, 0)
      }
      for (let i = 473; i <= 477; i++) {
        landmarks[i] = createLandmark(0.6, 0.4, 0)
      }

      // Eye corner landmarks
      landmarks[133] = createLandmark(0.35, 0.4, 0)  // left eye inner
      landmarks[362] = createLandmark(0.65, 0.4, 0)  // right eye inner

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result.isSlouchingDetected).toBe(false)
      expect(result.isScreenTooClose).toBe(false)
      expect(result.isMouthOpen).toBe(false)
      expect(result.isStrabismusDetected).toBe(false)
    })

    it('should detect slouching when neck angle is less than 155 degrees', () => {
      const landmarks = createMockLandmarks()

      // Set up slouching posture (smaller angle)
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.35, 0)
      landmarks[152] = createLandmark(0.5, 0.65, 0)
      landmarks[33] = createLandmark(0.4, 0.4, 0)
      landmarks[263] = createLandmark(0.6, 0.4, 0)
      landmarks[13] = createLandmark(0.5, 0.6, 0)
      landmarks[14] = createLandmark(0.5, 0.61, 0)

      // Setup iris and eye corners
      for (let i = 468; i <= 472; i++) landmarks[i] = createLandmark(0.4, 0.4, 0)
      for (let i = 473; i <= 477; i++) landmarks[i] = createLandmark(0.6, 0.4, 0)
      landmarks[133] = createLandmark(0.35, 0.4, 0)
      landmarks[362] = createLandmark(0.65, 0.4, 0)

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result.isSlouchingDetected).toBe(true)
      expect(result.neckAngle).toBeLessThan(155)
    })

    it('should detect screen too close when eye distance is more than 20% larger', () => {
      const landmarks = createMockLandmarks()

      // Set up close distance (larger eye distance)
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.3, 0.1)
      landmarks[152] = createLandmark(0.5, 0.7, -0.1)
      landmarks[33] = createLandmark(0.3, 0.4, 0)   // left eye - wider
      landmarks[263] = createLandmark(0.7, 0.4, 0)  // right eye - wider
      landmarks[13] = createLandmark(0.5, 0.6, 0)
      landmarks[14] = createLandmark(0.5, 0.61, 0)

      // Setup iris and eye corners
      for (let i = 468; i <= 472; i++) landmarks[i] = createLandmark(0.3, 0.4, 0)
      for (let i = 473; i <= 477; i++) landmarks[i] = createLandmark(0.7, 0.4, 0)
      landmarks[133] = createLandmark(0.25, 0.4, 0)
      landmarks[362] = createLandmark(0.75, 0.4, 0)

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result.isScreenTooClose).toBe(true)
      expect(result.faceDistance).toBeGreaterThan(0.2 * 1.2)
    })

    it('should detect mouth open when openness exceeds threshold', () => {
      const landmarks = createMockLandmarks()

      // Set up open mouth
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.3, 0.1)
      landmarks[152] = createLandmark(0.5, 0.7, -0.1)
      landmarks[33] = createLandmark(0.4, 0.4, 0)
      landmarks[263] = createLandmark(0.6, 0.4, 0)
      landmarks[13] = createLandmark(0.5, 0.6, 0)   // upper lip
      landmarks[14] = createLandmark(0.5, 0.65, 0)  // lower lip - wide open

      // Setup iris and eye corners
      for (let i = 468; i <= 472; i++) landmarks[i] = createLandmark(0.4, 0.4, 0)
      for (let i = 473; i <= 477; i++) landmarks[i] = createLandmark(0.6, 0.4, 0)
      landmarks[133] = createLandmark(0.35, 0.4, 0)
      landmarks[362] = createLandmark(0.65, 0.4, 0)

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result.isMouthOpen).toBe(true)
      expect(result.mouthOpenness).toBeGreaterThan(0.02)
    })

    it('should detect strabismus when eye alignment difference exceeds threshold', () => {
      const landmarks = createMockLandmarks()

      // Set up basic landmarks
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.3, 0.1)
      landmarks[152] = createLandmark(0.5, 0.7, -0.1)
      landmarks[33] = createLandmark(0.4, 0.4, 0)
      landmarks[263] = createLandmark(0.6, 0.4, 0)
      landmarks[13] = createLandmark(0.5, 0.6, 0)
      landmarks[14] = createLandmark(0.5, 0.61, 0)

      // Eye corner landmarks
      landmarks[133] = createLandmark(0.35, 0.4, 0)
      landmarks[362] = createLandmark(0.65, 0.4, 0)

      // Set up misaligned iris (left eye looking left, right eye looking right)
      for (let i = 468; i <= 472; i++) {
        landmarks[i] = createLandmark(0.35, 0.4, 0) // left iris shifted left
      }
      for (let i = 473; i <= 477; i++) {
        landmarks[i] = createLandmark(0.65, 0.4, 0) // right iris shifted right
      }

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result.isStrabismusDetected).toBe(true)
      expect(result.eyeAlignment).toBeGreaterThan(0.15)
    })

    it('should use default calibration distance when none provided', () => {
      const landmarks = createMockLandmarks()

      // Set up basic landmarks
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.3, 0.1)
      landmarks[152] = createLandmark(0.5, 0.7, -0.1)
      landmarks[33] = createLandmark(0.4, 0.4, 0)
      landmarks[263] = createLandmark(0.6, 0.4, 0)
      landmarks[13] = createLandmark(0.5, 0.6, 0)
      landmarks[14] = createLandmark(0.5, 0.61, 0)

      // Setup iris and eye corners
      for (let i = 468; i <= 472; i++) landmarks[i] = createLandmark(0.4, 0.4, 0)
      for (let i = 473; i <= 477; i++) landmarks[i] = createLandmark(0.6, 0.4, 0)
      landmarks[133] = createLandmark(0.35, 0.4, 0)
      landmarks[362] = createLandmark(0.65, 0.4, 0)

      const result: PostureResult = analyzePosture(landmarks)

      expect(result).toBeDefined()
      expect(result.faceDistance).toBeDefined()
    })

    it('should return all required metrics in PostureResult', () => {
      const landmarks = createMockLandmarks()

      // Set up basic landmarks
      landmarks[1] = createLandmark(0.5, 0.5, 0)
      landmarks[10] = createLandmark(0.5, 0.3, 0.1)
      landmarks[152] = createLandmark(0.5, 0.7, -0.1)
      landmarks[33] = createLandmark(0.4, 0.4, 0)
      landmarks[263] = createLandmark(0.6, 0.4, 0)
      landmarks[13] = createLandmark(0.5, 0.6, 0)
      landmarks[14] = createLandmark(0.5, 0.61, 0)

      // Setup iris and eye corners
      for (let i = 468; i <= 472; i++) landmarks[i] = createLandmark(0.4, 0.4, 0)
      for (let i = 473; i <= 477; i++) landmarks[i] = createLandmark(0.6, 0.4, 0)
      landmarks[133] = createLandmark(0.35, 0.4, 0)
      landmarks[362] = createLandmark(0.65, 0.4, 0)

      const result: PostureResult = analyzePosture(landmarks, 0.2)

      expect(result).toHaveProperty('isSlouchingDetected')
      expect(result).toHaveProperty('isScreenTooClose')
      expect(result).toHaveProperty('isMouthOpen')
      expect(result).toHaveProperty('isStrabismusDetected')
      expect(result).toHaveProperty('neckAngle')
      expect(result).toHaveProperty('faceDistance')
      expect(result).toHaveProperty('mouthOpenness')
      expect(result).toHaveProperty('eyeAlignment')

      expect(typeof result.isSlouchingDetected).toBe('boolean')
      expect(typeof result.isScreenTooClose).toBe('boolean')
      expect(typeof result.isMouthOpen).toBe('boolean')
      expect(typeof result.isStrabismusDetected).toBe('boolean')
      expect(typeof result.neckAngle).toBe('number')
      expect(typeof result.faceDistance).toBe('number')
      expect(typeof result.mouthOpenness).toBe('number')
      expect(typeof result.eyeAlignment).toBe('number')
    })
  })
})

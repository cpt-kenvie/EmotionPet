interface EmotionBallInstance {
  readonly emotionId: string | null
  setEmotion(id: string, options?: { readonly auto?: boolean }): boolean
  setGaze(x: number, y: number): EmotionBallInstance
  resetGaze(): EmotionBallInstance
  setActive(active: boolean): void
  bounce(): EmotionBallInstance
  burst(count: number): EmotionBallInstance
  spin(turns?: number, direction?: number): EmotionBallInstance
  destroy(): void
}

interface EmotionBallApi {
  create(
    target: HTMLElement,
    options: {
      readonly emotion: string
      readonly shape: 'blob' | 'wedge' | 'gem'
      readonly color?: string
      readonly eyeColor?: string
      readonly eyeScale: number
      readonly gazeRange: { readonly x: number; readonly y: number }
      readonly idle: false
      readonly label: string
      readonly autostart: boolean
    },
  ): EmotionBallInstance
}

interface Window {
  EmotionBall: EmotionBallApi
}

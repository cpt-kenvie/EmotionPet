interface EmotionBallInstance {
  readonly emotionId: string | null
  setEmotion(id: string, options?: { readonly auto?: boolean }): boolean
  setGaze(x: number, y: number): EmotionBallInstance
  resetGaze(): EmotionBallInstance
  setActive(active: boolean): void
  bounce(): EmotionBallInstance
  destroy(): void
}

interface EmotionBallApi {
  create(
    target: HTMLElement,
    options: {
      readonly emotion: string
      readonly shape: 'blob'
      readonly eyeScale: number
      readonly idle: false
      readonly label: string
      readonly autostart: boolean
    },
  ): EmotionBallInstance
}

interface Window {
  EmotionBall: EmotionBallApi
}

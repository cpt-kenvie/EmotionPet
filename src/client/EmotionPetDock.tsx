import { useEffect, useMemo, useRef, useState } from 'react'
import { derivePetState, DONE_DURATION_MS, PET_PRESENTATIONS } from './pet-state.ts'
import type { EmotionPetDockProps, PetSessionSnapshot } from './types.ts'
import './EmotionPetDock.css'

/** 情绪宠物在输入框上方的常驻展示。 */
export function EmotionPetDock({ session }: EmotionPetDockProps) {
  const ballHostRef = useRef<HTMLDivElement>(null)
  const petButtonRef = useRef<HTMLButtonElement>(null)
  const engineRef = useRef<EmotionBallInstance | null>(null)
  const previousRunningRef = useRef(session.running)
  const patTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const [patting, setPatting] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const liveState = useMemo(() => derivePetState(session), [session])
  const state = patting
    ? PET_PRESENTATIONS.happy
    : celebrating && liveState.name === 'idle'
      ? PET_PRESENTATIONS.done
      : liveState

  useEffect(() => {
    const host = ballHostRef.current
    if (host === null) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = window.EmotionBall.create(host, {
      emotion: state.emotion,
      shape: 'blob',
      eyeScale: 1.08,
      idle: false,
      label: '情绪宠物',
      autostart: !reducedMotion,
    })
    engineRef.current = engine

    const handlePointerMove = (event: PointerEvent): void => {
      const button = petButtonRef.current
      if (button === null) return
      const rect = button.getBoundingClientRect()
      const x = (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width / 2, 1)
      const y = (event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height / 2, 1)
      engine.setGaze(x, y)
    }
    const handleVisibility = (): void => { engine.setActive(!document.hidden && !reducedMotion) }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibility)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setEmotion(state.emotion, { auto: true })
  }, [state.emotion])

  useEffect(() => {
    setPatting(false)
    if (patTimerRef.current !== null) window.clearTimeout(patTimerRef.current)
  }, [liveState.name])

  useEffect(() => {
    const wasRunning = previousRunningRef.current
    previousRunningRef.current = session.running

    if (session.running) {
      setCelebrating(false)
      if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
      return
    }
    if (!wasRunning || liveState.name !== 'idle') return

    setCelebrating(true)
    doneTimerRef.current = window.setTimeout(() => {
      setCelebrating(false)
      doneTimerRef.current = null
    }, DONE_DURATION_MS)
  }, [session.running, liveState.name])

  useEffect(() => () => {
    if (patTimerRef.current !== null) window.clearTimeout(patTimerRef.current)
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
  }, [])

  const handlePat = (): void => {
    setPatting(true)
    engineRef.current?.bounce()
    if (patTimerRef.current !== null) window.clearTimeout(patTimerRef.current)
    patTimerRef.current = window.setTimeout(() => {
      setPatting(false)
      patTimerRef.current = null
    }, 1500)
  }

  return (
    <section className="emotionPet__dock" data-emotion-pet data-pet-state={state.name}>
      <div className="emotionPet__row">
        <button
          ref={petButtonRef}
          type="button"
          className="emotionPet__button"
          onClick={handlePat}
          aria-label="摸摸情绪宠物"
          title="摸摸情绪宠物"
        >
          <span ref={ballHostRef} className="emotionPet__ball" aria-hidden="true" />
        </button>
        <div className="emotionPet__bubble" aria-live="polite" aria-atomic="true">
          <span className="emotionPet__status">
            <i className="emotionPet__dot" data-tone={state.tone} aria-hidden="true" />
            {state.label}
          </span>
          <span className="emotionPet__speech">{state.speech}</span>
        </div>
      </div>
    </section>
  )
}

/** 测试和外部适配器可复用的最小快照构造类型。 */
export type { PetSessionSnapshot }

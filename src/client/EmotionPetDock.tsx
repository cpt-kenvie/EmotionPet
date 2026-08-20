import { useEffect, useMemo, useRef, useState } from 'react'
import { Cookie, Gamepad2, Moon, Sun } from 'lucide-react'
import {
  derivePetState, DONE_DURATION_MS, INTERACTION_DURATION_MS, PET_PRESENTATIONS,
  type PetStateName,
} from './pet-state.ts'
import type { EmotionPetDockProps, PetSessionSnapshot } from './types.ts'
import './EmotionPetDock.css'

// 注视范围针对 72~82px 宠物放大，确保待机巡视不会盖过鼠标方向。
const GAZE_RANGE = { x: 48, y: 28 } as const
// 没有增量内容时的阶段推进，避免长任务一直停在“接收任务”。
const RECEIVING_PHASE_MS = 900
const THINKING_PHASE_MS = 3500
const SEARCHING_PHASE_MS = 6000
// 同一阶段轮换兼容表情的节奏，眼环动画仍由 Emotion Ball 引擎持续驱动。
const EXPRESSION_CYCLE_MS = 3200

/** 情绪宠物在输入框上方的常驻展示。 */
export function EmotionPetDock({ session }: EmotionPetDockProps) {
  const ballHostRef = useRef<HTMLDivElement>(null)
  const petButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<EmotionBallInstance | null>(null)
  const previousRunningRef = useRef(session.running)
  const interactionTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const [interaction, setInteraction] = useState<PetStateName | null>(null)
  const [sleeping, setSleeping] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [runningElapsedMs, setRunningElapsedMs] = useState(0)
  const [expressionIndex, setExpressionIndex] = useState(0)

  const liveState = useMemo(() => derivePetState(session), [session])
  const progressingState = liveState.name === 'receiving' && session.running
    ? runningElapsedMs < RECEIVING_PHASE_MS
      ? PET_PRESENTATIONS.receiving
      : runningElapsedMs < THINKING_PHASE_MS
        ? PET_PRESENTATIONS.thinking
        : runningElapsedMs < SEARCHING_PHASE_MS
          ? PET_PRESENTATIONS.searching
          : PET_PRESENTATIONS.busy
    : liveState
  const state = interaction !== null
    ? PET_PRESENTATIONS[interaction]
    : sleeping
      ? PET_PRESENTATIONS.sleeping
      : celebrating && progressingState.name === 'idle'
        ? PET_PRESENTATIONS.done
        : progressingState
  const displayedEmotion = state.alternateEmotions?.[
    expressionIndex % state.alternateEmotions.length
  ] ?? state.emotion

  useEffect(() => {
    const host = ballHostRef.current
    if (host === null) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = window.EmotionBall.create(host, {
      emotion: displayedEmotion,
      shape: 'blob',
      eyeScale: 1.08,
      gazeRange: GAZE_RANGE,
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
    engineRef.current?.setEmotion(displayedEmotion, { auto: true })
  }, [displayedEmotion])

  useEffect(() => {
    if (!session.running) {
      setRunningElapsedMs(0)
      return
    }
    const startedAt = performance.now()
    setRunningElapsedMs(0)
    const timer = window.setInterval(() => {
      setRunningElapsedMs(performance.now() - startedAt)
    }, 250)
    return () => { window.clearInterval(timer) }
  }, [session.running])

  useEffect(() => {
    setExpressionIndex(0)
    const variants = state.alternateEmotions
    if (variants === undefined || variants.length < 2) return
    const timer = window.setInterval(() => {
      setExpressionIndex(index => (index + 1) % variants.length)
    }, EXPRESSION_CYCLE_MS)
    return () => { window.clearInterval(timer) }
  }, [state.name, state.alternateEmotions])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    const wasRunning = previousRunningRef.current
    previousRunningRef.current = session.running

    if (!wasRunning && session.running) setSleeping(false)
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
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
  }, [])

  const showTemporaryInteraction = (name: 'happy' | 'satisfied' | 'playing'): void => {
    setInteraction(name)
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
    interactionTimerRef.current = window.setTimeout(() => {
      setInteraction(null)
      interactionTimerRef.current = null
    }, INTERACTION_DURATION_MS)
  }

  const handlePat = (): void => {
    showTemporaryInteraction('happy')
    engineRef.current?.bounce()
  }

  const handleFeed = (): void => {
    setMenuOpen(false)
    showTemporaryInteraction('satisfied')
    engineRef.current?.burst(10)
  }

  const handlePlay = (): void => {
    setMenuOpen(false)
    showTemporaryInteraction('playing')
    engineRef.current?.spin(1)
  }

  const handleSleepToggle = (): void => {
    setMenuOpen(false)
    setInteraction(null)
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
    setSleeping(value => !value)
  }

  const openMenu = (): void => {
    setMenuOpen(true)
  }

  return (
    <section className="emotionPet__dock" data-emotion-pet data-pet-state={state.name}>
      <div className="emotionPet__row">
        <button
          ref={petButtonRef}
          type="button"
          className="emotionPet__button"
          onClick={handlePat}
          onContextMenu={(event) => { event.preventDefault(); openMenu() }}
          onKeyDown={(event) => {
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault()
              openMenu()
            }
          }}
          aria-label="摸摸情绪宠物"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="情绪宠物"
        >
          <span ref={ballHostRef} className="emotionPet__ball" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div ref={menuRef} className="emotionPet__menu" role="menu" aria-label="宠物互动">
            <button type="button" role="menuitem" onClick={handleFeed}>
              <Cookie size={16} aria-hidden="true" />
              投喂
            </button>
            <button type="button" role="menuitem" onClick={handlePlay}>
              <Gamepad2 size={16} aria-hidden="true" />
              玩耍
            </button>
            <button type="button" role="menuitem" onClick={handleSleepToggle}>
              {sleeping
                ? <Sun size={16} aria-hidden="true" />
                : <Moon size={16} aria-hidden="true" />}
              {sleeping ? '唤醒' : '休息'}
            </button>
          </div>
        )}
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

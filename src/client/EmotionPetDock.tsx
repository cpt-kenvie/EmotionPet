import { useEffect, useMemo, useRef, useState } from 'react'
import { Cookie, Gamepad2, Moon, Sun } from 'lucide-react'
import {
  derivePetState, DONE_DURATION_MS, IDLE_HIBERNATING_DURATION_MS,
  IDLE_SPACING_DURATION_MS, IDLE_TIRED_DURATION_MS, INTERACTION_DURATION_MS,
  MISSING_DURATION_MS, PET_PRESENTATIONS,
  type PetStateName,
} from './pet-state.ts'
import type { EmotionPetDockProps, PetSessionSnapshot } from './types.ts'
import './EmotionPetDock.css'

// 注视范围针对 72~82px 宠物放大，确保待机巡视不会盖过鼠标方向。
const GAZE_RANGE = { x: 48, y: 28 } as const
// 没有增量内容时的阶段推进，避免长任务一直停在“接收任务”。
const RECEIVING_PHASE_MS = 1800
const THINKING_PHASE_MS = 4800
const SEARCHING_PHASE_MS = 7500
// 同一阶段轮换兼容表情的节奏，眼环动画仍由 Emotion Ball 引擎持续驱动。
const EXPRESSION_CYCLE_MS = 3200
const RECEIVING_EXPRESSION_CYCLE_MS = 800
const WAKING_EXPRESSION_CYCLE_MS = 700
const MISSING_EXPRESSION_CYCLE_MS = 900
// 3 秒内连续点击 5 次会生气，投喂或玩耍后恢复。
const ANGRY_CLICK_WINDOW_MS = 3000
const ANGRY_CLICK_THRESHOLD = 5
// 闲置计时的刷新间隔只影响状态响应速度，不影响动画帧率。
const IDLE_TICK_MS = 500

type TemporaryInteraction = 'happy' | 'satisfied' | 'playing' | 'waking'

/** 情绪宠物在输入框上方的常驻展示。 */
export function EmotionPetDock({ session }: EmotionPetDockProps) {
  const ballHostRef = useRef<HTMLDivElement>(null)
  const petButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<EmotionBallInstance | null>(null)
  const previousRunningRef = useRef(session.running)
  const interactionTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const idleStartedAtRef = useRef(performance.now())
  const clickTimestampsRef = useRef<number[]>([])
  const [interaction, setInteraction] = useState<PetStateName | null>(null)
  const [sleeping, setSleeping] = useState(false)
  const [angry, setAngry] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [runningElapsedMs, setRunningElapsedMs] = useState(0)
  const [idleElapsedMs, setIdleElapsedMs] = useState(0)
  const [expressionIndex, setExpressionIndex] = useState(0)
  const [expiredMissingKey, setExpiredMissingKey] = useState<string | null>(null)

  const liveState = useMemo(() => derivePetState(session), [session])
  const missingEventKey = `${session.promptError?.op ?? ''}|${session.lastAgentError ?? ''}|${
    session.pending.map(item => item.kind).join(',')
  }`
  const contextualState = liveState.name === 'missing' && expiredMissingKey === missingEventKey
    ? session.pending.some(item => item.kind === 'question')
      ? PET_PRESENTATIONS.waiting
      : PET_PRESENTATIONS.error
    : liveState
  const progressingState = contextualState.name === 'receiving' && session.running
    ? runningElapsedMs < RECEIVING_PHASE_MS
      ? PET_PRESENTATIONS.receiving
      : runningElapsedMs < THINKING_PHASE_MS
        ? PET_PRESENTATIONS.thinking
        : runningElapsedMs < SEARCHING_PHASE_MS
          ? PET_PRESENTATIONS.searching
          : PET_PRESENTATIONS.busy
    : contextualState
  const ambientState = progressingState.name === 'idle'
    ? idleElapsedMs >= IDLE_HIBERNATING_DURATION_MS
      ? PET_PRESENTATIONS.hibernating
      : idleElapsedMs >= IDLE_TIRED_DURATION_MS
        ? PET_PRESENTATIONS.tired
        : idleElapsedMs >= IDLE_SPACING_DURATION_MS
          ? PET_PRESENTATIONS.spacing
          : progressingState
    : progressingState
  const forcedState = ambientState.name === 'restricted' || ambientState.name === 'stopped'
    ? ambientState
    : null
  const state = forcedState
    ?? (interaction !== null
      ? PET_PRESENTATIONS[interaction]
      : angry
        ? PET_PRESENTATIONS.angry
        : sleeping
          ? PET_PRESENTATIONS.sleeping
          : celebrating && ambientState.name === 'idle'
            ? PET_PRESENTATIONS.done
            : ambientState)
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
    if (liveState.name !== 'idle' || sleeping) {
      setIdleElapsedMs(0)
      return
    }
    idleStartedAtRef.current = performance.now()
    setIdleElapsedMs(0)
    const timer = window.setInterval(() => {
      setIdleElapsedMs(performance.now() - idleStartedAtRef.current)
    }, IDLE_TICK_MS)
    return () => { window.clearInterval(timer) }
  }, [liveState.name, sleeping])

  useEffect(() => {
    if (liveState.name !== 'missing') {
      setExpiredMissingKey(null)
      return
    }
    if (expiredMissingKey === missingEventKey) return
    const timer = window.setTimeout(() => {
      setExpiredMissingKey(missingEventKey)
    }, MISSING_DURATION_MS)
    return () => { window.clearTimeout(timer) }
  }, [expiredMissingKey, liveState.name, missingEventKey])

  useEffect(() => {
    const variants = state.alternateEmotions
    const randomize = state.name === 'receiving'
    setExpressionIndex(randomize && variants !== undefined
      ? Math.floor(Math.random() * variants.length)
      : 0)
    if (variants === undefined || variants.length < 2) return
    const cycleMs = state.name === 'receiving'
      ? RECEIVING_EXPRESSION_CYCLE_MS
      : state.name === 'waking'
        ? WAKING_EXPRESSION_CYCLE_MS
        : state.name === 'missing'
          ? MISSING_EXPRESSION_CYCLE_MS
          : EXPRESSION_CYCLE_MS
    const timer = window.setInterval(() => {
      setExpressionIndex(index => {
        if (!randomize) return (index + 1) % variants.length
        const offset = 1 + Math.floor(Math.random() * (variants.length - 1))
        return (index + offset) % variants.length
      })
    }, cycleMs)
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

  const resetIdleProgress = (): void => {
    idleStartedAtRef.current = performance.now()
    setIdleElapsedMs(0)
  }

  const showTemporaryInteraction = (name: TemporaryInteraction): void => {
    setInteraction(name)
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
    interactionTimerRef.current = window.setTimeout(() => {
      setInteraction(null)
      interactionTimerRef.current = null
    }, INTERACTION_DURATION_MS)
  }

  const wakePet = (): void => {
    setSleeping(false)
    resetIdleProgress()
    showTemporaryInteraction('waking')
    engineRef.current?.bounce()
  }

  const handlePat = (): void => {
    if (sleeping || ambientState.name === 'hibernating') {
      clickTimestampsRef.current = []
      wakePet()
      return
    }

    const now = performance.now()
    clickTimestampsRef.current = clickTimestampsRef.current.filter(
      timestamp => now - timestamp <= ANGRY_CLICK_WINDOW_MS,
    )
    clickTimestampsRef.current.push(now)
    resetIdleProgress()

    if (angry) {
      engineRef.current?.bounce()
      return
    }
    if (clickTimestampsRef.current.length >= ANGRY_CLICK_THRESHOLD) {
      setAngry(true)
      setInteraction(null)
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current)
        interactionTimerRef.current = null
      }
      engineRef.current?.burst(6)
      return
    }
    showTemporaryInteraction('happy')
    engineRef.current?.bounce()
  }

  const handleFeed = (): void => {
    setMenuOpen(false)
    setAngry(false)
    clickTimestampsRef.current = []
    resetIdleProgress()
    showTemporaryInteraction('satisfied')
    engineRef.current?.burst(10)
  }

  const handlePlay = (): void => {
    setMenuOpen(false)
    setAngry(false)
    clickTimestampsRef.current = []
    resetIdleProgress()
    showTemporaryInteraction('playing')
    engineRef.current?.spin(1)
  }

  const handleSleepToggle = (): void => {
    setMenuOpen(false)
    if (sleeping || ambientState.name === 'hibernating') {
      wakePet()
      return
    }
    setInteraction(null)
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
    resetIdleProgress()
    setSleeping(true)
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
              {sleeping || ambientState.name === 'hibernating'
                ? <Sun size={16} aria-hidden="true" />
                : <Moon size={16} aria-hidden="true" />}
              {sleeping || ambientState.name === 'hibernating' ? '唤醒' : '休息'}
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

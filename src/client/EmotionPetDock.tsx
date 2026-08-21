import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight, Circle, Cookie, Diamond, Gamepad2, MessageCircle, Moon, Palette, Sun,
  Triangle,
  type LucideIcon,
} from 'lucide-react'
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
// 宠物外观设置保存在浏览器本地，不写入会话或服务端配置。
const SHAPE_STORAGE_KEY = 'dsh-emotion-pet.shape'
const COLOR_STORAGE_KEY = 'dsh-emotion-pet.color'
const FOLLOW_EMOTION_STORAGE_KEY = 'dsh-emotion-pet.followEmotion'
const LOCATION_STORAGE_KEY = 'dsh-emotion-pet.location'
// 未保存颜色时沿用 Emotion Ball 的默认体色。
const DEFAULT_PET_COLOR = '#F3F0EA'
// 仅这些表情需要临时覆盖用户选择的基础颜色。
const FOLLOW_EMOTION_IDS = new Set(['21', '34'])

type PetShape = 'blob' | 'wedge' | 'gem'

interface PetShapeOption {
  readonly value: PetShape
  readonly label: string
  readonly icon: LucideIcon
}

interface PetColorOption {
  readonly value: string
  readonly label: string
}

const PET_SHAPES: readonly PetShapeOption[] = [
  { value: 'blob', label: '圆润', icon: Circle },
  { value: 'wedge', label: '三角', icon: Triangle },
  { value: 'gem', label: '宝石', icon: Diamond },
]

const PET_COLORS: readonly PetColorOption[] = [
  { value: '#F3F0EA', label: '云朵白' },
  { value: '#F2A7A0', label: '珊瑚红' },
  { value: '#F0C75E', label: '暖阳黄' },
  { value: '#78BE95', label: '薄荷绿' },
  { value: '#78A9DC', label: '晴空蓝' },
  { value: '#A995D1', label: '鸢尾紫' },
]

type TemporaryInteraction = 'happy' | 'satisfied' | 'playing' | 'waking'
type PetLocation = 'input' | 'conversation'

function isPetShape(value: string | null): value is PetShape {
  return value === 'blob' || value === 'wedge' || value === 'gem'
}

function readStoredShape(): PetShape {
  try {
    const value = window.localStorage.getItem(SHAPE_STORAGE_KEY)
    return isPetShape(value) ? value : 'blob'
  } catch {
    // 浏览器禁用本地存储时保留默认外观，不影响宠物加载。
    return 'blob'
  }
}

function readStoredColor(): string {
  try {
    const value = window.localStorage.getItem(COLOR_STORAGE_KEY)
    return value !== null && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_PET_COLOR
  } catch {
    // 浏览器禁用本地存储时使用默认体色。
    return DEFAULT_PET_COLOR
  }
}

function readStoredFollowEmotion(): boolean {
  try {
    return window.localStorage.getItem(FOLLOW_EMOTION_STORAGE_KEY) !== 'false'
  } catch {
    // 无法读取本地存储时默认保留特殊表情的原始颜色。
    return true
  }
}

function readStoredLocation(): PetLocation {
  try {
    return window.localStorage.getItem(LOCATION_STORAGE_KEY) === 'conversation'
      ? 'conversation'
      : 'input'
  } catch {
    // 无法读取本地存储时保留输入区中的默认位置。
    return 'input'
  }
}

function storeAppearance(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // 存储配额或隐私设置拒绝写入时，本次页面内选择仍然有效。
  }
}

/** 情绪宠物在输入框上方的常驻展示。 */
export function EmotionPetDock({ session }: EmotionPetDockProps) {
  const dockRef = useRef<HTMLElement>(null)
  const ballHostRef = useRef<HTMLDivElement>(null)
  const petButtonRef = useRef<HTMLButtonElement>(null)
  const inlinePetRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const appearanceButtonRef = useRef<HTMLButtonElement>(null)
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
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [runningElapsedMs, setRunningElapsedMs] = useState(0)
  const [idleElapsedMs, setIdleElapsedMs] = useState(0)
  const [expressionIndex, setExpressionIndex] = useState(0)
  const [expiredMissingKey, setExpiredMissingKey] = useState<string | null>(null)
  const [petShape, setPetShape] = useState<PetShape>(readStoredShape)
  const [petColor, setPetColor] = useState(readStoredColor)
  const [followEmotion, setFollowEmotion] = useState(readStoredFollowEmotion)
  const [petLocation, setPetLocation] = useState<PetLocation>(readStoredLocation)
  const [turnStatusHost, setTurnStatusHost] = useState<HTMLElement | null>(null)

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
  const useEmotionColor = followEmotion && FOLLOW_EMOTION_IDS.has(displayedEmotion)
  const inlineActive = petLocation === 'conversation' && turnStatusHost !== null

  useEffect(() => {
    if (petLocation !== 'conversation') {
      setTurnStatusHost(null)
      return
    }

    const conversation = dockRef.current?.closest<HTMLElement>('[data-conversation-scroll]')
    if (conversation === undefined || conversation === null) return
    const updateHost = (): void => {
      const next = conversation.querySelector<HTMLElement>('[data-chat-flow] > [role="status"]')
      setTurnStatusHost(current => current === next ? current : next)
    }
    updateHost()
    const observer = new MutationObserver(updateHost)
    observer.observe(conversation, { childList: true, subtree: true })
    return () => { observer.disconnect() }
  }, [petLocation])

  useEffect(() => {
    const host = ballHostRef.current
    if (host === null) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = window.EmotionBall.create(host, {
      emotion: displayedEmotion,
      shape: petShape,
      eyeScale: 1.08,
      gazeRange: GAZE_RANGE,
      idle: false,
      label: '情绪宠物',
      autostart: !reducedMotion,
    })
    engineRef.current = engine

    const handlePointerMove = (event: PointerEvent): void => {
      const surface = inlinePetRef.current ?? petButtonRef.current
      if (surface === null) return
      const rect = surface.getBoundingClientRect()
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
  }, [inlineActive, petShape, turnStatusHost])

  useEffect(() => {
    engineRef.current?.setTheme(useEmotionColor ? null : petColor, '#1A1A1A')
  }, [inlineActive, petColor, petShape, turnStatusHost, useEmotionColor])

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
      if (event.key !== 'Escape') return
      if (appearanceOpen) {
        setAppearanceOpen(false)
        appearanceButtonRef.current?.focus()
        return
      }
      setMenuOpen(false)
      petButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [appearanceOpen, menuOpen])

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
    setAppearanceOpen(false)
    setMenuOpen(true)
  }

  const handleShapeChange = (shape: PetShape): void => {
    setPetShape(shape)
    storeAppearance(SHAPE_STORAGE_KEY, shape)
  }

  const handleColorChange = (color: string): void => {
    setPetColor(color)
    storeAppearance(COLOR_STORAGE_KEY, color)
  }

  const handleFollowEmotionToggle = (): void => {
    setFollowEmotion(current => {
      const next = !current
      storeAppearance(FOLLOW_EMOTION_STORAGE_KEY, String(next))
      return next
    })
  }

  const handleLocationToggle = (): void => {
    setMenuOpen(false)
    setPetLocation(current => {
      const next = current === 'input' ? 'conversation' : 'input'
      storeAppearance(LOCATION_STORAGE_KEY, next)
      return next
    })
  }

  return (
    <>
      <section
        ref={dockRef}
        className={`emotionPet__dock${inlineActive ? ' emotionPet__dock--inline' : ''}`}
        data-emotion-pet
        data-pet-state={state.name}
      >
        {!inlineActive && <div className="emotionPet__row">
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
            <div className="emotionPet__menuDivider" aria-hidden="true" />
            <button type="button" role="menuitem" onClick={handleLocationToggle}>
              <MessageCircle size={16} aria-hidden="true" />
              {petLocation === 'conversation' ? '回输入区' : '随对话'}
            </button>
            <div
              className="emotionPet__submenuHost"
              role="none"
              onPointerEnter={() => { setAppearanceOpen(true) }}
              onPointerLeave={(event) => {
                if (!event.currentTarget.contains(document.activeElement)) setAppearanceOpen(false)
              }}
              onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node)
                  || !event.currentTarget.contains(event.relatedTarget)) setAppearanceOpen(false)
              }}
            >
              <button
                ref={appearanceButtonRef}
                type="button"
                className="emotionPet__submenuTrigger"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={appearanceOpen}
                onClick={() => { setAppearanceOpen(true) }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') setAppearanceOpen(true)
                }}
              >
                <Palette size={16} aria-hidden="true" />
                外观
                <ChevronRight size={14} className="emotionPet__appearanceChevron" aria-hidden="true" />
              </button>
              {appearanceOpen && (
                <div
                  className="emotionPet__appearancePanel"
                  role="menu"
                  aria-label="宠物外观"
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft') return
                    event.preventDefault()
                    setAppearanceOpen(false)
                    appearanceButtonRef.current?.focus()
                  }}
                >
                  <button
                    type="button"
                    className="emotionPet__followToggle"
                    role="menuitemcheckbox"
                    aria-checked={followEmotion}
                    onClick={handleFollowEmotionToggle}
                  >
                    跟随表情
                    <span
                      className="emotionPet__switch"
                      data-checked={followEmotion}
                      aria-hidden="true"
                    />
                  </button>
                  <div className="emotionPet__menuSection" role="group" aria-label="宠物形状">
                    <span className="emotionPet__menuLabel">形状</span>
                    <div className="emotionPet__shapeOptions">
                      {PET_SHAPES.map(option => {
                        const ShapeIcon = option.icon
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="emotionPet__shapeOption"
                            role="menuitemradio"
                            aria-checked={petShape === option.value}
                            aria-label={option.label}
                            title={option.label}
                            onClick={() => { handleShapeChange(option.value) }}
                          >
                            <ShapeIcon size={16} aria-hidden="true" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="emotionPet__menuSection" role="group" aria-label="宠物颜色">
                    <span className="emotionPet__menuLabel">颜色</span>
                    <div className="emotionPet__colorOptions">
                      {PET_COLORS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          className="emotionPet__colorOption"
                          role="menuitemradio"
                          aria-checked={petColor.toUpperCase() === option.value}
                          aria-label={option.label}
                          title={option.label}
                          style={{ backgroundColor: option.value }}
                          onClick={() => { handleColorChange(option.value) }}
                        />
                      ))}
                      <label
                        className="emotionPet__customColor"
                        data-selected={!PET_COLORS.some(option => option.value === petColor.toUpperCase())}
                        title="自定义颜色"
                      >
                        <input
                          type="color"
                          value={petColor}
                          aria-label="自定义颜色"
                          onChange={(event) => { handleColorChange(event.target.value.toUpperCase()) }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
          <div className="emotionPet__bubble" aria-live="polite" aria-atomic="true">
            <span className="emotionPet__status">
              <i className="emotionPet__dot" data-tone={state.tone} aria-hidden="true" />
              {state.label}
            </span>
            <span className="emotionPet__speech">{state.speech}</span>
          </div>
        </div>}
      </section>
      {inlineActive && createPortal(
        <span
          ref={inlinePetRef}
          className="emotionPet__inline"
          data-emotion-pet-inline
          aria-hidden="true"
        >
          <span ref={ballHostRef} className="emotionPet__ball" />
        </span>,
        turnStatusHost,
      )}
    </>
  )
}

/** 测试和外部适配器可复用的最小快照构造类型。 */
export type { PetSessionSnapshot }

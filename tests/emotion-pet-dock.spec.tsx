// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmotionPetDock } from '../src/client/EmotionPetDock.tsx'
import {
  DONE_DURATION_MS, IDLE_HIBERNATING_DURATION_MS, IDLE_SPACING_DURATION_MS,
  IDLE_TIRED_DURATION_MS, MISSING_DURATION_MS,
} from '../src/client/pet-state.ts'
import type { PetSessionSnapshot } from '../src/client/types.ts'

const setEmotion = vi.fn(() => true)
const setGaze = vi.fn()
const bounce = vi.fn()
const burst = vi.fn()
const spin = vi.fn()
const destroy = vi.fn()

function snapshot(overrides: Partial<PetSessionSnapshot> = {}): PetSessionSnapshot {
  return {
    partial: null,
    runningCalls: [],
    pending: [],
    running: false,
    lastAgentError: null,
    promptError: null,
    removed: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  })
  window.EmotionBall = {
    create: vi.fn(() => ({
      emotionId: '02',
      setEmotion,
      setGaze,
      resetGaze: vi.fn(),
      setActive: vi.fn(),
      bounce,
      burst,
      spin,
      destroy,
    })),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('EmotionPetDock', () => {
  it('点击后显示开心状态并触发弹跳', () => {
    const { container } = render(<EmotionPetDock session={snapshot()} input={{}} />)
    fireEvent.click(screen.getByRole('button', { name: '摸摸情绪宠物' }))

    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('happy')
    expect(bounce).toHaveBeenCalledOnce()
    expect(screen.getByText('收到摸摸啦，我会继续认真陪你。')).toBeTruthy()
  })

  it('使用放大的注视范围并响应全局指针移动', () => {
    render(<EmotionPetDock session={snapshot()} input={{}} />)
    expect(window.EmotionBall.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ gazeRange: { x: 48, y: 28 } }),
    )

    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    expect(setGaze).toHaveBeenCalled()
  })

  it('右键菜单支持投喂、玩耍和持续休息', () => {
    const { container } = render(<EmotionPetDock session={snapshot()} input={{}} />)
    const pet = screen.getByRole('button', { name: '摸摸情绪宠物' })

    fireEvent.contextMenu(pet)
    fireEvent.click(screen.getByRole('menuitem', { name: '投喂' }))
    expect(burst).toHaveBeenCalledWith(10)
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('satisfied')

    act(() => { vi.advanceTimersByTime(2000) })
    fireEvent.contextMenu(pet)
    fireEvent.click(screen.getByRole('menuitem', { name: '玩耍' }))
    expect(spin).toHaveBeenCalledWith(1)

    act(() => { vi.advanceTimersByTime(2000) })
    fireEvent.contextMenu(pet)
    fireEvent.click(screen.getByRole('menuitem', { name: '休息' }))
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('sleeping')

    fireEvent.contextMenu(pet)
    expect(screen.getByRole('menuitem', { name: '唤醒' })).toBeTruthy()

    fireEvent.click(pet)
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('waking')
    expect(setEmotion).toHaveBeenCalledWith('01', { auto: true })
    act(() => { vi.advanceTimersByTime(700) })
    expect(setEmotion).toHaveBeenCalledWith('05', { auto: true })
  })

  it('空闲时依次发呆、疲惫和休眠，点击后苏醒', () => {
    const { container } = render(<EmotionPetDock session={snapshot()} input={{}} />)

    act(() => { vi.advanceTimersByTime(IDLE_SPACING_DURATION_MS) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('spacing')

    act(() => { vi.advanceTimersByTime(IDLE_TIRED_DURATION_MS - IDLE_SPACING_DURATION_MS) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('tired')

    act(() => { vi.advanceTimersByTime(IDLE_HIBERNATING_DURATION_MS - IDLE_TIRED_DURATION_MS) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('hibernating')

    fireEvent.click(screen.getByRole('button', { name: '摸摸情绪宠物' }))
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('waking')
  })

  it('连续点击会生气，投喂后恢复', () => {
    const { container } = render(<EmotionPetDock session={snapshot()} input={{}} />)
    const pet = screen.getByRole('button', { name: '摸摸情绪宠物' })

    for (let index = 0; index < 5; index += 1) fireEvent.click(pet)
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('angry')

    fireEvent.contextMenu(pet)
    fireEvent.click(screen.getByRole('menuitem', { name: '投喂' }))
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('satisfied')
  })

  it('缺少信息时短暂慌张，然后等待用户补充', () => {
    const { container } = render(<EmotionPetDock session={snapshot({
      pending: [{ kind: 'question' }],
    })} input={{}} />)

    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('missing')
    act(() => { vi.advanceTimersByTime(900) })
    expect(setEmotion).toHaveBeenCalledWith('17', { auto: true })
    act(() => { vi.advanceTimersByTime(MISSING_DURATION_MS - 900) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('waiting')
  })

  it('审批和终止使用专属表情', () => {
    const { container, rerender } = render(<EmotionPetDock session={snapshot({
      pending: [{ kind: 'approval' }],
    })} input={{}} />)
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('restricted')
    expect(setEmotion).toHaveBeenCalledWith('38', { auto: true })

    rerender(<EmotionPetDock session={snapshot({ removed: true })} input={{}} />)
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('stopped')
    expect(setEmotion).toHaveBeenCalledWith('41', { auto: true })
  })

  it('运行结束后短暂庆祝，再回到待机', () => {
    const { container, rerender } = render(
      <EmotionPetDock session={snapshot({ running: true })} input={{}} />,
    )
    rerender(<EmotionPetDock session={snapshot({ running: false })} input={{}} />)

    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('done')
    act(() => { vi.advanceTimersByTime(DONE_DURATION_MS) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('idle')
  })

  it('缺少增量输出时仍从接收推进到思考、检索和编码', () => {
    const { container } = render(
      <EmotionPetDock session={snapshot({ running: true })} input={{}} />,
    )
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('receiving')

    act(() => { vi.advanceTimersByTime(2000) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('thinking')

    act(() => { vi.advanceTimersByTime(3000) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('searching')
    expect(screen.getByText('检索资料')).toBeTruthy()

    act(() => { vi.advanceTimersByTime(2700) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('busy')
    expect(screen.getByText('编码执行')).toBeTruthy()
  })

  it('同一阶段定时轮换丰富表情', () => {
    render(<EmotionPetDock session={snapshot({
      running: true,
      partial: { blocks: [{ kind: 'reasoning', text: '分析中' }] },
    })} input={{}} />)

    expect(setEmotion).toHaveBeenCalledWith('30', { auto: true })
    act(() => { vi.advanceTimersByTime(3200) })
    expect(setEmotion).toHaveBeenCalledWith('37', { auto: true })
  })

  it('卸载时销毁动画实例', () => {
    const { unmount } = render(<EmotionPetDock session={snapshot()} input={{}} />)
    unmount()
    expect(destroy).toHaveBeenCalledOnce()
  })
})

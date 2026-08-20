// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmotionPetDock } from '../src/client/EmotionPetDock.tsx'
import { DONE_DURATION_MS } from '../src/client/pet-state.ts'
import type { PetSessionSnapshot } from '../src/client/types.ts'

const setEmotion = vi.fn(() => true)
const bounce = vi.fn()
const destroy = vi.fn()

function snapshot(overrides: Partial<PetSessionSnapshot> = {}): PetSessionSnapshot {
  return {
    partial: null,
    runningCalls: [],
    pending: [],
    running: false,
    lastAgentError: null,
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
      setGaze: vi.fn(),
      resetGaze: vi.fn(),
      setActive: vi.fn(),
      bounce,
      destroy,
    })),
  }
})

afterEach(() => {
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

  it('运行结束后短暂庆祝，再回到待机', () => {
    const { container, rerender } = render(
      <EmotionPetDock session={snapshot({ running: true })} input={{}} />,
    )
    rerender(<EmotionPetDock session={snapshot({ running: false })} input={{}} />)

    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('done')
    act(() => { vi.advanceTimersByTime(DONE_DURATION_MS) })
    expect(container.querySelector('[data-emotion-pet]')?.getAttribute('data-pet-state')).toBe('idle')
  })

  it('卸载时销毁动画实例', () => {
    const { unmount } = render(<EmotionPetDock session={snapshot()} input={{}} />)
    unmount()
    expect(destroy).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it } from 'vitest'
import { derivePetState } from '../src/client/pet-state.ts'
import type { PetSessionSnapshot } from '../src/client/types.ts'

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

describe('derivePetState', () => {
  it('按错误、等待和工具调用优先级选择状态', () => {
    expect(derivePetState(snapshot({ lastAgentError: 'boom', pending: [{}] })).name).toBe('error')
    expect(derivePetState(snapshot({ pending: [{}], runningCalls: [{ name: 'bash' }] })).name).toBe('waiting')
    expect(derivePetState(snapshot({ runningCalls: [{ name: 'mcp__fastctx__read' }] })).name).toBe('searching')
    expect(derivePetState(snapshot({ runningCalls: [{ name: 'bash' }] })).name).toBe('busy')
  })

  it('区分思考、回复、接收任务和待机', () => {
    expect(derivePetState(snapshot({
      running: true,
      partial: { blocks: [{ kind: 'reasoning', text: '分析中' }] },
    })).name).toBe('thinking')
    expect(derivePetState(snapshot({
      running: true,
      partial: { blocks: [{ kind: 'reasoning', text: '分析' }, { kind: 'text', text: '答案' }] },
    })).name).toBe('replying')
    expect(derivePetState(snapshot({ running: true })).name).toBe('receiving')
    expect(derivePetState(snapshot()).name).toBe('idle')
  })
})

import { describe, expect, it } from 'vitest'
import { derivePetState, PET_PRESENTATIONS } from '../src/client/pet-state.ts'
import type { PetSessionSnapshot } from '../src/client/types.ts'

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

describe('derivePetState', () => {
  it('按错误、等待和工具调用优先级选择状态', () => {
    expect(derivePetState(snapshot({ lastAgentError: 'boom', pending: [{ kind: 'question' }] })).name).toBe('error')
    expect(derivePetState(snapshot({ pending: [{ kind: 'approval' }], runningCalls: [{ name: 'bash' }] })).name).toBe('restricted')
    expect(derivePetState(snapshot({ pending: [{ kind: 'question' }] })).name).toBe('missing')
    expect(derivePetState(snapshot({ runningCalls: [{ name: 'mcp__fastctx__read' }] })).name).toBe('searching')
    expect(derivePetState(snapshot({ runningCalls: [{ name: 'bash' }] })).name).toBe('busy')
  })

  it('区分缺失信息、停止失败和会话终止', () => {
    expect(derivePetState(snapshot({ lastAgentError: 'Missing API key' })).name).toBe('missing')
    expect(derivePetState(snapshot({ promptError: { op: 'send' } })).name).toBe('missing')
    expect(derivePetState(snapshot({ promptError: { op: 'stop' } })).name).toBe('error')
    expect(derivePetState(snapshot({ removed: true })).name).toBe('stopped')
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

  it('集成 Emotion Ball 的全部 32 个表情', () => {
    const emotions = new Set(Object.values(PET_PRESENTATIONS).flatMap(
      presentation => [presentation.emotion, ...(presentation.alternateEmotions ?? [])],
    ))
    expect([...emotions].sort()).toEqual([
      '00', '01', '02', '03', '04', '05', '06', '07',
      '10', '11', '12', '13', '14', '15', '16', '17',
      '18', '19', '20', '21', '30', '31', '32', '33',
      '34', '35', '36', '37', '38', '39', '40', '41',
    ])
  })
})

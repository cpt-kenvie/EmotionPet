import type { PetSessionSnapshot } from './types.ts'

/** 任务结束庆祝状态的展示时长。 */
export const DONE_DURATION_MS = 2400

/** 宠物可展示的 Agent 工作状态。 */
export type PetStateName =
  | 'idle'
  | 'receiving'
  | 'thinking'
  | 'searching'
  | 'busy'
  | 'replying'
  | 'waiting'
  | 'done'
  | 'error'
  | 'happy'

export interface PetPresentation {
  readonly name: PetStateName
  readonly emotion: string
  readonly label: string
  readonly speech: string
  readonly tone: 'neutral' | 'working' | 'success' | 'warning' | 'danger'
}

// 可调整文案和 Emotion Ball 表情统一放在这里，避免散落在渲染逻辑中。
export const PET_PRESENTATIONS: Readonly<Record<PetStateName, PetPresentation>> = {
  idle: {
    name: 'idle', emotion: '02', label: '随时待命', tone: 'neutral',
    speech: '说说你想完成什么，我会陪你一步步推进。',
  },
  receiving: {
    name: 'receiving', emotion: '31', label: '接收任务', tone: 'working',
    speech: '收到，我先看清上下文和目标。',
  },
  thinking: {
    name: 'thinking', emotion: '30', label: '正在思考', tone: 'working',
    speech: '我在梳理思路，马上给出清晰的方向。',
  },
  searching: {
    name: 'searching', emotion: '40', label: '查找线索', tone: 'working',
    speech: '正在项目里寻找最有用的线索。',
  },
  busy: {
    name: 'busy', emotion: '32', label: '专注工作', tone: 'working',
    speech: '关键步骤正在推进，我会及时告诉你进展。',
  },
  replying: {
    name: 'replying', emotion: '39', label: '整理回复', tone: 'working',
    speech: '结果已经成形，我正在把它说明白。',
  },
  waiting: {
    name: 'waiting', emotion: '35', label: '等你确认', tone: 'warning',
    speech: '这里需要你的决定，确认后我就继续。',
  },
  done: {
    name: 'done', emotion: '33', label: '任务完成', tone: 'success',
    speech: '完成了！你可以检查结果，或者交给我下一件事。',
  },
  error: {
    name: 'error', emotion: '34', label: '遇到问题', tone: 'danger',
    speech: '这里遇到了问题，我们一起看看怎么处理。',
  },
  happy: {
    name: 'happy', emotion: '10', label: '心情很好', tone: 'success',
    speech: '收到摸摸啦，我会继续认真陪你。',
  },
}

// 文件与网络读取类工具使用检索表情，其余工具调用使用专注工作表情。
const SEARCH_TOOL_PATTERN = /(?:^|[_:/.-])(web|search|fetch|grep|glob|read|find|browse|lookup)(?:$|[_:/.-])/i

/** 根据当前会话快照计算宠物的实时工作状态。 */
export function derivePetState(session: PetSessionSnapshot): PetPresentation {
  if (session.lastAgentError !== null) return PET_PRESENTATIONS.error
  if (session.pending.length > 0) return PET_PRESENTATIONS.waiting

  if (session.runningCalls.length > 0) {
    const searching = session.runningCalls.some(call => SEARCH_TOOL_PATTERN.test(call.name))
    return searching ? PET_PRESENTATIONS.searching : PET_PRESENTATIONS.busy
  }

  if (session.partial !== null) {
    const hasText = session.partial.blocks.some(
      block => block.kind === 'text' && (block.text?.trim().length ?? 0) > 0,
    )
    if (hasText) return PET_PRESENTATIONS.replying

    const hasReasoning = session.partial.blocks.some(
      block => block.kind === 'reasoning' && (block.text?.trim().length ?? 0) > 0,
    )
    return hasReasoning ? PET_PRESENTATIONS.thinking : PET_PRESENTATIONS.replying
  }

  if (session.running) return PET_PRESENTATIONS.receiving
  return PET_PRESENTATIONS.idle
}

import type { PetSessionSnapshot } from './types.ts'

/** 任务结束庆祝状态的展示时长。 */
export const DONE_DURATION_MS = 2400

/** 投喂、玩耍和摸摸等临时互动的展示时长。 */
export const INTERACTION_DURATION_MS = 2000

/** 缺少信息时先展示失落或慌张，再进入等待或错误状态。 */
export const MISSING_DURATION_MS = 2600

/** 无任务后进入发呆状态的等待时长。 */
export const IDLE_SPACING_DURATION_MS = 15_000

/** 无任务后进入疲惫状态的等待时长。 */
export const IDLE_TIRED_DURATION_MS = 45_000

/** 无任务后进入自动休眠状态的等待时长。 */
export const IDLE_HIBERNATING_DURATION_MS = 90_000

/** 宠物可展示的 Agent 工作状态。 */
export type PetStateName =
  | 'idle'
  | 'spacing'
  | 'tired'
  | 'hibernating'
  | 'waking'
  | 'receiving'
  | 'thinking'
  | 'searching'
  | 'busy'
  | 'replying'
  | 'waiting'
  | 'done'
  | 'error'
  | 'missing'
  | 'restricted'
  | 'stopped'
  | 'angry'
  | 'happy'
  | 'satisfied'
  | 'playing'
  | 'sleeping'

export interface PetPresentation {
  readonly name: PetStateName
  readonly emotion: string
  readonly alternateEmotions?: readonly string[]
  readonly label: string
  readonly speech: string
  readonly tone: 'neutral' | 'working' | 'success' | 'warning' | 'danger'
}

// 可调整文案和 Emotion Ball 表情统一放在这里，避免散落在渲染逻辑中。
export const PET_PRESENTATIONS: Readonly<Record<PetStateName, PetPresentation>> = {
  idle: {
    name: 'idle', emotion: '02', alternateEmotions: ['02', '03', '07'], label: '随时待命', tone: 'neutral',
    speech: '说说你想完成什么，我会陪你一步步推进。',
  },
  spacing: {
    name: 'spacing', emotion: '04', label: '正在发呆', tone: 'neutral',
    speech: '暂时没有新任务，我在这里安静待着。',
  },
  tired: {
    name: 'tired', emotion: '15', label: '有点疲惫', tone: 'neutral',
    speech: '等得有点困了，有新任务随时叫我。',
  },
  hibernating: {
    name: 'hibernating', emotion: '06', label: '进入休眠', tone: 'neutral',
    speech: '我进入轻度休眠，点一下就能叫醒我。',
  },
  waking: {
    name: 'waking', emotion: '01', alternateEmotions: ['01', '05'], label: '正在苏醒', tone: 'success',
    speech: '醒来啦，我已经准备好了。',
  },
  receiving: {
    name: 'receiving', emotion: '31', alternateEmotions: ['31', '11', '20', '13', '14'], label: '接收任务', tone: 'working',
    speech: '收到，我先看清上下文和目标。',
  },
  thinking: {
    name: 'thinking', emotion: '30', alternateEmotions: ['30', '37'], label: '正在思考', tone: 'working',
    speech: '我在梳理思路，马上给出清晰的方向。',
  },
  searching: {
    name: 'searching', emotion: '40', alternateEmotions: ['40', '36'], label: '检索资料', tone: 'working',
    speech: '正在项目里寻找最有用的线索。',
  },
  busy: {
    name: 'busy', emotion: '32', alternateEmotions: ['32', '16'], label: '编码执行', tone: 'working',
    speech: '正在实现关键步骤，我会及时告诉你进展。',
  },
  replying: {
    name: 'replying', emotion: '39', alternateEmotions: ['39', '37'], label: '整理回复', tone: 'working',
    speech: '结果已经成形，我正在把它说明白。',
  },
  waiting: {
    name: 'waiting', emotion: '35', alternateEmotions: ['35', '03'], label: '等你确认', tone: 'warning',
    speech: '这里需要你的决定，确认后我就继续。',
  },
  done: {
    name: 'done', emotion: '33', label: '任务完成', tone: 'success',
    speech: '完成了！你可以检查结果，或者交给我下一件事。',
  },
  error: {
    name: 'error', emotion: '34', alternateEmotions: ['34', '18'], label: '遇到问题', tone: 'danger',
    speech: '这里遇到了问题，我们一起看看怎么处理。',
  },
  missing: {
    name: 'missing', emotion: '12', alternateEmotions: ['12', '17'], label: '还缺少信息', tone: 'warning',
    speech: '好像还少了必要信息，补充一下我就能继续。',
  },
  restricted: {
    name: 'restricted', emotion: '38', label: '等待审核', tone: 'warning',
    speech: '这一步需要你的审核，通过后我再继续。',
  },
  stopped: {
    name: 'stopped', emotion: '41', label: '任务已终止', tone: 'danger',
    speech: '这个会话已经终止，我不会再继续执行。',
  },
  angry: {
    name: 'angry', emotion: '21', label: '有点生气', tone: 'danger',
    speech: '别一直戳我啦，投喂或陪我玩一下就和好。',
  },
  happy: {
    name: 'happy', emotion: '10', label: '心情很好', tone: 'success',
    speech: '收到摸摸啦，我会继续认真陪你。',
  },
  satisfied: {
    name: 'satisfied', emotion: '19', label: '补充能量', tone: 'success',
    speech: '谢谢投喂，能量已经补充好了。',
  },
  playing: {
    name: 'playing', emotion: '10', label: '玩耍一下', tone: 'success',
    speech: '转一圈放松一下，回来继续保持专注。',
  },
  sleeping: {
    name: 'sleeping', emotion: '00', label: '正在休息', tone: 'neutral',
    speech: '我先安静休息，需要时再把我叫醒。',
  },
}

// 文件与网络读取类工具使用检索表情，其余工具调用使用专注工作表情。
const SEARCH_TOOL_PATTERN = /(?:^|[_:/.-])(web|search|fetch|grep|glob|read|find|browse|lookup)(?:$|[_:/.-])/i

// 仅识别明确表示输入、凭据或配置缺失的错误，普通执行错误仍使用出错表情。
const MISSING_INPUT_PATTERN = /(?:api[\s_-]*key|access[\s_-]*token|credential|password|secret|missing|required|not set|未(?:提供|配置|设置)|缺少|密码|密钥|凭据|令牌)/i

/** 根据当前会话快照计算宠物的实时工作状态。 */
export function derivePetState(session: PetSessionSnapshot): PetPresentation {
  if (session.removed) return PET_PRESENTATIONS.stopped
  if (session.lastAgentError !== null) {
    return MISSING_INPUT_PATTERN.test(session.lastAgentError)
      ? PET_PRESENTATIONS.missing
      : PET_PRESENTATIONS.error
  }
  if (session.promptError !== null) {
    return session.promptError.op === 'send' ? PET_PRESENTATIONS.missing : PET_PRESENTATIONS.error
  }
  if (session.pending.some(item => item.kind === 'approval')) return PET_PRESENTATIONS.restricted
  if (session.pending.some(item => item.kind === 'question')) return PET_PRESENTATIONS.missing
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

import './vendor/rings.js'
import './vendor/emotions.js'
import './vendor/ball.js'
import './vendor/engine.js'
import { EmotionPetDock } from './EmotionPetDock.tsx'
import type { EmotionPetClientContext } from './types.ts'

/** 浏览器侧只依赖槽位服务；UI Conversation 的装配顺序由 package.json 声明。 */
export const inject = ['slots']

/** 把宠物注册到输入框正上方，并排在其他输入区信息之后。 */
export function apply(ctx: EmotionPetClientContext): void {
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'emotion-pet',
    order: 100,
  }, EmotionPetDock))
}

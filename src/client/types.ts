/** 宠物只读取的增量回复块字段。 */
export interface PetAssistantBlock {
  readonly kind: string
  readonly text?: string
}

/** 宠物只读取的运行中工具字段。 */
export interface PetRunningCall {
  readonly name: string
}

/** 从 ConversationSnapshot 收窄出的最小只读数据。 */
export interface PetSessionSnapshot {
  readonly partial: { readonly blocks: readonly PetAssistantBlock[] } | null
  readonly runningCalls: readonly PetRunningCall[]
  readonly pending: readonly unknown[]
  readonly running: boolean
  readonly lastAgentError: string | null
}

/** conversation.input.dock 传入的 owner 数据。 */
export interface EmotionPetDockProps {
  readonly session: PetSessionSnapshot
  readonly input: unknown
}

/** Harness 槽位服务在本插件中使用的最小接口。 */
export interface EmotionPetClientContext {
  readonly slots: {
    inject(name: 'conversation.input.dock', setup: () => (() => void)): void
    register(
      options: {
        readonly name: 'conversation.input.dock'
        readonly id: string
        readonly order: number
      },
      component: (props: EmotionPetDockProps) => React.ReactNode,
    ): () => void
  }
}

/**
 * 情绪宠物的 Node 侧入口。插件行为全部位于浏览器侧，此入口用于让 Loader
 * 挂载包并发现 package.json 中声明的 dsh.client 产物。
 */

/** Harness 主机侧无需注册额外服务。 */
export function apply(): void {}

# Emotion Pet for DeepSeek Harness

一个住在 DeepSeek Harness Web 输入框左上方的 Emotion Ball 宠物。它根据当前 Agent 状态自动切换接收、思考、检索、编码、回复、等待确认、完成和错误表情，并在同一阶段轮换兼容表情；鼠标移动会引导视线，点击宠物会触发开心弹跳，右键菜单可投喂、玩耍、休息或唤醒。

## 安装

先在插件目录完成构建：

```bash
cd C:/Users/admin/Desktop/emotionPet
pnpm install
pnpm run verify
```

将插件安装到要使用的 Harness Web Profile，例如默认 `web`：

```bash
cd D:/Projects/deepseek-harness
pnpm dsh plugin --profile web add "C:/Users/admin/Desktop/emotionPet"
```

重启该 Profile 后生效：

```bash
pnpm dsh --profile web --no-open
```

终端打印 `dsh web:` 地址后，在浏览器中打开即可。插件位于会话输入框正上方，空白的新会话也会显示。

## 更新与卸载

修改源码后重新运行 `pnpm run verify`，然后重启 Harness Web。若安装方式生成的是副本而不是本地链接，可移除后重新添加：

```bash
pnpm dsh plugin --profile web remove dsh-emotion-pet
pnpm dsh plugin --profile web add "C:/Users/admin/Desktop/emotionPet"
```

仅卸载：

```bash
pnpm dsh plugin --profile web remove dsh-emotion-pet
```

## 验证命令

```bash
pnpm run check
pnpm run test
pnpm run build
pnpm run verify
pnpm run pack:plugin
```

## 许可

Emotion Ball 原始引擎和表情数据并非 MIT 许可。本插件保留原项目的 `LICENSE`、`LICENSE-COMMERCIAL.md` 与署名，仅可用于个人学习、研究和非商业技术交流。商业使用前必须联系原作者 `1251579308@qq.com` 取得授权。

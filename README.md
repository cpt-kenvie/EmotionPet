# Emotion Pet for DeepSeek Harness

一个住在 DeepSeek Harness Web 输入框左上方的 Emotion Ball 宠物。它根据当前 Agent 状态自动切换接收、思考、检索、编码、回复、等待确认、完成和错误表情，并在同一阶段轮换兼容表情；鼠标移动会引导视线，点击宠物会触发开心弹跳，右键菜单可投喂、玩耍、休息或唤醒。

## 安装

### 用户从 npm 安装

用户不需要这个项目的源码。安装已发布的 npm 包即可：

```bash
dsh plugin --profile web add dsh-emotion-pet
dsh --profile web
```

升级到最新版本：

```bash
dsh plugin --profile web update dsh-emotion-pet --latest
dsh --profile web
```

如果本机使用的是源码启动方式，把 `dsh` 替换为 `pnpm dsh`。

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

### 发布者流程

需要一个 npm 账号。首次发布前执行：

```bash
cd C:/Users/admin/Desktop/emotionPet
npm login
npm whoami
pnpm run verify
npm publish --access public
```

以后修改代码时先递增版本号，再发布：

```bash
npm version patch --no-git-tag-version
npm publish --access public
```

`prepublishOnly` 会在发布前自动执行类型检查、测试和构建；npm 包只包含构建后的 `lib/`、Bundle patch、README 和许可证，不包含源码或 `node_modules/`。

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

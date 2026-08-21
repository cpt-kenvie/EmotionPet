# Emotion Pet for DeepSeek Harness

[![Emotion Pet 效果预览](https://raw.githubusercontent.com/cpt-kenvie/EmotionPet/main/assets/emotion-pet-demo.gif)](https://github.com/cpt-kenvie/EmotionPet/blob/main/assets/emotion-pet-demo.mp4)

> 点击预览可打开完整效果视频。

Emotion Pet 是一个陪伴 DeepSeek Harness Web 会话的动态宠物插件，可停留在输入框左上方，也可缩小后跟随对话运行状态。它完整集成了 Emotion Ball 的 32 个表情，会根据 Agent 当前状态展示接收任务、思考、检索、编码、回复、等待确认、完成和错误等表情，并通过视线、弹跳、自旋和彩带等动画陪伴任务过程。

> 表情来源：[sam70361/emotion-ball](https://github.com/sam70361/emotion-ball)

本插件采用了 Emotion Ball 的 SVG 表情、表情配置和动画引擎，并针对 DeepSeek Harness 的会话状态与输入区域进行了集成。

## 功能

- 根据 Agent 状态自动切换接收、思考、检索、编码、回复、等待、完成和错误表情
- 新任务开始时随机轮换接收、疑惑、困惑、惊讶和害羞表情
- 缺少信息时短暂失落或慌张；等待审批、会话终止时展示对应状态
- 长时间没有任务时依次进入发呆、疲惫和休眠，点击宠物即可苏醒
- 同一工作阶段自动轮换兼容表情，避免长时间保持同一姿态
- 输入区大球的眼睛会跟随鼠标位置，并保留眨眼、呼吸、巡视等待机动画
- 左键点击宠物进行摸摸互动
- 右键打开互动菜单，可选择投喂、玩耍、休息或唤醒
- 右键菜单可切换圆润、三角和宝石形状，并选择预设或自定义颜色
- “随对话”提供持久化开关，启用后在任务运行时缩成小球跟随 `Deep diving...` 状态行
- 对话内小球不跟随鼠标，会按接收、思考、检索、编码和回复等阶段展示表情与忙碌动画
- 任务结束后小球自动返回输入区，不影响下一次互动或菜单操作
- “关于”二级菜单提供插件简介和 GitHub 开源地址
- 休息状态会在新任务开始时自动结束
- 支持明暗主题、窄屏布局、键盘菜单和减少动态效果设置

## 使用前提

- 已安装 DeepSeek Harness，或已安装 [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop)
- 浏览器版可以在终端中使用 `dsh` 命令；桌面版可以从系统托盘打开 **Open DSH Terminal**
- 使用包含 Web 界面的 Profile，例如默认的 `web`

## 在 DeepSeek Harness Web 中使用

将插件安装到默认 Web Profile：

```bash
dsh plugin --profile web add dsh-emotion-pet
```

启动 DeepSeek Harness Web：

```bash
dsh --profile web
```

终端显示 `dsh web:` 地址后，在浏览器中打开该地址。宠物会出现在会话输入框正上方。

## 在 DSH Desktop 中使用

[DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 的 Electron 窗口加载的是本机 DeepSeek Harness Web 界面，并沿用相同的插件系统，因此 Emotion Pet 不需要桌面端专用版本。当前插件可在 Desktop 的兼容模式和高级模式中使用。

推荐从 DSH Desktop 系统托盘选择 **Open DSH Terminal**。该终端会显示当前激活的 Profile，以下命令默认安装到这个 Profile：

```bash
dsh plugin add dsh-emotion-pet
```

如果电脑已经另行安装了 `dsh`，也可以在普通系统终端中显式指定 Desktop Profile：

```bash
dsh plugin --profile desktop add dsh-emotion-pet
```

如果托盘中选择的是其他自定义 Profile，请将 `desktop` 替换成终端欢迎信息中显示的实际名称。各 Profile 的插件不会自动同步，安装到 `web` Profile 不代表已经安装到 Desktop 当前使用的 Profile。

安装、更新或移除插件后，需要从托盘选择 **退出**，再重新启动 DSH Desktop。仅关闭窗口通常只是把应用隐藏到托盘，不会重新加载插件。

Emotion Pet 的形状、颜色、“跟随表情”和“随对话”设置保存在浏览器 `localStorage` 中。Desktop 默认使用随机本地端口，重启后 origin 可能变化；如需稳定保留这些设置，建议在 DSH Desktop 设置中配置一个未占用的固定端口：

```yaml
dsh-desktop:
  port: 43189
```

端口可以替换为其他 `1` 到 `65535` 之间的未占用端口。修改端口后 Desktop 会重启，服务仍只监听本机 `127.0.0.1`。

## 互动方式

- **移动鼠标**：输入区大球的视线会跟随指针，对话内小球专注展示任务状态
- **左键点击宠物**：摸摸宠物并触发开心弹跳
- **连续快速点击**：宠物会生气；投喂或玩耍后恢复，不会影响任务输入和发送
- **右键点击宠物**：打开投喂、玩耍和休息菜单
- **形状和颜色**：在右键菜单底部切换外观，选择会保存在当前浏览器
- **随对话**：任务运行时缩小到 `Deep diving...` 左侧，专注展示会话状态且不跟随鼠标，任务结束后自动回到输入区
- **关于**：悬停后查看插件简介，并可在新标签页打开 GitHub 开源主页
- **Shift + F10**：使用键盘打开宠物菜单
- **投喂**：补充能量并触发彩带效果
- **玩耍**：触发旋转和开心表情
- **休息**：保持睡眠状态，点击宠物或右键选择唤醒；开始新任务时也会自动醒来

## 更新

更新到 npm 上的最新版本：

```bash
dsh plugin --profile web update dsh-emotion-pet --latest
```

在 DSH Desktop 内置终端中，可更新当前激活 Profile：

```bash
dsh plugin update dsh-emotion-pet --latest
```

更新后重启 Web Profile，并在浏览器中刷新页面：

```bash
dsh web
```

如果浏览器仍显示旧版本，可使用 `Ctrl + F5` 强制刷新。

## 卸载

```bash
dsh plugin --profile web remove dsh-emotion-pet
```

在 DSH Desktop 内置终端中，可从当前激活 Profile 移除：

```bash
dsh plugin remove dsh-emotion-pet
```

重启对应 Profile 后，插件会从 Web 界面移除。

## 常见问题

### 安装后没有看到宠物

确认插件已经加入当前 Profile：

```bash
dsh --profile web --dump-config
```

输出中应包含 `dsh-emotion-pet`。然后重启 Profile，并强制刷新浏览器页面。

在 DSH Desktop 中，请先确认托盘当前选择的 Profile 与安装目标一致，并从托盘完整退出后重新启动。若命令行找不到 `dsh`，应使用托盘中的 **Open DSH Terminal**，因为 Desktop 的私有命令不会写入系统全局 `PATH`。

### 页面地址暂时无法访问

首次冷启动可能需要一些时间。保持启动命令所在的终端窗口开启，等待服务完成初始化后再次刷新终端显示的 `dsh web:` 地址。

## 表情来源与许可

本插件的表情、表情配置数据和 SVG 动画引擎来自 [sam70361/emotion-ball](https://github.com/sam70361/emotion-ball)，原项目版权归 `sam70361` 所有。

Emotion Ball 使用仅供个人学习、研究和非商业技术交流的许可，并非 MIT 许可。本插件保留了原项目的 `LICENSE`、`LICENSE-COMMERCIAL.md` 和版权声明。商业使用前必须联系原作者取得商业授权，具体条款以随包提供的许可文件和原项目说明为准。

## 社区

<a href="https://linux.do/"><img src="assets/linux-do-logo.svg" alt="LinuxDo" width="24" height="24" align="center"> LinuxDo</a>

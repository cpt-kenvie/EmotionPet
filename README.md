# Emotion Pet for DeepSeek Harness

[![Emotion Pet 效果预览](https://raw.githubusercontent.com/cpt-kenvie/EmotionPet/main/assets/emotion-pet-demo.gif)](https://github.com/cpt-kenvie/EmotionPet/blob/main/assets/emotion-pet-demo.mp4)

> 点击预览可打开完整效果视频。

Emotion Pet 是一个住在 DeepSeek Harness Web 输入框左上方的动态宠物插件。它完整集成了 Emotion Ball 的 32 个表情，会根据 Agent 当前状态展示接收任务、思考、检索、编码、回复、等待确认、完成和错误等表情，并通过视线、弹跳、自旋和彩带等动画陪伴任务过程。

> 表情来源：[sam70361/emotion-ball](https://github.com/sam70361/emotion-ball)

本插件采用了 Emotion Ball 的 SVG 表情、表情配置和动画引擎，并针对 DeepSeek Harness 的会话状态与输入区域进行了集成。

## 功能

- 根据 Agent 状态自动切换接收、思考、检索、编码、回复、等待、完成和错误表情
- 新任务开始时随机轮换接收、疑惑、困惑、惊讶和害羞表情
- 缺少信息时短暂失落或慌张；等待审批、会话终止时展示对应状态
- 长时间没有任务时依次进入发呆、疲惫和休眠，点击宠物即可苏醒
- 同一工作阶段自动轮换兼容表情，避免长时间保持同一姿态
- 眼睛跟随鼠标位置，并保留眨眼、呼吸、巡视等待机动画
- 左键点击宠物进行摸摸互动
- 右键打开互动菜单，可选择投喂、玩耍、休息或唤醒
- 右键菜单可切换圆润、三角和宝石形状，并选择预设或自定义颜色
- 休息状态会在新任务开始时自动结束
- 支持明暗主题、窄屏布局、键盘菜单和减少动态效果设置

## 使用前提

- 已安装 DeepSeek Harness
- 可以在终端中使用 `dsh` 命令
- 使用包含 Web 界面的 Profile，例如默认的 `web`

## 安装

将插件安装到默认 Web Profile：

```bash
dsh plugin --profile web add dsh-emotion-pet
```

启动 DeepSeek Harness Web：

```bash
dsh --profile web
```

终端显示 `dsh web:` 地址后，在浏览器中打开该地址。宠物会出现在会话输入框正上方。

## 互动方式

- **移动鼠标**：宠物视线会跟随指针
- **左键点击宠物**：摸摸宠物并触发开心弹跳
- **连续快速点击**：宠物会生气；投喂或玩耍后恢复，不会影响任务输入和发送
- **右键点击宠物**：打开投喂、玩耍和休息菜单
- **形状和颜色**：在右键菜单底部切换外观，选择会保存在当前浏览器
- **Shift + F10**：使用键盘打开宠物菜单
- **投喂**：补充能量并触发彩带效果
- **玩耍**：触发旋转和开心表情
- **休息**：保持睡眠状态，点击宠物或右键选择唤醒；开始新任务时也会自动醒来

## 更新

更新到 npm 上的最新版本：

```bash
dsh plugin --profile web update dsh-emotion-pet --latest
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

重启对应 Profile 后，插件会从 Web 界面移除。

## 常见问题

### 安装后没有看到宠物

确认插件已经加入当前 Profile：

```bash
dsh --profile web --dump-config
```

输出中应包含 `dsh-emotion-pet`。然后重启 Profile，并强制刷新浏览器页面。

### 页面地址暂时无法访问

首次冷启动可能需要一些时间。保持启动命令所在的终端窗口开启，等待服务完成初始化后再次刷新终端显示的 `dsh web:` 地址。

## 表情来源与许可

本插件的表情、表情配置数据和 SVG 动画引擎来自 [sam70361/emotion-ball](https://github.com/sam70361/emotion-ball)，原项目版权归 `sam70361` 所有。

Emotion Ball 使用仅供个人学习、研究和非商业技术交流的许可，并非 MIT 许可。本插件保留了原项目的 `LICENSE`、`LICENSE-COMMERCIAL.md` 和版权声明。商业使用前必须联系原作者取得商业授权，具体条款以随包提供的许可文件和原项目说明为准。

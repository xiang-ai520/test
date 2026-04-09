# 实时直播 + 视频通话 + 本地多模态 AI H5 应用总览

## 项目目标
构建一个运行在手机浏览器中的 H5 应用，支持：

- 局域网内实时视频通话
- 局域网内直播
- 与本地部署的多模态大模型进行视频/语音/文本交互
- 所有核心服务都运行在你自己的电脑上
- 不依赖第三方云 API

## 当前约束
- 前端框架：**React + Vite**
- 先做：**局域网版本**
- 开发节奏：**按 Phase 顺序执行，当前阶段验证通过后再进入下一阶段**
- AI 与语音：**当前为 mock 协议与占位实现**，真实模型 / STT / TTS 在后续替换适配器即可

## 总体架构

```text
手机 H5 浏览器
  ├─ React + Vite 前端
  ├─ WebRTC：1v1 实时音视频
  ├─ WebSocket：信令 / AI 会话
  └─ HTTP：页面与静态资源

本地电脑
  ├─ signaling：Node.js WebSocket 信令服务（1v1 + 直播信令）
  ├─ media：SRS 配置与说明（`app/media`，直播推拉流）
  ├─ ai-gateway：Node.js WebSocket AI 网关（文本 / 图像 / 语音协议 + mock 流式与 mock STT/TTS）
  └─ （后续）真实 model runtime、Whisper 类 STT、本地 TTS 服务，通过适配器接入网关
```

## 模块职责

### frontend
负责：
- 房间加入/离开
- 摄像头与麦克风采集
- 视频通话页面
- 直播页面
- AI 视频/语音对话页面
- 与信令服务、AI 网关通信

### signaling
负责：
- 房间管理
- 用户进出通知
- WebRTC 的 offer / answer / ICE candidate 转发
- 心跳与断线清理

### media
负责：
- 主播推流
- 观众拉流
- 直播状态管理
- 后续低延迟直播支持

### ai-gateway
负责：
- 接收文本、图像帧（base64）、整段录音（base64）等输入
- 会话内存状态（如最近图像元信息）
- 流式输出文本类 `response.delta` / `response.done`
- Phase 4：mock STT（`stt.result`）→ mock 文本回复 → mock TTS（`response.audio`，WAV）
- 屏蔽不同本地模型 / STT / TTS 实现差异（适配器位于 `app/ai-gateway/src/adapters/` 等）

## Phase 路线图

### Phase 1
局域网 1v1 视频通话基础版

### Phase 2
局域网直播能力

### Phase 3
本地 AI 文本/视觉会话骨架

### Phase 4
本地语音链路

### Phase 5
视频理解增强，接近“全模态视频通话”

### Phase 6
外网扩展与生产化增强

## 每个阶段的统一流程
1. 设计与实现当前阶段。
2. 提供验证清单。
3. 你验证当前阶段是否通过。
4. 只有当前阶段确认 OK，才进入下一阶段。

## 为什么这样拆分
因为“直播 + 视频通话 + 多模态 AI”是一个跨度很大的系统，一次性全部做完，调试成本会非常高。

先打通最小闭环：
- 先通话
- 再直播
- 再接 AI
- 再接语音
- 再增强视频理解

这样每一步都能明确定位问题，成功率更高。

## 代码与文档目录

```text
learn/
  docs/
    overview.md
    environment.md
    deployment.md
    phase-1.md
    phase-2.md
    phase-3.md
    phase-4.md
    phase-5.md
    phase-1-verification.md
    phase-2-verification.md
    phase-3-verification.md
    phase-4-verification.md
    phase-5-verification.md
    live-interaction-mock.md
  app/
    frontend/      # React + Vite，含 /room、/live/*、/ai
    signaling/     # WebSocket 信令（含直播礼物/连麦 mock）
    media/         # SRS 配置与说明
    ai-gateway/    # AI WebSocket 网关（Phase 3–5 mock）
```

说明：`shared/` 目录未单独建立；前后端协议以 `docs/phase-3.md`、`docs/phase-4.md`、`docs/phase-5.md` 及 `docs/live-interaction-mock.md` 等为参考。

## 当前实现状态（摘要）

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1 | 已实现 | 1v1 通话，`/room/:roomId` |
| Phase 2 | 已实现 | SRS 直播，`/live/host|audience/:roomId` |
| Phase 3 | 已实现 | `/ai`，文本 + 截图，`ai-gateway` mock 流式 |
| Phase 4 | 已实现 | 同页语音：录音上传 → mock STT → mock 文本 → mock TTS 播放 |
| Phase 5 | 已实现 | `/ai` 截帧来源 + 网关「画面上下文」拼入文本/语音 mock |
| 直播互动 mock | 已实现 | 礼物广播、连麦申请/同意（无第二路 SRS），见 `docs/live-interaction-mock.md` |
| Phase 6+ | 未实现 | 外网与生产化等，见 `plan.md` |

详细验证步骤见各阶段的 `phase-*-verification.md` 与 **`docs/live-interaction-mock.md`**。

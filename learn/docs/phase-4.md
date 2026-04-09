# Phase 4：本地语音链路（工程骨架）

## 阶段目标

在 Phase 3 文本 / 图像协议之上，打通 **人机语音闭环** 的工程路径：

- 前端采集麦克风音频并上传
- 网关侧 **STT（当前 mock）** → **文本回复（当前与 Phase 3 相同 mock 流式）** → **TTS（当前 mock，返回可播放 WAV）**
- 前端播放 AI 返回音频

本阶段 **不强制** 安装 Whisper、本地 TTS 或真实大模型；通过适配器替换即可演进。

## 核心思路

- **控制面**：仍使用与 Phase 3 同一 WebSocket 连接与 `sessionId`。
- **数据面**：语音以 **整段录音** base64 上传（JSON），避免在本阶段引入二进制帧协议复杂度。
- **适配器**：`ai-gateway` 内 `adapters/stt-adapter.js`、`adapters/tts-adapter.js` 为占位实现，后续可换为真实服务。

## 语音流水线（服务端顺序）

对单条 **`input.audio`** 消息，网关依次：

1. 校验 payload（非空、长度上限约 **12MB** base64 字符，超限返回 `response.error`）。
2. 发送 **`stt.result`**（mock 转写文本）。
3. 发送 **`response.delta` … `response.done`**（mock「模型」流式回复，逻辑同 Phase 3 文本 mock）。
4. 发送 **`response.audio`**（`mimeType: audio/wav`，`data` 为 base64）。

处理期间与其它输入类型一样占用连接级 **busy** 互斥，并发第二条请求会收到 `response.error: busy`。

## 协议补充（在 Phase 3 之上）

### input.audio（客户端 → 网关）

```json
{
  "type": "input.audio",
  "sessionId": "ai-session-001",
  "mimeType": "audio/webm",
  "data": "base64..."
}
```

说明：`mimeType` 与浏览器 `MediaRecorder` 实际编码一致（常见为 `audio/webm` 或带 codecs 参数）。

### stt.result（网关 → 客户端）

```json
{
  "type": "stt.result",
  "sessionId": "ai-session-001",
  "text": "转写后的文本"
}
```

### response.audio（网关 → 客户端）

```json
{
  "type": "response.audio",
  "sessionId": "ai-session-001",
  "mimeType": "audio/wav",
  "data": "base64..."
}
```

### 仍使用的 Phase 3 消息

- `session.start`、`response.delta`、`response.done`、`response.error` 语义不变。

## 前端行为摘要

- 路由仍为 **`/ai`**，与 Phase 3 共用 **`useLocalMedia`** 的 **`MediaStream`**（含麦克风），**`useVoiceRecorder`** 使用 `MediaRecorder` 录制音频轨。
- **`useAiGateway`**：新增 **`sendAudio(blob)`**；处理 **`stt.result`**（展示为「转写」样式气泡）、**`response.audio`**（`Audio` 播放）；**`voiceBusy`** 在发送语音后至播放结束或出错期间为真。

## 对话状态（产品侧）

页面文案侧体现：**空闲 → 录音中 → 识别/推理/合成中 → 播放**。细粒度状态机可在前端继续细化，不额外增加强制协议字段。

## 代码实现对照（仓库现状）

| 模块 | 路径 | 说明 |
|------|------|------|
| 语音流水线 | `ai-gateway/src/voice-pipeline.js` | STT mock → `streamTextMock` → TTS mock |
| STT 适配器 | `ai-gateway/src/adapters/stt-adapter.js` | `transcribeMock` |
| TTS 适配器 | `ai-gateway/src/adapters/tts-adapter.js` | `synthesizeMockWavBase64`（短 WAV） |
| 协议扩展 | `ai-gateway/src/protocol.js` | 含 `input.audio`、`stt.result`、`response.audio` |
| 网关分发 | `ai-gateway/src/server.js` | `input.audio` 分支 |
| 前端协议 | `frontend/src/lib/aiProtocol.js` | 与网关对齐 |
| 录音 Hook | `frontend/src/hooks/useVoiceRecorder.js` | `MediaRecorder` |
| 网关 Hook | `frontend/src/hooks/useAiGateway.js` | `sendAudio`、STT/TTS 消息与播放 |

## 验证清单

1. 前端能录音并上传（停止录音后自动发送）。
2. 网关返回 mock **`stt.result`**，前端可见转写内容。
3. 随后仍有 mock 文本流式回复。
4. 最后浏览器能播放返回的 **WAV**（或给出可理解的播放错误提示，如浏览器策略限制）。

详细操作见 **`docs/phase-4-verification.md`**。

## 通过门禁

语音闭环 mock 跑通后，可进入 Phase 5（视频理解增强与多模态上下文），见 **`plan.md`**。

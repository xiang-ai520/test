# Phase 5：视频理解增强（工程与 mock 上下文）

## 阶段目标

在 Phase 3–4 已具备的 **文本 / 截帧 / 语音** 链路上，让网关侧能 **记住近期画面截帧节奏**，并在 **文本回复与语音后的文本流** 中拼接 **「画面上下文」** 说明（仍为 mock，非真实视觉模型）。

与 `plan.md` 对齐的验收思路：

1. **定时截帧**：`input.image` 带 `source: "timer"`，由前端定时器触发。
2. **事件截帧**：同一字段 `source: "event"`，由独立按钮触发。
3. **手动截帧**：`source: "manual"`（默认）。
4. **联合回答**：在已有截帧历史时，`input.text` 与 **语音流水线中的 mock 流式回复** 会附带 `getVisionContextLine()` 生成的说明句。

## 协议补充

### input.image 可选字段 `source`

```json
{
  "type": "input.image",
  "sessionId": "ai-session-001",
  "mimeType": "image/jpeg",
  "data": "base64...",
  "source": "timer"
}
```

取值建议：`timer` | `manual` | `event`（其它字符串按原样记入历史，mock 文案中显示原始值）。

### 服务端行为（摘要）

- `SessionStore` 为每个会话维护 `frameEvents`（时间戳 + `source`），长度有上限。
- `getVisionContextLine(sessionId)` 在无历史时返回空串；有历史时返回一句中文上下文说明。
- `streamTextMock`、`streamImageMock`、`runVoiceMockPipeline` 内对 `streamTextMock` 的调用会传入该字符串，拼入 mock 流式正文。

## 前端（`/ai`）

- **定时间隔**：3 / 5 / 10 秒可选，勾选「定时自动截帧」后生效。
- **手动截图发送**、**事件截帧**：同一抓帧逻辑，仅 `source` 不同。
- **Phase 5 · 低频摘要（mock）**：按钮发送固定提示语，用于触发「带画面上下文」的文本回复（需先发至少一帧）。

## 代码对照

| 说明 | 路径 |
|------|------|
| 会话与截帧历史 | `app/ai-gateway/src/session-store.js` |
| mock 流式（含上下文参数） | `app/ai-gateway/src/mock-adapter.js` |
| 语音流水线传入上下文 | `app/ai-gateway/src/voice-pipeline.js`、`app/ai-gateway/src/server.js` |
| 截帧来源与 UI | `app/frontend/src/pages/AiSessionPage.jsx` |
| `sendImage(..., source)` | `app/frontend/src/hooks/useAiGateway.js` |

## 验证

见 **`docs/phase-5-verification.md`**。

## 通过门禁

画面上下文在 mock 层稳定后，可继续做产品化（真实多模态模型、性能优化等）；路线图下一阶段见 **`plan.md` Phase 6** 及直播间扩展文档。

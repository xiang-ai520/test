# Phase 3：本地 AI 文本/视觉会话骨架

## 阶段目标
在不强依赖你现在就安装本地模型的前提下，先把 AI 通话的工程骨架搭好：
- 前端 AI 会话页
- 本地 AI 网关服务
- 文本输入与流式回复
- 发送截图帧给网关
- 模型适配器接口抽象

## 核心思路
这一阶段先解决“协议”和“系统接线”，不先追求最终模型能力。

也就是说，哪怕还没有真正安装 Qwen Omni 或其他本地模型，系统也能先通过 mock 跑通完整链路。

## 建议模块

### 前端
- AI 对话页
- 文本输入区
- 视频预览区
- 截图按钮 / 自动截帧开关
- AI 回复区域

### AI 网关
- WebSocket 服务
- 会话管理
- 输入类型分发
- 模型适配器接口
- mock 响应器

## 建议协议

### session.start
```json
{
  "type": "session.start",
  "sessionId": "ai-session-001"
}
```

### input.text
```json
{
  "type": "input.text",
  "sessionId": "ai-session-001",
  "text": "请介绍一下你看到的画面"
}
```

### input.image
```json
{
  "type": "input.image",
  "sessionId": "ai-session-001",
  "mimeType": "image/jpeg",
  "data": "base64...",
  "source": "manual"
}
```

可选字段 **`source`**：`timer`（定时截帧）、`manual`（默认）、`event`（事件截帧）等；用于 Phase 5 画面上下文统计，见 **`docs/phase-5.md`**。

### response.delta
```json
{
  "type": "response.delta",
  "sessionId": "ai-session-001",
  "text": "我看到"
}
```

### response.done
```json
{
  "type": "response.done",
  "sessionId": "ai-session-001"
}
```

### response.error
```json
{
  "type": "response.error",
  "sessionId": "ai-session-001",
  "message": "model unavailable"
}
```

## 模型适配器抽象
建议后端统一定义接口：
- `startSession()`
- `sendText()`
- `sendImage()`
- `streamResponse()`

后面不管接的是：
- Qwen Omni
- Qwen2-VL
- MiniCPM-V
- 其他本地模型

前端都不需要改协议。

## 为什么这样设计
因为本地多模态模型在不同运行环境下差异很大：
- 输入格式不同
- 流式输出方式不同
- 图像输入方式不同
- 语音能力拆分方式不同

如果前端直接绑死某个模型 API，后面很难换模型。

## 验证清单
以下项全部通过，Phase 3 才算完成：

1. 前端能连接 AI 网关。
2. 文本消息能发送到网关。
3. 网关能以 mock 方式流式返回内容。
4. 前端能正确拼接流式响应。
5. 前端能截取当前视频帧并发送到网关。
6. 网关能识别图片输入并记录会话上下文。

## 本阶段结果
这一阶段完成后，系统虽然未必已经接入真实本地模型，但：
- AI 交互页面已经存在
- 协议已经稳定
- 后续换真实模型时风险更低

## 通过门禁
确认协议和 mock 链路跑通后，才能进入 Phase 4 的语音链路。

## 代码实现对照（仓库现状）

以下为 `learn/app` 中与 Phase 3 对应的主要路径，便于对照阅读与排错：

| 模块 | 路径 | 说明 |
|------|------|------|
| AI 网关入口 | `ai-gateway/src/server.js` | WebSocket，默认 `0.0.0.0:8790`，环境变量 `PORT` / `HOST` |
| 协议常量 | `ai-gateway/src/protocol.js` | 与本文 JSON `type` 一致 |
| 会话状态 | `ai-gateway/src/session-store.js` | 内存会话，记录最近图像等 |
| 文本 / 图像 mock | `ai-gateway/src/mock-adapter.js` | 流式 `response.delta` + `response.done` |
| 前端配置 | `frontend/src/lib/config.js` | `AI_GATEWAY_WS_URL`（`localhost` 与局域网 hostname） |
| 前端协议常量 | `frontend/src/lib/aiProtocol.js` | 与网关对齐 |
| AI 会话页 | `frontend/src/pages/AiSessionPage.jsx` | 路由 `/ai` |
| 网关连接与聊天状态 | `frontend/src/hooks/useAiGateway.js` | WebSocket、流式拼接 |

运行与验收步骤见 **`docs/phase-3-verification.md`**。Phase 4 在 Phase 3 协议上增加了语音相关消息类型，见 **`docs/phase-4.md`**。

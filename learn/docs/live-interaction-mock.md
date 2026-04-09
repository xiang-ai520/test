# 直播间礼物与连麦（信令 mock）

## 定位

在 **Phase 2 直播**（SRS + WebRTC 推拉流）之上，通过 **同一套 signaling WebSocket** 增加：

- **礼物**：任意在直播间的客户端可发送礼物消息，**广播给房间内所有人**（含主播），仅 UI/信令 mock，**无支付、无持久化**。
- **连麦**：观众 **申请** → 仅 **主播** 收到申请 → 主播 **同意/忽略** → 全员收到 **连麦状态**。**不建立第二路 SRS 推流**，第二画面为 **占位 Panel**（便于以后接真实连麦推流）。

## 信令消息类型

| type | 方向 | 说明 |
|------|------|------|
| `send-live-gift` | 客户端 → 服务器 | `roomId`、`peerId`、`payload`: `giftId`, `label`, `count`, `fromName` |
| `live-gift` | 服务器 → 全员 | 广播礼物展示数据 |
| `request-link-mic` | 观众 → 服务器 | 仅 `audience` 角色允许 |
| `link-mic-request` | 服务器 → 主播 | `payload.requesterPeerId`, `requesterName` |
| `respond-link-mic` | 主播 → 服务器 | `payload.accept`, `targetPeerId`, `targetPeerName` |
| `link-mic-state` | 服务器 → 全员 | `payload.linkedMic`: `{ peerId, peerName }` 或 **连麦清空时为 `null`** |

加入直播房间后的 **`live-state`** payload 中带 **`linkedMic`**，便于新进入者同步状态。

## 服务端实现要点

- 文件：`app/signaling/src/live-room-manager.js`、`app/signaling/src/server.js`、`app/signaling/src/protocol.js`。
- 每个直播房间最多 **一个 mock 连麦位**（`linkedMic`）；主播下播或连麦观众离开时会 **清空** 并广播 `link-mic-state`。
- 礼物无校验、无扣费，适合联调 UI 与广播路径。

## 前端入口

- **主播页** ` /live/host/:roomId`：礼物列表、连麦申请列表、同意/忽略、连麦占位视频格、**自测送玫瑰**（无观众时测礼物 UI）。
- **观众页** ` /live/audience/:roomId`：送玫瑰/火箭、申请连麦、查看礼物广播。

## Mock 自测步骤（建议）

1. 启动 **signaling**、**frontend**；若测拉流再启 **SRS**。
2. 浏览器 A：首页进 **同一 roomId** 的 **主播**页并 **加入**（可先不开播）。
3. 浏览器 B：**观众**页同一 **roomId**，带不同 `peerId`（首页进房会自动带）。
4. B 点 **送玫瑰**：A、B 的礼物区均应出现一条记录。
5. B 点 **申请连麦**：A 侧出现申请，点 **同意**：A、B 状态栏与 A 的第二路 **连麦占位** 应更新；B 按钮变为 **你已连麦**。
6. B 关闭页面或离开：连麦位应 **释放**（`link-mic-state` 清空），具体以信令日志为准。

## 后续真实连麦（非本 mock 范围）

- 观众侧 **第二路 WebRTC 上行** 至 SRS（或混流服务）、或 **主播端订阅观众流**，需单独媒体架构设计；当前仅 **信令状态与 UI 占位**。

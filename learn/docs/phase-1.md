# Phase 1：局域网 1v1 视频通话

## 阶段目标
实现最小可用闭环：
- React + Vite H5 前端
- Node.js WebSocket 信令服务
- WebRTC 1v1 视频通话
- 手机和电脑在同一 WiFi 下可建立通话

## 本阶段范围

### 前端
- 房间加入页
- 通话房间页
- 本地视频预览
- 远端视频显示
- 麦克风/摄像头开关
- 挂断/离开房间
- 连接状态提示

### 后端
- WebSocket 信令服务
- 房间管理
- offer / answer / ICE candidate 转发
- peer 加入/离开通知
- 心跳与断线清理

## 本阶段不做
- 直播
- 数据库存储
- 多人房间
- AI 通话
- 外网 NAT 穿透

## 推荐目录结构

```text
app/
  frontend/
    src/
      pages/
        JoinPage.tsx
        RoomPage.tsx
      components/
        VideoPanel.tsx
        ControlBar.tsx
        StatusBanner.tsx
      hooks/
        useLocalMedia.ts
        useSignaling.ts
        usePeerConnection.ts
      lib/
        rtc.ts
        ws.ts
      App.tsx
      main.tsx
  signaling/
    src/
      server.ts
      room-manager.ts
      protocol.ts
```

## 页面流程

### JoinPage
用户输入：
- roomId
- userName（可选）

点击加入后跳转到房间页。

### RoomPage
页面结构建议：
- 顶部：房间号、连接状态
- 中间：本地视频 / 远端视频
- 底部：麦克风、摄像头、切换前后摄、挂断按钮

## 信令协议
建议统一使用 JSON 消息：

### join-room
```json
{
  "type": "join-room",
  "roomId": "demo-001",
  "peerId": "peer-abc"
}
```

### peer-joined
```json
{
  "type": "peer-joined",
  "peerId": "peer-b"
}
```

### offer
```json
{
  "type": "offer",
  "targetPeerId": "peer-b",
  "payload": {
    "sdp": {}
  }
}
```

### answer
```json
{
  "type": "answer",
  "targetPeerId": "peer-a",
  "payload": {
    "sdp": {}
  }
}
```

### ice-candidate
```json
{
  "type": "ice-candidate",
  "targetPeerId": "peer-b",
  "payload": {
    "candidate": {}
  }
}
```

### peer-left
```json
{
  "type": "peer-left",
  "peerId": "peer-b"
}
```

### error
```json
{
  "type": "error",
  "message": "room is full"
}
```

## 房间约束
- 每个房间最多 **2 人**
- 第一个进入的人等待第二个人加入
- 第二个人进入后触发通话协商
- 第三个人进入直接拒绝

## WebRTC 关键设计

### 媒体采集
- 默认打开前置摄像头
- 打开麦克风
- 支持重新申请媒体权限

### PeerConnection
- 初期只建立一个 `RTCPeerConnection`
- `iceServers` 配置留空或预留配置注入
- 收集本地 candidate 后通过 WebSocket 转发

### 事件处理
- `onicecandidate`
- `ontrack`
- `onconnectionstatechange`
- `oniceconnectionstatechange`

## 验证清单
以下项全部通过，Phase 1 才算完成：

1. 本机浏览器可进入房间。
2. 第二个浏览器标签页可加入并完成视频通话。
3. 手机在同一 WiFi 下可访问页面。
4. 手机加入房间后，和电脑之间可互相看到视频。
5. 双方可互相听到音频。
6. 一方关闭页面后，另一方看到离开状态。
7. 重新加入房间后可以再次建立连接。
8. 摄像头/麦克风开关可用。

## 推荐验证顺序
1. 本机双标签页验证基础流程。
2. 本机与手机验证媒体权限和 LAN 可达性。
3. 断开重连验证。
4. 切换网络或刷新页面验证恢复能力。

## 常见风险
- 手机浏览器对摄像头权限限制更严格
- 局域网 IP 无法访问时，通常是防火墙或 dev server 监听地址问题
- iPhone Safari 兼容性可能比 Android Chrome 更严格

## 通过门禁
你需要按清单验证并确认：
- 通话稳定
- 真机可用
- 基本断线恢复可用

只有确认 OK，才进入 Phase 2。

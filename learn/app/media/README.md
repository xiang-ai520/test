# 本地媒体层说明（Phase 2）

## 目标
本目录用于承载 Phase 2 局域网直播能力的媒体服务配置与说明。

当前阶段的代码已经进入 **真实 SRS WebRTC 推流 / 播放对接版**：
- 主播页会向本地 SRS 的 `/rtc/v1/publish/` 发送 SDP
- 观众页会向本地 SRS 的 `/rtc/v1/play/` 发送 SDP
- signaling 继续只承担房间状态和主播在线状态广播

## 推荐职责划分
- `app/frontend/`：主播本地预览、开始/停止直播、观众播放页、状态提示
- `app/signaling/`：直播房间控制面、主播在线/离线、观众计数、状态广播
- `app/media/`：SRS 配置、推流/拉流地址规范、局域网部署说明

## 推荐局域网端口
假设你的电脑局域网 IP 为：
- `192.168.1.33`

则需要至少保证：
- SRS HTTP API：`http://192.168.1.33:1985`
- SRS WebRTC UDP 端口：`8000/udp`
- SRS HLS/HTTP 服务：`http://192.168.1.33:8080`

## 当前前端默认使用的地址
配置位置：
- `D:/workspace/test/learn/app/frontend/src/lib/config.js`

当前默认：
- `baseHttpUrl = http://<hostname>:8080`
- `baseRtcUrl = http://<hostname>:1985`
- appName = `live`

## 当前前端的真实媒体接入方式
### 主播端
- 生成 `webrtc://<hostname>/live/<roomId>`
- 创建本地 `RTCPeerConnection`
- 调用 SRS `/rtc/v1/publish/` 完成 SDP 交换

### 观众端
- 使用同样的 `webrtc://<hostname>/live/<roomId>`
- 创建接收端 `RTCPeerConnection`
- 调用 SRS `/rtc/v1/play/` 完成 SDP 交换

## 启动 SRS 前必须注意
1. 必须真的启动 SRS，否则会出现：
   - `ERR_CONNECTION_REFUSED`
   - SRS API 请求失败
2. Windows 防火墙需放行：
   - 1985 TCP
   - 8080 TCP
   - 8000 UDP
3. 手机和电脑必须在同一 WiFi 下

## 推荐后续验证步骤
1. 启动本地 SRS。
2. 确认浏览器能访问 `http://电脑IP:1985` 和 `http://电脑IP:8080`。
3. 主播进入 `/live/host/:roomId`，点击开始直播。
4. 观众进入 `/live/audience/:roomId`，确认能拉到远端视频流。
5. 主播停止直播，观众端收到结束提示。

## 若仍失败，优先排查
1. SRS 是否真的运行。
2. 1985 / 8080 / 8000 端口是否可访问。
3. roomId 是否一致。
4. 浏览器控制台是否提示 SDP/API 错误。
5. 局域网环境是否对 UDP 有限制。

# Phase 2 运行与验证指南

## 当前实现范围
本轮 Phase 2 已进入真实 SRS 对接版：
- 主播页 `/live/host/:roomId`
- 观众页 `/live/audience/:roomId`
- 直播控制面 signaling
- 主播 WebRTC 推流到 SRS `/rtc/v1/publish/`
- 观众 WebRTC 播放到 SRS `/rtc/v1/play/`
- 观众数同步
- 媒体层 SRS 配置与地址规范

## 当前前提
这次验证前，你必须保证：
1. signaling 已重启到最新代码。
2. SRS 已启动。
3. 这些端口在局域网可访问：
   - `1985` TCP
   - `8080` TCP
   - `8000` UDP

## 新增路径
- 主播页：`/live/host/:roomId`
- 观众页：`/live/audience/:roomId`

## 启动步骤
### 1. 启动 signaling
在 `learn/app/signaling`：

```bash
npm install
npm run dev
```

### 2. 启动 frontend
在 `learn/app/frontend`：

```bash
npm install
npm run dev
```

### 3. 启动 SRS
推荐 Docker：在 `learn/app/media` 执行 `docker compose up -d`（详见 **`app/media/README.md` · 方式 A**）。手机 WebRTC 需配置 **`SRS_CANDIDATE`** 为本机局域网 IP。

若不用 Docker，请自行安装 SRS，保证 **1985 / 8080 / 8000(udp)** 与 `srs.conf` 一致。

## 验证步骤
### 验证 1：主播页可进入
检查：
- 能进入 `/live/host/:roomId`
- 本地预览正常
- 点击开始直播后若 SRS 正常，状态变为 live

### 验证 2：观众页可进入
检查：
- 能进入 `/live/audience/:roomId`
- 主播开播后，观众端尝试拉取远端流

### 验证 3：真实媒体流
步骤：
1. 手机或 PC 作为主播
2. 另一端作为观众
3. 主播点击开始直播

检查：
- 主播端没有 SRS API 报错
- 观众端拿到远端视频流
- 能看到真实画面
- 能听到真实声音

### 验证 4：停播
步骤：
1. 主播点击停止直播

检查：
- 观众端结束播放
- 页面显示主播已结束直播

### 验证 5：局域网真机
检查：
- 手机与电脑在同一 WiFi
- 真机作为主播或观众至少成功一次
- 至少连续播放 2–5 分钟

### 验证 6：Phase 1 回归
检查：
- `/room/:roomId` 1v1 通话仍正常

## Phase 2 通过标准
以下全部通过，Phase 2 才算完成：
1. 主播可以真实开播。
2. 观众可以真实看到视频。
3. 音频正常。
4. 停播后状态同步正确。
5. 手机真机局域网可用。
6. Phase 1 通话回归无异常。

## 可选验证 7：礼物与连麦（信令 mock）

不涉及 SRS，仅验证 signaling + 前端：

- 双浏览器分别打开 **同一 `roomId`** 的 **主播页** 与 **观众页**（需带不同 `peerId`）。
- 观众 **送礼**、**申请连麦**，主播 **同意连麦**，观察礼物列表与连麦占位格。

步骤与消息类型见 **`docs/live-interaction-mock.md`**。

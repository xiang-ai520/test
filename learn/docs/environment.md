# 本地开发与部署环境说明

## 目标
本文件用于说明该项目各阶段需要的本地环境、用途和推荐安装顺序。

**Phase 1–4 已实现代码路径下，最低仅需 Node.js** 即可跑通前端、信令与 `ai-gateway`（AI 与语音均为 mock）。Python、SRS、真实模型等按阶段可选或后续再接。

## 环境清单

### 1. Node.js
用途：
- 运行 React + Vite 前端开发服务器
- 运行 WebSocket 信令服务
- 运行 **AI 网关**（`learn/app/ai-gateway`，Phase 3–4）
- 构建前端生产包

建议版本：
- Node.js 20.x LTS 或更高稳定版

建议配套：
- npm（默认）
- 或 pnpm（可选）

### 2. Python（可选 / 后续）
用途：
- 若 AI 网关改为 Python 实现或旁路调用模型服务
- 本地语音识别 / 多模态模型辅助脚本、批处理

说明：
- **当前 `ai-gateway` 为 Node.js**，Phase 3–4 不强制安装 Python。

建议版本：
- Python 3.11 或 3.12

### 3. Docker Desktop
用途：
- 后续一键启动直播服务、TURN 服务等
- 统一本地多服务编排
- 便于未来迁移部署

说明：
- 当前不是必须立即安装，但在 Phase 2、Phase 6 会非常有帮助

### 4. 本地模型运行环境
用途：
- 运行本地多模态模型
- 后续提供视觉/语音/文本能力

说明：
- 当前先不安装，只在设计上预留接口
- 后续可接入：Qwen Omni / Qwen2-VL / MiniCPM-V / Whisper / 本地 TTS

### 5. 媒体服务（后续）
用途：
- 支持局域网直播
- 可能支持低延迟播放

推荐：
- SRS

### 6. TURN / STUN 服务（后续）
用途：
- 外网视频通话时做 NAT 穿透辅助
- 局域网阶段通常不是必需

推荐：
- coturn

## 推荐安装顺序
按后续开发顺序建议如下：

1. Node.js
2. Python
3. Git（如尚未配置完整开发流）
4. Docker Desktop
5. SRS
6. TURN 服务
7. 本地模型运行环境

## Windows 本地开发注意事项

### 1. 防火墙
局域网真机访问时，需要注意放行（如 Windows 防火墙「入站规则」）：
- 前端开发端口（默认 **5173** TCP）
- 信令端口（默认 **8788** TCP）
- AI 网关端口（默认 **8790** TCP）
- Phase 2 直播：SRS **8080** TCP、**1985** TCP、**8000** UDP 等（以 `app/media/README.md` 为准）

可能需要放行 Windows 防火墙。

### 2. 手机与电脑必须在同一 WiFi
Phase 1 与 Phase 2 的局域网验证依赖这一点。

### 3. HTTPS 与摄像头权限
移动端浏览器访问摄像头/麦克风时，常见要求：
- localhost 通常可直接授权
- 局域网 IP 在不同浏览器上的权限策略可能不同

因此后续 Phase 1 验证时，要重点测试：
- Android Chrome
- iPhone Safari（如果你需要兼容 iPhone）

### 4. 局域网地址
后续开发时需要明确电脑的局域网 IP，例如：
- `192.168.x.x`

手机通过这个地址访问电脑上运行的服务。

## 各阶段与环境依赖关系

### Phase 1：局域网 1v1 视频通话
需要：
- Node.js

### Phase 2：局域网直播
需要：
- Node.js
- 媒体服务（推荐 SRS）
- Docker Desktop / Docker Engine（**推荐**：在 `app/media` 下 `docker compose up -d` 启动 SRS，见 **`app/media/README.md`**）

### Phase 3：本地 AI 文本/视觉会话骨架
需要：
- Node.js（运行 `frontend` + `ai-gateway`）

可选 / 后续：
- 本地模型运行环境（当前为 **mock**，无需安装模型）

### Phase 4：本地语音链路
需要：
- Node.js（与 Phase 3 相同；语音链路在 `ai-gateway` 内为 **mock STT/TTS**）

可选 / 后续：
- 本地 STT（如 Whisper 类）、本地 TTS 服务，替换 `ai-gateway` 中适配器实现

### Phase 5：视频理解增强
需要：
- 本地多模态模型
- 更强的机器性能支持

### Phase 6：外网扩展
需要：
- TURN / STUN
- HTTPS
- Docker 编排能力

## 文档索引
- 项目总览：`docs/overview.md`
- Phase 1 设计：`docs/phase-1.md` · 验证：`docs/phase-1-verification.md`
- Phase 2 设计：`docs/phase-2.md` · 验证：`docs/phase-2-verification.md`
- Phase 3 设计：`docs/phase-3.md` · 验证：`docs/phase-3-verification.md`
- Phase 4 设计：`docs/phase-4.md` · 验证：`docs/phase-4-verification.md`
- Phase 5 设计：`docs/phase-5.md` · 验证：`docs/phase-5-verification.md`
- 直播礼物/连麦 mock：`docs/live-interaction-mock.md`
- 局域网与外网部署：`docs/deployment.md`

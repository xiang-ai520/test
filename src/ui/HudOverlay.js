import { PLAYER_STATES, SCREEN_STATES } from "../core/GameState.js";

export class HudOverlay {
  constructor(elements) {
    this.elements = elements;
    this.elements.primaryButton.addEventListener("click", () => this.onPrimary?.());
    this.elements.secondaryButton.addEventListener("click", () => this.onSecondary?.());
  }

  setHandlers(onPrimary, onSecondary) {
    this.onPrimary = onPrimary;
    this.onSecondary = onSecondary;
  }

  updateHud(gameState) {
    if (this.elements.hud.score) this.elements.hud.score.textContent = String(gameState.score).padStart(6, "0");
    if (this.elements.hud.coins) this.elements.hud.coins.textContent = String(gameState.coins).padStart(2, "0");
    // Removed state text swap so character name "Tartaglia" stays pristine.
    if (this.elements.hud.lives) this.elements.hud.lives.textContent = String(gameState.lives).padStart(2, "0");
    if (this.elements.hud.time) this.elements.hud.time.textContent = String(Math.ceil(gameState.timeLeft)).padStart(3, "0");
  }

  showScreen(screen, gameState) {
    const { overlay, overlayKicker, overlayTitle, overlayText, primaryButton, secondaryButton } = this.elements;
    overlay.classList.remove("hidden");

    if (screen === SCREEN_STATES.menu) {
      if (overlayKicker) overlayKicker.textContent = "GENSHIN IMPACT TRIAL";
      if (overlayTitle) overlayTitle.textContent = "原神 · 提瓦特幻境";
      if (overlayText) overlayText.textContent = "世界之外的旅人，欢迎来到提瓦特幻境。点击锁定鼠标进入沉浸模式，用 W A S D 移动，使用 J, K, L, I 释放公子「达达利亚」的水元素战技连段！体验极境爆发的快感。";
      if (primaryButton) primaryButton.textContent = "进入世界";
      if (secondaryButton) secondaryButton.textContent = "重置环境";
    } else if (screen === SCREEN_STATES.win) {
      if (overlayKicker) overlayKicker.textContent = "DOMAIN CLEARED";
      if (overlayTitle) overlayTitle.textContent = "秘境挑战成功";
      if (overlayText) overlayText.textContent = `你在提瓦特世界的探索已告一段落。收集了 ${String(gameState.coins).padStart(2, "0")} 枚原石，冒险阅历累计 ${String(gameState.score).padStart(6, "0")}。再来一次完美的水光连击吗？`;
      if (primaryButton) primaryButton.textContent = "再次秘境";
      if (secondaryButton) secondaryButton.textContent = "退出秘境";
    } else {
      if (overlayKicker) overlayKicker.textContent = "CHALLENGE FAILED";
      if (overlayTitle) overlayTitle.textContent = "探索受挫";
      if (overlayText) overlayText.textContent = gameState.summary || "请重新编队或准备后再次挑战。";
      if (primaryButton) primaryButton.textContent = "重新挑战";
      if (secondaryButton) secondaryButton.textContent = "检查配置";
    }
  }

  hideOverlay() {
    this.elements.overlay.classList.add("hidden");
  }
}

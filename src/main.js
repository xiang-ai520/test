import { GameApp } from "./core/GameApp.js";

const params = new URLSearchParams(window.location.search);

const app = new GameApp({
  mount: document.getElementById("game-root"),
  overlay: document.getElementById("overlay"),
  overlayKicker: document.getElementById("overlayKicker"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  primaryButton: document.getElementById("primaryButton"),
  secondaryButton: document.getElementById("secondaryButton"),
  interactionPrompt: document.getElementById("interactionPrompt"),
  messageToast: document.getElementById("messageToast"),
  hud: {
    score: document.getElementById("scoreValue"),
    coins: document.getElementById("coinValue"),
    state: document.getElementById("stateValue"),
    lives: document.getElementById("livesValue"),
    time: document.getElementById("timeValue")
  }
});

let selectedCharacter = "girl";
const stateLabel = document.getElementById("stateValue");
const characterNames = {
  tartaglia: "达达利亚",
  girl: "星空圣女"
};
if (stateLabel) stateLabel.textContent = characterNames[selectedCharacter] || selectedCharacter;
document.querySelectorAll(".char-card").forEach((card) => {
  card.classList.toggle("selected", card.dataset.char === selectedCharacter);
});
document.querySelectorAll(".char-card").forEach(el => {
    el.addEventListener("click", (e) => {
        document.querySelectorAll(".char-card").forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        selectedCharacter = e.currentTarget.dataset.char;
        app.setSelectedCharacter(selectedCharacter);
        if (stateLabel) stateLabel.textContent = characterNames[selectedCharacter] || selectedCharacter;
    });
});
app.setSelectedCharacter(selectedCharacter);

window.__app = app;
app.init().then(() => {
  if (params.get("autostart") === "1") {
    window.setTimeout(() => app.handlePrimary(), 300);
  }
});

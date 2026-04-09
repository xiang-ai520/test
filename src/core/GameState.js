export const SCREEN_STATES = {
  menu: "menu",
  playing: "playing",
  win: "win",
  lose: "lose"
};

export const PLAYER_STATES = {
  normal: "normal",
  powered: "powered"
};

export class GameState {
  constructor() {
    this.resetAll();
  }

  resetAll() {
    this.screen = SCREEN_STATES.menu;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.timeLeft = 180;
    this.timerAccumulator = 0;
    this.playerState = PLAYER_STATES.normal;
    this.summary = "";
  }

  addScore(points) {
    this.score += points;
  }

  addCoin() {
    this.coins += 1;
    this.addScore(100);
  }

  tick(dt) {
    this.timerAccumulator += dt;
    if (this.timerAccumulator >= 1) {
      const step = Math.floor(this.timerAccumulator);
      this.timeLeft = Math.max(0, this.timeLeft - step);
      this.timerAccumulator -= step;
    }
  }
}

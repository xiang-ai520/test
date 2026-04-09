export const TILE_SIZE = 2.2;
export const LEVEL_WIDTH = 260;
export const LEVEL_HEIGHT = 15;

function makeLaneCoins(start, end, step, y, z) {
  const coins = [];
  for (let x = start; x <= end; x += step) coins.push({ x, y, z });
  return coins;
}

function createEmptyMap() {
  return Array.from({ length: LEVEL_HEIGHT }, () => Array(LEVEL_WIDTH).fill("."));
}

function setGround(map, start, end, row = LEVEL_HEIGHT - 2) {
  for (let x = start; x <= end; x += 1) {
    map[row][x] = "G";
    map[row + 1][x] = "G";
  }
}

function setPlatform(map, start, end, row) {
  for (let x = start; x <= end; x += 1) map[row][x] = "P";
}

function place(map, x, y, tile) {
  map[y][x] = tile;
}

function clear(map, x, y) {
  if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return;
  map[y][x] = ".";
}

function carveGap(map, start, end, row = LEVEL_HEIGHT - 2) {
  for (let x = start; x <= end; x += 1) {
    clear(map, x, row);
    clear(map, x, row + 1);
  }
}

function buildLevelMap() {
  const map = createEmptyMap();
  setGround(map, 0, LEVEL_WIDTH - 1);

  carveGap(map, 48, 52);
  carveGap(map, 118, 123);
  carveGap(map, 196, 201);

  setPlatform(map, 10, 14, 10);
  setPlatform(map, 15, 18, 10);
  setPlatform(map, 18, 21, 8);
  setPlatform(map, 22, 25, 8);
  setPlatform(map, 32, 37, 10);
  setPlatform(map, 38, 42, 10);
  setPlatform(map, 42, 46, 8);
  setPlatform(map, 47, 50, 8);
  setPlatform(map, 64, 69, 10);
  setPlatform(map, 70, 74, 10);
  setPlatform(map, 76, 82, 9);
  setPlatform(map, 83, 87, 9);
  setPlatform(map, 96, 101, 10);
  setPlatform(map, 102, 106, 10);
  setPlatform(map, 108, 114, 8);
  setPlatform(map, 115, 118, 8);
  setPlatform(map, 129, 135, 10);
  setPlatform(map, 136, 140, 10);
  setPlatform(map, 145, 151, 8);
  setPlatform(map, 152, 156, 8);
  setPlatform(map, 168, 174, 10);
  setPlatform(map, 175, 179, 10);
  setPlatform(map, 184, 189, 8);
  setPlatform(map, 190, 194, 8);
  setPlatform(map, 206, 212, 10);
  setPlatform(map, 213, 217, 10);
  setPlatform(map, 222, 227, 8);
  setPlatform(map, 228, 232, 8);
  setPlatform(map, 238, 244, 9);
  setPlatform(map, 245, 249, 9);

  setPlatform(map, 48, 52, 12);
  setPlatform(map, 118, 123, 12);
  setPlatform(map, 196, 201, 12);

  const springs = [[16, 12], [72, 12], [132, 12], [210, 12], [242, 11]];
  springs.forEach(([x, y]) => place(map, x, y, "S"));

  const questionBlocks = [
    [11, 9], [12, 9], [20, 7], [34, 9], [44, 7], [66, 9], [78, 8], [98, 9],
    [111, 7], [131, 9], [148, 7], [170, 9], [186, 7], [208, 9], [224, 7], [240, 8]
  ];
  questionBlocks.forEach(([x, y]) => place(map, x, y, "Q"));

  const breakableBlocks = [
    [14, 9], [15, 9], [35, 9], [36, 9], [46, 7], [47, 7], [68, 9], [69, 9],
    [80, 8], [81, 8], [101, 9], [102, 9], [113, 7], [114, 7], [133, 9], [134, 9],
    [151, 7], [152, 7], [172, 9], [173, 9], [188, 7], [189, 7], [210, 9], [211, 9],
    [226, 7], [227, 7], [242, 8], [243, 8]
  ];
  breakableBlocks.forEach(([x, y]) => place(map, x, y, "B"));

  const spikeTraps = [
    [26, 12], [27, 12], [58, 12], [59, 12], [89, 12], [90, 12],
    [154, 12], [155, 12], [176, 12], [177, 12], [232, 12], [233, 12]
  ];
  spikeTraps.forEach(([x, y]) => place(map, x, y, "T"));

  const coinSpawns = [
    { x: 6, y: 11, z: -5.5 }, { x: 8, y: 11, z: 0 }, { x: 10, y: 11, z: 5.5 },
    { x: 20, y: 6, z: -2.4 }, { x: 20, y: 6, z: 2.4 },
    { x: 28, y: 11, z: -6 }, { x: 32, y: 11, z: 0 }, { x: 36, y: 11, z: 6 },
    { x: 41, y: 6, z: -2.2 }, { x: 41, y: 6, z: 2.2 },
    { x: 60, y: 11, z: -5.8 }, { x: 64, y: 8, z: 0 }, { x: 68, y: 11, z: 5.8 },
    { x: 78, y: 8, z: -2.4 }, { x: 78, y: 8, z: 2.4 },
    { x: 94, y: 11, z: -5.6 }, { x: 98, y: 9, z: 0 }, { x: 102, y: 11, z: 5.6 },
    { x: 110, y: 6, z: -2 }, { x: 110, y: 6, z: 2 },
    { x: 126, y: 11, z: -5.4 }, { x: 130, y: 9, z: 0 }, { x: 134, y: 11, z: 5.4 },
    { x: 146, y: 6, z: -2.5 }, { x: 148, y: 6, z: 2.5 },
    { x: 160, y: 11, z: -5.4 }, { x: 168, y: 8, z: 0 }, { x: 176, y: 11, z: 5.4 },
    { x: 188, y: 6, z: 0 }, { x: 206, y: 9, z: -4 }, { x: 210, y: 9, z: 4 },
    { x: 224, y: 6, z: -2 }, { x: 240, y: 7, z: 0 }, { x: 250, y: 11, z: 5.8 }
  ];
  coinSpawns.forEach(({ x, y }) => place(map, x, y, "C"));

  questionBlocks.forEach(([x, y]) => clear(map, x, y + 1));
  return { map, questionBlocks, breakableBlocks, coinSpawns, springs, spikeTraps };
}

export function tileToWorld(x, y, z = 0) {
  return {
    x: (x + 0.5) * TILE_SIZE,
    y: (LEVEL_HEIGHT - y - 0.5) * TILE_SIZE,
    z
  };
}

export function createLevel01() {
  const built = buildLevelMap();
  const sideLaneCoins = [
    ...makeLaneCoins(14, 42, 4, 11, -22),
    ...makeLaneCoins(22, 58, 4, 11, 24),
    ...makeLaneCoins(74, 118, 5, 11, -34),
    ...makeLaneCoins(90, 136, 5, 11, 34),
    ...makeLaneCoins(148, 198, 5, 11, -26),
    ...makeLaneCoins(168, 228, 5, 11, 28)
  ];

  const structures = [
    { x: 16, y: 12, z: -24, sizeX: 3, sizeY: 2, sizeZ: 3, style: "stone" },
    { x: 24, y: 10, z: -24, sizeX: 3, sizeY: 4, sizeZ: 3, style: "stone" },
    { x: 34, y: 12, z: -20, sizeX: 5, sizeY: 1, sizeZ: 2, style: "wood" },
    { x: 42, y: 12, z: 26, sizeX: 4, sizeY: 2, sizeZ: 4, style: "brick" },
    { x: 54, y: 10, z: 26, sizeX: 2, sizeY: 4, sizeZ: 2, style: "accent" },
    { x: 72, y: 12, z: -34, sizeX: 5, sizeY: 1, sizeZ: 3, style: "grass" },
    { x: 86, y: 11, z: -34, sizeX: 3, sizeY: 3, sizeZ: 3, style: "stone" },
    { x: 98, y: 12, z: 34, sizeX: 6, sizeY: 1, sizeZ: 3, style: "wood" },
    { x: 114, y: 10, z: 34, sizeX: 3, sizeY: 4, sizeZ: 3, style: "brick" },
    { x: 138, y: 12, z: -18, sizeX: 8, sizeY: 1, sizeZ: 2, style: "grass" },
    { x: 154, y: 11, z: 20, sizeX: 4, sizeY: 3, sizeZ: 4, style: "stone" },
    { x: 168, y: 10, z: -28, sizeX: 3, sizeY: 4, sizeZ: 3, style: "accent" },
    { x: 182, y: 12, z: 28, sizeX: 6, sizeY: 1, sizeZ: 2, style: "wood" },
    { x: 198, y: 11, z: -24, sizeX: 5, sizeY: 3, sizeZ: 5, style: "brick" },
    { x: 218, y: 10, z: 30, sizeX: 3, sizeY: 4, sizeZ: 3, style: "stone" },
    { x: 236, y: 12, z: -30, sizeX: 7, sizeY: 1, sizeZ: 3, style: "grass" },
    { x: 18, y: 7, z: -10, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 22, y: 8, z: 9, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 30, y: 7, z: -14, sizeX: 1, sizeY: 1, sizeZ: 1, style: "accent" },
    { x: 38, y: 8, z: 12, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 52, y: 7, z: -18, sizeX: 1, sizeY: 1, sizeZ: 1, style: "wood" },
    { x: 60, y: 8, z: 15, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 74, y: 7, z: -24, sizeX: 1, sizeY: 1, sizeZ: 1, style: "accent" },
    { x: 88, y: 8, z: 18, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 102, y: 7, z: -12, sizeX: 1, sizeY: 1, sizeZ: 1, style: "wood" },
    { x: 116, y: 8, z: 22, sizeX: 1, sizeY: 1, sizeZ: 1, style: "accent" },
    { x: 128, y: 7, z: -26, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 142, y: 8, z: 16, sizeX: 1, sizeY: 1, sizeZ: 1, style: "wood" },
    { x: 156, y: 7, z: -20, sizeX: 1, sizeY: 1, sizeZ: 1, style: "accent" },
    { x: 170, y: 8, z: 24, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 186, y: 7, z: -16, sizeX: 1, sizeY: 1, sizeZ: 1, style: "wood" },
    { x: 202, y: 8, z: 20, sizeX: 1, sizeY: 1, sizeZ: 1, style: "accent" },
    { x: 218, y: 7, z: -22, sizeX: 1, sizeY: 1, sizeZ: 1, style: "brick" },
    { x: 234, y: 8, z: 14, sizeX: 1, sizeY: 1, sizeZ: 1, style: "wood" },
    { x: 8, y: 12, z: -44, sizeX: 4, sizeY: 1, sizeZ: 2, style: "grass" },
    { x: 12, y: 10, z: 44, sizeX: 2, sizeY: 3, sizeZ: 2, style: "accent" },
    { x: 58, y: 12, z: 40, sizeX: 3, sizeY: 1, sizeZ: 2, style: "grass" },
    { x: 86, y: 10, z: 44, sizeX: 2, sizeY: 3, sizeZ: 2, style: "brick" },
    { x: 146, y: 12, z: -40, sizeX: 4, sizeY: 1, sizeZ: 2, style: "grass" },
    { x: 206, y: 10, z: -42, sizeX: 2, sizeY: 3, sizeZ: 2, style: "accent" },
    { x: 244, y: 12, z: 40, sizeX: 5, sizeY: 1, sizeZ: 3, style: "grass" }
  ];

  const bonusSpawns = [
    { type: "star", x: 36, y: 7, z: -18 },
    { type: "jewel", x: 92, y: 9, z: 34 },
    { type: "star", x: 154, y: 8, z: -26 },
    { type: "jewel", x: 214, y: 8, z: 28 }
  ];

  const portals = [
    { from: { x: 44, y: 11, z: 26 }, to: { x: 82, y: 11, z: -34 } },
    { from: { x: 178, y: 11, z: 28 }, to: { x: 228, y: 11, z: -30 } }
  ];

  const propSpawns = [
    { type: "tree", x: 10, y: 11, z: -52, scale: 2.1 },
    { type: "flowers", x: 12, y: 11, z: -30, scale: 1.45 },
    { type: "sign", x: 18, y: 11, z: -8, scale: 1.15, interaction: "sign", message: "欢迎来到云糖岛，先熟悉跳跃节奏，再去收集两侧奖励。" },
    { type: "tree", x: 14, y: 11, z: -48, scale: 2.4 },
    { type: "tree", x: 26, y: 11, z: 46, scale: 2.2 },
    { type: "rocks", x: 40, y: 11, z: -20, scale: 1.4 },
    { type: "flowers", x: 34, y: 11, z: 18, scale: 1.4 },
    { type: "pipe", x: 44, y: 11, z: 26, scale: 1.5, interaction: "pipe", label: "按 E 进入糖果管道" },
    { type: "flowers", x: 52, y: 11, z: 34, scale: 1.55 },
    { type: "crate", x: 58, y: 11, z: -12, scale: 1.15 },
    { type: "sign", x: 66, y: 11, z: 10, scale: 1.2, interaction: "sign", message: "前方是训练桥段，先拿金币再走中间主路。" },
    { type: "mushrooms", x: 72, y: 11, z: 28, scale: 1.55 },
    { type: "tree", x: 78, y: 11, z: -48, scale: 2.6 },
    { type: "mushrooms", x: 88, y: 11, z: 24, scale: 1.5 },
    { type: "rocks", x: 104, y: 11, z: -34, scale: 1.5 },
    { type: "flowers", x: 118, y: 11, z: 34, scale: 1.5 },
    { type: "chest", x: 122, y: 11, z: -28, scale: 1.25, interaction: "chest", reward: "star" },
    { type: "platformRamp", x: 128, y: 11, z: -10, scale: 1.8 },
    { type: "flowers", x: 138, y: 11, z: -34, scale: 1.45 },
    { type: "crate", x: 146, y: 11, z: 18, scale: 1.2 },
    { type: "sign", x: 152, y: 11, z: -12, scale: 1.18, interaction: "sign", message: "这一段分成主路和高分支路，观察高台与宝箱提示。" },
    { type: "tree", x: 156, y: 11, z: -50, scale: 2.5 },
    { type: "mushrooms", x: 170, y: 11, z: 34, scale: 1.55 },
    { type: "pipe", x: 178, y: 11, z: 28, scale: 1.5, interaction: "pipe", label: "按 E 穿过远端传送管道" },
    { type: "rocks", x: 190, y: 11, z: -24, scale: 1.6 },
    { type: "flowers", x: 206, y: 11, z: 28, scale: 1.4 },
    { type: "sign", x: 210, y: 11, z: 14, scale: 1.2, interaction: "sign", message: "右侧管道能抄近路，左侧宝石区分数更高。" },
    { type: "tree", x: 224, y: 11, z: 48, scale: 2.3 },
    { type: "flowers", x: 228, y: 11, z: 36, scale: 1.45 },
    { type: "mushrooms", x: 236, y: 11, z: -30, scale: 1.6 },
    { type: "chest", x: 232, y: 11, z: 22, scale: 1.25, interaction: "chest", reward: "jewel" },
    { type: "tree", x: 246, y: 11, z: -44, scale: 2.2 },
    { type: "flowers", x: 248, y: 11, z: 30, scale: 1.6 },
    { type: "sign", x: 250, y: 11, z: 10, scale: 1.18, interaction: "sign", message: "终点舞台就在前方，冲刺前别忘了把最后一串金币收下。" }
  ];

  return {
    ...built,
    spawn: { x: 6, y: 11, z: 0 },
    enemySpawns: [
      { x: 24, y: 11, z: -4.2, axis: "z", range: 4.5, speed: 2.0, type: "walker" },
      { x: 52, y: 11, z: 3.6, axis: "x", range: 6.2, speed: 2.6, type: "walker" },
      { x: 82, y: 11, z: -5, axis: "z", range: 4.8, speed: 1.9, type: "beetle" },
      { x: 108, y: 11, z: 4.5, axis: "x", range: 6.5, speed: 2.9, type: "walker" },
      { x: 138, y: 11, z: -3.8, axis: "z", range: 4.6, speed: 2.0, type: "beetle" },
      { x: 170, y: 11, z: 4.8, axis: "x", range: 5.8, speed: 3.0, type: "walker" },
      { x: 214, y: 11, z: -4.8, axis: "z", range: 5.2, speed: 2.3, type: "beetle" },
      { x: 244, y: 11, z: 3.4, axis: "x", range: 6.2, speed: 3.2, type: "walker" },
      { x: 28, y: 11, z: -22, axis: "x", range: 5.4, speed: 2.2, type: "walker" },
      { x: 48, y: 11, z: 24, axis: "z", range: 4.2, speed: 2.0, type: "beetle" },
      { x: 92, y: 11, z: -34, axis: "x", range: 7.4, speed: 2.6, type: "walker" },
      { x: 118, y: 11, z: 34, axis: "z", range: 4.8, speed: 2.1, type: "beetle" },
      { x: 164, y: 11, z: -26, axis: "x", range: 8.2, speed: 2.8, type: "walker" },
      { x: 212, y: 11, z: 28, axis: "x", range: 8.4, speed: 2.9, type: "beetle" }
    ],
    coinSpawns: [...built.coinSpawns, ...sideLaneCoins],
    bonusSpawns,
    portals,
    propSpawns,
    structures,
    mushroomBlocks: new Set(["11,9", "34,9", "66,9", "98,9", "131,9", "170,9", "208,9", "240,8"]),
    goal: { x: 252, y: 6, z: 0 }
  };
}

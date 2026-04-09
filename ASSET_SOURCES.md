# Asset Sources

This build currently uses a fully code-driven toon look so the trial build can run immediately without waiting for external downloads.

For the next visual pass, these are the recommended open-source or creator-friendly sources to plug into the existing structure:

- Environment kit: Kenney 3D assets
  - Suggested use: grass blocks, props, trees, pickups, low-poly decorative world pieces
  - Reference: https://kenney.nl/assets
- Stylized props and characters: Quaternius
  - Suggested use: low-poly fantasy props, creatures, character bases, world decoration
  - Reference: https://quaternius.com
- Free low-poly models: Poly Pizza
  - Suggested use: replace prototype enemies or player with more expressive public domain models
  - Reference: https://poly.pizza
- CC0 textures: Poly Haven
  - Suggested use: higher-quality base textures for stone, wood, grass, dirt, cloth
  - Reference: https://polyhaven.com/textures

Recommended next integration order:

1. Replace player prototype with a stylized glTF character.
2. Replace enemy prototype with a matching low-poly creature pack.
3. Swap current procedural block patterns with a curated wood / brick / grass texture set.
4. Add outfit slots:
   - hat
   - scarf
   - backpack
   - body palette
5. Add skill hooks:
   - dash
   - stomp
   - shield
   - ranged spell

Current code already has a good place to extend:

- Player visuals: `src/entities/PlayerAnimator.js`
- World materials: `src/world/LevelBuilder.js`
- Scene lighting and atmosphere: `src/scene/SceneManager.js`
- Gameplay loop and pickups: `src/core/GameApp.js`

## Current Character Models

- Male player: Kenney Platformer Kit character (`character_oopi.glb`)
  - Source: https://kenney.nl/assets/platformer-kit
  - License: CC0 (Public Domain)
- Female player: TalkingHead avatar (`brunette.glb`)
  - Source: https://github.com/met4citizen/TalkingHead
  - License: Open-source project asset (repo-distributed model)

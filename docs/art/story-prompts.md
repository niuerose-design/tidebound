# 스토리 삽화 프롬프트 (장 배너 6 · 장면 39)

스토리 탭(모험 일지)의 그림 자리입니다. 파일을 `public/art/story/`에 넣고 `node scripts/art-manifest.mjs`를 실행하면 화면에 나옵니다. 한 장씩 채워도 됩니다.

| 종류 | 파일 이름 | 권장 크기 | 그림이 없을 때 |
|---|---|---|---|
| 장 배너 | `chapter-0.webp` ~ `chapter-5.webp` (장 번호 0부터) | 1600×400 (4:1). 모바일은 3:1로 가운데가 잘리므로 주인공 요소는 가운데에 | 장마다 그린 SVG 풍경 |
| 장면 그림 | `{장면 id}.webp` (예: `awake.webp`, `blackMage.webp`) | 1280×720 (16:9) | 그림 없이 글만 |

- png · webp 둘 다 되고, 둘 다 있으면 png를 씁니다. 용량은 장당 100KB 안쪽(webp 품질 80 정도)을 권장합니다. 스토리 탭을 열 때만, 화면에 보일 때만 불러옵니다.
- 잠긴 장의 배너는 흑백으로 흐리게 보입니다. 잠긴 장면의 그림은 보이지 않습니다(스포일러 방지).
- 원작 게임 그림을 그대로 쓰지 않고, 아래 공통 스타일로 새로 생성하는 것을 권장합니다.

## 공통 스타일 (모든 프롬프트 앞에 붙임)

```
Storybook fantasy illustration, painterly, soft cinematic lighting, muted teal and warm lantern-gold palette,
cohesive series style, no text, no letters, no watermark, no border, no UI
```

- 주인공(모험가)은 얼굴이 잘 보이지 않는 뒷모습 · 실루엣으로 그려, 어떤 직업 · 성별이어도 어울리게 합니다.
- 배너 끝에 `wide panoramic banner, 4:1`, 장면 끝에 `cinematic still, 16:9`를 붙입니다.

## 장 배너

| 파일 | 장 | 프롬프트 |
|---|---|---|
| `chapter-0` | 제1장 · 판게아의 문 | A small fantasy harbor town at dawn, wooden pier stretching into calm sea, lighthouse on the right, golden sunrise over the horizon, fishing boats, wide panoramic banner, 4:1 |
| `chapter-1` | 제2장 · 생을 거듭하는 자 | Volcanic mountain range at night glowing with lava, a faint circular rune ring in the sky symbolizing rebirth, embers drifting, wide panoramic banner, 4:1 |
| `chapter-2` | 제3장 · 시간의 끝에서 | Ancient floating temple of time with a giant clock tower, broken marble pillars, pale moon, a colorless shimmering river below, wide panoramic banner, 4:1 |
| `chapter-3` | 제4장 · 두 번째 바다 | Deep underwater abyss lit by a pulsing glowing crystal heart, light rays from above, drifting bubbles, wide panoramic banner, 4:1 |
| `chapter-4` | 제5장 · 숫자의 그림자 | Neon-lit fantasy back-alley city at night, magenta and cyan signs, faint falling green digits in the air like rain, a stock ticker glow, wide panoramic banner, 4:1 |
| `chapter-5` | 제6장 · 판게아 너머 | A giant glowing arched gate standing on the sea horizon under a starry sky, a small sailing ship heading toward it, golden light spilling across the water, wide panoramic banner, 4:1 |

## 장면 그림

### 1부 · 제1장 판게아의 문

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `awake` | 선착장에서 눈을 뜨다 | An adventurer waking up on an old wooden pier at dawn, holding a worn weapon, an old fisherman mending nets nearby, cinematic still, 16:9 |
| `shell` | 조개 해안의 소문 | Shell-covered beach at dusk, cute bouncing slimes, a merchant by a campfire telling stories to the adventurer, cinematic still, 16:9 |
| `henesys` | 버섯 마을 헤네시스 | Village of giant mushroom houses on green hills, children playing with wooden swords, warm afternoon light, cinematic still, 16:9 |
| `firstJob` | 첫 번째 길 | A wise job instructor handing a glowing emblem to the adventurer in a stone hall, light rising around the adventurer, cinematic still, 16:9 |
| `mushmom` | 숲의 거대한 그림자 | A giant orange mushroom boss towering in a deep forest, a small glowing world-stone rolling out, the adventurer facing it, cinematic still, 16:9 |
| `perion` | 바위산의 전사들 | Red rocky mountains with ancient carved stone statues covered in unknown script, an archaeologist holding a rubbing, cinematic still, 16:9 |
| `ellinia` | 마법 숲의 속삭임 | Towering magical forest, moonlit lake reflecting a wavering figure, a fairy mage floating nearby, cinematic still, 16:9 |
| `kerning` | 네온 아래의 거래 | Neon-lit night city alley, a hooded informant flipping a coin, the adventurer listening in the shadows, cinematic still, 16:9 |
| `secondJob` | 갈림길 | The adventurer standing at a crossroads of several glowing paths that later merge in the distance, cinematic still, 16:9 |

### 1부 · 제2장 생을 거듭하는 자

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `rebirth1` | 다시 눈을 뜨다 | The same dawn pier, the adventurer waking with a knowing smile, a warm glowing world-stone in hand, the old fisherman looking up, cinematic still, 16:9 |
| `balrog` | 불의 제단 | A winged fire demon on a lava altar collapsing, heat waves, the adventurer standing firm, cinematic still, 16:9 |
| `thirdJob` | 세 번째 시련 | The adventurer dueling their own shadow in a dark trial chamber, the shadow mirroring every move, cinematic still, 16:9 |
| `rebirth5` | 익숙한 얼굴들 | A lively harbor with many returning adventurers greeting each other, the old fisherman calling a name, cinematic still, 16:9 |
| `zakum` | 엘나스의 불꽃 | A massive eight-armed stone idol boss in a fiery cave under snowy mountains, glowing ancient symbols on the walls, cinematic still, 16:9 |
| `aquaroad` | 깊은 바다의 길 | Quiet underwater coral forest, a mermaid pointing toward an even deeper sea, soft blue light, cinematic still, 16:9 |
| `rebirth10` | 열 번의 생 | The adventurer holding a palm full of glowing world-stones, faint ghostly echoes of past lives behind, cinematic still, 16:9 |
| `fourthJob` | 이름을 얻다 | An emblem engraved with a name glowing in the adventurer's hands, a smiling instructor, cinematic still, 16:9 |
| `leafre` | 용의 둥지 | Dragons flying over a cliffside nest at sunset, a cracking dragon egg, an elder halfling with a staff, cinematic still, 16:9 |
| `papulatus` | 멈춘 시계탑 | Top of a toy clock tower, a clockwork boss feeding on a glowing time rift, many clocks frozen at the same time, cinematic still, 16:9 |

### 1부 · 제3장 시간의 끝에서

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `temple` | 시간의 신전 | A misty path in a temple of time lined with shadow figures of the adventurer's past lives, all pointing ahead, cinematic still, 16:9 |
| `abyss50` | 무릉의 오십 층 | An oriental martial arts tower interior, a stern master with crossed arms on a high floor, endless stairs above, cinematic still, 16:9 |
| `onyx` | 칠흑의 조각 | A black jagged accessory glowing faintly in the adventurer's palm, a dark voice-like smoke curling from it, cinematic still, 16:9 |
| `arcane` | 소멸의 여로 | A colorless river that erases reflections, a small glowing spirit pointing across to a black castle, cinematic still, 16:9 |
| `fifthJob` | 다섯 번째 문 | A radiant doorway opening in the air, wind from another world carrying holy light and green flames, cinematic still, 16:9 |
| `rebirth50` | 오십 번의 바다 | The aged white-haired fisherman with frayed nets beside the unchanged adventurer on the pier, cinematic still, 16:9 |
| `blackMage` | 검은 마법사 | Top of a collapsing black castle, a dark sorcerer in white-winged robes falling, light breaking through the clouds, cinematic still, 16:9 |

### 2부 · 제4장 두 번째 바다

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `core` | 보스의 심장 | A pulsing crystal heart still warm in a fallen boss's chest, the adventurer reaching for it, cinematic still, 16:9 |
| `coreFull` | 깨어난 심장 | A fully awakened glowing core with a ghostly face of a former adventurer inside, melancholic mood, cinematic still, 16:9 |
| `star22` | 스물두 개의 별 | A forge with blue flames, a weapon embedded with twenty-two shining stars, an astonished blacksmith, cinematic still, 16:9 |
| `abyss100` | 무릉의 백 층 | The martial arts master uncrossing his arms on the hundredth floor, the adventurer stepping onto the next stair, cinematic still, 16:9 |

### 2부 · 제5장 숫자의 그림자

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `duel` | 거울 속 모험가 | Two similar adventurers shaking hands in a duel arena after a match, sunset light, cinematic still, 16:9 |
| `guild` | 같은 깃발 아래 | Many adventurers gathered under a guild banner around several campfires at a night harbor, cinematic still, 16:9 |
| `market` | 주화가 흐르는 곳 | A back-alley exchange with a glowing ticker board of rising and falling numbers, a sly broker, dungeon coins on the counter, cinematic still, 16:9 |
| `officer` | 소위의 견장 | A military training ground, an instructor pinning a shoulder insignia onto the adventurer, cinematic still, 16:9 |
| `hacker` | 숫자를 다루는 자 | The hooded figure and the adventurer before floating screens showing the world as glowing code, cinematic still, 16:9 |
| `general` | 별을 단 사람 | Recruits saluting on a parade ground, the adventurer with a star on the shoulder, memorial names on a wall, cinematic still, 16:9 |

### 2부 · 제6장 판게아 너머

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `onyxAll` | 일곱 개의 칠흑 | Seven black accessories levitating and interlocking into the shape of a key, dark purple glow, cinematic still, 16:9 |
| `clone` | 또 다른 나 | Two identical adventurers standing back to back on the pier, facing different paths, cinematic still, 16:9 |
| `ascend` | 승천 | The adventurer on the pier at dawn, glowing world-stones rising, a giant gate opening on the horizon with holy light and green flames, the old fisherman setting down his nets, a ship waiting, cinematic still, 16:9 |

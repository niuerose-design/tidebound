# 스토리 삽화 프롬프트 (장 배너 19 · 장면 79)

> 그림 파일이 없어도 장 배너 · 장면 모두 SVG 그림이 보입니다. 아래 프롬프트로 만든 그림을 넣으면 그 자리가 그림으로 바뀝니다.

스토리 탭(모험 일지)의 그림 자리입니다. 파일을 `public/art/story/`에 넣고 `node scripts/art-manifest.mjs`를 실행하면 화면에 나옵니다. 한 장씩 채워도 됩니다.

| 종류 | 파일 이름 | 권장 크기 | 그림이 없을 때 |
|---|---|---|---|
| 장 배너 | `chapter-0.webp` ~ `chapter-18.webp` (장 번호 0부터) | 1600×400 (4:1). 모바일은 3:1로 가운데가 잘리므로 주인공 요소는 가운데에 | 장마다 그린 SVG 풍경 |
| 장면 그림 | `{장면 id}.webp` (예: `awake.webp`, `blackMage.webp`) | 1200×400 (3:1). 모바일은 12:5로 양옆이 조금 잘림 | 장면마다 그린 SVG(`components/game/story-scenes.tsx`) |

- png · webp 둘 다 되고, 둘 다 있으면 png를 씁니다. 용량은 장당 100KB 안쪽(webp 품질 80 정도)을 권장합니다. 스토리 탭을 열 때만, 화면에 보일 때만 불러옵니다.
- 잠긴 장의 배너는 흑백으로 흐리게 보입니다. 잠긴 장면의 그림은 보이지 않습니다(스포일러 방지). 장은 처음에 모두 접혀 있습니다.
- 원작 게임 그림을 그대로 쓰지 않고, 아래 공통 스타일로 새로 생성하는 것을 권장합니다.

## 공통 스타일 (모든 프롬프트 앞에 붙임)

```
Storybook fantasy illustration, painterly, soft cinematic lighting, muted teal and warm lantern-gold palette,
cohesive series style, no text, no letters, no watermark, no border, no UI
```

- 주인공(모험가)은 얼굴이 잘 보이지 않는 뒷모습 · 실루엣으로 그려, 어떤 직업 · 성별이어도 어울리게 합니다.
- 배너 끝에 `wide panoramic banner, 4:1`, 장면 끝에 `cinematic still, 3:1 wide`를 붙입니다(아래 표의 16:9는 3:1로 바꿔 넣으세요).

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

## 3부 · 별의 바다를 건너는 자 (v3.367, 코프룰루 구역)

장 배너 `chapter-6` ~ `chapter-18`: 각 장 제목의 풍경(바다 너머의 하늘 · 잿빛 궤도 정거장 · 함교 · 보랏빛 결정 황야 · 노란 가스 분화구 · 보라색 생체 늪 · 심장 · 빛의 첨탑 · 공허의 문 · 네 칠흑 증표 · 교범과 포자 · 별 바다의 배 · 새벽 선착장), wide panoramic banner, 4:1. 원작 그림 없이 실루엣 풍경.

### 3부 · 제7장 바다 너머의 하늘

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `skyGate` | 하늘로 난 문 | 갈라진 하늘 틈으로 거꾸로 걸린 바다, 선착장 노인의 뒷모습, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `firstAscentOrbit` | 첫 궤도 | 거대한 부서진 정거장 격납고, 열린 문 틈의 빛, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `scrapDroneLesson` | 고철의 명령 | 모험가 어깨에 매달린 작은 드론, 용접 불꽃, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제8장 잿빛 궤도

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `fracturedSky` | 갈라진 갑판 | 반으로 갈라진 우주 정거장 갑판, 떠다니는 반투명한 선원들, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `starEaterSeen` | 별을 먹는 것 | 별 하나가 삼켜지는 순간, 검은 날개 실루엣, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `blackBoxFound` | 마지막 기록 | 검은 기록 장치에서 흘러나오는 빛의 파형, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제9장 멈춘 항로

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `bridgeDoor` | 함교의 문 | 육중한 함교 문 앞의 경비 기계, 붉은 경고등, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `rustAdmiralFall` | 녹슨 제독 | 시계 문자판 같은 함교, 의자에 앉은 녹슨 선장의 실루엣, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `vesperSilence` | 정적 | 소리가 지워진 부두, 수많은 눈이 박힌 안개 형체, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제10장 광맥 황야

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `descentToVein` | 보랏빛 땅 | 보랏빛 결정이 드러난 사막 지층, 멀리 버려진 채굴 기지, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `quarrySong` | 채굴장의 노래 | 보라색 결정 사이를 떠도는 작은 빛 덩어리, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `crystalTitanFall` | 결정 거인 | 무너지는 결정 거인, 바닥에 구르는 속 빈 결정, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제11장 노란 숨결

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `calderaBreath` | 노란 숨결 | 노란 가스 구름 속 부풀어 오른 두꺼비형 생물, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `calderaMawFall` | 분화구의 입 | 거대한 아가리가 불을 뱉는 분화구, 멀리 보라색 안개, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `halderSeal` | 여섯 팔의 석상 | 보랏빛 갱도에 봉인된 여섯 팔의 결정 석상, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제12장 군체 늪지

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `marshArrival` | 늪이 반응한다 | 보라색 생체 늪 위를 걷는 모험가, 사방의 알주머니, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `spawningTide` | 산란의 때 | 한꺼번에 깨어나는 알주머니, 쏟아지는 유충 떼, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `marshTyrantFall` | 늪의 폭군 | 늪 위에 솟은 거대한 날개 달린 포식자, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제13장 심장 소리

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `nerveDescent` | 신경 회랑 | 숨 쉬는 살벽으로 된 회랑, 바닥을 가로지르는 신경 다발, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `hiveMotherFall` | 모체 | 거대한 심장 모양의 모체, 멈추는 박동의 빛, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `mirrenClosed` | 감긴 눈 | 늪 위에 떠 있는 거대한 눈, 감기는 눈꺼풀, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제14장 고요한 성단

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `clusterSilence` | 고요 | 별들 사이 멈춰 선 빛의 첨탑, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `spireMemory` | 비친 기억 | 빛의 렌즈에 비친 작은 선착장 풍경, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `spireKeeperFall` | 첨탑 수호장 | 빛으로 풀어지는 고대 갑주, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제15장 공허의 뒷면

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `voidGalleryEnter` | 별빛이 닿지 않는 곳 | 검은 회랑 끝의 빛나는 문, 거꾸로 걷는 실루엣, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `lastWardenFall` | 최후의 관문지기 | 닫힌 거대한 문 앞에 무너진 석상, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `solenneWeave` | 첫 직조자 | 빛의 실을 짜는 고대 직조자, 흩어지는 빛의 소리, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제16장 정적의 보스들

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `fourOnyxOrbit` | 네 개의 증표 | 네 개의 칠흑 장신구가 놓인 탁자, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `abyss150` | 백오십 층 | 무릉도장 꼭대기에서 하늘을 보는 두 사람, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `star25` | 스물다섯 번째 별 | 25개의 별이 박힌 무기, 내려놓은 망치, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제17장 두 계보

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `ironLineage` | 강철 보병 | 낡은 교범과 녹슨 소총, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `hiveLineage` | 포자 수집가 | 손바닥 위에서 빛나는 보라색 포자, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `marshalAndArchitect` | 원수와 설계자 | 지휘봉과 빛나는 눈, 그 사이의 별 바다, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제18장 별의 바다를 건너는 자

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `rebirth40Sky` | 마흔 번째 하늘 | 처음으로 고개를 든 노인, 하늘을 가리키는 모험가, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `rebirth50Sky` | 쉰 번째 생의 약속 | 닫힌 문에 손을 댄 모험가, 문 너머의 희미한 손, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `nightmareHeart` | 악몽의 심장 | 붉게 뛰는 심장과 그 앞에 선 작은 모험가, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |

### 3부 · 제19장 다시, 선착장

| 파일 | 장면 | 프롬프트(한국어 메모, 영문 프롬프트로 옮겨 쓰기) |
|---|---|---|
| `clusterComplete` | 성단 도감 | 별 사이에 펼쳐진 도감 페이지, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `oldManSky` | 노인의 그물 | 건네지는 낡은 그물, 뒤에 선 새 모험가의 그림자, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `duelTen` | 열 번의 결투 | 선착장에 나란히 앉은 두 모험가, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |
| `ascendTwice` | 두 번째 승천 | 멀리서 열리기 시작하는 빛의 문, 모험가는 뒷모습 실루엣, cinematic still, 16:9 |


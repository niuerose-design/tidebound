// 자동 생성 파일: node scripts/art-manifest.mjs 가 public/art/{skills,fish,jobs} 를 훑어 다시 씁니다. 손으로 고치지 마세요.
/** 아이콘 이미지가 있는 스킬 id. 없는 스킬은 기본 아이콘을 씁니다(없는 파일을 요청하지 않음). */
export const SKILL_ART: ReadonlySet<string> = new Set<string>([]);
/** 그림이 있는 몬스터 id → 확장자. 없는 몬스터는 실루엣(없는 파일을 요청하지 않음). */
export const FISH_ART: Readonly<Record<string, 'png' | 'webp'>> = {"masteryMimic":"webp"};
/** 그림이 있는 직업 계보 id → 확장자. 없으면 계열 아이콘. */
export const JOB_ART: Readonly<Record<string, 'png' | 'webp'>> = {};

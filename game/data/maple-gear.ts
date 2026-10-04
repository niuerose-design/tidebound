/**
 * v27.46 메이플 장비 이름(4단계 장비). 등급(일반 → 태초)마다 메이플의 대표 장비 세트를 하나씩 맞췄습니다.
 * 무기는 공격 계열에 따라 소드(물리) · 스태프(마법) · 샤이닝 로드(겸용)로 이름이 갈립니다.
 * 세이브에 저장된 옛 이름(낚싯대·구명조끼·나침반 …)은 migrations.ts의 renameMapleGear가 한 번에 바꿉니다.
 */
import type { Item } from '../types';

/** 등급별 세트 이름(장비 도감·무기 이름 앞머리). */
export const GEAR_SETS = ['초보자', '메이플', '자쿰', '파프니르', '앱솔랩스', '아케인셰이드', '제네시스'] as const;
export const WEAPON_NAMES: Record<'physical' | 'magic' | 'balanced', readonly string[]> = {
    physical: ['목검', '메이플 소드', '자쿰의 소드', '파프니르 소드', '앱솔랩스 세이버', '아케인셰이드 세이버', '제네시스 세이버'],
    magic: ['나무 스태프', '메이플 스태프', '자쿰의 스태프', '파프니르 스태프', '앱솔랩스 스태프', '아케인셰이드 스태프', '제네시스 스태프'],
    balanced: ['수련용 샤이닝 로드', '메이플 샤이닝 로드', '자쿰의 샤이닝 로드', '파프니르 샤이닝 로드', '앱솔랩스 샤이닝 로드', '아케인셰이드 샤이닝 로드', '제네시스 샤이닝 로드'],
};
export const ARMOR_NAMES = ['하얀 반팔 면티', '메이플 망토', '자쿰의 투구', '루타비스 슈트', '앱솔랩스 슈트', '아케인셰이드 슈트', '에테르넬 아머'] as const;
export const ACCESSORY_NAMES = ['나무 귀고리', '메이플 펜던트', '혼테일의 목걸이', '마이스터 링', '도미네이터 펜던트', '여명의 가디언 엔젤 링', '창세의 뱃지'] as const;

/** 새로 얻는 장비의 이름. 무기는 공격 계열(style)을 정한 뒤 부릅니다(없으면 물리형). */
export function gearName(slot: Item['slot'], rarity: number, style?: Item['style']) {
    const r = Math.max(0, Math.min(GEAR_SETS.length - 1, rarity));
    return slot === 'rod' ? WEAPON_NAMES[style || 'physical'][r] : slot === 'coat' ? ARMOR_NAMES[r] : ACCESSORY_NAMES[r];
}

/** v27.46 이전 이름 → 등급. 세이브의 옛 장비 이름을 바꿀 때만 씁니다. */
export const OLD_GEAR_NAMES = {
    rod: ['대나무 낚싯대', '강철 릴 낚싯대', '산호 작살', '심연의 인도자', '폭풍 삼지창', '해신의 낚싯대', '태초의 조류'],
    coat: ['낡은 구명조끼', '비늘 외투', '수호자의 갑주', '레비아탄의 비늘', '용린 갑주', '심해왕의 망토', '태초의 껍질'],
    charm: ['조개 부적', '청옥 나침반', '월광 진주', '바다의 심장', '별의 나침반', '고대 해도', '태초의 눈'],
} as const;
/** 유물·옵션의 옛 이름 → 새 이름. */
export const RENAMED_GEAR: Record<string, string> = { '윤회의 낚싯대': '윤회의 샤이닝 로드', '영혼의 잠수복': '영혼의 망토' };
export const RENAMED_AFFIX: Record<string, string> = { '유영': '회피', '영혼 유영': '영혼 회피' };

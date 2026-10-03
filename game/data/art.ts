/**
 * v27.11 외부 생성 이미지 자리와 실루엣 폴백.
 * 이미지는 public/art/{fish|jobs}/{id}.webp 에 두면 자동으로 쓰이고, 없으면 실루엣이 그대로 남습니다.
 * 파일 이름은 어종 id / 계보 id와 같습니다(docs/art/README.md).
 */
import { FISH } from './world';

export const ART_SIZE = { fish: 512, job: 512 } as const;
export const fishArtSrc = (id: string) => `/art/fish/${id}.webp`;
export const jobArtSrc = (lineageId: string) => `/art/jobs/${lineageId}.webp`;

/** 실루엣 모양. 어종마다 하나를 고정해 두어 이미지가 없어도 책·장면에서 종류를 구분할 수 있게 합니다. */
export type FishShape = 'fish' | 'koi' | 'ray' | 'eel' | 'squid' | 'crab' | 'jelly' | 'shark' | 'puffer' | 'seahorse' | 'angler' | 'spirit' | 'giant';
export const FISH_SHAPES: Record<string, FishShape> = {
    minnow: 'fish', carp: 'koi', perch: 'fish', mackerel: 'fish', ray: 'ray', puffer: 'puffer', lionfish: 'fish', eel: 'eel', barracuda: 'fish', ghost: 'spirit',
    angler: 'angler', shark: 'shark', viper: 'eel', squid: 'squid', leviathan: 'giant', moonfish: 'puffer', dragon: 'giant', ancient: 'fish',
    ventCrab: 'crab', glassSquid: 'squid', sulfurEel: 'eel', blindShark: 'shark',
    seahorse: 'seahorse', needlefish: 'fish', tidejelly: 'jelly', emberEel: 'eel', ashRay: 'ray', magmaPuffer: 'puffer', cinderKoi: 'koi', starKoi: 'koi', prismRay: 'ray', voidGuppy: 'fish',
    stormBarracuda: 'fish', eclipseMoonfish: 'puffer', novaManta: 'ray', cinderAngler: 'angler', ventLeviathan: 'giant', abyssManta: 'ray',
    grottoWarden: 'eel', kelpHydra: 'giant', anchorWraith: 'spirit', magmaKraken: 'squid', templeOracle: 'spirit', abyssSovereign: 'giant', ventColossus: 'giant', starfallSeraph: 'spirit',
};
export const fishShape = (id: string): FishShape => FISH_SHAPES[id] ?? 'fish';
/** 모양 표가 빠뜨린 어종(테스트가 비어 있는지 확인합니다). */
export const unmappedFish = () => FISH.filter(f => !(f.id in FISH_SHAPES)).map(f => f.id);

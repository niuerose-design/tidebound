/**
 * v3.44 서버 전용: 비밀 직업·계보를 직업 표에 더합니다(docs/concept.md 10장). 게임 엔진(systems/engine.ts)이 불러오므로
 * 서버와 테스트에서는 언제나 전체 직업 표를 씁니다. 화면 코드는 이 파일을 가져가면 안 됩니다.
 */
// v3.49 서버 전용 표식: 화면(클라이언트) 번들이 이 파일을 가져가면 빌드가 실패합니다(docs/concept.md 10.2-1).
import 'server-only';
import { registerJobs, registerLineages, jobById } from '../data/classes';
import { registerSkills, alignJobMastery } from '../data/skills';
import { SECRET_JOBS, SECRET_LINEAGES } from './jobs';
import { SECRET_SKILLS } from './skills';
import { setOdds } from '../data/odds';
import { SERVER_ODDS } from './odds';
// v3.62 숨은 전직 조건(조건 창구 unlock-info를 채움).
import './unlocks';

registerLineages(SECRET_LINEAGES);
registerJobs(SECRET_JOBS, true);
// v3.47 비밀 직업의 스킬(완성된 모양).
registerSkills(SECRET_SKILLS);
// v3.76 비밀 직업의 숙달 목표도 스킬 숙련 기준에 맞춥니다(data/skills.ts alignJobMastery).
alignJobMastery(SECRET_JOBS.map(j => jobById(j.id)!).filter(Boolean));
// v3.52 드롭·확률 수치.
setOdds(SERVER_ODDS);

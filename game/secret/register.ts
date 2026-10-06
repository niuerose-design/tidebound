/**
 * v3.41 서버 전용: 비밀 직업·계보를 직업 표에 더합니다(docs/concept.md 10장). 게임 엔진(systems/engine.ts)이 불러오므로
 * 서버와 테스트에서는 언제나 전체 직업 표를 씁니다. 화면 코드는 이 파일을 가져가면 안 됩니다.
 */
import { registerJobs, registerLineages } from '../data/classes';
import { SECRET_JOBS, SECRET_LINEAGES } from './jobs';

registerLineages(SECRET_LINEAGES);
registerJobs(SECRET_JOBS, true);

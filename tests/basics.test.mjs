// 기본 상태·전직·SP·환급 규칙
import { newState, act, advance, rawAdvance, stats, apCapacity, apUsed, canUse, canChangeJob, masteryMilestonesFor, jobRequirements, SKILLS, STAGES, PROGRESSION, JOBS, assert, rng, test } from './harness.mjs';
test('Fresh state, stage and job restrictions',()=>{const s=newState(0);assert.equal(s.hp,stats(s).hp);assert.throws(()=>act(s,{type:'stage',id:'moon'},0));assert.throws(()=>act(s,{type:'job',id:'harpoon'},0));assert.throws(()=>act(s,{type:'skill',id:'pierce'},0));});
// 정산 상한은 첫 분할(CATCH_UP_CHUNK턴)만 돌려 남은 턴 수로 확인합니다(전에는 24시간 4만 턴을 다 돌려 16초). 같은 시각 재정산은 30분 부재로 확인합니다.
test('Server elapsed time, capped offline progress, no repeated rewards',()=>{const s=newState(0);s.permanent.offline=9;act(s,{type:'start'},0);rawAdvance(s,86_400_000,rng);assert.equal(s.playMs/2000,43200,'24h absence capped at 6h + 9×2h (v3.104 sampled: 900 real turns + the rest extrapolated)');assert.equal(s.turn,900);assert.ok(!s.catchUpLeft);assert.ok(s.kills>10);const t=newState(0);act(t,{type:'start'},0);advance(t,1_800_000,rng);assert.equal(t.turn,900);const serialized=JSON.stringify(t);advance(t,1_800_000,rng);assert.equal(JSON.stringify(t),serialized);assert.ok(t.inventory.length<=60);assert.ok(t.hp>=0&&t.hp<=stats(t).hp);});
test('Pause does not accumulate rewards',()=>{const s=newState(0);advance(s,600000,rng);assert.equal(s.kills,0);act(s,{type:'start'},600000);advance(s,602000,rng);assert.equal(s.turn,1)});
test('Job skills are free and SP cannot buy an unvisited job skill',()=>{
 const s=newState(0);s.level=25;s.sp=10;s.attributes.str=30;s.attributes.dex=20;
 act(s,{type:'job',id:'harpoon'},0);assert.equal(s.learned.pierce,1);assert.equal(s.sp,10);assert.equal(canUse(s,'pierce'),true);
 act(s,{type:'skill',id:'pierce'},0);assert.equal(apUsed(s),6);
 assert.throws(()=>act(s,{type:'learn',id:'wave'},0));assert.throws(()=>act(s,{type:'inheritSkill',id:'wave'},0));assert.equal(s.sp,10);
 act(s,{type:'job',id:'fisher'},0);assert.equal(canUse(s,'pierce'),false);assert.ok(!s.skills.includes('pierce'));
 const target=masteryMilestonesFor(SKILLS.find(x=>x.id==='pierce'))[0];s.skillPractice.pierce=target-1;assert.equal(canUse(s,'pierce'),false);
 s.skillPractice.pierce=target;assert.equal(canUse(s,'pierce'),true);act(s,{type:'skill',id:'pierce'},0);
 for(const id of STAGES[0].fish)s.book[id]=PROGRESSION.fishComplete;assert.equal(apCapacity(s),6,"v3.38 place AP comes from the achievement");act(s,{type:"sync"},0);act(s,{type:"claimAchievement",id:"regions:1"},0);assert.equal(apCapacity(s),7);
});
test('Advanced jobs require attributes and predecessor mastery, with safe combat transition',()=>{const s=newState(0);s.level=25;s.attributes.str=30;s.attributes.dex=15;assert.equal(canChangeJob(s,'whaler'),false);s.jobMastery.harpoon=75;assert.equal(canChangeJob(s,'whaler'),true);act(s,{type:'job',id:'whaler'},0);act(s,{type:'resetAttributes'},0);assert.equal(canChangeJob(s,'whaler'),true);s.running=true;s.enemy={id:'minnow',name:'출현',hp:20,maxHp:20,attack:1,defense:1,exp:1,gold:1,boss:false,stun:0};act(s,{type:'job',id:'fisher'},1234);assert.equal(s.job,'fisher');assert.equal(s.running,false);assert.equal(s.enemy,null);assert.equal(s.lastTick,1234);});
test('SP levels do not replace real mastery in advanced job requirements',()=>{
 const s=newState(0);s.level=40;s.rebirths=2;s.attributes={str:60,dex:45,int:10,vit:10,wis:10,luk:10};
 s.jobMastery.whaler=150;s.jobMastery.harpoon=150;s.learned.whaleStrike=5;
 const targets=masteryMilestonesFor(SKILLS.find(x=>x.id==='whaleStrike'));s.skillPractice.whaleStrike=targets.at(-1)-1;
 assert.equal(canChangeJob(s,'krakenSlayer'),false);s.skillPractice.whaleStrike=targets.at(-1);assert.equal(canChangeJob(s,'krakenSlayer'),true);
 assert.ok(jobRequirements(s,JOBS.find(x=>x.id==='krakenSlayer')).some(x=>x.label.includes('애로우 봄 숙련 4단계')));
});
test('Stat and SP refunds cannot create points or erase acquired skills',()=>{
 const s=newState(0);const attack=stats(s).attack;act(s,{type:'attribute',id:'str'},0);assert.equal(stats(s).attack,attack+2);
 act(s,{type:'resetAttributes'},0);act(s,{type:'resetAttributes'},0);assert.equal(s.statPoints,5);s.sp=3;
 act(s,{type:'learn',id:'hook'},0);assert.equal(s.sp,2);assert.equal(s.skillSpent.hook,1);act(s,{type:'resetSkills'},0);act(s,{type:'resetSkills'},0);assert.equal(s.sp,3);assert.equal(s.learned.hook,1);
 assert.throws(()=>act(s,{type:'attribute',id:'str',value:'-1'},0));
});

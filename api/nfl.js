const STATS='https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv';
const SCHEDULE='https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv';
const PREV='https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2025.csv';
const INJ='https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv';
const PBP='https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.csv.gz';
const split=(s)=>{const out=[];let q=false,x='';for(let i=0;i<s.length;i++){const c=s[i];if(c==='"')q=!q;else if(c===','&&!q){out.push(x);x=''}else x+=c}out.push(x);return out};
const csv=(t)=>{const l=t.trim().split(/\r?\n/),h=split(l[0]);return l.slice(1).map(z=>{const a=split(z),o={};h.forEach((k,i)=>o[k]=a[i]??'');return o})};
const n=(x)=>Number(x)||0;const norm=(x)=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))};const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export default async function handler(req,res){try{const season=Number(req.query.season||2026),week=Number(req.query.week||0);const [st,sc,pr,ir,pbr]=await Promise.all([fetch(STATS),fetch(SCHEDULE),fetch(PREV),fetch(INJ).catch(()=>null),fetch(PBP).catch(()=>null)]);if(!st.ok||!sc.ok||!pr.ok)throw Error('Upstream nflverse unavailable');const statsText=await st.text();const allSeasonStats=csv(statsText).filter(r=>n(r.season)===season);const stats=allSeasonStats.filter(r=>(week?n(r.week)<week:true));const prev=csv(await pr.text());let pbp=[];if(pbr&&pbr.ok){try{const z=new Uint8Array(await pbr.arrayBuffer());const raw=new TextDecoder().decode(require('zlib').gunzipSync(z));pbp=csv(raw)}catch(e){pbp=[]}}const injuries=ir&&ir.ok?csv(await ir.text()):[];const injuryBy={};for(const x of injuries){const id=x.gsis_id||x.player_id||x.full_name||x.player_name;if(id)injuryBy[id]=x}const prevBy={};for(const r of prev){const id=r.player_id||r.player_name;if(id)(prevBy[id]??=[]).push(r)}const games=csv(await sc.text()).filter(r=>n(r.season)===season&&r.game_type==='REG');const maxWeek=Math.max(0,...stats.map(r=>n(r.week)));const pbpTeam={};for(const x of pbp){if(n(x.season)!==season||n(x.week)>maxWeek||!x.defteam)continue;const d=x.defteam;(pbpTeam[d]??={plays:0,epa:0,success:0,pass:0,rush:0,sacks:0,explosive:0,passEpa:0,rushEpa:0}).plays++;const e=n(x.epa);pbpTeam[d].epa+=e;pbpTeam[d].success+=e>0?1:0;if(n(x.pass_attempt)||x.play_type==='pass'){pbpTeam[d].pass++;pbpTeam[d].passEpa+=e}if(n(x.rush_attempt)||x.play_type==='run'){pbpTeam[d].rush++;pbpTeam[d].rushEpa+=e}pbpTeam[d].sacks+=n(x.sack);const y=n(x.yards_gained);if((x.play_type==='pass'&&y>=20)||(x.play_type==='run'&&y>=10))pbpTeam[d].explosive++}const defense={};for(const r of stats){const opp=r.opponent_team;if(!opp)continue;const k=opp+'-'+n(r.week);defense[k]??={team:opp,week:n(r.week),passY:0,rushY:0,passAtt:0,carries:0,targets:0};defense[k].passY+=n(r.passing_yards);defense[k].rushY+=n(r.rushing_yards);defense[k].passAtt+=n(r.attempts);defense[k].carries+=n(r.carries);defense[k].targets+=n(r.targets)}const defTeams={};for(const d of Object.values(defense))(defTeams[d.team]??=[]).push(d);const league={passY:mean(Object.values(defense).map(d=>d.passY)),rushY:mean(Object.values(defense).map(d=>d.rushY)),passAtt:mean(Object.values(defense).map(d=>d.passAtt)),carries:mean(Object.values(defense).map(d=>d.carries)),targets:mean(Object.values(defense).map(d=>d.targets))};const defenseProfiles={};for(const [t,rs] of Object.entries(defTeams)){const adv=pbpTeam[t];defenseProfiles[t]={team:t,games:rs.length,advanced:adv?{epaPerPlay:Number((adv.epa/adv.plays).toFixed(3)),successRate:Number((100*adv.success/adv.plays).toFixed(1)),passEpa:Number((adv.passEpa/Math.max(1,adv.pass)).toFixed(3)),rushEpa:Number((adv.rushEpa/Math.max(1,adv.rush)).toFixed(3)),sackRate:Number((100*adv.sacks/Math.max(1,adv.pass)).toFixed(1)),explosiveRate:Number((100*adv.explosive/adv.plays).toFixed(1)),plays:adv.plays}:null,passY:Number(mean(rs.map(x=>x.passY)).toFixed(1)),rushY:Number(mean(rs.map(x=>x.rushY)).toFixed(1)),passAtt:Number(mean(rs.map(x=>x.passAtt)).toFixed(1)),carries:Number(mean(rs.map(x=>x.carries)).toFixed(1)),targets:Number(mean(rs.map(x=>x.targets)).toFixed(1)),passFactor:Number(clamp(mean(rs.map(x=>x.passY))/(league.passY||1),.78,1.22).toFixed(3)),rushFactor:Number(clamp(mean(rs.map(x=>x.rushY))/(league.rushY||1),.78,1.22).toFixed(3))}}const advDefs=Object.values(defenseProfiles).map(d=>d.advanced).filter(Boolean);
const leagueAdv={passEpa:mean(advDefs.map(x=>x.passEpa)),successRate:mean(advDefs.map(x=>x.successRate)),sackRate:mean(advDefs.map(x=>x.sackRate)),explosiveRate:mean(advDefs.map(x=>x.explosiveRate))};
const qbStatRows=stats.filter(r=>(r.position_group||r.position)==='QB'&&n(r.attempts)>0);
const leagueQBAtt=qbStatRows.reduce((a,r)=>a+n(r.attempts),0),leagueQBYds=qbStatRows.reduce((a,r)=>a+n(r.passing_yards),0),leaguePassYPA=leagueQBAtt?leagueQBYds/leagueQBAtt:7;
const by={};for(const r of stats){const id=r.player_id||r.player_name;if(!id)continue;(by[id]??=[]).push(r)}const teamWeek={};for(const r of stats){const t=r.recent_team||r.team,w=n(r.week);if(!t||!w)continue;const k=t+'-'+w;teamWeek[k]??={team:t,week:w,att:0,carries:0,targets:0,passY:0,rushY:0};teamWeek[k].att+=n(r.attempts);teamWeek[k].carries+=n(r.carries);teamWeek[k].targets+=n(r.targets);teamWeek[k].passY+=n(r.passing_yards);teamWeek[k].rushY+=n(r.rushing_yards)}const teamRows={};for(const tw of Object.values(teamWeek))(teamRows[tw.team]??=[]).push(tw);const offenseProfiles={};for(const [t,rs] of Object.entries(teamRows)){const plays=rs.map(x=>x.att+x.carries),passRates=rs.map(x=>(x.att+x.carries)?x.att/(x.att+x.carries):0);offenseProfiles[t]={team:t,games:rs.length,plays:Number(mean(plays).toFixed(1)),passRate:Number(mean(passRates).toFixed(3)),attempts:Number(mean(rs.map(x=>x.att)).toFixed(1)),carries:Number(mean(rs.map(x=>x.carries)).toFixed(1)),targets:Number(mean(rs.map(x=>x.targets)).toFixed(1)),passY:Number(mean(rs.map(x=>x.passY)).toFixed(1)),rushY:Number(mean(rs.map(x=>x.rushY)).toFixed(1))}}const players=Object.values(by).map(rows=>{rows.sort((a,b)=>n(a.week)-n(b.week));const last=rows.at(-1),recent=rows.slice(-4),early=rows.slice(0,Math.max(1,rows.length-2)),last2=rows.slice(-2),avg=k=>mean(recent.map(r=>n(r[k]))),season=k=>mean(rows.map(r=>n(r[k]))),l2=k=>mean(last2.map(r=>n(r[k])));const team=last.recent_team||last.team,pos=last.position_group||last.position;const oppKey=pos==='QB'?'attempts':pos==='RB'?'carries':'targets',oppVals=rows.map(r=>n(r[oppKey])),base=season(oppKey),recentOpp=l2(oppKey),delta=base?((recentOpp-base)/base)*100:0;const share=mean(rows.map(r=>{const tw=teamWeek[(r.recent_team||r.team)+'-'+n(r.week)]||{};const den=oppKey==='attempts'?tw.att:oppKey==='carries'?tw.carries:tw.targets;return den?n(r[oppKey])/den:0}));const cv=base?sd(oppVals)/base:0;const role=delta>18?'SURGING':delta<-18?'DECLINING':Math.abs(delta)<=8?'STABLE':'SHIFTING';const prior=prevBy[last.player_id||last.player_name]||[];const priorAvg=k=>mean(prior.map(r=>n(r[k])));const curGames=rows.length,priorWeight=clamp((6-curGames)/6,0,.65),blend=(k)=>season(k)*(1-priorWeight)+priorAvg(k)*priorWeight;const air=season('receiving_air_yards'),targets=season('targets'),carries=season('carries'),recs=season('receptions'),rushY=season('rushing_yards'),recY=season('receiving_yards'),att=season('attempts'),passY=season('passing_yards');
const shareSeries=(key,denKey)=>rows.map(r=>{const tw=teamWeek[(r.recent_team||r.team)+'-'+n(r.week)]||{};return{week:n(r.week),share:tw[denKey]?n(r[key])/tw[denKey]:0}}).filter(x=>x.share>=0);
const weightedShare=(arr)=>{const z=arr.slice(-3).reverse(),w=[.55,.30,.15];let num=0,den=0;z.forEach((x,i)=>{num+=x.share*w[i];den+=w[i]});return den?num/den:0};
const attemptSeries=shareSeries('attempts','att'),carrySeries=shareSeries('carries','carries'),targetSeries=shareSeries('targets','targets');
const attemptShare=mean(attemptSeries.map(x=>x.share)),carryShare=mean(carrySeries.map(x=>x.share)),targetShare=mean(targetSeries.map(x=>x.share));
const recentAttemptShare=weightedShare(attemptSeries),recentCarryShare=weightedShare(carrySeries),recentTargetShare=weightedShare(targetSeries);
const latestAttemptShare=attemptSeries.at(-1)?.share||0,latestCarryShare=carrySeries.at(-1)?.share||0,latestTargetShare=targetSeries.at(-1)?.share||0;
const priorAtt=priorAvg('attempts'),priorPassY=priorAvg('passing_yards'),priorCarries=priorAvg('carries'),priorRushY=priorAvg('rushing_yards'),priorTargets=priorAvg('targets'),priorRecY=priorAvg('receiving_yards'),priorRecs=priorAvg('receptions');
const shrink=(cur,pr,weight,fallback)=>{const priorVal=pr>0?pr:fallback;return cur*(1-weight)+priorVal*weight};
const effWeight=clamp((6-curGames)/8,.15,.55);
const passYPA=att?passY/att:0,priorPassYPA=priorAtt?priorPassY/priorAtt:0;
const rushYPC=carries?rushY/carries:0,priorRushYPC=priorCarries?priorRushY/priorCarries:0;
const recYPT=targets?recY/targets:0,priorRecYPT=priorTargets?priorRecY/priorTargets:0;
const catchRateRaw=targets?recs/targets:0,priorCatch=priorTargets?priorRecs/priorTargets:0;
const currentAttTotal=rows.reduce((a,r)=>a+n(r.attempts),0),currentPassYTotal=rows.reduce((a,r)=>a+n(r.passing_yards),0),priorAttTotal=prior.reduce((a,r)=>a+n(r.attempts),0),priorPassYTotal=prior.reduce((a,r)=>a+n(r.passing_yards),0);
const priorYPARaw=priorAttTotal?priorPassYTotal/priorAttTotal:leaguePassYPA,priorYPACapped=clamp(priorYPARaw,5.5,8.5),effectivePriorAtt=Math.min(priorAttTotal*.35,100),leaguePseudoAtt=120;
const calibratedPassYPA=(currentPassYTotal+effectivePriorAtt*priorYPACapped+leaguePseudoAtt*leaguePassYPA)/Math.max(1,currentAttTotal+effectivePriorAtt+leaguePseudoAtt);
const starterGames=rows.map((r,i)=>({att:n(r.attempts),share:attemptSeries[i]?.share||0,week:n(r.week)})).filter(x=>x.share>=.72&&x.att>=10);
const recentStarter=starterGames.slice(-3).reverse(),starterW=[.55,.30,.15];let starterNum=0,starterDen=0;recentStarter.forEach((x,i)=>{starterNum+=x.att*starterW[i];starterDen+=starterW[i]});
const priorStarterAtts=prior.map(r=>n(r.attempts)).filter(x=>x>=20),starterAttemptBase=starterDen?starterNum/starterDen:priorStarterAtts.length?mean(priorStarterAtts):31;
const shrunk={passYPA:calibratedPassYPA,rushYPC:shrink(rushYPC,priorRushYPC,effWeight,4.2),recYPT:shrink(recYPT,priorRecYPT,effWeight,7.5),catchRate:clamp(shrink(catchRateRaw,priorCatch,effWeight,.65),.35,.9)};
const advanced=pos==='QB'?{primary:'dropbacks',volume:Number(blend('attempts').toFixed(1)),secondary:Number(blend('carries').toFixed(1)),efficiency:att?Number((passY/att).toFixed(2)):0,highValue:Number((season('passing_tds')+season('rushing_tds')).toFixed(2))}:pos==='RB'?{primary:'touches',volume:Number((blend('carries')+blend('targets')).toFixed(1)),secondary:Number(blend('targets').toFixed(1)),efficiency:carries?Number((rushY/carries).toFixed(2)):0,highValue:Number((season('rushing_tds')+season('receiving_tds')).toFixed(2))}:{primary:'targets',volume:Number(blend('targets').toFixed(1)),secondary:Number(air.toFixed(1)),efficiency:targets?Number((recY/targets).toFixed(2)):0,catchRate:targets?Number((recs/targets*100).toFixed(1)):0,highValue:Number(season('receiving_tds').toFixed(2))};const confidence=Math.round(clamp(48+rows.length*6+(prior.length?8:0)+(1-clamp(cv,0,1))*22,45,95));const inj=injuryBy[last.player_id]||injuryBy[last.player_display_name]||injuryBy[last.player_name];return{id:last.player_id,name:last.player_display_name||last.player_name,team,pos,week:last.week,games:rows.length,injury:inj?{week:n(inj.week),updated:inj.date_modified||'',status:inj.report_status||inj.game_status||inj.status||'LISTED',practice:inj.practice_status||inj.practice_participation||'',detail:inj.report_primary_injury||inj.primary_injury||inj.injury||''}:null,role:{status:role,delta:Number(delta.toFixed(1)),share:Number((share*100).toFixed(1)),attemptShare:Number((attemptShare*100).toFixed(1)),carryShare:Number((carryShare*100).toFixed(1)),targetShare:Number((targetShare*100).toFixed(1)),recentAttemptShare:Number((recentAttemptShare*100).toFixed(1)),recentCarryShare:Number((recentCarryShare*100).toFixed(1)),recentTargetShare:Number((recentTargetShare*100).toFixed(1)),latestAttemptShare:Number((latestAttemptShare*100).toFixed(1)),latestCarryShare:Number((latestCarryShare*100).toFixed(1)),latestTargetShare:Number((latestTargetShare*100).toFixed(1)),baseline:Number(base.toFixed(2)),recent:Number(recentOpp.toFixed(2)),volatility:cv<.22?'LOW':cv<.45?'MEDIUM':'HIGH',confidence,priorGames:prior.length,priorWeight:Number((priorWeight*100).toFixed(0))},advanced,model:{effWeight:Number((effWeight*100).toFixed(0)),passYPA:Number(shrunk.passYPA.toFixed(2)),starterAttemptBase:Number(starterAttemptBase.toFixed(1)),leaguePassYPA:Number(leaguePassYPA.toFixed(2)),rushYPC:Number(shrunk.rushYPC.toFixed(2)),recYPT:Number(shrunk.recYPT.toFixed(2)),catchRate:Number((shrunk.catchRate*100).toFixed(1))},passing:{att:avg('attempts'),yds:avg('passing_yards'),td:avg('passing_tds'),rush:avg('rushing_yards')},rushing:{att:avg('carries'),yds:avg('rushing_yards'),td:avg('rushing_tds')},receiving:{targets:avg('targets'),rec:avg('receptions'),yds:avg('receiving_yards'),td:avg('receiving_tds'),air:avg('receiving_air_yards'),yac:avg('receiving_yards_after_catch')},trend:rows.slice(-6).map(r=>({week:n(r.week),pass:n(r.passing_yards),rush:n(r.rushing_yards),rec:n(r.receiving_yards),targets:n(r.targets),carries:n(r.carries)}))}}).filter(p=>['QB','RB','WR','TE'].includes(p.pos)&&p.games>0).sort((a,b)=>Math.max(b.passing.yds,b.rushing.yds,b.receiving.yds)-Math.max(a.passing.yds,a.rushing.yds,a.receiving.yds));const etParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const et=v=>etParts.find(x=>x.type===v)?.value||'';
const todayET=et('year')+'-'+et('month')+'-'+et('day');
const scheduleWeeks=[...new Set(games.map(g=>n(g.week)).filter(Boolean))].sort((a,b)=>a-b);
const weekBounds=scheduleWeeks.map(w=>{const ds=games.filter(g=>n(g.week)===w).map(g=>g.gameday).filter(Boolean).sort();return{week:w,start:ds[0]||'',end:ds.at(-1)||''}});
const active=weekBounds.find(x=>x.start&&x.start<=todayET&&todayET<=x.end)||weekBounds.find(x=>x.start>todayET)||weekBounds.at(-1);
const nextWeek=week||active?.week||maxWeek;
const slate=games.filter(g=>n(g.week)===nextWeek);
const depthByTeam={};
try{
 const tr=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=40');
 if(tr.ok){
   const tj=await tr.json(),items=tj?.sports?.[0]?.leagues?.[0]?.teams||[];
   const idBy={};for(const x of items){const t=x.team||x;const ab=(t.abbreviation||'').toUpperCase();if(ab)idBy[ab]=t.id}
   const teams=[...new Set(slate.flatMap(g=>[g.away_team,g.home_team]))];
   await Promise.all(teams.map(async tm=>{const id=idBy[tm];if(!id)return;try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/depthcharts');if(!r.ok)return;const j=await r.json(),map={};for(const dc of j.depthCharts||[]){if(String(dc.name||'').toLowerCase()!=='offense')continue;for(const pos of Object.values(dc.positions||{})){for(const a of pos.athletes||[]){const nm=a.athlete?.displayName||a.athlete?.fullName;if(nm)map[norm(nm)]={rank:n(a.rank),position:pos.position?.abbreviation||''}}}}depthByTeam[tm]=map}catch(e){}}))
 }
}catch(e){}
const matchup={};
for(const g of slate){
  const isFinal=g.away_score!==''&&g.home_score!=='';
  const status=isFinal?'FINAL':'UPCOMING';
  matchup[g.away_team]={opponent:g.home_team,home:false,status,defense:defenseProfiles[g.home_team]||null,venue:{stadium:g.stadium||'',roof:g.roof||'',surface:g.surface||''}};
  matchup[g.home_team]={opponent:g.away_team,home:true,status,defense:defenseProfiles[g.away_team]||null,venue:{stadium:g.stadium||'',roof:g.roof||'',surface:g.surface||''}};
}for(const p of players){
  const m=matchup[p.team];
  if(!m){
    p.matchup={bye:true,status:'BYE',projectionStatus:'BYE',opponent:null,home:null,venue:{stadium:'',roof:'',surface:''},weather:{status:'N/A',wind:null,temp:null,precip:null},factor:1,grade:'BYE',baseline:0,contextYards:0,defense:null,environment:{expectedPlays:0,passRate:0,teamAttempts:0,teamCarries:0,playerVolume:0},projection:0,projectedStats:{}};
    continue
  }
  const depth=depthByTeam[p.team]?.[norm(p.name)]||null;
  const seasonAtt=(p.role.attemptShare||0)/100,recentAtt=(p.role.recentAttemptShare||p.role.attemptShare||0)/100,latestAtt=(p.role.latestAttemptShare||0)/100;
  const seasonCarry=(p.role.carryShare||0)/100,recentCarry=(p.role.recentCarryShare||p.role.carryShare||0)/100;
  const seasonTarget=(p.role.targetShare||0)/100,recentTarget=(p.role.recentTargetShare||p.role.targetShare||0)/100;
  let projectedAttemptShare=clamp(.7*recentAtt+.3*seasonAtt,0,1);
  let projectedCarryShare=clamp(.7*recentCarry+.3*seasonCarry,0,.95);
  let projectedTargetShare=clamp(.7*recentTarget+.3*seasonTarget,0,.65);
  const depthStarter=p.pos==='QB'&&depth?.position==='QB'&&depth.rank===1;
  const inferredStarter=p.pos==='QB'&&latestAtt>=.65;
  if(depthStarter)projectedAttemptShare=clamp(Math.max(projectedAttemptShare,.96),.96,1);
  else if(inferredStarter)projectedAttemptShare=clamp(Math.max(projectedAttemptShare,.92),.92,1);
  const expectedRole=p.pos==='QB'?(depthStarter?'STARTING QB':inferredStarter?'STARTER-LEVEL QB':'QB ROTATION'):p.pos==='RB'?(projectedCarryShare>=.55?'LEAD BACK':projectedCarryShare>=.30?'COMMITTEE BACK':'ROTATION BACK'):(projectedTargetShare>=.25?'PRIMARY TARGET':projectedTargetShare>=.16?'FEATURED TARGET':'ROTATION TARGET');
  p.role.expectedRole=expectedRole;p.role.projectedAttemptShare=Number((projectedAttemptShare*100).toFixed(1));p.role.projectedCarryShare=Number((projectedCarryShare*100).toFixed(1));p.role.projectedTargetShare=Number((projectedTargetShare*100).toFixed(1));p.role.depthRank=depth?.rank||null;p.role.roleSource=depthStarter?'ESPN DEPTH CHART':inferredStarter?'RECENT STARTER USAGE':'RECENCY + SEASON';
  if(p.injury?.week&&p.injury.week!==nextWeek)p.injury=null;
  const off=offenseProfiles[p.team]||{},oppDef=m.defense||{};
const expectedPlays=clamp(mean([off.plays||0,(oppDef.passAtt||0)+(oppDef.carries||0)]),50,72);
const basePassRate=clamp(off.passRate||.55,.44,.68),oppPassRate=(oppDef.passAtt||0)+(oppDef.carries||0)?(oppDef.passAtt||0)/((oppDef.passAtt||0)+(oppDef.carries||0)):basePassRate;
const expectedPassRate=clamp(.7*basePassRate+.3*oppPassRate,.42,.70);
const passVolFactor=clamp((oppDef.passAtt||league.passAtt||1)/(league.passAtt||1),.9,1.1);
const rushVolFactor=clamp((oppDef.carries||league.carries||1)/(league.carries||1),.9,1.1);
const targetVolFactor=clamp((oppDef.targets||league.targets||1)/(league.targets||1),.9,1.1);
const rawPassEffFactor=clamp(oppDef.passFactor||1,.9,1.1),rushEffFactor=clamp(oppDef.rushFactor||1,.9,1.1);
const adv=oppDef.advanced;
const epaFactor=adv?clamp(1+(adv.passEpa-leagueAdv.passEpa)*.35,.90,1.10):1;
const successFactor=adv?clamp(1+(adv.successRate-leagueAdv.successRate)*.006,.94,1.06):1;
const sackFactor=adv?clamp(1-(adv.sackRate-leagueAdv.sackRate)*.008,.94,1.06):1;
const explosiveFactor=adv?clamp(1+(adv.explosiveRate-leagueAdv.explosiveRate)*.004,.96,1.04):1;
const advancedPassFactor=adv?clamp(1+.45*(epaFactor-1)+.25*(successFactor-1)+.20*(sackFactor-1)+.10*(explosiveFactor-1),.91,1.09):rawPassEffFactor;
const passEffFactor=clamp(.25*rawPassEffFactor+.75*advancedPassFactor,.91,1.09);
const expectedAtt=clamp(expectedPlays*expectedPassRate*(.85+.15*passVolFactor),20,48);
const expectedCarries=clamp(expectedPlays*(1-expectedPassRate)*(.85+.15*rushVolFactor),15,38);
const teamTargetRate=off.attempts?clamp((off.targets||off.attempts)/off.attempts,.75,1.05):1;
const expectedTargets=clamp(expectedAtt*teamTargetRate*(.9+.1*targetVolFactor),15,45);
const attShare=projectedAttemptShare,carryShare=projectedCarryShare,targetShare=projectedTargetShare;
let playerVolume=0,firstProjection=0,projectedStats={};
if(p.pos==='QB'){
 const starterRole=depthStarter||inferredStarter;
 const roleAttempts=clamp(p.model.starterAttemptBase||31,20,42);
 const starterExpectedAtt=clamp(.65*roleAttempts+.35*expectedAtt,20,44);
 playerVolume=starterRole?starterExpectedAtt:expectedAtt*attShare;
 const qbMatchupEff=clamp(passEffFactor,.91,1.09);
 const passYards=playerVolume*p.model.passYPA*qbMatchupEff;
 const rushAttempts=p.advanced.secondary;
 const rushYards=p.passing.rush*(expectedPlays/(off.plays||expectedPlays));
 firstProjection=passYards;
 p.role.expectedStarterAttempts=Number(starterExpectedAtt.toFixed(1));
 projectedStats={passAttempts:Number(playerVolume.toFixed(1)),passYards:Number(passYards.toFixed(1)),rushAttempts:Number(rushAttempts.toFixed(1)),rushYards:Number(rushYards.toFixed(1)),calibratedYPA:Number(p.model.passYPA.toFixed(2)),matchupYPA:Number((p.model.passYPA*qbMatchupEff).toFixed(2))}
}else if(p.pos==='RB'){
 const expCarries=expectedCarries*carryShare;
 const expTargets=expectedTargets*targetShare;
 const rushYards=expCarries*p.model.rushYPC*(.75+.25*rushEffFactor);
 const receptions=expTargets*(p.model.catchRate/100);
 const recYards=expTargets*p.model.recYPT*(.8+.2*passEffFactor);
 playerVolume=expCarries;firstProjection=rushYards;
 projectedStats={carries:Number(expCarries.toFixed(1)),rushYards:Number(rushYards.toFixed(1)),targets:Number(expTargets.toFixed(1)),receptions:Number(receptions.toFixed(1)),recYards:Number(recYards.toFixed(1))}
}else{
 const expTargets=expectedTargets*targetShare;
 const receptions=expTargets*(p.model.catchRate/100);
 const recYards=expTargets*p.model.recYPT*(.8+.2*passEffFactor);
 playerVolume=expTargets;firstProjection=recYards;
 projectedStats={targets:Number(expTargets.toFixed(1)),receptions:Number(receptions.toFixed(1)),recYards:Number(recYards.toFixed(1))}
}
const factor=p.pos==='RB'?rushEffFactor:passEffFactor;
const base=p.pos==='QB'?p.passing.yds:p.pos==='RB'?p.rushing.yds:p.receiving.yds;
p.matchup={projectionStatus:m.status==='FINAL'?'FINAL':'MATCHUP ADJUSTED',status:m.status,bye:false,opponent:m.opponent,home:m.home,venue:m.venue,weather:{status:(m.venue?.roof||'').toLowerCase().includes('dome')?'CONTROLLED':'NOT CONNECTED',wind:null,temp:null,precip:null},factor:Number(factor.toFixed(3)),grade:factor>=1.05?'FAVORABLE':factor<=.95?'TOUGH':'NEUTRAL',baseline:Number(base.toFixed(1)),contextYards:Number((base*factor).toFixed(1)),defense:m.defense,environment:{expectedPlays:Number(expectedPlays.toFixed(1)),passRate:Number((expectedPassRate*100).toFixed(1)),teamAttempts:Number(expectedAtt.toFixed(1)),teamCarries:Number(expectedCarries.toFixed(1)),teamTargets:Number(expectedTargets.toFixed(1)),playerVolume:Number(playerVolume.toFixed(1)),passVolumeFactor:Number(passVolFactor.toFixed(3)),rushVolumeFactor:Number(rushVolFactor.toFixed(3)),targetVolumeFactor:Number(targetVolFactor.toFixed(3)),efficiencyFactor:Number(factor.toFixed(3)),rawPassFactor:Number(rawPassEffFactor.toFixed(3)),advancedPassFactor:Number(advancedPassFactor.toFixed(3))},projection:Number(firstProjection.toFixed(1)),projectedStats}}const upcoming=slate.map(g=>({week:n(g.week),away:g.away_team,home:g.home_team,status:(g.away_score!==''&&g.home_score!==''?'FINAL':'UPCOMING'),start:g.gameday+' '+g.gametime,stadium:g.stadium,roof:g.roof,surface:g.surface,awayDefense:defenseProfiles[g.away_team]||null,homeDefense:defenseProfiles[g.home_team]||null}));
// Walk-forward validation: each test week sees only earlier current-season games.
const validationRows=[];
const statFor=(r,pos)=>pos==='QB'?n(r.passing_yards):pos==='RB'?n(r.rushing_yards):n(r.receiving_yards);
const volFor=(r,pos)=>pos==='QB'?n(r.attempts):pos==='RB'?n(r.carries):n(r.targets);
for(const testWeek of scheduleWeeks.filter(w=>w>=2&&w<=maxWeek)){
 const train=allSeasonStats.filter(r=>n(r.week)<testWeek);
 const actual=allSeasonStats.filter(r=>n(r.week)===testWeek);
 const tw={};for(const r of train){const t=r.recent_team||r.team,k=t+'-'+n(r.week);tw[k]??={att:0,carries:0,targets:0};tw[k].att+=n(r.attempts);tw[k].carries+=n(r.carries);tw[k].targets+=n(r.targets)}
 const teams={};for(const r of train){const t=r.recent_team||r.team,w=n(r.week),k=t+'-'+w;teams[k]??={team:t,att:0,carries:0,targets:0};teams[k].att+=n(r.attempts);teams[k].carries+=n(r.carries);teams[k].targets+=n(r.targets)}
 const teamHist={};for(const x of Object.values(teams))(teamHist[x.team]??=[]).push(x);
 const pBy={};for(const r of train){const id=r.player_id||r.player_name;if(id)(pBy[id]??=[]).push(r)}
 const actualBy={};for(const r of actual){const id=r.player_id||r.player_name;if(id)actualBy[id]=r}
 for(const [id,rows0] of Object.entries(pBy)){
   const rows=[...rows0].sort((a,b)=>n(a.week)-n(b.week)),last=rows.at(-1),pos=last.position_group||last.position;
   if(!['QB','RB','WR','TE'].includes(pos)||!actualBy[id])continue;
   const ar=actualBy[id],team=last.recent_team||last.team,trs=teamHist[team]||[];if(!trs.length)continue;
   const avg=k=>mean(rows.map(r=>n(r[k]))),prior=prevBy[id]||[],pavg=k=>mean(prior.map(r=>n(r[k])));
   const share=(key,den)=>mean(rows.map(r=>{const z=tw[(r.recent_team||r.team)+'-'+n(r.week)]||{};return z[den]?n(r[key])/z[den]:0}));
   const curGames=rows.length,ew=clamp((6-curGames)/8,.15,.55),sh=(cur,pr,fb)=>cur*(1-ew)+(pr>0?pr:fb)*ew;
   const attempts=avg('attempts'),carries0=avg('carries'),targets0=avg('targets');
   const ypa=sh(attempts?avg('passing_yards')/attempts:0,pavg('attempts')?pavg('passing_yards')/pavg('attempts'):0,7);
   const ypc=sh(carries0?avg('rushing_yards')/carries0:0,pavg('carries')?pavg('rushing_yards')/pavg('carries'):0,4.2);
   const ypt=sh(targets0?avg('receiving_yards')/targets0:0,pavg('targets')?pavg('receiving_yards')/pavg('targets'):0,7.5);
   const teamAtt=mean(trs.map(x=>x.att)),teamCar=mean(trs.map(x=>x.carries)),teamTgt=mean(trs.map(x=>x.targets));
   let projection=0;
   if(pos==='QB')projection=teamAtt*share('attempts','att')*ypa;
   else if(pos==='RB')projection=teamCar*share('carries','carries')*ypc;
   else projection=teamTgt*share('targets','targets')*ypt;
   const actualY=statFor(ar,pos),baseline=mean(rows.map(r=>statFor(r,pos)));
   if(!Number.isFinite(projection)||!Number.isFinite(actualY))continue;
   validationRows.push({week:testWeek,id,name:last.player_display_name||last.player_name,pos,team,projection,actual:actualY,baseline,error:projection-actualY,baselineError:baseline-actualY})
 }
}
const metric=a=>{if(!a.length)return{n:0,mae:0,rmse:0,bias:0,baselineMae:0,improvement:0};const mae=mean(a.map(x=>Math.abs(x.error))),rmse=Math.sqrt(mean(a.map(x=>x.error*x.error))),bias=mean(a.map(x=>x.error)),bmae=mean(a.map(x=>Math.abs(x.baselineError)));return{n:a.length,mae:Number(mae.toFixed(1)),rmse:Number(rmse.toFixed(1)),bias:Number(bias.toFixed(1)),baselineMae:Number(bmae.toFixed(1)),improvement:Number((bmae?100*(bmae-mae)/bmae:0).toFixed(1))}};
const validation={method:'walk-forward',weeks:scheduleWeeks.filter(w=>w>=2&&w<=maxWeek),overall:metric(validationRows),byPosition:Object.fromEntries(['QB','RB','WR','TE'].map(pos=>[pos,metric(validationRows.filter(x=>x.pos===pos))])),byWeek:Object.fromEntries(scheduleWeeks.filter(w=>w>=2&&w<=maxWeek).map(w=>[w,metric(validationRows.filter(x=>x.week===w))])),worst:[...validationRows].sort((a,b)=>Math.abs(b.error)-Math.abs(a.error)).slice(0,12).map(x=>({...x,projection:Number(x.projection.toFixed(1)),baseline:Number(x.baseline.toFixed(1)),error:Number(x.error.toFixed(1))}))};
res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');res.status(200).json({source:'nflverse',season,asOf:new Date().toISOString(),throughWeek:maxWeek,projectionWeek:nextWeek,slateGames:slate.length,scheduleAsOf:todayET,playerCount:players.length,validation,league,offenseProfiles,defenseProfiles,pbpStatus:{connected:pbp.length>0,plays:pbp.length},players,upcoming})}catch(e){res.status(500).json({error:String(e.message||e)})}}
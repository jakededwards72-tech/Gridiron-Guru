import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import'./style.css';

type P=any;
type D=any;
type VMetric={n:number,mae:number,rmse:number,bias:number,baselineMae:number,improvement:number};

const f=(x:any,d=1)=>Number.isFinite(Number(x))?Number(x).toFixed(d):'—';
const navItems=[
  {key:'Projections',label:'Projections',icon:'◎'},
  {key:'Player Lab',label:'Players',icon:'⌕'},
  {key:'Games',label:'Games',icon:'▦'},
  {key:'Validation',label:'Accuracy',icon:'✓'},
  {key:'Model',label:'Model',icon:'⚙'}
];

function App(){
  const[tab,setTab]=useState('Player Lab');
  const[data,setData]=useState<D|null>(null);
  const[err,setErr]=useState('');
  const[q,setQ]=useState('');
  const[pos,setPos]=useState('ALL');

  useEffect(()=>{
    fetch('/api/nfl',{cache:'no-store'})
      .then(r=>r.json())
      .then(x=>x.error?setErr(x.error):setData(x))
      .catch(e=>setErr(String(e)));
  },[]);

  const players=useMemo(()=>data?.players
    ?.filter((p:P)=>(pos==='ALL'||p.pos===pos)&&p.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0,80)||[],[data,q,pos]);

  const activePlayers=useMemo(()=>[...(data?.players||[])]
    .filter((p:P)=>p.matchup&&!p.matchup.bye&&p.matchup.status!=='FINAL')
    .sort((a:P,b:P)=>(b.matchup?.projection||0)-(a.matchup?.projection||0)),[data]);

  return <div className="appShell">
    <header className="appHeader">
      <div className="brand"><b>GRIDIRON <i>GURU</i></b><small>NFL PREDICTION INTELLIGENCE</small></div>
      <div className="weekBadge">W{data?.projectionWeek??'—'}</div>
    </header>

    <nav className="topNav">{navItems.map(x=><button key={x.key} className={tab===x.key?'active':''} onClick={()=>setTab(x.key)}>{x.label}</button>)}</nav>

    <main>
      {err&&<div className="error">Data feed error: {err}</div>}

      {tab==='Player Lab'&&<>
        <CompactHero data={data} title="Player projections" subtitle="Search any player. The model details stay out of the way until you want them."/>
        <PlayerFilters q={q} setQ={setQ} pos={pos} setPos={setPos}/>
        <div className="sectionTitle"><h2>Players</h2><span>{players.length} shown</span></div>
        {!data&&!err&&<Loading/>}
        <div className="playerList">{players.map((p:P)=><PlayerCard key={p.id||p.name} p={p} week={data?.projectionWeek}/>)}</div>
      </>}

      {tab==='Projections'&&<>
        <CompactHero data={data} title={`Week ${data?.projectionWeek??'—'} projections`} subtitle="Clean forecast board. No sportsbook lines are used to create these numbers."/>
        <PlayerFilters q={q} setQ={setQ} pos={pos} setPos={setPos}/>
        <div className="playerList">{activePlayers.filter((p:P)=>(pos==='ALL'||p.pos===pos)&&p.name.toLowerCase().includes(q.toLowerCase())).slice(0,100).map((p:P)=><PlayerCard key={p.id||p.name} p={p} week={data?.projectionWeek}/>)}</div>
      </>}

      {tab==='Games'&&<>
        <CompactHero data={data} title="Game environments" subtitle="The game layer feeds player volume, efficiency and matchup context."/>
        <div className="gameList">{data?.upcoming?.map((g:any)=><GameCard key={g.away+g.home} g={g}/>)}</div>
      </>}

      {tab==='Validation'&&<>
        <CompactHero data={data} title="Model accuracy" subtitle="Walk-forward results use only information that was available before each game."/>
        {data?.validation?<ValidationView validation={data.validation}/>:<Loading/>}
      </>}

      {tab==='Model'&&<>
        <CompactHero data={data} title="Matchup Intelligence 2.0" subtitle="The engine stays deep. The everyday interface stays simple."/>
        <section className="modelCard">
          <h3>Projection pipeline</h3>
          <p>Expected starter and availability → snap-informed role → team play environment → player opportunity → shrunk efficiency → opponent and position matchup → touchdown environment.</p>
          <p className="muted">Sportsbook prices remain disconnected from the prediction engine. Live route participation and live forecast weather remain explicit data gaps.</p>
        </section>
        {data?.dataStatus&&<section className="feedGrid">
          <Feed label="Play by play" value={data.dataStatus.pbp}/>
          <Feed label="Snap counts" value={data.dataStatus.snaps}/>
          <Feed label="PFR passing" value={data.dataStatus.pfrPass}/>
          <Feed label="PFR rushing" value={data.dataStatus.pfrRush}/>
          <Feed label="PFR receiving" value={data.dataStatus.pfrRec}/>
          <Feed label="Market inputs" value={0} disconnected/>
        </section>}
      </>}
    </main>

    <nav className="bottomNav">{navItems.map(x=><button key={x.key} className={tab===x.key?'active':''} onClick={()=>setTab(x.key)}><span>{x.icon}</span><small>{x.label}</small></button>)}</nav>
  </div>
}

function CompactHero({data,title,subtitle}:{data:D|null,title:string,subtitle:string}){
  return <section className="compactHero">
    <div><small>WEEK {data?.projectionWeek??'—'} · DATA THROUGH W{data?.throughWeek??'—'}</small><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="liveDot"><span/> LIVE</div>
  </section>
}

function PlayerFilters({q,setQ,pos,setPos}:{q:string,setQ:(v:string)=>void,pos:string,setPos:(v:string)=>void}){
  return <div className="filterWrap">
    <div className="searchBox"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search player"/></div>
    <div className="posTabs">{['ALL','QB','RB','WR','TE'].map(x=><button key={x} className={pos===x?'active':''} onClick={()=>setPos(x)}>{x}</button>)}</div>
  </div>
}

function PlayerCard({p,week}:{p:P,week:number}){
  const m=p.matchup,ps=m?.projectedStats||{};
  const out=String(p.injury?.status||'').toLowerCase().includes('out');
  const role=p.role?.expectedRole||p.role?.status||'ROLE PENDING';
  const matchup=m?.grade&&m.grade!=='BYE'?m.grade:'';
  const totalTd=(ps.rushTDs||0)+(ps.recTDs||0);

  return <article className="playerCard">
    <div className="playerHead">
      <div>
        <h3>{p.name}</h3>
        <p>{p.pos} · {p.team}{m?.opponent?` vs ${m.opponent}`:''}</p>
      </div>
      <div className="chips">
        {role&&<span className="chip">{role}</span>}
        {matchup&&<span className={`chip matchupChip ${matchup.toLowerCase()}`}>{matchup}</span>}
      </div>
    </div>

    {p.injury&&<div className={`injuryBanner ${out?'out':''}`}><b>{p.injury.status}</b><span>{[p.injury.detail,p.injury.practice].filter(Boolean).join(' · ')||'Official injury report listing'}</span></div>}

    {m?.bye?<div className="emptyState"><b>Week {week} bye</b><span>No game scheduled.</span></div>
    :m?.status==='FINAL'?<div className="emptyState"><b>Week {week} final</b><span>This game has already been played.</span></div>
    :m?<>
      <div className={`projectionStats ${p.pos.toLowerCase()}`}>
        {p.pos==='QB'?<>
          <ProjStat value={f(ps.passYards)} label="Pass Yds"/>
          <ProjStat value={f(ps.passAttempts)} label="Pass Att"/>
          <ProjStat value={f(ps.passTDs)} label="Pass TD"/>
          <ProjStat value={f(ps.rushYards)} label="Rush Yds"/>
        </>:p.pos==='RB'?<>
          <ProjStat value={f(ps.rushYards)} label="Rush Yds"/>
          <ProjStat value={f(ps.carries)} label="Carries"/>
          <ProjStat value={f(ps.recYards)} label="Rec Yds"/>
          <ProjStat value={f(ps.receptions)} label="Rec"/>
          <ProjStat value={f(ps.targets)} label="Targets"/>
          <ProjStat value={f(totalTd)} label="Total TD"/>
        </>:<>
          <ProjStat value={f(ps.recYards)} label="Rec Yds"/>
          <ProjStat value={f(ps.receptions)} label="Rec"/>
          <ProjStat value={f(ps.targets)} label="Targets"/>
          <ProjStat value={f(ps.recTDs)} label="Rec TD"/>
        </>}
      </div>

      <div className="quickContext">
        <span>{m.home?'Home':'Away'}</span>
        <span>{m.weather?.status==='CONTROLLED'?'Indoor/controlled':m.weather?.status||'Weather pending'}</span>
        {m.rest?<span>{m.rest}d rest</span>:null}
      </div>

      <details className="analysisDetails">
        <summary><span><b>Why this projection?</b><small>Role, matchup, usage and model inputs</small></span><i>＋</i></summary>
        <div className="analysisBody">
          <AnalysisSection title="Role & usage">
            <Audit label="Projected role" value={role}/>
            <Audit label={p.pos==='QB'?'Attempt share':p.pos==='RB'?'Carry share':'Target share'} value={f(p.pos==='QB'?p.role?.projectedAttemptShare:p.pos==='RB'?p.role?.projectedCarryShare:p.role?.projectedTargetShare)+'%'}/>
            <Audit label="Snap share" value={p.usage?.snapGames?f(p.usage.recentSnapPct)+'%':'Pending'}/>
            <Audit label="Snap trend" value={p.usage?.snapGames?(p.usage.snapTrend>0?'+':'')+f(p.usage.snapTrend)+'%':'—'}/>
            <Audit label="Role source" value={p.role?.roleSource||'Historical usage'}/>
            <Audit label="Role confidence" value={(p.role?.confidence??'—')+'/100'}/>
          </AnalysisSection>

          <AnalysisSection title="Game & matchup">
            <Audit label="Expected team plays" value={f(m.environment?.expectedPlays)}/>
            <Audit label="Expected pass rate" value={f(m.environment?.passRate)+'%'}/>
            <Audit label="Expected player volume" value={f(m.environment?.playerVolume)}/>
            <Audit label="Expected player snaps" value={f(m.intelligence?.expectedPlayerSnaps)}/>
            <Audit label="Position volume" value={f(m.intelligence?.positionVolumeFactor)+'×'}/>
            <Audit label="Position efficiency" value={f(m.intelligence?.positionEfficiencyFactor)+'×'}/>
            <Audit label="TD environment" value={f(m.intelligence?.tdEnvironmentFactor)+'×'}/>
            <Audit label="Opponent EPA/play" value={f(m.defense?.advanced?.epaPerPlay,2)}/>
          </AnalysisSection>

          {p.pos==='QB'&&<AnalysisSection title="Quarterback efficiency">
            <Audit label="Starter attempt base" value={f(p.model?.starterAttemptBase)}/>
            <Audit label="Projected attempts" value={f(ps.passAttempts)}/>
            <Audit label="Calibrated Y/A" value={f(ps.calibratedYPA||p.model?.passYPA)}/>
            <Audit label="Matchup Y/A" value={f(ps.matchupYPA||p.model?.passYPA)}/>
          </AnalysisSection>}

          <AnalysisSection title="Recent game evidence">
            <div className="recentStrip">{p.trend?.map((g:any)=><span key={g.week}><small>W{g.week}</small><b>{p.pos==='QB'?g.pass:p.pos==='RB'?g.rush:g.rec}</b><em>{p.pos==='QB'?'pass yds':p.pos==='RB'?'rush yds':'rec yds'}</em></span>)}</div>
          </AnalysisSection>

          <p className="methodNote">Projection flow: role and snaps → team environment → opportunity → shrunk player efficiency → position-specific defense and play-by-play matchup → touchdown environment.</p>
        </div>
      </details>
    </>:<div className="emptyState"><span>Projection pending.</span></div>}
  </article>
}

function ProjStat({value,label}:{value:string,label:string}){
  return <div><strong>{value}</strong><small>{label}</small></div>
}

function AnalysisSection({title,children}:{title:string,children:React.ReactNode}){
  return <section className="analysisSection"><h4>{title}</h4><div className="auditGrid">{children}</div></section>
}

function Audit({label,value}:{label:string,value:string}){
  return <div className="auditItem"><small>{label}</small><b>{value}</b></div>
}

function GameCard({g}:{g:any}){
  return <article className="gameCard">
    <div className="gameTeams"><div><small>AWAY</small><b>{g.away}</b></div><span>@</span><div><small>HOME</small><b>{g.home}</b></div></div>
    <p>{g.start} · {g.stadium||'Venue pending'}</p>
    <div className="gameQuick">
      <span><small>Expected QBs</small><b>{g.awayQb||'TBD'} / {g.homeQb||'TBD'}</b></span>
      <span><small>Rest</small><b>{g.away} {g.awayRest||'—'}d · {g.home} {g.homeRest||'—'}d</b></span>
      <span><small>Environment</small><b>{g.roof==='dome'||g.roof==='closed'?'Controlled':g.temp!=null||g.wind!=null?`${g.temp??'—'}° · ${g.wind??'—'} mph`:'Pending'}</b></span>
    </div>
    <details className="analysisDetails">
      <summary><span><b>Game model details</b><small>Pace, pass tendency and defensive efficiency</small></span><i>＋</i></summary>
      <div className="analysisBody"><div className="gameAudit">
        <Audit label={g.away+' plays'} value={f(g.awayOffense?.advanced?.playsPerGame)}/>
        <Audit label={g.home+' plays'} value={f(g.homeOffense?.advanced?.playsPerGame)}/>
        <Audit label={g.away+' neutral pass'} value={f(g.awayOffense?.advanced?.neutralPassRate)+'%'}/>
        <Audit label={g.home+' neutral pass'} value={f(g.homeOffense?.advanced?.neutralPassRate)+'%'}/>
        <Audit label={g.away+' DEF EPA'} value={f(g.awayDefense?.advanced?.epaPerPlay,2)}/>
        <Audit label={g.home+' DEF EPA'} value={f(g.homeDefense?.advanced?.epaPerPlay,2)}/>
      </div></div>
    </details>
  </article>
}

function ValidationView({validation}:{validation:any}){
  return <>
    <section className="accuracyHero">
      <div><small>PLAYER-GAMES</small><strong>{validation.overall.n}</strong></div>
      <div><small>MODEL MAE</small><strong>{f(validation.overall.mae)}</strong></div>
      <div><small>VS BASELINE</small><strong>{validation.overall.improvement>0?'+':''}{f(validation.overall.improvement)}%</strong></div>
    </section>
    <div className="accuracyList">{Object.entries(validation.byPosition||{}).map(([p,m]:any)=><div key={p}><b>{p}</b><span>MAE {f(m.mae)}</span><span>Bias {m.bias>0?'+':''}{f(m.bias)}</span><span>{m.improvement>0?'+':''}{f(m.improvement)}% vs baseline</span></div>)}</div>
    <details className="analysisDetails standalone">
      <summary><span><b>Full validation details</b><small>RMSE, week-by-week results and largest misses</small></span><i>＋</i></summary>
      <div className="analysisBody">
        <div className="validationGrid">{Object.entries(validation.byPosition||{}).map(([p,m]:any)=><div className="validationCard" key={p}><b>{p}</b><span>Sample {m.n}</span><span>MAE {f(m.mae)}</span><span>RMSE {f(m.rmse)}</span><span>Bias {m.bias>0?'+':''}{f(m.bias)}</span><span>Baseline {f(m.baselineMae)}</span></div>)}</div>
        <h4>Largest misses</h4>
        <div className="misses">{validation.worst?.map((x:any)=><div key={x.week+x.id}><span><b>{x.name}</b><small>W{x.week} · {x.pos}</small></span><span>Proj {f(x.projection)}</span><span>Actual {f(x.actual)}</span></div>)}</div>
      </div>
    </details>
  </>
}

function Feed({label,value,disconnected=false}:{label:string,value:number,disconnected?:boolean}){
  return <div><small>{label}</small><b className={disconnected?'off':''}>{disconnected?'Disconnected':value?`Connected · ${value}`:'Missing'}</b></div>
}

function Loading(){return <div className="loading">Loading projection data…</div>}

createRoot(document.getElementById('root')!).render(<App/>);

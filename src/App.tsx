import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Boxes, ChevronLeft, ChevronRight, CircleHelp, Clock3, Factory, FastForward, Gauge, Lightbulb, Pause, Play, Plus, RotateCcw, Shuffle, Sparkles, Trash2, Trophy, Upload, WandSparkles, Zap } from 'lucide-react';
import { example, optimized, quadratic, scheduleCost, seededInput, validate, type HullStep, type Input, type Result, type Step } from './algorithms';
import './experience.css';

type Tab = 'factory' | 'dp' | 'hull' | 'race' | 'guide';
const tabs: [Tab, string][] = [['factory','积木分批'],['dp','转移拼装'],['hull','凸壳拼线'],['race','算法竞速'],['guide','算法原理']];
const fmt = (v: bigint) => v.toLocaleString('zh-CN');
const batchText = (groups: number[][]) => groups.map(g => `[${g[0]}–${g.at(-1)}]`).join('  |  ');
const traceLimit = 60;

export default function App() {
  const [data, setData] = useState<Input>(example);
  const [cuts, setCuts] = useState<number[]>([2,3]);
  const [tab, setTab] = useState<Tab>('factory');
  const [slow, setSlow] = useState<Result>(() => quadratic(example));
  const [fast, setFast] = useState<Result>(() => optimized(example));
  const [stale, setStale] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(2026);
  const [randomN, setRandomN] = useState(8);
  const [activeBatch, setActiveBatch] = useState(-1);
  const workerRef = useRef<Worker | null>(null);
  const animationTimers = useRef<number[]>([]);
  const run = useMemo(() => { try { return scheduleCost(data, cuts); } catch { return null; } }, [data, cuts]);
  const currentFast = stale ? null : fast;
  const currentSlow = stale ? null : slow;
  const frames = tab === 'dp' ? currentSlow?.steps : tab === 'hull' ? currentFast?.hullSteps : [];

  useEffect(() => {
    if (!playing || !frames?.length) return;
    const timer = window.setInterval(() => setIdx(previous => {
      if (previous >= frames.length) { setPlaying(false); return previous; }
      return previous + 1;
    }), Math.round((tab === 'dp' ? 520 : 850) / speed));
    return () => window.clearInterval(timer);
  }, [playing, frames, speed, tab]);
  useEffect(() => () => { workerRef.current?.terminate(); animationTimers.current.forEach(window.clearTimeout); }, []);

  function edit(next: Input, nextCuts = cuts) {
    workerRef.current?.terminate(); workerRef.current = null; setBusy(false);
    animationTimers.current.forEach(window.clearTimeout); animationTimers.current = [];
    setData(next); setCuts(nextCuts); setStale(true); setError(''); setIdx(0); setPlaying(false); setActiveBatch(-1);
  }
  function calculate() {
    try {
      validate(data); setError(''); setBusy(true); setPlaying(false); setIdx(0);
      workerRef.current?.terminate();
      if (data.jobs.length > traceLimit) {
        const worker = new Worker(new URL('./compute.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;
        worker.onmessage = event => {
          setBusy(false);
          if (event.data.error) { setError(event.data.error); return; }
          setSlow(event.data.slow); setFast(event.data.fast); setStale(false);
          worker.terminate(); workerRef.current = null;
        };
        worker.onerror = () => { setBusy(false); setError('计算线程启动失败，请重试'); worker.terminate(); workerRef.current = null; };
        worker.postMessage(data);
      } else {
        const q = quadratic(data), h = optimized(data);
        if (q.cost !== h.cost) throw Error('两种算法结果不一致');
        q.elapsedMs = quadratic(data, false).elapsedMs;
        h.elapsedMs = optimized(data, false).elapsedMs;
        setSlow(q); setFast(h); setStale(false); setBusy(false);
      }
    } catch (e) { setBusy(false); setError(e instanceof Error ? e.message : String(e)); }
  }
  function importFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const values = String(reader.result).trim().split(/\s+/).map(Number);
        const n = values[0];
        if (!Number.isInteger(n) || n < 1 || values.length !== 2 + 2 * n) throw Error('input.txt 格式错误');
        const next: Input = { S: values[1], jobs: Array.from({ length: n }, (_, i) => ({ t: values[2 + 2*i], f: values[3 + 2*i] })) };
        validate(next); edit(next, []);
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    };
    reader.readAsText(file);
  }
  function generate() {
    try { const next = seededInput(seed, randomN); edit(next, []); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  function resetExample() {
    edit(example, [2, 3]);
    setSlow(quadratic(example));
    setFast(optimized(example));
    setStale(false);
  }
  function playBatches() {
    if (!run) return;
    animationTimers.current.forEach(window.clearTimeout);
    setActiveBatch(0);
    animationTimers.current = run.groups.map((_, i) => window.setTimeout(() => setActiveBatch(i), i * 900));
    animationTimers.current.push(window.setTimeout(() => setActiveBatch(-1), run.groups.length * 900 + 300));
  }
  function applyOptimal() {
    if (!currentFast) return;
    setCuts(currentFast.batches.slice(0,-1).map(group => group.at(-1)!));
  }
  const shownJobs = data.jobs.slice(0, 36);
  const dpStep = idx > 0 ? currentSlow?.steps[idx - 1] : undefined;
  const hullStep = idx > 0 ? currentFast?.hullSteps[idx - 1] : undefined;

  return <main>
    <header className="top"><nav>{tabs.map(([key,label]) => <button key={key} className={tab===key?'active':''} onClick={() => { setTab(key); setIdx(0); setPlaying(false); }}>{label}</button>)}</nav><div className="live"><i/> 今天也要加油呀</div></header>
    <section className="hero"><div className="hero-copy"><h1>把任务拼成<br/><em>最优批次。</em></h1><p>每块积木都是一个作业。亲手移动分批边界，看完成时间、总费用与最优解怎样改变。</p><button className="primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({behavior:'smooth'})}>开始拼批次 <ArrowRight size={17}/></button><div className="hero-meta"><span><b>01</b> 动手分批</span><span><b>02</b> 逐步推导</span><span><b>03</b> 凸壳加速</span></div></div><HeroArt jobs={data.jobs} S={data.S}/></section>
    <div className="stats"><div><span>当前作业</span><b>{data.jobs.length}<small> JOBS</small></b></div><div><span>启动时间</span><b>{data.S}<small> UNIT</small></b></div><div><span>最优费用</span><b className="lime">{currentFast?fmt(currentFast.cost):'—'}<small> COST</small></b></div><div><span>优化复杂度</span><b>O(n)<small> AMORTIZED</small></b></div></div>
    <section id="workspace" className="workspace"><aside className="side"><div className="panel-head"><div><span className="eyebrow">WORKBENCH / 01</span><h2>任务材料盒</h2></div><Factory/></div><label className="input-label">批次启动时间 S<input aria-label="批次启动时间 S" type="number" min="0" value={data.S} onChange={e => edit({...data,S:Number(e.target.value)})}/></label><div className="jobs-title"><span>作业序列</span><button onClick={() => edit({...data,jobs:[...data.jobs,{t:1,f:1}]})}><Plus size={14}/> 添加作业</button></div><div className="job-list">{shownJobs.map((job,i) => <div className="job-row" key={i}><span className="job-no">{String(i+1).padStart(2,'0')}</span><label>t<input aria-label={`任务 ${i+1} 时间`} type="number" min="0" value={job.t} onChange={e => edit({...data,jobs:data.jobs.map((item,j) => j===i?{...item,t:Number(e.target.value)}:item)})}/></label><label>f<input aria-label={`任务 ${i+1} 费用系数`} type="number" min="0" value={job.f} onChange={e => edit({...data,jobs:data.jobs.map((item,j) => j===i?{...item,f:Number(e.target.value)}:item)})}/></label><button className="icon-btn" aria-label={`删除任务 ${i+1}`} disabled={data.jobs.length===1} onClick={() => edit({...data,jobs:data.jobs.filter((_,j)=>j!==i)},cuts.filter(c=>c!==i+1).map(c=>c>i+1?c-1:c))}><Trash2 size={14}/></button></div>)}</div>{data.jobs.length>36&&<p className="side-note">当前显示前 36 项，共 {data.jobs.length} 项。可导入文件管理完整数据。</p>}
    <div className="random-box"><div><Shuffle size={14}/> 随机试验</div><div className="random-fields"><label>种子<input aria-label="随机种子" type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))}/></label><label>任务数<input aria-label="随机任务数" type="number" min="1" max="5000" value={randomN} onChange={e=>setRandomN(Number(e.target.value))}/></label></div><button onClick={generate}>生成相同数据可复现实验 <ArrowRight size={13}/></button></div>
    <div className="actions"><button className="primary wide" disabled={busy} onClick={calculate}><Zap size={16}/>{busy?'正在计算…':'计算最优方案'}</button><label className="upload"><Upload size={15}/> 导入 input.txt<input type="file" accept=".txt,text/plain" onChange={e=>importFile(e.target.files?.[0])}/></label><button className="ghost" onClick={resetExample}><RotateCcw size={14}/> 重置示例</button></div>{error&&<div className="error" role="alert">{error}</div>}</aside>
    <div className="mainpanel"><div className="tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'selected':''} onClick={()=>{setTab(key);setIdx(0);setPlaying(false)}}>{label}</button>)}</div>
      {tab==='factory'&&<FactoryView data={data} cuts={cuts} setCuts={setCuts} run={run} fast={currentFast} activeBatch={activeBatch} shownJobs={shownJobs.length} playBatches={playBatches} applyOptimal={applyOptimal} calculate={calculate}/>}
      {tab==='dp'&&<DpView result={currentSlow} step={dpStep} idx={idx} data={data} onCompute={calculate} control={<Controls idx={idx} max={currentSlow?.steps.length||0} playing={playing} setIdx={setIdx} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed}/>}/>}
      {tab==='hull'&&<HullView result={currentFast} step={hullStep} idx={idx} data={data} onCompute={calculate} control={<Controls idx={idx} max={currentFast?.hullSteps.length||0} playing={playing} setIdx={setIdx} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed}/>}/>}
      {tab==='race'&&<RaceView slow={currentSlow} fast={currentFast} busy={busy} calculate={calculate}/>}
      {tab==='guide'&&<Guide/>}
    </div></section><footer><span>LEGO BatchLab <i>·</i> 积木算法课堂</span><span>固定顺序 · 连续分批 · 精确求解</span></footer>
  </main>;
}

function HeroArt({jobs,S}:{jobs:Input['jobs'];S:number}) { return <div className="hero-brick-board"><div className="board-top"><span>BRICK ASSEMBLY / {String(jobs.length).padStart(2,'0')} JOBS</span><b>S = {S}</b></div><div className="board-track">{jobs.slice(0,5).map((job,i)=><div className={`hero-brick lego-${i%4}`} key={i} style={{height:`${68+Math.min(30,Math.log2(job.f+1)*9)}px`}}><div className="stud-row"><i/><i/></div><b>J{i+1}</b><small>t {job.t} · f {job.f}</small></div>)}</div><div className="board-bottom"><span>固定顺序 → 连续分批</span><strong>拼出最优解</strong></div></div> }

function CompletionMap({data,run}:{data:Input;run:ReturnType<typeof scheduleCost>}) {
  const count=Math.min(20,data.jobs.length),maximum=Number(run.finishTime)||1;
  return <div className="completion-map"><div className="map-caption"><Clock3 size={15}/><b>完成时刻地图</b><span>同一批的积木同时落在同一条时间线上</span></div><div className="completion-bars">{data.jobs.slice(0,count).map((_,i)=>{const group=run.groups.findIndex(g=>g.includes(i+1));return <div className="completion-column" key={i}><b>{fmt(run.completion[i])}</b><div className={`completion-bar lego-${group%4}`} style={{height:`${Math.max(10,Math.round(Number(run.completion[i])/maximum*80))}px`}}/><small>J{i+1}</small></div>})}</div>{data.jobs.length>count&&<small>显示前 {count} 项，费用仍按全部作业计算。</small>}</div>;
}

function DpAssembly({data,step,result}:{data:Input;step:Step|undefined;result:Result}) {
  if(!step)return <div className="assembly-idle"><Boxes size={23}/><span>点击“下一步”，把最后一批的积木逐块拼到决策台。</span></div>;
  const batchTime=BigInt(data.S)+data.jobs.slice(step.j,step.i).reduce((sum,job)=>sum+BigInt(job.t),0n);
  const remainingWeight=data.jobs.slice(step.j).reduce((sum,job)=>sum+BigInt(job.f),0n);
  return <div className="candidate-assembly"><div className="assembly-heading"><b>候选方案 j = {step.j}</b><span>积木 {step.j+1}–{step.i} 组成最后一批</span></div><div className="assembly-bricks">{data.jobs.slice(0,Math.min(22,data.jobs.length)).map((job,k)=><div key={k} className={`assembly-brick ${k<step.j?'prefix':k<step.i?`lego-${k%4}`:'waiting'}`}><div className="stud-row"><i/><i/></div><b>J{k+1}</b><small>{job.t} / {job.f}</small></div>)}</div><div className="assembly-legend"><span><i/>已确定前缀</span><span><i/>正在试验的批次</span><span><i/>尚未处理</span></div><div className="assembly-math"><div><small>前缀最优费用 dp[{step.j}]</small><b>{fmt(result.dp[step.j])}</b></div><strong>+</strong><div><small>本批耗时 S + Σt</small><b>{fmt(batchTime)}</b></div><strong>×</strong><div><small>受影响作业的 Σf</small><b>{fmt(remainingWeight)}</b></div><strong>=</strong><div className="assembly-total"><small>候选总费用</small><b>{fmt(step.candidate)}</b></div></div></div>;
}

function HullBricks({data,current}:{data:Input;current:number|undefined}) {
  return <div className="hull-brick-stage"><div className="hull-brick-caption"><b>作业积木 → 新 DP 状态 → 候选直线</b><span>{current?`第 ${current} 块积木正在生成查询 x`:'点击下一步开始拼线'}</span></div><div className="hull-brick-row">{data.jobs.slice(0,Math.min(18,data.jobs.length)).map((job,i)=><div key={i} className={`hull-mini-brick ${i+1===current?`lego-${i%4} active`:i+1<(current||0)?'processed':'waiting'}`}><div className="stud-row"><i/><i/></div><b>J{i+1}</b><small>{job.t}/{job.f}</small></div>)}</div></div>;
}

function FactoryView({data,cuts,setCuts,run,fast,activeBatch,shownJobs,playBatches,applyOptimal,calculate}:{data:Input;cuts:number[];setCuts:(next:number[])=>void;run:ReturnType<typeof scheduleCost>|null;fast:Result|null;activeBatch:number;shownJobs:number;playBatches:()=>void;applyOptimal:()=>void;calculate:()=>void}){
  const cutSet=new Set(cuts);
  return <><div className="section-title"><div><span className="eyebrow">LIVE SCHEDULING</span><h2>任务积木分批台</h2></div><span className="pill"><i/>亲手切分，实时计费</span></div><p className="muted">点击任务间的分隔线来改变批次。积木宽度映射执行时间 t，任务卡片直接显示费用系数 f。</p>
  <div className="conveyor"><div className="machine"><div className="machine-top">BATCH<br/>PRESS</div><div className="machine-mouth"/></div><div className="bricks-line">{data.jobs.slice(0,shownJobs).map((job,i)=>{const batch=run?.groups.findIndex(g=>g.includes(i+1))??-1;return <div className="unit-wrap" key={i}><motion.div layout className={`taskbrick color-${i%4} ${activeBatch===batch?'brick-running':''}`} style={{width:`${Math.max(72,Math.min(142,72+Math.log2(job.t+1)*18))}px`,height:`${76+Math.min(28,Math.log2(job.f+1)*9)}px`}}><div className="stud-row"><i/><i/></div><b>J{i+1}</b><small>t:{job.t} · f:{job.f}</small></motion.div>{i<shownJobs-1&&<button aria-label={`${i+1} 和 ${i+2} 之间${cutSet.has(i+1)?'取消':'添加'}分批边界`} aria-pressed={cutSet.has(i+1)} className={`cut ${cutSet.has(i+1)?'cut-on':''}`} onClick={()=>setCuts(cutSet.has(i+1)?cuts.filter(c=>c!==i+1):[...cuts,i+1])}><span/></button>}</div>})}</div></div>{data.jobs.length>shownJobs&&<p className="side-note">传送带展示前 {shownJobs} 项；全部 {data.jobs.length} 项参与计算。</p>}
  <div className="timeline"><span>START · 0</span><div/><span>{run?.groups.length??0} 批次 · FINISH {run?fmt(run.finishTime):'—'}</span></div>
  <div className="result-card"><div className="result-icon"><Trophy/></div><div><span>当前方案费用</span><strong>{run?fmt(run.cost):'—'}</strong></div><div className="result-divider"/><div><span>批次划分</span><strong className="batch-text">{run?batchText(run.groups):'输入有误'}</strong></div><div className="best-note">{fast&&run?(run.cost===fast.cost?'✦ 已达最优解':`距离最优 ${fmt(run.cost-fast.cost)}`):'可随时计算最优解'}</div></div>
  <div className="factory-tools"><button onClick={playBatches} disabled={!run}><Play size={14}/> 逐批运行</button><button onClick={fast?applyOptimal:calculate}><WandSparkles size={14}/> {fast?'套用最优方案':'计算最优方案'}</button></div>
  {run&&<CompletionMap data={data} run={run}/>}
  {run&&<div className="batch-cards">{run.groups.map((group,k)=><div key={k} className={`batch-card ${activeBatch===k?'is-active':''}`}><span>第 {k+1} 批 · 作业 {group[0]}–{group.at(-1)}</span><b>完成时刻 {fmt(run.completion[group[0]-1])}</b><small>本批费用 {fmt(group.reduce((sum,i)=>sum+run.contributions[i-1],0n))}</small></div>)}</div>}
  {fast&&<div className="optimal-row"><span><Sparkles size={15}/> 最优方案</span><b>{batchText(fast.batches)}</b><strong>{fmt(fast.cost)}</strong></div>}</>;
}

function Controls({idx,max,playing,setIdx,setPlaying,speed,setSpeed}:{idx:number;max:number;playing:boolean;setIdx:(v:number)=>void;setPlaying:(v:boolean)=>void;speed:number;setSpeed:(v:number)=>void}) { return <div className="controls"><button aria-label="重新开始" onClick={()=>{setIdx(0);setPlaying(false)}}><RotateCcw size={16}/></button><button aria-label="上一步" onClick={()=>{setPlaying(false);setIdx(Math.max(0,idx-1))}}><ChevronLeft/></button><button className="play" aria-label={playing?'暂停':'播放'} onClick={()=>setPlaying(!playing)}>{playing?<Pause/>:<Play/>}</button><button aria-label="下一步" onClick={()=>{setPlaying(false);setIdx(Math.min(max,idx+1))}}><ChevronRight/></button><input aria-label="动画进度" type="range" min="0" max={max} value={idx} onChange={e=>{setPlaying(false);setIdx(Number(e.target.value))}}/><small>{idx} / {max}</small><label className="speed">速度<select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="3">3×</option></select></label></div> }
function Empty({onCompute,large}:{onCompute:()=>void;large:boolean}) { return <div className="empty"><Activity/><p>{large?'大规模数据只计算结果，不存储逐帧动画。将任务数调整到 60 以下可查看过程。':'运行算法，生成可自由回放的真实执行轨迹。'}</p><button className="primary" onClick={onCompute}>计算方案 <ArrowRight size={15}/></button></div> }

function DpView({result,step,idx,data,onCompute,control}:{result:Result|null;step:Step|undefined;idx:number;data:Input;onCompute:()=>void;control:React.ReactNode}) { const visible=result?.steps.length;return <><div className="section-title"><div><span className="eyebrow">DYNAMIC PROGRAMMING / O(n²)</span><h2>状态转移演算</h2></div><span className="pill">{result?`${result.comparisons} 次候选比较`:'等待计算'}</span></div><p className="muted">每一步移动最后一批的左边界 j。状态与费用都来自真实 DP 轨迹。</p>{result&&visible?<><div className="story-strip"><div className="story-badge">{idx===0?'READY':`i = ${step?.i}`}</div><div><b>{idx===0?'准备枚举最后一批':`正在比较 j = ${step?.j}`}</b><small>{idx===0?'点击播放或下一步开始':`最后一批为作业 ${step!.j+1} 至 ${step!.i}`}</small></div><span>STEP {String(idx).padStart(2,'0')}</span></div><div className="dp-task-line">{data.jobs.slice(0,Math.min(24,data.jobs.length)).map((job,k)=><div key={k} className={`dp-task ${step&&k+1>step.j&&k+1<=step.i?'in-last-batch':''} ${step&&k+1===step.i?'current-task':''}`}><b>{k+1}</b><small>{job.t}/{job.f}</small></div>)}</div><DpAssembly data={data} step={step} result={result}/><div className="dp-grid">{result.dp.map((v,i)=>{const shown=i===0||Boolean(step&&i<step.i)||Boolean(step&&i===step.i);return <div key={i} className={`dp-cell ${step?.i===i?'dp-current':''}`}><small>dp[{i}]</small><b>{shown?fmt(i===step?.i?step.best:v):'?'}</b><span>{shown?`prev = ${i===step?.i?step.prev:result.prev[i]}`:'尚未求解'}</span></div>})}</div><div className="step-card"><small>转移公式</small><h3>dp[i] = min(dp[j] + (S + T[i] − T[j]) × (F[n] − F[j]))</h3>{step?<div className="equation-row"><span>本次候选 <b>{fmt(step.candidate)}</b></span><span>目前最佳 <b>{fmt(step.best)}</b></span><span>最优边界 <b>j = {step.prev}</b></span></div>:<p>逐帧探索每一个合法切分点。</p>}</div>{control}</>:<Empty onCompute={onCompute} large={data.jobs.length>traceLimit}/>}</> }

function HullView({result,step,idx,data,onCompute,control}:{result:Result|null;step:HullStep|undefined;idx:number;data:Input;onCompute:()=>void;control:React.ReactNode}) {return <><div className="section-title"><div><span className="eyebrow">CONVEX HULL TRICK / O(n)</span><h2>凸壳拼线图</h2></div><span className="pill">BigInt 精确比较</span></div><p className="muted">每个历史状态 j 都是一条线。图中先展示本轮查询所见的候选，再展示队列怎样更新。</p>{result?.hullSteps.length?<><HullBricks data={data} current={step?.i}/><div className="hull-layout"><div className="hull-side"><div className="hull-formula"><small>状态 → 直线</small><b>yⱼ(x) = −F[j]x + dp[j] − T[j](F[n]−F[j])</b><span>当前 x = S + T[i] = {step?fmt(step.x):'—'}</span></div><div className="queue-title">查询前候选队列</div><div className="queue-list">{step?.queryLines.map(line=><div key={line.j} className={`queue-line ${line.j===step.chosen?'chosen':''}`}><strong>j={line.j}</strong><span>m={fmt(line.m)}</span><b>y={fmt(step.values[step.queryLines.indexOf(line)])}</b></div>)||<p className="muted">按下一步开始查询</p>}</div><div className="queue-title">维护后队列</div><div className="queue-after">{step?.lines.map(line=><span key={line.j}>j={line.j}</span>)||<span>等待执行</span>}</div><div className="queue-events"><span>队头移出：{step?.poppedFront.length?step.poppedFront.join('、'):'无'}</span><span>队尾剔除：{step?.removed.length?step.removed.join('、'):'无'}</span><span>新状态 {step?.i??'—'}：{step?(step.inserted?'入队':'与已有斜率相同，舍弃'):'待生成'}</span></div></div><div className="hull-visual"><HullPlot step={step}/><div className="plot-legend"><span><i/> 候选直线</span><span><i/> 选中的最优直线</span><span><i/> 当前查询 x</span></div></div></div><div className="step-card"><small>本轮结果 · {idx} / {result.hullSteps.length}</small><div className="equation-row"><span>选中历史状态 <b>j = {step?.chosen??'—'}</b></span><span>线函数最小值 <b>{step?fmt(step.value):'—'}</b></span><span>更新 dp[{step?.i??'—'}] <b>{step?fmt(step.dp):'—'}</b></span></div><p>队尾删除只针对接下来单调不减的查询横坐标，并不表示这条直线在所有实数 x 下都失去最优可能。</p></div>{control}</>:<Empty onCompute={onCompute} large={data.jobs.length>traceLimit}/>}</> }

function HullPlot({step}:{step:HullStep|undefined}) { if(!step)return <div className="plot plot-empty">点击下一步，让第一条直线进入坐标系</div>;const selected=step.queryLines.find(line=>line.j===step.chosen);const lines=[...step.queryLines.slice(-6),...(selected&&!step.queryLines.slice(-6).includes(selected)?[selected]:[])].sort((a,b)=>a.j-b.j),x=Number(step.x),spread=Math.max(4,Math.abs(x)*.18),left=x-spread,right=x+spread,ys=lines.flatMap(l=>[Number(l.m)*left+Number(l.b),Number(l.m)*right+Number(l.b)]),low=Math.min(...ys),high=Math.max(...ys),pad=Math.max(1,(high-low)*.12),minY=low-pad,maxY=high+pad,sx=(v:number)=>55+(v-left)/(right-left)*505,sy=(v:number)=>245-(v-minY)/(maxY-minY)*210;return <svg className="plot" viewBox="0 0 600 300" role="img" aria-label={`凸壳直线与当前查询 x=${x}`}><defs><pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M 42 0 L 0 0 0 42" fill="none" stroke="#e9dce9" strokeWidth="1"/></pattern></defs><rect x="55" y="34" width="505" height="211" fill="url(#grid)"/><path d="M55 34V245H560" className="axis"/>{lines.map(line=><g key={line.j}><line x1={sx(left)} y1={sy(Number(line.m)*left+Number(line.b))} x2={sx(right)} y2={sy(Number(line.m)*right+Number(line.b))} className={line.j===step.chosen?'line chosen':'line'}/><text x={sx(right)-36} y={Math.max(42,Math.min(239,sy(Number(line.m)*right+Number(line.b))-5))} className="legend">j={line.j}</text></g>)}<line x1={sx(x)} x2={sx(x)} y1="34" y2="245" className="query"/><circle cx={sx(x)} cy={sy(Number(step.value))} r="7" className="point"/><text x="52" y="280" className="axis-label">{Math.round(left)}</text><text x="497" y="280" className="axis-label">x = {x}</text></svg> }

function RaceTrack({slow,fast}:{slow:Result;fast:Result}) {
  const [tick,setTick]=useState(0),[running,setRunning]=useState(false);
  const maximum=Math.max(slow.comparisons,fast.comparisons,1),stride=Math.max(1,Math.ceil(maximum/85));
  const available=slow.steps.length>0&&fast.hullSteps.length>0;
  useEffect(()=>{setTick(0);setRunning(false)},[slow,fast]);
  useEffect(()=>{if(!running||!available)return;const timer=window.setInterval(()=>setTick(v=>Math.min(maximum,v+stride)),75);return()=>window.clearInterval(timer)},[running,available,maximum,stride]);
  useEffect(()=>{if(tick>=maximum)setRunning(false)},[tick,maximum]);
  if(!available)return <div className="race-track-note">大规模输入已在 Worker 中完成纯算法竞速；逐步赛道可在 60 个及以下任务中播放。</div>;
  const slowFrame=tick>0?slow.steps[Math.min(tick,slow.steps.length)-1]:undefined;
  let fastFrame:HullStep|undefined;
  for(const frame of fast.hullSteps){if(frame.checks<=tick)fastFrame=frame;else break}
  const lanes=[{name:'朴素 DP',result:slow,frame:slowFrame,step:slowFrame?.i||0,j:slowFrame?.j,color:'red'},
    {name:'单调凸壳',result:fast,frame:fastFrame,step:fastFrame?.i||0,j:fastFrame?.chosen,color:'blue'}];
  return <div className="race-track"><div className="race-track-head"><div><b>积木赛道</b><span>按真实候选比较次数推进，两边共享同一操作刻度</span></div><div className="race-actions"><button onClick={()=>{setTick(0);setRunning(true)}}><RotateCcw size={13}/> 从头竞速</button><button onClick={()=>setRunning(!running)}>{running?<Pause size={13}/>:<Play size={13}/>} {running?'暂停':'继续'}</button></div></div>{lanes.map(lane=><div className={`race-lane race-lane-${lane.color}`} key={lane.name}><div className="race-lane-label"><strong>{lane.name}</strong><span>{Math.min(tick,lane.result.comparisons)} / {lane.result.comparisons} 次比较</span></div><div className="race-lane-bricks">{Array.from({length:Math.min(20,lane.result.dp.length-1)},(_,i)=><div key={i} className={`race-mini ${i+1<lane.step?'done':i+1===lane.step?'now':''}`}><i/><b>{i+1}</b></div>)}</div><div className="race-lane-bottom"><div className="race-lane-progress"><i style={{width:`${Math.min(100,tick/lane.result.comparisons*100)}%`}}/></div><small>{lane.step?`状态 i=${lane.step} · 候选 j=${lane.j}`:'准备出发'}</small></div></div>)}</div>;
}

function RaceView({slow,fast,busy,calculate}:{slow:Result|null;fast:Result|null;busy:boolean;calculate:()=>void}) { const max=slow?.comparisons||1;return <><div className="section-title"><div><span className="eyebrow">ALGORITHM RACE</span><h2>双算法竞速</h2></div><button className="primary" disabled={busy} onClick={calculate}><FastForward size={15}/>{busy?'计算中…':'重新计时'}</button></div><p className="muted">下方毫秒数仅统计纯算法函数。页面动画播放速度不参与计时。</p>{slow&&fast?<><RaceTrack slow={slow} fast={fast}/><div className="race-grid">{[[slow,'朴素动态规划','O(n²)','coral'],[fast,'单调凸壳优化','O(n)','violet']].map(([raw,name,complex,color])=>{const r=raw as Result;return <div className={`race-card race-${color}`} key={String(name)}><div className="race-heading"><span>{String(name)}</span><h3>{String(complex)}</h3></div><div className="race-metric"><span>候选查询 / 比较</span><b>{r.comparisons.toLocaleString()}</b></div><div className="race-bar"><i style={{width:`${Math.max(3,r.comparisons/max*100)}%`}}/></div><div className="race-metric"><span>纯计算耗时</span><b>{r.elapsedMs.toFixed(3)} ms</b></div><div className="race-metric"><span>最优费用</span><b>{fmt(r.cost)}</b></div></div>})}</div><div className="race-verdict"><Trophy size={19}/><div><b>结果一致 · {fmt(fast.cost)}</b><span>最优分批 {batchText(fast.batches)}</span></div></div></>:<Empty onCompute={calculate} large={false}/>}</> }

function Guide() {return <><div className="section-title"><div><span className="eyebrow">HOW IT WORKS</span><h2>从状态转移到几何优化</h2></div><Lightbulb color="#d9789e"/></div><div className="guide"><article><b>01 / 定义问题</b><h3>先排成连续的批次</h3><p>作业顺序固定。每一批先花 S 启动，再执行批内所有任务。批内作业在这一批结束时一起完成。</p><code>目标：min Σ f[i] · C[i]</code></article><article><b>02 / 建立 DP</b><h3>枚举最后一批的起点</h3><p>dp[i] 是前 i 个作业的最小费用。选 j 作为最后一批开始前的位置，枚举所有 0≤j&lt;i。</p><code>dp[i] = minⱼ {'{ dp[j] + (S+T[i]−T[j])(F[n]−F[j]) }'}</code></article><article><b>03 / 几何变换</b><h3>历史状态化作直线</h3><p>令 x=S+T[i]，候选 j 的斜率为 −F[j]，截距为 dp[j]−T[j](F[n]−F[j])。</p><code>dp[i] = x·F[n] + minⱼ (mⱼx+bⱼ)</code></article><article><b>04 / 单调凸壳</b><h3>只保留后续有竞争力的线</h3><p>t、f 非负时，查询 x 不减，斜率不增。精确整数叉积维护下凸壳，每条线最多入队出队各一次。</p><code>朴素 O(n²) → 凸壳 O(n)</code></article></div><div className="guide-note"><CircleHelp size={18}/><span>多种分批方案可能拥有相同最优费用。动画采用固定的并列处理规则展示其中一种。</span></div></> }






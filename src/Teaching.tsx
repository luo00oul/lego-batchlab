import type { HullStep, Input, Result, Step } from './algorithms';

const show = (value: bigint) => value.toLocaleString('zh-CN');
const sum = (values: number[]) => values.reduce((total, value) => total + BigInt(value), 0n);

function Formula({ children }: { children: React.ReactNode }) {
  return <div className="math-formula">{children}</div>;
}

function DpEquation() {
  return <Formula><var>dp</var><sub>i</sub><span className="math-op">=</span><span className="math-min">min<sub>0 ≤ j &lt; i</sub></span><span className="math-bracket">[</span><var>dp</var><sub>j</sub><span className="math-op">+</span><span className="math-group">(<var>S</var> + <var>T</var><sub>i</sub> − <var>T</var><sub>j</sub>)</span><span className="math-group">(<var>F</var><sub>n</sub> − <var>F</var><sub>j</sub>)</span><span className="math-bracket">]</span></Formula>;
}

export function DpFormulaPanel({ data, step, result }: { data: Input; step?: Step; result: Result }) {
  const times = data.jobs.map(job => job.t), fees = data.jobs.map(job => job.f);
  const ti = step ? sum(times.slice(0, step.i)) : undefined;
  const tj = step ? sum(times.slice(0, step.j)) : undefined;
  const fn = sum(fees), fj = step ? sum(fees.slice(0, step.j)) : undefined;
  return <section className="concept-panel" aria-label="动态规划状态和公式">
    <div className="concept-header"><span className="concept-index">01</span><div><strong>先定义状态，再计算候选</strong><small>把已发生的每段时间分配给当时尚未完成的作业</small></div></div>
    <p className="concept-definition"><b><var>dp</var><sub>i</sub></b>（有些课件写作 <b><var>d</var><sub>i</sub></b>）：完成前 <b>i</b> 个作业时，已经用掉的批次时间对<b>全部 n 个作业最终费用</b>造成的最小累计贡献。<b><var>dp</var><sub>0</sub> = 0</b>，最终答案是 <b><var>dp</var><sub>n</sub></b>。</p>
    <DpEquation />
    <div className="symbol-grid"><span><b><var>T</var><sub>i</sub></b> 前 i 项执行时间之和</span><span><b><var>F</var><sub>i</sub></b> 前 i 项费用系数之和</span><span><b><var>S</var> + <var>T</var><sub>i</sub> − <var>T</var><sub>j</sub></b> 最后一批耗时</span><span><b><var>F</var><sub>n</sub> − <var>F</var><sub>j</sub></b> 该批开始时未完成作业的系数和</span></div>
    {step && ti !== undefined && tj !== undefined && fj !== undefined && <div className="live-equation"><span>当前拼装 · i={step.i}，j={step.j}</span><strong>{show(result.dp[step.j])} + ({data.S} + {show(ti)} − {show(tj)}) × ({show(fn)} − {show(fj)}) = {show(step.candidate)}</strong><small>系数和包含第 i 项之后仍在等待的作业；这也是状态不能只算“前 i 项费用”的原因。</small></div>}
  </section>;
}

export function HullFormulaPanel({ data, step }: { data: Input; step?: HullStep }) {
  const line = step?.queryLines.find(candidate => candidate.j === step.chosen);
  const totalFee = sum(data.jobs.map(job => job.f));
  return <section className="concept-panel hull-concept" aria-label="凸壳几何变换">
    <div className="concept-header"><span className="concept-index blue">02</span><div><strong>把历史状态变成直线</strong><small>查询点随作业时间单调向右移动</small></div></div>
    <p className="concept-definition">固定历史边界 <b>j</b>，令 <b><var>x</var> = <var>S</var> + <var>T</var><sub>i</sub></b>。变化的部分只有 x，因此每个 j 对应一条直线。</p>
    <Formula><var>y</var><sub>j</sub>(<var>x</var>)<span className="math-op">=</span>−<var>F</var><sub>j</sub><var>x</var><span className="math-op">+</span><var>dp</var><sub>j</sub> − <var>T</var><sub>j</sub>(<var>F</var><sub>n</sub> − <var>F</var><sub>j</sub>)</Formula>
    <Formula><var>dp</var><sub>i</sub><span className="math-op">=</span><var>xF</var><sub>n</sub><span className="math-op">+</span><span className="math-min">min<sub>0 ≤ j &lt; i</sub></span><var>y</var><sub>j</sub>(<var>x</var>)</Formula>
    <div className="symbol-grid"><span><b>斜率 −<var>F</var><sub>j</sub></b> 随 j 增大而不增</span><span><b>查询 x</b> 随 i 增大而不减</span></div>
    {step && <div className="live-equation"><span>本轮查询 · i={step.i}</span><strong>x = {show(step.x)}，F<sub>n</sub> = {show(totalFee)}；选中 j={step.chosen}</strong>{line && <small>该线斜率 {show(line.m)}，截距 {show(line.b)}，线函数值 {show(step.value)}。</small>}</div>}
  </section>;
}

export function Guide() {
  return <><div className="section-title"><div><span className="eyebrow">从积木到算法</span><h2>每个符号都对应一段真实时间</h2></div></div>
    <div className="teaching-guide">
      <article><span className="teaching-number">01 / 目标</span><h3>按顺序拼成连续批次</h3><p>作业不能换序。每批先花启动时间 S，再执行批内作业；同批作业在这一批结束时一起完成。作业 k 的完成时刻记为 C<sub>k</sub>，费用为 f<sub>k</sub> × C<sub>k</sub>。</p><Formula>总费用<span className="math-op">=</span><span className="math-min">Σ<sub>k = 1 … n</sub></span><var>f</var><sub>k</sub><var>C</var><sub>k</sub></Formula></article>
      <article><span className="teaching-number">02 / 前缀和</span><h3>先算积木的累计时间与系数</h3><p>T<sub>i</sub> 是前 i 块积木的执行时间之和；F<sub>i</sub> 是前 i 块的费用系数之和。令 T<sub>0</sub> = F<sub>0</sub> = 0。它们使任意一段连续作业都能用两个前缀相减得到。</p><Formula><var>T</var><sub>i</sub><span className="math-op">=</span><span className="math-min">Σ<sub>k = 1 … i</sub></span><var>t</var><sub>k</sub><span className="math-divider"/><var>F</var><sub>i</sub><span className="math-op">=</span><span className="math-min">Σ<sub>k = 1 … i</sub></span><var>f</var><sub>k</sub></Formula></article>
      <article><span className="teaching-number">03 / 状态</span><h3>dp<sub>i</sub> 到底累计了什么？</h3><p>页面写作 dp<sub>i</sub>，有些课件写作 d<sub>i</sub>。它是前 i 个作业完成前，所有已发生批次时间对全部 n 个作业最终费用造成的最小贡献。后面的作业虽然还没完成，也已经被前面流逝的时间推迟，因此它们的系数必须算进去。dp<sub>0</sub> = 0，答案为 dp<sub>n</sub>。</p><DpEquation /></article>
      <article><span className="teaching-number">04 / 最后一批</span><h3>为什么乘 F<sub>n</sub> − F<sub>j</sub>？</h3><p>若最后一批是 j+1 到 i，批次耗时 S+T<sub>i</sub>−T<sub>j</sub>。它开始时，作业 j+1 到 n 都未完成；这段时间会同时推迟它们，所以乘这些作业的系数和 F<sub>n</sub>−F<sub>j</sub>。</p><div className="example-proof"><b>默认案例</b><span>批次 [1,2]｜[3]｜[4,5]</span><strong>5 × 15 + 5 × 10 + 4 × 7 = 153</strong></div></article>
      <article><span className="teaching-number">05 / 几何优化</span><h3>一个 j 就是一条候选直线</h3><p>令 x=S+T<sub>i</sub>，历史状态 j 给出斜率 −F<sub>j</sub> 与截距 dp<sub>j</sub>−T<sub>j</sub>(F<sub>n</sub>−F<sub>j</sub>)。查询这些直线的最低值，就得到本轮的最优转移。</p><Formula><var>dp</var><sub>i</sub><span className="math-op">=</span><var>xF</var><sub>n</sub><span className="math-op">+</span><span className="math-min">min<sub>0 ≤ j &lt; i</sub></span><var>y</var><sub>j</sub>(<var>x</var>)</Formula><p>t<sub>i</sub>、f<sub>i</sub> 非负时，x 不减、斜率不增。用整数叉积维护对未来查询有效的下凸壳，复杂度由 O(n²) 降为摊还 O(n)。</p></article>
    </div><div className="guide-note">可能有多种费用相同的最优分批；网站展示其中一种。凸壳移除候选只针对之后单调向右的查询。</div></>;
}

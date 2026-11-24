---
title: The idea of a hypothesis test
zh: 假设检验的基本概念
summary: What a hypothesis test is — null and alternative hypotheses, the small-probability principle and the significance level, the two types of error — shown through the U test for a normal mean.
source: 22区间估计和假设检验 (§8.1, §8.2 U test), 2026-11-18
---

A factory says its motors draw at most 0.8 A; a range finder is supposed to have no
systematic error; a coin is claimed to be fair. Each is a **claim** about a population,
and a sample either fits the claim or looks too odd to be chance. A
{{term hypothesis test | 假设检验}} turns "looks too odd" into a rule with a known error
rate. This lesson sets up the language (hypotheses, significance level, rejection
region, the two kinds of error) and the reasoning behind it, and runs the first complete
test, the $U$ test. Lesson 8.2 then builds the full set of tests for a normal population
on the same pattern.

Where Lesson 7.4 asked "where is $\mu$?", a test asks a yes/no question: "is $\mu = 500$
believable, given the data?"

## The problem

Hypothesis testing is a central part of statistical inference: first make an assumption
about a parameter of the population, then use a sample to decide whether the assumption
holds. The lecture draws it as a chain:

**a hypothesis about a parameter** → **observe a sample** → **a specific statistical
method** → **the test's verdict**.

A test always involves two competing statements.

::: define Null hypothesis | 原假设
The hypothesis made about the population's distribution (usually about a parameter) that
the test puts on trial, written $H_0$. It is also called the
{{term zero hypothesis | 零假设}}. Typical forms: $H_0: \mu = \mu_0$, $H_0: \mu \le \mu_0$,
$H_0: \sigma^2 = \sigma_0^2$.
:::

::: define Alternative hypothesis | 备择假设
The other hypothesis, stated together with $H_0$, that we accept if we reject $H_0$;
written $H_1$. For $H_0: \mu = \mu_0$ it is usually $H_1: \mu \ne \mu_0$; for
$H_0: \mu \le \mu_0$ it is $H_1: \mu > \mu_0$.
:::

The general form of a test with two hypotheses is: **given the alternative $H_1$, decide
about $H_0$**. Rejecting $H_0$ means accepting $H_1$; otherwise we accept $H_0$. Exactly
one of the two is chosen.

::: define Significance test | 显著性检验
A test in which only $H_0$ is stated and the aim is just to check whether $H_0$ holds,
without studying any other particular hypothesis.
:::

All the tests in this course are significance tests: we control how often a true $H_0$
is rejected, and do not try to control the other error (see below).

## The basic idea: small probabilities

How can a sample "disprove" a claim when, in principle, any sample can happen under any
hypothesis? By refusing to believe in miracles.

**A game.** Someone hands you a coin, swearing it is fair. You toss it 10 times and get
10 heads. If the coin were fair, that would happen with probability
$(1/2)^{10} = 1/1024 \approx 0.001$. It is *possible*, but you don't believe it happened
by chance in your one try: you conclude the coin is not fair. That is the whole logic of
testing.

::: law Small-probability principle | 小概率原理
An event of small probability practically never happens in a single trial.
:::

What counts as "small" is a choice made for each problem: we fix a bound $\alpha$
($0 < \alpha < 1$) and treat events of probability at most $\alpha$ as small.

::: define Significance level | 显著性水平
The bound $\alpha$ ($0 < \alpha < 1$) below which a probability counts as small: events
of probability at most $\alpha$ are treated as practically impossible in one trial.
Common choices are $\alpha = 0.05$, $0.01$ and $0.10$.
:::

::: callout key The basic idea of a test (假设检验的基本思想)
**Assume $H_0$ is true.** Under that assumption, build an event $A$ with
$P(A) \le \alpha$ — a small-probability event. Then run the experiment once (take the
sample):

- if $A$ **happens**, a near-miracle occurred under $H_0$, so we **reject $H_0$**;
- if $A$ **doesn't happen**, the data give no reason to doubt $H_0$, so we **accept
  $H_0$**.

It is a proof by contradiction, but a probabilistic one: the "contradiction" is only an
event that is very unlikely under $H_0$.
:::

::: callout pitfall "Accept H₀" doesn't prove H₀
Rejecting $H_0$ is a strong conclusion: the data are hard to explain if $H_0$ holds.
Accepting $H_0$ is weak: it only means the data didn't contradict it — perhaps because
the sample was small. Think of a court: "not guilty" means "not proven", not "proven
innocent". That is why the claim you want to put on trial is made $H_0$.
:::

## The two types of error

Because the decision rests on a random sample, it can be wrong in two ways.

::: define Type I error | 第一类错误
Rejecting $H_0$ when $H_0$ is true, "rejecting the truth" (弃真). Its probability is
controlled by the significance level:
$$P\{\text{reject } H_0 \mid H_0 \text{ true}\} = P\{A \mid H_0\} \le \alpha.$$
:::

::: define Type II error | 第二类错误
Accepting $H_0$ when $H_0$ is false, "accepting the false" (取伪). Its probability is
written $\beta$:
$$P\{\text{accept } H_0 \mid H_0 \text{ false}\} = \beta.$$
:::

| Decision | $H_0$ is true | $H_0$ is false |
| --- | --- | --- |
| Reject $H_0$ | Type I error (probability $\le \alpha$) | Correct |
| Accept $H_0$ | Correct | Type II error (probability $\beta$) |

::: law How the two errors are related | 两类错误的关系
1. For a fixed sample size $n$, the two error probabilities can't both be made small:
   making $\alpha$ smaller makes $\beta$ larger, and making $\beta$ smaller makes $\alpha$
   larger.
2. The only way to make $\alpha$ and $\beta$ small together is to increase the sample size.
3. In principle one should control first whichever error has the worse consequences; in
   practice, hypothesis testing controls the type I error probability $\alpha$ first.
:::

Why the see-saw? Look at a one-sided rule "reject when the statistic is at least $c$".
Under $H_0$ the statistic follows the left curve, under a particular alternative the
right one, shifted by $d$. The type I error is the left curve's area **beyond** $c$; the
type II error is the right curve's area **before** $c$. Push $c$ right and $\alpha$
shrinks while $\beta$ grows. Increasing $d$ — which a bigger sample does, since
$d = \frac{\mu_1 - \mu_0}{\sigma}\sqrt n$ — pulls the curves apart and shrinks both.

::: plot α (under H₀, beyond c) and β (under H₁, before c)
x: -4 .. 7
xlabel: value of the statistic
H0(x) = e^(-x^2 / 2) / sqrt(2 pi)
H1(x) = e^(-(x - d)^2 / 2) / sqrt(2 pi)
region α: x > c, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
region β: x < c, 0 < y < e^(-(x - d)^2 / 2) / sqrt(2 pi)
slider c: 0 .. 3.5 = 1.645 | | critical value
slider d: 0 .. 5 = 2.5 | | shift under H₁
:::

The same numbers for a real set-up: testing $H_0: \mu = \mu_0$ against a true mean
$\mu_0 + \delta$, rejecting when $\frac{\bar X - \mu_0}{\sigma}\sqrt n \ge c$:

::: explore The two errors of a one-sided U test
slider c: 0 .. 3.5 = 1.645 | | critical value
slider δ: 0 .. 10 = 3 | | true μ − μ₀
slider σ: 1 .. 20 = 10
slider n: 1 .. 200 = 25 | | step 1
alpha = 1 - Phi(c) | | Type I error α
beta = Phi(c - δ sqrt(n) / σ) | | Type II error β
:::

## A first test: the U test

Now the full recipe on the simplest case. $X \sim N(\mu, \sigma^2)$ with $\sigma^2$
**known**; a sample $x_1, \ldots, x_n$ and a significance level $\alpha$ are given, and
we test
$$H_0: \mu = \mu_0 \quad (H_1: \mu \ne \mu_0).$$

**The test statistic.** $\bar X$ is a good estimator of $\mu$, so under $H_0$ it should be
close to $\mu_0$. Measure the gap in standard units:
$$U = \frac{\bar X - \mu_0}{\sigma}\sqrt n,$$
and if $H_0$ is true, $U \sim N(0,1)$ (Lesson 6.3). A function of the sample used to
decide, like this one, is called a {{term test statistic | 检验统计量}}; note that, unlike a
pivot, it contains no unknown parameter — $\mu_0$ is the hypothesised value.

**The small-probability event.** Under $H_0$, a large $|U|$ is unlikely. Choose the
threshold so that its probability is exactly $\alpha$: by the symmetry of $N(0,1)$,
$$P\left\{\left|\frac{\bar X - \mu_0}{\sigma}\sqrt n\right| \ge u_{\alpha/2}\right\} = \alpha,$$
with $u_{\alpha/2}$ the upper $\alpha/2$ quantile (Lesson 6.2). So the event
$\{|U| \ge u_{\alpha/2}\}$ is our $A$.

The set of values of the statistic for which we reject is the
{{term rejection region | 拒绝域}}, and the boundary $u_{\alpha/2}$ is the
{{term critical value | 临界值}}.

::: formula U test for μ, σ² known (two-sided) | U检验法
$$U = \frac{\bar X - \mu_0}{\sigma}\sqrt n \sim N(0,1) \text{ under } H_0: \mu = \mu_0; \qquad \text{reject } H_0 \text{ when } |U| \ge u_{\alpha/2}$$
--
\mu_0 | the value of μ stated by H₀ |
\sigma | the known population standard deviation |
u_{\alpha/2} | critical value: upper α/2 quantile of N(0,1); 1.96 for α = 0.05 |
|U| \ge u_{\alpha/2} | the rejection region |
:::

::: plot Rejection region |U| ≥ u_{α/2}: each tail holds α/2
x: -4 .. 4
xlabel: u
ylabel: f(u)
f(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Reject: abs(x) > u, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
slider u: 1 .. 3 = 1.96 | | critical value
:::

::: example Example 1: does the range finder have a systematic error?
Within 500 m, a range finder measures with precision $\sigma = 10$ m; one reading is
$X \sim N(\mu, \sigma^2)$. A target at exactly 500 m is measured 9 times, with mean
reading $\bar x = 510$ m. At significance level $\alpha = 0.05$, does the range finder have
a systematic error?
== Hypothesis ==
No systematic error means the readings are centred on the true distance:
$H_0: \mu = 500$ (against $H_1: \mu \ne 500$).
== Statistic ==
$\sigma = 10$ is known, so use $U = \dfrac{\bar X - 500}{\sigma}\sqrt n$, which is
$N(0,1)$ under $H_0$.
== Critical value ==
$\alpha = 0.05$: $u_{0.025} = 1.96$, so the rejection region is $|U| \ge 1.96$.
== Compute ==
$$u = \frac{510 - 500}{10} \times \sqrt 9 = 1 \times 3 = 3.$$
== Decide ==
$|u| = 3 > 1.96$: the small-probability event happened, so reject $H_0$. The range
finder has a systematic error.
:::

::: callout summary The four steps of a test (检验步骤)
1. State the hypothesis $H_0: \mu = \mu_0$.
2. Choose the statistic $U = \frac{\bar X - \mu_0}{\sigma}\sqrt n$ and compute its value
   from the sample.
3. For the given $\alpha$, look up the **critical value** $u_{\alpha/2}$, the number with
   $P\left\{\left|\frac{\bar X - \mu_0}{\sigma}\sqrt n\right| \ge u_{\alpha/2}\right\} = \alpha$
   when $H_0$ holds.
4. Decide: if $|U| \ge u_{\alpha/2}$, reject $H_0$; otherwise accept it.

Every test in Lesson 8.2 follows these four steps; only the statistic and its table change.
:::

### How likely was the type II error?

$\beta$ depends on which alternative is true, so it can only be computed for a specific
one. Here is how, for the range finder.

::: example The type II error of Example 1 (own example)
In Example 1, suppose the true mean really is $\mu = 510$. What is the probability that a
sample of 9 leads us to **accept** $H_0: \mu = 500$ (a type II error)?
== Distribution of U when μ = 510 ==
$U = \frac{\bar X - 500}{10}\sqrt 9 = \frac{\bar X - 510}{10}\cdot 3 + 3$, and
$\frac{\bar X - 510}{10}\cdot 3 \sim N(0,1)$, so $U \sim N(3, 1)$.
== Probability of accepting ==
$$\beta = P\{|U| < 1.96\} = \Phi(1.96 - 3) - \Phi(-1.96 - 3) = \Phi(-1.04) - \Phi(-4.96) \approx 0.1492 - 0.0000 = 0.149.$$
== Read it ==
Even with a 10 m bias, about 15% of samples of 9 would miss it. A larger sample would
shrink $\beta$ without changing $\alpha$.
:::

## Tests and confidence intervals

The $U$ test accepts $H_0: \mu = \mu_0$ exactly when $|\bar x - \mu_0| < u_{\alpha/2}\sigma/\sqrt n$,
that is, when $\mu_0$ lies in the confidence interval
$\bar x \pm u_{\alpha/2}\sigma/\sqrt n$ of Lesson 7.4 at level $1-\alpha$. In Example 1 the
95% interval is $510 \pm 1.96 \times 10/3 = (503.47, 516.53)$, which doesn't contain 500 —
the same verdict. A two-sided test at level $\alpha$ and a confidence interval at level
$1-\alpha$ are two views of the same calculation.

::: callout exam What exams ask
Definitions in multiple choice: which error is "rejecting a true $H_0$", what $\alpha$
bounds, what happens to $\beta$ when $\alpha$ is reduced with $n$ fixed, how to reduce both
errors (a larger sample). And a short $U$ test: state $H_0$, compute $U$, compare with
$u_{\alpha/2}$, conclude in words about the original question.
:::

::: cards The idea of a hypothesis test
Null hypothesis $H_0$ :: The hypothesis about the population put on trial (原假设, 零假设), e.g. $\mu = \mu_0$.
Alternative hypothesis $H_1$ :: The hypothesis accepted when $H_0$ is rejected (备择假设), e.g. $\mu \ne \mu_0$.
Significance test :: Only $H_0$ is stated; the test checks whether $H_0$ holds.
Small-probability principle :: An event of small probability practically never happens in a single trial.
Significance level α :: The bound below which a probability counts as small; also the bound on the type I error probability.
Basic idea of a test :: Assume $H_0$, build an event $A$ with $P(A) \le \alpha$; if $A$ happens in the sample, reject $H_0$, otherwise accept.
Type I error :: Rejecting a true $H_0$ (弃真); probability $\le \alpha$.
Type II error :: Accepting a false $H_0$ (取伪); probability $\beta$.
Trade-off between α and β :: With $n$ fixed, lowering one raises the other; only a larger sample lowers both. Tests control α first.
U test statistic and region :: $U = \frac{\bar X - \mu_0}{\sigma}\sqrt n$; reject $H_0: \mu = \mu_0$ when $|U| \ge u_{\alpha/2}$.
Rejection region and critical value :: The values of the statistic that lead to rejecting $H_0$; the critical value is its boundary.
Four steps of a test :: State $H_0$; choose and compute the statistic; look up the critical value for α; compare and decide.
Does accepting H₀ prove it? :: No: it only means the data didn't contradict it.
:::

::: quiz The idea of a hypothesis test
? A coin claimed fair shows 10 heads in 10 tosses. What is the probability of this if the coin is fair?
answer: 1/1024
> $(1/2)^{10} = 1/1024 \approx 0.001$, well below $\alpha = 0.05$: by the small-probability
> principle we reject "the coin is fair".

? A type I error is
- [x] rejecting $H_0$ when $H_0$ is true
- [ ] accepting $H_0$ when $H_0$ is false
- [ ] rejecting $H_0$ when $H_0$ is false
- [ ] accepting $H_0$ when $H_0$ is true
> Type I is "弃真", rejecting the truth; its probability is at most $\alpha$. Accepting a
> false $H_0$ is type II ("取伪"); the other two are correct decisions.

? With the sample size fixed, we lower the significance level from 0.05 to 0.01. Then
- [ ] both error probabilities fall
- [x] the type I error probability falls and the type II error probability rises
- [ ] the type I error probability rises and the type II error probability falls
- [ ] neither changes
> A smaller $\alpha$ moves the critical value outwards: we reject less often, so true $H_0$'s
> are rejected less (smaller $\alpha$) but false ones are accepted more (larger $\beta$).

? How can both error probabilities be made smaller at the same time?
- [ ] By lowering α
- [ ] By raising α
- [x] By increasing the sample size
- [ ] It can never be done
> With $n$ fixed they move in opposite directions; a larger $n$ separates the distributions
> under $H_0$ and $H_1$ and lowers both.

? A range finder has $\sigma = 10$ m. Sixteen readings of a 500 m target average 505 m. Compute the value of the statistic $U$ for $H_0: \mu = 500$.
answer: 2
> $u = \frac{505 - 500}{10}\sqrt{16} = 0.5 \times 4 = 2$.

? In the previous question, what is the decision at $\alpha = 0.05$, and at $\alpha = 0.01$ ($u_{0.005} = 2.576$)?
- [x] Reject at 0.05, accept at 0.01
- [ ] Accept at 0.05, reject at 0.01
- [ ] Reject at both
- [ ] Accept at both
> $|u| = 2 \ge 1.96 = u_{0.025}$, so reject at 0.05; $2 < 2.576$, so accept at 0.01. A smaller
> $\alpha$ demands stronger evidence.

? For the two-sided $U$ test at $\alpha = 0.10$, what is the critical value $u_{\alpha/2}$? ($\Phi(1.645) = 0.95$)
answer: 1.645
> $\alpha/2 = 0.05$, and $u_{0.05} = 1.645$ because $\Phi(1.645) = 0.95$.

? In Example 1 ($\sigma = 10$, $n = 9$, $H_0: \mu = 500$, $\alpha = 0.05$), suppose the true mean is 510. Find the type II error probability $\beta$ (you may type an expression in `Phi`).
answer: Phi(1.96 - 3) - Phi(-1.96 - 3)
tolerance: 1%
> When $\mu = 510$, $U \sim N(3, 1)$, and we accept when $|U| < 1.96$:
> $\beta = \Phi(-1.04) - \Phi(-4.96) \approx 0.149$.

? Which statement about the conclusion "accept $H_0$" is right?
- [ ] It proves $H_0$ is true
- [x] It means the sample gave no significant evidence against $H_0$
- [ ] Its probability of being wrong is at most α
- [ ] It means $H_1$ has been proved false
> Accepting only means the small-probability event didn't happen. Its error (type II) has
> probability $\beta$, which the test doesn't control; it is $\alpha$ that bounds the error of
> rejecting.
:::

---
title: Tests for one normal population
zh: 单个正态总体的假设检验
summary: The U test (σ² known) and t test (σ² unknown) for the mean in their two-sided and one-sided forms, the χ² test for the variance, how to choose between them, and a note on the two-sample tests.
source: 23假设检验, 2026-11-23
---

Lesson 8.1 ran one complete test: the two-sided $U$ test of $H_0: \mu = \mu_0$. Real
claims are often one-sided — "the current does **not exceed** 0.8 A", "the variance is
**at most** 0.04" — and the variance is usually unknown. This lesson completes the
toolkit for a single normal population $X \sim N(\mu, \sigma^2)$: the $U$ test in all
three forms, the $t$ test for $\mu$ when $\sigma^2$ is unknown, and the $\chi^2$ test for
$\sigma^2$. They all follow the same four steps (Lesson 8.1), and they use the same
pivots as the confidence intervals of Lesson 7.4, so the three tables here are the core
of what exams ask about testing.

Throughout, $X_1, \ldots, X_n$ is a simple random sample from $X \sim N(\mu, \sigma^2)$
with mean $\bar X$ and sample variance $S^2$, and $\alpha$ is the significance level.

## The U test, one-sided

Take $\sigma^2$ known again, but now test
$$H_0: \mu \le \mu_0 \quad \text{against} \quad H_1: \mu > \mu_0.$$

**Intuition.** $\bar X$ estimates $\mu$ well. If $H_0$ holds, $\mu$ is at most $\mu_0$, so
$\bar X$ shouldn't come out much **larger** than $\mu_0$. Small values of $\bar X$ are no
evidence against $H_0$ at all — they fit it. So only a large value of
$$U = \frac{\bar X - \mu_0}{\sigma}\sqrt n$$
counts against $H_0$, and the rejection region is one-sided: $U \ge c$ for some $c$.

**The difficulty.** $U$ uses $\mu_0$, but under $H_0$ the true mean $\mu$ may be anything
up to $\mu_0$, so $U$ itself needn't be $N(0,1)$. What *is* standard normal is the version
with the true mean,
$$\widetilde U = \frac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1), \qquad P\{\widetilde U \ge u_\alpha\} = \alpha.$$

**Comparing them.** $\widetilde U - U = \frac{\mu_0 - \mu}{\sigma}\sqrt n \ge 0$ when
$\mu \le \mu_0$, so under $H_0$ we always have $U \le \widetilde U$. Then
$$\{U \ge u_\alpha\} \subset \{\widetilde U \ge u_\alpha\} \;\Rightarrow\; P\{U \ge u_\alpha\} \le P\{\widetilde U \ge u_\alpha\} = \alpha.$$
So $\{U \ge u_\alpha\}$ is a small-probability event under every $\mu$ allowed by $H_0$
(with probability exactly $\alpha$ at the boundary $\mu = \mu_0$), and the rejection
region is $U \ge u_\alpha$. Note the critical value is $u_\alpha$, not $u_{\alpha/2}$: the whole
$\alpha$ sits in one tail.

::: plot One-sided rejection region U ≥ u_α (α = 0.05, u_α = 1.645)
x: -4 .. 4
xlabel: u
ylabel: f(u)
f(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Reject: x > 1.645, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
:::

The case $H_0: \mu \ge \mu_0$ is the mirror image: only a small $\bar X$ counts against
it, and the region is $U \le -u_\alpha$. Together with Lesson 8.1's two-sided test:

**The U test (σ² known)**, statistic $U = \dfrac{\bar X - \mu_0}{\sigma}\sqrt n$:

| Null hypothesis $H_0$ | Alternative $H_1$ | Rejection region |
| --- | --- | --- |
| $\mu = \mu_0$ | $\mu \ne \mu_0$ | $\lvert U \rvert \ge u_{\alpha/2}$ |
| $\mu \le \mu_0$ | $\mu > \mu_0$ | $U \ge u_\alpha$ |
| $\mu \ge \mu_0$ | $\mu < \mu_0$ | $U \le -u_\alpha$ |

::: callout key The rejection region points towards H₁
$H_0: \mu \le \mu_0$ is rejected by **large** $U$; $H_0: \mu \ge \mu_0$ by **small** $U$.
The region always lies on the side of the alternative — opposite to the inequality in
$H_0$. Two-sided tests split $\alpha$ into two tails ($u_{\alpha/2}$); one-sided tests put
it all in one ($u_\alpha$).
:::

::: example Breaking strength of a wire (own example)
A supplier claims its wire has mean breaking strength at least 1000 N. The strength is
normal with $\sigma = 40$ N. A sample of 25 pieces has mean 985 N. Test the claim at
$\alpha = 0.05$ ($u_{0.05} = 1.645$).
== Hypotheses ==
The claim goes on trial: $H_0: \mu \ge 1000$ against $H_1: \mu < 1000$.
== Statistic and region ==
$\sigma$ is known: $U = \frac{\bar X - 1000}{40}\sqrt{25}$. For $H_0: \mu \ge \mu_0$ the
region is $U \le -u_{0.05} = -1.645$.
== Compute ==
$$u = \frac{985 - 1000}{40} \times 5 = -0.375 \times 5 = -1.875.$$
== Decide ==
$-1.875 \le -1.645$: reject $H_0$. At the 5% level the data contradict the supplier's
claim.
:::

## The t test (σ² unknown)

When $\sigma$ is unknown, $U$ can't be computed. Replace $\sigma$ by the sample standard
deviation $S$, exactly as for the confidence interval:
$$T = \frac{\bar X - \mu_0}{S}\sqrt n.$$
At $\mu = \mu_0$, $T \sim t(n-1)$ (Lesson 6.3), and the same reasoning as for $U$ (with
$\widetilde T = \frac{\bar X - \mu}{S}\sqrt n \sim t(n-1)$) gives one-sided regions with
$t_\alpha(n-1)$. The $t$ density is symmetric, so the table looks just like the $U$ table
with $u$ replaced by $t(n-1)$:

**The t test (σ² unknown)**, statistic $T = \dfrac{\bar X - \mu_0}{S}\sqrt n$:

| Null hypothesis $H_0$ | Alternative $H_1$ | Rejection region |
| --- | --- | --- |
| $\mu = \mu_0$ | $\mu \ne \mu_0$ | $\lvert T \rvert \ge t_{\alpha/2}(n-1)$ |
| $\mu \le \mu_0$ | $\mu > \mu_0$ | $T \ge t_\alpha(n-1)$ |
| $\mu \ge \mu_0$ | $\mu < \mu_0$ | $T \le -t_\alpha(n-1)$ |

(The slide lists $\mu \ge \mu_0$ before $\mu \le \mu_0$; the pairs are the same.)

::: formula t test statistic for μ | t检验统计量
$$T = \frac{\bar X - \mu_0}{S}\sqrt n \sim t(n-1) \text{ when } \mu = \mu_0$$
--
\mu_0 | the value of μ in H₀ |
S | sample standard deviation (divisor n − 1) |
t_{\alpha}(n-1), t_{\alpha/2}(n-1) | critical values: one-sided and two-sided |
:::

::: example Example: do the motors draw more than 0.8 A?
A factory's manual says its small motors draw on average **no more than** 0.8 A under
normal load. Sixteen motors chosen at random draw on average 0.92 A, with standard
deviation 0.32 A. The current is normal. At $\alpha = 0.05$, can the factory's claim be
rejected?
== Hypotheses ==
The claim is $H_0: \mu \le 0.8$ (against $H_1: \mu > 0.8$).
== Statistic ==
$\sigma$ is unknown, so use $T = \dfrac{\bar X - 0.8}{S/\sqrt n}$, which is $t(15)$ at
$\mu = 0.8$.
== Critical value ==
One-sided, so $t_{0.05}(15) = 1.753$; the rejection region is $T \ge 1.753$ (the slide writes
$T > 1.753$; for a continuous statistic the boundary makes no difference).
== Compute ==
$$t = \frac{0.92 - 0.8}{0.32} \times \sqrt{16} = 0.375 \times 4 = 1.5.$$
== Decide ==
$1.5 < 1.753$: accept $H_0$. The sample does not give enough evidence to reject the
factory's claim — even though $0.92 > 0.8$, a gap this size is quite plausible by chance
with only 16 motors and this much spread.
:::

::: plot t(15): the region T ≥ 1.753 and the observed t = 1.5
x: -4 .. 4
xlabel: t
ylabel: f(t)
f(x) = gamma(8) / (sqrt(15 pi) gamma(7.5)) (1 + x^2 / 15)^(-8)
region Reject: x > 1.753, 0 < y < gamma(8) / (sqrt(15 pi) gamma(7.5)) (1 + x^2 / 15)^(-8)
region Observed: 1.49 < x < 1.51, 0 < y < 0.4
:::

::: example Battery voltage, two-sided (own example)
Batteries should have mean voltage 1.5 V. Nine batteries give $\bar x = 1.46$ V and
$s = 0.06$ V; the voltage is normal. Test $H_0: \mu = 1.5$ at $\alpha = 0.05$
($t_{0.025}(8) = 2.306$).
== Statistic ==
$\sigma$ unknown, two-sided: $T = \frac{\bar X - 1.5}{S}\sqrt 9$, region
$|T| \ge t_{0.025}(8) = 2.306$.
== Compute ==
$t = \frac{1.46 - 1.5}{0.06} \times 3 = -\frac{0.04}{0.06} \times 3 = -2$.
== Decide ==
$|t| = 2 < 2.306$: accept $H_0$. (With $\sigma = 0.06$ **known**, the $U$ test would give
$|u| = 2 \ge 1.96$ and reject — the $t$ test's wider critical value is the price of
estimating $\sigma$.)
:::

## The χ² test for σ²

To test a claim about the variance — a machine's precision, a process's consistency —
use the pivot of Lesson 7.4's variance interval with the hypothesised $\sigma_0^2$ put in:
$$\chi^2 = \frac{(n-1)S^2}{\sigma_0^2},$$
which is $\chi^2(n-1)$ when $\sigma^2 = \sigma_0^2$. If $\sigma^2$ is larger than
$\sigma_0^2$, $S^2$ tends to be larger and so does $\chi^2$; if smaller, $\chi^2$ tends to be
small. So large values count against $\sigma^2 \le \sigma_0^2$, small values against
$\sigma^2 \ge \sigma_0^2$, and both against $\sigma^2 = \sigma_0^2$. The $\chi^2$ density isn't
symmetric, so the two-sided test has two different cut points.

**The χ² test for σ²**, statistic $\chi^2 = \dfrac{(n-1)S^2}{\sigma_0^2}$:

| Null hypothesis $H_0$ | Alternative $H_1$ | Rejection region |
| --- | --- | --- |
| $\sigma^2 = \sigma_0^2$ | $\sigma^2 \ne \sigma_0^2$ | $\chi^2 \le \chi^2_{1-\alpha/2}(n-1)$ or $\chi^2 \ge \chi^2_{\alpha/2}(n-1)$ |
| $\sigma^2 \ge \sigma_0^2$ | $\sigma^2 < \sigma_0^2$ | $\chi^2 \le \chi^2_{1-\alpha}(n-1)$ |
| $\sigma^2 \le \sigma_0^2$ | $\sigma^2 > \sigma_0^2$ | $\chi^2 \ge \chi^2_\alpha(n-1)$ |

::: formula χ² test statistic for σ² | χ²检验统计量
$$\chi^2 = \frac{(n-1)S^2}{\sigma_0^2} \sim \chi^2(n-1) \text{ when } \sigma^2 = \sigma_0^2$$
--
\sigma_0^2 | the value of σ² in H₀ |
(n-1)S^2 | the sum of squares \sum (X_i - \bar X)^2 |
\chi^2_{\alpha}(n-1) | upper α quantile of χ²(n − 1) |
:::

::: example Is the process too variable? (own example)
A filling process is acceptable if its standard deviation is at most 0.2 (so
$\sigma^2 \le 0.04$). Sixteen fills give $s^2 = 0.07$. Fills are normal. Test at
$\alpha = 0.05$ ($\chi^2_{0.05}(15) = 24.996$).
== Hypotheses ==
$H_0: \sigma^2 \le 0.04$ against $H_1: \sigma^2 > 0.04$.
== Statistic and region ==
$\chi^2 = \frac{15 S^2}{0.04}$; for $H_0: \sigma^2 \le \sigma_0^2$ reject when
$\chi^2 \ge \chi^2_{0.05}(15) = 24.996$.
== Compute ==
$\chi^2 = \frac{15 \times 0.07}{0.04} = \frac{1.05}{0.04} = 26.25$.
== Decide ==
$26.25 \ge 24.996$: reject $H_0$. The process is more variable than allowed.
:::

::: plot χ²(15): the region χ² ≥ 24.996 (α = 0.05)
x: 0 .. 40
xlabel: x
ylabel: f(x)
f(x) = x^6.5 e^(-x / 2) / (2^7.5 gamma(7.5))
region Reject: x > 24.996, 0 < y < x^6.5 e^(-x / 2) / (2^7.5 gamma(7.5))
:::

## Choosing the test

| Test | Hypothesis about | Condition | Statistic | Distribution at the boundary | Two-sided region | $H_0$ with $\le$ | $H_0$ with $\ge$ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U test | mean $\mu$ | $\sigma^2$ known | $U = \frac{\bar X - \mu_0}{\sigma}\sqrt n$ | $N(0,1)$ | $\lvert U \rvert \ge u_{\alpha/2}$ | $U \ge u_\alpha$ | $U \le -u_\alpha$ |
| t test | mean $\mu$ | $\sigma^2$ unknown | $T = \frac{\bar X - \mu_0}{S}\sqrt n$ | $t(n-1)$ | $\lvert T \rvert \ge t_{\alpha/2}(n-1)$ | $T \ge t_\alpha(n-1)$ | $T \le -t_\alpha(n-1)$ |
| χ² test | variance $\sigma^2$ | $\mu$ unknown | $\chi^2 = \frac{(n-1)S^2}{\sigma_0^2}$ | $\chi^2(n-1)$ | $\chi^2 \le \chi^2_{1-\alpha/2}$ or $\chi^2 \ge \chi^2_{\alpha/2}$ | $\chi^2 \ge \chi^2_\alpha(n-1)$ | $\chi^2 \le \chi^2_{1-\alpha}(n-1)$ |

::: callout pitfall Three classic slips
1. **U or t?** A sample variance ("样本方差为 35.15") means $\sigma^2$ is unknown: $t$ test.
   Only a population variance given in the problem allows the $U$ test.
2. **α or α/2?** $\alpha/2$ only for two-sided ($=$) hypotheses; one-sided ones use $\alpha$.
3. **Computable statistic.** A test statistic may contain $\mu_0$ (a known number) but
   never the unknown $\mu$ or $\sigma$: $\sqrt n\,\frac{\bar X - \mu}{S}$ can't be computed
   from the data.
:::

::: callout tip Changing α
For a two-sided test, a smaller $\alpha$ means a larger critical value. So **rejected at a
smaller α ⇒ rejected at every larger α**, and **accepted at a larger α ⇒ accepted at every
smaller α**. The converse statements don't follow. In-class questions 28-013 and 28-014
test exactly this.
:::

## Two normal populations

The course ended at the title of the next section, significance tests for **two**
normal populations: the two-sample $t$ test (comparing $\mu_1$ and $\mu_2$ when
$\sigma_1^2 = \sigma_2^2$) and the $F$ test (comparing $\sigma_1^2$ and $\sigma_2^2$). They were
not taught. They follow the same pattern with the two-sample statistics of Lesson 6.3 —
the interval pivots of Lesson 7.4 with $\mu_1 - \mu_2 = 0$ or $\sigma_1^2 = \sigma_2^2$ put
in — and one in-class question already asks which statistic to use:

::: example In-class question 28-018: the two-sample statistic
$X \sim N(\mu_1, \sigma^2)$ and $Y \sim N(\mu_2, \sigma^2)$ are independent, $\sigma^2$
unknown. Samples of the **same** size $n$ from each have means $\bar X$, $\bar Y$ and
sample variances $S_1^2$, $S_2^2$. Which statistic tests $H_0: \mu_1 = \mu_2$?
== The two-sample t statistic ==
By Lesson 6.3, with equal variances,
$\frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{S_w\sqrt{1/n_1 + 1/n_2}} \sim t(n_1 + n_2 - 2)$.
Under $H_0$, $\mu_1 - \mu_2 = 0$.
== Equal sizes ==
With $n_1 = n_2 = n$:
$$S_w^2 = \frac{(n-1)S_1^2 + (n-1)S_2^2}{2n - 2} = \frac{S_1^2 + S_2^2}{2}, \qquad \sqrt{\frac1n + \frac1n} = \sqrt{\frac2n}.$$
== Simplify ==
$$T = \frac{\bar X - \bar Y}{\sqrt{\frac{S_1^2 + S_2^2}{2}}\sqrt{\frac2n}} = \frac{\bar X - \bar Y}{\sqrt{\frac{S_1^2 + S_2^2}{n}}} = \frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}}\sqrt n \sim t(2n - 2).$$
This is option C. One would reject $H_0$ when $|T| \ge t_{\alpha/2}(2n-2)$.
:::

::: callout exam What exams ask
Mostly single-choice questions like the seven below: pick the right test and critical
value, the rejection region for a one-sided hypothesis, the statistic written in another
form (with $Q^2 = \sum(X_i - \bar X)^2$), or what happens when $\alpha$ changes. A
calculation question runs the four steps; finish with a sentence that answers the
original question ("the claim cannot be rejected").
:::

::: cards Tests for one normal population
One-sided U test, $H_0: \mu \le \mu_0$ :: Reject when $U = \frac{\bar X - \mu_0}{\sigma}\sqrt n \ge u_\alpha$.
One-sided U test, $H_0: \mu \ge \mu_0$ :: Reject when $U \le -u_\alpha$.
Why is P{U ≥ u_α} ≤ α under H₀: μ ≤ μ₀? :: $U \le \widetilde U = \frac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1)$ when $\mu \le \mu_0$, so $\{U \ge u_\alpha\} \subset \{\widetilde U \ge u_\alpha\}$.
Where does the rejection region lie? :: On the side of $H_1$: opposite to the inequality in $H_0$.
t test statistic :: $T = \frac{\bar X - \mu_0}{S}\sqrt n \sim t(n-1)$ at $\mu = \mu_0$; used when σ² is unknown.
t test regions :: $|T| \ge t_{\alpha/2}(n-1)$; $T \ge t_\alpha(n-1)$ for $\mu \le \mu_0$; $T \le -t_\alpha(n-1)$ for $\mu \ge \mu_0$.
χ² test statistic :: $\chi^2 = \frac{(n-1)S^2}{\sigma_0^2} \sim \chi^2(n-1)$ at $\sigma^2 = \sigma_0^2$.
χ² test, two-sided region :: $\chi^2 \le \chi^2_{1-\alpha/2}(n-1)$ or $\chi^2 \ge \chi^2_{\alpha/2}(n-1)$.
χ² test, $H_0: \sigma^2 \le \sigma_0^2$ :: Reject when $\chi^2 \ge \chi^2_\alpha(n-1)$.
χ² test, $H_0: \sigma^2 \ge \sigma_0^2$ :: Reject when $\chi^2 \le \chi^2_{1-\alpha}(n-1)$.
Rejected at α = 0.05: what at α = 0.1? :: Rejected too (smaller critical value). Accepted at 0.05 ⇒ accepted at 0.01.
Two-sample t statistic, equal sizes n :: $\frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}}\sqrt n \sim t(2n-2)$ under $\mu_1 = \mu_2$.
Critical values $t_{0.05}(15)$, $t_{0.025}(9)$ :: 1.753 and 2.262.
:::

::: quiz Tests for one normal population
? (In-class question 28-012) $X \sim N(\mu, \sigma^2)$; a sample of 10 has mean 67.4 and sample variance 35.15. Testing $H_0: \mu = 72$ at $\alpha = 0.05$, which is right?
- [ ] U test, critical value $u_{0.025} = 1.96$, reject $H_0$
- [x] t test, critical value $t_{0.025}(9) = 2.262$, reject $H_0$
- [ ] t test, critical value $t_{0.05}(9) = 1.83$, reject $H_0$
- [ ] U test, critical value $u_{0.05} = 1.64$, reject $H_0$
> Only the sample variance is known, so it's a $t$ test; $H_0$ is "$=$", so two-sided with
> $t_{0.025}(9) = 2.262$. $s = \sqrt{35.15} \approx 5.929$,
> $t = \frac{67.4 - 72}{5.929}\sqrt{10} \approx -2.45$, $|t| > 2.262$: reject.

? (In-class question 28-013) $X \sim N(\mu, \sigma^2)$ with $\sigma^2$ known. $H_0: \mu = \mu_0$ is accepted at $\alpha = 0.05$. If $\alpha$ is changed to 0.01, then
- [ ] $H_0$ must be rejected
- [x] $H_0$ must be accepted
- [ ] the type I error probability becomes larger
- [ ] the type II error probability becomes smaller
> Acceptance means $|u| < u_{0.025} = 1.96 < u_{0.005} = 2.576$, so it is accepted at 0.01
> too. A smaller $\alpha$ lowers the type I error probability and raises the type II.

? (In-class question 28-014) Normal sample, $\sigma^2$ unknown, testing $H_0: \mu = \mu_0$ against $H_1: \mu \ne \mu_0$. Then
- [x] if $H_0$ is rejected at $\alpha = 0.05$, it must be rejected at $\alpha = 0.1$
- [ ] if $H_0$ is rejected at $\alpha = 0.05$, it must be accepted at $\alpha = 0.1$
- [ ] if $H_0$ is accepted at $\alpha = 0.05$, it must be rejected at $\alpha = 0.1$
- [ ] if $H_0$ is accepted at $\alpha = 0.05$, it must be accepted at $\alpha = 0.1$
> Rejection at 0.05 means $|t| \ge t_{0.025}(n-1) > t_{0.05}(n-1)$, which is the region at
> 0.1. An acceptance at 0.05 could go either way at 0.1.

? (In-class question 28-015) Normal sample, $\mu$ and $\sigma^2$ unknown, $Q^2 = \sum X_i^2 - n\bar X^2$. To test $H_0: \mu = 0$ use
- [x] $\sqrt{n(n-1)}\,\frac{\bar X}{Q}$
- [ ] $\sqrt n\,\frac{\bar X}{Q}$
- [ ] $\sqrt{n-1}\,\frac{\bar X}{Q}$
- [ ] $\sqrt n\,\frac{\bar X}{Q^2}$
> $Q^2 = \sum(X_i - \bar X)^2 = (n-1)S^2$, so $S = Q/\sqrt{n-1}$ and
> $T = \frac{\bar X - 0}{S}\sqrt n = \sqrt{n(n-1)}\,\frac{\bar X}{Q} \sim t(n-1)$.

? (In-class question 28-016) Normal sample, $\sigma^2$ unknown, testing $H_0: \mu \le 0$ at level $\alpha$. The rejection region is
- [x] $\sqrt n\,\frac{\bar X}{S} \ge t_\alpha(n-1)$
- [ ] $\sqrt n\,\frac{\bar X - \mu}{S} \ge t_\alpha(n-1)$
- [ ] $\sqrt n\,\frac{\bar X}{S} \le -t_\alpha(n-1)$
- [ ] $\sqrt n\,\frac{\bar X - \mu}{S} \le -t_\alpha(n-1)$
> $\mu_0 = 0$ and $H_0: \mu \le \mu_0$ is rejected by large $T = \sqrt n\,\bar X/S$:
> $T \ge t_\alpha(n-1)$. Options with $\mu$ contain an unknown and can't be computed.

? (In-class question 28-017) Sample from $N(\mu, 2)$, $U_\alpha$ the upper quantile of $N(0,1)$. For $H_0: \mu \le 1$, $H_1: \mu > 1$ the rejection region at level $\alpha$ is
- [ ] $\bar X > 1 + \frac{2}{n}U_\alpha$
- [ ] $\bar X > 1 + \frac{\sqrt2}{n}U_\alpha$
- [ ] $\bar X > 1 + \frac{2}{\sqrt n}U_\alpha$
- [x] $\bar X > 1 + \sqrt{\frac2n}\,U_\alpha$
> $\sigma^2 = 2$ is known, so $U = \frac{\bar X - 1}{\sqrt2}\sqrt n > U_\alpha$, i.e.
> $\bar X > 1 + \frac{\sqrt2}{\sqrt n}U_\alpha = 1 + \sqrt{2/n}\,U_\alpha$. (Mind that the 2
> is the variance, not $\sigma$.)

? (In-class question 28-018) $X \sim N(\mu_1, \sigma^2)$, $Y \sim N(\mu_2, \sigma^2)$ independent, $\sigma^2$ unknown, samples of size $n$ each. To test $H_0: \mu_1 = \mu_2$ use
- [ ] $\frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}}\sqrt{n-1}$
- [ ] $\frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}\sqrt{n-1}}$
- [x] $\frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}}\sqrt n$
- [ ] $\frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}\sqrt n}$
> With equal sizes $S_w^2 = (S_1^2 + S_2^2)/2$ and $\sqrt{1/n + 1/n} = \sqrt{2/n}$, so
> $T = \frac{\bar X - \bar Y}{S_w\sqrt{2/n}} = \frac{\bar X - \bar Y}{\sqrt{S_1^2 + S_2^2}}\sqrt n \sim t(2n-2)$.

? In the motor example ($n = 16$, $\bar x = 0.92$, $s = 0.32$, $H_0: \mu \le 0.8$), compute the value of $T$.
answer: 1.5
> $t = \frac{0.92 - 0.8}{0.32}\sqrt{16} = 0.375 \times 4 = 1.5 < t_{0.05}(15) = 1.753$: accept.

? A normal sample of 10 has $s^2 = 9$. Compute the $\chi^2$ statistic for $H_0: \sigma^2 = 4$.
answer: 9 * 9 / 4
> $\chi^2 = \frac{(n-1)s^2}{\sigma_0^2} = \frac{9 \times 9}{4} = 20.25$.

? Continuing: at $\alpha = 0.05$ ($\chi^2_{0.025}(9) = 19.023$, $\chi^2_{0.975}(9) = 2.700$), what is the decision?
- [x] Reject $H_0$, since $20.25 \ge 19.023$
- [ ] Accept $H_0$, since $20.25 > 2.700$
- [ ] Reject $H_0$, since $20.25 \ge \chi^2_{0.05}(9) = 16.919$, the one-sided value
- [ ] It can't be decided without $\mu$
> Two-sided: reject when $\chi^2 \le 2.700$ or $\chi^2 \ge 19.023$. $20.25 \ge 19.023$, so
> reject. $\mu$ isn't needed: $S^2$ already uses $\bar X$.

? Wire strength: $\sigma = 40$, $n = 25$, $\bar x = 985$, $H_0: \mu \ge 1000$. Compute $U$.
answer: -1.875
> $u = \frac{985 - 1000}{40}\times 5 = -1.875 \le -u_{0.05} = -1.645$, so $H_0$ is rejected.
:::

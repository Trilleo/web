---
title: Confidence intervals
zh: 区间估计
summary: Interval estimates with a stated confidence level — the idea, Neyman's principle, the five-step pivot method, and the intervals for μ, σ², μ1 − μ2 and σ1²/σ2² of normal populations.
source: 22区间估计和假设检验 (§7.2), 2026-11-18
---

A point estimate (Lessons 7.1–7.3) gives one number: "the lake holds about 1000 fish",
"the mean length is 40 cm". But it says nothing about how far off that number might
be, so you can't tell whether to trust it to the nearest fish or the nearest thousand.
An {{term interval estimate | 区间估计}} fixes that: it gives a range, together with a
probability that the method catches the true value. This lesson builds such intervals
for the parameters of one and of two normal populations, all with the same five-step
recipe, and it is the most formula-heavy lesson of the unit: exams almost always contain
a confidence interval to compute, so the summary table at the end is worth knowing by
heart.

You will need the sampling distributions of Lesson 6.3 (the facts about $\bar X$ and
$S^2$ for a normal sample, and the pooled variance $S_w^2$) and the upper quantiles
$u_\alpha$, $t_\alpha(n)$, $\chi^2_\alpha(n)$, $F_\alpha(n_1,n_2)$ of Lesson 6.2.

## Why an interval?

Go back to the lake. Suppose the maximum likelihood estimate of the number of fish is
$\hat N = 1000$. The true $N$ is almost certainly *not* exactly 1000: it may be more, it
may be less. A statement like "we are fairly sure $N$ lies between 900 and 1100" is far
more useful, because it carries its own margin of error.

How sure is "fairly sure"? We measure it with a probability, called the confidence
level. The interval's ends are worked out from the sample, so before the sample is drawn
they are random variables: the interval itself is random, and we want it to cover the
fixed, unknown parameter with high probability.

::: define Confidence interval | 置信区间
Let $\theta$ be an unknown parameter and $0 < \alpha < 1$ a given number. If two
statistics $\hat\theta_1 = \hat\theta_1(X_1,\ldots,X_n)$ and
$\hat\theta_2 = \hat\theta_2(X_1,\ldots,X_n)$ satisfy
$$P\{\hat\theta_1 < \theta < \hat\theta_2\} = 1 - \alpha,$$
the random interval $(\hat\theta_1, \hat\theta_2)$ is called a **confidence interval** for
$\theta$ at {{term confidence level | 置信度}} (置信水平) $1-\alpha$. $\hat\theta_1$ is the
{{term lower confidence limit | 置信下限}} and $\hat\theta_2$ the
{{term upper confidence limit | 置信上限}}.
:::

So interval estimation means finding two bounds that depend only on the sample. Once
the sample values are in, we compute the two numbers and say "$\theta$ lies in
$(\hat\theta_1, \hat\theta_2)$".

### Reliability and precision

Three things to notice about a confidence interval:

1. $(\hat\theta_1, \hat\theta_2)$ is a {{term random interval | 随机区间}}: a new sample
   gives a new interval.
2. The confidence level $1-\alpha$ measures its **reliability** (可靠度): how often the
   method succeeds.
3. Its length $\hat\theta_2 - \hat\theta_1$ measures its **precision** (精确度): the
   shorter, the more precise.

And the two pull against each other. "The mean height of students is between 0 and
3 metres" is 100% reliable and useless; "it is between 1.701 and 1.702 m" is precise and
almost certainly wrong. Higher precision means a shorter interval, which means lower
reliability; a longer interval is more reliable and less precise.

::: callout key Neyman's principle
Reliability and precision constrain each other, so the statistician J. Neyman proposed:
**first fix the confidence level, then make the interval as short as possible**
(在给定置信度的条件下，尽可能提高精度). Every interval in this lesson follows this rule:
$1-\alpha$ is given (usually 0.95), and the cut points are chosen to give the shortest
interval.
:::

::: callout pitfall What "95%" means
After the numbers are in, an interval such as $(39.51, 40.49)$ either contains $\mu$ or
it doesn't: $\mu$ is a fixed number, not a random one. The 95% belongs to the
**method**: if you drew many samples and built an interval from each, about 95% of those
intervals would cover $\mu$. Saying "$P\{39.51 < \mu < 40.49\} = 0.95$" is the common
slip.
:::

## One normal population: μ with σ² known

Throughout this part, $X \sim N(\mu, \sigma^2)$, $X_1, \ldots, X_n$ is a simple random
sample, and $\bar X$, $S^2$ are the sample mean and sample variance (divisor $n-1$).

Start with the simplest case: $\sigma^2$ is known (say, from the machine's long record),
and we want a confidence interval for $\mu$ at level $1-\alpha$.

**A good estimate.** $\bar X$ is an unbiased estimator of $\mu$ (Lesson 7.3), so the
interval should be centred on it.

**A quantity with a known distribution.** By Lesson 6.3, $\bar X \sim N(\mu, \sigma^2/n)$,
so
$$U = \frac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1).$$
$U$ involves the unknown $\mu$, but its distribution, $N(0,1)$, involves nothing unknown.
That is the key.

**Cut off two tails.** Choose constants $a < b$ with $P\{a < U < b\} = 1-\alpha$. Taking
the tails equal, $\alpha/2$ each, gives $a = -u_{\alpha/2}$ and $b = u_{\alpha/2}$, where
$u_{\alpha/2}$ is the upper $\alpha/2$ quantile of $N(0,1)$ ($P\{U > u_{\alpha/2}\} = \alpha/2$;
for $\alpha = 0.05$, $u_{0.025} = 1.96$ because $\Phi(1.96) = 0.975$):
$$P\left\{-u_{\alpha/2} < \frac{\bar X - \mu}{\sigma/\sqrt n} < u_{\alpha/2}\right\} = 1-\alpha.$$

**Solve for μ.** Multiply through by $\sigma/\sqrt n$ and rearrange:
$$P\left\{\bar X - u_{\alpha/2}\frac{\sigma}{\sqrt n} < \mu < \bar X + u_{\alpha/2}\frac{\sigma}{\sqrt n}\right\} = 1-\alpha.$$

::: formula Confidence interval for μ, σ² known | σ²已知时μ的置信区间
$$\left(\bar X - u_{\alpha/2}\frac{\sigma}{\sqrt n},\ \bar X + u_{\alpha/2}\frac{\sigma}{\sqrt n}\right)$$
--
\bar X | sample mean |
\sigma | the known population standard deviation |
n | sample size |
u_{\alpha/2} | upper α/2 quantile of N(0,1); 1.96 for 1 − α = 0.95, 1.645 for 0.90 |
1-\alpha | confidence level |
:::

The shaded middle area below is $1-\alpha$; each tail outside $\pm u$ holds $\alpha/2$.
Move $u$ and watch the confidence level $2\Phi(u) - 1$ change ($u = 1.96$ gives 0.95).

::: plot The middle area 1 − α between −u and u
x: -4 .. 4
xlabel: u
ylabel: f(u)
f(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Middle: -u < x < u, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
slider u: 0.5 .. 3 = 1.96
:::

::: example Example 1: the mean length of parts
The length $X$ (cm) of a batch of parts has $X \sim N(\mu, 1)$. A random sample of 16
parts has mean length 40 cm. Find a 95% confidence interval for $\mu$.
($\Phi(1.96) = 0.975$, $\Phi(1.645) = 0.95$.)
== Identify the case ==
The parameter is $\mu$; the variance $\sigma^2 = 1$ is known, so we use the $U$
interval. $1-\alpha = 0.95$, $\alpha/2 = 0.025$, and $u_{0.025} = 1.96$ since
$\Phi(1.96) = 0.975$. (The value 1.645 is $u_{0.05}$, a distractor here.)
== Half-width ==
$\sigma/\sqrt n = 1/\sqrt{16} = 1/4$, so the half-width is $1.96 \times \frac14 = 0.49$.
== Interval ==
$$(40 - 0.49,\ 40 + 0.49) = (39.51,\ 40.49).$$
:::

### Is the interval unique?

No. Any $a < b$ with $P\{a < U < b\} = 1-\alpha$ gives a valid interval: you could leave
1% in the left tail and 4% in the right. Why does everyone use the symmetric cut points?
Because the standard normal density is highest in the middle and symmetric, so for a
fixed area $1-\alpha$ the shortest stretch $(a, b)$ is the one centred at 0 — Neyman's
principle in action. Try it: the explorer keeps the coverage near 0.95 only if you move
$a$ and $b$ together, and the length $b - a$ is smallest at $a = -1.96$, $b = 1.96$
(length 3.92). For example $a = -1.75$, $b = 2.33$ also covers 0.95 but has length 4.08.

::: explore Unequal tails: same coverage, longer interval
slider a: -3 .. 0 = -1.75
slider b: 0 .. 3 = 2.33
cover = Phi(b) - Phi(a) | | Coverage Φ(b) − Φ(a)
len = b - a | | Length b − a (in units of σ/√n)
:::

## The five-step method

The derivation above works for every interval in this lesson. Only the "quantity with a
known distribution" changes. Such a quantity — a function of the sample and the unknown
parameter whose distribution is known and free of unknown parameters — is called a
{{term pivotal quantity | 枢轴量}} (the slides simply call it the function $U(T, \theta)$).

::: callout summary How to find a confidence interval (求置信区间的方法)
1. Be clear what is asked: a confidence interval for **which** parameter $\theta$, at
   **which** level $1-\alpha$?
2. Find a good point estimate $T(X_1, \ldots, X_n)$ of $\theta$.
3. Find a function $U(T, \theta)$ of the estimate and the parameter whose distribution is
   known (and depends on no unknown parameter).
4. For the given $1-\alpha$, use that distribution to find constants $a, b$ with
   $P\{a < U(T, \theta) < b\} = 1-\alpha$ (equal tails of $\alpha/2$).
5. Rewrite $a < U(T, \theta) < b$ in the equivalent form
   $\hat\theta_1 < \theta < \hat\theta_2$. Then $(\hat\theta_1, \hat\theta_2)$ is the
   confidence interval.
:::

Step 3 is where everything depends on the population: you need to know what kind of
distribution it has, because the pivot's distribution comes from it. For normal
populations, Lesson 6.3 supplies all the pivots we need:

- $\dfrac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1)$;
- $\dfrac{\bar X - \mu}{S}\sqrt n \sim t(n-1)$;
- $\dfrac{(n-1)S^2}{\sigma^2} = \dfrac{1}{\sigma^2}\sum_{i=1}^n (X_i - \bar X)^2 \sim \chi^2(n-1)$
  (if the slides write $S^{*2}$ for the variance with divisor $n$, this is also
  $nS^{*2}/\sigma^2$);
- and $\bar X$ and $S^2$ are independent.

## One normal population: μ with σ² unknown

Usually $\sigma$ is not known. Then $U$ is useless — it contains $\sigma$ — so replace
$\sigma$ by its estimate $S$. The price is that the pivot is no longer normal but has a
$t$ distribution with $n-1$ degrees of freedom:
$$T = \frac{\bar X - \mu}{S/\sqrt n} \sim t(n-1).$$
The $t$ density is also symmetric about 0, so cut off $\alpha/2$ on each side:
$$P\left\{-t_{\alpha/2}(n-1) < T < t_{\alpha/2}(n-1)\right\} = 1-\alpha,$$
and solving for $\mu$ exactly as before gives the interval.

::: formula Confidence interval for μ, σ² unknown | σ²未知时μ的置信区间
$$\left(\bar X - t_{\alpha/2}(n-1)\frac{S}{\sqrt n},\ \bar X + t_{\alpha/2}(n-1)\frac{S}{\sqrt n}\right)$$
--
S | sample standard deviation (divisor n − 1) |
t_{\alpha/2}(n-1) | upper α/2 quantile of the t distribution with n − 1 degrees of freedom |
n | sample size |
:::

The $t$ density has heavier tails than the normal (it accounts for the extra
uncertainty in $S$), so $t_{\alpha/2}(n-1) > u_{\alpha/2}$ and the interval is a little
wider. As $n$ grows the two curves merge. Compare them below for 9 degrees of freedom:
the shaded strip is the middle 95% of $t(9)$, between $\pm 2.262$.

::: plot t(n) against N(0, 1): heavier tails
x: -5 .. 5
xlabel: x
t(x) = gamma((n + 1) / 2) / (sqrt(n pi) gamma(n / 2)) (1 + x^2 / n)^(-(n + 1) / 2)
φ(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Middle: -2.262 < x < 2.262, 0 < y < gamma(5) / (sqrt(9 pi) gamma(4.5)) (1 + x^2 / 9)^(-5)
slider n: 1 .. 30 = 9 | | step 1
:::

(The shaded strip is drawn for $n = 9$; move $n$ to watch the $t$ curve approach the
normal one.)

::: example Example 2: the mean of a normal population, variance estimated
$X$ is normally distributed. A simple random sample of size 10 has mean 5 and sample
variance 1. Find a 95% confidence interval for $E(X)$.
== Read the data ==
"Sample variance 1" (样本方差为1) means $S^2 = 1$, computed from the sample; the
population variance $\sigma^2$ is **not** given. So $\sigma^2$ is unknown and we use the
$t$ interval. $n = 10$, $\bar x = 5$, $s = 1$, $\alpha/2 = 0.025$.
== Quantile ==
$t_{0.025}(9) = 2.2622$ (from the $t$ table).
== Half-width ==
$t_{0.025}(9)\dfrac{s}{\sqrt n} = 2.2622 \times \dfrac{1}{\sqrt{10}} = 2.2622 \times 0.3162 \approx 0.7154$.
== Interval ==
$$(5 - 0.7154,\ 5 + 0.7154) \approx (4.285,\ 5.715).$$
:::

::: callout pitfall Sample variance or population variance?
The slide shows both formulas beside Example 2 on purpose: the whole question is which
one to use. A variance computed **from the sample** ($S^2$, "样本方差") means
$\sigma^2$ is unknown: use $t_{\alpha/2}(n-1)$. Only a variance stated as the
**population's** ("$X \sim N(\mu, 1)$", "已知 $\sigma^2 = 1$") lets you use $u_{\alpha/2}$.
Had the 1 been the known $\sigma^2$, the answer would be
$5 \pm 1.96/\sqrt{10} = 5 \pm 0.620$, about $(4.38, 5.62)$ — narrower, because knowing
$\sigma$ removes some uncertainty.
:::

## One normal population: σ²

Now estimate the variance itself. The natural estimate is $S^2$, and the pivot is
$$\chi^2 = \frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1).$$
The $\chi^2$ density lives on $(0, +\infty)$ and is skewed to the right, so "equal tails"
no longer means symmetric cut points. Leave $\alpha/2$ in each tail:
$$P\left\{\chi^2_{1-\alpha/2}(n-1) < \frac{(n-1)S^2}{\sigma^2} < \chi^2_{\alpha/2}(n-1)\right\} = 1-\alpha,$$
where $\chi^2_{1-\alpha/2}(n-1)$ is the **lower** cut point (area $1-\alpha/2$ to its right)
and $\chi^2_{\alpha/2}(n-1)$ the upper one. Now solve for $\sigma^2$: taking reciprocals
flips the inequalities, so the **larger** quantile ends up in the **lower** limit.

::: formula Confidence interval for σ² | σ²的置信区间
$$\left(\frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)},\ \frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}\right)$$
--
(n-1)S^2 | the sum of squares \sum (X_i - \bar X)^2 |
\chi^2_{\alpha/2}(n-1) | upper α/2 quantile of χ²(n − 1) (the larger one: goes under the lower limit) |
\chi^2_{1-\alpha/2}(n-1) | upper 1 − α/2 quantile (the smaller one: goes under the upper limit) |
:::

For $\sigma$ itself take square roots of both ends (the interval is not symmetric about
$S^2$, and neither is the one for $\sigma$ about $S$).

::: plot χ²(3): equal tails of 0.025 at 0.216 and 9.348
x: 0 .. 14
xlabel: x
ylabel: f(x)
f(x) = sqrt(x) e^(-x / 2) / (2^1.5 gamma(1.5))
region Left: 0 < x < 0.216, 0 < y < sqrt(x) e^(-x / 2) / (2^1.5 gamma(1.5))
region Right: x > 9.348, 0 < y < sqrt(x) e^(-x / 2) / (2^1.5 gamma(1.5))
:::

::: example Example 3: the variance of part sizes
A factory's parts have size $X \sim N(\mu, \sigma^2)$. Four parts taken at random from one
day's output measure 12.6, 13.4, 12.8, 13.2. Find a 95% confidence interval for $\sigma^2$.
== Sample mean ==
$\bar x = \frac{12.6 + 13.4 + 12.8 + 13.2}{4} = \frac{52}{4} = 13.0$.
== Sum of squares ==
$$(n-1)s^2 = \sum (x_i - \bar x)^2 = 0.4^2 + 0.4^2 + 0.2^2 + 0.2^2 = 0.16 + 0.16 + 0.04 + 0.04 = 0.40,$$
so $s^2 = 0.40/3 \approx 0.1333$.
== Quantiles ==
$n - 1 = 3$, $\alpha/2 = 0.025$: $\chi^2_{0.025}(3) = 9.348$ and $\chi^2_{0.975}(3) = 0.216$.
== Interval ==
$$\left(\frac{0.40}{9.348},\ \frac{0.40}{0.216}\right) \approx (0.0428,\ 1.85).$$
The interval is very wide — four observations say little about a variance.
:::

::: callout pitfall Which quantile goes where
Under the **lower** limit sits the **larger** quantile $\chi^2_{\alpha/2}$. If your
"interval" comes out with the left end bigger than the right, you have swapped them.
Also note the numerator is $(n-1)S^2 = \sum(x_i - \bar x)^2$, not $S^2$.
:::

## Working backwards: the sample size

The half-width $u_{\alpha/2}\,\sigma/\sqrt n$ of the known-variance interval shrinks like
$1/\sqrt n$: to halve the interval you need four times the data. Turn it round and you
can find the $n$ that gives a required precision, as in the in-class fill-in question.

::: example In-class question 27-029: how large a sample?
$X \sim N(\mu, \sigma^2)$ with $\sigma^2 = 9$. If $(\bar X - 0.98,\ \bar X + 0.98)$ is a 95%
confidence interval for $\mu$, find $n$. ($\Phi(1.96) = 0.975$.)
== Match the half-width ==
$\sigma = 3$ is known, so the half-width is $u_{0.025}\,\sigma/\sqrt n = 1.96 \times 3/\sqrt n$.
== Solve ==
$$\frac{1.96 \times 3}{\sqrt n} = 0.98 \;\Rightarrow\; \sqrt n = \frac{5.88}{0.98} = 6 \;\Rightarrow\; n = 36.$$
:::

Play with the trade-off: the level rises with $u$, and the length grows with $u$ and
$\sigma$ and falls with $n$.

::: explore Precision against reliability (σ² known)
slider u: 0.5 .. 3.5 = 1.96 | | critical value u_{α/2}
slider σ: 0.5 .. 10 = 3
slider n: 1 .. 200 = 36 | | step 1
level = 2 Phi(u) - 1 | | Confidence level 1 − α
len = 2 u σ / sqrt(n) | | Interval length
:::

## Two normal populations

Often the question is a comparison: is one fertiliser better than another, is one
machine more variable than the other? Then we need intervals for the difference of
two means or the ratio of two variances.

Set-up: $X \sim N(\mu_1, \sigma_1^2)$ and $Y \sim N(\mu_2, \sigma_2^2)$ are independent;
$X_1, \ldots, X_{n_1}$ is a sample from $X$ with mean $\bar X$ and sample variance $S_1^2$,
and $Y_1, \ldots, Y_{n_2}$ a sample from $Y$ with $\bar Y$ and $S_2^2$. The pooled sample
variance (Lesson 6.3) combines the two:
$$S_w^2 = \frac{(n_1-1)S_1^2 + (n_2-1)S_2^2}{n_1 + n_2 - 2}, \qquad S_w = \sqrt{S_w^2}.$$
Lesson 6.3 also gives the two pivots:

- if $\sigma_1^2 = \sigma_2^2 = \sigma^2$:
  $\dfrac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{S_w\sqrt{1/n_1 + 1/n_2}} \sim t(n_1 + n_2 - 2)$;
- always: $\dfrac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1 - 1, n_2 - 1)$.

(The slide states the $F$ result "if $\sigma_1^2 \neq \sigma_2^2$"; it holds whether or not
the variances are equal — the point is only that $\sigma_1^2$ and $\sigma_2^2$ stay in the
ratio.)

### μ1 − μ2 with equal variances

The pivot is
$$T = \frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{S_w\sqrt{1/n_1 + 1/n_2}} \sim t(n_1 + n_2 - 2),$$
symmetric, so $P\{|T| < t_{\alpha/2}(n_1 + n_2 - 2)\} = 1-\alpha$, and solving for
$\mu_1 - \mu_2$ gives:

::: formula Confidence interval for μ1 − μ2, equal variances | 两总体方差相等时μ1−μ2的置信区间
$$(\bar X - \bar Y) \pm t_{\alpha/2}(n_1 + n_2 - 2)\, S_w \sqrt{\frac{1}{n_1} + \frac{1}{n_2}}$$
--
\bar X - \bar Y | difference of the sample means (the point estimate of μ1 − μ2) |
S_w | square root of the pooled variance S_w^2 |
n_1 + n_2 - 2 | degrees of freedom of the t quantile |
:::

(Here $a \pm h$ is shorthand for the interval $(a - h,\ a + h)$.)

::: callout note Errors on the slide
Slide 27-034 writes the pooled variance as
"$S_w = \frac{(n_1-1)S_1^2 + (n_2-1)S_2^3}{n_1+n_2-2}$". Two slips: the $S_2^3$ should
be $S_2^2$, and the left side should be $S_w^2$ (the formula is for the pooled
**variance**; $S_w$ is its square root, as on slide 27-031). The same slide's final
interval also drops the degrees of freedom from $t_{\alpha/2}$: they are
$n_1 + n_2 - 2$, as in the line above it.
:::

::: example Comparing two filling machines (own example)
Two machines fill bags. Ten bags from machine A have mean 502 g and sample variance
$s_1^2 = 16$; twelve bags from machine B have mean 498 g and $s_2^2 = 20$. Assume both are
normal with equal variances. Find a 95% confidence interval for $\mu_1 - \mu_2$.
($t_{0.025}(20) = 2.0860$.)
== Pooled variance ==
$$s_w^2 = \frac{9 \times 16 + 11 \times 20}{10 + 12 - 2} = \frac{144 + 220}{20} = 18.2, \qquad s_w = 4.266.$$
== Half-width ==
$\sqrt{1/10 + 1/12} = \sqrt{0.18333} = 0.4282$, so
$2.0860 \times 4.266 \times 0.4282 \approx 3.810$.
== Interval ==
$\bar x - \bar y = 4$, so the interval is $(4 - 3.810,\ 4 + 3.810) = (0.19,\ 7.81)$.
== Read it ==
The whole interval is above 0: at this level, machine A fills more than machine B on
average.
:::

### σ1²/σ2²

The pivot is
$$F = \frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1 - 1, n_2 - 1).$$
Like $\chi^2$, the $F$ density is skewed, so take the two cut points
$F_{1-\alpha/2}(n_1-1, n_2-1)$ and $F_{\alpha/2}(n_1-1, n_2-1)$, each leaving $\alpha/2$
outside:
$$P\left\{F_{1-\alpha/2}(n_1-1, n_2-1) < F < F_{\alpha/2}(n_1-1, n_2-1)\right\} = 1-\alpha.$$
Since $F = \dfrac{S_1^2}{S_2^2}\cdot\dfrac{\sigma_2^2}{\sigma_1^2}$, solving for
$\sigma_1^2/\sigma_2^2$ again puts the larger quantile under the lower limit:

::: formula Confidence interval for σ1²/σ2² | 两总体方差比的置信区间
$$\left(\frac{S_1^2}{S_2^2}\cdot\frac{1}{F_{\alpha/2}(n_1-1, n_2-1)},\ \frac{S_1^2}{S_2^2}\cdot\frac{1}{F_{1-\alpha/2}(n_1-1, n_2-1)}\right)$$
--
S_1^2 / S_2^2 | ratio of the sample variances |
F_{\alpha/2}(n_1-1, n_2-1) | upper α/2 quantile of F(n1 − 1, n2 − 1) |
F_{1-\alpha/2}(n_1-1, n_2-1) | the lower cut point; equals 1 / F_{α/2}(n2 − 1, n1 − 1) (Lesson 6.2) |
:::

Tables list only the upper quantiles for small $\alpha$, so the lower one comes from the
identity $F_{1-\alpha}(m, n) = 1/F_\alpha(n, m)$ of Lesson 6.2.

::: example Were the variances equal? (own example)
For the two machines above, find a 95% confidence interval for $\sigma_1^2/\sigma_2^2$.
($F_{0.025}(9, 11) = 3.588$, $F_{0.025}(11, 9) = 3.912$.)
== Ratio ==
$s_1^2/s_2^2 = 16/20 = 0.8$, with $n_1 - 1 = 9$, $n_2 - 1 = 11$.
== Lower cut point ==
$F_{0.975}(9, 11) = 1/F_{0.025}(11, 9) = 1/3.912 = 0.2556$.
== Interval ==
$$\left(\frac{0.8}{3.588},\ \frac{0.8}{0.2556}\right) \approx (0.223,\ 3.13).$$
== Read it ==
The interval contains 1, so the data are consistent with equal variances, which is
what the previous example assumed.
:::

### Two samples with known variances

When both variances are **known**, no pooling is needed: by independence,
$\bar X - \bar Y \sim N\left(\mu_1 - \mu_2,\ \frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}\right)$,
so the pivot is normal.

::: formula Confidence interval for μ1 − μ2, variances known | 两总体方差已知时μ1−μ2的置信区间
$$(\bar X - \bar Y) \pm u_{\alpha/2}\sqrt{\frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}}$$
--
\sigma_1^2, \sigma_2^2 | the known population variances |
u_{\alpha/2} | upper α/2 quantile of N(0,1) |
:::

::: example In-class question 27-037 (subjective): known variances 3² and 4²
$X_1, \ldots, X_{100}$ and $Y_1, \ldots, Y_{100}$ are independent simple random samples
from $X \sim N(\mu_1, 3^2)$ and $Y \sim N(\mu_2, 4^2)$. Find the confidence interval for
$\mu_1 - \mu_2$ at level $1-\alpha$.
== Distributions of the means ==
$\bar X \sim N\left(\mu_1, \frac{3^2}{100}\right)$ and $\bar Y \sim N\left(\mu_2, \frac{4^2}{100}\right)$,
independent, so
$$\bar X - \bar Y \sim N\left(\mu_1 - \mu_2,\ \frac{9}{100} + \frac{16}{100}\right) = N(\mu_1 - \mu_2,\ 0.25).$$
== Pivot ==
$$U = \frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{\sqrt{0.25}} = \frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{0.5} \sim N(0,1), \qquad P\{|U| < u_{\alpha/2}\} = 1-\alpha.$$
== Solve for μ1 − μ2 ==
$$\left(\bar X - \bar Y - 0.5\,u_{\alpha/2},\ \bar X - \bar Y + 0.5\,u_{\alpha/2}\right).$$
For $1 - \alpha = 0.95$ that is $\bar X - \bar Y \pm 0.98$. (The slide stops after
$P\{|U| < u_{\alpha/2}\} = 1-\alpha$; this last step completes it.)
:::

## All the intervals at a glance

| Parameter | Condition | Pivot and its distribution | Confidence interval |
| --- | --- | --- | --- |
| Mean $\mu$ | $\sigma^2$ known | $\frac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1)$ | $\bar X \pm u_{\alpha/2}\frac{\sigma}{\sqrt n}$ |
| Mean $\mu$ | $\sigma^2$ unknown | $\frac{\bar X - \mu}{S}\sqrt n \sim t(n-1)$ | $\bar X \pm t_{\alpha/2}(n-1)\frac{S}{\sqrt n}$ |
| Variance $\sigma^2$ | $\mu$ unknown | $\frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$ | $\left(\frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)}, \frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}\right)$ |
| Difference $\mu_1 - \mu_2$ | $\sigma_1^2, \sigma_2^2$ known | $\frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{\sqrt{\sigma_1^2/n_1 + \sigma_2^2/n_2}} \sim N(0,1)$ | $\bar X - \bar Y \pm u_{\alpha/2}\sqrt{\frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}}$ |
| Difference $\mu_1 - \mu_2$ | $\sigma_1^2 = \sigma_2^2$ unknown | $\frac{(\bar X - \bar Y) - (\mu_1 - \mu_2)}{S_w\sqrt{1/n_1 + 1/n_2}} \sim t(n_1 + n_2 - 2)$ | $\bar X - \bar Y \pm t_{\alpha/2}(n_1 + n_2 - 2) S_w\sqrt{\frac{1}{n_1} + \frac{1}{n_2}}$ |
| Ratio $\sigma_1^2/\sigma_2^2$ | $\mu_1, \mu_2$ unknown | $\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1-1, n_2-1)$ | $\left(\frac{S_1^2/S_2^2}{F_{\alpha/2}(n_1-1, n_2-1)}, \frac{S_1^2/S_2^2}{F_{1-\alpha/2}(n_1-1, n_2-1)}\right)$ |

::: callout exam What exams ask
A fill-in or a short calculation: "find the 95% confidence interval for $\mu$" (first
decide whether $\sigma^2$ is known: Example 1 against Example 2), the interval for
$\sigma^2$ from raw data (Example 3: compute $\sum(x_i - \bar x)^2$ carefully), or working
backwards to $n$ or to the half-width (27-029). Exams give the $\Phi$, $t$, $\chi^2$ or
$F$ values you need; the skill is picking the right ones — $\alpha/2$, not $\alpha$, and
$n-1$ degrees of freedom.
:::

::: cards Confidence intervals
Confidence interval at level 1 − α :: A random interval $(\hat\theta_1, \hat\theta_2)$ of statistics with $P\{\hat\theta_1 < \theta < \hat\theta_2\} = 1-\alpha$.
Reliability vs precision of an interval :: Reliability = the level $1-\alpha$; precision = the shortness of the interval. They constrain each other.
Neyman's principle :: Fix the confidence level first, then make the interval as short as possible.
Meaning of a 95% confidence interval :: About 95% of intervals built this way from repeated samples cover the true parameter; a computed interval either covers it or not.
Pivotal quantity (the function U(T, θ)) :: A function of the estimate and the parameter whose distribution is known and free of unknown parameters.
Interval for μ when σ² is known :: $\bar X \pm u_{\alpha/2}\,\sigma/\sqrt n$.
Interval for μ when σ² is unknown :: $\bar X \pm t_{\alpha/2}(n-1)\,S/\sqrt n$.
Interval for σ² :: $\left(\frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)}, \frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}\right)$ — larger quantile under the lower limit.
Interval for μ1 − μ2, equal unknown variances :: $\bar X - \bar Y \pm t_{\alpha/2}(n_1+n_2-2)\,S_w\sqrt{1/n_1 + 1/n_2}$.
Interval for μ1 − μ2, known variances :: $\bar X - \bar Y \pm u_{\alpha/2}\sqrt{\sigma_1^2/n_1 + \sigma_2^2/n_2}$.
Interval for σ1²/σ2² :: $\left(\frac{S_1^2/S_2^2}{F_{\alpha/2}(n_1-1,n_2-1)}, \frac{S_1^2/S_2^2}{F_{1-\alpha/2}(n_1-1,n_2-1)}\right)$.
Why symmetric cut points for N(0,1) or t? :: For a symmetric, single-peaked density they give the shortest interval at the given level.
How does the length depend on n (σ known)? :: Like $1/\sqrt n$: four times the sample halves the interval.
Critical values $u_{0.025}$ and $u_{0.05}$ :: 1.96 and 1.645 ($\Phi(1.96) = 0.975$, $\Phi(1.645) = 0.95$).
:::

::: quiz Confidence intervals
? (In-class question 27-029) $X \sim N(\mu, \sigma^2)$, $\sigma^2 = 9$. If $(\bar X - 0.98, \bar X + 0.98)$ is a 95% confidence interval for $\mu$, then $n =$ ($\Phi(1.96) = 0.975$)
answer: 36
> The half-width is $u_{0.025}\sigma/\sqrt n = 1.96 \times 3/\sqrt n = 0.98$, so
> $\sqrt n = 6$ and $n = 36$.

? (In-class question 27-037) Samples of 100 from $N(\mu_1, 3^2)$ and of 100 from $N(\mu_2, 4^2)$, independent. The confidence interval for $\mu_1 - \mu_2$ is $\bar X - \bar Y \pm h$. Find $h$ at level 0.95.
answer: 1.96 * 0.5
> The variances are known: $\bar X - \bar Y \sim N(\mu_1 - \mu_2, 9/100 + 16/100)$, standard
> deviation $\sqrt{0.25} = 0.5$. So $h = u_{0.025} \times 0.5 = 1.96 \times 0.5 = 0.98$.

? $X \sim N(\mu, 2^2)$; a sample of 25 has mean 10. Find the upper limit of the 95% confidence interval for $\mu$.
answer: 10 + 1.96 * 2 / 5
> $\sigma$ is known: $10 + u_{0.025}\,\sigma/\sqrt n = 10 + 1.96 \times 2/5 = 10.784$.

? $X$ is normal; a sample of 10 has mean 5 and sample variance $S^2 = 1$. Find the **lower** limit of the 95% confidence interval for $\mu$ ($t_{0.025}(9) = 2.2622$).
answer: 5 - 2.2622 / sqrt(10)
> $\sigma^2$ is unknown (only the sample variance is given), so use $t$:
> $5 - 2.2622/\sqrt{10} \approx 5 - 0.7154 = 4.285$.

? For a normal population with $\sigma^2$ unknown, which quantity is used to build the interval for $\mu$?
- [ ] $\frac{\bar X - \mu}{\sigma}\sqrt n \sim N(0,1)$
- [x] $\frac{\bar X - \mu}{S}\sqrt n \sim t(n-1)$
- [ ] $\frac{\bar X - \mu}{S}\sqrt n \sim t(n)$
- [ ] $\frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$
> The first contains the unknown $\sigma$, so it can't give computable limits. Replacing
> $\sigma$ by $S$ gives a $t$ distribution with $n - 1$ (not $n$) degrees of freedom. The
> $\chi^2$ pivot is for $\sigma^2$.

? With the sample size fixed, raising the confidence level from 0.90 to 0.99 makes the interval
- [x] longer
- [ ] shorter
- [ ] the same length
- [ ] longer or shorter, depending on the data
> The critical value grows ($u_{0.05} = 1.645$, $u_{0.005} = 2.576$), so the half-width
> $u_{\alpha/2}\sigma/\sqrt n$ grows: more reliability costs precision.

? A sample of 10 from a normal population has $s^2 = 4$. Find the lower limit of the 95% confidence interval for $\sigma^2$ ($\chi^2_{0.025}(9) = 19.023$, $\chi^2_{0.975}(9) = 2.700$).
answer: 9 * 4 / 19.023
> $(n-1)s^2 = 36$. The lower limit uses the **larger** quantile: $36/19.023 \approx 1.892$
> (the upper limit is $36/2.700 \approx 13.33$).

? Samples of sizes $n_1 = 5$ and $n_2 = 7$ have $S_1^2 = 3$ and $S_2^2 = 5$. Find the pooled variance $S_w^2$.
answer: 4.2
> $S_w^2 = \frac{4 \times 3 + 6 \times 5}{5 + 7 - 2} = \frac{12 + 30}{10} = 4.2$.

? A 95% confidence interval for $\mu$ came out as $(39.51, 40.49)$. Which statement is right?
- [ ] $P\{39.51 < \mu < 40.49\} = 0.95$
- [x] About 95% of intervals built this way from repeated samples would contain $\mu$
- [ ] 95% of the population lies between 39.51 and 40.49
- [ ] $\bar X$ lies in the interval with probability 0.95
> $\mu$ is a fixed number, so a computed interval contains it or not. The 95% describes
> the procedure. The interval is about $\mu$, not about individual values, and it is
> always centred on the observed $\bar x$.

? With $\sigma$ known, how many times larger must the sample be to halve the length of the interval for $\mu$?
answer: 4
> The length is $2u_{\alpha/2}\sigma/\sqrt n$; halving it needs $\sqrt n$ doubled, so $n$
> times 4.
:::

---
title: What makes a good estimator
zh: 估计量的评价标准
summary: How to compare estimators over many samples — unbiasedness, efficiency and consistency — with the standard examples (S*² versus S², X̄ versus n·min Xᵢ, U[0, θ]) and the past final-exam problems.
source: 21点估计12-1, 2026-11-16
---

The last two lessons gave two recipes for estimating a parameter, and they often
disagree: for $U[0, \theta]$ the method of moments says $2\overline{X}$, maximum likelihood
says $X_{(n)}$. For $\sigma^2$ we have $S^{*2}$ (divisor $n$) and $S^2$ (divisor $n - 1$).
Which one should we use? This lesson gives the three standard yardsticks:
{{term unbiasedness | 无偏性}} (right on average), {{term efficiency | 有效性}} (as little
scatter as possible) and {{term consistency | 相合性}} (closer and closer to the truth as
the sample grows). Final exams nearly always end a point-estimation problem with "is this
estimator unbiased?", so the techniques here — computing $E\hat\theta$, $D\hat\theta$, and
the expectation of a maximum or minimum — are worth knowing well.

Notation as before: $X_1, \ldots, X_n$ is a simple random sample from a population with
$EX = \mu$ and $DX = \sigma^2$ ($D$ is the variance, Lesson 4.3); $\overline{X}$ is the
sample mean, $S^2 = \frac1{n-1}\sum(X_i - \overline{X})^2$ the sample variance and
$S^{*2} = \frac1n\sum(X_i - \overline{X})^2$ the sample second central moment (Lesson 6.1);
$X_{(1)}$ and $X_{(n)}$ are the smallest and largest observations.

## Judge an estimator over many samples

Imagine a thousand statisticians, each drawing their own sample of size $n$ from the same
population and each applying the same formula $\hat\theta$. They get a thousand different
estimates, because an estimator is a function of the sample and therefore a **random
variable**. One lucky (or unlucky) sample says nothing about whether the formula is good.

So the lecture stresses: **an estimator must be judged by its behaviour over many trials,
not by the result of one.** A good estimator is one whose thousand estimates cluster
tightly around the true value. That gives three questions, the three standard criteria:

1. **Unbiasedness** (无偏性): is the cluster centred on the true value?
2. **Efficiency** (有效性): how tight is the cluster?
3. **Consistency** (相合性): does the cluster close in on the truth as $n$ grows?

The picture to keep in mind: the distribution of $\hat\theta$ over all possible samples.
Below, the true value is $\theta = 0$. The curve $f$ is an unbiased estimator (centred on
0) with spread $s$; $g$ has the same spread but is shifted by the bias $b$. Shrink $s$ to see
what a more efficient estimator looks like.

::: plot Two estimators' distributions: centred, and biased by b
x: -4 .. 4
xlabel: value of the estimate (true θ = 0)
f(x) = e^(-x^2 / (2 s^2)) / (sqrt(2 pi) s)
g(x) = e^(-(x - b)^2 / (2 s^2)) / (sqrt(2 pi) s)
slider s: 0.3 .. 2 = 1 | | spread
slider b: -2 .. 2 = 1 | | bias
:::

## Unbiasedness

We want the estimates to swing around the true value, sometimes above and sometimes
below, with their average equal to it.

::: define Unbiased estimator | 无偏估计量
An estimator $\hat\theta(X_1, \ldots, X_n)$ of the unknown parameter $\theta$ is
**unbiased** if
$$E(\hat\theta) = \theta$$
for every possible value of $\theta$. Otherwise $E(\hat\theta) - \theta$ is its
{{term bias | 偏差}}.
:::

To check unbiasedness, compute $E\hat\theta$ with the rules of expectation (linearity,
Lesson 4.2) and the facts $E X_i = EX$, $E X_i^2 = EX^2$, and see whether you get $\theta$.

::: example Example 1: the sample mean and the variance estimators
Are $\overline{X}$ and $S^{*2} = \frac1n\sum(X_i - \overline{X})^2$ unbiased for $\mu$ and
$\sigma^2$? If not, correct them.
== The mean ==
$E\overline{X} = \frac1n\sum E X_i = EX = \mu$, so $\overline{X}$ is unbiased for $\mu$.
== S*² ==
From Lesson 6.1, $ES^{*2} = \frac{n-1}{n}\sigma^2 \ne \sigma^2$, so $S^{*2}$ is **biased**: on
average it underestimates $\sigma^2$ by the factor $\frac{n-1}{n}$. (The reason: deviations
are measured from $\overline{X}$, which sits in the middle of the sample and so makes them
smaller than deviations from the true $\mu$.)
== Correct it ==
Multiply by the reciprocal factor: $E\big(\frac{n}{n-1}S^{*2}\big) = \frac{n}{n-1}\cdot\frac{n-1}{n}\sigma^2 = \sigma^2$, and
$$\frac{n}{n-1}S^{*2} = \frac{n}{n-1}\cdot\frac1n\sum_{i=1}^n(X_i-\overline{X})^2 = \frac{1}{n-1}\sum_{i=1}^n(X_i-\overline{X})^2 = S^2.$$
That is exactly the sample variance — the reason it is defined with $n - 1$.
:::

The bias of $S^{*2}$ matters for small samples and fades as $n$ grows:

::: explore Expected value of S*² and S²
slider σ²: 0.1 .. 10 = 4
slider n: 2 .. 50 = 5 | | step 1
starmean = (n - 1) / n σ² | | E S*²
smean = σ² | | E S²
bias = -σ² / n | | Bias of S*²
:::

::: callout pitfall Moment estimator and MLE of σ² are biased
For a normal population both the method of moments and maximum likelihood give
$\widehat{\sigma^2} = S^{*2}$ (Lessons 7.1 and 7.2). "The" good estimator of $\sigma^2$ in
the unbiased sense is $S^2$. But when $\mu$ is **known**, $\frac1n\sum(X_i-\mu)^2$ is
already unbiased, since $E(X_i - \mu)^2 = DX = \sigma^2$ for each $i$: no correction.
:::

### In-class questions on unbiasedness

::: example Choice questions 1 and 2
(1) $X \sim N(\mu, \sigma^2)$. Is $\frac1n\sum(X_i - \overline{X})^2$ an unbiased estimator of
$\mu$, an unbiased estimator of $\sigma^2$, the moment estimator of $\mu$, or the moment
estimator of $\sigma^2$? (2) Which is an unbiased estimator of $\sigma^2$:
$\frac1{n-1}\sum(X_i-\mu)^2$ or $\frac1n\sum(X_i-\mu)^2$, each with $\mu$ known or unknown?
== (1) ==
It is $S^{*2}$, the moment estimator of $\sigma^2$ (answer D). It is not unbiased
($ES^{*2} = \frac{n-1}{n}\sigma^2$) and has nothing to do with $\mu$.
== (2) ==
With $\mu$ unknown, an expression containing $\mu$ isn't a statistic at all, so the
"$\mu$ unknown" options fail. With $\mu$ known,
$E\big[\frac1n\sum(X_i-\mu)^2\big] = \frac1n\cdot n\sigma^2 = \sigma^2$: divisor $n$
(answer D). Dividing by $n - 1$ would overestimate.
:::

The fill-in questions ask for a combination of $\overline{X}$ and $S^2$ to be unbiased. The
trick in both: $ES^2 = DX$ for **any** population (Lesson 6.1), so use the population's
mean and variance.

::: example Fill-in questions 3 and 4
(3) $X_1, \ldots, X_m$ is a sample from the binomial population $B(n, p)$. If
$\overline{X} + kS^2$ is an unbiased estimator of $np^2$, find $k$. (4) $X \sim P(\lambda)$. If
$T = a\overline{X} + bS^2$ is unbiased for $\lambda$, how are $a$ and $b$ related?
== (3) Expectations ==
$E\overline{X} = EX = np$ and $ES^2 = DX = np(1-p)$. (Here $m$ is the sample size and $n$ a
parameter of the population.)
== (3) Solve ==
$E(\overline{X} + kS^2) = np + k\,np(1-p) = np^2$. Divide by $np$: $1 + k(1-p) = p$, so
$k(1-p) = -(1-p)$ and $k = -1$. Indeed $np - np(1-p) = np^2$.
== (4) ==
For Poisson, $E\overline{X} = \lambda$ and $ES^2 = DX = \lambda$, so
$ET = (a + b)\lambda = \lambda$ for every $\lambda$ exactly when $a + b = 1$.
:::

## Efficiency

Unbiasedness alone doesn't single out an estimator: there are usually many unbiased ones.
For example, $X_1$ by itself is unbiased for $\mu$ — but using one observation and
throwing away the rest is obviously wasteful. Among unbiased estimators we prefer the one
with the smaller spread, measured by the variance.

::: define More efficient | 较有效
Let $\hat\theta_1$ and $\hat\theta_2$ both be **unbiased** estimators of $\theta$. If
$$D(\hat\theta_1) \le D(\hat\theta_2),$$
then $\hat\theta_1$ is **more efficient** than $\hat\theta_2$ (较 $\hat\theta_2$ 有效).
:::

::: callout pitfall Compare variances only between unbiased estimators
Efficiency is defined for unbiased estimators. A biased estimator can have a tiny
variance — the constant $\hat\theta = 5$ has variance 0 — and still be useless. So first
throw out the biased candidates, then compare variances.
:::

::: example Example 2: the mean versus n times the minimum
The population has density $f(x) = \frac1\theta e^{-x/\theta}$ for $x > 0$ (0 elsewhere),
$\theta > 0$ unknown: an exponential distribution with mean $\theta$ and variance $\theta^2$.
Let $Z = \min(X_1, \ldots, X_n)$. (1) Show $\overline{X}$ and $nZ$ are both unbiased for
$\theta$. (2) Show $\overline{X}$ is more efficient than $nZ$ when $n > 1$.
== (1) The mean ==
$E\overline{X} = EX = \theta$, so $\overline{X}$ is unbiased.
== (1) Distribution of the minimum ==
As in Lesson 3.8, $Z > z$ exactly when every $X_i > z$:
$$F_{\min}(z) = 1 - P\{X_1 > z, \ldots, X_n > z\} = 1 - [1 - F(z)]^n.$$
With $F(x) = 1 - e^{-x/\theta}$ for $x > 0$: $F_{\min}(z) = 1 - e^{-nz/\theta}$ for $z > 0$
(0 otherwise), and differentiating,
$$f_{\min}(z) = \frac n\theta e^{-nz/\theta}, \quad z > 0.$$
So $Z$ is exponential again, with mean $\theta/n$.
== (1) nZ ==
$EZ = \int_0^{+\infty} z\,\frac n\theta e^{-nz/\theta}\,\d z = \frac\theta n$, so
$E(nZ) = n\cdot\frac\theta n = \theta$: $nZ$ is unbiased too.
== (2) Variances ==
$D\overline{X} = \frac1{n^2}\sum DX_i = \frac1n DX = \frac{\theta^2}{n}$. For $Z$:
$EZ^2 = \int_0^{+\infty} z^2\,\frac n\theta e^{-nz/\theta}\,\d z = \frac{2\theta^2}{n^2}$, so
$$DZ = EZ^2 - (EZ)^2 = \frac{2\theta^2}{n^2} - \frac{\theta^2}{n^2} = \frac{\theta^2}{n^2}, \qquad D(nZ) = n^2 DZ = \theta^2.$$
== (2) Compare ==
For $n > 1$, $D\overline{X} = \frac{\theta^2}{n} < \theta^2 = D(nZ)$: $\overline{X}$ is more
efficient. However large the sample, $nZ$ is as scattered as a single observation.
:::

The two estimators' distributions: $\overline{X}$ has a gamma density that narrows around
$\theta$ as $n$ grows, while $nZ$ stays the exponential density $\frac1\theta e^{-x/\theta}$
whatever $n$ is.

::: plot Example 2: distribution of X̄ (narrowing) and of nZ (fixed)
x: 0 .. 6
y: 0 .. 2
xlabel: value of the estimate
f(x) = (n / θ)^n x^(n - 1) e^(-n x / θ) / gamma(n)
g(x) = e^(-x / θ) / θ
slider n: 1 .. 30 = 5 | | step 1
slider θ: 0.5 .. 3 = 1.5
:::

::: example Choice question 5: the most efficient
$X_1, X_2, X_3$ is a sample from $X$. Which of the following is the most efficient
estimator of $E(X)$: A $\frac12(X_1+X_2)$, B $\frac13(X_1+X_2+X_3)$,
C $\frac14(X_1+X_2+X_3)$, D $\frac23X_1+\frac23X_2-\frac13X_3$?
== Unbiased? ==
An estimator $\sum c_iX_i$ has expectation $(\sum c_i)EX$, so it is unbiased when the
coefficients add to 1. A: $1$; B: $1$; C: $\frac34$ (biased, out); D:
$\frac23 + \frac23 - \frac13 = 1$.
== Variances ==
$D(\sum c_iX_i) = (\sum c_i^2)\sigma^2$ for independent $X_i$ (Lesson 4.3).
A: $\frac14 + \frac14 = \frac12$; B: $3\cdot\frac19 = \frac13$; D: $\frac49+\frac49+\frac19 = 1$.
== Answer ==
B, with the smallest variance $\frac{\sigma^2}{3}$. (Equal weights are always best.)
:::

## Consistency

Unbiasedness and efficiency are about a fixed sample size. Consistency asks what happens
as we collect more and more data: a sensible estimator should end up arbitrarily close to
the true value.

::: define Consistent estimator | 相合估计量
An estimator $\hat\theta = \hat\theta(X_1, \ldots, X_n)$ of $\theta$ is **consistent**
(also called a {{term consistent estimator | 一致估计}}) if it converges in probability to
$\theta$ (Lesson 5.1):
$$\hat\theta \xrightarrow{P} \theta, \quad\text{i.e.}\quad \lim_{n\to\infty} P\{|\hat\theta - \theta| \ge \varepsilon\} = 0 \ \text{for every } \varepsilon > 0.$$
:::

There are two standard ways to prove it:

- **Chebyshev's inequality** (Lesson 5.1): if $\hat\theta$ is unbiased,
  $P\{|\hat\theta - \theta| \ge \varepsilon\} \le \dfrac{D\hat\theta}{\varepsilon^2}$, so it is
  enough that $D\hat\theta \to 0$.
- **The law of large numbers** (Khinchin, Lesson 5.1): sample moments converge in
  probability to population moments, $\frac1n\sum X_i^k \xrightarrow{P} EX^k$, and continuous
  functions of convergent sequences converge to the function of the limits.

::: example Example 3: an unbiased, consistent moment estimator
The population has density $f(x) = \frac{6x}{\theta^3}(\theta - x)$ for $0 < x < \theta$
(0 elsewhere). (1) Find the moment estimator $\hat\theta$. (2) Find $D\hat\theta$.
(3) Is $\hat\theta$ unbiased? Consistent?
== (1) ==
$$\mu_1 = EX = \int_0^\theta x\cdot\frac{6x}{\theta^3}(\theta - x)\,\d x = \frac{6}{\theta^3}\Big(\frac{\theta^4}{3} - \frac{\theta^4}{4}\Big) = \frac\theta2,$$
so $\theta = 2\mu_1$ and $\hat\theta = 2\overline{X}$.
== (2) Variance of X ==
$$EX^2 = \int_0^\theta x^2\cdot\frac{6x}{\theta^3}(\theta - x)\,\d x = \frac{6}{\theta^3}\Big(\frac{\theta^5}{4} - \frac{\theta^5}{5}\Big) = \frac{6\theta^2}{20}, \qquad DX = \frac{6\theta^2}{20} - \frac{\theta^2}{4} = \frac{\theta^2}{20}.$$
== (2) Variance of the estimator ==
$$D\hat\theta = D(2\overline{X}) = 4D\overline{X} = \frac4n DX = \frac4n\cdot\frac{\theta^2}{20} = \frac{\theta^2}{5n}.$$
== (3) Unbiased ==
$E\hat\theta = 2E\overline{X} = 2EX = \theta$: unbiased.
== (3) Consistent ==
By Chebyshev,
$P\{|\hat\theta - \theta| \ge \varepsilon\} \le \dfrac{D\hat\theta}{\varepsilon^2} = \dfrac{\theta^2}{5n\varepsilon^2} \to 0$
as $n \to \infty$, so $\hat\theta \xrightarrow{P} \theta$: consistent.
:::

The Chebyshev bound in Example 3, for a chosen accuracy $\varepsilon$:

::: explore Chebyshev bound for Example 3
slider θ: 0.5 .. 10 = 2
slider ε: 0.05 .. 1 = 0.2
slider n: 1 .. 1000 = 100 | | step 1
var = θ^2 / (5 n) | | D of the estimator
bound = min(1, θ^2 / (5 n ε^2)) | | Bound on P{|error| ≥ ε}
:::

::: example Example 4: S*² and S² are consistent
$EX = \mu$, $DX = \sigma^2$. Prove that $S^{*2}$ and $S^2$ are consistent estimators of
$\sigma^2$.
== Rewrite S*² ==
$$S^{*2} = \frac1n\sum_{i=1}^n(X_i - \overline{X})^2 = \frac1n\Big(\sum_{i=1}^n X_i^2 - n\overline{X}^2\Big) = \frac1n\sum_{i=1}^n X_i^2 - \overline{X}^2.$$
== Law of large numbers ==
The $X_i$ are independent and identically distributed, so the $X_i^2$ are too, with mean
$EX^2$. By Khinchin's law, $\frac1n\sum X_i^2 \xrightarrow{P} EX^2$ and
$\overline{X} \xrightarrow{P} \mu$, hence $\overline{X}^2 \xrightarrow{P} \mu^2$.
== S*² ==
$$S^{*2} \xrightarrow{P} EX^2 - \mu^2 = \sigma^2.$$
== S² ==
$S^2 = \frac{n}{n-1}S^{*2}$ and $\frac{n}{n-1} \to 1$, so $S^2 \xrightarrow{P} \sigma^2$ too.
:::

So $S^{*2}$ is biased but consistent: its bias $-\sigma^2/n$ vanishes as $n$ grows.
Consistency is the minimum requirement for an estimator; unbiasedness and efficiency are
refinements.

::: callout summary Four facts for any population
With finite variance, for **any** population:
- $\overline{X}$ is an unbiased and consistent estimator of $\mu$;
- $S^{*2}$ is a consistent (but biased) estimator of $\sigma^2$;
- $S^2$ is an unbiased and consistent estimator of $\sigma^2$;
- the sample standard deviation $S$ is a consistent estimator of $\sigma$ (but **not** an
  unbiased one: in general $ES < \sigma$).
:::

::: formula The three criteria | 估计量的评价标准
$$\text{unbiased: } E\hat\theta = \theta; \qquad \text{more efficient: } D\hat\theta_1 \le D\hat\theta_2 \ (\text{both unbiased}); \qquad \text{consistent: } \hat\theta \xrightarrow{P} \theta$$
--
\hat\theta | an estimator of θ (a statistic, so a random variable) |
D\hat\theta | its variance, the spread over samples |
\xrightarrow{P} | convergence in probability as n → ∞ |
:::

## Worked problems

These combine everything: finding estimators (Lessons 7.1 and 7.2), then judging them.

::: example Example 5: an unbiased estimator of μ²
$X_1, \ldots, X_n$ is a sample from $N(\mu, \sigma^2)$ and $T = \overline{X}^2 - \frac1nS^2$.
(1) Show $T$ is unbiased for $\mu^2$. (2) Find $DT$ when $\mu = 0$, $\sigma = 1$.
== (1) ==
Use $EY^2 = DY + (EY)^2$ with $Y = \overline{X}$:
$$\begin{aligned}ET &= E\overline{X}^2 - \frac1nES^2 = D\overline{X} + (E\overline{X})^2 - \frac1nES^2\\ &= \frac1nDX + (EX)^2 - \frac1nDX = \mu^2.\end{aligned}$$
($\overline{X}^2$ alone overestimates $\mu^2$ by $\sigma^2/n$; subtracting $\frac1nS^2$
removes that on average.)
== (2) Split the variance ==
For a normal sample $\overline{X}$ and $S^2$ are independent (Lesson 6.3), so
$DT = D(\overline{X}^2) + \frac1{n^2}D(S^2)$.
== (2) The first part ==
$\overline{X} \sim N(0, \frac1n)$, so $\sqrt n\,\overline{X} \sim N(0,1)$ and
$n\overline{X}^2 \sim \chi^2(1)$, whose variance is $2$ (Lesson 6.2). So
$n^2D(\overline{X}^2) = 2$ and $D(\overline{X}^2) = \frac{2}{n^2}$.
== (2) The second part ==
$\frac{(n-1)S^2}{\sigma^2} = (n-1)S^2 \sim \chi^2(n-1)$, so $(n-1)^2D(S^2) = 2(n-1)$ and
$D(S^2) = \frac{2}{n-1}$.
== (2) Total ==
$$DT = \frac{2}{n^2} + \frac{1}{n^2}\cdot\frac{2}{n-1} = \frac{2}{n^2}\Big(1 + \frac{1}{n-1}\Big) = \frac{2}{n(n-1)}.$$
:::

### The uniform distribution U[0, θ]

The in-class subjective question: find the moment estimator and the MLE of $\theta$ for
$U[0, \theta]$, and decide whether they are unbiased.

::: example Example 6: U[0, θ], moments against maximum likelihood
$X \sim U[0, \theta]$. Find the moment estimator and the MLE of $\theta$ and check each for
unbiasedness.
== Moment estimator ==
$EX = \frac\theta2$, so $\hat\theta_1 = 2\overline{X}$, and $E\hat\theta_1 = 2\cdot\frac\theta2 = \theta$:
unbiased.
== MLE ==
$L(\theta) = \theta^{-n}$ for $\theta \ge x_{(n)}$ (0 otherwise) decreases in $\theta$, so
$\hat\theta_2 = X_{(n)} = \max\{X_1, \ldots, X_n\}$ (Lesson 7.2).
== Distribution of the maximum ==
$X_{(n)} \le x$ exactly when every $X_i \le x$, so for $0 \le x \le \theta$
$$F_{(n)}(x) = [F(x)]^n = \Big(\frac x\theta\Big)^n, \qquad f_{(n)}(x) = \frac{n x^{n-1}}{\theta^n}.$$
== Expectation ==
$$EX_{(n)} = \int_0^\theta x\cdot\frac{nx^{n-1}}{\theta^n}\,\d x = \frac{n}{\theta^n}\cdot\frac{\theta^{n+1}}{n+1} = \frac{n}{n+1}\theta \ne \theta.$$
So the MLE is **biased**: the largest observation always falls short of $\theta$.
== Correct it ==
$\frac{n+1}{n}X_{(n)}$ is unbiased: $E\big(\frac{n+1}{n}X_{(n)}\big) = \theta$.
:::

::: callout note The slide's hint "EX₍ₙ₎ = θ?" is false
The slide writes, in red, $\hat\theta = X_{(n)}$ and "$EX_{(n)} = \theta$ ?" as a hint. The
question mark matters: the equation does **not** hold. $EX_{(n)} = \frac{n}{n+1}\theta$, so
the MLE $X_{(n)}$ is a biased estimator of $\theta$ — which is exactly what the next
choice question (option B) tests.
:::

The density of $X_{(n)}$ piles up just below $\theta$ but never past it; the thin bar marks
its mean $\frac{n}{n+1}\theta$.

::: plot Density of X₍ₙ₎ for U[0, θ], and its mean
x: 0 .. 12
y: 0 .. 2.5
xlabel: x
region Density: 0 < x < θ, 0 < y < n x^(n - 1) / θ^n
region Mean: abs(x - n θ / (n + 1)) < 0.03, 0 < y < 2.5
slider θ: 2 .. 10 = 8
slider n: 1 .. 20 = 5 | | step 1
:::

::: callout tip Which is better, 2X̄ or (n+1)/n · X₍ₙ₎?
Both are unbiased, so compare variances (not on the slides, but a good check of
efficiency). $D(2\overline{X}) = 4\cdot\frac{\theta^2}{12n} = \frac{\theta^2}{3n}$, while
$D\big(\frac{n+1}{n}X_{(n)}\big) = \frac{\theta^2}{n(n+2)}$. For $n > 1$ the corrected maximum
is more efficient — far more for large $n$.
:::

::: example Choice question 6: U[0, θ]
$X \sim U[0, \theta]$. Which statement is **false**? A $X_{(n)}$ is the MLE of $\theta$;
B $X_{(n)}$ is an unbiased estimator of $\theta$; C $2\overline{X}$ is the moment estimator of
$\theta$; D $2\overline{X}$ is an unbiased estimator of $\theta$.
== Answer ==
B is false: $EX_{(n)} = \frac{n}{n+1}\theta$. A, C and D are true by Example 6.
:::

### Past final exams

::: example 2025 autumn final (paper A): the Laplace density
The population has density $f(x;\theta) = \frac{1}{2\theta}e^{-|x|/\theta}$,
$-\infty < x < +\infty$, $\theta > 0$ unknown. (1) Find the MLE $\hat\theta_1$ and decide
whether it is unbiased. (2) Find the moment estimator $\hat\theta_2$.
== (1) Likelihood ==
$$L(\theta) = \prod_{i=1}^n \frac{1}{2\theta}e^{-|x_i|/\theta} = \frac{1}{(2\theta)^n}e^{-\frac1\theta\sum_{i=1}^n|x_i|}, \qquad \ln L(\theta) = -n\ln(2\theta) - \frac1\theta\sum_{i=1}^n|x_i|.$$
== (1) Solve ==
$$\frac{\d\ln L}{\d\theta} = -\frac n\theta + \frac{1}{\theta^2}\sum_{i=1}^n|x_i| = 0 \ \Rightarrow\ \hat\theta_1 = \frac1n\sum_{i=1}^n|X_i|.$$
== (1) E|X| ==
The density is even, so integrate over $x > 0$ and double:
$$E|X| = 2\int_0^{+\infty} x\cdot\frac{1}{2\theta}e^{-x/\theta}\,\d x = \frac1\theta\int_0^{+\infty}xe^{-x/\theta}\,\d x.$$
With $t = x/\theta$: $E|X| = \theta\int_0^{+\infty}te^{-t}\,\d t = \theta\cdot1 = \theta$.
== (1) Unbiased ==
$E\hat\theta_1 = \frac1n\sum E|X_i| = \frac1n\cdot n\theta = \theta$: unbiased.
== (2) First moment fails ==
$EX = \int_{-\infty}^{+\infty}x\cdot\frac{1}{2\theta}e^{-|x|/\theta}\,\d x = 0$ (odd
integrand): it doesn't contain $\theta$, so use the second moment.
== (2) Second moment ==
$$\mu_2 = EX^2 = 2\int_0^{+\infty}x^2\frac{1}{2\theta}e^{-x/\theta}\,\d x = \theta^2\int_0^{+\infty}t^2e^{-t}\,\d t = 2\theta^2,$$
so $\theta = \sqrt{\mu_2/2}$. Replace $\mu_2$ by $\frac1n\sum X_i^2$:
$$\hat\theta_2 = \sqrt{\frac{1}{2n}\sum_{i=1}^n X_i^2}.$$
:::

::: example 2024 autumn final (paper A): the density 2x/θ²
The population has density $f(x;\theta) = \frac{2x}{\theta^2}$ for $0 \le x \le \theta$
(0 elsewhere), $\theta > 0$. (1) Find the moment estimator $\hat\theta_1$. (2) Find the MLE
$\hat\theta_2$. (3) Are they unbiased? Verify by computation.
== (1) ==
$EX = \int_0^\theta x\cdot\frac{2x}{\theta^2}\,\d x = \frac{2\theta}{3}$, so
$\theta = \frac32EX$ and $\hat\theta_1 = \frac32\overline{X}$.
== (2) Likelihood ==
$$L(\theta) = \begin{cases}\dfrac{2^n\,x_1x_2\cdots x_n}{\theta^{2n}}, & \theta \ge x_{(n)} \ (\text{and all } x_i \ge 0),\\[2mm] 0, & \text{otherwise.}\end{cases}$$
The derivative of $\ln L = \text{const} - 2n\ln\theta$ is $-\frac{2n}{\theta} < 0$, never
zero: $L$ decreases, so take the smallest allowed $\theta$: $\hat\theta_2 = X_{(n)}$.
== (3) Moment estimator ==
$E\hat\theta_1 = \frac32\cdot\frac{2\theta}{3} = \theta$: unbiased.
== (3) MLE ==
$F(x) = \frac{x^2}{\theta^2}$ on $[0, \theta]$, so $F_{(n)}(x) = \frac{x^{2n}}{\theta^{2n}}$,
$f_{(n)}(x) = \frac{2nx^{2n-1}}{\theta^{2n}}$ and
$$EX_{(n)} = \int_0^\theta x\cdot\frac{2nx^{2n-1}}{\theta^{2n}}\,\d x = \frac{2n}{2n+1}\theta \ne \theta.$$
Biased; $\frac{2n+1}{2n}X_{(n)}$ would be unbiased.
:::

::: formula Expectation of the largest observation | 最大顺序统计量的期望
$$U[0,\theta]: \ EX_{(n)} = \frac{n}{n+1}\theta; \qquad f(x) = \frac{2x}{\theta^2} \text{ on } [0,\theta]: \ EX_{(n)} = \frac{2n}{2n+1}\theta$$
--
X_{(n)} | the largest sample value, density n[F(x)]^{n-1}f(x) |
\frac{n+1}{n}X_{(n)} | the unbiased correction for U[0, θ] |
:::

::: callout exam What exams ask
Both recent finals asked: moment estimator, MLE, then "is it unbiased? verify". For an
estimator built from $\overline{X}$ or $\frac1n\sum g(X_i)$, compute $Eg(X)$ by integration.
For $X_{(n)}$ or $X_{(1)}$, first find its distribution function ($[F(x)]^n$ or
$1 - [1-F(x)]^n$), differentiate, then integrate. Choice and fill-in questions test
$ES^2 = DX$, $ES^{*2} = \frac{n-1}{n}\sigma^2$ and "coefficients add to 1".
:::

::: callout key The one idea
An estimator is a random variable: judge it by its distribution over samples. Centre
($E\hat\theta = \theta$), spread (smaller $D\hat\theta$ among unbiased ones) and behaviour
as $n \to \infty$ ($\hat\theta \xrightarrow{P} \theta$).
:::

::: cards What makes a good estimator
Why judge an estimator over many samples? :: It is a function of the sample, so a random variable; one sample's estimate says nothing about the formula's quality.
Unbiased estimator :: $E(\hat\theta) = \theta$ for every value of $\theta$.
More efficient estimator :: Of two unbiased estimators, the one with the smaller variance $D\hat\theta$.
Consistent estimator :: $\hat\theta \xrightarrow{P} \theta$: $P\{|\hat\theta - \theta| \ge \varepsilon\} \to 0$ as $n \to \infty$.
Is $S^{*2}$ unbiased for $\sigma^2$? :: No: $ES^{*2} = \frac{n-1}{n}\sigma^2$. Corrected, $\frac{n}{n-1}S^{*2} = S^2$ is unbiased.
Unbiased estimator of $\sigma^2$ when $\mu$ is known :: $\frac1n\sum(X_i - \mu)^2$ (divisor $n$).
When is $\sum c_iX_i$ unbiased for $EX$? :: When $\sum c_i = 1$; its variance is $(\sum c_i^2)\sigma^2$, smallest with equal weights.
Exponential (mean θ): $\overline{X}$ against $n\min X_i$ :: Both unbiased; $D\overline{X} = \theta^2/n$, $D(nZ) = \theta^2$, so $\overline{X}$ is more efficient for $n > 1$.
Proving consistency with Chebyshev :: For unbiased $\hat\theta$, $P\{|\hat\theta - \theta| \ge \varepsilon\} \le D\hat\theta/\varepsilon^2$; enough that $D\hat\theta \to 0$.
Consistency facts for any population :: $\overline{X}$ for $\mu$; $S^{*2}$ and $S^2$ for $\sigma^2$; $S$ for $\sigma$.
Expectation of the maximum for $U[0, \theta]$ :: $EX_{(n)} = \frac{n}{n+1}\theta$: the MLE $X_{(n)}$ is biased; $\frac{n+1}{n}X_{(n)}$ is unbiased.
Moment estimator of θ for $U[0, \theta]$, unbiased? :: $2\overline{X}$, yes: $E(2\overline{X}) = \theta$.
Laplace density $\frac1{2\theta}e^{-\lvert x\rvert/\theta}$: the estimators :: MLE $\frac1n\sum\lvert X_i\rvert$ (unbiased, $E\lvert X\rvert = \theta$); moment $\sqrt{\frac1{2n}\sum X_i^2}$.
Density $\frac{2x}{\theta^2}$ on $[0, \theta]$: the estimators :: Moment $\frac32\overline{X}$ (unbiased); MLE $X_{(n)}$, biased, $EX_{(n)} = \frac{2n}{2n+1}\theta$.
:::

::: quiz What makes a good estimator
? (In-class) $X \sim N(\mu, \sigma^2)$. Then $\frac1n\sum_{i=1}^n(X_i - \overline{X})^2$ is
- [ ] an unbiased estimator of $\mu$
- [ ] an unbiased estimator of $\sigma^2$
- [ ] the moment estimator of $\mu$
- [x] the moment estimator of $\sigma^2$
> It is $S^{*2}$, the sample second central moment, which the method of moments uses for
> $\sigma^2$. Its expectation is $\frac{n-1}{n}\sigma^2$, so it is not unbiased.

? (In-class) $\mu = EX$. Which is an unbiased estimator of the population variance $\sigma^2$?
- [ ] $\frac1{n-1}\sum(X_i - \mu)^2$, $\mu$ unknown
- [ ] $\frac1n\sum(X_i - \mu)^2$, $\mu$ unknown
- [ ] $\frac1{n-1}\sum(X_i - \mu)^2$, $\mu$ known
- [x] $\frac1n\sum(X_i - \mu)^2$, $\mu$ known
> With $\mu$ unknown these aren't statistics. With $\mu$ known each $(X_i-\mu)^2$ has
> expectation $\sigma^2$, so the average of $n$ of them (divisor $n$) is unbiased.

? (In-class fill-in) A sample from $B(n, p)$ has mean $\overline{X}$ and variance $S^2$. If $\overline{X} + kS^2$ is unbiased for $np^2$, find $k$.
answer: -1
> $np + k\,np(1-p) = np^2$ gives $1 + k(1-p) = p$, so $k = -1$.

? (In-class fill-in) $X \sim P(\lambda)$ and $T = a\overline{X} + bS^2$ is unbiased for $\lambda$. Write $b$ in terms of $a$.
expression: 1 - a
variables: a
> $E\overline{X} = ES^2 = \lambda$ for Poisson, so $ET = (a+b)\lambda$; unbiased exactly when
> $a + b = 1$, i.e. $b = 1 - a$.

? (In-class) $X_1, X_2, X_3$ is a sample from $X$. The most efficient unbiased estimator of $E(X)$ among these is
- [ ] $\frac12(X_1+X_2)$
- [x] $\frac13(X_1+X_2+X_3)$
- [ ] $\frac14(X_1+X_2+X_3)$
- [ ] $\frac23X_1+\frac23X_2-\frac13X_3$
> C is biased (coefficients sum to $\frac34$). Variances of the rest: A $\frac12\sigma^2$,
> B $\frac13\sigma^2$, D $\frac{4+4+1}{9}\sigma^2 = \sigma^2$. B is smallest.

? (In-class) $X \sim U[0, \theta]$. Which statement is **false**?
- [ ] $X_{(n)}$ is the maximum likelihood estimator of $\theta$
- [x] $X_{(n)}$ is an unbiased estimator of $\theta$
- [ ] $2\overline{X}$ is the moment estimator of $\theta$
- [ ] $2\overline{X}$ is an unbiased estimator of $\theta$
> $EX_{(n)} = \frac{n}{n+1}\theta < \theta$, so B is false; the others are true.

? For $U[0, 10]$ and samples of size $n = 4$, what is the expected value of the largest observation $X_{(4)}$?
answer: 8
> $EX_{(n)} = \frac{n}{n+1}\theta = \frac45\cdot10 = 8$: on average the MLE falls 2 short.

? Exponential population with mean $\theta$, $n = 10$. What is $D(nZ)$, $Z = \min X_i$, when $\theta = 3$?
answer: 9
> $Z$ is exponential with mean $\theta/n$, so $DZ = \theta^2/n^2$ and $D(nZ) = \theta^2 = 9$,
> whatever $n$ is. Compare $D\overline{X} = 9/10$.

? In Example 3 ($\hat\theta = 2\overline{X}$ for the density $\frac{6x}{\theta^3}(\theta-x)$), find $D\hat\theta$ when $\theta = 2$ and $n = 10$.
answer: 0.08
> $D\hat\theta = \frac{\theta^2}{5n} = \frac{4}{50} = 0.08$.

? $X_1, \ldots, X_5$ from $N(0, 1)$ and $T = \overline{X}^2 - \frac15S^2$. Find $DT$.
answer: 1/10
> $DT = \frac{2}{n(n-1)} = \frac{2}{5\cdot4} = \frac1{10}$.

? Laplace density $\frac1{2\theta}e^{-|x|/\theta}$; sample $-1.5, 0.4, 2.0, -0.9, 0.2$. Find the maximum likelihood estimate of $\theta$.
answer: 1
> $\hat\theta_1 = \frac1n\sum|x_i| = \frac{1.5+0.4+2.0+0.9+0.2}{5} = 1$. (The moment
> estimate $\sqrt{7.26/10} \approx 0.852$ differs.)

? Density $\frac{2x}{\theta^2}$ on $[0, \theta]$. Which multiple of $X_{(n)}$ is unbiased for $\theta$?
- [ ] $\frac{n+1}{n}X_{(n)}$
- [x] $\frac{2n+1}{2n}X_{(n)}$
- [ ] $\frac32X_{(n)}$
- [ ] $X_{(n)}$ itself
> $EX_{(n)} = \frac{2n}{2n+1}\theta$, so multiply by $\frac{2n+1}{2n}$. ($\frac{n+1}{n}$ is the
> correction for $U[0, \theta]$.)
:::

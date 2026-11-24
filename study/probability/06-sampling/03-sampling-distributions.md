---
title: Sampling distributions of normal populations
zh: 正态总体的抽样分布
summary: What X̄ and S² do when the population is normal — the key theorem and its two corollaries, the pooled-variance t and the F statistic for two populations, and the standard exam questions on expectations, distributions and probabilities of statistics.
source: 18统计量及抽样分布10-2 (§6.4), 2026-11-04; review examples in 19点估计11-1, 2026-11-09
---

A statistic such as the sample mean $\bar X$ is a random variable: take another sample
and you get another value. Its distribution is called a
{{term sampling distribution | 抽样分布}}, and everything statistics does later —
estimating a parameter, giving a confidence interval, testing a hypothesis — rests on
knowing it. For a general population we only know a few numbers about $\bar X$ and $S^2$
(their means and variances). But when the population is **normal**, we know their
distributions exactly, and they turn out to be the $\chi^2$, $t$ and $F$ distributions of
the previous lesson. This lesson proves that theorem, draws out its two corollaries,
extends it to two normal populations, and then works through the three kinds of exam
question built on it: expectations and variances of statistics, distributions of
statistics, and probabilities of statistics.

What you need from earlier: the sample mean $\bar X=\frac1n\sum X_i$, the sample variance
$S^2=\frac1{n-1}\sum(X_i-\bar X)^2$, the sample second central moment
$S^{*2}=\frac1n\sum(X_i-\bar X)^2=\frac{n-1}{n}S^2$, and the facts $E\bar X=\mu$,
$D\bar X=\sigma^2/n$, $ES^2=\sigma^2$, $ES^{*2}=\frac{n-1}n\sigma^2$ (all Lesson 6.1); and
the definitions of $\chi^2(n)$, $t(n)$ and $F(n_1,n_2)$ with $E\chi^2=n$,
$D\chi^2=2n$ and the additivity of $\chi^2$ (Lesson 6.2). Throughout, $X_1,\dots,X_n$ is a
simple random sample: independent copies of the population $X$.

## One normal population: the key theorem

Imagine drawing samples of size $n$ from $N(\mu,\sigma^2)$ again and again, and each time
writing down $\bar X$ and $S^2$. Three things happen, and the theorem says exactly what:

- The values of $\bar X$ cluster around $\mu$, more tightly the larger $n$ is, and their
  histogram is again a bell curve.
- The values of $S^2$ scatter around $\sigma^2$; after scaling by $(n-1)/\sigma^2$ their
  histogram is a $\chi^2$ curve — with $n-1$ degrees of freedom, not $n$, because
  measuring deviations from $\bar X$ instead of $\mu$ "uses up" one.
- Surprisingly, knowing $\bar X$ tells you nothing about $S^2$: the two are independent.
  (This is special to normal populations.)

::: theorem Sampling distributions of one normal population | 单个正态总体的抽样分布定理
Let $X_1,\dots,X_n$ be a simple random sample from $X\sim N(\mu,\sigma^2)$, with sample mean
$\bar X$, sample variance $S^2$ and sample second central moment $S^{*2}$. Then

1. $\bar X\sim N\!\left(\mu,\dfrac{\sigma^2}{n}\right)$;
2. $\bar X$ and $S^2$ are independent;
3. $\dfrac{(n-1)S^2}{\sigma^2}=\dfrac1{\sigma^2}\displaystyle\sum_{i=1}^n(X_i-\bar X)^2=\dfrac{nS^{*2}}{\sigma^2}\sim\chi^2(n-1)$;
4. $\dfrac1{\sigma^2}\displaystyle\sum_{i=1}^n(X_i-\mu)^2\sim\chi^2(n)$.
:::

The lecture calls this the important theorem (重要定理) of the chapter. The three
expressions in (3) are the same random variable written three ways, since
$(n-1)S^2=nS^{*2}=\sum(X_i-\bar X)^2$; use whichever matches the problem.

::: example Proof of (1): the sample mean is normal
Show that $\bar X\sim N(\mu,\sigma^2/n)$.
== A linear combination of independent normals ==
$\bar X=\frac1nX_1+\cdots+\frac1nX_n$ is a linear combination of the independent normal
variables $X_1,\dots,X_n$. A linear combination of independent normal variables is normal
(Lesson 3.7), so $\bar X\sim N(E\bar X,D\bar X)$.
== Its two parameters ==
From Lesson 6.1, $E\bar X=EX=\mu$ and $D\bar X=DX/n=\sigma^2/n$. Hence
$$\bar X\sim N\!\left(\mu,\frac{\sigma^2}{n}\right).$$
:::

::: example Proof of (4): deviations from the true mean
Show that $\frac1{\sigma^2}\sum_{i=1}^n(X_i-\mu)^2\sim\chi^2(n)$.
== Standardise each observation ==
$X_i\sim N(\mu,\sigma^2)$, so $\dfrac{X_i-\mu}{\sigma}\sim N(0,1)$, and these $n$ variables
are independent.
== Square and add ==
By the definition of $\chi^2$ (Lesson 6.2), the sum of squares of $n$ independent standard
normals is $\chi^2(n)$:
$$\sum_{i=1}^n\left(\frac{X_i-\mu}{\sigma}\right)^2=\frac1{\sigma^2}\sum_{i=1}^n(X_i-\mu)^2\sim\chi^2(n).$$
:::

Parts (2) and (3) are stated without proof in the course (the proof needs an orthogonal
change of variables). Remember them as facts.

::: callout pitfall μ known or μ replaced by X̄: n or n − 1?
$\sum(X_i-\mu)^2/\sigma^2$ has $n$ degrees of freedom; $\sum(X_i-\bar X)^2/\sigma^2$ has
$n-1$. Look at what is subtracted inside the square: the true mean $\mu$ gives
$\chi^2(n)$, the sample mean $\bar X$ gives $\chi^2(n-1)$. Every multiple-choice question
on this theorem tests exactly that.
:::

Move the slider to see part (1): the population $N(0,1)$ in one curve, and the
distribution of $\bar X$, $N(0,1/n)$, in the other. Its spread shrinks like
$\sigma/\sqrt n$.

::: plot The population N(0, 1) and the sample mean N(0, 1/n)
x: -4 .. 4
xlabel: x
population(x) = e^(-x^2 / 2) / sqrt(2 pi)
mean(x) = sqrt(n) e^(-n x^2 / 2) / sqrt(2 pi)
slider n: 1 .. 30 = 5 | | step 1
:::

And part (3): the density of $\chi^2(n-1)$, where $(n-1)S^2/\sigma^2$ lives. Its centre is
near $n-1$ (its mean), so $S^2$ itself centres on $\sigma^2$.

::: plot The density of χ²(n − 1), the distribution of (n − 1)S²/σ²
x: 0.01 .. 40
xlabel: x
chi2(x) = x^((n - 1)/2 - 1) e^(-x / 2) / (2^((n - 1)/2) gamma((n - 1)/2))
slider n: 3 .. 25 = 10 | | step 1
:::

## Two corollaries: the standardised mean

In practice we standardise $\bar X$. If $\sigma$ is known, the result is a standard normal.
If $\sigma$ is unknown — the usual situation — we have to put the sample's own $S$ in its
place, and the price is that the result is no longer normal but $t$, with heavier tails
because $S$ itself wobbles.

::: theorem Corollaries: the standardised sample mean | 推论
Under the conditions of the theorem,

1. $\dfrac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1)$;
2. $\dfrac{\bar X-\mu}{S}\sqrt n\sim t(n-1)$, or equivalently $\dfrac{\bar X-\mu}{S^*}\sqrt{n-1}\sim t(n-1)$.
:::

::: example Proof of corollary (1)
Show $\frac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1)$.
== Standardise ==
By (1), $\bar X\sim N(\mu,\sigma^2/n)$, whose standard deviation is $\sigma/\sqrt n$.
Standardising,
$$\frac{\bar X-\mu}{\sqrt{\sigma^2/n}}=\frac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1).$$
:::

::: example Proof of corollary (2)
Show $\frac{\bar X-\mu}{S}\sqrt n\sim t(n-1)$, and the $S^*$ form.
== The two ingredients ==
The numerator $U=\frac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1)$ (corollary 1). By (3),
$V=\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$. By (2), $\bar X$ and $S^2$ are independent,
so $U$ and $V$ are independent.
== Build a t variable ==
By the definition of $t$ (Lesson 6.2), $U/\sqrt{V/(n-1)}\sim t(n-1)$. Simplify — the
unknown $\sigma$ cancels:
$$\frac{\dfrac{\bar X-\mu}{\sigma}\sqrt n}{\sqrt{\dfrac{(n-1)S^2}{\sigma^2}\Big/(n-1)}}=\frac{\dfrac{\bar X-\mu}{\sigma}\sqrt n}{S/\sigma}=\frac{\bar X-\mu}{S}\sqrt n\sim t(n-1).$$
== The S* form ==
Write $V=\frac{nS^{*2}}{\sigma^2}$ instead:
$$\frac{\dfrac{\bar X-\mu}{\sigma}\sqrt n}{\sqrt{\dfrac{nS^{*2}}{\sigma^2}\Big/(n-1)}}=\frac{(\bar X-\mu)\sqrt n}{S^*\sqrt n/\sqrt{n-1}}=\frac{\bar X-\mu}{S^*}\sqrt{n-1}\sim t(n-1).$$
:::

::: formula The t statistic of one normal sample | 单个正态总体的 t 统计量
$$T=\frac{\bar X-\mu}{S}\sqrt n=\frac{\bar X-\mu}{S^*}\sqrt{n-1}\sim t(n-1)$$
--
\bar X | sample mean |
S | sample standard deviation (divisor n − 1) |
S^* | square root of the sample second central moment (divisor n) |
n | sample size; the degrees of freedom are n − 1 |
:::

::: callout key Pair √n with S, √(n − 1) with S*
$S$ divides by $n-1$, $S^*$ by $n$; the factor in front swaps to compensate. Mixing them
up — $\sqrt{n-1}$ with $S$, or $\sqrt n$ with $S^*$ — gives something that is **not** $t$.
:::

The $t(n-1)$ curve looks like $N(0,1)$ but with heavier tails; as $n$ grows it approaches
the normal curve (for $n\ge 30$ or so they are almost indistinguishable).

::: plot t(n − 1) against N(0, 1)
x: -5 .. 5
xlabel: x
normal(x) = e^(-x^2 / 2) / sqrt(2 pi)
t(x) = gamma(n / 2) / (sqrt((n - 1) pi) gamma((n - 1) / 2)) (1 + x^2 / (n - 1))^(-n / 2)
slider n: 2 .. 40 = 4 | | step 1
:::

::: example Example 3: which statistic is t(n − 1)?
$X_1,\dots,X_n$ is a sample from $N(\mu,\sigma^2)$ with sample mean $\bar X$. Let
$$\begin{gathered}S_1^2=\frac1{n-1}\sum_{i=1}^n(X_i-\bar X)^2,\qquad S_2^2=\frac1n\sum_{i=1}^n(X_i-\bar X)^2,\\ S_3^2=\frac1{n-1}\sum_{i=1}^n(X_i-\mu)^2,\qquad S_4^2=\frac1n\sum_{i=1}^n(X_i-\mu)^2.\end{gathered}$$
Which of these has the $t(n-1)$ distribution?
(A) $\frac{\bar X-\mu}{S_1}\sqrt{n-1}$; (B) $\frac{\bar X-\mu}{S_2}\sqrt{n-1}$;
(C) $\frac{\bar X-\mu}{S_3}\sqrt n$; (D) $\frac{\bar X-\mu}{S_4}\sqrt n$.
== Identify each S ==
$S_1=S$ (divisor $n-1$, deviations from $\bar X$) and $S_2=S^*$ (divisor $n$). $S_3$ and
$S_4$ use $\mu$, so they are built on $\chi^2(n)$, not $\chi^2(n-1)$.
== Match the pairs ==
The corollary pairs $S$ with $\sqrt n$ and $S^*$ with $\sqrt{n-1}$. (A) pairs $S$ with
$\sqrt{n-1}$: wrong. (B) pairs $S^*=S_2$ with $\sqrt{n-1}$: exactly the corollary. (C)
and (D) have the wrong chi-square inside (and $\bar X$ is not independent of a
sum over $(X_i-\mu)^2$ either).
== Answer ==
**(B)**.
:::

## Two normal populations

Now compare two groups — two classes' scores, two machines' outputs. Take independent
samples from each and ask how the difference of the means, or the ratio of the variances,
is distributed.

The setting: $X\sim N(\mu_1,\sigma_1^2)$ and $Y\sim N(\mu_2,\sigma_2^2)$ are independent;
$X_1,\dots,X_{n_1}$ is a sample from $X$ with mean $\bar X$ and sample variance $S_1^2$, and
$Y_1,\dots,Y_{n_2}$ a sample from $Y$ with mean $\bar Y$ and sample variance $S_2^2$.

When the two populations share one variance $\sigma^2$, both $S_1^2$ and $S_2^2$ estimate
it, and it is wasteful to use only one. Combine them, giving each weight by its degrees of
freedom:

::: define Pooled sample variance | 合并样本方差
For two independent samples of sizes $n_1$ and $n_2$ with sample variances $S_1^2$ and
$S_2^2$, the **pooled sample variance** is
$$S_w^2=\frac{(n_1-1)S_1^2+(n_2-1)S_2^2}{n_1+n_2-2},$$
and $S_w=\sqrt{S_w^2}$.
:::

(The slide gives $S_w^2$ no name; "pooled" or "combined" variance is the usual one.) Note
that $(n_1-1)S_1^2+(n_2-1)S_2^2$ is simply the total of all squared deviations,
$\sum(X_i-\bar X)^2+\sum(Y_j-\bar Y)^2$.

::: theorem Sampling distributions of two normal populations | 两个正态总体的抽样分布
Under the setting above:

1. If $\sigma_1^2=\sigma_2^2=\sigma^2$, then
$$\frac{(\bar X-\bar Y)-(\mu_1-\mu_2)}{S_w\sqrt{\dfrac1{n_1}+\dfrac1{n_2}}}\sim t(n_1+n_2-2).$$
2. For any $\sigma_1^2,\sigma_2^2$,
$$\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(n_1-1,n_2-1).$$
:::

::: callout note The F result needs no condition on the variances
The slide states part (2) "if $\sigma_1^2\ne\sigma_2^2$". That phrase only contrasts it
with part (1): the $F$ result holds whatever the two variances are, equal or not, since
each $S_i^2$ is divided by its own true variance.
:::

Where they come from, in brief. For (2): $\frac{(n_1-1)S_1^2}{\sigma_1^2}\sim\chi^2(n_1-1)$
and $\frac{(n_2-1)S_2^2}{\sigma_2^2}\sim\chi^2(n_2-1)$ are independent (separate samples);
dividing each by its degrees of freedom and taking the ratio is the definition of
$F(n_1-1,n_2-1)$. For (1): $\bar X-\bar Y\sim N\big(\mu_1-\mu_2,\ \sigma^2(\frac1{n_1}+\frac1{n_2})\big)$
gives a standard normal numerator, and by additivity of $\chi^2$,
$\frac{(n_1+n_2-2)S_w^2}{\sigma^2}\sim\chi^2(n_1+n_2-2)$; the ratio is $t$ and $\sigma$ cancels.

::: formula Two-sample t statistic | 两正态总体均值差的 t 统计量
$$T=\frac{(\bar X-\bar Y)-(\mu_1-\mu_2)}{S_w\sqrt{\dfrac1{n_1}+\dfrac1{n_2}}}\sim t(n_1+n_2-2)\quad(\sigma_1^2=\sigma_2^2)$$
--
S_w^2 | pooled sample variance, ((n₁−1)S₁² + (n₂−1)S₂²)/(n₁+n₂−2) |
n_1, n_2 | the two sample sizes |
n_1+n_2-2 | degrees of freedom |
:::

::: formula Variance-ratio F statistic | 两正态总体方差比的 F 统计量
$$F=\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}=\frac{\sigma_2^2S_1^2}{\sigma_1^2S_2^2}\sim F(n_1-1,n_2-1)$$
--
S_1^2, S_2^2 | sample variances of the two samples |
n_1-1 | first degrees of freedom (the numerator's sample) |
n_2-1 | second degrees of freedom |
:::

::: example Example 1 (review): the pooled variance is unbiased
$X\sim N(\mu_1,\sigma^2)$ and $Y\sim N(\mu_2,\sigma^2)$ are independent, with samples of
sizes $n_1$ and $n_2$. Find
$$E\left[\frac{\sum_{i=1}^{n_1}(X_i-\bar X)^2+\sum_{j=1}^{n_2}(Y_j-\bar Y)^2}{n_1+n_2-2}\right].$$
== Rewrite with sample variances ==
$\sum(X_i-\bar X)^2=(n_1-1)S_1^2$ and $\sum(Y_j-\bar Y)^2=(n_2-1)S_2^2$, so the
expression is $S_w^2$.
== Take expectations ==
$ES_1^2=ES_2^2=\sigma^2$ (Lesson 6.1), so
$$E S_w^2=\frac{(n_1-1)\sigma^2+(n_2-1)\sigma^2}{n_1+n_2-2}=\sigma^2.$$
:::

## Expectations and variances of statistics

The first kind of exam question: find $E$ or $D$ of some statistic. The tools are
$E\bar X=\mu$, $D\bar X=\sigma^2/n$, $ES^2=\sigma^2$ (any population), and for normal
populations also the theorem, through $E\chi^2(k)=k$ and $D\chi^2(k)=2k$.

::: example Example 2: a sum over paired observations
$X_1,\dots,X_{2n}$ is a sample from $N(\mu,\sigma^2)$ with mean $\bar X=\frac1{2n}\sum_{i=1}^{2n}X_i$.
Find $EY$ for $Y=\sum_{i=1}^n(X_i+X_{n+i}-2\bar X)^2$.
== Pair the observations ==
Let $Z_i=X_i+X_{n+i}$ for $i=1,\dots,n$. The pairs use different observations, so
$Z_1,\dots,Z_n$ are independent, each $N(2\mu,2\sigma^2)$: a sample of size $n$.
== Their mean is 2X̄ ==
$\bar Z=\frac1n\sum_{i=1}^nZ_i=\frac1n\sum_{i=1}^{2n}X_i=2\bar X$, so
$Y=\sum_{i=1}^n(Z_i-\bar Z)^2=(n-1)S_Z^2$, where $S_Z^2$ is the $Z$-sample's variance.
== Expectation ==
$ES_Z^2=DZ=2\sigma^2$, so $EY=(n-1)\cdot2\sigma^2=2(n-1)\sigma^2$.
:::

::: example Example 3: mean absolute deviation
$X_1,\dots,X_n$ is a sample from $N(\mu,\sigma^2)$ and $Y=\frac1n\sum_{i=1}^n|X_i-\mu|$. Find
$EY$ and $DY$.
== One term ==
Write $X_i-\mu=\sigma Z$ with $Z\sim N(0,1)$. Then, since $\varphi$ is even,
$$E|Z|=2\int_0^{+\infty}z\frac1{\sqrt{2\pi}}e^{-z^2/2}\,\d z=\frac2{\sqrt{2\pi}}\Big[-e^{-z^2/2}\Big]_0^{+\infty}=\sqrt{\frac2\pi},$$
so $E|X_i-\mu|=\sigma\sqrt{2/\pi}$. Also $E|X_i-\mu|^2=E(X_i-\mu)^2=\sigma^2$, so
$$D|X_i-\mu|=\sigma^2-\frac{2\sigma^2}{\pi}=\sigma^2\left(1-\frac2\pi\right).$$
== Average n independent terms ==
$$EY=\sigma\sqrt{\frac2\pi}\approx0.798\sigma,\qquad DY=\frac1n\,\sigma^2\left(1-\frac2\pi\right)=\frac{(\pi-2)\sigma^2}{n\pi}.$$
The slide leaves this example unsolved; these are the values.
:::

::: example Example 4: the variance of S² (normal populations)
$X_1,\dots,X_n$ is a sample from $N(\mu,\sigma^2)$ with sample variance $S^2$. Find $DS^2$.
== Use the chi-square ==
$\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$, whose variance is $2(n-1)$.
== Pull out the constant ==
$D\Big[\frac{(n-1)S^2}{\sigma^2}\Big]=\frac{(n-1)^2}{\sigma^4}DS^2=2(n-1)$, so
$$DS^2=\frac{2(n-1)\sigma^4}{(n-1)^2}=\frac{2\sigma^4}{n-1}.$$
:::

::: formula Variance of the sample variance (normal population) | 正态总体样本方差的方差
$$DS^2=\frac{2\sigma^4}{n-1}$$
--
S^2 | sample variance of a sample of size n from N(μ, σ²) |
\sigma^4 | the square of the population variance |
:::

::: callout pitfall Only for normal populations
The slide warns: 只有正态总体才可以用这个方法. $ES^2=\sigma^2$ holds for every population,
but $DS^2=2\sigma^4/(n-1)$ came from the $\chi^2$ distribution, which needs a normal
population. For a Poisson or (0–1) population it is wrong.
:::

## Distributions of statistics

The second kind: show a statistic has a $\chi^2$, $t$ or $F$ distribution. The recipe is
always the same: build a standard normal and an independent chi-square from the pieces,
then match the definition of $t$ or $F$ (Lesson 6.2).

::: example Example 5: a t statistic from two groups
$X_1,\dots,X_9$ is a sample from $N(\mu,\sigma^2)$. Let
$Y_1=\frac16(X_1+\cdots+X_6)$, $Y_2=\frac13(X_7+X_8+X_9)$,
$S^2=\frac12\sum_{i=7}^9(X_i-Y_2)^2$ and $Z=\dfrac{\sqrt2\,(Y_1-Y_2)}{S}$. Find the
distribution of $Z$.
== The normal part ==
$Y_1\sim N(\mu,\sigma^2/6)$ and $Y_2\sim N(\mu,\sigma^2/3)$ use different observations, so
they are independent and $Y_1-Y_2\sim N\big(0,\frac{\sigma^2}6+\frac{\sigma^2}3\big)=N\big(0,\frac{\sigma^2}2\big)$:
$$U=\frac{Y_1-Y_2}{\sigma/\sqrt2}=\frac{\sqrt2(Y_1-Y_2)}{\sigma}\sim N(0,1).$$
== The chi-square part ==
$S^2$ is the sample variance of the three observations $X_7,X_8,X_9$, so by the theorem
$V=\frac{2S^2}{\sigma^2}\sim\chi^2(2)$, independent of $Y_2$; it is also independent of
$Y_1$ (other observations). So $U$ and $V$ are independent.
== Assemble ==
$$\frac{U}{\sqrt{V/2}}=\frac{\sqrt2(Y_1-Y_2)/\sigma}{S/\sigma}=\frac{\sqrt2(Y_1-Y_2)}{S}=Z\sim t(2).$$
:::

::: example Example 6: a t statistic from two populations
$X\sim N(0,3^2)$ and $Y\sim N(0,3^2)$, with samples $X_1,\dots,X_9$ and $Y_1,\dots,Y_9$
(independent). Show that $U=\dfrac{X_1+\cdots+X_9}{\sqrt{Y_1^2+\cdots+Y_9^2}}\sim t(9)$.
== Numerator ==
$X_1+\cdots+X_9\sim N(0,9\cdot9)=N(0,81)$, so $\frac{X_1+\cdots+X_9}9\sim N(0,1)$.
== Denominator ==
$\frac{Y_i}3\sim N(0,1)$, so $\sum_{i=1}^9\left(\frac{Y_i}3\right)^2=\frac{\sum Y_i^2}9\sim\chi^2(9)$.
== Assemble ==
$$\frac{\left(\sum X_i\right)/9}{\sqrt{\dfrac{\sum Y_i^2/9}{9}}}=\frac{\left(\sum X_i\right)/9}{\sqrt{\sum Y_i^2}/9}=\frac{\sum X_i}{\sqrt{\sum Y_i^2}}=U\sim t(9).$$
(The slide stops after the numerator; this completes it.)
:::

::: callout tip Check the independence
A $t$ or $F$ needs its two parts **independent**. They are when the parts use different
observations, or when one is built from $\bar X$ and the other from $S^2$ of the same
normal sample (part (2) of the theorem). Say so in your answer: it earns marks.
:::

## Probabilities of statistics

The third kind: find a probability about $\bar X$ or $S^2$. Turn the event into one about a
standard normal (for $\bar X$) or a $\chi^2$ (for sums of squares), then use $\Phi$ or a
$\chi^2$ table.

::: example Example 7 (textbook 6.10): chi-square probabilities
$X_1,\dots,X_{10}$ is a sample from $N(\mu,0.5^2)$.
(1) If $\mu=0$, find $P\left\{\sum_{i=1}^{10}X_i^2\ge4\right\}$.
(2) If $\mu$ is unknown, find $P\left\{\sum_{i=1}^{10}(X_i-\bar X)^2\ge2.85\right\}$.
== (1) μ known ==
$\frac1{0.25}\sum X_i^2\sim\chi^2(10)$ by part (4), so
$$P\left\{\sum X_i^2\ge4\right\}=P\left\{\chi^2(10)\ge\frac4{0.25}\right\}=P\{\chi^2(10)\ge16\}=0.1,$$
read from the table ($\chi^2_{0.1}(10)=15.987$; exactly $0.0996$).
== (2) μ unknown ==
$\frac1{0.25}\sum(X_i-\bar X)^2\sim\chi^2(9)$ by part (3), so
$$P\left\{\sum(X_i-\bar X)^2\ge2.85\right\}=P\{\chi^2(9)\ge11.4\}=0.25$$
($\chi^2_{0.25}(9)=11.389$; exactly $0.249$).
:::

::: plot Example 7 (1): the tail P{χ²(10) ≥ 16} ≈ 0.1
x: 0.01 .. 35
xlabel: x
chi2(x) = x^4 e^(-x / 2) / (2^5 * 24)
region Tail: x > 16, 0 < y < x^4 e^(-x / 2) / (2^5 * 24)
:::

::: example Example 8: one observation against the mean of nine
$X\sim N(2,1)$ and $X_1,\dots,X_9$ is a sample from it. Find the probabilities that $X$ and
that $\bar X$ fall in $(1,3)$.
== One observation ==
$\sigma=1$: $P\{1<X<3\}=\Phi(1)-\Phi(-1)=2\Phi(1)-1=0.6826$.
== The sample mean ==
$\bar X\sim N(2,\frac19)$, standard deviation $\frac13$:
$$P\{1<\bar X<3\}=\Phi\left(\frac{3-2}{1/3}\right)-\Phi\left(\frac{1-2}{1/3}\right)=2\Phi(3)-1=0.9973.$$
== What it shows ==
Averaging nine observations makes "within 1 of the true mean" nearly certain, where a
single observation manages it only two times in three. (The slide gives no solution.)
:::

::: explore How close is X̄ to μ?
slider σ: 0.1 .. 5 = 2
slider n: 1 .. 100 = 5 | | step 1
slider d: 0.05 .. 3 = 1 | | distance δ
sd = σ / sqrt(n) | | Standard deviation of X̄
P = 2 Phi(d sqrt(n) / σ) - 1 | | P{|X̄ − μ| < δ}
:::

(With $\sigma=2$, $n=5$, $\delta=1$ this is the in-class question below:
$2\Phi(\sqrt5/2)-1\approx0.736$.)

::: callout exam What exams ask
The review lecture sorted the exam questions on this chapter into three kinds, and they
are the three sections above: (1) expectations and variances of statistics (Examples 1–4,
including $DS^2=2\sigma^4/(n-1)$); (2) distributions of statistics — "find the
distribution of $Z$" or "which of these is $t(n-1)$" (Examples 3, 5, 6); (3) probabilities
of statistics through $\Phi$ or a $\chi^2$ table (Examples 7, 8). Know the theorem's four
parts and the two corollaries by heart, and the two-population $t$ and $F$.
:::

::: callout summary The lesson in five lines
Normal sample: $\bar X\sim N(\mu,\sigma^2/n)$; $\bar X$ and $S^2$ independent;
$(n-1)S^2/\sigma^2\sim\chi^2(n-1)$; $\sum(X_i-\mu)^2/\sigma^2\sim\chi^2(n)$. Hence
$\frac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1)$ and $\frac{\bar X-\mu}S\sqrt n\sim t(n-1)$. Two
samples: with equal variances the pooled $t\sim t(n_1+n_2-2)$; always
$\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(n_1-1,n_2-1)$. And $DS^2=2\sigma^4/(n-1)$.
:::

::: cards Sampling distributions of normal populations
Distribution of $\bar X$ from a normal sample :: $\bar X\sim N(\mu,\sigma^2/n)$.
Are $\bar X$ and $S^2$ independent? :: Yes, for a normal population.
Distribution of $(n-1)S^2/\sigma^2$ :: $\chi^2(n-1)$; it equals $\frac1{\sigma^2}\sum(X_i-\bar X)^2=\frac{nS^{*2}}{\sigma^2}$.
Distribution of $\frac1{\sigma^2}\sum(X_i-\mu)^2$ :: $\chi^2(n)$: deviations from the true mean keep all $n$ degrees of freedom.
Standardised mean, σ known :: $\frac{\bar X-\mu}{\sigma}\sqrt n\sim N(0,1)$.
Standardised mean, σ unknown :: $\frac{\bar X-\mu}{S}\sqrt n\sim t(n-1)$, or $\frac{\bar X-\mu}{S^*}\sqrt{n-1}\sim t(n-1)$.
Pooled sample variance $S_w^2$ :: $\frac{(n_1-1)S_1^2+(n_2-1)S_2^2}{n_1+n_2-2}$; $ES_w^2=\sigma^2$ when the variances are equal.
Two-sample t statistic (equal variances) :: $\frac{(\bar X-\bar Y)-(\mu_1-\mu_2)}{S_w\sqrt{1/n_1+1/n_2}}\sim t(n_1+n_2-2)$.
Variance-ratio statistic :: $\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(n_1-1,n_2-1)$, for any variances.
Variance of $S^2$ (normal population) :: $DS^2=\frac{2\sigma^4}{n-1}$, from $D\chi^2(n-1)=2(n-1)$; normal populations only.
Recipe for "find the distribution of a statistic" :: Build an $N(0,1)$ and an independent $\chi^2(k)$, then match $t=U/\sqrt{V/k}$ or $F$.
Mean absolute deviation for $N(\mu,\sigma^2)$ :: $E|X-\mu|=\sigma\sqrt{2/\pi}$, $D|X-\mu|=\sigma^2(1-2/\pi)$.
:::

::: quiz Sampling distributions of normal populations
? (In-class question 23-036) $X_1,\dots,X_n$ is a sample from $N(0,1)$. Then $\sum_{i=1}^n(X_i-\bar X)^2\sim$
- [ ] $\chi^2(n)$
- [x] $\chi^2(n-1)$
- [ ] $N(0,n^2)$
- [ ] $N(0,\frac1n)$
> Here $\sigma^2=1$, so $\sum(X_i-\bar X)^2=\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$. Deviations
> from $\bar X$, not $\mu$: $n-1$ degrees of freedom.

? (In-class question 23-039) $\bar X_i$, $S_i^2$ are the mean and variance of a sample of size $n_i$ from $N(\mu_i,\sigma_i^2)$, $i=1,2$, the populations independent. Which statement is **incorrect**?
- [ ] $\frac{\sigma_2^2S_1^2}{\sigma_1^2S_2^2}\sim F(n_1-1,n_2-1)$
- [ ] $\frac{(\bar X_1-\bar X_2)-(\mu_1-\mu_2)}{\sqrt{\sigma_1^2/n_1+\sigma_2^2/n_2}}\sim N(0,1)$
- [x] $\frac{\bar X_1-\mu_1}{S_1/\sqrt{n_1}}\sim t(n_1)$
- [ ] $\frac{(n_2-1)S_2^2}{\sigma_2^2}\sim\chi^2(n_2-1)$
> The first is $\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}$, which is $F(n_1-1,n_2-1)$. The
> second: $\bar X_1-\bar X_2\sim N(\mu_1-\mu_2,\sigma_1^2/n_1+\sigma_2^2/n_2)$, standardised.
> The fourth is part (3) of the theorem. The third should be $t(n_1-1)$, so it is the
> incorrect one.

? (Example 3, 23-035) With $S_2^2=\frac1n\sum(X_i-\bar X)^2$, $S_3^2=\frac1{n-1}\sum(X_i-\mu)^2$ and $S_1^2=S^2$, which is $t(n-1)$?
- [ ] $\frac{\bar X-\mu}{S_1}\sqrt{n-1}$
- [x] $\frac{\bar X-\mu}{S_2}\sqrt{n-1}$
- [ ] $\frac{\bar X-\mu}{S_3}\sqrt n$
- [ ] $\frac{\bar X-\mu}{S_1}\sqrt{n+1}$
> $S_2=S^*$, and the corollary says $\frac{\bar X-\mu}{S^*}\sqrt{n-1}\sim t(n-1)$. With
> $S_1=S$ the factor must be $\sqrt n$; $S_3$ uses $\mu$ and is the wrong chi-square.

? (In-class question 24-010) $X_1,\dots,X_6$ is a sample from $N(\mu,\sigma^2)$ with sample variance $S^2$. Then $DS^2=$
- [ ] $\frac13\sigma^4$
- [ ] $\frac15\sigma^4$
- [x] $\frac25\sigma^4$
- [ ] $\frac25\sigma^2$
> $DS^2=\frac{2\sigma^4}{n-1}=\frac{2\sigma^4}{5}$. The last option has the wrong power of
> $\sigma$.

? (In-class question 24-011) $X_1,\dots,X_{17}$ is a sample from $N(\mu,4)$ with sample variance $S^2$, and $P\{S^2\ge a\}=0.01$. Given $P\{\chi^2(16)\ge32\}=0.01$ and $P\{\chi^2(15)\ge30.58\}=0.01$, find $E(S^2-a)+D(S^2-a)$.
answer: -2
> $n=17$, $\sigma^2=4$: $\frac{16S^2}{4}=4S^2\sim\chi^2(16)$. So
> $P\{S^2\ge a\}=P\{\chi^2(16)\ge4a\}=0.01$ gives $4a=32$, $a=8$. Then $ES^2=4$ and
> $DS^2=\frac{2\cdot16}{16}=2$, so $E(S^2-a)+D(S^2-a)=(4-8)+2=-2$. (The $\chi^2(15)$ value
> is a distractor: 16 degrees of freedom, not 15.)

? (In-class question 24-017) A sample of size 5 is taken from $N(12,4)$. The probability that the sample mean differs from the population mean by less than 1 is
- [ ] $2\Phi(0.5)-1$
- [x] $2\Phi\left(\frac{\sqrt5}2\right)-1$
- [ ] $2\Phi\left(\frac{\sqrt5}4\right)-1$
- [ ] $2\Phi(2.5)-1$
> $\bar X\sim N(12,\frac45)$, standard deviation $\frac2{\sqrt5}$. So
> $P\{|\bar X-12|<1\}=2\Phi\big(\frac1{2/\sqrt5}\big)-1=2\Phi\big(\frac{\sqrt5}2\big)-1\approx0.736$.

? $X_1,\dots,X_{2n}$ is a sample from $N(\mu,\sigma^2)$ and $Y=\sum_{i=1}^n(X_i+X_{n+i}-2\bar X)^2$. Find $EY$ in terms of $n$ and $σ$.
expression: 2 (n - 1) σ^2
variables: n, σ
> $Z_i=X_i+X_{n+i}\sim N(2\mu,2\sigma^2)$ are independent with mean $\bar Z=2\bar X$, so
> $Y=(n-1)S_Z^2$ and $EY=(n-1)\cdot2\sigma^2$.

? $X_1,\dots,X_{10}$ is a sample from $N(0,0.5^2)$. $P\{\sum X_i^2\ge4\}=P\{\chi^2(k)\ge c\}$. What is $c$?
answer: 16
> $\sum X_i^2/0.25\sim\chi^2(10)$, and $4/0.25=16$; the probability is about $0.1$.

? $X\sim N(2,1)$ and $\bar X$ is the mean of a sample of 9. Find $P\{1<\bar X<3\}$.
answer: 2 Phi(3) - 1
tolerance: 0.1%
> $\bar X\sim N(2,\frac19)$, so the ends are 3 standard deviations from the centre:
> $2\Phi(3)-1=0.9973$.

? In Example 5, $Z=\sqrt2(Y_1-Y_2)/S$ with $S^2$ the sample variance of three observations. $Z$ has the $t$ distribution with how many degrees of freedom?
answer: 2
> $2S^2/\sigma^2\sim\chi^2(3-1)=\chi^2(2)$, so $Z\sim t(2)$.

? For which populations does $DS^2=\frac{2\sigma^4}{n-1}$ hold?
- [x] Normal populations only
- [ ] Every population with finite variance
- [ ] Every continuous population
- [ ] Only the standard normal
> It comes from $\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$, which needs a normal population
> (any $\mu$ and $\sigma^2$). By contrast $ES^2=\sigma^2$ holds for every population.
:::

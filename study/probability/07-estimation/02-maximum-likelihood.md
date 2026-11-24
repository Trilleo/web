---
title: Maximum likelihood estimation
zh: 极大似然估计法
summary: The second way to estimate a parameter — choose the value under which the observed sample is most likely — with the likelihood function for discrete and continuous populations, the three steps, and the standard examples (0–1, Poisson, normal, uniform, shifted exponential, distribution laws).
source: 20点估计11-2, 2026-11-11; recap in 21点估计12-1, 2026-11-16
---

The method of moments (Lesson 7.1) needs only the population's mean, variance and other
moments; it never looks at the shape of the distribution. When we **do** know the type
of the population — "it's Poisson", "it's normal", "it's uniform on some interval" — we
can use that knowledge. {{term Maximum likelihood estimation | 极大似然估计法}} asks a
simple question: of all the values the parameter could have, which one makes the sample
we actually saw the most probable? That value is the estimate. It is the most widely used
estimation method in statistics, and on exams it is the half of nearly every
point-estimation problem that isn't the method of moments.

This lesson builds the method from two everyday stories, defines the likelihood function
for discrete and continuous populations, gives the three steps, and works through every
example from the lecture — including the ones where calculus can't find the maximum and
you have to think instead.

Throughout, $X_1, X_2, \ldots, X_n$ is a simple random sample (independent copies of the
population $X$, Lesson 6.1), $x_1, \ldots, x_n$ are the numbers it actually produced, and
$\theta$ is the unknown parameter. $X_{(1)} = \min X_i$ and $X_{(n)} = \max X_i$ are the
smallest and largest sample values (the order statistics of Lesson 6.1).

## Where the method comes from

Maximum likelihood is a method for when the **type of the population is known** and only
its parameters are not. It was first proposed by the German mathematician Carl Friedrich
Gauss (高斯) in 1821, but it is usually credited to the British statistician R. A. Fisher
(费歇, also written 费希尔), who rediscovered it in 1922 and was the first to study its
properties.

## The idea: the parameter that best explains the sample

### Story 1: who shot the hare?

A student and an experienced hunter go out hunting together. A hare dashes past, a single
shot rings out, and the hare falls. Who fired it?

Almost everyone answers "the hunter". We don't *know* — the student might have got
lucky — but a hunter hits with a much higher probability than a beginner, so the
explanation "the hunter fired" makes what we saw far more likely than "the student
fired". Choosing the explanation under which the observation is most probable is exactly
the reasoning of maximum likelihood.

### Story 2: white and black balls

A box holds many white and black balls in the ratio $1:3$, but we don't know which
colour is the majority. We draw 5 balls **with replacement** and see

$$\text{white, black, white, white, white.}$$

Estimate the probability $p$ of drawing a white ball.

From the ratio, $p$ is either $\frac14$ (white is the minority) or $\frac34$ (white is the
majority). Four whites out of five already suggests the answer; let's make it precise.

::: example The 1 : 3 box
Decide between $p = \frac14$ and $p = \frac34$ from the draws W, B, W, W, W.
== Model ==
Let $X = 1$ if a draw is white and $X = 0$ if black, so $X \sim B(1, p)$, the 0–1
distribution. The five draws are a sample $X_1, \ldots, X_5$ with observed values
$x_1 = 1,\ x_2 = 0,\ x_3 = 1,\ x_4 = 1,\ x_5 = 1$.
== Probability of the sample ==
The draws are independent, so
$$\begin{aligned}P(X_1=1, X_2=0, X_3=1, X_4=1, X_5=1) &= P(X_1=1)P(X_2=0)P(X_3=1)P(X_4=1)P(X_5=1)\\ &= p^4(1-p).\end{aligned}$$
== Try both values ==
- $p = \frac14$: $\left(\frac14\right)^4\cdot\frac34 = \frac{3}{1024} \approx 0.0029$.
- $p = \frac34$: $\left(\frac34\right)^4\cdot\frac14 = \frac{81}{1024} \approx 0.0791$.
== Choose ==
The sample is 27 times more likely when $p = \frac34$, so we estimate $p = \frac34$.
:::

The lecture sums up the principle in one line: **choose the parameter value that best
supports the sample we drew** (参数取值最支持我们抽到的这组样本) — the value under which
the distribution produces our sample with the greatest probability.

The curve below is $p^4(1-p)$ for every $p$ between 0 and 1. The two thin bars mark the
two allowed values. If $p$ could be **anything**, the highest point would be at
$p = \frac45$, the proportion of whites in the sample — a first hint of the general
result in the 0–1 example below.

::: plot Probability of W, B, W, W, W as a function of p
x: 0 .. 1
y: 0 .. 0.1
xlabel: p
ylabel: p⁴(1 − p)
L(x) = x^4 (1 - x)
region Allowed: abs(abs(x - 0.5) - 0.25) < 0.005, 0 < y < x^4 (1 - x)
:::

## The likelihood function

### Discrete populations

Let the population $X$ be discrete with distribution law $P\{X = x\} = p(x; \theta)$,
where $\theta$ is unknown. A sample $X_1, \ldots, X_n$ produced the values
$x_1, \ldots, x_n$. Because the $X_i$ are independent and each has the population's law,
the probability of getting exactly this sample — the {{term sample distribution | 样本分布}} —
is

$$P(X_1 = x_1, X_2 = x_2, \ldots, X_n = x_n) = P(X_1=x_1)P(X_2=x_2)\cdots P(X_n=x_n) = \prod_{i=1}^n p(x_i;\theta).$$

Now change the point of view. The numbers $x_1, \ldots, x_n$ are fixed — they're on paper
in front of us. What we don't know is $\theta$. Read the same product as a function of
$\theta$:

::: define Likelihood function | 似然函数
For a discrete population with distribution law $p(x;\theta)$ and observed sample values
$x_1, \ldots, x_n$, the **likelihood function** is
$$L(\theta) = P(X_1=x_1)P(X_2=x_2)\cdots P(X_n=x_n) = \prod_{i=1}^n p(x_i;\theta),$$
regarded as a function of $\theta$ with $x_1, \ldots, x_n$ held fixed. For a continuous
population the density takes the place of the law (below).
:::

The likelihood measures how likely the observed sample is under each value of $\theta$.
It is **not** a probability distribution for $\theta$ (it needn't add or integrate to 1
over $\theta$); it's a score for each candidate value.

::: define Maximum likelihood estimate | 极大似然估计
The value $\hat\theta$ that makes the likelihood as large as possible,
$$L(\hat\theta) = \max_\theta L(\theta).$$
Worked out from the numbers, $\hat\theta(x_1, \ldots, x_n)$ is the
{{term maximum likelihood estimate | 极大似然估计值}} of $\theta$; the same formula applied to
the random sample, $\hat\theta(X_1, \ldots, X_n)$, is the statistic called the
{{term maximum likelihood estimator | 极大似然估计量}} (MLE).
:::

The estimate is a number ("$\hat p = 0.15$"); the estimator is a random variable
("$\hat p = \overline{X}$") whose behaviour over many samples we can study — Lesson 7.3
does exactly that.

### Continuous populations

For a continuous population the probability of any exact sample is 0, so the product of
probabilities is useless. Instead use the joint density, which measures how likely the
sample is to fall *near* $x_1, \ldots, x_n$. If $X$ has density $f(x;\theta)$ (the slides
write $p(x;\theta)$ here too), the sample's joint density is
$f(x_1;\theta)f(x_2;\theta)\cdots f(x_n;\theta)$ by independence (Lesson 3.5), and the
definition is the same with $f$ in place of $p$:

::: formula Likelihood function | 似然函数
$$L(\theta) = \prod_{i=1}^n p(x_i;\theta) \ \text{(discrete)}, \qquad L(\theta) = \prod_{i=1}^n f(x_i;\theta) \ \text{(continuous)}$$
--
x_1, \ldots, x_n | the observed sample values (fixed numbers) |
p(x;\theta) | the population's distribution law P{X = x} |
f(x;\theta) | the population's density |
\hat\theta | the MLE: the value of θ maximising L(θ) |
:::

## The three steps

Products are awkward to differentiate; sums are easy. Since $\ln$ is increasing, $L$ and
$\ln L$ are largest at the same $\theta$, so we maximise the
{{term log-likelihood | 对数似然函数}} $\ln L(\theta) = \sum_{i=1}^n \ln p(x_i;\theta)$
instead.

1. **Write the likelihood function $L(\theta)$.** This is the key step and the hard part
   (重点和难点): get each factor right, including where the density is zero.
2. **Take logs:** write $\ln L(\theta)$ and simplify.
3. **Maximise by calculus:** set the derivative to zero and solve. Substituting the
   sample values gives the estimate.

The equations of step 3 have a name:

::: formula Likelihood equations | 似然方程
$$\frac{\d \ln L(\theta)}{\d\theta} = 0 \quad\text{(one parameter)}, \qquad \begin{cases}\dfrac{\partial \ln L(\theta_1,\theta_2)}{\partial\theta_1} = 0\\[2mm] \dfrac{\partial \ln L(\theta_1,\theta_2)}{\partial\theta_2} = 0\end{cases}\quad\text{(two parameters)}$$
--
\ln L | the log-likelihood, with the same maximiser as L |
\theta_1, \theta_2 | two unknown parameters, solved for together |
:::

::: callout pitfall A zero derivative is not the whole story
The likelihood equation finds a stationary point, which is the maximum in the textbook
examples. But sometimes it has **no solution** (the uniform and shifted exponential
examples below), or the solution isn't allowed (the four-point question). Then go back to
$L(\theta)$ itself, find where it is increasing or decreasing, and remember the range of
$\theta$ and of $x$ where the density is positive.
:::

## Discrete examples

### The 0–1 distribution

::: example Example 1: the proportion of defective items
Products are either good ($X = 0$) or defective ($X = 1$), $X \sim (0\text{–}1)$ with
$P\{X = 1\} = p$, $0 < p < 1$. We inspect $n$ products and observe $x_1, \ldots, x_n$.
Find the MLE of $p$.
== Write L ==
The 0–1 law in one formula is $P\{X = x\} = p^x(1-p)^{1-x}$, $x = 0, 1$. So
$$\begin{aligned}L(p) &= p^{x_1}(1-p)^{1-x_1}\,p^{x_2}(1-p)^{1-x_2}\cdots p^{x_n}(1-p)^{1-x_n}\\ &= p^{\sum x_i}(1-p)^{\,n - \sum x_i}.\end{aligned}$$
== Take logs ==
$$\ln L(p) = \Big(\sum_{i=1}^n x_i\Big)\ln p + \Big(n - \sum_{i=1}^n x_i\Big)\ln(1-p).$$
== Differentiate ==
$$\frac{\d}{\d p}\ln L(p) = \frac1p\sum_{i=1}^n x_i - \frac{1}{1-p}\Big(n - \sum_{i=1}^n x_i\Big) = 0.$$
Multiply by $p(1-p)$: $(1-p)\sum x_i = p\,(n - \sum x_i)$, so $\sum x_i = np$.
== Answer ==
$$\hat p = \frac1n\sum_{i=1}^n x_i = \bar x, \qquad\text{the estimator } \hat p = \overline{X}.$$
The MLE of a probability is the observed proportion. With 3 defectives among 20 items,
$\hat p = 3/20 = 0.15$.
:::

Slide the number of successes $k = \sum x_i$ in $n = 20$ trials. The curve is the
likelihood $p^k(1-p)^{20-k}$, scaled so its top is at height 1 (only *where* the top is
matters, not how high), and the bar marks $\hat p = k/20$.

::: plot Likelihood of p after k successes in 20 trials
x: 0 .. 1
y: 0 .. 1.1
xlabel: p
ylabel: L(p) / L(p̂)
L(x) = x^k (1 - x)^(20 - k) / ((k/20)^k (1 - k/20)^(20 - k))
region Estimate: abs(x - k/20) < 0.004, 0 < y < 1
slider k: 0 .. 20 = 5 | | step 1
:::

### The Poisson distribution

::: example Example 2: Poisson
The population is $X \sim P(\lambda)$. Find the MLE of $\lambda$.
== Write L ==
$P\{X_i = x_i\} = \dfrac{\lambda^{x_i}}{x_i!}e^{-\lambda}$, $x_i = 0, 1, 2, \ldots$, so
$$L(\lambda) = \frac{\lambda^{x_1}}{x_1!}e^{-\lambda}\cdots\frac{\lambda^{x_n}}{x_n!}e^{-\lambda} = \frac{\lambda^{x_1 + \cdots + x_n}}{x_1!\,x_2!\cdots x_n!}\,e^{-n\lambda}.$$
== Take logs ==
$$\ln L(\lambda) = \Big(\sum_{i=1}^n x_i\Big)\ln\lambda - n\lambda - \ln(x_1!\,x_2!\cdots x_n!).$$
The last term doesn't involve $\lambda$; it will vanish when we differentiate.
== Differentiate ==
$$\frac{\d}{\d\lambda}\ln L(\lambda) = \frac1\lambda\sum_{i=1}^n x_i - n = 0.$$
== Answer ==
When $\bar x > 0$: $\hat\lambda = \frac1n\sum x_i = \bar x$, the estimator $\hat\lambda = \overline{X}$.
For the counts $2, 0, 3, 1, 4$, $\hat\lambda = 10/5 = 2$.
== The case x̄ = 0 ==
If every observation is 0, $L(\lambda) = e^{-n\lambda}$, which **decreases** for all
$\lambda > 0$. It gets ever larger as $\lambda \to 0^+$ but never reaches a maximum on
$\lambda > 0$: there is no maximum likelihood estimate (无极大值).
:::

Here $n = 5$ and $s = \sum x_i$ is the total count; set $s = 0$ to see the likelihood fall
away with no peak.

::: plot Poisson likelihood for 5 observations with total s
x: 0 .. 6
y: 0 .. 1.1
xlabel: λ
ylabel: L(λ) / max
L(x) = x^s e^(-5 x) / ((s/5)^s e^(-s))
slider s: 0 .. 25 = 10 | | step 1
:::

::: callout tip Both examples agree with the method of moments
For the 0–1 and Poisson populations, maximum likelihood gives $\overline{X}$ — the same as
the method of moments, since $EX = p$ and $EX = \lambda$. The two methods often agree for
simple populations; they part ways in the uniform and distribution-law examples below.
:::

## The normal distribution

::: example Example 3: normal, both parameters unknown
$X \sim N(\mu, \sigma^2)$ with $\mu$ and $\sigma^2$ unknown. Find their MLEs.
== Write L ==
The density is $f(x) = \frac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$, so
$$\begin{aligned}L(\mu,\sigma^2) &= \prod_{i=1}^n \frac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x_i-\mu)^2}{2\sigma^2}}\\ &= (2\pi\sigma^2)^{-n/2}\,e^{-\frac{1}{2\sigma^2}\left[(x_1-\mu)^2 + \cdots + (x_n-\mu)^2\right]}.\end{aligned}$$
== Take logs ==
$$\ln L(\mu,\sigma^2) = -\frac n2\ln(2\pi\sigma^2) - \frac{1}{2\sigma^2}\sum_{i=1}^n (x_i-\mu)^2.$$
== Two likelihood equations ==
Treat $\sigma^2$ as one variable:
$$\frac{\partial \ln L}{\partial\mu} = \frac{1}{\sigma^2}\sum_{i=1}^n(x_i-\mu) = 0, \qquad \frac{\partial \ln L}{\partial\sigma^2} = -\frac{n}{2\sigma^2} + \frac{1}{2(\sigma^2)^2}\sum_{i=1}^n(x_i-\mu)^2 = 0.$$
== Solve ==
The first gives $\sum x_i = n\mu$, so $\hat\mu = \bar x$. Put that into the second and
multiply by $2(\sigma^2)^2$: $n\sigma^2 = \sum (x_i - \bar x)^2$, so
$$\hat\mu = \bar x, \qquad \widehat{\sigma^2} = \frac1n\sum_{i=1}^n (x_i - \bar x)^2.$$
== Estimators ==
$$\hat\mu = \overline{X}, \qquad \widehat{\sigma^2} = \frac1n\sum_{i=1}^n (X_i - \overline{X})^2 = S^{*2},$$
the sample second central moment (divisor $n$), **not** the sample variance $S^2$
(divisor $n - 1$).
== With numbers ==
For the sample $4.9, 5.2, 5.0, 4.7, 5.2$: $\bar x = 25/5 = 5.0$, and the squared deviations
are $0.01, 0.04, 0, 0.09, 0.04$, adding to $0.18$, so $\widehat{\sigma^2} = 0.18/5 = 0.036$.
:::

::: example Variation: normal with μ known
$X \sim N(\mu, \sigma^2)$ where $\mu$ is **known**. Find the MLE of $\sigma^2$.
== Write L and take logs ==
The likelihood is the same product, but now a function of $\sigma^2$ alone:
$$\ln L(\sigma^2) = -\frac n2\ln(2\pi\sigma^2) - \frac{1}{2\sigma^2}\sum_{i=1}^n(x_i-\mu)^2.$$
== Differentiate ==
$$\frac{\d \ln L}{\d\sigma^2} = -\frac{n}{2\sigma^2} + \frac{1}{2(\sigma^2)^2}\sum_{i=1}^n(x_i-\mu)^2 = 0.$$
== Answer ==
$$\widehat{\sigma^2} = \frac1n\sum_{i=1}^n (X_i - \mu)^2.$$
With $\mu$ known there's no need to estimate the centre, so the deviations are measured
from the true $\mu$, not from $\overline{X}$.
:::

::: formula MLE for a normal population | 正态总体参数的极大似然估计
$$\hat\mu = \overline{X}, \quad \widehat{\sigma^2} = \frac1n\sum_{i=1}^n (X_i - \overline{X})^2 = S^{*2}; \qquad \mu \text{ known: } \widehat{\sigma^2} = \frac1n\sum_{i=1}^n (X_i - \mu)^2$$
--
\overline{X} | the sample mean |
S^{*2} | the sample second central moment, divisor n |
\mu | the population mean, when it is known |
:::

::: callout pitfall S*² is the MLE, not S²
The MLE of $\sigma^2$ divides by $n$. It equals the moment estimator (Lesson 7.1), and as
Lesson 7.3 shows it is slightly biased, which is why the sample variance $S^2$ divides by
$n - 1$ instead. Exams test the difference: read the divisor carefully.
:::

## When calculus can't decide: the support depends on θ

In every example so far the set of possible $x$ values was the same whatever the
parameter. When the **support** (where the density is positive) itself depends on
$\theta$, the likelihood is zero for some $\theta$ and the derivative doesn't settle things.

### The uniform distribution U[θ₁, θ₂]

::: example Example 4: the uniform distribution
$X \sim U[\theta_1, \theta_2]$. Find the MLEs of $\theta_1$ and $\theta_2$.
== Write L, with its zeros ==
The density is $\frac{1}{\theta_2 - \theta_1}$ on $[\theta_1, \theta_2]$ and 0 elsewhere,
so the product is nonzero only if **every** $x_i$ lies in $[\theta_1, \theta_2]$:
$$L(\theta_1,\theta_2) = \begin{cases}\dfrac{1}{(\theta_2-\theta_1)^n}, & x_i \in [\theta_1,\theta_2],\ i = 1, \ldots, n,\\[2mm] 0, & \text{otherwise.}\end{cases}$$
"Every $x_i$ in $[\theta_1, \theta_2]$" is the same as
$\theta_1 \le x_{(1)} \le x_{(n)} \le \theta_2$: the interval must reach past the smallest
and largest observations.
== Try calculus ==
Where $L > 0$, $\ln L = -n\ln(\theta_2 - \theta_1)$ and
$$\frac{\partial \ln L}{\partial\theta_1} = \frac{n}{\theta_2-\theta_1} > 0, \qquad \frac{\partial \ln L}{\partial\theta_2} = -\frac{n}{\theta_2-\theta_1} < 0.$$
Neither can be 0: the likelihood equations have no solution, and calculus can't
determine $\theta_1, \theta_2$.
== Use monotonicity ==
But the signs tell us everything. On the allowed region, $L$ **increases** with
$\theta_1$ and **decreases** with $\theta_2$: we want $\theta_1$ as large as possible and
$\theta_2$ as small as possible, i.e. the shortest interval that still covers the sample.
The largest allowed $\theta_1$ is $x_{(1)}$ and the smallest allowed $\theta_2$ is $x_{(n)}$.
== Answer ==
$$\hat\theta_1 = X_{(1)} = \min_i X_i, \qquad \hat\theta_2 = X_{(n)} = \max_i X_i.$$
For the sample $-1.2, 0.5, 2.1, -0.3, 1.4$: $\hat\theta_1 = -1.2$, $\hat\theta_2 = 2.1$.
:::

The lecture's picture: dots on a number line, with $\theta_1$ and $\theta_2$ just outside
the extreme points; maximum likelihood shrinks the interval until its ends sit on
$x_{(1)}$ and $x_{(n)}$. In the $(\theta_1, \theta_2)$ plane: the shaded corner is where
$L > 0$ (here $a = x_{(1)}$, $b = x_{(n)}$). Along each diagonal line
$\theta_2 - \theta_1 = c$ (a constant) the likelihood is the same, and it is larger the closer
the line is to the diagonal; the drawn line through the corner $(a, b)$ is the best one
that still touches the shaded region.

::: plot Where L(θ₁, θ₂) > 0, and the best corner
x: -4 .. 4
y: -4 .. 4
xlabel: θ₁
ylabel: θ₂
region Allowed: x <= a, y >= b
f(x) = x + b - a
slider a: -3 .. 0 = -1.2 | | smallest observation
slider b: 0 .. 3 = 2.1 | | largest observation
:::

Practise the same reasoning on the lecture's four drills (变式训练). In each, write down
when $L > 0$, note which way $L$ moves in $\theta$, and push $\theta$ to the edge.

::: example Drills: four uniform populations
Find the MLE of $\theta$ ($\theta > 0$) for (a) $U[-\theta, \theta]$, (b) $U[0, \theta]$,
(c) $U[0, 2\theta]$, (d) $U[-2\theta, 0]$.
== (a) U[−θ, θ] ==
$L(\theta) = (2\theta)^{-n}$ when $-\theta \le x_i \le \theta$ for all $i$, i.e. when
$\theta \ge |x_i|$ for all $i$; otherwise 0. $L$ decreases in $\theta$, so take the smallest
allowed value:
$$\hat\theta = \max_i |X_i| = \max\{-X_{(1)}, X_{(n)}\}.$$
For $-2.6, 0.5, 2.1, -0.3, 1.4$ that is $2.6$, not the largest value $2.1$.
== (b) U[0, θ] ==
$L(\theta) = \theta^{-n}$ when $\theta \ge x_{(n)}$ (all $x_i \ge 0$ automatically), else 0.
Decreasing, so $\hat\theta = X_{(n)}$.
== (c) U[0, 2θ] ==
$L(\theta) = (2\theta)^{-n}$ when $2\theta \ge x_{(n)}$. Decreasing, so
$2\hat\theta = X_{(n)}$ and $\hat\theta = X_{(n)}/2$.
== (d) U[−2θ, 0] ==
$L(\theta) = (2\theta)^{-n}$ when $-2\theta \le x_{(1)}$, i.e. $\theta \ge -x_{(1)}/2$.
Decreasing, so $\hat\theta = -X_{(1)}/2$.
:::

For $U[0, \theta]$ the likelihood is the curve $\theta^{-n}$ to the right of the largest
observation $m = x_{(n)}$ and zero to its left — a cliff edge at $m$, which is where the
maximum is. (Drawn scaled, as $(m/\theta)^n$.)

::: plot Likelihood for U[0, θ]: zero left of the largest observation
x: 0 .. 10
y: 0 .. 1.1
xlabel: θ
ylabel: L(θ) / L(m)
region L: x > m, 0 < y < (m / x)^n
slider m: 1 .. 8 = 4 | | largest observation
slider n: 1 .. 20 = 5 | | step 1
:::

::: callout pitfall U[0, θ]: moments and likelihood disagree
The method of moments gives $\hat\theta = 2\overline{X}$ for $U[0, \theta]$ (Lesson 7.1);
maximum likelihood gives $X_{(n)}$. They are different estimators, and exams love to ask
for both and then compare them (Lesson 7.3). Note also that $2\bar x$ can come out
**smaller** than the largest observation, which is impossible for the true $\theta$; the
MLE never has that problem.
:::

### The shifted exponential distribution

::: example Example 5: two parameters, one at the edge of the support
The population has density
$$f(x) = \begin{cases}\dfrac1\theta e^{-(x-\mu)/\theta}, & x \ge \mu,\\[2mm] 0, & \text{otherwise,}\end{cases}$$
with $\theta > 0$ and $\mu$ unknown (an exponential distribution shifted to start at $\mu$).
Find the MLEs of $\theta$ and $\mu$.
== Write L ==
The product is nonzero only if every $x_i \ge \mu$, i.e. $\min_i x_i = x_{(1)} \ge \mu$:
$$L(\theta,\mu) = \begin{cases}\dfrac{1}{\theta^n}\,e^{-\frac1\theta\sum_{i=1}^n (x_i-\mu)}, & x_{(1)} \ge \mu,\\[2mm] 0, & \text{otherwise.}\end{cases}$$
== Take logs and differentiate ==
When $x_{(1)} \ge \mu$:
$$\ln L(\theta,\mu) = -n\ln\theta - \frac1\theta\sum_{i=1}^n (x_i - \mu),$$
$$\frac{\partial \ln L}{\partial\theta} = -\frac n\theta + \frac{1}{\theta^2}\sum_{i=1}^n(x_i-\mu) = 0 \quad (1), \qquad \frac{\partial \ln L}{\partial\mu} = \frac n\theta > 0 \quad (2).$$
Equation (1) gives $\theta = \frac1n\sum x_i - \mu$, but (2) has no solution, so calculus
alone can't fix $\mu$.
== Monotonicity in μ ==
By (2), $L$ increases with $\mu$ on the allowed region $\mu \le x_{(1)}$. So take $\mu$ as
large as allowed: $\hat\mu = x_{(1)}$. (On the slide's number line, $\mu$ slides right
until it sits on the smallest observation.)
== Answer ==
Put $\hat\mu$ into (1):
$$\hat\mu = X_{(1)}, \qquad \hat\theta = \frac1n\sum_{i=1}^n X_i - X_{(1)} = \overline{X} - X_{(1)}.$$
For $5.3, 6.1, 5.0, 7.4, 5.7$: $\hat\mu = 5.0$, $\bar x = 29.5/5 = 5.9$, $\hat\theta = 0.9$.
:::

::: callout key Write L with its "where"
The single most important habit: when you write $L(\theta)$, write **where** it is
nonzero. For densities like $\frac1\theta$ on $[0, \theta]$ or $e^{-(x-\mu)}$ for
$x \ge \mu$, that condition turns into a bound on $\theta$ through $X_{(1)}$ or
$X_{(n)}$ — and the answer sits on that bound.
:::

## Populations given by a distribution law

When the population is a table of values and probabilities depending on $\theta$, the
likelihood is a product of those probabilities, one factor per observation. Observations
with the same value give the same factor, so count how many times each value occurs and
use powers.

::: example Example 6: a three-point distribution
$X$ has the distribution law
$$\begin{array}{c|ccc} X & 0 & 1 & 2 \\ \hline p & \theta & 1-2\theta & \theta \end{array}$$
(so $0 < \theta < \frac12$). (1) Find the moment estimator $\hat\theta_1$ of $\theta$.
(2) A sample contains two 0s, four 1s and four 2s. Find the MLE $\hat\theta_2$.
== (1) First moment ==
$\mu_1 = EX = 0\cdot\theta + 1\cdot(1-2\theta) + 2\cdot\theta = 1$. The mean doesn't
involve $\theta$ (the law is symmetric about 1), so it can't be used.
== (1) Second moment ==
$\mu_2 = E(X^2) = 0\cdot\theta + 1\cdot(1-2\theta) + 4\cdot\theta = 1 + 2\theta$, so
$\theta = \frac{\mu_2 - 1}{2}$. Replace $\mu_2$ by the sample second raw moment
$a_2 = \frac1n\sum X_i^2$:
$$\hat\theta_1 = \frac12\cdot\frac1n\sum_{i=1}^n X_i^2 - \frac12.$$
== (2) Likelihood ==
Two 0s contribute $\theta^2$, four 1s $(1-2\theta)^4$, four 2s $\theta^4$:
$$L(\theta) = \theta^2(1-2\theta)^4\theta^4 = \theta^6(1-2\theta)^4, \qquad \ln L(\theta) = 6\ln\theta + 4\ln(1-2\theta).$$
== (2) Solve ==
$$\frac{\d\ln L}{\d\theta} = \frac6\theta - \frac{8}{1-2\theta} = 0 \ \Rightarrow\ 6(1-2\theta) = 8\theta \ \Rightarrow\ \hat\theta_2 = \frac{6}{20} = \frac{3}{10}.$$
== Compare ==
On this same sample, $\sum x_i^2 = 4\cdot1 + 4\cdot4 = 20$, so $a_2 = 2$ and the moment
estimate is $\hat\theta_1 = 1 - \frac12 = \frac12$ — the very edge of the allowed range,
where $P\{X = 1\} = 1 - 2\theta = 0$, although we saw four 1s. The MLE $\frac3{10}$ uses the
whole distribution and gives a sensible answer.
:::

The in-class question (主观题) is the same kind of problem with a four-point law; it
leads to a quadratic, and one root has to be thrown out.

::: example In-class question: a four-point distribution
$X$ has the law
$$\begin{array}{c|cccc} X & 0 & 1 & 2 & 3 \\ \hline p & \theta^2 & 2\theta(1-\theta) & \theta^2 & 1-2\theta \end{array}$$
and the sample values are $3, 1, 3, 0, 3, 1, 2, 3$. Find the moment estimate and the
maximum likelihood estimate of $\theta$.
== Moment estimate ==
$$\mu_1 = EX = 1\cdot2\theta(1-\theta) + 2\cdot\theta^2 + 3(1-2\theta) = 3 - 4\theta,$$
so $\theta = \frac{3-\mu_1}{4}$ and the moment estimator is $\hat\theta = \frac{3 - \overline{X}}{4}$.
Here $\bar x = \frac18(3+1+3+0+3+1+2+3) = \frac{16}{8} = 2$, so $\hat\theta = \frac{3-2}{4} = \frac14$.
== Count the values ==
In the sample, 0 occurs once, 1 twice, 2 once and 3 four times.
== Likelihood ==
$$\begin{aligned}L(\theta) &= \theta^2\,[2\theta(1-\theta)]^2\,\theta^2\,(1-2\theta)^4 = 4\theta^6(1-\theta)^2(1-2\theta)^4,\\ \ln L(\theta) &= \ln4 + 6\ln\theta + 2\ln(1-\theta) + 4\ln(1-2\theta).\end{aligned}$$
== Likelihood equation ==
$$\frac{\d\ln L}{\d\theta} = \frac6\theta - \frac{2}{1-\theta} - \frac{8}{1-2\theta} = 0.$$
Multiply by $\theta(1-\theta)(1-2\theta)$:
$6(1-\theta)(1-2\theta) - 2\theta(1-2\theta) - 8\theta(1-\theta) = 0$, which expands to
$6 - 28\theta + 24\theta^2 = 0$, i.e. $12\theta^2 - 14\theta + 3 = 0$.
== Choose the root ==
$\theta = \frac{14 \pm \sqrt{196 - 144}}{24} = \frac{7 \pm \sqrt{13}}{12}$. All the
probabilities must be nonnegative, so $0 < \theta < \frac12$; $\frac{7+\sqrt{13}}{12} \approx 0.884$
is too big. Hence
$$\hat\theta = \frac{7 - \sqrt{13}}{12} \approx 0.283.$$
:::

::: callout exam What exams ask
A typical final-exam problem: "find the moment estimator and the maximum likelihood
estimator of $\theta$" for a given density or distribution law — then, often, "is it
unbiased?" (Lesson 7.3). Expect one of: a density with $\theta$ in the formula only
(differentiate), a density whose support depends on $\theta$ (monotonicity, answer
$X_{(1)}$ or $X_{(n)}$), or a distribution law with given sample values (count, then
differentiate, then check the root is in range). Write every step: $L$, $\ln L$, the
equation, the estimator.
:::

## Summary

::: callout summary Maximum likelihood in four lines
The likelihood is the sample's probability (discrete, $\prod p(x_i;\theta)$) or density
(continuous, $\prod f(x_i;\theta)$), seen as a function of $\theta$. The MLE is the
$\theta$ that maximises it. Usually: take logs and solve the likelihood equation(s)
$\frac{\d\ln L}{\d\theta} = 0$. When the support depends on $\theta$, or the equation has no
solution, look at where $L$ is positive and which way it moves, and take the edge.
:::

The lecture closes with a warning that leads to the next topics. A point estimate names a
single value for the unknown parameter. It looks precise, but in fact gives little
assurance: we don't know how far off it might be. Lesson 7.3 judges estimators over many
samples, and Lesson 7.4 replaces the single value with an interval and a confidence level.

::: cards Maximum likelihood
Idea of maximum likelihood :: Choose the parameter value under which the observed sample is most probable — the value that "best supports" the sample.
Likelihood function, discrete population :: $L(\theta) = \prod_{i=1}^n p(x_i;\theta)$, the sample's probability as a function of $\theta$.
Likelihood function, continuous population :: $L(\theta) = \prod_{i=1}^n f(x_i;\theta)$, the sample's joint density as a function of $\theta$.
Maximum likelihood estimate vs estimator :: The estimate $\hat\theta(x_1,\ldots,x_n)$ is a number; the estimator $\hat\theta(X_1,\ldots,X_n)$ is a statistic (a random variable).
The three steps of maximum likelihood :: Write $L(\theta)$ (with where it's nonzero), take $\ln L$, solve $\frac{\d\ln L}{\d\theta} = 0$.
Why take logs? :: $\ln$ is increasing, so $\ln L$ has the same maximiser as $L$, and a sum is easier to differentiate than a product.
MLE for the 0–1 distribution :: $\hat p = \overline{X}$, the observed proportion.
MLE for the Poisson $P(\lambda)$ :: $\hat\lambda = \overline{X}$ (no maximum if all observations are 0).
MLE for $N(\mu, \sigma^2)$, both unknown :: $\hat\mu = \overline{X}$, $\widehat{\sigma^2} = \frac1n\sum(X_i-\overline{X})^2 = S^{*2}$.
MLE of $\sigma^2$ when $\mu$ is known :: $\widehat{\sigma^2} = \frac1n\sum(X_i - \mu)^2$.
MLE for the uniform $U[\theta_1, \theta_2]$ :: $\hat\theta_1 = X_{(1)}$, $\hat\theta_2 = X_{(n)}$, by monotonicity (the likelihood equations have no solution).
MLE for $U[0, \theta]$ and for $U[-\theta, \theta]$ :: $X_{(n)}$; and $\max_i |X_i|$.
MLE for the shifted exponential $\frac1\theta e^{-(x-\mu)/\theta}$, $x \ge \mu$ :: $\hat\mu = X_{(1)}$, $\hat\theta = \overline{X} - X_{(1)}$.
Likelihood for a distribution law :: Multiply the probabilities of the observed values, using powers for repeats; check the root lies in the allowed range of $\theta$.
:::

::: quiz Maximum likelihood
? The box holds white and black balls in the ratio $1:3$, colour unknown. Five draws with replacement give W, B, W, W, W. Which value of $p = P(\text{white})$ does maximum likelihood choose?
- [ ] $p = \frac14$, because white is rarer in the box
- [x] $p = \frac34$
- [ ] $p = \frac45$
- [ ] Neither: the two values are equally likely
> The sample's probability is $p^4(1-p)$: $\frac{3}{1024}$ at $p = \frac14$ and $\frac{81}{1024}$ at
> $p = \frac34$. The larger wins. ($\frac45$ would be the MLE if $p$ could be any value, but
> here only $\frac14$ and $\frac34$ are possible.)

? What is the name of the function $L(\theta) = \prod p(x_i;\theta)$, read as a function of $\theta$ with the data fixed?
text: likelihood function | likelihood | the likelihood function | 似然函数
> It's the likelihood function (似然函数): the sample's probability (or density) as a
> function of the unknown parameter.

? Of 20 products inspected, 3 are defective. Using the 0–1 model, what is the maximum likelihood estimate of the defect probability $p$?
answer: 3/20
> $\hat p = \bar x = \frac{3}{20} = 0.15$, the proportion of defectives.

? Five days' counts of a Poisson event are $2, 0, 3, 1, 4$. Find the maximum likelihood estimate of $\lambda$.
answer: 2
> $\hat\lambda = \bar x = \frac{2+0+3+1+4}{5} = 2$.

? A normal population ($\mu$, $\sigma^2$ both unknown) gave $4.9, 5.2, 5.0, 4.7, 5.2$. Find the maximum likelihood estimate of $\sigma^2$.
answer: 0.036
> $\bar x = 5.0$; squared deviations $0.01, 0.04, 0, 0.09, 0.04$ sum to $0.18$; the MLE
> divides by $n = 5$: $0.036$. (The sample variance $S^2$ would divide by 4: $0.045$.)

? A sample from $U[-\theta, \theta]$ is $-2.6, 0.5, 2.1, -0.3, 1.4$. Find the maximum likelihood estimate of $\theta$.
answer: 2.6
> $L(\theta) = (2\theta)^{-n}$ needs $\theta \ge |x_i|$ for every $i$, and it decreases in
> $\theta$, so $\hat\theta = \max|x_i| = 2.6$. Taking the largest value $2.1$ would leave
> $-2.6$ outside $[-\theta, \theta]$, where $L = 0$.

? What is the maximum likelihood estimator of $\theta$ for $U[0, 2\theta]$?
- [ ] $2\overline{X}$
- [ ] $X_{(n)}$
- [x] $X_{(n)}/2$
- [ ] $\overline{X}$
> $L(\theta) = (2\theta)^{-n}$ when $2\theta \ge x_{(n)}$, and it decreases in $\theta$, so
> $2\hat\theta = X_{(n)}$. ($\overline{X}$ is the moment estimator: $EX = \theta$.)

? What is the maximum likelihood estimator of $\theta$ for $U[-2\theta, 0]$?
- [ ] $X_{(1)}/2$
- [x] $-X_{(1)}/2$
- [ ] $-X_{(n)}/2$
- [ ] $-2\overline{X}$
> All observations are negative. $L = (2\theta)^{-n}$ needs $-2\theta \le x_{(1)}$, i.e.
> $\theta \ge -x_{(1)}/2$; $L$ decreases, so $\hat\theta = -X_{(1)}/2$ (a positive number).

? The density is $\frac1\theta e^{-(x-\mu)/\theta}$ for $x \ge \mu$. A sample gave $5.3, 6.1, 5.0, 7.4, 5.7$. Find the maximum likelihood estimate of $\theta$.
answer: 0.9
> $\hat\mu = x_{(1)} = 5.0$ and $\hat\theta = \bar x - x_{(1)} = 5.9 - 5.0 = 0.9$.

? The law is $P\{X=0\} = \theta$, $P\{X=1\} = 1-2\theta$, $P\{X=2\} = \theta$, and a sample has two 0s, four 1s and four 2s. Find the maximum likelihood estimate of $\theta$.
answer: 3/10
> $L = \theta^6(1-2\theta)^4$; $\frac6\theta - \frac8{1-2\theta} = 0$ gives $\theta = \frac3{10}$.

? (In-class question) Law $\theta^2, 2\theta(1-\theta), \theta^2, 1-2\theta$ on $0, 1, 2, 3$; sample $3, 1, 3, 0, 3, 1, 2, 3$. Find the moment estimate of $\theta$.
answer: 1/4
> $EX = 3 - 4\theta$ and $\bar x = 2$, so $\hat\theta = \frac{3-2}{4} = \frac14$.

? (In-class question, continued) For the same law and sample, find the maximum likelihood estimate of $\theta$.
answer: (7 - sqrt(13))/12
tolerance: 0.5%
> $L = 4\theta^6(1-\theta)^2(1-2\theta)^4$ leads to $12\theta^2 - 14\theta + 3 = 0$, roots
> $\frac{7\pm\sqrt{13}}{12}$. Only $\frac{7-\sqrt{13}}{12} \approx 0.283$ is below $\frac12$,
> as $1 - 2\theta \ge 0$ requires.
:::

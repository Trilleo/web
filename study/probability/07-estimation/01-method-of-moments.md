---
title: Point estimation and the method of moments
zh: 点估计与矩估计法
summary: What parameter estimation is, point versus interval estimates, estimators versus estimates, and the method of moments — replace population moments by sample moments — with the uniform, mean-and-variance and power-density examples.
source: 19点估计11-1 (§7.1), 2026-11-09; 20点估计11-2, 2026-11-11
---

A factory knows its bulbs' lifetimes are exponential, but not the rate; a biologist knows
fish lengths in a lake are roughly normal, but not the mean or the spread. The **form** of
the distribution is known; one or two **numbers** in it are not. Estimating those numbers
from a sample is {{term parameter estimation | 参数估计}}, the first big task of
statistical inference. This lesson sets up the language — point and interval estimates,
estimators and estimates — and the oldest and simplest way to build an estimator, the
method of moments: make the sample's moments equal the population's, and solve. The next
lesson gives a second method, maximum likelihood; later ones say what makes an estimator
good and how to give an interval instead of a single number.

## From sampling distributions to inference

The last unit built the tools: populations and samples, statistics, the $\chi^2$, $t$ and
$F$ distributions, and the sampling distributions of $\bar X$ and $S^2$ (Lessons 6.1–6.3).
Now they are put to work. The picture is a loop: we draw a random sample from the
population, summarise it by a statistic, and use the statistic to say something about
the population.

::: graph The loop of statistical inference
at P: 180, 20
at S: 80, 220
at T: 280, 220
label P: population
label S: sample
label T: statistic
P -> S: sampling
S -> T: summarise
T -> P: infer
:::

How good any such inference is depends entirely on the statistic's **sampling
distribution** (抽样分布): it tells us how far the statistic typically lands from the truth.
That is why the previous unit came first.

## Parameter estimation

{{term Parameter estimation | 参数估计}} uses the information in a sample to estimate
some parameters of the population, or functions of them. Typical questions: the average
weight of newborn babies, the defect rate of a production line, the number of fish in a
lake, the rainfall of a region. In every case we **assume the form of the population's
distribution is known**; only one or a few parameters are unknown.

::: define Parameter estimation | 参数估计
Let the population $X$ have distribution function $F(x;\theta)$ whose form is known, where
$\theta$ is an unknown parameter (possibly a vector, $\theta=(\theta_1,\dots,\theta_k)$).
Using a sample $X_1,\dots,X_n$ from $X$ to estimate $\theta$ is called **parameter
estimation**. It comes in two kinds: {{term point estimation | 点估计}} and
{{term interval estimation | 区间估计}}.
:::

The notation $F(x;\theta)$ means "a distribution function of $x$ that also depends on the
number $\theta$": for $X\sim E(\lambda)$, $F(x;\lambda)=1-e^{-\lambda x}$ for $x>0$.

::: example Point or interval? The heights of a class
Students' heights in a class follow $N(\mu,0.1^2)$ with $\mu$ unknown. A sample of five
gives (in metres) $1.65,\ 1.67,\ 1.68,\ 1.78,\ 1.69$. Everything we know about $\mu$ is in
these five numbers.
== A point estimate ==
"$\mu$ is about $1.68$" gives one number: a point estimate. (The slide uses $1.68$, the
middle value; the sample mean, $8.47/5=1.694$, is the estimate the methods below give.)
== An interval estimate ==
"$\mu$ lies in $[1.57,\ 1.84]$" gives a range: an interval estimate. It is less precise
but can come with a statement of how confident we are (Unit 7's later lessons).
:::

### Estimators and estimates

To estimate $\theta$ we choose a statistic — a formula in the sample — and use its value.
Before the data are in, the formula is a random variable; after, it is a number. The two
get different names.

::: define Point estimator | 点估计量
A statistic $\hat\theta=\hat\theta(X_1,X_2,\dots,X_n)$ constructed to estimate the parameter
$\theta$ is called a **point estimator** of $\theta$. It is a random variable.
:::

::: define Point estimate | 点估计值
For observed values $x_1,\dots,x_n$, the number $\hat\theta(x_1,x_2,\dots,x_n)$ is called a
**point estimate** of $\theta$.
:::

The hat $\hat\theta$ (read "theta hat") marks "an estimate of $\theta$". For convenience the
two are often both just called an {{term estimate | 估计}}, and the context says which is
meant: capital letters $X_i$ for the estimator, small $x_i$ for the estimate. For example
$\bar X$ is an estimator of $\mu$, and $\bar x=1.694$ is an estimate.

::: callout pitfall The estimator is random, the parameter is not
$\theta$ is a fixed (unknown) constant; $\hat\theta$ changes from sample to sample. Writing
"$\theta=\bar X$" mixes the two. Write $\hat\theta=\bar X$.
:::

## The method of moments: the idea

Why should $\bar X$ estimate $\mu$? By the law of large numbers (Lesson 5.1),
$$\bar X=\frac1n\sum_{i=1}^nX_i\xrightarrow{P}\mu:$$
for large $n$ the sample mean is close to the population mean with probability near 1. So
using $\bar X$ for $\mu$ is reasonable.

The British statistician **K. Pearson** (卡尔·皮尔逊) pushed this one step further. The
same law applies to any power: the sample $k$-th origin moment
$a_k=\frac1n\sum X_i^k$ (Lesson 6.1) converges in probability to the population $k$-th
origin moment.

::: formula Sample moments estimate population moments | 样本矩估计总体矩
$$a_k=\frac1n\sum_{i=1}^nX_i^k\xrightarrow{P}EX^k\triangleq\mu_k$$
--
a_k | sample k-th origin moment (样本 k 阶原点矩) |
\mu_k = EX^k | population k-th origin moment (总体 k 阶原点矩) |
\triangleq | "is defined as" |
:::

The population moments are functions of the unknown parameters, while the sample moments
are numbers we can compute. So: write the moments in terms of the parameters, solve for
the parameters, and put sample moments where the population moments were. That is the
{{term method of moments | 矩估计法}}.

## The method of moments: the procedure

Take a continuous population with density $p(x;\theta_1,\dots,\theta_k)$ and $k$ unknown
parameters (for a discrete population replace the integrals by sums).

::: define Method of moments | 矩估计法
1. Express the first $k$ population moments through the parameters:
$$\begin{cases}\mu_1=EX=\displaystyle\int_{-\infty}^{+\infty}x\,p(x;\theta_1,\dots,\theta_k)\,\d x=g_1(\theta_1,\dots,\theta_k)\\ \quad\vdots\\ \mu_k=EX^k=\displaystyle\int_{-\infty}^{+\infty}x^k\,p(x;\theta_1,\dots,\theta_k)\,\d x=g_k(\theta_1,\dots,\theta_k)\end{cases}$$
2. Solve these equations for the parameters:
$\theta_j=h_j(\mu_1,\mu_2,\dots,\mu_k)$, $j=1,\dots,k$.
3. Replace each $\mu_i$ by $a_i=\frac1n\sum X_i^{\,i}$:
$$\hat\theta_j=h_j(a_1,a_2,\dots,a_k),\qquad j=1,\dots,k.$$
The $\hat\theta_j$ are the **moment estimators** (矩估计量) of the $\theta_j$; with observed
values put in, they are the moment estimates (矩估计值).
:::

One parameter needs one equation (usually $\mu_1$); two parameters need two ($\mu_1$ and
$\mu_2$), and so on.

::: callout pitfall Replace μₖ by aₖ — don't "let μₖ = aₖ"
The slide warns that writing "令 $\mu_k=a_k$" is **wrong**: $\mu_k$ is a constant and $a_k$
a random variable, and they are not equal. Solve for the parameter in terms of $\mu_k$
first, then replace $\mu_k$ by $a_k$ (以 $a_k$ 代替 $\mu_k$), and put a hat on the result.
In an exam, write it in exactly that order.
:::

::: callout key The method in one line
Parameter $=h(\text{population moments})$ $\Longrightarrow$ estimator $=h(\text{sample moments})$.
:::

## Examples

::: example Example 1: the uniform distribution U[0, θ]
$X\sim U[0,\theta]$ with $\theta>0$ unknown, and $X_1,\dots,X_n$ is a sample.
(1) Find the moment estimator of $\theta$.
(2) The sample values are $0.3,\ 0.8,\ 0.27,\ 0.35,\ 0.62,\ 0.55$. Find the moment estimate.
== (1) First moment ==
The uniform distribution's mean is the midpoint: $\mu_1=EX=\dfrac\theta2$.
== (1) Solve and replace ==
Solving, $\theta=2\mu_1$. Replacing $\mu_1$ by $a_1=\frac1n\sum X_i=\bar X$, the moment
estimator is
$$\hat\theta=2a_1=2\bar X.$$
== (2) Put in the data ==
$$\bar x=\frac16(0.3+0.8+0.27+0.35+0.62+0.55)=\frac{2.89}6=0.4817,\qquad\hat\theta=2\bar x=0.9633.$$
(The slide prints $0.9634$, from doubling the rounded $0.4817$; either is fine.)
:::

::: plot Example 1: the density of U[0, θ] and its mean θ/2
x: -0.2 .. 2
y: 0 .. 3.5
xlabel: x
ylabel: p(x)
region Density: 0 < x < θ, 0 < y < 1 / θ
slider θ: 0.3 .. 1.8 = 0.9633
:::

Halfway across the shaded box is the mean $\theta/2$; the method reads $\theta$ off as twice
the sample's centre. Notice something odd about this data: twice the mean is $0.9633$, a
plausible right end, since the largest value is $0.8$. But with other data $2\bar x$ could
come out **smaller** than the largest observation, an impossible value for $\theta$. This is
one reason a second method (Lesson 7.2) is needed.

::: example Example 2: the mean and the variance of any population
A population has $EX=\mu$ and $DX=\sigma^2$, both unknown (its distribution need not be
given). Find the moment estimators of $\mu$ and $\sigma^2$.
== Two parameters, two moments ==
$$\begin{cases}\mu_1=EX=\mu\\ \mu_2=EX^2=DX+(EX)^2=\sigma^2+\mu^2\end{cases}$$
== Solve ==
$\mu=\mu_1$ and $\sigma^2=\mu_2-\mu_1^2$.
== Replace ==
$$\hat\mu=a_1=\bar X,\qquad\widehat{\sigma^2}=a_2-a_1^2=\frac1n\sum_{i=1}^nX_i^2-\bar X^2=\frac1n\sum_{i=1}^n(X_i-\bar X)^2=S^{*2}.$$
The last step is the identity $\sum(X_i-\bar X)^2=\sum X_i^2-n\bar X^2$ (Lesson 6.1).
:::

::: formula Moment estimators of the mean and variance | 均值与方差的矩估计
$$\hat\mu=\bar X,\qquad\widehat{\sigma^2}=S^{*2}=\frac1n\sum_{i=1}^n(X_i-\bar X)^2$$
--
\bar X | sample mean |
S^{*2} | sample second central moment (divisor n, not n − 1) |
:::

So for a normal population, $\hat\mu=\bar X$ and $\widehat{\sigma^2}=S^{*2}$; for the class
heights above, $\hat\mu=1.694$ and $\widehat{\sigma^2}=0.002024$.

::: callout pitfall The moment estimator of σ² is S*², not S²
The method gives the divisor $n$. The sample variance $S^2$ (divisor $n-1$) is a different
estimator; the two differ by the factor $\frac{n-1}n$. Which is "better" is the subject of a
later lesson ($ES^2=\sigma^2$ but $ES^{*2}=\frac{n-1}n\sigma^2$, Lesson 6.1).
:::

::: example Example 3: a power density (in-class question 24-032)
The population has density
$$f(x;\alpha)=\begin{cases}(\alpha+1)x^\alpha,&0<x<1,\\0,&\text{otherwise},\end{cases}$$
with $\alpha$ unknown ($\alpha>-1$). Find the moment estimator of $\alpha$ from a sample
$X_1,\dots,X_n$.
== First moment ==
$$\mu_1=EX=\int_0^1x(\alpha+1)x^\alpha\,\d x=(\alpha+1)\int_0^1x^{\alpha+1}\,\d x=\frac{\alpha+1}{\alpha+2}.$$
== Solve for α ==
$\mu_1(\alpha+2)=\alpha+1$, so $\alpha(\mu_1-1)=1-2\mu_1$ and
$$\alpha=\frac{2\mu_1-1}{1-\mu_1}.$$
== Replace ==
$$\hat\alpha=\frac{2\bar X-1}{1-\bar X}.$$
== With numbers ==
If a sample has $\bar x=0.75$, then $\hat\alpha=\frac{1.5-1}{0.25}=2$: the density
$3x^2$, whose mean is indeed $\frac34$.
:::

The plot shows the density for different $\alpha$ and its mean $\frac{\alpha+1}{\alpha+2}$ as a
vertical band: larger $\alpha$ piles the mass near 1 and pushes the mean right. The method
of moments turns that around — from where the sample's mean is, it reads off $\alpha$.

::: plot Example 3: the density (α + 1)x^α and its mean
x: 0 .. 1
y: 0 .. 5
xlabel: x
f(x) = (α + 1) x^α
region Mean: abs(x - (α + 1)/(α + 2)) < 0.005, 0 < y < 5
slider α: -0.5 .. 4 = 2
:::

::: explore From the sample mean to α̂
slider m: 0.05 .. 0.95 = 0.75 | | sample mean x̄
alpha = (2 m - 1) / (1 - m) | | Moment estimate α̂
:::

(Below $\bar x=0.5$ the estimate is negative: a density decreasing in $x$.)

::: example Example 4: the exponential distribution (own example)
Lifetimes of a component follow $E(\lambda)$, density $\lambda e^{-\lambda x}$ for $x>0$.
Four components last $2,\ 5,\ 1,\ 4$ hours. Estimate $\lambda$ by the method of moments.
== First moment ==
$\mu_1=EX=\dfrac1\lambda$ (Lesson 4.1), so $\lambda=\dfrac1{\mu_1}$.
== Replace ==
$\hat\lambda=\dfrac1{\bar X}$.
== Data ==
$\bar x=\frac{12}4=3$, so $\hat\lambda=\frac13$ per hour.
:::

## Strengths and weaknesses

::: callout summary Advantages and disadvantages
**Advantages:** the method is simple, and it does not need to know what distribution the
population has — Example 2 estimated $\mu$ and $\sigma^2$ of an unknown population.
**Disadvantages:** when the type of distribution *is* known, the method does not make full
use of the information it provides; and in general the moment estimator is **not unique**.
:::

Non-uniqueness is easy to see. Different moments can lead to different estimators of the
same parameter:

::: example Example 5: two moment estimators of one parameter (own example)
(1) $X\sim P(\lambda)$, Poisson. Both $EX=\lambda$ and $DX=\lambda$.
(2) $X\sim U[0,\theta]$ with the data of Example 1.
== (1) Poisson ==
From $\mu_1=\lambda$: $\hat\lambda=\bar X$. From $\mu_2-\mu_1^2=DX=\lambda$:
$\hat\lambda=a_2-a_1^2=S^{*2}$. Both are moment estimators of $\lambda$, and they usually
give different numbers.
== (2) Uniform, second moment ==
$EX^2=\int_0^\theta x^2\frac1\theta\,\d x=\frac{\theta^2}3$, so $\theta=\sqrt{3\mu_2}$ and
$\hat\theta=\sqrt{3a_2}$. With Example 1's data, $a_2=0.26872$ and
$\hat\theta=\sqrt{0.80615}=0.898$ — not the $0.963$ from the first moment.
== The rule in practice ==
Use the lowest moments that are enough: one parameter, the first moment (unless it
doesn't involve the parameter, as for $N(0,\sigma^2)$, where $EX=0$ and one uses $EX^2$).
:::

::: callout exam What exams ask
"Find the moment estimator of $\theta$" (often followed by "and its maximum likelihood
estimator", Lesson 7.2) for a density or distribution law with one or two parameters:
compute $EX$ (and $EX^2$), solve, replace, and finish with a hat. Then sometimes "find the
estimate for these data". Show the replacement step in words; writing "$\mu_1=\bar X$"
loses marks.
:::

::: cards Point estimation and the method of moments
Parameter estimation :: Using a sample to estimate unknown parameters of a population whose distribution's **form** is known.
Point vs interval estimation :: A point estimate is one number for $\theta$; an interval estimate is a range believed to contain $\theta$.
Point estimator :: A statistic $\hat\theta(X_1,\dots,X_n)$ used to estimate $\theta$; a random variable.
Point estimate :: The number $\hat\theta(x_1,\dots,x_n)$ for observed data.
Why sample moments estimate population moments :: Law of large numbers: $a_k=\frac1n\sum X_i^k\xrightarrow{P}EX^k=\mu_k$.
Who proposed the method of moments? :: The British statistician K. Pearson.
Steps of the method of moments :: Write $\mu_j=g_j(\theta)$; solve $\theta_j=h_j(\mu_1,\dots,\mu_k)$; replace $\mu_i$ by $a_i$: $\hat\theta_j=h_j(a_1,\dots,a_k)$.
Wrong way to write the method :: "Let $\mu_k=a_k$": a constant can't equal a random variable. Replace $\mu_k$ by $a_k$.
Moment estimator for U[0, θ] :: $\hat\theta=2\bar X$, from $EX=\theta/2$.
Moment estimators of μ and σ² :: $\hat\mu=\bar X$, $\widehat{\sigma^2}=a_2-a_1^2=S^{*2}$ (divisor $n$).
Moment estimator for density $(\alpha+1)x^\alpha$ on (0, 1) :: $EX=\frac{\alpha+1}{\alpha+2}$, so $\hat\alpha=\frac{2\bar X-1}{1-\bar X}$.
Moment estimator for E(λ) :: $\hat\lambda=1/\bar X$.
Advantages of the method of moments :: Simple; doesn't need the population's distribution.
Disadvantages of the method of moments :: Doesn't use all the information when the distribution type is known; generally not unique.
:::

::: quiz Point estimation and the method of moments
? (In-class question 24-032) The density is $(\alpha+1)x^\alpha$ on $(0,1)$. Give the moment estimator $\hat\alpha$ in terms of the sample mean (type $m$ for $\bar X$).
expression: (2 m - 1) / (1 - m)
variables: m
> $EX=\int_0^1(\alpha+1)x^{\alpha+1}\,\d x=\frac{\alpha+1}{\alpha+2}$. Solving
> $\mu_1=\frac{\alpha+1}{\alpha+2}$ for $\alpha$ gives $\alpha=\frac{2\mu_1-1}{1-\mu_1}$; replace
> $\mu_1$ by $\bar X$.

? $X\sim U[0,\theta]$ and the sample is $0.3,\ 0.8,\ 0.27,\ 0.35,\ 0.62,\ 0.55$. Find the moment estimate of $\theta$.
answer: 2 * 2.89 / 6
> $\bar x=2.89/6=0.4817$ and $\hat\theta=2\bar x=0.9633$ (the slide's $0.9634$ rounds
> $\bar x$ first).

? A population has unknown mean $\mu$ and variance $\sigma^2$. The moment estimator of $\sigma^2$ is
- [ ] $S^2=\frac1{n-1}\sum(X_i-\bar X)^2$
- [x] $\frac1n\sum(X_i-\bar X)^2$
- [ ] $\frac1n\sum X_i^2$
- [ ] $\bar X^2$
> $\sigma^2=\mu_2-\mu_1^2$, so $\widehat{\sigma^2}=a_2-a_1^2=\frac1n\sum X_i^2-\bar X^2=\frac1n\sum(X_i-\bar X)^2=S^{*2}$,
> divisor $n$.

? Which is the correct way to write the step of the method of moments?
- [ ] Let $\mu_1=a_1$, so $\theta=2a_1$
- [x] Solve $\theta=2\mu_1$, then replace $\mu_1$ by $a_1$: $\hat\theta=2a_1$
- [ ] $\theta=2\bar X$
- [ ] $\mu_1=\bar X$, so $\theta=2\bar X$
> $\mu_1$ is a constant and $a_1$ a random variable, so "let $\mu_1=a_1$" is wrong (the slide
> says so); and the result is an estimator, $\hat\theta$, not $\theta$ itself.

? A sample from the density $(\alpha+1)x^\alpha$, $0<x<1$, has mean $\bar x=0.75$. Find the moment estimate of $\alpha$.
answer: 2
> $\hat\alpha=\frac{2(0.75)-1}{1-0.75}=\frac{0.5}{0.25}=2$.

? Lifetimes follow $E(\lambda)$ (mean $1/\lambda$). Four lifetimes are $2, 5, 1, 4$ hours. Find the moment estimate of $\lambda$.
answer: 1/3
> $\bar x=3$ and $\hat\lambda=1/\bar x=1/3$.

? The heights $1.65,\ 1.67,\ 1.68,\ 1.78,\ 1.69$ come from $N(\mu,\sigma^2)$. Find the moment estimate of $\mu$.
answer: 1.694
> $\hat\mu=\bar x=8.47/5=1.694$.

? Which are disadvantages of the method of moments?
- [x] When the distribution type is known, it doesn't make full use of that information
- [x] The moment estimator is in general not unique
- [ ] It needs the population's distribution to be known
- [ ] It only works for discrete populations
> The method needs only moments, not the distribution — that's an advantage. It works for
> discrete and continuous populations alike. Its weaknesses are the other two: it ignores
> the rest of a known distribution, and different moments give different estimators (for
> Poisson, $\bar X$ and $S^{*2}$ both estimate $\lambda$).

? A statistic $\hat\theta(X_1,\dots,X_n)$ used to estimate $\theta$ is called a point ______ (one word); its value on the data is a point estimate.
text: estimator | 估计量 | 点估计量
> The estimator (估计量) is the random formula; the estimate (估计值) is its value for observed
> data. Both are often just called the estimate (估计).

? Who first proposed the method of moments?
- [x] K. Pearson
- [ ] R. A. Fisher
- [ ] C. F. Gauss
- [ ] P. L. Chebyshev
> The method of moments is K. Pearson's. Gauss (1821) and Fisher (1922) are linked with
> maximum likelihood, the next lesson's method.
:::

---
title: Populations, samples and statistics
zh: 总体、样本与统计量
summary: What mathematical statistics asks, populations and simple random samples, the sample's joint distribution, statistics such as the sample mean, sample variance, moments, order statistics, median and range, and the mean and variance of X̄ and S².
source: 17三大分布10-1 (§6.1), 2026-11-03; 18统计量及抽样分布10-2 (§6.4), 2026-11-04
---

Everything so far has run in one direction: we were **given** a distribution — $B(n,p)$,
$N(\mu,\sigma^2)$, a density — and worked out probabilities from it. Real life runs the
other way. A factory doesn't know what fraction $p$ of its products are faulty; an
engineer doesn't know the lifetime distribution of a new component. What they have is
**data**: a handful of measured items. {{term Mathematical statistics | 数理统计}} is the
art of reasoning backwards, from a small, random set of observations to the distribution
that produced them. This lesson sets up the language for the rest of the course:
populations, samples, and statistics — the numbers we compute from samples, above all
the sample mean $\bar X$ and the sample variance $S^2$. The facts $E\bar X = \mu$,
$D\bar X = \sigma^2/n$ and $ES^2 = \sigma^2$ at the end of the lesson are used in almost
every later chapter, so the lecture asks you to memorise them.

Expectation $E$ and variance $D$, with their rules ($E$ of a sum is the sum of the $E$'s,
$D$ of a sum of independent variables is the sum of the $D$'s, $DX = EX^2 - (EX)^2$), come
from Lessons 4.1–4.3; the law of large numbers ("averages settle down to the mean") from Lesson 5.1.

## What statistics asks

The lecture opens with two problems that probability alone can't answer.

**Example 6.1.** Pick one product at random from a batch. Let $X = 1$ if it is faulty and
$X = 0$ if it passes. Then $X$ has a two-point distribution:

$$\begin{array}{c|cc} X & 0 & 1 \\ \hline p_k & 1-p & p \end{array}$$

but nobody tells us $p$. (1) How can we find $p$, at least approximately? (2) Experience
suggests "$p < 0.05$". Should we accept or reject that claim, and by what method?

**Example 6.2.** The lifetime $X$ of an electronic component is a random variable whose
distribution function $F(x)$ (or density $p(x)$) is unknown. (1) How can we find $F(x)$
approximately? (2) If someone suggests that $X$ is exponential, should we believe it?
(3) If we only need $EX$ and $DX$, how do we estimate them?

Question (1) in each example is **estimation** (Unit 7), question (2) is **hypothesis
testing** (Unit 8). Both have the same shape: we can't watch the random phenomenon
infinitely often — then its regularities would show perfectly — so we observe it a
limited number of times and must draw the most accurate and reliable conclusion those
limited data allow. Statistics studies how to collect, organise and analyse random data
efficiently, in order to make inferences and predictions. Its method is "the part
tells us about the whole" (部分推断整体): we observe a part (a sample) and infer the
whole (the population).

## Populations

::: define Population | 总体
The whole collection of objects under study is the **population** (also 母体). Each object
in it is an {{term individual | 个体}}. A population with finitely many individuals is a
{{term finite population | 有限总体}}; one with infinitely many is an
{{term infinite population | 无限总体}}.
:::

Two of the lecture's examples:

- Surveying the heights of university students in Guangzhou: the population is the
  heights of all the city's students, an individual is one student's height. This is a
  **finite** population.
- Measuring the temperature all over a seedling greenhouse: the population is the
  temperatures at every point of the room, an individual is the temperature at one
  point. There are infinitely many points, so the population is **infinite**.

What counts as the population and what as an individual is not fixed: it depends on the
question being asked.

Now the key step. We never care about a light bulb as a lump of glass; we care about one
**number** attached to it — its lifetime. So the population "a batch of light bulbs"
really means "the lifetimes of all the bulbs in the batch". If we pick a bulb at random,
its lifetime is a random variable $X$, and the way lifetimes are spread through the batch
is exactly the distribution of $X$ (an exponential distribution, perhaps). That is why
statisticians say **"the population $X$"** and treat a population and a probability
distribution as the same thing.

::: callout key A population is a probability distribution
The heart of the idea (总体就是一个概率分布): a population is described by a random
variable $X$ and its distribution. "Population $N(\mu,\sigma^2)$" means the measured
quantity, for an individual picked at random, is $N(\mu,\sigma^2)$. Statistics is about
learning that distribution, or its unknown parameters, from data.
:::

## Samples

The population's distribution is usually unknown, or known only up to some unknown
parameters (we may believe it is normal, but not know $\mu$ and $\sigma$). To learn about
it we draw some individuals by a fixed rule and observe them. That process is
{{term sampling | 抽样}}.

::: define Sample | 样本
Drawing $n$ individuals from the population $X$ by some rule gives a **sample**, written
$(X_1, X_2, \cdots, X_n)$. The number $n$ is the {{term sample size | 样本容量}}. Before the
draw each $X_i$ is a random variable; after the draw the sample is a list of numbers
$(x_1, x_2, \cdots, x_n)$, the {{term observed sample values | 样本观测值}} (样本值).
:::

Capital letters for the random sample, small letters for the numbers it turned out to
be: the same convention as $X$ and $x$ in $P\{X \le x\}$.

Two common ways to draw:

1. {{term Sampling without replacement | 不重复抽样}} (不放回抽样): draw one, don't put it
   back, draw the next, $n$ times.
2. {{term Sampling with replacement | 重复抽样}} (有放回抽样): draw one, observe it, put it
   back, draw the next, $n$ times.

For an infinite population, or a finite one with very many individuals, putting one back
or not hardly changes the next draw, so the two methods are practically the same.

### Simple random samples

For the sample to tell us about the population fairly, we want two things:

1. **Representative** (代表性): each $X_i$ has the same distribution as the population
   $X$ — no individual is favoured.
2. **Independent** (独立性): $X_1, X_2, \ldots, X_n$ are mutually independent — one draw
   doesn't influence another.

::: define Simple random sample | 简单随机样本
A sample $X_1, X_2, \ldots, X_n$ from the population $X$ is a **simple random sample** if
the $X_i$ are mutually independent and each has the same distribution as $X$. In short:
**independent and identically distributed as the population** (独立与总体同分布; "i.i.d.").
:::

Sampling with replacement gives a simple random sample exactly; sampling without
replacement from a large population gives one approximately. From now on, "a sample" means
a simple random sample unless something else is said.

### The sample's joint distribution

Since the $X_i$ are independent and each has the population's distribution, the joint
distribution of the whole sample is a product — independence turns "and" into
multiplication (Lesson 3.5).

::: formula Joint distribution of a sample | 样本的联合分布
$$F(x_1, x_2, \cdots, x_n) = F(x_1)F(x_2)\cdots F(x_n) = \prod_{i=1}^{n} F(x_i), \qquad p(x_1, x_2, \cdots, x_n) = \prod_{i=1}^{n} p(x_i)$$
--
F(x) | the population's distribution function |
p(x) | the population's density (continuous population) |
(X_1, \cdots, X_n) | a simple random sample from the population |
:::

For a discrete population the same holds for the distribution law:
$P\{X_1 = x_1, \ldots, X_n = x_n\} = \prod P\{X = x_i\}$.

::: example Joint distributions of two samples
(1) The population is exponential, $X \sim E(\lambda)$ with density $p(x) = \lambda e^{-\lambda x}$
for $x > 0$. Write down the joint density of a sample $X_1, \ldots, X_n$.
(2) The population is the two-point distribution of Example 6.1. Find the probability
that the sample takes the values $x_1, \ldots, x_n$ (each 0 or 1).
== (1) Multiply the densities ==
$$p(x_1, \ldots, x_n) = \prod_{i=1}^{n} \lambda e^{-\lambda x_i} = \lambda^n e^{-\lambda \sum_{i=1}^{n} x_i}$$
when every $x_i > 0$, and $0$ otherwise (if any $x_i \le 0$, its factor is 0).
== (2) Multiply the probabilities ==
$P\{X = x\} = p^x (1-p)^{1-x}$ for $x = 0, 1$, so
$$P\{X_1 = x_1, \ldots, X_n = x_n\} = \prod_{i=1}^{n} p^{x_i}(1-p)^{1-x_i} = p^{\sum x_i}(1-p)^{n - \sum x_i}.$$
It depends only on how many 1s (faulty items) the sample contains. Formulas like these
are the starting point of maximum likelihood estimation in Unit 7.
:::

## Statistics

Data on their own are a jumble of numbers; to use them we boil them down — average them,
spread them, sort them. Any such summary is a statistic, as long as we can actually
compute it from the data.

::: define Statistic | 统计量
Let $X_1, X_2, \cdots, X_n$ be a sample of size $n$ from the population $X$. A continuous
function $T(X_1, X_2, \cdots, X_n)$ of the sample that **does not depend on any unknown
parameter** is a **statistic**.
:::

A statistic is a function of random variables, so it is itself a **random variable**:
take another sample and you get another value. Once the sample has been observed,
$T(x_1, \ldots, x_n)$ is just a number, the statistic's observed value. The distribution of
a statistic is called its {{term sampling distribution | 抽样分布}}; Lessons 6.2 and 6.3 are
about those.

"No unknown parameter" is the whole test: you must be able to compute it from the data
alone. A parameter that is **known** is fine.

::: example Example 1: which are statistics?
$X_1, \ldots, X_n$ is a sample from the normal population $N(\mu, \sigma^2)$, where $\mu$ is
**known** and $\sigma^2$ is **unknown**. Which of these are statistics?
(1) $\frac13\sum_{i=1}^{n} X_i$; (2) $\frac{1}{\sigma^2}\sum_{i=1}^{4}(X_i - \bar X)^2$ with
$\bar X = \frac14\sum_{i=1}^{4} X_i$; (3) $\sum_{i=1}^{5} X_i^2$; (4) $\sum_{i=1}^{5}(X_i - \mu)^2$;
(5) $\max\{X_1, \ldots, X_n\}$.
== Check each for unknown parameters ==
- (1) Only the data and the number $\frac13$: **a statistic** (an odd one, but nothing
  says a statistic has to be useful).
- (2) Contains the unknown $\sigma^2$: **not a statistic**.
- (3) Only the data: **a statistic**.
- (4) Contains $\mu$, but $\mu$ is known: **a statistic**.
- (5) The largest observation: **a statistic** (an order statistic, below).
== Answer ==
All except (2).
:::

::: callout pitfall Known parameters are allowed
Students often reject anything with a $\mu$ or $\sigma$ in it. The rule is about
**unknown** parameters: with $\mu$ known, $\sum (X_i - \mu)^2$ is a statistic; with $\mu$
unknown, it isn't. Read which parameters the question says are known.
:::

## The common statistics

From here on $X_1, \ldots, X_n$ is a simple random sample from a population $X$ with
$EX = \mu$ and $DX = \sigma^2$.

### The sample mean

::: define Sample mean | 样本均值
$$\bar X = \frac1n \sum_{i=1}^{n} X_i.$$
:::

The sample mean carries the information about the population mean. By the law of large
numbers (Lesson 5.1), $\bar X \xrightarrow{P} \mu$: for a large sample, $\bar X$ is close to
$\mu$ with probability close to 1. That is why we will estimate $\mu$ by $\bar X$.

### The sample variance

To measure spread we look at each observation's distance from the centre, square it and
average — but the average is taken with $n - 1$, not $n$, in the denominator. The reason
comes at the end of this lesson ($ES^2 = \sigma^2$ exactly).

::: define Sample variance | 样本方差
$$S^2 = \frac{1}{n-1}\sum_{i=1}^{n}(X_i - \bar X)^2;$$
its square root $S = \sqrt{S^2}$ is the {{term sample standard deviation | 样本标准差}}.
:::

Squaring out each bracket gives a form that is much quicker to compute by hand — the
lecture says to remember it (记住表达式).

::: formula Sample variance and its computing form | 样本方差
$$S^2 = \frac{1}{n-1}\sum_{i=1}^{n}(X_i - \bar X)^2 = \frac{1}{n-1}\left(\sum_{i=1}^{n} X_i^2 - n\bar X^2\right)$$
--
\bar X | sample mean |
n - 1 | the divisor (not n) |
S = \sqrt{S^2} | sample standard deviation |
:::

::: example Proof of the computing form
Show that $\sum_{i=1}^{n}(X_i - \bar X)^2 = \sum_{i=1}^{n} X_i^2 - n\bar X^2$.
== Square out ==
$$\sum_{i=1}^{n}(X_i - \bar X)^2 = \sum_{i=1}^{n}\left(X_i^2 - 2X_i\bar X + \bar X^2\right) = \sum_{i=1}^{n} X_i^2 - 2\bar X\sum_{i=1}^{n} X_i + n\bar X^2.$$
($\bar X$ is the same in every term, so it comes out of the sum; $\sum \bar X^2 = n\bar X^2$.)
== Use ΣXᵢ = nX̄ ==
$$= \sum_{i=1}^{n} X_i^2 - 2n\bar X^2 + n\bar X^2 = \sum_{i=1}^{n} X_i^2 - n\bar X^2.$$
Dividing by $n - 1$ gives the formula for $S^2$.
:::

Writing $S^2 = \frac{n}{n-1}\left(\frac1n\sum X_i^2 - \bar X^2\right)$ shows why it carries the
information about $\sigma^2$: by the law of large numbers
$\frac1n\sum X_i^2 \xrightarrow{P} EX^2$ and $\bar X \xrightarrow{P} \mu$, while
$\frac{n}{n-1} \to 1$, so $S^2 \xrightarrow{P} EX^2 - \mu^2 = \sigma^2$.

::: example In-class question: sample variance from two sums
A sample $X_1, \ldots, X_9$ has observed values with $\sum_{i=1}^{9} x_i = 45$ and
$\sum_{i=1}^{9} x_i^2 = 285$. Find the observed sample variance.
== Mean ==
$\bar x = 45/9 = 5$.
== Sum of squared deviations ==
$\sum (x_i - \bar x)^2 = \sum x_i^2 - n\bar x^2 = 285 - 9 \cdot 25 = 60$.
== Divide by n − 1 ==
$s^2 = 60/8 = 7.5$ (answer A). The distractors are 60 (forgot to divide) and other wrong
divisors.
:::

Try other sums: the explorer works out $\bar x$, $s^2$ and the second central moment
$s^{*2}$ (defined just below) from $n$, $\sum x_i$ and $\sum x_i^2$.

::: explore From the sums to x̄, s² and s*²
slider n: 2 .. 30 = 9 | | sample size
slider Sx: 0 .. 200 = 45 | | sum of the xᵢ
slider Sxx: 0 .. 2000 = 285 | | sum of the xᵢ²
xbar = Sx / n | | Sample mean x̄
ss = Sxx - n (Sx / n)^2 | | Σ(xᵢ − x̄)²
s2 = (Sxx - n (Sx / n)^2) / (n - 1) | | Sample variance s²
sstar2 = (Sxx - n (Sx / n)^2) / n | | Second central moment s*²
:::

(If $\sum (x_i - \bar x)^2$ comes out negative, those sums can't come from real data.)

### Sample moments

The mean and variance are the first two of a family. Recall the population's $k$-th
moment $EX^k$ (Lesson 4.4); its sample version averages the $k$-th powers of the data.

::: define Sample moments | 样本矩
The {{term sample k-th origin moment | 样本 k 阶原点矩}} and
{{term sample k-th central moment | 样本 k 阶中心矩}} are
$$a_k = \frac1n\sum_{i=1}^{n} X_i^k, \qquad A_k = \frac1n\sum_{i=1}^{n}(X_i - \bar X)^k.$$
In particular $a_1 = \bar X$, and the
{{term sample second central moment | 样本二阶中心矩}} is
$$S^{*2} = A_2 = \frac1n\sum_{i=1}^{n}(X_i - \bar X)^2 = \frac1n\left(\sum_{i=1}^{n} X_i^2 - n\bar X^2\right).$$
:::

$a_k$ carries the information about $EX^k$: by the law of large numbers
$a_k \xrightarrow{P} EX^k$. That is the idea behind the method of moments in Unit 7.

$S^{*2}$ and $S^2$ differ only in the divisor, $n$ against $n - 1$:

::: formula Sample moments and S*² | 样本矩
$$a_k = \frac1n\sum_{i=1}^{n} X_i^k, \qquad A_k = \frac1n\sum_{i=1}^{n}(X_i - \bar X)^k, \qquad S^{*2} = \frac{n-1}{n}S^2$$
--
a_k | sample k-th origin moment (a_1 is the sample mean) |
A_k | sample k-th central moment |
S^{*2} = A_2 | sample second central moment, divisor n |
S^2 | sample variance, divisor n − 1 |
:::

Like $S^2$, $S^{*2} = \frac1n\sum X_i^2 - \bar X^2 \xrightarrow{P} EX^2 - \mu^2 = \sigma^2$:
for large samples the two are almost the same.

::: callout pitfall S² or S*²?
In this course $S^2$ always has $n - 1$ in the denominator and $S^{*2}$ has $n$. Many
exam questions turn on that difference (a $t$ statistic with $\sqrt n$ or $\sqrt{n-1}$,
Lesson 6.3). Calculators and some books call the $n$ version "the variance" — be careful
which one a question means.
:::

### Order statistics, median and range

Another way to summarise data: sort them.

::: define Order statistics | 顺序统计量
Sort the observed values from smallest to largest, $x_{(1)} \le x_{(2)} \le \cdots \le x_{(n)}$.
Let $X_{(i)}$ be the random variable that, whatever values the sample takes, takes the
value $x_{(i)}$ — the $i$-th smallest. Then $X_{(1)} \le X_{(2)} \le \cdots \le X_{(n)}$, and
$X_{(i)}$ is the **$i$-th order statistic**. In particular
$$X_{(1)} = \min_{1 \le i \le n} X_i \ \ (\text{the smallest}), \qquad X_{(n)} = \max_{1 \le i \le n} X_i \ \ (\text{the largest}).$$
:::

Note that $X_{(1)}, \ldots, X_{(n)}$ are **not** independent (they are forced into order),
even though $X_1, \ldots, X_n$ are. The distributions of the maximum and minimum were
worked out in Lesson 3.8.

::: define Sample median and range | 样本中位数与极差
The {{term sample median | 样本中位数}} is the middle of the sorted sample,
$$M = \begin{cases} X_{\left(\frac{n+1}{2}\right)}, & n \text{ odd},\\[4pt] \dfrac12\left(X_{\left(\frac n2\right)} + X_{\left(\frac n2 + 1\right)}\right), & n \text{ even};\end{cases}$$
the {{term sample range | 样本极差}} is $R = X_{(n)} - X_{(1)}$.
:::

::: callout note The median for even n
The slide writes the even case as $\frac12\big(X_{(n/2)} + X_{((n+1)/2)}\big)$. For even $n$,
$\frac{n+1}{2}$ isn't a whole number; the second index should be $\frac n2 + 1$, as above:
the median of an even number of values is the average of the two middle ones.
:::

::: example All the common statistics on one data set
Eight observations: $4, 7, 2, 9, 5, 3, 6, 4$. Find $\bar x$, $s^2$, $s^{*2}$, $a_2$, the order
statistics, the median and the range.
== Mean ==
$\sum x_i = 40$, so $\bar x = 40/8 = 5$.
== Second moments ==
$\sum x_i^2 = 16 + 49 + 4 + 81 + 25 + 9 + 36 + 16 = 236$, so $a_2 = 236/8 = 29.5$ and
$\sum (x_i - \bar x)^2 = 236 - 8 \cdot 25 = 36$.
== Variances ==
$s^2 = 36/7 \approx 5.143$ and $s^{*2} = 36/8 = 4.5$ (which is also $a_2 - \bar x^2 = 29.5 - 25$).
== Sort ==
$x_{(1)}, \ldots, x_{(8)} = 2, 3, 4, 4, 5, 6, 7, 9$.
== Median and range ==
$n = 8$ is even: $M = \frac12(x_{(4)} + x_{(5)}) = \frac12(4 + 5) = 4.5$. The range is
$R = 9 - 2 = 7$.
:::

## The mean and variance of X̄ and S²

How good are $\bar X$ and $S^2$ as guides to $\mu$ and $\sigma^2$? Since they are random
variables, we can ask for their own expectations and variances. The lecture calls these
results supplementary but very important — memorise them.

::: theorem Numerical characteristics of X̄, S² and S*² | 统计量的数字特征
Let $X_1, \ldots, X_n$ be a simple random sample from a population with $EX = \mu$ and
$DX = \sigma^2$. Then
$$E\bar X = EX = \mu, \qquad D\bar X = \frac{DX}{n} = \frac{\sigma^2}{n},$$
$$ES^2 = DX = \sigma^2, \qquad ES^{*2} = \frac{n-1}{n}\sigma^2.$$
:::

::: formula Mean and variance of the sample mean and variance | 样本均值与样本方差的数字特征
$$E\bar X = \mu, \quad D\bar X = \frac{\sigma^2}{n}, \quad ES^2 = \sigma^2, \quad ES^{*2} = \frac{n-1}{n}\sigma^2$$
--
\mu = EX | population mean |
\sigma^2 = DX | population variance |
n | sample size |
:::

Read them in words. On average, $\bar X$ hits $\mu$ exactly, and its variance shrinks like
$1/n$: four times the data halves the standard deviation of $\bar X$. On average $S^2$ hits
$\sigma^2$ exactly — that is the reason for the $n - 1$ — while $S^{*2}$ falls short by the
factor $\frac{n-1}{n}$. (In Unit 7's language, $\bar X$ and $S^2$ are **unbiased**, $S^{*2}$
is biased.)

::: example Proof for X̄
== Expectation ==
$E$ is linear and each $EX_i = \mu$:
$E\bar X = \frac1n\sum_{i=1}^{n} EX_i = \frac1n \cdot n\mu = \mu$.
== Variance ==
The $X_i$ are independent, so the variance of the sum is the sum of the variances, and a
constant factor comes out squared:
$$D\bar X = \frac{1}{n^2}\sum_{i=1}^{n} DX_i = \frac{1}{n^2} \cdot n\sigma^2 = \frac{\sigma^2}{n}.$$
:::

::: example Proof that ES² = σ²
== Two second moments ==
From $DY = EY^2 - (EY)^2$:
$$EX_i^2 = DX_i + (EX_i)^2 = \sigma^2 + \mu^2, \qquad E\bar X^2 = D\bar X + (E\bar X)^2 = \frac{\sigma^2}{n} + \mu^2.$$
== The sum of squared deviations ==
Use the computing form:
$$\begin{aligned} E\left[\sum_{i=1}^{n}(X_i - \bar X)^2\right] &= E\left[\sum_{i=1}^{n} X_i^2 - n\bar X^2\right] = \sum_{i=1}^{n} EX_i^2 - nE\bar X^2 \\ &= n(\sigma^2 + \mu^2) - n\left(\frac{\sigma^2}{n} + \mu^2\right) = (n-1)\sigma^2. \end{aligned}$$
== Divide ==
$ES^2 = \frac{1}{n-1}(n-1)\sigma^2 = \sigma^2$.
== And S*² ==
$S^{*2} = \frac{n-1}{n}S^2$, so $ES^{*2} = \frac{n-1}{n}ES^2 = \frac{n-1}{n}\sigma^2$.
:::

The proof shows where the $n - 1$ comes from: measuring deviations from $\bar X$ instead of
the true $\mu$ loses exactly one $\sigma^2$ ($nE\bar X^2$ contributes $\sigma^2$, not 0). Lesson
6.2 meets the same "$n - 1$" again as a number of degrees of freedom.

The explorer shows the bias of $S^{*2}$: it matters for small samples and fades as $n$
grows.

::: explore The average of S² and S*²
slider σ2: 0.1 .. 10 = 4 | | population variance σ²
slider n: 2 .. 50 = 5 | | sample size
ES2 = σ2 | | E S²
ESstar2 = (n - 1) / n σ2 | | E S*²
bias = -σ2 / n | | Bias of S*²
DXbar = σ2 / n | | Variance of X̄
:::

For a normal population, $\bar X$ is again normal (Lesson 6.3 proves it), with mean $\mu$
and variance $\sigma^2/n$. The plot shows the population's density (grey) and that of
$\bar X$: move $n$ and watch the sample mean pile up around $\mu$.

::: plot Population N(μ, σ²) and the sample mean X̄ ~ N(μ, σ²/n)
x: -6 .. 6
xlabel: x
f(x) = e^(-(x - μ)^2 n / (2 σ^2)) sqrt(n) / (sqrt(2 pi) σ)
g(x) = e^(-(x - μ)^2 / (2 σ^2)) / (sqrt(2 pi) σ)
slider μ: -3 .. 3 = 0
slider σ: 0.5 .. 3 = 1.5
slider n: 1 .. 30 = 4 | | step 1
:::

::: example Example 2: a χ² population
$X_1, \ldots, X_n$ is a simple random sample from a population with the $\chi^2(n)$
distribution. Find $E\bar X$, $D\bar X$ and $E(S^2)$.
== The population's mean and variance ==
A $\chi^2(n)$ variable has $EX = n$ and $DX = 2n$ (Lesson 6.2 defines $\chi^2(n)$ and proves
this).
== Apply the theorem ==
$$E\bar X = EX = n, \qquad D\bar X = \frac{DX}{n} = \frac{2n}{n} = 2, \qquad ES^2 = DX = 2n.$$
:::

::: example In-class question: a (0–1) population
$X_1, \ldots, X_n$ is a simple random sample from the (0–1) distribution,
$P\{X = 0\} = 1 - p$, $P\{X = 1\} = p$. Find $E(\bar X)$, $D(\bar X)$ and $E(S^2)$.
== The population ==
$EX = 0 \cdot (1-p) + 1 \cdot p = p$, and $EX^2 = p$ too (since $X^2 = X$), so
$DX = p - p^2 = p(1-p)$.
== Apply the theorem ==
$$E\bar X = p, \qquad D\bar X = \frac{p(1-p)}{n}, \qquad ES^2 = p(1-p).$$
Here $\bar X$ is the fraction of faulty items in the sample: on average it is the true $p$
— the answer to Example 6.1's first question.
:::

::: callout exam What exams ask
Fill-in-the-blank questions like Example 2 and the (0–1) question: given the population
(binomial, Poisson, uniform, exponential, normal, $\chi^2$), write down $E\bar X$, $D\bar X$,
$ES^2$ — find $EX$ and $DX$ first, then use the theorem. Also: computing $s^2$ from
$\sum x_i$ and $\sum x_i^2$ (don't forget the $n - 1$), deciding which expressions are
statistics, and "a simple random sample is independent and identically distributed".
:::

::: callout summary The lesson in four lines
A population is a distribution $X$; a simple random sample is $X_1, \ldots, X_n$ i.i.d. as
$X$, with joint density $\prod p(x_i)$. A statistic is a function of the sample without
unknown parameters. $\bar X = \frac1n\sum X_i$, $S^2 = \frac1{n-1}\left(\sum X_i^2 - n\bar X^2\right)$,
$S^{*2} = \frac{n-1}{n}S^2$. $E\bar X = \mu$, $D\bar X = \sigma^2/n$, $ES^2 = \sigma^2$,
$ES^{*2} = \frac{n-1}{n}\sigma^2$.
:::

::: cards Populations, samples and statistics
Population in mathematical statistics :: A probability distribution: the random variable $X$ (a measured quantity of a randomly chosen individual) and its distribution.
Simple random sample :: $X_1, \ldots, X_n$ mutually independent, each with the population's distribution (i.i.d.).
Joint density of a sample from density p(x) :: $p(x_1, \ldots, x_n) = \prod_{i=1}^{n} p(x_i)$; likewise $F(x_1, \ldots, x_n) = \prod F(x_i)$.
Statistic :: A continuous function of the sample containing no unknown parameter; a random variable, a number once the sample is observed.
Sample mean :: $\bar X = \frac1n\sum_{i=1}^n X_i$.
Sample variance S² (both forms) :: $S^2 = \frac1{n-1}\sum (X_i - \bar X)^2 = \frac1{n-1}\left(\sum X_i^2 - n\bar X^2\right)$.
Sample moments a_k and A_k :: $a_k = \frac1n\sum X_i^k$ (origin), $A_k = \frac1n\sum (X_i - \bar X)^k$ (central).
Sample second central moment S*² :: $S^{*2} = \frac1n\sum (X_i - \bar X)^2 = \frac{n-1}{n}S^2$.
Order statistics X₍₁₎ and X₍ₙ₎ :: The smallest and largest observations: $\min X_i$ and $\max X_i$.
Sample median for even n :: $\frac12\left(X_{(n/2)} + X_{(n/2+1)}\right)$, the average of the two middle values; for odd $n$, $X_{((n+1)/2)}$.
Sample range :: $R = X_{(n)} - X_{(1)}$.
Mean and variance of X̄ :: $E\bar X = \mu$, $D\bar X = \sigma^2/n$.
Expectation of S² and S*² :: $ES^2 = \sigma^2$, $ES^{*2} = \frac{n-1}{n}\sigma^2$.
Why S² divides by n − 1 :: So that $ES^2 = \sigma^2$ exactly: $E\sum (X_i - \bar X)^2 = (n-1)\sigma^2$.
:::

::: quiz Populations, samples and statistics
? (In-class question 22-033) $X_1, X_2, \ldots, X_n$ is a simple random sample from the population $X$. Then $X_1, \ldots, X_n$ must be
- [ ] independent but with different distributions
- [ ] identically distributed but not independent
- [x] independent and identically distributed
- [ ] impossible to say
> A simple random sample is defined by two properties: representative (each $X_i$ has the
> population's distribution) and independent. So the $X_i$ are i.i.d. — answer C.

? (In-class question 23-015) Observed values $x_1, \ldots, x_9$ have $\sum x_i = 45$ and $\sum x_i^2 = 285$. The observed sample variance is
- [x] 7.5
- [ ] 60
- [ ] 20/3
- [ ] 65/2
> $\bar x = 5$, $\sum (x_i - \bar x)^2 = 285 - 9 \cdot 5^2 = 60$, and $s^2 = 60/(9-1) = 7.5$.

? (In-class question 23-024, blank 1) $X_1, \ldots, X_n$ is a simple random sample from the (0–1) distribution with $P\{X = 1\} = p$. Find $E(\bar X)$.
expression: p
variables: p, n
> $E\bar X = EX = 0 \cdot (1-p) + 1 \cdot p = p$.

? (In-class question 23-024, blank 2) Same sample: find $D(\bar X)$.
expression: p (1 - p) / n
variables: p, n
> $DX = EX^2 - (EX)^2 = p - p^2 = p(1-p)$, so $D\bar X = DX/n = p(1-p)/n$.

? (In-class question 23-024, blank 3) Same sample: find $E(S^2)$.
expression: p (1 - p)
variables: p, n
> $ES^2 = DX = p(1-p)$ — the population variance, whatever $n$ is.

? $\mu$ is known and $\sigma^2$ unknown for the population $N(\mu, \sigma^2)$. Which of these is **not** a statistic?
- [ ] $\sum_{i=1}^{n} (X_i - \mu)^2$
- [x] $\frac{\bar X - \mu}{\sigma}\sqrt n$
- [ ] $\max\{X_1, \ldots, X_n\} - \min\{X_1, \ldots, X_n\}$
- [ ] $\frac13 \sum_{i=1}^{n} X_i$
> A statistic may not contain unknown parameters. Only the second one contains $\sigma$,
> which is unknown; $\mu$ is known, so the first one is a statistic.

? (Example 2) A sample of size $n$ comes from a $\chi^2(n)$ population ($EX = n$, $DX = 2n$). Find $D\bar X$.
answer: 2
> $D\bar X = DX/n = 2n/n = 2$.

? The observations are $1, 3, 5, 7, 9$. Find the observed second central moment $s^{*2}$.
answer: 8
> $\bar x = 5$; $\sum (x_i - 5)^2 = 16 + 4 + 0 + 4 + 16 = 40$; $s^{*2} = 40/5 = 8$ (while
> $s^2 = 40/4 = 10$).

? Find the sample median of the observations $2, 9, 4, 7$.
answer: 5.5
> Sorted: $2, 4, 7, 9$. With $n = 4$ even, $M = \frac12(x_{(2)} + x_{(3)}) = \frac12(4 + 7) = 5.5$.

? A population has variance $\sigma^2 = 4$. For a sample of size $n = 5$, find $ES^{*2}$.
answer: 3.2
> $ES^{*2} = \frac{n-1}{n}\sigma^2 = \frac45 \cdot 4 = 3.2$, below the true 4: $S^{*2}$ is biased
> downwards, $S^2$ isn't.

? The population is uniform on $(0, 2)$. What is the joint density of a sample $X_1, X_2, X_3$ at a point with every $x_i$ in $(0, 2)$?
answer: 1/8
> Each $X_i$ has density $\frac12$ on $(0, 2)$, and the joint density is the product:
> $\left(\frac12\right)^3 = \frac18$ inside the cube $(0,2)^3$, and 0 outside it.

? How many times larger must a sample be to halve the standard deviation of $\bar X$?
answer: 4
> $\sqrt{D\bar X} = \sigma/\sqrt n$. Halving it needs $\sqrt n$ doubled, so $n$ four times as large.
:::

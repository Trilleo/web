---
title: Variance
zh: 方差
summary: How far a random variable strays from its mean — the variance DX = E(X − EX)², the standard deviation, the shortcut DX = EX² − (EX)², the variances of the seven common distributions, and the rules for D(CX + b), D(X ± Y) and sums of independent variables.
source: 14数学期望8-2 (§4.2), 2026-10-21; 15方差和协方差9-1, 2026-10-26
---

The expectation tells you where a random variable is centred, but not how tightly it
sticks to that centre. Two batches of light bulbs can both last 1000 hours on average,
yet in one every bulb lasts about 1000 hours and in the other some die after a week and
some run for years. The {{term variance | 方差}} is the number that tells these apart: it
measures how spread out the values are around the mean. This lesson defines it, gives a
shortcut for computing it, works it out for every common distribution, and proves the
rules that let you find the variance of a sum or a linear combination without ever
finding its distribution. Those rules are used in nearly every later chapter, from the
law of large numbers to estimation, so they are worth knowing by heart.

Everything here builds on the expectation: its definition, $E f(X)$ for a function of
$X$, and its properties ($EC = C$, linearity, $EXY = EX\,EY$ for independent $X, Y$) are in
Lessons 4.1 and 4.2.

## Why a measure of spread

Here is the lecture's picture in numbers. Batch A's lifetime $X_A$ (hours) and batch B's
$X_B$ each take three values with probability $\frac13$:

| Batch | Values (h) | Mean (h) |
| --- | --- | --- |
| A | 950, 1000, 1050 | 1000 |
| B | 700, 1000, 1300 | 1000 |

Same mean, but B's bulbs are much less predictable. How do we put a number on that? The
deviation from the mean, $X - EX$, is a random variable too; we want its typical size.
Its average is useless — $E(X - EX) = EX - EX = 0$ always, because positive and negative
deviations cancel. Squaring removes the signs (and punishes big deviations more), so we
average the **squared** deviation instead:

- Batch A: $\frac13(50^2 + 0^2 + 50^2) \approx 1667$;
- Batch B: $\frac13(300^2 + 0^2 + 300^2) = 60000$.

Batch B's number is 36 times larger: that is the variance. Its square root brings it
back to hours: about 41 h for A and 245 h for B, a "typical distance from 1000 h".

The plot shows the same idea for continuous lifetimes: two densities with mean 1000 h.
Drag $\sigma$ to make the second batch more or less spread out; the mean stays put.

::: plot Two batches with the same mean 1000 h
x: 500 .. 1500
xlabel: lifetime (h)
f(x) = e^(-(x - 1000)^2 / (2 * 50^2)) / (sqrt(2 pi) * 50)
g(x) = e^(-(x - 1000)^2 / (2 σ^2)) / (sqrt(2 pi) σ)
slider σ: 20 .. 250 = 150 | h | spread of batch B
:::

## Definition of variance

::: define Variance | 方差
Let $X$ be a random variable. If $E(X - EX)^2$ exists, it is called the **variance** of
$X$, written $D(X)$ or $DX$:
$$DX = E(X - EX)^2.$$
:::

$E(X - EX)^2$ means $E\big[(X - EX)^2\big]$: first subtract the mean, then square, then
take the expectation. Many books write $\operatorname{Var}(X)$ for the same thing; this
course writes $DX$ (D for 离差, deviation).

::: define Standard deviation | 标准差
$\sqrt{DX}$ is called the **standard deviation** (also {{term root-mean-square deviation | 均方差}})
of $X$, written $\sigma_X$:
$$\sigma_X = \sqrt{DX}.$$
:::

The standard deviation has the same units as $X$ (hours, metres); the variance has the
units squared. That is why we quote $\sigma_X$ when describing data, but compute with
$DX$, whose rules are simpler.

What the number means: a **large** $DX$ says the values of $X$ are widely scattered, so
$EX$ is a poor representative of them; a **small** $DX$ says the values cluster near
$EX$, which then represents them well.

::: callout key Variance is an expectation
$DX$ is just $E f(X)$ for the function $f(x) = (x - EX)^2$. So everything you know about
expectations of functions (Lesson 4.2) applies: no need to find the distribution of
$(X - EX)^2$ first. And like $EX$, $DX$ is a **number**, not a random variable.
:::

## Computing a variance

### From the definition

Since $DX = E f(X)$ with $f(x) = (x - EX)^2$, the formulas for $E f(X)$ give:

::: formula Variance from the definition | 方差的定义式
$$DX = \sum_{k=1}^{\infty}(x_k - EX)^2 p_k \quad\text{(discrete)}, \qquad DX = \int_{-\infty}^{+\infty}(x - EX)^2 p(x)\,\d x \quad\text{(continuous)}$$
--
P\{X = x_k\} = p_k | distribution law of a discrete $X$, $k = 1, 2, \ldots$ |
p(x) | probability density of a continuous $X$ (some books write $f(x)$) |
EX | the expectation of $X$, found first |
:::

### The shortcut DX = EX² − (EX)²

Squaring out the bracket gives a formula that is almost always quicker.

::: theorem Computing formula for the variance | 方差的计算公式
$$DX = EX^2 - (EX)^2.$$
:::

::: example Proof of DX = EX² − (EX)²
Show that $E[X - E(X)]^2 = E(X^2) - [E(X)]^2$.
== Expand ==
$$D(X) = E[X - E(X)]^2 = E\{X^2 - 2X\,E(X) + [E(X)]^2\}.$$
== Use linearity of E ==
$E(X)$ is a constant, so $E[2X\,E(X)] = 2E(X)\cdot E(X)$ and $E\{[E(X)]^2\} = [E(X)]^2$:
$$D(X) = E(X^2) - 2[E(X)]^2 + [E(X)]^2 = E(X^2) - [E(X)]^2.$$
:::

::: formula Computing formula for the variance | 方差的计算公式
$$DX = EX^2 - (EX)^2$$
--
EX^2 | $E(X^2)$, the mean of the square: $\sum x_k^2 p_k$ or $\int x^2 p(x)\,\d x$ |
(EX)^2 | the square of the mean |
:::

::: callout pitfall EX² is not (EX)²
$EX^2$ means $E(X^2)$: square first, then average. $(EX)^2$ averages first, then squares.
They are different numbers, and their difference is exactly $DX$. Since $DX \ge 0$, it
follows that $(EX)^2 \le EX^2$ always (in-class question 19-051), with equality only when
$X$ is constant.
:::

::: example Both ways on one distribution law
$X$ has the distribution law below (the one from Lesson 4.2, where $EX^2 = 2.8$). Find $DX$.
$$\begin{array}{c|ccc} X & -2 & 0 & 2 \\ \hline p_k & 0.4 & 0.3 & 0.3 \end{array}$$
== The mean ==
$EX = -2(0.4) + 0(0.3) + 2(0.3) = -0.2$.
== By the definition ==
The deviations are $-1.8$, $0.2$, $2.2$:
$$DX = (-1.8)^2(0.4) + (0.2)^2(0.3) + (2.2)^2(0.3) = 1.296 + 0.012 + 1.452 = 2.76.$$
== By the shortcut ==
$EX^2 = 4(0.4) + 0 + 4(0.3) = 2.8$, so $DX = 2.8 - (-0.2)^2 = 2.8 - 0.04 = 2.76$.
Same answer, less arithmetic. The standard deviation is $\sigma_X = \sqrt{2.76} \approx 1.66$.
:::

## Variances of the common distributions

The expectations of these distributions are in Lesson 4.1; each variance below comes
from the shortcut $DX = EX^2 - (EX)^2$, so the work is finding $EX^2$.

### Two-point distribution

$X$ takes 1 with probability $p$ and 0 with probability $1 - p$ ($X \sim (0\text{-}1)$).
Then $EX = p$, and since $1^2 = 1$ and $0^2 = 0$, $EX^2 = 1^2\cdot p + 0^2\cdot(1-p) = p$. So
$$DX = p - p^2 = p(1-p).$$
It is largest, $\frac14$, at $p = \frac12$: a fair coin is the least predictable 0–1 variable.

### Binomial distribution

$X \sim B(n, p)$, $P\{X = k\} = \binom nk p^k (1-p)^{n-k}$ ($\binom nk$ is also written
$C_n^k$), $k = 0, 1, \ldots, n$. Write $q = 1 - p$. Then
$$DX = npq = np(1-p).$$
The slide leaves $EX^2 = \sum k^2\binom nk p^k q^{n-k}$ unevaluated. A direct way: compute
$E[X(X-1)]$, where the factor $k(k-1)$ cancels against $k!$:
$$E[X(X-1)] = \sum_{k=2}^{n} k(k-1)\frac{n!}{k!(n-k)!}p^kq^{n-k} = n(n-1)p^2\sum_{j=0}^{n-2}\binom{n-2}{j}p^jq^{n-2-j} = n(n-1)p^2,$$
so $EX^2 = n(n-1)p^2 + np$ and $DX = n(n-1)p^2 + np - n^2p^2 = np - np^2 = npq$. Example 3
below gets the same result in one line, using the rules for variance.

### Poisson distribution

$X \sim P(\lambda)$, $P\{X = k\} = \frac{\lambda^k}{k!}e^{-\lambda}$, $k = 0, 1, 2, \ldots$ The same trick:
$$E[X(X-1)] = \sum_{k=2}^{\infty}k(k-1)\frac{\lambda^k}{k!}e^{-\lambda} = \lambda^2 e^{-\lambda}\sum_{k=2}^{\infty}\frac{\lambda^{k-2}}{(k-2)!} = \lambda^2,$$
so $EX^2 = \lambda^2 + \lambda = \lambda(\lambda+1)$ and
$$DX = \lambda(\lambda + 1) - \lambda^2 = \lambda.$$
The Poisson distribution's mean and variance are **equal** — both are $\lambda$.

::: plot Poisson P(λ): mean λ, variance λ
x: 0 .. 25
xlabel: k
bars P(k) = e^(-λ) λ^k / k!
slider λ: 0.5 .. 12 = 4
:::

As $\lambda$ grows the bars move right (mean $\lambda$) and spread out (standard deviation
$\sqrt\lambda$).

### Uniform distribution

$X \sim U[a, b]$, density $p(x) = \frac{1}{b-a}$ on $[a, b]$, 0 elsewhere. $EX = \frac{a+b}{2}$ and
$$EX^2 = \int_a^b x^2\frac{1}{b-a}\,\d x = \frac{b^3 - a^3}{3(b-a)} = \frac{a^2 + ab + b^2}{3},$$
so
$$DX = \frac{a^2+ab+b^2}{3} - \frac{(a+b)^2}{4} = \frac{4a^2 + 4ab + 4b^2 - 3a^2 - 6ab - 3b^2}{12} = \frac{(b-a)^2}{12}.$$
Only the **length** of the interval matters, not where it sits: $U[0, 2]$ and $U[5, 7]$
both have variance $\frac{4}{12} = \frac13$.

### Exponential distribution

$X \sim E(\beta)$, density $p(x) = \beta e^{-\beta x}$ for $x > 0$, 0 for $x \le 0$ ($\beta > 0$;
many books call the parameter $\lambda$). $EX = \frac1\beta$, and integrating by parts twice
$$EX^2 = \int_0^{+\infty}x^2\beta e^{-\beta x}\,\d x = \frac{2}{\beta^2},$$
so
$$DX = \frac{2}{\beta^2} - \frac{1}{\beta^2} = \frac{1}{\beta^2}.$$
The standard deviation equals the mean, $\frac1\beta$.

### Normal distribution

$X \sim N(\mu, \sigma^2)$. Here the definition is easier than the shortcut. With $EX = \mu$:
$$DX = \int_{-\infty}^{+\infty}(x-\mu)^2\frac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}\,\d x.$$
Put $t = \frac{x-\mu}{\sigma}$, so $x - \mu = \sigma t$ and $\d x = \sigma\,\d t$:
$$DX = \frac{\sigma^2}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}t^2e^{-\frac{t^2}{2}}\,\d t.$$
By parts, with $u = t$ and $\d v = te^{-t^2/2}\,\d t$:
$\int t^2e^{-t^2/2}\,\d t = \big[-te^{-t^2/2}\big]_{-\infty}^{+\infty} + \int e^{-t^2/2}\,\d t = 0 + \sqrt{2\pi}$
(the Gaussian integral, Lesson 2.4). So
$$DX = \frac{\sigma^2}{\sqrt{2\pi}}\cdot\sqrt{2\pi} = \sigma^2.$$
This is why the second parameter of $N(\mu, \sigma^2)$ is written $\sigma^2$: it **is** the
variance, and $\sigma$ is the standard deviation.

### Geometric distribution

::: example The geometric distribution's mean and variance
$X$ has the geometric distribution $P\{X = k\} = (1-p)^{k-1}p$, $k = 1, 2, \ldots$ (Lesson 2.1:
the number of trials up to the first success). Find $EX$ and $DX$.
== Set up the series ==
Write $q = 1 - p$. Then
$$EX = \sum_{k=1}^{\infty}k\,q^{k-1}p = p\sum_{k=1}^{\infty}k\,q^{k-1}, \qquad EX^2 = \sum_{k=1}^{\infty}k^2q^{k-1}p = p\sum_{k=1}^{\infty}k^2q^{k-1}.$$
So we need two power series at $x = q$.
== Differentiate a geometric series ==
For $|x| < 1$, $\sum_{k=1}^{\infty}x^k = \frac{x}{1-x}$. Differentiating term by term:
$$\sum_{k=1}^{\infty}k\,x^{k-1} = \left[\sum_{k=1}^{\infty}x^k\right]' = \left[\frac{x}{1-x}\right]' = \frac{1}{(1-x)^2}.$$
== Once more ==
Multiply by $x$ and differentiate again:
$$\sum_{k=1}^{\infty}k^2x^{k-1} = \left[\sum_{k=1}^{\infty}k\,x^k\right]' = \left[\frac{x}{(1-x)^2}\right]' = \frac{(1-x)^2 + 2x(1-x)}{(1-x)^4} = \frac{1+x}{(1-x)^3}.$$
== Put in x = q ==
$1 - q = p$, so
$$EX = p\cdot\frac{1}{p^2} = \frac1p, \qquad EX^2 = p\cdot\frac{1+q}{p^3} = \frac{1+q}{p^2} = \frac{2-p}{p^2}.$$
== The variance ==
$$DX = EX^2 - (EX)^2 = \frac{2-p}{p^2} - \frac{1}{p^2} = \frac{1-p}{p^2}.$$
:::

$EX = \frac1p$ makes sense: if a six comes up with probability $\frac16$, you wait 6 throws
on average. The variance $\frac{1-p}{p^2} = 30$ says the wait is very unpredictable.

::: plot The geometric distribution: mean 1/p, variance (1 − p)/p²
x: 1 .. 25
xlabel: k
bars P(k) = (1 - p)^(k - 1) p
slider p: 0.05 .. 0.9 = 0.25
:::

::: explore Mean and spread of the geometric distribution
slider p: 0.02 .. 1 = 0.1667 | | success probability
mean = 1 / p | | EX
var = (1 - p) / p^2 | | DX
sd = sqrt(1 - p) / p | | Standard deviation
:::

### The table to memorise

::: callout key Expectations and variances of the seven common distributions
| Distribution | Parameters | Expectation $EX$ | Variance $DX$ |
| --- | --- | --- | --- |
| Two-point $(0\text{-}1)$ (两点分布) | $0 < p < 1$ | $p$ | $p(1-p)$ |
| Binomial $B(n, p)$ (二项分布) | $n \ge 1$, $0 < p < 1$ | $np$ | $np(1-p)$ |
| Poisson $P(\lambda)$ (泊松分布) | $\lambda > 0$ | $\lambda$ | $\lambda$ |
| Uniform $U[a, b]$ (均匀分布) | $a < b$ | $\frac{a+b}{2}$ | $\frac{(b-a)^2}{12}$ |
| Exponential $E(\beta)$ (指数分布) | $\beta > 0$ | $\frac1\beta$ | $\frac{1}{\beta^2}$ |
| Normal $N(\mu, \sigma^2)$ (正态分布) | $\mu$, $\sigma > 0$ | $\mu$ | $\sigma^2$ |
| Geometric (几何分布) | $0 < p < 1$ | $\frac1p$ | $\frac{1-p}{p^2}$ |
:::

::: callout exam Reading parameters backwards
A favourite question gives a probability or an expectation and asks for something else,
using this table in reverse. In-class question 19-056: $X$ is Poisson and
$P\{X \ge 1\} = 1 - e^{-2}$; since $P\{X \ge 1\} = 1 - P\{X = 0\} = 1 - e^{-\lambda}$, $\lambda = 2$, and
$EX^2 = DX + (EX)^2 = \lambda + \lambda^2 = 6$. Question 19-057: $E[(X-1)(X-2)] = 1$ for a
Poisson $X$; expand, $EX^2 - 3EX + 2 = \lambda^2 + \lambda - 3\lambda + 2 = (\lambda - 1)^2 + 1 = 1$, so
$\lambda = 1$. Both are in the quiz below.
:::

## Properties of variance

These rules let you get variances of combinations from the variances of the pieces.
Throughout, $C$ and $b$ are constants and the variances involved exist.

::: theorem Properties of variance | 方差的性质
1. $DC = 0$ for a constant $C$.
2. $D(CX + b) = C^2 DX$.
3. For any two random variables, $D(X \pm Y) = DX + DY \pm 2(EXY - EX\,EY)$. If
   $X_1, X_2, \ldots, X_n$ are mutually independent, then
   $$D(X_1 \pm X_2 \pm \cdots \pm X_n) = DX_1 + DX_2 + \cdots + DX_n,$$
   and more generally, for constants $C_1, \ldots, C_n$,
   $$D(C_1X_1 + C_2X_2 + \cdots + C_nX_n) = \sum_{i=1}^{n}C_i^2DX_i.$$
4. $DX = 0$ if and only if $X$ equals some constant $C$ with probability 1:
   $P\{X = C\} = 1$.
:::

### Constants and linear functions

**Property 1.** A constant never strays from itself: $DC = EC^2 - (EC)^2 = C^2 - C^2 = 0$.

**Property 2.** Shifting by $b$ moves the values and the mean together, so the
deviations don't change; scaling by $C$ scales every deviation by $C$, and every
squared deviation by $C^2$.

::: example Proof of D(CX + b) = C²DX
Prove property 2 from the definition.
== Use the definition ==
$$D(CX + b) = E[CX + b - E(CX + b)]^2.$$
== The mean of CX + b ==
By linearity, $E(CX + b) = C\,EX + b$, so
$$D(CX + b) = E[CX + b - C\,EX - b]^2 = E[C(X - EX)]^2.$$
== Take out C² ==
$$E[C^2(X - EX)^2] = C^2E(X - EX)^2 = C^2DX.$$
:::

::: formula Variance of a linear function | 线性函数的方差
$$D(CX + b) = C^2 DX$$
--
C, b | constants |
DX | variance of $X$ |
:::

::: callout pitfall The constant comes out squared, the shift disappears
$D(2X + 3) = 4DX$, not $2DX$ and not $2DX + 3$. And $D(-X) = (-1)^2DX = DX$: flipping the
sign doesn't change the spread. In-class question 20-021 is exactly this.
:::

### Sums: where independence comes in

::: example Proof of D(X ± Y) = DX + DY ± 2(EXY − EX EY)
Expand the square in the definition.
== Group the deviations ==
$$D(X + Y) = E[(X + Y) - E(X + Y)]^2 = E[(X - EX) + (Y - EY)]^2.$$
== Square out ==
$$\begin{aligned}D(X+Y) &= E[(X-EX)^2 + 2(X-EX)(Y-EY) + (Y-EY)^2]\\&= DX + DY + 2E[(X-EX)(Y-EY)].\end{aligned}$$
== The cross term ==
$$\begin{aligned}E[(X-EX)(Y-EY)] &= E[XY - X\,EY - Y\,EX + EX\,EY]\\&= EXY - 2EX\,EY + EX\,EY = EXY - EX\,EY.\end{aligned}$$
So $D(X + Y) = DX + DY + 2(EXY - EX\,EY)$. For $X - Y$ the cross term changes sign.
:::

::: formula Variance of a sum or difference | 和与差的方差
$$D(X \pm Y) = DX + DY \pm 2(EXY - EX\,EY)$$
--
EXY - EX\,EY | the cross term, zero when $X$ and $Y$ are independent (Lesson 4.4 calls it the covariance) |
:::

If $X$ and $Y$ are independent, $EXY = EX\,EY$ (Lesson 4.2), the cross term vanishes, and
$D(X \pm Y) = DX + DY$. Note the **plus** in $D(X - Y) = DX + DY$: subtracting an
independent quantity adds uncertainty, it doesn't remove it. With property 2 and
induction this gives the general rule:

::: formula Variance of a linear combination of independent variables | 独立随机变量线性组合的方差
$$D(C_1X_1 + C_2X_2 + \cdots + C_nX_n) = \sum_{i=1}^{n}C_i^2DX_i$$
--
X_1, \ldots, X_n | mutually independent random variables |
C_1, \ldots, C_n | constants (their signs don't matter: each is squared) |
:::

::: callout pitfall Linearity of E needs nothing; additivity of D needs independence
$E(X + Y) = EX + EY$ always. $D(X + Y) = DX + DY$ only when the cross term is zero — for
instance when $X$ and $Y$ are independent. Take $Y = X$: $D(2X) = 4DX$, not
$DX + DX = 2DX$.
:::

### Variance zero means constant

**Property 4.** If $P\{X = C\} = 1$, then $EX = C$ and $(X - C)^2 = 0$ with probability 1, so
$DX = 0$. The converse — a random variable with no spread at all is (almost surely) a
constant — is proved with Chebyshev's inequality (Lesson 5.1). Property 4 is what turns
"$D(\ldots) = 0$" into "$\ldots$ is a constant", which Lesson 4.4 uses to show that
$|\rho| = 1$ means a straight-line relationship.

## Worked examples

::: example Example 1: uniform on a triangle
$(X, Y)$ is uniformly distributed on the triangle $A$ bounded by the $x$-axis, the
$y$-axis and the line $x + \frac{y}{2} = 1$. Find $DX$, $DY$ and $D(2X + 1)$.
== The density ==
$A$ has vertices $(0,0)$, $(1,0)$, $(0,2)$, so its area is $\frac12\cdot1\cdot2 = 1$, and the
density is $f(x,y) = 1$ on $A$, 0 elsewhere (Lesson 3.3). For each $x \in [0,1]$, $y$ runs
from 0 to $2 - 2x$.
== DX ==
$$EX = \int_0^1\d x\int_0^{2-2x}x\,\d y = \int_0^1 x(2-2x)\,\d x = 1 - \frac23 = \frac13,$$
$$EX^2 = \int_0^1\d x\int_0^{2-2x}x^2\,\d y = \int_0^1x^2(2-2x)\,\d x = \frac23 - \frac12 = \frac16,$$
$$DX = \frac16 - \frac19 = \frac{1}{18}.$$
== DY ==
$$EY = \int_0^1\d x\int_0^{2-2x}y\,\d y = \int_0^1\frac{(2-2x)^2}{2}\,\d x = 2\int_0^1(1-x)^2\,\d x = \frac23,$$
$$EY^2 = \int_0^1\frac{(2-2x)^3}{3}\,\d x = \frac83\int_0^1(1-x)^3\,\d x = \frac23,$$
$$DY = \frac23 - \frac49 = \frac29.$$
== D(2X + 1) ==
By property 2, $D(2X + 1) = 4DX = \frac{4}{18} = \frac29$.
:::

::: callout note What the slide leaves out
The slide stops after $DX = \frac{1}{18}$; $DY = \frac29$ and $D(2X + 1) = \frac29$ are worked
out above. Note that $D(2X + 1)$ needs no new integral.
:::

::: plot Example 1: the triangle where the density is 1
x: -0.2 .. 1.4
y: -0.2 .. 2.2
region A: x >= 0, y >= 0, x + y/2 <= 1
f(x) = 2 - 2x
:::

::: example Example 2 (例4.20): a linear combination of independent normals
$X$ and $Y$ are independent, $X \sim N(1, 2)$, $Y \sim N(0, 1)$. Find the density of
$Z = 2X - Y + 3$.
== Z is normal ==
A linear combination of independent normal variables is normal (Lesson 3.7), so
$Z \sim N(EZ, DZ)$: we only need its mean and variance.
== The mean ==
$EZ = 2EX - EY + 3 = 2\times1 - 0 + 3 = 5$.
== The variance ==
$DX = 2$ (the second parameter is the variance) and $DY = 1$. By independence and
property 3, the constant 3 dropping out:
$$DZ = 2^2DX + (-1)^2DY = 8 + 1 = 9.$$
== The density ==
$Z \sim N(5, 3^2)$, so
$$p_Z(z) = \frac{1}{3\sqrt{2\pi}}e^{-\frac{(z-5)^2}{18}}, \qquad -\infty < z < +\infty.$$
(The slide stops at $Z \sim N(5, 3^2)$.)
:::

Lesson 3.7 asked you to take the rule $\sum a_iX_i \sim N\big(\sum a_i\mu_i, \sum a_i^2\sigma_i^2\big)$
on trust; now you can see where its parameters come from: linearity of $E$ gives the
mean, property 3 gives the variance. The distribution being normal is the part that
needs Lesson 3.7.

::: callout tip The mean of n independent normals
If $X_1, \ldots, X_n$ are independent, all $N(\mu, \sigma^2)$, then
$\overline{X} = \frac1n(X_1 + \cdots + X_n)$ has mean $\mu$ and variance
$\frac{1}{n^2}\cdot n\sigma^2 = \frac{\sigma^2}{n}$: $\overline{X} \sim N\big(\mu, \frac{\sigma^2}{n}\big)$
(in-class question 20-026). Averaging $n$ measurements divides the variance by $n$ — the
reason repeated measurement works, and the starting point of Units 5 and 6.
:::

::: example Example 3: the binomial variance by indicators
$X \sim B(n, p)$. Find $DX$.
== Split into trials ==
Let $X$ be the number of successes in $n$ independent Bernoulli trials, and let $X_i$ be
the number of successes in the $i$-th trial:
$$X_i = \begin{cases}1, & \text{trial } i \text{ succeeds},\\ 0, & \text{trial } i \text{ fails},\end{cases}\qquad i = 1, \ldots, n.$$
Then $X = X_1 + X_2 + \cdots + X_n$, and the $X_i$ are independent (the trials are).
== Add the variances ==
Each $X_i$ is a two-point variable, $DX_i = p(1-p)$. By independence:
$$DX = DX_1 + DX_2 + \cdots + DX_n = np(1-p).$$
:::

Writing a count as a sum of 0–1 {{term indicator variables | 示性变量}} worked for $EX = np$ in
Lesson 4.2; for the variance it works just as well **when the indicators are independent**.
The next example shows what changes when they aren't.

::: example Example 4: matching letters and envelopes
Someone writes $n$ letters to $n$ different addresses and addresses $n$ envelopes, then
puts the letters into the envelopes at random, one each. A letter in its own envelope is
a {{term match | 配对}}. Find the expectation and variance of the number of matches $X$.
== Indicators ==
Let $X_i = 1$ if letter $i$ is in its own envelope, 0 otherwise. Then
$X = X_1 + \cdots + X_n$, and $P\{X_i = 1\} = \frac1n$ (letter $i$ is equally likely to be
in any envelope).
== The expectation ==
$EX_i = \frac1n$, so by linearity $EX = n\cdot\frac1n = 1$, whatever $n$ is.
== The X_i are not independent ==
If letters $1, \ldots, n-1$ are all matched, letter $n$ must be too. So we can't just add
variances; use $DX = EX^2 - (EX)^2$ and expand the square:
$$EX^2 = E(X_1 + \cdots + X_n)^2 = \sum_{i=1}^{n}EX_i^2 + 2\sum_{1\le i<j\le n}E(X_iX_j).$$
== The pieces ==
$X_i^2 = X_i$ (it is 0 or 1), so $EX_i^2 = \frac1n$. $X_iX_j = 1$ only when both letters are
matched: letter $i$ in its envelope ($\frac1n$), then letter $j$ in its own among the
$n - 1$ left ($\frac{1}{n-1}$):
$$E(X_iX_j) = P\{X_iX_j = 1\} = \frac1n\cdot\frac{1}{n-1} = \frac{1}{n(n-1)}.$$
== Add up ==
There are $C_n^2 = \frac{n(n-1)}{2}$ pairs $i < j$:
$$EX^2 = n\cdot\frac1n + 2C_n^2\cdot\frac{1}{n(n-1)} = 1 + 1 = 2, \qquad DX = 2 - 1^2 = 1.$$
:::

For four letters you can check this by listing all 24 orders: the numbers of matches
average 1 and have variance 1.

::: example Example 5: products between two repairs
Each product made on a production line is defective with probability $p$, independently.
When the $n$-th defective product appears, the line stops for a repair. Find the
expectation and variance of the number $X$ of products made between two repairs.
== Split the run ==
Let $X_i$ be the number of products made after the $(i-1)$-th defective one, up to and
including the $i$-th defective one, $i = 1, \ldots, n$. Then $X = X_1 + X_2 + \cdots + X_n$:
$$\underbrace{\triangle\triangle\cdots\triangle\,\bullet}_{X_1}\ \underbrace{\triangle\cdots\triangle\,\bullet}_{X_2}\ \cdots\ \underbrace{\triangle\cdots\triangle\,\bullet}_{X_n}$$
== Each piece is geometric ==
Each $X_i$ counts trials up to the next "success" (a defective), so
$P\{X_i = k\} = (1-p)^{k-1}p$, with $EX_i = \frac1p$ and $DX_i = \frac{1-p}{p^2}$.
== The expectation ==
$EX = EX_1 + \cdots + EX_n = \dfrac np$.
== The variance ==
The products are independent, so the stretches $X_1, \ldots, X_n$ are independent:
$$DX = DX_1 + \cdots + DX_n = \frac{n(1-p)}{p^2}.$$
:::

The same argument answers in-class question 20-034 (shoot until $r$ hits): the number of
shots is a sum of $r$ independent geometric variables, so $EX = \frac rp$ and
$DX = \frac{r(1-p)}{p^2}$.

::: callout exam What exams ask about variance
Expect: the variance of a given distribution law or density (shortcut formula); spotting
the wrong formula among $D(CX + b)$, $D(X \pm Y)$, $EX^2 = DX + (EX)^2$; the distribution
of a linear combination of independent normals (mean by linearity, variance with
squared coefficients); a parameter recovered from the table of $E$ and $D$; and counts
split into indicators or geometric pieces, as in Examples 3–5.
:::

::: callout summary The lesson in five lines
$DX = E(X - EX)^2 = EX^2 - (EX)^2 \ge 0$, and $\sigma_X = \sqrt{DX}$. Know the table: $p(1-p)$,
$np(1-p)$, $\lambda$, $\frac{(b-a)^2}{12}$, $\frac{1}{\beta^2}$, $\sigma^2$, $\frac{1-p}{p^2}$. $DC = 0$,
$D(CX + b) = C^2DX$. $D(X \pm Y) = DX + DY \pm 2(EXY - EX\,EY)$, so for independent
variables $D(\sum C_iX_i) = \sum C_i^2DX_i$. $DX = 0$ exactly when $X$ is a constant.
:::

::: cards Variance
Definition of the variance DX :: $DX = E(X - EX)^2$, the mean squared deviation from the mean.
Standard deviation :: $\sigma_X = \sqrt{DX}$ (标准差, 均方差), in the same units as $X$.
Shortcut formula for the variance :: $DX = EX^2 - (EX)^2$.
Which is larger, $EX^2$ or $(EX)^2$? :: $EX^2 \ge (EX)^2$, since their difference is $DX \ge 0$.
Variance of the two-point and binomial distributions :: $p(1-p)$ and $np(1-p)$.
Variance of the Poisson distribution $P(\lambda)$ :: $\lambda$ (equal to its mean); $EX^2 = \lambda(\lambda + 1)$.
Variance of the uniform $U[a,b]$ :: $\frac{(b-a)^2}{12}$; $EX^2 = \frac{a^2 + ab + b^2}{3}$.
Variance of the exponential $E(\beta)$ :: $\frac{1}{\beta^2}$; $EX^2 = \frac{2}{\beta^2}$.
Variance of the normal $N(\mu, \sigma^2)$ :: $\sigma^2$.
Mean and variance of the geometric distribution :: $EX = \frac1p$, $DX = \frac{1-p}{p^2}$.
Power series for the geometric variance :: $\sum_{k\ge1}kx^{k-1} = \frac{1}{(1-x)^2}$, $\sum_{k\ge1}k^2x^{k-1} = \frac{1+x}{(1-x)^3}$, $|x| < 1$.
Variance of a linear function $CX + b$ :: $C^2DX$; a constant has variance 0.
Variance of $X \pm Y$ in general :: $DX + DY \pm 2(EXY - EX\,EY)$.
Variance of a linear combination of independent variables :: $D(\sum C_iX_i) = \sum C_i^2 DX_i$.
When is $DX = 0$? :: Exactly when $P\{X = C\} = 1$ for some constant $C$.
:::

::: quiz Variance
? (In-class question 19-051) $X$ has a variance. Then
- [ ] $(EX)^2 = EX^2$
- [ ] $(EX)^2 \ge EX^2$
- [ ] $(EX)^2 > EX^2$
- [x] $(EX)^2 \le EX^2$
> $DX = EX^2 - (EX)^2 \ge 0$, so $(EX)^2 \le EX^2$, with equality only for a constant.

? (In-class question 19-056) $X$ has a Poisson distribution and $P\{X \ge 1\} = 1 - e^{-2}$. Find $EX^2$.
answer: 6
> $P\{X \ge 1\} = 1 - P\{X = 0\} = 1 - e^{-\lambda}$, so $\lambda = 2$. Then
> $EX^2 = DX + (EX)^2 = \lambda + \lambda^2 = 2 + 4 = 6$.

? (In-class question 19-057) $X$ is Poisson with parameter $\lambda$ and $E[(X-1)(X-2)] = 1$. Then $\lambda =$
- [x] $1$
- [ ] $-2$
- [ ] $\frac12$
- [ ] $\frac14$
> $E[(X-1)(X-2)] = EX^2 - 3EX + 2 = (\lambda^2 + \lambda) - 3\lambda + 2 = (\lambda - 1)^2 + 1$.
> Setting this to 1 gives $(\lambda - 1)^2 = 0$, $\lambda = 1$.

? (In-class question 19-059) $X$ is uniform on $[0, 2]$. Then $DX =$
- [ ] $\frac12$
- [x] $\frac13$
- [ ] $\frac16$
- [ ] $\frac1{12}$
> $\frac{(b-a)^2}{12} = \frac{4}{12} = \frac13$.

? (In-class question 20-021) Which formula is **wrong**?
- [ ] $EX^2 = DX + (EX)^2$
- [x] $D(2X + 3) = 2DX$
- [ ] $E(3Y + b) = 3EY + b$
- [ ] $D(EX) = 0$
> $D(2X + 3) = 2^2DX = 4DX$. The first is the shortcut formula rearranged, the third is
> linearity of $E$, and $EX$ is a constant, so its variance is 0.

? (In-class question 20-022) $X$ and $Y$ are independent with variances. Then $D(2X - 3Y) =$
- [ ] $2DX - 3DY$
- [ ] $4DX - 9DY$
- [x] $4DX + 9DY$
- [ ] $2DX + 3DY$
> Coefficients come out squared: $2^2DX + (-3)^2DY = 4DX + 9DY$. A variance can't become
> smaller by subtracting an independent variable.

? (In-class question 20-025) $X \sim N(\mu_1, \sigma_1^2)$ and $Y \sim N(\mu_2, \sigma_2^2)$ are independent. Then
- [ ] $X + Y \sim N(\mu_1 + \mu_2, (\sigma_1 + \sigma_2)^2)$
- [ ] $X - Y \sim N(\mu_1 - \mu_2, \sigma_1^2 - \sigma_2^2)$
- [x] $X - 2Y \sim N(\mu_1 - 2\mu_2, \sigma_1^2 + 4\sigma_2^2)$
- [ ] $2X - Y \sim N(2\mu_1 - \mu_2, 2\sigma_1^2 + \sigma_2^2)$
> Means combine linearly; variances add with squared coefficients. So $X + Y$ has variance
> $\sigma_1^2 + \sigma_2^2$, $X - Y$ also $\sigma_1^2 + \sigma_2^2$, $X - 2Y$ has
> $\sigma_1^2 + 4\sigma_2^2$ (right), and $2X - Y$ has $4\sigma_1^2 + \sigma_2^2$.

? (In-class question 20-026) $X_1, \ldots, X_n$ are independent, each $N(\mu, \sigma^2)$. Then
- [ ] $X_1 = X_2 = \cdots = X_n$
- [x] $\frac1n(X_1 + \cdots + X_n) \sim N\big(\mu, \frac{\sigma^2}{n}\big)$
- [ ] $2X_1 + 3 \sim N(2\mu + 3, 4\sigma^2 + 3)$
- [ ] $X_1 - X_2 \sim N(0, 0)$
> The average has mean $\mu$ and variance $\frac{1}{n^2}\cdot n\sigma^2 = \frac{\sigma^2}{n}$.
> Having the same distribution doesn't make them equal; $2X_1 + 3 \sim N(2\mu + 3, 4\sigma^2)$
> (the shift adds nothing to the variance); $X_1 - X_2 \sim N(0, 2\sigma^2)$. (The slide's
> last option uses undefined $\sigma_1, \sigma_2$; it is wrong either way.)

? (In-class question 20-027) $X \sim N(0, 1)$ and $Y \sim N(1, 1)$ are independent. Which is true?
- [ ] $P\{X + Y \le 0\} = \frac12$
- [x] $P\{X + Y \le 1\} = \frac12$
- [ ] $P\{X - Y \le 0\} = \frac12$
- [ ] $P\{X - Y \le 1\} = \frac12$
> $X + Y \sim N(1, 2)$ is symmetric about its mean 1, so $P\{X + Y \le 1\} = \frac12$.
> $X - Y \sim N(-1, 2)$ has $\frac12$ below $-1$, not below 0 or 1.

? (In-class question 20-034) A shooter fires independently at a target, hitting with probability $p$ each time, until there are $r$ hits. $X$ is the number of shots. Find $EX$.
expression: r/p
variables: r, p
> Split $X$ into the shots up to the first hit, then up to the second, …: $r$ independent
> geometric variables, each with mean $\frac1p$. So $EX = \frac rp$.

? (In-class question 20-034, second blank) In the same problem, find $DX$.
expression: r (1 - p) / p^2
variables: r, p
> Each geometric piece has variance $\frac{1-p}{p^2}$, and they are independent, so
> $DX = \frac{r(1-p)}{p^2}$.

? $X$ has the distribution law $P\{X = -2\} = 0.4$, $P\{X = 0\} = 0.3$, $P\{X = 2\} = 0.3$. Find $DX$.
answer: 2.76
> $EX = -0.2$ and $EX^2 = 4(0.4) + 4(0.3) = 2.8$, so $DX = 2.8 - 0.04 = 2.76$.

? $X$ has density $p(x) = 2x$ for $0 < x < 1$ (0 elsewhere). Find $DX$.
answer: 1/18
> $EX = \int_0^1 2x^2\,\d x = \frac23$ and $EX^2 = \int_0^1 2x^3\,\d x = \frac12$, so
> $DX = \frac12 - \frac49 = \frac{1}{18}$.

? $X \sim E(\beta)$ with $EX = 10$. Find $D(2X + 1)$.
answer: 400
> $EX = \frac1\beta = 10$, so $DX = \frac{1}{\beta^2} = 100$ and $D(2X + 1) = 4\cdot100 = 400$.

? $X$ and $Y$ are independent, $X \sim B(10, 0.2)$ and $Y \sim P(3)$. Find $D(X - 2Y + 5)$.
answer: 13.6
> $DX = 10(0.2)(0.8) = 1.6$ and $DY = 3$. By independence,
> $D(X - 2Y + 5) = DX + 4DY = 1.6 + 12 = 13.6$.

? Which name means $\sqrt{DX}$? Type it in English.
text: standard deviation | root-mean-square deviation | 标准差 | 均方差
> $\sigma_X = \sqrt{DX}$ is the standard deviation (标准差, also 均方差).
:::

---
title: The χ², t and F distributions
zh: 三大抽样分布
summary: The three distributions built from normal variables — χ²(n), t(n) and F(n₁, n₂): definitions, the shapes of their densities, the Γ function, EX = n and DX = 2n for χ², additivity, upper α quantiles and table lookups, and recognising χ² and F variables made from normal samples.
source: 17三大分布10-1 (§6.3), 2026-11-03; review in 18统计量及抽样分布10-2, 2026-11-04
---

Statistics works with quantities computed from normal samples: sums of squares,
standardised means, ratios of two variances. Their distributions are not normal, but they
are always one of three families, each built from independent standard normal variables:
the $\chi^2$ ("chi-square") distribution, Student's $t$ distribution and the $F$
distribution. Together they are the {{term three sampling distributions | 三大抽样分布}}
(三大分布). Every confidence interval in Unit 7 and every test in Unit 8 reads a number
from a table of one of them, so this lesson does three things for each: how it is built
(the definition — this is what exams test), what its density looks like (the lecture
says: don't memorise the formula, but **do** remember the shape), and how to read its
{{term upper α quantile | 上α分位点}} from a table.

You need: the normal distribution and $\Phi$ (Lesson 2.4); sums of independent normal
variables are normal (Lesson 3.7); $E$, $D$ and their rules (Lessons 4.1–4.3); and simple random
samples (Lesson 6.1).

## The χ² distribution

Take $n$ independent standard normal variables and add up their squares. Each square is
non-negative, usually small (a standard normal is mostly within $\pm 2$) and occasionally
large. The sum is a random, non-negative number that grows with $n$. That sum is the
$\chi^2$ variable — think of it as "squared distance from the origin of a random point in
$n$ dimensions".

::: define Chi-square distribution | χ² 分布
Let $X_1, X_2, \cdots, X_n$ be independent and identically distributed with
$X_i \sim N(0,1)$. The distribution of
$$\chi^2 = X_1^2 + X_2^2 + \cdots + X_n^2$$
is the **$\chi^2$ distribution with $n$ degrees of freedom**, written $\chi^2 \sim \chi^2(n)$.
:::

The {{term degrees of freedom | 自由度}} $n$ counts the independent standard normals that
are squared. Two questions from the lecture make this concrete.

**Question (1).** If $X \sim N(0,1)$, then $X^2 \sim \chi^2(1)$: one square, one degree of
freedom.

**Question (2).** Take $X_1, \ldots, X_n$, their mean $\bar X = \frac1n\sum X_i$ and the
deviations $Y_i = X_i - \bar X$. Is the number of degrees of freedom of $Y_1, \ldots, Y_n$
equal to $n$? **No — it is $n - 1$.** The deviations always add up to zero,
$\sum Y_i = \sum X_i - n\bar X = 0$, so once $n - 1$ of them are known the last is fixed:
only $n - 1$ of them are free. This is why, for a normal sample, the sum of squared
deviations $\sum (X_i - \bar X)^2/\sigma^2$ has the $\chi^2(n-1)$ distribution, not
$\chi^2(n)$ (Lesson 6.3 states and uses this), and it is the same $n - 1$ as in $S^2$
(Lesson 6.1).

::: callout pitfall Independent, standard and normal — all three
$\chi^2(n)$ needs the $X_i$ to be **independent**, **normal** and **standard** ($N(0,1)$).
If $X_i \sim N(0, \sigma^2)$, standardise first: $\sum X_i^2/\sigma^2 \sim \chi^2(n)$. If
$X_i \sim N(\mu, \sigma^2)$, use $\sum (X_i - \mu)^2/\sigma^2 \sim \chi^2(n)$. A sum of
squares of non-standard normals is not $\chi^2$ until it has been scaled.
:::

### The density and its shape

::: formula Chi-square density | χ² 分布的概率密度
$$p(x) = \begin{cases} \dfrac{1}{2^{n/2}\,\Gamma\!\left(\frac n2\right)}\, x^{\frac n2 - 1} e^{-\frac x2}, & x > 0,\\[2mm] 0, & x \le 0 \end{cases}$$
--
n | degrees of freedom (a positive integer) |
\Gamma | the gamma function (below) |
:::

What to remember is the picture: the density is zero for $x \le 0$ (a sum of squares
can't be negative), rises to a single peak not far right of the origin, then falls with a
long tail to the right — it is **skewed to the right**. For $n = 1$ and $n = 2$ the curve
starts high at the left and only falls; for $n \ge 3$ it starts at 0 and peaks at
$x = n - 2$. As $n$ grows, the hump moves right (its mean is $n$, below) and spreads out.
For $n = 2$ the density is $\frac12 e^{-x/2}$: $\chi^2(2)$ is the exponential distribution
$E(\frac12)$.

::: plot The χ²(n) density
x: 0 .. 30
y: 0 .. 0.5
xlabel: x
ylabel: p(x)
p(x) = x^(n/2 - 1) e^(-x/2) / (2^(n/2) gamma(n/2))
slider n: 1 .. 20 = 4 | | step 1
:::

### The Γ function

The density uses the {{term gamma function | Γ函数}}. The lecture marks it as optional
(可以不掌握), but it makes several calculations quick, including the proof of $DX = 2n$
below.

::: formula The gamma function | Γ 函数
$$\Gamma(s) = \int_0^{+\infty} x^{s-1} e^{-x}\,\d x \ \ (s > 0), \qquad \Gamma(s+1) = s\,\Gamma(s), \qquad \Gamma(1) = 1, \qquad \Gamma\!\left(\tfrac12\right) = \sqrt\pi, \qquad \Gamma(n) = (n-1)!$$
--
s | any positive number |
n | a positive integer |
:::

$\Gamma(s+1) = s\Gamma(s)$ comes from integrating by parts, and with $\Gamma(1) = 1$ it gives
$\Gamma(n) = (n-1)!$: the gamma function extends the factorial to non-integers. For
half-integers use the same rule down to $\Gamma(\frac12) = \sqrt\pi$, e.g.
$\Gamma(\frac52) = \frac32 \cdot \frac12 \cdot \sqrt\pi = \frac34\sqrt\pi$.

::: example A Gaussian integral by the Γ function
Show that $\int_{-\infty}^{+\infty} e^{-x^2}\,\d x = \sqrt\pi$.
== Use symmetry ==
The integrand is even, so the integral is $2\int_0^{+\infty} e^{-x^2}\,\d x$.
== Substitute t = x² ==
For $x \ge 0$: $x = \sqrt t$, $\d x = \frac{1}{2\sqrt t}\,\d t$, and $t$ runs over $[0, +\infty)$:
$$2\int_0^{+\infty} e^{-t}\,\frac{1}{2\sqrt t}\,\d t = \int_0^{+\infty} t^{-\frac12} e^{-t}\,\d t.$$
== Recognise Γ ==
That is $\Gamma(s)$ with $s - 1 = -\frac12$, i.e. $s = \frac12$: the integral is
$\Gamma(\frac12) = \sqrt\pi$. (It agrees with $\int e^{-t^2/2}\,\d t = \sqrt{2\pi}$ from
Lesson 2.4, after the substitution $x = t/\sqrt2$.)
:::

### Mean, variance and additivity

::: theorem Properties of the χ² distribution | χ² 分布的性质
(1) If $X \sim \chi^2(n)$, then $EX = n$ and $DX = 2n$.

(2) **Additivity** (可加性): if $X \sim \chi^2(n_1)$, $Y \sim \chi^2(n_2)$ and $X$ and $Y$ are
**independent**, then $X + Y \sim \chi^2(n_1 + n_2)$.
:::

::: formula Mean and variance of χ²(n) | χ² 分布的期望与方差
$$X \sim \chi^2(n) \ \Rightarrow\ EX = n, \quad DX = 2n$$
--
n | degrees of freedom |
:::

Additivity is clear from the definition: $X$ is a sum of $n_1$ independent squared
standard normals, $Y$ of $n_2$ more, independent of the first lot, so $X + Y$ is a sum of
$n_1 + n_2$ of them.

::: example Proof that EX = n and DX = 2n
Write $X = X_1^2 + \cdots + X_n^2$ with $X_1, \ldots, X_n$ i.i.d. $N(0,1)$.
== The mean ==
For each $i$, $EX_i^2 = DX_i + (EX_i)^2 = 1 + 0 = 1$, so
$EX = EX_1^2 + \cdots + EX_n^2 = n$.
== The variance needs EXᵢ⁴ ==
The $X_i^2$ are independent, so $DX = DX_1^2 + \cdots + DX_n^2$, and
$DX_i^2 = EX_i^4 - (EX_i^2)^2 = EX_i^4 - 1$. For a standard normal (the integrand is even):
$$EX_i^4 = \int_{-\infty}^{+\infty} \frac{1}{\sqrt{2\pi}} x^4 e^{-\frac{x^2}{2}}\,\d x = \frac{2}{\sqrt{2\pi}}\int_0^{+\infty} x^4 e^{-\frac{x^2}{2}}\,\d x.$$
== Substitute t = x²/2 ==
$x = \sqrt{2t}$, $x^4 = 4t^2$, $\d x = \frac{1}{\sqrt{2t}}\,\d t$:
$$\begin{aligned} EX_i^4 &= \frac{2}{\sqrt{2\pi}}\int_0^{+\infty} 4t^2 e^{-t}\,\frac{1}{\sqrt{2t}}\,\d t = \frac{4}{\sqrt\pi}\int_0^{+\infty} t^{\frac32} e^{-t}\,\d t \\ &= \frac{4}{\sqrt\pi}\,\Gamma\!\left(\tfrac52\right) = \frac{4}{\sqrt\pi}\cdot\frac32\cdot\frac12\,\Gamma\!\left(\tfrac12\right) = \frac{4}{\sqrt\pi}\cdot\frac34\sqrt\pi = 3. \end{aligned}$$
== Conclude ==
$DX_i^2 = 3 - 1 = 2$, so $DX = 2 + 2 + \cdots + 2 = 2n$.
:::

### The upper α quantile

Tests and confidence intervals need cut-off points: "a value so large that $\chi^2$ exceeds
it only 5% of the time". Those are the upper quantiles.

::: define Upper α quantile | 上α分位点
Let $\chi^2 \sim \chi^2(n)$ and $0 < \alpha < 1$. The number $\chi^2_\alpha(n)$ with
$$P\{\chi^2 \ge \chi^2_\alpha(n)\} = \int_{\chi^2_\alpha(n)}^{+\infty} p(x)\,\d x = \alpha$$
is the **upper $\alpha$ quantile** (上α分位数) of $\chi^2(n)$: the area under the density to
its **right** is $\alpha$. The same definition, with the right tail of area $\alpha$, gives
the upper quantiles $t_\alpha(n)$, $F_\alpha(n_1, n_2)$ and $u_\alpha$ below.
:::

So a small $\alpha$ is far out to the right, and $\chi^2_{1-\alpha}(n)$ is on the left: the
area to its **left** is $\alpha$ (the area to its right is $1 - \alpha$). The $\chi^2$ density
isn't symmetric, so $\chi^2_{1-\alpha}(n)$ has to be read from the table separately.

Move the cut-off $c$ below. For $n = 10$, the right tail has area 0.05 at
$c = \chi^2_{0.05}(10) = 18.307$ and area 0.01 at $\chi^2_{0.01}(10) = 23.209$; the
left tail has area 0.05 at $\chi^2_{0.95}(10) = 3.940$.

::: plot Upper α quantile of χ²(10): the shaded tail has area α
x: 0 .. 35
xlabel: x
p(x) = x^4 e^(-x/2) / (32 gamma(5))
region Tail: x > c, 0 < y < x^4 e^(-x/2) / (32 gamma(5))
slider c: 0 .. 35 = 18.307 | | cut-off
:::

Tables of the $\chi^2$ distribution list $\chi^2_\alpha(n)$ by row $n$ and column $\alpha$.
A few entries:

| Degrees of freedom $n$ | $\alpha = 0.99$ | $\alpha = 0.95$ | $\alpha = 0.05$ | $\alpha = 0.01$ |
| --- | --- | --- | --- | --- |
| 10 | 2.558 | 3.940 | 18.307 | 23.209 |
| 15 | 5.229 | 7.261 | 24.996 | 30.578 |
| 20 | 8.260 | 10.851 | 31.410 | 37.566 |

::: example Table lookups for χ²
Find (1) $\chi^2_{0.95}(20)$ and (2) $\chi^2_{0.01}(10)$.
== Look them up ==
(1) Row $n = 20$, column $0.95$: $\chi^2_{0.95}(20) = 10.851 \approx 10.9$.
(2) Row $n = 10$, column $0.01$: $\chi^2_{0.01}(10) = 23.209 \approx 23.2$.
== Read them ==
A $\chi^2(20)$ variable is below 10.9 only 5% of the time (its mean is 20); a $\chi^2(10)$
variable exceeds 23.2 only 1% of the time (its mean is 10).
:::

## The t distribution

Standardise a normal mean with the true $\sigma$ and you get $N(0,1)$. In practice $\sigma$
is unknown and we divide by an estimate built from a $\chi^2$ variable instead. The extra
randomness in the denominator makes the result a little more spread out than $N(0,1)$:
that is the $t$ distribution, found by W. S. Gosset, who published under the name
"Student".

::: define t distribution | t 分布
Let $X \sim N(0,1)$ and $Y \sim \chi^2(n)$, with $X$ and $Y$ **independent**. The
distribution of
$$T = \frac{X}{\sqrt{Y/n}}$$
is the **$t$ distribution with $n$ degrees of freedom** (also Student's distribution,
学生氏分布), written $T \sim t(n)$.
:::

Since $EY = n$, the denominator $\sqrt{Y/n}$ is typically near 1, which is why $T$ looks
like $X$.

::: formula t density | t 分布的概率密度
$$p(x) = \frac{\Gamma\!\left(\frac{n+1}{2}\right)}{\sqrt{n\pi}\,\Gamma\!\left(\frac n2\right)}\left(1 + \frac{x^2}{n}\right)^{-\frac{n+1}{2}}, \qquad -\infty < x < +\infty$$
--
n | degrees of freedom |
:::

Again, remember the shape, not the formula: a bell, **symmetric about $x = 0$**, with its
peak at 0 — it looks like the standard normal curve, but lower in the middle and with
heavier tails. As $n$ grows, $t(n)$ approaches $N(0,1)$; for large $n$ (tables stop around
$n = 45$) the two are practically the same. Compare with the grey standard normal curve:

::: plot The t(n) density against N(0, 1)
x: -5 .. 5
xlabel: x
ylabel: p(x)
p(x) = gamma((n + 1)/2) / (sqrt(n pi) gamma(n/2)) (1 + x^2/n)^(-(n + 1)/2)
φ(x) = e^(-x^2/2) / sqrt(2 pi)
slider n: 1 .. 40 = 3 | | step 1
:::

### Upper quantiles and symmetry

$t_\alpha(n)$ is defined by $P\{T > t_\alpha(n)\} = \int_{t_\alpha(n)}^{+\infty} p(x)\,\d x = \alpha$.
Because the density is symmetric about 0, the left tail beyond $-t_\alpha(n)$ also has area
$\alpha$, so the point with right-tail area $1 - \alpha$ is $-t_\alpha(n)$:

::: formula Symmetry of t quantiles | t 分布分位点的对称性
$$t_{1-\alpha}(n) = -t_\alpha(n)$$
--
t_\alpha(n) | upper α quantile of t(n): P{T > t_α(n)} = α |
:::

Tables therefore list only small $\alpha$. A few entries:

| Degrees of freedom $n$ | $\alpha = 0.10$ | $\alpha = 0.05$ | $\alpha = 0.025$ | $\alpha = 0.01$ |
| --- | --- | --- | --- | --- |
| 10 | 1.372 | 1.812 | 2.228 | 2.764 |
| 15 | 1.341 | 1.753 | 2.131 | 2.602 |
| 20 | 1.325 | 1.725 | 2.086 | 2.528 |

::: plot The two tails of t(10): areas α beyond ±t_α(10)
x: -5 .. 5
xlabel: x
p(x) = gamma(5.5) / (sqrt(10 pi) gamma(5)) (1 + x^2/10)^(-5.5)
region Tails: abs(x) > c, 0 < y < gamma(5.5) / (sqrt(10 pi) gamma(5)) (1 + x^2/10)^(-5.5)
slider c: 0 .. 4 = 1.812 | | t_α(10)
:::

::: example Table lookups for t
Find (1) $t_{0.05}(10)$, (2) $t_{0.1}(10)$, (3) $t_{0.95}(20)$.
== Small α: read directly ==
(1) $t_{0.05}(10) = 1.812$. (2) $t_{0.1}(10) = 1.372$.
== Large α: use symmetry ==
(3) $t_{0.95}(20) = -t_{0.05}(20) = -1.725$.
:::

### The standard normal's upper quantile

The same idea for $N(0,1)$ gives $u_\alpha$, used constantly in Units 7 and 8.

::: define Upper α quantile of the standard normal | 标准正态分布的上α分位点
For $X \sim N(0,1)$ and $0 < \alpha < 1$, the number $u_\alpha$ with $P\{X > u_\alpha\} = \alpha$
is the upper $\alpha$ quantile of the standard normal. Equivalently $\Phi(u_\alpha) = 1 - \alpha$.
By symmetry $u_{1-\alpha} = -u_\alpha$.
:::

The two values to know: $u_{0.05} = 1.645$ ($\Phi(1.645) = 0.95$) and $u_{0.025} = 1.96$
($\Phi(1.96) = 0.975$).

::: example In-class question: P{|X| < x} = α
$X \sim N(0,1)$ and $u_\alpha$ is its upper $\alpha$ quantile. If $P\{|X| < x\} = \alpha$ with
$x > 0$, then $x$ is (A) $u_{\alpha/2}$, (B) $u_{1-\alpha/2}$, (C) $u_{(1-\alpha)/2}$, (D) $u_{1-\alpha}$.
== Draw it ==
The middle strip $(-x, x)$ has area $\alpha$, so the two tails together have area $1 - \alpha$,
and by symmetry each tail has $\frac{1-\alpha}{2}$.
== Read off the quantile ==
The right tail beyond $x$ has area $\frac{1-\alpha}{2}$, so $x = u_{(1-\alpha)/2}$: answer **C**.
(By formula: $2\Phi(x) - 1 = \alpha$ gives $\Phi(x) = 1 - \frac{1-\alpha}{2}$.)
:::

::: callout pitfall Upper quantiles are about the right tail
In this course the subscript is the area to the **right**: $u_{0.05} = 1.645$, not $-1.645$.
Some books use lower quantiles (area to the left). When a strip in the middle has area
$\alpha$, each tail has $\frac{1-\alpha}{2}$; when the two tails together have area $\alpha$,
the cut-offs are $\pm u_{\alpha/2}$.
:::

## The F distribution

Comparing the variability of two groups means comparing two sums of squares, i.e. two
$\chi^2$ variables. Dividing each by its degrees of freedom puts them on the same scale
(each then has mean 1), and their ratio is the $F$ variable.

::: define F distribution | F 分布
Let $X \sim \chi^2(n_1)$ and $Y \sim \chi^2(n_2)$, with $X$ and $Y$ **independent**. The
distribution of
$$F = \frac{X/n_1}{Y/n_2}$$
is the **$F$ distribution** with first degrees of freedom $n_1$ (the numerator's) and
second degrees of freedom $n_2$ (the denominator's), written $F \sim F(n_1, n_2)$.
:::

::: formula F density | F 分布的概率密度
$$p(x) = \begin{cases} \dfrac{\Gamma\!\left(\frac{n_1+n_2}{2}\right)}{\Gamma\!\left(\frac{n_1}{2}\right)\Gamma\!\left(\frac{n_2}{2}\right)}\left(\dfrac{n_1}{n_2}\right)^{\frac{n_1}{2}} x^{\frac{n_1}{2}-1}\left(1 + \dfrac{n_1}{n_2}x\right)^{-\frac{n_1+n_2}{2}}, & x > 0,\\[2mm] 0, & x \le 0 \end{cases}$$
--
n_1 | first degrees of freedom (numerator) |
n_2 | second degrees of freedom (denominator) |
:::

The shape, which is what to remember, is like the $\chi^2$ density: zero for $x \le 0$, one
peak, a long right tail. The order of the degrees of freedom matters: $F(5, 10)$ and
$F(10, 5)$ are different distributions. In the plot, $m$ is $n_1$ and $k$ is $n_2$.

::: plot The F(n₁, n₂) density
x: 0 .. 5
y: 0 .. 1.2
xlabel: x
ylabel: p(x)
p(x) = gamma((m + k)/2) / (gamma(m/2) gamma(k/2)) (m/k)^(m/2) x^(m/2 - 1) (1 + m x / k)^(-(m + k)/2)
slider m: 1 .. 30 = 5 | | step 1
slider k: 1 .. 30 = 10 | | step 1
:::

### Reciprocals and the link with t

Two facts follow straight from the definition. Turning the fraction upside down swaps the
roles of numerator and denominator:
$$F = \frac{X/n_1}{Y/n_2} \sim F(n_1, n_2) \ \Rightarrow\ \frac1F = \frac{Y/n_2}{X/n_1} \sim F(n_2, n_1).$$
And a squared $t$ variable is an $F$ variable:

::: theorem The square of a t variable | t 分布与 F 分布的关系
If $T \sim t(n)$, then $T^2 \sim F(1, n)$ and $\dfrac{1}{T^2} \sim F(n, 1)$.
:::

::: example Proof that T² ~ F(1, n)
== Write T from its definition ==
$T = \dfrac{X}{\sqrt{Y/n}}$ with $X \sim N(0,1)$ and $Y \sim \chi^2(n)$ independent, so
$$T^2 = \frac{X^2}{Y/n} = \frac{X^2/1}{Y/n}.$$
== Recognise the pieces ==
$X^2 \sim \chi^2(1)$ (Question (1) above), and $X^2$ is independent of $Y$ because $X$ is.
So $T^2$ is a $\chi^2(1)$ over 1, divided by an independent $\chi^2(n)$ over $n$: by
definition $T^2 \sim F(1, n)$.
== The reciprocal ==
$\dfrac{1}{T^2} = \dfrac{Y/n}{X^2/1} \sim F(n, 1)$.
:::

### Upper quantiles of F

$F_\alpha(n_1, n_2)$ is defined by $P\{F > F_\alpha(n_1, n_2)\} = \int_{F_\alpha(n_1,n_2)}^{+\infty} p(x)\,\d x = \alpha$.
Tables list only small $\alpha$ (0.1, 0.05, 0.025, 0.01…); for $\alpha$ near 1 use:

::: formula Reciprocal property of F quantiles | F 分布分位点的性质
$$F_{1-\alpha}(n_1, n_2) = \frac{1}{F_\alpha(n_2, n_1)}$$
--
F_\alpha(n_1, n_2) | upper α quantile of F(n₁, n₂) |
n_2, n_1 | note the degrees of freedom swap places |
:::

::: example Why the reciprocal property holds
== Start from the definition ==
With $F \sim F(n_1, n_2)$: $P\{F > F_{1-\alpha}(n_1, n_2)\} = 1 - \alpha$, so
$P\{F \le F_{1-\alpha}(n_1, n_2)\} = \alpha$.
== Take reciprocals ==
$F > 0$, so $F \le c$ is the same event as $\frac1F \ge \frac1c$:
$$P\left\{\frac1F \ge \frac{1}{F_{1-\alpha}(n_1, n_2)}\right\} = \alpha.$$
== Recognise the quantile ==
$\frac1F \sim F(n_2, n_1)$, and the point with right-tail area $\alpha$ in $F(n_2, n_1)$ is
$F_\alpha(n_2, n_1)$. So $\frac{1}{F_{1-\alpha}(n_1, n_2)} = F_\alpha(n_2, n_1)$.
:::

::: example Table lookups for F
Find (1) $F_{0.01}(5, 4)$ and (2) $F_{0.95}(3, 7)$.
== Small α: read directly ==
(1) The $\alpha = 0.01$ table, $n_1 = 5$, $n_2 = 4$: $F_{0.01}(5, 4) = 15.52 \approx 15.5$.
== Large α: swap and invert ==
(2) $F_{0.95}(3, 7) = \dfrac{1}{F_{0.05}(7, 3)} = \dfrac{1}{8.89} = 0.1125$ (from the $\alpha = 0.05$
table, $n_1 = 7$, $n_2 = 3$).
:::

::: callout pitfall Swap the degrees of freedom too
$F_{0.95}(3, 7)$ is $1/F_{0.05}(7, 3)$, **not** $1/F_{0.05}(3, 7)$ ($= 1/4.35$). Taking the
reciprocal turns the fraction upside down, so the numerator's and denominator's degrees of
freedom change places as well.
:::

## Recognising χ², t and F variables

Exams love "find the constant that makes this a $\chi^2$ (or $F$) variable". The recipe is
always the same:

1. A linear combination of independent normals is normal (Lesson 3.7): find its mean and
   variance.
2. Standardise it, so it is $N(0,1)$; its square is $\chi^2(1)$.
3. Add independent squares (additivity) to get $\chi^2(k)$; divide independent $\chi^2$'s by
   their degrees of freedom to get $F$; a standard normal over the root of an independent
   $\chi^2/k$ is $t(k)$. Pieces built from different sample variables are independent.

::: example Example 1: making a χ² variable
The population is $X \sim N(0,1)$ and $X_1, \ldots, X_6$ is a simple random sample. Let
$Y = (X_1 + X_2 + X_3)^2 + (X_4 + X_5 + X_6)^2$. Find the constant $C$ for which $CY$ has a
$\chi^2$ distribution.
== Each bracket is normal ==
$E(X_1 + X_2 + X_3) = 0$ and, by independence, $D(X_1 + X_2 + X_3) = 1 + 1 + 1 = 3$, so
$X_1 + X_2 + X_3 \sim N(0, 3)$; likewise $X_4 + X_5 + X_6 \sim N(0, 3)$.
== Standardise ==
$\dfrac{X_1 + X_2 + X_3}{\sqrt3} \sim N(0,1)$, so $\left(\dfrac{X_1 + X_2 + X_3}{\sqrt3}\right)^2 = \dfrac13(X_1 + X_2 + X_3)^2 \sim \chi^2(1)$,
and the same for the second bracket.
== Add ==
The two brackets use different $X_i$, so they are independent, and by additivity
$$\frac13 Y = \frac13(X_1 + X_2 + X_3)^2 + \frac13(X_4 + X_5 + X_6)^2 \sim \chi^2(2).$$
So $C = \frac13$, and $CY \sim \chi^2(2)$.
== The lecture's second way ==
We need $\sqrt C(X_1 + X_2 + X_3) \sim N(0,1)$: mean 0 already, and variance
$C(DX_1 + DX_2 + DX_3) = 3C = 1$, so $C = \frac13$.
:::

::: example Example 2: two constants
$X_1, X_2, X_3, X_4$ is a simple random sample from the normal population $N(0, 4)$. Let
$X = a(X_1 - 2X_2)^2 + b(3X_3 - 4X_4)^2$. For which $a$, $b$ does $X$ have a $\chi^2$ distribution?
== The first bracket ==
$E(X_1 - 2X_2) = 0$ and $D(X_1 - 2X_2) = DX_1 + 4DX_2 = 4 + 16 = 20$, so
$X_1 - 2X_2 \sim N(0, 20)$ and $\dfrac{(X_1 - 2X_2)^2}{20} \sim \chi^2(1)$.
== The second bracket ==
$D(3X_3 - 4X_4) = 9 \cdot 4 + 16 \cdot 4 = 100$, so $3X_3 - 4X_4 \sim N(0, 100)$ and
$\dfrac{(3X_3 - 4X_4)^2}{100} \sim \chi^2(1)$.
== Add ==
The brackets are independent, so with $a = \frac{1}{20}$ and $b = \frac{1}{100}$,
$X \sim \chi^2(2)$.
:::

::: callout note Example 2's conclusion
The slide stops after the two brackets. The conclusion $a = \frac1{20}$, $b = \frac1{100}$,
$X \sim \chi^2(2)$ follows from its working, as above. (Variance multiplies by the
**square** of a coefficient: $D(-2X_2) = 4DX_2$, not $-2DX_2$.)
:::

::: example Example 3: making an F variable
The population is $X \sim N(0, \sigma^2)$ and $X_1, \ldots, X_{10}$ is a simple random sample.
Find $a$ and $b$ with
$$F = a\,\frac{X_1^2 + X_2^2 + X_3^2 + X_4^2}{X_5^2 + X_6^2 + \cdots + X_{10}^2} \sim F(4, b).$$
== Standardise ==
$\dfrac{X_i}{\sigma} \sim N(0,1)$, so $\dfrac{X_i^2}{\sigma^2} \sim \chi^2(1)$.
== Two independent χ² ==
$\dfrac{X_1^2 + \cdots + X_4^2}{\sigma^2} \sim \chi^2(4)$ and
$\dfrac{X_5^2 + \cdots + X_{10}^2}{\sigma^2} \sim \chi^2(6)$, independent (different variables).
== Divide each by its degrees of freedom ==
$$\frac{\dfrac{X_1^2 + \cdots + X_4^2}{4\sigma^2}}{\dfrac{X_5^2 + \cdots + X_{10}^2}{6\sigma^2}} = \frac{6(X_1^2 + \cdots + X_4^2)}{4(X_5^2 + \cdots + X_{10}^2)} \sim F(4, 6).$$
The unknown $\sigma^2$ cancels.
== Read off ==
$a = \frac64 = \frac32$ and $b = 6$.
:::

::: example Example 4: making a t variable
The population is $X \sim N(0,1)$ and $X_1, \ldots, X_5$ is a simple random sample. Find $c$
with $\dfrac{c(X_1 + X_2)}{\sqrt{X_3^2 + X_4^2 + X_5^2}} \sim t(3)$.
== The numerator ==
$X_1 + X_2 \sim N(0, 2)$, so $\dfrac{X_1 + X_2}{\sqrt2} \sim N(0,1)$.
== The denominator ==
$X_3^2 + X_4^2 + X_5^2 \sim \chi^2(3)$, independent of $X_1 + X_2$.
== Build T ==
$$T = \frac{(X_1 + X_2)/\sqrt2}{\sqrt{(X_3^2 + X_4^2 + X_5^2)/3}} = \frac{\sqrt3}{\sqrt2}\cdot\frac{X_1 + X_2}{\sqrt{X_3^2 + X_4^2 + X_5^2}} \sim t(3),$$
so $c = \sqrt{3/2} = \frac{\sqrt6}{2} \approx 1.225$.
:::

::: callout exam What exams ask
(1) Constants that make an expression $\chi^2$, $t$ or $F$, and its degrees of freedom
(Examples 1–4). (2) Facts: $EX = n$, $DX = 2n$ for $\chi^2(n)$, additivity, $T^2 \sim F(1, n)$,
$1/F \sim F(n_2, n_1)$. (3) Quantiles: $t_{1-\alpha}(n) = -t_\alpha(n)$,
$F_{1-\alpha}(n_1, n_2) = 1/F_\alpha(n_2, n_1)$, $\Phi(u_\alpha) = 1 - \alpha$, and which quantile
a two-sided strip gives (the in-class question). Exams give the table values you need.
:::

::: callout summary The three distributions in three lines
$\chi^2(n)$: a sum of $n$ independent squared $N(0,1)$; right-skewed; mean $n$, variance $2n$;
additive. $t(n)$: $N(0,1)$ over $\sqrt{\chi^2(n)/n}$, independent; symmetric bell, heavier
tails, $\to N(0,1)$; $t_{1-\alpha} = -t_\alpha$. $F(n_1, n_2)$: $\frac{\chi^2(n_1)/n_1}{\chi^2(n_2)/n_2}$,
independent; right-skewed; $T^2 \sim F(1, n)$, $F_{1-\alpha}(n_1, n_2) = 1/F_\alpha(n_2, n_1)$.
:::

::: cards The χ², t and F distributions
Definition of χ²(n) :: $X_1^2 + \cdots + X_n^2$ with $X_1, \ldots, X_n$ i.i.d. $N(0,1)$.
Shape of the χ² density :: Zero for $x \le 0$, one peak near the left, long right tail (right-skewed).
Mean and variance of χ²(n) :: $EX = n$, $DX = 2n$.
Additivity of χ² :: Independent $\chi^2(n_1)$ and $\chi^2(n_2)$ add to $\chi^2(n_1 + n_2)$.
Degrees of freedom of the deviations Xᵢ − X̄ :: $n - 1$, because $\sum (X_i - \bar X) = 0$.
Gamma function facts :: $\Gamma(s+1) = s\Gamma(s)$, $\Gamma(1) = 1$, $\Gamma(\frac12) = \sqrt\pi$, $\Gamma(n) = (n-1)!$.
Definition of t(n) :: $T = \frac{X}{\sqrt{Y/n}}$, $X \sim N(0,1)$, $Y \sim \chi^2(n)$, independent.
Shape of the t density :: Symmetric bell about 0, heavier tails than $N(0,1)$; approaches $N(0,1)$ as $n$ grows.
Symmetry of t quantiles :: $t_{1-\alpha}(n) = -t_\alpha(n)$.
Upper quantile of the standard normal :: $P\{X > u_\alpha\} = \alpha$, $\Phi(u_\alpha) = 1 - \alpha$; $u_{0.05} = 1.645$, $u_{0.025} = 1.96$.
Definition of F(n₁, n₂) :: $F = \frac{X/n_1}{Y/n_2}$, $X \sim \chi^2(n_1)$, $Y \sim \chi^2(n_2)$, independent.
Square of a t(n) variable :: $T^2 \sim F(1, n)$, and $1/T^2 \sim F(n, 1)$.
Reciprocal of an F variable :: $F \sim F(n_1, n_2) \Rightarrow 1/F \sim F(n_2, n_1)$.
Reciprocal property of F quantiles :: $F_{1-\alpha}(n_1, n_2) = \frac{1}{F_\alpha(n_2, n_1)}$.
Upper α quantile (meaning) :: The point with area $\alpha$ to its right under the density.
:::

::: quiz The χ², t and F distributions
? (In-class question 22-054) $X \sim N(0,1)$ and $P\{X > u_\alpha\} = \alpha$. If $P\{|X| < x\} = \alpha$ with $x > 0$, then $x =$
- [ ] $u_{\alpha/2}$
- [ ] $u_{1-\alpha/2}$
- [x] $u_{(1-\alpha)/2}$
- [ ] $u_{1-\alpha}$
> The strip $(-x, x)$ has area $\alpha$, so the two tails share $1 - \alpha$ and each has
> $\frac{1-\alpha}{2}$. The right tail beyond $x$ has area $\frac{1-\alpha}{2}$, so $x = u_{(1-\alpha)/2}$.

? (Question 22-038) $X_1, \ldots, X_n$ have mean $\bar X$ and $Y_i = X_i - \bar X$. How many degrees of freedom do $Y_1, \ldots, Y_n$ have?
- [ ] $n$
- [x] $n - 1$
- [ ] $n + 1$
- [ ] $1$
> $\sum Y_i = \sum X_i - n\bar X = 0$, so any $n - 1$ of the $Y_i$ determine the last one:
> only $n - 1$ are free.

? $X \sim \chi^2(10)$. Find $DX$.
answer: 20
> $DX = 2n = 20$ (and $EX = n = 10$).

? $X \sim \chi^2(3)$ and $Y \sim \chi^2(5)$ are independent. Find $E(X + Y)^2$, i.e. $E[(X+Y)^2]$.
answer: 80
> By additivity $X + Y \sim \chi^2(8)$, so $E(X+Y) = 8$ and $D(X+Y) = 16$;
> $E(X+Y)^2 = D(X+Y) + [E(X+Y)]^2 = 16 + 64 = 80$.

? Given $t_{0.05}(20) = 1.725$, find $t_{0.95}(20)$.
answer: -1.725
> Symmetry: $t_{1-\alpha}(n) = -t_\alpha(n)$, so $t_{0.95}(20) = -t_{0.05}(20) = -1.725$.

? Given $F_{0.05}(7, 3) = 8.89$, find $F_{0.95}(3, 7)$.
answer: 1/8.89
> $F_{1-\alpha}(n_1, n_2) = 1/F_\alpha(n_2, n_1)$: $F_{0.95}(3, 7) = 1/F_{0.05}(7, 3) = 1/8.89 \approx 0.1125$.

? $T \sim t(n)$. Then $T^2 \sim$
- [ ] $\chi^2(n)$
- [ ] $t(n^2)$
- [x] $F(1, n)$
- [ ] $F(n, 1)$
> $T^2 = \frac{X^2/1}{Y/n}$ with $X^2 \sim \chi^2(1)$ independent of $Y \sim \chi^2(n)$, so
> $T^2 \sim F(1, n)$; it is $1/T^2$ that is $F(n, 1)$.

? (Example 2) $X_1, \ldots, X_4$ are a sample from $N(0, 4)$ and $X = a(X_1 - 2X_2)^2 + b(3X_3 - 4X_4)^2 \sim \chi^2(2)$. Find $a$.
answer: 1/20
> $D(X_1 - 2X_2) = 4 + 4 \cdot 4 = 20$, so $(X_1 - 2X_2)^2/20 \sim \chi^2(1)$: $a = \frac1{20}$
> (and $b = \frac1{100}$, from $D(3X_3 - 4X_4) = 36 + 64 = 100$).

? (Example 3) For a sample $X_1, \ldots, X_{10}$ from $N(0, \sigma^2)$, $a\frac{X_1^2 + \cdots + X_4^2}{X_5^2 + \cdots + X_{10}^2} \sim F(4, b)$. Find $a$.
answer: 3/2
> The numerator over $4\sigma^2$ and the denominator over $6\sigma^2$ give $F(4, 6)$, so the
> constant is $\frac64 = \frac32$ (and $b = 6$).

? $X_1, \ldots, X_5$ is a sample from $N(0,1)$. Find $c > 0$ with $\frac{c(X_1 + X_2)}{\sqrt{X_3^2 + X_4^2 + X_5^2}} \sim t(3)$.
answer: sqrt(6)/2
> $(X_1 + X_2)/\sqrt2 \sim N(0,1)$ and $X_3^2 + X_4^2 + X_5^2 \sim \chi^2(3)$, independent.
> $T = \frac{(X_1+X_2)/\sqrt2}{\sqrt{(X_3^2+X_4^2+X_5^2)/3}}$, so $c = \sqrt3/\sqrt2 = \sqrt6/2 \approx 1.225$.

? Find $\Gamma\left(\frac52\right)$.
answer: 3 sqrt(pi) / 4
> $\Gamma(\frac52) = \frac32\Gamma(\frac32) = \frac32\cdot\frac12\Gamma(\frac12) = \frac34\sqrt\pi \approx 1.329$.

? Which density is symmetric about 0?
- [ ] $\chi^2(n)$
- [x] $t(n)$
- [ ] $F(n_1, n_2)$
- [ ] none of them
> The $t$ density depends on $x$ only through $x^2$, so it is symmetric about 0. The
> $\chi^2$ and $F$ densities are zero for $x \le 0$ and skewed to the right.
:::

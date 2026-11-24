---
title: Expectation of functions and its properties
zh: 随机变量函数的数学期望与期望的性质
summary: How to find E[f(X)] and E[f(X, Y)] straight from the distribution of X or (X, Y) without finding the distribution of the function first, the properties of expectation (constants, linearity, E(XY) = EX·EY for independent variables), and the indicator-variable method.
source: 14数学期望8-2 (§4.1), 2026-10-21; review in 15方差和协方差9-1, 2026-10-26
---

Lesson 4.1 defined the expectation of a random variable from its own distribution. But
many quantities you care about are **functions** of a random variable: the area $X^2$ of
a square whose side $X$ is random, the profit $3X - 10$ when $X$ items sell, the product
$XY$ of two measurements. This lesson gives the two theorems that compute $E[f(X)]$ and
$E[f(X, Y)]$ directly from the distribution you already have, and the rules
(properties) that make most expectations a one-line calculation — above all
**linearity**, which together with the indicator-variable trick solves problems that
would be hopeless by brute force. Variance, covariance and correlation in the rest of the
unit are all expectations of functions, so everything here is used again.

## The expectation of a function of one random variable

Suppose $X$ is known and $Y = f(X)$. One way to find $E(Y)$ is the long way: first find the
distribution of $Y$ (as in Lesson 2.5), then apply the definition. But think about what
an average of $Y$ means. If $X$ takes the value $x_k$ a fraction $p_k$ of the time, then
$Y$ takes the value $f(x_k)$ that same fraction of the time. So the average of $Y$ is
simply $\sum f(x_k)\,p_k$: **apply $f$ to each value, keep the same probabilities**. You
never need the distribution of $Y$.

::: theorem Expectation of a function of a random variable (Theorem 1) | 定理1（随机变量函数的数学期望）
Let $Y = f(X)$ with $f$ continuous.
1. If $X$ is discrete with distribution law $P\{X = x_k\} = p_k$, $k = 1, 2, \cdots$, and
   $\sum_{k=1}^{\infty} |f(x_k)|\,p_k < +\infty$, then
   $$E(Y) = E[f(X)] = \sum_{k=1}^{\infty} f(x_k)\,p_k .$$
2. If $X$ is continuous with density $p(x)$ and
   $\int_{-\infty}^{+\infty} |f(x)|\,p(x)\,\d x < +\infty$, then
   $$E(Y) = E[f(X)] = \int_{-\infty}^{+\infty} f(x)\,p(x)\,\d x .$$
:::

::: formula Expectation of a function of X | 随机变量函数的数学期望
$$E[f(X)] = \sum_k f(x_k)\,p_k \qquad\text{or}\qquad E[f(X)] = \int_{-\infty}^{+\infty} f(x)\,p(x)\,\d x$$
--
f | a continuous function; Y = f(X) |
p_k,\ p(x) | the distribution law or density of X (not of Y) |
:::

The condition with $|f|$ is the same absolute convergence as in Lesson 4.1, now for the
values $f(x_k)$.

::: example Example 1: E(X²) two ways
$X$ has the distribution law below and $Y = X^2$. Find $E(Y)$.

| Value of $X$ | $-2$ | 0 | 2 |
| --- | --- | --- | --- |
| Probability $p_k$ | 0.4 | 0.3 | 0.3 |
== Method 1: find the law of Y first ==
$Y = X^2$ takes the value 0 when $X = 0$ (probability 0.3) and 4 when $X = \pm2$
(probability $0.4 + 0.3 = 0.7$):

| Value of $Y$ | 0 | 4 |
| --- | --- | --- |
| Probability | 0.3 | 0.7 |

So $E(Y) = 0\times0.3 + 4\times0.7 = 2.8$.
== Method 2: Theorem 1 ==
Square each value of $X$ and keep its probability:
$$E(Y) = (-2)^2\times0.4 + 0^2\times0.3 + 2^2\times0.3 = 1.6 + 0 + 1.2 = 2.8 .$$
== Compare ==
Same answer, and Method 2 skipped the step of merging the values $-2$ and $2$.
:::

::: callout pitfall E[f(X)] is not f(E(X))
In Example 1, $E(X) = -0.8 + 0 + 0.6 = -0.2$, so $[E(X)]^2 = 0.04$, but $E(X^2) = 2.8$.
In general $E(X^2) \ne (EX)^2$ and $E(1/X) \ne 1/E(X)$. Only for linear functions does
$E[aX + b] = aE(X) + b$ hold (see the properties below). The gap between $E(X^2)$ and
$(EX)^2$ will turn out to be the variance (Lesson 4.3).
:::

::: example Example 2: a function of an exponential variable
$X$ has the exponential distribution with parameter 1. Find $E(e^{-2X})$.
== The density ==
$p(x) = e^{-x}$ for $x > 0$, and 0 otherwise (Lesson 2.3).
== Theorem 1 ==
$$E(e^{-2X}) = \int_{-\infty}^{+\infty} e^{-2x}p(x)\,\d x = \int_0^{+\infty} e^{-2x}e^{-x}\,\d x = \int_0^{+\infty} e^{-3x}\,\d x = \frac13 .$$
:::

::: example In-class question 19-026: odd powers of a standard normal
$X \sim N(0, 1)$ and $Y = X^3$. Find $E(Y)$.
== Theorem 1 ==
$$E(Y) = \int_{-\infty}^{+\infty} x^3\,\varphi(x)\,\d x, \qquad \varphi(x) = \frac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2}} .$$
== Symmetry ==
$\varphi$ is even and $x^3$ is odd, so $x^3\varphi(x)$ is odd. The integral converges
absolutely (the exponential beats any power), so over the symmetric range it is $0$.
The answer is $E(Y) = 0$.
:::

## The expectation of a function of two random variables

The same idea works for a pair $(X, Y)$ and $Z = f(X, Y)$: apply $f$ to each possible pair
of values and weight it by the joint probability (or joint density). You never need the
distribution of $Z$.

::: theorem Expectation of a function of a random vector (Theorem 2) | 定理2（二维随机变量函数的数学期望）
Let $Z = f(X, Y)$ with $f$ continuous.
1. If $(X, Y)$ is discrete with joint law $P\{X = x_i, Y = y_j\} = p_{ij}$ and
   $\sum_i\sum_j |f(x_i, y_j)|\,p_{ij} < +\infty$, then
   $$E(Z) = E[f(X, Y)] = \sum_{i=1}^{\infty}\sum_{j=1}^{\infty} f(x_i, y_j)\,p_{ij} .$$
2. If $(X, Y)$ is continuous with joint density $p(x, y)$ and
   $\iint |f(x, y)|\,p(x, y)\,\d x\,\d y < +\infty$, then
   $$E(Z) = E[f(X, Y)] = \int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty} f(x, y)\,p(x, y)\,\d x\,\d y .$$
:::

::: formula Expectation of a function of (X, Y) | 二维随机变量函数的数学期望
$$E[f(X, Y)] = \sum_i\sum_j f(x_i, y_j)\,p_{ij} \qquad\text{or}\qquad E[f(X, Y)] = \iint_{\R^2} f(x, y)\,p(x, y)\,\d x\,\d y$$
--
p_{ij} | the joint distribution law of (X, Y) |
p(x, y) | the joint density of (X, Y) (also written f(x, y)) |
:::

In particular, taking $f(x, y) = x$ or $f(x, y) = y$ gives the means of $X$ and $Y$
straight from the joint distribution:
$$E(X) = \sum_i\sum_j x_i\,p_{ij}, \quad E(Y) = \sum_i\sum_j y_j\,p_{ij}; \qquad E(X) = \iint x\,p(x, y)\,\d x\,\d y, \quad E(Y) = \iint y\,p(x, y)\,\d x\,\d y .$$
Summing over $j$ first turns $\sum_i\sum_j x_i p_{ij}$ into $\sum_i x_i p_{i\cdot}$: the
same as using the marginal law (Lesson 3.1). Either route is fine.

### The discrete case

::: example Example 3: means and E[(X − Y)²] from a joint table
$(X, Y)$ has the joint law below (columns are values of $X$, rows values of $Y$; the
margins are added). Find $E(X)$, $E(Y)$ and $E[(X-Y)^2]$.

| $Y$ \ $X$ | $X = 1$ | $X = 2$ | $X = 3$ | Marginal $p_{\cdot j}$ |
| --- | --- | --- | --- | --- |
| $Y = -1$ | 0.2 | 0.1 | 0 | 0.3 |
| $Y = 0$ | 0.1 | 0 | 0.3 | 0.4 |
| $Y = 1$ | 0.1 | 0.1 | 0.1 | 0.3 |
| Marginal $p_{i\cdot}$ | 0.4 | 0.2 | 0.4 | 1 |
== Method 1: through the marginals and the law of (X − Y)² ==
$E(X) = 1(0.4) + 2(0.2) + 3(0.4) = 2$ and $E(Y) = -1(0.3) + 0(0.4) + 1(0.3) = 0$.
For $(X - Y)^2$, work out its value in each cell and collect equal values: cell
$(1,1)$ gives 0; cells $(1,0)$, $(2,1)$ give 1; cells $(1,-1)$, $(2,0)$, $(3,1)$ give 4;
cells $(2,-1)$, $(3,0)$ give 9; cell $(3,-1)$ gives 16:

| Value of $(X-Y)^2$ | 0 | 1 | 4 | 9 | 16 |
| --- | --- | --- | --- | --- | --- |
| Probability | 0.1 | 0.2 | 0.3 | 0.4 | 0 |

So $E[(X-Y)^2] = 0 + 0.2 + 1.2 + 3.6 + 0 = 5$.
== Method 2: Theorem 2, cell by cell ==
Go through the nine cells, multiplying $f(x_i, y_j)$ by $p_{ij}$:
$$\begin{aligned}E(X) &= 1(0.2 + 0.1 + 0.1) + 2(0.1 + 0 + 0.1) + 3(0 + 0.3 + 0.1) = 2,\\ E(Y) &= -1(0.2 + 0.1 + 0) + 0(\cdots) + 1(0.1 + 0.1 + 0.1) = 0,\\ E[(X-Y)^2] &= 2^2(0.2) + 3^2(0.1) + 4^2(0) + 1^2(0.1) + 2^2(0) + 3^2(0.3)\\ &\quad + 0^2(0.1) + 1^2(0.1) + 2^2(0.1) = 5 .\end{aligned}$$
:::

::: example In-class question 19-030: unknowns from E(XY)
$(X, Y)$ takes the values $(1,0)$, $(1,1)$, $(2,0)$, $(2,1)$ with probabilities $0.4$,
$0.2$, $a$, $b$, and $E(XY) = 0.8$. Find $a$ and $b$.
== Theorem 2 ==
$$E(XY) = 1\cdot0\cdot0.4 + 1\cdot1\cdot0.2 + 2\cdot0\cdot a + 2\cdot1\cdot b = 0.2 + 2b = 0.8,$$
so $b = 0.3$.
== Probabilities add up to 1 ==
$0.4 + 0.2 + a + 0.3 = 1$, so $a = 0.1$.
:::

### The continuous case

::: example Example 4: E(XY) for a density on the unit square
$(X, Y)$ has joint density $f(x, y) = x + y$ for $0 \le x \le 1$, $0 \le y \le 1$, and 0
otherwise. Find $E(XY)$.
== Theorem 2 ==
$$E(XY) = \int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty} xy\,f(x, y)\,\d x\,\d y = \int_0^1\int_0^1 xy(x + y)\,\d x\,\d y .$$
== Integrate ==
$$\int_0^1\int_0^1 (x^2y + xy^2)\,\d x\,\d y = \frac13\cdot\frac12 + \frac12\cdot\frac13 = \frac16 + \frac16 = \frac13 .$$
:::

::: example Example 5: a uniform distribution on a triangle
$(X, Y)$ is uniform on the triangle $A$ bounded by the $x$-axis, the $y$-axis and the line
$x + \frac y2 = 1$. Find $E(X)$, $E(Y)$, $E(X + Y)$ and $E(XY)$.
== The density ==
The line meets the axes at $(1, 0)$ and $(0, 2)$, so $A$ has area $\frac12\cdot1\cdot2 = 1$
and the uniform density (Lesson 3.3) is $f(x, y) = 1$ on $A$, 0 elsewhere. For each $x$ in
$[0, 1]$, $y$ runs from 0 up to the line, $y = 2 - 2x$.
== E(X) and E(Y) ==
$$E(X) = \int_0^1\d x\int_0^{2-2x} x\,\d y = \int_0^1 x(2-2x)\,\d x = 1 - \frac23 = \frac13,$$
$$E(Y) = \int_0^1\d x\int_0^{2-2x} y\,\d y = \int_0^1 \frac{(2-2x)^2}{2}\,\d x = 2\int_0^1 (1-x)^2\,\d x = \frac23 .$$
== E(X + Y) ==
$$E(X+Y) = \int_0^1\d x\int_0^{2-2x} (x + y)\,\d y = \frac13 + \frac23 = 1 .$$
(It equals $E(X) + E(Y)$; that's no accident, see linearity below.)
== E(XY) ==
$$E(XY) = \int_0^1\d x\int_0^{2-2x} xy\,\d y = \int_0^1 x\cdot\frac{(2-2x)^2}{2}\,\d x = 2\int_0^1 x(1-x)^2\,\d x = 2\cdot\frac1{12} = \frac16 .$$
Note $E(X)E(Y) = \frac29 \ne \frac16$: $X$ and $Y$ are not independent here.
:::

::: plot Example 5: the triangle A under the line x + y/2 = 1
x: -0.2 .. 1.4
y: -0.2 .. 2.4
xlabel: x
ylabel: y
region A: x > 0, y > 0, 2 x + y < 2
f(x) = 2 - 2 x
:::

::: callout tip Set up the limits from the picture
For a density that lives on a region, draw the region first. Then write the inner
integral's limits as "for this $x$, $y$ runs from … to …" (here $0$ to $2 - 2x$). Most
errors in these questions are limits, not integration.
:::

::: example In-class question 19-036: E(XY) for independent exponentials
$(X, Y)$ has joint density $f(x, y) = e^{-(x+y)}$ for $x > 0$, $y > 0$, and 0 otherwise.
Find $E(XY)$.
== Theorem 2 ==
$$E(XY) = \int_0^{+\infty}\int_0^{+\infty} xy\,e^{-x}e^{-y}\,\d x\,\d y .$$
== Separate ==
The integrand is a product of a function of $x$ and a function of $y$, so
$$E(XY) = \int_0^{+\infty} x e^{-x}\,\d x\cdot\int_0^{+\infty} y e^{-y}\,\d y = 1\cdot1 = 1,$$
each factor being the mean of $E(1)$. The answer is D, 1.
:::

::: callout pitfall The joint density, not the product of marginals
$E(XY) = \iint xy\,f(x, y)\,\d x\,\d y$ uses the **joint** density. Replacing
$f(x, y)$ by $f_X(x)f_Y(y)$ is correct only when $X$ and $Y$ are independent (Lesson 3.5).
In-class question 19-035 tests exactly this; in 19-036 the density does factorise, which
is why separating was allowed.
:::

## Properties of expectation

Several rules follow from the theorems above. They hold whenever the expectations
involved exist, and they let you avoid most integrals.

::: theorem Properties of expectation | 数学期望的性质
1. If $C$ is a constant, $E(C) = C$.
2. If $C$ is a constant, $E(CX) = C\,E(X)$.
3. $E(X + Y) = E(X) + E(Y)$, and more generally
   $E(X_1 + X_2 + \cdots + X_n) = E(X_1) + E(X_2) + \cdots + E(X_n)$.
4. If $X$ and $Y$ are **independent**, $E(XY) = E(X)\,E(Y)$. The converse is false.
:::

Combining 2 and 3 gives the most used rule of all.

::: formula Linearity of expectation | 数学期望的线性性
$$E(C_1X_1 + C_2X_2 + \cdots + C_nX_n) = C_1E(X_1) + C_2E(X_2) + \cdots + C_nE(X_n)$$
--
X_1, \ldots, X_n | any random variables (no independence needed) |
C_1, \ldots, C_n | constants |
:::

In particular $E(aX + b) = aE(X) + b$.

::: formula Product of independent random variables | 独立随机变量乘积的数学期望
$$X, Y \text{ independent} \ \Rightarrow\ E(XY) = E(X)\,E(Y)$$
--
X, Y | independent random variables with expectations |
:::

Why they hold (continuous case; the discrete case is the same with sums):

- **1 and 2.** A constant $C$ is a variable that takes one value with probability 1, so
  $E(C) = C\cdot1$. And $E(CX) = \int Cx\,p(x)\,\d x = C\int x\,p(x)\,\d x$.
- **3.** By Theorem 2 with $f(x, y) = x + y$:
  $$E(X + Y) = \iint (x + y)\,p(x, y)\,\d x\,\d y = \iint x\,p(x, y)\,\d x\,\d y + \iint y\,p(x, y)\,\d x\,\d y = E(X) + E(Y).$$
  Nothing about independence was used: linearity holds for **any** $X$ and $Y$.
- **4.** If $X$, $Y$ are independent, $p(x, y) = p_X(x)\,p_Y(y)$ (Lesson 3.5), so
  $$E(XY) = \iint xy\,p_X(x)p_Y(y)\,\d x\,\d y = \int x\,p_X(x)\,\d x\cdot\int y\,p_Y(y)\,\d y = E(X)E(Y).$$

::: example The converse of property 4 is false
Let $X$ take the values $-1, 0, 1$ with probability $\frac13$ each, and let $Y = X^2$.
Show that $E(XY) = E(X)E(Y)$ although $X$ and $Y$ are not independent.
== The expectations ==
$E(X) = \frac13(-1 + 0 + 1) = 0$, and $XY = X^3$ takes the same values as $X$, so
$E(XY) = 0$. Hence $E(XY) = 0 = E(X)E(Y)$.
== Not independent ==
$P\{X = 0, Y = 1\} = 0$ (if $X = 0$ then $Y = 0$), but
$P\{X = 0\}P\{Y = 1\} = \frac13\cdot\frac23 \ne 0$. So $Y$ depends on $X$ completely, yet
the product rule holds.
:::

::: callout pitfall Linearity is free; the product rule needs independence
$E(X + Y) = EX + EY$ always. $E(XY) = EX\cdot EY$ only if $X$, $Y$ are independent (or
in special cases like the one above): $E(XY) = EX\cdot EY$ does **not** prove
independence. In Example 5, $E(XY) = \frac16$ but $EX\cdot EY = \frac29$.
:::

::: example In-class question 19-039: E(2X + 1)
$X$ has density $f(x) = \frac{1}{10}e^{-x/10}$ for $x > 0$ (0 otherwise). Find $E(2X + 1)$.
== Recognise the distribution ==
This is the exponential distribution with $\beta = \frac1{10}$, so $E(X) = \frac1\beta = 10$
(Lesson 4.1).
== Linearity ==
$E(2X + 1) = 2E(X) + 1 = 21$. The answer is C.
:::

::: example In-class question 19-040: E(XY) for independent uniforms
$X$ and $Y$ are independent, uniform on $[-1, 3]$ and on $[2, 4]$. Find $E(XY)$.
== The means ==
Midpoints: $E(X) = \frac{-1 + 3}{2} = 1$, $E(Y) = \frac{2 + 4}{2} = 3$.
== Independence ==
$E(XY) = E(X)E(Y) = 3$. The answer is C.
:::

## The indicator-variable method

Linearity becomes a powerful tool when you write a complicated count as a **sum of
simple 0–1 variables**. Each 0–1 variable ("did this particular thing happen?") is called
an {{term indicator variable | 示性变量}}, and its mean is just a probability
(Lesson 4.1: $E(X_i) = P\{X_i = 1\}$). Then the mean of the count is the sum of those
probabilities — and, because linearity needs no independence, the pieces may depend on
each other however they like.

::: formula Indicator-variable method | 示性变量法
$$X = X_1 + X_2 + \cdots + X_n,\ X_i \in \{0, 1\} \ \Rightarrow\ E(X) = \sum_{i=1}^{n} P\{X_i = 1\}$$
--
X_i | indicator: 1 if the i-th event happens, 0 if not |
X | the count of events that happen |
:::

::: example Example 1 (properties): the mean of B(n, p) again
$X \sim B(n, p)$. Find $E(X)$.
== Split the count ==
$X$ is the number of successes in $n$ Bernoulli trials. Let $X_i = 1$ if trial $i$ succeeds
and $X_i = 0$ if it fails, $i = 1, \cdots, n$. Then $X = X_1 + X_2 + \cdots + X_n$.
== Each piece ==
Each $X_i$ is a two-point variable with $P\{X_i = 1\} = p$, so $E(X_i) = p$.
== Add ==
$$E(X) = E(X_1) + E(X_2) + \cdots + E(X_n) = np .$$
Compare this one line with the binomial-sum calculation in Lesson 4.1.
:::

::: example Example 2 (properties): the elevator problem
$r$ people get into a lift on the ground floor of a building with $n$ floors above. Each
gets out at any of the $n$ floors with the same probability $\frac1n$, independently of
the others, and the lift stops at a floor only if someone gets out there. Find the
expected number of stops $E(X)$ until everyone has got out.
== Why not directly? ==
The distribution of $X$ is complicated (how many floors are hit by $r$ people?). Indicators
avoid it.
== Indicators ==
For $i = 1, \cdots, n$ let $X_i = 1$ if the lift stops at floor $i$ and $X_i = 0$ if it
doesn't. Then $X = X_1 + X_2 + \cdots + X_n$.
== One floor ==
The lift skips floor $i$ only if **none** of the $r$ people chooses it. Each person avoids
floor $i$ with probability $1 - \frac1n$, independently, so
$$P\{X_i = 0\} = \left(1 - \frac1n\right)^r, \qquad P\{X_i = 1\} = 1 - \left(1 - \frac1n\right)^r = E(X_i).$$
== Add ==
$$E(X) = \sum_{i=1}^{n} E(X_i) = n\left[1 - \left(1 - \frac1n\right)^r\right].$$
For example, with $n = 10$ floors and $r = 7$ people: $10(1 - 0.9^7) \approx 5.22$ stops.
:::

The indicators $X_1, \cdots, X_n$ in the elevator problem are **not** independent (if the
lift stops at many floors it is less likely to stop at the last one), yet the method
works, because linearity never asks for independence. Play with $n$ and $r$:

::: explore The elevator problem
slider n: 1 .. 30 = 10 | | floors
slider r: 1 .. 40 = 7 | | passengers
stops = n (1 - (1 - 1/n)^r) | | Expected stops E(X)
skip = (1 - 1/n)^r | | P(a given floor is skipped)
:::

With many passengers ($r$ large) the lift stops at nearly every floor, $E(X) \to n$; with
one passenger it stops exactly once.

::: example Defective items drawn without replacement
A box holds $N = 10$ items, $M = 3$ of them defective. Draw $n = 4$ without replacement.
Find the expected number $X$ of defective items drawn.
== Indicators ==
Let $X_i = 1$ if the $i$-th item drawn is defective, so $X = X_1 + X_2 + X_3 + X_4$.
== One draw ==
By the fairness of drawing lots (Lesson 1.2), the $i$-th draw is defective with
probability $\frac MN = \frac{3}{10}$, whatever $i$ is. So $E(X_i) = 0.3$.
== Add ==
$E(X) = 4\times0.3 = 1.2$, in general $\dfrac{nM}{N}$. The draws depend on each other,
but that doesn't matter for the mean. (Checking with the hypergeometric probabilities,
$\sum_k k\,C_3^k C_7^{4-k}/C_{10}^4 = 1.2$ as well.)
:::

::: callout key One idea to remember
To find $E[f(X)]$ or $E[f(X, Y)]$, apply $f$ to the values and weight by the
distribution you already have — no need for the distribution of $f$. To find the mean of
a count, split it into indicators and add their probabilities: linearity needs no
independence.
:::

::: callout exam What exams ask
Expect: $E(X^2)$, $E(XY)$ or $E[g(X, Y)]$ from a joint table or a joint density (often
a uniform density on a triangle, as in Example 5); unknowns in a law found from a given
expectation (19-030); linearity and the product rule in one step (19-039, 19-040), with
"which formula is wrong?" questions like 19-035; and, as a harder question, an
indicator-variable count like the elevator problem. $E(X)$ and $E(X^2)$ together give
the variance in Lesson 4.3.
:::

::: callout summary The whole lesson in four lines
$E[f(X)] = \sum f(x_k)p_k$ or $\int f(x)p(x)\,\d x$; $E[f(X, Y)] = \sum\sum f(x_i, y_j)p_{ij}$
or $\iint f(x, y)p(x, y)\,\d x\,\d y$. $E(C) = C$, $E(CX) = CEX$, $E(X + Y) = EX + EY$
always; $E(XY) = EX\cdot EY$ if independent (not conversely). Write a count as a sum of
indicators and $E(X) = \sum P\{X_i = 1\}$.
:::

::: cards Expectation of functions and its properties
Theorem 1, discrete :: $E[f(X)] = \sum_k f(x_k)\,p_k$, if $\sum_k |f(x_k)|\,p_k < \infty$.
Theorem 1, continuous :: $E[f(X)] = \int_{-\infty}^{+\infty} f(x)\,p(x)\,\d x$, if the integral of $|f(x)|p(x)$ converges.
Theorem 2, discrete :: $E[f(X, Y)] = \sum_i\sum_j f(x_i, y_j)\,p_{ij}$.
Theorem 2, continuous :: $E[f(X, Y)] = \iint f(x, y)\,p(x, y)\,\d x\,\d y$ with the joint density.
Do you need the distribution of Y = f(X) to find E(Y)? :: No: weight $f(x_k)$ by the probabilities of $X$ (Theorem 1).
Is E(X²) equal to (EX)²? :: Not in general; $E[f(X)] \ne f(EX)$ unless $f$ is linear.
E(C) and E(CX) for a constant C :: $E(C) = C$, $E(CX) = C\,E(X)$.
Linearity of expectation :: $E(\sum C_iX_i) = \sum C_iE(X_i)$ for any random variables, independent or not.
Product rule for expectation :: If $X$, $Y$ are independent, $E(XY) = E(X)E(Y)$; the converse is false.
Counterexample to the converse of E(XY) = EX·EY :: $X$ uniform on $\{-1, 0, 1\}$, $Y = X^2$: $E(XY) = 0 = EX\cdot EY$ but dependent.
Indicator-variable method :: Write $X = \sum X_i$ with 0–1 variables; then $E(X) = \sum P\{X_i = 1\}$.
Mean of B(n, p) by indicators :: $X = X_1 + \cdots + X_n$, $E(X_i) = p$, so $E(X) = np$.
Elevator problem answer :: $E(X) = n\left[1 - (1 - \frac1n)^r\right]$ stops for $r$ people and $n$ floors.
:::

::: quiz Expectation of functions and its properties
? (In-class question 19-026) $X \sim N(0, 1)$ and $Y = X^3$. Then $E(Y) =$
- [ ] $2$
- [ ] $3$
- [x] $0$
- [ ] $1$
> $E(Y) = \int x^3\varphi(x)\,\d x$; the integrand is odd and the integral converges
> absolutely, so it is 0.

? (In-class question 19-030) $(X, Y)$ takes $(1,0)$, $(1,1)$, $(2,0)$, $(2,1)$ with probabilities $0.4$, $0.2$, $a$, $b$, and $E(XY) = 0.8$. Find $a$.
answer: 0.1
> $E(XY) = 0.2 + 2b = 0.8$ gives $b = 0.3$, and $0.4 + 0.2 + a + 0.3 = 1$ gives $a = 0.1$.

? (In-class question 19-030, continued) In the same question, find $b$.
answer: 0.3
> Only the cells where $XY \ne 0$ count: $1\cdot1\cdot0.2 + 2\cdot1\cdot b = 0.8$, so
> $b = 0.3$.

? (In-class question 19-035) $(X, Y)$ is continuous with joint density $f(x, y)$ and marginal densities $f_X$, $f_Y$. Which formula is **wrong**?
- [ ] $E(X) = \int_{-\infty}^{+\infty} x f_X(x)\,\d x$
- [ ] $E(X) = \iint x f(x, y)\,\d x\,\d y$
- [ ] $E(Y^2) = \iint y^2 f(x, y)\,\d x\,\d y$
- [x] $E(XY) = \iint xy f_X(x) f_Y(y)\,\d x\,\d y$
> The first is the definition, the second and third are Theorem 2. The last replaces the
> joint density by the product of the marginals, which is only right when $X$ and $Y$
> are independent.

? (In-class question 19-036) $(X, Y)$ has density $e^{-(x+y)}$ for $x > 0$, $y > 0$ (0 otherwise). Find $E(XY)$.
- [ ] $0$
- [ ] $1/2$
- [ ] $2$
- [x] $1$
> The integral separates: $\int_0^\infty xe^{-x}\,\d x\cdot\int_0^\infty ye^{-y}\,\d y = 1\cdot1 = 1$.

? (In-class question 19-039) $X$ has density $\frac{1}{10}e^{-x/10}$ for $x > 0$ (0 otherwise). Find $E(2X + 1)$.
answer: 21
> Exponential with $\beta = \frac1{10}$, so $E(X) = 10$ and $E(2X + 1) = 2\cdot10 + 1 = 21$.

? (In-class question 19-040) $X$ and $Y$ are independent, uniform on $[-1, 3]$ and $[2, 4]$. Find $E(XY)$.
answer: 3
> $E(X) = 1$, $E(Y) = 3$, and by independence $E(XY) = E(X)E(Y) = 3$.

? $X$ takes the values $-2, 0, 2$ with probabilities $0.4, 0.3, 0.3$. Find $E(X^2)$.
answer: 2.8
> Theorem 1: $4(0.4) + 0(0.3) + 4(0.3) = 2.8$.

? $X \sim U[0, 2]$. Find $E(X^2)$.
answer: 4/3
> $E(X^2) = \int_0^2 x^2\cdot\frac12\,\d x = \frac12\cdot\frac83 = \frac43$. (Not
> $(EX)^2 = 1$.)

? $(X, Y)$ is uniform on the triangle with vertices $(0,0)$, $(1,0)$, $(0,2)$. Find $E(XY)$.
answer: 1/6
> The density is 1 on the triangle (area 1):
> $E(XY) = \int_0^1\int_0^{2-2x} xy\,\d y\,\d x = \int_0^1 2x(1-x)^2\,\d x = \frac16$.

? 7 people enter a lift that serves 10 floors; each gets out at a floor chosen at random, independently. Find the expected number of stops.
answer: 10 (1 - 0.9^7)
> Indicators per floor: $E(X) = n[1 - (1 - \frac1n)^r] = 10(1 - 0.9^7) \approx 5.217$.

? $X$ and $Y$ are random variables with $E(X) = 2$ and $E(Y) = -1$. Which of these can you conclude without knowing whether they are independent?
- [x] $E(3X - 2Y + 1) = 9$
- [ ] $E(XY) = -2$
- [ ] $E(X^2) = 4$
- [ ] $X$ and $Y$ are independent if $E(XY) = -2$
> Linearity always holds: $3\cdot2 - 2(-1) + 1 = 9$. $E(XY) = EX\cdot EY$ needs
> independence, $E(X^2) \ne (EX)^2$ in general, and $E(XY) = EX\cdot EY$ does not imply
> independence.
:::

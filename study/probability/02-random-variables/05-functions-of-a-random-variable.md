---
title: Functions of a random variable
zh: 随机变量函数的分布
summary: Finding the distribution of Y = g(X) — tables for a discrete X, the distribution-function method for a continuous X, linear functions of a normal, Y = F(X) ~ U(0,1), and mixed-type results.
source: 7随机变量函数的分布4-1 (§2.3), 2026-09-21
---

Often the quantity you care about isn't the random variable you know, but something
computed from it. You know the distribution of a circle's random radius $R$, but you
want its area $\pi R^2$; you know a component's lifetime $X$, but the cost depends on
$3e^X$; a measurement in °C is turned into °F by $1.8X + 32$. This lesson answers one
question: **given the distribution of $X$, what is the distribution of $Y = g(X)$?** For
a discrete $X$ it is bookkeeping with a table. For a continuous $X$ there is one reliable
method — go through the distribution function — and most of the lesson is practice with
it, including a deliberately wrong solution to learn from. Exams ask this every year.

You will need densities, distribution functions and the uniform and exponential
distributions (Lesson 2.3), and the normal distribution and $\Phi$ (Lesson 2.4).

## What a function of a random variable is

::: define Function of a random variable | 随机变量的函数
Let $g(x)$ be a function defined on every possible value $x$ of a random variable $X$. If
the random variable $Y$ takes the value $y = g(x)$ whenever $X$ takes the value $x$, then
$Y$ is called a function of $X$, written $Y = g(X)$.
:::

Think of $g$ as a machine: each outcome of the experiment gives a value $x$ of $X$, the
machine turns it into $g(x)$, and that is the value of $Y$. Since $Y$ is determined by
$X$, every question about $Y$ is really a question about $X$:
$$P\{Y \in \text{some set}\} = P\{X \text{ is one of the } x \text{ with } g(x) \text{ in that set}\}.$$
Everything in this lesson is this one sentence applied carefully. (The slides write the
function as $f$ or $g$; we use $g$, to keep $f$ for densities.)

## The discrete case

If $X$ is discrete, so is $Y = g(X)$: it can only take the values $g(x_1), g(x_2), \ldots$
And $Y = g(x_k)$ happens exactly when $X = x_k$ (or when $X$ takes another value with
the same image). So you copy the table.

::: theorem Distribution of a function of a discrete random variable | 离散型随机变量函数的分布
If $X$ has the distribution law

| $X$ | $x_1$ | $x_2$ | $\cdots$ | $x_k$ | $\cdots$ |
| --- | --- | --- | --- | --- | --- |
| $p_k$ | $p_1$ | $p_2$ | $\cdots$ | $p_k$ | $\cdots$ |

then $Y = g(X)$ has the distribution law

| $Y = g(X)$ | $g(x_1)$ | $g(x_2)$ | $\cdots$ | $g(x_k)$ | $\cdots$ |
| --- | --- | --- | --- | --- | --- |
| $p_k$ | $p_1$ | $p_2$ | $\cdots$ | $p_k$ | $\cdots$ |

If some of the $g(x_k)$ are equal, add up their probabilities $p_k$ and list the value
once.
:::

::: example Example 1: a linear and a square function
$X$ has the distribution law

| $X$ | $-1$ | $0$ | $1$ | $2$ |
| --- | --- | --- | --- | --- |
| $P$ | 0.1 | 0.2 | 0.3 | 0.4 |

Find the distribution laws of (1) $Y_1 = 2X + 1$ and (2) $Y_2 = 2X^2$.
== (1) Apply g to each value ==
$2(-1)+1 = -1$, $2(0)+1 = 1$, $2(1)+1 = 3$, $2(2)+1 = 5$. All different, so the
probabilities carry over unchanged:

| $Y_1$ | $-1$ | $1$ | $3$ | $5$ |
| --- | --- | --- | --- | --- |
| $P$ | 0.1 | 0.2 | 0.3 | 0.4 |
== (2) Apply g, then merge ==
$2X^2$ gives $2, 0, 2, 8$. The values $X = -1$ and $X = 1$ both give $Y_2 = 2$, so
$P\{Y_2 = 2\} = P\{X = -1\} + P\{X = 1\} = 0.1 + 0.3 = 0.4$:

| $Y_2$ | $0$ | $2$ | $8$ |
| --- | --- | --- | --- |
| $P$ | 0.2 | 0.4 | 0.4 |

List the values in increasing order; the probabilities still add to 1.
:::

::: callout pitfall Merge equal values
A table with $2$ appearing twice is not a distribution law. Whenever $g$ is not
one-to-one (squares, absolute values, $\sin$, …), check for repeated values and add their
probabilities.
:::

## The continuous case: the distribution-function method

For a continuous $X$ you can't list values. And you can't simply "plug in" the density:
$f_Y(y)$ is **not** $f_X(g^{-1}(y))$ in general. A density is probability per unit length,
and $g$ stretches and squeezes lengths. The safe route is through the distribution
function, which **is** a probability, so the "one sentence" above applies to it directly.

Here is the idea on the slides' first example, before the general recipe.

::: example Example 2: a linear function
$X$ has density $f_X(x) = \dfrac{x}{8}$ for $0 < x < 4$, and $0$ otherwise. Find the
density of $Y = 2X + 8$.
== Step 1: the distribution function of Y ==
$$F_Y(y) = P\{Y \le y\} = P\{2X + 8 \le y\} = P\left\{X \le \frac{y-8}{2}\right\} = F_X\!\left(\frac{y-8}{2}\right).$$
== Step 2: differentiate (chain rule) ==
$$f_Y(y) = F_Y'(y) = F_X'\!\left(\frac{y-8}{2}\right)\cdot\left(\frac{y-8}{2}\right)' = f_X\!\left(\frac{y-8}{2}\right)\cdot\frac12.$$
== Step 3: where is it nonzero? ==
$f_X(x) \ne 0$ only for $0 < x < 4$, so $f_X\big(\frac{y-8}{2}\big) \ne 0$ only for
$0 < \frac{y-8}{2} < 4$, i.e. $8 < y < 16$. There $f_X\big(\frac{y-8}{2}\big) = \frac{y-8}{16}$, so
$$f_Y(y) = \begin{cases} \dfrac{y-8}{32}, & 8 < y < 16, \\ 0, & \text{otherwise.} \end{cases}$$
== Check ==
$\int_8^{16} \frac{y-8}{32}\,\d y = \frac{1}{32}\cdot\frac{8^2}{2} = 1$. ✓ The interval
doubled in length (from 4 to 8), so the density's height halved: that is the factor
$\frac12$.
:::

::: plot Example 2: X's density and Y = 2X + 8's density
x: 0 .. 17
xlabel: x or y
f_X(x) = x/8 * (1 - min(1, floor(x/4)))
f_Y(x) = (x - 8)/32 * min(1, max(0, floor(x/8))) * (1 - min(1, floor(x/16)))
:::

In general:

::: define Distribution-function method | 分布函数法
To find the density $f_Y(y)$ of $Y = g(X)$, when $X$ has density $f_X(x)$ and
distribution function $F_X(x)$:

1. **Range of $Y$.** Over the interval where $f_X > 0$, let $\alpha = \min g(x)$ and
   $\beta = \max g(x)$. For $y \notin (\alpha, \beta)$, $f_Y(y) = 0$.
2. **Distribution function.** For $y \in (\alpha, \beta)$, write
   $F_Y(y) = P\{Y \le y\} = P\{g(X) \le y\}$, solve the inequality $g(X) \le y$ for $X$, and
   express the result through $F_X$.
3. **Differentiate.** $f_Y(y) = F_Y'(y)$, using the chain rule and $F_X' = f_X$.
:::

::: callout key Always go through F_Y
Densities are not probabilities, so they don't transform by substitution. Distribution
functions are probabilities, so they do: $F_Y(y) = P\{g(X) \le y\}$. Solve that event for
$X$, differentiate, and the stretch factor appears by itself through the chain rule.
:::

## A linear function of a normal variable

::: example Example 3: Y = aX + b for a normal X
$X \sim N(\mu, \sigma^2)$, with density $f(x) = \frac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$.
Find the density of $Y = aX + b$ ($a \ne 0$).
== Set up ==
$F_Y(y) = P\{aX + b \le y\} = P\{aX \le y - b\}$. Dividing by $a$ keeps the inequality
when $a > 0$ and flips it when $a < 0$, so take the two cases separately. Here $Y$ can take
every real value, so there is no range restriction.
== Case a > 0 ==
$$F_Y(y) = P\left\{X \le \frac{y-b}{a}\right\} = F_X\!\left(\frac{y-b}{a}\right), \qquad f_Y(y) = \frac1a f_X\!\left(\frac{y-b}{a}\right) = \frac{1}{\sqrt{2\pi}\,a\sigma}e^{-\frac{[y-(b+a\mu)]^2}{2(a\sigma)^2}}.$$
== Case a < 0 ==
$$F_Y(y) = P\left\{X \ge \frac{y-b}{a}\right\} = 1 - F_X\!\left(\frac{y-b}{a}\right), \qquad f_Y(y) = -\frac1a f_X\!\left(\frac{y-b}{a}\right) = -\frac{1}{\sqrt{2\pi}\,a\sigma}e^{-\frac{[y-(b+a\mu)]^2}{2(a\sigma)^2}}.$$
($P\{X = c\} = 0$, so $\ge$ or $>$ makes no difference.) Since $a < 0$, $-\frac1a = \frac{1}{|a|}$
is positive, as a density must be.
== Simplify the exponent ==
$\frac{\left(\frac{y-b}{a}-\mu\right)^2}{2\sigma^2} = \frac{(y - b - a\mu)^2}{2a^2\sigma^2}$. Both cases
together: $f_Y(y) = \frac{1}{\sqrt{2\pi}\,|a|\sigma}e^{-\frac{[y-(a\mu+b)]^2}{2(|a|\sigma)^2}}$, a
normal density with centre $a\mu + b$ and spread $|a|\sigma$.
:::

::: theorem Linear functions of a normal variable | 正态随机变量的线性函数
If $X \sim N(\mu, \sigma^2)$ and $a \ne 0$, then
$$Y = aX + b \sim N(a\mu + b,\ a^2\sigma^2).$$
In particular, with $a = \frac1\sigma$ and $b = -\frac\mu\sigma$: $Z = \dfrac{X-\mu}{\sigma} \sim N(0,1)$,
the standardisation of Lesson 2.4.
:::

::: formula Linear function of a normal | 正态分布的线性变换
$$X \sim N(\mu, \sigma^2) \ \Rightarrow\ aX + b \sim N(a\mu + b,\ a^2\sigma^2)$$
--
a, b | constants, a ≠ 0 |
a\mu + b | new centre |
a^2\sigma^2 | new σ² (the slides write |a|²σ²): the spread becomes |a|σ |
:::

::: explore Y = aX + b for X ~ N(μ, σ²)
slider μ: -5 .. 5 = 1
slider σ: 0.1 .. 5 = 2
slider a: -3 .. 3 = -3
slider b: -5 .. 5 = 2
centre = a μ + b | | Centre of Y, aμ + b
spread = abs(a) σ | | Spread of Y, |a|σ
square = a^2 σ^2 | | Second parameter of Y, a²σ²
:::

::: callout pitfall Watch the sign of a
For $a < 0$ the inequality flips: $F_Y(y) = 1 - F_X\big(\frac{y-b}{a}\big)$, not
$F_X\big(\frac{y-b}{a}\big)$. And the second parameter is $a^2\sigma^2$, never $a\sigma^2$:
$-3X$ is as spread out as $3X$.
:::

## More continuous examples

::: example Example 4: from exponential to uniform
$X$ has the exponential distribution with parameter 2. Show that $Y = 1 - e^{-2X}$ has the
uniform distribution on $(0, 1)$.
== Range ==
$X$ has density $f(x) = 2e^{-2x}$ for $x > 0$, and $0$ for $x \le 0$. For $x > 0$,
$e^{-2x} \in (0,1)$, so $y = 1 - e^{-2x} \in (0, 1)$. Hence $f_Y(y) = 0$ outside $(0,1)$.
== Distribution function ==
For $y \in (0,1)$:
$$F_Y(y) = P\{1 - e^{-2X} \le y\} = P\{e^{-2X} \ge 1 - y\} = P\left\{X \le -\tfrac12\ln(1-y)\right\} = F_X\!\left(-\tfrac12\ln(1-y)\right).$$
(Taking logarithms: $-2X \ge \ln(1-y)$, then divide by $-2$, which flips the inequality.)
== Differentiate ==
$$f_Y(y) = f_X\!\left(-\tfrac12\ln(1-y)\right)\cdot\frac{1}{2(1-y)} = 2e^{\ln(1-y)}\cdot\frac{1}{2(1-y)} = 2(1-y)\cdot\frac{1}{2(1-y)} = 1.$$
So $f_Y(y) = 1$ for $0 < y < 1$ and $0$ otherwise: $Y \sim U(0,1)$.
:::

Notice that $1 - e^{-2x}$ is exactly the distribution function of $X$. That is no
accident — see the section on $Y = F(X)$ below.

When $g$ is not monotone, the event $\{g(X) \le y\}$ may be made of **several pieces**, and
each piece contributes a term.

::: example Example 5: Y = sin X, two branches
$X$ has density $f(x) = \dfrac{2x}{\pi^2}$ for $0 < x < \pi$, and $0$ otherwise. Find the
density of $Y = \sin X$.
== Range ==
For $x \in (0, \pi)$, $\sin x \in (0, 1]$; so $f_Y(y) = 0$ outside $(0, 1)$.
== Solve sin X ≤ y ==
For $y \in (0,1)$, $\sin x \le y$ near **both ends** of $(0, \pi)$: $0 < x \le \arcsin y$, or
$\pi - \arcsin y \le x < \pi$ (see the figure). So
$$F_Y(y) = P\{0 < X \le \arcsin y\} + P\{\pi - \arcsin y \le X < \pi\} = F_X(\arcsin y) - F_X(0) + F_X(\pi) - F_X(\pi - \arcsin y).$$
== Differentiate ==
$F_X(0)$ and $F_X(\pi)$ are constants. With $(\arcsin y)' = \frac{1}{\sqrt{1-y^2}}$:
$$f_Y(y) = f_X(\arcsin y)\frac{1}{\sqrt{1-y^2}} + f_X(\pi - \arcsin y)\frac{1}{\sqrt{1-y^2}} = \frac{2}{\pi^2}\cdot\frac{\arcsin y + \pi - \arcsin y}{\sqrt{1-y^2}} = \frac{2}{\pi\sqrt{1-y^2}}.$$
== Answer ==
$$f_Y(y) = \begin{cases} \dfrac{2}{\pi\sqrt{1-y^2}}, & 0 < y < 1, \\ 0, & \text{otherwise.} \end{cases}$$
Check: $\int_0^1 \frac{2}{\pi\sqrt{1-y^2}}\,\d y = \frac2\pi\cdot\frac\pi2 = 1$. ✓
:::

::: plot Example 5: the x where sin x ≤ c come in two pieces
x: 0 .. 3.2
y: 0 .. 1.1
xlabel: x
s(x) = sin(x)
level(x) = c
region Event: 0 < x < pi, sin(x) <= c, 0 < y < sin(x)
slider c: 0.05 .. 1 = 0.5
:::

### Example 6, and a wrong solution

::: example Example 6: Y = X² for a uniform X — a solution to check
$X \sim U(0, 2)$. Find the density of $Y = X^2$. Here is a solution. **Is it correct?**

$f(x) = \frac12$ for $x \in (0,2)$, $0$ otherwise. For $x \in (0,2)$, $y \in (0,4)$, and for
$y \in (0,4)$:
$$F_Y(y) = P\{X^2 \le y\} = P\{-\sqrt y \le X \le \sqrt y\} = F_X(\sqrt y) - F_X(-\sqrt y),$$
$$f_Y(y) = f_X(\sqrt y)(\sqrt y)' - f_X(\sqrt y)(-\sqrt y)' = f_X(\sqrt y)\frac{1}{2\sqrt y} + f_X(\sqrt y)\frac{1}{2\sqrt y} = \frac{2}{4\sqrt y} = \frac{1}{2\sqrt y}, \quad 0 < y < 4.$$
== What's wrong ==
Differentiating $F_X(-\sqrt y)$ gives $f_X(-\sqrt y)\cdot(-\sqrt y)'$, and the solution
wrote $f_X(\sqrt y)$ instead. But $-\sqrt y < 0$, where the density is $0$: $f_X(-\sqrt y) = 0$.
So the second term should vanish. A quick sign that something is off: $\int_0^4 \frac{1}{2\sqrt y}\,\d y = 2$,
not 1.
== Why: use the range of X ==
$X$ only takes values in $(0, 2)$, so $X \ge -\sqrt y$ always holds, and
$$P\{-\sqrt y \le X \le \sqrt y\} = P\{0 < X \le \sqrt y\} = F_X(\sqrt y) - F_X(0).$$
(Equivalently, $F_X(-\sqrt y) = 0$.)
== Correct solution ==
$$f_Y(y) = F_X'(\sqrt y) = f_X(\sqrt y)\cdot\frac{1}{2\sqrt y} = \frac12\cdot\frac{1}{2\sqrt y} = \frac{1}{4\sqrt y},$$
so
$$f_Y(y) = \begin{cases} \dfrac{1}{4\sqrt y}, & 0 < y < 4, \\ 0, & \text{otherwise.} \end{cases}$$
Check: $\int_0^4 \frac{1}{4\sqrt y}\,\d y = \frac14\cdot 2\sqrt y\,\Big|_0^4 = 1$. ✓
:::

::: plot Example 6: the correct density 1/(4√y) and the wrong one 1/(2√y)
x: 0 .. 4
y: 0 .. 2
xlabel: y
right(x) = 1 / (4 sqrt(x))
wrong(x) = 1 / (2 sqrt(x))
:::

::: callout pitfall Forgetting the support
The classic mistake: solving $g(X) \le y$ as if $X$ could be any real number. Always
intersect with where $X$ actually lives (where $f_X > 0$). For $X^2$ with a symmetric $X$
(say $U(-1,1)$) both $\pm\sqrt y$ contribute; for $X \sim U(0,2)$ only $+\sqrt y$ does.
And always check the answer integrates to 1.
:::

::: formula Density of a monotone function
$$f_Y(y) = f_X\big(h(y)\big)\,\big|h'(y)\big| \quad \text{for } y \text{ in the range of } g, \qquad 0 \text{ elsewhere}$$
--
g | strictly monotone and differentiable on the support of X |
h = g^{-1} | the inverse function, x = h(y) |
:::

This shortcut is just the distribution-function method done once and for all for a
monotone $g$ (the two cases of Example 3 give the absolute value). It agrees with Examples
2, 3 and 4; for non-monotone functions like Examples 5 and 6, go back to the method.

## Y = F(X) is uniform

Example 4 turned an exponential variable into a uniform one by applying its own
distribution function. This always works.

::: theorem The probability integral transform | Y = F(X) 服从均匀分布
Let $X$ be a continuous random variable whose distribution function $F(x)$ is **strictly
increasing**. Then
$$Y = F(X) \sim U[0, 1].$$
The lecture says to remember this as a conclusion (可以作为结论记住).
:::

::: example Proof that F(X) is uniform
Find the distribution function of $Y = F(X)$.
== Range ==
$0 \le F(x) \le 1$, so $Y \in [0, 1]$: $F_Y(y) = 0$ for $y < 0$ and $F_Y(y) = 1$ for $y > 1$.
== Inside [0, 1] ==
$F$ is continuous and strictly increasing, so it has an inverse $F^{-1}$ and
$F(X) \le y \iff X \le F^{-1}(y)$:
$$F_Y(y) = P\{F(X) \le y\} = P\{X \le F^{-1}(y)\} = F\big(F^{-1}(y)\big) = y.$$
== Conclude ==
$F_Y(y) = y$ on $[0,1]$ is the distribution function of $U[0,1]$; its density is $1$ on
$[0,1]$ and $0$ elsewhere.
:::

Why it matters: in reverse, it tells a computer how to produce any distribution from
uniform random numbers ($X = F^{-1}(U)$), the basis of simulation.

::: callout exam 2025 final exam, paper A, fill-in question 4
$X$ has density $f(x) = \dfrac{1}{3\sqrt[3]{x^2}}$ on $[1, 8]$ (textbook p. 92, exercise 30),
with distribution function $F(x)$; what is the distribution of $Y = F(X)$? You don't need
to compute anything: $F$ is continuous and strictly increasing where $X$ lives, so
$Y \sim U[0,1]$. (If you want to see it: $F(x) = \int_1^x \frac{\d t}{3t^{2/3}} = x^{1/3} - 1$
on $[1,8]$, rising from 0 to 1.) The quiz has it.
:::

## Mixed-type functions

A function of a continuous variable need not be continuous. If $g$ is constant on an
interval where $X$ has positive probability, $Y$ takes that constant with positive
probability, a point mass. If $g$ is also increasing elsewhere, $Y$ is neither discrete
nor continuous: a {{term mixed-type random variable | 混合型随机变量}}, whose distribution
function has jumps and continuous stretches. Find $F_Y$ piece by piece, splitting
$\{Y \le y\}$ by which formula for $Y$ applies.

::: example Example 7: a clamped variable
$X$ has density $f(x) = \dfrac1a x^2$ for $0 < x < 3$, and $0$ otherwise. Let
$$Y = \begin{cases} 2, & X \le 1, \\ X, & 1 < X < 2, \\ 1, & X \ge 2. \end{cases}$$
Find the distribution function of $Y$.
== The constant a ==
$$1 = \int_{-\infty}^{+\infty} f(x)\,\d x = \int_0^3 \frac1a x^2\,\d x = \frac{27}{3a} = \frac9a, \qquad a = 9.$$
== Range of Y ==
$Y$ only takes values in $[1, 2]$. So $F_Y(y) = 0$ for $y < 1$ and $F_Y(y) = 1$ for $y \ge 2$.
== 1 ≤ y < 2 ==
$\{Y \le y\}$ happens when $Y = 1$ (that is, $X \ge 2$) or when $1 < Y = X \le y$:
$$F_Y(y) = P\{X \ge 2\} + P\{1 < X \le y\} = \int_2^3 \frac{x^2}{9}\,\d x + \int_1^y \frac{x^2}{9}\,\d x = \frac{19}{27} + \frac{y^3 - 1}{27} = \frac{y^3 + 18}{27}.$$
== Answer ==
$$F_Y(y) = \begin{cases} 0, & y < 1, \\ \dfrac{1}{27}(y^3 + 18), & 1 \le y < 2, \\ 1, & y \ge 2. \end{cases}$$
$F_Y$ jumps by $\frac{19}{27} = P\{X \ge 2\}$ at $y = 1$ and by $1 - \frac{26}{27} = \frac{1}{27} = P\{X \le 1\}$
at $y = 2$, and rises continuously in between: mixed type.
:::

::: callout note A typo on the slide
Slide 11-034 writes the integral as $\int_0^3 \frac1a x^3\,\d x$; the density has $x^2$, and
$\int_0^3 \frac1a x^2\,\d x = \frac9a$ (the slide's result $a = 9$ is right).
:::

::: plot Example 7: F_Y jumps at 1 and at 2
x: 0 .. 3
y: 0 .. 1.1
xlabel: y
F_Y(x) = min(1, max(0, floor(x))) * (1 - min(1, max(0, floor(x/2)))) * (x^3 + 18)/27 + min(1, max(0, floor(x/2)))
:::

::: example Example 8: a step function gives a discrete Y
$X \sim U(0, 2)$, and
$$g(x) = \begin{cases} 0, & x < 1, \\ 1, & 1 \le x < 1.5, \\ 2, & 1.5 \le x. \end{cases}$$
Find the distribution of $Y = g(X)$.
== Values ==
$Y$ takes only $0, 1, 2$: it is discrete, though $X$ is continuous. $f(x) = \frac12$ on $(0,2)$.
== Probabilities ==
$$P\{Y = 0\} = P\{X < 1\} = \int_0^1 \tfrac12\,\d x = \tfrac12, \quad P\{Y = 1\} = P\{1 \le X < 1.5\} = \int_1^{1.5}\tfrac12\,\d x = \tfrac14,$$
$$P\{Y = 2\} = P\{X \ge 1.5\} = \int_{1.5}^2 \tfrac12\,\d x = \tfrac14.$$
== Table ==

| $Y$ | 0 | 1 | 2 |
| --- | --- | --- | --- |
| $P$ | $\frac12$ | $\frac14$ | $\frac14$ |
:::

::: callout exam What exams ask
Typical questions: the distribution law of $g(X)$ for a discrete $X$ (merge!); the density
of $Y = g(X)$ for a continuous $X$, often linear, $X^2$, $e^X$ or $|X|$, sometimes with an
abstract $f_X$ (as in the 2025 paper B question in the quiz: $Y = 3e^X$); recognising
$aX + b$ of a normal as normal; and $Y = F(X) \sim U[0,1]$ (2025 paper A). Always state
$f_Y(y) = 0$ outside the range — it is part of the answer.
:::

::: callout summary The method in one line
Range of $Y$ → $F_Y(y) = P\{g(X) \le y\}$, solved for $X$ inside its support → differentiate.
For discrete $X$: map the table and merge equal values.
:::

::: cards Functions of a random variable
Distribution of Y = g(X) for a discrete X :: Values $g(x_k)$ with the same $p_k$; add the probabilities of equal values.
Distribution-function method, step 1 :: Find the range $(\alpha, \beta)$ of $g$ over the support of $X$; $f_Y = 0$ outside.
Distribution-function method, step 2 :: For $y \in (\alpha,\beta)$: $F_Y(y) = P\{g(X) \le y\}$, solve for $X$, write it with $F_X$.
Distribution-function method, step 3 :: Differentiate: $f_Y(y) = F_Y'(y)$ (chain rule, $F_X' = f_X$).
X ~ N(μ, σ²), Y = aX + b :: $Y \sim N(a\mu + b,\ a^2\sigma^2)$.
F_Y(y) for Y = aX + b with a < 0 :: $1 - F_X\big(\frac{y-b}{a}\big)$: the inequality flips.
Y = F(X) when F is continuous and strictly increasing :: $Y \sim U[0,1]$.
Y = X² for X ~ U(0, 2) :: $f_Y(y) = \frac{1}{4\sqrt y}$ on $(0, 4)$ — only $+\sqrt y$ counts, since $X > 0$.
Y = sin X: why two terms? :: On $(0,\pi)$, $\sin x \le y$ near both ends: $x \le \arcsin y$ or $x \ge \pi - \arcsin y$.
Density of a monotone function :: $f_Y(y) = f_X(h(y))\,|h'(y)|$ with $h = g^{-1}$, on the range of $g$.
Mixed-type random variable :: Its distribution function has jumps (point masses) and continuous increasing parts.
Y = 3e^X: its density :: $f_Y(y) = \frac1y f_X\big(\ln\frac y3\big)$ for $y > 0$; $0$ for $y \le 0$.
:::

::: quiz Functions of a random variable
? (In-class question 11-012) $X$ takes $-1$ and $1$, each with probability $0.5$. Which is the distribution law of $Y = 2X + 1$?
- [x] $Y$ takes $-1$ and $3$, each with probability $0.5$
- [ ] $Y$ takes $-1$ and $1$, each with probability $0.5$
- [ ] $Y$ takes $1$ and $3$, each with probability $0.5$
- [ ] $Y$ takes $3$ with probability $1$
> $2(-1) + 1 = -1$ and $2(1) + 1 = 3$; the two values are different, so each keeps
> probability $0.5$: $\begin{pmatrix}-1 & 3\\ 0.5 & 0.5\end{pmatrix}$.

? In Example 1 ($X = -1, 0, 1, 2$ with $0.1, 0.2, 0.3, 0.4$), find $P\{2X^2 = 2\}$.
answer: 0.4
> $2X^2 = 2$ when $X = -1$ or $X = 1$: $0.1 + 0.3 = 0.4$.

? (In-class question 11-029) $X$ has distribution function $F_X(x)$. The distribution function of $Y = 5X - 3$ is
- [ ] $F_X(5y - 3)$
- [ ] $5F_X(y) - 3$
- [x] $F_X\big(\frac{y+3}{5}\big)$
- [ ] $\frac15 F_X(y) + 3$
> $F_Y(y) = P\{5X - 3 \le y\} = P\big\{X \le \frac{y+3}{5}\big\} = F_X\big(\frac{y+3}{5}\big)$.

? (In-class question 11-030) $X$ has density $f(x)$. The density of $Y = 7 - 2|X|$ is
- [ ] $f\big(\frac{y-7}{2}\big)$ for $y \le 7$, $0$ for $y > 7$
- [ ] $\frac12\big[f\big(\frac{y-7}{2}\big) - f\big(\frac{7-y}{2}\big)\big]$ for $y \le 7$, $0$ for $y > 7$
- [ ] $f\big(\frac{7-y}{2}\big)$ for $y \le 7$, $0$ for $y > 7$
- [x] $\frac12\big[f\big(\frac{y-7}{2}\big) + f\big(\frac{7-y}{2}\big)\big]$ for $y \le 7$, $0$ for $y > 7$
> $|X| \ge 0$, so $Y \le 7$; for $y > 7$, $F_Y = 1$ and $f_Y = 0$. For $y < 7$, with
> $c = \frac{7-y}{2} > 0$: $F_Y(y) = P\{|X| \ge c\} = 1 - F_X(c) + F_X(-c)$. Differentiating,
> $c' = -\frac12$: $f_Y(y) = \frac12 f(c) + \frac12 f(-c) = \frac12\big[f\big(\frac{7-y}{2}\big) + f\big(\frac{y-7}{2}\big)\big]$.
> Two branches, $X = \pm c$, so two terms — and they add.

? $X$ has density $\frac{x}{8}$ on $(0, 4)$. Write the density of $Y = 2X + 8$ for $8 < y < 16$.
expression: (y - 8)/32
variables: y
> $f_Y(y) = \frac12 f_X\big(\frac{y-8}{2}\big) = \frac12\cdot\frac{y-8}{16} = \frac{y-8}{32}$ (Example 2).

? $X \sim U(0, 2)$. Write the density of $Y = X^2$ for $0 < y < 4$.
expression: 1/(4 sqrt(y))
variables: y
> $X > 0$, so $F_Y(y) = P\{0 < X \le \sqrt y\} = F_X(\sqrt y)$, and
> $f_Y(y) = \frac12\cdot\frac{1}{2\sqrt y} = \frac{1}{4\sqrt y}$. The answer $\frac{1}{2\sqrt y}$
> wrongly counts $-\sqrt y$ (it integrates to 2).

? $X \sim N(1, 4)$. Then $Y = -3X + 2 \sim N(m, v)$. What is $v$?
answer: 36
> $a = -3$, $\sigma^2 = 4$: $a^2\sigma^2 = 9 \times 4 = 36$ (and $m = -3 + 2 = -1$). The sign
> of $a$ doesn't matter for the spread.

? (In-class question 11-032) $X \sim N(0,1)$ with distribution function $\Phi(x)$, and $Y = \Phi(X)$. Then $Y \sim$ ?
text: U[0,1] | U(0,1) | U[0, 1] | uniform on [0,1] | uniform
> $\Phi$ is continuous and strictly increasing, so $Y = \Phi(X) \sim U[0,1]$ by the theorem
> above.

? (In-class question 11-033, 2025 final A) $X$ has density $\frac{1}{3\sqrt[3]{x^2}}$ on $[1, 8]$ and distribution function $F(x)$; $Y = F(X)$. Then $Y \sim$ ?
text: U[0,1] | U(0,1) | U[0, 1] | uniform on [0,1] | uniform
> $F(x) = x^{1/3} - 1$ on $[1,8]$ is continuous and strictly increasing from 0 to 1, so
> $Y = F(X) \sim U[0,1]$.

? (In-class question 11-039, 2025 final B) $X$ is continuous with density $f_X(x)$. The density of $Y = 3e^X$ is
- [x] $\frac1y f_X\big(\ln\frac y3\big)$ for $y > 0$, and $0$ for $y \le 0$
- [ ] $f_X\big(\ln\frac y3\big)$ for $y > 0$, and $0$ for $y \le 0$
- [ ] $3e^y f_X(3e^y)$ for every $y$
- [ ] $\frac1y f_X\big(\ln\frac y3\big)$ for every $y$
> $Y = 3e^X > 0$, so $f_Y = 0$ for $y \le 0$. For $y > 0$:
> $F_Y(y) = P\{3e^X \le y\} = P\{X \le \ln\frac y3\} = F_X\big(\ln\frac y3\big)$, and
> $\big(\ln\frac y3\big)' = \frac1y$, so $f_Y(y) = \frac1y f_X\big(\ln\frac y3\big)$.

? $X \sim U(0, 1)$. Write the density of $Y = e^X$ for $1 < y < e$.
expression: 1/y
variables: y
> $F_Y(y) = P\{X \le \ln y\} = \ln y$ for $1 < y < e$, so $f_Y(y) = \frac1y$ there (and 0
> elsewhere). Check: $\int_1^e \frac{\d y}{y} = 1$.

? In Example 7, what is $P\{Y = 1\}$?
answer: 19/27
> $Y = 1$ exactly when $X \ge 2$: $\int_2^3 \frac{x^2}{9}\,\d x = \frac{27 - 8}{27} = \frac{19}{27}$,
> the jump of $F_Y$ at $y = 1$.

? In Example 8 ($X \sim U(0,2)$, a step function $g$), what is $P\{Y = 1\}$?
answer: 1/4
> $P\{1 \le X < 1.5\} = 0.5 \times \frac12 = \frac14$.
:::

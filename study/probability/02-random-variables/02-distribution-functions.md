---
title: Distribution functions
zh: 分布函数
summary: The distribution function F(x) = P{X ≤ x}, its four properties and their proofs, the formulas for the probability of any interval, and going between a distribution law and its step-shaped F.
source: 5随机变量3-1 (with the review in 6连续型随机变量3-2), 2026-09-14 → 09-17
---

A distribution law (Lesson 2.1) describes a discrete random variable perfectly, but it
can't describe a continuous one: a lifetime or a measurement error takes every value in
an interval, and each single value has probability 0. We need one tool that works for
**every** random variable. The answer is to ask not "what is the chance that $X$
equals $x$?" but "what is the chance that $X$ is **at most** $x$?" That function of $x$,
the distribution function, describes any random variable, gives the probability of any
interval by a subtraction, and is the bridge to densities in Lesson 2.3.

## The distribution function

Picture $X$ as a random point on the number line, and $x$ as a fixed point you choose.
$\{X \le x\}$ is the event that the random point lands at or to the left of $x$. As you
slide $x$ to the right, more of the line is covered, and the probability can only grow,
from 0 far to the left up to 1 far to the right.

::: define Distribution function | 分布函数
Let $X$ be a random variable and $x$ any real number. The function
$$F(x) = P\{X \le x\}, \qquad -\infty < x < +\infty,$$
is the distribution function of $X$ (in English also the cumulative distribution
function, CDF). When several variables are around, write $F_X(x)$.
:::

Two remarks from the slides:

1. The distribution function is made for **interval probabilities**: how likely is it
   that $X$ falls in some range?
2. $F(x)$ is an **ordinary real function** of the real variable $x$, so all of calculus
   (limits, continuity, derivatives) applies to it. The randomness is in $X$, not in $x$.

The basic interval formula follows straight from the definition. For $x_1 < x_2$, the
event $\{X \le x_2\}$ splits into the two exclusive parts $\{X \le x_1\}$ and
$\{x_1 < X \le x_2\}$, so

::: formula Probability of an interval | 区间概率
$$P\{x_1 < X \le x_2\} = F(x_2) - F(x_1)$$
--
F | the distribution function, $F(x) = P\{X \le x\}$ |
x_1, x_2 | the ends of the interval, $x_1 < x_2$ |
:::

Note the ends: open on the left, closed on the right, exactly matching the "$\le$" in
the definition.

## Its four properties

::: theorem Properties of a distribution function | 分布函数的性质
(1) $0 \le F(x) \le 1$ for all $x$, with $F(-\infty) = \lim\limits_{x\to-\infty} F(x) = 0$
and $F(+\infty) = \lim\limits_{x\to+\infty} F(x) = 1$.

(2) $F$ is non-decreasing ({{zh 单调不减}}): if $x_1 < x_2$ then $F(x_1) \le F(x_2)$.

(3) $F$ is right-continuous ({{zh 右连续}}): $F(x + 0) = F(x)$ for every $x$.

(4) $P\{X = x\} = F(x) - F(x - 0)$: the jump of $F$ at $x$ is the probability of the
value $x$.
:::

Here $F(x + 0) = \lim_{\Delta x \to 0^+} F(x + \Delta x)$ is the limit from the right and
$F(x - 0) = \lim_{\Delta x \to 0^+} F(x - \Delta x)$ the limit from the left.

Properties (1)–(3) are also **sufficient**: any function with them is the distribution
function of some random variable. So they are the test for "can this be a distribution
function?"

### Why they hold

**(1) Between 0 and 1.**
$F(x)$ is a probability, so $0 \le F(x) \le 1$. As $x \to -\infty$ the event
$\{X \le x\}$ shrinks towards the impossible event (no real number is below every $x$),
so $F \to 0$; as $x \to +\infty$ it grows towards the certain event ($X$ is always some
real number), so $F \to 1$.

**(2) Non-decreasing.**
For any $x_1 < x_2$,
$$F(x_2) - F(x_1) = P\{x_1 < X \le x_2\} \ge 0.$$

**(3) Right-continuous.**
We need $\lim_{\Delta x\to0^+} F(x + \Delta x) = F(x)$:
$$\lim_{\Delta x\to0^+} [F(x + \Delta x) - F(x)] = \lim_{\Delta x\to0^+} P\{x < X \le x + \Delta x\} = 0,$$
because the intervals $(x, x + \Delta x]$ shrink to nothing: no point is in all of them.

**(4) The jump is the probability of the point.**
$$\lim_{\Delta x\to0^+} [F(x) - F(x - \Delta x)] = \lim_{\Delta x\to0^+} P\{x - \Delta x < X \le x\} = P\{X = x\},$$
because the intervals $(x - \Delta x, x]$ shrink to the single point $x$, which is in all
of them.

The asymmetry between (3) and (4) is the whole story: approaching from the **right**,
the shrinking interval $(x, x+\Delta x]$ never contains $x$, so nothing is left;
approaching from the **left**, $(x-\Delta x, x]$ always contains $x$, so the probability
of $x$ itself is left. That is why $F$ is right-continuous but may jump on the left.

::: callout key The one idea
$F(x) = P\{X \le x\}$ climbs from 0 to 1, never goes down, and at each point either
climbs smoothly or jumps; a jump of height $h$ at $x$ means $P\{X = x\} = h$, and the
value at the jump is the **top** of the jump.
:::

## Probabilities of intervals

Every interval, open or closed at either end, comes from $F$ with properties (3) and
(4). Write $F(a - 0)$ for the left limit at $a$.

::: formula Interval probabilities from F | 用分布函数计算概率
$$\begin{aligned}
P\{a < X \le b\} &= F(b) - F(a) \\
P\{X > a\} &= 1 - F(a) \\
P\{X = a\} &= F(a) - F(a - 0) \\
P\{X < a\} &= F(a - 0) \\
P\{a < X < b\} &= F(b - 0) - F(a) \\
P\{a \le X \le b\} &= F(b) - F(a - 0)
\end{aligned}$$
--
F(a - 0) | the limit of $F$ from the left at $a$ |
:::

Each comes from the first by adding or removing an end point:

- $P\{X < a\} = P\{X \le a\} - P\{X = a\} = F(a) - [F(a) - F(a - 0)] = F(a - 0)$.
- $P\{a < X < b\} = P\{a < X \le b\} - P\{X = b\} = F(b) - F(a) - [F(b) - F(b - 0)]$.
- $P\{a \le X \le b\} = P\{a < X \le b\} + P\{X = a\} = F(b) - F(a) + [F(a) - F(a - 0)]$.

(The slides leave the last two in the long form; the short forms on the right of the
formula block are the same thing simplified.) A memory aid: a "$\le b$" uses $F(b)$, a
"$< b$" uses $F(b - 0)$; a "$> a$" subtracts $F(a)$, a "$\ge a$" subtracts $F(a - 0)$.

::: callout pitfall Strict or not strict
For a discrete variable, $<$ and $\le$ give **different** answers whenever the end point
is a value $X$ can take. $P\{X \le 1\} = F(1)$ but $P\{X < 1\} = F(1 - 0)$. Only when $F$
is continuous at the end (always the case for a continuous variable, Lesson 2.3) can
you ignore the difference.
:::

## From a distribution law to F

For a discrete variable, $\{X \le x\}$ is made of the values $x_k$ at or below $x$, so

::: formula Distribution function of a discrete variable | 离散型随机变量的分布函数
$$F(x) = P\{X \le x\} = \sum_{x_k \le x} p_k$$
--
x_k | the values of $X$ |
p_k | their probabilities, $P\{X = x_k\}$ |
:::

As $x$ moves right, the sum only changes when $x$ passes one of the values $x_k$, and
then it jumps up by $p_k$. So $F$ is a **step function** ({{zh 阶梯函数}}): flat between the
values, with a jump at each value ({{zh 跳跃点}}) whose height ({{zh 跳跃度}}) is that
value's probability.

::: example Law → distribution function (例1)
$X$ has the law below. Find its distribution function.

| Value of $X$ | 0             | 1             | 2             | 3             |
| --- | ------------- | ------------- | ------------- | ------------- |
| $p$ | $\frac{1}{8}$ | $\frac{3}{8}$ | $\frac{3}{8}$ | $\frac{1}{8}$ |

== Interval by interval ==
- $x < 0$: no value is $\le x$, so $F(x) = 0$.
- $0 \le x < 1$: only 0 is, $F(x) = P\{X = 0\} = \frac18$.
- $1 \le x < 2$: $F(x) = \frac18 + \frac38 = \frac12$.
- $2 \le x < 3$: $F(x) = \frac18 + \frac38 + \frac38 = \frac78$.
- $x \ge 3$: everything, $F(x) = 1$.
== Write it out ==
$$F(x) = \begin{cases} 0, & x < 0, \\ \frac18, & 0 \le x < 1, \\ \frac12, & 1 \le x < 2, \\ \frac78, & 2 \le x < 3, \\ 1, & x \ge 3. \end{cases}$$
Each interval is **closed on the left, open on the right**: at $x = 0$ itself,
$F(0) = P\{X \le 0\} = \frac18$, the top of the jump.
:::

This is the law of $Y$, the number of red lights, in Lesson 2.1's traffic-light example,
$B(3, \frac12)$. Here are its bars and its staircase together (the near-vertical
strokes are the jumps; the filled value at each jump is the upper one):

::: plot The law of Example 1 and its distribution function
x: -1 .. 4.5
y: 0 .. 1.1
xlabel: x
bars p(x) = comb(3, x) / 8
F(x) = (min(1, max(0, floor(x) + 1)) + 3 min(1, max(0, floor(x - 1) + 1)) + 3 min(1, max(0, floor(x - 2) + 1)) + min(1, max(0, floor(x - 3) + 1))) / 8
:::

::: callout pitfall Which end is closed
The slide shows the same steps written with $0 < x \le 1$, $1 < x \le 2$, … and asks:
is this a distribution function? **No.** That version has $F(0) = 0$, but
$P\{X \le 0\} = \frac18$; it is continuous from the left instead of the right, breaking
property (3). For a step function, always put "$\le$" on the left end of each piece:
$a \le x < b$.
:::

::: example Using the formulas on Example 1
With the $F$ of Example 1, find $P\{1 < X \le 3\}$, $P\{1 \le X < 3\}$ and $P\{X > 2\}$.
== Right-closed interval ==
$P\{1 < X \le 3\} = F(3) - F(1) = 1 - \frac12 = \frac12$ (the values 2 and 3:
$\frac38 + \frac18$).
== Left-closed, right-open ==
$P\{1 \le X < 3\} = F(3 - 0) - F(1 - 0) = \frac78 - \frac18 = \frac34$ (the values 1 and 2:
$\frac38 + \frac38$).
== Tail ==
$P\{X > 2\} = 1 - F(2) = 1 - \frac78 = \frac18$.
:::

## From F to a distribution law

Going back is reading the jumps: by property (4), $P\{X = a\} = F(a) - F(a - 0)$, so the
values of $X$ are the points where $F$ jumps and their probabilities are the heights.

::: example Distribution function → law (例2)
$$F(x) = \begin{cases} 0, & x < -1, \\ 0.4, & -1 \le x < 1, \\ 0.8, & 1 \le x < 3, \\ 1, & x \ge 3. \end{cases}$$
Find the law of $X$.
== Find the jumps ==
$F$ jumps at $-1$, $1$ and $3$ and is flat everywhere else, so those are the values of $X$.
== Their heights ==
$P\{X = -1\} = F(-1) - F(-1 - 0) = 0.4 - 0 = 0.4$;
$P\{X = 1\} = 0.8 - 0.4 = 0.4$;
$P\{X = 3\} = 1 - 0.8 = 0.2$.

| Value of $X$ | −1 | 1 | 3 |
| ----- | ---- | --- | --- |
| $p_k$ | 0.4  | 0.4 | 0.2 |

Check: $0.4 + 0.4 + 0.2 = 1$.
:::

The slide stops at the formula $P\{X = a\} = F(a) - F(a - 0)$; the table above is the
completion.

::: plot The staircase of Example 2
x: -2.5 .. 4.5
y: 0 .. 1.1
bars p(x) = 0.4 * (1 - min(1, abs(x + 1))) + 0.4 * (1 - min(1, abs(x - 1))) + 0.2 * (1 - min(1, abs(x - 3)))
F(x) = 0.4 min(1, max(0, floor(x + 1) + 1)) + 0.4 min(1, max(0, floor(x - 1) + 1)) + 0.2 min(1, max(0, floor(x - 3) + 1))
:::

So for a discrete variable the law and the distribution function carry exactly the
same information:

$$p_k = P\{X = x_k\} \quad\Longleftrightarrow\quad F(x) = \sum_{x_k \le x} p_k.$$

::: callout exam What exams ask
The two standard discrete question types (the slides call them 重要题型): **given the
law, find $F$** (write it piecewise with $a \le x < b$ pieces) and **given $F$, find the
law** (read the jumps). Also: "find the constant in $F$" (use $F(+\infty) = 1$, and
continuity where the variable is continuous), "which of these can be a distribution
function?" (check properties (1)–(3)), and interval probabilities with the right
choice of $F(a)$ or $F(a - 0)$.
:::

## Spotting functions that aren't distribution functions

To show a function is **not** a distribution function, find one property it breaks.

::: example Is sin x a distribution function?
$F(x) = \sin x$ for $0 \le x \le \pi$, and $F(x) = 0$ otherwise. Can it be the
distribution function of some random variable?
== Monotonicity ==
On $[\frac\pi2, \pi]$, $\sin x$ falls from 1 to 0: property (2) fails.
== Or the limit ==
$F(+\infty) = \lim_{x\to+\infty} F(x) = 0 \ne 1$: property (1) fails too. Either one is
enough: it is not a distribution function.
:::

::: plot Why ln(1 + x)/(1 + x) fails
x: 0 .. 30
y: 0 .. 1
f(x) = ln(1 + x) / (1 + x)
:::

The curve above (option B in the first question below) rises to a peak of $\frac1e$ at
$x = e - 1$ and then sinks back towards 0: it decreases, and it never reaches 1.

::: example A combination of distribution functions
$F_1$ and $F_2$ are distribution functions. For which $a, b$ is
$F(x) = aF_1(x) - bF_2(x)$ a distribution function?
== The limit at +∞ ==
$F(+\infty) = a \cdot 1 - b \cdot 1 = a - b$ must be 1.
== Check the options ==
$a = \frac35$, $b = -\frac25$: $a - b = 1$ ✓, and then $F = \frac35F_1 + \frac25F_2$ is a
weighted average of two distribution functions, which keeps all the properties.
($a = -\frac12, b = \frac32$ gives $-2$; $a = b = \frac23$ gives 0; $a = \frac12, b = \frac32$
gives $-1$.)
:::

::: cards Distribution functions
Distribution function of $X$ :: $F(x) = P\{X \le x\}$, $-\infty < x < +\infty$ (分布函数)
$P\{x_1 < X \le x_2\}$ from $F$ :: $F(x_2) - F(x_1)$
$F(-\infty)$ and $F(+\infty)$ :: 0 and 1
Is $F$ left- or right-continuous? :: Right-continuous: $F(x + 0) = F(x)$
$P\{X = a\}$ from $F$ :: $F(a) - F(a - 0)$, the jump at $a$
$P\{X < a\}$ from $F$ :: $F(a - 0)$
$P\{X > a\}$ from $F$ :: $1 - F(a)$
$P\{a \le X \le b\}$ from $F$ :: $F(b) - F(a - 0)$
$P\{a < X < b\}$ from $F$ :: $F(b - 0) - F(a)$
$F$ of a discrete variable :: A step function, $F(x) = \sum_{x_k \le x} p_k$; jumps at the values, heights $p_k$
Three properties that make a function a distribution function :: Between 0 and 1 with limits 0 and 1; non-decreasing; right-continuous
Pieces of a discrete $F$ are written as :: $a \le x < b$ (closed left, open right)
:::

::: quiz Distribution functions
? Which of these **cannot** be the distribution function of a random variable?
- [ ] $F_1(x) = 0$ for $x < 0$; $\frac13$ for $0 \le x < 1$; $\frac12$ for $1 \le x < 2$; $1$ for $x \ge 2$
- [x] $F_2(x) = 0$ for $x < 0$; $\dfrac{\ln(1+x)}{1+x}$ for $x \ge 0$
- [ ] $F_3(x) = 0$ for $x < 0$; $\frac14x^2$ for $0 \le x < 2$; $1$ for $x \ge 2$
- [ ] $F_4(x) = 1 - e^{-x}$ for $x > 0$; $0$ for $x \le 0$
> $F_2$ rises to $\frac1e$ at $x = e - 1$, then decreases towards 0: it isn't non-decreasing and $F_2(+\infty) = 0 \ne 1$. $F_1$ is a right-continuous staircase from 0 to 1, $F_3$ is continuous and increasing with $F_3(2) = 1$, $F_4$ is the exponential distribution function.

? $F(x) = aF_1(x) - bF_2(x)$ is to be a distribution function, where $F_1, F_2$ are distribution functions. Choose:
- [x] $a = \frac35$, $b = -\frac25$
- [ ] $a = -\frac12$, $b = \frac32$
- [ ] $a = \frac23$, $b = \frac23$
- [ ] $a = \frac12$, $b = \frac32$
> $F(+\infty) = a - b$ must equal 1. Only $\frac35 - (-\frac25) = 1$ works, giving $\frac35F_1 + \frac25F_2$.

? $F(x) = \dfrac{Ax}{1+x}$ for $x > 0$ and $0$ for $x \le 0$ is a distribution function. What is $A$?
answer: 1
> $F(+\infty) = \lim_{x\to\infty} \frac{Ax}{1+x} = A$ must be 1.

? With that $F$ ($A = 1$), what is $P\{1 < X \le 2\}$?
answer: 1/6
> $F(2) - F(1) = \frac23 - \frac12 = \frac16$.

? $X$ takes 0, 1, 2, 3 with probabilities $\frac18, \frac38, \frac38, \frac18$. What is $F(1.5)$?
answer: 1/2
> $F(1.5) = P\{X \le 1.5\} = P\{X = 0\} + P\{X = 1\} = \frac18 + \frac38 = \frac12$.

? Same $X$. What is $F(2)$?
answer: 7/8
> $F(2) = P\{X \le 2\}$ includes the value 2: $\frac18 + \frac38 + \frac38 = \frac78$. At a jump, $F$ takes the upper value.

? $F$ is 0 for $x < -1$, 0.4 on $[-1, 1)$, 0.8 on $[1, 3)$ and 1 for $x \ge 3$. What is $P\{X = 1\}$?
answer: 0.4
> The jump at 1: $F(1) - F(1 - 0) = 0.8 - 0.4 = 0.4$.

? Same $F$. What is $P\{-1 < X < 3\}$?
answer: 0.4
> $F(3 - 0) - F(-1) = 0.8 - 0.4 = 0.4$: only the value 1 lies strictly between $-1$ and 3.

? Which formula gives $P\{X < a\}$?
- [ ] $F(a)$
- [x] $F(a - 0)$
- [ ] $1 - F(a)$
- [ ] $F(a) - F(a - 0)$
> $P\{X < a\} = P\{X \le a\} - P\{X = a\} = F(a) - [F(a) - F(a - 0)] = F(a - 0)$.

? Which property of a distribution function does the left limit $F(x - 0)$ appear in?
- [ ] $F$ is right-continuous
- [x] $P\{X = x\} = F(x) - F(x - 0)$
- [ ] $F$ is non-decreasing
> Property (4): the gap between $F(x)$ and its left limit is the probability of the single point $x$. From the right there is no gap (property 3).
:::

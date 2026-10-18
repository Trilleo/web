---
title: Continuous random variables
zh: 连续型随机变量
summary: The probability density p(x) and how it gives the distribution function and interval probabilities, why single points have probability 0, finding constants, and the uniform and exponential distributions with memorylessness.
source: 5随机变量3-1 (§2.1, last part) and 6连续型随机变量3-2 (to §2.2), 2026-09-14 → 09-17
---

A lifetime, a waiting time, a measurement error: these random variables take every
value in an interval, so no table of values and probabilities can list them, and the
chance of hitting one exact value (a lifetime of *exactly* 1000.000… hours) is 0. Yet
some ranges are clearly more likely than others. The tool for this is the **probability
density**: a curve whose **area** over an interval is the probability of that interval.
This lesson defines it, shows how it ties to the distribution function of Lesson 2.2,
works through the standard "find the constant" exercises, and meets the two simplest
continuous distributions: the uniform and the exponential. (The normal distribution,
the most important one, has Lesson 2.4 to itself.)

## The probability density

Think of a discrete distribution as weights placed at points: $p_k$ at $x_k$. Now
grind the weights into sand and spread it along the number line: there is no weight
*at* any point any more, but there is more sand in some places than others. How
thickly the sand lies at $x$ is the density $p(x)$; the amount of sand over an interval
is the area under $p$ there, and the total amount is 1.

::: define Continuous random variable | 连续型随机变量
A random variable $X$ with distribution function $F(x)$ is continuous if there is a
non-negative function $p(x)$ such that for every real $x$
$$F(x) = \int_{-\infty}^{x} p(t)\,\mathrm{d}t .$$
:::

::: define Probability density | 概率密度
The function $p(x)$ in that definition is the probability density function
({{zh 概率密度函数}}) of $X$, or density for short. The slides write it $p(x)$ in the
definitions and $f(x)$ in many examples; both mean the same.
:::

So $F(x)$ is the **area under the density to the left of $x$**.

::: formula Distribution function from the density | 分布函数与概率密度
$$F(x) = \int_{-\infty}^{x} p(t)\,\mathrm{d}t, \qquad F'(x) = p(x) \text{ where } p \text{ is continuous}$$
--
p(x) | the probability density of $X$ |
F(x) | the distribution function, $P\{X \le x\}$ |
:::

### Properties

::: theorem Properties of a density | 概率密度的性质
(1) $p(x) \ge 0$.

(2) $\displaystyle\int_{-\infty}^{+\infty} p(x)\,\mathrm{d}x = 1$.

(3) $P\{x_1 < X \le x_2\} = F(x_2) - F(x_1) = \displaystyle\int_{x_1}^{x_2} p(x)\,\mathrm{d}x$.

(4) If $p$ is continuous at $x$, then $F'(x) = p(x)$.

Properties (1) and (2) are **necessary and sufficient** ({{zh 充要条件}}): a function is
the density of some random variable exactly when it is $\ge 0$ and its total integral
is 1.
:::

(2) is $F(+\infty) = 1$. (3) follows from the definition:
$$P\{x_1 < X \le x_2\} = F(x_2) - F(x_1) = \int_{-\infty}^{x_2} p(x)\,\mathrm{d}x - \int_{-\infty}^{x_1} p(x)\,\mathrm{d}x = \int_{x_1}^{x_2} p(x)\,\mathrm{d}x.$$

::: formula Probability of an interval from the density | 概率密度求区间概率
$$P\{x_1 < X \le x_2\} = \int_{x_1}^{x_2} p(x)\,\mathrm{d}x$$
--
x_1, x_2 | the ends of the interval |
:::

Drag $x_1$ and $x_2$ below: the shaded area under the density is the probability that
$X$ lands between them. (The density is $6x(1-x)$ on $[0, 1]$; the whole area is 1.)

::: plot Probability as area under the density
x: -0.2 .. 1.2
y: 0 .. 1.7
f(x) = max(0, 6 x (1 - x))
region S: 0 < y < 6 x (1 - x), a < x < b
slider a: 0 .. 1 = 0.2
slider b: 0 .. 1 = 0.6
:::

::: explore The area in that picture
slider a: 0 .. 1 = 0.2
slider b: 0 .. 1 = 0.6
P = (3 b^2 - 2 b^3) - (3 a^2 - 2 a^3) | | $P\{a < X \le b\}$ (for $a \le b$)
:::

(Here $F(x) = 3x^2 - 2x^3$ on $[0, 1]$, so the area is $F(b) - F(a)$.)

### What the density means

Property (4) says
$$p(x) = F'(x) = \lim_{\Delta x\to0} \frac{F(x + \Delta x) - F(x)}{\Delta x} = \lim_{\Delta x\to0} \frac{P\{x < X \le x + \Delta x\}}{\Delta x}:$$
the density is the probability per unit length near $x$. If probability is mass,
$p(x)$ is a **linear density**, like kilograms per metre of a rod. For a short interval,

$$P\{x < X \le x + \Delta x\} = \int_x^{x+\Delta x} p(t)\,\mathrm{d}t \approx p(x)\,\Delta x .$$

So $p(x)\,\Delta x$ plays the part for continuous variables that $p_k = P\{X = x_k\}$
plays for discrete ones.

::: example Which function is a density?
Which of these (each 0 outside $[\pi, \frac32\pi]$) can be a probability density?
(A) $\sin x$; (B) $-\sin x$; (C) $\cos x$; (D) $1 - \cos x$, on $\pi \le x \le \frac32\pi$.
== Sign ==
On $[\pi, \frac32\pi]$ (the third quadrant) $\sin x \le 0$ and $\cos x \le 0$. So (A) and
(C) are negative there: out. (B) $-\sin x \ge 0$ and (D) $1 - \cos x \ge 0$ pass.
== Total area ==
(B) $\int_\pi^{3\pi/2} (-\sin x)\,\mathrm{d}x = [\cos x]_\pi^{3\pi/2} = 0 - (-1) = 1$ ✓.
(D) $\int_\pi^{3\pi/2} (1 - \cos x)\,\mathrm{d}x = \frac\pi2 - [\sin x]_\pi^{3\pi/2} = \frac\pi2 + 1 \ne 1$.
So only (B) is a density.
:::

## Three things to notice

### F is continuous; p need not be

The distribution function of a continuous random variable is **always continuous**:

$$\lim_{\Delta x\to0} [F(x + \Delta x) - F(x)] = \lim_{\Delta x\to0} \int_x^{x+\Delta x} p(t)\,\mathrm{d}t = 0 .$$

The density, though, may jump. A counterexample from the slides:

$$p(x) = \begin{cases} 0.5, & x \in [0, 1], \\ 1, & x \in (1, 1.5], \\ 0, & \text{otherwise}. \end{cases}$$

It is $\ge 0$ and its area is $0.5 \cdot 1 + 1 \cdot 0.5 = 1$, so it is a density, yet it
jumps at 0, 1 and 1.5. A density may have finitely many such breaks; they change no
integral and no probability. Its $F$ (below) has corners there, but no jumps.

::: plot A density with jumps, and its continuous F
x: -0.5 .. 2
y: 0 .. 1.2
p(x) = 0.5 (sign(x) - sign(x - 1)) / 2 + (sign(x - 1) - sign(x - 1.5)) / 2
F(x) = 0.5 min(1, max(0, x)) + min(0.5, max(0, x - 1))
:::

### Single points have probability 0

For a continuous $X$ and any number $a$,

$$P\{X = a\} = F(a) - F(a - 0) = 0,$$

because $F$ has no jumps. Two consequences:

1. **End points don't matter**:
   $P\{a \le X \le b\} = P\{a < X \le b\} = P\{a \le X < b\} = P\{a < X < b\} = \int_a^b p(x)\,\mathrm{d}x$.
   The six interval formulas of Lesson 2.2 collapse into one.
2. **Probability 0 doesn't mean impossible.** If $\{X = a\}$ is the impossible event then
   $P\{X = a\} = 0$, but not the other way round: for a continuous $X$, every value is
   possible (the experiment produces *some* value) and still each has probability 0.

### The height of p is not a probability

$p(a)$ is **not** $P\{X = a\}$ (that is 0), and it can be bigger than 1: the uniform
density on $[0, 0.5]$ is 2. What the height tells you is how concentrated the
probability is near $a$: the higher the curve at $a$, the more likely $X$ is to fall
close to $a$.

::: callout pitfall Density versus probability
$p(x)$ is a rate, not a probability: "$0 \le p(x) \le 1$" is **not** a property of
densities, and $P\{X = x\} = p(x)$ is wrong. Probabilities come from **areas**,
$\int p$. The only conditions a density must meet are $p \ge 0$ and $\int p = 1$.
:::

::: callout key The one idea
For a continuous variable, probability is **area under the density**:
$P\{a < X < b\} = \int_a^b p(x)\,\mathrm{d}x = F(b) - F(a)$, with or without the end
points; and $F' = p$ takes you back from $F$ to the density.
:::

## Finding constants

Two classic exercises: a distribution function or a density with unknown constants.
Use **continuity of $F$** (a continuous variable's $F$ can't jump) or **total area 1**.

::: example Constants in a distribution function (例1)
$X$ is continuous with
$$F(x) = \begin{cases} 0, & x \le -a, \\ A + B\arcsin\dfrac{x}{a}, & -a < x \le a, \\ 1, & x > a, \end{cases} \qquad (a > 0).$$
Find (1) $A$ and $B$; (2) $P\{-a < X < \frac a2\}$; (3) the density of $X$.
== (1) Continuity at −a and a ==
$F$ must be continuous, so the middle piece must meet 0 at $x = -a$ and 1 at $x = a$:
$$A + B\arcsin(-1) = A - \tfrac\pi2 B = 0, \qquad A + B\arcsin 1 = A + \tfrac\pi2 B = 1.$$
Adding: $2A = 1$, $A = \frac12$; then $B = \frac1\pi$.
== (2) An interval ==
$$P\{-a < X < \tfrac a2\} = F(\tfrac a2) - F(-a) = \frac12 + \frac1\pi\arcsin\frac12 - 0 = \frac12 + \frac1\pi \cdot \frac\pi6 = \frac23 .$$
== (3) Differentiate ==
$$p(x) = F'(x) = \begin{cases} \dfrac{1}{\pi\sqrt{a^2 - x^2}}, & -a < x < a, \\ 0, & \text{otherwise}. \end{cases}$$
:::

This density is unbounded near $\pm a$ (it shoots up), another reminder that a
density's height isn't a probability; the area under it is still 1.

::: plot Example 1: the arcsine density and its F
x: -3 .. 3
y: 0 .. 1.5
p(x) = 1 / (pi sqrt(a^2 - x^2))
F(x) = 1/2 + arcsin(max(-1, min(1, x / a))) / pi
slider a: 0.5 .. 2.5 = 2
:::

::: example A density with an unknown constant (例2)
$$f(x) = \begin{cases} kx, & 0 \le x < 3, \\ 2 - \dfrac x2, & 3 \le x \le 4, \\ 0, & \text{otherwise}. \end{cases}$$
(1) Find $k$. (2) Find the distribution function. (3) Find $P\{1 < X \le \frac72\}$.
== (1) Total area 1 ==
$$\int_0^3 kx\,\mathrm{d}x + \int_3^4 \left(2 - \frac x2\right)\mathrm{d}x = \frac{9k}{2} + \left(2 - \frac{16 - 9}{4}\right) = \frac{9k}{2} + \frac14 = 1,$$
so $k = \frac16$.
== (2) Integrate piece by piece ==
$F(x) = \int_{-\infty}^x f(t)\,\mathrm{d}t$, one piece of $f$ at a time:
- $x < 0$: $F(x) = 0$.
- $0 \le x < 3$: $F(x) = \int_0^x \frac t6\,\mathrm{d}t = \frac{x^2}{12}$.
- $3 \le x < 4$: $F(x) = \int_0^3 \frac t6\,\mathrm{d}t + \int_3^x \left(2 - \frac t2\right)\mathrm{d}t = \frac34 + \left(2x - \frac{x^2}{4}\right) - \left(6 - \frac94\right) = -3 + 2x - \frac{x^2}{4}$.
- $x \ge 4$: $F(x) = 1$.
$$F(x) = \begin{cases} 0, & x < 0, \\ \dfrac{x^2}{12}, & 0 \le x < 3, \\ -3 + 2x - \dfrac{x^2}{4}, & 3 \le x < 4, \\ 1, & x \ge 4. \end{cases}$$
Check: at $x = 3$ both middle pieces give $\frac34$; at $x = 4$, $-3 + 8 - 4 = 1$.
== (3) An interval ==
$$P\{1 < X \le \tfrac72\} = F(\tfrac72) - F(1) = \left(-3 + 7 - \frac{49}{16}\right) - \frac1{12} = \frac{15}{16} - \frac1{12} = \frac{41}{48}.$$
:::

::: plot Example 2: the density, its F, and the area for P{1 < X ≤ 7/2}
x: -0.5 .. 4.5
y: 0 .. 1.1
f(x) = (sign(x) - sign(x - 3)) / 2 * x / 6 + (sign(x - 3) - sign(x - 4)) / 2 * (2 - x / 2)
F(x) = min(max(x, 0), 3)^2 / 12 + (-3 + 2 min(max(x, 3), 4) - min(max(x, 3), 4)^2 / 4) - 3/4
region P: 0 < y < x / 6, 1 < x < 3
region Q: 0 < y < 2 - x / 2, 3 <= x <= 3.5
:::

::: callout pitfall Forgetting the pieces
When you integrate a piecewise density to get $F$, the piece for $3 \le x < 4$ must
**include all the area before 3** ($\frac34$ here), and $F$ must be written on the
whole line: $0$ before the support, $1$ after it. A common slip is to write only
$\int_3^x$ and get an $F$ that jumps down at 3.
:::

::: callout exam What exams ask
"Find the constant" (from $\int p = 1$, or from continuity of $F$ and
$F(+\infty) = 1$), then $F$ from $p$ piece by piece (or $p = F'$), then an interval
probability: exactly Examples 1 and 2. Also true/false statements about densities
(is $0 \le p \le 1$ required? is $P\{X = x\} = p(x)$?).
:::

## The uniform distribution

Pick a point "at random" in an interval $[a, b]$, with no part of the interval
favoured. The density must be flat; total area 1 over a base of $b - a$ forces its
height to be $\frac{1}{b-a}$.

::: define Uniform distribution | 均匀分布
$X$ is uniform on $[a, b]$, written $X \sim U[a, b]$ (or $U(a, b)$), if its density is
$$f(x) = \begin{cases} \dfrac{1}{b-a}, & a \le x \le b, \\ 0, & \text{otherwise}. \end{cases}$$
:::

**What it means:** a uniform $X$ is equally likely to land in any two sub-intervals of
$(a, b)$ of the same length $l$; the probability is $\frac{l}{b-a}$, length over
length, as in geometric probability. Integrating the density gives its distribution
function, a ramp from 0 to 1:

::: formula Uniform distribution | 均匀分布
$$f(x) = \frac{1}{b-a} \ (a \le x \le b), \qquad F(x) = \begin{cases} 0, & x < a, \\ \dfrac{x-a}{b-a}, & a \le x < b, \\ 1, & x \ge b. \end{cases}$$
--
a, b | the ends of the interval, $a < b$ |
:::

::: plot The uniform distribution U[a, b]: density and F
x: -1 .. 7
y: 0 .. 1.2
f(x) = (sign(x - a) - sign(x - b)) / (2 (b - a))
F(x) = min(1, max(0, (x - a) / (b - a)))
slider a: 0 .. 3 = 1
slider b: 3.5 .. 6 = 5
:::

To find $P\{c < X < d\}$ for a uniform $X$: **cut the interval down to $[a, b]$ first**
(outside it there is no probability), then divide its length by $b - a$.

::: example Which statement is true? (in-class question)
$X \sim U[1, 5]$. Which is right? (A) $P\{a \le X \le b\} = \frac{b-a}{4}$;
(B) $P\{3 < X < 6\} = \frac34$; (C) $P\{0 < X < 4\} = 1$; (D) $P\{-1 < X \le 3\} = \frac12$.
== The density ==
$f(x) = \frac14$ on $[1, 5]$, 0 elsewhere.
== Check each ==
(A) only holds when $[a, b] \subseteq [1, 5]$, and here $a, b$ are arbitrary: not
always true. (B) $P\{3 < X < 6\} = P\{3 < X \le 5\} = \frac24 = \frac12$, not
$\frac34$. (C) $P\{0 < X < 4\} = P\{1 \le X < 4\} = \frac34$, not 1. (D)
$P\{-1 < X \le 3\} = P\{1 \le X \le 3\} = \frac24 = \frac12$ ✓. The answer is **D**.
:::

::: example Three observations (例3)
$X \sim U[2, 5]$. $X$ is observed independently three times. Find the probability that
at least two observations are greater than 3.
== One observation ==
$f(x) = \frac13$ on $[2, 5]$, so $P\{X > 3\} = \int_3^5 \frac13\,\mathrm{d}x = \frac23$.
== Count them ==
Let $Y$ be the number of observations above 3: three independent trials with success
probability $\frac23$, so $Y \sim B(3, \frac23)$ (Lesson 2.1).
== At least two ==
$$P\{Y \ge 2\} = C_3^2 \left(\tfrac23\right)^2 \tfrac13 + C_3^3 \left(\tfrac23\right)^3 = \frac{12}{27} + \frac{8}{27} = \frac{20}{27}.$$
:::

This pattern — a continuous variable gives a probability $p$ for one observation, and
counting over $n$ independent observations gives $B(n, p)$ — is a favourite exam
combination.

::: example Waiting for a bus
Buses leave every 10 minutes, and you arrive at a random moment, so your wait
$W \sim U[0, 10]$ minutes. Find the probability of waiting more than 7 minutes, and
$F(4)$.
== More than 7 ==
$P\{W > 7\} = \frac{10 - 7}{10} = 0.3$.
== F(4) ==
$F(4) = \frac{4 - 0}{10 - 0} = 0.4$: a 40% chance of waiting at most 4 minutes.
:::

## The exponential distribution

How long until a machine fails, a radioactive atom decays, the next customer arrives?
Short waits are the most likely, and the probability of a long wait fades away
exponentially.

::: define Exponential distribution | 指数分布
$X$ follows the exponential distribution with parameter $\beta > 0$, written
$X \sim E(\beta)$, if its density is
$$f(x) = \begin{cases} \beta e^{-\beta x}, & x > 0, \\ 0, & x \le 0. \end{cases}$$
Many books call the parameter $\lambda$ and write $E(\lambda)$; it is the same thing.
:::

::: formula Exponential distribution | 指数分布
$$f(x) = \beta e^{-\beta x} \ (x > 0), \qquad F(x) = \begin{cases} 1 - e^{-\beta x}, & x > 0, \\ 0, & x \le 0. \end{cases}$$
--
\beta | the parameter, $\beta > 0$ (often written $\lambda$) |
:::

$F$ comes from $\int_0^x \beta e^{-\beta t}\,\mathrm{d}t = 1 - e^{-\beta x}$, and the area is 1
because $e^{-\beta x} \to 0$. The slide's advice: **learn both the density and $F$ by
heart**. A handy consequence: $P\{X > x\} = 1 - F(x) = e^{-\beta x}$ for $x > 0$.

::: plot The exponential distribution E(β): density and F
x: -1 .. 6
y: 0 .. 2
f(x) = (1 + sign(x)) / 2 * β e^(-β x)
F(x) = max(0, 1 - e^(-β x))
slider β: 0.2 .. 2 = 1
:::

::: callout pitfall The missing factor β
The density is $\beta e^{-\beta x}$, not $e^{-\beta x}$: without the factor $\beta$ the
area is $\frac1\beta$, not 1. And remember the support: the density is 0 for $x \le 0$,
so $P\{X < 0\} = 0$.
:::

### Memorylessness

::: theorem Memorylessness of the exponential distribution | 指数分布的无记忆性
If $X \sim E(\beta)$, then for all $s > 0$, $t > 0$,
$$P\{X > s + t \mid X > s\} = P\{X > t\}.$$
:::

**Why:** $\{X > s + t\} \subseteq \{X > s\}$, so their intersection is $\{X > s + t\}$
and
$$P\{X > s + t \mid X > s\} = \frac{P\{X > s + t\}}{P\{X > s\}} = \frac{e^{-\beta(s+t)}}{e^{-\beta s}} = e^{-\beta t} = P\{X > t\}.$$

In words: having already lasted $s$ hours, a device with an exponential lifetime is
"as good as new": the chance it lasts $t$ more hours is the same as for a brand-new
one. That is why the exponential distribution is called the "forever young"
({{zh 永远年轻}}) distribution. It suits failures that come from sudden shocks, not
from wear.

::: example A machine's time between failures (例4)
The time $T$ (hours) between two failures of a large machine is $T \sim E(\beta)$.
Given that the machine has worked 8 h without failure, find the probability that it
works another 6 h without failure.
== The distribution function ==
$F(t) = 1 - e^{-\beta t}$ for $t > 0$ (0 otherwise), so $P\{T \ge t\} = e^{-\beta t}$.
== The conditional probability ==
"Another 6 h after 8 h" is $T \ge 14$ given $T \ge 8$:
$$P\{T \ge 14 \mid T \ge 8\} = \frac{P\{T \ge 14, T \ge 8\}}{P\{T \ge 8\}} = \frac{P\{T \ge 14\}}{P\{T \ge 8\}} = \frac{1 - F(14)}{1 - F(8)} = \frac{e^{-14\beta}}{e^{-8\beta}} = e^{-6\beta}.$$
== Compare ==
$e^{-6\beta} = P\{T \ge 6\}$: the 8 hours already worked make no difference.
:::

::: callout note Corrections to the slide
The slide computes $P\{T \ge 16 \mid T \ge 8\} = e^{-8\lambda} = P\{T \ge 8\}$, i.e. a
further 8 hours, but the question asks for a further **6** hours, so the event is
$T \ge 14$ and the answer is $e^{-6\beta} = P\{T \ge 6\}$. The method (memorylessness)
is the same. The slide also switches from $\beta$ in the question to $\lambda$ in $F$;
they are the same parameter.
:::

::: example An interval for E(1/9) (in-class question)
$X$ is exponential with parameter $\frac19$. Find $P\{3 < X < 9\}$.
== Use F ==
$F(x) = 1 - e^{-x/9}$ for $x > 0$. End points don't matter, so
$$P\{3 < X < 9\} = F(9) - F(3) = (1 - e^{-1}) - (1 - e^{-1/3}) = e^{-1/3} - e^{-1} = \frac{1}{\sqrt[3]{e}} - \frac1e \approx 0.3487.$$
== The wrong options ==
$F(\frac99) - F(\frac39)$ puts the wrong numbers into $F$; $\frac19(e^{-1/3} - e^{-1})$ has
an extra factor $\frac19$; $\int_3^9 e^{-x/9}\,\mathrm{d}x$ forgets the factor $\frac19$ in
the density and is 9 times too big.
:::

::: cards Continuous random variables
Continuous random variable :: $F(x) = \int_{-\infty}^x p(t)\,\mathrm{d}t$ for some $p(x) \ge 0$ (连续型随机变量)
Two conditions for a function to be a density :: $p(x) \ge 0$ and $\int_{-\infty}^{+\infty} p(x)\,\mathrm{d}x = 1$
$P\{x_1 < X \le x_2\}$ from the density :: $\int_{x_1}^{x_2} p(x)\,\mathrm{d}x$
$F$ and $p$ :: $F'(x) = p(x)$ wherever $p$ is continuous
$P\{X = a\}$ for a continuous $X$ :: 0, so end points of intervals don't matter
Does $P\{X = a\} = 0$ mean $\{X = a\}$ is impossible? :: No: impossible implies probability 0, not the other way round
Can a density be bigger than 1? :: Yes (e.g. $U[0, 0.5]$ has density 2); only areas are probabilities
Is $F$ of a continuous variable continuous? Is $p$? :: $F$ always; $p$ may have finitely many jumps
$p(x)\,\Delta x$ :: $\approx P\{x < X \le x + \Delta x\}$, the continuous counterpart of $p_k$
Uniform $U[a, b]$ density and $F$ :: $\frac{1}{b-a}$ on $[a, b]$; $F(x) = \frac{x-a}{b-a}$ for $a \le x < b$
Exponential $E(\beta)$ density and $F$ :: $\beta e^{-\beta x}$ and $1 - e^{-\beta x}$ for $x > 0$, both 0 for $x \le 0$
Memorylessness :: $P\{X > s + t \mid X > s\} = P\{X > t\}$ for $X \sim E(\beta)$: "forever young"
:::

::: quiz Continuous random variables
? $X$ is continuous with density $p(x)$ and distribution function $F(x)$. Which is true?
- [ ] $0 \le p(x) \le 1$
- [ ] $P(X = x) = p(x)$
- [ ] $P(X = x) = F(x)$
- [x] $P(X = x) \le F(x)$
> For a continuous variable $P(X = x) = 0$, which is $\le F(x)$. A density may exceed 1, and neither $p(x)$ nor $F(x)$ equals $P(X = x)$ in general.

? The density $p(x)$ of a continuous random variable must satisfy:
- [ ] $0 \le p(x) \le 1$
- [ ] $p(x)$ is an even function
- [ ] $p(x)$ is non-decreasing
- [x] $\int_{-\infty}^{+\infty} p(x)\,\mathrm{d}x = 1$
> Besides $p \ge 0$, normalisation is the only requirement. Densities can exceed 1, needn't be symmetric, and (since the area is finite) can't keep increasing.

? $f(x) = \frac32\sqrt x$ on $[0, 1]$, 0 elsewhere. What is $P\{X > \frac14\}$?
answer: 7/8
> $\int_{1/4}^{1} \frac32\sqrt x\,\mathrm{d}x = [x^{3/2}]_{1/4}^{1} = 1 - \frac18 = \frac78$.

? Which can be a probability density (each 0 outside $[\pi, \frac32\pi]$)?
- [ ] $\sin x$ on $[\pi, \frac32\pi]$
- [x] $-\sin x$ on $[\pi, \frac32\pi]$
- [ ] $\cos x$ on $[\pi, \frac32\pi]$
- [ ] $1 - \cos x$ on $[\pi, \frac32\pi]$
> $\sin x$ and $\cos x$ are negative there; $\int_\pi^{3\pi/2}(-\sin x)\,\mathrm{d}x = 1$; $\int_\pi^{3\pi/2}(1 - \cos x)\,\mathrm{d}x = \frac\pi2 + 1$.

? $f(x) = kx$ on $[0, 3)$, $2 - \frac x2$ on $[3, 4]$, 0 elsewhere. What is $k$?
answer: 1/6
> $\frac{9k}{2} + \frac14 = 1$, so $k = \frac16$.

? With that density, what is $P\{1 < X \le \frac72\}$?
answer: 41/48
> $F(\frac72) - F(1) = \frac{15}{16} - \frac{1}{12} = \frac{41}{48}$.

? $F(x) = A + B\arcsin\frac xa$ on $(-a, a]$ (0 before, 1 after) for a continuous $X$. What is $B$?
answer: 1/pi
> Continuity: $A - \frac\pi2 B = 0$ and $A + \frac\pi2 B = 1$, so $A = \frac12$, $B = \frac1\pi$.

? $X \sim U[1, 5]$. Which is true?
- [ ] $P\{a \le X \le b\} = \frac{b-a}{4}$ for all $a < b$
- [ ] $P\{3 < X < 6\} = \frac34$
- [ ] $P\{0 < X < 4\} = 1$
- [x] $P\{-1 < X \le 3\} = \frac12$
> Density $\frac14$ on $[1, 5]$: $P\{-1 < X \le 3\} = \frac{3 - 1}{4} = \frac12$. B is $\frac12$, C is $\frac34$, and A fails when $[a, b]$ sticks out of $[1, 5]$.

? $X \sim U[2, 5]$ is observed 3 times independently. What is the probability that at least two observations exceed 3?
answer: 20/27
> $P\{X > 3\} = \frac23$; the count is $B(3, \frac23)$: $3 \cdot \frac49 \cdot \frac13 + \frac{8}{27} = \frac{20}{27}$.

? $X$ is exponential with parameter $\frac19$. What is $P\{3 < X < 9\}$?
answer: e^(-1/3) - e^(-1)
> $F(9) - F(3) = e^{-1/3} - e^{-1} = \frac{1}{\sqrt[3]e} - \frac1e \approx 0.3487$.

? Write the density of $E(\beta)$ for $x > 0$.
expression: β e^(-β x)
variables: β, x
> $f(x) = \beta e^{-\beta x}$ for $x > 0$ (and 0 for $x \le 0$); its integral from 0 to $x$ is $F(x) = 1 - e^{-\beta x}$.

? $T \sim E(\beta)$. Given $T \ge 8$, the probability that $T \ge 14$ equals $P\{T \ge t\}$ for which $t$?
answer: 6
> Memorylessness: $\frac{e^{-14\beta}}{e^{-8\beta}} = e^{-6\beta} = P\{T \ge 6\}$.
:::

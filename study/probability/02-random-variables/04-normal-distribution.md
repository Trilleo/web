---
title: The normal distribution
zh: 正态分布
summary: The bell curve N(μ, σ²) — its density, why it integrates to 1, how μ and σ shape it, the standard normal Φ, standardisation, and the 3σ rule.
source: 6连续型随机变量3-2 (§2.2), 2026-09-17; review in 7随机变量函数的分布4-1, 2026-09-21
---

Measure the heights of a thousand students, the errors of a thousand weighings or the
lifetimes of a thousand light bulbs, draw a histogram, and the same shape keeps
appearing: a symmetric hump in the middle with thin tails on both sides. That shape is
the {{term normal distribution | 正态分布}}, the most important distribution in the
course. This lesson describes it completely with two numbers, $\mu$ (where the hump
sits) and $\sigma$ (how wide it is), and shows how to work out any normal probability
from a single function, $\Phi$. Exams ask for normal probabilities in almost every
paper, so the steps here — standardise, then use $\Phi$ — are worth practising until
they are automatic.

Densities and distribution functions of continuous random variables were introduced in
Lesson 2.3, together with the uniform and exponential distributions; the normal
distribution is the third of the common continuous distributions.

## The normal density

Picture a bell: highest in the middle, falling away symmetrically, never quite reaching
the ground. The normal density has exactly that shape. Its peak is at a point $\mu$, and
how quickly it falls is controlled by $\sigma > 0$: a small $\sigma$ gives a tall, narrow
bell, a large one a low, wide bell.

::: define Normal distribution | 正态分布
A continuous random variable $X$ has the **normal distribution** (also called the
{{term Gaussian distribution | 高斯分布}}) with parameters $\mu$ and $\sigma^2$, where
$\mu$ is any real number and $\sigma > 0$, if its density is
$$f(x) = \frac{1}{\sqrt{2\pi}\,\sigma}\, e^{-\frac{(x-\mu)^2}{2\sigma^2}}, \qquad -\infty < x < +\infty.$$
We write $X \sim N(\mu, \sigma^2)$.
:::

::: formula Normal density | 正态分布的概率密度
$$f(x) = \frac{1}{\sqrt{2\pi}\,\sigma}\, e^{-\frac{(x-\mu)^2}{2\sigma^2}}, \quad -\infty < x < +\infty$$
--
X \sim N(\mu, \sigma^2) | X is normal with parameters μ and σ² |
\mu | centre of the curve (any real number) |
\sigma | spread of the curve, σ > 0 (the second parameter is σ², not σ) |
:::

Notice the second parameter is written as $\sigma^2$: $N(1, 4)$ means $\mu = 1$ and
$\sigma = 2$. (In the next unit you will meet $\mu$ as the mean and $\sigma^2$ as the
variance; for now they are just the two numbers that fix the curve.) The density is
positive for **every** real $x$: a normal variable can, in principle, take any value,
though values far from $\mu$ are extremely unlikely.

Move the sliders. $\mu$ slides the bell along the axis; $\sigma$ squeezes or stretches it,
and the peak height $1/(\sqrt{2\pi}\,\sigma)$ changes with it so that the area stays 1.
The grey curve is the standard normal $N(0,1)$ for comparison.

::: plot The normal density N(μ, σ²)
x: -8 .. 8
xlabel: x
ylabel: f(x)
f(x) = e^(-(x - μ)^2 / (2 σ^2)) / (sqrt(2 pi) σ)
g(x) = e^(-x^2 / 2) / sqrt(2 pi)
slider μ: -4 .. 4 = 1
slider σ: 0.4 .. 4 = 2
:::

## Why the density integrates to 1

Any density must be nonnegative and have total area 1 (Lesson 2.3). Nonnegativity is
clear here; the area is not, because $e^{-x^2/2}$ has no elementary antiderivative. The
trick is to square the integral and switch to polar coordinates.

::: theorem The Gaussian integral | 高斯积分
$$\int_{-\infty}^{+\infty} e^{-\frac{t^2}{2}}\,\d t = \sqrt{2\pi}.$$
Consequently $\int_{-\infty}^{+\infty} f(x)\,\d x = 1$ for the normal density.
:::

::: example Proof that the normal density integrates to 1
Show that $\int_{-\infty}^{+\infty} \frac{1}{\sqrt{2\pi}\,\sigma} e^{-\frac{(x-\mu)^2}{2\sigma^2}}\,\d x = 1$.
== Substitute ==
Let $t = \dfrac{x-\mu}{\sigma}$, so $\d x = \sigma\,\d t$ and $t$ still runs over all of
$\mathbb{R}$:
$$\int_{-\infty}^{+\infty} f(x)\,\d x = \frac{1}{\sqrt{2\pi}\,\sigma}\int_{-\infty}^{+\infty} e^{-\frac{(x-\mu)^2}{2\sigma^2}}\,\d x = \frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty} e^{-\frac{t^2}{2}}\,\d t. \qquad (1)$$
So it is enough to show $I = \int_{-\infty}^{+\infty} e^{-t^2/2}\,\d t = \sqrt{2\pi}$.
== Square it ==
Write $I^2$ as a product of two copies with different letters, which is a double
integral over the whole plane:
$$I^2 = \left(\int_{-\infty}^{+\infty} e^{-\frac{t^2}{2}}\,\d t\right)\left(\int_{-\infty}^{+\infty} e^{-\frac{u^2}{2}}\,\d u\right) = \iint_{\mathbb{R}^2} e^{-\frac{t^2+u^2}{2}}\,\d t\,\d u.$$
== Polar coordinates ==
Put $t = \rho\cos\theta$, $u = \rho\sin\theta$ (so $t^2 + u^2 = \rho^2$ and
$\d t\,\d u = \rho\,\d\rho\,\d\theta$):
$$I^2 = \int_0^{2\pi}\left(\int_0^{+\infty} e^{-\frac{\rho^2}{2}}\rho\,\d\rho\right)\d\theta = \int_0^{2\pi}\Big[-e^{-\frac{\rho^2}{2}}\Big]_0^{+\infty}\d\theta = \int_0^{2\pi} 1\,\d\theta = 2\pi.$$
== Conclude ==
$I > 0$, so $I = \sqrt{2\pi}$, and by (1) the density integrates to
$\frac{1}{\sqrt{2\pi}}\cdot\sqrt{2\pi} = 1$.
:::

::: callout key Remember the Gaussian integral as a formula
The lecture says to memorise $\int_{-\infty}^{+\infty} e^{-t^2/2}\,\d t = \sqrt{2\pi}$
(作为公式记住). It turns up whenever you integrate anything normal: finding a constant
$A$ in a density like $A e^{-x^2/2}$, or, later, computing means and variances.
:::

## The shape of the bell curve

Look at the formula: $x$ appears only through $(x-\mu)^2$, so values the same distance
either side of $\mu$ get the same height. The exponent is $0$ at $x = \mu$ and negative
everywhere else, so the curve is highest there. Together these give the curve's
geometric features:

1. The curve is **symmetric about the line $x = \mu$**.
2. Its maximum is at $x = \mu$, where $f(\mu) = \dfrac{1}{\sqrt{2\pi}\,\sigma}$.
3. As $x \to \pm\infty$, $f(x) \to 0$: the $x$-axis is a horizontal asymptote.
4. It has {{term inflection points | 拐点}} at $x = \mu \pm \sigma$: between them the curve
   bends downwards (concave), outside them it bends upwards. So $\sigma$ is the
   distance from the centre to where the bell "turns".
5. Fix $\sigma$ and change $\mu$: the shape doesn't change, the curve only **shifts**
   along the $x$-axis. That is why $\mu$ is called the location parameter.
6. Fix $\mu$ and change $\sigma$: the axis of symmetry stays, but the shape changes. The
   **smaller** $\sigma$, the taller and thinner the curve; the **larger** $\sigma$, the
   lower and fatter (the area under it is always 1).

Point 4 comes from the second derivative: $f''(x) = f(x)\,\dfrac{(x-\mu)^2 - \sigma^2}{\sigma^4}$,
which changes sign exactly where $(x-\mu)^2 = \sigma^2$.

The lecture's pictures show both effects. The first plot below keeps $\sigma = 2$ and
takes $\mu = -2$, $0$ and $2$ (the slide labels its left curve "$\mu = 2$"; it should read
$\mu = -2$); the second keeps $\mu = 0$ and takes $\sigma = 1, 2$ and $4$.

::: plot Fixed σ = 2: changing μ only shifts the curve
x: -9 .. 9
xlabel: x
f(x) = e^(-(x + 2)^2 / 8) / (2 sqrt(2 pi))
g(x) = e^(-x^2 / 8) / (2 sqrt(2 pi))
h(x) = e^(-(x - 2)^2 / 8) / (2 sqrt(2 pi))
:::

::: plot Fixed μ = 0: smaller σ, taller and thinner
x: -10 .. 10
xlabel: x
f(x) = e^(-x^2 / 2) / sqrt(2 pi)
g(x) = e^(-x^2 / 8) / (2 sqrt(2 pi))
h(x) = e^(-x^2 / 32) / (4 sqrt(2 pi))
:::

## The distribution function

As for any continuous random variable, the distribution function is the area under the
density to the left of $x$:
$$F(x) = P\{X \le x\} = \frac{1}{\sqrt{2\pi}\,\sigma}\int_{-\infty}^{x} e^{-\frac{(t-\mu)^2}{2\sigma^2}}\,\d t.$$
Its graph is an S-shaped curve rising from 0 to 1, passing through $\frac12$ at
$x = \mu$ (half the area lies on each side of the axis of symmetry). A small $\sigma$
makes the S steep, a large one makes it gentle.

But here is the problem the slide boxes in green: this integral's antiderivative is
**not an elementary function** (原函数不是初等函数). There is no formula in $x$ to plug
numbers into. The way out is to compute it once, for one particular normal
distribution, and reduce every other normal distribution to that one.

::: plot The normal distribution function F(x)
x: -6 .. 6
xlabel: x
ylabel: F(x)
F(x) = Phi((x - μ) / σ)
G(x) = Phi(x)
slider μ: -3 .. 3 = -2
slider σ: 0.3 .. 4 = 0.5
:::

## The standard normal distribution and Φ

::: define Standard normal distribution | 标准正态分布
The normal distribution with $\mu = 0$ and $\sigma = 1$, written $N(0,1)$. Its density
and distribution function have their own letters:
$$\varphi(x) = \frac{1}{\sqrt{2\pi}}\, e^{-\frac{x^2}{2}}, \qquad \Phi(x) = \int_{-\infty}^{x} \frac{1}{\sqrt{2\pi}}\, e^{-\frac{t^2}{2}}\,\d t, \qquad -\infty < x < +\infty.$$
:::

The density $\varphi$ (phi) is an **even function** (偶函数): $\varphi(-x) = \varphi(x)$,
a bell centred at 0 with peak $1/\sqrt{2\pi} \approx 0.399$. Its distribution function
$\Phi$ (capital phi) has been tabulated: every probability textbook has a table of
$\Phi(x)$ for $x$ from 0 to about 3.9, and on this site you can simply type `Phi(x)` in
plots, explorers and quiz answers.

::: plot The standard normal density φ and distribution function Φ
x: -4 .. 4
xlabel: x
φ(x) = e^(-x^2 / 2) / sqrt(2 pi)
Φ(x) = Phi(x)
:::

### Two important formulas

Because $\varphi$ is symmetric about 0, the area to the left of $-x$ equals the area to
the right of $x$. The area to the right of $x$ is $1 - \Phi(x)$. That gives the first
formula; putting $x = 0$ gives the second.

::: theorem Symmetry of Φ | 标准正态分布函数的性质
For every real $x$,
$$\Phi(-x) = 1 - \Phi(x), \qquad \Phi(0) = \frac12.$$
:::

::: example Proof that Φ(−x) = 1 − Φ(x)
Prove the symmetry formula from the definition of $\Phi$.
== Change variable ==
In $\Phi(-x) = \int_{-\infty}^{-x}\frac{1}{\sqrt{2\pi}}e^{-t^2/2}\,\d t$ put $t = -s$. As
$t$ runs from $-\infty$ to $-x$, $s$ runs from $+\infty$ down to $x$, and
$e^{-t^2/2} = e^{-s^2/2}$:
$$\Phi(-x) = \int_{x}^{+\infty} \frac{1}{\sqrt{2\pi}}\, e^{-\frac{s^2}{2}}\,\d s.$$
== Split the whole line ==
The integral over $(x, +\infty)$ is the whole integral (which is 1) minus the part up to
$x$:
$$\Phi(-x) = \int_{-\infty}^{+\infty}\frac{1}{\sqrt{2\pi}}e^{-\frac{s^2}{2}}\,\d s - \int_{-\infty}^{x}\frac{1}{\sqrt{2\pi}}e^{-\frac{s^2}{2}}\,\d s = 1 - \Phi(x).$$
== Φ(0) ==
With $x = 0$: $\Phi(0) = 1 - \Phi(0)$, so $\Phi(0) = \frac12$.
:::

::: plot Equal tails: the shaded areas are Φ(−a) and 1 − Φ(a)
x: -4 .. 4
xlabel: x
φ(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Left: x < -a, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
region Right: x > a, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
slider a: 0 .. 3 = 1
:::

### Reading the table

The table only lists $x \ge 0$; for negative arguments use $\Phi(-x) = 1 - \Phi(x)$. Rows
give $x$ to one decimal, columns the second decimal. To find $\Phi(1.25)$, go to row
$1.2$ and column $0.05$: $0.8944$. A few rows of the table:

| $x$ | 0.00 | 0.01 | 0.02 | 0.03 | 0.04 | 0.05 | 0.06 | 0.07 | 0.08 | 0.09 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5 | 0.6915 | 0.6950 | 0.6985 | 0.7019 | 0.7054 | 0.7088 | 0.7123 | 0.7157 | 0.7190 | 0.7224 |
| 1.0 | 0.8413 | 0.8438 | 0.8461 | 0.8485 | 0.8508 | 0.8531 | 0.8554 | 0.8577 | 0.8599 | 0.8621 |
| 1.2 | 0.8849 | 0.8869 | 0.8888 | 0.8907 | 0.8925 | 0.8944 | 0.8962 | 0.8980 | 0.8997 | 0.9015 |
| 1.5 | 0.9332 | 0.9345 | 0.9357 | 0.9370 | 0.9382 | 0.9394 | 0.9406 | 0.9418 | 0.9429 | 0.9441 |
| 2.0 | 0.9772 | 0.9778 | 0.9783 | 0.9788 | 0.9793 | 0.9798 | 0.9803 | 0.9808 | 0.9812 | 0.9817 |
| 3.0 | 0.9987 | 0.9987 | 0.9987 | 0.9988 | 0.9988 | 0.9989 | 0.9989 | 0.9989 | 0.9990 | 0.9990 |

So $\Phi(-1.25) = 1 - 0.8944 = 0.1056$. Beyond about $x = 3.9$ the table stops, since
$\Phi(x)$ is 1 to four decimals.

::: example Example 1: a standard normal probability
$X \sim N(0,1)$. Find $P\{1.25 \le X < 2\}$.
== Use Φ ==
For a continuous variable it doesn't matter whether the ends are included (Lesson 2.3),
so this is $\Phi(2) - \Phi(1.25)$.
== Read the table ==
$\Phi(2) = 0.9772$ and $\Phi(1.25) = 0.8944$, so
$$P\{1.25 \le X < 2\} = 0.9772 - 0.8944 = 0.0828.$$
:::

For a standard normal $X$, then, $P\{a < X \le b\} = \Phi(b) - \Phi(a)$, and the same for
$<$ or $\le$ at either end.

## Standardisation

Every normal curve is the standard one shifted by $\mu$ and stretched by $\sigma$. So if
you measure $X$'s distance from $\mu$ in units of $\sigma$ — "how many $\sigma$'s above the
centre is it?" — you get a standard normal variable. That number,
$Z = (X-\mu)/\sigma$, is often called the $z$-score.

::: theorem Standardisation of a normal variable | 正态分布的标准化
If $X \sim N(\mu, \sigma^2)$, then
$$Z = \frac{X - \mu}{\sigma} \sim N(0, 1).$$
:::

Why: $P\{Z \le z\} = P\{X \le \mu + \sigma z\} = \int_{-\infty}^{\mu+\sigma z}\frac{1}{\sqrt{2\pi}\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}\,\d x$,
and the substitution $t = (x-\mu)/\sigma$ turns this into $\int_{-\infty}^{z}\varphi(t)\,\d t = \Phi(z)$.
(Lesson 2.5 proves a more general fact: any linear function $aX+b$ of a normal variable is
normal.)

Standardising both ends of an interval gives the formula used in almost every normal
problem:

::: formula Normal probabilities through Φ | 正态分布的概率计算
$$P\{a < X \le b\} = P\left\{\frac{a-\mu}{\sigma} < \frac{X-\mu}{\sigma} \le \frac{b-\mu}{\sigma}\right\} = \Phi\left(\frac{b-\mu}{\sigma}\right) - \Phi\left(\frac{a-\mu}{\sigma}\right)$$
--
X \sim N(\mu,\sigma^2) | the normal variable |
\Phi | standard normal distribution function |
F(x) = \Phi\left(\frac{x-\mu}{\sigma}\right) | so the distribution function of X is Φ shifted and stretched |
:::

In particular $F(x) = P\{X \le x\} = \Phi\big(\frac{x-\mu}{\sigma}\big)$ and
$P\{X > x\} = 1 - \Phi\big(\frac{x-\mu}{\sigma}\big)$.

::: callout pitfall Divide by σ, not by σ²
$N(1, 4)$ has $\sigma = 2$, so $Z = (X-1)/2$, **not** $(X-1)/4$. The second number in
$N(\mu, \sigma^2)$ is the square. This is exactly what in-class question 10-059 tests.
:::

::: example Standardising an interval
$X \sim N(1, 2^2)$. Find $P\{0 < X \le 3\}$.
== Standardise ==
$\mu = 1$, $\sigma = 2$: the ends become $\frac{0-1}{2} = -0.5$ and $\frac{3-1}{2} = 1$.
== Use Φ ==
$$P\{0 < X \le 3\} = \Phi(1) - \Phi(-0.5) = \Phi(1) - [1 - \Phi(0.5)] = 0.8413 - 0.3085 = 0.5328.$$
:::

## The k-sigma probabilities and the 3σ rule

How much of a normal distribution lies within one, two or three $\sigma$ of its centre?
Because standardisation removes $\mu$ and $\sigma$, the answer is the same for **every**
normal distribution.

::: example Example 2: within kσ of the centre
$X \sim N(\mu, \sigma^2)$. Find $P\{|X - \mu| < k\sigma\}$ for $k = 1, 2, 3$.
== Standardise ==
$$P\{|X-\mu| < k\sigma\} = P\left\{\left|\frac{X-\mu}{\sigma}\right| < k\right\} = P\left\{-k < \frac{X-\mu}{\sigma} < k\right\} = \Phi(k) - \Phi(-k).$$
== Use symmetry ==
$\Phi(-k) = 1 - \Phi(k)$, so the probability is $2\Phi(k) - 1$.
== The numbers ==
- $k = 1$: $2\Phi(1) - 1 = 2(0.8413) - 1 = 0.6826$;
- $k = 2$: $2\Phi(2) - 1 = 2(0.9772) - 1 = 0.9544$;
- $k = 3$: $2\Phi(3) - 1 = 0.9973$.
:::

::: formula Probability within kσ | kσ 区间的概率
$$P\{|X - \mu| < k\sigma\} = 2\Phi(k) - 1$$
--
k = 1, 2, 3 | 0.6826, 0.9544, 0.9973 |
:::

::: callout note 0.9974 or 0.9973?
Two slides (10-051 and 10-053) print $2\Phi(3) - 1 = 0.9974$; the correct value to four
decimals is $0.9973$ ($2\Phi(3) - 1 = 0.997300\ldots$), which is what the slide's own
figure (10-052) shows. The 0.9974 comes from doubling the rounded table value
$\Phi(3) = 0.9987$. The same rounding makes the $k = 1, 2$ values $0.6826$ and $0.9544$;
computed exactly they are $0.6827$ and $0.9545$. Either is accepted in the quiz below.
:::

Play with $k$ (and with $\mu$, $\sigma$, to see they change nothing):

::: explore P{|X − μ| < kσ}
slider k: 0 .. 4 = 3
slider μ: -10 .. 10 = 0
slider σ: 0.1 .. 10 = 1
inside = 2 Phi(k) - 1 | | Probability within kσ
outside = 2 - 2 Phi(k) | | Probability outside
low = μ - k σ | | Left end μ − kσ
high = μ + k σ | | Right end μ + kσ
:::

::: plot The area within kσ of the centre (standard normal)
x: -4 .. 4
xlabel: (x − μ)/σ
φ(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Within: -k < x < k, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
slider k: 0.25 .. 3.5 = 1
:::

::: law The 3σ rule | 3σ 准则
A normal variable $X \sim N(\mu, \sigma^2)$ takes its values almost entirely in
$[\mu - 3\sigma, \mu + 3\sigma]$: the probability of landing outside is less than 0.3%.
In particular, for the standard normal, $\Phi(a) \approx 0$ when $a < -3$ and
$\Phi(b) \approx 1$ when $b > 3$.
:::

In statistics this is called the {{term 3σ rule | 3σ 准则}} (also "3σ 原理"). Quality
control uses it: a measurement more than $3\sigma$ from the target is treated as a sign
that something has gone wrong, because by chance alone it would almost never happen.

## Worked examples

::: example Example 3: component lifetimes
The lifetime $X$ (in hours) of a kind of component has $X \sim N(300, 25^2)$.
(1) Find the probability that a component lasts more than 250 hours.
(2) Three components are taken from a large batch. Find the probability that at least
two of them last more than 250 hours.
== (1) Standardise ==
$\mu = 300$, $\sigma = 25$:
$$P\{X > 250\} = 1 - P\{X \le 250\} = 1 - P\left\{\frac{X-300}{25} \le \frac{250-300}{25}\right\} = 1 - \Phi(-2).$$
== (1) Use symmetry ==
$1 - \Phi(-2) = \Phi(2) = 0.9772$.
== (2) Count successes ==
Let $Y$ be the number of the three that last more than 250 h. "A large batch" means the
three behave like independent trials, each a success with probability $0.9772$, so
$Y \sim B(3, 0.9772)$ (the binomial distribution, Lesson 2.1).
== (2) At least two ==
$$P\{Y \ge 2\} = C_3^2 (0.9772)^2 (0.0228) + C_3^3 (0.9772)^3 \approx 0.0653 + 0.9332 = 0.9985.$$
:::

::: example Example 4: from one interval to another
$X \sim N(2, \sigma^2)$ and $P\{2 < X < 4\} = 0.3$. Find $P\{X < 0\}$.
== Method 1: algebra ==
Standardise both:
$$P\{X < 0\} = \Phi\left(\frac{0-2}{\sigma}\right) = 1 - \Phi\left(\frac{2}{\sigma}\right),$$
$$P\{2 < X < 4\} = \Phi\left(\frac{4-2}{\sigma}\right) - \Phi\left(\frac{2-2}{\sigma}\right) = \Phi\left(\frac2\sigma\right) - \Phi(0) = \Phi\left(\frac2\sigma\right) - \frac12 = 0.3.$$
So $\Phi(2/\sigma) = 0.8$ and $P\{X < 0\} = 1 - 0.8 = 0.2$. We never needed $\sigma$
itself (it is about 2.38).
== Method 2: picture ==
The curve is symmetric about $x = 2$. The right half has area 0.5; the strip from 2 to
4 takes 0.3 of it, so the tail beyond 4 is $0.5 - 0.3 = 0.2$. The points 0 and 4 are
the same distance from 2, so the tail below 0 is also $0.2$.
:::

::: plot Example 4: the strip 2 < x < 4 and the two equal tails
x: -6 .. 10
xlabel: x
f(x) = e^(-(x - 2)^2 / (2 * 2.38^2)) / (sqrt(2 pi) * 2.38)
region Strip: 2 < x < 4, 0 < y < e^(-(x - 2)^2 / (2 * 2.38^2)) / (sqrt(2 pi) * 2.38)
region Tails: (x - 2)^2 > 4, 0 < y < e^(-(x - 2)^2 / (2 * 2.38^2)) / (sqrt(2 pi) * 2.38)
:::

::: callout tip Draw the bell
Whenever a normal problem involves symmetric intervals or tails, sketch the curve and
shade the areas first. Many questions (like Example 4 and in-class question 10-060)
are answered by symmetry alone, with no table at all.
:::

::: callout exam What exams ask
Expect: a normal probability from given $\Phi$ values (standardise, use
$\Phi(-x) = 1 - \Phi(x)$); finding $\mu$ or $\sigma$ from a known probability (as in
Example 4); the $k\sigma$ probabilities; a normal probability feeding a binomial (as in
Example 3); and true/false statements about $N(\mu, \sigma^2)$ such as the in-class
questions below. Exams give the $\Phi$ values you need.
:::

::: callout summary The whole lesson in four lines
$X \sim N(\mu, \sigma^2)$ has a bell-shaped density, symmetric about $\mu$, with
inflection points at $\mu \pm \sigma$. Standardise: $Z = (X-\mu)/\sigma \sim N(0,1)$. Then
$P\{a < X \le b\} = \Phi\big(\frac{b-\mu}{\sigma}\big) - \Phi\big(\frac{a-\mu}{\sigma}\big)$,
with $\Phi(-x) = 1 - \Phi(x)$ and $\Phi(0) = \frac12$. Almost everything lies within
$3\sigma$ of $\mu$.
:::

::: cards The normal distribution
Normal density of N(μ, σ²) :: $f(x) = \frac{1}{\sqrt{2\pi}\,\sigma} e^{-\frac{(x-\mu)^2}{2\sigma^2}}$, $-\infty < x < +\infty$.
In $N(\mu, \sigma^2)$, is the second parameter σ or σ²? :: σ², the square: $N(1,4)$ has $\sigma = 2$.
The Gaussian integral :: $\int_{-\infty}^{+\infty} e^{-t^2/2}\,\d t = \sqrt{2\pi}$ (proved by squaring and polar coordinates).
Maximum of the normal density :: At $x = \mu$, height $\frac{1}{\sqrt{2\pi}\,\sigma}$.
Inflection points of the normal curve :: At $x = \mu \pm \sigma$.
Effect of μ on the curve :: Shifts it along the $x$-axis; the shape doesn't change.
Effect of σ on the curve :: Smaller σ: taller and thinner; larger σ: lower and fatter. The axis $x = \mu$ stays.
Standard normal density and distribution function :: $\varphi(x) = \frac{1}{\sqrt{2\pi}} e^{-x^2/2}$ (even), $\Phi(x) = \int_{-\infty}^x \varphi(t)\,\d t$.
Φ(−x) = ? :: $1 - \Phi(x)$; and $\Phi(0) = \frac12$.
Standardisation :: If $X \sim N(\mu, \sigma^2)$ then $Z = \frac{X-\mu}{\sigma} \sim N(0,1)$.
P{a < X ≤ b} for X ~ N(μ, σ²) :: $\Phi\big(\frac{b-\mu}{\sigma}\big) - \Phi\big(\frac{a-\mu}{\sigma}\big)$.
P{|X − μ| < kσ} :: $2\Phi(k) - 1$: 0.6826, 0.9544, 0.9973 for $k = 1, 2, 3$.
The 3σ rule :: A normal variable lies in $[\mu - 3\sigma, \mu + 3\sigma]$ with probability 0.9973; outside less than 0.3%.
Φ(2), Φ(1), Φ(3) (table) :: 0.9772, 0.8413, 0.9987.
:::

::: quiz The normal distribution
? (In-class question 10-058) $X \sim N(1, 4)$, $\Phi(0.5) = 0.6915$, $\Phi(1.5) = 0.9332$. Then $P\{|X| > 2\} =$
- [ ] 0.2417
- [x] 0.3753
- [ ] 0.3830
- [ ] 0.8664
> $\sigma = 2$. $|X| > 2$ means $X > 2$ or $X < -2$:
> $P\{X > 2\} = 1 - \Phi\big(\frac{2-1}{2}\big) = 1 - 0.6915 = 0.3085$ and
> $P\{X < -2\} = \Phi\big(\frac{-2-1}{2}\big) = \Phi(-1.5) = 1 - 0.9332 = 0.0668$.
> Total $0.3085 + 0.0668 = 0.3753$.

? (In-class question 10-059) $X \sim N(\mu, 4)$. Which statement is true?
- [ ] $\frac{X-\mu}{4} \sim N(0,1)$
- [ ] $P\{X \le 0\} = \frac12$
- [x] $P\{X - \mu > 2\} = 1 - \Phi(1)$
- [ ] $\mu \ge 0$
> The variance is 4, so $\sigma = 2$ and the standardised variable is $\frac{X-\mu}{2}$,
> not $\frac{X-\mu}{4}$. $P\{X \le 0\} = \Phi(-\mu/2)$, which is $\frac12$ only if
> $\mu = 0$; and $\mu$ can be any real number. Finally
> $P\{X - \mu > 2\} = P\big\{\frac{X-\mu}{2} > 1\big\} = 1 - \Phi(1)$.

? (In-class question 10-060) $X \sim N(\mu, 4^2)$, $Y \sim N(\mu, 5^2)$, $p_1 = P\{X \le \mu - 4\}$, $p_2 = P\{Y \ge \mu + 5\}$. Then
- [x] $p_1 = p_2$ for every real $\mu$
- [ ] $p_1 < p_2$ for every real $\mu$
- [ ] $p_1 = p_2$ only for some values of $\mu$
- [ ] $p_1 > p_2$ for every real $\mu$
> $p_1 = \Phi\big(\frac{\mu - 4 - \mu}{4}\big) = \Phi(-1)$ and
> $p_2 = 1 - \Phi\big(\frac{\mu + 5 - \mu}{5}\big) = 1 - \Phi(1) = \Phi(-1)$. Both are "one
> σ out in one tail", whatever $\mu$ is.

? $X \sim N(0,1)$. Find $P\{1.25 \le X < 2\}$ (you can type an expression in `Phi`).
answer: Phi(2) - Phi(1.25)
tolerance: 0.5%
> $\Phi(2) - \Phi(1.25) = 0.9772 - 0.8944 = 0.0828$ (exactly $0.0829$).

? $X \sim N(3, 2^2)$. Find $P\{1 < X < 5\}$.
answer: 2 Phi(1) - 1
tolerance: 0.5%
> The ends are $3 \mp 2$, one σ either side: $\Phi(1) - \Phi(-1) = 2\Phi(1) - 1 \approx 0.6827$
> (0.6826 from the table).

? $X \sim N(10, 4)$. Find $P\{X > 13\}$.
answer: 1 - Phi(1.5)
tolerance: 1%
> $\sigma = 2$: $P\{X > 13\} = 1 - \Phi\big(\frac{13-10}{2}\big) = 1 - \Phi(1.5) = 1 - 0.9332 = 0.0668$.

? $\Phi(1.25) = 0.8944$. What is $\Phi(-1.25)$?
answer: 0.1056
tolerance: 0.5%
> $\Phi(-x) = 1 - \Phi(x)$: $1 - 0.8944 = 0.1056$.

? What is $P\{|X - \mu| < 3\sigma\}$ for $X \sim N(\mu, \sigma^2)$, to four decimals?
answer: 2 Phi(3) - 1
tolerance: 0.0002
> $2\Phi(3) - 1 = 0.9973$ — the 3σ rule. (Some slides print 0.9974, from rounding
> $\Phi(3)$ to 0.9987 first.)

? $X \sim N(2, \sigma^2)$ and $P\{2 < X < 4\} = 0.3$. Find $P\{X < 0\}$.
answer: 0.2
> By symmetry about 2: the tail beyond 4 is $0.5 - 0.3 = 0.2$, and the tail below 0 is
> its mirror image.

? Where are the inflection points of the density of $N(\mu, \sigma^2)$?
- [ ] At $x = \mu$
- [x] At $x = \mu \pm \sigma$
- [ ] At $x = \mu \pm \sigma^2$
- [ ] At $x = \mu \pm 3\sigma$
> $f''(x) = f(x)\big[(x-\mu)^2 - \sigma^2\big]/\sigma^4$ changes sign where
> $(x-\mu)^2 = \sigma^2$, i.e. at $\mu \pm \sigma$. At $x = \mu$ the curve has its maximum.

? Find the height of the peak of the $N(0, 0.5^2)$ density.
answer: 1/(0.5 sqrt(2 pi))
tolerance: 0.5%
> The peak is $\frac{1}{\sqrt{2\pi}\,\sigma} = \frac{1}{0.5\sqrt{2\pi}} \approx 0.798$ —
> higher than 1/2: a density can exceed 1/2 (or even 1), it is areas that are probabilities.
:::

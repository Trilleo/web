---
title: Sums and other functions of continuous random vectors
zh: 二维连续型随机变量函数的分布
summary: The density of Z = X + Y (the general formula and the convolution formula for independent variables), the distribution-function method for any Z = g(X, Y), sums of independent normals, and the distance √(X² + Y²).
source: 11独立性和函数的分布7-1 (§3.4, continuous part), 2026-10-12; 11随机变量函数的分布7-2, 2026-10-14
---

## From tables to densities

In the last lesson, $Z = g(X,Y)$ for discrete variables came down to adding up cells.
With a joint density $f(x,y)$ the cells become a region of the plane and the sum
becomes a double integral. The plan is always the same:

1. $F_Z(z) = P\{Z \le z\}$ is the probability that $(X,Y)$ lands in the region
   $\{(x,y) : g(x,y) \le z\}$ — integrate $f$ over it.
2. Differentiate: $f_Z(z) = F_Z'(z)$.

The work is in step 1: seeing how the region $g(x,y) \le z$ overlaps the place where
$f > 0$, which changes as $z$ moves. For the most important case, $Z = X + Y$, the lecture
also derives a ready-made formula. Joint densities, marginals and the 2-D uniform and
normal distributions are in Lessons 3.1–3.3; independence is Lesson 3.5.

## The density of Z = X + Y

$(X,Y)$ has joint density $f(x,y)$. The distribution function of $Z = X + Y$ is the
integral of $f$ over the half-plane $D = \{x + y \le z\}$, the part on and below-left
of the line $x + y = z$:
$$F_Z(z) = P\{X + Y \le z\} = \iint_{x + y \le z} f(x,y)\,\d x\,\d y.$$

**Deriving the formula.** Integrate over $x$ first: for fixed $y$, $x$ runs up to
$z - y$:
$$F_Z(z) = \int_{-\infty}^{\infty}\left[\int_{-\infty}^{z-y} f(x,y)\,\d x\right]\d y.$$
In the inner integral substitute $u = x + y$ ($y$ fixed), so $x = u - y$ and $u$ runs
up to $z$; then swap the order:
$$F_Z(z) = \int_{-\infty}^{\infty}\left[\int_{-\infty}^{z} f(u-y,y)\,\d u\right]\d y = \int_{-\infty}^{z}\left[\int_{-\infty}^{\infty} f(u-y,y)\,\d y\right]\d u.$$
Now $F_Z$ is the integral up to $z$ of the bracket, so the bracket (at $u = z$) is the
density. Swapping the roles of $x$ and $y$ gives the second form.

::: formula Density of a sum | 和的概率密度
$$f_Z(z) = \int_{-\infty}^{\infty} f(z-y,\,y)\,\d y = \int_{-\infty}^{\infty} f(x,\,z-x)\,\d x$$
--
f(x,y) | joint density of $(X,Y)$ |
f_Z(z) | density of $Z = X + Y$ |
:::

This holds for **any** joint density. When $X$ and $Y$ are **independent**,
$f(x,y) = f_X(x)f_Y(y)$ and it becomes the convolution formula:

::: formula Convolution formula | 卷积公式
$$f_Z(z) = \int_{-\infty}^{\infty} f_X(z-y)\,f_Y(y)\,\d y = \int_{-\infty}^{\infty} f_X(x)\,f_Y(z-x)\,\d x$$
--
f_X,\ f_Y | marginal densities of the **independent** variables $X$, $Y$ |
f_Z | density of $Z = X + Y$ |
:::

::: callout warning Only for Z = X + Y
The slides put it in bold: the convolution formula works **only** for the sum. For
$2X + Y$, $X - Y$, $XY$, $\max$, $\sqrt{X^2+Y^2}$… use the distribution-function method
below. And it needs independence; otherwise use the general formula with $f(x, z - x)$.
:::

### Fixing the limits

The formula's integral runs over the whole line, but the integrand is zero almost
everywhere. Before integrating, write down **where the integrand is non-zero** as
inequalities in $x$ (or $y$) and $z$, sketch them, and read off, for each range of $z$,
the interval of $x$. The examples show this.

### Example 1: X ~ U(0, 1), Y ~ E(1), solved two ways

::: example Z = X + Y by the convolution formula
$X$ and $Y$ are independent with $f_X(x) = 1$ for $0 \le x \le 1$ and
$f_Y(y) = e^{-y}$ for $y > 0$ (0 otherwise): $X \sim U(0,1)$, $Y \sim E(1)$. Find the
density of $Z = X + Y$.
== Where the integrand lives ==
Use $f_Z(z) = \int f_X(x)f_Y(z-x)\,\d x$. The integrand is
$f_X(x)f_Y(z-x) = e^{-(z-x)}$ when $0 \le x \le 1$ **and** $z - x > 0$, i.e. $x < z$;
otherwise 0. In the $(x, z)$ plane that is the vertical strip $0 \le x \le 1$ above the
line $z = x$.
== z ≤ 0 ==
No $x$ satisfies $0 \le x < z$: $f_Z(z) = 0$.
== 0 < z < 1 ==
$x$ runs from 0 to $z$: $f_Z(z) = \int_0^z e^{-(z-x)}\,\d x = 1 - e^{-z}$.
== z ≥ 1 ==
$x$ runs over the whole of $[0,1]$: $f_Z(z) = \int_0^1 e^{-(z-x)}\,\d x = (e - 1)e^{-z}$.
:::

### The distribution-function method

::: define Distribution-function method for two variables | 二维分布函数法
To find the density of $Z = g(X,Y)$ when $(X,Y)$ has density $f(x,y)$:
**Step 1**, find the distribution function
$F_Z(z) = P\{Z \le z\} = P\{g(X,Y) \le z\} = \iint_{g(x,y) \le z} f(x,y)\,\d x\,\d y$;
**Step 2**, differentiate: $f_Z(z) = F_Z'(z)$.
:::

It works for every $g$, at the price of a case analysis on $z$: where does the region
$g(x,y) \le z$ cut the support of $f$?

::: example Z = X + Y by the distribution-function method
Same $X \sim U(0,1)$, $Y \sim E(1)$, independent, so $f(x,y) = e^{-y}$ on the half-strip
$0 \le x \le 1$, $y > 0$. Find $F_Z$, then $f_Z$.
== z ≤ 0 ==
The half-plane $y \le z - x$ doesn't reach the half-strip (it only touches it at the
origin when $z = 0$): $F_Z(z) = 0$.
== 0 < z ≤ 1 ==
The line $y = z - x$ cuts the strip in the triangle $(0,0)$, $(z,0)$, $(0,z)$:
$$F_Z(z) = \int_0^z \d x \int_0^{z-x} e^{-y}\,\d y = \int_0^z \left(1 - e^{-(z-x)}\right)\d x = z - 1 + e^{-z}.$$
== z > 1 ==
Now the line leaves the strip through its right edge, and the part below it is a
trapezium-like region with $x$ over all of $[0,1]$:
$$F_Z(z) = \int_0^1 \d x \int_0^{z-x} e^{-y}\,\d y = 1 - (e - 1)e^{-z} = 1 + (1 - e)e^{-z}.$$
== Differentiate ==
$$f_Z(z) = \begin{cases} 0, & z \le 0, \\ 1 - e^{-z}, & 0 < z < 1, \\ (e-1)e^{-z}, & z \ge 1, \end{cases}$$
the same as by the formula. (Check: $F_Z$ is continuous at $z = 1$, where both pieces
give $e^{-1}$.)
:::

Move $z$ to see the region $x + y \le z$ inside the support: a triangle for $z \le 1$,
a strip cut off by a slanted line for $z > 1$.

::: plot Example 1: the support 0 ≤ x ≤ 1, y > 0 and the part with x + y ≤ z
x: -0.5 .. 2
y: -0.2 .. 3
region S: 0 < x < 1, y > 0
region D: 0 < x < 1, y > 0, x + y <= z
f(x) = z - x
slider z: 0 .. 3 = 0.7
:::

::: plot The density of U(0,1) + E(1)
x: -0.5 .. 5
xlabel: z
f(z) = max(0, e^(-z) (e^(min(z, 1)) - 1))
:::

### Example 1, part 2: Z = 2X + Y (to be continued)

The lecture then asked for the density of $Z = 2X + Y$ with the same $X$ and $Y$. The
convolution formula doesn't apply (not a plain sum), so use the distribution function:
$$F_Z(z) = P\{2X + Y \le z\} = \iint_{y \le z - 2x} f(x,y)\,\d x\,\d y, \qquad f(x,y) = e^{-y}\ \ (0 \le x \le 1,\ y > 0).$$
The line $y = z - 2x$ is steeper now, crossing the $x$-axis at $x = z/2$, so the cases
split at $z = 2$ instead of $z = 1$.

::: callout note The lecture continues here
The slides stop at this set-up; the case analysis for $2X + Y$, and the other topics in
§3.4's outline — functions of a continuous and a discrete variable, and the
distributions of $\max\{X,Y\}$ and $\min\{X,Y\}$ — come in the next lectures, and this
lesson will grow with them.
:::

### Example 2: the sum of two U(0, 1)

::: example Z = X + Y for two independent U(0, 1), by the formula
$X$ and $Y$ are independent with common density $f(x) = 1$ on $[0,1]$. Find the density
of $Z = X + Y$.
== Where the integrand lives ==
In $f_Z(z) = \int f_X(z-y)f_Y(y)\,\d y$ the integrand is 1 when $0 \le z - y \le 1$ and
$0 \le y \le 1$, i.e. $y \le z \le y + 1$ and $0 \le y \le 1$; otherwise 0. In the
$(y, z)$ plane that is the parallelogram with corners $(0,0)$, $(1,1)$, $(1,2)$, $(0,1)$.
== z < 0 or z ≥ 2 ==
No $y$ works: $f_Z(z) = 0$.
== 0 ≤ z < 1 ==
$y$ runs from 0 to $z$: $f_Z(z) = \int_0^z \d y = z$.
== 1 ≤ z < 2 ==
$y$ runs from $z - 1$ to 1: $f_Z(z) = \int_{z-1}^{1} \d y = 2 - z$.
== The answer ==
$$f_Z(z) = \begin{cases} z, & 0 \le z < 1, \\ 2 - z, & 1 \le z < 2, \\ 0, & \text{otherwise:} \end{cases}$$
a **triangular** density on $[0, 2]$ with its peak at $z = 1$.
:::

::: example The same sum by the distribution-function method
$f(x,y) = 1$ on the unit square. $F_Z(z)$ is the area of the part of the square below
the line $x + y = z$.
== z ≤ 0 ==
The line passes below the square: $F_Z(z) = 0$.
== 0 < z ≤ 1 ==
A corner triangle with legs $z$: $F_Z(z) = \frac12 z^2$.
== 1 < z < 2 ==
Everything except the opposite corner triangle, with legs $2 - z$:
$F_Z(z) = 1 - \frac12(2 - z)^2$.
== z ≥ 2 ==
The whole square: $F_Z(z) = 1$.
== Differentiate ==
$f_Z(z) = z$ on $(0, 1]$, $2 - z$ on $(1, 2)$, and 0 otherwise — the same triangle.
:::

::: plot Example 2: the unit square and the part with x + y ≤ z
x: -0.2 .. 2.1
y: -0.2 .. 2.1
region S: 0 < x < 1, 0 < y < 1
region D: 0 < x < 1, 0 < y < 1, x + y <= z
f(x) = z - x
slider z: 0 .. 2 = 0.6
:::

::: plot The triangular density of U(0,1) + U(0,1) and its distribution function
x: -0.5 .. 2.5
xlabel: z
f(z) = max(0, 1 - abs(z - 1))
F(z) = min(max(z, 0), 1)^2 / 2 + 1/2 - (2 - min(max(z, 1), 2))^2 / 2
:::

::: callout pitfall The sum of two uniforms is not uniform
$U(0,1) + U(0,1)$ is not $U(0,2)$: totals near 1 can be made in many ways
($0.5 + 0.5$, $0.2 + 0.8$, …), totals near 0 or 2 in very few. That's why the density is
a triangle — like the total of two dice, which peaks at 7.
:::

## The general method: Z = X − Y

::: example Z = X − Y for the density 3x on 0 < y < x < 1
$(X,Y)$ has density $f(x,y) = 3x$ for $0 < y < x$, $0 < x < 1$, and 0 elsewhere. Find
the density of $Z = X - Y$.
== Set up ==
$F_Z(z) = P\{X - Y \le z\} = \iint_{y \ge x - z} f(x,y)\,\d x\,\d y$: the half-plane
**above** the line $y = x - z$, which is parallel to the diagonal $y = x$ and crosses
the $x$-axis at $x = z$.
== z ≤ 0 ==
The line is on or above $y = x$, so the half-plane misses the triangle: $F_Z(z) = 0$.
(Also clear directly: $X > Y$ always, so $Z > 0$.)
== 0 < z ≤ 1 ==
Only the small triangle below the line, with corners $(z,0)$, $(1,0)$, $(1,1-z)$, is
left out. Subtract it:
$$F_Z(z) = 1 - \int_z^1 \left[\int_0^{x-z} 3x\,\d y\right]\d x = 1 - \int_z^1 3x(x - z)\,\d x = 1 - \left(1 - \tfrac32 z + \tfrac12 z^3\right) = \tfrac32 z - \tfrac12 z^3.$$
== z > 1 ==
The line crosses the $x$-axis beyond $x = 1$; the whole triangle is above it:
$F_Z(z) = 1$.
== Differentiate ==
$$f_Z(z) = F_Z'(z) = \begin{cases} \frac32 - \frac32 z^2 = \frac32(1 - z^2), & 0 < z < 1, \\ 0, & \text{otherwise.} \end{cases}$$
Check: $\int_0^1 \frac32(1 - z^2)\,\d z = \frac32 \cdot \frac23 = 1$.
:::

::: plot The support 0 < y < x < 1 and the part with x − y ≤ z
x: -0.1 .. 1.3
y: -0.1 .. 1.1
region S: 0 < y < x < 1
region D: 0 < y < x < 1, x - y <= z
f(x) = x
g(x) = x - z
slider z: 0 .. 1 = 0.4
:::

::: callout tip Computing the complement
When the region $g \le z$ covers most of the support, integrate over the small piece
left out and subtract from 1, as in the $0 < z \le 1$ case above. Draw the picture
first; it tells you which piece is simpler.
:::

## Sums of independent normal variables

::: example Two independent standard normals
$X$ and $Y$ are independent, both $N(0,1)$. Find the density of $Z = X + Y$.
== The convolution formula ==
$$f_Z(z) = \int_{-\infty}^{\infty} \frac{1}{2\pi} e^{-\frac{x^2}{2}} e^{-\frac{(z-x)^2}{2}}\,\d x.$$
== Complete the square ==
$\frac{x^2}{2} + \frac{(z-x)^2}{2} = x^2 - zx + \frac{z^2}{2} = \left(x - \frac z2\right)^2 + \frac{z^2}{4}$, so
$$f_Z(z) = \frac{1}{2\pi} e^{-\frac{z^2}{4}} \int_{-\infty}^{\infty} e^{-(x - \frac z2)^2}\,\d x.$$
== The Gaussian integral ==
Put $t = x - \frac z2$: $\int_{-\infty}^{\infty} e^{-t^2}\,\d t = \sqrt\pi$. Hence
$$f_Z(z) = \frac{1}{2\pi}\sqrt\pi\,e^{-\frac{z^2}{4}} = \frac{1}{2\sqrt\pi} e^{-\frac{z^2}{4}}.$$
== Recognise it ==
The $N(0, 2)$ density is $\frac{1}{\sqrt{2\pi}\sqrt2}e^{-\frac{z^2}{2 \cdot 2}} = \frac{1}{2\sqrt\pi}e^{-\frac{z^2}{4}}$:
so $Z \sim N(0, 2)$. The variances add: $1 + 1 = 2$.
:::

The same computation, with more letters, gives the general rule. The lecture asks you
to memorise it now; the reason the means and variances combine this way comes after
expectation and variance (Chapter 4).

::: theorem Sums of independent normal variables | 正态分布的可加性
If $X \sim N(\mu_1, \sigma_1^2)$ and $Y \sim N(\mu_2, \sigma_2^2)$ are independent, then
$X + Y \sim N(\mu_1 + \mu_2,\ \sigma_1^2 + \sigma_2^2)$. More generally, if
$X_i \sim N(\mu_i, \sigma_i^2)$, $i = 1, \ldots, n$, are mutually independent and
$a_1, \ldots, a_n$ are constants (not all 0), then
$$\sum_{i=1}^{n} a_i X_i \sim N\left(\sum_{i=1}^{n} a_i \mu_i,\ \sum_{i=1}^{n} (a_i\sigma_i)^2\right).$$
:::

::: formula Linear combination of independent normals | 独立正态变量的线性组合
$$\sum_{i=1}^{n} a_i X_i \sim N\left(\sum_{i=1}^{n} a_i \mu_i,\ \sum_{i=1}^{n} a_i^2\sigma_i^2\right)$$
--
X_i | independent, $X_i \sim N(\mu_i, \sigma_i^2)$ |
a_i | constant coefficients |
:::

::: callout pitfall Variances add, standard deviations don't — and minus signs square away
For $X - Y$ ($a_2 = -1$), the mean is $\mu_1 - \mu_2$ but the variance is
$\sigma_1^2 + \sigma_2^2$, **not** $\sigma_1^2 - \sigma_2^2$. For $2X$, the variance is
$4\sigma_1^2$, not $2\sigma_1^2$. And add variances, never standard deviations:
$N(0, 3^2) + N(0, 4^2) = N(0, 5^2)$, not $N(0, 7^2)$.
:::

::: example Probabilities for combinations of normals
$X \sim N(1, 4)$ and $Y \sim N(2, 9)$ are independent. Find (1) $P\{X + Y \le 5\}$;
(2) $P\{2X - Y > 5\}$.
== (1) The law of X + Y ==
$X + Y \sim N(1 + 2,\ 4 + 9) = N(3, 13)$, so
$P\{X + Y \le 5\} = \Phi\left(\frac{5 - 3}{\sqrt{13}}\right) = \Phi(0.555) \approx 0.711$.
== (2) The law of 2X − Y ==
Mean $2 \cdot 1 - 2 = 0$; variance $2^2 \cdot 4 + (-1)^2 \cdot 9 = 25$. So
$2X - Y \sim N(0, 25)$ and $P\{2X - Y > 5\} = 1 - \Phi\left(\frac{5}{5}\right) = 1 - \Phi(1) \approx 0.159$.
:::

Try other parameters below: $a$ and $s$ are $\mu_1$ and $\sigma_1$, $b$ and $t$ are $\mu_2$ and $\sigma_2$, and $c$ is the cut-off.

::: explore The sum of two independent normals
slider a: -5 .. 5 = 1
slider s: 0.1 .. 5 = 2
slider b: -5 .. 5 = 2
slider t: 0.1 .. 5 = 3
slider c: -10 .. 15 = 5
m = a + b | | Mean of X + Y
v = s^2 + t^2 | | Variance of X + Y
P = Phi((c - m) / sqrt(v)) | | P{X + Y ≤ c}
:::

## The distance from the origin: Z = √(X² + Y²)

::: example Z = √(X² + Y²) for independent N(0, σ²)
$X$ and $Y$ are independent, both $N(0, \sigma^2)$. Find the distribution of
$Z = \sqrt{X^2 + Y^2}$ — the distance of the random point $(X,Y)$ from the origin.
== The joint density ==
By independence,
$f(x,y) = \frac{1}{2\pi\sigma^2} e^{-\frac{x^2 + y^2}{2\sigma^2}}$ on the whole plane.
It depends only on the distance from the origin: circles around the origin are contours.
== z ≤ 0 ==
A distance can't be negative: $F_Z(z) = P\{\sqrt{X^2+Y^2} \le z\} = 0$.
== z > 0: integrate over a disc ==
$\{\sqrt{x^2+y^2} \le z\}$ is the disc of radius $z$. In polar coordinates
($x = r\cos\theta$, $y = r\sin\theta$, $\d x\,\d y = r\,\d r\,\d\theta$):
$$F_Z(z) = \int_0^{2\pi}\!\!\int_0^z \frac{1}{2\pi\sigma^2} e^{-\frac{r^2}{2\sigma^2}}\,r\,\d r\,\d\theta = \int_0^z \frac{r}{\sigma^2} e^{-\frac{r^2}{2\sigma^2}}\,\d r = 1 - e^{-\frac{z^2}{2\sigma^2}}.$$
== The density ==
Differentiate:
$$f_Z(z) = \begin{cases} \dfrac{z}{\sigma^2} e^{-\frac{z^2}{2\sigma^2}}, & z > 0, \\ 0, & z \le 0. \end{cases}$$
This is the {{term Rayleigh distribution | 瑞利分布}}. (The slides stop at $F_Z$ and skip
the polar-coordinate step; both are filled in here.)
:::

Here $s$ stands for $\sigma$: a larger $\sigma$ spreads the distance out.

::: plot The Rayleigh density and its distribution function
x: 0 .. 8
xlabel: z
f(z) = z / s^2 e^(-z^2 / (2 s^2))
F(z) = 1 - e^(-z^2 / (2 s^2))
slider s: 0.3 .. 3 = 1
:::

::: callout key The one idea
For a continuous $Z = g(X,Y)$: draw the support of $f$, draw the region $g(x,y) \le z$,
and integrate over their overlap — one case for each way they can overlap as $z$ moves.
Then differentiate. For an independent sum you may use the convolution formula instead,
but you still need the picture to fix the limits.
:::

::: callout exam For the exam
Expect: the density of $X + Y$ for two independent uniforms or a uniform and an
exponential (show the cases for $z$ clearly — they are where the marks are); a $Z = X - Y$
or $2X + Y$ by the distribution-function method on a triangle or strip; and quick
questions on sums of independent normals ($X - Y$, $2X + 3Y$: mean and variance), often
followed by a probability with $\Phi$.
:::

::: cards Functions of continuous random vectors
Density of $X + Y$ (any joint density) :: $f_Z(z) = \int f(z-y, y)\,\d y = \int f(x, z-x)\,\d x$
Convolution formula :: $f_Z(z) = \int f_X(x)f_Y(z-x)\,\d x$ — independent $X$, $Y$, and only for $Z = X + Y$
Distribution-function method :: $F_Z(z) = \iint_{g(x,y) \le z} f\,\d x\,\d y$, then $f_Z = F_Z'$
$U(0,1) + U(0,1)$, independent :: Triangular: $f_Z = z$ on $[0,1)$, $2 - z$ on $[1,2)$
$U(0,1) + E(1)$, independent :: $f_Z = 1 - e^{-z}$ ($0 < z < 1$), $(e-1)e^{-z}$ ($z \ge 1$)
$N(\mu_1,\sigma_1^2) + N(\mu_2,\sigma_2^2)$, independent :: $N(\mu_1 + \mu_2, \sigma_1^2 + \sigma_2^2)$
$\sum a_iX_i$ for independent normals :: $N(\sum a_i\mu_i, \sum a_i^2\sigma_i^2)$
$X - Y$ for independent normals: variance :: $\sigma_1^2 + \sigma_2^2$ (variances add)
$\sqrt{X^2+Y^2}$, $X, Y$ independent $N(0,\sigma^2)$ :: Rayleigh: $F = 1 - e^{-z^2/(2\sigma^2)}$, $f = \frac{z}{\sigma^2}e^{-z^2/(2\sigma^2)}$, $z > 0$
$f = 3x$ on $0 < y < x < 1$: density of $X - Y$ :: $\frac32(1 - z^2)$ on $(0,1)$
First step in fixing the limits :: Write where the integrand is non-zero, as inequalities, and sketch them
:::

::: quiz Check yourself
? $X$, $Y$ independent $U(0,1)$. Find $P\{X + Y \le \frac12\}$.
answer: 1/8
> $F_Z(\frac12) = \frac12 \cdot (\frac12)^2 = \frac18$: the corner triangle with legs $\frac12$.

? $X$, $Y$ independent $U(0,1)$. Find $P\{X + Y \le 1.5\}$.
answer: 7/8
> $1 - \frac12(2 - 1.5)^2 = 1 - \frac18 = \frac78$.

? $X$, $Y$ independent $U(0,1)$. Write the density of $Z = X + Y$ for $1 \le z < 2$.
expression: 2 - z
variables: z
> $y$ runs from $z - 1$ to 1 in $\int f_X(z-y)f_Y(y)\,\d y$: length $2 - z$.

? $X \sim U(0,1)$ and $Y \sim E(1)$ are independent. Write $f_Z(z)$ for $Z = X + Y$ and $0 < z < 1$.
expression: 1 - e^(-z)
variables: z
> $f_Z(z) = \int_0^z e^{-(z-x)}\,\d x = 1 - e^{-z}$.

? Same $X$, $Y$. Find $P\{X + Y \le 1\}$.
answer: e^(-1)
> $F_Z(1) = 1 - 1 + e^{-1} = e^{-1} \approx 0.368$.

? For which of these may you use the convolution formula $f_Z(z) = \int f_X(x)f_Y(z-x)\,\d x$?
- [x] $Z = X + Y$ with $X$, $Y$ independent
- [ ] $Z = 2X + Y$ with $X$, $Y$ independent
- [ ] $Z = X + Y$ with $(X,Y)$ uniform on a triangle
- [ ] $Z = X - Y$ with $X$, $Y$ independent
> Only for a plain sum of **independent** variables. For dependent ones use $\int f(x, z - x)\,\d x$; for anything else, the distribution-function method.

? $f(x,y) = 3x$ on $0 < y < x < 1$. Write the density of $Z = X - Y$ for $0 < z < 1$.
expression: 3/2 (1 - z^2)
variables: z
> $F_Z(z) = \frac32 z - \frac12 z^3$, so $f_Z(z) = \frac32 - \frac32 z^2$.

? $X \sim N(1, 4)$ and $Y \sim N(2, 9)$ are independent. What is the variance of $X - Y$?
answer: 13
> Coefficients $1$ and $-1$: $1^2 \cdot 4 + (-1)^2 \cdot 9 = 13$. Variances add even for a difference.

? Same $X$, $Y$. Find $P\{X + Y \le 5\}$.
answer: Phi(2/sqrt(13))
> $X + Y \sim N(3, 13)$: $\Phi\left(\frac{5-3}{\sqrt{13}}\right) \approx 0.711$.

? $X_1, X_2, X_3$ are independent, each $N(0,1)$. Then $X_1 + 2X_2 - X_3 \sim$ …
- [ ] $N(0, 2)$
- [x] $N(0, 6)$
- [ ] $N(0, 4)$
- [ ] $N(2, 6)$
> Mean $0$; variance $1 + 4 + 1 = 6$.

? $X$, $Y$ independent $N(0, \sigma^2)$, $Z = \sqrt{X^2+Y^2}$. Write the density $f_Z(z)$ for $z > 0$.
expression: z/s^2 e^(-z^2/(2 s^2))
variables: z, s
> $F_Z(z) = 1 - e^{-z^2/(2\sigma^2)}$; differentiating gives $\frac{z}{\sigma^2}e^{-z^2/(2\sigma^2)}$ (type $s$ for $\sigma$).

? With $\sigma = 1$, find $P\{\sqrt{X^2+Y^2} \le 1\}$.
answer: 1 - e^(-1/2)
> $F_Z(1) = 1 - e^{-1/2} \approx 0.393$.
:::

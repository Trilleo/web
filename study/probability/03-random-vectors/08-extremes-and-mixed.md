---
title: Maximum, minimum and mixed variables
zh: 最大值、最小值与混合型随机变量的分布
summary: Functions of one continuous and one discrete variable (split on the discrete one by total probability, with jumps in F where the result has point masses), and the distributions of max{X, Y} and min{X, Y} for independent variables, with n variables, exponential lifetimes and min(X, 2).
source: 13随机变量函数的分布8-1, 2026-10-19
---

## What this lesson is for

The last two lessons found the distribution of $Z = g(X,Y)$ when $X$ and $Y$ are both
discrete (Lesson 3.6) or both continuous (Lesson 3.7). This lesson finishes §3.4 with two
situations that come up all the time. First, **one variable is continuous and the other
discrete**: a measurement plus a coin toss, a lifetime that depends on which machine was
picked. The trick is to split on the discrete variable's values with the law of total
probability. Second, the **largest and smallest** of several independent variables: the
last of two buses to arrive, the first component of a machine to fail. For these there
are short formulas worth memorising, and they turn up in nearly every exam.

## Functions of a continuous and a discrete variable

**Intuition.** Suppose $X$ takes only the values 1 and 2, and $Y$ is continuous. The
event $\{X + Y \le z\}$ happens either with $X = 1$ (then we need $Y \le z - 1$) or with
$X = 2$ (then $Y \le z - 2$). These two cases don't overlap and cover everything, so
their probabilities add. Inside each case $X$ is a known number, and what's left is a
question about $Y$ alone, which we know how to answer. This is the law of total
probability (Lesson 1.5), with the events $\{X = x_i\}$ as the partition.

::: formula Splitting on a discrete variable | 按离散变量的取值分解
$$F_Z(z) = P\{g(X,Y) \le z\} = \sum_i P\{X = x_i\}\,P\{g(x_i, Y) \le z \mid X = x_i\}$$
--
X | discrete, taking the values $x_1, x_2, \ldots$ |
Y | continuous |
P\{\cdot \mid X = x_i\} | the conditional distribution of $Y$ given $X = x_i$; if $X$ and $Y$ are independent it is just the distribution of $Y$ |
:::

So: write $F_Z(z)$, split it over the values of the discrete variable, replace that
variable by each value, and use independence (or the given conditional distribution) to
finish. Then differentiate if $F_Z$ is smooth — but watch out: the result may have
jumps, and then $Z$ has no density at all.

### Example 1: a sum with a two-valued X

::: example Z = X + Y, with P(X = 1) = 0.3 and P(X = 2) = 0.7
$X$ and $Y$ are independent, $Y$ has density $f(y)$, and $P\{X = 1\} = 0.3$,
$P\{X = 2\} = 0.7$. Find the density of $Z = X + Y$.
== Split on X ==
$$\begin{aligned}F_Z(z) &= P\{X + Y \le z\} = P\{X = 1, X + Y \le z\} + P\{X = 2, X + Y \le z\}\\&= P\{X = 1, Y \le z - 1\} + P\{X = 2, Y \le z - 2\}.\end{aligned}$$
== Use independence ==
Each joint probability factors:
$$F_Z(z) = P\{X = 1\}P\{Y \le z - 1\} + P\{X = 2\}P\{Y \le z - 2\} = 0.3F_Y(z - 1) + 0.7F_Y(z - 2).$$
== Differentiate ==
$$f_Z(z) = 0.3f(z - 1) + 0.7f(z - 2).$$
The density of $Z$ is a weighted mix of two copies of $f$, one shifted by 1 and one by 2,
weighted by the chances of $X$.
:::

To see it, take $Y \sim N(0,1)$: then $f_Z$ is $0.3$ of a bell centred at 1 plus $0.7$ of
a bell centred at 2. Move $p = P\{X = 1\}$ to shift the weight between the two.

::: plot Z = X + Y with Y ~ N(0, 1): a mix of two shifted bells
x: -3 .. 6
xlabel: z
f(z) = p e^(-(z - 1)^2 / 2) / sqrt(2 pi) + (1 - p) e^(-(z - 2)^2 / 2) / sqrt(2 pi)
F(z) = p Phi(z - 1) + (1 - p) Phi(z - 2)
slider p: 0 .. 1 = 0.3 | | P{X = 1}
:::

::: example A number for Example 1
With $Y \sim N(0,1)$ and the same $X$, find $P\{Z \le 2\}$.
== Plug into F ==
$$P\{Z \le 2\} = 0.3\,\Phi(2 - 1) + 0.7\,\Phi(2 - 2) = 0.3\,\Phi(1) + 0.7 \cdot 0.5 \approx 0.3 \cdot 0.8413 + 0.35 \approx 0.602.$$
:::

### Example 2: a product, and a jump

::: example Z = XY with X ~ N(0, 1) and Y = 0 or 1
$X$ and $Y$ are independent, $X \sim N(0,1)$, and $P\{Y = 0\} = P\{Y = 1\} = \frac12$. Let
$F(z)$ be the distribution function of $Z = XY$. How many discontinuities does $F$ have?
== Split on Y ==
$$\begin{aligned}F_Z(z) &= P\{XY \le z\} = P\{Y = 0, XY \le z\} + P\{Y = 1, XY \le z\}\\&= P\{Y = 0, 0 \le z\} + P\{Y = 1, X \le z\}.\end{aligned}$$
When $Y = 0$ the product is 0 whatever $X$ is, so the condition becomes "$0 \le z$", which
is either certain or impossible.
== Use independence ==
$$F_Z(z) = P\{Y = 0\}P\{0 \le z\} + P\{Y = 1\}P\{X \le z\} = \begin{cases} \frac12 \cdot 0 + \frac12\Phi(z) = \frac12\Phi(z), & z < 0, \\[2pt] \frac12 \cdot 1 + \frac12\Phi(z) = \frac12 + \frac12\Phi(z), & z \ge 0. \end{cases}$$
== Look for jumps ==
Each piece is continuous. At $z = 0$: from the left $F \to \frac12\Phi(0) = \frac14$, and
$F(0) = \frac12 + \frac14 = \frac34$. So $F$ jumps by $\frac12$ at $z = 0$, and nowhere
else: **one** discontinuity.
== What the jump means ==
The jump is $P\{Z = 0\} = \frac12$: half the time $Y = 0$ and the product is exactly 0.
$Z$ is neither discrete nor continuous — a mixed-type random variable (Lesson 2.5) — and
has no density.
:::

::: plot Example 2: F(z) = ½Φ(z) for z < 0, ½ + ½Φ(z) for z ≥ 0
x: -4 .. 4
y: 0 .. 1.1
xlabel: z
F(z) = Phi(z)/2 + min(max(floor(z) + 1, 0), 1)/2
:::

::: callout key A jump in F is a point mass
Whenever $Z$ equals one value with positive probability, its distribution function jumps
there by exactly that probability. A function of a continuous and a discrete variable
gets such a jump when, for some value of the discrete variable, $g$ no longer depends on
the continuous one (here $XY = 0$ when $Y = 0$). Count those values to count the jumps.
:::

### Example 3: a conditional uniform

Independence isn't needed for the splitting. If the problem gives the distribution of
$Y$ **given** each value of $X$, use it directly.

::: example Y given X = i is U(0, i)
$P\{X = 1\} = P\{X = 2\} = \frac12$, and given $X = i$, $Y \sim U(0, i)$ ($i = 1, 2$). Find
the distribution function $F_Y(y)$.
== Total probability over X ==
$$F_Y(y) = P\{X = 1\}P\{Y \le y \mid X = 1\} + P\{X = 2\}P\{Y \le y \mid X = 2\} = \frac12 P\{Y \le y \mid X = 1\} + \frac12 P\{Y \le y \mid X = 2\}.$$
Given $X = 1$, $Y$ is uniform on $(0,1)$; given $X = 2$, uniform on $(0,2)$.
== y < 0 ==
Both conditional probabilities are 0: $F_Y(y) = 0$.
== 0 ≤ y < 1 ==
$P\{Y \le y \mid X = 1\} = y$ and $P\{Y \le y \mid X = 2\} = \frac y2$:
$F_Y(y) = \frac12 y + \frac12 \cdot \frac y2 = \frac34 y$.
== 1 ≤ y < 2 ==
The first is now 1: $F_Y(y) = \frac12 \cdot 1 + \frac12 \cdot \frac y2 = \frac12 + \frac y4$.
== y ≥ 2 ==
Both are 1: $F_Y(y) = 1$.
== The density ==
$F_Y$ is continuous (at 1 both pieces give $\frac34$, at 2 both give 1), so $Y$ is
continuous with density $\frac34$ on $(0,1)$, $\frac14$ on $(1,2)$, 0 elsewhere. Check:
$\frac34 + \frac14 = 1$.
:::

::: plot Example 3: F_Y rises at slope ¾, then ¼
x: -0.5 .. 2.5
y: 0 .. 1.1
xlabel: y
F(y) = min(max(y, 0), 1)/2 + min(max(y/2, 0), 1)/2
:::

### Example 4: a 2025 final-exam problem

::: example Uniform between y = x² and y = √x, and Z = U + X
$(X,Y)$ is uniform on $D = \{(x,y) : 0 < x < 1,\ x^2 < y < \sqrt x\}$, and
$$U = \begin{cases} 1, & X \ge Y, \\ 0, & X < Y. \end{cases}$$
(1) Find the joint density of $(X,Y)$. (2) Find the distribution function $F_Z(z)$ of
$Z = U + X$.
== (1) The area of D ==
A 2-D uniform density is $\frac1{S_D}$ on $D$ (Lesson 3.3):
$$S_D = \int_0^1 \left(\sqrt x - x^2\right)\d x = \left[\tfrac23 x^{3/2} - \tfrac13 x^3\right]_0^1 = \tfrac23 - \tfrac13 = \tfrac13,$$
so $f(x,y) = 3$ for $0 < x < 1$, $x^2 < y < \sqrt x$, and 0 otherwise.
== (2) Split on U ==
$U$ is discrete (0 or 1) and is decided by whether the point is above or below the
diagonal $y = x$, which runs through $D$ (on $(0,1)$, $x^2 < x < \sqrt x$):
$$\begin{aligned}F_Z(z) &= P\{U = 0, X \le z\} + P\{U = 1, X \le z - 1\}\\&= P\{X < Y, X \le z\} + P\{X \ge Y, X \le z - 1\}.\end{aligned}$$
The first term is the part of $D$ above the diagonal and left of $x = z$; the second, the
part below the diagonal and left of $x = z - 1$. Here independence plays no part: $U$
is a function of $(X,Y)$, and we integrate the joint density over each piece.
== z < 0 ==
$X > 0$, so both terms are 0: $F_Z(z) = 0$.
== 0 ≤ z < 1 ==
The second term needs $X \le z - 1 < 0$: it's 0.
$$F_Z(z) = \int_0^z \d x \int_x^{\sqrt x} 3\,\d y = 3\int_0^z \left(\sqrt x - x\right)\d x = 2z^{3/2} - \frac32 z^2.$$
== 1 ≤ z < 2 ==
The first term is all of $D$ above the diagonal:
$3\int_0^1 (\sqrt x - x)\,\d x = 3\left(\frac23 - \frac12\right) = \frac12$. The second:
$$\int_0^{z-1} \d x \int_{x^2}^{x} 3\,\d y = 3\int_0^{z-1} \left(x - x^2\right)\d x = \frac32 (z - 1)^2 - (z - 1)^3.$$
So $F_Z(z) = \frac12 + \frac32(z - 1)^2 - (z - 1)^3$.
== z ≥ 2 ==
$F_Z(z) = 1$.
== Answer ==
$$F_Z(z) = \begin{cases} 0, & z < 0, \\ 2z^{3/2} - \frac32 z^2, & 0 \le z < 1, \\ \frac12 + \frac32(z - 1)^2 - (z - 1)^3, & 1 \le z < 2, \\ 1, & z \ge 2. \end{cases}$$
Check the joins: at $z = 1$, $2 - \frac32 = \frac12$ from the left and $\frac12$ from the
right; at $z = 2$, $\frac12 + \frac32 - 1 = 1$. No jumps, so $Z$ is continuous, with
density $3(\sqrt z - z)$ on $(0,1)$ and $3\left[(z - 1) - (z - 1)^2\right]$ on $(1,2)$.
:::

Move $z$ below: for $z < 1$ only the part above the diagonal and left of $x = z$ counts;
for $1 \le z < 2$ all of the upper part counts, plus the lower part left of $x = z - 1$.

::: plot Example 4: D, its part above the diagonal with x ≤ z, and below it with x ≤ z − 1
x: 0 .. 1.1
y: 0 .. 1.1
region D: 0 < x < 1, x^2 < y, y < sqrt(x)
region A: 0 < x < 1, x < y, y < sqrt(x), x <= z
region B: 0 < x < 1, x^2 < y, y < x, x <= z - 1
f(x) = sqrt(x)
g(x) = x^2
h(x) = x
slider z: 0 .. 2 = 0.5
:::

::: plot Example 4: the distribution function of Z = U + X
x: -0.5 .. 2.5
y: 0 .. 1.1
xlabel: z
F(z) = 2 min(max(z, 0), 1)^1.5 - 1.5 min(max(z, 0), 1)^2 + 1.5 min(max(z - 1, 0), 1)^2 - min(max(z - 1, 0), 1)^3
:::

::: callout exam For the exam
This type is a favourite: a 2-D uniform region (find its area first), a discrete
variable built from it (an indicator like $U$) or given with it, and the distribution
function of a combination. Show the split by the discrete variable's values, then one
case per range of $z$, and check that the pieces join (or say where they jump, and by
how much). A multiple-choice version asks only how many discontinuities $F$ has.
:::

::: callout pitfall Don't drop the discrete variable's probabilities
In $F_Z(z) = \sum_i P\{X = x_i\}P\{\ldots\}$ every term carries its weight
$P\{X = x_i\}$. A common slip in Example 1 is to write $F_Y(z - 1) + F_Y(z - 2)$, which
can exceed 1. And replace the discrete variable by its value **inside** the event
($XY \le z$ with $Y = 0$ becomes $0 \le z$), not just in the weight.
:::

## The maximum and the minimum

**Intuition.** Two friends race; $X$ and $Y$ are their times. The race is over when the
**slower** one finishes, at $M = \max\{X,Y\}$. Ask "is it over by time $z$?": that
happens exactly when **both** have finished by $z$. And the first finisher, at
$N = \min\{X,Y\}$, is still out after $z$ exactly when **both** are still running. "Both"
is an intersection, and for independent variables the probability of an intersection is a
product. That's all there is to it. (Lesson 3.6 already met the discrete version for
two 0–1 variables.)

::: theorem Maximum and minimum of independent variables | 最大值与最小值的分布
Let $X$ and $Y$ be **independent** with distribution functions $F_X$ and $F_Y$. Then
$M = \max\{X,Y\}$ and $N = \min\{X,Y\}$ have
$$\begin{aligned}F_{\max}(z) &= P\{M \le z\} = P\{X \le z, Y \le z\} = P\{X \le z\}P\{Y \le z\} = F_X(z)F_Y(z),\\F_{\min}(z) &= P\{N \le z\} = 1 - P\{N > z\} = 1 - P\{X > z, Y > z\}\\&= 1 - P\{X > z\}P\{Y > z\} = 1 - [1 - F_X(z)][1 - F_Y(z)].\end{aligned}$$
More generally, for mutually independent $X_1, \ldots, X_n$ with distribution functions
$F_{X_i}$, $M = \max(X_1, \ldots, X_n)$ and $N = \min(X_1, \ldots, X_n)$ have
$$\begin{gathered}F_{\max}(z) = F_{X_1}(z)F_{X_2}(z)\cdots F_{X_n}(z),\\F_{\min}(z) = 1 - [1 - F_{X_1}(z)][1 - F_{X_2}(z)]\cdots[1 - F_{X_n}(z)].\end{gathered}$$
:::

When the variables are {{term independent and identically distributed | 独立同分布}}
(i.i.d.: independent, all with the same distribution function $F$), the products become
powers:

::: formula Distribution of the maximum | 最大值的分布
$$F_{\max}(z) = \prod_{i=1}^{n} F_{X_i}(z); \qquad \text{i.i.d.: } F_{\max}(z) = [F(z)]^n$$
--
X_1, \ldots, X_n | mutually **independent** random variables |
F_{X_i},\ F | their distribution functions (a common $F$ if i.i.d.) |
:::

::: formula Distribution of the minimum | 最小值的分布
$$F_{\min}(z) = 1 - \prod_{i=1}^{n}\left[1 - F_{X_i}(z)\right]; \qquad \text{i.i.d.: } F_{\min}(z) = 1 - [1 - F(z)]^n$$
--
X_1, \ldots, X_n | mutually **independent** random variables |
1 - F_{X_i}(z) | $P\{X_i > z\}$, the chance that $X_i$ is still above $z$ |
:::

For continuous i.i.d. variables with density $f$, differentiating gives the densities
$f_{\max}(z) = n[F(z)]^{n-1}f(z)$ and $f_{\min}(z) = n[1 - F(z)]^{n-1}f(z)$ (chain rule).
For example, the largest of $n$ independent $U(0,1)$ has $F_{\max}(z) = z^n$ and density
$nz^{n-1}$ on $(0,1)$: the more variables, the closer to 1 the maximum crowds.

::: callout pitfall Work with F, not with densities — and the minimum goes through "> z"
$f_{\max}$ is **not** $f_X f_Y$. Always find the distribution function first and
differentiate after. For the minimum, go through the complement
$P\{N > z\} = P\{X > z\}P\{Y > z\}$; $P\{N \le z\}$ is not $P\{X \le z\}P\{Y \le z\}$
(that's the maximum). And both product formulas need independence.
:::

### Example 1: two exponential lifetimes

::: example min and max of independent E(α) and E(β)
$X$ and $Y$ are independent, $f_X(x) = \alpha e^{-\alpha x}$ ($x > 0$) and
$f_Y(y) = \beta e^{-\beta y}$ ($y > 0$), 0 otherwise, with $\alpha, \beta > 0$,
$\alpha \ne \beta$. Find the densities of $Z_1 = \min\{X,Y\}$ and $Z_2 = \max\{X,Y\}$.
== The distribution functions ==
$F_X(x) = 1 - e^{-\alpha x}$ for $x > 0$ and 0 for $x \le 0$; likewise
$F_Y(y) = 1 - e^{-\beta y}$ for $y > 0$ (Lesson 2.3).
== The minimum ==
For $z > 0$, $1 - F_X(z) = e^{-\alpha z}$ and $1 - F_Y(z) = e^{-\beta z}$, so
$$F_{\min}(z) = 1 - e^{-\alpha z}e^{-\beta z} = \begin{cases} 1 - e^{-(\alpha + \beta)z}, & z > 0, \\ 0, & z \le 0, \end{cases} \qquad f_{\min}(z) = \begin{cases} (\alpha + \beta)e^{-(\alpha + \beta)z}, & z > 0, \\ 0, & z \le 0. \end{cases}$$
The minimum is again exponential: $Z_1 \sim E(\alpha + \beta)$.
== The maximum ==
$$F_{\max}(z) = F_X(z)F_Y(z) = \begin{cases} (1 - e^{-\alpha z})(1 - e^{-\beta z}), & z > 0, \\ 0, & z \le 0. \end{cases}$$
Multiply out, $1 - e^{-\alpha z} - e^{-\beta z} + e^{-(\alpha + \beta)z}$, and differentiate:
$$f_{\max}(z) = \begin{cases} \alpha e^{-\alpha z} + \beta e^{-\beta z} - (\alpha + \beta)e^{-(\alpha + \beta)z}, & z > 0, \\ 0, & z \le 0. \end{cases}$$
The maximum is **not** exponential.
:::

::: callout note A typo on slide 18-062
It writes $F_Y(y) = 1 - \beta e^{-\beta y}$; the distribution function of $E(\beta)$ is
$1 - e^{-\beta y}$ (as on slide 18-061). The slide's $F_{\max}$ and $f_{\max}$ use the
correct form.
:::

Here $a$ and $b$ stand for $\alpha$ and $\beta$. The minimum's density starts at
$a + b$ and falls fast; the maximum's starts at 0 (both must have finished) and has a hump.

::: plot Densities of min (f) and max (g) of independent E(α) and E(β)
x: 0 .. 6
xlabel: z
f(z) = (a + b) e^(-(a + b) z)
g(z) = a e^(-a z) + b e^(-b z) - (a + b) e^(-(a + b) z)
slider a: 0.1 .. 3 = 1
slider b: 0.1 .. 3 = 0.5
:::

### Series and parallel systems

The classic use (our own example, not on the slides): a machine of $n$ components that
fail independently. Wired **in series**, it stops when the first component fails: its
lifetime is the minimum. Wired **in parallel** (spares that keep it going), it stops when
the last one fails: the maximum.

::: example Three components, each E(0.5)
Three independent components each have lifetime $E(0.5)$ (in years; mean 2 years). Find
the chance that the system still works after 1 year (1) in series, (2) in parallel.
== One component ==
$P\{X_i > 1\} = e^{-0.5} \approx 0.607$, so $F(1) = 1 - e^{-0.5} \approx 0.393$.
== (1) Series: the minimum ==
$P\{N > 1\} = [1 - F(1)]^3 = e^{-1.5} \approx 0.223$. (Equivalently $N \sim E(1.5)$, by
Example 1 with three rates added.)
== (2) Parallel: the maximum ==
$P\{M > 1\} = 1 - [F(1)]^3 = 1 - (1 - e^{-0.5})^3 \approx 1 - 0.061 = 0.939$.
:::

::: explore Series and parallel systems of n components, each E(β)
slider n: 1 .. 10 = 3 | | step 1
slider b: 0.1 .. 2 = 0.5 | | rate β
slider t: 0 .. 10 = 1 | | time
S = e^(-n b t) | | P{series system works at t}
Q = 1 - (1 - e^(-b t))^n | | P{parallel system works at t}
:::

### Example 2: a maximum without independence

::: example M = max(X, Y) for the density x e^(−y) on 0 < x < y
$(X,Y)$ has density $f(x,y) = xe^{-y}$ for $0 < x < y$, and 0 otherwise. Find the density
of $M = \max(X,Y)$.
== No independence: go back to the definition ==
The support $0 < x < y$ is not a rectangle, so $X$ and $Y$ are dependent and
$F_X F_Y$ is wrong. But $\{M \le z\} = \{X \le z, Y \le z\}$ still holds, so integrate the
joint density over the square corner $x \le z$, $y \le z$:
$$F_M(z) = \iint_{x \le z,\ y \le z} f(x,y)\,\d x\,\d y.$$
== z ≤ 0 ==
$F_M(z) = 0$.
== z > 0 ==
Inside the corner the support is $0 < x < y \le z$:
$$F_M(z) = \int_0^z \left[\int_0^y xe^{-y}\,\d x\right]\d y = \int_0^z \frac12 y^2 e^{-y}\,\d y.$$
== Differentiate ==
$$f_M(z) = F_M'(z) = \begin{cases} \frac12 z^2 e^{-z}, & z > 0, \\ 0, & z \le 0. \end{cases}$$
Shortcut: on the support $X < Y$ always, so $M = Y$, and $f_M$ is just the marginal
density of $Y$, $\int_0^y xe^{-y}\,\d x = \frac12 y^2 e^{-y}$ (Lesson 3.2).
:::

### The minimum of an exponential and a constant: min(X, 2)

A constant is a (degenerate) random variable too, and taking the minimum with it
**caps** $X$: $Y = \min(X, 2)$ is $X$ when $X < 2$ and exactly 2 otherwise. All the
probability that $X$ spends beyond 2 piles up on the single value 2.

::: example Y = min(X, 2) for X ~ E(β)
$X \sim E(\beta)$. Find the distribution function of $Y = \min(X, 2)$.
== Through the complement ==
$$F_Y(y) = P\{\min(X, 2) \le y\} = 1 - P\{\min(X, 2) > y\} = 1 - P\{X > y,\ 2 > y\}.$$
The event $\{2 > y\}$ involves no randomness: it is certain when $y < 2$ and impossible
when $y \ge 2$.
== y < 0 ==
$F_Y(y) = 1 - P\{X > y\} = 1 - 1 = 0$.
== 0 ≤ y < 2 ==
$F_Y(y) = 1 - P\{X > y\} = F_X(y) = 1 - e^{-\beta y}$.
== y ≥ 2 ==
$\{2 > y\}$ is impossible, so $P\{X > y, 2 > y\} = 0$ and $F_Y(y) = 1$.
== Continuity ==
$$F_Y(y) = \begin{cases} 0, & y < 0, \\ 1 - e^{-\beta y}, & 0 \le y < 2, \\ 1, & y \ge 2. \end{cases}$$
At $y = 0$: $\lim_{y \to 0^+}(1 - e^{-\beta y}) = 0$, the same as from the left —
continuous. At $y = 2$: $\lim_{y \to 2^-}(1 - e^{-\beta y}) = 1 - e^{-2\beta} \ne 1$ — a
jump of $e^{-2\beta} = P\{X > 2\} = P\{Y = 2\}$. Exactly **one** discontinuity, at
$y = 2$. $Y$ is of mixed type: continuous on $[0, 2)$, plus a point mass at 2.
:::

::: plot Y = min(X, 2) for X ~ E(β): F_Y jumps at 2 by e^(−2β)
x: -1 .. 4
y: 0 .. 1.1
xlabel: y
F(y) = min(max(floor(y) + 1, 0), 1) (1 - e^(-b min(y, 2))) + min(max(floor(y - 1), 0), 1) e^(-2 b)
slider b: 0.1 .. 2 = 0.5 | | rate β
:::

::: callout key The one idea
For a continuous-and-discrete pair: split on the discrete variable's values and add, each
term weighted by its probability. For extremes of independent variables:
"$\max \le z$" means **all** $\le z$ (multiply the $F$s); "$\min > z$" means **all**
$> z$ (multiply the $1 - F$s). Without independence, integrate the joint density over
$\{x \le z, y \le z\}$ instead.
:::

::: cards Maximum, minimum and mixed variables
Splitting on a discrete $X$ :: $F_Z(z) = \sum_i P\{X = x_i\}P\{g(x_i, Y) \le z \mid X = x_i\}$ (total probability)
$X + Y$, $X = 1$ or $2$ w.p. $0.3$, $0.7$, independent of $Y$ :: $f_Z(z) = 0.3f(z - 1) + 0.7f(z - 2)$
$XY$, $X \sim N(0,1)$, $Y = 0$ or $1$ w.p. $\frac12$ :: $F = \frac12\Phi(z)$ ($z < 0$), $\frac12 + \frac12\Phi(z)$ ($z \ge 0$): one jump, of $\frac12$ at 0
A jump of $F$ at $z_0$ means :: $P\{Z = z_0\} > 0$, equal to the jump's size
Maximum of independent variables :: $F_{\max}(z) = F_X(z)F_Y(z)$; $n$ i.i.d.: $[F(z)]^n$
Minimum of independent variables :: $F_{\min}(z) = 1 - [1 - F_X(z)][1 - F_Y(z)]$; $n$ i.i.d.: $1 - [1 - F(z)]^n$
Density of the max of $n$ i.i.d. :: $n[F(z)]^{n-1}f(z)$
Min of independent $E(\alpha)$ and $E(\beta)$ :: $E(\alpha + \beta)$
Max of independent $E(\alpha)$ and $E(\beta)$: density :: $\alpha e^{-\alpha z} + \beta e^{-\beta z} - (\alpha + \beta)e^{-(\alpha + \beta)z}$, $z > 0$
Max or min without independence :: Integrate the joint density: $F_{\max}(z) = \iint_{x \le z,\, y \le z} f\,\d x\,\d y$
$\min(X, 2)$ for $X \sim E(\beta)$ :: $F = 1 - e^{-\beta y}$ on $[0,2)$, 1 from 2 on: one jump, of $e^{-2\beta}$ at $y = 2$
Series and parallel systems :: Series lifetime $= \min$, parallel lifetime $= \max$
:::

::: quiz Check yourself
? $X$ and $Y$ are independent, $X \sim N(0,1)$, $P\{Y = 0\} = P\{Y = 1\} = \frac12$, and $F(z)$ is the distribution function of $Z = XY$. How many discontinuities does $F(z)$ have?
- [ ] 0
- [x] 1
- [ ] 2
- [ ] 3
> $F(z) = \frac12\Phi(z)$ for $z < 0$ and $\frac12 + \frac12\Phi(z)$ for $z \ge 0$. Only at $z = 0$ does it jump, from $\frac14$ to $\frac34$: one discontinuity, of size $P\{Z = 0\} = P\{Y = 0\} = \frac12$.

? Same $X$, $Y$. Find $P\{XY = 0\}$.
answer: 1/2
> $XY = 0$ when $Y = 0$ (probability $\frac12$) or when $X = 0$ (probability 0, $X$ is continuous): $\frac12$. It is the size of the jump.

? $X$ and $Y$ are independent, $Y \sim N(0,1)$, $P\{X = 1\} = 0.3$, $P\{X = 2\} = 0.7$. Find $P\{X + Y \le 2\}$.
answer: 0.3 Phi(1) + 0.35
tolerance: 0.1%
> $F_Z(2) = 0.3\,\Phi(2 - 1) + 0.7\,\Phi(2 - 2) = 0.3\,\Phi(1) + 0.35 \approx 0.602$.

? $P\{X = 1\} = P\{X = 2\} = \frac12$ and, given $X = i$, $Y \sim U(0, i)$. Find $F_Y(1.5)$.
answer: 7/8
> For $1 \le y < 2$, $F_Y(y) = \frac12 \cdot 1 + \frac12 \cdot \frac y2 = \frac12 + \frac y4$; at $1.5$: $\frac12 + \frac38 = \frac78$.

? $(X,Y)$ is uniform on $0 < x < 1$, $x^2 < y < \sqrt x$, $U = 1$ if $X \ge Y$ and $0$ otherwise, $Z = U + X$. Find $F_Z(1.5)$.
answer: 3/4
> For $1 \le z < 2$, $F_Z(z) = \frac12 + \frac32(z - 1)^2 - (z - 1)^3$; at $1.5$: $\frac12 + \frac38 - \frac18 = \frac34$.

? Same set-up. What is the joint density of $(X,Y)$ on $D$?
answer: 3
> $S_D = \int_0^1 (\sqrt x - x^2)\,\d x = \frac23 - \frac13 = \frac13$, so the density is $\frac1{S_D} = 3$.

? $X$ and $Y$ are independent and identically distributed with distribution function $F(x)$, and $Z = \min(X,Y)$. Then $F_Z(z) =$
- [ ] $F^2(z)$
- [ ] $F(x)F(y)$
- [x] $1 - [1 - F(z)]^2$
- [ ] $[1 - F(x)][1 - F(y)]$
> $P\{Z > z\} = P\{X > z\}P\{Y > z\} = [1 - F(z)]^2$, so $F_Z(z) = 1 - [1 - F(z)]^2$. $F^2(z)$ is the maximum's; the other two aren't even functions of $z$.

? $X$ follows an exponential distribution. The distribution function of $Y = \min(X, 2)$
- [ ] is continuous
- [ ] has at least two discontinuities
- [ ] is a step function
- [x] has exactly one discontinuity
> $F_Y(y) = 0$ for $y < 0$, $1 - e^{-\beta y}$ for $0 \le y < 2$, and 1 for $y \ge 2$. It is continuous at 0 but jumps at 2, by $e^{-2\beta} = P\{X > 2\}$: exactly one discontinuity.

? $X \sim E(1)$ and $Y = \min(X, 2)$. Find $P\{Y = 2\}$.
answer: e^(-2)
> $Y = 2$ exactly when $X \ge 2$: $P\{X \ge 2\} = e^{-2} \approx 0.135$, the size of the jump at 2.

? $X \sim E(1)$ and $Y \sim E(2)$ are independent. Find $P\{\min(X,Y) > 1\}$.
answer: e^(-3)
> $\min(X,Y) \sim E(1 + 2) = E(3)$, so $P\{\min > 1\} = e^{-3} \approx 0.0498$. Directly: $P\{X > 1\}P\{Y > 1\} = e^{-1}e^{-2}$.

? $X_1, \ldots, X_n$ are independent, each $U(0,1)$. Write the density of $\max(X_1, \ldots, X_n)$ on $0 < z < 1$.
expression: n z^(n - 1)
variables: z, n
> $F_{\max}(z) = [F(z)]^n = z^n$ on $(0,1)$; differentiating gives $nz^{n-1}$.

? $(X,Y)$ has density $xe^{-y}$ on $0 < x < y$. Write the density of $\max(X,Y)$ for $z > 0$.
expression: z^2 e^(-z) / 2
variables: z
> No independence, so integrate over $x \le z$, $y \le z$: $F_M(z) = \int_0^z \frac12 y^2 e^{-y}\,\d y$, and $f_M(z) = \frac12 z^2 e^{-z}$. (Since $X < Y$, $\max = Y$.)
:::

---
title: Covariance and correlation
zh: 协方差与相关系数
summary: How two random variables move together — covariance, the correlation coefficient ρ and why |ρ| ≤ 1, uncorrelated versus independent (with the classic counterexamples), the bivariate normal where the two coincide, and moments.
source: 15方差和协方差9-1 (§4.4), 2026-10-26; 16协方差和相关系数9-2 (§4.4, §4.5), 2026-10-28
---

Expectation and variance describe one random variable at a time. But many questions are
about two at once: do taller people weigh more? does a stock rise when another falls?
how uncertain is the total of two measurements that share an error? This lesson
introduces the two numbers that measure how $X$ and $Y$ move **together**: the
{{term covariance | 协方差}} and its standardised form, the
{{term correlation coefficient | 相关系数}} $\rho_{XY}$. It proves that $\rho$ always lies
between $-1$ and $1$, that $\rho = \pm1$ means an exact straight-line relationship, and
then draws the line that exams love to test: **uncorrelated is weaker than
independent** — except for the bivariate normal, where they are the same. A short last
section defines moments, which generalise $EX$ and $DX$.

You need the expectation of a function of $(X, Y)$ and the properties of $E$ (Lessons 4.1
and 4.2), and the rules for variance (Lesson 4.3).

## Covariance

### Where it comes from

Lesson 4.3 showed that for **any** two random variables
$$D(X \pm Y) = E[(X \pm Y) - E(X \pm Y)]^2 = D(X) + D(Y) \pm 2E\{[X - E(X)][Y - E(Y)]\}.$$
When $X$ and $Y$ are independent the last term is 0 and variances simply add. When they
are not, that term is what's left over — and it says something about how $X$ and $Y$
are linked. Look at the product $[X - EX][Y - EY]$:

- if $X$ tends to be above its mean when $Y$ is above its mean (and below when $Y$ is
  below), the two deviations usually have the **same** sign, the product is usually
  positive, and its average is positive;
- if one tends to be high when the other is low, the product is usually negative;
- if there is no such tendency, positive and negative products balance out.

::: define Covariance | 协方差
Let $(X, Y)$ be a two-dimensional random variable. If $E\{[X - E(X)][Y - E(Y)]\}$ exists,
it is called the **covariance** of $X$ and $Y$, written $\operatorname{Cov}(X, Y)$:
$$\operatorname{Cov}(X, Y) = E\{[X - E(X)][Y - E(Y)]\}.$$
:::

### Computing it

Multiplying out, exactly as for $DX = EX^2 - (EX)^2$:
$$E\{[X - EX][Y - EY]\} = E[XY - X\,EY - Y\,EX + EX\,EY] = E(XY) - 2EX\,EY + EX\,EY.$$

::: formula Covariance | 协方差的计算公式
$$\operatorname{Cov}(X, Y) = E\{[X - E(X)][Y - E(Y)]\} = E(XY) - E(X)E(Y)$$
--
E(XY) | from the joint distribution: $\sum\sum x_iy_jp_{ij}$ or $\iint xy\,p(x,y)\,\d x\,\d y$ (Lesson 4.2) |
E(X), E(Y) | the means of $X$ and $Y$ |
:::

::: formula Variance of a sum, with covariance | 和与差的方差（协方差形式）
$$D(X \pm Y) = D(X) + D(Y) \pm 2\operatorname{Cov}(X, Y)$$
--
\operatorname{Cov}(X, Y) | covariance of $X$ and $Y$; zero when they are independent |
:::

So Lesson 4.3's cross term $EXY - EX\,EY$ was the covariance all along.

### Properties

::: theorem Properties of covariance | 协方差的性质
For random variables $X, Y, X_1, X_2$ and constants $a, b, c, d$:
1. $\operatorname{Cov}(X, Y) = \operatorname{Cov}(Y, X)$; $\operatorname{Cov}(X, a) = 0$; $\operatorname{Cov}(X, X) = DX$.
2. $\operatorname{Cov}(aX + b, cY + d) = ac\operatorname{Cov}(X, Y)$.
3. $\operatorname{Cov}(X_1 + X_2, Y) = \operatorname{Cov}(X_1, Y) + \operatorname{Cov}(X_2, Y)$.
:::

Each follows from $\operatorname{Cov}(X, Y) = E(XY) - E(X)E(Y)$ in one line:

1. The formula is symmetric in $X$ and $Y$. With $Y = a$: $E(aX) - a\,EX = 0$ — a constant
   doesn't vary, so it can't vary with anything. With $Y = X$: $EX^2 - (EX)^2 = DX$.
2. The deviations of $aX + b$ and $cY + d$ are $a(X - EX)$ and $c(Y - EY)$ (the shifts
   cancel), so their product's mean is $ac\,E[(X - EX)(Y - EY)]$.
3. $E[(X_1 + X_2)Y] - E(X_1 + X_2)EY = [E(X_1Y) - EX_1\,EY] + [E(X_2Y) - EX_2\,EY]$.

Properties 2 and 3 together say covariance is **linear in each argument**, so you can
expand it like a product: $\operatorname{Cov}(2X - Y, X + 3Y) = 2DX + 6\operatorname{Cov}(X,Y) - \operatorname{Cov}(X,Y) - 3DY$.
In particular
$$D(aX + bY) = a^2DX + b^2DY + 2ab\operatorname{Cov}(X, Y).$$

::: callout pitfall The cross term carries both coefficients
$D(2X - 3Y) = 4DX + 9DY + 2\cdot2\cdot(-3)\operatorname{Cov}(X, Y) = 4DX + 9DY - 12\operatorname{Cov}(X, Y)$.
Writing $-6\operatorname{Cov}$ (forgetting the 2 in front) is the wrong option in in-class
question 20-041.
:::

::: example The triangle again: a negative covariance
$(X, Y)$ is uniform on the triangle with vertices $(0,0)$, $(1,0)$, $(0,2)$ (bounded by
the axes and $x + \frac y2 = 1$). Lesson 4.2 found $E(XY) = \frac16$; Lesson 4.3 found
$EX = \frac13$, $EY = \frac23$, $DX = \frac1{18}$, $DY = \frac29$. Find $\operatorname{Cov}(X, Y)$ and $D(X + Y)$.
== Covariance ==
$$\operatorname{Cov}(X, Y) = E(XY) - EX\,EY = \frac16 - \frac13\cdot\frac23 = \frac{3}{18} - \frac{4}{18} = -\frac{1}{18}.$$
== Why negative ==
The slanted side $y = 2 - 2x$ means: the larger $X$ is, the less room $Y$ has. Big $X$
goes with small $Y$.
== The variance of the sum ==
$$D(X + Y) = DX + DY + 2\operatorname{Cov}(X, Y) = \frac{1}{18} + \frac{4}{18} - \frac{2}{18} = \frac16.$$
(Adding $DX + DY = \frac{5}{18}$ would be wrong: $X$ and $Y$ aren't independent.)
:::

## The correlation coefficient

### Why standardise

Covariance has a drawback: it depends on units. Measure $X$ in centimetres instead of
metres and, by property 2, $\operatorname{Cov}$ grows 100 times, though the relationship
hasn't changed. Dividing by both standard deviations removes the units.

::: define Correlation coefficient | 相关系数
Let $(X, Y)$ be a two-dimensional random variable whose covariance exists, with $DX > 0$
and $DY > 0$. Then
$$\rho_{XY} = \frac{\operatorname{Cov}(X, Y)}{\sqrt{D(X)}\cdot\sqrt{D(Y)}}$$
is called the **correlation coefficient** of $X$ and $Y$.
:::

::: formula Correlation coefficient | 相关系数
$$\rho_{XY} = \frac{\operatorname{Cov}(X, Y)}{\sqrt{D(X)}\sqrt{D(Y)}}, \qquad \operatorname{Cov}(X, Y) = \rho_{XY}\sqrt{D(X)}\sqrt{D(Y)}$$
--
\rho_{XY} | correlation coefficient, a pure number in $[-1, 1]$ |
\sqrt{D(X)}, \sqrt{D(Y)} | the standard deviations $\sigma_X$, $\sigma_Y$ |
:::

The correlation coefficient is also called the {{term standardised covariance | 标准协方差}}:
it is the covariance of the standardised variables $\frac{X - EX}{\sigma_X}$ and
$\frac{Y - EY}{\sigma_Y}$, and it is {{term dimensionless | 无量纲}}. The second form above,
$\operatorname{Cov} = \rho\sigma_X\sigma_Y$, is how problems that give $\rho$ are solved.

In the triangle example, $\rho_{XY} = \dfrac{-1/18}{\sqrt{1/18}\sqrt{2/9}} = \dfrac{-1/18}{1/9} = -\dfrac12$.

::: example Example 1: a combination with a given ρ
$X \sim N(1, 3^2)$, $Y \sim N(0, 4^2)$, $\rho_{XY} = -\frac12$, and $Z = \frac X3 + \frac Y2$.
(1) Find $E(Z)$ and $D(Z)$. (2) Find the correlation coefficient of $X$ and $Z$.
== Read the parameters ==
$E(X) = 1$, $D(X) = 9$, $E(Y) = 0$, $D(Y) = 16$, and
$\operatorname{Cov}(X, Y) = \rho_{XY}\sqrt{DX}\sqrt{DY} = -\frac12\cdot3\cdot4 = -6$.
== (1) The mean ==
$E(Z) = \frac13E(X) + \frac12E(Y) = \frac13$.
== (1) The variance ==
$X$ and $Y$ are correlated, so keep the covariance term:
$$\begin{aligned}D(Z) &= D\Big(\frac X3\Big) + D\Big(\frac Y2\Big) + 2\operatorname{Cov}\Big(\frac X3, \frac Y2\Big)\\&= \frac19D(X) + \frac14D(Y) + \frac13\operatorname{Cov}(X, Y)\\&= 1 + 4 - 2 = 3.\end{aligned}$$
== (2) The covariance of X and Z ==
Expand linearly:
$$\operatorname{Cov}(X, Z) = \frac13\operatorname{Cov}(X, X) + \frac12\operatorname{Cov}(X, Y) = \frac13\cdot9 + \frac12\cdot(-6) = 3 - 3 = 0.$$
== (2) The correlation ==
$\rho_{XZ} = \dfrac{\operatorname{Cov}(X, Z)}{\sqrt{D(X)}\sqrt{D(Z)}} = 0$.
:::

::: example Example 2: indicators from a uniform rectangle
$(X, Y)$ is uniform on $G = \{(x, y) \mid 0 \le x \le 2,\ 0 \le y \le 1\}$. Let
$$U = \begin{cases}0, & X \le Y,\\ 1, & X > Y,\end{cases}\qquad V = \begin{cases}0, & X \le 2Y,\\ 1, & X > 2Y.\end{cases}$$
(1) Find the joint distribution of $U$ and $V$. (2) Find their correlation coefficient.
== Probabilities are areas ==
$G$ has area 2, so the density is $\frac12$ and each probability is half an area
(Lesson 3.3). The lines $y = x$ and $x = 2y$ cut $G$ into three pieces (see the plot).
== (1) The four cells ==
- $P\{U = 0, V = 0\} = P\{X \le Y,\ X \le 2Y\} = P\{X \le Y\}$: the triangle $0 \le x \le y \le 1$, area $\frac12$, so $\frac14$.
- $P\{U = 0, V = 1\} = P\{X \le Y,\ X > 2Y\} = 0$: since $Y \ge 0$, $X > 2Y$ forces $X > Y$.
- $P\{U = 1, V = 0\} = P\{Y < X \le 2Y\}$: the strip between the lines, area $\frac12$, so $\frac14$.
- $P\{U = 1, V = 1\} = P\{X > 2Y\}$: the triangle below $x = 2y$, area 1, so $\frac12$.
== The table ==
| $U$ \ $V$ | $V = 0$ | $V = 1$ | Marginal $p_{i\cdot}$ |
| --- | --- | --- | --- |
| $U = 0$ | 1/4 | 0 | 1/4 |
| $U = 1$ | 1/4 | 1/2 | 3/4 |
| Marginal $p_{\cdot j}$ | 1/2 | 1/2 | 1 |
== (2) The moments ==
$U$ and $V$ are 0–1 variables: $E(U) = \frac34$, $D(U) = \frac34\cdot\frac14 = \frac{3}{16}$;
$E(V) = \frac12$, $D(V) = \frac14$. $UV = 1$ only in the cell $(1, 1)$: $E(UV) = \frac12$.
== (2) The correlation ==
$\operatorname{Cov}(U, V) = \frac12 - \frac34\cdot\frac12 = \frac18$, and
$$\rho_{UV} = \frac{1/8}{\sqrt{3/16}\cdot\sqrt{1/4}} = \frac{1/8}{\sqrt3/8} = \frac{1}{\sqrt3} \approx 0.577.$$
:::

::: plot Example 2: the rectangle cut by y = x and x = 2y
x: 0 .. 2.2
y: 0 .. 1.2
region UV00: 0 <= x <= 2, 0 <= y <= 1, x <= y
region UV10: 0 <= x <= 2, 0 <= y <= 1, y < x, x <= 2 y
region UV11: 0 <= x <= 2, 0 <= y <= 1, x > 2 y
f(x) = x
g(x) = x / 2
:::

### |ρ| ≤ 1

::: theorem Bounds on the correlation coefficient | 相关系数的性质
1. $|\rho_{XY}| \le 1$; equivalently $\operatorname{Cov}^2(X, Y) \le DX\cdot DY$.
2. $|\rho_{XY}| = 1 \iff P\{Y = a + bX\} = 1$ for some constants $a$ and $b \ne 0$; and then
   $\rho_{XY} = 1$ when $b > 0$, $\rho_{XY} = -1$ when $b < 0$.
:::

::: example Proof that |ρ| ≤ 1
Use the fact that a variance can't be negative.
== A variance as a quadratic in t ==
For every real $t$, by the variance of a combination,
$$0 \le D(Y - tX) = t^2D(X) - 2\operatorname{Cov}(X, Y)\,t + D(Y).$$
== Its minimum ==
This quadratic in $t$ (with $D(X) > 0$) is smallest at $t = \dfrac{\operatorname{Cov}(X, Y)}{D(X)} \triangleq b$,
where it equals
$$\frac{D(X)D(Y) - [\operatorname{Cov}(X, Y)]^2}{D(X)} = D(Y)\left[1 - \frac{\operatorname{Cov}^2(X, Y)}{D(X)D(Y)}\right] = D(Y)(1 - \rho^2).$$
== Conclude ==
So $0 \le D(Y)(1 - \rho^2)$, and since $D(Y) > 0$, $\rho^2 \le 1$.
== When |ρ| = 1 ==
If $\rho^2 = 1$, the minimum is 0: $D(Y - bX) = 0$. By Lesson 4.3's property 4, $Y - bX$
is a constant $a$ with probability 1, so $P\{Y = a + bX\} = 1$. Conversely, if
$Y = a + bX$, then $\operatorname{Cov}(X, Y) = b\,DX$ and $DY = b^2DX$, so
$\rho = \frac{b\,DX}{|b|DX} = \frac{b}{|b|} = \pm1$, with the sign of $b$.
:::

The slide stops at $D(Y)(1 - \rho^2)$; the conclusion and the $|\rho| = 1$ case are filled
in above.

::: example Example 3: reading the line from ρ = 1
$X \sim N(0, 1)$, $Y \sim N(1, 4)$ and $\rho_{XY} = 1$. Which holds: $P\{Y = -2X - 1\} = 1$,
$P\{Y = 2X - 1\} = 1$, $P\{Y = -2X + 1\} = 1$ or $P\{Y = 2X + 1\} = 1$?
== The slope ==
$\rho = 1$ means $Y = a + bX$ with $b > 0$. Then $DY = b^2DX$: $4 = b^2$, so $b = 2$.
== The intercept ==
$EY = a + b\,EX$: $1 = a + 0$, so $a = 1$.
== Answer ==
$P\{Y = 2X + 1\} = 1$ (the fourth option, D on the slide).
:::

### What ρ means

$\rho_{XY}$ measures how close $X$ and $Y$ are to a **straight-line** relationship:

- $\rho = \pm1$: $Y$ is exactly a linear function of $X$ (increasing for $+1$, decreasing for $-1$);
- $0 < |\rho| < 1$: the closer $|\rho|$ is to 1, the more tightly $(X, Y)$ clusters round a line;
  the closer to 0, the weaker the linear relationship;
- $\rho = 0$: no **linear** relationship (there may still be another kind, as the examples
  below show).

The sign says the direction: positive when large $X$ goes with large $Y$, negative when
large $X$ goes with small $Y$ (as in the triangle, $\rho = -\frac12$).

Slide $\rho$ to see how it controls the variance of a sum and a difference. At $\rho = 1$
the standard deviations add, $\sqrt{D(X + Y)} = \sigma_X + \sigma_Y$; at $\rho = -1$ they cancel
in the sum.

::: explore D(X ± Y) from DX, DY and ρ
slider DX: 0 .. 10 = 1 | | Variance of X
slider DY: 0 .. 10 = 0.25 | | Variance of Y
slider r: -1 .. 1 = 0.3333 | | Correlation ρ
cov = r sqrt(DX DY) | | Cov(X, Y)
sum = DX + DY + 2 r sqrt(DX DY) | | D(X + Y)
diff = DX + DY - 2 r sqrt(DX DY) | | D(X − Y)
diff3 = DX + 9 DY - 6 r sqrt(DX DY) | | D(X − 3Y)
:::

(With the starting values $DX = 1$, $DY = \frac14$, $\rho = \frac13$, the last line is in-class
question 20-048: $D(X - 3Y) = \frac94$.)

## Uncorrelated random variables

::: define Uncorrelated | 不相关
$X$ and $Y$ are **uncorrelated** if $\rho_{XY} = 0$. They are
{{term perfectly correlated | 完全相关}} if $|\rho_{XY}| = 1$.
:::

Since $\rho = 0$ exactly when $\operatorname{Cov} = 0$, and the covariance appears in two other
formulas, there are four ways to say the same thing.

::: theorem Tests for uncorrelatedness | 不相关性的判定
The following are equivalent:
1. $\rho_{XY} = 0$;
2. $\operatorname{Cov}(X, Y) = 0$;
3. $D(X \pm Y) = DX + DY$;
4. $E(XY) = EX\cdot EY$.
:::

### Independent implies uncorrelated, not conversely

If $X$ and $Y$ are independent, $E(XY) = EX\,EY$ (Lesson 4.2), so condition 4 holds and
they are uncorrelated. The converse fails: uncorrelated only says there is no **linear**
link, while independence says there is no link of **any** kind.

::: theorem Independence and uncorrelatedness | 独立与不相关的关系
If $X$ and $Y$ are independent, they are uncorrelated. The converse is false: uncorrelated
random variables need not be independent.
:::

::: callout key Independent ⇒ uncorrelated ⇏ independent
$$X, Y \text{ independent} \ \Longrightarrow\ \rho_{XY} = 0, \qquad \rho_{XY} = 0 \ \not\Longrightarrow\ X, Y \text{ independent}.$$
Examples 4–6 are the standard counterexamples. To show two variables are **not**
independent, find one pair of events (or one point of the distribution functions) where
the product rule fails.
:::

::: example Example 4: uniform on the unit disc
$(X, Y)$ is uniform on the disc $x^2 + y^2 \le 1$. (1) Are $X$ and $Y$ independent?
(2) Find $\rho_{XY}$.
== The density ==
The disc has area $\pi$, so $f(x, y) = \frac1\pi$ for $x^2 + y^2 \le 1$, 0 elsewhere.
== The moments, by symmetry ==
The disc is symmetric under $x \to -x$ and under $y \to -y$, and $x$, $y$, $xy$ each change
sign under one of these, so
$$E(X) = \iint_{x^2+y^2\le1}x\cdot\frac1\pi\,\d x\,\d y = 0,\quad E(Y) = 0,\quad E(XY) = \iint_{x^2+y^2\le1}xy\cdot\frac1\pi\,\d x\,\d y = 0.$$
== (2) Uncorrelated ==
$\operatorname{Cov}(X, Y) = E(XY) - E(X)E(Y) = 0 - 0 = 0$, so $\rho_{XY} = 0$.
== (1) Not independent ==
Take the events $\{X > 0.8\}$ and $\{Y > 0.8\}$. Each has positive probability, but both
together would need $x^2 + y^2 > 1.28 > 1$, outside the disc:
$$P\{X > 0.8,\ Y > 0.8\} = 0 \ne P\{X > 0.8\}\,P\{Y > 0.8\}.$$
Knowing $X$ is near 1 forces $Y$ near 0: they are dependent. (Equivalently, the density
doesn't factor, because the region where it is positive isn't a rectangle; Lesson 3.5.)
:::

::: plot Example 4: once X > a, Y is squeezed
x: -1.2 .. 1.2
y: -1.2 .. 1.2
region Disc: x^2 + y^2 <= 1
region Xbig: x^2 + y^2 <= 1, x > a
region Ybig: x^2 + y^2 <= 1, y > a
slider a: 0 .. 0.95 = 0.8
:::

For $a > 1/\sqrt2 \approx 0.71$ the two strips don't overlap: $P\{X > a, Y > a\} = 0$, while
each strip has positive probability.

::: example Example 5: Y = X² for a standard normal X
$X \sim N(0, 1)$ and $Y = X^2$. Prove that $X$ and $Y$ are uncorrelated but not independent.
== The covariance ==
$E(X) = 0$, and $E(XY) = E(X^3) = \int_{-\infty}^{+\infty}x^3\varphi(x)\,\d x = 0$, because
$x^3\varphi(x)$ is an odd function ($\varphi$, the standard normal density, is even). So
$\operatorname{Cov}(X, Y) = E(XY) - E(X)E(Y) = 0$: uncorrelated.
== Not independent ==
Compare the joint distribution function with the product of the marginals at $(1, 1)$.
Since $X^2 \le 1$ already implies $X \le 1$:
$$F(1, 1) = P\{X \le 1,\ X^2 \le 1\} = P\{X^2 \le 1\},$$
$$F_X(1)F_Y(1) = P\{X \le 1\}\,P\{X^2 \le 1\}.$$
== The numbers ==
$P\{X^2 \le 1\} = 2\Phi(1) - 1 \approx 0.6827$ and $P\{X \le 1\} = \Phi(1) \approx 0.8413 < 1$,
so $F(1, 1) \approx 0.6827$ but $F_X(1)F_Y(1) \approx 0.5744$. Not independent — of course:
$Y$ is a function of $X$.
:::

::: plot Why E(X³) = 0: x³φ(x) is odd, its two lobes cancel
x: -4 .. 4
xlabel: x
φ(x) = e^(-x^2 / 2) / sqrt(2 pi)
h(x) = x^3 e^(-x^2 / 2) / sqrt(2 pi)
:::

The relationship $Y = X^2$ is perfectly exact, yet $\rho = 0$: it is a parabola, symmetric
about $x = 0$, and a straight line through it would be flat.

::: example Example 6: X and |X| for a Laplace density
$X$ has density $f(x) = \frac12e^{-|x|}$, $-\infty < x < +\infty$. (1) Find $EX$ and $DX$.
(2) Find the covariance of $X$ and $|X|$; are they correlated? (3) Are they independent?
== (1) The mean ==
$xf(x)$ is odd, so $E(X) = \int_{-\infty}^{+\infty}x\cdot\frac12e^{-|x|}\,\d x = 0$.
== (1) The variance ==
$x^2f(x)$ is even, so
$$DX = EX^2 = \int_{-\infty}^{+\infty}x^2\frac12e^{-|x|}\,\d x = \int_0^{+\infty}x^2e^{-x}\,\d x = 2.$$
== (2) The covariance ==
Let $Y = |X|$. $x|x|f(x)$ is odd, so $E(XY) = \int_{-\infty}^{+\infty}x|x|\frac12e^{-|x|}\,\d x = 0$,
and $\operatorname{Cov}(X, Y) = E(XY) - E(X)E(Y) = 0$: uncorrelated.
== (3) Not independent ==
For any $\alpha > 0$, since $|X| \le \alpha$ implies $X \le \alpha$:
$$F(\alpha, \alpha) = P\{X \le \alpha,\ |X| \le \alpha\} = P\{|X| \le \alpha\},\qquad F_X(\alpha)F_Y(\alpha) = P\{X \le \alpha\}\,P\{|X| \le \alpha\}.$$
Here $P\{X \le \alpha\} = 1 - \frac12e^{-\alpha} < 1$ and $P\{|X| \le \alpha\} = 1 - e^{-\alpha} > 0$, so
the two differ: $X$ and $|X|$ are not independent.
:::

::: callout pitfall "Uncorrelated" is not "unrelated"
In Examples 5 and 6, $Y$ is completely determined by $X$, yet $\rho = 0$. Never conclude
independence from $\rho = 0$ or $E(XY) = EX\,EY$ — in-class question 21-014 asks exactly
which condition is **not** equivalent to $\operatorname{Cov}(X, Y) = 0$ (answer: independence).
:::

## The bivariate normal: uncorrelated means independent

There is one important family where the converse does hold. Recall the bivariate normal
$(X, Y) \sim N(\mu_1, \mu_2; \sigma_1^2, \sigma_2^2, \rho)$ (Lesson 3.3; the slides here separate
the means from the rest with a semicolon), whose marginals are $X \sim N(\mu_1, \sigma_1^2)$ and
$Y \sim N(\mu_2, \sigma_2^2)$. Lesson 3.3 promised that the parameter $\rho$ is the correlation
coefficient. Here is the proof.

::: example Example 7: the parameter ρ is the correlation coefficient
$(X, Y) \sim N(\mu_1, \mu_2; \sigma_1^2, \sigma_2^2, \rho)$. Find $\rho_{XY}$.
== What we know ==
From the marginals, $E(X) = \mu_1$, $E(Y) = \mu_2$, $D(X) = \sigma_1^2$, $D(Y) = \sigma_2^2$
(Lesson 4.3). So only the covariance is needed:
$$\operatorname{Cov}(X, Y) = \int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty}(x - \mu_1)(y - \mu_2)f(x, y)\,\d x\,\d y.$$
== Complete the square ==
As in Lesson 3.3, the exponent of $f(x, y)$ splits as
$$-\frac{(x-\mu_1)^2}{2\sigma_1^2} - \frac{1}{2(1-\rho^2)}\left[\frac{y-\mu_2}{\sigma_2} - \rho\frac{x-\mu_1}{\sigma_1}\right]^2.$$
== Substitute ==
Put $u = \dfrac{x-\mu_1}{\sigma_1}$ and $t = \dfrac{1}{\sqrt{1-\rho^2}}\left(\dfrac{y-\mu_2}{\sigma_2} - \rho u\right)$.
Then $x - \mu_1 = \sigma_1u$, $y - \mu_2 = \sigma_2\big(\sqrt{1-\rho^2}\,t + \rho u\big)$, the exponent is
$-\frac{u^2}{2} - \frac{t^2}{2}$, and $\d x\,\d y = \sigma_1\sigma_2\sqrt{1-\rho^2}\,\d u\,\d t$, which
cancels the constant in front of $f$ except for $\frac{1}{2\pi}$:
$$\operatorname{Cov}(X, Y) = \frac{1}{2\pi}\iint\left(\sigma_1\sigma_2\sqrt{1-\rho^2}\,tu + \rho\sigma_1\sigma_2u^2\right)e^{-\frac{u^2}{2} - \frac{t^2}{2}}\,\d t\,\d u.$$
== Split into products ==
$$\begin{aligned}\operatorname{Cov}(X, Y) &= \frac{\rho\sigma_1\sigma_2}{2\pi}\left(\int_{-\infty}^{+\infty}u^2e^{-\frac{u^2}{2}}\d u\right)\left(\int_{-\infty}^{+\infty}e^{-\frac{t^2}{2}}\d t\right)\\&\quad + \frac{\sigma_1\sigma_2\sqrt{1-\rho^2}}{2\pi}\left(\int_{-\infty}^{+\infty}ue^{-\frac{u^2}{2}}\d u\right)\left(\int_{-\infty}^{+\infty}te^{-\frac{t^2}{2}}\d t\right).\end{aligned}$$
== Evaluate ==
The last two integrals are 0 (odd integrands); $\int u^2e^{-u^2/2}\,\d u = \sqrt{2\pi}$ (Lesson 4.3,
the normal variance) and $\int e^{-t^2/2}\,\d t = \sqrt{2\pi}$. So
$$\operatorname{Cov}(X, Y) = \frac{\rho\sigma_1\sigma_2}{2\pi}\sqrt{2\pi}\cdot\sqrt{2\pi} = \rho\sigma_1\sigma_2, \qquad \rho_{XY} = \frac{\rho\sigma_1\sigma_2}{\sigma_1\sigma_2} = \rho.$$
:::

Combining this with Lesson 3.5 (a bivariate normal pair is independent exactly when
$\rho = 0$):

::: theorem Uncorrelated bivariate normal variables are independent | 二维正态分布：不相关与独立等价
If $(X, Y) \sim N(\mu_1, \mu_2; \sigma_1^2, \sigma_2^2, \rho)$, then $\rho_{XY} = \rho$, and
$$X, Y \text{ independent} \iff X, Y \text{ uncorrelated} \iff \rho = 0.$$
:::

So the five parameters of the bivariate normal are exactly its two means, two variances
and correlation coefficient. Slide $\rho$: the contours tilt along the line $y = \rho x$
(in standardised units) and squeeze towards it as $|\rho| \to 1$.

::: plot Bivariate normal contours (standardised) and the line y = ρx
x: -3 .. 3
y: -3 .. 3
region Outer: x^2 - 2 r x y + y^2 <= 4 (1 - r^2)
region Inner: x^2 - 2 r x y + y^2 <= 1 - r^2
f(x) = r x
slider r: -0.95 .. 0.95 = 0.6
:::

::: callout pitfall The pair must be jointly normal
"Uncorrelated ⇒ independent" needs $(X, Y)$ to be **bivariate** normal. Two variables that
are each normal are not enough: Example 5's $X$ is normal and still dependent on its
uncorrelated partner, and Lesson 3.3 shows a non-normal pair with normal marginals.
:::

::: callout exam What exams ask about covariance and correlation
Expect: $D(aX + bY)$ with a given $\rho$ or $E(XY)$ (the $2ab\operatorname{Cov}$ term); $\rho$ for a
joint table or a uniform region; the line $Y = a + bX$ from $\rho = \pm1$; "which is not
equivalent to $\operatorname{Cov} = 0$"; proving variables uncorrelated but dependent (find
one failure of the product rule); and bivariate normal questions where $\rho = 0$ unlocks
independence, so joint probabilities factor and conditional densities equal marginals
(in-class questions 21-019 to 21-021).
:::

## Moments

$EX$ and $DX$ are the first two of a whole family of numbers. Raise $X$ (or its deviation
from the mean) to the $k$-th power and take the expectation.

::: define Origin moment | 原点矩
If $E(X^k)$ exists ($k = 1, 2, \ldots$), it is called the **$k$-th origin moment** of $X$
(also simply the $k$-th moment, $k$ 阶矩).
:::

::: define Central moment | 中心矩
If $E\{[X - E(X)]^k\}$ exists ($k = 2, 3, \ldots$), it is called the **$k$-th central moment**
of $X$.
:::

So $EX$ is the first origin moment and $DX$ the second central moment, and the shortcut
$DX = EX^2 - (EX)^2$ writes the second central moment through the first two origin
moments. (The first central moment is always $E(X - EX) = 0$, which is why central moments
start at $k = 2$.) Higher moments describe shape: the third central moment is 0 for any
distribution symmetric about its mean. Moments return in Unit 7, where the method of
moments estimates parameters by matching them.

::: example Moments of U(0, 1) and N(0, 1)
(1) $X \sim U(0, 1)$: find its $k$-th origin moment and its second and third central
moments. (2) $X \sim N(0, 1)$: find $E(X^3)$ and $E(X^4)$.
== (1) Origin moments ==
$E(X^k) = \int_0^1x^k\,\d x = \dfrac{1}{k+1}$: $\frac12$, $\frac13$, $\frac14$, …
== (1) Central moments ==
$E(X) = \frac12$. The second central moment is $DX = \frac13 - \frac14 = \frac{1}{12}$ (matching
$\frac{(b-a)^2}{12}$). The third, $E(X - \frac12)^3 = \int_0^1(x - \frac12)^3\,\d x = 0$: the density is
symmetric about $\frac12$.
== (2) Normal moments ==
$E(X^3) = \int x^3\varphi(x)\,\d x = 0$ (odd integrand). By parts, as for the variance,
$$E(X^4) = \frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}x^3\cdot xe^{-\frac{x^2}{2}}\,\d x = \frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}3x^2e^{-\frac{x^2}{2}}\,\d x = 3E(X^2) = 3.$$
:::

The slide's title for this part is "§4.5 矩 协方差矩阵" (moments and the covariance matrix),
but the lecture defined only moments; the covariance matrix wasn't taught.

::: callout summary The lesson in five lines
$\operatorname{Cov}(X, Y) = E[(X - EX)(Y - EY)] = E(XY) - EX\,EY$, linear in each argument, and
$D(X \pm Y) = DX + DY \pm 2\operatorname{Cov}(X, Y)$. $\rho_{XY} = \operatorname{Cov}/(\sigma_X\sigma_Y)$ lies in
$[-1, 1]$, with $|\rho| = 1$ exactly for $Y = a + bX$. $\rho = 0 \iff \operatorname{Cov} = 0 \iff D(X \pm Y) = DX + DY \iff E(XY) = EX\,EY$.
Independent ⇒ uncorrelated, not conversely — except for the bivariate normal, where
$\rho_{XY} = \rho$ and uncorrelated ⇔ independent. Moments: $E(X^k)$ and $E(X - EX)^k$.
:::

::: cards Covariance and correlation
Definition of the covariance :: $\operatorname{Cov}(X, Y) = E\{[X - E(X)][Y - E(Y)]\}$.
Shortcut formula for the covariance :: $\operatorname{Cov}(X, Y) = E(XY) - E(X)E(Y)$.
Variance of $X \pm Y$ with covariance :: $D(X \pm Y) = DX + DY \pm 2\operatorname{Cov}(X, Y)$.
Covariance with a constant, and with itself :: $\operatorname{Cov}(X, a) = 0$, $\operatorname{Cov}(X, X) = DX$.
Covariance of linear functions $\operatorname{Cov}(aX + b, cY + d)$ :: $ac\operatorname{Cov}(X, Y)$.
Variance of $aX + bY$ in general :: $a^2DX + b^2DY + 2ab\operatorname{Cov}(X, Y)$.
Definition of the correlation coefficient :: $\rho_{XY} = \frac{\operatorname{Cov}(X, Y)}{\sqrt{DX}\sqrt{DY}}$ (standardised covariance, dimensionless).
Bounds on the correlation coefficient :: $|\rho_{XY}| \le 1$, i.e. $\operatorname{Cov}^2(X, Y) \le DX\,DY$; proved from $D(Y - tX) \ge 0$.
When is $|\rho| = 1$? :: Exactly when $P\{Y = a + bX\} = 1$, $b \ne 0$; $\rho = 1$ if $b > 0$, $-1$ if $b < 0$.
Four equivalent conditions for uncorrelated :: $\rho = 0$; $\operatorname{Cov}(X, Y) = 0$; $D(X \pm Y) = DX + DY$; $E(XY) = EX\,EY$.
Independent versus uncorrelated :: Independent ⇒ uncorrelated; uncorrelated does not imply independent.
Counterexamples: uncorrelated but dependent :: Uniform on the unit disc; $X \sim N(0,1)$ and $X^2$; Laplace $X$ and $|X|$.
Correlation in the bivariate normal :: $\rho_{XY} = \rho$, and independent ⇔ uncorrelated ⇔ $\rho = 0$.
Origin and central moments :: $k$-th origin moment $E(X^k)$; $k$-th central moment $E\{[X - E(X)]^k\}$.
:::

::: quiz Covariance and correlation
? (In-class question 20-041) Which formula is **wrong**?
- [ ] $D(X + Y) = DX + DY + 2\operatorname{Cov}(X, Y)$
- [ ] $\operatorname{Cov}(X, Y) = E(XY) - EX\cdot EY$
- [ ] $\operatorname{Cov}(X, Y) = \frac12[D(X + Y) - DX - DY]$
- [x] $D(2X - 3Y) = 4DX + 9DY - 6\operatorname{Cov}(X, Y)$
> $D(2X - 3Y) = 4DX + 9DY + 2\cdot2\cdot(-3)\operatorname{Cov}(X, Y) = 4DX + 9DY - 12\operatorname{Cov}(X, Y)$.
> The third formula is the first one rearranged.

? (In-class question 20-042) $X \sim N(2, 9)$, $Y \sim N(2, 1)$ and $E(XY) = 6$. Then $D(X - Y) =$
- [ ] 14
- [x] 6
- [ ] 12
- [ ] 4
> $\operatorname{Cov}(X, Y) = E(XY) - EX\,EY = 6 - 4 = 2$, so $D(X - Y) = 9 + 1 - 2\cdot2 = 6$.

? (In-class question 20-048) $DX = 1$, $DY = \frac14$ and $\rho_{XY} = \frac13$. Find $D(X - 3Y)$.
answer: 9/4
> $\operatorname{Cov}(X, Y) = \frac13\cdot1\cdot\frac12 = \frac16$. Then
> $D(X - 3Y) = DX + 9DY - 6\operatorname{Cov}(X, Y) = 1 + \frac94 - 1 = \frac94$.

? (Example 3, 20-053) $X \sim N(0, 1)$, $Y \sim N(1, 4)$ and $\rho_{XY} = 1$. Then
- [ ] $P\{Y = -2X - 1\} = 1$
- [ ] $P\{Y = 2X - 1\} = 1$
- [ ] $P\{Y = -2X + 1\} = 1$
- [x] $P\{Y = 2X + 1\} = 1$
> $\rho = 1$: $Y = a + bX$ with $b > 0$. $DY = b^2DX$ gives $b = 2$; $EY = a + b\,EX$ gives $a = 1$.

? (In-class question 20-054) There are constants $a \ne 0$ and $b$ with $P\{Y = aX + b\} = 1$, and $0 < DX < +\infty$. Then the correlation coefficient of $X$ and $Y$ satisfies
- [ ] $\rho = 1$
- [ ] $\rho = -1$
- [x] $|\rho| = 1$
- [ ] $|\rho| < 1$
> $\rho = \frac{a\,DX}{|a|DX} = \pm1$ with the sign of $a$, which isn't given. Only $|\rho| = 1$ is certain.

? (In-class question 21-014) $(X, Y)$ is a two-dimensional random vector. Which is **not** equivalent to $\operatorname{Cov}(X, Y) = 0$?
- [ ] $E(XY) = EX\cdot EY$
- [ ] $D(X + Y) = DX + DY$
- [ ] $D(X - Y) = DX + DY$
- [x] $X$ and $Y$ are independent
> The first three are the equivalent conditions for uncorrelatedness. Independence implies
> $\operatorname{Cov} = 0$ but is stronger (Examples 4–6).

? (In-class question 21-019) $(X, Y) \sim N(1, 1; 1, 1; -0.5)$. Then $D(X - Y) =$
- [ ] 0
- [ ] 1
- [ ] 2
- [x] 3
> $DX = DY = 1$ and $\operatorname{Cov}(X, Y) = \rho\sigma_1\sigma_2 = -0.5$, so
> $D(X - Y) = 1 + 1 - 2(-0.5) = 3$.

? (In-class question 21-020) $(X, Y)$ is bivariate normal and $X$, $Y$ are uncorrelated, with densities $f_X(x)$, $f_Y(y)$. The conditional density $f_{X|Y}(x|y)$ is
- [x] $f_X(x)$
- [ ] $f_Y(y)$
- [ ] $f_X(x)f_Y(y)$
- [ ] $\frac{f_X(x)}{f_Y(y)}$
> For a bivariate normal, uncorrelated means independent, so $f(x, y) = f_X(x)f_Y(y)$ and
> $f_{X|Y}(x|y) = \frac{f(x, y)}{f_Y(y)} = f_X(x)$.

? (In-class question 21-021) $(X, Y) \sim N(1, 0; 1, 1; 0)$. Find $P\{XY - Y < 0\}$.
answer: 1/2
> $\rho = 0$, so $X \sim N(1, 1)$ and $Y \sim N(0, 1)$ are independent. $XY - Y = Y(X - 1)$, where
> $X - 1 \sim N(0, 1)$ and $Y$ are independent and each positive or negative with probability
> $\frac12$. The product is negative when the signs differ: $\frac12\cdot\frac12 + \frac12\cdot\frac12 = \frac12$.

? $(X, Y)$ is uniform on the triangle with vertices $(0,0)$, $(1,0)$, $(0,2)$, where $E(XY) = \frac16$, $EX = \frac13$, $EY = \frac23$, $DX = \frac1{18}$, $DY = \frac29$. Find $\rho_{XY}$.
answer: -1/2
> $\operatorname{Cov} = \frac16 - \frac29 = -\frac1{18}$, and $\sqrt{DX\,DY} = \sqrt{\frac{1}{81}} = \frac19$, so $\rho = -\frac12$.

? $DX = 4$, $DY = 9$, $\operatorname{Cov}(X, Y) = 3$. Find $\operatorname{Cov}(2X + 1, 5 - Y)$.
answer: -6
> $\operatorname{Cov}(aX + b, cY + d) = ac\operatorname{Cov}(X, Y)$ with $a = 2$, $c = -1$: $-2\cdot3 = -6$.
> The constants 1 and 5 drop out.

? $X$ and $Y$ have $DX = DY = 2$ and $\rho_{XY} = 0.25$. Find $\operatorname{Cov}(X + Y, X - Y)$.
answer: 0
> Expand: $\operatorname{Cov}(X, X) - \operatorname{Cov}(X, Y) + \operatorname{Cov}(Y, X) - \operatorname{Cov}(Y, Y) = DX - DY = 0$.
> Whenever $DX = DY$, the sum and difference are uncorrelated, whatever $\rho$ is.

? $X$ has density $p(x) = \frac12e^{-|x|}$. Which is true of $X$ and $|X|$?
- [ ] They are independent
- [x] They are uncorrelated but not independent
- [ ] They are correlated and not independent
- [ ] $\rho = 1$, since $|X|$ is a function of $X$
> $E(X) = 0$ and $E(X|X|) = 0$ (odd integrands), so $\operatorname{Cov} = 0$. But
> $P\{X \le \alpha, |X| \le \alpha\} = P\{|X| \le \alpha\} \ne P\{X \le \alpha\}P\{|X| \le \alpha\}$ for $\alpha > 0$.
> $|\rho| = 1$ needs a **linear** function.

? $X \sim E(\beta)$ with $\beta = 2$. Find its second origin moment $E(X^2)$.
answer: 1/2
> $E(X^2) = DX + (EX)^2 = \frac{1}{\beta^2} + \frac{1}{\beta^2} = \frac{2}{\beta^2} = \frac12$.

? What is the name of $E\{[X - E(X)]^k\}$? (In English.)
text: k-th central moment | central moment | kth central moment | 中心矩 | k阶中心矩
> The $k$-th central moment; $E(X^k)$ is the $k$-th origin moment. The variance is the
> second central moment.
:::

---
title: Independence of random variables
zh: 随机变量的独立性
summary: When knowing one random variable tells you nothing about the other — the definition, its tests for tables and densities, the bivariate normal (independent exactly when ρ = 0), and n-dimensional random vectors.
source: 10条件分布与独立性6-2 (§3.3, part 2), 2026-10-07; 11独立性和函数的分布7-1 (review and examples), 2026-10-12
---

## What independence means for random variables

Two events are independent when $P(AB) = P(A)P(B)$ (Lesson 1.6): learning that one
happened doesn't change the chance of the other. Two *random variables* are independent
when that holds for **every** pair of events they can describe — "$X \le 3$" and
"$Y \le 0.5$", "$X = 1$" and "$Y = 4$", and so on. In the language of the last lesson:
every conditional distribution of $X$ given $Y$ is the same as the marginal of $X$.

Independence matters because it is the one case where the **marginals determine the
joint distribution**: multiply them. That is how most joint distributions in practice
are built (two machines, two people's arrival times, two dice), and it is what the
formulas for sums in the next lessons rely on.

## The definition

::: define Independent random variables | 随机变量相互独立
Let $F(x,y)$ be the distribution function of $(X,Y)$ and $F_X(x)$, $F_Y(y)$ its marginal
distribution functions. $X$ and $Y$ are **independent** if for **all** real $x, y$
$$P\{X \le x, Y \le y\} = P\{X \le x\}\,P\{Y \le y\}, \quad\text{that is}\quad F(x,y) = F_X(x)F_Y(y).$$
:::

"For all $x, y$" is the demanding part: one pair $(x, y)$ where it fails is enough to
make $X$ and $Y$ dependent.

In practice nobody checks distribution functions. For the two kinds of random vector
there are easier, equivalent tests:

::: theorem Tests for independence | 独立性的判别
(1) **Discrete.** If $P\{X = x_i, Y = y_j\} = p_{ij}$, then $X$ and $Y$ are independent
$\iff$ $p_{ij} = p_{i\cdot}\,p_{\cdot j}$ for **every** $i, j$: each cell of the table is
its row sum times its column sum.

(2) **Continuous.** If $(X,Y)$ has joint density $p(x,y)$ and marginal densities
$p_X(x)$, $p_Y(y)$, then $X$ and $Y$ are independent $\iff$ $p(x,y) = p_X(x)\,p_Y(y)$
(at every point, apart from a set of zero area that doesn't affect any probability).

(3) **Functions.** If $X$ and $Y$ are independent, so are $f(X)$ and $g(Y)$ for any
(continuous) functions $f, g$.
:::

::: formula Independence, discrete and continuous | 独立的充要条件
$$p_{ij} = p_{i\cdot}\,p_{\cdot j}\ \ \forall\, i,j \qquad\qquad p(x,y) = p_X(x)\,p_Y(y)$$
--
p_{ij} | joint probability $P\{X = x_i, Y = y_j\}$ |
p_{i\cdot},\ p_{\cdot j} | row and column sums (marginal laws) |
p(x,y) | joint density |
p_X(x),\ p_Y(y) | marginal densities |
:::

Point (3) is intuitive: $f(X)$ is decided by $X$ alone and $g(Y)$ by $Y$ alone, so if $X$
carries no information about $Y$, then $X^2$ or $e^X$ can't either.

::: callout tip Quick ways to spot dependence
- **Tables:** a zero cell whose row and column sums are both positive — then
  $p_{ij} = 0 \ne p_{i\cdot}p_{\cdot j}$, so they're dependent.
- **Densities:** if the region where $p(x,y) > 0$ isn't a rectangle (a triangle, a disc),
  they're dependent: knowing $x$ changes the possible values of $y$.
- **Formulas:** on a rectangle, independence holds exactly when $p(x,y)$ splits as
  (function of $x$) × (function of $y$). A term like $x + y$ or $1 + xy$ doesn't split.
:::

::: callout pitfall Independent is not "mutually exclusive", and one cell isn't enough
Checking $p_{11} = p_{1\cdot}p_{\cdot 1}$ for one cell proves nothing: it must hold in
**every** cell. On the other hand, in a 2 × 2 table, one cell *is* enough — once one cell
factors, the others follow because the rows and columns add up. In larger tables, check
them all (or use the shortcut in the α, β example below).
:::

## The bivariate normal: independent exactly when ρ = 0

The bivariate normal $N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$ and its density are
in Lesson 3.3. Its fifth parameter $\rho$ ($-1 < \rho < 1$) measures how strongly $X$ and
$Y$ move together; Chapter 4 will show it is their correlation coefficient
({{term correlation coefficient | 相关系数}}). Recall the two facts we need:
$$p(x,y) = \frac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}} \exp\left\{\frac{-1}{2(1-\rho^2)}\left[\frac{(x-\mu_1)^2}{\sigma_1^2} - \frac{2\rho(x-\mu_1)(y-\mu_2)}{\sigma_1\sigma_2} + \frac{(y-\mu_2)^2}{\sigma_2^2}\right]\right\},$$
and its marginals are normal: $X \sim N(\mu_1, \sigma_1^2)$, $Y \sim N(\mu_2, \sigma_2^2)$.

::: theorem Independence of a bivariate normal pair | 二维正态分布的独立性
If $(X,Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$, then $X$ and $Y$ are
independent $\iff \rho = 0$.
:::

::: example Why independence means ρ = 0
Prove the theorem by comparing $p(x,y)$ with $p_X(x)p_Y(y)$.
== Multiply the marginals ==
$$p_X(x)\,p_Y(y) = \frac{1}{\sqrt{2\pi}\sigma_1}e^{-\frac{(x-\mu_1)^2}{2\sigma_1^2}} \cdot \frac{1}{\sqrt{2\pi}\sigma_2}e^{-\frac{(y-\mu_2)^2}{2\sigma_2^2}} = \frac{1}{2\pi\sigma_1\sigma_2}\exp\left\{-\frac{(x-\mu_1)^2}{2\sigma_1^2} - \frac{(y-\mu_2)^2}{2\sigma_2^2}\right\}.$$
== If ρ = 0 ==
Put $\rho = 0$ in $p(x,y)$: $\sqrt{1-\rho^2} = 1$, the cross term vanishes, and $p(x,y)$
becomes exactly the product above. So $p = p_Xp_Y$: independent.
== If independent ==
Then $p(x,y) = p_X(x)p_Y(y)$ everywhere (both sides are continuous), in particular at
$(x,y) = (\mu_1, \mu_2)$, where every exponent is 0:
$$\frac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}} = \frac{1}{2\pi\sigma_1\sigma_2} \implies \sqrt{1-\rho^2} = 1 \implies \rho = 0.$$
(The slide states the equivalence; this step is the usual way to show the "⇒" half.)
:::

The lecture drew two conclusions:

1. If $(X,Y)$ is bivariate normal, its marginals are $N(\mu_1, \sigma_1^2)$ and
   $N(\mu_2, \sigma_2^2)$. **The converse is false**: $X \sim N(\mu_1, \sigma_1^2)$ and
   $Y \sim N(\mu_2, \sigma_2^2)$ do not make $(X,Y)$ bivariate normal.
2. If $(X,Y)$ is bivariate normal, then independent $\iff \rho = 0$.

::: callout note On the wording of slides 15-035 and 16-010
The slides restate conclusion 2 as "if $X \sim N(\mu_1,\sigma_1^2)$, $Y \sim N(\mu_2,\sigma_2^2)$
and $\rho = 0$, then $(X,Y) \sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,0)$". That is only
right when $(X,Y)$ is already known to be **jointly** normal — conclusion 1 just said
normal marginals don't guarantee that. What *is* always true: if $X$ and $Y$ are normal
**and independent**, then $(X,Y) \sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,0)$ (the
product of the marginals is that density).
:::

::: callout pitfall Normal marginals and ρ = 0 are not enough
Take $X \sim N(0,1)$ and an independent fair sign $S = \pm 1$, and let $Y = SX$. Then
$Y \sim N(0,1)$ too (flipping the sign of a symmetric variable changes nothing), and
$X$, $Y$ are uncorrelated. But $|Y| = |X|$ always, so they are as dependent as can be —
and $(X,Y)$ isn't bivariate normal (half the time $X + Y = 0$ exactly). "Uncorrelated ⇒
independent" needs **joint** normality.
:::

## Building a joint law from independent marginals

When $X$ and $Y$ are independent, the joint law is the product of the marginals: no
other information is needed.

::: example A joint table from two independent laws
$X$ and $Y$ are independent, $P\{X = 1\} = 0.3$, $P\{X = 3\} = 0.7$, and
$P\{Y = 2\} = 0.6$, $P\{Y = 4\} = 0.4$. Find the joint law of $(X,Y)$.
== Multiply ==
$P\{X = x_i, Y = y_j\} = P\{X = x_i\}P\{Y = y_j\}$:
$0.3 \times 0.6 = 0.18$, $0.3 \times 0.4 = 0.12$, $0.7 \times 0.6 = 0.42$, $0.7 \times 0.4 = 0.28$.
== The table ==
| $X \backslash Y$ | 2 | 4 |
| --- | --- | --- |
| 1 | 0.18 | 0.12 |
| 3 | 0.42 | 0.28 |

The cells add up to 1, and each row is proportional to $(0.6, 0.4)$.
:::

::: example Finding α and β from independence
$(X,Y)$ takes the values below. (1) What must $\alpha$ and $\beta$ satisfy? (2) If $X$ and
$Y$ are independent, find $\alpha$ and $\beta$.

| $(X,Y)$ | (1,1) | (1,2) | (1,3) | (2,1) | (2,2) | (2,3) |
| --- | --- | --- | --- | --- | --- | --- |
| $p_{ij}$ | $\frac16$ | $\frac19$ | $\frac1{18}$ | $\frac13$ | $\alpha$ | $\beta$ |

== Rewrite as a joint table ==
| $X \backslash Y$ | 1 | 2 | 3 | $p_{i\cdot}$ |
| --- | --- | --- | --- | --- |
| 1 | $\frac16$ | $\frac19$ | $\frac1{18}$ | $\frac13$ |
| 2 | $\frac13$ | $\alpha$ | $\beta$ | $\frac13 + \alpha + \beta$ |
| $p_{\cdot j}$ | $\frac12$ | $\frac19 + \alpha$ | $\frac1{18} + \beta$ | 1 |
== (1) A distribution law ==
$\alpha \ge 0$, $\beta \ge 0$, and the total is $\frac23 + \alpha + \beta = 1$, so
$\alpha + \beta = \frac13$.
== (2) Use a cell with only one unknown ==
Row 1 is fully known, so pick $p_{12} = p_{1\cdot}\,p_{\cdot 2}$:
$\frac19 = \frac13\left(\frac19 + \alpha\right) \Rightarrow \frac19 + \alpha = \frac13 \Rightarrow \alpha = \frac29$,
and then $\beta = \frac13 - \frac29 = \frac19$.
== Check every cell ==
Now $p_{2\cdot} = \frac23$ and the column sums are $\frac12, \frac13, \frac16$. Each cell is
row × column: $\frac13 \cdot \frac12 = \frac16$, $\frac13 \cdot \frac13 = \frac19$,
$\frac13 \cdot \frac16 = \frac1{18}$, $\frac23 \cdot \frac12 = \frac13$,
$\frac23 \cdot \frac13 = \frac29$, $\frac23 \cdot \frac16 = \frac19$. ✓
:::

::: example P{X = Y} for independent variables (slide 15-042)
$X$ and $Y$ are independent, $P\{X = 0\} = P\{Y = 0\} = \frac23$ and
$P\{X = 1\} = P\{Y = 1\} = \frac13$. Find $P\{X = Y\}$.
== Split by the common value ==
$P\{X = Y\} = P\{X = 0, Y = 0\} + P\{X = 1, Y = 1\} = \frac23 \cdot \frac23 + \frac13 \cdot \frac13 = \frac49 + \frac19 = \frac59.$
:::

## Continuous examples

### Two arrival times

::: example Arriving within five minutes of each other
A manager arrives at the office at a time uniformly distributed between 8 and 12 o'clock;
the secretary arrives uniformly between 7 and 9. The two times are independent. Find the
probability that they arrive within 5 minutes of each other.
== The densities ==
Let $X$ and $Y$ be the manager's and secretary's arrival times (in hours):
$f_X(x) = \frac14$ for $8 < x < 12$ and $f_Y(y) = \frac12$ for $7 < y < 9$ (0 otherwise).
== The joint density ==
By independence,
$f(x,y) = f_X(x)f_Y(y) = \frac18$ on the rectangle $8 < x < 12$, $7 < y < 9$, and 0 elsewhere.
== Turn the question into a region ==
5 minutes is $\frac1{12}$ hour, so we want $P\{|X - Y| \le \frac1{12}\} = \iint_G f\,\d x\,\d y = \frac18 \times (\text{area of } G)$,
where $G$ is the strip between the lines $y = x - \frac1{12}$ and $y = x + \frac1{12}$
inside the rectangle — a thin band near the corner $A = (8, 9)$.
== The area ==
The part of the rectangle above $y = x - \frac1{12}$ is a right triangle at $A$ with legs
$\frac{13}{12}$; the part above $y = x + \frac1{12}$ is one with legs $\frac{11}{12}$. Their difference:
$$\text{area}(G) = \frac12\left(\frac{13}{12}\right)^2 - \frac12\left(\frac{11}{12}\right)^2 = \frac{169 - 121}{288} = \frac16.$$
== Answer ==
$P\{|X - Y| \le \frac1{12}\} = \frac18 \cdot \frac16 = \frac1{48} \approx 0.021$.
:::

Widen the window and watch the strip grow. For any window of $t \le 1$ hours the same
argument gives area $\frac12(1+t)^2 - \frac12(1-t)^2 = 2t$, so the probability is $t/4$.

::: plot The rectangle and the strip |x − y| ≤ t
x: 7.5 .. 12.5
y: 6.5 .. 9.5
region R: 8 < x < 12, 7 < y < 9
region G: 8 < x < 12, 7 < y < 9, abs(x - y) <= t
f(x) = x
slider t: 0.02 .. 1 = 0.0833 | h
:::

::: explore Chance of arriving within t hours
slider t: 0 .. 1 = 0.0833 | h
m = 60 t | min | Window in minutes
P = t / 4 | | Probability of meeting within t
:::

### Uniform on the unit disc: not independent

::: example The unit disc
$(X,Y)$ is uniform on the disc $x^2 + y^2 \le 1$. Are $X$ and $Y$ independent?
== The joint density ==
The disc has area $\pi$, so $f(x,y) = \frac1\pi$ on it and 0 outside.
== The marginals ==
$f_X(x) = \int_{-\sqrt{1-x^2}}^{\sqrt{1-x^2}} \frac1\pi\,\d y = \frac2\pi\sqrt{1-x^2}$ for $-1 < x < 1$,
and by symmetry $f_Y(y) = \frac2\pi\sqrt{1-y^2}$ for $-1 < y < 1$.
== Compare ==
$f_X(x)f_Y(y) = \frac{4}{\pi^2}\sqrt{(1-x^2)(1-y^2)} \ne \frac1\pi = f(x,y)$. For example at
$(0.9, 0.9)$, outside the disc, $f = 0$ but $f_Xf_Y > 0$. So $X$ and $Y$ are **not
independent**: if $X$ is close to 1, $Y$ must be close to 0.
:::

::: plot The unit disc: a slice at X = c is shorter when |c| is larger
x: -1.3 .. 1.3
y: -1.3 .. 1.3
region D: x^2 + y^2 <= 1
region S: x^2 + y^2 <= 1, abs(x - c) < 0.02
slider c: -0.95 .. 0.95 = 0.6
:::

Compare with a uniform distribution on a **square** (the next quiz): there the slice at
$X = c$ is the same for every $c$, which is exactly independence.

## n-dimensional random vectors

Everything above extends from two variables to $n$.

::: define n-dimensional random vector | n 维随机向量
If $X_1 = X_1(e), \ldots, X_n = X_n(e)$ are random variables on the same sample space
$S = \{e\}$, then $(X_1, X_2, \ldots, X_n)$ is an **$n$-dimensional random vector** (or
$n$-dimensional random variable).
:::

- Its **distribution function** is
  $F(x_1, \ldots, x_n) = P\{X_1 \le x_1, X_2 \le x_2, \ldots, X_n \le x_n\}$ for all real
  $x_1, \ldots, x_n$.
- It has a **density** $f(x_1, \ldots, x_n) \ge 0$ if for all real $x_1, \ldots, x_n$
  $$F(x_1, \ldots, x_n) = \int_{-\infty}^{x_n} \cdots \int_{-\infty}^{x_1} f(t_1, \ldots, t_n)\,\d t_1 \cdots \d t_n.$$
- $X_1, \ldots, X_n$ are **mutually independent** if for all $x_1, \ldots, x_n$
  $$F(x_1, x_2, \ldots, x_n) = F_{X_1}(x_1)F_{X_2}(x_2)\cdots F_{X_n}(x_n).$$
  With densities: $f(x_1, \ldots, x_n) = f_{X_1}(x_1)\cdots f_{X_n}(x_n)$.

::: callout exam For the exam
Typical questions: "is $X$ independent of $Y$?" for a table (check every cell, or find
one that fails) or a density (support a rectangle? does it factor?); "find the unknowns
given independence" ($\alpha$, $\beta$; $a$, $b$); "which statement about the bivariate
normal is false?" (marginal variances, $\rho = 0$, normal marginals ⇏ joint normal); and
a probability for two independent uniforms by areas, like the arrival-time problem.
:::

## A conditional density on another triangle (slide 16-023)

The lecture's subjective question puts conditional densities (Lesson 3.4) and
independence side by side.

::: example Uniform on the triangle x − y = 0, x + y = 2, y = 0
$(X,Y)$ is uniform on the region $G$ bounded by $x - y = 0$, $x + y = 2$ and $y = 0$.
Find (1) the marginal density $f_X(x)$; (2) the conditional density $f_{X|Y}(x|y)$.
== The region and the density ==
$G$ is the triangle with corners $(0,0)$, $(2,0)$, $(1,1)$: base 2, height 1, area 1. So
$f(x,y) = 1$ on $G$ ($0 < y < x$ and $y < 2 - x$) and 0 elsewhere.
== (1) Marginal of X ==
For $0 < x < 1$, $y$ runs from 0 up to the line $y = x$: $f_X(x) = x$. For $1 \le x < 2$,
up to $y = 2 - x$: $f_X(x) = 2 - x$. Otherwise $f_X(x) = 0$.
== Marginal of Y ==
For $0 < y < 1$, $x$ runs from $y$ to $2 - y$: $f_Y(y) = 2 - 2y$; otherwise 0.
== (2) The conditional density ==
For $0 < y < 1$:
$$f_{X|Y}(x|y) = \frac{f(x,y)}{f_Y(y)} = \begin{cases} \dfrac{1}{2 - 2y}, & y < x < 2 - y, \\ 0, & \text{otherwise:} \end{cases}$$
given $Y = y$, $X$ is uniform on $(y, 2 - y)$.
== Independent? ==
No: the support is a triangle, and $f_{X|Y}$ depends on $y$.
:::

::: plot The triangle G and a slice Y = c
x: -0.2 .. 2.2
y: -0.2 .. 1.2
region G: 0 < y < x, y < 2 - x
region S: 0 < y < x, y < 2 - x, abs(y - c) < 0.012
f(x) = x
g(x) = 2 - x
slider c: 0.02 .. 0.98 = 0.5
:::

::: cards Independence of random variables
Definition: $X$, $Y$ independent :: $F(x,y) = F_X(x)F_Y(y)$ for **all** $x, y$
Discrete test :: $p_{ij} = p_{i\cdot}\,p_{\cdot j}$ for every $i, j$
Continuous test :: $p(x,y) = p_X(x)\,p_Y(y)$
Functions of independent variables :: $f(X)$ and $g(Y)$ are independent too
Bivariate normal and independence :: Independent $\iff \rho = 0$
Normal marginals ⇒ bivariate normal? :: No. (The converse holds: bivariate normal ⇒ normal marginals.)
Support not a rectangle :: $X$ and $Y$ are dependent
Uniform on the unit disc: $f_X(x)$ :: $\frac2\pi\sqrt{1-x^2}$, $-1 < x < 1$; $X$, $Y$ not independent
Uniform on a rectangle :: $X$ and $Y$ are independent uniforms
$n$ variables mutually independent :: $F(x_1, \ldots, x_n) = F_{X_1}(x_1)\cdots F_{X_n}(x_n)$ for all $x_i$
Arrival times: $P\{\vert X - Y\vert \le \frac1{12}\}$ :: $\frac18 \times \frac16 = \frac1{48}$
:::

::: quiz Check yourself
? (Slide 15-029) If $X$ and $Y$ are independent, the random variables $g(X)$ and $h(Y)$ given by continuous functions $g$, $h$ are …
- [ ] not necessarily independent
- [ ] certainly dependent
- [x] independent too
- [ ] independent in most cases
> $g(X)$ depends on $X$ alone and $h(Y)$ on $Y$ alone: $\{g(X) \le a\}$ and $\{h(Y) \le b\}$ are events about $X$ and about $Y$, which are independent. Rain Classroom answer: C.

? (Slide 15-030) $(X,Y)$ has $p_{00} = \frac16$, $p_{01} = b$, $p_{10} = a$, $p_{11} = \frac13$, and the events $\{X = 0\}$ and $\{X + Y = 1\}$ are independent. Then …
- [ ] $a = \frac16$, $b = \frac13$
- [ ] $a = \frac38$, $b = \frac18$
- [x] $a = \frac13$, $b = \frac16$
- [ ] $a = \frac15$, $b = \frac3{10}$
> The total gives $a + b = \frac12$. $P\{X = 0\} = \frac16 + b$, $P\{X + Y = 1\} = a + b = \frac12$, and $\{X = 0, X + Y = 1\} = \{X = 0, Y = 1\}$ has probability $b$. Independence: $b = \frac12(\frac16 + b)$, so $b = \frac16$, $a = \frac13$ (C).

? (Slide 15-036) $(X,Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$. Which statement is **false**?
- [ ] $X \sim N(\mu_1, \sigma_1^2)$
- [x] $X \sim N(\mu_1, \sigma_2^2)$
- [ ] If $\rho = 0$, then $X$ and $Y$ are independent
- [ ] If $S \sim N(\mu_1, \sigma_1^2)$ and $T \sim N(\mu_2, \sigma_2^2)$, $(S,T)$ need not be bivariate normal
> $X$'s variance is $\sigma_1^2$, not $\sigma_2^2$ (B is false). C is the theorem for a bivariate normal pair; D is true because normal marginals don't force joint normality.

? (Slide 15-042) $X$, $Y$ independent with $P\{X = 0\} = P\{Y = 0\} = \frac23$, $P\{X = 1\} = P\{Y = 1\} = \frac13$. Find $P\{X = Y\}$.
answer: 5/9
> $\frac23 \cdot \frac23 + \frac13 \cdot \frac13 = \frac49 + \frac19 = \frac59$ (B).

? (Slide 16-017) $(X,Y)$ is uniform on the square $-1 \le x \le 1$, $-1 \le y \le 1$. Which is correct?
- [ ] $(X,Y)$ lands in the first quadrant with probability $\frac12$
- [ ] Neither $X$ nor $Y$ is uniform
- [x] $X$ and $Y$ are independent
- [ ] $X$ and $Y$ are not independent
> The density is $\frac14 = \frac12 \cdot \frac12$ on the square, the product of two $U(-1,1)$ densities: independent, each uniform. The first quadrant is a quarter of the square: probability $\frac14$. Answer C.

? (Slide 16-018) For which density are $X$ and $Y$ independent?
- [ ] $x^2 + \frac{xy}{3}$ on $0 \le x \le 1$, $0 \le y \le 2$
- [ ] $1$ on $0 < x < 1$, $-x < y < x$
- [x] $\frac12 e^{-y}$ on $0 < x < 2$, $y > 0$
- [ ] $\frac{1 + xy}{4}$ on $|x| < 1$, $|y| < 1$
> C is $\frac12 \cdot e^{-y}$ on a rectangle: $X \sim U(0,2)$ and $Y \sim E(1)$, independent. A and D don't factor (the $xy$ terms; in D both marginals are $\frac12$, and $\frac14 \ne \frac{1+xy}{4}$); B lives on a triangle.

? Find $\alpha$ in the α–β example if $X$ and $Y$ are independent.
answer: 2/9
> $p_{12} = p_{1\cdot}p_{\cdot 2}$: $\frac19 = \frac13(\frac19 + \alpha)$, so $\alpha = \frac29$ (and $\beta = \frac19$).

? Manager and secretary as in the arrival example: what is the probability that they arrive within 15 minutes of each other?
answer: 1/16
> $t = \frac14$ h: the area of the strip is $\frac12(\frac54)^2 - \frac12(\frac34)^2 = \frac12$, times $\frac18$: $\frac1{16}$ (the rule $t/4$).

? (Slide 16-023) $(X,Y)$ is uniform on the triangle bounded by $x - y = 0$, $x + y = 2$, $y = 0$. Write $f_X(x)$ for $1 \le x < 2$.
expression: 2 - x
variables: x
> The triangle has area 1, so $f = 1$ on it; for $1 \le x < 2$, $y$ runs from 0 to $2 - x$: $f_X(x) = 2 - x$ (and $f_X(x) = x$ for $0 < x < 1$).

? Same triangle. Write $f_{X|Y}(x|y)$ for $0 < y < 1$ and $y < x < 2 - y$.
expression: 1/(2 - 2y)
variables: x, y
> $f_Y(y) = \int_y^{2-y} 1\,\d x = 2 - 2y$, so $f_{X|Y}(x|y) = \frac{1}{2-2y}$: $X$ is uniform on $(y, 2-y)$.

? $X$ and $Y$ are each $N(0,1)$ and uncorrelated ($\rho = 0$). Are they necessarily independent?
- [ ] Yes, always
- [x] Only if $(X,Y)$ is jointly (bivariate) normal
- [ ] Never
> $\rho = 0 \iff$ independence is a theorem about **bivariate** normal pairs. With $Y = SX$ ($S = \pm1$ a fair independent sign), both are $N(0,1)$ and uncorrelated, but $|X| = |Y|$.
:::

---
title: Conditional distributions
zh: 条件分布
summary: How one random variable is distributed once you know the value of the other — conditional distribution laws, conditional densities, and how joint, marginal and conditional distributions fit together.
source: 10条件分布与独立性6-2 (§3.3, part 1), 2026-10-07; recap in 11独立性和函数的分布7-1, 2026-10-12
---

## Why condition on a random variable?

A joint distribution (Lessons 3.1–3.3) describes two random variables at once. Often,
though, you learn one of them first: you see the first hit of a shooter, or a point's
$y$-coordinate, and then ask what that tells you about the other. The answer is a
**conditional distribution**: the distribution of $X$ *after* you have been told the
value of $Y$.

This is the conditional probability $P(A|B) = P(AB)/P(B)$ (Lesson 1.4), applied to
events like $\{X = x_i\}$ and $\{Y = y_j\}$. For discrete variables nothing new is needed.
For continuous variables $P\{Y = y\} = 0$, so we can't divide by it — the lecture fixes
that with a limit, and the result is just as simple: *joint density divided by marginal
density*.

Notation, as in the slides: $p_{ij} = P\{X = x_i, Y = y_j\}$, the row sums
$p_{i\cdot} = P\{X = x_i\}$ and the column sums $p_{\cdot j} = P\{Y = y_j\}$ (the slides
print the dot as $\bullet$); $p(x,y)$ is a joint density, $p_X(x)$ and $p_Y(y)$ its
marginal densities. Some examples write $\varphi$ or $f$ for the same things.

## Discrete conditional distributions

**Intuition.** Picture the joint table. Being told "$Y = y_j$" throws away every column
except column $j$. The numbers left in that column are still in the right *proportions*,
but they add up to $p_{\cdot j}$, not 1. Divide them by $p_{\cdot j}$ and they become a
proper distribution: that is the conditional law.

::: define Conditional distribution law | 条件分布律
Let $(X,Y)$ be a two-dimensional discrete random variable and fix $j$ with
$P\{Y = y_j\} > 0$. The **conditional distribution law of $X$ given $Y = y_j$** is
$$P\{X = x_i \mid Y = y_j\} = \frac{P\{X = x_i, Y = y_j\}}{P\{Y = y_j\}} = \frac{p_{ij}}{p_{\cdot j}}, \quad i = 1, 2, \ldots$$
Likewise, for fixed $i$ with $P\{X = x_i\} > 0$, the conditional law of $Y$ given
$X = x_i$ is $P\{Y = y_j \mid X = x_i\} = p_{ij}/p_{i\cdot}$, $j = 1, 2, \ldots$
:::

::: formula Discrete conditional law | 离散型条件分布律
$$P\{X = x_i \mid Y = y_j\} = \frac{p_{ij}}{p_{\cdot j}}, \qquad P\{Y = y_j \mid X = x_i\} = \frac{p_{ij}}{p_{i\cdot}}$$
--
p_{ij} | joint probability $P\{X = x_i, Y = y_j\}$ |
p_{i\cdot} | marginal of $X$: the sum of row $i$ |
p_{\cdot j} | marginal of $Y$: the sum of column $j$ |
:::

It really is a distribution: every term is $\ge 0$, and
$$\sum_{i} \frac{p_{ij}}{p_{\cdot j}} = \frac{1}{p_{\cdot j}} \sum_i p_{ij} = \frac{1}{p_{\cdot j}}\, p_{\cdot j} = 1.$$

Turn the definition around and you get the **multiplication formula**, the
random-variable version of $P(AB) = P(A)P(B|A)$:

::: formula Multiplication formula for distribution laws | 分布律的乘法公式
$$P\{X = x_i, Y = y_j\} = P\{X = x_i\}\,P\{Y = y_j \mid X = x_i\} = P\{Y = y_j\}\,P\{X = x_i \mid Y = y_j\}$$
--
P\{X = x_i\} | marginal probability of $X = x_i$ |
P\{Y = y_j \mid X = x_i\} | conditional probability of $Y = y_j$ given $X = x_i$ |
:::

::: example Conditioning in a joint table
$(X, Y)$ has the joint law below. Find the law of $X$ given $Y = 1$, and the law of $Y$
given $X = 1$.

| $X \backslash Y$ | 0 | 1 | 2 | $p_{i\cdot}$ |
| --- | --- | --- | --- | --- |
| 0 | 0.1 | 0.2 | 0.1 | 0.4 |
| 1 | 0.2 | 0.3 | 0.1 | 0.6 |
| $p_{\cdot j}$ | 0.3 | 0.5 | 0.2 | 1 |

== Given Y = 1: keep column 1 ==
$p_{\cdot 2} = P\{Y = 1\} = 0.2 + 0.3 = 0.5$, so
$P\{X = 0 \mid Y = 1\} = 0.2/0.5 = 0.4$ and $P\{X = 1 \mid Y = 1\} = 0.3/0.5 = 0.6$.
== Given X = 1: keep row 1 ==
$P\{X = 1\} = 0.6$, so $P\{Y = 0 \mid X = 1\} = 0.2/0.6 = 1/3$,
$P\{Y = 1 \mid X = 1\} = 0.3/0.6 = 1/2$, $P\{Y = 2 \mid X = 1\} = 0.1/0.6 = 1/6$.
== Check ==
Each conditional law adds up to 1: $0.4 + 0.6 = 1$ and $\frac13 + \frac12 + \frac16 = 1$.
:::

### The shooter who stops after two hits

::: example A shooter fires until hitting the target twice
Each shot hits with probability $p$ ($0 < p < 1$), independently, and shooting stops at
the second hit. Let $X$ be the number of the shot that gives the **first** hit and $Y$ the
**total** number of shots. Find the joint law of $X$ and $Y$, both marginals, and both
conditional laws.
== The joint law ==
$\{X = m, Y = n\}$ (with $m < n$) means: shots $1, \ldots, m-1$ miss, shot $m$ hits,
shots $m+1, \ldots, n-1$ miss, shot $n$ hits. That is 2 hits and $n-2$ misses in a fixed
pattern, so — whatever $m$ is —
$$P\{X = m, Y = n\} = p^2 (1-p)^{n-2}, \quad n = 2, 3, \ldots;\ m = 1, 2, \ldots, n-1.$$
== The marginal of X ==
Add over every $n > m$ (a geometric series with ratio $1-p$):
$$P\{X = m\} = \sum_{n=m+1}^{\infty} p^2(1-p)^{n-2} = p^2 \frac{(1-p)^{m-1}}{1 - (1-p)} = p(1-p)^{m-1}, \quad m = 1, 2, \ldots$$
That is the geometric law: of course, $X$ is just "the shot of the first hit".
== Y given X = m ==
$$P\{Y = n \mid X = m\} = \frac{p^2(1-p)^{n-2}}{p(1-p)^{m-1}} = p(1-p)^{n-m-1}, \quad n = m+1, m+2, \ldots$$
After the first hit the wait for the second starts afresh: $Y - m$ is again geometric.
== The marginal of Y ==
For fixed $n$ there are $n-1$ choices of $m$, all with the same probability:
$$P\{Y = n\} = \sum_{m=1}^{n-1} p^2(1-p)^{n-2} = (n-1)\,p^2(1-p)^{n-2}, \quad n = 2, 3, \ldots$$
== X given Y = n ==
$$P\{X = m \mid Y = n\} = \frac{p^2(1-p)^{n-2}}{(n-1)p^2(1-p)^{n-2}} = \frac{1}{n-1}, \quad m = 1, 2, \ldots, n-1.$$
Knowing the second hit came on shot $n$, the first hit is **equally likely** to be any
of the earlier $n-1$ shots: a uniform law.
:::

The two marginals look quite different. Move $p$ and watch: the geometric law of $X$
always peaks at 1, while $Y$ (at least 2 shots) peaks later when $p$ is small.

::: plot The shooter: marginal laws of X and Y
x: 0 .. 15
xlabel: number of shots
bars X(k) = p (1 - p)^(k - 1) max(0, min(1, k))
bars Y(k) = (k - 1) p^2 (1 - p)^(k - 2) max(0, min(1, k - 1))
slider p: 0.05 .. 0.9 = 0.3
:::

::: callout pitfall Numerator joint, denominator marginal
A conditional law is always *joint ÷ marginal of the variable you condition on*. Given
$X = m$, divide by $P\{X = m\}$ (a row sum); given $Y = n$, by $P\{Y = n\}$ (a column
sum). Dividing by the wrong marginal gives numbers that don't add up to 1 — a quick
check that catches the slip.
:::

## Continuous conditional distributions

### The conditional distribution function

For continuous $Y$, $P\{Y = y\} = 0$, so $P\{X \le x \mid Y = y\}$ can't be defined by
dividing. Instead, condition on $Y$ being in a thin band around $y$ and let the band
shrink:

::: define Conditional distribution function | 条件分布函数
Fix $y$ and suppose $P\{y - \Delta y < Y \le y + \Delta y\} > 0$ for every $\Delta y > 0$. If the limit
$$F_{X|Y}(x|y) = P\{X \le x \mid Y = y\} = \lim_{\Delta y \to 0^+} P\{X \le x \mid y - \Delta y < Y \le y + \Delta y\}$$
exists, it is called the **conditional distribution function of $X$ given $Y = y$**.
:::

Now work the limit out when $(X,Y)$ has a joint density $p(x,y)$. Write the conditional
probability with distribution functions; the terms with $F(-\infty, \cdot) = 0$ drop out:
$$F_{X|Y}(x|y) = \lim_{\Delta y \to 0^+} \frac{P\{X \le x,\ y - \Delta y < Y \le y + \Delta y\}}{P\{y - \Delta y < Y \le y + \Delta y\}} = \lim_{\Delta y \to 0^+} \frac{F(x, y+\Delta y) - F(x, y-\Delta y)}{F_Y(y+\Delta y) - F_Y(y-\Delta y)}.$$
Divide the top and the bottom by $2\Delta y$: both become difference quotients, which
tend to derivatives in $y$. Since
$F(x,y) = \int_{-\infty}^{y}\left[\int_{-\infty}^{x} p(u,v)\,\d u\right]\d v$, its
derivative in $y$ is $\int_{-\infty}^{x} p(u,y)\,\d u$, and $F_Y'(y) = p_Y(y)$. So
$$F_{X|Y}(x|y) = \frac{\partial F(x,y)/\partial y}{F_Y'(y)} = \int_{-\infty}^{x} \frac{p(u,y)}{p_Y(y)}\,\d u.$$

### The conditional density

Differentiate that in $x$ and the integral sign goes away:
$\dfrac{\d F_{X|Y}(x|y)}{\d x} = \dfrac{p(x,y)}{p_Y(y)}$.

::: define Conditional probability density | 条件概率密度
The **conditional density of $X$ given $Y = y$** is
$p_{X|Y}(x|y) = \dfrac{p(x,y)}{p_Y(y)}$, for $y$ with $p_Y(y) > 0$; the conditional
density of $Y$ given $X = x$ is $p_{Y|X}(y|x) = \dfrac{p(x,y)}{p_X(x)}$, for $p_X(x) > 0$.
:::

::: formula Conditional densities | 条件概率密度
$$p_{X|Y}(x|y) = \frac{p(x,y)}{p_Y(y)}\ \ (p_Y(y) > 0), \qquad p_{Y|X}(y|x) = \frac{p(x,y)}{p_X(x)}\ \ (p_X(x) > 0)$$
--
p(x,y) | joint density of $(X, Y)$ |
p_X(x),\ p_Y(y) | marginal densities |
p_{X\vert Y}(x\vert y) | density of $X$ once $Y = y$ is known: a function of $x$, with $y$ fixed |
:::

**Picture it.** Slice the surface $p(x,y)$ along the line $Y = y$. The slice has the
right *shape* for $X$'s new distribution, but its area is $p_Y(y)$, not 1. Dividing by
$p_Y(y)$ rescales it to area 1. So: the conditional density is the joint density's
slice, normalised.

::: callout key The one idea
Conditional = joint ÷ marginal of what you know. For tables it's $p_{ij}/p_{\cdot j}$; for
densities it's $p(x,y)/p_Y(y)$. In $p_{X|Y}(x|y)$, $y$ is a fixed number and $x$ is the
variable — so the "range" you write ("$|y| < x < 1$, 0 otherwise") is a range of $x$.
:::

## How joint, marginal and conditional fit together

The lecture summed it up in a diagram; here it is as a table.

| From | You can get | Why |
| --- | --- | --- |
| the joint distribution | the marginals ✔ | add (or integrate) out the other variable |
| the joint distribution | the conditionals ✔ | joint ÷ marginal |
| the marginals alone | the joint ✘ | many joint laws share the same marginals |
| a conditional alone | the joint ✘ | it says nothing about how likely each condition is |
| a marginal **and** the matching conditional | the joint ✔ | the multiplication formula: $p(x,y) = p_X(x)\,p_{Y\vert X}(y\vert x)$ |

The last line is how the "X then Y" example below builds a joint density from a story.

## Worked examples

### A uniform density on a triangle

::: example Conditional densities on a triangle
$(X,Y)$ has density $\varphi(x,y) = 1$ for $|y| < x$, $0 < x < 1$ (the triangle $D$ with
corners $(0,0)$, $(1,1)$, $(1,-1)$, of area 1), and 0 elsewhere. Find (1)
$\varphi_{Y|X}(y|x)$ and $\varphi_{X|Y}(x|y)$; (2) $P\{X > \frac12 \mid Y > 0\}$.
== Marginal of X ==
For $0 < x < 1$, the vertical line at $x$ crosses $D$ for $-x < y < x$:
$\varphi_X(x) = \int_{-x}^{x} 1\,\d y = 2x$ ($0 < x < 1$), and 0 otherwise.
== Y given X = x ==
For $0 < x < 1$ (here $x$ is a known number):
$$\varphi_{Y|X}(y|x) = \frac{\varphi(x,y)}{\varphi_X(x)} = \begin{cases} \dfrac{1}{2x}, & |y| < x, \\ 0, & \text{otherwise.} \end{cases}$$
Given $X = x$, $Y$ is uniform on $(-x, x)$.
== Marginal of Y ==
The horizontal line at $y$ crosses $D$ for $|y| < x < 1$. For $-1 < y \le 0$:
$\int_{-y}^{1} \d x = 1 + y$; for $0 < y < 1$: $\int_{y}^{1} \d x = 1 - y$. Together
$\varphi_Y(y) = 1 - |y|$ for $-1 < y < 1$, and 0 otherwise.
== X given Y = y ==
For $-1 < y < 1$:
$$\varphi_{X|Y}(x|y) = \frac{\varphi(x,y)}{1 - |y|} = \begin{cases} \dfrac{1}{1 - |y|}, & |y| < x < 1, \\ 0, & \text{otherwise.} \end{cases}$$
Given $Y = y$, $X$ is uniform on $(|y|, 1)$.
== The conditional probability ==
This one conditions on an *event* $\{Y > 0\}$, so use plain $P(AB)/P(B)$. With density 1,
probabilities are areas. $\{Y > 0\}$ is the upper half of $D$, area $\frac12$. Inside it,
the part with $x \le \frac12$ is a small triangle of area $\frac12 \cdot \frac12 \cdot \frac12 = \frac18$, so
$$P\{X > \tfrac12 \mid Y > 0\} = \frac{\frac12 - \frac18}{\frac12} = \frac34.$$
:::

The figure shows $D$, the part used in (2), and a thin band at height $Y = c$: given
$Y = c$, $X$ lives on that band, from $x = |c|$ to $1$. Move $c$ and watch the band
shrink as $|c|$ grows — that is why $\varphi_Y(y) = 1 - |y|$.

::: plot The triangle D, the event {X > 1/2, Y > 0}, and the slice Y = c
x: -0.2 .. 1.2
y: -1.1 .. 1.1
region D: abs(y) < x < 1
region A: 0 < y < x < 1, x > 0.5
region S: abs(y) < x < 1, abs(y - c) < 0.015
f(x) = x
g(x) = -x
slider c: -0.95 .. 0.95 = 0.4
:::

::: callout pitfall Forgetting where the density is zero
Writing "$\varphi_{X|Y}(x|y) = \frac{1}{1-|y|}$" without "for $|y| < x < 1$, 0
otherwise" is only half an answer — and exams mark it so. Always draw the region and
state (a) for which $y$ the conditional density exists ($\varphi_Y(y) > 0$) and (b) the
range of $x$ where it is non-zero.
:::

### X uniform on (0, 1), then Y uniform on (X, 1)

::: example Building a joint density from a story
A number $X$ is chosen at random in $(0,1)$; once $X = x$ is seen, a number $Y$ is chosen
at random in $(x, 1)$. Find the density $f_Y(y)$ of $Y$.
== What the story gives ==
$f_X(x) = 1$ on $(0,1)$, and for each $0 < x < 1$ the conditional density
$f_{Y|X}(y|x) = \dfrac{1}{1-x}$ for $x < y < 1$ (0 otherwise).
== The joint density ==
A marginal plus a conditional give the joint (the table above):
$$f(x,y) = f_{Y|X}(y|x)\,f_X(x) = \begin{cases} \dfrac{1}{1-x}, & 0 < x < y < 1, \\ 0, & \text{otherwise.} \end{cases}$$
== The marginal of Y ==
For $0 < y < 1$, $x$ runs from 0 to $y$:
$$f_Y(y) = \int_0^y \frac{\d x}{1-x} = -\ln(1-y), \quad 0 < y < 1,$$
and $f_Y(y) = 0$ otherwise.
== Sanity check ==
$\int_0^1 -\ln(1-y)\,\d y = 1$, as it must. The density grows towards $y = 1$: $Y$ is
pushed to the right twice, so it is usually large.
:::

::: plot The density of Y: f_Y(y) = −ln(1 − y)
x: 0 .. 0.99
xlabel: y
f(y) = -ln(1 - y)
:::

::: callout exam For the exam
Expect: a uniform density on a triangle or other region, then "find the marginal and
the conditional density" (draw the region, integrate along lines, keep the ranges), and
sometimes a conditional probability like $P\{X > \frac12 \mid Y > 0\}$ (use areas). The
reverse task — a marginal plus a conditional, find the joint and the other marginal —
is the "$X$ then $Y$" story above.
:::

::: cards Conditional distributions
Discrete conditional law of $X$ given $Y = y_j$ :: $P\{X = x_i \mid Y = y_j\} = p_{ij}/p_{\cdot j}$, column $j$ divided by its sum
Multiplication formula (random variables) :: $P\{X = x_i, Y = y_j\} = P\{X = x_i\}P\{Y = y_j \mid X = x_i\}$
Conditional distribution function $F_{X\vert Y}(x\vert y)$ :: $\lim_{\Delta y \to 0^+} P\{X \le x \mid y - \Delta y < Y \le y + \Delta y\} = \int_{-\infty}^x \frac{p(u,y)}{p_Y(y)}\,\d u$
Conditional density $p_{X\vert Y}(x\vert y)$ :: $p(x,y)/p_Y(y)$, where $p_Y(y) > 0$
Conditional density $p_{Y\vert X}(y\vert x)$ :: $p(x,y)/p_X(x)$, where $p_X(x) > 0$
What determines the joint distribution? :: A marginal together with the matching conditional; neither marginals alone nor a conditional alone
Shooter until 2 hits: $P\{X = m, Y = n\}$ :: $p^2(1-p)^{n-2}$, $1 \le m < n$
Shooter: law of $X$ given $Y = n$ :: Uniform: $1/(n-1)$ for $m = 1, \ldots, n-1$
Shooter: law of $Y$ given $X = m$ :: $p(1-p)^{n-m-1}$, $n > m$ (geometric again)
Triangle $\vert y\vert < x < 1$: $\varphi_{X\vert Y}(x\vert y)$ :: $\frac{1}{1-\vert y\vert}$ for $\vert y\vert < x < 1$ (uniform on $(\vert y\vert, 1)$)
$X \sim U(0,1)$, then $Y \sim U(X,1)$: $f_Y(y)$ :: $-\ln(1-y)$ for $0 < y < 1$
:::

::: quiz Check yourself
? In the first example's joint table ($p_{00} = 0.1$, $p_{01} = 0.2$, $p_{02} = 0.1$, $p_{10} = 0.2$, $p_{11} = 0.3$, $p_{12} = 0.1$), find $P\{Y = 2 \mid X = 0\}$.
answer: 1/4
> Row $X = 0$ adds up to $0.4$, so $P\{Y = 2 \mid X = 0\} = 0.1/0.4 = 1/4$.

? The shooter hits with $p = 0.4$. Find $P\{X = 2, Y = 5\}$.
answer: 0.4^2 * 0.6^3
> Any pattern with exactly the second and fifth shots hitting: $p^2(1-p)^{3} = 0.16 \times 0.216 = 0.03456$.

? The second hit came on shot 6. What is the probability that the first hit was on shot 2?
answer: 1/5
> $P\{X = m \mid Y = n\} = \frac{1}{n-1}$, so with $n = 6$ it is $\frac15$ for each $m = 1, \ldots, 5$ — whatever $p$ is.

? (Slide 15-021) For the triangle density $\varphi(x,y) = 1$ on $|y| < x < 1$, which is $\varphi_{X|Y}(x|y)$ for $-1 < y < 1$?
- [x] $\frac{1}{1-|y|}$ for $|y| < x < 1$, and 0 otherwise
- [ ] $\frac{1}{2x}$ for $|y| < x$, and 0 otherwise
- [ ] $1 - |y|$ for $-1 < y < 1$
- [ ] $\frac{1}{1-|y|}$ for $0 < x < 1$, and 0 otherwise
> $\varphi_Y(y) = \int_{|y|}^{1} 1\,\d x = 1 - |y|$, so $\varphi_{X|Y}(x|y) = \varphi(x,y)/\varphi_Y(y) = \frac{1}{1-|y|}$ where $\varphi(x,y) = 1$, i.e. for $|y| < x < 1$. $\frac{1}{2x}$ is the *other* conditional density, $1-|y|$ is the marginal, and the range $0 < x < 1$ is too wide.

? Same triangle. Find $P\{X > \frac34 \mid Y = \frac12\}$.
answer: 1/2
> Given $Y = \frac12$, $X$ is uniform on $(\frac12, 1)$ with density $\frac{1}{1 - 1/2} = 2$: $\int_{3/4}^{1} 2\,\d x = \frac12$.

? Same triangle. For $0 < x < 1$, find $P\{Y > 0 \mid X = x\}$.
answer: 1/2
> Given $X = x$, $Y$ is uniform on $(-x, x)$: half of it is above 0.

? $X \sim U(0,1)$ and, given $X = x$, $Y \sim U(x, 1)$. Write $f_Y(y)$ for $0 < y < 1$.
expression: -ln(1 - y)
variables: y
> $f(x,y) = \frac{1}{1-x}$ on $0 < x < y < 1$, so $f_Y(y) = \int_0^y \frac{\d x}{1-x} = -\ln(1-y)$.

? In the same story, find $P\{Y > \frac12\}$.
answer: 1/2 + ln(2)/2
> $\int_{1/2}^{1} -\ln(1-y)\,\d y = \int_0^{1/2} -\ln u\,\d u = [u - u\ln u]_0^{1/2} = \frac12 + \frac12\ln 2 \approx 0.847$.

? $(X,Y)$ has joint density $f(x,y) = 2$ on $0 < x < y < 1$. What is $f_{X|Y}(x|y)$ for $0 < y < 1$?
- [x] $\frac1y$ for $0 < x < y$
- [ ] $\frac{1}{1-x}$ for $x < y < 1$
- [ ] $2y$ for $0 < x < y$
> $f_Y(y) = \int_0^y 2\,\d x = 2y$, so $f_{X|Y}(x|y) = \frac{2}{2y} = \frac1y$ for $0 < x < y$: given $Y = y$, $X$ is uniform on $(0, y)$.

? Which of these is enough to find the joint distribution of $(X, Y)$?
- [ ] The two marginal distributions
- [ ] The conditional distribution of $Y$ given $X$
- [x] The marginal of $X$ and the conditional distribution of $Y$ given $X$
> Joint = marginal × conditional (multiplication formula). Marginals alone or a conditional alone don't fix the joint.
:::

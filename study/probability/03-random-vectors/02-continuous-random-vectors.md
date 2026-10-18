---
title: Continuous random vectors
zh: 二维连续型随机变量
summary: The joint density p(x, y) — its properties, probabilities of regions as double integrals, ∂²F/∂x∂y = p, marginal densities — and the standard worked examples, each with its region of integration drawn.
source: 8二维随机变量4-2 (2026-09-23) and 9二维连续型随机变量5-1 (2026-09-28)
---

When $X$ and $Y$ can take any value in an interval, no single point has positive
probability, so a joint table is useless. Instead, as in one dimension (Lesson 2.3),
probability is spread out with a **density**, now over the plane. Every question then
becomes a double integral, and almost every mistake is a wrong limit of integration.
This lesson is about getting those limits right: draw the region where the density is
positive, draw the region you're asked about, and integrate over where they overlap.

## The joint density

Think of probability as one kilogram of sand poured onto the plane. Where the pile is
high, the random point is likely to land; where there's no sand, it never lands. The
height of the pile at $(x,y)$ is the **density** $p(x,y)$, and the probability of a
region is the amount of sand over it — a volume.

::: define Joint probability density | 联合概率密度
$(X,Y)$ is a **two-dimensional continuous random variable** ({{zh 二维连续型随机变量}}) if
there is a non-negative function $p(x,y)$ such that, for all $x,y$,
$$F(x,y)=\int_{-\infty}^{x}\int_{-\infty}^{y}p(u,v)\,\d v\,\d u .$$
$p(x,y)$ is the **probability density** of $(X,Y)$, or the **joint probability density** of
$X$ and $Y$. (The slides write $p(x,y)$; some slides and books write $f(x,y)$: same thing.)
:::

Compare one dimension: $F(x)=\int_{-\infty}^{x}p(t)\,\d t$ with $p\ge0$ and
$\int_{-\infty}^{+\infty}p=1$. In two dimensions the integral runs over the quadrant left
of $x$ and below $y$ — exactly the event $\{X\le x,Y\le y\}$ of Lesson 3.1.

::: theorem Properties of a joint density | 联合概率密度的性质
1. $p(x,y)\ge0$.
2. $\displaystyle\int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty}p(x,y)\,\d x\,\d y=F(+\infty,+\infty)=1$.
3. For a region $G$ of the plane, $P\{(X,Y)\in G\}=\displaystyle\iint_G p(x,y)\,\d x\,\d y$.
4. Where $p(x,y)$ is continuous, $\dfrac{\partial^2F(x,y)}{\partial x\,\partial y}=p(x,y)$.
:::

Geometrically, $z=p(x,y)$ is a surface above the $xoy$ plane. Property 2 says the solid
between the surface and the plane has volume 1; property 3 says $P\{(X,Y)\in G\}$ is the
volume of the column with base $G$ and the surface as its roof. Properties 1 and 2 are
also what you use to **check** that a function is a density, or to find a constant in it.

::: formula Probability of a region | 区域上的概率
$$P\{(X,Y)\in G\}=\iint_G p(x,y)\,\d x\,\d y$$
--
G | any region of the plane (a half-plane $y\le x$, a triangle, …) |
p(x,y) | the joint density: zero outside its support |
:::

::: formula Density from the distribution function | 由分布函数求密度
$$p(x,y)=\frac{\partial^2F(x,y)}{\partial x\,\partial y}\qquad\text{where } p \text{ is continuous}$$
--
F(x,y) | joint distribution function |
:::

::: callout pitfall Integrate only where the density is positive
A density is usually given as "a formula on a region $D$, 0 elsewhere". Then
$\iint_G p=\iint_{G\cap D}(\text{formula})$. Integrating the formula over all of $G$ — as if
it held everywhere — is the classic mistake (in-class question 14-025 in the quiz). The
region $D$ where $p>0$ is the **support**; draw it first, every time.
:::

::: example Finding the constant: kxy on the unit square
$p(x,y)=kxy$ for $0\le x\le1,\ 0\le y\le1$, and 0 elsewhere. Find $k$.
== Total probability 1 ==
$\displaystyle\int_0^1\!\!\int_0^1 kxy\,\d x\,\d y=k\int_0^1x\,\d x\int_0^1y\,\d y=k\cdot\tfrac12\cdot\tfrac12=\tfrac k4=1$.
== Answer ==
$k=4$, so $p(x,y)=4xy$ on the unit square. ($k\ge0$ also makes $p\ge0$. ✓)
:::

## The distribution function by cases

To find $F(x,y)$ from $p$, integrate $p$ over the quadrant at $(x,y)$. The quadrant
overlaps the support differently depending on where the corner is, so $F$ comes in
cases. Move the corner $(a,b)$ around the unit square of $p=4xy$ and see which part of
the square the quadrant covers:

::: plot The quadrant at (a, b) meets the support of 4xy in a rectangle
x: -0.5 .. 1.5
y: -0.5 .. 1.5
region D: 0 <= x <= 1, 0 <= y <= 1
region Q: x <= a, y <= b, 0 <= x <= 1, 0 <= y <= 1
slider a: -0.4 .. 1.4 = 0.6
slider b: -0.4 .. 1.4 = 0.8
:::

::: example F(x, y) for p = 4xy
Find the joint distribution function of $p(x,y)=4xy$ on $[0,1]^2$ (0 elsewhere).
== Corner left of or below the square ==
If $x\le0$ or $y\le0$, the quadrant misses the square: $F(x,y)=0$.
== Corner inside ==
For $0<x<1,\ 0<y<1$: $F=\int_0^y\int_0^x4uv\,\d u\,\d v=x^2y^2$.
== Corner above or to the right ==
For $0<x<1,\ y\ge1$ the quadrant covers $[0,x]\times[0,1]$: $F=\int_0^1\int_0^x4uv\,\d u\,\d v=x^2$.
For $x\ge1,\ 0<y<1$: $F=y^2$. For $x\ge1,\ y\ge1$: $F=1$.
== Answer ==
$$F(x,y)=\begin{cases}0,&x\le0\text{ or }y\le0\\x^2y^2,&0<x<1,\ 0<y<1\\x^2,&0<x<1,\ y\ge1\\y^2,&x\ge1,\ 0<y<1\\1,&x\ge1,\ y\ge1\end{cases}$$
Check with property 4: $\partial^2(x^2y^2)/\partial x\partial y=4xy$. ✓
:::

## Marginal densities

For one variable on its own, "add up everything in a row" from the discrete case
becomes "integrate along a line". From $F_X(x)=F(x,+\infty)$:
$$F_X(x)=\int_{-\infty}^{x}\Big[\int_{-\infty}^{+\infty}p(u,y)\,\d y\Big]\d u ,$$
so $X$ is continuous, and its density is the inner integral.

::: define Marginal probability density | 边缘概率密度
The **marginal density** of $X$ is $p_X(x)=\int_{-\infty}^{+\infty}p(x,y)\,\d y$, and that of
$Y$ is $p_Y(y)=\int_{-\infty}^{+\infty}p(x,y)\,\d x$: the densities of $X$ and $Y$ on their
own, obtained by integrating the other variable out.
:::

::: formula Marginal densities | 边缘概率密度
$$p_X(x)=\int_{-\infty}^{+\infty}p(x,y)\,\d y,\qquad p_Y(y)=\int_{-\infty}^{+\infty}p(x,y)\,\d x$$
--
p_X(x) | density of $X$ alone: integrate along the vertical line at $x$ |
p_Y(y) | density of $Y$ alone: integrate along the horizontal line at $y$ |
:::

::: callout key The recipe for every marginal
To find $p_X(x)$: fix $x$, draw the **vertical line** through it, and see where it crosses
the support. The $y$-limits are where the line enters and leaves. Values of $x$ whose line
misses the support get $p_X(x)=0$ — write that case down too. For $p_Y(y)$ use a
**horizontal** line, and read off $x$-limits.
:::

::: example Marginals of p = 4xy, and P{Y ≤ X}
With $p(x,y)=4xy$ on $[0,1]^2$, find $p_X$, $p_Y$ and $P\{Y\le X\}$.
== p_X ==
For $0<x<1$ the vertical line crosses the square for $0\le y\le1$:
$p_X(x)=\int_0^14xy\,\d y=2x$. Otherwise $p_X(x)=0$.
== p_Y ==
By the same steps, $p_Y(y)=\int_0^14xy\,\d x=2y$ for $0<y<1$, else 0.
== P{Y ≤ X} ==
The part of the square below $y=x$ is the triangle $0\le y\le x\le1$:
$\displaystyle P\{Y\le X\}=\int_0^1\Big(\int_0^x4xy\,\d y\Big)\d x=\int_0^12x^3\,\d x=\tfrac12$.
:::

## Worked examples

The rest of the lecture is practice: the same three moves — draw the support, draw the
event, set the limits — on harder regions.

### An exponential pair

::: example 2e^(−(2x+y)) on the first quadrant
$(X,Y)$ has $f(x,y)=2e^{-(2x+y)}$ for $x>0,\ y>0$ and 0 elsewhere. Find (1) $F(x,y)$;
(2) $P\{Y\le X\}$.
== (1) Corner in the first quadrant ==
The quadrant at $(x,y)$ meets the support in the rectangle $0<u\le x,\ 0<v\le y$:
$$F(x,y)=\int_0^y\!\!\int_0^x2e^{-(2u+v)}\,\d u\,\d v=\int_0^x2e^{-2u}\,\d u\cdot\int_0^ye^{-v}\,\d v=(1-e^{-2x})(1-e^{-y}).$$
== (1) Corner anywhere else ==
If $x\le0$ or $y\le0$ the quadrant doesn't reach the first quadrant at all, so $F=0$:
$$F(x,y)=\begin{cases}(1-e^{-2x})(1-e^{-y}),&x>0,\ y>0\\0,&\text{otherwise.}\end{cases}$$
== (2) The region ==
$\{Y\le X\}$ inside the support is the wedge $0<y\le x$ (figure below). For each $x>0$,
$y$ runs from 0 to $x$:
$$P\{Y\le X\}=2\int_0^{+\infty}e^{-2x}\Big(\int_0^xe^{-y}\,\d y\Big)\d x=2\int_0^{+\infty}(e^{-2x}-e^{-3x})\,\d x=2\Big(\tfrac12-\tfrac13\Big)=\tfrac13.$$
:::

::: plot Support of 2e^(−(2x+y)) (light) and the wedge 0 < y ≤ x (dark)
x: 0 .. 4
y: 0 .. 4
region D: x > 0, y > 0
region W: 0 < y <= x
f(x) = x
:::

Replace $y\le x$ by $y\le ax$ and the same integral gives
$P\{Y\le aX\}=2\int_0^\infty e^{-2x}(1-e^{-ax})\,\d x=1-\tfrac{2}{2+a}=\tfrac{a}{2+a}$.
Try it: $a=1$ is the $\tfrac13$ above.

::: explore P{Y ≤ aX} for the density 2e^(−(2x+y))
slider a: 0 .. 10 = 1
P = a / (2 + a) | | P{Y ≤ aX}
:::

### A region cut by a line

::: example P{X + Y ≥ 1} for x² + xy/3
$f(x,y)=x^2+\tfrac13xy$ for $0\le x\le1,\ 0\le y\le2$ (0 elsewhere). Find $P\{X+Y\ge1\}$.
== Check it is a density ==
$\int_0^1\int_0^2(x^2+\tfrac13xy)\,\d y\,\d x=\int_0^1(2x^2+\tfrac23x)\,\d x=\tfrac23+\tfrac13=1$. ✓
== Use the complement ==
$\{X+Y\ge1\}$ covers most of the rectangle, an awkward shape; its complement
$\{X+Y<1\}$ is the small triangle $0\le x\le1,\ 0\le y<1-x$:
$$P\{X+Y<1\}=\int_0^1\!\!\int_0^{1-x}\Big(x^2+\tfrac13xy\Big)\d y\,\d x=\int_0^1\Big[x^2(1-x)+\tfrac16x(1-x)^2\Big]\d x=\tfrac1{12}+\tfrac1{72}=\tfrac7{72}.$$
== Answer ==
$P\{X+Y\ge1\}=1-\tfrac7{72}=\tfrac{65}{72}$.
:::

::: plot The support (light) and the event x + y ≥ 1 (dark)
x: 0 .. 1.5
y: 0 .. 2.2
region D: 0 <= x <= 1, 0 <= y <= 2
region E: 0 <= x <= 1, 0 <= y <= 2, x + y >= 1
f(x) = 1 - x
:::

::: callout tip When the region is awkward, integrate its complement
$P(A)=1-P(\overline A)$ works for regions too. If the event needs two or three pieces of
integral and its complement only one, compute the complement.
:::

### A triangular support

::: example cy(2 − x) on the triangle 0 ≤ y ≤ x ≤ 1
$p(x,y)=cy(2-x)$ for $0\le x\le1,\ 0\le y\le x$, and 0 elsewhere. Find (1) $c$;
(2) $p_X(x)$ and $p_Y(y)$.
== (1) The constant ==
For each $x\in[0,1]$, $y$ runs from 0 to $x$:
$$1=\int_0^1\!\!\int_0^xcy(2-x)\,\d y\,\d x=\frac c2\int_0^1(2x^2-x^3)\,\d x=\frac c2\Big(\frac23-\frac14\Big)=\frac{5c}{24},$$
so $c=\dfrac{24}{5}$.
== (2) p_X: vertical lines ==
For $0\le x\le1$ the vertical line meets the triangle from $y=0$ up to $y=x$:
$$p_X(x)=\int_0^x\frac{24}5y(2-x)\,\d y=\frac{12}{5}x^2(2-x),\quad0\le x\le1;\qquad p_X(x)=0\text{ otherwise.}$$
== (2) p_Y: horizontal lines ==
For $0<y\le1$ the horizontal line meets the triangle from the diagonal $x=y$ to the side $x=1$:
$$p_Y(y)=\int_y^1\frac{24}5y(2-x)\,\d x=\frac{24}5y\Big(\frac32-2y+\frac{y^2}2\Big),\quad0<y\le1;\qquad p_Y(y)=0\text{ otherwise.}$$
:::

Slide the vertical line across the triangle: its piece inside always runs from the
$x$-axis up to the diagonal.

::: plot The triangle 0 ≤ y ≤ x ≤ 1 and the vertical line at x = a
x: 0 .. 1.2
y: 0 .. 1.2
region T: 0 <= y <= x <= 1
region L: a - 0.01 < x < a + 0.01, 0 <= y <= x <= 1
f(x) = x
slider a: 0.05 .. 0.95 = 0.6
:::

::: plot The two marginals: p_X(x) = (12/5)x²(2 − x) and p_Y(y) = (24/5)y(3/2 − 2y + y²/2), on 0 to 1
x: 0 .. 1
xlabel: x (for p_X) or y (for p_Y)
pX(x) = 12/5 x^2 (2 - x)
pY(x) = 24/5 x (3/2 - 2 x + x^2/2)
:::

$X$ is pushed towards 1 and $Y$ towards 0 — just as the triangle is wide near $x=1$ and
the factor $y$ grows upwards while $2-x$ shrinks to the right.

::: callout pitfall A support with a slanted edge changes the limits
On a triangle the inner limits depend on the outer variable ($0\le y\le x$), and the
marginals take different limits ($y$ from 0 to $x$, but $x$ from $y$ to 1). Writing
$\int_0^1$ for both — as if the support were a square — is wrong.
:::

### Under a hyperbola

::: example Density 1/2 under y = 1/x, for 1 ≤ x ≤ e²
$D$ is the region under $y=\tfrac1x$, above the $x$-axis, between $x=1$ and $x=e^2$, and
$p(x,y)=\tfrac12$ on $D$ (0 elsewhere). Find (1) $p_X$ and $p_Y$; (2) $P\{X+Y\le2\}$.
== A density? ==
Area of $D=\int_1^{e^2}\tfrac1x\,\d x=\ln e^2=2$, and $\tfrac12\cdot2=1$. ✓
== (1) p_X ==
For $1<x<e^2$, $y$ runs from 0 to $1/x$: $p_X(x)=\int_0^{1/x}\tfrac12\,\d y=\dfrac1{2x}$; 0 otherwise.
== (1) p_Y, in two pieces ==
A horizontal line at height $y$ starts at $x=1$ and stops at whichever comes first, the
curve ($x=1/y$) or the edge $x=e^2$. For $0<y\le e^{-2}$ the curve is beyond $e^2$, so
$p_Y(y)=\int_1^{e^2}\tfrac12\,\d x=\tfrac12(e^2-1)$. For $e^{-2}<y\le1$,
$p_Y(y)=\int_1^{1/y}\tfrac12\,\d x=\tfrac12\big(\tfrac1y-1\big)$. Otherwise 0.
== (2) The event ==
The line $x+y=2$ touches $y=1/x$ at $(1,1)$ and lies below it elsewhere
($x(2-x)\le1$ because $(x-1)^2\ge0$). So $\{X+Y\le2\}\cap D$ is the triangle
$1\le x\le2,\ 0\le y\le2-x$:
$$P\{X+Y\le2\}=\int_1^2\!\!\int_0^{2-x}\tfrac12\,\d y\,\d x=\tfrac12\cdot\tfrac12=\tfrac14.$$
:::

::: plot D under y = 1/x (light) and the part where x + y ≤ 2 (dark)
x: 0.5 .. 8
y: 0 .. 1.5
region D: 1 <= x <= e^2, 0 <= y <= 1/x
region H: 1 <= x <= e^2, 0 <= y <= 1/x, x + y <= 2
f(x) = 1/x
g(x) = 2 - x
:::

::: callout exam What exams ask
The big question on a continuous pair runs: (1) find the constant; (2) the marginal
densities (with every case, including "0 otherwise"); (3) a probability like
$P\{Y\le X\}$ or $P\{X+Y\le1\}$; sometimes (4) $F(x,y)$ by cases. Marks go to the
**picture** and the **limits**: draw the support, shade the event, and say which variable
runs between which bounds before integrating.
:::

## Summary

::: callout summary The lesson in five lines
- Density: $F(x,y)=\int_{-\infty}^x\int_{-\infty}^yp(u,v)\,\d v\,\d u$, with $p\ge0$ and total integral 1.
- $P\{(X,Y)\in G\}=\iint_Gp$ — in practice over $G\cap{}$support.
- $\partial^2F/\partial x\partial y=p$ where $p$ is continuous.
- $p_X(x)=\int p(x,y)\,\d y$ (vertical lines), $p_Y(y)=\int p(x,y)\,\d x$ (horizontal lines).
- Draw the support, draw the event, read off the limits.
:::

::: cards Continuous random vectors
Joint density $p(x,y)$ (联合概率密度) :: A function $p\ge0$ with $F(x,y)=\int_{-\infty}^{x}\int_{-\infty}^{y}p(u,v)\,\d v\,\d u$
Two conditions for a joint density :: $p(x,y)\ge0$ and $\iint_{\R^2}p(x,y)\,\d x\,\d y=1$
$P\{(X,Y)\in G\}$ :: $\iint_G p(x,y)\,\d x\,\d y$: the volume under the surface $z=p(x,y)$ over $G$
Density from $F(x,y)$ :: $p=\dfrac{\partial^2F}{\partial x\,\partial y}$ where $p$ is continuous
Marginal density $p_X(x)$ (边缘概率密度) :: $\int_{-\infty}^{+\infty}p(x,y)\,\d y$, along the vertical line at $x$
Marginal density $p_Y(y)$ :: $\int_{-\infty}^{+\infty}p(x,y)\,\d x$, along the horizontal line at $y$
$p=kxy$ on the unit square :: $k=4$, $p_X=2x$, $p_Y=2y$, $P\{Y\le X\}=\tfrac12$
$f=2e^{-(2x+y)}$ ($x,y>0$): $F$ and $P\{Y\le X\}$ :: $F=(1-e^{-2x})(1-e^{-y})$ for $x,y>0$, else 0; $P\{Y\le X\}=\tfrac13$
$cy(2-x)$ on $0\le y\le x\le1$ :: $c=\tfrac{24}5$; $p_X=\tfrac{12}5x^2(2-x)$; $p_Y=\tfrac{24}5y(\tfrac32-2y+\tfrac{y^2}2)$
Most common mistake with $\iint_G p$ :: Integrating the formula over all of $G$ instead of only where $p>0$
How to set the limits for $p_X(x)$ :: Fix $x$; the vertical line enters and leaves the support at the $y$-limits
:::

::: quiz Continuous random vectors
? $f(x,y)=C$ for $-1<x<1,\ -1<y<1$ and 0 elsewhere. Find $C$.
answer: 1/4
> The square has area $2\times2=4$, and $\iint f=4C=1$, so $C=\frac14$. (In-class question, answer A.)

? $f(x,y)=6x^2y$ on $0\le x\le1,\ 0\le y\le1$ (0 elsewhere), and $G$ is a region of the plane. Which statement is **wrong**?
- [ ] $P\{(X,Y)\in G\}=\iint_G f(x,y)\,\d x\,\d y$
- [x] $P\{(X,Y)\in G\}=\iint_G 6x^2y\,\d x\,\d y$
- [ ] $P\{X\ge Y\}=\int_0^1\d x\int_0^x6x^2y\,\d y$
- [ ] $P\{X\ge Y\}=\iint_{x\ge y}f(x,y)\,\d x\,\d y$
> $6x^2y$ is the density only on the unit square; outside it the density is 0. If $G$
> reaches outside the square, integrating $6x^2y$ over all of $G$ counts mass that isn't
> there. The others are right: on the square, $x\ge y$ is $0\le y\le x\le1$ (and that
> integral is $\int_0^13x^4\,\d x=\frac35$). (In-class question, answer B.)

? $f(x,y)=x^2+\frac13xy$ on $0\le x\le1,\ 0\le y\le2$ (0 elsewhere). Find $P\{X+Y\ge1\}$.
answer: 65/72
> $P\{X+Y<1\}=\int_0^1\int_0^{1-x}(x^2+\frac13xy)\,\d y\,\d x=\frac1{12}+\frac1{72}=\frac7{72}$,
> so $P\{X+Y\ge1\}=1-\frac7{72}=\frac{65}{72}$. (In-class question, answer A.)

? $f(x,y)=2e^{-(2x+y)}$ for $x>0,y>0$ (0 elsewhere). Give $F(x,y)$ for $x>0,\ y>0$.
expression: (1 - e^(-2x)) (1 - e^(-y))
variables: x, y
> $F=\int_0^y\int_0^x2e^{-(2u+v)}\,\d u\,\d v=(1-e^{-2x})(1-e^{-y})$; for $x\le0$ or $y\le0$
> it is 0. (In-class subjective question 14-020, part 1.)

? Same density $2e^{-(2x+y)}$. Find $P\{Y\le X\}$.
answer: 1/3
> $2\int_0^\infty e^{-2x}\int_0^xe^{-y}\,\d y\,\d x=2\int_0^\infty(e^{-2x}-e^{-3x})\,\d x=2(\frac12-\frac13)=\frac13$.
> (In-class subjective question 14-020, part 2.)

? From $F(x,y)=(1-e^{-2x})(1-e^{-y})$ ($x,y>0$), recover the density $p(x,y)$ for $x>0,\ y>0$.
expression: 2 e^(-2x - y)
variables: x, y
> $\frac{\partial F}{\partial x}=2e^{-2x}(1-e^{-y})$, then $\frac{\partial}{\partial y}$ gives $2e^{-2x}e^{-y}=2e^{-(2x+y)}$.

? $p(x,y)=cy(2-x)$ on $0\le x\le1,\ 0\le y\le x$. Find $c$.
answer: 24/5
> $\int_0^1\int_0^xy(2-x)\,\d y\,\d x=\frac12\int_0^1(2x^2-x^3)\,\d x=\frac12\cdot\frac5{12}=\frac5{24}$, so $c=\frac{24}5$.

? $p(x,y)=\frac12$ on $D$, the region under $y=1/x$ for $1\le x\le e^2$. Give $p_X(x)$ for $1<x<e^2$.
expression: 1/(2x)
variables: x
> The vertical line at $x$ crosses $D$ for $0\le y\le1/x$: $p_X(x)=\int_0^{1/x}\frac12\,\d y=\frac1{2x}$.
> (In-class subjective question 14-030, part 1.)

? Same density. Give $p_Y(y)$ for $e^{-2}<y\le1$.
expression: (1/y - 1)/2
variables: y
> The horizontal line at $y$ runs from $x=1$ to the curve $x=1/y$ (which is before $e^2$
> when $y>e^{-2}$): $p_Y(y)=\int_1^{1/y}\frac12\,\d x=\frac12(\frac1y-1)$. For
> $0<y\le e^{-2}$ it is $\frac12(e^2-1)$ instead.

? Same density. Find $P\{X+Y\le2\}$.
answer: 1/4
> Below $x+y=2$ the region $D$ is the triangle $1\le x\le2$, $0\le y\le2-x$ (the line
> stays under $y=1/x$), of area $\frac12$; times the density $\frac12$ gives $\frac14$.
> (In-class subjective question 14-030, part 2.)

? $p(x,y)=4xy$ on the unit square. Find $P\{X+Y\le1\}$.
answer: 1/6
> $\int_0^1\int_0^{1-x}4xy\,\d y\,\d x=\int_0^12x(1-x)^2\,\d x=2\big(\frac12-\frac23+\frac14\big)=\frac16$.
:::

---
title: Two-dimensional uniform and normal distributions
zh: 二维均匀分布与二维正态分布
summary: The two named joint distributions — uniform on a region (probability is area) and the bivariate normal N(μ1, μ2, σ1², σ2², ρ), whose marginals are normal whatever ρ is — and why normal marginals don't make a pair jointly normal.
source: 9二维连续型随机变量5-1 (2026-09-28), §3.2
---

In one dimension two distributions came up again and again: the uniform $U(a,b)$
(Lesson 2.3) and the normal $N(\mu,\sigma^2)$ (Lesson 2.4). Each has a two-dimensional
version. The **uniform** distribution on a region turns every probability into a ratio
of areas, which makes it the favourite of exam setters: the integrals are easy, so the
question tests whether you can set up the region. The **bivariate normal** describes
pairs like height and weight; its marginals are ordinary normals, and a surprising
counterexample shows that the converse fails.

## The two-dimensional uniform distribution

Throw a dart "at random" at a board shaped like a region $D$: every part of the board is
equally likely, so the chance of hitting a piece of it is just that piece's share of the
area. In density terms, the sand of Lesson 3.2 is spread **flat** over $D$: the height
is constant, and since the volume must be 1, the height is $1/(\text{area})$.

::: define Two-dimensional uniform distribution | 二维均匀分布
Let $D$ be a bounded region of the plane with area $S$. If $(X,Y)$ has the density
$$p(x,y)=\begin{cases}\dfrac1S,&(x,y)\in D\\0,&\text{otherwise,}\end{cases}$$
then $(X,Y)$ is **uniformly distributed on $D$** ({{zh 在 D 上服从均匀分布}}).
:::

::: formula Uniform density on a region | 二维均匀分布的密度
$$p(x,y)=\frac1S\quad\text{for }(x,y)\in D,\qquad p(x,y)=0\text{ otherwise}$$
--
D | the bounded region the point is thrown at |
S | area of $D$, $S=\iint_D\d x\,\d y$ |
:::

Integrating a constant over a region gives constant × area, so:

::: formula Probabilities under a uniform distribution | 均匀分布下的概率
$$P\{(X,Y)\in G\}=\iint_{G\cap D}\frac1S\,\d x\,\d y=\frac{S_{G\cap D}}{S_D}$$
--
S_{G\cap D} | area of the part of $G$ inside $D$ |
S_D | area of $D$ |
:::

This is **geometric probability** {{zh 几何概型}} (Lesson 1.3): probability as a share of area, here with a density behind it. Note the
$G\cap D$: only the part of $G$ inside the board counts.

::: example Uniform between y = x² and y = x
$(X,Y)$ is uniform on the region $D$ bounded by $y=x$ and $y=x^2$. Find its density and
both marginal densities.
== The region and its area ==
The curves meet at $x=0$ and $x=1$; between them the line is above the parabola
($x\ge x^2$ on $[0,1]$). So $D=\{0<x<1,\ x^2<y<x\}$ and
$S=\int_0^1(x-x^2)\,\d x=\tfrac12-\tfrac13=\tfrac16$.
== The density ==
$f(x,y)=6$ on $D$, 0 elsewhere.
== f_X: vertical lines ==
For $0<x<1$ the vertical line enters $D$ at the parabola and leaves at the line:
$f_X(x)=\int_{x^2}^{x}6\,\d y=6(x-x^2)$; 0 otherwise.
== f_Y: horizontal lines ==
For $0<y<1$, solve each curve for $x$: the line gives $x=y$, the parabola $x=\sqrt y$,
and $y\le\sqrt y$ on $(0,1)$. So $f_Y(y)=\int_y^{\sqrt y}6\,\d x=6(\sqrt y-y)$; 0 otherwise.
== A probability ==
$P\{Y\le\tfrac14\}=\int_0^{1/4}6(\sqrt y-y)\,\d y=6\Big(\tfrac23\cdot\tfrac18-\tfrac1{32}\Big)=\tfrac5{16}$.
:::

::: plot Uniform on D: between y = x² and y = x, with the horizontal line at y = b
x: 0 .. 1.2
y: 0 .. 1.2
region D: 0 < x < 1, x^2 < y < x
region L: x^2 < y < x, b - 0.01 < y < b + 0.01
f(x) = x
g(x) = x^2
slider b: 0.05 .. 0.95 = 0.5
:::

The horizontal line at height $b$ runs from $x=b$ (on the line) to $x=\sqrt b$ (on the
parabola) — that's where the limits of $f_Y$ come from.

::: callout pitfall Uniform jointly, not uniform marginally
$(X,Y)$ is uniform on $D$, but $f_X(x)=6(x-x^2)$ is not constant: the region is taller in
the middle than at the ends. Marginals of a uniform distribution are uniform only when
$D$ is a rectangle with sides parallel to the axes.
:::

::: callout exam Past exam: the last question of the 2025 final, part 1
"$(X,Y)$ is uniform on $D=\{0<x<1,\ x^2<y<\sqrt x\}$. Find the joint density." Find the
area first: $S=\int_0^1(\sqrt x-x^2)\,\d x=\tfrac23-\tfrac13=\tfrac13$, so $f(x,y)=3$ on $D$
and 0 elsewhere. Later parts then ask for marginals or a probability, exactly as in the
example above. Always write the "0 otherwise" line.
:::

::: plot The exam's region x² < y < √x (area 1/3, density 3)
x: 0 .. 1.2
y: 0 .. 1.2
region D: 0 < x < 1, x^2 < y, y < sqrt(x)
f(x) = x^2
g(x) = sqrt(x)
:::

### Turning a uniform pair into a joint table

A uniform pair can produce discrete variables: ask questions about where the point
landed, and record the answers as 0 or 1.

::: example Two indicator variables on a rectangle
$(X,Y)$ is uniform on the rectangle $G=\{0\le x\le2,\ 0\le y\le1\}$. Let
$U=\begin{cases}0,&X\le Y\\1,&X>Y\end{cases}$ and $V=\begin{cases}0,&X\le2Y\\1,&X>2Y.\end{cases}$
Find the joint law of $U$ and $V$.
== The density ==
$G$ has area 2, so $p(x,y)=\tfrac12$ on $G$. Each probability is (area inside $G$)$\times\tfrac12$.
== U = 0, V = 0 ==
$\{X\le Y,\ X\le2Y\}=\{X\le Y\}$, because $Y\ge0$ makes $X\le Y$ imply $X\le2Y$. Above the
line $y=x$ in $G$ is the triangle $(0,0),(0,1),(1,1)$, area $\tfrac12$: probability $\tfrac14$.
== U = 0, V = 1 ==
$\{X\le Y,\ X>2Y\}$ needs $2Y<X\le Y$, impossible for $Y\ge0$ (up to the single point
$(0,0)$): probability 0.
== U = 1, V = 0 ==
$\{Y<X\le2Y\}$ is the strip between $y=x/2$ and $y=x$. Above $y=x/2$ in $G$ is the
triangle $(0,0),(0,1),(2,1)$, area 1; take away the $\tfrac12$ above $y=x$: area
$\tfrac12$, probability $\tfrac14$.
== U = 1, V = 1 ==
$\{X>2Y\}$ is below $y=x/2$: the triangle $(0,0),(2,0),(2,1)$, area 1, probability $\tfrac12$.

| $U$ \ $V$ | 0 | 1 |
| --- | --- | --- |
| 0 | $1/4$ | 0 |
| 1 | $1/4$ | $1/2$ |

The four cells add to 1. ✓
:::

::: plot The rectangle cut by y = x and y = x/2: {U=0,V=0}, {U=1,V=0}, {U=1,V=1}
x: 0 .. 2.2
y: 0 .. 1.2
region A: 0 <= x <= 2, 0 <= y <= 1, x <= y
region B: 0 <= x <= 2, 0 <= y <= 1, y < x, x <= 2 y
region C: 0 <= x <= 2, 0 <= y <= 1, x > 2 y
f(x) = x
g(x) = x/2
:::

### A triangle, and a slide to correct

::: example Past exam: f_Y on a triangle (2025 final, first subjective question, part 1)
$(X,Y)$ is uniform on the region $G$ bounded by $x-y=0$, $x+y=2$ and $x=0$. Find the
marginal density $f_Y(y)$.
== The region ==
The three lines meet at $(0,0)$ ($x=y$ and $x=0$), $(0,2)$ ($x+y=2$ and $x=0$) and $(1,1)$
($x=y$ and $x+y=2$). $G$ is the triangle with those corners: $x\ge0$ and $x\le y\le2-x$.
Its area is $\tfrac12\cdot2\cdot1=1$, so $f(x,y)=1$ on $G$.
== Horizontal lines ==
At height $y$ the line starts at $x=0$ (the left side) and stops at the nearer of the two
slanted sides: $x=y$ when $0<y\le1$, and $x=2-y$ when $1<y<2$.
== Answer ==
$$f_Y(y)=\begin{cases}\int_0^{y}1\,\d x=y, & 0<y\le1,\\[2pt] \int_0^{2-y}1\,\d x=2-y, & 1<y<2,\\[2pt] 0 & \text{otherwise.}\end{cases}$$
Check: $\int_0^1y\,\d y+\int_1^2(2-y)\,\d y=\tfrac12+\tfrac12=1$. ✓
:::

::: callout note The slide's answer is wrong
The slide works this out as $f_Y(y)=\int_y^{2-y}1\,\d x=2-2y$ on $[0,1]$, with a "?" drawn
beside it. Those limits are the $y$-limits for a **fixed $x$** ($y$ from $x$ to $2-x$), so
$\int_x^{2-x}1\,\d y=2-2x$ is in fact $f_X(x)$ for $0<x<1$ — not $f_Y$. The correct
marginal of $Y$ is the "tent" $f_Y(y)=y$ on $(0,1]$, $2-y$ on $(1,2)$, 0 otherwise.
:::

::: plot The triangle x ≥ 0, x ≤ y ≤ 2 − x and the horizontal line at y = b
x: 0 .. 1.5
y: 0 .. 2.2
region G: x >= 0, x <= y, y <= 2 - x
region L: x >= 0, x <= y, y <= 2 - x, b - 0.015 < y < b + 0.015
f(x) = x
g(x) = 2 - x
slider b: 0.05 .. 1.95 = 1.4
:::

Move $b$ past 1 and watch the line's right end switch from $y=x$ to $y=2-x$: that's why
$f_Y$ comes in two pieces.

::: callout pitfall Which limits go with which variable
For $f_Y(y)$ you integrate over $x$, so the limits must be **$x$-values** on the
horizontal line at height $y$ — solve each boundary for $x$. Borrowing the $y$-limits of a
vertical line gives the other marginal, as the slide did.
:::

## The two-dimensional normal distribution

Plot many children's heights against weights and you get an elliptical cloud: densest in
the middle, thinning out evenly in every direction, tilted because taller children tend
to weigh more. The bivariate normal is the density with exactly that shape: its contour
lines are ellipses, and one parameter, $\rho$, sets the tilt.

::: define Two-dimensional normal distribution | 二维正态分布
$(X,Y)$ has the **two-dimensional (bivariate) normal distribution** with parameters
$\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho$ — written $(X,Y)\sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ —
if its density is the one below, where $\mu_1,\mu_2,\sigma_1,\sigma_2,\rho$ are constants
with $\sigma_1>0$, $\sigma_2>0$, $-1<\rho<1$.
:::

::: formula Bivariate normal density | 二维正态分布的概率密度
$$p(x,y)=\frac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}}\exp\left\{\frac{-1}{2(1-\rho^2)}\left[\frac{(x-\mu_1)^2}{\sigma_1^2}-\frac{2\rho(x-\mu_1)(y-\mu_2)}{\sigma_1\sigma_2}+\frac{(y-\mu_2)^2}{\sigma_2^2}\right]\right\}$$
--
\mu_1, \mu_2 | centre of the cloud (the means of $X$ and $Y$) |
\sigma_1, \sigma_2 | spread along $x$ and along $y$ (the standard deviations) |
\rho | tilt of the ellipses, between $-1$ and $1$ (the correlation coefficient, studied later) |
:::

In standardised coordinates $u=(x-\mu_1)/\sigma_1$, $v=(y-\mu_2)/\sigma_2$ the density is
high where $\dfrac{u^2-2\rho uv+v^2}{1-\rho^2}$ is small, so each contour is an ellipse
$u^2-2\rho uv+v^2=c(1-\rho^2)$. Slide $\rho$:

::: plot Contours of a bivariate normal (standardised): the regions where the density is above two levels
x: -3 .. 3
y: -3 .. 3
region Outer: x^2 - 2 r x y + y^2 <= 4 (1 - r^2)
region Inner: x^2 - 2 r x y + y^2 <= 1 - r^2
slider r: -0.95 .. 0.95 = 0.6
:::

With $\rho=0$ the contours are circles (when $\sigma_1=\sigma_2$); positive $\rho$ tilts them
along $y=x$ (big $X$ goes with big $Y$), negative $\rho$ along $y=-x$. As $|\rho|\to1$ the
ellipse collapses towards a line, and the peak height $\frac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}}$
shoots up, keeping the volume 1:

::: explore Peak height of the bivariate normal density
slider s1: 0.2 .. 3 = 1
slider s2: 0.2 .. 3 = 1
slider r: -0.99 .. 0.99 = 0
h = 1 / (2 pi s1 s2 sqrt(1 - r^2)) | | Peak p(μ₁, μ₂)
:::

### Its marginals are normal

::: theorem Marginals of the bivariate normal | 二维正态分布的边缘分布
If $(X,Y)\sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$, then $X\sim N(\mu_1,\sigma_1^2)$ and
$Y\sim N(\mu_2,\sigma_2^2)$:
$$p_X(x)=\frac{1}{\sqrt{2\pi}\,\sigma_1}e^{-\frac{(x-\mu_1)^2}{2\sigma_1^2}},\qquad p_Y(y)=\frac{1}{\sqrt{2\pi}\,\sigma_2}e^{-\frac{(y-\mu_2)^2}{2\sigma_2^2}},\qquad-\infty<x,y<+\infty.$$
Both marginals are one-dimensional normal and **neither depends on $\rho$**.
:::

::: example Why the marginal of X is N(μ₁, σ₁²)
Integrate $p(x,y)$ over $y$.
== Complete the square ==
With $u=\frac{x-\mu_1}{\sigma_1}$ and $v=\frac{y-\mu_2}{\sigma_2}$, the bracket is
$u^2-2\rho uv+v^2=(v-\rho u)^2+(1-\rho^2)u^2$. So the exponent splits into
$-\dfrac{u^2}{2}-\dfrac{(v-\rho u)^2}{2(1-\rho^2)}$.
== Integrate over y ==
$\d y=\sigma_2\,\d v$, and $\int_{-\infty}^{+\infty}e^{-\frac{(v-\rho u)^2}{2(1-\rho^2)}}\,\d v=\sqrt{2\pi(1-\rho^2)}$
(a normal integral with variance $1-\rho^2$). Hence
$$p_X(x)=\frac{e^{-u^2/2}}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}}\cdot\sigma_2\sqrt{2\pi(1-\rho^2)}=\frac{1}{\sqrt{2\pi}\,\sigma_1}e^{-\frac{(x-\mu_1)^2}{2\sigma_1^2}}.$$
== What happened to ρ ==
It cancelled: $\sqrt{1-\rho^2}$ in front against $\sqrt{1-\rho^2}$ from the integral. The tilt
moves mass along each vertical line but doesn't change how much there is.
:::

So probabilities about $X$ alone need only $\mu_1,\sigma_1$ and $\Phi$ (Lesson 2.4): if
$(X,Y)\sim N(1,2,4,9,0.5)$ then $X\sim N(1,4)$ and
$P\{X\le3\}=\Phi\big(\frac{3-1}{2}\big)=\Phi(1)\approx0.8413$.

### Normal marginals do not make a normal pair

Since the joint distribution gives the marginals, can we go back: if $X$ and $Y$ are each
normal, is $(X,Y)$ bivariate normal? **No.** Here is a pair with $N(0,1)$ marginals that
isn't.

::: example A counterexample
$f(x,y)=\dfrac{1}{2\pi}e^{-\frac{x^2+y^2}{2}}(1+\sin x\sin y)$. Find $f_X$ and $f_Y$.
== It is a density ==
$|\sin x\sin y|\le1$, so $1+\sin x\sin y\ge0$ and $f\ge0$; the total integral is found below.
== f_X ==
$$f_X(x)=\frac{1}{2\pi}e^{-\frac{x^2}{2}}\left[\int_{-\infty}^{+\infty}e^{-\frac{y^2}{2}}\d y+\sin x\int_{-\infty}^{+\infty}e^{-\frac{y^2}{2}}\sin y\,\d y\right].$$
The first integral is $\sqrt{2\pi}$; the second is 0, because $e^{-y^2/2}\sin y$ is odd. So
$f_X(x)=\dfrac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2}}$: $X\sim N(0,1)$ (and the total integral is 1).
== f_Y ==
By the same argument $Y\sim N(0,1)$.
== Not bivariate normal ==
A bivariate normal with these marginals would be
$\frac{1}{2\pi\sqrt{1-\rho^2}}e^{-\frac{x^2-2\rho xy+y^2}{2(1-\rho^2)}}$, with elliptical contours.
The factor $1+\sin x\sin y$ makes $f$ wavy — compare the contours below — so $(X,Y)$ is
not normal, although both marginals are.
:::

::: plot Where the density is above a level k: standard bivariate normal (ρ = 0) and the counterexample
x: -3.5 .. 3.5
y: -3.5 .. 3.5
region Normal: e^(-(x^2 + y^2)/2) / (2 pi) >= k
region Wavy: e^(-(x^2 + y^2)/2) (1 + sin(x) sin(y)) / (2 pi) >= k
slider k: 0.01 .. 0.2 = 0.05
:::

::: callout key Joint normal ⇒ normal marginals, not the reverse
If $(X,Y)\sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ then $X\sim N(\mu_1,\sigma_1^2)$,
$Y\sim N(\mu_2,\sigma_2^2)$, for every $\rho$. But $X\sim N(\mu_1,\sigma_1^2)$ and
$Y\sim N(\mu_2,\sigma_2^2)$ do **not** imply that $(X,Y)$ is bivariate normal. (Also: the
marginals can't tell you $\rho$ — another case of "marginals don't determine the joint".)
:::

## Summary

::: callout summary The lesson in five lines
- Uniform on $D$: $p=1/S$ on $D$, 0 elsewhere; $P\{(X,Y)\in G\}=S_{G\cap D}/S_D$.
- Its marginals come from vertical and horizontal lines, and usually aren't uniform.
- Exam regions: find the area first; read limits off the picture (and solve boundaries for $x$ when integrating over $x$).
- $N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$: elliptical contours tilted by $\rho$; marginals $N(\mu_1,\sigma_1^2)$, $N(\mu_2,\sigma_2^2)$, free of $\rho$.
- Normal marginals don't imply a joint normal: $\frac1{2\pi}e^{-(x^2+y^2)/2}(1+\sin x\sin y)$.
:::

::: cards Uniform and normal pairs
Two-dimensional uniform distribution on $D$ (二维均匀分布) :: Density $\frac1S$ on $D$ (area $S$), 0 elsewhere
$P\{(X,Y)\in G\}$ for a uniform pair on $D$ :: $S_{G\cap D}/S_D$, the share of $D$'s area inside $G$
Uniform between $y=x^2$ and $y=x$ :: Density 6; $f_X=6(x-x^2)$ on $(0,1)$; $f_Y=6(\sqrt y-y)$ on $(0,1)$
Uniform on $x^2<y<\sqrt x$ (2025 final) :: Area $\frac13$, so the density is 3 on the region, 0 elsewhere
Are the marginals of a uniform pair uniform? :: Only for an axis-parallel rectangle; otherwise generally not
Triangle $x\ge0$, $x\le y\le2-x$: $f_Y$ :: $y$ on $(0,1]$, $2-y$ on $(1,2)$, 0 otherwise
Notation for the bivariate normal :: $(X,Y)\sim N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ with $\sigma_1,\sigma_2>0$, $-1<\rho<1$
Constant in front of the bivariate normal density :: $\dfrac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}}$
Marginals of $N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ :: $X\sim N(\mu_1,\sigma_1^2)$, $Y\sim N(\mu_2,\sigma_2^2)$, not depending on $\rho$
If $X$ and $Y$ are both normal, is $(X,Y)$ bivariate normal? :: Not necessarily: e.g. $\frac1{2\pi}e^{-(x^2+y^2)/2}(1+\sin x\sin y)$
What $\rho$ does to the contours :: Tilts the ellipses: along $y=x$ for $\rho>0$, along $y=-x$ for $\rho<0$
:::

::: quiz Uniform and normal pairs
? $(X,Y)$ has density $f(x,y)=g(x,y)\ne0$ on a region $G$ and 0 elsewhere. $D$ is a region of the plane; $S_G$, $S_D$ are areas. Then $P\{(X,Y)\in D\}=$
- [ ] $\dfrac{S_D}{S_G}$
- [ ] $\dfrac{S_{D\cap G}}{S_G}$
- [x] $\iint_D f(x,y)\,\d x\,\d y$
- [ ] $\iint_D g(x,y)\,\d x\,\d y$
> Always $P\{(X,Y)\in D\}=\iint_Df$. The area ratios hold only for a **uniform** density
> (constant $g$), which isn't given. $\iint_Dg$ is wrong because $g$ is the density only on
> $G$; on $D$ outside $G$ the density is 0. (In-class question, answer C.)

? $(X,Y)$ is uniform on $D=\{0<x<1,\ x^2<y<\sqrt x\}$ (2025 final). What is the density on $D$?
answer: 3
> $S=\int_0^1(\sqrt x-x^2)\,\d x=\frac23-\frac13=\frac13$, so $f=1/S=3$ on $D$, 0 elsewhere.

? $(X,Y)$ is uniform on the triangle bounded by $x-y=0$, $x+y=2$, $x=0$ (2025 final). Give $f_Y(y)$ for $1<y<2$.
expression: 2 - y
variables: y
> The triangle has corners $(0,0),(0,2),(1,1)$, area 1, so $f=1$. At height $y\in(1,2)$, $x$
> runs from 0 to $2-y$: $f_Y(y)=2-y$. (For $0<y\le1$ it is $y$. The slide's $2-2y$ used
> the wrong limits.)

? Same triangle. Give $f_Y(y)$ for $0<y\le1$.
expression: y
variables: y
> At height $y\le1$ the horizontal line runs from $x=0$ to the side $x=y$: $f_Y(y)=\int_0^y1\,\d x=y$.

? $(X,Y)$ is uniform between $y=x^2$ and $y=x$. Give $f_X(x)$ for $0<x<1$.
expression: 6 (x - x^2)
variables: x
> The area is $\frac16$, so the density is 6; the vertical line at $x$ runs from $y=x^2$ to
> $y=x$: $f_X(x)=6(x-x^2)$.

? $(X,Y)$ is uniform on $[0,2]\times[0,1]$, $U=1$ if $X>Y$ (else 0), $V=1$ if $X>2Y$ (else 0). Find $P\{U=1,V=1\}$.
answer: 1/2
> $\{X>Y,\ X>2Y\}=\{X>2Y\}$, the triangle under $y=x/2$ with area 1; the density is
> $\frac12$, so the probability is $\frac12$.

? $(X,Y)$ is uniform on the unit square $[0,1]^2$. Find $P\{X+Y\le\frac12\}$.
answer: 1/8
> The part of the square below $x+y=\frac12$ is a right triangle with legs $\frac12$, area
> $\frac18$; the square's area is 1.

? $(X,Y)\sim N(1,2,4,9,0.5)$. Find $P\{-1<X\le3\}$.
answer: 2 Phi(1) - 1
tolerance: 0.1%
> $X\sim N(1,4)$, so $\sigma_1=2$: $P=\Phi\big(\frac{3-1}2\big)-\Phi\big(\frac{-1-1}2\big)=\Phi(1)-\Phi(-1)=2\Phi(1)-1\approx0.6827$.
> $\rho$ plays no part.

? Which parameter of $N(\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ has no effect on either marginal distribution?
text: rho | ρ | correlation | correlation coefficient
> The marginals are $N(\mu_1,\sigma_1^2)$ and $N(\mu_2,\sigma_2^2)$; $\rho$ cancels when the
> other variable is integrated out.

? $X\sim N(0,1)$ and $Y\sim N(0,1)$. Which is true?
- [ ] $(X,Y)$ must be $N(0,0,1,1,\rho)$ for some $\rho$
- [ ] $(X,Y)$ must be $N(0,0,1,1,0)$
- [x] $(X,Y)$ need not be bivariate normal at all
> The density $\frac1{2\pi}e^{-(x^2+y^2)/2}(1+\sin x\sin y)$ has exactly these marginals but
> isn't bivariate normal. Marginals never determine the joint distribution.
:::

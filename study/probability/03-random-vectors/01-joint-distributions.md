---
title: Joint distributions and discrete random vectors
zh: 二维随机变量及其联合分布
summary: Two random variables studied together — the joint distribution function F(x, y), its four properties, marginal distribution functions, and the joint and marginal tables of a discrete pair.
source: 8二维随机变量4-2 (2026-09-23), reviewed in 9二维连续型随机变量5-1 (2026-09-28)
---

So far every experiment produced **one** number: the score on a die, the lifetime of a
bulb. Most real questions involve two or more numbers at once — a child's height *and*
weight, the $x$ *and* $y$ coordinates of where a shell lands — and the interesting part is
how they behave **together**: tall children tend to be heavier. This lesson builds the
tools for that: one function $F(x,y)$ that describes the pair completely, how to recover
each variable's own distribution from it, and, for variables that take separate values,
the joint table that does the same job as a one-variable distribution law.

## Two random variables at once

Picture one run of an experiment as a single outcome $e$ in the sample space $S$. A
random variable is a rule that turns $e$ into a number (Lesson 2.1). Nothing stops us from
reading **two** numbers off the same outcome: measure one child $e$ and record both
$H(e)$, the height, and $W(e)$, the weight. The pair $(H,W)$ is a point in the plane that
moves with chance.

::: define Two-dimensional random variable | 二维随机变量
Let $S=\{e\}$ be the sample space of an experiment $E$, and let $X=X(e)$ and $Y=Y(e)$ be
random variables defined on $S$. The vector $(X,Y)$ is a **two-dimensional random
variable**, also called a **two-dimensional random vector** ({{zh 二维随机向量}}).
:::

Examples from the lecture:

- where a shell lands, $(X,Y)$, its two coordinates on the ground;
- the height $H$ and weight $W$ of a pre-school child picked at random, $(H,W)$.

The point of studying them together: the behaviour of $(X,Y)$ depends not only on $X$
and on $Y$ separately, but on **how they are related**. Knowing everything about height
alone and weight alone does not tell you how often a child is both tall and light.

## The joint distribution function

For one variable, the distribution function $F(x)=P\{X\le x\}$ answered every question
about $X$. The two-dimensional version asks the same thing in both coordinates at once:
how likely is the random point to land **to the left of $x$ and below $y$**?

::: define Joint distribution function | 联合分布函数
For a two-dimensional random variable $(X,Y)$ and any real numbers $x,y$, the function
$$F(x,y)=P\{(X\le x)\cap(Y\le y)\}=P\{X\le x,\,Y\le y\}$$
is the **distribution function** of $(X,Y)$ ({{zh 分布函数}}), or the **joint distribution
function** of $X$ and $Y$. The comma inside $P\{\cdot\}$ means "and".
:::

::: formula Joint distribution function | 联合分布函数
$$F(x,y)=P\{X\le x,\,Y\le y\}$$
--
F(x,y) | probability that the random point lies in the quadrant left of $x$ and below $y$ |
x, y | any real numbers (the corner of the quadrant) |
:::

Geometrically, $F(x,y)$ is the probability that the random point $(X,Y)$ falls in the
infinite quadrant whose top-right corner is $(x,y)$. Move the corner and watch the
quadrant follow:

::: plot The event {X ≤ a, Y ≤ b}: everything left of and below the corner (a, b)
x: -3 .. 3
y: -3 .. 3
region Q: x <= a, y <= b
slider a: -2.5 .. 2.5 = 1
slider b: -2.5 .. 2.5 = 0.5
:::

### Four properties

Each property of the one-variable $F(x)$ has a two-variable version, plus one new one.

::: theorem Properties of the joint distribution function | 分布函数的性质
1. **Bounded, with limits 0 and 1:** $0\le F(x,y)\le 1$; for every fixed $y$,
   $F(-\infty,y)=\lim_{x\to-\infty}F(x,y)=0$; for every fixed $x$,
   $F(x,-\infty)=\lim_{y\to-\infty}F(x,y)=0$; $F(-\infty,-\infty)=0$ and
   $F(+\infty,+\infty)=1$.
2. **Non-decreasing in each variable** ({{zh 单调不减}}): if $x_2>x_1$ then
   $F(x_2,y)\ge F(x_1,y)$; if $y_2>y_1$ then $F(x,y_2)\ge F(x,y_1)$.
3. **Right-continuous in each variable** ({{zh 右连续}}): $F(x,y)=F(x+0,y)$ and
   $F(x,y)=F(x,y+0)$.
4. **Rectangles have non-negative probability:** for $x_1<x_2$ and $y_1<y_2$,
   $F(x_2,y_2)-F(x_1,y_2)-F(x_2,y_1)+F(x_1,y_1)\ge 0$.
:::

Why they hold, in pictures:

1. Sliding the corner far left (or far down) shrinks the quadrant to nothing, so the
   probability goes to 0; sliding it far up *and* right covers the whole plane, so it
   goes to 1. Note that $F(+\infty,y)$ is **not** 1 in general — only one side is open.
2. Moving the corner right only makes the quadrant bigger.
3. The quadrant includes its edges ($\le$), exactly as $F(x)$ did in one dimension.
4. Property 4 is the probability of a rectangle, which can't be negative. It's the one
   that is new, and it doesn't follow from the other three.

### The probability of a rectangle

How likely is the point to land in the rectangle $x_1<X\le x_2,\ y_1<Y\le y_2$? Take the
big quadrant at $(x_2,y_2)$; cut away the quadrant at $(x_1,y_2)$ (the part to the left)
and the quadrant at $(x_2,y_1)$ (the part below). The quadrant at $(x_1,y_1)$ has now been
cut away **twice**, so add it back once — inclusion–exclusion.

::: formula Probability of a rectangle | 矩形区域的概率
$$P\{x_1<X\le x_2,\ y_1<Y\le y_2\}=F(x_2,y_2)-F(x_1,y_2)-F(x_2,y_1)+F(x_1,y_1)$$
--
x_1 < x_2 | left and right sides of the rectangle |
y_1 < y_2 | bottom and top sides |
:::

::: plot The rectangle (dark) inside the quadrant at its top-right corner (light)
x: -3 .. 3
y: -3 .. 3
region Big: x <= x2, y <= y2
region R: x1 < x <= x2, y1 < y <= y2
slider x1: -2.5 .. 0 = -1
slider x2: 0 .. 2.5 = 1.5
slider y1: -2.5 .. 0 = -1.5
slider y2: 0 .. 2.5 = 1
:::

::: callout pitfall The rectangle is not F(x₂, y₂) − F(x₁, y₁)
Subtracting only the bottom-left corner leaves two L-shaped strips (left of $x_1$, and
below $y_1$) still counted. You need all four corners: the two corners on one diagonal
with $+$, the other two with $-$.
:::

::: example Checking property 4 matters
Is $F(x,y)=\begin{cases}1,&x+y\ge0\\0,&x+y<0\end{cases}$ a joint distribution function?
== Properties 1–3 ==
Values are 0 or 1; it is 0 far down-left and 1 far up-right; increasing $x$ or $y$ can
only move a point from $x+y<0$ into $x+y\ge0$, so it never decreases; and because the
boundary $x+y=0$ belongs to the "1" side, it is right-continuous. So far, so good.
== Property 4 ==
Take the square $-1<x\le1,\ -1<y\le1$:
$F(1,1)-F(-1,1)-F(1,-1)+F(-1,-1)=1-1-1+0=-1<0$. A rectangle would have probability
$-1$: impossible.
== Conclusion ==
It is **not** a distribution function, even though it passes properties 1–3. A
"step along a slanted line" always fails this way; the in-class question in the quiz is
the same trap.
:::

### Finding constants

When a distribution function contains unknown constants, the limits in property 1
pin them down.

::: example Constants in an arctan distribution function
$F(x,y)=A\left(B+\arctan x\right)\left(\dfrac{\pi}{2}+\arctan y\right)$ is a joint
distribution function. Find $A$ and $B$.
== Use F(−∞, y) = 0 ==
As $x\to-\infty$, $\arctan x\to-\pi/2$, so
$A\left(B-\dfrac{\pi}{2}\right)\left(\dfrac{\pi}{2}+\arctan y\right)=0$ for every $y$.
The last bracket is positive and $A\ne0$, so $B=\dfrac{\pi}{2}$.
== Use F(+∞, +∞) = 1 ==
As both go to $+\infty$, both arctans go to $\pi/2$:
$A\left(\dfrac\pi2+\dfrac\pi2\right)\left(\dfrac\pi2+\dfrac\pi2\right)=A\pi^2=1$, so
$A=\dfrac{1}{\pi^2}$.
== Answer ==
$A=\dfrac1{\pi^2}$, $B=\dfrac\pi2$, giving
$F(x,y)=\dfrac{1}{\pi^2}\left(\dfrac\pi2+\arctan x\right)\left(\dfrac\pi2+\arctan y\right)$.
:::

## Marginal distribution functions

If you know everything about the pair, you should be able to answer questions about
$X$ alone. The trick: "$X\le x$" is the same event as "$X\le x$ and $Y$ is anything",
that is $Y<+\infty$. So let the quadrant's top edge go up to infinity — the quadrant
becomes the half-plane left of $x$.

::: define Marginal distribution function | 边缘分布函数
The distribution functions of $X$ and of $Y$ on their own, read off the joint one:
$F_X(x)=P\{X\le x\}=F(x,+\infty)$ is the **marginal distribution function of $(X,Y)$
with respect to $X$**, and $F_Y(y)=P\{Y\le y\}=F(+\infty,y)$ the one with respect to $Y$.
:::

::: formula Marginal distribution functions | 边缘分布函数
$$F_X(x)=F(x,+\infty)=\lim_{y\to+\infty}F(x,y),\qquad F_Y(y)=F(+\infty,y)=\lim_{x\to+\infty}F(x,y)$$
--
F_X(x) | distribution function of $X$ alone, $P\{X\le x\}$ |
F_Y(y) | distribution function of $Y$ alone, $P\{Y\le y\}$ |
:::

"Marginal" ({{zh 边缘}}) comes from tables: as you'll see below, these distributions are
written in the margins of the joint table.

::: example Marginals of the arctan distribution
$(X,Y)$ has $F(x,y)=\dfrac{1}{\pi^2}\left(\dfrac{\pi}{2}+\arctan x\right)\left(\dfrac{\pi}{2}+\arctan y\right)$.
Find $F_X$ and $F_Y$, then $P\{0<X\le1,\ 0<Y\le1\}$.
== F_X ==
Let $y\to+\infty$: the last bracket tends to $\pi$, so
$F_X(x)=\dfrac{1}{\pi^2}\left(\dfrac\pi2+\arctan x\right)\cdot\pi=\dfrac1\pi\left(\dfrac\pi2+\arctan x\right)$,
for all real $x$.
== F_Y ==
By the same argument, $F_Y(y)=\dfrac1\pi\left(\dfrac\pi2+\arctan y\right)$.
== The rectangle ==
Here $F(x,y)=F_X(x)F_Y(y)$, and $F_X(0)=\tfrac12$, $F_X(1)=\tfrac1\pi\left(\tfrac\pi2+\tfrac\pi4\right)=\tfrac34$.
By the rectangle formula,
$F(1,1)-F(0,1)-F(1,0)+F(0,0)=\tfrac{9}{16}-\tfrac{3}{8}-\tfrac38+\tfrac14=\tfrac1{16}$.
(It factors: $\left(\tfrac34-\tfrac12\right)^2=\tfrac1{16}$.)
:::

::: callout key Joint → marginals, never the other way
The joint distribution determines both marginals. The marginals do **not** determine the
joint distribution: many different pairs share the same $F_X$ and $F_Y$. The discrete
examples below show it with tables.
:::

## Discrete random vectors and the joint table

When $X$ and $Y$ each take separate values (finitely many, or a list $x_1,x_2,\dots$),
the pair takes values on a grid of points $(x_i,y_j)$. As in one dimension, the natural
description is not $F$ but a **list of probabilities**, one per grid point.

::: define Joint distribution law | 联合分布列
If a two-dimensional discrete random variable $(X,Y)$ takes the values $(x_i,y_j)$,
$i,j=1,2,\cdots$, then
$$P\{X=x_i,\,Y=y_j\}=p_{ij},\qquad i,j=1,2,\cdots$$
is the **distribution law** of $(X,Y)$ ({{zh 分布列}} or {{zh 分布律}}), or the **joint
distribution law** of $X$ and $Y$.
:::

::: theorem Properties of a joint distribution law | 联合分布列的性质
(1) $p_{ij}\ge0$ for all $i,j$; (2) $\displaystyle\sum_{i=1}^{\infty}\sum_{j=1}^{\infty}p_{ij}=1$.
Conversely, any table of numbers with these two properties is the joint law of some pair.
:::

It's usually written as a table: rows for the values of $X$, columns for the values of
$Y$, the probability $p_{ij}$ where row $i$ meets column $j$.

| $X$ \ $Y$ | $y_1$ | $y_2$ | $\cdots$ | $y_j$ | $\cdots$ |
| --- | --- | --- | --- | --- | --- |
| $x_1$ | $p_{11}$ | $p_{12}$ | $\cdots$ | $p_{1j}$ | $\cdots$ |
| $x_2$ | $p_{21}$ | $p_{22}$ | $\cdots$ | $p_{2j}$ | $\cdots$ |
| $\vdots$ | $\vdots$ | $\vdots$ |  | $\vdots$ |  |
| $x_i$ | $p_{i1}$ | $p_{i2}$ | $\cdots$ | $p_{ij}$ | $\cdots$ |

Every probability about $(X,Y)$ is a sum of cells: $P\{(X,Y)\in G\}$ adds the $p_{ij}$ of
the grid points in $G$, and $F(x,y)=\sum_{x_i\le x}\sum_{y_j\le y}p_{ij}$.

::: example Completing a table
$(X,Y)$ has the joint law below. What must $a$ and $b$ satisfy?

| $X$ \ $Y$ | 1 | 2 | 3 |
| --- | --- | --- | --- |
| 1 | $1/6$ | $1/9$ | $1/18$ |
| 2 | $1/3$ | $a$ | $b$ |

== Add up the known cells ==
First row: $\tfrac16+\tfrac19+\tfrac1{18}=\tfrac{3+2+1}{18}=\tfrac13$. With the
$\tfrac13$ in the second row, the known cells total $\tfrac23$.
== Use the total ==
All six cells add to 1, so $a+b=1-\tfrac23=\tfrac13$, with $a\ge0$, $b\ge0$.
(A choice like $a=\tfrac12$, $b=-\tfrac32$ also has a fixed sum, but a negative cell is
never allowed — and its sum is $-1$, not $\tfrac13$, anyway.)
:::

### Marginal distribution laws

To get $P\{X=x_i\}$, notice that "$X=x_i$" splits into the disjoint events
"$X=x_i,\ Y=y_1$", "$X=x_i,\ Y=y_2$", …, one per column. Adding them (countable
additivity) gives the **row sum**:
$$P\{X=x_i\}=P\Big\{\bigcup_{j}(X=x_i,\,Y=y_j)\Big\}=\sum_{j}p_{ij}.$$
Likewise $P\{Y=y_j\}$ is the **column sum**.

::: formula Marginal distribution laws | 边缘分布列
$$p_{i\cdot}=P\{X=x_i\}=\sum_{j=1}^{\infty}p_{ij},\qquad p_{\cdot j}=P\{Y=y_j\}=\sum_{i=1}^{\infty}p_{ij}$$
--
p_{i\cdot} | marginal law of $X$: the sum of row $i$ (the dot replaces the index summed over) |
p_{\cdot j} | marginal law of $Y$: the sum of column $j$ |
:::

These are the **marginal distribution laws** ({{zh 边缘分布列}}) of $X$ and of $Y$. The
slides write the dot as $p_{i\bullet}$ or $P_{i\cdot}$; it's the same thing. They are
written in the margins of the table — an extra column on the right, an extra row at the
bottom, and the corner is 1:

| $X$ \ $Y$ | $y_1$ | $y_2$ | $\cdots$ | $p_{i\cdot}$ |
| --- | --- | --- | --- | --- |
| $x_1$ | $p_{11}$ | $p_{12}$ | $\cdots$ | $p_{1\cdot}$ |
| $x_2$ | $p_{21}$ | $p_{22}$ | $\cdots$ | $p_{2\cdot}$ |
| $\vdots$ | $\vdots$ | $\vdots$ |  | $\vdots$ |
| $p_{\cdot j}$ | $p_{\cdot1}$ | $p_{\cdot2}$ | $\cdots$ | $1$ |

### Building a joint table from a story

::: example X uniform on 1–4, then Y uniform on 1 to X
$X$ takes one of the integers 1, 2, 3, 4 with equal probability; then $Y$ takes one of
the integers $1,\dots,X$ with equal probability. Find the joint law of $(X,Y)$ and the
marginal law of $Y$.
== Multiplication rule ==
By the multiplication rule (Lesson 1.4),
$p_{ij}=P\{X=i,\,Y=j\}=P\{X=i\}\,P\{Y=j\mid X=i\}$. Here $P\{X=i\}=\tfrac14$, and once
$X=i$ the value $Y$ is one of $i$ equally likely numbers, so
$P\{Y=j\mid X=i\}=\tfrac1i$ for $1\le j\le i$ and 0 for $j>i$.
== The table ==
$p_{ij}=\dfrac{1}{4i}$ for $1\le j\le i\le4$, and 0 when $j>i$:

| $X$ \ $Y$ | 1 | 2 | 3 | 4 | $p_{i\cdot}$ |
| --- | --- | --- | --- | --- | --- |
| 1 | $1/4$ | 0 | 0 | 0 | $1/4$ |
| 2 | $1/8$ | $1/8$ | 0 | 0 | $1/4$ |
| 3 | $1/12$ | $1/12$ | $1/12$ | 0 | $1/4$ |
| 4 | $1/16$ | $1/16$ | $1/16$ | $1/16$ | $1/4$ |
| $p_{\cdot j}$ | $25/48$ | $13/48$ | $7/48$ | $3/48$ | $1$ |

== Column sums ==
$p_{\cdot1}=\tfrac14+\tfrac18+\tfrac1{12}+\tfrac1{16}=\tfrac{12+6+4+3}{48}=\tfrac{25}{48}$,
$p_{\cdot2}=\tfrac{6+4+3}{48}=\tfrac{13}{48}$, $p_{\cdot3}=\tfrac{4+3}{48}=\tfrac7{48}$,
$p_{\cdot4}=\tfrac3{48}=\tfrac1{16}$. They add to $\tfrac{48}{48}=1$. ✓
:::

The slide stops at the multiplication rule; the table above completes it. Notice that
$X$ is uniform but $Y$ isn't: small values of $Y$ are possible whatever $X$ is, so they
pile up.

::: plot Marginal laws in the example: X (uniform) and Y (skewed to small values)
x: 1 .. 4
xlabel: k
bars P(k) = 1/4
bars Q(k) = (min(1, max(0, 2 - k)) + min(1, max(0, 3 - k))/2 + min(1, max(0, 4 - k))/3 + min(1, max(0, 5 - k))/4) / 4
:::

($P$ is $P\{X=k\}$, $Q$ is $P\{Y=k\}=\tfrac14\sum_{i=k}^{4}\tfrac1i$.)

### From marginals plus one condition

A favourite exercise gives the two marginal laws and **one extra fact**, and asks for the
joint table. The extra fact forces some cells to 0; the margins then fill in the rest,
like a Sudoku.

::: example Marginals, and X = Y is impossible
$P\{X=0\}=P\{X=1\}=\tfrac12$; $Y$ takes 0, 1, 2 with probability $\tfrac13$ each; and
$\{X=Y\}$ is impossible. Find the joint law.
== The zeros ==
$P\{X=Y\}=P\{X=0,Y=0\}+P\{X=1,Y=1\}=0$, and both cells are $\ge0$, so both are 0.
== Columns 0 and 1 ==
Column $Y=0$ sums to $\tfrac13$ and its $X=0$ cell is 0, so $P\{X=1,Y=0\}=\tfrac13$.
Likewise $P\{X=0,Y=1\}=\tfrac13$.
== Column 2, from the rows ==
Row $X=0$: $0+\tfrac13+p=\tfrac12$ gives $P\{X=0,Y=2\}=\tfrac16$; row $X=1$ gives
$P\{X=1,Y=2\}=\tfrac16$ too. Check column 2: $\tfrac16+\tfrac16=\tfrac13$. ✓

| $X$ \ $Y$ | 0 | 1 | 2 | $p_{i\cdot}$ |
| --- | --- | --- | --- | --- |
| 0 | 0 | $1/3$ | $1/6$ | $1/2$ |
| 1 | $1/3$ | 0 | $1/6$ | $1/2$ |
| $p_{\cdot j}$ | $1/3$ | $1/3$ | $1/3$ | $1$ |
:::

::: example Marginals, and P{XY = 0} = 1
$X$ takes $-1,0,1$ with probabilities $\tfrac14,\tfrac12,\tfrac14$; $Y$ takes 0, 1 with
probability $\tfrac12$ each; and $P\{XY=0\}=1$. Find the joint law.
== The zeros ==
$P\{XY=0\}=1$ means $P\{XY\ne0\}=0$. The product is non-zero only when $X\ne0$ and
$Y\ne0$: $P\{X=-1,Y=1\}+P\{X=1,Y=1\}=0$, so both cells are 0.
== Column Y = 1 ==
It sums to $\tfrac12$ and only the $X=0$ cell is left: $P\{X=0,Y=1\}=\tfrac12$.
== The rest ==
Row $X=0$ already has its $\tfrac12$, so $P\{X=0,Y=0\}=0$; rows $X=\pm1$ put their
$\tfrac14$ in column 0.

| $X$ \ $Y$ | 0 | 1 | $p_{i\cdot}$ |
| --- | --- | --- | --- |
| $-1$ | $1/4$ | 0 | $1/4$ |
| 0 | 0 | $1/2$ | $1/2$ |
| 1 | $1/4$ | 0 | $1/4$ |
| $p_{\cdot j}$ | $1/2$ | $1/2$ | $1$ |
:::

(The slide draws this table with $Y$ down the side and $X$ across the top; the cells are
the same.)

::: callout pitfall Same marginals, different joint laws
In the "X = Y impossible" example, the margins alone would also fit the table with every
cell $\tfrac12\cdot\tfrac13=\tfrac16$. That table has $P\{X=Y\}=\tfrac13$, not 0. The
margins don't fix the inside of the table: always use the extra condition.
:::

::: callout exam What exams ask
"Given the marginals and one condition ($P\{X=Y\}=0$, $P\{XY=0\}=1$, $P\{XY=1\}=\dots$),
find the joint law, then a probability like $P\{X=Y\}$." Turn the condition into zero
(or known) cells first, then fill rows and columns from the margins, and finish by
checking that every row, every column and the whole table add up.
:::

## Summary

::: callout summary The lesson in five lines
- $(X,Y)$ is two random variables read off the same outcome.
- $F(x,y)=P\{X\le x,Y\le y\}$: a quadrant; bounded by 0 and 1, non-decreasing and
  right-continuous in each variable, and every rectangle gets
  $F(x_2,y_2)-F(x_1,y_2)-F(x_2,y_1)+F(x_1,y_1)\ge0$.
- Marginals: $F_X(x)=F(x,+\infty)$, $F_Y(y)=F(+\infty,y)$.
- Discrete: $p_{ij}\ge0$, $\sum\sum p_{ij}=1$; row sums $p_{i\cdot}$, column sums $p_{\cdot j}$.
- Joint determines the marginals; marginals don't determine the joint.
:::

::: cards Joint distributions
Two-dimensional random variable (二维随机变量) :: A pair $(X,Y)$ of random variables defined on the same sample space
Joint distribution function $F(x,y)$ :: $P\{X\le x,\ Y\le y\}$: the probability of the quadrant left of $x$ and below $y$
$F(-\infty,y)$, $F(x,-\infty)$, $F(+\infty,+\infty)$ :: $0$, $0$ and $1$
Is $F(+\infty,y)$ equal to 1? :: No: it is $F_Y(y)=P\{Y\le y\}$
Monotonicity and continuity of $F(x,y)$ :: Non-decreasing and right-continuous in each variable separately
$P\{x_1<X\le x_2,\ y_1<Y\le y_2\}$ :: $F(x_2,y_2)-F(x_1,y_2)-F(x_2,y_1)+F(x_1,y_1)$
Which property rules out $F=1$ on $x+y\ge0$, 0 otherwise? :: Property 4: some rectangle gets negative probability
Marginal distribution function $F_X(x)$ :: $F(x,+\infty)=\lim_{y\to+\infty}F(x,y)$
Joint distribution law (联合分布列) :: $p_{ij}=P\{X=x_i,\ Y=y_j\}$, with $p_{ij}\ge0$ and $\sum_i\sum_j p_{ij}=1$
Marginal law $p_{i\cdot}$ :: $P\{X=x_i\}=\sum_j p_{ij}$, the row sum
Marginal law $p_{\cdot j}$ :: $P\{Y=y_j\}=\sum_i p_{ij}$, the column sum
Do the marginals determine the joint law? :: No: the joint law determines the marginals, not the other way round
Constants in $A(B+\arctan x)(\tfrac\pi2+\arctan y)$ :: $B=\tfrac\pi2$ from $F(-\infty,y)=0$; $A=\tfrac1{\pi^2}$ from $F(+\infty,+\infty)=1$
:::

::: quiz Joint distributions
? Which of these **cannot** be the distribution function of a random vector $(X,Y)$?
- [ ] $F_1=(1-e^{-x})(1-e^{-y})$ for $x>0,y>0$, and 0 otherwise
- [ ] $F_2=\frac{1}{\pi^2}\left(\frac{\pi}{2}+\arctan\frac{x}{2}\right)\left(\frac{\pi}{2}+\arctan\frac{y}{3}\right)$
- [x] $F_3=1$ when $x+2y\ge1$, and 0 when $x+2y<1$
- [ ] $F_4=1-2^{-x}-2^{-y}+2^{-x-y}$ for $x>0,y>0$, and 0 otherwise
> $F_3$ fails property 4. Take $x_1=0,x_2=2,y_1=0,y_2=1$:
> $F(2,1)-F(0,1)-F(2,0)+F(0,0)=1-1-1+0=-1<0$. The others are products of
> one-dimensional distribution functions: $F_4=(1-2^{-x})(1-2^{-y})$, and $F_2$ is a
> product of arctan distribution functions. (In-class question, answer C.)

? $(X,Y)$ has the joint law with first row $\frac16,\frac19,\frac1{18}$ and second row $\frac13, a, b$ (columns $Y=1,2,3$). What must hold?
- [x] $a+b=\frac13$
- [ ] $a+b=1$
- [ ] $a+b=\frac23$
- [ ] $a=\frac12,\ b=-\frac32$
> The known cells total $\frac16+\frac19+\frac1{18}+\frac13=\frac13+\frac13=\frac23$, and the
> table sums to 1, so $a+b=\frac13$ (with $a,b\ge0$). (In-class question, answer A.)

? $P\{X=1\}=P\{X=0\}=\frac12$, $P\{Y=1\}=\frac34$, $P\{Y=0\}=\frac14$, and $P\{XY=1\}=\frac12$. Find $P\{X=Y\}$.
answer: 3/4
> $XY=1$ only when $X=1,Y=1$, so $p(1,1)=\frac12$. Row $X=1$: $p(1,0)=\frac12-\frac12=0$.
> Column $Y=1$: $p(0,1)=\frac34-\frac12=\frac14$. Row $X=0$: $p(0,0)=\frac12-\frac14=\frac14$.
> $P\{X=Y\}=p(1,1)+p(0,0)=\frac12+\frac14=\frac34$. (In-class question, answer C.)

? $X_1$ and $X_2$ each take $-1,0,1$ with probabilities $\frac14,\frac12,\frac14$, and $P\{X_1X_2=0\}=1$. Find $P\{X_1=X_2\}$.
answer: 0
tolerance: 0.001
> $P\{X_1X_2\ne0\}=0$ makes the four corner cells $(\pm1,\pm1)$ zero. Then the margins give
> $p(-1,0)=p(1,0)=\frac14$ and $p(0,-1)=p(0,1)=\frac14$, so $p(0,0)=\frac12-\frac14-\frac14=0$.
> $P\{X_1=X_2\}=p(-1,-1)+p(0,0)+p(1,1)=0$. (In-class question, answer A.)

? For $F(x,y)=\frac{1}{\pi^2}\left(\frac\pi2+\arctan x\right)\left(\frac\pi2+\arctan y\right)$, what is $F(0,0)=P\{X\le0,Y\le0\}$?
answer: 1/4
> $\arctan0=0$, so $F(0,0)=\frac{1}{\pi^2}\cdot\frac\pi2\cdot\frac\pi2=\frac14$.

? $F(x,y)=(1-e^{-x})(1-e^{-y})$ for $x>0,y>0$ (0 otherwise). Find $P\{1<X\le2,\ 1<Y\le2\}$.
answer: (e^(-1) - e^(-2))^2
tolerance: 0.5%
> Rectangle formula: $F(2,2)-F(1,2)-F(2,1)+F(1,1)$. Since $F$ factors, this is
> $\big[(1-e^{-2})-(1-e^{-1})\big]^2=(e^{-1}-e^{-2})^2\approx0.0539$.

? For $F(x,y)=1-2^{-x}-2^{-y}+2^{-x-y}$ ($x>0,y>0$; 0 otherwise), give the marginal $F_X(x)$ for $x>0$.
expression: 1 - 2^(-x)
variables: x
> $F_X(x)=\lim_{y\to+\infty}F(x,y)$: $2^{-y}\to0$ and $2^{-x-y}\to0$, leaving $1-2^{-x}$.

? $X$ is uniform on $\{1,2,3,4\}$ and then $Y$ uniform on $\{1,\dots,X\}$. Find $P\{Y=2\}$.
answer: 13/48
> $P\{Y=2\}=\sum_{i=2}^4\frac1{4i}=\frac18+\frac1{12}+\frac1{16}=\frac{6+4+3}{48}=\frac{13}{48}$.

? In a joint table, $P\{X=x_i\}$ is found by adding which cells?
- [x] All cells in row $i$ (over every $y_j$)
- [ ] All cells in column $i$
- [ ] Only the diagonal cell $p_{ii}$
- [ ] All cells of the table
> $\{X=x_i\}$ is the disjoint union of $\{X=x_i,Y=y_j\}$ over all $j$, so
> $p_{i\cdot}=\sum_j p_{ij}$ — the row sum (when $X$ labels the rows).
:::

---
title: Functions of two discrete random variables
zh: 二维离散型随机变量函数的分布
summary: The law of Z = g(X, Y) when X and Y are discrete — reading it off a joint table, sums of independent variables by convolution, the maximum, and why Poisson plus Poisson is Poisson and binomial plus binomial (same p) is binomial.
source: 11独立性和函数的分布7-1 (§3.4, discrete part), 2026-10-12
---

## Why functions of two random variables?

Many quantities we care about combine two random numbers: the total score of two dice,
the number of customers at two counters, the larger of two lifetimes, the gap between
two measurements. Each is a function $Z = g(X, Y)$ of a random vector $(X, Y)$, and
it is a random variable of its own. This section of the course (§3.4) asks: **given the
joint distribution of $(X, Y)$, what is the distribution of $Z$?**

For one variable you did this in Unit 2 ($Y = g(X)$). With two, the idea for discrete
variables is the same and needs no new tools: list where $(X, Y)$ can land, compute $Z$
at each point, and collect the probabilities. The continuous case comes in the next
lesson. Two results here are worth memorising for multiple-choice questions: sums of
independent Poisson variables, and of independent binomials with the same $p$.

## Z = g(X, Y) from a joint table

**Intuition.** Every cell of the joint table is one outcome $(x_i, y_j)$ with
probability $p_{ij}$. Write the value $g(x_i, y_j)$ in each cell; then the probability
that $Z$ equals some value is the total of the cells showing that value.

::: example X + Y and |X − Y| from a joint table
$(X, Y)$ has the joint law below. Find the laws of (1) $X + Y$ and (2) $|X - Y|$.

| $X$ \ $Y$ | −2 | −1 | 0 |
| --- | --- | --- | --- |
| $-1$ | $\frac1{12}$ | $\frac1{12}$ | $\frac3{12}$ |
| $\frac12$ | $\frac2{12}$ | $\frac1{12}$ | $0$ |
| $3$ | $\frac2{12}$ | $0$ | $\frac2{12}$ |

== List the points ==
Drop the zero cells and list the seven possible points, each with $Z$ worked out:

| Point $(X,Y)$ | (−1, −2) | (−1, −1) | (−1, 0) | (½, −2) | (½, −1) | (3, −2) | (3, 0) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| $P$ | $\frac1{12}$ | $\frac1{12}$ | $\frac14$ | $\frac16$ | $\frac1{12}$ | $\frac16$ | $\frac16$ |
| $X+Y$ | $-3$ | $-2$ | $-1$ | $-\frac32$ | $-\frac12$ | $1$ | $3$ |
| $\vert X-Y\vert$ | $1$ | $0$ | $1$ | $\frac52$ | $\frac32$ | $5$ | $3$ |
== (1) The law of X + Y ==
All seven values differ, so each keeps its probability (sorted here):

$$\begin{array}{c|ccccccc}
X+Y & -3 & -2 & -\frac32 & -1 & -\frac12 & 1 & 3 \\ \hline
P & \frac1{12} & \frac1{12} & \frac16 & \frac14 & \frac1{12} & \frac16 & \frac16
\end{array}$$
== (2) The law of |X − Y| ==
The value 1 comes from two points, $(-1,-2)$ and $(-1,0)$: add them,
$\frac1{12} + \frac14 = \frac13$.

$$\begin{array}{c|cccccc}
\lvert X-Y\rvert & 0 & 1 & \frac32 & \frac52 & 3 & 5 \\ \hline
P & \frac1{12} & \frac13 & \frac1{12} & \frac16 & \frac16 & \frac16
\end{array}$$
== Check ==
Both laws add up to 1 (in twelfths: $1+1+2+3+1+2+2 = 12$ and $1+4+1+2+2+2 = 12$).
:::

(The slide lists the columns in the order the points came, not sorted; sorting them is
tidier and makes the law easier to read, but either is correct.)

::: theorem Law of a function of a discrete random vector | 离散型随机变量函数的分布
If $P\{X = x_i, Y = y_j\} = p_{ij}$ ($i, j = 1, 2, \ldots$), the law of $Z = g(X, Y)$ is
$$P\{Z = z_k\} = P\{g(X,Y) = z_k\} = \sum_{g(x_i, y_j) = z_k} p_{ij}, \quad k = 1, 2, \ldots$$
the sum of $p_{ij}$ over every cell where $g$ takes the value $z_k$.
:::

::: callout pitfall Merge equal values
The most common slip is leaving a value twice in the answer's table (here, two columns
for $|X - Y| = 1$). A distribution law lists each value **once**, with the total
probability of every way to get it.
:::

## Sums of independent discrete variables

When $X$ and $Y$ are independent and you only know their marginal laws, first build
the joint table by multiplying (Lesson 3.5), then proceed as above.

::: example The sum of two independent variables
$X$ and $Y$ are independent with $P\{X = 1\} = 0.3$, $P\{X = 3\} = 0.7$ and
$P\{Y = 2\} = 0.6$, $P\{Y = 4\} = 0.4$. Find the law of $Z = X + Y$.
== The joint table ==
By independence $p_{ij} = p_{i\cdot}p_{\cdot j}$:

| $X$ \ $Y$ | 2 | 4 |
| --- | --- | --- |
| 1 | 0.18 | 0.12 |
| 3 | 0.42 | 0.28 |
== Values of Z ==
$(1,2) \to 3$ (0.18), $(1,4) \to 5$ (0.12), $(3,2) \to 5$ (0.42), $(3,4) \to 7$ (0.28).
== Merge ==
| Value of $Z = X+Y$ | 3 | 5 | 7 |
| --- | --- | --- | --- |
| $P$ | 0.18 | 0.54 | 0.28 |

$P\{Z = 5\} = 0.12 + 0.42 = 0.54$.
:::

### The maximum of two variables

::: example Z = max(X, Y) for two fair 0–1 variables
$X$ and $Y$ are independent and both take 0 and 1 with probability $0.5$ each. Find the law
of $Z = \max(X, Y)$.
== The joint table ==
Every cell is $\frac12 \cdot \frac12 = \frac14$.
== Which cells give which maximum ==
$\max = 0$ only at $(0,0)$: $P\{Z = 0\} = \frac14$. $\max = 1$ at $(1,0)$, $(0,1)$, $(1,1)$:
$P\{Z = 1\} = \frac34$.
== The law ==
| Value of $Z$ | 0 | 1 |
| --- | --- | --- |
| $P$ | $\frac14$ | $\frac34$ |

The maximum is 0 only if **both** are 0 — the shortcut $P\{\max(X,Y) \le z\} = P\{X \le z\}P\{Y \le z\}$
for independent variables, which the lecture will develop for $\max$ and $\min$ later.
:::

## The convolution sum

For variables taking the values $0, 1, 2, \ldots$, the event $\{X + Y = m\}$ splits by
the value of $X$: $X = 0$ and $Y = m$, or $X = 1$ and $Y = m - 1$, …, or $X = m$ and
$Y = 0$. These are mutually exclusive, so their probabilities add; by independence,
each is a product.

::: formula Discrete convolution | 离散卷积公式
$$P\{X + Y = m\} = \sum_{k=0}^{m} P\{X = k\}\,P\{Y = m - k\} = a_0 b_m + a_1 b_{m-1} + \cdots + a_m b_0, \quad m = 0, 1, 2, \ldots$$
--
a_k | $P\{X = k\}$, $k = 0, 1, 2, \ldots$ |
b_l | $P\{Y = l\}$, $l = 0, 1, 2, \ldots$ |
m | the value of $Z = X + Y$ |
:::

It needs $X$ and $Y$ **independent** (that's what turns $P\{X = k, Y = m-k\}$ into a
product) and taking values $0, 1, 2, \ldots$ (so $k$ runs from 0 to $m$). Without
independence, use $\sum_k P\{X = k, Y = m - k\}$ from the joint law.

::: example A small convolution
$X \sim B(2, \frac12)$ and $Y \sim B(1, \frac12)$ are independent:
$a = (\frac14, \frac12, \frac14)$ and $b = (\frac12, \frac12)$. Find the law of $X + Y$.
== m = 0 and m = 3 ==
$P\{Z = 0\} = a_0b_0 = \frac18$, $P\{Z = 3\} = a_2b_1 = \frac18$.
== m = 1 and m = 2 ==
$P\{Z = 1\} = a_0b_1 + a_1b_0 = \frac18 + \frac14 = \frac38$;
$P\{Z = 2\} = a_1b_1 + a_2b_0 = \frac14 + \frac18 = \frac38$.
== Recognise it ==
$\frac18, \frac38, \frac38, \frac18$ is the law of $B(3, \frac12)$ — as the binomial
result below predicts.
:::

## Poisson + Poisson = Poisson

::: theorem Sum of independent Poisson variables | 泊松分布的可加性
If $X \sim P(\lambda_1)$ and $Y \sim P(\lambda_2)$ are independent, then
$X + Y \sim P(\lambda_1 + \lambda_2)$.
:::

::: example Proving the Poisson result with the convolution sum
$P\{X = i\} = \frac{e^{-\lambda_1}\lambda_1^i}{i!}$ and $P\{Y = j\} = \frac{e^{-\lambda_2}\lambda_2^j}{j!}$ ($i, j = 0, 1, 2, \ldots$). Find the law of $Z = X + Y$.
== Convolve ==
$$P\{Z = k\} = \sum_{i=0}^{k} \frac{e^{-\lambda_1}\lambda_1^i}{i!} \cdot \frac{e^{-\lambda_2}\lambda_2^{k-i}}{(k-i)!}$$
== Make a binomial coefficient ==
Take $e^{-(\lambda_1+\lambda_2)}$ out and multiply and divide by $k!$:
$$P\{Z = k\} = \frac{e^{-(\lambda_1+\lambda_2)}}{k!} \sum_{i=0}^{k} \frac{k!}{i!(k-i)!}\lambda_1^i \lambda_2^{k-i}$$
== The binomial theorem ==
The sum is $(\lambda_1 + \lambda_2)^k$, so
$$P\{Z = k\} = \frac{(\lambda_1 + \lambda_2)^k}{k!} e^{-(\lambda_1+\lambda_2)}, \quad k = 0, 1, 2, \ldots$$
That is $Z \sim P(\lambda_1 + \lambda_2)$.
:::

**Intuition.** A Poisson count is the number of rare events in a period: calls to one
switchboard, say. Two independent switchboards together receive calls at the combined
rate, and the total count is again Poisson.

::: plot Poisson sums: X ~ P(λ₁) and X + Y ~ P(λ₁ + λ₂)
x: 0 .. 20
xlabel: k
bars X(k) = e^(-a) a^k / k!
bars Z(k) = e^(-(a + b)) (a + b)^k / k!
slider a: 0.5 .. 8 = 2
slider b: 0.5 .. 8 = 3
:::

::: example Calls at two counters
Counter A gets $X \sim P(1)$ customers in an hour and counter B independently gets
$Y \sim P(2)$. Find the probability of exactly 2 customers in total.
== Use the theorem ==
$X + Y \sim P(3)$, so $P\{X + Y = 2\} = \frac{3^2}{2!}e^{-3} = 4.5e^{-3} \approx 0.224$.
== Check by convolution ==
$e^{-1} \cdot \frac{2^2}{2}e^{-2} + e^{-1} \cdot 2e^{-2} + \frac12 e^{-1} \cdot e^{-2} = (2 + 2 + \frac12)e^{-3} = 4.5e^{-3}$. ✓
:::

## Binomial + binomial with the same p

::: theorem Sum of independent binomials | 二项分布的可加性
If $X \sim B(n_1, p)$ and $Y \sim B(n_2, p)$ are independent (the **same** $p$), then
$X + Y \sim B(n_1 + n_2, p)$.
:::

**Why.** $X$ counts the successes in $n_1$ independent trials and $Y$ in $n_2$ more, all
with success probability $p$. Together that's the number of successes in $n_1 + n_2$
independent trials with the same $p$: binomial. (The convolution sum proves it too,
with Vandermonde's identity $\sum_k \binom{n_1}{k}\binom{n_2}{m-k} = \binom{n_1+n_2}{m}$;
the binomial coefficient $\binom nk$ is the slides' $C_n^k$.) The textbook's Example
3.19 (p. 79) works it through; the lecture says to remember the conclusion for choice
questions.

::: plot B(n₁ + n₂, p): the law of X + Y
x: 0 .. 40
xlabel: k
bars Z(k) = comb(n + m, k) p^k (1 - p)^(n + m - k)
slider n: 1 .. 20 = 8 | | step 1
slider m: 1 .. 20 = 12 | | step 1
slider p: 0.05 .. 0.95 = 0.3
:::

::: callout pitfall Same p, and sums only
$B(n_1, p_1) + B(n_2, p_2)$ with $p_1 \ne p_2$ is **not** binomial (the trials no
longer share one success probability), and $p$ never doubles: $B(n_1 + n_2, 2p)$ is a
classic wrong option. Likewise the difference of two independent Poisson variables is
not Poisson (it can be negative).
:::

::: callout key The one idea
For discrete $(X, Y)$: compute $g$ at every possible point and add the probabilities of
points with the same value. For an independent sum this becomes the convolution
$\sum_k a_k b_{m-k}$.
:::

::: callout exam For the exam
Expect a joint table and "find the law of $X + Y$ (or $XY$, $|X - Y|$, $\max$, $\min$)";
independent marginals that you first multiply into a table; and choice questions on
$P(\lambda_1) + P(\lambda_2)$ and $B(n_1, p) + B(n_2, p)$ (slide 16-038: answer
$B(n_1 + n_2, p)$).
:::

::: cards Functions of discrete random vectors
Law of $Z = g(X,Y)$ (discrete) :: $P\{Z = z_k\} = \sum_{g(x_i,y_j) = z_k} p_{ij}$
Discrete convolution (independent, values $0, 1, \ldots$) :: $P\{X+Y = m\} = \sum_{k=0}^m P\{X = k\}P\{Y = m-k\}$
$P(\lambda_1) + P(\lambda_2)$, independent :: $P(\lambda_1 + \lambda_2)$
$B(n_1, p) + B(n_2, p)$, independent :: $B(n_1 + n_2, p)$ — same $p$ needed
$B(n_1,p_1) + B(n_2,p_2)$ with $p_1 \ne p_2$ :: Not binomial
Max of two independent fair 0–1 variables :: $P\{\max = 0\} = \frac14$, $P\{\max = 1\} = \frac34$
Two points give the same value of $Z$ :: Add their probabilities: list each value once
Independent $X$, $Y$ given by marginals: first step :: Build the joint table, $p_{ij} = p_{i\cdot}p_{\cdot j}$
:::

::: quiz Check yourself
? In the first example's joint table, find $P\{X + Y = -1\}$.
answer: 1/4
> Only $(-1, 0)$ gives $-1$: probability $\frac3{12} = \frac14$.

? Same table: find $P\{|X - Y| = 1\}$.
answer: 1/3
> Two points give 1: $(-1,-2)$ with $\frac1{12}$ and $(-1,0)$ with $\frac14$; together $\frac13$.

? Same table: find $P\{XY = 0\}$.
answer: 5/12
> $XY = 0$ when $Y = 0$ (no $X$ is 0): $\frac3{12} + 0 + \frac2{12} = \frac5{12}$.

? $X \in \{1, 3\}$ with $0.3, 0.7$ and $Y \in \{2, 4\}$ with $0.6, 0.4$, independent. Find $P\{X + Y = 5\}$.
answer: 0.54
> $(1,4)$: $0.3 \times 0.4 = 0.12$; $(3,2)$: $0.7 \times 0.6 = 0.42$; total $0.54$.

? $X$, $Y$ independent fair 0–1 variables. Find $P\{\min(X, Y) = 1\}$.
answer: 1/4
> The minimum is 1 only when both are 1: $\frac12 \cdot \frac12 = \frac14$.

? $X \sim P(1)$ and $Y \sim P(2)$ are independent. Find $P\{X + Y = 0\}$.
answer: e^(-3)
> $X + Y \sim P(3)$: $P\{X + Y = 0\} = e^{-3} \approx 0.0498$ (also $P\{X=0\}P\{Y=0\} = e^{-1}e^{-2}$).

? $X \sim P(1)$ and $Y \sim P(2)$ are independent. Find $P\{X + Y = 2\}$.
answer: 4.5 e^(-3)
> $P(3)$ at $k = 2$: $\frac{3^2}{2!}e^{-3} = 4.5e^{-3} \approx 0.224$.

? (Slide 16-038) $X \sim B(n_1, p)$ and $Y \sim B(n_2, p)$ are independent. Then $X + Y \sim$ …
- [x] $B(n_1 + n_2, p)$
- [ ] $B(n_1 + n_2, 2p)$
- [ ] $B(\frac{n_1+n_2}{2}, p)$
- [ ] $B(\frac{n_1+n_2}{2}, 2p)$
> $n_1 + n_2$ independent trials, each succeeding with probability $p$: $B(n_1 + n_2, p)$ (A).

? $X \sim B(3, 0.4)$ and $Y \sim B(2, 0.4)$ are independent. Find $P\{X + Y = 2\}$.
answer: C(5,2) 0.4^2 0.6^3
> $X + Y \sim B(5, 0.4)$: $\binom52 0.4^2 0.6^3 = 10 \times 0.16 \times 0.216 = 0.3456$.

? Which need **independence** of $X$ and $Y$?
- [x] The convolution sum $P\{X+Y=m\} = \sum_k P\{X=k\}P\{Y=m-k\}$
- [x] $P(\lambda_1) + P(\lambda_2) = P(\lambda_1+\lambda_2)$
- [ ] $P\{Z = z_k\} = \sum_{g(x_i,y_j)=z_k} p_{ij}$ from a joint table
> The joint-table rule works for any joint law. The convolution splits $P\{X = k, Y = m-k\}$ into a product, which needs independence, and the Poisson result is built on it.
:::

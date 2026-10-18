---
title: Random variables and discrete distributions
zh: 随机变量与离散型分布
summary: What a random variable is, how a distribution law describes a discrete one, and the four common discrete distributions — two-point, binomial, Poisson and geometric — with how they relate.
source: 4独立试验序列2-2 (§2.1 part) and 5随机变量3-1, 2026-09-09 → 09-14
---

Chapter 1 worked with events one at a time: "the second ball is red", "at least one
gun hits". That gets clumsy fast. This lesson turns the outcome of an experiment into a
**number**, a random variable, so that a whole family of events becomes one object
($\{X = 0\}$, $\{X = 1\}$, $\{X \ge 2\}$, …) and its whole behaviour fits in one table:
the distribution law. Then it meets the four discrete distributions that turn up again
and again in exercises and exams — two-point, binomial, Poisson and geometric — and how
they grow out of each other.

## Why turn outcomes into numbers

Some experiments already produce numbers: the points on a die, how many people get off
the train at Weihai each day, how many eggs an insect lays, the highest temperature in
September. Others don't: a coin shows heads or tails, and $\Omega = \{\text{heads},
\text{tails}\}$ contains words, not numbers. But we can *code* the outcomes: heads → 1,
tails → 0. Now "the coin shows heads" is "the code equals 1".

That coding is a function: it takes each outcome $e$ of the experiment and gives back a
real number $X(e)$. Before the experiment we know the values $X$ *could* take, but not
which one it *will* take; and since outcomes happen with certain probabilities, the
values of $X$ do too.

::: define Random variable | 随机变量
Let $E$ be a random experiment with sample space $S = \{e\}$ (also written $\Omega$). If
every outcome $e \in S$ is given one real number $X(e)$, the single-valued real
function $X(e)$ defined on $S$ is called a random variable, abbreviated **r.v.**
:::

Random variables are written with capital letters $X, Y, Z$ (or Greek letters
$\xi, \eta$); the values they take are written with small letters $x, y, z$. So
$\{X = x\}$ reads "the random variable $X$ takes the value $x$".

### How it differs from an ordinary function

A random variable *is* a function, but not the kind from calculus:

- An ordinary function is defined on (part of) the real line; a random variable is
  defined on the **sample space**, whose points are outcomes (heads, a hand of cards, a
  student picked at random).
- An ordinary function's value is fixed once you know $x$; a random variable's value
  depends on which outcome the experiment produces, so it follows **probability
  rules**: some values are more likely than others.

### Events are statements about X

With a random variable, events become relations about it. Pick a student at random and
let $X$ be their height in metres; then we can ask $P\{X > 1.7\}$,
$P\{X \le 1.5\}$, $P\{1.5 < X < 1.7\}$. Let $X$ be the number of calls a telephone
exchange gets in one minute; then

$$\{\text{at least one call}\} = \{X \ge 1\}.$$

In general, for any set $I$ of numbers, $\{X \in I\} = \{e : X(e) \in I\}$ is an event:
the outcomes whose number lands in $I$. So random events are a special case of the
wider idea: events look at chance "statically", one at a time, while a random variable
looks at it "dynamically", all its values together. Introducing random variables was a
turning point in probability: from studying events and their probabilities to
studying random variables and the rules of their values.

### Two kinds

::: define Discrete random variable | 离散型随机变量
A random variable whose possible values can be listed: finitely many, or a sequence
$x_1, x_2, \ldots$ ("countably many"). Examples: the number of defective items drawn,
the number of calls received.
:::

The other kind, the **continuous** random variable ({{zh 连续型随机变量}}), takes every
value in an interval: the lifetime of a television, a measurement error. Its theory
needs integrals and comes in Lesson 2.3.

## The distribution law

To describe a discrete $X$ it isn't enough to know which values it can take: we also
need **how likely each one is**.

::: define Distribution law | 分布列
If a discrete random variable $X$ takes the values $x_k$ $(k = 1, 2, \ldots)$, the
probabilities of the events $\{X = x_k\}$,
$$P\{X = x_k\} = p_k, \qquad k = 1, 2, \ldots,$$
are the distribution law of $X$ (also called its {{term probability distribution | 分布律}},
or probability mass function).
:::

::: theorem Properties of a distribution law | 分布列的性质
(1) $p_k \ge 0$ for every $k$; (2) $\displaystyle\sum_k p_k = 1$ (normalisation,
{{zh 归一性}}). Any list of numbers with both properties is the distribution law of some
random variable.
:::

The second property holds because the events $\{X = x_1\}, \{X = x_2\}, \ldots$ are
mutually exclusive and together make up the whole sample space. The law is usually
written as a table, or as a two-row matrix:

$$X \sim \begin{pmatrix} x_1 & x_2 & \cdots & x_n & \cdots \\ p_1 & p_2 & \cdots & p_n & \cdots \end{pmatrix}$$

| $X$   | $x_1$ | $x_2$ | $\cdots$ | $x_n$ | $\cdots$ |
| ----- | ----- | ----- | -------- | ----- | -------- |
| $p_k$ | $p_1$ | $p_2$ | $\cdots$ | $p_n$ | $\cdots$ |

::: example Drawing balls until a red one (例1)
A bag holds 10 balls: 7 red and 3 white. Draw one at a time until you get a red ball;
$X$ is the number of draws. Find the law of $X$ (1) without replacement, (2) with
replacement.
== Without replacement ==
There are only 3 white balls, so $X \in \{1, 2, 3, 4\}$. $X = k$ means $k - 1$ whites,
then a red (multiplication rule, Lesson 1.4):
$$P\{X=1\} = \tfrac{7}{10},\quad P\{X=2\} = \tfrac{3}{10}\cdot\tfrac{7}{9} = \tfrac{7}{30},\quad P\{X=3\} = \tfrac{3}{10}\cdot\tfrac{2}{9}\cdot\tfrac{7}{8} = \tfrac{7}{120},\quad P\{X=4\} = \tfrac{3}{10}\cdot\tfrac{2}{9}\cdot\tfrac{1}{8}\cdot 1 = \tfrac{1}{120}.$$

| $X$   | 1                | 2                | 3                 | 4                 |
| ----- | ---------------- | ---------------- | ----------------- | ----------------- |
| $p_k$ | $\frac{7}{10}$ | $\frac{7}{30}$ | $\frac{7}{120}$ | $\frac{1}{120}$ |

Check: $\frac{84 + 28 + 7 + 1}{120} = 1$.
== With replacement ==
Each draw is red with probability $\frac{7}{10}$ whatever came before, and $X$ can be
any whole number $\ge 1$:
$$P\{X = k\} = \left(\tfrac{3}{10}\right)^{k-1}\tfrac{7}{10}, \qquad k = 1, 2, 3, \ldots$$
(This is the geometric distribution below.)
:::

::: example Traffic lights (例2)
On the way to the station a bus passes 3 traffic lights, each red or green with
probability $\frac12$, independently. (1) $X$ = the number of lights passed when the bus
first stops at a red (or reaches the station). (2) $Y$ = the number of red lights met.
Find both laws.
== X ==
$X = 0$: the first light is red. $X = 1$: green, then red. $X = 2$: green, green, red.
$X = 3$: all three green.

| $X$   | 0             | 1             | 2             | 3             |
| ----- | ------------- | ------------- | ------------- | ------------- |
| $p_k$ | $\frac{1}{2}$ | $\frac{1}{4}$ | $\frac{1}{8}$ | $\frac{1}{8}$ |

== Y ==
The three lights are three independent trials with "red" probability $\frac12$, so
(the binomial formula, Lesson 1.7)
$$P\{Y = k\} = C_3^k \left(\tfrac12\right)^k \left(\tfrac12\right)^{3-k}, \qquad k = 0, 1, 2, 3,$$
that is $\frac18, \frac38, \frac38, \frac18$.
:::

::: callout note Slide typo
The slide labels the solution of part (2) "(1)". It is the solution for $Y$.
:::

::: plot The traffic-light variables X and Y
x: -0.5 .. 3.5
xlabel: k
bars X(k) = 2^(-(min(k, 2) + 1))
bars Y(k) = comb(3, k) / 8
:::

::: example Finding a constant (例3)
$P\{X = k\} = \dfrac{A}{k(k+1)}$, $k = 1, 2, \ldots$ Find $A$.
== Use normalisation ==
$\sum_{k\ge1} \frac{A}{k(k+1)} = 1$. Split $\frac{1}{k(k+1)} = \frac1k - \frac1{k+1}$, so
the series telescopes ({{zh 裂项相消}}):
$$A \sum_{k=1}^{\infty}\left(\frac1k - \frac1{k+1}\right) = A \lim_{n\to\infty}\left(1 - \frac{1}{n+1}\right) = A = 1.$$
So $A = 1$.
:::

::: callout key The one idea
A discrete random variable is completely described by its distribution law: the values
and their probabilities, all $\ge 0$ and adding up to 1. "Find a constant" questions
are always solved with $\sum p_k = 1$.
:::

## Common discrete distributions

### The two-point (0–1) distribution

The simplest random variable answers a yes/no question: did the coin show heads, is
the item defective, did the shot hit? Code yes as 1 and no as 0.

::: define Two-point distribution | 两点分布
$X$ takes only the values 0 and 1, with $P\{X = 1\} = p$ and $P\{X = 0\} = 1 - p$
($0 < p < 1$). Also called the (0–1) distribution ({{zh (0—1)分布}}) or Bernoulli
distribution.
:::

::: formula Two-point distribution | 两点分布
$$P\{X = k\} = p^k (1-p)^{1-k}, \qquad k = 0, 1$$
--
p | probability of the value 1 ("success") |
k | the value, 0 or 1 |
:::

| $X$   | 0       | 1   |
| ----- | ------- | --- |
| $p_k$ | $1 - p$ | $p$ |

The one-line formula is worth remembering (the slide says so): put $k = 1$ and you get
$p$, put $k = 0$ and you get $1 - p$.

### The binomial distribution

Repeat a yes/no trial $n$ times independently (the $n$-fold Bernoulli trials of
Lesson 1.7) and count the successes. The count is a random variable with values
$0, 1, \ldots, n$, and Lesson 1.7 already found its probabilities.

::: define Binomial distribution | 二项分布
$X$ takes the values $0, 1, \ldots, n$ with
$P\{X = k\} = C_n^k p^k (1-p)^{n-k}$. We say $X$ follows the binomial distribution
with parameters $n$ and $p$ and write $X \sim B(n, p)$. The number of successes in $n$
Bernoulli trials with success probability $p$ is $B(n, p)$.
:::

The formula itself is the binomial formula of Lesson 1.7, where it was derived from
the $C_n^k$ ways of choosing which $k$ of the $n$ trials succeed.

$C_n^k$ and $\binom nk$ are two notations for the same number; the slides use both.
With $n = 1$ the binomial is the two-point distribution: $B(1, p)$. Move the sliders to
see the shape: the bars pile up around $np$, symmetric when $p = \frac12$, leaning left
for small $p$.

::: plot The binomial distribution B(n, p)
x: 0 .. 20
xlabel: k
ylabel: P{X = k}
bars P(k) = comb(n, k) p^k (1 - p)^(n - k)
slider n: 1 .. 20 = 10 | | step 1
slider p: 0.05 .. 0.95 = 0.3
:::

::: example Two binomials with the same p (in-class question)
$X \sim B(2, p)$, $Y \sim B(3, p)$ and $P\{X \ge 1\} = \frac59$. Find $P\{Y \ge 1\}$.
== Find p from X ==
"At least one" is the complement of "none":
$P\{X \ge 1\} = 1 - (1-p)^2 = \frac59$, so $(1-p)^2 = \frac49$, $1 - p = \frac23$,
$p = \frac13$.
== Then Y ==
$P\{Y \ge 1\} = 1 - (1-p)^3 = 1 - \frac{8}{27} = \frac{19}{27}$.
:::

### The Poisson distribution

Some counts have no fixed number of trials: the number of particles a radioactive
source gives off in 7.5 seconds, calls to an exchange in a minute, customers entering a
shop in an hour, earthquakes in a year. Think of the time split into a huge number $n$
of tiny pieces, each with a tiny chance $p$ of an event: the count is binomial with $n$
huge and $p$ tiny, and only $\lambda = np$, the **average number of events**, matters.
In the limit that gives the Poisson distribution.

::: define Poisson distribution | 泊松分布
$X$ takes the values $0, 1, 2, \ldots$ with
$P\{X = k\} = \dfrac{\lambda^k e^{-\lambda}}{k!}$, where $\lambda > 0$ is a constant. We
write $X \sim P(\lambda)$.
:::

::: formula Poisson distribution | 泊松分布
$$P\{X = k\} = \frac{\lambda^k e^{-\lambda}}{k!}, \qquad k = 0, 1, 2, \ldots$$
--
\lambda | the parameter, $\lambda > 0$: the average count |
k | the count, any whole number $\ge 0$ |
:::

The probabilities add up to 1 because $\sum_k \frac{\lambda^k}{k!} = e^{\lambda}$.
History: early in the twentieth century Rutherford and Geiger counted the particles a
radioactive substance gave off in 2608 periods of 7.5 seconds each, and found the
counts followed the Poisson distribution. Since then it has been the standard model for
counts of rare events in biology, medicine, industrial statistics, insurance and
queues: earthquakes, volcanic eruptions, great floods, customers served, telephone
calls, traffic accidents.

::: plot The Poisson distribution P(λ)
x: 0 .. 20
xlabel: k
ylabel: P{X = k}
bars P(k) = λ^k e^(-λ) / k!
slider λ: 0.2 .. 14 = 2
:::

The slides show $\lambda = 0.6, 2, 6, 14$: as $\lambda$ grows, the peak moves right (it
sits near $\lambda$) and the bars spread out and flatten. Try those values above. (For
$\lambda = 0.6$ the slide's picture cuts the first bar at 0.3; it is really
$e^{-0.6} \approx 0.549$.)

::: example Telephone calls
An exchange receives on average 4 calls a minute, and the number of calls $X$ in a
minute is $P(4)$. Find the probability of (a) at least one call, (b) exactly 4 calls,
(c) at least 3 calls.
== At least one ==
$P\{X \ge 1\} = 1 - P\{X = 0\} = 1 - e^{-4} \approx 0.9817$.
== Exactly four ==
$P\{X = 4\} = \frac{4^4 e^{-4}}{4!} = \frac{256}{24} e^{-4} \approx 0.1954$.
== At least three ==
$P\{X \ge 3\} = 1 - e^{-4}\left(1 + 4 + \frac{16}{2}\right) = 1 - 13e^{-4} \approx 0.7619$.
:::

### The Poisson approximation of the binomial

The Poisson theorem (Lesson 1.7) says that when $n$ is large and $p$ small,
$B(n, p)$ is close to $P(\lambda)$ with $\lambda = np$:

$$C_n^k p^k (1-p)^{n-k} \approx \frac{(np)^k}{k!} e^{-np}, \qquad k = 0, 1, \ldots, n.$$

The rule of thumb on the slides: $n > 10$ and $p < 0.1$. The point is practical: a sum
like $\sum_{k=9}^{300} C_{300}^k\, 0.01^k\, 0.99^{300-k}$ is miserable by hand, but the
Poisson terms are short, and tables of them exist. Compare the two below: with $p$
small the bars almost match; push $p$ up and they separate.

::: plot B(n, p) beside its Poisson approximation P(np)
x: 0 .. 15
xlabel: k
bars B(k) = comb(n, k) p^k (1 - p)^(n - k)
bars P(k) = (n p)^k e^(-n p) / k!
slider n: 5 .. 300 = 100 | | step 1
slider p: 0.005 .. 0.5 = 0.03
:::

::: explore How good is the Poisson approximation?
slider n: 5 .. 500 = 100 | | step 1
slider p: 0.001 .. 0.3 = 0.03
slider k: 0 .. 15 = 2 | | step 1
B = comb(n, k) p^k (1 - p)^(n - k) | | Binomial $P\{X=k\}$
P = (n p)^k e^(-n p) / k! | | Poisson approximation
d = abs(B - P) | | Error
:::

::: example Repairmen for 300 machines (例4)
A workshop has 300 machines of the same kind, working independently, each failing (at a
given moment) with probability 0.01. One failure needs one repairman. (1) At least how
many repairmen $N$ are needed so that the probability of a failure that can't be
repaired at once is below 0.01? (2) If instead each worker looks after 20 machines on
his own, what is the probability that a failure in his group can't be repaired at once?
== Set it up ==
Let $X$ be the number of machines failing at the same moment: $X \sim B(300, 0.01)$. A
failure goes unrepaired when more machines fail than there are repairmen, so we want
the smallest $N$ with $P\{X > N\} < 0.01$.
== Approximate ==
$n = 300$ is large and $p = 0.01$ small: $\lambda = np = 3$, and
$$P\{X > N\} = \sum_{k=N+1}^{300} C_{300}^k\, 0.01^k\, 0.99^{300-k} \approx \sum_{k=N+1}^{\infty} \frac{3^k e^{-3}}{k!}.$$
== Read the table ==
$P\{X > 7\} \approx 0.0119$ (too big), $P\{X > 8\} \approx 0.0038 < 0.01$. So $N = 8$.
(The exact binomial values, 0.0115 and 0.0036, give the same answer.)
== One worker per 20 machines ==
Now $X \sim B(20, 0.01)$, $\lambda = 0.2$, and one worker can only repair one machine, so
the bad event is $X > 1$:
$$P\{X > 1\} = \sum_{k=2}^{20} C_{20}^k\, 0.01^k\, 0.99^{20-k} \approx 1 - e^{-0.2}(1 + 0.2) \approx 0.0175.$$
== Compare ==
15 workers alone (20 machines each) leave a failure unrepaired with probability
$0.0175 > 0.01$; 8 workers sharing all 300 machines (37.5 each on average) bring it
below 0.01. Pooling the work does better with fewer people.
:::

::: callout note Slide typo
In part (2) the slide writes the Poisson sum from $k = N + 1$, left over from part (1);
it should start at $k = 2$. Its value, 0.0175, is right.
:::

### The geometric distribution

Repeat a Bernoulli trial until the first success, and count the trials: "how many
throws until the first six?" The answer can be any whole number $\ge 1$.

::: define Geometric distribution | 几何分布
In Bernoulli trials where event $A$ has probability $p$, let $X$ be the number of trials
up to and including the first time $A$ happens. Then
$P\{X = k\} = (1-p)^{k-1} p$, $k = 1, 2, \ldots$, and we write $X \sim G(p)$.
:::

::: formula Geometric distribution | 几何分布
$$P\{X = k\} = (1-p)^{k-1} p, \qquad k = 1, 2, \ldots$$
--
p | probability of success in each trial |
k | the trial on which the first success comes |
:::

$X = k$ means $k - 1$ failures followed by a success, hence the formula. The
with-replacement case of the balls example is $G(\frac{7}{10})$. The probabilities form
a geometric series, which sums to $\frac{p}{1-(1-p)} = 1$, and every bar is $(1-p)$
times the one before.

::: plot The geometric distribution G(p)
x: 1 .. 15
xlabel: k
bars P(k) = (1 - p)^(k - 1) p
slider p: 0.05 .. 0.9 = 0.3
:::

::: example Waiting for a six
A die is thrown until a six appears; $X$ is the number of throws. Find
$P\{X = 3\}$ and $P\{X > 6\}$.
== Exactly three ==
$X \sim G(\frac16)$: $P\{X = 3\} = \left(\frac56\right)^2 \frac16 = \frac{25}{216} \approx 0.1157$.
== More than six ==
$X > 6$ means the first six throws all fail: $P\{X > 6\} = \left(\frac56\right)^6 \approx 0.3349$.
In general $P\{X > k\} = (1-p)^k$.
:::

::: callout pitfall Two kinds of "count"
Binomial counts **successes in a fixed number** $n$ of trials (values $0$ to $n$);
geometric counts **trials until the first success** (values from 1, no upper limit).
Some books count the *failures* before the first success instead (values from 0): this
course counts the trials, so $P\{X = k\} = (1-p)^{k-1}p$ starting at $k = 1$.
:::

## How they relate

The four distributions are one family:

| From      | Condition                              | To                    |
| --------- | -------------------------------------- | --------------------- |
| $B(n, p)$ | $n = 1$                                | two-point, $B(1, p)$  |
| $B(n, p)$ | $n$ large, $p$ small, $np \to \lambda$ (rule of thumb $n > 10$, $p < 0.1$) | Poisson $P(\lambda)$ |
| Bernoulli trials | count trials until the first success | geometric $G(p)$ |

And the binomial is built out of two-point variables. In $n$ independent Bernoulli
trials with success probability $p$, let

$$X_i = \begin{cases} 1, & \text{trial } i \text{ succeeds} \\ 0, & \text{trial } i \text{ fails} \end{cases} \qquad (i = 1, 2, \ldots, n).$$

Each $X_i$ is two-point with parameter $p$, the $X_i$ are independent, and adding them
counts the successes:

::: theorem Binomial as a sum of two-point variables | 二项分布与两点分布的关系
If $X_1, \ldots, X_n$ are independent and each has the (0–1) distribution with
parameter $p$, then $X = X_1 + X_2 + \cdots + X_n \sim B(n, p)$.
:::

This is why the binomial is called the generalisation of the (0–1) distribution, and it
will make its mean and variance easy to find later.

::: example A counted sum
A shooter hits with probability 0.8 and fires 3 shots independently. Find the
probability of at most one hit.
== Model ==
The number of hits is $X = X_1 + X_2 + X_3 \sim B(3, 0.8)$.
== Compute ==
$P\{X \le 1\} = 0.2^3 + C_3^1 \cdot 0.8 \cdot 0.2^2 = 0.008 + 0.096 = 0.104$.
:::

::: callout exam What exams ask
Find a constant from $\sum p_k = 1$ (often a geometric or telescoping series); write
down a distribution law for a drawing or waiting problem; recognise which named
distribution a story gives (fixed $n$ → binomial, first success → geometric, rare
events with a known average → Poisson); and use the Poisson approximation with
$\lambda = np$ for large $n$, small $p$.
:::

::: cards Discrete random variables
Random variable :: A single-valued real function $X(e)$ on the sample space (随机变量)
How a random variable differs from an ordinary function :: It is defined on the sample space, not on the real line, and its values follow probability rules
Two properties of a distribution law :: $p_k \ge 0$ and $\sum_k p_k = 1$
Two-point (0–1) distribution :: $P\{X=k\} = p^k(1-p)^{1-k}$, $k = 0, 1$; it is $B(1,p)$
Binomial $B(n,p)$ :: $P\{X=k\} = C_n^k p^k (1-p)^{n-k}$, $k = 0, \ldots, n$: successes in $n$ trials
Poisson $P(\lambda)$ :: $P\{X=k\} = \lambda^k e^{-\lambda}/k!$, $k = 0, 1, \ldots$
Geometric $G(p)$ :: $P\{X=k\} = (1-p)^{k-1}p$, $k = 1, 2, \ldots$: trials until the first success
Poisson approximation of $B(n,p)$ :: $\lambda = np$, when $n$ is large and $p$ small (rule of thumb $n > 10$, $p < 0.1$)
$X_1 + \cdots + X_n$ with independent (0–1) variables :: $B(n, p)$
For $X \sim G(p)$, $P\{X > k\}$ :: $(1-p)^k$: the first $k$ trials all fail
Who first saw the Poisson law in radioactive counts? :: Rutherford and Geiger (2608 periods of 7.5 s)
:::

::: quiz Random variables and discrete distributions
? $P\{X = k\} = b\lambda^k$, $k = 1, 2, \ldots$, with $|\lambda| < 1$, is a distribution law. Then:
- [ ] $\lambda$ is any positive real number
- [ ] $\lambda = b + 1$
- [x] $\lambda = \dfrac{1}{b+1}$
- [ ] $\lambda = \dfrac{1}{b-1}$
> Normalisation: $\sum_{k\ge1} b\lambda^k = \dfrac{b\lambda}{1-\lambda} = 1$, so $b\lambda = 1 - \lambda$ and $\lambda = \dfrac{1}{b+1}$.

? $X \sim B(2, p)$, $Y \sim B(3, p)$ and $P\{X \ge 1\} = \frac59$. What is $P\{Y \ge 1\}$?
answer: 19/27
> $1 - (1-p)^2 = \frac59$ gives $p = \frac13$; then $P\{Y \ge 1\} = 1 - \left(\frac23\right)^3 = \frac{19}{27}$.

? $P\{X = k\} = \dfrac{A}{k(k+1)}$, $k = 1, 2, \ldots$ What is $A$?
answer: 1
> $\frac{1}{k(k+1)} = \frac1k - \frac1{k+1}$ telescopes to 1, so $A \cdot 1 = 1$.

? Ten balls, 7 red and 3 white, drawn without replacement until a red one appears. What is $P\{X = 3\}$?
answer: 7/120
> White, white, red: $\frac{3}{10} \cdot \frac{2}{9} \cdot \frac{7}{8} = \frac{42}{720} = \frac{7}{120}$.

? Calls arrive as $X \sim P(2)$ per minute. What is the probability of no call in a minute?
answer: e^(-2)
> $P\{X = 0\} = \frac{2^0 e^{-2}}{0!} = e^{-2} \approx 0.1353$.

? 400 independent shots, each hitting with probability 0.02. With the Poisson approximation, what is $\lambda$?
answer: 8
> $\lambda = np = 400 \times 0.02 = 8$ ($n$ large, $p$ small, so the approximation applies).

? A die is thrown until the first six. What is the probability that it takes exactly 2 throws?
answer: 5/36
> $X \sim G(\frac16)$: $P\{X = 2\} = \frac56 \cdot \frac16 = \frac{5}{36}$.

? Which variable is binomial?
- [ ] The number of throws of a die until the first six
- [x] The number of red lights among 3 independent lights, each red with probability $\frac12$
- [ ] The number of calls to an exchange in one minute
- [ ] The number of draws without replacement until a red ball
> Red lights: 3 independent trials with the same $p$, counting successes, $B(3, \frac12)$. The others are geometric, Poisson, and a law found by the multiplication rule (the draws aren't independent).

? $X_1, \ldots, X_n$ are independent, each with the (0–1) distribution with parameter $p$. $X_1 + \cdots + X_n$ follows which distribution? (Type it like B(n,p).)
text: B(n,p) | B(n, p) | binomial | 二项分布 | binomial distribution
> Each $X_i$ counts one trial's success, so the sum counts the successes in $n$ independent trials: $B(n, p)$.

? In the repairman problem (300 machines, failure probability 0.01, one repairman per failure), what is the smallest number of repairmen keeping $P\{X > N\} < 0.01$?
answer: 8
> $\lambda = 3$: $P\{X > 7\} \approx 0.0119$ is too big, $P\{X > 8\} \approx 0.0038$ is below 0.01.
:::

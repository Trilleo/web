---
title: Mathematical expectation
zh: 数学期望
summary: Why a distribution is summed up in a few numbers, the expectation of a discrete and of a continuous random variable (and why the series or integral must converge absolutely), and the expectations of the two-point, binomial, Poisson, uniform, exponential and normal distributions.
source: 14数学期望8-2 (§4.1), 2026-10-21; review in 15方差和协方差9-1, 2026-10-26
---

So far a random variable has been described by its whole distribution: a distribution
law, a density, a distribution function. That tells you everything, but it is often more
than you need and harder to find than you'd like. This unit is about
{{term numerical characteristics | 数字特征}}: a few numbers that sum up the most
important features of a distribution. The first and most important is the
{{term mathematical expectation | 数学期望}}, the long-run average value of a random
variable. Nearly every later topic — variance, covariance, the limit theorems, estimation
— is built on it, and exams ask for expectations in almost every paper.

## Why numerical characteristics

If you know the distribution of $X$, you know all of its probabilistic behaviour. In
practice, though, a distribution is hard to pin down exactly, and many questions only
need one or two numbers:

- To judge the level of grain production in a region, what matters most is the
  **average yield**.
- To check a batch of cotton, you want the average fibre length, and also **how far the
  lengths stray from that average**.
- To study household incomes, you want the **average annual income**, and also **how
  unequal** incomes are.

The first number in each case is a "centre" — that will be the expectation. The second
is a "spread" — that will be the variance (Lesson 4.3). A numerical characteristic is
simply a number that describes a feature of a distribution. The most used ones, and the
subject of this unit, are the {{term expectation | 数学期望}}, the
{{term variance | 方差}}, the {{term covariance | 协方差}} and the
{{term correlation coefficient | 相关系数}}.

## The expectation of a discrete random variable

### A shooting example

Start with something you already know how to average. A marksman fires 90 shots at a
target under the same conditions, and the score $k$ of each shot (rings hit, 0 to 5) is
recorded:

| Score $k$ | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Number of shots $n_k$ | 2 | 13 | 15 | 10 | 20 | 30 |
| Frequency $n_k/n$ | 2/90 | 13/90 | 15/90 | 10/90 | 20/90 | 30/90 |

What is the average score per shot?

::: example The marksman's average score
Find the average score per shot from the table above.
== Total over count ==
The average is the total score divided by the number of shots:
$$\frac{0\times2+1\times13+2\times15+3\times10+4\times20+5\times30}{90} = \frac{303}{90}.$$
== Rewrite with frequencies ==
Split the fraction term by term: each score is multiplied by the **frequency** with which
it occurred,
$$0\times\frac{2}{90}+1\times\frac{13}{90}+2\times\frac{15}{90}+3\times\frac{10}{90}+4\times\frac{20}{90}+5\times\frac{30}{90} = \sum_{k=0}^{5} k\cdot\frac{n_k}{n}.$$
== The number ==
$303/90 \approx 3.37$ rings per shot.
:::

Now let $X$ be the score of one shot. The frequencies $n_k/n$ fluctuate from one series
of 90 shots to the next (随机波动), but as the number of shots $n$ grows they settle down
to the probabilities $p_k = P\{X = k\}$ (Lesson 1.3: frequency stabilises at
probability). So the average score settles down too, to a fixed number (稳定值):
$$\sum_{k=0}^{5} k\cdot\frac{n_k}{n} \ \xrightarrow{\ n\to\infty\ }\ \sum_{k=0}^{5} k\cdot p_k .$$
That limit is "the average score of this marksman" as a property of $X$ itself, not of
one particular series of shots: **each possible value times its probability, added up**.

### The definition

::: define Expectation of a discrete random variable | 离散型随机变量的数学期望
Let the discrete random variable $X$ have distribution law
$P\{X = x_k\} = p_k$, $k = 1, 2, \cdots$. If the series $\sum_{k=1}^{\infty} x_k p_k$
**converges absolutely**, its sum is called the **mathematical expectation** (or
{{term mean | 均值}}) of $X$, written $E(X)$ or $EX$:
$$E(X) = \sum_{k=1}^{\infty} x_k p_k .$$
If the series does not converge absolutely, $X$ has no expectation.
:::

::: formula Expectation of a discrete random variable | 离散型随机变量的数学期望
$$E(X) = \sum_{k} x_k p_k \qquad \Big(\text{provided } \sum_k |x_k|\, p_k < +\infty\Big)$$
--
x_k | the possible values of X |
p_k = P\{X = x_k\} | their probabilities (the distribution law) |
E(X),\ EX | the expectation (mean) of X: a number |
:::

Two remarks on the definition:

1. $E(X)$ is a **real number**, not a variable and not random. Once the distribution is
   fixed, so is $E(X)$. (Physically: put mass $p_k$ at each point $x_k$ of a rod; $E(X)$
   is the rod's balance point, its centre of mass.)
2. **Why absolute convergence?** The expectation is meant to be the average of the values
   $X$ can take, and that should not depend on the order in which we happen to list the
   values. A series that converges absolutely has the same sum in any order; a series that
   converges only conditionally can be rearranged to give a different sum (or to
   diverge). Absolute convergence is exactly what makes $E(X)$ well defined.

When $X$ takes only finitely many values the series is a finite sum, which always
converges, so every such $X$ has an expectation. The condition only matters for
infinitely many values.

::: example A variable without an expectation
Let $X$ take the values $x_k = (-1)^k \dfrac{2^k}{k}$ with probabilities
$p_k = \dfrac{1}{2^k}$, $k = 1, 2, \cdots$. Does $E(X)$ exist?
== Is it a distribution law? ==
$p_k > 0$ and $\sum_{k\ge1} 2^{-k} = 1$, so yes.
== The series ==
$\sum x_k p_k = \sum_{k\ge1} \dfrac{(-1)^k}{k} = -1 + \frac12 - \frac13 + \cdots$, which
converges (to $-\ln 2$), but only conditionally.
== Absolute values ==
$\sum |x_k| p_k = \sum_{k\ge1} \dfrac1k$ is the harmonic series, which diverges. So the
series does **not** converge absolutely and $X$ has **no expectation**, even though the
plain series has a sum: reordering its terms could make it add up to anything.
:::

### A worked example

::: example Expectation from a distribution law
$X$ has the distribution law below. Find $E(X)$.

| Value of $X$ | $-1$ | 0 | 1 | 2 |
| --- | --- | --- | --- | --- |
| Probability $p_k$ | 0.2 | 0.3 | 0.4 | 0.1 |
== Multiply and add ==
$$E(X) = (-1)(0.2) + 0(0.3) + 1(0.4) + 2(0.1) = -0.2 + 0 + 0.4 + 0.2 = 0.4 .$$
== Read it ==
$0.4$ isn't a value $X$ can take. That's normal: an expectation is an average, like
"2.3 children per family".
:::

::: callout pitfall The expectation needn't be a possible value
$E(X)$ is a weighted average, not "the most likely value" and not necessarily a value $X$
can take. A fair die has $E(X) = 3.5$.
:::

## Expectations of the common discrete distributions

The distributions themselves were defined in Lesson 2.1; here we find their means.

### The two-point distribution

$X$ takes the value 1 with probability $p$ and 0 with probability $1-p$:
$$\begin{array}{c|cc} X & 1 & 0 \\ \hline p_k & p & 1-p \end{array}$$
so
$$E(X) = 1\cdot p + 0\cdot(1-p) = p .$$
The mean of a 0–1 variable is the probability that it equals 1. This tiny fact is the
key to the indicator method of Lesson 4.2.

::: formula Expectation of the two-point distribution | 两点分布的数学期望
$$X \sim (0\text{–}1):\quad E(X) = p$$
--
p | P\{X = 1\} |
:::

### The binomial distribution

$X \sim B(n, p)$ has $P\{X = k\} = \binom nk p^k (1-p)^{n-k}$, $k = 0, 1, \cdots, n$
($\binom nk$ is the same number as $C_n^k$). Intuition first: $n$ trials, each a success
with probability $p$, so on average you expect $np$ successes — 100 tosses of a fair coin
give about 50 heads. The slide states the result $E(X) = np$ and starts the sum; here is
the calculation finished.

::: example The mean of B(n, p)
Show that $E(X) = np$ for $X \sim B(n, p)$.
== Write the sum ==
$$E(X) = \sum_{k=0}^{n} k \binom nk p^k (1-p)^{n-k}.$$
The $k = 0$ term is 0, so start at $k = 1$.
== Absorb the k ==
For $k \ge 1$, $k\binom nk = k\cdot\dfrac{n!}{k!\,(n-k)!} = n\cdot\dfrac{(n-1)!}{(k-1)!\,(n-k)!} = n\binom{n-1}{k-1}$. So
$$E(X) = np\sum_{k=1}^{n} \binom{n-1}{k-1} p^{k-1} (1-p)^{(n-1)-(k-1)}.$$
== Binomial theorem ==
Put $j = k - 1$: the sum is $\sum_{j=0}^{n-1}\binom{n-1}{j}p^j(1-p)^{n-1-j} = (p + 1 - p)^{n-1} = 1$
(the probabilities of $B(n-1, p)$ add up to 1). Hence $E(X) = np$.
:::

Lesson 4.2 gets the same result in one line by writing $X$ as a sum of $n$ two-point
variables; that is the slides' own derivation.

::: formula Expectation of the binomial distribution | 二项分布的数学期望
$$X \sim B(n, p):\quad E(X) = np$$
--
n | number of trials |
p | probability of success in each trial |
:::

### The Poisson distribution

$X \sim P(\lambda)$ has $P\{X = k\} = \dfrac{\lambda^k}{k!}e^{-\lambda}$,
$k = 0, 1, 2, \cdots$, $\lambda > 0$. Its values are unbounded, so the expectation is an
infinite series; it converges absolutely because all its terms are nonnegative and its
sum is finite.

::: example The mean of P(λ)
Show that $E(X) = \lambda$ for $X \sim P(\lambda)$.
== Drop the k = 0 term ==
$$E(X) = \sum_{k=0}^{\infty} k\cdot\frac{\lambda^k}{k!}e^{-\lambda} = e^{-\lambda}\sum_{k=1}^{\infty}\frac{\lambda^k}{(k-1)!},$$
since $k/k! = 1/(k-1)!$ for $k \ge 1$.
== Pull out one λ ==
$$E(X) = \lambda e^{-\lambda}\sum_{k=1}^{\infty}\frac{\lambda^{k-1}}{(k-1)!}.$$
== The exponential series ==
$\sum_{j=0}^{\infty}\lambda^j/j! = e^{\lambda}$, so $E(X) = \lambda e^{-\lambda}e^{\lambda} = \lambda$.
:::

So the parameter $\lambda$ of a Poisson distribution **is** its mean: "on average
$\lambda$ calls per minute". This also explains the Poisson approximation of Lesson 1.7:
$B(n, p)$ and $P(np)$ have the same mean $np$.

::: formula Expectation of the Poisson distribution | 泊松分布的数学期望
$$X \sim P(\lambda):\quad E(X) = \lambda$$
--
\lambda | the parameter, λ > 0 |
:::

Move the sliders below: the bars of $B(n, p)$ and of $P(np)$ both balance around $np$.

::: plot B(n, p) and P(np): the same mean np
x: 0 .. 20
xlabel: k
ylabel: P{X = k}
bars Binomial(k) = comb(n, k) p^k (1 - p)^(n - k)
bars Poisson(k) = (n p)^k e^(-n p) / k!
slider n: 1 .. 20 = 10 | | step 1
slider p: 0.05 .. 0.95 = 0.3
:::

::: example Finding λ, then the mean
$X \sim P(\lambda)$ and $P\{X = 1\} = P\{X = 2\}$. Find $E(X)$.
== Set up the equation ==
$\lambda e^{-\lambda} = \dfrac{\lambda^2}{2}e^{-\lambda}$. Divide by $\lambda e^{-\lambda} > 0$:
$1 = \lambda/2$, so $\lambda = 2$.
== The mean ==
$E(X) = \lambda = 2$.
:::

## The expectation of a continuous random variable

For a continuous variable, sums become integrals: replace the value $x_k$ by $x$ and the
probability $p_k$ by the probability of a small interval, $p(x)\,\d x$. (This lecture
writes densities as $p(x)$; earlier lessons used $f(x)$. They mean the same thing.)

::: define Expectation of a continuous random variable | 连续型随机变量的数学期望
Let the continuous random variable $X$ have density $p(x)$. If the integral
$\int_{-\infty}^{+\infty} x\,p(x)\,\d x$ **converges absolutely**, its value is called
the mathematical expectation of $X$, written $E(X)$ or $EX$:
$$E(X) = \int_{-\infty}^{+\infty} x\,p(x)\,\d x .$$
:::

::: formula Expectation of a continuous random variable | 连续型随机变量的数学期望
$$E(X) = \int_{-\infty}^{+\infty} x\,p(x)\,\d x \qquad \Big(\text{provided } \int_{-\infty}^{+\infty} |x|\,p(x)\,\d x < +\infty\Big)$$
--
p(x) | the density of X (also written f(x)) |
E(X) | the expectation (mean) of X |
:::

Absolute convergence plays the same role as before. In practice: integrate over **where
the density is positive** only, since elsewhere $x\,p(x) = 0$.

::: callout pitfall Integrate x p(x), not p(x)
$\int p(x)\,\d x$ is always 1; the expectation needs the extra factor $x$. And mind the
support: if $p(x) = 0$ outside $[a, b]$, the integral runs from $a$ to $b$ only.
:::

::: example A density on [0, 1]
$X$ has density $p(x) = 2x$ for $0 \le x \le 1$ and $p(x) = 0$ otherwise. Find $E(X)$.
== Restrict to the support ==
$$E(X) = \int_{-\infty}^{+\infty} x\,p(x)\,\d x = \int_0^1 x\cdot 2x\,\d x .$$
== Integrate ==
$$\int_0^1 2x^2\,\d x = \frac{2}{3}.$$
== Sense check ==
The density rises towards 1, so more weight sits on the right and the mean is above the
midpoint $\frac12$.
:::

## Expectations of the common continuous distributions

### The uniform distribution

$X \sim U[a, b]$ (Lesson 2.3) has density $p(x) = \dfrac{1}{b-a}$ on $[a, b]$ and 0
elsewhere. By symmetry the balance point must be the middle of the interval; the integral
confirms it:
$$E(X) = \int_a^b \frac{x}{b-a}\,\d x = \frac{1}{b-a}\cdot\frac{b^2 - a^2}{2} = \frac{(b-a)(b+a)}{2(b-a)} = \frac{a+b}{2}.$$

::: formula Expectation of the uniform distribution | 均匀分布的数学期望
$$X \sim U[a, b]:\quad E(X) = \frac{a+b}{2}$$
--
a,\ b | the ends of the interval |
:::

The expectation of a uniform distribution is the midpoint of its interval.

### The exponential distribution

$X \sim E(\beta)$ (Lesson 2.3) has density $p(x) = \beta e^{-\beta x}$ for $x > 0$ and 0
for $x \le 0$, with $\beta > 0$.

::: example The mean of E(β)
Show that $E(X) = \dfrac1\beta$ for $X \sim E(\beta)$.
== Restrict to x > 0 ==
$$E(X) = \int_{-\infty}^{+\infty} x\,p(x)\,\d x = \int_0^{+\infty} x\,\beta e^{-\beta x}\,\d x .$$
== Integrate by parts ==
With $u = x$, $\d v = \beta e^{-\beta x}\,\d x$ (so $v = -e^{-\beta x}$):
$$\int_0^{+\infty} x\,\beta e^{-\beta x}\,\d x = \Big[-x e^{-\beta x}\Big]_0^{+\infty} + \int_0^{+\infty} e^{-\beta x}\,\d x = 0 + \frac1\beta .$$
(The bracket is 0 at both ends: $x e^{-\beta x} \to 0$ as $x \to +\infty$.)
:::

::: formula Expectation of the exponential distribution | 指数分布的数学期望
$$X \sim E(\beta):\quad E(X) = \frac{1}{\beta}$$
--
\beta | the parameter of the density βe^{−βx}, β > 0 (often written λ) |
:::

So $\beta$ is a **rate** and $1/\beta$ the mean lifetime: if a bulb fails at rate
$\beta = 0.001$ per hour, it lasts $1000$ hours on average. The plot shows the density and
the curve $x\,p(x)$; the shaded area under $x\,p(x)$ is $E(X)$.

::: plot E(β): the area under x p(x) is the mean 1/β
x: 0 .. 6
xlabel: x
p(x) = β e^(-β x)
xp(x) = x β e^(-β x)
region Area: x > 0, 0 < y < x β e^(-β x)
slider β: 0.5 .. 3 = 1
:::

::: callout pitfall Two different E's
The letter $E$ does two jobs here: $E(\beta)$ names the exponential distribution, and
$E(X)$ is the expectation of $X$. "$X \sim E(2)$" means $\beta = 2$, so $E(X) = \frac12$,
not 2. Read which one is meant from context: after "$\sim$" it's a distribution.
:::

### The normal distribution

$X \sim N(\mu, \sigma^2)$ (Lesson 2.4) has density
$p(x) = \dfrac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ on the whole line.
The bell is symmetric about $\mu$, so its balance point should be $\mu$.

::: example The mean of N(μ, σ²)
Show that $E(X) = \mu$ for $X \sim N(\mu, \sigma^2)$.
== Write the integral ==
$$E(X) = \int_{-\infty}^{+\infty} x\cdot\frac{1}{\sqrt{2\pi}\,\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}\,\d x .$$
== Standardise ==
Put $t = \dfrac{x-\mu}{\sigma}$, so $x = \mu + \sigma t$ and $\d x = \sigma\,\d t$:
$$E(X) = \frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}(\mu + \sigma t)\,e^{-\frac{t^2}{2}}\,\d t .$$
== Split ==
$$E(X) = \mu\cdot\frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}e^{-\frac{t^2}{2}}\,\d t + \frac{\sigma}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}t\,e^{-\frac{t^2}{2}}\,\d t .$$
== Evaluate ==
The first integral is $\sqrt{2\pi}$ (the Gaussian integral, Lesson 2.4), so the first
term is $\mu$. The second integrand is an **odd** function and the integral converges
absolutely, so it is 0. Hence $E(X) = \mu$.
:::

::: formula Expectation of the normal distribution | 正态分布的数学期望
$$X \sim N(\mu, \sigma^2):\quad E(X) = \mu$$
--
\mu | the centre of the bell curve, now seen to be the mean |
\sigma^2 | the second parameter (Lesson 4.3 shows it is the variance) |
:::

The parameter $\mu$, which Lesson 2.4 met as "where the bell sits", is the mean.

::: callout key One idea to remember
The expectation is **each value times its probability, added up**: $\sum x_k p_k$ for a
discrete variable, $\int x\,p(x)\,\d x$ for a continuous one. Six results to know by
heart: $p$, $np$, $\lambda$, $\frac{a+b}{2}$, $\frac1\beta$, $\mu$.
:::

| Distribution | Notation | Expectation $E(X)$ |
| --- | --- | --- |
| Two-point | $X \sim (0\text{–}1)$ | $p$ |
| Binomial | $X \sim B(n, p)$ | $np$ |
| Poisson | $X \sim P(\lambda)$ | $\lambda$ |
| Uniform | $X \sim U[a, b]$ | $\frac{a+b}{2}$ |
| Exponential | $X \sim E(\beta)$ | $\frac1\beta$ |
| Normal | $X \sim N(\mu, \sigma^2)$ | $\mu$ |

## In-class question: the mean from a distribution function

Sometimes you're given $F(x)$ instead of the density. Differentiate first.

::: example In-class question 19-020
$X$ is continuous with distribution function $F(x) = 1 - \dfrac{1}{x^4}$ for $x \ge 1$
and $F(x) = 0$ for $x < 1$. Find $E(X)$.
== Get the density ==
$p(x) = F'(x) = 4x^{-5}$ for $x > 1$, and 0 for $x < 1$.
== Integrate x p(x) ==
$$E(X) = \int_1^{+\infty} x\cdot 4x^{-5}\,\d x = 4\int_1^{+\infty} x^{-4}\,\d x = 4\cdot\frac13 = \frac43 .$$
The integrand is positive, so the convergence is absolute. The answer is C, $4/3$.
:::

::: callout exam What exams ask
Expect: an expectation from a distribution law or a density (often with a constant to
find first, or with $F(x)$ given so you must differentiate); the six standard means,
used directly ("$X \sim E(\beta)$, $E(X) = ?$"); and a parameter found from a condition,
then the mean. Lesson 4.2 adds expectations of functions of $X$ — the other half of most
exam questions.
:::

::: callout summary The whole lesson in four lines
Numerical characteristics sum up a distribution; the expectation is its centre.
Discrete: $E(X) = \sum x_k p_k$; continuous: $E(X) = \int x\,p(x)\,\d x$; both only when
the series or integral converges absolutely. $E(X)$ is a number, not random. Means:
two-point $p$, $B(n,p)$ $np$, $P(\lambda)$ $\lambda$, $U[a,b]$ $\frac{a+b}2$, $E(\beta)$
$\frac1\beta$, $N(\mu,\sigma^2)$ $\mu$.
:::

::: cards Mathematical expectation
Numerical characteristics (数字特征) :: Numbers that describe features of a distribution; the main ones: expectation, variance, covariance, correlation coefficient.
Expectation of a discrete random variable :: $E(X) = \sum_k x_k p_k$, if the series converges absolutely.
Expectation of a continuous random variable :: $E(X) = \int_{-\infty}^{+\infty} x\,p(x)\,\d x$, if the integral converges absolutely.
Why absolute convergence in the definition of E(X)? :: So the sum doesn't depend on the order the values are listed in; otherwise $E(X)$ doesn't exist.
Is E(X) random? :: No: it is a fixed real number determined by the distribution.
Mean of the two-point distribution :: $E(X) = p$, the probability of the value 1.
Mean of B(n, p) :: $np$
Mean of P(λ) :: $\lambda$
Mean of U[a, b] :: $\frac{a+b}{2}$, the midpoint.
Mean of E(β) (density βe^{−βx}) :: $\frac{1}{\beta}$
Mean of N(μ, σ²) :: $\mu$
Expectation from a distribution function F :: Differentiate to get $p(x) = F'(x)$, then integrate $x\,p(x)$ over the support.
Physical picture of E(X) :: The balance point (centre of mass) of the distribution.
:::

::: quiz Mathematical expectation
? (In-class question 19-020) $X$ is continuous with $F(x) = 1 - \frac{1}{x^4}$ for $x \ge 1$, $F(x) = 0$ for $x < 1$. Then $E(X) =$
- [ ] $2$
- [ ] $0$
- [x] $4/3$
- [ ] $8/3$
> $p(x) = F'(x) = 4x^{-5}$ for $x > 1$, so
> $E(X) = \int_1^{\infty} x\cdot 4x^{-5}\,\d x = 4\int_1^\infty x^{-4}\,\d x = \frac43$.

? The marksman's 90 shots scored 0, 1, 2, 3, 4, 5 rings 2, 13, 15, 10, 20 and 30 times. What is his average score per shot?
answer: 303/90
> $\frac{0\cdot2 + 1\cdot13 + 2\cdot15 + 3\cdot10 + 4\cdot20 + 5\cdot30}{90} = \frac{303}{90} \approx 3.37$.

? $X \sim B(20, 0.3)$. Find $E(X)$.
answer: 6
> $E(X) = np = 20 \times 0.3 = 6$.

? $X \sim P(\lambda)$ and $P\{X = 1\} = P\{X = 2\}$. Find $E(X)$.
answer: 2
> $\lambda e^{-\lambda} = \frac{\lambda^2}{2}e^{-\lambda}$ gives $\lambda = 2$, and
> $E(X) = \lambda = 2$.

? $X \sim U[-1, 3]$. Find $E(X)$.
answer: 1
> The midpoint: $\frac{-1 + 3}{2} = 1$.

? $X$ has density $p(x) = \frac12 e^{-x/2}$ for $x > 0$ (0 otherwise). Find $E(X)$.
answer: 2
> This is $E(\beta)$ with $\beta = \frac12$, so $E(X) = \frac1\beta = 2$. Careful: it is
> not $\frac12$.

? $X$ has density $p(x) = (a+1)x^a$ for $0 < x < 1$ (0 otherwise), where $a > -1$. Find $E(X)$ as an expression in $a$.
expression: (a+1)/(a+2)
variables: a
> $E(X) = \int_0^1 x\,(a+1)x^a\,\d x = (a+1)\int_0^1 x^{a+1}\,\d x = \frac{a+1}{a+2}$.

? $X \sim N(3, 4)$. What is $E(X)$?
answer: 3
> $E(X) = \mu = 3$. The 4 is $\sigma^2$; it doesn't affect the mean.

? $X$ takes the values $-1, 0, 1, 2$ with probabilities $0.2, 0.3, 0.4, 0.1$. Find $E(X)$.
answer: 0.4
> $(-1)(0.2) + 0 + 1(0.4) + 2(0.1) = 0.4$.

? Which statement about $E(X)$ is true?
- [ ] Every random variable has an expectation.
- [ ] $E(X)$ is always one of the values $X$ can take.
- [x] If $X$ takes only finitely many values, $E(X)$ exists.
- [ ] For a discrete $X$, $E(X)$ exists whenever $\sum x_k p_k$ converges.
> A finite sum always converges. The others fail: $E(X)$ need not exist (the series or
> integral may not converge absolutely), a fair die has $E(X) = 3.5$, and a series that
> converges only conditionally (like $\sum (-1)^k/k$ in the example above) doesn't give
> an expectation.
:::

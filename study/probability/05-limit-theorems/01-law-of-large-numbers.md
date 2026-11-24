---
title: The law of large numbers
zh: 大数定律
summary: Why averages settle down: Chebyshev's inequality, convergence in probability, and the laws of large numbers of Bernoulli, Chebyshev and Khinchin.
source: 16协方差和相关系数9-2 (§5.1), 2026-10-28
---

Toss a fair coin ten times and you may well see seven heads; toss it ten thousand times
and the share of heads will be very close to one half. Everybody "knows" this, and the
whole of statistics leans on it: we estimate a probability by a frequency, and an
expectation by an average. This lesson proves it. The tool is a simple inequality of
Chebyshev's that bounds how far a random variable strays from its mean using only its
variance; from it come the {{term law of large numbers | 大数定律}} in three versions.
The next lesson asks the follow-up question — not just *where* averages settle, but *how
they are spread* on the way — and the answer is the normal distribution.

You need expectation $E(X)$, variance $D(X)$ and covariance, with their properties, from
Lessons 4.1–4.4. The slides write $EX$ and $DX$ without brackets; it means the
same.

## What this chapter answers

The chapter (Chapter 5) is built around four questions that the first four chapters
left open:

1. Why may we use the **frequency** of an event as an estimate of its **probability**?
2. Why may we use the **sample mean** as an estimate of the population's **expectation**?
3. Why does the **normal distribution** play such a central part in probability?
4. What is the theoretical basis of **large-sample** statistical inference?

Questions 1 and 2 are answered by the **laws of large numbers** (this lesson); questions
3 and 4 by the **central limit theorem** (Lesson 5.2). Both are about what happens as the
number of trials or observations $n$ grows without bound — hence the unit's name, *limit
theorems*.

## Chebyshev's inequality

### The idea

The variance measures spread. Picture many values of $X$ marked as dots on a line, with
$E(X)$ in the middle. If $D(X)$ is small the dots huddle around $E(X)$, and the chance of
a value at least $\varepsilon$ away, $P\{|X - E(X)| \ge \varepsilon\}$, is small. If
$D(X)$ is large the dots are scattered and that chance is large. Chebyshev's inequality
turns this picture into a number: the tail probability is at most $D(X)/\varepsilon^2$,
**whatever the distribution of $X$**.

::: theorem Chebyshev's inequality | 切比雪夫不等式
Let $X$ be a random variable whose variance $D(X)$ exists. Then for every
$\varepsilon > 0$,
$$P\{|X - E(X)| \ge \varepsilon\} \le \frac{D(X)}{\varepsilon^2}.$$
:::

The event $\{|X - E(X)| \ge \varepsilon\}$ is "$X$ lands in one of the two outer rays
$(-\infty, \mu - \varepsilon]$ or $[\mu + \varepsilon, +\infty)$", where $\mu = E(X)$. The
plot shades these two tails for a normal density; the inequality says their total area
is never more than $\sigma^2/\varepsilon^2$.

::: plot The event |X − μ| ≥ ε: the two shaded tails (μ = 0, σ = 1)
x: -4 .. 4
xlabel: x
f(x) = e^(-x^2 / 2) / sqrt(2 pi)
region Tails: abs(x) >= ε, 0 < y < e^(-x^2 / 2) / sqrt(2 pi)
slider ε: 0.5 .. 3.5 = 2
:::

### Proof

The lecture proves the continuous case; the discrete case is the same with sums in place
of integrals.

::: example Proof of Chebyshev's inequality (continuous case)
Let $X$ have density $f(x)$ and write $\mu = E(X)$. Show
$P\{|X - \mu| \ge \varepsilon\} \le D(X)/\varepsilon^2$.
== Write the probability as an integral ==
$$P\{|X - \mu| \ge \varepsilon\} = \int_{|x-\mu| \ge \varepsilon} f(x)\,\d x.$$
== Make the integrand bigger ==
On the region of integration $|x - \mu| \ge \varepsilon$, so
$\dfrac{(x-\mu)^2}{\varepsilon^2} \ge 1$. Multiplying $f(x) \ge 0$ by something at least 1
can only increase the integral:
$$\int_{|x-\mu| \ge \varepsilon} f(x)\,\d x \le \int_{|x-\mu| \ge \varepsilon} \frac{(x-\mu)^2}{\varepsilon^2} f(x)\,\d x.$$
== Widen the region ==
The integrand is nonnegative, so integrating over the whole line can only add more:
$$\le \frac{1}{\varepsilon^2}\int_{-\infty}^{+\infty} (x-\mu)^2 f(x)\,\d x = \frac{D(X)}{\varepsilon^2}.$$
The last integral is exactly the definition of the variance.
:::

### The complementary form

The events $\{|X - E(X)| \ge \varepsilon\}$ (the tails) and $\{|X - E(X)| < \varepsilon\}$
(the middle interval $(\mu - \varepsilon, \mu + \varepsilon)$) are complementary, so their
probabilities add to 1. An upper bound on one is a lower bound on the other.

::: formula Chebyshev's inequality, both forms | 切比雪夫不等式
$$P\{|X - E(X)| \ge \varepsilon\} \le \frac{D(X)}{\varepsilon^2} \iff P\{|X - E(X)| < \varepsilon\} \ge 1 - \frac{D(X)}{\varepsilon^2}$$
--
E(X) | the expectation of X |
D(X) | the variance of X (must exist) |
\varepsilon | any positive number: the distance from the mean |
:::

Putting $\varepsilon = k\sigma$, where $\sigma = \sqrt{D(X)}$, gives a version that is easy to
remember: $P\{|X - \mu| < k\sigma\} \ge 1 - \dfrac{1}{k^2}$. At least 75% of any distribution
lies within $2\sigma$ of its mean, and at least $8/9 \approx 89\%$ within $3\sigma$.

::: callout pitfall Strict or not: watch which form you use
The tail form has $\ge \varepsilon$ and an upper bound $\le D(X)/\varepsilon^2$; the middle
form has $< \varepsilon$ and a lower bound $\ge 1 - D(X)/\varepsilon^2$. Mixing them up
(say, a lower bound for the tail) gives nonsense. Also, the interval must be **centred
at $E(X)$**: rewrite $P\{a < X < b\}$ as $P\{|X - E(X)| < \varepsilon\}$ first, which works
only when $a$ and $b$ are the same distance from $E(X)$.
:::

### Worked examples

::: example Example 1: Chebyshev for a normal variable
$X \sim N(\mu, \sigma^2)$. Estimate $P\{|X - \mu| < 3\sigma\}$ with Chebyshev's inequality.
== Apply the middle form ==
$E(X) = \mu$, $D(X) = \sigma^2$, $\varepsilon = 3\sigma$:
$$P\{|X - \mu| < 3\sigma\} \ge 1 - \frac{\sigma^2}{9\sigma^2} = \frac89 \approx 0.89.$$
== Compare with the truth ==
For a normal variable the exact value is $2\Phi(3) - 1 \approx 0.9973$ (Lesson 2.4). The
bound is true but loose: Chebyshev knows only the mean and variance, so it must cover
the worst distribution with those two numbers.
:::

Move $k$ below to compare Chebyshev's guaranteed lower bound with the exact probability
for a normal variable. The bound is useless (zero or negative) for $k \le 1$, and always
below the truth.

::: explore Chebyshev's bound against the normal distribution
slider k: 0.5 .. 5 = 2 | | distance in σ
bound = max(0, 1 - 1/k^2) | | Chebyshev: P{|X − μ| < kσ} at least
normal = 2 Phi(k) - 1 | | Exact for a normal X
gap = 2 Phi(k) - 1 - max(0, 1 - 1/k^2) | | How much the bound gives away
:::

The same comparison for three different distributions, each with mean $\mu$ and standard
deviation $\sigma$: normal, uniform and exponential. Every curve stays above Chebyshev's
bound, as it must.

::: plot P{|X − μ| < kσ} for three distributions, and Chebyshev's lower bound
x: 0 .. 4
xlabel: k
ylabel: probability
Chebyshev(x) = max(0, 1 - 1/x^2)
Normal(x) = 2 Phi(x) - 1
Uniform(x) = min(1, x / sqrt(3))
Exponential(x) = e^(-max(0, 1 - x)) - e^(-(1 + x))
:::

(For the uniform distribution the values fill $\mu \pm \sqrt3\sigma$, so the probability is
$k/\sqrt3$ until it reaches 1; for the exponential with $\beta = 1$, $\mu = \sigma = 1$ and
$P\{|X - 1| < k\} = e^{-\max(0,1-k)} - e^{-(1+k)}$.)

::: example Example 2: an interval centred at the mean
$E(X) = 11$, $D(X) = 9$. Use Chebyshev's inequality to estimate $P\{2 < X < 20\}$.
== Centre the interval ==
2 and 20 are both 9 away from 11:
$$P\{2 < X < 20\} = P\{-9 < X - 11 < 9\} = P\{|X - 11| < 9\}.$$
== Apply the middle form ==
$$P\{|X - 11| < 9\} \ge 1 - \frac{D(X)}{9^2} = 1 - \frac{9}{81} = \frac89.$$
:::

::: example Example 3: a sum of correlated variables
$E(X) = -2$, $D(X) = 1$, $E(Y) = 2$, $D(Y) = 4$, $\rho_{XY} = -0.5$. Use Chebyshev's
inequality to bound $P\{|X + Y| \ge 6\}$.
== Mean of the sum ==
$E(X + Y) = -2 + 2 = 0$, so $|X + Y| = |X + Y - E(X+Y)|$ and the tail form applies with
$\varepsilon = 6$.
== Variance of the sum ==
$\operatorname{Cov}(X, Y) = \rho_{XY}\sqrt{D(X)}\sqrt{D(Y)} = -0.5 \times 1 \times 2 = -1$, so
$$D(X + Y) = D(X) + D(Y) + 2\operatorname{Cov}(X, Y) = 1 + 4 - 2 = 3.$$
== Bound ==
$$P\{|X + Y| \ge 6\} \le \frac{D(X+Y)}{6^2} = \frac{3}{36} = \frac{1}{12}.$$
(The slide stops at $D(X + Y) = 3$; the last line finishes it.)
:::

::: callout exam What exams ask about Chebyshev
A fill-in: given means, variances and a correlation (or $E(XY)$), bound a probability.
The recipe is always the same: (1) find the mean of the variable in the event; (2) rewrite
the event as $|\,\cdot - \text{mean}| \ge \varepsilon$ or $< \varepsilon$; (3) find the
variance, with $D(X \pm Y) = D(X) + D(Y) \pm 2\operatorname{Cov}(X,Y)$; (4) divide by
$\varepsilon^2$. The in-class fill-in at the end of this lesson is a typical one.
:::

## Convergence in probability

### Two kinds of "getting close"

In calculus, $x_n \to a$ means: for every $\varepsilon > 0$ there is an $N$ such that
$|x_n - a| < \varepsilon$ for **all** $n > N$ — no exceptions. For a random sequence that
is too much to ask: however many coins you toss, a freak run that pushes the share of
heads far from $\frac12$ is never strictly impossible. What we can say is that such a run
becomes **very unlikely**. That is the weaker idea of convergence used in the laws of
large numbers.

::: define Convergence in probability | 依概率收敛
Let $X_1, X_2, \dots, X_n, \dots$ be a sequence of random variables and $a$ a constant. If for
every $\varepsilon > 0$
$$\lim_{n\to\infty} P\{|X_n - a| < \varepsilon\} = 1 \quad\text{or, equivalently,}\quad \lim_{n\to\infty} P\{|X_n - a| \ge \varepsilon\} = 0,$$
the sequence **converges in probability** to $a$, written $X_n \xrightarrow{P} a$.
:::

In words: as $n \to \infty$, the probability that $X_n$ lands inside
$(a - \varepsilon, a + \varepsilon)$ gets closer and closer to 1, however narrow the
interval.

::: callout note What convergence in probability does *not* say
For large $n$ the event $|X_n - a| < \varepsilon$ is very likely, but $|X_n - a| \ge \varepsilon$
is **not ruled out**; it is only unlikely. That is why convergence in probability is
weaker than ordinary convergence: it carries a degree of uncertainty.
:::

## The laws of large numbers

All three laws say the same kind of thing — an average converges in probability to a
constant — under different conditions. The first two are proved with Chebyshev's
inequality in two lines each.

### Bernoulli's law: frequency → probability

::: law Bernoulli's law of large numbers | 伯努利大数定律
In $n$ independent Bernoulli trials, let $Y_n$ be the number of successes and $p$ the
probability of success in each trial. Then for every $\varepsilon > 0$
$$\lim_{n\to\infty} P\left\{\left|\frac{Y_n}{n} - p\right| \ge \varepsilon\right\} = 0 \quad\text{or}\quad \lim_{n\to\infty} P\left\{\left|\frac{Y_n}{n} - p\right| < \varepsilon\right\} = 1,$$
that is, $\dfrac{Y_n}{n} \xrightarrow{P} p$. (The slides call this Theorem 5.2.)
:::

$Y_n/n$ is the **frequency** of success (Lesson 1.3), so this is the answer to question 1:
as the number of trials grows, the frequency settles at the probability.

::: example Proof of Bernoulli's law
Show $P\{|Y_n/n - p| \ge \varepsilon\} \to 0$. Write $q = 1 - p$.
== Mean and variance of the frequency ==
$Y_n \sim B(n, p)$, so $E(Y_n) = np$ and $D(Y_n) = npq$ (Lessons 4.1 and 4.3). Then
$$E\left(\frac{Y_n}{n}\right) = \frac1n E(Y_n) = \frac1n\cdot np = p, \qquad D\left(\frac{Y_n}{n}\right) = \frac{1}{n^2}D(Y_n) = \frac{1}{n^2}\cdot npq = \frac{pq}{n}.$$
== Chebyshev ==
$$P\left\{\left|\frac{Y_n}{n} - p\right| \ge \varepsilon\right\} \le \frac{D(Y_n/n)}{\varepsilon^2} = \frac{pq}{n\varepsilon^2}.$$
== Let n grow ==
The right side tends to 0 as $n \to \infty$, and a probability can't be negative, so
$\lim_{n\to\infty} P\{|Y_n/n - p| \ge \varepsilon\} = 0$.
:::

The proof gives more than the limit: it gives a number of trials that is guaranteed to
be enough.

::: example How many tosses are enough (Chebyshev's guarantee)
A fair coin is tossed $n$ times. How large must $n$ be for Chebyshev's inequality to
guarantee that the frequency of heads is within 0.05 of $\frac12$ with probability at
least 0.9?
== Bound ==
$p = q = \frac12$, $\varepsilon = 0.05$:
$$P\left\{\left|\frac{Y_n}{n} - \frac12\right| < 0.05\right\} \ge 1 - \frac{pq}{n\varepsilon^2} = 1 - \frac{0.25}{0.0025\,n} = 1 - \frac{100}{n}.$$
== Solve ==
$1 - 100/n \ge 0.9$ when $n \ge 1000$. So 1000 tosses are certainly enough. (The central
limit theorem in Lesson 5.2 shows that about 271 already do: Chebyshev is safe but
pessimistic.)
:::

The plot shows, as $n$ grows, Chebyshev's guaranteed lower bound $1 - pq/(n\varepsilon^2)$
for $P\{|Y_n/n - p| < \varepsilon\}$, and the normal approximation to the true value from
the next lesson. Both climb to 1: that climb **is** the law of large numbers.

::: plot P{|Yₙ/n − p| < ε} as n grows: Chebyshev's bound and the normal approximation
x: 1 .. 2000
xlabel: n
ylabel: probability
Chebyshev(x) = max(0, 1 - p (1 - p) / (x ε^2))
Approximate(x) = 2 Phi(ε sqrt(x / (p (1 - p)))) - 1
slider p: 0.05 .. 0.95 = 0.5 | | success probability
slider ε: 0.01 .. 0.1 = 0.05 | | tolerance
:::

### Chebyshev's law: averages → average of the means

::: law Chebyshev's law of large numbers | 切比雪夫大数定律
Let $X_1, X_2, \dots, X_n, \dots$ be independent random variables, and suppose there is a
constant $C$ with $D(X_i) < C$ for all $i$ (the variances are **uniformly bounded**). Then
for every $\varepsilon > 0$
$$\lim_{n\to\infty} P\left\{\left|\frac1n\sum_{i=1}^n X_i - \frac1n\sum_{i=1}^n E(X_i)\right| < \varepsilon\right\} = 1,$$
that is, $\overline X = \dfrac1n\sum_{i=1}^n X_i \xrightarrow{P} \dfrac1n\sum_{i=1}^n E(X_i)$, or
equivalently the probability of a difference of at least $\varepsilon$ tends to 0.
(Theorem 5.3 on the slides.)
:::

The variables needn't have the same distribution, or even the same mean; the average
of the $X_i$ simply tracks the average of their means.

::: example Proof of Chebyshev's law
Show that the probability of $\left|\overline X - \frac1n\sum E(X_i)\right| \ge \varepsilon$ tends to 0.
== Mean of the average ==
$E\left(\frac1n\sum_{i=1}^n X_i\right) = \frac1n\sum_{i=1}^n E(X_i)$ (linearity, Lesson 4.2).
== Variance of the average ==
Because the $X_i$ are **independent**, the variance of the sum is the sum of the variances:
$$D\left(\frac1n\sum_{i=1}^n X_i\right) = \frac{1}{n^2}\sum_{i=1}^n D(X_i) \le \frac{1}{n^2}\cdot nC = \frac{C}{n}.$$
== Chebyshev and the limit ==
$$P\left\{\left|\frac1n\sum_{i=1}^n X_i - \frac1n\sum_{i=1}^n E(X_i)\right| \ge \varepsilon\right\} \le \frac{C}{n\varepsilon^2} \to 0 \quad (n \to \infty).$$
:::

The most used case is when all the $X_i$ have the same distribution: then every mean is
$\mu$ and every variance is $\sigma^2$, which is a bound for the variances automatically.

::: define Independent and identically distributed | 独立同分布
Random variables $X_1, X_2, \dots$ are **independent and identically distributed**
(i.i.d.) if they are mutually independent and all have the same distribution. Repeated
measurements of the same quantity under the same conditions are the standard example.
:::

::: theorem Corollary: the i.i.d. case of Chebyshev's law | 切比雪夫大数定律的特殊情况
Let $X_1, X_2, \dots, X_n, \dots$ be i.i.d. with $E(X_i) = \mu$ and $D(X_i) = \sigma^2$ finite.
Then for every $\varepsilon > 0$
$$\lim_{n\to\infty} P\left\{\left|\frac1n\sum_{i=1}^n X_i - \mu\right| < \varepsilon\right\} = 1, \qquad\text{that is,}\quad \overline X = \frac1n\sum_{i=1}^n X_i \xrightarrow{P} \mu.$$
:::

The proof is the one above with $\frac1n\sum E(X_i) = \frac1n\cdot n\mu = \mu$ and
$D(\overline X) = \frac{1}{n^2}\cdot n\sigma^2 = \frac{\sigma^2}{n}$, so the tail probability is
at most $\dfrac{\sigma^2}{n\varepsilon^2}$.

::: formula Mean and variance of a sample mean | 算术平均值的期望与方差
$$E(\overline X) = \mu, \qquad D(\overline X) = \frac{\sigma^2}{n}, \qquad P\{|\overline X - \mu| \ge \varepsilon\} \le \frac{\sigma^2}{n\varepsilon^2}$$
--
\overline X | the average $\frac1n\sum X_i$ of n i.i.d. variables |
\mu, \sigma^2 | the common expectation and variance |
:::

This answers question 2: the **sample mean** settles at the population's expectation.
Two remarks from the lecture:

1. $\{|\overline X - \mu| < \varepsilon\}$ is a **random event**; the theorem says its
   probability tends to 1, not that it is certain.
2. The theorem proves mathematically that the arithmetic mean of $X_1, \dots, X_n$ comes
   close to the common expectation $\mu$: averages are **stable**. The sense of "close"
   is convergence in probability.

::: callout key The one idea
Averaging $n$ independent copies divides the variance by $n$: $D(\overline X) = \sigma^2/n$.
A variance that shrinks to 0 squeezes the average onto its mean, and Chebyshev's
inequality turns that into a probability tending to 1.
:::

### Khinchin's law: no variance needed

Chebyshev's proof needs variances. For i.i.d. variables Khinchin showed that a finite
mean is enough.

::: law Khinchin's law of large numbers | 辛钦大数定律
Let $X_1, X_2, \dots, X_n, \dots$ be i.i.d. with finite expectation $E(X_i) = \mu$. Then for
every $\varepsilon > 0$
$$\lim_{n\to\infty} P\left\{\left|\frac1n\sum_{i=1}^n X_i - \mu\right| < \varepsilon\right\} = 1, \qquad \overline X \xrightarrow{P} \mu.$$
The variance need not exist. (Theorem 5.4 on the slides; no proof in this course.)
:::

A very useful consequence: if the $X_i$ are i.i.d., so are $X_i^2$, $X_i^3$, $g(X_i)$ for any
function $g$. So Khinchin's law gives
$\frac1n\sum_{i=1}^n X_i^k \xrightarrow{P} E(X^k)$ whenever that expectation is finite —
the basis of the method of moments in Unit 7.

::: callout pitfall Check the conditions of each law
Bernoulli: counts of successes in Bernoulli trials. Chebyshev: independent, variances
bounded by one constant (identical distributions not needed). Khinchin: independent **and
identically distributed**, finite mean (variance not needed). An exam may give you
i.i.d. variables with no variance: only Khinchin applies.
:::

### Summary

| Law | Conclusion | Conditions |
| --- | --- | --- |
| Bernoulli | $\lim_{n\to\infty} P\{\lvert Y_n/n - p\rvert < \varepsilon\} = 1$ | $Y_n \sim B(n, p)$ |
| Chebyshev (i.i.d. case) | $\lim_{n\to\infty} P\{\lvert \frac1n\sum X_i - \mu\rvert < \varepsilon\} = 1$ | i.i.d., $E(X_i) = \mu$, $D(X_i) = \sigma^2$ |
| Khinchin | $\lim_{n\to\infty} P\{\lvert \frac1n\sum X_i - \mu\rvert < \varepsilon\} = 1$ | i.i.d., $E(X_i) = \mu$ |

Bernoulli's law is the special case of the others where each $X_i$ is a two-point
variable (1 for success, 0 for failure), $\sum X_i = Y_n$ and $\mu = p$. Together the laws
express, in exact mathematical form, one of the most basic properties of random
phenomena: **the stability of averages** (平均结果的稳定性).

## In-class questions

::: example Example (textbook P136, Example 5.5): a limit by the law of large numbers
$X_1, X_2, \dots, X_n, \dots$ are i.i.d. with $E(X_n) = 0$. Find
$\lim_{n\to\infty} P\left\{\sum_{i=1}^n X_i < n\right\}$.
== Turn the sum into an average ==
Divide by $n$: $\left\{\sum_{i=1}^n X_i < n\right\} = \{\overline X < 1\}$.
== Which law ==
i.i.d. with a finite mean, nothing said about the variance: Khinchin's law gives
$\overline X \xrightarrow{P} 0$, so with $\varepsilon = 1$,
$P\{|\overline X - 0| < 1\} \to 1$.
== Conclude ==
$\{|\overline X| < 1\} \subseteq \{\overline X < 1\}$, so
$1 \ge P\{\overline X < 1\} \ge P\{|\overline X| < 1\} \to 1$. The limit is **1**.
:::

::: example Example: the mean of squares of exponential variables
$X_1, X_2, \dots$ are i.i.d., exponential with parameter 2. As $n \to \infty$,
$Y_n = \frac1n\sum_{i=1}^n X_i^2$ converges in probability to what?
== The squares are i.i.d. ==
$X_1^2, X_2^2, \dots$ are i.i.d. too, so by Khinchin's law $Y_n \xrightarrow{P} E(X^2)$.
== Compute E(X²) ==
For $E(2)$ (density $2e^{-2x}$, $x > 0$): $E(X) = \frac12$, $D(X) = \frac14$, so
$$E(X^2) = D(X) + [E(X)]^2 = \frac14 + \frac14 = \frac12.$$
So $Y_n \xrightarrow{P} \frac12$.
:::

::: cards The law of large numbers
Chebyshev's inequality (tail form) :: $P\{|X - E(X)| \ge \varepsilon\} \le \dfrac{D(X)}{\varepsilon^2}$ for every $\varepsilon > 0$, if $D(X)$ exists.
Chebyshev's inequality (middle form) :: $P\{|X - E(X)| < \varepsilon\} \ge 1 - \dfrac{D(X)}{\varepsilon^2}$.
Chebyshev with ε = kσ :: $P\{|X - \mu| < k\sigma\} \ge 1 - 1/k^2$: at least 3/4 within 2σ, 8/9 within 3σ.
Key step in proving Chebyshev's inequality :: On $|x - \mu| \ge \varepsilon$, $1 \le (x-\mu)^2/\varepsilon^2$; then widen the integral to the whole line.
Convergence in probability, $X_n \xrightarrow{P} a$ :: For every $\varepsilon > 0$, $\lim_{n\to\infty} P\{|X_n - a| \ge \varepsilon\} = 0$.
Convergence in probability vs ordinary convergence :: Weaker: large deviations stay possible for large n, just unlikely.
Bernoulli's law of large numbers :: In n Bernoulli trials, the frequency $Y_n/n \xrightarrow{P} p$.
Variance of the frequency $Y_n/n$ :: $pq/n$, so Chebyshev bounds the tail by $pq/(n\varepsilon^2)$.
Chebyshev's law of large numbers: conditions :: Independent $X_i$ with variances bounded by one constant C.
Chebyshev's law of large numbers: conclusion :: $\frac1n\sum X_i \xrightarrow{P} \frac1n\sum E(X_i)$.
Mean and variance of the sample mean of i.i.d. variables :: $E(\overline X) = \mu$, $D(\overline X) = \sigma^2/n$.
Khinchin's law of large numbers :: i.i.d. with finite mean μ (no variance needed): $\overline X \xrightarrow{P} \mu$.
Khinchin for powers :: If $X_i$ are i.i.d., $\frac1n\sum X_i^k \xrightarrow{P} E(X^k)$ when it is finite.
What the laws of large numbers express :: The stability of averages: frequency → probability, sample mean → expectation.
:::

::: quiz The law of large numbers
? (In-class fill-in 21-035) $X \sim N(1, 1)$, $Y \sim N(0, 1)$, $E(XY) = -0.1$. By Chebyshev's inequality, $P\{-4 < X + Y < 6\} \ge$
answer: 0.928
> $\operatorname{Cov}(X,Y) = E(XY) - E(X)E(Y) = -0.1 - 1\cdot 0 = -0.1$, so
> $D(X+Y) = 1 + 1 + 2(-0.1) = 1.8$. $E(X+Y) = 1$, and $-4, 6$ are both 5 away from 1:
> $P\{|X + Y - 1| < 5\} \ge 1 - 1.8/25 = 0.928$.

? (Textbook Example 5.5) $X_1, X_2, \dots$ are i.i.d. with $E(X_n) = 0$. Find $\lim_{n\to\infty} P\left\{\sum_{i=1}^n X_i < n\right\}$.
answer: 1
> The event is $\overline X < 1$. By Khinchin's law $\overline X \xrightarrow{P} 0$, so
> $P\{|\overline X| < 1\} \to 1$, and $\{\overline X < 1\}$ contains that event: the limit is 1.

? (In-class fill-in 21-050) $X_1, X_2, \dots$ are i.i.d., exponential with parameter 2. $Y_n = \frac1n\sum_{i=1}^n X_i^2$ converges in probability to
answer: 1/2
> By Khinchin's law $Y_n \xrightarrow{P} E(X^2) = D(X) + [E(X)]^2 = \frac14 + \frac14 = \frac12$.

? $E(X) = 11$, $D(X) = 9$. Chebyshev's lower bound for $P\{2 < X < 20\}$?
answer: 8/9
> $P\{|X - 11| < 9\} \ge 1 - 9/81 = 8/9$.

? $E(X) = -2$, $D(X) = 1$, $E(Y) = 2$, $D(Y) = 4$, $\rho_{XY} = -0.5$. Chebyshev's upper bound for $P\{|X + Y| \ge 6\}$?
answer: 1/12
> $E(X+Y) = 0$; $D(X+Y) = 1 + 4 + 2(-0.5)(1)(2) = 3$; bound $3/36 = 1/12$.

? Whatever the distribution, at least what fraction of it lies strictly within $2\sigma$ of the mean, by Chebyshev?
answer: 3/4
> $1 - \sigma^2/(2\sigma)^2 = 1 - 1/4 = 3/4$.

? A fair coin is tossed $n$ times. By Chebyshev, the smallest $n$ that guarantees $P\{|Y_n/n - 0.5| < 0.1\} \ge 0.95$?
answer: 500
> $1 - pq/(n\varepsilon^2) = 1 - 0.25/(0.01 n) = 1 - 25/n \ge 0.95$ needs $n \ge 500$.

? $X_1, X_2, \dots$ are i.i.d. with a finite mean but **no** finite variance. Which law of large numbers can you use for $\overline X$?
- [ ] Bernoulli's
- [ ] Chebyshev's
- [x] Khinchin's
- [ ] None of them
> Chebyshev's law needs bounded variances, and Bernoulli's is about success counts.
> Khinchin's needs only i.i.d. with a finite mean.

? Which statement about $X_n \xrightarrow{P} a$ is right?
- [ ] For large enough $n$, $|X_n - a| < \varepsilon$ always holds
- [x] For every $\varepsilon > 0$, $P\{|X_n - a| \ge \varepsilon\} \to 0$
- [ ] $E(X_n) = a$ for every $n$
- [ ] $D(X_n) = 0$ for large $n$
> Convergence in probability only makes large deviations unlikely, not impossible; it says
> nothing directly about $E(X_n)$ or $D(X_n)$.

? $X_1, \dots, X_n$ are i.i.d. with $D(X_i) = 4$. What is $D(\overline X)$ when $n = 100$?
answer: 0.04
> $D(\overline X) = \sigma^2/n = 4/100 = 0.04$.
:::

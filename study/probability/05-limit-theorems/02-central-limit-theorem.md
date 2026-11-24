---
title: The central limit theorem
zh: 中心极限定理
summary: Why sums of many small independent effects are approximately normal: the Lindeberg–Lévy and de Moivre–Laplace theorems, and how to use them to approximate probabilities.
source: 16协方差和相关系数9-2 (§5.2 opening), 2026-10-28; 17三大分布10-1 (§5.2), 2026-11-03
---

The law of large numbers (Lesson 5.1) says an average of many independent observations
settles at the mean. It doesn't say how the average is spread around the mean on its
way there, and so it can't tell us, say, the probability that the total error of 1200
measurements stays below 20 km. The {{term central limit theorem | 中心极限定理}}
answers that: a sum of many independent random variables is **approximately normal**,
whatever their own distribution. This is why the normal distribution is everywhere in
nature, and why statistics can work with large samples without knowing the population's
distribution — questions 3 and 4 from the start of this chapter. In practice it turns
hard sums into a single $\Phi$ calculation, and exams use it every year.

You need the normal distribution and standardisation (Lesson 2.4), and expectation and
variance with their properties (Lessons 4.1–4.4).

## Why sums become normal

Where does a shell fired from a gun land? Its deviation from the target depends on many
random factors: the aim, air resistance, small differences in the shell and the barrel,
the wind… Each factor nudges the landing point only a little, and they act more or less
independently. What distribution does the landing point follow?

Ever since Gauss showed that **measurement errors** follow the normal distribution, people
have found the normal distribution all over nature. The pattern behind it is this: if a
random variable is the combined effect of a large number of independent random factors,
each of which plays only a small part, then the variable is normal, or approximately
normal. The slide sums it up in a slogan:

::: callout key Many factors, small effects, normal in total
多因素，小影响，综合为正态: a sum of many independent, individually small random effects
is approximately normal, **whatever** the distribution of each effect.
:::

You can watch it happen. The exponential distribution is very lopsided: its density is
highest at 0 and has a long right tail. Below is the density of the **sum** of $n$
independent $E(1)$ variables (it has mean $n$ and variance $n$), with the normal density
$N(n, n)$ drawn over it. At $n = 1$ they look nothing alike; slide $n$ up and the sum
becomes a symmetric bell that the normal curve fits almost exactly.

::: plot The sum of n independent E(1) variables against N(n, n)
x: 0 .. 60
xlabel: value of the sum
Sum(x) = x^(n - 1) e^(-x) / gamma(n)
Normal(x) = e^(-(x - n)^2 / (2 n)) / sqrt(2 pi n)
slider n: 1 .. 40 = 3 | | step 1
:::

(The density of the sum is $\frac{x^{n-1}e^{-x}}{(n-1)!}$ for $x > 0$; you can check $n = 2$
with the convolution formula of Lesson 3.7. You don't need to remember it here.)

## The central limit theorem for i.i.d. variables

To compare sums with the standard normal we **standardise** them: subtract the mean and
divide by the standard deviation. If $X_1, \dots, X_n$ are independent with mean $\mu$ and
variance $\sigma^2$ each, then
$$E\left(\sum_{k=1}^n X_k\right) = n\mu, \qquad D\left(\sum_{k=1}^n X_k\right) = n\sigma^2,$$
so the standardised sum is $\dfrac{\sum X_k - n\mu}{\sqrt n\,\sigma}$: mean 0, variance 1.

::: define Standardised variable | 标准化变量
For a random variable $Y$ with mean $E(Y)$ and variance $D(Y) > 0$, the
**standardised variable** is $Y^* = \dfrac{Y - E(Y)}{\sqrt{D(Y)}}$. It has $E(Y^*) = 0$ and
$D(Y^*) = 1$.
:::

::: theorem The central limit theorem for i.i.d. variables (Lindeberg–Lévy) | 独立同分布下的中心极限定理
Let $X_1, X_2, \dots, X_n, \dots$ be independent and identically distributed with
$E(X_k) = \mu$ and $D(X_k) = \sigma^2 > 0$ $(k = 1, 2, \dots)$. Then the distribution
function $F_n(x)$ of the standardised sum
$$\frac{\sum_{k=1}^n X_k - n\mu}{\sqrt n\,\sigma}$$
satisfies, for every $x$,
$$\lim_{n\to\infty} F_n(x) = \lim_{n\to\infty} P\left\{\frac{\sum_{k=1}^n X_k - n\mu}{\sqrt n\,\sigma} \le x\right\} = \Phi(x).$$
(Theorem 1 on the slides.)
:::

Nothing is assumed about the shape of the distribution: only independence, identical
distribution, and a finite variance. The lecture draws two consequences.

1. For large $n$ the standardised sum is **approximately** standard normal:
   $\dfrac{\sum_{k=1}^n X_k - n\mu}{\sqrt n\,\sigma} \;\overset{\text{approx.}}{\sim}\; N(0, 1)$.
2. In general it is hard to find the exact distribution of $\sum X_k$, but for large $n$
   the sum itself is approximately normal: $\sum_{k=1}^n X_k \;\overset{\text{approx.}}{\sim}\; N(n\mu, n\sigma^2)$.

Dividing the sum by $n$ gives a third form, the one about the **sample mean** that
statistics uses all the time (Lesson 5.1: $E(\overline X) = \mu$, $D(\overline X) = \sigma^2/n$):
$\overline X = \frac1n\sum X_k \overset{\text{approx.}}{\sim} N\left(\mu, \frac{\sigma^2}{n}\right)$.

::: formula The central limit theorem in use | 中心极限定理的近似计算
$$\begin{gathered}\sum_{k=1}^n X_k \overset{\text{approx.}}{\sim} N(n\mu,\ n\sigma^2), \qquad \overline X \overset{\text{approx.}}{\sim} N\left(\mu,\ \frac{\sigma^2}{n}\right), \\ P\left\{a < \sum_{k=1}^n X_k \le b\right\} \approx \Phi\left(\frac{b - n\mu}{\sqrt n\,\sigma}\right) - \Phi\left(\frac{a - n\mu}{\sqrt n\,\sigma}\right)\end{gathered}$$
--
X_1, \dots, X_n | i.i.d. random variables, n large |
\mu, \sigma^2 | the mean and variance of each $X_k$ |
\sqrt n\,\sigma | the standard deviation of the sum (not $n\sigma$) |
\Phi | the standard normal distribution function |
:::

::: callout pitfall The sum's standard deviation is √n σ
Variances add, standard deviations don't: $D(\sum X_k) = n\sigma^2$, so the sum's standard
deviation is $\sqrt n\,\sigma$, not $n\sigma$. And in $N(n\mu, n\sigma^2)$, as always, the
second number is the **variance**. For the mean, the variance is $\sigma^2/n$ — it shrinks,
which is the law of large numbers again.
:::

::: callout note The law of large numbers and the CLT side by side
The law of large numbers: $\overline X \to \mu$ (in probability) — *where* the average
goes. The central limit theorem: $\overline X$ is approximately $N(\mu, \sigma^2/n)$ — *how*
it is spread around $\mu$ for large $n$, which gives actual probabilities. The CLT is the
sharper statement, and it needs a finite variance.
:::

## The de Moivre–Laplace theorem

The number of successes in $n$ Bernoulli trials is a sum: $Y_n = X_1 + \dots + X_n$, where
$X_k$ is 1 if trial $k$ succeeds and 0 if not (Lesson 2.1). The $X_k$ are i.i.d. two-point
variables with $\mu = p$ and $\sigma^2 = pq$, so the central limit theorem applies with
$n\mu = np$ and $\sqrt n\,\sigma = \sqrt{npq}$. This special case was found first, by
de Moivre and Laplace, and has its own name.

::: theorem The de Moivre–Laplace theorem | 德莫佛–拉普拉斯定理
In $n$ independent Bernoulli trials let $Y_n$ be the number of successes, $p$ the
probability of success in each trial and $q = 1 - p$. Then for every $x$
$$\lim_{n\to\infty} P\left\{\frac{Y_n - np}{\sqrt{npq}} \le x\right\} = \Phi(x),$$
so for large $n$, $\dfrac{Y_n - np}{\sqrt{npq}} \overset{\text{approx.}}{\sim} N(0, 1)$ and
$Y_n \overset{\text{approx.}}{\sim} N(np, npq)$. (Theorem 2 on the slides.)
:::

::: formula Normal approximation to the binomial | 二项分布的正态近似
$$Y_n \sim B(n, p): \quad P\{a < Y_n \le b\} \approx \Phi\left(\frac{b - np}{\sqrt{npq}}\right) - \Phi\left(\frac{a - np}{\sqrt{npq}}\right)$$
--
np | the mean of $B(n,p)$ |
npq | the variance of $B(n,p)$, with $q = 1 - p$ |
:::

The plot shows the binomial distribution law (bars) and the normal density
$N(np, npq)$ (curve). Increase $n$ and the curve hugs the tops of the bars more and more
closely; push $p$ towards 0 or 1 and you need a larger $n$, because the binomial is then
lopsided. (For small $p$ and moderate $n$ the **Poisson** approximation of Lesson 1.7 is
the better one.)

::: plot The binomial B(n, p) and the normal density N(np, npq)
x: 0 .. 60
xlabel: k
bars P(k) = comb(n, k) p^k (1 - p)^(n - k)
Normal(k) = e^(-(k - n p)^2 / (2 n p (1 - p))) / sqrt(2 pi n p (1 - p))
slider n: 1 .. 100 = 20 | | step 1
slider p: 0.02 .. 0.98 = 0.3 | | success probability
:::

## Worked examples

::: example Example 1: the error of a long measurement
To measure the distance between $A$ and $B$, the distance is split into 1200 sections
measured one by one. The measurement errors of the sections (in km) are independent and
each uniform on $(-0.5, 0.5)$. Find the probability that the absolute value of the total
error $X$ is at most 20 km.
== Set up the sum ==
Let $X_k$ be the error in section $k$, $k = 1, \dots, 1200$; then $X = \sum_{k=1}^{1200} X_k$.
For $U(-0.5, 0.5)$: $E(X_k) = 0$, $D(X_k) = \dfrac{(0.5 - (-0.5))^2}{12} = \dfrac{1}{12}$.
== Mean and standard deviation of the sum ==
$n\mu = 1200 \times 0 = 0$ and $\sqrt{n}\,\sigma = \sqrt{1200 \times \frac{1}{12}} = \sqrt{100} = 10$.
== Standardise and use the CLT ==
$$\begin{aligned}P\{|X| \le 20\} &= P\left\{-20 \le \sum_{k=1}^{1200} X_k \le 20\right\}\\&\approx P\left\{\frac{-20}{10} \le \frac{\sum X_k - 0}{10} \le \frac{20}{10}\right\}\\&= \Phi(2) - \Phi(-2) = 2\Phi(2) - 1 \approx 0.9545.\end{aligned}$$
:::

::: callout note The slide's "≈ 0.9"
Slide 22-009 ends with $\Phi(2) - \Phi(-2) \approx 0.9$. The method is right, but the value
is $2\Phi(2) - 1 = 2(0.9772) - 1 = 0.9544$ from the table ($0.9545$ computed exactly):
about 0.95, not 0.9. Use 0.9545 (or 0.9544).
:::

::: example Example 2: reliability of a system
A complex system has 100 components that work independently. During operation each
component breaks down with probability 0.10. The system works if at least 85 components
work. Find the system's reliability (the probability that it works).
== Set up the sum ==
Let $X$ be the number of working components and
$$X_k = \begin{cases} 1, & \text{component } k \text{ works},\\ 0, & \text{component } k \text{ breaks down,} \end{cases} \qquad X = \sum_{k=1}^{100} X_k.$$
Each $X_k$ is a two-point variable with $p = 0.9$: $E(X_k) = 0.9$, $D(X_k) = 0.9 \times 0.1 = 0.09$.
== Mean and standard deviation of the sum ==
$n\mu = 100 \times 0.9 = 90$ and $\sqrt n\,\sigma = \sqrt{100 \times 0.09} = 3$.
(Equivalently $X \sim B(100, 0.9)$ with $np = 90$, $\sqrt{npq} = 3$: de Moivre–Laplace.)
== Standardise and use the CLT ==
$$\begin{aligned}P\{X \ge 85\} &\approx P\left\{\frac{X - 90}{3} \ge \frac{85 - 90}{3}\right\}\\&= 1 - \Phi\left(-\frac53\right) = \Phi\left(\frac53\right) \approx 0.952.\end{aligned}$$
:::

::: callout note "At least 85" and the slide's P{X > 85}
The question asks for **at least** 85, $P\{X \ge 85\}$, but slide 22-011 writes
$P\{X > 85\}$. Under the normal approximation it makes no difference: a normal variable
takes any single value with probability 0, so both are $1 - \Phi(-5/3) \approx 0.952$, and
the slide's answer stands. For the exact binomial it does matter — $X$ is a whole number,
so $P\{X \ge 85\} = P\{X > 84\} \approx 0.960$ while $P\{X > 85\} \approx 0.927$. Textbooks
sometimes improve the approximation with a *continuity correction* (using 84.5 for
"$\ge 85$", which gives $\Phi(5.5/3) \approx 0.967$); this course doesn't use it, so answer
with 0.952.
:::

::: example Example 3 (multiple choice): standardising a sum of exponentials
$X_1, X_2, \dots$ are i.i.d., each exponential with parameter $\beta$. Which is true?
(A) $\lim_{n\to\infty} P\left\{\dfrac{\beta\sum_{i=1}^n X_i - n}{\sqrt n} \le x\right\} = \Phi(x)$;
(B) $\lim_{n\to\infty} P\left\{\dfrac{\sum_{i=1}^n X_i - n}{\sqrt n} \le x\right\} = \Phi(x)$;
(C) $\lim_{n\to\infty} P\left\{\dfrac{\sum_{i=1}^n X_i - \beta}{\sqrt n\,\beta} \le x\right\} = \Phi(x)$;
(D) $\lim_{n\to\infty} P\left\{\dfrac{\sum_{i=1}^n X_i - \beta}{n\beta} \le x\right\} = \Phi(x)$.
== Mean and variance ==
For $E(\beta)$ (density $\beta e^{-\beta x}$, $x > 0$): $E(X_i) = \dfrac1\beta$, $D(X_i) = \dfrac{1}{\beta^2}$.
== Standardise the sum ==
$n\mu = \dfrac n\beta$, $\sqrt n\,\sigma = \dfrac{\sqrt n}{\beta}$, so the standardised sum is
$$\frac{\sum X_i - \frac n\beta}{\frac{\sqrt n}{\beta}} = \frac{\beta\sum X_i - n}{\sqrt n}.$$
== Answer ==
By the CLT its distribution function tends to $\Phi(x)$: **(A)**. (B) would be right only for
$\beta = 1$; (C) and (D) subtract the wrong mean and divide by the wrong spread.
:::

::: example Example 4: fair coin, CLT against Chebyshev
A fair coin is tossed 100 times; $Y$ is the number of heads. Estimate $P\{40 < Y < 60\}$ by
the de Moivre–Laplace theorem, and compare with Chebyshev's inequality.
== CLT ==
$np = 50$, $\sqrt{npq} = \sqrt{25} = 5$:
$$P\{40 < Y < 60\} \approx \Phi\left(\frac{60 - 50}{5}\right) - \Phi\left(\frac{40 - 50}{5}\right) = 2\Phi(2) - 1 \approx 0.9545.$$
== Chebyshev ==
$P\{|Y - 50| < 10\} \ge 1 - \dfrac{D(Y)}{10^2} = 1 - \dfrac{25}{100} = 0.75$: true, but far
weaker.
== Back to Lesson 5.1 ==
How many tosses make $P\{|Y_n/n - 0.5| < 0.05\} \ge 0.9$? By the CLT
$P \approx 2\Phi\left(\frac{0.05\sqrt n}{0.5}\right) - 1 = 2\Phi(0.1\sqrt n) - 1 \ge 0.9$ needs
$\Phi(0.1\sqrt n) \ge 0.95$, so $0.1\sqrt n \ge 1.645$ and $n \ge 270.6$: **271** tosses, against
Chebyshev's 1000.
:::

::: callout exam What exams ask
Two kinds of question. (1) A calculation: recognise a sum of i.i.d. variables (errors,
lifetimes, counts of successes), find $n\mu$ and $\sqrt n\,\sigma$, standardise, and use
$\Phi$ — as in Examples 1, 2 and 4. (2) A choice: which standardised expression tends to
$\Phi(x)$ (Example 3), or which normal distribution approximates a sum or a mean (the
2025 final-exam question below). For (2), work out $E$ and $D$ of the sum or mean first;
the answer is the normal with those two numbers.
:::

::: example Example 5 (2025 final exam, multiple choice 6): the mean of exponentials
$X_1, X_2, \dots$ are i.i.d., each exponential with parameter $\frac12$. For large $n$, by the
central limit theorem, $Z_n = \frac1n\sum_{i=1}^n X_i$ is approximately: (A) $N(2, 4)$;
(B) $N(2n, 4n)$; (C) $N\left(2, \frac4n\right)$; (D) $N\left(\frac12, \frac{1}{4n}\right)$.
== Mean and variance of one ==
Parameter $\beta = \frac12$: $E(X_i) = \frac1\beta = 2$, $D(X_i) = \frac{1}{\beta^2} = 4$.
== Mean and variance of the average ==
$E(Z_n) = 2$ and $D(Z_n) = \dfrac{4}{n}$.
== Answer ==
$Z_n \overset{\text{approx.}}{\sim} N\left(2, \frac4n\right)$: **(C)**. (B) is the **sum**; (A) is one
$X_i$'s mean and variance; (D) confuses the parameter $\frac12$ with the mean.
:::

::: callout summary The whole lesson in four lines
For i.i.d. $X_k$ with mean $\mu$ and variance $\sigma^2$, and large $n$:
$\sum X_k \approx N(n\mu, n\sigma^2)$ and $\overline X \approx N(\mu, \sigma^2/n)$. For a binomial count,
$Y_n \approx N(np, npq)$. To find a probability, standardise with $n\mu$ and $\sqrt n\,\sigma$
and use $\Phi$.
:::

::: cards The central limit theorem
Slogan of the central limit theorem :: Many factors, small effects, normal in total (多因素，小影响，综合为正态).
Standardised sum of n i.i.d. variables :: $\dfrac{\sum X_k - n\mu}{\sqrt n\,\sigma}$, which tends in distribution to $N(0,1)$.
Lindeberg–Lévy theorem: conditions :: i.i.d. with finite mean μ and variance σ² > 0; nothing about the shape.
Approximate distribution of a sum of n i.i.d. variables :: $N(n\mu,\ n\sigma^2)$.
Approximate distribution of the mean of n i.i.d. variables :: $N(\mu,\ \sigma^2/n)$.
Standard deviation of a sum of n i.i.d. variables :: $\sqrt n\,\sigma$ (not $n\sigma$).
de Moivre–Laplace theorem :: For $Y_n \sim B(n,p)$, $\frac{Y_n - np}{\sqrt{npq}}$ is approximately $N(0,1)$ for large n.
Normal approximation to $B(n, p)$ :: $N(np, npq)$: $P\{a < Y_n \le b\} \approx \Phi\big(\frac{b-np}{\sqrt{npq}}\big) - \Phi\big(\frac{a-np}{\sqrt{npq}}\big)$.
Standardised sum of i.i.d. $E(\beta)$ variables :: $\dfrac{\beta\sum X_i - n}{\sqrt n}$, since $\mu = 1/\beta$, $\sigma = 1/\beta$.
Mean and variance of $U(-0.5, 0.5)$ :: 0 and 1/12.
LLN vs CLT :: LLN: $\overline X \to \mu$ in probability. CLT: $\overline X \approx N(\mu, \sigma^2/n)$, giving probabilities.
Does ≥ or > matter in a normal approximation? :: No: the normal gives each single value probability 0 (the exact binomial does differ).
:::

::: quiz The central limit theorem
? (2025 final exam, multiple choice 6) $X_1, X_2, \dots$ are i.i.d., exponential with parameter $\frac12$. For large $n$, $Z_n = \frac1n\sum_{i=1}^n X_i$ is approximately
- [ ] $N(2, 4)$
- [ ] $N(2n, 4n)$
- [x] $N\left(2, \frac4n\right)$
- [ ] $N\left(\frac12, \frac{1}{4n}\right)$
> $E(X_i) = 2$ and $D(X_i) = 4$, so $E(Z_n) = 2$ and $D(Z_n) = 4/n$.

? (Example 3) $X_1, X_2, \dots$ are i.i.d., exponential with parameter $\beta$. Which expression's distribution function tends to $\Phi(x)$?
- [x] $\dfrac{\beta\sum_{i=1}^n X_i - n}{\sqrt n}$
- [ ] $\dfrac{\sum_{i=1}^n X_i - n}{\sqrt n}$
- [ ] $\dfrac{\sum_{i=1}^n X_i - \beta}{\sqrt n\,\beta}$
- [ ] $\dfrac{\sum_{i=1}^n X_i - \beta}{n\beta}$
> $n\mu = n/\beta$ and $\sqrt n\,\sigma = \sqrt n/\beta$; $\frac{\sum X_i - n/\beta}{\sqrt n/\beta} = \frac{\beta\sum X_i - n}{\sqrt n}$.

? (Example 1) 1200 independent section errors, each $U(-0.5, 0.5)$ km. Approximate the probability that the total error is at most 20 km in absolute value.
answer: 2 Phi(2) - 1
tolerance: 0.5%
> $n\mu = 0$, $\sqrt n\,\sigma = \sqrt{1200/12} = 10$: $\Phi(2) - \Phi(-2) = 2\Phi(2) - 1 \approx 0.9545$
> (the slide's "0.9" is a rough rounding).

? (Example 2) 100 independent components each work with probability 0.9. Approximate the probability that at least 85 work.
answer: Phi(5/3)
tolerance: 0.5%
> $np = 90$, $\sqrt{npq} = 3$: $1 - \Phi\big(\frac{85-90}{3}\big) = \Phi(5/3) \approx 0.952$.

? 100 numbers are rounded to whole numbers; the rounding errors are independent and uniform on $(-0.5, 0.5)$. Approximate the probability that the total rounding error is at most 5 in absolute value.
answer: 2 Phi(sqrt(3)) - 1
tolerance: 1%
> $D(\text{sum}) = 100/12$, so $\sqrt n\,\sigma = 10/\sqrt{12} \approx 2.887$ and $5/2.887 = \sqrt3 \approx 1.732$:
> $2\Phi(\sqrt3) - 1 \approx 0.917$.

? A fair coin is tossed 100 times. Approximate $P\{Y \le 55\}$ for the number of heads $Y$.
answer: Phi(1)
tolerance: 0.5%
> $np = 50$, $\sqrt{npq} = 5$: $\Phi\big(\frac{55-50}{5}\big) = \Phi(1) \approx 0.8413$.

? $X_1, \dots, X_{100}$ are i.i.d. with mean 10 and variance 4. Approximate $P\{|\overline X - 10| < 0.4\}$.
answer: 2 Phi(2) - 1
tolerance: 0.5%
> $\overline X \approx N(10, 4/100)$, standard deviation $0.2$: $P\{|\overline X - 10| < 0.4\} \approx 2\Phi(2) - 1 \approx 0.9545$.

? $X_1, \dots, X_n$ are i.i.d. with variance $\sigma^2$. Write the standard deviation of $\sum_{i=1}^n X_i$.
expression: sqrt(n) σ
variables: n, σ
> $D(\sum X_i) = n\sigma^2$, so the standard deviation is $\sqrt n\,\sigma$.

? Which conditions does the Lindeberg–Lévy central limit theorem need?
- [ ] The $X_k$ are normal
- [x] The $X_k$ are i.i.d. with finite mean and positive finite variance
- [ ] The $X_k$ are independent with bounded variances, any distributions
- [ ] Only a finite mean
> The point of the theorem is that the $X_k$ can have **any** common distribution, provided
> they are i.i.d. and their variance is finite. A finite mean alone gives only Khinchin's law
> of large numbers.

? By the normal approximation, which is larger for $X \sim B(100, 0.9)$: $P\{X \ge 85\}$ or $P\{X > 85\}$?
- [ ] $P\{X \ge 85\}$
- [ ] $P\{X > 85\}$
- [x] The normal approximation (without correction) gives them the same value
> A normal variable gives each single point probability 0, so both are $\Phi(5/3) \approx 0.952$.
> (Exactly, $P\{X \ge 85\} \approx 0.960$ and $P\{X > 85\} \approx 0.927$.)
:::

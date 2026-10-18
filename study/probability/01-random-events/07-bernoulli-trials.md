---
title: Repeated trials and the binomial formula
zh: 独立试验序列与二项概率
summary: Repeating the same experiment independently — Bernoulli trials, the binomial formula for exactly k successes, why rare events become near-certain in many trials, and the Poisson theorem that approximates the binomial when n is large and p small.
source: §1.8 独立试验序列, 2026-09-10
---

Many questions in probability are really the same question: an experiment with a
"success" and a "failure" is repeated many times, independently — what is the chance of
exactly $k$ successes? Shots at a target, coins, defective items on a production line,
misprints on a page all fit this pattern. This lesson builds the one formula that
answers it, the **binomial formula**, from the independence rules of Lesson 1.6. It then
shows what happens when the number of trials is huge and the success probability tiny:
the binomial turns into the simpler **Poisson** formula, which is much easier to compute.

## Repeated independent trials

Imagine running the same experiment $E$ again and again — tossing the same coin, firing
the same gun — in such a way that no run remembers the others.

::: define Repeated independent trials | 重复独立试验
Repeat an experiment $E$ $n$ times. If the results of the runs don't affect one another —
the probability of each result in one run doesn't depend on the results of the other
runs — the $n$ trials are called {{term independent trials | 相互独立的试验}}, or
$n$ repeated independent trials ({{zh n 次重复独立试验}}).
:::

The simplest experiments have only two outcomes we care about: hit or miss, head or tail,
good or defective.

::: define Bernoulli trial | 伯努利试验
An experiment $E$ with only two possible results, $A$ and $\overline A$, is a
**Bernoulli trial**. Write $P(A) = p$ with $0 < p < 1$; then $P(\overline A) = 1 - p$.
Repeating $E$ independently $n$ times gives an
{{term n-fold Bernoulli trial | n 重伯努利试验}}.
:::

$A$ is usually called a "success", but it can be anything: a hit, a defective item, a 1 on
a die. Two examples from the lecture:

- Toss a coin $n$ times, watching for heads: an $n$-fold Bernoulli trial with $p = \frac12$.
- Throw a die $n$ times, watching only whether it shows a 1: also an $n$-fold Bernoulli
  trial, with $p = \frac16$. The die has six faces, but we've reduced it to two results,
  "1" and "not 1".

## The binomial formula

### Building it from a small case

::: example Exactly two hits in three shots
A shooter hits with probability $p$ on each shot, independently. Find the probability of
exactly two hits in three shots.
== Events ==
$A_i$ = "shot $i$ hits", $P(A_i) = p$. "Exactly two hits" means one of the three shots
misses and the other two hit:
$$A = \overline{A_1}A_2A_3 \cup A_1\overline{A_2}A_3 \cup A_1A_2\overline{A_3}.$$
== Add and multiply ==
The three pieces are mutually exclusive (they differ in which shot missed), so their
probabilities add; inside each piece the shots are independent, so probabilities
multiply:
$$P(A) = (1-p)p\,p + p(1-p)p + p\,p(1-p) = 3p^2(1-p).$$
:::

Look at the shape of the answer: each arrangement of 2 hits and 1 miss has probability
$p^2(1-p)^1$, and there are $3 = \binom32$ arrangements (choose which 2 of the 3 shots hit).
The same reasoning works for any $n$ and $k$.

### The general formula

In $n$ trials, a particular sequence with $k$ successes and $n - k$ failures — say
$A A \overline A \cdots A$ — has probability $p^k(1-p)^{n-k}$ by independence. The
number of such sequences is the number of ways to choose which $k$ of the $n$ positions
are successes, $C_n^k = \binom nk = \dfrac{n!}{k!(n-k)!}$ (the slides write $C_n^k$; many
books write $\binom nk$ — the same number, met in the counting rules of classical probability). The sequences are mutually
exclusive, so we add them up.

::: formula Binomial formula | 二项概率公式
$$P_n(k) = C_n^k\,p^k(1-p)^{n-k},\qquad k = 0, 1, 2, \dots, n$$
--
P_n(k) | probability of exactly $k$ successes in $n$ Bernoulli trials |
n | number of independent trials |
p | probability of success in one trial, $0 < p < 1$ |
C_n^k | number of ways to place the $k$ successes, $\binom nk$ |
:::

It is called *binomial* because the $P_n(k)$ are the terms of the binomial expansion
$\bigl(p + (1-p)\bigr)^n = \sum_{k=0}^n C_n^k p^k (1-p)^{n-k}$, which also shows they add
up to $1^n = 1$.

Move the sliders: with $p = \frac12$ the bars are symmetric; small $p$ piles them up near
0; the tallest bar sits close to $np$.

::: plot The binomial probabilities P_n(k)
x: 0 .. 20
xlabel: k
bars P(k) = comb(n, k) p^k (1 - p)^(n - k)
slider n: 1 .. 20 = 10 | | step 1
slider p: 0.01 .. 0.99 = 0.3
:::

::: example Three coins
Three fair coins are tossed together. What is the probability that exactly two land
heads up?
== Recognise the pattern ==
Three independent Bernoulli trials with $p = \frac12$; we want $k = 2$.
== Formula ==
$P_3(2) = C_3^2\left(\frac12\right)^2\left(\frac12\right)^1 = 3\cdot\frac18 = \frac38 = 0.375.$
:::

::: example At most one hit
A shooter fires three times, independently, hitting with probability 0.8 each time.
Find the probability of at most one hit.
== Split ==
"At most one" = "zero hits" or "exactly one hit", mutually exclusive:
$P = P_3(0) + P_3(1)$.
== Compute ==
$P_3(0) = 0.2^3 = 0.008$, $P_3(1) = C_3^1\cdot0.8\cdot0.2^2 = 3\times0.8\times0.04 = 0.096$.
So $P = 0.008 + 0.096 = 0.104$.
:::

::: callout pitfall Don't forget $C_n^k$
$p^k(1-p)^{n-k}$ is the probability of **one particular order** of successes and
failures. "Exactly $k$ successes" allows any order, so multiply by $C_n^k$. Conversely,
if the problem fixes the order ("the first two hit and the third misses"), there is no
$C_n^k$: the answer is $p^2(1-p)$.
:::

::: callout tip When is it binomial?
Check three things: (1) a fixed number $n$ of trials; (2) each trial has the same two
outcomes with the **same** $p$; (3) the trials are independent. Drawing without
replacement breaks (3) — and changes $p$ from draw to draw.
:::

## Small probabilities add up

An event that is unlikely in one trial, say $p = 0.001$, is easy to dismiss. But repeat
the trial many times and look at "it happens at least once". Its complement, "it never
happens", has probability $(1-p)^n$ by independence, so

::: formula At least one success in n trials | 至少成功一次的概率
$$P(\text{at least one success}) = 1 - (1-p)^n \xrightarrow{\;n\to\infty\;} 1$$
--
p | probability of the event in one trial, $0 < p < 1$ |
n | number of independent trials |
:::

With $p = 0.001$: after 1000 trials the chance of at least one occurrence is
$1 - 0.999^{1000} \approx 0.632$; after 5000 trials, about $0.993$.

::: callout key Small-probability events
A {{term small-probability event | 小概率事件}} is almost certain to happen at least once in
a large number of repeated independent trials. Rare accidents are not rare over millions
of journeys; "never mind, it's only 1 in 1000" is wrong if you try 5000 times.
:::

::: plot Chance of at least one occurrence in n trials
x: 0 .. 3000
xlabel: n
ylabel: probability
f(n) = 1 - (1 - p)^n
slider p: 0.0005 .. 0.01 = 0.001
:::

The slide's encouragement fits the formula: keep trying, and even a small chance of
success each time adds up to a large chance of succeeding in the end.

## The Poisson theorem

### Why we need an approximation

::: example 400 shots
Each shot hits with probability 0.02, independently. In 400 shots, what is the chance of
at least two hits?
== Binomial ==
$$P = \sum_{k=2}^{400} P_{400}(k) = \sum_{k=2}^{400} C_{400}^k\,0.02^k\,0.98^{400-k} = 1 - 0.98^{400} - 400\times0.02\times0.98^{399}.$$
== The difficulty ==
By hand this means powers like $0.98^{399}$ and, for other questions, coefficients like
$C_{400}^{200}$ — enormous numbers times tiny ones. We need something simpler.
:::

When $n$ is large and $p$ small, the product $\lambda = np$ (the average number of
successes) is a moderate number, and the binomial probabilities depend, to a good
approximation, on $\lambda$ alone.

::: theorem Poisson theorem | 泊松定理
In $n$-fold Bernoulli trials with success probability $p$, suppose $np = \lambda$, a
positive constant (so $p = \lambda/n$ shrinks as $n$ grows). Then for each fixed
$k = 0, 1, 2, \dots$,
$$\lim_{n\to\infty} C_n^k\,p^k(1-p)^{n-k} = \frac{\lambda^k}{k!}e^{-\lambda}.$$
:::

**Proof.** Put $p = \lambda/n$:
$$P_n(k) = \frac{n!}{k!(n-k)!}\Bigl(\frac\lambda n\Bigr)^k\Bigl(1-\frac\lambda n\Bigr)^{n-k}
= \frac{\lambda^k}{k!}\cdot\frac{n(n-1)\cdots(n-k+1)}{n^k}\cdot\Bigl(1-\frac\lambda n\Bigr)^{n}\cdot\Bigl(1-\frac\lambda n\Bigr)^{-k}.$$
Divide each of the $k$ factors $n, n-1, \dots, n-k+1$ by one $n$:
$$P_n(k) = \frac{\lambda^k}{k!}\Bigl[1\cdot\Bigl(1-\frac1n\Bigr)\cdots\Bigl(1-\frac{k-1}n\Bigr)\Bigr]\Bigl(1-\frac\lambda n\Bigr)^{n}\Bigl(1-\frac\lambda n\Bigr)^{-k}.$$
Now let $n\to\infty$ with $k$ fixed:

- the bracket is a product of $k$ factors, each tending to 1, so it tends to 1;
- $\bigl(1-\frac\lambda n\bigr)^{-k} \to 1$, a fixed power of something tending to 1;
- $\bigl(1-\frac\lambda n\bigr)^{n} \to e^{-\lambda}$, the standard limit
  $\lim_{n\to\infty}(1 + \frac xn)^n = e^x$ with $x = -\lambda$.

So $P_n(k) \to \frac{\lambda^k}{k!}e^{-\lambda}$. $\square$

::: callout note About the slides
The slides stop the proof at the bracketed line; the limit step above completes it.
:::

In practice we use the theorem as an approximation for large but finite $n$:

::: formula Poisson approximation | 泊松近似
$$C_n^k\,p^k(1-p)^{n-k} \approx \frac{\lambda^k}{k!}e^{-\lambda},\qquad \lambda = np$$
--
\lambda | $np$, the average number of successes |
k | number of successes, $0, 1, 2, \dots$ |
e | $2.71828\ldots$, the base of natural logarithms |
:::

**Rule of thumb (from the slides):** use it when $n$ is large ($n \ge 10$) and $p$ is
small ($p \le 0.1$). When instead $p \ge 0.9$, failures are the rare events: apply the
approximation to the number of failures, with $\lambda = n(1-p)$. The larger $n$ and the
smaller $p$, the better it works. The values $\frac{\lambda^k}{k!}e^{-\lambda}$ are the
Poisson distribution, met again in Chapter 2.

Compare the two sets of bars. With $n = 400$, $p = 0.02$ they are almost identical; raise
$p$ or lower $n$ and they drift apart.

::: plot Binomial B(n, p) against its Poisson approximation, λ = np
x: 0 .. 20
xlabel: k
bars B(k) = comb(n, k) p^k (1 - p)^(n - k)
bars Q(k) = e^(-n p) (n p)^k / k!
slider n: 10 .. 400 = 400 | | step 1
slider p: 0.005 .. 0.3 = 0.02
:::

::: explore How good is the Poisson approximation?
slider n: 10 .. 1000 = 400 | | step 1
slider p: 0.001 .. 0.3 = 0.02
slider k: 0 .. 20 = 2 | | step 1
b = comb(n, k) p^k (1 - p)^(n - k) | | Binomial
q = e^(-n p) (n p)^k / k! | | Poisson
err = abs(b - q) | | Error
:::

## Examples with the Poisson approximation

::: example 400 shots, finished
Back to 400 shots with $p = 0.02$: at least two hits.
== λ ==
$\lambda = np = 400\times0.02 = 8$; $n$ is large and $p$ small, so the approximation applies.
== Complement ==
$$P \approx \sum_{k\ge2}\frac{8^k}{k!}e^{-8} = 1 - e^{-8}\Bigl(\frac{8^0}{0!} + \frac{8^1}{1!}\Bigr) = 1 - 9e^{-8} \approx 1 - 0.0030 = 0.997.$$
== Check ==
The exact binomial value is $0.99717$; the approximation, $0.99698$, agrees to three
decimals. Even a 2% chance per shot makes at least two hits in 400 shots almost certain —
the slide's moral: persistence pays.
:::

::: example Misprints in a book
A 500-page book has 100 misprints, each equally likely to fall on any page, independently.
Find the probability that a given page has at least 2 misprints.
== Bernoulli trials ==
Each misprint is a trial: "success" = it lands on our page, $p = \frac1{500}$, $n = 100$.
Exactly:
$$P = \sum_{k=2}^{100} C_{100}^k\Bigl(\frac1{500}\Bigr)^k\Bigl(1-\frac1{500}\Bigr)^{100-k}.$$
== Poisson ==
$\lambda = np = 100\times\frac1{500} = 0.2$, so
$$P \approx 1 - e^{-0.2}(1 + 0.2) = 1 - 1.2e^{-0.2} \approx 1 - 0.98248 = 0.017523.$$
== Check ==
The exact binomial sum is about $0.01739$; the approximation is close, though with
$n = 100$ and $\lambda = 0.2$ only the second decimal digit agrees exactly.
:::

::: example Insect eggs
An insect lays $k$ eggs with probability $p_k = \dfrac{\lambda^k}{k!}e^{-\lambda}$,
$k = 0, 1, 2, \dots$. Each egg hatches with probability $p$, independently of the others.
What is the probability the insect has exactly $L$ offspring?
== Partition by the number of eggs ==
Let $A$ = "exactly $L$ offspring" and $B_k$ = "exactly $k$ eggs laid". To get $L$
offspring at least $L$ eggs are needed, so only $k = L, L+1, \dots$ count.
== Total probability ==
Given $k$ eggs, the hatchings are $k$ Bernoulli trials, so
$P(A\mid B_k) = C_k^L p^L (1-p)^{k-L}$. By the law of total probability (Lesson 1.5):
$$P(A) = \sum_{k=L}^{\infty}\frac{\lambda^k}{k!}e^{-\lambda}\,C_k^L p^L(1-p)^{k-L}
= \sum_{k=L}^{\infty}\frac{\lambda^k e^{-\lambda} p^L}{L!\,(k-L)!}(1-p)^{k-L}.$$
== Sum the series ==
Take out $\frac{(\lambda p)^L}{L!}e^{-\lambda}$ (using $\lambda^k = \lambda^L\lambda^{k-L}$) and put $m = k - L$:
$$P(A) = \frac{(\lambda p)^L}{L!}e^{-\lambda}\sum_{m=0}^{\infty}\frac{[\lambda(1-p)]^m}{m!}
= \frac{(\lambda p)^L}{L!}e^{-\lambda}e^{\lambda(1-p)} = \frac{(\lambda p)^L}{L!}e^{-\lambda p}.$$
== Meaning ==
The offspring count has the same Poisson form, with $\lambda$ replaced by $\lambda p$: on
average $\lambda$ eggs, of which a fraction $p$ hatch.
:::

::: callout exam What exams ask
Recognise a binomial situation and write $C_n^k p^k(1-p)^{n-k}$ (exactly $k$), sums of it
("at most", "at least"), or $1 - (1-p)^n$ ("at least once"). For large $n$ and small $p$,
compute $\lambda = np$ and use the Poisson approximation, turning "at least 2" into
$1 - P(0) - P(1)$.
:::

::: cards Bernoulli trials and the binomial formula
Repeated independent trials :: The same experiment repeated $n$ times, the results of the runs not affecting one another
Bernoulli trial :: An experiment with only two results, $A$ and $\overline A$, with $P(A) = p$
$n$-fold Bernoulli trial :: A Bernoulli trial repeated independently $n$ times
Binomial formula :: $P_n(k) = C_n^k p^k (1-p)^{n-k}$, $k = 0, 1, \dots, n$
Why the factor $C_n^k$? :: Each order of $k$ successes has probability $p^k(1-p)^{n-k}$; there are $C_n^k$ orders
Probability of at least one success in $n$ trials :: $1 - (1-p)^n$
Small-probability events in many trials :: Almost certain to happen at least once: $1 - (1-p)^n \to 1$
Poisson theorem :: If $np = \lambda$ is constant, $C_n^k p^k (1-p)^{n-k} \to \frac{\lambda^k}{k!}e^{-\lambda}$ as $n\to\infty$
What is $\lambda$ in the Poisson approximation? :: $\lambda = np$, the average number of successes
When to use the Poisson approximation :: $n$ large ($\ge 10$) and $p$ small ($\le 0.1$); for $p \ge 0.9$ count failures instead
Limit used in the Poisson proof :: $(1 - \lambda/n)^n \to e^{-\lambda}$
Poisson eggs, each hatching with probability $p$ :: The offspring are Poisson with $\lambda p$
:::

::: quiz Repeated trials
? Three fair coins are tossed together. What is the probability that exactly two land heads up?
- [ ] 0.5
- [ ] 0.25
- [ ] 0.125
- [x] 0.375
> Three Bernoulli trials with $p = \frac12$: $C_3^2(\frac12)^2(\frac12) = \frac38 = 0.375$.
> (Class question 08-027: D.)

? A shooter fires three times, independently, with hit probability 0.8. What is the probability of at most one hit?
- [ ] 0.002
- [ ] 0.008
- [ ] 0.08
- [x] 0.104
> $P_3(0) + P_3(1) = 0.2^3 + 3\times0.8\times0.2^2 = 0.008 + 0.096 = 0.104$. 0.008 is only
> "no hits". (Class question 08-028: D.)

? A shooter hits with probability $p$. Write the probability of exactly two hits in three independent shots.
expression: 3 p^2 (1 - p)
variables: p
> Three orders (which shot misses), each $p^2(1-p)$: $C_3^2p^2(1-p) = 3p^2(1-p)$.

? Same shooter: the probability that the first two shots hit and the third misses?
expression: p^2 (1 - p)
variables: p
> The order is fixed, so there is just one sequence: $p\cdot p\cdot(1-p)$, no $C_3^2$.

? $n = 5$, $p = 0.3$. Find $P_5(2)$.
answer: C(5,2) 0.3^2 0.7^3
> $C_5^2(0.3)^2(0.7)^3 = 10\times0.09\times0.343 = 0.3087$.

? An event has probability 0.1 in one trial. What is the probability it happens at least once in 10 independent trials?
answer: 1 - 0.9^10
> $1 - (1 - 0.1)^{10} = 1 - 0.9^{10} \approx 0.6513$.

? 1000 independent trials, each succeeding with probability 0.002. Using the Poisson approximation, what is the probability of no successes?
answer: e^(-2)
> $\lambda = np = 2$, so $P(0) \approx \frac{2^0}{0!}e^{-2} = e^{-2} \approx 0.1353$. (Exact:
> $0.998^{1000} \approx 0.1351$.)

? 400 shots at hit probability 0.02. Using the Poisson approximation, what is the probability of at least two hits?
answer: 1 - 9 e^(-8)
tolerance: 0.1%
> $\lambda = 8$; $1 - e^{-8}(1 + 8) = 1 - 9e^{-8} \approx 0.997$.

? Which situation is **not** an n-fold Bernoulli trial?
- [ ] Tossing a coin 20 times and counting heads
- [ ] Throwing a die 12 times and counting how often it shows a 1
- [x] Drawing 5 cards without replacement and counting the hearts
- [ ] Firing 10 independent shots with the same hit probability
> Without replacement, each draw changes the deck: the draws are not independent and $p$
> changes from draw to draw. The others are independent trials with a fixed $p$.

? What is $\lambda$ in the Poisson approximation of $C_n^k p^k (1-p)^{n-k}$? (Write it in terms of $n$ and $p$.)
expression: n p
variables: n, p
> $\lambda = np$, the average number of successes in $n$ trials.
:::

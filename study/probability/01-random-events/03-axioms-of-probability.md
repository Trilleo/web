---
title: Frequency, geometric and axiomatic probability
zh: 频率、几何概型与概率的公理化定义
summary: Frequency and its stability, the statistical definition of probability, geometric probability (the meeting problem), Kolmogorov's axioms, and the rules proved from them — complements, differences and the addition formula for two and three events.
source: 2性质乘法定理1-2 (§1.5), 2026-09-02
---

The classical model of Lesson 1.2 only works when there are finitely many equally likely
outcomes. A biased coin, a bulb's lifetime or a point thrown at a target don't fit. This
lesson looks at two other ways people have defined probability — as a long-run
**frequency**, and as a ratio of **lengths or areas** — and then at the modern answer:
don't define probability by a recipe at all, but by three **axioms** that every
sensible recipe obeys. From those three rules come all the formulas you will use daily:
$P(\overline{A}) = 1 - P(A)$, $P(A - B) = P(A) - P(AB)$ and the addition formula.

## Frequency

Toss a coin many times and count the heads. The count itself is random, but the
*share* of heads behaves more and more predictably.

::: define Frequency | 频率
Repeat a trial $E$ independently $n$ times under the same conditions. If the event $A$
happens $n_A$ times, the ratio $f_n(A) = n_A/n$ is the frequency of $A$.
:::

::: formula Frequency of an event | 频率
$$f_n(A) = \frac{n_A}{n}$$
--
$n$ | the number of repetitions of the trial
$n_A$ | how many of them $A$ happened in
$f_n(A)$ | the frequency of $A$, between 0 and 1
:::

From the definition, $0 \le f_n(A) \le 1$, $f_n(\Omega) = 1$, and for mutually exclusive
$A$, $B$, $f_n(A \cup B) = f_n(A) + f_n(B)$ (the counts simply add). Keep these three
facts in mind: they come back as the axioms.

In class, a coin was tossed 5, 50 and 500 times, seven times over each:

| Run | $n = 5$: heads $n_H$ | frequency $f$ | $n = 50$: heads $n_H$ | frequency $f$ | $n = 500$: heads $n_H$ | frequency $f$ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 0.4 | 22 | 0.44 | 251 | 0.502 |
| 2 | 3 | 0.6 | 25 | 0.50 | 249 | 0.498 |
| 3 | 1 | 0.2 | 21 | 0.42 | 256 | 0.512 |
| 4 | 5 | 1.0 | 25 | 0.50 | 247 | 0.494 |
| 5 | 1 | 0.2 | 24 | 0.48 | 251 | 0.502 |
| 6 | 2 | 0.4 | 18 | 0.36 | — | — |
| 7 | 4 | 0.8 | 27 | 0.54 | 258 | 0.516 |

(On the slide, run 6 at $n = 500$ is hidden behind a label.) Two things show:

1. **Frequencies fluctuate at random** (随机波动性): the same $n$ gives different $f$.
2. **They stabilise** (稳定性): with 5 tosses $f$ swings from 0.2 to 1.0; with 500 it
   stays within about 0.02 of 0.5. The long historical runs of Lesson 1.1 (De Morgan,
   Buffon, Pearson: 0.5181, 0.5069, 0.5016, 0.5005) push the same way.

The plot shows how wide the typical swing is: about $\sqrt{p(1-p)/n}$ either side of the
true value $p$ — a formula proved much later in the course. Quadruple $n$ to halve it.

::: plot How far a frequency typically strays from p
x: 1 .. 500
xlabel: n (trials)
ylabel: frequency
upper(n) = p + sqrt(p (1 - p) / n)
centre(n) = p
lower(n) = p - sqrt(p (1 - p) / n)
slider p: 0.05 .. 0.95 = 0.5
:::

::: define Statistical probability | 统计概率
If, in $n$ repetitions under the same conditions, the frequency of $A$ settles near a
constant $p$, swinging less as $n$ grows, then $p$ is called the probability of $A$:
$P(A) = p$.
:::

This definition is intuitive and easy to understand, but rough and vague: how large must
$n$ be, and what exactly does "settles near" mean? You can never toss infinitely often,
so it can't be used to *compute* a probability exactly — only to estimate one, or to
check a model against data.

## Geometric probability

Throw a dart "at random" at a square board: every point equally likely. There are
infinitely many points, so counting fails — but **areas** still make sense. The chance of
landing in a region should be its share of the board's area.

::: define Geometric probability model | 几何概型
A trial where
1. the sample space $\Omega$ is a region whose size can be measured (a segment, a plane
   region, a solid), and
2. a point $M$ thrown into $\Omega$ is equally likely to land anywhere in it.
Then the probability that $M$ lands in a subregion $A$ is the ratio of their sizes.
:::

::: formula Geometric probability | 几何概率
$$P(A) = \frac{\text{measure of } A}{\text{measure of } \Omega}$$
--
measure | length, area or volume (测度), whichever fits the dimension of $\Omega$
:::

::: example The meeting problem | 会面问题
甲 and 乙 agree to meet between 6 and 7 o'clock. Whoever arrives first waits 10 minutes,
then leaves. Each arrives at a time equally likely to be anywhere in the hour, and the
two arrival times don't affect each other. Find the probability that they meet.
== Turn it into points ==
Let $x$, $y$ be 甲's and 乙's arrival times, in minutes after 6:00. Each pair is a point
of the square $\Omega = \{(x, y) \mid 0 \le x \le 60,\ 0 \le y \le 60\}$, all equally
likely.
== The event ==
They meet when the arrivals are at most 10 minutes apart:
$A = \{(x, y) \in \Omega \mid |x - y| \le 10\}$, the band between the lines
$y = x + 10$ and $y = x - 10$.
== Areas ==
Outside the band are two corner triangles with legs 50, total area
$2 \cdot \tfrac12 \cdot 50^2 = 50^2$. So
$$P(A) = \frac{60^2 - (60 - 10)^2}{60^2} = \frac{3600 - 2500}{3600} = \frac{11}{36} \approx 0.306.$$
:::

::: plot The meeting problem: the band |x − y| ≤ t
x: 0 .. 60
y: 0 .. 60
xlabel: x (甲 arrives, min)
ylabel: y (乙 arrives, min)
region A: 0 <= x <= 60, 0 <= y <= 60, abs(x - y) <= t
f(x) = x + t
g(x) = x - t
slider t: 0 .. 60 = 10 | min
:::

::: explore Meeting probability for a waiting time t
slider t: 0 .. 60 = 10 | min
P = (60^2 - (60 - t)^2) / 60^2 | | Probability they meet
:::

Waiting 20 minutes gives $1 - (40/60)^2 = 5/9$; waiting 30 minutes, $3/4$.

::: example Two numbers with a small sum
Two numbers are picked at random from $(0, 1)$. Find the probability that their sum is
less than $\tfrac65$.
== Sample space ==
$\Omega = \{(x, y) \mid 0 < x < 1,\ 0 < y < 1\}$, the unit square, area 1.
== The event ==
$A = \{(x, y) \in \Omega \mid x + y < \tfrac65\}$: the square below the line
$x + y = \tfrac65$.
== The part cut off ==
The line meets the top edge at $x = \tfrac15$ and the right edge at $y = \tfrac15$, so the
corner triangle above it has legs $1 - \tfrac15 = \tfrac45$ and area
$\tfrac12 \cdot \tfrac45 \cdot \tfrac45 = \tfrac{8}{25}$.
== Probability ==
$P(A) = 1 - \tfrac{8}{25} = \tfrac{17}{25} = 0.68$.
:::

::: plot Two numbers from (0, 1): where x + y < s
x: 0 .. 1
y: 0 .. 1
region A: 0 < x < 1, 0 < y < 1, x + y < s
f(x) = s - x
slider s: 0 .. 2 = 1.2
:::

::: callout pitfall Probability 0 is not "impossible"
In a geometric model a single point, or a line, has area 0, so the event "甲 and 乙
arrive at exactly the same instant" has probability 0 — yet it can happen. Probability
0 means "impossible" only in finite (classical) models. Likewise probability 1 doesn't
always mean certain.
:::

## The axioms of probability

Three definitions so far, each for its own kind of trial, and each with weak points.
In 1933 the Soviet mathematician A. N. Kolmogorov (1903–1987) took a different route:
list the properties *every* probability must have — the three that frequencies,
classical and geometric probabilities all share — and call anything with them a
probability. The whole theory is then built from those rules.

::: define Probability (axiomatic definition) | 概率的公理化定义
Let $E$ be a trial with sample space $\Omega$. A rule $P$ that gives each event $A$ a
real number $P(A)$ is a **probability** if
1. **non-negativity** (非负性): $P(A) \ge 0$ for every event $A$;
2. **normalisation** (规范性): $P(\Omega) = 1$;
3. **countable additivity** (可列可加性): for pairwise mutually exclusive events
   $A_1, A_2, \dots$ ($A_iA_j = \varnothing$ for $i \ne j$),
   $$P(A_1 \cup A_2 \cup \cdots) = P(A_1) + P(A_2) + \cdots.$$
:::

The axioms don't say *what* $P(A)$ is for a given trial — that is the model's job
(counting, areas, data). They say what any answer must obey. Everything below follows
from them alone.

## Properties proved from the axioms

::: theorem Properties of probability | 概率的性质
For any events $A$, $B$:
1. $P(\varnothing) = 0$.
2. **Finite additivity** (有限可加性): if $A_1, \dots, A_n$ are pairwise mutually exclusive,
   $P(A_1 \cup \cdots \cup A_n) = P(A_1) + \cdots + P(A_n)$.
3. $P(\overline{A}) = 1 - P(A)$.
4. $0 \le P(A) \le 1$.
5. $P(A - B) = P(A\overline{B}) = P(A) - P(AB)$; in particular, if $B \subset A$ then
   $P(A - B) = P(A) - P(B)$ and $P(B) \le P(A)$.
6. **Addition formula**: $P(A \cup B) = P(A) + P(B) - P(AB)$.
:::

Each proof cuts an event into mutually exclusive pieces and adds them up.

::: example Proofs of properties 1–4
== 1. The empty event ==
$\Omega = \Omega \cup \varnothing \cup \varnothing \cup \cdots$, all pieces mutually
exclusive. By countable additivity $P(\Omega) = P(\Omega) + P(\varnothing) +
P(\varnothing) + \cdots$. Since $P(\Omega) = 1$ is finite,
$P(\varnothing) + P(\varnothing) + \cdots = 0$, and as each term is $\ge 0$, $P(\varnothing) = 0$.
== 2. Finitely many events ==
Pad the list with empty events: $A_1 \cup \cdots \cup A_n = A_1 \cup \cdots \cup A_n \cup
\varnothing \cup \varnothing \cup \cdots$. Countable additivity and $P(\varnothing) = 0$
give $P(A_1) + \cdots + P(A_n) + 0 + 0 + \cdots$.
== 3. Complement ==
$\Omega = A \cup \overline{A}$ with $A\overline{A} = \varnothing$, so
$1 = P(\Omega) = P(A) + P(\overline{A})$, hence $P(\overline{A}) = 1 - P(A)$.
== 4. Between 0 and 1 ==
$P(A) = 1 - P(\overline{A})$ and $P(\overline{A}) \ge 0$, so $P(A) \le 1$; and $P(A) \ge 0$
is an axiom.
:::

::: formula Complement rule | 对立事件的概率
$$P(\overline{A}) = 1 - P(A)$$
--
$\overline{A}$ | the complement of $A$: $A$ doesn't happen
:::

The complement rule is the most useful trick in the course: when "at least one" is hard,
compute "none" and subtract from 1 (the birthday problem in Lesson 1.2 did exactly this).

::: venn Cutting A into two exclusive pieces: A = AB ∪ AB′
shade: AB
shade: AB'
:::

::: example Proofs of properties 5 and 6
== 5. Difference ==
$A = AB \cup A\overline{B}$, and $AB$, $A\overline{B}$ are mutually exclusive (the panels
above). So $P(A) = P(AB) + P(A\overline{B})$, that is $P(A - B) = P(A\overline{B}) = P(A) -
P(AB)$. If $B \subset A$ then $AB = B$, so $P(A - B) = P(A) - P(B)$; and since this is
$\ge 0$, $P(B) \le P(A)$.
== 6. Addition formula ==
$A \cup B = A\overline{B} \cup B$, mutually exclusive pieces. So
$P(A \cup B) = P(A\overline{B}) + P(B) = P(A) - P(AB) + P(B)$.
:::

::: formula Difference rule | 减法公式
$$P(A - B) = P(A\overline{B}) = P(A) - P(AB)$$
--
$A - B$ | $A$ happens and $B$ doesn't
$AB$ | both happen
:::

::: formula Addition formula | 加法公式
$$P(A \cup B) = P(A) + P(B) - P(AB)$$
--
$A \cup B$ | at least one of $A$, $B$ happens
$AB$ | both happen (counted twice in $P(A) + P(B)$, so subtracted once)
:::

The idea is in the name "inclusion–exclusion": adding $P(A)$ and $P(B)$ counts the
overlap $AB$ twice, so take it away once. For three events, the pairwise overlaps are
taken away, but then the triple overlap $ABC$ has been removed once too often, so it is
added back.

::: formula Addition formula for three events | 三个事件的加法公式
$$P(A \cup B \cup C) = P(A) + P(B) + P(C) - P(AB) - P(BC) - P(AC) + P(ABC)$$
--
$ABC$ | all three happen
:::

Proof: apply the two-event formula to $(A \cup B) \cup C$:
$P(A \cup B) + P(C) - P\big((A \cup B)C\big)$. By the distributive law
$(A \cup B)C = AC \cup BC$, and $(AC)(BC) = ABC$, so
$P\big((A \cup B)C\big) = P(AC) + P(BC) - P(ABC)$. Putting it together gives the formula.

::: venn The pieces of the three-event formula
sets: A B C
shade: A ∪ B ∪ C
shade: AB ∪ BC ∪ AC
shade: ABC
:::

::: callout pitfall The short forms need conditions
$P(A \cup B) = P(A) + P(B)$ only when $A$ and $B$ are **mutually exclusive**, and
$P(A - B) = P(A) - P(B)$ only when $B \subset A$. In general use the full forms, with
$-P(AB)$.
:::

::: callout key Three numbers decide everything for two events
$P(A)$, $P(B)$ and $P(AB)$ (or any three of $P(A)$, $P(B)$, $P(AB)$, $P(A \cup B)$)
fix every other probability: $P(A \cup B)$, $P(A\overline{B})$, $P(\overline{A}B)$,
$P(\overline{A}\,\overline{B}) = 1 - P(A \cup B)$. Draw the Venn diagram, fill in its four
regions, and read off what's asked.
:::

## Using the rules

::: example Three fill-ins from the lecture
(1) $P(A) = 0.4$, $P(B) = 0.3$, $P(A \cup B) = 0.6$. Find $P(\overline{A}B)$.
(2) $P(A) = 0.7$, $P(A - B) = 0.3$. Find $P(\overline{AB})$.
(3) $P(A) = 0.4$, $P(A \cup B) = 0.7$, and $A$, $B$ are mutually exclusive. Find $P(B)$.
== (1) ==
$\overline{A}B = B - A$, the part of $A \cup B$ outside $A$:
$P(\overline{A}B) = P(A \cup B) - P(A) = 0.6 - 0.4 = 0.2$.
(Check: $P(AB) = 0.4 + 0.3 - 0.6 = 0.1$ and $P(B) - P(AB) = 0.2$.)
== (2) ==
$P(AB) = P(A) - P(A - B) = 0.7 - 0.3 = 0.4$, so $P(\overline{AB}) = 1 - 0.4 = 0.6$. The bar
covers the whole product: "not both".
== (3) ==
Mutually exclusive, so $P(A \cup B) = P(A) + P(B)$: $P(B) = 0.7 - 0.4 = 0.3$.
:::

::: example Three events, one overlap missing
$P(A) = P(B) = P(C) = \tfrac14$, $P(AB) = 0$, $P(AC) = P(BC) = \tfrac{1}{16}$. Find the
probability that at least one of $A$, $B$, $C$ happens, and that none does.
== The triple overlap ==
$ABC \subset AB$, so $0 \le P(ABC) \le P(AB) = 0$: $P(ABC) = 0$.
== At least one ==
$P(A \cup B \cup C) = \tfrac34 - 0 - \tfrac1{16} - \tfrac1{16} + 0 = \tfrac58$.
== None ==
By De Morgan and the complement rule,
$P(\overline{A}\,\overline{B}\,\overline{C}) = 1 - P(A \cup B \cup C) = \tfrac38$.
:::

::: example Divisible by 2 or 3
A whole number is picked at random from 1 to 100. Find the probability that it is
divisible by 2 or by 3.
== Events ==
$A = \{\text{divisible by } 2\}$: 50 numbers; $B = \{\text{divisible by } 3\}$: 33
numbers; $AB = \{\text{divisible by } 6\}$: 16 numbers.
== Addition formula ==
$P(A \cup B) = \tfrac{50}{100} + \tfrac{33}{100} - \tfrac{16}{100} = \tfrac{67}{100}$.
:::

::: callout exam What exams ask
Fill-ins like the three above: given some of $P(A)$, $P(B)$, $P(AB)$, $P(A \cup B)$,
$P(A - B)$, find another — often with a bar to unpack by De Morgan. Choice questions ask
which formula "always holds" (the ones without conditions) or which statement about
$A \subset B$ is false. Geometric questions are the meeting problem and its relatives:
draw the square, shade the event, compute areas.
:::

::: cards Frequency, geometric and axiomatic probability
Frequency (频率) $f_n(A)$ :: $n_A/n$: the share of $n$ repetitions in which $A$ happened.
Two features of frequencies :: Random fluctuation for fixed $n$, and stability as $n$ grows.
Statistical probability (统计概率) :: The constant the frequency settles near; intuitive but vague.
Geometric probability (几何概型) :: $P(A)$ is the measure of $A$ over the measure of $\Omega$ (length, area, volume), all points equally likely.
Meeting problem: wait 10 min within an hour :: $P = (60^2 - 50^2)/60^2 = 11/36$.
Kolmogorov's three axioms :: Non-negativity $P(A) \ge 0$; normalisation $P(\Omega) = 1$; countable additivity for pairwise mutually exclusive events.
The impossible event: $P(\varnothing)$ :: 0
Complement rule :: $P(\overline{A}) = 1 - P(A)$
Difference rule :: $P(A - B) = P(A\overline{B}) = P(A) - P(AB)$
If $B \subset A$ :: $P(A - B) = P(A) - P(B)$ and $P(B) \le P(A)$.
Addition formula :: $P(A \cup B) = P(A) + P(B) - P(AB)$
Addition formula for three events :: $P(A) + P(B) + P(C) - P(AB) - P(BC) - P(AC) + P(ABC)$
Does $P(A) = 0$ mean $A$ is impossible? :: Not in general: in a geometric model a single point has probability 0 but can happen.
:::

::: quiz Check yourself
? $P(A) = a$, $P(B) = b$, $P(A \cup B) = c$. Then $P(A\overline{B}) =$
- [ ] $a - b$
- [x] $c - b$
- [ ] $a(1 - b)$
- [ ] $b - a$
> $A\overline{B}$ is the part of $A \cup B$ outside $B$: $P(A\overline{B}) = P(A \cup B) - P(B) = c - b$ (equally $a - P(AB)$). In-class question, answer B.

? If $A \subset B$, which statement is **false**?
- [ ] $P(A) \le P(B)$
- [ ] $P(B - A) \ge 0$
- [x] $B$ didn't happen, but $A$ may have happened
- [ ] $B$ happened, but $A$ may not have happened
> $A \subset B$ means $A$ happening forces $B$, so if $B$ didn't happen, $A$ didn't either. The others are true. In-class question, answer C.

? $P(A) = 0.4$, $P(B) = 0.3$, $P(A \cup B) = 0.6$. Find $P(\overline{A}B)$.
answer: 0.2
> $P(\overline{A}B) = P(A \cup B) - P(A) = 0.6 - 0.4 = 0.2$.

? $P(A) = 0.7$ and $P(A - B) = 0.3$. Find $P(\overline{AB})$ (the bar over the whole product).
answer: 0.6
> $P(AB) = P(A) - P(A - B) = 0.4$, so $P(\overline{AB}) = 1 - 0.4 = 0.6$.

? $P(A) = 0.4$, $P(A \cup B) = 0.7$, and $A$, $B$ are mutually exclusive. Find $P(B)$.
answer: 0.3
> For mutually exclusive events $P(A \cup B) = P(A) + P(B)$, so $P(B) = 0.3$.

? In the meeting problem, the first to arrive now waits 20 minutes. The probability they meet?
answer: (60^2 - 40^2) / 60^2
> The corner triangles have legs $60 - 20 = 40$: $P = 1 - (40/60)^2 = 5/9 \approx 0.556$.

? Two numbers are picked at random from $(0, 1)$. The probability that their sum is less than $\tfrac12$?
answer: 1/8
> The region $x + y < \tfrac12$ is a triangle with legs $\tfrac12$: area $\tfrac12 \cdot \tfrac12 \cdot \tfrac12 = \tfrac18$, out of the square's area 1.

? $P(A) = P(B) = P(C) = \tfrac14$, $P(AB) = 0$, $P(AC) = P(BC) = \tfrac1{16}$. Find the probability that none of $A$, $B$, $C$ happens.
answer: 3/8
> $P(ABC) = 0$ because $ABC \subset AB$. So $P(A \cup B \cup C) = \tfrac34 - \tfrac2{16} = \tfrac58$, and "none" is its complement: $\tfrac38$.

? A number is picked at random from 1 to 100. The probability that it is divisible by 2 or 3?
answer: 0.67
> $50 + 33 - 16 = 67$ numbers (the 16 multiples of 6 were counted twice): $67/100$.

? Which is **not** one of Kolmogorov's axioms?
- [ ] $P(A) \ge 0$ for every event
- [ ] $P(\Omega) = 1$
- [ ] $P(A_1 \cup A_2 \cup \cdots) = \sum P(A_i)$ for pairwise mutually exclusive events
- [x] $P(\overline{A}) = 1 - P(A)$
> The complement rule is a property *proved* from the axioms ($\Omega = A \cup \overline{A}$, then additivity and normalisation), not an axiom itself.

? $P(A) = p$, $P(B) = q$ and $AB = \varnothing$. The probability that exactly one of $A$, $B$ happens is (in class, 07-009)
- [x] $p + q$
- [ ] $1 - p + q$
- [ ] $1 + p - q$
- [ ] $p + q - 2pq$
> "Exactly one" is $A\overline{B} \cup \overline{A}B$. With $AB = \varnothing$ the two can't happen together, so exactly one happens whenever either does: $P(A \cup B) = p + q - P(AB) = p + q$. ($p + q - 2pq$ would be right if $A$, $B$ were *independent*: Lesson 1.6.)

? Which statement is true? (in class, 07-011)
- [ ] If $P(A) = 0$, then $A$ is the impossible event
- [ ] If $P(A \cup B) = P(A) + P(B)$, then $A$ and $B$ are mutually exclusive
- [x] If $P(A \cup B) - P(AB) = 1$, then $P(A) + P(B) = 1$
- [ ] $P(A - B) = P(A) - P(B)$
> Since $P(A \cup B) \le 1$ and $P(AB) \ge 0$, the difference can only be 1 if $P(A \cup B) = 1$ and $P(AB) = 0$; then $P(A) + P(B) = P(A \cup B) + P(AB) = 1$. The others fail: an event of probability 0 needn't be impossible (a single point in the meeting square); the sum rule only gives $P(AB) = 0$, not $AB = \varnothing$; and $P(A - B) = P(A) - P(AB)$, which equals $P(A) - P(B)$ only when $B \subset A$.
:::

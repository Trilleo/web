---
title: Independence of events
zh: 事件的独立性
summary: When one event tells you nothing about another — the product rule P(AB) = P(A)P(B), how it differs from mutual exclusion, pairwise versus mutual independence, and how independence makes "at least one" problems easy.
source: 3全概率贝叶斯2-1 (§1.8 事件的独立性) and §1.8 独立试验序列, 2026-09-07 → 09-10
---

Conditional probability (Lesson 1.4) asks how learning that $A$ happened changes the
chance of $B$. Very often the answer is "not at all": the second toss of a coin doesn't
care about the first, and two machines in different factories break down on their own.
That situation is called **independence**, and it is the single most useful assumption in
probability: it turns the probability of "both" into a plain product, and the probability
of "at least one" into one minus a product. This lesson defines it carefully, warns you
off the classic confusion with mutually exclusive events, and shows why three events need
more than three equations.

## The idea: one event doesn't change the other

A box holds 5 balls, 3 green and 2 red. Draw one, put it back, mix, and draw again. Let

- $A$ = "the first ball is green",
- $B$ = "the second ball is green".

Because the first ball goes back, the second draw starts from exactly the same box. So
whatever happened first, $P(B) = 3/5$: in symbols, $P(B\mid A) = P(B)$. Knowing $A$
happened doesn't move the probability of $B$.

Multiply out the definition of conditional probability, $P(B\mid A) = P(AB)/P(A)$, and
this becomes

$$P(B\mid A) = P(B) \iff P(AB) = P(A)P(B) \qquad (P(A) > 0).$$

The right-hand form is the one we take as the definition. It is symmetric in $A$ and
$B$, and it needs no condition like $P(A) > 0$.

::: define Independent events | 相互独立
Two events $A$ and $B$ are **independent** if
$$P(AB) = P(A)P(B).$$
We also say simply "$A$ and $B$ are independent" ({{zh 简称 A, B 独立}}). Informally: whether
$A$ happens has no influence on the probability of $B$, and vice versa.
:::

Here $AB$ means $A\cap B$, "both happen", as everywhere in this course.

::: example Kings and black cards
Draw one card from a deck of 52 (no jokers). Let $A$ = "the card is a King" and $B$ =
"the card is black". Are $A$ and $B$ independent?
== The three probabilities ==
$P(A) = 4/52 = 1/13$; $P(B) = 26/52 = 1/2$; $AB$ = "a black King", 2 cards, so
$P(AB) = 2/52 = 1/26$.
== Compare ==
$P(A)P(B) = \frac1{13}\cdot\frac12 = \frac1{26} = P(AB)$. So $A$ and $B$ are independent:
being told the card is black leaves the chance of a King at $2/26 = 1/13$, the same as
before.
:::

In practice we rarely check the product rule by calculation. We **judge independence from
how the experiment works**: if one result physically cannot influence the other, we
assume independence, and then use the product rule to calculate.

::: example With and without replacement
A batch has $n$ items. Take 2, and let $A_i$ = "the $i$-th item taken is good", $i=1,2$.
== With replacement ==
The first item goes back, so the second draw is from the same batch: $A_1$ and $A_2$ are
independent.
== Without replacement ==
If the first item was good, there is one good item fewer for the second draw. The second
result depends on the first, so $A_1$ and $A_2$ are **not** independent.
:::

## Independent is not the same as mutually exclusive

Two events are mutually exclusive ({{zh 互斥}}, Lesson 1.1) when they cannot happen
together, $AB = \varnothing$. That sounds like "they have nothing to do with each other",
which is why students mix it up with independence. It is almost the opposite:

- independent: $P(AB) = P(A)P(B)$ — a statement about **probabilities**;
- mutually exclusive: $AB = \varnothing$ — a statement about the **events themselves**.

Neither implies the other. Picture a square of area 1, with probability as area.

- Let $A$ be the left half and $B$ the top half. Then $P(A) = P(B) = \frac12$ and the
  overlap, the top-left quarter, has $P(AB) = \frac14 = P(A)P(B)$: **independent, but not
  mutually exclusive**.
- Cut the square along a diagonal and let $A$, $B$ be the two triangles. Again
  $P(A) = P(B) = \frac12$, but $P(AB) = 0 \ne \frac14$: **mutually exclusive, but not
  independent**. In fact, if you know $A$ happened you know for certain that $B$ didn't —
  the strongest dependence there is.

::: callout note About the slide
The slide's first case reads "P(A) = 1/2, P(B) = 1/2, then P(AB) = P(A)P(B)"; what it
means (and what its picture shows) is that the overlap is a quarter of the square, so
$P(AB) = \frac14 = P(A)P(B)$.
:::

::: theorem Independent or exclusive, not both | 命题1
If $P(A) > 0$ and $P(B) > 0$, then $A$ and $B$ cannot be both independent and mutually
exclusive.
:::

Why: if they are mutually exclusive, $P(AB) = 0$, but $P(A)P(B) > 0$, so the product rule
fails. If they are independent, $P(AB) = P(A)P(B) > 0$, so $AB \ne \varnothing$ and they
are not exclusive. Read the other way: **mutually exclusive events are independent only
when one of them has probability 0.**

::: callout pitfall Exclusive ≠ independent
"$A$ and $B$ are mutually exclusive, so $P(AB) = P(A)P(B)$" is wrong. For exclusive events
$P(AB) = 0$ and $P(A\cup B) = P(A) + P(B)$; for independent events
$P(AB) = P(A)P(B)$ and $P(A\cup B) = P(A) + P(B) - P(A)P(B)$. Decide which one the problem
gives you before writing any formula.
:::

## Events that are independent of everything

::: theorem Events of probability 0 or 1 | 命题2
An event of probability 0 is independent of every event; so the impossible event
$\varnothing$ is independent of every event. An event of probability 1 is independent of
every event; so the certain event $\Omega$ is too.
:::

**Proof.** Let $P(A) = 0$ and $B$ be any event. Since $AB \subset A$,
$0 \le P(AB) \le P(A) = 0$, so $P(AB) = 0 = 0\cdot P(B) = P(A)P(B)$.

Now let $P(A) = 1$. Then $P(\overline A) = 0$, so as above $P(\overline A B) = 0$. But
$P(\overline A B) = P(B) - P(AB)$, so $P(AB) = P(B) = P(A)P(B)$. $\square$

Intuitively, an event that is certain (or impossible) carries no information: learning
that it happened tells you nothing new.

## Properties

::: theorem Independence and conditional probability | 性质1
Let $P(A) > 0$. Then $A$ and $B$ are independent if and only if $P(B\mid A) = P(B)$.
:::

::: theorem Complements of independent events | 性质2
If $A$ and $B$ are independent, so are $\overline A$ and $B$, $A$ and $\overline B$, and
$\overline A$ and $\overline B$.
:::

**Proof of one case.** $A\overline B = A - B$, so
$P(A\overline B) = P(A) - P(AB) = P(A) - P(A)P(B) = P(A)\bigl(1 - P(B)\bigr) = P(A)P(\overline B)$.
Swap the roles to get $\overline A$ and $B$, then apply the result twice for $\overline A$
and $\overline B$. $\square$

This matters because "not hitting", "not failing", "not solving" are often what we can
multiply: if hits are independent, so are misses.

::: callout exam In-class questions
Two single-choice questions put the last sections side by side. With $P(A), P(B) > 0$:
if $A$, $B$ are **mutually exclusive**, the true statement is $P(A\mid B) = 0$; if they are
**independent**, the false statement is $P(A\mid B) = 0$ (it equals $P(A) > 0$). Both are
in the quiz below.
:::

## Three events: pairwise versus mutual independence

For three events, it's natural to ask that every pair be independent.

::: define Pairwise independence | 两两相互独立
Events $A$, $B$, $C$ are **pairwise independent** if
$$P(AB) = P(A)P(B),\quad P(BC) = P(B)P(C),\quad P(AC) = P(A)P(C).$$
:::

But that is not enough to say "the three have nothing to do with one another": two of
them together might still tell you about the third. So the full definition adds one more
equation.

::: define Mutual independence of three events | 三事件相互独立
Events $A$, $B$, $C$ are **mutually independent** if they are pairwise
independent **and**
$$P(ABC) = P(A)P(B)P(C).$$
:::

Mutual independence implies pairwise independence. The converse is false, and the
course gives two counterexamples.

::: example Bernstein's tetrahedron | 伯恩斯坦反例
A fair tetrahedron (four faces) has one face red, one white, one black, and the fourth
painted in all three colours. Throw it once; let $A$, $B$, $C$ be "the face down shows
red", "… white", "… black". Are $A$, $B$, $C$ independent?
== Single events ==
Each colour appears on 2 of the 4 faces (its own and the striped one), so
$P(A) = P(B) = P(C) = \frac24 = \frac12$.
== Pairs ==
Red and white together appear only on the striped face: $P(AB) = \frac14 = \frac12\cdot\frac12$.
The same holds for $BC$ and $AC$. So $A$, $B$, $C$ are pairwise independent.
== All three ==
$P(ABC) = \frac14$ (the striped face again), but $P(A)P(B)P(C) = \frac18$. So they are
**not** mutually independent: if you know the face shows red and white, it is certainly
the striped one, so black is certain too.
:::

::: example Two coin tosses
Toss a fair coin twice; $\Omega = \{HH, HT, TH, TT\}$, each outcome $\frac14$. Let
$A$ = "head on the first toss" $= \{HH, HT\}$, $B$ = "head on the second toss"
$= \{HH, TH\}$, $C$ = "exactly one head" $= \{HT, TH\}$, and $D$ = "two heads" $= \{HH\}$.
== Pairs ==
$P(A) = P(B) = P(C) = \frac12$, and each pair shares exactly one outcome:
$P(AB) = P(BC) = P(AC) = \frac14$. So $A$, $B$, $C$ are pairwise independent.
== All three ==
$ABC = \varnothing$ (two heads and exactly one head can't both hold), so
$P(ABC) = 0 \ne \frac18$: not mutually independent.
== Adding D ==
$P(D) = \frac14$ but $P(AD) = P(\{HH\}) = \frac14 \ne \frac12\cdot\frac14$, so already $A$
and $D$ are dependent: $A, B, C, D$ are not even pairwise independent.
:::

| Outcome | $A$ | $B$ | $C$ | $D$ |
| ------- | --- | --- | --- | --- |
| $HH$    | ✓   | ✓   |     | ✓   |
| $HT$    | ✓   |     | ✓   |     |
| $TH$    |     | ✓   | ✓   |     |
| $TT$    |     |     |     |     |

::: callout pitfall Pairwise is not enough
To use $P(ABC) = P(A)P(B)P(C)$ you need **mutual** independence. Checking the three pairs
proves nothing about the triple, as both examples show.
:::

### Combining independent events

If $A$, $B$, $C$ are mutually independent, anything built from $A$ and $B$ — their product
$AB$, union $A\cup B$, difference $A - B$, complements — is independent of $C$.

**Proof for $AB$.** $P\bigl((AB)C\bigr) = P(ABC) = P(A)P(B)P(C) = P(AB)\,P(C)$, using the
triple equation and then the pair equation for $A$, $B$.

**For $A\cup B$.** $(A\cup B)C = AC \cup BC$, so by the addition formula
$$P\bigl((A\cup B)C\bigr) = P(AC) + P(BC) - P(ABC) = \bigl[P(A) + P(B) - P(A)P(B)\bigr]P(C) = P(A\cup B)\,P(C).$$

**For $A - B$.** $A - B = A\overline B$, and $A$, $\overline B$, $C$ are still mutually
independent (complements, below), so $P(A\overline B C) = P(A)P(\overline B)P(C) = P(A\overline B)P(C)$. $\square$

The slide's summary: **if three events are mutually independent, the sum, difference or
product of any two of them is independent of the third.** What fails is reusing the same
event on both sides: $AC$ is built from $C$, so it is generally not independent of $C$.

## n events

::: define Mutual independence of n events | n 个事件相互独立
Events $A_1, A_2, \dots, A_n$ are mutually independent if for every $k$ with
$1 < k \le n$ and every choice of indices $1 \le i_1 < i_2 < \dots < i_k \le n$,
$$P(A_{i_1}A_{i_2}\cdots A_{i_k}) = P(A_{i_1})P(A_{i_2})\cdots P(A_{i_k}).$$
:::

That is one equation for every sub-collection of two or more events: $2^n - n - 1$ of them
(4 for $n = 3$, 11 for $n = 4$). Again mutual ⇒ pairwise, but not conversely. Nobody checks
all these equations in practice: **independence is judged from the meaning of the
problem** (separate machines, separate shooters, separate tosses) and then used.

Two conclusions make it easy to use:

1. Any $k$ ($2 \le k \le n$) of $n$ mutually independent events are mutually independent.
2. Replace any of $A_1, \dots, A_n$ by their complements and the $n$ events are still
   mutually independent.

The second one gives the most-used formula of the lesson. "At least one $A_i$ happens" is
the complement of "none happens", $\overline{A_1\cup\dots\cup A_n} = \overline{A_1}\,\overline{A_2}\cdots\overline{A_n}$
(De Morgan), and the complements are independent, so the probability of "none" is a
product.

::: venn "At least one" is the complement of "none of them"
sets: A B C
shade: A ∪ B ∪ C
shade: A'B'C'
:::

::: formula Union of independent events | 独立事件并的概率
$$P\Bigl(\bigcup_{i=1}^{n} A_i\Bigr) = 1 - \prod_{i=1}^{n} P(\overline{A_i}) = 1 - \prod_{i=1}^{n}\bigl(1 - P(A_i)\bigr)$$
--
A_1, \dots, A_n | mutually independent events |
\prod | product of the factors $i = 1, \dots, n$ |
:::

::: callout key The one idea
For independent events, "and" multiplies. So compute "at least one" as
$1 - P(\text{none})$, and "none" as a product of $1 - P(A_i)$.
:::

## Worked examples

::: example Three cobblers beat Zhuge Liang | 三个臭皮匠，顶个诸葛亮
Zhuge Liang solves a problem with probability 0.9. Three ordinary people work on it
independently and solve it with probabilities 0.45, 0.55 and 0.6. What is the chance the
problem gets solved by at least one of the three?
== Events ==
$A_i$ = "person $i$ solves it", $P(A_1) = 0.45$, $P(A_2) = 0.55$, $P(A_3) = 0.6$,
mutually independent.
== At least one ==
$$P(A_1\cup A_2\cup A_3) = 1 - P(\overline{A_1}\,\overline{A_2}\,\overline{A_3}) = 1 - P(\overline{A_1})P(\overline{A_2})P(\overline{A_3}) = 1 - 0.55\times0.45\times0.4.$$
== Result ==
$0.55\times0.45\times0.4 = 0.099$, so the probability is $0.901$ — a little better than
Zhuge Liang's 0.9 on his own. Working together pays.
:::

Try other abilities: even three weak solvers add up quickly.

::: explore At least one of three independent solvers
slider a: 0 .. 1 = 0.45
slider b: 0 .. 1 = 0.55
slider c: 0 .. 1 = 0.6
none = (1 - a)(1 - b)(1 - c) | | Nobody solves it
P = 1 - none | | At least one solves it
:::

::: example A pair of dice, thrown twice
A pair of dice is thrown twice. Find the probability that the two throws give totals 7
and 11 (in either order).
== One throw ==
Of the 36 equally likely results, 6 give 7 (1+6, 2+5, …, 6+1) and 2 give 11 (5+6, 6+5).
Let $A_i$ = "throw $i$ gives 7", $B_i$ = "throw $i$ gives 11": $P(A_i) = \frac6{36}$,
$P(B_i) = \frac2{36}$.
== Two orders ==
The event is $A_1B_2 \cup B_1A_2$. The two parts are mutually exclusive (throw 1 can't be
both 7 and 11), and the throws are independent:
$$P = P(A_1)P(B_2) + P(B_1)P(A_2) = \frac6{36}\cdot\frac2{36} + \frac2{36}\cdot\frac6{36} = \frac{24}{1296} = \frac1{54}.$$
Notice the two tools working together: exclusive pieces **add**, independent throws
**multiply**.
:::

::: example How many anti-aircraft guns?
Each gun hits an aircraft with probability 0.6, independently. How many guns are needed
to hit an intruding aircraft with probability above 99%?
== Set up ==
With $n$ guns and $A_i$ = "gun $i$ hits",
$$P(A_1\cup\dots\cup A_n) = 1 - P(\overline{A_1})\cdots P(\overline{A_n}) = 1 - 0.4^n.$$
== Solve ==
$1 - 0.4^n > 0.99 \iff 0.4^n < 0.01 \iff n > \dfrac{\ln 0.01}{\ln 0.4} \approx 5.026$
(dividing by $\ln 0.4 < 0$ flips the inequality).
== Answer ==
$n$ must be a whole number, so **at least 6 guns**. Check: 5 guns give
$1 - 0.4^5 = 0.98976$, just short; 6 give $0.995904$.
:::

::: explore Guns needed for a target probability
slider p: 0.05 .. 0.95 = 0.6
slider q: 0.5 .. 0.999 = 0.99
n = floor(ln(1 - q) / ln(1 - p)) + 1 | | Guns needed
P = 1 - (1 - p)^n | | Probability with that many
:::

::: example The tank and three guns
Guns 甲, 乙, 丙 fire at the same tank and hit with probabilities 0.4, 0.5, 0.7,
independently. If exactly one gun hits, the tank is destroyed with probability 0.2; if
two hit, with probability 0.6; if all three hit, it is certainly destroyed.
(1) Find the probability the tank is destroyed. (2) Given that it was destroyed, find the
probability that exactly two guns hit it.
== Events ==
$A$, $B$, $C$: 甲, 乙, 丙 hit, $P(A) = 0.4$, $P(B) = 0.5$, $P(C) = 0.7$. $A_i$: exactly
$i$ guns hit ($i = 0, 1, 2, 3$), a partition of $\Omega$. $H$: the tank is destroyed.
== Exactly one hit ==
$A_1 = A\overline B\,\overline C \cup \overline A B \overline C \cup \overline A\,\overline B C$,
three mutually exclusive pieces, each a product by independence:
$$P(A_1) = 0.4\cdot0.5\cdot0.3 + 0.6\cdot0.5\cdot0.3 + 0.6\cdot0.5\cdot0.7 = 0.06 + 0.09 + 0.21 = 0.36.$$
== Two and three hits ==
$A_2 = AB\overline C \cup A\overline B C \cup \overline A BC$:
$P(A_2) = 0.4\cdot0.5\cdot0.3 + 0.4\cdot0.5\cdot0.7 + 0.6\cdot0.5\cdot0.7 = 0.06 + 0.14 + 0.21 = 0.41$.
$P(A_3) = P(ABC) = 0.4\cdot0.5\cdot0.7 = 0.14$. (Check: $P(A_0) = 0.6\cdot0.5\cdot0.3 = 0.09$,
and $0.09 + 0.36 + 0.41 + 0.14 = 1$.)
== (1) Total probability ==
By the law of total probability (Lesson 1.5), with $P(H\mid A_0) = 0$:
$$P(H) = 0.36\times0.2 + 0.41\times0.6 + 0.14\times1 = 0.072 + 0.246 + 0.14 = 0.458.$$
== (2) Bayes ==
By Bayes' formula (Lesson 1.5):
$$P(A_2\mid H) = \frac{P(A_2)P(H\mid A_2)}{P(H)} = \frac{0.246}{0.458} \approx 0.537 \approx 0.54.$$
:::

The shaded region is "exactly one gun hits", the event $A_1$ above:

::: venn Exactly one of A, B, C
sets: A B C
shade: AB'C' ∪ A'BC' ∪ A'B'C
:::

::: example Who hit the target?
甲 and 乙 each fire once at a target, independently, hitting with probabilities 0.6 and
0.5. The target was hit. What is the probability that 甲 hit it?
== The condition ==
$P(\text{hit}) = 1 - P(\text{both miss}) = 1 - 0.4\times0.5 = 0.8$.
== Conditional probability ==
"甲 hits" is contained in "the target is hit", so
$P(\text{甲 hits}\mid\text{hit}) = \dfrac{P(\text{甲 hits})}{P(\text{hit})} = \dfrac{0.6}{0.8} = \dfrac34$.
:::

::: callout exam What exams ask
Past finals ask (a) "which pair is not independent?" built from three independent events
(look for an event used on both sides), (b) multiple-choice statements about events of
probability 0 or 1 (命题2 decides them), and (c) computation problems like the tank:
exactly-$k$ events built from independent pieces, then total probability and Bayes.
:::

::: cards Independence
Definition of independent events $A$, $B$ :: $P(AB) = P(A)P(B)$
Independence in conditional form (with $P(A) > 0$) :: $P(B\mid A) = P(B)$
Mutually exclusive means … :: $AB = \varnothing$, so $P(AB) = 0$
Can $A$, $B$ with $P(A), P(B) > 0$ be both independent and exclusive? :: No (命题1); exclusive events are independent only if one has probability 0
Which events are independent of every event? :: Those with probability 0 or 1, including $\varnothing$ and $\Omega$ (命题2)
If $A$, $B$ are independent, which other pairs are? :: $\overline A$ and $B$, $A$ and $\overline B$, $\overline A$ and $\overline B$
Pairwise independence of $A$, $B$, $C$ :: $P(AB) = P(A)P(B)$, $P(BC) = P(B)P(C)$, $P(AC) = P(A)P(C)$
Mutual independence of $A$, $B$, $C$ :: Pairwise, plus $P(ABC) = P(A)P(B)P(C)$
Does pairwise independence imply mutual independence? :: No: Bernstein's tetrahedron and the two-coin example
How many equations define mutual independence of $n$ events? :: $2^n - n - 1$: one for every sub-collection of 2 or more
$A$, $B$, $C$ mutually independent: what is independent of $C$? :: $AB$, $A\cup B$, $A - B$ (and their complements)
Union of independent events :: $P(\bigcup A_i) = 1 - \prod (1 - P(A_i))$
How is independence usually decided? :: From the meaning of the problem (separate, non-interacting trials), not by checking equations
:::

::: quiz Independence
? $A$ and $B$ are mutually exclusive with $P(A) > 0$, $P(B) > 0$. Which statement is true?
- [ ] $P(B\mid A) > 0$
- [ ] $P(A\mid B) = P(A)$
- [x] $P(A\mid B) = 0$
- [ ] $P(AB) = P(A)P(B)$
> Exclusive means $AB = \varnothing$, so $P(AB) = 0$ and $P(A\mid B) = P(AB)/P(B) = 0$. The
> other three would need independence, which is impossible here (命题1). (Class question 07-044: C.)

? $A$ and $B$ are independent with $P(A) > 0$, $P(B) > 0$. Which statement is **false**?
- [ ] $P(B\mid A) > 0$
- [ ] $P(A\mid B) = P(A)$
- [x] $P(A\mid B) = 0$
- [ ] $P(AB) = P(A)P(B)$
> Independence gives $P(B\mid A) = P(B) > 0$ and $P(A\mid B) = P(A) > 0$, so
> $P(A\mid B) = 0$ is the false one. (Class question 07-045: C.)

? $A$, $B$, $C$ are mutually independent and $0 < P(C) < 1$ (take $P(A) > 0$). Which pair is **not** independent?
- [ ] $\overline{A\cup B}$ and $C$
- [ ] $\overline{A-B}$ and $\overline C$
- [x] $\overline{AC}$ and $\overline C$
- [ ] $\overline{AB}$ and $\overline C$
> A, B, D are built from $A$ and $B$ only, and compared with $C$ or $\overline C$:
> independent. In C, $AC$ is built from $C$ itself: $\overline{AC}\,\overline C = \overline C$, so
> $P(\overline{AC}\,\overline C) = 1 - P(C)$, while $P(\overline{AC})P(\overline C) = (1 - P(A)P(C))(1 - P(C))$,
> smaller when $P(A)P(C) > 0$. (Class question 07-052: C.)

? $A$, $B$ are independent and $C$ is a third event. Which statements are true? (Tick all.)
- [x] If $P(C) = 1$, then $AC$ and $BC$ are independent
- [ ] If $P(C) = 1$, then $A\cup C$ and $A$ are not independent
- [x] If $P(C) = 1$, then $A - C$ and $B$ are independent
- [ ] If $C\subset B$, then $A$ and $C$ are independent
> With $P(C) = 1$: $P(AC) = P(A)$, $P(BC) = P(B)$, and $P(AC\cdot BC) = P(AB) = P(A)P(B)$, so
> the first is true. $P(A\cup C) = 1$, so $A\cup C$ is independent of everything (命题2):
> the second is false. $P(A - C) \le P(\overline C) = 0$, so $A - C$ is independent of
> everything: the third is true. The fourth fails in general: on four equally likely
> points take $A = \{1,2\}$, $B = \{1,3\}$, $C = \{1\}$; then $P(AC) = \frac14 \ne \frac18$.
> (2025 final, class questions 07-057 and 08-011: AC.)

? Events $A$, $C$ satisfy $P(A\mid A\cup C) + P(C\mid A\cup C) = 1$. Which statements must be true? (Tick all.)
- [ ] $A$ and $C$ are mutually exclusive
- [x] $P(A\cup C) = P(A) + P(C)$
- [x] $AC$ and $A\cup C$ are independent
- [ ] $A$ and $C$ are independent
> Since $A, C \subset A\cup C$, the condition reads $\frac{P(A) + P(C)}{P(A\cup C)} = 1$, so
> $P(A\cup C) = P(A) + P(C)$, i.e. $P(AC) = 0$. An event of probability 0 is independent of
> everything (命题2), so $AC$ and $A\cup C$ are independent. But $P(AC) = 0$ doesn't make
> $AC$ empty, and $A$, $C$ independent would need $P(A)P(C) = 0$. (2025 final, class
> question 07-058: BC.)

? 甲 and 乙 each fire once, independently, hitting with probabilities 0.6 and 0.5. The target was hit. What is the probability that 甲 hit it?
answer: 3/4
> $P(\text{hit}) = 1 - 0.4\times0.5 = 0.8$, and "甲 hits" is inside "hit", so the answer is
> $0.6/0.8 = 3/4$. (Class question 08-015: A.)

? $A$, $B$ are independent with $P(A) = 0.3$, $P(B) = 0.4$. Find $P(A\cup B)$.
answer: 0.58
> $P(A\cup B) = P(A) + P(B) - P(A)P(B) = 0.3 + 0.4 - 0.12 = 0.58$, or
> $1 - 0.7\times0.6 = 0.58$.

? Same events: find $P(A - B)$.
answer: 0.18
> $A - B = A\overline B$, and $A$, $\overline B$ are independent: $0.3\times0.6 = 0.18$.

? In Bernstein's tetrahedron, what is $P(ABC)$?
answer: 1/4
> All three colours are on the striped face only: $\frac14$, not $\frac18$. So the events
> are pairwise but not mutually independent.

? Each gun hits with probability 0.5, independently. How many guns are needed to hit with probability above 99%?
answer: 7
> $0.5^n < 0.01$: $0.5^6 = 0.0156$ is too big, $0.5^7 = 0.0078$ works, so 7 guns.
:::

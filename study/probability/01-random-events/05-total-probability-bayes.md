---
title: Total probability and Bayes' formula
zh: 全概率公式与贝叶斯公式
summary: Splitting a hard event over all its possible causes (the law of total probability), and reasoning back from an observed result to its most likely cause (Bayes' formula, prior and posterior probabilities).
source: 3全概率贝叶斯2-1 (§1.7), 2026-09-02 → 09-07
---

Many events are hard to price directly because they can come about in several
different ways: a bulb in the box is defective, but which factory made it? A ball is
white, but which box was it drawn from? This lesson gives two formulas for such
situations. The **law of total probability** goes forwards, from causes to a result:
it splits the event over every way it can happen and adds up. **Bayes' formula** goes
backwards: having seen the result, it tells you how likely each cause now is. Both are
built only from conditional probability and the multiplication theorem
(Lesson 1.4), and Bayes' formula in particular is the mathematics of learning from
evidence.

## A fair draw? Who goes to the match

Five football fans have only two tickets for a big game. They write "ticket" on two
of five identical cards, shuffle them, and draw one card each, in turn. One of them
says: "Don't push, the order doesn't matter — everyone has the same chance." Another
says: "Surely whoever draws first has the better chance." Who is right?

Let $A_i=\{\text{the }i\text{-th person draws a ticket}\}$, $i=1,\dots,5$, and
$\overline{A_i}$ its complement, "the $i$-th person draws a blank". For the first
person it's plain: $P(A_1)=2/5$.

The second person is harder: what they see depends on what the first person took.
The trick is to **split $A_2$ according to what happened first**. The first draw was
either a ticket ($A_1$) or a blank ($\overline{A_1}$), never both, and one of the two
certainly happened: $A_1\overline{A_1}=\varnothing$ and $A_1+\overline{A_1}=S$. So
$$A_2=A_2S=A_2(A_1+\overline{A_1})=A_2A_1+A_2\overline{A_1},$$
and the two pieces are mutually exclusive. Then
$$P(A_2)=P(A_2A_1)+P(A_2\overline{A_1})=P(A_1)P(A_2\mid A_1)+P(\overline{A_1})P(A_2\mid\overline{A_1}),$$
using finite additivity (Lesson 1.3) for the first step and the multiplication
theorem (Lesson 1.4) for the second. Every factor is now easy: after a ticket is
gone, 1 ticket is left among 4 cards; after a blank, 2 among 4. So
$$P(A_2)=\frac25\cdot\frac14+\frac35\cdot\frac24=\frac{2}{20}+\frac{6}{20}=\frac25.$$
This is the simplest case of the law of total probability, and the picture behind it
is an event cut in two by another event and its complement (here $A$ plays $A_2$ and
$B$ plays $A_1$):

::: venn A is split by B into AB and AB̄, which don't overlap
shade: AB
shade: AB'
:::

For the third person, the first two draws have four possible outcomes: $A_1A_2$,
$A_1\overline{A_2}$, $\overline{A_1}A_2$, $\overline{A_1}\,\overline{A_2}$. They
cannot happen together and one of them must happen, so split over all four:
$$
\begin{aligned}
P(A_3)&=P(A_1A_2)P(A_3\mid A_1A_2)+P(A_1\overline{A_2})P(A_3\mid A_1\overline{A_2})\\
&\quad+P(\overline{A_1}A_2)P(A_3\mid\overline{A_1}A_2)+P(\overline{A_1}\,\overline{A_2})P(A_3\mid\overline{A_1}\,\overline{A_2})\\
&=\frac25\cdot\frac14\cdot\frac03+\frac25\cdot\frac34\cdot\frac13+\frac35\cdot\frac24\cdot\frac13+\frac35\cdot\frac24\cdot\frac23\\
&=0+\frac1{10}+\frac1{10}+\frac15=\frac25.
\end{aligned}
$$
(The first term is 0: if both tickets are gone, the third person cannot get one.) In
the same way $P(A_4)=P(A_5)=2/5$. **Drawing lots is fair**: the first speaker was
right. Drawing early only means you find out sooner, not that your chance is better.

## Partitions of the sample space

The splitting we just did — into $A_1$ and $\overline{A_1}$, or into the four
outcomes of two draws — always uses a family of events that don't overlap and
together cover everything.

::: define Partition of the sample space | 样本空间的划分
Let $S$ be the sample space of an experiment $E$. Events $B_1,B_2,\dots,B_n$ form a
**partition** of $S$ if
1. they are pairwise mutually exclusive: $B_iB_j=\varnothing$ for $i\ne j$, and
2. together they make up $S$: $B_1+B_2+\cdots+B_n=S$.

So in every run of the experiment, **exactly one** of the $B_i$ happens.
:::

The simplest partition is $\{B,\overline{B}\}$ for any event $B$. Think of a partition
as cutting the sample space into pieces like a map into provinces. Any other event
$A$ is then cut into the pieces $AB_1, AB_2,\dots,AB_n$, which don't overlap either:

::: plot An event A (the disc) cut by a partition B1 (x < 1), B2 (1 ≤ x < 2), B3 (x ≥ 2) of the rectangle S
x: 0 .. 3
y: 0 .. 2
region AB1: (x - 1.5)^2 + (y - 1)^2 < 0.8, x < 1
region AB2: (x - 1.5)^2 + (y - 1)^2 < 0.8, 1 <= x < 2
region AB3: (x - 1.5)^2 + (y - 1)^2 < 0.8, x >= 2
:::

The rectangle $0\le x\le3$, $0\le y\le2$ is $S$, cut into three vertical strips
$B_1,B_2,B_3$. The disc is $A$, and the three shades are its pieces $AB_1$, $AB_2$,
$AB_3$. Adding up the pieces gives back all of $A$:
$A=AB_1+AB_2+AB_3$.

## The law of total probability

::: law Law of total probability | 全概率公式
Let $B_1,B_2,\dots,B_n$ be a partition of the sample space $S$ with $P(B_i)>0$ for
every $i$, and let $A$ be any event. Then
$$P(A)=\sum_{i=1}^{n}P(B_i)\,P(A\mid B_i).$$
:::

::: formula Law of total probability | 全概率公式
$$P(A)=\sum_{i=1}^{n}P(B_i)P(A\mid B_i)=P(B_1)P(A\mid B_1)+\cdots+P(B_n)P(A\mid B_n)$$
--
B_1,\dots,B_n | a partition of $S$: the possible causes, with $P(B_i)>0$ | —
P(B_i) | probability of the cause, P(原因) | —
P(A\mid B_i) | probability of the result given that cause, P(结果｜原因) | —
P(A) | total probability of the result | —
:::

**Why it's true.** Because the $B_i$ cover $S$, $A=AS=AB_1+AB_2+\cdots+AB_n$, and
these pieces are pairwise mutually exclusive because the $B_i$ are. Finite
additivity gives $P(A)=\sum P(AB_i)$, and the multiplication theorem turns each term
into $P(B_i)P(A\mid B_i)$. That is all: the law is "cut into pieces, price each piece,
add up" (化整为零).

Read the formula as a weighted average: $P(A)$ is the average of the conditional
probabilities $P(A\mid B_i)$, each weighted by how likely its cause $B_i$ is. So it
always lies between the smallest and the largest $P(A\mid B_i)$.

::: callout key When to use it, and how to find the partition
1. **When?** Think of the $B_i$ as **causes** (原因) and $A$ as a **result** (结果):
   $A$ can happen through several causes, and for each cause the chance of $A$ is
   easy to find. Typically the experiment has **two stages**, the first stage's
   outcome directly affects the second, and you are asked for the probability of
   something in the second stage.
2. **Which partition?** All the possible causes that could lead to $A$ — in a
   two-stage experiment, **the possible outcomes of the first stage**.
:::

A tree diagram is a good way to set it up: one branch for each cause, labelled with
$P(B_i)$, then a branch to $A$ labelled $P(A\mid B_i)$. Multiply along each path to
$A$, and add the paths.

::: example Two boxes of parts
There are two boxes of the same kind of part. Box 1 has 50 parts, 10 of them first
grade; box 2 has 30 parts, 18 of them first grade. One box is chosen at random, and
one part is taken from it. What is the probability that the part is first grade?
== The two stages ==
Stage 1 chooses a box, stage 2 a part. Let $H_i=\{\text{box }i\text{ is chosen}\}$,
$i=1,2$: a partition, with $P(H_1)=P(H_2)=1/2$. Let $A=\{\text{the part is first
grade}\}$.
== Each cause on its own ==
$P(A\mid H_1)=10/50=1/5$ and $P(A\mid H_2)=18/30=3/5$.
== Total probability ==
$$P(A)=P(H_1)P(A\mid H_1)+P(H_2)P(A\mid H_2)=\frac12\cdot\frac{10}{50}+\frac12\cdot\frac{18}{30}=\frac1{10}+\frac3{10}=\frac25.$$
:::

::: callout pitfall Don't just pool the boxes
It is tempting to say "28 first-grade parts out of 80, so $28/80=0.35$". That would be
right only if every *part* were equally likely to be chosen. Here each *box* is
equally likely, so a part in the smaller box 2 is more likely to be picked than one
in box 1. Weight by the causes' probabilities, not by head counts.
:::

::: example Defective bulbs from three factories
A box holds bulbs of the same type from three factories, 甲, 乙 and 丙: half come from
甲 and a quarter each from 乙 and 丙. Their defect rates are 0.1, 0.2 and 0.3. One bulb
is taken from the box at random. What is the probability that it is defective?
== Causes and result ==
Causes: $B_1,B_2,B_3=\{\text{made by 甲, 乙, 丙}\}$, with $P(B_1)=1/2$,
$P(B_2)=P(B_3)=1/4$. Result: $A=\{\text{the bulb is defective}\}$, with
$P(A\mid B_1)=0.1$, $P(A\mid B_2)=0.2$, $P(A\mid B_3)=0.3$.
== Total probability ==
$$P(A)=\frac12\times0.1+\frac14\times0.2+\frac14\times0.3=0.05+0.05+0.075=0.175.$$
:::

| Cause $B_i$ | $P(B_i)$ | $P(A\mid B_i)$ | $P(B_i)P(A\mid B_i)$ |
| --- | --- | --- | --- |
| 甲 | 0.5 | 0.1 | 0.05 |
| 乙 | 0.25 | 0.2 | 0.05 |
| 丙 | 0.25 | 0.3 | 0.075 |
| **Total** | 1 | | $P(A)=0.175$ |

## Bayes' formula

Now turn the bulb question around. The bulb **is** defective. Which factory is most
to blame? We know the result $A$ and want the probability of each cause given it:
$P(B_i\mid A)$. By the definition, $P(B_i\mid A)=P(AB_i)/P(A)$. The numerator is the
multiplication theorem, $P(B_i)P(A\mid B_i)$, and the denominator is the law of
total probability. That gives Bayes' formula.

::: law Bayes' formula | 贝叶斯公式
Let $B_1,B_2,\dots,B_n$ be a partition of the sample space $S$ with $P(B_i)>0$ for
every $i$, and let $A$ be an event with $P(A)>0$. Then
$$P(B_i\mid A)=\frac{P(B_i)P(A\mid B_i)}{\sum_{j=1}^{n}P(B_j)P(A\mid B_j)},\qquad i=1,2,\dots,n.$$
:::

::: formula Bayes' formula | 贝叶斯公式
$$P(B_i\mid A)=\frac{P(B_i)P(A\mid B_i)}{\sum_{j=1}^{n}P(B_j)P(A\mid B_j)}=\frac{P(B_i)P(A\mid B_i)}{P(A)}$$
--
B_i | one of the possible causes (a partition of $S$) | —
A | the result that has been observed, $P(A)>0$ | —
P(B_i) | prior probability of the cause, before $A$ is seen | —
P(A\mid B_i) | how likely the result is under that cause | —
P(B_i\mid A) | posterior probability of the cause, after $A$ is seen | —
:::

For two causes, $B$ and $\overline{B}$, it reads
$$P(B\mid A)=\frac{P(B)P(A\mid B)}{P(B)P(A\mid B)+P(\overline{B})P(A\mid\overline{B})}.$$

What it means:

1. Bayes' formula goes **from the result back to the cause**: the opposite direction
   to the law of total probability. That's why it is also called the
   {{term inverse probability formula | 逆概率公式}}.
2. It measures how likely each cause is once the result has happened, and so points
   to **the most likely cause of what we saw**.

The numerators $P(B_i)P(A\mid B_i)$ are exactly the terms of the total-probability
sum. So once you have done the total probability, Bayes is one division per cause:
**each cause's share of the total**.

::: example Which factory is to blame?
In the bulb example, the bulb taken is defective. Find the probability that each
factory made it, and say which factory is most responsible.
== Shares of the total ==
From the table, $P(A)=0.175$. Then
$$P(B_1\mid A)=\frac{P(B_1)P(A\mid B_1)}{P(A)}=\frac{\frac12\times0.1}{\frac12\times0.1+\frac14\times0.2+\frac14\times0.3}=\frac{0.05}{0.175}=\frac27,$$
and in the same way $P(B_2\mid A)=0.05/0.175=2/7$, $P(B_3\mid A)=0.075/0.175=3/7$.
== Check and conclude ==
$2/7+2/7+3/7=1$, as it must be: given $A$, exactly one factory made the bulb.
丙 makes only a quarter of the bulbs, but its defect rate is the highest, so it has
the largest share of the defective ones: **丙 is most responsible**, with
$3/7\approx0.43$.
:::

::: callout pitfall P(A|B) is not P(B|A)
The defect rate of 丙, $P(A\mid B_3)=0.3$, and the chance that a defective bulb came
from 丙, $P(B_3\mid A)=3/7$, are different questions with different answers. Mixing
them up, especially when a cause is rare, is the most common mistake in probability
(and outside it: in medicine and in court).
:::

## Prior and posterior probabilities

Bayes' formula is a rule for **updating beliefs**. Before the result is seen, we
have the probabilities $P(B_i)$; after it, the probabilities $P(B_i\mid A)$.

::: define Prior probability | 先验概率
The probability $P(B_i)$ of a cause before the new information (the result $A$) is
known: what we believed beforehand, from past experience or the set-up.
:::

::: define Posterior probability | 后验概率
The probability $P(B_i\mid A)$ of a cause after the result $A$ has been observed: the
prior, corrected by the new information that $A$ happened.
:::

### The boy who cried wolf

The fable: a boy watches sheep on a hill where wolves live. On the first day he shouts
"Wolf! Wolf!", the villagers come running to fight it, and there's no wolf. The same
happens on the second day. On the third day the wolf really comes, and however he
shouts, nobody comes. Why did the villagers stop believing him? Bayes' formula
measures it.

Let $A=\{\text{the boy lies}\}$ and $B=\{\text{the boy is trustworthy}\}$. Say that
beforehand the villagers think well of him: $P(B)=0.8$, $P(\overline{B})=0.2$
(the prior). A trustworthy child lies with probability $P(A\mid B)=0.1$; an
untrustworthy one with $P(A\mid\overline{B})=0.5$.

::: example Trust after one lie, and after two
Find how far the villagers' trust falls after the boy's first lie, and after his
second.
== First lie ==
$$P(B\mid A)=\frac{P(B)P(A\mid B)}{P(B)P(A\mid B)+P(\overline{B})P(A\mid\overline{B})}=\frac{0.8\times0.1}{0.8\times0.1+0.2\times0.5}=\frac{0.08}{0.18}\approx0.444.$$
Trust falls from $0.8$ to $0.444$.
== Second lie: yesterday's posterior is today's prior ==
Now the villagers start from $P(B)=0.444$, $P(\overline{B})=0.556$:
$$P(B\mid A)=\frac{0.444\times0.1}{0.444\times0.1+0.556\times0.5}=\frac{0.0444}{0.3224}\approx0.138.$$
After two lies, trust has fallen from $0.8$ to about $0.138$; nobody comes on day
three.
:::

Each new piece of evidence turns the posterior into the next prior. Try other
starting reputations and other lying rates: even a child everyone trusts loses that
trust within a few lies, as long as an untrustworthy child lies more often than a
trustworthy one. In the explorer, $p=P(B)$ is the prior trust, $a=P(A\mid B)$ the
chance that a trustworthy child lies, and $q=P(A\mid\overline{B})$ the chance that an
untrustworthy one does.

::: explore The boy who cried wolf: trust after each lie
slider p: 0.01 .. 0.99 = 0.8
slider a: 0.01 .. 1 = 0.1
slider q: 0.01 .. 1 = 0.5
t1 = p a / (p a + (1 - p) q) | | Trust after one lie
t2 = t1 a / (t1 a + (1 - t1) q) | | Trust after two lies
t3 = t2 a / (t2 a + (1 - t2) q) | | Trust after three lies
:::

If you set $a=q$ (both kinds of child lie equally often), the trust doesn't move:
the lie then carries no information about the cause.

## More examples

::: example Glass cups sold by the box
Glasses are sold in boxes of 20. A box contains 0, 1 or 2 defective glasses with
probabilities 0.8, 0.1 and 0.1. A customer picks a box at random, inspects 4 glasses
from it at random, and buys the box if none of the four is defective; otherwise she
sends it back. Find (1) the probability that she buys the box, and (2) the probability
that a box she bought really has no defective glass.
== Causes and result ==
$B_i=\{\text{the box has }i\text{ defective glasses}\}$, $i=0,1,2$: a partition with
$P(B_0)=0.8$, $P(B_1)=P(B_2)=0.1$. $A=\{\text{she buys the box}\}$, which happens
when the 4 inspected glasses are all good.
== Each cause on its own ==
The 4 glasses are a random set of 4 out of 20; she buys when all 4 come from the
good ones. With $C_n^k=\binom nk$ (the number of ways to choose $k$ from $n$;
Lesson 1.2):
$$P(A\mid B_0)=1,\quad P(A\mid B_1)=\frac{C_{19}^4}{C_{20}^4}=\frac{3876}{4845}=0.8,\quad P(A\mid B_2)=\frac{C_{18}^4}{C_{20}^4}=\frac{3060}{4845}\approx0.632.$$
== (1) Total probability ==
$$P(A)=0.8\times1+0.1\times0.8+0.1\times0.632\approx0.943\approx0.94.$$
== (2) Bayes ==
$$P(B_0\mid A)=\frac{P(B_0)P(A\mid B_0)}{P(A)}=\frac{0.8\times1}{0.943}\approx0.85.$$
Inspecting four glasses raised the chance of a perfect box from the prior $0.8$ to
the posterior $0.85$.
:::

::: example Is the machine well adjusted?
When a machine is well adjusted, 98% of its products pass inspection; when it has a
certain fault, only 55% do. Each morning when it starts, the machine is well adjusted
with probability 95%. One morning the first product passes. What is the probability
that the machine is well adjusted?
== Events ==
$A=\{\text{the product passes}\}$, $B=\{\text{the machine is well adjusted}\}$:
$P(A\mid B)=0.98$, $P(A\mid\overline{B})=0.55$, $P(B)=0.95$, $P(\overline{B})=0.05$.
== Bayes with two causes ==
$$P(B\mid A)=\frac{P(A\mid B)P(B)}{P(A\mid B)P(B)+P(A\mid\overline{B})P(\overline{B})}=\frac{0.98\times0.95}{0.98\times0.95+0.55\times0.05}=\frac{0.931}{0.9585}\approx0.97.$$
== Prior and posterior ==
The prior $0.95$ comes from long experience; the posterior $0.97$ is that experience
corrected by today's news, a good first product.
:::

## Forwards and backwards

::: callout summary 执因求果 and 执果索因
- **Law of total probability: from causes to the result (执因求果)**. Cut the problem
  into pieces, one per cause (化整为零), and add
  $P(A)=\sum P(B_i)P(A\mid B_i)$.
- **Bayes' formula: from the result back to the causes (执果索因)**. Find the most
  likely cause $B_i$ of what was seen, by turning the prior $P(B_i)$ into the
  posterior $P(B_i\mid A)$.
- Together they describe how we **revise what we know as new information arrives**.
:::

| | Law of total probability | Bayes' formula |
| --- | --- | --- |
| Known | causes $P(B_i)$, and $P(A\mid B_i)$ | the same, plus: $A$ happened |
| Asked | $P(A)$, the chance of the result | $P(B_i\mid A)$, the chance of a cause |
| Direction | cause → result | result → cause |
| Chinese motto | 执因求果 | 执果索因 |

::: callout exam What exams ask
Expect a two-stage experiment (choose a box, then a ball; choose a number, then a
smaller one) with "find the probability of the second-stage event" (total
probability), often followed by "given that it happened, find the probability that the
first stage was …" (Bayes). The 2025 final's fill-in question 2 is the
pick-$X$-then-$Y$ question in the quiz below. Write the partition down explicitly and
check that its probabilities add to 1.
:::

::: cards Total probability and Bayes
Partition of $S$ (样本空间的划分) :: Events $B_1,\dots,B_n$ with $B_iB_j=\varnothing$ ($i\ne j$) and $B_1+\cdots+B_n=S$: exactly one happens
Simplest partition :: $\{B,\overline{B}\}$ for any event $B$
Law of total probability (全概率公式) :: $P(A)=\sum_{i=1}^n P(B_i)P(A\mid B_i)$, for a partition with $P(B_i)>0$
Simplest total probability :: $P(A)=P(B)P(A\mid B)+P(\overline{B})P(A\mid\overline{B})$
When to use total probability :: Two stages, the first affects the second, asked for a second-stage event; partition = first-stage outcomes (all possible causes)
Bayes' formula (贝叶斯公式) :: $P(B_i\mid A)=\dfrac{P(B_i)P(A\mid B_i)}{\sum_j P(B_j)P(A\mid B_j)}$
Other name for Bayes' formula :: The inverse probability formula (逆概率公式): from result back to cause
Prior probability (先验概率) :: $P(B_i)$: the chance of a cause before the result is seen
Posterior probability (后验概率) :: $P(B_i\mid A)$: the chance of a cause after seeing $A$, the prior corrected by the new information
执因求果 / 执果索因 :: Total probability: from causes to result; Bayes: from result to its most likely cause
Is drawing lots fair? :: Yes: with 2 tickets among 5 cards, every drawer has $P(A_i)=2/5$, whatever the order
Bulb factories (½, ¼, ¼; defect rates 0.1, 0.2, 0.3) :: $P(\text{defective})=0.175$; posteriors $2/7, 2/7, 3/7$
In Bayes' formula, the denominator is… :: $P(A)$, computed by the law of total probability
:::

::: quiz Check yourself
? Three boxes: the first holds 4 black balls and 1 white, the second 3 black and 3 white, the third 3 black and 5 white. A box is chosen at random and a ball drawn from it. The probability that the ball is white is
- [x] $\frac{53}{120}$
- [ ] $\frac{9}{19}$
- [ ] $\frac{67}{120}$
- [ ] $\frac{10}{19}$
> Partition by the box, each with probability $1/3$:
> $P(\text{white})=\frac13\left(\frac15+\frac36+\frac58\right)=\frac13\cdot\frac{8+20+25}{40}=\frac{53}{120}$.
> ($9/19$ would be pooling the balls, $9$ white of $19$: wrong, since boxes, not
> balls, are equally likely.)

? In the three boxes above, the ball drawn is white. What is the probability that it came from the third box?
answer: 25/53
> Bayes: the third box's share of the total,
> $\dfrac{\frac13\cdot\frac58}{53/120}=\dfrac{25/120}{53/120}=\dfrac{25}{53}\approx0.47$.

? (2025 final) An integer $X$ is chosen at random from 1, 2, 3, 4, then an integer $Y$ at random from 1 to $X$. Find $P\{Y=3\}$.
answer: 7/48
> Partition by $X$, each value with probability $1/4$. $Y=3$ is possible only when
> $X=3$ (chance $1/3$) or $X=4$ (chance $1/4$):
> $P\{Y=3\}=\frac14\cdot\frac13+\frac14\cdot\frac14=\frac1{12}+\frac1{16}=\frac7{48}$.

? Two boxes: 10 first-grade parts among 50, and 18 among 30. A box is chosen at random and a part taken from it. The probability that it is first grade?
answer: 2/5
> $\frac12\cdot\frac{10}{50}+\frac12\cdot\frac{18}{30}=\frac1{10}+\frac3{10}=\frac25$.

? In the two-box example, the part taken is first grade. What is the probability that it came from box 1?
answer: 1/4
> $P(H_1\mid A)=\dfrac{\frac12\cdot\frac15}{2/5}=\dfrac{1/10}{2/5}=\dfrac14$.

? Bulbs: half from 甲, a quarter each from 乙 and 丙, defect rates 0.1, 0.2, 0.3. Given that a bulb is defective, the probability it came from 丙 is
answer: 3/7
> $P(A)=0.175$ by total probability, and
> $P(B_3\mid A)=\frac{0.25\times0.3}{0.175}=\frac{0.075}{0.175}=\frac37$.

? Write Bayes' formula for two causes: with $p=P(B)$, $a=P(A\mid B)$ and $q=P(A\mid\overline{B})$, find $P(B\mid A)$.
expression: p a / (p a + (1 - p) q)
variables: p, a, q
> The numerator is $P(B)P(A\mid B)=pa$; the denominator is the total probability
> $P(A)=pa+(1-p)q$.

? A disease affects 1% of people. A test detects it in 95% of those who have it, and wrongly flags 5% of healthy people. Someone tests positive. What is the probability they have the disease?
answer: 0.01*0.95/(0.01*0.95+0.99*0.05)
tolerance: 0.5%
> $P(\text{ill}\mid +)=\dfrac{0.01\times0.95}{0.01\times0.95+0.99\times0.05}=\dfrac{0.0095}{0.059}\approx0.161$.
> Only about 16%: the disease is rare, so most positives come from the many healthy
> people. This is $P(B\mid A)\ne P(A\mid B)$ in action.

? The machine is well adjusted with probability 0.95; then 98% of products pass, otherwise 55%. The first product passes. The probability the machine is well adjusted?
answer: 0.98*0.95/(0.98*0.95+0.55*0.05)
tolerance: 0.5%
> $\dfrac{0.931}{0.931+0.0275}=\dfrac{0.931}{0.9585}\approx0.971$.

? In Bayes' formula, what is $P(B_i)$ called (before the result is observed)?
text: prior | prior probability | 先验概率 | 先验
> $P(B_i)$ is the prior probability (先验概率); $P(B_i\mid A)$, after seeing $A$, is the
> posterior probability (后验概率).
:::

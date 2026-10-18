---
title: Conditional probability and the multiplication theorem
zh: 条件概率与乘法定理
summary: How a probability changes when you learn that something has happened — the definition of P(B|A), its properties, two ways to compute it, and the multiplication theorem for chains of events.
source: 2性质乘法定理1-2 (§1.6), 2026-09-02
---

So far every probability has been worked out from scratch: we knew the experiment and
nothing else. In real problems we usually *do* know something — the first card drawn
was red, the patient's test came back positive, the part came from factory B — and
that extra information changes how likely other things are. **Conditional
probability** is the tool for "how likely is $B$, now that I know $A$ happened?". Its
twin, the **multiplication theorem**, runs the same idea backwards to find the chance
that several things happen one after another. Together they are the base for the
law of total probability and Bayes' formula (Lesson 1.5) and for independence
(Lesson 1.6).

## The idea: probability with extra information

Roll a fair die. Let $B=\{\text{a 2 shows}\}$ and $A=\{\text{an even number
shows}\}$. Before you look, $P(B)=1/6$: six equally likely faces, one of them is 2.

Now a friend peeks and tells you "it's even". What is the chance it is a 2? The faces
1, 3, 5 are no longer possible. What's left is $A=\{2,4,6\}$: three faces, still
equally likely, and exactly one of them is a 2. So the answer is $1/3$, not $1/6$.

We write this new probability as $P(B\mid A)$, read "the probability of $B$ **given**
$A$". The vertical bar separates the event we ask about (left) from the information
we already have (right). In general $P(B\mid A)\ne P(B)$: information changes the
odds.

What happened in the die example is worth putting into a picture. Once we know $A$
has happened, $A$ becomes the whole world: it plays the role of a new, smaller sample
space, written $S_A$ and called the {{term reduced sample space | 缩减样本空间}}. For
$B$ to happen as well, the outcome must lie in both $A$ and $B$, that is, in $AB$
(recall that $AB$ means $A\cap B$, "both happen"). So $P(B\mid A)$ is the share of $A$
taken up by $AB$:

::: venn Knowing A shrinks the sample space to A; B then happens exactly when the outcome is in AB
shade: A
shade: AB
:::

The left panel is the new sample space $S_A=A$; the right panel is the part of it
where $B$ also happens. Comparing the *sizes* of the two shaded areas (as
probabilities) gives the definition.

## Definition

::: define Conditional probability | 条件概率
Let $A$ and $B$ be events with $P(A)>0$. The **conditional probability of $B$ given
$A$** is
$$P(B\mid A)=\frac{P(AB)}{P(A)}.$$
It is the probability that $B$ happens when we know that $A$ has happened. In the
same way, if $P(B)>0$, $P(A\mid B)=P(AB)/P(B)$ is the probability of $A$ given $B$.
:::

::: formula Conditional probability | 条件概率公式
$$P(B\mid A)=\frac{P(AB)}{P(A)},\quad P(A)>0; \qquad P(A\mid B)=\frac{P(AB)}{P(B)},\quad P(B)>0$$
--
P(B\mid A) | probability of $B$ given that $A$ has happened | —
P(AB) | probability that $A$ and $B$ both happen | —
P(A) | probability of the condition $A$; it must be positive | —
:::

Check it on the die: $P(AB)=P\{2\}=1/6$ and $P(A)=3/6$, so
$P(B\mid A)=\dfrac{1/6}{3/6}=\dfrac13$, the answer we found by thinking.

Why must $P(A)$ be positive? We divide by it, and conditioning on something that
(almost) cannot happen gives no sensible information.

::: callout pitfall The order inside the bar matters
$P(B\mid A)$ and $P(A\mid B)$ are different numbers. Both have $P(AB)$ on top, but one
divides by $P(A)$, the other by $P(B)$. "The chance that a person who has a disease
tests positive" is not "the chance that a person who tests positive has the
disease" — Lesson 1.5 shows how far apart they can be.
:::

## Properties

For a fixed condition $B$ with $P(B)>0$, the function $P(\,\cdot\mid B)$ obeys the same
three axioms as an ordinary probability (non-negativity, normalisation, countable
additivity; Lesson 1.3). So **a conditional probability is a probability**, and
every property proved from the axioms in Lesson 1.3 holds for it too, with "$\mid B$"
added everywhere.

::: theorem Properties of conditional probability | 条件概率的性质
Let $P(B)>0$. Then
1. non-negativity: $P(A\mid B)\ge 0$ for every event $A$;
2. normalisation: $P(S\mid B)=1$, and $P(\varnothing\mid B)=0$;
3. addition: $P(A_1\cup A_2\mid B)=P(A_1\mid B)+P(A_2\mid B)-P(A_1A_2\mid B)$;
4. complement: $P(A\mid B)=1-P(\overline{A}\mid B)$;
5. countable additivity: if $A_1, A_2,\dots$ are pairwise mutually exclusive, then
   $P\big(\bigcup_{i=1}^{\infty}A_i\mid B\big)=\sum_{i=1}^{\infty}P(A_i\mid B)$.
:::

Here $S$ is the sample space (the slides write $S$ for $\Omega$) and $\overline{A}$ the
complement of $A$. The complement rule is the one you will use most: "the chance that
at least one … given …" is often easiest as $1-$ "the chance that none … given …".

::: callout note Only the left side behaves like a probability
The rules work on the event *before* the bar, with the condition kept fixed. There is
no such rule for the condition: $P(A\mid B)+P(A\mid\overline{B})$ is in general **not**
1.
:::

## Two ways to compute a conditional probability

::: callout key Two routes to P(B|A)
1. **By the definition**: work out $P(AB)$ and $P(A)$ in the original sample space
   $S$, then divide.
2. **In the reduced sample space**: once $A$ is known, list only the outcomes in $A$,
   and count how many of them are also in $B$. With equally likely outcomes,
   $$P(B\mid A)=\frac{\text{number of outcomes in } AB}{\text{number of outcomes in } A}.$$
For the die, $A=\{2,4,6\}$ has 3 outcomes (the size of the reduced sample space) and
only one of them is in $B$, so $P(B\mid A)=1/3$.
:::

The second route is often quicker, because it lets you "replay" the experiment with
the new information built in. Both must give the same answer.

::: example Two dice, the first shows a 6
Two fair dice are thrown. You are told the first one shows 6. What is the probability
that the total is at least 10?
== Name the events ==
$A=\{\text{the total is at least }10\}$, $B=\{\text{the first die shows }6\}$. We want
$P(A\mid B)$.
== Way 1: the definition ==
There are $36$ equally likely ordered pairs. $B$ has 6 of them: $(6,1),\dots,(6,6)$.
$AB$ needs first die 6 and total $\ge 10$: $(6,4),(6,5),(6,6)$, 3 pairs. So
$$P(A\mid B)=\frac{P(AB)}{P(B)}=\frac{3/36}{6/36}=\frac12.$$
== Way 2: the reduced sample space ==
Given $B$, only the second die is still random: 6 equally likely values. The total is
at least 10 when it shows 4, 5 or 6: 3 of the 6. So $P(A\mid B)=3/6=1/2$.
:::

::: example Grades of a product
A batch of products is 60% first grade, 30% second grade and 10% third grade. One item
is picked at random and found **not** to be third grade. What is the probability that
it is first grade?
== Name the events ==
$A=\{\text{first grade}\}$, $B=\{\text{not third grade}\}$, so $P(B)=0.6+0.3=0.9$.
== Notice that A is inside B ==
A first-grade item is certainly not third grade, so $A\subset B$ and $AB=A$:
$P(AB)=P(A)=0.6$.
== Divide ==
$$P(A\mid B)=\frac{P(AB)}{P(B)}=\frac{0.6}{0.9}=\frac23.$$
The information "not third grade" raised the chance of first grade from $0.6$ to
$2/3\approx0.667$.
:::

::: example Two coin tosses
A coin is tossed twice. Let $A=\{\text{at least one head}\}$ and
$B=\{\text{both tosses show the same face}\}$. Find $P(B)$ and $P(B\mid A)$.
== List the sample space ==
With $H$ for heads and $T$ for tails, $S=\{HH,HT,TH,TT\}$, four equally likely
outcomes. $A=\{HH,HT,TH\}$, $B=\{HH,TT\}$, $AB=\{HH\}$.
== Unconditional ==
$P(B)=2/4=1/2$.
== Conditional ==
In the reduced sample space $A$ (3 outcomes) only $HH$ is in $B$, so
$$P(B\mid A)=\frac13=\frac{1/4}{3/4}=\frac{P(AB)}{P(A)}\ne P(B).$$
Knowing there was a head rules out $TT$, one of the two ways of "same face", so $B$
became less likely.
:::

## How P(A|B) compares with P(A) and with P(AB)

Three numbers are easy to mix up: $P(A)$, $P(A\mid B)$ and $P(AB)$.

**$P(A\mid B)$ against $P(A)$.** Every experiment is carried out under some
conditions. $P(A)$ is the chance of $A$ under those conditions; $P(A\mid B)$ is the
chance of $A$ when we *add* one more condition, "$B$ has happened". It is still a
probability, but of a different situation, so it is a different concept and usually a
different number. And **there is no fixed order between them**: the extra information
can push the probability up (the grades example, $0.6\to2/3$) or down (the coins,
$1/2\to1/3$), or leave it where it was (that is independence, Lesson 1.6).

One case does have a fixed direction. If $B\subset A$, then $AB=B$ and
$$P(B\mid A)=\frac{P(AB)}{P(A)}=\frac{P(B)}{P(A)}\ge P(B),$$
because $P(A)\le1$: learning that a bigger event happened can only make a part of it
more likely.

**$P(B\mid A)$ against $P(AB)$.** Both count the same outcomes, those in $AB$, but
compare them with different totals. With equally likely outcomes,
$$P(AB)=\frac{\#\,AB}{\#\,S},\qquad P(B\mid A)=\frac{\#\,AB}{\#\,S_A},$$
where $\#$ means "number of outcomes in". Since the reduced sample space $S_A=A$ is
part of $S$, the denominator is smaller, so in general $P(B\mid A)\ge P(AB)$
(as a formula: $P(B\mid A)=P(AB)/P(A)$ and $P(A)\le1$). In the coin example,
$P(AB)=1/4$ but $P(B\mid A)=1/3$.

::: callout pitfall P(AB) or P(A|B)?
Read the question for the word that sets the condition: "**given** that", "**it is
known** that", "**it was found** that", "**if** … then the probability that". If the
information is something you have been *told* has happened, it goes behind the bar:
$P(A\mid B)$. If both things are what you are asking about ("the chance that it is
from B **and** standard"), it is $P(AB)$. The factory example at the end of this
lesson shows both from the same numbers.
:::

## The multiplication theorem

Turn the definition around: multiply both sides of $P(B\mid A)=P(AB)/P(A)$ by
$P(A)$. This gives a way to find the probability that two things *both* happen,
when it is natural to think of them happening one after the other: first $A$, then
$B$ given that $A$ has happened.

::: theorem Multiplication theorem | 乘法定理
If $P(A)>0$, then $P(AB)=P(A)\,P(B\mid A)$. If $P(B)>0$, then
$P(AB)=P(B)\,P(A\mid B)$.
:::

::: formula Multiplication theorem | 乘法公式
$$P(AB)=P(A)\,P(B\mid A)=P(B)\,P(A\mid B)$$
--
P(AB) | probability that both happen | —
P(A) | probability of the first event (positive) | —
P(B\mid A) | probability of the second, given the first | —
:::

It extends to any number of events, one link of the chain at a time: the first
happens, then the second given the first, then the third given the first two, and so
on.

::: formula Multiplication theorem for n events | 乘法公式的推广
$$P(A_1A_2\cdots A_n)=P(A_1)\,P(A_2\mid A_1)\,P(A_3\mid A_1A_2)\cdots P(A_n\mid A_1A_2\cdots A_{n-1})$$
--
A_1,\dots,A_n | $n\ge2$ events, with $P(A_1A_2\cdots A_{n-1})>0$ | —
P(A_k\mid A_1\cdots A_{k-1}) | chance of the $k$-th event, given that all earlier ones happened | —
:::

The condition $P(A_1A_2\cdots A_{n-1})>0$ makes every conditional probability in the
chain defined (each condition contains $A_1\cdots A_{n-1}$, so has positive
probability too). For three events it reads
$P(A_1A_2A_3)=P(A_1)P(A_2\mid A_1)P(A_3\mid A_1A_2)$.

::: callout tip When to reach for the multiplication theorem
Draws *without replacement*, steps that depend on earlier steps, "first … then …":
anywhere the conditional probabilities are easy to read off the situation while the
joint probability is not. You write the chain, and each factor is a small classical
probability in the situation left after the earlier steps.
:::

::: example A box of five products
A box holds 5 products: 3 first grade and 2 second grade. They are taken out one at a
time **without replacement**. Let $A_i=\{\text{the }i\text{-th item drawn is first
grade}\}$. Find the probability that (1) both of two draws are first grade; (2) the
second draw is first grade; (3) in three draws, the first first-grade item comes on
the third draw; (4) in two draws, the first item was second grade, given that the
second was first grade.
== (1) Both first grade ==
$P(A_1)=3/5$. After a first-grade item is gone, 4 remain, 2 of them first grade, so
$P(A_2\mid A_1)=2/4$:
$$P(A_1A_2)=P(A_1)P(A_2\mid A_1)=\frac35\cdot\frac24=\frac3{10}.$$
== (2) The second is first grade ==
The second draw is first grade either after a first-grade item or after a
second-grade one; these two cases are mutually exclusive and cover everything, so
we add them (finite additivity) and use the multiplication theorem on each:
$$P(A_2)=P(A_1A_2)+P(\overline{A_1}A_2)=\frac35\cdot\frac24+\frac25\cdot\frac34=\frac{6}{20}+\frac{6}{20}=\frac35.$$
The same as $P(A_1)$: the order of drawing does not change the chance. This
"split into cases, then multiply" is the law of total probability (Lesson 1.5).
== (3) First first-grade item on the third draw ==
We need second grade, second grade, then first grade: $\overline{A_1}\,\overline{A_2}A_3$.
After two second-grade items are gone, the 3 left are all first grade:
$$P(\overline{A_1}\,\overline{A_2}A_3)=P(\overline{A_1})P(\overline{A_2}\mid\overline{A_1})P(A_3\mid\overline{A_1}\,\overline{A_2})=\frac25\cdot\frac14\cdot\frac33=\frac1{10}.$$
== (4) First was second grade, given the second was first grade ==
This is a conditional probability "backwards in time". Use the definition, then the
multiplication theorem on top and part (2) below:
$$P(\overline{A_1}\mid A_2)=\frac{P(\overline{A_1}A_2)}{P(A_2)}=\frac{P(\overline{A_1})P(A_2\mid\overline{A_1})}{P(A_2)}=\frac{\frac25\cdot\frac34}{\frac35}=\frac12.$$
:::

::: callout note The missing slide
Part (2)'s solution was on a slide not shown in class; the value $3/5$ above is worked
out here.
:::

## Pólya's urn: a model of contagion

The multiplication theorem shines when each step changes the situation for the next.
A classic model is {{term Pólya's urn | 波里亚罐子模型}}.

::: example Pólya's urn
An urn holds $b$ white balls and $r$ red balls. A ball is drawn at random, its colour
noted, and it is put back **together with $c$ more balls of the same colour**. This is
done four times. Find the probability that the first two balls drawn are white and the
last two are red.
== Name the events ==
$W_i=\{\text{the }i\text{-th ball is white}\}$ and $R_j=\{\text{the }j\text{-th ball is
red}\}$, $i,j=1,2,3,4$. We want $P(W_1W_2R_3R_4)$.
== Follow the urn ==
Draw 1: $b$ white out of $b+r$. After a white, the urn has $b+c$ white out of
$b+r+c$. After a second white, it has $r$ red out of $b+r+2c$. After a red, $r+c$ red
out of $b+r+3c$.
== Multiply ==
$$P(W_1W_2R_3R_4)=P(W_1)P(W_2\mid W_1)P(R_3\mid W_1W_2)P(R_4\mid W_1W_2R_3)=\frac{b}{b+r}\cdot\frac{b+c}{b+r+c}\cdot\frac{r}{b+r+2c}\cdot\frac{r+c}{b+r+3c}.$$
== With numbers ==
For $b=3$, $r=2$, $c=1$:
$\dfrac35\cdot\dfrac46\cdot\dfrac27\cdot\dfrac38=\dfrac{3}{70}\approx0.0429$.
:::

When $c>0$, each ball drawn makes its own colour *more* likely next time. That is why
the urn is called a {{term contagion model | 传染病模型}}: every case of an infectious
disease that turns up raises the chance of further infection. The same formula
covers two familiar cases: $c=0$ is drawing **with** replacement, and $c=-1$ is
drawing **without** replacement (for $b=3$, $r=2$ that gives
$\frac35\cdot\frac24\cdot\frac23\cdot\frac12=\frac1{10}$).

::: explore Pólya's urn: white, white, red, red
slider b: 1 .. 10 = 3 | | step 1
slider r: 1 .. 10 = 2 | | step 1
slider c: 0 .. 10 = 1 | | step 1
p1 = b / (b + r) | | P(W1)
p2 = (b + c) / (b + r + c) | | P(W2 given W1)
p3 = r / (b + r + 2 c) | | P(R3 given W1W2)
p4 = (r + c) / (b + r + 3 c) | | P(R4 given W1W2R3)
P = p1 p2 p3 p4 | | P(W1W2R3R4)
:::

Move $c$ up and watch the second factor grow (white is "catching") while the third
shrinks: once white has spread, red is harder to draw.

## P(AB) versus P(A|B): the factory example

::: example Standard parts from two factories
Factories 甲 and 乙 made 1000 parts between them; 300 of them came from 乙, and of
those 300, 189 are standard. (1) One part is taken at random from the 1000. What is
the probability that it is a standard part made by 乙? (2) A part is taken and found
to be made by 乙. What is the probability that it is standard?
== Name the events ==
$B=\{\text{made by 乙}\}$, $A=\{\text{standard}\}$.
== (1) Both at once: P(AB) ==
Nothing is known in advance; we ask about "from 乙 **and** standard", in the whole
sample space of 1000 parts:
$$P(AB)=\frac{189}{1000}=0.189.$$
== (2) Given the factory: P(A|B) ==
Now "made by 乙" is information: the reduced sample space is the 300 parts from 乙,
of which 189 are standard:
$$P(A\mid B)=\frac{189}{300}=0.63.$$
== The link ==
They fit the multiplication theorem: $P(B)=0.3$ and $P(AB)=P(B)P(A\mid B)=0.3\times0.63=0.189$.
:::

The event $B$ ("made by 乙") is the same in both parts; what changes is its role. In
$P(AB)$ it is part of the **result** we ask about; in $P(A\mid B)$ it is the
**condition** we are given.

::: callout exam What exams ask
Multiple-choice questions on this lesson test the definition with special cases:
mutually exclusive events ($AB=\varnothing$ gives $P(A\mid B)=0$), $P(B\mid A)=1$
(which means $P(AB)=P(A)$, i.e. $P(A-B)=0$, *not* that $B$ is certain or that
$A\subset B$), and which formulas hold "always". The 2025 final (paper D, multiple
choice 2) asked exactly the $P(B\mid A)=1$ question below. Calculation questions use
the multiplication theorem for draws without replacement.
:::

## Summary

::: callout summary Conditional probability in four lines
- $P(B\mid A)=P(AB)/P(A)$ for $P(A)>0$: the share of $A$ that is also $B$.
- Compute it by the definition, or by counting in the reduced sample space $S_A=A$.
- $P(\cdot\mid A)$ is a probability: all the rules of Lesson 1.3 hold for it.
- Multiplication theorem: $P(AB)=P(A)P(B\mid A)$, and
  $P(A_1\cdots A_n)=P(A_1)P(A_2\mid A_1)\cdots P(A_n\mid A_1\cdots A_{n-1})$.
:::

::: cards Conditional probability
Definition of $P(B\mid A)$ :: $P(B\mid A)=\dfrac{P(AB)}{P(A)}$, defined when $P(A)>0$
What does $P(B\mid A)$ mean? :: The probability that $B$ happens, given (knowing) that $A$ has happened
Reduced sample space $S_A$ (缩减样本空间) :: Once $A$ is known to happen, $A$ itself is the new sample space; $P(B\mid A)=\#AB/\#A$ for equally likely outcomes
Two ways to compute a conditional probability :: By the definition $P(AB)/P(A)$ in $S$, or by counting in the reduced sample space $S_A$
Is $P(\cdot\mid B)$ a probability? :: Yes: non-negative, $P(S\mid B)=1$, countably additive, so every rule of ordinary probability holds for it
Complement rule given $B$ :: $P(A\mid B)=1-P(\overline{A}\mid B)$
Is $P(A\mid B)$ bigger or smaller than $P(A)$? :: Either: there is no fixed order (but if $B\subset A$, $P(B\mid A)=P(B)/P(A)\ge P(B)$)
$P(B\mid A)$ against $P(AB)$ :: Same numerator $\#AB$; $P(B\mid A)$ divides by $\#A$, $P(AB)$ by $\#S$, so $P(B\mid A)\ge P(AB)$
Multiplication theorem (乘法定理) :: $P(AB)=P(A)P(B\mid A)=P(B)P(A\mid B)$
Multiplication theorem for $n$ events :: $P(A_1\cdots A_n)=P(A_1)P(A_2\mid A_1)\cdots P(A_n\mid A_1\cdots A_{n-1})$, if $P(A_1\cdots A_{n-1})>0$
Pólya's urn (波里亚罐子模型) :: Draw a ball, put it back with $c$ more of its colour; $c>0$ models contagion, $c=0$ is with replacement, $c=-1$ without
$P(B\mid A)=1$ means… :: $P(AB)=P(A)$, so $P(A-B)=0$; not that $B$ is certain, nor that $A\subset B$
$A,B$ mutually exclusive, $P(B)>0$: $P(A\mid B)$? :: $0$, since $P(AB)=0$
:::

::: quiz Check yourself
? $A$ and $B$ are mutually exclusive, $P(A)=0.3$ and $P(B)=0.6$. Then $P(A\mid B)=$
- [ ] 0.18
- [x] 0
- [ ] 0.5
- [ ] 1
> Mutually exclusive means $AB=\varnothing$, so $P(AB)=0$ and $P(A\mid B)=0/0.6=0$.
> 0.18 would be $P(A)P(B)$, which is what independence (not exclusion) would give.

? Events $A$ and $B$ satisfy $P(B\mid A)=1$. Which follows?
- [ ] $B$ is the certain event
- [ ] $P(B)=1$
- [x] $P(A-B)=0$
- [ ] $A\subset B$
> $P(B\mid A)=1$ means $P(AB)=P(A)$, so $P(A-B)=P(A)-P(AB)=0$. It says nothing
> about $B$ outside $A$, so $B$ need not be certain and $P(B)$ need not be 1. And
> $A-B$ having probability 0 does not make it empty, so $A\subset B$ isn't forced.

? Which of these does **not** hold for all events $A$, $B$?
- [ ] $P(A-B)=P(A)-P(AB)$
- [ ] $P(AB)=P(B)P(A\mid B)$, where $P(B)>0$
- [x] $P(A+B)=P(A)+P(B)$
- [ ] $P(A)+P(\overline{A})=1$
> $P(A+B)=P(A)+P(B)$ needs $A$ and $B$ mutually exclusive; in general
> $P(A+B)=P(A)+P(B)-P(AB)$ (Lesson 1.3). The others are the difference rule, the
> multiplication theorem and the complement rule.

? (2025 final, paper D) Events $A$ and $B$ satisfy $0<P(A)<1$, $0<P(B)<1$ and $P(B\mid A)=1$. Which are true? {#exam-2025-d}
- [ ] $A$ is the certain event
- [x] $P(A\mid\overline{B})=0$
- [ ] $A\supset B$
- [x] $P(AB)=P(A)$
> $P(B\mid A)=1$ gives $P(AB)=P(A)$. Then $P(A\overline{B})=P(A)-P(AB)=0$, so
> $P(A\mid\overline{B})=P(A\overline{B})/P(\overline{B})=0$ (and $P(\overline B)>0$
> because $P(B)<1$). $A$ is not certain since $P(A)<1$; and if anything $A$ sits
> inside $B$, not the other way round. Answer: B and D.

? Two fair dice are thrown and the first shows 6. What is the probability that the total is at least 10?
answer: 1/2
> Given the first die is 6, the total is at least 10 when the second shows 4, 5 or 6:
> $3/6=1/2$. Or by the definition, $(3/36)/(6/36)$.

? Products are 60% first grade, 30% second grade, 10% third grade. An item is found not to be third grade. What is the probability it is first grade?
answer: 2/3
> First grade is inside "not third grade", so
> $P(A\mid B)=P(A)/P(B)=0.6/0.9=2/3$.

? $P(A)=0.5$, $P(B)=0.4$ and $P(AB)=0.2$. Find $P(\overline{A}\mid B)$.
answer: 0.5
> $P(A\mid B)=0.2/0.4=0.5$, and by the complement rule given $B$,
> $P(\overline{A}\mid B)=1-0.5=0.5$.

? Five keys, only one opens the door. You try them one at a time at random, setting aside each one that fails. What is the probability that the door opens on the third try?
answer: 1/5
> Fail, fail, succeed: $\frac45\cdot\frac34\cdot\frac13=\frac15$ by the multiplication
> theorem. (Each try is equally likely to be the lucky one, so $1/5$ is no accident.)

? In Pólya's urn ($b$ white, $r$ red, $c$ added each time), write $P(W_1W_2R_3R_4)$.
expression: b/(b+r) * (b+c)/(b+r+c) * r/(b+r+2c) * (r+c)/(b+r+3c)
variables: b, r, c
> Multiply along the chain: white from $b+r$, white again from $b+r+c$ with $b+c$
> white, red from $b+r+2c$ with $r$ red, red again from $b+r+3c$ with $r+c$ red.

? Of 1000 parts, 300 are from factory 乙 and 189 of those are standard. A part is found to be from 乙: what is the probability it is standard?
answer: 0.63
> Being from 乙 is given, so this is $P(A\mid B)=189/300=0.63$. The chance that a
> random part is *both* from 乙 and standard is $P(AB)=0.189$.
:::

---
title: Random events and sample spaces
zh: 随机事件与样本空间
summary: What probability studies, random trials, events and sample spaces, how events combine (union, intersection, complement, difference), mutually exclusive and complementary events, De Morgan's laws, and writing events in A, B, C.
source: 0绪论 and 1随机事件1-1 (§1.1–1.2), 2026-08-31
---

Before we can say *how likely* something is, we need a precise way to say *what* can
happen. This lesson builds that language: the list of everything a trial can produce
(the sample space), the things we ask about (events), and the ways events combine
("A or B", "A and B", "not A"). Events turn out to be sets, so the rules you know from
set theory become rules about chance. Everything later in the course (classical
probability, the axioms, conditional probability, Bayes) is written in this language.

## What probability studies

Look at four things: the sun rising in the east, a stone thrown upwards falling back,
tomorrow's highest temperature, and a newborn baby's weight. The first two are
{{term deterministic phenomena | 确定性现象}}: once the conditions are fixed, the result
is fixed too ("the conditions completely decide the result"). The last two are
{{term random phenomena | 随机现象}}: under the same conditions the result may come
out one way or another, and nobody can say in advance which.

Randomness is not a failure of knowledge that will go away: it is built into nature,
from the motion of particles to genes and to how people behave. For a long time,
philosophers since Aristotle saw chance as something that breaks the order of life and
can't be studied. The mathematics started with gambling: Italian scholars of the 16th
century looked at dice problems, and in the 17th century Pascal and Fermat, in a famous
exchange of letters, solved how to split the stakes of an unfinished game by counting
arrangements. Jakob Bernoulli made probability a real branch of mathematics, and
measuring uncertainty in numbers grew into a working science in the 20th century.
Today it is used almost everywhere: weather and earthquake forecasting, quality control
and drug trials (hypothesis testing), reliability of rockets and electronics,
information theory, queues at telephone exchanges and shops, epidemics.

{{term Probability theory | 概率论}} studies the laws that random phenomena follow;
{{term mathematical statistics | 数理统计}} studies how to collect and analyse random data
to draw conclusions and make decisions. Probability is the foundation of statistics,
and statistics is an application of probability, but they are two parallel branches.

::: callout key The object of study
A single random result is a matter of chance (偶然性), but **many** results show a
pattern (规律性). Probability theory studies this **statistical regularity of random
phenomena** (随机现象的统计规律性).
:::

That is why "天有不测风云" (the weather is unpredictable) and "天气可以预报" (the
weather can be forecast) don't contradict each other: tomorrow's weather is one random
result, but weather over many days follows patterns that can be measured and used.

The classic picture is coin tossing. One toss is unpredictable, but the share of heads
settles down as the number of tosses $n$ grows:

| Experimenter | Tosses $n$ | Heads $n_H$ | Share of heads $f$ |
| --- | --- | --- | --- |
| De Morgan | 2048 | 1061 | 0.5181 |
| Buffon | 4040 | 2048 | 0.5069 |
| K. Pearson | 12000 | 6019 | 0.5016 |
| K. Pearson | 24000 | 12012 | 0.5005 |

The share $f$ creeps towards $\tfrac12$. Lesson 1.3 makes this "frequency" precise.

## Random trials

How do we study random phenomena? By watching them happen, again and again, under the
same conditions. Any such observation, measurement or experiment is a trial.

::: define Random trial | 随机试验
An experiment or observation, written $E$, with three features:
1. it can be repeated under the same conditions;
2. it has more than one possible result, and all the possible results are known in
   advance;
3. before a trial is done, nobody can tell which result will come out.
:::

The course's four standard trials:

- $E_1$: toss a coin and see whether heads $H$ or tails $T$ comes up;
- $E_2$: roll a die and note the number of points;
- $E_3$: count the calls a telephone exchange receives in one minute;
- $E_4$: take one light bulb from a batch and measure how long it lasts.

## Events

When we run a trial, we usually care about a statement such as "the die shows an even
number" — something that may or may not happen.

::: define Random event | 随机事件
Something that may or may not happen in a trial $E$; an *event* for short. Events are
written with capital letters: $A = \{\text{the die shows an even number}\}$, or
$A = $ "the die shows an even number".
:::

Examples: in $E_2$, $A = \{\text{even points}\}$, $B = \{\text{more than 2 points}\}$; in
$E_3$, $A = \{\text{at least 5 calls}\}$; in $E_4$, $A = \{\text{lifetime at most 50
hours}\}$, $B = \{\text{lifetime between 50 and 100 hours}\}$.

::: define Elementary event | 基本事件
A single possible result of the trial, written $e$. An event made of several
elementary events is a {{term compound event | 复合事件}}.
:::

An event **happens** when the trial's result is one of the elementary events in it.
Rolling a 4 makes $A = \{\text{even}\}$ happen, and $B = \{\text{more than 2}\}$ too.

::: define Certain and impossible events | 必然事件与不可能事件
The **certain event** always happens; it is the whole set of results, written $\Omega$
(or $S$). The **impossible event** never happens; it is the empty set, written
$\varnothing$.
:::

::: callout note Notation on the slides
The slides write the impossible event as $\Phi$ in places. It is the empty set
$\varnothing$; don't mix it up with $\Phi(x)$, the normal distribution function that
comes later in the course.
:::

## Sample spaces

::: define Sample space | 样本空间
The set of all possible results of a trial $E$, written $\Omega$ or $S$. Each element,
one result, is a {{term sample point | 样本点}}.
:::

Examples:

- Toss two coins and record each face: $S_1 = \{(H,H), (H,T), (T,H), (T,T)\}$.
- Toss two coins and count the heads: $S_2 = \{0, 1, 2\}$.
- Roll a die: $S_3 = \{1, 2, 3, 4, 5, 6\}$.
- Calls to a city's 120 emergency line in a day: $S_4 = \{0, 1, 2, \dots\}$.
- People waiting at a bus stop at a given moment: $S_5 = \{0, 1, 2, \dots\}$.
- A region's average December temperature: $S_6 = \{t \mid T_1 < t < T_2\}$.
- A bulb's lifetime: $S_7 = \{t \mid t \ge 0\}$.

::: callout pitfall Same trial, different sample spaces
$S_1$ and $S_2$ come from the same two coins. What you choose to record decides the
sample space: four ordered outcomes, or three counts. Note that the counts in $S_2$ are
**not** equally likely ($1$ head happens two ways), while the four outcomes in $S_1$ are.
:::

A sample space is a set. It may be finite ($S_1$–$S_3$), countably infinite ($S_4$,
$S_5$) or a continuum ($S_6$, $S_7$); one-dimensional or many-dimensional.

::: callout key Trial → sample space → events
Each trial has a sample space, and **events are subsets of the sample space**. An
elementary event is a one-point subset, a compound event a bigger one, $\Omega$ the
whole set, $\varnothing$ the empty one.
:::

::: example Sample space and events for two dice
Roll two dice, red and blue, and record both faces. Describe $\Omega$ and the event
$A = \{\text{the sum is } 10 \text{ or more}\}$.
== Sample space ==
$\Omega = \{(i, j) \mid i, j = 1, \dots, 6\}$, where $i$ is the red die and $j$ the blue:
$6 \times 6 = 36$ sample points.
== The event ==
Sum 10: $(4,6), (5,5), (6,4)$; sum 11: $(5,6), (6,5)$; sum 12: $(6,6)$. So
$A = \{(4,6), (5,5), (6,4), (5,6), (6,5), (6,6)\}$, six sample points.
== Its opposite ==
"Sum 9 or less" is everything else: $36 - 6 = 30$ sample points.
:::

## Relations between events

From here on, $\Omega$ is the sample space and $A$, $B$, $A_1, A_2, \dots$ are events
(subsets of it). Each idea has a meaning in words, a meaning as sets, and a picture.

::: define Containment | 包含
If $A$ happening always makes $B$ happen, $B$ **contains** $A$: $A \subset B$ (or
$B \supset A$), and $A$ is a sub-event of $B$. In the picture, the circle $A$ sits
inside the circle $B$.
:::

::: define Equal events | 事件相等
$A = B$ when $A \subset B$ and $B \subset A$: they happen on exactly the same results.
:::

For a die, $\{\text{shows } 6\} \subset \{\text{shows an even number}\}$.

## Operations on events

::: define Union | 和事件（并）
$A \cup B$ (also written $A + B$) is the event "$A$ or $B$ happens", that is, **at least
one** of them happens: $A \cup B = \{x \mid x \in A \text{ or } x \in B\}$.
:::

A part is faulty if its length is wrong **or** its diameter is wrong: "faulty" is the
union of "bad length" and "bad diameter".

::: define Intersection | 积事件（交）
$A \cap B$, written $AB$, is the event "$A$ and $B$ both happen":
$AB = \{x \mid x \in A \text{ and } x \in B\}$.
:::

A part is good when its length is good **and** its diameter is good: "good" is the
product of the two.

Both extend to many events: $\bigcup_{k=1}^n A_k$ (at least one of $A_1, \dots, A_n$
happens), $\bigcap_{k=1}^n A_k$ (all of them happen), and likewise for a countable list
$A_1, A_2, \dots$ with $\bigcup_{k=1}^\infty$ and $\bigcap_{k=1}^\infty$.

::: define Complement | 对立事件
$\overline{A}$ (also $A^c$) is the event "$A$ does not happen": everything in $\Omega$
outside $A$. Then $A \cup \overline{A} = \Omega$, $A\overline{A} = \varnothing$ and
$\overline{\overline{A}} = A$.
:::

A die "shows 1" and "doesn't show 1" are complements.

::: define Difference | 差事件
$A - B$ (also $A \setminus B$) is the event "$A$ happens but $B$ doesn't". As sets,
$A - B = A\overline{B}$.
:::

::: venn The four operations
shade: A ∪ B
shade: AB
shade: A'
shade: A - B
:::

Some properties follow straight from the pictures:

- $A \subset A \cup B$, $B \subset A \cup B$, $A \cup B = B \cup A$;
  $A \cup A = A$, $A \cup \varnothing = A$, $A \cup \Omega = \Omega$.
- $AB \subset A \subset A \cup B$; $(AB) \cup A = A$; $A(A \cup B) = A$;
  $AA = A$, $A\Omega = A$, $A\varnothing = \varnothing$.
- $A - B = A\overline{B} \subset A$; $(A - B) \cup A = A$; $(A - B) \cup B = A \cup B$.

::: callout pitfall Is $(A - B) \cup (B - A)$ empty?
No (a question from the lecture). $(A - B) \cup (B - A)$ is the set of results in
**exactly one** of $A$ and $B$. It is empty only when $A = B$. Also, $A - B$ is not
$A$ minus "the whole of $B$" in any arithmetic sense: only the part of $B$ inside $A$
is removed.
:::

::: venn Results in exactly one of A and B
shade: (A - B) ∪ (B - A)
:::

## Mutually exclusive and complementary events

::: define Mutually exclusive events | 互不相容（互斥）
$A$ and $B$ are **mutually exclusive** when they can't happen together: $AB =
\varnothing$. Events $A_1, A_2, \dots$ are pairwise mutually exclusive when
$A_iA_j = \varnothing$ for every $i \ne j$.
:::

Heads and tails on one coin are mutually exclusive; so are "the die shows 1" and "the
die shows 2".

Complementary events are a special, stronger case: $A$ and $B$ are complementary when
$AB = \varnothing$ **and** $A \cup B = \Omega$, so $B = \overline{A}$. Exactly one of them
happens, every time.

::: callout pitfall Mutually exclusive is not the same as complementary
Complementary ⟹ mutually exclusive, but not the other way round. "The die shows 1" and
"the die shows 2" are mutually exclusive, yet neither is the complement of the other:
a 5 makes both fail. Mutually exclusive means "never both"; complementary means "never
both, and always one".
:::

The certain and impossible events are complements of each other: $\overline{\Omega} =
\varnothing$.

## Laws of operations

::: law Laws of operations on events | 事件的运算律
For any events $A$, $B$, $C$:
1. Commutative: $A \cup B = B \cup A$, $AB = BA$.
2. Associative: $(A \cup B) \cup C = A \cup (B \cup C)$, $(AB)C = A(BC)$.
3. Distributive: $(A \cup B)C = AC \cup BC$, $(AB) \cup C = (A \cup C)(B \cup C)$.
4. De Morgan's laws (below).
:::

The two distributive laws work like "multiplying out" and its mirror image; the second
one has no counterpart in ordinary arithmetic, so check it on a Venn diagram.

::: law De Morgan's laws | 德·摩根律
$$\overline{A \cup B} = \overline{A}\,\overline{B}, \qquad \overline{AB} = \overline{A} \cup \overline{B}.$$
For $n$ events:
$\overline{A_1 \cup \cdots \cup A_n} = \overline{A_1}\,\overline{A_2}\cdots\overline{A_n}$ and
$\overline{A_1A_2\cdots A_n} = \overline{A_1} \cup \cdots \cup \overline{A_n}$.
:::

In words: "not (at least one)" is "none", and "not (all)" is "at least one fails".
Taking the complement swaps $\cup$ and $\cap$ and puts a bar on each event.

::: venn De Morgan's laws: each pair of panels agrees
shade: (A ∪ B)'
shade: A'B'
shade: (AB)'
shade: A' ∪ B'
:::

The same reasoning gives the complements of "at least" and "at most":

- the complement of "at least $k$ of $A_1, \dots, A_n$ happen" is "at most $k - 1$ of
  them happen";
- the complement of "at most $k$ happen" is "at least $k + 1$ happen".

::: callout pitfall The complement of "A and B" is not "neither"
The complement of "product A sells well **and** product B sells badly" is "A sells badly
**or** B sells well" — not "A sells badly and B sells well". De Morgan turns "and" into
"or". This is the lecture's in-class question (in the quiz below).
:::

## Probability and set theory side by side

| Symbol | In probability | In set theory |
| --- | --- | --- |
| $\Omega$ ($S$) | sample space, certain event | the whole space |
| $\varnothing$ | impossible event | empty set |
| $e$ | elementary event | element |
| $A$ | random event | subset |
| $\overline{A}$ | complement of $A$ ($A$ doesn't happen) | complement of $A$ |
| $A \subset B$ | $A$ happening forces $B$ | $A$ is a subset of $B$ |
| $A = B$ | $A$ and $B$ are equal | equal sets |
| $A \cup B$ | at least one of $A$, $B$ happens | union |
| $AB$ | $A$ and $B$ both happen | intersection |
| $A - B$ | $A$ happens, $B$ doesn't | set difference |
| $AB = \varnothing$ | $A$ and $B$ mutually exclusive | disjoint sets |

## Writing events in A, B, C

A skill exams test directly: turn a sentence into an expression in $A$, $B$, $C$. Think
of the eight regions of a three-set Venn diagram; each "exactly" statement picks some of
them, and each region is a product like $A\overline{B}\,\overline{C}$ (in $A$, not in
$B$, not in $C$).

::: example Ten events from A, B, C
Write each event in $A$, $B$, $C$.
== Single regions ==
1. $A$ happens, $B$ and $C$ don't: $A\overline{B}\,\overline{C}$.
2. $A$ and $B$ happen, $C$ doesn't: $AB\overline{C}$.
3. All three happen: $ABC$.
4. None happens: $\overline{A}\,\overline{B}\,\overline{C}$ (by De Morgan, also
   $\overline{A \cup B \cup C}$).
== At least ==
5. At least one happens: $A \cup B \cup C$.
6. At least two happen: $AB \cup BC \cup AC$, or region by region
   $\overline{A}BC \cup A\overline{B}C \cup AB\overline{C} \cup ABC$.
== Exactly ==
7. Exactly two happen: $\overline{A}BC \cup A\overline{B}C \cup AB\overline{C}$.
== At most ==
8. At most one happens: $\overline{A}\,\overline{B}\,\overline{C} \cup
   A\overline{B}\,\overline{C} \cup \overline{A}B\overline{C} \cup
   \overline{A}\,\overline{B}C$, which is the complement of "at least two":
   $\overline{AB \cup BC \cup AC}$.
9. At most two happen: $\overline{ABC}$ (everything but "all three"), or the union of
   the other seven regions.
== Mixed ==
10. At least one of $A$, $B$ happens, $C$ doesn't: $(A \cup B)\overline{C}$.
:::

::: venn Three of the answers
sets: A B C
shade: AB ∪ BC ∪ AC
shade: A'BC ∪ AB'C ∪ ABC'
shade: (A ∪ B)C'
:::

::: callout exam What exams ask
Expect a choice or fill-in question: "the complement of … is", "express … in A, B, C",
or "which of these events are mutually exclusive / complementary". Use De Morgan for
complements, and check "at least / at most / exactly" by counting Venn regions.
:::

::: cards Events and sample spaces
Random trial (随机试验): three features :: Repeatable under the same conditions; more than one result, all known in advance; which one comes out can't be told beforehand.
Sample space (样本空间) :: The set $\Omega$ (or $S$) of all possible results of a trial; its elements are sample points.
Random event (随机事件) :: A subset of the sample space; it happens when the result lies in it.
Certain and impossible events :: $\Omega$ (always happens) and $\varnothing$ (never happens); they are complements of each other.
$A \cup B$ :: At least one of $A$, $B$ happens (also written $A + B$).
$AB$ :: $A$ and $B$ both happen ($A \cap B$).
$A - B$ :: $A$ happens and $B$ doesn't; equals $A\overline{B}$.
Mutually exclusive (互斥) :: $AB = \varnothing$: they never happen together.
Complementary (对立) :: $AB = \varnothing$ and $A \cup B = \Omega$: exactly one happens.
Complementary vs mutually exclusive :: Complementary implies mutually exclusive; not conversely.
De Morgan's laws :: $\overline{A \cup B} = \overline{A}\,\overline{B}$ and $\overline{AB} = \overline{A} \cup \overline{B}$.
Complement of "at least $k$ happen" :: "At most $k - 1$ happen".
"At least two of $A, B, C$" :: $AB \cup BC \cup AC$.
"Exactly two of $A, B, C$" :: $\overline{A}BC \cup A\overline{B}C \cup AB\overline{C}$.
:::

::: quiz Check yourself
? Let $A$ be "product 甲 sells well and product 乙 sells badly". Its complement $\overline{A}$ is:
- [ ] "甲 sells badly and 乙 sells well"
- [ ] "both 甲 and 乙 sell well"
- [x] "甲 sells badly or 乙 sells well"
- [ ] "甲 sells badly"
> $A = \{\text{甲 well}\} \cap \{\text{乙 badly}\}$, so by De Morgan $\overline{A} = \{\text{甲 badly}\} \cup \{\text{乙 well}\}$. The other options are only parts of $\overline{A}$ (in-class question, answer C).

? Which of these are random phenomena? (tick all)
- [ ] The sun rises in the east
- [x] Tomorrow's highest temperature
- [ ] A stone thrown upwards falls back
- [x] A newborn baby's weight
> The sun and the stone are decided by their conditions (deterministic); the temperature and the weight can't be predicted before you observe them.

? Two coins are tossed and you record **the number of heads**. How many sample points does the sample space have?
answer: 3
> $S_2 = \{0, 1, 2\}$. Recording each coin's face instead would give the 4 points $(H,H), (H,T), (T,H), (T,T)$.

? Two dice are rolled and both faces recorded. How many sample points are in the event "the sum is at least 10"?
answer: 6
> $(4,6), (5,5), (6,4), (5,6), (6,5), (6,6)$: six of the 36 points.

? Is $(A - B) \cup (B - A) = \varnothing$ for all events $A$, $B$?
- [ ] Yes, always
- [x] Only when $A = B$
- [ ] Only when $A$ and $B$ are mutually exclusive
> $(A - B) \cup (B - A)$ holds the results in exactly one of $A$, $B$. It's empty exactly when every result in one is in the other, i.e. $A = B$. For mutually exclusive $A$, $B$ it is $A \cup B$.

? Which statement is true?
- [x] Complementary events are always mutually exclusive
- [ ] Mutually exclusive events are always complementary
- [ ] If $AB = \varnothing$ then $A \cup B = \Omega$
> Complementary means $AB = \varnothing$ and $A \cup B = \Omega$, so it includes being mutually exclusive. The die's "1" and "2" are mutually exclusive but not complementary.

? Write "at least two of $A$, $B$, $C$ happen" as a logic expression (type $AB$ for $A \cap B$, $+$ for $\cup$, $A'$ for $\overline{A}$).
logic: AB + BC + AC
variables: A, B, C
> If at least two happen, some pair happens together; conversely any pair happening means at least two. So $AB \cup BC \cup AC$; the region-by-region form $A'BC + AB'C + ABC' + ABC$ is accepted too.

? Write "exactly one of $A$, $B$, $C$ happens" in the same notation.
logic: AB'C' + A'BC' + A'B'C
variables: A, B, C
> One region per choice of the event that happens: $A\overline{B}\,\overline{C} \cup \overline{A}B\overline{C} \cup \overline{A}\,\overline{B}C$.

? By De Morgan, the complement of $A \cup B \cup C$ ("at least one happens") is:
logic: A'B'C'
variables: A, B, C
> $\overline{A \cup B \cup C} = \overline{A}\,\overline{B}\,\overline{C}$: none of them happens.

? The complement of "at least 3 of $A_1, \dots, A_5$ happen" is "at most ___ of them happen".
answer: 2
> "Not at least $k$" is "at most $k - 1$": here $k = 3$, so at most 2.
:::

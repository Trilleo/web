---
title: Classical probability
zh: 古典概型
summary: The equally likely model P(A) = m/n, the counting it needs (addition and multiplication principles, permutations, combinations, with and without replacement), and its classic problems — balls in boxes, birthdays, drawing lots, the ball-drawing game and the small-probability principle.
source: 1随机事件1-1 (§1.3) and 2古典乘法1-2, 2026-08-31
---

The first probabilities anyone worked out were for dice and cards, where every outcome
is as likely as every other. In that world, a probability is just a ratio of two
counts: favourable outcomes over all outcomes. This lesson sets up that
{{term classical model | 古典概型}}, then the counting tools it needs (most of the work is
counting correctly), and works through the classic problems that exams love: balls in
boxes, shared birthdays, drawing lots, and a street game that looks generous but isn't.

## The equally likely model

Roll a fair die. Nothing favours one face, so each of the six faces should get the same
share of the total probability, $\tfrac16$. "An even number" is three of those faces, so
its probability is $\tfrac36 = \tfrac12$. That is the whole idea.

::: define Classical model | 古典概型
A trial is a **classical** (or **equally likely**) model, 等可能概型, when
1. its sample space has finitely many sample points, and
2. every elementary event is equally likely.
:::

::: formula Classical probability | 古典概率
$$P(A) = \frac{m}{n} = \frac{\#(A)}{\#(\Omega)}$$
--
$n = \#(\Omega)$ | the number of sample points in the sample space
$m = \#(A)$ | the number of sample points in the event $A$
$P(A)$ | the probability of $A$
:::

Here $\#(\cdot)$ means "how many points are in". From the formula, $0 \le P(A) \le 1$,
$P(\Omega) = 1$ and $P(\varnothing) = 0$.

::: example Two dice
Two fair dice are rolled. Find the probability that the sum is at least 10.
== Sample space ==
Record the pair (red, blue): $n = 6 \times 6 = 36$ equally likely points.
== Count the event ==
Sums 10, 11, 12: $(4,6), (5,5), (6,4), (5,6), (6,5), (6,6)$, so $m = 6$.
== Probability ==
$P(A) = 6/36 = 1/6$.
:::

::: callout pitfall Check that the points really are equally likely
For the *sum* of two dice you could take $\Omega = \{2, 3, \dots, 12\}$, but those 11
sums are **not** equally likely (7 happens six ways, 12 only one), so $m/n$ with $n = 11$
is wrong. Choose a sample space whose points are equally likely — usually ordered
outcomes — and then count.
:::

## Counting principles

Classical probability is counting, and two rules underlie all counting.

::: law Addition principle | 加法原理
If a task can be done in one of $m$ **alternative** ways, the first way having $n_1$
methods, the second $n_2$, …, the $m$-th $n_m$, and any one of them completes the task,
then there are $n_1 + n_2 + \cdots + n_m$ methods in all.
:::

To get from 甲 to 乙 you can take a train (2 services a day) or a ship (3 services):
$2 + 3 = 5$ ways. You take one **or** the other: add.

::: law Multiplication principle | 乘法原理
If a task is done in $m$ **successive** steps, with $n_1$ methods for the first step,
$n_2$ for the second, …, $n_m$ for the last, and every step must be done, then there are
$n_1 \times n_2 \times \cdots \times n_m$ methods in all.
:::

If you must go from 甲 to 乙 (5 ways) and then from 乙 to 丙 (4 ways), there are
$5 \times 4 = 20$ routes. One step **and then** the next: multiply.

## Permutations and combinations

From these two principles come four formulas. Imagine filling $k$ numbered slots with
items chosen from $n$ different ones.

::: define Permutation | 选排列
An arrangement of $k$ of $n$ different items in order ($1 \le k \le n$), each used at most
once. The first slot has $n$ choices, the second $n - 1$, …, the $k$-th $n - k + 1$.
:::

::: formula Number of permutations | 排列数
$$A_n^k = n(n-1)(n-2)\cdots(n-k+1) = \frac{n!}{(n-k)!}$$
--
$n$ | the number of different items
$k$ | how many are arranged in order
$A_n^k$ | the number of ordered arrangements (some books write $P_n^k$)
:::

With $k = n$ this is a **full permutation** (全排列): $A_n^n = n! = n(n-1)\cdots 2 \cdot 1$,
with $0! = 1$.

If items are put back after each pick, every slot has all $n$ choices again:

::: formula Permutations with repetition | 有重复的排列
$$n \cdot n \cdots n = n^k$$
--
$n$ | the number of different items, each may be picked again
$k$ | the number of picks (any $k$, even more than $n$)
:::

When order doesn't matter, each group of $k$ items was counted $k!$ times among the
permutations (once for each order), so divide:

::: define Combination | 组合
A selection of $k$ of $n$ different items ($1 \le k \le n$) without regard to order.
:::

::: formula Number of combinations | 组合数
$$C_n^k = \binom{n}{k} = \frac{A_n^k}{k!} = \frac{n!}{k!\,(n-k)!}$$
--
$C_n^k$ | the number of ways to choose $k$ of $n$ items, order ignored; also written $\binom nk$ (the combination or binomial coefficient)
:::

Both notations, $C_n^k$ and $\binom nk$, mean the same thing; note that the *top* number
in $\binom nk$ is the *bottom* one in $C_n^k$. Useful facts: $\binom nk = \binom n{n-k}$,
$\binom n0 = \binom nn = 1$.

::: example Committees and officers
A club has 10 members. (a) How many ways can it choose a president, a secretary and a
treasurer? (b) How many ways can it choose a committee of 3?
== Officers: order matters ==
The three posts are different, so it's a permutation: $A_{10}^3 = 10 \cdot 9 \cdot 8 = 720$.
== Committee: order doesn't ==
$C_{10}^3 = 720 / 3! = 120$: each committee of three was counted $3! = 6$ times above.
:::

::: callout key Ask two questions before counting
**Does order matter?** (permutation vs combination) and **can an item be picked again?**
(with vs without replacement). The four answers give $A_n^k$, $C_n^k$, $n^k$ — and the
same question must be answered the same way for $\#(A)$ and $\#(\Omega)$.
:::

## With and without replacement

A box holds 6 red balls and 4 white ones. Draw 3. Two ways of drawing give two
different models:

- **without replacement** (不放回): a drawn ball stays out; this is the same as grabbing
  3 at once, and we may ignore order;
- **with replacement** (有放回): each ball is put back before the next draw, so every
  draw sees the same box.

::: example Exactly two red balls
Draw 3 balls from 6 red and 4 white. Find the probability of exactly 2 red ones,
(a) without replacement, (b) with replacement.
== Without replacement ==
Unordered: $\#(\Omega) = \binom{10}{3} = 120$. Choose 2 of the 6 red and 1 of the 4
white: $\#(A) = \binom62\binom41 = 15 \cdot 4 = 60$. So $P(A) = 60/120 = 1/2$.
== With replacement ==
Order now matters (draws are repeated): $\#(\Omega) = 10^3 = 1000$. Choose which of the
3 draws is the white one (3 ways), then $6 \cdot 6 \cdot 4$ colour choices:
$\#(A) = 3 \cdot 6^2 \cdot 4 = 432$. So $P(A) = 432/1000 = 0.432$.
:::

Without replacement, the general pattern for $N$ balls of which $M$ are red, drawing
$n$ and asking for exactly $k$ red ones, is
$P = \binom Mk\binom{N-M}{n-k}\big/\binom Nn$ (the {{term hypergeometric | 超几何}}
pattern). The ball-drawing game below uses it.

## Balls in boxes

Many problems — people and birthdays, letters and mailboxes, particles and cells — are
the same model in disguise.

::: example The ball-in-box model | 盒子模型
$n$ balls are put at random into $M$ boxes ($n \le M$); a box may hold any number of
balls, and each ball is equally likely to go into each box. Find the probability that
(1) $A$: $n$ **specified** boxes get one ball each;
(2) $B$: **some** $n$ boxes get one ball each (no box has two);
(3) $C$: one specified box gets exactly $k$ balls.
== The sample space ==
Each ball picks one of $M$ boxes, independently: $\#(\Omega) = M^n$ (permutations with
repetition).
== (1) Specified boxes ==
The $n$ balls fill the $n$ named boxes, one each, in $n!$ ways:
$$P(A) = \frac{n!}{M^n}.$$
== (2) Any n boxes ==
First choose which $n$ boxes ($C_M^n$ ways), then fill them ($n!$ ways):
$$P(B) = \frac{C_M^n\,n!}{M^n} = \frac{A_M^n}{M^n}.$$
== (3) k balls in one box ==
Choose which $k$ balls go there ($C_n^k$), and send the other $n - k$ balls to the other
$M - 1$ boxes ($(M-1)^{n-k}$ ways):
$$P(C) = \frac{C_n^k\,(M-1)^{n-k}}{M^n}.$$
== With numbers ==
3 balls, 4 boxes: $\#(\Omega) = 4^3 = 64$; $P(A) = 3!/64 = 6/64 \approx 0.094$;
$P(B) = A_4^3/64 = 24/64 = 0.375$; two balls in box 1: $P(C) = \binom32 \cdot 3/64 =
9/64 \approx 0.141$.
:::

::: callout pitfall "Specified" vs "some"
$A$ names the boxes in advance; $B$ lets any $n$ boxes do. The difference is the factor
$C_M^n$ for choosing the boxes. Read the question for words like 指定 (specified) and
恰有 (exactly / some).
:::

## The birthday problem

How many people must be in a room before two of them probably share a birthday? Most
people guess around 180. The answer is 23.

People are balls, the 365 days are boxes (ignore leap years, assume every day equally
likely). "All $n$ birthdays different" is event $B$ of the box model with $M = 365$.

::: formula Birthday problem | 生日问题
$$P(\text{all different}) = \frac{A_{365}^n}{365^n} = \frac{365 \times 364 \times \cdots \times (365-n+1)}{365^n}, \qquad P(\text{some shared}) = 1 - \frac{A_{365}^n}{365^n}$$
--
$n$ | the number of people ($n \le 365$)
$A_{365}^n$ | ways to give $n$ people different birthdays, in order
:::

::: explore The birthday problem
slider n: 2 .. 80 = 23 | people | step 1
slider N: 12 .. 365 = 365 | days | step 1
different = comb(N, n) n! / N^n | | All birthdays different
shared = 1 - different | | At least two share one
:::

Set $N = 12$ to ask about birth *months* instead: with only 4 people the chance of a
shared month is already about 0.43.

::: plot Chance that at least two of n people share a birthday
x: 1 .. 60
xlabel: n (people)
ylabel: probability
bars p(n) = 1 - comb(365, n) n! / 365^n
h(n) = 0.5
:::

| People $n$ | 10 | 20 | 23 | 30 | 40 | 50 | 60 | 70 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $P(\text{some shared})$ | 0.1169 | 0.4114 | 0.5073 | 0.7063 | 0.8912 | 0.9704 | 0.9941 | 0.9992 |

By 100 people the chance is above $0.9999997$. The surprise has a reason: with 23 people
there are $\binom{23}2 = 253$ pairs, and any one of them can match.

::: callout note About the lecture's table
The slides print the table to twenty decimals, computed by software, for 10 to 160
people. The values above were recomputed exactly; they agree with the slide to four
decimals. Some of the slide's long values for 90 people and more look mistyped (one
nine too many); only the first few digits matter anyway.
:::

## Drawing lots

Is it better to draw early or late? Intuition says the first person has an advantage —
or maybe the last one, who "knows more". Neither is true.

::: example The k-th ball drawn | 抽签问题
A bag holds $a$ yellow and $b$ white balls, alike except for colour. They are drawn
one by one, at random, without replacement, until the bag is empty. Find the
probability that the $k$-th ball drawn is yellow ($1 \le k \le a + b$).
== See the draw as an arrangement ==
Number the balls (yellow $1, \dots, a$; white $1, \dots, b$). Drawing them all out is
lining the $a + b$ balls up in positions $1, 2, \dots, a + b$ at random:
$\#(\Omega) = (a+b)!$ equally likely orders.
== Count the orders with a yellow ball at position k ==
Choose which yellow ball sits in position $k$ ($a$ ways), then arrange the other
$a + b - 1$ balls in the other positions ($(a+b-1)!$ ways): $\#(A) = a\,(a+b-1)!$.
== Probability ==
$$P(A) = \frac{a\,(a+b-1)!}{(a+b)!} = \frac{a}{a+b}.$$
It doesn't depend on $k$: the $k$-th draw has the same chance as the first.
:::

::: theorem Drawing lots is fair | 抽签与顺序无关
When items are drawn one by one without replacement, the probability of a given result on
the $k$-th draw is the same for every $k$, and equals the probability on the first draw.
:::

So if 10 cinema tickets, 2 of them in the front row, are handed out by lot, everyone has
the same chance $2/10$ of a front-row seat, whatever their place in the queue (the
in-class question below). The early drawers *do* affect what the later ones face, but
averaged over what they might draw, the chances even out. Lesson 1.4 shows this again
with conditional probabilities.

## The ball-drawing game

A street stall offers this game. The bag holds 16 balls, 8 red and 8 white, alike
except for colour. You draw 8 without replacement, and the colour split decides the
prize (yuan; negative means you pay):

| Split (one colour : the other) | A 8:0 | B 7:1 | C 6:2 | D 5:3 | E 4:4 |
| --- | --- | --- | --- | --- | --- |
| Prize | 100 | 10 | 5 | 2 | −10 |

Four of the five cases pay you; only one costs you. Tempting?

::: example Unmasking the game
Find the probability of each split, and how the stall does over 1000 players.
== Sample space ==
Any 8 of the 16 balls, unordered: $\#(\Omega) = C_{16}^8 = 12870$.
== Splits with a majority ==
For A–D the majority colour may be red **or** white, hence the factor 2:
$P(A) = \dfrac{2}{C_{16}^8} \approx 0.000155$,
$P(B) = \dfrac{2C_8^7C_8^1}{C_{16}^8} = \dfrac{128}{12870} \approx 0.00995$,
$P(C) = \dfrac{2C_8^6C_8^2}{C_{16}^8} = \dfrac{1568}{12870} \approx 0.1218$,
$P(D) = \dfrac{2C_8^5C_8^3}{C_{16}^8} = \dfrac{6272}{12870} \approx 0.4873$.
== The even split ==
4 red and 4 white is one case only, no factor 2:
$P(E) = \dfrac{C_8^4C_8^4}{C_{16}^8} = \dfrac{4900}{12870} \approx 0.3807$.
Check: the five probabilities add up to $12870/12870 = 1$.
== 1000 players ==
Out of 1000 players, about $0.2, 10, 122, 487, 381$ land in A–E. The stall pays about
$100 \cdot 0 + 10 \cdot 10 + 5 \cdot 122 + 2 \cdot 487 = 1684$ yuan and collects
$10 \cdot 381 = 3810$: it gains about $2126$ yuan, a little over 2 yuan per player.
(Without rounding the counts, the average is $27136/12870 \approx 2.11$ yuan per
player, about 2108 yuan per 1000.)
:::

::: plot The game: how many red balls are among the 8 drawn
x: 0 .. 8
xlabel: red balls drawn
bars P(k) = comb(8, k) comb(8, 8 - k) / comb(16, 8)
:::

The big prize is almost impossible (about 2 in 10 000), the small ones are what you
usually get, and the one loss, 4:4, is the single most likely split — more than a third
of all games.

::: callout note Slips on the slide
The slide prints $P(A) \approx 0.000115$; the correct value is $2/12870 \approx
0.000155$ (two digits swapped). It also writes the factor 2 in $P(E)$; the correct
formula is $C_8^4C_8^4/C_{16}^8$, whose value $0.3807$ is the one printed. On the
1000-player slide the row labels are swapped: the first row is the prize, the second
the prize times the number of players.
:::

## Small-probability events

The 8:0 split is a **small-probability event**: possible, but very unlikely. How small
is "small"? There is no law of nature; it is a convention.

::: define Small-probability event | 小概率事件
An event whose probability is close to 0. By convention, $P(A) \le 0.05$ or, more
strictly, $P(A) \le 0.01$.
:::

Small-probability events can be disasters (the SARS epidemic of 2003, the Wenchuan
earthquake of 2008, the COVID-19 pandemic of 2020) or pleasant surprises (a lottery
jackpot, Liu Xiang's 12.88 s world record over 110 m hurdles in 2006). Either way they
come suddenly.

::: law The small-probability principle | 小概率原理（实际推断原理）
A small-probability event almost never happens in **one** trial, but in **many**
independent repeated trials it almost certainly happens at some point.
:::

This is the principle of practical inference: if something with probability 0.000155
happens to *you* on your one try, suspect the game, not your luck. And the stall,
running thousands of games, will pay the 100-yuan prize now and then — which keeps the
crowd coming. Ignoring small risks leads to accidents; fearing them too much stops you
doing anything. Lesson 1.5 shows *why* "many trials" turns small into certain.

::: callout exam What exams ask
Classical problems are fill-ins or short calculations: draws with and without
replacement, "exactly / at least $k$" of a colour, the box model (birthdays, letters
into mailboxes), and drawing-lots questions where the answer is the first-draw
probability. Write down $\Omega$, say whether order matters, and count $\#(\Omega)$ and
$\#(A)$ the same way.
:::

::: cards Classical probability
Classical model (古典概型) :: Finitely many sample points, all equally likely; $P(A) = \#(A)/\#(\Omega)$.
Addition principle :: Alternative ways: add the counts, $n_1 + \cdots + n_m$.
Multiplication principle :: Successive steps: multiply the counts, $n_1 \times \cdots \times n_m$.
Permutations $A_n^k$ :: $n(n-1)\cdots(n-k+1) = n!/(n-k)!$: $k$ of $n$ in order.
Combinations $C_n^k = \binom nk$ :: $n!/(k!(n-k)!)$: $k$ of $n$, order ignored.
$k$ picks from $n$ with replacement, in order :: $n^k$
Hypergeometric pattern :: $N$ balls, $M$ red, draw $n$ without replacement: $P(k \text{ red}) = \binom Mk\binom{N-M}{n-k}/\binom Nn$.
Box model: $n$ balls, $M$ boxes, some $n$ boxes one ball each :: $A_M^n/M^n$
Birthday problem: $P$(some two of $n$ share a birthday) :: $1 - A_{365}^n/365^n$; above $1/2$ from $n = 23$.
Drawing lots: $a$ yellow, $b$ white, $P$(the $k$-th draw is yellow) :: $a/(a+b)$, for every $k$.
Small-probability event (小概率事件) :: $P(A) \le 0.05$ (or $0.01$) by convention.
Small-probability principle (实际推断原理) :: Almost never happens in one trial; almost surely happens in many independent trials.
:::

::: quiz Check yourself
? Ten cinema tickets, two of them in the front row, are handed out to 10 students by drawing lots. Then:
- [ ] whoever draws first is more likely to get a front-row seat
- [ ] whoever draws later is more likely to get one
- [x] each student's chance doesn't depend on the order of drawing
- [ ] the result depends heavily on the order of drawing
> Drawing lots is fair: like the $k$-th ball, each student's chance is $2/10$ whatever their place (in-class question, answer C).

? A bag holds $a$ white and $b$ black balls. One is drawn at random. The probability it is white is:
- [ ] $\dfrac12$
- [ ] $\dfrac1{a+b}$
- [x] $\dfrac{a}{a+b}$
- [ ] $\dfrac{b}{a+b}$
> $a$ favourable balls out of $a + b$ equally likely ones (in-class question, answer C).

? From a box of 6 red and 4 white balls, 3 are drawn **without** replacement. The probability of exactly 2 red ones?
answer: C(6,2) C(4,1) / C(10,3)
> $\binom62\binom41/\binom{10}3 = 15 \cdot 4/120 = 1/2$.

? The same box, but each ball is put back before the next draw. The probability of exactly 2 red in 3 draws?
answer: 0.432
> $\#(\Omega) = 10^3$; the white draw can be any of the 3: $3 \cdot 6^2 \cdot 4/1000 = 0.432$.

? Five cards are dealt from a 52-card pack. The probability of exactly two aces?
answer: C(4,2) C(48,3) / C(52,5)
> $\binom42 = 6$ ways to pick the aces, $\binom{48}3 = 17296$ for the other three cards, out of $\binom{52}5 = 2598960$ hands: $\approx 0.0399$.

? Three balls go at random into 4 boxes. The probability that boxes 1, 2 and 3 get one ball each?
answer: 3!/4^3
> Specified boxes: $n!/M^n = 6/64 = 3/32 \approx 0.094$.

? In a group of 23 people (365 equally likely birthdays), the probability that at least two share a birthday?
answer: 1 - comb(365, 23) 23! / 365^23
> $1 - A_{365}^{23}/365^{23} \approx 1 - 0.4927 = 0.5073$: just over a half.

? Four people: the probability that at least two of them were born in the same month (12 equally likely months)?
answer: 1 - 12*11*10*9/12^4
> $1 - A_{12}^4/12^4 = 1 - 11880/20736 \approx 0.4271$.

? In the ball-drawing game (8 of 16 balls, 8 red, 8 white), the probability of a 4:4 split, the case where you pay?
answer: C(8,4)^2 / C(16,8)
> One case only, no factor 2: $70 \cdot 70/12870 = 4900/12870 \approx 0.3807$.

? You can travel by one of 2 trains or one of 3 ships. How many ways can you go?
answer: 5
> Alternatives add (addition principle): $2 + 3 = 5$.

? The small-probability principle says a small-probability event:
- [x] almost never happens in one trial, but almost surely happens in many independent trials
- [ ] never happens
- [ ] happens about once in every 20 trials, whatever its probability
> "Small" is $P \le 0.05$ or $0.01$ by convention. In one try it practically doesn't happen; repeat the trial often enough and it practically must.
:::

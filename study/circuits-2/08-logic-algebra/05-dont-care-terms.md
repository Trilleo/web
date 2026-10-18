---
title: Don't-care terms
zh: 具有无关项的逻辑函数化简
summary: Input combinations that can never occur or whose output doesn't matter, how to write them (×, Σd, constraint equations), and how using them in a Karnaugh map gives much simpler results.
source: 第3章 逻辑代数基础 3.5.3, 2026-10-13
---

So far every row of a truth table had a definite output. Real problems are often less
strict: some input combinations can never happen (two switches that are mechanically
interlocked, a code that only uses 10 of its 16 patterns), and for those the output may
be whatever we like. Choosing those outputs cleverly can shrink a circuit dramatically,
sometimes to a single wire. This lesson shows how to mark such rows and use them in a
Karnaugh map.

## What a don't-care is

**Intuition.** A lift's floor buttons are read by a circuit. If the hardware makes it
impossible to press two buttons at once, the circuit's response to "two buttons pressed"
is never tested. We may as well choose that response to make the circuit simplest.

::: define Don't-care term | 无关项
A minterm whose function value doesn't matter, either because that input combination
can never occur, or because the output for it is never used. It is marked × (or X, or
$d$) in truth tables and Karnaugh maps, and may be taken as 0 or as 1, whichever gives
the simpler result.
:::

::: define Constraint | 约束条件
A condition the inputs always satisfy, written as "the sum of the don't-care minterms is
0": for example $AB + BC + AC = 0$ means no two of $A, B, C$ are ever 1 together. The
don't-care minterms of a constrained function are also called constraint terms
(约束项).
:::

A function with don't-cares is written with its 1s and its ×s listed separately:

$$Y = \sum m(\ldots) + \sum d(\ldots)$$

For example $F(A,B,C,D) = \sum m(3,6,8,9,11,12) + \sum d(0,1,2,13,14,15)$: the
function is 1 at the listed $m$, × at the listed $d$, and 0 everywhere else. The
$\sum d(\ldots)$ must contain *all* the function's don't-cares.

::: callout note A missing slide
Slide 10-046, which presumably introduced don't-care terms, was not shown in class; the
definitions above are the standard ones the later examples use.
:::

## Using don't-cares in a map

The rule is simple: when grouping, **treat each × as a 1 if it lets a group grow, and
as a 0 otherwise**. Concretely:

::: law Grouping with don't-cares | 利用无关项化简
A group may include × cells as well as 1s (and still must not include any 0). Include a
× only when it makes a group larger or saves a group; never draw a group to cover only
×s, and never worry about leaving a × uncovered. A × may be used by several groups.
:::

::: callout pitfall × cells don't need covering
Only the 1s must all be covered. A × left outside every group simply means "we chose 0
there", which is allowed. A group made only of ×s adds a useless term.
:::

The block below enforces exactly these rules: each group may cover 1s and ×s, must
cover at least one 1, and all the 1s must be covered.

## Example 1: monitoring a motor

::: example Which way is the motor running? (例1)
Three switches $A$, $B$, $C$ make a motor $F$ run forward, run in reverse, and stop.
Exactly one switch is closed at any time. With 1 for "closed" and 1 for "the motor is
working", write the simplest expression for the monitor output $F$.
== The truth table ==
Only the rows with exactly one switch closed can occur: $001$ (stop) → $F = 0$; $010$
(reverse) → $F = 1$; $100$ (forward) → $F = 1$. Every other row ($000$, $011$, $101$,
$110$, $111$) is impossible: ×.
So $F = \sum m(2, 4) + \sum d(0, 3, 5, 6, 7)$.
== Without the don't-cares ==
$m_2 = 010$ and $m_4 = 100$ are not adjacent, so each is a group on its own:
$F = \overline{A}B\overline{C} + A\overline{B}\,\overline{C}$.
== With the don't-cares ==
Columns $BC = 00$ and $BC = 10$ are adjacent across the edge. Taking $m_0$ and $m_6$
(both ×) as 1 makes a group of four, $m_0, m_2, m_4, m_6$, in which only $C = 0$ stays
the same: $F = \overline{C}$.
== Meaning ==
"The motor is working unless the stop switch is closed" — obvious once said, and a
single inverter instead of two 3-input ANDs and an OR.
:::

::: kmap F
vars: A B C
ones: 2 4
dont-care: 0 3 5 6 7
group: A' B C'
group: A B' C'
:::

::: kmap F
vars: A B C
ones: 2 4
dont-care: 0 3 5 6 7
group: C'
:::

## Example 2: three people, one pen

::: example Is anyone writing? (例2)
Three people $A$, $B$, $C$ share one pen; each can write. $F = 1$ means someone is
writing. Write $F$ as simply as possible.
== The truth table ==
With one pen at most one person writes at a time, so any row with two or more 1s can't
occur: ×. Ordering the variables $C, B, A$ as on the slide: $001$, $010$, $100$ give
$F = 1$; $000$ gives $F = 0$; the other four rows are ×.
$F(C, B, A) = \sum m(1, 2, 4) + \sum d(3, 5, 6, 7)$.
== The constraint ==
"At most one writes" is $AB + BC + AC = 0$.
== Group ==
Use the ×s freely, and reuse them: the four cells with $A = 1$ form $A$; the four with
$B = 1$ form $B$; the row with $C = 1$ forms $C$. The × at $m_7$ is in all three groups.
$$F = A + B + C$$
:::

::: kmap F
vars: C B A
ones: 1 2 4
dont-care: 3 5 6 7
group: A
group: B
group: C
:::

::: callout tip Don't-cares can be reused
As the slide notes, a don't-care can be used by as many groups as you like, just like a 1:
reusing $m_3$, $m_5$, $m_6$, $m_7$ is what makes each group a four.
:::

## Example 3: is a BCD digit even?

::: example An even-digit detector (例3)
The inputs $ABCD$ carry one decimal digit in 8421 BCD, so only 0000 to 1001 occur.
$Y = 1$ for an even digit, 0 for an odd one. Simplify $Y$.
== The truth table ==
Even digits 0, 2, 4, 6, 8 → $Y = 1$; odd digits 1, 3, 5, 7, 9 → $Y = 0$; the codes
1010 to 1111 never occur → ×.
$Y = \sum m(0, 2, 4, 6, 8) + \sum d(10, 11, 12, 13, 14, 15)$, which can also be written
with the constraint $\sum d(10, 11, 12, 13, 14, 15) = 0$.
== Group ==
Columns $CD = 00$ and $CD = 10$ wrap around into a block of eight: $m_0, m_4, m_{12},
m_8, m_2, m_6, m_{14}, m_{10}$, with $m_{12}$, $m_{14}$, $m_{10}$ taken as 1. Only
$D = 0$ is common: $Y = \overline{D}$.
== Check the meaning ==
A binary number is even exactly when its last bit is 0. Without the don't-cares the best
we could do is $\overline{A}\,\overline{D} + \overline{B}\,\overline{C}\,\overline{D}$.
:::

::: kmap Y
vars: A B C D
ones: 0 2 4 6 8
dont-care: 10 11 12 13 14 15
group: D'
:::

## Example 4: constraints written as an equation

::: example Simplifying with a constraint equation (例4)
Simplify $Y = \overline{A}\,\overline{B}\,\overline{C}D + \overline{A}BCD + A\overline{B}\,\overline{C}\,\overline{D}$,
given the constraint
$\overline{A}\,\overline{B}CD + \overline{A}B\overline{C}D + AB\overline{C}\,\overline{D} + A\overline{B}\,\overline{C}D + ABCD + ABC\overline{D} + A\overline{B}C\overline{D} = 0$.
== Number everything ==
The terms of $Y$: $0001 = m_1$, $0111 = m_7$, $1000 = m_8$.
The constraint terms: $0011 = 3$, $0101 = 5$, $1100 = 12$, $1001 = 9$, $1111 = 15$,
$1110 = 14$, $1010 = 10$. So $\sum d(3, 5, 9, 10, 12, 14, 15) = 0$.
== Group ==
$m_1$ and $m_7$ with $m_3$, $m_5$ (×) make the square rows 00–01, columns 01–11:
$\overline{A}D$. $m_8$ with $m_{10}$, $m_{12}$, $m_{14}$ (×) makes the wrapped block in
rows 11–10, columns 00 and 10: $A\overline{D}$.
$$Y = \overline{A}D + A\overline{D} \;(= A \oplus D)$$
:::

::: kmap Y
vars: A B C D
ones: 1 7 8
dont-care: 3 5 9 10 12 14 15
group: A' D
group: A D'
:::

The × at $m_9$ and $m_{15}$ were not needed and are left as 0. Without any don't-cares,
the three 1s are not adjacent at all and $Y$ would keep all three 4-variable terms.

## Example 5: a full Σm + Σd problem

::: example Simplify $F = \sum m(3,6,8,9,11,12) + \sum d(0,1,2,13,14,15)$ (例5)
Find the minimal sum of products.
== Lone 1s first ==
$m_6$ (0110) has neighbours $m_2$ (×), $m_4$ (0), $m_7$ (0), $m_{14}$ (×); no group of
four contains it without a 0. Pair it with $m_{14}$: $BC\overline{D}$.
== Big groups for the rest ==
$m_8, m_9, m_{12}, m_{13}$ (rows 11–10, columns 00–01, using × at $m_{13}$):
$A\overline{C}$.
$m_1, m_3, m_9, m_{11}$ (rows 00 and 10, which wrap, columns 01–11, using × at $m_1$):
$\overline{B}D$. This covers $m_3$ and $m_{11}$.
== Result ==
$F = A\overline{C} + \overline{B}D + BC\overline{D}$.
:::

::: kmap F
vars: A B C D
ones: 3 6 8 9 11 12
dont-care: 0 1 2 13 14 15
group: B' D
group: A C'
group: B C D'
:::

::: callout note Another answer of the same size
$m_6$ could pair with $m_2$ instead ($\overline{A}C\overline{D}$), giving
$F = A\overline{C} + \overline{B}D + \overline{A}C\overline{D}$, which is just as
minimal. The slide's answer uses $BC\overline{D}$.
:::

## Summary of simplification

The two methods complement each other:

- **Algebraic** simplification uses the laws, theorems and rules. It works for any
  function, however many variables, but needs fluency with the formulas and some
  technique, and it is hard to be sure the result is minimal.
- **Karnaugh-map** simplification is simple, visual and easy to learn, but with more
  than four or five variables the map becomes too complicated to use.

Whenever a problem has don't-cares, using them can make the result much simpler.

For the whole chapter, you should be able to: use the basic (AND, OR, NOT) and common
(NAND, NOR, AND-OR-INVERT, XOR, XNOR) operations; move between the ways of describing a
function (truth table, Karnaugh map, expression, logic diagram, waveform); write minterms
and the standard sum-of-products form; and simplify by formulas, by map, and with
don't-cares.

::: callout key The one idea to remember
A × is a free choice: count it as 1 when it makes a group bigger, ignore it otherwise.
Only the 1s must be covered.
:::

::: callout exam For the exam
Expect a word problem to turn into a truth table with ×s (impossible combinations), or a
function given as $\sum m + \sum d$ or with a constraint equation, to simplify on a map.
Write the don't-cares down explicitly, and say which you used.
:::

::: cards Don't-care terms
Don't-care term (无关项) :: A minterm whose output doesn't matter (it can't occur, or isn't used); it may be taken as 0 or 1.
How are don't-cares marked? :: × (or X, or $d$) in tables and maps; $\sum d(\ldots)$ in expressions.
Constraint (约束条件) :: An equation the inputs always satisfy, written as "the sum of the don't-care terms $= 0$".
When do you include a × in a group? :: Only when it makes a group larger (or saves a group).
Must every × be covered? :: No. Only every 1 must be covered.
Can a group contain only ×s? :: No: it would add a useless term.
Even BCD digit detector, simplified :: $Y = \overline{D}$ (using $\sum d(10\ldots15)$)
One-pen problem: $F$ and its constraint :: $F = A + B + C$, with $AB + BC + AC = 0$.
Algebraic vs map simplification :: Algebra: any number of variables, needs skill. Map: simple and visual, impractical beyond 4–5 variables.
:::

::: quiz Check yourself
? In a Karnaugh map, which statement about × cells is true?
- [x] A × may be included in a group or left out, whichever gives the simpler result
- [ ] Every × must be covered by some group
- [ ] A × must be counted as 0
- [ ] A group may consist only of ×s
> Don't-cares are free choices. Only 1s must be covered, and a group of only ×s would add a needless term.

? Simplify $F(A,B,C) = \sum m(2, 4) + \sum d(0, 3, 5, 6, 7)$ to the fewest terms.
logic: C'
> Columns $BC = 00$ and $10$ wrap into a group $m_0, m_2, m_4, m_6$ ($m_0$, $m_6$ are ×) with only $C = 0$ in common: $F = \overline{C}$.

? Without using the don't-cares, how many product terms does that same $F$ need?
answer: 2
tolerance: 0
> $m_2$ and $m_4$ are not adjacent, so $F = \overline{A}B\overline{C} + A\overline{B}\,\overline{C}$: two terms.

? Simplify $Y(A,B,C,D) = \sum m(0, 2, 4, 6, 8) + \sum d(10, 11, 12, 13, 14, 15)$ to the fewest terms.
logic: D'
> Columns $CD = 00$ and $10$ (wrapping) make a group of eight with the ×s at $m_{10}$, $m_{12}$, $m_{14}$: only $D = 0$ is common.

? Simplify $Y(A,B,C,D) = \sum m(1, 7, 8) + \sum d(3, 5, 9, 10, 12, 14, 15)$ to the fewest terms.
logic: A' D + A D'
> $m_1, m_3, m_5, m_7$ → $\overline{A}D$; $m_8, m_{10}, m_{12}, m_{14}$ → $A\overline{D}$. So $Y = A \oplus D$.

? Which is a minimal sum of products of $F(A,B,C,D) = \sum m(3, 6, 8, 9, 11, 12) + \sum d(0, 1, 2, 13, 14, 15)$?
- [x] $A\overline{C} + \overline{B}D + BC\overline{D}$
- [ ] $A\overline{C} + \overline{B}D$
- [ ] $A\overline{B}\,\overline{C} + \overline{A}\,\overline{B}CD + \overline{A}BC\overline{D} + AB\overline{C}\,\overline{D} + A\overline{B}D$
- [ ] $A + \overline{B}D + C\overline{D}$
> $A\overline{C}$ covers $m_8, m_9, m_{12}$ (with × $m_{13}$); $\overline{B}D$ covers $m_3, m_9, m_{11}$ (with × $m_1$); $m_6$ still needs a pair, $BC\overline{D}$ (with × $m_{14}$). Two terms leave $m_6$ uncovered; the five-term option covers every 1 but isn't minimal; $A$ would include the 0 at $m_{10}$, and $C\overline{D}$ the 0 at $m_{10}$ too. (Pairing $m_6$ with $m_2$ instead, $\overline{A}C\overline{D}$, is equally minimal.)

? Three people share one pen and $F = 1$ when someone is writing. What is the constraint on $A$, $B$, $C$?
- [x] $AB + BC + AC = 0$
- [ ] $A + B + C = 0$
- [ ] $ABC = 0$
- [ ] $A + B + C = 1$
> At most one person writes, so no two variables are 1 together: $AB = BC = AC = 0$, i.e. $AB + BC + AC = 0$. ($ABC = 0$ would still allow two writers.)

? An 8421 BCD input can take how many patterns that never occur (don't-cares)?
answer: 6
tolerance: 0
> Four bits give 16 patterns; BCD uses 0000–1001 (10 of them), so 1010–1111, six patterns, are don't-cares.
:::

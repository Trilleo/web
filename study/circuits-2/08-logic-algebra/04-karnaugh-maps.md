---
title: Minterms and Karnaugh maps
zh: 最小项与卡诺图化简
summary: Minterms and maxterms, the standard sum-of-minterms and product-of-maxterms forms, Karnaugh maps for two to four variables, and simplifying with them, including non-unique answers, redundant groups and grouping the 0s for the complement.
source: 第3章 逻辑代数基础 3.5.1–3.5.3, 2026-10-08 → 10-13
---

Algebraic simplification depends on spotting the right formula, and it never tells you
when you're done. The Karnaugh map turns the same idea, the combining law
$AB + A\overline{B} = A$, into a picture: the function's truth table drawn as a grid in
which terms that can combine sit next to each other. Simplifying becomes drawing the
biggest possible rectangles around the 1s. For up to four variables it is fast and
reliable, and it is the method exams use most.

## Minterms

**Intuition.** For three variables there are 8 input combinations. For each one, we can
write a product that is 1 for *that combination only*: for $A = 0$, $B = 1$, $C = 1$
it is $\overline{A}BC$ (complement each variable that is 0). These "one-row" products
are the building blocks of every function.

::: define Minterm | 最小项
In a function of $n$ variables, a minterm is a product of all $n$ variables in which each
appears exactly once, either plain or complemented. (Also called a standard product
term, 标准积项.) $n$ variables have $2^n$ minterms.
:::

A minterm is numbered by reading its variables as a binary number, with a plain variable
as 1 and a complemented one as 0: $\overline{A}BC \to 011 \to 3$, so it is $m_3$. Three
variables have 8 minterms, $m_0$ to $m_7$; four have 16, $m_0$ to $m_{15}$.

| Minterm                                     | A B C (makes it 1) | Decimal | Name  |
| ------------------------------------------- | ------------------ | ------- | ----- |
| $\overline{A}\,\overline{B}\,\overline{C}$  | 0 0 0              | 0       | $m_0$ |
| $\overline{A}\,\overline{B}C$               | 0 0 1              | 1       | $m_1$ |
| $\overline{A}B\overline{C}$                 | 0 1 0              | 2       | $m_2$ |
| $\overline{A}BC$                            | 0 1 1              | 3       | $m_3$ |
| $A\overline{B}\,\overline{C}$               | 1 0 0              | 4       | $m_4$ |
| $A\overline{B}C$                            | 1 0 1              | 5       | $m_5$ |
| $AB\overline{C}$                            | 1 1 0              | 6       | $m_6$ |
| $ABC$                                       | 1 1 1              | 7       | $m_7$ |

::: callout pitfall Every variable, exactly once
$A\overline{B}$ is not a minterm of a function of $A, B, C$: it is missing $C$ (it is
$m_4 + m_5$). $AB\overline{B}C$ isn't one either ($B$ appears twice, and it is 0 anyway).
:::

### Adjacent minterms

::: define Logically adjacent minterms | 逻辑相邻项
Two minterms are adjacent when they differ in exactly one variable (plain in one,
complemented in the other) and agree in all the others.
:::

Adjacent minterms combine, dropping the variable they differ in:
$\overline{A}B\overline{C} + AB\overline{C} = B\overline{C}(\overline{A} + A) = B\overline{C}$.
$\overline{A}\,\overline{B}C$ and $\overline{A}BC$ are adjacent (only $B$ differs);
$\overline{A}\,\overline{B}C$ and $\overline{A}B\overline{C}$ are not (both $B$ and $C$
differ).

### Properties of minterms

Write all eight minterms of $A, B, C$ as columns of a truth table and you get a diagonal
of 1s: each minterm is 1 in exactly one row. Four properties follow.

::: law Properties of minterms | 最小项的性质
1. For any minterm, exactly one combination of the variables makes it 1.
2. The product of any two different minterms is 0.
3. The sum of all $2^n$ minterms is 1; the sum of some minterms equals the complement of
   the sum of all the others.
4. Two adjacent minterms can be combined into one product, eliminating the one variable
   in which they differ.
:::

For example $m_3 m_6 = \overline{A}BC \cdot AB\overline{C} = 0$ (it contains $A\overline{A}$),
and $m_0 + m_2 + m_4 = \overline{m_1 + m_3 + m_5 + m_6 + m_7}$.

## Standard forms

### The sum of minterms

If you have the truth table, write one minterm for each row where the function is 1, and
add them. This **sum of minterms** is unique for each function.

::: define Standard sum-of-products form | 标准与或表达式
A logic function written as a sum of minterms, also called the minterm expression
(最小项表达式) and written compactly as $Y = \sum m(\ldots)$ with the minterm numbers.
Every function has exactly one.
:::

::: example From a truth table to minterms
A function is 1 in the rows $ABC = 001, 010, 011, 101$ and 0 elsewhere. Write its
standard sum-of-products form.
== Name the rows ==
001 → $m_1 = \overline{A}\,\overline{B}C$; 010 → $m_2 = \overline{A}B\overline{C}$; 011 →
$m_3 = \overline{A}BC$; 101 → $m_5 = A\overline{B}C$.
== Add them ==
$Y = m_1 + m_2 + m_3 + m_5 = \sum m(1, 2, 3, 5) = \overline{A}\,\overline{B}C + \overline{A}B\overline{C} + \overline{A}BC + A\overline{B}C$.
:::

From an expression that isn't in minterms, *pad* each term with the missing variables
by multiplying by $(X + \overline{X}) = 1$ (配项).

::: example Padding to minterms
Expand $Y = A\overline{B} + BC$ (three variables) into minterms.
== Pad each term ==
$A\overline{B}$ lacks $C$; $BC$ lacks $A$:
$Y = A\overline{B}(C + \overline{C}) + (A + \overline{A})BC$.
== Multiply out ==
$= A\overline{B}C + A\overline{B}\,\overline{C} + ABC + \overline{A}BC$.
== Number them ==
$101 = m_5$, $100 = m_4$, $111 = m_7$, $011 = m_3$: $Y = \sum m(3, 4, 5, 7)$.
:::

::: callout note The padding example on the slide
The slide stops after the padding step $A\overline{B}(C + \overline{C}) + (A + \overline{A})BC$.
It is a separate example from the truth table beside it: $A\overline{B} + BC$ is
$\sum m(3, 4, 5, 7)$, not the table's $\sum m(1, 2, 3, 5)$.
:::

### The product of maxterms

::: define Maxterm | 最大项
In a function of $n$ variables, a maxterm $M_i$ is a sum of all $n$ variables, each
appearing once, plain or complemented, that is 0 for exactly one combination. It is the
complement of the minterm with the same number: $M_i = \overline{m_i}$.
:::

By De Morgan, $M_0 = \overline{\overline{A}\,\overline{B}\,\overline{C}} = A + B + C$,
$M_3 = \overline{\overline{A}BC} = A + \overline{B} + \overline{C}$, and so on: in $M_i$ a
variable is complemented where its bit in $i$ is **1** (the opposite of minterms).

::: formula Minterm and maxterm forms | 最小项与最大项表达式
$$Y = \sum m(\text{rows where } Y = 1) = \prod M(\text{rows where } Y = 0)$$
--
m_i | minterm $i$: the product that is 1 only in row $i$ | —
M_i | maxterm $i$, $M_i = \overline{m_i}$: the sum that is 0 only in row $i$ | —
:::

For the function above, $Y = m_1 + m_2 + m_3 + m_5$, so by property 3
$Y = \overline{m_0 + m_4 + m_6 + m_7} = \overline{m_0}\cdot\overline{m_4}\cdot\overline{m_6}\cdot\overline{m_7} = M_0 M_4 M_6 M_7 = \prod M(0, 4, 6, 7)$.
The maxterm numbers are exactly the minterm numbers that are missing.

## Karnaugh maps

::: define Karnaugh map | 卡诺图
A grid with one cell for each minterm of $n$ variables, arranged so that cells next to
each other on the grid are logically adjacent minterms.
:::

The trick is the order of the row and column labels: not 00, 01, 10, 11 but the
**Gray code** 00, 01, 11, 10, in which neighbours differ in one bit. Then moving one cell
in any direction changes exactly one variable. For two variables ($A$ down the side, $B$
across):

| A \ B | 0     | 1     |
| ----- | ----- | ----- |
| 0     | $m_0$ | $m_1$ |
| 1     | $m_2$ | $m_3$ |

For three ($A$ down, $BC$ across) and four ($AB$ down, $CD$ across):

| A \ BC | 00    | 01    | 11    | 10    |
| ------ | ----- | ----- | ----- | ----- |
| 0      | $m_0$ | $m_1$ | $m_3$ | $m_2$ |
| 1      | $m_4$ | $m_5$ | $m_7$ | $m_6$ |

| AB \ CD | 00       | 01       | 11       | 10       |
| ------- | -------- | -------- | -------- | -------- |
| 00      | $m_0$    | $m_1$    | $m_3$    | $m_2$    |
| 01      | $m_4$    | $m_5$    | $m_7$    | $m_6$    |
| 11      | $m_{12}$ | $m_{13}$ | $m_{15}$ | $m_{14}$ |
| 10      | $m_8$    | $m_9$    | $m_{11}$ | $m_{10}$ |

::: callout pitfall The map wraps around
Cells are adjacent up–down and left–right, **and** the two ends of every row and every
column are adjacent too ($m_0$ and $m_2$; $m_0$ and $m_8$; the four corners $m_0$,
$m_2$, $m_8$, $m_{10}$ of a 4-variable map). Think of the map as drawn on a doughnut. And
note the numbering is not in order: $m_3$ comes before $m_2$, and row 11 before row 10.
:::

### Putting a function on the map

**Method 1:** write the function as a sum of minterms and put a 1 in each of their cells,
0 in the rest. **Method 2** (faster): for each product term, fill all the cells where
that term is 1. A term that lacks $k$ variables covers $2^k$ cells.

::: example Filling a 3-variable map
Put $Y = A\overline{C} + \overline{A}C + B\overline{C} + \overline{B}C$ on a map.
== Method 1 ==
Pad each term: $Y = A(B + \overline{B})\overline{C} + \overline{A}(B + \overline{B})C + (A + \overline{A})B\overline{C} + (A + \overline{A})\overline{B}C = \sum m(1, 2, 3, 4, 5, 6)$.
== Method 2 ==
$A\overline{C}$: $A = 1$, $C = 0$ → $m_4$, $m_6$. $\overline{A}C$: → $m_1$, $m_3$.
$B\overline{C}$: → $m_2$, $m_6$. $\overline{B}C$: → $m_1$, $m_5$. Together: 1, 2, 3, 4, 5, 6
(cells filled twice are just 1).
:::

::: kmap Y
vars: A B C
ones: 1 2 3 4 5 6
:::

::: example Filling a 4-variable map (例1)
Put $Y = \overline{A}\,\overline{B}\,\overline{C}D + \overline{A}B\overline{D} + ACD + A\overline{B}$ on a map.
== Term by term ==
$\overline{A}\,\overline{B}\,\overline{C}D$ is a minterm: 0001 = $m_1$.
$\overline{A}B\overline{D}$ ($AB = 01$, $D = 0$): $m_4$, $m_6$.
$ACD$ ($A = 1$, $CD = 11$): $m_{11}$, $m_{15}$.
$A\overline{B}$ (row 10, the whole row): $m_8$, $m_9$, $m_{11}$, $m_{10}$.
== Result ==
$Y = \sum m(1, 4, 6, 8, 9, 10, 11, 15)$; $m_{11}$ is filled by two terms.
:::

::: kmap Y
vars: A B C D
ones: 1 4 6 8 9 10 11 15
:::

Reading a map backwards works the same way: each 1 is a minterm.

::: example From a map to an expression (例2)
A 3-variable map has 1s at $m_1$, $m_2$, $m_4$, $m_7$ (a checkerboard). Write $Y$.
== The minterms ==
$Y = A\overline{B}\,\overline{C} + \overline{A}\,\overline{B}C + ABC + \overline{A}B\overline{C}$.
== Group by $A$ ==
$= A(\overline{B}\,\overline{C} + BC) + \overline{A}(\overline{B}C + B\overline{C}) = A\,\overline{B \oplus C} + \overline{A}(B \oplus C)$.
== Recognise XOR ==
With $X = B \oplus C$: $A\overline{X} + \overline{A}X = A \oplus X$, so $Y = A \oplus B \oplus C$.
:::

::: kmap Y
vars: A B C
ones: 1 2 4 7
:::

No two 1s touch, so the map can't simplify this function at all: a checkerboard is the
signature of XOR.

## Simplifying with a map

Two adjacent 1s are two adjacent minterms, so they combine into one product with one
variable fewer. Four 1s in a rectangle combine into a product with two fewer, and so on.

::: law Combining minterms on a map | 合并最小项的原则
$2^k$ adjacent minterms forming a rectangle (wrapping around the edges allowed) combine
into a single product with $k$ variables eliminated: 2 cells drop 1 variable, 4 cells
drop 2, 8 cells drop 3. The product keeps only the variables that are the same in every
cell of the group.
:::

To read a group, look along its rows and columns: a variable that is 1 throughout appears
plain, one that is 0 throughout appears complemented, and one that changes is dropped.

::: callout key Grouping rules (画圈的原则)
1. Every 1 must be in at least one group; a 1 that can't join any other is a group of one.
2. Groups are rectangles of $2^k$ cells: 1, 2, 4, 8, 16.
3. Make groups as **large** as possible (fewer variables per term).
4. Use as **few** groups as possible (fewer terms). Cells may be in several groups.
5. Every group must contain at least one 1 that no other group covers; otherwise it is
   redundant (无效的圈).
:::

The steps: draw the map; draw the groups; write one product per group and add them.

### Groups of 2, 4 and 8

::: kmap Y
vars: A B C
ones: 0 2 5 7
group: A' C'
group: A C
:::

On the left, $m_0$ and $m_2$ are adjacent across the edge: $A = 0$ and $C = 0$ in both,
$B$ changes, so the group is $\overline{A}\,\overline{C}$. Pairs in a 4-variable map drop
one of four variables:

::: kmap Y
vars: A B C D
ones: 1 6 9 14
group: B' C' D
group: B C D'
:::

Four cells drop two variables. A whole row, a 2×2 square, the four corners, or a
"square" split across the edges all count:

::: kmap Y
vars: A B C
ones: 0 1 2 3 5 7
group: A'
group: C
:::

Here $m_1$ and $m_3$ are in both groups: reusing cells is fine, and it is what makes
$C$ a group of four rather than a group of two.

::: kmap Y
vars: A B C D
ones: 0 2 5 7 8 10 13 15
group: B' D'
group: B D
:::

::: kmap Y
vars: A B C D
ones: 1 3 4 6 9 11 12 14
group: B' D
group: B D'
:::

Eight cells drop three variables, leaving a single letter:

::: kmap Y
vars: A B C D
ones: 4 5 6 7 12 13 14 15
group: B
:::

::: kmap Y
vars: A B C D
ones: 0 2 4 6 8 10 12 14
group: D'
:::

### The answer isn't always unique

::: example Two minimal answers
Simplify $Y = A\overline{C} + \overline{A}C + B\overline{C} + \overline{B}C$, which is
$\sum m(1, 2, 3, 4, 5, 6)$ (the map above).
== Look at the map ==
Six 1s in a ring: no group of four fits (each 2×2 block contains $m_0$ or $m_7$, which
are 0). So we need pairs, and at least three of them to cover six cells.
== One choice ==
$m_4 m_5 \to A\overline{B}$, $m_1 m_3 \to \overline{A}C$, $m_2 m_6 \to B\overline{C}$:
$Y = A\overline{B} + \overline{A}C + B\overline{C}$.
== Another choice ==
$m_1 m_5 \to \overline{B}C$, $m_3 m_2 \to \overline{A}B$, $m_4 m_6 \to A\overline{C}$
(across the edge): $Y = A\overline{C} + \overline{B}C + \overline{A}B$.
== Conclusion ==
Both have three 2-variable terms: both are minimal. A function's minimal form need not
be unique.
:::

::: kmap Y
vars: A B C
ones: 1 2 3 4 5 6
group: A B'
group: A' C
group: B C'
:::

::: kmap Y
vars: A B C
ones: 1 2 3 4 5 6
group: A C'
group: B' C
group: A' B
:::

### Watch out for redundant groups

::: example A tempting group that isn't needed
Simplify the function with 1s at $m_1, m_5, m_6, m_7, m_{11}, m_{12}, m_{13}, m_{15}$.
== The eye goes to the middle ==
The centre square $m_5, m_7, m_{13}, m_{15}$ is the biggest group ($BD$). But first look
for 1s that can only be grouped one way.
== Groups forced by lone 1s ==
$m_1$ can only pair with $m_5$: $\overline{A}\,\overline{C}D$. $m_6$ only with $m_7$:
$\overline{A}BC$. $m_{12}$ only with $m_{13}$: $AB\overline{C}$. $m_{11}$ only with
$m_{15}$: $ACD$.
== Check the big square ==
These four pairs already cover $m_5$, $m_7$, $m_{13}$ and $m_{15}$. The square $BD$ has no
1 of its own, so it is redundant: leave it out.
$$Y = \overline{A}\,\overline{C}D + \overline{A}BC + AB\overline{C} + ACD$$
:::

::: kmap Y
vars: A B C D
ones: 1 5 6 7 11 12 13 15
group: A' C' D
group: A' B C
group: A B C'
group: A C D
:::

::: callout pitfall Start with the 1s that have only one way to go
Drawing the biggest group first can leave you with a redundant group, as here. Start
with 1s that can be grouped in only one way, then cover what's left with as few, as
large groups as possible, and finally check every group has a 1 of its own.
:::

### Grouping the 0s gives the complement

The 0s of $Y$ are the 1s of $\overline{Y}$. So grouping the **0s** by the same rules gives
the minimal sum of products of the complement $\overline{Y}$.

::: example Groups of 1s, and of 0s (in-class questions)
A 4-variable map has 0s only at $m_1, m_3, m_5, m_7$ and 1s everywhere else. Find the
minimal sum of products of $Y$ and of $\overline{Y}$.
== Group the 1s ==
Rows 11 and 10 are all 1s: 8 cells with $A = 1$ → $A$. Columns 00 and 10 are all 1s
(adjacent across the edge): 8 cells with $D = 0$ → $\overline{D}$. Together they cover
every 1: $Y = A + \overline{D}$.
== Group the 0s ==
The four 0s form a square in rows 00–01, columns 01–11: $A = 0$, $D = 1$ throughout →
$\overline{A}D$. So $\overline{Y} = \overline{A}D$.
== Check ==
De Morgan: $\overline{A + \overline{D}} = \overline{A}D$. ✓
:::

::: kmap Y
vars: A B C D
ones: 0 2 4 6 8 9 10 11 12 13 14 15
group: A
group: D'
:::

::: kmap \overline{Y}
vars: A B C D
ones: 1 3 5 7
group: A' D
:::

::: callout note The in-class question's options
On the slide the options for $\overline{Y}$ are all written "Y = …" although the question
asks for $\overline{Y}$; the answer is option D, $\overline{A}D$. For $Y$ the answer is
option C, $A + \overline{D}$ (the answers were not marked; both follow from the groups
drawn on the slides).
:::

::: callout exam For the exam
The in-class questions show the pattern: list minterms, use their properties, read a
map's minimal sum of products, and group the 0s for $\overline{Y}$. Always check you
haven't drawn a redundant group.
:::

::: cards Minterms and Karnaugh maps
Minterm (最小项) :: A product of all $n$ variables, each once (plain or complemented); it is 1 for exactly one input combination.
How many minterms do $n$ variables have? :: $2^n$
Number of $A\overline{B}C$ :: $101_2 = 5$, so $m_5$.
Product of two different minterms :: $0$
Sum of all minterms :: $1$
Logically adjacent minterms :: Differ in exactly one variable; they combine, dropping it.
Maxterm $M_i$ in terms of $m_i$ :: $M_i = \overline{m_i}$ (a sum, 0 only in row $i$)
$Y = \sum m(1,2,3,5)$ for three variables as maxterms :: $\prod M(0,4,6,7)$
Order of row/column labels in a K-map :: Gray code: 00, 01, 11, 10.
Which cells of a 4-variable map are adjacent across the edges? :: The ends of each row and column, and the four corners.
A group of 8 cells eliminates how many variables? :: 3 ($2^3$ cells)
Redundant group (无效的圈) :: A group with no 1 of its own: every cell is covered by other groups. Leave it out.
What does grouping the 0s of a map give? :: The minimal sum of products of $\overline{Y}$.
:::

::: quiz Check yourself
? Which of these are minterms of the 3-variable function $Y(A, B, C)$? (in-class question)
- [ ] $A\overline{B}$
- [x] $\overline{A}BC$
- [x] $m_7$
- [ ] $A\overline{C}$
> A minterm must contain all three variables once each. $\overline{A}BC$ ($m_3$) and $m_7 = ABC$ do; $A\overline{B}$ lacks $C$, $A\overline{C}$ lacks $B$.

? Which statements about the minterms of $A, B, C$ are correct? (in-class question)
- [x] $m_0 + m_2 + m_4 = \overline{m_1 + m_3 + m_5 + m_6 + m_7}$
- [x] $m_3 m_6 = 0$
- [ ] $m_0 + m_1 + \cdots + m_7 = 0$
- [x] $m_4 m_7 = 0$
> Any two different minterms multiply to 0 (property 2). Some minterms add up to the complement of the rest (property 3). But the sum of all minterms is 1, not 0.

? What is the number $i$ of the minterm $A\overline{B}CD$ (variables $A, B, C, D$)?
answer: 11
tolerance: 0
> Plain = 1, complemented = 0: $1011_2 = 8 + 2 + 1 = 11$.

? A 3-variable function is $Y = \sum m(0, 2, 3, 6)$. Which is its product of maxterms?
- [x] $\prod M(1, 4, 5, 7)$
- [ ] $\prod M(0, 2, 3, 6)$
- [ ] $\prod M(1, 3, 5, 7)$
> The maxterms are the rows where $Y = 0$: everything not in the minterm list, 1, 4, 5 and 7.

? Simplify $Y = \sum m(0, 1, 2, 3, 5, 7)$ (variables $A, B, C$) to the fewest terms.
logic: A' + C
> Row $A = 0$ is all 1s → $\overline{A}$; the 2×2 block $m_1, m_3, m_5, m_7$ → $C$ (reusing $m_1$ and $m_3$).

? Simplify $Y(A,B,C,D) = \sum m(0, 2, 8, 10)$ to the fewest terms.
logic: B' D'
> The four corners are adjacent through the edges. Throughout them $B = 0$ and $D = 0$, while $A$ and $C$ change: $\overline{B}\,\overline{D}$.

? A 4-variable map has 0s only at $m_1, m_3, m_5, m_7$. What is the minimal sum of products of $Y$? (in-class question)
- [ ] $Y = A + \overline{C}\,\overline{D} + C\overline{D}$
- [ ] $Y = A\overline{C} + AC + \overline{C}\,\overline{D} + C\overline{D}$
- [x] $Y = A + \overline{D}$
- [ ] $Y = A + \overline{C}$
> Rows 11 and 10 give $A$ (8 cells); columns 00 and 10, adjacent across the edge, give $\overline{D}$ (8 cells). Options A and B are equal to it but not minimal.

? For the same map, group the 0s: what is the minimal sum of products of $\overline{Y}$? (in-class question)
logic: A' D
> The 0s $m_1, m_3, m_5, m_7$ form a square with $A = 0$ and $D = 1$: $\overline{Y} = \overline{A}D$ (option D on the slide). Check: $\overline{A + \overline{D}} = \overline{A}D$.

? In the redundant-group example, why is the square $BD$ left out?
- [x] Every cell in it is already covered by other groups that are needed anyway
- [ ] Groups of four aren't allowed in 4-variable maps
- [ ] It contains a 0
> The four pairs are forced (each covers a 1 that has no other partner), and together they cover $m_5, m_7, m_{13}, m_{15}$. $BD$ has no 1 of its own, so adding it only adds a term.
:::

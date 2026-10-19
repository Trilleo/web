---
title: Ordered pairs and relations
zh: 有序对与二元关系
summary: Ordered pairs and when two are equal, Cartesian products and their properties, binary relations (from A to B and on A), how many there are, the empty, universal and identity relations, and three ways to show a relation — set, matrix and graph.
source: 2-1二元关系 (§2.1–2.2), 2026-09-03
---

Sets on their own only say *what* is there. Most interesting facts are about how things
are **connected**: one number is smaller than another, one person is the parent of
another, one web page links to another, one course must be taken before another. A
{{term relation | 关系}} is the mathematical name for such a connection, and this lesson
builds it from the ground up: first the ordered pair (two things in a fixed order), then
the Cartesian product (all possible pairs), and finally a relation as simply *a chosen set
of pairs*. Everything in the rest of Unit 2 — operations, properties, closures,
equivalences, orders — and the functions of Unit 3 are built on this one idea.

Relations are also the bridge from sets to pictures: a relation can be drawn as a graph
of dots and arrows, which is where graph theory (Units 4–5) begins. The course's map of
the chapter puts it this way: the *content* is relations (their properties, composition,
closures, matrices and graphs, partitions, partial orders); relations can be *visualised*
as graphs; and they *model* social networks, bioinformatics, data mining and machine
learning.

## Ordered pairs

In a set, order doesn't matter: $\{1, 2\} = \{2, 1\}$. But a point on the plane, a date
or a "who beat whom" result needs order: the point $(3, 5)$ is not the point $(5, 3)$.
So we need a new object that remembers which element comes first.

::: define Ordered pair | 有序对（序偶）
Two elements $x$ and $y$ (possibly equal) arranged in a fixed order form an
**ordered pair**, written $\langle x, y\rangle$. $x$ is its **first element** and $y$ its
**second element**.
:::

The angle brackets $\langle\ \rangle$ are the course's notation; many books write
$(x, y)$. Two properties capture what "order matters" means:

1. If $x \ne y$, then $\langle x, y\rangle \ne \langle y, x\rangle$.
2. $\langle x, y\rangle = \langle u, v\rangle$ **if and only if** $x = u$ and $y = v$.

The second property is the useful one: one equation between pairs is really **two**
equations between their elements.

::: example Solving an equation between pairs
Given $\langle x + 2, 4\rangle = \langle 5, 2x + y\rangle$, find $x$ and $y$.
== Compare element by element ==
Two ordered pairs are equal exactly when their first elements are equal and their
second elements are equal:
$$\begin{cases} x + 2 = 5, \\ 2x + y = 4. \end{cases}$$
== Solve ==
The first equation gives $x = 3$; then $6 + y = 4$, so $y = -2$.
:::

::: callout pitfall A pair is not a two-element set
$\{x, y\} = \{y, x\}$ always, and $\{x, x\} = \{x\}$ has only one element. But
$\langle x, y\rangle \ne \langle y, x\rangle$ when $x \ne y$, and $\langle x, x\rangle$ is a
perfectly good pair. Don't swap the brackets.
:::

## Cartesian products

Given two sets, we can form **every** pair whose first element comes from the first set
and whose second element comes from the second. Think of a restaurant menu: with starters
$A$ and main courses $B$, the set of all possible two-course meals is the Cartesian
product $A \times B$.

::: define Cartesian product | 笛卡儿积
For sets $A$ and $B$, the **Cartesian product** of $A$ and $B$ is the set of all ordered
pairs with first element in $A$ and second element in $B$:
$$A \times B = \{\langle x, y\rangle \mid x \in A \wedge y \in B\}.$$
:::

(Here $\wedge$ means "and", and $\{\,\cdot \mid \cdot\,\}$ reads "the set of … such
that …".)

::: example A product in both orders
Let $A = \{a, b\}$ and $B = \{0, 1, 2\}$. List $A \times B$ and $B \times A$.
== A × B ==
Pair each of $a$, $b$ with each of $0, 1, 2$:
$$A \times B = \{\langle a,0\rangle, \langle a,1\rangle, \langle a,2\rangle, \langle b,0\rangle, \langle b,1\rangle, \langle b,2\rangle\}.$$
== B × A ==
Now the numbers come first:
$$B \times A = \{\langle 0,a\rangle, \langle 0,b\rangle, \langle 1,a\rangle, \langle 1,b\rangle, \langle 2,a\rangle, \langle 2,b\rangle\}.$$
== Compare ==
Both have $2 \times 3 = 6$ elements, but they share **none**: $\langle a, 0\rangle$ is not
$\langle 0, a\rangle$. So $A \times B \ne B \times A$.
:::

Counting the pairs is the multiplication principle: $|A|$ choices for the first element,
then $|B|$ for the second.

::: formula Size of a Cartesian product | 笛卡儿积的元素个数
$$|A \times B| = |A| \cdot |B|$$
--
$\lvert A\rvert$ | number of elements of the finite set $A$ |
$\lvert A \times B\rvert$ | number of ordered pairs in the product |
:::

So if $|A| = n$ and $|B| = m$, then $|A \times B| = mn$.

### From pairs to n-tuples

An ordered pair is also called a 2-tuple ({{zh 二元组}}). The same idea gives
3-tuples $\langle x, y, z\rangle$, 4-tuples, and in general
{{term n-tuples | n元组}} $\langle x_1, x_2, \dots, x_n\rangle$: $n$ elements in a fixed
order, equal only when they agree position by position.

::: define Cartesian product of n sets | n个集合的笛卡儿积
For sets $A_1, A_2, \dots, A_n$,
$$A_1 \times A_2 \times \dots \times A_n = \{\langle x_1, x_2, \dots, x_n\rangle \mid x_i \in A_i,\ i = 1, \dots, n\}.$$
:::

### Properties of the Cartesian product

How does $\times$ behave compared with the operations of Lesson 1.2? Some laws carry over
and some don't.

::: theorem Properties of the Cartesian product (Proposition 2.1.1 in the textbook)
For any sets $A$, $B$, $C$, $D$:

1. $A \times \varnothing = \varnothing$ and $\varnothing \times A = \varnothing$.
2. $\times$ is **not commutative**: $A \times B \ne B \times A$ whenever $A \ne \varnothing$,
   $B \ne \varnothing$ and $A \ne B$. For example $\{a\} \times \{b\} = \{\langle a,b\rangle\}$
   but $\{b\} \times \{a\} = \{\langle b,a\rangle\}$.
3. $\times$ is **not associative**: $(A \times B) \times C \ne A \times (B \times C)$ when
   $A$, $B$, $C$ are all non-empty.
4. $\times$ **distributes** over $\cup$ and $\cap$, on both sides:
   $$\begin{gathered}
   A \times (B \cup C) = (A \times B) \cup (A \times C), \qquad (B \cup C) \times A = (B \times A) \cup (C \times A), \\
   A \times (B \cap C) = (A \times B) \cap (A \times C), \qquad (B \cap C) \times A = (B \times A) \cap (C \times A).
   \end{gathered}$$
5. If $A \subseteq C$ and $B \subseteq D$, then $A \times B \subseteq C \times D$.
:::

Why these hold, in words:

- **Empty set.** A pair needs an element from *both* sets; with nothing to pick from one
  of them, there are no pairs.
- **Not associative.** An element of $(A \times B) \times C$ looks like
  $\langle\langle a, b\rangle, c\rangle$ — a pair whose first element is itself a pair —
  while an element of $A \times (B \times C)$ looks like $\langle a, \langle b, c\rangle\rangle$.
  These are different objects, so the sets have no element in common.
- **Distributive.** "First element in $A$, second in $B$ *or* $C$" says the same as
  "(first in $A$ and second in $B$) or (first in $A$ and second in $C$)".

The last point is turned into a proof below. It is a **set equality**, so it is proved the
standard way from Lesson 1.2: show each side is a subset of the other.

::: example Proof that A × (B ∪ C) = (A × B) ∪ (A × C)
Prove the first distributive law.
== Left ⊆ right ==
Take any $\langle x, y\rangle \in A \times (B \cup C)$. Then $x \in A$ and $y \in B \cup C$,
so $x \in A, y \in B$ or $x \in A, y \in C$. That is, $\langle x, y\rangle \in A \times B$ or
$\langle x, y\rangle \in A \times C$, so $\langle x, y\rangle \in (A \times B) \cup (A \times C)$.
Hence $A \times (B \cup C) \subseteq (A \times B) \cup (A \times C)$.
== Right ⊆ left ==
Take any $\langle x, y\rangle \in (A \times B) \cup (A \times C)$. Then
$\langle x, y\rangle \in A \times B$ or $\langle x, y\rangle \in A \times C$, so $x \in A$ and
($y \in B$ or $y \in C$), i.e. $x \in A$ and $y \in B \cup C$. So
$\langle x, y\rangle \in A \times (B \cup C)$, and
$(A \times B) \cup (A \times C) \subseteq A \times (B \cup C)$.
== Conclude ==
Each side is contained in the other, so they are equal. The other three laws are proved in
exactly the same way.
:::

### The converse of property 5

Property 5 says "smaller factors give a smaller product". Does it run backwards: if
$A \times B \subseteq C \times D$, must $A \subseteq C$ and $B \subseteq D$? **Not
always** (Note 2.1.1 in the textbook). The empty set is the trouble-maker, because a product
with an empty factor is empty and so is a subset of anything:

| Case | Does $A \times B \subseteq C \times D$ give $A \subseteq C$ and $B \subseteq D$? |
| --- | --- |
| $A = B = \varnothing$ | Yes: $\varnothing$ is a subset of everything |
| $A \ne \varnothing$ and $B \ne \varnothing$ | Yes, both |
| $A = \varnothing$, $B \ne \varnothing$ | $A \subseteq C$ yes; $B \subseteq D$ not necessarily |
| $A \ne \varnothing$, $B = \varnothing$ | $B \subseteq D$ yes; $A \subseteq C$ not necessarily |

For the second row: take any $y \in B$ (there is one). For each $x \in A$,
$\langle x, y\rangle \in A \times B \subseteq C \times D$, so $x \in C$; this gives
$A \subseteq C$, and $B \subseteq D$ the same way using some $x \in A$. For the third row,
$A = \varnothing$, $B = \{1\}$, $C = \{0\}$, $D = \{2\}$ gives
$A \times B = \varnothing \subseteq C \times D$, yet $B \not\subseteq D$.

::: example A product with a power set
Let $A = \{1, 2\}$. Find $P(A) \times A$.
== The power set ==
$P(A)$, the set of all subsets of $A$ (Lesson 1.1), is
$\{\varnothing, \{1\}, \{2\}, \{1, 2\}\}$: 4 elements.
== The product ==
Pair each of the 4 subsets with each of $1, 2$:
$$\begin{aligned}
P(A) \times A = \{&\langle\varnothing,1\rangle, \langle\varnothing,2\rangle, \langle\{1\},1\rangle, \langle\{1\},2\rangle, \\
&\langle\{2\},1\rangle, \langle\{2\},2\rangle, \langle\{1,2\},1\rangle, \langle\{1,2\},2\rangle\}.
\end{aligned}$$
== Check the count ==
$|P(A) \times A| = 4 \times 2 = 8$. Elements of a pair can be sets themselves:
$\langle \varnothing, 1\rangle$ is a perfectly good pair.
:::

::: example True or false? (an exam-style question)
For arbitrary sets $A, B, C, D$, decide whether each statement is true and say why.
(1) If $A \times B = A \times C$, then $B = C$.
(2) $A - (B \times C) = (A - B) \times (A - C)$.
(3) If $A = B$ and $C = D$, then $A \times C = B \times D$.
(4) There is a set $A$ with $A \subseteq A \times A$.
== (1) False ==
"Cancelling" $A$ fails when $A$ is empty. Counterexample: $A = \varnothing$, $B = \{1\}$,
$C = \{2\}$. Then $A \times B = \varnothing = A \times C$, but $B \ne C$. (It *is* true
when $A \ne \varnothing$.)
== (2) False ==
Take $A = B = \{1\}$, $C = \{2\}$. Left: $A - (B \times C) = \{1\} - \{\langle 1, 2\rangle\} = \{1\}$
(the number 1 is not the pair $\langle 1,2\rangle$). Right:
$(A - B) \times (A - C) = \varnothing \times \{1\} = \varnothing$. They differ.
== (3) True ==
Equal sets are the same set, so the products are the same set.
== (4) True ==
Take $A = \varnothing$: then $A \times A = \varnothing$, and $\varnothing \subseteq \varnothing$.
:::

::: callout exam Products in exams
Expect true/false statements like the ones above. The empty set is almost always the key:
before believing a "cancellation" or a converse, try $A = \varnothing$. Also expect "list
$A \times B$" and "how many elements has $A \times B$?".
:::

## Binary relations

Now the main idea. A relation picks out *some* of the pairs: "less than" on
$\{1, 2, 3\}$ is the pairs $\langle 1,2\rangle, \langle 1,3\rangle, \langle 2,3\rangle$ — exactly
those where the first number is smaller. So we simply **define** a relation to be its set
of pairs.

::: define Binary relation | 二元关系
A set is a **binary relation** (or just a **relation**), usually written $R$, if either
1. it is empty, or
2. it is non-empty and every element of it is an ordered pair.

If $\langle x, y\rangle \in R$ we write $x R y$ ("$x$ is related to $y$ by $R$"); if not,
$x \not R y$.
:::

For example, with $R_1 = \varnothing$, $R_2 = \{\langle 1, 2\rangle, \langle a, b\rangle\}$
and $R_3 = \{\langle 1, 2\rangle, a, b\}$: $R_1$ and $R_2$ are binary relations, but $R_3$
is not, because $a$ and $b$ are not ordered pairs.

The notation $xRy$ is how we already write familiar relations: $3 < 5$ means
$\langle 3, 5\rangle$ is in the "less than" relation.

Usually the pairs come from particular sets:

::: define Relation from A to B | 从A到B的二元关系
For sets $A$ and $B$, any subset of $A \times B$ is a **relation from $A$ to $B$**. When
$A = B$, a subset of $A \times A$ is a **relation on $A$** ({{zh A上的二元关系}}).
:::

::: example Relations from A to B
Let $A = \{0, 1\}$ and $B = \{1, 2, 3\}$, and
$R_1 = \{\langle 0, 2\rangle\}$, $R_2 = A \times B$, $R_3 = \varnothing$,
$R_4 = \{\langle 0, 1\rangle\}$. Which are relations from $A$ to $B$, and which are relations
on $A$?
== From A to B ==
Each is a subset of $A \times B$ (all six pairs, or some of them, or none), so all four
are relations from $A$ to $B$.
== On A ==
$A \times A = \{\langle 0,0\rangle, \langle 0,1\rangle, \langle 1,0\rangle, \langle 1,1\rangle\}$.
$R_3 = \varnothing$ and $R_4 = \{\langle 0, 1\rangle\}$ are subsets of it, so they are
**also** relations on $A$. $R_1$ is not ($2 \notin A$), and neither is $R_2$.
:::

A relation from $A$ to $B$ is easy to draw: put $A$'s elements in one row, $B$'s in
another, and draw an arrow for each pair. Here is $R_2 = A \times B$ from the example;
$R_1$ would be just one of these arrows, $0 \to 2$:

::: graph The relation $A \times B$ from $A = \{0, 1\}$ to $B = \{1, 2, 3\}$: every possible arrow
row: 0 1
row: b1 b2 b3
0 -> b1, 0 -> b2, 0 -> b3, 1 -> b1, 1 -> b2, 1 -> b3
:::

(In the drawing, $B$'s elements are labelled b1, b2, b3 so that they aren't confused with
the $1 \in A$; they stand for $1, 2, 3 \in B$.)

### How many relations are there?

A relation on $A$ is *any* subset of $A \times A$. So counting relations is counting
subsets, and Lesson 1.1 tells us a set with $k$ elements has $2^k$ subsets.

::: formula Number of relations on a set | A上二元关系的个数
$$\text{if } |A| = n: \quad \text{number of relations on } A = 2^{n^2}$$
--
$n$ | number of elements of $A$ |
$n^2$ | $\lvert A \times A\rvert$, the number of possible pairs |
$2^{n^2}$ | number of subsets of $A \times A$ |
:::

Each of the $n^2$ possible pairs is independently "in" or "out". With $n = 3$ there are
already $2^9 = 512$ relations. In the same way, if $|A| = m$ and $|B| = n$, there are
$2^{mn}$ relations from $A$ to $B$.

::: callout key A relation is just a set of pairs
There is nothing more to a relation than which pairs it contains. Two relations are equal
when they contain the same pairs; a relation can be empty; and every set operation
($\cup$, $\cap$, $-$, $\sim$) can be applied to relations, because they are sets.
:::

## Special relations

Three relations exist on every set $A$.

- The **empty relation** ({{zh 空关系}}): $\varnothing$, which is a subset of
  $A \times A$. Nothing is related to anything.
- The **universal relation**: every element is related to every element.
- The **identity relation**: every element is related to itself, and to nothing else.

::: define Universal relation and identity relation | 全域关系与恒等关系
For any set $A$, the **universal relation** $E_A$ and the **identity relation** $I_A$ on
$A$ are
$$E_A = \{\langle x, y\rangle \mid x \in A \wedge y \in A\} = A \times A, \qquad I_A = \{\langle x, x\rangle \mid x \in A\}.$$
:::

For example, if $A = \{1, 2\}$:
$E_A = \{\langle 1,1\rangle, \langle 1,2\rangle, \langle 2,1\rangle, \langle 2,2\rangle\}$ and
$I_A = \{\langle 1,1\rangle, \langle 2,2\rangle\}$. Every relation $R$ on $A$ lies between
the smallest and the largest: $\varnothing \subseteq R \subseteq E_A$.

### Two everyday relations

::: define Inclusion relation | 包含关系
For a family of sets $\mathcal{A}$ (a set whose elements are sets), the
**inclusion relation** on $\mathcal{A}$ is
$R_\subseteq = \{\langle X, Y\rangle \mid X, Y \in \mathcal{A},\ X \subseteq Y\}$.
:::

::: example The inclusion relation on a power set
Let $B = \{a, b\}$ and $\mathcal{A} = P(B) = \{\varnothing, \{a\}, \{b\}, \{a, b\}\}$. List
$R_\subseteq$ on $\mathcal{A}$.
== Go through the first elements ==
$\varnothing$ is a subset of all four; $\{a\}$ of itself and $\{a, b\}$; $\{b\}$ of itself
and $\{a, b\}$; $\{a, b\}$ only of itself.
== The relation ==
$$\begin{aligned}
R_\subseteq = \{&\langle\varnothing,\varnothing\rangle, \langle\varnothing,\{a\}\rangle, \langle\varnothing,\{b\}\rangle, \langle\varnothing,\{a,b\}\rangle, \langle\{a\},\{a\}\rangle, \\
&\langle\{a\},\{a,b\}\rangle, \langle\{b\},\{b\}\rangle, \langle\{b\},\{a,b\}\rangle, \langle\{a,b\},\{a,b\}\rangle\}.
\end{aligned}$$
That is $4 + 2 + 2 + 1 = 9$ pairs out of the 16 in $\mathcal{A} \times \mathcal{A}$.
:::

::: define Less-than-or-equal relation | 小于或等于关系
For a subset $A$ of the real numbers $\mathbb{R}$, the
**less-than-or-equal relation** on $A$ is
$L_A = \{\langle x, y\rangle \mid x, y \in A,\ x \le y\}$.
:::

On $A = \{1, 2, 3, 4\}$, write all 16 pairs of $A \times A$ in a square, row $x$ and
column $y$. $L_A$ is the pairs on and above the diagonal (where $x \le y$):

$$\begin{array}{cccc}
\boxed{\langle1,1\rangle} & \boxed{\langle1,2\rangle} & \boxed{\langle1,3\rangle} & \boxed{\langle1,4\rangle} \\
\langle2,1\rangle & \boxed{\langle2,2\rangle} & \boxed{\langle2,3\rangle} & \boxed{\langle2,4\rangle} \\
\langle3,1\rangle & \langle3,2\rangle & \boxed{\langle3,3\rangle} & \boxed{\langle3,4\rangle} \\
\langle4,1\rangle & \langle4,2\rangle & \langle4,3\rangle & \boxed{\langle4,4\rangle}
\end{array}$$

The 10 boxed pairs form $L_A$; the 6 below the diagonal ($\langle 2,1\rangle$,
$\langle 3,1\rangle$, $\langle 3,2\rangle$, $\langle 4,1\rangle$, $\langle 4,2\rangle$,
$\langle 4,3\rangle$) don't belong to it. This square layout is exactly the idea behind
the relation matrix in the next section.

## Three ways to show a relation

A relation can be shown in three common ways: a **set expression** (list the pairs, or
describe them), a **relation matrix** (a table of 0s and 1s) and a **relation graph** (dots
and arrows). Each has its use: the set is exact, the matrix suits computers and
calculations, and the graph lets you *see* properties at a glance.

::: define Relation matrix | 关系矩阵
Let $A = \{x_1, x_2, \dots, x_n\}$ and $R$ a relation on $A$. For all
$i, j = 1, 2, \dots, n$ let
$$r_{ij} = \begin{cases} 1, & \text{if } x_i R x_j, \\ 0, & \text{otherwise.} \end{cases}$$
The $n \times n$ matrix $(r_{ij})$ is the **relation matrix** of $R$, written $M_R$.
Row $i$ belongs to $x_i$ as a *first* element, column $j$ to $x_j$ as a *second* element.
:::

::: define Relation graph | 关系图
Let $A = \{x_1, x_2, \dots, x_n\}$ and $R$ a relation on $A$. The **relation graph**
$G_R$ has the $n$ vertices $x_1, \dots, x_n$, and a directed edge (an arrow) from $x_i$
to $x_j$ for each pair $\langle x_i, x_j\rangle \in R$. A pair $\langle x, x\rangle$ gives a
**loop** ({{zh 环}}), an arrow from $x$ back to itself.
:::

::: example One relation, three ways
Let $A = \{1, 2, 3, 4\}$ and
$R = \{\langle 1,1\rangle, \langle 1,2\rangle, \langle 2,3\rangle, \langle 2,4\rangle, \langle 4,2\rangle\}$.
Give its relation matrix and relation graph.
== The matrix ==
Row $i$, column $j$ holds 1 when $\langle i, j\rangle \in R$. Row 1: pairs
$\langle1,1\rangle, \langle1,2\rangle$; row 2: $\langle2,3\rangle, \langle2,4\rangle$; row 3:
none; row 4: $\langle4,2\rangle$.
$$M_R = \begin{bmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \end{bmatrix}$$
== The graph ==
Four vertices; a loop at 1 for $\langle 1,1\rangle$; arrows $1 \to 2$, $2 \to 3$,
$2 \to 4$ and $4 \to 2$. The last two go both ways between 2 and 4, so they are drawn as
two curved arrows (Figure below, laid out as in the textbook's Figure 2.2.1).
== Read back ==
The number of 1s in $M_R$ (5) equals the number of arrows in $G_R$ (5) equals $|R|$. A row
of zeros (row 3) is a vertex with no arrows leaving it.
:::

::: graph The relation graph $G_R$ of $R = \{\langle1,1\rangle, \langle1,2\rangle, \langle2,3\rangle, \langle2,4\rangle, \langle4,2\rangle\}$ (textbook Figure 2.2.1)
at 1: 90, 70
at 2: 270, 70
at 3: 270, 200
at 4: 90, 200
1 -> 1, 1 -> 2, 2 -> 3, 2 -> 4, 4 -> 2
show: degrees
:::

The degrees under the figure count the arrows: vertex 2 has two going out
($2 \to 3$, $2 \to 4$) and two coming in ($1 \to 2$, $4 \to 2$). Reading a row of $M_R$
gives a vertex's arrows out; reading a column gives its arrows in.

::: callout pitfall Rows are "from", columns are "to"
In $M_R$, the entry in row $i$, column $j$ is about the pair $\langle x_i, x_j\rangle$ —
first element = row. Mixing them up transposes the matrix, which gives a different
relation (the inverse, Lesson 2.2). Also keep the elements in the same order for rows and
columns.
:::

The identity and universal relations are easy to recognise in both pictures: $M_{I_A}$
is the identity matrix (1s on the diagonal only) and $G_{I_A}$ is just a loop at every
vertex; $M_{E_A}$ is all 1s and $G_{E_A}$ has every possible arrow, loops included. The
less-than-or-equal relation on $\{1, 2, 3, 4\}$ has 1s on and above the diagonal:

$$M_{L_A} = \begin{bmatrix} 1 & 1 & 1 & 1 \\ 0 & 1 & 1 & 1 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

::: graph The relation $L_A$ ($\le$) on $\{1, 2, 3, 4\}$: a loop at each number and an arrow from each number to every larger one
1 -> 1, 2 -> 2, 3 -> 3, 4 -> 4
1 -> 2, 1 -> 3, 1 -> 4, 2 -> 3, 2 -> 4, 3 -> 4
:::

## n-ary relations and databases

Pairs relate two things; $n$-tuples relate $n$. An **$n$-ary relation**
({{zh n元关系}}) is a subset of $A_1 \times A_2 \times \dots \times A_n$. This is not just
theory: it is exactly how a **relational database** stores data.

Suppose a company records, for each employee: $A$ = names, $B$ = sex
$\{\text{male}, \text{female}\}$, $C$ = age $\{1, 2, \dots, 100\}$, $D$ = education
$\{\text{primary}, \text{junior high}, \text{senior high}, \text{university}, \text{master}, \text{doctor}\}$,
$E$ = married $\{\text{yes}, \text{no}\}$, $F$ = monthly wage $[0, 20000]$. One employee is
one 6-tuple in $A \times B \times C \times D \times E \times F$, and the whole staff list is a
6-ary relation — a table:

| Name ($A$) | Sex ($B$) | Age ($C$) | Education ($D$) | Married ($E$) | Wage ($F$) |
| --- | --- | --- | --- | --- | --- |
| 张三 | male | 28 | university | yes | 400 |
| 李四 | male | 50 | master | yes | 1400 |
| 李晓芬 | female | 18 | senior high | no | 300 |

Each row is a tuple, each column one of the sets. The $n$-ary relation is the core of the
relational data model, which is the basis of relational databases (SQL tables). In this
course, though, "relation" means a **binary** relation unless it says otherwise.

::: callout exam What exams ask about relations
Typical questions: "is this set a relation?"; "list $E_A$ / $I_A$ / a relation given by a
rule"; "write the relation matrix and draw the relation graph"; "how many relations are
there on an $n$-element set?" ($2^{n^2}$), or from an $m$-set to an $n$-set ($2^{mn}$).
:::

::: cards Ordered pairs and relations
Equality of ordered pairs :: $\langle x,y\rangle = \langle u,v\rangle$ if and only if $x = u$ and $y = v$.
Ordered pair vs two-element set :: $\{x,y\} = \{y,x\}$ always; $\langle x,y\rangle \ne \langle y,x\rangle$ when $x \ne y$.
Cartesian product $A \times B$ (笛卡儿积) :: $\{\langle x,y\rangle \mid x \in A \wedge y \in B\}$; it has $\lvert A\rvert \cdot \lvert B\rvert$ elements.
Product with the empty set :: $A \times \varnothing = \varnothing \times A = \varnothing$.
Laws the Cartesian product breaks :: Commutativity ($A \times B \ne B \times A$ for non-empty $A \ne B$) and associativity.
Laws the Cartesian product keeps :: It distributes over $\cup$ and $\cap$ on both sides, and is monotone: $A \subseteq C$, $B \subseteq D \Rightarrow A \times B \subseteq C \times D$.
Does $A \times B \subseteq C \times D$ give $A \subseteq C$, $B \subseteq D$? :: Only when $A$, $B$ are both empty or both non-empty; if exactly one is empty, not necessarily.
Binary relation (二元关系) :: A set that is empty or whose elements are all ordered pairs; $xRy$ means $\langle x,y\rangle \in R$.
Relation from $A$ to $B$; relation on $A$ :: A subset of $A \times B$; a subset of $A \times A$.
Number of relations on an $n$-element set :: $2^{n^2}$ (subsets of the $n^2$ pairs).
Universal relation $E_A$ (全域关系) :: $A \times A$: every element related to every element.
Identity relation $I_A$ (恒等关系) :: $\{\langle x,x\rangle \mid x \in A\}$: each element related only to itself.
Relation matrix $M_R$ (关系矩阵) :: $r_{ij} = 1$ exactly when $x_i R x_j$; row = first element, column = second.
Relation graph $G_R$ (关系图) :: A vertex per element, an arrow $x_i \to x_j$ per pair $\langle x_i,x_j\rangle \in R$; $\langle x,x\rangle$ is a loop.
:::

::: quiz Check yourself
? If $\langle x + 2, 4\rangle = \langle 5, 2x + y\rangle$, what is $y$?
answer: -2
> Equal pairs have equal first and second elements: $x + 2 = 5$ gives $x = 3$, then $2 \cdot 3 + y = 4$ gives $y = -2$.

? $|A| = 3$ and $|B| = 4$. How many elements has $A \times B$?
answer: 12
> $|A \times B| = |A| \cdot |B| = 3 \times 4 = 12$.

? Let $A = \{1, 2\}$. How many elements has $P(A) \times A$?
answer: 8
> $P(A) = \{\varnothing, \{1\}, \{2\}, \{1,2\}\}$ has 4 elements, so $|P(A) \times A| = 4 \times 2 = 8$.

? Which of these sets are binary relations? (tick all)
- [x] $\varnothing$
- [x] $\{\langle 1, 2\rangle, \langle a, b\rangle\}$
- [ ] $\{\langle 1, 2\rangle, a, b\}$
- [x] $\{\langle \varnothing, \{1\}\rangle\}$
> A relation is empty or has only ordered pairs as elements. $\{\langle 1,2\rangle, a, b\}$ contains $a$ and $b$, which aren't pairs. The last one is a single pair whose elements happen to be sets — still a pair.

? For arbitrary sets $A, B, C, D$, which statements are always true? (tick all)
- [ ] If $A \times B = A \times C$, then $B = C$
- [ ] $A - (B \times C) = (A - B) \times (A - C)$
- [x] If $A = B$ and $C = D$, then $A \times C = B \times D$
- [x] There is a set $A$ with $A \subseteq A \times A$
> (1) fails for $A = \varnothing$, $B = \{1\}$, $C = \{2\}$. (2) fails for $A = B = \{1\}$, $C = \{2\}$: the left side is $\{1\}$, the right side $\varnothing$. (3) is true. (4) is true with $A = \varnothing$.

? How many different binary relations are there on a 3-element set?
answer: 2^(3*3)
> $|A \times A| = 9$, and each subset of it is a relation: $2^9 = 512$.

? How many binary relations are there on an $n$-element set? (as a formula in $n$)
expression: 2^(n^2)
variables: n
> A relation on $A$ is any subset of $A \times A$, which has $n^2$ elements, so there are $2^{n^2}$.

? How many relations are there from $A = \{0, 1\}$ to $B = \{1, 2, 3\}$?
answer: 2^(2*3)
> $|A \times B| = 6$ pairs, each in or out: $2^6 = 64$.

? How many 1s are in the relation matrix of the identity relation $I_A$ on an $n$-element set?
expression: n
variables: n
> $I_A$ has one pair $\langle x, x\rangle$ per element, so $n$ ones, all on the diagonal.

? The relation $A \times A$ on $A$ is called the ___ relation (one word).
text: universal | 全域 | 全域关系
> $E_A = A \times A$ is the universal relation (全域关系): everything is related to everything.

? In the relation graph of $R = \{\langle1,1\rangle, \langle1,2\rangle, \langle2,3\rangle, \langle2,4\rangle, \langle4,2\rangle\}$, how many arrows leave vertex 2?
answer: 2
> Row 2 of $M_R$ is $0\ 0\ 1\ 1$: the arrows $2 \to 3$ and $2 \to 4$.
:::

---
title: Equivalence relations and partitions
zh: 等价关系与划分
summary: Equivalence relations, equivalence classes and quotient sets, partitions of a set, and the one-to-one correspondence between them, with the counting questions exams ask.
source: 2-3二元关系 (§2.6 等价关系与划分), 2026-09-10
---

Sorting things into groups of "the same kind" is one of the most common things we do:
integers by their remainder, students by class, files by type. An **equivalence
relation** is the precise version of "is the same kind as", and the groups it produces
are its **equivalence classes**. This lesson shows that the two pictures are really
one: every equivalence relation cuts the set into non-overlapping blocks (a
**partition**), and every partition comes from exactly one equivalence relation. That
correspondence is what lets exams turn "how many equivalence relations…?" into "how
many ways can you split the set…?".

You will need the five properties of relations (Lesson 2.4), $I_A$ and $E_A$
(Lesson 2.1), and relation diagrams. Closures (Lesson 2.5) show up once, at the end.

## Equivalence relations

Start with an example. On $A = \{1,2,3,4,5,6,7,8\}$ relate $x$ and $y$ when they leave
the same remainder on division by 3, that is, when $3$ divides $x - y$ (congruence
modulo 3, {{zh 模3同余关系}}). Writing out every pair:

$$
\begin{aligned}
R = \{&\langle1,1\rangle,\langle1,4\rangle,\langle1,7\rangle,\langle2,2\rangle,\langle2,5\rangle,\langle2,8\rangle,\langle3,3\rangle,\langle3,6\rangle,\\
&\langle4,1\rangle,\langle4,4\rangle,\langle4,7\rangle,\langle5,2\rangle,\langle5,5\rangle,\langle5,8\rangle,\langle6,3\rangle,\langle6,6\rangle,\\
&\langle7,1\rangle,\langle7,4\rangle,\langle7,7\rangle,\langle8,2\rangle,\langle8,5\rangle,\langle8,8\rangle\}
\end{aligned}
$$

That is 22 pairs. Its relation diagram falls apart into three separate clusters:

::: graph Congruence modulo 3 on {1, …, 8}
at 1: 30, 90
at 4: 110, 30
at 7: 100, 150
at 2: 250, 30
at 5: 330, 90
at 8: 260, 150
at 3: 130, 215
at 6: 230, 215
1 -> 1, 4 -> 4, 7 -> 7, 1 -> 4, 4 -> 1, 1 -> 7, 7 -> 1, 4 -> 7, 7 -> 4
2 -> 2, 5 -> 5, 8 -> 8, 2 -> 5, 5 -> 2, 2 -> 8, 8 -> 2, 5 -> 8, 8 -> 5
3 -> 3, 6 -> 6, 3 -> 6, 6 -> 3
:::

Look at the three properties the slide asks about:

1. **Reflexive**: every vertex has a loop ($x - x = 0$ is divisible by 3).
2. **Symmetric**: every arrow has a partner going back (if 3 divides $x - y$, it
   divides $y - x$).
3. **Transitive**: inside a cluster every vertex points to every vertex, so any
   two-step walk has its shortcut (if 3 divides $x - y$ and $y - z$, it divides their
   sum $x - z$).

Inside each cluster, everything is related to everything; between clusters, nothing is.
That shape is exactly what the three properties together produce.

::: define Equivalence relation | 等价关系
Let $R$ be a relation on a nonempty set $A$. If $R$ is **reflexive, symmetric and
transitive**, it is an **equivalence relation** on $A$. When $\langle x,y\rangle\in R$
we say $x$ is **equivalent** to $y$ and write $x\sim y$. (Definition 2.6.1 in the
textbook.)
:::

Each property matches something we expect of "the same kind as": everything is the same
kind as itself; if $x$ is like $y$ then $y$ is like $x$; and likeness passes along a
chain.

::: example Which of these are equivalence relations?
Let $X$ be a nonempty set. Decide for each relation (the slide's drill).
== Inclusion ⊆ on P(X) ==
**No.** Reflexive and transitive, but not symmetric: $\varnothing\subseteq X$ but
$X\not\subseteq\varnothing$ (as $X\ne\varnothing$).
== Proper inclusion ⊂ on P(X) ==
**No.** Not reflexive: $X\subset X$ is false. (Not symmetric either.)
== The identity relation I_X ==
**Yes.** Every $x$ is related only to itself: reflexive, and symmetry and transitivity
hold trivially.
== A proper subset R ⊂ I_X ==
**No.** Some loop $\langle x,x\rangle$ is missing, so $R$ is not reflexive (it is
still symmetric and transitive).
== ≤ on the real numbers ==
**No.** Not symmetric: $1\le2$ but $2\not\le1$.
== < on the real numbers ==
**No.** Not reflexive (and not symmetric).
== Congruence modulo n on the natural numbers ==
**Yes**, by the same argument as for modulo 3 above.
== Equality of any kind ==
**Yes.** "Equal" (numbers, sets, matrices, …) is the model equivalence relation.
:::

::: callout pitfall Check all three properties
A relation that is "almost" an equivalence relation fails one property, and the
failing one is easy to miss. Orders ($\le$, $\subseteq$) fail symmetry; strict orders
($<$, $\subset$) fail reflexivity; a proper part of $I_A$ fails reflexivity. On a
nonempty set, the empty relation is **not** an equivalence relation: it is symmetric and
transitive, but not reflexive.
:::

## Equivalence classes

In the mod-3 example the clusters were $\{1,4,7\}$, $\{2,5,8\}$ and $\{3,6\}$: the
elements sorted by "who is related to whom". The cluster an element lives in is its
class.

::: define Equivalence class | 等价类
Let $R$ be an equivalence relation on a nonempty set $A$. For each $x\in A$,
$$[x]_R = \{\,y\mid y\in A,\ \langle x,y\rangle\in R\,\}$$
is the **equivalence class of $x$ with respect to $R$**, or simply the class of $x$.
It is also written $[x]$ or $\bar x$. (Definition 2.6.2 in the textbook.)
:::

In words: $[x]$ is everything $x$ is related to. On the diagram, it is the set of
vertices $x$ has arrows to. For congruence modulo 3 on $\{1,\dots,8\}$:

$$
\begin{gathered}
[1] = [4] = [7] = \{1,4,7\},\\
[2] = [5] = [8] = \{2,5,8\},\\
[3] = [6] = \{3,6\}.
\end{gathered}
$$

Eight elements, but only three different classes: each class has several names, one
for each of its elements (its **representatives**).

::: theorem Properties of equivalence classes | 等价类的性质
Let $R$ be an equivalence relation on a nonempty set $A$. Then

1. for every $x\in A$, $[x]$ is a nonempty subset of $A$;
2. for all $x,y\in A$, if $xRy$ then $[x] = [y]$;
3. for all $x,y\in A$, if $\langle x,y\rangle\notin R$ then $[x]\cap[y] = \varnothing$;
4. $\bigcup\{[x]\mid x\in A\} = A$.

(Theorem 2.6.1 in the textbook.)
:::

Together these say: the classes are nonempty, two classes are either **the same** or
**disjoint** (never partly overlapping), and they cover all of $A$. Each part uses one
property of $R$.

**Proof of 1** (reflexivity). By definition $[x]\subseteq A$. Since $R$ is reflexive,
$\langle x,x\rangle\in R$, so $x\in[x]$ and $[x]$ is nonempty.

**Proof of 2** (symmetry and transitivity). Idea: if $x$ and $y$ are related, anything
related to one is related to the other. Take any $z\in[x]$, so $\langle x,z\rangle\in R$.

- By symmetry, $\langle z,x\rangle\in R$.
- We are given $\langle x,y\rangle\in R$.
- By transitivity, $\langle z,y\rangle\in R$, and by symmetry $\langle y,z\rangle\in R$,
  so $z\in[y]$.

Hence $[x]\subseteq[y]$. The same argument with $x$ and $y$ swapped (using
$\langle y,x\rangle\in R$, by symmetry) gives $[y]\subseteq[x]$, so $[x] = [y]$.

**Proof of 3** (by contradiction). Suppose $[x]\cap[y]\ne\varnothing$, so some $z$ lies
in both: $\langle x,z\rangle\in R$ and $\langle y,z\rangle\in R$. By symmetry
$\langle z,y\rangle\in R$, and by transitivity $\langle x,y\rangle\in R$, contradicting
$\langle x,y\rangle\notin R$.

**Proof of 4** (the slides leave it out). Each $[x]\subseteq A$, so the union is inside
$A$. Conversely each $x\in A$ lies in its own class $[x]$ (part 1), so $A$ is inside
the union.

::: callout pitfall An element vs its class
$x\in[x]$, but $x\ne[x]$: $3$ is a number, $[3] = \{3,6\}$ is a set. And
$[3] = [6]$ although $3\ne6$: equal classes don't mean equal representatives.
:::

## Quotient sets

Collect the classes themselves into one set.

::: define Quotient set | 商集
Let $R$ be an equivalence relation on a nonempty set $A$. The set whose elements are
all the equivalence classes of $R$ is the **quotient set of $A$ by $R$**, written
$$A/R = \{\,[x]_R\mid x\in A\,\}.$$
(Definition 2.6.3 in the textbook.)
:::

For congruence modulo 3 on $\{1,\dots,8\}$:
$$A/R = \{\{1,4,7\},\{2,5,8\},\{3,6\}\}.$$
Although the definition runs over all eight $x$, repeated classes count once (it is a
set), so $|A/R| = 3$.

::: callout pitfall A set of sets
$A/R$ is a set of **subsets** of $A$, so $A/R\subseteq P(A)$, and its elements are sets:
$\{3,6\}\in A/R$, while $3\notin A/R$. Keep $\in$ and $\subseteq$ straight (Lesson 1.1).
:::

Two extreme cases are worth knowing. For $I_A$ every element is alone:
$A/I_A = \{\{x\}\mid x\in A\}$. For $E_A$ everything is together: $A/E_A = \{A\}$.

::: example Classes and quotient set of an equivalence relation
On $A = \{a,b,c,d,e\}$ the relation
$R = I_A\cup\{\langle a,c\rangle,\langle c,a\rangle,\langle b,e\rangle,\langle e,b\rangle\}$
is an equivalence relation. Find every class and $A/R$.
== Read off the classes ==
$a$ is related to $a$ and $c$: $[a] = [c] = \{a,c\}$. $b$ is related to $b$ and $e$:
$[b] = [e] = \{b,e\}$. $d$ is related only to itself: $[d] = \{d\}$.
== The quotient set ==
$A/R = \{\{a,c\},\{b,e\},\{d\}\}$, with 3 elements.
== Check ==
The classes are nonempty, pairwise disjoint and their union is $A$, as Theorem 2.6.1
says. The pairs: $2^2 + 2^2 + 1^2 = 9 = 5 + 4$, matching $|R|$.
:::

## Partitions of a set

Now forget relations and look at the shape of $A/R$ alone. Take
$X = \{a,b,c,d,e\}$ and the family of subsets $\mathcal{A} = \{\{a,b\},\{c\},\{d,e\}\}$.
It has three features:

1. none of its sets is empty;
2. different sets in it share no element;
3. together they make up $X$.

That is what it means to cut $X$ into pieces, with nothing left over and nothing cut
twice. A set whose elements are sets is a {{term family of sets | 集族}}.

::: define Partition | 划分
Let $A$ be a nonempty set. A family of subsets $\pi\subseteq P(A)$ is a **partition**
of $A$ if

1. $\varnothing\notin\pi$;
2. for all $X,Y\in\pi$, if $X\ne Y$ then $X\cap Y = \varnothing$;
3. $\bigcup\pi = A$.

The elements of $\pi$ are the {{term blocks | 划分块}} of the partition. (Definition 2.6.4
in the textbook.)
:::

For example, $\pi = \{\{1,4,7\},\{2,5,8\},\{3,6\}\}$ is a partition of
$A = \{1,\dots,8\}$: the quotient set of congruence modulo 3.

::: example Which families are partitions?
Let $A = \{a,b,c,d\}$ and
$$
\begin{gathered}
\pi_1 = \{\{a,b,c\},\{d\}\},\quad \pi_2 = \{\{a,b\},\{c\},\{d\}\},\quad \pi_3 = \{\{a\},\{a,b,c,d\}\},\\
\pi_4 = \{\{a,b\},\{c\}\},\quad \pi_5 = \{\varnothing,\{a,b\},\{c,d\}\},\quad \pi_6 = \{\{a,\{a\}\},\{b,c,d\}\}.
\end{gathered}
$$
Which are partitions of $A$?
== π1 and π2 ==
Nonempty blocks, no overlaps, union $A$: **both are partitions**.
== π3 ==
Not a partition: the blocks $\{a\}$ and $\{a,b,c,d\}$ overlap in $a$.
== π4 ==
Not a partition: the union is $\{a,b,c\}$; $d$ is in no block.
== π5 ==
Not a partition: it contains the empty set.
== π6 ==
Not a partition: $\{a,\{a\}\}$ is not a subset of $A$, because $\{a\}$ is not an element
of $A$; so the union isn't $A$ either.
:::

## Equivalence relations and partitions correspond

Look back at Theorem 2.6.1. Parts 1, 3 (with 2) and 4 are exactly the three conditions
of a partition:

::: callout key The quotient set is a partition
For an equivalence relation $R$ on $A$, the quotient set $A/R$ is a partition of $A$:
its blocks are the equivalence classes.
:::

The road also runs the other way. Given a partition, call two elements related when
they sit in the same block.

::: theorem The relation defined by a partition | 划分确定的等价关系
Let $\pi$ be a partition of a nonempty set $A$, and define
$$
R = \{\langle x,y\rangle\mid x,y\in A,\ x\text{ and }y\text{ lie in the same block of }\pi\}
  = \bigcup_{B\in\pi} B\times B.
$$
Then $R$ is an equivalence relation on $A$, and its quotient set $A/R$ is $\pi$.
So equivalence relations on $A$ and partitions of $A$ are in one-to-one correspondence.
:::

The slides say this is "not hard to prove"; here it is. Every $x$ lies in some block
$B$ (the blocks cover $A$), so $\langle x,x\rangle\in B\times B$: reflexive. If $x$ and
$y$ share a block, so do $y$ and $x$: symmetric. If $x,y$ share block $B$ and $y,z$
share block $C$, then $y\in B\cap C$, so $B = C$ (different blocks are disjoint) and
$x,z$ share a block: transitive. Finally the class of $x$ is the block containing it,
so $A/R = \pi$.

::: example From a partition to its equivalence relation
$X = \{a,b,c,d,e\}$ and the partition $\{\{a,b,c\},\{d\},\{e\}\}$. Write the equivalence
relation.
== Square each block ==
$$R = (\{a,b,c\}\times\{a,b,c\})\cup(\{d\}\times\{d\})\cup(\{e\}\times\{e\}).$$
== List it ==
$R = \{\langle a,a\rangle,\langle a,b\rangle,\langle a,c\rangle,\langle b,a\rangle,\langle b,b\rangle,\langle b,c\rangle,\langle c,a\rangle,\langle c,b\rangle,\langle c,c\rangle,\langle d,d\rangle,\langle e,e\rangle\}$:
$9 + 1 + 1 = 11$ pairs.
:::

::: callout note How the slide writes it
The slide writes $R = \{\{a,b,c\}\times\{a,b,c\},\{d\}\times\{d\},\{e\}\times\{e\}\}$,
with braces around the products. Strictly, that is a set of three relations; $R$ is
their **union**, as above. The same applies to the slides' lists for $\{1,2,3\}$ below.
:::

::: graph The equivalence relation of the partition {{a, b, c}, {d}, {e}}
vertices: a b c d e
a -> a, b -> b, c -> c, d -> d, e -> e
a -> b, b -> a, a -> c, c -> a, b -> c, c -> b
:::

Counting the pairs works for any partition, because the blocks' squares don't overlap:

::: formula Pairs in an equivalence relation | 等价关系的元素个数
$$|R| = \sum_{B\in A/R}|B|^2$$
--
R | an equivalence relation on a finite set $A$
A/R | its quotient set: the blocks of the partition
\lvert B\rvert | the number of elements in the block $B$
:::

Since $|B|^2$ and $|B|$ are both even or both odd, $|R|$ has the same parity as
$\sum|B| = |A|$: on a set with an even (odd) number of elements, every equivalence
relation has an even (odd) number of pairs.

## Counting equivalence relations

The correspondence turns counting relations into counting ways to split a set.

::: example All equivalence relations on {1, 2, 3}
List every equivalence relation on $A = \{1,2,3\}$.
== List the partitions ==
One block: $\pi_1 = \{\{1,2,3\}\}$. Two blocks: $\pi_2 = \{\{1\},\{2,3\}\}$,
$\pi_3 = \{\{2\},\{1,3\}\}$, $\pi_4 = \{\{1,2\},\{3\}\}$. Three blocks:
$\pi_5 = \{\{1\},\{2\},\{3\}\}$. That is $1 + 3 + 1 = 5$.
== Turn each into a relation ==
| Partition | Equivalence relation | Pairs |
| --- | --- | --- |
| $\pi_1$ | $E_A = \{1,2,3\}\times\{1,2,3\}$ | 9 |
| $\pi_2$ | $I_A\cup\{\langle2,3\rangle,\langle3,2\rangle\}$ | 5 |
| $\pi_3$ | $I_A\cup\{\langle1,3\rangle,\langle3,1\rangle\}$ | 5 |
| $\pi_4$ | $I_A\cup\{\langle1,2\rangle,\langle2,1\rangle\}$ | 5 |
| $\pi_5$ | $I_A$ | 3 |
== Answer ==
Exactly 5 equivalence relations on a 3-element set. The largest is $E_A$, the smallest
is $I_A$.
:::

The number of partitions of an $n$-element set (the Bell number) grows quickly:

| Elements $n$ | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Partitions (equivalence relations) | 1 | 2 | 5 | 15 | 52 |

For small sets, count by the **shape** of the partition (the block sizes), then count
the ways to fill each shape.

::: example Equivalence relations on {1, 2, 3, 4} with two classes
How many equivalence relations on $A = \{1,2,3,4\}$ have a quotient set with 2
elements? (A past exam question, 2015–2016: A. 4, B. 5, C. 6, D. 7.)
== Translate ==
$|A/R| = 2$ means a partition into two blocks.
== Shape 3 + 1 ==
Choose the element that is alone: $\binom41 = 4$ ways.
== Shape 2 + 2 ==
The block containing 1 needs one partner: 3 choices ($\{1,2\}|\{3,4\}$,
$\{1,3\}|\{2,4\}$, $\{1,4\}|\{2,3\}$). Note: not $\binom42 = 6$, which counts each
split twice.
== Answer ==
$4 + 3 = 7$: **D**.
:::

::: example Equivalence relations with 6 pairs
Give an equivalence relation with 6 pairs on $A = \{a,b,c,d\}$, and count them all.
== Which shapes give 6 pairs? ==
By the formula, a shape with sizes $k_i$ gives $\sum k_i^2$ pairs. For 4 elements:
$1{+}1{+}1{+}1\to4$, $2{+}1{+}1\to6$, $2{+}2\to8$, $3{+}1\to10$, $4\to16$. Only the shape
$2 + 1 + 1$ gives 6.
== One example ==
The partition $\{\{a,b\},\{c\},\{d\}\}$ gives
$\{\langle a,a\rangle,\langle b,b\rangle,\langle c,c\rangle,\langle d,d\rangle,\langle a,b\rangle,\langle b,a\rangle\}$.
== Count ==
A shape $2 + 1 + 1$ is fixed by choosing the pair: $\binom42 = 6$ relations.
:::

::: callout tip Building an equivalence relation from any relation
Given any relation $R$, the smallest equivalence relation containing it is $tsr(R)$
(Lesson 2.5). Its classes are the "connected pieces" of $R$'s diagram, ignoring the
direction of arrows.
:::

::: callout exam What exams ask
Expect: decide whether a relation is an equivalence relation (check all three
properties); write the classes and $A/R$; check whether a family is a partition (empty
block, overlap, something missing); write the relation of a given partition; and count
equivalence relations, usually "how many on an $n$-element set" or "how many with $k$
classes / $m$ pairs", by listing partition shapes.
:::

::: cards Equivalence relations and partitions
Equivalence relation (等价关系) :: A relation on a nonempty set that is reflexive, symmetric and transitive; write $x\sim y$.
Equivalence class $[x]_R$ (等价类) :: $\{y\in A\mid \langle x,y\rangle\in R\}$: everything $x$ is related to.
Theorem 2.6.1 (classes) :: Each $[x]$ is a nonempty subset of $A$; $xRy$ ⇒ $[x] = [y]$; $\langle x,y\rangle\notin R$ ⇒ $[x]\cap[y] = \varnothing$; the classes cover $A$.
Two classes are always … :: Either equal or disjoint; never partly overlapping.
Quotient set $A/R$ (商集) :: The set of all equivalence classes, $\{[x]_R\mid x\in A\}$; a subset of $P(A)$.
Partition (划分): three conditions :: No empty block; different blocks disjoint; the union of the blocks is $A$.
Block (划分块) :: An element of a partition: a nonempty subset of $A$.
Partition → equivalence relation :: $R = \bigcup_{B\in\pi}B\times B$: related when in the same block; its quotient set is $\pi$.
Equivalence relations vs partitions :: One-to-one correspondence: $R\mapsto A/R$.
Number of pairs of an equivalence relation :: $\sum|B|^2$ over its classes; same parity as $|A|$.
Equivalence relations on a 3-element set :: 5 (one with 1 block, three with 2 blocks, one with 3 blocks).
Equivalence relations on a 4-element set :: 15; of these, 7 have two classes.
Quotient sets of $I_A$ and $E_A$ :: $A/I_A = \{\{x\}\mid x\in A\}$ (all singletons); $A/E_A = \{A\}$ (one block).
Empty relation on a nonempty set: equivalence? :: No: it is symmetric and transitive but not reflexive.
:::

::: quiz Check yourself
? Which of these relations are equivalence relations? ($X$ is a nonempty set; tick all)
- [ ] $\subseteq$ on $P(X)$
- [ ] $\subset$ on $P(X)$
- [x] $I_X$
- [ ] A proper subset of $I_X$
- [ ] $\le$ on the real numbers
- [x] Congruence modulo $n$ on the natural numbers
- [x] Equality
> In-class drill. $\subseteq$ and $\le$ are not symmetric; $\subset$, $<$ and a proper part of $I_X$ are not reflexive. $I_X$, congruence mod $n$ and equality have all three properties.

? Which statement is **incorrect**?
- [ ] If $|A|$ is even, every equivalence relation on $A$ has an even number of pairs
- [ ] If $|A|$ is odd, every equivalence relation on $A$ has an odd number of pairs
- [ ] Partitions of $A$ and equivalence relations on $A$ correspond one-to-one
- [x] For nonempty $A$, the empty relation on $A$ is an equivalence relation
> In-class question (Rain Classroom: D). An equivalence relation has $\sum|B|^2$ pairs, which has the same parity as $\sum|B| = |A|$, so the first two are true; the third is the correspondence theorem. The empty relation on a nonempty set has no loops, so it isn't reflexive.

? At most how many equivalence relations can be defined on $A = \{1,2,3\}$?
- [ ] 4
- [x] 5
- [ ] 6
- [ ] 7
> Past exam question (answer B). Count partitions: 1 with one block, 3 with two blocks ($\{1\}|\{2,3\}$, $\{2\}|\{1,3\}$, $\{3\}|\{1,2\}$), 1 with three blocks: $1 + 3 + 1 = 5$.

? How many equivalence relations on $A = \{1,2,3,4\}$ have a quotient set with exactly 2 elements?
answer: 7
> Past exam question (answer D). Two-block partitions: shape $3 + 1$ in $\binom41 = 4$ ways, shape $2 + 2$ in 3 ways (the partner of 1 decides it): $4 + 3 = 7$.

? How many equivalence relations on $\{a,b,c,d\}$ have exactly 6 pairs?
answer: comb(4,2)
> Shapes give $\sum k_i^2$ pairs: only $2 + 1 + 1$ gives $4 + 1 + 1 = 6$. Choosing the pair: $\binom42 = 6$.

? How many equivalence relations are there on a 4-element set?
answer: 15
> Shapes: $4$ (1 way), $3+1$ (4), $2+2$ (3), $2+1+1$ ($\binom42 = 6$), $1+1+1+1$ (1). Total $1 + 4 + 3 + 6 + 1 = 15$.

? Which of these are partitions of $A = \{a,b,c,d\}$? (tick all)
- [x] $\{\{a,b,c\},\{d\}\}$
- [x] $\{\{a,b\},\{c\},\{d\}\}$
- [ ] $\{\{a\},\{a,b,c,d\}\}$
- [ ] $\{\{a,b\},\{c\}\}$
- [ ] $\{\varnothing,\{a,b\},\{c,d\}\}$
> The third has overlapping blocks (both contain $a$), the fourth misses $d$, the last contains $\varnothing$.

? The partition $\{\{1,2\},\{3,4,5\},\{6\}\}$ of $\{1,\dots,6\}$ defines an equivalence relation. How many pairs does it have?
answer: 2^2 + 3^2 + 1^2
> $|R| = \sum|B|^2 = 4 + 9 + 1 = 14$. (Parity check: $|A| = 6$ is even, and so is 14.)

? $R$ is congruence modulo 4 on $A = \{0,1,\dots,9\}$. How many elements does $A/R$ have?
answer: 4
> The classes are the remainders: $[0] = \{0,4,8\}$, $[1] = \{1,5,9\}$, $[2] = \{2,6\}$, $[3] = \{3,7\}$. Four classes.

? On an $n$-element set ($n\ge2$), how many equivalence relations have exactly $n - 1$ classes?
expression: n(n - 1)/2
variables: n
> $n - 1$ blocks from $n$ elements means one block of 2 and the rest singletons; the relation is fixed by the pair, so $\binom n2 = n(n-1)/2$.
:::

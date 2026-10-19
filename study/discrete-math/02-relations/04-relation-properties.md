---
title: Properties of relations
zh: 关系的性质
summary: The five properties a relation on a set can have (reflexive, irreflexive, symmetric, antisymmetric, transitive), how to test them with sets, matrices and relation graphs, and which operations on relations keep them.
source: 2-2二元关系 (§2.4 关系的性质), 2026-09-08; 2-3二元关系 (opening example), 2026-09-10
---

Some relations behave alike: "$\le$" on numbers and "$\subseteq$" on sets both let
every element relate to itself, never go both ways between two different elements,
and chain along ("$a\le b$ and $b\le c$ give $a\le c$"). This lesson names these
behaviours: the five **properties** of a relation on a set. They are what the rest of
the unit is built from: closures (Lesson 2.5) add pairs until a property holds,
equivalence relations (Lesson 2.6) are the reflexive, symmetric and transitive ones,
and partial orders (Lesson 2.7) the reflexive, antisymmetric and transitive ones. You
will learn each property from its definition, then see how to spot it at a glance in a
relation matrix or a relation graph, and which operations keep it.

Throughout, $R$ is a relation **on** a set $A$, i.e. $R\subseteq A\times A$, and we use
$I_A$ (identity), $E_A=A\times A$ (universal relation), $R^{-1}$ (inverse) and
$R\circ S$ (composition, the step in $R$ first) from Lessons 2.1 and 2.2.

## Five properties, one running list

The five main properties are reflexivity {{zh 自反性}}, irreflexivity {{zh 反自反性}},
symmetry {{zh 对称性}}, antisymmetry {{zh 反对称性}} and transitivity {{zh 传递性}}. The
lecture tests each one on the same seven relations, so it pays to meet them once. Let
$X$ be a non-empty set:

| Label | The relation | On which set |
| --- | --- | --- |
| a | inclusion $\subseteq$ | the power set $2^X$ (the subsets of $X$) |
| b | proper inclusion $\subset$ | $2^X$ |
| c | the identity relation $I_X$ | $X$ |
| d | any proper subset $R\subset I_X$ (some loops removed) | $X$ |
| e | "less than or equal" $\le$ | the real numbers |
| f | "less than" $<$ | the real numbers |
| g | congruence modulo $n$ | the integers |

For g: fix a natural number $n$ (here $n\ge1$). Two integers $m$ and $k$ are
{{term congruent modulo n | 模n同余}}, written $m\equiv k\pmod n$, when they leave the same
remainder on division by $n$. For example $1\equiv4\equiv7\pmod 3$.

## Reflexive and irreflexive relations

Picture the relation graph. A **reflexive** relation has a loop at **every** vertex:
everybody relates to themselves, like "is as tall as". An **irreflexive** one has a
loop at **no** vertex: nobody relates to themselves, like "is the parent of".

::: define Reflexive relation | 自反关系
A relation $R$ on $A$ is **reflexive** if $\langle x,x\rangle\in R$ for every $x\in A$.
(Definition 2.4.1 ① in the textbook.)
:::

::: define Irreflexive relation | 反自反关系
A relation $R$ on $A$ is **irreflexive** if $\langle x,x\rangle\notin R$ for every
$x\in A$. (Definition 2.4.1 ② in the textbook.)
:::

Examples on $A=\{a,b,c,d\}$:

- $R=\{\langle a,a\rangle,\langle b,b\rangle,\langle c,c\rangle,\langle d,d\rangle,\langle a,b\rangle,\langle c,d\rangle\}$
  is reflexive: all four loops are there. Other pairs don't matter.
- $R=\{\langle a,b\rangle,\langle c,d\rangle,\langle b,c\rangle\}$ is irreflexive: no
  loop at all.
- $R=\{\langle a,b\rangle,\langle c,d\rangle,\langle b,c\rangle,\langle a,a\rangle\}$ is
  **neither**: it has the loop at $a$ (so not irreflexive) but lacks the loop at $b$
  (so not reflexive).

On the running list:

| Label | Relation | Reflexive? | Irreflexive? |
| --- | --- | --- | --- |
| a | $\subseteq$ on $2^X$ | yes: $S\subseteq S$ | no |
| b | $\subset$ on $2^X$ | no | yes: $S\subset S$ never holds |
| c | $I_X$ | yes | no |
| d | proper subset of $I_X$ | no: a loop is missing | no, if it isn't empty (it still has a loop) |
| e | $\le$ | yes | no |
| f | $<$ | no | yes |
| g | congruence mod $n$ | yes: $m\equiv m$ | no |

::: callout note About d
The lecture marks d "not irreflexive" for a **non-empty** proper subset of $I_X$: it
still contains some loop $\langle x,x\rangle$. The empty relation is also a proper
subset of $I_X$, and it **is** irreflexive. So d is "neither" except in that one case.
:::

For a non-empty $A$:
1. an irreflexive relation is never reflexive;
2. a reflexive relation is never irreflexive;
3. but a relation that is **not** reflexive need not be irreflexive (the "neither"
   example above).

::: callout pitfall Irreflexive is not "not reflexive"
"Not reflexive" means **some** loop is missing; "irreflexive" means **every** loop is
missing. Most relations are in between. (On $A=\emptyset$ the empty relation is both
reflexive and irreflexive, since there is no $x$ to check.)
:::

### How many reflexive relations are there?

Let $|X|=n$. A relation on $X$ is a choice, for each of the $n^2$ ordered pairs, of
"in" or "out". A reflexive relation has no choice about the $n$ loops (all in), and a
free choice about the other $n^2-n$ pairs.

::: formula Number of reflexive relations | 自反关系的个数
$$N_{\text{reflexive}}=N_{\text{irreflexive}}=2^{\,n^2-n}$$
--
n | number of elements of the set $X$ | —
n^2-n | number of pairs $\langle x,y\rangle$ with $x\ne y$, chosen freely | —
:::

Irreflexive relations are counted the same way (all loops out, the rest free), so the
lecture's true-or-false question "a set has as many reflexive relations as irreflexive
ones" is **true**. In fact $R\mapsto R\oplus I_X$ (switch every loop) pairs them off.
Counting the other kinds (symmetric, antisymmetric, …) comes in Lesson 2.7.

::: example Counting on a three-element set
How many reflexive relations does $X=\{1,2,3\}$ have?
== Free pairs ==
$n=3$: there are $3^2=9$ pairs, 3 of them loops, so $9-3=6$ free pairs.
== Count ==
$2^6=64$ reflexive relations (and 64 irreflexive ones), out of $2^9=512$ relations.
:::

## Symmetric and antisymmetric relations

Look at the arrows between two **different** vertices. A **symmetric** relation never
has a one-way arrow: whenever $x\to y$, also $y\to x$ ("is a sibling of", "is married
to"). An **antisymmetric** relation never has a two-way pair: you can't have both
$x\to y$ and $y\to x$ unless $x=y$ ("is a divisor of" on positive integers,
$\subseteq$).

::: define Symmetric relation | 对称关系
A relation $R$ on $A$ is **symmetric** if for every $\langle x,y\rangle\in R$ also
$\langle y,x\rangle\in R$. (Definition 2.4.2 ① in the textbook.)
:::

::: define Antisymmetric relation | 反对称关系
A relation $R$ on $A$ is **antisymmetric** if $\langle x,y\rangle\in R$ and
$\langle y,x\rangle\in R$ together imply $x=y$. (Definition 2.4.2 ② in the textbook.)
Equivalently: for $x\ne y$, at most one of $\langle x,y\rangle$, $\langle y,x\rangle$
is in $R$.
:::

Neither definition asks anything about loops: a loop $\langle x,x\rangle$ is its own
reverse, and it has $x=x$. So loops never break symmetry or antisymmetry.

::: example Four relations on {1, 2, 3}
Let $A=\{1,2,3\}$. Decide whether each relation is symmetric and whether it is
antisymmetric:
$R_1=\{\langle1,1\rangle,\langle2,2\rangle\}$,
$R_2=\{\langle1,1\rangle,\langle1,2\rangle,\langle2,1\rangle\}$,
$R_3=\{\langle1,2\rangle,\langle1,3\rangle\}$,
$R_4=\{\langle1,2\rangle,\langle2,1\rangle,\langle1,3\rangle\}$.
== R₁ ==
Only loops. Every pair's reverse is itself, so $R_1$ is symmetric; and no two-way pair
of different elements, so it is antisymmetric too. **Both.**
== R₂ ==
$\langle1,2\rangle$ and $\langle2,1\rangle$ are both there (plus a loop): symmetric.
But $1\ne2$, so it is **not** antisymmetric. **Symmetric only.**
== R₃ ==
$\langle1,2\rangle$ is in, $\langle2,1\rangle$ is not: not symmetric. No two-way pair:
antisymmetric. **Antisymmetric only.**
== R₄ ==
$\langle1,3\rangle$ without $\langle3,1\rangle$: not symmetric. $\langle1,2\rangle$ with
$\langle2,1\rangle$: not antisymmetric. **Neither.**
:::

::: callout pitfall Antisymmetric is not "not symmetric"
The four cases above show all four combinations happen. A relation can be **both**
symmetric and antisymmetric ($R_1$, or $\emptyset$): exactly the relations made of
loops only, $R\subseteq I_A$. And it can be **neither** ($R_4$). Don't argue "it's
symmetric, so it can't be antisymmetric".
:::

The special relations, for example on $A=\{1,2\}$:

| Relation | Its pairs | Symmetric? | Antisymmetric? |
| --- | --- | --- | --- |
| universal $E_A$ | $\langle1,1\rangle,\langle2,2\rangle,\langle1,2\rangle,\langle2,1\rangle$ | yes | no ($1\ne2$ both ways) |
| identity $I_A$ | $\langle1,1\rangle,\langle2,2\rangle$ | yes | yes |
| empty $\emptyset$ | none | yes | yes |

If $A=\emptyset$, then $E_A=I_A=\emptyset$, and all of them are both symmetric and
antisymmetric. (In general $E_A$ is antisymmetric only when $A$ has at most one
element.)

The running list:

| Label | Relation | Symmetric? | Antisymmetric? |
| --- | --- | --- | --- |
| a | $\subseteq$ | no: $\emptyset\subseteq X$ but not back (as $X\ne\emptyset$) | yes: $S\subseteq T\subseteq S$ gives $S=T$ |
| b | $\subset$ | no | yes, vacuously: never both ways |
| c | $I_X$ | yes | yes |
| d | subset of $I_X$ | yes | yes |
| e | $\le$ | no | yes: $x\le y\le x$ gives $x=y$ |
| f | $<$ | no | yes, vacuously |
| g | congruence mod $n$ | yes: same remainder both ways | no, e.g. $1\equiv4$ and $4\equiv1\pmod3$, $1\ne4$ (for $n\ge2$) |

"Vacuously" means the condition "if $\langle x,y\rangle$ and $\langle y,x\rangle$ are
both in $R$ …" is never met, so there is nothing that could fail.

## Transitive relations

A **transitive** relation contains every shortcut: whenever you can go $x\to y\to z$,
there is also a direct arrow $x\to z$. "Is an ancestor of" is transitive; "is the
parent of" is not.

::: define Transitive relation | 传递关系
A relation $R$ on $A$ is **transitive** if whenever $\langle x,y\rangle\in R$ and
$\langle y,z\rangle\in R$, also $\langle x,z\rangle\in R$. (Definition 2.4.3 in the
textbook.)
:::

Example: on $A=\{a,b,c,d\}$,
$R=\{\langle a,b\rangle,\langle b,c\rangle,\langle a,c\rangle\}$ is transitive: the only
two-step chain is $a\to b\to c$, and its shortcut $\langle a,c\rangle$ is there.

The special relations $E_A$, $I_A$ and $\emptyset$ are all transitive, on any $A$
(including $A=\emptyset$): $E_A$ contains every pair, $I_A$'s only chains are
$x\to x\to x$, and $\emptyset$ has no chains at all.

On the running list **all seven** relations are transitive: $\subseteq$, $\subset$, $\le$
and $<$ chain along; any subset of $I_X$ has only chains $x\to x\to x$; and if $m$ and
$k$ have the same remainder, and $k$ and $l$ do, so do $m$ and $l$.

::: callout pitfall Missing chains make a relation transitive
Transitivity only demands something when there **is** a chain $x\to y\to z$. A relation
with no two-step chains, like $\{\langle2,1\rangle,\langle3,1\rangle\}$ or $\emptyset$,
is transitive. And don't forget chains that come back: $\{\langle1,2\rangle,\langle2,1\rangle\}$
has the chain $1\to2\to1$, which needs $\langle1,1\rangle$; it's missing, so this
relation is **not** transitive.
:::

::: example The empty relation and all five properties
Let $X=\{a,b\}$ and $R=\emptyset$. Which of the five properties does $R$ have?
== Reflexive ==
No: $\langle a,a\rangle\notin R$.
== Irreflexive ==
Yes: no loop is in $R$.
== Symmetric, antisymmetric, transitive ==
Yes, all three vacuously: each starts "if some pair (or two pairs) is in $R$", and
$R$ has none.
:::

## Testing properties with sets: Theorem 2.4.1

Each property can be restated as a single statement about sets. This makes proofs
short, and it is what the matrix and graph tests come from.

::: theorem Set criteria for the five properties
Let $R$ be a relation on $A$. Then
1. $R$ is reflexive if and only if $I_A\subseteq R$;
2. $R$ is irreflexive if and only if $R\cap I_A=\emptyset$;
3. $R$ is symmetric if and only if $R=R^{-1}$;
4. $R$ is antisymmetric if and only if $R\cap R^{-1}\subseteq I_A$;
5. $R$ is transitive if and only if $R\circ R\subseteq R$.

(Theorem 2.4.1 in the textbook.)
:::

*Ideas* (the lecture skips 1–4): (1) $I_A$ is exactly the set of all loops. (2) No
pair of $R$ is a loop. (3) $R^{-1}$ is $R$ with all arrows reversed; reversing
changes nothing exactly when every arrow already has its reverse. (Strictly,
symmetry gives $R^{-1}\subseteq R$, and applying it to $R^{-1}$ gives the other
inclusion.) (4) $\langle x,y\rangle\in R\cap R^{-1}$ means both $\langle x,y\rangle$ and
$\langle y,x\rangle$ are in $R$; antisymmetry says that only happens for $x=y$, i.e.
for pairs in $I_A$. (5) $R\circ R$ is the set of two-step chains' endpoints, and
transitivity says each of them is already in $R$.

*Proof of 5.* **Necessity** {{zh 必要性}} ("transitive ⇒ $R\circ R\subseteq R$"): take any
$\langle x,y\rangle\in R\circ R$. By the definition of composition there is a $t$ with
$\langle x,t\rangle\in R$ and $\langle t,y\rangle\in R$. Since $R$ is transitive,
$\langle x,y\rangle\in R$. So $R\circ R\subseteq R$.

**Sufficiency** {{zh 充分性}} ("$R\circ R\subseteq R$ ⇒ transitive"): suppose
$\langle x,y\rangle\in R$ and $\langle y,z\rangle\in R$. Then
$\langle x,z\rangle\in R\circ R\subseteq R$, so $\langle x,z\rangle\in R$, and $R$ is
transitive. $\blacksquare$

In the language of Lesson 2.3: $R$ is transitive exactly when $R^2\subseteq R$, i.e.
"anything reachable in two steps is reachable in one".

::: example Union and intersection of relations with a property
Let $R_1$, $R_2$ be relations on $A$. Prove:
1. if $R_1$, $R_2$ are reflexive and symmetric, so is $R_1\cup R_2$;
2. if $R_1$, $R_2$ are transitive, so is $R_1\cap R_2$.
== 1. Reflexive ==
(The lecture omits this proof.) $I_A\subseteq R_1\subseteq R_1\cup R_2$, so
$R_1\cup R_2$ is reflexive by Theorem 2.4.1(1).
== 1. Symmetric ==
The inverse of a union is the union of the inverses,
$(R_1\cup R_2)^{-1}=R_1^{-1}\cup R_2^{-1}$ (reverse each arrow), and this equals $R_1\cup R_2$ because
$R_1^{-1}=R_1$ and $R_2^{-1}=R_2$. By Theorem 2.4.1(3), $R_1\cup R_2$ is symmetric.
Element-wise: if $\langle x,y\rangle\in R_1\cup R_2$, it is in $R_1$ or in $R_2$, so
$\langle y,x\rangle$ is in the same one.
== 2. Transitive ==
Take $\langle x,y\rangle\in R_1\cap R_2$ and $\langle y,z\rangle\in R_1\cap R_2$. Then
$\langle x,y\rangle,\langle y,z\rangle\in R_1$ and
$\langle x,y\rangle,\langle y,z\rangle\in R_2$. By the transitivity of $R_1$ and of
$R_2$, $\langle x,z\rangle\in R_1$ and $\langle x,z\rangle\in R_2$, so
$\langle x,z\rangle\in R_1\cap R_2$. Hence $R_1\cap R_2$ is transitive.
:::

## Seeing properties in matrices and graphs

For a small relation it's quickest to look at its relation matrix $M=(r_{ij})$ or its
relation graph (Lesson 2.1). Each set criterion becomes a visual rule:

| Property | Set criterion | Relation matrix | Relation graph |
| --- | --- | --- | --- |
| Reflexive | $I_A\subseteq R$ | every main-diagonal entry is 1 | a loop at every vertex |
| Irreflexive | $R\cap I_A=\emptyset$ | every main-diagonal entry is 0 | no loops at all |
| Symmetric | $R=R^{-1}$ | the matrix is symmetric ($M=M^{\mathsf T}$) | no one-way arrows: arrows between different vertices come in pairs |
| Antisymmetric | $R\cap R^{-1}\subseteq I_A$ | if $r_{ij}=1$ and $i\ne j$, then $r_{ji}=0$ | no two-way pairs of arrows between different vertices (loops allowed) |
| Transitive | $R\circ R\subseteq R$ | wherever the Boolean square $M^2$ has a 1, $M$ has a 1 | whenever $x_i\to x_j$ and $x_j\to x_k$, also $x_i\to x_k$ |

The transitivity test uses the Boolean matrix product from Lesson 2.3: $M^2$ is the
matrix of $R\circ R$.

::: example Graph (a): which properties?
The relation on $\{1,2,3\}$ drawn below: a loop at 1, and arrows both ways between 1 and
2, and between 1 and 3. So $R=\{\langle1,1\rangle,\langle1,2\rangle,\langle2,1\rangle,\langle1,3\rangle,\langle3,1\rangle\}$.
== Reflexive / irreflexive ==
2 and 3 have no loop, so not reflexive; 1 has a loop, so not irreflexive.
== Symmetric / antisymmetric ==
Every arrow between different vertices has its partner: **symmetric**. The pair
$1\rightleftarrows2$ is two-way with $1\ne2$: not antisymmetric.
== Transitive ==
$2\to1\to3$, but there is no arrow $2\to3$: not transitive.
== Answer ==
Only symmetric.
:::

::: graph (a) Symmetric, but not transitive
at 1: 180, 40
at 2: 70, 220
at 3: 290, 220
1 -> 1, 1 -> 2, 2 -> 1, 1 -> 3, 3 -> 1
:::

::: example Graph (b): which properties?
On $\{1,2,3\}$: arrows $2\to1$ and $3\to1$, no loops. $R=\{\langle2,1\rangle,\langle3,1\rangle\}$.
== Loops ==
No loops: **irreflexive**, not reflexive.
== Symmetric / antisymmetric ==
$2\to1$ has no partner $1\to2$: not symmetric. No two-way pair: **antisymmetric**.
== Transitive ==
Both arrows end at 1, and nothing leaves 1, so there is no chain of two arrows:
**transitive** (vacuously).
== Answer ==
Irreflexive, antisymmetric and transitive.
:::

::: graph (b) Irreflexive, antisymmetric and transitive
at 1: 180, 40
at 2: 70, 220
at 3: 290, 220
2 -> 1, 3 -> 1
:::

::: example Graph (c): which properties?
On $\{1,2,3\}$: a loop at each vertex and a directed triangle $1\to3\to2\to1$.
$R=\{\langle1,1\rangle,\langle2,2\rangle,\langle3,3\rangle,\langle1,3\rangle,\langle3,2\rangle,\langle2,1\rangle\}$.
== Loops ==
Every vertex has a loop: **reflexive**, not irreflexive.
== Symmetric / antisymmetric ==
$1\to3$ without $3\to1$: not symmetric. Each pair of different vertices has exactly one
arrow: **antisymmetric**.
== Transitive, by the graph ==
$2\to1\to3$, but no $2\to3$: not transitive.
== Transitive, by the matrix ==
$$M=\begin{bmatrix}1&0&1\\1&1&0\\0&1&1\end{bmatrix},\qquad
M^2=\begin{bmatrix}1&1&1\\1&1&1\\1&1&1\end{bmatrix}.$$
$M^2$ has a 1 in position $(1,2)$ where $M$ has a 0 (the route $1\to3\to2$), so
$R\circ R\not\subseteq R$.
== Answer ==
Reflexive and antisymmetric.
:::

::: graph (c) Reflexive and antisymmetric, but not transitive
at 1: 180, 40
at 2: 70, 220
at 3: 290, 220
1 -> 1, 2 -> 2, 3 -> 3, 1 -> 3, 3 -> 2, 2 -> 1
:::

::: callout key The one idea to remember
Each property is a picture: **loops everywhere** (reflexive), **no loops**
(irreflexive), **arrows in pairs** (symmetric), **no pairs** (antisymmetric),
**every two-step route has a shortcut** (transitive). The set criteria
$I_A\subseteq R$, $R\cap I_A=\emptyset$, $R=R^{-1}$, $R\cap R^{-1}\subseteq I_A$,
$R\circ R\subseteq R$ say the same thing in symbols.
:::

## Which operations keep the properties

If $R_1$ and $R_2$ both have a property, does the inverse, intersection, union,
difference or composition still have it? The answer (✓ = always keeps it, ✗ = may
lose it):

| Operation | Reflexive | Irreflexive | Symmetric | Antisymmetric | Transitive |
| --- | --- | --- | --- | --- | --- |
| inverse $R_1^{-1}$ | ✓ | ✓ | ✓ | ✓ | ✓ |
| intersection $R_1\cap R_2$ | ✓ | ✓ | ✓ | ✓ | ✓ |
| union $R_1\cup R_2$ | ✓ | ✓ | ✓ | ✗ | ✗ |
| difference $R_1-R_2$ | ✗ | ✓ | ✓ | ✓ | ✗ |
| composition $R_1\circ R_2$ | ✓ | ✗ | ✗ | ✗ | ✗ |

::: callout note A correction to the slide's table
The table on the slide marks composition as keeping transitivity (✓). That is wrong,
and the next lecture opened with a counterexample (below): the composition of two
transitive relations need not be transitive. The table here has the correct ✗. Every
other entry agrees with the slide; we checked all of them against every pair of
relations on a three-element set.
:::

How to remember it:

- **Inverse** only turns the arrows round, which turns each picture into one of the
  same kind. For transitivity, the lecture's proof: let
  $\langle x,y\rangle,\langle y,z\rangle\in R_1^{-1}$. Then
  $\langle y,x\rangle,\langle z,y\rangle\in R_1$; by transitivity
  $\langle z,x\rangle\in R_1$, so $\langle x,z\rangle\in R_1^{-1}$.
- **Intersection** keeps everything: "all loops" survives since both have all loops;
  "for every pair … something" survives because each surviving pair, and whatever the
  property demands of it, is in both relations (the transitivity proof is above).
- **Union** keeps the "loops" properties and symmetry, but can create a new two-way
  pair or a new chain without shortcut: $\{\langle1,2\rangle\}$ and
  $\{\langle2,1\rangle\}$ are both antisymmetric and transitive, but their union
  $\{\langle1,2\rangle,\langle2,1\rangle\}$ is neither antisymmetric nor transitive (it
  lacks $\langle1,1\rangle$).
- **Difference** $R_1-R_2$ is a subset of $R_1$. Removing pairs can't create loops or
  two-way pairs, so irreflexivity and antisymmetry stay. Symmetry stays too: if
  $\langle x,y\rangle\in R_1-R_2$ then $\langle y,x\rangle\in R_1$, and
  $\langle y,x\rangle\notin R_2$ (otherwise $\langle x,y\rangle\in R_2$, $R_2$ being
  symmetric). But removing can destroy "all loops" ($I_A-I_A=\emptyset$) and remove a
  shortcut: $\{\langle1,2\rangle,\langle2,3\rangle,\langle1,3\rangle\}-\{\langle1,3\rangle\}=\{\langle1,2\rangle,\langle2,3\rangle\}$
  is not transitive.
- **Composition** keeps reflexivity: $\langle x,x\rangle\in R_1$ and
  $\langle x,x\rangle\in R_2$ give $\langle x,x\rangle\in R_1\circ R_2$. It loses the
  others; irreflexivity, for example: $\{\langle1,2\rangle\}\circ\{\langle2,1\rangle\}=\{\langle1,1\rangle\}$.
  The other three are the lecture's worked examples below.

::: example Composition need not keep symmetry
Find symmetric $R_1$, $R_2$ whose composition $R_1\circ R_2$ is not symmetric.
== The relations ==
$R_1=\{\langle x,y\rangle,\langle y,x\rangle,\langle y,z\rangle,\langle z,y\rangle\}$
and $R_2=\{\langle y,a\rangle,\langle a,y\rangle\}$: each is symmetric (its pairs come
two by two).
== The composition ==
$R_1$ first, then $R_2$: the only step of $R_2$ that starts where an $R_1$ step ends is
$y\to a$; $R_1$ reaches $y$ from $x$ and from $z$. So
$R_1\circ R_2=\{\langle x,a\rangle,\langle z,a\rangle\}$.
== Conclusion ==
$\langle x,a\rangle$ is in but $\langle a,x\rangle$ is not: not symmetric.
:::

::: callout note A correction to the slide's example
The slide takes $R_1=\{\langle x,y\rangle,\langle y,z\rangle\}$, which is **not**
symmetric (it lacks $\langle y,x\rangle$ and $\langle z,y\rangle$), so it doesn't
prove the point. Adding the two reverse pairs, as above, fixes it; the slide's answer
$\{\langle x,a\rangle\}$ was the right composition for the sets it gave.
:::

::: example Composition need not keep antisymmetry
Take $R_1=\{\langle x,y\rangle,\langle a,a\rangle\}$ and
$R_2=\{\langle y,a\rangle,\langle a,x\rangle\}$. Both are antisymmetric (no two-way pair
of different elements).
== The composition ==
$x\to y$ in $R_1$, then $y\to a$ in $R_2$: $\langle x,a\rangle$.
$a\to a$ in $R_1$, then $a\to x$ in $R_2$: $\langle a,x\rangle$.
So $R_1\circ R_2=\{\langle x,a\rangle,\langle a,x\rangle\}$.
== Conclusion ==
$\langle x,a\rangle$ and $\langle a,x\rangle$ with $x\ne a$: not antisymmetric.
:::

::: example Composition need not keep transitivity
Take $R_1=\{\langle a,b\rangle,\langle c,d\rangle\}$ and
$R_2=\{\langle b,c\rangle,\langle d,h\rangle\}$.
== Both are transitive ==
Neither has a chain of two pairs ($R_1$: nothing starts at $b$ or $d$; $R_2$: nothing
starts at $c$ or $h$), so both are transitive vacuously.
== The composition ==
$a\to b$ then $b\to c$ gives $\langle a,c\rangle$; $c\to d$ then $d\to h$ gives
$\langle c,h\rangle$. So $R_1\circ R_2=\{\langle a,c\rangle,\langle c,h\rangle\}$.
== Conclusion ==
$\langle a,c\rangle$ and $\langle c,h\rangle$ are in, but $\langle a,h\rangle$ is not:
not transitive.
:::

::: callout pitfall Composition order in these examples
These answers use the course's order: in $R_1\circ R_2$ the step in $R_1$ comes first
(Lesson 2.2). With the other books' order you'd compute $R_2$ first and get different
pairs: in the last example, "$R_2$ first, then $R_1$" gives only $\langle b,d\rangle$
($b\to c$, then $c\to d$), which happens to be transitive. Always check which
convention a question uses.
:::

::: callout exam What exams ask
- Given a relation as a set, a matrix or a graph, say which of the five properties it
  has, **with a reason** for each (a missing loop, a one-way arrow, a chain without a
  shortcut).
- True or false: "if $R_1$, $R_2$ are … then $R_1\cup R_2$ / $R_1\circ R_2$ is …":
  prove it, or give a small counterexample.
- Prove a criterion such as "transitive $\iff R\circ R\subseteq R$".
- Count: reflexive relations on an $n$-element set, $2^{n^2-n}$.
:::

::: cards Properties of relations
Reflexive relation on $A$ :: $\langle x,x\rangle\in R$ for every $x\in A$; equivalently $I_A\subseteq R$; a loop at every vertex.
Irreflexive relation on $A$ :: $\langle x,x\rangle\notin R$ for every $x\in A$; equivalently $R\cap I_A=\emptyset$; no loops.
Symmetric relation :: $\langle x,y\rangle\in R\Rightarrow\langle y,x\rangle\in R$; equivalently $R=R^{-1}$; symmetric matrix, no one-way arrows.
Antisymmetric relation :: $\langle x,y\rangle,\langle y,x\rangle\in R\Rightarrow x=y$; equivalently $R\cap R^{-1}\subseteq I_A$; no two-way arrows between different vertices.
Transitive relation :: $\langle x,y\rangle,\langle y,z\rangle\in R\Rightarrow\langle x,z\rangle\in R$; equivalently $R\circ R\subseteq R$.
Matrix test for transitivity :: Every 1 of the Boolean square $M^2$ is also a 1 of $M$.
Relations both symmetric and antisymmetric :: Exactly those made of loops only, $R\subseteq I_A$ (e.g. $I_A$, $\emptyset$).
Not reflexive vs irreflexive :: Not reflexive: some loop missing. Irreflexive: every loop missing. Most relations are neither.
Number of reflexive relations on an n-element set :: $2^{n^2-n}$, the same as the number of irreflexive ones.
Properties of the empty relation on a non-empty set :: Irreflexive, symmetric, antisymmetric, transitive; not reflexive.
Operations that keep all five properties :: Inverse and intersection.
What composition keeps :: Only reflexivity; it can lose irreflexivity, symmetry, antisymmetry and transitivity.
What union and difference lose :: Union: antisymmetry and transitivity. Difference: reflexivity and transitivity.
:::

::: quiz Check yourself
? Which of these equals the set of all relations on $A$? (The lecture's single-choice question.)
- [ ] The reflexive relations together with the irreflexive ones
- [ ] The reflexive relations together with the symmetric ones
- [ ] The symmetric relations together with the antisymmetric ones
- [x] The transitive relations together with the non-transitive ones
> Every relation is either transitive or not, so D covers everything (Rain Classroom's answer: D). The others miss relations: $\{\langle a,a\rangle,\langle a,b\rangle\}$ on $\{a,b\}$ is neither reflexive nor irreflexive, and $\{\langle a,b\rangle,\langle b,c\rangle,\langle c,b\rangle\}$ on $\{a,b,c\}$ is not reflexive, not symmetric and not antisymmetric. On a 3-element set, the unions in A, B and C hold only 128, 120 and 272 of the 512 relations.

? True or false: a set $X$ has exactly as many reflexive relations as irreflexive ones.
- [x] True
- [ ] False
> Both are $2^{n^2-n}$: the $n$ loops are fixed (all in, or all out) and the other $n^2-n$ pairs are free. Switching every loop turns one kind into the other.

? How many reflexive relations are there on a set with $n$ elements?
expression: 2^(n^2 - n)
variables: n
> The $n$ loops must all be in; each of the other $n^2-n$ ordered pairs is in or out freely: $2^{n^2-n}$.

? On $\{1,2,3\}$, $R=\{\langle1,1\rangle,\langle1,2\rangle,\langle2,1\rangle,\langle1,3\rangle,\langle3,1\rangle\}$ (graph (a)). Which properties does $R$ have?
- [ ] reflexive
- [ ] irreflexive
- [x] symmetric
- [ ] antisymmetric
- [ ] transitive
> Loops: only at 1, so neither reflexive nor irreflexive. Arrows between different vertices come in pairs: symmetric, and so not antisymmetric ($1\rightleftarrows2$). $2\to1\to3$ without $2\to3$: not transitive.

? Which of these relations on $\{1,2,3\}$ are transitive?
- [x] $\{\langle1,2\rangle,\langle2,3\rangle,\langle1,3\rangle\}$
- [ ] $\{\langle1,2\rangle,\langle2,1\rangle\}$
- [x] $\{\langle3,1\rangle\}$
- [ ] $\{\langle1,2\rangle,\langle2,3\rangle\}$
- [x] $\{\langle1,1\rangle,\langle2,2\rangle,\langle1,2\rangle,\langle2,1\rangle\}$
> The first has one chain, $1\to2\to3$, and its shortcut. The second has the chain $1\to2\to1$ but no $\langle1,1\rangle$. $\{\langle3,1\rangle\}$ has no chain at all. The fourth lacks the shortcut $\langle1,3\rangle$. The fifth is $E_{\{1,2\}}$ on part of the set: every chain stays inside $\{1,2\}$, whose pairs are all there.

? For $R=\emptyset$ on $X=\{a,b\}$, how many of the five properties hold?
answer: 4
> Irreflexive, symmetric, antisymmetric and transitive all hold (the last three vacuously). Only reflexivity fails: $\langle a,a\rangle\notin\emptyset$.

? How many relations on $\{1,2,3\}$ are both symmetric and antisymmetric?
answer: 2^3
> Symmetric and antisymmetric together leave no arrows between different elements, so $R\subseteq I_A$: any subset of the 3 loops, $2^3=8$ relations.

? Congruence modulo 3 on the integers has which properties?
- [x] reflexive
- [ ] irreflexive
- [x] symmetric
- [ ] antisymmetric
- [x] transitive
> Same remainder as itself (reflexive), same remainder both ways (symmetric), and "same remainder" chains (transitive). Not antisymmetric: $1\equiv4$ and $4\equiv1$ but $1\ne4$. It is an equivalence relation (Lesson 2.6).

? Which property does the composition $R_1\circ R_2$ always keep when both $R_1$ and $R_2$ have it? Give its name.
text: reflexive | reflexivity | reflexive relation | 自反 | 自反性
> If $\langle x,x\rangle$ is in both, then $x\to x$ in $R_1$ followed by $x\to x$ in $R_2$ puts $\langle x,x\rangle$ in $R_1\circ R_2$. The other four properties can be lost (see the examples).

? $R_1$ and $R_2$ are transitive relations on $A$. Which of these must be transitive?
- [x] $R_1^{-1}$
- [x] $R_1\cap R_2$
- [ ] $R_1\cup R_2$
- [ ] $R_1-R_2$
- [ ] $R_1\circ R_2$
> Inverse and intersection keep transitivity (proved above). Counterexamples: $\{\langle1,2\rangle\}\cup\{\langle2,1\rangle\}$; $\{\langle1,2\rangle,\langle2,3\rangle,\langle1,3\rangle\}-\{\langle1,3\rangle\}$; $\{\langle a,b\rangle,\langle c,d\rangle\}\circ\{\langle b,c\rangle,\langle d,h\rangle\}=\{\langle a,c\rangle,\langle c,h\rangle\}$.
:::

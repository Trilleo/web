---
title: Set operations and their laws
zh: 集合的运算及其性质
summary: Union, intersection, difference, symmetric difference and complement with their Venn diagrams, the laws of set algebra, element-wise proofs, and the further results on inclusion and symmetric difference.
source: 1-集合 (§1.2 集合的运算, §1.3 集合运算的性质), 2026-09-01
---

Numbers are combined with $+$, $-$, $\times$; sets are combined with operations of their
own: "in this one **or** that one", "in **both**", "in this one **but not** that one".
This lesson defines the five operations of the course, draws each as a Venn diagram, and
collects the **laws** they obey — the set version of rules like $a + b = b + a$. With
the laws you can simplify set expressions the way you simplify algebra, and with the
**element-wise proof** you can prove any new identity yourself. Both are standard exam
material, and the same laws come back as the laws of logic and of relations.

Throughout, $E$ is the universal set (Lesson 1.1) and $A, B, C$ are subsets of it, which
the slides write as $A, B, C \in P(E)$: being a subset of $E$ is the same as being an
element of its power set. In the Venn diagrams the rectangle is $E$ (marked $\Omega$ in
the drawings) and each circle is a set.

## Union, intersection and difference

Think of a class's students, $A$ = those who play football and $B$ = those who play
basketball. "Plays football or basketball (or both)", "plays both", and "plays football
but not basketball" are three new sets. We use two logic words: $\vee$ for "or" (at least
one; also both) and $\wedge$ for "and".

::: define Union | 并集
The **union** of $A$ and $B$ is the set of elements in $A$ or in $B$ (or both):
$$A \cup B = \{x \mid x \in A \vee x \in B\}.$$
:::

::: define Intersection | 交集
The **intersection** of $A$ and $B$ is the set of elements in both:
$$A \cap B = \{x \mid x \in A \wedge x \in B\}.$$
:::

::: define Relative complement | 相对补集
The **relative complement of $B$ in $A$**, also called the **difference** (差) of $A$
and $B$, is the set of elements of $A$ that are not in $B$:
$$A - B = \{x \mid x \in A \wedge x \notin B\}.$$
:::

These three are Definition 1.2.1 in the textbook.

::: venn Union, intersection and difference
shade: A ∪ B
shade: A ∩ B
shade: A - B
:::

::: callout pitfall A − B removes only what A and B share
$A - B$ doesn't require $B \subseteq A$: elements of $B$ outside $A$ were never in $A$,
so there is nothing to remove. For example $\{1, 2, 3\} - \{3, 4, 5\} = \{1, 2\}$. And
$A - B \neq B - A$ in general: here $B - A = \{4, 5\}$.
:::

Union and intersection extend to any number of sets:
$$\begin{gathered}
A_1 \cup A_2 \cup \cdots \cup A_n = \{x \mid x \in A_1 \vee x \in A_2 \vee \cdots \vee x \in A_n\},\\
A_1 \cap A_2 \cap \cdots \cap A_n = \{x \mid x \in A_1 \wedge x \in A_2 \wedge \cdots \wedge x \in A_n\},
\end{gathered}$$
written for short $\bigcup_{i=1}^n A_i$ (in at least one $A_i$) and $\bigcap_{i=1}^n A_i$
(in every $A_i$).

::: define Disjoint sets | 不交
Two sets are **disjoint** when their intersection is empty: $A \cap B = \varnothing$.
Several sets are **pairwise disjoint** (两两不相交) when every two of them are disjoint.
:::

For example $\{1, 2\}$, $\{3\}$, $\{4, 5\}$ are pairwise disjoint. Note that three sets
can have $A_1 \cap A_2 \cap A_3 = \varnothing$ without being pairwise disjoint:
$\{1, 2\}$, $\{2, 3\}$, $\{3, 1\}$ have no element common to all three, but every two of
them meet. Pairwise disjoint sets will be the blocks of a **partition** in Lesson 2.6.

## Symmetric difference and complement

::: define Symmetric difference | 对称差
The **symmetric difference** of $A$ and $B$ is the set of elements in exactly one of
them (Definition 1.2.2):
$$A \oplus B = (A - B) \cup (B - A).$$
:::

It is "or, but not both" — the exclusive or. Equivalently,
$A \oplus B = (A \cup B) - (A \cap B)$: take the union and remove the overlap. For
example, if $A = \{a, b, c\}$ and $B = \{b, d\}$, then $A - B = \{a, c\}$,
$B - A = \{d\}$, so $A \oplus B = \{a, c, d\}$.

::: define Absolute complement | 绝对补集
Given the universal set $E$, the **absolute complement** (or just **complement**, 补集)
of $A \subseteq E$ is everything in $E$ outside $A$ (Definition 1.2.3):
$$\sim A = E - A = \{x \mid x \in E \wedge x \notin A\}.$$
:::

Other books write $\overline{A}$ or $A^c$ for $\sim A$; this course uses $\sim A$. The
complement only makes sense once $E$ is fixed: the complement of the even numbers is the
odd numbers in $E = \mathbb{N}$, but something else in $E = \mathbb{Z}$ or $\mathbb{R}$.

::: venn Symmetric difference and complement
shade: A ⊕ B
shade: A'
:::

(The drawing labels the complement $A'$; it is the same set as $\sim A$.)

::: example All five operations
Let $E = \{1, 2, 3, 4, 5, 6, 7, 8\}$, $A = \{1, 2, 3, 4\}$, $B = \{3, 4, 5, 6\}$. Find
$A \cup B$, $A \cap B$, $A - B$, $B - A$, $A \oplus B$, $\sim A$ and $\sim(A \cup B)$.
== Union and intersection ==
$A \cup B = \{1, 2, 3, 4, 5, 6\}$; $A \cap B = \{3, 4\}$.
== The two differences ==
$A - B = \{1, 2\}$ (remove 3 and 4 from $A$); $B - A = \{5, 6\}$.
== Symmetric difference ==
$A \oplus B = \{1, 2\} \cup \{5, 6\} = \{1, 2, 5, 6\}$, which is also
$(A \cup B) - (A \cap B) = \{1, \dots, 6\} - \{3, 4\}$.
== Complements ==
$\sim A = E - A = \{5, 6, 7, 8\}$; $\sim(A \cup B) = \{7, 8\}$. Check with De Morgan's
law below: $\sim A \cap \sim B = \{5, 6, 7, 8\} \cap \{1, 2, 7, 8\} = \{7, 8\}$. ✓
:::

## The laws of set operations

Each law below holds for **all** subsets $A, B, C$ of $E$. The idea behind most of them
is that set operations copy logic: $\cup$ is "or", $\cap$ is "and", $\sim$ is "not". So
each law is a law of logic in disguise ("$p$ or $p$" is just $p$; "not (p or q)" is "not
p and not q"). The equation numbers are the textbook's.

::: law Idempotent laws | 幂等律
$$A \cup A = A \quad (1.3.1), \qquad A \cap A = A \quad (1.3.2).$$
:::

::: law Associative laws | 结合律
$$\begin{gathered}
(A \cup B) \cup C = A \cup (B \cup C) \quad (1.3.3),\\
(A \cap B) \cap C = A \cap (B \cap C) \quad (1.3.4).
\end{gathered}$$
:::

So brackets can be dropped in a chain of unions, or of intersections:
$A \cup B \cup C$.

::: law Commutative laws | 交换律
$$A \cup B = B \cup A \quad (1.3.5), \qquad A \cap B = B \cap A \quad (1.3.6).$$
:::

::: law Distributive laws | 分配律
$$\begin{gathered}
A \cup (B \cap C) = (A \cup B) \cap (A \cup C) \quad (1.3.7),\\
A \cap (B \cup C) = (A \cap B) \cup (A \cap C) \quad (1.3.8).
\end{gathered}$$
:::

Unlike numbers — where $a \times (b + c) = ab + ac$ but $a + bc \neq (a + b)(a + c)$ —
**each** of $\cup$ and $\cap$ distributes over the other. The two sides of (1.3.7) shade
the same region:

::: venn Distributive law (1.3.7): both sides agree
sets: A B C
shade: A ∪ (B ∩ C)
shade: (A ∪ B) ∩ (A ∪ C)
:::

::: law Identity laws | 同一律
$$A \cup \varnothing = A \quad (1.3.9), \qquad A \cap E = A \quad (1.3.10).$$
:::

::: law Zero laws | 零律
$$A \cup E = E \quad (1.3.11), \qquad A \cap \varnothing = \varnothing \quad (1.3.12).$$
:::

$\varnothing$ behaves like $0$ for $\cup$ (adding it changes nothing) and $E$ like $1$ for
$\cap$; but $E$ "absorbs" everything in a union, and $\varnothing$ everything in an
intersection.

::: law Law of excluded middle | 排中律
$$A \cup \sim A = E \quad (1.3.13).$$
:::

::: law Law of contradiction | 矛盾律
$$A \cap \sim A = \varnothing \quad (1.3.14).$$
:::

Every element of $E$ is in $A$ or not in $A$ (there is no "middle" option), and nothing
is both.

::: law Absorption laws | 吸收律
$$A \cup (A \cap B) = A \quad (1.3.15), \qquad A \cap (A \cup B) = A \quad (1.3.16).$$
:::

Why: $A \cap B$ is a part of $A$, so adding it to $A$ adds nothing; $A$ is a part of
$A \cup B$, so cutting $A \cup B$ down to $A$ leaves $A$.

::: law De Morgan's laws | 德摩根律
For relative complements:
$$\begin{gathered}
A - (B \cup C) = (A - B) \cap (A - C) \quad (1.3.17),\\
A - (B \cap C) = (A - B) \cup (A - C) \quad (1.3.18).
\end{gathered}$$
For absolute complements:
$$\begin{gathered}
\sim(B \cup C) = \sim B \cap \sim C \quad (1.3.19),\\
\sim(B \cap C) = \sim B \cup \sim C \quad (1.3.20),\\
\sim\varnothing = E \quad (1.3.21), \qquad \sim E = \varnothing \quad (1.3.22).
\end{gathered}$$
:::

In words: "not in ($B$ or $C$)" is "not in $B$ and not in $C$"; "not in ($B$ and $C$)" is
"not in $B$ or not in $C$". The complement **swaps $\cup$ and $\cap$**. Laws (1.3.19) and
(1.3.20) are (1.3.17) and (1.3.18) with $A = E$.

::: venn De Morgan's law (1.3.19): both sides agree
shade: (B ∪ C)'
shade: B' ∩ C'
:::

::: law Double negation | 双重否定律
$$\sim\sim A = A \quad (1.3.23).$$
:::

::: callout pitfall Complement of a union
$\sim(B \cup C)$ is **not** $\sim B \cup \sim C$. With $E = \{1, 2, 3\}$, $B = \{1\}$,
$C = \{2\}$: $\sim(B \cup C) = \{3\}$, but $\sim B \cup \sim C = \{2, 3\} \cup \{1, 3\} =
E$. When a complement passes through brackets, the operation inside flips.
:::

## Proving set identities element by element

To prove $X = Y$ for sets, use the definition of equality (Lesson 1.1): prove
$X \subseteq Y$ and $Y \subseteq X$. To prove $X \subseteq Y$, take an arbitrary
$x \in X$ and show $x \in Y$ by unpacking the definitions. This is the **element-wise
proof** (the slides' 证明 by 对任意的 $x$). A Venn diagram makes a law believable, but
only a proof like this proves it.

::: example Proof of De Morgan's law (1.3.17)
Prove $A - (B \cup C) = (A - B) \cap (A - C)$.
== Left ⊆ right ==
Take any $x \in A - (B \cup C)$. Then $x \in A$ and $x \notin B \cup C$. Not being in
$B \cup C$ means not in $B$ **and** not in $C$. So $x \in A$, $x \notin B$, $x \notin C$,
which gives $x \in A - B$ and $x \in A - C$, so $x \in (A - B) \cap (A - C)$. Hence
$A - (B \cup C) \subseteq (A - B) \cap (A - C)$.
== Right ⊆ left ==
Take any $x \in (A - B) \cap (A - C)$. Then $x \in A - B$ and $x \in A - C$, so
$x \in A$, $x \notin B$ and $x \notin C$. Therefore $x \notin B \cup C$, and
$x \in A - (B \cup C)$. Hence $(A - B) \cap (A - C) \subseteq A - (B \cup C)$.
== Conclusion ==
Each side contains the other, so $A - (B \cup C) = (A - B) \cap (A - C)$.
:::

For the absolute complement, two facts make the bookkeeping easier: (1) an $x$ outside
$E$ has nothing to do with either side, so we only need to consider $x \in E$; and
(2) for $x \in E$, $x \notin \sim A \iff x \in A$ and $x \in \sim A \iff x \notin A$.

::: example Proof of De Morgan's law (1.3.19)
Prove $\sim(B \cup C) = \sim B \cap \sim C$.
== Left ⊆ right ==
Take any $x \in \sim(B \cup C)$. Then $x \notin B \cup C$, so $x \notin B$ and
$x \notin C$, that is $x \in \sim B$ and $x \in \sim C$. So $x \in \sim B \cap \sim C$,
and $\sim(B \cup C) \subseteq \sim B \cap \sim C$.
== Right ⊆ left ==
Take any $x \in \sim B \cap \sim C$. Then $x \in \sim B$ and $x \in \sim C$, so
$x \notin B$ and $x \notin C$, hence $x \notin B \cup C$ and $x \in \sim(B \cup C)$. So
$\sim B \cap \sim C \subseteq \sim(B \cup C)$.
== Conclusion ==
Both inclusions hold, so $\sim(B \cup C) = \sim B \cap \sim C$. The same argument works
for any number of sets:
$\sim(A_1 \cup \cdots \cup A_n) = \sim A_1 \cap \cdots \cap \sim A_n$.
:::

Once the laws are proved, new identities can also be proved by **calculation**, using
the laws as rewriting rules — like simplifying algebra.

::: example A proof by the laws
Show that $(A - B) \cup B = A \cup B$.
== Write the difference with a complement ==
By (1.3.27) below, $A - B = A \cap \sim B$, so the left side is
$(A \cap \sim B) \cup B$.
== Distribute ==
By the distributive law (1.3.7) (with commutativity),
$(A \cap \sim B) \cup B = (A \cup B) \cap (\sim B \cup B)$.
== Simplify ==
$\sim B \cup B = E$ (excluded middle), and $(A \cup B) \cap E = A \cup B$ (identity). So
$(A - B) \cup B = A \cup B$.
== What this says ==
Removing $B$ from $A$ and then adding $B$ back gives $A \cup B$, which is $A$ only when
$B \subseteq A$.
:::

## More results on inclusion

Besides the laws, the textbook lists results that are used constantly.

::: theorem Inclusions and differences | 集合运算的其他性质
For all sets $A$, $B$ (results 1.3.24–1.3.27 in the textbook):
$$\begin{gathered}
A \cap B \subseteq A, \quad A \cap B \subseteq B \quad (1.3.24),\\
A \subseteq A \cup B, \quad B \subseteq A \cup B \quad (1.3.25),\\
A \subseteq A \quad (1.3.26),\\
A - B = A \cap \sim B \quad (1.3.27).
\end{gathered}$$
:::

(1.3.27) turns every difference into an intersection with a complement, so the
De Morgan and distributive laws can be applied to it: $x \in A - B$ means $x \in A$ and
$x \notin B$, that is $x \in A$ and $x \in \sim B$.

::: theorem Four ways to say A ⊆ B | 包含关系的等价条件
For all sets $A$, $B$ (1.3.28 in the textbook):
$$A \cup B = B \iff A \subseteq B \iff A \cap B = A \iff A - B = \varnothing.$$
:::

The idea: $A \subseteq B$ means $A$ lies inside $B$. Then adding $A$ to $B$ changes
nothing, cutting $A$ down to the part inside $B$ changes nothing, and removing $B$ from
$A$ leaves nothing. The slides prove the first equivalence; the others are proved the
same way.

::: example Proof of (1.3.28)
Prove that the four statements are equivalent.
== From A ⊆ B to A ∪ B = B (the slides: the simple side gives the complex one directly) ==
If $A \subseteq B$, every element of $A \cup B$ is in $A$ or in $B$, and in either case
in $B$; so $A \cup B \subseteq B$, and $B \subseteq A \cup B$ by (1.3.25). So
$A \cup B = B$.
== From A ∪ B = B to A ⊆ B (the slides: by contradiction) ==
Suppose $A \cup B = B$ but $A \subseteq B$ fails. Then some $x \in A$ has $x \notin B$.
This $x$ is in $A \cup B$ but not in $B$, so $A \cup B \neq B$: a contradiction.
== A ⊆ B and A ∩ B = A ==
If $A \subseteq B$: $A \cap B \subseteq A$ by (1.3.24), and each $x \in A$ is also in
$B$, so in $A \cap B$; so $A \cap B = A$. Conversely, if $A \cap B = A$, then
$A = A \cap B \subseteq B$ by (1.3.24).
== A ⊆ B and A − B = ∅ ==
$A - B$ is the set of elements of $A$ that are not in $B$. It is empty exactly when no
element of $A$ is outside $B$, which is exactly $A \subseteq B$.
:::

::: callout exam The in-class question
Typical questions give four identities and ask which one is false. A common trap is
$(A - B) \cup B = A$: it only holds when $B \subseteq A$; in general the left side is
$A \cup B$ (the example above).
:::

## Properties of the symmetric difference

::: theorem Properties of the symmetric difference | 对称差的性质
For all sets $A$, $B$, $C$ (1.3.29–1.3.33 in the textbook):
$$\begin{gathered}
A \oplus B = B \oplus A \quad (1.3.29),\\
(A \oplus B) \oplus C = A \oplus (B \oplus C) \quad (1.3.30),\\
A \oplus \varnothing = A \quad (1.3.31),\\
A \oplus A = \varnothing \quad (1.3.32),\\
A \oplus B = A \oplus C \Rightarrow B = C \quad (1.3.33).
\end{gathered}$$
:::

The best way to remember them: $\oplus$ is like addition of bits (0 + 0 = 0, 1 + 0 = 1,
1 + 1 = 0), done element by element — "in" is 1, "out" is 0. It is commutative and
associative; $\varnothing$ adds nothing; every set is its own opposite ($A \oplus A$ is
empty). Associativity means $A \oplus B \oplus C$ needs no brackets: it is the set of
elements that lie in an **odd number** of the three sets.

::: venn A ⊕ B ⊕ C: elements in an odd number of the sets
sets: A B C
shade: A ⊕ B ⊕ C
:::

::: example Cancellation (1.3.33)
Prove that $A \oplus B = A \oplus C$ implies $B = C$.
== Idea ==
"Add" $A$ to both sides: since $A \oplus A = \varnothing$, the $A$ disappears, as when
subtracting a number from both sides of an equation.
== Proof ==
$$\begin{aligned}
B &= \varnothing \oplus B = (A \oplus A) \oplus B && \text{(1.3.31), (1.3.29), (1.3.32)}\\
  &= A \oplus (A \oplus B) && \text{(1.3.30)}\\
  &= A \oplus (A \oplus C) && \text{(the assumption)}\\
  &= (A \oplus A) \oplus C = \varnothing \oplus C = C. &&
\end{aligned}$$
:::

::: callout pitfall Union has no cancellation
The same is **false** for union and intersection. $\{1\} \cup \{1, 2\} =
\{1\} \cup \{2\}$, but $\{1, 2\} \neq \{2\}$; and $\{1\} \cap \{1, 2\} = \{1\} \cap
\{1, 3\}$, but $\{1, 2\} \neq \{1, 3\}$. Only $\oplus$ can be "undone".
:::

A useful consequence: $A \oplus B = \varnothing$ exactly when $A = B$ (cancel $A$ from
$A \oplus B = A \oplus A$).

## Summary

| Law | With $\cup$ | With $\cap$ |
| --- | --- | --- |
| Idempotent (幂等律) | $A \cup A = A$ | $A \cap A = A$ |
| Commutative (交换律) | $A \cup B = B \cup A$ | $A \cap B = B \cap A$ |
| Associative (结合律) | $(A \cup B) \cup C = A \cup (B \cup C)$ | $(A \cap B) \cap C = A \cap (B \cap C)$ |
| Distributive (分配律) | $A \cup (B \cap C) = (A \cup B) \cap (A \cup C)$ | $A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$ |
| Identity (同一律) | $A \cup \varnothing = A$ | $A \cap E = A$ |
| Zero (零律) | $A \cup E = E$ | $A \cap \varnothing = \varnothing$ |
| Excluded middle / contradiction | $A \cup \sim A = E$ | $A \cap \sim A = \varnothing$ |
| Absorption (吸收律) | $A \cup (A \cap B) = A$ | $A \cap (A \cup B) = A$ |
| De Morgan (德摩根律) | $\sim(B \cup C) = \sim B \cap \sim C$ | $\sim(B \cap C) = \sim B \cup \sim C$ |

Notice the **duality**: swapping $\cup \leftrightarrow \cap$ and
$\varnothing \leftrightarrow E$ in any law gives another law.

::: callout key One idea to remember
$\cup$, $\cap$, $\sim$ are "or", "and", "not" applied to membership. To prove an identity,
take an arbitrary $x$ and follow the definitions in both directions; to simplify one,
rewrite with $A - B = A \cap \sim B$ and the laws.
:::

::: cards Set operations
Union $A \cup B$ (并集) :: $\{x \mid x \in A \vee x \in B\}$: in at least one of them.
Intersection $A \cap B$ (交集) :: $\{x \mid x \in A \wedge x \in B\}$: in both.
Difference $A - B$ (相对补集) :: $\{x \mid x \in A \wedge x \notin B\}$; equals $A \cap \sim B$.
Symmetric difference $A \oplus B$ (对称差) :: $(A - B) \cup (B - A)$, also $(A \cup B) - (A \cap B)$: in exactly one.
Complement $\sim A$ (绝对补集) :: $E - A$: the elements of the universal set not in $A$.
Disjoint sets (不交) :: $A \cap B = \varnothing$; pairwise disjoint: every two of the sets are disjoint.
De Morgan for complements :: $\sim(B \cup C) = \sim B \cap \sim C$ and $\sim(B \cap C) = \sim B \cup \sim C$.
De Morgan for differences :: $A - (B \cup C) = (A - B) \cap (A - C)$ and $A - (B \cap C) = (A - B) \cup (A - C)$.
Absorption laws (吸收律) :: $A \cup (A \cap B) = A$ and $A \cap (A \cup B) = A$.
Distributive laws (分配律) :: $A \cup (B \cap C) = (A \cup B) \cap (A \cup C)$ and $A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$.
Four ways to say $A \subseteq B$ :: $A \cup B = B$, $A \cap B = A$, $A - B = \varnothing$ (1.3.28).
Properties of $\oplus$ :: Commutative, associative, $A \oplus \varnothing = A$, $A \oplus A = \varnothing$, cancellation.
How to prove $X = Y$ for sets :: Show $X \subseteq Y$ and $Y \subseteq X$, each by taking an arbitrary element.
$(A - B) \cup B$ equals :: $A \cup B$ (equal to $A$ only when $B \subseteq A$).
:::

::: quiz Check yourself
? Which statement is **false** in general? (in-class question)
- [ ] $\sim A \cup A = E$
- [ ] $(A - B) \cup B \supseteq A$
- [ ] $A \oplus B = B \oplus A$
- [x] $(A - B) \cup B = A$
> $(A - B) \cup B = A \cup B$, which equals $A$ only when $B \subseteq A$ (take $A = \varnothing$, $B = \{1\}$). The first is the law of excluded middle; the second holds since $A \cup B \supseteq A$; the third is commutativity of $\oplus$. Rain Classroom's answer: D.

? Let $A = \{a, b, c\}$ and $B = \{b, d\}$. Which set is $A \oplus B$?
- [ ] $\{b\}$
- [x] $\{a, c, d\}$
- [ ] $\{a, c\}$
- [ ] $\{a, b, c, d\}$
> $A - B = \{a, c\}$ and $B - A = \{d\}$, so $A \oplus B = \{a, c, d\}$: everything in the union except the shared $b$.

? With $E = \{1, \dots, 8\}$, $A = \{1, 2, 3, 4\}$, $B = \{3, 4, 5, 6\}$, how many elements does $\sim(A \cap B)$ have?
answer: 6
> $A \cap B = \{3, 4\}$, so $\sim(A \cap B) = E - \{3, 4\}$ has $8 - 2 = 6$ elements. By De Morgan it is also $\sim A \cup \sim B = \{5,6,7,8\} \cup \{1,2,7,8\}$.

? Which are equal to $A - B$ for all sets? (tick all)
- [x] $A \cap \sim B$
- [x] $A - (A \cap B)$
- [ ] $B - A$
- [x] $(A \cup B) - B$
> $A - B = A \cap \sim B$ is (1.3.27). Removing $A \cap B$ from $A$ removes exactly the elements of $A$ that are in $B$. $(A \cup B) - B$: the elements of $B$ go, leaving those of $A$ not in $B$. $B - A$ is different in general.

? Which statements are equivalent to $A \subseteq B$? (tick all)
- [x] $A \cup B = B$
- [x] $A \cap B = A$
- [x] $A - B = \varnothing$
- [ ] $B - A = \varnothing$
> The first three are (1.3.28). $B - A = \varnothing$ means $B \subseteq A$, the other direction.

? If $A \oplus B = \varnothing$, what can we conclude?
- [x] $A = B$
- [ ] $A = \varnothing$ and $B = \varnothing$
- [ ] $A \cap B = \varnothing$
- [ ] Nothing in particular
> $A \oplus B$ is the set of elements in exactly one of the sets. If none exist, $A$ and $B$ have the same elements. Or: $A \oplus B = \varnothing = A \oplus A$, and cancellation (1.3.33) gives $B = A$.

? Which of these imply $B = C$ for all sets? (tick all)
- [ ] $A \cup B = A \cup C$
- [ ] $A \cap B = A \cap C$
- [x] $A \oplus B = A \oplus C$
- [x] $A \cup B = A \cup C$ and $A \cap B = A \cap C$
> Union and intersection alone can't be cancelled ($\{1\} \cup \{1,2\} = \{1\} \cup \{2\}$). $\oplus$ can (1.3.33). Both together also work: $A \oplus B = (A \cup B) - (A \cap B) = (A \cup C) - (A \cap C) = A \oplus C$, then cancel.

? What is the name of the law $A \cup (A \cap B) = A$?
text: absorption | absorption law | the absorption law | 吸收律
> Intersecting with $B$ gives a part of $A$, which adding to $A$ "absorbs": absorption law (1.3.15).

? Simplify $\sim(\sim A \cup B) \cup B$.
- [x] $A \cup B$
- [ ] $A$
- [ ] $B$
- [ ] $E$
> De Morgan and double negation: $\sim(\sim A \cup B) = A \cap \sim B$. Then $(A \cap \sim B) \cup B = (A \cup B) \cap (\sim B \cup B) = (A \cup B) \cap E = A \cup B$.
:::

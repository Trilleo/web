---
title: Operations on relations
zh: 关系的运算
summary: Domain, range and field; the inverse of a relation; composition (in the textbook's order, F first); restriction to a set and the image of a set; and the theorems linking them, with proofs and counterexamples.
source: 2-1二元关系 (§2.3), 2026-09-03
---

Relations are sets of pairs (Lesson 2.1), so $\cup$, $\cap$, $-$ and $\sim$ already work on
them. But relations also have operations of their own, which come from the *pairs*: read a
relation backwards (the inverse), chain two relations one after the other (composition),
or keep only the part of a relation that starts in a given set (restriction and image).
These operations are the toolkit for everything that follows: powers of a relation
(Lesson 2.3) are repeated compositions, the properties of relations (Lesson 2.4) are
stated with inverses and compositions, and composite and inverse *functions* (Lesson 3.4)
are special cases of what you learn here.

Throughout, a running example helps. Think of a relation "$x$ flies to $y$" between
cities. Its **domain** is the cities with departures, its **inverse** is "$y$ is flown to
from $x$", and **composing** it with a "train to" relation gives "fly, then take a train".

## Domain, range and field

Every pair has a first and a second element. Collecting them gives three sets.

::: define Domain, range and field | 定义域、值域、域
Let $R$ be a binary relation.
1. The **domain** of $R$ is the set of first elements of its pairs:
   $\mathrm{dom}\,R = \{x \mid \exists y\ (\langle x, y\rangle \in R)\}$.
2. The **range** of $R$ is the set of second elements:
   $\mathrm{ran}\,R = \{y \mid \exists x\ (\langle x, y\rangle \in R)\}$.
3. The **field** of $R$ is their union: $\mathrm{fld}\,R = \mathrm{dom}\,R \cup \mathrm{ran}\,R$.
:::

($\exists y$ reads "there is some $y$".) In a relation graph, the domain is the vertices
with at least one arrow **leaving**, and the range is the vertices with at least one
arrow **arriving**; in a relation matrix, the domain is the non-zero rows and the range
the non-zero columns.

::: example Domain, range and field of a relation
Let $R = \{\langle 1, a\rangle, \langle 1, b\rangle, \langle 2, c\rangle, \langle 4, b\rangle\}$.
Find $\mathrm{dom}\,R$, $\mathrm{ran}\,R$ and $\mathrm{fld}\,R$.
== Domain ==
The first elements are $1, 1, 2, 4$; as a set, $\mathrm{dom}\,R = \{1, 2, 4\}$ (each element
listed once).
== Range ==
The second elements are $a, b, c, b$, so $\mathrm{ran}\,R = \{a, b, c\}$.
== Field ==
$\mathrm{fld}\,R = \{1, 2, 4\} \cup \{a, b, c\} = \{1, 2, 4, a, b, c\}$.
:::

::: callout pitfall The domain is not the set the relation is "on"
If $R$ is a relation from $A$ to $B$, then $\mathrm{dom}\,R \subseteq A$ and
$\mathrm{ran}\,R \subseteq B$, but they need not be equal. In the example, $3$ might well be
in $A$; it just has no pair. (For *functions*, Lesson 3.1 will insist that
$\mathrm{dom}\,f = A$.)
:::

## The inverse relation

Reading every pair backwards turns "$x$ is the parent of $y$" into "$y$ is a child of
$x$", and "$x < y$" into "$y > x$".

::: define Inverse relation | 逆关系
The **inverse** of a binary relation $R$, written $R^{-1}$, is
$$R^{-1} = \{\langle x, y\rangle \mid \langle y, x\rangle \in R\}.$$
:::

So $x R^{-1} y$ exactly when $y R x$. In pictures: the relation graph of $R^{-1}$ is the
graph of $R$ with **every arrow reversed** (loops stay loops), and its matrix is the
**transpose**: $M_{R^{-1}} = (M_R)^{\mathsf T}$, rows and columns swapped.

::: example Inverses
Let $F = \{\langle 3, 3\rangle, \langle 6, 2\rangle\}$ and $G = \{\langle 2, 3\rangle\}$. Find
$F^{-1}$ and $G^{-1}$.
== Swap each pair ==
$\langle 3,3\rangle$ stays $\langle 3,3\rangle$ and $\langle 6,2\rangle$ becomes
$\langle 2,6\rangle$, so $F^{-1} = \{\langle 3, 3\rangle, \langle 2, 6\rangle\}$.
== The same for G ==
$G^{-1} = \{\langle 3, 2\rangle\}$.
:::

::: example Inverse as a reversed graph and a transposed matrix
On $A = \{1, 2, 3, 4\}$ take the relation from Lesson 2.1,
$R = \{\langle1,1\rangle, \langle1,2\rangle, \langle2,3\rangle, \langle2,4\rangle, \langle4,2\rangle\}$.
Find $R^{-1}$, its matrix and its graph.
== Swap the pairs ==
$R^{-1} = \{\langle1,1\rangle, \langle2,1\rangle, \langle3,2\rangle, \langle4,2\rangle, \langle2,4\rangle\}$.
== Transpose the matrix ==
$$M_R = \begin{bmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \end{bmatrix}, \qquad M_{R^{-1}} = \begin{bmatrix} 1 & 0 & 0 & 0 \\ 1 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 \\ 0 & 1 & 0 & 0 \end{bmatrix}.$$
Row $i$ of $M_{R^{-1}}$ is column $i$ of $M_R$.
== Reverse the arrows ==
The loop at 1 stays; $1 \to 2$ becomes $2 \to 1$; $2 \to 3$ becomes $3 \to 2$; the pair
$2 \to 4$, $4 \to 2$ simply swaps, so it looks the same (figure below).
:::

::: graph The relation graph of $R^{-1}$: the arrows of Lesson 2.1's Figure 2.2.1, reversed
at 1: 90, 70
at 2: 270, 70
at 3: 270, 200
at 4: 90, 200
1 -> 1, 2 -> 1, 3 -> 2, 4 -> 2, 2 -> 4
show: degrees
:::

Compare the degrees with those of $R$ in Lesson 2.1: each vertex's arrows in and arrows out
have traded places.

## Composition

### The idea: one step, then another

Look at three sets drawn in columns, with a relation $F$ from the first to the second and
a relation $G$ from the second to the third:

::: graph Two relations in a row: $F$ from $\{a, b, c\}$ to $\{1, 2\}$, then $G$ from $\{1, 2\}$ to $\{x, y, z\}$
row: a b c
row: 1 2
row: x y z
a -> 2, b -> 1, c -> 1, c -> 2
1 -> x, 1 -> y, 1 -> z
:::

From $b$ we can go along $F$ to $1$, and from $1$ along $G$ to $x$, $y$ or $z$. So $b$
"reaches" $x$, $y$, $z$ in two steps — first $F$, then $G$. The same is true of $c$ (through
$1$). From $a$ we can only reach $2$, and nothing leaves $2$ in $G$: $a$ reaches nothing.
Recording who reaches whom gives a new relation, the composition.

::: define Composition of relations | 关系的复合（合成）
Let $F$ and $G$ be binary relations. The **composition** of $F$ and $G$ (also called the
**right composition** of $G$ with $F$, {{zh G对F的右复合}}), written $F \circ G$, is
$$F \circ G = \{\langle x, z\rangle \mid \exists y\ (x F y \wedge y G z)\}.$$
That is, $\langle x, z\rangle \in F \circ G$ when **some** middle element $y$ has
$\langle x, y\rangle \in F$ and $\langle y, z\rangle \in G$.
:::

::: callout key Read F ∘ G left to right: F first, then G
In this course (and its textbook), $F \circ G$ means "**first** $F$, **then** $G$": the
left relation is the first step. Picture the arrows: $x \xrightarrow{F} y \xrightarrow{G} z$.
For functions this becomes $(f \circ g)(x) = g(f(x))$ (Lesson 3.4).
:::

::: callout pitfall Many other books use the opposite order
In most calculus books, and many discrete-mathematics books in English (Rosen, for
example), $g \circ f$ means "first $f$, then $g$", i.e. $(g \circ f)(x) = g(f(x))$ — the
**right** relation goes first. Our textbook is the other way round. When you read
another source, check its definition before using its results; in this course's exams,
always use **F first**.
:::

To compute $F \circ G$: for each pair $\langle x, y\rangle$ of $F$, look up every pair of
$G$ that **starts** at $y$, and join them. Pairs of $F$ whose second element starts nothing
in $G$ contribute nothing.

::: example The composition from the picture
Let $F = \{\langle a,2\rangle, \langle b,1\rangle, \langle c,1\rangle, \langle c,2\rangle\}$ and
$G = \{\langle 1,x\rangle, \langle 1,y\rangle, \langle 1,z\rangle\}$. Find $F \circ G$.
== Go through F ==
- $\langle a, 2\rangle$: $G$ has no pair starting at 2. Nothing.
- $\langle b, 1\rangle$: $G$ has $\langle 1,x\rangle, \langle 1,y\rangle, \langle 1,z\rangle$, giving
  $\langle b,x\rangle, \langle b,y\rangle, \langle b,z\rangle$.
- $\langle c, 1\rangle$: likewise $\langle c,x\rangle, \langle c,y\rangle, \langle c,z\rangle$.
- $\langle c, 2\rangle$: nothing (as for $a$).
== Collect ==
$$F \circ G = \{\langle b,x\rangle, \langle b,y\rangle, \langle b,z\rangle, \langle c,x\rangle, \langle c,y\rangle, \langle c,z\rangle\}.$$
$c$ reaches $x$ through $1$ only once in the set, even though $c$ has two arrows in $F$:
a set has no repeats.
:::

::: example Composition is not commutative
On $A = \{1, 2, 3\}$ let $F = \{\langle1,2\rangle, \langle2,3\rangle, \langle3,3\rangle\}$ and
$G = \{\langle2,1\rangle, \langle3,2\rangle\}$. Find $F \circ G$ and $G \circ F$.
== F ∘ G: first F, then G ==
- $\langle1,2\rangle \in F$, $\langle2,1\rangle \in G$: $\langle1,1\rangle$.
- $\langle2,3\rangle \in F$, $\langle3,2\rangle \in G$: $\langle2,2\rangle$.
- $\langle3,3\rangle \in F$, $\langle3,2\rangle \in G$: $\langle3,2\rangle$.

So $F \circ G = \{\langle1,1\rangle, \langle2,2\rangle, \langle3,2\rangle\}$.
== G ∘ F: first G, then F ==
- $\langle2,1\rangle \in G$, $\langle1,2\rangle \in F$: $\langle2,2\rangle$.
- $\langle3,2\rangle \in G$, $\langle2,3\rangle \in F$: $\langle3,3\rangle$.

So $G \circ F = \{\langle2,2\rangle, \langle3,3\rangle\}$.
== Compare ==
$F \circ G \ne G \circ F$: the order of composition matters, which is exactly why the
convention above matters.
:::

Composition can also be done with relation matrices, by a "Boolean" matrix product in the
natural order, $M_{F \circ G} = M_F \cdot M_G$; Lesson 2.3 shows how, and uses it to compute
powers $R^n = R \circ R \circ \dots \circ R$.

::: callout exam What exams ask about composition
A small computation: "given $F$ and $G$, find $F \circ G$" (often as a multiple-choice
question, as in the in-class question in the quiz below), sometimes together with
$G \circ F$, $F^{-1}$ or $(F \circ G)^{-1}$. Work pair by pair and keep the order: $F$ first.
:::

## Restriction and image

Often we only care about where *some* elements go. "Flights leaving Beijing or Shanghai"
is a part of the flights relation; "the cities you can reach from Beijing or Shanghai" is
a set.

::: define Restriction and image | 限制与像
Let $R$ be a binary relation and $A$ a set.
1. The **restriction** of $R$ to $A$, written $R \restriction A$, is
   $R \restriction A = \{\langle x, y\rangle \mid \langle x, y\rangle \in R \wedge x \in A\}$:
   the pairs of $R$ whose first element is in $A$.
2. The **image** of $A$ under $R$, written $R[A]$, is $R[A] = \mathrm{ran}(R \restriction A)$:
   everything that elements of $A$ are related to.
:::

So $R \restriction A \subseteq R$ is a **sub-relation** ({{zh 子关系}}) of $R$, and
$R[A] \subseteq \mathrm{ran}\,R$ is a set of second elements. Only the **first** element is
tested: $A$ need not have anything to do with the second elements.

::: example Restrictions and images
Let $R = \{\langle1,2\rangle, \langle1,3\rangle, \langle2,2\rangle, \langle2,4\rangle, \langle3,2\rangle\}$.
Find $R \restriction \{1\}$, $R \restriction \varnothing$, $R \restriction \{2,3\}$, $R[\{1\}]$,
$R[\varnothing]$ and $R[\{3\}]$.
== Restrictions: keep pairs starting in the set ==
$R \restriction \{1\} = \{\langle1,2\rangle, \langle1,3\rangle\}$;
$R \restriction \varnothing = \varnothing$ (no pair starts in $\varnothing$);
$R \restriction \{2,3\} = \{\langle2,2\rangle, \langle2,4\rangle, \langle3,2\rangle\}$.
== Images: the second elements of those pairs ==
$R[\{1\}] = \mathrm{ran}\{\langle1,2\rangle, \langle1,3\rangle\} = \{2, 3\}$;
$R[\varnothing] = \varnothing$; $R[\{3\}] = \{2\}$.
:::

::: graph The relation $R = \{\langle1,2\rangle, \langle1,3\rangle, \langle2,2\rangle, \langle2,4\rangle, \langle3,2\rangle\}$: $R[\{1\}]$ is where the arrows out of 1 land
1 -> 2, 1 -> 3, 2 -> 2, 2 -> 4, 3 -> 2
:::

In the graph: to restrict to $A$, keep only the arrows whose **tail** is in $A$; the image
$R[A]$ is the set of their **heads**.

::: callout pitfall Image of a set, not of an element
$R[A]$ takes a **set** $A$ and gives a set: write $R[\{1\}] = \{2, 3\}$, not $R[1]$. And the
image is a set of second elements, while the restriction is a set of pairs.
:::

## Properties of the operations

Now the theorems linking these operations. They are all set equalities or inclusions, so
they are proved the usual way: take an arbitrary pair (or element) from one side and show
it lies in the other.

### Inverse

::: theorem Double inverse; domain and range of the inverse (Theorem 2.3.1 in the textbook)
For any binary relation $F$:
1. $(F^{-1})^{-1} = F$;
2. $\mathrm{dom}\,F^{-1} = \mathrm{ran}\,F$ and $\mathrm{ran}\,F^{-1} = \mathrm{dom}\,F$.
:::

Idea: reversing every arrow twice gives the original arrows, and reversing swaps "tails"
with "heads".

Proof. (1) For any $\langle x, y\rangle$: $\langle x, y\rangle \in (F^{-1})^{-1}$ if and only if
$\langle y, x\rangle \in F^{-1}$, which by the definition again holds if and only if
$\langle x, y\rangle \in F$. So $(F^{-1})^{-1} = F$.

(2) For any $x$: $x \in \mathrm{dom}\,F^{-1}$ if and only if some $y$ has
$\langle x, y\rangle \in F^{-1}$, i.e. $\langle y, x\rangle \in F$, which says exactly
$x \in \mathrm{ran}\,F$. So $\mathrm{dom}\,F^{-1} = \mathrm{ran}\,F$; the other equality is proved
the same way. $\blacksquare$

### Composition

::: theorem Associativity; inverse of a composition (Theorem 2.3.2 in the textbook)
For any relations $F$, $G$, $H$:
1. $(F \circ G) \circ H = F \circ (G \circ H)$;
2. $(F \circ G)^{-1} = G^{-1} \circ F^{-1}$.
:::

Idea: (1) both sides mean "an $F$-step, then a $G$-step, then an $H$-step", so the brackets
don't matter and we can write $F \circ G \circ H$. (2) To walk a two-step path backwards you
undo the **last** step first — like taking off shoes before socks.

Proof of (1). Take $\langle x, y\rangle \in (F \circ G) \circ H$. Then some $t$ has
$\langle x, t\rangle \in F \circ G$ and $\langle t, y\rangle \in H$. Unfolding the first, some $s$
has $\langle x, s\rangle \in F$ and $\langle s, t\rangle \in G$. Now $\langle s, t\rangle \in G$
and $\langle t, y\rangle \in H$ give $\langle s, y\rangle \in G \circ H$; with
$\langle x, s\rangle \in F$ this gives $\langle x, y\rangle \in F \circ (G \circ H)$. So
$(F \circ G) \circ H \subseteq F \circ (G \circ H)$, and the reverse inclusion is proved in the
same way.

Proof of (2). For any $\langle x, y\rangle$:
$$\begin{aligned}
\langle x, y\rangle \in (F \circ G)^{-1}
&\iff \langle y, x\rangle \in F \circ G \\
&\iff \exists t\ (\langle y, t\rangle \in F \wedge \langle t, x\rangle \in G) \\
&\iff \exists t\ (\langle x, t\rangle \in G^{-1} \wedge \langle t, y\rangle \in F^{-1}) \\
&\iff \langle x, y\rangle \in G^{-1} \circ F^{-1}. \qquad \blacksquare
\end{aligned}$$

::: example Checking (F ∘ G)⁻¹ = G⁻¹ ∘ F⁻¹ on numbers
Use $F = \{\langle1,2\rangle, \langle2,3\rangle, \langle3,3\rangle\}$ and
$G = \{\langle2,1\rangle, \langle3,2\rangle\}$ from the commutativity example.
== Left side ==
$F \circ G = \{\langle1,1\rangle, \langle2,2\rangle, \langle3,2\rangle\}$, so
$(F \circ G)^{-1} = \{\langle1,1\rangle, \langle2,2\rangle, \langle2,3\rangle\}$.
== Right side ==
$G^{-1} = \{\langle1,2\rangle, \langle2,3\rangle\}$ and
$F^{-1} = \{\langle2,1\rangle, \langle3,2\rangle, \langle3,3\rangle\}$. First $G^{-1}$, then
$F^{-1}$: $1 \to 2 \to 1$ gives $\langle1,1\rangle$; $2 \to 3 \to 2$ and $2 \to 3 \to 3$ give
$\langle2,2\rangle, \langle2,3\rangle$. So $G^{-1} \circ F^{-1} = \{\langle1,1\rangle, \langle2,2\rangle, \langle2,3\rangle\}$. Equal.
== The wrong order ==
$F^{-1} \circ G^{-1}$: $2 \to 1 \to 2$ gives $\langle2,2\rangle$; $3 \to 2 \to 3$ gives
$\langle3,3\rangle$. That is $\{\langle2,2\rangle, \langle3,3\rangle\}$, which is **not**
$(F \circ G)^{-1}$.
:::

::: theorem The identity relation is neutral (Theorem 2.3.3 in the textbook)
If $R$ is a relation on $A$, then $R \circ I_A = R = I_A \circ R$.
:::

The slides skip the proof; it is short. Idea: an $I_A$-step goes nowhere, so adding one
before or after changes nothing. For $R \circ I_A$: if $\langle x, z\rangle \in R \circ I_A$,
some $y$ has $\langle x, y\rangle \in R$ and $\langle y, z\rangle \in I_A$, so $y = z$ and
$\langle x, z\rangle \in R$. Conversely, if $\langle x, z\rangle \in R$, then $z \in A$ (as
$R \subseteq A \times A$), so $\langle z, z\rangle \in I_A$ and $\langle x, z\rangle \in R \circ I_A$.
The other equality is the same with the identity step at the start. $\blacksquare$

::: theorem Composition with unions and intersections (Theorem 2.3.4 in the textbook)
For any relations $F$, $G$, $H$:
1. $F \circ (G \cup H) = F \circ G \cup F \circ H$;
2. $(G \cup H) \circ F = G \circ F \cup H \circ F$;
3. $F \circ (G \cap H) \subseteq F \circ G \cap F \circ H$;
4. $(G \cap H) \circ F \subseteq G \circ F \cap H \circ F$.
:::

Composition distributes over **union** (equality) but only gives an **inclusion** for
intersection. Here is the proof of (3), which shows where the equality breaks.

Proof of (3). Take $\langle x, y\rangle \in F \circ (G \cap H)$. Then some $t$ has
$\langle x, t\rangle \in F$ and $\langle t, y\rangle \in G \cap H$, i.e. $\langle t, y\rangle \in G$
**and** $\langle t, y\rangle \in H$. From $\langle x, t\rangle \in F$, $\langle t, y\rangle \in G$
we get $\langle x, y\rangle \in F \circ G$; from $\langle x, t\rangle \in F$,
$\langle t, y\rangle \in H$ we get $\langle x, y\rangle \in F \circ H$. So
$\langle x, y\rangle \in F \circ G \cap F \circ H$. $\blacksquare$

Why not the reverse? $\langle x, y\rangle \in F \circ G \cap F \circ H$ gives a middle element
$t_1$ for $G$ and a middle element $t_2$ for $H$ — but they may be **different**, and then
no single $t$ works for $G \cap H$.

::: example The inclusion in (3) can be strict
Find $F$, $G$, $H$ with $F \circ (G \cap H) \ne F \circ G \cap F \circ H$.
== Choose two different middle elements ==
Let $F = \{\langle x, 1\rangle, \langle x, 2\rangle\}$, $G = \{\langle 1, z\rangle\}$ and
$H = \{\langle 2, z\rangle\}$. So $x$ reaches $z$ through $1$ using $G$, and through $2$ using $H$.
== Right side ==
$F \circ G = \{\langle x, z\rangle\}$ and $F \circ H = \{\langle x, z\rangle\}$, so their
intersection is $\{\langle x, z\rangle\}$.
== Left side ==
$G \cap H = \varnothing$ (they share no pair), so $F \circ (G \cap H) = F \circ \varnothing = \varnothing$.
== Conclusion ==
$\varnothing \subsetneq \{\langle x, z\rangle\}$: only the inclusion holds.
:::

By induction on $n$, Theorem 2.3.4 extends to any finite number of relations:
$$\begin{gathered}
R \circ (R_1 \cup \dots \cup R_n) = R \circ R_1 \cup \dots \cup R \circ R_n, \\
(R_1 \cup \dots \cup R_n) \circ R = R_1 \circ R \cup \dots \cup R_n \circ R, \\
R \circ (R_1 \cap \dots \cap R_n) \subseteq R \circ R_1 \cap \dots \cap R \circ R_n, \\
(R_1 \cap \dots \cap R_n) \circ R \subseteq R_1 \circ R \cap \dots \cap R_n \circ R.
\end{gathered}$$

### Restriction and image

::: theorem Restriction and image with unions and intersections (Theorem 2.3.5 in the textbook)
For a relation $F$ and sets $A$, $B$:
1. $F \restriction (A \cup B) = F \restriction A \cup F \restriction B$;
2. $F[A \cup B] = F[A] \cup F[B]$;
3. $F \restriction (A \cap B) = F \restriction A \cap F \restriction B$;
4. $F[A \cap B] \subseteq F[A] \cap F[B]$.
:::

::: callout note Theorem numbers on the slides
The slides proving items (1) and (4) label them "Theorem 2.3.4"; the statement is
Theorem 2.3.5 (as on the slide that lists it). Theorem 2.3.4 is the one about composition
with $\cup$ and $\cap$ above.
:::

Proof of (1). Take $\langle x, y\rangle \in F \restriction (A \cup B)$. Then
$\langle x, y\rangle \in F$ and $x \in A \cup B$. If $x \in A$, then
$\langle x, y\rangle \in F \restriction A$; if $x \in B$, then $\langle x, y\rangle \in F \restriction B$.
Either way $\langle x, y\rangle \in F \restriction A \cup F \restriction B$. The reverse inclusion
runs the same steps backwards. $\blacksquare$

Proof of (4). Take $y \in F[A \cap B]$. By definition some $x$ has
$\langle x, y\rangle \in F$ and $x \in A \cap B$. From $x \in A$ we get $y \in F[A]$; from
$x \in B$, $y \in F[B]$. So $y \in F[A] \cap F[B]$. $\blacksquare$

As with composition, (4) is only an inclusion because $y$ may be reached from $A$ and from
$B$ by **different** elements, neither of them in $A \cap B$. Restriction, by contrast, keeps
whole pairs, so the first element itself is tested and (3) is an equality.

::: example Restrictions to a union
Let $F = \{\langle1,2\rangle, \langle1,3\rangle, \langle2,2\rangle, \langle2,4\rangle, \langle3,2\rangle\}$,
$A = \{1\}$ and $B = \{2\}$. Check item (1).
== Left side ==
$A \cup B = \{1, 2\}$, so
$F \restriction (A \cup B) = \{\langle1,2\rangle, \langle1,3\rangle, \langle2,2\rangle, \langle2,4\rangle\}$.
== Right side ==
$F \restriction A = \{\langle1,2\rangle, \langle1,3\rangle\}$ and
$F \restriction B = \{\langle2,2\rangle, \langle2,4\rangle\}$; their union is the same four pairs.
:::

::: example Images of an intersection
With the same $F$, let $A = \{1, 2\}$ and $B = \{2, 3\}$. Compare $F[A \cap B]$ with
$F[A] \cap F[B]$.
== Left side ==
$A \cap B = \{2\}$, and the arrows out of 2 land on 2 and 4: $F[A \cap B] = \{2, 4\}$.
== Right side ==
$F[A] = \{2, 3, 4\}$ (from 1: 2, 3; from 2: 2, 4) and $F[B] = \{2, 4\}$ (from 2: 2, 4; from 3:
2). So $F[A] \cap F[B] = \{2, 4\}$.
== Comment ==
Here the two sides happen to be equal, which agrees with the inclusion but doesn't show it
can be strict. For a strict case, take $F = \{\langle1,a\rangle, \langle2,a\rangle\}$,
$A = \{1\}$, $B = \{2\}$: then $F[A \cap B] = F[\varnothing] = \varnothing$, but
$F[A] \cap F[B] = \{a\} \cap \{a\} = \{a\}$.
:::

### Summary of the laws

| Operation | Equality | Only an inclusion |
| --- | --- | --- |
| Inverse | $(F^{-1})^{-1} = F$; $(F \circ G)^{-1} = G^{-1} \circ F^{-1}$ | — |
| Composition | associative; distributes over $\cup$; $R \circ I_A = I_A \circ R = R$ | $\circ$ over $\cap$ |
| Restriction | over $\cup$ and over $\cap$ | — |
| Image | over $\cup$ | image of $\cap$ |
| Not true in general | $F \circ G = G \circ F$ | — |

::: callout key The one idea
Composition goes **left to right**: $F \circ G$ is "$F$, then $G$", and inverting reverses
the order, $(F \circ G)^{-1} = G^{-1} \circ F^{-1}$. Whenever a "there is a middle element"
is involved ($\circ$ over $\cap$, images of $\cap$), expect only $\subseteq$.
:::

::: callout exam Proofs in exams
"Prove that $F \circ (G \cup H) = F \circ G \cup F \circ H$" or "prove
$(F \circ G)^{-1} = G^{-1} \circ F^{-1}$" are classic short proofs: take an arbitrary pair and
unfold the definitions as above. For an inclusion that isn't an equality, be ready to give
a counterexample like the ones in this lesson.
:::

::: cards Operations on relations
Domain $\mathrm{dom}\,R$ (定义域) :: The set of first elements of the pairs of $R$.
Range $\mathrm{ran}\,R$ (值域) :: The set of second elements of the pairs of $R$.
Field $\mathrm{fld}\,R$ (域) :: $\mathrm{dom}\,R \cup \mathrm{ran}\,R$.
Inverse $R^{-1}$ (逆关系) :: $\{\langle x,y\rangle \mid \langle y,x\rangle \in R\}$: arrows reversed, matrix transposed.
Composition $F \circ G$ in this course :: $\{\langle x,z\rangle \mid \exists y\,(xFy \wedge yGz)\}$: first $F$, then $G$.
Composition order warning :: Many other books write $g \circ f$ for "first $f$, then $g$"; this course's $F \circ G$ means $F$ first.
Is composition commutative? :: No: in general $F \circ G \ne G \circ F$. It is associative.
Inverse of a composition :: $(F \circ G)^{-1} = G^{-1} \circ F^{-1}$ (order reversed).
Identity relation in a composition :: $R \circ I_A = R = I_A \circ R$ for $R$ on $A$.
Composition with union and intersection :: $F \circ (G \cup H) = F \circ G \cup F \circ H$; $F \circ (G \cap H) \subseteq F \circ G \cap F \circ H$ only.
Restriction $R \restriction A$ (限制) :: The pairs of $R$ whose first element is in $A$.
Image $R[A]$ (像) :: $\mathrm{ran}(R \restriction A)$: everything elements of $A$ are related to.
Image of a union and of an intersection :: $F[A \cup B] = F[A] \cup F[B]$; $F[A \cap B] \subseteq F[A] \cap F[B]$ only.
:::

::: quiz Check yourself
? (In-class question) Let $F = \{\langle a,1\rangle, \langle b,2\rangle, \langle c,3\rangle, \langle c,4\rangle\}$ and $G = \{\langle1,x\rangle, \langle2,y\rangle, \langle3,z\rangle\}$. Then $F \circ G$ is:
- [ ] $\{\langle a,y\rangle, \langle b,x\rangle, \langle c,z\rangle\}$
- [x] $\{\langle a,x\rangle, \langle b,y\rangle, \langle c,z\rangle\}$
- [ ] $\{\langle a,1\rangle, \langle b,2\rangle, \langle c,3\rangle\}$
- [ ] $\{\langle a,z\rangle, \langle b,x\rangle, \langle c,y\rangle\}$
> First $F$, then $G$: $a \to 1 \to x$, $b \to 2 \to y$, $c \to 3 \to z$; $\langle c,4\rangle$ leads nowhere because $G$ has no pair starting at 4. Answer B (the Rain Classroom answer).

? For $R = \{\langle1,a\rangle, \langle1,b\rangle, \langle2,c\rangle, \langle4,b\rangle\}$, how many elements has $\mathrm{fld}\,R$?
answer: 6
> $\mathrm{dom}\,R = \{1,2,4\}$ and $\mathrm{ran}\,R = \{a,b,c\}$, so $\mathrm{fld}\,R = \{1,2,4,a,b,c\}$: 6 elements.

? $F = \{\langle3,3\rangle, \langle6,2\rangle\}$. Which set is $F^{-1}$?
- [x] $\{\langle3,3\rangle, \langle2,6\rangle\}$
- [ ] $\{\langle3,3\rangle, \langle6,2\rangle\}$
- [ ] $\{\langle2,6\rangle\}$
> Swap every pair: $\langle3,3\rangle$ stays, $\langle6,2\rangle$ becomes $\langle2,6\rangle$.

? On $\{1,2,3\}$, let $F = \{\langle1,2\rangle, \langle2,3\rangle, \langle3,3\rangle\}$ and $G = \{\langle2,1\rangle, \langle3,2\rangle\}$. How many pairs has $F \circ G$?
answer: 3
> $1 \to 2 \to 1$, $2 \to 3 \to 2$, $3 \to 3 \to 2$: $F \circ G = \{\langle1,1\rangle, \langle2,2\rangle, \langle3,2\rangle\}$.

? With the same $F$ and $G$, which set is $G \circ F$?
- [ ] $\{\langle1,1\rangle, \langle2,2\rangle, \langle3,2\rangle\}$
- [x] $\{\langle2,2\rangle, \langle3,3\rangle\}$
- [ ] $\{\langle2,2\rangle, \langle2,3\rangle\}$
> First $G$, then $F$: $2 \to 1 \to 2$ and $3 \to 2 \to 3$. It differs from $F \circ G$, so composition isn't commutative.

? Which of these hold for **all** relations $F$, $G$, $H$? (tick all)
- [x] $(F \circ G)^{-1} = G^{-1} \circ F^{-1}$
- [ ] $(F \circ G)^{-1} = F^{-1} \circ G^{-1}$
- [x] $F \circ (G \cup H) = F \circ G \cup F \circ H$
- [ ] $F \circ (G \cap H) = F \circ G \cap F \circ H$
- [x] $(F \circ G) \circ H = F \circ (G \circ H)$
- [ ] $F \circ G = G \circ F$
> Theorem 2.3.2 gives the inverse with the order reversed and associativity; Theorem 2.3.4 gives distributivity over $\cup$ but only $\subseteq$ over $\cap$ (counterexample: $F = \{\langle x,1\rangle, \langle x,2\rangle\}$, $G = \{\langle1,z\rangle\}$, $H = \{\langle2,z\rangle\}$). Composition isn't commutative.

? Let $R = \{\langle1,2\rangle, \langle1,3\rangle, \langle2,2\rangle, \langle2,4\rangle, \langle3,2\rangle\}$. Which set is $R[\{1, 3\}]$?
- [ ] $\{1, 3\}$
- [x] $\{2, 3\}$
- [ ] $\{\langle1,2\rangle, \langle1,3\rangle, \langle3,2\rangle\}$
- [ ] $\{2, 3, 4\}$
> $R \restriction \{1,3\} = \{\langle1,2\rangle, \langle1,3\rangle, \langle3,2\rangle\}$ (that's the restriction, a set of pairs); its range is $\{2, 3\}$.

? Which of these hold for every relation $F$ and sets $A$, $B$? (tick all)
- [x] $F \restriction (A \cap B) = F \restriction A \cap F \restriction B$
- [ ] $F[A \cap B] = F[A] \cap F[B]$
- [x] $F[A \cup B] = F[A] \cup F[B]$
- [x] $\mathrm{dom}\,F^{-1} = \mathrm{ran}\,F$
> Theorem 2.3.5 gives equalities for restriction over $\cup$ and $\cap$ and for the image of a union, but only $F[A \cap B] \subseteq F[A] \cap F[B]$: with $F = \{\langle1,a\rangle, \langle2,a\rangle\}$, $A = \{1\}$, $B = \{2\}$, the left side is $\varnothing$ and the right side $\{a\}$. Theorem 2.3.1 gives $\mathrm{dom}\,F^{-1} = \mathrm{ran}\,F$.

? $R$ is a relation on $A$ with 7 pairs. How many pairs has $R \circ I_A$?
answer: 7
> $R \circ I_A = R$ (Theorem 2.3.3): composing with the identity changes nothing.

? The set of pairs of $R$ whose first element lies in $A$ is called the ___ of $R$ to $A$ (one word).
text: restriction | 限制
> That is $R \restriction A$, the restriction. Its range, $R[A]$, is the image of $A$.
:::

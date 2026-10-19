---
title: Partial orders
zh: 偏序关系
summary: Partial orders, comparability, strict and total orders, posets, covering and Hasse diagrams, least/greatest and minimal/maximal elements, bounds and suprema, counting the relations on an n-element set, and the smallest and largest relations with each property.
source: 2-4二元关系 (§2.7 and the chapter-2 example problems), 2026-09-15
---

Equivalence relations (Lesson 2.6) say when two things are "the same". Partial orders
say when one thing comes "before" another: a number is at most another, a set sits
inside another, a task must be done before another, a course is a prerequisite of
another. What makes orders interesting is that two things need not be comparable at
all, and drawing them as a {{term Hasse diagram | 哈斯图}} shows the whole structure at
a glance. Exams ask you to draw these diagrams, read them back, and find the special
elements (least, greatest, minimal, maximal) and bounds of a subset; this lesson does
all of that, then closes chapter 2 with two classic exercises: counting the relations on
an $n$-element set that have a given property, and finding the smallest and largest
relation with each property.

## From ≤ and ⊆ to partial orders

Start with something familiar: the relation $\le$ on the real numbers $\mathbb R$.
Using the properties from Lesson 2.4:

1. **Reflexive**: every real $x$ has $x \le x$.
2. **Antisymmetric**: for all $x, y \in \mathbb R$, if $x \le y$ and $y \le x$, then
   $x = y$.
3. **Transitive**: for all $x, y, z \in \mathbb R$, if $x \le y$ and $y \le z$, then
   $x \le z$.

Now something that doesn't look like numbers at all. Let $X = \{a, b\}$, whose power
set is $2^X = P(X) = \{\varnothing, \{a\}, \{b\}, \{a,b\}\}$. The relation "is a subset
of" on $2^X$, as a set of ordered pairs, is

$$
\begin{aligned}
\text{“}\subseteq\text{”} = \{\, &\langle\varnothing,\varnothing\rangle, \langle\{a\},\{a\}\rangle, \langle\{b\},\{b\}\rangle, \langle\{a,b\},\{a,b\}\rangle,\\
&\langle\varnothing,\{a\}\rangle, \langle\varnothing,\{b\}\rangle, \langle\varnothing,\{a,b\}\rangle,\\
&\langle\{a\},\{a,b\}\rangle, \langle\{b\},\{a,b\}\rangle \,\}.
\end{aligned}
$$

It has the same three properties: every set is a subset of itself; $S \subseteq T$ and
$T \subseteq S$ force $S = T$; and subsets of subsets are subsets. These three
properties are exactly what "being in order" means, whatever the things are.

::: define Partial order | 偏序关系
Let $R$ be a relation on a nonempty set $A$. If $R$ is **reflexive**, **antisymmetric**
and **transitive**, then $R$ is a partial order on $A$, written $\preccurlyeq$. When
$\langle x, y\rangle \in\, \preccurlyeq$ we write $x \preccurlyeq y$, read "$x$ is less
than or equal to $y$" (Definition 2.7.1 in the textbook).
:::

The symbol $\preccurlyeq$ is a curly "less than or equal": it reminds you of $\le$
without claiming to be it.

::: callout pitfall ≼ is a name, not "smaller"
"Less than or equal" here only means "comes no later **in this order**"; it has nothing
to do with the size of numbers. $\subseteq$ and $\supseteq$ are both partial orders, and
both can be written $\preccurlyeq$. Under $\supseteq$, $\{a,b\} \supseteq \{a\}$, so in
that order $\{a,b\} \preccurlyeq \{a\}$: the *bigger* set comes *first*. Even $\ge$ on
the real numbers is a partial order and can be written $\preccurlyeq$, which makes
$5 \preccurlyeq 3$ true.
:::

To check that a relation is a partial order, check the three properties one by one,
and remember that **reflexive** means *every* element is related to itself.

::: example Which of these are partial orders?
$X$ is a nonempty set. Which of these relations are partial orders?
(a) $\subseteq$ on $2^X$; (b) $\subset$ (proper subset) on $2^X$; (c) the identity
relation $I_X$; (d) a nonempty proper subset $R \subset I_X$; (e) $\le$ on $\mathbb R$;
(f) $<$ on $\mathbb R$; (g) congruence modulo $n$ on $\mathbb N$; (i) divisibility on
the natural numbers.
== Partial orders ==
- (a) $\subseteq$: yes, as above.
- (c) $I_X = \{\langle x,x\rangle \mid x \in X\}$: yes. It is reflexive by definition,
  antisymmetric (it never relates two different elements) and transitive
  ($\langle x,x\rangle$ and $\langle x,x\rangle$ only give $\langle x,x\rangle$). It is
  the "nothing is comparable" order.
- (e) $\le$ on $\mathbb R$: yes, shown above.
- (i) Divisibility $\mid$ on the positive integers: $x \mid x$; $x \mid y$ and $y \mid x$
  give $x = y$ (both positive); $x \mid y$ and $y \mid z$ give $x \mid z$. Yes.
== Not partial orders ==
- (b) $\subset$: not reflexive, since $S \subset S$ is false.
- (d) A proper subset of $I_X$ misses some loop $\langle x,x\rangle$, so it isn't
  reflexive.
- (f) $<$: not reflexive ($x < x$ is false).
- (g) Congruence mod $n$ is reflexive, symmetric and transitive (an equivalence
  relation, Lesson 2.6) but **not antisymmetric**: $1 \equiv n+1 \pmod n$ and
  $n+1 \equiv 1 \pmod n$, yet $1 \ne n+1$.
:::

## Comparability and strict order

In $\le$ on numbers, any two numbers can be compared. In $\subseteq$, $\{a\}$ and
$\{b\}$ can't: neither is inside the other. That possibility is what the word *partial*
is about.

::: define Strict order and comparability | 严格序与可比
Let $\preccurlyeq$ be a partial order on a nonempty set $A$, and $x, y \in A$
(Definition 2.7.2 in the textbook).
1. $x \prec y$ ("$x$ is strictly less than $y$") if $x \preccurlyeq y$ and $x \ne y$.
2. $x$ and $y$ are {{term comparable | 可比}} if $x \preccurlyeq y$ or
   $y \preccurlyeq x$.
:::

So for any two elements $x, y$ of a partially ordered set, exactly one of these holds:
$x \prec y$, $y \prec x$, $x = y$, or **$x$ and $y$ are not comparable**.

::: example Divisibility on {1, 2, 3}
$A = \{1,2,3\}$ and $\preccurlyeq$ is divisibility. Sort the pairs.
== Answer ==
$1 \prec 2$ and $1 \prec 3$ (1 divides both, and they differ); $1 = 1$ and so on; but
2 and 3 are **not comparable**: $2 \nmid 3$ and $3 \nmid 2$.
:::

## Total orders

::: define Total order | 全序关系
A partial order $R$ on a nonempty set $A$ in which **every two elements** $x, y \in A$
are comparable. Also called a {{term linear order | 线序关系}} (Definition 2.7.3 in the
textbook).
:::

The name "linear" comes from the picture: a total order lines all the elements up on
one line, like the number line.

- $\le$ on $\mathbb R$ is a total order: any two numbers can be compared.
- Divisibility is usually **not** total: on $\{1,2,3\}$, 2 and 3 are not comparable.
- But divisibility on $\{1,2,4\}$ **is** total: $1 \mid 2 \mid 4$ and $1 \mid 4$.

::: hasse Divisibility on {1, 2, 4}: a total order is a single chain
divides: 1 2 4
:::

::: hasse Divisibility on {1, 2, 3}: 2 and 3 side by side, not comparable
divides: 1 2 3
highlight: 2 3
:::

::: example Is ⊆ on the subsets of {a, b} a total order? Can it be made one?
Take $\subseteq$ on $2^{\{a,b\}}$ (the nine pairs above). Is it a total order? Then add
the pair $\langle\{a\},\{b\}\rangle$ to get a relation $R$. Is $R$ a total order?
== ⊆ is not total ==
$\langle\{a\},\{b\}\rangle \notin\, \subseteq$ and $\langle\{b\},\{a\}\rangle \notin\,
\subseteq$, so $\{a\}$ and $\{b\}$ are not comparable. Not a total order.
== R is still a partial order ==
Adding $\langle\{a\},\{b\}\rangle$ keeps $R$ reflexive (the loops are still there) and
antisymmetric ($\langle\{b\},\{a\}\rangle$ is not in $R$). For transitivity, check the
new pair against the others: $\varnothing \to \{a\} \to \{b\}$ needs
$\langle\varnothing,\{b\}\rangle$, already there; $\{a\} \to \{b\} \to \{a,b\}$ needs
$\langle\{a\},\{a,b\}\rangle$, already there.
== R is total ==
Now every two elements are comparable, so $R$ is a total order:
$\varnothing \prec \{a\} \prec \{b\} \prec \{a,b\}$.
:::

::: hasse ⊆ on the subsets of {a, b}: not total
subsets: a b
:::

::: hasse The total order R (e = ∅, a = {a}, b = {b}, ab = {a, b})
order: e < a < b < ab
:::

## Partially ordered sets

When we talk about an order we always need to know *which set* it orders, so the two
are named together.

::: define Partially ordered set | 偏序集
A set $A$ together with a partial order $\preccurlyeq$ on it, written
$\langle A, \preccurlyeq\rangle$; a **poset** for short (Definition 2.7.4 in
the textbook).
:::

Examples: the integers with $\le$ form the poset $\langle\mathbb Z, \le\rangle$; the
power set of a set $A$ with inclusion forms the poset
$\langle P(A), R_\subseteq\rangle$.

## Covering

On the number line between 1 and 3 there is always something (2, 1.5, …). In a finite
poset, though, an element can sit *directly* above another, with nothing in between.
That "next one up" relation is all a Hasse diagram draws.

::: define Covering | 覆盖
Let $\langle A, \preccurlyeq\rangle$ be a poset and $x, y \in A$. If $x \prec y$ and
there is **no** $z \in A$ with $x \prec z \prec y$, then $y$
**covers** $x$ (Definition 2.7.5 in the textbook).
:::

::: example Covers in divisibility on {1, 2, 4, 6}
In the poset $\langle\{1,2,4,6\}, \mid\rangle$, which of these are covers: 2 and 1;
4 and 2; 6 and 2; 4 and 1; 6 and 4?
== Covers ==
- 2 covers 1: $1 \prec 2$ and nothing in the set lies strictly between.
- 4 covers 2 and 6 covers 2: likewise.
== Not covers ==
- 4 does **not** cover 1: $1 \prec 2 \prec 4$, so 2 lies in between.
- 6 and 4: not comparable at all ($4 \nmid 6$, $6 \nmid 4$), so neither covers the other.
:::

::: callout note A duplicated line on the slide
The slide lists "4 和 1" twice, once ticked and once crossed. The crossed one is right:
4 does not cover 1. The ticked line was probably meant to be "2 和 1", which is a cover.
:::

::: hasse The covers in ⟨{1, 2, 4, 6}, |⟩
divides: 1 2 4 6
:::

## Hasse diagrams

Draw the relation diagram (Lesson 2.1) of divisibility on
$A = \{2, 3, 6, 12, 24, 36\}$. As a set of pairs,

$$
\begin{aligned}
\text{“}\mid\text{”} = \{\, &\langle 2,2\rangle, \langle 2,6\rangle, \langle 2,12\rangle, \langle 2,24\rangle, \langle 2,36\rangle,\\
&\langle 3,3\rangle, \langle 3,6\rangle, \langle 3,12\rangle, \langle 3,24\rangle, \langle 3,36\rangle,\\
&\langle 6,6\rangle, \langle 6,12\rangle, \langle 6,24\rangle, \langle 6,36\rangle,\\
&\langle 12,12\rangle, \langle 12,24\rangle, \langle 12,36\rangle, \langle 24,24\rangle, \langle 36,36\rangle \,\},
\end{aligned}
$$

19 pairs ($5+5+4+3+1+1$). Drawn as a relation diagram it is a tangle:

::: graph The relation diagram of divisibility on {2, 3, 6, 12, 24, 36}: too much to read
2 -> 2, 3 -> 3, 6 -> 6, 12 -> 12, 24 -> 24, 36 -> 36
2 -> 6, 2 -> 12, 2 -> 24, 2 -> 36
3 -> 6, 3 -> 12, 3 -> 24, 3 -> 36
6 -> 12, 6 -> 24, 6 -> 36
12 -> 24, 12 -> 36
:::

But most of it can be worked out, because we *know* the relation is a partial order.
Each of the three properties lets us drop something:

1. **Reflexive**: every vertex has a loop. Since they all do, leave the loops out.
2. **Antisymmetric**: two different vertices have at most one edge between them, in
   one direction. Always draw the smaller element **lower**, so every edge points
   upwards, and leave the arrowheads out.
3. **Transitive**: if $x \prec z \prec y$, the edge from $x$ to $y$ follows from the
   other two. Leave it out: draw only the edges where $y$ **covers** $x$.

::: define Hasse diagram | 哈斯图
A drawing of a finite poset $\langle A, \preccurlyeq\rangle$: one point per element,
with $x$ drawn **below** $y$ whenever $x \prec y$, and a line between $x$ and $y$
exactly when one covers the other. No loops and no arrows.
:::

::: hasse Divisibility on {2, 3, 6, 12, 24, 36}
divides: 2 3 6 12 24 36
:::

Only five lines are left: 2–6, 3–6, 6–12, 12–24, 12–36. You still read the whole
relation off it: $x \preccurlyeq y$ exactly when you can climb from $x$ to $y$ along
lines going upwards (or $x = y$). For example, $2 \mid 36$ because 2–6–12–36 climbs.

::: callout pitfall "Higher" means "later in the order", not "bigger"
The Hasse diagram of $\langle\{\varnothing, \{a\}\}, \supseteq\rangle$ has
$\{a\}$ at the **bottom** and $\varnothing$ at the top, since $\{a\} \supseteq
\varnothing$ makes $\{a\} \preccurlyeq \varnothing$. Likewise
$\langle\{1, 2\}, \ge\rangle$ puts **2 below 1**. Always draw from the order you are
given, never from what "bigger" usually means.
:::

::: hasse ⟨{1, 2}, ≥⟩: 2 is drawn below 1
order: 2 < 1
:::

::: example Divisibility on 1 to 9
Draw the Hasse diagram of $\langle\{1,2,\dots,9\}, R_\text{整除}\rangle$, where
$R_\text{整除}$ is divisibility.
== Find the covers ==
1 divides everything, and is covered by the primes 2, 3, 5, 7 (nothing lies between 1
and a prime). Then 4 covers 2; 6 covers 2 and 3; 9 covers 3; 8 covers 4. 8 does not
cover 2, since $2 \mid 4 \mid 8$.
== Draw by levels ==
1 at the bottom; 2, 3, 5, 7 above it; 4, 6, 9 above those; 8 on top of 4. The nine
lines are 1–2, 1–3, 1–5, 1–7, 2–4, 2–6, 3–6, 3–9, 4–8.
:::

::: hasse ⟨{1, …, 9}, divisibility⟩
divides: 1 2 3 4 5 6 7 8 9
:::

::: example The subsets of {a, b, c}
Draw the Hasse diagram of $\langle P(\{a,b,c\}), R_\subseteq\rangle$, where
$P(\{a,b,c\}) = \{\varnothing, \{a\}, \{b\}, \{c\}, \{a,b\}, \{a,c\}, \{b,c\},
\{a,b,c\}\}$.
== Find the covers ==
A set covers another exactly when it has **one more element**. So $\varnothing$ is
covered by the three singletons; each singleton by the two pairs containing it; each
pair by $\{a,b,c\}$. That is $3 + 6 + 3 = 12$ lines.
== Draw ==
Four levels by size: $\varnothing$; the singletons; the pairs; $\{a,b,c\}$. The picture
is a cube standing on a corner.
:::

::: hasse ⟨P({a, b, c}), ⊆⟩: a cube
subsets: a b c
:::

Reading a diagram backwards is just as common in exams.

::: example Reading A and R off a Hasse diagram
The poset $\langle A, R\rangle$ has the Hasse diagram below (Figure 2.7.2 in the
textbook): lines b–d, b–e, c–d, c–e, d–f, e–f and g–h, and $a$ on its own. Write out
$A$ and $R$.
== The set ==
Every point is an element: $A = \{a,b,c,d,e,f,g,h\}$.
== The covering pairs ==
Each line, lower element first: $\langle b,d\rangle, \langle b,e\rangle,
\langle c,d\rangle, \langle c,e\rangle, \langle d,f\rangle, \langle e,f\rangle,
\langle g,h\rangle$.
== Put back what the diagram left out ==
Transitivity: $b \prec d \prec f$ gives $\langle b,f\rangle$, and $c \prec d \prec f$
gives $\langle c,f\rangle$. Reflexivity: every loop, $I_A$. So
$$
\begin{aligned}
R = \{\, &\langle b,d\rangle, \langle b,e\rangle, \langle b,f\rangle, \langle c,d\rangle, \langle c,e\rangle,\\
&\langle c,f\rangle, \langle d,f\rangle, \langle e,f\rangle, \langle g,h\rangle \,\} \cup I_A,
\end{aligned}
$$
9 pairs plus the 8 loops: 17 pairs in all.
:::

::: hasse Figure 2.7.2
order: b < d, b < e, c < d, c < e, d < f, e < f, g < h
elements: a
:::

::: callout exam Reading a diagram
When you write $R$ from a Hasse diagram, the two things people forget are the
**loops** ($\cup\, I_A$) and the pairs that come from **climbing more than one line**
($\langle b,f\rangle$ above). An isolated point is still an element of $A$, related
only to itself.
:::

## Least, greatest, minimal and maximal elements

Look at a Hasse diagram and ask "what's at the bottom?" There are two different
answers. An element can be at the bottom **of everything** (below every other element),
or just have **nothing beneath it**. In a chain those agree; in a poset with side-by-side
branches they don't.

::: define Least and greatest elements | 最小元与最大元
Let $\langle A, \preccurlyeq\rangle$ be a poset, $B \subseteq A$ and $y \in B$
(Definition 2.7.6 ①② in the textbook).
1. If $y \preccurlyeq x$ for **every** $x \in B$, then $y$ is the
   {{term least element | 最小元}} of $B$.
2. If $x \preccurlyeq y$ for **every** $x \in B$, then $y$ is the
   {{term greatest element | 最大元}} of $B$.
:::

::: define Minimal and maximal elements | 极小元与极大元
Let $\langle A, \preccurlyeq\rangle$ be a poset, $B \subseteq A$ and $y \in B$
(Definition 2.7.6 ③④ in the textbook).
1. If for every $x \in B$, $x \preccurlyeq y$ implies $x = y$, then $y$ is a
   {{term minimal element | 极小元}} of $B$: nothing in $B$ is strictly below $y$.
2. If for every $x \in B$, $y \preccurlyeq x$ implies $x = y$, then $y$ is a
   {{term maximal element | 极大元}} of $B$: nothing in $B$ is strictly above $y$.
:::

The least element must be **comparable with everything** in $B$; a minimal element
only needs nothing below it, and can be incomparable with most of $B$. In a Hasse
diagram of $B$ alone: minimal elements are the points with no line going down, maximal
ones the points with no line going up.

::: callout pitfall Maximal is not greatest
"Maximal" (极大) means *nothing is above it*; "greatest" (最大) means *it is above
everything*. A greatest element is always maximal, but a maximal element need not be
greatest: in $\{6, 12, 24, 36\}$ under divisibility, 36 is maximal but not greatest,
because $24 \nmid 36$.
:::

::: example True or false, on ⟨{2, 3, 6, 12, 24, 36}, |⟩
$X = \{2, 3, 6, 12, 24, 36\}$ under divisibility (Hasse diagram in the previous
section). True or false?
(1) 36 is the greatest element of $B = \{6, 12, 24, 36\}$.
(2) 24 is the greatest element of $B = \{2, 6, 12, 24\}$.
(3) 2 is the least element of $B = \{2, 3, 6, 12\}$.
(4) In $\{6, 12, 24, 36\}$, 24 is a maximal element.
(5) In $\{2, 3, 6, 12, 24\}$, 2 and 3 are both minimal elements.
== Greatest and least ==
(1) False: $24 \nmid 36$, so 36 is not above 24. In fact $\{6,12,24,36\}$ has no
greatest element. (2) True: 2, 6, 12 and 24 all divide 24. (3) False: $2 \nmid 3$.
== Maximal and minimal ==
(4) True: no element of the set is a multiple of 24 other than 24 itself (36 is also
maximal). (5) True: nothing in the set divides 2 or 3 except themselves. Since there
are two minimal elements, there is no least element.
:::

::: hasse B = {6, 12, 24, 36} marked: two maximal elements, so no greatest
divides: 2 3 6 12 24 36
highlight: 6 12 24 36
:::

For **finite** sets these facts always hold:

::: theorem Special elements of a finite set
Let $B$ be a finite, nonempty subset of a poset.
1. $B$ always has a minimal element (and a maximal one), but it may have no least
   (greatest) element.
2. A least element, if there is one, is **unique**; there may be several minimal
   elements.
3. If $B$ has **exactly one** minimal element, it is the least element of $B$ (and
   likewise for maximal and greatest).
:::

Why: start anywhere and keep stepping down to something strictly smaller; in a finite
set you can't step forever (and can't come back, by antisymmetry), so you stop at a
minimal element. If $y$ and $y'$ are both least, $y \preccurlyeq y'$ and
$y' \preccurlyeq y$, so $y = y'$. Point 3 is proved below for the maximal case.

::: example Special elements from Figure 2.7.3
The poset $\langle A, \preccurlyeq\rangle$ has the Hasse diagram of Figure 2.7.2 again
(lines b–d, b–e, c–d, c–e, d–f, e–f, g–h; $a$ alone). Find the minimal, least, maximal
and greatest elements of $A$.
== Minimal and maximal ==
No line going down: $a, b, c, g$ are **minimal**. No line going up: $a, f, h$ are
**maximal**. The isolated $a$ is both: nothing is below it or above it.
== Least and greatest ==
There are several minimal elements, so **no least element**; several maximal ones, so
**no greatest element**.
:::

::: example Subsets without ∅ and X
$X$ is a set with $|X| = n$, and $A = P(X) - \{\varnothing\} - \{X\}$ (all subsets
except the empty set and $X$ itself), with $A \neq \varnothing$. In the poset
$\langle A, R_\subseteq\rangle$: (1) is there a greatest element? (2) a least element?
(3) what do the maximal and minimal elements look like? (The slide gives no answer;
here is the working.)
== Picture it ==
For $X = \{a,b,c\}$, take the cube $\langle P(X), \subseteq\rangle$ and remove its top
and bottom points. What's left is two levels: the three singletons and the three pairs.
== Minimal and maximal ==
The **singletons** $\{x\}$ ($x \in X$) are minimal: the only smaller subset,
$\varnothing$, has been removed. The sets **missing exactly one element**,
$X - \{x\}$, are maximal: the only larger one, $X$, has been removed.
== Least and greatest ==
$A \neq \varnothing$ means $n \ge 2$, so there are $n \ge 2$ singletons, all minimal:
**no least element**. Likewise the $n$ sets $X - \{x\}$ are all maximal: **no greatest
element**. (For $n = 2$, $A = \{\{a\}, \{b\}\}$ and each element is both minimal and
maximal.)
:::

::: hasse ⟨A, ⊆⟩ for X = {a, b, c}: the cube without its top and bottom (a = {a}, ab = {a, b}, …)
order: a < ab, a < ac, b < ab, b < bc, c < ac, c < bc
:::

## Upper and lower bounds

Least and greatest elements must lie **inside** $B$. Often we want something above all
of $B$ that may lie outside it, like an upper limit for a set of numbers.

::: define Upper and lower bounds | 上界与下界
Let $\langle A, \preccurlyeq\rangle$ be a poset, $B \subseteq A$ and $y \in A$
(Definition 2.7.7 ①② in the textbook).
1. If $x \preccurlyeq y$ for every $x \in B$, then $y$ is an
   {{term upper bound | 上界}} of $B$.
2. If $y \preccurlyeq x$ for every $x \in B$, then $y$ is a
   {{term lower bound | 下界}} of $B$.
:::

The only difference from the greatest and least elements is $y \in A$ instead of
$y \in B$. A set can have many upper bounds; the best one is the lowest.

::: define Least upper bound and greatest lower bound | 最小上界与最大下界
Let $\langle A, \preccurlyeq\rangle$ be a poset and $B \subseteq A$ (Definition 2.7.7
③④ in the textbook).
1. Let $C = \{y \mid y \text{ is an upper bound of } B\}$. The least element of $C$ is
   the least upper bound, or {{term supremum | 上确界}}, of $B$.
2. Let $D = \{y \mid y \text{ is a lower bound of } B\}$. The greatest element of $D$
   is the greatest lower bound, or {{term infimum | 下确界}}, of $B$.
:::

Since a least element is unique when it exists, a set has at most one supremum and at
most one infimum, but it may have none (when there are no upper bounds, or no least
one among them).

::: example Bounds in ⟨{2, 3, 6, 12, 24, 36}, |⟩
True or false? (1) 6 and 2 are both lower bounds of $B = \{6, 12, 24, 36\}$.
(2) 36 and 24 are both upper bounds of $B = \{2, 6, 12, 24\}$.
== Answer ==
(1) True: 6 and 2 divide each of 6, 12, 24, 36. (3 is a lower bound too; the lower
bounds are 2, 3, 6, and the infimum is 6.)
(2) False: 24 is an upper bound, but 36 isn't, because $24 \nmid 36$.
:::

::: example Supremum and infimum
Now $X = \{2, 3, 6, 12, 24, 36, 48, 72\}$ under divisibility and $B = \{6, 12, 24\}$.
True or false? (1) 48 is the supremum of $B$. (2) 6 is the infimum of $B$.
== Upper bounds ==
Multiples of 24 in $X$: $C = \{24, 48, 72\}$. Its least element is 24 (it divides 48
and 72), so $\sup B = 24$: (1) is **false**. 48 is an upper bound, just not the least.
== Lower bounds ==
Divisors of 6 in $X$: $D = \{2, 3, 6\}$. Its greatest element is 6 (2 and 3 divide it),
so $\inf B = 6$: (2) is **true**.
:::

::: hasse ⟨{2, 3, 6, 12, 24, 36, 48, 72}, |⟩ with B = {6, 12, 24} marked
divides: 2 3 6 12 24 36 48 72
highlight: 6 12 24
:::

How these notions relate:

- The least element of $B$ is a lower bound of $B$, and in fact the **greatest** lower
  bound (any lower bound is below it, since it's in $B$).
- A lower bound of $B$ need not be the least element of $B$: it may not even be in $B$.

| Notion | Must it lie in $B$? | Compared with | How many |
| --- | --- | --- | --- |
| Least / greatest element | Yes | every element of $B$ | at most one |
| Minimal / maximal element | Yes | elements of $B$ comparable with it | any number (at least one if $B$ is finite and nonempty) |
| Lower / upper bound | No, anywhere in $A$ | every element of $B$ | any number |
| Infimum / supremum | No, anywhere in $A$ | the best bound | at most one |

::: example An in-class question: upper bounds of {2, 3, 4}
$A = \{1, 2, \dots, 12\}$, $B = \{2, 3, 4\}$, $\preccurlyeq$ is divisibility. Which are
the upper bounds of $B$ in $\langle A, \preccurlyeq\rangle$?
A: 5, 6, 7, 8, 9, 10, 11, 12. B: 8, 12. C: 9, 12. D: 12.
== Answer: D ==
An upper bound must be divisible by 2, 3 and 4, so it is a multiple of
$\operatorname{lcm}(2,3,4) = 12$. The only one in $A$ is 12. (8 is not divisible by 3;
9 not by 2 or 4.) So 12 is the only upper bound, and also the supremum. The only lower
bound is 1, which is the infimum.
:::

::: hasse ⟨{1, …, 12}, |⟩ with B = {2, 3, 4} marked
divides: 1 2 3 4 5 6 7 8 9 10 11 12
highlight: 2 3 4
:::

::: callout exam What exams ask
Given a Hasse diagram (or a divisibility poset) and a subset $B$: list $B$'s minimal,
maximal, least and greatest elements, its upper and lower bounds, and its supremum and
infimum. Work from the diagram: bounds are the elements you can reach by climbing up
(down) from **every** element of $B$; the supremum is the lowest of those, if there is
exactly one lowest.
:::

## A unique maximal element

A chapter-2 exercise (textbook P125, no. 3): *is there a partial order $\le$ on a set
$X$ such that $\langle X, \le\rangle$ has exactly one maximal element but no greatest
element?* The answer depends on whether $X$ is finite.

::: theorem A unique maximal element of a finite poset is the greatest
If $X$ is finite and $\langle X, \le\rangle$ has exactly one maximal element $a$, then
$a$ is the greatest element.
:::

**The idea.** If $a$ weren't greatest, some element is not below $a$; keep climbing
from it. In a finite set the climb has to end, and where it ends is a second maximal
element.

**The proof** (by contradiction). Let $X = \{a_1, \dots, a_n\}$ and suppose $a_i$ is the
only maximal element but not the greatest.

1. Since $a_i$ is not greatest, there is some $a_{j_1}$ with $a_{j_1} \le a_i$ false.
2. Since $a_i$ is maximal, $a_i \le a_{j_1}$ is false too (otherwise $a_{j_1}$ would be
   strictly above $a_i$). So $a_{j_1}$ and $a_i$ are not comparable.
3. If $a_{j_1}$ is maximal, that contradicts uniqueness. Otherwise there is
   $a_{j_2}$ with $a_{j_1} < a_{j_2}$. If $a_{j_2}$ is maximal, contradiction; otherwise
   continue: $a_{j_1} < a_{j_2} < a_{j_3} < \cdots$.
4. The elements in this strict chain are all different (by antisymmetry and
   transitivity a strict chain can't return to an earlier element), and $X$ is finite,
   so the chain stops at some $a_{j_h}$, which is maximal.
5. $a_{j_h} \ne a_i$: otherwise $a_{j_1} \le a_i$, which step 1 ruled out. So
   $a_{j_h}$ is a second maximal element, a contradiction.

On an **infinite** set it can fail. Take $\mathbb N^+ = \{1, 2, 3, \dots\}$ with
divisibility $R$: there is no maximal element at all (every $n$ divides $2n$). Now add
one new element $a$ above 1 and 2 only:

$$
X = \{a, 1, 2, 3, \dots\}, \qquad S = R \cup \{\langle 1,a\rangle, \langle 2,a\rangle, \langle a,a\rangle\}.
$$

Nothing is above $a$, so $a$ is maximal; every number $n$ still has $2n$ above it, so
$a$ is the **only** maximal element. But $a$ is not greatest: $\langle 3, a\rangle
\notin S$.

::: callout note The slide's counter-example misses a pair
The slide gives $S = R \cup \{\langle 2,a\rangle, \langle a,a\rangle\}$. That relation
isn't transitive: $\langle 1,2\rangle \in R$ and $\langle 2,a\rangle \in S$ require
$\langle 1,a\rangle \in S$. With $\langle 1,a\rangle$ added (as above), $S$ is a partial
order and the example works.
:::

## Counting the relations on an n-element set

Another chapter-2 exercise (textbook P114, no. 13): let $|X| = n$. How many relations on
$X$ are there, and how many have each property? The trick is to count **relation
matrices** (Lesson 2.1): a relation on $X$ is the same thing as an $n \times n$ matrix
of 0s and 1s, so counting relations means counting the ways to fill the matrix. Here is
the $3 \times 3$ picture, with a letter for each free entry:

$$
\begin{bmatrix} a & b & c\\ d & e & f\\ g & h & i \end{bmatrix}
$$

**All relations.** $n^2$ entries, each 0 or 1:

::: formula Number of relations on an n-set | 关系的个数
$$2^{n^2}$$
--
n | number of elements of the set $X$
:::

**Reflexive** relations have every diagonal entry 1 (and **irreflexive** ones every
diagonal entry 0); only the $n^2 - n$ entries off the diagonal are free:

$$
\text{reflexive: } \begin{bmatrix} 1 & b & c\\ d & 1 & f\\ g & h & 1 \end{bmatrix}
\qquad
\text{irreflexive: } \begin{bmatrix} 0 & b & c\\ d & 0 & f\\ g & h & 0 \end{bmatrix}
$$

::: formula Reflexive (or irreflexive) relations | 自反（反自反）关系的个数
$$2^{n(n-1)}$$
--
n | number of elements of the set $X$
:::

**Symmetric** relations: an entry and its mirror image across the diagonal must be
equal, so each mirrored pair is one choice. There are $(n^2 - n)/2$ pairs off the
diagonal plus $n$ diagonal entries, $(n^2 + n)/2$ free choices:

$$
\begin{bmatrix} a_1 & b_1 & c_1\\ b_2 & a_2 & d_1\\ c_2 & d_2 & a_3 \end{bmatrix}
\quad (b_1 = b_2,\ c_1 = c_2,\ d_1 = d_2)
$$

::: formula Symmetric relations | 对称关系的个数
$$2^{n(n+1)/2}$$
--
n | number of elements of the set $X$
:::

**Antisymmetric** relations: for $i \ne j$, the entries $a_{ij}$ and $a_{ji}$ may not
both be 1. Of the four ways to fill a mirrored pair (0 0, 0 1, 1 0, 1 1), three are
allowed. There are $n(n-1)/2$ mirrored pairs, each with 3 choices, and $n$ diagonal
entries, each with 2:

::: formula Antisymmetric relations | 反对称关系的个数
$$3^{n(n-1)/2} \cdot 2^n$$
--
n | number of elements of the set $X$
:::

**Two properties together.** Fix the diagonal (all 1 for reflexive, all 0 for
irreflexive), then count the off-diagonal part as before:

- reflexive and symmetric, or irreflexive and symmetric: $2^{n(n-1)/2}$;
- reflexive and antisymmetric, or irreflexive and antisymmetric: $3^{n(n-1)/2}$.

::: formula Reflexive (or irreflexive) and symmetric relations
$$2^{n(n-1)/2}$$
--
n | number of elements of the set $X$
:::

::: formula Reflexive (or irreflexive) and antisymmetric relations
$$3^{n(n-1)/2}$$
--
n | number of elements of the set $X$
:::

**One property or another.** Use inclusion–exclusion (Lesson 1.3):
$|P \cup Q| = |P| + |Q| - |P \cap Q|$.

::: example Relations that are reflexive or symmetric
Count the relations on an $n$-set that are reflexive or symmetric; then those that are
reflexive or antisymmetric. Check with $n = 3$.
== Reflexive or symmetric ==
$$
2^{n(n-1)} + 2^{n(n+1)/2} - 2^{n(n-1)/2}
$$
The irreflexive-or-symmetric count is the same, since irreflexive relations are counted
exactly like reflexive ones. For $n = 3$: $64 + 64 - 8 = 120$.
== Reflexive or antisymmetric ==
$$
2^{n(n-1)} + 3^{n(n-1)/2} \cdot 2^n - 3^{n(n-1)/2}
$$
and the same for irreflexive or antisymmetric. For $n = 3$: $64 + 216 - 27 = 253$.
== Check ==
Listing all $2^9 = 512$ relations on a 3-element set by computer gives exactly these
numbers: 64 reflexive, 64 symmetric, 216 antisymmetric, 8 reflexive and symmetric, 27
reflexive and antisymmetric, 120 and 253.
:::

::: callout note Two slide typos
The question list prints "反自反或对称关系" twice; the second was meant to be
"反自反或反对称关系" (irreflexive or antisymmetric), which the later slides work out.
On those slides the minus sign drifts next to $2^n$; the count is
$2^{n(n-1)} + 3^{n(n-1)/2}\cdot 2^n - 3^{n(n-1)/2}$, with the last term subtracted.
:::

**Equivalence relations.** By Lesson 2.6, equivalence relations on $X$ correspond
one-to-one to partitions of $X$, so count partitions. The number of ways to split an
$n$-set into exactly $m$ nonempty blocks is the {{term Stirling number of the second kind | 第二类斯特林数}}
$S(n, m)$, and the total over all $m$ is the {{term Bell number | 贝尔数}} $B_n$.

::: formula Equivalence relations on an n-set | 等价关系的个数
$$
\begin{gathered}
S(n,m) = \frac{1}{m!}\sum_{k=0}^{m} (-1)^k \binom{m}{k} (m-k)^n \\
B_n = \sum_{m=1}^{n} S(n,m)
\end{gathered}
$$
--
n | number of elements of the set $X$
m | number of blocks (equivalence classes)
S(n,m) | number of partitions of $X$ into $m$ blocks (划分数)
B_n | number of equivalence relations on $X$
:::

::: example Equivalence relations on 3 and 4 elements
How many equivalence relations are there on a 3-element set? On a 4-element set?
== Three elements ==
$S(3,1) = 1$ (one block), $S(3,2) = 3$ (one element alone, the other two together),
$S(3,3) = 1$ (all apart): $B_3 = 5$.
== Four elements ==
$S(4,1) = 1$; $S(4,2) = \frac12(2^4 - 2 \cdot 1^4) = 7$; $S(4,3) = 6$ (choose the pair
that shares a block, $\binom42$); $S(4,4) = 1$. So $B_4 = 1 + 7 + 6 + 1 = 15$.
:::

| Kind of relation on an $n$-set | Count | For $n = 3$ |
| --- | --- | --- |
| All | $2^{n^2}$ | 512 |
| Reflexive; irreflexive | $2^{n(n-1)}$ | 64 |
| Symmetric | $2^{n(n+1)/2}$ | 64 |
| Antisymmetric | $3^{n(n-1)/2}\cdot 2^n$ | 216 |
| Reflexive (or irreflexive) and symmetric | $2^{n(n-1)/2}$ | 8 |
| Reflexive (or irreflexive) and antisymmetric | $3^{n(n-1)/2}$ | 27 |
| Reflexive (or irreflexive) or symmetric | $2^{n(n-1)} + 2^{n(n+1)/2} - 2^{n(n-1)/2}$ | 120 |
| Reflexive (or irreflexive) or antisymmetric | $2^{n(n-1)} + 3^{n(n-1)/2}\cdot 2^n - 3^{n(n-1)/2}$ | 253 |
| Equivalence relations | $B_n = \sum_{m} S(n,m)$ | 5 |

::: callout key Count the free entries of the matrix
Every count here comes from the relation matrix: decide which entries are forced
(the diagonal), which move together (mirrored pairs), and how many choices each free
unit has (2 for an entry; 2 for a symmetric pair; 3 for an antisymmetric pair). Multiply.
:::

## The smallest and largest relation with each property

The last exercise of the chapter: on a nonempty set, say $X = \{a, b, c\}$, which is the
**smallest** relation (under $\subseteq$, i.e. with the fewest pairs, contained in all
the others) that has a given property, and which is the **largest** (containing all the
others)? Again think in matrices: a "?" is an entry the property leaves free.

**Reflexive**: the diagonal must be 1, the rest is free. Smallest: all "?" set to 0,
the identity $I_X$. Largest: all set to 1, the universal relation $X \times X$.

$$
\begin{bmatrix} 1&?&?\\ ?&1&?\\ ?&?&1 \end{bmatrix}
\qquad
\text{smallest } \begin{bmatrix} 1&0&0\\ 0&1&0\\ 0&0&1 \end{bmatrix} = I_X
\qquad
\text{largest } \begin{bmatrix} 1&1&1\\ 1&1&1\\ 1&1&1 \end{bmatrix} = X \times X
$$

**Irreflexive**: the diagonal must be 0. Smallest: the empty relation $\varnothing$.
Largest: everything off the diagonal,

$$
\begin{bmatrix} 0&1&1\\ 1&0&1\\ 1&1&0 \end{bmatrix} = (X \times X) - I_X .
$$

**Symmetric**: mirrored entries move together, so all 0 and all 1 both work: smallest
$\varnothing$, largest $X \times X$.

**Antisymmetric**: smallest $\varnothing$. But there is **no largest**. Each mirrored pair
can hold at most one 1, and the two choices are equally good. For example the upper
and the lower triangle

$$
\begin{bmatrix} 1&1&1\\ 0&1&1\\ 0&0&1 \end{bmatrix}
\qquad
\begin{bmatrix} 1&0&0\\ 1&1&0\\ 1&1&1 \end{bmatrix}
$$

are both antisymmetric and can't be made larger, but a relation containing both would
contain $\langle a,b\rangle$ and $\langle b,a\rangle$ and wouldn't be antisymmetric.
They are **maximal**, not greatest, exactly as in the previous sections.

**Transitive**: smallest $\varnothing$ (it has no pairs to chain), largest $X \times X$.

**Equivalence**: it must be reflexive, so the smallest is $I_X$ (which is also
symmetric and transitive); the largest is $X \times X$.

**Partial order**: it must be reflexive, so the smallest is $I_X$ (which is also
antisymmetric and transitive). Like antisymmetric relations, there is **no largest**: the
two triangles above are partial orders (the total orders $a \prec b \prec c$ and
$c \prec b \prec a$), and no partial order contains both. On a 3-element set the maximal
partial orders are exactly the $3! = 6$ total orders.

| Property | Smallest | Largest |
| --- | --- | --- |
| Reflexive | $I_X$ | $X \times X$ |
| Irreflexive | $\varnothing$ | $(X \times X) - I_X$ |
| Symmetric | $\varnothing$ | $X \times X$ |
| Antisymmetric | $\varnothing$ | none |
| Transitive | $\varnothing$ | $X \times X$ |
| Equivalence relation | $I_X$ | $X \times X$ |
| Partial order | $I_X$ | none |

::: callout pitfall Symmetric and antisymmetric at once
$\varnothing$ is the smallest symmetric **and** the smallest antisymmetric relation: it
is both. So is $I_X$. Antisymmetric does not mean "not symmetric" (Lesson 2.4): a
relation with no pairs $\langle x,y\rangle$, $x \ne y$, is both.
:::

::: hasse The upper triangle as a partial order on {a, b, c}: the total order a ≺ b ≺ c
order: a < b < c
:::

## Summary

::: cards Partial orders
Partial order (偏序关系) :: A relation on a nonempty set that is reflexive, antisymmetric and transitive; written $\preccurlyeq$.
What does $x \preccurlyeq y$ mean in words? :: "$x$ comes no later than $y$ in this order". It is only a name: under $\supseteq$ or $\ge$ the bigger thing comes first.
Strict order $x \prec y$ :: $x \preccurlyeq y$ and $x \ne y$.
Comparable elements (可比) :: $x \preccurlyeq y$ or $y \preccurlyeq x$.
Total (linear) order (全序, 线序) :: A partial order in which every two elements are comparable.
Poset (偏序集) :: A set with a partial order on it, written $\langle A, \preccurlyeq\rangle$.
When does $y$ cover $x$? (覆盖) :: $x \prec y$ and no $z$ has $x \prec z \prec y$.
Hasse diagram (哈斯图) :: Only the covering pairs, smaller elements lower; no loops, no arrows, no transitive edges.
Least element vs minimal element :: Least: below every element of $B$. Minimal: nothing in $B$ strictly below it. Least is unique; minimal elements can be many.
Upper bound vs greatest element :: An upper bound may lie anywhere in $A$; the greatest element must lie in $B$.
Supremum (上确界) :: The least element of the set of upper bounds of $B$ (if it exists).
Finite set with exactly one maximal element :: That element is the greatest. Not true for infinite sets.
Number of antisymmetric relations on an n-set :: $3^{n(n-1)/2}\cdot 2^n$: three choices per mirrored pair, two per diagonal entry.
Number of symmetric relations on an n-set :: $2^{n(n+1)/2}$: one choice per mirrored pair or diagonal entry.
Largest antisymmetric relation or partial order :: There is none: the upper and lower triangles are maximal, and nothing contains both.
:::

::: quiz Partial orders
? Which of these relations are partial orders?
- [x] $\subseteq$ on $2^X$
- [ ] $\subset$ on $2^X$
- [x] the identity relation $I_X$
- [ ] $<$ on $\mathbb R$
- [ ] congruence modulo $n$ on $\mathbb N$
- [x] divisibility on the positive integers
> A partial order must be reflexive, antisymmetric and transitive. $\subset$ and $<$ are
> not reflexive. Congruence mod $n$ is an equivalence relation but not antisymmetric
> ($1 \equiv n+1$ both ways). $\subseteq$, $I_X$ and divisibility have all three
> properties.

? In $\langle\{1, 2, 4, 6\}, \mid\rangle$, which statements are true?
- [x] 2 covers 1
- [x] 4 covers 2
- [x] 6 covers 2
- [ ] 4 covers 1
- [ ] 6 covers 4
> 4 does not cover 1 because $1 \prec 2 \prec 4$; 4 and 6 aren't comparable at all. The
> other three pairs have nothing in between.

? $A = \{1, 2, \dots, 12\}$, $B = \{2, 3, 4\}$, $\preccurlyeq$ is divisibility. Which are the upper bounds of $B$ in $\langle A, \preccurlyeq\rangle$?
- [ ] 5, 6, 7, 8, 9, 10, 11, 12
- [ ] 8, 12
- [ ] 9, 12
- [x] 12
> An upper bound must be a multiple of 2, 3 and 4, so of 12. The only one in $A$ is 12.

? In $\langle\{2, 3, 6, 12, 24, 36, 48, 72\}, \mid\rangle$, what is the supremum of $B = \{6, 12, 24\}$?
answer: 24
> The upper bounds are the multiples of 24 in the set: 24, 48, 72. The least of them is
> 24, which divides 48 and 72.

? In the poset of Figure 2.7.3 (lines b–d, b–e, c–d, c–e, d–f, e–f, g–h; $a$ alone), which are maximal elements?
- [x] $a$
- [ ] $b$
- [ ] $d$
- [x] $f$
- [x] $h$
> Maximal elements have no line going up: $a$ (isolated), $f$ and $h$. With three of them,
> there is no greatest element.

? How many reflexive relations are there on an $n$-element set?
expression: 2^(n^2 - n)
variables: n
> The $n$ diagonal entries of the matrix must be 1; the other $n^2 - n$ entries are each 0
> or 1: $2^{n(n-1)}$.

? How many antisymmetric relations are there on a 3-element set?
answer: 3^3 * 2^3
> $n(n-1)/2 = 3$ mirrored pairs with 3 choices each and 3 diagonal entries with 2 each:
> $3^3 \cdot 2^3 = 27 \cdot 8 = 216$.

? How many relations on a 3-element set are reflexive or symmetric?
answer: 64 + 64 - 8
> Inclusion–exclusion: $2^{6} + 2^{6} - 2^{3} = 64 + 64 - 8 = 120$.

? How many equivalence relations are there on a 4-element set?
answer: 15
> Count partitions: $S(4,1) + S(4,2) + S(4,3) + S(4,4) = 1 + 7 + 6 + 1 = 15$ (the Bell
> number $B_4$).

? On $X = \{a, b, c\}$, how many ordered pairs does the largest irreflexive relation have?
answer: 6
> The largest irreflexive relation is $(X \times X) - I_X$: $9 - 3 = 6$ pairs.

? Which property has a smallest relation on $X$ (under ⊆) but no largest one?
- [ ] reflexive
- [ ] symmetric
- [x] antisymmetric
- [ ] transitive
- [x] partial order
> For antisymmetric relations and partial orders, the upper and lower triangles are both
> maximal and no single relation contains both, so there is no largest. Reflexive,
> symmetric and transitive relations all have $X \times X$ as the largest.
:::

---
title: Sets and subsets
zh: 集合的基本概念
summary: What discrete mathematics is and what the course covers, then sets, elements and how to write them, Russell's paradox, membership versus inclusion, the empty set, the power set and the universal set.
source: 1-集合 (§1.1 集合的基本概念), 2026-09-01
---

Almost everything in this course is built out of sets. Relations (Unit 2) are sets of
ordered pairs, functions (Unit 3) are special relations, and graphs (Units 4–5) are a set
of vertices plus a set of edges. This lesson sets up the basic vocabulary: what a set is,
how to write one down, the difference between *being an element of* a set and *being a
subset of* it, the empty set, and the set of all subsets (the power set). These ideas
look easy, but the exam likes to test exactly the small distinctions — $\in$ against
$\subseteq$, $\varnothing$ against $\{\varnothing\}$ — so it pays to get them sharp now.

## What discrete mathematics is

Calculus studies quantities that change smoothly: a real number can always be nudged a
little. {{term Discrete mathematics | 离散数学}} studies things that come in separate,
countable pieces: whole numbers, the letters of a word, the files on a disk, the people in
a network and who knows whom. Computers work only with such separate things (bits,
records, steps of an algorithm), which is why this is a core course in computer science.

The first lecture gave a short tour of where the subject comes from:

- **Number theory** (数论) studies the integers: odd and even numbers, primes, factoring.
  Its famous open problems are easy to state. **Goldbach's conjecture** (1742) says every
  even number greater than 2 is a sum of two primes ($8 = 3 + 5$, $14 = 3 + 11$); in 1966
  Chen Jingrun (陈景润) proved "1 + 2": every large enough even number is a prime plus a
  number with at most two prime factors ($16 = 2 + 2\times 7$). **Fermat's last
  theorem** says $x^n + y^n = z^n$ has no solution in positive integers when $n > 2$; it
  was finally proved by Andrew Wiles in 1994.
- **Set theory** (集合论) replaces numbers by abstract "symbols" collected into sets, and
  gives the most basic notions of mathematics: element, set, relation, mapping
  (function). Algorithms are routinely described with sets ("take a pair out of
  $S_{meta}$ and put it into $S$", "repeat while $S_{meta} \ne \varnothing$").
- **Abstract algebra** (近世代数) defines operations on those symbols rather than on
  numbers. A playful example from the slides: "e-bike = battery + frame + tyres" and
  "bicycle = frame + tyres", so "bicycle = e-bike − battery". Different rules for such
  operations give groups, rings and fields.
- **Graph theory** (图论) is set theory made visual: points for the elements, lines for
  the relationships between them. It is everywhere in computer science (networks, maps,
  dependencies).
- **Combinatorics** (组合数学: arrangements, selections, recurrences, generating
  functions) and **mathematical logic** (数理逻辑: logic written in symbols, with rules
  for deducing) complete the picture.

::: callout note Fermat's date
The slide dates Fermat's last theorem to 1621. That is the year the edition of
Diophantus's *Arithmetica* he wrote in was printed; Fermat wrote his famous margin note
around 1637.
:::

The course is organised in parts: set theory, graph theory, algebraic structures and
mathematical logic (elementary number theory and combinatorics are not taught). The
lessons on this site follow the lectures so far: **sets** (this unit), **binary
relations** (Unit 2) and **functions** (Unit 3), which together make up the textbook's
Chapter 1 "Set theory"; then **graphs** and the **Euler and Hamilton problems**
(Units 4–5).

## Sets and elements

A set is one of the few ideas in mathematics that is *not* defined in terms of anything
simpler: it is a starting point, like "point" in geometry. Intuitively:

::: define Set | 集合
A collection of things brought together and regarded as a single whole. The things in
it are its **elements** or **members** (元素, 成员).
:::

Examples: the set of real solutions of $x^2 - 1 = 0$ (that is, $1$ and $-1$); the set of
the 26 English letters; the set of all points of the coordinate plane.

Sets are usually named with capital letters. The standard number sets have their own
letters:

| Symbol | Set | Elements |
| --- | --- | --- |
| $\mathbb{N}$ | natural numbers (自然数集) | $0, 1, 2, \dots$ |
| $\mathbb{Z}$ | integers (整数集) | $\dots, -2, -1, 0, 1, 2, \dots$ |
| $\mathbb{Q}$ | rational numbers (有理数集) | fractions $p/q$ |
| $\mathbb{R}$ | real numbers (实数集) | all points of the number line |
| $\mathbb{C}$ | complex numbers (复数集) | $a + bi$ |

::: callout pitfall Zero is a natural number here
In discrete mathematics (and in this course) **$0 \in \mathbb{N}$**. Some school books
start $\mathbb{N}$ at 1; don't carry that over into counting questions.
:::

## Writing sets down

There are two common ways to describe a set.

::: define Listing method | 列举法
Write all the elements, separated by commas, inside braces:
$\{a, b, c\}$, or, when the pattern is clear, $\mathbb{N} = \{0, 1, 2, \cdots\}$.
:::

::: define Descriptive method | 描述法
Write the property shared by the elements:
$$A = \{x \mid x \text{ has property } P\},$$
read "the set of all $x$ such that $x$ has property $P$". The bar $\mid$ means "such
that".
:::

For example, the solutions of $x^2 - 1 = 0$ are $\{x \mid x \in \mathbb{R} \wedge x^2 - 1 =
0\} = \{-1, 1\}$; here $\wedge$ means "and". Listing is good for small finite sets;
description is the only way for most infinite ones (the set of all primes, all points of
a line).

## Russell's paradox

Can *any* property be used to describe a set? Around 1901 Bertrand Russell showed that the
answer is no, with a paradox that shook the foundations of mathematics (it is called the
**third crisis of mathematics**, after the discovery of irrational numbers and the doubts
about infinitesimals in calculus). The slides tell it as a story.

A village barber hangs out a sign: *"I cut the hair of everyone in the village who does
not cut their own hair, and only theirs."* Call the barber $i$ and let
$$A = \{x \mid i \text{ cuts } x\text{'s hair}\}.$$
Is the barber himself in $A$?

1. If $i \in A$, then $i$ cuts his own hair, so he is one of the people the sign excludes:
   $i \notin A$.
2. If $i \notin A$, then $i$ does not cut his own hair, so the sign says he must: $i \in A$.

Either answer leads to its opposite. Such a "set" cannot exist.

::: callout key The lesson of the paradox
The set version: let $R = \{x \mid x \notin x\}$, the set of all sets that are not
elements of themselves. Then $R \in R$ exactly when $R \notin R$. So a property alone does
not guarantee that a set exists. Axiomatic set theory fixes this by restricting how sets
may be formed; in this course we only describe sets inside a fixed, harmless universe,
and we adopt the rule below that no set is an element of itself.
:::

## The three properties of a set

An ordinary set obeys three rules.

1. **Definiteness** (确定性): for any object, it is clear whether it is in the set or not —
   one or the other, never "partly". (Dropping this rule gives **fuzzy set theory**,
   模糊集合论, where membership can be a degree such as 0.7.)
2. **Distinctness** (互异性): the elements are all different; an element written twice
   counts once. So $\{a, a, b\} = \{a, b\}$ as a set. (A collection that does count
   repeats, like $\{a, a, b\}$ with two $a$'s, is a **multiset**, 多重集.)
3. **No order** (无序性): the order of listing doesn't matter: $\{a, b\} = \{b, a\}$.

::: callout tip When order or repeats do matter
Order matters in an **ordered pair** $\langle a, b\rangle$, which is a different object
from the set $\{a, b\}$: Lesson 2.1 introduces it.
:::

## Membership

::: define Membership | 隶属关系
The relation between an element and a set. "$a$ belongs to $A$" (属于) is written
$a \in A$; "$a$ does not belong to $A$" (不属于) is written $a \notin A$.
:::

The elements of a set can themselves be sets. Take
$$A = \bigl\{a, \{b, c\}, d, \{\{d\}\}\bigr\}.$$
$A$ has exactly **four** elements: $a$, $\{b, c\}$, $d$ and $\{\{d\}\}$. So
$$a \in A,\quad \{b, c\} \in A,\quad d \in A,\quad \{\{d\}\} \in A,$$
but
$$b \notin A,\qquad \{d\} \notin A.$$
$b$ is an element of the element $\{b, c\}$, and $\{d\}$ is an element of the element
$\{\{d\}\}$: they are **elements of elements** (元素的元素), one level down, not elements
of $A$.

A {{term tree diagram | 树形图}} shows the levels (Figure 1.1.1 in the textbook). Each set
is a node, and its elements hang below it:

- $A$
  - $a$
  - $\{b, c\}$
    - $b$
    - $c$
  - $d$
  - $\{\{d\}\}$
    - $\{d\}$
      - $d$

The elements of $A$ are exactly the nodes one level below $A$. Note that $d$ appears
twice: once as an element of $A$, and once three levels down inside $\{\{d\}\}$.

::: callout note A rule against self-membership
To keep the theory free of Russell-type paradoxes, the textbook adopts a rule (Note
1.1.1): **for every set $A$, $A \notin A$.** No set is an element of itself.
:::

::: example Count the elements
How many elements do $B = \{\varnothing, \{\varnothing\}, \{1, 2\}, 1\}$ and
$C = \{\{1, 2, 3\}\}$ have? Is $2 \in B$? Is $1 \in B$?
== Count the top level ==
Separate the outermost braces' contents at the top-level commas. $B$ has four elements:
$\varnothing$, $\{\varnothing\}$, $\{1, 2\}$ and $1$. $C$ has **one** element, the set
$\{1, 2, 3\}$.
== Membership ==
$1$ is listed at the top level, so $1 \in B$. $2$ appears only inside $\{1, 2\}$, so
$2 \notin B$ (it is an element of an element).
:::

## Subsets and equality

Membership compares an *object* with a set. Inclusion compares two *sets*.

::: define Subset | 子集
Let $A$, $B$ be sets. If every element of $B$ is an element of $A$, then $B$ is a
**subset** of $A$; we also say $B$ is contained in $A$ (包含于), or $A$ contains $B$
(包含). Written $B \subseteq A$ or $A \supseteq B$; if not, $B \nsubseteq A$. In symbols
(Definition 1.1.1 in the textbook):
$$B \subseteq A \iff \forall x\,(x \in B \to x \in A).$$
:::

Here $\forall x$ means "for every $x$" and $\to$ means "implies". For example, with
$A = \{x, y, z\}$ and $B = \{x, y\}$, $B \subseteq A$. Also
$\mathbb{N} \subseteq \mathbb{Z} \subseteq \mathbb{R} \subseteq \mathbb{C}$, but
$\mathbb{Z} \nsubseteq \mathbb{N}$ ($-1 \in \mathbb{Z}$ but $-1 \notin \mathbb{N}$).
Every set is a subset of itself: $A \subseteq A$.

::: callout pitfall ∈ is not ⊆
$x \in A$ says "$x$ is **one of the things listed** in $A$". $B \subseteq A$ says "**every
element of** $B$ is listed in $A$". They can both hold for the same pair. Take
$A = \{a, \{a\}\}$ and $B = \{a\}$:

- $B \in A$, because $\{a\}$ is the second element of $A$;
- $B \subseteq A$, because the only element of $B$, namely $a$, is in $A$.

To test $X \in A$, look for $X$ itself in $A$'s list. To test $X \subseteq A$, look for
each element of $X$ in $A$'s list.
:::

::: define Equal sets | 集合相等
Sets $A$ and $B$ are **equal**, $A = B$, when $A \subseteq B$ and $B \subseteq A$
(Definition 1.1.2); otherwise $A \neq B$. So equal sets have exactly the same elements.
:::

This definition is also the standard way to **prove** two sets equal: show each is
contained in the other. Lesson 1.2 does this for the set laws.

::: define Proper subset | 真子集
$B$ is a **proper subset** of $A$, written $B \subset A$, when $B \subseteq A$ but
$B \neq A$ (Definition 1.1.3): $A$ has at least one element that $B$ lacks. If $B$ is not
a proper subset of $A$, write $B \not\subset A$.
:::

So $\mathbb{N} \subset \mathbb{R}$, but $\mathbb{N} \not\subset \mathbb{N}$ (a set is a
subset of itself, never a proper subset). The symbols $\subseteq$ and $\subset$ work like
$\le$ and $<$.

## The empty set

::: define Empty set | 空集
The set with no elements, written $\varnothing$ (Definition 1.1.4). With the descriptive
method, $\varnothing = \{x \mid x \neq x\}$: no object is different from itself.
:::

Why should the empty set be a subset of *everything*? $\varnothing \subseteq A$ means
"every element of $\varnothing$ is in $A$". A counterexample would be an element of
$\varnothing$ that is not in $A$, and there are no elements at all, so there is no
counterexample. (A statement about "every element" of an empty collection is
automatically true: "every unicorn in this room is green".)

::: theorem The empty set is a subset of every set | 空集是一切集合的子集
For every set $A$, $\varnothing \subseteq A$ (Theorem 1.1.1 in the textbook).

*Proof* (by contradiction). Suppose some set $A$ has $\varnothing \nsubseteq A$. By the
definition of subset, there is an $a$ with $a \in \varnothing$ but $a \notin A$. But
$\varnothing$ has no elements, a contradiction. So $\varnothing \subseteq A$.
:::

::: theorem The empty set is unique | 空集是唯一的
There is only one empty set (Corollary 1.1.1).

*Proof.* Suppose $\varnothing_1$ and $\varnothing_2$ are both empty sets. By Theorem
1.1.1 (each is a subset of every set), $\varnothing_1 \subseteq \varnothing_2$ and
$\varnothing_2 \subseteq \varnothing_1$. By the definition of equality,
$\varnothing_1 = \varnothing_2$.
:::

That is why we may say *the* empty set: the set of real solutions of $x^2 = -1$, the set
of even primes greater than 2 and $\{x \mid x \neq x\}$ are all the same set,
$\varnothing$.

::: callout pitfall ∅ is not {∅}
$\varnothing$ is an empty box. $\{\varnothing\}$ is a box containing one empty box: it
has **one** element. So

- $\varnothing \neq \{\varnothing\}$;
- $\varnothing \in \{\varnothing\}$ (it is the one element listed);
- $\varnothing \subseteq \{\varnothing\}$ (true of every set, by Theorem 1.1.1).

Similarly $\{\varnothing, \{\varnothing\}\}$ has two elements, while $\varnothing$ has none.
:::

::: example ∈ or ⊆?
Let $A = \{\varnothing, \{a\}\}$. Decide each: (a) $\varnothing \in A$,
(b) $\varnothing \subseteq A$, (c) $\{a\} \in A$, (d) $\{a\} \subseteq A$,
(e) $\{\varnothing\} \subseteq A$, (f) $a \in A$.
== Membership: look for the object itself ==
$A$'s elements are $\varnothing$ and $\{a\}$. So (a) true, (c) true, (f) false ($a$ is
only an element of an element).
== Inclusion: look for each of its elements ==
(b) true: $\varnothing$ is a subset of every set. (d) false: the element of $\{a\}$ is
$a$, and $a \notin A$. (e) true: the element of $\{\varnothing\}$ is $\varnothing$, and
$\varnothing \in A$.
:::

## Subsets of a finite set

A set with $n$ elements is an **$n$-element set** (n元集); a subset of it with $m$
elements ($m \le n$) is an **$m$-element subset** (m元子集). A one-element set such as
$\{3\}$ is a {{term singleton | 单元集}}. How do we find all the subsets of a finite set?
Sort them by size.

::: example All subsets of {1, 2, 3}
Let $A = \{1, 2, 3\}$. Sort its subsets by the number of elements (Example 1.1.1 in the
textbook).
== 0 elements ==
Only the empty set: $\varnothing$.
== 1 element (singletons) ==
$\{1\}$, $\{2\}$, $\{3\}$.
== 2 elements ==
$\{1, 2\}$, $\{1, 3\}$, $\{2, 3\}$.
== 3 elements ==
$\{1, 2, 3\}$ itself.
== Total ==
$1 + 3 + 3 + 1 = 8 = 2^3$ subsets.
:::

## The power set

::: define Power set | 幂集
The set of **all** subsets of $A$, written $P(A)$ (or $2^A$) (Definition 1.1.5):
$$P(A) = \{X \mid X \subseteq A\}.$$
:::

So $X \in P(A)$ exactly when $X \subseteq A$: the subsets of $A$ become the *elements* of
$P(A)$. For $A = \{1, 2, 3\}$, $P(A)$ is the set of the eight subsets in the example.
The diagram below arranges them by inclusion, smallest at the bottom; a line goes up
from a subset to a subset with one more element. (Diagrams like this are **Hasse
diagrams**, Lesson 2.7.)

::: hasse The eight subsets of {1, 2, 3}, ordered by inclusion
subsets: 1 2 3
:::

How many elements does $P(A)$ have when $A$ has $n$ elements? There are $C(n, 0)$
subsets with 0 elements, $C(n, 1)$ with 1 element, …, $C(n, n)$ with $n$, where
$C(n, m)$ is the number of ways to choose $m$ of $n$ elements. By the binomial theorem
(put $x = y = 1$ in $(x + y)^n$) the total is $2^n$.

::: formula Number of subsets | 幂集的元素个数
$$|P(A)| = C(n,0) + C(n,1) + \cdots + C(n,n) = 2^n$$
--
$n$ | the number of elements of the finite set $A$
$C(n, m)$ | the number of $m$-element subsets, $\frac{n!}{m!\,(n-m)!}$ (also written $\binom nm$)
$\lvert P(A)\rvert$ | the number of subsets of $A$
:::

A quicker way to see $2^n$: to build a subset, go through the $n$ elements and decide for
each one "in" or "out". That is $2 \times 2 \times \cdots \times 2 = 2^n$ choices, and
each sequence of choices gives exactly one subset. (This is also why $P(A)$ is written
$2^A$.)

::: example Power sets of small sets
Find $P(\varnothing)$, $P(\{\varnothing\})$ and $P(\{a, \{a\}\})$.
== The empty set ==
$\varnothing$ has one subset, itself: $P(\varnothing) = \{\varnothing\}$, which has
$2^0 = 1$ element. (Not empty!)
== One element ==
$\{\varnothing\}$ has the subsets $\varnothing$ and $\{\varnothing\}$:
$P(\{\varnothing\}) = \{\varnothing, \{\varnothing\}\}$, $2^1 = 2$ elements.
== Two elements ==
The elements of $\{a, \{a\}\}$ are $a$ and $\{a\}$, so
$P(\{a, \{a\}\}) = \bigl\{\varnothing, \{a\}, \{\{a\}\}, \{a, \{a\}\}\bigr\}$,
$2^2 = 4$ elements.
:::

::: callout exam Typical questions
"Write out $P(A)$", "how many elements does $P(P(\varnothing))$ have?", and true/false
lists mixing $\in$ and $\subseteq$. For the last kind, always first write down the
top-level elements of each set.
:::

## The universal set

In a real problem, all the sets we talk about live inside one bigger set. If we choose
the best student in the class of 2025, every set we consider (prize winners, the top ten,
the class monitors) is a set of students in that year, so that whole year is the
background. If five generals 关羽, 张飞, 赵云, 马超 and 黄忠 hold a contest to see who
fights best, everything happens among these five, and the set of the five is the
background.

::: define Universal set | 全集
In a given problem, a set that contains every set under discussion as a subset is a
**universal set**, written $E$ (Definition 1.1.6).
:::

The universal set is not fixed once and for all: it depends on the problem. (A "set of
everything" would bring back Russell's paradox.) In Venn diagrams the universal set is
the rectangle and the sets are circles inside it; in the drawings on this site the
rectangle is marked $\Omega$, so read $\Omega$ as $E$.

::: venn A set A inside the universal set E (the rectangle)
shade: A
:::

Once $E$ is fixed, we can talk about everything in $E$ that is *outside* $A$: the
complement $\sim A$, which Lesson 1.2 defines along with the other operations.

## Summary

::: callout summary The vocabulary of this lesson
- A set is determined by its elements: no repeats, no order.
- $x \in A$: $x$ is one of $A$'s elements. $B \subseteq A$: every element of $B$ is in $A$.
- $A = B$ means $A \subseteq B$ and $B \subseteq A$; $B \subset A$ means $B \subseteq A$
  and $B \neq A$.
- $\varnothing$ is a subset of every set and is unique; $\varnothing \neq \{\varnothing\}$.
- $P(A)$ is the set of all subsets of $A$; an $n$-element set has $2^n$ subsets.
- The universal set $E$ is the background set of a problem.
:::

::: cards Sets and subsets
Set (集合) :: A collection of things regarded as one whole; its members are its elements. Determined only by which elements it has.
The three properties of a set :: Definiteness (确定性), distinctness (互异性), no order (无序性).
Membership $x \in A$ :: $x$ is one of the elements listed in $A$ (隶属关系).
Subset $B \subseteq A$ (子集) :: Every element of $B$ is an element of $A$: $\forall x\,(x\in B \to x\in A)$.
Equal sets $A = B$ :: $A \subseteq B$ and $B \subseteq A$.
Proper subset $B \subset A$ (真子集) :: $B \subseteq A$ and $B \neq A$.
Empty set (空集) :: The set with no elements, $\varnothing = \{x \mid x \ne x\}$; a subset of every set (Theorem 1.1.1) and unique (Corollary 1.1.1).
Is $\varnothing = \{\varnothing\}$? :: No. $\{\varnothing\}$ has one element, $\varnothing$; so $\varnothing \in \{\varnothing\}$ and $\varnothing \subseteq \{\varnothing\}$.
Can $B \in A$ and $B \subseteq A$ both hold? :: Yes: $A = \{a, \{a\}\}$, $B = \{a\}$.
Power set $P(A)$ (幂集) :: The set of all subsets of $A$: $P(A) = \{X \mid X \subseteq A\}$, also written $2^A$.
Number of subsets of an n-element set :: $2^n$ (each element in or out; or $C(n,0) + \dots + C(n,n)$).
Universal set $E$ (全集) :: A set containing every set in the problem as a subset; depends on the problem.
Russell's paradox (罗素悖论) :: $R = \{x \mid x \notin x\}$ gives $R \in R \iff R \notin R$: not every property defines a set.
Is 0 a natural number in this course? :: Yes: $\mathbb{N} = \{0, 1, 2, \dots\}$.
:::

::: quiz Check yourself
? Let $A = \{a, \{b, c\}, d, \{\{d\}\}\}$. Which of these are true? (tick all)
- [x] $\{b, c\} \in A$
- [ ] $b \in A$
- [ ] $\{d\} \in A$
- [x] $\{\{d\}\} \in A$
- [x] $\{a, d\} \subseteq A$
> $A$'s four elements are $a$, $\{b,c\}$, $d$ and $\{\{d\}\}$. $b$ and $\{d\}$ are elements of elements, not elements of $A$. $\{a, d\} \subseteq A$ because both $a$ and $d$ are elements of $A$.

? Let $A = \{a, \{a\}\}$ and $B = \{a\}$. Which hold?
- [ ] only $B \in A$
- [ ] only $B \subseteq A$
- [x] both $B \in A$ and $B \subseteq A$
- [ ] neither
> $\{a\}$ is listed in $A$, so $B \in A$; the only element of $B$ is $a$, which is in $A$, so $B \subseteq A$ too.

? Which statements are true? (tick all)
- [x] $\varnothing \in \{\varnothing\}$
- [x] $\varnothing \subseteq \{\varnothing\}$
- [ ] $\varnothing = \{\varnothing\}$
- [ ] $\{\varnothing\} \subseteq \varnothing$
> $\{\varnothing\}$ has one element, $\varnothing$, so the first holds; $\varnothing$ is a subset of every set, so the second holds. The sets differ (one has an element, one doesn't), and $\{\varnothing\} \subseteq \varnothing$ would need $\varnothing \in \varnothing$, which is false.

? How many elements does $P(\{1, 2, 3, 4\})$ have?
answer: 2^4
> A 4-element set has $2^4 = 16$ subsets: $1 + 4 + 6 + 4 + 1$ by size.

? How many 2-element subsets does a 5-element set have?
answer: comb(5,2)
> Choose 2 of the 5 elements: $C(5,2) = \frac{5 \cdot 4}{2} = 10$.

? How many elements does $P(P(\varnothing))$ have?
answer: 2
> $P(\varnothing) = \{\varnothing\}$ has 1 element, so its power set has $2^1 = 2$ elements: $P(P(\varnothing)) = \{\varnothing, \{\varnothing\}\}$.

? An $n$-element set has how many **proper** subsets? (an expression in $n$)
expression: 2^n - 1
variables: n
> All $2^n$ subsets except the set itself are proper subsets: $2^n - 1$. (The empty set is a proper subset of any non-empty set.)

? Which set is equal to $\{1, 2, 3\}$?
- [x] $\{3, 1, 2, 2\}$
- [ ] $\{\{1\}, \{2\}, \{3\}\}$
- [ ] $\{\{1, 2, 3\}\}$
- [ ] $\{1, 2\}$
> Order and repeats don't matter, so $\{3, 1, 2, 2\} = \{1, 2, 3\}$. The second set's elements are singletons, not numbers; the third has one element, a set; the fourth lacks 3.

? What is the name of the set of all subsets of a set $A$ (in English)?
text: power set | the power set | 幂集
> $P(A) = \{X \mid X \subseteq A\}$ is the power set of $A$, also written $2^A$.
:::

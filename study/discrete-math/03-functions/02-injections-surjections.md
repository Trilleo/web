---
title: Injections, surjections and bijections
zh: 满射、单射与双射
summary: Surjective, injective and bijective functions, what they say about the sizes of finite sets, partial maps, counting all maps, injections, bijections and surjections, and the special functions (constant, identity, monotone, characteristic, natural map).
source: 3-1函数 (§3.1, slides 15–44), 2026-09-17
---

A function $f\colon A \to B$ (Lesson 3.1) promises that every element of $A$ gets exactly
one value in $B$. It promises nothing about $B$: some elements of $B$ may be hit by
nothing, others by many inputs. This lesson names the functions that behave better on
the $B$ side. **Surjections** hit every element of $B$, **injections** never hit one
twice, and **bijections** do both, pairing $A$ and $B$ off perfectly. These three words
come back in every later lesson: inverse functions exist exactly for bijections
(Lesson 3.4), and comparing the sizes of infinite sets is done with bijections and
injections (Lesson 3.5). We also count how many functions of each kind there are between
finite sets, and meet a handful of special functions you will see again and again.

## Surjections, injections and bijections

Think of $A$ as people and $B$ as chairs, with $f$ telling each person where to sit.
Every person sits somewhere (that's what a function from $A$ is). Then ask:

- Is every chair taken? Then $f$ is **onto**, a surjection.
- Does nobody share a chair? Then $f$ is **one-to-one**, an injection.
- Both? Then people and chairs are paired off exactly: a bijection.

::: graph A surjection: f(a) = 1, f(b) = 2, f(c) = f(d) = 3. Every element of B = {1, 2, 3} is hit
row: a b c d
row: 1 2 3
a -> 1, b -> 2, c -> 3, d -> 3
:::

::: define Surjection | 满射
A function $f\colon A \to B$ is **surjective** (a surjection, "onto") if
$\mathrm{ran}\,f = B$: every $y \in B$ is the value of at least one $x \in A$
(Definition 3.1.6 ① in the textbook).
:::

The map above is surjective: $\mathrm{ran}\,f = \{1, 2, 3\} = B$. It is not injective,
since $c$ and $d$ share the value $3$.

::: graph An injection: f(a) = 1, f(b) = 3, f(c) = 4. No element of B = {1, 2, 3, 4} is hit twice
row: a b c
row: 1 2 3 4
a -> 1, b -> 3, c -> 4
:::

::: define Injection | 单射
A function $f\colon A \to B$ is **injective** (an injection, "one-to-one") if every
$y \in \mathrm{ran}\,f$ is the value of exactly one $x \in A$ (Definition 3.1.6 ② in the
textbook).
:::

Equivalently, and this is the form you use in proofs: different inputs give different
values,
$$x_1 \ne x_2 \Rightarrow f(x_1) \ne f(x_2), \quad\text{or}\quad f(x_1) = f(x_2) \Rightarrow x_1 = x_2.$$
The map above is injective but not surjective: $2$ is nobody's value.

::: graph A bijection: f(a) = 1, f(b) = 2, f(c) = 3 pairs X and Y off exactly
row: a b c
row: 1 2 3
a -> 1, b -> 2, c -> 3
:::

::: define Bijection | 双射（一一映射）
A function $f\colon A \to B$ is **bijective** (a bijection, or a one-to-one
correspondence, 一一映射) if it is both surjective and injective (Definition 3.1.6 ③ in
the textbook).
:::

::: callout key Read the arrow diagram from the B side
In an arrow diagram of $f\colon A \to B$, every element of $A$ sends exactly one arrow.
Then count the arrows **arriving** at each element of $B$:
at least one everywhere — surjective; at most one everywhere — injective; exactly one
everywhere — bijective.
:::

::: callout pitfall Three separate questions
"Not injective" does not mean "surjective", and the other way round. A function can be
either, both, or neither: $f\colon \mathbb Z \to \mathbb Z$, $f(x) = x^2$ is neither
(it sends $1$ and $-1$ to the same value, and never takes the value $2$).
:::

## What injections and surjections say about size

For finite sets, the kind of a function tells you how the sizes compare. This is the
idea behind the **pigeonhole principle**: if more pigeons than holes, some hole holds two
pigeons, so a map from pigeons to holes can't be injective.

::: theorem Sizes of finite sets under surjections and injections | 满射、单射的性质
Let $A$ and $B$ be finite sets and $f\colon A \to B$.
1. If $f$ is surjective, then $\lvert A\rvert \ge \lvert B\rvert$.
2. If $f$ is injective, then $\lvert A\rvert \le \lvert B\rvert$.
3. If $\lvert A\rvert = \lvert B\rvert$, then $f$ is injective if and only if it is
   surjective (so either one makes it a bijection).
:::

The idea of (1): a surjection hits every element of $B$, so we can pick one input for
each element of $B$, and these picks are all different. So $A$ contains a copy of $B$.

::: example Proof of (1), as on the slides
Take the surjection $f\colon \{1,2,3,4\} \to \{a,b,c\}$ with $f(1) = a$, $f(2) = f(3) = b$,
$f(4) = c$ as a picture to follow along; the proof is general.

== Every element of B has a preimage ==
$f$ is surjective, so for every $y \in B$ there is an $x \in A$ with $f(x) = y$.

== Pick one for each ==
Write $B = \{y_1, y_2, \ldots, y_m\}$. For each $y_i$, choose one element of its preimage
$f^{-1}(\{y_i\})$ and call it $x_i$. (In the picture: $x_1 = 1$, $x_2 = 2$ or $3$,
$x_3 = 4$.)

== The picks are different ==
If $x_i = x_j$ then $y_i = f(x_i) = f(x_j) = y_j$, so different $y$'s get different
$x$'s. The pairs $\langle x_1, y_1\rangle, \ldots, \langle x_m, y_m\rangle$ form a
one-to-one correspondence between $B$ and the subset $\{x_1, \ldots, x_m\}$ of $A$.

== Conclusion ==
$A$ has a subset with $m = \lvert B\rvert$ elements, so $\lvert A\rvert \ge \lvert B\rvert$.
:::

The slides leave (2) and (3) without proof. The ideas are short:

- (2): an injection sends the $\lvert A\rvert$ elements of $A$ to $\lvert A\rvert$
  **different** elements of $B$, so $B$ has at least that many: $\lvert A\rvert =
  \lvert f(A)\rvert \le \lvert B\rvert$.
- (3): with $\lvert A\rvert = \lvert B\rvert = n$, $f$ is injective exactly when
  $\lvert f(A)\rvert = n$ (no two inputs merge), and surjective exactly when
  $f(A) = B$, i.e. $\lvert f(A)\rvert = n$ as $f(A) \subseteq B$. Both say the same thing.

::: example A true-or-false question from class
True or false: "if $\lvert A\rvert = \lvert B\rvert$, then $f\colon A \to B$ is injective
if and only if it is surjective".

== Try an infinite set ==
Let $\mathbb N = \{0, 1, 2, 3, \ldots\}$ and $f\colon \mathbb N \to \mathbb N$,
$f(x) = 2x$. Here $A = B = \mathbb N$, so certainly "$\lvert A\rvert = \lvert B\rvert$".

== Injective ==
$2x_1 = 2x_2 \Rightarrow x_1 = x_2$: injective.

== Not surjective ==
$1$ (any odd number) is never $2x$: not surjective.

== Answer ==
**False** as stated. Part (3) of the theorem needs $A$ and $B$ **finite**.
:::

::: callout pitfall Injective and surjective on infinite sets
For infinite sets the counting argument breaks down: $x \mapsto 2x$ squeezes
$\mathbb N$ injectively into the even numbers, a proper part of itself. Never use
"same size, so injective ⇔ surjective" without checking that the sets are finite.
Lesson 3.5 builds on exactly this strange behaviour.
:::

## Partial maps

Sometimes a rule is allowed to leave some inputs without a value, like a lookup table
with missing entries or a program that may not return. Compare:

- A **map** (映射) from $X$ to $Y$ is a subset $f \subseteq X \times Y$ such that for every
  $x \in X$ there is **exactly one** $y \in Y$ with $\langle x,y\rangle \in f$. This is a
  function $f\colon X \to Y$.
- A **partial map** relaxes "exactly one" to "at most one".

::: define Partial map | 部分映射
A **partial map** from $X$ to $Y$ is a subset $f \subseteq X \times Y$ such that for every
$x \in X$ there is either no $y \in Y$ or exactly one $y \in Y$ with
$\langle x, y\rangle \in f$.
:::

In the language of Lesson 3.1: a partial map from $X$ to $Y$ is a function $f$ with
$\mathrm{dom}\,f \subseteq X$ and $\mathrm{ran}\,f \subseteq Y$. The relation $R_2$ there
was a partial map from $A$ to $A$ but not a map.

::: callout note On the slide
The slide's definition of a partial map repeats the words "一个从 X 到 Y 的映射" (a map
from X to Y); it means a **partial** map, as the condition "no $y$ or exactly one $y$"
shows.
:::

::: graph A partial map from X = {1, 2, 3, 4} to Y = {a, b, c}: 1 has no value
row: 1 2 3 4
row: a b c
2 -> b, 3 -> b, 4 -> c
:::

## Counting maps between finite sets

Let $X = \{x_1, \ldots, x_m\}$ and $Y = \{y_1, \ldots, y_n\}$. How many of each kind of map
are there from $X$ to $Y$? The method is always the same: decide the value of $x_1$, then
$x_2$, and so on, and multiply the numbers of choices (the multiplication principle).

### All maps and partial maps

Each $x_i$ picks one of $n$ values, independently: $n^m$ maps. This is
$\lvert Y^X\rvert = n^m$ from Lesson 3.1. (The slides also state it as
$\lvert Y^X\rvert = m^n$ for $\lvert X\rvert = n$, $\lvert Y\rvert = m$: the same rule
with the letters swapped. Remember it as "values to the power inputs".)

For a partial map, each $x_i$ has one more option: "no value". That's $n + 1$ choices
each.

::: formula Number of partial maps | 部分映射的个数
$$(n+1)^m$$
--
m | the number of elements of $X$ (the inputs) |
n | the number of elements of $Y$ (the possible values) |
:::

### Bijections

A bijection from $X$ to $Y$ needs $m = n$ (by the size theorem). Then $x_1$ can go to any
of the $n$ elements, $x_2$ to any of the $n - 1$ not yet used, and so on, down to $1$
choice for the last: $n(n-1)\cdots 1 = n!$ bijections. In particular, there are $n!$
bijections from an $n$-element set to itself (these are its **permutations**).

::: graph One of the 4! = 24 bijections from X = {1, 2, 3, 4} to itself: 1 → 3, 2 → 4, 3 → 2, 4 → 1
row: 1 2 3 4
row: 3′ 4′ 2′ 1′
1 -> 3′, 2 -> 4′, 3 -> 2′, 4 -> 1′
:::

(The bottom row is the same set $X$, primed so the two copies can be told apart, and
listed in the slide's order 3, 4, 2, 1.)

### Injections

An injection needs $n \ge m$. Choose which $m$ elements of $Y$ will be used:
$\binom nm$ ways. Then match the $m$ inputs to those $m$ values bijectively: $m!$ ways.
Equivalently, $x_1$ has $n$ choices, $x_2$ has $n - 1$, …, $x_m$ has $n - m + 1$.

::: formula Number of injections | 单射的个数
$$C(n,m)\,m! = \binom nm m! = \frac{n!}{(n-m)!} = n(n-1)\cdots(n-m+1), \qquad n \ge m$$
--
m | the number of elements of $X$ |
n | the number of elements of $Y$ |
C(n,m) | the number of ways to choose the $m$ values used, $\binom nm$ |
:::

With $m = n$ this gives $n!$, the bijections again. For example, from
$\{1, 2, 3\}$ to $\{a, b, c, d\}$ there are $\binom43 \cdot 3! = 24$ injections, such as
$1 \mapsto a$, $2 \mapsto b$, $3 \mapsto d$.

### Surjections

A surjection needs $m \ge n$. This is the hard one, and the obvious method is wrong.

::: example A tempting but wrong count
Proposed method: first choose $n$ of the $m$ inputs and send them bijectively onto $Y$
($C(m,n)\,n!$ ways) so every value is hit; then send the remaining $m - n$ inputs
anywhere ($n^{m-n}$ ways). Total $C(m,n)\,n!\,n^{m-n}$. Is it right?

== Try small numbers ==
$m = 3$, $n = 2$: the method gives $C(3,2) \cdot 2! \cdot 2^1 = 12$. But there are only
$2^3 = 8$ maps from a 3-element set to a 2-element set at all, and two of them are
constant, so there are $6$ surjections.

== Why it overcounts ==
Take the surjection $x_1 \mapsto y_1$, $x_2 \mapsto y_2$, $x_3 \mapsto y_2$. The method
produces it twice: once by choosing $\{x_1, x_2\}$ first (then $x_3$ "freely" goes to
$y_2$), once by choosing $\{x_1, x_3\}$ first. A surjection is built once for every way of
picking "the" first input for each value, and most surjections have several.

== Larger example ==
For $m = 5$, $n = 3$ the method gives $C(5,3) \cdot 3! \cdot 3^2 = 540$, while the true
number is $150$.
:::

The right tool is inclusion–exclusion (Lesson 1.3): count all maps, then subtract the
ones that **miss** some value. Let $A_i$ be the set of maps $X \to Y$ in which $y_i$ has
an empty preimage (nothing goes to $y_i$). A map is surjective exactly when it is in none
of the $A_i$:
$$\text{surjections} = \left\lvert \overline{A_1} \cap \overline{A_2} \cap \cdots \cap \overline{A_n}\right\rvert.$$

Now count the pieces. A map in $A_i$ sends everything into the other $n - 1$ values:
$\lvert A_i\rvert = (n-1)^m$. A map in $A_i \cap A_j$ avoids two values:
$(n-2)^m$. In general, a map that avoids $k$ given values has $(n-k)^m$ choices, and there
are $\binom nk$ ways to pick those $k$ values. With $N = n^m$ all maps, inclusion–exclusion
gives

$$\begin{aligned}
\left\lvert \overline{A_1} \cap \cdots \cap \overline{A_n}\right\rvert
&= N - \sum_{i}\lvert A_i\rvert + \sum_{i<j}\lvert A_i \cap A_j\rvert - \cdots + (-1)^n\lvert A_1 \cap \cdots \cap A_n\rvert \\
&= n^m - \binom n1(n-1)^m + \binom n2(n-2)^m - \cdots + (-1)^{n-1}\binom n{n-1}1^m + (-1)^n\binom nn 0^m.
\end{aligned}$$

::: formula Number of surjections | 满射的个数
$$\sum_{k=0}^{n}(-1)^k\binom nk(n-k)^m, \qquad m \ge n$$
--
m | the number of elements of $X$ (the inputs) |
n | the number of elements of $Y$ (the values, all of which must be hit) |
k | how many values are left out, in each inclusion–exclusion term |
:::

::: example Surjections from 5 elements onto 3
Count the surjections from $X = \{1,2,3,4,5\}$ onto $Y = \{a,b,c\}$ (such as
$1 \mapsto a$, $2, 3, 5 \mapsto b$, $4 \mapsto c$).

== All maps ==
$3^5 = 243$.

== Subtract those missing one value ==
$\binom31 2^5 = 3 \cdot 32 = 96$.

== Add back those missing two ==
$\binom32 1^5 = 3$ (the three constant maps were subtracted twice).

== Those missing all three ==
$\binom33 0^5 = 0$.

== Answer ==
$243 - 96 + 3 - 0 = 150$.
:::

::: callout key The counting table
For $\lvert X\rvert = m$ and $\lvert Y\rvert = n$:

| Kind of map | Number | Possible when |
| --- | --- | --- |
| All maps | $n^m$ | always |
| Partial maps | $(n+1)^m$ | always |
| Injections | $C(n,m)\,m!$ | $n \ge m$ |
| Bijections | $n!$ | $m = n$ |
| Surjections | $\sum_{k=0}^{n}(-1)^k\binom nk(n-k)^m$ | $m \ge n$ |
:::

::: callout exam Counting questions
Exams give $\lvert X\rvert$ and $\lvert Y\rvert$ and ask for one row of this table, or
ask whether a counting method is right (like the overcounting surjection method above).
Check which way the exponent goes: inputs in the exponent, values in the base.
:::

## Special functions

Some functions come up so often that they have names.

### Constant and identity functions

::: define Constant function | 常函数
$f\colon A \to B$ is a **constant function** if there is a $c \in B$ with $f(x) = c$ for
every $x \in A$.
:::

::: define Identity function | 恒等函数
The identity relation $I_A$ on $A$ (Lesson 2.1) is a function, the **identity function**
on $A$: $I_A(x) = x$ for every $x \in A$.
:::

$I_A$ is a bijection from $A$ to $A$. A constant function on a set with at least two
elements is never injective, and it is surjective only when $B = \{c\}$.

### Monotone functions

On real numbers, "increasing" means bigger inputs give bigger values. All that needs is a
way to compare, so it works between any two partially ordered sets (Lesson 2.7). Below
$\preccurlyeq$ is the order and $x \prec y$ means $x \preccurlyeq y$ and $x \ne y$.

::: define Monotone increasing function | 单调递增函数
Let $\langle A, \preccurlyeq\rangle$ and $\langle B, \preccurlyeq\rangle$ be posets and
$f\colon A \to B$. $f$ is **monotone increasing** if for all $x_1, x_2 \in A$,
$x_1 \preccurlyeq x_2$ implies $f(x_1) \preccurlyeq f(x_2)$. It is **strictly monotone
increasing** (严格单调递增) if $x_1 \prec x_2$ implies $f(x_1) \prec f(x_2)$.
Monotone decreasing and strictly monotone decreasing (单调递减, 严格单调递减) are defined
the same way with the values' order reversed.
:::

Only **comparable** inputs are checked: elements that the order doesn't compare put no
condition on $f$.

::: hasse The poset ⟨P({a, b}), ⊆⟩, the domain of both examples
subsets: a b
:::

::: example Monotone, but not strictly
Posets $\langle P(\{a,b\}), R_\subseteq\rangle$ (subsets under inclusion) and
$\langle\{0, 1\}, \le\rangle$. Let $f(\varnothing) = f(\{a\}) = f(\{b\}) = 0$ and
$f(\{a,b\}) = 1$.

== Monotone increasing ==
Check every comparable pair $x_1 \subseteq x_2$: going up the Hasse diagram the value
goes $0 \to 0$, $0 \to 1$ or stays the same, never down. So $f(x_1) \le f(x_2)$ always.

== Not strictly ==
$\varnothing \subset \{a\}$ but $f(\varnothing) = f(\{a\}) = 0$: a strict step up in the
domain gives no strict step in the values.
:::

::: example Strictly monotone
Posets $\langle P(\{a,b\}), R_\subseteq\rangle$ and $\langle\{0, 1, 2\}, \le\rangle$. Let
$f(\varnothing) = 0$, $f(\{a\}) = f(\{b\}) = 1$, $f(\{a,b\}) = 2$.

== Every strict comparison ==
$\varnothing \subset \{a\}$: $0 < 1$. $\varnothing \subset \{b\}$: $0 < 1$.
$\varnothing \subset \{a,b\}$: $0 < 2$. $\{a\} \subset \{a,b\}$: $1 < 2$.
$\{b\} \subset \{a,b\}$: $1 < 2$.

== Conclusion ==
Strictly monotone increasing. $f(\{a\}) = f(\{b\})$ is fine: $\{a\}$ and $\{b\}$ are not
comparable, so nothing is required of them. ($f(S) = \lvert S\rvert$ here.)
:::

### Characteristic functions

A subset can be described by a yes/no question asked of every element: "are you in it?".
Writing 1 for yes and 0 for no gives a function. Computers store sets this way, as bit
strings.

::: define Characteristic function | 特征函数
Let $A$ be a set and $A' \subseteq A$. The **characteristic function** of $A'$ is
$\chi_{A'}\colon A \to \{0, 1\}$,
$$\chi_{A'}(a) = \begin{cases} 1, & a \in A' \\ 0, & a \in A - A'. \end{cases}$$
:::

::: example Characteristic functions
Take the universe $A = \{a, b, c, d\}$, with $A' = \{a, b, c\}$ and $B' = \{c, d\}$.

== $A'$ ==
$\chi_{A'} = \{\langle a,1\rangle, \langle b,1\rangle, \langle c,1\rangle, \langle d,0\rangle\}$.

== $B'$ ==
$\chi_{B'} = \{\langle a,0\rangle, \langle b,0\rangle, \langle c,1\rangle, \langle d,1\rangle\}$.
:::

Every subset gets a characteristic function, and different subsets get different ones
(they differ at an element in one subset but not the other). Conversely, every function
$A \to \{0,1\}$ is the characteristic function of the subset where it is 1. So subsets of
$A$ and functions $A \to \{0,1\}$ match one to one. For $A = \{a, b, c\}$:

$$\begin{gathered}
\chi_{\{a\}} = \{\langle a,1\rangle, \langle b,0\rangle, \langle c,0\rangle\}, \qquad
\chi_{\varnothing} = \{\langle a,0\rangle, \langle b,0\rangle, \langle c,0\rangle\}, \\
\chi_{\{a,b\}} = \{\langle a,1\rangle, \langle b,1\rangle, \langle c,0\rangle\}.
\end{gathered}$$

So we can use characteristic functions as labels for the subsets of $A$.

::: callout key Subsets are 0–1 functions
$A' \mapsto \chi_{A'}$ is a bijection from $P(A)$ to $\{0,1\}^A$. With $\lvert A\rvert = n$
that gives $\lvert P(A)\rvert = \lvert\{0,1\}^A\rvert = 2^n$: another way to see why a set
with $n$ elements has $2^n$ subsets (Lesson 1.1). Lesson 3.5 uses the same correspondence
for infinite sets.
:::

### The natural map

An equivalence relation $R$ on $A$ sorts the elements into classes (Lesson 2.6). The
function that sends each element to its class is the **natural map**.

::: define Natural map | 自然映射
Let $R$ be an equivalence relation on $A$. The function $g\colon A \to A/R$,
$g(a) = [a]_R$ for every $a \in A$, is the **natural map** from $A$ to the quotient set
$A/R$.
:::

::: example A natural map
$A = \{1, 2, 3\}$ and $R = \{\langle 1,2\rangle, \langle 2,1\rangle\} \cup I_A$, an
equivalence relation on $A$.

== Classes ==
$[1]_R = [2]_R = \{1, 2\}$ and $[3]_R = \{3\}$, so $A/R = \{\{1,2\}, \{3\}\}$.

== The natural map ==
$g(1) = g(2) = \{1, 2\}$ and $g(3) = \{3\}$.
:::

::: graph The natural map g from A = {1, 2, 3} to A/R; the bottom vertices stand for the classes {1, 2} and {3}
row: 1 2 3
row: c12 c3
1 -> c12, 2 -> c12, 3 -> c3
:::

The natural map is always **surjective**: every class is the class of its own elements.
It is injective only when every class has one element, which happens exactly when $R$ is
the identity relation $I_A$; then $g$ is a bijection.

## Practice from class

::: example Which set has this characteristic function?
$f\colon \mathbb Z \to \mathbb Z$, $f(n) = \dfrac{(-1)^n + 1}{2}$. If $f$ is the
characteristic function of a subset $A \subseteq \mathbb Z$, what is $A$?

== Evaluate ==
$n$ even: $(-1)^n = 1$, so $f(n) = \frac{1+1}{2} = 1$. $n$ odd: $(-1)^n = -1$, so
$f(n) = 0$.

== Read off the subset ==
$A$ is where $f = 1$: $A = \{\ldots, -4, -2, 0, 2, 4, \ldots\}$, the even integers
(in-class question, answer C).
:::

::: example Exercise (例3.1.5 in the textbook), part 1
$A = B = \mathbb R^+$, $f(x) = \dfrac{x}{x^2 + 1}$. Is it a function $f\colon A \to B$?
Injective, surjective, bijective?

== A function ==
For $x > 0$, $x^2 + 1 > 0$, so $f(x)$ is one well-defined positive number: $f$ is a
function from $\mathbb R^+$ to $\mathbb R^+$.

== Not injective ==
$f$ rises to its maximum $f(1) = \frac12$ and then falls (since $x^2 + 1 \ge 2x$, with
equality only at $x = 1$, we get $f(x) \le \frac12$). So it is not monotone, and values
repeat: $f(2) = \frac25 = f(\frac12)$.

== Not surjective ==
$\mathrm{ran}\,f = (0, \frac12] \ne \mathbb R^+$: for example $1$ is never a value.

== Answer ==
A function, neither injective nor surjective (so not bijective).
:::

::: example Exercise (例3.1.5 in the textbook), part 2
$A = B = \mathbb R \times \mathbb R$, $f(\langle x, y\rangle) = \langle x + y,\, x - y\rangle$.
Let $L = \{\langle x, y\rangle \mid x, y \in \mathbb R,\ y = x + 1\}$. Compute $f(L)$.

== Injective ==
If $\langle x+y, x-y\rangle = \langle u, v\rangle$ then $x = \frac{u+v}2$ and
$y = \frac{u-v}2$: the input is determined by the value.

== Surjective ==
Any $\langle u, v\rangle$ is the value of $\langle \frac{u+v}2, \frac{u-v}2\rangle$. So $f$
is a bijection.

== The image of the line ==
A point of $L$ is $\langle x, x+1\rangle$, and
$f(\langle x, x+1\rangle) = \langle 2x+1,\, -1\rangle$. As $x$ runs through $\mathbb R$,
$2x + 1$ takes every real value, so
$$f(L) = \{\langle 2x+1, -1\rangle \mid x \in \mathbb R\} = \mathbb R \times \{-1\}.$$
The line $y = x + 1$ goes to the horizontal line $v = -1$.
:::

::: callout exam Typical questions
"Is it a function? If so, injective, surjective, bijective?" — check every input has one
value in $B$; for injective solve $f(x_1) = f(x_2)$; for surjective solve $f(x) = y$ for
an arbitrary $y \in B$ (or find a $y$ that can't be reached). Then compute an image or
preimage. Also: which subset has a given characteristic function.
:::

::: cards Injections, surjections and special functions
Surjection (满射) :: $f\colon A\to B$ with $\mathrm{ran}\,f = B$: every element of $B$ is hit.
Injection (单射) :: $f\colon A\to B$ where $f(x_1) = f(x_2)$ implies $x_1 = x_2$: no element of $B$ is hit twice.
Bijection (双射, 一一映射) :: Both surjective and injective: every element of $B$ is hit exactly once.
Finite sets: surjection or injection and sizes :: Surjective gives $\lvert A\rvert \ge \lvert B\rvert$; injective gives $\lvert A\rvert \le \lvert B\rvert$.
Finite sets of equal size :: $f\colon A\to B$ is injective if and only if it is surjective.
Counterexample for infinite sets :: $f(x) = 2x$ on $\mathbb N$: injective but not surjective.
Partial map (部分映射) :: Each $x \in X$ has no value or exactly one value in $Y$.
Number of partial maps, $\lvert X\rvert = m$, $\lvert Y\rvert = n$ :: $(n+1)^m$.
Number of injections, $\lvert X\rvert = m \le n = \lvert Y\rvert$ :: $C(n,m)\,m! = n!/(n-m)!$.
Number of bijections of an $n$-element set :: $n!$.
Number of surjections, $\lvert X\rvert = m \ge n = \lvert Y\rvert$ :: $\sum_{k=0}^{n}(-1)^k\binom nk(n-k)^m$, by inclusion–exclusion.
Monotone increasing on posets (单调递增) :: $x_1 \preccurlyeq x_2$ implies $f(x_1) \preccurlyeq f(x_2)$; strictly: $x_1 \prec x_2$ implies $f(x_1) \prec f(x_2)$.
Characteristic function $\chi_{A'}$ (特征函数) :: $\chi_{A'}(a) = 1$ for $a \in A'$, $0$ for $a \in A - A'$; different subsets give different functions.
Natural map (自然映射) :: $g\colon A\to A/R$, $g(a) = [a]_R$; always surjective, bijective exactly when $R = I_A$.
:::

::: quiz Check yourself
? $f\colon \mathbb Z \to \mathbb Z$, $f(n) = [(-1)^n + 1]/2$ is the characteristic function of a subset $A$ of $\mathbb Z$. Then $A = $
- [ ] $\mathbb Z$
- [ ] $\{0, 1, 2, 3, 4, \ldots\}$
- [x] $\{\ldots, -4, -2, 0, 2, 4, \ldots\}$
- [ ] $\{\ldots, -3, -1, 1, 3, \ldots\}$
> $n$ even gives $(1+1)/2 = 1$, $n$ odd gives $(-1+1)/2 = 0$. A characteristic function is 1 exactly on its subset, so $A$ is the even integers (in-class question, answer C).

? True or false: if $\lvert A\rvert = \lvert B\rvert$, then $f\colon A \to B$ is injective if and only if it is surjective.
- [ ] True
- [x] False
> It needs $A$, $B$ **finite**. On $\mathbb N$, $f(x) = 2x$ is injective but not surjective (in-class judgement question, marked false).

? $X$ has 3 elements and $Y$ has 4. How many partial maps are there from $X$ to $Y$?
answer: (4+1)^3
> Each of the 3 inputs chooses one of the 4 values or "no value": $5^3 = 125$.

? How many injections are there from a 3-element set to a 5-element set?
answer: comb(5,3)*3!
> Choose the 3 values used, $\binom53 = 10$, and match them to the inputs, $3! = 6$: $60$ (or $5 \cdot 4 \cdot 3$).

? How many surjections are there from a 4-element set onto a 3-element set?
answer: 3^4 - 3*2^4 + 3*1^4
> Inclusion–exclusion: $3^4 - \binom31 2^4 + \binom32 1^4 - \binom33 0^4 = 81 - 48 + 3 - 0 = 36$.

? The number of surjections from an $n$-element set onto a 2-element set, for $n \ge 1$ (an expression in $n$):
expression: 2^n - 2
variables: n
> All $2^n$ maps except the two constant ones: $2^n - \binom21 1^n + \binom22 0^n = 2^n - 2$.

? With $m = 5$, $n = 3$, the method "choose $n$ inputs to cover $Y$ bijectively, then send the rest anywhere" gives $C(5,3)\,3!\,3^2$. How many surjections are there really?
answer: 150
> $3^5 - 3 \cdot 2^5 + 3 \cdot 1^5 - 0 = 243 - 96 + 3 = 150$. The method's $540$ counts most surjections several times.

? Which of these functions are injective? (tick all)
- [x] $f\colon \mathbb N \to \mathbb N$, $f(x) = 2x$
- [ ] $f\colon \mathbb Z \to \mathbb Z$, $f(x) = x^2$
- [x] $f\colon \mathbb R\times\mathbb R \to \mathbb R\times\mathbb R$, $f(\langle x,y\rangle) = \langle x+y, x-y\rangle$
- [ ] $f\colon \mathbb R^+ \to \mathbb R^+$, $f(x) = x/(x^2+1)$
> $2x_1 = 2x_2$ forces $x_1 = x_2$; $\langle x+y, x-y\rangle$ determines $x$ and $y$. But $(-1)^2 = 1^2$, and $f(2) = f(\frac12) = \frac25$.

? Which of these are surjective? (tick all)
- [ ] $f\colon \mathbb N \to \mathbb N$, $f(x) = 2x$
- [x] the natural map $g\colon A \to A/R$ for an equivalence relation $R$
- [ ] $f\colon \mathbb R^+ \to \mathbb R^+$, $f(x) = x/(x^2+1)$
- [x] $I_A\colon A \to A$
> $2x$ misses the odd numbers and $x/(x^2+1)$ stays in $(0, \frac12]$. Every class $[a]_R$ is $g(a)$, and $I_A(x) = x$ hits everything.

? $f\colon \langle P(\{a,b\}), \subseteq\rangle \to \langle\{0,1\}, \le\rangle$ with $f(\varnothing) = f(\{a\}) = f(\{b\}) = 0$, $f(\{a,b\}) = 1$ is:
- [x] monotone increasing but not strictly
- [ ] strictly monotone increasing
- [ ] not monotone
> Going up in $\subseteq$ never lowers the value, but $\varnothing \subset \{a\}$ with $f(\varnothing) = f(\{a\})$ breaks strictness.

? Is the natural map of the identity relation $I_A$ a bijection?
- [x] Yes
- [ ] No
> Each class is $[a] = \{a\}$, so $g(a) = \{a\}$ never merges two elements: injective, and natural maps are always surjective.
:::

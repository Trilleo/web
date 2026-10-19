---
title: Closures of relations
zh: 关系的闭包
summary: Reflexive, symmetric and transitive closures r(R), s(R), t(R) — what they are, how to build them from sets, matrices and relation diagrams, and which properties they keep.
source: 2-3二元关系 (§2.5 关系的闭包), 2026-09-10
---

A relation often *almost* has a property: it is reflexive except for one missing loop,
or transitive except for a few shortcuts. The **closure** is the repair: add the pairs
that are missing, and not a single pair more. This lesson builds the three closures the
course uses (reflexive, symmetric, transitive), shows three ways to compute them (with
sets, with Boolean matrices and with relation diagrams), and works out which properties
survive the repair. The transitive closure is the important one: it answers "who can
reach whom?" in any network, and it is how the next lesson builds equivalence relations
from scratch.

You will need powers of relations $R^n$ (Lesson 2.3, with $R^0 = I_A$ and
$R^m\circ R^n = R^{m+n}$) and the five properties with their set criteria (Lesson 2.4:
$R$ is reflexive iff $I_A\subseteq R$, symmetric iff $R = R^{-1}$, transitive iff
$R\circ R\subseteq R$).

## The idea of a closure

Take $A = \{a,b\}$ and $R = \{\langle a,a\rangle,\langle a,b\rangle\}$. It isn't
reflexive: the loop $\langle b,b\rangle$ is missing. Two candidate repairs:

- $R_1 = \{\langle a,a\rangle,\langle a,b\rangle,\langle b,a\rangle,\langle b,b\rangle\}$
- $R_2 = \{\langle a,a\rangle,\langle a,b\rangle,\langle b,b\rangle\}$

Both are reflexive and both contain $R$, but $R_1$ also adds $\langle b,a\rangle$, which
reflexivity never asked for. $R_2$ adds only what is needed, so $R_2$ is the reflexive
closure of $R$. That is the whole idea, in the slide's words: add elements so the relation
gets the property, **but add as few as possible** (增加的元素要最少).

::: callout key Closure = smallest superset with the property
The closure of $R$ keeps everything in $R$, has the property, and sits inside every
other relation that does both. "Smallest" means smallest under $\subseteq$, not just
"fewest pairs".
:::

Which properties can be repaired this way? A closure only ever **adds** pairs, so the
property must be one that adding pairs can bring about.

| Property | Has a closure? | Why |
| --- | --- | --- |
| Reflexive | Yes | add the missing loops |
| Irreflexive | No | a loop already in $R$ can never be removed by adding |
| Symmetric | Yes | add the missing reverse pairs |
| Antisymmetric | No | if $\langle a,b\rangle,\langle b,a\rangle\in R$ with $a\ne b$, adding never helps |
| Transitive | Yes | add the missing shortcuts |

Irreflexivity and antisymmetry *forbid* pairs. If $R$ already has the property, it is
its own "closure"; if it doesn't, no larger relation has it either, so the notion is
useless. Reflexivity, symmetry and transitivity *demand* pairs, and $E_A = A\times A$
always has all three, so there is always some relation to aim for.

::: define Closure of a relation | 关系的闭包
Let $R$ be a relation on a nonempty set $A$. The **reflexive** (**symmetric**,
**transitive**) closure of $R$ is the relation $R'$ on $A$ such that

1. $R'$ is reflexive (symmetric, transitive);
2. $R\subseteq R'$;
3. for every reflexive (symmetric, transitive) relation $R''$ on $A$ with
   $R\subseteq R''$, we have $R'\subseteq R''$.

They are written $r(R)$ ({{term reflexive closure | 自反闭包}}), $s(R)$
({{term symmetric closure | 对称闭包}}) and $t(R)$ ({{term transitive closure | 传递闭包}}).
(Definition 2.5.1 in the textbook.)
:::

Condition 3 is what makes the closure unique: if $R'$ and $R''$ both satisfied all
three conditions, each would be contained in the other, so $R' = R''$.

::: callout pitfall Not "any" relation with the property
Answering $E_A$ (or $R_1$ above) for a closure is the classic slip: it has the
property and contains $R$, but fails condition 3. Always ask: is every pair I added
*forced*?
:::

## Building closures

The definition says what a closure is, not how to find it. The next theorem gives a
formula for each.

::: theorem Constructing closures | 构造闭包的方法
Let $R$ be a relation on $A$. Then

1. $r(R) = R\cup R^0$, where $R^0 = I_A$;
2. $s(R) = R\cup R^{-1}$;
3. $t(R) = R\cup R^2\cup R^3\cup\cdots$

(Theorem 2.5.1 in the textbook.)
:::

In words: for the reflexive closure add every loop; for the symmetric closure add every
reversed pair; for the transitive closure add every pair $\langle x,y\rangle$ such that
you can walk from $x$ to $y$ along arrows of $R$ in one or more steps ($\langle x,y\rangle\in R^m$
means "a walk of exactly $m$ steps", Lesson 2.3).

To prove each part, check the three conditions of the definition: the right-hand side
contains $R$, has the property, and is the *smallest* relation that does.

**Proof of 1** (the slides leave it out). $R\cup I_A$ contains $R$ and contains
$I_A$, so it is reflexive. If $R''$ is reflexive and contains $R$, then $I_A\subseteq R''$
and $R\subseteq R''$, so $R\cup I_A\subseteq R''$.

**Proof of 2** (also left out). $R\cup R^{-1}$ contains $R$. It is symmetric because
$(R\cup R^{-1})^{-1} = R^{-1}\cup R$. If $R''$ is symmetric and contains $R$, then
$R^{-1}\subseteq R''^{-1} = R''$, so $R\cup R^{-1}\subseteq R''$.

**Proof of 3.** Clearly $R\subseteq t(R)$. Two things remain.

*$t(R)$ is transitive.* Idea: a walk of $m$ steps followed by a walk of $n$ steps is a
walk of $m+n$ steps. Take $\langle x,y\rangle\in t(R)$ and $\langle y,z\rangle\in t(R)$.

$$
\begin{aligned}
&\exists\, m\ge 1:\ \langle x,y\rangle\in R^m \quad\text{and}\quad \exists\, n\ge 1:\ \langle y,z\rangle\in R^n\\
&\Rightarrow \langle x,z\rangle\in R^m\circ R^n = R^{m+n}\\
&\Rightarrow \langle x,z\rangle\in t(R).
\end{aligned}
$$

*$t(R)$ is the smallest.* Idea: a transitive relation that contains every single step
must contain every walk. Let $R'\supseteq R$ be transitive and take
$\langle x,y\rangle\in t(R)$, so $\langle x,y\rangle\in R^m$ for some $m\ge 1$. Writing
$R^m = R\circ R^{m-1}$ and unfolding again and again gives elements
$x_1,\dots,x_{m-1}$ with

$$\langle x,x_1\rangle,\ \langle x_1,x_2\rangle,\ \dots,\ \langle x_{m-2},x_{m-1}\rangle,\ \langle x_{m-1},y\rangle\in R.$$

All these pairs are in $R'$ too, because $R\subseteq R'$. Since $R'$ is transitive,
$\langle x,x_1\rangle$ and $\langle x_1,x_2\rangle$ give $\langle x,x_2\rangle\in R'$,
then $\langle x,x_3\rangle\in R'$, and so on until $\langle x,y\rangle\in R'$. Hence
$t(R)\subseteq R'$. ∎

On a finite set the infinite union stops early.

::: theorem Transitive closure on a finite set | 有穷集上的传递闭包
If $R$ is a relation on a finite set $A$, there is a positive integer $r$ with
$t(R) = R\cup R^2\cup\cdots\cup R^r$. (Corollary 2.5.1 in the textbook.)
:::

Why: the powers $R, R^2, R^3,\dots$ of a relation on a finite set eventually repeat
(Lesson 2.3), so only finitely many different ones occur. In fact, with $|A| = n$ you
can always take $r = n$: a walk from $x$ to $y$ with more than $n$ steps visits more
than $n$ points, so it passes some point twice; cut out the loop in between and you get
a shorter walk with the same ends. Keep cutting until at most $n$ steps are left.

::: callout pitfall Two different r's
The $r$ in Corollary 2.5.1 is just a number of powers; $r(R)$ is the reflexive closure.
:::

::: example Closures from sets
Let $A = \{1,2,3\}$ and $R = \{\langle1,2\rangle,\langle2,1\rangle,\langle2,3\rangle\}$.
Find $r(R)$, $s(R)$ and $t(R)$.
== Reflexive closure ==
Add the three loops:
$r(R) = \{\langle1,1\rangle,\langle2,2\rangle,\langle3,3\rangle,\langle1,2\rangle,\langle2,1\rangle,\langle2,3\rangle\}$
(6 pairs).
== Symmetric closure ==
$R^{-1} = \{\langle2,1\rangle,\langle1,2\rangle,\langle3,2\rangle\}$; only $\langle3,2\rangle$
is new, so $s(R) = \{\langle1,2\rangle,\langle2,1\rangle,\langle2,3\rangle,\langle3,2\rangle\}$
(4 pairs).
== Powers ==
$R^2 = R\circ R = \{\langle1,1\rangle,\langle1,3\rangle,\langle2,2\rangle\}$
(1→2→1, 1→2→3, 2→1→2), and $R^3 = R^2\circ R = \{\langle1,2\rangle,\langle2,1\rangle,\langle2,3\rangle\} = R$.
So the powers just alternate between $R$ and $R^2$: nothing new will ever appear.
== Transitive closure ==
$t(R) = R\cup R^2 = \{\langle1,1\rangle,\langle1,2\rangle,\langle1,3\rangle,\langle2,1\rangle,\langle2,2\rangle,\langle2,3\rangle\}$
(6 pairs). Note: no pair starts at 3, because no arrow leaves 3. Even $\langle3,3\rangle$ is
missing: $t(R)$ adds a loop only where a walk returns to its start.
:::

::: callout pitfall t(R) doesn't add every loop
$t(R)$ contains $\langle x,x\rangle$ only when $x$ lies on a cycle of $R$. If you want
the loops too, that's $tr(R)$, the reflexive and transitive closure.
:::

## Closures with matrices

The same constructions work on relation matrices (Lesson 2.1), with Boolean arithmetic:
entries are 0 or 1, and "+" is logical OR ($1+1 = 1$, {{zh 逻辑加}}).

::: formula Closures as matrices | 闭包的关系矩阵
$$
\begin{gathered}
M_r = M + E,\qquad M_s = M + M^{T},\\
M_t = M + M^2 + M^3 + \cdots
\end{gathered}
$$
--
M | the relation matrix of $R$
M_r, M_s, M_t | the matrices of $r(R)$, $s(R)$, $t(R)$
E | the identity matrix of the same size (the matrix of $I_A$)
M^{T} | the transpose of $M$ (the matrix of $R^{-1}$)
M^k | the Boolean $k$-th power of $M$ (the matrix of $R^k$, Lesson 2.3)
+ | entry-wise logical OR
:::

Each line is Theorem 2.5.1 translated: $E$ puts 1s on the diagonal (the loops), the
transpose flips every pair, and the powers list the walks of each length. On an
$n$-element set you can stop at $M^n$.

::: example The transitive closure of a chain, with matrices
On $A = \{a,b,c,d\}$ (rows and columns in this order) let
$R = \{\langle a,b\rangle,\langle b,c\rangle,\langle c,d\rangle\}$: the chain
$a\to b\to c\to d$. Find $M_t$.
== The matrix and its powers ==
$$
M = \begin{bmatrix}0&1&0&0\\0&0&1&0\\0&0&0&1\\0&0&0&0\end{bmatrix},\quad
M^2 = \begin{bmatrix}0&0&1&0\\0&0&0&1\\0&0&0&0\\0&0&0&0\end{bmatrix},\quad
M^3 = \begin{bmatrix}0&0&0&1\\0&0&0&0\\0&0&0&0\\0&0&0&0\end{bmatrix}
$$
and $M^4 = 0$: there is no walk of 4 steps.
== Add them ==
$$
M_t = M + M^2 + M^3 = \begin{bmatrix}0&1&1&1\\0&0&1&1\\0&0&0&1\\0&0&0&0\end{bmatrix}
$$
== Read it off ==
$t(R) = \{\langle a,b\rangle,\langle a,c\rangle,\langle a,d\rangle,\langle b,c\rangle,\langle b,d\rangle,\langle c,d\rangle\}$:
every element is related to everything further along the chain. (That is the "less
than" order on a 4-element chain; partial orders come in Lesson 2.7.)
:::

## Closures with relation diagrams

On a relation diagram (关系图) the three closures are three drawing rules:

- $r(R)$: add a loop at every vertex that has none.
- $s(R)$: for every arrow without a partner going back, add the reverse arrow.
- $t(R)$: whenever you can get from $x$ to $y$ by following arrows (one or more steps),
  add the arrow $x\to y$.

The slides use one relation on $A = \{a,b,c,d\}$ for all three:
$R = \{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle,\langle d,b\rangle\}$.

::: graph The relation R
at a: 40, 170
at b: 150, 70
at c: 310, 70
at d: 240, 210
a -> b, b -> a, b -> c, c -> d, d -> b
:::

::: graph Its reflexive closure r(R): a loop at every vertex
at a: 40, 170
at b: 150, 70
at c: 310, 70
at d: 240, 210
a -> b, b -> a, b -> c, c -> d, d -> b
a -> a, b -> b, c -> c, d -> d
:::

::: graph Its symmetric closure s(R): the reverses c→b, d→c, b→d added
at a: 40, 170
at b: 150, 70
at c: 310, 70
at d: 240, 210
a -> b, b -> a, b -> c, c -> b, c -> d, d -> c, d -> b, b -> d
:::

::: example The transitive closure from the diagram, checked with matrices
Find $t(R)$ for the relation above.
== Follow the arrows ==
From $a$: $a\to b\to c\to d\to b\to a$, so $a$ reaches $b$, $c$, $d$ and itself. The
same cycle passes through every vertex, so **every** vertex reaches every vertex
(itself included, by going round). Hence $t(R) = E_A$: all 16 pairs, including the four
loops.
== Check with matrices ==
In the order $a,b,c,d$:
$$
M = \begin{bmatrix}0&1&0&0\\1&0&1&0\\0&0&0&1\\0&1&0&0\end{bmatrix},\
M^2 = \begin{bmatrix}1&0&1&0\\0&1&0&1\\0&1&0&0\\1&0&1&0\end{bmatrix},\
M^3 = \begin{bmatrix}0&1&0&1\\1&1&1&0\\1&0&1&0\\0&1&0&1\end{bmatrix}
$$
and $M + M^2 + M^3$ is already all 1s, so $M_t$ is the all-ones matrix and
$t(R) = R\cup R^2\cup R^3 = A\times A$.
== The other two ==
$r(R)$ has $5 + 4 = 9$ pairs; $s(R)$ has $5 + 3 = 8$ pairs (the reverses of
$\langle b,c\rangle$, $\langle c,d\rangle$, $\langle d,b\rangle$ are new; $\langle a,b\rangle$
and $\langle b,a\rangle$ already pair up).
:::

::: graph Its transitive closure t(R) = E_A: all 16 ordered pairs
at a: 40, 170
at b: 150, 70
at c: 310, 70
at d: 240, 210
a -> b, b -> a, b -> c, c -> b, c -> d, d -> c, b -> d, d -> b
a -> c, c -> a, a -> d, d -> a
a -> a, b -> b, c -> c, d -> d
:::

## Properties of closures

Three theorems describe how closures behave. The first says a closure changes nothing
when there is nothing to repair.

::: theorem A relation equals its closure exactly when it has the property | 闭包的性质
Let $R$ be a relation on a nonempty set $A$. Then

1. $R$ is reflexive if and only if $r(R) = R$;
2. $R$ is symmetric if and only if $s(R) = R$;
3. $R$ is transitive if and only if $t(R) = R$.

(Theorem 2.5.2 in the textbook.)
:::

The slides skip the proof; it is short. If $R$ is reflexive, $R$ itself satisfies the
three conditions of the definition (it is reflexive, contains $R$, and lies inside every
reflexive $R''\supseteq R$), and the closure is unique, so $r(R) = R$. Conversely, if
$r(R) = R$ then $R$ is reflexive because $r(R)$ is. The same words work for $s$ and $t$.

The second says closures respect $\subseteq$: a bigger relation has a bigger closure.

::: theorem Closures are monotone | 闭包的单调性
Let $R_1$ and $R_2$ be relations on a nonempty set $A$ with $R_1\subseteq R_2$. Then

1. $r(R_1)\subseteq r(R_2)$;
2. $s(R_1)\subseteq s(R_2)$;
3. $t(R_1)\subseteq t(R_2)$.

(Theorem 2.5.3 in the textbook.)
:::

Parts 1 and 2 are immediate from the formulas: $R_1\cup I_A\subseteq R_2\cup I_A$, and
$R_1\subseteq R_2$ gives $R_1^{-1}\subseteq R_2^{-1}$. For part 3 the slides prove a lemma
first: **if $R\subseteq S$ then $R^m\subseteq S^m$** for every $m\ge1$. Idea: a walk of $m$
steps along $R$-arrows is also a walk along $S$-arrows. In detail: from
$\langle x,y\rangle\in R^m$, unfold as in the proof of Theorem 2.5.1 to get
$\langle x,x_1\rangle,\dots,\langle x_{m-1},y\rangle\in R$; each of these is in $S$ because
$R\subseteq S$; composing them again gives $\langle x,y\rangle\in S^m$. Then
$t(R_1) = \bigcup_m R_1^m\subseteq\bigcup_m R_2^m = t(R_2)$.

A shorter route, worth knowing: $t(R_2)$ is transitive and contains $R_2\supseteq R_1$,
so by condition 3 of the definition, $t(R_1)\subseteq t(R_2)$. The same argument proves
parts 1 and 2.

The third theorem asks: if $R$ already has one property, does repairing another keep it?

::: theorem Which closures keep which properties | 闭包保持的性质
Let $R$ be a relation on a nonempty set $A$.

1. If $R$ is reflexive, then $s(R)$ and $t(R)$ are reflexive.
2. If $R$ is symmetric, then $r(R)$ and $t(R)$ are symmetric.
3. If $R$ is transitive, then $r(R)$ is transitive.

(Theorem 2.5.4 in the textbook.)
:::

The analysis rests on the three formulas $r(R) = R\cup R^0$, $s(R) = R\cup R^{-1}$,
$t(R) = R\cup R^2\cup\cdots$.

**Part 1.** $I_A\subseteq R\subseteq s(R)$ and $I_A\subseteq R\subseteq t(R)$: adding
pairs never removes a loop.

**Part 2, $r(R)$.** $(R\cup I_A)^{-1} = R^{-1}\cup I_A = R\cup I_A$.

**Part 2, $t(R)$** (the slides' proof). Idea: reverse a walk and you get a walk, so if
every single arrow can be reversed, so can every walk. First show by induction that
every power $R^n$ is symmetric.

- $n = 1$: $R^1 = R$ is symmetric.
- Step: suppose $R^k$ is symmetric and $\langle x,y\rangle\in R^{k+1} = R^k\circ R$.
  Then there is $t$ with $\langle x,t\rangle\in R^k$ and $\langle t,y\rangle\in R$. By
  symmetry of $R^k$ and $R$, $\langle t,x\rangle\in R^k$ and $\langle y,t\rangle\in R$, so
  $\langle y,x\rangle\in R\circ R^k = R^{1+k} = R^{k+1}$. So $R^{k+1}$ is symmetric.

Now if $\langle x,y\rangle\in t(R)$, then $\langle x,y\rangle\in R^n$ for some $n\ge1$,
so $\langle y,x\rangle\in R^n\subseteq t(R)$. Hence $t(R)$ is symmetric.

**Part 3.** By the criterion of Lesson 2.4, it is enough that
$r(R)\circ r(R)\subseteq r(R)$. Composition distributes over $\cup$ (Lesson 2.2), so
$$(R\cup I_A)\circ(R\cup I_A) = (R\circ R)\cup R\cup R\cup I_A\subseteq R\cup I_A,$$
using $R\circ R\subseteq R$.

What's missing from the list is the interesting part: **the symmetric closure can
destroy transitivity.**

::: example A transitive relation whose symmetric closure isn't
On $A = \{1,2,3\}$ take $R = \{\langle1,3\rangle\}$. Is $s(R)$ transitive?
== R is transitive ==
There are no two pairs $\langle x,y\rangle,\langle y,z\rangle$ to chain, so the
condition holds vacuously.
== The symmetric closure ==
$s(R) = \{\langle1,3\rangle,\langle3,1\rangle\}$.
== Not transitive ==
$\langle1,3\rangle$ and $\langle3,1\rangle$ are in $s(R)$, but $\langle1,1\rangle$ is not.
Adding a reverse arrow creates a new two-step walk $1\to3\to1$ whose shortcut is
missing.
:::

| If $R$ is … | then $r(R)$ is … | $s(R)$ is … | $t(R)$ is … |
| --- | --- | --- | --- |
| reflexive | reflexive | reflexive | reflexive |
| symmetric | symmetric | symmetric | symmetric |
| transitive | transitive | **not always** transitive | transitive |

::: callout tip Combining closures, and the order matters
Since $s$ can break transitivity but $t$ never breaks symmetry or reflexivity, the
smallest relation that is reflexive, symmetric *and* transitive containing $R$ is
$tsr(R) = t(s(r(R)))$: take the transitive closure last. The other order can fail: on
$\{1,2,3\}$ with $R = \{\langle1,2\rangle,\langle3,2\rangle\}$, $t(R) = R$ and
$st(R) = \{\langle1,2\rangle,\langle2,1\rangle,\langle3,2\rangle,\langle2,3\rangle\}$ is
not transitive ($1\to2\to3$ but no $\langle1,3\rangle$), whereas $ts(R)$ is all of $A\times A$.
The next lesson calls such relations equivalence relations (Lesson 2.6).
:::

::: callout exam What exams ask
Expect to write down $r(R)$, $s(R)$, $t(R)$ for a small relation (given as a set, a
matrix or a diagram), to count their pairs, and true/false questions about closures and
properties like the ones in the quiz. For $t(R)$, list walks systematically (or compute
$M + M^2 + \cdots + M^n$); don't guess.
:::

::: cards Closures of relations
Closure of a relation (闭包): the idea :: Add the fewest pairs so the relation gains a property; the smallest superset (under ⊆) with that property.
Closure: the three conditions :: $R'$ has the property; $R\subseteq R'$; $R'\subseteq R''$ for every $R''\supseteq R$ with the property.
Which properties have closures? :: Reflexive, symmetric, transitive. Not irreflexive or antisymmetric: adding pairs can't create them.
Reflexive closure $r(R)$ :: $R\cup R^0 = R\cup I_A$; matrix $M + E$.
Symmetric closure $s(R)$ :: $R\cup R^{-1}$; matrix $M + M^{T}$.
Transitive closure $t(R)$ :: $R\cup R^2\cup R^3\cup\cdots$; matrix $M + M^2 + \cdots$ (Boolean). On an $n$-element set, stop at $R^n$.
Transitive closure on a diagram :: Add $x\to y$ whenever $y$ can be reached from $x$ in one or more steps.
Theorem 2.5.2 :: $R$ reflexive ⇔ $r(R) = R$; symmetric ⇔ $s(R) = R$; transitive ⇔ $t(R) = R$.
Theorem 2.5.3 (monotonicity) :: $R_1\subseteq R_2$ ⇒ $r(R_1)\subseteq r(R_2)$, $s(R_1)\subseteq s(R_2)$, $t(R_1)\subseteq t(R_2)$.
Theorem 2.5.4 :: Reflexive ⇒ $s(R)$, $t(R)$ reflexive; symmetric ⇒ $r(R)$, $t(R)$ symmetric; transitive ⇒ $r(R)$ transitive.
Which closure can destroy transitivity? :: The symmetric closure: $R = \{\langle1,3\rangle\}$ is transitive, $s(R) = \{\langle1,3\rangle,\langle3,1\rangle\}$ is not.
Smallest equivalence relation containing $R$ :: $tsr(R)$: reflexive, then symmetric, then transitive last.
:::

::: quiz Check yourself
? Which statement is correct?
- [ ] The symmetric closure always has an even number of pairs
- [ ] If $|A|$ is odd, the reflexive closure of any relation on $A$ has an odd number of pairs
- [ ] No transitive closure has exactly two pairs
- [x] None of the above
> In-class question (Rain Classroom: D). A is false: $s(\{\langle a,a\rangle\}) = \{\langle a,a\rangle\}$ has 1 pair (loops are their own reverses). B is false: on $A = \{a,b,c\}$, $r(\{\langle a,b\rangle\}) = \{\langle a,a\rangle,\langle b,b\rangle,\langle c,c\rangle,\langle a,b\rangle\}$ has 4. C is false: $\{\langle a,a\rangle,\langle a,b\rangle\}$ is already transitive, so it is its own transitive closure, with 2 pairs.

? Which kinds of relation always have a closure? (tick all)
- [x] Reflexive
- [ ] Irreflexive
- [x] Symmetric
- [ ] Antisymmetric
- [x] Transitive
> A closure only adds pairs. Reflexivity, symmetry and transitivity ask for pairs to be present, and $E_A$ has all three. Irreflexivity and antisymmetry forbid pairs: a loop in $R$, or a pair $\langle a,b\rangle,\langle b,a\rangle$ with $a\ne b$, can't be fixed by adding.

? $A = \{a,b\}$, $R = \{\langle a,a\rangle,\langle a,b\rangle\}$. Which is $r(R)$?
- [ ] $\{\langle a,a\rangle,\langle a,b\rangle,\langle b,a\rangle,\langle b,b\rangle\}$
- [x] $\{\langle a,a\rangle,\langle a,b\rangle,\langle b,b\rangle\}$
- [ ] $\{\langle a,a\rangle,\langle b,b\rangle\}$
> Only $\langle b,b\rangle$ is missing for reflexivity. The first option adds $\langle b,a\rangle$ too, which isn't forced; the last drops $\langle a,b\rangle$, so it doesn't contain $R$.

? $A = \{1,2,3,4\}$, $R = \{\langle1,2\rangle,\langle2,1\rangle,\langle2,3\rangle,\langle3,3\rangle\}$. How many pairs does $s(R)$ have?
answer: 5
> $R^{-1} = \{\langle2,1\rangle,\langle1,2\rangle,\langle3,2\rangle,\langle3,3\rangle\}$; only $\langle3,2\rangle$ is new, so $|s(R)| = 4 + 1 = 5$.

? $A = \{1,2,3,4\}$, $R = \{\langle1,2\rangle,\langle2,3\rangle,\langle3,4\rangle\}$. How many pairs does $t(R)$ have?
answer: 6
> $R^2 = \{\langle1,3\rangle,\langle2,4\rangle\}$, $R^3 = \{\langle1,4\rangle\}$, $R^4 = \varnothing$. So $t(R) = R\cup R^2\cup R^3$ has $3 + 2 + 1 = 6$ pairs: every $\langle i,j\rangle$ with $i < j$.

? $A = \{1,2,3\}$, $R = \{\langle1,2\rangle,\langle2,3\rangle,\langle3,1\rangle\}$ (a cycle). How many pairs does $t(R)$ have?
answer: 9
> Going round the cycle, every element reaches every element, itself included (in 3 steps). So $t(R) = A\times A$, $3^2 = 9$ pairs. Check: $R^2 = \{\langle1,3\rangle,\langle2,1\rangle,\langle3,2\rangle\}$, $R^3 = I_A$.

? $R$ is a relation on an $n$-element set with $m$ pairs, none of them a loop. How many pairs does $r(R)$ have?
expression: m + n
variables: m, n
> $r(R) = R\cup I_A$, and $R\cap I_A = \varnothing$ because $R$ has no loops, so $|r(R)| = m + n$.

? $R$ is transitive. Which closure of $R$ might **not** be transitive?
- [ ] $r(R)$
- [x] $s(R)$
- [ ] $t(R)$
> Theorem 2.5.4 keeps transitivity for $r(R)$, and $t(R) = R$ here. But $R = \{\langle1,3\rangle\}$ gives $s(R) = \{\langle1,3\rangle,\langle3,1\rangle\}$, missing $\langle1,1\rangle$.

? $A = \{1,2,3\}$, $R = \{\langle1,2\rangle\}$. How many pairs does $tsr(R)$, the smallest equivalence relation containing $R$, have?
answer: 5
> $r(R) = \{\langle1,1\rangle,\langle2,2\rangle,\langle3,3\rangle,\langle1,2\rangle\}$; $s$ adds $\langle2,1\rangle$; that is already transitive. So 5 pairs: 1 and 2 are related, 3 only to itself.

? $M$ is a relation's matrix. Fill the gap: the matrix of its symmetric closure is $M + {}$ ___ (one symbol, its name in words).
text: transpose | the transpose | M^T | M^T of M | transpose of M
> $s(R) = R\cup R^{-1}$, and the matrix of $R^{-1}$ is the transpose $M^{T}$, so $M_s = M + M^{T}$ (Boolean addition).
:::

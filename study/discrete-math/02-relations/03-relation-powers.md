---
title: Powers of relations
zh: 关系的幂运算
summary: The n-th power of a relation on a set, three ways to compute it (sets, relation graphs, Boolean matrix products), and why the powers of a relation on a finite set must eventually repeat in a cycle.
source: 2-2二元关系 (§2.3 关系的幂运算), 2026-09-08
---

A relation on a set says which element can reach which **in one step**. Composing the
relation with itself answers the next question: who can reach whom in **two** steps,
three steps, $n$ steps? That is the power $R^n$. Powers are the building blocks of the
transitive closure (Lesson 2.5) and of reachability in graphs (Lesson 4.6), and they
have a surprising property on finite sets: sooner or later they start repeating, so
only finitely many of them are ever different. This lesson shows how to compute powers
by hand in three ways and proves the repetition theorems.

You need composition from Lesson 2.2. Remember the course's order: in
$F\circ G=\{\langle x,z\rangle\mid \exists y\,(xFy\wedge yGz)\}$, the step in $F$ comes
**first** and the step in $G$ second.

## The power of a relation

Think of $A$ as a set of cities and $R$ as "there is a direct flight from $x$ to $y$".
Then $R\circ R$ is "you can get from $x$ to $z$ with exactly two flights": a first
flight to some city $y$, then a second from $y$ to $z$. Composing once more gives
"exactly three flights", and so on. And "zero flights" means you stay where you are:
every city reaches itself and nothing else, which is the identity relation $I_A$.

::: define Power of a relation | 关系的幂
Let $R$ be a relation on $A$ and $n$ a natural number. The **$n$-th power** $R^n$ of
$R$ is defined by
1. $R^0=\{\langle x,x\rangle\mid x\in A\}=I_A$;
2. $R^{n+1}=R^n\circ R$.

(Definition 2.3.5 in the textbook.)
:::

Two things follow at once:

- **Every** relation on $A$ has the same 0-th power, the {{term identity relation | 恒等关系}}
  $I_A$. So $R^0$ depends on the set $A$, not on $R$.
- $R^1=R$ for every relation $R$ on $A$, because $R^1=R^0\circ R=I_A\circ R=R$
  (Theorem 2.3.3 in Lesson 2.2: $I_A$ is a "do nothing" step on either side).

In words, $\langle x,y\rangle\in R^n$ means: **you can go from $x$ to $y$ in exactly $n$
steps of $R$**, i.e. there are $x=x_0,x_1,\dots,x_n=y$ with
$\langle x_{i-1},x_i\rangle\in R$ for each $i$.

::: callout pitfall Exactly n steps, not at most n
$R^2$ is not "$R$ plus the two-step pairs". A pair of $R$ that can't be reached again
in two steps is **not** in $R^2$. In the example below, $\langle b,c\rangle\in R$ but
$\langle b,c\rangle\notin R^2$.
:::

::: callout note Powers are only for relations on one set
$R^n$ needs $R\subseteq A\times A$: to take a second step from $y$, $y$ must be
somewhere $R$ starts from. For a relation from $A$ to a different set $B$, $R\circ R$
is not what this definition means.
:::

## Three ways to compute a power

Given a relation $R$ on $A$ and a number $n$, how do we find $R^n$? The lecture gives
three methods: work with the sets directly, look at the relation graph, or multiply
relation matrices.

### Method 1: sets

Compute $R^2=R\circ R$, then $R^3=R^2\circ R$, and so on, straight from the definition
of composition: $\langle x,z\rangle\in R^n\circ R$ when some $y$ has
$\langle x,y\rangle\in R^n$ and $\langle y,z\rangle\in R$.

::: example Powers by the set method
Let $X=\{a,b,c,d\}$ and $R=\{\langle a,a\rangle,\langle a,b\rangle,\langle b,c\rangle\}$.
Find $R^0,R^1,R^2,R^3$.
== R⁰ and R¹ ==
$R^0=I_X=\{\langle a,a\rangle,\langle b,b\rangle,\langle c,c\rangle,\langle d,d\rangle\}$
(note $d$ is in it, although $R$ never mentions $d$), and
$R^1=R=\{\langle a,a\rangle,\langle a,b\rangle,\langle b,c\rangle\}$.
== R² ==
Chain each pair of $R$ with a pair of $R$ that starts where it ends:

- $\langle a,a\rangle$ then $\langle a,a\rangle$ gives $\langle a,a\rangle$;
  $\langle a,a\rangle$ then $\langle a,b\rangle$ gives $\langle a,b\rangle$;
- $\langle a,b\rangle$ then $\langle b,c\rangle$ gives $\langle a,c\rangle$;
- $\langle b,c\rangle$: nothing starts at $c$, so no pair.

So $R^2=R\circ R=\{\langle a,a\rangle,\langle a,b\rangle,\langle a,c\rangle\}$.
== R³ ==
Chain the pairs of $R^2$ with $R$: $\langle a,a\rangle$ gives $\langle a,a\rangle$ and
$\langle a,b\rangle$; $\langle a,b\rangle$ gives $\langle a,c\rangle$;
$\langle a,c\rangle$ gives nothing. So
$R^3=R^2\circ R=\{\langle a,a\rangle,\langle a,b\rangle,\langle a,c\rangle\}$.
== What it shows ==
$R^3=R^2$. Then $R^4=R^3\circ R=R^2\circ R=R^3$, and so on: every power from $R^2$ on
is the same relation. The loop at $a$ lets $a$ "wait" as long as it likes, so $a$
reaches $a,b,c$ in any number $n\ge2$ of steps, while $b$ and $c$ run out of steps.
:::

### Method 2: the relation graph

In the {{term relation graph | 关系图}} $G$ of $R$ (Lesson 2.1), a pair
$\langle x,y\rangle\in R$ is an arrow $x\to y$. A pair of $R^n$ is then a **route of
exactly $n$ arrows** from $x$ to $y$. So:

> The graph $G^n$ of $R^n$ has the same vertices as $G$. For each vertex $x_i$, find
> every vertex $x_j$ that can be reached from $x_i$ along $n$ arrows of $G$ (arrows may
> be reused), and draw an arrow $x_i\to x_j$ in $G^n$. When all such arrows are found,
> that is $G^n$.

A route of length 0 stays put, so $G^0$ is just a loop at every vertex.

::: example Powers by the relation graph
Let $A=\{a,b,c,d\}$ and
$R=\{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle\}$.
Draw the graphs of $R^0,R^1,R^2,R^3$.
== R⁰ and R ==
$R^0=I_A$: a loop at each of $a,b,c,d$. $R^1=R$ is the graph below.
== R²: routes of two arrows ==
From $a$: $a\to b\to a$ and $a\to b\to c$, so arrows $a\to a$ (a loop) and $a\to c$.
From $b$: $b\to a\to b$ and $b\to c\to d$, so $b\to b$ and $b\to d$.
From $c$: $c\to d$, and nothing leaves $d$, so no route of two arrows.
From $d$: nothing.
$R^2=\{\langle a,a\rangle,\langle a,c\rangle,\langle b,b\rangle,\langle b,d\rangle\}$.
== R³: routes of three arrows ==
From $a$: $a\to b\to a\to b$, $a\to b\to c\to d$, so $a\to b$ and $a\to d$.
From $b$: $b\to a\to b\to a$, $b\to a\to b\to c$, so $b\to a$ and $b\to c$.
$c$ and $d$ have no routes of length 3.
$R^3=\{\langle a,b\rangle,\langle a,d\rangle,\langle b,a\rangle,\langle b,c\rangle\}$.
:::

::: graph The relation R = {⟨a,b⟩, ⟨b,a⟩, ⟨b,c⟩, ⟨c,d⟩}
a -> b, b -> a, b -> c, c -> d
:::

::: graph Its square R² = {⟨a,a⟩, ⟨a,c⟩, ⟨b,b⟩, ⟨b,d⟩}: routes of two arrows
vertices: a b c d
a -> a, a -> c, b -> b, b -> d
:::

::: graph Its cube R³ = {⟨a,b⟩, ⟨a,d⟩, ⟨b,a⟩, ⟨b,c⟩}: routes of three arrows
vertices: a b c d
a -> b, a -> d, b -> a, b -> c
:::

The graph method is quick for small examples because you can follow the arrows with
your finger. For bigger relations it's easy to miss a route; the matrix method is
mechanical.

### Method 3: Boolean matrix multiplication

Recall the {{term relation matrix | 关系矩阵}} $M_R$ from Lesson 2.1: for
$A=\{x_1,\dots,x_n\}$, the entry $r_{ij}$ is 1 when $\langle x_i,x_j\rangle\in R$ and 0
otherwise. To compose relations we multiply their matrices as usual, but with the
logical operations instead of $+$ and $\times$:

| Input $a$ | Input $b$ | Logical sum $a\oplus b$ (OR) | Logical product $a\otimes b$ (AND) |
| --- | --- | --- | --- |
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 1 |

The {{term logical sum | 逻辑加}} $\oplus$ is 0 only when all inputs are 0 (logical OR);
the {{term logical product | 逻辑乘}} $\otimes$ is 1 only when all inputs are 1 (logical
AND). So $1\oplus1=1$, not 2: an entry only records **whether** some route exists, not
how many.

::: formula Matrix of a composition | 关系合成的矩阵
$$M_{F\circ G}=M_F\cdot M_G,\qquad (M_F\cdot M_G)_{ij}=\bigoplus_{k=1}^{n}\bigl(f_{ik}\otimes g_{kj}\bigr)$$
--
M_F, M_G | relation matrices of $F$ and $G$ on $A=\{x_1,\dots,x_n\}$, $F$ applied first | —
f_{ik}\otimes g_{kj} | 1 exactly when $x_i\,F\,x_k$ and $x_k\,G\,x_j$ (a route through $x_k$) | —
\bigoplus_k | logical sum: 1 when at least one middle element $x_k$ works | —
:::

Why it works: $\langle x_i,x_j\rangle\in F\circ G$ means "**some** middle element $x_k$
has $x_iFx_k$ **and** $x_kGx_j$". "And" is $\otimes$; "some" is $\oplus$ over all $k$.
Because $F$ comes first in the course's order, its matrix is on the left. In
particular, with $M=M_R$,

$$M_{R^n}=M^n\ (\text{Boolean power}),\qquad M_{R^0}=I\ (\text{the identity matrix}).$$

::: example Powers by matrices
Same relation: $A=\{a,b,c,d\}$,
$R=\{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle\}$. Find
the matrices of $R^0,R^1,\dots,R^4$ (rows and columns in the order $a,b,c,d$).
== M⁰ and M ==
$$M^0=\begin{bmatrix}1&0&0&0\\0&1&0&0\\0&0&1&0\\0&0&0&1\end{bmatrix},\qquad
M=\begin{bmatrix}0&1&0&0\\1&0&1&0\\0&0&0&1\\0&0&0&0\end{bmatrix}$$
== M²: one entry in detail ==
Entry $(2,4)$ of $M^2$ (row $b$, column $d$) combines row 2 of $M$, $(1,0,1,0)$, with
column 4 of $M$, $(0,0,1,0)$:
$$\begin{aligned}
M^2[2][4]&=(m_{21}\otimes m_{14})\oplus(m_{22}\otimes m_{24})\oplus(m_{23}\otimes m_{34})\oplus(m_{24}\otimes m_{44})\\
&=(1\otimes0)\oplus(0\otimes0)\oplus(1\otimes1)\oplus(0\otimes0)=1.
\end{aligned}$$
The 1 comes from $k=3$: $b\to c\to d$. Doing every entry this way gives
$$M^2=\begin{bmatrix}1&0&1&0\\0&1&0&1\\0&0&0&0\\0&0&0&0\end{bmatrix}.$$
== M³ and M⁴ ==
$$M^3=M^2M=\begin{bmatrix}0&1&0&1\\1&0&1&0\\0&0&0&0\\0&0&0&0\end{bmatrix},\qquad
M^4=M^3M=\begin{bmatrix}1&0&1&0\\0&1&0&1\\0&0&0&0\\0&0&0&0\end{bmatrix}.$$
== Reading the result ==
$M^2$ and $M^3$ match the graphs above: $R^2=\{aa,ac,bb,bd\}$ and $R^3=\{ab,ad,ba,bc\}$
(writing $xy$ for $\langle x,y\rangle$). And $M^4=M^2$, so $R^4=R^2$: from here on the
powers alternate, $R^5=R^3$, $R^6=R^2$, … with period 2.
:::

::: callout summary How to compute Rⁿ
- **Sets**: compose step by step, $R^{k+1}=R^k\circ R$. Fine for a handful of pairs.
- **Relation graph**: $G^n$ has an arrow $x_i\to x_j$ when $G$ has a route of exactly
  $n$ arrows from $x_i$ to $x_j$.
- **Matrices**: $M_{R^n}=M^n$ with Boolean multiplication ($\oplus$ = OR, $\otimes$ =
  AND). Mechanical, and the method for larger relations.
:::

## Powers must repeat

Both examples above ended in repetition: $R^3=R^2$ in the first, $R^4=R^2$ in the
second. That is no accident. On a finite set there are only finitely many relations,
so the infinite sequence $R^0,R^1,R^2,\dots$ must hit some relation twice, and from
then on it goes round in a cycle.

The tool is the {{term pigeonhole principle | 抽屉原理}}: put more than $m$ objects into
$m$ boxes and some box gets two.

::: theorem Some two powers are equal
Let $A$ be a set with $n$ elements and $R$ a relation on $A$. Then there are natural
numbers $s\ne t$ with $R^s=R^t$. (Theorem 2.3.6 in the textbook.)
:::

*Idea*: there are only $2^{n^2}$ relations on $A$, so among $2^{n^2}+1$ powers two must
coincide.

*Proof.* Since $|A|=n$, $|A\times A|=n^2$, and a relation on $A$ is any subset of
$A\times A$, so there are $|P(A\times A)|=2^{n^2}$ different relations on $A$. Write
$m=2^{n^2}$. The powers $R^0,R^1,R^2,\dots,R^m$ are $m+1$ relations on $A$. By the
pigeonhole principle at least two of them are equal: there are natural numbers
$0\le s<t\le m$ with $R^s=R^t$. $\blacksquare$

Before going further we need the usual exponent rules.

::: theorem Exponent rules for relations
Let $R$ be a relation on $A$ and $m,n\in\mathbb N$. Then
1. $R^m\circ R^n=R^{m+n}$;
2. $(R^m)^n=R^{mn}$.

(Theorem 2.3.7 in the textbook.)
:::

*Idea*: $m$ steps followed by $n$ steps is $m+n$ steps; doing "$m$ steps" $n$ times is
$mn$ steps. The proofs are inductions on $n$ that use the associative law
$(F\circ G)\circ H=F\circ(G\circ H)$ from Lesson 2.2.

*Proof of 1*, by induction on $n$. For $n=0$:
$R^m\circ R^0=R^m\circ I_A=R^m=R^{m+0}$. Suppose $R^m\circ R^k=R^{m+k}$. Then for
$n=k+1$:
$$\begin{aligned}
R^m\circ R^{k+1}&=R^m\circ(R^k\circ R)&&\text{definition of }R^{k+1}\\
&=(R^m\circ R^k)\circ R&&\text{associative law}\\
&=R^{m+k}\circ R&&\text{induction hypothesis}\\
&=R^{m+k+1}&&\text{definition.}
\end{aligned}$$
So the rule holds for every $n$. $\blacksquare$

*Proof of 2* (not shown in the lecture), by induction on $n$. For $n=0$ both sides are
$I_A$. If $(R^m)^k=R^{mk}$, then
$(R^m)^{k+1}=(R^m)^k\circ R^m=R^{mk}\circ R^m=R^{mk+m}=R^{m(k+1)}$, using rule 1.
$\blacksquare$

A consequence worth noticing: $R^m\circ R^n=R^{m+n}=R^n\circ R^m$. Composition is not
commutative in general (Lesson 2.2), but **powers of the same relation commute**.

Now the repetition itself. Once $R^s=R^t$, every later power repeats with
{{term period | 周期}} $p=t-s$: the sequence has a "tail" $R^0,\dots,R^{s-1}$ and then a
cycle $R^s,\dots,R^{t-1}$ that repeats forever.

::: theorem Powers are eventually periodic
Let $R$ be a relation on $A$, and suppose there are natural numbers $s<t$ with
$R^s=R^t$. Write $p=t-s$. Then
1. $R^{s+k}=R^{t+k}$ for every $k\in\mathbb N$;
2. $R^{s+kp+i}=R^{s+i}$ for all $k,i\in\mathbb N$;
3. with $S=\{R^0,R^1,\dots,R^{t-1}\}$, every power $R^q$ ($q\in\mathbb N$) lies in $S$.

(Theorem 2.3.8 in the textbook.)
:::

*Proof of 1.* $R^{s+k}=R^s\circ R^k=R^t\circ R^k=R^{t+k}$, by Theorem 2.3.7.
$\blacksquare$

*Proof of 2*, by induction on $k$. For $k=0$ it says $R^{s+i}=R^{s+i}$. Suppose
$R^{s+mp+i}=R^{s+i}$. Then for $k=m+1$:
$$\begin{aligned}
R^{s+(m+1)p+i}&=R^{s+mp+i+p}=R^{s+mp+i}\circ R^p&&\text{Theorem 2.3.7}\\
&=R^{s+i}\circ R^p=R^{s+p+i}&&\text{hypothesis, Theorem 2.3.7}\\
&=R^{t+i}=R^{s+i}&&s+p=t,\ \text{part 1.}
\end{aligned}$$
$\blacksquare$

*Proof of 3* (the lecture leaves it out). If $q<t$, $R^q$ is in $S$ by definition. If
$q\ge t$, divide $q-s$ by $p$: $q-s=kp+i$ with $0\le i<p$. Part 2 gives
$R^q=R^{s+kp+i}=R^{s+i}$, and $s+i<s+p=t$, so $R^q\in S$. $\blacksquare$

The proof of part 3 is also the recipe for reducing a huge power:

::: formula Reducing a power | 幂的化简
$$R^q=R^{\,s+i},\qquad\text{where } q-s=kp+i,\ 0\le i<p\quad(q\ge s)$$
--
s, t | exponents with $R^s=R^t$, $s<t$ | —
p | the period $t-s$ | —
i | the remainder of $q-s$ on division by $p$ | —
:::

::: example Reducing R³⁵ when R³ = R¹⁰
Suppose $R^3=R^{10}$. Show that $R^{35}\in S=\{R^0,R^1,\dots,R^9\}$ and find which
power it equals.
== Step by step (the lecture's way) ==
Peel off $R^{10}$ and replace it by $R^3$, again and again (Theorem 2.3.7 splits the
power):
$$\begin{aligned}
R^{35}&=R^{25}\circ R^{10}=R^{25}\circ R^3=R^{28}\\
&=R^{18}\circ R^{10}=R^{18}\circ R^{3}=R^{21}\\
&=R^{11}\circ R^{10}=R^{11}\circ R^{3}=R^{14}\\
&=R^{4}\circ R^{10}=R^{4}\circ R^{3}=R^{7}.
\end{aligned}$$
Each round lowers the exponent by $p=7$.
== With the formula ==
$s=3$, $p=10-3=7$, and $35-3=32=4\cdot7+4$, so $i=4$ and $R^{35}=R^{3+4}=R^7$.
$R^7\in S$.
:::

::: callout note A slip on the slide
The lecture's chain ends "$=R^4\circ R^{10}$" and then "$=R^7$" on the next line; the
step $R^4\circ R^{10}=R^4\circ R^3$ in between got lost. The result $R^{35}=R^7$ is
right.
:::

::: example A very high power of a concrete relation
For $R=\{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle\}$
from the matrix example, find $R^{100}$ and $R^{2025}$.
== The repetition ==
We found $R^4=R^2$, so $s=2$, $t=4$, $p=2$, and every power is one of
$R^0,R^1,R^2,R^3$.
== R¹⁰⁰ ==
$100-2=98=49\cdot2+0$, so $i=0$ and $R^{100}=R^2=\{aa,ac,bb,bd\}$.
== R²⁰²⁵ ==
$2025-2=2023=1011\cdot2+1$, so $i=1$ and $R^{2025}=R^3=\{ab,ad,ba,bc\}$. In short: even
powers from 2 on are $R^2$, odd powers from 3 on are $R^3$.
:::

## Can all the powers be different?

Theorem 2.3.6 says the powers repeat somewhere before the $2^{n^2}$-th one, a huge
bound. How long can a relation keep producing new powers? The lecture asks a modest
version:

> Is there a relation $R$ on a set $X$ with $|X|=n$ such that $R,R^2,\dots,R^n$ are
> pairwise different?

Yes: arrange the elements in a circle and let each point to the next one.

::: example The cycle relation
Let $X=\{x_1,\dots,x_n\}$ and
$R=\{\langle x_1,x_2\rangle,\langle x_2,x_3\rangle,\dots,\langle x_{n-1},x_n\rangle,\langle x_n,x_1\rangle\}$.
== Small cases ==
One element: $R=\{\langle x_1,x_1\rangle\}$, and the list $R$ has only one member, so
there is nothing to check.
Two elements: $R=\{\langle x_1,x_2\rangle,\langle x_2,x_1\rangle\}$ and
$R^2=\{\langle x_1,x_1\rangle,\langle x_2,x_2\rangle\}\ne R$.
Three elements: $R=\{\langle x_1,x_2\rangle,\langle x_2,x_3\rangle,\langle x_3,x_1\rangle\}$,
$R^2=\{\langle x_1,x_3\rangle,\langle x_2,x_1\rangle,\langle x_3,x_2\rangle\}$,
$R^3=\{\langle x_1,x_1\rangle,\langle x_2,x_2\rangle,\langle x_3,x_3\rangle\}$, all
different.
== In general ==
$R^k$ sends each $x_i$ exactly $k$ places further round the circle. For
$k=1,\dots,n$ these shifts are different (shifting by $k<n$ places moves $x_1$ to
$x_{k+1}\ne x_1$, while shifting by $n$ places brings everything back), so
$R,R^2,\dots,R^n$ are pairwise different, and $R^n=I_X$.
== The period ==
Since $R^n=I_X=R^0$, here $s=0$, $t=n$, $p=n$: the powers run through $n$ different
relations and start again.
:::

::: graph The cycle relation on four elements: R, then R⁴ = I
x1 -> x2, x2 -> x3, x3 -> x4, x4 -> x1
:::

::: callout key The one idea to remember
$\langle x,y\rangle\in R^n$ means "$y$ can be reached from $x$ in **exactly $n$ steps**
of $R$". Compute it by composing, by following arrows, or by Boolean matrix powers. On
a finite set the powers eventually cycle, so $R^q$ for any $q$ reduces to a small
power.
:::

::: callout exam What exams ask
- Given a small relation (as a set, a graph or a matrix), write $R^2$, $R^3$ or its
  matrix; show one Boolean product entry.
- Given $R^s=R^t$, reduce a big power such as $R^{35}$ or $R^{100}$.
- Prove $R^m\circ R^n=R^{m+n}$ by induction, or Theorem 2.3.6 by pigeonhole.
:::

::: cards Powers of relations
Definition of the power $R^n$ :: $R^0=I_A$, and $R^{n+1}=R^n\circ R$ (Definition 2.3.5).
What $R^0$ is for any relation on $A$ :: The identity relation $I_A=\{\langle x,x\rangle\mid x\in A\}$.
Meaning of $\langle x,y\rangle\in R^n$ :: $y$ can be reached from $x$ in exactly $n$ steps of $R$.
Graph $G^n$ of $R^n$ :: Same vertices; an arrow $x_i\to x_j$ when $G$ has a route of exactly $n$ arrows from $x_i$ to $x_j$.
Logical sum and product in matrix composition :: $\oplus$ is OR (0 only if all are 0), $\otimes$ is AND (1 only if all are 1).
Matrix of $F\circ G$ :: $M_F\cdot M_G$ with Boolean operations ($F$ first, on the left); so $M_{R^n}=M^n$.
Number of relations on an n-element set :: $2^{n^2}$, the subsets of $A\times A$.
Theorem 2.3.6 (repetition) :: On a finite set, some $R^s=R^t$ with $s\ne t$ (pigeonhole: $2^{n^2}+1$ powers, $2^{n^2}$ relations).
Theorem 2.3.7 (exponent rules) :: $R^m\circ R^n=R^{m+n}$ and $(R^m)^n=R^{mn}$.
Theorem 2.3.8 if $R^s=R^t$, $s<t$, $p=t-s$ :: $R^{s+k}=R^{t+k}$; $R^{s+kp+i}=R^{s+i}$; every power is in $\{R^0,\dots,R^{t-1}\}$.
Relation on n elements with $R,\dots,R^n$ all different :: The cycle $x_1\to x_2\to\cdots\to x_n\to x_1$; its $R^n=I_X$.
:::

::: quiz Check yourself
? For $A=\{a,b,c,d\}$ and $R=\{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle\}$, which pairs are in $R^2$?
- [x] $\langle a,a\rangle$
- [x] $\langle b,d\rangle$
- [ ] $\langle b,c\rangle$
- [ ] $\langle a,d\rangle$
> Two-step routes: $a\to b\to a$, $a\to b\to c$, $b\to a\to b$, $b\to c\to d$, so $R^2=\{aa,ac,bb,bd\}$. $\langle b,c\rangle$ is a one-step pair only, and $a$ needs three steps to reach $d$ ($a\to b\to c\to d$), so $\langle a,d\rangle\in R^3$, not $R^2$.

? $X=\{a,b,c,d\}$, $R=\{\langle a,a\rangle,\langle a,b\rangle,\langle b,c\rangle\}$. How many ordered pairs does $R^0$ have?
answer: 4
> $R^0=I_X=\{aa,bb,cc,dd\}$: one loop for each of the four elements of $X$, whatever $R$ is.

? In the Boolean product of relation matrices, what is $1\oplus1$?
answer: 1
> $\oplus$ is the logical sum (OR): it is 0 only when all inputs are 0. A matrix entry records whether a route exists, not how many.

? How many different relations are there on a 3-element set (the number of "boxes" in the proof of Theorem 2.3.6)?
answer: 2^(3*3)
> A relation on $A$ is a subset of $A\times A$, which has $3^2=9$ pairs, so there are $2^9=512$ relations.

? Theorem 2.3.6's proof guarantees $R^s=R^t$ with $0\le s<t\le m$. What is $m$ for a set of $n$ elements?
expression: 2^(n^2)
variables: n
> There are $2^{n^2}$ relations on an $n$-element set; the $2^{n^2}+1$ powers $R^0,\dots,R^{2^{n^2}}$ can't all be different.

? Suppose $R^5=R^{12}$. $R^{40}$ equals $R^k$ for which $k$ with $5\le k<12$?
answer: 5
> $s=5$, $p=12-5=7$. $40-5=35=5\cdot7+0$, so $i=0$ and $R^{40}=R^{5+0}=R^5$.

? For $R=\{\langle a,b\rangle,\langle b,a\rangle,\langle b,c\rangle,\langle c,d\rangle\}$ we found $R^4=R^2$. Which power in $\{R^0,R^1,R^2,R^3\}$ equals $R^{2025}$? Give its exponent.
answer: 3
> $s=2$, $p=2$, $2025-2=2023=1011\cdot2+1$, so $R^{2025}=R^{2+1}=R^3$. Odd powers from 3 on are all $R^3$.

? Which statements are true for every relation $R$ on a set $A$?
- [x] $R^0=I_A$
- [x] $R^2\circ R^3=R^3\circ R^2$
- [ ] $R\subseteq R^2$
- [ ] $R^2\ne R$
> $R^0=I_A$ by definition. Both $R^2\circ R^3$ and $R^3\circ R^2$ equal $R^5$ (Theorem 2.3.7), so powers of one relation commute. $R\subseteq R^2$ fails for $R=\{\langle a,b\rangle\}$ ($R^2=\emptyset$). And $R^2=R$ is possible, e.g. for $R=I_A$ or $R=\emptyset$.

? On $X=\{x_1,\dots,x_n\}$ the cycle relation has $R^k=I_X$ for the first time at $k=\ ?$ Give it in terms of $n$.
expression: n
variables: n
> $R^k$ moves every element $k$ places round the circle; the first shift that brings everything back is $k=n$. So $R,\dots,R^n$ are all different and $R^n=I_X$.
:::

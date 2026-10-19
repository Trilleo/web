---
title: Cardinality
zh: 双射函数与集合的基数
summary: Comparing the sizes of infinite sets with bijections: equinumerous sets, sets as large as ℕ (ℤ, ℕ×ℕ, ℚ) and as large as ℝ (every interval), Cantor's theorem, dominance, cardinal numbers ℵ₀ and ℵ, countable sets and continua, plus the 2015–2016 set theory review questions.
source: 3-3函数 (§3.3 双射函数与集合的基数), 2026-09-24
---

How many elements does a set have? For $\{a,b,c\}$ you count: 3. For the natural
numbers, the integers or the real numbers the answer is "infinitely many", which seems
to end the conversation. It doesn't. This lesson shows that infinite sets can still be
compared, that some infinities are genuinely bigger than others, and that the tool for
comparing them is the one from Lessons 3.2 and 3.4: the bijection. Along the way you
meet a handful of surprising facts (there are as many even numbers as integers, as many
fractions as whole numbers, as many points in $(0,1)$ as on the whole line) and one of
the most famous proofs in mathematics, Cantor's diagonal argument.

## Counting without numbers

Think about how you check that a hall has exactly as many chairs as people without
counting either: ask everybody to sit down. If every person has a chair and no chair is
empty, the two sets are the same size. That pairing-off is a bijection, and it works
whether or not you know any numbers. In fact "counting" $\{a,b,c\}$ *is* building a
bijection with $\{0,1,2\}$.

The German mathematician Georg Cantor (1845–1918) took this seriously for infinite sets,
which led to the theory of cardinal numbers and, to the shock of many contemporaries, to
infinities of different sizes.

::: define Equinumerous sets | 等势（对等）
Sets $A$ and $B$ are equinumerous if there is a bijection from $A$ to $B$ (a
{{zh 一一对应}}, one-to-one correspondence); we write $A\approx B$. Otherwise we
write $A\not\approx B$. (Definition 3.3.1 in the textbook.)
:::

For finite sets, $A\approx B$ just says that $A$ and $B$ have the same number of
elements. For infinite sets it is the *definition* of "the same size".

::: graph The odd numbers and the even numbers are equinumerous: 2k + 1 ↦ 2k
row: 1 3 5 7 9
row: 0 2 4 6 8
1 -> 0, 3 -> 2, 5 -> 4, 7 -> 6, 9 -> 8
:::

The figure shows the start of the bijection $f(n)=n-1$ from the odd numbers
$\{1,3,5,\dots\}$ to the even numbers $\{0,2,4,\dots\}$; the pattern continues forever,
and every even number is hit exactly once.

::: theorem Equinumerosity is an equivalence | 等势的性质
Theorem 3.3.1 in the textbook. For any sets $A,B,C$:

1. $A\approx A$;
2. if $A\approx B$, then $B\approx A$;
3. if $A\approx B$ and $B\approx C$, then $A\approx C$.
:::

The proof is a list of facts you already have: $I_A$ is a bijection (1); the inverse of
a bijection is a bijection, Theorem 3.2.4 (2); the composite of bijections is a
bijection, Theorem 3.2.2 (3). So $\approx$ behaves like an equivalence relation
(Lesson 2.6), and "having the same size" is a sound idea.

The slides now ask: which of $\mathbb N=\{0,1,2,\dots\}$, $\mathbb Z$, $\mathbb N\times\mathbb N$,
$\mathbb Q$ and $\mathbb R$ are equinumerous? The next two sections answer it.

## Sets as large as ℕ

### The integers

$\mathbb Z$ looks twice as big as $\mathbb N$: it has the negatives too. But we can list
it in one line by zig-zagging: $0,-1,1,-2,2,-3,3,\dots$ and number that list
$0,1,2,3,\dots$. Non-negative $x$ land on the even positions, negative $x$ on the odd
ones.

::: formula A bijection from ℤ to ℕ | 整数集到自然数集的双射
$$f(x)=\begin{cases}2x, & x\ge0,\\ -2x-1, & x<0.\end{cases}$$
--
x | an integer |
f(x) | its position in the list $0,-1,1,-2,2,\dots$, a natural number |
:::

| Integer $x$ | 0 | −1 | 1 | −2 | 2 | −3 | 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Position $f(x)$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

$f$ is injective (the two cases give even and odd values, and each case is injective)
and surjective (an even $n$ comes from $n/2$, an odd $n$ from $-(n+1)/2$), so
$\mathbb Z\approx\mathbb N$ (Example 3.3.1(1) in the textbook).

::: callout pitfall An infinite set can be as large as a part of itself
$\mathbb N$ is a proper subset of $\mathbb Z$, yet $\mathbb N\approx\mathbb Z$; the even
numbers are a proper subset of $\mathbb N$, yet as large. For finite sets this never
happens. And on infinite sets, finding one map that is injective but not surjective
(like $n\mapsto n+1$ on $\mathbb N$) proves nothing about the sizes: you have to show
that **no** bijection exists.
:::

The zig-zag idea is really this:

::: theorem Listing criterion | 与自然数集等势的充要条件
A set $A$ is equinumerous with $\mathbb N$ if and only if its elements can be written as
an infinite sequence without repetitions, $a_0,a_1,\dots,a_n,\dots$.
:::

**Necessity.** If $\varphi\colon\mathbb N\to A$ is a bijection, list $A$ in the order
$a_n=\varphi(n)$: every element appears (surjective) exactly once (injective).
**Sufficiency.** If $A=\{a_0,a_1,\dots\}$ with no repeats, then $\varphi(n)=a_n$ is a
bijection $\mathbb N\to A$.

So to show a set is as large as $\mathbb N$, it is enough to describe a way of listing
it that reaches every element after finitely many steps.

### Unions of such sets

If $A_1,\dots,A_n$ are each equinumerous with $\mathbb N$, so is their union: list them
side by side and take one element of each in turn. More surprisingly, the same holds for
**countably many** of them:

::: theorem Countable unions | 可数个可数集的并
If $A_1,A_2,\dots,A_n,\dots$ are countably many sets, each equinumerous with $\mathbb N$,
then $\bigcup_{n=1}^{\infty}A_n$ is equinumerous with $\mathbb N$.
:::

**Proof (the slides', for pairwise disjoint sets).** Write each set as a row:

$$\begin{array}{l}A_1:\ a_{11}\ a_{12}\ a_{13}\ a_{14}\ \cdots\\ A_2:\ a_{21}\ a_{22}\ a_{23}\ a_{24}\ \cdots\\ A_3:\ a_{31}\ a_{32}\ a_{33}\ a_{34}\ \cdots\\ \quad\vdots\end{array}$$

Going along the first row would never finish it, so go along the diagonals instead.
Call $p+q$ the *height* of $a_{pq}$. There are only finitely many elements of each height,
so list height 2, then height 3, and so on, and within a height by increasing $p$:
$a_{11};\ a_{12},a_{21};\ a_{13},a_{22},a_{31};\dots$. Every element appears at some
finite place, so by the listing criterion the union is equinumerous with $\mathbb N$.
If the sets overlap, skip any element already listed; the list stays infinite.

### Pairs of natural numbers

::: example ℕ × ℕ is equinumerous with ℕ
Example 3.3.1(2) in the textbook. Show $\mathbb N\times\mathbb N\approx\mathbb N$ and
find the position of $\langle m,n\rangle$ in the list.
== Arrange the pairs ==
Put $\langle p,q\rangle$ in row $p$, column $q$:
$\langle0,0\rangle,\langle0,1\rangle,\langle0,2\rangle,\dots$ in row 0,
$\langle1,0\rangle,\langle1,1\rangle,\dots$ in row 1, and so on.
== List by diagonals ==
Order the pairs by $p+q$ (smaller first), and pairs with the same $p+q$ by $p$ (smaller
first): $\langle0,0\rangle;\ \langle0,1\rangle,\langle1,0\rangle;\ \langle0,2\rangle,\langle1,1\rangle,\langle2,0\rangle;\dots$
numbered $0;\ 1,2;\ 3,4,5;\dots$
== Count the places before $\langle m,n\rangle$ ==
The diagonals $p+q=0,1,\dots,m+n-1$ hold $1+2+\dots+(m+n)=\frac{(m+n)(m+n+1)}{2}$ pairs.
On its own diagonal, $\langle m,n\rangle$ has $m$ pairs before it ($p=0,\dots,m-1$). So
its number is $\frac{(m+n)(m+n+1)}{2}+m$.
== Check ==
$\langle0,0\rangle\mapsto0$, $\langle0,1\rangle\mapsto1$, $\langle1,0\rangle\mapsto\frac{1\cdot2}{2}+1=2$,
$\langle0,2\rangle\mapsto\frac{2\cdot3}{2}=3$, $\langle2,1\rangle\mapsto\frac{3\cdot4}{2}+2=8$:
the list order. This numbering is a bijection $\mathbb N\times\mathbb N\to\mathbb N$.
:::

::: formula Numbering the pairs of natural numbers | 有序对的编号
$$\langle m,n\rangle\ \mapsto\ \frac{(m+n)(m+n+1)}{2}+m$$
--
\langle m,n\rangle | an element of $\mathbb N\times\mathbb N$ |
m+n | the diagonal it lies on |
:::

::: graph The diagonal order on ℕ × ℕ (vertex pq stands for the pair ⟨p, q⟩)
at 00: 40, 30
at 01: 120, 30
at 02: 200, 30
at 03: 280, 30
at 10: 40, 105
at 11: 120, 105
at 12: 200, 105
at 20: 40, 180
at 21: 120, 180
at 30: 40, 250
00 -> 01, 01 -> 10, 10 -> 02, 02 -> 11, 11 -> 20, 20 -> 03, 03 -> 12, 12 -> 21, 21 -> 30
:::

### The rational numbers

::: example ℚ is equinumerous with ℕ
Example 3.3.1(3) in the textbook.
== Split $\mathbb Q$ ==
$\mathbb Q=\mathbb Q_+\cup\mathbb Q_-\cup\{0\}$, and $x\mapsto-x$ is a bijection
$\mathbb Q_+\to\mathbb Q_-$. So it is enough to list $\mathbb Q_+$; then zig-zag between
$\mathbb Q_+$ and $\mathbb Q_-$ as we did for $\mathbb Z$.
== Rows by denominator ==
Every positive rational is $p/q$ with positive integers $p,q$. Let
$A_q=\{1/q,\ 2/q,\ 3/q,\dots\}$, so $A_1=\{1,2,3,\dots\}$, $A_2=\{1/2,2/2,3/2,\dots\}$, …
Each $A_q$ is equinumerous with $\mathbb N$ and $\mathbb Q_+=\bigcup_{q=1}^{\infty}A_q$.
== Apply the union theorem ==
The rows overlap ($2/2=1$), so list by diagonals and skip repeats. Hence
$\mathbb Q_+\approx\mathbb N$, and so $\mathbb Q\approx\mathbb N$.
:::

Putting it together with Theorem 3.3.1:
$\mathbb N\approx\mathbb Z\approx\mathbb Q\approx\mathbb N\times\mathbb N$. The rationals are
dense (between any two there is another), yet no more numerous than the naturals.

## Sets as large as ℝ

### An open interval and the whole line

::: example (0, 1) is equinumerous with ℝ
Example 3.3.1(4) in the textbook. Let $f\colon(0,1)\to\mathbb R$,
$f(x)=\tan\dfrac{(2x-1)\pi}{2}$.
== Where it goes ==
As $x$ runs from 0 to 1, $\frac{(2x-1)\pi}{2}$ runs over $(-\frac\pi2,\frac\pi2)$, where
$\tan$ climbs from $-\infty$ to $+\infty$.
== Why it is a bijection ==
$f$ is strictly increasing, so injective, and $\mathrm{ran}\,f=\mathbb R$, so surjective.
Hence $(0,1)\approx\mathbb R$.
:::

::: plot A bijection from (0, 1) onto all of ℝ
x: 0.01 .. 0.99
y: -10 .. 10
f(x) = tan((2x - 1) pi / 2)
:::

### Closed and open intervals

Adding two endpoints to an infinite set doesn't make it bigger, but the bijection takes a
trick: make room by shifting a sequence along, like guests moving one room up in an
infinite hotel.

::: example [0, 1] is equinumerous with (0, 1)
Inside $[0,1]$ pick out the sequence $0,\ 1,\ \frac12,\ \frac1{2^2},\ \frac1{2^3},\dots$
and call the rest $X$. Then $[0,1]=\{0,1,\frac12,\frac1{2^2},\dots\}\cup X$ and
$(0,1)=\{\frac12,\frac1{2^2},\dots\}\cup X$.
== Shift the sequence two places ==
$$f(x)=\begin{cases}\frac12, & x=0,\\[2pt] \frac1{2^2}, & x=1,\\[2pt] \frac1{2^{n+2}}, & x=\frac1{2^n}\ (n=1,2,\dots),\\[2pt] x, & \text{other } x.\end{cases}$$
== Check ==
$0\mapsto\frac12$, $1\mapsto\frac14$, $\frac12\mapsto\frac18$, $\frac14\mapsto\frac1{16}$,
…: the sequence $0,1,\frac12,\frac14,\dots$ is sent one-to-one onto
$\frac12,\frac14,\frac18,\dots$, and $X$ stays where it is. So $f\colon[0,1]\to(0,1)$ is
a bijection and $[0,1]\approx(0,1)$.
:::

The same trick gives $[0,1]\approx(0,1)\approx[0,1)\approx(0,1]\approx\mathbb R$.

::: example Every interval [a, b] is equinumerous with [0, 1]
Let $a<b$ be real. Show $[a,b]\approx[0,1]$.
== The map ==
$\varphi\colon[0,1]\to[a,b]$, $\varphi(x)=a+(b-a)x$: stretch by $b-a$, then slide by $a$.
== Injective ==
For $x_1\ne x_2$, $\varphi(x_1)-\varphi(x_2)=(b-a)(x_1-x_2)\ne0$.
== Surjective ==
For $y\in[a,b]$, $\frac{y-a}{b-a}\in[0,1]$ and $\varphi\bigl(\frac{y-a}{b-a}\bigr)=y$.
== Conclusion ==
$\varphi$ is a bijection, so $[0,1]\approx[a,b]$; likewise
$[a,b]\approx(a,b)\approx[a,b)\approx(a,b]\approx\mathbb R$.
:::

::: plot The stretch φ(x) = a + (b − a)x from [0, 1] onto [a, b]
x: 0 .. 1
y: -5 .. 5
g(x) = a + (b - a) x
slider a: -4 .. 0 = -2
slider b: 1 .. 4 = 3
:::

So every interval with more than one point, however short, has exactly as many points
as the whole real line.

### Subsets and 0–1 functions

::: theorem Subsets as 0–1 functions | 幂集与{0,1}^A等势
Example 3.3.2 in the textbook. For any set $A$, $P(A)\approx\{0,1\}^A$, where
$\{0,1\}^A$ is the set of all functions $A\to\{0,1\}$ (Lesson 3.1).
:::

The slides skip the proof; the bijection is the characteristic function of Lesson 3.2:
a subset $S\subseteq A$ goes to $\chi_S$, which is 1 on $S$ and 0 elsewhere. Each
function $A\to\{0,1\}$ comes from exactly one subset (the points where it is 1). For
$A=\{a_1,a_2,a_3,\dots\}$ this means a subset *is* an infinite string of 0s and 1s:
$\{a_2,a_4\}$ is $0101000\cdots$.

## Cantor's theorem

So far everything infinite has turned out the same size as $\mathbb N$ or as $\mathbb R$.
Is $\mathbb R$ perhaps also as large as $\mathbb N$?

::: theorem Cantor's theorem | 康托尔定理
Theorem 3.3.2 in the textbook.

1. $\mathbb N\not\approx\mathbb R$.
2. For every set $A$, $A\not\approx P(A)$.
:::

### ℕ is not equinumerous with ℝ: the diagonal argument

**The idea.** Suppose someone hands you a complete numbered list of the reals in
$[0,1]$. Build a number that differs from the 1st in its 1st digit, from the 2nd in its
2nd digit, and so on. It differs from every number in the list, so the list wasn't
complete.

**The proof.** Since $[0,1]\approx\mathbb R$, it is enough to show $\mathbb N\not\approx[0,1]$.
Write every number of $[0,1]$ as an infinite decimal $0.b_1b_2b_3\dots$ with
$b_i\in\{0,\dots,9\}$; finite decimals get endless 0s ($0.5=0.500\dots$) and 1 is written
$0.999\dots$. Suppose, for a contradiction, that all of $[0,1]$ could be listed as
$a_1,a_2,a_3,\dots$:

$$\begin{array}{l}a_1=0.\,a_{11}\,a_{12}\,a_{13}\,\cdots\\ a_2=0.\,a_{21}\,a_{22}\,a_{23}\,\cdots\\ a_3=0.\,a_{31}\,a_{32}\,a_{33}\,\cdots\\ \quad\vdots\end{array}$$

Build $b=0.b_1b_2b_3\dots$ from the diagonal digits:

$$b_n=\begin{cases}2, & a_{nn}=1,\\ 1, & a_{nn}\ne1,\end{cases}\qquad n=1,2,3,\dots$$

Then $b\in[0,1]$, but for every $n$, $b$ and $a_n$ differ in the $n$-th digit, so
$b\ne a_n$. $b$ is missing from the list: a contradiction.

::: callout note Why the digits 1 and 2?
Some numbers have two decimal forms ($0.4999\dots=0.5000\dots$), so "different digits"
doesn't always mean "different numbers". $b$ uses only the digits 1 and 2, so it has
just one form, and differing in a digit really does make it a different number.
:::

::: example The diagonal at work
Suppose a list starts $a_1=0.\mathbf{1}415\dots$, $a_2=0.7\mathbf{1}82\dots$,
$a_3=0.41\mathbf{4}2\dots$, $a_4=0.500\mathbf{0}\dots$
== Read the diagonal ==
$a_{11}=1$, $a_{22}=1$, $a_{33}=4$, $a_{44}=0$.
== Change each digit ==
$b_1=2$, $b_2=2$, $b_3=1$, $b_4=1$, so $b=0.2211\dots$
== Compare ==
$b$ differs from $a_1$ in digit 1, from $a_2$ in digit 2, and so on: it is not anywhere
in the list, however the list continues.
:::

### No set is as large as its power set

**The idea.** A map $g\colon A\to P(A)$ gives every element $x$ a subset $g(x)$. Collect
the elements that are *not* in their own subset. That collection can't be anybody's
subset: if it were $g(x)$, asking "is $x$ in it?" has no consistent answer. (This is
the same self-reference as Russell's paradox in Lesson 1.1.)

**The proof.** It is enough to show that no function $g\colon A\to P(A)$ is surjective.
Given $g$, let

$$B=\{x\mid x\in A,\ x\notin g(x)\}.$$

$B\subseteq A$, so $B\in P(A)$. For every $x\in A$: $x\in B$ if and only if
$x\notin g(x)$. So $B$ and $g(x)$ disagree about $x$, and $B\ne g(x)$. Hence
$B\notin\mathrm{ran}\,g$, and $g$ is not surjective.

::: example Cantor's set B for particular maps
Find $B=\{x\in A\mid x\notin g(x)\}$ for: (1) $A=\{1,2,3,\dots\}$, $g(n)=\{n\}$;
(2) the same $A$, $g(n)=\{n+1,n+2\}$; (3) $A=\{1,2,3\}$, $g(1)=\{1,2\}$,
$g(2)=\varnothing$, $g(3)=\{1,3\}$.
== (1) ==
Every $n\in\{n\}=g(n)$, so $B=\varnothing$. No $g(n)$ is empty, so $B$ has no preimage.
(This $g$ is injective, which shows $A\preceq\cdot P(A)$ below; it just isn't onto.)
== (2) ==
No $n$ lies in $\{n+1,n+2\}$, so $B=A=\{1,2,3,\dots\}$. Every $g(n)$ has 2 elements, so
none is $A$.
== (3) ==
$1\in g(1)$, $2\notin g(2)=\varnothing$, $3\in g(3)$; so $B=\{2\}$, which is not
$\{1,2\}$, $\varnothing$ or $\{1,3\}$.
:::

::: callout note A slip on the slides
The slides for (1) and (2) say "$f\colon A\to P(A)$ is injective" where the map is
called $g$; it is the same map.
:::

By Cantor's theorem $\mathbb N\not\approx P(\mathbb N)$, and with Example 3.3.2,
$\mathbb N\not\approx\{0,1\}^{\mathbb N}$: both $\{0,1\}^{\mathbb N}$ and $\mathbb R$ are
"bigger" than $\mathbb N$.

::: example A diagonal argument for subsets
Use Cantor's diagonal method to show $2^A=P(A)$ is uncountable when $A$ is a countably
infinite set.
== Subsets as 0–1 strings ==
Write $A=\{a_1,a_2,a_3,\dots\}$. A subset becomes a string whose $i$-th digit is 1 if
$a_i$ is in it and 0 if not: $\varnothing=000\cdots$, $\{a_1\}=1000\cdots$,
$\{a_2\}=0100\cdots$, $\{a_1,a_2\}=1100\cdots$, $\{a_2,a_4\}=0101\cdots$.
== Suppose they can be listed ==
$b_1=a_{11}a_{12}a_{13}\cdots$, $b_2=a_{21}a_{22}a_{23}\cdots$, … with $a_{ij}\in\{0,1\}$.
== Flip the diagonal ==
Let $c=c_1c_2c_3\cdots$ with $c_n=1$ if $a_{nn}=0$ and $c_n=0$ if $a_{nn}=1$. Then
$c\ne b_n$ for every $n$ (they differ at position $n$), yet $c$ is a subset of $A$: a
contradiction. (This is the proof above with $g(n)=b_n$: $c$ is exactly Cantor's $B$.)
:::

## Comparing sizes

Equinumerosity says "the same size". To say "at most as large" we only need an
injection: $A$ fits inside $B$ without merging anything.

::: define Dominance | 优势与真优势
Definition 3.3.2 in the textbook. Let $A,B$ be sets.

1. If there is an injection from $A$ to $B$, then $B$ **dominates** $A$
   ({{zh 优势于}}), written $A\preceq\cdot B$; otherwise $A\not\preceq\cdot B$.
2. If $A\preceq\cdot B$ and $A\not\approx B$, then $B$ **strictly dominates** $A$
   ({{zh 真优势于}}), written $A\prec\cdot B$; otherwise $A\not\prec\cdot B$.
:::

For example $\mathbb N\preceq\cdot\mathbb N$, $\mathbb N\preceq\cdot\mathbb R$ (inclusion),
$A\preceq\cdot P(A)$ ($x\mapsto\{x\}$), $\mathbb R\not\preceq\cdot\mathbb N$,
$\mathbb N\prec\cdot\mathbb R$, $A\prec\cdot P(A)$ (Cantor), and
$\mathbb N\not\prec\cdot\mathbb N$.

::: theorem Properties of dominance | 优势的性质
Theorem 3.3.3 in the textbook. For any sets $A,B,C$:

1. $A\preceq\cdot A$;
2. if $A\preceq\cdot B$ and $B\preceq\cdot A$, then $A\approx B$;
3. if $A\preceq\cdot B$ and $B\preceq\cdot C$, then $A\preceq\cdot C$.
:::

(1) and (3) follow from identity maps and composites of injections. (2) is the
Cantor–Schröder–Bernstein theorem; its proof is beyond the course, but it is very
handy: to show two sets are equinumerous, it is enough to find an injection each way,
which is often much easier than one bijection. For instance $\{0,1\}^{\mathbb N}\approx[0,1)$
(stated without proof on the slides) follows this way.

::: callout summary What we know so far
- $\mathbb N\approx\mathbb Z\approx\mathbb Q\approx\mathbb Z\times\mathbb Z$ (and $\mathbb N\times\mathbb N$);
- $\mathbb R\approx[a,b]\approx(a,b)\approx\{0,1\}^{\mathbb N}\approx P(\mathbb N)$, for real $a<b$;
- $\{0,1\}^A\approx P(A)$ for any set $A$;
- $\mathbb N\prec\cdot\mathbb R$, and $A\prec\cdot P(A)$ for any set $A$.
:::

## Finite and infinite sets, cardinal numbers

To count $\{a,b,c\}$ is to match it with $\{0,1,2\}$. For each natural number $k$ let
$\mathbb N_k=\varnothing$ if $k=0$ and $\mathbb N_k=\{0,1,\dots,k-1\}$ if $k\ge1$.

::: define Finite and infinite sets | 有穷集与无穷集
Definition 3.3.3 in the textbook. A set is **finite** if it is empty or equinumerous with
some $\mathbb N_k$, $k\ge1$; a set that is not finite is **infinite**.
:::

::: define Cardinal number | 基数
Definition 3.3.4 in the textbook. The cardinal number of $A$, written
$\mathrm{card}\,A$ (or $|A|$), is

1. for a finite set: $\mathrm{card}\,A=0$ if $A=\varnothing$, and $\mathrm{card}\,A=k$ if
   $A\approx\mathbb N_k$, $k\ge1$;
2. $\mathrm{card}\,\mathbb N=\aleph_0$ (read "aleph-null", {{zh 阿列夫零}});
3. $\mathrm{card}\,\mathbb R=\aleph$ (read "aleph", {{zh 阿列夫}}).
:::

Cardinals are compared exactly as their sets are (Definition 3.3.5 in the textbook):

- $\mathrm{card}\,A=\mathrm{card}\,B$ when $A\approx B$;
- $\mathrm{card}\,A\le\mathrm{card}\,B$ when $A\preceq\cdot B$;
- $\mathrm{card}\,A<\mathrm{card}\,B$ when $\mathrm{card}\,A\le\mathrm{card}\,B$ and
  $\mathrm{card}\,A\ne\mathrm{card}\,B$.

From the earlier sections:
$\mathrm{card}\,\mathbb Z=\mathrm{card}\,\mathbb Q=\mathrm{card}\,(\mathbb N\times\mathbb N)=\aleph_0$,
$\mathrm{card}\,P(\mathbb N)=\mathrm{card}\,2^{\mathbb N}=\mathrm{card}\,[a,b]=\mathrm{card}\,(c,d)=\aleph$,
and $\aleph_0<\aleph$ (here $2^{\mathbb N}=\{0,1\}^{\mathbb N}$). The cardinal number is
the precise form of "how many elements", or of the {{zh 势}} of a set.

### There is no largest cardinal

Cantor's theorem gives $\mathrm{card}\,A<\mathrm{card}\,P(A)$ for every set $A$, so
for any cardinal there is a bigger one. Listing the cardinals we know in order:

$$0,\ 1,\ 2,\ \dots,\ n,\ \dots,\ \aleph_0,\ \ ?\ \ ,\ \aleph,\ \dots$$

$0,1,2,\dots$ are the cardinals of finite sets, the {{term finite cardinals | 有穷基数}};
$\aleph_0,\aleph,\dots$ are the {{term infinite cardinals | 无穷基数}}. $\aleph_0$ is the
smallest infinite cardinal, and after $\aleph$ come bigger ones such as
$\mathrm{card}\,P(\mathbb R)$.

::: callout note The question mark
Is there a set strictly bigger than $\mathbb N$ but strictly smaller than $\mathbb R$?
Cantor guessed not (the continuum hypothesis). In the 20th century Gödel and Cohen
showed that the usual axioms of set theory can neither prove nor disprove it: the "?"
can't be settled from them.
:::

## Countable sets and continua

::: define Countable set | 可数集（可列集）
Definition 3.3.6 in the textbook. A set $A$ is countable if
$\mathrm{card}\,A\le\aleph_0$.
:::

So $\{a,b,c\}$, $\mathbb N$, $\mathbb Z$, $\mathbb Q$ and $\mathbb N\times\mathbb N$ are
countable; $\mathbb R$, and every set equinumerous with it, is not. The elements of a
countable set can be put in a sequence: there is an order that "counts through" all of
them.

::: callout pitfall Countable includes finite
In this course "countable" means $\mathrm{card}\,A\le\aleph_0$, so finite sets are
countable too. Some books use "countable" only for sets equinumerous with $\mathbb N$
(here: "countably infinite", {{zh 无穷可数集}}). Read each question's wording.
:::

::: theorem Facts about countable sets | 可数集的部分结论
Remark 3.3.1 in the textbook.

1. Every subset of a countable set is countable; the Cartesian product of two (or of
   $n\ge2$) countable sets is countable.
2. The union of two, of $n\ge2$, or of countably many countable sets is countable.
3. The power set of a finite set is countable (it is finite); the power set of an
   infinite set is not countable.
:::

::: define Continuum | 连续统
A set $A$ with $\mathrm{card}\,A=\aleph$ has the power of the continuum, or is simply
called a continuum. $\mathbb R$ and, for $a<b$, $[a,b]$, $(a,b]$, $[a,b)$, $(a,b)$ are the
typical continua.
:::

::: theorem Facts about continua | 连续统的部分结论
Remark 3.3.1 in the textbook.

1. The Cartesian product of two, of $n\ge2$, or of countably many continua is a
   continuum.
2. The union of two, of $n\ge2$, of countably many, or of continuum-many continua is a
   continuum.
3. The power set of a countably infinite set is a continuum; the power set of a
   continuum is not.
:::

::: example Which is more?
Example 3.3.4 in the textbook. Compare: (1) points or lines in the plane; (2) points in
1-dimensional or in $n$-dimensional space; (3) points or circles in the plane;
(4) numbers in $[0,1]$ or in $\mathbb N$; (5) rationals or naturals.
== (1) Points and lines ==
Equal. Points are pairs of reals ($\mathbb R\times\mathbb R$, a continuum); a line is
fixed by a couple of real parameters too, so the lines form a continuum as well.
== (2) Dimension ==
Equal: $\mathbb R^n$, a product of $n$ continua, is a continuum, like $\mathbb R$.
== (3) Points and circles ==
Equal: a circle is fixed by its centre and radius, a triple of reals, so circles form a
continuum, like the points.
== (4) $[0,1]$ and $\mathbb N$ ==
$[0,1]$ has more: $\mathrm{card}\,[0,1]=\aleph>\aleph_0$ (Cantor).
== (5) $\mathbb Q$ and $\mathbb N$ ==
Equal: both have cardinal $\aleph_0$.
:::

::: example Words over an alphabet are countable
Let $\Sigma$ be a finite alphabet and $\Sigma^*$ the set of all words over it, including
the empty word. Show $\Sigma^*$ is countable. (For $\Sigma=\{a,b,c,d\}$: one-letter words
$a,b,c,d$; two-letter words $aa,ab,\dots$; and so on.)
== Group the words by length ==
If $|\Sigma|=k$, there are $k^n$ words of length $n$: for each $n$ a finite set.
== Take the union ==
$\Sigma^*$ is the union of these countably many finite sets. List length 0, then
length 1, then length 2, …: every word appears at a finite place. So $\Sigma^*$ is
countable, and (being infinite when $\Sigma\ne\varnothing$) countably infinite.
:::

::: callout note Wording on the slide
The slide ends "a union of countably many finite sets is or countable"; it means "is
finite or countably infinite". Here the union is infinite, so it is countably infinite.
:::

::: callout key Bijections are the measuring stick
Two sets have the same size exactly when a bijection pairs them off. To show
"$\le$", find an injection; to show "the same", find a bijection (or injections both
ways); to show "strictly bigger", show that **no** surjection can exist, usually by
the diagonal argument.
:::

::: callout exam What exams ask
Choice questions: "is $\mathbb N\times\mathbb N$ countable? is $2^{\mathbb N}$?"
(countable, uncountable), "which has more elements?", "which of these sets are
countable?". Proofs: write down a bijection (between intervals, $\mathbb Z\to\mathbb N$),
or run a diagonal argument. The review questions below show the style of the
2015–2016 exams.
:::

## Review: 2015–2016 exam questions on sets, relations and functions

The last slides of the lecture go back over the first chapters with questions from the
2015 and 2016 exams. The answers use Lessons 1.2 (set laws), 2.4 and 2.7 (counting
relations), 2.6 (equivalence relations and partitions) and 3.2 (injections). They are
collected in the quiz "2015–2016 review questions" at the end of this lesson; the 2016
question on $f(n)=\langle n,n+1\rangle$ is also in Lesson 3.4's quiz. Try them without
looking back first.

::: cards Cardinality
Equinumerous sets $A\approx B$ (等势) :: There is a bijection from $A$ to $B$ (Definition 3.3.1).
Properties of $\approx$ (Theorem 3.3.1) :: Reflexive, symmetric and transitive.
Bijection from $\mathbb Z$ to $\mathbb N$ :: $f(x)=2x$ for $x\ge0$, $f(x)=-2x-1$ for $x<0$.
When is $A\approx\mathbb N$? :: Exactly when $A$ can be listed as $a_0,a_1,a_2,\dots$ without repetition.
Position of $\langle m,n\rangle$ in the diagonal list of $\mathbb N\times\mathbb N$ :: $\frac{(m+n)(m+n+1)}{2}+m$.
Bijection from $(0,1)$ to $\mathbb R$ :: $f(x)=\tan\frac{(2x-1)\pi}{2}$.
Bijection from $[0,1]$ to $[a,b]$ :: $\varphi(x)=a+(b-a)x$.
$P(A)$ and $\{0,1\}^A$ :: Equinumerous for every set $A$ (characteristic functions), Example 3.3.2.
Cantor's theorem (Theorem 3.3.2) :: $\mathbb N\not\approx\mathbb R$, and $A\not\approx P(A)$ for every set $A$.
Cantor's set $B$ for $g\colon A\to P(A)$ :: $B=\{x\in A\mid x\notin g(x)\}$; it is not in $\mathrm{ran}\,g$.
Dominance $A\preceq\cdot B$ (优势) :: There is an injection from $A$ to $B$; strict dominance $A\prec\cdot B$ adds $A\not\approx B$.
Theorem 3.3.3, part 2 (Cantor–Schröder–Bernstein) :: If $A\preceq\cdot B$ and $B\preceq\cdot A$, then $A\approx B$.
Cardinals $\aleph_0$ and $\aleph$ :: $\aleph_0=\mathrm{card}\,\mathbb N$, $\aleph=\mathrm{card}\,\mathbb R$, and $\aleph_0<\aleph$.
Is there a largest cardinal? :: No: $\mathrm{card}\,A<\mathrm{card}\,P(A)$ for every $A$.
Countable set (可数集) :: $\mathrm{card}\,A\le\aleph_0$; finite sets count as countable.
Continuum (连续统) :: A set with cardinal $\aleph$, such as $\mathbb R$ or any interval $[a,b]$ with $a<b$.
Power set of a countably infinite set :: A continuum: uncountable, with cardinal $\aleph$.
:::

::: quiz Check yourself
? The set $\mathbb N$ of natural numbers is countable. Is $\mathbb N\times\mathbb N$ countable? Is the power set $2^{\mathbb N}$ countable?
- [ ] Countable, countable
- [x] Countable, uncountable
- [ ] Uncountable, countable
- [ ] Uncountable, uncountable
> $\mathbb N\times\mathbb N$ is listed by diagonals, so it is countable ($\aleph_0$). $2^{\mathbb N}=P(\mathbb N)$ is uncountable by Cantor's theorem ($\aleph$). (In-class question and 2015 exam question 5; Rain Classroom answer B.)

? In the diagonal numbering of $\mathbb N\times\mathbb N$, which natural number does $\langle 2,3\rangle$ get?
answer: (2+3)*(2+3+1)/2 + 2
> $\frac{(m+n)(m+n+1)}{2}+m=\frac{5\cdot6}{2}+2=17$: 15 pairs lie on the diagonals 0 to 4, and $\langle0,5\rangle,\langle1,4\rangle$ come before it on its own.

? Under the bijection $f\colon\mathbb Z\to\mathbb N$ with $f(x)=2x$ for $x\ge0$ and $f(x)=-2x-1$ for $x<0$, what is $f(-4)$?
answer: 7
> $-4<0$, so $f(-4)=-2(-4)-1=7$. Check against the list $0,-1,1,-2,2,-3,3,-4$: $-4$ is at position 7.

? Give a bijection $\varphi\colon[0,1]\to[a,b]$ (with $a<b$) that sends 0 to $a$ and 1 to $b$ and is linear.
expression: a + (b - a) x
variables: x, a, b
> Stretch $[0,1]$ by $b-a$ and slide it by $a$: $\varphi(x)=a+(b-a)x$, with inverse $y\mapsto\frac{y-a}{b-a}$.

? Which pairs of sets are equinumerous? (tick all)
- [x] The points of a line and the points of the plane
- [x] $\mathbb Q$ and $\mathbb N$
- [ ] $[0,1]$ and $\mathbb N$
- [ ] $\mathbb N$ and $P(\mathbb N)$
- [x] $(0,1)$ and $\mathbb R$
> Lines and planes are both continua (Example 3.3.4); $\mathbb Q\approx\mathbb N$ (Example 3.3.1); $(0,1)\approx\mathbb R$ by the tangent map. $[0,1]$ and $P(\mathbb N)$ have cardinal $\aleph>\aleph_0$ (Cantor).

? Which of these sets are countable? (tick all)
- [x] $\{a,b,c\}$
- [x] $\mathbb Z$
- [x] $\Sigma^*$, all words over a finite alphabet
- [ ] $\mathbb R$
- [ ] $(0,1)$
- [ ] $P(\mathbb Z)$
> Countable means $\mathrm{card}\le\aleph_0$, so finite sets count. $\Sigma^*$ is a countable union of finite sets. $\mathbb R$ and $(0,1)$ have cardinal $\aleph$; $P(\mathbb Z)$ is the power set of a countably infinite set, so a continuum.

? $A=\{1,2,3,\dots\}$ and $g\colon A\to P(A)$, $g(n)=\{n+1,n+2\}$. What is Cantor's set $B=\{x\in A\mid x\notin g(x)\}$?
- [ ] $\varnothing$
- [ ] $\{1,2\}$
- [x] $A$ itself
- [ ] $\{1\}$
> No $n$ belongs to $\{n+1,n+2\}$, so every $n$ is in $B$: $B=A$. Each $g(n)$ has two elements, so $B=A$ has no preimage and $g$ isn't surjective.

? How do $\mathrm{card}\,\mathbb R$ and $\mathrm{card}\,P(\mathbb R)$ compare?
- [ ] They are equal
- [x] $\mathrm{card}\,\mathbb R<\mathrm{card}\,P(\mathbb R)$
- [ ] $\mathrm{card}\,\mathbb R>\mathrm{card}\,P(\mathbb R)$
> Cantor's theorem holds for every set: $\mathbb R\prec\cdot P(\mathbb R)$. So there are cardinals bigger than $\aleph$, and no largest one.

? $\{0,1\}^A$ is the set of functions from $A$ to $\{0,1\}$. If $A$ has 5 elements, how many elements does $\{0,1\}^A$ have?
answer: 2^5
> $|\{0,1\}^A|=2^{|A|}=32$ (Lesson 3.1), the same as $|P(A)|$: Example 3.3.2 in the finite case.
:::

::: quiz 2015–2016 review questions
? (2015, Q1) Let $A,B$ be sets. Both $A\setminus B=\varnothing$ and $(A\cup B)\setminus B=(A\setminus B)\cup B$ hold if and only if:
- [ ] $A\subseteq B$
- [ ] $B\subseteq A$
- [ ] $A=B$
- [x] $A=B=\varnothing$
> $(A\cup B)\setminus B=A\setminus B$, so the second equation says $A\setminus B=(A\setminus B)\cup B$, i.e. $B\subseteq A\setminus B$. No element of $B$ can be in $A\setminus B$, so $B=\varnothing$. Then $A\setminus B=A=\varnothing$. Answer D.

? (2015, Q3) Let $A=\{1,2,3\}$. How many reflexive relations can be defined on $A$?
answer: 2^(3*3 - 3)
> A reflexive relation must contain the 3 pairs $\langle a,a\rangle$; each of the other $9-3=6$ pairs is in or out: $2^6=64$ (answer C).

? (2015, Q4) Let $A=\{1,2,3\}$. How many equivalence relations are there on $A$?
answer: 5
> Equivalence relations correspond to partitions (Lesson 2.6): $\{1\},\{2\},\{3\}$; $\{1,2\},\{3\}$; $\{1,3\},\{2\}$; $\{2,3\},\{1\}$; $\{1,2,3\}$. Five (answer B).

? (2015, Q6) For any sets $A,B,C$, which statement is correct?
- [ ] If $A\in B$ and $B\subseteq C$, then $A\subseteq C$
- [ ] If $A\subseteq B$ and $B\in C$, then $A\in C$
- [x] If $A\in B$ and $B\subseteq C$, then $A\in C$
- [ ] If $A\subseteq B$ and $B\in C$, then $A\subseteq C$
> $B\subseteq C$ means every element of $B$ is in $C$; $A$ is one, so $A\in C$. The others fail, e.g. $A=\{1\}$, $B=\{\{1\}\}$, $C=\{B\}$ for A ($A\not\subseteq C$); $A=\varnothing\subseteq B=\{1\}$, $C=\{B\}$ for B ($A\notin C$); $A=B=\{1\}$, $C=\{B\}$ for D ($1\notin C$, so $A\not\subseteq C$). Answer C.

? (2015, Q14) $A$ and $B$ are sets and $\{A\cap B,\ B\setminus A\}$ is a partition of $A\cup B$. What must hold?
- [x] $A\setminus B=\varnothing$
- [ ] $B\setminus A=\varnothing$
- [ ] $A=B=\varnothing$
- [ ] None of the above
> $A\cap B$ and $B\setminus A$ together make $B$; to cover $A\cup B$, nothing of $A$ may lie outside $B$: $A\setminus B=\varnothing$. (Strictly, a partition also needs non-empty blocks, so $\varnothing\ne A\subsetneq B$; A is still the best choice.)

? (2016, Q6) $N$ is the set of natural numbers ($0\in N$) and $f\colon N\to N\times N$, $f(n)=\langle n,n+1\rangle$. Which property does $f$ have?
- [ ] Bijective
- [ ] Neither injective nor surjective
- [x] Injective but not surjective
- [ ] Surjective but not injective
> The first coordinate of $f(n)$ is $n$, so different $n$ give different pairs: injective. $\langle0,0\rangle$ has no preimage: not surjective. Answer C (also in Lesson 3.4).

? (2015, Q22) Let $X=\{1,2,3\}$. How many relations on $X$ are both irreflexive and antisymmetric?
answer: 3^3
> Irreflexive: no loops. Antisymmetric: for each of the $\binom32=3$ pairs $\{a,b\}$, take neither $\langle a,b\rangle$ nor $\langle b,a\rangle$, or one of them: 3 choices each, $3^3=27$ (answer B).

? (2015, Q35) Let $X=\{1,2,3,4\}$. How many equivalence relations on $X$ have a quotient set with 2 elements?
answer: 7
> Two classes means a partition into 2 blocks: 4 of shape 3 + 1 (choose the single element) and 3 of shape 2 + 2 (pair 1 with one of 2, 3, 4). $4+3=7$ (answer C).

? (2015, Q37) $A$ and $B$ are sets and $\{A\cap B\}$ is a partition of $A\cup B$. Which holds?
- [x] $A=B$
- [ ] $A=B=\varnothing$
- [ ] $A\subseteq B$ but not necessarily $A=B$
- [ ] $B\subseteq A$ but not necessarily $A=B$
> A one-block partition means $A\cap B=A\cup B$, which happens exactly when $A=B$; the block must also be non-empty, so $A=B\ne\varnothing$ (that rules out B: $\{\varnothing\}$ doesn't partition $\varnothing$). Answer A.
:::

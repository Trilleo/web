---
title: Functions
zh: 函数的定义
summary: A function as a relation in which every input has exactly one value, equality of functions, functions from A to B and the set of all of them, and images and preimages of subsets.
source: 3-1函数 (§3.1, slides 1–14), 2026-09-17
---

Chapter 3 is about {{term functions | 函数}}, also called {{term maps | 映射}}: rules that
send each input to exactly one output. You have used functions since school
($y = x^2 + 1$), but here we rebuild them out of what Unit 2 already gave us. A function
is a binary relation with one extra rule, so it is a set of ordered pairs, and
everything we know about relations (domains, ranges, inverses, composition) applies to it
straight away. This lesson covers what that extra rule is, when two functions are equal,
how many functions there are between two finite sets, and how a function carries whole
subsets from one side to the other (images and preimages).

## Why functions matter

The chapter's plan has three parts: the definition and basic properties of functions
(this lesson and the next two), composition and inverse functions (Lesson 3.4), and
bijections and the size of infinite sets (Lesson 3.5). Functions sit inside the theory of
relations: a function *is* a relation, and the idea of a function grows out of it.

They are everywhere in computing. A cipher maps plaintexts to ciphertexts (cryptography),
an encoder maps messages to code words (coding theory), a hash table maps keys to storage
slots (data storage), and a trained model maps inputs to predictions (machine learning).
In each case we go from something concrete to an abstract rule "this goes to that", and
that rule is a function.

## What makes a relation a function

Start with the school picture. Is each of these a function on the given interval?

| Formula | Interval | A function? |
| --- | --- | --- |
| $y = x^2 + 1$ | $x \in [0,1]$ | Yes |
| $y = 0$ when $x > 0$; $y = 1$ when $x < 0$ | $x \in [-1,1]$ | No |
| $y = 0$ when $x \ge 0$; $y = 1$ when $x \le 0$ | $x \in [-1,1]$ | No |

The first gives every $x$ in $[0,1]$ exactly one $y$. The second gives $x = 0$ **no**
value at all: neither branch covers it, even though $0$ is in the interval. The third
gives $x = 0$ **two** values, $0$ and $1$, because both branches include it. So two
different things can go wrong: a missing value, or more than one value. The definition
rules out the second; "from $A$ to $B$" (below) rules out the first.

Recall from Lesson 2.1 that a binary relation $F$ is a set of ordered pairs
$\langle x, y\rangle$, and that we write $xFy$ for $\langle x,y\rangle \in F$. Lesson 2.2
gave $\mathrm{dom}\,F$ (the first components) and $\mathrm{ran}\,F$ (the second
components).

::: define Function | 函数（映射）
A binary relation $F$ is a **function** if for every $x \in \mathrm{dom}\,F$ there is
exactly one $y \in \mathrm{ran}\,F$ with $xFy$. When $xFy$ we write $y = F(x)$ and call
$y$ the **value** of $F$ at $x$ (Definition 3.1.1 in the textbook).
:::

So a function is a **single-valued** relation: no first component appears in two
different pairs. In the relation's graph (关系图), no vertex sends out two arrows; in its
matrix, no row has two 1s.

::: callout key A function is a set
A function is a special relation, and relations are sets. So everything is ordered
pairs: $F(x) = y$ just means $\langle x, y\rangle \in F$. Equality, counting and images
below are all set questions.
:::

::: example Which relations are functions?
Let $A = \{a, b, c, d\}$. Which of these relations on $A$ are functions?

$$\begin{gathered}
R_1 = \{\langle a,a\rangle, \langle b,b\rangle, \langle c,c\rangle, \langle d,d\rangle\} \\
R_2 = \{\langle a,a\rangle, \langle b,b\rangle, \langle d,b\rangle\} \\
R_3 = \{\langle a,a\rangle, \langle b,b\rangle, \langle b,c\rangle, \langle c,c\rangle, \langle d,d\rangle\}
\end{gathered}$$

== $R_1$ ==
Each of $a, b, c, d$ is a first component exactly once. It is a function: $R_1(x) = x$
(it is $I_A$, the identity relation).

== $R_2$ ==
$\mathrm{dom}\,R_2 = \{a, b, d\}$, and each of them appears once. It is a function, with
$R_2(a) = a$ and $R_2(b) = R_2(d) = b$. Two inputs sharing a value is allowed; $c$ having
no value is allowed too, because $c \notin \mathrm{dom}\,R_2$.

== $R_3$ ==
$b$ appears twice, in $\langle b,b\rangle$ and $\langle b,c\rangle$: $b$ would have two
values. **Not** a function.
:::

::: graph The relation R₂ on A drawn from A (top) to A (bottom): each top vertex sends at most one arrow
row: a b c d
row: a′ b′ c′ d′
a -> a′, b -> b′, d -> b′
:::

::: graph The relation R₃: b sends two arrows, so it is not a function
row: a b c d
row: a′ b′ c′ d′
a -> a′, b -> b′, b -> c′, c -> c′, d -> d′
:::

In both drawings the top row is $A$ as the set of inputs and the bottom row ($a'$, $b'$,
…) is the same set $A$ as the set of outputs.

## Equal functions

Because functions are sets, we don't need a new idea of "the same function": two
functions are equal when they are equal as sets.

::: define Equal functions | 函数相等
Functions $F$ and $G$ are **equal**, $F = G$, if $F \subseteq G$ and $G \subseteq F$
(Definition 3.1.2 in the textbook).
:::

Unpacking the set equality gives the two checks you actually use:

1. $\mathrm{dom}\,F = \mathrm{dom}\,G$, and
2. $F(x) = G(x)$ for every $x$ in that common domain.

::: example Same formula, different functions
Are $F(x) = \dfrac{x^2 - 1}{x + 1}$ and $G(x) = x - 1$ (both on real numbers) equal?

== Domains ==
$F$ is undefined at $x = -1$ (division by zero), so
$\mathrm{dom}\,F = \{x \mid x \in \mathbb R, x \ne -1\}$. $G$ is defined everywhere:
$\mathrm{dom}\,G = \mathbb R$.

== Conclusion ==
$\langle -1, -2\rangle \in G$ but $\langle -1, -2\rangle \notin F$, so $G \not\subseteq F$
and $F \ne G$, even though $F(x) = G(x)$ at every $x \ne -1$ (cancel $x + 1$).
:::

::: callout pitfall Simplifying can change the function
Cancelling a factor changes the domain. Two functions with the same values but different
domains are different functions. Always compare domains first.
:::

## Functions from A to B

Definition 3.1.1 says nothing about where a function starts or ends. In practice we fix
both: the inputs must be **all** of a set $A$, and the values must lie in a set $B$.

::: define Function from A to B | 从A到B的函数
Let $A$, $B$ be sets. A function $f$ is a **function from $A$ to $B$**, written
$f\colon A \to B$, if $\mathrm{dom}\,f = A$ and $\mathrm{ran}\,f \subseteq B$
(Definition 3.1.3 in the textbook).
:::

So $f\colon A \to B$ asks for two things: **every** element of $A$ has a value (no gaps),
and every value lies in $B$. Values need not use up $B$: some elements of $B$ may be
nobody's value. Put together with Definition 3.1.1: every $x \in A$ has exactly one value
in $B$. That is the "no missing value, no double value" test from the school examples.

::: example The same three relations as functions from A to A
With $A = \{a,b,c,d\}$ and $R_1$, $R_2$, $R_3$ as above, which are functions $A \to A$?

== $R_1$ ==
A function with $\mathrm{dom}\,R_1 = A$ and $\mathrm{ran}\,R_1 = A \subseteq A$: **yes**.

== $R_2$ ==
A function, but $\mathrm{dom}\,R_2 = \{a, b, d\} \ne A$ ($c$ has no value): **no**, it is
not a function from $A$ to $A$.

== $R_3$ ==
Not a function at all, so certainly **no**.
:::

::: callout pitfall "A function" is not "a function from A to B"
$R_2$ is a function, yet not a function from $A$ to $A$. Being a function only forbids
double values; being a function *from $A$* also forbids missing values.
:::

## The set of all functions from A to B

Functions are sets, so we can collect them into a set.

::: define The set B^A | B上A
$B^A$ (read "$B$ upon $A$", "$B$ 上 $A$") is the set of all functions from $A$ to $B$:
$B^A = \{f \mid f\colon A \to B\}$ (Definition 3.1.4 in the textbook).
:::

::: example Listing B^A
Let $A = \{1, 2, 3\}$ and $B = \{a, b\}$. Find $B^A$.

== Idea ==
A function $A \to B$ is fixed by choosing $f(1)$, $f(2)$ and $f(3)$, each $a$ or $b$:
$2 \times 2 \times 2 = 8$ choices.

== The eight functions ==
$$\begin{aligned}
f_0 &= \{\langle1,a\rangle,\langle2,a\rangle,\langle3,a\rangle\}, &
f_1 &= \{\langle1,a\rangle,\langle2,a\rangle,\langle3,b\rangle\}, \\
f_2 &= \{\langle1,a\rangle,\langle2,b\rangle,\langle3,a\rangle\}, &
f_3 &= \{\langle1,a\rangle,\langle2,b\rangle,\langle3,b\rangle\}, \\
f_4 &= \{\langle1,b\rangle,\langle2,a\rangle,\langle3,a\rangle\}, &
f_5 &= \{\langle1,b\rangle,\langle2,a\rangle,\langle3,b\rangle\}, \\
f_6 &= \{\langle1,b\rangle,\langle2,b\rangle,\langle3,a\rangle\}, &
f_7 &= \{\langle1,b\rangle,\langle2,b\rangle,\langle3,b\rangle\}.
\end{aligned}$$

== Answer ==
$B^A = \{f_0, f_1, \ldots, f_7\}$. Reading $a$ as 0 and $b$ as 1, $f_k$'s values spell
$k$ in binary, which is why nothing is missed or repeated.
:::

The same argument works for any finite sets: each of the $m$ elements of $A$
independently picks one of the $n$ elements of $B$.

::: formula Number of functions from A to B | 函数的个数
$$\lvert B^A\rvert = \lvert B\rvert^{\lvert A\rvert} = n^m$$
--
m | the number of elements of $A$, $\lvert A\rvert$ |
n | the number of elements of $B$, $\lvert B\rvert$ |
B^A | the set of all functions $f\colon A\to B$ |
:::

That is also why the notation is $B^A$: its size is $\lvert B\rvert$ to the power
$\lvert A\rvert$. Watch which set is the base: the *values* set $B$, raised to the
*inputs* set $A$.

### When A or B is empty

The formula needs $m, n > 0$ to be read safely. When a set is empty, think about the
definition instead. If $A$ or $B$ is empty, $A \times B = \varnothing$, so the only
relation from $A$ to $B$ is $\varnothing$. Is $\varnothing$ a function from $A$ to $B$? It
is a function (it has no pairs, so no double values), $\mathrm{ran}\,\varnothing =
\varnothing \subseteq B$, and the only question is whether $\mathrm{dom}\,\varnothing =
\varnothing$ equals $A$.

| Case | The set $B^A$ | Why |
| --- | --- | --- |
| $A = \varnothing$, $B = \varnothing$ | $\varnothing^\varnothing = \{\varnothing\}$ | The empty function has domain $\varnothing = A$ |
| $A = \varnothing$, $B \ne \varnothing$ | $B^\varnothing = \{\varnothing\}$ | Same: one function, the empty one |
| $A \ne \varnothing$, $B = \varnothing$ | $\varnothing^A = \varnothing$ | $\mathrm{dom}\,\varnothing \ne A$: no function at all |

So the questions on the slide have the answers: $f\colon \varnothing \to \varnothing$
exists (exactly one, $f = \varnothing$); $f\colon \varnothing \to \{1, 2\}$ exists (again
only $\varnothing$); $f\colon \{1, 2\} \to \varnothing$ does not exist, because $1$ would
need a value and there is none. This agrees with $n^m$ if we read $n^0 = 1$ (even
$0^0 = 1$) and $0^m = 0$ for $m > 0$.

::: callout pitfall Empty set versus the set holding the empty set
$B^\varnothing = \{\varnothing\}$ has **one** element (the empty function), while
$\varnothing^A = \varnothing$ has none. Mixing up $\varnothing$ and $\{\varnothing\}$ here
is a classic exam trap (as in Lesson 1.1).
:::

## Images of subsets

So far a function takes one element to one element. Often we want to know where a whole
group of elements goes. Take $X = \{a, b, c\}$, $Y = \{1, 2, 3, 4\}$ and $f(a) = 1$,
$f(b) = 2$, $f(c) = 3$.

::: graph The function f from X = {a, b, c} to Y = {1, 2, 3, 4}; nothing goes to 4
row: a b c
row: 1 2 3 4
a -> 1, b -> 2, c -> 3
:::

Send the subset $\{a, b\}$ through $f$ element by element and collect what comes out:
$\{f(a), f(b)\} = \{1, 2\}$. Likewise $\{c\}$ gives $\{3\}$ and $\varnothing$ gives
$\varnothing$. This turns $f$ into a correspondence between **subsets** of $X$ and
**subsets** of $Y$.

::: define Image of a subset | 像
Let $f\colon A \to B$ and $A_1 \subseteq A$. The **image of $A_1$ under $f$** is
$$f(A_1) = \{f(x) \mid x \in A_1\} \subseteq B.$$
The image of the whole domain, $f(A)$, is called the **image of the function**
(函数的像); it equals $\mathrm{ran}\,f$ (Definition 3.1.5 ① in the textbook).
:::

In the example, $\{1, 2\}$ is the image of $\{a, b\}$, $\{3\}$ the image of $\{c\}$,
$\varnothing$ the image of $\varnothing$, and $f(X) = \{1, 2, 3\}$ is the image of the
function. Note that $4$ is in $Y$ but not in the image.

::: callout pitfall A value is an element; an image is a set
$f(c) = 3$ is a **value**, an element: $3 \in B$. $f(\{c\}) = \{3\}$ is an **image**, a
subset: $\{3\} \subseteq B$. Same letter $f$, different kinds of input and output. Keep
$\in$ and $\subseteq$ straight (Lesson 1.1).
:::

## Preimages of subsets

Now go backwards: given a set of outputs, which inputs land in it? Take
$X = \{a, b, c\}$, $Y = \{1, 2, 3, 4\}$ and this time $f(a) = 1$, $f(b) = f(c) = 2$.

::: graph The function f(a) = 1, f(b) = f(c) = 2; nothing goes to 3 or 4
row: a b c
row: 1 2 3 4
a -> 1, b -> 2, c -> 2
:::

The inputs landing in $\{1, 2\}$ are $a$, $b$ and $c$; the inputs landing in
$\{3, 4\}$: none; in $\varnothing$: none.

::: define Preimage of a subset | 原像
Let $f\colon A \to B$ and $B_1 \subseteq B$. The **preimage of $B_1$ under $f$** is
$$f^{-1}(B_1) = \{x \mid x \in A,\ f(x) \in B_1\} \subseteq A$$
(Definition 3.1.5 ② in the textbook).
:::

In the example, $f^{-1}(\{1, 2\}) = \{a, b, c\}$, $f^{-1}(\{3, 4\}) = \varnothing$ and
$f^{-1}(\varnothing) = \varnothing$.

::: callout note Where $f^{-1}$ comes from
$f^{-1}$ here is the inverse **relation** of Lesson 2.2 (swap every pair), and
$f^{-1}(B_1)$ is the image of $B_1$ under that relation. It always exists, even when $f$
has no inverse **function** (Lesson 3.4): above, $f^{-1}$ is not a function since $2$ has
two partners, $b$ and $c$, yet $f^{-1}(\{2\}) = \{b, c\}$ is a perfectly good set.
:::

::: example Image, then preimage
$f\colon \{1, 2, 3\} \to \{0, 1\}$ with $f(1) = f(2) = 0$, $f(3) = 1$. Let
$A_1 = \{1\}$. Find $f(A_1)$ and $f^{-1}(f(A_1))$.

== Image ==
$f(A_1) = f(\{1\}) = \{f(1)\} = \{0\}$.

== Preimage of the image ==
$f^{-1}(f(A_1)) = f^{-1}(\{0\}) = \{x \mid f(x) = 0\} = \{1, 2\}$.

== What it shows ==
Going there and back gave $\{1, 2\}$, bigger than $A_1 = \{1\}$: $2$ came along because it
shares the value $0$ with $1$.
:::

::: callout key There and back
In general $A_1 \subseteq f^{-1}(f(A_1))$, with equality for every $A_1$ exactly when no
two inputs share a value (an injection, Lesson 3.2). In the other direction
$f(f^{-1}(B_1)) \subseteq B_1$: elements of $B_1$ that are nobody's value are lost.
:::

::: callout exam What exams ask
Decide whether a given relation, formula or arrow diagram is a function, or a function
from $A$ to $B$; count $\lvert B^A\rvert$ (including the empty-set cases); compute
$f(A_1)$, $f^{-1}(B_1)$ and combinations such as $f^{-1}(f(A_1))$ for a small finite
function.
:::

## Summary

| Idea | Condition or result |
| --- | --- |
| Function | Every $x \in \mathrm{dom}\,F$ has exactly one $y$ with $xFy$ |
| Equal functions | Same domain, and the same value at every point |
| Function $f\colon A\to B$ | $\mathrm{dom}\,f = A$, $\mathrm{ran}\,f \subseteq B$ |
| The set $B^A$ | All functions $A \to B$; it has $n^m$ elements |
| Image $f(A_1)$ | $\{f(x) \mid x \in A_1\}$, a subset of $B$ |
| Preimage $f^{-1}(B_1)$ | $\{x \in A \mid f(x) \in B_1\}$, a subset of $A$ |

::: cards Functions
Function (函数): definition :: A binary relation $F$ in which every $x \in \mathrm{dom}\,F$ has exactly one $y$ with $xFy$; then $y = F(x)$.
Two ways a formula fails to be a function on an interval :: Some point has no value, or some point has two values.
Equal functions (函数相等) :: $F \subseteq G$ and $G \subseteq F$: same domain and the same value at every point.
Are $\frac{x^2-1}{x+1}$ and $x - 1$ equal functions? :: No: the first has domain $\mathbb R - \{-1\}$, the second $\mathbb R$.
Function from A to B, $f\colon A\to B$ :: A function with $\mathrm{dom}\,f = A$ and $\mathrm{ran}\,f \subseteq B$.
The set $B^A$ (B上A) :: The set of all functions from $A$ to $B$.
Size of $B^A$ for $\lvert A\rvert = m$, $\lvert B\rvert = n$ :: $n^m$: each of the $m$ inputs picks one of $n$ values.
$B^\varnothing$ and $\varnothing^A$ (for $A \ne \varnothing$) :: $B^\varnothing = \{\varnothing\}$ (one empty function, even for $B = \varnothing$); $\varnothing^A = \varnothing$ (no function).
Image of $A_1$ under $f$ (像) :: $f(A_1) = \{f(x) \mid x \in A_1\}$, a subset of $B$; $f(A)$ is the image of the function.
Preimage of $B_1$ under $f$ (原像) :: $f^{-1}(B_1) = \{x \in A \mid f(x) \in B_1\}$, a subset of $A$.
Value versus image: $f(c)$ and $f(\{c\})$ :: $f(c) = 3$ is an element of $B$; $f(\{c\}) = \{3\}$ is a subset of $B$.
How $A_1$ and $f^{-1}(f(A_1))$ compare :: $A_1 \subseteq f^{-1}(f(A_1))$; it can be bigger when inputs share values.
:::

::: quiz Check yourself
? On $[-1, 1]$, why is "$y = 0$ when $x \ge 0$; $y = 1$ when $x \le 0$" not a function?
- [ ] $x = 0$ has no value
- [x] $x = 0$ has two values
- [ ] Two different $x$ have the same value
- [ ] Its values don't fill $[-1, 1]$
> Both branches include $x = 0$, giving it the values $0$ and $1$. Different inputs sharing a value is allowed, and values never need to fill anything. (The version with $x > 0$ and $x < 0$ fails the other way: $x = 0$ gets no value.)

? Let $A = \{a, b, c, d\}$. Which relations are functions from $A$ to $A$? (tick all)
- [x] $\{\langle a,b\rangle, \langle b,b\rangle, \langle c,b\rangle, \langle d,b\rangle\}$
- [ ] $\{\langle a,a\rangle, \langle b,b\rangle, \langle d,b\rangle\}$
- [ ] $\{\langle a,a\rangle, \langle b,b\rangle, \langle b,c\rangle, \langle c,c\rangle, \langle d,d\rangle\}$
- [x] $\{\langle a,d\rangle, \langle b,c\rangle, \langle c,b\rangle, \langle d,a\rangle\}$
> The first and last give each of $a, b, c, d$ exactly one value. The second leaves $c$ without a value (its domain is $\{a, b, d\}$); the third gives $b$ two values.

? $A = \{1, 2, 3\}$, $B = \{a, b\}$. How many elements does $B^A$ have?
answer: 2^3
> Each of the 3 inputs picks one of 2 values: $2^3 = 8$, the functions $f_0, \ldots, f_7$.

? With $\lvert A\rvert = m$ and $\lvert B\rvert = n$ (both positive), how many functions are there from $A$ to $B$? (an expression in $m$ and $n$)
expression: n^m
variables: m, n
> Each of the $m$ elements of $A$ chooses its value among $n$: $n \cdot n \cdots n = n^m$. Not $m^n$: the values set is the base.

? How many functions are there from $\{1, 2\}$ to $\varnothing$?
answer: 0
> $1$ needs a value and $\varnothing$ has none, so $\varnothing^{\{1,2\}} = \varnothing$. In the other direction, $\{1,2\}^\varnothing = \{\varnothing\}$ has exactly one element, the empty function.

? How many functions are there from $\varnothing$ to $\varnothing$?
answer: 1
> The empty relation $\varnothing$ is a function with domain $\varnothing$, so $\varnothing^\varnothing = \{\varnothing\}$: one function.

? $X = \{a, b, c\}$, $Y = \{1, 2, 3, 4\}$, $f(a) = 1$, $f(b) = f(c) = 2$. What is $f^{-1}(\{2, 3\})$?
- [ ] $\{b\}$
- [x] $\{b, c\}$
- [ ] $\{a, b, c\}$
- [ ] $\varnothing$
> The inputs whose value is $2$ or $3$: $b$ and $c$ (both go to 2; nothing goes to 3).

? $f\colon \{1,2,3,4\} \to \{0,1\}$ with $f(1) = f(3) = 0$ and $f(2) = f(4) = 1$. How many elements does $f^{-1}(f(\{1, 2\}))$ have?
answer: 4
> $f(\{1, 2\}) = \{0, 1\}$, and every input lands in $\{0, 1\}$, so $f^{-1}(\{0,1\}) = \{1,2,3,4\}$: 4 elements.

? Are $F(x) = \frac{x^2-1}{x+1}$ and $G(x) = x - 1$ equal functions?
- [ ] Yes: they agree after cancelling $x + 1$
- [x] No: their domains differ
> $\mathrm{dom}\,F$ leaves out $-1$ while $\langle -1, -2\rangle \in G$, so $G \not\subseteq F$. Equal functions need the same domain.
:::

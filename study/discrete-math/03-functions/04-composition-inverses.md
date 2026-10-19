---
title: Composition and inverses
zh: 函数的复合与反函数
summary: Composite functions (F first, then G), what composition keeps (injective, surjective, bijective) and what it forces, composing with identity maps, inverse functions of bijections, and left and right inverses with how many there are.
source: 3-2函数 (§3.2 函数的复合与反函数), 2026-09-22
---

Functions are most useful when you chain them: do one thing, then feed the result into
the next. This lesson studies that chaining, called composition, and its reverse: can
you *undo* a function? We'll see that composition keeps the good properties of
functions (injective, surjective, bijective), that a composite being injective or
surjective tells you something about each of its parts, and that only bijections have a
true inverse. Functions that are only injective or only surjective can still be undone
"from one side", which leads to left and right inverses. These ideas come back whenever
we compare the sizes of infinite sets (Lesson 3.5).

## Composing two functions

A function is a relation, so you already know how to compose two of them: Lesson 2.2
defined the {{term composite function | 复合函数}} (the composition of relations, also
called {{zh 映射的合成}}) as

$$F\circ G=\{\langle x,z\rangle \mid \exists y\,(xFy\wedge yGz)\}.$$

Read it as a two-step journey: start at $x$, follow $F$ to some $y$, then follow $G$
from $y$ to $z$. For functions each step has at most one way to go, so the journey has
at most one end. In function notation:

$$(F\circ G)(x)=G\bigl(F(x)\bigr)\qquad\text{($F$ first, then $G$).}$$

::: callout pitfall The order of composition
Our textbook writes the function applied **first** on the **left**: $F\circ G$ means
"do $F$, then $G$", so $(F\circ G)(x)=G(F(x))$. Many other books (and calculus) use the
opposite order, where $g\circ f$ means "$f$ first" and $(g\circ f)(x)=g(f(x))$. Both are
correct conventions, but you must not mix them. In this course, always read
$F\circ G$ from left to right, in the order the arrows are followed. When a question
says "$(f\circ g)(x)$", work out $f(x)$ first.
:::

Before using functions as if composites were always functions, we should check it.

::: theorem The composite of functions is a function | 函数复合的性质
Theorem 3.2.1 in the textbook. Let $F$ and $G$ be functions. Then $F\circ G$ is a
function, and

1. $\mathrm{dom}(F\circ G)=\{x\mid x\in\mathrm{dom}\,F,\ F(x)\in\mathrm{dom}\,G\}$;
2. for every $x\in\mathrm{dom}(F\circ G)$, $(F\circ G)(x)=G(F(x))$.
:::

The domain in part 1 says: $x$ survives the journey exactly when $F$ is defined at $x$
**and** $G$ is defined at the place $F$ sends it. If $F$ lands somewhere $G$ knows
nothing about, $x$ drops out.

**Why it is a function (the idea).** If $x$ could reach two ends $y_1\ne y_2$, both
journeys would pass through a middle point. $F$ is a function, so the middle point is
the same; $G$ is a function, so the ends are the same. The slides' proof, by
contradiction:

- Suppose $x\in\mathrm{dom}(F\circ G)$ has $x\,(F\circ G)\,y_1$ and $x\,(F\circ G)\,y_2$.
- Then there are $t_1,t_2\in\mathrm{ran}\,F\cap\mathrm{dom}\,G$ with
  $\langle x,t_1\rangle\in F$, $\langle t_1,y_1\rangle\in G$ and $\langle x,t_2\rangle\in F$,
  $\langle t_2,y_2\rangle\in G$.
- $F$ is a function, so $t_1=t_2$. $G$ is a function, so $y_1=y_2$, contradicting
  $y_1\ne y_2$.

**Part 1.** $x\in\mathrm{dom}(F\circ G)$ $\iff$ there are $t,y$ with
$\langle x,t\rangle\in F$ and $\langle t,y\rangle\in G$ $\iff$ $x\in\mathrm{dom}\,F$,
$t=F(x)$ and $t\in\mathrm{dom}\,G$.

**Part 2.** Take $x\in\mathrm{dom}(F\circ G)$. Then $x\in\mathrm{dom}\,F$ and
$F(x)\in\mathrm{dom}\,G$, so $\langle x,F(x)\rangle\in F$ and
$\langle F(x),G(F(x))\rangle\in G$. By the definition of composition,
$\langle x,G(F(x))\rangle\in F\circ G$, which says $(F\circ G)(x)=G(F(x))$.

::: example Empty and partial composites
Let $F=\{\langle a,w\rangle,\langle b,z\rangle,\langle c,z\rangle\}$. Find $F\circ G$ for
(1) $G=\{\langle 1,m\rangle,\langle 2,n\rangle\}$ and (2) $G=\{\langle w,m\rangle,\langle 2,n\rangle\}$.
== (1) Where can $F$'s values go? ==
$\mathrm{ran}\,F=\{w,z\}$ and $\mathrm{dom}\,G=\{1,2\}$ have nothing in common, so no
journey gets past the middle: $\mathrm{dom}(F\circ G)=\varnothing$ and
$F\circ G=\varnothing$, the empty function.
== (2) Follow each element ==
$a\mapsto w\mapsto m$; $b\mapsto z$ and $c\mapsto z$ stop, since $z\notin\mathrm{dom}\,G=\{w,2\}$.
So $\mathrm{dom}(F\circ G)=\{a\}$ and $F\circ G=\{\langle a,m\rangle\}$.
:::

::: callout note A slip on the slide
The slide gives the first composite as $F\circ G=\{\varnothing\}$. That set has one
element (the empty set). The composite has no pairs at all, so it is $F\circ G=\varnothing$.
This is the classic "$\varnothing$ vs $\{\varnothing\}$" mix-up from Lesson 1.1.
:::

Composition of relations is associative (Lesson 2.2), so the same holds for functions,
and for functions between named sets the composite goes where you expect:

::: theorem Associativity and composites of maps | 函数复合的推论
Corollaries 3.2.1 and 3.2.2 in the textbook.

1. If $F,G,H$ are functions, then $(F\circ G)\circ H$ and $F\circ(G\circ H)$ are
   functions and $(F\circ G)\circ H=F\circ(G\circ H)$.
2. If $f\colon A\to B$ and $g\colon B\to C$, then $f\circ g\colon A\to C$, and
   $(f\circ g)(x)=g(f(x))$ for every $x\in A$.
:::

In part 2 every $f(x)$ lies in $B=\mathrm{dom}\,g$, so nothing drops out: the composite
is defined on all of $A$.

::: example A composite from an arrow diagram
$F\colon\{a,b,c\}\to\{1,2,3,4\}$ sends $a\mapsto1$, $b\mapsto2$, $c\mapsto2$;
$G\colon\{1,2,3,4\}\to\{w,z\}$ sends $1\mapsto w$ and $2,3,4\mapsto z$. Find $F\circ G$.
== Follow the arrows ==
$(F\circ G)(a)=G(F(a))=G(1)=w$, $(F\circ G)(b)=G(F(b))=G(2)=z$,
$(F\circ G)(c)=G(F(c))=G(2)=z$.
== Write the set ==
$F\circ G=\{\langle a,w\rangle,\langle b,z\rangle,\langle c,z\rangle\}$. The elements 3
and 4 in the middle are never reached, so they play no part.
:::

::: graph F then G: the top row maps to the middle by F, the middle to the bottom by G
row: a b c
row: 1 2 3 4
row: w z
a -> 1, b -> 2, c -> 2
1 -> w, 2 -> z, 3 -> z, 4 -> z
:::

## What composition keeps

If both steps never merge two points, the whole journey never merges two points; if
both steps reach everything, the whole journey reaches everything.

::: theorem Composition keeps injective, surjective and bijective | 复合保持单射、满射、双射
Theorem 3.2.2 in the textbook. Let $f\colon A\to B$ and $g\colon B\to C$.

1. If $f$ and $g$ are both surjective, so is $f\circ g\colon A\to C$.
2. If $f$ and $g$ are both injective, so is $f\circ g\colon A\to C$.
3. If $f$ and $g$ are both bijective, so is $f\circ g\colon A\to C$.
:::

(The words injective, surjective and bijective are from Lesson 3.2.)

**Proof of 1.** Take any $c\in C$. $g$ is surjective, so some $b\in B$ has $g(b)=c$.
For this $b$, $f$ is surjective, so some $a\in A$ has $f(a)=b$. Then
$(f\circ g)(a)=g(f(a))=g(b)=c$. Every $c$ is hit, so $f\circ g$ is surjective.

**Proof of 2.** Suppose $(f\circ g)(x_1)=(f\circ g)(x_2)$, that is
$g(f(x_1))=g(f(x_2))$. $g$ is injective, so $f(x_1)=f(x_2)$; $f$ is injective, so
$x_1=x_2$. Hence $f\circ g$ is injective.

**Proof of 3.** Combine 1 and 2.

::: graph Both surjective, so the composite is surjective
row: a b c d e
row: 1 2 3 4
row: u v w
a -> 1, b -> 2, c -> 3, d -> 4, e -> 4
1 -> u, 2 -> v, 3 -> v, 4 -> w
:::

In the figure, $f\circ g$ sends $a\mapsto u$, $b,c\mapsto v$, $d,e\mapsto w$: all of $C$
is reached. In the slides' injective picture, $f\colon\{a,b,c\}\to\{1,2,3,4\}$ is
$a\mapsto1$, $b\mapsto2$, $c\mapsto3$ and $g$ sends $1\mapsto u$, $2\mapsto v$,
$3\mapsto x$, $4\mapsto y$ into $\{u,v,w,x,y\}$; the composite $a\mapsto u$,
$b\mapsto v$, $c\mapsto x$ never merges two points.

### The converse is false

Theorem 3.2.2 only goes one way. A composite can be injective (surjective, bijective)
even though its parts are not both injective (surjective, bijective).

::: example Two counterexamples to the converse
(1) $A=\{a_1,a_2,a_3\}$, $B=\{b_1,b_2,b_3,b_4\}$, $C=\{c_1,c_2,c_3\}$ with
$f\colon a_i\mapsto b_i$ and $g\colon b_1\mapsto c_1$, $b_2\mapsto c_2$, $b_3\mapsto c_3$,
$b_4\mapsto c_3$.
(2) $A=\{a_1,a_2,a_3\}$, $B=\{b_1,b_2,b_3\}$, $C=\{c_1,c_2\}$ with
$f\colon a_1\mapsto b_1$, $a_2\mapsto b_2$, $a_3\mapsto b_2$ and
$g\colon b_1\mapsto c_1$, $b_2\mapsto c_2$, $b_3\mapsto c_2$.
== (1) An injective composite with $g$ not injective ==
$f\circ g$: $a_1\mapsto c_1$, $a_2\mapsto c_2$, $a_3\mapsto c_3$, injective (in fact
bijective). $f$ is injective, but $g$ merges $b_3$ and $b_4$: the merge happens at a
point $f$ never reaches, so the composite doesn't notice.
== (2) A surjective composite with $f$ not surjective ==
$f\circ g$: $a_1\mapsto c_1$, $a_2,a_3\mapsto c_2$, surjective. $g$ is surjective, but
$f$ misses $b_3$; $g$ still reaches $c_2$ another way.
:::

## What a composite tells you about its parts

The counterexamples hint at what *is* true. If the whole journey never merges two
points, the **first** step can't merge them either (once merged, they stay merged). If
the whole journey reaches every point of $C$, the **last** step must reach them all.

::: theorem What an injective or surjective composite forces | 复合函数的单射满射性质
Theorem 3.2.6 in the textbook. Let $f\colon A\to B$ and $g\colon B\to C$.

1. If $f\circ g$ is injective, then $f$ is injective.
2. If $f\circ g$ is surjective, then $g$ is surjective.
3. If $f\circ g$ is bijective, then $f$ is injective and $g$ is surjective.
:::

**Proof of 1.** If $f$ were not injective, there would be $a_1\ne a_2$ with
$f(a_1)=f(a_2)$. Then $g(f(a_1))=g(f(a_2))$, so $f\circ g$ merges $a_1$ and $a_2$,
contradicting that $f\circ g$ is injective.

**Proof of 2.** If $g$ were not surjective, some $c\in C$ would have $g(b)\ne c$ for
every $b\in B$. But $f\circ g$ is surjective, so some $a\in A$ has $g(f(a))=c$; with
$b=f(a)$ that gives $g(b)=c$, a contradiction.

**Proof of 3.** Combine 1 and 2.

::: graph f∘g is injective, so f must be; g need not be
row: a b c d
row: 1 2 3 4 5
row: u v w x y
a -> 1, b -> 2, c -> 3, d -> 4
1 -> u, 2 -> v, 3 -> x, 4 -> w, 5 -> w
:::

Here $f\circ g$ is $a\mapsto u$, $b\mapsto v$, $c\mapsto x$, $d\mapsto w$: injective. As
the theorem says, $f$ is injective; $g$ is not (it merges 4 and 5), and neither $f$ nor
$g$ is surjective.

::: example The reverse implications fail
(1) Keep $f$ from the figure above ($a\mapsto1$, $b\mapsto2$, $c\mapsto3$, $d\mapsto4$)
but change $g$ to $1\mapsto u$, $2\mapsto v$, $3\mapsto v$, $4\mapsto w$, $5\mapsto w$.
(2) On $X=\{a,b,c,d,e\}$, $Y=\{1,2,3,4\}$, $Z=\{u,v,w\}$ let $f$ be $a\mapsto1$,
$b\mapsto2$, $c\mapsto2$, $d\mapsto4$, $e\mapsto4$ and $g$ be $1\mapsto u$,
$2\mapsto u$, $3\mapsto v$, $4\mapsto w$.
== (1) $f$ injective does not make $f\circ g$ injective ==
$f$ is still injective, but $(f\circ g)(b)=g(2)=v=g(3)=(f\circ g)(c)$, so $f\circ g$ is
not injective.
== (2) $g$ surjective does not make $f\circ g$ surjective ==
$g$ reaches $u,v,w$, so it is surjective. But $f$ only reaches $1,2,4$, so
$f\circ g$ only reaches $g(1)=g(2)=u$ and $g(4)=w$: it misses $v$.
:::

::: callout note Another slip on the slide
On the slide for (2) the text says "if $g$ is surjective, $g\circ f$ need not be
surjective". In the course's order the composite is $f\circ g$ (first $f$, then $g$),
as in the theorem above it.
:::

::: callout key Which part is forced?
Injective composite → the **first** map is injective. Surjective composite → the
**last** map is surjective. Remember it by the journey: merging can't be undone later,
and the last step is the only one that lands in $C$.
:::

## Composing with identity maps

The {{zh 恒等函数}} identity map $I_A\colon A\to A$, $I_A(x)=x$ (Lessons 2.1 and 3.2),
"does nothing", so composing with it changes nothing.

::: theorem Composing with identity maps | 与恒等函数的复合
Theorem 3.2.3 in the textbook (the slide numbers it 3.2.1). If $f\colon A\to B$, then
$f=f\circ I_B=I_A\circ f$. In particular, for $f\in A^A$,
$f\circ I_A=I_A\circ f=f$.
:::

Note which identity goes where: $I_A\circ f$ does nothing on $A$ first, then $f$;
$f\circ I_B$ does $f$, then nothing on $B$.

## Inverse functions

Every relation has an inverse $R^{-1}$, made by turning each pair round (Lesson 2.2).
For a function this turns every arrow round, and the result need not be a function:

$$F=\{\langle x_1,y_1\rangle,\langle x_2,y_1\rangle\}\quad\Rightarrow\quad F^{-1}=\{\langle y_1,x_1\rangle,\langle y_1,x_2\rangle\},$$

and $F^{-1}$ sends $y_1$ to two places, so it is not a function. Two things can go wrong
when you reverse a function:

- **Two arrows meet** ($f$ not injective): the reversed relation sends one point to two.
- **A point is missed** ($f$ not surjective): the reversed relation is undefined there.

If $f\colon A\to B$ is injective, only the second problem remains: $f^{-1}$ is a bijection
from $\mathrm{ran}\,f$ to $A$, but not a function from $B$ to $A$ when $f$ misses some
$y\in B-\mathrm{ran}\,f$. For example $f\colon\{a,b,c\}\to\{1,2,3,4\}$ with $a\mapsto1$,
$b\mapsto3$, $c\mapsto4$ is injective; $f^{-1}$ maps $\{1,3,4\}$ back onto $\{a,b,c\}$,
but has nothing to say about 2. When $f$ is a bijection, nothing goes wrong at all.

::: theorem The inverse of a bijection | 反函数定理
Theorem 3.2.4 in the textbook. If $f\colon A\to B$ is a bijection, then
$f^{-1}\colon B\to A$ is a bijection too.
:::

::: define Inverse function | 反函数（逆映射）
For a bijection $f\colon A\to B$, the bijection $f^{-1}\colon B\to A$ (the inverse
relation, every arrow turned round) is called the inverse function, or inverse map, of
$f$: $f^{-1}(y)=x$ exactly when $f(x)=y$.
:::

::: graph A bijection f from A = {1, 2, 3} to B = {a, b, c} and its inverse
row: 1 2 3
row: a b c
1 -> a: f, 2 -> b: f, 3 -> c: f
a -> 1: f⁻¹, b -> 2: f⁻¹, c -> 3: f⁻¹
:::

Going there and back brings you home, on either side:

::: theorem An inverse undoes its function | 反函数的性质
Theorem 3.2.5 in the textbook. If $f\colon A\to B$ is a bijection, then
$f^{-1}\circ f=I_B$ and $f\circ f^{-1}=I_A$.
:::

Check the order with the course's convention: for $y\in B$,
$(f^{-1}\circ f)(y)=f(f^{-1}(y))=y$, so $f^{-1}\circ f=I_B$; for $x\in A$,
$(f\circ f^{-1})(x)=f^{-1}(f(x))=x$, so $f\circ f^{-1}=I_A$. With $A=\{1,2,3\}$,
$B=\{a,b,c\}$, $f(1)=a$, $f(2)=b$, $f(3)=c$ and $g=f^{-1}$: $g(a)=1$, $g(b)=2$,
$g(c)=3$, and indeed $(f\circ g)(2)=g(b)=2$, $(g\circ f)(b)=f(2)=b$.

::: example Composites and inverses of functions on the reals
Example 3.2.1 in the textbook. Let $f,g\colon\mathbb R\to\mathbb R$ with

$$f(x)=\begin{cases}x^2, & x\ge3,\\ -2, & x<3,\end{cases}\qquad g(x)=x+2.$$

Find $f\circ g$ and $g\circ f$, and the inverses of $f$ and $g$ if they exist.
== $f\circ g$: first $f$, then add 2 ==
$(f\circ g)(x)=g(f(x))=f(x)+2$. For $x\ge3$ that is $x^2+2$; for $x<3$ it is $-2+2=0$:

$$(f\circ g)(x)=\begin{cases}x^2+2, & x\ge3,\\ 0, & x<3.\end{cases}$$
== $g\circ f$: first add 2, then $f$ ==
$(g\circ f)(x)=f(g(x))=f(x+2)$. The first case applies when $x+2\ge3$, i.e. $x\ge1$:

$$(g\circ f)(x)=\begin{cases}(x+2)^2, & x\ge1,\\ -2, & x<1.\end{cases}$$

The cut point moved from 3 to 1, because the test is made on $x+2$.
== Inverses ==
$f$ is not injective (every $x<3$ goes to $-2$) and not surjective (nothing goes to 0),
so it has no inverse function. $g$ is a bijection: solving $y=x+2$ gives
$g^{-1}\colon\mathbb R\to\mathbb R$, $g^{-1}(x)=x-2$.
:::

## Left and right inverses

A bijection can be undone from both sides. What about a function that is only
injective, or only surjective? Look again at the two problems. An injective map loses
no information, so you can always recover $x$ from $f(x)$; the points $f$ missed can be
sent anywhere, since they never come up. A surjective map reaches everything, so for
each $y$ you can *choose* some $x$ that $f$ sends to $y$.

::: define Left inverse | 左逆映射
Let $f\colon X\to Y$. A map $g\colon Y\to X$ with $f\circ g=I_X$, that is
$g(f(x))=x$ for every $x\in X$, is a left inverse of $f$; if one exists, $f$ is
{{term left invertible | 左可逆}}.
:::

::: define Right inverse | 右逆映射
Let $f\colon X\to Y$. A map $h\colon Y\to X$ with $h\circ f=I_Y$, that is
$f(h(y))=y$ for every $y\in Y$, is a right inverse of $f$; if one exists, $f$ is
{{term right invertible | 右可逆}}.
:::

::: callout pitfall "Left" and "right" are not where the letters stand
In the course's notation the left inverse $g$ is written on the **right**
($f\circ g=I_X$), because the names come from the usual order $g\circ f=\mathrm{id}$.
Don't go by position. Go by meaning: a **left inverse undoes $f$** ($f$ first, then
$g$, and you are back where you started); **$f$ undoes a right inverse** ($h$ first,
then $f$).
:::

::: graph f (down) is injective; g (up) is a left inverse of it
row: 1 2 3
row: a b c d
1 -> a: f, 2 -> b: f, 3 -> c: f
a -> 1: g, b -> 2: g, c -> 3: g, d -> 3: g
:::

In the slide's left-inverse picture, $X=\{1,2,3\}$, $Y=\{a,b,c,d\}$ and $f$ sends
$1\mapsto a$, $2\mapsto b$, $3\mapsto c$. The left inverse $g$ turns those arrows round,
and must still do something with $d$; the slide sends it to 3, but 1 or 2 would do as
well. In the right-inverse picture, $X=\{1,2,3,4\}$, $Y=\{a,b,c\}$, $f$ sends
$1\mapsto a$, $2\mapsto b$, $3\mapsto c$, $4\mapsto c$, and $h$ sends $a\mapsto1$,
$b\mapsto2$, $c\mapsto3$: for $c$, $h$ had to choose between 3 and 4.

::: theorem Left invertible ⇔ injective, right invertible ⇔ surjective | 左可逆与右可逆
Let $f\colon X\to Y$. Then

1. $f$ is left invertible if and only if $f$ is injective;
2. $f$ is right invertible if and only if $f$ is surjective.
:::

The slides skip the proof; here is the idea. (1) If $g(f(x))=x$ and $f(x_1)=f(x_2)$,
apply $g$: $x_1=x_2$. Conversely, for injective $f$ define $g(y)$ as the unique $x$ with
$f(x)=y$ when $y\in\mathrm{ran}\,f$, and any fixed point of $X$ otherwise (this needs
$X\ne\varnothing$). (2) If $f(h(y))=y$, every $y$ is hit (by $h(y)$). Conversely, for
surjective $f$ let $h(y)$ be any one $x$ with $f(x)=y$.

::: example A left inverse on the natural numbers
Let $N=\{1,2,3,\dots\}$. Construct maps $f,g\colon N\to N$ with $g\circ f=I_N$ but
$f\circ g\ne I_N$.
== Choose the maps ==
Let $g(x)=x+1$, and let $f(x)=x-1$ for $x\ge2$, with $f(1)=1$ (since $0\notin N$).
== Check $g\circ f=I_N$ ==
$(g\circ f)(x)=f(g(x))=f(x+1)=x$ for every $x\in N$: $g$ shifts up, $f$ shifts back.
== Check $f\circ g\ne I_N$ ==
$(f\circ g)(x)=g(f(x))$ is $x$ for $x\ge2$, but $(f\circ g)(1)=g(f(1))=g(1)=2\ne1$.
== What it shows ==
$f$ is a left inverse of $g$ ($g$ is injective but misses 1), and $g$ is a right inverse
of $f$ ($f$ is surjective but merges 1 and 2). Neither is a bijection, so neither has a
two-sided inverse: on an infinite set, one-sided inverses really are one-sided.
:::

### How many left and right inverses?

For finite sets we can count them. A left inverse of an injective $f$ is forced on
$\mathrm{ran}\,f$ (it must turn each arrow round) and free on the $|Y|-|X|$ points
outside it, each of which may go to any of the $|X|$ points of $X$. A right inverse must
pick, for each $y$, one of the points $f$ sends to $y$, that is one element of the
fibre $f^{-1}(\{y\})$, independently for each $y$.

::: formula Number of left inverses | 左逆映射的个数
$$\#\{\text{left inverses of } f\}=|X|^{\,|Y|-|X|}$$
--
f | an injective map $f\colon X\to Y$ between finite sets, $X\ne\varnothing$ |
\lvert X\rvert | the number of elements of the domain |
\lvert Y\rvert | the number of elements of the codomain |
:::

::: formula Number of right inverses | 右逆映射的个数
$$\#\{\text{right inverses of } f\}=\prod_{i=1}^{n}\bigl|f^{-1}(\{y_i\})\bigr|$$
--
f | a surjective map $f\colon X\to Y$ between finite sets |
y_1,\dots,y_n | the elements of $Y$ |
f^{-1}(\{y_i\}) | the fibre of $y_i$: the points of $X$ that $f$ sends to $y_i$ |
:::

::: example Counting one-sided inverses
(1) $X=\{a,b,c\}$, $Y=\{1,2,3,4,5\}$, $f\colon a\mapsto2$, $b\mapsto1$, $c\mapsto3$.
How many left inverses? (2) $X=\{a,b,c,d,e\}$, $Y=\{1,2,3\}$, $f\colon a\mapsto2$,
$b\mapsto1$, $c\mapsto3$, $d\mapsto2$, $e\mapsto3$. How many right inverses?
== (1) Left inverses ==
$f$ is injective. $g$ is forced on $1,2,3$ ($g(2)=a$, $g(1)=b$, $g(3)=c$); 4 and 5 may
each go to $a$, $b$ or $c$: $3^{5-3}=3^2=9$ left inverses.
== (2) Right inverses ==
$f$ is surjective with fibres $f^{-1}(\{1\})=\{b\}$, $f^{-1}(\{2\})=\{a,d\}$,
$f^{-1}(\{3\})=\{c,e\}$: $1\times2\times2=4$ right inverses.
:::

### Unique one-sided inverses

**If $f$ has exactly one left inverse, is $f$ a bijection?** Not necessarily. The count
$|X|^{|Y|-|X|}$ equals 1 when $|Y|=|X|$ (then $f$ is a bijection) but also when
$|X|=1$: $f\colon\{a\}\to\{1,2,3\}$, $a\mapsto1$, has exactly one left inverse (send
everything to $a$), yet it is not surjective. (With $X=\{a,b,c,d\}$ and
$Y=\{1,2,3,4,5\}$, an injective $f$ has $4^1=4$ left inverses.)

**If $f$ has exactly one right inverse, is $f$ a bijection?** Yes. $f$ is right
invertible, so it is surjective. If some fibre $f^{-1}(\{y\})$ had two or more elements,
$h(y)$ could be chosen in more than one way and the right inverse would not be unique.
So every fibre has exactly one element: $f$ is injective too, hence a bijection. (For
$f\colon\{a,b,c,d,e\}\to\{1,2,3,4\}$ with $d,e\mapsto4$ there are $1\cdot1\cdot1\cdot2=2$
right inverses, which is why the slide's picture is not unique.)

**Can a bijection be its own inverse without being the identity?** Yes: on
$X=\{a,b\}$, the swap $f(a)=b$, $f(b)=a$ has $f^{-1}=f$, yet $f\ne I_X$.

::: callout exam What exams ask
Multiple-choice questions on this section: "$f\circ g$ is bijective, so which is true?"
(answer: $f$ injective and $g$ surjective), and "is this map on $\mathbb Z$ or $\mathbb N$
injective, surjective, both?". Computation questions: composites of piecewise
functions (move the cut point!), inverses of bijections, and counting left or right
inverses on finite sets.
:::

::: cards Composition and inverses
Composite $(F\circ G)(x)$ in this course :: $G(F(x))$: apply $F$ first, then $G$.
Domain of a composite $F\circ G$ :: $\{x\mid x\in\mathrm{dom}\,F,\ F(x)\in\mathrm{dom}\,G\}$ (Theorem 3.2.1).
Composite of $f\colon A\to B$ and $g\colon B\to C$ :: $f\circ g\colon A\to C$, a function defined on all of $A$.
Is composition of functions associative? :: Yes: $(F\circ G)\circ H=F\circ(G\circ H)$.
What composition keeps (Theorem 3.2.2) :: If $f$ and $g$ are both injective (surjective, bijective), so is $f\circ g$. The converse is false.
If $f\circ g$ is injective… :: …then $f$ (the first map) is injective (Theorem 3.2.6).
If $f\circ g$ is surjective… :: …then $g$ (the last map) is surjective (Theorem 3.2.6).
If $f\circ g$ is bijective… :: …then $f$ is injective and $g$ is surjective; neither need be bijective.
Composing $f\colon A\to B$ with identity maps :: $I_A\circ f=f=f\circ I_B$.
When is the inverse relation $f^{-1}$ a function from $B$ to $A$? :: Exactly when $f\colon A\to B$ is a bijection; then $f^{-1}$ is a bijection too (Theorem 3.2.4).
Inverse function identities (Theorem 3.2.5) :: $f^{-1}\circ f=I_B$ and $f\circ f^{-1}=I_A$ for a bijection $f\colon A\to B$.
Left inverse of $f\colon X\to Y$ :: $g\colon Y\to X$ with $f\circ g=I_X$, i.e. $g(f(x))=x$; exists iff $f$ is injective.
Right inverse of $f\colon X\to Y$ :: $h\colon Y\to X$ with $h\circ f=I_Y$, i.e. $f(h(y))=y$; exists iff $f$ is surjective.
Number of left inverses of an injective $f$ :: $|X|^{|Y|-|X|}$.
Number of right inverses of a surjective $f$ :: The product of the fibre sizes $|f^{-1}(\{y\})|$ over $y\in Y$.
Unique right inverse :: Forces every fibre to have one element, so $f$ is a bijection; a unique left inverse does not.
:::

::: quiz Check yourself
? If the composite $f\circ g$ of maps $f$ and $g$ is a bijection, which statement is correct?
- [x] $f$ is injective and $g$ is surjective
- [ ] $f$ and $g$ are both bijections
- [ ] $f$ is surjective and $g$ is injective
- [ ] None of the above
> By Theorem 3.2.6, an injective $f\circ g$ makes the first map $f$ injective, and a surjective $f\circ g$ makes the last map $g$ surjective. They need not be bijections: $f\colon\{1\}\to\{1,2\}$, $g\colon\{1,2\}\to\{1\}$ give a bijective $f\circ g\colon\{1\}\to\{1\}$. (In-class question, Rain Classroom answer A; the same question appears again with the options reordered.)

? $f$ and $g$ are maps $\mathbb R\to\mathbb R$ with $f(x)=x^2$ and $g(x)=x+1$. In this course's notation, what is $(f\circ g)(2)$?
answer: 5
> $(f\circ g)(2)=g(f(2))=g(4)=5$: $f$ first. (The other order would give $f(g(2))=9$.)

? For the textbook's Example 3.2.1 ($f(x)=x^2$ for $x\ge3$, $-2$ for $x<3$; $g(x)=x+2$), what is $(g\circ f)(1.5)$?
answer: 12.25
> $(g\circ f)(1.5)=f(g(1.5))=f(3.5)=3.5^2=12.25$. The cut for $g\circ f$ is at $x\ge1$, since $f$ tests $x+2\ge3$.

? $f\colon\mathbb R\to\mathbb R$, $f(x)=2x+1$, is a bijection. Give $f^{-1}(x)$.
expression: (x - 1)/2
variables: x
> Solve $y=2x+1$ for $x$: $x=(y-1)/2$. Check: $f^{-1}(f(x))=\bigl((2x+1)-1\bigr)/2=x$.

? $\mathbb Z$ is the set of integers and $f\colon\mathbb Z\to\mathbb Z$, $f(x)=|x|-2x$. Which property does $f$ have?
- [x] Injective
- [ ] Surjective
- [ ] Bijective
- [ ] None of the above
> For $x\ge0$, $f(x)=-x$ gives $0,-1,-2,\dots$; for $x<0$, $f(x)=-3x$ gives $3,6,9,\dots$. All these values are different, so $f$ is injective; but 1 (or 2, 4, …) is never reached, so it is not surjective. (Exam question, answer A.)

? $N$ is the set of natural numbers ($0\in N$) and $f\colon N\to N\times N$, $f(n)=\langle n,n+1\rangle$. Which is true?
- [ ] $f$ is both injective and surjective
- [ ] $f$ is neither injective nor surjective
- [x] $f$ is injective but not surjective
- [ ] $f$ is surjective but not injective
> Different $n$ give different first coordinates, so $f$ is injective. $\langle 0,0\rangle$ (indeed any pair whose second coordinate isn't one more than the first) is never reached, so $f$ is not surjective. (2016 exam question, answer C.)

? $f\colon\{a,b,c\}\to\{1,2,3,4,5\}$ is injective. How many left inverses does it have?
answer: 3^(5-3)
> A left inverse is forced on the 3 points of $\mathrm{ran}\,f$ and free on the other $5-3=2$ points, each going to one of 3 elements: $3^2=9$.

? $f\colon\{a,b,c,d,e\}\to\{1,2,3\}$ sends $a\mapsto2$, $b\mapsto1$, $c\mapsto3$, $d\mapsto2$, $e\mapsto3$. How many right inverses does it have?
answer: 4
> The fibres are $\{b\}$, $\{a,d\}$, $\{c,e\}$; a right inverse picks one element of each: $1\times2\times2=4$.

? $f\colon X\to Y$ has exactly one right inverse. What can you conclude?
- [x] $f$ is a bijection
- [ ] $f$ is surjective but may not be injective
- [ ] $f$ is injective but may not be surjective
> Right invertible means surjective. A fibre with two elements would allow two different right inverses, so every fibre has one element and $f$ is injective too. A unique **left** inverse is different: $f\colon\{a\}\to\{1,2,3\}$ has one, yet isn't a bijection.

? How many bijections $f$ of $\{1,2,3\}$ to itself satisfy $f=f^{-1}$?
answer: 4
> $f=f^{-1}$ means $f(f(x))=x$: each element is fixed or swapped with another. The identity, and the three maps swapping one pair ($1\leftrightarrow2$, $1\leftrightarrow3$, $2\leftrightarrow3$): 4 in all. Three of them show that $f=f^{-1}$ does not force $f=I_X$.
:::

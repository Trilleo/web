---
title: Degrees and isomorphism
zh: 顶点的度数与图的同构
summary: The degree of a vertex (in- and out-degrees, Δ and δ, pendant and odd vertices), the handshake theorem and its corollary, degree sequences and when a list of numbers is graphic or simple-graphic, and graph isomorphism (Petersen graph, invariants, counting non-isomorphic graphs).
source: 图5-1 (§5.2, first part), 2026-09-29; 图5-2 (degree exercises), 2026-10-08
---

The first thing to ask about a vertex is "how many edges meet here?": its degree. It is
the simplest number a graph has, and already powerful: one line of counting, the
**handshake theorem**, tells you that the degrees always add up to twice the number of
edges, which settles at once whether a graph with given degrees can exist. This lesson
covers degrees, the handshake theorem, which lists of numbers can be the degrees of a
graph, and then the question every later chapter relies on: when are two graphs that
*look* different really the **same** graph (isomorphic)? Section 5.2 of the textbook goes
on to complete graphs, regular graphs, complements, walks and cycles: those are Lesson
4.3.

We keep using the two running examples from Lesson 4.1: the undirected graph $G$ and the
directed graph $D$.

::: graph The undirected example $G$, with its degrees
at v1: 110, 80
at v2: 250, 80
at v3: 290, 190
at v4: 190, 240
at v5: 70, 190
v1 -- v1: e1
v1 -- v2: e2
v1 -- v5: e3
v2 -- v5: e4
v2 -- v3: e5
v2 -- v3: e6
v5 -- v4: e7
show: degrees
:::

## The degree of a vertex

Imagine standing at a vertex and counting the edge-ends that touch you. An ordinary edge
gives you one end; a loop starts **and** ends at you, so it gives two. That count is the
degree. In a directed graph you can also count separately the arrows leaving and the
arrows arriving.

::: define Degree | 度数
In an undirected graph $G=\langle V,E\rangle$, the **degree** of $v\in V$, written $d_G(v)$
or just $d(v)$, is the number of times $v$ is an endpoint of an edge. (Definition 5.2.1 in
the textbook.)
:::

::: define Out-degree and in-degree | 出度与入度
In a directed graph $D=\langle V,E\rangle$, the **out-degree** $d_D^+(v)$ (or $d^+(v)$) is the
number of times $v$ is the initial vertex of an edge, and the **in-degree** $d_D^-(v)$ (or
$d^-(v)$) the number of times it is the terminal vertex. The **degree** of $v$ is
$d_D(v)=d^+(v)+d^-(v)$.
:::

So a loop adds **2** to the degree: in an undirected graph its vertex is its endpoint
twice; in a directed graph it is once the start and once the end (1 to $d^+$, 1 to $d^-$).
In terms of Lesson 4.1, $d(v)$ is the sum of the incidence numbers of $v$ with all edges.

::: define Maximum and minimum degree | 最大度与最小度
For an undirected graph $G$,
$$\Delta(G)=\max\{d(v)\mid v\in V(G)\},\qquad \delta(G)=\min\{d(v)\mid v\in V(G)\}.$$
For a directed graph $D$, $\Delta(D)$ and $\delta(D)$ are defined the same way from $d(v)$,
and also the maximum and minimum **out-degree** $\Delta^+(D)$, $\delta^+(D)$ (from
$d^+(v)$) and **in-degree** $\Delta^-(D)$, $\delta^-(D)$ (from $d^-(v)$). Shortly:
$\Delta,\delta,\Delta^+,\delta^+,\Delta^-,\delta^-$.
:::

::: define Pendant vertex | 悬挂顶点
A vertex of degree 1. The edge incident with it is a **pendant edge** (悬挂边).
:::

::: define Odd and even vertices | 奇度顶点与偶度顶点
A vertex of odd degree is an **odd vertex** (奇度顶点); one of even degree an **even
vertex** (偶度顶点). An isolated vertex (degree 0) is even.
:::

::: example Degrees in the undirected example $G$
Find every degree, $\Delta$, $\delta$, the pendant vertices and pendant edges of $G$.
== Count edge-ends ==
$d(v_1)=2+1+1=4$ (the loop $e_1$ gives 2, plus $e_2$, $e_3$).
$d(v_2)=4$ ($e_2,e_4,e_5,e_6$; parallel edges each count).
$d(v_3)=2$ ($e_5,e_6$), $d(v_4)=1$ ($e_7$), $d(v_5)=3$ ($e_3,e_4,e_7$).
== Extremes ==
$\Delta(G)=4$, $\delta(G)=1$.
== Pendant ==
$v_4$ is the only vertex of degree 1, so it is the pendant vertex and $e_7$ the pendant
edge.
== Odd and even ==
Odd vertices: $v_4$, $v_5$ (two of them). Even: $v_1,v_2,v_3$.
:::

::: graph The directed example $D$, with in- and out-degrees
at a: 90, 60
at b: 270, 60
at c: 270, 220
at d: 90, 220
a -> a: e1
a -> b: e2
a -> b: e3
a -> d: e4
c -> b: e5
d -> c: e6
c -> d: e7
show: degrees
:::

::: example Degrees in the directed example $D$
Find the out-, in- and total degrees and all six extremes for $D$, and its pendant
vertices.
== Out-degrees ==
$a$ starts $e_1,e_2,e_3,e_4$: $d^+(a)=4$. $d^+(b)=0$, $d^+(c)=2$ ($e_5,e_7$), $d^+(d)=1$ ($e_6$).
== In-degrees ==
$a$ ends only $e_1$: $d^-(a)=1$. $d^-(b)=3$ ($e_2,e_3,e_5$), $d^-(c)=1$ ($e_6$), $d^-(d)=2$
($e_4,e_7$).
== Degrees ==
$d(a)=5$, $d(b)=3$, $d(c)=3$, $d(d)=3$.
== Extremes ==
$\Delta=5$, $\delta=3$; $\Delta^+=4$, $\delta^+=0$; $\Delta^-=3$, $\delta^-=1$.
== Pendant ==
No vertex has degree 1, so $D$ has no pendant vertex and no pendant edge.
:::

::: callout pitfall A loop counts twice
The commonest slip is giving a loop 1. In $G$, $d(v_1)=4$, not 3. In a directed graph the
loop at $a$ adds 1 to $d^+(a)$ **and** 1 to $d^-(a)$. And note that $\delta^+=0$ in $D$
although every vertex has positive degree: $b$ has arrows in but none out.
:::

## The handshake theorem

At a party, everyone counts the hands they shook, and the counts are added up. The total
is always even, because each handshake is counted twice, once by each person. Replace
people by vertices and handshakes by edges and you have the first theorem of graph
theory.

::: theorem Handshake theorem | 握手定理
In any undirected graph, the sum of the degrees of all vertices is twice the number of
edges. (Theorem 5.2.1 in the textbook.)
:::

**Proof.** Every edge, loops included, has two ends, so when the degrees are added up each
edge contributes exactly 2. With $m$ edges the total is $2m$. ∎

::: theorem Handshake theorem for directed graphs | 有向图的握手定理
In any directed graph, the sum of the degrees of all vertices is twice the number of
edges, and the sum of the in-degrees equals the sum of the out-degrees, both equal to the
number of edges. (Theorem 5.2.2 in the textbook.)
:::

The slide leaves the proof out; the idea is that every arc has exactly one start (counted
once in some $d^+$) and one end (counted once in some $d^-$).

::: formula Handshake theorem | 握手定理
$$
\begin{gathered}
\sum_{v\in V}d(v)=2m,\\
\text{for a directed graph also}\quad \sum_{v\in V}d^+(v)=\sum_{v\in V}d^-(v)=m
\end{gathered}
$$
--
d(v) | degree of the vertex $v$ (a loop counts 2) | —
d^+(v),\ d^-(v) | out-degree and in-degree of $v$ | —
m | number of edges, $|E|$ | —
:::

Check on the running examples: in $G$, $4+4+2+1+3=14=2\times7$. In $D$,
$5+3+3+3=14=2\times7$, the out-degrees $4+0+2+1=7$ and the in-degrees $1+3+1+2=7$.

::: theorem Odd vertices come in pairs | 握手定理推论
In any graph (undirected or directed), the number of odd vertices is even. (Corollary
5.2.1 in the textbook.)
:::

**Idea.** The total of the degrees is even; even degrees add up to something even; so
the odd degrees must add up to something even too, and an odd number of odd numbers is
odd.

**Proof.** Let $G=\langle V,E\rangle$ have $m$ edges, and split the vertices into
$V_1=\{v\in V\mid d(v)\text{ is odd}\}$ and $V_2=\{v\in V\mid d(v)\text{ is even}\}$. By the
handshake theorem
$$2m=\sum_{v\in V}d(v)=\sum_{v\in V_1}d(v)+\sum_{v\in V_2}d(v).$$
$2m$ and $\sum_{v\in V_2}d(v)$ are even, so $\sum_{v\in V_1}d(v)$ is even. It is a sum of
$|V_1|$ odd numbers, which is even only when $|V_1|$ is even. ∎

(The slide writes the index sets of the sums in lower case, $v_1$, $v_2$; they are the
sets $V_1$, $V_2$.)

::: example How many vertices? (exam-style)
An undirected graph has 6 edges, one vertex of degree 3, one of degree 5, and all the
others have degree 2. How many vertices does it have?
== Handshake ==
The degrees add up to $2m=2\times6=12$.
== Subtract what's known ==
$3+5=8$, so the vertices of degree 2 share $12-8=4$: there are $4/2=2$ of them.
== Answer ==
$1+1+2=$ **4 vertices** (the slide's answer).
== Can it exist? ==
Yes, but not as a simple graph: with 4 vertices a simple graph has degrees at most 3
(Theorem 5.2.4 below), and here one vertex has degree 5. It needs loops or parallel edges.
:::

::: callout key The one idea
Count edge-ends two ways: by vertices you get $\sum d(v)$, by edges you get $2m$. Every
"how many vertices / edges" exercise in this chapter starts from $\sum d(v)=2m$.
:::

## Degree sequences and graphic sequences

::: define Degree sequence | 度数列
For an undirected graph $G$ of order $n$ with $V=\{v_1,\dots,v_n\}$, the list
$d(v_1),d(v_2),\dots,d(v_n)$ is the **degree sequence** of $G$. For a directed graph the
**out-degree sequence** (出度列) and **in-degree sequence** (入度列) are defined the same
way.
:::

The degree sequence of $G$ is $4,4,2,1,3$ (in the order $v_1,\dots,v_5$). For $D$ (order
$a,b,c,d$): degree sequence $5,3,3,3$, out-degree sequence $4,0,2,1$, in-degree sequence
$1,3,1,2$.

Now turn the question round: given numbers, is there a graph with those degrees?

::: define Graphic sequence | 可图化的
A list $d=(d_1,d_2,\dots,d_n)$ of non-negative integers is **graphic** if there is an
undirected graph $G$ with vertex set $V=\{v_1,\dots,v_n\}$ and $d(v_i)=d_i$ for every $i$
(loops and parallel edges allowed). It is **simple-graphic** (可简单图化的) if such a $G$
can be chosen **simple**.
:::

With loops and parallel edges allowed, the answer is surprisingly simple: parity is the
only obstacle.

::: theorem When a sequence is graphic | 可图化的充要条件
A sequence of non-negative integers $d=(d_1,\dots,d_n)$ is graphic if and only if
$\sum_{i=1}^{n}d_i$ is even. (Theorem 5.2.3 in the textbook.)
:::

**Idea.** Pair up the odd entries with ordinary edges; then every vertex still needs an
even number of edge-ends, and loops (2 each) supply them.

**Proof.** *Necessity* is the handshake theorem: the degrees of any graph add up to $2m$.

*Sufficiency.* Let $\sum d_i$ be even. Then $d$ has an even number $2k$ of odd entries
($0\le k\le\lfloor n/2\rfloor$), by the same reasoning as the corollary; number them
$d_1,\dots,d_k,d_{k+1},\dots,d_{2k}$. Build $G$ on $V=\{v_1,\dots,v_n\}$:
1. join $v_r$ and $v_{r+k}$ by an edge, for $r=1,\dots,k$ (each odd vertex gets one edge);
2. let $d_i'=d_i$ if $d_i$ is even and $d_i'=d_i-1$ if odd: every $d_i'$ is now even;
3. draw $d_i'/2$ loops at $v_i$, for every $i$.

Each $v_i$ now has degree $d_i$ (odd ones $1+d_i'$, even ones $d_i'$), so $d$ is graphic. ∎

::: example Building a graph for $4,4,2,1,3,5,3$
The slide's example sequence. Is it graphic? Build a graph following the proof.
== Parity ==
$4+4+2+1+3+5+3=22$, even: graphic.
== Pair the odd entries ==
The odd entries are $d_4=1$, $d_5=3$, $d_6=5$, $d_7=3$ ($2k=4$, $k=2$). Join $v_4$–$v_5$ and
$v_6$–$v_7$.
== Loops for the rest ==
What's left: $d'=(4,4,2,0,2,4,2)$, so loops $2,2,1,0,1,2,1$ at $v_1,\dots,v_7$.
== Check ==
$v_5$: one edge and one loop, $1+2=3$. $v_6$: one edge and two loops, $1+4=5$. Edges in
all: $2+9=11=22/2$. (Of course there are many other graphs with this degree sequence.)
:::

::: graph The graph built in the proof for 4, 4, 2, 1, 3, 5, 3
v1 -- v1, v1 -- v1, v2 -- v2, v2 -- v2, v3 -- v3
v4 -- v5, v5 -- v5, v6 -- v7, v6 -- v6, v6 -- v6, v7 -- v7
vertices: v1 v2 v3 v4 v5 v6 v7
show: degrees
:::

Simple graphs are much more constrained. The first limit is obvious: a vertex can only be
joined once to each of the others.

::: theorem Maximum degree of a simple graph | 简单图的最大度
If $G$ is a simple undirected graph of order $n$, then $\Delta(G)\le n-1$. (Theorem 5.2.4
in the textbook.)
:::

(Proof left out on the slide: with no loops and no parallel edges, $v$ has at most one
edge to each of the other $n-1$ vertices.)

A second limit is useful in exercises: **in a simple graph with $n\ge2$ vertices, two
vertices have the same degree.** The degrees lie in $0,1,\dots,n-1$ ($n$ values), but $0$
and $n-1$ can't both occur (a vertex joined to all the others leaves nobody isolated), so
$n$ vertices share at most $n-1$ values, and by the pigeonhole principle two are equal.

::: callout tip A test for simple-graphic sequences (not on the slides)
The slides decide "simple-graphic" case by case. A standard method that always works is
the **Havel–Hakimi** test: sort the sequence in decreasing order, remove the first entry
$d_1$, and subtract 1 from the next $d_1$ entries (the vertex is joined to the
$d_1$ largest others). The sequence is simple-graphic exactly when repeating this ends in
all zeros; a negative number, or too few entries to subtract from, means it isn't. For
$(4,4,3,3,2,2)$: $\to(3,2,2,1,2)=(3,2,2,2,1)\to(1,1,1,1)\to(0,1,1)=(1,1,0)\to(0,0)$: yes.
:::

::: example Which sequences are graphic or simple-graphic? (Example 5.2.1)
Decide for each sequence whether it is graphic and whether it is simple-graphic.
① $(5,5,4,4,2,1)$, ② $(5,4,3,2,2)$, ③ $(3,3,3,1)$,
④ $(d_1,\dots,d_n)$ with $d_1>d_2>\cdots>d_n\ge1$ and $\sum d_i$ even,
⑤ $(4,4,3,3,2,2)$.
== ① ==
Sum $21$, odd: **not graphic**, so not simple-graphic either.
== ② ==
Sum $16$: graphic. But $n=5$ and $5>n-1=4$: by Theorem 5.2.4 **not simple-graphic**.
== ③ ==
Sum $10$: graphic. In a simple graph on 4 vertices, a vertex of degree 3 is joined to all
the others; with three such vertices, the fourth is joined to all three and has degree 3,
not 1. **Not simple-graphic.**
== ④ ==
Even sum: graphic. All $n$ degrees are different, but a simple graph on $n\ge2$ vertices
has two equal degrees. **Not simple-graphic.** (For $n=1$, a single vertex of positive degree needs loops, so again not simple.)
== ⑤ ==
Sum $18$: graphic, and **simple-graphic**: both graphs of figure 5.2.1 below have this
degree sequence.
:::

::: graph Figure 5.2.1 (a): a simple graph with degrees 4, 4, 3, 3, 2, 2
at a: 120, 40
at b: 240, 40
at c: 310, 135
at d: 240, 230
at e: 120, 230
at f: 50, 135
a -- b, b -- c, c -- d, d -- e, e -- f, f -- a, f -- c, a -- c, b -- f
show: degrees
:::

::: graph Figure 5.2.1 (b): another simple graph with the same degrees
at a: 120, 40
at b: 240, 40
at c: 310, 135
at d: 240, 230
at e: 120, 230
at f: 50, 135
a -- b, a -- f, b -- f, b -- e, b -- c, f -- c, c -- d, d -- e, e -- f
show: degrees
:::

::: example Two exercises from class
Can these sequences be realised by a graph, and by a simple graph?
$(2,2,2,3,3,3)$, $(2,2,2,3,3,6)$, $(2,2,2,2,3,3)$.
== $(2,2,2,3,3,3)$ ==
Sum $15$, odd: neither graphic nor simple-graphic (three odd vertices is impossible).
== $(2,2,2,3,3,6)$ ==
Sum $18$: graphic. Six vertices, so a simple graph has $\Delta\le5<6$: not
simple-graphic.
== $(2,2,2,2,3,3)$ ==
Sum $14$: graphic. Simple-graphic too: take the 6-cycle $v_1v_2\cdots v_6v_1$ (all degrees 2)
and add the chord $v_1v_4$; then $v_1$ and $v_4$ have degree 3.
:::

::: callout exam What exams ask
- "Graph with $m$ edges, these degrees, the rest degree $k$: how many vertices?" Use
  $\sum d(v)=2m$.
- "Which of these sequences is (simple-)graphic?" First the parity of the sum (graphic or
  not), then $\Delta\le n-1$, then the "two equal degrees" fact or Havel–Hakimi.
- Read $d$, $d^+$, $d^-$, $\Delta$, $\delta$, $\Delta^\pm$, $\delta^\pm$ and pendant vertices off
  a drawing.
:::

## Graph isomorphism

The drawings below look different, yet they are "the same graph": move the vertices of
the second one around and it lies exactly on top of the first. Put simply, two graphs are
isomorphic when one can be redrawn to coincide with the other (两个图能够重合).

::: graph Graph 1: the path c–a–b–d
at a: 100, 60
at b: 260, 60
at c: 100, 200
at d: 260, 200
a -- b, a -- c, b -- d
:::

::: graph Graph 2: the path e–h–f–g, drawn crossed
at e: 100, 60
at g: 260, 60
at f: 100, 200
at h: 260, 200
e -- h, g -- f, f -- h
:::

Graph 2's edges are $e$–$h$, $h$–$f$, $f$–$g$: it is a path of three edges, just like Graph 1
($c$–$a$–$b$–$d$). Matching the paths end to end, $c\mapsto g$, $a\mapsto f$, $b\mapsto h$,
$d\mapsto e$, sends every edge of Graph 1 to an edge of Graph 2: $(a,b)\mapsto(f,h)$,
$(a,c)\mapsto(f,g)$, $(b,d)\mapsto(h,e)$. That correspondence is what "isomorphic" means.

::: define Isomorphic graphs | 同构
Two undirected graphs $G_1=\langle V_1,E_1\rangle$ and $G_2=\langle V_2,E_2\rangle$ are
**isomorphic**, written $G_1\cong G_2$, if there is a bijection $f\colon V_1\to V_2$ such that
for all $v_i,v_j\in V_1$,
$$(v_i,v_j)\in E_1\iff(f(v_i),f(v_j))\in E_2,$$
and $(v_i,v_j)$ and $(f(v_i),f(v_j))$ have the same multiplicity. Isomorphism of directed
graphs is defined the same way, with ordered pairs $\langle v_i,v_j\rangle$. (Definition
5.2.2 in the textbook.)
:::

The bijection renames vertices (a bijection is a one-to-one correspondence, Lesson 3.2);
the condition says the renaming carries edges to edges and non-edges to non-edges, with
the same number of parallel edges. Positions, crossings and edge shapes don't enter.

::: example Checking an isomorphism
Show that Graph 1 and Graph 2 above are isomorphic.
== Choose the bijection ==
$f(c)=g$, $f(a)=f$, $f(b)=h$, $f(d)=e$: one-to-one and onto $\{e,f,g,h\}$.
== Edges go to edges ==
$(a,b)\mapsto(f,h)\in E_2$, $(a,c)\mapsto(f,g)\in E_2$, $(b,d)\mapsto(h,e)\in E_2$.
== Non-edges go to non-edges ==
Both graphs have 3 edges, and $f$ maps the 3 edges of $E_1$ onto 3 different edges of
$E_2$, so the other pairs (non-edges) must map to non-edges. All multiplicities are 1.
So $G_1\cong G_2$.
:::

Isomorphism is an **equivalence relation** on graphs (Lesson 2.6): every graph is
isomorphic to itself (the identity map), the inverse of an isomorphism is one, and two
isomorphisms compose to one. Each equivalence class can be thought of as **one graph**
drawn in different ways: the unlabelled graphs of Lesson 4.1.

### The Petersen graph

A famous example is the {{term Petersen graph | 彼得松图}} (the slides spell it
"Peterson"): 10 vertices, 15 edges, every vertex of degree 3. The usual drawing is a
pentagon outside, a five-pointed star inside, and five spokes between them. The slides
show two more, very different-looking drawings (one hexagon-shaped, one with long curved
arcs round an inner pentagon); all three are isomorphic. It is a favourite
counterexample in graph theory and comes back with Hamilton graphs (Lesson 5.2).

::: graph The Petersen graph (Figure 5.2.2 (a))
at o1: 180, 25
at o2: 285, 101
at o3: 245, 224
at o4: 115, 224
at o5: 75, 101
at i1: 180, 85
at i2: 228, 120
at i3: 209, 175
at i4: 151, 175
at i5: 132, 120
o1 -- o2, o2 -- o3, o3 -- o4, o4 -- o5, o5 -- o1
o1 -- i1, o2 -- i2, o3 -- i3, o4 -- i4, o5 -- i5
i1 -- i3, i3 -- i5, i5 -- i2, i2 -- i4, i4 -- i1
:::

### Proving two graphs are *not* isomorphic

To show $G_1\cong G_2$ you exhibit a bijection. To show $G_1\not\cong G_2$ you'd have to rule
out all $n!$ bijections, which nobody does by hand. Instead, find a property that every
isomorphism preserves, an **invariant**, on which the two graphs differ. Isomorphic graphs
have:
- the same number of vertices and the same number of edges;
- the same degree sequence (after sorting), and for digraphs the same sorted in- and
  out-degree sequences;
- the same number of loops, of parallel edges, of triangles, of cycles of each length…

These are **necessary** conditions only. No simple necessary-and-sufficient condition for
isomorphism has been found.

::: callout pitfall Same degrees don't mean isomorphic
Figures 5.2.1 (a) and (b) above both have degree sequence $(4,4,3,3,2,2)$, but they are
not isomorphic. In (a) the two vertices of degree 4 ($c$ and $f$) are adjacent, and so are
the two of degree 2 ($d$ and $e$). In (b) the degree-2 vertices $a$ and $d$ are not
adjacent. An isomorphism maps degree-2 vertices to degree-2 vertices and edges to edges,
so it can't exist.
:::

::: example Three directed 4-cycles that are not isomorphic (Figure 5.2.2 (d)–(f))
Each graph below has 4 vertices on a diamond and 4 arcs along its sides; only the
directions differ. Show no two are isomorphic.
== (d) ==
Arcs top→left→bottom→right→top: a directed cycle. Out-degrees $1,1,1,1$.
== (e) ==
Arcs top→left, top→right, left→bottom, bottom→right. Out-degrees (sorted) $2,1,1,0$.
== (f) ==
Arcs top→left, top→right, bottom→left, bottom→right. Out-degrees $2,2,0,0$.
== Conclusion ==
The sorted out-degree sequences differ, and an isomorphism of digraphs keeps out-degrees,
so no two of them are isomorphic, although their underlying graphs are all the same
4-cycle.
:::

::: graph (d): a directed 4-cycle
at t: 180, 30
at l: 70, 130
at b: 180, 230
at r: 290, 130
t -> l, l -> b, b -> r, r -> t
show: degrees
:::

::: graph (f): two sources and two sinks
at t: 180, 30
at l: 70, 130
at b: 180, 230
at r: 290, 130
t -> l, t -> r, b -> l, b -> r
show: degrees
:::

::: example Four digraphs: which two are isomorphic? (in class)
The slide shows four directed graphs drawn on pentagons and asks which two are
isomorphic. The first three have 5 vertices and 7 arcs each; label the pentagon's
corners T (top), R, BR, BL, L.
- First: L→T, T→R, R→L, R→BR, BL→L, BL→BR, L→BR.
- Second: L→T, R→T, BR→T, R→BR, L→BL, L→BR, BL→BR.
- Third: T→L, T→BL, T→R, L→BL, R→BL, BR→BL, BR→R.
- Fourth: drawn with six vertices (two close together on the left) and 9 arcs.
== Out- and in-degrees ==
| Graph | Sorted out-degrees | Sorted in-degrees |
| --- | --- | --- |
| First | 2, 2, 2, 1, 0 | 3, 2, 1, 1, 0 |
| Second | 3, 2, 1, 1, 0 | 3, 3, 1, 0, 0 |
| Third | 3, 2, 1, 1, 0 | 4, 2, 1, 0, 0 |
== Compare ==
Every pair among the first three differs in its out- or in-degree sequence, and the fourth
has a different number of vertices. **None is isomorphic to another** (the slide's
answer: 没有同构的).
:::

### Ulam's conjecture

::: define Ulam's conjecture | 乌拉姆猜想
Let $G=\langle V,E\rangle$ and $H=\langle U,F\rangle$ be simple undirected graphs with
$V=\{v_1,\dots,v_p\}$, $U=\{u_1,\dots,u_p\}$, $p\ge3$. If $G-v_i\cong H-u_i$ for **every**
$i$, then $G\cong H$.
:::

In words: a graph with at least 3 vertices is determined, up to isomorphism, by the
collection of graphs you get by deleting one vertex at a time (the "reconstruction
conjecture"). It has been checked for many classes of graphs and all small graphs, but it
is still unproved, a sign of how hard isomorphism is in general.

## Counting non-isomorphic graphs

"How many graphs are there?" has two answers: labelled graphs (every vertex set counted
separately, Lesson 4.1) and graphs **up to isomorphism**, where all drawings of the same
shape count once.

::: example Simple graphs on 3 vertices, and simple digraphs on 2
How many non-isomorphic simple undirected graphs have 3 vertices? How many
non-isomorphic simple directed graphs have 2 vertices?
== Undirected, 3 vertices ==
The 8 labelled graphs on $\{a,b,c\}$ (Lesson 4.1) have 0, 1, 1, 1, 2, 2, 2 or 3 edges. Graphs
with the same number of edges here are isomorphic (any single edge looks like any other,
any two edges form a path), so there are **4**: no edge, one edge, a path of two edges,
the triangle.
== Directed, 2 vertices ==
No loops, no parallel arcs: the possible arcs are $\langle a,b\rangle$ and
$\langle b,a\rangle$, giving 4 labelled digraphs: none, $a\to b$, $b\to a$, both. The two
with one arc are isomorphic (swap $a$ and $b$), so there are **3**.
:::

::: example Example 5.2.2 ①: 4 vertices, 3 edges, undirected
Draw all non-isomorphic simple undirected graphs with 4 vertices and 3 edges.
== Degrees ==
The degrees add up to $2\times3=6$; each is at most $n-1=3$, and the number of odd ones is
even.
== Split 6 into 4 such parts ==
Up to order: $3,1,1,1$; $2,2,1,1$; $2,2,2,0$. ($3,2,1,0$ has two odd parts but can't be
realised: the vertex of degree 3 is adjacent to all others, so none has degree 0.)
== One graph for each ==
$3,1,1,1$: a **star**, one vertex joined to the other three. $2,2,1,1$: a **path** of three
edges. $2,2,2,0$: a **triangle** plus an isolated vertex. Each sequence has only one graph
up to isomorphism, so there are **3**.
:::

::: graph The three graphs: star (s), path (p) and triangle plus isolated vertex (t)
row: s1 p1 p2 t1
row: s2 s3 s4 p3 p4 t2 t3 t4
s1 -- s2, s1 -- s3, s1 -- s4
p1 -- p2, p2 -- p4, p4 -- p3
t1 -- t2, t2 -- t3, t3 -- t1
:::

::: example Example 5.2.2 ②: 3 vertices, 2 arcs, directed
Draw all non-isomorphic simple directed graphs with 3 vertices and 2 arcs.
== Degrees ==
By the handshake theorem the degrees add up to 4; each out- and in-degree is at most 2.
The degree sequence (up to order) is $1,2,1$ or $2,2,0$.
== Degree sequence $1,2,1$ ==
The middle vertex has degree 2, the others 1: the two arcs share one vertex. Three ways
to direct them:
1. in-degrees $0,1,1$, out-degrees $1,1,0$: a directed path $x\to y\to z$;
2. in-degrees $0,2,0$, out-degrees $1,0,1$: both arcs **into** the middle, $x\to y\leftarrow z$;
3. in-degrees $1,0,1$, out-degrees $0,2,0$: both arcs **out of** the middle,
   $x\leftarrow y\to z$.
== Degree sequence $2,2,0$ ==
Both arcs join the same two vertices; they can't be parallel, so they point opposite
ways: $x\rightleftarrows y$, with $z$ isolated (in- and out-degrees $1,1,0$).
== Answer ==
**4** non-isomorphic digraphs (they differ in their in- and out-degree sequences).
:::

::: callout pitfall Labelled count vs. isomorphism count
"How many simple graphs on $\{v_1,\dots,v_n\}$?" counts labelled graphs: $2^{n(n-1)/2}$
(8 for $n=3$). "How many simple graphs with $n$ vertices, isomorphic ones counted once?"
is a much smaller number (4 for $n=3$). Read which one the question asks (同构的算一种 =
"isomorphic ones count as one").
:::

::: cards Degrees and isomorphism
Degree $d(v)$ (度数) :: The number of times $v$ is an endpoint of an edge; a loop counts 2.
Out-degree and in-degree :: $d^+(v)$: arcs starting at $v$; $d^-(v)$: arcs ending at $v$; $d(v)=d^+(v)+d^-(v)$.
Symbols $\Delta$ and $\delta$ :: Maximum and minimum degree; $\Delta^\pm$, $\delta^\pm$ for out- and in-degrees.
Pendant vertex (悬挂顶点) :: A vertex of degree 1; its edge is a pendant edge.
Handshake theorem (握手定理) :: $\sum_v d(v)=2m$; for digraphs also $\sum d^+(v)=\sum d^-(v)=m$.
Corollary of the handshake theorem :: Every graph has an even number of odd vertices.
Graphic sequence (可图化) :: Non-negative integers are the degrees of some graph (loops and parallel edges allowed) iff their sum is even.
Maximum degree of a simple graph of order $n$ :: $\Delta\le n-1$.
Two equal degrees :: Every simple graph with at least 2 vertices has two vertices of the same degree.
Isomorphism (同构) :: A bijection of the vertex sets that maps edges to edges and non-edges to non-edges, keeping multiplicities.
Invariants for isomorphism :: Same numbers of vertices and edges, same sorted degree sequence (in/out for digraphs); necessary, not sufficient.
Petersen graph (彼得松图) :: 10 vertices, 15 edges, every degree 3: a pentagon, a pentagram and five spokes.
Ulam's conjecture (乌拉姆猜想) :: Simple graphs with $p\ge3$ vertices whose one-vertex-deleted subgraphs match ($G-v_i\cong H-u_i$) are isomorphic; unproved.
Non-isomorphic simple graphs on 3 vertices :: 4: no edge, one edge, a path of two edges, a triangle.
:::

::: quiz Check yourself
? A sequence $d=(d_1,\dots,d_n)$ of non-negative integers is (simple-)graphic if some (simple) undirected graph on $n$ vertices has $d(v_i)=d_i$. Which sequence is simple-graphic?
- [x] $(1,1,1,2,3)$
- [ ] $(1,2,2,3,4,5)$
- [ ] $(1,3,3,3)$
- [ ] $(1,3,3,4,5,6,6)$
> B's sum is 17, odd: not even graphic. C: three vertices of degree 3 among 4 are joined to everything, so the fourth would have degree 3, not 1. D: Havel–Hakimi $6,6,5,4,3,3,1\to5,4,3,2,2,0\to3,2,1,1,-1$ fails (two vertices of degree 6 among 7 are joined to all, so nobody has degree below 2). A: a vertex of degree 3 joined to the vertices of degree 2, 1, 1, plus an edge from the degree-2 vertex to the last vertex. Answer A (in-class question).

? An undirected graph has 6 edges, one vertex of degree 3, one of degree 5, and every other vertex has degree 2. How many vertices does it have?
answer: 2 + (2*6 - 3 - 5)/2
> $\sum d(v)=12$; $12-3-5=4$ is shared by vertices of degree 2, so there are 2 of them: $1+1+2=4$ vertices.

? A graph has 12 edges and every vertex has degree 3. How many vertices does it have?
answer: 2*12/3
> $3n=2\times12=24$, so $n=8$.

? Which sequences are graphic (loops and parallel edges allowed)? (tick all)
- [ ] $(2,2,2,3,3,3)$
- [x] $(2,2,2,3,3,6)$
- [x] $(2,2,2,2,3,3)$
- [x] $(5,4,3,2,2)$
> Graphic iff the sum is even: 15 (no), 18, 14, 16 (yes).

? Which of these sequences are simple-graphic? (tick all)
- [ ] $(2,2,2,3,3,6)$
- [x] $(2,2,2,2,3,3)$
- [ ] $(5,4,3,2,2)$
- [x] $(4,4,3,3,2,2)$
> $(2,2,2,3,3,6)$ and $(5,4,3,2,2)$ break $\Delta\le n-1$. $(2,2,2,2,3,3)$ is a 6-cycle with one chord; $(4,4,3,3,2,2)$ is figure 5.2.1.

? In the directed example $D$ (loop at $a$, two arcs $a\to b$, $a\to d$, $c\to b$, $d\to c$, $c\to d$), what is $\delta^+(D)$, the minimum out-degree?
answer: 0
> $b$ has three arcs in and none out: $d^+(b)=0$.

? Is every sequence of distinct integers $d_1>d_2>\cdots>d_n\ge1$ with an even sum simple-graphic?
- [ ] Yes, an even sum is enough
- [x] No: a simple graph with $n\ge2$ vertices always has two equal degrees
- [ ] Only when $d_1\le n-1$
> The sum being even makes it graphic, but not simple-graphic: the $n$ degrees of a simple graph take at most $n-1$ different values (0 and $n-1$ can't both occur). Even $d_1\le n-1$ doesn't help.

? How many non-isomorphic simple undirected graphs have 4 vertices and 3 edges?
answer: 3
> Degree sequences $3,1,1,1$ (star), $2,2,1,1$ (path), $2,2,2,0$ (triangle plus an isolated vertex), one graph each (Example 5.2.2).

? How many non-isomorphic simple directed graphs have 3 vertices and 2 arcs?
answer: 4
> Directed path, two arcs into one vertex, two arcs out of one vertex, and a pair of opposite arcs with an isolated vertex.

? Two graphs have the same number of vertices, the same number of edges and the same degree sequence. Are they isomorphic?
- [ ] Yes, always
- [x] Not necessarily
- [ ] Never
> These are necessary conditions only: the two graphs of figure 5.2.1 share the degree sequence $(4,4,3,3,2,2)$ but aren't isomorphic.
:::

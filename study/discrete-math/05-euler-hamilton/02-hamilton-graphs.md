---
title: Hamilton graphs
zh: 哈密顿图
summary: Hamilton paths and cycles, Hamiltonian and semi-Hamiltonian graphs, the necessary condition p(G − V₁) ≤ |V₁| and what it says about bipartite graphs, the degree-sum sufficient conditions (with the proof), Hamilton paths in tournaments, and the Chinese postman and travelling salesman problems.
source: 图6 图论(4) 欧拉图与哈密顿图 (§6.2 哈密顿图, 中国邮递员问题, 货郎担问题), 2026-10-15
---

Lesson 5.1 asked for a walk through every **edge** exactly once. Swap "edge" for
"vertex" and you get a question that looks almost the same but behaves completely
differently: is there a cycle that visits every **vertex** exactly once? It is the
question of a tour that calls at every city once, of seating people around a table so
neighbours get along, of ranking players from a round-robin. For Euler circuits one look
at the degrees settles everything; for Hamilton cycles no such simple test is known.
Instead this lesson gives a **necessary** condition (to prove a graph is *not*
Hamiltonian) and **sufficient** conditions (to prove it *is*), and it ends with two
famous route problems, one for each kind of graph.

## Hamilton paths and cycles

In 1859 the Irish mathematician William Rowan Hamilton sold a puzzle, the "Icosian game":
travel along the edges of a dodecahedron and visit each of its 20 corners exactly once,
returning to the start. In graph terms: does the graph have a **spanning cycle**
(生成圈) — a cycle through all its vertices? Or at least a **spanning path** (生成路)?

::: graph A spanning cycle: the hexagon a b c d e f a (the chord b–e isn't needed)
a -- b, b -- c, c -- d, d -- e, e -- f, f -- a, b -- e
highlight: a b c d e f a
:::

::: graph The bowtie: a spanning path a b c d e, but no spanning cycle
at a: 60, 50
at b: 60, 210
at c: 180, 130
at d: 300, 50
at e: 300, 210
a -- b, a -- c, b -- c, c -- d, c -- e, d -- e
highlight: a b c d e
:::

Why has the bowtie no spanning cycle? A cycle through all five vertices would have to
pass through $c$ twice — once for each triangle — and a cycle visits each vertex only
once. Yet the same bowtie *is* Eulerian (Lesson 5.1). The two questions really are
different.

::: define Hamilton path and Hamilton cycle | 哈密顿通路与哈密顿回路
In a graph (directed or undirected), a {{term Hamilton path | 哈密顿通路}} is a path
that passes through **every vertex exactly once**. A {{term Hamilton cycle | 哈密顿回路}}
is a cycle that passes through every vertex exactly once. (Definition 6.2.1 in the
textbook.)
:::

Since no vertex repeats, a Hamilton path is a path (初级通路) and a Hamilton cycle is a
cycle (圈) in the sense of Lesson 4.3; on $n$ vertices they have $n-1$ and $n$ edges.
They need not use every edge.

::: define Hamiltonian and semi-Hamiltonian graphs | 哈密顿图与半哈密顿图
A graph with a Hamilton cycle is a {{term Hamiltonian graph | 哈密顿图}}. A graph with
a Hamilton path but **no** Hamilton cycle is a
{{term semi-Hamiltonian graph | 半哈密顿图}}.
:::

The slides show the hexagon with its chord twice: with the red hexagon it is a
Hamiltonian graph; with the red path $c\,b\,a\,f\,e\,d$ highlighted, it shows a
Hamilton path. (That graph has a Hamilton cycle too, so it is Hamiltonian; the second
picture only illustrates what a Hamilton path looks like.)

::: callout pitfall Euler or Hamilton?
**Euler**: every **edge** exactly once (vertices may repeat). **Hamilton**: every
**vertex** exactly once (edges may be left out). Mnemonic: *E*uler — *E*dges. The two
properties are independent: the bowtie is Eulerian but not Hamiltonian; $K_4$ is
Hamiltonian but not Eulerian (all degrees 3); the hexagon is both; a path graph
($a$–$b$–$c$) is semi-both.
:::

## Small examples

The slides look at Lesson 5.1's six graphs (a)–(f) again with Hamilton in mind: each
rectangle is a 4-cycle, so (a), (b), (c) and the directed 4-cycle (d) are Hamiltonian
(the loop and the diagonals are simply not used). In (e) and (f), as Lesson 5.1 noted,
some vertex has no arc out (or in), so no directed cycle can pass through it; (e) still
has the Hamilton path $a\to b\to d\to c$, while in (f) $a$ can only end a path and
$b$, $d$ can only start one — two starting points, so (f) has no Hamilton path at all.

Then three new graphs.

::: graph G₁: Hamilton cycle a b c d e a
at a: 100, 40
at b: 260, 40
at e: 100, 150
at c: 260, 150
at d: 180, 230
a -- b, a -- e, b -- c, e -- c, a -- c, b -- e, e -- d, c -- d
highlight: a b c d e a
show: degrees
:::

::: graph G₂: a Hamilton path a b c d, no Hamilton cycle
a -- b, b -- c, b -- d, d -- c
highlight: a b c d
show: degrees
:::

::: graph G₃: no Hamilton path at all
row: a b g
row: d c e f
a -- b, b -- g, d -- c, c -- e, e -- f, b -- c, g -- e
show: degrees
:::

::: example What the three graphs teach
== G₁ ==
$a\,b\,c\,d\,e\,a$ uses the edges $ab$, $bc$, $cd$, $de$, $ea$ and visits all five vertices:
**Hamiltonian**.
== G₂ ==
$a$ has degree 1. On a Hamilton cycle every vertex needs two cycle edges, so there is
none. But $a\,b\,c\,d$ is a Hamilton path: **semi-Hamiltonian**.
== G₃ ==
$a$, $d$ and $f$ all have degree 1. A degree-1 vertex can only be an *end* of a Hamilton
path, and a path has two ends: **no Hamilton path** (and no cycle).
== The lesson ==
1. A Hamiltonian graph is connected, and every vertex has degree at least 2.
2. A graph with a Hamilton path is connected and has at most two vertices of degree 1.
:::

These are quick tests, but only in one direction: passing them proves nothing.

## A necessary condition: deleting vertices

**The idea.** Think of a Hamilton cycle as a necklace through every vertex. Cut out $k$
beads (vertices): the necklace falls into at most $k$ pieces. The graph has *at least*
the necklace's edges, so it, too, falls into at most $k$ pieces. If deleting some $k$
vertices shatters a graph into **more** than $k$ components, it cannot be Hamiltonian.

Here $p(\cdot)$ is the number of components and $G-V_1$ is $G$ with the vertices of
$V_1$ and their edges deleted (Lessons 4.1 and 4.4).

::: theorem Necessary condition for Hamiltonian graphs | 哈密顿图的必要条件
If the undirected graph $G=\langle V,E\rangle$ is Hamiltonian, then for every non-empty
$V_1\subset V$,
$$p(G-V_1)\le|V_1|.$$
(Theorem 6.2.1 in the textbook.)
:::

**Proof.** Let $C$ be a Hamilton cycle of $G$.

1. Delete the vertices of $V_1$ from the cycle $C$. If no two of them are neighbours on
   $C$, the cycle breaks into exactly $|V_1|$ arcs: $p(C-V_1)=|V_1|$, the most possible.
   If some of them are neighbours on $C$, fewer pieces appear: $p(C-V_1)<|V_1|$. Either
   way $p(C-V_1)\le|V_1|$.
2. $C$ is a spanning subgraph of $G$ (same vertices, fewer edges), so $C-V_1$ is a
   spanning subgraph of $G-V_1$. Adding edges can only join components, so
   $p(G-V_1)\le p(C-V_1)\le|V_1|$. ∎

::: theorem Necessary condition for semi-Hamiltonian graphs | 半哈密顿图的必要条件
If the undirected graph $G=\langle V,E\rangle$ is semi-Hamiltonian, then for every
non-empty $V_1\subset V$,
$$p(G-V_1)\le|V_1|+1.$$
(Corollary 6.2.1 in the textbook; proof omitted on the slides.)
:::

The reason for the $+1$: cutting $k$ beads out of an open *string* (a Hamilton path)
can leave $k+1$ pieces.

::: graph The 2×4 ladder: Hamiltonian, and deleting V₁ = {b, e, g} leaves 3 components
row: a b h g
row: d c e f
a -- b, b -- h, h -- g, d -- c, c -- e, e -- f, a -- d, b -- c, h -- e, g -- f
highlight: a b h g f e c d a
:::

::: example Checking Theorem 6.2.1 on the ladder
The slide's ladder has top row $a,b,h,g$ and bottom row $d,c,e,f$. Take $V_1=\{b,e,g\}$.
== Delete b, e, g ==
What is left: $a$–$d$–$c$ (one component), $h$ (its neighbours $b$, $g$, $e$ are all gone)
and $f$ (neighbours $g$, $e$ gone). So $p(G-V_1)=3$.
== Compare ==
$3\le|V_1|=3$: the condition holds, just barely. Checking all $2^8-2$ proper subsets
shows it never fails here, consistent with the ladder being Hamiltonian: the
highlighted cycle $a\,b\,h\,g\,f\,e\,c\,d\,a$ goes round the outside.
:::

::: callout pitfall Only necessary, never sufficient
Theorem 6.2.1 can only prove a graph is **not** Hamiltonian (find a $V_1$ that breaks
it). A graph can pass it for every $V_1$ and still have no Hamilton cycle: the Petersen
graph (Lesson 4.3) is the classic example. Passing the test proves nothing.
:::

## Hamilton graphs and bipartite graphs

For bipartite graphs (Lesson 4.5) the theorem becomes a quick count. A Hamilton cycle in
a bipartite graph alternates between the two sides, so it must use equally many vertices
from each. The theorem gives this directly: delete the smaller side.

::: example Example 6.2.1: is K₂,₄ Hamiltonian?
The graph $G_1=\langle V_1,V_2,E\rangle$ has $V_1=\{a,f\}$ and $V_2=\{b,c,d,e\}$, every
vertex of $V_1$ joined to every vertex of $V_2$ — the complete bipartite graph
$K_{2,4}$. Is it Hamiltonian? Semi-Hamiltonian?
== Delete V₁ ==
Removing $a$ and $f$ removes every edge, leaving the four isolated vertices of $V_2$:
$p(G-V_1)=|V_2|=4$.
== Hamiltonian? ==
$4>|V_1|=2$, so by Theorem 6.2.1 it is **not** Hamiltonian.
== Semi-Hamiltonian? ==
$4>|V_1|+1=3$, so by Corollary 6.2.1 it is **not** semi-Hamiltonian either: no Hamilton
path.
:::

::: graph K₂,₄: Eulerian (degrees 4 and 2) but not even semi-Hamiltonian
row: a
row: b c d e
row: f
a -- b, a -- c, a -- d, a -- e, f -- b, f -- c, f -- d, f -- e
show: degrees
:::

::: theorem Hamilton cycles in bipartite graphs | 哈密顿图与二部图
Let $G=\langle V_1,V_2,E\rangle$ be bipartite with $|V_1|\le|V_2|$, $|V_1|\ge2$ and
$|V_2|\ge2$. Then:
1. if $G$ is Hamiltonian, $|V_2|=|V_1|$;
2. if $G$ is semi-Hamiltonian, $|V_2|=|V_1|$ or $|V_2|=|V_1|+1$;
3. if $|V_2|\ge|V_1|+2$, $G$ is neither Hamiltonian nor semi-Hamiltonian.

(Note 6.2.1 in the textbook, from Theorem 6.2.1 and Corollary 6.2.1 with the set $V_1$
deleted: then $p(G-V_1)=|V_2|$, since $V_2$ has no edges inside it.)
:::

::: callout pitfall The converse fails
Equal sides don't make a bipartite graph Hamiltonian — a perfectly balanced bipartite
graph can still be disconnected, or have a vertex of degree 1. Note 6.2.1 only rules
graphs **out**.
:::

## Sufficient conditions: enough edges

**The idea.** If every vertex has plenty of neighbours, a spanning path or cycle can't
be avoided. "Plenty" is measured pairwise: for any two vertices that are *not* adjacent,
their degrees add up to a lot. (Two adjacent vertices are already joined, so they don't
need the help.)

::: theorem Degree-sum condition for a Hamilton path | 哈密顿通路的充分条件
Let $G$ be a simple undirected graph with $n$ vertices. If every two non-adjacent
vertices $u$, $v$ satisfy
$$d(u)+d(v)\ge n-1, \qquad (6.2.1)$$
then $G$ has a Hamilton path. (Theorem 6.2.2 in the textbook.)
:::

The proof is long, but its plan is short: (1) $G$ is connected; (2) take a longest path
$\Gamma$; if it misses some vertex, (3) bend $\Gamma$ into a cycle through the same
vertices, then (4) open the cycle next to a missed vertex to get a longer path — a
contradiction.

**Step 1: $G$ is connected.** Suppose not, and let $G_1$, $G_2$ be two components with
$n_1$ and $n_2$ vertices; pick $u\in V(G_1)$, $v\in V(G_2)$. They aren't adjacent, and
in a simple graph $u$ has at most $n_1-1$ neighbours and $v$ at most $n_2-1$, so
$$d(u)+d(v)\le(n_1-1)+(n_2-1)\le n-2,$$
contradicting (6.2.1).

**Step 2: a longest path.** Let $\Gamma=v_1v_2\cdots v_l$ be a longest path ($l$
vertices, $l\le n$). Its ends $v_1$ and $v_l$ have no neighbours off $\Gamma$ —
otherwise $\Gamma$ could be extended. If $l=n$, $\Gamma$ is a Hamilton path and we are
done. So assume $l<n$.

**Step 3: a cycle through all of $\Gamma$'s vertices.**

(a) If $v_1$ and $v_l$ are adjacent, $\Gamma$ plus the edge $(v_1,v_l)$ is such a cycle.

(b) Otherwise, let $v_1$'s neighbours be $v_{i_1},v_{i_2},\dots,v_{i_k}$ with
$2=i_1<i_2<\dots<i_k$ (all on $\Gamma$, $k=d(v_1)$). The trick: if $v_l$ is adjacent to
$v_{i_r-1}$, the vertex just *before* some neighbour $v_{i_r}$ of $v_1$, then
$$C=v_1v_2\cdots v_{i_r-1}\,v_l v_{l-1}\cdots v_{i_r}\,v_1$$
is a cycle through every vertex of $\Gamma$: go along $\Gamma$ to $v_{i_r-1}$, jump to
$v_l$, come back along $\Gamma$ to $v_{i_r}$, and jump home to $v_1$ (Figure 6.2.1(a)).

Such an $r$ must exist. First $k\ge2$: if $k=1$, then $d(v_1)+d(v_l)\le1+(l-2)=l-1<n-1$
(as $v_l$'s neighbours lie on $\Gamma$, excluding itself and $v_1$), contradicting
(6.2.1). Now if $v_l$ were adjacent to none of $v_{i_2-1},\dots,v_{i_k-1}$ — nor to
$v_{i_1-1}=v_1$, by (b) — then $v_l$ misses these $k$ vertices and itself, so
$d(v_l)\le l-1-k$ and
$$d(v_1)+d(v_l)\le k+(l-1-k)=l-1<n-1,$$
contradicting (6.2.1) again.

::: graph Step 3 on a concrete path v1…v7: v1 ~ v4 and v7 ~ v3 give the cycle v1 v2 v3 v7 v6 v5 v4 v1
at v1: 30, 180
at v2: 80, 120
at v3: 130, 90
at v4: 180, 80
at v5: 230, 90
at v6: 280, 120
at v7: 330, 180
v1 -- v2, v2 -- v3, v3 -- v4, v4 -- v5, v5 -- v6, v6 -- v7, v1 -- v4, v7 -- v3
highlight: v1 v2 v3 v7 v6 v5 v4 v1
:::

In the picture $v_1$ is adjacent to $v_{i_r}=v_4$ and $v_7=v_l$ to $v_{i_r-1}=v_3$; the
cycle drops the path edge $v_3v_4$ and uses the two "jumps" instead.

**Step 4: a longer path.** Since $l<n$ and $G$ is connected, some vertex $v_{l+1}$ off
$C$ is adjacent to a vertex $v_t$ on $C$. Open the cycle $C$ by deleting one of its two
edges at $v_t$; this leaves a path through all $l$ vertices of $C$ that *ends* at $v_t$.
Append the edge $v_tv_{l+1}$: a path with $l+1$ vertices. (The slides do this case by
case; for $t<i_r-1$ they delete the edge $(v_{t-1},v_t)$ to get
$\Gamma'=v_{t-1}\cdots v_1v_{i_r}\cdots v_lv_{i_r-1}\cdots v_tv_{l+1}$, Figure 6.2.1(b).)
This contradicts $\Gamma$ being longest, so in fact $l=n$ and $\Gamma$ is a Hamilton path.
∎

Raising the bound by one closes the path into a cycle.

::: theorem Degree-sum condition for a Hamilton cycle | 哈密顿回路的充分条件
Let $G$ be a simple undirected graph with $n\ge3$ vertices. If every two non-adjacent
vertices $u$, $v$ satisfy
$$d(u)+d(v)\ge n, \qquad (6.2.2)$$
then $G$ has a Hamilton cycle. (Corollary 6.2.2 in the textbook; in English books, Ore's
theorem.)
:::

**Proof.** (6.2.2) implies (6.2.1), so by Theorem 6.2.2 there is a Hamilton path
$\Gamma=v_1v_2\cdots v_n$.

1. If $v_1$ and $v_n$ are adjacent, $\Gamma$ plus the edge $e=(v_1,v_n)$ is a Hamilton
   cycle.
2. Otherwise let $v_1$'s neighbours be $v_{i_1}=v_2,\dots,v_{i_k}$ ($k=d(v_1)$). If $v_n$
   is adjacent to some $v_{i_r-1}$, then $v_1v_2\cdots v_{i_r-1}v_nv_{n-1}\cdots v_{i_r}v_1$
   is a Hamilton cycle, exactly as in Step 3.
3. If not, $v_n$ misses those $k$ vertices and itself: $d(v_n)\le n-1-k$, so
   $d(v_1)+d(v_n)\le n-1$, contradicting (6.2.2). ∎

::: callout pitfall Sufficient, not necessary
The hexagon $C_6$ is Hamiltonian, yet two opposite corners are non-adjacent with
$d(u)+d(v)=2+2=4<6$. Failing (6.2.2) proves nothing; meeting it proves a Hamilton cycle
exists. (Compare Theorem 6.2.1, which works the other way round.) Also note the
conditions are about **non-adjacent** pairs only, and need a **simple** graph.
:::

A sharper version lets you add edges one at a time:

::: theorem Adding an edge between high-degree vertices | 加边定理
Let $u$, $v$ be non-adjacent vertices of a simple undirected graph $G$ with $n$ vertices,
and $d(u)+d(v)\ge n$. Then $G$ is Hamiltonian if and only if $G\cup(u,v)$ (with the new
edge $(u,v)$ added) is Hamiltonian. (Theorem 6.2.3 in the textbook; proof omitted.)
:::

So you may keep joining non-adjacent pairs whose degree sum is at least $n$ (recounting
degrees after each addition) without changing the answer; if you reach a graph you
know is Hamiltonian — $K_n$, say — so was the original. Corollary 6.2.2 is the special
case where every missing edge can be added at once.

::: example Example 6.2.2: seating a conference
Eight people attend an international conference. For any two of them who share no
language, the number of the others each of them can talk to adds up to at least 8.
Show that they can be seated around a round table so that everyone can talk to both
neighbours.
== Model ==
Vertices: the 8 people. Edges: pairs who share a language. This is a simple graph with
$n=8$, and $d(v)$ is the number of people $v$ can talk to.
== Check the condition ==
"Two people with no common language" means two non-adjacent vertices $u$, $v$; we are
told $d(u)+d(v)\ge8=n$. That is (6.2.2), and $n=8\ge3$.
== Conclude ==
By Corollary 6.2.2 the graph has a Hamilton cycle $v_1v_2\cdots v_8v_1$. Seat the people
round the table in that order: each pair of neighbours is an edge, so they share a
language.
:::

## The in-class question: bipartite, Euler, Hamilton

::: graph The in-class graph G: a chain of three diamonds
at L: 20, 130
at t1: 70, 70
at b1: 70, 190
at m1: 120, 130
at t2: 170, 70
at b2: 170, 190
at m2: 220, 130
at t3: 270, 70
at b3: 270, 190
at R: 320, 130
L -- t1, L -- b1, t1 -- m1, b1 -- m1, m1 -- t2, m1 -- b2, t2 -- m2, b2 -- m2, m2 -- t3, m2 -- b3, t3 -- R, b3 -- R
highlight: L t1 m1 t2 m2 t3 R b3 m2 b2 m1 b1 L
show: degrees
:::

::: example Is G bipartite? Eulerian? Hamiltonian?
== Bipartite (偶图)? ==
Put $V_1=\{L,m_1,m_2,R\}$ (the corners where the diamonds meet, and the two ends) and
$V_2=\{t_1,b_1,t_2,b_2,t_3,b_3\}$. Every edge joins $V_1$ to $V_2$: **yes**.
== Eulerian? ==
Connected; degrees are 2 everywhere except $d(m_1)=d(m_2)=4$. No odd vertex, so by
Theorem 6.1.1 **yes** — the highlighted Euler circuit
$L\,t_1\,m_1\,t_2\,m_2\,t_3\,R\,b_3\,m_2\,b_2\,m_1\,b_1\,L$ uses all 12 edges.
== Hamiltonian? ==
$|V_1|=4$, $|V_2|=6\ge|V_1|+2$. By Note 6.2.1 (3), $G$ is not even semi-Hamiltonian:
**no**. (Directly: deleting $V_1$ leaves 6 isolated vertices, and $6>4$.)
== Answer ==
Yes, yes, no — option B (Rain Classroom's answer).
:::

## Tournaments

A tournament (竞赛图, Lesson 4.3) is a directed graph with exactly one arc between every
two vertices. Think of a round-robin: every two players meet once, and the arc points
from the winner to the loser.

::: graph A tournament on four players: c beats everyone; the Hamilton path c a b d
at a: 100, 60
at b: 260, 60
at c: 100, 200
at d: 260, 200
a -> b, b -> d, c -> a, c -> b, c -> d, d -> a
highlight: c a b d
show: degrees
:::

The slide also shows a non-example: arcs $a\to b$, $c\to a$ and two opposite arcs between
$b$ and $d$. It is not a tournament: $b$ and $d$ are joined twice, and the pairs $a,d$;
$b,c$; $c,d$ not at all.

A Hamilton path in a tournament lists all the players so that **each one beat the next**:
a ranking consistent with at least those games. Amazingly, one always exists.

::: theorem Tournaments have Hamilton paths | 竞赛图中的哈密顿通路
Every tournament with $n\ge2$ vertices has a Hamilton path. (Theorem 6.2.4 in the
textbook.)
:::

**The idea.** Take a longest directed path. A player $v$ left out can't beat the first
player on it (or $v$ could go in front), so the first player beat $v$; then $v$ can't
beat the second either (or $v$ could slot in between) … and so on down to the last
player, who beat $v$ — so $v$ can go at the end. Either way the path gets longer.

**Proof.** Let $D=(V,A)$ be a tournament with $p$ vertices and let
$P=v_1v_2\cdots v_k$ be a longest directed path. Suppose $k<p$, so some $v\in V$ is not
on $P$.

1. If $(v,v_1)\in A$, then $v\,v_1\cdots v_k$ is longer. So $(v,v_1)\notin A$, and since
   $D$ is a tournament, $(v_1,v)\in A$.
2. If $(v,v_2)\in A$, then $v_1\,v\,v_2\cdots v_k$ is longer. So $(v_2,v)\in A$.
3. Continuing in the same way, for each $i$: if $(v,v_i)\in A$ while $(v_{i-1},v)\in A$,
   then $v_1\cdots v_{i-1}\,v\,v_i\cdots v_k$ is longer. So $(v_i,v)\in A$ for all
   $i$, up to $(v_k,v)\in A$.
4. But then $v_1v_2\cdots v_k\,v$ is longer than $P$ — a contradiction. So $k=p$ and $P$
   is a Hamilton path. ∎

::: callout pitfall A path, not a cycle
Tournaments need not have a Hamilton **cycle**. In the figure, $c$ beat everyone, so no
arc enters $c$ and no directed cycle passes through it. Theorem 6.2.4 promises only a
path.
:::

## The Chinese postman problem

A postman leaves the post office, walks along every street of his district to deliver
the mail, and returns. Which route is shortest? In graph terms: in a weighted undirected
graph with non-negative edge weights (street lengths), find the shortest **closed walk
that uses every edge at least once**. The problem was posed by Professor Guan Meigu
(管梅谷) in 1962, hence the name {{term Chinese postman problem | 中国邮递员问题}}.

It is an Euler problem. If the graph is Eulerian, an Euler circuit uses each street
exactly once, and nothing can be shorter: the answer is the **total weight**. If not,
some streets must be walked twice; walking an edge again is like adding a parallel copy
of it, and the copies must make every degree even.

::: graph The postman's first district: all degrees even
at v1: 40, 40
at v2: 180, 40
at v3: 180, 130
at v4: 40, 130
at v5: 320, 130
at v6: 180, 220
at v7: 320, 220
v1 -- v2: 3, v1 -- v4: 5, v2 -- v3: 2, v3 -- v4: 3, v3 -- v5: 2, v3 -- v6: 8, v5 -- v7: 2, v6 -- v7: 2
highlight: v1 v2 v3 v5 v7 v6 v3 v4 v1
show: degrees
:::

::: graph The second district: two more streets, four odd vertices
at v1: 40, 40
at v2: 180, 40
at v3: 180, 130
at v4: 40, 130
at v5: 320, 130
at v6: 180, 220
at v7: 320, 220
v1 -- v2: 3, v1 -- v4: 5, v2 -- v3: 2, v3 -- v4: 3, v3 -- v5: 2, v3 -- v6: 8, v5 -- v7: 2, v6 -- v7: 2, v2 -- v5: 6, v4 -- v6: 7
show: degrees
:::

::: example The postman's two districts
Find the shortest closed route through every street in each graph on the slide.
== First district ==
Two 4-cycles sharing $v_3$: $d(v_3)=4$, every other degree 2, connected. It is Eulerian,
so the route is an Euler circuit, e.g. $v_1v_2v_3v_5v_7v_6v_3v_4v_1$, of length
$3+5+2+3+2+8+2+2=27$.
== Second district: the odd vertices ==
Adding $v_2v_5$ (6) and $v_4v_6$ (7) makes $v_2$, $v_4$, $v_5$, $v_6$ odd (degree 3).
No Euler circuit: some streets must be walked twice. The slide stops here; the next steps
go a little beyond it.
== Pair them up as cheaply as possible ==
Repeating a shortest path between two odd vertices fixes both. Try the three pairings:
$v_2v_4$ (5, via $v_3$) + $v_5v_6$ (4, via $v_7$) $=9$; $v_2v_5$ (4) + $v_4v_6$ (7) $=11$;
$v_2v_6$ (8) + $v_4v_5$ (5) $=13$. The cheapest is 9: walk $v_2v_3$, $v_3v_4$, $v_5v_7$,
$v_7v_6$ twice.
== Answer ==
Total weight $27+6+7=40$, plus 9 repeated: the shortest route has length $49$.
:::

## The travelling salesman problem

A salesman must visit each of $n$ cities exactly once and return home, given the
lengths of the roads between them (a length may be $+\infty$ when two cities have no
road). Which tour is shortest? This is the
{{term travelling salesman problem | 货郎担问题（旅行商问题）}}: find a **shortest
Hamilton cycle** in a weighted complete graph $K_n$. Where the postman's problem is an
Euler problem, this is a Hamilton one.

How many tours are there? Fix the home city. The other $n-1$ cities can be visited in
$(n-1)!$ orders; each tour is counted twice, once in each direction, which give the same
length.

::: formula Hamilton cycles in a complete graph | 完全图中的哈密顿回路数
$$\frac{(n-1)!}{2}$$
--
n | number of vertices (cities), $n\ge3$
$(n-1)!$ | orders of the other cities after a fixed start (directed tours)
:::

::: callout note The slide's count
The slide says each start vertex gives $(n-1)!$ Hamilton cycles, "so $K_n$ has $n!$
Hamilton cycles in total". That counts every tour $2n$ times (any of $n$ starting points,
either direction). As cycles in the graph, $K_n$ has $(n-1)!/2$ different Hamilton
cycles; $n!$ is the number of (start, direction, order) sequences.
:::

::: graph A small salesman problem on K₄: the shortest tour A B C D A has length 15
at A: 60, 50
at B: 300, 50
at C: 300, 210
at D: 60, 210
A -- B: 2, A -- C: 8, A -- D: 3, B -- C: 4, B -- D: 7, C -- D: 6
highlight: A B C D A
:::

::: example Solving K₄ by brute force
Find the shortest tour in the weighted $K_4$ above.
== Count ==
$(4-1)!/2=3$ different tours.
== List them ==
$ABCDA$: $2+4+6+3=15$. $ABDCA$: $2+7+6+8=23$. $ACBDA$: $8+4+7+3=22$.
== Answer ==
$ABCDA$ (or the same tour backwards), length 15.
:::

Brute force fails fast: $K_{10}$ already has $9!/2=181\,440$ tours and $K_{20}$ about
$6\times10^{16}$ — a **combinatorial explosion** (组合爆炸). With limited computing power
an exact answer is hard for large $n$, so in practice one uses approximate methods:
greedy rules (always go to the nearest unvisited city), evolutionary computation, neural
computation.

::: callout exam What exams ask
- Is a given graph Hamiltonian / semi-Hamiltonian? To say **no**, find a $V_1$ with
  $p(G-V_1)>|V_1|$ (or $>|V_1|+1$), or use the bipartite counts of Note 6.2.1. To say
  **yes**, show a Hamilton cycle, or check (6.2.2).
- Combined "bipartite? Eulerian? Hamiltonian?" questions (in-class question: B).
- Modelling questions like Example 6.2.2: name the vertices and edges, then check
  Corollary 6.2.2.
- Proving that every tournament has a Hamilton path.
:::

**Coming next:** section 6.3, shortest paths (最短路问题), and then trees.

::: cards Hamilton graphs
Hamilton path (哈密顿通路) :: A path through every vertex exactly once (edges may be left out).
Hamilton cycle (哈密顿回路) :: A cycle through every vertex exactly once.
Hamiltonian vs semi-Hamiltonian graph :: Hamiltonian: has a Hamilton cycle. Semi-Hamiltonian: has a Hamilton path but no Hamilton cycle.
Euler vs Hamilton :: Euler: every edge once. Hamilton: every vertex once.
Theorem 6.2.1: necessary condition :: Hamiltonian ⇒ $p(G-V_1)\le|V_1|$ for every non-empty $V_1\subset V$.
Corollary 6.2.1: semi-Hamiltonian :: Semi-Hamiltonian ⇒ $p(G-V_1)\le|V_1|+1$ for every non-empty $V_1\subset V$.
Bipartite graph with $|V_2|\ge|V_1|+2$ :: Neither Hamiltonian nor semi-Hamiltonian (Note 6.2.1). Hamiltonian needs $|V_1|=|V_2|$.
Theorem 6.2.2: Hamilton path condition :: Simple, $n$ vertices, $d(u)+d(v)\ge n-1$ for all non-adjacent $u$, $v$ ⇒ a Hamilton path.
Corollary 6.2.2: Hamilton cycle condition :: Simple, $n\ge3$, $d(u)+d(v)\ge n$ for all non-adjacent $u$, $v$ ⇒ a Hamilton cycle.
Theorem 6.2.3: adding an edge :: If $u$, $v$ are non-adjacent with $d(u)+d(v)\ge n$, then $G$ is Hamiltonian iff $G\cup(u,v)$ is.
Theorem 6.2.4: tournaments :: Every tournament with $n\ge2$ vertices has a Hamilton path (not necessarily a cycle).
Quick tests from small examples :: Hamiltonian ⇒ connected, every degree ≥ 2. Hamilton path ⇒ connected, at most two vertices of degree 1.
Chinese postman problem (中国邮递员问题) :: Shortest closed walk using every edge at least once; if the graph is Eulerian, the answer is the total weight.
Travelling salesman problem (货郎担问题) :: Shortest Hamilton cycle in a weighted complete graph; $K_n$ has $(n-1)!/2$ Hamilton cycles.
:::

::: quiz Hamilton graphs
? Is the in-class graph $G$ (a chain of three diamonds) bipartite (偶图)? Eulerian? Hamiltonian?
- [ ] A. Yes, no, yes
- [x] B. Yes, yes, no
- [ ] C. Yes, yes, yes
- [ ] D. No, yes, yes
> Bipartite with $V_1=\{L,m_1,m_2,R\}$, $V_2$ the six top and bottom vertices. Connected with all degrees even (2 or 4): Eulerian. $|V_2|=6\ge|V_1|+2$: not even semi-Hamiltonian (Note 6.2.1). Rain Classroom's answer: B.

? The complete bipartite graph $K_{2,4}$ (Example 6.2.1) is:
- [ ] Hamiltonian
- [ ] Semi-Hamiltonian
- [x] Neither
> Deleting the 2-vertex side leaves 4 isolated vertices: $4>2$ rules out a Hamilton cycle (Theorem 6.2.1) and $4>2+1$ rules out a Hamilton path (Corollary 6.2.1).

? The complete bipartite graph $K_{3,4}$ is:
- [ ] Hamiltonian
- [x] Semi-Hamiltonian
- [ ] Neither
> The sides differ by one, so no Hamilton cycle (Note 6.2.1 (1)), but the path can alternate starting and ending on the 4-side: $y_1x_1y_2x_2y_3x_3y_4$ uses all 7 vertices.

? Which are true for every Hamiltonian graph? (tick all)
- [x] It is connected
- [x] Every vertex has degree at least 2
- [ ] Every vertex has even degree
- [x] Deleting any 3 vertices leaves at most 3 components
> Connected and minimum degree 2 come from the Hamilton cycle itself; the last is Theorem 6.2.1 with $|V_1|=3$. Even degrees are Euler's condition, not Hamilton's: $K_4$ is Hamiltonian with all degrees 3.

? A simple graph has 10 vertices, and every vertex has degree at least 5. Must it be Hamiltonian?
- [x] Yes, by Corollary 6.2.2
- [ ] No: degree 5 is too small
- [ ] Only if it is also Eulerian
> Any two non-adjacent vertices have $d(u)+d(v)\ge5+5=10=n$, which is condition (6.2.2), and $n\ge3$.

? A simple graph on 7 vertices has 4 vertices of degree 1. Can it have a Hamilton path?
- [ ] Yes
- [x] No
> A degree-1 vertex can only be an end of a Hamilton path, and a path has only two ends: at most two vertices of degree 1 are allowed.

? How many different Hamilton cycles does $K_5$ have?
answer: 4!/2
> Fix a start: $4!=24$ orders of the other vertices, each cycle counted once per direction: $24/2=12$.

? In the first Chinese postman graph (all degrees even), what is the length of the shortest closed route through every street?
answer: 27
> The graph is Eulerian, so an Euler circuit uses each street once: $3+5+2+3+2+8+2+2=27$.

? Every tournament on $n\ge2$ vertices has a … (choose the strongest true statement)
- [x] Hamilton path
- [ ] Hamilton cycle
- [ ] Euler circuit
> Theorem 6.2.4 gives a Hamilton path. A cycle can fail: a player who won every game has in-degree 0 and lies on no directed cycle.

? In the weighted $K_4$ (AB 2, AC 8, AD 3, BC 4, BD 7, CD 6), what is the length of the shortest Hamilton cycle?
answer: 15
> Three tours: $ABCDA=15$, $ABDCA=23$, $ACBDA=22$. The shortest is 15.
:::

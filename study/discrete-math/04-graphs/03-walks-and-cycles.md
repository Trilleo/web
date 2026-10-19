---
title: Special graphs, walks and cycles
zh: 特殊的图、通路与回路
summary: Complete graphs, complete digraphs and tournaments, k-regular graphs, complements and self-complementary graphs, then walks, trails, paths and cycles, why a walk can always be shortened to at most n − 1 edges, and counting cycles.
source: 图5-2 (§5.2 完全图、正则图、补图、通路与回路), 2026-10-08
---

Lessons 4.1 and 4.2 gave us graphs, their parts and their degrees. This lesson does two
things. First it names a few families of graphs that come up again and again: graphs in
which *every* pair of vertices is joined (complete graphs and tournaments), graphs in
which every vertex has the same degree (regular graphs), and the "negative" of a graph
(its complement). Second, it makes precise the idea of *travelling* through a graph:
walks, trails, paths and cycles. Travelling is what graphs are for — routes in a map,
messages in a network, moves in a puzzle — and every later topic (connectivity in
Lesson 4.4, Euler and Hamilton graphs in Unit 5) is phrased in this language. The
hardest part is the vocabulary: the Chinese textbook, its synonyms and English books all
use slightly different words, so we line them up carefully.

## Complete graphs and tournaments

Picture a party where every guest shakes hands with every other guest exactly once. Draw
a vertex per guest and an edge per handshake: you get a graph in which every two
vertices are adjacent, with no loops and no repeated edges. That is a complete graph.

::: define Complete graph | 完全图
Let $G$ be an undirected simple graph with $n \ge 1$ vertices. If every vertex of $G$ is
adjacent to all the other $n-1$ vertices, $G$ is the **undirected complete graph of
order $n$** (n 阶无向完全图), or simply the **complete graph** $K_n$
(Definition 5.2.3 in the textbook).
:::

How many edges does $K_n$ have? Each of the $n$ vertices has degree $n-1$, so by the
handshake theorem (Lesson 4.2) the degree sum is $n(n-1) = 2m$. Or count directly: an
edge is a choice of 2 vertices out of $n$, and there are $\binom n2$ such choices.

::: graph The complete graph K₅: every pair of the five vertices is joined
a -- b, a -- c, a -- d, a -- e, b -- c, b -- d, b -- e, c -- d, c -- e, d -- e
show: degrees
:::

$K_5$ has $5\cdot 4/2 = 10$ edges, and every vertex has degree 4.

The same idea works with arrows. In a directed graph "every pair is joined" can mean two
different things: joined *both ways*, or joined *one way*.

::: define Complete digraph | 有向完全图
Let $D$ be a directed simple graph with $n$ vertices. If every two vertices of $D$ are
joined by two arcs in opposite directions, $D$ is the **directed complete graph of
order $n$** (n 阶有向完全图).
:::

::: graph The directed complete graph of order 3: each pair joined both ways, 6 arcs
a -> b, b -> a, b -> c, c -> b, a -> c, c -> a
show: degrees
:::

::: define Tournament | 竞赛图
Let $D$ be a directed simple graph with $n$ vertices. If its underlying graph (基图,
Lesson 4.1: forget the directions) is the complete graph $K_n$, $D$ is a **tournament of
order $n$** (n 阶竞赛图). In other words, every two vertices are joined by exactly one
arc, in one direction or the other.
:::

The name comes from sport: $n$ teams, every team plays every other team once, and the
arc $u \to v$ records "$u$ beat $v$". The slide's example has four players; here the one
in the bottom right beat everybody and the one in the top right lost every game.

::: graph A tournament of order 4 (the slide's figure): one arc per pair
at TL: 90, 40
at TR: 270, 40
at BL: 90, 220
at BR: 270, 220
TL -> TR, BL -> TL, BR -> TR, BR -> BL, BR -> TL, BL -> TR
show: degrees
:::

::: formula Edges of complete graphs and tournaments | 完全图与竞赛图的边数
$$|E(K_n)| = \frac{n(n-1)}{2}, \qquad |E(\text{complete digraph})| = n(n-1), \qquad |E(\text{tournament})| = \frac{n(n-1)}{2}$$
--
$n$ | the number of vertices (the order)
$\frac{n(n-1)}{2} = \binom n2$ | the number of pairs of vertices: one edge (or one arc) per pair
$n(n-1)$ | two arcs per pair, one each way
:::

In a tournament the out-degrees are the numbers of wins, so they add up to the number of
games, $\binom n2$. In the figure: $d^+ = 3, 2, 1, 0$ and $3+2+1+0 = 6 = \binom42$.

::: callout pitfall Complete means simple
$K_n$ has no loops and no parallel edges. A graph with every pair joined *and* a loop
somewhere is not complete; neither is a graph with two edges between some pair. In the
same way, a tournament has exactly one arc per pair: no pair is skipped and no pair gets
two.
:::

## Regular graphs

In $K_n$ every vertex has the same degree. Graphs with that property have a name.

::: define k-regular graph | k-正则图
Let $G$ be an undirected simple graph with $n$ vertices. If $d(v) = k$ for every
vertex $v \in V(G)$, $G$ is a **$k$-regular graph** (Definition 5.2.4). Then
$\delta(G) = \Delta(G) = k$.
:::

Straight from the definition:

- the {{term null graph | 零图}} $N_n$ (no edges, Lesson 4.1) is 0-regular;
- the complete graph $K_n$ is $(n-1)$-regular;
- a cycle drawn as a polygon is 2-regular;
- the {{term Petersen graph | 彼得松图}} is 3-regular.

::: graph The Petersen graph: 10 vertices, 15 edges, every degree 3
at o1: 180, 22
at o2: 285, 98
at o3: 245, 221
at o4: 115, 221
at o5: 75, 98
at i1: 180, 82
at i2: 228, 117
at i3: 209, 172
at i4: 151, 172
at i5: 132, 117
o1 -- o2, o2 -- o3, o3 -- o4, o4 -- o5, o5 -- o1
o1 -- i1, o2 -- i2, o3 -- i3, o4 -- i4, o5 -- i5
i1 -- i3, i3 -- i5, i5 -- i2, i2 -- i4, i4 -- i1
show: degrees
:::

The Petersen graph (an outer pentagon, an inner five-pointed star, and five spokes) is a
favourite counterexample in graph theory: many statements that "look true" fail on it.

Counting edges of a regular graph is the handshake theorem again: $n$ vertices of degree
$k$ give a degree sum of $kn$, which is $2m$.

::: formula Edges of a k-regular graph | k-正则图的边数
$$m = \frac{kn}{2}$$
--
$n$ | the number of vertices
$k$ | the degree of every vertex
$m$ | the number of edges
:::

Since $m$ must be a whole number, $kn$ must be even: **if $k$ is odd, then $n$ is
even**. A 3-regular graph always has an even number of vertices (the Petersen graph has
10).

::: example Is there a 5-regular graph on 7 vertices?
This was an in-class question (存在 7 阶 5-正则图吗?).
== Count the degree sum ==
Seven vertices of degree 5 would give a degree sum of $7 \times 5 = 35$.
== Compare with the handshake theorem ==
The degree sum is always $2m$, an even number. 35 is odd, so no such graph exists. (Put
another way, $m = 35/2 = 17.5$ is not a whole number.)
== Answer ==
No: **×**. $k = 5$ is odd, so the number of vertices would have to be even.
:::

::: callout tip The same test in other clothes
"Can 7 people each shake hands with exactly 5 of the others?" or "Is there a cubic
(3-regular) graph on 9 vertices?" are the same question: odd degree times odd number of
vertices is odd, so the answer is no.
:::

## Complements and self-complementary graphs

Start from $K_n$, which has every possible edge, and colour some of its edges black and
the rest grey. The black edges form a graph $G$; the grey ones form its complement. The
two graphs share their vertices and split the edges of $K_n$ between them.

::: define Complement | 补图
Let $G = \langle V, E\rangle$ be an undirected simple graph with $n$ vertices. Put
$$\bar E = \{(u,v) \mid u, v \in V,\ u \ne v,\ (u,v) \notin E\}.$$
The graph $\bar G = \langle V, \bar E\rangle$ is the **complement** of $G$
(Definition 5.2.5): same vertices, and two vertices are adjacent in $\bar G$ exactly when
they are *not* adjacent in $G$.
:::

Some facts that follow at once:

- $G$ and $\bar G$ together have all the edges of $K_n$, each exactly once:
  $|E| + |\bar E| = \dfrac{n(n-1)}{2}$.
- The complement of the complement is the graph itself: $\bar{\bar G} = G$.
- $\bar K_n = N_n$ and $\bar N_n = K_n$.
- A vertex of degree $d$ in $G$ has degree $n-1-d$ in $\bar G$.

::: define Self-complementary graph | 自补图
If $G \cong \bar G$ (Lesson 4.2: the two are isomorphic), $G$ is
**self-complementary**.
:::

The slide's example is the path on four vertices. On the left, $G$ has edges $ab$, $ac$,
$bd$: read in order it is $c - a - b - d$. Its complement has the other three of the six
possible edges: $ad$, $bc$, $cd$, which read $a - d - c - b$. Both are a path through
four vertices, so they are isomorphic (map $c \mapsto a$, $a \mapsto d$, $b \mapsto c$,
$d \mapsto b$).

::: graph Figure 1 of the slides: G, the path c – a – b – d
at a: 100, 60
at b: 260, 60
at c: 100, 200
at d: 260, 200
a -- b, a -- c, b -- d
highlight: c a b d
:::

::: graph Its complement: the path a – d – c – b, the same shape
at a: 100, 60
at b: 260, 60
at c: 100, 200
at d: 260, 200
a -- d, b -- c, c -- d
highlight: a d c b
:::

Another self-complementary graph is the 5-cycle $C_5$: its complement is the
five-pointed star through the same vertices, which is again a 5-cycle.

How many edges can a self-complementary graph have? Isomorphic graphs have the same
number of edges, so $|E| = |\bar E|$, and the two together make all of $K_n$.

::: formula Edges of a self-complementary graph | 自补图的边数
$$|E| = |\bar E| = \frac12\cdot\frac{n(n-1)}{2} = \frac{n(n-1)}{4}$$
--
$n$ | the number of vertices of the self-complementary graph $G$
$\lvert E\rvert$ | the number of edges of $G$
$\lvert\bar E\rvert$ | the number of edges of its complement $\bar G$
:::

That count already limits the number of vertices.

::: theorem Order of a self-complementary graph | 自补图的阶数
Every self-complementary graph has $4k$ or $4k+1$ vertices for some whole number $k$.
(Proved on the slides.)
:::

The idea: the edge count $\frac{n(n-1)}{4}$ must be a whole number, and that only
happens for some $n$.

1. Let $G_1 = (V, E_1)$ be self-complementary with $|V| = m$, and let
   $G_2 = (V, E_2)$ be its complement.
2. The two edge sets split the edges of $K_m$: $|E_1| + |E_2| = \frac{m(m-1)}{2}$.
3. $G_1 \cong G_2$, so $|E_1| = |E_2|$ and $|E_1| = \frac{m(m-1)}{4}$.
4. So $4$ divides $m(m-1)$. Of two consecutive numbers $m-1$ and $m$, exactly one is
   even (and so only one can hold the factor 4); hence $4 \mid m$ or $4 \mid m-1$.
5. That is, $m = 4k$ or $m = 4k+1$.

::: example The slide's follow-up questions
Answer the three questions next to the proof.
== How many edges does a self-complementary graph on 8 vertices have? ==
$\frac{8 \cdot 7}{4} = 14$ edges ($K_8$ has 28; each graph gets half).
== Is there a self-complementary graph on 11 vertices? ==
No. $11 = 4\cdot 2 + 3$ is neither $4k$ nor $4k+1$; equivalently $\frac{11\cdot 10}{4} = 27.5$
is not a whole number.
== Is there a self-complementary graph with 11 edges? ==
We would need $\frac{n(n-1)}{4} = 11$, that is $n(n-1) = 44$. But $7\cdot 6 = 42$ and
$8\cdot 7 = 56$, so no whole $n$ works: no.
:::

::: callout pitfall The condition is necessary, not sufficient
"$n = 4k$ or $4k+1$" only says the edges *could* split in half. A graph on 4 vertices
with 3 edges need not be self-complementary: the star $K_{1,3}$ has 3 edges, but its
complement is a triangle plus an isolated vertex, which is not a star.
:::

## Walks and closed walks

Now we start travelling. Think of a delivery van driving through a road network: it
leaves a junction, drives along a road to the next junction, then along another road,
and so on. Writing down every junction and every road in order gives an alternating list
of vertices and edges. Repeats are allowed: the van may pass the same junction twice, or
even drive back along the same road.

We'll use one graph (the slides' figure (a)) for all the definitions. It has a loop
$e_1$ at $v_1$ and two parallel edges $e_5$, $e_6$ between $v_2$ and $v_3$, so it shows
what loops and parallel edges do to walks.

::: graph Figure (a) of the slides: 5 vertices, 7 edges
at v1: 120, 80
at v2: 280, 80
at v3: 330, 190
at v4: 220, 235
at v5: 70, 180
v1 -- v1: e1, v1 -- v2: e2, v1 -- v5: e3, v2 -- v5: e4, v2 -- v3: e5, v2 -- v3: e6, v5 -- v4: e7
:::

::: define Walk | 通路
Let $G$ be an undirected labelled graph. An alternating sequence of vertices and edges
$$\Gamma = v_{i_0}\, e_{j_1}\, v_{i_1}\, e_{j_2} \cdots e_{j_l}\, v_{i_l},$$
in which the ends of each edge $e_{j_r}$ are the vertices beside it, $v_{i_{r-1}}$ and
$v_{i_r}$ ($r = 1, 2, \dots, l$), is a **walk** from $v_{i_0}$ to $v_{i_l}$
(Definition 5.2.6; also called 通道). $v_{i_0}$ is its {{term start vertex | 始点}},
$v_{i_l}$ its {{term end vertex | 终点}}, and the number of edges $l$ is its
{{term length | 长度}}. If $v_{i_0} = v_{i_l}$, $\Gamma$ is a **closed walk** (回路, also
闭通道).
:::

The length counts edges *with* repeats: walking along the same edge twice adds 2. A
single vertex $v$ is a walk of length 0.

In figure (a), $v_4\, e_7\, v_5\, e_4\, v_2\, e_5\, v_3$ is a walk of length 3 from $v_4$ to
$v_3$, and $v_2\, e_5\, v_3\, e_5\, v_2$ is a closed walk of length 2 (there and back along
$e_5$). In a simple graph each edge is fixed by its two ends, so we can drop the edges
and write a walk as a list of vertices, $v_4 v_5 v_2 v_3$. With parallel edges, as here,
the edges must be named: $v_2 e_5 v_3$ and $v_2 e_6 v_3$ are different walks.

## Trails, paths and cycles

A walk may repeat anything. Forbidding repeats gives two stricter kinds.

::: define Trail | 简单通路
A walk in which all the edges are different is a **trail** (简单通路, also called 迹). A
closed walk with all its edges different is a **closed trail** (简单回路, also 闭迹).
Vertices may still repeat.
:::

::: define Path | 初级通路
A walk in which all the vertices are different (except that the first and last may
coincide), and all the edges are different too, is a **path** (初级通路, also 路径 or
路). If in addition $v_{i_0} = v_{i_l}$, it is a {{term cycle | 圈}} (初级回路). A cycle
of odd length is an {{term odd cycle | 奇圈}}; one of even length is an
{{term even cycle | 偶圈}}.
:::

::: define Complex walk | 复杂通路
A walk in which some edge appears more than once is a **complex walk** (复杂通路); a
closed one is a **complex closed walk** (复杂回路).
:::

The three levels nest: every path is a trail (the definition of a path asks for
distinct edges as well as distinct vertices), and every trail is a walk. The slide draws an arrow up the list with the
words "向上满足": a sequence that meets a lower line meets every line above it.

| Open (from $u$ to $v$) | Closed (back to the start) | What may not repeat |
| --- | --- | --- |
| walk 通路 (通道) | closed walk 回路 (闭通道) | nothing: anything may repeat |
| trail 简单通路 (迹) | closed trail 简单回路 (闭迹) | edges |
| path 初级通路 (路径, 路) | cycle 初级回路 (圈) | edges and vertices |

::: example Classify walks in figure (a)
Say which of these are walks, trails, paths or cycles:
(1) $v_1\, e_2\, v_2\, e_4\, v_5\, e_3\, v_1$; (2) $v_5\, e_3\, v_1\, e_1\, v_1\, e_2\, v_2$;
(3) $v_1\, e_1\, v_1\, e_2\, v_2\, e_4\, v_5\, e_3\, v_1$; (4) $v_3\, e_5\, v_2\, e_6\, v_3$;
(5) $v_3\, e_5\, v_2\, e_5\, v_3$.
== (1) ==
Closed, edges $e_2, e_4, e_3$ all different, and the only repeated vertex is $v_1$ at both
ends: a **cycle** of length 3, an odd cycle (the triangle $v_1 v_2 v_5$).
== (2) ==
Open, edges $e_3, e_1, e_2$ all different, but $v_1$ appears twice (it goes round the loop):
a **trail** that is not a path.
== (3) ==
Closed, edges $e_1, e_2, e_4, e_3$ all different, but $v_1$ appears in the middle as well
as at the ends: a **closed trail** that is not a cycle.
== (4) ==
Closed, two different edges $e_5 \ne e_6$, no inner vertex repeated: a **cycle** of
length 2, an even cycle. Parallel edges make 2-cycles, and a loop on its own,
$v_1\, e_1\, v_1$, is a cycle of length 1. In a simple graph every cycle has length at
least 3.
== (5) ==
$e_5$ is used twice: a **complex closed walk**. It is a closed walk but not a closed
trail.
:::

::: graph The cycle v₁ v₂ v₅ v₁ from (1), highlighted
at v1: 120, 80
at v2: 280, 80
at v3: 330, 190
at v4: 220, 235
at v5: 70, 180
v1 -- v1: e1, v1 -- v2: e2, v1 -- v5: e3, v2 -- v5: e4, v2 -- v3: e5, v2 -- v3: e6, v5 -- v4: e7
highlight: v1 v2 v5 v1
:::

::: callout pitfall Walk, trail, path: three different words
A **walk** may repeat anything; a **trail** may repeat vertices but not edges; a **path**
repeats neither. The course's words are 通路 / 简单通路 / 初级通路, and the trap is
that "simple" (简单) only forbids repeated *edges*, while "elementary" (初级) forbids
repeated *vertices*. English books differ too: some say "path" for what we call a walk,
or "simple path" for our path. Learn the three levels by what they forbid.
:::

## Shortening a walk

Look at this walk from $v_3$ to $v_4$ in figure (a), the slides' example:
$$v_3\, e_5\, v_2\, e_6\, v_3\, e_5\, v_2\, e_4\, v_5\, e_3\, v_1\, e_2\, v_2\, e_4\, v_5\, e_7\, v_4.$$
It has length 8 and wanders: $v_2$ appears three times, $v_3$ and $v_5$ twice. Whenever a
vertex appears twice, the stretch between its two appearances is a closed detour, and
we can simply cut it out. Cutting from the first $v_3$ to the second leaves
$v_3\, e_5\, v_2\, e_4\, v_5\, e_3\, v_1\, e_2\, v_2\, e_4\, v_5\, e_7\, v_4$; cutting from the
first $v_2$ to the last leaves $v_3\, e_5\, v_2\, e_4\, v_5\, e_7\, v_4$, of length 3. Now no
vertex repeats. The graph has $n = 5$ vertices, and a walk with no repeated vertex
visits at most 5 vertices, so it has at most $5 - 1 = 4$ edges.

::: theorem Short walks exist | 通路的长度
In a graph $G$ with $n$ vertices, if there is a walk from $u$ to $v$ and $u \ne v$, then
there is a walk from $u$ to $v$ of length at most $n-1$ (Theorem 5.2.5 in the textbook).
:::

The idea: a walk longer than $n-1$ passes more than $n$ vertices, so some vertex repeats
(the pigeonhole principle); cut out the closed piece between the repeats and repeat.

1. Let $\Gamma = v_0\, e_1\, v_1\, e_2 \cdots e_l\, v_l$ be a walk from $u$ to $v$, with
   $v_0 = u$ and $v_l = v$.
2. If $l \le n-1$, we are done.
3. Otherwise $l > n-1$, so the sequence $v_0, v_1, \dots, v_l$ lists $l+1 > n$ vertices,
   more than $G$ has. Some vertex appears twice: there are $k, s$ with
   $0 \le k < s \le l$ and $v_k = v_s$. The piece $v_k\, e_{k+1} \cdots e_s\, v_s$ is a
   closed walk $C$ from $v_k$ back to itself.
4. Delete $C$ from $\Gamma$:
   $\Gamma' = v_0\, e_1 \cdots v_k\, e_{s+1} \cdots e_l\, v_l$. This is still a walk from
   $u$ to $v$, and it is shorter by $s - k \ge 1$.
5. If $\Gamma'$ is still longer than $n-1$, do it again. The length drops every time, so
   after finitely many steps we reach a walk from $u$ to $v$ of length at most $n-1$.

::: callout note A typo on the proof slide
The proof slide writes "$v_0 = u$, $v_1 = v$". The end of the walk is $v_l$ (the letter
l, the length), not $v_1$: it should read $v_l = v$.
:::

If we keep cutting until *no* vertex repeats, the walk we end up with is a path, which
gives a stronger statement for free.

::: theorem Short paths exist | 初级通路的存在
In a graph with $n$ vertices, if there is a walk from $u$ to $v$ and $u \ne v$, then
there is a path (初级通路) from $u$ to $v$ of length at most $n-1$ (Corollary 5.2.2).
:::

The same holds for closed walks, with $n$ in place of $n-1$: a closed walk from $v$ to
itself visits $v$ at the start and the end, and in between at most the $n$ different
vertices of $G$, so it can be cut down to at most $n$ edges.

::: theorem Short closed walks exist | 回路的长度
In a graph with $n$ vertices, if there is a closed walk from $v$ to itself, there is one
of length at most $n$ (Theorem 5.2.6). If there is a closed trail (简单回路) from $v$ to
itself, there is a cycle (初级回路) through $v$ of length at most $n$ (Corollary 5.2.3).
The slides leave out both proofs.
:::

::: callout pitfall A closed walk need not contain a cycle
Corollary 5.2.3 starts from a closed *trail*, and that matters. In a single edge
$u - v$, the walk $u\, e\, v\, e\, u$ is a closed walk (there and back), but the graph
has no cycle at all. Going back along the same edge is allowed in a walk, and it makes
"closed" without making a loop round anything.
:::

::: callout exam What exams ask here
Typical questions: classify a given sequence (walk / trail / path, closed or not);
give the shortest walk between two vertices and its length; "in an $n$-vertex graph a
walk from $u$ to $v$ ($u\ne v$) implies a path of length at most ___" ($n-1$); "a
closed walk implies one of length at most ___" ($n$).
:::

## Counting cycles

How many cycles does a triangle have? It depends on what we count as "different".

- All cycles of the same length look the same: any two cycles of length $l$ are
  isomorphic. So **up to isomorphism** (在同构意义下) there is only one cycle of each
  length.
- In a labelled graph, though, a cycle is written as a sequence of labelled vertices and
  edges, and two different sequences count as two different cycles. This is counting
  **by definition** (在定义意义下). The triangles on $a, b, c$ and on $x, y, z$ are
  isomorphic, but as labelled sequences $abca$ and $xyzx$ are different.

::: example Cycles in K₃
Label the vertices of $K_3$ as $a, b, c$. How many different cycles does it have, by
definition? (Example 5.2.3 in the textbook.)
== List them ==
Every cycle in $K_3$ goes round the triangle once, so it has length 3. It can start at
any of the 3 vertices and go either way round:
$$abca,\ acba,\qquad bacb,\ bcab,\qquad cabc,\ cbac.$$
By definition there are **6** different cycles.
== Ignore the direction ==
If two cycles count as the same when they differ only in direction (clockwise or
anticlockwise), and only the starting vertex tells them apart, there are **3**: one
starting at each of $a$, $b$, $c$.
== Up to isomorphism ==
All six are triangles, so up to isomorphism there is just **1** cycle.
:::

The same counting works in bigger complete graphs. In $K_4$ a 3-cycle uses 3 of the 4
vertices ($\binom43 = 4$ ways) and each triangle gives 6 sequences, so there are
$4 \times 6 = 24$ cycles of length 3 by definition.

::: callout key The one idea to remember
A walk can always be trimmed: whenever a vertex repeats, the piece in between is a
detour you can cut out. That is why "there is a walk from $u$ to $v$" and "there is a
path from $u$ to $v$" mean the same thing, and why the length never needs to exceed
$n-1$.
:::

## Flashcards and quiz

::: cards Special graphs, walks and cycles
Complete graph $K_n$ :: A simple graph with $n$ vertices in which every vertex is adjacent to all $n-1$ others; $\frac{n(n-1)}{2}$ edges.
Directed complete graph (有向完全图) :: Every two vertices joined by two arcs in opposite directions; $n(n-1)$ arcs.
Tournament (竞赛图) :: A directed simple graph whose underlying graph is $K_n$: exactly one arc per pair; $\frac{n(n-1)}{2}$ arcs.
k-regular graph (k-正则图) :: A simple graph in which every vertex has degree $k$; it has $m = \frac{kn}{2}$ edges.
A k-regular graph with $k$ odd :: has an even number of vertices, since $kn = 2m$ is even.
Petersen graph :: 10 vertices, 15 edges, 3-regular: an outer pentagon, an inner pentagram and 5 spokes.
Complement $\bar G$ (补图) :: Same vertices; $u \ne v$ adjacent exactly when they are not adjacent in $G$. $|E| + |\bar E| = \frac{n(n-1)}{2}$.
Self-complementary graph (自补图) :: $G \cong \bar G$; it has $\frac{n(n-1)}{4}$ edges and $n = 4k$ or $4k+1$ vertices.
Walk / trail / path (通路 / 简单通路 / 初级通路) :: Walk: anything may repeat. Trail: no repeated edge. Path: no repeated vertex (and no repeated edge).
Closed walk / closed trail / cycle :: The closed versions (回路 / 简单回路 / 初级回路 = 圈): start = end.
Length of a walk :: The number of edges in it, counting repeats.
Theorem 5.2.5 and Corollary 5.2.2 :: In an $n$-vertex graph, a walk from $u$ to $v \ne u$ implies a path from $u$ to $v$ of length $\le n-1$.
Theorem 5.2.6 and Corollary 5.2.3 :: A closed walk at $v$ implies one of length $\le n$; a closed trail at $v$ implies a cycle of length $\le n$.
Cycles of $K_3$ by definition :: 6 ($abca, acba, bacb, bcab, cabc, cbac$); 3 ignoring direction; 1 up to isomorphism.
:::

::: quiz Special graphs, walks and cycles
? Is there a 5-regular graph on 7 vertices (存在 7 阶 5-正则图)?
- [ ] Yes (√)
- [x] No (×)
> The degree sum would be $7 \times 5 = 35$, which is odd, but a degree sum is always $2m$. So no such graph exists (the in-class answer is B, ×).

? How many edges does the complete graph $K_{10}$ have?
answer: 45
> $\frac{10 \cdot 9}{2} = 45$.

? How many arcs does the directed complete graph of order 6 have?
answer: 30
> Two arcs per pair: $6 \cdot 5 = 30$.

? In a tournament on 6 players, what do the out-degrees of all the vertices add up to?
answer: 15
> Each game (arc) gives one win, and there is one game per pair: $\binom62 = 15$.

? A 4-regular graph has 20 edges. How many vertices does it have?
answer: 10
> $m = \frac{kn}{2}$ gives $20 = \frac{4n}{2}$, so $n = 10$.

? A simple graph has 10 vertices and 20 edges. How many edges does its complement have?
answer: 45 - 20
> $K_{10}$ has 45 edges, split between $G$ and $\bar G$: $45 - 20 = 25$.

? A self-complementary graph has $n$ vertices. How many edges does it have?
expression: n(n-1)/4
variables: n
> $|E| = |\bar E|$ and $|E| + |\bar E| = \frac{n(n-1)}{2}$, so $|E| = \frac{n(n-1)}{4}$.

? How many edges does a self-complementary graph on 8 vertices have?
answer: 14
> $\frac{8 \cdot 7}{4} = 14$.

? Which of these could be the number of vertices of a self-complementary graph?
- [x] 5
- [ ] 7
- [x] 9
- [ ] 11
- [x] 12
> Only $4k$ or $4k+1$ work: $5 = 4+1$, $9 = 8+1$, $12 = 4\cdot3$. $7$ and $11$ leave remainder 3, so $\frac{n(n-1)}{4}$ isn't whole ($10.5$ and $27.5$).

? In figure (a), what is $v_5\, e_3\, v_1\, e_1\, v_1\, e_2\, v_2$?
- [ ] A path (初级通路)
- [x] A trail (简单通路) that is not a path
- [ ] A complex walk (复杂通路)
- [ ] A cycle
> Its edges $e_3, e_1, e_2$ are all different, so it is a trail; but $v_1$ appears twice (it goes round the loop $e_1$), so it is not a path. It isn't closed, so it isn't a cycle.

? In a graph with 6 vertices there is a walk from $u$ to $v$, $u \ne v$. There is certainly a path from $u$ to $v$ of length at most …
answer: 5
> Corollary 5.2.2: at most $n - 1 = 5$.

? By definition (as labelled sequences), how many cycles of length 3 does $K_4$ have?
answer: comb(4,3)*6
> Choose the triangle's 3 vertices ($\binom43 = 4$ ways); each triangle gives $3 \times 2 = 6$ sequences (3 starts, 2 directions): $4 \times 6 = 24$.
:::

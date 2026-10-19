---
title: Directed connectivity and bipartite graphs
zh: 有向图的连通性与二部图
summary: Reachability and distance in directed graphs, weakly, unilaterally and strongly connected digraphs and their criteria, the longest-path technique, strong and unilateral components, and bipartite graphs with the odd-cycle theorem.
source: 图5-3 有向图的连通性、二部图 (§5.3), 2026-10-13
---

Lesson 4.4 asked when an undirected graph "hangs together". With one-way edges the
question splits in three: can you get from anywhere to anywhere (like a city's one-way
streets that still let you drive everywhere), can you at least get from one of any two
places to the other, or is the map only joined up if you ignore the arrows? These three
levels — strong, unilateral and weak connectivity — come with simple tests, and they
matter wherever links have a direction: road networks, web links, the order of tasks in
a project. The second half of the lesson turns to bipartite graphs, whose vertices
split into two sides with every edge crossing between them (workers and jobs, students
and courses), and proves the one test you need for them: no cycle of odd length.

## Reachability and distance

In an undirected graph, "there is a walk from $u$ to $v$" is the same as "there is a
walk from $v$ to $u$". With arrows it isn't: on a one-way street you may get from the
station to the school but not back. So we talk about getting *from* one vertex *to*
another.

::: define Reachable | 可达
Let $D=\langle V,E\rangle$ be a directed graph and $v_i,v_j\in V$. If there is a walk
(通路, Lesson 4.3) from $v_i$ to $v_j$ that follows the arrows, $v_i$ **reaches**
$v_j$, written $v_i\to v_j$. By convention every vertex reaches itself: $v_i\to v_i$.
:::

::: define Mutually reachable | 相互可达
$v_i$ and $v_j$ are **mutually reachable**, written $v_i\leftrightarrow v_j$, when
$v_i\to v_j$ and $v_j\to v_i$. By convention $v_i\leftrightarrow v_i$.
:::

Both $\to$ and $\leftrightarrow$ are binary relations on $V$ (Lesson 2.1). $\to$ is
reflexive (by the convention) and transitive (join the two walks), but not symmetric
in general. $\leftrightarrow$ is reflexive, symmetric (the definition reads the same
both ways) and transitive, so it is an **equivalence relation** on $V$ (Lesson 2.6).
Its equivalence classes will be the strong components below.

Distance works as in Lesson 4.4, except that it now has a direction.

::: define Shortest path and distance in a digraph | 短程线与距离
If $v_i\to v_j$, a shortest walk from $v_i$ to $v_j$ is a {{term shortest path | 短程线}}
(also 最短路) from $v_i$ to $v_j$, and its length is the **distance** from $v_i$ to
$v_j$, written $d\langle v_i,v_j\rangle$. If $v_i$ doesn't reach $v_j$,
$d\langle v_i,v_j\rangle=\infty$.
:::

The angle brackets $\langle\;\rangle$ remind you that the order matters, as in an
ordered pair; the undirected distance of Lesson 4.4 is written $d(v_i,v_j)$ with round
brackets. $d\langle v_i,v_j\rangle$ has every property of $d(v_i,v_j)$ except
symmetry:

- $d\langle v_i,v_j\rangle\ge 0$, and it is $0$ exactly when $v_i=v_j$;
- the triangle inequality: $d\langle v_i,v_k\rangle\le d\langle v_i,v_j\rangle+d\langle v_j,v_k\rangle$;
- but $d\langle v_i,v_j\rangle$ and $d\langle v_j,v_i\rangle$ can differ.

::: graph A directed 4-cycle: one step forward, three steps back
at a: 100, 50
at b: 260, 50
at c: 260, 210
at d: 100, 210
a -> b, b -> c, c -> d, d -> a
:::

::: example Distances in a directed cycle
Find $d\langle a,b\rangle$, $d\langle b,a\rangle$, $d\langle a,c\rangle$ and
$d\langle c,a\rangle$ in the directed 4-cycle above.
== Forward ==
$a\to b$ is an arc, so $d\langle a,b\rangle=1$. To reach $c$ from $a$ you must go
$a\,b\,c$: $d\langle a,c\rangle=2$.
== Backward ==
From $b$ the only way to $a$ is round the cycle: $b\,c\,d\,a$, so
$d\langle b,a\rangle=3$. From $c$: $c\,d\,a$, so $d\langle c,a\rangle=2$.
== What it shows ==
$d\langle a,b\rangle=1\ne3=d\langle b,a\rangle$: distance in a digraph is not
symmetric. In the underlying graph (ignore the arrows) both would be $1$.
:::

## Weakly, unilaterally and strongly connected

There are three natural ways a digraph can be "in one piece", from the weakest to the
strongest demand.

::: define Weakly, unilaterally and strongly connected | 弱连通、单向连通与强连通
Let $D=\langle V,E\rangle$ be a directed graph.
- $D$ is {{term weakly connected | 弱连通图}} (or just **connected**) when its
  underlying graph (基图, Lesson 4.1: forget the arrows) is connected.
- $D$ is {{term unilaterally connected | 单向连通图}} when for every two vertices
  $v_i,v_j$ at least one of $v_i\to v_j$, $v_j\to v_i$ holds.
- $D$ is {{term strongly connected | 强连通图}} when every two vertices are mutually
  reachable: $v_i\leftrightarrow v_j$ for all $v_i,v_j\in V$.

This is Definition 5.3.10 in the textbook.
:::

Straight from the definitions: **strongly connected ⇒ unilaterally connected ⇒ weakly
connected**. (If $v_i\to v_j$ there's a walk between them in the underlying graph too.)
Neither arrow reverses, as the slide's three examples show.

::: graph Weakly connected only: b → a, d → a, b → c
at a: 100, 50
at b: 260, 50
at c: 260, 210
at d: 100, 210
b -> a, d -> a, b -> c
:::

::: graph Unilaterally connected: a → b, c → a, and b ⇄ d
at a: 100, 50
at b: 260, 50
at c: 100, 210
at d: 260, 210
a -> b, c -> a, b -> d, d -> b
:::

::: graph Strongly connected: the directed 4-cycle a → b → c → d → a
at a: 100, 50
at b: 260, 50
at c: 260, 210
at d: 100, 210
a -> b, b -> c, c -> d, d -> a
:::

::: example Classifying the three digraphs
Decide how strongly each of the three digraphs above is connected.
== First: b → a, d → a, b → c ==
Without arrows the edges $ab$, $ad$, $bc$ join all four vertices, so it is weakly
connected. But look at $b$ and $d$: from $b$ you reach only $a$ and $c$, from $d$ only
$a$. Neither reaches the other, so it is **not** unilaterally connected. Weakly
connected only.
== Second: a → b, c → a, b ⇄ d ==
The walk $c\,a\,b\,d$ passes through every vertex in order, so of any two vertices the
earlier one on this walk reaches the later one: unilaterally connected. Nothing
enters $c$, so no vertex reaches $c$: not strongly connected.
== Third: the 4-cycle ==
Going round, every vertex reaches every other: strongly connected.
:::

The textbook's Figure 5.3.4 asks the same question for three digraphs drawn on one
pentagon with two chords. The vertices are named by position: T (top), L and R (upper
left and right), BL and BR (lower left and right).

::: graph Figure 5.3.4 (a): strongly connected
at T: 180, 30
at L: 60, 110
at R: 300, 110
at BL: 100, 230
at BR: 260, 230
T -> L, R -> T, L -> R, L -> BL, BL -> BR, BR -> R, L -> BR
:::

::: graph Figure 5.3.4 (b): unilaterally connected
at T: 180, 30
at L: 60, 110
at R: 300, 110
at BL: 100, 230
at BR: 260, 230
L -> T, T -> R, L -> R, R -> BR, BR -> BL, L -> BL, L -> BR
:::

::: graph Figure 5.3.4 (c): weakly connected
at T: 180, 30
at L: 60, 110
at R: 300, 110
at BL: 100, 230
at BR: 260, 230
T -> L, T -> R, R -> L, BL -> L, BL -> BR, BR -> R, BR -> L
:::

::: example Figure 5.3.4
Show that (a) is strongly connected, (b) unilaterally but not strongly connected, and
(c) weakly but not unilaterally connected.
== (a) ==
$T\to L\to BL\to BR\to R\to T$ is a closed walk through all five vertices. Following
it from any vertex you reach every other, so every pair is mutually reachable.
== (b) ==
$L\to T\to R\to BR\to BL$ is a walk through all five vertices, so of any two the earlier
reaches the later: unilaterally connected. No arc enters $L$, so nothing reaches $L$:
not strongly connected.
== (c) ==
$L$ has no outgoing arcs. From $T$ you reach only $T, L, R$; from $BL$ only
$BL, L, BR, R$. So $T$ doesn't reach $BL$ and $BL$ doesn't reach $T$: not unilaterally
connected. The underlying pentagon is connected, so it is weakly connected.
:::

::: callout pitfall Weakly connected doesn't mean "one-way reachable"
In a weakly connected digraph two vertices may not reach each other in either
direction ($b$ and $d$ in the first example). Weak connectivity only looks at the
picture without arrows. To prove a digraph is *not* unilaterally connected, show one
pair where neither reaches the other.
:::

## Testing strong and unilateral connectivity

Checking every pair is slow. The two theorems below replace "every pair" with one walk.

::: theorem Criterion for strong connectivity | 强连通图的判别定理
A directed graph $D=\langle V,E\rangle$ is strongly connected if and only if $D$ has a
closed walk (回路) that passes through every vertex at least once. (Theorem 5.3.2 in the
textbook.)
:::

*Idea:* a closed walk through everything lets you go from any vertex to any other by
following it round; conversely, if you can get anywhere, chain the trips
$v_1\to v_2\to\cdots\to v_n\to v_1$ together.

*Proof.* **Sufficiency** (a closed walk through every vertex ⇒ strongly connected):
any two vertices $v_i,v_j$ lie on the closed walk; following it from $v_i$ you arrive
at $v_j$, and following on, back at $v_i$. So $v_i\leftrightarrow v_j$.

**Necessity** (strongly connected ⇒ such a closed walk). Let
$V=\{v_1,v_2,\dots,v_n\}$.
1. Since $D$ is strongly connected, $v_i\to v_{i+1}$ for $i=1,\dots,n-1$; let
   $\Gamma_i$ be a walk from $v_i$ to $v_{i+1}$.
2. Also $v_n\to v_1$; let $\Gamma_n$ be a walk from $v_n$ to $v_1$.
3. Joining $\Gamma_1,\Gamma_2,\dots,\Gamma_{n-1},\Gamma_n$ end to end gives a closed
   walk from $v_1$ back to $v_1$ that passes through every vertex at least once. ∎

The slides give a second proof of necessity, by an **extreme choice**: take the closed
walk $L=v_1v_2\cdots v_kv_1$ that passes through the most vertices (each counted once).
If $L$ misses a vertex $u$: since $D$ is strongly connected, $v_k\to u$ and $u\to v_1$,
so $v_1v_2\cdots v_k\cdots u\cdots v_1$ is a closed walk through more vertices than $L$
— a contradiction. So $L$ already passes through every vertex.

::: graph A closed walk through every vertex of Figure 5.3.4 (a)
at T: 180, 30
at L: 60, 110
at R: 300, 110
at BL: 100, 230
at BR: 260, 230
T -> L, R -> T, L -> R, L -> BL, BL -> BR, BR -> R, L -> BR
highlight: T L BL BR R T
:::

::: theorem Criterion for unilateral connectivity | 单向连通图的判别定理
A directed graph $D$ is unilaterally connected if and only if $D$ has a walk (通路) that
passes through every vertex at least once. (Theorem 5.3.3 in the textbook.)
:::

The textbook leaves out the proof. Sufficiency is as before: of any two vertices on the
walk, the one met first reaches the other. For necessity, the idea is this: in a
unilaterally connected digraph, "reaches" compares every pair of vertices and is
transitive, so the vertices can be listed $u_1,u_2,\dots,u_n$ with each one reaching
the next. Joining walks $u_1\to u_2$, $u_2\to u_3$, …, $u_{n-1}\to u_n$ gives a walk
through every vertex.

::: graph A walk through every vertex of Figure 5.3.4 (b)
at T: 180, 30
at L: 60, 110
at R: 300, 110
at BL: 100, 230
at BR: 260, 230
L -> T, T -> R, L -> R, R -> BR, BR -> BL, L -> BL, L -> BR
highlight: L T R BR BL
:::

::: callout key One walk decides it
**Strongly connected** ⇔ a *closed* walk through every vertex. **Unilaterally
connected** ⇔ a walk (not necessarily closed) through every vertex. **Weakly
connected** ⇔ the underlying graph is connected. To prove one, show the walk; to
disprove one, show a pair that fails.
:::

## The longest-path technique

The second proof above worked by picking the "biggest" object of some kind and showing
that anything missing would make an even bigger one. This **extreme choice** is one of
the most useful tricks in graph theory. Its usual form picks a longest path.

::: define Longest path and maximal path | 最长路径与极大路径
A **longest path** of a graph $G$ is a path (Lesson 4.3) of greatest length in $G$ (or
the longest among the paths through a given vertex or edge). A **maximal path** is a
path that can't be extended at either end: no edge leads from an end to a vertex not
already on it. A related choice is the walk that passes through the most vertices, each
vertex counted once. These definitions apply to undirected and directed graphs alike.
:::

A longest path is always maximal, but a maximal path need not be longest. The key fact
is about the ends: **if $L$ is a maximal (for example a longest) path, every neighbour
of an end of $L$ lies on $L$** — otherwise you could step to it and lengthen $L$.

::: callout pitfall Maximal is not maximum
In the path $a-b-c-d$ with an extra edge $b-e$, the path $e\,b\,a$ can't be extended
(both ends' neighbours are on it), so it is maximal; but $e\,b\,c\,d$ is longer. Only a
longest path is guaranteed to be both.
:::

::: example Minimum degree 3 forces a long cycle | 例 5.3.4
Let $G$ be a simple undirected graph of order $n\ge4$ with $\delta(G)\ge3$ (every
vertex has degree at least 3, Lesson 4.2). Prove that $G$ has a cycle of length at least
4.
== Take a longest path ==
Let $L=v_1v_2\cdots v_i\cdots v_k$ be a longest path in $G$.
== Look at an end ==
Every neighbour of $v_k$ lies on $L$: a neighbour off $L$ would extend $L$, but $L$ is
longest. $G$ is simple, so $v_k$ has at least $\delta(G)\ge3$ *different* neighbours,
all among $v_1,\dots,v_{k-1}$.
== The first neighbour ==
Let $v_i$ be the neighbour of $v_k$ that comes first on $L$. Since $v_k$ has at least
3 neighbours among $v_i,\dots,v_{k-1}$, there are at least 3 vertices from $v_i$ to
$v_{k-1}$, so $i\le k-3$.
== Close the cycle ==
$v_iv_{i+1}\cdots v_kv_i$ is a cycle with $k-i+1\ge4$ edges. ∎
:::

The slide's picture shows the same thing from the other end: on a longest path
$v_0v_1\cdots v_l$, the neighbours $v_k,\dots,v_t$ of $v_0$ all lie on the path, and an
edge from $v_0$ to a far one closes a long cycle.

The same argument proves more, and the slides ask for both versions:

- **General form.** If $G$ is simple and $\delta(G)\ge m$ (with $m\ge2$), then $G$ has
  a cycle of length at least $m+1$. The end $v_k$ of a longest path has at least $m$
  neighbours on it; the first, $v_i$, has $i\le k-m$, so the cycle
  $v_i\cdots v_kv_i$ has $k-i+1\ge m+1$ edges.
- **People in a ring.** Of $n$ people, each knows at least $m\ge2$ of the others.
  Then some $m+1$ of them can sit round a table so that each knows both neighbours.
  Make a graph: people are vertices, "know each other" is an edge. It is simple with
  $\delta\ge m$, so it has a cycle of length at least $m+1$; seat the people of that
  cycle in its order.

::: callout note "m + 1 people" means at least m + 1
The slide asks for $m+1$ people in a ring. The proof gives a ring of **at least**
$m+1$ people (the cycle may be longer), and that is the correct reading: cutting a
longer cycle down to exactly $m+1$ of its people would break the ring.
:::

::: callout exam Proofs by extreme choice
"Prove $G$ has a cycle of length $\ge k$" or "prove some path/walk exists" questions
usually start with *"consider a longest path $L=v_1\cdots v_k$"*. Write down why the
end's neighbours are on $L$ (maximality) and where the first one sits; that is most of
the marks.
:::

## Strong, unilateral and weak components

An undirected graph falls into components (Lesson 4.4). A digraph has three kinds,
one for each level of connectivity.

::: define Strong, unilateral and weak components | 强连通分支、单向连通分支与弱连通分支
A maximal strongly connected subgraph of $D$ is a {{term strong component | 强连通分支}}
of $D$; a maximal unilaterally connected subgraph is a
{{term unilateral component | 单向连通分支}} (单向分支); a maximal weakly connected
subgraph is a **weak component** (弱连通分支). "Maximal" means it is not part of a
bigger subgraph of the same kind.
:::

They behave differently:

| Kind | How to find it | Can two share a vertex? |
| --- | --- | --- |
| Strong component | the classes of $\leftrightarrow$, with the arcs inside each class | No: they partition $V$ |
| Unilateral component | grow sets in which every pair is reachable one way | Yes |
| Weak component | the components of the underlying graph | No |

Because $\leftrightarrow$ is an equivalence relation, every vertex lies in exactly one
strong component. But an arc between two strong components belongs to none of them.

::: example Unilateral components (slide 12-014)
Find the unilateral components of the three digraphs of Definition 5.3.10.
== Unilaterally connected: a → b, c → a, b ⇄ d ==
The whole digraph is unilaterally connected, so it is its own single unilateral
component.
== Strongly connected 4-cycle ==
Strongly connected, hence unilaterally connected: one component, the whole graph.
== Weakly connected: b → a, d → a, b → c ==
$\{a,b,c\}$ fails ($a$ and $c$ don't reach each other), $\{a,b,d\}$ fails ($b$, $d$),
and so does any set containing both $c$ and $d$. The largest sets that work are
$\{a,d\}$ (with $d\to a$), $\{a,b\}$ (with $b\to a$) and $\{b,c\}$ (with $b\to c$):
three unilateral components, and they overlap in $a$ and $b$.
:::

::: graph Strong components of a → b, c → a, b ⇄ d: {a}, {c} and {b, d}
at a: 100, 50
at b: 260, 50
at c: 100, 210
at d: 260, 210
a -> b, c -> a, b -> d, d -> b
highlight: b d b
:::

::: example Strong components (slide 12-015)
Find the strong components of: (1) $a\to b$, $c\to a$, $b\leftrightarrow d$; (2) the
4-cycle $a\to b\to c\to d\to a$; (3) the path $d\to a\to b\to c$.
== (1) ==
$b\leftrightarrow d$ and no other pair is mutually reachable (nothing returns to $a$
or $c$). Classes $\{a\}$, $\{c\}$, $\{b,d\}$: three strong components, the last with
its two arcs. The arcs $c\to a$ and $a\to b$ are in none.
== (2) ==
Strongly connected: one strong component, the whole cycle.
== (3) ==
Along a path nothing comes back, so no two vertices are mutually reachable: four strong
components $\{a\}$, $\{b\}$, $\{c\}$, $\{d\}$, each a single vertex, and no arc lies in
any of them.
:::

::: callout pitfall Components that overlap
Strong and weak components split the vertex set; unilateral components may share
vertices, as in the third example ($a$ and $b$ each lie in two). Don't force them into
a partition.
:::

## Bipartite graphs

Imagine a dance class where every pair dancing is one leader and one follower, or a
timetable where every edge joins a student to a course. The vertices fall into two
sides, and no edge stays inside a side. Such graphs are everywhere: the slides show a
neural network's layers (edges only between consecutive layers — put the odd layers on
one side and the even layers on the other).

::: define Bipartite graph | 二部图
An undirected graph $G=\langle V,E\rangle$ is **bipartite** (also 二分图, 偶图, 双图,
双色图) if $V$ can be split into two sets $V_1$, $V_2$ — with $V_1\cup V_2=V$,
$V_1\cap V_2=\varnothing$, $V_1\ne\varnothing$, $V_2\ne\varnothing$ — so that every
edge has one end in $V_1$ and the other in $V_2$. $V_1$ and $V_2$ are the
{{term complementary vertex subsets | 互补顶点子集}}, and $G$ is written
$\langle V_1,V_2,E\rangle$. (Definition 5.3.11 in the textbook.)
:::

Some consequences of the definition:

- A bipartite graph has **no loops** (a loop's two ends are in the same set).
  Parallel edges are allowed.
- The two sets must be non-empty, so the trivial graph (one vertex) is not bipartite,
  but the **null graph of order $n\ge2$** (no edges at all) is: split the vertices any
  way into two non-empty sets.
- Isolated vertices can go on either side.

::: graph A bipartite graph from the slides: x1, x2 on top, y1, y2, y3 below
row: x1 x2
row: y1 y2 y3
x1 -- y1, x1 -- y2, x2 -- y1, x2 -- y3
:::

::: define Complete bipartite graph | 完全二部图
A simple bipartite graph $\langle V_1,V_2,E\rangle$ in which every vertex of $V_1$ is
adjacent to every vertex of $V_2$ is a **complete bipartite graph**, written $K_{r,s}$
with $r=|V_1|$ and $s=|V_2|$.
:::

::: graph The complete bipartite graph K₂,₆
row: a b
row: 1 2 3 4 5 6
a -- 1, a -- 2, a -- 3, a -- 4, a -- 5, a -- 6
b -- 1, b -- 2, b -- 3, b -- 4, b -- 5, b -- 6
show: degrees
:::

::: formula Edges of a complete bipartite graph | 完全二部图的边数
$$|E(K_{r,s})|=rs,\qquad |V(K_{r,s})|=r+s$$
--
$r,\ s$ | the sizes of the two sides $V_1$, $V_2$
$rs$ | one edge for each pair (vertex of $V_1$, vertex of $V_2$)
:::

So $K_{2,6}$ has $2\times6=12$ edges and $K_{3,5}$ has 15. In $K_{r,s}$ each vertex of
$V_1$ has degree $s$ and each vertex of $V_2$ degree $r$; the degree sum $rs+sr=2rs$
agrees with the handshake theorem (Lesson 4.2). The slides write $K_{3,5}$ and
$K_{2,6}$ as "K35" and "K26".

## Recognising bipartite graphs: no odd cycles

Walk round a cycle in a bipartite graph: every edge switches sides, so you are back on
your starting side only after an even number of steps. An odd cycle is therefore
impossible. The surprise is that this is the *only* obstacle.

::: theorem Odd-cycle criterion | 二部图的判定定理
Let $n\ge2$. An undirected graph $G$ of order $n$ is bipartite if and only if $G$ has
no odd cycle (a cycle of odd length, 奇圈). (Theorem 5.3.4 in the textbook.)
:::

::: graph A bipartite graph with the 4-cycle a 1 b 2 a marked
row: a b c
row: 1 2 3 4 5
a -- 1, a -- 2, a -- 3, a -- 4, a -- 5, b -- 1, b -- 2, b -- 4, c -- 4, c -- 5
highlight: a 1 b 2 a
:::

*Proof of necessity* (bipartite ⇒ no odd cycle). Let $\{V_1,V_2\}$ split $V$ so that
every edge joins $V_1$ to $V_2$.
1. Let $v_1v_2v_3\cdots v_nv_1$ be a cycle of length $n$ in $G$, and say $v_1\in V_1$.
2. Each edge changes sides, so $v_2\in V_2$, $v_3\in V_1$, …: the vertices with odd
   index are in $V_1$, those with even index in $V_2$.
3. The last edge $v_nv_1$ must also change sides, so $v_n\in V_2$: $n$ is even. (The
   slide puts it as: the cycle's edges come in pairs, the two edges at each
   even-indexed vertex.) So every cycle has even length.

*Proof of sufficiency* (no odd cycle ⇒ bipartite). *Idea:* pick a vertex $u$ and sort
the others by whether their distance from $u$ is even or odd; an edge inside one group
would close an odd cycle.

1. We may assume $G$ is connected: otherwise split each component this way and put
   the pieces together (choosing sides so that both sets are non-empty; $n\ge2$ makes
   this possible).
2. Pick a vertex $u$ and let (with $d$ the distance of Lesson 4.4)
   $$V_1=\{v\in V\mid d(u,v)\text{ is even}\},\qquad V_2=\{v\in V\mid d(u,v)\text{ is odd}\}.$$
   They split $V$ ($u\in V_1$; any neighbour of $u$ is in $V_2$).
3. Suppose two different vertices $v,w\in V_2$ are joined by an edge $vw$. Let $P$ be a
   shortest path from $u$ to $v$ and $Q$ a shortest path from $u$ to $w$; both have odd
   length.
4. Let $u_1$ be the last vertex (going from $u$) that $P$ and $Q$ share; if they share
   only $u$, then $u_1=u$. The parts of $P$ and $Q$ from $u$ to $u_1$ are both shortest
   paths from $u$ to $u_1$, so they have the same length.
5. So the rest of $P$ (from $u_1$ to $v$), call it $P_1$, and the rest of $Q$ (from $u_1$
   to $w$), $Q_1$, have lengths of the same parity: odd minus the same number.
6. $P_1$, the edge $vw$ and $Q_1$ backwards form a cycle of length
   $|P_1|+|Q_1|+1$: (even) $+1$, which is odd. That contradicts the assumption, so no
   edge joins two vertices of $V_2$.
7. The same argument with even lengths shows no edge joins two vertices of $V_1$. So
   every edge goes between $V_1$ and $V_2$: $G$ is bipartite. ∎

::: callout note The slides prove one half of step 7
The slides only treat two vertices of $V_2$. For $v,w\in V_1$ the paths $P$, $Q$ have
even length, $P_1$ and $Q_1$ again have equal parity, and the cycle is odd in the same
way.
:::

::: graph A hexagon split by distance from a: {a, c, e} and {b, d, f}
at a: 110, 30
at b: 250, 30
at c: 320, 130
at d: 250, 230
at e: 110, 230
at f: 40, 130
a -- b, b -- c, c -- d, d -- e, e -- f, f -- a
highlight: a
:::

::: example Splitting a hexagon by distance
Use the proof's recipe on the hexagon $a\,b\,c\,d\,e\,f$ (sides $ab, bc, cd, de, ef, fa$).
Then add the chord $bd$ and see what happens.
== Distances from a ==
$d(a,a)=0$, $d(a,b)=d(a,f)=1$, $d(a,c)=d(a,e)=2$, $d(a,d)=3$.
== The two groups ==
Even: $V_1=\{a,c,e\}$; odd: $V_2=\{b,d,f\}$. Every side of the hexagon joins the two
groups, so the hexagon is bipartite (it is the even cycle $C_6$).
== Adding a chord inside a group ==
The chord $bd$ joins two vertices of $V_2$, and closes the odd cycle $b\,c\,d\,b$ of
length 3. So the hexagon with chord $bd$ (or $ce$) is not bipartite — exactly the case
the proof rules out. A chord between the groups, such as $ad$, keeps it bipartite.
:::

In practice you test a graph by **two-colouring** it: colour one vertex, give its
neighbours the other colour, their neighbours the first, and so on. If an edge ever
joins two vertices of the same colour, you have found an odd cycle and the graph is
not bipartite; if not, the colours are $V_1$ and $V_2$.

::: graph In-class question: is this graph bipartite?
at TL: 100, 40
at TR: 260, 40
at L: 40, 130
at R: 320, 130
at BL: 100, 220
at BR: 260, 220
L -- TL, TL -- TR, TR -- R, R -- BR, BR -- BL, BL -- L, TL -- BL, TR -- BR, L -- R
highlight: L TL BL L
:::

::: example The in-class question
The hexagon above has the six sides, the two vertical edges $TL\,BL$ and $TR\,BR$, and
the horizontal edge $L\,R$ (it crosses the vertical edges without meeting them). Is it
bipartite?
== Look for an odd cycle ==
$L\,TL$, $TL\,BL$ and $BL\,L$ are all edges: $L\,TL\,BL\,L$ is a triangle, a cycle
of length 3.
== Conclude ==
By the odd-cycle criterion the graph is not bipartite: answer **×** (option B, as in
Rain Classroom).
:::

::: callout exam Bipartite questions
Expect "is this graph bipartite?" with a picture: find a triangle or 5-cycle to say
no, or show the two sets to say yes. Also common: the edge count $rs$ of $K_{r,s}$,
and the fact that an $n$-vertex null graph ($n\ge2$) counts as bipartite.
:::

::: cards Directed connectivity and bipartite graphs
Reachable (可达) $v_i\to v_j$ :: There is a walk from $v_i$ to $v_j$ along the arrows; every vertex reaches itself.
Mutual reachability $\leftrightarrow$ :: $v_i\to v_j$ and $v_j\to v_i$; an equivalence relation on $V$.
Distance in a digraph $d\langle v_i,v_j\rangle$ :: Length of a shortest walk from $v_i$ to $v_j$ ($\infty$ if none); not symmetric.
Weakly connected (弱连通) :: The underlying graph (arrows ignored) is connected.
Unilaterally connected (单向连通) :: For every two vertices at least one reaches the other.
Strongly connected (强连通) :: Every two vertices are mutually reachable.
Order of the three connectivities :: Strong ⇒ unilateral ⇒ weak; neither converse holds.
Theorem 5.3.2 (strong connectivity test) :: $D$ is strongly connected iff it has a closed walk through every vertex.
Theorem 5.3.3 (unilateral connectivity test) :: $D$ is unilaterally connected iff it has a walk through every vertex.
Longest-path technique :: On a longest (maximal) path every neighbour of an end lies on the path.
Simple graph with minimum degree $\delta\ge m$ :: Has a cycle of length at least $m+1$ (Example 5.3.4: $\delta\ge3$ gives length $\ge4$).
Strong vs unilateral components :: Strong components (classes of $\leftrightarrow$) partition $V$; unilateral components may overlap.
Bipartite graph (二部图) :: $V$ splits into non-empty $V_1$, $V_2$ with every edge between them.
Complete bipartite graph $K_{r,s}$ :: Every vertex of $V_1$ ($r$ of them) joined to every vertex of $V_2$ ($s$); $rs$ edges.
Theorem 5.3.4 (bipartite test) :: For $n\ge2$: bipartite iff there is no odd cycle.
:::

::: quiz Check yourself
? Figure 5.3.4 (c) has arcs $T\to L$, $T\to R$, $R\to L$, $BL\to L$, $BL\to BR$, $BR\to R$, $BR\to L$. Which is the strongest statement that holds?
- [ ] Strongly connected
- [ ] Unilaterally connected
- [x] Weakly connected only
- [ ] Not connected at all
> $L$ has no outgoing arcs; $T$ reaches only $T,L,R$ and $BL$ reaches only $BL,L,BR,R$, so neither of $T$, $BL$ reaches the other: not unilateral. Without arrows the pentagon is connected, so it is weakly connected.

? Which implications are true for every digraph? (tick all)
- [x] Strongly connected ⇒ unilaterally connected
- [x] Unilaterally connected ⇒ weakly connected
- [ ] Weakly connected ⇒ unilaterally connected
- [ ] Unilaterally connected ⇒ strongly connected
> Mutual reachability gives one-way reachability, which gives a walk in the underlying graph. The converses fail: $b\to a$, $d\to a$, $b\to c$ is weak only; $a\to b$, $c\to a$, $b\leftrightarrow d$ is unilateral but not strong.

? In the directed 4-cycle $a\to b\to c\to d\to a$, what is the distance $d\langle b,a\rangle$?
answer: 3
> The only way from $b$ back to $a$ is $b\,c\,d\,a$, three arcs. In the other direction $d\langle a,b\rangle=1$.

? How many strong components does $a\to b$, $c\to a$, $b\to d$, $d\to b$ have?
answer: 3
> Only $b$ and $d$ are mutually reachable. The classes of $\leftrightarrow$ are $\{a\}$, $\{c\}$, $\{b,d\}$.

? How many unilateral components does $b\to a$, $d\to a$, $b\to c$ have?
answer: 3
> The maximal vertex sets in which every pair is reachable one way are $\{a,d\}$, $\{a,b\}$, $\{b,c\}$. They overlap: unilateral components needn't partition $V$.

? A digraph has a closed walk passing through every vertex. It is:
text: strongly connected | strong | strongly
> Theorem 5.3.2: a closed walk through every vertex lets every vertex reach every other and come back.

? In-class question: the hexagon with the two vertical edges $TL\,BL$, $TR\,BR$ and the horizontal edge $L\,R$. Is it bipartite?
- [ ] Yes (√)
- [x] No (×)
> $L\,TL\,BL\,L$ is a triangle, an odd cycle, so by Theorem 5.3.4 the graph is not bipartite. Rain Classroom's answer is B (×).

? Which of these graphs are bipartite? (tick all)
- [x] The 6-cycle $C_6$
- [ ] The 5-cycle $C_5$
- [x] $K_{2,6}$
- [ ] The complete graph $K_3$
- [x] The null graph on 3 vertices (no edges)
- [x] Any tree with at least 2 vertices
> $C_5$ and $K_3$ are odd cycles. $C_6$ alternates sides; $K_{2,6}$ is bipartite by definition; a null graph of order $\ge2$ splits any way; a tree has no cycles at all, so no odd ones.

? How many edges does $K_{3,5}$ have?
answer: 3*5
> Every one of the 3 vertices on one side is joined to each of the 5 on the other: $rs=15$.

? How many edges does the complete bipartite graph $K_{n,n}$ have, in terms of $n$?
expression: n^2
variables: n
> $K_{r,s}$ has $rs$ edges; with $r=s=n$ that is $n^2$.

? A simple graph has minimum degree $\delta(G)\ge5$. Its longest cycle is guaranteed to have length at least:
answer: 6
> Take a longest path $v_1\cdots v_k$. The end $v_k$ has at least 5 neighbours, all on the path; the first, $v_i$, has $i\le k-5$, so $v_i\cdots v_kv_i$ has at least $m+1=6$ edges. ($K_6$ shows 6 can't be improved.)
:::

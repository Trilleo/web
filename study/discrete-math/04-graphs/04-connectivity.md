---
title: Connectivity
zh: 图的连通性
summary: Connected vertices and graphs, components, shortest paths and distance, the farmer's river crossing as a graph, vertex and edge cut sets, cut vertices and bridges, vertex and edge connectivity κ and λ, and the theorem κ ≤ λ ≤ δ with graphs that reach any allowed values.
source: 图5-2 (§5.3 图的连通性), 2026-10-08 and 2026-10-13
---

Is a network in one piece, and how hard is it to break? This lesson answers both
questions for undirected graphs. "In one piece" becomes *connected*: every two vertices
are joined by a walk (Lesson 4.3). A graph that isn't in one piece falls into
*components*, and inside a component we can measure how far apart two vertices are (the
*distance*). "How hard to break" becomes *connectivity*: the fewest vertices ($\kappa$)
or edges ($\lambda$) whose removal splits the graph. Think of a road network, a computer
network or a power grid: a single junction or cable whose failure cuts the network in
two is a weak point, and engineers want networks that survive several failures. The
lesson ends with the theorem $\kappa \le \lambda \le \delta$, which links the two measures
to the smallest degree. Directed graphs get their own kinds of connectedness in
Lesson 4.5.

## Connected vertices and connected graphs

Two cities are "connected" if you can drive from one to the other, however long the
trip. The graph version only asks for some walk.

::: define Connected vertices | 连通
Let $G = \langle V, E\rangle$ be an undirected graph. Two vertices $u, v \in V$ are
**connected** if there is a walk between them; we write $u \sim v$. By convention every
vertex is connected to itself: $v \sim v$ for all $v \in V$ (Definition 5.3.1).
:::

By Corollary 5.2.2 (Lesson 4.3), "there is a walk" and "there is a path" mean the same
thing here, so you may check either.

::: define Connected graph | 连通图
An undirected graph $G$ is **connected** if it is the trivial graph (one vertex, no
edges; Lesson 4.1) or every two of its vertices are connected. Otherwise $G$ is
**disconnected** (非连通图).
:::

The slides draw the same five vertices twice. On the left the two triangles $u a b$ and
$b v c$ share the vertex $b$, so you can get from anywhere to anywhere through $b$: the
graph is connected, and in particular $u \sim v$. On the right the edge $b v$ is gone and
$v c$ hangs on its own: there is no walk from $u$ to $v$.

::: graph u and v connected: a connected graph (two triangles sharing b)
at u: 40, 60
at a: 40, 200
at b: 180, 130
at v: 320, 60
at c: 320, 200
u -- a, u -- b, a -- b, b -- v, b -- c, v -- c
highlight: u b v
:::

::: graph u and v not connected: a disconnected graph
at u: 40, 60
at a: 40, 200
at b: 180, 130
at v: 320, 60
at c: 320, 200
u -- a, u -- b, a -- b, v -- c
:::

The relation $\sim$ on $V$ has the three properties of an equivalence relation
(Lesson 2.6): it is reflexive ($v \sim v$ by convention), symmetric (a walk from $u$ to $v$
read backwards goes from $v$ to $u$) and transitive (a walk from $u$ to $v$ followed by a
walk from $v$ to $w$ is a walk from $u$ to $w$). So it splits $V$ into equivalence
classes, and those classes are the "pieces" of the graph.

## Components

::: define Connected component | 连通分支
Let $G = \langle V, E\rangle$ be an undirected graph and let $V_1, \dots, V_k$ be the
equivalence classes of $V$ under the connectivity relation $\sim$. Each induced subgraph
$G[V_i]$ (Lesson 4.1) is a **connected component** of $G$, and the number of components
is written $p(G)$ (Definition 5.3.2).
:::

Each component is connected, and no edge runs between two different components. So:

- $G$ is connected exactly when $p(G) = 1$; a disconnected graph has $p(G) \ge 2$.
- Among all undirected graphs with $n$ vertices, the null graph $N_n$ (no edges) has the
  most components: every vertex is a component by itself, $p(N_n) = n$.

::: example Count the components
The slides' two pictures: (1) vertices $V_1, \dots, V_5$ with edges $V_1V_4$ and
$V_2V_5$; (2) the triangle $uab$ and the separate edge $vc$.
== Graph (1) ==
The classes of $\sim$ are $\{V_1, V_4\}$, $\{V_2, V_5\}$ and $\{V_3\}$ (an isolated
vertex is a component on its own). So $p = 3$.
== Graph (2) ==
The classes are $\{u, a, b\}$ and $\{v, c\}$: $p = 2$.
:::

::: graph Graph (1): three components, one of them the isolated vertex V3
vertices: V1 V2 V3 V4 V5
V1 -- V4, V2 -- V5
:::

## Shortest paths and distance

When two vertices are connected, there may be many walks between them. The shortest
one tells us how far apart they are, just as a map gives the distance between two
towns along the shortest route.

::: define Shortest path and distance | 短程线与距离
Let $u, v$ be vertices of an undirected graph $G$. If $u \sim v$, a shortest walk
between them is a **shortest path** (短程线) between $u$ and $v$, and its length is the
**distance** $d(u, v)$. If $u$ and $v$ are not connected, $d(u, v) = +\infty$
(Definition 5.3.3).
:::

A shortest walk never repeats a vertex (otherwise we could cut out the detour, as in
Lesson 4.3), so a shortest path really is a path, and $d(u,v) \le n-1$ whenever it is
finite.

::: law Properties of distance | 距离的性质
For all vertices $u, v, w$ of $G$:
1. non-negative: $d(u,v) \ge 0$, with equality exactly when $u = v$;
2. symmetric: $d(u,v) = d(v,u)$;
3. the triangle inequality: $d(u,v) + d(v,w) \ge d(u,w)$.
:::

The triangle inequality says a detour through $v$ can't beat the direct shortest route:
a shortest path from $u$ to $v$ followed by one from $v$ to $w$ is *some* walk from $u$
to $w$, so the shortest one is at most that long.

::: example Distances in the two triangles
In the connected graph above (triangles $uab$ and $bvc$ sharing $b$), find $d(u,a)$,
$d(u,v)$, $d(a,c)$ and $d(b,b)$. In the disconnected one, find $d(u,v)$.
== Neighbours ==
$u$ and $a$ are adjacent: $d(u,a) = 1$.
== Through b ==
$u$ and $v$ are not adjacent, but $u\,b\,v$ is a walk of length 2: $d(u,v) = 2$.
Likewise $a\,b\,c$ gives $d(a,c) = 2$. Every route between the two triangles passes
through $b$, so no pair is further apart than 2.
== Zero and infinity ==
$d(b,b) = 0$ (the walk of length 0). In the disconnected graph there is no walk from
$u$ to $v$, so $d(u,v) = +\infty$.
:::

::: callout pitfall Distance is the shortest walk, not any walk
$d(u,v)$ is the length of the *shortest* walk. A walk of length 5 from $u$ to $v$ only
tells you $d(u,v) \le 5$. And "distance" in a graph counts edges (or, in weighted
graphs later, weights); it has nothing to do with how far apart the dots are drawn.
:::

## A puzzle as a graph: the farmer's river crossing

Graphs model far more than maps. The slides' Example 5.3.1 is an old puzzle.

A farmer with a dog, a sheep and a basket of cabbages comes to the south bank of a
river. The boat can carry the farmer and **one** of the three things. Left without the
farmer, the dog will bite the sheep, and the sheep will eat the cabbages. How can the
farmer get all three safely across, and how many crossings does it take at least?

::: example Solve the river crossing with a graph
Model the situations as vertices and the crossings as edges; then a solution is a walk,
and the fewest crossings is a distance.
== Vertices: the safe states ==
Write a state by what is on the **south** bank (F farmer, D dog, S sheep, C cabbages);
the rest is on the north bank. For example FDSC means everything is still in the south,
FS means the farmer and the sheep are in the south and the dog and cabbages in the
north, and ∅ means everything has crossed. Of the $2^4 = 16$ ways to split the four,
a state is safe unless the farmer is on the other side of a dog–sheep or sheep–cabbage
pair. That rules out 6 (DS, SC, DSC and their mirror images FC, FD, F), leaving
**10 states**: with the farmer in the south FDSC, FS, FDC, FSC, FDS, and with the farmer
in the north ∅, DC, S, D, C.
== Edges: one crossing ==
Two states are joined when one crossing turns one into the other: the farmer rows
across, alone or with one thing from his own bank, and the new state must be safe.
Every crossing moves the farmer, so every edge joins the two rows. There are 10 edges:
FDSC–DC, FS–∅, FS–S, FDC–DC, FDC–D, FDC–C, FSC–S, FSC–C, FDS–S, FDS–D.
== A shortest walk ==
A walk from FDSC to ∅ is a plan for the farmer, and the distance $d(\text{FDSC}, \varnothing)$
is the least number of crossings. Searching outwards from FDSC (breadth first): DC is
at distance 1, FDC at 2, D and C at 3, FDS and FSC at 4, S at 5, FS at 6 and ∅ at 7.
One shortest path is
$$\text{FDSC} \to \text{DC} \to \text{FDC} \to \text{D} \to \text{FDS} \to \text{S} \to \text{FS} \to \varnothing.$$
== In words ==
Take the sheep over; come back alone; take the cabbages over; bring the sheep back;
take the dog over; come back alone; take the sheep over. That is **7 crossings** (three
round trips and a final one-way trip). The other shortest solution swaps the roles of
the dog and the cabbages.
:::

::: graph The river-crossing graph: top row farmer in the north, bottom row farmer in the south; a shortest solution highlighted
row: none DC S D C
row: FDSC FS FDC FSC FDS
FDSC -- DC, FS -- none, FS -- S, FDC -- DC, FDC -- D, FDC -- C, FSC -- S, FSC -- C, FDS -- S, FDS -- D
highlight: FDSC DC FDC D FDS S FS none
label none: ∅
:::

::: callout note What the slides leave open
The slide asks for the minimum number of round trips but doesn't state it. Counting
crossings, the distance is 7: the boat goes back and forth 3 times and then crosses once
more. The slides' graph matches the 10 edges listed above.
:::

## Vertex cut sets and cut vertices

Now the second question: how easy is it to break a graph? Removing vertices (with their
edges, $G - V'$ from Lesson 4.1) or edges can raise the number of components. We want the
*essential* sets: ones that break the graph, with nothing unnecessary in them.

::: define Vertex cut set | 点割集
Let $G = \langle V, E\rangle$ be an undirected graph. A set $V' \subset V$ is a
**vertex cut set** of $G$ if $p(G - V') > p(G)$ and, for every proper subset
$V'' \subset V'$, $p(G - V'') = p(G)$ (Definition 5.3.4). If $V' = \{v\}$ is a vertex
cut set, $v$ is a {{term cut vertex | 割点}}.
:::

So a vertex cut set has two parts to check: removing it **increases** the number of
components, and it is **minimal**, meaning removing any part of it doesn't.

::: graph Figure 5.3.2: a 4-cycle v1 v2 v3 v4 with a tail v3 – v5 – v6
at v1: 50, 50
at v2: 170, 50
at v3: 170, 190
at v4: 50, 190
at v5: 260, 190
at v6: 330, 100
v1 -- v2: e1, v2 -- v3: e2, v3 -- v4: e3, v4 -- v1: e4, v3 -- v5: e5, v5 -- v6: e6
:::

::: example Which sets are vertex cut sets?
In figure 5.3.2, are $\{v_2, v_4\}$, $\{v_3\}$, $\{v_5\}$, $\{v_1, v_3\}$, $\{v_2, v_3\}$
vertex cut sets? Which vertices are cut vertices?
== {v₂, v₄} ==
Removing both cuts $v_1$ off from the rest: $p$ goes from 1 to 2. Removing only $v_2$
or only $v_4$ leaves the graph connected (the cycle still has its other side). So
$\{v_2, v_4\}$ **is** a vertex cut set.
== {v₃} and {v₅} ==
Removing $v_3$ separates $\{v_1, v_2, v_4\}$ from $\{v_5, v_6\}$; removing $v_5$ isolates
$v_6$. Both are vertex cut sets, so $v_3$ and $v_5$ are **cut vertices**. (A
one-element set is automatically minimal: its only proper subset is $\varnothing$.)
== {v₁, v₃} and {v₂, v₃} ==
Each breaks the graph, but each contains $\{v_3\}$, which already breaks it. They are not
minimal, so they are **not** vertex cut sets.
== All of them ==
Checking every set, the vertex cut sets of this graph are exactly $\{v_3\}$, $\{v_5\}$ and
$\{v_2, v_4\}$; the cut vertices are $v_3$ and $v_5$.
:::

::: callout pitfall Minimal, not just "it breaks the graph"
A set that disconnects the graph is not automatically a cut set: drop any vertex that
isn't needed and check again. Also, $K_n$ has **no** vertex cut set at all: removing any
vertices from it leaves a smaller complete graph, which is still connected.
:::

## Edge cut sets and bridges

The same idea with edges. Removing edges never removes vertices, so here the
condition is $E' \subseteq E$ (removing all the edges is allowed).

::: define Edge cut set | 边割集
Let $G = \langle V, E\rangle$ be an undirected graph. A set $E' \subseteq E$ is an
**edge cut set** (or just a **cut set**, 割集) of $G$ if $p(G - E') > p(G)$ and, for every
proper subset $E'' \subset E'$, $p(G - E'') = p(G)$ (Definition 5.3.5). If $E' = \{e\}$,
the edge $e$ is a **cut edge** (割边) or {{term bridge | 桥}}.
:::

::: example Which edge sets are cut sets?
In figure 5.3.2, are $\{e_6\}$, $\{e_5\}$, $\{e_2, e_3\}$, $\{e_1, e_2\}$, $\{e_3, e_4\}$,
$\{e_1, e_4, e_3\}$ cut sets? Which edges are bridges?
== One edge ==
Removing $e_6$ isolates $v_6$; removing $e_5$ separates $\{v_5, v_6\}$ from the cycle.
Both are cut sets: $e_5$ and $e_6$ are **bridges**. No edge of the 4-cycle is a bridge:
the cycle's other side still joins its ends.
== Two edges of the cycle ==
$\{e_2, e_3\}$ separates $\{v_3, v_5, v_6\}$ from $\{v_1, v_2, v_4\}$; $\{e_1, e_2\}$
isolates $v_2$; $\{e_3, e_4\}$ isolates $v_4$. Removing just one of the two leaves the
graph connected, so all three **are** cut sets.
== Three edges ==
$\{e_1, e_4, e_3\}$ does break the graph, but its subset $\{e_1, e_4\}$ already isolates
$v_1$. Not minimal: **not** a cut set.
:::

::: example The slide's exercise on graph G
In the graph below, which of $S_1 = \{fe, ed, fd\}$, $S_2 = \{fe, ed\}$,
$S_3 = \{af, ag, bg, bc\}$ are cut sets?
== S₂ = {fe, ed} ==
$e$ has degree 2, and these are its two edges: removing them isolates $e$. Removing
only one leaves $e$ attached. A cut set: **√**.
== S₁ = {fe, ed, fd} ==
It contains $S_2$, which already isolates $e$, so it isn't minimal: **×**.
== S₃ = {af, ag, bg, bc} ==
These are all the edges leaving $\{a, b\}$, so removing them separates $\{a, b\}$ (still
joined by $ab$) from $\{c, d, e, f, g\}$. Put any one of the four back and the two sides
are joined again, so it is minimal: **√**.
:::

::: graph Graph G of the slides (7 vertices, 11 edges)
at a: 40, 46
at f: 176, 30
at e: 323, 105
at g: 162, 137
at b: 40, 222
at c: 162, 245
at d: 291, 242
a -- f, a -- g, a -- b, f -- g, f -- e, f -- d, g -- b, g -- d, e -- d, b -- c, c -- d
show: degrees
:::

::: example How many pieces can one removal make?
The in-class fill-in questions: in a connected graph with $n$ vertices, (1) removing one
vertex makes at most how many components? (2) Removing one edge?
== One vertex ==
At most $n-1$: there are only $n-1$ vertices left. The star $K_{1,n-1}$ (one centre
joined to $n-1$ leaves) reaches it: removing the centre leaves $n-1$ isolated vertices.
== One edge ==
At most **2**. Removing $e = uv$ only cuts the walks that used $e$; every vertex can
still reach $u$ or $v$ (follow its walk to $u$ or $v$ and stop just before $e$), so at
most the piece containing $u$ and the piece containing $v$ remain.
:::

## Vertex and edge connectivity

Cut sets come in different sizes. The size of the *smallest* one measures how robust the
graph is: a graph whose smallest vertex cut set has 3 vertices survives any 2 vertex
failures.

::: define Vertex connectivity | 点连通度
Let $G$ be a connected undirected graph that is not complete. Its **vertex
connectivity** (or just **connectivity**, 连通度) is
$$\kappa(G) = \min\{\,|V'| \mid V' \text{ is a vertex cut set of } G\,\},$$
often written $\kappa$ (Greek kappa) (Definition 5.3.6). By convention $\kappa(K_n) = n-1$
for $n \ge 1$, and a disconnected graph has $\kappa = 0$. If $\kappa(G) \ge k$, $G$ is
**$k$-connected** ({{term k-connected graph | k-连通图}}; $k$ a non-negative integer).
:::

The convention for $K_n$ is needed because $K_n$ has no vertex cut set, and $n-1$ is the
natural value: you have to delete $n-1$ vertices to leave a single (trivial) vertex.

::: define Edge connectivity | 边连通度
Let $G$ be a connected undirected graph. Its **edge connectivity** is
$$\lambda(G) = \min\{\,|E'| \mid E' \text{ is an edge cut set of } G\,\},$$
often written $\lambda$ (Greek lambda) (Definition 5.3.7). A disconnected graph has
$\lambda = 0$. If $\lambda(G) \ge r$, $G$ is **$r$-edge-connected**
({{term r-edge-connected graph | r 边-连通图}}).
:::

What the words mean in practice:

- If $G$ is $k$-connected ($k \ge 1$), deleting **any** $k-1$ vertices leaves it
  connected. If $G$ is $r$-edge-connected, deleting any $r-1$ edges leaves it connected.
- "$k$-connected" means $\kappa \ge k$, not $\kappa = k$. A 2-connected graph is also
  1-connected; a 5-connected graph is also 4-, 3-, 2- and 1-connected.
- For two graphs $G_1, G_2$ with $n$ vertices: if $\kappa(G_1) > \kappa(G_2)$, $G_1$ is
  **more vertex-connected** (点连通程度高) than $G_2$; if $\lambda(G_1) > \lambda(G_2)$,
  it is **more edge-connected**.

::: example The slides' three graphs
Find $\kappa$ and $\lambda$ of: (8.1.1) two separate edges; (8.1.2) two 4-cycles sharing
one vertex (7 vertices, like a bow); (8.1.3) $K_6$.
== 8.1.1 ==
Disconnected: $\kappa = 0$ and $\lambda = 0$ by convention.
== 8.1.2 ==
The shared centre is a cut vertex, so $\kappa = 1$. No single edge is a bridge (every
edge lies on a 4-cycle), but the two edges at any vertex of degree 2 isolate it, so
$\lambda = 2$.
== 8.1.3 ==
$K_6$ is complete: $\kappa = 6 - 1 = 5$. To isolate a vertex you remove its 5 edges, and
no smaller edge set disconnects $K_6$, so $\lambda = 5$.
:::

::: graph Graph 8.1.2: κ = 1 (the centre), λ = 2
at l1: 40, 30
at l2: 40, 130
at l3: 40, 230
at c: 180, 130
at r1: 320, 30
at r2: 320, 130
at r3: 320, 230
c -- l1, l1 -- l2, l2 -- l3, l3 -- c, c -- r1, r1 -- r2, r2 -- r3, r3 -- c
show: degrees
:::

The slides' graph $G$ from the cut-set exercise has $\kappa = 2$: removing $\{b, d\}$
isolates $c$ (so do $\{f, d\}$ for $e$), while no single vertex disconnects it. Its
$\lambda = 2$ as well ($\{fe, ed\}$ is a cut set with 2 edges, and there is no bridge).
So it is 2-connected and 1-connected, 2-edge-connected and 1-edge-connected.

::: example Two more from the slides
(1) Find the vertex connectivity of the 11-vertex graph on the slide. (2) Find the edge
connectivity of a hexagon with two crossing long diagonals, and of a pentagonal prism.
== (1) The 11-vertex graph ==
As drawn, the slide's graph joins each of 8 outer vertices to each of the 3 middle
vertices, and has no other edges: it is the complete bipartite graph $K_{3,8}$
(Lesson 4.5). The slide circles the 3 middle vertices: removing them leaves 8 isolated
vertices, so $\kappa \le 3$. Removing any 2 vertices leaves at least one middle vertex,
which is still joined to every remaining outer vertex, and to the other middle vertices
through them: still connected. So $\kappa = 3$.
== (2) Hexagon with two diagonals ==
There is no single method for edge connectivity; reason about this graph. Every edge
lies on a cycle, so there is no bridge and $\lambda \ge 2$. The left and right vertices
have no diagonal, so they have degree 2: removing the two edges at one of them (the ones
circled on the slide) isolates it. $\lambda = 2$.
== (2) Pentagonal prism ==
An outer and an inner pentagon with 5 spokes: 10 vertices, 3-regular. Removing the 3
edges at any vertex isolates it, so $\lambda \le 3$; and no 2 edges disconnect it (each
pentagon survives losing one edge, and the spokes still join them). $\lambda = 3$.
:::

::: graph The 11-vertex graph (K₃,₈): the middle row is a vertex cut set of size 3
row: o1 o2 o3 o4
row: m1 m2 m3
row: o5 o6 o7 o8
m1 -- o1, m1 -- o2, m1 -- o3, m1 -- o4, m1 -- o5, m1 -- o6, m1 -- o7, m1 -- o8
m2 -- o1, m2 -- o2, m2 -- o3, m2 -- o4, m2 -- o5, m2 -- o6, m2 -- o7, m2 -- o8
m3 -- o1, m3 -- o2, m3 -- o3, m3 -- o4, m3 -- o5, m3 -- o6, m3 -- o7, m3 -- o8
highlight: m1
:::

::: callout pitfall κ counts vertices, λ counts edges
$\kappa$ (kappa) is about deleting **vertices** (each takes its edges along), $\lambda$
(lambda) about deleting **edges** (the vertices stay). A cut vertex makes $\kappa = 1$
even when there is no bridge, as in graph 8.1.2. And remember the conventions: $K_n$ has
$\kappa = n-1$ although it has no vertex cut set; disconnected graphs have
$\kappa = \lambda = 0$.
:::

::: example True or false? (the slide's drill)
Read "$n$-connected" as $\kappa \ge n$. Which are true?
(1) If a connected graph $G$ is $n$-connected, it stays connected after removing fewer
than $n$ vertices. (2) If $G$ is $n$-connected, removing $n$ vertices may disconnect it.
(3) A connected graph is always 1-connected. (4) A 5-connected graph is also 4-, 3-, 2-
and 1-connected. (5) If removing any $n$ vertices never disconnects $G$, then $G$ is
$(n+1)$-connected.
== (1) and (2) ==
**True** and **true**: $\kappa \ge n$ means no set of fewer than $n$ vertices breaks the
graph, but a set of exactly $n$ might (it will when $\kappa = n$).
== (3) and (4) ==
**True**: connected means $\kappa \ge 1$ (for a non-trivial graph), and $\kappa \ge 5$
implies $\kappa \ge 4, 3, 2, 1$.
== (5) ==
**True** (for a graph that isn't complete, as in the definition): no vertex cut set has
$n$ or fewer vertices, so the smallest has at least $n+1$.
== The edge version ==
The same five statements hold with "edges" and $\lambda$ in place of "vertices" and
$\kappa$.
:::

## κ ≤ λ ≤ δ

Compare the three numbers on any graph above: in $K_6$ they are $5, 5, 5$; in graph 8.1.2
they are $\kappa = 1$, $\lambda = 2$, $\delta = 2$. Vertex connectivity never exceeds edge
connectivity, which never exceeds the minimum degree $\delta$ (Lesson 4.2).

::: theorem Connectivity and minimum degree | 点连通度、边连通度与最小度的关系
For every undirected graph $G$,
$$\kappa(G) \le \lambda(G) \le \delta(G)$$
(Theorem 5.3.1 in the textbook).
:::

The slides skip the proof (证明略). The idea of each half:

- **$\lambda \le \delta$.** Take a vertex $v$ of smallest degree $\delta$ and delete the
  edges at $v$: $v$ is cut off. That set of at most $\delta$ edges disconnects $G$, and
  it contains a minimal one, an edge cut set, so the smallest edge cut set has at most
  $\delta$ edges.
- **$\kappa \le \lambda$.** Take a smallest edge cut set, $\lambda$ edges. Deleting one
  end of each of those edges also kills every one of those edges, using at most $\lambda$
  vertices. Choosing the ends with a little care (so as not to delete a whole side of
  the cut; the textbook handles that case) gives a vertex set of size at most $\lambda$
  that disconnects $G$.

The slides illustrate the theorem with two fans (each a pair of triangles) sharing a
centre: the centre is a cut vertex, so $\kappa = 1$; there is no bridge, but the two
edges at a corner vertex isolate it, so $\lambda = 2$; and $\delta = 2$. Here
$\kappa < \lambda = \delta$.

::: graph The slide's graph G: κ = 1 < λ = 2 = δ
at l1: 40, 30
at l2: 40, 130
at l3: 40, 230
at c: 180, 130
at r1: 320, 30
at r2: 320, 130
at r3: 320, 230
l1 -- l2, l2 -- l3, c -- l1, c -- l2, c -- l3, r1 -- r2, r2 -- r3, c -- r1, c -- r2, c -- r3
show: degrees
:::

::: callout exam The in-class question
"Which relation between $\kappa(G)$, $\lambda(G)$ and $\delta(G)$ is right?" The answer is
$\kappa \le \lambda \le \delta$, with **≤** in both places: $K_n$ has all three equal to
$n-1$, so a strict "<" anywhere is wrong. Exams also ask you to find $\kappa$ and
$\lambda$ of a drawn graph, to check whether given sets are cut sets (remember
minimality), and the true/false drill above.
:::

## Every allowed combination happens

The theorem allows any $\kappa \le \lambda \le \delta$. Is every such triple actually
reached by some graph? Yes (the slides call it a construction; some were not shown in
class).

::: theorem Prescribed connectivities | 给定连通度的图
For any integers $0 < a \le b \le c$ there is a graph $G$ with $\kappa(G) = a$,
$\lambda(G) = b$ and $\delta(G) = c$.
:::

The building block is $K_{c+1}$: every vertex has degree $c$, so two copies of it already
make the minimum degree $c$. Then join the copies sparingly, so that a few vertices or
edges are all that hold the graph together. The four cases:

| Case | Construction | Why it works |
| --- | --- | --- |
| $a = b = c$ | $K_{a+1}$ | $\kappa = \lambda = \delta = a$ for a complete graph |
| $a = b < c$ | two copies of $K_{c+1}$, $a$ vertices in each joined one-to-one by $a$ edges | removing the $a$ joining edges, or their $a$ ends on one side, splits it |
| $a < b < c$ | as above, plus $b - a$ more edges between the chosen vertices | now $b$ edges join the copies, but they still meet only $a$ vertices on each side |
| $a < b = c$ | (method 1) two copies of $K_{c+1}$ sharing $a$ vertices | removing the $a$ shared vertices splits it; isolating a vertex needs $c$ edges |

For $a < b = c$ the slides give two more: (method 2) a $K_a$ and two $K_{c+1}$, each
vertex of $K_a$ joined to $c$ of the $c+1$ vertices of each $K_{c+1}$; (method 3) a $K_a$
and two $K_{b-a+1}$, each vertex of $K_a$ joined to every vertex of both. In method 3
the vertices of each $K_{b-a+1}$ have degree $(b-a) + a = b = c$, and removing the $K_a$
splits the graph, so $\kappa = a$.

::: example The case a < b < c with (a, b, c) = (2, 3, 5)
Build a graph with $\kappa = 2$, $\lambda = 3$, $\delta = 5$, and check it.
== Build ==
Take two copies of $K_6$ (left $l_1 \dots l_6$, right $r_1 \dots r_6$). Choose $a = 2$
vertices on each side, $l_1, l_2$ and $r_1, r_2$. Join them one-to-one ($l_1r_1$,
$l_2r_2$) and add $b - a = 1$ more edge between chosen vertices ($l_1r_2$).
== Minimum degree ==
Unchosen vertices keep degree 5; $l_1$ and $r_2$ get 2 extra edges, $l_2$ and $r_1$ one.
So $\delta = 5$.
== Vertex connectivity ==
All three joining edges touch $l_1$ or $l_2$, so removing $\{l_1, l_2\}$ cuts the right
$K_6$ off from the 4 remaining left vertices: $\kappa \le 2$. One vertex isn't enough:
after removing any one, some joining edge survives and each copy of $K_6$ stays
connected. $\kappa = 2$.
== Edge connectivity ==
Removing the 3 joining edges splits the graph: $\lambda \le 3$. Any edge cut set either
separates the two copies (it must contain all 3 joining edges) or cuts a copy of $K_6$
inside itself (at least 5 edges). So $\lambda = 3$.
:::

::: graph Two copies of K₆ joined by 3 edges: κ = 2, λ = 3, δ = 5
at l1: 149, 95
at l2: 149, 165
at l3: 88, 200
at l4: 27, 165
at l5: 27, 95
at l6: 88, 60
at r1: 211, 95
at r2: 211, 165
at r3: 272, 200
at r4: 333, 165
at r5: 333, 95
at r6: 272, 60
l1 -- l2, l1 -- l3, l1 -- l4, l1 -- l5, l1 -- l6, l2 -- l3, l2 -- l4, l2 -- l5, l2 -- l6, l3 -- l4, l3 -- l5, l3 -- l6, l4 -- l5, l4 -- l6, l5 -- l6
r1 -- r2, r1 -- r3, r1 -- r4, r1 -- r5, r1 -- r6, r2 -- r3, r2 -- r4, r2 -- r5, r2 -- r6, r3 -- r4, r3 -- r5, r3 -- r6, r4 -- r5, r4 -- r6, r5 -- r6
l1 -- r1, l2 -- r2, l1 -- r2
:::

The slides' other examples check the same way: two $K_6$ joined by 2 edges give
$(2, 2, 5)$; two $K_5$ sharing 2 vertices give $(2, 4, 4)$; and for $(3, 6, 6)$, either a
$K_3$ joined to 6 vertices of each of two $K_7$ (method 2), or a $K_3$ joined to all of
two $K_4$ (method 3).

::: callout note When there are too few chosen vertices
In the case $a < b < c$, the $b$ joining edges must run between the $a$ chosen vertices
on each side, and a simple graph has only $a^2$ such pairs. If $b > a^2$ (for example
$(a,b,c) = (1, 2, 3)$), choose $b$ vertices on one side instead and join each of them to
the $a$ chosen vertices on the other side, using all $a$ of them. The joining edges still
meet only $a$ vertices on that side, so $\kappa = a$ and $\lambda = b$ as before.
:::

::: callout key The one idea to remember
Connectivity is measured by the smallest *minimal* set that breaks the graph: $\kappa$
for vertices, $\lambda$ for edges. Isolating a vertex of smallest degree always works,
and deleting vertices is at least as destructive as deleting edges, so
$\kappa \le \lambda \le \delta$.
:::

## Flashcards and quiz

::: cards Connectivity
Connected vertices $u \sim v$ (连通) :: There is a walk between $u$ and $v$; by convention $v \sim v$. $\sim$ is an equivalence relation on $V$.
Connected graph (连通图) :: The trivial graph, or a graph in which every two vertices are connected.
Connected component (连通分支) :: The subgraph induced by one equivalence class of $\sim$; $p(G)$ is the number of components.
Components of the null graph $N_n$ :: $p(N_n) = n$, the most of any $n$-vertex graph.
Distance $d(u,v)$ (距离) :: The length of a shortest path (短程线) between $u$ and $v$; $+\infty$ if they are not connected.
Properties of distance :: $d(u,v) \ge 0$ (0 only when $u = v$); $d(u,v) = d(v,u)$; $d(u,v) + d(v,w) \ge d(u,w)$.
Vertex cut set (点割集) :: $V'$ with $p(G - V') > p(G)$, minimal: removing any proper subset doesn't raise $p$. One vertex: a cut vertex (割点).
Edge cut set (边割集) :: $E'$ with $p(G - E') > p(G)$, minimal. One edge: a bridge (桥, 割边).
Vertex connectivity $\kappa(G)$ (点连通度) :: The size of a smallest vertex cut set; $\kappa(K_n) = n-1$; 0 for a disconnected graph.
Edge connectivity $\lambda(G)$ (边连通度) :: The size of a smallest edge cut set; 0 for a disconnected graph.
k-connected graph (k-连通图) :: $\kappa(G) \ge k$: deleting any $k-1$ vertices leaves it connected.
Theorem 5.3.1 (κ, λ, δ) :: $\kappa(G) \le \lambda(G) \le \delta(G)$ for every undirected graph.
Graph with κ = a, λ = b, δ = c :: Exists for all $0 < a \le b \le c$: built from two copies of $K_{c+1}$ joined through $a$ vertices by $b$ edges (or sharing $a$ vertices when $b = c$).
Most components after deleting from a connected n-vertex graph :: One vertex: up to $n-1$ (the centre of a star). One edge: at most 2.
:::

::: quiz Connectivity
? Which relation between vertex connectivity $\kappa(G)$, edge connectivity $\lambda(G)$ and minimum degree $\delta(G)$ is right?
- [ ] $\lambda(G) \le \kappa(G) \le \delta(G)$
- [ ] $\lambda(G) \le \kappa(G) < \delta(G)$
- [x] $\kappa(G) \le \lambda(G) \le \delta(G)$
- [ ] $\kappa(G) < \lambda(G) \le \delta(G)$
> Theorem 5.3.1: $\kappa \le \lambda \le \delta$ (the in-class answer, C). The strict version D fails for $K_n$, where all three equal $n-1$.

? Removing one vertex from a connected graph with $n$ vertices leaves at most how many components?
expression: n - 1
variables: n
> Only $n-1$ vertices remain; a star $K_{1,n-1}$ reaches it when its centre is removed.

? Removing one edge from a connected graph leaves at most how many components?
answer: 2
> Every vertex can still reach one of the two ends of the removed edge, so at most two pieces remain.

? How many components does the null graph $N_n$ have?
expression: n
variables: n
> No edges: every vertex is a component on its own.

? In figure 5.3.2 (the 4-cycle $v_1v_2v_3v_4$ with the tail $v_3 - v_5 - v_6$), which are vertex cut sets?
- [x] $\{v_2, v_4\}$
- [x] $\{v_3\}$
- [x] $\{v_5\}$
- [ ] $\{v_1, v_3\}$
- [ ] $\{v_2, v_3\}$
> $\{v_2,v_4\}$ cuts off $v_1$ and neither vertex alone does; $v_3$ and $v_5$ are cut vertices. $\{v_1,v_3\}$ and $\{v_2,v_3\}$ contain $\{v_3\}$, so they aren't minimal.

? In the slides' graph $G$ ($a,\dots,g$), which of these are edge cut sets?
- [ ] $\{fe, ed, fd\}$
- [x] $\{fe, ed\}$
- [x] $\{af, ag, bg, bc\}$
> $\{fe, ed\}$ isolates $e$ and is minimal. $\{fe,ed,fd\}$ contains it, so it isn't minimal. $\{af,ag,bg,bc\}$ is every edge leaving $\{a,b\}$, and any three of them leave the sides joined.

? What is the vertex connectivity of the slides' 11-vertex graph ($K_{3,8}$: 3 middle vertices each joined to 8 outer ones)?
answer: 3
> The 3 middle vertices form a vertex cut set; removing any 2 vertices leaves a middle vertex joined to all remaining outer ones. $\kappa = 3$.

? The slides' fan graph (two pairs of triangles sharing a centre): what is its edge connectivity $\lambda$?
answer: 2
> No edge is a bridge, but a corner vertex has degree 2 and its two edges isolate it. ($\kappa = 1$ because the centre is a cut vertex, and $\delta = 2$.)

? A graph is 3-connected. Which statements must be true?
- [x] Removing any 2 vertices leaves it connected.
- [x] It is 2-connected.
- [ ] Removing some 3 vertices disconnects it.
- [x] Its minimum degree is at least 3.
> 3-connected means $\kappa \ge 3$, so fewer than 3 deletions never disconnect it and it is also 2-connected. $\kappa$ might be larger than 3, so a 3-vertex cut set need not exist. By Theorem 5.3.1, $\delta \ge \lambda \ge \kappa \ge 3$.

? The farmer, dog, sheep and cabbage puzzle: what is the least number of crossings?
answer: 7
> In the 10-state graph, $d(\text{FDSC}, \varnothing) = 7$: sheep over, back alone, cabbages (or the dog) over, sheep back, dog (or cabbages) over, back alone, sheep over.

? Two copies of $K_6$, with 2 vertices on each side joined one-to-one by 2 edges. What is its edge connectivity?
answer: 2
> The 2 joining edges form an edge cut set, and any cut inside a $K_6$ needs at least 5 edges. This is the case $a = b = 2 < c = 5$.

? What is a bridge also called?
text: cut edge | 割边 | 桥
> An edge whose removal alone raises the number of components: a cut edge (割边), or bridge (桥).
:::

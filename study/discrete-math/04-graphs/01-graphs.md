---
title: Graphs and their parts
zh: 图的定义及运算
summary: What a graph is (undirected and directed), the vocabulary of vertices, edges, loops, parallel edges, neighbourhoods and simple graphs, how many simple graphs a vertex set has, subgraphs and induced subgraphs, deleting and contracting, and the graph operations union, intersection, difference and ring sum.
source: 图5-1 (§5.1), 2026-09-29
---

Graph theory, the third part of the course, studies things joined to other things:
people and friendships, computers and cables, proteins that interact, words in a
sentence's parse tree, layers of a neural network. Strip away everything except "which
objects are joined to which" and you have a {{term graph | 图}}. This lesson sets up the
language: the definitions of undirected and directed graphs, the long list of words
the rest of the course uses (adjacent, incident, loop, parallel edge, simple graph,
subgraph…), and ways of building new graphs from old ones. Nearly every later lesson
(degrees, connectivity, Euler and Hamilton graphs, trees) is written in these words, so
it pays to learn them carefully now.

The course's graph theory runs over five chapters of the textbook: Chapter 5, the basic
concepts (this unit); Chapter 6, Euler and Hamilton graphs (Unit 5); then trees, planar
graphs, and dominating sets, covers, independent sets, matchings and colourings. The
subject began in 1736, when Euler showed that nobody can walk over each of the seven
bridges of Königsberg exactly once (Lesson 5.1).

## What a graph is

Look at the picture below. It has five dots, $v_1,\dots,v_5$, and seven lines,
$e_1,\dots,e_7$. Only one thing matters about it: **which dots each line joins**. Where
the dots sit, and how long or curved the lines are, means nothing; you could move
$v_4$ anywhere and it would be the same graph. A graph is a picture of a *structure*
(拓扑结构), not a geometric drawing.

::: graph The running example $G$ (an undirected graph)
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
:::

To write such a graph down we need two lists: the dots, called **vertices**, and the
lines, called **edges**. Each edge is described by the two vertices it joins, and since
the line from $v_1$ to $v_2$ is the same as the line from $v_2$ to $v_1$, the pair is
*unordered*. The textbook builds this from a set operation.

::: define Unordered product | 无序积
For sets $A$ and $B$, the **unordered product** is
$$A\& B=\{\{a,b\}\mid a\in A,\ b\in B\}.$$
The unordered pair $\{a,b\}$ is written $(a,b)$; $a=b$ is allowed, and always
$(a,b)=(b,a)$, so $A\& B=B\& A$.
:::

Compare the Cartesian product $A\times B$ (Lesson 2.1), whose elements are *ordered*
pairs $\langle a,b\rangle$ with $\langle a,b\rangle\neq\langle b,a\rangle$ when $a\neq b$.
Undirected edges come from $V\& V$; directed edges will come from $V\times V$.

One more ingredient: two vertices may be joined by *several* edges (like $e_5$ and $e_6$
above). A set can't hold the same element twice, so the edges form a
{{term multiset | 多重集合}}: a collection in which an element may appear more than once.

::: define Undirected graph | 无向图
An **undirected graph** $G$ is an ordered pair $\langle V,E\rangle$ where
1. $V$ is a non-empty finite set, the **vertex set** (顶点集); its elements are
   **vertices** or **nodes** (顶点, 结点);
2. $E$ is a finite multiset of elements of $V\& V$ (a finite multi-subset of $V\& V$),
   the **edge set** (边集); its elements are **undirected edges** or just **edges**
   (无向边, 边).

(Definition 5.1.1 in the textbook.)
:::

For the running example,
$$
\begin{aligned}
V&=\{v_1,v_2,v_3,v_4,v_5\},\\
E&=\{(v_1,v_1),(v_1,v_2),(v_1,v_5),(v_2,v_3),(v_2,v_3),(v_2,v_5),(v_4,v_5)\},
\end{aligned}
$$
or, naming the edges, $E=\{e_1,e_2,\dots,e_7\}$. The pair $(v_2,v_3)$ appears twice
because two edges join $v_2$ and $v_3$, and $(v_1,v_1)$ is an edge from $v_1$ back to
itself.

Sometimes the direction matters: one-way streets, "follows" on social media, a task
that must come before another, the relations of Unit 2. Then each edge is an
**arrow** with a start and an end, and we use ordered pairs.

::: define Directed graph | 有向图
A **directed graph** $D$ is an ordered pair $\langle V,E\rangle$ where
1. $V$ is a non-empty finite set, the vertex set, whose elements are vertices (nodes);
2. $E$ is a finite multiset of elements of the Cartesian product $V\times V$, the edge
   set, whose elements are **directed edges** (有向边), also called arcs or just edges.

(Definition 5.1.2 in the textbook.)
:::

::: graph The running example $D$ (a directed graph)
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
:::

Here $V=\{a,b,c,d\}$ and
$$E=\{\langle a,a\rangle,\langle a,b\rangle,\langle a,b\rangle,\langle a,d\rangle,\langle c,b\rangle,\langle d,c\rangle,\langle c,d\rangle\},$$
or $E=\{e_1,\dots,e_7\}$. The slides sometimes call a directed graph's edge set $A$
(for arcs) and write $A(D)$.

If you've done Unit 2, a directed graph with no repeated arcs is exactly the
{{zh 关系图}} of a relation on $V$: an arc $\langle x,y\rangle$ means $xRy$. Graphs
generalise relation diagrams by allowing repeated edges, and undirected graphs drop the
direction.

::: example Writing a graph as $\langle V,E\rangle$
A graph has $V=\{p,q,r,s\}$ and $E=\{(p,q),(q,r),(q,r),(r,r)\}$. Describe it in words.
== Read the edge multiset ==
$(p,q)$ joins $p$ and $q$; $(q,r)$ appears twice, so two edges join $q$ and $r$;
$(r,r)$ is an edge from $r$ to itself.
== Look for vertices on no edge ==
$s$ is in $V$ but in no pair of $E$: it is a dot with no lines (an *isolated vertex*,
defined below). That is allowed: $V$ only has to be non-empty.
== Count ==
4 vertices and 4 edges (the repeated pair counts twice).
:::

## Basic conventions and words

The textbook gathers a long list of conventions (Remark 5.1.1). They're mostly
vocabulary; learn them with the running examples $G$ and $D$ in front of you.

### Names, order, null and trivial graphs

Undirected and directed graphs together are just called **graphs**. We usually write
$G$ for an undirected graph and $D$ for a directed one, though $G$ can mean either.
$V(G)$ and $E(G)$ (for a digraph also $A(D)$) are the vertex and edge sets, and
$|V(G)|$, $|E(G)|$ the numbers of vertices and edges. Later lessons often write
$n=|V|$ and $m=|E|$.

::: define Order of a graph | 阶
The number of vertices of a graph is its **order**; a graph with $n$ vertices is an
**$n$-order graph** ($n$ 阶图).
:::

::: define Null graph | 零图
A graph with no edges at all. The null graph of order $n$ is written $N_n$.
:::

::: define Trivial graph | 平凡图
The null graph of order 1, $N_1$: a single vertex and no edges.
:::

::: define Empty graph | 空图
The graph whose vertex set is empty, written $\emptyset$. The definition of a graph
requires $V\neq\emptyset$, but operations on graphs (deleting all vertices, the
difference of two equal graphs) can produce "nothing", and $\emptyset$ names that
result.
:::

::: callout pitfall Null graph, trivial graph, empty graph
Three different things: a **null** graph $N_n$ has $n\ge1$ vertices and no edges; the
**trivial** graph $N_1$ is the smallest null graph (one vertex); the **empty** graph
$\emptyset$ has no vertices at all. "Empty" in Chinese (空图) is about the vertices,
"null" (零图) about the edges.
:::

If every vertex and every edge has been given a name (a letter or number, possibly with
a subscript), the graph is a {{term labelled graph | 标定图}}; otherwise it is an
{{term unlabelled graph | 非标定图}}. $G$ and $D$ above are labelled. Unlabelled graphs
matter when we ask "how many *different shapes*" there are (isomorphism, Lesson 4.2).

::: define Underlying graph | 基图
The undirected graph obtained from a directed graph by replacing every directed edge
with an undirected one (forgetting the arrows).
:::

The underlying graph of $D$ has a loop at $a$, two parallel edges $a$–$b$, edges $a$–$d$
and $c$–$b$, and two parallel edges $c$–$d$ (from $e_6$ and $e_7$, which point opposite
ways in $D$ but become identical once the arrows go).

### Endpoints, incidence, loops and adjacency

These words describe how a vertex and an edge, or two vertices, or two edges, are
related.

::: define Incidence (undirected) | 关联
Let $e_k=(v_i,v_j)$ be an edge of an undirected graph. $v_i$ and $v_j$ are the
**endpoints** (端点) of $e_k$, and $e_k$ is **incident** with $v_i$ and with $v_j$. The
**incidence number** (关联次数) of $e_k$ and a vertex is
- 1 if the vertex is one of two *different* endpoints ($v_i\neq v_j$),
- 2 if $v_i=v_j$ and the vertex is that endpoint (then $e_k$ is a **loop**),
- 0 if the vertex is not an endpoint of $e_k$.
:::

::: define Loop | 环
An edge whose two endpoints are the same vertex, such as $e_1=(v_1,v_1)$ in $G$ or
$e_1=\langle a,a\rangle$ in $D$.
:::

::: define Adjacent | 相邻
In an undirected graph, two **vertices** are adjacent when an edge joins them, and two
**edges** are adjacent when they share at least one endpoint. In a directed graph, two
vertices are adjacent when there is a directed edge between them (either way), and two
edges are adjacent when the **end** of one is the **start** of the other.
:::

In a directed graph, the edge $e_k=\langle v_i,v_j\rangle$ has endpoints $v_i$ and $v_j$
as before, but now $v_i$ is its {{term initial vertex | 始点}} and $v_j$ its
{{term terminal vertex | 终点}}; $e_k$ is incident with both, and it is a loop when
$v_i=v_j$.

::: define Isolated vertex | 孤立点
A vertex (in an undirected or directed graph) that no edge is incident with.
:::

::: example Reading the running examples
Use $G$ and $D$ above.
== Incidence numbers in $G$ ==
$e_2=(v_1,v_2)$ has incidence number 1 with $v_1$ and with $v_2$, and 0 with $v_3,v_4,v_5$.
The loop $e_1$ has incidence number 2 with $v_1$.
== Adjacent vertices and edges in $G$ ==
$v_1$ is adjacent to $v_2$ and $v_5$, and to itself (through the loop). $v_3$ and $v_4$
are not adjacent. Edges $e_2$ and $e_4$ are adjacent (they share $v_2$); $e_3$ and
$e_5$ are not.
== Adjacent edges in $D$ ==
$e_4=\langle a,d\rangle$ and $e_6=\langle d,c\rangle$ are adjacent: $e_4$ ends where
$e_6$ starts. $e_2=\langle a,b\rangle$ and $e_5=\langle c,b\rangle$ both *end* at $b$,
so by the directed definition they are not adjacent edges, even though they share an
endpoint.
== Isolated vertices ==
Neither graph has one: every vertex lies on some edge.
:::

### Neighbourhoods and incidence sets

The vertices next to $v$, and the edges at $v$, get their own names.

::: define Neighbourhood (undirected) | 邻域
In an undirected graph $G=\langle V,E\rangle$, for $v\in V$:
- the **neighbourhood** $N_G(v)=\{u\mid u\in V,\ (u,v)\in E,\ u\neq v\}$, the vertices
  adjacent to $v$ other than $v$ itself;
- the **closed neighbourhood** (闭邻域) $\overline{N}_G(v)=N_G(v)\cup\{v\}$;
- the **incidence set** (关联集) $I_G(v)=\{e\mid e\in E,\ e\text{ is incident with }v\}$.
:::

::: define Successor and predecessor sets | 后继元集与先驱元集
In a directed graph $D=\langle V,E\rangle$, for $v\in V$:
- the **successor set** $\Gamma_D^+(v)=\{u\mid u\in V,\ \langle v,u\rangle\in E,\ u\neq v\}$,
  the vertices an arrow from $v$ reaches;
- the **predecessor set** $\Gamma_D^-(v)=\{u\mid u\in V,\ \langle u,v\rangle\in E,\ u\neq v\}$,
  the vertices with an arrow into $v$;
- the **neighbourhood** $N_D(v)=\Gamma_D^+(v)\cup\Gamma_D^-(v)$ and the **closed
  neighbourhood** $\overline{N}_D(v)=N_D(v)\cup\{v\}$.
:::

The condition $u\neq v$ keeps a vertex out of its own neighbourhood even when it has a
loop. The closed neighbourhood puts it back in on purpose.

::: example Neighbourhoods in $G$ and $D$
Find $N(v_1)$, $\overline N(v_1)$, $I(v_1)$, $N(v_2)$ in $G$, and $\Gamma^+(a)$,
$\Gamma^-(a)$, $\Gamma^+(c)$, $\Gamma^-(c)$, $N_D(c)$ in $D$.
== In $G$ ==
$N_G(v_1)=\{v_2,v_5\}$ (the loop doesn't put $v_1$ in), $\overline N_G(v_1)=\{v_1,v_2,v_5\}$,
$I_G(v_1)=\{e_1,e_2,e_3\}$. $N_G(v_2)=\{v_1,v_3,v_5\}$: $v_3$ is listed once although
two edges lead to it, because a neighbourhood is a set of vertices. But
$I_G(v_2)=\{e_2,e_4,e_5,e_6\}$ has both parallel edges, because they are different edges.
== In $D$ ==
Arrows out of $a$ go to $a$ (the loop, excluded), $b$, $b$ and $d$: $\Gamma_D^+(a)=\{b,d\}$.
Only the loop enters $a$, so $\Gamma_D^-(a)=\emptyset$.
Out of $c$: to $b$ and $d$, so $\Gamma_D^+(c)=\{b,d\}$; into $c$: from $d$, so
$\Gamma_D^-(c)=\{d\}$. Then $N_D(c)=\{b,d\}$ and $\overline N_D(c)=\{b,c,d\}$.
:::

## Parallel edges and simple graphs

::: define Parallel edges | 平行边
In an undirected graph, two or more edges joining the same pair of vertices are
**parallel edges**, and their number is the **multiplicity** (重数). In a directed graph,
parallel edges must join the same pair **in the same direction**. (Definition 5.1.3 in the
textbook.)
:::

::: define Multigraph | 多重图
A graph that contains parallel edges.
:::

::: define Simple graph | 简单图
A graph with **neither parallel edges nor loops**.
:::

In $G$, $e_5$ and $e_6$ are parallel edges of multiplicity 2, so $G$ is a multigraph; it
also has a loop. In $D$, $e_2$ and $e_3$ (both $a\to b$) are parallel, so $D$ is a
multigraph too. Neither is simple.

::: callout pitfall Opposite arrows are not parallel
In $D$, $e_6=\langle d,c\rangle$ and $e_7=\langle c,d\rangle$ join the same two vertices
but point opposite ways, so they are **not** parallel edges. A simple directed graph
may contain both $\langle u,v\rangle$ and $\langle v,u\rangle$. (In the underlying
graph they do become parallel.)
:::

::: callout pitfall A loop alone already spoils "simple"
"Simple" needs two things: no parallel edges **and** no loops. A graph with a single loop
and no repeated edges is not a multigraph, but it is not simple either.
:::

### How many simple graphs does a vertex set have?

A simple undirected graph is decided by *which* pairs of different vertices are joined:
each pair is either an edge or not, with no repeats and no loops. So its edge set is
just a set of 2-element subsets of $V$. Write
$$P_2(V)=\{A\mid A\subseteq V,\ |A|=2\}$$
for the set of all 2-element subsets of $V$.

::: example The eight simple graphs on $\{a,b,c\}$
List every simple undirected graph with vertex set $V=\{a,b,c\}$.
== The possible edges ==
$P_2(V)=\{\{a,b\},\{a,c\},\{b,c\}\}$: three possible edges.
== Every set of them ==
The edge set is any subset of $P_2(V)$, and a 3-element set has $2^3=8$ subsets:
$$
\begin{gathered}
E_1=\emptyset,\quad E_2=\{\{a,b\}\},\quad E_3=\{\{a,c\}\},\quad E_4=\{\{b,c\}\},\\
E_5=\{\{a,b\},\{a,c\}\},\quad E_6=\{\{a,b\},\{b,c\}\},\quad E_7=\{\{a,c\},\{b,c\}\},\\
E_8=\{\{a,b\},\{a,c\},\{b,c\}\}.
\end{gathered}
$$
== The graphs ==
$\langle V,E_i\rangle$ for $i=1,\dots,8$: no edge; one of three single edges; one of three
paths of two edges; the triangle. Eight labelled graphs (though only four different
*shapes*: Lesson 4.2).
:::

::: graph One of the eight: $\langle V, E_6\rangle$, edges ab and bc
at a: 180, 40
at b: 90, 210
at c: 270, 210
vertices: a b c
a -- b, b -- c
:::

The same reasoning works for any $n$: there are $\binom n2=\frac{n(n-1)}2$ pairs, and
each can be in or out.

::: formula Number of simple undirected graphs on $n$ labelled vertices | n 个标定顶点的简单无向图个数
$$\#\{\text{simple undirected graphs on } V\}=2^{\binom n2}=2^{\frac{n(n-1)}{2}}$$
--
n | number of vertices, $V=\{v_1,\dots,v_n\}$ | —
\binom n2 | number of possible edges (pairs of different vertices) | —
:::

For $n=3$ that is $2^3=8$, as listed; for $n=4$ already $2^6=64$.

::: callout tip Compare with relations
A relation on an $n$-element set is any subset of $A\times A$: $2^{n^2}$ of them (Lesson
2.1). A simple undirected graph is like a relation that is irreflexive (no loops) and
symmetric, and such relations are fixed by their pairs above the diagonal:
$2^{n(n-1)/2}$ again.
:::

## Subgraphs

A subgraph is what you get by keeping some of a graph's vertices and some of its edges,
as long as every kept edge still has both its endpoints.

::: define Subgraph | 子图
Let $G=\langle V,E\rangle$ and $G'=\langle V',E'\rangle$ be two graphs (both undirected
or both directed). If $V'\subseteq V$ and $E'\subseteq E$, then $G'$ is a **subgraph** of
$G$ and $G$ is a **supergraph** (母图) of $G'$, written $G'\subseteq G$. If moreover
$V'\subset V$ or $E'\subset E$, then $G'$ is a **proper subgraph** (真子图). If $V'=V$, then
$G'$ is a **spanning subgraph** (生成子图). (Definition 5.1.4 in the textbook.)
:::

$G'$ must itself be a graph, so $V'\neq\emptyset$ and every edge of $E'$ has both
endpoints in $V'$. A spanning subgraph keeps **all** the vertices and drops some (or no)
edges; every graph is a spanning subgraph of itself.

::: example How many subgraphs does the triangle have?
The triangle on $a,b,c$ (all three edges; it is the complete graph $K_3$ of Lesson 4.3).
How many subgraphs does it have, and how many are spanning?
== Sort by the vertices kept ==
A subgraph keeps a non-empty set of vertices and then any of the edges *between* them.
== One vertex ==
3 choices of vertex, no possible edge: **3** subgraphs.
== Two vertices ==
3 choices of pair; the one edge between them is in or out: $3\times2=$ **6**.
== Three vertices ==
All three edges are available: $2^3=$ **8** (the eight graphs of the previous section).
== Total ==
$3+6+8=17$ subgraphs. The spanning ones are those with all three vertices: **8**.
(These are the slide's answers.)
:::

::: graph A spanning subgraph of the triangle: all three vertices, edges ab and ac
at a: 180, 40
at b: 90, 210
at c: 270, 210
vertices: a b c
a -- b, a -- c
:::

### Induced subgraphs

Often we want "everything $G$ has on these vertices", or "exactly these edges, with the
vertices they need". Those subgraphs are fixed by the choice alone.

::: define Vertex-induced subgraph | 导出子图
Let $G=\langle V,E\rangle$, $V_1\subset V$, $V_1\neq\emptyset$. The subgraph with vertex set
$V_1$ and **every** edge of $G$ whose two endpoints are both in $V_1$ is the subgraph
**induced by $V_1$**, written $G[V_1]$.
:::

::: define Edge-induced subgraph | 边导出的子图
Let $G=\langle V,E\rangle$, $E_1\subset E$, $E_1\neq\emptyset$. The subgraph with edge set
$E_1$ and, as vertex set, the endpoints of the edges of $E_1$ is the subgraph **induced by
$E_1$**, written $G[E_1]$.
:::

::: graph Figure 5.1.2 (a): the graph used for induced subgraphs
at a: 90, 50
at b: 270, 50
at c: 270, 210
at d: 90, 210
a -- b: e1
b -- d: e2
d -- c: e3
a -- d: e4
b -- c: e5
:::

::: example Induced subgraphs of figure 5.1.2
In the graph above, find $G[\{a,b,c\}]$ and $G[\{e_1,e_3\}]$.
== By vertices ==
Keep $a,b,c$ and every edge with both ends among them: $e_1=(a,b)$ and $e_5=(b,c)$.
$e_2,e_3,e_4$ each touch $d$, so they go. $G[\{a,b,c\}]$ is the path $a$–$b$–$c$.
== By edges ==
Keep $e_1=(a,b)$ and $e_3=(d,c)$, plus their endpoints $a,b,c,d$. $G[\{e_1,e_3\}]$ is
two separate edges on four vertices. Note that $G[\{e_1,e_3\}]$ is **not** $G[\{a,b,c,d\}]$:
an edge-induced subgraph takes only the chosen edges.
:::

::: callout pitfall "Induced" means "all of them"
$G[V_1]$ must contain **every** edge of $G$ between vertices of $V_1$: the path
$a$–$b$ alone on $\{a,b,c\}$ is a subgraph but not $G[\{a,b,c\}]$. With edges it's the
opposite: $G[E_1]$ takes only the edges in $E_1$, and no isolated vertices.
:::

## Deleting, contracting and adding edges

Three ways of changing a graph a little come up all through the course (cuts and
bridges in Lesson 4.4 are about what deleting does to connectivity).

::: define Deleting edges and vertices | 删除
Let $G=\langle V,E\rangle$ be undirected.
- For $e\in E$, $G-e$ is $G$ with the edge $e$ removed (**deleting $e$**); for $E'\subset E$,
  $G-E'$ removes all edges of $E'$.
- For $v\in V$, $G-v$ is $G$ with $v$ **and every edge incident with it** removed
  (**deleting $v$**); for $V'\subset V$, $G-V'$ removes all vertices of $V'$ (and their
  edges).

(Definition 5.1.5 in the textbook.)
:::

Deleting an edge never removes a vertex (its endpoints may become isolated); deleting a
vertex always takes its edges with it, since an edge can't hang from nothing.

::: define Contracting an edge | 收缩
For an edge $e=(u,v)$ of $G$, $G\backslash e$ is obtained by deleting $e$, replacing its
endpoints $u$ and $v$ by **one** new vertex $w$ ($u$ or $v$ itself may serve as $w$), and
making $w$ incident with every edge other than $e$ that was incident with $u$ or $v$.
:::

::: define Adding an edge | 加新边
For $u,v\in V$ (adjacent or not), $G\cup(u,v)$, also written $G+(u,v)$, is $G$ with one
more edge $(u,v)$ joined between $u$ and $v$.
:::

Contracting and adding edges can create loops and parallel edges: contracting $e$ when
another edge also joins $u$ and $v$ turns that edge into a loop at $w$, and adding $(u,v)$
when $u,v$ are already adjacent gives parallel edges.

::: example Contracting an edge
The square $u,v,x,y$ has edges $(u,v),(v,x),(x,y),(y,u)$ and the diagonal $(v,y)$.
Contract $e=(u,v)$, and also find $G-v$.
== Contract ==
Delete $(u,v)$ and merge $u$ and $v$ into $w$. The edges at $u$ were $(y,u)$; at $v$,
$(v,x)$ and $(v,y)$. They become $(w,y)$, $(w,x)$ and $(w,y)$. With $(x,y)$, $G\backslash e$
has vertices $w,x,y$ and edges $(w,x),(w,y),(w,y),(x,y)$.
== What changed ==
$u$ and $v$ were both adjacent to $y$, so $G\backslash e$ has **two parallel edges**
between $w$ and $y$: the result is a multigraph although $G$ was simple. Vertices drop
from 4 to 3, edges from 5 to 4.
== Delete $v$ instead ==
$G-v$ removes $v$ with $(u,v),(v,x),(v,y)$: vertices $u,x,y$, edges $(x,y),(y,u)$.
:::

::: graph Before: the square with a diagonal (edge uv to be contracted)
at u: 90, 50
at v: 270, 50
at x: 270, 210
at y: 90, 210
u -- v, v -- x, x -- y, y -- u, v -- y
highlight: u v
:::

::: graph After: $G\backslash e$, where u and v became w
at w: 180, 50
at x: 270, 210
at y: 90, 210
w -- x, w -- y, w -- y, x -- y
:::

## Operations on graphs

Since a graph is a pair of sets, set operations on the edge sets give new graphs.

::: define Union, difference, intersection and ring sum of graphs | 图的并、差、交、环和
Let $G_1=\langle V_1,E_1\rangle$ and $G_2=\langle V_2,E_2\rangle$ be two graphs **without
isolated vertices** (both undirected or both directed).
1. The **union** (并图) $G_1\cup G_2=\langle V_1\cup V_2,\ E_1\cup E_2\rangle$.
2. The **difference** (差图) $G_1-G_2$ has edge set $E_1-E_2$ and, as vertices, the
   endpoints of those edges.
3. The **intersection** (交图) $G_1\cap G_2$ has edge set $E_1\cap E_2$ and the endpoints
   of those edges.
4. The **ring sum** (环和) $G_1\oplus G_2$ has edge set $E_1\oplus E_2$ (the symmetric
   difference, Lesson 1.2) and the endpoints of those edges.

(Definition 5.1.6 in the textbook.)
:::

So apart from the union, the operations are "do the set operation on the edges, then
take the vertices those edges need". That is why the graphs must have no isolated
vertices: an isolated vertex would vanish from every result except the union, and the
operations would lose information.

Some consequences (Remark 5.1.2):

- If $G_1=G_2$, then $G_1\cup G_2=G_1\cap G_2=G_1=G_2$ and $G_1-G_2=G_2-G_1=\emptyset$ (the
  empty graph: this is why it was needed).
- $G_1$ and $G_2$ are {{term disjoint | 不交的}} when $V_1\cap V_2=\emptyset$, and
  {{term edge-disjoint | 边不交的}} (边不重的) when $E_1\cap E_2=\emptyset$. Disjoint graphs
  are always edge-disjoint, but not the other way round: two edges can share a vertex
  without being the same edge.
- When $G_1$ and $G_2$ are edge-disjoint: $G_1\cap G_2=\emptyset$, $G_1-G_2=G_1$,
  $G_2-G_1=G_2$ and $G_1\oplus G_2=G_1\cup G_2$.
- The ring sum can be written with the others, just like $A\oplus B=(A\cup B)-(A\cap B)$
  for sets:

::: formula Ring sum of graphs | 环和
$$G_1\oplus G_2=(G_1\cup G_2)-(G_1\cap G_2)$$
--
G_1\oplus G_2 | the graph of edges in exactly one of $G_1$, $G_2$ | —
G_1\cup G_2 | union: all vertices and all edges of both | —
G_1\cap G_2 | intersection: the common edges and their endpoints | —
:::

::: callout note About the slide's zeros
Remark 5.1.2 on the slide writes "$V_1\cap V_2=0$" and "$E_1\cap E_2=0$"; the 0 means the
empty set $\emptyset$.
:::

::: example The four operations
$G_1$ is the 4-cycle with edges $(a,b),(b,c),(c,d),(d,a)$. $G_2$ has edges
$(b,c),(c,d),(c,e),(e,a)$. Find $G_1\cup G_2$, $G_1\cap G_2$, $G_1-G_2$, $G_2-G_1$ and
$G_1\oplus G_2$.
== Union ==
$V=\{a,b,c,d,e\}$, edges $(a,b),(b,c),(c,d),(d,a),(c,e),(e,a)$: six edges.
== Intersection ==
Common edges $(b,c),(c,d)$, so vertices $\{b,c,d\}$: the path $b$–$c$–$d$.
== Differences ==
$E_1-E_2=\{(a,b),(d,a)\}$: $G_1-G_2$ is the path $b$–$a$–$d$ on $\{a,b,d\}$.
$E_2-E_1=\{(c,e),(e,a)\}$: $G_2-G_1$ is the path $c$–$e$–$a$ on $\{a,c,e\}$.
The difference is not symmetric.
== Ring sum ==
$E_1\oplus E_2=\{(a,b),(d,a),(c,e),(e,a)\}$ on $\{a,b,c,d,e\}$. Check: $(G_1\cup G_2)$
minus the two common edges leaves exactly these four.
== Edge-disjoint? ==
No: they share $(b,c)$ and $(c,d)$. $G_1-G_2$ and $G_2-G_1$ are edge-disjoint (but not
disjoint: both contain $a$), and indeed their union is $G_1\oplus G_2$.
:::

::: graph The union $G_1\cup G_2$, with $G_1-G_2$ (the path b–a–d) highlighted
at a: 90, 60
at b: 270, 60
at c: 270, 210
at d: 90, 210
at e: 180, 135
a -- b, b -- c, c -- d, d -- a, c -- e, e -- a
highlight: b a d
:::

The highlighted path $b$–$a$–$d$ is $G_1-G_2$; the edges $c$–$e$–$a$ make $G_2-G_1$;
together they form $G_1\oplus G_2$, and the remaining edges $b$–$c$–$d$ are $G_1\cap G_2$.

::: callout key The one idea
A graph is nothing but a vertex set and a **multiset** of pairs: unordered pairs for
undirected graphs ($V\& V$), ordered pairs for directed ones ($V\times V$). Every word in
this lesson (loop, parallel edge, simple, subgraph, induced, union…) is a statement about
those two collections, not about the picture.
:::

::: callout exam What exams ask
- Count simple graphs on $n$ labelled vertices ($2^{n(n-1)/2}$), or subgraphs and spanning
  subgraphs of a small graph ($K_3$: 17 and 8).
- Decide whether a graph is simple, find parallel edges (watch opposite arrows), loops,
  isolated vertices.
- Write $N(v)$, $\overline N(v)$, $I(v)$, $\Gamma^+(v)$, $\Gamma^-(v)$ for a drawn graph.
- Draw $G[V_1]$, $G[E_1]$, $G-v$, $G-e$, $G\backslash e$, and the union, intersection,
  difference and ring sum of two graphs.
:::

::: cards Graphs and their parts
Unordered product $A\&B$ :: $\{\{a,b\}\mid a\in A,b\in B\}$; the pair is written $(a,b)$, $a=b$ allowed, $(a,b)=(b,a)$.
Undirected graph (无向图) :: $G=\langle V,E\rangle$: $V$ a non-empty finite set; $E$ a finite multiset of elements of $V\&V$.
Directed graph (有向图) :: $D=\langle V,E\rangle$: $V$ a non-empty finite set; $E$ a finite multiset of elements of $V\times V$.
Null, trivial and empty graph :: Null $N_n$: $n$ vertices, no edges. Trivial: $N_1$. Empty $\emptyset$: no vertices.
Incidence number of an edge with a vertex :: 1 for an ordinary endpoint, 2 for the vertex of a loop, 0 if not an endpoint.
Neighbourhood $N_G(v)$ :: The vertices other than $v$ joined to $v$ by an edge; closed neighbourhood adds $v$; $I_G(v)$ is the set of edges at $v$.
Successor and predecessor sets :: $\Gamma^+(v)$: vertices $u\neq v$ with an arc $v\to u$; $\Gamma^-(v)$: with an arc $u\to v$.
Parallel edges in a directed graph :: Edges joining the same pair of vertices in the same direction; opposite arcs are not parallel.
Simple graph (简单图) :: No loops and no parallel edges.
Number of simple undirected graphs on $n$ labelled vertices :: $2^{n(n-1)/2}$.
Spanning subgraph (生成子图) :: A subgraph with all the vertices: $V'=V$, $E'\subseteq E$.
Induced subgraph $G[V_1]$ :: Vertices $V_1$ and every edge of $G$ with both ends in $V_1$.
Contraction $G\backslash e$ :: Delete $e=(u,v)$, merge $u$, $v$ into one vertex keeping all their other edges.
Ring sum of graphs :: Edge set $E_1\oplus E_2$ with its endpoints; equals $(G_1\cup G_2)-(G_1\cap G_2)$.
:::

::: quiz Check yourself
? How many simple undirected graphs have the vertex set $V=\{v_1,v_2,\dots,v_n\}$?
- [x] $2^{n(n-1)/2}$
- [ ] $2^{n(n-1)}$
- [ ] $n$
- [ ] $2^n$
> Each of the $\binom n2=n(n-1)/2$ pairs of different vertices is an edge or not, with no loops or repeats: $2^{n(n-1)/2}$ (in-class question, answer A). $2^{n(n-1)}$ would count simple *directed* graphs, where each ordered pair is chosen separately.

? How many simple undirected graphs have the vertex set $\{1,2,3,4,5\}$?
answer: 2^(5*4/2)
> $\binom52=10$ possible edges, so $2^{10}=1024$.

? Write the number of simple **directed** graphs on $n$ labelled vertices (no loops, no parallel arcs; opposite arcs allowed) as a formula in $n$.
expression: 2^(n^2 - n)
variables: n
> Each of the $n(n-1)$ ordered pairs $\langle u,v\rangle$ with $u\neq v$ is an arc or not, independently (opposite arcs aren't parallel): $2^{n(n-1)}=2^{n^2-n}$.

? How many subgraphs does the triangle $K_3$ have?
answer: 3 + 3*2 + 2^3
> One vertex: 3. Two vertices: 3 pairs × (edge or not) = 6. Three vertices: $2^3=8$. Total 17.

? How many spanning subgraphs does a graph with 5 vertices and 7 edges (all different) have?
answer: 2^7
> A spanning subgraph keeps all vertices and any subset of the edges: $2^7=128$.

? In the running example $D$, which pairs of edges are parallel? (tick all)
- [x] $e_2=\langle a,b\rangle$ and $e_3=\langle a,b\rangle$
- [ ] $e_6=\langle d,c\rangle$ and $e_7=\langle c,d\rangle$
- [ ] $e_2=\langle a,b\rangle$ and $e_5=\langle c,b\rangle$
> In a directed graph, parallel edges join the same pair in the same direction. $e_6$, $e_7$ point opposite ways; $e_2$, $e_5$ join different pairs.

? In the running example $G$, what is $N_G(v_1)$?
- [ ] $\{v_1,v_2,v_5\}$
- [x] $\{v_2,v_5\}$
- [ ] $\{e_1,e_2,e_3\}$
- [ ] $\{v_2,v_3,v_5\}$
> The neighbourhood excludes $v$ itself even with a loop: $\{v_2,v_5\}$. $\{v_1,v_2,v_5\}$ is the closed neighbourhood and $\{e_1,e_2,e_3\}$ the incidence set.

? $G$ is simple with edges $(a,b),(b,c),(a,c),(c,d)$. Contract the edge $(a,b)$ to a vertex $w$. How many edges does $G\backslash(a,b)$ have, and is it simple?
- [ ] 3 edges, simple
- [x] 3 edges, not simple: two parallel edges join $w$ and $c$
- [ ] 4 edges, simple
- [ ] 2 edges, simple
> Remove $(a,b)$; $(b,c)$ and $(a,c)$ both become $(w,c)$, and $(c,d)$ stays: 3 edges, two of them parallel.

? Which statements are true? (tick all)
- [x] Disjoint graphs are always edge-disjoint
- [ ] Edge-disjoint graphs are always disjoint
- [x] If $G_1$ and $G_2$ are edge-disjoint, $G_1\oplus G_2=G_1\cup G_2$
- [x] If $G_1=G_2$, then $G_1-G_2$ is the empty graph
> No common vertex means no common edge, but two graphs can share a vertex without sharing an edge. With no common edges the symmetric difference of the edge sets is their union. $E_1-E_1=\emptyset$, and with no edges there are no vertices: the empty graph.

? What is the name of a graph with no loops and no parallel edges? (one word)
text: simple | simple graph | 简单图
> A simple graph (简单图). A graph with parallel edges is a multigraph.
:::

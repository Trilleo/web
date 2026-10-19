---
title: Euler graphs
zh: 欧拉图
summary: Euler trails and circuits, Eulerian and semi-Eulerian graphs, the degree criteria for undirected and directed graphs (with proofs), Euler graphs as unions of edge-disjoint cycles, and two ways to find an Euler circuit (circuit insertion and Fleury's algorithm).
source: 图6 图论(4) 欧拉图与哈密顿图 (§6.1 欧拉图), 2026-10-15
---

Can you walk through a graph using **every edge exactly once**? That is the question
behind one-stroke drawing puzzles (一笔画), street-sweeping and mail-delivery routes,
and the famous bridges of Königsberg, where graph theory began. This lesson answers it
completely: a short test on the degrees (Lessons 4.2 and 4.5) and on connectivity
(Lessons 4.4 and 4.5) tells you whether such a walk exists, and two algorithms find one.
The next lesson asks the look-alike question about visiting every *vertex* exactly once,
which turns out to be far harder.

## Where this chapter sits

Chapter 6 of the textbook (第6章) is the second chapter of graph theory. The course so
far covered the basic concepts (Unit 4: graphs, degrees, walks, connectivity, matrices).
Chapter 6 has three sections: 6.1 Euler graphs (this lesson), 6.2 Hamilton graphs
(Lesson 5.2) and 6.3 shortest paths (not taught yet). Later chapters cover trees,
planar graphs, and dominating sets, coverings, independent sets, matchings and
colourings.

Everything here uses the vocabulary of Lesson 4.3: a **walk** (通路) may repeat
anything, a **trail** (简单通路, 迹) repeats no edge, a **path** (初级通路, 路径) repeats
no vertex, and a **cycle** (圈) is a closed path. A **bridge** (桥) is an edge whose
removal increases the number of components $p(G)$, and $\lambda(G)$ is the edge
connectivity (Lesson 4.4).

## The seven bridges of Königsberg

In 18th-century Königsberg (now Kaliningrad) the river Pregel split the town into four
land masses — the north bank, the south bank, a central island and an eastern region —
joined by seven bridges. Townspeople asked whether one could take a walk that crosses
every bridge exactly once (and perhaps return home). In 1736 Leonhard Euler showed that
it is impossible, and his argument is usually taken as the birth of graph theory.

Euler's key step was to throw the map away. Only *which* land masses each bridge joins
matters, so make each land mass a vertex and each bridge an edge: A the central island,
B the eastern region, C the north bank, D the south bank. Two bridges join A and C and
two join A and D, so the graph has parallel edges (a multigraph, Lesson 4.1).

::: graph The Königsberg bridges as a multigraph (Figure 6.1.2)
at A: 110, 130
at B: 290, 130
at C: 180, 30
at D: 180, 230
A -- C, A -- C, A -- D, A -- D, A -- B, C -- B, D -- B
show: degrees
:::

Crossing every bridge once is now "a walk through every edge exactly once". Look at the
degrees: all four are odd. We will see that this alone rules the walk out.

## Euler trails and circuits

Think of drawing a figure without lifting the pen and without going over any line
twice. Your pen traces a walk that uses every edge once. If the pen also ends where it
started, the walk is closed.

::: define Euler trail and Euler circuit | 欧拉通路与欧拉回路
In a graph $G$ (undirected or directed), an {{term Euler trail | 欧拉通路}} is a walk
that passes through **every edge exactly once** and through every vertex. An
{{term Euler circuit | 欧拉回路}} is a closed walk that passes through every edge
exactly once and through every vertex. (Definition 6.1.1 in the textbook.)
:::

Since no edge repeats, an Euler trail is a trail in the sense of Lesson 4.3 (it may
revisit vertices), and an Euler circuit is a closed trail. In a directed graph the walk
must follow the arrows.

::: define Eulerian and semi-Eulerian graphs | 欧拉图与半欧拉图
A graph with an Euler circuit is an {{term Eulerian graph | 欧拉图}}. A graph with an
Euler trail but **no** Euler circuit is a {{term semi-Eulerian graph | 半欧拉图}}. By
convention the trivial graph (one vertex, no edges) is Eulerian.
:::

::: callout pitfall "通路" here is a trail, not a path
The Chinese name 欧拉**通路** uses the general word for a walk. An Euler trail never
repeats an *edge*, but it usually repeats *vertices* — it cannot be a path (初级通路) once
some vertex has degree 4 or more. Don't translate it as "Euler path" and then expect
distinct vertices.
:::

The slides' first pair of pictures: two triangles $abc$ and $cde$ sharing the vertex
$c$ (a bowtie), and the same figure with the edge $a$–$c$ taken away.

::: graph An Eulerian graph: the Euler circuit a b c d e c a
at a: 60, 50
at b: 60, 210
at c: 180, 130
at d: 300, 50
at e: 300, 210
a -- b, a -- c, b -- c, c -- d, c -- e, d -- e
highlight: a b c d e c a
show: degrees
:::

::: graph A semi-Eulerian graph: the Euler trail a b c d e c
at a: 60, 50
at b: 60, 210
at c: 180, 130
at d: 300, 50
at e: 300, 210
a -- b, b -- c, c -- d, c -- e, d -- e
highlight: a b c d e c
show: degrees
:::

The bowtie's circuit $abcdeca$ passes through $c$ twice, which is allowed. Without the
edge $a$–$c$ we can still trace everything in one stroke from $a$ to $c$, but no stroke
can come back to where it started: the graph is semi-Eulerian. Notice already that the
semi-Eulerian graph has exactly two odd-degree vertices, $a$ and $c$, and the trail
starts at one and ends at the other.

## Reading the definition on six graphs

Before any theorem, the slides test the definition by hand on six small graphs. Call the
corners of each rectangle $a$ (top left), $b$ (bottom left), $c$ (bottom right) and $d$
(top right); edges are labelled $e_1,\dots,e_6$ as on the slides.

::: graph (a): a rectangle with a loop e₅ at d; Euler circuit e₁e₂e₃e₄e₅
at a: 90, 60
at b: 90, 210
at c: 270, 210
at d: 270, 60
d -- a: e₁, a -- b: e₂, b -- c: e₃, c -- d: e₄, d -- d: e₅
highlight: d a b c d d
show: degrees
:::

::: graph (b): a rectangle with a diagonal e₅; Euler trail e₁e₂e₅e₄e₃
at a: 90, 50
at b: 90, 210
at c: 270, 210
at d: 270, 50
d -- a: e₁, a -- b: e₂, b -- c: e₃, c -- d: e₄, b -- d: e₅
highlight: d a b d c b
show: degrees
:::

::: graph (c): both diagonals; neither an Euler circuit nor an Euler trail
at a: 90, 50
at b: 90, 210
at c: 270, 210
at d: 270, 50
d -- a: e₁, a -- b: e₂, b -- c: e₃, c -- d: e₄, b -- d: e₅, a -- c: e₆
show: degrees
:::

::: example Graphs (a), (b), (c) by the definition
Decide for each undirected graph whether it is Eulerian, semi-Eulerian or neither.
== (a) ==
Start at $d$: $e_1$ to $a$, $e_2$ to $b$, $e_3$ to $c$, $e_4$ back to $d$, then go round
the loop $e_5$. The closed walk $e_1e_2e_3e_4e_5$ uses each edge once: (a) is
**Eulerian**. (A loop adds 2 to its vertex's degree, so $d(d)=4$.)
== (b) ==
$e_1e_2e_5e_4e_3$ ($d\to a\to b\to d\to c\to b$) uses every edge once, but it starts at
$d$ and ends at $b$. Trying other starts never closes up: (b) has an Euler trail and no
Euler circuit, so it is **semi-Eulerian**.
== (c) ==
Adding the second diagonal $e_6$ makes every vertex odd (degree 3). Every attempt gets
stuck with edges left over: (c) has **neither**. The theorems below explain why: four
odd vertices are too many.
:::

The directed graphs (d), (e), (f) use the same rectangle with arrows.

::: graph (d): a directed 4-cycle; Euler circuit e₁e₂e₃e₄
at a: 90, 60
at b: 90, 210
at c: 270, 210
at d: 270, 60
d -> a: e₁, a -> b: e₂, b -> c: e₃, c -> d: e₄
highlight: d a b c d
show: degrees
:::

::: graph (e): no Euler circuit or trail
at a: 90, 50
at b: 90, 210
at c: 270, 210
at d: 270, 50
d -> a: e₁, a -> b: e₂, b -> c: e₃, d -> c: e₄, b -> d: e₅
show: degrees
:::

::: graph (f): no Euler circuit or trail
at a: 90, 60
at b: 90, 210
at c: 270, 210
at d: 270, 60
d -> a: e₁, b -> a: e₂, b -> c: e₃, d -> c: e₄
show: degrees
:::

::: example Graphs (d), (e), (f) by the definition
== (d) ==
Following the arrows $d\to a\to b\to c\to d$ uses every arc once and closes up: (d) is
**Eulerian**.
== (e) ==
Vertex $c$ has two arcs coming in ($e_3$, $e_4$) and none going out. A directed walk
that reaches $c$ is stuck there, so it can enter $c$ only once, as its very last step.
So no walk uses both $e_3$ and $e_4$: **neither**.
== (f) ==
Vertex $a$ has in-degree 2 and out-degree 0, and $b$ has out-degree 2 and in-degree 0. A
walk can start at $b$ only once and end at $a$ only once, so it can't use both arcs
leaving $b$ (or both entering $a$): **neither**.
:::

Checking by hand works for tiny graphs but quickly becomes hopeless. The theorems
replace the search by counting degrees.

## The criterion for undirected graphs

**Why degrees?** Watch an Euler circuit go by a vertex. Each time it passes through, it
comes in along one edge and leaves along another: 2 degrees per visit. Since every edge
is used exactly once, the vertex's degree is $2\times(\text{number of visits})$ — even.
The surprise is that the converse also holds.

::: theorem Euler's theorem for undirected graphs | 欧拉图的判定
An undirected graph $G$ is Eulerian **if and only if** $G$ is connected and has no
vertex of odd degree. (Theorem 6.1.1 in the textbook.)
:::

On the bowtie, the circuit $abcdeca$ visits $a$, $b$, $d$, $e$ once each (degree 2) and
$c$ twice (degree 4): each appearance on the circuit gives 2 degrees.

**Proof of necessity** (Eulerian ⇒ connected, all degrees even). If $G$ is trivial
there is nothing to prove; otherwise let $G$ have $n$ vertices
$V=\{v_1,\dots,v_n\}$ and $m$ edges, and let $C$ be an Euler circuit.

1. Every vertex lies on $C$, so any two vertices $v_i$, $v_j$ are joined by part of
   $C$: $G$ is connected.
2. Each time a vertex $v_i$ appears on $C$ it gets 2 degrees (one edge in, one out; the
   first and last appearance of the start vertex pair up the same way). If it appears
   $k$ times, $d(v_i)=2k$. So no vertex has odd degree.

For the converse we need a lemma: a graph whose degrees are all even must contain a
cycle. The idea is to take the **longest path** and look at its end — a technique you
met in Lesson 4.5.

::: theorem Even degrees force a cycle | 偶度图中有圈
Let $G=(V,E)$ be a graph with at least one vertex that isn't isolated. If $\deg u$ is
even for every $u\in V$, then $G$ contains a cycle.
:::

::: graph The longest path a e b c d: d must have another neighbour on it
at a: 40, 60
at e: 40, 200
at b: 130, 130
at c: 210, 60
at d: 210, 200
at f: 300, 60
at g: 260, 190
at h: 340, 190
a -- e, e -- b, a -- b, b -- c, b -- d, c -- d, f -- g, g -- h, h -- f
highlight: a e b c d
show: degrees
:::

In the picture, $aebcd$ is a longest path. Its end $d$ has even degree, so besides $c$
it has another neighbour $x$. That $x$ must be *on* the path — otherwise $aebcdx$ would
be longer. Here $x=b$, and $b c d b$ closes a cycle.

**Proof.** Since some vertex isn't isolated and degrees are even, the non-isolated
vertices have degree $\ge 2$. Let $P=v_1v_2\ldots v_n$ be a longest path in $G$
(with $n\ge 2$).

1. $\deg v_1\ge 2$, so besides $v_2$ some other edge leaves $v_1$, to a vertex $u$.
   (If that edge is a loop or parallel to $v_1v_2$, it already makes a cycle.)
2. $u$ must lie on $P$: otherwise $uv_1v_2\ldots v_n$ is a longer path.
3. So $u=v_i$ for some $i\ge 3$, and $v_1v_2\ldots v_iv_1$ is a cycle of $G$. ∎

**Proof of sufficiency** (connected, all degrees even ⇒ Eulerian). The idea: find one
cycle, remove it, and the pieces that are left are smaller graphs with even degrees,
which by induction have Euler circuits; then splice those circuits into the cycle.

Let $G$ be connected and non-trivial with $m\ge1$ edges; we induct on $m$.

1. **Base, $m=1$.** A connected graph with one edge and no odd vertex must be a single
   loop — which is an Euler circuit.
2. **Hypothesis.** Suppose the claim holds whenever $m\le k$ ($k\ge1$), and let $G$
   have $m=k+1$ edges.
3. **A cycle.** $G$ is connected with no odd vertex, so $\delta(G)\ge2$, and by the
   lemma $G$ contains a cycle $C$.
4. **Remove it.** Delete all edges of $C$ to get the spanning subgraph $G'$. Each vertex
   of $C$ loses exactly 2 degrees, so $G'$ still has no odd vertex. Let its components
   (those with edges) be $G_1',\dots,G_s'$; each has at most $k$ edges.
5. **Use the hypothesis.** Each $G_i'$ is connected with even degrees, so it has an
   Euler circuit $C_i$. Because $G$ is connected, each $G_i'$ meets $C$ in some vertex
   $v^*_{j_i}$.
6. **Splice.** Start at a vertex $v_r$ of $C$ and walk along $C$. Whenever you reach
   $v^*_{j_i}$, go all the way round $C_i$ back to $v^*_{j_i}$, then continue along $C$.
   You return to $v_r$ having used every edge of $C$ and of every $C_i$ exactly once:
   $$v_r\cdots v^*_{j_1}\cdots v^*_{j_1}\cdots v^*_{j_2}\cdots v^*_{j_2}\cdots v^*_{j_s}\cdots v^*_{j_s}\cdots v_r$$
   This is an Euler circuit of $G$. ∎

::: graph Splicing: the bowtie circuit with the two side cycles inserted at b and d
at a: 110, 70
at b: 110, 190
at c: 180, 130
at d: 250, 70
at e: 250, 190
at p1: 65, 150
at p2: 25, 190
at p3: 65, 230
at q1: 295, 30
at q2: 335, 70
at q3: 295, 110
a -- b, a -- c, b -- c, c -- d, c -- e, d -- e
b -- p1, p1 -- p2, p2 -- p3, p3 -- b
d -- q1, q1 -- q2, q2 -- q3, q3 -- d
highlight: a b p1 p2 p3 b c d q1 q2 q3 d e c a
show: degrees
:::

In this picture (the slides' figure for the proof), take $C$ to be the bowtie circuit
$abcdeca$. Removing its edges leaves two 4-cycles, one through $b$ and one through $d$.
Walking $C$ and taking a detour round each 4-cycle when you reach $b$ and $d$ gives the
highlighted Euler circuit $a\,b\,p_1p_2p_3\,b\,c\,d\,q_1q_2q_3\,d\,e\,c\,a$ (14 edges).

Semi-Eulerian graphs follow by a neat trick: add one edge and reuse Theorem 6.1.1.

::: theorem Semi-Eulerian graphs (undirected) | 半欧拉图的判定
An undirected graph $G$ is semi-Eulerian **if and only if** $G$ is connected and has
**exactly two** vertices of odd degree. Every Euler trail then starts at one of them and
ends at the other. (Theorem 6.1.2 in the textbook.)
:::

**Proof of necessity.** Let $\Gamma=v_{i_0}e_{j_1}v_{i_1}\cdots e_{j_m}v_{i_m}$ be an
Euler trail, with $v_{i_0}\ne v_{i_m}$ (it isn't closed, since $G$ has no Euler
circuit).

1. $G$ is connected, as before: every vertex is on $\Gamma$.
2. A vertex $v$ that is not an end of $\Gamma$ appears $k\ge1$ times inside it, getting
   2 degrees each time: $d(v)=2k$, even.
3. Each end vertex appears once *as an end*, getting 1 degree, plus possibly some
   inner appearances worth 2 each: its degree is odd. The two ends are different, so
   there are exactly two odd vertices.

**Proof of sufficiency.** Let $u_0$ and $v_0$ be the two odd vertices. Add a new edge
$(u_0,v_0)$: the graph $G'=G\cup(u_0,v_0)$ is connected and has no odd vertex, so by
Theorem 6.1.1 it has an Euler circuit $C'$. Deleting the new edge from $C'$ leaves
$C=C'-(u_0,v_0)$, a trail from $u_0$ to $v_0$ through every edge of $G$: an Euler
trail. And $G$ has no Euler circuit, because it has odd vertices. ∎

::: callout note A slip on the slide
The slide says the two ends of the Euler trail are "different and not adjacent"
(不相邻). Only "different" is needed and true: the ends may well be adjacent (in a single
edge $u$–$v$, the Euler trail runs from $u$ to $v$). The conclusion — each end has odd
degree — is unaffected.
:::

::: example The bridges of Königsberg resolved
Is there a walk crossing each of the seven bridges exactly once? One that returns home?
== Degrees ==
From the figure: $d(A)=5$, $d(B)=d(C)=d(D)=3$. The degree sum is $14=2\times7$, as the
handshake theorem (Lesson 4.2) requires.
== Euler circuit? ==
Theorem 6.1.1 needs every degree even; here all four are odd. No circuit.
== Euler trail? ==
Theorem 6.1.2 allows exactly two odd vertices; there are four. No trail either.
== Answer ==
The walk is impossible, with or without returning home. (To make it possible you would
need to add or remove bridges until at most two land masses have an odd number of
them: one extra bridge between two of them, say B and C, leaves two odd vertices and
makes a trail possible; a second one, A–D, makes every degree even.)
:::

::: callout key The whole test in one line
Connected, then count odd-degree vertices: **0 odd → Eulerian (circuit), 2 odd →
semi-Eulerian (trail between the two odd ones), anything else → neither.** (By the
handshake theorem the number of odd vertices is always even, so "1 odd" never happens.)
:::

## Directed graphs

In a directed graph the walk must follow the arrows. Each time it passes through a
vertex it enters along one arc and leaves along another, so it now needs **in-degree
equal to out-degree**. Connectivity also becomes stricter: to get round and come back,
every vertex must be reachable from every other — strongly connected (Lesson 4.5).

::: theorem Directed Eulerian graphs | 有向欧拉图的判定
A directed graph $D$ is Eulerian **if and only if** $D$ is strongly connected and every
vertex has in-degree equal to out-degree: $d^-(v)=d^+(v)$ for all $v$. (Theorem 6.1.3
in the textbook; the proof, like the undirected one, is omitted on the slides.)
:::

::: theorem Directed semi-Eulerian graphs | 有向半欧拉图的判定
A directed graph $D$ is semi-Eulerian **if and only if** $D$ is unilaterally connected
and has exactly two vertices whose in- and out-degrees differ: one with
$d^-(v)=d^+(v)+1$ and one with $d^+(u)=d^-(u)+1$; every other vertex has
$d^-=d^+$. Every Euler trail starts at $u$ (one extra arc out) and ends at $v$ (one
extra arc in). (Theorem 6.1.4 in the textbook; proof omitted.)
:::

The textbook calls $u$ and $v$ the two "odd" vertices; what matters is the in/out
imbalance of $\pm1$, not whether the total degree is odd.

::: example Graphs (d), (e), (f) by the theorems
Use the degree lists under the figures above.
== (d) ==
Every vertex: in 1, out 1. The 4-cycle is strongly connected: **Eulerian**.
== (e) ==
$c$: in 2, out 0 — an imbalance of 2. Theorem 6.1.4 allows imbalances of only $\pm1$
(and Theorem 6.1.3 none): **neither**.
== (f) ==
$a$: in 2, out 0; $b$: out 2, in 0. Imbalances of 2 again: **neither**. ($D$ isn't even
unilaterally connected: neither of $a$, $c$ can reach the other.)
:::

::: example Textbook exercise 6.2 (p. 164)
Are these statements true? (1) For $n\ge3$, the complete graph $K_n$ is Eulerian.
(2) The directed complete graph of order $n\ge2$ is Eulerian. (3) For even positive $r$,
$s$, the complete bipartite graph $K_{r,s}$ is Eulerian.
== (1) False ==
Every vertex of $K_n$ has degree $n-1$, which is even only when $n$ is odd. $K_3$ and
$K_5$ are Eulerian, but $K_4$ has four vertices of degree 3. So the statement fails for
even $n$.
== (2) True ==
In the directed complete graph every pair is joined by two opposite arcs, so every
vertex has $d^+=d^-=n-1$, and every vertex reaches every other directly: strongly
connected. Theorem 6.1.3 applies.
== (3) True ==
$K_{r,s}$ is connected; the $r$ vertices on one side have degree $s$ and the $s$ on the
other have degree $r$, all even. Theorem 6.1.1 applies. (For example $K_{2,4}$, which
reappears in Lesson 5.2.)
:::

## Euler graphs as unions of cycles

The sufficiency proof peeled cycles off the graph one at a time. Doing that until
nothing is left shows that an Euler graph is nothing but cycles glued together at
vertices.

::: theorem Euler graphs and cycles | 欧拉图与圈
$G$ is a non-trivial Eulerian graph **if and only if** $G$ is connected and is the
union of finitely many edge-disjoint cycles (边不重的圈). (Theorem 6.1.5 in the
textbook; proof omitted.)
:::

The splicing figure above is an example: the 14 edges split into the triangles $abc$
and $cde$ and the two 4-cycles. Putting the theorems together:

::: theorem Three equivalent conditions | 欧拉图的等价条件
For a **connected** graph $G$, these are equivalent:
1. $G$ is Eulerian;
2. every vertex of $G$ has even degree;
3. the edge set of $G$ can be partitioned into cycles, no two sharing an edge.
:::

::: callout pitfall Connectivity is part of every criterion
"All degrees even" is not enough on its own: two disjoint triangles have all degrees 2
but no Euler circuit, since no walk can get from one to the other. Always check
connectivity first. (Isolated vertices are the exception people forget: a graph with an
isolated vertex and at least one edge is disconnected, so by the definition — the circuit
must pass every vertex — it isn't Eulerian.)
:::

::: example Example 6.1.1: Euler graphs have no bridges
Prove that a non-trivial Eulerian graph $G$ has edge connectivity $\lambda(G)\ge2$.
== What to show ==
$\lambda(G)\ge2$ means $G$ is connected and removing a single edge never disconnects it
— that is, no edge is a bridge (Lesson 4.4). $G$ is connected because it is Eulerian.
== Proof ==
Let $C$ be an Euler circuit and $e=(u,v)$ any edge. $e$ lies on $C$. Removing $e$ from
the circuit leaves the rest of $C$, a walk from $v$ back to $u$ through every vertex. So
$G-e$ is still connected: $p(G-e)=p(G)=1$, and $e$ is not a bridge. Since $e$ was
arbitrary, $\lambda(G)\ge2$. ∎
:::

## Finding an Euler circuit

Knowing a circuit exists is one thing; drawing it is another. Careless greedy walking
can get stuck: on the splicing figure, start at $a$, go to $b$, then straight to $c$,
and the 4-cycle at $b$ is cut off for ever.

**Circuit insertion** (逐步插入回路法). The proof of Theorem 6.1.1 is constructive, and it
*is* an algorithm: find any cycle (or closed trail) $C$; while some edges are unused,
pick a vertex of $C$ that still has unused edges, walk a closed trail through unused edges
from it, and splice that trail into $C$ at that vertex. Because every degree is even,
a walk on unused edges that leaves a vertex can always continue until it comes back to
where it started.

**Fleury's algorithm** (弗勒里算法). Walk from any vertex, deleting each edge as you use it,
and follow one rule: **don't cross a bridge if you can help it** (能不走桥就不走桥) —
choose a bridge of the remaining graph only when it is the only edge left at the current
vertex. Crossing a bridge too early strands the edges on the far side, which is exactly
how the greedy walk above got stuck.

::: example Fleury's algorithm on the splicing figure
Find an Euler circuit starting at $a$. "Remaining graph" means the edges not yet used.
== At a ==
Edges $a$–$b$, $a$–$c$; neither is a bridge. Take $a\to b$.
== At b ==
Edges $b$–$c$, $b$–$p_1$, $b$–$p_3$. With $a$–$b$ gone, $b$–$c$ is now a bridge: removing
it would cut $\{b,p_1,p_2,p_3\}$ off from the rest. Avoid it: $b\to p_1\to p_2\to p_3\to b$
(each step forced).
== Back at b, then c ==
Only $b$–$c$ is left at $b$; a bridge is allowed when it's the only choice: $b\to c$.
At $c$: edges $c$–$a$, $c$–$d$, $c$–$e$. $c$–$a$ is a bridge (it is $a$'s last edge), so
avoid it; $c$–$d$ is not. Take $c\to d$.
== At d ==
Edges $d$–$e$, $d$–$q_1$, $d$–$q_3$. $d$–$e$ would strand the 4-cycle at $d$ (a bridge), so
go round: $d\to q_1\to q_2\to q_3\to d$.
== Finish ==
$d\to e\to c\to a$, each forced. The circuit is
$a\,b\,p_1p_2p_3\,b\,c\,d\,q_1q_2q_3\,d\,e\,c\,a$: 14 edges, every one once — the same
circuit circuit insertion gave.
:::

::: callout tip Starting point for a trail
In a semi-Eulerian graph, run either method from one of the two odd vertices (in a
directed graph, from the vertex with the extra arc out). Started anywhere else, the walk
will fail. Or add the edge between the odd vertices, find a circuit, and remove it
again — exactly the proof of Theorem 6.1.2.
:::

## One-stroke drawing

"一笔画" puzzles ask you to draw a figure in one stroke: that is an Euler trail. "Draw it
in one stroke and end where you began" is an Euler circuit. The in-class question used a
puzzle from a phone game: five dots on top ($T_1,\dots,T_5$), two lower corners $L$, $R$,
and two bottom dots $P$, $Q$.

::: graph The in-class one-stroke puzzle
at T1: 40, 50
at T2: 110, 50
at T3: 180, 50
at T4: 250, 50
at T5: 320, 50
at L: 40, 160
at R: 320, 160
at P: 140, 225
at Q: 220, 225
T1 -- T2, T1 -- L, T2 -- L, T2 -- Q, T3 -- P, T3 -- Q, T4 -- P, T4 -- T5, T4 -- R, T5 -- R
show: degrees
:::

::: example Can it be drawn in one stroke? And back to the start?
== Connected? ==
Yes: $T_1T_2L$ is joined through $T_2$–$Q$–$T_3$–$P$–$T_4$ to $T_4T_5R$.
== Odd vertices ==
$d(T_2)=3$ ($T_1$, $L$, $Q$) and $d(T_4)=3$ ($P$, $T_5$, $R$); all others have degree 2.
Exactly two odd vertices.
== Answer ==
By Theorem 6.1.2 there is an Euler trail, from $T_2$ to $T_4$, but no Euler circuit: it
**can** be drawn in one stroke, but **cannot** end at its starting point. One stroke:
$T_2\,T_1\,L\,T_2\,Q\,T_3\,P\,T_4\,T_5\,R\,T_4$ (10 edges).
:::

::: callout exam What exams ask
- Decide whether a drawn graph (or $K_n$, $K_{r,s}$, a directed complete graph, the
  Königsberg graph) is Eulerian, semi-Eulerian or neither — **say which theorem you use**
  and show the degrees and connectivity.
- One-stroke questions (in-class question: answer C, "yes, no").
- Prove a small property, like Example 6.1.1 ($\lambda(G)\ge2$), or reproduce the
  proof of Theorem 6.1.1 or 6.1.2.
- Combined questions with bipartite and Hamilton graphs (Lesson 5.2).
:::

**Coming next:** Lesson 5.2 asks for a walk through every *vertex* exactly once —
Hamilton paths and cycles — where no simple degree test exists.

::: cards Euler graphs
Euler trail (欧拉通路) :: A walk through every edge exactly once (and through every vertex); it may repeat vertices.
Euler circuit (欧拉回路) :: A closed walk through every edge exactly once and every vertex.
Eulerian vs semi-Eulerian graph :: Eulerian: has an Euler circuit (the trivial graph counts). Semi-Eulerian: has an Euler trail but no Euler circuit.
Theorem 6.1.1: undirected Eulerian :: Connected and no vertex of odd degree.
Theorem 6.1.2: undirected semi-Eulerian :: Connected and exactly two odd-degree vertices; every Euler trail runs from one to the other.
Theorem 6.1.3: directed Eulerian :: Strongly connected and in-degree = out-degree at every vertex.
Theorem 6.1.4: directed semi-Eulerian :: Unilaterally connected; one vertex with out = in + 1 (the start), one with in = out + 1 (the end), the rest balanced.
Theorem 6.1.5: Euler graphs and cycles :: A non-trivial graph is Eulerian iff it is connected and a union of edge-disjoint cycles.
Lemma behind Theorem 6.1.1 :: If every degree is even and some vertex isn't isolated, the graph has a cycle (look at the end of a longest path).
Edge connectivity of a non-trivial Euler graph :: $\lambda(G)\ge2$: no edge is a bridge, because every edge lies on the Euler circuit.
Fleury's algorithm (弗勒里算法) :: Walk and delete used edges; never cross a bridge of the remaining graph unless it's the only edge left.
Circuit insertion (逐步插入回路法) :: Find a cycle, then repeatedly splice in closed trails of unused edges at vertices on it.
Which complete graphs $K_n$ are Eulerian? :: Odd $n$ only (every degree is $n-1$).
Seven bridges of Königsberg :: Degrees 5, 3, 3, 3: four odd vertices, so no Euler trail or circuit.
:::

::: quiz Euler graphs
? Can the in-class puzzle figure be drawn in one stroke (能否一笔画出)? And in one stroke ending where it started?
- [ ] A. Yes, yes
- [ ] B. No, no
- [x] C. Yes, no
- [ ] D. No, yes
> The graph is connected, and only $T_2$ and $T_4$ have odd degree (3). By Theorem 6.1.2 it has an Euler trail from $T_2$ to $T_4$ but no Euler circuit. Rain Classroom's answer: C.

? Which of these are Eulerian? (tick all; textbook exercise 6.2)
- [ ] $K_n$ for every $n\ge3$
- [x] The directed complete graph of order $n\ge2$
- [x] $K_{r,s}$ with $r$, $s$ both even and positive
- [x] $K_5$
> $K_n$ has all degrees $n-1$: Eulerian only for odd $n$, so "every $n\ge3$" is false ($K_4$ fails) but $K_5$ is fine. The directed complete graph has $d^+=d^-=n-1$ everywhere and is strongly connected. $K_{r,s}$ has degrees $s$ and $r$, both even, and is connected.

? How many vertices of odd degree does the Königsberg bridge graph have?
answer: 4
> $d(A)=5$, $d(B)=d(C)=d(D)=3$: all four are odd, so there is neither an Euler circuit nor an Euler trail.

? At least how many new bridges must be built in Königsberg (new edges between land masses) so that a walk crossing every bridge exactly once becomes possible (not necessarily returning)?
answer: 1
> An Euler trail needs exactly two odd vertices. One new edge between two of the odd vertices (say B–C) makes them even, leaving only A and D odd. Zero new edges leave four odd vertices.

? And at least how many to make a closed walk (an Euler circuit) possible?
answer: 2
> All four odd vertices must become even. Each new edge changes the parity of at most two vertices, so at least 2 are needed, and B–C plus A–D does it.

? A connected graph has degree sequence $4, 4, 3, 3, 2, 2$. Which is true?
- [ ] It is Eulerian
- [x] It is semi-Eulerian, and every Euler trail starts at one degree-3 vertex and ends at the other
- [ ] It is neither
- [ ] It can't be decided without the drawing
> Connected with exactly two odd vertices: Theorem 6.1.2. The trail's ends are the two odd vertices.

? A directed graph is unilaterally connected and its (out, in) degrees are $a$: (2, 1), $b$: (1, 1), $c$: (1, 2), $d$: (1, 1). Is it semi-Eulerian?
- [x] Yes, with Euler trails from $a$ to $c$
- [ ] Yes, with Euler trails from $c$ to $a$
- [ ] No, it is Eulerian
- [ ] No, neither
> One vertex has one extra arc out ($a$, the start), one has one extra arc in ($c$, the end), the rest are balanced: Theorem 6.1.4.

? What is the edge connectivity $\lambda(G)$ of a non-trivial Eulerian graph at least?
answer: 2
> Example 6.1.1: every edge lies on the Euler circuit, so deleting one edge leaves the rest of the circuit, which still connects everything. No edge is a bridge.

? Fleury's algorithm avoids one kind of edge whenever it can. Which? (one word, English or Chinese)
text: bridge | bridges | 桥 | cut edge | 割边
> 能不走桥就不走桥: crossing a bridge of the remaining graph too early cuts off the edges on the other side.

? How many edges does an Euler circuit of $K_7$ have?
answer: comb(7,2)
> $K_7$ is Eulerian (degrees 6, even), and an Euler circuit uses every edge once: $\binom72=21$.
:::

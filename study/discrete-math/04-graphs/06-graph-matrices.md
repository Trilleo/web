---
title: Graphs as matrices
zh: 图的矩阵表示
summary: The incidence matrix of undirected and directed graphs, the adjacency matrix and its powers (counting walks), and the reachability matrix, with their properties.
source: 图5-3 图的矩阵表示 (§5.4), 2026-10-13
---

A drawing is the best way for a person to see a graph, but a computer needs numbers.
This lesson stores a graph in a matrix in three ways: which edges touch which vertices
(the incidence matrix), how many edges run between each pair of vertices (the adjacency
matrix), and who can reach whom (the reachability matrix). The payoff is that questions
about walks turn into matrix arithmetic: the powers $A^2, A^3, \dots$ of the adjacency
matrix count walks of each length, and from them you can read off connectivity
(Lesson 4.5) without drawing anything. It is the same idea as relation matrices in
Lessons 2.1 and 2.3, now with counts instead of only 0 and 1.

## Labelled graphs and the three matrices

A matrix has a first row, a second row, and so on, so before writing one we fix an
order: the vertices $v_1,v_2,\dots,v_n$ and the edges $e_1,e_2,\dots,e_m$. A graph with
its vertices (and edges) numbered like this is a **labelled graph** (标定图, Lesson 4.1).
A different numbering gives a different matrix of the same graph (rows and columns
swapped about), so always say which order you used.

The three matrices of this lesson:

| Matrix | Size | Entry in row $i$, column $j$ |
| --- | --- | --- |
| Incidence matrix $M$ | $n\times m$ (vertices × edges) | how $v_i$ meets edge $e_j$ |
| Adjacency matrix $A$ | $n\times n$ | the number of edges from $v_i$ to $v_j$ |
| Reachability matrix $P$ | $n\times n$ | 1 if $v_i$ reaches $v_j$, else 0 |

## The incidence matrix of an undirected graph

Think of a register: one row per vertex, one column per edge, and a tick where an edge
touches a vertex. A loop touches its vertex "twice" (both its ends are there), so it
gets a 2.

::: define Incidence matrix of an undirected graph | 无向图的关联矩阵
Let $G=\langle V,E\rangle$ be an undirected graph with $V=\{v_1,\dots,v_n\}$ and
$E=\{e_1,\dots,e_m\}$, and let $m_{ij}$ be the incidence number (关联次数, Lesson 4.1)
of $v_i$ and $e_j$: 0 if $v_i$ is not an end of $e_j$, 1 if it is one end, 2 if $e_j$ is
a loop at $v_i$. The $n\times m$ matrix $(m_{ij})$ is the
{{term incidence matrix | 关联矩阵}} of $G$, written $M(G)$. (Definition 5.4.1 in the
textbook.)
:::

::: graph Figure 5.4.1: a loop e1, parallel edges e2 and e3
at v1: 110, 90
at v2: 290, 90
at v3: 110, 220
at v4: 290, 220
v1 -- v1: e1, v1 -- v2: e2, v1 -- v2: e3, v1 -- v3: e4, v3 -- v4: e5
show: degrees
:::

::: example The incidence matrix of Figure 5.4.1
Write $M(G)$ for the graph above: $e_1$ a loop at $v_1$, $e_2$ and $e_3$ both joining
$v_1$ and $v_2$, $e_4=v_1v_3$, $e_5=v_3v_4$.
== Column by column ==
Each column is one edge. $e_1$ is a loop at $v_1$: a 2 in row 1. $e_2$ and $e_3$: a 1
in rows 1 and 2. $e_4$: rows 1 and 3. $e_5$: rows 3 and 4.
== The matrix ==
Rows $v_1,\dots,v_4$, columns $e_1,\dots,e_5$:
$$M(G)=\begin{array}{c|ccccc} & e_1 & e_2 & e_3 & e_4 & e_5\\ \hline v_1 & 2&1&1&1&0\\ v_2 & 0&1&1&0&0\\ v_3 & 0&0&0&1&1\\ v_4 & 0&0&0&0&1\end{array}$$
== Check ==
Every column adds up to 2; the rows add up to $5,2,2,1$, the degrees of
$v_1,\dots,v_4$ (the loop counts 2 towards $d(v_1)$).
:::

The check in the last step always works. Everything below comes from "each edge has
two ends".

::: theorem Properties of the undirected incidence matrix | 无向图关联矩阵的性质
For an undirected graph $G$ with incidence matrix $M(G)=(m_{ij})_{n\times m}$
(Proposition 5.4.1 in the textbook):
1. every column adds up to 2: $\sum_{i=1}^{n}m_{ij}=2$ for $j=1,\dots,m$, because
   every edge has exactly two ends (a loop's two ends coincide);
2. row $i$ adds up to the degree of $v_i$: $\sum_{j=1}^{m}m_{ij}=d(v_i)$;
3. the sum of all entries is the total degree, twice the number of edges:
   $\sum_{i=1}^{n}d(v_i)=\sum_{i=1}^{n}\sum_{j=1}^{m}m_{ij}=2m$;
4. columns $j$ and $k$ are equal if and only if $e_j$ and $e_k$ are parallel edges;
5. row $i$ is all zeros if and only if $v_i$ is an isolated vertex.
:::

Property 3 is the handshake theorem of Lesson 4.2, proved by adding up the matrix in
two ways: by columns ($2+2+\cdots=2m$) and by rows (the degrees).

::: formula Sums of the incidence matrix | 关联矩阵的行和与列和
$$\sum_{i=1}^{n}m_{ij}=2,\qquad \sum_{j=1}^{m}m_{ij}=d(v_i),\qquad \sum_{i=1}^{n}\sum_{j=1}^{m}m_{ij}=2m$$
--
$m_{ij}$ | the incidence number of vertex $v_i$ and edge $e_j$ (0, 1, or 2 for a loop)
$n,\ m$ | the numbers of vertices and edges
$d(v_i)$ | the degree of $v_i$
:::

## The incidence matrix of a directed graph

For an arc we also want to know which end is the start. Put $+1$ where the arc leaves
and $-1$ where it arrives. (A loop would leave and arrive at the same vertex, so this
matrix is only defined for digraphs without loops.)

::: define Incidence matrix of a directed graph | 有向图的关联矩阵
Let $D=\langle V,E\rangle$ be a directed graph **without loops**,
$V=\{v_1,\dots,v_n\}$, $E=\{e_1,\dots,e_m\}$, and let
$$m_{ij}=\begin{cases}1, & v_i \text{ is the start of } e_j,\\ 0, & v_i \text{ is not an end of } e_j,\\ -1, & v_i \text{ is the end of } e_j.\end{cases}$$
The $n\times m$ matrix $(m_{ij})$ is the incidence matrix of $D$, written $M(D)$.
(Definition 5.4.2 in the textbook.)
:::

::: graph Figure 5.4.2: a digraph with parallel arcs e4 and e5
at v1: 70, 60
at v2: 290, 60
at v3: 70, 210
at v4: 290, 210
v2 -> v1: e1, v1 -> v2: e2, v2 -> v4: e3, v3 -> v4: e4, v3 -> v4: e5
show: degrees
:::

::: example The incidence matrix of Figure 5.4.2
The arcs are $e_1=\langle v_2,v_1\rangle$, $e_2=\langle v_1,v_2\rangle$,
$e_3=\langle v_2,v_4\rangle$, $e_4=e_5=\langle v_3,v_4\rangle$. Write $M(D)$.
== Column by column ==
$e_1$ goes from $v_2$ to $v_1$: $+1$ in row 2, $-1$ in row 1. $e_2$ the other way:
$+1$ in row 1, $-1$ in row 2. $e_3$: $+1$ in row 2, $-1$ in row 4. $e_4$ and $e_5$:
$+1$ in row 3, $-1$ in row 4.
== The matrix ==
$$M(D)=\begin{bmatrix}-1&1&0&0&0\\1&-1&1&0&0\\0&0&0&1&1\\0&0&-1&-1&-1\end{bmatrix}$$
(rows $v_1,\dots,v_4$, columns $e_1,\dots,e_5$).
== Check ==
Row 4 has no $+1$ and three $-1$s: $d^+(v_4)=0$, $d^-(v_4)=3$. Columns 4 and 5 are
equal: $e_4$, $e_5$ are parallel.
:::

::: callout note M(G) or M(D)
The slides label this matrix $M(G)$; for a directed graph $D$ the textbook's name is
$M(D)$.
:::

::: theorem Properties of the directed incidence matrix | 有向图关联矩阵的性质
For a loopless digraph $D$ with incidence matrix $M(D)$:
1. every column has exactly one $+1$ (where the arc starts) and one $-1$ (where it
   ends), so every column adds up to 0;
2. the number of $+1$s equals the number of $-1$s, and both equal $m$, the number of
   arcs;
3. in row $i$ the number of $+1$s is $d^+(v_i)$ and the number of $-1$s is
   $d^-(v_i)$;
4. parallel arcs give equal columns.
:::

::: callout pitfall The row sum is not the degree here
In $M(D)$ the entries of row $i$ add up to $d^+(v_i)-d^-(v_i)$, not to $d(v_i)$, because
the $+1$s and $-1$s cancel. Count them separately. And remember the definition needs a
digraph **without loops**.
:::

## The adjacency matrix of a directed graph

The incidence matrix has a column per edge, which gets wide. Usually we only care how
many arcs go from each vertex to each other vertex: a square table, like a road atlas's
table of direct routes between towns.

::: define Adjacency matrix of a directed graph | 有向图的邻接矩阵
Let $D=\langle V,E\rangle$ be a directed graph with $V=\{v_1,\dots,v_n\}$, and let
$a_{ij}^{(1)}$ be the number of arcs from $v_i$ to $v_j$. The $n\times n$ matrix
$(a_{ij}^{(1)})$ is the {{term adjacency matrix | 邻接矩阵}} of $D$, written $A(D)$ or
just $A$. (Definition 5.4.3 in the textbook.)
:::

Row $i$ lists where arcs from $v_i$ go; column $j$ lists where arcs into $v_j$ come
from. A loop at $v_i$ adds 1 to $a_{ii}^{(1)}$, and parallel arcs give entries bigger
than 1. For a simple digraph $A$ is exactly the relation matrix of Lesson 2.1.

::: graph Figure 5.4.3: parallel arcs v1 → v2, v3 ⇄ v4, a loop at v4
at v1: 70, 60
at v2: 290, 60
at v3: 70, 210
at v4: 290, 210
v1 -> v2, v1 -> v2, v1 -> v3, v2 -> v3, v3 -> v4, v4 -> v3, v4 -> v4
show: degrees
:::

::: example The adjacency matrix of Figure 5.4.3
The arcs: two from $v_1$ to $v_2$, then $v_1\to v_3$, $v_2\to v_3$, $v_3\to v_4$,
$v_4\to v_3$, and a loop at $v_4$. Write $A$.
== Row by row ==
Row 1: two arcs to $v_2$, one to $v_3$: $0\;2\;1\;0$. Row 2: one arc to $v_3$. Row 3:
one arc to $v_4$. Row 4: one arc to $v_3$ and the loop: $0\;0\;1\;1$.
== The matrix ==
$$A=\begin{bmatrix}0&2&1&0\\0&0&1&0\\0&0&0&1\\0&0&1&1\end{bmatrix}$$
== Check ==
Row sums $3,1,1,2$ are the out-degrees; column sums $0,2,3,2$ the in-degrees; both
total $7$, the number of arcs.
:::

::: theorem Degrees from the adjacency matrix | 有向图邻接矩阵的性质
For a digraph $D$ with $n$ vertices, $m$ arcs and adjacency matrix $A$:
$$\begin{gathered}\sum_{j=1}^{n}a_{ij}^{(1)}=d^+(v_i),\qquad \sum_{i=1}^{n}a_{ij}^{(1)}=d^-(v_j),\\ \sum_{i=1}^{n}\sum_{j=1}^{n}a_{ij}^{(1)}=\sum_{i=1}^{n}d^+(v_i)=\sum_{j=1}^{n}d^-(v_j)=m.\end{gathered}$$
:::

::: formula Row and column sums of the adjacency matrix | 邻接矩阵的行和与列和
$$\sum_{j}a_{ij}^{(1)}=d^+(v_i),\qquad \sum_{i}a_{ij}^{(1)}=d^-(v_j),\qquad \sum_{i,j}a_{ij}^{(1)}=m$$
--
$a_{ij}^{(1)}$ | the number of arcs from $v_i$ to $v_j$
$d^+(v_i),\ d^-(v_j)$ | out-degree of $v_i$ and in-degree of $v_j$
$m$ | the number of arcs
:::

::: callout pitfall Rows go out, columns come in
Row $i$ is "from $v_i$", column $j$ is "to $v_j$". Mixing them up transposes the
matrix, which for a digraph is the graph with every arrow reversed.
:::

## Counting walks with powers of A

Here is the matrix's real power. How many walks of length 2 go from $v_i$ to $v_j$? Each
one goes $v_i\to v_k\to v_j$ through some middle vertex $v_k$. For a fixed $v_k$ there
are $a_{ik}^{(1)}\cdot a_{kj}^{(1)}$ choices of the two arcs, so the total is
$\sum_k a_{ik}^{(1)}a_{kj}^{(1)}$ — exactly the $(i,j)$ entry of $A^2$ in the ordinary
matrix product.

::: graph A five-vertex digraph (slide 12-040)
v1 -> v2, v2 -> v3, v3 -> v1, v3 -> v4, v3 -> v5, v4 -> v1, v4 -> v2, v4 -> v5, v5 -> v1
:::

::: example One entry of A² (slide 12-040)
The digraph above has adjacency matrix
$$A=\begin{bmatrix}0&1&0&0&0\\0&0&1&0&0\\1&0&0&1&1\\1&1&0&0&1\\1&0&0&0&0\end{bmatrix}.$$
Find the entry in row 3, column 1 of $A^2$, and say what it counts.
== Row 3 times column 1 ==
Multiply row 3 of $A$ by column 1 of $A$, entry by entry, and add:
$$\begin{aligned}A^2[3][1]&=A[3][1]A[1][1]+A[3][2]A[2][1]+A[3][3]A[3][1]+A[3][4]A[4][1]+A[3][5]A[5][1]\\&=1\cdot0+0\cdot0+0\cdot1+1\cdot1+1\cdot1=2.\end{aligned}$$
== Read it as walks ==
The two non-zero terms are the middle vertices $v_4$ and $v_5$: the walks
$v_3\,v_4\,v_1$ and $v_3\,v_5\,v_1$. So there are 2 walks of length 2 from $v_3$ to
$v_1$.
:::

The same step works for any length: a walk of length $l+1$ is a walk of length $l$ plus
one more arc.

::: theorem Powers of the adjacency matrix count walks | 邻接矩阵的幂与通路数
Let $A$ be the adjacency matrix of a digraph $D$ with $V=\{v_1,\dots,v_n\}$. For
$l\ge1$, the entry $a_{ij}^{(l)}$ of $A^l$ is the number of walks (通路) of length $l$
from $v_i$ to $v_j$ in $D$. In particular:
- $a_{ii}^{(l)}$ is the number of closed walks (回路) of length $l$ from $v_i$ back to
  itself;
- $\sum_{i=1}^{n}\sum_{j=1}^{n}a_{ij}^{(l)}$ is the total number of walks of length $l$
  in $D$ (closed ones included);
- $\sum_{i=1}^{n}a_{ii}^{(l)}$ (the trace of $A^l$) is the number of closed walks of
  length $l$.

(Theorem 5.4.1 in the textbook.)
:::

*Proof*, by induction on $l$. It is enough to show that $a_{ij}^{(l)}$ counts the walks
of length $l$ from $v_i$ to $v_j$; the other statements just add these numbers up.
1. **$l=1$.** By definition $a_{ij}^{(1)}$ is the number of arcs from $v_i$ to $v_j$,
   which is the number of walks of length 1.
2. **Step.** Suppose $a_{ij}^{(l)}$ counts the walks of length $l$ from $v_i$ to $v_j$,
   for all $i,j$. Every walk of length $l+1$ from $v_i$ to $v_j$ is a walk of length $l$
   from $v_i$ to some vertex $v_k$, followed by an arc from $v_k$ to $v_j$.
3. By the hypothesis there are $a_{ik}^{(l)}$ walks of the first kind, and
   $a_{kj}^{(1)}$ arcs for the last step, so the number of walks of length $l+1$ is
   $$\sum_{k=1}^{n}a_{ik}^{(l)}\,a_{kj}^{(1)}=a_{ij}^{(l+1)},$$
   the $(i,j)$ entry of $A^l\cdot A=A^{l+1}$. ∎

::: formula Walks counted by matrix powers | 长度为 l 的通路数
$$a_{ij}^{(l+1)}=\sum_{k=1}^{n}a_{ik}^{(l)}\,a_{kj}^{(1)},\qquad B_l=A+A^2+\cdots+A^l$$
--
$a_{ij}^{(l)}$ | entry $(i,j)$ of $A^l$: walks of length $l$ from $v_i$ to $v_j$
$B_l$ | its entries count walks of length $1$ to $l$
$\sum_{i,j}b_{ij}^{(l)}$ | all walks of length at most $l$; the trace $\sum_i b_{ii}^{(l)}$: closed walks of length at most $l$
:::

::: theorem Walks of length at most l | 推论 5.4.1
Let $l\ge1$ and $B_l=A+A^2+\cdots+A^l$. Then the sum of all entries of $B_l$,
$\sum_{i=1}^{n}\sum_{j=1}^{n}b_{ij}^{(l)}$, is the number of walks in $D$ of length at
most $l$, and $\sum_{i=1}^{n}b_{ii}^{(l)}$ is the number of closed walks of length at
most $l$. (Corollary 5.4.1 in the textbook.)
:::

::: example Powers of A for Figure 5.4.3
For the digraph of Figure 5.4.3, find the number of walks of length 3 from $v_1$ to
$v_4$, of length 4 from $v_1$ to $v_3$, and of closed walks of length 4 at $v_3$. Then
count all walks and all closed walks of length at most 4.
== The powers ==
Multiplying out (ordinary matrix products):
$$\begin{gathered}A^2=\begin{bmatrix}0&0&2&1\\0&0&0&1\\0&0&1&1\\0&0&1&2\end{bmatrix},\qquad A^3=\begin{bmatrix}0&0&1&3\\0&0&1&1\\0&0&1&2\\0&0&2&3\end{bmatrix},\\ A^4=\begin{bmatrix}0&0&3&4\\0&0&1&2\\0&0&2&3\\0&0&3&5\end{bmatrix}.\end{gathered}$$
== Read off the entries ==
$a_{14}^{(3)}=3$: three walks of length 3 from $v_1$ to $v_4$ (two through either of
the parallel arcs, $v_1v_2v_3v_4$, and one $v_1v_3v_4v_4$ using the loop).
$a_{13}^{(4)}=3$. $a_{33}^{(4)}=2$: the closed walks $v_3v_4v_3v_4v_3$ and
$v_3v_4v_4v_4v_3$. Also $a_{43}^{(2)}=1$: only $v_4v_4v_3$.
== Walks of length at most 4 ==
$B_4=A+A^2+A^3+A^4$ has entry sums $7+9+14+23=53$, so $D$ has 53 walks of length at
most 4. The traces are $1+3+4+7=15$: of these, 15 are closed walks.
:::

::: callout pitfall Walks, not paths
$A^l$ counts **walks**: vertices and edges may repeat (the loop at $v_4$ is used three
times in $v_3v_4v_4v_4v_3$). It does not count paths or cycles. Also, a closed walk is
counted once for each starting vertex in the trace: $v_3v_4v_3$ and $v_4v_3v_4$ are two
closed walks of length 2.
:::

::: callout exam Typical matrix questions
Given $A$ (or a picture), compute $A^2$, $A^3$, …, and answer "how many walks of length
$l$ from $v_i$ to $v_j$" (one entry), "how many walks of length $l$" (sum of all
entries), "how many closed walks" (the trace) or "of length at most $l$" (add the
powers). Show the row-times-column working for at least one entry.
:::

## The adjacency matrix of an undirected graph

An undirected edge between $v_i$ and $v_j$ can be used in both directions, so it is
counted in both $a_{ij}$ and $a_{ji}$.

::: define Adjacency matrix of an undirected graph | 无向图的邻接矩阵
For an undirected graph $G$ with $V=\{v_1,\dots,v_n\}$, let $a_{ij}^{(1)}$ be the number
of edges joining $v_i$ and $v_j$; the slides count a loop at $v_i$ as 2 in
$a_{ii}^{(1)}$, as in the incidence matrix. The matrix $(a_{ij}^{(1)})_{n\times n}$ is
the adjacency matrix $A(G)$.
:::

For Figure 5.4.1 (a loop at $v_1$, two parallel edges $v_1v_2$, $v_1v_3$, $v_3v_4$):
$$A=\begin{bmatrix}2&2&1&0\\2&0&0&0\\1&0&0&1\\0&0&1&0\end{bmatrix}.$$

Properties: $A$ is **symmetric** ($a_{ij}=a_{ji}$), and with loops counted as 2 each row
adds up to the degree: row 1 gives $2+2+1=5=d(v_1)$. For a simple graph $A$ has zeros
on the diagonal and only 0s and 1s elsewhere; Theorem 5.4.1 then applies unchanged
(think of each edge as two opposite arcs).

::: callout note The slide's definition says "directed"
The slide titled 无向图的邻接矩阵 still writes 有向图 and "edges from $v_i$ to $v_j$";
it means the undirected graph in its picture, with edges counted between $v_i$ and
$v_j$. Many other textbooks count an undirected loop as 1 on the diagonal; follow this
course's convention (2) in exams, and say which you use.
:::

::: example In-class question: the maximum degree
A graph $G$ has adjacency matrix
$$\begin{bmatrix}0&1&1&0&1&1&0\\1&0&1&1&0&1&0\\1&1&0&1&1&0&0\\0&1&1&0&0&0&1\\1&0&1&0&0&0&1\\1&1&0&0&0&0&1\\0&0&0&1&1&1&0\end{bmatrix}.$$
What is its maximum degree $\Delta(G)$? Options: A 4, B 1, C 2, D 3.
== What kind of graph ==
The matrix is symmetric with zeros on the diagonal: an undirected simple graph.
== Degrees are row sums ==
The rows add up to $4,4,4,3,3,3,3$.
== Answer ==
$\Delta(G)=4$: option **A**, as in Rain Classroom. (Check: the degrees total 24, so $G$
has 12 edges.)
:::

## The reachability matrix

Sometimes you don't care how many walks there are, only **whether** you can get there.
That is a 0/1 question.

::: define Reachability matrix | 可达矩阵
Let $D=\langle V,E\rangle$ be a directed graph with $V=\{v_1,\dots,v_n\}$, and let
$$p_{ij}=\begin{cases}1, & v_i \text{ reaches } v_j,\\ 0, & \text{otherwise.}\end{cases}$$
The $n\times n$ matrix $(p_{ij})$ is the {{term reachability matrix | 可达矩阵}} of $D$,
written $P(D)$ or $P$. (Definition 5.4.4 in the textbook.)
:::

Every vertex reaches itself (Lesson 4.5), so the diagonal is all 1s. As a relation,
"reaches" is the reflexive and transitive closure of the arc relation (Lesson 2.5), and
$P$ is its matrix.

How do we compute it? Recall Theorem 5.2.5 (Lesson 4.3): in a graph with $n$ vertices,
if $u\ne v$ and $u$ reaches $v$, then some walk from $u$ to $v$ has length at most
$n-1$. So for $i\ne j$, $v_i$ reaches $v_j$ exactly when some $A^l$ with
$1\le l\le n-1$ has a non-zero $(i,j)$ entry, that is, when the $(i,j)$ entry of
$B_{n-1}$ is not zero.

::: callout key Reachability from B with n − 1
Compute $B_{n-1}=A+A^2+\cdots+A^{n-1}$. Then $p_{ii}=1$ always (whatever $B_{n-1}$
says), and for $i\ne j$, $p_{ij}=1$ if $b_{ij}^{(n-1)}\ne0$ and $p_{ij}=0$ if
$b_{ij}^{(n-1)}=0$.
:::

Since only "zero or not" matters, you may instead use Boolean matrix products (OR of
ANDs), as for the powers of a relation in Lesson 2.3:
$P=I\vee A\vee A^{(2)}\vee\cdots\vee A^{(n-1)}$, where $A^{(k)}$ is the $k$-th Boolean
power of $A$ with every non-zero entry first turned into 1. The numbers stay 0 and 1,
which is easier by hand.

::: example The reachability matrix of Figure 5.4.2
Find $P$ for the digraph of Figure 5.4.2 ($v_1\leftrightarrow v_2$, $v_2\to v_4$, and
two arcs $v_3\to v_4$).
== Adjacency matrix and B with n − 1 = 3 ==
$$A=\begin{bmatrix}0&1&0&0\\1&0&0&1\\0&0&0&2\\0&0&0&0\end{bmatrix},\qquad B_3=A+A^2+A^3=\begin{bmatrix}1&2&0&1\\2&1&0&2\\0&0&0&2\\0&0&0&0\end{bmatrix}.$$
== Read off P ==
Put 1s on the diagonal and a 1 wherever $B_3$ is non-zero off the diagonal:
$$P_1=\begin{bmatrix}1&1&0&1\\1&1&0&1\\0&0&1&1\\0&0&0&1\end{bmatrix}.$$
== Check by eye ==
$v_1$ and $v_2$ reach each other and $v_4$; $v_3$ reaches only $v_4$; $v_4$ reaches
nothing else. Nothing reaches $v_3$, so column 3 is zero except $p_{33}$.
:::

::: example The reachability matrix of Figure 5.4.3
Find $P$ for Figure 5.4.3.
== B with n − 1 = 3 ==
From the powers above,
$$B_3=A+A^2+A^3=\begin{bmatrix}0&2&4&4\\0&0&2&2\\0&0&2&4\\0&0&4&6\end{bmatrix}.$$
== Read off P ==
$$P_2=\begin{bmatrix}1&1&1&1\\0&1&1&1\\0&0&1&1\\0&0&1&1\end{bmatrix}.$$
Note $p_{11}=p_{22}=1$ although $b_{11}^{(3)}=b_{22}^{(3)}=0$: the diagonal of $P$ doesn't
depend on $B_{n-1}$.
:::

::: callout pitfall The diagonal of P is always 1
$b_{ii}^{(n-1)}=0$ only says there is no *closed walk* at $v_i$; $v_i$ still reaches
itself by the walk of length 0. Don't copy zeros from the diagonal of $B_{n-1}$.
:::

**Reading connectivity from $P$** (Lesson 4.5). Let $P^{T}$ be the transpose, so
$(P^{T})_{ij}=1$ when $v_j$ reaches $v_i$:

- $D$ is strongly connected exactly when $P$ is all 1s;
- $D$ is unilaterally connected exactly when $P\vee P^{T}$ is all 1s (every pair
  reachable one way or the other);
- $P\wedge P^{T}$ (entry-wise AND) is the matrix of $\leftrightarrow$: the 1s in row $i$
  mark the strong component of $v_i$.

For Figure 5.4.3, $P_2\wedge P_2^{T}$ gives the strong components $\{v_1\}$, $\{v_2\}$,
$\{v_3,v_4\}$, and $P_2\vee P_2^{T}$ is all 1s, so the digraph is unilaterally but not
strongly connected. For Figure 5.4.2, $p_{13}=p_{31}=0$, so it is not unilaterally
connected; its underlying graph is connected, so it is weakly connected. (These tests
follow from the definitions; the slides don't list them.)

::: cards Graphs as matrices
Incidence matrix $M(G)$ of an undirected graph :: $n\times m$; $m_{ij}$ = how many times $v_i$ is an end of $e_j$ (0, 1, or 2 for a loop).
Undirected incidence matrix: column and row sums :: Every column adds up to 2; row $i$ adds up to $d(v_i)$; all entries add up to $2m$.
Equal columns or a zero row in $M(G)$ :: Equal columns: parallel edges. A zero row: an isolated vertex.
Incidence matrix $M(D)$ of a digraph :: Only without loops; $+1$ where an arc starts, $-1$ where it ends, 0 elsewhere.
Rows of $M(D)$ :: Row $i$ has $d^+(v_i)$ entries $+1$ and $d^-(v_i)$ entries $-1$; each column has one of each.
Adjacency matrix $A$ of a digraph :: $a_{ij}^{(1)}$ = number of arcs from $v_i$ to $v_j$.
Row and column sums of $A$ :: Row sums are out-degrees, column sums in-degrees; the total is $m$.
Theorem 5.4.1 (powers of $A$) :: $a_{ij}^{(l)}$ in $A^l$ counts walks of length $l$ from $v_i$ to $v_j$; the trace counts closed walks.
Corollary 5.4.1, the matrix $B_l$ :: $B_l=A+\cdots+A^l$; its entry sum counts walks of length $\le l$, its trace closed walks of length $\le l$.
Adjacency matrix of an undirected graph :: Symmetric; edges between $v_i$ and $v_j$; this course counts a loop as 2, so row sums are degrees.
Reachability matrix $P$ :: $p_{ij}=1$ iff $v_i$ reaches $v_j$; the diagonal is all 1s.
Computing $P$ from $B_{n-1}$ :: Off the diagonal, $p_{ij}=1$ iff $b_{ij}^{(n-1)}\ne0$ (by Theorem 5.2.5); set every $p_{ii}=1$.
Strongly connected, read from $P$ :: $P$ is all 1s.
:::

::: quiz Check yourself
? In-class question: an undirected graph's adjacency matrix has rows $0110110$, $1011010$, $1101100$, $0110001$, $1010001$, $1100001$, $0001110$. Its maximum degree is:
- [x] 4
- [ ] 1
- [ ] 2
- [ ] 3
> Degrees are row sums: $4,4,4,3,3,3,3$, so $\Delta=4$ (option A, as in Rain Classroom).

? In the five-vertex digraph of slide 12-040, how many walks of length 2 go from $v_3$ to $v_1$?
answer: 2
> Row 3 times column 1: $1\cdot0+0\cdot0+0\cdot1+1\cdot1+1\cdot1=2$; the walks $v_3v_4v_1$ and $v_3v_5v_1$.

? In an undirected graph, what does every column of the incidence matrix add up to?
answer: 2
> Each edge has two ends; a loop has a 2 in one row.

? In the incidence matrix $M(D)$ of a loopless digraph, the entries of row $i$ add up to:
- [ ] $d(v_i)$
- [x] $d^+(v_i)-d^-(v_i)$
- [ ] $d^+(v_i)$
- [ ] 0
> Row $i$ has $d^+(v_i)$ entries $+1$ and $d^-(v_i)$ entries $-1$, which partly cancel. It is the *columns* that add up to 0.

? Two columns of an undirected graph's incidence matrix are equal. What are those two edges called?
text: parallel edges | parallel | multiple edges
> Equal columns mean the same ends with the same incidence numbers: parallel edges (Proposition 5.4.1 ④).

? Figure 5.4.3 ($A$ with rows $0210$, $0010$, $0001$, $0011$): how many walks of length at most 4 does it have?
answer: 7+9+14+23
> The entry sums of $A$, $A^2$, $A^3$, $A^4$ are $7, 9, 14, 23$; by Corollary 5.4.1 the total is 53.

? For the same digraph, how many closed walks of length exactly 4 are there?
answer: 7
> The trace of $A^4$: $0+0+2+5=7$ ($v_3$ has 2, $v_4$ has 5).

? What is the sum of all entries of the adjacency matrix of the complete graph $K_n$?
expression: n*(n-1)
variables: n
> Each of the $n$ rows has $n-1$ ones (every other vertex), so $n(n-1)$, which is twice the $\frac{n(n-1)}2$ edges.

? How many columns does the incidence matrix of $K_n$ have?
expression: n*(n-1)/2
variables: n
> One column per edge, and $K_n$ has $\binom n2=\frac{n(n-1)}2$ edges.

? Figure 5.4.2 has reachability matrix with rows $1101$, $1101$, $0011$, $0001$. Which is the strongest statement that holds?
- [ ] Strongly connected
- [ ] Unilaterally connected
- [x] Weakly connected only
> $p_{13}=p_{31}=0$: neither of $v_1$, $v_3$ reaches the other, so not unilateral. Without arrows $v_1v_2v_4v_3$ joins everything, so it is weakly connected.
:::

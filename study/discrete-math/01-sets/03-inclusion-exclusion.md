---
title: Counting with inclusion–exclusion
zh: 有穷集的计数
summary: The cardinality of a finite set, counting unions of two and three sets, the inclusion–exclusion principle in its two forms, and its classic applications — overlapping classes, multiples, forbidden patterns in permutations and derangements.
source: 1-集合 (§1.4 有穷集的计数), 2026-09-01
---

How many students are in a school if we only know how many take each course and how many
take each pair of courses? How many numbers up to 500 are divisible by 2, 3 or 5? How many
ways can ten letters all go into the wrong envelopes? Questions like these ask for the
size of a **union** of overlapping sets, and adding the sizes overcounts the overlaps.
The **inclusion–exclusion principle** (包含排斥原理, 容斥原理) corrects the overcount
exactly: add the single sets, subtract the pairs, add back the triples, and so on. It is
one of the most used counting tools in the course and a favourite exam question.

## The size of a finite set

To count, we need a name for "the number of elements".

::: define Cardinality | 基数
A set $A$ is **finite** (有限集) if for some natural number $n$ there is a one-to-one
correspondence between $A$ and $\{1, 2, \dots, n\}$ — that is, we can number its elements
$1$ to $n$ without repeats or gaps. Then $n$ is the **cardinality** of $A$, written
$|A|$. The empty set has cardinality $0$: $|\varnothing| = 0$.
:::

For example $|\{a, b, c\}| = 3$, $|\{\varnothing, \{\varnothing\}\}| = 2$, and
$|P(A)| = 2^{|A|}$ (Lesson 1.1). "One-to-one correspondence" is made precise in Lesson
3.2, and Lesson 3.5 extends cardinality to infinite sets (written $\mathrm{card}\,A$
there).

## Two sets

Count the people in two clubs, $A$ and $B$. Adding $|A| + |B|$ counts everyone in both
clubs **twice**, once in each. Subtract them once to fix it:

::: venn The overlap A ∩ B is counted in both |A| and |B|
shade: A ∩ B
:::

::: formula Size of a union of two sets | 两个集合并集的基数
$$|A \cup B| = |A| + |B| - |A \cap B|$$
--
$A, B$ | finite sets
$\lvert A \rvert$ | the number of elements of $A$
$\lvert A \cap B \rvert$ | the elements counted twice, once in each set
:::

When $A$ and $B$ are disjoint, $|A \cap B| = 0$ and the formula is plain addition:
$|A \cup B| = |A| + |B|$.

Counting what is **outside** a set is just as easy. If $E$ is a finite universal set and
$A \subseteq E$, then $A$ and $\sim A$ are disjoint with union $E$, so:

::: formula Size of a complement | 补集的基数
$$|\sim A| = |E| - |A|$$
--
$E$ | the finite universal set
$\sim A$ | the elements of $E$ not in $A$ (Lesson 1.2)
:::

Combining the two: the number of elements in **neither** $A$ nor $B$ is
$|\sim A \cap \sim B| = |\sim(A \cup B)| = |E| - |A| - |B| + |A \cap B|$, by De Morgan's
law. Counting "none of the properties" is often easier this way than directly.

::: example Two languages
Of 50 students, 30 study English, 25 study Japanese and 12 study both. How many study at
least one of them? How many study neither?
== Name the sets ==
$E$: the 50 students; $A$: English, $|A| = 30$; $B$: Japanese, $|B| = 25$;
$|A \cap B| = 12$.
== At least one ==
$|A \cup B| = 30 + 25 - 12 = 43$.
== Neither ==
$|\sim A \cap \sim B| = |E| - |A \cup B| = 50 - 43 = 7$.
:::

## Three sets

With three sets $A$, $B$, $C$, add the three sizes, subtract the three pairwise
overlaps, then **add back** the triple overlap.

::: formula Size of a union of three sets | 三个集合并集的基数
$$\begin{aligned}
|A \cup B \cup C| &= |A| + |B| + |C| \\
&\quad - |A \cap B| - |A \cap C| - |B \cap C| \\
&\quad + |A \cap B \cap C|
\end{aligned}$$
--
$A, B, C$ | finite sets
$\lvert A \cap B \cap C \rvert$ | the elements in all three sets
:::

Why add back? Follow an element $x$ in all three sets. It is counted $3$ times in
$|A| + |B| + |C|$, then subtracted $3$ times (it lies in all three pairwise
intersections): net $0$. The last term counts it once more, so it is counted exactly
once. An element in exactly two sets, say $A$ and $B$, is counted $2 - 1 = 1$ time, and
an element in exactly one set $1$ time. Everyone in the union is counted once.

::: venn The union of three sets, and the part in all three
sets: A B C
shade: A ∪ B ∪ C
shade: A ∩ B ∩ C
:::

::: example Students taking three courses
A school teaches only three courses: mathematics, physics and chemistry. 170 students
take mathematics, 130 physics and 120 chemistry; 45 take both mathematics and physics,
20 mathematics and chemistry, 22 physics and chemistry, and 3 take all three. Everyone
takes at least one course. How many students does the school have?
== Name the sets ==
Let $A$, $B$, $C$ be the students taking mathematics, physics and chemistry:
$|A| = 170$, $|B| = 130$, $|C| = 120$; $|A \cap B| = 45$, $|A \cap C| = 20$,
$|B \cap C| = 22$; $|A \cap B \cap C| = 3$.
== Apply the formula ==
$$|A \cup B \cup C| = (170 + 130 + 120) - (45 + 20 + 22) + 3 = 420 - 87 + 3 = 336.$$
== Answer ==
Since everyone takes at least one course, the school is $A \cup B \cup C$:
**336 students**.
:::

## The inclusion–exclusion principle

The same pattern works for any number of sets: alternately add and subtract the sizes of
the intersections of $1, 2, 3, \dots$ of the sets.

::: theorem The inclusion–exclusion principle | 包含排斥原理
For finite sets $A_1, A_2, \dots, A_n$ (Theorem 1.4.1 in the textbook):
$$\begin{aligned}
|A_1 \cup A_2 \cup \cdots \cup A_n| &= \sum_{i=1}^{n} |A_i| - \sum_{1 \le i < j \le n} |A_i \cap A_j| \\
&\quad + \sum_{1 \le i < j < k \le n} |A_i \cap A_j \cap A_k| - \cdots \\
&\quad + (-1)^{n-1} |A_1 \cap A_2 \cap \cdots \cap A_n|.
\end{aligned}$$

*Why it is right.* Take any element $x$ of the union, and say it lies in exactly $t \ge 1$
of the sets. It is counted $C(t, 1)$ times in the first sum, $C(t, 2)$ times in the
second (once for each pair of its $t$ sets), and so on. In total it is counted
$$C(t,1) - C(t,2) + C(t,3) - \cdots + (-1)^{t-1} C(t,t) = 1 - (1 - 1)^t = 1$$
time, by the binomial theorem. Elements outside the union are counted in no term. So the
right side counts each element of the union exactly once.
:::

The sum $\sum_{1 \le i < j \le n}$ runs over all **pairs** of different indices, each
pair once; the next over all triples; there are $C(n, k)$ terms in the $k$-th sum.

Often we want the elements with **none** of the properties instead. Let $S$ be the
universal set and write $\bar A_i = S - A_i$ for the complement (the slides use the bar
here; it is the same as $\sim A_i$). By De Morgan's law
$\bar A_1 \cap \cdots \cap \bar A_n = \sim(A_1 \cup \cdots \cup A_n)$, so subtract the
union from $|S|$ — every sign flips:

::: formula Inclusion–exclusion, union form | 包含排斥原理（并集形式）
$$\begin{aligned}
|A_1 \cup \cdots \cup A_n| &= \sum_{i} |A_i| - \sum_{i<j} |A_i \cap A_j| \\
&\quad + \sum_{i<j<k} |A_i \cap A_j \cap A_k| - \cdots + (-1)^{n-1} |A_1 \cap \cdots \cap A_n|
\end{aligned}$$
--
$A_1, \dots, A_n$ | finite sets (often: the elements with property 1, …, property n)
$\sum_{i<j}$ | a sum over all $C(n,2)$ pairs of different indices; likewise triples
$(-1)^{n-1}$ | the sign of the last term: $+$ when $n$ is odd, $-$ when even
:::

::: formula Inclusion–exclusion, complement form | 包含排斥原理（补集形式）
$$\begin{aligned}
|\bar A_1 \cap \cdots \cap \bar A_n| &= |S| - \sum_{i} |A_i| + \sum_{i<j} |A_i \cap A_j| \\
&\quad - \sum_{i<j<k} |A_i \cap A_j \cap A_k| + \cdots + (-1)^{n} |A_1 \cap \cdots \cap A_n|
\end{aligned}$$
--
$S$ | the finite universal set
$\bar A_i$ | the complement $S - A_i$: the elements without property $i$
$\lvert \bar A_1 \cap \cdots \cap \bar A_n \rvert$ | the number of elements with none of the properties
:::

::: callout key How to use it
1. Choose the universe $S$ and the "bad" properties; let $A_i$ be the elements with
   property $i$.
2. Work out $|S|$ and the size of every intersection — usually they depend only on how
   many sets are intersected.
3. Use the union form for "at least one property", the complement form for "none".
:::

::: callout pitfall Watch the signs and the last term
The signs alternate starting with $+$ for single sets. The last term of the union form
has sign $(-1)^{n-1}$; of the complement form $(-1)^n$. A common slip is to stop after
the pairs: with three or more sets, the triple intersection must be added back.
:::

## Application: multiples

::: example Numbers divisible by 2, 3 or 5
Let $N = \{1, 2, \dots, 500\}$. How many numbers in $N$ are divisible by at least one of
2, 3 and 5?
== Counting multiples ==
The multiples of $k$ in $N$ are $k, 2k, 3k, \dots$, and there are
$\lfloor 500/k \rfloor$ of them ($\lfloor x \rfloor$ rounds down to a whole number). A
number is divisible by both $a$ and $b$ exactly when it is divisible by their least common
multiple $m$; so there are $\lfloor 500/m \rfloor$ such numbers. For 2, 3, 5 (which share
no factors) the least common multiple is the product.
== The sets ==
Let $A_1$, $A_2$, $A_3$ be the multiples of 2, 3, 5 in $N$:
$|A_1| = \lfloor 500/2 \rfloor = 250$, $|A_2| = \lfloor 500/3 \rfloor = 166$,
$|A_3| = \lfloor 500/5 \rfloor = 100$.
== Pairs and the triple ==
$|A_1 \cap A_2| = \lfloor 500/6 \rfloor = 83$, $|A_1 \cap A_3| = \lfloor 500/10 \rfloor = 50$,
$|A_2 \cap A_3| = \lfloor 500/15 \rfloor = 33$;
$|A_1 \cap A_2 \cap A_3| = \lfloor 500/30 \rfloor = 16$.
== Inclusion–exclusion ==
$$\begin{aligned}
|A_1 \cup A_2 \cup A_3| &= 250 + 166 + 100 - 83 - 50 - 33 + 16 \\
&= 516 - 166 + 16 = 366.
\end{aligned}$$
== The complement ==
So $500 - 366 = 134$ numbers in $N$ are divisible by none of 2, 3, 5.
:::

::: callout pitfall Use the least common multiple
"Divisible by 4 and by 6" means divisible by $\mathrm{lcm}(4, 6) = 12$, not by
$4 \times 6 = 24$ (12 itself is divisible by both). The product works only when the
numbers have no common factor.
:::

## Application: forbidden patterns

::: example Permutations without "ace" and "df"
How many arrangements of the six letters $a, b, c, d, e, f$ contain neither the block
"ace" nor the block "df" (as consecutive letters, in that order)?
== The universe and the bad sets ==
$S$: all arrangements, $|S| = 6! = 720$. $A_1$: arrangements containing "ace";
$A_2$: those containing "df". We want $|\bar A_1 \cap \bar A_2|$.
== Glue each block into one letter ==
In $A_1$, treat "ace" as a single symbol: we arrange 4 symbols ("ace", $b$, $d$, $f$),
so $|A_1| = 4! = 24$. In $A_2$, "df" is one symbol among 5: $|A_2| = 5! = 120$. In
$A_1 \cap A_2$ both are glued (the blocks share no letter): 3 symbols ("ace", "df",
$b$), so $|A_1 \cap A_2| = 3! = 6$.
== Complement form ==
$$|\bar A_1 \cap \bar A_2| = 6! - (5! + 4!) + 3! = 720 - 144 + 6 = 582.$$
:::

::: callout tip The gluing trick
"These letters next to each other in this order" is counted by treating the block as one
letter. If two blocks shared a letter (say "ab" and "bc"), both could only appear
together as "abc", so glue that instead.
:::

## Application: derangements

The slides end with a famous problem. Someone writes ten letters and addresses ten
envelopes, then puts the letters into the envelopes at random. In how many ways can
**every** letter end up in the wrong envelope?

The same question with hats: $n$ people check their hats at a party, the attendant loses
the tickets and hands the hats back at random. In how many of the $n!$ ways does nobody
get their own hat?

::: define Derangement | 错位排列
An arrangement of $1, 2, \dots, n$ in which no number is in its own position (no $i$ in
place $i$). The number of derangements of $n$ objects is written $D_n$.
:::

For $n = 3$ the arrangements of $1, 2, 3$ with no fixed point are $2\,3\,1$ and
$3\,1\,2$, so $D_3 = 2$. Listing gets hopeless quickly; inclusion–exclusion gives a
formula.

::: example Ten letters, all in the wrong envelopes
Count the ways to put ten letters into ten envelopes so that every letter is in a wrong
envelope.
== The universe ==
$S$: all ways of putting the letters in, $|S| = 10!$.
== The bad sets ==
Let $A_i$ be the ways in which letter $i$ is in its own envelope (perhaps others too),
$i = 1, \dots, 10$. We want $|\bar A_1 \cap \cdots \cap \bar A_{10}|$.
== Intersections ==
If letter $i$ is fixed in place, the other 9 go anywhere: $|A_i| = 9!$, and there are
$C(10, 1)$ such sets. If letters $i$ and $j$ are fixed: $|A_i \cap A_j| = 8!$, with
$C(10, 2)$ pairs. In general $k$ fixed letters leave $(10 - k)!$ ways, and there are
$C(10, k)$ choices of the $k$ letters; all ten fixed: $1$ way.
== Complement form ==
$$\begin{aligned}
|\bar A_1 \cap \cdots \cap \bar A_{10}| &= 10! - C(10,1)\,9! + C(10,2)\,8! - C(10,3)\,7! \\
&\quad + \cdots + C(10,10) \cdot 1 = 1\,334\,961.
\end{aligned}$$
The slide stops before evaluating the sum; it equals $D_{10} = 1\,334\,961$, out of
$10! = 3\,628\,800$ arrangements.
:::

The same argument for $n$ objects gives a neat formula.

::: theorem Number of derangements | 错位排列数
$$D_n = n!\left[1 - \frac{1}{1!} + \frac{1}{2!} - \frac{1}{3!} + \cdots + (-1)^n \frac{1}{n!}\right].$$

*Proof.* Let $S$ be the set of arrangements of $1, 2, \dots, n$, let $P_i$ be the
property "$i$ is in position $i$", and let $A_i$ be the arrangements with property $P_i$.
$D_n$ counts the arrangements with none of the properties. Fixing $k$ given numbers
leaves $(n - k)!$ arrangements of the rest:
$$|S| = n!,\quad |A_i| = (n-1)!,\quad |A_i \cap A_j| = (n-2)!,\quad \dots,\quad |A_1 \cap \cdots \cap A_n| = 0! = 1.$$
The $k$-th sum has $C(n, k)$ equal terms, so by the complement form
$$\begin{aligned}
D_n &= n! - C(n,1)(n-1)! + C(n,2)(n-2)! - \cdots + (-1)^n C(n,n)\,0! \\
&= \sum_{k=0}^{n} (-1)^k \frac{n!}{k!\,(n-k)!}(n-k)! = n! \sum_{k=0}^{n} \frac{(-1)^k}{k!}.
\end{aligned}$$
:::

::: formula Derangements | 错位排列数
$$D_n = n! \sum_{k=0}^{n} \frac{(-1)^k}{k!} = n!\left[1 - \frac{1}{1!} + \frac{1}{2!} - \cdots + (-1)^n \frac{1}{n!}\right]$$
--
$n$ | the number of objects (letters, hats)
$D_n$ | the arrangements with no object in its own place
:::

The first values:

| Objects $n$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Derangements $D_n$ | 0 | 1 | 2 | 9 | 44 | 265 | 1854 |

The bracket is the start of the series $e^{-1} = \sum_k (-1)^k / k!$, so
$D_n / n! \to 1/e \approx 0.368$: whatever the number of letters, the chance that every
one goes astray is about 37%. In fact $D_n$ is the whole number nearest to $n!/e$. The
bars below are $D_n/n!$; the line is $1/e$.

::: plot The share of arrangements that are derangements, D(n)/n!
x: 1 .. 10
xlabel: n
bars r(n) = floor(n!/e + 0.5) / n!
f(n) = 1/e
:::

::: callout exam What exams ask
A word problem with two or three overlapping sets (find the total, or "none of them"),
counting multiples up to $N$, permutations avoiding blocks, and derangements ("how many
ways can 5 letters all be wrong?" — $D_5 = 44$). Always name the sets first, write
every intersection size, then use the formula with the right signs.
:::

## Summary

::: callout summary Counting finite sets
- $|A \cup B| = |A| + |B| - |A \cap B|$; $|\sim A| = |E| - |A|$.
- Three sets: add singles, subtract pairs, add the triple.
- Inclusion–exclusion: alternate signs over intersections of $1, 2, \dots, n$ sets;
  the complement form counts the elements with none of the properties.
- Multiples of $k$ up to $N$: $\lfloor N/k \rfloor$; of $a$ and $b$: use
  $\mathrm{lcm}(a,b)$.
- Derangements: $D_n = n! \sum_{k=0}^n (-1)^k/k!$, about $n!/e$.
:::

::: cards Inclusion–exclusion
Cardinality $|A|$ (基数) :: The number of elements of a finite set; $|\varnothing| = 0$.
Size of a union of two sets :: $|A \cup B| = |A| + |B| - |A \cap B|$.
Size of a complement :: $|\sim A| = |E| - |A|$.
Size of a union of three sets :: $|A|+|B|+|C| - |A\cap B| - |A\cap C| - |B\cap C| + |A\cap B\cap C|$.
Inclusion–exclusion principle, idea :: Alternately add and subtract the sizes of intersections of 1, 2, 3, … of the sets (Theorem 1.4.1).
Inclusion–exclusion, complement form :: $|\bar A_1 \cap \cdots \cap \bar A_n| = |S| - \sum|A_i| + \sum|A_i\cap A_j| - \cdots + (-1)^n|A_1\cap\cdots\cap A_n|$.
Why each element is counted once :: An element in $t$ of the sets is counted $C(t,1) - C(t,2) + \cdots = 1 - (1-1)^t = 1$ time.
Multiples of k in {1, …, N} :: $\lfloor N/k \rfloor$; multiples of both $a$ and $b$: $\lfloor N/\mathrm{lcm}(a,b) \rfloor$.
Derangement (错位排列) :: An arrangement of $1, \dots, n$ with no $i$ in position $i$.
Derangement formula $D_n$ :: $n!\left[1 - \frac1{1!} + \frac1{2!} - \cdots + (-1)^n\frac1{n!}\right]$, the nearest whole number to $n!/e$.
Derangement numbers to remember :: $D_1 = 0$, $D_2 = 1$, $D_3 = 2$, $D_4 = 9$, $D_5 = 44$.
Counting arrangements that contain a block :: Glue the block into one symbol: "ace" among 6 letters gives $4!$ arrangements.
:::

::: quiz Check yourself
? A school teaches only mathematics, physics and chemistry: 170, 130 and 120 students; 45 take maths and physics, 20 maths and chemistry, 22 physics and chemistry, 3 all three; everyone takes at least one. How many students are there?
answer: (170+130+120) - (45+20+22) + 3
> $|A\cup B\cup C| = 420 - 87 + 3 = 336$.

? How many numbers in $\{1, 2, \dots, 500\}$ are divisible by at least one of 2, 3, 5?
answer: 250 + 166 + 100 - 83 - 50 - 33 + 16
> $|A_1|, |A_2|, |A_3| = 250, 166, 100$; pairs $\lfloor 500/6\rfloor = 83$, $\lfloor 500/10\rfloor = 50$, $\lfloor 500/15\rfloor = 33$; triple $\lfloor 500/30\rfloor = 16$. Total $516 - 166 + 16 = 366$.

? How many arrangements of $a, b, c, d, e, f$ contain neither "ace" nor "df"?
answer: 6! - (5! + 4!) + 3!
> $|S| = 720$; with "ace" glued $4! = 24$; with "df" glued $5! = 120$; both $3! = 6$. So $720 - 144 + 6 = 582$.

? How many numbers in $\{1, 2, \dots, 100\}$ are divisible by 2 or 3?
answer: 50 + 33 - 16
> $\lfloor 100/2\rfloor = 50$, $\lfloor 100/3\rfloor = 33$, both (multiples of 6) $\lfloor 100/6\rfloor = 16$: $50 + 33 - 16 = 67$.

? In how many ways can 5 letters all go into the wrong envelopes?
answer: 5! - comb(5,1)*4! + comb(5,2)*3! - comb(5,3)*2! + comb(5,4)*1! - 1
> $D_5 = 120 - 120 + 60 - 20 + 5 - 1 = 44$, or $5!\,(1 - 1 + \frac12 - \frac16 + \frac1{24} - \frac1{120}) = 44$.

? In how many ways can 10 letters all go into the wrong envelopes?
answer: 1334961
> $D_{10} = 10! - C(10,1)\,9! + C(10,2)\,8! - \cdots + C(10,10) = 1\,334\,961$ (the nearest whole number to $10!/e$).

? Of 40 people, 25 drink tea, 18 drink coffee and 9 drink both. How many drink neither?
answer: 40 - (25 + 18 - 9)
> $|A \cup B| = 25 + 18 - 9 = 34$, so $40 - 34 = 6$ drink neither.

? For four sets, what is the sign of the term $|A_1 \cap A_2 \cap A_3 \cap A_4|$ in the union form?
- [ ] $+$
- [x] $-$
> The sign is $(-1)^{n-1} = (-1)^3 = -1$: singles $+$, pairs $-$, triples $+$, the quadruple $-$.

? How many numbers in $\{1, \dots, 1000\}$ are divisible by none of 2, 3, 5?
answer: 1000 - (500 + 333 + 200 - 166 - 100 - 66 + 33)
> Union: $500 + 333 + 200 - 166 - 100 - 66 + 33 = 734$, so $1000 - 734 = 266$ are divisible by none.

? For $n$ letters, how many terms of the form $C(n,k)\,(n-k)!$ does the complement-form sum for $D_n$ have, counting $|S| = n!$ as the term $k = 0$?
expression: n + 1
variables: n
> $k$ runs from $0$ (no letter fixed: $|S|$) to $n$ (all fixed), so there are $n + 1$ terms.
:::

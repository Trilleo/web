---
title: Growth of functions
zh: 算法的时间复杂性
summary: Measuring an algorithm's running time by counting basic operations, comparing growth with O, Ω and Θ, the common orders of growth, worst, average and best cases, and working out the complexity of loops.
source: 3-1函数 (§3.1, slides 45–55), 2026-09-17
---

Functions are not only objects to study: they are also the tool computer scientists use
to say how fast an algorithm is. The running time of a program depends on the size of
its input, so it is a function of that size, $f(n)$. Exact formulas such as
$2n^3 + 3n^2 + 2n + 1$ are messy and depend on details nobody cares about, so we compare
functions by how fast they **grow** when $n$ gets large. This lesson defines the three
notations for that, $O$, $\Omega$ and $\Theta$, lists the growth rates you meet in
practice, and works out the {{term time complexity | 时间复杂性}} of a few typical loops.
Data structures and algorithms courses take all of this for granted.

## Counting basic operations

How do you measure an algorithm's speed? Timing it with a stopwatch depends on the
computer, the language and the compiler. Instead we count steps.

::: define Time complexity | 时间复杂性
The **time complexity** of an algorithm is the number of times its basic operations are
executed, as a function $f(n)$ of the size $n$ of the problem (问题的规模). It is used as
the algorithm's measure of time (算法的时间度量).
:::

A "basic operation" is a step that takes a fixed amount of time whatever $n$ is: an
assignment, a comparison, an addition, one test of a loop condition.

::: example Multiplying two n × n matrices
The size of the problem is the order $n$ of the matrices. Count how often each line of
this program runs.

```c
void MATRIXMLT(int A[][n], int B[][n], int C[][n])
{ int i, j, k;
  for (i = 0; i < n; i++)              /* (1) */
    for (j = 0; j < n; j++)            /* (2) */
    { C[i][j] = 0;                     /* (3) */
      for (k = 0; k < n; k++)          /* (4) */
        C[i][j] += A[i][k] * B[k][j];  /* (5) */
    }
}
```

== Line (1) ==
The test `i < n` runs $n + 1$ times: $n$ times true, once false to leave the loop.

== Line (2) ==
For each of the $n$ values of `i`, the test `j < n` runs $n + 1$ times: $n(n+1)$.

== Line (3) ==
Once per pair $(i, j)$: $n^2$.

== Line (4) ==
For each of the $n^2$ pairs, the test `k < n` runs $n + 1$ times: $n^2(n+1)$.

== Line (5) ==
Once per triple $(i, j, k)$: $n^3$.

== Total ==
$$\begin{aligned}
f(n) &= (n+1) + n(n+1) + n^2 + n^2(n+1) + n^3 \\
&= 2n^3 + 3n^2 + 2n + 1.
\end{aligned}$$
:::

A formula like this is already complicated for a three-line program, and the exact
coefficients depend on what we decided to count. What matters is how it behaves when $n$
is large. Then the $2n^3$ term swamps the rest: at $n = 1000$, $f(n)$ is only $0.15\%$
more than $2n^3$. And the constant $2$ only says "twice as slow"; doubling $n$ multiplies
the time by about $8$ whatever the constant. So we say "the algorithm takes time of order
$n^3$". The three notations below make "of order" precise. They are called
{{term asymptotic notation | 渐近时间复杂度表示法}}: they describe behaviour as $n \to \infty$.

## Big O: an upper bound

$f(n) = O(g(n))$ says: from some point on, $f$ is at most a constant times $g$. Constants
and small values of $n$ are ignored.

::: define Big O notation | O表示法
Let $f(n)$ and $g(n)$ be functions defined on the positive integers. If there are
positive constants $c$ and $n_0$ such that
$$0 \le f(n) \le c\,g(n) \quad\text{for all } n \ge n_0,$$
then $f(n) = O(g(n))$. $g$ is an **asymptotic upper bound** (渐近上界) for $f$.
:::

::: example Matrix multiplication is O(n³)
Show $f(n) = 2n^3 + 3n^2 + 2n + 1 = O(n^3)$.

== Bound each term by n³ ==
For $n \ge 1$: $n^2 \le n^3$, $n \le n^3$ and $1 \le n^3$. So
$$f(n) \le 2n^3 + 3n^3 + 2n^3 + n^3 = 8n^3.$$

== Constants ==
$c = 8$, $n_0 = 1$ work, and $f(n) \ge 0$. So $f(n) = O(n^3)$.
:::

The same argument shows that **any polynomial of degree $k$ is $O(n^k)$**: add up the
absolute values of the coefficients to get $c$.

::: callout note "Tight" on the slide
The slide calls $O$ the 渐近紧密上限 ("asymptotically tight upper bound"). The definition
only asks for *an* upper bound, which need not be tight: $2n^3 + 3n^2 + 2n + 1 = O(n^4)$ is
also true, just less informative. The tight statement is $\Theta$, below. In practice
people state the smallest $O$ they can prove.
:::

::: callout pitfall The "=" in O only goes one way
$f(n) = O(g(n))$ means "$f$ belongs to the class of functions bounded by a multiple of
$g$". It is not an equation: $n = O(n^2)$ is true, but "$O(n^2) = n$" is meaningless,
and $n = O(n^2)$ together with $n^2 = O(n^2)$ does not make $n = n^2$.
:::

To show $f(n) \ne O(g(n))$, show no constant works. For example $n^2 \ne O(n)$: if
$n^2 \le cn$ for all $n \ge n_0$, then $n \le c$ for all large $n$, which is false.

## Big Omega: a lower bound

::: define Big Omega notation | Ω表示法
Let $f(n)$ and $g(n)$ be functions defined on the positive integers. If there are
positive constants $c$ and $n_0$ such that
$$0 \le c\,g(n) \le f(n) \quad\text{for all } n \ge n_0,$$
then $f(n) = \Omega(g(n))$. $g$ is an **asymptotic lower bound** (渐近下界) for $f$.
:::

For the matrix program: all terms are positive, so $f(n) \ge 2n^3$ for $n \ge 1$. With
$c = 2$, $n_0 = 1$: $f(n) = \Omega(n^3)$. The algorithm needs **at least** about $n^3$
steps, not just at most.

## Big Theta: the exact order

::: define Big Theta notation | Θ表示法
Let $f(n)$ and $g(n)$ be functions defined on the positive integers. If there are
positive constants $c$, $d$ and $n_0$ such that
$$c\,g(n) \le f(n) \le d\,g(n) \quad\text{for all } n \ge n_0,$$
then $f(n) = \Theta(g(n))$: $f$ and $g$ grow at the same rate, and $g$ is an
**asymptotically tight bound** (渐近紧密限度) for $f$.
:::

So $f(n) = \Theta(g(n))$ exactly when $f(n) = O(g(n))$ and $f(n) = \Omega(g(n))$. For the
matrix program, $2n^3 \le f(n) \le 8n^3$ for all $n \ge 1$, so $f(n) = \Theta(n^3)$.

::: plot f(n) = 2n³ + 3n² + 2n + 1 squeezed between 2n³ and 8n³
x: 1 .. 5
xlabel: n
f(x) = 2x^3 + 3x^2 + 2x + 1
c(x) = 2x^3
d(x) = 8x^3
:::

::: callout note Notation on the slide
The slide writes the Θ definition with three function names, "$T(n)$", "$f(n)$" and
"$g(n)$", mixed up ("$c \times g(n) \le f(n) \le d \times g(n)$ … then
$T(n) = \theta(f(n))$"). The intended statement is the one above: if
$c\,g(n) \le f(n) \le d\,g(n)$ for $n \ge n_0$ then $f(n) = \Theta(g(n))$. The slides write
a small $\theta$; most books use the capital $\Theta$.
:::

::: callout key Three bounds in one picture
$O$: eventually **below** a multiple of $g$ (at most). $\Omega$: eventually **above** a
multiple of $g$ (at least). $\Theta$: **between** two multiples (exactly that order). For
a polynomial, all three are given by its leading power: $\Theta(n^k)$.
:::

## Common orders of growth

Most algorithms you will meet fall into a short list of growth rates, from slowest to
fastest growing:

| Name | Notation | Typical example |
| --- | --- | --- |
| Constant (常数阶) | $O(1)$ | Reading one array element |
| Logarithmic (对数阶) | $O(\log_2 n)$ | Binary search; a loop that multiplies `i` by 3 |
| Linear (线性阶) | $O(n)$ | Sequential search |
| Linearithmic (线性对数阶) | $O(n\log_2 n)$ | Merge sort |
| Quadratic (平方阶) | $O(n^2)$ | Two nested loops over the input |
| Cubic (立方阶) | $O(n^3)$ | The matrix product above |
| Polynomial, degree $k$ (K次方阶) | $O(n^k)$ | $k$ nested loops |
| Exponential (指数阶) | $O(2^n)$ | Trying every subset of $n$ items |

$$O(1) < O(\log_2 n) < O(n) < O(n\log_2 n) < O(n^2) < O(n^3) < \cdots < O(n^k) < O(2^n)$$

Beyond the exponential, the slides also order $O(2^n) < O(n!) < O(n^n)$: going from $n$ to
$n + 1$ multiplies $2^n$ by $2$, $n!$ by $n + 1$, and $n^n$ by even more. Here "$<$" means
"grows strictly slower": each function is $O$ of the next but not the other way round.

::: plot How n, n log₂ n, n² and 2ⁿ pull apart
x: 1 .. 10
y: 0 .. 120
xlabel: n
a(x) = x
b(x) = x log2(x)
c(x) = x^2
d(x) = 2^x
:::

At $n = 10$ these are $10$, about $33$, $100$ and $1024$; at $n = 100$, $100$, about
$664$, $10\,000$ and about $1.3 \times 10^{30}$. That last number is why exponential
algorithms are only usable for very small inputs, while any polynomial is called
"efficient" by comparison.

::: callout tip The base of the logarithm doesn't matter
$\log_3 n = \dfrac{\log_2 n}{\log_2 3}$, a constant multiple of $\log_2 n$. Constants
disappear inside $O$, so $O(\log_3 n) = O(\log_2 n) = O(\log n)$.
:::

## Worst, average and best case

For many algorithms the number of steps depends not only on the size $n$ but on the
input itself. Searching a phone book of $n$ entries from the top for a name takes 1
comparison if the name is first and $n$ if it's last.

::: define Worst-case and average time complexity | 最坏与平均时间复杂度
The **worst-case time complexity** $W(n)$ is the largest number of basic operations over
all inputs of size $n$; the **average time complexity** $A(n)$ is the average over all
inputs of size $n$ (each weighted by how likely it is); the **best-case time
complexity** is the smallest.
:::

::: example Sequential search in a phone book
A list of $n$ entries (序号, 姓名, 电话号码: 张一, 李一, 张三, …, 王五) is searched from the
top, one comparison per entry.

== Best case ==
The name is the first entry: 1 comparison, $O(1)$.

== Successful search, average ==
If the name is equally likely to be any of the $n$ entries, finding entry $i$ takes $i$
comparisons, so on average
$$\frac{1 + 2 + \cdots + n}{n} = \frac{n+1}{2} \text{ comparisons: } O(n).$$

== Unsuccessful search ==
Every one of the $n$ entries is compared: $n$ comparisons, $O(n)$. This is also the
worst case, $W(n) = n$.
:::

Usually the worst case is quoted: it is a guarantee for every input, and often (as here)
the average has the same order anyway.

## Working out the complexity of loops

The recipe: find the statement that runs most often, count how many times it runs as a
function of $n$, and keep the order. Counting usually comes down to a sum, very often the
one below.

::: formula Sum of the first m whole numbers | 等差数列求和
$$1 + 2 + \cdots + m = \frac{m(m+1)}{2}$$
--
m | the number of terms |
:::

::: example A loop with a growing step
What is the time complexity of this program fragment?

```c
i = s = 0;
while (s < n)
{ i++;
  s += i;
}
```

== What s holds ==
After the loop body has run $m$ times, $i = m$ and $s = 1 + 2 + \cdots + m = \frac{m(m+1)}{2}$.

== When it stops ==
The loop stops as soon as $s \ge n$, i.e. at the first $m$ with
$\frac{m(m+1)}{2} \ge n$. Roughly $m(m+1)/2 = n$, so
$$m = \frac{-1 \pm \sqrt{1 + 8n}}{2},$$
and only the $+$ root is positive: $m \approx \sqrt{2n}$.

== Answer ==
$O(\sqrt n)$. (For $n = 1\,000\,000$ the loop runs $1414$ times.)
:::

::: example A triangular double loop
What is the time complexity of this fragment?

```c
s = 0;
for (i = 0; i < n; i++)
  for (j = i; j < n; j++)
    s += b[i][j];
```

== Count the inner statement ==
For $i = 0$ the inner loop runs $n$ times, for $i = 1$ it runs $n - 1$ times, …, for
$i = n - 1$ once:
$$n + (n-1) + \cdots + 1 = \frac{n(n+1)}{2}.$$

== Answer ==
$\frac{n(n+1)}{2} = \frac12 n^2 + \frac12 n$, so $O(n^2)$. Only adding the upper triangle
of the matrix halves the work, but it doesn't change the order.
:::

::: example A loop that multiplies
What is the time complexity of this fragment?

```c
i = 1;
while (i <= n)
  i = i * 3;
```

== The values of i ==
$i$ takes the values $1, 3, 9, \ldots, 3^m$: after $m$ passes $i = 3^m$.

== When it stops ==
The loop stops once $3^m > n$, so roughly $3^m = n$ and $m = \log_3 n$ (exactly
$\lfloor\log_3 n\rfloor + 1$ passes).

== Answer ==
$O(\log_3 n)$, which is the same as $O(\log n)$: a loop whose counter is multiplied (or
divided) by a constant each time is logarithmic.
:::

::: callout pitfall Two nested loops are not always n²
Look at what the loop variables do, not at how many loops there are. A `while` whose
variable doubles is logarithmic; a loop whose bound shrinks with the outer variable still
gives $\frac{n(n+1)}2$; a loop that stops at a fixed number (`k < 10`) is constant.
:::

::: callout exam What exams ask
Give the time complexity of a short program fragment (loops like the three above);
decide or prove $f(n) = O(g(n))$ by finding $c$ and $n_0$; order a list of functions by
growth rate.
:::

::: cards Growth of functions
Time complexity (时间复杂性) :: The number of times an algorithm's basic operations run, as a function of the problem size $n$.
Basic operation count of the $n \times n$ matrix product :: $2n^3 + 3n^2 + 2n + 1$, which is $\Theta(n^3)$.
Big O, $f(n) = O(g(n))$ :: There are $c, n_0 > 0$ with $0 \le f(n) \le c\,g(n)$ for all $n \ge n_0$: an upper bound.
Big Omega, $f(n) = \Omega(g(n))$ :: There are $c, n_0 > 0$ with $0 \le c\,g(n) \le f(n)$ for all $n \ge n_0$: a lower bound.
Big Theta, $f(n) = \Theta(g(n))$ :: There are $c, d, n_0 > 0$ with $c\,g(n) \le f(n) \le d\,g(n)$ for all $n \ge n_0$: both, the exact order.
Order of a polynomial of degree $k$ :: $\Theta(n^k)$: keep the leading power, drop its coefficient.
Common orders, slowest growing first :: $1 < \log n < n < n\log n < n^2 < n^3 < n^k < 2^n < n! < n^n$.
Base of the logarithm inside $O$ :: Irrelevant: $\log_3 n = \log_2 n / \log_2 3$ differs by a constant factor.
Worst-case and average complexity, $W(n)$ and $A(n)$ :: The most operations over all inputs of size $n$, and the average over them.
Sequential search of $n$ entries :: Successful: $(n+1)/2$ comparisons on average; unsuccessful: $n$. Both $O(n)$.
Loop whose counter is multiplied by 3 :: About $\log_3 n$ passes: $O(\log n)$.
Loop adding $1, 2, 3, \ldots$ to $s$ until $s \ge n$ :: About $\sqrt{2n}$ passes: $O(\sqrt n)$.
:::

::: quiz Check yourself
? How many times does the statement `s += b[i][j]` run in `for (i = 0; i < n; i++) for (j = i; j < n; j++) s += b[i][j];`? (an expression in $n$)
expression: n(n+1)/2
variables: n
> For $i = 0, 1, \ldots, n-1$ the inner loop runs $n, n-1, \ldots, 1$ times: $\frac{n(n+1)}2$, so $O(n^2)$.

? The time complexity of `i = s = 0; while (s < n) { i++; s += i; }` is:
- [ ] $O(\log n)$
- [x] $O(\sqrt n)$
- [ ] $O(n)$
- [ ] $O(n^2)$
> After $m$ passes $s = \frac{m(m+1)}2$; the loop ends when that reaches $n$, so $m \approx \sqrt{2n}$.

? The time complexity of `i = 1; while (i <= n) i = i * 3;` is:
- [x] $O(\log n)$
- [ ] $O(\sqrt n)$
- [ ] $O(n)$
- [ ] $O(n/3)$
> $i = 3^m$ after $m$ passes, and the loop stops once $3^m > n$: about $\log_3 n$ passes, and $O(\log_3 n) = O(\log n)$.

? The matrix product does $f(n) = 2n^3 + 3n^2 + 2n + 1$ basic operations. Which statements are true? (tick all)
- [x] $f(n) = O(n^3)$
- [x] $f(n) = O(n^4)$
- [x] $f(n) = \Omega(n^3)$
- [x] $f(n) = \Theta(n^3)$
- [ ] $f(n) = O(n^2)$
> $2n^3 \le f(n) \le 8n^3$ for $n \ge 1$ gives $O$, $\Omega$ and $\Theta$ of $n^3$; $O(n^4)$ is a true but loose upper bound. $f(n) \le c\,n^2$ would need $2n \le c$ for all large $n$, which fails.

? Using $f(n) \le c\,n^3$ for $n \ge 1$ with every term bounded by $n^3$, what is the smallest constant $c$ this argument gives?
answer: 2+3+2+1
> $2n^3 + 3n^2 + 2n + 1 \le (2 + 3 + 2 + 1)n^3 = 8n^3$ when $n \ge 1$. (Smaller $c$ work for larger $n_0$, but the definition only needs some $c$.)

? Which of these functions are $\Theta(n^2)$? (tick all)
- [x] $\frac{n(n+1)}2$
- [x] $100n^2 + 10^6 n$
- [ ] $n\log_2 n$
- [ ] $2^n$
> The first two are degree-2 polynomials. $n\log_2 n$ grows more slowly than $n^2$ (it is $O(n^2)$ but not $\Omega(n^2)$), and $2^n$ grows faster.

? Which grows fastest?
- [ ] $2^n$
- [ ] $n^{10}$
- [x] $n!$
- [ ] $n^2\log n$
> $O(n^k) < O(2^n) < O(n!) < O(n^n)$: every polynomial is eventually beaten by $2^n$, and $n!$ beats $2^n$ because each step multiplies it by $n+1$ instead of $2$.

? Sequential search of $n$ equally likely entries: how many comparisons does a successful search make on average? (an expression in $n$)
expression: (n+1)/2
variables: n
> $(1 + 2 + \cdots + n)/n = \frac{n(n+1)}{2n} = \frac{n+1}2$, which is $O(n)$.

? Is $n^2 = O(n)$?
- [ ] Yes, with $c = n$
- [x] No
> $c$ must be a constant. $n^2 \le cn$ for all $n \ge n_0$ would mean $n \le c$ for all large $n$, which is false.
:::

---
title: Designing synchronous circuits
zh: 同步时序逻辑电路的设计
summary: The six steps of designing a synchronous sequential circuit (state diagram, reduction, assignment, equations, self-start check, circuit), worked on a modulo-5 counter with D flip-flops, with both ways of making a non-self-starting design self-start.
source: 第7章 时序逻辑电路 7.5 (teacher's slides 40–50)
---

Analysis goes from a circuit to its behaviour; design goes the other way: from "I want a
counter that steps through these states" to flip-flops and gates. It uses everything from
the earlier lessons in reverse: the state table, Karnaugh maps from the logic-algebra unit,
the characteristic equations from the flip-flops unit, and the self-start check. The
teacher's exam scope covers analysis and counter chips but **not** this design method, so
this lesson is shorter; read it to understand why counters look the way they do.

## The six steps

::: law Designing a synchronous sequential circuit | 同步时序电路的设计步骤
1. From the requirement, draw the **original state diagram**: decide the inputs, the
   outputs and how many states are needed.
2. **Reduce** the states (状态化简): merge states that behave identically, to get the
   simplest diagram.
3. **Assign** a binary code to each state (状态分配), choosing the number of flip-flops $n$
   from $2^{n-1} < M \le 2^n$.
4. Choose the flip-flop type and find the clock, state, drive and output equations.
5. **Check self-start**; if the circuit can't self-start, change the design until it can.
6. Draw the circuit.
:::

::: define State reduction | 状态化简
Merging equivalent states (same outputs, same next states for every input) so the circuit
needs as few states, and so as few flip-flops, as possible.
:::

::: define State assignment | 状态分配
Giving each state of the diagram its own binary code (a combination of flip-flop outputs).
Different assignments give different circuits.
:::

::: formula Number of flip-flops for M states | 触发器个数
$$2^{n-1} < M \le 2^n$$
--
M | number of states needed |
n | number of flip-flops: the smallest $n$ with $2^n \ge M$ |
:::

With $n$ flip-flops there are $2^n$ codes; the $2^n - M$ unused ones are don't-cares in the
design, which is what makes the self-start check necessary.

## Example: a modulo-5 counter with D flip-flops

::: example Steps 1 to 3: states and their codes (例)
Design a modulo-5 counter with D flip-flops. It needs only its state outputs: no inputs
and no separate output.
== 1. Original state diagram ==
Five states in a ring: $S_1 \to S_2 \to S_3 \to S_4 \to S_5 \to S_1$.
== 2. Reduction ==
A counter's states are all different counts, so there are no redundant states: nothing to
reduce.
== 3. Assignment ==
$2^2 < 5 \le 2^3$, so $n = 3$ flip-flops, $Q_2Q_1Q_0$. The slide chooses (any five codes
would do, each giving a different circuit):
$$000 \to 001 \to 011 \to 101 \to 110 \to 000$$
The unused codes 010, 100, 111 are don't-cares.
:::

The state table that follows from the assignment (× = don't care):

| Present $Q_2Q_1Q_0$ | Next $Q_2^{n+1}$ | Next $Q_1^{n+1}$ | Next $Q_0^{n+1}$ |
|---|---|---|---|
| 000 | 0 | 0 | 1 |
| 001 | 0 | 1 | 1 |
| 010 | × | × | × |
| 011 | 1 | 0 | 1 |
| 100 | × | × | × |
| 101 | 1 | 1 | 0 |
| 110 | 0 | 0 | 0 |
| 111 | × | × | × |

### Step 4: equations from Karnaugh maps

Each next-state column is a function of $Q_2, Q_1, Q_0$; simplify it with a map, using the
don't-cares (minterms 2, 4, 7). $Q_2^{n+1}$ is 1 at 011 (m3) and 101 (m5):

::: kmap Q2next
vars: Q2 Q1 Q0
ones: 3 5
dont-care: 2 4 7
group: Q2' Q1
group: Q2 Q1'
:::

$Q_1^{n+1}$ is 1 at 001 (m1) and 101 (m5):

::: kmap Q1next
vars: Q2 Q1 Q0
ones: 1 5
dont-care: 2 4 7
group: Q1' Q0
:::

$Q_0^{n+1}$ is 1 at 000, 001, 011 (m0, m1, m3):

::: kmap Q0next
vars: Q2 Q1 Q0
ones: 0 1 3
dont-care: 2 4 7
group: Q2'
:::

$$Q_2^{n+1} = Q_1^n\overline{Q_2^n} + \overline{Q_1^n}Q_2^n, \qquad Q_1^{n+1} = Q_0^n\overline{Q_1^n}, \qquad Q_0^{n+1} = \overline{Q_2^n}$$

For a D flip-flop $Q^{n+1} = D$, so the drive equations are the state equations:
$D_2 = Q_1^n\overline{Q_2^n} + \overline{Q_1^n}Q_2^n$, $D_1 = Q_0^n\overline{Q_1^n}$,
$D_0 = \overline{Q_2^n}$. One clock for all (it is synchronous) and no output equation.

::: callout tip With JK or T flip-flops
With D flip-flops step 4 ends here. With JK flip-flops, write each state equation in the
form $Q^{n+1} = (\ldots)\overline{Q^n} + (\ldots)Q^n$ and compare it with
$Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$ to read off $J$ and $\overline{K}$; for T
flip-flops compare with $T \oplus Q^n$.
:::

### Step 5: the self-start check

Put the unused codes into the equations and see where they go:

| Invalid state $Q_2Q_1Q_0$ | Next $Q_2$ | Next $Q_1$ | Next $Q_0$ | Goes to |
|---|---|---|---|---|
| 010 | $1\cdot1 + 0 = 1$ | $0\cdot0 = 0$ | $\overline{0} = 1$ | 101, valid |
| 100 | $0 + 1\cdot1 = 1$ | $0\cdot1 = 0$ | $\overline{1} = 0$ | **100, itself** |
| 111 | $1\cdot0 + 0 = 0$ | $1\cdot0 = 0$ | $\overline{1} = 0$ | 000, valid |

::: graph The first design: 100 is stuck in an invalid cycle
at 000: 50, 40
at 001: 180, 40
at 011: 310, 40
at 101: 310, 160
at 110: 50, 160
at 111: 180, 110
at 010: 310, 245
at 100: 120, 245
000 -> 001, 001 -> 011, 011 -> 101, 101 -> 110, 110 -> 000
111 -> 000, 010 -> 101, 100 -> 100
:::

State 100 goes to itself for ever: an invalid cycle. The circuit **can't self-start**
(无效状态构成无效循环，电路不能自启动), so the design must change.

## Making it self-start

### Method 1: group the map differently

Only 100 is a problem, and it stays because its next $Q_2$ is 1. The map for $Q_2^{n+1}$ used
the don't-care at m4 (100) as a 1. Take it as **0** instead and group the 1 at m5 with the
don't-care at m7:

::: kmap Q2next (changed)
vars: Q2 Q1 Q0
ones: 3 5
dont-care: 2 7
group: Q2' Q1
group: Q2 Q0
:::

$$Q_2^{n+1} = Q_1^n\overline{Q_2^n} + Q_0^nQ_2^n$$

The valid states still go where they should (check 101: $0 + 1\cdot1 = 1$; 110: $1\cdot0 + 0 = 0$).
The invalid ones now go: 010 → 101, 100 → **000**, 111 → 100 → 000. Every invalid state
reaches the cycle: the circuit self-starts.

::: graph After method 1: every invalid state enters the cycle
at 000: 50, 40
at 001: 180, 40
at 011: 310, 40
at 101: 310, 160
at 110: 50, 160
at 111: 180, 110
at 010: 310, 245
at 100: 120, 245
000 -> 001, 001 -> 011, 011 -> 101, 101 -> 110, 110 -> 000
111 -> 100, 010 -> 101, 100 -> 000
:::

The new drive equations: $D_2 = Q_1^n\overline{Q_2^n} + Q_0^nQ_2^n$, $D_1 = Q_0^n\overline{Q_1^n}$,
$D_0 = \overline{Q_2^n}$. Set the present state and check each code's next state in the lab:

::: logic The self-starting modulo-5 counter: next states D2 D1 D0
inputs: Q2 Q1 Q0
D2 = Q1 Q2' + Q0 Q2
D1 = Q0 Q1'
D0 = Q2'
:::

### Method 2: choose the don't-cares' next states

Instead of leaving the unused rows as ×, decide where each should go: the slide sends all
three to 000.

| Present $Q_2Q_1Q_0$ | Next $Q_2Q_1Q_0$, original | Next $Q_2Q_1Q_0$, method 2 |
|---|---|---|
| 010 | ××× | 000 |
| 100 | ××× | 000 |
| 111 | ××× | 000 |

Now the maps have no don't-cares. $Q_2^{n+1}$ is 1 only at m3 and m5,
$Q_1^{n+1}$ at m1 and m5, $Q_0^{n+1}$ at m0, m1, m3:

$$\begin{aligned}
D_2 &= \overline{Q_2^n}Q_1^nQ_0^n + Q_2^n\overline{Q_1^n}Q_0^n = Q_0^n\,(Q_2^n \oplus Q_1^n) \\
D_1 &= \overline{Q_1^n}Q_0^n \\
D_0 &= \overline{Q_2^n}\,\overline{Q_1^n} + \overline{Q_2^n}Q_0^n
\end{aligned}$$

The slide doesn't print these; they follow from its modified table. Self-starting is
guaranteed by construction (every invalid state goes to 000), but the gates are a little
more complicated, as the slide says: 这种方法简单，但是电路将稍微复杂.

::: callout key Two fixes for a stuck design
Method 1: regroup the Karnaugh map so the stuck state's next state changes (cheap, but
check the result again). Method 2: give every unused state a valid next state before
simplifying (always works, a few more gates).
:::

## Step 6: the circuit

With method 1's equations: three D flip-flops on one $CP$.

| Flip-flop input | Equation | Gates |
|---|---|---|
| $D_0$ | $\overline{Q_2}$ | a wire from FF2's $\overline{Q}$ |
| $D_1$ | $Q_0\overline{Q_1}$ | an AND gate of FF0's $Q$ and FF1's $\overline{Q}$ |
| $D_2$ | $Q_1\overline{Q_2} + Q_0Q_2$ | two AND gates into an OR gate |

::: callout note The slide's drawing of D1
On the slide's circuit, FF0's $Q$ and FF1's $\overline{Q}$ are both wired straight to FF1's
$1D$ with no gate between them: two outputs tied together, which would short one against
the other. The equation above it, $D_1 = Q_0^n\overline{Q_1^n}$, needs an **AND gate** of
the two, as in the table. The rest of the drawing ($D_0$ from $\overline{Q_2}$, $D_2$ from
AND($Q_1$, $\overline{Q_2}$) and AND($Q_0$, $Q_2$) into an OR) matches the equations.
:::

::: callout exam Not in the exam scope
The review scope for this chapter lists analysing synchronous and asynchronous counters and
building counters of any modulus with the 74HC90 and 74HC160–163; it doesn't list the
design method. Still, the self-start check here is the same one analysis questions ask
for, and reading a design backwards is good practice for analysis.
:::

::: cards Designing synchronous circuits
Six design steps :: Original state diagram → reduction → assignment → flip-flops and equations → self-start check (fix it) → circuit.
State reduction (状态化简) :: Merging equivalent states so fewer states (and flip-flops) are needed.
State assignment (状态分配) :: Giving each state a binary code; different codes give different circuits.
Number of flip-flops for $M$ states :: The $n$ with $2^{n-1} < M \le 2^n$.
Flip-flops for a modulo-5 counter :: 3, since $2^2 < 5 \le 2^3$.
D flip-flop design: drive equations :: $D_i$ = the state equation $Q_i^{n+1}$.
Slides' modulo-5 codes :: 000 → 001 → 011 → 101 → 110 → 000.
First modulo-5 design: why it fails :: 100 goes to itself: an invalid cycle, so not self-starting.
Self-start fix, method 1 :: Regroup the map (take the stuck don't-care as 0): $D_2 = Q_1\overline{Q_2} + Q_0Q_2$.
Self-start fix, method 2 :: Give the unused states valid next states (here 000) before simplifying.
:::

::: quiz Designing synchronous circuits
? How many flip-flops does a modulo-12 counter need?
answer: 4
tolerance: 0
> $2^{n-1} < 12 \le 2^n$ holds for $n = 4$ ($8 < 12 \le 16$). Three flip-flops give only
> 8 codes.

? In the modulo-5 design, why is $Q_0^{n+1} = \overline{Q_2^n}$?
- [x] In the map, $Q_0^{n+1}$ is 1 at m0, m1, m3 and × at m2: the whole row $Q_2 = 0$
- [ ] Because $Q_0$ is the lowest bit, it always toggles
- [ ] Because the next state of 110 is 000
> The row $Q_2 = 0$ holds m0, m1, m3 (all 1) and m2 (×); the row $Q_2 = 1$ holds 0s and ×s.
> One four-cell group: $\overline{Q_2}$.

? With the first design ($D_2 = Q_1\overline{Q_2} + \overline{Q_1}Q_2$, $D_1 = Q_0\overline{Q_1}$, $D_0 = \overline{Q_2}$), where does state 010 go?
text: 101
> $D_2 = 1\cdot1 + 0 = 1$; $D_1 = 0\cdot0 = 0$; $D_0 = \overline{0} = 1$: 101, a valid state.

? With the first design, where does state 100 go, and what does that mean?
- [x] To 100 itself: an invalid cycle, so the counter isn't self-starting
- [ ] To 000: the counter self-starts
- [ ] To 101: the counter self-starts
> $D_2 = 0 + 1\cdot1 = 1$, $D_1 = 0$, $D_0 = \overline{1} = 0$: 100 again. Stuck for ever.

? Method 1 changes $D_2$ to $Q_1\overline{Q_2} + Q_0Q_2$. Where does 111 go now?
text: 100
> $D_2 = 1\cdot0 + 1\cdot1 = 1$; $D_1 = Q_0\overline{Q_1} = 1\cdot0 = 0$; $D_0 = \overline{1} = 0$:
> 100, and the next pulse takes 100 to 000. It reaches the cycle in two pulses.

? Method 2 sends 010, 100 and 111 to 000. Write the resulting $D_1$ in terms of $Q_2, Q_1, Q_0$.
logic: Q1' Q0
variables: Q2, Q1, Q0
> With no don't-cares, $Q_1^{n+1}$ is 1 only at 001 (m1) and 101 (m5): the pair
> $\overline{Q_1}Q_0$. It happens to be the same as before.

? Method 2: write $D_0$ in terms of $Q_2, Q_1, Q_0$.
logic: Q2' Q1' + Q2' Q0
variables: Q2, Q1, Q0
> $Q_0^{n+1}$ is 1 at m0, m1, m3 only (m2 is now 0): groups $\overline{Q_2}\,\overline{Q_1}$
> (m0, m1) and $\overline{Q_2}Q_0$ (m1, m3).

? Which step of the design method decides how many flip-flops are used?
- [x] State assignment
- [ ] State reduction
- [ ] The self-start check
> Reduction decides how many states $M$ there are; assignment then picks $n$ from
> $2^{n-1} < M \le 2^n$ and gives each state its code.
:::

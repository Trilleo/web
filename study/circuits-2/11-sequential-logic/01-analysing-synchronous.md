---
title: Analysing synchronous circuits
zh: 同步时序逻辑电路的分析
summary: What makes a circuit sequential (memory, present and next state, Mealy and Moore), the equations, state table, state diagram and timing diagram that describe it, and the five-step analysis of synchronous circuits, worked on a 4-bit JK counter and a reversible D counter.
source: 第7章 时序逻辑电路 7.2–7.3.1 (teacher's slides 1–17)
---

Every circuit in the combinational unit answered only the question "what are the
inputs *now*?". A counter can't work like that: after the fifth pulse it must show 5,
and the only difference between "after the fifth pulse" and "after the sixth pulse" is
what happened before. Circuits that remember are called sequential. This lesson sets out
how such a circuit is described (equations, a state table, a state diagram, a timing
diagram) and how to analyse one whose flip-flops all share one clock, which is the
first skill the exam asks for in this chapter.

## Circuits with memory

Think of a lift's floor display. Pressing "up" once doesn't tell it which floor to show:
it needs to know which floor it was on. The display is a little memory (the floor
number) plus some logic that works out the new number from the old one and the button.
That is the whole idea of a sequential circuit.

Lesson 9.1 named such a circuit a **sequential logic circuit** (时序逻辑电路): its
outputs at any moment depend not only on the inputs at that moment but also on the
circuit's earlier state. This chapter adds what it is made of.

::: law Structure of a sequential circuit | 时序逻辑电路的结构
A sequential circuit contains a combinational part and a storage part (flip-flops), and
the storage part's outputs are fed back into the combinational part.
:::

Compare the combinational unit: there the outputs were a function of the present inputs
alone, and the circuit had no feedback and no memory. In a sequential circuit the
flip-flops' outputs are fed back into the logic, so the circuit's own past becomes one of
its inputs.

The slides draw the structure as two boxes:

- a **combinational circuit** {{zh 组合逻辑电路}} with the external inputs $x_1 \dots x_n$
  and the external outputs $z_1 \dots z_m$;
- a **storage circuit** {{zh 存储电路}} (the flip-flops) below it. Its outputs
  $q_1 \dots q_j$ go back into the combinational part as extra inputs; the combinational
  part's outputs $y_1 \dots y_k$ drive the flip-flops' inputs (J, K, D…).

As in the flip-flops unit, $Q^n$ is the **present state** (现态), what a flip-flop holds
before a clock edge, and $Q^{n+1}$ the **next state** (次态), what it holds after it. For a
circuit, "the state" is all its flip-flops' outputs read together, such as
$Q_2Q_1 = 10$.

Three kinds of equation describe how the two boxes talk to each other:

::: formula The equations of a sequential circuit | 时序电路的方程
$$\begin{gathered}
z_m = f_m(x_1, \dots, x_n,\, q_1^n, \dots, q_j^n) \quad \text{output equations} \\
y_k = g_k(x_1, \dots, x_n,\, q_1^n, \dots, q_j^n) \quad \text{drive equations} \\
q_j^{n+1} = h_j(y_1, \dots, y_k,\, q_1^n, \dots, q_j^n) \quad \text{state equations}
\end{gathered}$$
--
x_1 \dots x_n | external inputs |
z_1 \dots z_m | external outputs |
y_1 \dots y_k | drive signals: the flip-flops' inputs (J, K, D, T) |
q_1^n \dots q_j^n | present state of the flip-flops |
q_j^{n+1} | next state of flip-flop $j$ |
:::

::: define Output, drive and state equations | 输出方程、驱动方程、状态方程
The **output equation** {{zh 输出方程}} gives each external output from the inputs and
the present state. The **drive equation** (驱动方程, as in the flip-flops unit's
conversions; also called the excitation equation, 激励方程) gives each flip-flop input. The **state equation** {{zh 状态方程}}
gives each flip-flop's next state; it comes from putting the drive equations into the
flip-flop's characteristic equation.
:::

The characteristic equations come from the flip-flops unit. The three you need here:
JK, $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$; D, $Q^{n+1} = D$; and T,
$Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n = T \oplus Q^n$ (a JK with $J = K = T$).

## Kinds of sequential circuit

### By how the flip-flops are clocked

::: define Synchronous sequential circuit | 同步时序逻辑电路
A sequential circuit in which every flip-flop changes state under the same clock signal,
at the same moment.
:::

::: define Asynchronous sequential circuit | 异步时序逻辑电路
A sequential circuit whose flip-flops do not all change at the same moment: some are
clocked by the outputs of others instead of by the common clock.
:::

The slides show one of each:

- **Synchronous:** two JK flip-flops on the same $CP$. FF0 has $J = K = 1$, so it toggles
  on every clock edge. FF1's $J$ and $K$ both come from an XOR gate of an input $X$ and
  $Q_0$. Both flip-flops look at their inputs at the same edge.
- **Asynchronous:** two D flip-flops, each with its own $\overline{Q}$ fed back to its
  $D$ (so each toggles when clocked). FF0 is clocked by $CP_0$, but FF1's clock $CP_1$ is
  FF0's output $Q_0$: FF1 can only change when $Q_0$ changes. The next lesson analyses it.

Synchronous circuits are easier to analyse (one clock, one moment) and faster (nothing
waits for a chain of flip-flops to ripple). Asynchronous ones need fewer gates.

### By what the outputs depend on

::: define Mealy and Moore circuits | 米里型与莫尔型时序电路
In a **Mealy** circuit {{zh 米里型}} the outputs depend on the storage state *and* on the
present inputs. In a **Moore** circuit {{zh 莫尔型}} the outputs depend only on the
storage state, not on the present inputs.
:::

A quick test: look at the output equation. If an external input appears in it, the
circuit is Mealy; if only $Q$s appear, it is Moore. A plain counter with no inputs is
always Moore.

## Five ways to describe a sequential circuit

| Description | What it is |
|---|---|
| Logic diagram {{zh 逻辑图}} | the circuit drawing, with its flip-flops and gates |
| Logic equations {{zh 逻辑函数式}} | clock, drive, state and output equations |
| State table {{zh 状态转换表}} | for every present state (and input), the next state and output |
| State diagram {{zh 状态转换图}} | the same as circles (states) joined by arrows (transitions) |
| Timing diagram {{zh 时序图}} | the waveforms of the clock, the states and the outputs against time |

The last three all show the same thing, how inputs, present state, next state and output
are related, as a table, a picture and a waveform.

::: define State table | 状态转换表
A table listing, for every combination of inputs and present state, the next state and
the outputs.
:::

State diagrams and timing diagrams work as they did for a single flip-flop in the
flip-flops unit, with two additions: a circle now holds the state of *all* the flip-flops
(00, 01, …), and in a circuit with inputs and outputs each arrow is labelled
"input/output", for example $A/Y = 1/0$: "with input 1 this transition happens, and the
output is 0 meanwhile". The timing diagram draws the clock, every flip-flop output and the
circuit outputs one under another.

A few words come up in every analysis:

::: define Valid and invalid states | 有效状态与无效状态
A **valid state** {{zh 有效状态}} is one the circuit uses in its intended cycle (the
**valid cycle**, 有效循环). An **invalid state** {{zh 无效状态}} is any other combination
the flip-flops can hold, for example at power-up. Invalid states that lead round among
themselves form an **invalid cycle** {{zh 无效循环}}.
:::

::: define Self-starting | 自启动
A circuit is self-starting when every invalid state leads into the valid cycle after a
few clock pulses, so the circuit always ends up working whatever state it powers up in.
If some invalid states form an invalid cycle, the circuit can be stuck there for ever:
it is not self-starting.
:::

## The analysis procedure

Analysing means: given a drawing, find what it does.

::: law How to analyse a sequential circuit | 时序电路的分析步骤
1. From the drawing, write the **clock equations** (which clock each flip-flop gets), the
   **drive equations** and the **output equations**.
2. Put the drive equations into the flip-flops' characteristic equations: these are the
   **state equations**.
3. Work out the **state table** from every present state (and input combination), then
   draw the **state diagram**.
4. Draw the **timing diagram** if it is asked for.
5. Say what the circuit does (its logic function) and **check that it self-starts**.
:::

In a synchronous circuit step 1's clock equation is just "every $CP_i = CP$", and the state
equations hold at every active edge.

::: callout tip Work the table row by row, from present to next
For each row, put the present-state bits into the state equations and the output
equations, and write the results. Start from 0…0 and follow where it leads (that order
traces the cycle), then fill in the rows you haven't reached: those are the invalid
states, and where they go settles the self-start question.
:::

## Example: a 4-bit synchronous counter

::: example Four JK flip-flops on one clock (例, textbook 例7.3.1)
Four falling-edge JK flip-flops FF1 … FF4 share the clock $CP$. FF1 has $J_1 = K_1 = 1$.
FF2's $J$ and $K$ both come from $Q_1$. An AND gate of $Q_1$ and $Q_2$ drives FF3's $J$ and
$K$; a second AND gate of that product and $Q_3$ drives FF4's $J$ and $K$. A last AND gate
gives the output $Y$ from $Q_4$ and the product $Q_3Q_2Q_1$. Find what the circuit does.
== 1. Clock, drive and output equations ==
Clock: $CP_1 = CP_2 = CP_3 = CP_4 = CP$ (synchronous; all change on the falling edge).

Drive:
$$\begin{gathered}
J_1 = K_1 = 1, \qquad J_2 = K_2 = Q_1^n, \\
J_3 = K_3 = Q_1^nQ_2^n, \qquad J_4 = K_4 = Q_3^nQ_2^nQ_1^n
\end{gathered}$$
Output: $Y = Q_4^nQ_3^nQ_2^nQ_1^n$.
== 2. State equations ==
Put each pair into $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$:
$$\begin{aligned}
Q_1^{n+1} &= \overline{Q_1^n} \\
Q_2^{n+1} &= Q_1^n\overline{Q_2^n} + \overline{Q_1^n}Q_2^n \\
Q_3^{n+1} &= Q_2^nQ_1^n\overline{Q_3^n} + \overline{Q_2^nQ_1^n}\,Q_3^n \\
Q_4^{n+1} &= Q_3^nQ_2^nQ_1^n\overline{Q_4^n} + \overline{Q_3^nQ_2^nQ_1^n}\,Q_4^n
\end{aligned}$$
Since $J = K$ in every flip-flop, each is really a T flip-flop: FF1 toggles every time,
FF2 toggles when $Q_1 = 1$, FF3 when $Q_2Q_1 = 11$, FF4 when $Q_3Q_2Q_1 = 111$.
== 3. State table ==
Starting from 0000 and applying the rule "a bit flips when every bit below it is 1":

| Present $Q_4Q_3Q_2Q_1$ | Next $Q_4Q_3Q_2Q_1$ | Output $Y$ |
|---|---|---|
| 0000 | 0001 | 0 |
| 0001 | 0010 | 0 |
| 0010 | 0011 | 0 |
| 0011 | 0100 | 0 |
| 0100 | 0101 | 0 |
| 0101 | 0110 | 0 |
| 0110 | 0111 | 0 |
| 0111 | 1000 | 0 |
| 1000 | 1001 | 0 |
| 1001 | 1010 | 0 |
| 1010 | 1011 | 0 |
| 1011 | 1100 | 0 |
| 1100 | 1101 | 0 |
| 1101 | 1110 | 0 |
| 1110 | 1111 | 0 |
| 1111 | 0000 | 1 |

Read as binary numbers, each next state is the present state plus 1, and 1111 wraps to
0000.
== 4. Timing ==
Counting the falling edges from the 0000 state:

| Pulses so far | $Q_4$ bit | $Q_3$ bit | $Q_2$ bit | $Q_1$ bit | Output $Y$ |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 |
| 2 | 0 | 0 | 1 | 0 | 0 |
| 3 | 0 | 0 | 1 | 1 | 0 |
| 4 | 0 | 1 | 0 | 0 | 0 |
| 5 | 0 | 1 | 0 | 1 | 0 |
| 6 | 0 | 1 | 1 | 0 | 0 |
| 7 | 0 | 1 | 1 | 1 | 0 |
| 8 | 1 | 0 | 0 | 0 | 0 |
| 9 | 1 | 0 | 0 | 1 | 0 |
| 10 | 1 | 0 | 1 | 0 | 0 |
| 11 | 1 | 0 | 1 | 1 | 0 |
| 12 | 1 | 1 | 0 | 0 | 0 |
| 13 | 1 | 1 | 0 | 1 | 0 |
| 14 | 1 | 1 | 1 | 0 | 0 |
| 15 | 1 | 1 | 1 | 1 | 1 |
| 16 | 0 | 0 | 0 | 0 | 0 |

$Q_1$ is a square wave at half the clock's frequency, $Q_2$ at a quarter, $Q_3$ at an
eighth, $Q_4$ at a sixteenth. $Y$ is high for one clock period, from the 15th falling edge
to the 16th.
== 5. Function and self-start ==
A **synchronous 4-bit binary up counter** (同步4位二进制加法计数器), or synchronous
16-ary up counter, with carry output $Y$. All 16 combinations are in the cycle, so there
are no invalid states and the question of self-starting doesn't arise.
:::

The state diagram is one loop through all sixteen states:

::: graph The 16-state cycle of the 4-bit counter (Y = 1 on the last arrow)
at 0000: 30, 25
at 0001: 105, 25
at 0010: 180, 25
at 0011: 255, 25
at 0100: 330, 25
at 0101: 330, 77
at 0110: 330, 130
at 0111: 330, 182
at 1000: 330, 235
at 1001: 255, 235
at 1010: 180, 235
at 1011: 105, 235
at 1100: 30, 235
at 1101: 30, 182
at 1110: 30, 130
at 1111: 30, 77
0000 -> 0001, 0001 -> 0010, 0010 -> 0011, 0011 -> 0100
0100 -> 0101, 0101 -> 0110, 0110 -> 0111, 0111 -> 1000
1000 -> 1001, 1001 -> 1010, 1010 -> 1011, 1011 -> 1100
1100 -> 1101, 1101 -> 1110, 1110 -> 1111, 1111 -> 0000: Y=1
:::

The timing diagram, drawn from the formulas: each waveform is lifted so they don't sit on
top of each other ($Q_1$ at the bottom, $Q_4$ at the top). The horizontal axis is the
number of clock pulses so far. Watch each line run at half the frequency of the one below.

::: plot Timing diagram of the 4-bit counter (each Q lifted 1.5 above the last)
x: 0 .. 16
y: -0.5 .. 6
xlabel: clock pulses
ylabel: Q1, Q2, Q3, Q4
Q1(x) = floor(x) - 2 floor(x/2)
Q2(x) = floor(x/2) - 2 floor(x/4) + 1.5
Q3(x) = floor(x/4) - 2 floor(x/8) + 3
Q4(x) = floor(x/8) - 2 floor(x/16) + 4.5
:::

::: callout pitfall The carry comes after the 15th pulse, not the 16th
"16-ary" makes it tempting to put $Y = 1$ at the 16th pulse. The slide's warning: the carry
state (1111) arrives after the **15th** pulse, and the 16th pulse returns the counter to
0000. $Y$ is high in between, and its falling edge (at the 16th pulse) is what a next
counter would use as its carry.
:::

::: callout key The synchronous binary counter rule
In a synchronous binary up counter, a bit toggles exactly when all the bits below it are
1. With JK flip-flops: $J_i = K_i = Q_{i-1}^n \cdots Q_1^n$ (and $J_1 = K_1 = 1$).
:::

## Example: a reversible counter with an input

::: example Two D flip-flops and a direction input (例)
Two rising-edge D flip-flops FF1, FF2 share $CP$. There is one input $A$. FF1's $D$ is its
own $\overline{Q_1}$. FF2's $D$ is the output of two XOR gates in a chain: $A \oplus Q_1$,
then that $\oplus\, Q_2$. The output $Y$ is a NAND of two NANDs: one of $\overline{A}$,
$Q_1$, $Q_2$, the other of $A$, $\overline{Q_1}$, $\overline{Q_2}$. What does it do?
== 1. Drive and output equations ==
$$D_1 = \overline{Q_1^n}, \qquad D_2 = A \oplus Q_1^n \oplus Q_2^n$$
NAND–NAND is AND–OR, so
$$Y = \overline{\overline{\overline{A}Q_1^nQ_2^n}\cdot\overline{A\,\overline{Q_1^n}\,\overline{Q_2^n}}} = \overline{A}Q_1^nQ_2^n + A\,\overline{Q_1^n}\,\overline{Q_2^n}$$
== 2. State equations ==
For a D flip-flop $Q^{n+1} = D$:
$$Q_1^{n+1} = \overline{Q_1^n}, \qquad Q_2^{n+1} = A \oplus Q_1^n \oplus Q_2^n$$
== 3. State table ==

| Input $A$ | Present $Q_2Q_1$ | Next $Q_2Q_1$ | Output $Y$ |
|---|---|---|---|
| 0 | 00 | 01 | 0 |
| 0 | 01 | 10 | 0 |
| 0 | 10 | 11 | 0 |
| 0 | 11 | 00 | 1 |
| 1 | 00 | 11 | 1 |
| 1 | 01 | 00 | 0 |
| 1 | 10 | 01 | 0 |
| 1 | 11 | 10 | 0 |

For instance the row $A = 1$, $Q_2Q_1 = 10$: $Q_1^{n+1} = \overline{0} = 1$,
$Q_2^{n+1} = 1 \oplus 0 \oplus 1 = 0$, so the next state is 01; $Y = 0 + 1\cdot1\cdot0 = 0$.
== 4. State diagram ==
Arrows labelled $A/Y$ (below). With $A = 0$ the arrows run 00 → 01 → 10 → 11 → 00; with
$A = 1$ they run the other way, 00 → 11 → 10 → 01 → 00.
== 5. Function ==
With $A = 0$ it counts up through 0, 1, 2, 3 and $Y = 1$ at 3 (a carry); with $A = 1$ it
counts down 0, 3, 2, 1 and $Y = 1$ at 0 (a borrow). It is a **reversible 4-ary counter**
(可逆四进制计数器). $Y$ depends on the input $A$, so it is a **Mealy** circuit. All four
states are used, so it self-starts trivially.
:::

::: graph Reversible counter: states Q2Q1, arrows A/Y
at 00: 80, 50
at 01: 280, 50
at 10: 280, 210
at 11: 80, 210
00 -> 01: 0/0, 01 -> 10: 0/0, 10 -> 11: 0/0, 11 -> 00: 0/1
00 -> 11: 1/1, 11 -> 10: 1/0, 10 -> 01: 1/0, 01 -> 00: 1/0
:::

You can try it as a logic lab: set the present state $Q_2Q_1$ and the direction $A$, and
read the next state $N_2N_1$ and the output. Then set the switches to the next state and
repeat, which is exactly what one clock pulse does.

::: logic The reversible counter's next state and output
inputs: A Q2 Q1
N2 = A ⊕ Q1 ⊕ Q2
N1 = Q1'
Y = A' Q1 Q2 + A Q1' Q2'
:::

::: callout pitfall Order the state bits the way the question does
The slide writes the state as $Q_2Q_1$, high bit first. If you list $Q_1Q_2$ instead, 01
and 10 swap and the "up counter" seems to count 0, 2, 1, 3. Fix the order before you
start the table, and keep it the same in the diagram.
:::

## Checking self-start

Both slide examples used every combination of their flip-flops, so nothing could go
wrong at power-up. Most counters don't: three flip-flops have eight states, and a 3-state
counter uses only three. Then the self-start check matters.

::: example A 3-state counter with an unused state
Two falling-edge JK flip-flops on one clock: $J_1 = \overline{Q_2^n}$, $K_1 = 1$;
$J_2 = Q_1^n$, $K_2 = 1$. Find its cycle and check that it self-starts.
== State equations ==
$$Q_1^{n+1} = \overline{Q_2^n}\,\overline{Q_1^n}, \qquad Q_2^{n+1} = Q_1^n\overline{Q_2^n}$$
(With $K = 1$ the term $\overline{K}Q^n$ vanishes.)
== State table ==

| Present $Q_2Q_1$ | Next $Q_2Q_1$ |
|---|---|
| 00 | 01 |
| 01 | 10 |
| 10 | 00 |
| 11 | 00 |

For 11: $Q_1^{n+1} = 0\cdot0 = 0$ and $Q_2^{n+1} = 1\cdot0 = 0$.
== Function and self-start ==
The valid cycle is 00 → 01 → 10 → 00: a synchronous 3-ary (modulo-3) up counter. The
one invalid state, 11, goes to 00 at the next pulse, so the circuit **self-starts**.
:::

::: callout exam What analysis questions look like
The final asks you to analyse synchronous and asynchronous counters. A typical question
gives a drawing of two to four flip-flops and asks for: the drive and state equations, the
complete state diagram (including the invalid states), the counter's modulus, and whether
it self-starts. Write the equations first: the marking scheme gives credit for them even
if a later step slips.
:::

::: cards Analysing synchronous circuits
Sequential logic circuit (时序逻辑电路) :: Outputs depend on the present inputs and on the earlier state; a combinational part plus storage (flip-flops).
Combinational vs sequential :: Combinational: outputs from present inputs only, no memory or feedback. Sequential: has flip-flops whose state is fed back.
Present state and next state (现态、次态) :: $Q^n$ before the clock edge, $Q^{n+1}$ after it.
Three equations of a sequential circuit :: Output equations, drive (excitation) equations, state equations.
How the state equations are found :: Put the drive equations into the flip-flops' characteristic equations.
Synchronous circuit (同步) :: All flip-flops change on the same clock at the same moment.
Asynchronous circuit (异步) :: Flip-flops don't all change together; some are clocked by others' outputs.
Mealy circuit (米里型) :: Outputs depend on the state and the present inputs.
Moore circuit (莫尔型) :: Outputs depend only on the state.
Five descriptions of a sequential circuit :: Logic diagram, equations, state table, state diagram, timing diagram.
Self-starting (自启动) :: Every invalid state leads into the valid cycle after some pulses.
Five analysis steps :: Equations (clock, drive, output) → state equations → state table and diagram → timing diagram → function and self-start check.
Synchronous binary up counter, JK drive :: $J_i = K_i$ = the AND of all lower $Q$s; $J_1 = K_1 = 1$.
4-bit counter's carry $Y = Q_4Q_3Q_2Q_1$ :: High after the 15th pulse, back to 0 at the 16th.
Reversible counter of the slides :: $D_1 = \overline{Q_1}$, $D_2 = A \oplus Q_1 \oplus Q_2$; up for $A = 0$, down for $A = 1$; Mealy.
:::

::: quiz Analysing synchronous circuits
? In the 4-bit JK counter, what are $J_3$ and $K_3$?
- [x] $J_3 = K_3 = Q_1^nQ_2^n$
- [ ] $J_3 = Q_2^n$, $K_3 = \overline{Q_2^n}$
- [ ] $J_3 = K_3 = Q_1^n + Q_2^n$
> FF3 is driven by the AND gate of $Q_1$ and $Q_2$ on both inputs, so it toggles only when
> both lower bits are 1, the binary counter rule.

? The 4-bit counter is in state 0111. Write the next state as four bits $Q_4Q_3Q_2Q_1$.
text: 1000
> $Q_1$ always toggles (1 → 0); $Q_2$ toggles because $Q_1 = 1$ (1 → 0); $Q_3$ toggles
> because $Q_2Q_1 = 11$ (1 → 0); $Q_4$ toggles because $Q_3Q_2Q_1 = 111$ (0 → 1). So 1000:
> 7 + 1 = 8.

? After how many clock pulses from 0000 does the 4-bit counter's output $Y$ first become 1?
answer: 15
tolerance: 0
> $Y = Q_4Q_3Q_2Q_1$ is 1 only in state 1111 = 15, reached after the 15th pulse. The 16th
> pulse returns the counter to 0000 and $Y$ to 0.

? A 4-bit synchronous binary counter is clocked at 1.6 MHz. What is the frequency of $Q_4$?
answer: 100 kHz
> Each stage halves the frequency: $Q_1$ 800 kHz, $Q_2$ 400 kHz, $Q_3$ 200 kHz, $Q_4$
> $1.6\ \text{MHz}/16 = 100$ kHz.

? In the reversible counter, $A = 1$ and the present state $Q_2Q_1 = 00$. What are the next state and $Y$?
- [x] 11, $Y = 1$
- [ ] 01, $Y = 0$
- [ ] 11, $Y = 0$
> $Q_1^{n+1} = \overline{0} = 1$; $Q_2^{n+1} = 1 \oplus 0 \oplus 0 = 1$: next state 11.
> $Y = A\overline{Q_1}\,\overline{Q_2} = 1$: counting down from 0 gives a borrow.

? Is the reversible counter a Mealy or a Moore circuit, and why?
- [x] Mealy: its output $Y$ contains the input $A$
- [ ] Moore: its output depends only on $Q_2$ and $Q_1$
- [ ] Moore: it has a clock
> $Y = \overline{A}Q_1Q_2 + A\overline{Q_1}\,\overline{Q_2}$ depends on the input $A$ as
> well as the state, which is the definition of a Mealy circuit.

? The slides' first synchronous example has FF0 with $J_0 = K_0 = 1$ and FF1 with $J_1 = K_1 = X \oplus Q_0$ (JK flip-flops, one clock). With $X = 1$, starting from $Q_1Q_0 = 00$, which sequence does $Q_1Q_0$ follow?
- [x] 00 → 11 → 10 → 01 → 00 (counting down)
- [ ] 00 → 01 → 10 → 11 → 00 (counting up)
- [ ] 00 → 01 → 00 (stuck)
> $Q_0$ toggles every pulse. With $X = 1$, $J_1 = K_1 = \overline{Q_0}$: FF1 toggles when
> $Q_0 = 0$. From 00: $Q_0 = 0$ so both toggle → 11; $Q_0 = 1$ so only $Q_0$ → 10; → 01;
> → 00. That's 0, 3, 2, 1: a down counter. With $X = 0$ it counts up, so this too is a
> reversible counter.

? Two JK flip-flops on one clock have $J_1 = \overline{Q_2^n}$, $K_1 = 1$, $J_2 = Q_1^n$, $K_2 = 1$. Write the state equation $Q_2^{n+1}$ in terms of $Q_1$ and $Q_2$ (present states).
logic: Q1 Q2'
> $Q_2^{n+1} = J_2\overline{Q_2^n} + \overline{K_2}Q_2^n = Q_1^n\overline{Q_2^n} + 0$.

? A counter has an invalid state that goes to itself at every clock pulse. What can you say?
- [x] It is not self-starting: if it powers up in that state it stays there
- [ ] It is self-starting, because the state is stable
- [ ] Nothing: self-starting is only about valid states
> Self-starting means every invalid state eventually enters the valid cycle. A state that
> loops on itself is an invalid cycle of length 1, so the counter can be stuck there.
:::

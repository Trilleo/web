---
title: Analysing asynchronous circuits
zh: 异步时序逻辑电路的分析
summary: Asynchronous circuits, where flip-flops have their own clocks: clock equations, analysing a flip-flop only on its own clock's active edge, ripple counters, and the slides' self-starting asynchronous 5-ary counter.
source: 第7章 时序逻辑电路 7.3.2 (teacher's slides 5, 18–21)
---

In an asynchronous circuit the flip-flops don't all listen to the same clock: some are
clocked by the outputs of others. That saves gates (a binary counter needs no AND gates at
all) and is how the 74HC90 counter chip in the next lesson is built inside. The price is
that analysis needs one extra question at every step: *did this flip-flop get a clock edge
at all?* This lesson adds that question to the five-step method of the previous lesson
and works the slides' asynchronous 5-ary counter, a favourite exam circuit.

## What changes when the clocks differ

Picture a row of dominoes. In a synchronous circuit every domino is pushed at the same
instant by one hand; in an asynchronous circuit only the first is pushed, and each of the
others falls only if the one before it falls *the right way*. To know whether domino 3
falls, you must first know what domino 2 did.

The slides list how asynchronous analysis differs from synchronous analysis:

1. The flip-flops don't share one clock, so the storage circuit doesn't update all at once.
2. You must write a **clock equation** for each flip-flop.
3. A flip-flop's state equation applies only when **its own clock** has an active edge;
   otherwise the flip-flop keeps its state.
4. Analyse step by step, starting from the flip-flop driven by the external clock, then
   the ones clocked by it, and so on.
5. The changes ripple through with a small delay at each stage.
6. Otherwise the steps are the same as for a synchronous circuit.

::: define Clock equation | 时钟方程
An equation saying which signal clocks each flip-flop, for example $CP_1 = CP$ or
$CP_2 = Q_1$. With an edge-triggered flip-flop it is written with the active edge:
$CP_2 = Q_1^n{\downarrow}$ means "FF2 is clocked by the falling edge of $Q_1$".
:::

::: law The asynchronous analysis rule | 异步电路的分析原则
At each external clock pulse, work out first the flip-flops clocked by $CP$. Then, for
each flip-flop clocked by another flip-flop's output, check whether that output has just
made the **active edge** (a 1 → 0 change for a falling-edge flip-flop, 0 → 1 for a rising-
edge one). Only if it has does the flip-flop take the value of its state equation;
otherwise $Q^{n+1} = Q^n$.
:::

The inputs (J, K, D) of a flip-flop are read with the values they had **just before** its
clock edge. In a ripple, a later flip-flop's clock edge arrives a few nanoseconds after
$CP$, but the flip-flops it reads haven't changed yet unless they were clocked earlier in
the chain. In the slides' examples you can use the present-state values throughout.

::: callout pitfall Don't apply every state equation at every pulse
The most common mistake: putting the present state into all the state equations at once,
as if the circuit were synchronous. A flip-flop whose clock didn't make its active edge
**keeps its state**, whatever its J and K say.
:::

## A ripple counter: the simplest asynchronous circuit

::: define Ripple counter | 异步计数器（行波计数器）
An asynchronous counter in which each flip-flop toggles and is clocked by the previous
flip-flop's output, so a change ripples from the lowest bit up.
:::

::: example A 3-bit asynchronous binary up counter
Three falling-edge JK flip-flops, each with $J = K = 1$ (they toggle when clocked).
$CP_0 = CP{\downarrow}$, $CP_1 = Q_0{\downarrow}$, $CP_2 = Q_1{\downarrow}$. Find the
count sequence from 000.
== Clock and state equations ==
Every flip-flop has $Q^{n+1} = \overline{Q^n}$, each on its own clock.
== From 011, the interesting step ==
At the falling edge of $CP$: FF0 toggles, $Q_0$: 1 → 0, a falling edge, so FF1 toggles,
$Q_1$: 1 → 0, a falling edge, so FF2 toggles, $Q_2$: 0 → 1. The state goes
$Q_2Q_1Q_0 = 011 \to 100$: 3 + 1 = 4.
== From 100 ==
FF0 toggles, $Q_0$: 0 → 1, a **rising** edge: FF1 is not clocked, so $Q_1$ and $Q_2$ hold.
$100 \to 101$.
== Function ==
Each bit flips when the bit below it falls from 1 to 0, which is exactly the carry rule of
binary addition: 000 → 001 → … → 111 → 000, a 3-bit (8-ary) asynchronous up counter, with no
gates at all.
:::

Whether it counts up or down depends on the edge and on which output is used as the next
clock:

| Flip-flops trigger on | Next clock taken from $Q$ | Next clock taken from $\overline{Q}$ |
|---|---|---|
| falling edge | counts up | counts down |
| rising edge | counts down | counts up |

The reason: with falling-edge flip-flops clocked by $Q$, a stage toggles when the stage
below goes 1 → 0, which is a carry. A rising edge of $Q$ (0 → 1) is the moment a borrow
happens when counting down.

::: example The slides' asynchronous example: two D flip-flops
FF0 and FF1 are rising-edge D flip-flops, each with $D = \overline{Q}$ (so they toggle
when clocked). $CP_0$ clocks FF0; FF0's $Q_0$ is $CP_1$. An AND gate gives
$Z = Q_1Q_0$. Find the sequence from $Q_1Q_0 = 00$.
== Equations ==
Clocks: $CP_0{\uparrow}$ for FF0, $CP_1 = Q_0{\uparrow}$ for FF1. States:
$Q_0^{n+1} = \overline{Q_0^n}$, $Q_1^{n+1} = \overline{Q_1^n}$ (each on its own clock).
Output: $Z = Q_1^nQ_0^n$.
== Pulse by pulse ==

| Pulse | $Q_0$ change | FF1 clocked? | Next $Q_1Q_0$ | Output $Z$ |
|---|---|---|---|---|
| start | | | 00 | 0 |
| 1 | 0 → 1, rising | yes, toggles | 11 | 1 |
| 2 | 1 → 0, falling | no | 10 | 0 |
| 3 | 0 → 1, rising | yes, toggles | 01 | 0 |
| 4 | 1 → 0, falling | no | 00 | 0 |
== Function ==
0 → 3 → 2 → 1 → 0: a 2-bit asynchronous **down** counter (rising-edge flip-flops clocked
by $Q$), and $Z$ marks state 3.
:::

## Example: the asynchronous 5-ary counter

This is the circuit inside the 74HC90's "÷5" section, so it is worth knowing well.

::: example Three JK flip-flops, two clocks (例)
Three falling-edge JK flip-flops; the counter's output is $Q_3Q_2Q_1$. $CP$ clocks FF1
and FF3. FF1's $Q_1$ clocks FF2. FF1: $J_1 = \overline{Q_3}$, $K_1$ unconnected. FF2: $J_2$
and $K_2$ unconnected. FF3: $J_3$ from an AND gate of $Q_1$ and $Q_2$, $K_3$ unconnected.
(1) Write the drive and state equations; (2) draw the complete state diagram; (3) what
modulus is the counter, and does it self-start?
== 1. Clock and drive equations ==
Unconnected inputs count as 1 (see the note below).
$$CP_1 = CP_3 = CP{\downarrow}, \qquad CP_2 = Q_1^n{\downarrow}$$
$$\begin{gathered}
J_1 = \overline{Q_3^n}, \quad J_2 = 1, \quad J_3 = Q_1^nQ_2^n \\
K_1 = 1, \quad K_2 = 1, \quad K_3 = 1
\end{gathered}$$
== 2. State equations ==
Into $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$ (with $K = 1$ the second term is 0):
$$\begin{aligned}
Q_1^{n+1} &= \overline{Q_1^n}\,\overline{Q_3^n} && (CP{\downarrow}) \\
Q_2^{n+1} &= \overline{Q_2^n} && (Q_1{\downarrow}) \\
Q_3^{n+1} &= Q_1^nQ_2^n\overline{Q_3^n} && (CP{\downarrow})
\end{aligned}$$
== 3. State table, valid states ==
For each present state: work out $Q_1$ and $Q_3$ (they always get the clock), then look at
how $Q_1$ changed to decide whether FF2 toggles.

| Present $Q_3Q_2Q_1$ | Next $Q_1$ | Next $Q_3$ | $Q_1$ falls? | Next $Q_2$ | Next $Q_3Q_2Q_1$ |
|---|---|---|---|---|---|
| 000 | 1 | 0 | no (0 → 1) | holds 0 | 001 |
| 001 | 0 | 0 | yes | toggles to 1 | 010 |
| 010 | 1 | 0 | no | holds 1 | 011 |
| 011 | 0 | 1 | yes | toggles to 0 | 100 |
| 100 | 0 | 0 | no (stays 0) | holds 0 | 000 |
== 4. State table, invalid states ==

| Present $Q_3Q_2Q_1$ | Next $Q_1$ | Next $Q_3$ | $Q_1$ falls? | Next $Q_2$ | Next $Q_3Q_2Q_1$ |
|---|---|---|---|---|---|
| 101 | 0 | 0 | yes | toggles to 1 | 010 |
| 110 | 0 | 0 | no (stays 0) | holds 1 | 010 |
| 111 | 0 | 0 | yes | toggles to 0 | 000 |

Check 101: $Q_1^{n+1} = \overline{1}\cdot\overline{1} = 0$; $Q_3^{n+1} = 1\cdot0\cdot0 = 0$;
$Q_1$ went 1 → 0, so FF2 toggles from 0 to 1.
== 5. Function and self-start ==
The valid cycle is 000 → 001 → 010 → 011 → 100 → 000: five states counting 0 to 4, so it
is an **asynchronous 5-ary (modulo-5) up counter**. The invalid states 101, 110 → 010 and
111 → 000 all enter the cycle in one pulse: it **self-starts** (能自启动的异步五进制加法计数器).
:::

::: graph The 5-ary counter's complete state diagram (Q3Q2Q1)
at 000: 40, 60
at 001: 140, 60
at 010: 240, 60
at 011: 240, 170
at 100: 140, 170
at 101: 330, 20
at 110: 330, 120
at 111: 40, 220
000 -> 001, 001 -> 010, 010 -> 011, 011 -> 100, 100 -> 000
101 -> 010, 110 -> 010, 111 -> 000
:::

The timing, pulse by pulse from 000 (the slide's count table):

| Pulse | $Q_3$ bit | $Q_2$ bit | $Q_1$ bit | Count |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 1 | 1 |
| 2 | 0 | 1 | 0 | 2 |
| 3 | 0 | 1 | 1 | 3 |
| 4 | 1 | 0 | 0 | 4 |
| 5 | 0 | 0 | 0 | 0 |

$Q_3$ is high for one pulse in five: it can serve as the carry, and its falling edge at the
fifth pulse is what clocks the next stage when two sections are joined (the 74HC90 in the
next lesson).

Explore the state equations of the two flip-flops on $CP$ as a logic lab. Set the present
state; $N_1$ and $N_3$ are the next values of $Q_1$ and $Q_3$. $Q_2$ isn't here because it
depends on how $Q_1$ *changes*, which a truth table can't show: that is exactly what makes
the circuit asynchronous.

::: logic Next states of FF1 and FF3 (both on CP)
inputs: Q3 Q2 Q1
N1 = Q1' Q3'
N3 = Q1 Q2 Q3'
:::

::: callout note Unconnected J and K inputs
The slide leaves $K_1$, $J_2$, $K_2$ and $K_3$ unconnected and the analysis takes them as 1.
That is how TTL inputs behave (an open TTL input reads high). On a real CMOS (HC) chip an
open input floats and must be tied to $V_{CC}$; inside the 74HC90 it is.
:::

::: callout key The extra question in every asynchronous step
For each flip-flop and each pulse: did its own clock make its active edge? Yes: use the
state equation. No: it holds. Work from the flip-flop on the external clock outwards.
:::

::: callout exam What to expect
"The counter's output is $Q_3Q_2Q_1$: write the drive and state equations, draw the
complete state diagram, give the modulus and say whether it self-starts" is exactly how
the slides pose it and how exam questions read. Write the clock equations with the edge
($CP_2 = Q_1{\downarrow}$), and include the invalid states in the diagram: "complete" means
all eight.
:::

::: cards Analysing asynchronous circuits
Asynchronous circuit: what is different :: Flip-flops have different clocks, so they don't update together; write a clock equation for each.
Clock equation (时钟方程) :: Which signal clocks each flip-flop, with its edge, e.g. $CP_2 = Q_1{\downarrow}$.
When does a flip-flop use its state equation? :: Only when its own clock makes its active edge; otherwise $Q^{n+1} = Q^n$.
Order of asynchronous analysis :: Start from the flip-flop on the external clock, then those clocked by it, stage by stage.
Ripple counter (异步计数器) :: Toggling flip-flops, each clocked by the previous one's output.
Falling-edge flip-flops clocked by $Q$ :: Count up.
Rising-edge flip-flops clocked by $Q$ :: Count down.
Asynchronous 5-ary counter: equations :: $Q_1^{n+1} = \overline{Q_1}\,\overline{Q_3}$ ($CP{\downarrow}$), $Q_2^{n+1} = \overline{Q_2}$ ($Q_1{\downarrow}$), $Q_3^{n+1} = Q_1Q_2\overline{Q_3}$ ($CP{\downarrow}$).
Asynchronous 5-ary counter: cycle :: 000 → 001 → 010 → 011 → 100 → 000; invalid 101, 110 → 010, 111 → 000; self-starting.
Drawback of asynchronous counters :: Changes ripple through with a delay at each stage; slower, with brief wrong states while rippling.
:::

::: quiz Analysing asynchronous circuits
? In the 5-ary counter, which flip-flop is clocked by $Q_1$?
- [x] FF2
- [ ] FF3
- [ ] FF1 and FF3
> The clock equations are $CP_1 = CP_3 = CP$ and $CP_2 = Q_1{\downarrow}$.

? In the 5-ary counter the present state is $Q_3Q_2Q_1 = 010$. What is the next state?
text: 011
> $Q_1^{n+1} = \overline{0}\cdot\overline{0} = 1$; $Q_3^{n+1} = 0\cdot1\cdot1 = 0$. $Q_1$ rises
> (0 → 1), which isn't FF2's active edge, so $Q_2$ holds 1. Next: 011.

? In the 5-ary counter the present state is 110. A student puts 110 into all three state equations at once and gets 000. What is the right next state?
- [x] 010
- [ ] 000
- [ ] 100
> $Q_1^{n+1} = \overline{0}\cdot\overline{1} = 0$ and $Q_3^{n+1} = 0$. $Q_1$ stays 0, so FF2
> gets no falling edge and **keeps** $Q_2 = 1$. Next: 010. The student applied
> $Q_2^{n+1} = \overline{Q_2}$ without checking FF2's clock.

? How many valid states does the slides' asynchronous counter have?
answer: 5
tolerance: 0
> 000, 001, 010, 011, 100: a modulo-5 counter.

? Does the 5-ary counter self-start?
- [x] Yes: 101 and 110 go to 010, 111 goes to 000
- [ ] No: 101 and 111 form an invalid cycle
- [ ] Only if it starts in 000
> Every invalid state reaches the valid cycle in one pulse, so it self-starts.

? A 3-bit ripple counter of falling-edge flip-flops, each clocked by the previous stage's $Q$, is in state $Q_2Q_1Q_0 = 111$. What is it after the next clock pulse?
text: 000
> FF0 toggles 1 → 0 (falling), so FF1 toggles 1 → 0 (falling), so FF2 toggles 1 → 0: 000.
> It counts up, and 7 + 1 wraps to 0.

? The same ripple counter is rebuilt with rising-edge flip-flops, still each clocked by the previous $Q$. Which way does it count?
- [x] Down
- [ ] Up
- [ ] It doesn't count
> Now a stage toggles when the stage below goes 0 → 1, which is when counting down needs a
> borrow. From 000: $Q_0$ 0 → 1 rises, so $Q_1$ toggles to 1 and rises, so $Q_2$ toggles:
> 111 = 7. Down.

? A ripple counter's flip-flops each take 10 ns from clock edge to output. In a 4-bit ripple counter, how long can the 0111 → 1000 change take to settle?
answer: 40 ns
> All four stages change, each waiting for the one before: $4 \times 10 = 40$ ns. During
> that time the outputs briefly show other numbers (0110, 0100, 0000), which is why
> asynchronous counters are slower and give short false states.
:::

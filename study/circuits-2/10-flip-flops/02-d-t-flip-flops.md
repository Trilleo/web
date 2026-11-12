---
title: D, T and T′ flip-flops
zh: D、T和T′触发器
summary: The edge-triggered D flip-flop (Q takes D), the T flip-flop (toggle when T = 1) and the T′ flip-flop (always toggle), each with its function table, characteristic equation, state diagram, drive table and timing diagram, and two T flip-flops used as a divide-by-2 and divide-by-4 frequency divider.
source: 第6章 触发器 6.2–6.4
---

The JK flip-flop of Lesson 10.1 can do everything, but most of the time a circuit needs
just one job done. Storing a bit is a **D** flip-flop's job: at the clock edge it takes
whatever is on its input. Counting is a **T** flip-flop's job: it flips when told to.
The **T′** flip-flop flips at every edge, which halves a frequency. This lesson describes
each the same five ways as the JK (table, equation, state diagram, drive table, timing),
and ends with the frequency divider, the first step towards the counters of the next
unit.

## The D flip-flop

Think of a camera with a shutter that clicks only at the clock edge: whatever $D$ shows
at that instant is the picture $Q$ keeps until the next click. Lesson 10.1 built
exactly this from a master and a slave latch.

::: define D flip-flop | D触发器
An edge-triggered flip-flop with one data input $D$: at the active clock edge its
state becomes $D$ ($D = 1$ gives $Q = 1$, $D = 0$ gives $Q = 0$); at all other times it
holds.
:::

Its symbol has $\overline{R}_d$ (bubble) → R, $D$ → 1D, $CP$ → C1, $\overline{S}_d$
(bubble) → S, and outputs $Q$, $\overline{Q}$ (bubble). The slides' D flip-flop is
falling-edge triggered (bubble and triangle on C1); rising-edge D flip-flops are just
as common.

### Function table and characteristic equation

| Clock CP | Pin $\overline{R}_d$ | Pin $\overline{S}_d$ | Input D | Next $Q^{n+1}$ | Function |
|---|---|---|---|---|---|
| × | 0 | 1 | × | 0 | asynchronous reset |
| × | 1 | 0 | × | 1 | asynchronous set |
| 0 or 1 | 1 | 1 | × | $Q^n$ | hold |
| ↓ | 1 | 1 | 0 | 0 | synchronous reset |
| ↓ | 1 | 1 | 1 | 1 | synchronous set |

With the clocked rows written for both present states, $Q^{n+1}$ is simply $D$ every
time: the present state plays no part.

| Input D | Present $Q^n$ | Next $Q^{n+1}$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

::: formula D flip-flop characteristic equation | D触发器特性方程
$$Q^{n+1} = D$$
--
D | data input, read at the active clock edge |
Q^{n+1} | next state, after the edge |
:::

The D flip-flop can only set or reset: it has no "hold" input. To keep its bit, $D$
must be given the present $Q$ again (or the clock stopped).

### State diagram and drive table

From either state, $D = 1$ leads to state 1 and $D = 0$ to state 0:

::: graph State diagram of the D flip-flop
at 0: 110, 130
at 1: 250, 130
0 -> 1: D=1
1 -> 0: D=0
0 -> 0: D=0
1 -> 1: D=1
:::

The drive table is the easiest of all: the input needed is the next state itself.

| Present $Q^n$ | Next $Q^{n+1}$ | Input D |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

### Timing: latch, rising edge, falling edge

::: example One D waveform into three flip-flops (例2)
Three D elements share the same $CP$ and $D$, with R and S tied to 1, and all start at
$Q = 0$: FF1 is level-triggered (no triangle on C1), FF2 rising-edge, FF3 falling-edge.
The clock rises at $t = 1$, falls at $t = 2$, rises at $t = 3$ and falls at $t = 4$. $D$ is
1 until $t = 1.5$; then it has short high pulses at 2.5–2.7 (clock low) and 3.3–3.45
(clock high), is high from 3.7 to 4.2 (across the falling edge at 4), and has one more
short pulse at 4.55–4.7. Draw $Q_1$, $Q_2$, $Q_3$.
== FF2: rising edges ==

| Rising edge at | Input D | Next $Q_2$ |
|---|---|---|
| 1 | 1 | 1 |
| 3 | 0 | 0 |

$Q_2$ is 1 from $t = 1$ to $t = 3$, then 0. None of $D$'s pulses lands on a rising edge.
== FF3: falling edges ==

| Falling edge at | Input D | Next $Q_3$ |
|---|---|---|
| 2 | 0 | 0 |
| 4 | 1 | 1 |

$Q_3$ stays 0 until $t = 4$, then is 1 to the end.
== FF1: the level-triggered latch ==
While $CP = 1$ ($1 \le t < 2$ and $3 \le t < 4$) $Q_1$ follows $D$; while $CP = 0$ it
holds. So $Q_1$ is 1 from 1 to 1.5, 0 until 3.3, 1 from 3.3 to 3.45, 0 again, 1 from 3.7,
and when the clock falls at 4 with $D = 1$ it keeps that 1 to the end; the later changes
of $D$ (clock low) don't reach it.
== Result ==
Three different outputs from one input: the latch copies everything during the pulse
(three changes inside the second pulse: race-through), the edge-triggered parts take one
sample per pulse.
:::

::: plot Example 2, edge-triggered: CP, D, Q2 (rising) and Q3 (falling)
x: 0 .. 5.2
y: -0.5 .. 7.5
xlabel: t
ylabel: CP (top), D, Q2, Q3 (bottom)
CP(t) = 6 + 0.4 (sign(t - 1) - sign(t - 2) + sign(t - 3) - sign(t - 4))
D(t) = 4 + 0.4 (1 - sign(t - 1.5) + sign(t - 2.5) - sign(t - 2.7) + sign(t - 3.3) - sign(t - 3.45) + sign(t - 3.7) - sign(t - 4.2) + sign(t - 4.55) - sign(t - 4.7))
Q2(t) = 2 + 0.4 (sign(t - 1) - sign(t - 3))
Q3(t) = 0.4 (sign(t - 4) + 1)
:::

::: plot Example 2, level-triggered latch: CP, D and Q1
x: 0 .. 5.2
y: -0.5 .. 5.5
xlabel: t
ylabel: CP (top), D, Q1 (bottom)
CP(t) = 4 + 0.4 (sign(t - 1) - sign(t - 2) + sign(t - 3) - sign(t - 4))
D(t) = 2 + 0.4 (1 - sign(t - 1.5) + sign(t - 2.5) - sign(t - 2.7) + sign(t - 3.3) - sign(t - 3.45) + sign(t - 3.7) - sign(t - 4.2) + sign(t - 4.55) - sign(t - 4.7))
Q1(t) = 0.4 (sign(t - 1) - sign(t - 1.5) + sign(t - 3.3) - sign(t - 3.45) + sign(t - 3.7) + 1)
:::

::: callout note Why FF1 is crossed out on the slide
The slide draws FF1 crossed out: an element without the edge triangle is a latch, not
an edge-triggered flip-flop, and isn't what this chapter's D flip-flop means. Its
waveform is drawn anyway to show the difference. The textbook's Example 6.3.1 (p. 164)
and exercise 4 (p. 178) practise the same thing.
:::

::: callout pitfall The value just before the edge
At the edge, use the level $D$ had immediately before it. If $D$ changes exactly on a
clock edge in a question, the intended reading is the value before the change (a real
flip-flop needs $D$ steady for a short setup time before the edge).
:::

## The T flip-flop

A T flip-flop has one input, $T$ ("toggle"). Picture a push-button lamp that only
listens when $T = 1$: then each clock edge flips it; when $T = 0$ the edges are ignored.

::: define T flip-flop | T触发器
An edge-triggered flip-flop with one control input $T$: at the active clock edge it
toggles if $T = 1$ and holds if $T = 0$.
:::

It is exactly a JK flip-flop with $J$ and $K$ joined: $J = K = T$ gives only the "hold"
(00) and "toggle" (11) rows. Putting $J = K = T$ into the JK equation:

$$Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n$$

and that is the exclusive OR of Lesson 8.1.

::: formula T flip-flop characteristic equation | T触发器特性方程
$$Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n = T \oplus Q^n$$
--
T | toggle input: 1 toggles, 0 holds |
Q^n | present state |
Q^{n+1} | next state, after the active edge |
:::

The slides draw it in both kinds (triangle alone for rising edge, bubble and triangle
for falling edge); the table is for the rising-edge one.

| Clock CP | Pin $\overline{R}_d$ | Pin $\overline{S}_d$ | Input T | Next $Q^{n+1}$ | Function |
|---|---|---|---|---|---|
| × | 0 | 1 | × | 0 | asynchronous reset |
| × | 1 | 0 | × | 1 | asynchronous set |
| × | 1 | 1 | × | $Q^n$ | hold (no edge) |
| ↑ | 1 | 1 | 0 | $Q^n$ | hold |
| ↑ | 1 | 1 | 1 | $\overline{Q^n}$ | toggle |

::: graph State diagram of the T flip-flop
at 0: 110, 130
at 1: 250, 130
0 -> 1: T=1
1 -> 0: T=1
0 -> 0: T=0
1 -> 1: T=0
:::

The drive table: a change needs $T = 1$, no change needs $T = 0$, so
$T = Q^n \oplus Q^{n+1}$.

| Present $Q^n$ | Next $Q^{n+1}$ | Input T |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

::: logic The T flip-flop's next state (Q = present state)
inputs: T Q
Qnext = T ⊕ Q
:::

::: example A T flip-flop over six edges
A rising-edge T flip-flop starts at $Q = 0$. At its next six rising edges $T$ is
1, 1, 0, 1, 0, 1. Find $Q$ after each edge.
== Edge by edge ==

| Rising edge | Input T | Present $Q^n$ | Next $Q^{n+1}$ | Action |
|---|---|---|---|---|
| 1 | 1 | 0 | 1 | toggle |
| 2 | 1 | 1 | 0 | toggle |
| 3 | 0 | 0 | 0 | hold |
| 4 | 1 | 0 | 1 | toggle |
| 5 | 0 | 1 | 1 | hold |
| 6 | 1 | 1 | 0 | toggle |
== Check ==
Four toggles (an even number) from 0 bring it back to 0, which agrees with the last row.
:::

## The T′ flip-flop

Tie $T$ to 1 for good and the flip-flop toggles at every active edge. That is the T′
flip-flop ("T prime"); it needs no input besides the clock.

::: define T′ flip-flop | T′触发器
An edge-triggered flip-flop that toggles at every active clock edge; it has no control
input (only the clock and the asynchronous pins).
:::

With $T = 1$, the T equation becomes $Q^{n+1} = 1 \oplus Q^n$, and $1 \oplus A = \overline{A}$
(Lesson 8.1):

::: formula T′ flip-flop characteristic equation | T′触发器特性方程
$$Q^{n+1} = 1 \oplus Q^n = \overline{Q^n}$$
--
Q^n | present state |
Q^{n+1} | next state, after each active edge |
:::

Its state diagram has no labels and no loops, since there is nothing to choose: 0 → 1
→ 0 → … at each edge.

::: graph State diagram of the T′ flip-flop
at 0: 110, 130
at 1: 250, 130
0 -> 1
1 -> 0
:::

Its symbol is the T flip-flop's without the 1T pin: $\overline{R}_d$ → R, $CP$ → C1,
$\overline{S}_d$ → S, outputs $Q$, $\overline{Q}$; again in rising- and falling-edge forms.

::: callout key T versus T′
A T flip-flop toggles **when $T = 1$**; a T′ flip-flop toggles **always**. A T′ is just a
T with $T$ tied to 1, or a JK with $J = K = 1$.
:::

## Frequency division

The T′ flip-flop changes once per clock period, so its output goes through one full
cycle (up and down) every **two** clock periods: its frequency is half the clock's.

::: define Frequency divider | 分频器
A circuit whose output is a square wave at a whole-number fraction of its input
frequency. Each T′ stage divides by 2 (二分频); two stages divide by 4 (四分频).
:::

The slides' circuit: two T flip-flops with both $T$ inputs tied to 1 (so both are T′),
falling-edge triggered. $CP$ drives the first one's clock; the first one's output $Q_0$
drives the second one's clock.

- $Q_0$ toggles at every falling edge of $CP$: one period of $Q_0$ = two of $CP$.
- $Q_1$ toggles at every falling edge of $Q_0$, which comes every second $CP$ edge: one
  period of $Q_1$ = four of $CP$.

::: plot Divide by 2 and by 4: CP, Q0 and Q1 (falling-edge T′ stages)
x: 0 .. 8.5
y: -0.5 .. 5.5
xlabel: t (clock periods)
ylabel: CP (top), Q0, Q1 (bottom)
CP(t) = 4 + 0.8 (floor(2t) - 2 floor(t))
Q0(t) = 2 + 0.8 (floor(t) - 2 floor(t/2))
Q1(t) = 0.8 (floor(t/2) - 2 floor(t/4))
:::

::: formula Output frequency of a chain of T′ stages | 分频
$$f_n = \frac{f_{CP}}{2^n}$$
--
f_{CP} | clock frequency | Hz
n | number of T′ stages in the chain |
f_n | frequency at the last stage's output | Hz
:::

::: explore Frequency divider
slider fCP: 1 .. 1000 = 512 | kHz | clock frequency
slider n: 1 .. 8 = 2 | | number of stages
fn = fCP / 2^n | kHz | output of the last stage
:::

Look at $Q_1Q_0$ as a two-bit number after each falling edge of $CP$: 00, 01, 10, 11,
00, … It counts the clock pulses. That is why the slide calls the divider a
**counter** (计数器), the subject of the next unit.

::: example Dividing an 8 kHz clock
Three falling-edge T′ flip-flops are chained as above, all starting at 0, with an 8 kHz
clock. (a) What frequency comes out of each stage? (b) What is $Q_1Q_0$ (the first two
stages) after 5 clock pulses?
== (a) Frequencies ==
$f_1 = 8/2 = 4$ kHz, $f_2 = 8/4 = 2$ kHz, $f_3 = 8/8 = 1$ kHz.
== (b) State after 5 pulses ==
$Q_0$ toggles at each of the 5 falling edges: an odd number of toggles from 0, so
$Q_0 = 1$. $Q_0$ falls (1 → 0) at the 2nd and 4th edges, so $Q_1$ toggles twice: $Q_1 = 0$.
$Q_1Q_0 = 01$, which is $5 \bmod 4 = 1$: the pair counts pulses modulo 4.
:::

::: callout pitfall Which edge clocks the second stage?
The second stage is clocked by $Q_0$, not by $CP$. A falling-edge stage changes when
$Q_0$ goes 1 → 0; with rising-edge stages it would change when $Q_0$ goes 0 → 1, and the
pair would count down instead (still dividing by 4).
:::

## The four flip-flops side by side

::: callout summary Edge-triggered flip-flops at a glance

| Type | Inputs | Characteristic equation | Can do |
|---|---|---|---|
| JK | J, K | $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$ | hold, reset, set, toggle |
| D | D | $Q^{n+1} = D$ | reset, set |
| T | T | $Q^{n+1} = T \oplus Q^n$ | hold, toggle |
| T′ | none | $Q^{n+1} = \overline{Q^n}$ | toggle |
:::

::: callout exam Describe each one every way
The final exam's scope asks for the edge D, JK, T and T′ flip-flops described by
characteristic equation, function (state) table, state diagram and timing diagram. For
each type, practise writing all four from memory, and drawing $Q$ for a given $CP$ and
input with the edge marked (rising or falling, from the symbol).
:::

::: cards D, T and T′ flip-flops
D flip-flop (D触发器) :: At the active edge Q takes the value of D; otherwise it holds.
D characteristic equation :: $Q^{n+1} = D$
D drive table :: The input needed is the next state itself: $D = Q^{n+1}$.
T flip-flop (T触发器) :: Toggles at the active edge when T = 1, holds when T = 0.
T characteristic equation :: $Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n = T \oplus Q^n$
T drive table :: $T = Q^n \oplus Q^{n+1}$: T = 1 exactly when the state must change.
T′ flip-flop (T′触发器) :: Toggles at every active edge; no control input.
T′ characteristic equation :: $Q^{n+1} = \overline{Q^n}$
T from JK :: Join J and K: J = K = T.
Level-triggered latch vs edge-triggered D :: The latch follows D for the whole time CP is active; the edge-triggered one samples D once, at the edge.
One T′ stage (二分频) :: Divides the clock frequency by 2.
Chain of n T′ stages, output frequency :: $f_n = f_{CP}/2^n$
Two chained T′ stages, $Q_1Q_0$ :: Counts the clock pulses 00, 01, 10, 11, 00, … (a counter).
:::

::: quiz D, T and T′ flip-flops
? A falling-edge D flip-flop has $Q = 1$. At the next falling edge $D = 0$. What is $Q$ after the edge?
answer: 0
tolerance: 0
> $Q^{n+1} = D = 0$, whatever the present state was.

? A rising-edge D flip-flop: while CP is high, $D$ goes 0 → 1 → 0, and it is 0 at the next rising edge. $Q$ was 0. What is $Q$ after that rising edge?
answer: 0
tolerance: 0
> Only the value at the rising edge counts, and that is 0. The pulse while CP was high
> is ignored. (A level-triggered latch would have copied it.)

? Write the T flip-flop's next state in terms of $T$ and $Q$ (= $Q^n$).
logic: T ⊕ Q
variables: T, Q
> $Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n = T \oplus Q^n$: toggle when $T = 1$, hold when
> $T = 0$.

? Which flip-flop's state diagram has two arrows and no loops?
- [ ] D
- [ ] T
- [x] T′
- [ ] JK
> The T′ flip-flop toggles at every edge, so it never stays in a state: 0 → 1 and 1 → 0
> only, with no labels since it has no inputs to choose.

? A T flip-flop is at $Q = 1$. In the drive table, what must $T$ be for $Q^{n+1} = 0$?
answer: 1
tolerance: 0
> The state must change, and only $T = 1$ changes it: $T = Q^n \oplus Q^{n+1} = 1 \oplus 0 = 1$.

? A rising-edge T flip-flop starts at 0. At four rising edges $T$ = 1, 0, 1, 1. What is $Q$ at the end?
answer: 1
tolerance: 0
> Edges: toggle → 1, hold → 1, toggle → 0, toggle → 1. Three toggles (odd) from 0 end at 1.

? A 1 MHz clock drives a chain of four T′ flip-flops. What frequency comes out of the last one?
answer: 62.5 kHz
tolerance: 1%
> $f_4 = f_{CP}/2^4 = 1\ \text{MHz}/16 = 62.5$ kHz.

? Two falling-edge T′ stages in a chain (CP into the first, $Q_0$ into the second), both starting at 0. After 6 clock pulses, what is $Q_1Q_0$ as a decimal number?
answer: 2
tolerance: 0
> $Q_0$ toggles 6 times: back to 0. $Q_0$ falls at the 2nd, 4th and 6th edges, so $Q_1$
> toggles 3 times: 1. $Q_1Q_0 = 10 = 2 = 6 \bmod 4$.

? How many T′ stages are needed to divide a frequency by 32?
answer: 5
tolerance: 0
> Each stage halves the frequency, so $2^n = 32$ gives $n = 5$.
:::

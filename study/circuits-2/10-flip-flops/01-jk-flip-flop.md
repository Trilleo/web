---
title: Flip-flops and the edge-triggered JK
zh: 触发器与边沿JK触发器
summary: What a flip-flop is (a one-bit memory with a present and a next state), how one is built from the basic RS latch up to edge triggering with asynchronous set and reset, and the edge-triggered JK flip-flop described every way - function table, characteristic equation, state diagram, drive table and timing diagram.
source: 第6章 触发器 6.0–6.1
---

Every circuit in the last two units forgot everything the moment its inputs changed:
an adder adds what it sees *now*. A counter, a register or a keyboard buffer has to
remember. The flip-flop is the smallest part that can: it stores one bit and keeps it
until told to change. This lesson shows how one is built from two gates, why real
flip-flops only act on a clock *edge*, and then describes the most flexible kind, the
JK flip-flop, in all the ways an exam asks for. The next lesson does the same for the
D, T and T′ flip-flops, and the one after turns one kind into another.

## What a flip-flop is

Think of a light switch and a doorbell button. The doorbell rings only while you
press it: its output follows its input, like a gate. The light switch stays where you
left it: press "on" once and the light stays on after you take your hand away. A
flip-flop is the light switch of digital circuits.

Lesson 9.1 called a circuit whose output depends on its past a **sequential logic
circuit** (时序逻辑电路). Flip-flops are what give such circuits their past.

::: define Flip-flop | 触发器
A device that stores one binary digit (one bit). It has two stable states, 0 and 1;
under an input signal it can be switched from one to the other, and with no input
signal it keeps its state. It is the basic unit of sequential circuits.
:::

The state is read at the output $Q$ (with its complement $\overline{Q}$ on a second
output). Because a flip-flop's next output depends on what it holds now, we need names
for "before" and "after" a change.

::: define Present state and next state | 现态与次态
The **present state** $Q^n$ is the flip-flop's state before an input acts (before the
clock edge). The **next state** $Q^{n+1}$ is its state after the input has acted.
:::

The superscript is not a power: $n$ just counts clock edges. A flip-flop can do four
things to its state, and every kind of flip-flop is some mix of them:

| Function | Chinese | What happens |
|---|---|---|
| Reset (set to 0) | 置0 | $Q^{n+1} = 0$ whatever $Q^n$ was |
| Set (set to 1) | 置1 | $Q^{n+1} = 1$ |
| Toggle | 翻转 | $Q^{n+1} = \overline{Q^n}$ (0 becomes 1, 1 becomes 0) |
| Hold | 保持 | $Q^{n+1} = Q^n$ (nothing changes) |

By their logic function, flip-flops are sorted into **SR (RS), D, JK, T and T′**
flip-flops. This unit is about the last four, all edge-triggered.

::: define Logic function of a flip-flop | 触发器的逻辑功能
The relation between the next state $Q^{n+1}$, the present state $Q^n$ and the input
signals.
:::

::: callout key Five ways to describe one flip-flop
The same logic function can be written as a **characteristic (function) table**
(特性表), a **next-state Karnaugh map** (卡诺图), a **characteristic equation**
(特性方程), a **state diagram** (状态转换图) and a **timing (waveform) diagram**
(波形图、时序图). They all say the same thing; you should be able to go from any one to
any other. A sixth, the **drive table** (驱动表), turns the question round: which inputs
make a given change happen?
:::

## How flip-flops are built

The slides build up a flip-flop in four steps. You don't need to design one, but each
step explains a feature of the finished part: why there are two kinds of input, and why
the clock's *edge* matters.

### The basic RS flip-flop

Take two NAND gates, A and B, and feed each one's output into the other's input. Gate
A's free input is $\overline{R}_d$ and its output is $\overline{Q}$; gate B's free input is
$\overline{S}_d$ and its output is $Q$:

$$Q = \overline{\overline{S}_d \cdot \overline{Q}}, \qquad \overline{Q} = \overline{\overline{R}_d \cdot Q}$$

Why does this remember? Recall from Lesson 8.1 that a NAND with one input at 1 is just
an inverter. With both free inputs at 1, the two gates are two inverters in a ring: if
$Q = 1$, gate A outputs $\overline{Q} = 0$, which makes gate B output $Q = 1$ again. The
loop holds itself up, and $Q = 0$ holds itself up just as well. That feedback loop is
the memory.

A NAND with an input at 0 outputs 1 whatever else it sees. So pulling $\overline{R}_d$ to 0
forces $\overline{Q} = 1$, hence $Q = 0$: a reset. Pulling $\overline{S}_d$ to 0 forces
$Q = 1$: a set. The inputs act when they are **low**, which is what the bars and the
small circles (bubbles) on the symbol mean.

::: define Basic RS flip-flop | 基本RS触发器
Two cross-coupled NAND gates with active-low inputs $\overline{R}_d$ (reset) and
$\overline{S}_d$ (set). Its function table:

| Input $\overline{R}_d$ | Input $\overline{S}_d$ | Next $Q^{n+1}$ | Next $\overline{Q}^{n+1}$ | Function |
|---|---|---|---|---|
| 0 | 1 | 0 | 1 | reset (置0) |
| 1 | 0 | 1 | 0 | set (置1) |
| 1 | 1 | $Q^n$ | $\overline{Q^n}$ | hold (保持) |
| 0 | 0 | 1* | 1* | not allowed (不确定) |
:::

The last row is the trouble. With both inputs low both gates output 1, so $Q$ and
$\overline{Q}$ are both 1: they are no longer complements. Worse, when both inputs go back
to 1 together, whichever gate is a little faster wins, and the final state can't be
predicted. That input is simply not used.

::: example A sequence of inputs on the basic RS flip-flop
The flip-flop starts with $Q = 0$. The inputs $\overline{R}_d\,\overline{S}_d$ take the
values 11, 10, 11, 01, 11 in turn. Find $Q$ after each.
== Step by step ==
- 11: hold, $Q = 0$.
- 10: $\overline{S}_d = 0$ sets, $Q = 1$.
- 11: hold, $Q$ stays 1. The set pulse is gone but the bit is remembered.
- 01: $\overline{R}_d = 0$ resets, $Q = 0$.
- 11: hold, $Q = 0$.
== Result ==
$Q$ = 0, 1, 1, 0, 0. The output changes the moment an input goes low; there is no
clock yet.
:::

::: callout pitfall Active low means 0 does the work
"$\overline{R}_d = 0$" is the reset command, not "reset off". Read a bar over a name, or a
bubble on a pin, as "acts when 0".
:::

### The clocked RS flip-flop

A big circuit wants all its flip-flops to change at the same moment, in step with a
clock pulse $CP$ (时钟脉冲). So two more NAND gates, C and D, are put in front of the
latch: C takes $R$ and $CP$, D takes $S$ and $CP$, and their outputs drive the latch's
active-low inputs.

- While $CP = 0$, gates C and D output 1 whatever $R$ and $S$ are: the latch holds.
- While $CP = 1$, C outputs $\overline{R}$ and D outputs $\overline{S}$: now $R = 1$ resets
  and $S = 1$ sets (these inputs are active **high**), and $R = S = 0$ holds. $R = S = 1$
  would give the forbidden latch input, so it is still not allowed.

The slides also wire the latch's own inputs out as $\overline{R}_d$ and $\overline{S}_d$
(each also goes to the opposite clock gate, so the clock can't fight it). They reach
the latch directly, so they work at any time, clock or no clock.

::: define Asynchronous set and reset | 异步置1、置0端
The inputs $\overline{S}_d$ (asynchronous set) and $\overline{R}_d$ (asynchronous reset) act
directly on the flip-flop, without waiting for the clock. They are active low. In
normal operation both are held high (1), so that the clock and the other inputs are in
charge.
:::

In contrast, a change made by $R$, $S$ (or $D$, $J$, $K$, $T$ later) only when the clock
allows is called **synchronous** (同步置0, 同步置1). The symbol of a clocked RS
flip-flop has pins $\overline{R}_d$ (bubble) → R, $S$ → 1S, $CP$ → C1, $R$ → 1R,
$\overline{S}_d$ (bubble) → S, and outputs $Q$ and $\overline{Q}$ (bubble).

### The D latch: level triggering

The forbidden $R = S = 1$ is a nuisance. Feed one data input $D$ straight to $S$ and
through an inverter to $R$ ($S = D$, $R = \overline{D}$): $R$ and $S$ are now always
opposite, so the forbidden input can't happen.

| Clock CP | Pin $\overline{R}_d$ | Pin $\overline{S}_d$ | Input D | Next $Q^{n+1}$ | Function |
|---|---|---|---|---|---|
| × | 0 | 1 | × | 0 | asynchronous reset |
| × | 1 | 0 | × | 1 | asynchronous set |
| 0 | 1 | 1 | × | $Q^n$ | hold |
| 1 | 1 | 1 | 0 | 0 | synchronous reset |
| 1 | 1 | 1 | 1 | 1 | synchronous set |

(× means "either value": it doesn't matter.) While $CP = 1$ the output simply follows
$D$; when $CP$ goes to 0 it keeps the last value. This acts on the clock's *level*
(电平触发), and its symbol's C1 pin has no triangle.

The flaw: during the whole time $CP = 1$ the output is "transparent". If $D$ wiggles,
$Q$ wiggles. Worse, if $Q$ is fed back to the input (as in a counter), one clock pulse
can make the output change again and again.

::: define Race-through | 空翻
More than one change of a flip-flop's state during a single clock pulse, which happens
with level-triggered flip-flops while the clock is active.
:::

### The edge-triggered D flip-flop: master and slave

The cure is like an airlock with two doors that are never open at once. Put two D
latches in series: the **master** (主) is clocked by $CP$, the **slave** (从) by
$\overline{CP}$ (through an inverter). The master's output $Q_主$ is the slave's input.

- While $CP = 1$, the master's output follows $D$, but the slave's clock is 0, so the
  output $Q$ holds.
- At the instant $CP$ falls from 1 to 0, the master freezes the value $D$ had at that
  moment and keeps it while $CP = 0$. Now the slave's clock is 1, and it copies the
  frozen $Q_主$ to $Q$.

So $Q$ can change only once per clock pulse, at the falling edge, and only $D$'s value
at that edge counts.

::: define Edge triggering | 边沿触发
A flip-flop is edge-triggered when its state can change only at a transition of the
clock: the falling edge ↓ (下降沿, 1 → 0) or the rising edge ↑ (上升沿, 0 → 1). The inputs
matter only at that instant; at all other times the flip-flop holds.
:::

::: law Reading the clock pin on a symbol | 时钟端的符号
On the C1 pin, a **triangle** (>) means edge-triggered; a **bubble plus triangle** means
falling-edge triggered (下降沿触发); a triangle alone means rising-edge triggered
(上升沿触发); no triangle means level-triggered.
:::

The falling-edge D flip-flop's table is the latch's with "1" in the clock column
replaced by ↓:

| Clock CP | Pin $\overline{R}_d$ | Pin $\overline{S}_d$ | Input D | Next $Q^{n+1}$ | Function |
|---|---|---|---|---|---|
| × | 0 | 1 | × | 0 | asynchronous reset |
| × | 1 | 0 | × | 1 | asynchronous set |
| 0 | 1 | 1 | × | $Q^n$ | hold |
| ↓ | 1 | 1 | 0 | 0 | synchronous reset |
| ↓ | 1 | 1 | 1 | 1 | synchronous set |

::: callout summary Three ways a flip-flop can act
The slides call these the three action characteristics (动作特点): the **basic** RS
flip-flop reacts the moment an input changes; a **level-triggered** (clocked)
flip-flop follows its inputs for the whole time the clock is active, and can race
through; an **edge-triggered** flip-flop changes at most once per pulse, at one edge,
using the inputs at that instant. All flip-flops in the rest of this unit are
edge-triggered.
:::

## The edge-triggered JK flip-flop

The RS flip-flop wastes one input combination. The JK flip-flop puts it to use: $J$
plays the part of "set", $K$ of "reset", and asking for both at once means **toggle**.
That makes it the flip-flop that can do all four functions.

### Symbol and pins

The symbol is a box with, on the left from top to bottom, $\overline{R}_d$ (bubble) → R,
$J$ → 1J, $CP$ → C1, $K$ → 1K, $\overline{S}_d$ (bubble) → S, and on the right the
outputs $Q$ and $\overline{Q}$ (bubble). The JK flip-flop comes in both flavours: bubble
and triangle on C1 for falling-edge, triangle alone for rising-edge.

| Pin | Name | Role |
|---|---|---|
| J, K | control inputs (控制输入) | decide what happens at the clock edge |
| CP | clock input (时钟输入) | its active edge is when the state changes |
| Q, Q̄ | state outputs (状态输出) | the stored bit and its complement |
| $\overline{R}_d$ | asynchronous reset | sets $Q = 0$ at once, active low |
| $\overline{S}_d$ | asynchronous set | sets $Q = 1$ at once, active low |

::: callout exam The asynchronous pins
$\overline{S}_D$ and $\overline{R}_D$ are not controlled by the clock and are active low;
**while the flip-flop is working they must be connected to a high level** (触发器工作时
$\overline{S}_D$、$\overline{R}_D$应接高电平). Many timing questions just say "R and S tied to 1".
:::

### The function table

For the falling-edge JK flip-flop:

| Clock CP | Pin $\overline{R}_D$ | Pin $\overline{S}_D$ | Input J | Input K | Next $Q^{n+1}$ | Function |
|---|---|---|---|---|---|---|
| × | 0 | 1 | × | × | 0 | asynchronous reset |
| × | 1 | 0 | × | × | 1 | asynchronous set |
| × | 1 | 1 | × | × | $Q^n$ | hold (no edge) |
| ↓ | 1 | 1 | 0 | 0 | $Q^n$ | hold |
| ↓ | 1 | 1 | 0 | 1 | 0 | synchronous reset |
| ↓ | 1 | 1 | 1 | 0 | 1 | synchronous set |
| ↓ | 1 | 1 | 1 | 1 | $\overline{Q^n}$ | toggle |

A short way to remember the clocked rows: **J = K: hold or toggle** (00 hold, 11
toggle); **J ≠ K: Q copies J** (10 sets to 1, 01 resets to 0).

::: define Characteristic table | 特性表
A flip-flop's function table (功能表) written for the clocked inputs: for every input
combination and present state $Q^n$, the next state $Q^{n+1}$.
:::

### The next-state map and the characteristic equation

To get a formula, list $Q^{n+1}$ for every combination of $J$, $K$ and $Q^n$ (eight
rows), and put it on a Karnaugh map as in Lesson 8.4:

| Input J | Input K | Present $Q^n$ | Next $Q^{n+1}$ | why |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | hold |
| 0 | 0 | 1 | 1 | hold |
| 0 | 1 | 0 | 0 | reset |
| 0 | 1 | 1 | 0 | reset |
| 1 | 0 | 0 | 1 | set |
| 1 | 0 | 1 | 1 | set |
| 1 | 1 | 0 | 1 | toggle |
| 1 | 1 | 1 | 0 | toggle |

On the map below $Q$ stands for $Q^n$; the rows are $J$, the columns $KQ^n$, as on the
slide. The 1s are minterms 1, 4, 5 and 6.

::: kmap Qn+1
vars: J K Q
ones: 1 4 5 6
group: J Q'
group: K' Q
:::

The column $KQ^n = 01$ gives $\overline{K}Q^n$ (when $K = 0$ a stored 1 survives), and the
two cells of row $J = 1$ at the map's left and right edges (adjacent, since the map wraps)
give $J\overline{Q^n}$ (when $J = 1$ a stored 0 becomes 1).

::: define Characteristic equation | 特性方程
The logic expression that gives a flip-flop's next state $Q^{n+1}$ as a function of its
inputs and its present state $Q^n$. It holds at the active clock edge.
:::

::: formula JK flip-flop characteristic equation | JK触发器特性方程
$$Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$$
--
Q^n | present state, before the active clock edge |
Q^{n+1} | next state, after the edge |
J | control input that sets (and toggles a 0) |
K | control input that resets (and toggles a 1) |
:::

Read it in words: the next state is 1 if it was 0 and $J$ says go up, or if it was 1 and
$K$ doesn't say come down. Try every case below: set $Q$ to the present state, choose
$J$ and $K$, and read the next state.

::: logic Next state of a JK flip-flop (Q = present state)
inputs: J K Q
Qnext = J Q' + K' Q
:::

### The state diagram

::: define State diagram | 状态转换图
A drawing with one circle per state and an arrow for every possible change, each arrow
labelled with the input values that cause it (a loop for staying in the same state).
:::

A flip-flop has two states, so two circles. From state 0, $J = 1$ moves to 1 whatever
$K$ is (set or toggle), and $J = 0$ stays in 0 whatever $K$ is (hold or reset). From
state 1, $K = 1$ moves to 0 (reset or toggle), and $K = 0$ stays (hold or set).

::: graph State diagram of the JK flip-flop
at 0: 110, 130
at 1: 250, 130
0 -> 1: J=1 K=×
1 -> 0: J=× K=1
0 -> 0: J=0 K=×
1 -> 1: J=× K=0
:::

### The drive table

The characteristic table answers "given the inputs, what happens?". When *designing*
a circuit (the counters of the next unit, or the conversions in Lesson 10.3) you know
the change you want and need the inputs. Read the state diagram backwards:

::: define Drive table | 驱动表
Also called the excitation table (激励表): for each change $Q^n \to Q^{n+1}$, the input
values a flip-flop needs to make that change happen.
:::

| Present $Q^n$ | Next $Q^{n+1}$ | Input J | Input K |
|---|---|---|---|
| 0 | 0 | 0 | × |
| 0 | 1 | 1 | × |
| 1 | 0 | × | 1 |
| 1 | 1 | × | 0 |

Each change can be done two ways, which is where the ×s come from. To go 0 → 1 you can
**set** ($J = 1$, $K = 0$) or **toggle** ($J = 1$, $K = 1$): $J$ must be 1 and $K$ doesn't
matter.

::: callout pitfall Don't mix up the two tables
The characteristic table goes inputs → next state; the drive table goes change →
inputs. A drive table has exactly four rows (the four changes 0→0, 0→1, 1→0, 1→1), and
its ×s are free choices you can use when simplifying.
:::

## Timing diagrams

::: define Timing diagram | 时序图（波形图）
A drawing of the clock, the inputs and the outputs against time, one waveform under
another, so that the state at each moment can be read off.
:::

To draw $Q$ by hand: mark every **active** edge of the clock with a dashed line; at
each one read the inputs **just at that edge**, apply the function table to the state
just before it, and draw $Q$ flat until the next active edge. Changes of $J$ and $K$
between edges are ignored completely.

::: example Two JK flip-flops on the same inputs (例1)
FF1 is falling-edge triggered (output $Q_1$), FF2 is rising-edge triggered (output
$Q_2$); both get the same $CP$, $J$ and $K$, with $\overline{R}_d = \overline{S}_d = 1$. Both
start at $Q = 0$. The clock has four pulses: rising edges at $t = 1, 3, 5, 7$ and
falling edges at $t = 2, 4, 6, 8$. $J$ is high from $t = 1.2$ to $3.2$ and again for a
short pulse inside the third clock pulse ($5.15$ to $5.5$); $K$ has a short pulse
inside the second clock pulse ($3.4$ to $3.6$) and is high from $5.1$ to $6.6$. Draw
$Q_1$ and $Q_2$.
== FF1: the falling edges ==

| Falling edge at | Input J | Input K | Present $Q^n$ | Next $Q^{n+1}$ | Action |
|---|---|---|---|---|---|
| 2 | 1 | 0 | 0 | 1 | set |
| 4 | 0 | 0 | 1 | 1 | hold |
| 6 | 0 | 1 | 1 | 0 | reset |
| 8 | 0 | 0 | 0 | 0 | hold |

$K$'s pulse at 3.4–3.6 and $J$'s at 5.15–5.5 fall between falling edges, so FF1 never
sees them.
== FF2: the rising edges ==

| Rising edge at | Input J | Input K | Present $Q^n$ | Next $Q^{n+1}$ | Action |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | hold ($J$ rises just after the edge) |
| 3 | 1 | 0 | 0 | 1 | set |
| 5 | 0 | 0 | 1 | 1 | hold |
| 7 | 0 | 0 | 1 | 1 | hold |
== Result ==
$Q_1$ is high from $t = 2$ to $t = 6$; $Q_2$ is high from $t = 3$ to the end. The same
inputs give different outputs: the edge decides which instants count.
:::

The two plots below draw the example (each waveform is 0 or 1, drawn on its own
baseline, one above the other, as on the slide).

::: plot Example 1, FF1 (falling edge): CP, J, K and Q1
x: 0 .. 9
y: -0.5 .. 7.5
xlabel: t
ylabel: CP (top), J, K, Q1 (bottom)
CP(t) = 6 + 0.8 (floor(t) - 2 floor(t/2))
J(t) = 4 + 0.4 (sign(t - 1.2) - sign(t - 3.2) + sign(t - 5.15) - sign(t - 5.5))
K(t) = 2 + 0.4 (sign(t - 3.4) - sign(t - 3.6) + sign(t - 5.1) - sign(t - 6.6))
Q1(t) = 0.4 (sign(t - 2) - sign(t - 6))
:::

::: plot Example 1, FF2 (rising edge): CP, J, K and Q2
x: 0 .. 9
y: -0.5 .. 7.5
xlabel: t
ylabel: CP (top), J, K, Q2 (bottom)
CP(t) = 6 + 0.8 (floor(t) - 2 floor(t/2))
J(t) = 4 + 0.4 (sign(t - 1.2) - sign(t - 3.2) + sign(t - 5.15) - sign(t - 5.5))
K(t) = 2 + 0.4 (sign(t - 3.4) - sign(t - 3.6) + sign(t - 5.1) - sign(t - 6.6))
Q2(t) = 0.4 (sign(t - 3) + 1)
:::

::: callout pitfall Read the inputs at the edge, not over the pulse
Between $t = 5.15$ and $5.5$ both $J$ and $K$ are 1 while the clock is high. A
level-triggered flip-flop would toggle there; an edge-triggered one doesn't care, because
no active edge happens during that time. Only the values on the dashed lines matter.
:::

::: callout exam What flip-flop questions look like
The final exam asks you to describe edge-triggered JK, D, T and T′ flip-flops every way:
characteristic equation, function (state) table, state diagram and timing diagram.
Expect "given CP, J, K and the initial state, draw Q" for a falling- or rising-edge
part: make the edge table above first, then draw. Also know what $\overline{R}_d$ and
$\overline{S}_d$ do and that they're tied high in normal use.
:::

::: cards Flip-flops and the JK flip-flop
Flip-flop (触发器) :: A one-bit memory with two stable states; it changes under an input signal and keeps its state without one. The basic unit of sequential circuits.
Present state and next state (现态与次态) :: $Q^n$ is the state before the clock edge, $Q^{n+1}$ the state after it.
The four functions of a flip-flop :: Reset (置0), set (置1), toggle (翻转), hold (保持).
Basic RS flip-flop: forbidden input :: $\overline{R}_d = \overline{S}_d = 0$: both outputs 1, and the state is unpredictable when both return to 1.
Asynchronous pins $\overline{R}_d$, $\overline{S}_d$ :: Reset / set at once, without the clock; active low; tied high in normal operation.
Race-through (空翻) :: Several changes of state during one clock pulse, a fault of level-triggered flip-flops.
Master-slave D flip-flop: how it triggers :: The master follows D while CP = 1; at CP's fall it freezes and the slave copies it, so Q changes only at the falling edge.
Clock pin with bubble and triangle :: Falling-edge triggered (下降沿触发). Triangle alone: rising edge. No triangle: level-triggered.
JK characteristic equation :: $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$
JK with J = K = 1 at the edge :: Toggle: $Q^{n+1} = \overline{Q^n}$.
JK with J ≠ K at the edge :: Q copies J (J = 1, K = 0 sets; J = 0, K = 1 resets).
JK drive table, change 0 → 1 :: J = 1, K = × (set or toggle).
JK drive table, change 1 → 0 :: J = ×, K = 1 (reset or toggle).
Five ways to describe a flip-flop :: Characteristic table, Karnaugh map, characteristic equation, state diagram, timing diagram.
:::

::: quiz Flip-flops and the JK flip-flop
? The output state of a flip-flop depends on … (in-class question 14-019) {#ff-depends}
- [ ] the polarity of the power supply
- [ ] the input signal only
- [ ] the circuit's original state only
- [x] the input signal and the circuit's original state
> A flip-flop is a sequential element: $Q^{n+1}$ is a function of the inputs **and** of
> $Q^n$, as the characteristic equation $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$ shows.

? A basic RS flip-flop (NAND, active low) holds $Q = 1$. Its inputs become $\overline{R}_d = 0$, $\overline{S}_d = 1$. What is $Q$ now?
answer: 0
tolerance: 0
> $\overline{R}_d = 0$ is the active-low reset: it forces $\overline{Q} = 1$, then gate B
> sees $\overline{S}_d = 1$ and $\overline{Q} = 1$, so $Q = \overline{1 \cdot 1} = 0$.

? Which input of a NAND basic RS flip-flop must never be applied?
- [x] $\overline{R}_d = \overline{S}_d = 0$
- [ ] $\overline{R}_d = \overline{S}_d = 1$
- [ ] $\overline{R}_d = 0$, $\overline{S}_d = 1$
> Both low forces both outputs to 1 (they stop being complements), and when both return
> to 1 together the final state can't be predicted. Both high is the ordinary hold.

? Write the JK flip-flop's next state $Q^{n+1}$ in terms of $J$, $K$ and $Q$ (= $Q^n$).
logic: J Q' + K' Q
variables: J, K, Q
> From the next-state map: the group $J\overline{Q^n}$ (a 0 that is set or toggled) and the
> group $\overline{K}Q^n$ (a 1 that is not reset or toggled).

? The logic circuit: an OR gate takes $A$ and the flip-flop's own $Q$, and its output drives both $J$ and $K$ of a falling-edge JK flip-flop ($S_D$ tied to 1). With $A = 1$, after a clock pulse the flip-flop … (in-class question 14-014) {#or-feedback}
- [ ] is set to 1
- [ ] is reset to 0
- [x] toggles
- [ ] holds
> With $A = 1$ the OR gate outputs 1 whatever $Q$ is, so $J = K = 1$, and a JK
> flip-flop with $J = K = 1$ toggles at each active edge.

? In the JK drive table, which inputs make the change $Q^n = 1 \to Q^{n+1} = 1$?
- [x] $J = \times$, $K = 0$
- [ ] $J = 1$, $K = \times$
- [ ] $J = 0$, $K = 0$ only
> A stored 1 stays if the flip-flop holds ($J = 0$, $K = 0$) or sets ($J = 1$, $K = 0$):
> $K$ must be 0, $J$ is free.

? A falling-edge JK flip-flop has $Q = 0$. At the next falling edge $J = 1$ and $K = 1$; at the one after, $J = 0$ and $K = 0$; at the third, $J = 0$ and $K = 1$. What is $Q$ after the third edge?
answer: 0
tolerance: 0
> Edge 1: toggle, $0 \to 1$. Edge 2: hold, stays 1. Edge 3: reset, $1 \to 0$.

? A rising-edge JK flip-flop has $\overline{R}_d = 0$ while the clock rises with $J = 1$, $K = 0$. What is $Q$?
answer: 0
tolerance: 0
> The asynchronous reset is active (low) and overrides the clock and $J$, $K$: $Q = 0$.
> That's why $\overline{R}_d$ and $\overline{S}_d$ are tied high in normal operation.

? A flip-flop symbol's clock pin has a triangle but no bubble. It is …
- [ ] level-triggered
- [x] rising-edge triggered
- [ ] falling-edge triggered
> The triangle means edge-triggered; a bubble would make it the falling edge, so without
> one it acts on the rising edge.
:::

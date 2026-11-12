---
title: Counting to any number
zh: 任意进制计数器
summary: Making an M-ary counter from a counter chip by the reset (clear) method and the preset (load) method; why an asynchronous clear feeds back state M but a synchronous clear or load feeds back the last state, and the brief glitch state; worked designs on the 74HC90 and 74HC160–163, the ÷200 and modulo-91 two-chip examples, and analysing a counter that is already wired.
source: 第7章 时序逻辑电路 7.4 计数器进制的改变 (teacher's slides 31–39)
---

Chips count to 10 or 16, but a clock needs 60 seconds and 24 hours, a dice needs 6. The
trick is to let the chip count normally and, when it reaches a chosen state, force it
back to the start, by clearing it or by loading a number into it. Designing and analysing
such counters is the core of this chapter's exam questions, and almost every mistake comes
from one detail: whether the clear or load acts at once or waits for the next clock edge.
This lesson makes that detail automatic.

## The idea: skip states

An $N$-ary chip goes through $N$ states. To make an $M$-ary counter with $M < N$, we make
it skip $N - M$ of them. A gate watches the outputs; when they show a chosen
**feedback state** {{zh 反馈状态}}, the gate drives the clear or load input and the
counter jumps back to its starting state.

::: define Reset method | 清零法（置零法）
Making an $M$-ary counter by decoding a state with a gate and feeding it to the clear
input, so the counter returns to 0 after $M$ states.
:::

::: define Preset method | 置数法
Making an $M$-ary counter by decoding a state and feeding it to the load input, so the
counter jumps to the number on its data inputs (the preset) and cycles through $M$ states.
:::

If $M$ is larger than one chip can count, cascade chips first (previous lesson) to get
$N \ge M$, then cut the big counter down the same way.

## The reset method

### Asynchronous clear: feed back state M

Take the 74HC161 (asynchronous clear) and aim for $M = 12$, the states 0000 to 1011. The
clear acts **the moment** $\overline{CR}$ goes low. So decode the first state that must
*not* stay, $M = 12 = 1100$:

$$\overline{CR} = \overline{Q_DQ_C}$$

What happens at the 12th pulse: the counter steps 1011 → 1100; the NAND sees $Q_D = Q_C = 1$
and pulls $\overline{CR}$ low; the counter clears to 0000 within nanoseconds; with
$Q_D = Q_C = 0$ the NAND output goes high again. 1100 exists only for that instant.

| Pulse | Outputs $Q_DQ_CQ_BQ_A$ | Clear $\overline{CR}$ |
|---|---|---|
| 0 to 11 | 0000 up to 1011 | 1 |
| 12 | 1100 for a few ns, then 0000 | a short 0 pulse |
| 13 | 0001 | 1 |

::: graph Asynchronous clear, M = 12 on a 74HC161 (1100 is the brief glitch state)
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
at 1101: 130, 130
at 1110: 200, 130
at 1111: 260, 90
0000 -> 0001, 0001 -> 0010, 0010 -> 0011, 0011 -> 0100, 0100 -> 0101, 0101 -> 0110
0110 -> 0111, 0111 -> 1000, 1000 -> 1001, 1001 -> 1010, 1010 -> 1011
1011 -> 1100: pulse 12, 1100 -> 0000: at once
1101 -> 0000, 1110 -> 0000, 1111 -> 0000
:::

The invalid states 1101, 1110, 1111 all have $Q_DQ_C = 11$, so they also clear at once:
the counter self-starts.

::: define Glitch state | 暂态（过渡状态）
With an asynchronous clear, the feedback state $S_M$ appears for only a few nanoseconds
before the clear wipes it. It is not one of the counter's states; it is a short false
output (a glitch) that later logic might still react to.
:::

::: callout warning Why the slide doesn't recommend the asynchronous clear
"此状态暂短出现，为无效状态，一般要求严格电路不建议用此方法实现." Two problems: the
outputs show a false state (1100) briefly, and the clear pulse is very short. It ends as
soon as *one* of $Q_D$, $Q_C$ resets, and if the flip-flops are not equally fast another
one may not have reset yet, so the counter can fail to reach 0000. For careful designs
use a synchronous clear or the load method.
:::

::: callout note The slide's state diagram
The slide draws 1011 → 1100 dotted, a dotted arrow 1100 → 0000, and also a solid arrow
straight from 1011 to 0000. They describe the same event: after 1011 the counter passes
through 1100 for an instant and lands on 0000, so 1011 → 0000 is the **effective**
transition and 1100 is not counted.
:::

### Synchronous clear: feed back state M − 1

On the 74HC163 the clear waits for the next rising edge. Decoding 1100 would be too late:
the counter would sit in 1100 for a whole clock period, giving 13 states. So decode the
**last** state we want, $M - 1 = 11 = 1011$:

$$\overline{CR} = \overline{Q_DQ_BQ_A}$$

At the 11th pulse the counter reaches 1011; $\overline{CR}$ goes low and stays low for that
whole clock period; at the 12th edge the counter clears to 0000. No false state appears,
and the clear lasts a full period, so it is reliable (the slide: 无效状态不会出现，清零法建议用此方法实现).

| Pulse | Outputs $Q_DQ_CQ_BQ_A$ | Clear $\overline{CR}$ |
|---|---|---|
| 0 to 10 | 0000 up to 1010 | 1 |
| 11 | 1011 | 0 for the whole period |
| 12 | 0000 | 1 |

::: graph Synchronous clear, M = 12 on a 74HC163
at 0000: 30, 25
at 0001: 105, 25
at 0010: 180, 25
at 0011: 255, 25
at 0100: 330, 25
at 0101: 330, 130
at 0110: 330, 235
at 0111: 255, 235
at 1000: 180, 235
at 1001: 105, 235
at 1010: 30, 235
at 1011: 30, 130
at 1100: 250, 170
at 1101: 180, 170
at 1110: 110, 170
at 1111: 110, 95
0000 -> 0001, 0001 -> 0010, 0010 -> 0011, 0011 -> 0100, 0100 -> 0101, 0101 -> 0110
0110 -> 0111, 0111 -> 1000, 1000 -> 1001, 1001 -> 1010, 1010 -> 1011, 1011 -> 0000
1100 -> 1101, 1101 -> 1110, 1110 -> 1111, 1111 -> 0000
:::

The invalid states 1100 → 1101 → 1110 → 1111 count up normally until 1111, which has
$Q_DQ_BQ_A = 111$, clears at the next edge: self-starting.

::: formula Feedback state for the reset method | 清零法的反馈状态
$$\begin{gathered}
\text{asynchronous clear (160, 161, 74HC90):}\quad S_{\text{fb}} = S_M \\
\text{synchronous clear (162, 163):}\quad S_{\text{fb}} = S_{M-1}
\end{gathered}$$
--
M | modulus wanted: the states are $S_0 \dots S_{M-1}$ |
S_M | the state with number $M$ in binary (or BCD) |
S_{\text{fb}} | the state the gate decodes |
:::

::: callout key One rule behind both
Ask "does the input act at once, or at the next edge?". **At once** (asynchronous): decode
the first state you *don't* want, $S_M$; it flashes by and isn't counted. **At the next
edge** (synchronous): decode the last state you *do* want, $S_{M-1}$; it lasts a full
period and is counted.
:::

### Which outputs go into the gate

The slide's NAND for 1100 takes only $Q_D$ and $Q_C$, not all four outputs. That is
enough: counting up from 0000, the feedback state is the **first** state in which those
bits are all 1 (no smaller number contains all of 1100's 1-bits). So the gate needs only
the outputs that are 1 in the feedback state.

::: law Decoding the feedback state | 反馈状态的译码
For a counter that counts up from 0, the gate needs only the outputs that are 1 in the
feedback state: a NAND of them for an active-low $\overline{CR}$ or $\overline{LD}$, an
AND (or just the wires) for the 74HC90's active-high $R_0$ pair.
:::

With a preset other than 0 the same holds if no state between the preset and the feedback
state contains all those 1-bits; check it in the cycle.

### Reset method on the 74HC90

The 74HC90's $R_0$ clear is asynchronous, so it decodes $S_M$, and its two active-high
inputs are a built-in AND gate.

::: example A 6-ary counter from a 74HC90
Make a counter that goes 0 to 5 with a 74HC90.
== Connection ==
Use the 8421 decade connection: clock into $CP_A$, $Q_A$ to $CP_B$. $S_{9(1)}$, $S_{9(2)}$
grounded.
== Feedback state ==
Asynchronous clear: decode $S_6 = 0110$. Its 1-bits are $Q_C$ and $Q_B$.
== Wiring ==
$R_{0(1)} = Q_C$, $R_{0(2)} = Q_B$. No gate needed.
== Check ==
0000 → … → 0101; the 6th pulse gives 0110, both $R_0$ go high and the chip clears at once:
six states, 0 to 5, with a brief 0110 glitch.
:::

::: example A 24-ary counter from two 74HC90
Hours of a day: 00 to 23 in BCD, with two 74HC90.
== Each digit ==
Both chips in the 8421 decade connection. The units chip's $Q_D$ goes 1 → 0 when it
passes from 9 to 0, a falling edge: wire it to the tens chip's $CP_A$ (asynchronous serial
carry). Together they count 00 to 99.
== Feedback state ==
Asynchronous clear: decode 24 = 0010 0100 (tens 0010, units 0100). The 1-bits are the tens
$Q_B$ and the units $Q_C$.
== Wiring ==
On **both** chips: $R_{0(1)}$ = tens $Q_B$, $R_{0(2)}$ = units $Q_C$. When 24 appears, both
chips clear at once to 00.
== Check ==
No earlier number from 00 to 23 has tens $Q_B = 1$ (tens = 2 or 3) together with units
$Q_C = 1$ (units 4 to 7): the first is 24. So the counter runs 00 to 23.
:::

::: callout pitfall Decode the whole number, not each digit
For a two-digit counter the feedback state is the **two-digit** number (24 = 0010 0100
in BCD, 90 = 0101 1010 in binary), and the clear or load goes to **every** chip. Clearing
only the tens chip at "2" would cut the count at 20.
:::

## The preset method

All four 160–163 chips load **synchronously**. So the load method always decodes the last
state wanted, like the synchronous clear, and the counter jumps to the preset at the next
edge. The preset need not be 0.

::: formula Feedback state for the preset method | 置数法的反馈状态
$$S_{\text{fb}} = S_{P + M - 1}, \qquad M = S_{\text{fb}} - P + 1$$
--
P | preset: the number on the data inputs DCBA, loaded when $\overline{LD} = 0$ |
M | modulus: the states are $P, P+1, \dots, P+M-1$ |
S_{\text{fb}} | the state the gate decodes (as a number) |
:::

::: example A 7-ary counter by loading 0 (74HC161 or 74HC160)
Make a 7-ary counter with $DCBA = 0000$.
== Feedback state ==
Synchronous load, preset 0: decode $S_{0+7-1} = S_6 = 0110$, whose 1-bits are $Q_C$ and
$Q_B$.
== Wiring ==
$\overline{LD} = \overline{Q_CQ_B}$ (a NAND); $D = C = B = A = 0$; $\overline{CR} = 1$;
$ET = EP = 1$.
== Cycle ==
0000 → 0001 → … → 0110; at 0110 $\overline{LD} = 0$, so the next edge loads 0000. Seven
states, no glitch.
== Invalid states (74HC161) ==
0111, 1110 and 1111 have $Q_CQ_B = 11$ and load 0000 at the next edge. 1000 counts up
1000 → 1001 → 1010 → 1011 → 1100 → 1101 → 1110, then loads 0000. On the 74HC160, 1000 → 1001
→ 0000 as a decade counter does. Either way it self-starts.
:::

::: example A 10-ary counter with a fixed preset of 3 (74HC161)
The slide: $DCBA = 0011$ (D, C grounded; B, A at 1), $\overline{LD} = \overline{Q_DQ_C}$.
== Feedback state ==
$Q_DQ_C = 11$ first happens at 1100 = 12. So $S_{\text{fb}} = 12$.
== Modulus ==
$M = 12 - 3 + 1 = 10$: the counter runs 0011 → 0100 → … → 1100 → 0011.
== Why it's useful ==
States 3 to 12 are the excess-3 code of 0 to 9, so this is a decade counter that counts in
excess-3 (余3码).
== Invalid states ==
0000 → 0001 → 0010 → 0011 count into the cycle; 1101, 1110, 1111 have $Q_DQ_C = 11$ and load
0011. Self-starting.
:::

::: example A 10-ary counter with a variable preset (74HC161)
The slide: $\overline{LD} = Q_C$ (a plain wire, no gate), and the data inputs are
$D = Q_D$, $C = 1$, $B = A = 0$. So whenever $Q_C = 0$ the next edge loads $Q_D\,100$.
Find the cycle.
== Rule ==
If $Q_C = 1$: count up. If $Q_C = 0$: load 0100 (when $Q_D = 0$) or 1100 (when $Q_D = 1$).
== All sixteen states ==

| Present $Q_DQ_CQ_BQ_A$ | $Q_C$ bit | Action | Next |
|---|---|---|---|
| 0000, 0001, 0010, 0011 | 0 | load $0\,100$ | 0100 |
| 0100 | 1 | count | 0101 |
| 0101 | 1 | count | 0110 |
| 0110 | 1 | count | 0111 |
| 0111 | 1 | count | 1000 |
| 1000, 1001, 1010, 1011 | 0 | load $1\,100$ | 1100 |
| 1100 | 1 | count | 1101 |
| 1101 | 1 | count | 1110 |
| 1110 | 1 | count | 1111 |
| 1111 | 1 | count (wraps) | 0000 |
== Cycle ==
0100 → 0101 → 0110 → 0111 → 1000 → 1100 → 1101 → 1110 → 1111 → 0000 → 0100: **ten states**,
a 10-ary counter with no gate at all. The other six states load into the cycle in one pulse.
:::

::: callout tip The RCO trick
Wire $\overline{LD} = \overline{RCO}$ (through an inverter) and set the preset to $P = N - M$.
$RCO$ is 1 exactly at the chip's last state (15 or 9), so the counter runs from $P$ up to
the top and reloads: $M = N - P$. The ÷200 example below does exactly this with two chips.
:::

Try the three rules side by side: choose the modulus and the preset, and read which state
each method must decode.

::: explore Which state to decode
slider M: 2 .. 16 = 12 | | step 1 | modulus wanted
slider P: 0 .. 15 = 0 | | step 1 | preset for loading
async = M | | asynchronous clear decodes
sync = M - 1 | | synchronous clear decodes
load = P + M - 1 | | load decodes
:::

## Two-chip examples

::: example A ÷200 frequency divider from two 74HC161 (例 ①)
Two 74HC161 on the same $CP$, synchronous parallel carry ($RCO_{\text{I}}$ to $ET$, $EP$ of
chip II; chip I's $ET = EP = 1$). $\overline{CR} = 1$ on both. Chip I's data
$DCBA = 1100$; chip II's $DCBA = 1001$. $RCO_{\text{II}}$ goes through an inverter to
$\overline{LD}$ of both chips, and also to the clock of a falling-edge D flip-flop whose
$\overline{Q}$ is wired to its $D$. How does the frequency of $Q$ compare with $CP$'s?
== The preset ==
Chip II is the high half: the loaded number is $1001\,1100_2 = 9 \times 16 + 12 = 156$.
== The feedback state ==
$RCO_{\text{II}} = ET_{\text{II}}\cdot(\text{II} = 1111) = RCO_{\text{I}}\cdot(\text{II} = 1111)$,
which is 1 only at $1111\,1111 = 255$. Then $\overline{LD} = 0$ and the next edge loads 156.
== Modulus ==
The pair cycles 156, 157, …, 255:
$$M = 255 - 156 + 1 = 100$$
So $RCO_{\text{II}}$ gives one pulse every 100 clock pulses: $f_{CP}/100$.
== The D flip-flop ==
With $D = \overline{Q}$ it toggles at each falling edge of $RCO_{\text{II}}$ (when the
counter reloads), halving the frequency again and giving a square wave.
$$f_Q = \frac{f_{CP}}{100 \times 2} = \frac{f_{CP}}{200}$$
A **÷200 frequency divider** (200分频).
:::

::: callout note The slide's arithmetic
The slide writes "11111111 − 10011100 + 1 = 01100011（99）+1". Read it as
$11111111_2 - 10011100_2 = 01100011_2 = 99$, and $99 + 1 = 100$ states. The result (÷100, then
÷200) is right. The slide also says "74LS161" in places and "74HC161" in others: the TTL
and CMOS versions have the same function.
:::

Change the preset of the two chips to see the division ratio follow ($f_{CP}$ in kHz):

::: explore Two 74HC161 reloaded by RCO, then a toggle flip-flop
slider P: 0 .. 254 = 156 | | step 1 | preset of the pair
slider f: 1 .. 1000 = 200 | kHz | clock frequency
M = 256 - P | | states per cycle
fRCO = f / M | kHz | RCO pulse rate
fQ = f / (2 M) | kHz | output Q of the D flip-flop
:::

::: example A reliable modulo-91 counter from two 74HC161 (例 ②)
Use two 74HC161 with synchronous parallel carry to make a modulo-91 counter that works
reliably.
== Choose the method ==
"Works reliably" rules out the asynchronous clear (glitch, short clear pulse). Use the
synchronous **load**, with every data input grounded (preset 0000 0000).
== Feedback state ==
Two chips in parallel form a 256-ary counter. States 0 to 90 are 91 states, so decode the
last one, $S_{90}$:
$$90 = 0101\,1010_2 \quad (\text{chip II } 0101,\ \text{chip I } 1010)$$
== Wiring ==
A four-input NAND of the 1-bits: chip I's $Q_D$ and $Q_B$, chip II's $Q_C$ and $Q_A$:
$$\overline{LD} = \overline{Q_{D,\text{I}}\,Q_{B,\text{I}}\,Q_{C,\text{II}}\,Q_{A,\text{II}}}$$
to $\overline{LD}$ of **both** chips. $\overline{CR} = 1$; chip I $ET = EP = 1$; $RCO_{\text{I}}$
to chip II's $ET$ and $EP$; one $CP$.
== Check ==
The cycle runs 0000 0000 to 0101 1010 (0 to 90): 91 states, and the next edge loads 0. No
smaller number has all four of those bits set.
:::

::: callout note The slide's wording
The slide says the two chips are "串接" (joined in series) into a 16 × 16 = 256 counter, but
its drawing, as the question asks, uses the synchronous parallel carry: both chips on one
$CP$, $RCO_{\text{I}}$ to chip II's $EP$ and $ET$.
:::

::: example A 60-ary counter from two 74HC160, two ways
Seconds of a minute, 00 to 59, in BCD. Units chip and tens chip on one $CP$; units $RCO$
to the tens chip's $ET$ and $EP$.
== With the synchronous load ==
Data inputs all 0. Decode the last state, 59 = 0101 1001 (tens 0101, units 1001):
$\overline{LD} = \overline{Q_{C,\text{t}}\,Q_{A,\text{t}}\,Q_{D,\text{u}}\,Q_{A,\text{u}}}$, to both chips.
Reliable, no glitch.
== With the asynchronous clear ==
Decode 60 = 0110 0000: $\overline{CR} = \overline{Q_{C,\text{t}}\,Q_{B,\text{t}}}$, to both
chips. Fewer gate inputs, but 60 flashes by for a few nanoseconds.
== Same modulus ==
Both give 00 to 59. The feedback states differ by one because one input waits for the
clock and the other doesn't.
:::

## Analysing a counter that is already wired

The reverse question gives the circuit and asks for the modulus. Work the formulas
backwards.

::: law Analysing a chip counter | 集成计数器构成的计数器的分析
1. Identify the chip and whether the input used ($\overline{CR}$, $\overline{LD}$, $R_0$)
   is synchronous or asynchronous.
2. Read the feedback state: the outputs on the gate (or wire) give its 1-bits; it is the
   first state in the count that has them all.
3. Find the start: 0 for a clear, the preset $DCBA$ for a load.
4. Count: asynchronous clear $M = S_{\text{fb}}$; synchronous clear $M = S_{\text{fb}} + 1$;
   load $M = S_{\text{fb}} - P + 1$. Write out the cycle to be sure.
:::

::: example Four quick analyses
Find the modulus of each.
(a) 74HC162, $\overline{CR} = \overline{Q_CQ_A}$, $\overline{LD} = 1$.
(b) 74HC161, $\overline{CR} = \overline{Q_DQ_B}$, $\overline{LD} = 1$.
(c) 74HC160, $\overline{LD} = \overline{Q_DQ_A}$, $DCBA = 0011$, $\overline{CR} = 1$.
(d) 74HC163, $\overline{LD} = \overline{RCO}$ (an inverter), $DCBA = 0101$, $\overline{CR} = 1$.
== (a) ==
Feedback 0101 = 5; the 162's clear is synchronous: $M = 5 + 1 = 6$ (0 to 5).
== (b) ==
Feedback 1010 = 10; the 161's clear is asynchronous: $M = 10$ (0 to 9, 1010 a glitch).
== (c) ==
Feedback 1001 = 9; load is synchronous, preset 3: $M = 9 - 3 + 1 = 7$ (3 to 9).
== (d) ==
$RCO = 1$ at 1111 = 15; preset 5: $M = 15 - 5 + 1 = 11$ (5 to 15).
:::

::: example A 74HC90 counter to analyse
A 74HC90: clock into $CP_A$, $Q_A$ to $CP_B$, $S_9$ grounded, $R_{0(1)} = Q_D$,
$R_{0(2)} = Q_A$. What is its modulus?
== Connection ==
8421 decade counting.
== Feedback ==
$Q_D = Q_A = 1$ first at 1001 = 9. $R_0$ is asynchronous, so 9 flashes by and the counter
clears.
== Modulus ==
0 to 8: $M = 9$.
:::

::: callout pitfall The two classic slips
Decoding $S_M$ for a synchronous clear or a load (one state too many), and decoding
$S_{M-1}$ for an asynchronous clear (one too few). In an analysis question the same slip
runs backwards. Before anything else, write down "asynchronous" or "synchronous" next to
the input being used.
:::

::: callout exam The heart of the chapter's exam
The scope says: analyse and design counters of any modulus with the 74HC90 and the
74HC160/161/162/163. Expect (1) "this counter is wired as shown: what modulus? draw its
state diagram", and (2) "use a 74HC16x (or two) to make an $M$-ary counter by the reset or
the preset method: connect the chip". Show the feedback state in binary, say why it is
$S_M$ or $S_{M-1}$, and list the cycle. For two chips, decode the whole number and drive
every chip's clear or load.
:::

::: cards Counting to any number
Reset method (清零法) :: Decode a state to the clear input so the counter returns to 0 after $M$ states.
Preset method (置数法) :: Decode a state to the load input so the counter jumps to the preset; $M$ states from $P$.
Asynchronous clear: which state to decode :: $S_M$; it lasts only nanoseconds and isn't counted.
Synchronous clear: which state to decode :: $S_{M-1}$; it lasts a full period and is counted.
Load method (160–163): which state to decode :: $S_{P+M-1}$, since loading is synchronous.
Modulus of a load counter :: $M = S_{\text{fb}} - P + 1$.
Glitch state (暂态) :: With an asynchronous clear, $S_M$ appears briefly before the clear; a false output.
Why prefer synchronous clear or load :: No false state, and the clear or load signal lasts a whole clock period.
Gate inputs for the feedback state :: Only the outputs that are 1 in the feedback state (counting up from 0).
74HC161, M = 12 by asynchronous clear :: $\overline{CR} = \overline{Q_DQ_C}$ (decodes 1100).
74HC163, M = 12 by synchronous clear :: $\overline{CR} = \overline{Q_DQ_BQ_A}$ (decodes 1011).
RCO trick :: $\overline{LD} = \overline{RCO}$, preset $P = N - M$.
Two 74HC161, preset 1001 1100, reload at 1111 1111 :: $M = 255 - 156 + 1 = 100$; with a toggle flip-flop, ÷200.
Modulo-91 from two 74HC161 :: Load 0 at $90 = 0101\,1010$: NAND of $Q_{D,\text{I}}$, $Q_{B,\text{I}}$, $Q_{C,\text{II}}$, $Q_{A,\text{II}}$.
:::

::: quiz Counting to any number
? You make a 7-ary counter from a 74HC161 by the reset method. Which state must the NAND decode?
- [x] 0111
- [ ] 0110
- [ ] 1000
> The 161's clear is asynchronous, so decode $S_M = S_7 = 0111$. It flashes by and the
> counter shows 0 to 6.

? The same 7-ary counter on a 74HC163 (reset method). Write $\overline{CR}$ in terms of $Q_D, Q_C, Q_B, Q_A$.
logic: (QC QB)'
variables: QD, QC, QB, QA
> The 163 clears synchronously, so decode $S_{M-1} = S_6 = 0110$: $\overline{CR} = \overline{Q_CQ_B}$.
> 0110 is the first count with $Q_C = Q_B = 1$.

? A 74HC161 has $\overline{LD} = \overline{Q_D}$ (an inverter on $Q_D$), $DCBA = 0000$ and $\overline{CR} = 1$. What is its modulus?
answer: 9
tolerance: 0
> $Q_D = 1$ first at 1000 = 8. Load is synchronous: $M = 8 - 0 + 1 = 9$ (0 to 8).

? A 74HC161 has $\overline{CR} = \overline{Q_DQ_A}$. What is its modulus?
answer: 9
tolerance: 0
> $Q_DQ_A = 11$ first at 1001 = 9. The 161's clear is asynchronous, so 9 is the glitch state
> and the counter runs 0 to 8: $M = 9$.

? A 74HC163 has $\overline{CR} = \overline{Q_DQ_A}$. What is its modulus?
answer: 10
tolerance: 0
> Same feedback state 1001 = 9, but the 163's clear is synchronous: 9 is counted, and the
> counter runs 0 to 9: $M = 10$.

? In the asynchronous-clear 12-ary counter on a 74HC161, how long is the counter in state 1100?
- [x] Only a few nanoseconds, until the clear acts
- [ ] One full clock period
- [ ] It never reaches 1100
> At the 12th edge it steps to 1100, the NAND pulls $\overline{CR}$ low, and the asynchronous
> clear acts at once: 1100 is a brief glitch, not a counted state.

? Two 74HC161 with synchronous parallel carry are reloaded with $DCBA_{\text{II}}\,DCBA_{\text{I}} = 1001\,1100$ whenever $RCO_{\text{II}} = 1$. A toggling D flip-flop follows. The clock is 1 MHz. What is the frequency of $Q$?
answer: 5 kHz
> Preset 156; reload at 255: $M = 255 - 156 + 1 = 100$. The toggle flip-flop halves it:
> $1\ \text{MHz}/200 = 5$ kHz.

? You build a 24-ary counter from two 74HC160 by the synchronous load (data inputs 0). Which number must the gate decode?
answer: 23
tolerance: 0
> Load is synchronous, so decode the last state, 23 = 0010 0011 in BCD: a NAND of tens $Q_B$
> and units $Q_B$, $Q_A$, to both chips' $\overline{LD}$.

? A 74HC160 has $DCBA = 0010$ and $\overline{LD} = \overline{Q_DQ_A}$. What is its modulus?
answer: 8
tolerance: 0
> Feedback 1001 = 9, preset 2, synchronous load: $M = 9 - 2 + 1 = 8$ (2 to 9).

? A 74HC90 is in the 8421 decade connection with $R_{0(1)} = Q_C$ and $R_{0(2)} = Q_A$. What is its modulus?
answer: 5
tolerance: 0
> $Q_C = Q_A = 1$ first at 0101 = 5. $R_0$ is asynchronous, so 5 flashes by: the counter runs
> 0 to 4, $M = 5$.
:::

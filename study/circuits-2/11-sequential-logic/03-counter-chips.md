---
title: Counter chips
zh: 集成计数器
summary: What counters are and how they are classified; the asynchronous 74HC90/74LS290 (÷2 and ÷5 sections, 8421 and 5421 decade counting, R0 and S9); the synchronous 74HC160/161/162/163 and their function tables (decimal or 4-bit binary, asynchronous or synchronous clear, synchronous load, ET/EP, RCO); and cascading chips.
source: 第7章 时序逻辑电路 7.4–7.4.1 (teacher's slides 22–30)
---

Nobody builds a counter from separate flip-flops any more: a 16-pin chip holds four
flip-flops, the gates and some extra controls. This lesson reads the data of the chips
the course uses, the asynchronous 74HC90 and the synchronous 74HC160 to 74HC163. The
details that look small here (is the clear synchronous or asynchronous? which pins are
active low?) decide every design in the next lesson, and the exam asks you to analyse and
design with exactly these chips, so learn the function tables well.

## Counters

::: define Counting and counter | 计数与计数器
**Counting** {{zh 计数}} is remembering how many clock pulses have arrived. A **counter**
{{zh 计数器}} is a circuit that does it.
:::

::: define Modulus of a counter | 计数器的模
The number of different states a counter goes through before it repeats, the largest
number of pulses it can accumulate. Also called its capacity or counting length
{{zh 计数容量、计数长度}}. An $M$-ary counter {{zh M进制计数器}} has modulus $M$.
:::

Counters count events, measure time (count a known clock: 定时) and divide frequency
(分频): the last stage of a modulo-$M$ counter changes once every $M$ input pulses, so it
runs at $f_{CP}/M$.

A counter chip usually offers four functions: **clear** (清零, back to 0), **load**
(置数, jump to a given number), **hold** (保持, stop) and **count**. Counters are
classified three ways:

| Classified by | Kinds |
|---|---|
| clocking | synchronous (同步) or asynchronous (异步) |
| direction | up (加法), down (减法) or up/down, reversible (可逆) |
| modulus | binary (二进制), decimal (十进制) or any modulus (任意进制) |

## The 74HC90: an asynchronous 2–5–10 counter

### Inside

The 74HC90 (also 74HC290, and the TTL 74LS290 and 74LS90) holds two separate counters:

- a **÷2** section: one toggling flip-flop FF0, clock $CP_A$, output $Q_A$;
- a **÷5** section: three flip-flops, clock $CP_B$, outputs $Q_D Q_C Q_B$. It is exactly
  the asynchronous 5-ary counter of the previous lesson (its FF1, FF2, FF3 are $Q_B$,
  $Q_C$, $Q_D$): it counts 000 → 001 → 010 → 011 → 100 → 000 on $Q_DQ_CQ_B$.

Both clock inputs are falling-edge (bubbles on $CP_A$ and $CP_B$). The two sections are
not joined inside: you join them outside, and *how* you join them decides the code.

::: callout note FF0's clock on the slide's drawing
In the slides' internal drawing of the 74LS290, FF0's clock input has no bubble while the
others do. The chip's symbol (and the datasheet) has bubbles on both $CP_A$ and $CP_B$:
every flip-flop in it changes on a falling edge. The analysis below uses falling edges
throughout.
:::

### Clear and set-to-9

Four control inputs, all active **high**, work in pairs:

::: define R0 and S9 inputs of the 74HC90 | 74HC90的异步清零端与异步置9端
$R_{0(1)}$, $R_{0(2)}$: when both are 1 (and $S_9$ isn't), the outputs go to
$Q_DQ_CQ_BQ_A = 0000$ at once, **asynchronous clear** {{zh 异步清零}}. $S_{9(1)}$,
$S_{9(2)}$: when both are 1, the outputs go to 1001 at once, **asynchronous set to 9**
{{zh 异步置9}}. Neither needs a clock.
:::

| Input $R_{0(1)}$ | Input $R_{0(2)}$ | Input $S_{9(1)}$ | Input $S_{9(2)}$ | Outputs $Q_DQ_CQ_BQ_A$ |
|---|---|---|---|---|
| 1 | 1 | 0 | × | 0000, asynchronous clear |
| 1 | 1 | × | 0 | 0000, asynchronous clear |
| × | × | 1 | 1 | 1001, asynchronous set to 9 |
| product 0 | | product 0 | | count |

The slide's table writes the set-to-9 row with $R_0 = 00$; on the datasheet set-to-9 wins
even when both $R_0$ inputs are high, as the third row shows. To count, at least one of
each pair must be 0 ($R_{0(1)}R_{0(2)} = 0$ and $S_{9(1)}S_{9(2)} = 0$).

::: callout pitfall The 74HC90's controls are active high
Unlike the 160–163's $\overline{CR}$ and $\overline{LD}$, the 74HC90's $R_0$ and $S_9$
act when they are **1**, and only when **both** of a pair are 1. That is handy: a
two-input clear decoder needs no gate, just two wires from two outputs.
:::

### Four ways to use it

| Connection | What it counts |
|---|---|
| clock into $CP_A$, output $Q_A$ | ÷2 |
| clock into $CP_B$, outputs $Q_DQ_CQ_B$ | ÷5 (0 to 4 in binary) |
| clock into $CP_A$, $Q_A$ joined to $CP_B$ | ÷10 in **8421 BCD** on $Q_DQ_CQ_BQ_A$ |
| clock into $CP_B$, $Q_D$ joined to $CP_A$ | ÷10 in **5421 BCD** on $Q_AQ_DQ_CQ_B$ |

::: example The 74HC90 as an 8421 decade counter
Clock into $CP_A$; $Q_A$ wired to $CP_B$; $R_0$ and $S_9$ grounded. Find the sequence.
== The ÷2 stage ==
$Q_A$ toggles at every falling edge of the clock: 0, 1, 0, 1, …
== The ÷5 stage ==
It is clocked by $Q_A{\downarrow}$, that is every second pulse (when $Q_A$ goes 1 → 0), and
steps 000 → 001 → 010 → 011 → 100 → 000.
== Together ==

| Pulse | $Q_D$ bit | $Q_C$ bit | $Q_B$ bit | $Q_A$ bit | Decimal |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 1 |
| 2 | 0 | 0 | 1 | 0 | 2 |
| 3 | 0 | 0 | 1 | 1 | 3 |
| 4 | 0 | 1 | 0 | 0 | 4 |
| 5 | 0 | 1 | 0 | 1 | 5 |
| 6 | 0 | 1 | 1 | 0 | 6 |
| 7 | 0 | 1 | 1 | 1 | 7 |
| 8 | 1 | 0 | 0 | 0 | 8 |
| 9 | 1 | 0 | 0 | 1 | 9 |
| 10 | 0 | 0 | 0 | 0 | 0 |

$Q_A$ is the units bit (weight 1) and the ÷5 counter gives $2 \times$ its count, so
$Q_DQ_CQ_BQ_A$ is 0 to 9 in 8421 BCD. $Q_D$ is high only at 8 and 9 (a 20% duty cycle).
:::

::: example The 74HC90 as a 5421 decade counter
Clock into $CP_B$; $Q_D$ wired to $CP_A$. Find the sequence, read as $Q_AQ_DQ_CQ_B$.
== The ÷5 stage first ==
It counts 0 to 4 on $Q_DQ_CQ_B$. $Q_D$ goes 1 → 0 at the fifth pulse (100 → 000).
== The ÷2 stage ==
Clocked by $Q_D{\downarrow}$, $Q_A$ toggles once every five pulses.
== Together ==

| Pulse | $Q_A$ bit (weight 5) | $Q_D$ bit (4) | $Q_C$ bit (2) | $Q_B$ bit (1) | Decimal |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 1 |
| 2 | 0 | 0 | 1 | 0 | 2 |
| 3 | 0 | 0 | 1 | 1 | 3 |
| 4 | 0 | 1 | 0 | 0 | 4 |
| 5 | 1 | 0 | 0 | 0 | 5 |
| 6 | 1 | 0 | 0 | 1 | 6 |
| 7 | 1 | 0 | 1 | 0 | 7 |
| 8 | 1 | 0 | 1 | 1 | 8 |
| 9 | 1 | 1 | 0 | 0 | 9 |

The weights are 5, 4, 2, 1: the 5421 BCD code from the number-systems unit. $Q_A$ is high
for pulses 5 to 9, a **symmetrical square wave** at $f_{CP}/10$, which is why this
connection is used for dividing by 10.
:::

::: graph The 5421 decade cycle, read as Q_A Q_D Q_C Q_B
at 0000: 40, 40
at 0001: 110, 40
at 0010: 180, 40
at 0011: 250, 40
at 0100: 320, 40
at 1000: 320, 220
at 1001: 250, 220
at 1010: 180, 220
at 1011: 110, 220
at 1100: 40, 220
0000 -> 0001, 0001 -> 0010, 0010 -> 0011, 0011 -> 0100, 0100 -> 1000: Q_D falls
1000 -> 1001, 1001 -> 1010, 1010 -> 1011, 1011 -> 1100, 1100 -> 0000: Q_D falls
:::

Compare the two ÷10 outputs: in 8421 mode the top bit $Q_D$ is high 2 pulses in 10, in
5421 mode the top bit $Q_A$ is high 5 in 10. Both are lifted for clarity ($Q_A$ by 1.5).

::: plot Top bit of the 74HC90 decade counter: 8421 Q_D (lower) and 5421 Q_A (upper)
x: 0 .. 20
y: -0.5 .. 3
xlabel: clock pulses
ylabel: output
QD(x) = floor((floor(x) - 10 floor(x/10))/8)
QA(x) = floor((floor(x) - 10 floor(x/10))/5) + 1.5
:::

## The 74HC160 to 74HC163: synchronous counters

### Pins

The four chips share one pin-out:

| Pin | Name | What it does |
|---|---|---|
| clock | $CP$ | counting, loading and the synchronous clear happen on the **rising** edge |
| clear | $\overline{CR}$ | clear to 0000, active low |
| load | $\overline{LD}$ | load the data inputs, active low |
| data | $D, C, B, A$ | the number to load ($D$ the most significant bit) |
| enables | $EP$, $ET$ | both 1: count; either 0: hold |
| outputs | $Q_D Q_C Q_B Q_A$ | the count ($Q_D$ the most significant bit) |
| carry | $RCO$ | ripple carry output: 1 at the last state, when $ET = 1$ |

::: define Ripple carry output RCO | 进位输出端
An output that is 1 when the counter is at its last state (1001 for the decimal 160/162,
1111 for the binary 161/163) **and** $ET = 1$. It does not depend on $EP$. It tells the
next chip "my next pulse is a carry".
:::

### Function tables

74HC160 and 74HC161 (↑ = rising edge, × = either):

| Clock $CP$ | Clear $\overline{CR}$ | Load $\overline{LD}$ | Enable $EP$ | Enable $ET$ | Result $Q_DQ_CQ_BQ_A$ |
|---|---|---|---|---|---|
| × | 0 | × | × | × | 0000 at once: **asynchronous clear** |
| ↑ | 1 | 0 | × | × | $DCBA$: **synchronous load** |
| × | 1 | 1 | 0 | × | hold |
| × | 1 | 1 | × | 0 | hold (and $RCO = 0$) |
| ↑ | 1 | 1 | 1 | 1 | count up |

74HC162 and 74HC163: the same, except the first row:

| Clock $CP$ | Clear $\overline{CR}$ | Load $\overline{LD}$ | Enable $EP$ | Enable $ET$ | Result $Q_DQ_CQ_BQ_A$ |
|---|---|---|---|---|---|
| ↑ | 0 | × | × | × | 0000 at the next edge: **synchronous clear** |
| ↑ | 1 | 0 | × | × | $DCBA$: synchronous load |
| × | 1 | 1 | 0 | × | hold |
| × | 1 | 1 | × | 0 | hold (and $RCO = 0$) |
| ↑ | 1 | 1 | 1 | 1 | count up |

The rows are in order of priority: clear beats load, load beats the enables.

| Chip | Counts | Code | Clear | Load |
|---|---|---|---|---|
| 74HC160 | 10 | 8421 BCD | asynchronous | synchronous |
| 74HC161 | 16 | 4-bit binary | asynchronous | synchronous |
| 74HC162 | 10 | 8421 BCD | synchronous | synchronous |
| 74HC163 | 16 | 4-bit binary | synchronous | synchronous |

::: define Asynchronous and synchronous clear | 异步清零与同步清零
An **asynchronous clear** acts the moment its input becomes active, without waiting for
the clock. A **synchronous clear** only prepares the clear: the counter goes to 0000 at
the next active clock edge. Loading on all four chips is **synchronous** {{zh 同步置数}}.
:::

An analogy: an asynchronous clear is a fire alarm, everyone leaves the moment it rings; a
synchronous clear is a note on the board, read out at the start of the next lesson.

::: callout key Learn which is which
160 and 161: **asynchronous** clear. 162 and 163: **synchronous** clear. All four:
**synchronous** load. Even numbers (160, 162) count in decimal, odd ones (161, 163) in
binary. The 74HC90's $R_0$ and $S_9$ are asynchronous too.
:::

::: example Reading the function tables
A 74HC161 holds 0101. Say what happens in each case, separately.
(a) $\overline{CR} = 1$, $\overline{LD} = 0$, $DCBA = 1001$, then a rising edge.
(b) $\overline{CR}$ goes to 0 between clock edges.
(c) $\overline{CR} = \overline{LD} = 1$, $EP = 0$, $ET = 1$, then a rising edge.
(d) The same chip is a 74HC163 instead, and $\overline{CR}$ goes to 0 between edges.
== (a) Load ==
Load is synchronous: at the rising edge the outputs become $DCBA = 1001$.
== (b) Asynchronous clear ==
The 161's clear doesn't wait: $Q_DQ_CQ_BQ_A = 0000$ immediately, and stays 0000 while
$\overline{CR} = 0$.
== (c) Hold ==
$EP = 0$: the counter keeps 0101. ($RCO$ would be 0 anyway, as the state isn't 1111.)
== (d) Synchronous clear ==
Nothing happens until the next rising edge; then the 163 goes to 0000.
:::

## Cascading counters

One chip counts to 10 or 16. For more, join several: the modulus of the chain is the
product, $N = N_1 N_2 \cdots$.

::: formula Modulus of cascaded counters | 级联计数器的模
$$N = N_1 \times N_2 \times \cdots \times N_k$$
--
N_i | modulus of chip $i$ |
N | modulus of the whole chain |
:::

There are two ways to pass the carry from one chip to the next.

::: define Synchronous parallel carry | 同步并行进位
Every chip gets the same clock $CP$; a chip's $RCO$ goes to the next chip's enables (ET,
EP), so the next chip counts only on the pulse that carries. All chips change at the same
edge.
:::

::: define Asynchronous serial carry | 异步串行进位
Only the first chip gets $CP$; each chip's carry signal is (after shaping) the next chip's
clock, as in a ripple counter. The chips don't change together.
:::

::: example A 1000-ary counter from three 74HC160 (synchronous parallel carry)
Three 74HC160 for the units, tens and hundreds digits; outputs
$Q_{11} \dots Q_8$, $Q_7 \dots Q_4$, $Q_3 \dots Q_0$. All three $CP$ pins on $CP$; all
$\overline{CR}$ and $\overline{LD}$ at 1. Units: $ET = EP = 1$. $RCO$ of the units chip
to $ET$ and $EP$ of the tens chip; $RCO$ of the tens chip to $ET$ and $EP$ of the hundreds
chip.
== After 9 pulses ==
Units 1001, tens 0000. The units chip is at 9 with $ET = 1$, so $RCO_1 = 1$: the tens chip
is now enabled.
== The 10th pulse ==
At that one edge the units chip goes 1001 → 0000 and, because it was enabled, the tens chip
goes 0000 → 0001. Now $RCO_1 = 0$ again and the tens chip holds for the next nine pulses.
This is the moment the slide shows: units 0000, tens 0001, $RCO_1 = 0$.
== The hundreds ==
$RCO_2 = ET_2 \cdot (\text{tens} = 9) = RCO_1 \cdot (\text{tens} = 9)$, which is 1 only at
099, 199, …: the hundreds chip steps once every 100 pulses. $N = 10 \times 10 \times 10 = 1000$.
:::

::: example A 4096-ary counter from three 74HC161, and why EP and ET differ
Three 74HC161 on the same $CP$: $2^{12} = 16^3 = 4096$ states. As drawn: chip I has
$ET = EP = 1$; chip II has $ET = 1$ and $EP = RCO_{\text{I}}$; chip III has
$ET = RCO_{\text{II}}$ and $EP = RCO_{\text{I}}$.
== Chip II ==
It counts when $EP \cdot ET = RCO_{\text{I}} = 1$: once every 16 pulses, as it should.
== Why chip III needs RCO of chip I too ==
$RCO_{\text{II}} = ET_{\text{II}} \cdot (\text{II} = 1111) = 1 \cdot (\text{II} = 1111)$. It
doesn't involve chip I, because chip II's $ET$ is tied to 1 (RCO listens to ET, not EP).
So $RCO_{\text{II}}$ stays 1 for **all sixteen** pulses while chip II shows 1111. If chip
III used only $RCO_{\text{II}}$, it would count sixteen times in that stretch. With
$EP_{\text{III}} = RCO_{\text{I}}$ as well, it counts only on the one pulse when both lower
chips are at 1111.
== The other way to wire it ==
Put $RCO_{\text{I}}$ on chip II's $ET$ (as in the 1000-ary counter). Then
$RCO_{\text{II}} = RCO_{\text{I}} \cdot (\text{II} = 1111)$ already includes chip I, and chip
III can take $RCO_{\text{II}}$ on both enables. Both wirings give a synchronous 4096-ary
counter.
:::

::: callout pitfall RCO includes ET but not EP
$RCO = ET \cdot (\text{last state})$. Feed the lower chip's carry into $ET$ if the next
chip's $RCO$ is to pass it on; a carry fed only into $EP$ doesn't reach $RCO$.
:::

::: example A 100-ary counter from two 74HC160 (asynchronous serial carry)
Chip 1 (units) gets $CP$; its $RCO$ goes through an **inverter** to chip 2's $CP$. Both
chips have $ET = EP = 1$ and $\overline{CR} = \overline{LD} = 1$.
== When does chip 2 count? ==
$RCO_1$ rises when the units reach 1001 (after the 9th pulse); inverted, that is a falling
edge, which the rising-edge 160 ignores. At the 10th pulse the units go to 0000, $RCO_1$
falls, and the inverted signal **rises**: chip 2 counts.
== Why the inverter ==
Without it chip 2 would count on $RCO_1$'s rising edge, at 9 instead of 10, and the tens
digit would change one pulse early.
== Modulus ==
$10 \times 10 = 100$. Chip 2 changes a little after chip 1 (it waits for $RCO_1$ and the
inverter), so this connection is asynchronous.
:::

::: callout exam What the exam expects from this lesson
Know the four 160–163 function tables cold: which clear is synchronous, that load is
synchronous on all four, that $\overline{CR}$ and $\overline{LD}$ are active low, and what
$RCO$ is. Know the 74HC90's active-high $R_0$/$S_9$ and its 8421 and 5421 connections.
Every "counter of any modulus" question in the next lesson starts from these.
:::

::: cards Counter chips
Modulus of a counter (计数器的模) :: The number of states it cycles through, the largest number of pulses it can count.
Uses of counters :: Counting, timing (定时), frequency division (分频).
Four functions of a counter chip :: Clear, load, hold, count.
74HC90 sections :: A ÷2 ($CP_A$, $Q_A$) and a ÷5 ($CP_B$, $Q_DQ_CQ_B$), joined outside.
74HC90 as an 8421 decade counter :: Clock into $CP_A$, $Q_A$ to $CP_B$; outputs $Q_DQ_CQ_BQ_A$.
74HC90 as a 5421 decade counter :: Clock into $CP_B$, $Q_D$ to $CP_A$; outputs $Q_AQ_DQ_CQ_B$; $Q_A$ is a square wave at $f/10$.
74HC90 R0 inputs :: Both 1 → 0000 at once (asynchronous clear), active high.
74HC90 S9 inputs :: Both 1 → 1001 at once (asynchronous set to 9).
74HC160 :: Decimal (8421 BCD), asynchronous clear, synchronous load.
74HC161 :: 4-bit binary, asynchronous clear, synchronous load.
74HC162 :: Decimal (8421 BCD), synchronous clear, synchronous load.
74HC163 :: 4-bit binary, synchronous clear, synchronous load.
160–163 enables EP and ET :: Both 1: count; either 0: hold ($ET = 0$ also forces $RCO = 0$).
Ripple carry output RCO :: 1 at the last state (1001 or 1111) when $ET = 1$; independent of EP.
Synchronous parallel carry (同步并行进位) :: Same $CP$ for all chips; RCO into the next chip's ET/EP.
Asynchronous serial carry (异步串行进位) :: The carry clocks the next chip; for the 160, RCO through an inverter.
:::

::: quiz Counter chips
? Which of these chips has a synchronous clear?
- [x] 74HC163
- [ ] 74HC161
- [ ] 74HC160
> 162 and 163 clear synchronously (at the next rising edge); 160 and 161 clear at once.

? A 74HC160 holds 0111. $\overline{CR} = 1$, $\overline{LD} = 1$, $EP = 1$, $ET = 0$. What does it hold after a rising clock edge?
text: 0111
> $ET = 0$ means hold (and $RCO = 0$). It stays at 0111.

? A 74HC162 holds 0110 and $\overline{CR} = 0$, $\overline{LD} = 0$, $DCBA = 1000$. What does it hold after the next rising edge?
text: 0000
> Clear has priority over load, and on the 162 it is synchronous: at the edge the chip goes
> to 0000. The load is ignored.

? A 74HC90 has its clock on $CP_A$ and $Q_A$ joined to $CP_B$. After 7 pulses from 0000, what is $Q_DQ_CQ_BQ_A$?
text: 0111
> This is the 8421 decade connection, so the outputs show 7 in 8421 BCD: 0111.

? A 74HC90 is wired as a 5421 decade counter (clock into $CP_B$, $Q_D$ to $CP_A$). After 7 pulses from 0000, what is $Q_AQ_DQ_CQ_B$?
text: 1010
> In 5421 BCD, 7 = 5 + 2: $Q_A = 1$ (5), $Q_D = 0$, $Q_C = 1$ (2), $Q_B = 0$. Counting it out:
> the ÷5 stage has wrapped once (setting $Q_A$) and then counted 2 = 010.

? On a 74HC90, $R_{0(1)} = R_{0(2)} = 1$ and $S_{9(1)} = S_{9(2)} = 0$. What happens?
- [x] The outputs go to 0000 immediately
- [ ] The outputs go to 0000 at the next clock edge
- [ ] The outputs go to 1001
> Both $R_0$ inputs high with $S_9$ inactive is the asynchronous clear: no clock needed.

? In a 74HC161, $ET = 1$, $EP = 0$ and the outputs are 1111. What is $RCO$?
answer: 1
tolerance: 0
> $RCO = ET \cdot Q_DQ_CQ_BQ_A = 1 \cdot 1 = 1$. $EP$ stops counting but doesn't affect
> $RCO$.

? Three 74HC161 cascaded with synchronous parallel carry: what is the modulus?
answer: 4096
tolerance: 0
> $16 \times 16 \times 16 = 4096 = 2^{12}$.

? In the serial 100-ary counter (two 74HC160), why does RCO of the first chip go through an inverter to the second chip's CP?
- [x] So the second chip counts when the units go from 9 to 0, not when they reach 9
- [ ] Because RCO is active low
- [ ] To make the circuit synchronous
> $RCO_1$ rises at 9 and falls at the 10th pulse. The 160 counts on rising edges, so the
> inverter turns that falling edge into the rising edge that moves the tens digit.
:::

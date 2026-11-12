---
title: Decoders and the 74HC138
zh: 译码器与74HC138
summary: Turning a binary code back into one active line - the binary (minterm) decoder, the 74HC138 3-line-to-8-line decoder with its enables and function table, address decoding, two 138s cascaded into a 4-line-to-16-line decoder, and realising any logic function with a 138 plus one NAND or AND gate.
source: 第5章 组合逻辑电路 5.6 译码器 (teacher's slides 51–59)
---

An encoder squeezes "which line is active" into a short binary number. A decoder does
the opposite: it reads a binary number and switches on the one output line that the
number names. That sounds like a small job, but it is everywhere: a processor uses a
decoder to pick which memory chip or peripheral it is talking to, and, because a
decoder's outputs are exactly the minterms of its inputs, one decoder plus one gate
can build *any* logic function of three variables. That last trick is the most
important thing in this lesson: the exam gives you a drawn 74HC138 and asks you to wire
it, plus a gate, to realise a function.

## What a decoder does

Think of a hotel corridor with eight rooms numbered 0 to 7 and a three-switch panel at
the end. Set the switches to a binary number, say 101, and the light comes on in room 5,
and only in room 5. The panel is the input code; the rooms are the outputs; the decoder
is the wiring that makes "101" mean "room 5".

::: define Decoding | 译码
Translating a binary code back into the signal it stands for: the reverse of encoding.
:::

::: define Decoder | 译码器
A combinational circuit that turns each input binary code into its own output signal (a
high or low level on one particular output line), or into another code.
:::

The simplest and most useful kind gives one output line for every possible input code.

::: define Binary decoder | 二进制译码器
A decoder with $n$ input lines and $N = 2^n$ output lines, of which exactly one is active
for each input code. Also called an $n$-line-to-$2^n$-line decoder ($n$线-$2^n$线译码器)
or a one-of-$N$ decoder (N中取一译码器).
:::

The input lines are called {{term address inputs | 地址输入端}}: the code "addresses" one
output, the way a house number addresses one house.

### A 2-line-to-4-line decoder from gates

Take two inputs $A_1A_0$ and four outputs $Y_0 \dots Y_3$, active high. Output $Y_i$
should be 1 exactly when the input code equals $i$:

| Input $A_1$ | Input $A_0$ | Output $Y_0$ | Output $Y_1$ | Output $Y_2$ | Output $Y_3$ |
|---|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 |

Each column has a single 1, so each output is a single product term:
$Y_0 = \overline{A_1}\,\overline{A_0}$, $Y_1 = \overline{A_1}A_0$, $Y_2 = A_1\overline{A_0}$,
$Y_3 = A_1A_0$. These are exactly the four minterms of $A_1, A_0$ (recall: a minterm is a
product containing every variable once, true in exactly one row). So $Y_i = m_i$: four
AND gates and two inverters.

::: logic A 2-line-to-4-line decoder: exactly one output is 1
inputs: A1 A0
Y0 = A1' A0'
Y1 = A1' A0
Y2 = A1 A0'
Y3 = A1 A0
:::

::: callout key A binary decoder is a minterm generator
Each output of an $n$-input binary decoder is one minterm of the inputs: $Y_i = m_i$
(active-high outputs) or $\overline{Y_i} = \overline{m_i}$ (active-low outputs). That is why
binary decoders are also called {{term minterm decoders | 最小项译码器}}.
:::

Real chips make their outputs **active low** (the selected line goes to 0, the rest stay
at 1) because NAND gates are cheaper and faster than AND gates in TTL and CMOS. That is
the case for the 74HC138 below.

## The 74HC138 3-line-to-8-line decoder

The 74HC138 (also sold as the 74LS138: same pins, same function) is a 3-line-to-8-line
binary decoder. Its inputs are active high and its outputs active low
(输入高电平有效，输出低电平有效).

### What's inside

The slide's internal diagram has three parts:

1. **Input buffer** (输入缓冲). Each address input $B_2$, $B_1$, $B_0$ passes through two
   inverters in series, giving both $\overline{B_i}$ (after the first) and a buffered $B_i$
   (after the second). Every gate inside can then pick the true or inverted form it needs.
2. **Decoding** (译码). Eight NAND gates, one per output. Gate $i$ takes the three
   literals that make up minterm $m_i$, plus the enable signal $EN$. Its output is
   $\overline{Y_i}$.
3. **Enable control** (使能控制). A three-input AND gate makes $EN$ from the three enable
   pins $E_3$, $\overline{E_1}$ and $\overline{E_2}$.

::: define Enable | 使能
A control input that switches a chip on or off as a whole. When the chip is disabled,
its outputs sit at their inactive level whatever the other inputs are.
:::

The 138 has three enable pins: $E_3$ is active high, $\overline{E_1}$ and $\overline{E_2}$ are
active low (the bar in the name, and a bubble on the symbol, mean "active when 0"). The
chip works only when all three are active at once:

::: formula 74HC138 enable | 74HC138的使能控制
$$EN = E_3\cdot\overline{\overline{E_1}}\cdot\overline{\overline{E_2}} = E_3E_2E_1$$
--
E_3 | enable pin, active high: must be 1 |
\overline{E_1}, \overline{E_2} | enable pins, active low: must both be 0 |
EN | internal enable: 1 means the decoder works normally (译码器正常工作) |
:::

The double bar just says "the pin is called $\overline{E_1}$; invert it to get the
condition $E_1$". In words: $E_3 = 1$, $\overline{E_1} = 0$, $\overline{E_2} = 0$.

### The function table

| Pin $E_3$ | Pins $\overline{E_2}+\overline{E_1}$ | Address $B_2$ | Address $B_1$ | Address $B_0$ | Output that goes low |
|---|---|---|---|---|---|
| 0 | × | × | × | × | none (all eight are 1) |
| × | 1 | × | × | × | none (all eight are 1) |
| 1 | 0 | 0 | 0 | 0 | $\overline{Y_0}$ |
| 1 | 0 | 0 | 0 | 1 | $\overline{Y_1}$ |
| 1 | 0 | 0 | 1 | 0 | $\overline{Y_2}$ |
| 1 | 0 | 0 | 1 | 1 | $\overline{Y_3}$ |
| 1 | 0 | 1 | 0 | 0 | $\overline{Y_4}$ |
| 1 | 0 | 1 | 0 | 1 | $\overline{Y_5}$ |
| 1 | 0 | 1 | 1 | 0 | $\overline{Y_6}$ |
| 1 | 0 | 1 | 1 | 1 | $\overline{Y_7}$ |

In each working row the named output is 0 and the other seven are 1. The slide prints
the full 8-column table: a diagonal of 0s in a sea of 1s. (The slide's function table
names the address inputs $A_2A_1A_0$ and the logic symbol names them $B_2B_1B_0$; they
are the same pins. This lesson uses $B_2B_1B_0$ throughout, so that they don't clash with
the variables $A$, $B$, $C$ of the design examples.) $B_2$ is the most significant bit.

The column "$\overline{E_2}+\overline{E_1}$" is a compact way of saying "at least one of the
two active-low enables is 1": if either is high, the chip is off.

### Outputs as inverted minterms

With the chip enabled ($E_3 = 1$, $\overline{E_1} = \overline{E_2} = 0$), each output is the
NAND of one minterm:

$$\begin{aligned}
\overline{Y_0} &= \overline{\overline{B_2}\,\overline{B_1}\,\overline{B_0}} = \overline{m_0}, &
\overline{Y_1} &= \overline{\overline{B_2}\,\overline{B_1}B_0} = \overline{m_1}, \\
\overline{Y_2} &= \overline{\overline{B_2}B_1\overline{B_0}} = \overline{m_2}, &
\overline{Y_3} &= \overline{\overline{B_2}B_1B_0} = \overline{m_3}, \\
\overline{Y_4} &= \overline{B_2\overline{B_1}\,\overline{B_0}} = \overline{m_4}, &
\overline{Y_5} &= \overline{B_2\overline{B_1}B_0} = \overline{m_5}, \\
\overline{Y_6} &= \overline{B_2B_1\overline{B_0}} = \overline{m_6}, &
\overline{Y_7} &= \overline{B_2B_1B_0} = \overline{m_7}.
\end{aligned}$$

::: formula 74HC138 outputs | 74HC138的输出表达式
$$\overline{Y_i} = \overline{m_i\cdot EN} \qquad\text{and, when enabled,}\qquad \overline{Y_i} = \overline{m_i}\quad(i = 0,\dots,7)$$
--
\overline{Y_i} | output pin $i$, active low |
m_i | minterm $i$ of the address inputs $B_2B_1B_0$ ($B_2$ most significant) |
EN | the internal enable, $E_3\overline{\overline{E_1}}\,\overline{\overline{E_2}}$ |
:::

On the logic symbol (a box marked BIN/OCT, "binary to octal") the address inputs
$B_0, B_1, B_2$ and the enables $E_3$, $E_1$, $E_2$ are on the left, with bubbles on $E_1$
and $E_2$; the outputs $Y_0 \dots Y_7$ are on the right, each with a bubble. A bubble on a
pin is the drawing's way of writing the bar.

Try the chip below. The switches named E1 and E2 stand for the pins $\overline{E_1}$ and
$\overline{E_2}$, and the lamps Y0 to Y7 are the pins $\overline{Y_0} \dots \overline{Y_7}$, so the
selected lamp is the one that goes **dark**.

::: logic The 74HC138 (switch E3 on and E1, E2 off to enable it; the selected output goes to 0)
inputs: E3 E1 E2 B2 B1 B0
Y0 = (E3 E1' E2' B2' B1' B0')'
Y1 = (E3 E1' E2' B2' B1' B0)'
Y2 = (E3 E1' E2' B2' B1 B0')'
Y3 = (E3 E1' E2' B2' B1 B0)'
Y4 = (E3 E1' E2' B2 B1' B0')'
Y5 = (E3 E1' E2' B2 B1' B0)'
Y6 = (E3 E1' E2' B2 B1 B0')'
Y7 = (E3 E1' E2' B2 B1 B0)'
:::

::: example Reading a 74HC138
Find all eight outputs in each case: (a) $E_3 = 1$, $\overline{E_1} = 0$, $\overline{E_2} = 0$,
$B_2B_1B_0 = 110$; (b) the same address but $\overline{E_2} = 1$; (c) $E_3 = 0$.
== (a) Enabled ==
$EN = 1\cdot\overline{0}\cdot\overline{0} = 1$. The address $110_2 = 6$, so
$\overline{Y_6} = \overline{m_6} = 0$ and the other seven outputs are 1:
$\overline{Y_7}\dots\overline{Y_0} = 1011\,1111$.
== (b) An active-low enable is high ==
$EN = 1\cdot\overline{1}\cdot\overline{0} = 0$: the chip is off and all eight outputs are 1,
whatever the address.
== (c) The active-high enable is low ==
$EN = 0$ again: all outputs are 1.
:::

::: callout pitfall Two kinds of enable, and outputs that are low when chosen
$E_3$ must be **1**, but $\overline{E_1}$ and $\overline{E_2}$ must be **0**. A very common slip
is to tie all three to 1 (the chip is then off) or all three to 0 (off again). And the
selected output is the one that is **0**: if you read the outputs as active high you get
the complement of every answer.
:::

## Application 1: address decoding in a microprocessor

A microprocessor shares one 8-bit data bus (8位数据总线, $D_0 \sim D_7$) with all its
peripherals (外设). Only one of them may drive the bus at a time, so each peripheral has a
{{term chip select | 片选}} input $\overline{CS}$ (active low): the peripheral listens only
while its $\overline{CS}$ is 0.

The slide connects the top three address lines $A_{15}$, $A_{14}$, $A_{13}$ to a 74LS138's
address inputs and ties its enables on ($E_3 = 1$, $\overline{E_1} = \overline{E_2} = 0$). The
138's eight outputs go to the $\overline{CS}$ pins of peripherals 1 to 8. Since exactly one
output is low at a time, exactly one peripheral is selected, and which one depends only
on the top three bits of the address. The lower lines $A_{12} \dots A_0$ go to the
peripherals themselves (to pick a register or memory cell inside the chosen one).

| 138 pin | Connected to |
|---|---|
| $B_2$, $B_1$, $B_0$ | address lines $A_{15}$, $A_{14}$, $A_{13}$ |
| $E_3$ | 1 |
| $\overline{E_1}$, $\overline{E_2}$ | 0 |
| $\overline{Y_0}$ | $\overline{CS}$ of peripheral 1 |
| $\overline{Y_1}$ | $\overline{CS}$ of peripheral 2 |
| … | … |
| $\overline{Y_7}$ | $\overline{CS}$ of peripheral 8 |

::: callout note Which line is the top bit
The slide doesn't label which of $A_{15}$, $A_{14}$, $A_{13}$ goes to which address pin.
The natural choice, used here, keeps the order: $A_{15}$ (the processor's most
significant line) to $B_2$ (the decoder's most significant input).
:::

::: example Which peripheral answers?
With the connections above, the processor reads address $5A3C$ (hexadecimal). Which
peripheral is selected, and what address range does that peripheral occupy?
== Write the address in binary ==
$5A3C_{16} = 0101\;1010\;0011\;1100_2$. The top three bits are $A_{15}A_{14}A_{13} = 010$.
== Decode ==
$B_2B_1B_0 = 010 = 2$, so $\overline{Y_2} = 0$: **peripheral 3** is selected (it is wired to
$\overline{Y_2}$).
== Its range ==
Every address beginning 010 selects it: from $010\,0\,0000\,0000\,0000_2 = 4000_{16}$ to
$010\,1\,1111\,1111\,1111_2 = 5FFF_{16}$. That is $2^{13} = 8192$ addresses (the 13 free
lines $A_{12} \dots A_0$), the same for each of the eight peripherals.
:::

## Application 2: cascading two 138s into a 4-line-to-16-line decoder

One 138 decodes 3 bits. For 4 bits ($B_3B_2B_1B_0$, sixteen outputs) use two 138s and let
the fourth bit decide which chip is awake. The enables make this free: no extra gates.

| Pin | Chip (I), outputs $\overline{Y_0} \dots \overline{Y_7}$ | Chip (II), outputs $\overline{Y_8} \dots \overline{Y_{15}}$ |
|---|---|---|
| $B_2$, $B_1$, $B_0$ | $B_2$, $B_1$, $B_0$ (shared) | $B_2$, $B_1$, $B_0$ (shared) |
| $E_3$ | 1 | $B_3$ |
| $\overline{E_1}$ | 0 | 0 |
| $\overline{E_2}$ | $B_3$ | 0 |

::: law How the 4-to-16 cascade works | 译码器的级联
The highest bit $B_3$ drives an active-low enable of chip (I) and the active-high enable
of chip (II). $B_3 = 0$ enables chip (I) only, which decodes $B_2B_1B_0$ onto
$\overline{Y_0} \dots \overline{Y_7}$; $B_3 = 1$ enables chip (II) only, onto
$\overline{Y_8} \dots \overline{Y_{15}}$. Chip (II)'s output $k$ is the 16-line decoder's
output $8 + k$.
:::

::: example Decoding 1101 and 0110
Which output of the cascade is low for $B_3B_2B_1B_0 = 1101$? And for $0110$?
== 1101 ==
$B_3 = 1$: chip (I) has $\overline{E_2} = 1$, so it is off (all 1s). Chip (II) has $E_3 = 1$ and
both active-low enables at 0, so it works. Its address is $101 = 5$, so its $Y_5$ pin goes
low. That pin is labelled $\overline{Y_{13}}$: $8 + 5 = 13 = 1101_2$. ✓
== 0110 ==
$B_3 = 0$: chip (II) has $E_3 = 0$, off. Chip (I) has $\overline{E_2} = 0$, on. Address $110 = 6$:
$\overline{Y_6} = 0$.
:::

::: callout tip Why one chip's E2 and the other's E3
The trick needs one signal that is "active" for one chip and "inactive" for the other.
An active-low enable and an active-high enable, both driven by $B_3$, give exactly that,
with no inverter.
:::

## Application 3: realising any logic function

Here is the idea that the exam builds its biggest question on.

::: law Realising functions with a binary decoder | 用译码器实现组合逻辑函数
An $n$-bit binary decoder outputs all $2^n$ minterms of its $n$ inputs. Any logic function
of at most $n$ variables is a sum of minterms, so combining the right decoder outputs in
one gate realises it. With active-low outputs ($\overline{Y_i} = \overline{m_i}$) the gate is a
NAND over the function's minterms, or an AND over the minterms it doesn't contain.
:::

Why a NAND? Write the function as a sum of its minterms and apply De Morgan once:

$$Y = m_a + m_b + m_c = \overline{\overline{m_a + m_b + m_c}} = \overline{\overline{m_a}\cdot\overline{m_b}\cdot\overline{m_c}} = \overline{\overline{Y_a}\cdot\overline{Y_b}\cdot\overline{Y_c}} .$$

So feed the outputs $\overline{Y_a}$, $\overline{Y_b}$, $\overline{Y_c}$ into a NAND gate.

Why an AND also works? $\overline{Y}$ is the sum of the *other* minterms (the rows where
$Y = 0$), so $Y = \overline{\overline{Y}} = \overline{m_p + m_q + \dots} = \overline{m_p}\cdot\overline{m_q}\cdots$:
feed the outputs of the minterms **not** in $Y$ into an AND gate.

::: formula Function from a 74HC138 | 74HC138实现逻辑函数
$$Y = \sum_{i \in S} m_i = \overline{\prod_{i \in S}\overline{Y_i}} \qquad\text{or}\qquad Y = \prod_{j \notin S}\overline{Y_j}$$
--
S | the set of minterm numbers where $Y = 1$ |
\overline{Y_i} | the 138's outputs for those minterms: into a NAND gate |
\overline{Y_j} | the outputs for the remaining minterms ($Y = 0$): into an AND gate instead |
:::

::: law Steps for a 138 design | 74HC138设计步骤
1. Connect the variables to the address inputs, the most significant one ($A$) to $B_2$,
   then $B$ to $B_1$, $C$ to $B_0$; tie $E_3 = 1$, $\overline{E_1} = \overline{E_2} = 0$.
2. Write the function in standard sum-of-minterms form, $Y = \sum m(\dots)$, with the
   minterm numbers taken in that same variable order.
3. Feed $\overline{Y_i}$ for those minterms into a NAND gate (or the other outputs into an
   AND gate). Its output is $Y$.
:::

### The slide's example: P = AC + BC

::: example Realise P = AC + BC with a 74HC138 and a NAND or an AND gate (例)
== Standard form ==
Each term is missing one variable; multiply it in. $AC = AC(B + \overline{B}) = ABC + A\overline{B}C$
and $BC = BC(A + \overline{A}) = ABC + \overline{A}BC$. Dropping the repeated $ABC$:
$$P = A\overline{B}C + ABC + \overline{A}BC = m_5 + m_7 + m_3 = \textstyle\sum m(3,5,7).$$
== With a NAND gate ==
$$P = \overline{\overline{\textstyle\sum m(3,5,7)}} = \overline{\overline{m_3}\cdot\overline{m_5}\cdot\overline{m_7}} = \overline{\overline{Y_3}\cdot\overline{Y_5}\cdot\overline{Y_7}}$$
A 3-input NAND gate on $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_7}$.
== With an AND gate ==
The rows where $P = 0$ are the other five: $\overline{P} = \sum m(0,1,2,4,6)$, so
$$P = \overline{\textstyle\sum m(0,1,2,4,6)} = \overline{m_0}\cdot\overline{m_1}\cdot\overline{m_2}\cdot\overline{m_4}\cdot\overline{m_6} .$$
A 5-input AND gate on $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_2}$, $\overline{Y_4}$, $\overline{Y_6}$.
== Wiring (both versions) ==
| 138 pin | Connected to |
|---|---|
| $B_2$ | $A$ |
| $B_1$ | $B$ |
| $B_0$ | $C$ |
| $E_3$ | 1 |
| $\overline{E_1}$, $\overline{E_2}$ | 0 |
| $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_7}$ | the NAND gate's inputs (NAND version; the rest unused) |
| $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_2}$, $\overline{Y_4}$, $\overline{Y_6}$ | the AND gate's inputs (AND version; the rest unused) |
:::

The map shows the same three 1s:

::: kmap P
vars: A B C
ones: 3 5 7
group: A C
group: B C
:::

The two circuits side by side: with the variables on the address inputs, both columns
agree with $AC + BC$ on every row.

::: logic P = AC + BC: the NAND version and the AND version against the expression
inputs: A B C
Pnand = ((A' B C)' (A B' C)' (A B C)')'
Pand = (A' B' C')' (A' B' C)' (A' B C')' (A B' C')' (A B C')'
P = A C + B C
:::

::: callout tip NAND or AND: pick the smaller gate
Count the 1s of the function. Fewer 1s than 0s: use a NAND on the 1s' outputs. Fewer 0s:
use an AND on the 0s' outputs. Either is correct; the slide shows both.
:::

### The slide's in-class question

::: example Y = AB + BC with a 74LS138 and one AND gate (单选题)
Which 74LS138 outputs go to the AND gate's inputs? (A) $\overline{Y_3}\,\overline{Y_6}\,\overline{Y_7}$;
(B) $\overline{Y_3}\,\overline{Y_5}\,\overline{Y_7}$; (C) $\overline{Y_0}\,\overline{Y_1}\,\overline{Y_2}\,\overline{Y_4}\,\overline{Y_5}$.
== Standard form ==
$AB = AB\overline{C} + ABC = m_6 + m_7$; $BC = \overline{A}BC + ABC = m_3 + m_7$. So
$Y = \sum m(3,6,7)$ (with $A \to B_2$, $B \to B_1$, $C \to B_0$).
== An AND gate takes the zeros ==
$\overline{Y} = \sum m(0,1,2,4,5)$, so $Y = \overline{m_0}\,\overline{m_1}\,\overline{m_2}\,\overline{m_4}\,\overline{m_5}$:
the AND gate takes $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_2}$, $\overline{Y_4}$, $\overline{Y_5}$.
**Answer (C).**
== Why not the others ==
(A) holds the right minterms but suits a **NAND** gate; in an AND gate it gives
$\overline{m_3}\,\overline{m_6}\,\overline{m_7} = \overline{Y}$, the complement. (B) is the minterm list
of $AC + BC$ from the previous example, a different function.
:::

### More design examples

::: example Two variables: Y = A ⊕ B on a 138
Realise $Y = A \oplus B$ with a 74HC138 and a NAND gate.
== Use two address inputs, ground the third ==
Only two variables, so tie $B_2 = 0$ and connect $A \to B_1$, $B \to B_0$. The address is
then $0AB$, and only $\overline{Y_0} \dots \overline{Y_3}$ can ever go low.
== Minterms ==
$Y = \overline{A}B + A\overline{B}$: rows $AB = 01$ and $10$, i.e. addresses $001 = 1$ and
$010 = 2$. $Y = \overline{\overline{Y_1}\cdot\overline{Y_2}}$.
== Another wiring, other numbers ==
Had we used $A \to B_2$, $B \to B_1$ and $B_0 = 0$, the address would be $AB0$: rows 01
and 10 become $010 = 2$ and $100 = 4$, and the NAND would take $\overline{Y_2}$, $\overline{Y_4}$.
Both are right: **the minterm numbers follow the wiring**.
:::

::: callout pitfall Minterm numbers depend on which variable goes where
$\overline{Y_i}$ is minterm $i$ of $B_2B_1B_0$, with $B_2$ the most significant. If $A$ goes to
$B_0$ instead of $B_2$, the same function has different minterm numbers. Decide the
wiring first, write it down, and number the minterms in that order.
:::

::: example A product of sums: Y = (A + B)(A' + C)
Realise $Y = (A + B)(\overline{A} + C)$ with a 74HC138 and one gate.
== Expand ==
$Y = A\overline{A} + AC + \overline{A}B + BC = AC + \overline{A}B + BC$. The term $BC$ is the
consensus of $AC$ and $\overline{A}B$, so $Y = AC + \overline{A}B$.
== Minterms ==
$\overline{A}B = m_2 + m_3$ (rows 010, 011) and $AC = m_5 + m_7$ (rows 101, 111):
$Y = \sum m(2,3,5,7)$.
== Gate ==
Four 1s and four 0s: either gate has four inputs. NAND: $Y = \overline{\overline{Y_2}\,\overline{Y_3}\,\overline{Y_5}\,\overline{Y_7}}$.
AND: $Y = \overline{Y_0}\,\overline{Y_1}\,\overline{Y_4}\,\overline{Y_6}$.
== Check one row ==
$A = 1$, $B = 0$, $C = 0$: $(1 + 0)(0 + 0) = 0$. Address $100 = 4$, which is not in
$\{2,3,5,7\}$, so the NAND's inputs are all 1 and its output is 0. ✓
:::

A decoder's real advantage over a selector (next lessons) is that its outputs can be
shared: one 138 can drive several gates, one per function, so it handles
**multiple-output** functions.

::: example A full adder from one 138 and two NAND gates
Build a full adder (sum $S_i$, carry $C_i$, from the adders lesson) with a 74HC138.
== Wiring ==
$A_i \to B_2$, $B_i \to B_1$, $C_{i-1} \to B_0$; enables on.
== Minterms ==
From the full adder's truth table, $S_i = \sum m(1,2,4,7)$ and $C_i = \sum m(3,5,6,7)$.
== Two NAND gates ==
$S_i = \overline{\overline{Y_1}\,\overline{Y_2}\,\overline{Y_4}\,\overline{Y_7}}$ and
$C_i = \overline{\overline{Y_3}\,\overline{Y_5}\,\overline{Y_6}\,\overline{Y_7}}$. Output $\overline{Y_7}$
(all three inputs 1) feeds both gates.
== Check ==
$A_i = 0$, $B_i = 1$, $C_{i-1} = 1$: address $011 = 3$, $\overline{Y_3} = 0$. The sum's NAND
has inputs 1,1,1,1, so $S_i = 0$; the carry's NAND has a 0 input, so $C_i = 1$. Indeed
$0 + 1 + 1 = 10_2$. ✓
:::

::: logic A full adder from a 74HC138 (A, B, C on B2, B1, B0) against the adder formulas
inputs: A B C
S = ((A' B' C)' (A' B C')' (A B' C')' (A B C)')'
Co = ((A' B C)' (A B' C)' (A B C')' (A B C)')'
Sref = A ⊕ B ⊕ C
Cref = A B + A C + B C
:::

### Four variables

A 138 has only three address inputs, so a function of four variables needs one of two
tricks.

::: example Four variables with two 138s: "is the 4-bit number prime?"
$F(A, B, C, D) = 1$ when $ABCD$ (as a binary number, $A$ the top bit) is prime. Realise
it with the 4-line-to-16-line cascade and a NAND gate.
== Minterms ==
The primes from 0 to 15 are 2, 3, 5, 7, 11, 13: $F = \sum m(2,3,5,7,11,13)$.
== Wiring ==
$A \to B_3$ (chip (I)'s $\overline{E_2}$ and chip (II)'s $E_3$), $B \to B_2$, $C \to B_1$,
$D \to B_0$ (both chips).
== The gate ==
A 6-input NAND on $\overline{Y_2}$, $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_7}$ (chip (I)'s
outputs 2, 3, 5, 7) and $\overline{Y_{11}}$, $\overline{Y_{13}}$ (chip (II)'s outputs 3 and 5).
== Check ==
$ABCD = 1001 = 9$: chip (II) works with address $001$, so only $\overline{Y_9}$ is low, which
isn't one of the NAND's inputs: $F = 0$. Right, $9 = 3 \times 3$.
:::

::: example Four variables with one 138: the enable as a variable
Realise $F = D(AB + BC)$ with one 74HC138 and one NAND gate.
== Use an enable ==
$F$ is 0 whenever $D = 0$. Put $D$ on the active-high enable: $E_3 = D$,
$\overline{E_1} = \overline{E_2} = 0$. Now $\overline{Y_i} = \overline{m_i\cdot D}$.
== The rest ==
For $D = 1$ the chip decodes $A, B, C$ (on $B_2, B_1, B_0$) as usual, and
$AB + BC = \sum m(3,6,7)$ (from the in-class question): NAND on $\overline{Y_3}$, $\overline{Y_6}$,
$\overline{Y_7}$.
== Check D = 0 ==
The chip is off, all outputs are 1, the NAND gives 0. ✓ So
$F = \overline{\overline{m_3D}\cdot\overline{m_6D}\cdot\overline{m_7D}} = D(m_3 + m_6 + m_7)$.
:::

The same idea with $\overline{E_1} = D$ gives functions of the form $\overline{D}\cdot(\dots)$.
A general four-variable function, though, needs the two-chip cascade.

::: callout note How many variables a decoder can handle
A binary decoder with $n$ address inputs realises any function of up to $n$ variables
(with one gate per output function). The 138 handles any 3-variable function and, with
the help of its enables, some 4-variable ones.
:::

::: callout exam The 138 is the key topic
The teacher's scope says to master the 138: analyse a circuit built on it **and** design
one. Expect a drawn 74HC138 next to an empty gate: connect the variables to $B_2B_1B_0$
(in order), set $E_3 = 1$ and $\overline{E_1} = \overline{E_2} = 0$, write $Y = \sum m(\dots)$, and wire
the right outputs to the NAND (the 1s) or the AND (the 0s). In analysis questions, work
backwards: list which outputs feed the gate, turn them into minterms, and simplify. State
the expression before drawing; marks go to the working.
:::

::: cards Decoders and the 74HC138
Decoder (译码器) :: Turns each input code into its own output signal; the reverse of an encoder.
Binary decoder (二进制译码器) :: $n$ inputs, $2^n$ outputs, exactly one active per input code.
Why "minterm decoder" (最小项译码器) :: Each output is one minterm of the inputs: $Y_i = m_i$ or $\overline{Y_i} = \overline{m_i}$.
74HC138 / 74LS138 :: 3-line-to-8-line decoder; inputs active high, outputs active low.
74HC138 enable condition :: $E_3 = 1$ and $\overline{E_1} = \overline{E_2} = 0$; otherwise all outputs are 1.
74HC138 output when enabled :: $\overline{Y_i} = \overline{m_i}$ of $B_2B_1B_0$ ($B_2$ most significant).
74HC138 with $B_2B_1B_0 = 101$ :: $\overline{Y_5} = 0$, the other seven are 1.
4-to-16 cascade :: $B_3$ to chip (I)'s $\overline{E_2}$ and chip (II)'s $E_3$; low half on (I), high half on (II).
Address decoding :: Top address lines into a 138; each output drives one peripheral's $\overline{CS}$.
Function with a 138 and a NAND :: NAND the outputs $\overline{Y_i}$ of the function's minterms.
Function with a 138 and an AND :: AND the outputs of the minterms where the function is 0.
$P = AC + BC$ on a 138 :: $\sum m(3,5,7)$: NAND of $\overline{Y_3}, \overline{Y_5}, \overline{Y_7}$, or AND of $\overline{Y_0}, \overline{Y_1}, \overline{Y_2}, \overline{Y_4}, \overline{Y_6}$.
Full adder on one 138 :: $S$: NAND of $\overline{Y_1}, \overline{Y_2}, \overline{Y_4}, \overline{Y_7}$; $C$: NAND of $\overline{Y_3}, \overline{Y_5}, \overline{Y_6}, \overline{Y_7}$.
How many variables a binary decoder realises :: Up to $n$ (its number of address inputs), with several outputs if needed.
:::

::: quiz Decoders and the 74HC138
? A 74HC138 has $E_3 = 1$, $\overline{E_1} = 0$, $\overline{E_2} = 0$ and $B_2B_1B_0 = 011$. Which output is 0?
- [x] $\overline{Y_3}$ only
- [ ] $\overline{Y_6}$ only
- [ ] Every output except $\overline{Y_3}$
- [ ] None: all outputs are 1
> Enabled ($EN = 1$). The address $011_2 = 3$ selects $\overline{Y_3} = \overline{m_3} = 0$; the
> outputs are active low, so the other seven stay at 1. ($\overline{Y_6}$ would be the answer
> if you read $B_0$ as the top bit.)

? A 74HC138 has $E_3 = 1$, $\overline{E_1} = 1$, $\overline{E_2} = 0$ and $B_2B_1B_0 = 000$. What are the outputs?
- [x] All eight are 1
- [ ] $\overline{Y_0} = 0$, the rest 1
- [ ] All eight are 0
> $\overline{E_1}$ is active low and it is 1, so $EN = E_3\overline{\overline{E_1}}\,\overline{\overline{E_2}} = 1\cdot0\cdot1 = 0$.
> A disabled 138 holds every output at its inactive level, 1.

? Y = AB + BC is realised with a 74LS138 ($A \to B_2$, $B \to B_1$, $C \to B_0$) and one AND gate. Which outputs go to the AND gate? (in-class question) {#inclass-138-and}
- [ ] $\overline{Y_3}$, $\overline{Y_6}$, $\overline{Y_7}$
- [ ] $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_7}$
- [x] $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_2}$, $\overline{Y_4}$, $\overline{Y_5}$
> $Y = AB\overline{C} + ABC + \overline{A}BC = \sum m(3,6,7)$, so $\overline{Y} = \sum m(0,1,2,4,5)$ and
> $Y = \overline{m_0}\,\overline{m_1}\,\overline{m_2}\,\overline{m_4}\,\overline{m_5}$: an AND of those five outputs.
> $\overline{Y_3}$, $\overline{Y_6}$, $\overline{Y_7}$ would go to a NAND gate instead.

? A 74HC138 is enabled with $A \to B_2$, $B \to B_1$, $C \to B_0$, and a NAND gate takes $\overline{Y_0}$, $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_6}$. Write the NAND's output $Y$ in terms of $A$, $B$, $C$.
logic: (A ⊕ B ⊕ C)'
variables: A, B, C
> $Y = \overline{\overline{m_0}\,\overline{m_3}\,\overline{m_5}\,\overline{m_6}} = m_0 + m_3 + m_5 + m_6 =
> \overline{A}\,\overline{B}\,\overline{C} + \overline{A}BC + A\overline{B}C + AB\overline{C}$. These are the rows with an
> even number of 1s: $Y = \overline{A \oplus B \oplus C}$ (an even-parity checker). Any equivalent
> form is accepted.

? The same chip, but now an AND gate takes $\overline{Y_1}$, $\overline{Y_3}$, $\overline{Y_5}$, $\overline{Y_7}$. Write its output $Y$.
logic: C'
variables: A, B, C
> An AND of $\overline{m_1}\,\overline{m_3}\,\overline{m_5}\,\overline{m_7}$ is the complement of
> $m_1 + m_3 + m_5 + m_7$, so $Y = \sum m(0,2,4,6)$: every row with $C = 0$. $Y = \overline{C}$.

? Realise $Y = \overline{A}\,\overline{B} + ABC$ with an enabled 74HC138 ($A \to B_2$, $B \to B_1$, $C \to B_0$) and a NAND gate. Which outputs feed the NAND?
- [x] $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_7}$
- [ ] $\overline{Y_0}$, $\overline{Y_7}$
- [ ] $\overline{Y_2}$, $\overline{Y_3}$, $\overline{Y_4}$, $\overline{Y_5}$, $\overline{Y_6}$
> $\overline{A}\,\overline{B} = \overline{A}\,\overline{B}\,\overline{C} + \overline{A}\,\overline{B}C = m_0 + m_1$ and
> $ABC = m_7$, so $Y = \sum m(0,1,7)$ and the NAND takes $\overline{Y_0}$, $\overline{Y_1}$, $\overline{Y_7}$.
> Forgetting to expand $\overline{A}\,\overline{B}$ loses $m_1$. The third list would go to an AND gate.

? In the 4-line-to-16-line cascade of two 74HC138, the input is $B_3B_2B_1B_0 = 1011$. Which numbered output $\overline{Y_k}$ of the 16-line decoder goes low? Give $k$.
answer: 11
tolerance: 0
> $B_3 = 1$ turns chip (I) off (its $\overline{E_2} = 1$) and chip (II) on (its $E_3 = 1$). Chip (II)
> decodes $011 = 3$, and its output 3 is labelled $\overline{Y_{8+3}} = \overline{Y_{11}}$.

? In the 4-to-16 cascade, what is connected to chip (II)'s $E_3$ pin?
- [x] $B_3$, the highest input bit
- [ ] Logic 1
- [ ] $\overline{B_3}$, through an inverter
> $B_3$ goes to chip (I)'s active-low $\overline{E_2}$ and chip (II)'s active-high $E_3$, so
> exactly one chip works for each value of $B_3$, with no inverter needed.

? A processor's lines $A_{15}A_{14}A_{13}$ drive a 74LS138's $B_2B_1B_0$, and $\overline{Y_k}$ selects peripheral $k + 1$. Which peripheral responds to address $C000$ (hex)?
answer: 7
tolerance: 0
> $C000_{16} = 1100\,0000\,0000\,0000_2$, so $A_{15}A_{14}A_{13} = 110 = 6$, and $\overline{Y_6} = 0$
> selects peripheral $6 + 1 = 7$.

? How many 74HC138 outputs are 0 at once when the chip is enabled?
answer: 1
tolerance: 0
> A binary decoder selects exactly one of its $2^n$ outputs for each input code: one 0
> among eight outputs.
:::

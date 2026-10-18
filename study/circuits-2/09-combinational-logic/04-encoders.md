---
title: Encoders
zh: 编码器
summary: Turning "which line is active" into a binary code - the binary encoder for four keys, the priority encoder, the 74LS148 8-line-to-3-line priority encoder with its enable and status outputs, and two 74LS148 cascaded into a 16-line-to-4-line encoder.
source: 第5章 组合逻辑电路 5.5 编码器, 2026-10-15
---

A keypad has many keys but a processor would rather not have a wire for each one. An
encoder sits in between: it watches many input lines and answers with a short binary
number saying *which* one is active. Four keys need only a 2-bit code, eight keys a
3-bit code. This lesson designs small encoders by hand, first assuming only one key
is pressed at a time, then handling several at once by priority, and ends with the
standard chip, the 74LS148, and how two of them are joined to handle sixteen lines.

## What an encoder does

::: define Encoding | 编码
Representing a piece of information (a letter, a digit, a symbol, "key 3 is pressed")
by a binary code.
:::

::: define Encoder | 编码器
A combinational circuit with many inputs and several outputs that turns each active
input signal (a high or a low level) into its own binary code.
:::

Two questions come with every encoder, and the slides draw them on the block's sides:

- **Inputs: active high or active low?** (高有效？低有效？) Is a line "active" when it
  is 1, or when it is 0? Keys wired to ground with pull-up resistors are active low.
- **Outputs: which code?** (何种编码？) Plain binary, BCD, inverted binary…

## The binary encoder

::: define Binary encoder | 二进制编码器
A circuit that encodes $N = 2^n$ inputs with an $n$-bit binary code. Only one input
may be active at any moment.
:::

### Four direction keys

::: example Encoding the up, down, left and right keys (例1)
Four keys $S_0$ (up), $S_1$ (down), $S_2$ (left), $S_3$ (right) are pressed one at a
time. Encode them as a 2-bit number $D_1D_0$, and give a flag $INT_0$ that tells the
microprocessor some key is pressed.
== The circuit's inputs ==
Each key line is pulled up to +5 V through 1 kΩ, and the key connects it to ground
(drawing below). So a key reads **0 when pressed** and 1 when released: the inputs are
active low.
== Assign variables ==
$S_0 \dots S_3$: 0 pressed, 1 released. $D_1D_0$: the key's number in binary (00 for
$S_0$ up to 11 for $S_3$). $INT_0 = 1$ when a key is pressed.
== Truth table ==
Only one key at a time means only five of the 16 input combinations can occur. The
other 11 are don't-cares (×).

| $S_3$ | $S_2$ | $S_1$ | $S_0$ | $D_1$ | $D_0$ | $INT_0$ |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 0 | 0 | 0 | 1 |
| 1 | 1 | 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 1 | 1 | 1 | 0 | 1 |
| 0 | 1 | 1 | 1 | 1 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| others | | | | × | × | × |
:::

::: circuit Four keys with pull-up resistors (S0 to S3 go to the encoder)
W 0,0 12,0
label +5V 0,0
R1 0,0 0,4 1k
R2 4,0 4,4 1k
R3 8,0 8,4 1k
R4 12,0 12,4 1k
S1 0,4 0,8 open
S2 4,4 4,8 open
S3 8,4 8,8 open
S4 12,4 12,8 open
W 0,8 12,8
G 0,8
label S0 0,4
label S1 4,4
label S2 8,4
label S3 12,4
:::

### Simplifying with the don't-cares

The maps below have rows $S_3S_2$ and columns $S_1S_0$. Only five cells are fixed; the
×s let the groups grow large.

$D_1$ is 1 for $S_2$ (cell 1011, m11) and $S_3$ (0111, m7), and 0 in m13, m14, m15.
Grouping the 1s (in-class question 12-038):

::: kmap D1
vars: S3 S2 S1 S0
ones: 7 11
dont-care: 0 1 2 3 4 5 6 8 9 10 12
group: S3'
group: S2'
:::

So $D_1 = \overline{S_3} + \overline{S_2} = \overline{S_3S_2}$. The slide gets the same
result by grouping the 0s: the whole row $S_3S_2 = 11$ gives
$\overline{D_1} = S_3S_2$.

$D_0$ is 1 for $S_1$ (1101, m13) and $S_3$ (0111, m7):

::: kmap D0
vars: S3 S2 S1 S0
ones: 7 13
dont-care: 0 1 2 3 4 5 6 8 9 10 12
group: S3'
group: S1'
:::

So $D_0 = \overline{S_3} + \overline{S_1} = \overline{S_3S_1}$ (the slide groups the 0s
m11, m14, m15 with ×s into $S_3S_1$, the same thing).

$INT_0$ is 0 only when no key is pressed (1111, m15):

::: kmap INT0
vars: S3 S2 S1 S0
ones: 7 11 13 14
dont-care: 0 1 2 3 4 5 6 8 9 10 12
group: S3'
group: S2'
group: S1'
group: S0'
:::

$INT_0 = \overline{S_3} + \overline{S_2} + \overline{S_1} + \overline{S_0} = \overline{S_3S_2S_1S_0}$.

::: formula Binary encoder for four active-low keys | 二进制编码器
$$D_1 = \overline{S_3S_2}, \qquad D_0 = \overline{S_3S_1}, \qquad INT_0 = \overline{S_3S_2S_1S_0}$$
--
S_0 \dots S_3 | key lines, 0 when pressed |
D_1D_0 | the pressed key's number |
INT_0 | flag: 1 when any key is pressed (标志信号) |
:::

Three NAND gates do it all. Try pressing one key (set it to 0) at a time; then press
two at once and see the code go wrong, which is why the next encoder exists.

::: logic The binary encoder (press = 0)
inputs: S3 S2 S1 S0
D1 = (S3 S2)'
D0 = (S3 S1)'
INT0 = (S3 S2 S1 S0)'
:::

::: callout pitfall Active-low inputs flip the map
With active-low keys, "key $S_3$ pressed" is the cell where $S_3 = 0$, the row
$S_3S_2 = 01$ (for 0111). Reading the pressed key as a 1 puts every value in the wrong
cell.
:::

## The priority encoder

What if two keys go down together? The binary encoder assumed it never happens; with
$S_1$ and $S_2$ both pressed it outputs $D_1D_0 = \overline{S_3S_2}\,\overline{S_3S_1} = 11$,
claiming key $S_3$. A priority encoder settles conflicts by rank, like a teacher who
always takes the question from the most senior hand.

::: define Priority encoder | 优先编码器
An encoder that, when several inputs are active at once, encodes only the one with
the highest priority (优先为高级信号进行编码).
:::

::: example A priority encoder for the four keys (例2)
Same keys, same pull-ups; now $S_3$ has the highest priority, then $S_2$, $S_1$, and
$S_0$ the lowest.
== Truth table ==
Here × means "either value": a lower key doesn't matter once a higher one is pressed.

| $S_3$ | $S_2$ | $S_1$ | $S_0$ | $D_1$ | $D_0$ | $INT_0$ | rows it stands for |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1110 |
| 1 | 1 | 0 | × | 0 | 1 | 1 | 1100, 1101 |
| 1 | 0 | × | × | 1 | 0 | 1 | 1000 to 1011 |
| 0 | × | × | × | 1 | 1 | 1 | 0000 to 0111 |
| 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1111 |
== No constraints ==
Every one of the 16 input combinations now has a definite output, so a priority
encoder puts **no constraint** on its inputs and its maps have no don't-cares.
== Maps ==
$D_1$ is 0 only in the row $S_3S_2 = 11$: $D_1 = \overline{S_3S_2}$, as before.
$D_0$ is 1 in the rows 00 and 01 (all with $S_3 = 0$) and in 1100, 1101:
$D_0 = \overline{S_3} + S_2\overline{S_1}$. $INT_0 = \overline{S_3S_2S_1S_0}$, as before.
:::

::: kmap D0
vars: S3 S2 S1 S0
ones: 0 1 2 3 4 5 6 7 12 13
group: S3'
group: S2 S1'
:::

::: formula Priority encoder for four active-low keys | 优先编码器
$$D_1 = \overline{S_3S_2}, \qquad D_0 = \overline{S_3} + S_2\overline{S_1}, \qquad INT_0 = \overline{S_3S_2S_1S_0}$$
--
S_3 | highest-priority key (0 when pressed) |
S_0 | lowest-priority key |
:::

Why $S_2\overline{S_1}$ and not $S_3S_2\overline{S_1}$? The full condition for code 01
is "$S_3$ and $S_2$ released, $S_1$ pressed", $S_3S_2\overline{S_1}$. But $\overline{S_3}$
is already in the sum, and $\overline{S_3} + S_3X = \overline{S_3} + X$, so the $S_3$ drops.

The circuit: a NAND for $D_1$, an inverter on $S_3$ and an AND of $S_2$ with
$\overline{S_1}$ into an OR for $D_0$, and a 4-input NAND for $INT_0$. Press several keys
(0s) and the highest one always wins:

::: logic The priority encoder (press = 0; S3 wins)
inputs: S3 S2 S1 S0
D1 = (S3 S2)'
D0 = S3' + S2 S1'
INT0 = (S3 S2 S1 S0)'
:::

::: callout key Binary vs priority encoder
A binary encoder assumes one active input at a time (the rest are don't-cares); a
priority encoder accepts any combination and encodes the highest-ranked active input.
:::

## The 74LS148 8-line-to-3-line priority encoder

Common integrated priority encoders are the decimal-to-BCD encoder 74LS147 and the
8-line-to-3-line encoder 74LS148. The 74LS148 has:

| Pin | Name | Role |
|---|---|---|
| 10, 11, 12, 13, 1, 2, 3, 4 | $\overline{I_0} \dots \overline{I_7}$ | the eight inputs, active low; $\overline{I_7}$ has the highest priority |
| 5 | $\overline{S}$ | enable input (使能输入端): 0 = work |
| 6, 7, 9 | $\overline{Y_2}, \overline{Y_1}, \overline{Y_0}$ | the 3-bit code, active low |
| 15 | $\overline{Y_S}$ | enable output (使能输出端) |
| 14 | $\overline{Y_{EX}}$ | group-signal (extension) output (组信号输出端) |

Inputs and outputs are all **active low** (逻辑0有效). The function table:

| $\overline{S}$ | $\overline{I_0}$ | $\overline{I_1}$ | $\overline{I_2}$ | $\overline{I_3}$ | $\overline{I_4}$ | $\overline{I_5}$ | $\overline{I_6}$ | $\overline{I_7}$ | $\overline{Y_2}$ | $\overline{Y_1}$ | $\overline{Y_0}$ | $\overline{Y_S}$ | $\overline{Y_{EX}}$ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | × | × | × | × | × | × | × | × | 1 | 1 | 1 | 1 | 1 |
| 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 |
| 0 | × | × | × | × | × | × | × | 0 | 0 | 0 | 0 | 1 | 0 |
| 0 | × | × | × | × | × | × | 0 | 1 | 0 | 0 | 1 | 1 | 0 |
| 0 | × | × | × | × | × | 0 | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| 0 | × | × | × | × | 0 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 |
| 0 | × | × | × | 0 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 0 |
| 0 | × | × | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 | 1 | 0 |
| 0 | × | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 | 0 |
| 0 | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 |

How to read it:

- With $\overline{S} = 1$ the chip is off: every output is 1.
- With $\overline{S} = 0$, the highest active input wins, and the code comes out
  **inverted**: $\overline{I_7}$ active gives $\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0} = 000$
  (the complement of 7 = 111), $\overline{I_5}$ gives 010 (the complement of 101), and
  $\overline{I_0}$ gives 111.
- $\overline{I_0}$ alone and "no input at all" both give code 111. The two extra outputs
  tell them apart.

::: define Enable output and group-signal output | 使能输出端与组信号输出端
On the 74LS148, $\overline{Y_S} = 0$ means "the chip is working but has no active input";
$\overline{Y_{EX}} = 0$ means "the chip is working and has an active input" (the code
outputs are valid).
:::

| $\overline{Y_S}$ | $\overline{Y_{EX}}$ | state |
|---|---|---|
| 1 | 1 | not working (disabled) |
| 0 | 1 | working, but no input |
| 1 | 0 | working, with an input |
| 0 | 0 | can't happen |

::: example Reading the 74LS148
$\overline{S} = 0$ and the inputs are $\overline{I_0} \dots \overline{I_7} = 1, 0, 1, 1, 0, 1, 1, 1$.
Find all five outputs.
== Which input wins? ==
$\overline{I_1}$ and $\overline{I_4}$ are low (active). $\overline{I_4}$ has the higher priority.
== The code ==
$4 = 100$; inverted: $\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0} = 011$.
== Status outputs ==
Working, with an input: $\overline{Y_S} = 1$, $\overline{Y_{EX}} = 0$.
:::

::: callout pitfall Two inversions to keep straight
The inputs are active low (a 0 means "this line is on") **and** the code is active low
(read it inverted). $\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0} = 011$ means line 4, not
line 3.
:::

## Two 74LS148 make a 16-line-to-4-line encoder

The task: encode sixteen active-low inputs $\overline{A_0} \dots \overline{A_{15}}$ as
0000 to 1111, with $\overline{A_{15}}$ the highest priority and $\overline{A_0}$ the lowest.

The connections (the slides number the inputs $\overline{I_0} \dots \overline{I_{15}}$):

- **Chip (II)** takes the high group $\overline{I_8} \dots \overline{I_{15}}$ on its
  $\overline{I_0} \dots \overline{I_7}$. Its $\overline{S}$ is grounded: it always works.
- **Chip (I)** takes the low group $\overline{I_0} \dots \overline{I_7}$. Its $\overline{S}$
  is connected to chip (II)'s $\overline{Y_S}$.
- $B_3 = \overline{\overline{Y_{EX}}}$ of chip (II), through an inverter.
- $B_2$, $B_1$, $B_0$ are NANDs of the two chips' matching code outputs:
  $B_2 = \overline{\overline{Y_2}_{\,\text{I}}\cdot\overline{Y_2}_{\,\text{II}}}$, and so on.

::: law How the cascade works | 74LS148的级联
Chip (II) has the higher priority. Its $\overline{Y_S}$ is 0 only when it is working
with no active input, so chip (I) is enabled only when chip (II) has nothing to encode
(只有II无编码输入时，I才允许工作).
:::

Why the NAND gates? A disabled or idle chip outputs 111, and NAND with a 1 is just an
inverter. So each $B$ bit is the inverted (that is, true) code bit of whichever chip is
active. $B_3$ says which half: 1 when chip (II) has an input.

::: callout note The slide's pin names
On the cascade drawings the code outputs are labelled $\overline{Y_3}$, $\overline{Y_2}$,
$\overline{Y_1}$; they are the chip's $\overline{Y_2}$, $\overline{Y_1}$, $\overline{Y_0}$
(pins 6, 7, 9) from the pin diagram. This lesson uses $\overline{Y_2} \dots \overline{Y_0}$
throughout.
:::

::: example Two inputs in the high group
Chip (II)'s inputs $\overline{I_8} \dots \overline{I_{15}}$ are $1, 1, 1, 1, 0, 1, 0, 1$
($\overline{I_{12}}$ and $\overline{I_{14}}$ active). Find $B_3B_2B_1B_0$.
== Chip (II) ==
Its active inputs are its own lines 4 and 6; 6 wins. Code $110$, inverted:
$\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0} = 001$. It is working with an input, so
$\overline{Y_S} = 1$ and $\overline{Y_{EX}} = 0$.
== Chip (I) ==
Its $\overline{S} = \overline{Y_S}$ of chip (II) $= 1$: disabled, outputs $111$
(whatever its inputs are).
== Output gates ==
$B_3 = \overline{0} = 1$; $B_2 = \overline{1\cdot0} = 1$; $B_1 = \overline{1\cdot0} = 1$;
$B_0 = \overline{1\cdot1} = 0$.
== Result ==
$B_3B_2B_1B_0 = 1110 = 14$: input $\overline{I_{14}}$, the highest active one.
:::

::: example Inputs only in the low group
Chip (II)'s inputs are all 1; chip (I)'s $\overline{I_0} \dots \overline{I_7}$ are
$1, 1, 0, 1, 0, 1, 0, 1$ ($\overline{I_2}$, $\overline{I_4}$, $\overline{I_6}$ active).
== Chip (II) ==
Working, no input: code outputs $111$, $\overline{Y_S} = 0$, $\overline{Y_{EX}} = 1$.
== Chip (I) ==
Enabled ($\overline{S} = 0$). Its highest active input is 6: outputs $001$.
== Output gates ==
$B_3 = \overline{1} = 0$; $B_2 = \overline{0\cdot1} = 1$; $B_1 = \overline{0\cdot1} = 1$;
$B_0 = \overline{1\cdot1} = 0$.
== Result ==
$B_3B_2B_1B_0 = 0110 = 6$: input $\overline{I_6}$.
:::

::: callout exam What encoder questions look like
Expect a 74LS148 function-table reading (remember both inversions), the meaning of
$\overline{Y_S}$ and $\overline{Y_{EX}}$, and a cascade like the one above: given the
inputs, find each chip's outputs and the final code. The slides' in-class questions
are in the quiz below.
:::

## What comes next

The slides stop at the start of section 5.6, decoders (译码器). Decoding is the reverse
of encoding: a decoder turns an input binary code back into one active output line
(or into another code). A binary decoder with $n$ inputs has $N = 2^n$ outputs, of which
exactly one is 1 (or 0). Decoders (the 74LS138), seven-segment display decoders and
data selectors (74LS151, 74LS153) complete this chapter in later lessons.

::: cards Encoders
Encoding (编码) :: Representing information by a binary code.
Encoder (编码器) :: A multi-input, multi-output combinational circuit that turns each active input into its own binary code.
Binary encoder (二进制编码器) :: $n$-bit code for $N = 2^n$ inputs; only one input active at a time.
Priority encoder (优先编码器) :: Encodes the highest-priority active input; no constraint on the inputs.
4-key binary encoder (active-low keys) :: $D_1 = \overline{S_3S_2}$, $D_0 = \overline{S_3S_1}$, $INT_0 = \overline{S_3S_2S_1S_0}$
4-key priority encoder, $D_0$ :: $D_0 = \overline{S_3} + S_2\overline{S_1}$
74LS148 :: 8-line-to-3-line priority encoder; inputs and outputs active low; $\overline{I_7}$ highest.
74LS148 $\overline{S}$ :: Enable input (使能输入端): 0 = the chip works.
74LS148 $\overline{Y_S} = 0$ :: Working, but no input.
74LS148 $\overline{Y_{EX}} = 0$ :: Working, with an input (the code is valid).
74LS148 with only $\overline{I_5}$ active :: $\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0} = 010$ (5 = 101, inverted).
16-to-4 cascade: what enables chip (I)? :: Chip (II)'s $\overline{Y_S}$, which is 0 only when chip (II) has no input.
16-to-4 cascade: $B_3$ :: The inverse of chip (II)'s $\overline{Y_{EX}}$: 1 when the high group has an input.
Decoder (译码器) :: The reverse of an encoder: $n$ input bits select one of $N = 2^n$ outputs.
:::

::: quiz Encoders
? Simplify $D_1$ of the binary encoder by grouping the 1s of its map (in-class question 12-038). Which is the result? {#encoder-d1}
- [x] $D_1 = \overline{S_3} + \overline{S_2}$
- [ ] $D_1 = \overline{S_3}S_2 + S_3\overline{S_2}$
- [ ] $D_1 = \overline{S_3} + S_3\overline{S_2}$
> The 1s are m7 (0111) and m11 (1011). With the ×s, m7 sits in the eight-cell group
> $\overline{S_3}$ and m11 in the eight-cell group $\overline{S_2}$, so
> $D_1 = \overline{S_3} + \overline{S_2} = \overline{S_3S_2}$. The other two also fit the five
> specified cells (they differ only on don't-cares), but they aren't what the largest
> groups give: the third simplifies to the first by $\overline{S_3} + S_3\overline{S_2} = \overline{S_3} + \overline{S_2}$,
> and the second is an XOR that needs more gates.

? Write $D_0$ of the binary encoder (keys pressed one at a time, active low) in terms of $S_3 \dots S_0$.
logic: (S3 S1)'
> $D_0 = 1$ for $S_1$ (1101) and $S_3$ (0111); grouping with ×s gives
> $\overline{S_3} + \overline{S_1} = \overline{S_3S_1}$. On the specified rows any equivalent
> works, but the checker compares all 16 rows, so give the simplified form.

? Write the priority encoder's $D_0$ in terms of $S_3 \dots S_0$ ($S_3$ highest, keys active low).
logic: S3' + S2 S1'
> Code 01 or 11 means $S_3$ is pressed ($\overline{S_3}$) or, with $S_3$ and $S_2$
> released, $S_1$ is pressed ($S_3S_2\overline{S_1}$). Absorption shortens that to
> $\overline{S_3} + S_2\overline{S_1}$.

? In the priority encoder, keys $S_2$ and $S_0$ are pressed together ($S_3S_2S_1S_0 = 1010$). What is $D_1D_0$?
- [x] 10
- [ ] 00
- [ ] 11
> $S_2$ outranks $S_0$, so the code is 2 = 10. By formula: $D_1 = \overline{1\cdot0} = 1$,
> $D_0 = \overline{1} + 0\cdot\overline{1} = 0$.

? A 74LS148 has $\overline{S} = 0$ and only $\overline{I_3}$ low. What is $\overline{Y_2}\,\overline{Y_1}\,\overline{Y_0}$?
- [x] 100
- [ ] 011
- [ ] 111
> $3 = 011$; the outputs are active low, so they show the complement, 100.

? Which output pair means "the 74LS148 is working, but no input is active"?
- [x] $\overline{Y_S} = 0$, $\overline{Y_{EX}} = 1$
- [ ] $\overline{Y_S} = 1$, $\overline{Y_{EX}} = 0$
- [ ] $\overline{Y_S} = 1$, $\overline{Y_{EX}} = 1$
> $\overline{Y_S} = 0$ marks "working, no input"; 10 is "working with an input"; 11 is
> "disabled".

? In the 16-line cascade, only $\overline{I_{12}}$ of chip (II)'s inputs is low. What is chip (II)'s $\overline{Y_S}\,\overline{Y_{EX}}$? (In-class question 12-049.) {#cascade-ys-yex}
- [ ] 11
- [x] 10
- [ ] 01
> Chip (II) is always enabled and has an active input, so it is "working, with an input":
> $\overline{Y_S} = 1$, $\overline{Y_{EX}} = 0$.

? Same inputs (only $\overline{I_{12}}$ low in chip (II)). What is $B_3B_2B_1B_0$? (In-class question 12-050.) {#cascade-code}
- [ ] 1101
- [x] 1100
- [ ] 0100
> $\overline{I_{12}}$ is chip (II)'s line 4 = 100, so its outputs are 011 and
> $\overline{Y_{EX}} = 0$. Its $\overline{Y_S} = 1$ disables chip (I), which outputs 111. Then
> $B_3 = \overline{0} = 1$, $B_2 = \overline{1\cdot0} = 1$, $B_1 = \overline{1\cdot1} = 0$,
> $B_0 = \overline{1\cdot1} = 0$: $1100 = 12$, as it should be.

? In the cascade, only $\overline{I_3}$ is low (in chip (I)). What is $B_3B_2B_1B_0$ as a decimal number?
answer: 3
tolerance: 0
> Chip (II) has no input: outputs 111, $\overline{Y_S} = 0$ enables chip (I),
> $\overline{Y_{EX}} = 1$ so $B_3 = 0$. Chip (I) encodes 3 = 011 as 100. NANDs with chip
> (II)'s 1s invert it back: $B_2B_1B_0 = 011$. So $0011 = 3$.
:::

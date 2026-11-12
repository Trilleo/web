---
title: Data selectors
zh: 数据选择器
summary: Routing data by address - the 74HC138 as a 1-to-8 data distributor, the data selectors (multiplexers) 74LS153 dual 4-to-1 (and the tri-state 74LS253) and 74LS151/251 8-to-1, their sum-of-mᵢDᵢ output expressions, expanding selectors to 8-to-1 and 32-to-1, realising logic functions by the formula method, and a summary of the whole chapter.
source: 第5章 组合逻辑电路 5.7 数据选择器 and 小结 (teacher's slides 66–77)
---

Many signals often have to share one wire: eight sensors reporting to one input, or one
data line feeding eight devices in turn. Two circuits do the switching, and both work
like a rotary switch whose position is set by a binary number. A **data distributor**
sends one input to one of many outputs; a **data selector** picks one of many inputs for
a single output. This lesson shows the 74HC138 from the decoder lesson working as a
distributor, then the standard selector chips, how to read their outputs, how to join
them into bigger ones, and how a selector, like a decoder, can realise a logic function.
It ends with a summary of the whole combinational-logic chapter.

## Distributors and selectors as switches

The slide's starting picture is a multi-way switch (多路模拟开关). A single wire $D$ has a
switch arm that can rest on any of the outputs $Y_0, Y_1, \dots, Y_{2^n - 1}$, and the arm's
position is set by an $n$-bit address (n位地址输入端). Reverse the arrows and the same
picture is a selector: many inputs, one output, the address choosing which input gets
through.

::: define Data distributor | 数据分配器
A logic circuit that sends the signal on one common data line to one of several
channels, chosen by an address: 1 data input, $2^n$ outputs, $n$ address inputs. Also
called a demultiplexer (DEMUX).
:::

::: define Data selector | 数据选择器
A circuit that, under the control of an address code, passes one of several input
signals to its single output: $2^n$ data inputs, 1 output, $n$ address inputs. Also called
a multiplexer (MUX).
:::

Unlike a mechanical switch, these are logic circuits: the "arm" is a set of gates, it
moves in nanoseconds, and the signals are logic levels.

## The 74HC138 as a 1-to-8 data distributor

A distributor needs no special chip: the 138 decoder already does it. Look again at its
output expression from the decoder lesson, $\overline{Y_i} = \overline{m_i\cdot EN}$ with
$EN = E_3\overline{\overline{E_1}}\,\overline{\overline{E_2}}$. If the enable is made to carry the
data, the selected output follows the data and the others stay at 1.

The slide's wiring:

| 138 pin | Connected to | Role |
|---|---|---|
| $B_2$, $B_1$, $B_0$ | the address | address inputs (地址输入端) |
| $E_3$ | the data $D$ | data input (数据输入端) |
| $\overline{E_1}$, $\overline{E_2}$ | ground (0) | kept enabled |
| $\overline{Y_0} \dots \overline{Y_7}$ | the eight channels | data outputs (数据输出端) |

With $\overline{E_1} = \overline{E_2} = 0$, $EN = E_3 = D$, so:

::: formula 74HC138 as a data distributor | 74HC138构成的数据分配器
$$\overline{Y_i} = \overline{m_i\cdot D}$$
--
\overline{Y_i} | output channel $i$ |
m_i | minterm $i$ of the address $B_2B_1B_0$ |
D | the data, on $E_3$ (with $\overline{E_1} = \overline{E_2} = 0$) |
:::

For the selected channel $m_i = 1$ and $\overline{Y_i} = \overline{D}$; for every other channel
$m_i = 0$ and $\overline{Y_i} = 1$. The slide's function table:

| Pin $E_3$ | Pins $\overline{E_2}+\overline{E_1}$ | Address $B_2B_1B_0$ | Output carrying the data | Other outputs |
|---|---|---|---|---|
| $D$ | 0 | 000 | $\overline{Y_0} = \overline{D}$ | 1 |
| $D$ | 0 | 001 | $\overline{Y_1} = \overline{D}$ | 1 |
| $D$ | 0 | 010 | $\overline{Y_2} = \overline{D}$ | 1 |
| $D$ | 0 | 011 | $\overline{Y_3} = \overline{D}$ | 1 |
| $D$ | 0 | 100 | $\overline{Y_4} = \overline{D}$ | 1 |
| $D$ | 0 | 101 | $\overline{Y_5} = \overline{D}$ | 1 |
| $D$ | 0 | 110 | $\overline{Y_6} = \overline{D}$ | 1 |
| $D$ | 0 | 111 | $\overline{Y_7} = \overline{D}$ | 1 |

::: example A data stream through the distributor
The address is $B_2B_1B_0 = 101$ and the data $D$ runs 1, 0, 0, 1. What happens at the
outputs?
== Which channel ==
$101 = 5$: only $\overline{Y_5}$ responds. The other seven stay at 1 throughout.
== Its values ==
$\overline{Y_5} = \overline{D}$: it runs 0, 1, 1, 0, the data inverted.
:::

::: callout note Getting the data the right way up
On $E_3$ the data comes out inverted. Not on the slide, but common in textbooks: put $D$
on $\overline{E_2}$ instead (with $E_3 = 1$, $\overline{E_1} = 0$). Then
$EN = \overline{D}$ and the selected output is $\overline{\overline{D}} = D$, the data itself.
:::

## The dual 4-to-1 selector 74LS153

::: define 74LS153 | 74LS153
A chip holding two 4-to-1 data selectors (双4选1数据选择器) that share their address
inputs $A_1A_0$ but have separate data inputs, enables and outputs.
:::

| Pin | Name | Role |
|---|---|---|
| 2, 14 | $A_1$, $A_0$ | address inputs, shared by both selectors |
| 6, 5, 4, 3 | $1D_0 \dots 1D_3$ | data inputs of selector 1 ($D_{10} \dots D_{13}$) |
| 10, 11, 12, 13 | $2D_0 \dots 2D_3$ | data inputs of selector 2 ($D_{20} \dots D_{23}$) |
| 1, 15 | $\overline{EN_1}$, $\overline{EN_2}$ | enables, active low |
| 7, 9 | $1Y$, $2Y$ | outputs $Y_1$, $Y_2$ |

Each selector passes the data input whose number equals the address, while its enable
is 0. As an expression: the address picks one minterm $m_i$ of $A_1A_0$, and the output is
the data input paired with it.

::: formula 4-to-1 data selector (74LS153) | 4选1数据选择器
$$\begin{aligned}Y_1 &= \left(\overline{A_1}\,\overline{A_0}D_{10} + \overline{A_1}A_0D_{11} + A_1\overline{A_0}D_{12} + A_1A_0D_{13}\right)\overline{\overline{EN_1}}\\&= \left(\sum_{i=0}^{3}m_iD_{1i}\right)\overline{\overline{EN_1}}\end{aligned}$$
--
Y_1 | output of selector 1 (pin 7); $Y_2$ is the same with $D_{2i}$ and $\overline{EN_2}$ |
m_i | minterm $i$ of the address $A_1A_0$ |
D_{1i} | data input $i$ of selector 1 |
\overline{EN_1} | its enable pin, active low: the factor $\overline{\overline{EN_1}}$ is 1 when the pin is 0 |
:::

When $\overline{EN_1} = 1$ the bracket is multiplied by 0 and $Y_1 = 0$, whatever the address.

Try one selector: set the address and the four data switches, and only the addressed
data input reaches $Y$ (enable assumed on).

::: logic A 4-to-1 data selector (one half of a 74LS153, enabled)
inputs: A1 A0 D0 D1 D2 D3
Y = A1' A0' D0 + A1' A0 D1 + A1 A0' D2 + A1 A0 D3
:::

::: example Reading a 74LS153
Selector 1 has $\overline{EN_1} = 0$, $A_1A_0 = 10$ and data $1D_0 \dots 1D_3 = 0, 1, 1, 0$;
selector 2 has $\overline{EN_2} = 1$ and data $1, 1, 1, 1$. Find $Y_1$ and $Y_2$.
== Selector 1 ==
Enabled. Address $10_2 = 2$, so $m_2 = 1$ and $Y_1 = D_{12} = 1$.
== Selector 2 ==
Disabled: $Y_2 = 0$ even though every data input is 1.
:::

### The 74LS253: tri-state outputs

The 74LS253 is the same dual 4-to-1 selector with one difference in what a disabled
selector does.

::: define Tri-state output | 三态输出
An output with three possible states: 0, 1, and high impedance (高阻), in which it is
effectively disconnected from the wire, neither pulling it up nor down. Several
tri-state outputs can share one wire as long as only one is enabled at a time.
:::

On the 74LS253 (and the 74LS251 below), an enable input at the high level puts the
output into high impedance (使能输入高电平，输出高阻), instead of forcing it to 0 as the
74LS153 does. When enabled, the output expression is the same.

::: callout pitfall Disabled means 0 on the 153, floating on the 253
Asked "what is $Y$ when $\overline{EN} = 1$?": on the 74LS153 or 74LS151 the answer is 0; on
the 74LS253 or 74LS251 it is high impedance (Z), not 0.
:::

## The 8-to-1 selector 74LS151 (and 74LS251)

::: define 74LS151 | 74LS151
An 8-to-1 data selector (8选1数据选择器): address inputs $A_2A_1A_0$, data inputs
$D_0 \dots D_7$, an active-low enable $\overline{EN}$, and two outputs, $Y$ and its complement
$\overline{Y}$. The 74LS251 is the tri-state version.
:::

| Pin | Name | Role |
|---|---|---|
| 9, 10, 11 | $A_2$, $A_1$, $A_0$ | address inputs |
| 4, 3, 2, 1, 15, 14, 13, 12 | $D_0 \dots D_7$ | data inputs |
| 7 | $\overline{EN}$ | enable, active low |
| 5, 6 | $Y$, $\overline{Y}$ | output and complementary output |

With $\overline{EN} = 1$ the selector is disabled: whatever the address, $Y = 0$ (and
$\overline{Y} = 1$). With $\overline{EN} = 0$:

::: formula 8-to-1 data selector (74LS151) | 8选1数据选择器
$$\begin{aligned}Y &= \overline{A_2}\,\overline{A_1}\,\overline{A_0}D_0 + \overline{A_2}\,\overline{A_1}A_0D_1 + \overline{A_2}A_1\overline{A_0}D_2 + \overline{A_2}A_1A_0D_3\\&\quad + A_2\overline{A_1}\,\overline{A_0}D_4 + A_2\overline{A_1}A_0D_5 + A_2A_1\overline{A_0}D_6 + A_2A_1A_0D_7\\&= \sum_{i=0}^{7}m_iD_i\end{aligned}$$
--
Y | output (pin 5), valid when $\overline{EN} = 0$; pin 6 gives $\overline{Y}$ |
m_i | minterm $i$ of the address $A_2A_1A_0$ ($A_2$ most significant) |
D_i | data input $i$ |
:::

::: callout key Every selector is "sum of minterm times data"
An enabled $2^n$-to-1 selector outputs $Y = \sum m_iD_i$, where the $m_i$ are the
minterms of its address. Exactly one $m_i$ is 1, so $Y$ equals that one $D_i$.
:::

::: example Reading a 74LS151
$\overline{EN} = 0$, $A_2A_1A_0 = 011$ and $D_0 \dots D_7 = 1, 1, 0, 0, 1, 0, 1, 1$. Find $Y$
and $\overline{Y}$. Then find them with $\overline{EN} = 1$.
== Enabled ==
$011_2 = 3$, so $Y = D_3 = 0$ and $\overline{Y} = 1$. (Count from $D_0$: the fourth value.)
== Disabled ==
$Y = 0$ and $\overline{Y} = 1$, regardless of address and data. (On a 74LS251 the outputs
would be high impedance.)
:::

## Expanding selectors

### Two 4-to-1 selectors make an 8-to-1

An 8-to-1 selector needs three address bits. The 74LS153 has two 4-to-1 halves with a
shared 2-bit address; the third bit can choose between the halves through the enables.

| Connection | To |
|---|---|
| $A_1$, $A_0$ (low address bits) | the 153's $A_1$, $A_0$ |
| $D_0 \dots D_3$ | $1D_0 \dots 1D_3$ |
| $D_4 \dots D_7$ | $2D_0 \dots 2D_3$ |
| $A_2$ (high address bit) | $\overline{EN_1}$ directly, and $\overline{EN_2}$ through an inverter |
| $1Y$ and $2Y$ | the two inputs of an OR gate, whose output is $Y$ |

$A_2 = 0$ enables selector 1 ($D_0$–$D_3$) and disables selector 2, whose output is then
0; $A_2 = 1$ does the opposite. The disabled half gives 0, and OR with 0 changes nothing,
so $Y$ is the enabled half's output.

::: example Address 110 in the expanded selector
$A_2A_1A_0 = 110$. Which data input reaches $Y$?
== The halves ==
$A_2 = 1$: $\overline{EN_1} = 1$ (selector 1 off, $Y_1 = 0$); $\overline{EN_2} = \overline{1} = 0$
(selector 2 on).
== Inside selector 2 ==
$A_1A_0 = 10 = 2$: it passes $2D_2$, which is wired to $D_6$.
== Output ==
$Y = 0 + D_6 = D_6$, and indeed $110_2 = 6$.
:::

### Four 8-to-1 and one 4-to-1 make a 32-to-1

For 32 inputs ($n = 5$ address bits $A_4 \dots A_0$) the slide uses a two-level tree:

- Four 8-to-1 selectors, MUX (I) to (IV), share the low address bits $A_2A_1A_0$ and
  take $D_0 \sim D_7$, $D_8 \sim D_{15}$, $D_{16} \sim D_{23}$, $D_{24} \sim D_{31}$; their
  enables are grounded (always on). Their outputs are $Y_0$, $Y_1$, $Y_2$, $Y_3$.
- A 4-to-1 selector, MUX (V), takes $Y_0 \dots Y_3$ as its data and the high bits $A_4A_3$
  as its address. Its output is $Y$.

| Address $A_4A_3$ | Selector chosen by MUX (V) |
|---|---|
| 00 | MUX (I) ($D_0$–$D_7$) |
| 01 | MUX (II) ($D_8$–$D_{15}$) |
| 10 | MUX (III) ($D_{16}$–$D_{23}$) |
| 11 | MUX (IV) ($D_{24}$–$D_{31}$) |

::: example Address 10110 in the 32-to-1 selector
Which input appears at $Y$ for $A_4A_3A_2A_1A_0 = 10110$?
== First level ==
$A_2A_1A_0 = 110 = 6$: each 8-to-1 selector passes its own input 6, so MUX (III) outputs
its 7th input, $D_{16+6} = D_{22}$.
== Second level ==
$A_4A_3 = 10 = 2$: MUX (V) passes its data input 2, which is $Y_2$ from MUX (III).
== Result ==
$Y = D_{22}$, and $10110_2 = 16 + 4 + 2 = 22$. ✓
:::

::: callout tip Two ways to expand
The 8-to-1 above uses the **enables** (and an OR gate) to choose a chip; the 32-to-1 uses
a **second level of selectors** (a tree). Either way, the low address bits go to every
first-level chip and the high bits choose among them.
:::

## Realising logic functions with a selector

Any function can be written in standard sum-of-minterms form, and a selector's output is
a sum of minterms of its address, each multiplied by a data input. Match the two and the
selector *is* the function.

::: law Realising functions with a data selector | 用数据选择器实现组合逻辑函数
Connect the function's variables (all, or all but one) to the address inputs. Writing
the function as a sum of the address minterms, the coefficient of each $m_i$ (0, 1, the
remaining variable, or its complement) is what to connect to data input $D_i$. This is
the formula method (公式法).
:::

::: law Steps of the formula method | 公式法
1. Choose which variables go to the address inputs ($A_1 = A$, $A_0 = B$, …).
2. Write the function's standard sum-of-products form, then group it by the address
   minterms: $L = m_0(\dots) + m_1(\dots) + \dots$; a minterm that doesn't appear has
   coefficient 0.
3. Compare with $Y = \sum m_iD_i$: each bracket is the $D_i$ to connect. Enable the chip.
:::

::: example The slide's example: L = A'B'C + A'BC' + AB on a 74LS153
Realise $L = \overline{A}\,\overline{B}C + \overline{A}B\overline{C} + AB$ with one half of a 74LS153.
== Choose the address ==
$A_1 = A$, $A_0 = B$. The third variable, $C$, will go to the data inputs.
== Rewrite with the address minterms ==
$$L = \overline{A_1}\,\overline{A_0}\cdot C + \overline{A_1}A_0\cdot\overline{C} + A_1\overline{A_0}\cdot 0 + A_1A_0\cdot 1$$
($AB$ already covers both values of $C$, so its coefficient is 1; $A\overline{B}$ doesn't
appear, so its coefficient is 0.)
== Compare with the selector ==
$Y = \overline{A_1}\,\overline{A_0}D_0 + \overline{A_1}A_0D_1 + A_1\overline{A_0}D_2 + A_1A_0D_3$ gives
$$D_0 = C, \quad D_1 = \overline{C}, \quad D_2 = 0, \quad D_3 = 1 .$$
== Wiring ==
| 74LS153 pin | Connected to |
|---|---|
| $A_1$ (pin 2) | $A$ |
| $A_0$ (pin 14) | $B$ |
| $\overline{EN_1}$ (pin 1) | ground (0) |
| $1D_0$ (pin 6) | $C$ |
| $1D_1$ (pin 5) | $\overline{C}$ |
| $1D_2$ (pin 4) | 0 |
| $1D_3$ (pin 3) | 1 |
| $1Y$ (pin 7) | the output $L$ |

Selector 2 isn't used.
:::

::: logic The 74LS153 wired for L (A, B on the address, C on the data) against the expression
inputs: A B C
L153 = A' B' C + A' B C' + A B' 0 + A B 1
L = A' B' C + A' B C' + A B
:::

::: callout note n address bits, n + 1 variables
A selector with $n$ address inputs realises any function of up to $n + 1$ variables with
no extra gates (an inverter at most, for the complement of the last variable): $n$
variables on the address, the last one (or 0, 1, its complement) on the data inputs.
The 4-to-1 above realises a 3-variable function; a 74LS151 realises any 4-variable one.
:::

### Analysing selector circuits

The exam scope asks only to analyse correctly connected selector circuits, which is the
formula method backwards: read each $D_i$, multiply by $m_i$, add.

::: example A 74LS151 with constant data
A 74LS151 has $\overline{EN} = 0$, $A_2 = A$, $A_1 = B$, $A_0 = C$, and $D_1 = D_2 = D_4 = D_7 = 1$,
the other four data inputs 0. Find $Y$.
== Sum ==
$Y = m_1 + m_2 + m_4 + m_7 = \overline{A}\,\overline{B}C + \overline{A}B\overline{C} + A\overline{B}\,\overline{C} + ABC$.
== Recognise it ==
These are the rows with an odd number of 1s: $Y = A \oplus B \oplus C$, the full adder's
sum (an odd-parity function). And $\overline{Y}$ (pin 6) gives the even parity for free.
:::

::: example A 74LS153 with variables on its data inputs
Selector 1 is enabled with $A_1 = A$, $A_0 = B$, and $1D_0 = C$, $1D_1 = 1$, $1D_2 = 0$,
$1D_3 = \overline{C}$. Find $Y_1$ and simplify it.
== Sum ==
$Y_1 = \overline{A}\,\overline{B}C + \overline{A}B\cdot1 + A\overline{B}\cdot0 + AB\overline{C} = \overline{A}\,\overline{B}C + \overline{A}B + AB\overline{C}$.
== Simplify ==
$\overline{A}\,\overline{B}C + \overline{A}B = \overline{A}(\overline{B}C + B) = \overline{A}(B + C)$, so
$Y_1 = \overline{A}B + \overline{A}C + AB\overline{C}$.
== Check one row ==
$A = 1$, $B = 1$, $C = 0$: address 11 picks $1D_3 = \overline{C} = 1$; the expression gives
$0 + 0 + 1 = 1$. ✓
:::

::: example A four-variable function on a 74LS151
$\overline{EN} = 0$, $A_2A_1A_0 = ABC$, and $D_0 = 1$, $D_1 = D$, $D_3 = 1$, $D_6 = \overline{D}$, the rest 0.
Find $Y(A, B, C, D)$ as a sum of minterms of $ABCD$.
== Sum ==
$Y = \overline{A}\,\overline{B}\,\overline{C}\cdot1 + \overline{A}\,\overline{B}C\cdot D + \overline{A}BC\cdot1 + AB\overline{C}\cdot\overline{D}$.
== Minterms of ABCD ==
$\overline{A}\,\overline{B}\,\overline{C}$ covers $0000, 0001$ ($m_0, m_1$); $\overline{A}\,\overline{B}CD$ is $0011$
($m_3$); $\overline{A}BC$ covers $0110, 0111$ ($m_6, m_7$); $AB\overline{C}\,\overline{D}$ is $1100$
($m_{12}$). So $Y = \sum m(0, 1, 3, 6, 7, 12)$.
:::

::: callout exam What selector and distributor questions look like
For the 138 used as a distributor, the 153/253 and the 151, the scope asks you to
**analyse** a correctly wired circuit: find which input reaches the output for an
address, write $Y = \sum m_iD_i$ and simplify, and know what a disabled chip outputs (0, or
high impedance on the 253/251). Design with a selector isn't required, but it is the same
formula read the other way.
:::

## Chapter summary

The last three slides sum up combinational logic.

**Features.** A combinational circuit is built from gates and has no memory: its output
at any moment depends only on the inputs at that moment, not on the circuit's earlier
state (unlike a sequential circuit, next chapter).

**Analysis** (分析方法): logic diagram → logic expression → simplify → truth table →
state the function.

**Design** (设计方法): logic abstraction (逻辑抽象: name the inputs and outputs, decide
what 0 and 1 mean) → truth table → expression, simplified or transformed for the gates
available → logic diagram.

**Common MSI circuits** (常用中规模集成组合逻辑电路):

| Circuit | What it does | Chips in this chapter |
|---|---|---|
| Adder (加法器) | adds two multi-bit binary numbers | 74LS283 |
| Encoder (编码器) | turns input levels into a binary code (binary and priority encoders) | 74LS148 |
| Decoder (译码器) | turns a binary code into output levels (binary and display decoders) | 74HC138, 74LS47/48 |
| Data selector (数据选择器) | under an address, passes one of several inputs to the output; used for parallel-to-serial conversion in data transmission | 74LS153/253, 74LS151/251 |

**Realising functions with MSI chips** (用中规模集成电路实现组合逻辑函数):

| Chip | Outputs | Variables | Extra gates |
|---|---|---|---|
| Data selector, $n$ address bits | one: suits single-output functions | up to $n + 1$ | none needed |
| Binary decoder, $n$ address bits | every minterm: single- or multiple-output functions | up to $n$ | one NAND (or AND) per function |

::: callout key Decoder or selector?
Both produce minterms. A decoder gives you all of them on separate pins, so a gate can
collect any set, for as many functions as you like. A selector multiplies each minterm by
a data input and adds them inside, so one chip gives one function, but of one more
variable and with no gate.
:::

::: cards Data selectors
Data distributor (数据分配器) :: One data input to one of $2^n$ outputs, chosen by an $n$-bit address (DEMUX).
Data selector (数据选择器) :: One of $2^n$ data inputs to a single output, chosen by an $n$-bit address (MUX).
74HC138 as a distributor :: Data on $E_3$, $\overline{E_1} = \overline{E_2} = 0$: $\overline{Y_i} = \overline{m_iD}$; the selected output is $\overline{D}$.
74LS153 :: Dual 4-to-1 selector; shared address $A_1A_0$, separate active-low enables.
4-to-1 selector output :: $Y = \left(\sum_{i=0}^{3} m_iD_i\right)\overline{\overline{EN}}$
74LS151 :: 8-to-1 selector with outputs $Y$ and $\overline{Y}$; $\overline{EN} = 1$ gives $Y = 0$.
8-to-1 selector output :: $Y = \sum_{i=0}^{7} m_iD_i$ (when $\overline{EN} = 0$)
Tri-state output (三态输出) :: 0, 1 or high impedance; the 74LS253 and 74LS251 go high-impedance when disabled.
8-to-1 from a 74LS153 :: $A_2$ to $\overline{EN_1}$ and, inverted, to $\overline{EN_2}$; OR the two outputs.
32-to-1 selector :: Four 8-to-1 on $A_2A_1A_0$, then a 4-to-1 on $A_4A_3$ choosing among them.
Formula method (公式法) :: Write the function as $\sum m_i(\dots)$ over the address minterms; each bracket is $D_i$.
$L = \overline{A}\,\overline{B}C + \overline{A}B\overline{C} + AB$ on a 153 :: $A_1 = A$, $A_0 = B$: $D_0 = C$, $D_1 = \overline{C}$, $D_2 = 0$, $D_3 = 1$.
Variables a selector can realise :: Up to $n + 1$ with $n$ address bits, no gates; a decoder up to $n$.
:::

::: quiz Data selectors
? A 74HC138 is wired as a distributor (data $D$ on $E_3$, $\overline{E_1} = \overline{E_2} = 0$) with address $B_2B_1B_0 = 010$. Which is right?
- [x] $\overline{Y_2} = \overline{D}$ and the other outputs are 1
- [ ] $\overline{Y_2} = D$ and the other outputs are 0
- [ ] $\overline{Y_5} = \overline{D}$ and the other outputs are 1
> $\overline{Y_i} = \overline{m_iD}$. Only $m_2 = 1$, so $\overline{Y_2} = \overline{D}$; every other
> $\overline{Y_i} = \overline{0} = 1$.

? A 74LS151 has $\overline{EN} = 0$, $A_2A_1A_0 = 101$ and $D_0 \dots D_7 = 0, 1, 0, 1, 1, 0, 0, 1$. What is $Y$?
- [x] 0
- [ ] 1
- [ ] High impedance
> $101_2 = 5$, so $Y = D_5$, the sixth value in the list (counting from $D_0$): 0.

? A 74LS151 has $\overline{EN} = 1$. What is $Y$?
- [x] 0, whatever the address and data
- [ ] High impedance
- [ ] $D_0$
> A disabled 74LS151 forces $Y = 0$ (and $\overline{Y} = 1$). High impedance is the tri-state
> 74LS251's behaviour.

? A 74LS253 selector has its enable at 1. What is its output?
- [x] High impedance
- [ ] 0
- [ ] 1
> The 253 is the tri-state version of the 153: a high enable puts the output into high
> impedance, disconnected from the wire.

? A 74LS151 is enabled with $A_2 = A$, $A_1 = B$, $A_0 = C$, $D_0 = D_7 = 1$ and the other data inputs 0. Write $Y$.
logic: A'B'C' + ABC
variables: A, B, C
> $Y = m_0 + m_7 = \overline{A}\,\overline{B}\,\overline{C} + ABC$: 1 when all three inputs are equal
> (an "all the same" detector).

? One half of a 74LS153 is enabled with $A_1 = A$, $A_0 = B$ and $D_0 = 0$, $D_1 = C$, $D_2 = C$, $D_3 = 1$. Write $Y$ and simplify.
logic: AB + AC + BC
variables: A, B, C
> $Y = \overline{A}B\cdot C + A\overline{B}\cdot C + AB = \overline{A}BC + A\overline{B}C + AB$: minterms
> 3, 5, 6, 7, the majority function $AB + AC + BC$ (the full adder's carry).

? $L = \overline{A}\,\overline{B}C + \overline{A}B\overline{C} + AB$ is realised on a 74LS153 with $A_1 = A$, $A_0 = B$. What goes to $D_1$?
- [x] $\overline{C}$
- [ ] $C$
- [ ] 0
- [ ] 1
> $D_1$ is the coefficient of $m_1 = \overline{A_1}A_0 = \overline{A}B$. The only term with
> $\overline{A}B$ is $\overline{A}B\overline{C}$, so $D_1 = \overline{C}$. (The full answer: $D_0 = C$,
> $D_1 = \overline{C}$, $D_2 = 0$, $D_3 = 1$.)

? In the 8-to-1 selector made from a 74LS153, $A_2$ drives $\overline{EN_1}$ and, through an inverter, $\overline{EN_2}$. For $A_2A_1A_0 = 011$, which input reaches $Y$?
- [x] $D_3$
- [ ] $D_7$
- [ ] $D_6$
> $A_2 = 0$ enables selector 1 ($D_0$–$D_3$) and disables selector 2 (output 0). Its address
> $A_1A_0 = 11$ picks $1D_3 = D_3$, and the OR gate passes it.

? In the slide's 32-to-1 selector, which data input reaches $Y$ for $A_4A_3A_2A_1A_0 = 01101$? Give its number.
answer: 13
tolerance: 0
> $A_2A_1A_0 = 101 = 5$ picks each 8-to-1 selector's input 5; $A_4A_3 = 01$ picks MUX (II),
> which holds $D_8 \dots D_{15}$, so its input 5 is $D_{8+5} = D_{13}$. Check: $01101_2 = 13$.

? Up to how many variables can a function have if it is realised by an 8-to-1 selector (3 address inputs) and no extra gates?
answer: 4
tolerance: 0
> $n$ address bits realise up to $n + 1$ variables: three on the address, the fourth (or
> its complement, or 0 or 1) on the data inputs. A binary decoder with 3 inputs manages
> only 3.
:::

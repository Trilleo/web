---
title: Logic operations and gates
zh: 逻辑运算与逻辑门
summary: Logic variables that are only 0 or 1, the three basic operations AND, OR and NOT, the compound ones (NAND, NOR, XOR, XNOR, AND-OR-INVERT), their truth tables and gate symbols.
source: 第3章 逻辑代数基础 3.1–3.2, 2026-09-29
---

This lesson starts the digital half of the course. Everything a digital circuit does,
from a calculator to a processor, is built from a handful of very simple decisions:
"are *all* of these true?", "is *any* of these true?", "is this *not* true?". Here you
meet those decisions as operations on 0s and 1s, the tables that describe them
completely, and the symbols used to draw them. Every later topic in the chapter (laws,
simplification, Karnaugh maps) is about working with these operations efficiently.

## Logic algebra and logic variables

In the analogue chapters we cared about *how much*: how many volts, how many
milliamps, what gain. A digital circuit cares only about *which of two states* each
signal is in: high or low, on or off. What matters is the relationship between the
input states and the output states, so digital circuits are also called
{{term logic circuits | 逻辑电路}}, and the mathematics used to analyse them is
{{term logic algebra | 逻辑代数}}, also called **Boolean algebra** ({{zh 布尔代数}}) or
**switching algebra** ({{zh 开关代数}}).

::: define Logic variable | 逻辑变量
A variable, written as a letter ($A$, $B$, $Y$ …), that can only take the values 0 and 1.
Here 0 and 1 are not quantities: they are names for two different states, such as an
event happening or not, a voltage being high or low, a lamp being lit or dark, a switch
being closed or open.
:::

::: callout pitfall 0 and 1 are not numbers here
"1 + 1" in logic algebra is not 2. A logic 1 is a *state* ("closed", "true", "high"), so
combining two "true"s with OR still gives "true": $1 + 1 = 1$. Keep this in mind
through the whole chapter; it is the most common slip when ordinary algebra habits take
over.
:::

A {{term logic function | 逻辑函数}} $Y = F(A, B, \ldots)$ says what the output $Y$ is
for each combination of input values. Because each input has only two values, a
function of $n$ inputs has only $2^n$ input combinations, so we can list them all.

## The three basic operations

### AND

**Intuition.** Put two switches $A$ and $B$ in series with a battery $E$ and a lamp $Y$.
Current can only flow when *both* switches are closed: the lamp lights only if $A$ is
closed **and** $B$ is closed.

::: circuit Switches in series: an AND circuit (the lamp Y drawn as a resistor)
V1 0,4 0,0 E
S1 0,0 2,0 open
S2 4,0 6,0 open
W 2,0 4,0
R1 6,0 6,4 Y
W 0,4 6,4
label A 2,0
label B 6,0
:::

Describing the circuit in words gives a {{term function table | 功能表}}:

| Switch A | Switch B | Lamp Y |
| -------- | -------- | ------ |
| open     | open     | off    |
| open     | closed   | off    |
| closed   | open     | off    |
| closed   | closed   | on     |

Now code the states: a closed switch is 1 and an open one 0; a lit lamp is 1 and a dark
one 0. The same table becomes a truth table.

::: define Truth table | 真值表
A table listing every combination of the input values together with the output value
for each one. With $n$ inputs it has $2^n$ rows, so it describes the logic function
completely. (Full name: 逻辑函数真值表.)
:::

| A   | B   | Y   |
| --- | --- | --- |
| 0   | 0   | 0   |
| 0   | 1   | 0   |
| 1   | 0   | 0   |
| 1   | 1   | 1   |

::: define AND | 与逻辑
The event $Y$ happens only when **all** of its conditions $A, B, C, \ldots$ are met. It
is written as a product: $Y = A \cdot B \cdot C \cdots$, or simply $Y = ABC\cdots$
(与运算, logical multiplication). A circuit that does it is an **AND gate** (与门).
:::

The rules are just the truth table read row by row: $0\cdot0 = 0$, $0\cdot1 = 1\cdot0 = 0$,
$1\cdot1 = 1$. An AND with any 0 input gives 0; only all-1 inputs give 1. With three
inputs, $Y = ABC$ is 1 in just one of its 8 rows, $A = B = C = 1$.

### OR

**Intuition.** Put the two switches in **parallel** instead. Now either path can carry
the current: the lamp lights if $A$ is closed **or** $B$ is closed (or both).

::: circuit Switches in parallel: an OR circuit
V1 0,6 0,0 E
W 0,0 2,0
S1 2,0 6,0 open
W 2,0 2,2
S2 2,2 6,2 open
W 6,0 6,2
R1 6,2 6,6 Y
W 0,6 6,6
label A 4,0
label B 4,2
:::

| Switch A | Switch B | Lamp Y |     | A   | B   | Y   |
| -------- | -------- | ------ | --- | --- | --- | --- |
| open     | open     | off    |     | 0   | 0   | 0   |
| open     | closed   | on     |     | 0   | 1   | 1   |
| closed   | open     | on     |     | 1   | 0   | 1   |
| closed   | closed   | on     |     | 1   | 1   | 1   |

::: define OR | 或逻辑
The event $Y$ happens when **at least one** of its conditions $A, B, C, \ldots$ is met. It
is written as a sum: $Y = A + B + C + \cdots$ (或运算, logical addition). A circuit that
does it is an **OR gate** (或门).
:::

Its rules: $0 + 0 = 0$, $0 + 1 = 1 + 0 = 1$, and, unlike ordinary arithmetic,
$1 + 1 = 1$. An OR with any 1 input gives 1; only all-0 inputs give 0. The three-input
$Y = A + B + C$ is 0 in just one row, $A = B = C = 0$.

### NOT

**Intuition.** Put the switch $A$ *across* the lamp, with a resistor $R$ in series to
limit the current. With $A$ open, current flows through the lamp and it lights. Closing
$A$ short-circuits the lamp: the current takes the switch instead and the lamp goes
dark. The lamp does the opposite of the switch.

::: circuit A switch across the lamp: a NOT circuit
V1 0,4 0,0 E
R1 0,0 4,0 R
R2 4,0 4,4 Y
W 4,0 7,0
S1 7,0 7,4 open
W 7,4 4,4
W 0,4 4,4
label A 7,0
:::

| Switch A | Lamp Y |     | A   | Y   |
| -------- | ------ | --- | --- | --- |
| open     | on     |     | 0   | 1   |
| closed   | off    |     | 1   | 0   |

::: define NOT | 非逻辑
The negation of a condition: when the condition $A$ is met the event does not happen,
and when it isn't, the event does. Written $Y = \overline{A}$ (or $Y = A'$), read
"not A" or "A bar" (非运算). A circuit that does it is a **NOT gate** or **inverter**
(非门).
:::

$A$ is called the {{term true variable | 原变量}} and $\overline{A}$ its
{{term complemented variable | 反变量}}. The rules are $\overline{0} = 1$ and
$\overline{1} = 0$.

### Gate symbols

Each operation has a symbol for drawing circuits ({{term logic symbol | 逻辑符号}}). The
Chinese national standard (GB, the same as IEC) uses a rectangle with a mark inside:
**&** for AND, **≥1** for OR ("at least one input is 1"), **1** for NOT, and a small
circle (a "bubble") on the output for an inversion. Many books and data sheets use the
older distinctive shapes: a D for AND, a pointed shield for OR, a triangle for NOT. You
should recognise both.

::: gates
and or not
:::

A three-input gate is drawn the same way with a third input line: the box still says
& or ≥1.

Try them below. Flip the inputs and watch $Y = ABC$ light only for 111, and
$Z = A + B + C$ go dark only for 000.

::: logic Three-input AND and OR
inputs: A B C
Y = A B C
Z = A + B + C
:::

::: example Reading an AND / OR condition
A safety interlock lets a press run ($Y = 1$) only when the guard is shut ($A = 1$)
**and** the operator holds the button ($B = 1$). A warning lamp $L$ lights when the guard
is open **or** the oil pressure is low ($P = 1$). Write $Y$ and $L$, and find both when
the guard is open, the button is held, and the oil pressure is normal.
== Write the functions ==
"Both needed" is AND: $Y = A B$. "Either one" is OR, and "guard open" is "not $A$":
$L = \overline{A} + P$.
== Substitute ==
Guard open: $A = 0$; button held: $B = 1$; pressure normal: $P = 0$.
$Y = 0 \cdot 1 = 0$ (the press stays off), and $L = \overline{0} + 0 = 1 + 0 = 1$
(the lamp is lit).
:::

## Common compound operations

Real gate chips mostly provide combinations of the basic three. They are worth knowing
by name because the laws and simplification methods keep producing them.

### NAND and NOR

A **NAND** ({{zh 与非}}) is an AND followed by a NOT; a **NOR** ({{zh 或非}}) is an OR
followed by a NOT. Their symbols are the AND and OR symbols with a bubble on the output.

$$Y_\text{NAND} = \overline{A \cdot B}, \qquad Y_\text{NOR} = \overline{A + B}$$

So NAND is 0 only when all inputs are 1, and NOR is 1 only when all inputs are 0.

::: gates
nand nor
:::

::: callout tip Why NAND matters
NAND (and NOR) is *universal*: an inverter is a NAND with its inputs tied together
($\overline{A \cdot A} = \overline{A}$), an AND is a NAND followed by that inverter, and
with De Morgan's law (next lesson) an OR is a NAND of inverted inputs. That is why the
first integrated gates you will meet at the end of this unit, TTL and CMOS, are NANDs.
:::

### XOR and XNOR

**Intuition.** A staircase light has a switch at the bottom and one at the top. Flipping
*either* switch changes the lamp. With both switches in the same position the lamp is
off; in different positions it is on. "On when the inputs *differ*" is the
exclusive OR.

::: formula Exclusive OR | 异或
$$Y = A \oplus B = \overline{A}B + A\overline{B}$$
--
A, B | inputs | —
Y | 1 when $A$ and $B$ differ, 0 when they are the same | —
:::

::: formula Exclusive NOR (equivalence) | 同或
$$Y = A \odot B = \overline{A}\,\overline{B} + AB$$
--
A, B | inputs | —
Y | 1 when $A$ and $B$ are the same, 0 when they differ | —
:::

| A   | B   | $A \oplus B$ | $A \odot B$ |
| --- | --- | ------------ | ----------- |
| 0   | 0   | 0            | 1           |
| 0   | 1   | 1            | 0           |
| 1   | 0   | 1            | 0           |
| 1   | 1   | 0            | 1           |

The national-standard symbols are a box marked **=1** for XOR ("exactly one input is
1") and **=** for XNOR; the distinctive XOR is the OR shield with an extra curve at the
inputs, and XNOR adds the output bubble.

::: gates
xor xnor
:::

Setting one input to a constant or to the other input gives rules that are used all the
time:

| XOR                        | XNOR                       |
| -------------------------- | -------------------------- |
| $A \oplus 0 = A$           | $A \odot 0 = \overline{A}$ |
| $A \oplus 1 = \overline{A}$ | $A \odot 1 = A$            |
| $A \oplus A = 0$           | $A \odot A = 1$            |
| $A \oplus \overline{A} = 1$ | $A \odot \overline{A} = 0$ |

So XOR with 1 is a *controllable inverter*: one input passes the other straight through
(when it is 0) or inverted (when it is 1).

::: law XOR and XNOR are complements | 异或与同或互为反运算
For the same inputs, XOR and XNOR always give opposite outputs:
$A \oplus B = \overline{A \odot B}$, and $A \odot B = \overline{A \oplus B}$.
:::

Check it below: $Y$ and $Z$ are always equal, and $W$ is always their opposite.

::: logic XOR is the complement of XNOR
inputs: A B
Y = A ⊕ B
Z = (A ⊙ B)'
W = A ⊙ B
:::

### AND-OR-INVERT

An **AND-OR-INVERT** gate ({{zh 与或非}}, AOI) ANDs groups of inputs, ORs the results,
and inverts:

$$Y = \overline{AB + CD}$$

Its national-standard symbol is one combined rectangle: the left part is divided into
one section per AND group (only the top section is marked &; the others leave it out),
the right part is marked ≥1, and there is a bubble on the output. In distinctive shapes
it is drawn as AND gates feeding a NOR gate. The groups can have any size and number,
for example $\overline{ABC + DEF}$ (two three-input groups) or $\overline{AB + CD + EF}$
(three two-input groups).

::: logic AND-OR-INVERT with two pairs
inputs: A B C D
Y = (A B + C D)'
:::

::: example Evaluating compound gates
Find each output for $A = 1$, $B = 0$, $C = 1$, $D = 1$:
(a) $\overline{AB}$, (b) $\overline{A + B}$, (c) $A \oplus C$, (d) $B \odot D$,
(e) $\overline{AB + CD}$.
== NAND and NOR ==
(a) $AB = 1 \cdot 0 = 0$, so $\overline{AB} = 1$. (b) $A + B = 1 + 0 = 1$, so
$\overline{A + B} = 0$.
== XOR and XNOR ==
(c) $A$ and $C$ are both 1, the same, so $A \oplus C = 0$. (d) $B = 0$ and $D = 1$ differ,
so $B \odot D = 0$.
== AND-OR-INVERT ==
(e) $AB = 0$, $CD = 1 \cdot 1 = 1$, so $AB + CD = 1$ and $Y = \overline{1} = 0$.
:::

::: callout key The one idea to remember
Every logic operation is completely described by its truth table. AND: 1 only if all
inputs are 1. OR: 0 only if all inputs are 0. NOT: the opposite. NAND and NOR are those
two inverted; XOR is 1 when the inputs differ, XNOR when they agree.
:::

::: callout exam For the exam
Expect to write truth tables for the gates, recognise both kinds of symbol (especially
the national-standard marks &, ≥1, 1, =1, =), and use the XOR/XNOR rules such as
$A \oplus 1 = \overline{A}$.
:::

::: cards Logic operations and gates
What do 0 and 1 mean for a logic variable? :: Two different states (on/off, high/low, true/false), not quantities.
AND (与) is 1 when … :: all of its inputs are 1.
OR (或) is 0 when … :: all of its inputs are 0.
$1 + 1$ in logic algebra :: $1$ (OR of two trues is true).
How many rows does a truth table with $n$ inputs have? :: $2^n$
National-standard mark for an AND gate :: &
National-standard mark for an OR gate :: ≥1
What does the bubble on a gate's output mean? :: The output is inverted (NOT).
NAND output is 0 only when … :: all inputs are 1: $Y = \overline{AB}$.
NOR output is 1 only when … :: all inputs are 0: $Y = \overline{A + B}$.
XOR (异或) in sum-of-products form :: $A \oplus B = \overline{A}B + A\overline{B}$ (1 when the inputs differ)
XNOR (同或) in sum-of-products form :: $A \odot B = \overline{A}\,\overline{B} + AB$ (1 when the inputs agree)
$A \oplus 1 = $ ? :: $\overline{A}$ (and $A \oplus 0 = A$)
$A \odot A = $ ? :: $1$ (and $A \oplus A = 0$)
AND-OR-INVERT (与或非) expression :: $Y = \overline{AB + CD}$
:::

::: quiz Check yourself
? Two switches in series control a lamp. Which logic operation is that?
- [x] AND
- [ ] OR
- [ ] NOT
- [ ] XOR
> Current flows only when both switches are closed, so the lamp is on only when $A = 1$ and $B = 1$: $Y = AB$. Switches in parallel would give OR.

? In the NOT circuit, the switch is connected across the lamp. What does the lamp do when the switch closes?
- [ ] It lights
- [x] It goes dark
- [ ] It stays as it was
> The closed switch short-circuits the lamp, so the current takes the switch and the lamp goes dark: $A = 1$ gives $Y = 0$, which is NOT.

? How many rows does the truth table of a 4-input function have?
answer: 16
tolerance: 0
> Each input has 2 values, so there are $2^4 = 16$ combinations.

? What is $Y = \overline{A + B}$ when $A = 0$ and $B = 1$?
answer: 0
tolerance: 0
> $A + B = 0 + 1 = 1$, and the NOT gives $\overline{1} = 0$. A NOR is 1 only when every input is 0.

? Which inputs make $Y = \overline{AB}$ (NAND) equal to 0?
- [ ] $A = 0$, $B = 0$
- [ ] $A = 0$, $B = 1$
- [ ] $A = 1$, $B = 0$
- [x] $A = 1$, $B = 1$
> $AB = 1$ only when both are 1, and then $\overline{AB} = 0$. Every other row gives 1.

? Write $A \oplus 1$ as simply as possible.
logic: A'
> XOR is 1 when its inputs differ. With the second input 1, the output is 1 exactly when $A = 0$: $A \oplus 1 = \overline{A}$.

? Write the XNOR $A \odot B$ as a sum of products.
logic: A' B' + A B
> XNOR is 1 when the inputs agree: both 0 ($\overline{A}\,\overline{B}$) or both 1 ($AB$). So $A \odot B = \overline{A}\,\overline{B} + AB$, which is also $\overline{A \oplus B}$.

? For $A = 1$, $B = 1$, $C = 0$, $D = 1$, what is $Y = \overline{AB + CD}$?
answer: 0
tolerance: 0
> $AB = 1$, $CD = 0$, so $AB + CD = 1$ and $Y = \overline{1} = 0$.

? A staircase lamp changes state whenever either of its two switches is flipped, and is off when both switches are down ($A = B = 0$). Which function is it?
- [x] $Y = A \oplus B$
- [ ] $Y = A \odot B$
- [ ] $Y = AB$
- [ ] $Y = A + B$
> Off at 00; flipping one switch (01 or 10) turns it on; flipping the other as well (11) turns it off again. That is 0, 1, 1, 0: the exclusive OR.
:::

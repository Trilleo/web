---
title: Adders
zh: 加法器
summary: Adding binary numbers in gates - the half adder, the full adder and how two half adders make one, the 4-bit ripple-carry adder, the carry-lookahead 74LS283, cascading two into an 8-bit adder, and subtracting with two's complement.
source: 第5章 组合逻辑电路 5.4 加法器, 2026-10-15
---

A computer's arithmetic rests on addition. Subtraction is addition of a complement,
multiplication is repeated addition (or, as in the multiplier of the first lesson,
addition of shifted products), and division is repeated subtraction. So the adder is
the most important combinational circuit there is. This lesson builds one up from a
single bit to an 8-bit adder made of two chips, and then makes the same chip
subtract.

## The half adder

Adding two 1-bit numbers is what you do in the rightmost column of a sum on paper:
$0+0 = 0$, $0+1 = 1$, $1+0 = 1$, and $1+1 = 10$ (that is, "write 0, carry 1"). Two
outputs are needed: the bit written in this column (the sum) and the bit carried to
the next (the carry).

::: define Half adder | 半加器
A circuit that adds two 1-bit numbers, the augend (被加数) $A_0$ and the addend (加数)
$B_0$, and outputs their sum (和) $S_0$ and carry (进位) $C_0$. It has no carry input.
:::

| Input $A_0$ | Input $B_0$ | Carry $C_0$ | Sum $S_0$ |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 |
| 1 | 0 | 0 | 1 |
| 1 | 1 | 1 | 0 |

The sum is 1 when exactly one input is 1 (XOR), and the carry only when both are (AND):

::: formula Half adder | 半加器
$$S_0 = \overline{A_0}B_0 + A_0\overline{B_0} = A_0 \oplus B_0, \qquad C_0 = A_0B_0$$
--
A_0, B_0 | the two 1-bit numbers (augend, addend) |
S_0 | sum bit (本位和) |
C_0 | carry to the next bit (进位) |
:::

::: callout note A dropped subscript
The slide writes the result as $A \oplus B$; with the slide's own names it is
$A_0 \oplus B_0$.
:::

It can be built as two ANDs and an OR (for $S_0$) plus an AND (for $C_0$), or more
simply as one XOR gate and one AND gate. Its symbol is a box marked Σ with inputs
$A_0$, $B_0$ and outputs $S_0$, $C_0$.

::: logic Half adder
inputs: A0 B0
S0 = A0 ⊕ B0
C0 = A0 B0
:::

## The full adder

Every column except the rightmost has three bits to add: the two numbers' bits *and*
the carry coming in from the column to its right. That's the full adder's job.

::: define Full adder | 全加器
A circuit that adds three 1-bit numbers, $A_i$, $B_i$ and the carry from the lower bit
$C_{i-1}$ (来自低位的进位), and outputs the sum $S_i$ and the carry to the higher bit $C_i$
(向高位的进位).
:::

| Input $A_i$ | Input $B_i$ | Carry in $C_{i-1}$ | Carry out $C_i$ | Sum $S_i$ |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 0 | 1 |
| 0 | 1 | 0 | 0 | 1 |
| 0 | 1 | 1 | 1 | 0 |
| 1 | 0 | 0 | 0 | 1 |
| 1 | 0 | 1 | 1 | 0 |
| 1 | 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 1 | 1 |

Each row is just "count the 1s and write the count in binary as $C_iS_i$": three 1s
make $11_2 = 3$.

The K-maps (variables $A$, $B$, $C$ standing for $A_i$, $B_i$, $C_{i-1}$; rows $A_i$,
columns $B_iC_{i-1}$). The sum's 1s form a checkerboard: no two are neighbours, so the
map can't simplify it, and each 1 is its own group.

::: kmap S
vars: A B C
ones: 1 2 4 7
group: A' B' C
group: A' B C'
group: A B' C'
group: A B C
:::

The carry's 1s pair up three ways:

::: kmap C
vars: A B C
ones: 3 5 6 7
group: B C
group: A C
group: A B
:::

The checkerboard is the XOR pattern from the parity generator: the sum is 1 for an
odd number of 1s. The carry is the majority function from the voter: 1 when at least
two inputs are 1.

::: formula Full adder | 全加器
$$\begin{aligned}S_i &= \textstyle\sum m(1,2,4,7)\\&= A_i \oplus B_i \oplus C_{i-1}\end{aligned}$$
$$\begin{aligned}C_i &= \textstyle\sum m(3,5,6,7)\\&= A_iB_i + A_iC_{i-1} + B_iC_{i-1}\\&= A_iB_i + (A_i \oplus B_i)C_{i-1}\end{aligned}$$
--
A_i, B_i | the two numbers' bits in column $i$ |
C_{i-1} | carry in, from column $i-1$ |
S_i | sum bit of column $i$ |
C_i | carry out, to column $i+1$ |
:::

Where does the second form of $C_i$ come from? Split the carry's 1s differently: $AB$
(cells 6 and 7), plus cell 5 ($A_i\overline{B_i}C_{i-1}$) and cell 3
($\overline{A_i}B_iC_{i-1}$) on their own. Those two singles are
$(A_i\overline{B_i} + \overline{A_i}B_i)C_{i-1} = (A_i \oplus B_i)C_{i-1}$. It isn't
the smallest sum of products, but it reuses the XOR that the sum needs anyway.

### Two half adders make a full adder

The form $C_i = A_iB_i + (A_i \oplus B_i)C_{i-1}$ is a circuit you've already met:

1. Half adder 1 adds $A_i$ and $B_i$: sum $A_i \oplus B_i$, carry $A_iB_i$.
2. Half adder 2 adds that sum and $C_{i-1}$: sum $A_i \oplus B_i \oplus C_{i-1} = S_i$,
   carry $(A_i \oplus B_i)C_{i-1}$.
3. An OR gate combines the two carries into $C_i$. (They can never both be 1, so OR
   is the same as adding them.)

::: logic A full adder from two half adders (C stands for the carry in)
inputs: A B C
S = A ⊕ B ⊕ C
Co = A B + (A ⊕ B) C
Maj = A B + A C + B C
:::

$Co$ (the two-half-adder carry) and $Maj$ (the minimal form) agree on every row.

::: example One column of a sum
In some column, $A_i = 1$, $B_i = 1$ and the carry in is $C_{i-1} = 1$. Find $S_i$ and $C_i$.
== Sum ==
$S_i = 1 \oplus 1 \oplus 1 = 0 \oplus 1 = 1$.
== Carry ==
$C_i = A_iB_i + (A_i \oplus B_i)C_{i-1} = 1 + 0 = 1$.
== Check ==
$1 + 1 + 1 = 3 = 11_2$: write 1, carry 1.
:::

## The 4-bit ripple-carry adder

Adding two multi-bit numbers follows the rules from school: start from the least
significant bit (最低有效位, LSB), work out each column's sum, pass its carry to the next
higher column, and finish with the most significant bit (最高有效位, MSB).

Hardware does exactly this with four full adders in a row. The rightmost takes
$A_0$, $B_0$ and an outside carry $C_0$, and gives $S_0$ and $C_1$; the next takes
$A_1$, $B_1$, $C_1$ and gives $S_1$, $C_2$; and so on up to $S_3$ and the final carry
$C_4$.

::: define Ripple-carry adder | 串行进位加法器
A multi-bit adder made of full adders in a chain, each one's carry out feeding the
next one's carry in, so the carry "ripples" from the LSB to the MSB.
:::

The 2-bit version below (with a carry in $C_0$) is the first half of that chain.
$C_1$ isn't a separate wire here, so it is written out: $C_1 = A_0B_0 + (A_0 \oplus B_0)C_0$.

::: logic A 2-bit ripple-carry adder (try 11 + 01 with C0 = 1)
inputs: A1 A0 B1 B0 C0
S0 = A0 ⊕ B0 ⊕ C0
S1 = A1 ⊕ B1 ⊕ (A0 B0 + (A0 ⊕ B0) C0)
C2 = A1 B1 + (A1 ⊕ B1)(A0 B0 + (A0 ⊕ B0) C0)
:::

::: callout pitfall Ripple carry is slow
The top bit can't settle until the carry has travelled through every stage below it.
With $n$ bits, the worst case (like $0111 + 0001$, where every column carries) waits
for $n$ carry delays. Simple, but slow for wide numbers.
:::

## The carry-lookahead adder 74LS283

The way out is not to wait. Each carry is, after all, just a logic function of the
input bits below it, and a function of known inputs can be computed directly.

::: law Principle of carry lookahead | 超前进位原理
The carry into bit $i$ is a function of the two numbers' bits $0$ to $i-1$ (and the
carry in), so it can be worked out from $A$ and $B$ directly before (in parallel
with) the addition, instead of waiting for it to ripple.
:::

Advantage: fast. Every bit's sum and the final carry appear at about the same time.
Disadvantage: the circuit is more complex.

To see how (this goes a little beyond the slide), call $G_i = A_iB_i$ the column's
*generate* (it makes a carry on its own) and $P_i = A_i \oplus B_i$ its *propagate*
(it passes an incoming carry on). The full adder's carry is $C_{i+1} = G_i + P_iC_i$,
and substituting each into the next gives

$$\begin{gathered}C_1 = G_0 + P_0C_0,\\C_2 = G_1 + P_1G_0 + P_1P_0C_0,\\C_3 = G_2 + P_2G_1 + P_2P_1G_0 + P_2P_1P_0C_0 .\end{gathered}$$

Each is a two-level AND-OR of signals available straight away: no rippling. The
**74LS283** is a 4-bit adder built like this: inputs $A_3 \dots A_0$, $B_3 \dots B_0$ and
the carry in CI ($C_0$), outputs $S_3 \dots S_0$ and the carry out CO ($C_4$). Inside,
each bit pair feeds a NAND and a NOR, a network of ANDs and NORs forms the carries, and
an XOR makes each sum bit. For the exam you need its pins and what it does, not its
gate-level diagram.

::: callout key The 74LS283 in one line
A 4-bit binary adder with carry in and carry out: $C_4S_3S_2S_1S_0 = A_3A_2A_1A_0 + B_3B_2B_1B_0 + C_0$.
:::

## Cascading two 74LS283 into an 8-bit adder

To add two 8-bit numbers, use two 4-bit adders and chain them the same way the full
adders were chained:

- **Chip (I)**, the low half, adds $A_3A_2A_1A_0$ and $B_3B_2B_1B_0$ and outputs
  $S_3S_2S_1S_0$. Its carry in $C_0$ is grounded (0).
- Chip (I)'s carry out $C_4$ goes to the carry in of **chip (II)**, the high half,
  which adds $A_7A_6A_5A_4$ and $B_7B_6B_5B_4$ and outputs $S_7S_6S_5S_4$.
- Chip (II)'s carry out is the 8-bit sum's carry, $C_8$.

::: example Adding two bytes with two 74LS283
Add $A = 1011\,0110$ and $B = 0110\,1101$ with the cascaded pair.
== Chip (I): the low nibbles ==
$0110 + 1101 + 0 = 6 + 13 = 19 = 1\,0011_2$: $S_3S_2S_1S_0 = 0011$, carry out $C_4 = 1$.
== Chip (II): the high nibbles ==
$1011 + 0110 + C_4 = 11 + 6 + 1 = 18 = 1\,0010_2$: $S_7S_6S_5S_4 = 0010$, $C_8 = 1$.
== Result ==
$C_8S_7 \dots S_0 = 1\,0010\,0011_2 = 256 + 32 + 2 + 1 = 291$. Check in decimal:
$182 + 109 = 291$.
:::

::: callout pitfall Ground the lowest carry in
The low chip's $C_0$ must be tied to 0. Left floating, a TTL input reads as 1, and
every sum comes out one too big.
:::

## Subtracting with the 74LS283

Recall two's complement (补码) from the number-systems unit: in 4 bits,
$-D$ is represented by $\overline{D} + 1$, the ones' complement (反码, every bit
inverted) plus one. So

$$A - D = A + \overline{D} + 1 .$$

An adder can subtract if you invert $D$ on the way in and supply the "+1" through the
carry in.

::: example A 74LS283 circuit with inverters (例)
$A_3A_2A_1A_0$ go straight into the A inputs; $D_3D_2D_1D_0$ each pass through an
inverter into $B_3B_2B_1B_0$; $C_0$ is tied to 1. What does the circuit do?
== What reaches the adder ==
The B inputs get $\overline{D_3}\,\overline{D_2}\,\overline{D_1}\,\overline{D_0}$, the ones'
complement of $D$. The carry in adds 1. Ones' complement + 1 = two's complement
(反码+1=补码).
== What it computes ==
$S = A + \overline{D} + 1 = A + (-D) = A - D$: the subtraction of two 4-bit numbers
(2个4位二进制数的减法运算).
== Try A = 1001, D = 0101 ==
$1001 + 1010 + 1 = 9 + 10 + 1 = 20 = 1\,0100_2$: $S = 0100 = 4$ and $C_4 = 1$.
Indeed $9 - 5 = 4$.
== Try A = 0101, D = 1001 ==
$0101 + 0110 + 1 = 5 + 6 + 1 = 12 = 0\,1100_2$: $S = 1100$, which is $-4$ in 4-bit
two's complement, and $C_4 = 0$. Indeed $5 - 9 = -4$.
:::

::: formula Subtraction by two's complement | 补码减法
$$A - D = A + \overline{D} + 1$$
--
\overline{D} | $D$ with every bit inverted (ones' complement, 反码) |
\overline{D} + 1 | the two's complement of $D$ (补码), which stands for $-D$ |
:::

::: callout note The carry out when subtracting
Not on the slide, but worth knowing: in this circuit $C_4 = 1$ means $A \ge D$ (no
borrow, the result is the plain difference), and $C_4 = 0$ means $A < D$ (the result is
negative, in two's complement). The two tries above show both cases.
:::

A 2-bit version of the subtractor, so you can see it work (the carry in is the
constant 1, and $C_1$ is written out as $A_0\overline{D_0} + (A_0 \oplus \overline{D_0})\cdot 1$):

::: logic A 2-bit subtractor: S1 S0 = A1 A0 − D1 D0
inputs: A1 A0 D1 D0
S0 = A0 ⊕ D0' ⊕ 1
S1 = A1 ⊕ D1' ⊕ (A0 D0' + (A0 ⊕ D0'))
C2 = A1 D1' + (A1 ⊕ D1')(A0 D0' + (A0 ⊕ D0'))
:::

::: callout exam What adder questions look like
Expect the half and full adder's truth tables and expressions, a full adder drawn
from two half adders, and a 74LS283 circuit to analyse: "what does it compute?" (with
inverters and $C_0 = 1$: subtraction) or "connect two chips into an 8-bit adder".
:::

::: cards Adders
Half adder (半加器) :: Adds two bits, no carry in: $S = A \oplus B$, $C = AB$.
Full adder (全加器) :: Adds $A_i$, $B_i$ and the carry in $C_{i-1}$; outputs $S_i$ and $C_i$.
Full adder sum :: $S_i = A_i \oplus B_i \oplus C_{i-1} = \sum m(1,2,4,7)$
Full adder carry :: $C_i = A_iB_i + A_iC_{i-1} + B_iC_{i-1} = A_iB_i + (A_i \oplus B_i)C_{i-1}$
Full adder from half adders :: Two half adders in series plus an OR gate on their carries.
Ripple-carry adder (串行进位) :: Full adders chained carry-out to carry-in; simple but slow.
Carry lookahead (超前进位) :: Each carry computed directly from the lower bits; fast but complex.
74LS283 :: 4-bit carry-lookahead binary adder with carry in $C_0$ and carry out $C_4$.
8-bit adder from two 74LS283 :: Low chip's $C_0 = 0$; its $C_4$ to the high chip's $C_0$; high chip's $C_4$ is $C_8$.
Subtracting with a 74LS283 :: Invert $D$ into the B inputs and set $C_0 = 1$: $A + \overline{D} + 1 = A - D$.
Two's complement (补码) :: Ones' complement (反码, invert every bit) plus 1.
Why the full adder's sum map can't be simplified :: Its 1s form a checkerboard: no two are adjacent.
:::

::: quiz Adders
? Write the half adder's sum $S$ in terms of its inputs $A$ and $B$.
logic: A ⊕ B
> $S = 1$ when exactly one input is 1: $\overline{A}B + A\overline{B} = A \oplus B$.

? Write the full adder's carry out in terms of $A$, $B$ and the carry in (write it as $C$).
logic: AB + AC + BC
> The carry is 1 when at least two of the three inputs are 1 (minterms 3, 5, 6, 7);
> any equivalent form, such as $AB + (A \oplus B)C$, is accepted.

? A full adder has $A_i = 1$, $B_i = 0$, $C_{i-1} = 1$. What are $C_i$ and $S_i$?
- [x] $C_i = 1$, $S_i = 0$
- [ ] $C_i = 0$, $S_i = 1$
- [ ] $C_i = 1$, $S_i = 1$
> $1 + 0 + 1 = 2 = 10_2$. By formula: $S_i = 1 \oplus 0 \oplus 1 = 0$;
> $C_i = AB + (A \oplus B)C = 0 + 1\cdot1 = 1$.

? A full adder is built from two half adders. What joins the two half adders' carry outputs?
- [x] An OR gate
- [ ] An AND gate
- [ ] An XOR gate
> $C_i = A_iB_i + (A_i \oplus B_i)C_{i-1}$: the first half adder's carry plus the second's,
> combined in an OR gate. (They are never both 1, so an XOR would also work, but the
> slide's circuit uses OR.)

? What is the main advantage of a carry-lookahead adder over a ripple-carry adder?
- [x] It is faster: all the carries are worked out at about the same time.
- [ ] It uses fewer gates.
- [ ] It can subtract without extra parts.
> Lookahead computes each carry from the input bits directly instead of waiting for it
> to pass through every lower stage. The price is a more complex circuit.

? Two 74LS283 make an 8-bit adder. Where does the low chip's carry out $C_4$ go?
- [x] To the high chip's carry in $C_0$
- [ ] To ground
- [ ] It is the 8-bit sum's carry $C_8$
> Like full adders in a chain: the low chip's carry out is the high chip's carry in.
> The low chip's own $C_0$ is grounded, and the high chip's $C_4$ is $C_8$.

? In the cascaded 8-bit adder, $A = 0111\,1111$ and $B = 0000\,0001$. What is the high chip's sum $S_7S_6S_5S_4$ as a decimal number?
answer: 8
tolerance: 0
> Low chip: $1111 + 0001 = 1\,0000$, so $S_3 \dots S_0 = 0000$ and $C_4 = 1$. High chip:
> $0111 + 0000 + 1 = 1000 = 8$. In all, $127 + 1 = 128 = 1000\,0000_2$.

? The 74LS283 subtractor (inverters on $D$, $C_0 = 1$) gets $A = 1100$ and $D = 0011$. What is $S_3S_2S_1S_0$ as a decimal number?
answer: 9
tolerance: 0
> $\overline{D} = 1100$. $1100 + 1100 + 1 = 12 + 12 + 1 = 25 = 1\,1001_2$, so $S = 1001 = 9$
> with $C_4 = 1$. Indeed $12 - 3 = 9$.

? Why is $C_0$ tied to 1 in the subtractor?
- [x] To add the 1 that turns the ones' complement of $D$ into its two's complement
- [ ] To enable the chip
- [ ] To make the carry out show a borrow
> The inverters give $\overline{D}$ (反码); adding 1 makes the two's complement (补码),
> which stands for $-D$. The carry in is a free place to add that 1.
:::

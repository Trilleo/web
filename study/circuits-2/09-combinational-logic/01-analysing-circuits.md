---
title: Analysing combinational circuits
zh: 组合逻辑电路的分析
summary: What makes a circuit combinational, the block model, and the four steps that turn a gate diagram into a description of what it does, worked on an equality detector, a 2-bit multiplier and a parity generator.
source: 第5章 组合逻辑电路, 2026-10-13
---

This chapter is about the digital circuits that have no memory: whatever you put on
their inputs, the outputs follow straight away, and nothing that happened before
matters. Adders, encoders, decoders and data selectors are all of this kind, so
almost every chip in the rest of the chapter is built from the ideas here. This first
lesson is about reading a circuit somebody else drew: given the gates, work out what
the circuit is *for*. The next lesson turns it around and designs circuits from a
description.

## Combinational and sequential logic

Think of a pocket calculator's "+" key compared with its memory key "M+". The adder
inside always gives the sum of the two numbers it is shown right now; ask it twice
with the same numbers and you get the same answer. The memory, though, answers with
whatever was stored earlier, so the same key press gives different results on
different days. Digital circuits split into these two families.

::: define Combinational logic circuit | 组合逻辑电路
A digital circuit whose output at any moment depends only on its inputs at that same
moment, and not on the state the circuit was in before.
:::

::: define Sequential logic circuit | 时序逻辑电路
A digital circuit whose output depends both on the present inputs and on the
circuit's previous state (what it has stored).
:::

Sequential circuits (flip-flops, counters, registers) come in a later chapter. Here
everything is combinational.

## The block model

However complicated a combinational circuit is, from outside it is a box with $n$
input variables $X_1, X_2, \dots, X_n$ on one side and $m$ output functions
$P_1, P_2, \dots, P_m$ on the other. Each output is some logic function of the
inputs:

::: formula Block model of a combinational circuit | 组合逻辑电路的功能描述
$$P_i = f_i(X_1, X_2, \dots, X_n), \qquad i = 1, 2, \dots, m$$
--
X_1 \dots X_n | the $n$ input logic variables (输入逻辑变量) |
P_1 \dots P_m | the $m$ output logic functions (输出逻辑函数) |
f_i | the logic function that gives output $P_i$ |
:::

Why does this work? Because of how the circuit is built.

::: law Structure of a combinational circuit | 组合逻辑电路的结构特点
A combinational circuit is made only of logic gates. Signals travel one way, from the
input side to the output side; there is no feedback path (反向传输路径), so the
circuit contains no {{term storage element | 存储单元}}. Therefore the present inputs
alone decide the present outputs.
:::

::: callout key The one thing to remember
No feedback, no memory: if you can trace every wire from the inputs forward to the
outputs without ever looping back, the circuit is combinational, and a truth table
describes it completely.
:::

## How to analyse a circuit

{{term Analysis | 分析}} means: you are given the logic diagram (已知逻辑电路图) and you
have to state its logic function (说明逻辑功能). The slides give four steps.

::: law Steps of analysis | 分析方法步骤
1. From the circuit diagram, write the logic expression of each gate output, working
   level by level from the inputs to the outputs (逐级写出).
2. Simplify or tidy the expression if necessary, usually into a minimal AND-OR
   (sum-of-products) form.
3. List the truth table (真值表).
4. Read the truth table and describe in words what the circuit does.
:::

Step 4 is the one that needs experience (the slide's bubble says 需要一定的知识积累):
you have to recognise patterns like "1 only when all inputs agree", "the outputs
spell out a product" or "1 when there's an odd number of 1s". The three examples
below are the classic patterns, and worth knowing by sight.

::: callout tip Label every wire
Before writing anything, write the expression next to every gate output on the
diagram. Then the final expression is just "substitute and simplify", and you can't
lose a gate.
:::

## Example 1: the all-inputs-equal detector

The circuit has inputs $A$, $B$, $C$. A 3-input NAND gate makes $\overline{ABC}$.
Three 2-input AND gates each combine one input with that signal, giving
$A\overline{ABC}$, $B\overline{ABC}$ and $C\overline{ABC}$. A 3-input NOR gate
combines the three AND outputs into $P$.

::: example What does the NAND–AND–NOR circuit do? (例1)
Analyse the NAND–AND–NOR circuit described above.
== Write the expression level by level ==
NAND: $\overline{ABC}$. ANDs: $A\overline{ABC}$, $B\overline{ABC}$, $C\overline{ABC}$.
NOR:
$$P = \overline{A\overline{ABC} + B\overline{ABC} + C\overline{ABC}}$$
== Simplify ==
Factor out $\overline{ABC}$, then use De Morgan's law on the outer bar:
$$P = \overline{(A+B+C)\,\overline{ABC}} = \overline{A+B+C} + ABC = \overline{A}\,\overline{B}\,\overline{C} + ABC$$
== Truth table ==
$P = 1$ only in the rows $ABC = 000$ and $ABC = 111$; every other row gives 0.

| $A$ | $B$ | $C$ | $P$ |
|---|---|---|---|
| 0 | 0 | 0 | 1 |
| 0 | 0 | 1 | 0 |
| 0 | 1 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 0 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 |
| 1 | 1 | 1 | 1 |
== Describe the function ==
The output is 1 exactly when all three inputs are the same. It is an
{{term equality detector | 一致性判别电路}} ("判一致").
:::

Try it: switch the inputs and compare the circuit as drawn ($P$) with the simplified
form ($Q$). They agree on every row.

::: logic Example 1: the circuit and its simplified form
inputs: A B C
P = (A (ABC)' + B (ABC)' + C (ABC)')'
Q = A'B'C' + ABC
:::

::: callout pitfall De Morgan on a long bar
$\overline{(A+B+C)\,\overline{ABC}}$ is **not** $\overline{A+B+C}\cdot ABC$. Breaking
a bar over a product turns the AND into an OR: $\overline{XY} = \overline{X} + \overline{Y}$.
Here $X = A+B+C$ and $Y = \overline{ABC}$, so $\overline{Y} = ABC$ and the result is
$\overline{A+B+C} + ABC$.
:::

## Example 2: a 2-bit multiplier

This circuit has four inputs, $A_1$, $A_0$, $B_1$, $B_0$, and four outputs
$F_4F_3F_2F_1$:

- two NAND gates make $\overline{A_1B_1}$ and $\overline{A_0B_0}$;
- a NOR of those two gives $F_4$;
- an inverter turns $\overline{A_1B_1}$ back into $A_1B_1$, and an AND with
  $\overline{A_0B_0}$ gives $F_3$;
- two AND gates make $A_1B_0$ and $A_0B_1$, and an XOR of them gives $F_2$;
- an inverter on $\overline{A_0B_0}$ gives $F_1$.

::: example Four outputs from four inputs (例2)
Find the expressions and the truth table, and say what the circuit does.
== Expressions ==
$$F_4 = \overline{\overline{A_1B_1} + \overline{A_0B_0}} = A_1B_1\cdot A_0B_0 = A_1A_0B_1B_0$$
$$F_3 = A_1B_1\cdot\overline{A_0B_0} = A_1B_1(\overline{A_0} + \overline{B_0}) = A_1\overline{A_0}B_1 + A_1B_1\overline{B_0}$$
$$F_2 = (A_1B_0) \oplus (A_0B_1), \qquad F_1 = \overline{\overline{A_0B_0}} = A_0B_0$$
== Truth table ==
Read $A_1A_0$ and $B_1B_0$ as 2-bit numbers (0 to 3):

| $A_1A_0$ | $B_1B_0$ | $F_4F_3F_2F_1$ | meaning |
|---|---|---|---|
| any | 00 | 0000 | $x \times 0 = 0$ |
| 00 | any | 0000 | $0 \times y = 0$ |
| 01 | 01 | 0001 | $1\times1 = 1$ |
| 01 | 10 | 0010 | $1\times2 = 2$ |
| 01 | 11 | 0011 | $1\times3 = 3$ |
| 10 | 01 | 0010 | $2\times1 = 2$ |
| 10 | 10 | 0100 | $2\times2 = 4$ |
| 10 | 11 | 0110 | $2\times3 = 6$ |
| 11 | 01 | 0011 | $3\times1 = 3$ |
| 11 | 10 | 0110 | $3\times2 = 6$ |
| 11 | 11 | 1001 | $3\times3 = 9$ |
== Describe the function ==
The outputs are always the binary product: $A_1A_0 \times B_1B_0 = F_4F_3F_2F_1$, with
$F_4$ the most significant bit. It is a **2-bit × 2-bit multiplier**.
:::

Why these expressions? Write the numbers as $A = 2A_1 + A_0$ and $B = 2B_1 + B_0$.
Then

$$A \times B = 4A_1B_1 + 2(A_1B_0 + A_0B_1) + A_0B_0 .$$

The lowest bit is $A_0B_0$ ($F_1$). The "2s" column holds $A_1B_0 + A_0B_1$, which can
be 2: its bit is the XOR ($F_2$) and it carries $A_1B_0\cdot A_0B_1 = A_1A_0B_1B_0$
into the "4s" column. That column holds $A_1B_1$ plus that carry: they're both 1 only
for $3\times3$, which makes $F_3 = 0$ and carries into $F_4$.

::: logic Example 2: the 2-bit multiplier (try 3 × 3)
inputs: A1 A0 B1 B0
F4 = A1 A0 B1 B0
F3 = A1 B1 (A0 B0)'
F2 = A1 B0 ⊕ A0 B1
F1 = A0 B0
:::

::: callout tip Recognising arithmetic
When a circuit has as many outputs as there are bits in a sum or product, group the
inputs into numbers ($A_1A_0$, $B_1B_0$) and the outputs into a number, then look at a
few rows in decimal. The pattern usually jumps out.
:::

## Example 3: an odd/even parity generator

$A$ and $B$ go into an XOR gate (异或门). Its output and $C$ go into a second XOR
gate, giving $P_1$, and also into an XNOR gate (同或门, "XOR-NOT"), giving $P_2$.

::: gates
xor xnor
:::

::: example Two outputs from two XOR gates (例3)
Analyse the circuit.
== Expressions ==
$$P_1 = A \oplus B \oplus C, \qquad P_2 = \overline{(A \oplus B) \oplus C}$$
== Truth table ==

| $A$ | $B$ | $C$ | number of 1s | $P_1$ | $P_2$ |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | 0 | 1 | 1 | 1 | 0 |
| 0 | 1 | 0 | 1 | 1 | 0 |
| 0 | 1 | 1 | 2 | 0 | 1 |
| 1 | 0 | 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 2 | 0 | 1 |
| 1 | 1 | 0 | 2 | 0 | 1 |
| 1 | 1 | 1 | 3 | 1 | 0 |
== Describe the function ==
$P_1 = 1$ when the inputs hold an **odd** number of 1s (奇数个1校验); $P_2 = 1$ when
they hold an **even** number (偶数个1校验). The circuit is an
{{term odd/even parity generator | 奇偶校验发生器}}.
:::

::: logic Example 3: the parity generator
inputs: A B C
P1 = A ⊕ B ⊕ C
P2 = (A ⊕ B) ⊙ C
:::

Why parity? When data is sent over a wire, one bit can flip by noise. The sender adds
a parity bit chosen so that the total number of 1s is, say, even; the receiver counts
again and, if the count comes out odd, knows a bit was corrupted. A chain of XOR gates
is exactly a "count the 1s, keep the last bit" machine.

::: callout key XOR counts
$A \oplus B \oplus C \oplus \dots$ is 1 exactly when an odd number of its inputs are 1.
The XNOR of the same signals is its complement: 1 for an even number.
:::

::: callout exam What analysis questions look like
Exams give a gate diagram and ask for (1) the expression, (2) the truth table, and
(3) the function in words. Marks go to each step, so write all three, even when you
recognise the function at a glance.
:::

::: cards Analysing combinational circuits
Combinational logic circuit (组合逻辑电路) :: Output depends only on the present inputs, not on the previous state.
Sequential logic circuit (时序逻辑电路) :: Output depends on the present inputs and on the circuit's previous state.
Why has a combinational circuit no memory? :: It is made only of gates, signals go one way, with no feedback path, so no storage element.
Block model of a combinational circuit :: $P_i = f_i(X_1, \dots, X_n)$, $i = 1 \dots m$: each output is a function of the inputs.
The four steps of analysis :: Write expressions level by level → simplify → truth table → describe the function.
$P = \overline{A}\,\overline{B}\,\overline{C} + ABC$ is … :: An equality (all-inputs-equal) detector, 一致性判别电路.
$A \oplus B \oplus C$ is 1 when … :: An odd number of the inputs are 1 (odd parity).
$\overline{A \oplus B \oplus C}$ is 1 when … :: An even number of the inputs are 1.
2-bit multiplier: lowest product bit :: $F_1 = A_0B_0$.
2-bit multiplier: the "2s" bit :: $F_2 = A_1B_0 \oplus A_0B_1$.
2-bit multiplier: the highest bit :: $F_4 = A_1A_0B_1B_0$ (only 3 × 3 = 9 reaches it).
:::

::: quiz Analysing combinational circuits
? Which statement describes a combinational logic circuit?
- [x] Its outputs depend only on its present inputs.
- [ ] Its outputs depend on the present inputs and the previous state.
- [ ] It must contain at least one flip-flop.
> Combinational circuits have no feedback and no storage element, so only the present
> inputs matter. Depending on the previous state is the definition of a sequential
> circuit.

? Simplify $P = \overline{(A+B+C)\,\overline{ABC}}$ to a sum of products in $A$, $B$, $C$.
logic: A'B'C' + ABC
> De Morgan: $\overline{XY} = \overline{X} + \overline{Y}$ with $X = A+B+C$,
> $Y = \overline{ABC}$, so $P = \overline{A+B+C} + ABC = \overline{A}\,\overline{B}\,\overline{C} + ABC$.

? In Example 1, for how many of the 8 input combinations is $P = 1$?
answer: 2
tolerance: 0
> Only $000$ and $111$: the two rows where all inputs are equal.

? In the 2-bit multiplier, $A_1A_0 = 11$ and $B_1B_0 = 10$. What is $F_4F_3F_2F_1$?
- [x] 0110
- [ ] 0101
- [ ] 1001
- [ ] 0011
> $3 \times 2 = 6 = 0110$. Check with the expressions: $F_4 = A_1A_0B_1B_0 = 0$
> ($B_0 = 0$); $F_3 = A_1B_1\overline{A_0B_0} = 1\cdot1\cdot1 = 1$;
> $F_2 = A_1B_0 \oplus A_0B_1 = 0 \oplus 1 = 1$; $F_1 = A_0B_0 = 0$.

? Write the multiplier's output $F_2$ in terms of $A_1$, $A_0$, $B_1$, $B_0$.
logic: A1 B0 ⊕ A0 B1
> The "2s" column of $(2A_1+A_0)(2B_1+B_0)$ holds $A_1B_0 + A_0B_1$; its bit is the
> XOR of the two products (the carry from it goes up a column).

? For the parity generator, inputs $ABC = 101$. What are $P_1$ and $P_2$?
- [x] $P_1 = 0$, $P_2 = 1$
- [ ] $P_1 = 1$, $P_2 = 0$
- [ ] $P_1 = 1$, $P_2 = 1$
> Two 1s is an even number: $P_1 = 1 \oplus 0 \oplus 1 = 0$, and $P_2$ is its complement, 1.

? What does the XOR chain $A \oplus B \oplus C \oplus D$ give for $ABCD = 1101$?
answer: 1
tolerance: 0
> Three 1s, an odd number, so the XOR chain gives 1.

? Put the steps of analysis in order: which comes **third**?
- [ ] Write the expressions level by level
- [ ] Simplify the expression
- [x] List the truth table
- [ ] Describe the function in words
> Expressions → simplify → truth table → describe. The truth table is the third step,
> and describing the function in words is the last.
:::

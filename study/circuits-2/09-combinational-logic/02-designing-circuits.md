---
title: Designing combinational circuits
zh: 组合逻辑电路的设计
summary: Rewriting one function in five gate-friendly forms (AND-OR, NAND-NAND, AND-OR-INVERT, OR-AND, NOR-NOR), the design steps, and three designs from words to gates - a car buzzer, a heating controller with don't-cares, and a majority voter.
source: 第5章 组合逻辑电路, 2026-10-13 → 10-15
---

Analysis reads a circuit; design writes one. You start from a sentence ("sound the
buzzer when the door is open and…") and end with a gate diagram that does it with as
few gates, gate types and wires as possible. Real designs are also told *which* gates
to use, since a board may only carry NAND chips, or NOR chips. So before the design
steps, this lesson shows how to rewrite one logic function in five equivalent forms,
each of which maps directly onto one kind of gate.

## One function, five forms

An expression's shape decides the circuit: each product term becomes an AND gate,
each sum an OR gate, each bar an inverter or a bubble. Changing the shape (without
changing the truth table) changes which gates you need. The running example is

$$Y = \overline{A}B + A\overline{C}.$$

### The minimal AND-OR form

::: define Minimal AND-OR expression | 最简与或表达式
A sum of products with, first, the fewest product terms (乘积项最少: fewest AND gates,
and fewest inputs on the OR gate after them), and then the fewest variables in each
term (变量最少: fewest inputs on each AND gate).
:::

$Y = \overline{A}B + A\overline{C}$ is already minimal: two terms of two variables. It
needs two ANDs, an OR and inverters for $\overline{A}$ and $\overline{C}$.

### The NAND-NAND form

::: law Getting the NAND-NAND form | 与非—与非式
1. Complement the minimal AND-OR expression twice (两次取反): nothing changes.
2. Use De Morgan's law to remove the inner bar (摩根定律去掉内层的非号).
:::

$$Y = \overline{\overline{\overline{A}B + A\overline{C}}} = \overline{\overline{\overline{A}B}\cdot\overline{A\overline{C}}}$$

Read it from inside out: two NAND gates make $\overline{\overline{A}B}$ and
$\overline{A\overline{C}}$, and a third NAND combines them. Any AND-OR circuit turns
into NAND-NAND by replacing every gate with a NAND: the bubbles on the AND outputs and
the OR inputs cancel in pairs.

### The AND-OR-INVERT form

::: law Getting the AND-OR-INVERT form | 与或非式
1. Find the complement function $\overline{Y}$ as a minimal AND-OR expression
   (求出反函数的与或式).
2. Complement it: $Y = \overline{\overline{Y}}$ is a NOT of a sum of products.
:::

$$\overline{Y} = \overline{\overline{A}B}\cdot\overline{A\overline{C}} = (A + \overline{B})(\overline{A} + C) = \overline{A}\,\overline{B} + AC + \overline{B}C = \overline{A}\,\overline{B} + AC$$

The term $\overline{B}C$ disappears because it is the consensus of $\overline{A}\,\overline{B}$
and $AC$ (whenever $\overline{B}C = 1$, one of the other two is 1). So

$$Y = \overline{\overline{A}\,\overline{B} + AC},$$

one AND-OR-INVERT gate (与或非门): ANDs feeding a NOR.

### The OR-AND form

::: law Getting the OR-AND form | 或与式
1. Find the AND-OR-INVERT form.
2. Apply De Morgan (the complement theorem, 反演定理) to write it as a product of sums.
:::

$$Y = \overline{\overline{A}\,\overline{B} + AC} = \overline{\overline{A}\,\overline{B}}\cdot\overline{AC} = (A + B)(\overline{A} + \overline{C})$$

### The NOR-NOR form

There are two routes; both arrive at the same place.

::: law Getting the NOR-NOR form | 或非—或非式
Method 1: start from the AND-OR-INVERT form and turn each product term into a NOR
with De Morgan ($XY = \overline{\overline{X} + \overline{Y}}$).
Method 2: start from the OR-AND form, complement it twice, and remove the inner bar
with De Morgan.
:::

Method 1: $Y = \overline{\overline{A}\,\overline{B} + AC} = \overline{\overline{A + B} + \overline{\overline{A} + \overline{C}}}$.

Method 2: $Y = (A + B)(\overline{A} + \overline{C}) = \overline{\overline{(A + B)(\overline{A} + \overline{C})}} = \overline{\overline{A + B} + \overline{\overline{A} + \overline{C}}}$.

Two NOR gates make $\overline{A + B}$ and $\overline{\overline{A} + \overline{C}}$, and a
third NOR combines them.

::: callout key The duality to remember
NAND-NAND comes from the AND-OR form of $Y$; AND-OR-INVERT, OR-AND and NOR-NOR all come
from the AND-OR form of $\overline{Y}$ (that is, from grouping the **0s** of the map).
:::

All five forms are the same function. Switch the inputs and watch every output agree:

::: logic Five forms of Y = A'B + AC'
inputs: A B C
AO = A'B + AC'
NN = ((A'B)' (AC')')'
AOI = (A'B' + AC)'
OA = (A + B)(A' + C')
NR = ((A + B)' + (A' + C')')'
:::

::: callout pitfall A NAND is not an AND with bars on the inputs
$\overline{AB} = \overline{A} + \overline{B}$, not $\overline{A}\,\overline{B}$. When
converting, write the bars out step by step; skipping a De Morgan step is the most
common way to lose marks here.
:::

## The design steps

::: law Steps of design | 设计步骤
1. Analyse the problem: decide the input and output variables, define what 0 and 1
   mean for each (逻辑赋值), and list the truth table.
2. Write the expression and simplify it (usually with a Karnaugh map).
3. Convert it to the form the required gates or chips need (形式变换).
4. Draw the logic diagram.
:::

The aim is the simplest circuit: fewest devices, fewest kinds of device, and fewest
connections between them.

::: callout key Step 1 is the hard part
The slide is explicit: turning the requirement into a logic relationship (分析题意，
将设计要求转化为逻辑关系) is the key step. Once the truth table is right, the rest is
routine.
:::

## Example 4: the car buzzer with NOR gates

::: example A car's warning buzzer (例4)
The buzzer sounds when the window and the door are both open, or when the key is in
the ignition position and the door is open. Build it with NOR gates only.
== Assign variables ==
The buzzer depends on the window $W$, the door $D$ and the key $K$. Window and door
open: 1, closed: 0; key in the ignition position: $K = 1$. Buzzer sounding: $F = 1$.
In words, $F = WD + KD$.
== Map and simplify ==
For NOR gates we want an OR-AND form, so we group the **0s** to get $\overline{F}$
(Figure below): the four cells with $D = 0$ give $\overline{D}$, and the two cells with
$K = 0$, $W = 0$ give $\overline{K}\,\overline{W}$:
$$\overline{F} = \overline{D} + \overline{W}\,\overline{K}$$
== Convert to NOR-NOR ==
$$F = \overline{\overline{F}} = \overline{\overline{D} + \overline{W}\,\overline{K}} = \overline{\overline{D} + \overline{W + K}}$$
== Draw it ==
Three NOR gates: NOR($W$, $K$) gives $\overline{W+K}$; a NOR with both inputs tied to
$D$ gives $\overline{D}$ (a NOR used as an inverter); a final NOR of the two gives $F$.
:::

::: kmap F'
vars: K W D
ones: 0 1 2 4 6
group: D'
group: K' W'
:::

The map above is of $\overline{F}$ (the 0s of $F$); rows are $K$, columns $WD$ as on the
slide. Check the NOR circuit against the original sentence:

::: logic The buzzer: NOR circuit against the rule
inputs: W D K
F = ((D + D)' + (W + K)')'
Rule = W D + K D
:::

::: callout tip A NOR as an inverter
Tie both inputs of a NOR (or a NAND) together and it becomes a NOT:
$\overline{D + D} = \overline{D}$. That's how "NOR gates only" designs get their
inverters.
:::

## Example 5: room heating with don't-cares

::: example Heating control with an AND-OR-INVERT gate (例5)
A room is heated in the day when it is below 20 °C, and at night when it is below
17 °C. The output $F$ must be high only when heating is needed. Use an AND-OR-INVERT
gate.
== Assign variables ==
$A = 1$ at night, $A = 0$ in the day. $B = 1$ when the room is above 20 °C;
$C = 1$ when it is above 17 °C. Heating: $F = 1$.
== Truth table, with don't-cares ==
$B = 1$, $C = 0$ (above 20 °C but not above 17 °C) can't happen, day or night. Its
output is a {{term don't-care | 约束项}}, written ×.

| $A$ | $B$ | $C$ | $F$ | why |
|---|---|---|---|---|
| 0 | 0 | 0 | 1 | day, below 17 °C |
| 0 | 0 | 1 | 1 | day, 17–20 °C |
| 0 | 1 | 0 | × | impossible |
| 0 | 1 | 1 | 0 | day, above 20 °C |
| 1 | 0 | 0 | 1 | night, below 17 °C |
| 1 | 0 | 1 | 0 | night, 17–20 °C |
| 1 | 1 | 0 | × | impossible |
| 1 | 1 | 1 | 0 | night, above 20 °C |
== Group the 0s ==
An AND-OR-INVERT gate wants $\overline{F}$ as a sum of products. Group the 0s, using
the ×s where they help: the columns $BC = 11$ and $10$ give $B$; the cells $A = 1$,
$BC = 01$ and $11$ give $AC$:
$$\overline{F} = B + AC$$
== Convert and draw ==
$$F = \overline{\overline{F}} = \overline{B + AC}$$
One AND-OR-INVERT gate: one AND with both inputs tied to $B$, one AND of $A$ and $C$,
both into the NOR.
:::

::: kmap F'
vars: A B C
ones: 3 5 7
dont-care: 2 6
group: B
group: A C
:::

::: logic The heating controller
inputs: A B C
F = (B + AC)'
:::

In the lab, rows 010 and 110 show $F = 0$: the circuit treated those don't-cares as 0
(they were inside the group $B$ of $\overline{F}$). That's allowed, because those rows
never happen.

::: callout pitfall Don't-cares are choices, not values
A × may be read as 1 in one map and 0 in another. Grouping the 1s of this same map
would use the ×s as 1s and give $F = \overline{C} + \overline{A}\,\overline{B}$, a
different-looking but equally valid answer, since the two differ only in the
impossible rows.
:::

## The three-person majority voter with NAND gates

::: example A majority voter (课堂练习)
Three people $A$, $B$, $C$ each have a button, pressed to agree. A lamp $L$ lights
when the majority agrees. Use NAND gates.
== Assign variables ==
Pressed: 1, not pressed: 0. Lamp on (majority): $L = 1$.
== Truth table ==
$L = 1$ when at least two inputs are 1: rows 011, 101, 110, 111.
== Map ==
Three overlapping pairs (Figure below): $AB$, $AC$ and $BC$, so
$$L = AB + AC + BC$$
== NAND-NAND ==
$$L = \overline{\overline{AB + AC + BC}} = \overline{\overline{AB}\cdot\overline{AC}\cdot\overline{BC}}$$
Three 2-input NANDs, NAND($A$,$B$), NAND($A$,$C$), NAND($B$,$C$), feed one 3-input NAND.
:::

::: kmap L
vars: A B C
ones: 3 5 6 7
group: A B
group: A C
group: B C
:::

::: logic The majority voter in NAND gates
inputs: A B C
L = ((AB)' (AC)' (BC)')'
:::

::: callout exam What design questions look like
"Design a circuit that … using only NAND (or NOR) gates" is the standard question.
Show each step: the variable assignment, the truth table, the map with its groups,
the conversion, and the diagram. Choose the right map: group the 1s for NAND-NAND,
the 0s for NOR-NOR or AND-OR-INVERT.
:::

::: cards Designing combinational circuits
Minimal AND-OR expression :: Fewest product terms first, then fewest variables in each term.
NAND-NAND form, how? :: Complement the minimal AND-OR form twice, then De Morgan away the inner bar.
AND-OR-INVERT form, how? :: Find $\overline{Y}$ as minimal AND-OR, then complement it.
OR-AND form, how? :: From the AND-OR-INVERT form, apply De Morgan to get a product of sums.
NOR-NOR form, how? :: Double-complement the OR-AND form and De Morgan the inner bar (or turn each AOI product into a NOR).
NAND-NAND of $Y = AB + CD$ :: $\overline{\overline{AB}\cdot\overline{CD}}$
OR-AND form of $Y = \overline{A}B + A\overline{C}$ :: $(A + B)(\overline{A} + \overline{C})$
The design steps :: Variables and truth table → expression and simplify → convert the form → draw the circuit.
The key step of design :: Turning the requirement into a logic relationship (the truth table).
Don't-care (约束项, ×) :: An input combination that never happens; its output may be taken as 0 or 1.
3-person majority voter :: $L = AB + AC + BC$
A NOR as an inverter :: Tie its inputs together: $\overline{D + D} = \overline{D}$.
:::

::: quiz Designing combinational circuits
? Convert $Y = AB + CD$ to NAND-NAND form. (In-class question 11-017.) {#nand-nand-ab-cd}
- [ ] $Y = \overline{AB\cdot CD}$
- [x] $Y = \overline{\overline{AB}\cdot\overline{CD}}$
- [ ] $Y = \overline{AB}\cdot\overline{CD}$
> Complement twice: $Y = \overline{\overline{AB + CD}}$, then De Morgan on the inner bar:
> $\overline{AB + CD} = \overline{AB}\cdot\overline{CD}$. So $Y = \overline{\overline{AB}\cdot\overline{CD}}$.
> The first option is a 4-input NAND (it is 1 unless all four are 1); the third is
> missing the outer bar and is $\overline{Y}$.

? Write the complement of $Y = \overline{A}B + A\overline{C}$ as a minimal sum of products.
logic: A'B' + AC
> $\overline{Y} = (A + \overline{B})(\overline{A} + C) = \overline{A}\,\overline{B} + AC + \overline{B}C$,
> and the consensus term $\overline{B}C$ drops out.

? Write $Y = \overline{A}B + A\overline{C}$ as a product of sums (OR-AND form). The checker accepts any equivalent form.
logic: (A + B)(A' + C')
> From the AND-OR-INVERT form $\overline{\overline{A}\,\overline{B} + AC}$, De Morgan gives
> $\overline{\overline{A}\,\overline{B}}\cdot\overline{AC} = (A + B)(\overline{A} + \overline{C})$.

? Which form needs only NOR gates?
- [ ] $\overline{\overline{\overline{A}B}\cdot\overline{A\overline{C}}}$
- [x] $\overline{\overline{A + B} + \overline{\overline{A} + \overline{C}}}$
- [ ] $\overline{\overline{A}\,\overline{B} + AC}$
> The second is a NOR of two NORs. The first is NAND-NAND; the third is AND-OR-INVERT.

? In the car buzzer, the window is open, the door is open and the key is out ($W = 1$, $D = 1$, $K = 0$). Does the buzzer sound?
- [x] Yes
- [ ] No
> $F = WD + KD = 1\cdot1 + 0\cdot1 = 1$: window and door both open is enough.

? Write the buzzer's output $F$ in terms of $W$, $D$ and $K$.
logic: D (W + K)
> The rule is $F = WD + KD = D(W + K)$, which is what the NOR circuit
> $\overline{\overline{D} + \overline{W + K}}$ gives after De Morgan.

? In the heating example, why is $B = 1$, $C = 0$ a don't-care?
- [x] The room can't be above 20 °C and not above 17 °C at the same time.
- [ ] Heating is never needed at night.
- [ ] The output doesn't matter above 20 °C.
> $B = 1$ means above 20 °C, $C = 0$ means not above 17 °C: contradictory, so that
> combination never occurs and its output may be chosen freely.

? Write the heating controller's output $F$ (with the don't-cares as the circuit $\overline{B + AC}$ takes them).
logic: (B + AC)'
> Grouping the 0s with the ×s gives $\overline{F} = B + AC$, so $F = \overline{B + AC}$,
> one AND-OR-INVERT gate.

? How many 2-input NAND gates does the majority voter use before its final 3-input NAND?
answer: 3
tolerance: 0
> One for each product term of $L = AB + AC + BC$: $\overline{AB}$, $\overline{AC}$, $\overline{BC}$.
:::

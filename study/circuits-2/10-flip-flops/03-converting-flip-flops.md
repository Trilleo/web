---
title: Converting between flip-flops
zh: 不同功能触发器的转换
summary: How to make one kind of flip-flop behave as another by driving its inputs with a little logic - by comparing characteristic equations or by using the drive table - worked for JK→T′, JK→D, JK→T, D→T′, D→T and D→JK.
source: 第6章 触发器 6.5
---

Integrated flip-flops mostly come as JK or D chips (the 74LS112 is a dual falling-edge
JK, the 74LS74 a dual rising-edge D). If a design calls for a T′ or a D flip-flop and
the board only has JKs, you don't need a new chip: a few wires, and sometimes a gate or
two in front of the inputs, make the flip-flop you have behave exactly like the one you
need. This lesson gives the method and works all the conversions the slides show
(JK→T′, D→T′, D→JK), plus JK→D, which the final exam asks for, and the two T
conversions for completeness. It uses the characteristic equations and drive tables
of Lessons 10.1 and 10.2.

## The idea

The flip-flop you have (the **given** one, 已有触发器) changes state according to its own
characteristic equation. The flip-flop you want (the **target**, 待求触发器) has another.
You may connect the given flip-flop's inputs to anything: the target's inputs, its own
outputs $Q^n$ and $\overline{Q^n}$, constants 0 and 1, and gates combining them. Choose the
connections so that the given flip-flop's next state always comes out as the target's
would.

::: define Drive equation | 驱动方程
An expression for a flip-flop's input (such as $J = \dots$, $K = \dots$ or $D = \dots$)
in terms of the circuit's signals and the flip-flop's present state. It says how that
input is wired. In a conversion it is the "conversion logic" (转换逻辑).
:::

::: law Converting one flip-flop into another | 触发器转换的方法
The key is to find the excitation (input) conditions of the given flip-flop
(找出被转换触发器的激励条件). **Method 1:** set the two characteristic equations equal
(特性方程相等) and read off the drive equations by comparing terms. **Method 2:** for each
target input and present state, find the next state the target would reach, look up in
the given flip-flop's drive table which inputs produce that change, and simplify those
inputs with a Karnaugh map.
:::

For method 1 it helps to write the target's equation in the same shape as the given
one's. The JK equation is $Q^{n+1} = J\,\overline{Q^n} + \overline{K}\,Q^n$: one coefficient
multiplies $\overline{Q^n}$, the other multiplies $Q^n$. Any target equation can be put in
that shape using $X = X\overline{Q^n} + XQ^n$ (since $\overline{Q^n} + Q^n = 1$). Then match
coefficients: $J$ is what multiplies $\overline{Q^n}$, $\overline{K}$ is what multiplies $Q^n$.

The asynchronous pins $\overline{R}_d$ and $\overline{S}_d$ play no part in a conversion: tie
them to 1, as always in normal operation. The clock edge stays the given flip-flop's.

## JK into T′

::: example Make a JK flip-flop act as a T′ flip-flop (slide example)
Given: $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$. Target: $Q^{n+1} = \overline{Q^n}$.
== Put the target in JK shape ==
$\overline{Q^n} = 1 \cdot \overline{Q^n} + 0 \cdot Q^n$.
== Compare ==
$J = 1$ and $\overline{K} = 0$, so $K = 1$. With $J = K = 1$ the two equations are equal.
== Circuit ==
Tie $J$, $K$, $\overline{R}_d$ and $\overline{S}_d$ all to logic 1; the clock goes to C1. The
JK flip-flop now toggles at every active edge.
:::

The slide adds that **the answer isn't unique** (答案不唯一): $J = \overline{Q^n}$,
$K = Q^n$ also works. Check it in the JK equation:

$$Q^{n+1} = \overline{Q^n}\cdot\overline{Q^n} + \overline{Q^n}\cdot Q^n = \overline{Q^n} + 0 = \overline{Q^n}$$

Method 2 shows where the freedom comes from. A T′ flip-flop must go 0 → 1 from state 0
and 1 → 0 from state 1. The JK drive table says:

| Present $Q^n$ | Target's next $Q^{n+1}$ | Needed J | Needed K |
|---|---|---|---|
| 0 | 1 | 1 | × |
| 1 | 0 | × | 1 |

$J$ must be 1 when $Q^n = 0$ and is free when $Q^n = 1$; choosing the × as 1 gives $J = 1$,
choosing it as 0 gives $J = \overline{Q^n}$. Likewise $K = 1$ or $K = Q^n$. The constants need
no wiring, so $J = K = 1$ is the usual answer.

## JK into D

This one isn't on the slides, but the final exam lists it.

::: example Make a JK flip-flop act as a D flip-flop, by comparing equations
Given: $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$. Target: $Q^{n+1} = D$.
== Put the target in JK shape ==
$D = D\,(\overline{Q^n} + Q^n) = D\,\overline{Q^n} + D\,Q^n$.
== Compare ==
The coefficient of $\overline{Q^n}$: $J = D$. The coefficient of $Q^n$: $\overline{K} = D$,
so $K = \overline{D}$.
== Circuit ==
Connect the input $D$ straight to $J$, and through an inverter (a NOT gate) to $K$.
$\overline{R}_d = \overline{S}_d = 1$, the clock to C1.
== Check ==
$Q^{n+1} = D\,\overline{Q^n} + \overline{\overline{D}}\,Q^n = D\,\overline{Q^n} + D\,Q^n = D$. In words:
$J$ and $K$ are now always opposite, and a JK flip-flop with $J \ne K$ copies $J$, which
is $D$.
:::

::: example The same conversion with the drive table
For each value of $D$ and $Q^n$: the target's next state is $D$; the JK drive table
gives the $J$ and $K$ that make that change.
== Table ==

| Input D | Present $Q^n$ | Next $Q^{n+1}$ | Needed J | Needed K |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | × |
| 0 | 1 | 0 | × | 1 |
| 1 | 0 | 1 | 1 | × |
| 1 | 1 | 1 | × | 0 |
== Map for J ==
With variables $D$, $Q$ (= $Q^n$), $J$ is 1 in minterm 2 ($D = 1$, $Q = 0$), × in minterms
1 and 3, 0 in minterm 0. The ×s let the 1 join the whole $D = 1$ row:
== Map for K ==
$K$ is 1 in minterm 1 ($D = 0$, $Q = 1$), × in minterms 0 and 2, 0 in minterm 3: the
group is the $D = 0$ row.
== Result ==
$J = D$, $K = \overline{D}$, as before.
:::

::: kmap J
vars: D Q
ones: 2
dont-care: 1 3
group: D
:::

::: kmap K
vars: D Q
ones: 1
dont-care: 0 2
group: D'
:::

::: formula Converting a JK flip-flop into a D flip-flop | JK→D
$$J = D, \qquad K = \overline{D}$$
--
D | the new data input |
J, K | the JK flip-flop's inputs |
:::

Try it: the lamp shows the JK flip-flop's next state with $J = D$ and $K = \overline{D}$
substituted. Whatever $Q$ is, it equals $D$.

::: logic JK wired as D: next state with J = D, K = D′
inputs: D Q
Qnext = D Q' + (D')' Q
:::

::: callout pitfall K is D inverted, not D
$J = K = D$ would make a T flip-flop with input $D$ (hold when 0, toggle when 1), not a D
flip-flop. The inverter is what makes $J$ and $K$ opposite.
:::

## JK into T

Not required, but it completes the set. Target: $Q^{n+1} = T\overline{Q^n} + \overline{T}Q^n$,
already in JK shape. Compare: $J = T$, $\overline{K} = \overline{T}$, so $K = T$. Join $J$
and $K$ and call the joined pin $T$ (as Lesson 10.2 noted). Then $T = 1$ is the JK's
toggle (11) and $T = 0$ its hold (00).

## D into T′

::: example Make a D flip-flop act as a T′ flip-flop (slide example)
Given: $Q^{n+1} = D$. Target: $Q^{n+1} = \overline{Q^n}$.
== Compare ==
The equations are equal when $D = \overline{Q^n}$.
== Circuit ==
Wire the flip-flop's own $\overline{Q}$ output back to its $D$ input. $\overline{R}_d$ and
$\overline{S}_d$ to 1, the clock to C1 (the slide uses a rising-edge D flip-flop).
== How it runs ==
If $Q = 0$, then $D = \overline{Q} = 1$ and the next edge makes $Q = 1$; now $D = 0$ and the
edge after makes $Q = 0$. It toggles at every active edge: a divide-by-2 circuit.
:::

| Rising edge | Present $Q^n$ | Input $D = \overline{Q^n}$ | Next $Q^{n+1}$ |
|---|---|---|---|
| 1 | 0 | 1 | 1 |
| 2 | 1 | 0 | 0 |
| 3 | 0 | 1 | 1 |
| 4 | 1 | 0 | 0 |

::: plot D flip-flop with Q̄ fed to D: CP and Q (rising edges at whole numbers)
x: 0.5 .. 6.5
y: -0.5 .. 3.5
xlabel: t (clock periods)
ylabel: CP (top), Q (bottom)
CP(t) = 2 + 0.8 (1 - floor(2t) + 2 floor(t))
Q(t) = 0.8 (floor(t) - 2 floor(t/2))
:::

::: formula Converting a D flip-flop into a T′ flip-flop | D→T′
$$D = \overline{Q^n}$$
--
D | the D flip-flop's input |
\overline{Q^n} | its own complementary output, fed back |
:::

::: callout pitfall Feed back Q̄, not Q
With $Q$ wired to $D$, $Q^{n+1} = Q^n$: the flip-flop holds forever. The feedback must
come from the complementary output $\overline{Q}$.
:::

## D into T

Target: $Q^{n+1} = T \oplus Q^n$. Compare with $Q^{n+1} = D$: $D = T \oplus Q^n$. Put an
XOR gate in front of $D$ with inputs $T$ and $Q$. With $T = 1$ it passes $\overline{Q}$ (the
D→T′ circuit); with $T = 0$ it passes $Q$ (hold).

::: gates
xor
:::

## D into JK

::: example Make a D flip-flop act as a JK flip-flop (slide example)
Given: $Q^{n+1} = D$. Target: $Q^{n+1} = J\overline{Q^n} + \overline{K}Q^n$.
== Compare ==
$D = J\overline{Q^n} + \overline{K}Q^n$.
== Circuit ==
The right-hand side is an AND-OR expression of the kind built in Lesson 9.2:
- an inverter makes $\overline{K}$ from $K$;
- one AND gate takes $\overline{K}$ and the fed-back $Q$;
- another AND gate takes $J$ and the fed-back $\overline{Q}$;
- an OR gate combines the two AND outputs and drives $D$.
$\overline{R}_d$ and $\overline{S}_d$ to 1, the clock to C1. The result behaves as a JK
flip-flop with the D flip-flop's clock edge.
:::

The three kinds of gate used:

::: gates
and or not
:::

::: formula Converting a D flip-flop into a JK flip-flop | D→JK
$$D = J\overline{Q^n} + \overline{K}Q^n$$
--
J, K | the new control inputs |
Q^n, \overline{Q^n} | the D flip-flop's own outputs, fed back |
D | the D flip-flop's input |
:::

::: example Checking the D→JK circuit
The converted flip-flop holds $Q = 1$; then $J = 1$, $K = 1$ arrive before the edge.
What is $D$, and what happens at the edge?
== Gates ==
$\overline{K} = 0$, so the upper AND gives $\overline{K}Q = 0 \cdot 1 = 0$. The lower AND gives
$J\overline{Q} = 1 \cdot 0 = 0$. The OR gives $D = 0$.
== Edge ==
$Q^{n+1} = D = 0$: the flip-flop goes from 1 to 0, a toggle, exactly what a JK does with
$J = K = 1$.
:::

Try the gate network: set $Q$ (the fed-back state), choose $J$ and $K$, and read the $D$
it produces (the next state). The four rows with $Q = 0$ and the four with $Q = 1$ match
the JK flip-flop's characteristic table.

::: logic The D→JK conversion logic
inputs: J K Q
D = J Q' + K' Q
:::

::: callout key One rule covers every conversion
The given flip-flop's next state must equal the target's for **every** input and every
present state. Write both characteristic equations, make them equal, and solve for the
given flip-flop's inputs in terms of the target's inputs and $Q^n$, $\overline{Q^n}$. Then
check by substituting back.
:::

::: callout pitfall Drive equations use the present state
Feed back $Q^n$ (or $\overline{Q^n}$), the outputs as they are before the edge; a drive
equation can never contain $Q^{n+1}$, which doesn't exist yet when the inputs are read.
:::

## All the conversions together

| Given → target | Drive equation(s) | Circuit |
|---|---|---|
| JK → T′ | $J = K = 1$ (or $J = \overline{Q^n}$, $K = Q^n$) | J and K tied to 1 |
| JK → D | $J = D$, $K = \overline{D}$ | D to J, through an inverter to K |
| JK → T | $J = K = T$ | J and K joined |
| D → T′ | $D = \overline{Q^n}$ | $\overline{Q}$ fed back to D |
| D → T | $D = T \oplus Q^n$ | an XOR of T and Q into D |
| D → JK | $D = J\overline{Q^n} + \overline{K}Q^n$ | inverter, two ANDs, an OR into D |

::: callout exam Conversions on the final
The scope lists **JK→D, JK→T′ and D→T′**. For each, write the given and target
characteristic equations, compare them (show the comparison: the marking rewards the
expressions, not just the wiring), give the drive equations and describe or draw the
circuit, with $\overline{R}_d$ and $\overline{S}_d$ tied high.
:::

::: cards Converting flip-flops
Key to converting flip-flops :: Find the given flip-flop's excitation conditions: set the characteristic equations equal (or use its drive table) to get the drive equations.
Drive equation (驱动方程) :: An expression for a flip-flop's input in terms of the circuit's signals and its present state $Q^n$.
JK → T′ :: $J = K = 1$ (also $J = \overline{Q^n}$, $K = Q^n$: the answer isn't unique).
JK → D :: $J = D$, $K = \overline{D}$ (D to J, through an inverter to K).
JK → T :: $J = K = T$.
D → T′ :: $D = \overline{Q^n}$: feed $\overline{Q}$ back to D.
D → T :: $D = T \oplus Q^n$ (an XOR gate).
D → JK :: $D = J\overline{Q^n} + \overline{K}Q^n$ (inverter, two ANDs, an OR).
Putting a target equation in JK shape :: Use $X = X\overline{Q^n} + XQ^n$; then J is the coefficient of $\overline{Q^n}$ and $\overline{K}$ that of $Q^n$.
What do $\overline{R}_d$, $\overline{S}_d$ do in a conversion? :: Nothing: tie them to 1.
:::

::: quiz Converting flip-flops
? To make a JK flip-flop act as a D flip-flop, what must $K$ be (in terms of $D$ and $Q$, the present state)? {#jk-to-d-k}
logic: D'
variables: D, Q
> Put $D$ in JK shape: $D = D\overline{Q^n} + DQ^n$. Matching the coefficient of $Q^n$ gives
> $\overline{K} = D$, so $K = \overline{D}$ (and $J = D$).

? A JK flip-flop is wired with $J = D$ and $K = D$ (no inverter). What does it become?
- [ ] a D flip-flop
- [x] a T flip-flop with input $D$
- [ ] a T′ flip-flop
> $J = K = D$ gives $Q^{n+1} = D\overline{Q^n} + \overline{D}Q^n = D \oplus Q^n$: toggle when
> $D = 1$, hold when $D = 0$. That's a T flip-flop, not a D.

? Which wiring turns a JK flip-flop into a T′ flip-flop? Choose all that work.
- [x] $J = K = 1$
- [x] $J = \overline{Q^n}$, $K = Q^n$
- [ ] $J = K = 0$
- [ ] $J = Q^n$, $K = \overline{Q^n}$
> $J = K = 1$: $Q^{n+1} = \overline{Q^n}$. $J = \overline{Q^n}$, $K = Q^n$:
> $\overline{Q^n}\,\overline{Q^n} + \overline{Q^n}\,Q^n = \overline{Q^n}$. $J = K = 0$ holds.
> $J = Q^n$, $K = \overline{Q^n}$: $Q^n\overline{Q^n} + Q^nQ^n = Q^n$, it holds too.

? To make a D flip-flop act as a T′ flip-flop, what is connected to $D$? Give $D$ in terms of $Q$ (the present state).
logic: Q'
variables: Q
> $Q^{n+1} = D$ must equal $\overline{Q^n}$, so $D = \overline{Q^n}$: the $\overline{Q}$ output fed
> back.

? Write the drive equation that makes a D flip-flop act as a JK flip-flop (in terms of $J$, $K$, $Q$).
logic: J Q' + K' Q
variables: J, K, Q
> $D$ must equal the JK's next state: $D = J\overline{Q^n} + \overline{K}Q^n$.

? A D flip-flop converted to JK holds $Q = 0$, and $J = 1$, $K = 0$. What is $D$ before the edge?
answer: 1
tolerance: 0
> $D = J\overline{Q} + \overline{K}Q = 1\cdot1 + 1\cdot0 = 1$, so the edge sets $Q = 1$, as a
> JK does with $J = 1$, $K = 0$.

? Write the drive equation that makes a D flip-flop act as a T flip-flop (in terms of $T$ and $Q$).
logic: T ⊕ Q
variables: T, Q
> $Q^{n+1} = D$ must equal $T \oplus Q^n$, so $D = T \oplus Q^n$: an XOR gate in front of D.

? A rising-edge D flip-flop with $\overline{Q}$ fed back to $D$ starts at $Q = 0$ and gets a 10 kHz clock. What is the frequency of $Q$?
answer: 5 kHz
tolerance: 1%
> It's a T′ flip-flop: $Q$ toggles at each rising edge, so it completes one cycle every
> two clock periods: $10/2 = 5$ kHz.

? In the drive-table method for JK→D, the row $D = 1$, $Q^n = 1$ needs which $J$ and $K$?
- [x] $J = \times$, $K = 0$
- [ ] $J = 1$, $K = \times$
- [ ] $J = 0$, $K = 1$
> The target goes $1 \to 1$ ($Q^{n+1} = D = 1$). The JK drive table for $1 \to 1$ gives
> $J = \times$, $K = 0$.
:::

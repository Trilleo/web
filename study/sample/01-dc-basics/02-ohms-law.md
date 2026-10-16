---
title: Ohm's law
zh: 欧姆定律
summary: Resistance, Ohm's law, and how power turns into heat in a resistor.
source: Sample lecture 2
---

## Resistance

::: define Resistance | 电阻
How strongly a part opposes current: $R = u/i$, in ohms (Ω). Its reciprocal is the
conductance $G = 1/R$, in siemens (S).
:::

::: law Ohm's law | 欧姆定律
For a linear resistor with associated reference directions, the voltage across it is
proportional to the current through it.
:::

::: formula Ohm's law | 欧姆定律
$$u = R\,i$$
--
u | voltage across the resistor | V
R | resistance | Ω
i | current through it | A
:::

::: formula Power in a resistor
$$p = i^2 R = \frac{u^2}{R}$$
--
p | power turned into heat | W
:::

Move the sliders to see how the current and power follow the voltage and the
resistance. Power grows with the *square* of the voltage.

::: explore Power in a resistor
slider u: 0 .. 12 = 5 | V
slider R: 10 .. 10k = 100 | Ω | log
i = u / R | A | Current
p = u i | W | Power
:::

## The resistor's line

Plotted against each other, $u$ and $i$ make a straight line through the origin,
with slope $R$:

::: plot The u–i line of a resistor
x: 0 .. 0.1
xlabel: i (A)
ylabel: u (V)
u(i) = R i
slider R: 10 .. 200 = 100 | Ω
:::

::: example Current through a resistor
A 4.7 kΩ resistor has 9 V across it. Find the current and the power.
== Current ==
$i = u/R = 9 / 4700 \approx 1.91$ mA.
== Power ==
$p = u^2/R = 81/4700 \approx 17.2$ mW.
:::

::: quiz Ohm's law
? What current flows through 4.7 kΩ with 9 V across it?
answer: 1.91 mA
tolerance: 2%
> $i = 9 / 4700 \approx 1.91$ mA.

? Write the power in a resistor in terms of $u$ and $R$.
expression: u^2 / R
variables: u, R
> $p = ui$ and $i = u/R$, so $p = u^2/R$.
:::

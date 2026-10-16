---
title: Kirchhoff's laws
zh: 基尔霍夫定律
summary: Currents meeting at a node, voltages around a loop, and the voltage divider.
source: Sample lecture 3
---

## Nodes and loops

A {{term node | 节点}} is where two or more parts meet; a {{term loop | 回路}} is any
closed path through the circuit.

::: law Kirchhoff's current law | 基尔霍夫电流定律
At any node, the currents flowing out add up to zero: $\sum_k i_k = 0$.
:::

::: law Kirchhoff's voltage law | 基尔霍夫电压定律
Around any loop, the voltages add up to zero: $\sum_k u_k = 0$.
:::

## The voltage divider

Two resistors in series share the source's voltage in proportion to their
resistance:

::: circuit A voltage divider
V1 0,4 0,0 12V
R1 0,0 4,0 1k
R2 4,0 4,4 2k
W 0,4 4,4
G 0,4
label out 4,0
:::

::: formula Voltage divider | 分压公式
$$u_\text{out} = \frac{R_2}{R_1 + R_2}\,u_s$$
--
u_\text{out} | voltage across $R_2$ | V
u_s | source voltage | V
:::

Change the parts and watch every voltage and current update. The two resistors'
powers always add up to what the source supplies.

::: circuit-sim A voltage divider you can change
V1 0,4 0,0 12V [0..24]
R1 0,0 4,0 1k
R2 4,0 4,4 2k
W 0,4 4,4
G 0,4
label out 4,0
:::

A current source and a parallel pair:

::: circuit A current divider
I1 0,4 0,0 3mA
W 0,0 6,0
R1 3,0 3,4 1k
R2 6,0 6,4 2k
W 0,4 6,4
G 0,4
:::

::: example A loaded divider
In the divider above, a 2 kΩ load is connected across $R_2$. What's $u_\text{out}$ now?
== Combine the parallel pair ==
$R_2 \parallel R_L = \dfrac{2 \times 2}{2 + 2} = 1$ kΩ.
== Divide ==
$u_\text{out} = \dfrac{1}{1 + 1} \times 12 = 6$ V: the load pulled it down from 8 V.
:::

::: callout exam For the exam
Expect at least one divider with a load: combine the parallel part first.
:::

::: cards Kirchhoff
KCL says … :: The currents out of a node add up to zero.
KVL says … :: The voltages around a loop add up to zero.
Divider output? :: $u_\text{out} = \frac{R_2}{R_1+R_2} u_s$
:::

::: quiz Dividers
? A 12 V source drives 1 kΩ and 2 kΩ in series. What's the voltage across the 2 kΩ?
answer: 8 V

? In the same circuit, what current flows?
answer: 4 mA

? Which law says the currents out of a node add up to zero?
- [x] Kirchhoff's current law
- [ ] Kirchhoff's voltage law
- [ ] Ohm's law
:::

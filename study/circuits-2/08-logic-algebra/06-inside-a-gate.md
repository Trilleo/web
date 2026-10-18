---
title: "Inside a gate: diode, TTL and CMOS"
zh: 门电路概述
summary: How real circuits make logic: a diode AND gate, a discrete diode-transistor NAND, the integrated TTL NAND, and the CMOS inverter and NAND, each analysed with a state table.
source: 第3章 逻辑代数基础 / 门电路概述, 2026-10-13
---

Up to now a gate was a symbol with a truth table. This lesson opens the box: what
components inside a chip actually produce "1 only when both inputs are 1"? The answer
joins the two halves of the course, because the parts are the diodes, BJTs and MOSFETs
of the analogue chapters, used as switches. Each circuit is analysed the same way: for
every combination of input voltages, decide which devices conduct, find the output
voltage, then translate voltages into 0s and 1s.

## Voltages and logic levels

A gate's inputs and outputs are voltages. We agree that a **high** voltage (near the
supply, here +5 V) means 1 and a **low** voltage (near 0 V) means 0. This is
{{term positive logic | 正逻辑}}, the convention used throughout the course. The levels
don't have to be exact: anything in a "high" band counts as 1, anything in a "low" band
as 0. That tolerance is why digital circuits are so robust to noise.

Gates can be built from {{term discrete components | 分立元器件}} (separate diodes,
transistors and resistors wired together), or as {{term integrated circuits | 集成电路}}
in which the whole gate is made on one chip. The two families of integrated gates are
**TTL** (built from BJTs) and **CMOS** (built from MOSFETs).

## The diode AND gate

**Intuition.** Two diodes point from the output node $Y$ towards the inputs, and a
resistor pulls $Y$ up to $V_{CC}$. If *any* input is held at 0 V, its diode conducts and
drags $Y$ down to one diode drop above 0 V. Only if *every* input is high can $Y$ rise
to $V_{CC}$. "High only when all inputs are high" is AND.

::: circuit Diode AND gate
R1 4,0 4,4 R
D1 4,4 0,4
W 4,4 4,8
D2 4,8 0,8
W 4,4 8,4
label +VCC 4,0
label A 0,4
label B 0,8
label Y 8,4
:::

Take $V_{CC} = 5$ V, inputs of 0 V or 5 V, and a silicon diode drop of 0.7 V.

| $u_A$ | $u_B$ | $D_1$ | $D_2$ | $u_Y$ |
| ----- | ----- | ----- | ----- | ----- |
| 0 V   | 0 V   | on    | on    | 0.7 V |
| 0 V   | 5 V   | on    | off   | 0.7 V |
| 5 V   | 0 V   | off   | on    | 0.7 V |
| 5 V   | 5 V   | off   | off   | 5 V   |

Reading 0.7 V as low (0) and 5 V as high (1), the table becomes the AND truth table:
$Y = A \cdot B$.

::: example Why both diodes are off at 5 V, and what flows at 0 V
$V_{CC} = 5$ V, $R = 3$ kΩ, diode drop 0.7 V. (a) Explain $u_Y$ when both inputs are
5 V. (b) Find the current through $R$ when $u_A = 0$ V, $u_B = 5$ V.
== (a) Both inputs high ==
For a diode to conduct, its anode ($Y$) must be 0.7 V above its cathode (the input),
i.e. $u_Y = 5.7$ V. But $Y$ can rise no higher than $V_{CC} = 5$ V through $R$. So both
diodes stay off, no current flows through $R$, there is no drop across it, and
$u_Y = V_{CC} = 5$ V.
== (b) One input low ==
$D_1$ conducts and holds $u_Y = 0 + 0.7 = 0.7$ V. Then $D_2$ has its anode at 0.7 V and
its cathode at 5 V: reverse biased, off. The current is
$I_R = \dfrac{V_{CC} - u_Y}{R} = \dfrac{5 - 0.7}{3\ \text{k}\Omega} = 1.43$ mA,
and all of it flows out through $D_1$ into input $A$: the input that is low has to
*sink* this current.
:::

::: explore Current sunk by a low input
slider V: 3 .. 15 = 5 | V
slider R: 1k .. 10k = 3k | Ω
slider D: 0.2 .. 0.8 = 0.7 | V
Y = D | V | Output voltage (low)
I = (V - D) / R | A | Current through R, into the low input
:::

::: callout pitfall The "low" output isn't 0 V
A diode gate's low output is one diode drop, 0.7 V, not 0 V. Chain such gates and the
low levels creep upwards by a drop at each stage; that, and the gate's inability to
drive a load, is why diode gates are followed by a transistor.
:::

## A discrete NAND gate

Follow the diode AND gate with a BJT **inverter** (三极管非门) and you have a NAND.
In the inverter, the AND output $Y$ drives the base of an npn transistor through $R_2$;
the collector is pulled up to $V_{CC1}$ by $R_1$ and is the output $F$.

::: circuit Discrete NAND: diode AND + transistor inverter
R1 4,0 4,6 R
D1 4,6 0,6
W 4,6 4,10
D2 4,10 0,10
R2 4,6 10,6 R2
Q1 npn 10,6
R3 12,0 12,4 R1
W 4,0 12,0
W 12,8 12,10
G 12,10
W 12,4 16,4
D3 16,4 16,0
label VCC1 4,0
label A 0,6
label B 0,10
label Y 4,6
label F 16,4
label VCC2 16,0
:::

- If $A = B = 1$, the AND output $Y$ is high: base current flows through $R_2$, the
  transistor **saturates**, and $F$ falls to $U_{CES} \approx 0.3$ V: $F = 0$.
- If either input is 0, $Y$ is low (0.7 V), too little to turn the transistor on
  through $R_2$ (practical circuits add a level-shifting diode or a bias resistor to make
  sure of it). The transistor is **cut off**, and $F$ is pulled high: $F = 1$.

So $F = \overline{AB}$, a NAND. The diode $D$ from $F$ to a second supply $V_{CC2}$ is a
**clamp** ({{zh 电平钳位}}): it conducts if $F$ tries to rise above $V_{CC2} + 0.7$ V, which
fixes the high output level at that value instead of letting it depend on the load.

::: callout note Labels in the drawing
The drawing labels the AND gate's pull-up resistor R and the collector resistor R1 as on
the slide; the grid format names parts uniquely, so they appear as R1 and R3 in the
part list. The clamp diode is drawn as D3.
:::

## The integrated TTL NAND gate

The standard TTL (transistor–transistor logic) NAND does the same job with transistors
throughout. The slide shows only the diagram; here is how it works, with the usual
textbook values for a 5 V supply and 0.7 V per junction.

::: circuit TTL NAND (T1 drawn with one emitter; the real one has an emitter per input)
R1 0,0 0,6 4k
W 0,6 2,6
Q1 npn 2,6 T1
W 4,8 4,12
D1 4,16 4,12
G 4,16
W 4,4 6,4 6,6 8,6
Q2 npn 8,6 T2
R2 10,0 10,4 R2
R3 10,8 10,12 R3
G 10,12
W 10,4 12,4
Q4 npn 12,4 T4
R4 14,0 14,2 R4
D3 14,6 14,8
W 10,8 11,8 11,10 12,10
Q5 npn 12,10 T5
W 14,12 14,14
G 14,14
W 14,8 18,8
W 0,0 14,0
label +VCC 0,0
label A 4,12
label Y 18,8
:::

The parts and what they do:

| Part        | Role                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| $T_1$       | multi-emitter input transistor: one emitter per input ($A$, $B$); it performs the AND     |
| $D_1$, $D_2$ | input clamp diodes (anode to ground): they stop negative spikes on the inputs           |
| $T_2$       | phase splitter: drives $T_4$ from its collector and $T_5$ from its emitter, in opposite senses |
| $T_4$, $D_3$, $T_5$ | the totem-pole output: $T_4$ pulls $Y$ up, $T_5$ pulls it down, never both          |

- **Any input low (0.3 V or so).** $T_1$'s base current flows out through that emitter;
  $T_1$'s base sits at about $0.3 + 0.7 = 1$ V, far too low to turn on $T_2$ and $T_5$ in
  series (that needs about 1.4 V). $T_2$ is off, so $R_2$ drives $T_4$ on and $T_5$ is
  off. The output is high: $u_Y \approx V_{CC} - U_{BE4} - U_{D3} = 5 - 0.7 - 0.7 = 3.6$ V,
  so $Y = 1$.
- **All inputs high.** No emitter can take the current, so it flows through $T_1$'s
  base–collector junction into $T_2$'s base. $T_2$ and $T_5$ saturate; $T_1$'s base is
  about three junction drops up, $\approx 2.1$ V. The output is $U_{CES5} \approx 0.3$ V,
  so $Y = 0$. $T_2$'s collector is only about $0.7 + 0.3 = 1$ V, and with $D_3$ in the path
  that isn't enough to turn $T_4$ on, so the two output transistors are never on together.

The result is $Y = \overline{AB}$.

::: callout note What the drawing simplifies
The grid format has no multi-emitter transistor, so $T_1$ is drawn with one emitter
(standing for both inputs), and only one of the two clamp diodes is shown. Only $R_1 = 4$ kΩ is
given on the slide; the other resistors are labelled by name. The operating voltages
above are standard textbook values, not given on the slide.
:::

## The CMOS inverter

CMOS (complementary MOS) gates use pairs of enhancement MOSFETs, one n-channel and one
p-channel, so that one is always off. Recall from the FET chapter: an n-channel
enhancement MOSFET conducts when $u_{GS} > U_{th(N)}$ (a positive threshold); a p-channel
one conducts when $u_{GS} < U_{th(P)}$ (a negative threshold), i.e. when $|u_{GS}|$ exceeds
$|U_{th(P)}|$.

::: circuit CMOS inverter
M1 pmos 2,2 flip TP
M2 nmos 2,6 TN
W 2,2 0,2 0,6 2,6
W 4,4 8,4
W 4,8 4,10
G 4,10
label +VDD 4,0
label uA 0,4
label uY 8,4
:::

$T_P$'s source is at $+V_{DD}$, $T_N$'s at ground ($V_{SS}$); their gates are joined as
the input $u_A$ and their drains as the output $u_Y$. Each substrate is tied to its
source. Take $U_{th(N)} = 2$ V, $U_{th(P)} = -2$ V and $V_{DD} = 5$ V.

| $u_A$    | $u_{GSN}$             | $\lvert u_{GSP} \rvert$          | $T_N$   | $T_P$   | $u_Y$    |
| -------- | --------------------- | -------------------------------- | ------- | ------- | -------- |
| 0 V      | 0 V $< U_{th(N)}$     | 5 V $> \lvert U_{th(P)} \rvert$  | off     | on      | $V_{DD}$ |
| $V_{DD}$ | 5 V $> U_{th(N)}$     | 0 V $< \lvert U_{th(P)} \rvert$  | on      | off     | 0 V      |

So $Y = \overline{A}$.

::: explore The two gate–source voltages
slider u: 0 .. 5 = 0 | V
N = u | V | u_GSN (T_N on when above 2 V)
P = 5 - u | V | magnitude of u_GSP (T_P on when above 2 V)
:::

::: example Why CMOS uses almost no power
Find the static (steady-state) supply current of the CMOS inverter for each input.
== Input low ==
$T_N$ is off: the path from $V_{DD}$ to ground through the two transistors is broken.
$T_P$ connects the output to $V_{DD}$, but with no load no current flows.
== Input high ==
Now $T_P$ is off, and the path is broken at the top instead.
== Conclusion ==
In either steady state one transistor of the series pair is off, so the supply current
is essentially zero (just leakage). Current flows only briefly while the input switches,
when both are partly on. That is why CMOS dominates modern chips.
:::

## The CMOS NAND gate

**Intuition.** For a NAND, the output must be pulled **low** only when $A$ **and** $B$
are both 1: put two n-channel transistors in **series** between $Y$ and ground. The
output must be pulled **high** when $A$ **or** $B$ is 0: put two p-channel transistors in
**parallel** between $V_{DD}$ and $Y$.

::: circuit CMOS NAND gate
M1 pmos 2,2 flip TP1
M2 pmos 8,2 flip TP2
W 4,0 10,0
W 4,4 10,4
W 10,4 14,4
M3 nmos 2,6 TN1
M4 nmos 2,10 TN2
W 4,12 4,14
G 4,14
W 2,2 0,2 0,6 2,6
W 8,2 6,2
W 2,10 0,10
label +VDD 4,0
label A 0,4
label B 6,2
label B 0,10
label Y 14,4
:::

Input $A$ drives $T_{N1}$ and $T_{P1}$; input $B$ drives $T_{N2}$ and $T_{P2}$ (the two
"B" labels are the same input). With $V_{DD} = 10$ V on the slide, a 1 is 10 V and a
0 is 0 V.

| A   | B   | $T_{N1}$ | $T_{P1}$ | $T_{N2}$ | $T_{P2}$ | Y   |
| --- | --- | -------- | -------- | -------- | -------- | --- |
| 0   | 0   | off      | on       | off      | on       | 1   |
| 0   | 1   | off      | on       | on       | off      | 1   |
| 1   | 0   | on       | off      | off      | on       | 1   |
| 1   | 1   | on       | off      | on       | off      | 0   |

Only in the last row is the series pair $T_{N1}$, $T_{N2}$ fully on (pulling $Y$ to
0 V) while both parallel p-channel transistors are off. In every other row at least one
p-channel transistor connects $Y$ to $V_{DD}$, and the series n-channel path is broken.
So $Y = \overline{AB}$.

::: logic The CMOS NAND's pull-down and pull-up paths
inputs: A B
Down = A B
Up = A' + B'
Y = (A B)'
:::

"Down" is 1 when the n-channel path conducts and "Up" when a p-channel path does: they
are always opposite (De Morgan), and $Y$ follows "Up".

::: callout tip Series ↔ parallel
In CMOS, the n-channel network and the p-channel network are duals: series in one is
parallel in the other. A NOR gate is the same circuit the other way round: n-channel
transistors in parallel, p-channel in series.
:::

::: callout key The one idea to remember
A gate is transistors used as switches. Write a table of which devices conduct for each
input combination, find the output voltage, and read the voltages as 0s and 1s.
:::

::: cards Inside a gate
Positive logic (正逻辑) :: High voltage = 1, low voltage = 0.
Diode AND gate: output with any input at 0 V :: One diode drop, about 0.7 V (logic 0).
Diode AND gate: output with all inputs at 5 V :: $V_{CC} = 5$ V: all diodes are off (logic 1).
Discrete NAND :: A diode AND gate followed by a BJT inverter: $F = \overline{AB}$.
What does the clamp diode in the discrete NAND do? :: Limits the high output to about $V_{CC2} + 0.7$ V.
TTL input transistor $T_1$ :: A multi-emitter BJT, one emitter per input; it does the AND.
TTL output stage :: Totem pole: $T_4$ pulls up, $T_5$ pulls down, $D_3$ stops both conducting at once.
CMOS inverter, input low :: $T_N$ off, $T_P$ on: $u_Y = V_{DD}$.
CMOS inverter, input high :: $T_N$ on, $T_P$ off: $u_Y = 0$.
CMOS NAND structure :: Two p-channel MOSFETs in parallel to $V_{DD}$, two n-channel in series to ground.
Why does a CMOS gate draw almost no static current? :: One transistor of each series path is always off.
:::

::: quiz Check yourself
? In the diode AND gate ($V_{CC} = 5$ V, diode drop 0.7 V), what is $u_Y$ when $u_A = 5$ V and $u_B = 0$ V?
answer: 0.7 V
> $D_2$ conducts and holds $Y$ at $0 + 0.7 = 0.7$ V; $D_1$ is then reverse biased. 0.7 V is logic 0.

? With $V_{CC} = 5$ V and $R = 2$ kΩ, what current flows through $R$ in the diode AND gate when one input is at 0 V?
answer: 2.15 mA
tolerance: 2%
> $u_Y = 0.7$ V, so $I = (5 - 0.7)/2\,\text{k}\Omega = 2.15$ mA, sunk by the low input.

? Which logic function does the discrete diode–transistor circuit (diode AND followed by a BJT inverter) perform?
logic: (A B)'
> The diode stage gives $AB$; the saturated/cut-off transistor inverts it: $F = \overline{AB}$.

? In the TTL NAND, what is the approximate high output voltage?
answer: 3.6 V
tolerance: 3%
> With $T_4$ on and $D_3$ conducting, $u_Y \approx V_{CC} - U_{BE4} - U_{D3} = 5 - 0.7 - 0.7 = 3.6$ V (the small drop across $R_2$ ignored).

? In the CMOS inverter ($U_{th(N)} = 2$ V, $U_{th(P)} = -2$ V, $V_{DD} = 5$ V) with $u_A = 0$ V, which transistor conducts?
- [ ] $T_N$
- [x] $T_P$
- [ ] Both
- [ ] Neither
> $u_{GSN} = 0 < 2$ V, so $T_N$ is off; $u_{GSP} = 0 - 5 = -5$ V, $|u_{GSP}| = 5 > 2$ V, so $T_P$ is on and $u_Y = V_{DD}$.

? In the CMOS NAND, how are the two n-channel transistors connected?
- [x] In series between $Y$ and ground
- [ ] In parallel between $Y$ and ground
- [ ] In series between $V_{DD}$ and $Y$
- [ ] In parallel between $V_{DD}$ and $Y$
> $Y$ must be pulled low only when both $A$ and $B$ are 1, which needs both n-channel switches closed: series. The p-channel pair is in parallel.

? In the CMOS NAND with $A = 1$, $B = 0$, what is $Y$?
answer: 1
tolerance: 0
> $T_{N2}$ is off, breaking the series path to ground, and $T_{P2}$ is on, connecting $Y$ to $V_{DD}$: $Y = 1$.

? Why is a CMOS gate's static power consumption nearly zero?
- [x] In each steady state, one transistor of every $V_{DD}$-to-ground path is off
- [ ] MOSFETs have no threshold voltage
- [ ] The output is always at 0 V
> With the input steady, either the p-channel or the n-channel side is off, so no DC path joins $V_{DD}$ to ground; current flows only briefly while switching.
:::

---
title: FET amplifiers
zh: 场效应管放大电路
summary: The common-source, common-drain and common-gate amplifiers — how to bias each kind of FET (divider bias and self bias), how to find the Q point, the small-signal model, and the gain, input and output resistance of each configuration, compared with the BJT's.
source: 第4章 场效应管及其基本放大电路 (4.3.1–4.3.4), 2026-09-15
---

A FET amplifier is built and analysed just like a BJT amplifier: first a DC bias puts
the transistor at a sensible operating point in its constant-current region, then a
small-signal model tells you how much a small input wiggle is amplified. If you have
done Unit 2, most steps will feel familiar; the differences are that the FET is driven
by a *voltage*, that its gate draws no current, and that its square law makes the Q
point a quadratic equation. This lesson goes through the three configurations, how to
bias each type of FET, and the gain and resistances of each circuit.

## Three configurations

As with the BJT, one electrode is shared by the input and output loops (it is "common",
usually at AC ground), the signal goes in at a second and comes out at the third. That
gives three {{term configurations | 组态}}:

| FET configuration | Input at | Output from | Common | Like the BJT's |
| --- | --- | --- | --- | --- |
| {{term common source (CS) | 共源极}} | gate | drain | source | common emitter (CE) |
| {{term common drain (CD) | 共漏极}} | gate | source | drain | common collector (CC) |
| {{term common gate (CG) | 共栅极}} | source | drain | gate | common base (CB) |

The gate can't be an output (it carries no current) and the drain is never an input, as
with the BJT's base and collector. The common-drain amplifier is also called a
{{term source follower | 源极跟随器}}, because its output follows its input, like the
emitter follower.

## Biasing a FET

### Which sign of U_GS?

To amplify, the FET must sit in its constant-current region, so $U_{GS}$ must be on the
conducting side of $U_{GS(th)}$ or $U_{GS(off)}$ (see the table of six types in the
previous lesson). That gives the rules for each type:

| Type | Works with | Not allowed / cut off |
| --- | --- | --- |
| N-channel enhancement MOSFET | $U_{GS} > 0$ | $U_{GS} < 0$: cut off |
| P-channel enhancement MOSFET | $U_{GS} < 0$ | $U_{GS} > 0$: cut off |
| N-channel depletion MOSFET | $U_{GS} < 0$, or $U_{GS} > 0$ | — |
| P-channel depletion MOSFET | $U_{GS} > 0$, or $U_{GS} < 0$ | — |
| N-channel JFET | $U_{GS} < 0$ | $U_{GS} > 0$ not allowed (gate junction conducts) |
| P-channel JFET | $U_{GS} > 0$ | $U_{GS} < 0$ not allowed |

There are two ways of producing the bias voltage:

- {{term divider bias | 分压偏置}}: a resistor divider sets the gate's potential, and a
  source resistor lifts the source. Works for **every** type.
- {{term self bias | 自给偏压}}: the gate sits at 0 V and the drain current through the
  source resistor makes $U_{GS}$ negative by itself. Only for types that conduct with
  $U_{GS} \le 0$: **JFETs and depletion MOSFETs**.

## The common-source amplifier: DC analysis

### Divider bias

::: circuit Common-source amplifier with divider bias (N-channel JFET)
A1 0,12 0,8 us
R5 0,8 0,6 Rs
C1 0,6 4,6 C1
R1 4,0 4,6 Rg1
R2 4,6 4,12 Rg2
W 4,6 6,6
M1 njfet 6,6
R3 8,0 8,4 Rd
C2 8,4 12,4 C2
R6 12,4 12,12 RL
R4 8,8 8,12 R
W 8,8 10,8
C3 10,8 10,12 Cs
W 4,0 8,0
W 0,12 12,12
G 0,12
label +VDD 8,0
label uo 12,4
label ui 0,6
:::

The signal source $u_s$ with its internal resistance $R_s$ drives the gate through the
coupling capacitor $C_1$; the output is taken from the drain through $C_2$ to the load
$R_L$. The source resistor $R$ sets the bias, and the capacitor $C_s$ across it shorts it
for the signal (as $C_e$ bypasses $R_e$ in a BJT amplifier). The same circuit works with
a MOSFET in place of the JFET.

For the {{term DC path | 直流通路}} the capacitors are open: what's left is $V_{DD}$,
$R_{g1}$, $R_{g2}$, $R_d$, the FET and $R$. Since **no current flows into the gate**,
$R_{g1}$ and $R_{g2}$ form an unloaded divider, and the gate's potential is simply

$$U_G = \frac{R_{g2}}{R_{g1} + R_{g2}} V_{DD}$$

The source sits at $U_S = I_{DQ}R$, so $U_{GSQ} = U_G - I_{DQ}R$. Choosing the divider lets
you make $U_{GSQ}$ positive *or* negative, which is why divider bias suits every type of
FET.

::: formula Q point with divider bias (JFET, depletion MOSFET) | 分压偏置的静态工作点
$$U_{GSQ} = \frac{R_{g2}V_{DD}}{R_{g1} + R_{g2}} - I_{DQ}R, \qquad I_{DQ} = I_{DSS}\left(1 - \frac{U_{GSQ}}{U_{GS(off)}}\right)^2, \qquad U_{DSQ} = V_{DD} - I_{DQ}(R_d + R)$$
--
U_{GSQ} | gate–source voltage at the Q point | V
I_{DQ} | drain current at the Q point | A
U_{DSQ} | drain–source voltage at the Q point | V
V_{DD} | supply voltage | V
R_{g1}, R_{g2} | gate divider resistors | Ω
R_d | drain resistor | Ω
R | source resistor | Ω
:::

For a JFET you would normally make $U_{GS} < 0$. With an enhancement MOSFET the second
equation is that device's square law instead, and $U_{GS} > 0$:

::: formula Q point with divider bias (enhancement MOSFET) | 增强型MOS管的静态工作点
$$U_{GSQ} = \frac{R_{g2}V_{DD}}{R_{g1} + R_{g2}} - I_{DQ}R, \qquad I_{DQ} = I_{DO}\left(\frac{U_{GSQ}}{U_{GS(th)}} - 1\right)^2, \qquad U_{DSQ} = V_{DD} - I_{DQ}(R_d + R)$$
--
I_{DO} | drain current at $U_{GS} = 2U_{GS(th)}$ | A
U_{GS(th)} | threshold voltage | V
:::

The first two equations together are a **quadratic** in $I_{DQ}$ (substitute the first
into the second). A quadratic has two roots, and only one is physical.

::: callout key Picking the right root
Of the two solutions, throw away the one that puts $U_{GSQ}$ outside the conducting
range: beyond pinch-off ($U_{GSQ} < U_{GS(off)}$ for an N-channel JFET, where the square law
no longer applies), or below threshold ($U_{GSQ} < U_{GS(th)}$ for an enhancement MOSFET).
The false root is always the larger current. Then check $U_{DSQ}$ is big enough for the
constant-current region.
:::

::: example Divider bias with a JFET
An N-channel JFET with $I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V is biased with
$V_{DD} = 18$ V, $R_{g1} = 800$ kΩ, $R_{g2} = 100$ kΩ, $R = 4$ kΩ, $R_d = 8$ kΩ. Find the
Q point.
== Gate potential ==
$U_G = \dfrac{100}{800 + 100} \times 18 = 2$ V.
== Set up the quadratic ==
With $I_{DQ}$ in mA and resistances in kΩ: $U_{GSQ} = 2 - 4I_{DQ}$. Then
$1 - \dfrac{U_{GSQ}}{-4} = 1 + \dfrac{2 - 4I_{DQ}}{4} = 1.5 - I_{DQ}$, so
$I_{DQ} = 4(1.5 - I_{DQ})^2$, that is $4I_{DQ}^2 - 13I_{DQ} + 9 = 0$.
== Solve and pick ==
$I_{DQ} = \dfrac{13 \pm \sqrt{169 - 144}}{8} = \dfrac{13 \pm 5}{8}$: 2.25 mA or 1 mA.
2.25 mA would give $U_{GSQ} = 2 - 9 = -7$ V, beyond pinch-off: reject it. So
$I_{DQ} = 1$ mA and $U_{GSQ} = 2 - 4 = -2$ V.
== Drain–source voltage ==
$U_{DSQ} = 18 - 1 \times (8 + 4) = 6$ V.
== Check the region ==
The constant-current region needs $U_{DS} \ge U_{GS} - U_{GS(off)} = -2 + 4 = 2$ V; 6 V is
plenty. ✓
:::

::: example Divider bias with an enhancement MOSFET
An N-channel enhancement MOSFET with $U_{GS(th)} = 2$ V, $I_{DO} = 1$ mA is biased with
$V_{DD} = 15$ V, $R_{g1} = 200$ kΩ, $R_{g2} = 100$ kΩ, $R = 1$ kΩ, $R_d = 5$ kΩ. Find the
Q point.
== Gate potential ==
$U_G = \dfrac{100}{300} \times 15 = 5$ V, so $U_{GSQ} = 5 - I_{DQ}$ (mA, kΩ).
== Set up the quadratic ==
$I_{DQ} = \left(\dfrac{5 - I_{DQ}}{2} - 1\right)^2 = \dfrac{(3 - I_{DQ})^2}{4}$, so
$4I_{DQ} = 9 - 6I_{DQ} + I_{DQ}^2$, that is $I_{DQ}^2 - 10I_{DQ} + 9 = 0$.
== Solve and pick ==
$I_{DQ} = 1$ mA or 9 mA. 9 mA gives $U_{GSQ} = 5 - 9 = -4$ V, below threshold, where no
current could flow: reject it. So $I_{DQ} = 1$ mA, $U_{GSQ} = 4$ V.
== Drain–source voltage ==
$U_{DSQ} = 15 - 1 \times (5 + 1) = 9$ V $\ge U_{GS} - U_{GS(th)} = 2$ V. ✓
:::

Seen from the DC side, the FET is just a current $I_{DQ}$ flowing from drain to source.
Replace it with that current and you can watch the voltages: raise the current, or
$R_d$, and $U_{DS}$ shrinks towards the edge of the constant-current region; the gate's
2 V doesn't move at all, because nothing flows into the gate.

::: circuit-sim The DC path, with the JFET replaced by its drain current
V1 0,10 0,0 18V [0..30]
W 0,0 8,0
R1 4,0 4,4 800k
R2 4,4 4,10 100k
R3 8,0 8,4 8k [1k..20k]
I1 8,4 8,6 1mA [0..2mA]
R4 8,6 8,10 4k [1k..10k]
W 0,10 8,10
G 0,10
label G 4,4
label D 8,4
label S 8,6
:::

### Self bias

::: circuit Common-source amplifier with self bias (N-channel JFET)
A1 0,12 0,8 us
R5 0,8 0,6 Rs
C1 0,6 4,6 C1
R1 4,6 4,12 Rg
W 4,6 6,6
M1 njfet 6,6
R3 8,0 8,4 Rd
C2 8,4 12,4 C2
R6 12,4 12,12 RL
R4 8,8 8,12 R
W 8,8 10,8
C3 10,8 10,12 Cs
W 0,12 12,12
G 0,12
label +VDD 8,0
label uo 12,4
:::

Leave out $R_{g1}$: a single $R_g$ ties the gate to ground. No current flows in it, so
$U_G = 0$, and the source sits at $I_{DQ}R$ above ground. The gate is therefore negative
with respect to the source by itself: the drain current produces its own bias, hence
"self bias". It works only for FETs that conduct with a negative $U_{GS}$, that is JFETs
and depletion MOSFETs. An enhancement MOSFET would never switch on.

::: formula Q point with self bias | 自给偏压的静态工作点
$$U_{GSQ} = -I_{DQ}R, \qquad I_{DQ} = I_{DSS}\left(1 - \frac{U_{GSQ}}{U_{GS(off)}}\right)^2, \qquad U_{DSQ} = V_{DD} - I_{DQ}(R_d + R)$$
--
U_{GSQ} | gate–source voltage at the Q point | V
I_{DQ} | drain current at the Q point | A
R | source resistor | Ω
:::

::: example Self bias with a JFET
A JFET with $I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V has $R = 2$ kΩ, $R_d = 8$ kΩ,
$R_g = 1$ MΩ and $V_{DD} = 15$ V. Find the Q point.
== Set up the quadratic ==
$U_{GSQ} = -2I_{DQ}$ (mA, kΩ), so $I_{DQ} = 4\left(1 - \dfrac{-2I_{DQ}}{-4}\right)^2 = 4\left(1 - \dfrac{I_{DQ}}{2}\right)^2$,
which expands to $I_{DQ}^2 - 5I_{DQ} + 4 = 0$.
== Solve and pick ==
$I_{DQ} = 1$ mA or 4 mA. 4 mA would need $U_{GSQ} = -8$ V, beyond pinch-off (and a JFET
can't carry more than $I_{DSS}$ with $U_{GS} < 0$ anyway). So $I_{DQ} = 1$ mA,
$U_{GSQ} = -2$ V.
== Drain–source voltage ==
$U_{DSQ} = 15 - 1 \times (8 + 2) = 5$ V, above the 2 V the constant-current region needs. ✓
:::

The source resistor sets the operating point: a bigger $R$ means more negative bias and
less current. With self bias the quadratic can be solved once and for all; the
explorer below does it, always taking the physical (smaller) root.

::: explore Self-bias Q point of a JFET
slider IDSS: 1 .. 10 = 4 | mA
slider P: 1 .. 6 = 4 | V
slider R: 0.1 .. 10 = 2 | kΩ | log
slider VDD: 5 .. 30 = 15 | V
slider Rd: 1 .. 20 = 8 | kΩ
b = 2 IDSS R / P + 1 | | (working: b)
a = IDSS R^2 / P^2 | | (working: a)
ID = (b - sqrt(b^2 - 4 a IDSS)) / (2 a) | mA | Drain current I_DQ
UGS = -ID R | V | U_GSQ
UDS = VDD - ID (Rd + R) | V | U_DSQ
gm = 2 sqrt(IDSS ID) / P | mS | g_m at the Q point
:::

(Here $P = |U_{GS(off)}|$. If $U_{DSQ}$ comes out below $U_{GSQ} + P$, the FET has left the
constant-current region and the result no longer holds.)

::: callout pitfall Self bias can't bias an enhancement MOSFET
With $U_G = 0$, self bias can only make $U_{GS} \le 0$. An N-channel enhancement MOSFET
needs $U_{GS} > U_{GS(th)} > 0$, so it would stay cut off. Use divider bias for it.
:::

## The small-signal model

Once biased, a small signal moves the FET a little way along its transfer curve, and
over a small enough stretch the curve is a straight line with slope $g_m$. So, exactly
as for the BJT, the FET can be replaced by a linear model, provided it **stays in the
constant-current region** and the signal is **small**.

::: define Small-signal model of a FET | 场效应管的微变等效电路
A linear model valid at low and mid frequencies: the gate–source port is an **open
circuit** (the gate draws no current), and the drain–source port is a
voltage-controlled current source $g_m\dot U_{gs}$ flowing from drain to source, in
parallel with the output resistance $r_{ds}$.
:::

(The dot marks a phasor, the sinusoidal signal quantity, as in Unit 2: $\dot U_{gs}$ is the
signal part of $u_{GS}$.) $r_{ds}$ is the slope of the nearly flat output curves; it is
tens to hundreds of kilohms, much larger than the usual $R_d$, so it is usually left
out.

::: circuit Small-signal model of a FET (g–s open)
label g 0,0
W 0,4 6,4
F1 3,0 3,4 gmUgs
R1 6,0 6,4 rds
W 3,0 6,0
label d 6,0
label s 0,4
:::

Compare it with the BJT's model: there the input is $r_{be}$ and the source is
$\beta\dot I_b$ (current-controlled); here the input is open and the source is
$g_m\dot U_{gs}$ (voltage-controlled).

::: callout warning Low and mid frequencies only
The model ignores the FET's inter-electrode capacitances, so it is only valid at low
and mid frequencies. At high frequencies they matter: see the next lesson.
:::

## The common-source amplifier: AC analysis

Short the capacitors and $V_{DD}$ for the signal, and put the model in place of the FET.
The bypassed $R$ disappears, $R_{g1}$ and $R_{g2}$ both go from the gate to ground, and
$R_d$ and $R_L$ both go from the drain to ground:

::: circuit Small-signal equivalent circuit of the common-source amplifier
A1 0,4 0,0 Us
R1 0,0 2,0 Rs
R2 4,0 4,4 Rg1
R3 6,0 6,4 Rg2
W 2,0 8,0
label g 8,0
F1 10,0 10,4 gmUgs
R4 12,0 12,4 Rd
R5 14,0 14,4 RL
W 10,0 14,0
W 0,4 14,4
G 0,4
label d 10,0
label s 9,4
:::

### Voltage gain

The input voltage appears directly across gate and source: $\dot U_{gs} = \dot U_i$. The
controlled current $g_m\dot U_{gs}$ flows down through $R_d \parallel R_L$ from the drain
node, so the drain goes *negative* when the gate goes positive:

$$\dot U_o = -g_m\dot U_{gs}(R_d \parallel R_L)$$

::: formula Gain of the common-source amplifier | 共源放大电路的电压放大倍数
$$\dot A_u = \frac{\dot U_o}{\dot U_i} = -g_m(R_d \parallel R_L) = -g_mR_L'$$
--
\dot A_u | voltage gain | —
g_m | transconductance at the Q point | S
R_L' | $R_d \parallel R_L$, the total AC load on the drain | Ω
:::

The minus sign means the output is inverted, 180° out of phase, as in the CE amplifier.
Counted from the source voltage instead, the input divider $R_s$, $R_i$ loses some signal
first:

The source voltage gain is defined as in Lesson 2.3:

$$\dot A_{us} = \frac{\dot U_o}{\dot U_s} = \frac{R_i}{R_i + R_s}\dot A_u$$

For the CS amplifier that is $\dot A_{us} = -\dfrac{g_mR_L'R_i}{R_i + R_s}$.

### Input resistance

Nothing flows into the gate, so the input current only goes into the bias resistors:

$$R_i = \frac{\dot U_i}{\dot I_i} = R_{g1} \parallel R_{g2}$$

::: callout pitfall "FETs have high input resistance" — but the amplifier may not
The FET's own $R_{GS}$ is $10^7$ Ω or more, but the bias resistors sit in parallel with it
and set $R_i$. With $R_{g1} = 800$ kΩ and $R_{g2} = 100$ kΩ, $R_i$ is only 89 kΩ.
:::

The fix: feed the gate from the divider through an extra large resistor $R_g$ (around a
megohm). No DC current flows through it, so it doesn't change $U_G$ (the circuit-sim
above shows the same fact: the gate's potential is set by the divider alone). But the
signal must now go through $R_g$ before it reaches the divider:

::: formula Input resistance with a gate resistor | 加栅极电阻后的输入电阻
$$R_i = R_g + R_{g1} \parallel R_{g2}$$
--
R_i | input resistance | Ω
R_g | resistor between the divider and the gate | Ω
R_{g1}, R_{g2} | divider resistors | Ω
:::

### Output resistance

Set $\dot U_s = 0$, take $R_L$ away and apply a test voltage $\dot U_o'$ at the output.
With no input, $\dot U_{gs} = 0$, so the controlled source carries nothing: it is an
open circuit. The test source sees only $R_d$:

$$R_o = \frac{\dot U_o'}{\dot I_o'} = R_d$$

(strictly $R_d \parallel r_{ds}$, but $r_{ds} \gg R_d$).

::: example Gain and resistances of the JFET amplifier
Take the divider-bias JFET amplifier solved above ($I_{DQ} = 1$ mA, $I_{DSS} = 4$ mA,
$U_{GS(off)} = -4$ V, $R_{g1} = 800$ kΩ, $R_{g2} = 100$ kΩ, $R_d = 8$ kΩ), with
$R_L = 8$ kΩ and $R_s = 10$ kΩ. Find $g_m$, $\dot A_u$, $R_i$, $R_o$ and $\dot A_{us}$. Then
add $R_g = 1$ MΩ to the gate and find $R_i$ and $\dot A_{us}$ again.
== Transconductance ==
$g_m = \dfrac{2\sqrt{I_{DSS}I_{DQ}}}{|U_{GS(off)}|} = \dfrac{2\sqrt{4 \times 1}}{4} = 1$ mS.
== Gain ==
$R_L' = 8 \parallel 8 = 4$ kΩ, so $\dot A_u = -1 \times 4 = -4$.
== Input and output resistance ==
$R_i = 800 \parallel 100 = \dfrac{800 \times 100}{900} \approx 88.9$ kΩ; $R_o = R_d = 8$ kΩ.
== Source gain ==
$\dot A_{us} = \dfrac{88.9}{88.9 + 10} \times (-4) \approx -3.60$.
== With R_g ==
$R_i = 1000 + 88.9 \approx 1.09$ MΩ, and $\dot A_{us} = \dfrac{1089}{1099} \times (-4) \approx -3.96$:
almost none of the signal is lost in $R_s$ any more.
:::

Notice how small the gain is: $-4$, where a BJT stage with similar resistors would give
around $-100$. A FET's $g_m$ (about 1 mS here) is much smaller than a BJT's
$\beta/r_{be}$ (about 40 mS at 1 mA). FETs win on input resistance, not on gain.

## The common-drain amplifier (source follower)

::: circuit Common-drain amplifier (source follower)
A1 0,12 0,8 us
R5 0,8 0,6 Rs
C1 0,6 4,6 C1
R1 4,0 4,6 Rg1
R2 4,6 4,12 Rg2
R3 4,6 8,6 Rg
M1 njfet 8,6
W 10,4 10,0
W 4,0 10,0
R4 10,8 10,12 R
C2 10,8 14,8 C2
R6 14,8 14,12 RL
W 0,12 14,12
G 0,12
label +VDD 10,0
label uo 14,8
:::

The drain goes straight to $V_{DD}$ (AC ground) and the output is taken from the source,
across the unbypassed $R$. The slides call the gate resistor $R_{g3}$ in this circuit
and $R_g$ in the summary table; it is the same resistor, playing the same role as $R_g$
in the CS amplifier, and this lesson calls it $R_g$ throughout.

### DC analysis

The DC path is the divider, $R_g$ (no current, so no drop), the FET and $R$. The Q-point
equations are the divider-bias ones with $R_d = 0$:

$$U_{GSQ} = U_G - I_{DQ}R, \qquad I_{DQ} = I_{DSS}\left(1 - \frac{U_{GSQ}}{U_{GS(off)}}\right)^2, \qquad U_{DSQ} = V_{DD} - I_{DQ}R$$

### Voltage gain

In the model the controlled current $g_m\dot U_{gs}$ flows from drain to source and on
through $R \parallel R_L = R_L'$, so $\dot U_o = g_m\dot U_{gs}R_L'$. The input is the
gate voltage, which is $\dot U_{gs}$ *plus* the source's voltage:
$\dot U_i = \dot U_{gs} + \dot U_o$. Dividing:

$$\dot A_u = \frac{\dot U_o}{\dot U_i} = \frac{g_m\dot U_{gs}R_L'}{\dot U_{gs} + g_m\dot U_{gs}R_L'}$$

::: formula Gain of the source follower | 共漏放大电路的电压放大倍数
$$\dot A_u = \frac{g_mR_L'}{1 + g_mR_L'}$$
--
\dot A_u | voltage gain (positive, below 1) | —
g_m | transconductance | S
R_L' | $R \parallel R_L$ | Ω
:::

The gain is positive (output in phase with the input) and below 1; when $g_mR_L' \gg 1$ it
is close to 1. The source "follows" the gate.

### Input resistance

$R_i = R_g + R_{g1} \parallel R_{g2}$: the same form as the CS amplifier with $R_g$ (formula
above). The gate draws nothing, so the bias network alone sets it.

### Output resistance

Set $\dot U_s = 0$ and drive the output with a test voltage $\dot U_o'$ (with $R_L$ removed).
No current flows in the input resistors, so the gate is at 0 V and
$\dot U_{gs} = -\dot U_o'$. The test current feeds $R$ and *also* the controlled source,
which now pulls current *out* of the source terminal:

$$\dot I_o' = \frac{\dot U_o'}{R} - g_m\dot U_{gs} = \frac{\dot U_o'}{R} + g_m\dot U_o'$$

::: formula Output resistance of the source follower | 共漏放大电路的输出电阻
$$R_o = \frac{\dot U_o'}{\dot I_o'} = \frac{R}{1 + g_mR} = R \parallel \frac{1}{g_m}$$
--
R_o | output resistance | Ω
R | source resistor | Ω
g_m | transconductance | S
:::

Looking into a FET's source you see $1/g_m$, which is about 1 kΩ for $g_m = 1$ mS: the
source follower's output resistance is low.

::: example A JFET source follower
A JFET ($I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V) source follower has $V_{DD} = 12$ V,
$R_{g1} = 200$ kΩ, $R_{g2} = 100$ kΩ, $R_g = 1$ MΩ, $R = 6$ kΩ and $R_L = 6$ kΩ. Find the
Q point, $\dot A_u$, $R_i$ and $R_o$.
== Gate potential ==
$U_G = \dfrac{100}{300} \times 12 = 4$ V, so $U_{GSQ} = 4 - 6I_{DQ}$ (mA, kΩ).
== Quadratic ==
$1 - \dfrac{4 - 6I_{DQ}}{-4} = 2 - 1.5I_{DQ}$, so $I_{DQ} = 4(2 - 1.5I_{DQ})^2$, which expands
to $9I_{DQ}^2 - 25I_{DQ} + 16 = 0$ and gives $I_{DQ} = \dfrac{25 \pm 7}{18}$: 1.78 mA or
1 mA.
== Pick the root ==
1.78 mA gives $U_{GSQ} = 4 - 10.7 = -6.7$ V, beyond pinch-off: reject. $I_{DQ} = 1$ mA,
$U_{GSQ} = -2$ V, $U_{DSQ} = 12 - 6 = 6$ V (above the 2 V needed ✓).
== Gain ==
$g_m = 2\sqrt{4 \times 1}/4 = 1$ mS; $R_L' = 6 \parallel 6 = 3$ kΩ; $g_mR_L' = 3$;
$\dot A_u = \dfrac{3}{1 + 3} = 0.75$.
== Resistances ==
$R_i = 1000 + 200 \parallel 100 = 1000 + 66.7 \approx 1.07$ MΩ.
$R_o = 6 \parallel 1 = \dfrac{6}{7} \approx 0.857$ kΩ.
:::

::: callout note Not quite 1
An emitter follower's gain is typically 0.98 or more, because $(1+\beta)R_L'$ is
hundreds of times $r_{be}$. With a FET's small $g_m$, $g_mR_L'$ is often only a few, so a
source follower's gain can be noticeably below 1 (0.75 here). Its strengths are the very
high input resistance and the low output resistance: it is a buffer.
:::

## The common-gate amplifier

::: circuit Common-gate amplifier (N-channel enhancement MOSFET)
R1 6,0 6,6 Rg1
R2 6,6 6,14 Rg2
W 4,6 8,6
C3 4,6 4,14 Cg
M1 nmos 8,6
R3 10,0 10,4 Rd
C2 10,4 16,4 C2
R6 16,4 16,14 RL
W 10,8 10,10
R4 10,10 10,14 R
C1 10,10 12,10 Cs
R5 12,10 14,10 Rs
A1 14,14 14,10 us
W 6,0 10,0
W 4,14 16,14
G 10,14
label +VDD 10,0
label uo 16,4
:::

The gate is held at its DC bias by $R_{g1}$, $R_{g2}$ and grounded for the signal by $C_g$.
The signal comes in at the source (through the coupling capacitor $C_s$) and goes out at
the drain. The DC path is the same as the common-source amplifier's, so the Q point is
found the same way.

### AC analysis

In the model the gate is at ground, so $\dot U_{gs} = -\dot U_i$: pushing the source up
pushes $\dot U_{gs}$ down. The drain current $g_m\dot U_{gs}$ flows through $R_L' = R_d \parallel R_L$:

$$\dot A_u = \frac{\dot U_o}{\dot U_i} = \frac{-g_m\dot U_{gs}R_L'}{-\dot U_{gs}} = g_mR_L'$$

For the input resistance, the input current feeds $R$ and supplies the drain current
that leaves through the source: $\dot I_i = \dot U_i/R + g_m\dot U_i$, so

$$R_i = \frac{\dot U_i}{\dot I_i} = \frac{1}{\frac{1}{R} + g_m} = R \parallel \frac{1}{g_m}$$

And with $\dot U_s = 0$ the controlled source again sees $\dot U_{gs} = 0$, leaving $R_o = R_d$.

::: formula Common-gate amplifier | 共栅放大电路
$$\dot A_u = g_mR_L', \qquad R_i = R \parallel \frac{1}{g_m}, \qquad R_o = R_d$$
--
\dot A_u | voltage gain (positive) | —
R_L' | $R_d \parallel R_L$ | Ω
R_i | input resistance | Ω
R_o | output resistance | Ω
:::

::: callout key The common-gate amplifier in one line
Same size of gain as the CS amplifier but **positive** (in phase); **low** input
resistance (about $1/g_m$), high output resistance ($R_d$). It throws away the FET's best
feature, so it is used mainly where its low input resistance or its good high-frequency
behaviour are wanted.
:::

::: example A MOSFET common-gate amplifier
The enhancement MOSFET bias circuit solved above ($I_{DQ} = 1$ mA, $I_{DO} = 1$ mA,
$U_{GS(th)} = 2$ V, $R = 1$ kΩ, $R_d = 5$ kΩ) is used as a common-gate amplifier with
$R_L = 5$ kΩ, driven from a source with $R_s = 500$ Ω. Find $\dot A_u$, $R_i$, $R_o$ and
$\dot A_{us}$.
== Transconductance ==
$g_m = \dfrac{2\sqrt{I_{DO}I_{DQ}}}{U_{GS(th)}} = \dfrac{2\sqrt{1 \times 1}}{2} = 1$ mS, so $1/g_m = 1$ kΩ.
== Gain and resistances ==
$R_L' = 5 \parallel 5 = 2.5$ kΩ, $\dot A_u = 1 \times 2.5 = 2.5$.
$R_i = 1 \parallel 1 = 0.5$ kΩ = 500 Ω. $R_o = R_d = 5$ kΩ.
== Source gain ==
$\dot A_{us} = \dfrac{500}{500 + 500} \times 2.5 = 1.25$: half the signal is lost because $R_i$
is no bigger than $R_s$.
:::

Change the parts and compare the three configurations built around the same FET:

::: explore The three configurations side by side
slider gm: 0.2 .. 10 = 1 | mS
slider Rd: 1 .. 20 = 8 | kΩ
slider R: 0.5 .. 20 = 4 | kΩ
slider RL: 1 .. 100 = 8 | kΩ | log
CS = -gm Rd RL / (Rd + RL) | | CS gain A_u = −g_m (R_d ∥ R_L)
CD = gm (R RL/(R + RL)) / (1 + gm R RL/(R + RL)) | | CD gain A_u (load R ∥ R_L)
CG = gm Rd RL / (Rd + RL) | | CG gain A_u = g_m (R_d ∥ R_L)
RoCD = R / (1 + gm R) | kΩ | CD output resistance R ∥ 1/g_m
RiCG = R / (1 + gm R) | kΩ | CG input resistance R ∥ 1/g_m
:::

## BJT and FET amplifiers compared

Each FET configuration matches a BJT one: replace $\beta/r_{be}$ by $g_m$ and the base's
$r_{be}$ by an open circuit.

| | BJT | FET |
| --- | --- | --- |
| Gain, CE / CS | $\dot A_u = -\dfrac{\beta R_L'}{r_{be}}$ | $\dot A_u = -g_mR_L'$ |
| Gain, CC / CD | $\dot A_u = \dfrac{(1+\beta)R_L'}{r_{be} + (1+\beta)R_L'}$ | $\dot A_u = \dfrac{g_mR_L'}{1 + g_mR_L'}$ |
| Gain, CB / CG | $\dot A_u = \dfrac{\beta R_L'}{r_{be}}$ | $\dot A_u = g_mR_L'$ |
| Input resistance, CE / CS | $R_i = R_b \parallel r_{be}$ | $R_i = R_{g1} \parallel R_{g2}$ |
| Input resistance, CC / CD | $R_i = R_b \parallel [r_{be} + (1+\beta)R_L']$ | $R_i = R_g + R_{g1} \parallel R_{g2}$ |
| Input resistance, CB / CG | $R_i = R_e \parallel \dfrac{r_{be}}{1+\beta}$ | $R_i = R \parallel \dfrac{1}{g_m}$ |
| Output resistance, CE / CS | $R_o = R_c$ | $R_o = R_d$ |
| Output resistance, CC / CD | $R_o = R_e \parallel \dfrac{r_{be} + R_b \parallel R_s}{1+\beta}$ | $R_o = R \parallel \dfrac{1}{g_m}$ |
| Output resistance, CB / CG | $R_o = R_c$ | $R_o = R_d$ |

The patterns carry over: the CS/CE stage inverts and has the most gain; the CD/CC stage
follows (gain just under 1, high $R_i$, low $R_o$); the CG/CB stage has the same gain as
the inverting one but positive, with a low input resistance. Two differences stand out:
the source follower's $R_o$ doesn't depend on the source resistance $R_s$ (no current
flows into the gate, unlike the emitter follower, where $R_s$ feeds the base), and FET
gains are smaller because $g_m$ is smaller.

::: callout exam For the exam
Typical questions: solve a Q point (set up the quadratic, reject the wrong root, check
$U_{DS}$), say which bias circuits suit which FET type, draw the small-signal
equivalent circuit, and work out $\dot A_u$, $R_i$, $R_o$ (and $\dot A_{us}$) for a CS, CD or
CG amplifier. The comparison table is a favourite.
:::

::: cards FET amplifiers
FET configurations and their BJT counterparts :: CS ↔ CE, CD ↔ CC (source follower), CG ↔ CB.
Which bias suits every FET type? :: Divider bias (it can make $U_{GS}$ positive or negative).
Which FETs can use self bias? :: JFETs and depletion MOSFETs only (it makes $U_{GS} \le 0$).
Gate potential with divider bias :: $U_G = \dfrac{R_{g2}}{R_{g1}+R_{g2}}V_{DD}$, unloaded since no gate current flows.
Self bias: $U_{GSQ}$ = ? :: $U_{GSQ} = -I_{DQ}R$ (the gate is at 0 V).
Choosing between the two roots of the Q-point quadratic :: Reject the one beyond pinch-off or below threshold (the larger current); check $U_{DS}$.
Small-signal model of a FET :: g–s open; $g_m\dot U_{gs}$ from d to s, in parallel with $r_{ds}$ (often ignored).
CS amplifier :: $\dot A_u = -g_mR_L'$, $R_i = R_{g1} \parallel R_{g2}$ (or $+R_g$), $R_o = R_d$.
Source follower :: $\dot A_u = \dfrac{g_mR_L'}{1+g_mR_L'}$, $R_i = R_g + R_{g1}\parallel R_{g2}$, $R_o = R \parallel \dfrac{1}{g_m}$.
CG amplifier :: $\dot A_u = g_mR_L'$, $R_i = R \parallel \dfrac{1}{g_m}$, $R_o = R_d$.
Why add $R_g$ in series with the gate? :: To raise $R_i$; with no gate current it doesn't change $U_G$.
Source voltage gain :: $\dot A_{us} = \dfrac{R_i}{R_i + R_s}\dot A_u$
:::

::: quiz FET amplifiers
? A JFET ($I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V) is self-biased with $R = 2$ kΩ. What is $I_{DQ}$?
answer: 1 mA
> $I_{DQ} = 4(1 - 2I_{DQ}/4)^2$ gives $I_{DQ}^2 - 5I_{DQ} + 4 = 0$, roots 1 and 4 mA. 4 mA would need $U_{GS} = -8$ V, beyond pinch-off, so $I_{DQ} = 1$ mA.

? An N-channel enhancement MOSFET amplifier has $V_{DD} = 12$ V, $R_{g1} = 300$ kΩ and $R_{g2} = 100$ kΩ. What is the gate's potential $U_G$?
answer: 3 V
> No current flows into the gate, so the divider is unloaded: $U_G = \dfrac{100}{400} \times 12 = 3$ V.

? A common-source amplifier has $g_m = 2$ mS, $R_d = 10$ kΩ and $R_L = 10$ kΩ. What is $\dot A_u$?
answer: -10
tolerance: 0.1
> $R_L' = 10 \parallel 10 = 5$ kΩ, $\dot A_u = -g_mR_L' = -2 \times 5 = -10$.

? A source follower has $g_m = 2$ mS and $R = 4$ kΩ. What is its output resistance?
answer: 444 Ω
tolerance: 2%
> $R_o = R \parallel \dfrac{1}{g_m} = 4 \parallel 0.5 = \dfrac{4 \times 0.5}{4.5} \approx 0.444$ kΩ.

? The same source follower ($g_m = 2$ mS, $R = 4$ kΩ) drives $R_L = 4$ kΩ. What is $\dot A_u$?
answer: 0.8
tolerance: 0.01
> $R_L' = 4 \parallel 4 = 2$ kΩ, $g_mR_L' = 4$, $\dot A_u = 4/5 = 0.8$.

? Write the input resistance of a common-gate amplifier in terms of $R$ and $g_m$ (write $g_m$ as g).
expression: R / (1 + g R)
variables: R, g
> $\dot I_i = \dot U_i/R + g_m\dot U_i$, so $R_i = 1/(1/R + g_m) = R/(1 + g_mR) = R \parallel (1/g_m)$.

? Which bias circuit can be used with an N-channel enhancement MOSFET?
- [x] Divider bias
- [ ] Self bias
> Self bias only gives $U_{GS} = -I_DR \le 0$, which keeps an N-channel enhancement MOSFET cut off. Divider bias can make $U_{GS}$ positive.

? Which configuration gives a positive gain *and* a low input resistance?
- [ ] Common source
- [ ] Common drain
- [x] Common gate
> CG: $\dot A_u = g_mR_L' > 0$, $R_i = R \parallel 1/g_m$ (small). CD is also non-inverting but has a high $R_i$ and a gain below 1.

? A CS amplifier has $R_{g1} = 2$ MΩ, $R_{g2} = 500$ kΩ, and a gate resistor $R_g = 1$ MΩ. What is $R_i$?
answer: 1.4 MΩ
> $R_{g1} \parallel R_{g2} = \dfrac{2 \times 0.5}{2.5} = 0.4$ MΩ; $R_i = R_g + 0.4 = 1.4$ MΩ.

? Why is the output resistance of a common-source amplifier just $R_d$?
- [x] With the input source set to zero, $\dot U_{gs} = 0$, so the controlled source is an open circuit
- [ ] Because the gate draws no current
- [ ] Because $R_L$ is in parallel with $R_d$
> Setting $\dot U_s = 0$ makes $\dot U_{gs} = 0$, so $g_m\dot U_{gs} = 0$: the source carries no current and looks like an open circuit, leaving only $R_d$ (and $r_{ds}$, usually ignored). $R_L$ is removed when finding $R_o$.
:::

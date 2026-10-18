---
title: IC and switching regulators
zh: 集成稳压器与开关稳压电源
summary: Three-terminal IC regulators (CW78xx, CW79xx, CW317/337) and their application circuits, and the series (buck) switching regulator with PWM control, plus the workbook's power-supply exercises.
source: 第10章 直流电源 (10.5.3 三端集成稳压器, 10.6 开关型稳压电路, 习题册), 2026-09-21 → 09-24
---

## Why use a regulator chip

The series regulator of the last lesson needs a reference, a divider, an op-amp, a
pass transistor and protection: a dozen parts to choose and lay out. A
three-terminal IC regulator puts all of that, plus protection against overload,
overheating and secondary breakdown, into one package with three legs. Most real
linear supplies are built around one. The second half of the lesson tackles the
linear regulator's big weakness, its wasted power, with the switching regulator.
The lesson ends with the workbook's power-supply exercises, which pull the whole
unit together.

## Three-terminal IC regulators

::: define Three-terminal IC regulator | 三端集成稳压器
A complete series regulator on one chip, with protection circuits built in
(over-current, secondary breakdown, thermal overload), and only three pins:
input {{zh 输入端}}, output {{zh 输出端}} and common (ground) {{zh 公共端}} or, on
adjustable types, adjust {{zh 调整端}}.
:::

They come in two kinds:

- **Fixed-output** {{zh 固定输出}}: the output voltage is set in the factory; you just
  use it.
- **Adjustable-output** {{zh 可调输出}}: two external resistors set the output to suit
  the job.

Inside, a fixed regulator *is* the series regulator of the last lesson, so everything
there (headroom, dissipation) still applies: the input must stay a couple of volts
above the output, and the chip dissipates $(U_I - U_O)I_O$.

### Fixed regulators: CW78xx and CW79xx

The **CW78xx** series gives a fixed **positive** output; the last two digits are the
voltage (CW7805: +5 V, CW7812: +12 V). The **CW79xx** series gives fixed **negative**
outputs (CW7905: −5 V). In the TO-220 package (pins numbered 1, 2, 3 from the left
with the printed face towards you), the pins are *not* in the same order:

| Series | Pin 1 | Pin 2 | Pin 3 | Output voltage |
| --- | --- | --- | --- | --- |
| CW78xx (positive) | input | common | output | $U_{32} = +xx$ V |
| CW79xx (negative) | common | input | output | $U_{31} = -xx$ V |

(The voltage subscript names the two pins: $U_{32}$ is pin 3 relative to pin 2.)

::: callout pitfall 78 and 79 swap pins 1 and 2
On a CW78xx pin 1 is the input and pin 2 is ground; on a CW79xx it's the other way
round. Only the output, pin 3, is the same. Wiring a 79xx like a 78xx is a classic
way to destroy one.
:::

The typical circuit is the chip plus three capacitors: $C_1 = 0.33$ µF on the input
(it keeps the chip stable when it's far from the filter capacitor), $C_2 = 0.1$ µF on
the output (it improves the response to fast load changes), and often an
electrolytic capacitor $C_3$ on the output as well. For a CW79xx the electrolytic's
+ goes to ground, since the output is negative.

::: example A ±12 V supply
A circuit needs +12 V and −12 V. How do you build it?
== Transformer and rectifier ==
Use a transformer with a centre-tapped secondary (two equal halves, each $u_2$), the
centre tap grounded, and a bridge across the two outer ends. The bridge's + output
gives $+U_{I1}$ and its − output $-U_{I2}$, both measured from the centre tap.
== Filters ==
A large electrolytic (say 500 µF) plus 0.33 µF from each rail to ground.
== Regulators ==
A CW7812 on the positive rail (pin 1 from $+U_{I1}$, pin 2 to ground, pin 3 the
+12 V output) and a CW7912 on the negative rail (pin 2 from $-U_{I2}$, pin 1 to
ground, pin 3 the −12 V output), each with 0.1 µF on its output.
== How it works ==
In the positive half-cycle VD1 charges the positive rail from the upper half of the
winding while VD3 charges the negative rail from the lower half; in the negative
half the other pair does the same. Each regulator gets its own filtered input.
:::

### Building on a fixed regulator: example 10.5.1

A fixed regulator keeps exactly $U_{32}$ between its output and common pins, whatever
is connected around it. Put resistors there and you can make a current source or a
variable voltage. The one complication: a small quiescent current $I_W$
{{zh 漏电流}} (here 5 mA) flows out of the common pin.

::: example Example 10.5.1: a 7805 as a current source and as an adjustable supply
A CW7805 ($U_{32} = 5$ V) has $I_W = 5$ mA. (a) Its output goes through $R = 5$ Ω to
a node that also takes the common pin; from that node a variable load $R_L$ goes to
ground. Find $I_O$. (b) Its output goes through $R_1 = 5$ Ω to the common pin, and
from the common pin a variable $R_2$ goes to ground; the output is taken from pin 3.
Find $U_O$ for $R_2 = 5$ Ω. (c) What does each circuit do?
== (a) Current source ==
The regulator holds 5 V across $R$, so $R$ carries $U_{32}/R = 1$ A. The load gets
that plus the common-pin current:
$I_O = \dfrac{U_{32}}{R} + I_W = 1 + 0.005 = 1.005\ \text{A} \approx 1$ A,
independent of $R_L$.
== (b) Adjustable voltage ==
$R_1$ again carries $U_{32}/R_1 = 1$ A, and $R_2$ carries that plus $I_W$:
$U_O = U_{32} + \left(\dfrac{U_{32}}{R_1} + I_W\right)R_2 = 5 + 1.005 \times 5 \approx 10.0$ V,
or, neglecting $I_W$, $U_O \approx \left(1 + \dfrac{R_2}{R_1}\right)U_{32} = 10$ V.
== (c) Functions ==
(a) is a constant-current source {{zh 恒流源}}: its output current doesn't depend on
the load (as long as the regulator keeps its headroom). (b) is a constant-voltage
source {{zh 恒压源}} whose output is set by $R_2$.
:::

::: formula Fixed regulator as a current source | 三端稳压器构成恒流源
$$I_O = \frac{U_{32}}{R} + I_W \approx \frac{U_{32}}{R}$$
--
I_O | output current into the load | A
U_{32} | regulator's fixed voltage, output pin to common pin | V
R | resistor from output pin to common pin | Ω
I_W | quiescent current out of the common pin | A
:::

::: formula Fixed regulator with a raised output | 三端稳压器扩展输出电压
$$U_O = U_{32} + \left(\frac{U_{32}}{R_1} + I_W\right)R_2 \approx \left(1 + \frac{R_2}{R_1}\right)U_{32}$$
--
U_O | output voltage | V
R_1 | resistor from output pin to common pin | Ω
R_2 | resistor from common pin to ground | Ω
:::

The $I_W$ term is a nuisance: it varies between chips and with temperature, so the
output isn't as precise as $U_{32}$. The workbook exercises below remove it with an
op-amp, and the adjustable regulators make it tiny.

### Adjustable regulators: CW317 and CW337

The **CW117/217/317** series gives an adjustable **positive** output, the
**CW137/237/337** series an adjustable **negative** one. Instead of a common pin they
have an adjust pin, and instead of 5 V they hold just 1.25 V between output and
adjust. Their adjust current $I_A$ is tiny (about 50 µA).

| Series | Pin 1 | Pin 2 | Pin 3 | Voltage it holds |
| --- | --- | --- | --- | --- |
| CW317 (positive) | adjust | output | input | $U_{21} = +1.25$ V |
| CW337 (negative) | adjust | input | output | $U_{31} = -1.25$ V |

The typical CW317 circuit: $R_1$ from the output to the adjust pin, a potentiometer
$R_2$ from the adjust pin to ground, 0.1 µF on the input and 1 µF on the output.
Exactly as in example 10.5.1(b), with 1.25 V in place of 5 V:

::: formula CW317 output voltage | CW317输出电压
$$U_O = U_{21} + \left(\frac{U_{21}}{R_1} + I_A\right)R_2 \approx 1.25\ \text{V}\times\left(1 + \frac{R_2}{R_1}\right)$$
--
U_O | output voltage | V
U_{21} | reference between output and adjust pins, 1.25 V | V
R_1 | resistor from output to adjust (typically 120–240 Ω) | Ω
R_2 | resistor (potentiometer) from adjust to ground | Ω
I_A | adjust-pin current (about 50 µA) | A
:::

::: explore CW317 adjustable supply
slider R1: 100 .. 1k = 240 | Ω | log
slider R2: 0 .. 5k = 2k | Ω
slider IA: 0 .. 100 = 50 | µA
UO_approx = 1.25 (1 + R2/R1) | V | Output, neglecting I_A
UO = 1.25 + (1.25/R1 + IA/1000000) R2 | V | Output, with I_A
:::

::: example Setting a CW317 to 12 V
A CW317 has $R_1 = 240$ Ω. What $R_2$ gives 12 V, and how much does $I_A = 50$ µA
change it?
== R2 ==
$1 + R_2/R_1 = 12/1.25 = 9.6$, so $R_2 = 8.6 \times 240 = 2064$ Ω.
== The adjust current ==
It adds $I_AR_2 = 50\ \text{µA}\times 2064\ \Omega \approx 0.10$ V: the output is
about 12.10 V. Small, which is why the approximate formula is the one you use.
:::

### Workbook 10-2 and 10-3: removing $I_W$ with an op-amp

::: example Workbook 10-2: a precise current source
A CW7824 ($U_{32} = 24$ V, $I_W = 5$ mA): pin 3 goes through $R_1 = 5$ Ω to node X,
and from X the variable load $R_L$ goes to ground. Pin 2 (common) goes to node Y,
from which $R_2 = 1$ kΩ goes to ground. An op-amp connected as a voltage follower
(+ input from X, output and − input at Y) drives Y. Find $I_O$.
== The follower ==
The follower makes $U_Y = U_X$ while drawing no current from X.
== Current in R1 ==
The regulator holds 24 V between pin 3 and pin 2, i.e. between pin 3 and Y, and
$U_Y = U_X$, so $R_1$ has 24 V across it: $I_{R1} = 24/5 = 4.8$ A.
== Where it goes ==
None of it enters the op-amp's input, so all of it flows into the load:
$I_O = \dfrac{U_{32}}{R_1} = 4.8$ A. The common-pin current $I_W$ now flows into $R_2$
and the op-amp's output, not into the load, so the current is exact.
:::

::: callout note The workbook's numbers
The slide shows only $I_O = U_{32}/R_1$. With its values that's 4.8 A, more than a
78xx can actually deliver (about 1.5 A) and 115 W in $R_1$; the exercise is about the
expression, not a buildable circuit. A larger $R_1$ (say 24 Ω for 1 A) would be
practical.
:::

::: example Workbook 10-3 (slide 06-068): an adjustable output without $I_W$
A CW78xx: pin 3 is the output $U_O$; $R_3$ goes from pin 3 to node M, and $R_4$ from M
to pin 2. An op-amp's output drives pin 2; its − input is M; its + input is the
wiper of a potentiometer across the output, with $R_1$ above the wiper and $R_2$
below. Find $U_O$.
== The + input ==
The wiper divides the output: $U_+ = \dfrac{R_2}{R_1 + R_2}U_O$.
== The − input ==
$U_{32}$ sits across $R_3 + R_4$ (the op-amp output, not $R_4$, absorbs $I_W$), so
$U_M = U_O - \dfrac{R_3}{R_3 + R_4}U_{32}$.
== Virtual short ==
$U_M = U_+$:
$U_O - \dfrac{R_3}{R_3+R_4}U_{32} = \dfrac{R_2}{R_1+R_2}U_O$, so
$\dfrac{R_1}{R_1+R_2}U_O = \dfrac{R_3}{R_3+R_4}U_{32}$ and
$$U_O = \frac{R_3}{R_3 + R_4}\,U_{32}\cdot\frac{R_1 + R_2}{R_1}$$
which matches the slide. Moving the wiper (changing $R_1$ against $R_2$) adjusts the
output, and $I_W$ no longer appears.
:::

## The switching regulator

### What's wrong with linear regulators

Look again at the linear series regulator: $U_I = U_{CE} + U_O$. Its features:

1. Simple, easy to adjust, small ripple.
2. The pass transistor works in its linear (amplifying) region, carrying the full
   load current with $U_I - U_O$ across it, so it dissipates a lot.
3. So the efficiency is low: at best $U_O/U_I$.
4. It can only step down: $U_O < U_I$.

A 5 V, 2 A supply from a 20 V input burns $15 \times 2 = 30$ W in the transistor to
deliver 10 W: 25 % efficient. The fix is to stop running the transistor half-on.

::: explore Linear regulator losses
slider UI: 6 .. 40 = 20 | V
slider UO: 1 .. 24 = 5 | V
slider IO: 0.1 .. 5 = 2 | A
Pout = UO IO | W | Power to the load
Ploss = (UI - UO) IO | W | Power burnt in a linear pass transistor
eta = 100 UO / UI | % | Best linear efficiency
D = UO / UI | | Duty cycle a buck regulator would need
:::

::: define Switching regulator | 开关型稳压电路
A regulator whose pass transistor works as a switch, either fully on (saturated) or
fully off, instead of in its linear region. Turning the input into a train of pulses
and filtering it gives a DC output set by the fraction of time the switch is on.
It is an efficient DC-DC converter {{zh DC-DC变换器}}.
:::

A switch that's fully on has almost no voltage across it; one that's fully off has
no current through it. Either way it dissipates almost nothing. Its losses happen
mainly during the transitions from on to off and off to on. Hence the switching
regulator's features:

1. The transistor dissipates far less than a linear pass transistor: high efficiency.
2. Small, light, and it regulates over a wide input range.
3. But more ripple, and more electromagnetic interference {{zh 电磁干扰}}, than a
   linear regulator.

Switching regulators are classified three ways:

| By | Kinds |
| --- | --- |
| Main circuit | series {{zh 串联型}}, parallel {{zh 并联型}}, pulse-transformer coupled {{zh 脉冲变压器耦合型}} |
| Topology | step-down (buck) {{zh 降压型}}, step-up (boost) {{zh 升压型}}, inverting (buck-boost) {{zh 反相型}} |
| Control | PWM (pulse-width), PFM (pulse-frequency), mixed modulation |

The course studies the series (buck) type with PWM control.

### The series switching (buck) regulator

It has three parts: the **switching transistor** VT in series with the load, the
**drive circuit** (a PWM controller) that turns it on and off, and the **filter**
($L$ and $C$), with a **freewheeling diode** VD. Here VT is drawn as a switch:

::: circuit Buck regulator, VT on (switch closed)
V1 0,8 0,0 UI
S1 0,0 4,0 closed
D1 4,8 4,0 VD
L1 4,0 8,0 L
C1 8,0 8,8 C
W 8,0 12,0
R1 12,0 12,8 RL
W 0,8 4,8 8,8 12,8
G 0,8
label uE 4,0
label UO 12,0
:::

**VT on** ($u_B$ high, VT saturated): the node $u_E$ is at $U_I$ (less $U_{CES}$), so
VD is reverse-biased and off. Current flows from the input through VT and $L$ into
$C$ and the load. The inductor's current rises and it stores energy; $C$ charges.

::: circuit Buck regulator, VT off (switch open)
V1 0,8 0,0 UI
S1 0,0 4,0 open
D1 4,8 4,0 VD
L1 4,0 8,0 L
C1 8,0 8,8 C
W 8,0 12,0
R1 12,0 12,8 RL
W 0,8 4,8 8,8 12,8
G 0,8
label uE 4,0
label UO 12,0
:::

**VT off** ($u_B$ low): the inductor's current can't stop suddenly, so its induced
voltage reverses and pulls $u_E$ just below ground, turning VD on. The current now
circulates $L$ → load → ground → VD → $L$: the inductor releases its energy, and $C$
discharges a little to keep the load current nearly constant.

::: define Freewheeling diode | 续流二极管
The diode in a switching regulator that gives the inductor's current a path while
the switch is off, so the current keeps flowing ("freewheels") into the load instead
of producing a huge voltage spike across the switch.
:::

::: callout pitfall Without the diode
Leave out VD and, when VT switches off, the inductor tries to keep its current
flowing with nowhere to go: its voltage shoots up until something breaks down,
usually the transistor.
:::

### The output voltage: $U_O \approx DU_I$

The voltage $u_E$ at the switch is a rectangular wave: $U_I - U_{CES}$ for $t_{on}$,
then $-U_D$ (the diode's drop) for $t_{off}$, repeating with period
$T = t_{on} + t_{off}$. The $LC$ filter passes only its average:

$$U_O = \frac{t_{on}}{T}(U_I - U_{CES}) + \frac{t_{off}}{T}(-U_D) \approx \frac{t_{on}}{T}U_I = DU_I$$

Here the **duty cycle** {{zh 占空比}} (met in Lesson 5.1) is $D = t_{on}/T$: the fraction of each switching period for which the switch is on
(between 0 and 1). $t_{on}$ is the on-time {{zh 导通时间}}, $t_{off}$ the off-time
{{zh 截止时间}}.

::: formula Buck regulator output | 串联开关型稳压电路输出电压
$$U_O = \frac{t_{on}}{T}(U_I - U_{CES}) - \frac{t_{off}}{T}U_D \approx DU_I$$
--
U_O | average output voltage | V
D | duty cycle, $t_{on}/T$ | 1
U_I | input voltage | V
U_{CES} | switch's saturation voltage | V
U_D | freewheeling diode's forward drop | V
t_{on},\ t_{off},\ T | on-time, off-time and period | s
:::

Move the duty cycle and watch the average follow it. The second plot is the
inductor current: a triangle, rising while VT is on, falling while it's off, around
the load current $I_O$.

::: plot Switch-node voltage u_E and its average (time in switching periods)
x: 0 .. 3
y: -2 .. 32
xlabel: t / T
ylabel: u_E (V)
uE(t) = UI (1 + sign(D - (t - floor(t))))/2
UO(t) = D UI
slider UI: 5 .. 30 = 20 | V
slider D: 0.05 .. 0.95 = 0.25
:::

::: plot Inductor current (time in switching periods)
x: 0 .. 3
xlabel: t / T
ylabel: i_L (A)
iL(t) = IO + dI (min((t - floor(t))/D, (1 - (t - floor(t)))/(1 - D)) - 0.5)
IO(t) = IO
slider D: 0.05 .. 0.95 = 0.25
slider IO: 0.5 .. 3 = 1 | A
slider dI: 0 .. 1 = 0.4 | A
:::

::: example A 20 V to 5 V buck regulator
A buck regulator runs at 50 kHz from $U_I = 20$ V. Find the duty cycle and on-time
for $U_O = 5$ V, first ideally, then with $U_{CES} = 1$ V and $U_D = 0.7$ V.
== Ideal ==
$D = U_O/U_I = 5/20 = 0.25$; $T = 1/50\ \text{kHz} = 20$ µs, so $t_{on} = 5$ µs.
== With the drops ==
At $D = 0.25$: $U_O = 0.25 \times 19 - 0.75 \times 0.7 \approx 4.23$ V, too low. Solving
$D \times 19 - (1 - D)\times0.7 = 5$ gives $D = 5.7/19.7 \approx 0.29$, $t_{on} \approx 5.8$ µs.
The feedback loop finds this by itself.
== Compared with linear ==
A linear regulator would burn 15 V × $I_O$; the switch only loses its small
saturation and switching losses.
:::

### PWM control and regulation

The drive circuit is a pulse-width modulation {{term PWM controller | PWM控制器}}. It
contains:

- the **sampling divider** $R_1$, $R_2$: $U_F = \dfrac{R_2}{R_1 + R_2}U_O$;
- a **reference** $U_{REF}$;
- the **error amplifier** A1, which amplifies $U_{REF} - U_F$:
  $U_P = A_1(U_{REF} - U_F)$;
- a **triangle-wave generator** {{zh 三角波发生器}} giving $u_S$;
- the **voltage comparator** A2 {{zh 电压比较器}}, which compares $u_S$ with the
  threshold {{zh 阈值电压}} $U_P$: $u_B$ is high ($+U_{om}$, VT on) while $u_S < U_P$ and
  low ($-U_{om}$, VT off) while $u_S > U_P$.

So $U_P$ sets the pulse width: raise it and the triangle spends longer below it, so
$t_{on}$, and with it $D$, grows. Try it (the triangle runs between −1 and +1):

::: plot PWM comparator: triangle u_S, threshold U_P and drive u_B
x: 0 .. 3
y: -1.5 .. 1.5
xlabel: t / T
uS(t) = 2 abs(2 (t - floor(t)) - 1) - 1
UP(t) = UP
uB(t) = 1.2 sign(UP - (2 abs(2 (t - floor(t)) - 1) - 1))
slider UP: -0.9 .. 0.9 = 0
:::

Here $u_B$ is drawn as ±1.2; its duty cycle is $(U_P + 1)/2$.

**Regulation.** If the input or the load changes and the output tries to rise, the
controller cuts the duty cycle; if it tries to fall, it widens it:

$$U_O\uparrow \to U_F\uparrow \to U_P\downarrow \to D\downarrow \to U_O\downarrow$$

The output is held at the value where $U_F \approx U_{REF}$, that is
$U_O \approx \dfrac{R_1 + R_2}{R_2}U_{REF}$, as in the linear regulator, but now
the correction is made by timing instead of by burning voltage.

::: callout key Linear vs switching in one line
A linear regulator throws away the extra voltage as heat; a switching regulator
chops the input and averages it, so it wastes very little, at the price of ripple
and interference.
:::

## Workbook exercises on power supplies

::: example Workbook 10-1: what the meter says
A bridge rectifier with a capacitor filter has $U_2 = 20$ V. A DC voltmeter on the
output reads (1) 28 V, (2) 18 V, (3) 24 V, (4) 9 V. What's going on in each case?
== 28 V ==
$28 \approx \sqrt2 \times 20 = 28.3$ V: the capacitor has no discharge path. The
**load is open**.
== 18 V ==
$18 = 0.9 \times 20$: a full-wave output with no filtering. The **filter capacitor is
open** (a broken solder joint, 脱焊).
== 24 V ==
$24 = 1.2 \times 20$: the circuit is **working normally**.
== 9 V ==
$9 = 0.45 \times 20$: a half-wave output with no filtering. **One rectifier diode is
open and the capacitor is open** as well.
:::

::: example Workbook 10-7: wiring a ±15 V supply
Given a transformer with a centre-tapped 20 V + 20 V secondary, a bridge D1–D4, two
filter capacitors, two resistors and two 15 V Zeners, connect them to get ±15 V
relative to ground.
== The solution ==
Ground the centre tap; connect the bridge's two AC corners to the winding's outer
ends; put the two capacitors in series from the + rail to the − rail with their
midpoint on ground. On the positive side, R from the + rail to the cathode of a 15 V
Zener whose anode is grounded: its cathode is +15 V. On the negative side, R from the
− rail to the anode of a 15 V Zener whose cathode is grounded: its anode is −15 V.
The resistors limit the Zener currents.
== Check the voltages ==
Each rail is about $1.2 \times 20 = 24$ V from ground, comfortably above 15 V, so each
Zener regulator has the headroom it needs.
:::

The two halves of the winding are drawn as two AC sources in series, with the centre
tap between them:

::: circuit Workbook 10-7: a ±15 V supply from a centre-tapped transformer
A1 7,4 4,4 u2
A2 10,4 7,4 u2
W 7,4 7,6
G 7,6
D1 4,4 4,0
D4 4,8 4,4
D2 10,4 10,0
D3 10,8 10,4
W 4,0 10,0 14,0
W 4,8 10,8 14,8
C1 14,0 14,4 C
C2 14,4 14,8 C
W 14,4 18,4
G 14,4
R1 14,0 18,0 R
R2 14,8 18,8 R
Z1 18,4 18,0 15V
Z2 18,8 18,4 15V
label +15V 18,0
label -15V 18,8
:::

::: callout note Two exercises labelled 10-3
The slides use the label 习题册10-3 twice: for the op-amp-assisted 78xx (above) and
for the multiple-choice question below. Both are included.
:::

::: cards IC and switching regulators
CW78xx pins (TO-220)? :: 1 input, 2 common, 3 output; $U_{32} = +xx$ V.
CW79xx pins? :: 1 common, 2 input, 3 output; $U_{31} = -xx$ V.
CW317 pins and reference? :: 1 adjust, 2 output, 3 input; holds $U_{21} = 1.25$ V.
CW337? :: Adjustable negative regulator: 1 adjust, 2 input, 3 output; $U_{31} = -1.25$ V.
CW317 output? :: $U_O \approx 1.25\ \text{V}\,(1 + R_2/R_1)$
Fixed regulator with $R$ from output to common: what is it? :: A current source, $I_O = U_{32}/R + I_W \approx U_{32}/R$.
Fixed regulator with $R_1$ (out–common) and $R_2$ (common–ground)? :: An adjustable supply, $U_O \approx (1 + R_2/R_1)U_{32}$.
How to get ± outputs? :: Centre-tapped transformer and bridge, a 78xx on the positive rail and a 79xx on the negative.
Why are linear regulators inefficient? :: The pass transistor is in its linear region, dropping $U_I - U_O$ at full load current.
Buck regulator output? :: $U_O \approx DU_I$, $D = t_{on}/T$.
Job of the freewheeling diode? :: Carries the inductor's current while the switch is off.
PWM regulation chain? :: $U_O\uparrow \to U_F\uparrow \to U_P\downarrow \to D\downarrow \to U_O\downarrow$
Switching regulator pros and cons? :: Efficient, small, light, wide input range; more ripple and EMI.
:::

::: quiz Check yourself
? A CW7805 ($I_W = 5$ mA) has a 10 Ω resistor from its output pin to its common pin, and the load from there to ground. What's the load current?
answer: 0.505 A
tolerance: 1%
> $I_O = U_{32}/R + I_W = 5/10 + 0.005 = 0.505$ A, whatever the load (within the regulator's headroom).

? A CW7805 has $R_1 = 100$ Ω from output to common and $R_2 = 200$ Ω from common to ground. Neglecting $I_W$, what's the output?
answer: 15 V
> $U_O \approx (1 + R_2/R_1)U_{32} = (1 + 2) \times 5 = 15$ V.

? A CW317 has $R_1 = 200$ Ω and $R_2 = 1$ kΩ. Neglecting $I_A$, what's its output?
answer: 7.5 V
> $U_O \approx 1.25(1 + 1000/200) = 1.25 \times 6 = 7.5$ V.

? Write the output of the workbook 10-3 circuit (78xx plus op-amp) in terms of $U_{32}$, $R_1$, $R_2$, $R_3$, $R_4$.
expression: R3/(R3 + R4) U32 (R1 + R2)/R1
variables: R1, R2, R3, R4, U32
> The wiper gives $U_+ = \frac{R_2}{R_1+R_2}U_O$; node M is $U_O - \frac{R_3}{R_3+R_4}U_{32}$. Setting them equal gives $U_O = \frac{R_3}{R_3+R_4}U_{32}\cdot\frac{R_1+R_2}{R_1}$.

? On a CW7905, which pin is the input?
- [x] Pin 2
- [ ] Pin 1
- [ ] Pin 3
> CW79xx: pin 1 common, pin 2 input, pin 3 output. (On a CW78xx, pin 1 is the input.)

? A buck regulator runs from 24 V with a duty cycle of 0.5. Ideally, what's its output?
answer: 12 V
> $U_O \approx DU_I = 0.5 \times 24 = 12$ V.

? A buck regulator switches at 100 kHz and must turn 12 V into 3.3 V. What's the ideal on-time?
answer: 2.75 µs
tolerance: 1%
> $D = 3.3/12 = 0.275$ and $T = 10$ µs, so $t_{on} = 2.75$ µs.

? In a PWM buck regulator the output rises. What does the controller do?
- [x] Reduces the duty cycle
- [ ] Increases the duty cycle
- [ ] Increases the switching frequency
> $U_O\uparrow \to U_F\uparrow \to U_P = A_1(U_{REF}-U_F)\downarrow$, so the triangle spends less time below $U_P$: $D\downarrow$ and $U_O$ comes back down.

? Workbook 10-3 (multiple choice): a bridge with $U_2 = 10$ V, a 500 µF filter and a 6 V Zener regulator. What's $U_{I(AV)}$ normally?
- [ ] 4.5 V
- [ ] 9 V
- [x] 12 V
- [ ] 14 V
> Bridge plus capacitor filter: $U_{I(AV)} \approx 1.2U_2 = 12$ V.

? In the same circuit, the filter capacitor's joint breaks. What's $U_{I(AV)}$?
- [ ] 4.5 V
- [x] 9 V
- [ ] 12 V
- [ ] 14 V
> With no filter it's the bare bridge output, $0.9U_2 = 9$ V.

? In the same circuit, VD2 is connected backwards. What happens?
- [x] The transformer is shorted for one half-cycle, which can damage parts
- [ ] It becomes a half-wave rectifier
- [ ] The capacitor breaks down from overvoltage
- [ ] The Zener burns out from overcurrent
> Reversed, VD2 runs from the + output corner back to the bottom AC corner. In the half-cycle when the top of the secondary is positive, VD1 and the reversed VD2 conduct in series straight across the secondary, a short circuit with nothing to limit the current, so the transformer and diodes can be damaged.
:::

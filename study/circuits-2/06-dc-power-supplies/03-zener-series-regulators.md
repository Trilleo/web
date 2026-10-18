---
title: Zener and series regulators
zh: 稳压管稳压电路与串联型稳压电路
summary: How a regulator is judged, how to design a Zener regulator's series resistor, and how the linear series regulator holds its output with a reference, a sampling divider, an error amplifier and a pass transistor.
source: 第10章 直流电源 (10.5 串联型稳压电路), 2026-09-21 → 09-24
---

## Why a filter isn't enough

After the rectifier and the capacitor filter we have a DC voltage of about
$1.2U_2$ with a little ripple. But it isn't *steady*: it moves up and down with the
mains (which may wander ±10 %), it sags when the load draws more current (the
capacitor filter's output characteristic from the last lesson), and it drifts with
temperature. An op-amp circuit or a microcontroller wants, say, exactly 5.00 V
whatever happens. That's the regulator's job, the last stage of the supply. This
lesson first sets out how to measure a regulator, then builds two: the simple Zener
regulator and the linear series regulator with feedback, the idea inside every
three-terminal regulator chip in the next lesson.

The slides list three kinds of regulator: the Zener-diode regulator
{{zh 稳压二极管稳压电路}}, the linear series regulator {{zh 线性串联型稳压电路}} (this
lesson) and the switching regulator {{zh 开关型稳压电路}} (next lesson).

## What disturbs the output

The output voltage of the filtered rectifier depends on three things: the input
voltage $U_I$ (which follows the mains), the load current $I_L$ and the temperature
$T$:

$$U_O = f(U_I,\ I_L,\ T)$$

For small changes, each one contributes its own part, and the total change is
their sum (a first-order Taylor expansion):

::: formula Change of a regulator's output | 输出电压变化量
$$\Delta U_O \approx \frac{\partial U_O}{\partial U_I}\Delta U_I + \frac{\partial U_O}{\partial I_L}\Delta I_L + \frac{\partial U_O}{\partial T}\Delta T = S_u\Delta U_I + R_o\Delta I_L + S_T\Delta T$$
--
S_u | input-voltage regulation coefficient (输入电压调整系数) | 1
R_o | output resistance (输出电阻) | Ω
S_T | temperature coefficient of the output (输出电压的温度系数) | V/°C
\Delta U_I,\ \Delta I_L,\ \Delta T | changes of input voltage, load current, temperature | V, A, °C
:::

A perfect regulator has all three coefficients zero. Each coefficient is one of the
regulator's specifications.

## Regulator specifications

### Line regulation: $S_u$

Hold the load and temperature fixed, wiggle the input, and see how much of the
wiggle gets through.

::: define Input-voltage regulation coefficient | 输入电压调整系数
$S_u = \left.\dfrac{\Delta U_O}{\Delta U_I}\right|_{\Delta I_L = 0,\ \Delta T = 0}$:
the change in output voltage per unit change in input voltage, with the load and
temperature unchanged. It shows how much mains fluctuation reaches the output.
:::

Engineers often quote it in two other forms:

- the **line (voltage) regulation** {{zh 电压调整率}}: the relative output change per
  volt of input, usually measured for a ±10 % mains swing,
  $\dfrac{1}{U_O}\dfrac{\Delta U_O}{\Delta U_I}\times100\%$, in %/V;
- the **stabilisation coefficient** {{zh 稳压系数}}: relative output change over
  relative input change, $S_r = \dfrac{\Delta U_O/U_O}{\Delta U_I/U_I}$.

::: formula Stabilisation coefficient | 稳压系数
$$S_r = \left.\frac{\Delta U_O/U_O}{\Delta U_I/U_I}\right|_{\Delta I_L=0,\ \Delta T=0}$$
--
S_r | stabilisation coefficient (smaller is better) | 1
\Delta U_O/U_O | relative change of the output | 1
\Delta U_I/U_I | relative change of the input | 1
:::

(The slides write this one with the same letter $S_u$ in places; the Zener section
calls it $S_r$, which is what this lesson uses.)

### Load regulation: $R_o$ and $S_I$

Hold the input and temperature fixed and change the load current.

::: define Output resistance of a regulator | 输出电阻
$R_o = \left.\dfrac{\Delta U_O}{\Delta I_O}\right|_{\Delta U_I = 0,\ \Delta T = 0}$:
how much the output voltage changes per unit change in load current. Small $R_o$
means the output hardly notices the load; it's also called the load regulation
{{zh 负载调整率}}.
:::

In practice the same thing is quoted as the **current regulation** $S_I$
{{zh 电流调整率}}: the relative change of the output, in per cent, when the output
current goes from zero to its full rated value,
$S_I = \dfrac{\Delta U_O}{U_O}\times100\%$.

### Temperature coefficient: $S_T$

::: define Temperature coefficient of the output | 输出电压的温度系数
$S_T$: the change of output voltage per degree of temperature change, with mains
and load unchanged (the slides quote it in mV/°C, or as a percentage of $U_O$ per
°C). It shows how well the regulator holds its voltage as it warms up.
:::

### Ripple rejection: $S_{rip}$

Whatever ripple the filter leaves on $U_I$, a good regulator should keep off the
output.

::: formula Ripple rejection ratio | 纹波抑制比
$$S_{rip} = 20\lg\frac{U_{I\sim}}{U_{O\sim}}\ \text{dB}$$
--
S_{rip} | ripple rejection ratio (bigger is better) | dB
U_{I\sim} | ripple voltage on the input (peak or RMS) | V
U_{O\sim} | ripple voltage left on the output (same measure) | V
:::

(The slides write the ratio as $u_I/u_O$, meaning the ripple components.)

::: example Reading a regulator's specifications
A regulator gives $U_O = 12.00$ V. (a) When $U_I$ rises from 18 V to 20 V the output
rises to 12.01 V. (b) When the load current goes from 0 to 1 A (at fixed input) the
output falls by 50 mV. (c) Its input carries 1 V of ripple and its output 1 mV.
Find $S_u$, $S_r$, $R_o$, $S_I$ and $S_{rip}$.
== Line ==
$S_u = 0.01/2 = 0.005$. Relative: $S_r = \dfrac{0.01/12}{2/19} \approx 0.0079$
(taking $U_I$ at the middle, 19 V).
== Load ==
$R_o = 0.05\ \text{V}/1\ \text{A} = 50$ mΩ, and $S_I = 0.05/12 \approx 0.42\,\%$.
== Ripple ==
$S_{rip} = 20\lg(1/0.001) = 60$ dB: the ripple is a thousand times smaller.
:::

## The Zener regulator

### What we need from the Zener

Recall from Unit 1 (Zener diodes): a Zener diode run in reverse breakdown keeps its
voltage close to $U_Z$ while its current changes a lot, as long as the current stays
between the minimum regulating current $I_Z$ and the maximum $I_{ZM}$ (set by its
maximum dissipation $P_{ZM} = I_{ZM}U_Z$). The small slope that remains is its dynamic
resistance $r_z = \Delta U/\Delta I$, typically a few to a few tens of ohms. Here we
build a supply around that.

::: circuit Zener regulator after the rectifier and filter
V1 0,6 0,0 UI
R1 0,0 4,0 R
Z1 4,6 4,0 DZ
W 4,0 8,0
R2 8,0 8,6 RL
W 0,6 4,6 8,6
G 0,6
label UO 8,0
:::

The filter's output $U_I$ feeds a series resistor $R$ (the
{{term current-limiting resistor | 限流电阻}}); the Zener and the load are in
parallel across the output. Two equations describe it:

$$U_I = U_R + U_O, \qquad I_R = I_{D_Z} + I_L$$

### How it regulates

The trick is that the Zener's current can change a lot while its voltage barely
moves, and the resistor $R$ turns that current change into a voltage that absorbs
the disturbance.

**The mains rises.** $U_I$ goes up, so $U_O$ (= $U_Z$) starts to rise, a tiny amount.
But a tiny rise in Zener voltage means a big rise in Zener current:

$$U_I\uparrow \to U_O\uparrow \to I_{D_Z}\uparrow\uparrow \to I_R\uparrow \to U_R\uparrow \to U_O\downarrow$$

If $\Delta U_R \approx \Delta U_I$, the output stays put: the change of voltage on $R$
compensates the input's change.

**The load draws more.** $R_L$ falls, $I_L$ rises, and $U_O$ starts to drop. The
Zener's current falls by about as much as the load's rose:

$$R_L\downarrow \to U_O\downarrow \to I_{D_Z}\downarrow,\quad I_L\uparrow$$

If $\Delta I_{D_Z} \approx -\Delta I_L$, then $I_R$ hardly changes, nor does $U_R$, nor
$U_O$: the Zener's current change compensates the load's.

::: callout key The Zener as a sponge
The Zener soaks up whatever current the load doesn't take. As long as there's always
enough current left over for it (at least $I_Z$) and never too much (at most
$I_{ZM}$), the output stays at $U_Z$.
:::

### Its performance

For changes, replace the Zener by its dynamic resistance $r_z$. The input change
then reaches the output through a divider: $R$ in series, $r_z \parallel R_L$ across
the output. Try it:

::: circuit-sim Small-signal model of a Zener regulator (ΔU_I in, ΔU_O out)
V1 0,6 0,0 1V [0..3]
R1 0,0 4,0 200 [50..1k]
R2 4,0 4,6 10 [1..50]
W 4,0 8,0
R3 8,0 8,6 200 [50..2k]
W 0,6 4,6 8,6
G 0,6
label dUO 8,0
:::

Here V1 is a 1 V change of input, R1 the series $R$, R2 the Zener's $r_z$ and R3
the load. Only about 45 mV of the 1 V change gets through; make R1 bigger or R2
smaller and even less does.

::: formula Zener regulator performance | 稳压管稳压电路的指标
$$S_r = \frac{r_z\parallel R_L}{R + r_z\parallel R_L}\cdot\frac{U_I}{U_O} \approx \frac{r_z}{R}\cdot\frac{U_I}{U_O}, \qquad R_o = r_z\parallel R \approx r_z$$
--
S_r | stabilisation coefficient | 1
r_z | Zener's dynamic resistance | Ω
R | series (current-limiting) resistor | Ω
R_L | load resistance | Ω
R_o | output resistance of the regulator | Ω
:::

Its other indicators are simple: the output is $U_O = U_Z$, and the load current
can only swing by as much as the Zener's current can, so
$I_{L\max} - I_{L\min} \le I_{ZM} - I_Z$.

The Zener regulator is simple and regulates well, but its output voltage is fixed
(by the Zener) and its load current can vary only a little. It suits small, fixed
supplies and references.

### Designing a Zener regulator

The formula for $S_r$ pulls two ways: to make $S_r$ small you want a large $R$ and a
small $U_I$, but a large $R$ needs a larger $U_I$ to push enough current through it.
The slides' rules settle the compromise:

1. **Input voltage:** $U_I = (2\sim3)\,U_Z$.
2. **Zener:** $U_Z = U_O$, with $I_{ZM} - I_Z > I_{L\max} - I_{L\min}$.
3. **Series resistor:** $R$ must keep the Zener regulating (current above $I_Z$) and
   safe (below $I_{ZM}$) in the worst cases:
   - The Zener's current is **smallest** when the mains is lowest *and* the load
     draws most: $\dfrac{U_{I\min} - U_Z}{R} - I_{L\max} > I_Z$.
   - It is **largest** when the mains is highest *and* the load draws least:
     $\dfrac{U_{I\max} - U_Z}{R} - I_{L\min} < I_{ZM}$.

Together these give the range of the series resistor from Lesson 1.4:

$$\frac{U_{I\max} - U_Z}{I_{ZM} + I_{L\min}} < R < \frac{U_{I\min} - U_Z}{I_Z + I_{L\max}}$$

::: callout tip Two questions from the slides
*If the range works out as 200–300 Ω, pick near 200 or near 300?* Nearer 300 Ω
(staying safely inside): a larger $R$ gives a smaller $S_r$ and wastes less power,
and both limits already guarantee the Zener works. *What if $R_{\min} > R_{\max}$?*
Then no resistor works: the load swing is too big for this Zener. Choose a Zener
with a larger $I_{ZM}$ (more power), reduce the input's variation, or move on to a
series regulator.
:::

::: example Designing a 6 V, 0–30 mA Zener regulator (the slides' discussion)
Design a Zener regulator with a bridge rectifier and capacitor filter for
$U_O = 6$ V and $I_L = 0$–30 mA, with ±10 % mains. Work in the slides' order:
Zener, $U_I$, $R$, $C$, $U_2$, diodes.
== Zener ==
$U_Z = 6$ V and $I_{ZM} - I_Z > 30$ mA. Take a Zener with $I_Z = 5$ mA and
$I_{ZM} = 60$ mA (a $6 \times 0.06 = 0.36$ W part).
== Input voltage ==
$U_I = 2.5\,U_Z = 15$ V, so $U_{I\min} = 13.5$ V and $U_{I\max} = 16.5$ V.
== Resistor ==
$R < \dfrac{13.5 - 6}{0.005 + 0.030} \approx 214$ Ω and
$R > \dfrac{16.5 - 6}{0.060 + 0} = 175$ Ω. Choose $R = 200$ Ω. Check: the Zener's
current runs from $7.5/200 - 0.030 = 7.5$ mA to $10.5/200 = 52.5$ mA, inside 5–60 mA.
$R$ dissipates up to $10.5^2/200 \approx 0.55$ W: use a 1 W resistor.
== Capacitor ==
The filter sees an equivalent load of $U_I/I_R \approx 15\ \text{V}/45\ \text{mA} \approx 333$ Ω
(with $I_R = (15-6)/200 = 45$ mA). $R_LC \ge 5\cdot T/2 = 50$ ms gives
$C \ge 150$ µF: use 220 µF, rated above $1.1\sqrt2U_2 \approx 19$ V (25 V).
== Transformer ==
$U_I \approx 1.2U_2$, so $U_2 = 15/1.2 = 12.5$ V.
== Diodes ==
$I_{D(AV)} = I_R/2 \approx 23$ mA (take $I_F$ 2–3 times the 45 mA, so ≥ 0.1 A) and
$U_{RM} = 1.1\sqrt2 \times 12.5 \approx 19.4$ V. A 1N4001 (1 A, 50 V) does it.
:::

::: callout pitfall Worst cases go together
The minimum Zener current pairs the *lowest* input with the *largest* load current;
the maximum pairs the *highest* input with the *smallest* load current (often
zero: the load disconnected). Mixing them up gives a resistor that lets the Zener
drop out of regulation or burn.
:::

## The linear series regulator

### The idea: a variable resistor that adjusts itself

The Zener regulator wastes current and can't supply much. A better idea: put a
"variable resistor" in series between the input and the load, and adjust it
continuously so the output stays fixed: when $U_I$ rises, increase the drop across
it; when the load draws more, decrease it. A transistor working in its linear region
is exactly such a resistor, controlled by its base. Feedback does the adjusting.

::: circuit Series regulator with an error amplifier (R2's wiper drawn at its lower end)
V1 0,18 0,0 UI
W 0,0 2,0 12,0
W 12,0 12,2
R4 2,0 2,3 R
Z1 2,8 2,3 DZ
W 2,8 2,18
W 2,3 6,3
U1 opamp 6,4 plus-top
Q1 npn 10,4
W 12,6 18,6 22,6
R1 18,6 18,10 R1
R2 18,10 18,14 R2
R3 18,14 18,18 R3
W 6,5 5,5 5,16 16,16 16,14 18,14
R5 22,6 22,18 RL
W 0,18 2,18 18,18 22,18
G 0,18
label UREF 2,3
label UF 18,14
label UO 22,6
:::

::: define Series regulator | 串联型稳压电路
A linear regulator in which a pass transistor in its linear region sits in series
between the unregulated input and the load. Negative feedback compares a sample of
the output with a reference voltage and drives the transistor so that its
collector–emitter voltage absorbs the changes, keeping the output steady.
:::

It has four parts:

- **Reference** {{term reference voltage | 基准电压}} ($R$ and the Zener $D_Z$ here):
  a precise, stable voltage $U_{REF}$ (here $U_Z$) to compare against.
- **Sampling circuit** {{term sampling circuit | 取样电路}} ($R_1$, the potentiometer
  $R_2$, $R_3$): a divider that takes a known fraction of $U_O$, the
  {{term feedback voltage | 反馈电压}} $U_F$. Together with the reference it sets
  $U_O$.
- **Error amplifier** {{term error amplifier | 误差放大器}} (op-amp A, the "comparison
  amplifier" 比较放大): amplifies the difference $U_{REF} - U_F$; its output
  $U_{O1}$ drives the pass transistor's base. Its gain decides how well the circuit
  regulates.
- **Pass transistor** {{term pass transistor | 调整管}} (T): the heart of the circuit.
  It works in its linear region; its $U_{CE}$ changes with $U_I$ and the load so that
  $U_O = U_I - U_{CE}$ stays put. ($I_E$ and $U_{CE}$ move in opposite directions.)

::: callout tip It's a non-inverting amplifier
Redraw it and the series regulator is a non-inverting amplifier
{{zh 同相比例运算电路}} of the reference $U_Z$, with the transistor as an emitter
follower inside the feedback loop to supply the current. The op-amp provides the
accuracy, the transistor the muscle.
:::

### How it regulates

**The input rises** (load unchanged):

$$U_I\uparrow \to U_O\uparrow \to U_F\uparrow \xrightarrow{U_{REF}\ \text{fixed}} U_{O1}\downarrow \to U_{BE}\downarrow \to I_E\downarrow \to U_{CE}\uparrow \to U_O\downarrow$$

**The load draws more** ($R_L$ falls, input unchanged):

$$R_L\downarrow \to U_O\downarrow \to U_F\downarrow \to U_{O1}\uparrow \to U_{BE}\uparrow \to I_E\uparrow \to U_{CE}\downarrow \to U_O\uparrow$$

Either way, the change is sensed, amplified and corrected. Because the sample is a
voltage and the correction is in series with the load, this is
{{term series voltage negative feedback | 串联电压负反馈}}.

### The output voltage and its range

With deep negative feedback the op-amp's inputs are virtually equal: $U_F \approx U_{REF}$.
If the wiper splits $R_2$ into $R_2'$ (above) and $R_2''$ (below), the divider gives
$U_F = \dfrac{R_2'' + R_3}{R_1 + R_2 + R_3}U_O$, so:

::: formula Series regulator output | 串联型稳压电路输出电压
$$U_O = \frac{R_1 + R_2 + R_3}{R_2'' + R_3}\,U_{REF}$$
--
U_O | regulated output | V
U_{REF} | reference voltage ($U_Z$ with a Zener reference) | V
R_1,\ R_3 | fixed sampling resistors | Ω
R_2 | sampling potentiometer, $R_2 = R_2' + R_2''$ | Ω
R_2'' | part of $R_2$ below the wiper | Ω
:::

Moving the wiper sets the output between two limits:

::: formula Series regulator output range | 输出电压的调节范围
$$\frac{R_1 + R_2 + R_3}{R_2 + R_3}\,U_{REF} \le U_O \le \frac{R_1 + R_2 + R_3}{R_3}\,U_{REF}$$
--
U_{O\min} | wiper at the top ($R_2'' = R_2$): the left side | V
U_{O\max} | wiper at the bottom ($R_2'' = 0$): the right side | V
:::

In the explorer, $k$ is the wiper's position, $R_2''/R_2$: 0 at the bottom, 1 at the top.

::: explore Series regulator output
slider Uref: 1 .. 12 = 6 | V
slider R1: 100 .. 10k = 1k | Ω | log
slider R2: 100 .. 10k = 1k | Ω | log
slider R3: 100 .. 10k = 1k | Ω | log
slider k: 0 .. 1 = 0.5
UOmin = (R1 + R2 + R3)/(R2 + R3) Uref | V | Lowest output
UOmax = (R1 + R2 + R3)/R3 Uref | V | Highest output
UO = (R1 + R2 + R3)/(k R2 + R3) Uref | V | Output at this wiper position
:::

### What limits its performance

From $U_I = U_{CE} + U_O$:

1. $U_I$ must exceed $U_O$ by enough that $U_{CE} > U_{CES}$ (the transistor's
   saturation voltage) at all times, or the transistor leaves the linear region and
   can no longer regulate.
2. The reference must be as stable as possible: the error signal is
   $U_{REF} - U_F$, so any drift in $U_{REF}$ goes straight to the output.
3. The error amplifier's zero drift {{zh 零点漂移}} must be small: use
   temperature-stable parts.
4. The larger the amplifier's gain $A_u$ and the feedback factor $F_u$, the better it
   regulates.

::: callout pitfall Headroom at the lowest mains
The condition $U_{CE} > U_{CES}$ must hold at the *lowest* input and the *highest*
output: $U_{I\min} > U_{O\max} + U_{CES}$, with $U_{I\min} = 0.9U_I$ for −10 % mains.
:::

### Choosing the pass transistor

The pass transistor carries the whole load current and drops the whole difference
between input and output, so its limiting parameters $I_{CM}$, $U_{(BR)CEO}$ and
$P_{CM}$ decide what the supply can deliver. Ignoring the small current taken by
the sampling divider, in the worst cases:

- largest collector current: $I_{C\max} \approx I_{E\max} \approx I_{L\max}$;
- largest $U_{CE}$: highest input, lowest output, $U_{CE\max} = U_{I\max} - U_{O\min}$;
- largest dissipation: $P_{C\max} = I_{C\max}U_{CE\max}$.

::: formula Pass transistor ratings | 调整管的选择
$$I_{CM} > I_{L\max}, \qquad U_{(BR)CEO} > U_{I\max} - U_{O\min}, \qquad P_{CM} > I_{L\max}\,(U_{I\max} - U_{O\min})$$
--
I_{CM} | transistor's maximum collector current | A
U_{(BR)CEO} | collector–emitter breakdown voltage | V
P_{CM} | maximum collector dissipation | W
I_{L\max} | largest load current | A
U_{I\max} | highest input voltage (mains +10 %) | V
U_{O\min} | lowest output setting | V
:::

The worst dissipation is at the *lowest* output setting with full load: that's
when the transistor burns the most voltage. This is also why linear regulators are
inefficient.

::: example The slides' discussion 1: a basic series regulator
In the series regulator above, $U_O$ must be adjustable from 10 V to 20 V, with
$R_1 = R_3 = 1$ kΩ. (1) Find $R_2$ and $U_Z$. (2) With ±10 % mains and
$U_{CES} = 3$ V, what's the smallest $U_I$? (3) With $U_I = 28$ V (±10 %), a
transistor with $\beta = 50$, $P_{CM} = 5$ W, $I_{CM} = 1$ A, and an op-amp that can
supply at most 10 mA, what's the largest load current?
== R2 ==
$\dfrac{U_{O\max}}{U_{O\min}} = \dfrac{R_2 + R_3}{R_3} = \dfrac{20}{10} = 2$, so
$R_2 = R_3 = 1$ kΩ.
== UZ ==
$U_{O\min} = \dfrac{R_1+R_2+R_3}{R_2+R_3}U_Z = \dfrac{3}{2}U_Z = 10$ V, so
$U_Z \approx 6.67$ V. (Check: $U_{O\max} = 3 \times 6.67 = 20$ V.)
== Smallest UI ==
At the lowest mains the input must still exceed the highest output plus $U_{CES}$:
$0.9U_I \ge 20 + 3$, so $U_I \ge 25.6$ V.
== Largest load current ==
Each limit gives its own maximum:
$I_{CM}$: 1 A. $P_{CM}$: $U_{CE\max} = 1.1 \times 28 - 10 = 20.8$ V, so
$5/20.8 \approx 0.24$ A. The op-amp: base current at most 10 mA, so
$I_E \le (1 + \beta) \times 10\ \text{mA} = 0.51$ A. The supply's rating is the smallest
of these: about **0.24 A**.
:::

::: callout note About the slide's hint and wording
The slide's question 1 asks for "$R_3$ and $U_Z$" although $R_3$ is given: it means
$R_2$. And its hint for question 2 reads $0.9U_2 > U_{O\max} + U_{CES}$; the
condition is on the regulator's input, $0.9U_I > U_{O\max} + U_{CES}$.
:::

::: callout exam For the exam
Expect a series-regulator question in exactly this shape: the output range from the
sampling resistors, the minimum input from $U_{CES}$ and the mains tolerance, and
the maximum load current as the smallest of the $I_{CM}$, $P_{CM}$ and drive limits.
:::

### A practical series regulator and current limiting

The slides' second discussion shows a fuller circuit with three improvements:

- **A Darlington pass element** (T1 driven by T2): the op-amp can supply only a few
  mA, and a Darlington multiplies it by about $\beta_1\beta_2$, so the regulator can
  deliver much more current. A resistor $R'$ from the input to the Darlington's base
  helps supply the base current.
- **A pre-regulated reference**: the reference Zener $D_Z$ is fed through $R$ from a
  second Zener $D_Z'$, so the reference barely sees the input's ripple.
- **Current limiting** {{term current-limiting protection | 限流型过流保护}} with a
  small sense resistor $R_0$ in the output line {{zh 输出电流取样电阻}} and a third
  transistor T3 across it (base–emitter across $R_0$, collector to the Darlington's
  base). Normally the drop across $R_0$ is too small to turn T3 on. When the output
  current reaches about $U_{BE}/R_0$, T3 conducts and steals the Darlington's base
  current, so the output current can't rise further, even into a short circuit.

::: formula Current limit of a series regulator | 限流保护
$$I_{E\max} \approx \frac{U_{BE}}{R_0}$$
--
I_{E\max} | largest output current the protection allows | A
U_{BE} | turn-on voltage of the protection transistor (≈ 0.6–0.7 V) | V
R_0 | output-current sense resistor | Ω
:::

::: example The slides' discussion 2 and 3
In the practical regulator, $U_I = 21$ V, $R_1 = R_2 = R_3 = 300$ Ω, $U_Z = 6$ V and
$U_{CES} = 3$ V. Which op-amp input is which, what's the output range, and how big
should $R_0$ be to limit the current to 0.7 A?
== Inputs ==
For negative feedback the reference ($D_Z$) goes to the non-inverting (+) input and
the sampling divider's wiper to the inverting (−) input.
== Range ==
$U_{O\min} = \dfrac{900}{600} \times 6 = 9$ V and $U_{O\max} = \dfrac{900}{300}\times 6 = 18$ V.
The top end needs $U_{CE} \ge U_{CES}$: $21 - 18 = 3$ V, exactly enough (any extra
drop, such as the Darlington's two $U_{BE}$ in the drive path, would cut it a little).
== Current limit ==
$R_0 \approx U_{BE}/I_{E\max} = 0.7/0.7 = 1$ Ω.
== The other questions ==
*Sampling resistors large or small?* Large enough not to waste current, but their
current must stay well above the op-amp's input current, so there's an upper limit
(a few kΩ to tens of kΩ). *A very large output ripple?* Most likely the feedback loop
is oscillating (自激振荡); the slides fix it with a small capacitor from the op-amp's
output to ground.
:::

::: cards Zener and series regulators
$\Delta U_O$ of a regulator? :: $\Delta U_O \approx S_u\Delta U_I + R_o\Delta I_L + S_T\Delta T$
What does $S_u$ (or $S_r$) measure? :: How much of an input change reaches the output (load and temperature fixed).
Output resistance $R_o$? :: $\Delta U_O/\Delta I_O$ at fixed input and temperature: how much the output sags with load.
Ripple rejection ratio? :: $S_{rip} = 20\lg(U_{I\sim}/U_{O\sim})$ in dB.
How does a Zener regulator handle a load increase? :: The Zener's current falls by about as much as the load's rises, so $I_R$, $U_R$ and $U_O$ stay nearly constant.
Zener regulator $S_r$ and $R_o$? :: $S_r \approx \frac{r_z}{R}\frac{U_I}{U_O}$, $R_o \approx r_z$.
Range for the Zener regulator's $R$? :: $\frac{U_{I\max}-U_Z}{I_{ZM}+I_{L\min}} < R < \frac{U_{I\min}-U_Z}{I_Z+I_{L\max}}$
Rule of thumb for the Zener regulator's input? :: $U_I = (2\sim3)U_Z$.
Four parts of a series regulator? :: Reference, sampling divider, error amplifier, pass transistor.
Series regulator output range? :: $\frac{R_1+R_2+R_3}{R_2+R_3}U_{REF} \le U_O \le \frac{R_1+R_2+R_3}{R_3}U_{REF}$
Headroom condition of a series regulator? :: $U_{CE} > U_{CES}$ always: $U_{I\min} > U_{O\max} + U_{CES}$.
Pass transistor ratings? :: $I_{CM} > I_{L\max}$, $U_{(BR)CEO} > U_{I\max} - U_{O\min}$, $P_{CM} > I_{L\max}(U_{I\max} - U_{O\min})$.
Current limit with a sense resistor? :: $I_{E\max} \approx U_{BE}/R_0$.
:::

::: quiz Check yourself
? A Zener regulator has $U_Z = 9$ V, $I_Z = 5$ mA, $I_{ZM} = 50$ mA, $U_I = 20$ V ± 10 %, and a load of 0–20 mA. What's the largest allowed $R$?
answer: 360 Ω
tolerance: 1%
> The smallest Zener current comes with $U_{I\min} = 18$ V and $I_{L\max} = 20$ mA: $R < \frac{18 - 9}{0.005 + 0.020} = 360$ Ω.

? For the same regulator, what's the smallest allowed $R$?
answer: 260 Ω
tolerance: 1%
> The largest Zener current comes with $U_{I\max} = 22$ V and no load: $R > \frac{22 - 9}{0.050 + 0} = 260$ Ω.

? Within that range, which end is better for regulation?
- [x] Near the upper limit (larger R)
- [ ] Near the lower limit (smaller R)
> $S_r \approx \frac{r_z}{R}\frac{U_I}{U_O}$ falls as $R$ grows, and less current is wasted. Stay a little inside the limit for tolerance.

? A Zener with $r_z = 10$ Ω is fed through $R = 200$ Ω from $U_I = 15$ V to give 6 V. Estimate $S_r$ using the approximate formula.
answer: 0.125
tolerance: 2%
> $S_r \approx \frac{r_z}{R}\cdot\frac{U_I}{U_O} = \frac{10}{200}\cdot\frac{15}{6} = 0.125$.

? Write the series regulator's output in terms of $U_{REF}$, $R_1$, $R_2$, $R_3$ when the wiper is at the bottom of $R_2$.
expression: (R1 + R2 + R3) Uref / R3
variables: R1, R2, R3, Uref
> With $R_2'' = 0$ the feedback is taken across $R_3$ alone: $U_F = \frac{R_3}{R_1+R_2+R_3}U_O = U_{REF}$, so $U_O = \frac{R_1+R_2+R_3}{R_3}U_{REF}$, the maximum.

? A series regulator has $R_1 = 2$ kΩ, $R_2 = 1$ kΩ, $R_3 = 1$ kΩ and $U_{REF} = 5$ V. What's its lowest output?
answer: 10 V
> $U_{O\min} = \frac{R_1+R_2+R_3}{R_2+R_3}U_{REF} = \frac{4}{2}\times5 = 10$ V (the highest is $\frac{4}{1}\times5 = 20$ V).

? A series regulator must give up to 15 V with $U_{CES} = 2$ V. With ±10 % mains, what's the smallest nominal input $U_I$?
answer: 18.9 V
tolerance: 1%
> At the lowest mains $0.9U_I > 15 + 2 = 17$ V, so $U_I > 18.9$ V.

? A series regulator runs from $U_{I\max} = 30$ V, its output can be set as low as 5 V, and the load draws up to 0.5 A. What dissipation rating must the pass transistor have at least?
answer: 12.5 W
tolerance: 1%
> $P_{CM} > I_{L\max}(U_{I\max} - U_{O\min}) = 0.5 \times (30 - 5) = 12.5$ W.

? In the series regulator, when the output rises, what does the pass transistor's $U_{CE}$ do?
- [x] It increases, pulling the output back down
- [ ] It decreases
- [ ] It stays the same
> $U_O\uparrow \to U_F\uparrow \to U_{O1}\downarrow \to U_{BE}\downarrow \to I_E\downarrow \to U_{CE}\uparrow \to U_O\downarrow$.

? A current-limited regulator uses a 0.5 Ω sense resistor and a protection transistor that turns on at 0.6 V. Roughly what's the current limit?
answer: 1.2 A
tolerance: 2%
> $I_{E\max} \approx U_{BE}/R_0 = 0.6/0.5 = 1.2$ A.
:::

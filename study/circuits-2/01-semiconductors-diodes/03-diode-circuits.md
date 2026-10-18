---
title: "Diode circuits: rectifiers, limiters and gates"
zh: 二极管应用电路
summary: How to decide whether a diode conducts, and three classic circuits built on it — the half-wave rectifier, the limiter and the diode AND gate.
source: 第2章 半导体二极管及其基本应用电路（2.4.5）, 2026-09-03
---

With the models of the last lesson, a diode circuit becomes a circuit of switches and
batteries — once you know which diodes are on. This lesson first gives a reliable way
to decide that, then uses it on the three basic applications from the slides: the
{{term rectifier | 整流电路}} that turns AC into one-way current (the start of every
power supply), the {{term limiter | 限幅电路}} that cuts a waveform off at a set level,
and the {{term diode AND gate | 二极管与门}}, a logic gate made of nothing but diodes and
a resistor.

## Is this diode on?

A diode has two states, and each model gives a simple rule for each:

| State | The diode is replaced by | What must be true |
|---|---|---|
| On (conducting) | A 0.7 V source (constant-drop model), or a short (ideal) | The current through it flows anode → cathode, $i_D > 0$ |
| Off (cut off) | An open circuit | The voltage across it is below the turn-on level, $u_D < 0.7$ V (or $< 0$ ideal) |

So the method is: guess, solve, check.

::: law Assume-and-check method for diodes | 二极管状态判断法
Take the diode out of the circuit (assume it is off) and find the voltage between the
points where its anode and cathode were. If that voltage would forward-bias it beyond
its turn-on drop (0.7 V for silicon, 0 for an ideal diode), the diode is on: replace it
by its on-model and solve. Otherwise it is off, and the voltage found is the reverse
(or small forward) voltage across it.
:::

::: callout pitfall Off doesn't mean zero volts
An off diode carries no current, but it can have a large voltage across it. Likewise an
on diode has a fixed voltage, not a fixed current: the rest of the circuit decides the
current.
:::

::: example On or off?
In the circuit below, the input $U_I$ is fed through $R = 1$ kΩ to a silicon diode
whose cathode is held at $E = 5$ V by a battery. Find $U_O$ and the current for
$U_I = 3$ V and for $U_I = 8$ V (constant-drop model, 0.7 V).

::: circuit A diode with its cathode held at 5 V
V1 0,6 0,0 UI
R1 0,0 4,0 1k
D1 4,0 4,3 D
V2 4,6 4,3 5V
W 0,6 4,6
G 0,6
label UO 4,0
:::

== U_I = 3 V: assume off ==
With the diode out, no current flows through $R$, so the anode sits at 3 V. The cathode
is at 5 V, so $u_D = 3 - 5 = -2$ V: reverse biased. It **is** off.
$U_O = 3$ V and the current is 0.
== U_I = 8 V: assume off ==
Now the anode would be at 8 V and $u_D = 8 - 5 = 3$ V > 0.7 V: the guess is wrong, the
diode is on.
== U_I = 8 V: solve with the diode on ==
$U_O = 5 + 0.7 = 5.7$ V, and $I = \dfrac{8 - 5.7}{1\ \text{k}\Omega} = 2.3$ mA, flowing
anode → cathode as it must.
:::

## The half-wave rectifier

Mains electricity is AC; electronics need DC. The first step from one to the other is
to stop the current flowing backwards — exactly what a diode does.

::: define Rectifier circuit | 整流电路
A circuit that turns alternating current into current that flows in one direction only
(a pulsating DC), using the one-way conduction of diodes.
:::

A {{term transformer | 变压器}} first steps the mains voltage $u_1$ down to a suitable
$u_2 = \sqrt2 U_2 \sin\omega t$ ($U_2$ is its rms value). A diode VD in series then
feeds the load $R_L$.

::: circuit Half-wave rectifier (u2 is the transformer's secondary)
A1 0,4 0,0 u2
D1 0,0 4,0 VD
R1 4,0 4,4 RL
W 0,4 4,4
G 0,4
label uo 4,0
:::

How it works, with an ideal diode:

- **Positive half-cycle** ($u_2 > 0$): the anode is positive, VD conducts like a closed
  switch, and $u_O = u_2$.
- **Negative half-cycle** ($u_2 < 0$): VD is reverse biased and open; no current flows,
  so $u_O = 0$, and the whole $u_2$ appears across the diode as a reverse voltage.

The output keeps only the positive halves: a {{term half-wave rectifier | 半波整流}}.
With a real diode each hump is about 0.7 V lower and starts a little later; try the
$U_D$ slider (with a small $U_2$ the difference is obvious, with a large one it hardly
matters — that's when the ideal model is fine).

::: plot Half-wave rectifier: input and output
x: 0 .. 12.57
xlabel: ωt (rad)
ylabel: u (V)
u2(t) = sqrt(2) U2 sin(t)
uo(t) = max(0, sqrt(2) U2 sin(t) - UD)
slider U2: 1 .. 20 = 5 | V
slider UD: 0 .. 0.7 = 0 | V
:::

### The average output voltage

A DC meter on the output reads the average of $u_O$ over a whole period. The output is
$\sqrt2 U_2 \sin\omega t$ for $0 < \omega t < \pi$ and zero for the second half, so

$$U_{O(AV)} = \frac{1}{2\pi}\int_0^{\pi}\sqrt2 U_2 \sin\omega t\,\d(\omega t) = \frac{\sqrt2 U_2}{2\pi}\Big[-\cos\omega t\Big]_0^{\pi} = \frac{\sqrt2}{\pi}U_2 \approx 0.45\,U_2$$

::: formula Half-wave rectifier output | 半波整流输出电压平均值
$$U_{O(AV)} = \frac{\sqrt2}{\pi}U_2 \approx 0.45\,U_2$$
--
U_{O(AV)} | average (DC) value of the output voltage | V
U_2 | rms value of the transformer's secondary voltage | V
:::

::: callout note About the slide's integral
The slide writes the average first as $\frac{1}{2\pi}\int_0^{2\pi}\sqrt2 U_2 \sin\omega t\,\d(\omega t)$.
Taken literally that integral is zero (the sine's two halves cancel); it means the
integral of the *output*, which is zero from $\pi$ to $2\pi$, and that is the
$\int_0^{\pi}$ form that follows on the slide.
:::

### Choosing the diode

Two numbers decide which diode can do the job (they follow straight from how the circuit
works; the next chapters on power supplies use them):

::: formula Diode ratings in a half-wave rectifier | 半波整流二极管参数
$$I_{D(AV)} = I_{O(AV)} = \frac{0.45\,U_2}{R_L}, \qquad U_{RM} \ge \sqrt2\,U_2$$
--
I_{D(AV)} | average current through the diode (it carries the whole load current) | A
U_{RM} | maximum reverse working voltage the diode must withstand | V
R_L | load resistance | Ω
:::

So pick a diode with $I_F$ above the average current and $U_{RM}$ above the peak of
$u_2$, with some margin.

::: example A half-wave rectifier
A transformer gives $U_2 = 15$ V rms to a half-wave rectifier with $R_L = 1$ kΩ (ideal
diode). Find the average output voltage and current, and the diode's ratings.
== Average output ==
$U_{O(AV)} \approx 0.45 \times 15 = 6.75$ V, so $I_{O(AV)} = 6.75/1000 = 6.75$ mA.
== Diode ratings ==
The diode carries all the load current: $I_{D(AV)} = 6.75$ mA. In the negative
half-cycle it blocks the full peak: $U_{RM} \ge \sqrt2 \times 15 \approx 21.2$ V.
A 1N4001 (1 A, 50 V) is more than enough.
:::

The slides' Multisim simulation is this circuit: 220 V rms, 50 Hz into a transformer, a
1N4001 and a 1 kΩ load. The oscilloscope shows the full sine at the primary and only
the positive humps at the load, flat at zero in between.

::: circuit-sim The rectifier's conducting half-cycle as a DC circuit
V1 0,4 0,0 15V [0..30]
R1 0,0 4,0 1 [1..10]
R2 4,0 4,4 1k [100..10k]
W 0,4 4,4
G 0,4
label uo 4,0
:::

(In the simulator above, the 1 Ω resistor stands for a conducting ideal diode during the
positive half-cycle: set the source to an instantaneous value of $u_2$ and read
$u_O$. During the negative half-cycle the diode is simply open and $u_O = 0$.)

## Limiters

Sometimes a signal must not go above (or below) some level: to protect an input, or to
square up a waveform. A diode plus a battery does this.

::: define Limiter | 限幅电路
A circuit whose output follows its input until the input passes a set level, and then
stays at about that level: it clips off the part of the waveform beyond the limit. Also
called a clipper.
:::

### Shunt limiter: diode across the output

In circuit (a), the input feeds the output through $R$, and from the output a diode in
series with a battery $V_{CC}$ goes to the common line. The diode's cathode is held at
$V_{CC}$.

::: circuit Limiter (a): series resistor, diode and battery across the output
A1 0,6 0,0 ui
R1 0,0 4,0 R
D1 4,0 4,3 VD
V1 4,6 4,3 VCC
W 4,0 7,0
W 0,6 4,6 7,6
G 0,6
label uo 7,0
:::

- While $u_i < V_{CC}$ (ideal diode): the diode is reverse biased, open; no current flows
  through $R$ (no load), so $u_o = u_i$.
- When $u_i > V_{CC}$: the diode conducts and ties the output to the battery,
  $u_o = V_{CC}$; the difference $u_i - V_{CC}$ drops across $R$.

$$u_o = \begin{cases} u_i, & u_i < V_{CC} + U_D \\ V_{CC} + U_D, & u_i \ge V_{CC} + U_D \end{cases}$$

with $U_D = 0$ for an ideal diode and 0.7 V for the constant-drop model. With a 10 V
peak input and $V_{CC} = 5$ V, the top of the sine is cut off flat at 5 V; the negative
half passes unchanged.

### Series limiter: diode in the signal path

In circuit (b), the diode is in series with the signal, and $R$ in series with
$V_{CC}$ goes from the output to the common line.

::: circuit Limiter (b): series diode, resistor and battery to the common line
A1 0,6 0,0 ui
D1 0,0 4,0 VD
R1 4,0 4,3 R
V1 4,6 4,3 VCC
W 4,0 7,0
W 0,6 4,6 7,6
G 0,6
label uo 7,0
:::

- While $u_i < V_{CC}$: the diode's cathode (at $V_{CC}$ through $R$) is higher than its
  anode, so it is off; no current flows in $R$, and $u_o = V_{CC}$.
- When $u_i > V_{CC}$: it conducts and passes the input, $u_o = u_i$ (ideal).

$$u_o = \begin{cases} V_{CC}, & u_i < V_{CC} + U_D \\ u_i - U_D, & u_i \ge V_{CC} + U_D \end{cases}$$

This one keeps only the part of the input above 5 V and sits at 5 V the rest of the time.

Compare the two below. Set $U_D = 0.7$ V to see the real-diode versions: the slides'
simulations (7.07 V rms = 10 V peak, 1 kΩ, a 1N4001, a 5 V battery) show (a) clipping at
about 5.7 V, and (b) rising above 5 V only when the input passes about 5.7 V.

::: plot Limiter (a): input and output
x: 0 .. 12.57
xlabel: ωt (rad)
ylabel: u (V)
ui(t) = Um sin(t)
uo(t) = min(Um sin(t), VCC + UD)
slider Um: 1 .. 15 = 10 | V
slider VCC: 0 .. 10 = 5 | V
slider UD: 0 .. 0.7 = 0 | V
:::

::: plot Limiter (b): input and output
x: 0 .. 12.57
xlabel: ωt (rad)
ylabel: u (V)
ui(t) = Um sin(t)
uo(t) = max(Um sin(t) - UD, VCC)
slider Um: 1 .. 15 = 10 | V
slider VCC: 0 .. 10 = 5 | V
slider UD: 0 .. 0.7 = 0 | V
:::

::: example The shunt limiter with a real diode
In limiter (a), $u_i = 10\sin\omega t$ V, $R = 1$ kΩ, $V_{CC} = 5$ V and the diode is
silicon (0.7 V). Find the clipping level, the output at the input's peak, and the
largest current through the diode.
== Clipping level ==
The diode turns on when the output would exceed $V_{CC} + 0.7 = 5.7$ V, so the output is
clipped at 5.7 V (with an ideal diode, at 5 V).
== At the peak ==
$u_i = 10$ V, the diode is on, $u_o = 5.7$ V, and $R$ drops $10 - 5.7 = 4.3$ V.
== Diode current ==
No load, so all of $R$'s current goes through the diode:
$i_D = 4.3\ \text{V}/1\ \text{k}\Omega = 4.3$ mA at the peak.
== Negative half ==
The diode stays off and $u_o = u_i$, down to −10 V.
:::

::: callout tip Reading any limiter
Find the input voltage at which the diode just turns on (the "break point"). On one side
of it the diode is open and the output is set by one path; on the other side it is a
0.7 V source and the output is pinned to the battery. Sketch the output by switching
between the two at the break point.
:::

## The diode AND gate

Diodes can also do logic. In the {{term switching circuit | 开关电路}} from the slides,
$V_{CC} = +5$ V feeds node P through a resistor $R$, and three diodes connect P to the
inputs A, B and C, each with its **anode** at P and its cathode at the input. Inputs are
either 0 V (logic 0) or 5 V (logic 1).

::: circuit Diode AND gate
R1 2,0 2,4 R
W 2,4 2,10
D1 2,4 6,4 DA
D2 2,7 6,7 DB
D3 2,10 6,10 DC
W 6,4 8,4
W 6,7 8,7
W 6,10 8,10
label +5V 2,0
label uP 2,4
label A 8,4
label B 8,7
label C 8,10
:::

Use the assume-and-check method:

- **Any input at 0 V.** With all diodes out, P would be pulled up to 5 V by $R$. The
  diode to the 0 V input would then have 5 V forward across it, so it conducts and pins
  P at $0 + 0.7 = 0.7$ V. Any diode whose input is at 5 V now has $0.7 - 5 = -4.3$ V
  across it: off. So $u_P = 0.7$ V, a logic 0.
- **All inputs at 5 V.** P can rise to 5 V before any diode would conduct; at 5 V each
  diode has 0 V across it, so all are off, no current flows in $R$, and $u_P = 5$ V, a
  logic 1.

| $u_C$ (V) | $u_B$ (V) | $u_A$ (V) | $u_P$ (V) |
|---|---|---|---|
| 0 | 0 | 0 | 0.7 |
| 0 | 0 | 5 | 0.7 |
| 0 | 5 | 0 | 0.7 |
| 0 | 5 | 5 | 0.7 |
| 5 | 0 | 0 | 0.7 |
| 5 | 0 | 5 | 0.7 |
| 5 | 5 | 0 | 0.7 |
| 5 | 5 | 5 | 5 |

The output is high only when **all** inputs are high: $P = A \cdot B \cdot C$, an AND
gate. (0.7 V counts as a logic 0.) Flip the switches to check:

::: logic Diode AND gate (0 V = 0, 5 V = 1)
inputs: A B C
P = A B C
:::

::: callout key The lowest input wins
In this gate, the diode connected to the **lowest** input voltage conducts first and
clamps P at that voltage plus 0.7 V; all the others are then reverse biased. That rule
answers almost every "which diode conducts?" question with diodes sharing an anode.
:::

::: example Which diode conducts?
In the AND gate, $R = 3$ kΩ, and the inputs are $u_A = 3$ V, $u_B = 0$ V,
$u_C = 5$ V. Find $u_P$, which diodes conduct, and the current in $R$.
== Lowest input ==
$u_B = 0$ V is the lowest, so DB conducts and $u_P = 0 + 0.7 = 0.7$ V.
== Check the others ==
DA: $u_P - u_A = 0.7 - 3 = -2.3$ V, off. DC: $0.7 - 5 = -4.3$ V, off. (Had we guessed DA
on, P would be 3.7 V and DB would have 3.7 V forward across it — impossible, so the
guess was wrong.)
== Current ==
$I_R = \dfrac{5 - 0.7}{3\ \text{k}\Omega} \approx 1.43$ mA, all of it through DB into
input B.
:::

::: callout exam What's typically asked
Decide which diodes conduct and find the output (state your assumption and check it);
sketch a rectifier's or limiter's output waveform under the input (ideal and
constant-drop versions); use $U_{O(AV)} \approx 0.45U_2$; fill in a gate's voltage table.
:::

::: cards Diode circuits
How to tell whether a diode is on :: Remove it (assume off), find the voltage across its place; on if it would exceed the turn-on drop, then re-solve with 0.7 V.
An off diode has … :: No current — but possibly a large voltage across it.
Half-wave rectifier output (average) :: $U_{O(AV)} = \frac{\sqrt2}{\pi}U_2 \approx 0.45U_2$
Half-wave rectifier: diode's reverse voltage :: The peak $\sqrt2 U_2$, in the negative half-cycle.
Half-wave rectifier: diode current :: The whole load current, $I_{D(AV)} = 0.45U_2/R_L$.
Shunt limiter (diode + $V_{CC}$ across the output) :: Output follows the input but is clipped at $V_{CC}$ (+0.7 V for a real diode).
Series limiter (diode in the path, $R$ to $V_{CC}$) :: Output stays at $V_{CC}$ and follows the input only above it.
Diode AND gate: output :: High (5 V) only when all inputs are high; otherwise 0.7 V.
Diodes sharing an anode: which conducts? :: The one with the lowest cathode (input) voltage.
:::

::: quiz Diode circuits
? A transformer gives $U_2 = 20$ V rms to a half-wave rectifier (ideal diode). What is the average output voltage?
answer: 9 V
tolerance: 1%
> $U_{O(AV)} \approx 0.45 \times 20 = 9.0$ V (exactly $\frac{\sqrt2}{\pi} \times 20 = 9.00$ V).

? Write the half-wave rectifier's average output exactly, in terms of $U_2$.
expression: sqrt(2) U_2 / pi
variables: U_2
> $\frac{1}{2\pi}\int_0^{\pi}\sqrt2 U_2\sin\omega t\,\d(\omega t) = \frac{\sqrt2 U_2}{2\pi} \times 2 = \frac{\sqrt2}{\pi}U_2$.

? In the same rectifier ($U_2 = 20$ V), what is the largest reverse voltage across the diode?
answer: 28.3 V
tolerance: 1%
> In the negative half-cycle the diode blocks the whole of $u_2$, whose peak is $\sqrt2 \times 20 \approx 28.3$ V.

? A silicon diode's anode is fed from 2 V through 1 kΩ; its cathode is held at 5 V. What is the anode voltage?
answer: 2 V
> With the diode out, the anode would sit at 2 V and the cathode at 5 V: −3 V across it, so it's off. No current, no drop in the resistor: the anode is at 2 V.

? In limiter (a) with $u_i = 10\sin\omega t$ V and $V_{CC} = 5$ V, what is the output's maximum with a silicon diode (0.7 V)?
answer: 5.7 V
> The diode conducts once the output would pass $V_{CC} + 0.7 = 5.7$ V, and holds it there.

? In limiter (b) with $u_i = 10\sin\omega t$ V, $V_{CC} = 5$ V and an ideal diode, what is the output when $u_i = -10$ V?
answer: 5 V
> The diode is off (its cathode is at 5 V, its anode at −10 V), no current flows in $R$, so the output is $V_{CC} = 5$ V.

? In the diode AND gate (+5 V supply, inputs 0 or 5 V, silicon diodes), what is $u_P$ when A = 5 V, B = 5 V, C = 0 V?
answer: 0.7 V
> The diode to C (0 V) conducts and pins P at $0 + 0.7$ V; DA and DB then have −4.3 V across them and stay off.

? In the AND gate with $R = 4.3$ kΩ, one input at 0 V: what current flows in $R$?
answer: 1 mA
> $I = (5 - 0.7)/4.3\ \text{k}\Omega = 1.0$ mA.

? Which logic function do the slides' three diodes and pull-up resistor perform?
- [x] AND
- [ ] OR
- [ ] NOT
- [ ] NAND
> The output is high only when every input is high: $P = ABC$.
:::

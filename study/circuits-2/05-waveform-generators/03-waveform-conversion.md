---
title: Waveform conversion and precision rectifiers
zh: 波形变换与精密整流电路
summary: Changing one waveform into another with op-amps: a triangle into a double-frequency sawtooth, the Howland current source, and precision half-wave and full-wave (absolute-value) rectifiers that work on signals far smaller than a diode's turn-on voltage.
source: 第8章 信号发生电路 8.5 非正弦波发生电路 (1), 2026-09-17
---

## What this lesson is for

Lessons 1 and 2 *generated* waveforms. Often you already have a waveform and need a
different one: a sine from a sensor turned into a square wave for a counter, a
triangle turned into a sawtooth for a sweep, a small AC signal turned into its
absolute value so a meter can read it. These are **waveform conversion circuits**.
The new trick in this lesson is using a diode or a transistor as an *electronic
switch* inside an op-amp circuit, so the circuit's gain depends on the signal's
polarity. Analysing such circuits always follows one recipe, and once you know it,
every circuit here takes a few lines.

## Converting waveforms with basic circuits

::: define Waveform conversion circuit | 波形变换电路
A circuit that turns an input waveform into a different shape (or frequency) at its
output, built from the basic op-amp circuits: comparators, integrators,
differentiators, amplifiers and switches.
:::

You already know most of the conversions the slides list:

| Conversion | Circuit |
| --- | --- |
| sine → square | a zero-crossing comparator (lesson 1) |
| sine → rectangular (duty ≠ 50%) | a single-threshold comparator with $U_{REF} \ne 0$ |
| sine → double frequency | a full-wave (absolute-value) rectifier, below |
| square → triangle | an integrator (lesson 2) |
| triangle → square | a comparator |
| triangle of fixed frequency → sine | a low-pass filter (or a shaping network) |
| triangle → sawtooth, double frequency | an amplifier whose gain is switched between +1 and −1 |

The last one is new.

## Triangle to double-frequency sawtooth

### The idea

A triangle $u_I$ rises for half a period and falls for the other half. A sawtooth
should only ramp **up** (then drop). So: pass the triangle unchanged while it rises
($A_u = +1$), and invert it while it falls ($A_u = -1$). While it falls, $-u_I$ rises.
Each half of the triangle becomes one rising ramp from $-U_{IM}$ to $+U_{IM}$; at
every peak and every trough the output drops from $+U_{IM}$ to $-U_{IM}$. That gives
**two** teeth per triangle period: a sawtooth at twice the frequency (二倍频).

::: callout key Change the gain with an electronic switch
利用电子开关改变比例系数: the circuit is an ordinary op-amp amplifier, and a switch
(a transistor or FET driven by a control voltage $u_C$) flips its gain between +1 and
−1 at the triangle's turning points.
:::

### The circuit

The input goes to both op-amp inputs. On the − side: $R_1 = R$ from $u_I$, $R_2 = R/2$
to ground, $R_f = R$ to the output. On the + side: $u_I$ through $R_3 = R/2$ to a node
M, then $R_4 = R/2$ to the + input, and $R_5 = R$ from the + input to ground. The
switch S connects M to ground.

::: circuit Triangle to sawtooth with R = 10 kΩ: the switch S sets the gain to +1 or −1
A1 0,15 0,3 uI
G 0,15
W 0,3 2,3
R1 2,3 6,3 10k
W 6,3 6,5 8,5
W 6,3 6,1
Rf 6,1 12,1 10k
W 12,1 12,6
R2 6,5 6,9 5k
G 6,9
U1 opamp 8,6
W 12,6 14,6
label uO 14,6
W 2,3 2,11
R3 2,11 5,11 5k
R4 5,11 8,11 5k
W 8,7 8,11
R5 8,11 8,15 10k
G 8,15
S1 5,11 5,14 open
G 5,14
label M 5,11
:::

Work out both switch states with superposition: $u_O$ is the inverting part
$-\frac{R_f}{R_1}u_I$ plus the non-inverting part $\left(1 + \frac{R_f}{R_1/\!/R_2}\right)u_P$.

- **S open.** No current flows into the + input, so $R_3$, $R_4$, $R_5$ are a plain
  divider: $u_P = \dfrac{R}{R/2 + R/2 + R}u_I = \dfrac{u_I}{2}$. With
  $R_1 /\!/ R_2 = R /\!/ \frac{R}{2} = \frac{R}{3}$, the non-inverting gain is
  $1 + \frac{R}{R/3} = 4$. So $u_O = -u_I + 4\cdot\dfrac{u_I}{2} = +u_I$: $A_u = +1$.
- **S closed.** M is grounded, so no current flows in $R_4$ or $R_5$ and $u_P = 0$.
  Then $u_N = 0$ too, $R_2$ carries nothing, and the circuit is a plain inverting
  amplifier: $u_O = -\dfrac{R_f}{R_1}u_I = -u_I$: $A_u = -1$.

::: formula Gain of the switched triangle-to-sawtooth amplifier | 三角波变锯齿波电路的增益
$$A_u = \begin{cases} +1 & \text{S open}\\ -1 & \text{S closed}\end{cases}
\qquad (R_1 = R_f = R_5 = R,\; R_2 = R_3 = R_4 = R/2)$$
--
A_u | voltage gain $u_O/u_I$ | 
R | the circuit's reference resistance | Ω
:::

So S must be **open while $u_I$ rises and closed while it falls**. Where does the
control $u_C$ come from (the slide's question 如何得到？)? From the circuit that made
the triangle: in lesson 2's generator, the comparator's square wave $u_{o1}$ is
$+U_Z$ exactly while the integrator's output falls and $-U_Z$ while it rises. Drive
the switch with it (for example an npn transistor whose base is fed from $u_{o1}$
through a resistor: on when $u_{o1}$ is high), and the gain flips precisely at the
triangle's peaks and troughs. If you only have the triangle, a comparator that
detects its slope (or the comparator that made it) supplies the same signal.

::: plot Triangle u_I (period 2 ms) and the double-frequency sawtooth u_O
x: 0 .. 6
y: -6 .. 6
xlabel: t (ms)
ylabel: u (V)
uI(t) = U (4 abs(t/2 - floor(t/2 + 0.5)) - 1)
uO(t) = sign(sin(pi t)) U (4 abs(t/2 - floor(t/2 + 0.5)) - 1)
slider U: 1 .. 5 = 4 | V
:::

::: example Checking the gains with numbers
Take $R = 10$ kΩ and $u_I = 2$ V. Find $u_O$ with S open and with S closed.
== S open ==
$u_P = 2 \times \dfrac{10}{5+5+10} = 1$ V. $u_N = u_P = 1$ V. Current in $R_1$:
$(2-1)/10\,\text{k} = 0.1$ mA in; current in $R_2$: $1/5\,\text{k} = 0.2$ mA out to
ground. So $R_f$ carries $0.2 - 0.1 = 0.1$ mA from the output into N:
$u_O = 1 + 0.1\,\text{mA}\times10\,\text{k} = 2$ V $= +u_I$.
== S closed ==
$u_P = 0$, so $u_N = 0$. $R_1$ carries $2/10\,\text{k} = 0.2$ mA, $R_2$ none; all of it
flows on through $R_f$: $u_O = 0 - 0.2\,\text{mA}\times10\,\text{k} = -2$ V $= -u_I$.
:::

## Discussion 讨论二: from a sine wave to a sawtooth

The task: turn a 1 V-peak, 100 Hz sine into a 5 V-peak, 200 Hz sawtooth. The
slides answer with a chain of three blocks:

**sine (100 Hz) → zero-crossing comparator → integrator → triangle-to-sawtooth
circuit → sawtooth (200 Hz).**

1. The **zero-crossing comparator** turns the sine into a 100 Hz square wave
   $\pm U_Z$. The input's 1 V amplitude doesn't matter: only its sign does.
2. The **integrator** turns the square wave into a 100 Hz triangle. Its amplitude is
   set by $R$ and $C$: each half period (5 ms) the output changes by
   $U_Z \times 5\,\text{ms}/(RC)$, and that must equal the triangle's peak-to-peak
   value, 10 V.
3. The **triangle-to-sawtooth circuit** (gain ±1, switched by the comparator's
   square wave) doubles the frequency and keeps the 5 V peak.

::: example Choosing the integrator for 讨论二
The comparator gives $\pm U_Z = \pm 6$ V. Choose $R$ and $C$ for a 5 V-peak triangle
at 100 Hz, and say how the switch is driven.
== Ramp size ==
Peak-to-peak 10 V must be covered in half a period, 5 ms, at slope $U_Z/(RC)$:
$\dfrac{6\,\text{V}\times5\,\text{ms}}{RC} = 10$ V, so $RC = 3$ ms.
== Parts ==
With $C = 0.1$ µF, $R = 30$ kΩ.
== Keeping it centred ==
This integrator is driven open loop (lesson 2), so it would drift. A large resistor
across $C$ (say 1 MΩ, a time constant of 100 ms, much longer than 5 ms) bleeds off
offsets and keeps the triangle centred on 0 V with little effect on its shape.
== The switch ==
With the sine on the comparator's + input, $u_{o1} = +U_Z$ during the positive
half-cycle, which is when the inverting integrator's output falls. So switch S must
be closed ($A_u = -1$) while $u_{o1}$ is high: an npn transistor from M to ground,
its base driven from $u_{o1}$ through a resistor, does exactly that. The output is a
sawtooth from −5 V to +5 V at 200 Hz.
:::

The slides' Multisim version uses the same resistor ratios (10 kΩ and 5 kΩ for $R$
and $R/2$) with an LM324 and a 2N3390 transistor as the switch, and the scope shows
twice as many sawtooth teeth as triangle periods.

## The Howland current source

### What a current source needs

A voltage-controlled current source should push a current $i_O$ into a load that
depends only on the input voltage, **not** on the load resistance $R_L$. The
Howland circuit does this with one op-amp.

::: define Howland current source | 豪兰德电流源
An op-amp circuit with both negative feedback ($R_2$ to the − input) and positive
feedback ($R_3$ to the + input, where the load is connected). With the bridge
balanced, $R_2/R_1 = R_3/R$, its output current into the load is $i_O = -u_I/R$,
whatever the load.
:::

The circuit: $u_I$ through $R_1$ to the − input (N); $R_2$ from N to the op-amp output
$u_O$; $R_3$ from $u_O$ to the + input (P); the load $R_L$ from P to ground, carrying
$i_O$ downwards; and $R$ from P to ground.

::: circuit Howland current source (values from the example below)
A1 0,12 0,1 uI
G 0,12
W 0,1 2,1
R1 2,1 6,1 10k
R2 6,1 10,1 10k
W 10,1 10,4
W 6,1 6,3
U1 opamp 6,4
W 10,4 12,4
R3 12,4 12,8 10k
W 12,8 6,8 6,5
R 6,8 6,12 10k
G 6,12
RL 12,8 12,12 2k
G 12,12
label uO 10,4
label P 6,8
:::

### The analysis

The op-amp has negative feedback, so $u_N = u_P$. Write the currents at N and at P:

$$\frac{u_I - u_P}{R_1} = \frac{u_P - u_O}{R_2}, \qquad \frac{u_O - u_P}{R_3} = \frac{u_P}{R} + i_O.$$

From the first, $u_O = \left(1 + \frac{R_2}{R_1}\right)u_P - \frac{R_2}{R_1}u_I$. Put it in
the second:

$$i_O = \left(\frac{R_2}{R_1R_3} - \frac{1}{R}\right)u_P - \frac{R_2}{R_1R_3}\,u_I.$$

If $\dfrac{R_2}{R_1} = \dfrac{R_3}{R}$, the bracket is zero: $u_P$ (which depends on the
load) drops out, and $i_O = -\dfrac{R_3}{R}\cdot\dfrac{u_I}{R_3} = -\dfrac{u_I}{R}$.

::: formula Howland current source output | 豪兰德电流源的输出电流
$$i_O = -\frac{u_I}{R} \qquad \text{when } \frac{R_2}{R_1} = \frac{R_3}{R}$$
--
i_O | current into the load $R_L$ (downwards) | A
u_I | input voltage | V
R | resistor from P to ground | Ω
R_1, R_2, R_3 | as in the circuit | Ω
:::

### Why it works: two feedbacks that cancel

电路既引入了负反馈，又引入了正反馈: the slides explain the independence from $R_L$ as two
effects that cancel.

- Make $R_L$ smaller: with the same voltage at P, more current would flow, so
  $i_O\uparrow$.
- But a smaller $R_L$ also pulls $u_P$ down, the op-amp (through its negative
  feedback) drags $u_O$ down, and less current flows through $R_3$: $i_O\downarrow$.

With the balance condition the two exactly cancel, so $i_O$ doesn't change: the
output resistance is infinite ($R_o = \infty$, the slide's "如何求解输出电阻？", which
the textbook works through in section 6.7.1). Try it: change $R_L$ with the bridge
balanced, then unbalance it by moving $R$.

::: explore Howland current source (resistances in kΩ, current in mA)
slider uI: -2 .. 2 = 1 | V
slider R1: 1 .. 20 = 10 | kΩ
slider R2: 1 .. 20 = 10 | kΩ
slider R3: 1 .. 20 = 10 | kΩ
slider R: 1 .. 20 = 10 | kΩ
slider RL: 0 .. 10 = 2 | kΩ
k = R2/(R1*R3) - 1/R | mS | Imbalance (0 when R2/R1 = R3/R)
iO = -R2*uI/(R1*R3*(1 - k*RL)) | mA | Load current i_O
uP = RL*iO | V | Voltage across the load
uO = (1 + R2/R1)*uP - R2/R1*uI | V | Op-amp output
:::

::: example A Howland source driving two loads
$R_1 = R_2 = R_3 = R = 10$ kΩ, $u_I = 1$ V. Find $i_O$, $u_P$ and $u_O$ for $R_L = 2$ kΩ
and for $R_L = 5$ kΩ.
== Balance ==
$R_2/R_1 = 1 = R_3/R$, so $i_O = -u_I/R = -0.1$ mA for any load (it flows up out of
the load, into P).
== R_L = 2 kΩ ==
$u_P = R_Li_O = -0.2$ V; $u_O = 2u_P - u_I = -1.4$ V. Check at P: $R_3$ carries
$(u_O - u_P)/R_3 = -0.12$ mA, $R$ carries $u_P/R = -0.02$ mA, difference $-0.1$ mA. ✓
== R_L = 5 kΩ ==
$u_P = -0.5$ V, $u_O = -2$ V; $i_O$ still $-0.1$ mA. The op-amp's output did the
adjusting.
:::

::: callout pitfall The load can't be anything
"Independent of $R_L$" holds only while the op-amp stays in its linear region. A
large $R_L$ needs a large $u_O$ (here $u_O = 2u_P - u_I$); once $u_O$ hits the supply
limit, the circuit stops being a current source. And any mismatch in the bridge
makes $i_O$ depend on $R_L$ again (move $R$ in the explorer).
:::

## Precision rectifiers

### Why an ordinary rectifier fails for small signals

::: define Precision rectifier | 精密整流电路
A signal-processing circuit (not a power supply's AC-to-DC converter) that rectifies
signals of any size, even far below a diode's turn-on voltage, by putting the diode
inside an op-amp's feedback loop.
:::

A plain diode in series with a resistor passes current only when the voltage across
it exceeds its turn-on voltage $U_{on}$ (about 0.5 V for silicon). So:

- if $u_{I\max} < U_{on}$, $u_O$ is zero for the whole period: a 0.2 V signal simply
  disappears;
- if $u_{I\max} > U_{on}$, $u_O \approx u_I - U_{on}$ only while $u_I > U_{on}$: the
  output is distorted (失真) and too small.

For a power supply with tens of volts that loss doesn't matter; for a 100 mV
measurement signal it ruins everything.

::: plot A plain diode rectifier versus a precision one
x: 0 .. 2
xlabel: t (periods)
ylabel: u (V)
uI(t) = Um sin(2 pi t)
plain(t) = max(Um sin(2 pi t) - Uon, 0)
precise(t) = max(Um sin(2 pi t), 0)
slider Um: 0.1 .. 3 = 0.8 | V
slider Uon: 0.3 .. 0.7 = 0.5 | V
:::

### The half-wave precision rectifier

Start from an inverting amplifier ($u_I$ through $R$ to the − input, $R_f$ feedback,
+ input through $R'$ to ground) and add two diodes:

- D1 from the op-amp's output $u_O'$ to the − input (anode at $u_O'$);
- D2 between the output terminal $u_O$ and $u_O'$ (anode at $u_O$), with $R_f$
  connected from the − input to $u_O$, outside D2.

::: circuit Half-wave precision rectifier (R = Rf = 10 kΩ)
A1 0,8 0,3 uI
W 0,8 6,8
G 6,8
W 0,3 2,3
R 2,3 6,3 10k
W 6,3 6,0
Rf 6,0 14,0 10k
W 14,0 14,4
U1 opamp 6,4
Rp 6,5 6,8 R'
W 10,4 10,2
D1 10,2 6,2
D2 14,4 10,4
W 14,4 16,4
label uO' 10,4
label uO 16,4
:::

::: callout tip The recipe for circuits with diode switches
对于将二极管和晶体管作电子开关的集成运放应用电路: first decide, for each sign of the
input, whether each diode is a **closed** or an **open** switch. Their states depend on
the polarity of the input or of the op-amp's output. Then redraw the circuit with
shorts and gaps, and analyse an ordinary op-amp circuit.
:::

Let $R = R_f$.

- **$u_I > 0$.** The inverting op-amp drives $u_O' < 0$. D1 (anode at $u_O'$) is
  reverse-biased: open. D2 (anode at $u_O$, cathode at the more negative $u_O'$)
  conducts: closed. The feedback path is $R_f$ through D2, an inverting amplifier:
  $u_O = -\dfrac{R_f}{R}u_I = -u_I$.
- **$u_I < 0$.** The op-amp drives $u_O' > 0$. D1 conducts and closes the loop
  directly, holding the − input at virtual ground with $u_O'$ only a diode drop above
  it. D2 is reverse-biased. No current flows in $R_f$, so $u_O = u_N = 0$.

::: formula Half-wave precision rectifier | 半波精密整流电路
$$u_O = \begin{cases} -\dfrac{R_f}{R}\,u_I & u_I > 0\\[4pt] 0 & u_I < 0 \end{cases}$$
--
u_O | output (at the junction of $R_f$ and D2) | V
R_f | feedback resistor | Ω
R | input resistor | Ω
:::

**Why is it precise?** (为什么是精密整流？) The diode's turn-on voltage is inside the
feedback loop. To make D2 conduct, the op-amp only needs its *input* difference to be
$U_{on}/A_{od}$: with $A_{od} = 10^5$ that is about 5 µV instead of 0.5 V. The op-amp
swings $u_O'$ one diode drop beyond $u_O$ by itself, and the output never sees the
drop.

::: example A 0.2 V signal through the half-wave precision rectifier
$R = R_f = 10$ kΩ, $U_{on} = 0.6$ V, $u_I = 0.2\sin\omega t$ V. Find $u_O$ and $u_O'$ at
the positive and negative peaks, and compare with a plain diode rectifier.
== Positive peak, u_I = 0.2 V ==
D2 on, D1 off: $u_O = -0.2$ V. The op-amp's own output is a diode drop lower:
$u_O' \approx -0.2 - 0.6 = -0.8$ V.
== Negative peak, u_I = −0.2 V ==
D1 on, D2 off: $u_O = 0$; $u_O' \approx +0.6$ V (one diode drop above the virtual ground).
== Plain diode ==
$0.2 < U_{on}$, so a plain diode passes nothing: $u_O = 0$ all the time. The precision
circuit gives clean half-waves of 0.2 V (inverted).
:::

### The full-wave precision rectifier: the absolute value

The slide's last line on the half-wave circuit: add back the negative half-cycle and
you have full-wave rectification. The full-wave circuit does exactly that with a
second op-amp that sums.

- **A1** is the half-wave circuit with $R$ in and $2R$ in feedback (gain −2):
  $u_{O1} = -2u_I$ for $u_I > 0$, and $u_{O1} = 0$ for $u_I < 0$.
- **A2** is an inverting summer: $u_{O1}$ through $R$, $u_I$ through $R$, feedback $R$:
  $u_O = -u_{O1} - u_I$.

Case by case:

| $u_I$ | $u_{O1}$ | $u_O = -u_{O1} - u_I$ |
| --- | --- | --- |
| $> 0$ | $-2u_I$ | $2u_I - u_I = u_I$ |
| $< 0$ | $0$ | $-u_I$ |

Either way $u_O = |u_I|$: an **absolute-value circuit** (绝对值运算电路). A sine
input gives all positive humps; a triangle symmetric about 0 gives a triangle at
**twice the frequency** (二倍频三角波), between 0 and its peak.

::: define Absolute-value circuit | 绝对值电路
A full-wave precision rectifier: $u_O = u_I$ for $u_I > 0$ and $u_O = -u_I$ for
$u_I < 0$, so $u_O = |u_I|$. A sine input gives a full-wave output: AC-to-DC conversion
for measurement.
:::

::: formula Absolute-value circuit | 绝对值电路的传输特性
$$u_O = |u_I|$$
--
u_O | output voltage | V
u_I | input voltage | V
:::

::: callout note A typo on slide 05-027
The slide defines the absolute-value circuit with "$u_O = u_I$ when $u_I > 0$; when
$u_I > 0$, $u_O = -u_I$". The second condition should read $u_I < 0$.
:::

::: plot Absolute value: sine and triangle inputs, full-wave outputs
x: 0 .. 2
y: -1.2 .. 1.2
xlabel: t (periods)
ylabel: u (V)
sine(t) = sin(2 pi t)
abssine(t) = abs(sin(2 pi t))
tri(t) = 4 abs(t - floor(t + 0.5)) - 1
abstri(t) = abs(4 abs(t - floor(t + 0.5)) - 1)
:::

### Absolute-value circuit 1: inverting input (反相输入)

::: circuit Inverting-input absolute-value circuit (R = 10 kΩ, 2R = 20 kΩ)
A1 0,10 0,5 ui
W 0,10 6,10
W 0,5 2,5
Ra 2,5 6,5 10k
W 6,5 6,2
U1 opamp 6,6
Rp1 6,7 6,10 R'
G 6,10
W 10,6 10,4
D1 10,4 6,4
D2 14,6 10,6
Rb 6,2 14,2 10k
W 14,2 14,6
label uo1 10,6
label A 14,6
Rc 14,6 18,6 10k
W 2,5 2,0 14,0
Rd 14,0 18,0 20k
W 18,0 18,6 20,6
U2 opamp 20,7
W 20,6 20,4
Re 20,4 24,4 20k
W 24,4 24,7
Rp2 20,8 20,11 R'
G 20,11
W 24,7 26,7
label uo 26,7
:::

A1 is the half-wave circuit with gain −1 (its feedback $R$ goes to node A, outside VD2);
A2 sums node A (through $R$) and the input itself (through $2R$), with feedback $2R$:

$$u_o = -\frac{2R}{R}u_A - \frac{2R}{2R}u_i = -2u_A - u_i.$$

- **$u_i > 0$:** $u_{o1} < 0$, VD1 off, VD2 on. A1 is an inverting amplifier with
  gain −1: $u_A = -u_i$. So $u_o = 2u_i - u_i = u_i$.
- **$u_i < 0$:** $u_{o1} > 0$, VD1 on, VD2 off. Node A connects only through $R$ to
  A1's virtual ground and through $R$ to A2's virtual ground; no current flows, so
  $u_A = 0$ and $u_o = -u_i$.

Whether $u_i$ is positive or negative, $u_o$ is positive: $u_o = |u_i|$.

### Absolute-value circuit 2: non-inverting input (同相输入)

The second version feeds $u_i$ to the **+ inputs** of both op-amps (each through $R$),
so it draws almost no current from the source: a high input resistance.

- A1: + input from $u_i$; its − input $u_{N1}$ has $R$ to ground and $R$ to node A;
  VD1 from $u_{o1}$ (anode) to $u_{N1}$; VD2 from node A (anode) to $u_{o1}$.
- A2: + input from $u_i$; node A through $R$ to the − input $u_{N2}$; $2R$ from
  $u_{N2}$ to $u_o$.

A2 gives $u_o = \left(1 + \dfrac{2R}{R}\right)u_i - \dfrac{2R}{R}u_A = 3u_i - 2u_A$.

- **$u_i > 0$:** $u_{o1} > 0$, VD1 on, VD2 off. A1 is a voltage follower:
  $u_{N1} = u_i$. A2's virtual short gives $u_{N2} = u_i$. Node A sits between two
  resistors whose other ends are both at $u_i$, so no current flows and $u_A = u_i$.
  Then $u_o = 3u_i - 2u_i = u_i$ (no current in $2R$ either).
- **$u_i < 0$:** $u_{o1} < 0$, VD1 off, VD2 on. A1 with $R$ from A to $u_{N1}$ and $R$
  to ground is a non-inverting amplifier (同相比例运算电路) of gain $1 + R/R = 2$:
  $u_A = 2u_i$. Then $u_o = 3u_i - 4u_i = -u_i$.

Again $u_o = |u_i|$.

::: example Both absolute-value circuits at u_i = ±0.3 V
Find $u_A$ and $u_o$ in each circuit for $u_i = +0.3$ V and $u_i = -0.3$ V.
== Inverting input, +0.3 V ==
VD2 on: $u_A = -0.3$ V; $u_o = -2(-0.3) - 0.3 = 0.3$ V.
== Inverting input, −0.3 V ==
VD1 on: $u_A = 0$; $u_o = -0 - (-0.3) = 0.3$ V.
== Non-inverting input, +0.3 V ==
VD1 on: $u_A = 0.3$ V; $u_o = 3(0.3) - 2(0.3) = 0.3$ V.
== Non-inverting input, −0.3 V ==
VD2 on: $u_A = 2(-0.3) = -0.6$ V; $u_o = 3(-0.3) - 2(-0.6) = 0.3$ V.
:::

::: callout exam What is usually asked
For a circuit with diodes or a transistor switch: state, for $u_I > 0$ and $u_I < 0$,
which diode conducts, write $u_O$ for each case, and sketch $u_O$ for a sine (or
triangle) input. For the Howland source: the condition $R_2/R_1 = R_3/R$ and
$i_O = -u_I/R$.
:::

::: cards Waveform conversion and precision rectifiers
Triangle → double-frequency sawtooth :: Switch the amplifier's gain: $A_u = +1$ while the triangle rises, $-1$ while it falls.
Gains of the switched amplifier ($R_1 = R_f = R_5 = R$, $R_2 = R_3 = R_4 = R/2$) :: S open: $u_P = u_I/2$, $A_u = -1 + 4\times\frac12 = +1$. S closed: $u_P = 0$, $A_u = -1$.
Where does the switch's control signal come from? :: The triangle generator's comparator output, which is high exactly while the triangle falls.
讨论二 chain (100 Hz sine → 200 Hz sawtooth) :: Zero-crossing comparator → integrator → triangle-to-sawtooth circuit.
Howland current source condition and output :: If $R_2/R_1 = R_3/R$, then $i_O = -u_I/R$, independent of $R_L$.
Why is the Howland source's output current independent of the load? :: Its positive and negative feedback effects of a change in $R_L$ cancel: $R_o = \infty$.
Why can't a plain diode rectify a 0.2 V signal? :: It needs $U_{on} \approx 0.5$ V before it conducts, so the output stays zero (and larger signals are distorted).
Why is the precision rectifier precise? :: The diode is inside the feedback loop: the op-amp needs only $U_{on}/A_{od}$ at its inputs to turn it on.
Half-wave precision rectifier ($R = R_f$) :: $u_O = -u_I$ for $u_I > 0$ (D2 on), $u_O = 0$ for $u_I < 0$ (D1 on).
Full-wave precision rectifier :: $u_{O1} = -2u_I$ ($u_I > 0$) or 0; $u_O = -u_{O1} - u_I = |u_I|$.
Absolute-value circuit (绝对值电路) :: $u_O = |u_I|$; a triangle in gives a triangle at twice the frequency.
First step in analysing op-amp circuits with diode switches :: Decide, for each input polarity, which diodes are closed and which are open.
Advantage of the non-inverting-input absolute-value circuit :: High input resistance: $u_i$ only drives op-amp + inputs.
:::

::: quiz Waveform conversion and precision rectifiers
? In the triangle-to-sawtooth circuit ($R_1 = R_f = R_5 = R$, $R_2 = R_3 = R_4 = R/2$), what is the gain with the switch open?
answer: 1
> $u_P = u_I/2$; the non-inverting gain is $1 + R/(R/\!/\tfrac R2) = 4$, so $u_O = -u_I + 4\cdot\frac{u_I}{2} = u_I$.

? A triangle of 50 Hz goes through the switched ±1 amplifier. What is the frequency of the sawtooth?
answer: 100 Hz
> Each half of the triangle becomes one rising ramp, so there are two teeth per triangle period: 100 Hz.

? When must the switch be closed ($A_u = -1$)?
- [x] While the triangle is falling
- [ ] While the triangle is rising
- [ ] While the triangle is positive
- [ ] Only at the peaks
> Inverting the falling half makes it rise, so the output always ramps upwards.

? In a Howland current source with $R_2/R_1 = R_3/R$ and $R = 5$ kΩ, what current flows into the load for $u_I = 1$ V?
answer: -0.2 mA
> $i_O = -u_I/R = -1/5\,\text{k} = -0.2$ mA (0.2 mA out of the load), whatever $R_L$ is.

? Write the Howland source's output current, assuming the balance condition.
expression: -uI/R
variables: uI, R
> With $R_2/R_1 = R_3/R$ the $u_P$ term cancels and $i_O = -u_I/R$.

? A sine of 0.3 V peak goes through a plain silicon diode rectifier ($U_{on} \approx 0.5$ V). What is the output?
- [x] Zero all the time
- [ ] Half-waves of 0.3 V
- [ ] Half-waves of 0.2 V
- [ ] A full-wave output
> The input never reaches $U_{on}$, so the diode never conducts and $u_O = 0$: why precision rectifiers are needed.

? In the half-wave precision rectifier with $R = R_f$, what is $u_O$ for $u_I = 0.4$ V?
answer: -0.4 V
> $u_I > 0$: $u_O' < 0$, D1 off, D2 on, so the circuit is an inverting amplifier of gain $-R_f/R = -1$.

? And for $u_I = -0.4$ V?
answer: 0 V
tolerance: 0.001
> $u_I < 0$: $u_O' > 0$, D1 on, D2 off, no current in $R_f$, so $u_O = u_N = 0$.

? In the full-wave precision rectifier, $u_I = 0.5$ V. What is $u_{O1}$?
answer: -1 V
> $u_I > 0$, so A1 acts with gain $-2R/R = -2$: $u_{O1} = -1$ V; then $u_O = -(-1) - 0.5 = 0.5$ V.

? In the non-inverting-input absolute-value circuit with $u_i = -0.2$ V, what is the voltage at node A?
answer: -0.4 V
> $u_i < 0$: VD2 on, A1 is a non-inverting amplifier of gain 2, so $u_A = 2u_i = -0.4$ V; then $u_o = 3u_i - 2u_A = -0.6 + 0.8 = 0.2$ V.
:::

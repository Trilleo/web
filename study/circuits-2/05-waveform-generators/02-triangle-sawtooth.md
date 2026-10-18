---
title: Triangle and sawtooth generators
zh: 三角波与锯齿波发生电路
summary: Closing the loop between a hysteresis comparator and an integrator to make a triangle wave, its amplitude and period, and turning it into a sawtooth or shifting its level.
source: 第8章 信号发生电路 8.5 非正弦波发生电路 (1), 2026-09-17
---

## What this lesson is for

The square-wave generator of lesson 1 gives a good rectangular wave, but its
capacitor voltage is made of curved exponential pieces. Many uses (sweeping an
oscilloscope beam, a PWM modulator, a voltage-to-time converter) need a ramp that is
truly **straight**. An op-amp integrator fed with a constant voltage makes exactly
that. This lesson shows why simply hanging an integrator after a square-wave
generator doesn't work, how closing the loop fixes it, what sets the triangle's
amplitude and period, and how the same circuit becomes a sawtooth generator. It ends
with the slides' exercise 讨论一.

## Why an open-loop integrator drifts

### The integrator with a constant input

Recall the inverting integrator: input resistor $R_4$ to the − input, capacitor $C$
from the − input to the output, + input to ground (through $R_5$, which only balances
bias currents). The − input is a virtual ground, so the input current
$u_{o1}/R_4$ all flows into $C$, and

$$u_o = -\frac{1}{R_4C}\int u_{o1}\,\d t.$$

If $u_{o1}$ is a constant $U_{o1}$ for a while, the current is constant, and a
capacitor charged by a constant current has a voltage that changes **linearly**.

::: formula Integrator ramp with a constant input | 积分电路输入恒定时的输出变化
$$\Delta u_o = -\frac{U_{o1}}{R_4C}\,\Delta t$$
--
\Delta u_o | change of the output during $\Delta t$ | V
U_{o1} | constant input voltage | V
R_4 | integrator input resistor | Ω
C | integrator capacitor | F
\Delta t | time the input stays constant | s
:::

So a square wave $\pm U_Z$ at the input gives ramps of slope $\mp U_Z/(R_4C)$: down
while the input is positive, up while it is negative. That is a triangle.

### What goes wrong

The first idea on the slides is to take the square-wave generator's output $u_{o1}$
and feed it to an integrator. On paper, each ramp down is cancelled by the next ramp
up. In practice:

- the two Zener levels are never exactly equal ($+U_{Z1}$ and $-U_{Z2}$), and the
  duty cycle is never exactly 50%;
- the op-amp has offset voltages and bias currents;
- nobody fixes where the triangle *starts*.

Any tiny imbalance adds the same small step to $u_o$ every period, so the triangle
**drifts** steadily up or down until the integrator saturates at its supply and the
waveform is clipped flat. Nothing in the circuit notices the drift, because the
square-wave generator runs on its own: the integrator is open loop.

The plot shows a square wave of period 2 ms with unequal levels, integrated with
$R_4C = 1$ ms, starting from $u_o = 2$ V. Make the levels equal and the drift stops;
make them differ by even half a volt and the triangle wanders off and is clipped at
±12 V (a simplified picture of saturation).

::: plot Open-loop integrator: unequal square-wave levels make the triangle drift
x: 0 .. 40
y: -14 .. 14
xlabel: t (ms)
ylabel: u (V)
uo1(t) = (UZ1 - UZ2)/2 + (UZ1 + UZ2)/2 sign(0.5 - (t/2 - floor(t/2)))
uo(t) = max(-12, min(12, 2 - (UZ1*2*min(t/2 - floor(t/2), 0.5) - UZ2*2*max(t/2 - floor(t/2) - 0.5, 0) + floor(t/2)*(UZ1 - UZ2))))
slider UZ1: 4 .. 8 = 6 | V
slider UZ2: 4 .. 8 = 5 | V
:::

::: callout key Close the loop
The cure is to let the **triangle itself** decide when the square wave switches:
feed the integrator's output back to the comparator. Then the triangle can only turn
round at fixed levels, and drift has nowhere to accumulate.
:::

## The closed-loop triangle-wave generator

### How it is built

::: define Triangle-wave generator | 三角波发生电路
A non-inverting hysteresis comparator (A1) and an inverting integrator (A2) in a
closed loop: the comparator's square wave $u_{o1}$ drives the integrator, and the
integrator's triangle $u_o$ is the comparator's input.
:::

- **A1, the comparator** (滞回比较器): its − input $u_N$ is grounded. Its + input
  $u_P$ sits between $R_2$ (to $u_{o1}$) and $R_1$ (to the triangle output $u_o$). Its
  output goes through $R_3$ to the Zeners, so $u_{o1} = \pm U_Z$.
- **A2, the integrator** (积分器): $u_{o1}$ through $R_4$ to the − input, $C$ from
  the − input to the output $u_o$, + input through $R_5$ to ground.

::: circuit Triangle-wave generator: hysteresis comparator A1 and integrator A2
U1 opamp 4,4 plus-top
W 4,5 4,6
G 4,6
W 4,3 2,3 2,1
R2 2,1 8,1 20k
W 8,1 12,1 12,4
R1 2,3 2,8 10k
W 2,8 2,12 22,12
R3 8,4 12,4 1k
Z1 12,6 12,4 UZ
Z2 12,6 12,8 UZ
G 12,8
label uo1 12,4
R4 12,4 16,4 10k
U2 opamp 16,5
W 16,4 16,2
C 16,2 20,2 0.1µF
W 20,2 20,5
R5 16,6 16,10 10k
G 16,10
W 20,5 22,5 22,12
label uo 22,5
:::

This comparator is **non-inverting**: its input $u_o$ reaches the + input through
$R_1$, and the − input is fixed at 0. So unlike lesson 1's comparator, its output
goes high when its input goes high.

### Where the comparator switches

$u_P$ is fed by two voltages through $R_1$ and $R_2$. By superposition (no current
flows into the op-amp):

$$u_P = \frac{R_2}{R_1+R_2}\,u_o + \frac{R_1}{R_1+R_2}\,u_{o1}.$$

A1 switches when $u_P$ crosses $u_N = 0$, that is when

$$R_2\,u_o + R_1\,u_{o1} = 0 \quad\Rightarrow\quad u_o = -\frac{R_1}{R_2}\,u_{o1} = \mp\frac{R_1}{R_2}\,U_Z.$$

### The working principle

Follow one cycle.

1. Say $u_{o1} = -U_Z$. The integrator's input is negative, so $u_o$ **rises**
   linearly. Meanwhile
   $u_P = -\dfrac{R_1}{R_1+R_2}U_Z + \dfrac{R_2}{R_1+R_2}u_o$ rises with it.
2. When $u_o$ reaches $+\dfrac{R_1}{R_2}U_Z$, $u_P$ reaches 0 and A1 flips:
   $u_{o1} = +U_Z$, and $u_P$ jumps positive (positive feedback), so the flip is clean.
3. Now the integrator's input is positive and $u_o$ **falls** linearly, dragging
   $u_P$ down, until $u_o = -\dfrac{R_1}{R_2}U_Z$, where $u_P$ returns to 0, A1
   flips back to $-U_Z$, and the cycle repeats.

::: callout note Reading slide 05-011
The slide shows the bubble "$+U_Z$" at $u_{o1}$ next to a formula for $u_P$ written with
$u_{o1} = -U_Z$. Both are right but at different moments: the formula describes the
rising ramp **before** the switch, the bubble the output **after** $u_P$ has reached 0.
:::

## Amplitude and period

The triangle turns round at $\pm\dfrac{R_1}{R_2}U_Z$, so that is its amplitude.

::: formula Amplitude of the triangle wave | 三角波的幅值
$$\pm U_{om} = \pm\frac{R_1}{R_2}\,U_Z$$
--
U_{om} | peak value of the triangle $u_o$ | V
R_1 | resistor from $u_P$ to the triangle output | Ω
R_2 | resistor from $u_P$ to the square-wave output $u_{o1}$ | Ω
U_Z | Zener voltage: $u_{o1} = \pm U_Z$ | V
:::

Each ramp covers $2U_{om}$ at the slope $U_Z/(R_4C)$, so each half period lasts
$2U_{om}R_4C/U_Z$ and

$$T = 4R_4C\,\frac{U_{om}}{U_Z} = \frac{4R_4R_1C}{R_2}.$$

::: formula Period of the triangle-wave generator | 三角波的周期
$$T = \frac{4R_4R_1C}{R_2}$$
--
T | period of both $u_o$ and $u_{o1}$ | s
R_4 | integrator input resistor | Ω
C | integrator capacitor | F
R_1, R_2 | comparator resistors as above | Ω
:::

What controls what:

- $R_4$ and $C$ change **only the frequency**: the clean way to tune it.
- $R_1/R_2$ changes **both** the amplitude and the period (the amplitude in
  proportion, and the period in the same proportion, since a bigger triangle takes
  longer to ramp).
- $U_Z$ changes the amplitude but **not** the period: the ramps get steeper exactly as
  much as they get longer.
- Keep $R_1 < R_2$ if the triangle should stay smaller than $U_Z$, and keep $U_{om}$
  below the integrator's saturation voltage.

Try the sliders (time in ms, resistors in kΩ, $C$ in µF, so $R_4C$ is in ms). The
triangle starts at its trough with $u_{o1} = -U_Z$, so it rises first.

::: plot Triangle-wave generator: square wave u_o1 and triangle u_o
x: 0 .. 8
xlabel: t (ms)
ylabel: u (V)
uo1(t) = -UZ sign(sin(2 pi t R2/(4*R4*R1*C)))
uo(t) = (R1/R2) UZ (4 abs(t R2/(4*R4*R1*C) - floor(t R2/(4*R4*R1*C) + 0.5)) - 1)
slider R1: 2 .. 20 = 10 | kΩ
slider R2: 10 .. 40 = 20 | kΩ
slider R4: 2 .. 20 = 10 | kΩ
slider C: 0.02 .. 0.3 = 0.1 | µF
slider UZ: 3 .. 10 = 6 | V
:::

::: example The slides' Multisim triangle generator
The simulation on slide 05-013 uses (in the textbook's names) $R_1 = 10$ kΩ,
$R_2 = 20$ kΩ, $R_3 = 1$ kΩ, $R_4 = 10$ kΩ, $C = 100$ nF, and the oscilloscope reads
the square wave at about $\pm 9.7$ V. Predict the triangle's amplitude, the ramp
slope and the period. (Multisim's own labels swap $R_1$ and $R_4$.)
== Amplitude ==
$U_{om} = \dfrac{R_1}{R_2}U_Z = \dfrac{10}{20}\times 9.7 \approx 4.85$ V, about one
5 V division on the screen, as the trace shows.
== Slope ==
$R_4C = 10\,\text{k}\Omega\times100\,\text{nF} = 1$ ms, so each ramp has slope
$U_Z/(R_4C) = 9.7$ V/ms.
== Period ==
$T = \dfrac{4R_4R_1C}{R_2} = \dfrac{4\times10\,\text{k}\times10\,\text{k}\times100\,\text{nF}}{20\,\text{k}} = 2$ ms, so
$f = 500$ Hz: two 1 ms divisions per period on the screen.
== Check ==
Half a period is $2U_{om}/\text{slope} = 9.7/9.7 = 1$ ms. ✓
:::

::: callout exam What is usually asked
Sketch $u_{o1}$ and $u_o$ lined up in time, with $\pm U_Z$ and $\pm\frac{R_1}{R_2}U_Z$
marked and each turning point of the triangle on an edge of the square wave; derive
$U_{om}$ and $T$; and say which component to change to alter the frequency without
changing the amplitude ($R_4$ or $C$).
:::

## From triangle to sawtooth

::: define Sawtooth wave | 锯齿波
A triangle wave whose two ramps have very different durations: a slow ramp one way
and a fast return the other. The square wave that drives it then has a duty cycle far
from 50%.
:::

A triangle's ramps last equally long because the integrator charges $C$ through the
same $R_4$ in both directions with the same $\pm U_Z$. Make the two directions
different and the triangle leans over. The slides show two ways.

### A diode and $R_6$ in parallel with $R_4$

Put VD2 in series with $R_6$, in parallel with $R_4$, anode towards $u_{o1}$.

- $u_{o1} = +U_Z$: VD2 conducts, the integrator sees $R_4 /\!/ R_6$, and $u_o$ falls
  fast: $T_1 = \dfrac{2R_1(R_4/\!/R_6)C}{R_2}$.
- $u_{o1} = -U_Z$: VD2 is off, only $R_4$, and $u_o$ rises slowly:
  $T_2 = \dfrac{2R_1R_4C}{R_2}$.

The comparator's switching levels are unchanged, so the amplitude is still
$\frac{R_1}{R_2}U_Z$. The result is a sawtooth: slow rise for $T_2$, steep fall for
$T_1$, and $u_{o1}$ becomes a rectangular wave that is high only for the short $T_1$.

::: plot Sawtooth from the triangle generator (R1 = 10 kΩ, R2 = 20 kΩ, C = 0.1 µF)
x: 0 .. 6
xlabel: t (ms)
ylabel: u (V)
uo1(t) = UZ sign((t - (0.1 R4 + 0.1 R4 R6/(R4 + R6)) floor(t/(0.1 R4 + 0.1 R4 R6/(R4 + R6)))) - 0.1 R4)
uo(t) = min(-UZ/2 + UZ (t - (0.1 R4 + 0.1 R4 R6/(R4 + R6)) floor(t/(0.1 R4 + 0.1 R4 R6/(R4 + R6))))/(0.1 R4), UZ/2 - UZ ((t - (0.1 R4 + 0.1 R4 R6/(R4 + R6)) floor(t/(0.1 R4 + 0.1 R4 R6/(R4 + R6)))) - 0.1 R4)/(0.1 R4 R6/(R4 + R6)))
slider R4: 2 .. 20 = 10 | kΩ
slider R6: 0.5 .. 50 = 2.5 | kΩ | log
slider UZ: 3 .. 10 = 6 | V
:::

Here $T_2 = 0.1R_4$ ms and $T_1 = 0.1(R_4/\!/R_6)$ ms with $R$ in kΩ. Make $R_6$
large and VD2 hardly matters: the triangle returns.

::: explore Sawtooth timing with VD2 and R6
slider R1: 2 .. 20 = 10 | kΩ
slider R2: 10 .. 40 = 20 | kΩ
slider R4: 2 .. 20 = 10 | kΩ
slider R6: 0.5 .. 50 = 2.5 | kΩ | log
slider C: 0.02 .. 1 = 0.1 | µF | log
slider UZ: 3 .. 10 = 6 | V
Uom = R1/R2*UZ | V | Amplitude
T1 = 2*R1*(R4*R6/(R4 + R6))*C/R2 | ms | Fall time T1 (u_o1 high)
T2 = 2*R1*R4*C/R2 | ms | Rise time T2 (u_o1 low)
T = T1 + T2 | ms | Period
f = 1000/T | Hz | Frequency
D = 100*T1/T | % | Duty cycle of u_o1
:::

::: example A sawtooth from the triangle generator
In the generator of the Multisim example ($R_1 = 10$ kΩ, $R_2 = 20$ kΩ, $R_4 = 10$ kΩ,
$C = 0.1$ µF), add VD2 and $R_6 = 2.5$ kΩ in parallel with $R_4$. Take VD2 as ideal.
Find $T_1$, $T_2$, $T$ and the duty cycle of $u_{o1}$.
== Parallel resistance ==
$R_4 /\!/ R_6 = \dfrac{10\times2.5}{12.5} = 2$ kΩ.
== Ramp times ==
$T_1 = \dfrac{2\times10\times2\times0.1}{20} = 0.2$ ms (fast fall);
$T_2 = \dfrac{2\times10\times10\times0.1}{20} = 1$ ms (slow rise).
== Period and duty ==
$T = 1.2$ ms ($f \approx 833$ Hz). $u_{o1}$ is high for $0.2/1.2 \approx 16.7\%$ of
each period. The amplitude is still $\frac{10}{20}U_Z$.
:::

### Moving the integrator's reference

The second way (slide 05-014's potentiometer $R_W$, simulated on 05-016) connects A2's
+ input not to ground but to an adjustable voltage $U_S$ between $+V_{CC}$ and
$-V_{CC}$. Now A2's − input sits at $U_S$, the current in $R_4$ is
$(u_{o1} - U_S)/R_4$, and the two slopes become

$$\text{fall: } \frac{U_Z - U_S}{R_4C}, \qquad \text{rise: } \frac{U_Z + U_S}{R_4C}.$$

A1 still switches at $u_o = \mp\frac{R_1}{R_2}U_Z$ (its own inputs haven't changed), so
the amplitude stays the same while the two ramps take different times:

$$T_1 = \frac{2U_{om}R_4C}{U_Z - U_S}, \qquad T_2 = \frac{2U_{om}R_4C}{U_Z + U_S}.$$

With $U_S > 0$ the fall is slow and $u_{o1}$ is high for a long time, which is what
the simulation on slide 05-016 shows.

::: example Duty cycle from an offset at the integrator
$U_Z = 6$ V, $R_1 = 10$ kΩ, $R_2 = 20$ kΩ, $R_4 = 10$ kΩ, $C = 0.1$ µF, and A2's + input
at $U_S = 2$ V. Find the two ramp times and the duty cycle of $u_{o1}$.
== Amplitude ==
$U_{om} = \frac{10}{20}\times6 = 3$ V; $R_4C = 1$ ms.
== Ramp times ==
$T_1 = \dfrac{2\times3\times1}{6-2} = 1.5$ ms; $T_2 = \dfrac{2\times3\times1}{6+2} = 0.75$ ms.
== Result ==
$T = 2.25$ ms (it was 2 ms with $U_S = 0$), duty cycle of $u_{o1}$
$= 1.5/2.25 \approx 66.7\%$.
:::

## Shifting the triangle up or down

The slides' last discussion (05-017, 05-018) asks what happens to $T$, $U_{om}$ and the
duty cycle if A1's − input is connected to an adjustable reference $U_{REF}$ (a
potentiometer from $+V_{CC}$ to ground) instead of ground.

A1 now switches when $u_P = U_{REF}$:

$$\frac{R_2u_o + R_1u_{o1}}{R_1+R_2} = U_{REF}
\;\Rightarrow\;
u_o = \frac{R_1+R_2}{R_2}U_{REF} \mp \frac{R_1}{R_2}U_Z.$$

So the two turning points move together by $\left(1 + \frac{R_1}{R_2}\right)U_{REF}$:

- $U_{om}$ (half the peak-to-peak) is **unchanged**;
- the slopes $\pm U_Z/(R_4C)$ are unchanged, so $T$ and the duty cycle are
  **unchanged**;
- only the triangle's **DC level** shifts.

::: example The slides' level-shift simulation
Slide 05-018 sets $U_{REF} = 6$ V (a potentiometer at 50% across 12 V), with
$R_1 = 10$ kΩ, $R_2 = 20$ kΩ, $U_Z \approx 9.7$ V. Where does the triangle turn?
== Centre ==
$\frac{R_1+R_2}{R_2}U_{REF} = \frac{30}{20}\times 6 = 9$ V.
== Turning points ==
$9 \mp \frac{10}{20}\times9.7 = 9 \mp 4.85$: about 4.15 V and 13.85 V. The cursors on
the slide read 4.27 V and 9.98 V at two points on the trace, consistent with a
triangle lying wholly above 0 V between roughly 4 V and 14 V. The period stays
2 ms. (The integrator must be able to swing to about 14 V, so it needs ±15 V
supplies.)
:::

## Exercise 讨论一: a sawtooth and rectangular-wave generator

The slides' exercise swaps the roles round: the integrator is A1 and the comparator A2.

::: circuit 讨论一: integrator A1 with steering diodes, non-inverting comparator A2
U1 opamp 6,8
W 6,9 6,10
G 6,10
W 6,7 6,5
C 6,5 10,5 0.02µF
W 10,5 10,8
W 6,5 6,3
D2 6,3 9,3
R2 9,3 13,3 R2
W 6,3 6,1
D1 9,1 6,1
R1 13,1 9,1 R1
W 13,1 13,3
W 13,1 24,1 24,9
label uO1 10,8
R3 10,8 14,8 10k
U2 opamp 14,9 plus-top
W 14,10 14,11
G 14,11
W 14,8 14,6
R4 14,6 20,6 R4
W 20,6 22,6 22,9
R5 18,9 22,9 500Ω
W 22,9 24,9
Z1 24,11 24,9 UZ
Z2 24,11 24,13 UZ
G 24,13
label uO2 24,9
:::

- **A1** is an integrator ($C = 0.02$ µF from its − input to $u_{O1}$, + input
  grounded) whose input resistor depends on the sign of $u_{O2}$: D1 (anode on the
  $u_{O2}$ side) conducts when $u_{O2} > 0$, so the input resistor is $R_1$; D2
  conducts when $u_{O2} < 0$, so it is $R_2$.
- **A2** is a non-inverting hysteresis comparator: $u_{O1}$ through $R_3 = 10$ kΩ to
  its + input, $R_4$ from the + input to $u_{O2}$, − input grounded, output through
  $R_5 = 500$ Ω to the Zeners, so $u_{O2} = \pm U_Z$.

Given: the peak-to-peak values of $u_{O1}$ and $u_{O2}$ are both 10 V, and the diodes
are ideal. (1) Find $U_Z$ and $R_4$. (2) Sketch $u_{O1}$ and $u_{O2}$. (3) Find the duty
cycle $q$.

::: example 讨论一 worked through
Use the circuit above.
== (1) U_Z ==
$u_{O2}$ swings between $+U_Z$ and $-U_Z$, so its peak-to-peak value is $2U_Z = 10$ V:
$U_Z = 5$ V.
== (1) R_4 ==
By superposition $u_{P2} = \dfrac{R_4u_{O1} + R_3u_{O2}}{R_3+R_4}$; A2 switches at
$u_{P2} = 0$, i.e. at $u_{O1} = -\dfrac{R_3}{R_4}u_{O2} = \mp\dfrac{R_3}{R_4}U_Z$. So
$u_{O1}$ swings between $\pm\dfrac{R_3}{R_4}\times5$ V, and its 10 V peak-to-peak
means $\dfrac{R_3}{R_4}\times5 = 5$: $R_4 = R_3 = 10$ kΩ.
== (2) The waveforms ==
$u_{O2}$ is a rectangular wave between +5 V and −5 V. $u_{O1}$ is a sawtooth between
+5 V and −5 V: it **falls** while $u_{O2} = +5$ V (through $R_1$) and **rises** while
$u_{O2} = -5$ V (through $R_2$). With $R_1 \ne R_2$ the two ramps take different
times, so $u_{O1}$ is a sawtooth and $u_{O2}$ has $q \ne 50\%$.
== (3) Time with u_O2 high (T_2 on the slide) ==
$u_{O1}$ goes from +5 V to −5 V with input $+U_Z$ through $R_1$:
$-5 = -\dfrac{1}{R_1C}(+5)T_2 + 5 \Rightarrow T_2 = 2R_1C$.
== (3) Time with u_O2 low (T_1) ==
From −5 V back to +5 V with input $-U_Z$ through $R_2$:
$+5 = -\dfrac{1}{R_2C}(-5)T_1 - 5 \Rightarrow T_1 = 2R_2C$.
== (3) Duty cycle ==
$q = \dfrac{T_2}{T_1+T_2} = \dfrac{R_1}{R_1+R_2}$, and $T = 2(R_1+R_2)C$.
:::

The slides give no values for $R_1$ and $R_2$. As a check, take $R_1 = 10$ kΩ and
$R_2 = 40$ kΩ: $T_2 = 2\times10\,\text{k}\times0.02\,\mu\text{F} = 0.4$ ms,
$T_1 = 1.6$ ms, $T = 2$ ms ($f = 500$ Hz) and $q = 10/50 = 20\%$.

::: callout pitfall Which interval is which
The slide calls the high interval of $u_{O2}$ "$T_2$" and the low one "$T_1$", and
says C "charges" during $T_2$. Don't trust the letters: in each interval, find which
diode conducts, so which resistor carries the current, then apply
$\Delta u = -\frac{U}{RC}\Delta t$ across the full swing.
:::

::: cards Triangle and sawtooth generators
Integrator ramp with a constant input :: $\Delta u_o = -\dfrac{U_{o1}}{R_4C}\Delta t$: a straight line.
Why does an integrator driven open loop by a square wave drift? :: Unequal levels, duty-cycle error or offsets add a net step every period; nothing corrects it, so it saturates.
Two parts of the triangle-wave generator :: A non-inverting hysteresis comparator (A1) and an inverting integrator (A2) in a closed loop.
Where does A1 switch in the triangle generator? :: When $u_P = 0$, i.e. at $u_o = \mp\dfrac{R_1}{R_2}U_Z$.
$u_P$ in the triangle generator :: $u_P = \dfrac{R_2}{R_1+R_2}u_o + \dfrac{R_1}{R_1+R_2}u_{o1}$
Triangle amplitude :: $U_{om} = \dfrac{R_1}{R_2}U_Z$
Triangle period :: $T = \dfrac{4R_4R_1C}{R_2}$
Changing which parts alters the triangle's frequency but not its amplitude? :: $R_4$ or $C$.
Does $U_Z$ affect the triangle's period? :: No: amplitude and slope both scale with $U_Z$.
Sawtooth wave (锯齿波) :: A triangle with very unequal rise and fall times; its driving rectangular wave has duty cycle far from 50%.
How to turn the triangle generator into a sawtooth generator :: Different integrator resistances for the two directions (VD2 + $R_6$ in parallel with $R_4$), or an offset $U_S$ at the integrator's + input.
Reference $U_{REF}$ on A1's − input does what? :: Shifts the triangle's level by $(1+R_1/R_2)U_{REF}$; $T$, $U_{om}$ and duty unchanged.
讨论一 results :: $U_Z = 5$ V, $R_4 = 10$ kΩ, $T_2 = 2R_1C$, $T_1 = 2R_2C$, $q = \dfrac{R_1}{R_1+R_2}$
:::

::: quiz Triangle and sawtooth generators
? A triangle generator has $R_1 = 10$ kΩ, $R_2 = 20$ kΩ and $U_Z = 6$ V. What is the triangle's peak value $U_{om}$?
answer: 3 V
> $U_{om} = \dfrac{R_1}{R_2}U_Z = \dfrac{10}{20}\times 6 = 3$ V.

? With also $R_4 = 10$ kΩ and $C = 0.1$ µF, what is its frequency?
answer: 500 Hz
> $T = \dfrac{4R_4R_1C}{R_2} = \dfrac{4\times10\text{k}\times10\text{k}\times0.1\mu}{20\text{k}} = 2$ ms, so $f = 500$ Hz.

? Write the period of the triangle-wave generator in terms of $R_1$, $R_2$, $R_4$ and $C$.
expression: 4*R4*R1*C/R2
variables: R1, R2, R4, C
> Each ramp spans $2U_{om} = 2\frac{R_1}{R_2}U_Z$ at slope $U_Z/(R_4C)$, taking $2R_1R_4C/R_2$; two ramps make $T = 4R_4R_1C/R_2$.

? You want to double the triangle's frequency without changing its amplitude. What do you do?
- [x] Halve $C$ (or $R_4$)
- [ ] Halve $R_1$
- [ ] Double $R_2$
- [ ] Double $U_Z$
> $R_4$ and $C$ appear only in $T$. Changing $R_1$ or $R_2$ also changes $U_{om} = \frac{R_1}{R_2}U_Z$, and $U_Z$ changes the amplitude but not $T$.

? Why does the triangle generator close the loop instead of integrating an independent square wave?
- [x] So that the triangle's own level decides when the square wave switches, which stops drift
- [ ] To double the frequency
- [ ] Because an integrator can't accept a square wave
- [ ] To make the ramps exponential
> Open loop, any imbalance adds up period after period until the integrator saturates. Closed loop, the triangle can only turn round at $\pm\frac{R_1}{R_2}U_Z$.

? In the triangle generator, A1's − input is moved from ground to $U_{REF} = 2$ V, with $R_1 = 10$ kΩ, $R_2 = 20$ kΩ. By how much does the triangle's centre move?
answer: 3 V
> Switching levels $u_o = \frac{R_1+R_2}{R_2}U_{REF} \mp \frac{R_1}{R_2}U_Z$: the centre moves by $\frac{30}{20}\times2 = 3$ V. The amplitude and period don't change.

? VD2 and $R_6 = 2.5$ kΩ are put in parallel with $R_4 = 10$ kΩ ($R_1 = 10$ kΩ, $R_2 = 20$ kΩ, $C = 0.1$ µF, ideal diode). What is the fast ramp's time $T_1$?
answer: 0.2 ms
> $R_4/\!/R_6 = 2$ kΩ; $T_1 = \dfrac{2R_1(R_4/\!/R_6)C}{R_2} = \dfrac{2\times10\times2\times0.1}{20} = 0.2$ ms.

? In 讨论一 ($u_{O1}$ and $u_{O2}$ both 10 V peak-to-peak, $R_3 = 10$ kΩ), what is $R_4$?
answer: 10 kΩ
> $U_Z = 5$ V from $u_{O2}$. A2 switches at $u_{O1} = \mp\frac{R_3}{R_4}U_Z$, and $u_{O1}$'s peak is 5 V, so $\frac{R_3}{R_4} = 1$: $R_4 = 10$ kΩ.

? In 讨论一, write the duty cycle $q$ of $u_{O2}$ in terms of $R_1$ and $R_2$.
expression: R1/(R1 + R2)
variables: R1, R2
> High for $T_2 = 2R_1C$ (through $R_1$), low for $T_1 = 2R_2C$; $q = \frac{T_2}{T_1+T_2} = \frac{R_1}{R_1+R_2}$.
:::

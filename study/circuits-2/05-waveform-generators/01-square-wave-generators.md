---
title: Comparators and square-wave generators
zh: 比较器与矩形波发生电路
summary: How an op-amp works as a comparator, why hysteresis matters, and how a hysteresis comparator plus an RC timer makes a square wave whose period and duty cycle you can set.
source: 第8章 信号发生电路 8.5 非正弦波发生电路 (1), 2026-09-17
---

## What this lesson is for

So far op-amps have been amplifiers: negative feedback keeps them in their linear
region, and the output follows the input smoothly. This chapter uses them the other
way round. With no negative feedback (or with *positive* feedback) an op-amp's output
slams to one supply side or the other, and that on/off behaviour is exactly what you
need to build a clock: a circuit that produces a square wave all by itself, with no
input at all. This lesson first explains the comparator, the building block the
slides take for granted, then builds the square-wave generator from it and works out
its period and duty cycle. Lessons 2 and 3 reuse every idea here.

## Sinusoidal and non-sinusoidal oscillators

A {{term signal generator circuit | 信号发生电路}} produces a periodic waveform from a DC
supply alone. Chapter 8 splits them into two families.

::: define Sinusoidal oscillator | 正弦波振荡电路
A circuit that produces a sine wave by itself, using an amplifier with positive
feedback through a frequency-selective network: RC oscillators (low frequencies), LC
oscillators (high frequencies) and quartz-crystal oscillators (very stable frequency).
:::

::: define Non-sinusoidal generator | 非正弦波发生电路
A circuit that produces a rectangular (square), triangle or sawtooth wave by itself.
It is built from a *switching* element (a comparator) and a *timing* element (an RC
network or an integrator): the timer runs until it reaches a threshold, the switch
flips, the timer runs back, and so on.
:::

The second family is often called a *relaxation oscillator*: something charges up,
"relaxes" when a limit is hit, and starts again. Think of a toilet cistern: it fills
slowly, a float trips the flush at a set level, it empties, and it starts filling
again. The fill level against time is a ramp; the flush valve is either open or
closed, which is a rectangular wave. Our circuits do the same thing with a capacitor
and a comparator.

| Family | Waveforms | Typical circuits |
| --- | --- | --- |
| Sinusoidal (正弦波振荡电路) | sine | RC, LC, quartz crystal |
| Non-sinusoidal (非正弦波振荡电路) | rectangular 矩形波, triangle 三角波, sawtooth 锯齿波 | comparator + RC, comparator + integrator |

## The comparator

### An op-amp without negative feedback

An ideal op-amp multiplies the difference between its inputs by a huge open-loop gain
$A_{od}$ (around $10^5$). With no negative feedback to pull that difference to zero,
even a millivolt between $u_P$ (the non-inverting, + input) and $u_N$ (the inverting,
− input) drives the output to its limit $\pm U_{OM}$, a little below the supply
voltages. So the output only says *which input is higher*:

$$u_O = +U_{OM} \text{ when } u_P > u_N, \qquad u_O = -U_{OM} \text{ when } u_P < u_N.$$

::: define Comparator | 电压比较器
A circuit that compares an input voltage $u_I$ with a reference and gives one of two
output levels depending on which is larger. The op-amp works in its non-linear
(saturated) region, so "virtual short" ($u_P = u_N$) does **not** hold, except at the
instant the output switches.
:::

::: define Threshold voltage | 阈值电压
The input voltage $U_T$ at which a comparator's output switches: the value of $u_I$
that makes $u_P = u_N$.
:::

::: define Voltage transfer characteristic | 电压传输特性
The graph of the output $u_O$ against the input $u_I$. For a comparator it is two
horizontal lines (the two output levels) joined by vertical jumps at the thresholds.
:::

::: callout pitfall Virtual short only at the switching point
In an amplifier you may always set $u_P = u_N$. In a comparator you may set
$u_P = u_N$ **only** to find the threshold (the input that makes the output switch).
At any other moment the inputs differ and the output sits at one of its limits.
:::

### Clamping the output with Zener diodes

$U_{OM}$ depends on the supply and the op-amp, so circuits fix the output levels with
a {{term bidirectional Zener diode | 双向稳压管}}: two Zeners back to back from the output
to ground. Whichever way the op-amp swings, one Zener breaks down (at $U_Z$) and the
other conducts forwards (a fraction of a volt, usually ignored or absorbed into
$U_Z$), so the output is held at $\pm U_Z$. The resistor $R_3$ between the op-amp and
the Zeners limits the current: it drops $U_{OM} - U_Z$.

### The single-threshold (zero-crossing) comparator

The simplest comparator puts the input on one pin and a fixed reference on the other.
With the reference at 0 V it is a {{term zero-crossing comparator | 过零比较器}}; with a
reference $U_{REF}$ it is a {{term single-threshold comparator | 单限比较器}} with
$U_T = U_{REF}$.

::: circuit Inverting zero-crossing comparator with a Zener clamp
A1 0,7 0,3 uI
W 0,3 4,3
U1 opamp 4,4
W 4,5 4,7
W 0,7 4,7
G 4,7
R3 8,4 12,4 1k
W 12,4 14,4
Z1 14,6 14,4 6V
Z2 14,6 14,8 6V
G 14,8
label uO 14,4
:::

Here $u_I$ goes to the − input and the + input is grounded, so $u_O = -U_Z$ when
$u_I > 0$ and $u_O = +U_Z$ when $u_I < 0$. A sine input becomes a square wave of the
same frequency. That is "sine → square", the first of the waveform conversions in
lesson 3.

::: example A zero-crossing comparator
The circuit above has $U_Z = 6$ V. Find $u_O$ for $u_I = 0.5$ V, then for
$u_I = -0.01$ V, and describe the output when $u_I = 2\sin\omega t$ V.
== Compare the inputs ==
$u_P = 0$. For $u_I = 0.5$ V, $u_N > u_P$, so the op-amp swings negative and the
Zeners hold $u_O = -6$ V.
== A tiny negative input ==
For $u_I = -0.01$ V, $u_N < u_P$: $u_O = +6$ V. The size of the input doesn't matter,
only its sign.
== A sine input ==
$u_O = -6$ V during each positive half-cycle and $+6$ V during each negative one: a
square wave of $\pm 6$ V at the sine's frequency, inverted.
:::

The trouble with one threshold is noise. If $u_I$ creeps slowly past 0 V with a few
millivolts of noise on it, it crosses zero many times in a row and the output
chatters up and down. The cure is to make the threshold move away as soon as the
output has switched: hysteresis.

## The hysteresis comparator

::: define Hysteresis comparator | 滞回比较器
A comparator with positive feedback from its output to its + input, so it has two
thresholds: which one applies depends on the present output level. Also called a
Schmitt trigger. The gap between the thresholds is the hysteresis width
$\Delta U = U_{T+} - U_{T-}$ (回差电压).
:::

Feed a fraction of the output back to the + input through $R_1$ and $R_2$. The input
$u_I$ goes to the − input. No current flows into the op-amp, so $R_1$ and $R_2$ form a
plain divider from $u_O$ to ground:

$$u_P = \frac{R_2}{R_1 + R_2}\,u_O = \pm \frac{R_2}{R_1 + R_2}\,U_Z.$$

::: circuit Inverting hysteresis comparator
A1 0,10 0,3 uI
W 0,3 4,3
U1 opamp 4,4
R3 8,4 12,4 1k
W 12,4 14,4
Z1 14,6 14,4 6V
Z2 14,6 14,8 6V
G 14,8
label uO 14,4
W 4,5 4,7
R1 4,7 10,7 20k
W 10,7 12,7 12,4
R2 4,7 4,10 10k
W 0,10 4,10
G 4,10
label uP 4,7
:::

The threshold is the $u_I$ that makes $u_N = u_P$, and $u_P$ itself depends on the
output, so there are two:

- While $u_O = +U_Z$, $u_P = +U_T$. The output stays high until $u_I$ rises past
  $+U_T$; then it drops to $-U_Z$.
- Now $u_P = -U_T$. The output stays low until $u_I$ falls below $-U_T$; then it
  jumps back to $+U_Z$.

::: formula Thresholds of the inverting hysteresis comparator | 滞回比较器的阈值电压
$$\pm U_T = \pm \frac{R_2}{R_1 + R_2}\,U_Z$$
--
U_T | threshold voltage (the slides call $+U_T$ $U_P'$ and $-U_T$ $U_P''$) | V
R_1 | feedback resistor, output to + input | Ω
R_2 | resistor from the + input to ground | Ω
U_Z | Zener voltage: the output is $\pm U_Z$ | V
:::

The transfer characteristic is a rectangle traced in one direction. Coming from the
left with $u_O = +U_Z$, you stay on the top line until $u_I = +U_T$, then drop. Coming
from the right on the bottom line, you stay there until $u_I = -U_T$, then rise.
Between $-U_T$ and $+U_T$ the output depends on where the input has been: the circuit
*remembers*. That memory is what the generators exploit.

| Input moving | Output before | Switches at | Output after |
| --- | --- | --- | --- |
| rising | $+U_Z$ | $u_I = +U_T$ | $-U_Z$ |
| falling | $-U_Z$ | $u_I = -U_T$ | $+U_Z$ |

The plot below drives the comparator with a sine wave of amplitude $A$ (one period per
unit of time). Set $U_T$ to 0 to see the zero-crossing comparator; raise it and the
output's edges move later, to where the sine crosses $+U_T$ on the way up and $-U_T$
on the way down. Noise smaller than $2U_T$ can no longer flip the output twice.

::: plot A sine wave through an inverting hysteresis comparator (U_Z = 6 V)
x: 0 .. 2
y: -8 .. 8
xlabel: t (periods)
ylabel: u (V)
uI(t) = A sin(2 pi t)
uO(t) = 6 sign((t - asin(UT/A)/(2 pi)) - floor(t - asin(UT/A)/(2 pi)) - 0.5)
UTpos(t) = UT
UTneg(t) = -UT
slider A: 2 .. 7 = 5 | V
slider UT: 0 .. 2 = 1.5 | V
:::

::: example Thresholds of a hysteresis comparator
In the circuit above $R_1 = 20$ kΩ, $R_2 = 10$ kΩ and $U_Z = 6$ V. Find the thresholds
and the hysteresis width. The output is $+6$ V and $u_I$ rises from 0 to 3 V, then
falls to −3 V: when does the output switch?
== Thresholds ==
$U_T = \dfrac{R_2}{R_1+R_2}U_Z = \dfrac{10}{30}\times 6 = 2$ V, so the thresholds are
$+2$ V and $-2$ V.
== Width ==
$\Delta U = 2 - (-2) = 4$ V.
== Following the input ==
Starting high, $u_P = +2$ V. The output drops to $-6$ V when $u_I$ passes $+2$ V.
Now $u_P = -2$ V: as $u_I$ falls back through $+2$ V, 0 and $-1$ V nothing happens;
the output only returns to $+6$ V when $u_I$ passes $-2$ V.
:::

::: callout key Positive feedback makes the memory
In a hysteresis comparator the feedback goes to the **+** input. When the output
starts to move, the + input moves the same way and pushes it further: the switch is
fast and decisive, and the threshold jumps away from the input, which is why the
comparator has two thresholds.
:::

## The rectangular-wave generator

### How the circuit is built

Now remove the input altogether and let the comparator watch a capacitor instead.

- A **hysteresis comparator** (op-amp A, $R_1$, $R_2$, $R_3$, the $\pm U_Z$ Zeners):
  its output $u_o$ is $+U_Z$ or $-U_Z$.
- An **RC feedback timing circuit** (RC反馈定时电路): $R$ from the output back to the −
  input, and $C$ from the − input to ground. The capacitor's voltage is the comparator's
  input: $u_C = u_N$.

::: circuit Rectangular-wave (square-wave) generator
R 4,2 10,2 10k
W 10,2 16,2 16,6
W 4,2 4,5 6,5
C 4,5 4,9 0.1µF
G 4,9
label uN 4,5
U1 opamp 6,6
R3 10,6 14,6 1k
W 14,6 16,6
Z1 16,8 16,6 6V
Z2 16,8 16,10 6V
G 16,10
label uo 16,6
W 6,7 6,9
R1 6,9 12,9 10k
W 12,9 14,9 14,6
R2 6,9 6,13 10k
G 6,13
label uP 6,9
:::

This is the same comparator as before; only its input has changed. The output
charges the capacitor through $R$, and the capacitor's voltage decides when the
output flips. Nothing outside drives it, so it oscillates on its own.

### The working principle: charging and discharging

Suppose the output is $+U_Z$, so $u_P = +U_T$, and the capacitor starts lower.

1. **Charging** (充电过程). Current flows from the output through $R$ into $C$, with
   time constant $\tau = RC$. $u_C = u_N$ rises exponentially towards $+U_Z$, but it
   never gets there: as soon as $u_C$ reaches $u_P = +U_T$, the comparator flips to
   $u_o = -U_Z$, and $u_P$ jumps to $-U_T$.
2. **Discharging** (放电过程). Now the output is below the capacitor, so current
   flows out of $C$ through $R$ into the output, again with $\tau = RC$. $u_C$ falls
   towards $-U_Z$, but when it reaches $u_P = -U_T$ the comparator flips back to
   $+U_Z$, $u_P$ becomes $+U_T$, and charging starts again.

So $u_C$ swings back and forth between $-U_T$ and $+U_T$, and the output is a
rectangular wave between $+U_Z$ and $-U_Z$.

::: callout note Typos on slides 05-003 and 05-004
The charging and discharging slides write the threshold as
$u_P = \pm\dfrac{R_2U_Z}{R_2+R_3}$. $R_3$ only limits the Zener current; it plays no
part in the divider. The correct threshold, as slide 05-005 has it, is
$\pm\dfrac{R_2U_Z}{R_1+R_2}$. Slide 05-004 also labels the falling capacitor voltage
"$u_C = u_P\downarrow$"; it means $u_C = u_N$ falling until it meets $u_P$.
:::

### The three-factor formula

Each half of the cycle is a first-order RC transient, so it follows the formula from
circuit analysis.

::: formula Three-factor formula for an RC transient | 一阶电路三要素法
$$u_C(t) = u_C(\infty) + \left[u_C(0^+) - u_C(\infty)\right]e^{-t/\tau}$$
--
u_C(0^+) | starting value of the capacitor voltage | V
u_C(\infty) | the value it heads towards (here the output level, $\pm U_Z$) | V
\tau | time constant, $RC$ here | s
:::

## Waveforms and the period

Take one charging half. It starts at $u_C(0^+) = -U_T$ and heads for
$u_C(\infty) = +U_Z$; it ends when $u_C = +U_T$. Put that in the three-factor formula
and solve for the time $T_1$:

$$U_T = U_Z + (-U_T - U_Z)\,e^{-T_1/RC}
\;\Rightarrow\;
T_1 = RC\ln\frac{U_Z + U_T}{U_Z - U_T}.$$

Substitute $U_T = \dfrac{R_2}{R_1+R_2}U_Z$: the $U_Z$ cancels and

$$\frac{U_Z + U_T}{U_Z - U_T} = \frac{(R_1 + R_2) + R_2}{(R_1 + R_2) - R_2} = 1 + \frac{2R_2}{R_1}.$$

The discharging half is the mirror image (from $+U_T$ towards $-U_Z$, ending at
$-U_T$), so it takes the same time. The period is twice $T_1$.

::: formula Period of the rectangular-wave generator | 矩形波的周期
$$T = 2RC\ln\left(1 + \frac{2R_2}{R_1}\right)$$
--
T | period of the output; $f = 1/T$ | s
R | timing resistor, output to − input | Ω
C | timing capacitor | F
R_1 | comparator feedback resistor, output to + input | Ω
R_2 | resistor from the + input to ground | Ω
:::

Notice what sets what:

- The **amplitude** of $u_o$ is $U_Z$, whatever $R$, $C$, $R_1$, $R_2$ are.
- The **frequency** is set by $RC$ (linearly) and by $R_2/R_1$ (through the
  logarithm). Changing $R$ or $C$ is the clean way to tune it.
- The capacitor's swing is $\pm U_T$: only an exponential *segment*, not the whole
  curve. A small $R_2/R_1$ keeps $u_C$ near the straight start of the exponential.

Move the sliders: the capacitor voltage (an exponential rising and falling between
the thresholds) and the output square wave. Time is in ms, with $R$ in kΩ and $C$ in
µF (so $RC$ comes out in ms). The plot starts with the capacitor at $-U_T$; switching
on from $u_C = 0$, as the slide draws it, makes only the very first half shorter.

::: plot Square-wave generator: capacitor voltage and output
x: 0 .. 10
xlabel: t (ms)
ylabel: u (V)
uC(t) = (1 - 2 (floor(t/(R*C*ln(1+2*R2/R1))) - 2 floor(t/(2*R*C*ln(1+2*R2/R1))))) * (UZ - (UZ + UZ*R2/(R1+R2)) * exp(-(t - R*C*ln(1+2*R2/R1)*floor(t/(R*C*ln(1+2*R2/R1))))/(R*C)))
uo(t) = UZ (1 - 2 (floor(t/(R*C*ln(1+2*R2/R1))) - 2 floor(t/(2*R*C*ln(1+2*R2/R1)))))
UT(t) = UZ*R2/(R1+R2)
slider R: 1 .. 20 = 10 | kΩ
slider C: 0.02 .. 0.5 = 0.1 | µF
slider R1: 5 .. 50 = 10 | kΩ
slider R2: 5 .. 50 = 10 | kΩ
slider UZ: 3 .. 9 = 6 | V
:::

::: example Period and frequency of a square-wave generator
$R = 10$ kΩ, $C = 0.1$ µF, $R_1 = R_2 = 10$ kΩ, $U_Z = 6$ V. Find the thresholds, the
period, the frequency and the output amplitude.
== Thresholds ==
$U_T = \dfrac{10}{10+10}\times 6 = 3$ V: $u_C$ swings between −3 V and +3 V.
== Period ==
$RC = 10\,\text{k}\Omega \times 0.1\,\mu\text{F} = 1$ ms.
$T = 2RC\ln(1 + 2R_2/R_1) = 2 \times 1 \times \ln 3 \approx 2.20$ ms.
== Frequency and amplitude ==
$f = 1/T \approx 455$ Hz. The output is a square wave of $\pm 6$ V.
== Check one half by the three-factor formula ==
From $-3$ V towards $+6$ V, reaching $+3$ V: $3 = 6 - 9e^{-t/1\,\text{ms}}$, so
$e^{-t/\text{ms}} = 1/3$ and $t = \ln 3 \approx 1.10$ ms, half of $T$.
:::

::: callout pitfall Which resistor is on top
The period has $2R_2/R_1$, where $R_2$ is the resistor from the + input **to
ground**, as in the threshold $R_2U_Z/(R_1+R_2)$. Textbooks label the two divider
resistors differently; always find the threshold from the circuit in front of you,
then use $T = 2RC\ln\dfrac{U_Z+U_T}{U_Z-U_T}$, which holds whatever the labels.
:::

## The duty cycle and how to change it

::: define Duty cycle | 占空比
The fraction of each period for which a rectangular wave is high:
$D = T_1/T \times 100\%$, where $T_1$ is the time at $+U_Z$. A square wave (方波) is a
rectangular wave (矩形波) with $D = 50\%$. Some books write the duty cycle $q$.
:::

::: formula Duty cycle | 占空比
$$D = \frac{T_1}{T}\times 100\%$$
--
D | duty cycle | %
T_1 | time per period at the high level | s
T | period | s
:::

In the basic generator, charging and discharging both go through the same $R$, so
$T_1 = T/2$ and $D = 50\%$. To change the duty cycle, the slides' idea is:
**give charging and discharging different paths** (改变充电和放电的回路), so they
have different time constants. The thresholds stay $\pm U_T$ and the output stays
$\pm U_Z$, so the amplitude $U_{om}$ doesn't change.

### A diode and $R_4$ in parallel with $R$

Connect a diode VD in series with $R_4$, in parallel with $R$, with its anode on the
output side.

- $u_o = +U_Z$: VD conducts, so C charges through $R$ and $R_4$ in parallel:
  $\tau_1 = (R /\!/ R_4)C$, shorter.
- $u_o = -U_Z$: VD is reverse-biased, so C discharges through $R$ alone:
  $\tau_2 = RC$.

Each half still lasts $\tau\ln(1 + 2R_2/R_1)$, with its own $\tau$, so the high time
shrinks and $D = \dfrac{R /\!/ R_4}{R /\!/ R_4 + R} < 50\%$. Turning the diode round
gives $D > 50\%$. The drawback: the period changes as well.

::: circuit Changing the duty cycle: VD and R4 in parallel with R
R 4,2 10,2 10k
W 4,2 4,0
R4 4,0 7,0 10k
D1 10,0 7,0 ideal
W 10,0 10,2
W 10,2 16,2 16,6
W 4,2 4,5 6,5
C 4,5 4,9 0.1µF
G 4,9
U1 opamp 6,6
R3 10,6 14,6 1k
W 14,6 16,6
Z1 16,8 16,6 6V
Z2 16,8 16,10 6V
G 16,10
label uo 16,6
W 6,7 6,9
R1 6,9 12,9 10k
W 12,9 14,9 14,6
R2 6,9 6,13 10k
G 6,13
:::

::: example Duty cycle with a diode and R4
In the generator of the earlier example ($R = 10$ kΩ, $C = 0.1$ µF, $R_1 = R_2$), add
VD in series with $R_4 = 10$ kΩ in parallel with $R$, anode to the output. Take the
diode as ideal. Find $T_1$, $T_2$, $T$ and $D$.
== Time constants ==
Charging (output high): $\tau_1 = (10 /\!/ 10)\,\text{k}\Omega \times 0.1\,\mu\text{F} = 5\,\text{k}\Omega\times0.1\,\mu\text{F} = 0.5$ ms.
Discharging (output low): $\tau_2 = RC = 1$ ms.
== Times ==
$\ln(1 + 2R_2/R_1) = \ln 3 \approx 1.099$.
$T_1 = 0.5 \times 1.099 \approx 0.549$ ms, $T_2 = 1 \times 1.099 \approx 1.099$ ms,
$T = T_1 + T_2 \approx 1.65$ ms.
== Duty cycle ==
$D = 0.549/1.648 \approx 33.3\%$. The period also fell, from 2.20 ms to 1.65 ms.
:::

### Two diodes and a potentiometer: duty changes, period doesn't

To change $D$ while keeping **both** $T$ and $U_{om}$ fixed, split the path into two
branches that share a potentiometer $R_W$. $R$ stays in series next to the capacitor;
above it, VD1 leads (anode on the output side) through the upper part of the pot,
$R_W'$, and VD2 leads (anode on the capacitor side) through the lower part, $R_W''$.
The wiper goes to the output.

- Output high: current flows from the output through $R_W'$, VD1 and $R$ into C:
  $\tau_1 = (R + r_{d1} + R_W')C$.
- Output low: current flows from C through $R$, VD2 and $R_W''$ to the output:
  $\tau_2 = (R + r_{d2} + R_W'')C$.

Here $r_{d1}$, $r_{d2}$ are the diodes' forward (on) resistances. Since
$R_W' + R_W'' = R_W$ whatever the wiper does, the sum $\tau_1 + \tau_2 =
(2R + r_{d1} + r_{d2} + R_W)C$ is fixed: moving the wiper moves time from one half to
the other but leaves $T$ alone.

::: formula Duty cycle with steering diodes and a potentiometer | 占空比可调的矩形波
$$D = \frac{\tau_1}{\tau_1 + \tau_2}\times 100\%, \quad \tau_1 = (R + r_{d1} + R_W')C, \quad \tau_2 = (R + r_{d2} + R_W'')C$$
--
\tau_1 | charging time constant (output high) | s
\tau_2 | discharging time constant (output low) | s
r_{d1}, r_{d2} | forward resistances of VD1, VD2 | Ω
R_W', R_W'' | the potentiometer's two parts, $R_W' + R_W'' = R_W$ | Ω
:::

The period is then $T = (\tau_1 + \tau_2)\ln(1 + 2R_2/R_1)$. Try it: the wiper slider
$a$ is the fraction of $R_W$ in the charging path ($R_W' = aR_W$). Watch $D$ change
while $T$ stays put. Diode resistances are ignored.

::: explore Adjustable duty cycle, fixed period
slider R: 1 .. 20 = 5 | kΩ
slider RW: 5 .. 100 = 20 | kΩ
slider a: 0 .. 1 = 0.25
slider C: 0.01 .. 1 = 0.1 | µF | log
slider R1: 5 .. 50 = 10 | kΩ
slider R2: 5 .. 50 = 10 | kΩ
k = ln(1 + 2*R2/R1) | | ln(1 + 2R2/R1)
tau1 = (R + a*RW)*C | ms | Charging time constant τ1
tau2 = (R + (1 - a)*RW)*C | ms | Discharging time constant τ2
T1 = tau1*k | ms | High time T1
T = (tau1 + tau2)*k | ms | Period T
f = 1000/T | Hz | Frequency
D = 100*tau1/(tau1 + tau2) | % | Duty cycle
:::

::: example Setting the duty cycle with the potentiometer
$R = 5$ kΩ, $R_W = 20$ kΩ with the wiper set so $R_W' = 5$ kΩ, $C = 0.1$ µF,
$R_1 = R_2$. Ignore $r_d$. Find $D$ and $T$. Then the wiper moves to $R_W' = 15$ kΩ.
== Time constants ==
$\tau_1 = (5 + 5)\,\text{k}\Omega \times 0.1\,\mu\text{F} = 1$ ms;
$\tau_2 = (5 + 15)\,\text{k}\Omega \times 0.1\,\mu\text{F} = 2$ ms.
== Duty cycle and period ==
$D = 1/(1+2) \approx 33.3\%$. $T = (1 + 2)\ln 3 \approx 3.30$ ms ($f \approx 303$ Hz).
== Moving the wiper ==
Now $\tau_1 = 2$ ms and $\tau_2 = 1$ ms: $D \approx 66.7\%$, and $T$ is still
$3 \ln 3 \approx 3.30$ ms.
:::

::: callout exam What exams ask about this circuit
Expect to: name the two parts (hysteresis comparator, RC timing network); state the
thresholds and sketch $u_C$ and $u_o$ against time, lined up, with the levels
$\pm U_T$ and $\pm U_Z$ marked; compute $T$ (or $f$); and explain how to change the
duty cycle, with or without keeping $T$ fixed. "Keeping $U_{om}$ fixed" means: don't
touch $U_Z$, $R_1$ or $R_2$; change only the charging and discharging paths.
:::

::: cards Comparators and square-wave generators
Comparator (电压比较器) :: An op-amp without negative feedback: its output is one of two levels depending on which input is higher.
Threshold voltage $U_T$ (阈值电压) :: The input voltage at which a comparator's output switches, found by setting $u_P = u_N$.
When may you use $u_P = u_N$ in a comparator? :: Only to find the threshold, the instant of switching; otherwise the inputs differ.
Why put two Zeners back to back at a comparator's output? :: To clamp the output to $\pm U_Z$, independent of the supply; $R_3$ limits their current.
Hysteresis comparator (滞回比较器) :: A comparator with positive feedback to its + input, giving two thresholds; it ignores noise smaller than the hysteresis width.
Thresholds of the inverting hysteresis comparator :: $\pm U_T = \pm\dfrac{R_2}{R_1+R_2}U_Z$ ($R_1$ output to +, $R_2$ + to ground)
Two parts of the rectangular-wave generator :: A hysteresis comparator and an RC feedback timing circuit ($R$ to the − input, $C$ to ground).
Between which levels does $u_C$ swing in the square-wave generator? :: Between the thresholds $-U_T$ and $+U_T$, along exponential segments.
Period of the rectangular-wave generator :: $T = 2RC\ln\left(1+\dfrac{2R_2}{R_1}\right)$
One half period from the three-factor formula :: $RC\ln\dfrac{U_Z+U_T}{U_Z-U_T}$
Duty cycle (占空比) :: $D = T_1/T \times 100\%$, the fraction of the period at the high level.
How to change the duty cycle without changing the amplitude :: Give charging and discharging different paths (a diode plus $R_4$ in parallel with $R$).
How to change the duty cycle and keep the period fixed :: Steering diodes VD1, VD2 and a potentiometer: $\tau_1 + \tau_2$ stays constant, $D = \tau_1/(\tau_1+\tau_2)$.
:::

::: quiz Comparators and square-wave generators
? An inverting zero-crossing comparator has $U_Z = 6$ V. What is $u_O$ when $u_I = 0.5$ V?
answer: -6 V
> $u_I$ is on the − input and $u_P = 0$: $u_N > u_P$, so the output goes to its negative limit, $-U_Z = -6$ V.

? An inverting hysteresis comparator has $R_1 = 20$ kΩ (output to +), $R_2 = 10$ kΩ (+ to ground) and $U_Z = 6$ V. What is its positive threshold $U_T$?
answer: 2 V
> $U_T = \dfrac{R_2}{R_1+R_2}U_Z = \dfrac{10}{30}\times 6 = 2$ V.

? That comparator's output is $-6$ V and $u_I = 1$ V. $u_I$ falls slowly to −1 V. What is the output now?
- [x] Still −6 V: it only switches back when $u_I$ falls below −2 V
- [ ] +6 V: it switched when $u_I$ crossed 0 V
- [ ] 0 V
> With the output low, $u_P = -U_T = -2$ V. The input must fall below −2 V before the output returns to +6 V; −1 V isn't enough.

? Write the period of the rectangular-wave generator in terms of $R$, $C$, $R_1$ and $R_2$.
expression: 2*R*C*ln(1 + 2*R2/R1)
variables: R, C, R1, R2
> Each half lasts $RC\ln\frac{U_Z+U_T}{U_Z-U_T} = RC\ln(1+2R_2/R_1)$, and there are two halves: $T = 2RC\ln(1+2R_2/R_1)$.

? A square-wave generator has $R = 20$ kΩ, $C = 0.05$ µF, $R_1 = 10$ kΩ and $R_2 = 20$ kΩ. What is its period?
answer: 3.22 ms
tolerance: 1%
> $RC = 20\,\text{k}\Omega\times0.05\,\mu\text{F} = 1$ ms; $T = 2\times1\times\ln(1 + 2\times20/10) = 2\ln 5 \approx 3.22$ ms.

? In a square-wave generator you double $C$. What happens?
- [x] The period doubles; the output amplitude stays $U_Z$
- [ ] The period doubles and the amplitude halves
- [ ] The thresholds double
- [ ] Nothing: $C$ only affects the waveform's shape
> $T = 2RC\ln(1+2R_2/R_1)$ is proportional to $C$. The output levels are set by the Zeners and the thresholds by $R_1$, $R_2$ and $U_Z$, none of which changed.

? A diode with $R_4 = R$ is put in parallel with the timing resistor $R$, conducting while the output is high. Taking the diode as ideal, what is the duty cycle?
answer: 33.3 %
tolerance: 1%
> Charging: $\tau_1 = (R/\!/R)C = RC/2$; discharging: $\tau_2 = RC$. Both halves carry the same factor $\ln(1+2R_2/R_1)$, so $D = \tau_1/(\tau_1+\tau_2) = 0.5/1.5 \approx 33.3\%$.

? In the two-diode, potentiometer version, moving the wiper changes:
- [x] The duty cycle only
- [ ] The period only
- [ ] Both the duty cycle and the period
- [ ] The output amplitude
> $\tau_1 + \tau_2 = (2R + r_{d1} + r_{d2} + R_W)C$ doesn't depend on the wiper, so $T$ is fixed; only the split between $\tau_1$ and $\tau_2$, the duty cycle, changes. The amplitude is $U_Z$.

? What is the Chinese name of the hysteresis comparator?
text: 滞回比较器 | 迟滞比较器 | 施密特触发器
> 滞回比较器 (also called 迟滞比较器, or a Schmitt trigger, 施密特触发器).
:::

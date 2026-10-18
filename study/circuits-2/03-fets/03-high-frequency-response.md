---
title: High-frequency response
zh: 场效应管的高频响应
summary: Why a FET amplifier's gain falls at high frequencies — the high-frequency model with its inter-electrode capacitances, Miller's theorem for C_gd, the simplified model, the common-source amplifier's gain, its upper cutoff frequency f_H and its Bode plot.
source: 第4章 场效应管及其基本放大电路 (4.3.5), 2026-09-15
---

The small-signal model of the last lesson has no capacitors in it, so it predicts the
same gain at every frequency. Real amplifiers don't behave like that: above some
frequency the gain falls away, and below some frequency it does too. This lesson is
about the top end. Tiny capacitances inside the FET, a few picofarads, start to short
out the signal at high frequencies, and one of them is multiplied many times over by
the amplifier's own gain (the Miller effect). You will learn to find the
{{term upper cutoff frequency | 上限截止频率}} $f_H$ of a common-source amplifier and to
draw its Bode plot, the two things exams ask about.

## Why the gain falls at high frequencies

A capacitor's impedance is $1/(\omega C)$: huge at low frequencies, small at high ones.
Every amplifier has two kinds of capacitor in it, and they matter at opposite ends of
the spectrum:

- **Coupling and bypass capacitors** ($C_1$, $C_2$, $C_s$: microfarads, in series with the
  signal). At mid and high frequencies they are short circuits, which is how we treated
  them so far. At *low* frequencies their impedance grows, they stop passing the signal,
  and the gain falls. They set the lower cutoff frequency.
- **Inter-electrode capacitances** inside the FET ($C_{gs}$, $C_{gd}$, $C_{ds}$:
  picofarads, across the signal). At low and mid frequencies they are open circuits, so
  the model could leave them out. At *high* frequencies their impedance becomes
  comparable with the circuit's resistances, they divert signal current away, and the
  gain falls. They set the upper cutoff frequency.

Between the two is the {{term mid-band | 中频段}}, where the gain is flat and equal to the
values worked out in the previous lesson.

## The high-frequency small-signal model

::: define High-frequency small-signal model | 高频小信号模型
The FET's low-frequency model (gate open, $g_m\dot U_{gs}$ and $r_{ds}$ from drain to
source) with its three inter-electrode capacitances added: $C_{gs}$ from gate to source,
$C_{gd}$ from gate to drain, and $C_{ds}$ from drain to source.
:::

::: circuit High-frequency small-signal model of a FET
label g 0,0
C1 0,0 0,4 Cgs
C2 0,0 4,0 Cgd
F1 4,0 4,4 gmUgs
R1 6,0 6,4 rds
C3 8,0 8,4 Cds
W 4,0 8,0
W 0,4 8,4
label d 8,0
label s 4,4
:::

$C_{gs}$ and $C_{gd}$ are generally within 10 pF, and $C_{ds}$ under 1 pF.

::: callout note Two sets of numbers on the slides
Slide 03-017 gives $C_{gs}$ and $C_{gd}$ as about 1–3 pF and $C_{ds}$ as 0.1–1 pF; slide
03-038 says $C_{gs}$, $C_{gd}$ are "within 10 pF" and $C_{ds}$ "under 1 pF". They don't
contradict each other: 1–3 pF is typical of small-signal discrete FETs, and 10 pF is an
upper bound that also covers larger devices. Either way, remember the order: $C_{gs}$ and
$C_{gd}$ a few pF, $C_{ds}$ smaller still.
:::

The awkward one is $C_{gd}$: it bridges the input (gate) and the output (drain). A
component across both ports couples them, and the circuit no longer splits into an
input loop and an output loop that can be solved separately. Miller's theorem removes
it.

## Miller's theorem for C_gd

Here is the intuition. In a common-source amplifier the drain voltage is the gate
voltage multiplied by a large negative number, say $-20$. Raise the gate by 1 mV and the
drain falls by 20 mV, so the voltage *across* $C_{gd}$ changes by 21 mV. To change it by
that much, the gate must supply 21 times the charge it would need if the drain held
still. Seen from the gate, $C_{gd}$ acts like a capacitor 21 times bigger.

To make this precise, call the gain from gate to drain $\dot K = \dot U_{ds}/\dot U_{gs}$.
The current through $C_{gd}$, flowing from gate to drain, is

$$\dot I_{gd} = (\dot U_{gs} - \dot U_{ds})\,j\omega C_{gd} = \dot U_{gs}(1 - \dot K)\,j\omega C_{gd}$$

A capacitor $(1-\dot K)C_{gd}$ from gate to ground would draw exactly this current from
the gate. Seen from the drain, the same current flowing the other way is

$$-\dot I_{gd} = (\dot U_{ds} - \dot U_{gs})\,j\omega C_{gd} = \dot U_{ds}\left(1 - \frac{1}{\dot K}\right)j\omega C_{gd}$$

which a capacitor $\frac{\dot K - 1}{\dot K}C_{gd}$ from drain to ground would draw. So we can
replace $C_{gd}$ by two capacitors, one on each side, as long as **the currents stay the
same**.

::: law Miller's theorem | 密勒定理
An impedance connected between two nodes whose voltages are related by
$\dot U_2 = \dot K\dot U_1$ can be replaced by two impedances to ground, one at each node,
that draw the same currents. For a capacitance $C$, that is $(1-\dot K)C$ at node 1 and
$\frac{\dot K-1}{\dot K}C$ at node 2.
:::

::: formula Miller capacitances of C_gd | 密勒等效电容
$$C_{gd}' = (1 - \dot K)C_{gd}, \qquad C_{gd}'' = \frac{\dot K - 1}{\dot K}C_{gd}, \qquad \dot K = -g_mR_L'$$
--
C_{gd}' | $C_{gd}$ referred to the input (gate–source) | F
C_{gd}'' | $C_{gd}$ referred to the output (drain–source) | F
\dot K | gain from gate to drain, $\dot U_{ds}/\dot U_{gs}$ | —
g_m | transconductance | S
R_L' | total AC load on the drain, $R_d \parallel R_L$ | Ω
:::

With $\dot K = -g_mR_L'$ (the mid-band gain, negative), the two become
$C_{gd}' = (1 + g_mR_L')C_{gd}$, large, and $C_{gd}'' = \left(1 + \frac{1}{g_mR_L'}\right)C_{gd} \approx C_{gd}$,
small. Adding them to the capacitances already there:

::: formula Total gate–source and drain–source capacitance | 等效极间电容
$$C_{gs}' = C_{gs} + C_{gd}', \qquad C_{ds}' = C_{ds} + C_{gd}''$$
--
C_{gs}' | total capacitance across the input | F
C_{ds}' | total capacitance across the output | F
:::

::: callout key The Miller effect
A capacitor bridging an inverting amplifier's input and output looks $(1 + |\dot K|)$
times bigger from the input. That is why a 2 pF $C_{gd}$, smaller than $C_{gs}$, ends up
dominating the input capacitance, and why more gain means a lower $f_H$.
:::

::: callout pitfall Which sign of K?
$\dot K$ is negative for the common-source stage, so $1 - \dot K = 1 + g_mR_L'$. Writing
$1 - g_mR_L'$ (forgetting the sign) gives a negative capacitance, a sure sign of the
mistake.
:::

## The unilateral and simplified models

After the Miller step the model is {{term unilateral | 单向化}}: nothing connects the
output back to the input. On the input side sit $C_{gs}$ and $C_{gd}'$ (together $C_{gs}'$);
on the output side $g_m\dot U_{gs}$, $r_{ds}$, $C_{ds}$ and $C_{gd}''$ (together $C_{ds}'$),
driving $R_L'$.

Two further approximations make it simple:

1. $r_{gs}$ (the gate's enormous input resistance) and $r_{ds}$ are far larger than the
   external resistors, so treat them as **open circuits**.
2. $C_{gs}' \gg C_{ds}'$ (the Miller term makes the input capacitance tens of pF; the
   output one stays around a pF), and the output side has a small resistance $R_L'$ while
   the input sees the larger source resistance; so **ignore $C_{ds}'$**.

::: define Simplified high-frequency model | 简化高频小信号模型
Gate to source: a single capacitor $C_{gs}' = C_{gs} + (1 + g_mR_L')C_{gd}$. Drain to
source: the controlled source $g_m\dot U_{gs}$ alone.
:::

## The common-source amplifier at high frequencies

Put the simplified model in place of the FET in the divider-bias common-source
amplifier of the previous lesson. The coupling and bypass capacitors are shorts at high
frequencies:

::: circuit High-frequency equivalent circuit of the common-source amplifier
A1 0,4 0,0 Us
R1 0,0 2,0 Rs
R2 4,0 4,4 Rg1
R3 6,0 6,4 Rg2
C1 8,0 8,4 C'gs
W 2,0 8,0
F1 10,0 10,4 gmUgs
R4 12,0 12,4 Rd
R5 14,0 14,4 RL
W 10,0 14,0
W 0,4 14,4
G 0,4
label g 8,0
label d 10,0
:::

The input side is now a plain RC circuit. Replace everything to the left of $C_{gs}'$ by
its Thévenin equivalent: an open-circuit voltage
$\dot U_s' = \dfrac{R_i}{R_i + R_s}\dot U_s$ (with $R_i = R_{g1} \parallel R_{g2}$) behind a
resistance $R = R_s \parallel R_{g1} \parallel R_{g2}$. Then $C_{gs}'$ and $R$ form a low-pass
divider:

$$\dot U_{gs} = \frac{\dot U_s'}{1 + j\omega RC_{gs}'}$$

and the output is $\dot U_o = -g_m\dot U_{gs}R_L'$, as before. Putting these together,
with $f_H = 1/(2\pi RC_{gs}')$:

::: formula High-frequency gain of the common-source amplifier | 共源放大电路的高频电压放大倍数
$$\dot A_{us} = \frac{\dot A_{usm}}{1 + j\dfrac{f}{f_H}}, \qquad \dot A_{usm} = -\frac{R_i}{R_i + R_s}\,g_mR_L'$$
--
\dot A_{us} | source voltage gain at frequency $f$ | —
\dot A_{usm} | mid-band source voltage gain | —
f_H | upper cutoff frequency | Hz
R_i | input resistance, $R_{g1} \parallel R_{g2}$ | Ω
:::

::: callout note The R_i/(R_i + R_s) factor on slide 03-041
The slide writes $\dot A_{usm} = -g_mR_L'$. That is the gain from the *gate* ($\dot A_{um}$),
not from the source: since $\dot A_{us}$ is measured from $\dot U_s$, the mid-band value must
include the input divider, $\dot A_{usm} = -\dfrac{R_i}{R_i + R_s}g_mR_L'$, as the slides'
own $\dot A_{us}$ formula on 03-029 does. The two are nearly equal when
$R_s \ll R_i$, which is common with FETs (large $R_i$), and that is probably why the slide
dropped it. Use the full form.
:::

## The upper cutoff frequency

::: formula Upper cutoff frequency of the common-source amplifier | 上限截止频率
$$f_H = \frac{1}{2\pi(R_s \parallel R_{g1} \parallel R_{g2})C_{gs}'}$$
--
f_H | upper cutoff frequency, where the gain is down 3 dB | Hz
R_s | signal source resistance | Ω
R_{g1}, R_{g2} | gate bias resistors | Ω
C_{gs}' | $C_{gs} + (1 + g_mR_L')C_{gd}$ | F
:::

$R C_{gs}'$ is the time constant of the input loop: the resistance $C_{gs}'$ "sees" with the
source switched off, times the capacitance. That is the general recipe: one capacitor,
one resistance seen from it, $f = 1/(2\pi\tau)$.

At $f = f_H$, $|\dot A_{us}| = |\dot A_{usm}|/\sqrt 2$: the gain is 3 dB down, and the phase has
moved by 45° from its mid-band value.

::: example f_H of a common-source amplifier
A MOSFET common-source amplifier has $g_m = 5$ mS, $R_L' = R_d \parallel R_L = 4$ kΩ,
$R_{g1} = 300$ kΩ, $R_{g2} = 150$ kΩ and $R_s = 10$ kΩ. The FET has $C_{gs} = 3$ pF,
$C_{gd} = 2$ pF, $C_{ds} = 0.5$ pF. Find the Miller capacitances, $f_H$ and the mid-band
gain $\dot A_{usm}$.
== Gate-to-drain gain ==
$\dot K = -g_mR_L' = -5 \times 4 = -20$.
== Miller capacitances ==
$C_{gd}' = (1 + 20) \times 2 = 42$ pF; $C_{gd}'' = \dfrac{-21}{-20} \times 2 = 2.1$ pF.
== Total capacitances ==
$C_{gs}' = 3 + 42 = 45$ pF; $C_{ds}' = 0.5 + 2.1 = 2.6$ pF. $C_{ds}'$ is about 17 times
smaller, so ignoring it is fair.
== Resistance seen by C'gs ==
$R_i = 300 \parallel 150 = 100$ kΩ; $R = 10 \parallel 100 = \dfrac{10 \times 100}{110} \approx 9.09$ kΩ.
== Cutoff frequency ==
$f_H = \dfrac{1}{2\pi \times 9.09 \times 10^3 \times 45 \times 10^{-12}} \approx 389$ kHz.
== Mid-band gain ==
$\dot A_{usm} = -\dfrac{100}{110} \times 20 \approx -18.2$, that is
$20\lg 18.2 \approx 25.2$ dB (the slide's form, $-g_mR_L' = -20$, would give 26.0 dB).
:::

::: callout tip Without the Miller effect
If $C_{gd}$ just added to $C_{gs}$ (5 pF in all), $f_H$ would be
$1/(2\pi \times 9.09\ \text{k}\Omega \times 5\ \text{pF}) \approx 3.5$ MHz, nine times higher.
The Miller multiplication of a 2 pF capacitance costs most of the bandwidth.
:::

Try it: raise $R_L'$ for more gain and watch $C_{gs}'$ grow and $f_H$ fall; lower $R_s$ and
the bandwidth opens up.

::: explore Miller effect and f_H
slider gm: 0.5 .. 20 = 5 | mS
slider RL: 0.5 .. 20 = 4 | kΩ
slider Cgs: 0.5 .. 10 = 3 | pF
slider Cgd: 0.1 .. 5 = 2 | pF
slider Rs: 0.1 .. 100 = 10 | kΩ | log
slider Ri: 10 .. 2000 = 100 | kΩ | log
CM = (1 + gm RL) Cgd | pF | Miller capacitance C′_gd
Cin = Cgs + CM | pF | C′_gs
R = Rs Ri / (Rs + Ri) | kΩ | Resistance seen by C′_gs
fH = 1e9 / (2 pi R Cin) | Hz | Upper cutoff f_H
A = gm RL Ri / (Ri + Rs) | | Mid-band gain magnitude |A_usm|
GBW = A fH | Hz | Gain × bandwidth
:::

## The Bode plot

A {{term Bode plot | 波特图}} draws the magnitude as $20\lg|\dot A_{us}|$ in decibels and the
phase in degrees, both against frequency on a logarithmic axis. From the gain formula:

$$20\lg|\dot A_{us}| = 20\lg|\dot A_{usm}| - 20\lg\sqrt{1 + (f/f_H)^2}, \qquad \varphi = -180^\circ - \arctan\frac{f}{f_H}$$

(the $-180°$ is the common-source stage's inversion). The usual straight-line
approximation:

- **Magnitude**: flat at $20\lg|\dot A_{usm}|$ up to $f_H$, then falling at
  **−20 dB per decade** (each tenfold rise in frequency divides the gain by 10). The real
  curve is 3 dB below the corner at $f = f_H$, and meets the asymptotes far from it.
- **Phase**: $-180°$ up to $0.1f_H$, then falling at **−45° per decade** through $-225°$ at
  $f_H$, to $-270°$ at $10f_H$, then flat. The straight lines are at most 5.7° off, at
  $0.1f_H$ (true value $-185.7°$) and $10f_H$ ($-264.3°$).

The magnitude line reaches 0 dB (gain 1) at about $|\dot A_{usm}|\,f_H$, the fourth marked
frequency on the slide's plot. (It is printed there as "$f_H$" again, which looks like a
typo: it is the unity-gain frequency, about 7 MHz in the example above.)

::: plot Magnitude response of the common-source amplifier (x is lg f, f in Hz)
x: 3 .. 9
y: -20 .. 40
xlabel: lg(f / Hz)
ylabel: 20 lg|A_us| (dB)
exact(x) = 20 lg(gm RL Ri/(Ri + Rs)) - 10 lg(1 + (10^x (2 pi (Rs Ri/(Rs + Ri)) (Cgs + (1 + gm RL) Cgd) / 1e9))^2)
asymptote(x) = 20 lg(gm RL Ri/(Ri + Rs)) - 20 max(0, x + lg(2 pi (Rs Ri/(Rs + Ri)) (Cgs + (1 + gm RL) Cgd) / 1e9))
slider gm: 0.5 .. 20 = 5 | mS
slider RL: 0.5 .. 20 = 4 | kΩ
slider Rs: 0.1 .. 100 = 10 | kΩ | log
slider Ri: 10 .. 2000 = 100 | kΩ | log
slider Cgs: 0.5 .. 10 = 3 | pF
slider Cgd: 0.1 .. 5 = 2 | pF
:::

(5.59 on the axis is about 389 kHz, the example's $f_H$; 6 is 1 MHz.)

::: plot Phase response of the common-source amplifier (x is lg f/f_H)
x: -3 .. 3
y: -280 .. -170
xlabel: lg(f / f_H)
ylabel: phase (°)
exact(x) = -180 - atan(10^x) 180/pi
asymptote(x) = -180 - 45 min(2, max(0, x + 1))
:::

::: example Reading the response at 1 MHz
For the amplifier in the example above ($\dot A_{usm} = -18.2$, $f_H = 389$ kHz), find the
gain and phase at 1 MHz.
== Ratio ==
$f/f_H = 1000/389 \approx 2.57$.
== Magnitude ==
$|\dot A_{us}| = \dfrac{18.2}{\sqrt{1 + 2.57^2}} = \dfrac{18.2}{2.76} \approx 6.59$, that is
$\approx 16.4$ dB, about 8.8 dB below mid-band.
== Phase ==
$\varphi = -180° - \arctan 2.57 \approx -180° - 68.7° = -248.7°$.
:::

## The low-frequency end

At low frequencies the inter-electrode capacitances are open and it is the coupling
capacitors (and the source bypass capacitor) that cut the gain. The slides only note the
method: find the time constant of the loop each capacitor is in, using the resistance it
sees, and $f_L = 1/(2\pi\tau)$. For the input coupling capacitor, for example,
$\tau = (R_s + R_i)C_1$. With $C_1 = 0.1$ µF and $R_s + R_i = 110$ kΩ,
$f_L = 1/(2\pi \times 110\ \text{k}\Omega \times 0.1\ \mu\text{F}) \approx 14.5$ Hz. Because
a FET amplifier's $R_i$ is large, small coupling capacitors are enough.

::: callout summary The whole frequency response
Low frequencies: coupling and bypass capacitors (series) cut the gain, giving $f_L$.
Mid-band: all capacitors ignored, gain $\dot A_{usm}$. High frequencies: the FET's
inter-electrode capacitances (shunt), led by the Miller-multiplied $C_{gd}$, cut it,
giving $f_H$. The bandwidth is $f_H - f_L \approx f_H$.
:::

::: callout exam For the exam
Expect to draw the high-frequency model, use Miller's theorem to find $C_{gd}'$ and
$C_{gs}'$, calculate $f_H = 1/[2\pi(R_s \parallel R_{g1} \parallel R_{g2})C_{gs}']$, and sketch
the Bode plot: flat, −3 dB at $f_H$, −20 dB/dec; phase −180° → −270°, −45°/dec, −225° at
$f_H$.
:::

::: cards High-frequency response
What cuts the gain at high frequencies? :: The FET's inter-electrode capacitances $C_{gs}$, $C_{gd}$, $C_{ds}$ (shunting the signal).
What cuts the gain at low frequencies? :: The coupling and bypass capacitors (in series with the signal).
Typical sizes of $C_{gs}$, $C_{gd}$, $C_{ds}$ :: $C_{gs}$, $C_{gd}$: a few pF (within 10 pF); $C_{ds}$: under 1 pF.
Miller's theorem for $C_{gd}$, input side :: $C_{gd}' = (1 - \dot K)C_{gd} = (1 + g_mR_L')C_{gd}$
Miller's theorem for $C_{gd}$, output side :: $C_{gd}'' = \dfrac{\dot K - 1}{\dot K}C_{gd} \approx C_{gd}$
Miller's theorem rests on … :: Keeping the current through the capacitor the same before and after splitting it.
$C_{gs}'$ = ? :: $C_{gs} + C_{gd}' = C_{gs} + (1 + g_mR_L')C_{gd}$
Simplified high-frequency model :: $C_{gs}'$ from gate to source; $g_m\dot U_{gs}$ from drain to source ($r_{ds}$, $C_{ds}'$ neglected).
$f_H$ of the CS amplifier :: $f_H = \dfrac{1}{2\pi(R_s \parallel R_{g1} \parallel R_{g2})C_{gs}'}$
High-frequency gain :: $\dot A_{us} = \dfrac{\dot A_{usm}}{1 + jf/f_H}$
Magnitude slope above $f_H$ :: −20 dB per decade.
Phase of a CS amplifier across $f_H$ :: −180° → −270°; −225° at $f_H$; −45°/decade from $0.1f_H$ to $10f_H$.
Gain at $f_H$ :: $|\dot A_{usm}|/\sqrt 2$, 3 dB below mid-band.
:::

::: quiz High-frequency response
? A CS stage has $g_m = 4$ mS, $R_L' = 5$ kΩ and $C_{gd} = 1$ pF. What is $C_{gd}'$?
answer: 21 pF
> $\dot K = -g_mR_L' = -20$; $C_{gd}' = (1 - \dot K)C_{gd} = 21 \times 1 = 21$ pF.

? With $C_{gs} = 4$ pF added, what is $C_{gs}'$ for that stage?
answer: 25 pF
> $C_{gs}' = C_{gs} + C_{gd}' = 4 + 21 = 25$ pF.

? The stage is driven from $R_s = 10$ kΩ, and $R_{g1} \parallel R_{g2}$ is very large. Taking $C_{gs}' = 25$ pF, what is $f_H$?
answer: 637 kHz
tolerance: 2%
> $R \approx R_s = 10$ kΩ, so $f_H = \dfrac{1}{2\pi \times 10^4 \times 25 \times 10^{-12}} \approx 637$ kHz.

? Write $C_{gd}'$ in terms of $g_m$ (write it as g), $R_L'$ (write it as R) and $C_{gd}$ (write it as C).
expression: (1 + g R) C
variables: g, R, C
> $\dot K = -g_mR_L'$, so $C_{gd}' = (1 - \dot K)C_{gd} = (1 + g_mR_L')C_{gd}$.

? A CS amplifier has $|\dot A_{usm}| = 20$ (26 dB) and $f_H = 500$ kHz. Using the straight-line approximation, what is the gain in dB at 5 MHz?
answer: 6 dB
tolerance: 0.1 dB
> 5 MHz is one decade above $f_H$, so the asymptote is 20 dB below mid-band: $26 - 20 = 6$ dB. (The exact value is $20\lg(20/\sqrt{101}) \approx 6.0$ dB too.)

? What is the phase of a common-source amplifier's gain at $f = f_H$?
answer: -225 °
tolerance: 0.5 °
> $\varphi = -180° - \arctan(1) = -180° - 45° = -225°$.

? Why can $C_{ds}'$ usually be neglected in the simplified model?
- [x] $C_{gs}'$, swollen by the Miller effect, is much larger than $C_{ds}'$
- [ ] $C_{ds}$ is in series with $r_{ds}$
- [ ] $C_{ds}$ is the largest of the three capacitances
> $C_{gs}' = C_{gs} + (1 + g_mR_L')C_{gd}$ is tens of pF, while $C_{ds}' = C_{ds} + C_{gd}''$ stays around a pF, so the input loop sets $f_H$.

? Increasing $R_L'$ in a CS amplifier (all else fixed) does what?
- [x] Raises the mid-band gain and lowers $f_H$
- [ ] Raises the mid-band gain and raises $f_H$
- [ ] Leaves $f_H$ unchanged
> Larger $R_L'$ means a larger $|\dot K|$, so a larger Miller capacitance $(1 + g_mR_L')C_{gd}$ and a lower $f_H$: gain is traded for bandwidth.

? What does the straight-line magnitude plot do above $f_H$?
- [ ] Falls at −45 dB per decade
- [x] Falls at −20 dB per decade
- [ ] Stays flat until $10f_H$
> One RC pole: above $f_H$ the gain is roughly proportional to $f_H/f$, so each decade divides it by 10, i.e. −20 dB/dec. (−45° per decade is the phase slope.)

? What do we call the theorem that splits a bridging capacitor into an input and an output capacitance?
text: Miller's theorem | Miller theorem | Miller | 密勒定理
> Miller's theorem (密勒定理): replace $C_{gd}$ by $(1-\dot K)C_{gd}$ at the input and $\frac{\dot K-1}{\dot K}C_{gd}$ at the output, keeping the currents equal.
:::

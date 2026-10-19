---
title: Band-pass, band-stop, all-pass and universal filters
zh: 带通、带阻、全通与状态变量滤波器
summary: Band-pass filters (cascaded and voltage-controlled, centre frequency, bandwidth BW = f₀/Q), twin-T and voltage-controlled band-stop (notch) filters, the first-order all-pass filter that turns frequency into phase, state-variable (universal) filters, and how filters differ from op-amp computing circuits.
source: 第9章 信号的处理与变换（9.2.4–9.2.7 带通、带阻、全通、状态变量型滤波器）, 2026-09-15
---

A radio receiver must pick one station out of hundreds: it needs a filter that passes
a *band* of frequencies and rejects everything on both sides. An audio system plagued
by 50 Hz mains hum needs the opposite: a filter that removes one narrow band and leaves
the rest alone. This lesson builds both from the low-pass and high-pass filters of
lessons 1 and 2, meets the strange all-pass filter that changes only the phase, and
ends with the state-variable filter, one circuit that gives every response at once.
The tools are the same as before (virtual short and open, $s = \j\omega$), and the
quality factor $Q$ from lesson 2 now becomes the key to the bandwidth.

## Band-pass filters

::: define Passband centre frequency | 通带中心频率
The frequency $f_0$ at the middle (on a log scale) of a band-pass filter's passband,
where its gain is largest.
:::

### Building one from a low-pass and a high-pass

The simplest idea: put a low-pass filter (cutoff $f_H$) and a high-pass filter (cutoff
$f_L$) **in series** (串联). The low-pass removes everything above $f_H$, the
high-pass removes everything below $f_L$, and what survives is the band between them.

$$\dot{U}_i \longrightarrow \boxed{\text{LPF}\ (f_H)} \longrightarrow \dot{U}_{o1} \longrightarrow \boxed{\text{HPF}\ (f_L)} \longrightarrow \dot{U}_{o2}$$

The passband is $f_L$ to $f_H$, so its width is $f_H - f_L$. This only works if
$f_H > f_L$: if the low-pass cuts off below where the high-pass starts, nothing gets
through at all.

::: example A cascaded band-pass filter
A speech channel uses a low-pass filter with $f_H = 3.4\ \text{kHz}$ followed by a
high-pass filter with $f_L = 300\ \text{Hz}$. What is the passband and its width?
== Condition ==
$f_H = 3400\ \text{Hz} > f_L = 300\ \text{Hz}$, so the cascade is a band-pass filter.
== Passband ==
$300\ \text{Hz}$ to $3.4\ \text{kHz}$; width $f_H - f_L = 3100\ \text{Hz}$.
:::

### The voltage-controlled band-pass filter

For a narrower, sharper band, practical circuits use a single op-amp: the
**second-order voltage-controlled band-pass filter** (二阶压控型带通滤波电路). Look at
its RC network in two halves: $R$ in series then $C$ to ground is a **low-pass**
section; $C$ in series then $2R$ to ground is a **high-pass** section. A resistor $R$
from node N back to the output adds positive feedback, as in lesson 2.

::: circuit Voltage-controlled second-order band-pass filter (二阶压控型带通滤波电路)
A1 0,6 0,2 ui
Ra 0,2 4,2 10k
Ca 4,2 4,6 10n
Cb 4,2 8,2 10n
W 8,2 12,2
Rc 8,2 8,6 20k
Rb 4,2 4,0 10k
W 4,0 18,0 18,3
W 0,6 8,6
G 0,6
U1 opamp 12,3 plus-top
W 16,3 20,3
W 12,4 12,7
Rf 12,7 18,7 16k
W 18,7 18,3
R1 12,7 12,10 10k
G 12,10
label N 4,2
label uo 20,3
:::

Here $R_a = R_b = R$, $C_a = C_b = C$ and $R_c = 2R$. The amplifier's own gain is
called $A_{uf}$ in this circuit, because $A_{up}$ is kept for the gain at the centre
of the passband:

$$A_{uf} = 1 + \frac{R_f}{R_1}$$

Writing node equations at N and at the $+$ input, as in lesson 2, gives:

::: formula Voltage-controlled band-pass filter | 压控型带通滤波器
$$A_u(s) = \frac{sCR}{1 + (3 - A_{uf})sCR + (sCR)^2}\,A_{uf},\qquad \frac{\dot{A}_u}{A_{up}} = \frac{1}{1 + \j Q\left(\dfrac{f}{f_0} - \dfrac{f_0}{f}\right)}$$
--
A_{uf} | gain of the non-inverting amplifier, $1 + R_f/R_1$; must be below 3 |
f_0 | passband centre frequency (通带中心频率), $\frac{1}{2\pi RC}$ | Hz
A_{up} | passband gain: the gain at $f_0$ |
Q | quality factor |
:::

The highest power of $s$ is 2 (second order), and the single $s$ in the numerator
means the gain is zero at DC and at infinite frequency: a band-pass shape.

To get the second form, put $s = \j\omega$ and divide top and bottom by
$\j(3 - A_{uf})\omega RC$; with $f_0 = \frac{1}{2\pi RC}$ this gives

$$\dot{A}_u = \frac{A_{uf}}{3 - A_{uf}}\cdot\frac{1}{1 + \j\dfrac{1}{3 - A_{uf}}\left(\dfrac{f}{f_0} - \dfrac{f_0}{f}\right)}$$

At $f = f_0$ the bracket $\left(\frac{f}{f_0} - \frac{f_0}{f}\right)$ is zero, so the
gain is real and largest there. Reading off:

::: formula Gain and Q of the voltage-controlled band-pass filter | 压控型带通滤波器的通带增益与品质因数
$$A_{up} = \frac{A_{uf}}{3 - A_{uf}} = QA_{uf},\qquad Q = \frac{1}{3 - A_{uf}}$$
--
A_{up} | passband gain, at the centre frequency $f_0$ |
A_{uf} | the amplifier's gain, $1 + R_f/R_1$ |
Q | quality factor |
:::

### Cutoff frequencies and bandwidth

The two cutoffs are where $|\dot{A}_u| = A_{up}/\sqrt{2}$, that is where the imaginary
part of the denominator is $\pm 1$:

$$\left|\frac{1}{3 - A_{uf}}\left(\frac{f_p}{f_0} - \frac{f_0}{f_p}\right)\right| = 1$$

Write $x = f_p/f_0$: $x - 1/x = \pm(3 - A_{uf})$, a quadratic $x^2 \mp (3 - A_{uf})x - 1 = 0$.
Taking the positive roots:

::: formula Cutoff frequencies of the band-pass filter | 带通滤波器的通带截止频率
$$f_L = \frac{f_0}{2}\left[\sqrt{(3 - A_{uf})^2 + 4} - (3 - A_{uf})\right],\qquad f_H = \frac{f_0}{2}\left[\sqrt{(3 - A_{uf})^2 + 4} + (3 - A_{uf})\right]$$
--
f_L | lower cutoff frequency (下限截止频率) | Hz
f_H | upper cutoff frequency (上限截止频率) | Hz
:::

::: callout note A slide error
Slide 04-025 writes the last term of each bracket as $(3 - A_{up})$. It should be
$(3 - A_{uf})$, the same as under the square root: in this circuit $A_{up}$ is the gain
at the centre, $QA_{uf}$, and it does not appear in the cutoffs. The formulas above are
the corrected ones.
:::

Subtracting, the square roots cancel:

::: formula Bandwidth of a band-pass filter | 带通滤波器的通频带
$$BW = f_H - f_L = (3 - A_{uf})f_0 = \frac{f_0}{Q}$$
--
BW | bandwidth, the width of the passband (通频带) | Hz
f_0 | centre frequency | Hz
Q | quality factor |
:::

Note also $f_Lf_H = f_0^2$: the centre frequency is the geometric mean of the cutoffs,
so the passband is symmetric on a log scale.

::: callout key Higher Q, narrower band
For a band-pass filter, $Q = f_0/BW$. The higher $Q$, the narrower the passband and
the better the filter picks out one frequency (its {{term selectivity | 选频特性}}).
By convention $Q < 10$ is a **wide-band** BPF (宽带) and $Q > 10$ a **narrow-band** BPF
(窄带).
:::

::: plot Band-pass filter: 20 lg|A/Aup| against lg(f/f₀)
x: -1.5 .. 1.5
y: -40 .. 3
xlabel: lg(f/f₀)
ylabel: 20 lg|A/Aup| (dB)
BPF(x) = -10 lg(1 + Q^2 (10^x - 10^(-x))^2)
slider Q: 0.5 .. 30 = 2.5 | | log
:::

::: example Analysing a voltage-controlled band-pass filter
In the circuit above, $R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$, $R_1 = 10\ \text{kΩ}$,
$R_f = 16\ \text{kΩ}$. Find $f_0$, $A_{uf}$, $Q$, $A_{up}$, $f_L$, $f_H$ and $BW$.
== Centre frequency ==
$f_0 = \dfrac{1}{2\pi \times 10^4 \times 10^{-8}} = 1591\ \text{Hz}$.
== Amplifier gain and Q ==
$A_{uf} = 1 + 16/10 = 2.6 < 3$ (stable). $Q = \dfrac{1}{3 - 2.6} = 2.5$: a wide-band
filter.
== Passband gain ==
$A_{up} = QA_{uf} = 2.5 \times 2.6 = 6.5$ (16.3 dB).
== Cutoffs ==
$3 - A_{uf} = 0.4$; $\sqrt{0.4^2 + 4} = 2.040$.
$f_L = \dfrac{1591}{2}(2.040 - 0.4) = 1305\ \text{Hz}$,
$f_H = \dfrac{1591}{2}(2.040 + 0.4) = 1941\ \text{Hz}$.
== Bandwidth ==
$BW = 1941 - 1305 = 637\ \text{Hz}$, which matches $f_0/Q = 1591/2.5 = 637\ \text{Hz}$.
:::

::: explore Voltage-controlled band-pass filter
slider R: 1k .. 100k = 10k | Ω | log
slider C: 1n .. 1u = 10n | F | log
slider R1: 1k .. 100k = 10k | Ω | log
slider Rf: 0 .. 19.9k = 16k | Ω
f0 = 1 / (2 pi R C) | Hz | Centre frequency
Auf = 1 + Rf / R1 | | Amplifier gain
Q = 1 / (3 - Auf) | | Quality factor
Aup = Q Auf | | Gain at f₀
BW = f0 / Q | Hz | Bandwidth
fL = f0 * (sqrt((3 - Auf)^2 + 4) - (3 - Auf)) / 2 | Hz | Lower cutoff
fH = f0 * (sqrt((3 - Auf)^2 + 4) + (3 - Auf)) / 2 | Hz | Upper cutoff
:::

::: callout pitfall Two gains, two names
In the band-pass filter $A_{uf} = 1 + R_f/R_1$ is the amplifier's gain and sets $Q$;
$A_{up} = QA_{uf}$ is the filter's gain at $f_0$. Using one for the other is the slip
the slides themselves make. As $A_{uf} \to 3$ both $Q$ and $A_{up}$ grow without limit
and the circuit oscillates.
:::

## Band-stop (notch) filters

::: define Notch filter | 陷波滤波器
Another name for a band-elimination filter: it attenuates or suppresses signals in a
particular frequency range and lets those outside it pass. A narrow one "cuts a notch"
in the response.
:::

### Building one from a low-pass and a high-pass

The band-pass filter put a low-pass and high-pass in **series**; the band-stop filter
puts them in **parallel** (并联) and adds the outputs in a summing circuit (求和电路).
The low-pass branch (cutoff $f_{p1}$) carries the low frequencies, the high-pass branch
(cutoff $f_{p2}$) carries the high ones, and if $f_{p1} < f_{p2}$ neither branch carries
the band between them: that band is the stopband, $f_{p1}$ to $f_{p2}$.

$$\dot{U}_i \rightarrow \begin{cases}\boxed{\text{LPF}\ (f_{p1})} \rightarrow \dot{U}_{o1}\\[2pt] \boxed{\text{HPF}\ (f_{p2})} \rightarrow \dot{U}_{o2}\end{cases} \rightarrow \boxed{\text{summer}} \rightarrow \dot{U}_o$$

::: callout pitfall Series for band-pass, parallel for band-stop
Band-pass: LPF and HPF in series, with $f_H > f_L$ (the bands overlap). Band-stop: LPF
and HPF in parallel and summed, with $f_{p1} < f_{p2}$ (a gap between them).
:::

### The twin-T network

In practice the parallel low-pass and high-pass are passive RC "T" networks, side by
side: the {{term twin-T network | 双T网络}}. Follow it with a non-inverting amplifier and
you have an active band-stop filter:

**passive twin-T band-stop network + non-inverting amplifier = active band-stop filter**
(无源带阻滤波电路 + 同相比例运算电路 = 有源带阻滤波电路).

Adding positive feedback, by returning the bottom of the $R/2$ resistor to the output
instead of ground, gives the **voltage-controlled band-stop filter**:

::: circuit Voltage-controlled band-stop filter with a twin-T network (R = 10 kΩ, C = 10 nF: R3 = R/2, C3 = 2C)
A1 0,10 0,3 ui
W 0,3 2,3 2,6
Ca 2,3 6,3 10n
Cb 6,3 10,3 10n
W 10,3 10,6
Ra 2,6 6,6 10k
Rb 6,6 10,6 10k
W 10,6 14,6
R3 6,3 6,0 5k
W 6,0 20,0 20,7
C3 6,6 6,10 20n
W 0,10 6,10
G 0,10
U1 opamp 14,7 plus-top
W 18,7 22,7
W 14,8 14,10
Rf 14,10 20,10 5k
W 20,10 20,7
R1 14,10 14,13 10k
G 14,13
label uo 22,7
:::

For the passive version (the slides' 双T带阻滤波电路) the bottom of $R_3 = R/2$ goes to
ground instead of the output.

How the twin-T works, in the slides' words made simple:

- **High frequencies**: the capacitors' reactance is small, almost a short. The signal
  takes the **upper T** (two capacitors and $R/2$) straight through.
- **Low frequencies**: the capacitors are almost open. The signal takes the **lower T**
  (two resistors and $2C$).
- **In between**, near $f_0 = \frac{1}{2\pi RC}$: the two paths deliver equal signals
  with opposite phase, which cancel at the $+$ input. Nothing gets through.

::: formula Voltage-controlled band-stop filter | 压控型带阻滤波器
$$A_u(s) = A_{up}\frac{1 + (sCR)^2}{1 + 2(2 - A_{up})sRC + (sCR)^2},\qquad \dot{A}_u = \frac{A_{up}}{1 + \j 2(2 - A_{up})\dfrac{ff_0}{f_0^2 - f^2}}$$
--
A_{up} | passband gain, $1 + R_f/R_1$ |
f_0 | centre frequency of the stopband, $\frac{1}{2\pi RC}$ | Hz
:::

The numerator $1 + (sCR)^2$ becomes $1 - (f/f_0)^2$, which is zero at $f = f_0$: the
gain there is exactly zero, a perfect notch (in theory; real parts give a deep but
finite one).

### Cutoffs, stopband width and Q

The cutoffs are where the imaginary part of the denominator is $\pm 1$:
$2(2 - A_{up})\dfrac{ff_0}{f_0^2 - f^2} = \pm 1$, a quadratic in $f/f_0$:

::: formula Cutoff frequencies of the band-stop filter | 带阻滤波器的通带截止频率
$$\begin{gathered}f_{p1} = \left[\sqrt{(2 - A_{up})^2 + 1} - (2 - A_{up})\right]f_0,\\f_{p2} = \left[\sqrt{(2 - A_{up})^2 + 1} + (2 - A_{up})\right]f_0\end{gathered}$$
--
f_{p1} | lower edge of the stopband (passband cutoff) | Hz
f_{p2} | upper edge of the stopband | Hz
:::

::: formula Stopband width and Q of the band-stop filter | 带阻滤波器的阻带宽度与品质因数
$$BW = f_{p2} - f_{p1} = 2(2 - A_{up})f_0 = \frac{f_0}{Q},\qquad Q = \frac{1}{2(2 - A_{up})}$$
--
BW | stopband width (阻带宽度) | Hz
Q | quality factor |
:::

So, as for the band-pass filter, **higher Q means a narrower stopband**. Here the
critical gain is 2, not 3: at $A_{up} = 2$ the denominator's middle term vanishes, and
the circuit oscillates, so the voltage-controlled band-stop filter needs
$A_{up} < 2$.

::: plot Band-stop filter: 20 lg|A/Aup| against lg(f/f₀)
x: -1 .. 1
y: -40 .. 3
xlabel: lg(f/f₀)
ylabel: 20 lg|A/Aup| (dB)
BEF(x) = 20 lg(abs(1 - 10^(2*x)) + 0.000001) - 10 lg((1 - 10^(2*x))^2 + 10^(2*x) / Q^2)
slider Q: 0.25 .. 10 = 1 | | log
:::

::: example A band-stop filter with Q = 1
In the voltage-controlled band-stop circuit, $R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$,
$R_1 = 10\ \text{kΩ}$, $R_f = 5\ \text{kΩ}$. Find $f_0$, $Q$, the stopband edges and
its width.
== Gain and centre ==
$A_{up} = 1 + 5/10 = 1.5 < 2$ (stable). $f_0 = 1591\ \text{Hz}$.
== Q ==
$2 - A_{up} = 0.5$, so $Q = \dfrac{1}{2 \times 0.5} = 1$.
== Edges ==
$\sqrt{0.5^2 + 1} = 1.118$. $f_{p1} = (1.118 - 0.5) \times 1591 = 984\ \text{Hz}$,
$f_{p2} = (1.118 + 0.5) \times 1591 = 2575\ \text{Hz}$.
== Width ==
$BW = 2575 - 984 = 1591\ \text{Hz} = f_0/Q$.
:::

::: example A 50 Hz hum filter
Choose R for a twin-T notch at the 50 Hz mains frequency with $C = 0.1\ \text{μF}$.
== Resistor ==
$R = \dfrac{1}{2\pi f_0 C} = \dfrac{1}{2\pi \times 50 \times 10^{-7}} = 31.8\ \text{kΩ}$.
== The other parts ==
$R/2 = 15.9\ \text{kΩ}$ and $2C = 0.2\ \text{μF}$. For a narrow notch that leaves 40 Hz
and 60 Hz alone, choose $A_{up}$ close to (but below) 2, giving a high $Q$.
:::

## All-pass filters

An {{term all-pass filter | 全通滤波器}} has no stopband: from zero to infinite
frequency every signal passes with the same size. What changes with frequency is the
**phase**. So an all-pass filter is also called a {{term delay filter | 延时滤波器}} or
{{term phase shifter | 移相器}}.

::: circuit First-order all-pass filter (a): C to the + input
A1 0,9 0,3 ui
W 0,3 2,3
Ra 2,3 6,3 10k
W 6,3 10,3
W 6,3 6,1
Rf 6,1 14,1 10k
W 14,1 14,4
W 2,3 2,5
C1 2,5 6,5 10n
W 6,5 10,5
Rb 8,5 8,9 10k
G 8,9
G 0,9
U1 opamp 10,4
W 14,4 16,4
label uo 16,4
:::

All three resistors are equal ($R$). Solve it by superposition:

- Through the $+$ input: the $C$–$R$ divider gives $U_+ = U_i\dfrac{sRC}{1 + sRC}$, and
  the circuit is a non-inverting amplifier with gain $1 + R/R = 2$.
- Through the $-$ input: an inverting amplifier with gain $-R/R = -1$.

$$U_o = 2\,\frac{sRC}{1 + sRC}U_i - U_i = \frac{sRC - 1}{1 + sRC}U_i$$

::: formula First-order all-pass filter | 一阶全通滤波器
$$A_u(s) = -\frac{1 - sCR}{1 + sCR},\qquad \left|\dot{A}_u\right| = 1,\qquad \varphi = 180^\circ - 2\arctan\frac{f}{f_0},\quad f_0 = \frac{1}{2\pi RC}$$
--
\varphi | phase of the output relative to the input | °
f_0 | the frequency where the phase shift is 90° | Hz
:::

With $s = \j\omega$, the numerator $1 - \j\omega RC$ and denominator
$1 + \j\omega RC$ have the same size, so $|\dot{A}_u| = 1$ at every frequency. The
phase: the minus sign gives 180°, the numerator gives $-\arctan(f/f_0)$ and the
denominator another $-\arctan(f/f_0)$. At low frequency $\varphi \to 180°$ (the
circuit is an inverter), at $f_0$ it is 90°, and at high frequency it tends to 0°.

::: callout key An all-pass filter converts frequency into phase
Its output always has the input's amplitude, but its phase angle tells you the
frequency (全通滤波器实现频率–相角转换). That is why it is used as a phase shifter or a
delay line.
:::

Circuit (b) on the slides swaps the positions of R and C at the $+$ input (series $R$,
$C$ to ground). Then $U_+ = U_i/(1 + sRC)$ and
$A_u(s) = \dfrac{1 - sRC}{1 + sRC}$: still $|\dot{A}_u| = 1$, but the phase runs from
0° down to −180°, $\varphi = -2\arctan(f/f_0)$.

::: plot Phase of the first-order all-pass filter (a)
x: -2 .. 2
y: 0 .. 180
xlabel: lg(f/f₀)
ylabel: φ (°)
phi(x) = 180 - 2 atan(10^x) * 180 / pi
:::

::: example Phase shift of an all-pass filter
$R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$ in circuit (a). Find the output amplitude and
phase for a 1 V input at 1591 Hz and at 795.8 Hz.
== Amplitude ==
$|\dot{A}_u| = 1$ at every frequency: the output is 1 V in both cases.
== At 1591 Hz ==
$f_0 = 1591\ \text{Hz}$, so $\varphi = 180° - 2\arctan 1 = 180° - 90° = 90°$.
== At 795.8 Hz ==
$f/f_0 = 0.5$: $\varphi = 180° - 2 \times 26.57° = 126.9°$.
:::

## State-variable (universal) filters

Where performance matters, filters are built from the basic op-amp computing circuits
(比例 scaling, 积分 integration, 求和 summing), combined so that the transfer function
can be set freely. This is the {{term state-variable filter | 状态变量型有源滤波器}},
also called the variable-state filter (可变状态型滤波器) or universal filter
(通用型滤波器).

::: define State-variable filter | 状态变量型有源滤波器
An active filter made of a summing amplifier and integrators (and scaling stages)
whose outputs give several filter responses at once, typically high-pass, band-pass
and low-pass, with independently adjustable $A_{up}$, $Q$ and $f_0$.
:::

Its advantages, from the slides:

1. **Versatile**: high-pass, band-pass and low-pass outputs at the same time (hence
   "universal").
2. Its parameters $A_{up}$, $Q$, $f_0$ are **independent** and easy to adjust.
3. Low sensitivity to component values, so a **high Q** is easy to reach.

### One transfer function for every second-order filter

Every second-order filter's transfer function has the same shape. Which coefficients
of the numerator are zero decides the type:

::: formula General second-order transfer function | 二阶有源滤波器的传递函数
$$A_u(s) = \frac{a_0 + a_1s + a_2s^2}{b_0 + b_1s + b_2s^2}$$
--
a_0, a_1, a_2 | numerator coefficients: they set the type |
b_0, b_1, b_2 | denominator coefficients: they set $f_0$ and $Q$ |
:::

| Numerator | Transfer function | Type |
| --- | --- | --- |
| $a_1 = a_2 = 0$ | $\dfrac{a_0}{b_0 + b_1s + b_2s^2}$ | low-pass |
| $a_0 = a_1 = 0$ | $\dfrac{a_2s^2}{b_0 + b_1s + b_2s^2}$ | high-pass |
| $a_0 = a_2 = 0$ | $\dfrac{a_1s}{b_0 + b_1s + b_2s^2}$ | band-pass |
| $a_1 = 0$ | $\dfrac{a_0 + a_2s^2}{b_0 + b_1s + b_2s^2}$ | band-stop |

Check this against the circuits you know: the VCVS low-pass has only a constant on
top, the high-pass only $s^2$, the band-pass only $s$, the band-stop $1 + (sCR)^2$.

### Op-amp recap: the integrator

An inverting amplifier with a capacitor $C$ in place of $R_f$ is an
{{term integrator | 积分电路}}. By the virtual short the $-$ input is at 0 V, the input
current $U_i/R$ all flows into $C$ (virtual open), and

$$U_o(s) = -\frac{1}{sRC}U_i(s)$$

$1/s$ is integration, and $\frac{1}{sRC}$ falls with frequency: an integrator is itself
a kind of low-pass element.

### The three-op-amp state-variable filter

Two integrators and one summer give low-pass, band-pass and high-pass outputs at once:

::: circuit Non-inverting state-variable filter (U1 = A1 summer, U2 = A2 and U3 = A3 integrators)
Ai 0,11 0,7 ui
G 0,11
R1 0,7 4,7 10k
W 4,7 8,7
R5 4,7 4,10 1.25k
G 4,10
R4 6,7 6,11 10k
W 6,11 6,13 22,13 22,6
U1 opamp 8,6
W 8,5 8,3
R2 8,3 12,3 10k
W 12,3 12,6
W 8,3 8,1
R3 8,1 12,1 10k
W 12,1 34,1 34,6 32,6
W 12,6 13,6 13,5
R6 13,5 18,5 10k
U2 opamp 18,6
W 18,5 18,3
C1 18,3 22,3 10n
W 22,3 22,6
W 18,7 18,8
G 18,8
W 22,6 23,6 23,5
R7 23,5 28,5 10k
U3 opamp 28,6
W 28,5 28,3
C2 28,3 32,3 10n
W 32,3 32,6
W 28,7 28,8
G 28,8
label uo1 12,6
label uo2 22,6
label uo3 32,6
:::

- **A1** is a summer: the input (through $R_1$) and the band-pass output $U_{o2}$
  (through $R_4$) reach its $+$ input; the low-pass output $U_{o3}$ (through $R_3$)
  reaches its $-$ input. Its output $U_{o1}$ is the **high-pass** output.
- **A2** integrates $U_{o1}$: its output $U_{o2}$ is the **band-pass** output.
- **A3** integrates again: $U_{o3}$ is the **low-pass** output.

Why does this work? Integrating divides by $s$. If $U_{o1}$ goes like $s^2/D(s)$, then
$U_{o2}$ goes like $s/D(s)$ and $U_{o3}$ like $1/D(s)$: high-pass, band-pass,
low-pass, with one shared denominator. With $R_1 = R_2 = R_3 = R_4 = R$,
$R_6 = R_7 = R_0$, $C_1 = C_2 = C_0$, the slides' result is

$$\begin{gathered}A_{u1}(s) = \frac{(sR_0C_0)^2}{D(s)}\cdot\frac{2R_5}{R + 2R_5},\\A_{u2}(s) = -\frac{sR_0C_0}{D(s)}\cdot\frac{2R_5}{R + 2R_5},\\A_{u3}(s) = \frac{1}{D(s)}\cdot\frac{2R_5}{R + 2R_5}\end{gathered}$$

with $D(s) = (sR_0C_0)^2 + \dfrac{2R_5}{R + 2R_5}sR_0C_0 + 1$.

::: formula State-variable filter parameters | 状态变量型滤波器的参数
$$f_0 = \frac{1}{2\pi R_0C_0},\qquad Q = \frac{R + 2R_5}{2R_5} = 1 + \frac{R}{2R_5},\qquad A_{HP} = A_{LP} = \frac{1}{Q},\quad A_{BP} = -1$$
--
R_0, C_0 | the integrators' resistor and capacitor | Ω, F
R | the equal resistors $R_1$ to $R_4$ | Ω
R_5 | the resistor from A1's $+$ input to ground; it alone sets $Q$ | Ω
A_{HP}, A_{LP} | passband gains of the high-pass and low-pass outputs |
A_{BP} | gain of the band-pass output at $f_0$ |
:::

Here is the "independent parameters" advantage in action: $R_0C_0$ sets $f_0$ and
nothing else; $R_5$ sets $Q$ and nothing else.

::: example A state-variable filter
In the circuit above, $R = 10\ \text{kΩ}$, $R_5 = 1.25\ \text{kΩ}$,
$R_0 = 10\ \text{kΩ}$, $C_0 = 10\ \text{nF}$. Find $f_0$, $Q$ and the three passband
gains, and the band-pass output's bandwidth.
== Characteristic frequency ==
$f_0 = \dfrac{1}{2\pi \times 10^4 \times 10^{-8}} = 1591\ \text{Hz}$.
== Q ==
$Q = 1 + \dfrac{10}{2 \times 1.25} = 5$.
== Gains ==
$A_{HP} = A_{LP} = 1/Q = 0.2$; $A_{BP} = -1$ (unity gain, inverted, at $f_0$).
== Bandwidth ==
$BW = f_0/Q = 318\ \text{Hz}$. Changing $R_5$ alone would change $Q$ and $BW$, but not
$f_0$.
:::

### Two more state-variable circuits

**A high-pass from a low-pass in the feedback loop.** The slides' two-op-amp circuit
feeds A1's output through an integrator (A2) back to A1's $+$ input. Putting a
low-pass element in the negative-feedback path makes the whole circuit high-pass, by
the "inverse operation" (逆运算) method: a circuit with block $F$ in its feedback acts
like $1/F$. One catch: as $f \to \infty$ the integrator's capacitor is a short, A2's
output goes to 0 and the loop is open, so A1 would saturate at $\pm U_{OM}$. A
resistive negative-feedback network ($R_6$ from the output to $-$, $R_4$ to ground)
keeps A1 linear and sets the passband gain:

$$\dot{A}_{up} = 1 + \frac{R_6}{R_4}$$

**Adding a band-stop output.** A fourth op-amp, an inverting summer, adds the high-pass
output $U_{o1}$ and the low-pass output $U_{o3}$. At $f_0$ these two are equal in size
and opposite in phase, so they cancel: the sum $U_{o4}$ is a **band-stop** output. With
four op-amps the filter gives HP, BP, LP and BS together. In each case the passband
gain is set by a resistive negative-feedback network.

## Computing circuits versus filters

Op-amp computing circuits (运算电路: scaling, summing, integrating…) and active filters
use the same parts. How do they differ?

| Aspect | Computing circuits | Active filters |
| --- | --- | --- |
| In common | deep negative feedback, op-amp in the linear region; virtual short and open; solved by nodal analysis | the same |
| Domain | time domain (时域): what operation is done on $u_I(t)$ | frequency domain (频域): what happens to each frequency |
| Testing | fixed frequency (or DC), vary the input amplitude, measure the output | fixed input amplitude, vary the frequency, measure the output |
| Described by | an operational relation, e.g. $u_O = -\frac{1}{RC}\int u_I\,\d t$ | the amplitude response of the voltage gain |

## Discussion questions

::: example Discussion 1: what each filter does at the ends
Which filters have their gain tend to the passband gain, or to zero, as $f \to 0$ and
as $f \to \infty$?
== f → 0, gain → passband gain ==
Low-pass, band-stop, all-pass.
== f → ∞, gain → passband gain ==
High-pass, band-stop, all-pass.
== f → 0, gain → 0 ==
High-pass, band-pass.
== f → ∞, gain → 0 ==
Low-pass, band-pass.
:::

::: example Discussion 2: name the filter
(1) A twin-T network (upper T: $C$, $C$, $R/2$ to ground; lower T: $R$, $R$, $2C$ to
ground) drives a voltage follower. (2) In a two-op-amp circuit, A1 has $C$ in series
with $R_1$ at its $-$ input and $R_1$ as feedback; A2 sums $\dot{U}_{o1}$ and
$\dot{U}_i$, each through $R_3$, with $R_3$ as feedback, so
$\dot{U}_o = -\dot{U}_{o1} - \dot{U}_i$. What are they?
== Circuit 1 ==
A passive twin-T notch network, buffered by a follower ($A_{up} = 1$): a band-stop
filter with its notch at $f_0 = \frac{1}{2\pi RC}$. (Its $R/2$ goes to ground, which is
the case "no feedback" in the band-stop formula: the middle coefficient is $4$, so
$Q = 0.25$ and the stopband is wide, $BW = 4f_0$.)
== A1 ==
An inverting first-order **high-pass** filter:
$\dot{U}_{o1} = -\dfrac{R_1}{R_1 + \frac{1}{\j\omega C}}\dot{U}_i = -\dfrac{\j\omega R_1C}{1 + \j\omega R_1C}\dot{U}_i$.
== A2 ==
An inverting summer with gain −1 for each input.
== The whole circuit ==
$\dot{U}_o = \dfrac{\j\omega R_1C}{1 + \j\omega R_1C}\dot{U}_i - \dot{U}_i = -\dfrac{1}{1 + \j\omega R_1C}\dot{U}_i$:
a first-order **low-pass** filter with $|A_{up}| = 1$ (inverting) and
$f_p = \frac{1}{2\pi R_1C}$. The input minus its high-frequency part is its
low-frequency part.
:::

::: example Discussion 3: checking a Multisim simulation
The slides simulate circuit 2 of discussion 2 with $R_1 = R_3 = 10\ \text{kΩ}$ and
$C = 1000\ \text{pF}$. The Bode plotter shows a flat response that rolls off at high
frequency, with the cursor at about 15.6 kHz, −3.14 dB; the phase starts at 180°. Does
theory agree?
== Type ==
Flat at low frequency, falling at high frequency: a low-pass filter, as derived. The
phase of 180° at low frequency is the inverting gain −1.
== Cutoff from theory ==
$f_p = \dfrac{1}{2\pi R_1C} = \dfrac{1}{2\pi \times 10^4 \times 10^{-9}} = 15.9\ \text{kHz}$.
== Comparing ==
The simulation's 15.6 kHz is about 2% lower. An ideal filter would be only −2.9 dB at
15.6 kHz, so the simulated op-amp (with its finite bandwidth) is adding a little extra
fall, and the cursor sits just past the −3 dB point. Theory and simulation agree to
within these effects: $f_p \approx 15.9\ \text{kHz}$.
:::

::: callout exam What to expect
Typical questions: identify a filter from its circuit or its response at the two ends
(discussion 1); compute $f_0$, $Q$, $A_{up}$, $BW$ and the cutoffs of a band-pass or
band-stop filter; check the stability condition ($A_{uf} < 3$ for band-pass,
$A_{up} < 2$ for the voltage-controlled band-stop); give an all-pass filter's phase at a
frequency; list the advantages of the state-variable filter.
:::

::: cards Band-pass, band-stop, all-pass and state-variable filters
LPF and HPF in series give … :: A band-pass filter, if $f_H > f_L$; passband width $f_H - f_L$
LPF and HPF in parallel, summed, give … :: A band-stop filter, stopband $f_{p1}$ to $f_{p2}$ (with $f_{p1} < f_{p2}$)
Q of the voltage-controlled BPF :: $Q = \frac{1}{3 - A_{uf}}$, with $A_{uf} = 1 + R_f/R_1 < 3$
Passband gain of the voltage-controlled BPF :: $A_{up} = QA_{uf} = \frac{A_{uf}}{3 - A_{uf}}$, at $f_0$
Bandwidth of a band-pass filter :: $BW = f_H - f_L = \frac{f_0}{Q}$
Wide-band and narrow-band BPF :: $Q < 10$ wide-band, $Q > 10$ narrow-band
Twin-T network :: An upper T ($C$, $C$, $R/2$) passing high frequencies in parallel with a lower T ($R$, $R$, $2C$) passing low ones; they cancel near $f_0 = \frac{1}{2\pi RC}$
Q of the voltage-controlled BEF :: $Q = \frac{1}{2(2 - A_{up})}$; needs $A_{up} < 2$
Stopband width of the BEF :: $BW = 2(2 - A_{up})f_0 = f_0/Q$
All-pass filter (APF) :: $|\dot{A}_u| = 1$ at every frequency; only the phase changes (a phase shifter or delay filter)
Phase of the first-order all-pass filter (a) :: $\varphi = 180^\circ - 2\arctan(f/f_0)$: 180° → 90° at $f_0$ → 0°
Numerator of a second-order band-pass function :: Only $a_1s$ ($a_0 = a_2 = 0$)
Three advantages of the state-variable filter :: HP, BP and LP outputs at once; independent, easy-to-adjust $A_{up}$, $Q$, $f_0$; low sensitivity, so high Q is easy
State-variable filter Q and gains :: $Q = 1 + \frac{R}{2R_5}$; $A_{HP} = A_{LP} = 1/Q$, $A_{BP} = -1$; $f_0 = \frac{1}{2\pi R_0C_0}$
Computing circuit vs filter :: Computing circuits: time domain, an operational relation. Filters: frequency domain, the amplitude response
:::

::: quiz Check yourself: band-pass, band-stop and more
? A voltage-controlled band-pass filter has $R_1 = 10$ kΩ and $R_f = 18$ kΩ. What is its $Q$?
answer: 5
tolerance: 1%
> $A_{uf} = 1 + 18/10 = 2.8$, so $Q = \frac{1}{3 - 2.8} = 5$.

? For the same filter, what is the gain at the centre frequency, $A_{up}$?
answer: 14
tolerance: 1%
> $A_{up} = QA_{uf} = 5 \times 2.8 = 14$.

? Its centre frequency is 2 kHz. What is its bandwidth?
answer: 400 Hz
tolerance: 1%
> $BW = f_0/Q = 2000/5 = 400$ Hz. ($Q = 5 < 10$: a wide-band filter by the slides' convention.)

? Write the bandwidth of the voltage-controlled band-pass filter in terms of $f_0$ and $A_{uf}$ (type A for $A_{uf}$, f for $f_0$).
expression: (3 - A) f
variables: A, f
> $f_H - f_L = \frac{f_0}{2}\cdot 2(3 - A_{uf}) = (3 - A_{uf})f_0$; the square roots cancel.

? A voltage-controlled band-stop filter has $A_{up} = 1.8$. What is its $Q$?
answer: 2.5
tolerance: 1%
> $Q = \frac{1}{2(2 - 1.8)} = \frac{1}{0.4} = 2.5$.

? Which filters have their gain fall to zero as $f \to \infty$?
- [x] Low-pass
- [ ] High-pass
- [x] Band-pass
- [ ] Band-stop
- [ ] All-pass
> Low-pass and band-pass filters block high frequencies. High-pass, band-stop and all-pass filters pass them with the passband gain.

? A first-order all-pass filter of type (a) has $f_0 = 1$ kHz. What is the output's phase at 3 kHz?
answer: 36.9 °
tolerance: 2%
> $\varphi = 180° - 2\arctan 3 = 180° - 2 \times 71.57° = 36.9°$. The amplitude is still equal to the input's.

? A state-variable filter has $R = 10$ kΩ. What $R_5$ gives $Q = 10$?
answer: 556 Ω
tolerance: 2%
> $Q = 1 + \frac{R}{2R_5} = 10$, so $\frac{R}{2R_5} = 9$ and $R_5 = \frac{10\,000}{18} = 556$ Ω.

? Which statement about op-amp computing circuits and active filters is right?
- [x] Both use deep negative feedback, so the op-amp works in its linear region
- [ ] Filters are tested at a fixed frequency with a varying amplitude
- [ ] Computing circuits are described by their amplitude response
> Both rely on the virtual short and open. Filters are tested at a fixed amplitude with a varying frequency and are described by the amplitude response; computing circuits by an operational relation in the time domain.

? In discussion 3, $R_1 = 10$ kΩ and $C = 1000$ pF. What cutoff frequency does theory give?
answer: 15.9 kHz
tolerance: 2%
> $f_p = \frac{1}{2\pi R_1C} = \frac{1}{2\pi \times 10^4 \times 10^{-9}} = 15.9$ kHz; Multisim's cursor read about 15.6 kHz.
:::

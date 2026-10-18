---
title: Filter basics and first-order filters
zh: 滤波器基础与一阶滤波器
summary: What a filter does, the five kinds and their passband, stopband and transition band, why op-amp (active) filters beat plain RC ones, the transfer-function method, and the first-order low-pass and high-pass filters.
source: 第9章 信号的处理与变换（9.2 有源滤波器）, 2026-09-15
---

A microphone signal carries the voice you want plus mains hum at 50 Hz and hiss at
very high frequencies; a sensor's output carries the slow quantity you are measuring
plus fast noise. A **filter** keeps the frequencies you want and throws the others
away. This lesson sets up everything the rest of the unit uses: the names for the
parts of a filter's response, why we build filters around an op-amp, the step-by-step
method for analysing one, and the simplest filters of all, the first-order low-pass
and high-pass. Every later circuit is analysed the same way, so it pays to get this
lesson solid.

## Where filters fit: signal processing and conversion

Chapter 9 of the course (信号的处理与变换) is about analogue circuits that do
something *to* a signal rather than just make it bigger. They fall into two groups.

- {{term Signal processing circuits | 信号的处理电路}} change the signal's content:
  active filters (有源滤波电路, this unit), analogue multipliers (模拟乘法器),
  switched-capacitor filters (开关电容滤波器), modulation and demodulation
  (调制与解调) and the phase-locked loop (锁相环).
- {{term Signal conversion circuits | 信号的变换电路}} are the
  {{term interface circuits | 接口电路}} between a sensor and the processing
  circuit: they turn the sensor's output into a convenient form, for example a charge
  into a voltage or a current into a voltage.

The lecture covers section 9.2, active filters.

## Op-amp recap: virtual short and virtual open

Every filter in this unit is built around an {{term operational amplifier | 集成运算放大器}}
(op-amp, 集成运放), which the course met in an earlier term. If that is hazy, this
section is all you need.

An op-amp has two inputs, the **non-inverting input** $+$ (同相输入端, voltage $u_P$
or $u_+$) and the **inverting input** $-$ (反相输入端, $u_N$ or $u_-$), and one output
$u_O$. Its open-loop gain is enormous (around $10^5$ or more) and its input resistance
is huge. On its own it would slam the output into the supply rails for the smallest
input difference, so we always wrap it in **negative feedback** (负反馈): part of the
output is fed back to the $-$ input. With negative feedback the op-amp works in its
**linear region** (线性区), and two simple rules then hold for an ideal op-amp.

::: law Virtual short | 虚短
With negative feedback, the op-amp adjusts its output until its two inputs are at the
same voltage: $u_+ = u_-$. The inputs behave as if shorted together, though no current
flows between them.
:::

::: law Virtual open | 虚断
The ideal op-amp's input resistance is infinite, so no current flows into either
input: $i_+ = i_- = 0$. The inputs behave as if disconnected.
:::

Why does the virtual short hold? The output is $u_O = A_{od}(u_+ - u_-)$ with
$A_{od}$ huge, and $u_O$ is limited to a few volts, so $u_+ - u_-$ must be tiny:
practically zero.

The two rules are enough to solve the circuits below. The most useful one here is the
**non-inverting amplifier** (同相比例运算电路): the signal goes into $+$, and a divider
$R_f$, $R_1$ feeds a fraction of the output back to $-$.

::: circuit Non-inverting amplifier (同相比例运算电路)
A1 0,6 0,2 ui
W 0,2 6,2
U1 opamp 6,3 plus-top
W 6,4 6,6
Rf 6,6 10,6 Rf
W 10,6 10,3 12,3
R1 6,6 6,9 R1
G 6,9
G 0,6
label uo 12,3
:::

By the virtual open, no current enters $-$, so $R_1$ and $R_f$ form a plain divider:
$u_- = u_O \cdot R_1/(R_1 + R_f)$. By the virtual short, $u_- = u_+ = u_I$. Together:

::: formula Non-inverting amplifier gain | 同相比例运算电路的电压放大倍数
$$A_u = \frac{u_O}{u_I} = 1 + \frac{R_f}{R_1}$$
--
A_u | voltage gain (电压放大倍数) |
R_f | feedback resistor, output to the $-$ input | Ω
R_1 | resistor from the $-$ input to ground | Ω
:::

With $R_f = 0$ (or $R_1$ left out) the gain is exactly 1: the output is wired straight
back to $-$ and simply copies the $+$ input. That is the
{{term voltage follower | 电压跟随器}}. It draws no current from what drives it (huge
input resistance) and can drive any load (tiny output resistance), so it works as a
**buffer** (缓冲): it isolates one part of a circuit from the next.

Two more op-amp circuits appear later in the unit: the **inverting amplifier**
(反相比例运算电路, signal into $-$ through $R_1$, $u_O = -\frac{R_f}{R_1}u_I$) and the
**integrator** (积分电路, a capacitor in place of $R_f$). Lesson 3 recaps them when
they are needed.

## What a filter does, and the five kinds

::: define Filter | 滤波器
A circuit that selects signals by frequency (滤波 = filtering): it lets the frequency
components within a chosen range pass and suppresses the others.
:::

A filter is described by how its gain depends on frequency. Write the gain as a
complex number $\dot{A}_u = \dot{U}_o/\dot{U}_i$ (the dot marks a phasor, a sinusoid's
amplitude and phase together). Its size $|\dot{A}_u|$ against $f$ is the
{{term amplitude response | 幅频特性}} (幅度频率特性), and its angle $\varphi$
against $f$ is the {{term phase response | 相频特性}}. Filters are named by the shape
of the amplitude response:

| Kind | 中文 | Passes | Stops |
| --- | --- | --- | --- |
| Low-pass filter, LPF | 低通滤波器 | $0$ up to $f_H$ | above $f_H$ |
| High-pass filter, HPF | 高通滤波器 | above $f_L$ | $0$ up to $f_L$ |
| Band-pass filter, BPF | 带通滤波器 | between $f_L$ and $f_H$ | below $f_L$ and above $f_H$ |
| Band-elimination (band-stop) filter, BEF | 带阻滤波器 | below $f_L$ and above $f_H$ | between them |
| All-pass filter, APF | 全通滤波器 | every frequency | nothing (it only shifts the phase) |

::: define Low-pass filter | 低通滤波器
A filter that passes frequencies from 0 up to a cutoff $f_H$ and suppresses higher
ones (LPF).
:::

::: define High-pass filter | 高通滤波器
A filter that passes frequencies above a cutoff $f_L$ and suppresses lower ones (HPF).
:::

::: define Band-pass filter | 带通滤波器
A filter that passes one band of frequencies, $f_L$ to $f_H$, and suppresses the
frequencies below and above it (BPF).
:::

::: define Band-elimination filter | 带阻滤波器
A filter that suppresses one band of frequencies and passes the frequencies below and
above it (BEF, also band-stop filter).
:::

::: define All-pass filter | 全通滤波器
A filter with no stopband: every frequency passes with the same gain, but different
frequencies are shifted by different phase angles (APF).
:::

## Passband, stopband and transition band

An ideal low-pass filter would be a brick wall: gain $A_0$ right up to the cutoff, then
zero. Real filters can't change instantly; between "passes" and "stops" there is a
slope. The slides mark three levels on the gain axis, $A_0$, $0.707A_0$ and
$0.1A_0$, and use them to split the frequency axis into three regions.

::: define Passband | 通带
The range of frequencies where the gain stays at or above $0.707A_0$ (within 3 dB of
the passband gain $A_0$). Its edge is the cutoff frequency.
:::

::: define Stopband | 阻带
The range of frequencies where the gain has fallen to $0.1A_0$ or below (20 dB or more
under the passband gain).
:::

::: define Transition band | 过渡带
The range between the passband edge ($0.707A_0$) and the start of the stopband
($0.1A_0$), where the gain is falling.
:::

::: define Cutoff frequency | 截止频率
The frequency at which the gain has fallen to $1/\sqrt{2} \approx 0.707$ of its
passband value. A low-pass filter's is the upper cutoff $f_H$ (上限截止频率); a
high-pass filter's is the lower cutoff $f_L$ (下限截止频率).
:::

Signals in the transition band are weakened but still get through. So a good filter's
gain should drop as fast as possible outside the passband.

::: callout key The narrower the transition band, the better
The steeper the fall from passband to stopband, the narrower the transition band, and
the closer the filter is to the ideal brick wall. Higher-order filters (below) are
steeper.
:::

Gains are usually drawn in **decibels** with frequency on a logarithmic axis (a
{{term Bode plot | 波特图}}), because filter responses cover many decades.

::: formula Gain in decibels | 增益的分贝表示
$$G = 20\lg\left|\dot{A}_u\right| \ \text{dB}$$
--
G | gain in decibels | dB
\lg | logarithm to base 10 |
\dot{A}_u | voltage gain (a ratio of voltages) |
:::

Useful values: a ratio of $1/\sqrt{2} = 0.707$ is $-3$ dB, $0.1$ is $-20$ dB, $0.01$
is $-40$ dB, and $2$ is $+6$ dB. A **decade** (十倍频程) is a factor of 10 in
frequency. That is why the cutoff is also called the **−3 dB frequency**.

::: example Reading levels in decibels
A filter's passband gain is $A_0 = 2$. What is the gain in dB in the passband, at the
cutoff, and at the start of the stopband?
== Passband ==
$20\lg 2 = 6.02$ dB.
== Cutoff ==
$|\dot{A}_u| = 0.707 \times 2 = 1.414$, so $20\lg 1.414 = 3.01$ dB: 3 dB below the
passband.
== Start of the stopband ==
$|\dot{A}_u| = 0.1 \times 2 = 0.2$, so $20\lg 0.2 = -13.98$ dB: 20 dB below the
passband.
:::

## Passive filters and the trouble with loads

The simplest low-pass filter needs no op-amp at all: a resistor in series and a
capacitor across the output. At low frequency the capacitor's reactance
$1/(\omega C)$ is huge, it barely loads the divider, and the output equals the input.
At high frequency the capacitor is almost a short, and the output collapses.

::: define Passive filter | 无源滤波器
A filter made only of resistors and reactive parts (capacitors, inductors), with no
amplifying device.
:::

::: circuit Passive RC low-pass filter with a load RL
A1 0,4 0,0 ui
R1 0,0 4,0 R
C1 4,0 4,4 C
W 4,0 8,0
RL 8,0 8,4 RL
W 0,4 8,4
G 0,4
label uo 8,0
:::

Without the load, the divider gives
$\dot{A}_u = \dfrac{1/(\j\omega C)}{R + 1/(\j\omega C)} = \dfrac{1}{1 + \j\omega RC}$.
With a load $R_L$ across the output, replace the source and $R$, $R_L$ by their
Thevenin equivalent: the source becomes $\frac{R_L}{R+R_L}\dot{U}_i$ and the
resistance $R /\!/ R_L$. So:

::: formula Passive RC low-pass filter | 无源RC低通滤波电路
$$\dot{A}_u = \frac{A_{up}}{1 + \j\dfrac{f}{f_p}},\qquad A_{up} = \frac{R_L}{R + R_L},\qquad f_p = \frac{1}{2\pi (R /\!/ R_L) C}$$
--
A_{up} | passband gain (通带增益); $1$ with no load | 
f_p | cutoff frequency; $\frac{1}{2\pi RC}$ with no load | Hz
R_L | load resistance | Ω
R /\!/ R_L | $R$ and $R_L$ in parallel, $\frac{R R_L}{R+R_L}$ | Ω
:::

The load changes both numbers: the passband gain drops below 1 and the cutoff moves
up (because $R /\!/ R_L < R$). A filter whose behaviour depends on what you plug into
it is hard to design with.

At DC ($f = 0$) the capacitor is open, so the simulator below shows the passband gain
directly. Slide $R_L$ and watch $u_o$: with a 1 V input it reads $A_{up}$.

::: circuit-sim The load pulls the passband gain down (DC, so C is open)
V1 0,4 0,0 1V
R1 0,0 4,0 10k
C1 4,0 4,4 10n
W 4,0 8,0
RL 8,0 8,4 10k [1k..100k]
W 0,4 8,4
G 0,4
label uo 8,0
:::

::: example A loaded RC filter
$R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$. Find the passband gain and cutoff with no
load and with $R_L = 10\ \text{kΩ}$.
== No load ==
$A_{up} = 1$, $f_p = \dfrac{1}{2\pi \times 10^4 \times 10^{-8}} = 1.59\ \text{kHz}$.
== With the load ==
$A_{up} = \dfrac{10}{10 + 10} = 0.5$ (−6 dB). $R /\!/ R_L = 5\ \text{kΩ}$, so
$f_p = \dfrac{1}{2\pi \times 5000 \times 10^{-8}} = 3.18\ \text{kHz}$.
== Conclusion ==
Connecting the load halved the gain and doubled the cutoff frequency.
:::

## Active filters

Put a voltage follower between the RC network and the load. The follower draws no
current, so the RC network sees no load at all, and the follower's tiny output
resistance drives $R_L$ without the voltage sagging.

::: define Active filter | 有源滤波器
A filter made of an integrated op-amp and passive R and C parts (有源滤波电路). The
op-amp works in its linear region.
:::

::: circuit First-order active filter: RC network plus a voltage follower
A1 0,6 0,2 ui
R1 0,2 4,2 R
W 4,2 8,2
C1 4,2 4,6 C
W 0,6 4,6
G 4,6
U1 opamp 8,3 plus-top
W 8,4 8,6 12,6 12,3
W 12,3 16,3
RL 16,3 16,7 RL
G 16,7
label uP 4,2
label uo 16,3
:::

By the virtual open, no current flows into $+$, so $U_p$ is the unloaded RC divider;
by the virtual short (follower), $U_o = U_p$:

$$A_u(s) = \frac{U_o(s)}{U_i(s)} = \frac{U_p(s)}{U_i(s)} = \frac{\frac{1}{sC}}{R + \frac{1}{sC}} = \frac{1}{1 + sRC}$$

With $s = \j\omega = \j 2\pi f$: $\dot{A}_u = \dfrac{1}{1 + \j f/f_P}$, $A_{up} = 1$,
$f_P = \dfrac{1}{2\pi RC}$, whatever $R_L$ is.

The slides compare the two families:

| | Passive filter | Active filter |
| --- | --- | --- |
| Parts | R, C, L (inductors are big and heavy) | op-amp, R, C: no inductors, small and light |
| Effect of the load | gain and cutoff change with the load | high input and low output impedance buffer the signal, so the parameters don't change |
| Gain | at most 1, signals get weaker | can amplify while it filters, so the signal isn't over-attenuated |
| Where used | high voltages and currents: DC power supplies, high-power equipment | signal processing only; an op-amp can't supply high-voltage or high-current loads |

::: callout pitfall Active doesn't mean "for power"
Active filters are for small signals. The rectifier filter in a power supply
(unit 6 of this course) is passive because an op-amp can't deliver that current.
:::

## How to analyse a filter

The slides give a three-step method, used for every circuit in this unit.

1. **Find the transfer function.** The op-amp works in its linear region, so use the
   virtual short and virtual open, and write node (KCL) equations (节点电流法) or use
   superposition (叠加定理) with each capacitor as an impedance $1/(sC)$. Solve for
   $A_u(s) = U_o(s)/U_i(s)$.
2. **Put $s = \j\omega$.** This gives the frequency response $\dot{A}_u$
   (频率特性方程). From it read the **passband gain** $A_{up}$ (通带增益, also called
   通带电压放大倍数) and the **passband cutoff frequency** (通带截止频率), and sketch the
   amplitude and phase responses.
3. **Read off the order.** The highest power of $s$ in the denominator is the filter's
   order.

::: define Transfer function | 传递函数
The ratio of the output to the input in the $s$ domain (Laplace transform),
$A_u(s) = U_o(s)/U_i(s)$. Putting $s = \j\omega$ turns it into the frequency response.
:::

::: define Order of a filter | 滤波器的阶数
The highest power of $s$ in the denominator of the transfer function; in these
circuits it equals the number of RC sections (RC环节).
:::

Why does order matter? Far into the stopband each RC section divides the signal by
about $f/f_c$, so each one adds 20 dB per decade of fall.

::: law Roll-off of an n-th order filter | n阶滤波器过渡带的变化速率
In the transition band and beyond, the gain of an $n$-th order filter changes by
$\pm 20n$ dB per decade: $\pm 20$ dB/decade for first order, $\pm 40$ dB/decade for
second order.
:::

## The first-order low-pass filter

The follower circuit above has gain 1. To amplify as well, replace the follower with
a non-inverting amplifier: the RC network still feeds $+$, and $R_f$, $R_1$ set the
gain.

::: circuit Non-inverting first-order low-pass filter (同相输入一阶低通滤波器)
A1 0,6 0,2 uI
R 0,2 4,2 10k
W 4,2 8,2
C 4,2 4,6 15.9n
W 0,6 4,6
G 4,6
U1 opamp 8,3 plus-top
W 8,4 8,6
Rf 8,6 12,6 10k
W 12,6 12,3 14,3
R1 8,6 8,9 10k
G 8,9
label uO 14,3
:::

The $+$ input sees the RC divider, $U_+ = U_I/(1+sRC)$, and the amplifier multiplies
it by $1 + R_f/R_1$:

$$A_u(s) = \frac{U_o(s)}{U_i(s)} = \left(1 + \frac{R_f}{R_1}\right)\frac{1}{1 + sRC}$$

::: formula First-order low-pass filter | 一阶低通滤波器
$$\dot{A}_u = \frac{A_{up}}{1 + \j\dfrac{f}{f_H}},\qquad A_{up} = 1 + \frac{R_f}{R_1},\qquad f_H = f_0 = \frac{1}{2\pi RC}$$
--
\dot{A}_u | voltage gain at frequency $f$ |
A_{up} | passband gain (通带放大倍数) |
f_H | upper cutoff frequency (上限截止频率) | Hz
f_0 | characteristic frequency (特征频率), here equal to $f_H$ | Hz
:::

::: define Characteristic frequency of a filter | 特征频率
The frequency $f_0 = \frac{1}{2\pi RC}$ (or $\omega_0 = 1/RC$) set by a filter's R and
C. In a first-order filter it is also the cutoff; in second-order filters the two
differ.
:::

How the amplitude behaves, in three regions:

- $f \ll f_H$: $\left|\dot{A}_u/A_{up}\right| \approx 1$, flat at 0 dB.
- $f = f_H$: $\left|\dot{A}_u/A_{up}\right| = \dfrac{1}{|1 + \j|} = \dfrac{1}{\sqrt{2}} \approx 0.707$, that is −3 dB.
- $f \gg f_H$: $\left|\dot{A}_u/A_{up}\right| \approx f_H/f$, falling at −20 dB per
  decade (at $10f_H$ it is −20 dB).

::: callout note A slide error
Slide 04-011 prints $\left|\dot{A}_u/A_{up}\right| = \sqrt{2}$ at $f = f_H$. The
correct value is $1/\sqrt{2} \approx 0.707$ (−3 dB), as the slide's own graph shows:
the gain falls at the cutoff, it doesn't rise.
:::

The phase is $\varphi = -\arctan(f/f_H)$: 0° at low frequency, −45° at $f_H$, heading
for −90°.

::: callout pitfall Frequency in Hz, not rad/s
$f_H = \frac{1}{2\pi RC}$ is in hertz. $\frac{1}{RC}$ alone is $\omega_0$ in rad/s,
6.28 times bigger. Mixing them up is the most common numerical slip in this unit.
:::

## The first-order high-pass filter

Swap the R and C of the input network: series capacitor, resistor to ground. Now low
frequencies are blocked by the capacitor and high frequencies pass. The divider gives
$U_+ = U_I\dfrac{R}{R + 1/(sC)} = U_I\dfrac{sRC}{1+sRC}$, so

::: formula First-order high-pass filter | 一阶高通滤波器
$$\dot{A}_u = A_{up}\frac{\j\dfrac{f}{f_L}}{1 + \j\dfrac{f}{f_L}},\qquad A_{up} = 1 + \frac{R_f}{R_1},\qquad f_L = \frac{1}{2\pi RC}$$
--
f_L | lower cutoff frequency (下限截止频率) | Hz
A_{up} | passband gain, reached for $f \gg f_L$ |
:::

It is the low-pass filter's mirror image: −3 dB at $f_L$, rising at +20 dB/decade
below it, flat above it. This swap of R and C is a general rule, used again for the
second-order filters in the next lesson.

The plot shows both first-order responses, normalised to their passband gain. The
horizontal axis is $\lg(f/f_0)$: $-1$ is $0.1f_0$, $0$ is $f_0$, $1$ is $10f_0$. The
third curve, asym, is the low-pass asymptote (0 dB, then −20 dB/decade).

::: plot First-order responses, 20 lg|A/Aup| against lg(f/f₀)
x: -2 .. 2
y: -45 .. 5
xlabel: lg(f/f₀)
ylabel: 20 lg|A/Aup| (dB)
LP(x) = -10 lg(1 + 10^(2*x))
HP(x) = 20*x - 10 lg(1 + 10^(2*x))
asym(x) = min(0, -20*x)
:::

Try your own component values here (the gain is read at the frequency $f$ you set):

::: explore First-order low-pass filter
slider R: 1k .. 100k = 10k | Ω | log
slider C: 1n .. 1u = 15.9n | F | log
slider R1: 1k .. 100k = 10k | Ω | log
slider Rf: 0 .. 100k = 10k | Ω
slider f: 10 .. 100k = 1k | Hz | log
Aup = 1 + Rf / R1 | | Passband gain
fH = 1 / (2 pi R C) | Hz | Cutoff frequency
A = Aup / sqrt(1 + (f / fH)^2) | | Gain at f
G = 20 lg(A) | dB | Gain at f in dB
:::

::: example Designing a first-order low-pass filter
Design a non-inverting first-order low-pass filter with $f_H = 1\ \text{kHz}$ and a
passband gain of 2, using $R = 10\ \text{kΩ}$. Then find the gain at 10 kHz.
== Capacitor ==
$C = \dfrac{1}{2\pi R f_H} = \dfrac{1}{2\pi \times 10^4 \times 10^3} = 15.9\ \text{nF}$.
== Gain resistors ==
$1 + R_f/R_1 = 2$, so $R_f = R_1$; for example both $10\ \text{kΩ}$.
== Gain at 10 kHz ==
$|\dot{A}_u| = \dfrac{2}{\sqrt{1 + 10^2}} = 0.199$, so $20\lg 0.199 = -14.0$ dB.
The passband is at $+6.0$ dB, so the gain is 20 dB down one decade above $f_H$, as
the −20 dB/decade rule says.
:::

::: callout exam What to expect
Typical questions: classify a filter from its circuit or its response; find $A_{up}$
and the cutoff from R and C; write the transfer function with the virtual short and
virtual open; state the roll-off of an $n$-th order filter.
:::

## Summary

::: callout summary The first-order filters
- Filters: LPF, HPF, BPF, BEF, APF, named by which frequencies pass.
- Passband edge at $0.707A_0$ (−3 dB); stopband from $0.1A_0$; between them the
  transition band, and narrower is better.
- Passive RC filters change with the load; an op-amp buffer fixes that and can add
  gain.
- Method: virtual short and open → $A_u(s)$ → $s = \j\omega$ → $A_{up}$, cutoff,
  sketch; order = highest power of $s$; roll-off $\pm 20n$ dB/decade.
- First order: $A_{up} = 1 + R_f/R_1$, cutoff $\frac{1}{2\pi RC}$.
:::

::: cards Filter basics
Virtual short (虚短) :: With negative feedback the op-amp's inputs sit at the same voltage: $u_+ = u_-$.
Virtual open (虚断) :: No current flows into the ideal op-amp's inputs: $i_+ = i_- = 0$.
Gain of the non-inverting amplifier :: $A_u = 1 + \frac{R_f}{R_1}$
The five kinds of filter :: Low-pass (LPF), high-pass (HPF), band-pass (BPF), band-elimination (BEF), all-pass (APF)
Passband edge level :: $0.707A_0$, that is −3 dB below the passband gain
Where the stopband starts :: At $0.1A_0$, 20 dB below the passband gain
Transition band (过渡带) :: Between the $0.707A_0$ and $0.1A_0$ points; the narrower, the better the filter
Why a passive RC filter is hard to use :: Its passband gain and cutoff change with the load: $A_{up} = \frac{R_L}{R+R_L}$, $f_p = \frac{1}{2\pi(R/\!/R_L)C}$
Four advantages of active filters :: No inductors (small, light); parameters independent of the load; they can amplify; but they suit only small signals
Order of a filter :: The highest power of $s$ in the transfer function's denominator (the number of RC sections)
Roll-off of an n-th order filter :: $\pm 20n$ dB per decade
First-order low-pass cutoff :: $f_H = \frac{1}{2\pi RC}$, where $|\dot{A}_u/A_{up}| = 1/\sqrt{2}$
First-order LPF frequency response :: $\dot{A}_u = \frac{A_{up}}{1 + \j f/f_H}$
How to turn an RC low-pass into a high-pass :: Swap the resistors and capacitors
:::

::: quiz Check yourself: filter basics
? A filter's gain falls to 0.1 of its passband value. How far below the passband is that, in decibels?
answer: 20 dB
tolerance: 1%
> $20\lg 0.1 = -20$ dB: 20 dB below the passband. This is where the stopband begins.

? Which filters pass DC (f → 0) with their passband gain?
- [x] Low-pass
- [ ] High-pass
- [ ] Band-pass
- [x] Band-elimination
- [x] All-pass
> At $f \to 0$ the low-pass, band-stop and all-pass filters are in their passband. The high-pass and band-pass filters block low frequencies, so their gain goes to 0.

? A passive RC low-pass has $R = 10$ kΩ, $C = 10$ nF and a load $R_L = 10$ kΩ. What is its cutoff frequency?
answer: 3.18 kHz
tolerance: 2%
> $R /\!/ R_L = 5$ kΩ, so $f_p = \frac{1}{2\pi \times 5000 \times 10^{-8}} = 3.18$ kHz, twice the unloaded 1.59 kHz.

? Write the passband gain of the non-inverting first-order low-pass filter in terms of $R_f$ and $R_1$.
expression: 1 + Rf/R1
variables: Rf, R1
> The RC network sets the frequency dependence; the non-inverting amplifier multiplies by $1 + R_f/R_1$ (virtual short $u_- = u_+$, virtual open makes $R_1$, $R_f$ a divider).

? A first-order low-pass filter uses $R = 4.7$ kΩ and $C = 33$ nF. What is $f_H$?
answer: 1.03 kHz
tolerance: 2%
> $f_H = \frac{1}{2\pi RC} = \frac{1}{2\pi \times 4700 \times 33 \times 10^{-9}} = 1026$ Hz $\approx 1.03$ kHz.

? A filter's transfer function has $s^3$ as the highest power in its denominator. How fast does its gain fall far into the stopband?
answer: 60 dB
tolerance: 1%
> Third order: $20n = 20 \times 3 = 60$ dB per decade.

? At $f = f_H$, what is $|\dot{A}_u / A_{up}|$ for a first-order low-pass filter?
answer: 0.707
tolerance: 1%
> $|1/(1+\j)| = 1/\sqrt{2} = 0.707$, that is −3 dB. (Slide 04-011 prints $\sqrt{2}$, which is a misprint.)

? Why is the op-amp in an active filter said to give "buffering" (缓冲作用)?
- [x] Its high input impedance doesn't load the RC network, and its low output impedance drives the load without sagging
- [ ] It removes the need for any capacitors
- [ ] It makes the filter work at high power
> The op-amp separates the RC network from the load, so the filter's gain and cutoff no longer depend on $R_L$.

? What does the Chinese term 虚断 refer to?
text: virtual open | virtual open circuit | virtual break
> 虚断: no current flows into an ideal op-amp's inputs, as if they were open-circuited.
:::

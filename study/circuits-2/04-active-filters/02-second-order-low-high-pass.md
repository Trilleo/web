---
title: Second-order low-pass and high-pass
zh: 二阶低通与高通滤波器
summary: The simple second-order low-pass filter and why its cutoff sits at 0.37 f₀, the voltage-controlled (VCVS) second-order low-pass with quality factor Q = 1/(3 − A_up), why A_up must stay below 3, choosing Q, and the high-pass versions made by swapping R and C.
source: 第9章 信号的处理与变换（9.2.2 有源低通滤波器, 9.2.3 有源高通滤波器）, 2026-09-15
---

A first-order filter falls at only 20 dB per decade: a signal ten times above the
cutoff is reduced to a tenth, which is often not enough to remove noise close to the
wanted band. Adding a second RC section doubles the slope to 40 dB per decade. But
done naively, the extra section also bends the response down far too early. This
lesson shows the problem, then the classic fix: a touch of **positive feedback**
through one capacitor, controlled by the amplifier's gain. The result, the
voltage-controlled second-order filter, is the most common active filter in practice,
and its quality factor $Q$ is the idea the whole rest of the unit is built on.

Everything here uses the method from lesson 1: virtual short and virtual open, KCL in
the $s$ domain, then $s = \j\omega$.

## The simple second-order low-pass filter

Put two RC sections in a row in front of the non-inverting amplifier: input → $R$ →
node N → $R$ → the $+$ input, with $C_1$ from N to ground and $C_2$ from the $+$ input
to ground. Each section cuts the high frequencies, so far above the cutoff the gain
falls twice as fast.

::: circuit Non-inverting second-order low-pass filter (同相输入二阶低通滤波电路)
A1 0,6 0,2 uI
Ra 0,2 4,2 10k
Rb 4,2 8,2 10k
W 8,2 12,2
C1 4,2 4,6 10n
C2 8,2 8,6 10n
W 0,6 8,6
G 4,6
U1 opamp 12,3 plus-top
W 12,4 12,6
Rf 12,6 16,6 10k
W 16,6 16,3 18,3
R1 12,6 12,9 10k
G 12,9
label N 4,2
label uO 18,3
:::

The passband gain is the amplifier's, since at DC both capacitors are open:

$$A_{up} = 1 + \frac{R_f}{R_1}$$

**Deriving the transfer function.** Take $C_1 = C_2 = C$ and both resistors $R$. Call
the voltages at N and at the $+$ input $U_N$ and $U_P$. The amplifier gives
$U_o = A_{up}U_P$.

- At the $+$ input (virtual open: no current into the op-amp), the current through the
  second $R$ all flows into $C_2$: $\dfrac{U_N - U_P}{R} = sC\,U_P$, so
  $U_N = (1 + sRC)\,U_P$.
- At N (KCL): what arrives through the first $R$ leaves through the second $R$ and
  through $C_1$ to ground:
  $\dfrac{U_i - U_N}{R} = \dfrac{U_N - U_P}{R} + sC\,U_N$.

Multiply by $R$, put in $U_N$, and collect: $U_i = U_P\left[1 + 3sRC + (sRC)^2\right]$.
So:

::: formula Simple second-order low-pass filter | 二阶低通滤波器
$$A_u(s) = \frac{A_{up}}{1 + 3sCR + (sCR)^2},\qquad \dot{A}_u = \frac{A_{up}}{1 - \left(\dfrac{f}{f_0}\right)^2 + \j 3\dfrac{f}{f_0}}$$
--
A_{up} | passband gain, $1 + R_f/R_1$ |
f_0 | characteristic frequency (特征频率), $\frac{1}{2\pi RC}$ | Hz
:::

Here $\omega_0 = 2\pi f_0 = 1/RC$, so $sRC = \j\omega/\omega_0 = \j f/f_0$, and
$(sRC)^2 = -(f/f_0)^2$. The highest power of $s$ is 2: a second-order filter, falling
at −40 dB per decade far above $f_0$.

## Why the simple filter cuts off too early

The cutoff $f_H$ is where $|\dot{A}_u| = A_{up}/\sqrt{2}$, that is, where the
denominator's size is $\sqrt{2}$:

$$\left|1 - \left(\frac{f_H}{f_0}\right)^2 + \j 3\frac{f_H}{f_0}\right| = \sqrt{2}$$

::: example Solving for the cutoff of the simple second-order filter
Find $f_H/f_0$, then $f_H$ for $R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$.
== Square both sides ==
Let $x = f_H/f_0$: $(1 - x^2)^2 + 9x^2 = 2$, so $x^4 + 7x^2 - 1 = 0$.
== Solve the quadratic in x² ==
$x^2 = \dfrac{-7 + \sqrt{49 + 4}}{2} = \dfrac{-7 + 7.280}{2} = 0.140$, so
$x = 0.374$.
== The result ==
$f_H \approx 0.37 f_0$. With $f_0 = \dfrac{1}{2\pi \times 10^4 \times 10^{-8}} = 1.59\ \text{kHz}$,
$f_H = 0.374 \times 1591 = 596\ \text{Hz}$.
:::

::: formula Cutoff of the simple second-order low-pass filter | 二阶低通滤波器的上限截止频率
$$f_H \approx 0.37 f_0$$
--
f_H | upper cutoff frequency (上限截止频率) | Hz
f_0 | characteristic frequency, $\frac{1}{2\pi RC}$ | Hz
:::

That is the weakness. The −40 dB/decade straight-line asymptote turns at $f_0$, but
the real curve starts sagging far earlier, at $0.37 f_0$, and rounds off slowly: at
$f_0$ itself the gain is already $1/3$ of $A_{up}$ (−9.5 dB). The transition band is
wide and the passband edge is soft.

The cure, from the slides: if we could **raise the gain a little near $f = f_0$**, the
sagging part would be lifted back up, $f_H$ would move towards $f_0$, and the
transition band would shrink.

## The voltage-controlled second-order low-pass filter

The trick is to move the bottom of $C_1$ from ground to the op-amp's **output**.

::: circuit Voltage-controlled second-order low-pass filter (压控型二阶低通滤波电路)
A1 0,6 0,2 uI
Ra 0,2 4,2 10k
Rb 4,2 8,2 10k
W 8,2 12,2
C1 4,2 4,0 10n
W 4,0 18,0 18,3
C2 8,2 8,6 10n
W 0,6 8,6
G 0,6
U1 opamp 12,3 plus-top
W 12,4 12,6
Rf 12,6 18,6 10k
W 18,6 18,3 20,3
W 16,3 18,3
R1 12,6 12,9 10k
G 12,9
label N 4,2
label uO 20,3
:::

Now $C_1$ feeds part of the output back to node N. The output is in phase with the
signal at the $+$ input (a non-inverting amplifier), so a rise at N makes the output
rise, which pushes N up further through $C_1$: this is
{{term positive feedback | 正反馈}}. How strong it is depends on frequency:

- **At very low frequencies** $C_1$'s impedance is huge, the feedback path is
  practically open, and the gain is just the passband gain $A_{up}$.
- **Near $f_0$** the feedback is strongest and lifts the gain, exactly where the simple
  filter sagged.
- **Far above $f_0$** $C_2$ shorts the $+$ input towards ground, the signal reaching the
  amplifier (and hence the feedback) dies away, and the gain falls at −40 dB/decade.

::: define Voltage-controlled filter | 压控型滤波器
An active filter in which the op-amp works as a voltage-controlled voltage source
(VCVS: a non-inverting amplifier with a fixed gain $A_{up}$), and one RC element is
returned to the output to add frequency-dependent positive feedback. Known in English
as the Sallen–Key filter.
:::

**Transfer function.** The node equations are the same as before, except $C_1$'s
current is now $sC(U_N - U_o)$ instead of $sC\,U_N$, with $U_o = A_{up}U_P$:

$$\frac{U_i - U_N}{R} = \frac{U_N - U_P}{R} + sC\,(U_N - A_{up}U_P),\qquad U_N = (1 + sRC)\,U_P$$

Collecting terms as before gives $U_i = U_P\left[1 + (3 - A_{up})sRC + (sRC)^2\right]$:
the only change is that the middle coefficient $3$ has become $3 - A_{up}$.

::: formula Voltage-controlled second-order low-pass filter | 压控型二阶低通滤波器
$$A_u(s) = \frac{A_{up}}{1 + (3 - A_{up})sRC + (sRC)^2},\qquad \dot{A}_u = \frac{A_{up}}{1 - \left(\dfrac{f}{f_0}\right)^2 + \j(3 - A_{up})\dfrac{f}{f_0}}$$
--
A_{up} | passband gain, $1 + R_f/R_1$ |
f_0 | characteristic frequency, $\frac{1}{2\pi RC}$ | Hz
R, C | the equal resistors and equal capacitors of the two RC sections | Ω, F
:::

## The quality factor Q

The number $3 - A_{up}$ controls everything about the shape near $f_0$, so it gets a
name. Its reciprocal is the {{term quality factor | 品质因数}}.

::: formula Quality factor of the voltage-controlled filter | 压控型滤波器的品质因数
$$Q = \frac{1}{3 - A_{up}}$$
--
Q | quality factor (品质因数) |
A_{up} | passband gain, $1 + R_f/R_1$ |
:::

::: define Quality factor | 品质因数
For a second-order filter, the ratio of the gain at the characteristic frequency $f_0$
to the passband gain, $Q = \left|\dot{A}_u(f_0)\right| / A_{up}$. It measures how
sharply the response turns (or peaks) at $f_0$.
:::

At $f = f_0$ the real part $1 - (f/f_0)^2$ vanishes, and

::: formula Gain at the characteristic frequency | 特征频率处的电压放大倍数
$$\left|\dot{A}_u\right|_{f = f_0} = \left|\frac{A_{up}}{3 - A_{up}}\right| = \left|Q A_{up}\right|$$
--
\left\vert \dot{A}_u \right\vert_{f=f_0} | gain at $f_0$ |
Q | quality factor |
:::

So the gain at $f_0$ is $Q$ times the passband gain, or $20\lg Q$ dB above it.

- $Q = 1/3$ ($A_{up} = 0$ in the formula): the simple filter, −9.5 dB at $f_0$.
- $Q = 0.5$: −6 dB at $f_0$, still sagging.
- $Q = 0.707$: −3 dB at $f_0$, so $f_H = f_0$ exactly; the flattest possible passband
  with no bump (the Butterworth response).
- $Q = 1$: 0 dB at $f_0$; a slight bump of about 1.25 dB just below $f_0$.
- $Q = 2$, $Q = 5$: peaks of about +6 dB and +14 dB near $f_0$.

When $2 < A_{up} < 3$, $Q > 1$ and $\left|\dot{A}_u\right|_{f_0} > A_{up}$: at $f_0$ the
closed-loop gain rises above the passband gain, because the positive feedback is
strongest there.

Slide $Q$ to see it. The axis is $\lg(f/f_0)$; the other two curves are the
first-order filter and the simple second-order filter, for comparison.

::: plot Second-order low-pass: 20 lg|A/Aup| against lg(f/f₀)
x: -1.5 .. 1.5
y: -60 .. 25
xlabel: lg(f/f₀)
ylabel: 20 lg|A/Aup| (dB)
VCVS(x) = -10 lg((1 - 10^(2*x))^2 + 10^(2*x) / Q^2)
simple(x) = -10 lg((1 - 10^(2*x))^2 + 9 * 10^(2*x))
first(x) = -10 lg(1 + 10^(2*x))
slider Q: 0.3 .. 10 = 1 | | log
:::

::: callout key Choose Q = 1 (or 0.707)
The slides recommend $Q = 1$: the passband stays fairly flat (a bump of about 1 dB),
$f_H$ is pulled up close to $f_0$ (to $1.27f_0$), and the transition band is squeezed.
$Q = 0.707$ gives the flattest passband with $f_H = f_0$. Large $Q$ gives a tall
resonant peak, which is rarely wanted in a low-pass filter.
:::

## Why A_up must stay below 3

As $A_{up}$ climbs towards 3, the term $(3 - A_{up})$ shrinks and $Q$ grows without
limit. At $A_{up} = 3$ the imaginary part of the denominator is zero for every
frequency, and at $f = f_0$ the whole denominator is zero: infinite gain. A circuit
with infinite gain at one frequency needs no input to produce an output at that
frequency: it {{term self-oscillates | 自激振荡}}. Above 3 the damping term is negative
and oscillations grow until the op-amp saturates. Either way it is no longer a filter.

::: law Stability condition of the voltage-controlled filter | 压控型滤波器的稳定条件
A voltage-controlled second-order low-pass or high-pass filter (equal R, equal C)
needs $A_{up} = 1 + R_f/R_1 < 3$, that is $R_f < 2R_1$; at $A_{up} = 3$ it oscillates.
:::

::: callout pitfall "More gain" is not always better
Raising $R_f$ to get more passband gain also raises $Q$. Past $R_f = 2R_1$ the filter
becomes an oscillator. Choose the passband gain carefully, and use a separate
amplifier stage if you need more gain.
:::

::: example Analysing a voltage-controlled low-pass filter
In the circuit above, $R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$,
$R_1 = R_f = 10\ \text{kΩ}$. Find $A_{up}$, $f_0$, $Q$, the gain at $f_0$, and $f_H$.
== Passband gain ==
$A_{up} = 1 + 10/10 = 2$ (6.02 dB).
== Characteristic frequency ==
$f_0 = \dfrac{1}{2\pi \times 10^4 \times 10^{-8}} = 1.59\ \text{kHz}$.
== Quality factor ==
$Q = \dfrac{1}{3 - 2} = 1$.
== Gain at f₀ ==
$\left|\dot{A}_u\right|_{f_0} = QA_{up} = 2$: the same as the passband gain (0 dB
relative).
== Cutoff ==
With $x = f_H/f_0$: $(1 - x^2)^2 + x^2 = 2$, so $x^4 - x^2 - 1 = 0$,
$x^2 = \frac{1 + \sqrt{5}}{2} = 1.618$, $x = 1.27$. So
$f_H = 1.27 \times 1.59 = 2.02\ \text{kHz}$, compared with 596 Hz for the simple
filter with the same R and C.
:::

::: example Designing for Q = 0.707
With $R_1 = 10\ \text{kΩ}$, what $R_f$ gives $Q = 0.707$? Where is the cutoff?
== Required gain ==
$3 - A_{up} = 1/Q = 1.414$, so $A_{up} = 1.586$.
== Feedback resistor ==
$R_f = (A_{up} - 1)R_1 = 0.586 \times 10 = 5.86\ \text{kΩ}$.
== Cutoff ==
At $f = f_0$ the gain is $QA_{up} = A_{up}/\sqrt{2}$: exactly the −3 dB point, so
$f_H = f_0$.
:::

Play with the parts:

::: explore Voltage-controlled second-order low-pass filter
slider R: 1k .. 100k = 10k | Ω | log
slider C: 1n .. 1u = 10n | F | log
slider R1: 1k .. 100k = 10k | Ω | log
slider Rf: 0 .. 19.9k = 10k | Ω
Aup = 1 + Rf / R1 | | Passband gain
f0 = 1 / (2 pi R C) | Hz | Characteristic frequency
Q = 1 / (3 - Aup) | | Quality factor
A0 = Q Aup | | Gain at f₀
peak = 20 lg(Q) | dB | Gain at f₀ relative to the passband
:::

Keep $R_f$ below $2R_1$ when you change $R_1$; otherwise $Q$ comes out negative,
the mathematical sign that the circuit oscillates.

## Second-order high-pass filters

A {{term high-pass filter | 高通滤波器}} passes components above the cutoff and
suppresses low frequencies. The low-pass and high-pass circuits are **duals**
(对偶性): swap every resistor and capacitor in the frequency-setting network of an
LPF and you get an HPF.

::: law RC duality of low-pass and high-pass filters | 低通与高通滤波器的对偶性
Exchanging the resistors and capacitors of a low-pass filter's RC network gives a
high-pass filter; in the transfer function, $sRC$ is replaced by $1/(sRC)$.
:::

::: circuit Voltage-controlled second-order high-pass filter (二阶压控型高通滤波电路)
A1 0,6 0,2 uI
Ca 0,2 4,2 10n
Cb 4,2 8,2 10n
W 8,2 12,2
Ra 4,2 4,0 10k
W 4,0 18,0 18,3
Rb 8,2 8,6 10k
W 0,6 8,6
G 0,6
U1 opamp 12,3 plus-top
W 12,4 12,6
Rf 12,6 18,6 10k
W 18,6 18,3 20,3
W 16,3 18,3
R1 12,6 12,9 10k
G 12,9
label N 4,2
label uO 20,3
:::

The input goes through $C$, node N, $C$ to the $+$ input; one $R$ returns from N to
the output (the positive feedback path), the other goes from the $+$ input to
ground. Putting $1/(sRC)$ for $sRC$ in the low-pass result and multiplying top and
bottom by $(sRC)^2$:

::: formula Voltage-controlled second-order high-pass filter | 压控型二阶高通滤波器
$$A_u(s) = \frac{(sCR)^2}{1 + (3 - A_{up})sCR + (sCR)^2}\,A_{up},\qquad A_{up} = 1 + \frac{R_f}{R_1},\quad f_0 = \frac{1}{2\pi RC},\quad Q = \frac{1}{3 - A_{up}}$$
--
A_{up} | passband gain, reached for $f \gg f_0$ (通带放大倍数) |
f_0 | characteristic frequency | Hz
Q | quality factor |
:::

Everything carries over: the same $f_0$, the same $Q = 1/(3 - A_{up})$, the same gain
$QA_{up}$ at $f_0$, the same stability condition $A_{up} < 3$, and $Q = 1$ as the usual
choice. Only the direction is reversed: the response rises at **+40 dB/decade** from
low frequencies and levels off at $A_{up}$ above $f_0$.

::: plot Second-order high-pass: 20 lg|A/Aup| against lg(f/f₀)
x: -1.5 .. 1.5
y: -60 .. 25
xlabel: lg(f/f₀)
ylabel: 20 lg|A/Aup| (dB)
VCVS(x) = 40*x - 10 lg((1 - 10^(2*x))^2 + 10^(2*x) / Q^2)
slider Q: 0.3 .. 10 = 1 | | log
:::

::: example A voltage-controlled high-pass filter
In the high-pass circuit, $R = 10\ \text{kΩ}$, $C = 10\ \text{nF}$, $R_1 = 10\ \text{kΩ}$,
$R_f = 15\ \text{kΩ}$. Find $A_{up}$, $f_0$, $Q$ and the gain at $f_0$ in dB.
== Gain and frequency ==
$A_{up} = 1 + 15/10 = 2.5$; $f_0 = 1.59\ \text{kHz}$ (same R and C as before).
== Q ==
$Q = \dfrac{1}{3 - 2.5} = 2$.
== Gain at f₀ ==
$QA_{up} = 5$, so $20\lg 5 = 14.0$ dB, which is $20\lg 2 = 6.0$ dB above the passband
gain ($20\lg 2.5 = 8.0$ dB). The response has a 6 dB peak at $f_0$.
:::

::: callout exam What to expect
Typical questions: given R, C, $R_1$, $R_f$, find $A_{up}$, $f_0$ and $Q$; find the
range of $R_f$ for which the filter is stable ($A_{up} < 3$); explain why moving $C_1$
to the output helps (positive feedback near $f_0$); name the filter from the
positions of R and C.
:::

::: cards Second-order low-pass and high-pass
Why go to second order? :: The gain falls at 40 dB/decade instead of 20, so the transition band is narrower
Simple second-order LPF transfer function :: $A_u(s) = \frac{A_{up}}{1 + 3sCR + (sCR)^2}$
Cutoff of the simple second-order LPF :: $f_H \approx 0.37 f_0$, far below $f_0$, with a slow, soft fall
Characteristic frequency of these filters :: $f_0 = \frac{1}{2\pi RC}$ ($\omega_0 = 1/RC$)
What makes a filter "voltage-controlled" (压控型)? :: $C_1$'s ground end goes to the op-amp output, giving positive feedback that is strongest near $f_0$
VCVS LPF transfer function :: $A_u(s) = \frac{A_{up}}{1 + (3 - A_{up})sRC + (sRC)^2}$
Quality factor of the VCVS filter :: $Q = \frac{1}{3 - A_{up}}$
Gain of the VCVS filter at f₀ :: $|QA_{up}|$, that is $20\lg Q$ dB relative to the passband
Stability condition of the VCVS filter :: $A_{up} < 3$, i.e. $R_f < 2R_1$; at 3 it self-oscillates
Usual choice of Q :: $Q = 1$ (flat-ish passband, $f_H$ close to $f_0$); $Q = 0.707$ gives the flattest passband with $f_H = f_0$
How to get an HPF from an LPF :: Swap R and C; replace $sRC$ by $1/(sRC)$
VCVS HPF transfer function :: $A_u(s) = \frac{(sCR)^2}{1 + (3 - A_{up})sCR + (sCR)^2}A_{up}$
Slope of a second-order HPF below f₀ :: +40 dB per decade
:::

::: quiz Check yourself: second-order filters
? A simple (non-voltage-controlled) second-order low-pass filter has $R = 22$ kΩ and $C = 4.7$ nF. What is its cutoff frequency $f_H$?
answer: 576 Hz
tolerance: 2%
> $f_0 = \frac{1}{2\pi \times 22000 \times 4.7 \times 10^{-9}} = 1539$ Hz, and $f_H = 0.374 f_0 = 576$ Hz.

? A voltage-controlled low-pass filter has $R_1 = 10$ kΩ and $R_f = 12$ kΩ. What is its quality factor $Q$?
answer: 1.25
tolerance: 1%
> $A_{up} = 1 + 12/10 = 2.2$, so $Q = \frac{1}{3 - 2.2} = 1.25$.

? For the same filter, how many dB above the passband gain is the gain at $f_0$?
answer: 1.94 dB
tolerance: 2%
> The gain at $f_0$ is $QA_{up}$, so relative to $A_{up}$ it is $20\lg Q = 20\lg 1.25 = 1.94$ dB.

? Write $Q$ of the voltage-controlled filter in terms of $R_f$ and $R_1$.
expression: R1 / (2 R1 - Rf)
variables: Rf, R1
> $A_{up} = 1 + R_f/R_1$, so $3 - A_{up} = 2 - R_f/R_1 = (2R_1 - R_f)/R_1$, and $Q = \frac{R_1}{2R_1 - R_f}$.

? With $R_1 = 10$ kΩ, what is the largest $R_f$ before the voltage-controlled filter starts to oscillate?
answer: 20 kΩ
tolerance: 1%
> It oscillates at $A_{up} = 3$, i.e. $R_f/R_1 = 2$, $R_f = 20$ kΩ. A working filter needs $R_f < 20$ kΩ.

? Why does moving $C_1$'s ground end to the output raise the gain near $f_0$?
- [x] It adds positive feedback, which is strongest near $f_0$
- [ ] It adds negative feedback, which lowers the output impedance
- [ ] It removes one RC section, so the filter becomes first order
> At low frequency $C_1$ is almost open and does nothing; far above $f_0$, $C_2$ kills the signal at the $+$ input. Near $f_0$ the in-phase output fed back through $C_1$ reinforces node N, lifting the gain.

? Which value of $Q$ makes the voltage-controlled low-pass filter's cutoff exactly equal to $f_0$?
answer: 0.707
tolerance: 1%
> At $f_0$ the gain is $QA_{up}$. It equals $A_{up}/\sqrt{2}$ (the −3 dB point) when $Q = 1/\sqrt{2} = 0.707$.

? How is a second-order high-pass filter obtained from the low-pass one?
- [x] Exchange the resistors and capacitors of the RC network
- [ ] Exchange $R_1$ and $R_f$
- [ ] Feed the signal into the inverting input instead
> RC duality: swapping R and C replaces $sRC$ by $1/(sRC)$. The amplifier ($R_1$, $R_f$) stays the same, so $A_{up}$ and $Q$ keep their formulas.

? A voltage-controlled HPF uses $R = 4.7$ kΩ and $C = 22$ nF. What is $f_0$?
answer: 1.54 kHz
tolerance: 2%
> $f_0 = \frac{1}{2\pi \times 4700 \times 22 \times 10^{-9}} = 1539$ Hz.
:::

---
title: What an amplifier is
zh: 放大的概念与性能指标
summary: What "amplifying" really means, and the numbers that describe any amplifier: its gains, input and output resistance, distortion, maximum output and bandwidth.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

Before building an amplifier from a transistor, we need to agree on what a good one
is. This lesson treats the amplifier as a closed box with an input and an output and
asks: how much bigger is the output, how much does the box load the signal source, how
well can it drive a load, how faithful is the copy, and over what frequencies does it
work? These **performance indices** are exactly what every later lesson calculates
($A_u$, $R_i$, $R_o$), so it pays to understand what each one means physically.

## The idea of amplification

A microphone gives a few millivolts; a loudspeaker needs volts and amps. An
{{term amplifier | 放大电路}} turns the small signal into a large one. Three things are
true of every amplifier:

1. **The output is bigger.** Its voltage or current amplitude is larger, and above all
   its **power** is larger: the load gets more energy than the source gave.
2. **The output has the same shape.** A copy that changes shape is distorted
   ({{zh 失真}}), and an amplifier that distorts has failed, however big its output.
3. **The extra energy comes from the DC supply**, not from the signal. The transistor
   is a valve: the small input signal *controls* how much of the supply's energy flows
   into the load.

Think of a tap: a small twist of the handle controls a large flow of water, and the
water comes from the mains, not from your hand.

::: law The essence of amplification | 放大的本质
Amplification is the **control and conversion of energy**: a small input signal,
through the transistor, controls the conversion of the DC supply's energy into signal
energy delivered to the load.
:::

## The amplifier as a two-port

Any amplifier fits one picture. A **signal source** (a voltage $\dot U_s$ with internal
resistance $R_s$) drives the input port; the **amplifier** sits in the middle, powered by
a **DC supply**; a **load** $R_L$ hangs on the output port. The load is usually drawn
with the amplifier but is not a necessary part of it.

Seen from outside, the amplifier is a two-port network containing a controlled source
({{zh 含有受控源的双端口网络}}). Its input behaves like a resistor $R_i$; its output
behaves like a voltage source $\dot U_o'$ (the open-circuit output) in series with a
resistor $R_o$, a Thévenin equivalent.

::: circuit The amplifier model: source, input resistance, Thévenin output, load
A1 0,6 0,2 Us
R1 0,0 4,0 Rs
W 0,2 0,0
R2 4,0 4,6 Ri
E1 8,6 8,2 Uo'
W 8,2 8,0
R3 8,0 12,0 Ro
R4 12,0 12,6 RL
W 0,6 12,6
G 6,6
label ui 4,0
label uo 12,0
:::

The source $U_o'$ is controlled by the input (it is $A_{uo}\dot U_i$, where $A_{uo}$ is
the gain with no load), so it is drawn as a diamond: a controlled source.

We describe the signals with phasors: $\dot U_i$, $\dot I_i$ at the input (current
flowing in) and $\dot U_o$, $\dot I_o$ at the output (current flowing out into the load).

## Gain

The {{term gain | 增益}} or magnification ({{zh 放大倍数}}) compares output with input.
Since either side can be a voltage or a current, there are four ratios, plus the power
gain:

::: formula The five gains of an amplifier | 放大电路的五种增益
$$\dot A_{uu} = \frac{\dot U_o}{\dot U_i}, \quad \dot A_{ii} = \frac{\dot I_o}{\dot I_i}, \quad A_p = \frac{P_o}{P_i} = \frac{U_o I_o}{U_i I_i}, \quad \dot A_{ui} = \frac{\dot U_o}{\dot I_i}, \quad \dot A_{iu} = \frac{\dot I_o}{\dot U_i}$$
--
\dot A_{uu} | voltage gain, usually just written $\dot A_u$ ({{zh 电压增益}}) | —
\dot A_{ii} | current gain, usually written $\dot A_i$ ({{zh 电流增益}}) | —
A_p | power gain ({{zh 功率增益}}) | —
\dot A_{ui} | transresistance gain ({{zh 互阻增益}}) | Ω
\dot A_{iu} | transconductance gain ({{zh 互导增益}}) | S
:::

The first subscript says what comes out, the second what goes in. The "trans-" gains
mix a voltage with a current, so they have units: ohms and siemens. In this course the
one that matters most by far is the voltage gain $\dot A_u$. Its sign carries the phase:
a negative $\dot A_u$ means the output is inverted (180° out of phase with the input).

::: callout note Gain in decibels
Gains are often quoted in decibels: $20\lg|\dot A_u|$ dB for voltage or current,
$10\lg A_p$ dB for power. A voltage gain of 100 is 40 dB. The slides don't use this
yet, but datasheets and the frequency-response lessons do.
:::

::: example The five gains of one amplifier
An amplifier takes $U_i = 10$ mV and $I_i = 5\ \mu$A from its source and delivers
$U_o = 1$ V into $R_L = 2$ kΩ (all RMS values). Find all five gains.
== Output current ==
$I_o = U_o/R_L = 1/2000 = 0.5$ mA.
== Voltage and current gains ==
$A_u = 1\text{ V}/10\text{ mV} = 100$; $A_i = 0.5\text{ mA}/5\ \mu\text{A} = 100$.
== Power gain ==
$A_p = \dfrac{U_o I_o}{U_i I_i} = A_u A_i = 100 \times 100 = 10\,000$.
== Transresistance and transconductance ==
$A_{ui} = 1\text{ V}/5\ \mu\text{A} = 200$ kΩ; $A_{iu} = 0.5\text{ mA}/10\text{ mV} = 50$ mS.
:::

## Input resistance

Looking into the input terminals, the source sees some resistance: the amplifier's
{{term input resistance | 输入电阻}}.

::: define Input resistance | 输入电阻
$R_i = \dot U_i/\dot I_i$: the equivalent resistance seen looking into the amplifier's
input terminals. It tells how much current the amplifier draws from the signal source:
the larger $R_i$, the less current it draws.
:::

Why care? Because $R_s$ and $R_i$ form a voltage divider. Only part of the source
voltage reaches the amplifier:

$$\dot U_i = \frac{R_i}{R_s + R_i}\,\dot U_s$$

So the gain from the source's own voltage, the {{term source voltage gain | 源电压放大倍数}},
is smaller than $\dot A_u$:

::: formula Source voltage gain | 源电压放大倍数
$$\dot A_{us} = \frac{\dot U_o}{\dot U_s} = \frac{R_i}{R_s + R_i}\,\dot A_u$$
--
\dot A_{us} | gain from the source voltage to the output | —
R_s | internal resistance of the signal source | Ω
R_i | input resistance of the amplifier | Ω
\dot A_u | voltage gain from $\dot U_i$ to $\dot U_o$ | —
:::

For a voltage source we want $R_i \gg R_s$, so nearly all of $\dot U_s$ arrives.

::: example Losing signal at the input
A microphone with $R_s = 1$ kΩ drives an amplifier with $\dot A_u = -50$. Find
$\dot A_{us}$ when (a) $R_i = 4$ kΩ, (b) $R_i = 99$ kΩ.
== (a) ==
$\dfrac{R_i}{R_s + R_i} = \dfrac{4}{5} = 0.8$, so $\dot A_{us} = 0.8 \times (-50) = -40$:
a fifth of the signal is lost across $R_s$.
== (b) ==
$\dfrac{99}{100} = 0.99$, so $\dot A_{us} = -49.5$: almost nothing is lost.
:::

## Output resistance

Seen from the load, the amplifier is a source with an internal resistance: its
{{term output resistance | 输出电阻}}.

::: define Output resistance | 输出电阻
$R_o$: the equivalent internal resistance of the amplifier seen from its output
terminals, with the signal source set to zero and the load removed. It describes the
amplifier's ability to drive a load ({{zh 带负载能力}}): the smaller $R_o$, the less
the output drops when a load is connected.
:::

$R_o$ and $R_L$ are a divider too: $\dot U_o = \dfrac{R_L}{R_o + R_L}\dot U_o'$. A large
$R_o$ means a heavy load (small $R_L$) pulls the output down a lot.

There are two ways to find $R_o$.

**Method 1: by definition** (for calculations). Short the source voltage
($\dot U_s = 0$) but **keep $R_s$**; open the load ($R_L = \infty$); put an imaginary
test voltage $\dot U_o$ on the output and work out the current $\dot I_o$ it drives in:

::: formula Output resistance by definition | 输出电阻的定义
$$R_o = \frac{\dot U_o}{\dot I_o}\Bigg|_{\dot U_s = 0,\ R_L = \infty}$$
--
\dot U_o | test voltage applied to the output | V
\dot I_o | current the test voltage drives into the output | A
:::

::: callout pitfall Short the source, keep its resistance
Setting $\dot U_s = 0$ removes the source's voltage only. $R_s$ stays in the circuit,
and in some amplifiers (the emitter follower, lesson 2.7) it changes $R_o$.
:::

**Method 2: by experiment.** Measure the output voltage with no load, $U_o'$, then with
a known load $R_L$, $U_o$. From the divider $U_o = U_o' R_L/(R_o + R_L)$:

::: formula Output resistance by measurement | 实验法求输出电阻
$$R_o = \left(\frac{U_o'}{U_o} - 1\right) R_L$$
--
U_o' | output voltage with the load removed | V
U_o | output voltage with load $R_L$ connected | V
R_L | the known load | Ω
:::

Try it: the source and $R_o$ below are the amplifier's Thévenin output. Open and close
the switch to remove and connect the load, and watch the output node.

::: circuit-sim Measuring Ro: open-circuit output, then loaded
V1 0,4 0,0 2V
R1 0,0 4,0 1k [100..10k]
W 4,0 8,0
S1 8,0 8,2 closed
R2 8,2 8,4 3k [100..20k]
W 0,4 8,4
G 0,4
label uo 4,0
:::

With $R_o = 1$ kΩ and $R_L = 3$ kΩ, the output falls from 2 V to 1.5 V when the load
is connected.

::: example Finding Ro from two measurements
An amplifier's output is 2.0 V with no load and 1.5 V with a 3 kΩ load. Find $R_o$.
== Apply the formula ==
$R_o = \left(\dfrac{2.0}{1.5} - 1\right) \times 3 = \dfrac{1}{3} \times 3 = 1$ kΩ.
== Check with the divider ==
$2.0 \times \dfrac{3}{1 + 3} = 1.5$ V ✓.
:::

::: callout key Ri big, Ro small
A good *voltage* amplifier has a **large $R_i$** (it hardly loads the source) and a
**small $R_o$** (the load hardly loads it).
:::

::: callout note Only meaningful while amplifying
Gain, $R_i$ and $R_o$ are AC parameters measured with sine waves. They only mean
something while the amplifier is in its amplifying state and the output is not
distorted.
:::

## Nonlinear distortion

A transistor's curves aren't straight lines, so a pure sine wave in comes out slightly
bent. A bent periodic wave is the original frequency (the fundamental, {{zh 基波}})
plus harmonics ({{zh 谐波}}) at 2, 3, … times that frequency. The more harmonics, the
worse the distortion.

::: define Total harmonic distortion | 非线性失真系数
THD: for a sine input, the ratio of the total of all harmonics in the output to its
fundamental, as a percentage.
:::

::: formula Total harmonic distortion | 非线性失真系数
$$\text{THD} = \frac{\sqrt{U_2^2 + U_3^2 + \cdots}}{U_1} \times 100\%$$
--
U_1 | RMS value of the fundamental | V
U_2, U_3 | RMS values of the 2nd, 3rd, … harmonics | V
:::

::: example THD of an output
An output contains a 1 V fundamental, a 50 mV second harmonic and a 20 mV third
harmonic (RMS). Find the THD.
== Total harmonics ==
$\sqrt{0.05^2 + 0.02^2} = \sqrt{0.0025 + 0.0004} = \sqrt{0.0029} = 0.0539$ V.
== Ratio ==
$\text{THD} = 0.0539/1 \times 100\% = 5.4\%$.
:::

## Maximum undistorted output

Push a bigger and bigger input in and eventually the output clips: the transistor runs
into saturation or cutoff. The largest output that still meets the distortion spec is
the {{term maximum undistorted output | 最大不失真输出幅度}}, written $U_{om(max)}$ (or
$I_{om(max)}$ for current). Lesson 2.5 shows how to read it off the transistor's curves.

## Bandwidth

An amplifier's gain depends on frequency. In the middle range it is flat at
$A_0$ (the mid-band gain); at low frequencies the coupling capacitors start to block the
signal, and at high frequencies the transistor's junction capacitances shunt it, so the
gain falls at both ends.

::: define Cutoff frequencies and bandwidth | 截止频率与通频带
The **lower cutoff frequency** $f_L$ ({{zh 下限截止频率}}) and **upper cutoff
frequency** $f_H$ ({{zh 上限截止频率}}) are where the gain has fallen to
$A_0/\sqrt{2} \approx 0.7A_0$. The band between them is the **bandwidth** BW
({{zh 通频带}}).
:::

::: formula Bandwidth | 通频带
$$A(f_L) = A(f_H) = \frac{A_0}{\sqrt{2}} \approx 0.7A_0, \qquad BW = f_H - f_L \approx f_H$$
--
A_0 | mid-band gain | —
f_L | lower cutoff frequency | Hz
f_H | upper cutoff frequency | Hz
BW | bandwidth | Hz
:::

Because $f_H$ is usually thousands of times $f_L$, $BW \approx f_H$. The curve below is
drawn against $\lg f$ (so $x = 3$ is 1 kHz) as frequency-response graphs usually are;
the flat line is the $0.7A_0$ level, and the curve crosses it at $f_L$ and $f_H$.

::: plot Gain against frequency (x = lg f)
x: 0 .. 7
xlabel: lg f (f in Hz)
ylabel: A
A(x) = A0 / sqrt((1 + (fL / 10^x)^2) (1 + (10^x / fH)^2))
cut(x) = 0.707 A0
slider A0: 10 .. 100 = 50
slider fL: 5 .. 500 = 20 | Hz | log
slider fH: 10000 .. 1000000 = 100000 | Hz | log
:::

::: example Reading a bandwidth
An amplifier has a mid-band gain of 80 and its gain falls to 56.6 at 20 Hz and at
150 kHz. Find the cutoff frequencies and the bandwidth.
== Check the level ==
$0.707 \times 80 = 56.6$: these are the cutoff points. $f_L = 20$ Hz, $f_H = 150$ kHz.
== Bandwidth ==
$BW = f_H - f_L = 150\,000 - 20 = 149\,980$ Hz $\approx 150$ kHz $= f_H$.
:::

::: callout exam For the exam
Know each index by its definition and Chinese name, the conditions in the definition of
$R_o$ ($\dot U_s = 0$ with $R_s$ kept, $R_L = \infty$), the measured-$R_o$ formula and
$\dot A_{us} = \dfrac{R_i}{R_s + R_i}\dot A_u$.
:::

::: cards What an amplifier is
The essence of amplification :: Control and conversion of energy: the input controls how the DC supply's energy reaches the load.
Where does the output's extra energy come from? :: The DC power supply.
The five gains :: Voltage $U_o/U_i$, current $I_o/I_i$, power $P_o/P_i$, transresistance $U_o/I_i$ (Ω), transconductance $I_o/U_i$ (S).
Input resistance :: $R_i = \dot U_i/\dot I_i$; large $R_i$ draws little current from the source.
Output resistance :: The amplifier's internal resistance seen from the output; small $R_o$ = strong load-driving ability.
Conditions for finding $R_o$ by definition :: $\dot U_s = 0$ (keep $R_s$), $R_L = \infty$, apply a test voltage at the output.
$R_o$ from two measurements :: $R_o = (U_o'/U_o - 1)R_L$
Source voltage gain :: $\dot A_{us} = \dfrac{R_i}{R_s+R_i}\dot A_u$
THD :: $\sqrt{U_2^2+U_3^2+\cdots}/U_1 \times 100\%$
$f_L$ and $f_H$ :: Frequencies where the gain falls to $A_0/\sqrt{2} \approx 0.7A_0$.
Bandwidth :: $BW = f_H - f_L \approx f_H$
:::

::: quiz What an amplifier is
? Where does the extra power in an amplifier's output come from?
- [x] The DC power supply
- [ ] The input signal
- [ ] The transistor itself
- [ ] The load
> The transistor only controls; the energy is converted from the DC supply. That's
> "the control and conversion of energy".

? An amplifier gives 2 V into 1 kΩ from an input of 20 mV, drawing 2 μA. What is its power gain?
answer: 100000
tolerance: 1%
> $A_u = 2/0.02 = 100$; $I_o = 2$ mA, so $A_i = 2\text{ mA}/2\ \mu\text{A} = 1000$;
> $A_p = A_u A_i = 10^5$.

? What is the unit of the transconductance gain $\dot A_{iu}$?
- [x] Siemens
- [ ] Ohms
- [ ] None: it is a pure number
> $\dot A_{iu} = \dot I_o/\dot U_i$, a current over a voltage: siemens.

? An amplifier's output is 4 V unloaded and 3.2 V with a 2 kΩ load. What is $R_o$?
answer: 500 Ω
tolerance: 1%
> $R_o = (4/3.2 - 1) \times 2\text{ k} = 0.25 \times 2\text{ k} = 500$ Ω.

? $R_s = 600$ Ω, $R_i = 1.4$ kΩ, $\dot A_u = -60$. What is $\dot A_{us}$?
answer: -42
tolerance: 1%
> $\dot A_{us} = \dfrac{1.4}{0.6 + 1.4} \times (-60) = 0.7 \times (-60) = -42$.

? Write $R_o$ in terms of the unloaded output $U$, the loaded output $u$ and the load $R$.
expression: (U/u - 1) R
variables: U, u, R
> $u = U R/(R_o + R)$, so $R_o + R = UR/u$ and $R_o = (U/u - 1)R$.

? When finding $R_o$ by definition, what do you do with the signal source?
- [x] Set its voltage to zero but keep its internal resistance $R_s$
- [ ] Remove it together with $R_s$
- [ ] Leave it working
> $\dot U_s = 0$ is a short across the source's voltage; $R_s$ stays connected.

? An output has fundamental 2 V and a single third harmonic of 0.1 V. What is the THD, in percent?
answer: 5
tolerance: 1%
> $0.1/2 \times 100\% = 5\%$.

? An amplifier's mid-band gain is 100. At what gain are $f_L$ and $f_H$ measured?
answer: 70.7
tolerance: 1%
> $A_0/\sqrt{2} = 100/1.414 = 70.7$.
:::

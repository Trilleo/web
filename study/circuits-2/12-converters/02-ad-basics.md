---
title: How A/D conversion works
zh: A/D转换的基本原理
summary: The four steps of A/D conversion - sampling (and the sampling theorem), holding (the sample-and-hold circuit and the LF198), quantising (the quantisation unit, round-down and rounding, the maximum error) and encoding.
source: 第10章 数→模和模→数转换, 10.4.1 (final-exam deck 第10 数模与模数转换器)
---

The D/A converter of lesson 12.1 turns numbers into voltages. The A/D converter does the
reverse, and it is harder, because an analogue signal is continuous twice over: it has
a value at *every instant*, and that value can be *any* voltage. A number can hold
neither. So every ADC, whatever its circuit, does two kinds of chopping: in time
(take a value now and then, and hold it still) and in amplitude (round it to one of a
fixed set of levels, and name that level with a code). This lesson goes through those
four steps, sampling, holding, quantising and encoding, and the two rules that come
with them: how often to sample, and how big the rounding error can be. Lesson 12.3 then
looks at the circuits that do it.

## From continuous to discrete

An 8-bit ADC with a 0–5 V input range takes the input voltage $U_I$ and outputs a
digital value $D_7 \sim D_0$ between 00000000 and 11111111. On the way, a quantity that
is **continuous in time and in amplitude** (时间上幅度上连续的模拟量) becomes one that is
**discrete in time and in amplitude** (时间上幅度上离散的数字量).

::: law The four steps of A/D conversion | A/D转换的四个步骤
An A/D conversion goes through **sampling** (采样), **holding** (保持), **quantising**
(量化) and **encoding** (编码), in that order. Sampling and holding make the signal
discrete in time; quantising and encoding make it discrete in amplitude.
:::

| Step | What it does | Discrete in |
|---|---|---|
| sampling (采样) | takes the signal's value at regular instants | time |
| holding (保持) | keeps each sampled value steady until the next sample | time |
| quantising (量化) | rounds each held value to a whole number of quantisation units | amplitude |
| encoding (编码) | writes that whole number as a binary code | amplitude |

In real converters the steps pair up in hardware: one circuit, the **sample-and-hold**
(采样-保持), does the first two, and the converter proper does the last two together
(量化-编码), often in the same act of comparing.

::: callout key Two chops
Sample-and-hold makes the signal discrete in **time**; quantise-and-encode makes it
discrete in **amplitude**. Exam questions on "the steps of A/D conversion" want all
four, in order.
:::

## Sampling and the sampling theorem

::: define Sampling | 采样
Taking the value of a continuous signal at regular instants, $f_s$ times a second
(the {{term sampling frequency | 采样频率}}), so that a signal continuous in time is
represented by a sequence of values.
:::

How often is often enough? Think of a film of a turning wheel. Filmed fast enough,
the wheel turns smoothly on screen. Filmed too slowly, it seems to turn slowly, or
even backwards: the frames have caught it at the wrong moments, and a fast motion has
been mistaken for a slow one. Sampling an electrical signal has the same danger.
A sine wave sampled fewer than twice per period gives samples that fit a slower sine
just as well, and nothing afterwards can tell which one was really there.

::: law Sampling theorem | 采样定理
To lose no information, the sampling frequency must be at least twice the frequency
of the highest frequency component in the input signal:
$f_s \ge 2 f_{i(\max)}$.
:::

::: formula Sampling theorem | 采样定理
$$f_s \ge 2 f_{i(\max)}$$
--
f_s | sampling frequency (取样频率) | Hz
f_{i(\max)} | frequency of the highest frequency component of the input (输入模拟信号的最高频率分量的频率) | Hz
:::

Twice the highest frequency is the theoretical minimum. Real converters sample
faster, commonly 3 to 5 times $f_{i(\max)}$, because the circuits that rebuild or
filter the signal aren't ideal.

Try it below. The input is a 1 Hz sine, and the stepped curve is what the converter
sees after sampling and holding. At 10 samples a second it follows the sine closely; at
4 it is coarse but still goes up and down once per second; under 2 (try 1.2) the
samples trace out a much slower wave that isn't there at all.

::: plot Sampling a 1 Hz sine at f_s samples per second (held between samples)
x: 0 .. 4
xlabel: t (s)
ylabel: u
u(t) = sin(2 pi t)
s(t) = sin(2 pi floor(t fs) / fs)
slider fs: 0.8 .. 20 = 10 | Hz
:::

::: example Choosing the sampling frequency
(a) Speech on a telephone line is limited to below 3.4 kHz. What is the lowest
sampling frequency? (b) An ADC samples at 44.1 kHz. What is the highest input
frequency it can handle?
== (a) ==
$f_s \ge 2\times3.4 = 6.8$ kHz. (Telephone systems use 8 kHz, a little above the
minimum.)
== (b) ==
$f_{i(\max)} \le f_s/2 = 22.05$ kHz, just above the 20 kHz limit of hearing; that is
why CD audio uses 44.1 kHz.
:::

::: callout pitfall The highest component, not the fundamental
$f_{i(\max)}$ is the highest frequency present in the signal, including harmonics and
noise. A 1 kHz square wave has components at 3, 5, 7 kHz…, so sampling it at 2 kHz
loses its shape.
:::

## Holding

A sample is an instant, but the next steps take time: comparing the voltage with
reference levels takes anything from nanoseconds to many clock periods. If the input
kept changing during that time, the converter would be measuring a moving target.
So each sample is **held** at a constant value until the next one.

::: define Sample-and-hold | 采样-保持
A circuit that, during a short sampling pulse, makes its output follow the input, and
between pulses keeps the last value constant, so the converter has a steady voltage
to quantise. Its output is the {{term sampled and stretched signal | 采样展宽信号}},
a staircase.
:::

The basic idea is a switch and a capacitor. The switch S, driven by a sampling clock
$CP_S$, closes briefly; the capacitor C charges to the input voltage. When S opens,
nothing can discharge C, so it holds that voltage; the ADC's encoding circuit reads
$u_s(t)$ from it and produces the $n$ output bits $d_{n-1} \dots d_0$.

::: circuit The basic sample-and-hold: switch S and capacitor C
A1 0,4 0,0 ui
S1 0,0 4,0 closed
C1 4,0 4,4 C
W 4,0 8,0
W 0,4 8,4
G 0,4
label us 8,0
:::

Between pulses, $u_s(t)$ is the staircase: each step is one sample, stretched until
the next.

Two things go wrong with a bare switch and capacitor: the source has to charge C
quickly through its own output resistance (so sampling is slow and inaccurate), and
whatever reads the capacitor draws current from it (so the held voltage sags, called
droop). Both are cured by putting op-amps around it.

### The LF198 integrated sample-and-hold

The LF198/298/398 family is an integrated sample-and-hold. Its circuit:

- **$A_1$**, an op-amp, takes the input $u_I(t)$ at its $+$ input. Its output $u_o'$
  goes through the electronic switch **K** to the hold capacitor **C** (in series with
  $R_2$, to ground).
- **$A_2$** is a voltage follower: its $+$ input is the capacitor's voltage, its $-$ input
  is tied to its output $u_O(t)$. Its input resistance is huge, so it hardly drains C.
- **$R_1$** feeds $u_O$ back to $A_1$'s $-$ input ($u_{N1}$), closing one loop round
  both op-amps.
- **$D_1$, $D_2$**, two diodes in opposite directions, connect $A_1$'s output $u_o'$ to
  its $-$ input.
- A control circuit (控制电路) driven by the logic signal $s(t)$ opens and closes K.

::: circuit LF198 sample-and-hold (switch K, drawn as S1, closed: sampling)
A1 0,11 0,7 uI
W 0,7 4,7
U1 opamp 4,6
W 4,5 4,2 12,2
D1 10,6 10,2 D1
D2 12,2 12,6 D2
W 8,6 14,6
S1 14,6 16,6 closed
W 16,6 16,10 18,10
R2 16,10 16,13 R2
C1 16,13 16,16 C
G 16,16
U2 opamp 18,9
W 18,8 18,7 22,7 22,9 24,9
R1 12,2 16,2 R1
W 16,2 22,2 22,7
G 0,11
label uo' 8,6
label uO 24,9
:::

**Sampling ($s(t)$ high, K closed).** The loop through $A_1$, K, $A_2$ and $R_1$ is
closed, and it is a follower as a whole: by the virtual short of $A_1$, its $-$ input
($u_{N1}$, which equals $u_O$, since no current flows in $R_1$) equals its $+$ input,
so $u_O = u_I$. The capacitor charges to $u_I$ and follows it. Because the feedback is
taken from the final output, any offset of $A_2$ is corrected by $A_1$, so the copy is
accurate. $A_1$'s low output resistance charges C fast.

**Holding ($s(t)$ low, K open).** C is cut off from $A_1$ and keeps its charge; $A_2$
draws almost nothing from it, so $u_O$ stays at the last sampled value. The diodes
matter here: with K open, $A_1$'s loop is broken, and as $u_I$ moves away from the held
value, $A_1$ would swing into saturation. When $u_o'$ gets about a diode drop away
from $u_{N1}$, $D_1$ or $D_2$ conducts and gives $A_1$ feedback of its own, keeping its
output close by. When K closes again, $A_1$ doesn't have to recover from saturation,
and sampling starts at once.

::: callout tip Reading the waveform
In the slide's timing picture, $s(t)$ is a train of narrow pulses. During each pulse
$u_O(t)$ follows the dashed $u_I(t)$ (采样); between pulses it is flat (保持). The
result is a staircase that tracks the sine, one step per pulse.
:::

## Quantising

The held voltage can still be any value: 2.4137… V. A digital number has only $2^n$
possible values. Quantising decides which of those values each held voltage gets.

::: define Quantisation | 量化
Expressing a sampled voltage as a whole-number multiple of a smallest unit: turning
the held analogue value into the nearest allowed (normalised) level.
:::

::: define Quantisation unit | 量化单位
The smallest unit of quantisation, written $\Delta$: the voltage a digital output
represents when only its least significant bit (LSB) is 1.
:::

::: define Quantisation error | 量化误差
The difference between the continuous analogue value and the discrete level it is
quantised to. It is unavoidable: a finite number of levels can't represent every
voltage exactly.
:::

A ruler marked only in centimetres is a quantiser: a 7.6 cm pencil has to be read
either as 7 cm (cut off what's left) or as 8 cm (round to the nearest mark). Those are
exactly the two ways of dividing the quantisation levels that the slides compare. Both
examples below are 3-bit (8 levels, codes 000 to 111) with an input range of 0 to
1 V, so $V_{REF} = 1$ V, $n = 3$.

### Method 1: round down (只舍不入)

Divide the range into $2^n$ equal steps, $\Delta = V_{REF}/2^n = 1/8$ V. Any input from
$k\Delta$ up to (but not including) $(k+1)\Delta$ is given code $k$: everything above the
level is simply dropped.

| Input range | Code | Level it stands for |
|---|---|---|
| 0 to 1/8 V | 000 | $0\Delta$ = 0 V |
| 1/8 to 2/8 V | 001 | $1\Delta$ = 1/8 V |
| 2/8 to 3/8 V | 010 | $2\Delta$ = 2/8 V |
| 3/8 to 4/8 V | 011 | $3\Delta$ = 3/8 V |
| 4/8 to 5/8 V | 100 | $4\Delta$ = 4/8 V |
| 5/8 to 6/8 V | 101 | $5\Delta$ = 5/8 V |
| 6/8 to 7/8 V | 110 | $6\Delta$ = 6/8 V |
| 7/8 to 1 V | 111 | $7\Delta$ = 7/8 V |

An input just under 1/8 V still reads 000: the error approaches one whole unit.

::: formula Round-down quantisation unit | 只舍不入的量化单位
$$\Delta = \frac{V_{REF}}{2^n}, \qquad \text{maximum quantisation error} = \Delta$$
--
\Delta | quantisation unit (量化单位) | V
V_{REF} | reference voltage: the top of the input range | V
n | number of output bits |
:::

For the example: $\Delta = 1/8$ V, and the maximum error is 1/8 V.

### Method 2: round to the nearest (四舍五入)

Shift the boundaries so each level sits in the **middle** of its input range. Then an
input is never more than half a unit from its level. To fit, the first range is only
half a unit wide (0 to $\Delta/2$), and the top level's range extends half a unit above
$7\Delta$, to $V_{REF}$. That is $2^n - 1$ whole units plus a half, so
$V_{REF} = (2^n - \tfrac12)\Delta$, or $\Delta = \dfrac{2V_{REF}}{2^{n+1}-1}$. For 3 bits and
1 V, $\Delta = 2/15$ V.

| Input range | Code | Level it stands for |
|---|---|---|
| 0 to 1/15 V | 000 | $0\Delta$ = 0 V |
| 1/15 to 3/15 V | 001 | $1\Delta$ = 2/15 V |
| 3/15 to 5/15 V | 010 | $2\Delta$ = 4/15 V |
| 5/15 to 7/15 V | 011 | $3\Delta$ = 6/15 V |
| 7/15 to 9/15 V | 100 | $4\Delta$ = 8/15 V |
| 9/15 to 11/15 V | 101 | $5\Delta$ = 10/15 V |
| 11/15 to 13/15 V | 110 | $6\Delta$ = 12/15 V |
| 13/15 to 1 V | 111 | $7\Delta$ = 14/15 V |

::: formula Rounding quantisation unit | 四舍五入的量化单位
$$\Delta = \frac{2V_{REF}}{2^{n+1} - 1}, \qquad \text{maximum quantisation error} = \frac{\Delta}{2}$$
--
\Delta | quantisation unit (量化单位) | V
V_{REF} | reference voltage: the top of the input range | V
n | number of output bits |
:::

For the example: $\Delta = 2/15$ V, and the maximum error is $1/15$ V, about half of
round-down's 1/8 V. (The unit itself is a little larger, $2/15 > 1/8$, but each level
now sits in the middle of its range.)

::: callout key Rounding has the smaller error
Round-down: $\Delta = V_{REF}/2^n$, error up to $\Delta$. Rounding:
$\Delta = 2V_{REF}/(2^{n+1}-1)$, error up to $\Delta/2$. With the same bits and range,
rounding's maximum error is about half as big, which is why converters use it. The
flash ADC of lesson 12.3 is built on exactly the rounding levels above (1/15, 3/15, …).
:::

Compare the two staircases below (input range 1 V). Change the number of bits and
both get finer; the rounding staircase always sits half a step to the left, so it
crosses the ideal line $y = x$ in the middle of each step instead of at its start.

::: plot Quantising 0–1 V with n bits: round-down (q1) and rounding (q2)
x: 0 .. 1
xlabel: input (V)
ylabel: quantised level (V)
y: 0 .. 1
ideal(x) = x
q1(x) = min(floor(x 2^n), 2^n - 1) / 2^n
q2(x) = 2 / (2^(n + 1) - 1) * min(floor(x (2^(n + 1) - 1) / 2 + 0.5), 2^n - 1)
slider n: 1 .. 6 = 3 | | step 1
:::

::: example Quantising 0.7 V both ways
A 3-bit quantiser with $V_{REF} = 1$ V receives 0.7 V. Find the code, the level and the
error with each method.
== Round down ==
$\Delta = 1/8 = 0.125$ V. $0.7/0.125 = 5.6$; drop the fraction: 5, code **101**, level
$5\times0.125 = 0.625$ V. Error $0.7 - 0.625 = 0.075$ V (less than $\Delta = 0.125$ V).
== Rounding ==
$\Delta = 2/15 \approx 0.1333$ V. $0.7/0.1333 = 5.25$; round: 5, code **101**, level
$5\times2/15 = 0.667$ V. Error $0.7 - 0.667 = 0.033$ V (less than $\Delta/2 = 0.067$ V).
Check with the table: 0.7 V lies in 9/15 to 11/15 V (0.6 to 0.733 V), code 101.
:::

::: example An 8-bit converter's numbers
An 8-bit ADC has a 0–5 V input range ($V_{REF} = 5$ V). Find $\Delta$ and the maximum
quantisation error for each method.
== Round down ==
$\Delta = 5/2^8 = 5/256 \approx 19.5$ mV; maximum error 19.5 mV.
== Rounding ==
$\Delta = 2\times5/(2^9 - 1) = 10/511 \approx 19.6$ mV; maximum error $\Delta/2 \approx 9.8$ mV.
== The point ==
With many bits the two units are almost the same size, but rounding still halves the
maximum error.
:::

::: callout pitfall Which formula for which method
It is easy to swap them. Round-down (只舍不入) is the plain one, $V_{REF}/2^n$, with the
*larger* error, a whole $\Delta$. Rounding (四舍五入) has the odd denominator
$2^{n+1} - 1$ and the *smaller* error, $\Delta/2$.
:::

## Encoding

::: define Encoding (in an ADC) | 编码
Writing the quantised value, a whole number of units, as a digital code in a given
form, which is the converter's output.
:::

For a 0-to-$V_{REF}$ input the code is usually plain binary: level $5\Delta$ is 101.
Inputs that can be negative are often coded in two's complement (lesson 7.2) or offset
binary instead. Either way, quantising picks the level and encoding names it, and in
the circuits of lesson 12.3 the two happen together.

::: callout exam What the principle questions look like
The scope asks for the basic principle of A/D conversion: sampling, holding,
quantising, encoding. Expect short questions: put the four steps in order; which steps
make the signal discrete in time and which in amplitude; the sampling theorem (find
the lowest $f_s$, or the highest input frequency); the quantisation unit and maximum
error of each method, and which method has the smaller error.
:::

::: cards How A/D conversion works
Four steps of A/D conversion :: Sampling, holding, quantising, encoding (采样、保持、量化、编码).
Sample-and-hold makes the signal discrete in… :: Time (时间上离散).
Quantise-and-encode makes the signal discrete in… :: Amplitude (幅度上离散).
Sampling theorem :: $f_s \ge 2f_{i(\max)}$: sample at least twice the highest frequency in the input.
Why hold a sample? :: Quantising and encoding take time; the input must stay still while they happen.
Basic sample-and-hold :: A switch closed briefly by the sampling clock, and a capacitor that keeps the voltage.
LF198 :: Integrated sample-and-hold: $A_1$, switch K, hold capacitor C, follower $A_2$, overall feedback through $R_1$.
LF198 diodes $D_1$, $D_2$ :: Keep $A_1$ out of saturation while K is open (hold), so sampling restarts quickly.
Quantisation unit $\Delta$ :: The voltage represented by the LSB alone: the smallest step of quantisation.
Quantisation error :: The difference between the analogue value and its quantised level; unavoidable.
Round-down quantisation (只舍不入) :: $\Delta = V_{REF}/2^n$; maximum error $\Delta$.
Rounding quantisation (四舍五入) :: $\Delta = 2V_{REF}/(2^{n+1}-1)$; maximum error $\Delta/2$.
3-bit, 1 V, rounding: $\Delta$ and maximum error :: $\Delta = 2/15$ V, error $1/15$ V.
Encoding :: Writing the quantised level as a digital code (the ADC's output).
:::

::: quiz How A/D conversion works
? Which is the correct order of the steps of A/D conversion?
- [x] sampling, holding, quantising, encoding
- [ ] quantising, sampling, holding, encoding
- [ ] sampling, quantising, holding, encoding
- [ ] holding, sampling, encoding, quantising
> A value must first be taken (sampled) and held still; only then can it be rounded to
> a level (quantised) and that level written as a code (encoded).

? An input signal's highest frequency component is 15 kHz. What is the lowest sampling frequency allowed by the sampling theorem?
answer: 30 kHz
tolerance: 1%
> $f_s \ge 2f_{i(\max)} = 2\times15 = 30$ kHz.

? An ADC samples at 200 kHz. What is the highest input frequency it can convert without losing information?
answer: 100 kHz
tolerance: 1%
> $f_{i(\max)} \le f_s/2 = 100$ kHz.

? Which steps make the signal discrete in amplitude?
- [x] quantising and encoding
- [ ] sampling and holding
- [ ] sampling and quantising
> Sampling and holding chop time; quantising rounds the value and encoding names the
> level, so those two chop amplitude.

? A 3-bit quantiser has $V_{REF} = 1$ V and uses round-down (只舍不入). What is its maximum quantisation error?
answer: 0.125 V
tolerance: 1%
> $\Delta = V_{REF}/2^n = 1/8$ V, and round-down's maximum error is a whole $\Delta$: 0.125 V.

? The same 3-bit, 1 V quantiser uses rounding (四舍五入) instead. What is its quantisation unit $\Delta$?
answer: 2/15 V
tolerance: 1%
> $\Delta = 2V_{REF}/(2^{n+1}-1) = 2/15 \approx 0.133$ V; its maximum error is half of
> that, $1/15$ V.

? A 10-bit ADC uses round-down quantisation with $V_{REF} = 10.24$ V. What is $\Delta$?
answer: 10 mV
tolerance: 1%
> $\Delta = 10.24/2^{10} = 10.24/1024 = 0.01$ V = 10 mV.

? A 3-bit rounding quantiser ($V_{REF} = 1$ V) receives 0.45 V. Which code does it give?
- [x] 011
- [ ] 010
- [ ] 100
> $\Delta = 2/15$ V; $0.45/(2/15) = 3.375$, which rounds to 3: code 011. In the table,
> 0.45 V lies between 5/15 (0.333) and 7/15 (0.467) V.

? What do the diodes $D_1$ and $D_2$ do in the LF198 sample-and-hold?
- [x] They keep $A_1$ from saturating while the switch is open, so it can sample again at once.
- [ ] They rectify the input signal.
- [ ] They discharge the hold capacitor between samples.
> While K is open, $A_1$'s loop is broken and it would swing to a supply rail as $u_I$
> changes. A diode conducts when $u_o'$ gets about a diode drop from $u_{N1}$, giving
> $A_1$ local feedback.

? Name the method of quantisation whose maximum error is half the quantisation unit (in English or Chinese).
text: rounding | round to the nearest | 四舍五入 | round to nearest
> Rounding (四舍五入) puts each level in the middle of its input range, so no input is
> more than $\Delta/2$ away. Round-down (只舍不入) allows a whole $\Delta$.
:::

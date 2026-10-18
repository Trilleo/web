---
title: Rectifiers
zh: 整流电路
summary: How a DC power supply is built from mains AC, and how half-wave and bridge rectifiers turn AC into pulsating DC — their average output, ripple factor and diode ratings.
source: 第10章 直流电源 (10.1–10.3), 2026-09-21 → 09-24
---

## Why electronics needs a DC supply

Every amplifier, op-amp and logic gate in this course quietly assumes a steady DC
supply: $+V_{CC}$, $\pm 15$ V, 5 V. The wall socket gives none of these. It gives
220 V RMS of alternating voltage at 50 Hz, which reverses direction a hundred times a
second. This unit is about the box in between: the {{term DC power supply | 直流电源}}
that turns mains AC into a DC voltage that stays put whatever the mains or the load
does. This first lesson covers the step that does the real conversion, the rectifier.

There are two families of regulated supply, and the course meets both:

| | Linear regulated supply {{zh 线性稳压电源}} | Switching regulated supply {{zh 开关稳压电源}} |
| --- | --- | --- |
| Output | Very steady, small ripple | Larger ripple, more electrical noise |
| Output current | Fairly small | Large |
| Efficiency | Low: the pass transistor burns the extra voltage as heat | High: the transistor only switches |

(Some systems run from batteries or solar cells instead, but most supplies start from
the mains.)

## The four stages of a DC supply

Think of a DC supply as a production line. Each stage takes the previous stage's
output and makes it a little more like the flat DC we want:

| Stage | What goes in | What comes out |
| --- | --- | --- |
| Power transformer {{zh 电源变压器}} | mains AC, 220 V | a smaller AC, $u_2$ (工频交流) |
| Rectifier {{zh 整流电路}} | AC, both directions | one direction only, but bumpy: pulsating DC (脉动直流) |
| Filter {{zh 滤波电路}} | pulsating DC | DC with only a small ripple (纹波减小) |
| Regulator {{zh 稳压电路}} | slightly rippled DC that moves with the mains and the load | steady DC (稳定直流) |

::: define Power transformer | 电源变压器
The first stage of a DC supply: it changes the mains voltage into the AC voltage the
rest of the supply needs, so that after rectification the DC comes out at the right
level. In a supply it is almost always a step-down transformer {{zh 降压变压器}}. Its
secondary voltage is written $u_2$, with RMS value $U_2$.
:::

A **rectifier circuit** {{zh 整流电路}} (met in Lesson 1.3) is, in full, a circuit of rectifier diodes that uses their one-way conduction
({{term unidirectional conductivity | 单向导电性}}) to turn the 50 Hz AC, which
changes both direction and size, into a current of one direction whose size still
pulses: {{term pulsating DC | 脉动直流}}.

::: define Filter circuit | 滤波电路
A circuit of energy-storage elements that smooths pulsating DC. It relies on the
fact that a capacitor's voltage and an inductor's current can't jump, so the
pulsating part is held back and a smoother DC is left. Capacitor filters suit small
output currents, inductor filters large ones.
:::

::: define Voltage regulator | 稳压电路
The last stage: it holds the output voltage steady even when the mains voltage
moves, the load current changes or the temperature drifts.
:::

The transformer you already know from the first course; the filter is the next
lesson, the regulators the two after it. Here we stay with the rectifier.

## How we describe rectifier quantities

A rectifier mixes AC and DC quantities, and the slides use a fixed convention for
which value of each one to quote. Learn it now; every formula in the unit follows it.

| Quantity | Quoted as | Why |
| --- | --- | --- |
| AC input $u_2$ | RMS value $U_2$ (or peak $\sqrt2 U_2$) | that's what transformers are rated in |
| DC output $u_O$ | average value $U_{O(AV)}$ | a DC meter reads the average |
| Diode forward current | average value $I_{D(AV)}$ | diode datasheets rate the average rectified current |
| Diode reverse voltage | maximum value $U_{RM}$ | breakdown happens at the worst instant |

::: callout note Real diodes lose a little
The analysis below treats the diodes as ideal switches. A real silicon diode drops
0.6–1 V while it conducts, so the output peaks are that much lower for each diode in
the current's path (one in a half-wave rectifier, two in a bridge). That matters for
low-voltage supplies; for a 20 V secondary it's a few per cent.
:::

## The single-phase half-wave rectifier

The simplest rectifier is a single diode in series with the load. It's called
half-wave because current flows through the load for only half of each cycle.

::: circuit Single-phase half-wave rectifier (the AC source is the transformer's secondary)
A1 0,4 0,0 u2
D1 0,0 4,0 VD
R1 4,0 4,4 RL
W 0,4 4,4
G 0,4
label uO 4,0
:::

::: define Single-phase half-wave rectifier | 单相半波整流电路
A rectifier of one diode in series between the transformer secondary and the load:
in the positive half-cycle of $u_2$ the diode conducts and the load gets a half sine
of voltage and current; in the negative half-cycle the diode is reverse-biased and
the output current is essentially zero.
:::

Follow one cycle of $u_2 = \sqrt2 U_2 \sin\omega t$:

- **Positive half** ($0 < \omega t < \pi$): the top of the secondary is positive, the
  diode is forward-biased and acts as a closed switch. The whole of $u_2$ appears
  across the load: $u_O = u_2$, and $i_O = i_D = u_2/R_L$, peaking at
  $\sqrt2 U_2/R_L$.
- **Negative half** ($\pi < \omega t < 2\pi$): the diode is reverse-biased, an open
  switch. No current flows, $u_O = 0$, and the diode itself takes the whole of $u_2$:
  $u_D = u_2$, which reaches $-\sqrt2 U_2$.

So the output is a row of positive half-sine humps with gaps between them. Move the
slider to change $U_2$; the flat line is the average, which we work out next.

::: plot Half-wave output and its average
x: 0 .. 4pi
xlabel: ωt (rad)
ylabel: voltage (V)
u2(x) = sqrt(2) U2 sin(x)
uO(x) = sqrt(2) U2 max(sin(x), 0)
avg(x) = sqrt(2)/pi U2
slider U2: 5 .. 30 = 10 | V
:::

### Average output voltage

The average {{zh 平均值}} of a waveform over one period is its area divided by the
period. For the half-wave output, the area is one hump; the gap adds nothing:

$$U_{O(AV)} = \frac{1}{2\pi}\int_0^{2\pi} u_O \,\mathrm{d}(\omega t)
= \frac{1}{2\pi}\int_0^{\pi}\sqrt2 U_2\sin\omega t\,\mathrm{d}(\omega t)
= \frac{\sqrt2}{\pi}U_2$$

(the integral of $\sin$ over a half period is 2).

This is the half-wave result from Lesson 1.3:

$$U_{O(AV)} = \frac{\sqrt2}{\pi}U_2 \approx 0.45\,U_2$$

### Ripple factor

An average alone doesn't tell you how bumpy the output is. For that the course uses
the ripple factor. Picture splitting $u_O$ by Fourier analysis into a DC part plus
sine waves: the biggest and lowest-frequency sine, the fundamental, is the main
"wobble". The ripple factor compares its size with the DC part.

::: define Ripple factor | 脉动系数
$S = U_{OM1}/U_{O(AV)}$: the peak of the fundamental {{zh 基波最大值}} of the output
voltage divided by its average. It measures how much the output pulsates: the
smaller $S$, the better the rectifier (or filter) has done its job.
:::

::: formula Ripple factor | 脉动系数
$$S = \frac{U_{OM1}}{U_{O(AV)}}$$
--
S | ripple (pulsation) factor | 1
U_{OM1} | peak of the output's fundamental (lowest-frequency AC component) | V
U_{O(AV)} | average output voltage | V
:::

For the half-wave output the fundamental is at the mains frequency $\omega$. Its peak
is the Fourier coefficient

$$U_{OM1} = \frac{1}{\pi}\int_0^{\pi}\sqrt2U_2\sin\omega t\cdot\sin\omega t\;\mathrm{d}(\omega t)
= \frac{\sqrt2U_2}{\pi}\cdot\frac{\pi}{2} = \frac{U_2}{\sqrt2}$$

so

$$S = \frac{U_2/\sqrt2}{\sqrt2U_2/\pi} = \frac{\pi}{2} \approx 1.57$$

The fundamental's peak is *bigger* than the DC average: a half-wave output is more
ripple than DC.

### Diode current and reverse voltage

In a half-wave rectifier the diode and the load are in series, so the diode carries
the whole load current:

$$I_{D(AV)} = I_L = \frac{U_{O(AV)}}{R_L} = \frac{0.45\,U_2}{R_L}$$

When the diode is off, it stands across the whole secondary, so the biggest reverse
voltage it ever sees is the peak of $u_2$:

$$U_{RM} = \sqrt2 U_2$$

::: define Maximum reverse voltage | 最大反向电压
$U_{RM}$: the largest reverse voltage a rectifier diode has across it while it is cut
off. A diode must be chosen with a reverse-voltage rating above it, or it breaks
down ({{term reverse breakdown | 反向击穿}}).
:::

::: example A half-wave rectifier
A half-wave rectifier has $U_2 = 20$ V and $R_L = 100$ Ω. Find the average output
voltage, the diode's average current and its maximum reverse voltage.
== Average output ==
$U_{O(AV)} = 0.45 \times 20 = 9.0$ V.
== Diode current ==
The diode carries the load current: $I_{D(AV)} = 9.0/100 = 90$ mA.
== Reverse voltage ==
$U_{RM} = \sqrt2 \times 20 \approx 28.3$ V.
== Ripple ==
$S = 1.57$ whatever the values: the fundamental's peak is
$1.57 \times 9.0 \approx 14.1$ V, i.e. $U_2/\sqrt2$. Not something you'd feed to an
amplifier.
:::

## The single-phase bridge rectifier

The half-wave rectifier throws away half of every cycle. The bridge rectifier uses
four diodes so that *both* halves drive current through the load in the same
direction: the negative half-cycle is flipped over instead of discarded.

::: circuit Single-phase bridge rectifier
A1 8,4 4,4 u2
D1 4,4 4,0
D4 4,8 4,4
D2 8,4 8,0
D3 8,8 8,4
W 4,0 8,0 12,0
W 4,8 8,8 12,8
R1 12,0 12,8 RL
G 12,8
label a 4,4
label b 8,4
label uO 12,0
:::

In this drawing the secondary (the AC source) sits between node $a$ (its + end) and
node $b$. The top rail, where the cathodes of D1 and D2 meet, is the output's +; the
bottom rail, where the anodes of D3 and D4 meet, is its −.

::: define Single-phase bridge rectifier | 单相桥式整流电路
A rectifier of four diodes connected as a bridge on one transformer winding. In each
half-cycle two diodes in opposite arms conduct, so the load current keeps the same
direction in both halves and the output is a full-wave waveform.
:::

- **Positive half** ($a$ positive): current leaves $a$, goes up through **D1** to the
  + rail, down through $R_L$, along the − rail and up through **D3** into $b$. D2 and
  D4 are reverse-biased. The load sees "top +, bottom −".
- **Negative half** ($b$ positive): current leaves $b$, goes up through **D2** to the
  + rail, down through $R_L$ *in the same direction as before*, and back through
  **D4** into $a$. D1 and D3 are off.

The diodes work in pairs, taking turns: D1 and D3 one half-cycle, D2 and D4 the
other. The output is $u_O = |u_2|$, a full-wave rectified waveform.

::: callout key Two diodes at a time, same direction through the load
In a bridge, whichever end of the secondary is positive, a conducting diode steers
the current into the + rail and another lets it back from the − rail. The load never
sees the reversal.
:::

Compare the two outputs. With the same $U_2$ the bridge fills in the gaps:

::: plot Half-wave against full-wave (bridge) output
x: 0 .. 4pi
xlabel: ωt (rad)
ylabel: u_O (V)
half(x) = sqrt(2) U2 max(sin(x), 0)
bridge(x) = sqrt(2) U2 abs(sin(x))
avgHalf(x) = sqrt(2)/pi U2
avgBridge(x) = 2 sqrt(2)/pi U2
slider U2: 5 .. 30 = 10 | V
:::

### Average output and ripple factor

The bridge output has twice as many humps per period, so twice the area and twice
the average:

$$U_{O(AV)} = \frac{1}{2\pi}\int_0^{2\pi}\sqrt2U_2\,|\sin\omega t|\,\mathrm{d}(\omega t)
= \frac{2\sqrt2}{\pi}U_2$$

::: callout note About the slide's integral
The slide writes the integrand as $\sqrt2U_2\sin\omega t$ over $0$ to $2\pi$. Taken
literally that integral is zero; it means the rectified waveform
$\sqrt2U_2|\sin\omega t|$, which gives the $0.9\,U_2$ result.
:::

::: formula Bridge rectifier output | 桥式整流输出电压平均值
$$U_{O(AV)} = \frac{2\sqrt2}{\pi}U_2 \approx 0.9\,U_2$$
--
U_{O(AV)} | average output voltage of a bridge (full-wave) rectifier | V
U_2 | RMS secondary voltage | V
:::

The full-wave output repeats every half period, so its fundamental is at $2\omega$
(100 Hz on a 50 Hz supply). Its peak works out as

$$U_{OM1} = \left|\frac{2}{\pi}\int_0^{\pi}\sqrt2U_2\sin\omega t\cos2\omega t\,\mathrm{d}(\omega t)\right| = \frac{4\sqrt2}{3\pi}U_2$$

and the ripple factor is

$$S = \frac{4\sqrt2U_2/(3\pi)}{2\sqrt2U_2/\pi} = \frac{2}{3}\approx 0.67$$

Better than the half-wave's 1.57, but the output is still far from flat. That's why a
filter always follows.

| | Half-wave | Bridge |
| --- | --- | --- |
| $U_{O(AV)}$ | $0.45\,U_2$ | $0.9\,U_2$ |
| $S$ | $\pi/2 \approx 1.57$ | $2/3 \approx 0.67$ |
| Ripple frequency | $f$ (50 Hz) | $2f$ (100 Hz) |
| $I_{D(AV)}$ | $I_L$ | $I_L/2$ |
| $U_{RM}$ | $\sqrt2U_2$ | $\sqrt2U_2$ |
| Diodes | 1 | 4 |

### Diode current and reverse voltage in a bridge

Each diode conducts only every other half-cycle, so it carries the load current half
the time and its average is half the load's:

$$I_{D(AV)} = \frac{I_L}{2} = \frac{U_{O(AV)}}{2R_L} = \frac{0.45\,U_2}{R_L}$$

For the reverse voltage, look at the off pair in the positive half. With D1 and D3
conducting (ideal, no drop), D2 connects $b$ to the + rail and D4 connects the − rail
to $a$: each off diode sits directly across the secondary. So it sees the peak of
$u_2$, just as in the half-wave case. The bridge doubles the output with the *same*
diode voltage rating.

::: formula Diode ratings in a bridge rectifier | 桥式整流二极管参数
$$I_{D(AV)} = \frac{I_L}{2} = \frac{0.45\,U_2}{R_L}, \qquad U_{RM} = \sqrt2\,U_2$$
--
I_{D(AV)} | average forward current of each diode | A
I_L | average load current, $U_{O(AV)}/R_L$ | A
R_L | load resistance | Ω
U_{RM} | maximum reverse voltage on each diode | V
:::

::: callout pitfall The same 0.45 for two different reasons
The half-wave diode current is $0.45U_2/R_L$ because the diode carries the whole
(small) load current; the bridge diode current is also $0.45U_2/R_L$ because it
carries half of a load current that's twice as big. Write $I_{D(AV)} = I_L$ or
$I_L/2$ first, then substitute — don't just remember "0.45".
:::

### The integrated bridge

Bridges are so common that the four diodes come in one package, the
{{term rectifier bridge | 整流桥}}, with many current and voltage ratings. Its symbol
is a diamond with one diode drawn inside: the two corners marked "~" go to the
transformer secondary, the "+" and "−" corners to the load.

## Choosing rectifier diodes

A diode is chosen from two datasheet ratings: its maximum average rectified current
$I_F$ and its maximum reverse voltage. Each must beat what the circuit asks of it,
with a margin, because the mains itself is allowed to swing about ±10 %:

- $I_F > I_{D(AV)}$ (and, once a capacitor filter is added, 2–3 times more: see the
  next lesson),
- reverse rating $> U_{RM} = \sqrt2 U_2$, taken at the highest mains voltage, so
  $1.1\sqrt2U_2$.

::: example Designing a 12 V, 0.5 A bridge rectifier
We want a bridge rectifier (no filter) giving an average of 12 V to a load drawing
0.5 A. Find $U_2$ and the diode ratings, allowing for the mains rising by 10 %.
== Secondary voltage ==
$U_{O(AV)} = 0.9U_2$, so $U_2 = 12/0.9 \approx 13.3$ V RMS.
== Diode current ==
Each diode carries half the load current: $I_{D(AV)} = 0.5/2 = 0.25$ A.
== Reverse voltage ==
$U_{RM} = \sqrt2 \times 13.3 \approx 18.9$ V; with the mains 10 % high,
$1.1 \times 18.9 \approx 20.7$ V.
== Choose ==
Any diode with $I_F > 0.25$ A and a reverse rating above about 21 V, for example the
1N4001 (1 A, 50 V), leaves plenty of margin.
:::

::: callout exam For the exam
The numbers $0.45U_2$, $0.9U_2$, $S = 1.57$ / $0.67$, $I_{D(AV)} = I_L$ or $I_L/2$ and
$U_{RM} = \sqrt2U_2$ come up constantly, often as "the meter reads … V: what's wrong
with the circuit?" questions in the next lesson. Know which value (RMS, peak or
average) each one is.
:::

::: cards Rectifiers
The four stages of a DC supply? :: Transformer → rectifier → filter → regulator (then the load).
Linear vs switching supply? :: Linear: steady, little ripple, low efficiency. Switching: efficient, large current, more ripple and interference.
How is each rectifier quantity quoted? :: AC input as RMS (or peak); DC output as average; diode current as average; diode reverse voltage as maximum.
Half-wave $U_{O(AV)}$? :: $\frac{\sqrt2}{\pi}U_2 \approx 0.45U_2$
Bridge $U_{O(AV)}$? :: $\frac{2\sqrt2}{\pi}U_2 \approx 0.9U_2$
Ripple factor $S$ (definition)? :: Peak of the output's fundamental over its average: $S = U_{OM1}/U_{O(AV)}$.
$S$ for half-wave and bridge? :: $\pi/2 \approx 1.57$ and $2/3 \approx 0.67$.
Diode average current, half-wave and bridge? :: Half-wave $I_{D(AV)} = I_L$; bridge $I_{D(AV)} = I_L/2$.
Diode maximum reverse voltage, half-wave and bridge? :: $U_{RM} = \sqrt2U_2$ in both.
Which bridge diodes conduct in the positive half-cycle? :: The opposite pair D1 and D3 (D2 and D4 in the negative half).
Ripple frequency of a bridge on 50 Hz mains? :: 100 Hz: the fundamental is at $2\omega$.
What does a rectifier diode's 0.6–1 V drop do? :: Lowers each output peak by that much per conducting diode (two in a bridge).
:::

::: quiz Check yourself
? A bridge rectifier has $U_2 = 15$ V. What does a DC voltmeter read across the load (ideal diodes, no filter)?
answer: 13.5 V
tolerance: 2%
> $U_{O(AV)} = 0.9U_2 = 0.9 \times 15 = 13.5$ V.

? The same transformer ($U_2 = 15$ V) feeds a half-wave rectifier instead. What's the average output?
answer: 6.75 V
tolerance: 2%
> $U_{O(AV)} = 0.45U_2 = 0.45 \times 15 = 6.75$ V, half the bridge's.

? Write the average output of a bridge rectifier exactly, in terms of $U_2$ (use pi and sqrt).
expression: 2 sqrt(2) U2 / pi
variables: U2
> The area under one hump is $2\sqrt2U_2$; there are two humps per period $2\pi$, so $U_{O(AV)} = \frac{2 \times 2\sqrt2U_2}{2\pi} = \frac{2\sqrt2}{\pi}U_2$.

? A bridge rectifier with $U_2 = 20$ V drives $R_L = 50$ Ω. What average current does each diode carry?
answer: 180 mA
tolerance: 2%
> $I_L = 0.9 \times 20 / 50 = 0.36$ A, and each diode carries half: $I_{D(AV)} = 0.18$ A $= 180$ mA.

? In that bridge, what's the maximum reverse voltage across a diode?
answer: 28.3 V
tolerance: 2%
> An off diode sits across the secondary, so $U_{RM} = \sqrt2 \times 20 \approx 28.3$ V.

? What's the ripple factor of a full-wave (bridge) rectifier's output?
answer: 0.67
tolerance: 2%
> $S = U_{OM1}/U_{O(AV)} = \frac{4\sqrt2U_2/(3\pi)}{2\sqrt2U_2/\pi} = 2/3 \approx 0.67$.

? Which statements about the bridge rectifier are true?
- [x] In each half-cycle two diodes conduct, in series with the load.
- [x] Each diode's maximum reverse voltage is the same as in a half-wave rectifier.
- [ ] Each diode carries the full load current all the time.
- [ ] Its output ripple is at the mains frequency, 50 Hz.
> Two opposite diodes conduct per half-cycle, each off diode sits across the secondary ($U_{RM} = \sqrt2U_2$, as in the half-wave circuit), each diode carries the load current only half the time ($I_L/2$ on average), and the output repeats every half period, so its ripple is at 100 Hz.

? How is the reverse voltage across a rectifier diode quoted?
- [x] As its maximum (peak) value
- [ ] As its RMS value
- [ ] As its average value
> Breakdown happens at the worst instant, so the convention quotes the maximum reverse voltage $U_{RM}$; diode current is quoted as an average, the AC input as RMS.

? What do we call a current of one direction whose size still pulses, as a rectifier delivers? (English)
text: pulsating DC | pulsating direct current | 脉动直流
> The rectifier's output keeps one direction but its size follows the humps of the sine: pulsating DC (脉动直流).
:::

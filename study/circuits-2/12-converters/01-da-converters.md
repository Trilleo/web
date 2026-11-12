---
title: D/A converters
zh: 数模转换器
summary: Why systems need D/A and A/D converters, the general structure of a D/A converter, the inverted-T R-2R ladder and its output formula, the AD7524 and CB7520/AD7520 chips, a sawtooth generator, and resolution and accuracy.
source: 第10章 数→模和模→数转换, 10.1–10.3 (final-exam deck 第10 数模与模数转换器)
---

A thermometer, a microphone and a loudspeaker all live in the analogue world: their
signals vary smoothly. A processor lives in the digital world of 0s and 1s. Every
system that measures something and then acts on it needs a translator at each border.
This lesson is about the translator on the way *out*, the D/A converter, which turns a
binary number into a proportional voltage. Its key circuit, the inverted-T resistor
ladder, is short to analyse once you see why its currents halve at each step, and its
output formula is the most examined calculation in this chapter.

## Two converters at the border

::: define A/D conversion | 模-数转换
Turning an analogue signal into a digital one. A circuit that does it is an
{{term A/D converter | A/D转换器}}, or ADC (Analog-Digital Converter).
:::

::: define D/A conversion | 数-模转换
Turning a digital signal into an analogue one. A circuit that does it is a
{{term D/A converter | D/A转换器}}, or DAC (Digital-Analog Converter).
:::

The slides draw where they sit in a typical mixed system (一般模数综合电子系统):

| Stage | Block | Kind of circuit |
|---|---|---|
| 1 | sensor (传感器) → amplifier (放大器) | analogue |
| 2 | A/D converter | interface (接口电路) |
| 3 | digital circuit (数字电路), e.g. a processor | digital |
| 4 | D/A converter | interface |
| 5 | power amplifier (功率放大器) → actuator (执行部件) | analogue |

A temperature controller is a good picture: the sensor's millivolts are amplified,
the ADC hands the processor a number, the processor decides how hard to heat, and the
DAC turns that decision back into a voltage that a power amplifier feeds to the heater.
The ADC and DAC are the **interface circuits** between the two worlds. This lesson
covers the DAC; lessons 12.2 and 12.3 cover the ADC.

## What a D/A converter has to do

Suppose a computer describes a 0–5 V DC voltage with 8 bits. Then

- the smallest code, $(00000000)_B = 0$, stands for 0 V;
- the largest, $(11111111)_B = 255$, stands for 5 V;
- a middle one, $(01111111)_B = 127$, stands for about 2.5 V.

A DAC's job is to receive a code and produce the matching voltage: the output must be
**proportional** to the number the code stands for. If code 0 gives 0 V and every
step up adds the same small voltage, the converter is doing its job.

::: callout note The slide's 1.25 V
The slide says that receiving $(00111111)_B$ the DAC should give 1.25 V. That code is
63, so on the 0–5 V scale with 255 as full scale it is $\frac{63}{255}\times 5 \approx 1.235$ V,
and with the formula used later in this lesson ($5\ \text{V}/2^8$ per step) it is
$\frac{63}{256}\times5 \approx 1.23$ V. 1.25 V is exactly a quarter of 5 V, which is
code 64, $(01000000)_B$. Treat 1.25 V as a rounded value: "a code about a quarter of
full scale gives about a quarter of the voltage".
:::

### The number a code stands for

::: formula Value of an n-bit binary input | 二进制数对应的十进制数
$$D_n = d_{n-1}2^{n-1} + d_{n-2}2^{n-2} + \cdots + d_1 2^1 + d_0 2^0$$
--
D_n | the decimal value of the input code |
d_i | bit $i$ of the input, 0 or 1; $d_{n-1}$ is the MSB (最高位), $d_0$ the LSB (最低位) |
n | number of bits |
:::

::: law D/A conversion is proportional | D/A转换的比例关系
A D/A converter uses a resistor network and analogue switches to turn the binary
number $D$ into an analogue quantity proportional to it:
$A = K D_n = K\left(d_{n-1}2^{n-1} + \cdots + d_1 2^1 + d_0 2^0\right)$, where $K$ is a
constant (in volts when $A$ is a voltage).
:::

In words: each bit contributes a share **weighted** by its place value. The MSB
contributes $K\cdot2^{n-1}$, half of the whole range; the LSB contributes just $K$. A
DAC is therefore a machine for making weighted contributions and adding them.

### The general structure

The slides break every DAC into four blocks in a row:

1. **Data latch** (数据锁存器): stores the bits of the input code, so the output stays
   steady while the input bus changes.
2. **Digitally controlled analogue switches** (数字位控模拟开关): one per bit, set by
   that bit; the reference voltage $U_{REF}$ (参考电压) enters here.
3. **Decoding network** (解码网络): a resistor network that produces the
   {{term weighted currents | 权电流}}, one per bit, each twice the next.
4. **Summing op-amp** (运算放大电路实现求和): adds the weighted currents of the bits
   that are 1 and turns the sum into an output voltage $u_O$ (or current $i_O$)
   proportional to the input.

The {{term resistor decoding network | 电阻解码网络}} is the heart of the converter.
The next section is the network this course uses.

## The inverted-T resistor network D/A converter

::: define Inverted-T resistor network D/A converter | 倒T形电阻网络D/A转换器
A DAC whose decoding network is a ladder of resistors of only two values, $R$ along
the rail and $2R$ in each leg (an "R-2R ladder"), fed from $V_{REF}$ at one end. Each
leg's current goes through a switch either to the op-amp's summing input or to ground.
:::

Drawn upside down, each rung of the ladder looks like a letter T, hence the name.

### The circuit

The 4-bit version, as on the slides. The rail runs along the bottom with nodes
$A_0 \dots A_3$ and $R$ between neighbours; $V_{REF}$ feeds the right end, and a
terminating $2R$ hangs off the left end. Each node has a $2R$ leg up to a
changeover switch $S_i$, controlled by bit $d_i$:

- $d_i = 1$: the leg is switched to the op-amp's inverting input (the upper bus);
- $d_i = 0$: the leg is switched to ground (the lower bus, which also goes to the
  op-amp's $+$ input).

The format draws a changeover switch as two switches, one to the summing bus and one
to ground, exactly one of them closed. The drawing shows the code
$d_3d_2d_1d_0 = 1010$.

::: circuit 4-bit inverted-T D/A converter, input 1010 (S3a, S2a, S1a, S0a to the summing bus; S3b … S0b to ground)
label UREF 22,10
W 16,10 22,10
R1 4,10 8,10 R
R2 8,10 12,10 R
R3 12,10 16,10 R
R4 4,10 4,6 2R
R5 8,10 8,6 2R
R6 12,10 12,6 2R
R7 16,10 16,6 2R
W 0,10 4,10
R8 0,10 0,14 2R
G 0,14
S0a 4,6 4,2 open
S1a 8,6 8,2 closed
S2a 12,6 12,2 open
S3a 16,6 16,2 closed
S0b 4,6 6,6 closed
S1b 8,6 10,6 open
S2b 12,6 14,6 closed
S3b 16,6 18,6 open
G 6,6
G 10,6
G 14,6
G 18,6
W 4,2 20,2
U1 opamp 20,3
W 20,4 20,5
G 20,5
W 20,2 20,0
RF 20,0 24,0 RF
W 24,0 24,3 26,3
label uO 26,3
label A0 4,10
label A1 8,10
label A2 12,10
label A3 16,10
:::

### Why it doesn't matter where the switches point

The op-amp has negative feedback through $R_F$, so (lesson 4.1) the virtual short
holds: $u_- \approx u_+ = 0$. Its inverting input is a **virtual ground** (虚地). So a
leg switched to the summing bus ends at 0 V, and a leg switched to ground also ends at
0 V. Either way, the bottom of every $2R$ leg is at ground potential, and **the current
in each leg is the same whatever the code**. The code only decides *where* each
current goes: into the op-amp's summing node, or straight to ground.

That lets us replace every switch by a wire to ground and work out the currents once.

### Why the currents halve

Start at the left end and look into the ladder from each node towards the left:

- At $A_0$: the leg $2R$ in parallel with the terminating $2R$ gives $R$.
- At $A_1$, looking left: the rail resistor $R$ plus that $R$ gives $2R$; in parallel
  with $A_1$'s own leg $2R$, that is $R$ again.
- The same at every node: **looking left from any node you see $R$**.

So at each node the current arriving along the rail meets two equal paths of $2R$
(its own leg, and the rest of the ladder) and splits exactly in half. Seen from
$V_{REF}$ the whole ladder is just $R$, so

$$I = \frac{V_{REF}}{R}$$

enters at $A_3$. Half, $I/2$, goes up $A_3$'s leg; the other half goes on to $A_2$,
where it halves again into $I/4$ up the leg and $I/4$ onwards; then $I/8$, and
finally $I/16$ up $A_0$'s leg and $I/16$ through the terminating resistor.

Try it with all legs grounded, as the virtual ground makes them. With $V_{REF} = 10$ V
and $R = 10$ kΩ, the node voltages read 10, 5, 2.5 and 1.25 V, and the leg currents
0.5, 0.25, 0.125 and 0.0625 mA. Change $V_{REF}$ and every current scales with it;
change one resistor away from the R-2R ratio and the halving breaks.

::: circuit-sim The ladder with every leg at ground (virtual ground)
V1 20,4 20,0 10V [0..20]
W 16,0 20,0
R1 4,0 8,0 10k
R2 8,0 12,0 10k
R3 12,0 16,0 10k
R4 4,0 4,4 20k
R5 8,0 8,4 20k
R6 12,0 12,4 20k
R7 16,0 16,4 20k
R8 0,0 0,4 20k
W 0,0 4,0
W 0,4 20,4
G 0,4
:::

### The output formula

The currents of the legs whose bits are 1 flow into the summing node and, since no
current enters the op-amp (virtual open), all of it flows on through $R_F$:

$$i_\Sigma = \frac{I}{2}d_3 + \frac{I}{4}d_2 + \frac{I}{8}d_1 + \frac{I}{16}d_0$$

The op-amp is an inverting current-to-voltage converter: its $-$ input is at 0 V and
$i_\Sigma$ flows through $R_F$ towards the output, so $u_O = -R_F\, i_\Sigma$. Choosing
$R_F = R$ and putting $I = V_{REF}/R$:

$$\begin{aligned}
u_O = -R\,i_\Sigma &= -R\cdot\frac{V_{REF}}{R}\left(\frac{d_3}{2} + \frac{d_2}{4} + \frac{d_1}{8} + \frac{d_0}{16}\right) \\
&= -\frac{V_{REF}}{2^4}\left(d_3 2^3 + d_2 2^2 + d_1 2^1 + d_0 2^0\right)
\end{aligned}$$

With $n$ bits the ladder simply has $n$ rungs, and the LSB's current is $I/2^n$:

::: formula Output of the inverted-T D/A converter | 倒T形电阻网络D/A转换器输出电压
$$u_O = -\frac{V_{REF}}{2^n}\left(d_{n-1}2^{n-1} + d_{n-2}2^{n-2} + \cdots + d_1 2^1 + d_0 2^0\right) = -\frac{V_{REF}}{2^n}D_n$$
--
u_O | output voltage of the summing op-amp | V
V_{REF} | reference voltage feeding the ladder | V
n | number of input bits |
D_n | decimal value of the input code |
R_F | feedback resistor; the formula needs $R_F = R$ | Ω
:::

This is the law of the previous section with $K = -V_{REF}/2^n$. Note the minus sign:
the output has the opposite polarity to $V_{REF}$. That is why exam questions often
give a **negative** reference ($V_{REF} = -8$ V, say), to get a positive output.

::: callout key One formula to remember
$u_O = -\dfrac{V_{REF}}{2^n}D_n$ (with $R_F = R$). Every inverted-T question is: find
$D_n$, multiply by $V_{REF}/2^n$, mind the sign.
:::

Slide the code and the reference below. The step between neighbouring codes is
always $|V_{REF}|/2^n$, and the largest output is one step short of $|V_{REF}|$.

::: explore Output of an n-bit inverted-T DAC (R_F = R)
slider n: 1 .. 12 = 4 | | step 1
slider D: 0 .. 4095 = 10 | | step 1
slider VREF: -10 .. 10 = -8 | V
code = min(D, 2^n - 1) | | Code used (capped at 2^n − 1)
uO = -VREF / 2^n * min(D, 2^n - 1) | V | Output u_O
step = abs(VREF) / 2^n | V | One LSB step
umax = abs(VREF) (2^n - 1) / 2^n | V | Largest output size
:::

::: example A 4-bit inverted-T DAC
A 4-bit inverted-T DAC has $V_{REF} = -8$ V and $R_F = R$. Find (a) the output for
$d_3d_2d_1d_0 = 1010$, (b) the output produced by each bit alone, (c) the largest
output.
== The constant ==
$-V_{REF}/2^n = 8/16 = 0.5$ V per unit of $D_n$.
== (a) Code 1010 ==
$D_n = 8 + 2 = 10$, so $u_O = 0.5 \times 10 = 5$ V.
== (b) Each bit alone ==
$d_3$: $D_n = 8$, $u_O = 4$ V. $d_2$: 2 V. $d_1$: 1 V. $d_0$: 0.5 V. Each bit is worth
half the one above it, and (a) is just $4 + 1 = 5$ V: bits add.
== (c) Largest output ==
Code 1111, $D_n = 15$: $u_O = 0.5 \times 15 = 7.5$ V, one step (0.5 V) below
$|V_{REF}|$.
:::

::: example Working through the currents (R = 10 kΩ)
The same DAC with $R = R_F = 10$ kΩ and $V_{REF} = -8$ V, input 1010. Find $I$, each leg
current, $i_\Sigma$ and $u_O$ from the currents.
== Total current ==
$I = V_{REF}/R = -8/10\,000 = -0.8$ mA (negative: it flows out of the ladder into the
source, but the sizes halve just the same).
== Leg currents ==
$|I|/2 = 0.4$ mA ($d_3$), 0.2 mA ($d_2$), 0.1 mA ($d_1$), 0.05 mA ($d_0$).
== Summed current ==
Bits $d_3$ and $d_1$ are 1: $|i_\Sigma| = 0.4 + 0.1 = 0.5$ mA.
== Output ==
$u_O = -R_F i_\Sigma = -10\ \text{kΩ}\times(-0.5\ \text{mA}) = 5$ V, as in the previous
example.
:::

### Why this network is used

The slides give two advantages:

1. **Only two resistor values**, $R$ and $2R$. What matters is their *ratio*, which
   an integrated circuit makes very accurately (much more easily than many different
   values), so the converter is accurate and easy to integrate.
2. **The leg currents never change.** Switching a bit only redirects a current that is
   already flowing, between two points both at 0 V; no node voltage in the ladder
   moves, so no stray capacitance has to charge, there is no current build-up time,
   and the converter is fast. That is why it is so widely used.

::: callout pitfall R_F must equal R for the simple formula
$u_O = -\frac{V_{REF}}{2^n}D_n$ assumes $R_F = R$. With another feedback resistor, go
back to $u_O = -R_F\,i_\Sigma = -\frac{R_F}{R}\cdot\frac{V_{REF}}{2^n}D_n$.
:::

::: callout pitfall 2^n, not 2^n − 1
The denominator is $2^n$ (16 for four bits), because the LSB's current is $I/2^n$. The
largest code, $2^n - 1$, gives $\frac{2^n-1}{2^n}|V_{REF}|$, never $|V_{REF}|$ itself.
:::

## The AD7524 integrated D/A converter

::: define AD7524 | AD7524
An 8-bit, low-power CMOS D/A converter made by Analog Devices, built on the
inverted-T resistor network, with an input data latch on the chip.
:::

Inside, it is exactly the ladder above with $n = 8$: 10 kΩ rail resistors ($R$),
20 kΩ legs ($2R$) to switches $S_7 \dots S_0$, a terminating 20 kΩ, and a 10 kΩ feedback
resistor $R_{FB}$ already on the chip (so $R_F = R$ automatically, and it tracks the
ladder's resistors with temperature). The op-amp is **not** on the chip: you add it.

| Pin | Name | Role |
|---|---|---|
| 1 | $OUT_1$ | current output: the summing bus (bits that are 1); goes to the op-amp's $-$ input |
| 2 | $OUT_2$ | current output: the bus for bits that are 0; grounded |
| 3 | GND | ground |
| 4–11 | $DB_7 \dots DB_0$ | data inputs, $DB_7$ the MSB (pin 4), $DB_0$ the LSB (pin 11) |
| 12 | $\overline{CS}$ | chip select, active low (片选) |
| 13 | $\overline{WR}$ | write, active low (写入) |
| 14 | $V_{DD}$ | supply |
| 15 | $V_{REF}$ | reference voltage input |
| 16 | $R_{FB}$ | the on-chip feedback resistor; connect to the op-amp's output |

### Writing to the latch

Because of the latch, the chip needs its control signals timed correctly
(需要时序配合). Its function table:

| Input $\overline{CS}$ | Input $\overline{WR}$ | What happens |
|---|---|---|
| 0 | 0 | the data are written into the latch and appear at the output (写入锁存器，并行输出) |
| 0 | 1 | hold (保持) |
| 1 | 0 | hold |
| 1 | 1 | hold |

So the code on $DB_7 \dots DB_0$ reaches the ladder only while **both** $\overline{CS}$ and
$\overline{WR}$ are low; at all other times the latch keeps the last code written, and
the output stays put even if the data lines carry something else. That is what makes
it easy to hang on a microprocessor's data bus: $\overline{CS}$ comes from the address
decoding (this DAC is being addressed), $\overline{WR}$ from the processor's write strobe.

### The typical circuit

Data on pins 4–11; $V_{DD}$ to the supply; $V_{REF}$ to the reference; GND and $OUT_2$
grounded; $OUT_1$ to the op-amp's $-$ input; the op-amp's $+$ input grounded; $R_{FB}$
(pin 16) to the op-amp's output, which is $u_O$:

$$u_O = -\frac{V_{REF}}{2^8}\left(DB_7\times2^7 + DB_6\times2^6 + \cdots + DB_1\times2^1 + DB_0\times2^0\right)$$

This is the inverted-T formula with $n = 8$, not a new one.

::: example An AD7524 output
An AD7524 in the typical circuit has $V_{REF} = -10$ V. $\overline{CS} = \overline{WR} = 0$
and the data are $(10000000)_B$; then $\overline{WR}$ goes to 1 and the data change to
$(11111111)_B$. Find $u_O$ before and after.
== While writing ==
$D_n = 128$: $u_O = \frac{10}{256}\times128 = 5$ V.
== After WR goes high ==
The latch holds 10000000, so $u_O$ stays at 5 V. The new data don't get in until
$\overline{CS}$ and $\overline{WR}$ are both low again.
== If 11111111 were written ==
$D_n = 255$: $u_O = \frac{10}{256}\times255 \approx 9.96$ V.
:::

## The CB7520 (AD7520) and a sawtooth generator

The **CB7520** (the same circuit as Analog Devices' AD7520, which the slide's figure is
labelled) is a 10-bit inverted-T DAC: ten switches $S_0 \dots S_9$ for $d_0$ (LSB, pin
13) to $d_9$ (MSB, pin 4), $R = 10$ kΩ, $2R = 20$ kΩ, an on-chip feedback resistor $R$
(pin 16), current outputs $I_{OUT1}$ (pin 1, to the op-amp's $-$) and $I_{OUT2}$ (pin 2,
grounded), $V_{DD}$ pin 14, $V_{REF}$ pin 15, GND pin 3. Its output is the inverted-T
formula with $n = 10$.

Unlike the AD7524 it has **no latch**: the switches follow the data pins directly, so
when the data source can change (a shared bus), you must add an external latch.

::: callout pitfall Latch or no latch
AD7524: 8 bits, latch inside (needs $\overline{CS}$, $\overline{WR}$ timing). CB7520/AD7520:
10 bits, no latch (add one externally if the inputs don't stay steady).
:::

### A sawtooth generator

Connect a 10-bit binary up-counter's outputs $Q_0 \dots Q_9$ to the AD7520's $d_0 \dots d_9$
and feed the counter with clock pulses. The counter steps from all 0s up to all 1s,
one step per pulse, so the output climbs from 0 V to its maximum in 1023 equal small
steps; on the next pulse the counter wraps to 0 and the output drops back to 0 V. With
the pulses running continuously, the output is a periodic **sawtooth wave**.

The ramp is really a fine staircase of $2^{10} = 1024$ levels, one clock period wide
each, so the period is $1024\,T_{CP}$. Compare the op-amp sawtooth generators of
lesson 5.2, which make a smooth ramp with an integrator; this one is "digital": its
period is set exactly by the clock, and its shape could be changed by counting
differently.

::: plot Sawtooth from a counter and a DAC (|VREF| = 10 V, one step per clock period)
x: 0 .. 40
xlabel: t (clock periods)
ylabel: uO (V)
u(t) = 10 / 2^n * (floor(t) - 2^n floor(floor(t) / 2^n))
slider n: 2 .. 5 = 3 | | step 1
:::

The plot uses a small counter (2 to 5 bits) so the steps show; with 10 bits the 1024
steps look like a straight ramp.

::: example The sawtooth's numbers
A 10-bit counter drives an AD7520 with $V_{REF} = -10$ V, $R_F = R$, clocked at 100 kHz.
Find the step height, the peak output and the sawtooth's period and frequency.
== Step ==
$|V_{REF}|/2^{10} = 10/1024 \approx 9.77$ mV per count.
== Peak ==
Code 1111111111 = 1023: $u_O = \frac{10}{1024}\times1023 \approx 9.99$ V.
== Period ==
1024 counts per cycle, each $T_{CP} = 10\ \mu$s: $T = 10.24$ ms, so
$f \approx 97.7$ Hz.
:::

## Resolution and accuracy

::: define Conversion accuracy of a D/A converter | D/A转换器的转换精度
How closely the output matches the ideal; described by its **resolution** (分辨率) and
its **conversion error** (转换误差).
:::

::: define Resolution of a D/A converter | D/A转换器的分辨率
The accuracy a DAC can reach in theory. It is set by the number of input bits, and
expressed as the ratio of the smallest output step $U_{LSB}$ (input 00…01) to the
largest output $U_{max}$ (input 11…11).
:::

More bits means more distinguishable output levels, so finer steps. With $n$ bits,
$U_{LSB} = \frac{|V_{REF}|}{2^n}\times1$ and $U_{max} = \frac{|V_{REF}|}{2^n}(2^n-1)$; the
$V_{REF}/2^n$ cancels:

::: formula Resolution of a D/A converter | D/A转换器的分辨率
$$\text{resolution} = \frac{U_{LSB}}{U_{max}} = \frac{1}{2^n - 1}$$
--
U_{LSB} | output for the input 00…01 (one LSB) | V
U_{max} | output for the input 11…11 | V
n | number of input bits |
:::

For a 10-bit DAC: $\frac{1}{2^{10}-1} = \frac{1}{1023} \approx 0.001$, about 0.1 %. Since
the ratio depends only on $n$, resolution is often quoted just as "10 bits".

::: example Resolution and the smallest step
An 8-bit DAC has a full-scale output of about 10 V. Find its resolution and its
smallest output step.
== Resolution ==
$\frac{1}{2^8-1} = \frac{1}{255} \approx 0.0039$ (0.39 %).
== Smallest step ==
$U_{LSB} = U_{max}\times\frac{1}{255} = 10/255 \approx 39$ mV.
== How many bits for 10 mV? ==
Need $\frac{1}{2^n-1} \le \frac{10\ \text{mV}}{10\ \text{V}} = 0.001$, so $2^n - 1 \ge 1000$:
$n = 10$ (1023 ≥ 1000; 9 bits give only 511).
:::

### Conversion error

Resolution is what an *ideal* converter of $n$ bits could do. A real one also has
{{term conversion error | 转换误差}}, the difference between its actual and ideal
output, usually quoted in multiples of the LSB step (for example "at most ±½ LSB").
The slides only name it; in a real inverted-T DAC it comes mainly from:

- an inaccurate or drifting $V_{REF}$: every output is scaled by it (a gain error,
  growing with the code);
- the op-amp's offset and drift: the output is shifted even at code 0 (a zero, or
  offset, error);
- resistor ratios that aren't exactly $R : 2R$ and switches with some on-resistance:
  the steps are no longer equal (a nonlinearity error).

So a 12-bit DAC with a poor reference may be *less* accurate than a 10-bit one with a
good reference: resolution alone does not guarantee accuracy.

::: callout exam What D/A questions look like
The teacher's scope: recognise the inverted-T resistor network DAC and use its formula,
know the AD7524, and know DAC resolution. Expect: "find $u_O$ for this code" (or for
each bit alone, or the largest output), as in textbook exercises 10-3 and 10-4; "what
is the resolution of an $n$-bit DAC"; and short concept questions (why only $R$ and
$2R$, why the leg currents don't change, what $\overline{CS}$ and $\overline{WR}$ do).
Write the formula first, then put in the numbers.
:::

::: cards D/A converters
ADC (A/D converter, A/D转换器) :: Turns an analogue signal into a digital one.
DAC (D/A converter, D/A转换器) :: Turns a digital signal into a proportional analogue one.
Four blocks of a DAC :: Data latch, digitally controlled analogue switches, decoding (resistor) network, summing op-amp.
Inverted-T network resistor values :: Only $R$ (rail) and $2R$ (legs and terminator).
Inverted-T: looking left from any node you see… :: $R$, so each node's current splits in half.
Inverted-T current from $V_{REF}$ :: $I = V_{REF}/R$; legs carry $I/2, I/4, \dots, I/2^n$.
Inverted-T output formula ($R_F = R$) :: $u_O = -\frac{V_{REF}}{2^n}D_n$
Why the leg currents never change :: The op-amp's $-$ input is a virtual ground, so every leg ends at 0 V whichever way its switch points.
Two advantages of the inverted-T DAC :: Only two resistor values (accurate, easy to integrate); constant leg currents (no build-up time, fast).
AD7524 :: 8-bit CMOS inverted-T DAC with an on-chip latch; writes when $\overline{CS} = \overline{WR} = 0$, otherwise holds.
CB7520 / AD7520 :: 10-bit inverted-T DAC without a latch (add one externally).
Sawtooth generator from a DAC :: An $n$-bit counter driving the DAC: the output steps from 0 to maximum and drops back, period $2^n T_{CP}$.
DAC resolution formula :: $U_{LSB}/U_{max} = \frac{1}{2^n - 1}$
Resolution of a 10-bit DAC :: $1/1023 \approx 0.001$
Conversion accuracy of a DAC :: Described by resolution (ideal, set by $n$) and conversion error (real, in LSBs).
:::

::: quiz D/A converters
? A 4-bit inverted-T DAC has $V_{REF} = -8$ V and $R_F = R$. What is $u_O$ for $d_3d_2d_1d_0 = 1101$?
answer: 6.5 V
tolerance: 1%
> $u_O = -\frac{V_{REF}}{2^4}D_n = \frac{8}{16}\times13 = 6.5$ V ($1101 = 8 + 4 + 1 = 13$).

? Same DAC ($V_{REF} = -8$ V, 4 bits). What output does $d_1$ alone (input 0010) produce?
answer: 1 V
tolerance: 1%
> $D_n = 2$: $u_O = 0.5\ \text{V}\times2 = 1$ V. The bits alone give 4, 2, 1 and 0.5 V
> for $d_3$ to $d_0$.

? A 10-bit inverted-T DAC has $V_{REF} = -10$ V and $R_F = R$. What is its largest output voltage?
answer: 9.990 V
tolerance: 0.1%
> Largest code $2^{10} - 1 = 1023$: $u_O = \frac{10}{1024}\times1023 \approx 9.990$ V,
> one LSB (9.77 mV) below 10 V.

? Write the output of an $n$-bit inverted-T DAC with $R_F = R$, in terms of $V_{REF}$, $n$ and the input's value $D$.
expression: -VREF * D / 2^n
variables: VREF, D, n
> Each leg carries $I/2^k$ with $I = V_{REF}/R$; the summed current times $-R_F = -R$
> gives $u_O = -\frac{V_{REF}}{2^n}D$.

? What is the resolution of an 8-bit D/A converter (as a ratio)?
answer: 1/255
tolerance: 1%
> Resolution $= \frac{1}{2^n - 1} = \frac{1}{255} \approx 0.0039$.

? Why do the leg currents of an inverted-T ladder stay the same when the input code changes?
- [x] The op-amp's inverting input is a virtual ground, so each leg ends at 0 V whichever way its switch points.
- [ ] The switches are fast enough that the currents have no time to change.
- [ ] The feedback resistor $R_F$ equals $R$.
- [ ] $V_{REF}$ is regulated.
> With negative feedback, $u_- \approx u_+ = 0$. A leg switched to the summing bus and a
> leg switched to ground both end at 0 V, so the ladder always sees the same load and
> its currents never change; the code only steers them.

? An AD7524 has $\overline{CS} = 0$ and $\overline{WR} = 1$. What does it do?
- [x] Holds the code last written; changes on the data pins don't reach the output.
- [ ] Writes the data pins into the latch.
- [ ] Switches its output off.
> Only $\overline{CS} = \overline{WR} = 0$ writes. Every other combination holds.

? The ladder of an inverted-T DAC has $V_{REF} = 5$ V and $R = 10$ kΩ. What current flows in the MSB's leg?
answer: 0.25 mA
tolerance: 1%
> The whole ladder looks like $R$ from $V_{REF}$: $I = 5/10\,000 = 0.5$ mA. The MSB's leg
> carries $I/2 = 0.25$ mA.

? How many bits does a DAC need for a resolution of 0.1 % or better?
answer: 10
tolerance: 0
> $\frac{1}{2^n - 1} \le 0.001$ needs $2^n \ge 1001$: $n = 10$ ($1/1023$); 9 bits give $1/511 \approx 0.2$ %.

? A 10-bit counter clocked at 1 MHz drives a CB7520 as a sawtooth generator. What is the sawtooth's period?
answer: 1.024 ms
tolerance: 1%
> The counter goes through $2^{10} = 1024$ states per cycle, each $1\ \mu$s long:
> $T = 1024\ \mu\text{s} = 1.024$ ms.
:::

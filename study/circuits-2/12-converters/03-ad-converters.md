---
title: Types of A/D converter
zh: A/D转换器的类型
summary: The parallel-comparison (flash), successive-approximation and pipelined A/D converters, worked through with their examples, the ADC0808/0809 and AD9224 chips, the main ADC parameters, and how to compare and choose converter types.
source: 第10章 数→模和模→数转换, 10.4.2–10.4.6 (final-exam deck 第10 数模与模数转换器)
---

Lesson 12.2 said what an A/D converter must do: sample, hold, quantise, encode. This
lesson is about *how*, and there are several answers, each a different trade between
speed, accuracy and the amount of circuitry. The flash converter compares the input
with every level at once: fastest, but it needs a comparator per level. The
successive-approximation converter uses one comparator and a D/A converter and
homes in on the answer one bit per clock, like weighing on a balance. The pipelined
converter chains simple one-bit stages so that a new result comes out every clock.
The exam expects you to understand each well enough to follow its example, and to know
which to choose for a job.

## The parallel-comparison (flash) A/D converter

::: define Parallel-comparison A/D converter | 并联比较型A/D转换器
A direct-comparison (直接比较型) ADC that compares the input voltage with all the
quantisation levels at the same time, using one comparator per level, and encodes
the result. Also called a flash ADC.
:::

Picture measuring a child's height against a wall with a mark every few centimetres:
you don't search, you see at once which marks are below the head. The flash ADC's
marks are a chain of resistors; its eyes are comparators.

### The 3-bit circuit

The slide's circuit has three parts.

**Voltage comparators** (电压比较器). A resistor string from $V_{REF}$ to ground: seven
resistors $R$ and, at the bottom, one $R/2$, $7.5R$ in all. The taps between them are at

$$\frac{1}{15}V_{REF},\ \frac{3}{15}V_{REF},\ \frac{5}{15}V_{REF},\ \frac{7}{15}V_{REF},\ \frac{9}{15}V_{REF},\ \frac{11}{15}V_{REF},\ \frac{13}{15}V_{REF}$$

(the bottom tap is $0.5R/7.5R = 1/15$ of the way up, and each $R$ adds $2/15$). Seven
comparators $C_1 \dots C_7$ each have a tap on their $-$ input and the input $u_I$ on
their $+$ input. So comparator $C_k$'s output $C_{Ok}$ is 1 when $u_I$ is above its tap.

These are exactly the boundaries of **rounding quantisation** (四舍五入) from lesson
12.2, with $\Delta = \frac{2}{15}V_{REF}$: that is what the half-sized $R/2$ at the bottom
is for.

**Register** (寄存器). Seven D flip-flops, clocked together by CP, store
$C_{O7} \dots C_{O1}$ as $Q_7 \dots Q_1$. Storing them at a clock edge also freezes the
comparison at one instant, so the register does the holding.

**Code converter** (代码转换器). A priority encoder (优先编码器, lesson 9.4) with inputs
$I_7 \dots I_1$ from $Q_7 \dots Q_1$ turns the highest 1 into the code $d_2d_1d_0$
($d_2$ the MSB).

### The code table

As $u_I$ rises, the comparators switch on from the bottom up, so the register
fills like mercury in a thermometer:

| Input $u_I$ | Register $Q_7Q_6Q_5Q_4Q_3Q_2Q_1$ | Output $d_2d_1d_0$ |
|---|---|---|
| $0$ to $\frac{1}{15}V_{REF}$ | 0000000 | 000 |
| $\frac{1}{15}$ to $\frac{3}{15}V_{REF}$ | 0000001 | 001 |
| $\frac{3}{15}$ to $\frac{5}{15}V_{REF}$ | 0000011 | 010 |
| $\frac{5}{15}$ to $\frac{7}{15}V_{REF}$ | 0000111 | 011 |
| $\frac{7}{15}$ to $\frac{9}{15}V_{REF}$ | 0001111 | 100 |
| $\frac{9}{15}$ to $\frac{11}{15}V_{REF}$ | 0011111 | 101 |
| $\frac{11}{15}$ to $\frac{13}{15}V_{REF}$ | 0111111 | 110 |
| $\frac{13}{15}V_{REF}$ to $V_{REF}$ | 1111111 | 111 |

The output is simply **how many comparators are on**, written in binary.

Because the register can only hold these eight "thermometer" patterns, the code
converter can be simplified a great deal: $d_2 = Q_4$ (at least four on),
$d_1 = Q_6 + Q_2\overline{Q_4}$, $d_0 = Q_7 + Q_5\overline{Q_6} + Q_3\overline{Q_4} + Q_1\overline{Q_2}$.
Check one row: $Q_7 \dots Q_1 = 0011111$ gives $d_2 = 1$, $d_1 = 0 + 1\cdot0 = 0$,
$d_0 = 0 + 1\cdot1 + 1\cdot0 + 1\cdot0 = 1$: 101, as in the table.

The logic lab can't take seven inputs, so here is the same idea one size down: a 2-bit
flash ADC has three comparators (taps at $\frac17, \frac37, \frac57V_{REF}$ with rounding,
$\Delta = \frac27V_{REF}$), and its code converter is $d_1 = Q_2$, $d_0 = Q_3 + Q_1\overline{Q_2}$.
Fill the register from $Q_1$ upwards (000, 001, 011, 111); other patterns can't occur.

::: logic Code converter of a 2-bit flash ADC (enter thermometer patterns)
inputs: Q3 Q2 Q1
d1 = Q2
d0 = Q3 + Q1 Q2'
:::

::: example A 3-bit flash conversion
A 3-bit flash ADC has $V_{REF} = 15$ V and $u_I = 8.2$ V. Find the register state and
the output code, and the level the code stands for.
== Taps ==
$\frac{k}{15}\times15$ V for odd $k$: 1, 3, 5, 7, 9, 11, 13 V.
== Comparators ==
8.2 V is above 1, 3, 5 and 7 V but below 9 V: $C_1 \dots C_4$ output 1, $C_5 \dots C_7$
output 0. After the clock edge, $Q_7 \dots Q_1 = 0001111$.
== Code ==
Four comparators on: $d_2d_1d_0 = 100$.
== Level ==
$\Delta = \frac{2}{15}\times15 = 2$ V, so 100 stands for $4\Delta = 8$ V. The error,
0.2 V, is within $\Delta/2 = 1$ V.
:::

### Strengths and weaknesses

- **Fastest of all.** One conversion takes only the time for one flip-flop to switch
  plus the delay of three levels of gates. Nothing is searched; everything happens at
  once.
- **Complex circuit.** An $n$-bit flash ADC needs $2^n - 1$ comparators and as many
  flip-flops, and the count doubles with each extra bit. 3 bits need 7; 8 bits need
  255; 10 bits, 1023.
- Its accuracy depends mainly on how the quantisation levels are divided: the
  resistors' accuracy and the comparators' offsets.

::: formula Comparators in a flash ADC | 并联比较型A/D转换器的比较器个数
$$N = 2^n - 1$$
--
N | number of comparators, and of flip-flops |
n | number of output bits |
:::

::: callout pitfall Seven resistors R, not six
The string has seven $R$s plus the $R/2$ (eight resistors for seven taps). Count:
$\frac{1}{15}$ at the bottom tap needs $0.5R$ below it out of $7.5R$.
:::

## The successive-approximation A/D converter

::: define Successive-approximation A/D converter | 逐次比较型A/D转换器
A feedback direct-comparison (反馈直接比较型) ADC that finds the code bit by bit, from
the MSB down: it tries each bit as 1, converts the trial code back to a voltage with a
D/A converter, compares that with the input, and keeps the 1 only if the trial isn't
too large. Also called 逐次逼近型 or 逐次渐近型.
:::

### Weighing on a balance

The slides' analogy: you have weights of 8, 4, 2 and 1 g (15 g together) and an
unknown object $W_x = 13$ g. Try the biggest weight first, then each smaller one,
keeping each weight that doesn't tip the balance:

| Try | Weights on the pan | Verdict | Total kept |
|---|---|---|---|
| 1st | 8 g | lighter than $W_x$: keep | 8 g |
| 2nd | add 4 g (12 g) | still lighter: keep | 12 g |
| 3rd | add 2 g (14 g) | heavier than $W_x$: remove | 12 g |
| 4th | add 1 g (13 g) | equal: keep | 13 g |

Kept: 8, 4, 1 g, so $W_x = 1101$ in binary. Four weighings for four bits. It is a
**binary search** (二分比较): each try halves the range the answer can be in.

### The circuit

The block diagram:

- a **voltage comparator**, with the input to be converted, $u_i$, on one input and
  the D/A converter's output $u_o$ on the other; its output $u_c$ says which is larger;
- a **D/A converter** (lesson 12.1), fed in parallel by
- a **code register** (数码寄存器), the "pan" holding the trial code;
- a **shift register** (移位寄存器) that produces sequence pulses (顺序脉冲), pointing at
  one bit after another, starting at the MSB ("1000", then "0100", …);
- **control logic** (控制逻辑), driven by the clock, that clears and sets the
  registers and decides from $u_c$ whether each trial 1 stays.

::: law Successive-approximation procedure | 逐次逼近的转换过程
Before conversion, clear all registers. Then set the MSB to 1, so the code is 100…0;
the D/A converter turns it into $u_o$, which is compared with $u_i$. If $u_i < u_o$ the
number is too big: clear that 1. If $u_i \ge u_o$ it isn't big enough yet: keep it. Then
set the next bit to 1 and decide in the same way, down to the LSB. When all bits are
done, the register holds the output code.
:::

The D/A converter here follows lesson 12.1's formula, $u_o = -\frac{V_{REF}}{2^n}D_n$,
so with a **negative** $V_{REF}$ the trial voltages are positive. Each bit's trial adds
its weight: the MSB is worth $\frac{|V_{REF}|}{2}$, the next $\frac{|V_{REF}|}{4}$, and so on.

::: example The slides' 8-bit conversion (u_I = 5.27 V)
An 8-bit successive-approximation ADC has $V_{REF} = -8$ V and $u_I = 5.27$ V. Find the
result.
== The weights ==
$u_o = -\frac{V_{REF}}{2^8}D_n = \frac{8}{256}D_n = 0.03125\ \text{V}\times D_n$. Bit by bit
from $D_7$: 4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125 V.
== Trying each bit ==
| Clock | Bit tried | Trial code $D_7 \dots D_0$ | Trial $u_o$ (V) | Compare with 5.27 V | Bit |
|---|---|---|---|---|---|
| 1 | $D_7$ | 10000000 | 4 | $4 < 5.27$ | keep 1 |
| 2 | $D_6$ | 11000000 | 6 | $6 > 5.27$ | clear |
| 3 | $D_5$ | 10100000 | 5 | $5 < 5.27$ | keep 1 |
| 4 | $D_4$ | 10110000 | 5.5 | $5.5 > 5.27$ | clear |
| 5 | $D_3$ | 10101000 | 5.25 | $5.25 < 5.27$ | keep 1 |
| 6 | $D_2$ | 10101100 | 5.375 | $5.375 > 5.27$ | clear |
| 7 | $D_1$ | 10101010 | 5.3125 | $5.3125 > 5.27$ | clear |
| 8 | $D_0$ | 10101001 | 5.28125 | $5.28125 > 5.27$ | clear |
== Result ==
The register holds **10101000** = 168, which stands for $168\times0.03125 = 5.25$ V. The
error is $5.27 - 5.25 = 0.02$ V, less than one LSB (0.03125 V).
== Check ==
$5.27/0.03125 = 168.6$; the converter keeps the whole part, 168: successive
approximation is a round-down quantiser.
:::

The trial voltage swings above and below the input and settles in towards it (4, 6, 5,
5.5, 5.25, 5.375, 5.3125, 5.28125, then 5.25 held), which is where the name
"successive approximation" comes from. Play with the input below.

::: explore Successive approximation: the code it settles on (round-down)
slider n: 2 .. 12 = 8 | | step 1
slider uI: 0 .. 8 = 5.27 | V
slider VREF: -10 .. -1 = -8 | V
D = min(floor(uI / (abs(VREF) / 2^n)), 2^n - 1) | | Output code (decimal)
level = abs(VREF) / 2^n * min(floor(uI / (abs(VREF) / 2^n)), 2^n - 1) | V | Voltage the code stands for
msb = abs(VREF) / 2 | V | Weight of the first bit tried
clocks = n + 2 | | Clock periods per conversion
:::

### How many clock periods?

The slide says an $n$-bit conversion needs $n + 2$ clock pulses, while its timing
diagram marks $9T_{CP}$ for $n = 8$. Both are right: count the periods in the diagram.

- **One** period before the trials, while the start pulse $\overline{STRT}$ is low: the
  registers are cleared and the converter is set to begin.
- **$n$** periods of trials, one bit each (8 here: $D_7$ to $D_0$).
- **One** more period in which the finished code is transferred to the output
  (in the diagram, the last column, where $u_{OUT}$ settles at 5.25 V).

The $9T_{CP}$ arrow spans the trials and the output period, $n + 1$; adding the start
period before it gives $n + 2 = 10$.

::: formula Conversion time of a successive-approximation ADC | 逐次比较型A/D转换器的转换时间
$$T_{conv} = (n + 2)\,T_{CP}$$
--
T_{conv} | time for one conversion | s
n | number of output bits |
T_{CP} | clock period | s
:::

::: example Conversion time
An 8-bit successive-approximation ADC has a 1 MHz clock. How long does one conversion
take, and how many conversions a second can it do at most?
== Time ==
$T_{conv} = (8 + 2)\times1\ \mu\text{s} = 10\ \mu$s.
== Rate ==
At most $1/10\ \mu\text{s} = 100\,000$ conversions a second (100 kSPS).
:::

### Strengths and weaknesses

- Slower than the flash type: $n + 2$ clock periods per conversion. But the time is
  **fixed**, whatever the input.
- With many bits its circuit is far smaller than a flash converter's: one comparator,
  one DAC, two registers, instead of $2^n - 1$ comparators.
- So it balances speed and accuracy, and it is the type **most used** in integrated
  A/D converters today.

::: callout pitfall Which way to compare
Keep the trial 1 when the input is **at least** the trial voltage ($u_i \ge u_o$); clear
it when the trial is too big ($u_i < u_o$). Mixing these up gives the complement of the
right code.
:::

### The ADC0808/0809

The ADC0808/0809 is an integrated 8-bit successive-approximation ADC with an 8-input
analogue multiplexer in front of it. Its blocks: IN0–IN7 → an 8-to-1 analogue selector
(8选1模拟量选择器) → the 8-bit successive-approximation converter → a tri-state output
latch (三态输出锁存器) → $D_0 \dots D_7$. An address latch, loaded by ALE from ADDA, ADDB,
ADDC, chooses the channel.

| Pins | Role |
|---|---|
| IN0–IN7 | analogue inputs (8 channels) |
| ADDA, ADDB, ADDC | channel address inputs (ADDC the MSB: 000 picks IN0, 111 picks IN7) |
| ALE | address latch enable: stores the address |
| START | start pulse input |
| EOC | end of conversion output |
| OE | output enable: opens the tri-state output latch |
| $D_0 \dots D_7$ | digital outputs |
| CLOCK | clock input |
| $V_{REF}(+)$, $V_{REF}(-)$ | reference voltage inputs; typically $+5$ V and $-5$ V (or 0 V) |

Using it: put the channel's address on ADDA–ADDC and latch it with ALE; pulse START;
wait for EOC to signal that the conversion has ended; then set OE to put the result on
$D_0 \dots D_7$. The tri-state outputs let it share a processor's data bus.

## The pipelined A/D converter

::: define Pipelined A/D converter | 流水线型A/D转换器
An ADC made of several identical stages (阶段) in a chain. Each stage holds a 1-bit
parallel-comparison ADC, a 1-bit inverted-T DAC, a summing unit and an amplifier with
gain 2. Each stage decides one bit and passes on an amplified
{{term residue | 残差}}; all stages work at once, on different samples.
:::

### One stage

The stage's input is $u_i$ for the first stage, $R(0) = u_i$, or the previous stage's
residue.

1. A **1-bit flash ADC**: one comparator between the input and $V_{REF}/2$ (from two
   equal resistors), stored in a D flip-flop at the clock: the stage's bit $d$ is 1 if
   the input is at least $V_{REF}/2$.
2. A **1-bit inverted-T DAC** turns that bit back into $u_{DA} = d\times V_{REF}/2$.
3. The **summing unit** subtracts it: what is left is the part of the input this bit
   couldn't account for, between 0 and $V_{REF}/2$.
4. The **×2 amplifier** doubles that, so the residue fills the full 0 to $V_{REF}$ range
   again, ready for an identical next stage.

::: formula Residue of a pipeline stage | 流水线型A/D转换器的残差
$$R(n) = 2\left[R(n-1) - u_{DA}(n)\right], \qquad u_{DA}(n) = d\times\frac{V_{REF}}{2}$$
--
R(n) | residue passed on by stage $n$; $R(0) = u_i$ | V
u_{DA}(n) | output of stage $n$'s 1-bit DAC | V
d | the bit stage $n$ decides: 1 if its input is at least $V_{REF}/2$ |
V_{REF} | reference voltage of the 1-bit ADC and DAC | V
:::

It is the balance again, but with the object doubled instead of the weights halved:
each stage asks "is it at least half of full scale?", takes that half away, and
magnifies the rest so the next stage can ask the same question.

The residue as a function of the stage's input is a sawtooth: it climbs from 0 to
$V_{REF}$ as the input goes from 0 to $V_{REF}/2$, drops back to 0, and climbs again.

::: plot One stage: residue R against the stage's input (VREF = 1 V)
x: 0 .. 0.999
xlabel: stage input (V)
ylabel: residue (V)
y: 0 .. 1
R(u) = 2 u - floor(2 u)
d(u) = floor(2 u)
:::

### The slides' 4-bit example (u_I = 0.7 V)

::: example A 4-bit pipelined conversion
A 4-bit pipelined ADC has $V_{REF} = 1$ V for its 1-bit ADCs and DACs, and $u_I = 0.7$ V.
Find each stage's bit and residue, and the result.
== Stage 1 ==
$R(0) = 0.7\ \text{V} \ge 0.5$ V, so $d_3 = 1$. $u_{DA}(1) = 1\times V_{REF}/2 = 0.5$ V.
$R(1) = 2\times[0.7 - 0.5] = 0.4$ V.
== Stage 2 ==
$0.4 < 0.5$ V, so $d_2 = 0$. $u_{DA}(2) = 0\times V_{REF}/2 = 0$ V.
$R(2) = 2\times[0.4 - 0] = 0.8$ V.
== Stage 3 ==
$0.8 \ge 0.5$ V, so $d_1 = 1$. $u_{DA}(3) = 0.5$ V. $R(3) = 2\times[0.8 - 0.5] = 0.6$ V.
== Stage 4 ==
$0.6 \ge 0.5$ V, so $d_0 = 1$.
== Result ==
$d_3d_2d_1d_0 = 1011$ = 11, standing for $11\times V_{REF}/2^4 = 0.6875 \approx 0.7$ V.
(Like successive approximation, it rounds down: $0.7\times16 = 11.2 \to 11$.)
:::

Each stage's residue is, in effect, the input times $2^k$ with the whole volts thrown
away, so the stages pick off the binary digits of $u_I/V_{REF}$ one by one, MSB first.
Check it with any input:

::: explore A 4-bit pipeline: residues and result
slider uI: 0 .. 0.999 = 0.7 | V
slider VREF: 0.5 .. 2 = 1 | V
R1 = 2 uI - VREF floor(2 uI / VREF) | V | Residue R(1)
R2 = 4 uI - VREF floor(4 uI / VREF) | V | Residue R(2)
R3 = 8 uI - VREF floor(8 uI / VREF) | V | Residue R(3)
code = min(floor(16 uI / VREF), 15) | | Result (decimal)
level = VREF / 16 * min(floor(16 uI / VREF), 15) | V | Voltage it stands for
:::

### Data delay, and a result every clock

The four bits of one sample are decided on four successive clocks, stage 1 first. To
line them up, each bit goes through a chain of latches whose length makes up the
difference: $d_3$ through three latches before the output latch, $d_2$ through two,
$d_1$ through one, $d_0$ straight in. After four clock periods the four bits of the
same sample arrive together in the output latch.

So each result appears **four clock periods after its sample** was taken: there is a
**data delay** (数据延迟). But the stages work concurrently: while stage 1 quantises
this moment's sample, stage 2 works on the previous one's residue, stage 3 on the one
before, and so on. Every clock, every stage resolves a bit and the converter outputs a
complete result. However many stages (bits) there are, data go in continuously and
come out continuously, one clock apart, like an assembly line where each car takes an
hour to build but one leaves every minute.

More stages, or stages that resolve more than one bit each, give a more accurate result.

::: callout key Latency versus throughput
A pipelined ADC has a delay (latency) of several clocks before a sample's result
appears, but its throughput is one result per clock. That is what makes it fast and
precise at once.
:::

### The AD9224

The AD9224 is a single-chip 12-bit pipelined ADC sampling at up to 40 MSPS (million
samples per second, 兆次采样/秒). Its main pins:

| Pin | Name | Role |
|---|---|---|
| 1 | CLK | clock input |
| 2 | BIT12 | data output, least significant bit |
| 3–12 | BIT11–BIT2 | data outputs |
| 13 | BIT1 | data output, most significant bit |
| 14 | OTR | out of range: the input overflowed |
| 15, 26 | AVDD | analogue supply (+5 V) |
| 16, 25 | AVSS | analogue ground |
| 17 | SENSE | reference voltage select |
| 18 | VREF | reference voltage |
| 19 | REFCOM (AVSS) | reference common |
| 20, 21 | CAPB, CAPT | noise suppression (decoupling) |
| 22 | CML | common-mode voltage (AVDD/2) |
| 23 | VINA | positive analogue input |
| 24 | VINB | negative analogue input |
| 27 | DRVSS | digital ground |
| 28 | DRVDD | digital supply, +3 to +5 V |

Note the numbering: here BIT1 is the MSB and BIT12 the LSB, the reverse of the $D_0$-is-LSB
habit.

Its input is differential, VINA against VINB, and the slides show two ways to drive it:

- **Differential input** (差分输入方式). Two op-amps with 500 Ω resistors. The upper one
  has $u_I$ through 500 Ω to its $-$ input with 500 Ω feedback (gain $-1$ for $u_I$),
  and its $+$ input at $V_{REF}/2$ (500 Ω to ground and 500 Ω to the VREF pin), which
  the non-inverting gain of 2 turns into $V_{REF}$: its output is $V_{REF} - u_i$. The
  lower one has $u_I$ and $V_{REF}$ through 500 Ω each to its $+$ input, and gain 2:
  output $V_{REF} + u_i$. Each output goes through 50 Ω to VINA and VINB, so the chip sees
  $2u_i$ between them, centred on $V_{REF}$.
- **Single-ended input** (单端输入方式). A voltage follower buffers $u_I$, then 25 Ω and
  40 pF filter it, and coupling capacitors (0.1 μF and 10 μF in parallel) carry the
  signal to VINA through 50 Ω. Two 1 kΩ resistors from CML bias both VINA and VINB at
  the common-mode voltage AVDD/2; VINB is held there by 10 μF and 0.1 μF to ground.

(These interfaces use the op-amp circuits from the analogue units; they are background,
not core exam material.)

## Main parameters of an A/D converter

::: define Resolution of an A/D converter | A/D转换器的分辨率
How finely an ADC can distinguish its input. Given by the number of output bits, or as
the voltage of one quantisation step, $\text{FSR}/2^n$, where FSR is the full-scale
input range. With the full-scale input fixed, more bits mean a smaller step and a
higher resolution.
:::

::: formula Resolution of an A/D converter | A/D转换器的分辨率
$$\text{resolution} = \frac{\text{FSR}}{2^n}$$
--
\text{FSR} | full-scale input range (满量程输入) | V
n | number of output bits |
:::

::: define Conversion error of an A/D converter | A/D转换器的转换误差
The difference between the digital output an ADC actually gives and the one it should
give in theory, usually quoted in multiples of the LSB. "Relative error ≤ ±LSB/2" means
the actual output is within half an LSB of the ideal.
:::

::: define Conversion time | 转换时间
The time from the arrival of the conversion command to a stable digital output: a
measure of the conversion speed (转换速度).
:::

Ordered from shortest conversion time to longest: **parallel-comparison → pipelined →
successive-approximation → indirect** (such as dual-slope) A/D converters.

::: example Resolution of a 10-bit ADC
A 10-bit ADC has a 0–5 V input range. Find its resolution as a voltage, and what an
error of ±LSB/2 means in volts.
== Resolution ==
$\text{FSR}/2^n = 5/1024 \approx 4.88$ mV.
== Error ==
±LSB/2 = ±2.44 mV: the output may be off by at most half a step.
:::

::: callout pitfall Two different "resolutions"
A DAC's resolution (lesson 12.1) is a ratio, $1/(2^n - 1)$. An ADC's, as the slides give
it, is a voltage step, $\text{FSR}/2^n$. Both are often just quoted as "$n$ bits". Read
which one a question asks for.
:::

## Comparing the types, and choosing one

The slides compare four types. The dual-slope (double-integrating, 双积分) ADC is an
**indirect** converter, mentioned here only for comparison: it integrates the input for
a fixed time and then times how long a known reference takes to integrate back to
zero, turning voltage into a count of clock pulses. Integrating averages out noise,
which makes it precise but slow.

| Type | How it converts | Strengths and weaknesses |
|---|---|---|
| parallel (flash) | compares the input with fixed levels all at once: one comparison and done | fastest; poor noise immunity (抗干扰能力差), hard to raise the resolution (comparators double per bit) |
| successive approximation | compares with a set of known voltages one after another, one bit per comparison | fairly fast, fixed conversion time; small circuit; the most used |
| dual-slope | turns the input and a known voltage into pulse counts (times) and compares those: indirect | strong noise immunity, high resolution and accuracy easily; slow |
| pipelined | combines parallel and successive comparison; outputs results continuously | fast, high resolution and accuracy easily; needs accurate hardware for amplifying the residues |

The chapter's summary in one line each: flash is fast; dual-slope is precise;
successive approximation balances accuracy and speed; pipelined has the advantages of
the others, which is why it is now widely used. And for both ADCs and DACs, the two
main parameters are **conversion accuracy and conversion speed**: once connected to a
system, they set the system's accuracy and speed.

### Choosing for a job

Start from what the job needs most:

| Need | Choose | Why |
|---|---|---|
| the very highest speed, few bits (e.g. a fast oscilloscope's front end) | flash | one comparison per conversion |
| high speed and high resolution, a continuous stream of samples (video, communications) | pipelined | one result per clock, many bits |
| moderate speed and resolution, low cost, general data acquisition (a microcontroller reading sensors) | successive approximation | fixed short conversion time, small circuit |
| high precision in a noisy setting, speed unimportant (a digital multimeter) | dual-slope | integrating rejects noise |

::: example Choosing an ADC
Choose a type for each: (a) a 12-bit converter for a 20 MSPS video signal; (b) a
4½-digit multimeter that takes a few readings a second next to mains wiring; (c) a
10-bit converter reading eight temperature sensors in a small controller; (d) a 6-bit
converter at 1 GSPS.
== (a) ==
Pipelined: tens of MSPS with 12 bits (the AD9224 does 40 MSPS at 12 bits). A 12-bit
flash would need 4095 comparators.
== (b) ==
Dual-slope: accuracy and noise immunity matter, speed doesn't.
== (c) ==
Successive approximation, like the ADC0809 with its 8-channel multiplexer: cheap,
small, fast enough.
== (d) ==
Flash: only 63 comparators for 6 bits, and nothing is faster.
:::

::: callout exam What the converter-type questions look like
The scope: know how the parallel-comparison, successive-approximation and pipelined
ADCs work, their strengths and weaknesses (speed, accuracy, noise immunity), enough to
choose one in a design; questions like the textbook's self-test (short concept or
step questions). Expect: the number of comparators in an $n$-bit flash ADC; following
a successive-approximation conversion bit by bit (and its $n + 2$ clock periods);
following a pipeline's residues; which type is fastest, most precise, most noise
immune, most used; and choosing a type for a stated need.
:::

::: cards Types of A/D converter
Flash (parallel-comparison) ADC :: Compares the input with all levels at once, one comparator per level, then a priority encoder.
Comparators in an $n$-bit flash ADC :: $2^n - 1$ (and as many flip-flops).
3-bit flash ADC thresholds :: $\frac{1}{15}, \frac{3}{15}, \dots, \frac{13}{15}V_{REF}$ (rounding quantisation, $\Delta = \frac{2}{15}V_{REF}$).
Flash ADC: strengths and weaknesses :: Fastest; complex (comparators double per bit), poor noise immunity, hard to raise the resolution.
Successive-approximation ADC: parts :: Comparator, D/A converter, code register, shift register (sequence pulses), control logic, clock.
Successive approximation: the rule for each bit :: Set it to 1; keep it if $u_i \ge u_o$, clear it if $u_i < u_o$.
Successive approximation: conversion time :: $(n + 2)T_{CP}$: one clock to start, $n$ trials, one to output.
Successive approximation: strengths :: Fairly fast with a fixed conversion time; small circuit; the most used integrated ADC.
ADC0808/0809 :: 8-bit successive-approximation ADC with an 8-channel analogue multiplexer (ADDA–ADDC, ALE, START, EOC, OE).
Pipeline stage contents :: A 1-bit flash ADC, a 1-bit inverted-T DAC, a summing unit and a ×2 amplifier.
Pipeline residue formula :: $R(n) = 2[R(n-1) - u_{DA}(n)]$, $u_{DA}(n) = d\times V_{REF}/2$.
Pipelined ADC: delay and throughput :: A result appears several clocks after its sample (data delay), but one result comes out every clock.
AD9224 :: 12-bit pipelined ADC, up to 40 MSPS.
ADC resolution (as a voltage) :: $\text{FSR}/2^n$.
Conversion time, shortest to longest :: Parallel → pipelined → successive approximation → indirect (dual-slope).
Dual-slope ADC :: Indirect: turns voltages into pulse counts by integrating; precise and noise immune, but slow.
:::

::: quiz Types of A/D converter
? How many comparators does an 8-bit parallel-comparison (flash) ADC need?
answer: 255
tolerance: 0
> $2^n - 1 = 2^8 - 1 = 255$ comparators, and as many flip-flops.

? A 3-bit flash ADC has $V_{REF} = 15$ V. What is its output code for $u_I = 10.5$ V?
- [x] 101
- [ ] 110
- [ ] 100
> The taps are at 1, 3, 5, …, 13 V. 10.5 V is above 1, 3, 5, 7, 9 V (five comparators on)
> and below 11 V, so the code is 5 = 101.

? A 4-bit successive-approximation ADC has $V_{REF} = -8$ V and $u_I = 5.3$ V. What code does it give?
- [x] 1010
- [ ] 1011
- [ ] 1100
- [ ] 0101
> Weights 4, 2, 1, 0.5 V. Try 1000 (4 V ≤ 5.3: keep), 1100 (6 V > 5.3: clear), 1010
> (5 V ≤ 5.3: keep), 1011 (5.5 V > 5.3: clear). Result 1010 (5 V).

? In the slides' 8-bit example ($V_{REF} = -8$ V, $u_I = 5.27$ V), what voltage does the D/A converter produce on the 5th trial (bit $D_3$)?
answer: 5.25 V
tolerance: 0.1%
> After the first four trials the register holds 1010 0000 (5 V). Trying $D_3$ adds
> $8/2^5 = 0.25$ V: 5.25 V, which is below 5.27 V, so $D_3$ stays.

? A 10-bit successive-approximation ADC has a 2 MHz clock. How long does one conversion take?
answer: 6 μs
tolerance: 1%
> $(n + 2)T_{CP} = 12\times0.5\ \mu\text{s} = 6\ \mu$s.

? A 4-bit pipelined ADC ($V_{REF} = 1$ V) converts $u_I = 0.3$ V. What is the residue $R(1)$ after stage 1?
answer: 0.6 V
tolerance: 1%
> $0.3 < 0.5$ V, so $d_3 = 0$ and $u_{DA}(1) = 0$; $R(1) = 2\times(0.3 - 0) = 0.6$ V.

? The same pipeline converts $u_I = 0.3$ V. What is the 4-bit result?
- [x] 0100
- [ ] 0101
- [ ] 0011
> $R(0) = 0.3 \to d_3 = 0$, $R(1) = 0.6$; $0.6 \ge 0.5 \to d_2 = 1$, $R(2) = 0.2$;
> $d_1 = 0$, $R(3) = 0.4$; $d_0 = 0$. Result 0100 = 4, i.e. $4/16 = 0.25$ V
> ($0.3\times16 = 4.8 \to 4$).

? A 12-bit ADC has a full-scale input of 4.096 V. What is its resolution as a voltage?
answer: 1 mV
tolerance: 1%
> $\text{FSR}/2^n = 4.096/4096 = 0.001$ V = 1 mV.

? Which type of A/D converter has the strongest noise immunity, at the cost of speed?
- [x] dual-slope (double-integrating)
- [ ] parallel-comparison (flash)
- [ ] successive approximation
- [ ] pipelined
> Integrating the input averages out noise; the dual-slope ADC is precise and noise
> immune but slow. The flash type has the poorest noise immunity.

? A design needs 12 bits at 30 million samples per second. Which type should you choose?
- [x] pipelined
- [ ] parallel-comparison (flash)
- [ ] successive approximation
- [ ] dual-slope
> Pipelined ADCs give one result per clock with many bits (the AD9224: 12 bits, 40
> MSPS). A 12-bit flash ADC would need 4095 comparators; successive approximation needs
> $n + 2 = 14$ clocks per result; dual-slope is far too slow.

? Order these from shortest to longest conversion time: successive approximation, parallel-comparison, indirect (dual-slope), pipelined.
- [x] parallel-comparison, pipelined, successive approximation, indirect
- [ ] pipelined, parallel-comparison, successive approximation, indirect
- [ ] parallel-comparison, successive approximation, pipelined, indirect
> As the slides list it: parallel → pipelined → successive approximation → indirect.
:::

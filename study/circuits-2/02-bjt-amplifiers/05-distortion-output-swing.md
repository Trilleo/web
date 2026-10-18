---
title: Distortion and output swing
zh: 失真与最大不失真输出
summary: Following a signal through the transistor's curves, why a badly placed Q point clips the output (saturation and cutoff distortion), how big the output can get before it clips, and the power triangle.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

Lesson 2.4 placed the Q point and drew the AC load line, the track the transistor moves
along when a signal arrives. This lesson sets it moving. Following the signal through
the curves shows directly why the CE amplifier inverts, what limits how big the output
can get, and what goes wrong when the Q point is too high or too low: the output
**clips**, and which side clips tells you which way to fix the bias. Diagnosing a
clipped waveform is a favourite exam question, and the formula for the maximum
undistorted output, $U_{om(max)} = \min[U_{CEQ} - U_{CES},\ I_{CQ}R_L']$, is one you will
use again and again.

## Following the signal through the curves

The graphical method treats DC and AC separately and then adds them: first the static
values ($U_{BEQ}$, $I_{BQ}$, $I_{CQ}$, $U_{CEQ}$), then the swings on top. With a signal,
every quantity is "DC + AC": $u_{BE} = U_{BEQ} + u_{be}$, and so on (lesson 2.4's
notation).

The slides draw four linked graphs:

1. **Input voltage.** Draw $u_{BE}(t)$ under the input characteristic: a small sine
   $u_{be}$ around $U_{BEQ}$.
2. **Base current.** Project it up onto the input curve: $i_B$ swings between $I_{B1}$
   and $I_{B2}$ around $I_{BQ}$. For a small signal the curve is nearly straight over
   this range, so $i_b$ is a clean sine.
3. **Collector current.** On the output characteristics, the operating point slides
   along the **AC load line** between where it crosses the $I_{B1}$ and $I_{B2}$ curves,
   so $i_C$ swings between $I_{C1}$ and $I_{C2}$ around $I_{CQ}$.
4. **Collector voltage.** Project down onto the $u_{CE}$ axis: when $i_C$ is at its
   largest, $u_{CE}$ is at its smallest. The swing $u_{ce}$, passed by $C_2$, is $u_o$.

The conclusions:

- $u_i\uparrow \;\to\; u_{be}\uparrow \;\to\; i_b\uparrow \;\to\; i_c\uparrow \;\to\; u_{ce}\downarrow$: the output is **inverted**.
- Measure the amplitudes of $u_{be}$ and $u_{ce}$ on the graphs and their ratio is the
  voltage gain, $A_u = u_o/u_i = u_{ce}/u_{be}$ (negative, because of the inversion).
- The same picture shows how big the output can get before it clips (below).

::: example Gain from the graphs
In the slide's drawing Q is at $U_{CEQ} = 6$ V, $I_{CQ} = 1.5$ mA, and the AC load line
meets the $u_{CE}$ axis at 8 V. Suppose $u_{be}$ has a 10 mV amplitude, which the input
curve turns into an $i_b$ of amplitude 10 μA, and $\beta = 50$. Find $R_L'$, the output
amplitude and $A_u$.
== AC load resistance ==
The axis crossing is $U_{CEQ} + I_{CQ}R_L' = 8$ V, so
$R_L' = (8 - 6)/1.5\text{ mA} = 1.33$ kΩ.
== Collector swing ==
$i_c$ amplitude $= \beta \times 10\ \mu\text{A} = 0.5$ mA; along the AC load line this
gives $u_{ce}$ amplitude $= 0.5 \times 1.33 = 0.67$ V.
== Gain ==
$A_u = -\dfrac{0.67\text{ V}}{10\text{ mV}} \approx -67$: inverted, and 67 times larger.
:::

## When the output clips: nonlinear distortion

The operating point can only move along the AC load line between two walls. At the top
left it runs into the **saturation region** (it can't go below $u_{CE} = U_{CES}$); at the
bottom right it runs into the **cutoff region** (it can't go below $i_C = 0$). If the
swing is too large, or the Q point sits too close to one wall, part of the wave is cut
off flat. Distortion caused by the transistor entering a nonlinear region like this is
{{term nonlinear distortion | 非线性失真}}.

::: define Saturation distortion | 饱和失真
Nonlinear distortion caused by the operating point entering the transistor's
saturation region. For an NPN common-emitter amplifier, the output voltage is clipped at
the **bottom** ({{zh 底部失真}}).
:::

::: define Cutoff distortion | 截止失真
Nonlinear distortion caused by the operating point entering the transistor's cutoff
region. For an NPN common-emitter amplifier, the output voltage is clipped at the
**top** ({{zh 顶部失真}}).
:::

Why bottom for saturation? Saturation happens on the half-cycle where $i_C$ is
**largest**, which is when $u_{CE}$ is **smallest**: the trough of $u_{ce}$ (and of
$u_o$) is flattened at $U_{CES}$. Cutoff happens when $i_C$ falls to zero, which is
when $u_{CE}$ is **largest**: the peak of $u_o$ is flattened.

The plot shows $u_o$ for an NPN CE stage. The wall on the saturation side is
$U_{CEQ} - U_{CES}$ below zero; the wall on the cutoff side is $I_{CQ}R_L'$ above zero.
Drag $U_{CEQ}$ low (Q too high, near saturation) or make $I_{CQ}R_L'$ small (Q too low,
near cutoff), and raise the amplitude, to see each kind.

::: plot Output of an NPN CE amplifier, with clipping
x: 0 .. 12.566
y: -6 .. 6
xlabel: ωt (rad)
ylabel: uo (V)
uo(t) = min(Ucut, max(UCES - UCEQ, -A sin(t)))
ideal(t) = -A sin(t)
slider A: 0 .. 6 = 3 | V
slider UCEQ: 0.5 .. 10 = 6 | V
slider Ucut: 0.5 .. 8 = 3 | V
slider UCES: 0 .. 1 = 0.3 | V
:::

Ucut is $I_{CQ}R_L'$; $u_o$ is the clipped output and "ideal" what an undistorted
amplifier would give.

::: callout pitfall Bottom clipping means saturation, for an NPN
For an **NPN** CE amplifier: flattened **troughs** → saturation, flattened **peaks** →
cutoff. For a **PNP** the voltages are reversed, so it's the other way round: saturation
clips the top, cutoff the bottom. Always check the transistor type first.
:::

### Curing it

The cure is to move Q away from the wall it's hitting (or to reduce the input):

| Symptom (NPN) | Cause | Fix in a fixed-bias circuit |
| --- | --- | --- |
| Troughs of $u_o$ flattened | Q too high (too close to saturation): $I_{CQ}$ too big, $U_{CEQ}$ too small | **Increase $R_b$** to reduce $I_{BQ}$ (or reduce $R_c$) |
| Peaks of $u_o$ flattened | Q too low (too close to cutoff): $I_{CQ}$ too small | **Decrease $R_b$** to increase $I_{BQ}$ |
| Both flattened | The input is simply too big | Reduce the input |

::: example Diagnosing a scope trace
A fixed-bias NPN CE amplifier's output, seen on an oscilloscope, has its troughs
flattened. What kind of distortion is it, and how should $R_b$ change?
== Identify it ==
NPN, bottom clipped: **saturation distortion**. The Q point is too high (too much
collector current, too little $U_{CEQ}$).
== Fix it ==
Lower $I_{BQ} = (V_{CC} - U_{BE})/R_b$ by **increasing $R_b$**. $I_{CQ}$ falls,
$U_{CEQ} = V_{CC} - I_{CQ}R_c$ rises, and Q moves away from saturation.
:::

## The maximum undistorted output

How big can $u_o$ get before it clips? From Q, the operating point can travel two
distances along the AC load line:

- **Towards saturation:** $u_{CE}$ can fall from $U_{CEQ}$ to $U_{CES}$, a swing of
  $U_{CEQ} - U_{CES}$.
- **Towards cutoff:** $i_C$ can fall from $I_{CQ}$ to 0, which along a line of slope
  $-1/R_L'$ raises $u_{CE}$ by $I_{CQ}R_L'$.

A sine wave swings equally both ways, so the **smaller** of the two is the limit.

::: formula Maximum undistorted output amplitude | 最大不失真输出幅度
$$U_{om(max)} = \min\left[\,U_{CEQ} - U_{CES},\ \ I_{CQ} R_L'\,\right]$$
--
U_{om(max)} | largest output amplitude (peak) without clipping | V
U_{CEQ} | quiescent collector–emitter voltage | V
U_{CES} | saturation voltage, about 0.3 V (sometimes taken as 0) | V
I_{CQ} | quiescent collector current | A
R_L' | AC load resistance $R_c /\!/ R_L$ | Ω
:::

Whichever term is smaller also tells you **which distortion comes first** as the input
grows: if $U_{CEQ} - U_{CES}$ is smaller, saturation; if $I_{CQ}R_L'$ is smaller, cutoff.
The best Q point is in the **middle of the AC load line**, where the two are equal and
the swing is as large as it can be.

::: explore Maximum undistorted output
slider UCEQ: 1 .. 12 = 8.3 | V
slider ICQ: 0.2 .. 4 = 1.34 | mA
slider RL: 0.5 .. 5 = 1.5 | kΩ
slider UCES: 0 .. 1 = 0.3 | V
sat = UCEQ - UCES | V | Room towards saturation
cut = ICQ RL | V | Room towards cutoff (ICQ·R'L)
Uom = min(sat, cut) | V | Maximum undistorted amplitude
:::

(RL here is $R_L'$ in kΩ; mA × kΩ = V.)

::: example Which side limits?
The divider-bias amplifier of lesson 2.4 has $U_{CEQ} = 8.3$ V, $I_{CQ} = 1.34$ mA and
$R_L' = 1.5$ kΩ. Take $U_{CES} = 0.3$ V. Find $U_{om(max)}$ and the first distortion.
== The two limits ==
Towards saturation: $8.3 - 0.3 = 8.0$ V. Towards cutoff: $1.34 \times 1.5 = 2.0$ V.
== Result ==
$U_{om(max)} = \min(8.0, 2.0) = 2.0$ V. Cutoff is much closer, so a growing input first
gives **cutoff distortion** (peaks flattened). This Q point is too low for the AC load
line: a larger $I_{CQ}$ would allow a bigger swing.
:::

::: callout key The rule in one line
Output swing = the smaller of "room to saturation" $U_{CEQ} - U_{CES}$ and "room to
cutoff" $I_{CQ}R_L'$, and the smaller one names the distortion that appears first.
:::

## Output power and the power triangle

With a sinusoidal output of amplitudes $U_{om}$ and $I_{om}$ into a resistive load, the
output power is the product of the RMS values:

::: formula Output power | 输出功率
$$P_o = \frac{U_{om}}{\sqrt{2}} \cdot \frac{I_{om}}{\sqrt{2}} = \frac{1}{2} U_{om} I_{om}$$
--
P_o | signal power delivered to the load | W
U_{om} | amplitude of the output voltage | V
I_{om} | amplitude of the output current | A
:::

On the output characteristics, $\frac{1}{2}U_{om}I_{om}$ is the area of a right triangle:
from Q, a horizontal side of length $U_{om}$ to point B, a vertical side of length
$I_{om}$ up to point A on the AC load line, with the load line as hypotenuse. This is
the {{term power triangle | 功率三角形}} $\triangle ABQ$. To get a large $P_o$ the triangle
must be big, so **both** $U_{om}$ and $I_{om}$ must be large: the Q point and the AC load
line have to be chosen so the swing uses as much of the curves as possible.

::: example Power from the swing
In the last example the output swing is limited to $U_{om} = 2.0$ V, and the collector's
signal current swings $I_{om} = 2.0/1.5\text{ k} = 1.33$ mA through $R_L'$. Find the
signal power developed in $R_L'$.
== Power ==
$P_o = \frac{1}{2} \times 2.0 \times 1.33 = 1.33$ mW.
== Note ==
Of this, the part in $R_L$ alone is $U_{om}^2/(2R_L) = 4/(2 \times 3\text{ k}) = 0.67$ mW;
the rest heats $R_c$.
:::

## Worked example: designing from the load lines

::: example Example 3.5.2: reading a design off the graph
A divider-bias CE amplifier (lesson 2.4's circuit, $C_1$, $C_2$, $C_e$ large) has
$V_{CC} = 12$ V, $U_B = 2.7$ V, $R_{b2} = 2.7$ kΩ, $U_{BEQ} = 0.7$ V, $\beta = 100$,
$r_{bb'} = 200$ Ω. Its output characteristics show a DC load line from $(0, 4\text{ mA})$ to
$(12\text{ V}, 0)$, Q at $(6\text{ V}, 2\text{ mA})$ and an AC load line through Q that
meets the $u_{CE}$ axis at 9 V. (1) Find $R_{b1}$, $R_e$, $R_c$ and $R_L$. (3) What is
the largest peak-to-peak input without distortion? (4) As the input grows, which
distortion appears first? (Part (2), the gain and resistances, is worked in lesson 2.6:
it gives $\dot A_u \approx -100$.)
== $R_{b1}$ from the base divider ==
$U_B = \dfrac{R_{b2}}{R_{b1} + R_{b2}}V_{CC}$: $2.7 = \dfrac{2.7 \times 12}{R_{b1} + 2.7}$,
so $R_{b1} + 2.7 = 12$ and $R_{b1} = 9.3$ kΩ.
== $R_e$ from the emitter current ==
From the graph $I_{CQ} = 2$ mA $\approx I_{EQ}$. $I_{EQ} = (U_B - U_{BE})/R_e$ gives
$R_e = (2.7 - 0.7)/2 = 1$ kΩ.
== $R_c$ from the DC load line ==
The DC line meets the $i_C$ axis at $V_{CC}/(R_c + R_e) = 4$ mA, so $R_c + R_e = 3$ kΩ.
Check with Q: $U_{CEQ} = 12 - 2 \times 3 = 6$ V ✓. So $R_c = 2$ kΩ.
== $R_L$ from the AC load line ==
The AC line meets the axis at $U_{CEQ} + I_{CQ}R_L' = 9$ V, so $I_{CQ}R_L' = 3$ V and
$R_L' = 1.5$ kΩ. Then $2 /\!/ R_L = 1.5$: $\dfrac{2R_L}{2 + R_L} = 1.5$ gives
$R_L = 6$ kΩ.
== (3) Maximum input ==
Room to cutoff is $I_{CQ}R_L' = 3$ V; room to saturation is
$6 - U_{CES} \approx 5.7$ V. So $U_{om(max)} = 3$ V. The input amplitude is
$3/|\dot A_u| = 3/100 = 30$ mV, a peak-to-peak value of **60 mV**.
== (4) First distortion ==
$I_{CQ}R_L' = 3$ V is less than $U_{CEQ} - U_{CES} \approx 5.7$ V: **cutoff distortion**
comes first.
:::

::: callout note A slip on the slide
The slide gives the largest peak-to-peak input as
$\dfrac{3\text{ V}}{|\dot A_u|} \times 2 = 6$ mV. With $|\dot A_u| = 100$ this is
$0.03 \times 2 = 0.06$ V $= 60$ mV, not 6 mV.
:::

::: callout exam For the exam
Typical questions: name the distortion from a waveform (watch the transistor type),
say how to adjust $R_b$, compute $U_{om(max)}$ and say which distortion comes first, and
read circuit values off load lines as in Example 3.5.2.
:::

::: cards Distortion and output swing
CE amplifier phase, from the graphs :: $u_i\uparrow \to i_b\uparrow \to i_c\uparrow \to u_{ce}\downarrow$: inverted.
Saturation distortion :: Operating point enters saturation; NPN output clipped at the bottom.
Cutoff distortion :: Operating point enters cutoff; NPN output clipped at the top.
NPN troughs flattened: fix? :: Saturation: Q too high, increase $R_b$ (lower $I_{BQ}$).
NPN peaks flattened: fix? :: Cutoff: Q too low, decrease $R_b$ (raise $I_{BQ}$).
For a PNP, which way do they clip? :: Reversed: saturation clips the top, cutoff the bottom.
Maximum undistorted output :: $U_{om(max)} = \min[U_{CEQ}-U_{CES},\ I_{CQ}R_L']$
How to tell which distortion comes first :: The smaller of $U_{CEQ}-U_{CES}$ (saturation) and $I_{CQ}R_L'$ (cutoff).
Best Q point for the largest swing :: The middle of the AC load line: $U_{CEQ}-U_{CES} = I_{CQ}R_L'$.
Output power :: $P_o = \frac{1}{2}U_{om}I_{om}$, the area of the power triangle.
:::

::: quiz Distortion and output swing
? An NPN CE amplifier's output has flattened peaks (tops). What is it?
- [x] Cutoff distortion
- [ ] Saturation distortion
- [ ] Frequency distortion
> For an NPN CE stage the top of $u_o$ is where $i_C$ is smallest; it flattens when
> $i_C$ hits zero, the cutoff region.

? A PNP CE amplifier's output has flattened peaks. What is it?
- [x] Saturation distortion
- [ ] Cutoff distortion
> In a PNP everything is reversed, so the top clips in saturation and the bottom in
> cutoff.

? A fixed-bias NPN amplifier shows saturation distortion. How should $R_b$ change?
- [x] Increase it
- [ ] Decrease it
- [ ] It doesn't matter
> Larger $R_b$ gives a smaller $I_{BQ}$ and $I_{CQ}$, so Q moves down, away from
> saturation.

? $U_{CEQ} = 5$ V, $U_{CES} = 0.5$ V, $I_{CQ} = 1.5$ mA, $R_L' = 2$ kΩ. What is $U_{om(max)}$?
answer: 3 V
tolerance: 1%
> $\min(5 - 0.5,\ 1.5 \times 2) = \min(4.5, 3) = 3$ V.

? In that circuit, which distortion appears first as the input grows?
- [x] Cutoff
- [ ] Saturation
> The cutoff side ($I_{CQ}R_L' = 3$ V) is closer than the saturation side (4.5 V).

? $U_{CEQ} = 4$ V and $R_L' = 2$ kΩ, with $U_{CES} = 0$. Which $I_{CQ}$ puts Q in the middle of the AC load line?
answer: 2 mA
tolerance: 1%
> The middle needs $U_{CEQ} - U_{CES} = I_{CQ}R_L'$: $4 = 2I_{CQ}$, so $I_{CQ} = 2$ mA.

? An amplifier with $|\dot A_u| = 50$ has $U_{om(max)} = 2.5$ V. What is the largest peak-to-peak input without distortion?
answer: 100 mV
tolerance: 1%
> Input amplitude $= 2.5/50 = 50$ mV; peak to peak is twice that, 100 mV.

? Write the output power in terms of the amplitudes $U$ and $I$.
expression: U I / 2
variables: U, I
> RMS values are amplitudes over $\sqrt{2}$, so $P_o = \frac{U}{\sqrt 2}\cdot\frac{I}{\sqrt 2} = UI/2$.
:::

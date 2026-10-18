---
title: The common-emitter amplifier and its Q point
zh: 共射放大电路与静态工作点
summary: How a common-emitter amplifier is built and why, how a signal rides on its DC bias, the DC and AC paths, and finding the Q point graphically with load lines, including the divider-bias circuit and its Thévenin transform.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

A transistor on its own amplifies nothing: it needs a supply, resistors to set its
currents, and capacitors to let the signal in and out. This lesson builds the classic
common-emitter (CE) amplifier part by part, then introduces the single most important
idea of the chapter: an amplifier has a **static** (DC) state, the Q point, and a
**dynamic** (signal) state riding on top of it. Get the Q point right and the signal is
amplified cleanly; get it wrong and nothing else matters. We finish by finding the Q
point graphically, with load lines drawn on the transistor's curves.

## Building a common-emitter amplifier

Start from what the transistor needs: a forward-biased emitter junction and a
reverse-biased collector junction (lesson 2.1). With two batteries that is easy: a
supply $V_{BB}$ through $R_b$ biases the base, and a supply $V_{CC}$ through $R_c$ feeds
the collector. Two batteries are inconvenient, so in practice $R_b$ is taken to the
same $+V_{CC}$ as $R_c$: one supply does both jobs. The result is the
{{term fixed-bias common-emitter amplifier | 固定偏置共射放大电路}}:

::: circuit The fixed-bias common-emitter amplifier
A1 0,10 0,6 ui
C1 0,6 4,6 C1
R1 4,0 4,6 Rb
W 4,6 6,6
Q1 npn 6,6 VT
R2 8,0 8,4 Rc
W 4,0 8,0
W 8,8 8,10
C2 8,4 12,4 C2
R3 12,4 12,10 RL
W 0,10 12,10
G 8,10
label +VCC 8,0
label uo 12,4
:::

Each part has one job:

| Part | Job |
| --- | --- |
| Transistor VT | The heart: controls and converts energy. It must work in the amplification region. |
| Bias resistor $R_b$ ({{zh 偏置电阻}}) | Sets a suitable base current, so the emitter junction is forward-biased and the collector junction reverse-biased. |
| Collector resistor $R_c$ (with the load $R_L$) | Turns the changing collector current into a changing voltage. |
| Coupling capacitors $C_1$, $C_2$ ({{zh 耦合电容}}) | "Block DC, pass AC" ({{zh 隔直通交}}): let the signal in to the base and out to the load without upsetting the DC bias. |
| Supply $V_{CC}$ | Provides the bias currents and the energy that becomes the output signal. |

::: define Coupling capacitor | 耦合电容
A large capacitor (usually electrolytic) in series with the signal path. At the signal
frequency its reactance is negligible, so the AC signal passes; to DC it is an open
circuit, so the DC levels on either side stay independent.
:::

The name "fixed bias" says that $I_B$ is fixed by $V_{CC}$ and $R_b$ alone, whatever the
transistor does.

### What makes a circuit an amplifier

From this circuit the slides draw three rules for building any transistor amplifier:

::: law Principles for building an amplifier | 放大电路的组成原则
(1) The transistor must work in the amplification region with a **suitable Q point**,
so the output is not distorted. (2) The input circuit must let the input signal act
**on the emitter junction**. (3) The output circuit must deliver the output signal
**to the load**.
:::

::: example Spot the mistakes (in-class question)
Four would-be common-emitter amplifiers each have one or two faults. Fix each without
changing the CE connection or the coupling method. (a) An NPN with $-V_{CC}$ on its
collector resistor, the input fed in series with $V_{BB}$ and $R_b$. (b) An NPN with
$R_c$ and both coupling capacitors, but the base wired straight to $+V_{CC}$. (c) The
input wired directly to the base, with $R_b$ and $V_{BB}$ in series from the base to
ground. (d) $V_{BB}$ connected straight to the base and the collector connected straight
to the supply, with no $R_c$.
== (a) The supply has the wrong polarity ==
An NPN needs its collector positive: change $-V_{CC}$ to $+V_{CC}$, otherwise the
collector junction is forward-biased (rule 1).
== (b) No base resistor ==
With the base tied to $+V_{CC}$, $u_{BE}$ would be the whole supply (the junction
burns out), and the signal arriving through $C_1$ would be shorted to the supply, so it
never reaches the emitter junction (rule 2). Add $R_b$ between $+V_{CC}$ and the base.
== (c) The source shorts the bias, and $V_{BB}$ is reversed ==
A source wired straight to the base holds the base at the source's own voltage, so the
bias can't be set; put a resistor in series with the input. And $V_{BB}$ must push
current *into* the base of an NPN: reverse it (rule 1).
== (d) No $R_b$, no $R_c$ ==
$V_{BB}$ straight on the base fixes $u_{BE}$ and shorts the signal to ground: add
$R_b$ in the $V_{BB}$ branch (rule 2). With the collector straight on the supply,
$u_{CE}$ is pinned at $V_{CC}$ and no output voltage can appear: add $R_c$ between the
supply and the collector (rule 3).
:::

The photo on the slide is hard to read, so the faults above are described in words;
they match the standard answers to this textbook exercise.

## How the signal is amplified

Feed a small sine wave $u_i$ in and follow it through:

$$u_i \xrightarrow{C_1} u_{be} \rightarrow i_b \rightarrow i_c = \beta i_b \rightarrow i_c R_L' \rightarrow u_{ce} \xrightarrow{C_2} u_o$$

1. $C_1$ passes $u_i$ to the base, so it adds to the base–emitter voltage: $u_{be} = u_i$.
2. The emitter junction turns that small voltage change into a base current change $i_b$.
3. The transistor amplifies it: $i_c = \beta i_b$. **This** is the amplifying step.
4. The changing $i_c$ flows through $R_c$ in parallel with $R_L$, written
   $R_L' = R_c /\!/ R_L$, and becomes a voltage $i_c R_L'$, much larger than $u_i$.
5. More collector current means more drop across $R_c$, so the collector voltage
   **falls**: $u_{ce} = -i_c R_L'$. $C_2$ passes this change to the load as $u_o$.

So the CE amplifier **inverts**: $u_o$ is 180° out of phase with $u_i$.

### Notation: DC, AC and total

Every quantity in an amplifier is a DC level with a small AC wave on top. Chinese
textbooks keep them apart by the case of the letter and its subscript:

| Written | Meaning | Example |
| --- | --- | --- |
| Capital letter, capital subscript | DC (quiescent) value | $U_{BE}$, $I_C$, $U_{CEQ}$ |
| Small letter, small subscript | AC component | $u_{be}$, $i_c$ |
| Small letter, capital subscript | Total instantaneous value | $u_{BE} = U_{BE} + u_{be}$ |
| Capital letter with a dot, small subscript | Phasor of the AC component | $\dot U_{be}$, $\dot I_c$ |

The plot shows the collector side as time runs (one cycle of $\omega t$ from 0 to
$2\pi$). The collector current swings around $I_{CQ}$ in step with the input; the
collector voltage swings around $U_{CEQ}$ the other way; the output is the same swing
with the DC removed by $C_2$.

::: plot Waveforms at the collector (iC in mA, voltages in V)
x: 0 .. 6.283
xlabel: ωt (rad)
iC(t) = ICQ + Icm sin(t)
uCE(t) = UCEQ - Icm RL sin(t)
uo(t) = -Icm RL sin(t)
slider ICQ: 0.5 .. 3 = 2 | mA
slider UCEQ: 2 .. 10 = 6 | V
slider Icm: 0 .. 1.5 = 1 | mA
slider RL: 0.5 .. 4 = 2 | kΩ
:::

Here RL stands for $R_L'$ in kΩ, so mA × kΩ gives volts. When $i_C$ peaks, $u_{CE}$
dips: that's the inversion.

## Static and dynamic states

::: define Static state | 静态
The amplifier's state with no input signal ($u_i = 0$): only DC flows. Also called the
DC operating state ({{zh 直流工作状态}}).
:::

::: define Dynamic state | 动态
The amplifier's state with an input signal ($u_i \ne 0$): AC components are added to
the DC ones. Also called the AC operating state ({{zh 交流工作状态}}).
:::

::: define Q point | 静态工作点
The quiescent operating point: the transistor's DC values $I_{BQ}$, $U_{BEQ}$, $I_{CQ}$
and $U_{CEQ}$ in the static state, a point Q on its characteristic curves around which
the signal swings.
:::

::: callout key Static first, then dynamic
A correct static state is the **precondition** for dynamic operation. Always analyse
an amplifier in this order: find the Q point from the DC path, then the signal
behaviour from the AC path ({{zh 先静态、后动态}}).
:::

## The DC path and the AC path

Because the circuit is (approximately) linear around Q, DC and AC can be worked out
separately and added. Each gets its own simplified circuit.

::: define DC path | 直流通路
The circuit the DC currents flow in. Draw it by treating **coupling and bypass
capacitors as open circuits** and the **signal source as a short circuit** (keeping its
internal resistance).
:::

::: define AC path | 交流通路
The circuit the signal flows in. Draw it by treating **coupling and bypass capacitors
as short circuits** and the **DC supply as a short circuit to ground** (an ideal supply
has no AC voltage across it).
:::

For the fixed-bias amplifier, opening $C_1$ and $C_2$ leaves $V_{CC}$, $R_b$, $R_c$ and
the transistor:

::: circuit DC path of the fixed-bias amplifier
R1 4,0 4,6 Rb
W 4,6 6,6
Q1 npn 6,6
R2 8,0 8,4 Rc
W 4,0 8,0
W 8,8 8,10
G 8,10
label +VCC 8,0
:::

Shorting the capacitors and $V_{CC}$ puts the top ends of $R_b$ and $R_c$ on ground. So
$R_b$ now hangs from the base to ground, across the input, and $R_c$ is in parallel with
$R_L$ at the output:

::: circuit AC path of the fixed-bias amplifier
A1 0,8 0,4 ui
W 0,4 6,4
R1 4,4 4,8 Rb
Q1 npn 6,4
W 8,6 8,8
W 8,2 12,2
R2 10,2 10,8 Rc
R3 12,2 12,8 RL
W 0,8 12,8
G 8,8
label uo 12,2
:::

::: callout note About the slide's AC path
The slide's drawing of this AC path shows two base resistors, $R_{b1}$ and $R_{b2}$,
borrowed from the divider-bias circuit later on. The fixed-bias circuit has one, $R_b$,
from the base to AC ground, as drawn here.
:::

::: callout pitfall Capacitors: open for DC, shorted for AC
In the DC path every capacitor disappears (open) and so does the signal source; in the
AC path every capacitor becomes a wire and $V_{CC}$ becomes ground. Mixing these up
is the most common mistake in drawing the two paths.
:::

## How amplifiers are analysed

Static analysis uses the **DC path**, by **calculation** ({{zh 计算法}}) or
**graphically** ({{zh 图解法}}). Dynamic analysis uses the **AC path**, graphically or
with the **small-signal equivalent circuit** (lesson 2.6). The graphical method works
because the transistor's curves can't be written as a simple formula, but they can be
drawn: the input loop is described by the input characteristic plus the input loop's
equation, the output loop by the output characteristics plus the output loop's equation.

### Calculating the fixed-bias Q point

For the fixed-bias circuit the calculation is three lines. Around the input loop
($V_{CC} \to R_b \to$ base–emitter $\to$ ground), $I_B R_b + U_{BE} = V_{CC}$; around the
output loop, $I_C R_c + U_{CE} = V_{CC}$:

::: formula Q point of the fixed-bias amplifier | 固定偏置电路的静态工作点
$$I_{BQ} = \frac{V_{CC} - U_{BEQ}}{R_b}, \qquad I_{CQ} = \beta I_{BQ}, \qquad U_{CEQ} = V_{CC} - I_{CQ} R_c$$
--
U_{BEQ} | base–emitter voltage, 0.7 V for silicon | V
R_b | base bias resistor | Ω
R_c | collector resistor | Ω
:::

::: example A fixed-bias Q point
$V_{CC} = 12$ V, $R_b = 565$ kΩ, $R_c = 3$ kΩ, $\beta = 100$, silicon. Find the Q point.
== Base current ==
$I_{BQ} = (12 - 0.7)/565\text{ k} = 11.3/565\text{ k} = 20\ \mu$A.
== Collector current ==
$I_{CQ} = 100 \times 20\ \mu\text{A} = 2$ mA.
== Collector–emitter voltage ==
$U_{CEQ} = 12 - 2 \times 3 = 6$ V. That's above 0.7 V, so the transistor is indeed in
the amplification region, and Q sits nicely in the middle of the supply.
:::

## Graphical static analysis of the divider-bias amplifier

Most practical amplifiers use **divider bias** ({{zh 分压偏置}}): two resistors
$R_{b1}$, $R_{b2}$ divide $V_{CC}$ to set the base voltage, and an emitter resistor
$R_e$, bypassed for AC by a large capacitor $C_e$, sits under the emitter. (Lesson 2.7
explains why this holds the Q point steady; here we just analyse it.)

::: circuit The divider-bias common-emitter amplifier
A1 0,12 0,6 ui
C1 0,6 4,6 C1
R1 4,0 4,6 Rb1
R2 4,6 4,12 Rb2
W 4,6 6,6
Q1 npn 6,6 VT
R3 8,0 8,4 Rc
W 4,0 8,0
R4 8,8 8,12 Re
W 8,8 10,8
C3 10,8 10,12 Ce
C2 8,4 12,4 C2
R5 12,4 12,12 RL
W 0,12 12,12
G 8,12
label +VCC 8,0
label uo 12,4
:::

::: define Bypass capacitor | 旁路电容
A large capacitor $C_e$ in parallel with the emitter resistor. It is open to DC, so
$R_e$ still acts on the bias, but it shorts $R_e$ for the signal, so $R_e$ doesn't
reduce the gain.
:::

Its DC path (open $C_1$, $C_2$, $C_e$) is $V_{CC}$, $R_{b1}$, $R_{b2}$, $R_c$, $R_e$ and
the transistor.

### The input loop: Thévenin first

The base is fed by a divider, so the input "loop" has two meshes. Cut the base lead and
replace everything to the left of the cut (the divider and $V_{CC}$) by its Thévenin
equivalent ({{zh 戴维南定理}}): an open-circuit voltage $V_{CC}'$ in series with
$R_b'$, the two resistors in parallel. Now the base circuit has just one mesh.

::: formula Thévenin equivalent of the base divider | 基极分压电路的戴维南等效
$$V_{CC}' = \frac{R_{b2}}{R_{b1} + R_{b2}}\,V_{CC}, \qquad R_b' = \frac{R_{b1} R_{b2}}{R_{b1} + R_{b2}} = R_{b1} /\!/ R_{b2}$$
--
V_{CC}' | open-circuit voltage of the divider (the base voltage with no base current) | V
R_b' | resistance of the divider seen from the base | Ω
:::

::: circuit The DC path after the Thévenin transform
V1 2,12 2,6 V'CC
R1 2,6 6,6 R'b
Q1 npn 6,6
R2 8,0 8,4 Rc
R3 8,8 8,12 Re
W 2,12 8,12
G 8,12
label +VCC 8,0
:::

Around this single mesh, with $I_E = (1+\beta)I_B$:

$$I_B R_b' + U_{BE} + (1+\beta) I_B R_e = V_{CC}'$$

The emitter resistor carries $(1+\beta)$ times the base current, so **seen from the
base it looks $(1+\beta)$ times bigger**. Writing $R_B = R_b' + (1+\beta)R_e$ for the
total (the slide calls it $R_b$ again, which is easy to confuse with the fixed-bias
$R_b$), the input loop is a straight line in the $(U_{BE}, I_B)$ plane:

$$I_B R_B + U_{BE} = V_{CC}'$$

::: define Input DC load line | 输入直流负载线
The line $I_B R_B + U_{BE} = V_{CC}'$ drawn on the input characteristic: through
$(0, V_{CC}'/R_B)$ with slope $-1/R_B$. Where it crosses the input curve is Q, giving
$I_{BQ}$ and $U_{BEQ}$.
:::

The simulator below replaces the base–emitter junction by its 0.7 V drop and the
emitter resistor by what the base sees, $(1+\beta)R_e = 61 \times 2\text{ k} = 122$ kΩ
($\beta = 60$, $R_e = 2$ kΩ). The current in R3 is $I_{BQ}$, and the voltage at its top
is $U_E$. Change $R_{b2}$ and watch the bias move.

::: circuit-sim Base bias of the divider circuit (VCC 15 V, Rb1 60k, Rb2 20k)
V1 0,12 0,0 15V [5..20]
W 0,0 4,0
R1 4,0 4,4 60k [10k..200k]
R2 4,4 4,12 20k [5k..100k]
W 4,4 8,4
V2 8,8 8,4 0.7V [0.5..0.8]
R3 8,8 8,12 122k [20k..300k]
W 0,12 8,12
G 0,12
label base 4,4
label UE 8,8
:::

With the values given, R3 carries about 22.3 μA and $U_E \approx 2.72$ V, so
$I_E = 2.72/2\text{ k} = 1.36$ mA.

### The output loop: the DC load line

Around the collector–emitter loop, $I_C R_c + U_{CE} + I_E R_e = V_{CC}$, and with
$I_E \approx I_C$:

::: formula DC load line | 直流负载线
$$U_{CE} = V_{CC} - I_C (R_c + R_e)$$
--
U_{CE} | collector–emitter voltage | V
I_C | collector current | A
R_c + R_e | total DC resistance in the collector–emitter loop | Ω
:::

This is a straight line on the output characteristics. Its two special points are easy:
$I_C = 0$ gives $M = (V_{CC}, 0)$; $U_{CE} = 0$ gives $N = (0, V_{CC}/(R_c + R_e))$.

::: define DC load line | 直流负载线
The line through $(V_{CC}, 0)$ and $(0, V_{CC}/(R_c+R_e))$ on the output
characteristics, with slope $-1/(R_c+R_e)$. Every DC state the output loop allows lies
on it; Q is where it crosses the output curve for $I_{BQ}$.
:::

The whole graphical procedure, then:

1. Write the input loop equation $V_{CC}' = I_B R_B + U_{BE}$.
2. Draw the input DC load line on the input characteristic; where they cross gives
   $I_{BQ}$ and $U_{BEQ}$.
3. Write the output loop equation $U_{CE} = V_{CC} - I_C(R_c + R_e)$.
4. Mark its two special points $(V_{CC}, 0)$ and $(0, V_{CC}/(R_c+R_e))$ on the output
   characteristics and join them.
5. Q is where this line meets the $I_{BQ}$ curve: read off $I_{CQ}$ and $U_{CEQ}$.

::: plot DC load line on the output curves (β = 60)
x: 0 .. 16
y: 0 .. 3.5
xlabel: uCE (V)
ylabel: iC (mA)
IB11(u) = 0.66 (1 - exp(-u / 0.25))
IB22(u) = 1.338 (1 - exp(-u / 0.25))
IB33(u) = 1.98 (1 - exp(-u / 0.25))
DC(u) = (VCC - u) / R
slider VCC: 6 .. 15 = 15 | V
slider R: 2 .. 10 = 5 | kΩ
:::

R is $R_c + R_e$ in kΩ. The middle curve is $I_{BQ} = 22.3\ \mu$A; with
$V_{CC} = 15$ V and $R = 5$ kΩ the load line crosses it at about $(8.3\text{ V}, 1.34\text{ mA})$.

::: example The divider-bias Q point, graphically and by calculation
$V_{CC} = 15$ V, $R_{b1} = 60$ kΩ, $R_{b2} = 20$ kΩ, $R_c = 3$ kΩ, $R_e = 2$ kΩ,
$\beta = 60$, $U_{BE} = 0.7$ V. Find the input load line, the output load line and Q.
== Thévenin transform ==
$V_{CC}' = 15 \times \dfrac{20}{60 + 20} = 3.75$ V; $R_b' = \dfrac{60 \times 20}{80} = 15$ kΩ.
== Input load line ==
$R_B = R_b' + (1+\beta)R_e = 15 + 61 \times 2 = 137$ kΩ. The line starts at
$V_{CC}'/R_B = 3.75/137\text{ k} = 27.4\ \mu$A on the $I_B$ axis with slope $-1/137$ kΩ.
Crossing the input curve near $U_{BE} = 0.7$ V:
$I_{BQ} = (3.75 - 0.7)/137\text{ k} = 22.3\ \mu$A.
== Output load line ==
Its ends are $(15\text{ V}, 0)$ and $(0, 15/5\text{ k}) = (0, 3\text{ mA})$.
== Q point ==
$I_{CQ} = \beta I_{BQ} = 60 \times 22.3\ \mu\text{A} = 1.34$ mA, on the line at
$U_{CEQ} = 15 - 1.34 \times 5 = 8.3$ V.
:::

## The AC load line

With a signal applied, which points does the transistor move through? Look at the AC
path of the divider-bias circuit: $C_e$ shorts $R_e$, $V_{CC}$ is ground, so the
collector sees only $R_c$ and $R_L$ in parallel.

::: circuit AC path of the divider-bias amplifier
A1 0,8 0,4 ui
W 0,4 6,4
R1 2,4 2,8 Rb1
R2 4,4 4,8 Rb2
Q1 npn 6,4
W 8,6 8,8
W 8,2 14,2
R3 10,2 10,8 Rc
R4 14,2 14,8 RL
W 0,8 14,8
G 8,8
label uo 14,2
:::

::: define AC load resistance | 交流负载电阻
$R_L' = R_c /\!/ R_L$: the resistance the collector's signal current flows through.
The AC output voltage is $u_o = u_{ce} = -i_c R_L'$.
:::

Since $u_{ce} = -i_c R_L'$, the changes in $u_{CE}$ and $i_C$ are tied by a slope of
$-1/R_L'$. And with no signal the transistor sits at Q, so the path must pass through Q.

::: define AC load line | 交流负载线
The line through Q with slope $-1/R_L'$ ($R_L' = R_c /\!/ R_L$). It is the track the
operating point follows when a signal is applied.
:::

::: formula AC load line | 交流负载线
$$i_C - I_{CQ} = -\frac{u_{CE} - U_{CEQ}}{R_L'}, \qquad \text{it meets the } u_{CE} \text{ axis at } U_{CEQ} + I_{CQ} R_L'$$
--
R_L' | AC load resistance, $R_c /\!/ R_L$ | Ω
I_{CQ}, U_{CEQ} | the Q point | A, V
:::

How to draw it: (1) draw the AC path; (2) work out $R_L' = R_c /\!/ R_L$; (3) find Q on
the DC load line; (4) draw a line through Q with slope $-1/R_L'$. One way to get the
slope right is an auxiliary line ({{zh 辅助线}}): join $(I_{CQ}R_L', 0)$ to
$(0, I_{CQ})$, which has slope $-1/R_L'$, then slide it parallel until it passes through
Q. Or use the axis crossing $U_{CEQ} + I_{CQ}R_L'$ from the formula above.

::: callout key The AC load line is steeper
$R_L' = R_c /\!/ R_L$ is smaller than the DC load resistance $R_c + R_e$, so the AC load
line is **steeper** than the DC load line. The two cross at Q. (With no load and
$R_e = 0$ they coincide.)
:::

::: plot DC and AC load lines through Q (VCC 15 V, Rc 3k, Re 2k)
x: 0 .. 16
y: 0 .. 3.5
xlabel: uCE (V)
ylabel: iC (mA)
IBQ(u) = 1.338 (1 - exp(-u / 0.25))
DC(u) = (15 - u) / 5
AC(u) = 1.336 - (u - 8.32) / (3 RL / (3 + RL))
slider RL: 0.5 .. 30 = 3 | kΩ
:::

Raise $R_L$ and the AC line swings towards the DC line; a small $R_L$ makes it steep.

::: example Drawing the AC load line
In the last example $R_L = 3$ kΩ. Find $R_L'$ and where the AC load line meets the
$u_{CE}$ axis.
== AC load resistance ==
$R_L' = 3 /\!/ 3 = 1.5$ kΩ.
== Axis crossing ==
$U_{CEQ} + I_{CQ}R_L' = 8.3 + 1.34 \times 1.5 = 8.3 + 2.0 = 10.3$ V. The AC line runs
from about $(10.3\text{ V}, 0)$ up through $Q(8.3\text{ V}, 1.34\text{ mA})$, much
steeper than the DC line (which reaches the axis at 15 V).
:::

::: callout exam For the exam
Expect to draw the DC and AC paths of a given circuit, to state the job of each part,
to compute a fixed-bias Q point, and to find load-line intercepts:
$(V_{CC}, 0)$ and $(0, V_{CC}/(R_c+R_e))$ for DC, slope $-1/R_L'$ through Q for AC.
:::

::: cards The common-emitter amplifier and its Q point
Job of the coupling capacitors :: Block DC, pass AC: carry the signal in and out without disturbing the bias.
Job of $R_b$ :: Sets the base bias current so the emitter junction is forward- and the collector junction reverse-biased.
Job of $R_c$ :: Turns the changing collector current into a changing output voltage.
The three principles for building an amplifier :: Suitable Q point in the amplification region; input acts on the emitter junction; output reaches the load.
Phase of a CE amplifier's output :: Inverted (180°) relative to the input.
$U_{BE}$, $u_{be}$, $u_{BE}$ :: DC value, AC component, total instantaneous value.
Rules for the DC path :: Capacitors open; signal source shorted.
Rules for the AC path :: Capacitors shorted; DC supply shorted to ground.
Fixed-bias Q point :: $I_{BQ} = (V_{CC}-U_{BE})/R_b$, $I_{CQ} = \beta I_{BQ}$, $U_{CEQ} = V_{CC} - I_{CQ}R_c$
Thévenin of the base divider :: $V_{CC}' = V_{CC}R_{b2}/(R_{b1}+R_{b2})$, $R_b' = R_{b1} /\!/ R_{b2}$
Two points of the DC load line :: $(V_{CC}, 0)$ and $(0, V_{CC}/(R_c+R_e))$
AC load line :: Through Q with slope $-1/R_L'$, $R_L' = R_c /\!/ R_L$; steeper than the DC load line.
Why analyse statics first? :: A correct Q point is the precondition for amplifying; the dynamic state rides on it.
:::

::: quiz The common-emitter amplifier and its Q point
? In the DC path, how are the coupling capacitors treated?
- [x] As open circuits
- [ ] As short circuits
- [ ] As resistors
> A capacitor passes no DC, so in the DC path it is an open circuit. In the AC path it
> is a short.

? A fixed-bias amplifier has $V_{CC} = 12$ V, $R_b = 377$ kΩ, $R_c = 4$ kΩ, $\beta = 60$. Find $U_{CEQ}$.
answer: 4.8 V
tolerance: 2%
> $I_{BQ} = 11.3/377\text{ k} = 30\ \mu$A, $I_{CQ} = 1.8$ mA,
> $U_{CEQ} = 12 - 1.8 \times 4 = 4.8$ V.

? Where does the DC load line meet the $i_C$ axis when $V_{CC} = 12$ V, $R_c = 2$ kΩ, $R_e = 1$ kΩ?
answer: 4 mA
tolerance: 1%
> At $U_{CE} = 0$: $I_C = V_{CC}/(R_c + R_e) = 12/3\text{ k} = 4$ mA.

? $V_{CC} = 12$ V, $R_{b1} = 30$ kΩ, $R_{b2} = 10$ kΩ. What is the Thévenin resistance $R_b'$ of the base divider?
answer: 7.5 kΩ
tolerance: 1%
> $R_b' = 30 /\!/ 10 = 300/40 = 7.5$ kΩ (and $V_{CC}' = 3$ V).

? Write $I_{BQ}$ of the divider-bias circuit in terms of $V$ ($V_{CC}'$), $U$ ($U_{BE}$), $R$ ($R_b'$), $b$ ($\beta$) and $E$ ($R_e$).
expression: (V - U) / (R + (1 + b) E)
variables: V, U, R, b, E
> One mesh: $I_B R_b' + U_{BE} + (1+\beta)I_B R_e = V_{CC}'$, so
> $I_B = (V_{CC}' - U_{BE})/[R_b' + (1+\beta)R_e]$.

? Why is the AC load line steeper than the DC load line?
- [x] Because $R_c /\!/ R_L$ is smaller than $R_c + R_e$
- [ ] Because the signal current is larger than the DC current
- [ ] Because $C_e$ adds resistance for AC
> The slope is $-1/R$: the AC resistance $R_L' = R_c /\!/ R_L$ is smaller than the DC
> resistance $R_c + R_e$, so the AC line is steeper.

? $I_{CQ} = 2$ mA, $U_{CEQ} = 6$ V, $R_c = 2$ kΩ, $R_L = 6$ kΩ. Where does the AC load line meet the $u_{CE}$ axis?
answer: 9 V
tolerance: 1%
> $R_L' = 2 /\!/ 6 = 1.5$ kΩ; $U_{CEQ} + I_{CQ}R_L' = 6 + 2 \times 1.5 = 9$ V.

? In the AC path, what happens to $V_{CC}$?
text: short circuit | shorted to ground | it is shorted | ground | short
> An ideal supply has no AC voltage across it, so for the signal it is a short to ground:
> resistors connected to $V_{CC}$ now go to ground.

? What is the input voltage $u_i$ turned into by the transistor's amplifying action, step by step?
- [x] $u_{be} \to i_b \to i_c = \beta i_b \to i_c R_L' \to u_o$
- [ ] $u_{be} \to u_{ce} \to i_c \to i_b \to u_o$
- [ ] $i_c \to u_{be} \to i_b \to u_o$
> The base voltage drives the base current, the transistor multiplies it by $\beta$, and
> the collector current through $R_L'$ makes the output voltage.
:::

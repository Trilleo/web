---
title: How FETs work
zh: 场效应管的工作原理
summary: The field-effect transistor as a voltage-controlled device — MOSFETs and JFETs, how the channel forms and pinches off, the characteristic curves and square laws of all six types, their parameters, and how FETs compare with BJTs.
source: 第4章 场效应管及其基本放大电路 (4.1–4.2), 2026-09-15
---

A bipolar transistor (Unit 2) is steered by a small *current* into its base. A
field-effect transistor is steered by a *voltage* on its gate, and almost no current
flows into the gate at all. That one difference is why FETs have enormous input
resistance, why they use almost no power when idle, and why every chip in your phone
is built from billions of them. This lesson explains what goes on inside a FET, how to
read its curves, and the two equations you will use for every FET circuit in the next
lesson.

## What a field-effect transistor is

Picture a garden hose with a clamp on it. Water (current) flows along the hose from one
end to the other; squeezing the clamp narrows the hose and lets less water through. The
clamp doesn't add or take away any water: it only controls the flow. A FET works the
same way. Current flows along a thin conducting path called the {{term channel | 导电沟道}},
and a voltage on a third electrode squeezes or widens that channel with an electric
field.

::: define Field-effect transistor | 场效应管
A semiconductor device in which the electric field set up by the input (gate–source)
voltage controls the current in the output (drain–source) circuit. It is a
{{term voltage-controlled device | 电压控制型器件}}: the gate draws practically no
current.
:::

A FET has three electrodes, which play the roles of the BJT's three:

| FET electrode | Symbol | Role | BJT counterpart |
| --- | --- | --- | --- |
| {{term source | 源极}} | s | where the carriers enter the channel | emitter e |
| {{term gate | 栅极}} | g | the control electrode | base b |
| {{term drain | 漏极}} | d | where the carriers leave the channel | collector c |

and three regions of operation: the {{term cutoff region | 截止区}}, the
{{term constant-current region | 恒流区}} and the
{{term variable-resistance region | 可变电阻区}}, which correspond to the BJT's cutoff,
active (amplifying) and saturation regions.

FETs come in two families, by how the gate is kept from drawing current:

- The {{term junction FET (JFET) | 结型场效应管}}: the gate is a reverse-biased PN
  junction. A reverse-biased junction passes almost no current.
- The {{term insulated-gate FET (IGFET) | 绝缘栅型场效应管}}: the gate is a metal plate
  separated from the channel by a thin layer of silicon dioxide, a perfect insulator.
  Because it is a stack of **m**etal, **o**xide and **s**emiconductor it is usually
  called a {{term MOSFET | MOS管}}.

Each family comes with an N-type channel (electrons carry the current) or a P-type
channel (holes do). MOSFETs are also either **enhancement** or **depletion** type:

::: define Enhancement mode | 增强型
A FET with no channel at zero gate voltage: the gate voltage must *create* the channel
before any drain current flows. Only MOSFETs come in enhancement mode.
:::

::: define Depletion mode | 耗尽型
A FET whose channel already exists at zero gate voltage: the gate voltage can narrow it
(down to nothing) or, for a depletion MOSFET, also widen it. Every JFET is a depletion
device.
:::

So there are six kinds of FET in all:

| Family | Mode | Channel |
| --- | --- | --- |
| JFET | depletion only | N channel, P channel |
| MOSFET | enhancement | N channel, P channel |
| MOSFET | depletion | N channel, P channel |

The lesson studies the three N-channel types in detail. The P-channel ones are their
mirror images: every voltage and current changes sign.

## The N-channel enhancement MOSFET

### Structure and symbol

Start with a slab of lightly doped P-type silicon, the {{term substrate | 衬底}} (B,
for "body"). Into its top surface two heavily doped N⁺ regions are diffused, a little
apart: one becomes the source, the other the drain. The surface between them is covered
with a thin insulating layer of SiO₂, and a metal gate plate sits on top of that, over
the gap. The substrate has its own contact at the bottom, and is usually tied to the
source.

Between source and drain there are now two back-to-back PN junctions (N⁺–P and P–N⁺),
so with no gate voltage no current can flow whichever way you connect the drain:
there is no channel.

In the symbol the gate is a separate line (insulated from the channel), and the
channel is drawn as **three broken segments**: broken because the channel doesn't exist
until the gate makes it. The substrate's arrow points **in**, from the P substrate
towards the N channel, just as a diode's arrow points from P to N.

::: circuit Testing an N-channel enhancement MOSFET: u_GS on the gate, u_DS on the drain
M1 nmos 2,2
V1 0,6 0,2 uGS
W 0,2 2,2
V2 8,6 8,0 uDS
W 4,0 8,0
W 4,4 4,6
W 0,6 8,6
G 4,6
label d 4,0
label s 4,4
:::

### How the gate voltage makes a channel

Hold $u_{DS} = 0$ for a moment and raise the gate–source voltage $u_{GS}$ from zero.
(Lower-case $u$ and $i$ are total instantaneous values; capitals such as $U_{GS}$ are
DC values, as in Unit 2.)

- **A small positive $u_{GS}$.** The gate plate and the substrate form a capacitor with
  the oxide as its dielectric. The positive gate pushes the substrate's holes away from
  the surface, leaving behind fixed negative acceptor ions: a
  {{term depletion layer | 耗尽层}}. A few electrons (minority carriers in P-type
  silicon) are pulled up to the surface, but far too few to conduct. No channel yet.
- **$u_{GS}$ above a threshold.** Once $u_{GS}$ exceeds a certain value, so many
  electrons collect just under the oxide that this thin surface layer behaves like
  N-type silicon even though it sits in a P-type substrate. It is called an
  {{term inversion layer | 反型层}}, and it joins the two N⁺ regions: an N-type
  conducting channel has formed.

::: define Threshold voltage U_GS(th) | 开启电压
The gate–source voltage at which an enhancement MOSFET's channel just forms and drain
current starts to flow (also written $U_T$). Below it the device is cut off. For an
N-channel device it is positive; for a P-channel device, negative.
:::

The further $u_{GS}$ rises above $U_{GS(th)}$, the more electrons the channel holds, the
thicker and more conductive it becomes, and the more drain current a given $u_{DS}$
pushes through it. That is the gate's control over $i_D$.

### What the drain voltage does: pinch-off

Now fix $u_{GS} > U_{GS(th)}$ and raise $u_{DS}$ from zero. Drain current flows from
drain to source through the channel, and the voltage along the channel rises from 0 at
the source to $u_{DS}$ at the drain. So the voltage between gate and channel is not the
same everywhere:

$$u_{GD} = u_{GS} - u_{DS}$$

At the source end the gate "sees" the full $u_{GS}$; at the drain end only $u_{GD}$,
which is smaller. The channel is therefore **wedge-shaped**: thick at the source, thin
at the drain. Three stages follow as $u_{DS}$ grows:

1. **$u_{GD} > U_{GS(th)}$** (small $u_{DS}$). The channel is continuous all the way.
   It behaves like a resistor whose value is set by $u_{GS}$, so $i_D$ rises almost in
   proportion to $u_{DS}$. This is the variable-resistance region.
2. **$u_{GD} = U_{GS(th)}$.** At the drain end the channel has just thinned to zero
   thickness. This is {{term pre-pinch-off | 预夹断}}: pinch-off has just begun.
3. **$u_{GD} < U_{GS(th)}$** (larger $u_{DS}$). The pinched-off zone grows from the drain
   towards the source. Almost all the extra $u_{DS}$ is dropped across this short,
   high-resistance zone; the voltage across the remaining channel stays about the same,
   so the current through it stays about the same. $i_D$ no longer depends on $u_{DS}$,
   only on $u_{GS}$. This is the constant-current region.

::: define Pinch-off | 夹断
The closing of the channel at its drain end, when the gate–drain voltage falls to the
threshold ($u_{GD} = U_{GS(th)}$) for a MOSFET, or to the pinch-off voltage for a JFET.
Beyond it, extra drain voltage is taken up by the pinched-off zone and the drain
current levels off.
:::

::: callout pitfall "Pinched off" doesn't mean "off"
A pinched-off channel still carries current: electrons are swept across the short
depletion zone by its strong field, like water falling over a weir. The current is
set by the channel before the pinch-off point, so it *stops changing*, not stops
flowing. Zero current is cutoff, which is a different thing ($u_{GS} < U_{GS(th)}$).
:::

### The output characteristics

::: formula Output characteristic | 输出特性
$$i_D = f(u_{DS})\big|_{U_{GS} = \text{const}}$$
--
i_D | drain current | A
u_{DS} | drain–source voltage | V
U_{GS} | gate–source voltage, held fixed for each curve | V
:::

Plotting $i_D$ against $u_{DS}$ for several fixed $u_{GS}$ gives a family of curves
(the {{term output characteristics | 输出特性曲线}}). On the slides' device
($U_{GS(th)} = 2$ V) the curves for $U_{GS} = 4, 5, 6$ V level off at about 1, 2 and 4 mA,
and the curve for 2 V lies along the axis. Four regions show up:

- **Variable-resistance region**, left of the {{term pre-pinch-off locus | 预夹断轨迹}}
  (the dashed curve through the knees, where $u_{GD} = U_{GS(th)}$, that is
  $u_{DS} = u_{GS} - U_{GS(th)}$). Each curve starts as a straight line through the
  origin whose slope is set by $u_{GS}$: the gate voltage controls the drain–source
  resistance. FETs used as voltage-controlled resistors or switches work here.
- **Constant-current region**, right of the locus: the curves are almost flat and
  $i_D$ is decided almost entirely by $u_{GS}$. **Amplifiers work here.**
- **Cutoff region**, $u_{GS} < U_{GS(th)}$: no channel, $i_D \approx 0$.
- **Breakdown region**: at very large $u_{DS}$ (here around 18–20 V) the drain junction
  breaks down and $i_D$ shoots up. Keep out.

Move the gate voltage and watch where the curve bends: the knee always sits on the
pre-pinch-off locus.

::: plot Output characteristics of an N-channel enhancement MOSFET
x: 0 .. 20
y: 0 .. 6
xlabel: u_DS (V)
ylabel: i_D (mA)
iD(uDS) = IDO/Uth^2 (2 max(0, U - Uth) min(uDS, max(0, U - Uth)) - min(uDS, max(0, U - Uth))^2)
i4V(uDS) = IDO/Uth^2 (2 max(0, 4 - Uth) min(uDS, max(0, 4 - Uth)) - min(uDS, max(0, 4 - Uth))^2)
locus(uDS) = IDO/Uth^2 uDS^2
slider U: 0 .. 7 = 6 | V
slider Uth: 1 .. 3 = 2 | V
slider IDO: 0.5 .. 2 = 1 | mA
:::

(The curves are drawn from the square law below, so they are perfectly flat in the
constant-current region and leave out breakdown; real curves tilt up slightly.)

::: callout pitfall "Saturation" means opposite things
Many English textbooks call the FET's constant-current region the "saturation region",
because $i_D$ has saturated. But a *BJT's* saturation region is where it acts like a
closed switch, which matches the FET's *variable-resistance* region. The Chinese names
avoid the clash: say 恒流区 and 可变电阻区 for FETs.
:::

### The transfer characteristic and the square law

::: formula Transfer characteristic | 转移特性
$$i_D = f(u_{GS})\big|_{U_{DS} = \text{const}}$$
--
i_D | drain current | A
u_{GS} | gate–source voltage | V
U_{DS} | drain–source voltage, held fixed (in the constant-current region) | V
:::

Draw a vertical line at $u_{DS} = 10$ V through the output characteristics and read off
where it crosses each curve: (2 V, 0), (4 V, 1 mA), (5 V, ≈2 mA), (6 V, 4 mA). Plotted
against $u_{GS}$, these points make the {{term transfer characteristic | 转移特性曲线}}:
zero up to $U_{GS(th)}$, then rising like a parabola. In the constant-current region all
the output curves are flat, so any $u_{DS}$ there gives (almost) the same transfer
curve.

Why does a FET need a transfer characteristic, when a BJT is described by its input
and output characteristics? Because a FET has no useful input characteristic: the gate
current is zero whatever $u_{GS}$ is, so an $i_G$–$u_{GS}$ curve would be a flat line
along the axis. The input voltage acts *directly* on the output current, and the curve
that shows that control is $i_D$ against $u_{GS}$.

::: formula Square law, enhancement MOSFET | 增强型MOS管的电流方程
$$i_D = I_{DO}\left(\frac{u_{GS}}{U_{GS(th)}} - 1\right)^2 \qquad (u_{GS} > U_{GS(th)})$$
--
i_D | drain current in the constant-current region | A
I_{DO} | the drain current when $u_{GS} = 2U_{GS(th)}$ | A
u_{GS} | gate–source voltage | V
U_{GS(th)} | threshold voltage | V
:::

The constant $I_{DO}$ is simply the current at twice the threshold voltage: put
$u_{GS} = 2U_{GS(th)}$ in and the bracket is $(2-1)^2 = 1$.

::: example Reading the square law off the slide's curves
The slides' MOSFET has $U_{GS(th)} = 2$ V and passes 1 mA at $u_{GS} = 4$ V. Find
$I_{DO}$ and the drain current at 5 V and 6 V.
== Find I_DO ==
$4\ \text{V} = 2U_{GS(th)}$, so $I_{DO}$ is the current at 4 V: $I_{DO} = 1$ mA.
== At 6 V ==
$i_D = 1 \times \left(\dfrac{6}{2} - 1\right)^2 = 1 \times 2^2 = 4$ mA, as the curve shows.
== At 5 V ==
$i_D = 1 \times (2.5 - 1)^2 = 2.25$ mA. The curves are hand-drawn and show about
2 mA; the equation is the precise version.
:::

## The N-channel depletion MOSFET

### Structure and symbol

Build the same device, but while making the oxide, put a suitable amount of positive
metal ions into it under the gate. Their positive charge does what a positive gate
voltage did before: even at $u_{GS} = 0$ it pulls enough electrons to the surface to form
an inversion layer, so **the channel is there from the start**.

Now the gate can work in both directions. A positive $u_{GS}$ adds to the ions' effect
and thickens the channel; a negative $u_{GS}$ cancels some of it and thins the channel.
At a certain negative voltage the channel disappears completely and $i_D = 0$.

::: define Pinch-off voltage U_GS(off) | 夹断电压
The gate–source voltage at which a depletion-type FET's channel closes completely, so
that $i_D = 0$ (also written $U_P$). It is negative for N-channel depletion devices and
positive for P-channel ones.
:::

::: define Saturation drain current I_DSS | 饱和漏极电流
The drain current of a depletion-type FET (depletion MOSFET or JFET) at $U_{GS} = 0$, in
the constant-current region.
:::

In the symbol the channel is a **continuous line**: drain, substrate and source are
joined, showing the channel conducts at zero gate voltage. The substrate arrow still
points in (P substrate, N channel).

### Characteristics

The output characteristics look like the enhancement device's, with the same three
regions; only the gate voltages are different. Pre-pinch-off happens at
$u_{GD} = U_{GS(off)}$. On the slides' device the curves for $U_{GS} = +1, 0, -1$ V level off
at about 3.1, 2 and 1 mA, and the curve for $-4$ V is cut off.

::: formula Square law, depletion MOSFET and JFET | 耗尽型管的电流方程
$$i_D = I_{DSS}\left(1 - \frac{u_{GS}}{U_{GS(off)}}\right)^2$$
--
i_D | drain current in the constant-current region | A
I_{DSS} | saturation drain current, at $u_{GS} = 0$ | A
u_{GS} | gate–source voltage | V
U_{GS(off)} | pinch-off voltage | V
:::

It holds in the constant-current region for $u_{GS}$ between $U_{GS(off)}$ (where it
gives zero) and the largest gate voltage the device allows. At $u_{GS} = 0$ the bracket
is 1 and $i_D = I_{DSS}$, which is what $I_{DSS}$ means.

::: callout note Which I_DSS on slide 03-008?
The two graphs on the slide disagree: the output curves give about 2 mA at
$U_{GS} = 0$, but the transfer curve is drawn crossing the $i_D$ axis at about 3.5 mA.
The output curves, the comparison table (03-014) and the square law all agree on
$I_{DSS} = 2$ mA with $U_{GS(off)} = -4$ V: the law gives
$2(1 - \tfrac{1}{4})^2 \approx 1.1$ mA at $-1$ V and $2(1 + \tfrac14)^2 \approx 3.1$ mA at
$+1$ V, matching the curves. This lesson uses $I_{DSS} = 2$ mA; the transfer curve on
03-008 is drawn too high.
:::

::: example A depletion MOSFET at three gate voltages
An N-channel depletion MOSFET has $I_{DSS} = 2$ mA and $U_{GS(off)} = -4$ V. Find $i_D$ in
the constant-current region at $u_{GS} = -2$ V, $0$ V and $+1$ V.
== At −2 V ==
$i_D = 2\left(1 - \dfrac{-2}{-4}\right)^2 = 2 \times 0.5^2 = 0.5$ mA.
== At 0 V ==
$i_D = I_{DSS} = 2$ mA.
== At +1 V ==
$i_D = 2\left(1 - \dfrac{1}{-4}\right)^2 = 2 \times 1.25^2 \approx 3.13$ mA. A depletion
MOSFET is happy with a positive gate voltage: its gate is insulated.
:::

## The N-channel JFET

### Structure and symbol

Take a bar of N-type silicon with a contact at each end: drain at the top, source at the
bottom. On its two sides make two heavily doped P regions and join them: they form the
gate. You now have **two PN junctions clamping an N-type channel** between them. Each
junction has a depletion layer, which has no free carriers and so doesn't conduct; the
channel is the undepleted N silicon between the two layers.

There is no insulating layer, and the channel exists at zero gate voltage, so a JFET is
always a depletion device: there is no enhancement JFET. In the symbol the channel is a
continuous line and the gate arrow points **in** (from the P gate to the N channel).

### How the gate voltage narrows the channel

The gate junctions must be **reverse-biased**, so for an N-channel JFET $u_{GS} \le 0$.

- $u_{GS} = 0$: the depletion layers are narrow and the channel is wide.
- $u_{GS} < 0$: the junctions are reverse-biased, the depletion layers spread towards the
  middle and the channel narrows; its resistance rises.
- $u_{GS} = U_{GS(off)}$: the two depletion layers meet and close the channel completely:
  pinch-off, $i_D = 0$.

Because the junctions are reverse-biased, only a tiny leakage current flows into the
gate: that is the JFET's high input resistance.

::: callout warning Never forward-bias a JFET's gate
If an N-channel JFET's $u_{GS}$ goes positive by more than about 0.5 V, the gate junction
conducts like a diode: the gate starts drawing current, the input resistance collapses,
and a large current can destroy the junction. That is why its transfer curve stops at
$u_{GS} = 0$.
:::

### What the drain voltage does

With $u_{DS} > 0$ the voltage along the channel rises towards the drain, so the junction is
more strongly reverse-biased at the drain end: the depletion layers are wedge-shaped,
widest at the drain. The same three stages appear as in the MOSFET, with $U_{GS(off)}$ in
place of $U_{GS(th)}$:

| Condition | What happens | Region |
| --- | --- | --- |
| $u_{GD} = u_{GS} - u_{DS} > U_{GS(off)}$ | channel narrows towards the drain; $i_D$ rises quickly | variable resistance |
| $u_{GD} = U_{GS(off)}$ | depletion layers touch at the drain end | pre-pinch-off |
| $u_{GD} < U_{GS(off)}$ | pinched zone grows towards the source; the extra $u_{DS}$ goes into overcoming it; $i_D$ saturates | constant current |

### Characteristics

The JFET obeys the same square law as the depletion MOSFET (formula above). The slides'
JFET has $I_{DSS} = 4$ mA and $U_{GS(off)} = -4$ V; its output curves for
$U_{GS} = 0, -1, -2$ V level off at about 4, 2.1 and 0.9 mA, and its transfer curve runs
from $(-4\ \text{V}, 0)$ through $(-2\ \text{V}, 1\ \text{mA})$ to $(0, 4\ \text{mA})$, where it
stops.

::: example Checking the JFET's curves
For $I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V, find $i_D$ at $u_{GS} = -1$ V and $-2$ V, and the
smallest $u_{DS}$ that keeps it in the constant-current region at $u_{GS} = -1$ V.
== At −1 V ==
$i_D = 4\left(1 - \dfrac{-1}{-4}\right)^2 = 4 \times 0.75^2 = 2.25$ mA (the curve shows
about 2.1 mA).
== At −2 V ==
$i_D = 4 \times 0.5^2 = 1$ mA.
== Edge of the constant-current region ==
We need $u_{GD} \le U_{GS(off)}$: $u_{GS} - u_{DS} \le U_{GS(off)}$, so
$u_{DS} \ge u_{GS} - U_{GS(off)} = -1 - (-4) = 3$ V.
:::

::: callout key The condition for the constant-current region
For an N-channel FET: $u_{DS} \ge u_{GS} - U_{GS(th)}$ (enhancement MOSFET) or
$u_{DS} \ge u_{GS} - U_{GS(off)}$ (depletion MOSFET, JFET). Check it every time you use a
square law: the square law is only true there.
:::

Here are the three N-channel transfer characteristics side by side. The JFET's curve
ends at $u_{GS} = 0$; the depletion MOSFET's carries on into positive voltages; the
enhancement MOSFET's only starts at its threshold.

::: plot Transfer characteristics of the three N-channel FETs
x: -5 .. 7
y: 0 .. 6
xlabel: u_GS (V)
ylabel: i_D (mA)
enhancement(u) = IDO max(0, u/Uth - 1)^2
depletion(u) = 2 max(0, 1 - u/Uoff)^2
JFET(u) = IDSS max(0, 1 - u/Uoff)^2 + 0 sqrt(-u)
slider Uth: 1 .. 4 = 2 | V
slider IDO: 0.5 .. 3 = 1 | mA
slider Uoff: -6 .. -1 = -4 | V
slider IDSS: 1 .. 6 = 4 | mA
:::

## All six types compared

The P-channel devices are built the other way round (N substrate, P⁺ source and drain,
or a P channel between N gates). Holes carry the current, so every voltage changes
sign: $u_{DS} < 0$, the drain current flows *out of* the drain, and the gate voltages
that turn the device on are the opposite sign. Their curves are the N-channel ones
mirrored (the slides plot them against $-u_{DS}$).

| Type | Symbol | Turn-on voltage | Conducts when | $u_{DS}$ |
| --- | --- | --- | --- | --- |
| N-channel enhancement MOSFET | broken channel, arrow in | $U_{GS(th)} > 0$ (e.g. 2 V) | $u_{GS} > U_{GS(th)}$ | $> 0$ |
| P-channel enhancement MOSFET | broken channel, arrow out | $U_{GS(th)} < 0$ (e.g. −2 V) | $u_{GS} < U_{GS(th)}$ | $< 0$ |
| N-channel depletion MOSFET | continuous channel, arrow in | $U_{GS(off)} < 0$ (e.g. −4 V) | $u_{GS} > U_{GS(off)}$, either sign | $> 0$ |
| P-channel depletion MOSFET | continuous channel, arrow out | $U_{GS(off)} > 0$ (e.g. +4 V) | $u_{GS} < U_{GS(off)}$, either sign | $< 0$ |
| N-channel JFET | gate arrow in | $U_{GS(off)} < 0$ (e.g. −4 V) | $U_{GS(off)} < u_{GS} \le 0$ | $> 0$ |
| P-channel JFET | gate arrow out | $U_{GS(off)} > 0$ (e.g. +4 V) | $0 \le u_{GS} < U_{GS(off)}$ | $< 0$ |

On the slides' P-channel enhancement MOSFET, for instance, $U_{GS(th)} = -2$ V and the
current is 1 mA at $-4$ V and 4 mA at $-6$ V. The square laws still apply with signed
values: $1 \times (\tfrac{-6}{-2} - 1)^2 = 4$ mA.

::: callout tip Reading a symbol in three glances
1. **Broken or continuous channel?** Broken: enhancement (no channel at zero gate
   voltage). Continuous: depletion (MOSFET or JFET).
2. **Gate touching the channel, or separate?** Touching, with an arrow on the gate: a
   JFET. Separate (a gap): a MOSFET, with the arrow on the substrate.
3. **Which way does the arrow point?** As in a diode it points from P to N: **in** means
   an N channel, **out** a P channel.
:::

::: circuit The three N-channel FET symbols: enhancement MOSFET, depletion MOSFET, JFET
M1 nmos 2,2
M2 nmos-d 8,2
M3 njfet 14,2
:::

## Parameters and type numbers

### DC parameters

1. **Threshold voltage $U_{GS(th)}$** (or $U_T$): for enhancement MOSFETs (definition
   above). With $|u_{GS}|$ below $|U_{GS(th)}|$ the device doesn't conduct.
2. **Pinch-off voltage $U_{GS(off)}$** (or $U_P$): for depletion types; at
   $U_{GS} = U_{GS(off)}$ the drain current is zero.
3. **Saturation drain current $I_{DSS}$**: for depletion types, $i_D$ at $U_{GS} = 0$.
4. **Input resistance $R_{GS}$**: the resistance between gate and source. For a JFET with
   its gate reverse-biased it is above about $10^7\ \Omega$; for a MOSFET, about
   $10^9$ to $10^{15}\ \Omega$. For a BJT, $r_{be}$ is only around a kilohm.

### AC parameters

::: define Transconductance g_m | 跨导
The low-frequency transconductance: how strongly the gate voltage controls the drain
current at the operating point, $g_m = \partial i_D / \partial u_{GS}$ at constant
$u_{DS}$. It is the slope of the transfer characteristic, measured in siemens (usually
mS: a change of 1 V on the gate changes $i_D$ by $g_m$ milliamps per mS).
:::

You can read $g_m$ off the transfer curve as the slope of its tangent at the Q point, or
differentiate the square law. For a depletion device:

$$g_m = \frac{\partial i_D}{\partial u_{GS}} = -\frac{2I_{DSS}}{U_{GS(off)}}\left(1 - \frac{u_{GS}}{U_{GS(off)}}\right)$$

and since $\left(1 - u_{GS}/U_{GS(off)}\right) = \sqrt{I_D / I_{DSS}}$, this becomes
$-2\sqrt{I_{DSS}I_D}/U_{GS(off)}$. The same steps on the enhancement law give the
second form below.

::: formula Transconductance from the Q-point current | 跨导
$$g_m = \frac{2\sqrt{I_{DSS}\,I_{DQ}}}{\left|U_{GS(off)}\right|} \ \ \text{(depletion, JFET)} \qquad g_m = \frac{2\sqrt{I_{DO}\,I_{DQ}}}{U_{GS(th)}} \ \ \text{(enhancement)}$$
--
g_m | low-frequency transconductance | S
I_{DQ} | drain current at the Q point | A
I_{DSS} | saturation drain current | A
U_{GS(off)} | pinch-off voltage | V
I_{DO} | enhancement device's current at $2U_{GS(th)}$ | A
U_{GS(th)} | threshold voltage | V
:::

::: callout note The sign on slide 03-017
The slide's derivation ends with $g_m = 2\sqrt{I_{DSS} I_D}/U_{GS(off)}$, dropping the minus
sign. For an N-channel device $U_{GS(off)}$ is negative, so that would make $g_m$ negative,
which it isn't: raising $u_{GS}$ raises $i_D$. The correct result is
$g_m = -2\sqrt{I_{DSS} I_D}/U_{GS(off)} = 2\sqrt{I_{DSS} I_D}/|U_{GS(off)}|$. Use the
magnitude, and $g_m$ always comes out positive.
:::

::: callout pitfall g_m grows with the current
$g_m$ isn't a fixed property of the device like $I_{DSS}$: it depends on where you bias
it. More drain current means a steeper part of the parabola and a bigger $g_m$; at
cutoff it is zero.
:::

::: example Transconductance at two operating points
(a) A JFET with $I_{DSS} = 4$ mA, $U_{GS(off)} = -4$ V is biased at $U_{GSQ} = -1$ V.
(b) An enhancement MOSFET with $I_{DO} = 1$ mA, $U_{GS(th)} = 2$ V is biased at
$U_{GSQ} = 6$ V. Find $I_{DQ}$ and $g_m$ for each.
== JFET: the current ==
$I_{DQ} = 4(1 - 0.25)^2 = 2.25$ mA.
== JFET: g_m ==
$g_m = \dfrac{2\sqrt{4 \times 2.25}}{4} = \dfrac{2 \times 3}{4} = 1.5$ mS. Check with the
derivative: $\dfrac{2 \times 4}{4}(1 - 0.25) = 1.5$ mS.
== MOSFET: the current ==
$I_{DQ} = 1 \times (6/2 - 1)^2 = 4$ mA.
== MOSFET: g_m ==
$g_m = \dfrac{2\sqrt{1 \times 4}}{2} = 2$ mS.
:::

::: explore Transconductance of a JFET
slider IDSS: 1 .. 10 = 4 | mA
slider Uoff: 1 .. 6 = 4 | V
slider UGS: -6 .. 0 = -1 | V
ID = IDSS max(0, 1 + UGS/Uoff)^2 | mA | Drain current I_DQ (U_GS(off) = −Uoff)
gm = 2 sqrt(IDSS ID) / Uoff | mS | Transconductance g_m
:::

(Here the slider sets the size of $U_{GS(off)}$; the device's actual pinch-off voltage is
$-U_{\text{off}}$.)

The other AC parameter is the set of {{term inter-electrode capacitances | 极间电容}}
$C_{gs}$, $C_{gd}$ and $C_{ds}$ between the three electrodes. They are tiny (for small
discrete FETs $C_{gs}$ and $C_{gd}$ are about 1–3 pF and $C_{ds}$ about 0.1–1 pF), so they
only matter at high frequencies; the last lesson of this unit is about them.

### Limit parameters

- **Maximum drain current $I_{DM}$**: the largest drain current allowed in normal use.
- **Gate breakdown voltage $U_{(BR)GS}$**: the reverse gate–source voltage that breaks
  down a JFET's gate junction, or punctures a MOSFET's oxide.
- **Drain breakdown voltage $U_{(BR)DS}$**: the drain–source voltage at which, in the
  constant-current region, $i_D$ suddenly shoots up.
- **Maximum drain dissipation $P_{DM}$**: the largest power the device may turn into
  heat, $P_{DM} = U_{DS} I_D$, like the BJT's $P_{CM}$.

::: example Is the power within limits?
A FET with $P_{DM} = 100$ mW works at $U_{DS} = 10$ V, $I_D = 4$ mA. Is it safe? What is
the largest $I_D$ at that voltage?
== The power ==
$P = U_{DS}I_D = 10 \times 4 = 40$ mW $< 100$ mW: safe.
== The limit ==
$I_D \le P_{DM}/U_{DS} = 100/10 = 10$ mA (as long as that is also below $I_{DM}$).
:::

::: callout warning Static electricity
A MOSFET's oxide is so thin and so well insulated that charge from your fingers can
build a voltage on the gate high enough to puncture it. MOSFETs are shipped with their
leads shorted, and should be handled grounded; many have protective diodes built in.
:::

### Type numbers

Chinese FET part numbers follow one of two schemes:

1. **Like BJTs**: the second character is the material, D for N-channel (P-type silicon)
   and C for P-channel (N-type silicon), and the third is the family, **J** for a JFET and
   **O** for an insulated-gate FET. So 3DJ6D is an N-channel JFET and 3DO6C an N-channel
   MOSFET.
2. **CS××#**: CS means field-effect transistor, ×× is a serial number and # a letter
   for the grade within the type, as in CS14A or CS45G.

## BJTs and FETs compared

| | BJT | FET |
| --- | --- | --- |
| Types | NPN, PNP | JFET (N, P); enhancement MOSFET (N, P); depletion MOSFET (N, P) |
| Electrodes | C and E can't be swapped | D and S can usually be swapped |
| Carriers | majority and minority (bipolar) | majority only (unipolar) |
| Input quantity | current | voltage |
| Control | current-controlled current source (CCCS), $\beta$ | voltage-controlled current source (VCCS), $g_m$ |
| Noise | higher | lower |
| Temperature stability | poor | better |
| Input resistance | low (tens of Ω to a few kΩ) | high (MΩ and up), $i_G \approx 0$ |
| Static electricity | not easily damaged | easily damaged |
| Integration | hard to integrate densely | suited to large and very large scale integration |
| High-current behaviour | good | less good |
| Power consumption | more | less |
| Supply voltage range | narrow | wide |

Two of these follow straight from the physics. A FET uses only majority carriers, and
the number of minority carriers rises steeply with temperature, so FETs drift less with
heat and make less noise. And since the gate draws no current, a FET draws no power
from whatever drives it; that and their small size are why integrated circuits are
built from MOSFETs.

::: callout exam For the exam
Expect to identify a FET type from its symbol or curves, to say which sign of $U_{GS}$
each type needs, to use the two square laws (and check the constant-current condition),
to find $g_m$ at a Q point, and to fill in the BJT/FET comparison table.
:::

::: cards Field-effect transistors
A FET is controlled by … :: The gate–source voltage (it's a voltage-controlled device; the gate draws almost no current).
FET electrodes and their BJT counterparts :: Source ↔ emitter, gate ↔ base, drain ↔ collector.
FET regions and their BJT counterparts :: Cutoff ↔ cutoff, constant-current (恒流区) ↔ active, variable-resistance (可变电阻区) ↔ saturation.
Enhancement vs depletion :: Enhancement: no channel at $u_{GS}=0$, the gate must create it. Depletion: the channel exists at $u_{GS}=0$.
Is there an enhancement-mode JFET? :: No: every JFET is a depletion device.
Square law, enhancement MOSFET :: $i_D = I_{DO}\left(\dfrac{u_{GS}}{U_{GS(th)}} - 1\right)^2$, with $I_{DO}$ the current at $u_{GS} = 2U_{GS(th)}$.
Square law, JFET and depletion MOSFET :: $i_D = I_{DSS}\left(1 - \dfrac{u_{GS}}{U_{GS(off)}}\right)^2$
Pre-pinch-off condition :: $u_{GD} = u_{GS} - u_{DS} = U_{GS(th)}$ (MOSFET) or $U_{GS(off)}$ (JFET, depletion).
Condition for the constant-current region (N channel) :: $u_{DS} \ge u_{GS} - U_{GS(th)}$, or $u_{DS} \ge u_{GS} - U_{GS(off)}$.
$g_m$ of a depletion FET at $I_{DQ}$ :: $g_m = 2\sqrt{I_{DSS}I_{DQ}}/\lvert U_{GS(off)}\rvert$
$g_m$ of an enhancement MOSFET at $I_{DQ}$ :: $g_m = 2\sqrt{I_{DO}I_{DQ}}/U_{GS(th)}$
Broken channel line in a MOSFET symbol means … :: Enhancement type: no channel at zero gate voltage.
Arrow pointing in (on substrate or gate) means … :: An N channel (the arrow points from P to N).
Why does a FET need a transfer characteristic? :: Its gate current is zero, so there is no useful input characteristic; $u_{GS}$ controls $i_D$ directly.
BJT vs FET control :: BJT: CCCS, $\beta$. FET: VCCS, $g_m$.
:::

::: quiz Check yourself
? An enhancement MOSFET has $U_{GS(th)} = 2$ V and $I_{DO} = 1$ mA. What drain current flows at $u_{GS} = 5$ V in the constant-current region?
answer: 2.25 mA
> $i_D = I_{DO}(u_{GS}/U_{GS(th)} - 1)^2 = 1 \times (2.5 - 1)^2 = 2.25$ mA.

? A JFET has $I_{DSS} = 8$ mA and $U_{GS(off)} = -4$ V. At what $u_{GS}$ is $i_D = 2$ mA?
answer: -2 V
tolerance: 0.02 V
> $2 = 8(1 - u_{GS}/(-4))^2$, so $1 + u_{GS}/4 = \sqrt{0.25} = 0.5$ and $u_{GS} = -2$ V. (The other root, $1 + u_{GS}/4 = -0.5$, gives $-6$ V, beyond pinch-off, where the law doesn't apply.)

? The same JFET ($I_{DSS} = 8$ mA, $U_{GS(off)} = -4$ V) is biased at $I_{DQ} = 2$ mA. What is its $g_m$?
answer: 2 mS
> $g_m = 2\sqrt{I_{DSS}I_{DQ}}/|U_{GS(off)}| = 2\sqrt{8 \times 2}/4 = 2 \times 4/4 = 2$ mS.

? An N-channel JFET with $U_{GS(off)} = -4$ V has $u_{GS} = -1.5$ V. What is the smallest $u_{DS}$ that keeps it in the constant-current region?
answer: 2.5 V
> Constant current needs $u_{GD} \le U_{GS(off)}$: $u_{DS} \ge u_{GS} - U_{GS(off)} = -1.5 + 4 = 2.5$ V.

? Write the transconductance $g_m = \partial i_D/\partial u_{GS}$ of an enhancement MOSFET in terms of $I_{DO}$, $U_{GS(th)}$ (write it as $U$) and $u_{GS}$ (write it as $u$).
expression: 2 IDO / U (u/U - 1)
variables: IDO, U, u
> Differentiate $i_D = I_{DO}(u/U - 1)^2$: the chain rule gives $2I_{DO}(u/U - 1) \cdot \dfrac{1}{U}$.

? Which FETs conduct with $u_{GS} = 0$? (Pick all.)
- [x] N-channel JFET
- [x] N-channel depletion MOSFET
- [ ] N-channel enhancement MOSFET
- [x] P-channel depletion MOSFET
> Depletion-type devices (all JFETs and depletion MOSFETs) have a channel at zero gate voltage. Enhancement MOSFETs need $|u_{GS}| > |U_{GS(th)}|$ first.

? A MOSFET symbol has a broken channel line and the substrate arrow pointing out. What is it?
- [ ] N-channel enhancement MOSFET
- [x] P-channel enhancement MOSFET
- [ ] P-channel depletion MOSFET
- [ ] N-channel JFET
> Broken channel: enhancement. Arrow out (from the N substrate to the P channel): P channel.

? In which region does a FET amplifier work?
- [ ] Variable-resistance region
- [x] Constant-current region
- [ ] Cutoff region
- [ ] Breakdown region
> In the constant-current region $i_D$ depends only on $u_{GS}$, so the device acts as a voltage-controlled current source, which is what amplification needs.

? What do we call the gate–source voltage at which an enhancement MOSFET's channel just forms?
text: threshold voltage | the threshold voltage | turn-on voltage | 开启电压
> The threshold (turn-on) voltage $U_{GS(th)}$, also written $U_T$.

? Why do FETs drift less with temperature than BJTs?
- [x] They conduct with majority carriers only, and it's the minority carriers that multiply with temperature
- [ ] Their gate draws current, which cancels the drift
- [ ] Their input resistance is low
> A BJT relies on minority carriers too, and their number rises steeply with temperature. A FET is a unipolar (majority-carrier) device, so it is more stable and quieter.
:::

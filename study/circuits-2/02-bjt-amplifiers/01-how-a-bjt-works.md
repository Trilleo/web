---
title: How a BJT works
zh: 晶体管的结构与电流放大作用
summary: What a bipolar transistor is made of, how carriers cross it, and why a small base current controls a collector current β times larger.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

Every amplifier in this unit is built around one part: the bipolar junction
transistor. Before we can bias it, draw its curves or work out a gain, we need a
picture of what happens inside it, because every formula later on (the $\beta$ in
$I_C = \beta I_B$, the $0.7$ V between base and emitter, the leakage currents that grow
with temperature) comes straight from that picture. This lesson builds it: the
structure, the three ways of connecting the transistor, the carriers moving inside it,
and the current gains $\overline{\alpha}$ and $\overline{\beta}$.

## Two kinds of transistor

The word {{term transistor | 晶体管}} covers two families of three-terminal devices:

- the **bipolar junction transistor** (BJT), also called a {{zh 半导体三极管}} or
  {{zh 晶体三极管}}, made of two PN junctions back to back;
- the **field-effect transistor** (FET), the subject of the next unit.

The names describe who carries the current. In a BJT *both* electrons and holes take
part ("bipolar"); in a FET only one kind of carrier does ("unipolar"). They are also
controlled differently, and this is the difference to remember.

::: define Bipolar junction transistor | 双极型晶体管
A three-terminal semiconductor device made of two PN junctions, in which both
electrons and holes carry current. It is a **current-controlled current source**
(CCCS): a small base current controls a much larger collector current.
:::

A **field-effect transistor** {{zh 场效应晶体管}}, the subject of Unit 3, is different: a transistor in which only one kind of carrier carries the current. It is a
**voltage-controlled current source** (VCCS): a gate *voltage* controls the drain
current, and the gate draws (almost) no current.

::: callout key BJT versus FET
BJT: current controls current (CCCS). FET: voltage controls current (VCCS). The rest
of this unit is about the BJT.
:::

## Structure, types and symbols

A BJT is a sandwich of three doped regions. Either a thin P layer sits between two N
layers (**NPN**), or a thin N layer sits between two P layers (**PNP**). Each region
has a lead:

| Region | {{zh 中文}} | Lead | Symbol |
| --- | --- | --- | --- |
| Emitter region | {{zh 发射区}} | emitter | e |
| Base region (the thin middle layer) | {{zh 基区}} | base | b |
| Collector region | {{zh 集电区}} | collector | c |

Where two regions meet there is a PN junction. The one between emitter and base is the
{{term emitter junction | 发射结}}; the one between base and collector is the
{{term collector junction | 集电结}}. So a BJT has two junctions, and how each one is
biased decides everything it does.

::: define NPN and PNP transistors | NPN型和PNP型晶体管
The two BJT structures: N–P–N (a P-type base between N-type emitter and collector) and
P–N–P (an N-type base between P-type emitter and collector).
:::

In the circuit symbol, the **short thick bar is the base**. The two slanted lines are
the collector and the emitter, and only the emitter has an arrow. The arrow shows the
direction current flows through the emitter junction when it is forward-biased:

- NPN: the arrow points **out** of the transistor (current leaves by the emitter).
- PNP: the arrow points **in** (current enters by the emitter).

::: circuit The two symbols: NPN (left) and PNP (right)
Q1 npn 2,2
Q2 pnp 10,2
label b 2,2
label c 4,0
label e 4,4
label b 10,2
label c 12,0
label e 12,4
:::

A memory aid: in an NPN the arrow is "**N**ot **P**ointing i**N**".

::: callout pitfall The two ends are not interchangeable
On paper a BJT looks symmetrical (N–P–N), but it is not built that way. The emitter
is **heavily doped**, the base is **lightly doped and very thin**, and the collector is
**lightly doped with a large junction area**. Swap emitter and collector and the
transistor still conducts, but its current gain collapses.
:::

## The three configurations

A transistor has three terminals, but an amplifier needs four: two for the input port
and two for the output port. So one terminal is shared by the input and the output.
Which one is shared names the {{term configuration | 组态}}:

| Configuration | Common terminal | Input goes to | Output taken from |
| --- | --- | --- | --- |
| Common emitter, CE ({{zh 共发射极}}) | emitter | base | collector |
| Common collector, CC ({{zh 共集电极}}) | collector | base | emitter |
| Common base, CB ({{zh 共基极}}) | base | emitter | collector |

::: define Configuration (CE, CC, CB) | 组态
The way a transistor is connected into a two-port circuit, named after the terminal
common to the input and output: common emitter (CE), common collector (CC) or common
base (CB).
:::

The sketches below leave out the bias parts and show only where the signal goes in
and comes out. Notice that the collector is never the input, and the base is never
the output.

::: circuit Common emitter: in at the base, out at the collector
A1 0,8 0,4 ui
W 0,4 4,4
Q1 npn 4,4
W 6,6 6,8
W 6,2 10,2
R1 10,2 10,8 RL
W 0,8 10,8
G 6,8
label uo 10,2
:::

::: circuit Common collector: in at the base, out at the emitter (collector to the common line)
A1 0,8 0,4 ui
W 0,4 4,4
Q1 npn 4,4 flip
W 6,6 6,8
W 6,2 10,2
R1 10,2 10,8 RL
W 0,8 10,8
G 6,8
label uo 10,2
:::

::: circuit Common base: in at the emitter, out at the collector (base to the common line)
Q1 npn 4,4
W 4,4 2,4 2,10
A1 6,10 6,6 ui
W 6,2 10,2
R1 10,2 10,10 RL
W 2,10 10,10
G 2,10
label uo 10,2
:::

We'll analyse all three in lesson 2.7. Until then, everything is about the common
emitter, the workhorse.

## Inside the transistor: how carriers cross

A transistor only amplifies when its two junctions are biased the right way. For the
**amplification (active) state** ({{zh 放大状态}}):

::: law Bias for amplification | 放大状态的偏置条件
A BJT amplifies when its **emitter junction is forward-biased** and its **collector
junction is reverse-biased**. For an NPN this means $U_C > U_B > U_E$; for a PNP,
$U_C < U_B < U_E$.
:::

Take an NPN biased this way and follow the carriers. A good picture is a crowd running
downhill across a narrow bridge: the emitter pushes a huge crowd of electrons into the
base, the base is so thin that almost nobody stops on it, and the collector junction
on the far side is a steep slope that sweeps everyone who arrives into the collector.

1. **Injection.** The forward-biased emitter junction lets the heavily doped emitter
   inject a large flow of electrons into the base. Call this electron current
   $I_{EN}$. Holes from the base also cross the other way into the emitter, giving
   $I_{EP}$, but the base is lightly doped, so there are few of them:
   $I_{EN} \gg I_{EP}$.
2. **Recombination.** In the base the injected electrons are minority carriers. A few
   meet holes and recombine; the base lead replaces those holes, and this small flow is
   $I_{BN}$. Because the base is **thin and lightly doped**, very few electrons are
   lost this way.
3. **Collection.** Almost all the electrons reach the collector junction. Its reverse
   bias doesn't block them: for minority carriers (electrons in a P region) the
   junction's field is a downhill slope, and it sweeps them into the collector. This is
   $I_{CN}$, and $I_{CN} = I_{EN} - I_{BN}$. The **large collector junction** makes sure
   it catches nearly all of them.
4. **Leakage.** The reverse-biased collector junction also passes its own small
   reverse saturation current, made of thermally generated minority carriers drifting
   across. This is $I_{CBO}$, and it doesn't depend on the emitter at all.

This answers the slide's question "how do we make sure as many injected carriers as
possible reach the collector?": a heavily doped emitter (many electrons injected), a
thin, lightly doped base (few lost to recombination) and a large collector junction
(all of them caught).

::: callout pitfall Carrier flow is not current
The slides draw the movement of carriers. Holes move the same way as the current;
electrons move the **opposite** way. Electrons flow from emitter to collector inside an
NPN, so the conventional currents flow **into** the collector and base and **out of**
the emitter, as the emitter arrow says.
:::

## The electrode currents

Adding up the carrier flows gives the current in each lead:

::: formula Currents inside a BJT | 晶体管内部的电流关系
$$I_E = I_{EN} + I_{EP}, \qquad I_C = I_{CN} + I_{CBO}, \qquad I_B = I_{EP} + I_{BN} - I_{CBO}$$
--
I_{EN} | electrons injected from emitter into base | A
I_{EP} | holes injected from base into emitter (small) | A
I_{BN} | electrons lost to recombination in the base | A
I_{CN} | electrons that reach the collector, $I_{EN} - I_{BN}$ | A
I_{CBO} | reverse saturation current of the collector junction | A
:::

Notice the minus sign on $I_{CBO}$ in $I_B$: the leakage flows out of the base, against
the other base currents. Adding $I_C$ and $I_B$ and using $I_{CN} = I_{EN} - I_{BN}$:

$$I_C + I_B = (I_{CN} + I_{CBO}) + (I_{EP} + I_{BN} - I_{CBO}) = I_{EN} + I_{EP} = I_E$$

which is just Kirchhoff's current law for the transistor as a whole:

::: formula The three electrode currents | 三个电极电流的关系
$$I_E = I_C + I_B$$
--
I_E | emitter current | A
I_C | collector current | A
I_B | base current | A
:::

## Current gains: ᾱ, β̄ and the leakage currents

The useful question is: of the current that enters by the emitter, how much makes it to
the collector? That ratio is the common-base gain.

::: define Common-base DC current gain | 共基极直流电流放大系数
$\overline{\alpha} = I_{CN}/I_E$: the fraction of the emitter current that arrives at
the collector. Since $I_{CN}$ lacks $I_{EP}$ and $I_{BN}$, $\overline{\alpha} < 1$, but
only just: typically 0.95 to 0.995.
:::

Now write the collector current with it, and replace $I_E$ by $I_C + I_B$:

$$I_C = I_{CN} + I_{CBO} = \overline{\alpha} I_E + I_{CBO} = \overline{\alpha}(I_C + I_B) + I_{CBO}$$

Solving for $I_C$:

$$I_C = \frac{\overline{\alpha}}{1-\overline{\alpha}} I_B + \frac{1}{1-\overline{\alpha}} I_{CBO}$$

The factor in front of $I_B$ is large (with $\overline{\alpha} = 0.99$ it is 99). It gets
its own name.

::: define Common-emitter DC current gain | 共射极直流电流放大系数
$\overline{\beta} = \overline{\alpha}/(1-\overline{\alpha})$, approximately
$I_C/I_B$. It is much larger than 1 (typically 20 to 200) and describes the
transistor's **current amplification**: a small base current controls a collector
current $\overline{\beta}$ times larger.
:::

::: formula Relations between ᾱ and β̄ | ᾱ与β̄的关系
$$\overline{\beta} = \frac{\overline{\alpha}}{1-\overline{\alpha}}, \qquad \overline{\alpha} = \frac{\overline{\beta}}{1+\overline{\beta}}$$
--
\overline{\alpha} | common-base DC current gain, just under 1 | —
\overline{\beta} | common-emitter DC current gain, much larger than 1 | —
:::

Since $1/(1-\overline{\alpha}) = 1 + \overline{\beta}$, the collector current becomes

::: formula Collector current with leakage | 集电极电流与穿透电流
$$I_C = \overline{\beta} I_B + (1+\overline{\beta}) I_{CBO} = \overline{\beta} I_B + I_{CEO}, \qquad I_{CEO} = (1+\overline{\beta}) I_{CBO}$$
--
I_{CBO} | collector–base reverse saturation current (emitter open) | A
I_{CEO} | collector–emitter leakage, the punch-through current (base open) | A
:::

::: define Punch-through current | 穿透电流
$I_{CEO}$: the current that flows from collector to emitter when the base is left open
($I_B = 0$). It equals $(1+\overline{\beta}) I_{CBO}$: the transistor amplifies its own
collector leakage.
:::

Why is the leakage multiplied? With the base open, $I_{CBO}$ has nowhere to go but
into the base region, where it acts exactly like a base current, so the transistor
amplifies it like one. $I_{CEO}$ is small in silicon transistors and is usually
neglected, leaving the relation used everywhere in this unit:

$$I_C \approx \overline{\beta} I_B, \qquad I_E = (1+\overline{\beta}) I_B, \qquad I_C \approx I_E$$

Move the slider: $\overline{\alpha}$ only changes in the third decimal place, yet
$\overline{\beta}$ swings from 20 to several hundred. That's why datasheets quote
$\beta$, not $\alpha$.

::: explore From α to β
slider a: 0.95 .. 0.998 = 0.99
slider ICBO: 0.01 .. 1 = 0.1 | μA
beta = a / (1 - a) | | β̄
ICEO = (1 + beta) ICBO | μA | Punch-through current I_CEO
:::

::: example Currents and gains of one transistor
In an NPN transistor working in the amplification state, $I_E = 2.00$ mA and
$I_C = 1.98$ mA. Neglect the leakage. Find $I_B$, $\overline{\alpha}$ and
$\overline{\beta}$.
== Base current ==
By KCL, $I_B = I_E - I_C = 2.00 - 1.98 = 0.02$ mA $= 20\ \mu$A.
== Common-base gain ==
$\overline{\alpha} \approx I_C/I_E = 1.98/2.00 = 0.99$.
== Common-emitter gain ==
$\overline{\beta} \approx I_C/I_B = 1.98/0.02 = 99$. Check:
$\overline{\alpha}/(1-\overline{\alpha}) = 0.99/0.01 = 99$. ✓
:::

::: example The leakage, amplified
A transistor has $\overline{\beta} = 100$ and $I_{CBO} = 0.1\ \mu$A. Find $I_{CEO}$,
and the collector current when $I_B = 20\ \mu$A.
== Punch-through current ==
$I_{CEO} = (1+\overline{\beta}) I_{CBO} = 101 \times 0.1 = 10.1\ \mu$A.
== Collector current ==
$I_C = \overline{\beta} I_B + I_{CEO} = 100 \times 20 + 10.1 = 2010.1\ \mu$A
$\approx 2.01$ mA. The leakage adds only 0.5%, which is why we usually drop it. But
$I_{CBO}$ doubles every 10 ℃ (lesson 2.2), so in a hot circuit it matters.
:::

::: callout exam For the exam
Expect to: name the bias conditions for amplification (emitter junction forward,
collector junction reverse), explain the three doping/geometry requirements, convert
between $\overline{\alpha}$ and $\overline{\beta}$, and use
$I_{CEO} = (1+\overline{\beta}) I_{CBO}$.
:::

::: cards How a BJT works
A BJT is a … controlled … source. :: A current-controlled current source (CCCS); a FET is a voltage-controlled current source (VCCS).
In the BJT symbol, the short thick bar is … :: The base.
What does the emitter arrow show? :: The direction of current through the forward-biased emitter junction: out of an NPN, into a PNP.
Bias for the amplification state :: Emitter junction forward-biased, collector junction reverse-biased.
Three manufacturing requirements of a BJT :: Heavily doped emitter; thin, lightly doped base; lightly doped collector with a large junction area.
Can emitter and collector be swapped? :: No: their doping and size differ, so the gain would collapse.
CE, CC, CB: which terminal is common? :: CE: emitter; CC: collector; CB: base.
$\overline{\alpha}$ means … :: The common-base DC current gain $I_{CN}/I_E$, just under 1.
$\overline{\beta}$ in terms of $\overline{\alpha}$ :: $\overline{\beta} = \overline{\alpha}/(1-\overline{\alpha})$
$I_{CEO}$ in terms of $I_{CBO}$ :: $I_{CEO} = (1+\overline{\beta})I_{CBO}$, the punch-through current with the base open.
KCL for a transistor :: $I_E = I_C + I_B$
$I_{CBO}$ is … :: The collector junction's reverse saturation current, measured with the emitter open.
:::

::: quiz How a BJT works
? Which bias puts a BJT in the amplification state?
- [x] Emitter junction forward-biased, collector junction reverse-biased
- [ ] Both junctions forward-biased
- [ ] Both junctions reverse-biased
- [ ] Emitter junction reverse-biased, collector junction forward-biased
> Forward bias on the emitter junction injects carriers into the base; reverse bias on
> the collector junction sweeps them into the collector. Both forward is saturation,
> both reverse is cutoff (next lesson).

? A transistor has $\overline{\alpha} = 0.98$. What is $\overline{\beta}$?
answer: 49
tolerance: 1%
> $\overline{\beta} = \overline{\alpha}/(1-\overline{\alpha}) = 0.98/0.02 = 49$.

? A transistor has $\overline{\beta} = 50$ and $I_{CBO} = 2\ \mu$A. What is its punch-through current $I_{CEO}$?
answer: 102 μA
tolerance: 1%
> $I_{CEO} = (1+\overline{\beta}) I_{CBO} = 51 \times 2 = 102\ \mu$A.

? $I_E = 3.03$ mA and $I_B = 30\ \mu$A. What is $I_C$?
answer: 3 mA
tolerance: 1%
> KCL: $I_C = I_E - I_B = 3.03 - 0.03 = 3.00$ mA (so $\overline{\beta} = 100$).

? Write $\overline{\alpha}$ in terms of $\overline{\beta}$ (type b for $\overline{\beta}$).
expression: b / (1 + b)
variables: b
> From $\overline{\beta} = \overline{\alpha}/(1-\overline{\alpha})$:
> $\overline{\beta} - \overline{\beta}\,\overline{\alpha} = \overline{\alpha}$, so
> $\overline{\alpha} = \overline{\beta}/(1+\overline{\beta})$.

? Why is the base made thin and lightly doped?
- [x] So that few injected electrons recombine in it and nearly all reach the collector
- [ ] So that the base can carry a large current
- [ ] So that the emitter and collector can be swapped
- [ ] So that the collector junction breaks down easily
> Recombination in the base is the loss $I_{BN}$. Thin and lightly doped means few holes
> to recombine with and little time to do it, so $I_{CN}$ is almost all of $I_{EN}$
> and $\overline{\beta}$ is large.

? In the common-base configuration, which terminal receives the input signal?
text: emitter | the emitter | e
> In CB the base is common to both ports; the signal goes into the emitter and comes
> out of the collector.

? In an NPN symbol, which way does the emitter arrow point?
- [x] Outwards, away from the base
- [ ] Inwards, towards the base
- [ ] There is no arrow on an NPN
> The arrow shows the current through the forward-biased emitter junction: out of the
> emitter for an NPN, into it for a PNP.
:::

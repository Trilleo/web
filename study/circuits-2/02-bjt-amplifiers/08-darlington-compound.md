---
title: Darlington pairs and compound stages
zh: 复合管与组合放大电路
summary: Joining two transistors into one compound transistor (the four Darlington types, the rules for forming one, its β and r_be), the Darlington emitter follower, and combining configurations into cascode and CC–CB stages.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

One transistor has a $\beta$ of perhaps 100. Some jobs need far more: a power stage
driving a loudspeaker or motor needs amps of output current from milliamps of drive. The
trick is to let one transistor drive the base of another, so their gains multiply. The
pair behaves like a single transistor with a huge $\beta$: a compound transistor, or
Darlington pair. The same "connect two stages" thinking also combines the three
configurations of lesson 2.7 so that each covers the other's weakness. This lesson works
out what the combinations are worth and how to tell whether a proposed connection can
work at all.

## Compound transistors

::: define Compound transistor | 复合管
Two (or more) transistors connected so that the output current of the first becomes the
base current of the second, and the whole behaves like one transistor with three
terminals (b, c, e). Also called a Darlington pair (or Darlington transistor).
:::

There are four types, depending on whether the two transistors are the same type or
different types:

| Type | VT1 (input) | VT2 | How they're joined | Acts as |
| --- | --- | --- | --- | --- |
| (a) | NPN | NPN | VT1's emitter → VT2's base; collectors joined | NPN |
| (b) | PNP | PNP | VT1's emitter → VT2's base; collectors joined | PNP |
| (c) | NPN | PNP | VT1's collector → VT2's base; VT2's collector joined to VT1's emitter | NPN |
| (d) | PNP | NPN | VT1's collector → VT2's base; VT2's collector joined to VT1's emitter | PNP |

::: circuit Type (a): two NPNs make an NPN
W 0,4 2,4
Q1 npn 2,4 VT1
W 4,6 4,8
Q2 npn 4,8 VT2
W 4,2 4,0 6,0 6,6
W 6,10 6,12
label b 0,4
label c 6,0
label e 6,12
:::

::: circuit Type (c): an NPN driving a PNP makes an NPN
W 0,8 2,8
Q1 npn 2,8 VT1
W 4,6 4,4 6,4
Q2 pnp 6,4 flip VT2
W 8,2 8,0
W 8,6 8,12
W 4,10 4,12 8,12
label b 0,8
label c 8,0
label e 6,12
:::

In type (c), the PNP's emitter is the compound's collector (top) and its collector joins
VT1's emitter as the compound's emitter (bottom). The current still flows in at the top
and out at the bottom, as in a single NPN.

### Rules for forming one

Two transistors don't make a compound transistor just because they're wired together:
every current needs a path in the right direction.

::: law Conditions for a compound transistor | 组成复合管的条件
(1) Each transistor must be able to work in the amplification region. (2) The current
flowing out of the first transistor's output electrode must have the **same direction**
as the base current the second transistor needs: in short, under suitable applied
voltages every transistor's currents must have a proper path.
:::

And the type of the result:

::: law Type of a compound transistor | 复合管的类型
A compound transistor has the **type of its first transistor** (VT1): two of the same
type give that type; an NPN followed by a PNP is an NPN; a PNP followed by an NPN is a
PNP.
:::

::: callout key Look at the first transistor
To name a compound's type, look only at VT1, the one the input drives.
:::

## The β and r_be of a compound transistor

**Same types (type a).** Give the compound a base current change $\Delta i_B = \Delta i_{B1}$.
VT1's emitter current $(1+\beta_1)\Delta i_{B1}$ is VT2's base current, so

$$\Delta i_C = \beta_1 \Delta i_{B1} + \beta_2 (1+\beta_1)\Delta i_{B1} = (\beta_1 + \beta_2 + \beta_1\beta_2)\Delta i_{B1}$$

For the input resistance, the base–emitter voltage of the compound is the sum of both
transistors' $u_{BE}$s:

$$\Delta u_{BE} = \Delta i_{B1} r_{be1} + \Delta i_{B2} r_{be2} = \Delta i_{B1}\left[r_{be1} + (1+\beta_1) r_{be2}\right]$$

**Different types (type c).** VT1's *collector* current $\beta_1\Delta i_{B1}$ is VT2's base
current; the compound's collector current is VT2's emitter current:
$\Delta i_C = (1+\beta_2)\beta_1\Delta i_{B1}$. And the input sees only VT1's base–emitter
junction, since VT2's base–emitter is not in the input loop.

::: formula Compound transistor of the same type | 同类型复合管
$$\beta = \beta_1 + \beta_2 + \beta_1\beta_2 \approx \beta_1\beta_2, \qquad r_{be} = r_{be1} + (1+\beta_1)\, r_{be2}$$
--
\beta_1, \beta_2 | current gains of VT1 and VT2 | —
r_{be1}, r_{be2} | input resistances of VT1 and VT2 | Ω
:::

::: formula Compound transistor of different types | 不同类型复合管
$$\beta = \beta_1(1+\beta_2) \approx \beta_1\beta_2, \qquad r_{be} = r_{be1}$$
--
\beta_1, \beta_2 | current gains of VT1 and VT2 | —
r_{be1} | input resistance of VT1 | Ω
:::

In both cases $\beta \approx \beta_1\beta_2$. Only the input resistance differs.

::: callout pitfall r_be1 is large
In a Darlington, VT1 carries only VT2's base current, $I_{E1} = I_{B2}$, which is about
$\beta_2$ times smaller than the main current. So VT1's $r_{be1} = r_{bb'} + (1+\beta_1)U_T/I_{E1}$
is much larger than an ordinary $r_{be}$: tens of kilohms. Don't reuse the main
transistor's $r_{be}$ for VT1.
:::

::: explore A same-type compound transistor
slider b1: 20 .. 150 = 50
slider b2: 20 .. 150 = 50
slider IE2: 0.5 .. 20 = 2 | mA | log
rbe2 = 300 + (1 + b2) 26 / IE2 | Ω | r_be2
IE1 = IE2 / (1 + b2) | mA | VT1's emitter current
rbe1 = 300 + (1 + b1) 26 / IE1 | Ω | r_be1
beta = b1 + b2 + b1 b2 | | Compound β
rbe = rbe1 + (1 + b1) rbe2 | Ω | Compound r_be
:::

::: example A Darlington pair
Two NPNs with $\beta_1 = \beta_2 = 50$ and $r_{bb'} = 300$ Ω form a type (a) compound
carrying $I_{E2} = 2$ mA. Find its $\beta$ and $r_{be}$.
== Compound β ==
$\beta = 50 + 50 + 50 \times 50 = 2600$ ($\approx \beta_1\beta_2 = 2500$).
== VT2 ==
$r_{be2} = 300 + 51 \times 26/2 = 300 + 663 = 963$ Ω.
== VT1 ==
$I_{E1} = I_{B2} = 2/51 = 0.0392$ mA, so
$r_{be1} = 300 + 51 \times 26/0.0392 = 300 + 33\,800 = 34.1$ kΩ.
== Compound r_be ==
$r_{be} = 34.1 + 51 \times 0.963 = 34.1 + 49.1 = 83.2$ kΩ. A single transistor at 2 mA
would have under 1 kΩ: the compound has a far higher input resistance as well as a
far higher $\beta$.
:::

## Discussion 1: which connections form a compound transistor?

The slides show six two-terminal-plus-input connections and ask which are valid. The
arrows in the slide's picture are small, so the cases are described here in words, with
the transistor types as they appear. Check each against the rule: **does every current
have a path in the right direction?**

::: example Judging six connections
Decide whether each connection can form a compound transistor. (1) VT1's collector
drives VT2's base; VT1's emitter joins VT2's collector at the bottom terminal; VT2's
emitter is the top terminal; VT1 and VT2 of opposite types. (2) Two NPNs: VT1's
collector drives VT2's base, and the two emitters are joined at the bottom. (3) An NPN
whose emitter drives the gate of an N-channel JFET; the JFET's drain and the NPN's
collector are joined. (4) A MOSFET whose source drives an NPN's base; drain and
collector joined. (5) A PNP VT1 whose collector drives an NPN VT2's base; VT1's emitter
joins VT2's collector at the top; VT2's emitter is the bottom terminal. (6) Three NPNs,
each emitter driving the next base, collectors joined.
== (1) Valid ==
This is type (c) (or (d)): VT1's collector current is exactly the base current VT2
needs when their types are opposite. If both were the same type, VT2's emitter at the
top would need current in the wrong direction, so the types matter.
== (2) Invalid ==
An NPN's collector *takes in* current, and an NPN's base also *takes in* current. Joined
together, both want current from the node and nothing supplies it: no proper path.
== (3) Invalid ==
The NPN's emitter must send current out, but a JFET's gate is a reverse-biased junction
that takes (almost) no current. VT1's emitter current has nowhere to go.
== (4) Valid ==
The MOSFET's source current flows into the NPN's base, the direction it needs. The
result is a compound transistor controlled by a voltage at the gate, with a very high
input resistance.
== (5) Valid ==
Current enters the PNP's emitter and leaves its collector, flowing into the NPN's base:
the right direction. This is the complementary type (d), acting as a PNP (the type of
VT1), with the top terminal as its emitter.
== (6) Valid ==
A triple Darlington: each emitter current is the next base current.
$\beta \approx \beta_1\beta_2\beta_3$.
:::

## Discussion 2: the Darlington emitter follower

Use a type (a) Darlington as the transistor of an emitter follower:

::: circuit A Darlington emitter follower
A1 0,16 0,6 ui
C1 0,6 4,6 C1
R1 4,0 4,6 Rb
W 4,6 6,6
Q1 npn 6,6 T1
W 8,4 8,0
W 8,8 8,10
Q2 npn 8,10 T2
W 10,8 10,0
W 4,0 10,0
R2 10,12 10,16 Re
C2 10,12 14,12 C2
R3 14,12 14,16 RL
W 0,16 14,16
G 10,16
label +VCC 10,0
label uo 14,12
:::

Apply the $(1+\beta)$ rule twice. Looking into T2's base, the emitter load
$R_e /\!/ R_L$ looks $(1+\beta_2)$ times bigger, plus $r_{be2}$; looking into T1's base,
*that* looks $(1+\beta_1)$ times bigger, plus $r_{be1}$. For $R_o$, go the other way:
the source side $R_b /\!/ R_s$ plus $r_{be1}$ is divided by $(1+\beta_1)$ at T1's emitter,
then (plus $r_{be2}$) divided by $(1+\beta_2)$ at T2's emitter, in parallel with $R_e$:

::: formula Darlington emitter follower | 复合管射极跟随器
$$R_i = R_b /\!/ \left\{ r_{be1} + (1+\beta_1)\left[ r_{be2} + (1+\beta_2)(R_e /\!/ R_L) \right] \right\}, \qquad R_o = R_e /\!/ \frac{r_{be2} + \dfrac{r_{be1} + R_b /\!/ R_s}{1+\beta_1}}{1+\beta_2}$$
--
R_b | base bias resistor of T1 | Ω
R_s | source resistance | Ω
R_e /\!/ R_L | the emitter's AC load | Ω
:::

::: example Discussion 2 with numbers
$\beta_1 = \beta_2 = 50$, $r_{be1} = 30$ kΩ, $r_{be2} = 1$ kΩ, $R_b = 1$ MΩ,
$R_e = R_L = 2$ kΩ, $R_s = 10$ kΩ. Find $R_i$ and $R_o$.
== Input resistance ==
$R_e /\!/ R_L = 1$ kΩ. Into T2's base: $1 + 51 \times 1 = 52$ kΩ. Into T1's base:
$30 + 51 \times 52 = 2682$ kΩ. With $R_b$: $R_i = 1000 /\!/ 2682 = 728$ kΩ.
== Output resistance ==
$R_b /\!/ R_s = 1000 /\!/ 10 = 9.90$ kΩ. At T1's emitter:
$(30 + 9.90)/51 = 0.782$ kΩ. At T2's emitter: $(1 + 0.782)/51 = 34.9$ Ω.
With $R_e$: $R_o = 2000 /\!/ 34.9 = 34.3$ Ω.
== Compare ==
The single-transistor follower of lesson 2.7 had $R_i = 47$ kΩ. Here $R_i$ is limited
mainly by $R_b$ itself, and $R_o$ stays small even with a 10 kΩ source.
:::

## Combining configurations

"What does combining them bring?" asks the last slide. Each configuration has a
weakness the others don't share, so connecting two stages directly can keep the good
points of both. Two classic pairs (drawn as AC circuits, supplies and bias left out):

**Common emitter driving common base: the cascode** ({{zh 共射–共基组合}}).

::: circuit CE–CB cascode (AC path)
A1 0,12 0,8 ui
W 0,8 2,8
Q1 npn 2,8 T1
Q2 npn 2,4 T2
G 2,4
W 4,2 4,0 10,0
R1 8,0 8,12 Rc
R2 10,0 10,12 RL
W 4,10 4,12
W 0,12 10,12
G 4,12
label uo 10,0
:::

T1's collector is loaded by T2's emitter, whose input resistance is tiny:
$R_{i2} = r_{be2}/(1+\beta_2)$. So T1's own voltage gain is only about
$-\beta_1 R_{i2}/r_{be1} \approx -1$, while T2 (common base) supplies the voltage gain
$\beta_2 R_L'/r_{be2}$. Multiplying, and with $\beta_2/(1+\beta_2) \approx 1$:

$$\dot A_u \approx -\frac{\beta_1 R_L'}{r_{be1}}$$

the same as a single CE stage. The benefit: because T1's collector voltage hardly
swings, the capacitance between its collector and base barely matters, so the cascode
keeps the CE stage's gain and input resistance but has a **much wider bandwidth** (the
CB stage's virtue), and a high output resistance.

**Common collector driving common base** ({{zh 共集–共基组合}}). T1 is an emitter
follower whose emitter drives T2's emitter, and T2's base is grounded. The CC stage gives
a **high input resistance**; the CB stage gives **voltage gain** and **wide bandwidth**;
the output is **in phase** with the input. With identical transistors at the same
current, T2's input resistance $r_{be}/(1+\beta)$ makes T1's gain exactly
$\tfrac{1}{2}$, so $\dot A_u \approx \tfrac{1}{2}\beta R_L'/r_{be}$ and the input
resistance (into T1's base) is $2r_{be}$.

::: example Cascode gain
In a cascode, $\beta_1 = \beta_2 = 100$, $r_{be1} = r_{be2} = 2.6$ kΩ and
$R_L' = 2$ kΩ. Find T1's gain, T2's gain and the total.
== T1 (CE, loaded by T2's emitter) ==
$R_{i2} = 2600/101 = 25.7$ Ω, so $\dot A_{u1} = -\dfrac{100 \times 25.7}{2600} = -0.99$.
== T2 (CB) ==
$\dot A_{u2} = \dfrac{100 \times 2000}{2600} = 76.9$.
== Total ==
$\dot A_u = -0.99 \times 76.9 = -76.2$, essentially the $-\beta R_L'/r_{be} = -76.9$ of
one CE stage, with the CB stage's bandwidth.
:::

::: callout exam For the exam
Know the four types and the two rules (currents must have a path in the right
direction; the type is VT1's), both $\beta$ and $r_{be}$ formulas, and how to judge a
proposed connection. Darlington followers' $R_i$ and $R_o$ come from applying the
$(1+\beta)$ rule twice.
:::

::: cards Darlington pairs and compound stages
What is a compound transistor? :: Two transistors joined so the first's output current is the second's base current, acting as one transistor (Darlington pair).
Conditions for forming a compound transistor :: Each transistor in its amplification region; the first's output current in the same direction as the second's base current (every current has a path).
Type of a compound transistor :: The type of the first transistor, VT1.
Same-type compound: β :: $\beta = \beta_1+\beta_2+\beta_1\beta_2 \approx \beta_1\beta_2$
Same-type compound: $r_{be}$ :: $r_{be} = r_{be1} + (1+\beta_1)r_{be2}$
Different-type compound: β :: $\beta = \beta_1(1+\beta_2) \approx \beta_1\beta_2$
Different-type compound: $r_{be}$ :: $r_{be} = r_{be1}$
NPN driving a PNP acts as … :: An NPN.
Why is $r_{be1}$ large in a Darlington? :: VT1 carries only VT2's base current, so its $I_{E1}$ is small.
Cascode (CE–CB) brings … :: The CE stage's gain with a much wider bandwidth (and high $R_o$).
CC–CB combination brings … :: High input resistance, voltage gain, wide bandwidth, output in phase.
:::

::: quiz Darlington pairs and compound stages
? Two NPN transistors with $\beta_1 = 40$, $\beta_2 = 60$ form a type (a) compound. What is its exact $\beta$?
answer: 2500
tolerance: 0.5%
> $\beta = 40 + 60 + 40 \times 60 = 2500$.

? An NPN VT1 ($\beta_1 = 40$) drives a PNP VT2 ($\beta_2 = 60$). What is the compound's $\beta$?
answer: 2440
tolerance: 0.5%
> Different types: $\beta = \beta_1(1+\beta_2) = 40 \times 61 = 2440$.

? What type is the compound in the last question?
- [x] NPN
- [ ] PNP
> The type is the first transistor's: NPN.

? Same-type compound: $r_{be1} = 20$ kΩ, $r_{be2} = 1$ kΩ, $\beta_1 = 50$. Find $r_{be}$.
answer: 71 kΩ
tolerance: 1%
> $r_{be} = 20 + 51 \times 1 = 71$ kΩ.

? Different-type compound with $r_{be1} = 5$ kΩ, $r_{be2} = 1$ kΩ. What is its $r_{be}$?
answer: 5 kΩ
tolerance: 1%
> For different types $r_{be} = r_{be1}$: VT2's base–emitter junction isn't in the input
> loop.

? Write the same-type compound's exact $\beta$ in terms of $a$ ($\beta_1$) and $b$ ($\beta_2$).
expression: a + b + a b
variables: a, b
> $\Delta i_C = \beta_1\Delta i_{B1} + \beta_2(1+\beta_1)\Delta i_{B1}$, so
> $\beta = \beta_1 + \beta_2 + \beta_1\beta_2$.

? Two NPNs: VT1's collector feeds VT2's base and their emitters are joined. Can they form a compound transistor?
- [ ] Yes
- [x] No
> Both VT1's collector and VT2's base need current flowing *in*; nothing supplies the
> node, so VT2's base current has no proper path.

? A Darlington follower has $r_{be1} = 40$ kΩ, $r_{be2} = 1$ kΩ, $\beta_1 = \beta_2 = 50$, $R_e /\!/ R_L = 0.5$ kΩ, and $R_b$ very large. Find $R_i$.
answer: 1391.5 kΩ
tolerance: 1%
> Into T2's base: $r_{be2} + (1+\beta_2)(R_e /\!/ R_L) = 1 + 51 \times 0.5 = 26.5$ kΩ.
> Into T1's base: $40 + 51 \times 26.5 = 40 + 1351.5 = 1391.5$ kΩ, about 1.4 MΩ.

? What is the main benefit of the CE–CB cascode over a single CE stage?
- [x] A much wider bandwidth with about the same voltage gain
- [ ] A voltage gain of $\beta^2$
- [ ] An output in phase with the input
> T1's gain is about −1, so its collector barely swings and its collector–base
> capacitance hardly matters; the CB stage provides the gain.
:::

---
title: Characteristics and parameters
zh: 特性曲线与主要参数
summary: The BJT's input and output curves, its three regions and how to tell which one it is in, the DC, AC and limit parameters, temperature effects and part numbers.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

The last lesson explained *why* $I_C \approx \beta I_B$. Real transistors only obey
that rule in part of their range, and the honest description of what they do is a set
of graphs: the characteristic curves. They are what the graphical method of lesson 2.4
draws load lines on, and they show at a glance the three regions a transistor can be
in. Being able to say "this transistor is saturated" from a few voltages is one of the
most-tested skills of the chapter. The lesson then lists the numbers on a datasheet
(gains, frequencies, limits) and how temperature moves all of them.

## Measuring the curves

We describe the transistor in the common-emitter connection: the emitter is common,
the base–emitter pair is the input port and the collector–emitter pair is the output
port. The circuit below sets the base current with $R_b$ and the collector voltage
with $V_{CC}$ and $R_c$; with variable supplies we can sweep both.

::: circuit Measuring the common-emitter curves
R1 4,0 4,6 Rb
R2 8,0 8,4 Rc
Q1 npn 6,6
W 4,6 6,6
W 4,0 8,0
W 8,8 8,10
W 0,10 10,10
W 0,6 4,6
W 8,4 10,4
G 8,10
label +VCC 8,0
label uBE 0,6
label uCE 10,4
:::

Two families of curves describe the transistor:

::: define Input characteristic | 输入特性曲线
The curve $i_B = f(u_{BE})$ at a constant $u_{CE}$: how the base current depends on
the base–emitter voltage.
:::

::: define Output characteristic | 输出特性曲线
The family of curves $i_C = f(u_{CE})$, each at a constant $i_B$: how the collector
current depends on the collector–emitter voltage, with the base current as the
parameter ({{zh 参变量}}).
:::

## The input characteristic

The base–emitter junction is a PN junction, so the input curve looks like a diode's
(Unit 1): nothing flows until $u_{BE}$ passes the {{term threshold voltage | 开启电压}}
$U_{th}$ (about 0.5 V for silicon), then $i_B$ rises exponentially. Once a silicon
transistor conducts, $u_{BE}$ sits close to **0.7 V** whatever the current, which is
why we take $U_{BE} = 0.7$ V in every calculation (0.2–0.3 V for germanium).

The curve depends a little on $u_{CE}$:

1. At $U_{CE} = 0$ V the collector junction is forward-biased too, and the curve is
   just the diode curve of two junctions in parallel.
2. As $U_{CE}$ rises, the collector starts collecting electrons from the base, fewer
   of them recombine there, so a larger $u_{BE}$ is needed for the same $i_B$: the
   curve **moves right**.
3. Beyond $U_{CE} \approx 1$ V the collector already collects almost everything, and
   the curve barely moves again. The $U_{CE} \ge 1$ V curve stands for all of them.

::: plot Input characteristic (silicon NPN)
x: 0 .. 0.9
y: 0 .. 100
xlabel: uBE (V)
ylabel: iB (μA)
UCE0(u) = 40 exp((u - 0.68) / 0.026)
UCE1(u) = 40 exp((u - 0.68 - s) / 0.026)
slider s: 0 .. 0.08 = 0.04 | V
:::

The curve labelled UCE1 is the $U_{CE} \ge 1$ V curve; the slider sets how far it sits
to the right of the $U_{CE} = 0$ curve (UCE0).

## The output characteristic

Fix the base current, raise $u_{CE}$ from zero and watch $i_C$:

- At $U_{CE} = 0$ the collector does no collecting, so $I_C = 0$.
- For small $U_{CE}$ (a few tenths of a volt) $I_C$ climbs steeply with $U_{CE}$: the
  collector junction is not yet reverse-biased enough to catch every electron.
- Once the collector junction is properly reverse-biased, more $U_{CE}$ adds almost
  nothing: $I_C$ levels off at $\beta I_B$, and the curve runs nearly flat.

Repeating this for several base currents gives a family of curves, one per $I_B$,
evenly spaced because $I_C = \beta I_B$. The curve for $I_B = 0$ is not on the axis:
it sits at the punch-through current $I_{CEO}$.

::: plot Output characteristics: IB = 20, 40, 60, 80 μA
x: 0 .. 12
y: 0 .. 4
xlabel: uCE (V)
ylabel: iC (mA)
i20(u) = 0.02 b (1 - exp(-u / 0.25)) (1 + u / 100)
i40(u) = 0.04 b (1 - exp(-u / 0.25)) (1 + u / 100)
i60(u) = 0.06 b (1 - exp(-u / 0.25)) (1 + u / 100)
i80(u) = 0.08 b (1 - exp(-u / 0.25)) (1 + u / 100)
slider b: 10 .. 45 = 35
:::

Change $\beta$ (slider b) and the curves spread apart or bunch together; their slight
upward slope is the small effect of $u_{CE}$ on $i_C$ (it becomes the output resistance
$r_{ce}$ in lesson 2.6).

## The three regions

The output curves divide into three regions, and each matches a combination of the two
junctions' biases:

| Region | Where on the curves | Emitter junction | Collector junction | Behaviour |
| --- | --- | --- | --- | --- |
| Cutoff {{zh 截止区}} | below the $I_B = 0$ curve | reverse (or below $U_{th}$) | reverse | $i_C \approx 0$: an open switch |
| Amplification {{zh 放大区}} | the flat, evenly spaced part | forward | reverse | $i_C = \beta i_B$: a controlled source |
| Saturation {{zh 饱和区}} | the steep part near the $i_C$ axis | forward | forward (or barely reverse) | $u_{CE}$ small, $i_C < \beta i_B$: a closed switch |

::: define Amplification region | 放大区
The part of the output characteristics where the curves are flat, parallel and evenly
spaced. The emitter junction is forward-biased and the collector junction
reverse-biased, and $i_C = \beta i_B$, controlled by the base current alone. Also called
the active region.
:::

::: define Saturation region | 饱和区
The part of the output characteristics near the vertical axis, where $u_{CE}$ is small
(below about 0.7 V for silicon) and $i_C$ is controlled by $u_{CE}$, not by $i_B$. Both
junctions are forward-biased (or the collector junction only slightly reverse-biased),
and $i_C < \beta i_B$.
:::

::: define Cutoff region | 截止区
The part of the output characteristics below the $I_B = 0$ curve, where
$i_C \approx 0$. Both junctions are reverse-biased (for silicon, $u_{BE}$ below the
threshold is enough in practice).
:::

::: define Saturation voltage | 饱和压降
$U_{CES}$: the collector–emitter voltage of a saturated transistor, about 0.3 V for a
small silicon transistor (often taken as 0 in rough work).
:::

On the edge between amplification and saturation $u_{CE} = u_{BE}$, so the collector
junction has zero bias. This boundary is called {{term critical saturation | 临界饱和}}.

### How to tell which region a transistor is in

There are two good methods, depending on what you are given.

**From the electrode voltages** (NPN; reverse every inequality for a PNP):

1. If $U_{BE} < U_{th}$ (silicon: below about 0.5 V), it is **cut off**.
2. Otherwise compare the collector with the base: $U_C > U_B$ (collector junction
   reversed, $U_{CE} > U_{BE}$) means **amplification**; $U_C < U_B$ (collector junction
   forward, $U_{CE}$ only a few tenths of a volt) means **saturation**.

**From a circuit**: assume it is in the amplification region, work out $I_B$, then
$I_C = \beta I_B$, then $U_{CE}$. If $U_{CE}$ comes out sensible (above about 0.7 V), the
assumption holds. If it comes out below $U_{CES}$, or negative, the transistor is
**saturated**: the collector circuit cannot supply $\beta I_B$, and the real $I_C$ is
limited by the external resistors.

::: example Is it amplifying or saturated?
An NPN silicon transistor with $\beta = 100$ has $R_b$ from $+V_{CC}$ to its base and
$R_c$ from $+V_{CC}$ to its collector; the emitter is grounded. $V_{CC} = 12$ V,
$R_c = 3$ kΩ. Which region is it in when (a) $R_b = 1$ MΩ, (b) $R_b = 100$ kΩ?
== (a) Assume amplification ==
$I_B = (12 - 0.7)/1000\text{ k}\Omega = 11.3\ \mu$A, $I_C = 100 \times 11.3\ \mu\text{A} = 1.13$ mA,
$U_{CE} = 12 - 1.13 \times 3 = 8.61$ V. That's well above 0.7 V, so it is in the
**amplification region**. ✓
== (b) Assume amplification ==
$I_B = 11.3/100 = 113\ \mu$A, so $I_C$ "would be" 11.3 mA and
$U_{CE} = 12 - 11.3 \times 3 = -21.9$ V. Impossible: the transistor is **saturated**.
== (b) The real collector current ==
In saturation $U_{CE} = U_{CES} \approx 0.3$ V, so
$I_C = (12 - 0.3)/3 = 3.9$ mA, far below $\beta I_B = 11.3$ mA. The base is overdriven.
:::

::: example Pins and type from measured voltages (in-class question)
Three transistors in working amplifiers (all silicon, all in the amplification region)
have these pin voltages. Identify each pin and say whether it is NPN or PNP.
(1) 12 V, 11.3 V, 0 V. (2) 12 V, 3.7 V, 3 V. (3) 12 V, 12.7 V, 15 V.
== The method ==
In the amplification region $|U_{BE}| \approx 0.7$ V, so the **two pins 0.7 V apart are
the base and emitter**, and the third pin is the collector. The collector is at the
extreme: the **highest** voltage for an NPN ($U_C > U_B > U_E$), the **lowest** for a
PNP ($U_C < U_B < U_E$). The base is the middle voltage of the three.
== Transistor 1 ==
12 V and 11.3 V differ by 0.7 V; the collector is 0 V, the lowest, so it is a **PNP**:
emitter 12 V, base 11.3 V, collector 0 V.
== Transistor 2 ==
3.7 V and 3 V differ by 0.7 V; the collector is 12 V, the highest, so it is an
**NPN**: base 3.7 V, emitter 3 V, collector 12 V.
== Transistor 3 ==
12.7 V and 12 V differ by 0.7 V; the collector is 15 V, the highest, so it is an
**NPN**: base 12.7 V, emitter 12 V, collector 15 V.
:::

::: callout exam For the exam
"Measured pin voltages → pins, type and material" is a standard question: a 0.7 V gap
means silicon, 0.2–0.3 V germanium. "Measured voltages → region" is its twin. Both come
straight from the bias table above.
:::

## The main parameters

Datasheets describe a transistor with three groups of numbers: **DC parameters**,
**AC parameters** and **limit parameters** ({{zh 直流参数、交流参数、极限参数}}).

### DC parameters

The DC current gains, read at a working point Q on the output curves:

$$\overline{\beta} = \frac{I_{CQ} - I_{CEO}}{I_{BQ}} \approx \frac{I_{CQ}}{I_{BQ}}\Bigg|_{u_{CE} = \text{const}}, \qquad \overline{\alpha} = \frac{I_{CQ} - I_{CBO}}{I_{EQ}} \approx \frac{I_{CQ}}{I_{EQ}}$$

::: callout note A slip on the slide
The slide writes $\overline{\alpha} = (I_{CQ} - I_{CEO})/I_{EQ}$. From
$I_C = \overline{\alpha} I_E + I_{CBO}$ (lesson 2.1) the leakage to subtract is
$I_{CBO}$, not $I_{CEO}$. Both are tiny, so the approximation
$\overline{\alpha} \approx I_{CQ}/I_{EQ}$ is unaffected.
:::

And the two leakage currents between electrodes ({{zh 极间反向电流}}) from lesson 2.1:
$I_{CBO}$ (collector junction, emitter open) and $I_{CEO} = (1+\overline{\beta})I_{CBO}$
(collector to emitter, base open). Smaller is better: they are the part of $I_C$ the
base doesn't control, and they grow fast with temperature.

### AC parameters

For signals we care about *changes*: how much $i_C$ moves when $i_B$ moves.

::: define AC current gain | 交流电流放大系数
The common-emitter AC current gain
$\beta = \Delta i_C / \Delta i_B$ at constant $u_{CE}$, and the common-base one
$\alpha = \Delta i_C / \Delta i_E$ at constant $u_{CB}$. When the leakage currents are
small, $\beta \approx \overline{\beta}$ and $\alpha \approx \overline{\alpha}$, and we stop
distinguishing them.
:::

::: formula AC current gain | 交流电流放大系数
$$\beta = \frac{\Delta i_C}{\Delta i_B}\Bigg|_{u_{CE} = \text{const}}, \qquad \alpha = \frac{\Delta i_C}{\Delta i_E}\Bigg|_{u_{CB} = \text{const}}$$
--
\beta | common-emitter AC current gain | —
\alpha | common-base AC current gain | —
\Delta i_C | change in collector current | A
\Delta i_B | change in base current | A
:::

To read $\beta$ off the curves, draw a vertical line (constant $u_{CE}$) through Q and
compare two curves on it.

::: example β from the output curves
On the slide's output characteristics, a vertical line at $U_{CE} \approx 5$ V meets the
$I_B = 20\ \mu$A curve at $I_C \approx 0.8$ mA and the $I_B = 40\ \mu$A curve (where Q
is) at $I_C \approx 1.6$ mA. Find $\beta$ and $\overline{\beta}$ at Q.
== AC gain ==
$\beta = \dfrac{\Delta I_C}{\Delta I_B} = \dfrac{1.6 - 0.8\text{ mA}}{40 - 20\ \mu\text{A}} = \dfrac{0.8\text{ mA}}{20\ \mu\text{A}} = 40$.
== DC gain ==
$\overline{\beta} \approx I_{CQ}/I_{BQ} = 1.6\text{ mA}/40\ \mu\text{A} = 40$. With evenly
spaced curves the two agree, as expected.
:::

$\beta$ also falls at high frequency, because the junction capacitances
({{zh 结电容}}) start to short out the signal. Three frequencies describe how fast:

::: define Transition frequency | 特征频率
$f_T$: the frequency at which the common-emitter current gain $\beta$ has fallen to 1.
Above it the transistor no longer amplifies current at all.
:::

::: define Common-emitter cutoff frequency | 共射截止频率
$f_\beta$: the frequency at which $\beta$ has fallen to $\beta_0/\sqrt{2}$ (about
$0.7\beta_0$), where $\beta_0$ is its low-frequency value.
:::

::: define Common-base cutoff frequency | 共基截止频率
$f_\alpha$: the frequency at which $\alpha$ has fallen to $\alpha_0/\sqrt{2}$, where
$\alpha_0$ is its low-frequency value.
:::

::: formula Transistor frequency parameters | 频率参数的关系
$$f_\alpha \approx f_T = \beta_0 f_\beta$$
--
f_T | transition frequency ($\beta = 1$) | Hz
f_\beta | common-emitter cutoff frequency | Hz
f_\alpha | common-base cutoff frequency | Hz
\beta_0 | low-frequency common-emitter current gain | —
:::

So $f_\beta$ is much lower than $f_T$, and the common-base connection keeps working up
to a frequency about $\beta_0$ times higher: one reason CB amplifiers have the widest
bandwidth (lesson 2.7).

### Limit parameters

Limits are values a transistor must never exceed.

::: define Maximum collector current | 集电极最大允许电流
$I_{CM}$: the collector current at which $\beta$ has dropped noticeably. Above it the
transistor is a poor amplifier (and eventually damaged).
:::

::: define Maximum collector dissipation | 集电极最大允许功率损耗
$P_{CM}$: the largest power the collector junction may dissipate,
$p_C = i_C u_{CE} \le P_{CM}$. Exceeding it overheats the junction.
:::

::: define Reverse breakdown voltages | 反向击穿电压
The largest reverse voltages between pairs of electrodes. $U_{(BR)CBO}$: collector–base,
emitter open. $U_{(BR)EBO}$: emitter–base, collector open. $U_{(BR)CEO}$:
collector–emitter, base open. $U_{(BR)CER}$ and $U_{(BR)CES}$: collector–emitter with a
resistor (R) or a short (S) between base and emitter. BR stands for breakdown; "O"
means the third electrode is open.
:::

They are measured by raising a variable supply, through a current-limiting resistor
({{zh 限流电阻}}), across the two electrodes under test until the current suddenly
rises. Their sizes always come in the same order:

$$U_{(BR)CBO} \approx U_{(BR)CES} > U_{(BR)CER} > U_{(BR)CEO} > U_{(BR)EBO}$$

The more the base–emitter junction is kept from being driven by leakage (short >
resistor > open), the higher the collector can go. $U_{(BR)CEO}$ is the smallest of
the collector ratings because, with the base open, the leakage is amplified $(1+\beta)$
times. The emitter–base junction, heavily doped, breaks down at just a few volts.

Together, $I_{CM}$, $P_{CM}$ and $U_{(BR)CEO}$ fence off the
{{term safe operating area | 安全工作区}} on the output characteristics:

- the **over-current region** above $i_C = I_{CM}$;
- the **over-dissipation region** beyond the hyperbola $i_C u_{CE} = P_{CM}$;
- the **over-voltage (breakdown) region** to the right of $u_{CE} = U_{(BR)CEO}$.

The safe operating area is what remains inside all three boundaries.

::: formula Collector dissipation | 集电极耗散功率
$$p_C = i_C\,u_{CE} \le P_{CM}$$
--
p_C | power dissipated at the collector junction | W
P_{CM} | maximum allowed collector dissipation | W
:::

::: plot Safe operating area: the PCM hyperbola and the ICM line
x: 0.5 .. 40
y: 0 .. 60
xlabel: uCE (V)
ylabel: iC (mA)
PCM(u) = P / u
ICM(u) = I
slider P: 50 .. 500 = 150 | mW
slider I: 10 .. 50 = 30 | mA
:::

With $P$ in mW and $u_{CE}$ in V, $P/u$ is in mA. A working point must sit below
both curves (and left of $U_{(BR)CEO}$, which this plot can't draw as a vertical line).

::: example Checking a working point
A transistor has $P_{CM} = 150$ mW, $I_{CM} = 30$ mA and $U_{(BR)CEO} = 30$ V. Is it
safe at (a) $U_{CE} = 10$ V, $I_C = 12$ mA; (b) $U_{CE} = 5$ V, $I_C = 25$ mA?
== (a) ==
$p_C = 10 \times 12 = 120$ mW $< 150$ mW, $I_C < 30$ mA, $U_{CE} < 30$ V: **safe**.
== (b) ==
$p_C = 5 \times 25 = 125$ mW $< 150$ mW and $I_C = 25 < 30$ mA: also **safe**, but only
just inside the current limit.
:::

## Temperature effects

Transistors are very sensitive to temperature, and every effect pushes $I_C$ the same
way: **up**.

1. **$I_{CBO}$ doubles for every 10 ℃ rise.** Heat creates more electron–hole pairs
   (intrinsic excitation), so the drift current across the reverse-biased collector
   junction grows.
2. **The input curve moves left:** $|u_{BE}|$ falls by about 2–2.5 mV per ℃ for the
   same $i_B$, so a fixed bias voltage drives more base current.
3. **The output curves move up and spread apart:** $I_{CEO}$ grows, $\beta$ grows, and
   with them $I_C$.

::: formula Temperature drift of a BJT | 晶体管的温度特性
$$I_{CBO}(T) = I_{CBO}(T_0)\cdot 2^{(T - T_0)/10\,℃}, \qquad \Delta U_{BE} \approx -(2 \sim 2.5)\ \text{mV/℃} \times \Delta T$$
--
T_0 | reference temperature | ℃
I_{CBO} | collector–base reverse saturation current | A
\Delta U_{BE} | change in the base–emitter voltage at constant $i_B$ | V
:::

::: example A hot transistor
At 25 ℃ a silicon transistor has $I_{CBO} = 0.1\ \mu$A and $U_{BE} = 0.70$ V. Estimate
both at 55 ℃ (take −2 mV/℃).
== Leakage ==
30 ℃ is three doublings: $I_{CBO} = 0.1 \times 2^3 = 0.8\ \mu$A.
== Base–emitter voltage ==
$U_{BE} = 0.70 - 0.002 \times 30 = 0.64$ V for the same base current.
:::

This is why an amplifier's working point drifts as it warms up, and why lesson 2.7
spends a section on circuits that hold it still.

## Type numbers and packages

Chinese part numbers follow the national standard. Take **3DG110B**:

| Part | Meaning |
| --- | --- |
| 3 | a triode (three-electrode device): a transistor |
| D | material and type: A germanium PNP, B germanium NPN, C silicon PNP, **D silicon NPN** |
| G | kind: X low-frequency low-power, D low-frequency high-power, **G high-frequency low-power**, A high-frequency high-power, K switching |
| 110 | serial number of the design |
| B | grade within that type |

So the 3DG110B is a high-frequency, low-power silicon NPN transistor. Some types from
the slides, with their limits:

| Type | $P_{CM}$ | $I_{CM}$ | $U_{(BR)CBO}$ | $U_{(BR)CEO}$ | $I_{CBO}$ | $f_T$ (MHz) |
| --- | --- | --- | --- | --- | --- | --- |
| 3AX31D | 125 mW | 125 mA | 20 V | 12 V | ≤ 6 μA | ≥ 8 * |
| 3DG123C | 500 mW | 50 mA | 40 V | 30 V | 0.35 μA | — |
| 3DD101D | 50 W | 5 A | 300 V | 250 V | < 2 mA | — |
| 3DK100B | 100 W | 30 A | 25 V | 15 V | ≤ 0.1 μA | 300 |

The starred entry is the 3AX31D's $f_\beta$, not its $f_T$ (the slide marks it so).
Notice how the high-power types (D, K) trade breakdown voltage,
leakage and speed against current and power.

Small and medium transistors come in round **metal cans** ({{zh 金属圆壳封装}}) or
small **plastic packages** ({{zh 塑封}}), the larger ones with a metal tab and a hole
for a heat sink. High-power transistors come in big metal cases (TO-3 style, with two
mounting holes), stud-mounted cases with a threaded bolt, or multi-terminal modules, all
designed to be bolted to a heat sink so they can reach their $P_{CM}$.

::: cards Characteristics and parameters
Input characteristic :: $i_B = f(u_{BE})$ at constant $u_{CE}$: a diode-like exponential curve.
Output characteristic :: $i_C = f(u_{CE})$ at constant $i_B$: a family of curves, one per base current.
Why does the input curve move right as $U_{CE}$ rises? :: The collector collects more electrons, fewer recombine in the base, so more $u_{BE}$ is needed for the same $i_B$. Beyond about 1 V it hardly moves.
Amplification region: junction biases :: Emitter junction forward, collector junction reverse; $i_C = \beta i_B$.
Saturation region: junction biases :: Both junctions forward (or collector barely reverse); $u_{CE}$ small, $i_C < \beta i_B$.
Cutoff region: junction biases :: Both junctions reverse; $i_C \approx 0$.
NPN in amplification: order of the pin voltages :: $U_C > U_B > U_E$ (PNP: $U_C < U_B < U_E$).
$f_T$ :: The frequency where $\beta$ falls to 1; $f_T \approx \beta_0 f_\beta \approx f_\alpha$.
$f_\beta$ :: The frequency where $\beta$ falls to $\beta_0/\sqrt{2}$.
The three limit parameters that bound the safe operating area :: $I_{CM}$, $P_{CM}$ and $U_{(BR)CEO}$.
Order of the breakdown voltages :: $U_{(BR)CBO} \approx U_{(BR)CES} > U_{(BR)CER} > U_{(BR)CEO} > U_{(BR)EBO}$
Temperature: $I_{CBO}$ :: Doubles for every 10 ℃ rise.
Temperature: $U_{BE}$ :: Falls by about 2–2.5 mV per ℃.
3DG: material and kind :: Silicon NPN, high-frequency low-power.
:::

::: quiz Characteristics and parameters
? An NPN silicon transistor measures $U_B = 2.7$ V, $U_E = 2.0$ V, $U_C = 2.3$ V. Which region is it in?
- [x] Saturation
- [ ] Amplification
- [ ] Cutoff
> $U_{BE} = 0.7$ V, so it conducts. But $U_C = 2.3$ V is *below* $U_B = 2.7$ V: the
> collector junction is forward-biased. Both junctions forward means saturation
> ($U_{CE} = 0.3$ V, a typical $U_{CES}$).

? An NPN transistor measures $U_B = 0$ V, $U_E = 0$ V, $U_C = 12$ V. Which region?
- [x] Cutoff
- [ ] Amplification
- [ ] Saturation
> $U_{BE} = 0$ is below the threshold, so no base current flows and $i_C \approx 0$:
> the whole supply appears across the transistor.

? Three pins of a working transistor measure 6 V, 5.8 V and 1 V. What material and type is it?
- [x] Germanium PNP
- [ ] Silicon PNP
- [ ] Germanium NPN
- [ ] Silicon NPN
> 6 V and 5.8 V differ by 0.2 V: germanium, base and emitter. The third pin (collector)
> at 1 V is the lowest, so it's a PNP (emitter 6 V, base 5.8 V).

? In the fixed-bias circuit of the worked example ($V_{CC} = 12$ V, $R_c = 3$ kΩ, $\beta = 100$), what is the largest $R_b$ that just saturates the transistor? Take $U_{CES} = 0$.
answer: 283 kΩ
tolerance: 2%
> At the edge of saturation the collector current is $I_C = 12/3 = 4$ mA, which needs
> $I_B = 4\text{ mA}/100 = 40\ \mu$A. So $R_b = (12 - 0.7)/40\ \mu\text{A} = 282.5$ kΩ:
> any $R_b$ smaller than about 283 kΩ saturates the transistor.

? On the output curves, $I_B$ goes from 30 μA to 50 μA and $I_C$ from 1.8 mA to 3.0 mA at constant $U_{CE}$. What is $\beta$?
answer: 60
tolerance: 1%
> $\beta = \Delta I_C/\Delta I_B = 1.2\text{ mA}/20\ \mu\text{A} = 60$.

? A transistor has $\beta_0 = 100$ and $f_\beta = 2$ MHz. Estimate $f_T$.
answer: 200 MHz
tolerance: 1%
> $f_T \approx \beta_0 f_\beta = 100 \times 2\text{ MHz} = 200$ MHz.

? Which breakdown voltage is the largest?
- [x] $U_{(BR)CBO}$
- [ ] $U_{(BR)CEO}$
- [ ] $U_{(BR)CER}$
- [ ] $U_{(BR)EBO}$
> The order is $U_{(BR)CBO} \approx U_{(BR)CES} > U_{(BR)CER} > U_{(BR)CEO} > U_{(BR)EBO}$.

? $I_{CBO}$ is 0.5 μA at 20 ℃. Estimate it at 50 ℃.
answer: 4 μA
tolerance: 1%
> 30 ℃ is three doublings: $0.5 \times 2^3 = 4\ \mu$A.

? What happens to the output characteristics when the temperature rises?
- [x] They move up and spread apart
- [ ] They move down and bunch together
- [ ] They don't change; only the input curve moves
> $I_{CEO}$ and $\beta$ both increase with temperature, so every curve rises and the
> gaps between them grow.
:::

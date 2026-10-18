---
title: CE, CC and CB compared
zh: 三种基本组态
summary: How the emitter resistor stabilises the Q point and what the bypass capacitor does to the gain, then the common-collector (emitter follower) and common-base amplifiers, and a comparison of all three configurations.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

Lesson 2.1 named three ways to connect a transistor: common emitter, common collector
and common base. So far we've only built the first. This lesson finishes the common
emitter by answering two questions the divider-bias circuit raised (why the emitter
resistor is there, and what the bypass capacitor does), then builds the other two. Each
configuration has its own personality: the CE amplifies voltage and current, the CC
(emitter follower) has a gain of about 1 but a huge input and tiny output resistance,
and the CB amplifies voltage with a tiny input resistance and the widest bandwidth.
Knowing which to use where, from the comparison table at the end, is a classic exam
question.

## The divider-bias CE amplifier, revisited

### Why its Q point stays put

Transistors drift with temperature (lesson 2.2): $I_{CBO}$, $\beta$ and the slope of the
input curve all push $I_C$ **up** as the transistor warms. In a fixed-bias amplifier,
$I_{BQ} = (V_{CC} - U_{BE})/R_b$ is fixed, so $I_{CQ} = \beta I_{BQ}$ follows every change
in $\beta$: Q wanders, and a Q point that drifts towards saturation or cutoff distorts
the output.

The divider-bias circuit fights back, provided the divider current is much larger than
the base current ($I_{R_{b1}} \gg I_{BQ}$). Then the base current hardly loads the
divider, and the base voltage is pinned by the resistors alone:

$$U_B \approx \frac{R_{b2}}{R_{b1}+R_{b2}}V_{CC}$$

Now follow a temperature rise:

$$T\uparrow \;\to\; I_C\uparrow \;\to\; I_E\uparrow \;\to\; U_E = I_E R_e\uparrow \;(U_B \text{ fixed}) \;\to\; U_{BE} = U_B - U_E\downarrow \;\to\; I_B\downarrow \;\to\; I_C\downarrow$$

The rise in $I_C$ raises the emitter voltage, which squeezes $U_{BE}$, which cuts the
base current, which pulls $I_C$ back down. The output (here $I_C$) is fed back to oppose
its own change: **negative feedback** ({{zh 负反馈}}), acting on DC.

::: law Q-point stabilisation by the emitter resistor | 分压偏置电路稳定Q点的原理
In the divider-bias circuit, with the divider current much larger than the base current,
the base voltage is fixed by $R_{b1}$ and $R_{b2}$. The emitter resistor $R_e$ then
provides **DC negative feedback**: any rise in $I_C$ raises $U_E$, lowers $U_{BE}$ and so
reduces $I_B$, pulling $I_C$ back. This keeps the Q point stable.
:::

Another way to see it: from the estimate method (lesson 2.6),
$I_{EQ} \approx (U_B - U_{BE})/R_e$, and **$\beta$ doesn't appear**. Change the
transistor and $I_{CQ}$ hardly moves.

::: example Swapping in a transistor with a higher β
In Example 3.5.1 ($V_{CC} = 15$ V, $R_{b1} = 60$ kΩ, $R_{b2} = 20$ kΩ, $R_e = 2$ kΩ),
$\beta = 60$ gives $I_{CQ} = 1.34$ mA. The transistor is replaced by one with
$\beta = 100$. Compare with a fixed-bias circuit set up for the same 1.34 mA at
$\beta = 60$ (so $I_{BQ} = 22.3\ \mu$A).
== Divider bias ==
$I_{BQ} = \dfrac{3.75 - 0.7}{15 + 101 \times 2} = \dfrac{3.05}{217\text{ k}} = 14.1\ \mu$A,
$I_{CQ} = 100 \times 14.1 = 1.41$ mA: up only **5%**.
== Fixed bias ==
$I_{BQ}$ stays 22.3 μA, so $I_{CQ} = 100 \times 22.3 = 2.23$ mA: up **67%**, enough to
push a well-centred Q point towards saturation.
:::

::: callout key Re is DC negative feedback
$R_e$ stabilises the Q point. The price is paid at AC, unless $C_e$ removes it there,
which is the next section.
:::

### What the bypass capacitor does

$C_e$ is a large electrolytic capacitor across $R_e$. To DC it is open, so it doesn't
touch the Q point. To the signal it is a short, so $R_e$ vanishes from the AC path and
the emitter is at AC ground: that's the circuit whose gain we found in lesson 2.6,
$\dot A_u = -\beta R_L'/r_{be}$.

Remove $C_e$ and $R_e$ stays in the AC path, between the emitter and ground. Now the
emitter current $\dot I_e = (1+\beta)\dot I_b$ flows through it:

$$\dot U_i = \dot I_b r_{be} + \dot I_e R_e = \dot I_b\left[r_{be} + (1+\beta)R_e\right], \qquad \dot U_o = -\beta\dot I_b R_L'$$

::: formula CE gain and input resistance with an unbypassed Re | 去掉Ce后的电压放大倍数
$$\dot A_u = -\frac{\beta R_L'}{r_{be} + (1+\beta)R_e}, \qquad R_i = R_{b1} /\!/ R_{b2} /\!/ \left[r_{be} + (1+\beta)R_e\right]$$
--
R_e | emitter resistor left in the AC path (no $C_e$) | Ω
R_L' | $R_c /\!/ R_L$ | Ω
:::

The $(1+\beta)$ again: a resistor in the emitter looks $(1+\beta)$ times larger from the
base. Since $(1+\beta)R_e$ is usually far bigger than $r_{be}$,
$\dot A_u \approx -R_L'/R_e$: small, but now almost independent of $\beta$. The input
resistance rises a lot. $R_o$ is still $R_c$.

::: example Example 3.5.1 without Ce
In Example 3.5.1 ($\beta = 60$, $r_{be} = 1.5$ kΩ, $R_L' = 1.5$ kΩ, $R_e = 2$ kΩ,
$R_{b1} /\!/ R_{b2} = 15$ kΩ), $C_e$ is removed. Find $\dot A_u$ and $R_i$.
== Gain ==
$\dot A_u = -\dfrac{60 \times 1.5}{1.5 + 61 \times 2} = -\dfrac{90}{123.5} = -0.73$.
From −60 down to below 1 in size: the stage no longer amplifies voltage at all.
== Input resistance ==
$R_i = 15 /\!/ (1.5 + 122) = 15 /\!/ 123.5 = 13.4$ kΩ, ten times what it was
(1.36 kΩ).
:::

So for the signal, $C_e$'s job is to **keep the gain high** while $R_e$ keeps the bias
steady.

## The common-collector amplifier (emitter follower)

Take the signal out of the **emitter** instead of the collector, and connect the
collector straight to $V_{CC}$:

::: circuit The common-collector amplifier
A1 0,12 0,6 ui
C1 0,6 4,6 C1
R1 4,0 4,6 Rb
W 4,6 6,6
Q1 npn 6,6 VT
W 8,4 8,0
W 4,0 8,0
R2 8,8 8,12 Re
C2 8,8 12,8 C2
R3 12,8 12,12 RL
W 0,12 12,12
G 8,12
label +VCC 8,0
label uo 12,8
:::

For the signal, $V_{CC}$ is ground, so the collector is common to the input (base to
ground) and output (emitter to ground): a {{term common-collector amplifier | 共集放大电路}}.
Because its output follows its input, it is also called an
{{term emitter follower | 射极跟随器}} or emitter output stage ({{zh 射极输出器}}).

### Static analysis

Open the capacitors. The base loop is $V_{CC} \to R_b \to$ base–emitter $\to R_e \to$
ground, with $I_E = (1+\beta)I_B$ in $R_e$:

::: formula Q point of the common-collector amplifier | 共集放大电路的静态工作点
$$I_{BQ} = \frac{V_{CC} - U_{BEQ}}{R_b + (1+\beta)R_e}, \qquad I_{CQ} = \beta I_{BQ}, \qquad U_{CEQ} = V_{CC} - I_{EQ}R_e \approx V_{CC} - I_{CQ}R_e$$
--
R_b | base bias resistor | Ω
R_e | emitter resistor | Ω
:::

### Dynamic analysis

In the equivalent circuit the collector is grounded, so the current source $\beta\dot I_b$
runs from ground into the emitter node, joining $\dot I_b$ from $r_{be}$: together they
make $\dot I_e = (1+\beta)\dot I_b$, which flows out through $R_e /\!/ R_L$.

::: circuit Small-signal equivalent circuit of the CC amplifier
W 0,0 2,0
R1 2,0 2,6 Rb
R2 2,0 6,0 rbe
I1 6,6 6,0 βIb
W 6,0 12,0
R3 9,0 9,6 Re
R4 12,0 12,6 RL
W 0,6 12,6
G 4,6
label ui 0,0
label b 2,0
label e 6,0
label c 6,6
label uo 12,0
:::

Write $R_L' = R_e /\!/ R_L$ (for the CC stage this is the emitter's load). Then:

- Input loop: $\dot U_i = \dot I_b r_{be} + \dot I_e R_L' = \dot I_b\left[r_{be} + (1+\beta)R_L'\right]$.
- Output: $\dot U_o = \dot I_e R_L' = (1+\beta)\dot I_b R_L'$.

**Input resistance.** Looking into the base alone,
$R_i' = \dot U_i/\dot I_b = r_{be} + (1+\beta)R_L'$: large, because the load is
multiplied by $(1+\beta)$. $R_b$ is in parallel with it.

**Output resistance.** Short $\dot U_s$ (keep $R_s$), remove $R_L$, drive the emitter with
a test voltage $\dot U_o$. The base now sees $R_s /\!/ R_b$ to ground, so
$\dot U_o = -\dot I_b(r_{be} + R_s /\!/ R_b)$. The test current is
$\dot I_o = \dot U_o/R_e - (1+\beta)\dot I_b$. Seen from the emitter, the base-side
resistance is **divided** by $(1+\beta)$, and $R_e$ is in parallel:

::: formula The common-collector amplifier | 共集放大电路的动态参数
$$\dot A_u = \frac{(1+\beta)R_L'}{r_{be} + (1+\beta)R_L'}, \qquad R_i = R_b /\!/ \left[r_{be} + (1+\beta)R_L'\right], \qquad R_o = R_e /\!/ \frac{r_{be} + R_s /\!/ R_b}{1+\beta}$$
--
R_L' | here $R_e /\!/ R_L$ | Ω
R_s | internal resistance of the signal source | Ω
R_b | base bias resistor | Ω
:::

::: callout key The (1+β) rule
Resistance in the **emitter** looks $(1+\beta)$ times **bigger** from the base;
resistance in the **base** looks $(1+\beta)$ times **smaller** from the emitter. This
one idea gives the CC stage's large $R_i$, its small $R_o$, and the effect of an
unbypassed $R_e$.
:::

The emitter follower's character, from these formulas:

1. **Voltage gain just under 1, in phase.** $\dot A_u$ is positive and less than 1; when
   $(1+\beta)R_L' \gg r_{be}$, $\dot A_u \approx 1$ and $\dot U_o \approx \dot U_i$. It
   amplifies **current** ($\dot A_i \approx 1+\beta$), not voltage.
2. **The output follows the input**: same phase, same shape, hence "emitter follower".
3. **High input resistance, low output resistance**: tens to hundreds of kilohms in, tens
   of ohms out. It is an **impedance converter** ({{zh 阻抗变换}}) with strong
   load-driving ability, used as the **input stage**, the **output stage** and as a
   **buffer** between stages in multistage amplifiers, and in power amplifiers.

::: example An emitter follower
$V_{CC} = 12$ V, $R_b = 200$ kΩ, $R_e = 2$ kΩ, $R_L = 2$ kΩ, $R_s = 1$ kΩ, $\beta = 60$,
$r_{bb'} = 300$ Ω. Find Q, $\dot A_u$, $R_i$ and $R_o$.
== Q point ==
$I_{BQ} = \dfrac{12 - 0.7}{200 + 61 \times 2} = \dfrac{11.3}{322\text{ k}} = 35.1\ \mu$A,
$I_{CQ} = 2.11$ mA, $I_{EQ} = 61 \times 35.1\ \mu\text{A} = 2.14$ mA,
$U_{CEQ} = 12 - 2.14 \times 2 = 7.7$ V.
== r_be ==
$r_{be} = 300 + 61 \times 26/2.14 = 300 + 741 = 1041$ Ω.
== Gain ==
$R_L' = 2 /\!/ 2 = 1$ kΩ, $(1+\beta)R_L' = 61$ kΩ, so
$\dot A_u = \dfrac{61}{1.041 + 61} = 0.983$.
== Input resistance ==
$R_i' = 1.041 + 61 = 62.0$ kΩ, $R_i = 200 /\!/ 62.0 = 47.4$ kΩ.
== Output resistance ==
$R_s /\!/ R_b = 1 /\!/ 200 = 0.995$ kΩ;
$\dfrac{r_{be} + R_s /\!/ R_b}{1+\beta} = \dfrac{1041 + 995}{61} = 33.4$ Ω;
$R_o = 2\text{ k} /\!/ 33.4 = 32.8$ Ω. Compare the CE stage's $R_o = R_c$ = kilohms.
:::

## The common-base amplifier

Now ground the **base** for the signal and feed the signal into the **emitter**. The
bias is the same divider circuit as the CE amplifier, but a capacitor $C_b$ ties the
base to AC ground, and the input goes through $C_1$ to the emitter:

::: circuit The common-base amplifier
R1 4,0 4,6 Rb1
R2 4,6 4,14 Rb2
W 2,6 6,6
C3 2,6 2,14 Cb
Q1 npn 6,6 VT
R3 8,0 8,4 Rc
W 4,0 8,0
C2 8,4 12,4 C2
R4 12,4 12,14 RL
R5 8,8 8,14 Re
W 8,8 10,8
C1 10,8 10,10 C1
A1 10,14 10,10 ui
W 2,14 12,14
G 8,14
label +VCC 8,0
label uo 12,4
:::

::: define Common-base amplifier | 共基放大电路
An amplifier whose base is at AC ground (through a capacitor), with the input applied to
the emitter and the output taken from the collector.
:::

**Statics.** Its DC path (capacitors open) is *exactly* the divider-bias CE amplifier's,
so Q comes out the same: $I_{BQ} = \dfrac{V_{CC}' - U_{BEQ}}{R_b' + (1+\beta)R_e}$,
$I_{CQ} = \beta I_{BQ}$, $U_{CEQ} = V_{CC} - I_{CQ}(R_c + R_e)$.

**Dynamics.** In the equivalent circuit the bottom line is the base (grounded). The input
node is the emitter, with $R_e$ and $r_{be}$ to ground; $\beta\dot I_b$ runs between
collector and emitter.

::: circuit Small-signal equivalent circuit of the CB amplifier
W 0,0 4,0
R1 2,0 2,4 Re
R2 4,0 4,4 rbe
I1 8,0 5,0 βIb
W 4,0 5,0
W 8,0 14,0
R3 11,0 11,4 Rc
R4 14,0 14,4 RL
W 0,4 14,4
G 7,4
label ui 0,0
label e 4,0
label b 4,4
label c 8,0
label uo 14,0
:::

With $\dot I_b$ defined flowing from b up into the transistor as usual,
$\dot U_i = -\dot I_b r_{be}$ (the emitter is driven positive, so the base current is
pushed negative), and $\dot U_o = -\beta\dot I_b R_L'$ with $R_L' = R_c /\!/ R_L$. The two
minus signs cancel:

::: formula The common-base amplifier | 共基放大电路的动态参数
$$\dot A_u = \frac{\beta R_L'}{r_{be}}, \qquad R_i = R_e /\!/ \frac{r_{be}}{1+\beta}, \qquad R_o = R_c$$
--
R_L' | $R_c /\!/ R_L$ | Ω
\frac{r_{be}}{1+\beta} | resistance seen looking into the emitter, $R_i'$ | Ω
:::

The input resistance seen at the emitter is $R_i' = \dot U_i/(-\dot I_e) = r_{be}/(1+\beta)$:
the base-side $r_{be}$ divided by $(1+\beta)$, the same rule as before. Its character:

1. **Amplifies voltage, not current.** $|\dot A_u|$ is the same as the CE stage's, but
   **positive**: output in phase with input. The current gain is
   $\alpha = \beta/(1+\beta) < 1$.
2. **Very low input resistance** (tens of ohms); output resistance $R_c$, like the CE.
3. **The best high-frequency performance**: the widest bandwidth of the three
   ($f_\alpha \approx f_T$, lesson 2.2).

::: example A common-base stage
Use Example 3.5.1's values: $\beta = 60$, $r_{be} = 1.5$ kΩ, $R_c = R_L = 3$ kΩ,
$R_e = 2$ kΩ, and a source with $R_s = 600$ Ω. Find $\dot A_u$, $R_i$ and $\dot A_{us}$.
== Gain ==
$\dot A_u = +\dfrac{60 \times 1.5}{1.502} = +60$: same size as the CE stage, not inverted.
== Input resistance ==
$R_i' = 1502/61 = 24.6$ Ω; $R_i = 2000 /\!/ 24.6 = 24.3$ Ω.
== Source gain ==
$\dot A_{us} = \dfrac{24.3}{600 + 24.3} \times 60 = 2.3$. The tiny $R_i$ throws away
almost all of a 600 Ω source's voltage: a CB stage wants a low-resistance driver, such
as an emitter follower or a CE stage (lesson 2.8).
:::

::: callout note Section numbers
The slide heading the common-base section reads 3.6.2 again; in order it is 3.6.3, and
the comparison that follows is 3.6.4.
:::

## The three configurations side by side

| | Common emitter (CE) | Common collector (CC) | Common base (CB) |
| --- | --- | --- | --- |
| Voltage gain $\dot A_u$ | $-\dfrac{\beta R_L'}{r_{be}}$, large, inverted ($R_L' = R_c /\!/ R_L$) | $\dfrac{(1+\beta)R_L'}{r_{be}+(1+\beta)R_L'} \approx 1$, in phase ($R_L' = R_e /\!/ R_L$) | $\dfrac{\beta R_L'}{r_{be}}$, large, in phase ($R_L' = R_c /\!/ R_L$) |
| Current gain $\dot A_i$ | $\beta$ (large) | $1+\beta$ (large) | $\dfrac{\beta}{1+\beta}$ (below 1) |
| Input resistance $R_i$ | $R_{b1} /\!/ R_{b2} /\!/ r_{be}$ (small) | $R_b /\!/ [r_{be}+(1+\beta)R_L']$ (large) | $R_e /\!/ \dfrac{r_{be}}{1+\beta}$ (very small) |
| Output resistance $R_o$ | $R_c$ (fairly large) | $R_e /\!/ \dfrac{r_{be}+R_s /\!/ R_b}{1+\beta}$ (small) | $R_c$ (fairly large) |
| Bandwidth | narrow | fairly wide | wide |
| Used for | general amplification | input, output and buffer stages | high-frequency, wideband amplifiers |

(The current gains are the transistor's own, with the load taking all the output
current.)

::: callout exam For the exam
Expect: the stabilisation chain $T\uparrow \to \dots \to I_C\downarrow$ and the phrase
"$R_e$ is DC negative feedback"; the gain with $C_e$ removed; the CC formulas,
especially $R_i$ and $R_o$; and "which configuration has the largest $R_i$ / smallest
$R_o$ / widest band / no current gain / no voltage gain?"
:::

::: cards CE, CC and CB compared
Why does the divider-bias circuit keep Q stable? :: $U_B$ is fixed by the divider, and $R_e$ gives DC negative feedback: $I_C\uparrow \to U_E\uparrow \to U_{BE}\downarrow \to I_B\downarrow \to I_C\downarrow$.
Condition for the divider to fix $U_B$ :: The divider current is much larger than $I_B$.
Effect of removing $C_e$ :: Q unchanged; $|\dot A_u|$ drops to $\beta R_L'/[r_{be}+(1+\beta)R_e]$; $R_i$ rises.
The $(1+\beta)$ rule :: Emitter resistance looks $(1+\beta)$ times larger from the base; base resistance looks $(1+\beta)$ times smaller from the emitter.
CC voltage gain :: $\dot A_u = (1+\beta)R_L'/[r_{be}+(1+\beta)R_L'] \approx 1$, in phase, $R_L' = R_e /\!/ R_L$.
CC input resistance :: $R_i = R_b /\!/ [r_{be}+(1+\beta)R_L']$: large.
CC output resistance :: $R_o = R_e /\!/ \frac{r_{be}+R_s /\!/ R_b}{1+\beta}$: small (tens of ohms).
Other names for the CC amplifier :: Emitter follower, emitter output stage.
CB voltage gain :: $\dot A_u = +\beta R_L'/r_{be}$: same size as CE, in phase.
CB input resistance :: $R_i = R_e /\!/ \frac{r_{be}}{1+\beta}$: very small.
Which configuration has the widest bandwidth? :: Common base.
Which configuration can't amplify voltage? Which can't amplify current? :: CC can't amplify voltage; CB can't amplify current.
:::

::: quiz CE, CC and CB compared
? In the divider-bias circuit, what does $R_e$ provide?
- [x] DC negative feedback that stabilises the Q point
- [ ] Positive feedback that raises the gain
- [ ] A path for the signal to bypass the transistor
> Any rise in $I_C$ raises $U_E$, lowering $U_{BE}$ and $I_B$: DC negative feedback.

? A CE stage has $\beta = 50$, $r_{be} = 1$ kΩ, $R_L' = 2$ kΩ and an unbypassed $R_e = 1$ kΩ. Find $\dot A_u$.
answer: -1.92
tolerance: 2%
> $\dot A_u = -\dfrac{50 \times 2}{1 + 51 \times 1} = -\dfrac{100}{52} = -1.92$.

? In that stage, what would $\dot A_u$ be with $C_e$ restored?
answer: -100
tolerance: 1%
> $\dot A_u = -\beta R_L'/r_{be} = -50 \times 2/1 = -100$.

? An emitter follower has $\beta = 100$, $r_{be} = 2$ kΩ, $R_e /\!/ R_L = 1$ kΩ. What is $\dot A_u$?
answer: 0.981
tolerance: 1%
> $\dot A_u = \dfrac{101 \times 1}{2 + 101} = \dfrac{101}{103} = 0.981$.

? For the same emitter follower with $R_b = 300$ kΩ, what is $R_i$?
answer: 76.7 kΩ
tolerance: 2%
> $R_i' = 2 + 101 \times 1 = 103$ kΩ; $R_i = 300 /\!/ 103 = 30\,900/403 = 76.7$ kΩ.

? Write the CC output resistance ignoring $R_e$ (very large), in terms of $r$ ($r_{be}$), $S$ ($R_s /\!/ R_b$) and $b$ ($\beta$).
expression: (r + S) / (1 + b)
variables: r, S, b
> Seen from the emitter, the base-side resistance $r_{be} + R_s /\!/ R_b$ is divided by
> $(1+\beta)$.

? A CB stage has $\beta = 99$, $r_{be} = 2.5$ kΩ, $R_e = 1$ kΩ. What is $R_i$?
answer: 24.4 Ω
tolerance: 2%
> $r_{be}/(1+\beta) = 2500/100 = 25$ Ω; $R_i = 1000 /\!/ 25 = 24.4$ Ω.

? Which configuration has the largest input resistance and the smallest output resistance?
- [x] Common collector
- [ ] Common emitter
- [ ] Common base
> The emitter follower: $(1+\beta)$ multiplies the load into $R_i$ and divides the
> source resistance into $R_o$.

? Which configurations give an output in phase with the input?
- [x] Common collector
- [x] Common base
- [ ] Common emitter
> CE inverts ($\dot A_u < 0$); CC and CB don't.

? Which configuration is preferred for high-frequency, wideband amplification?
text: common base | CB | 共基
> The common base has the widest bandwidth of the three.
:::

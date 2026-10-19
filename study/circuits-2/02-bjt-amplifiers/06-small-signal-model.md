---
title: The small-signal model
zh: 微变等效电路法
summary: Replacing the transistor by a linear model for small signals (h-parameters, r_be and the simplified model), then using it to find the gain, input and output resistance of the divider-bias and fixed-bias common-emitter amplifiers.
source: 第3章 双极型晶体管及其基本放大电路, 2026-09-03 → 09-10
---

The graphical method of the last two lessons shows *what* happens, but reading numbers
off hand-drawn curves is slow and rough, and it can't give you $R_i$ or $R_o$. This
lesson introduces the method used for almost every calculation from here on: for a
small signal, the transistor behaves like a **resistor plus a controlled current
source**. Swap that model in for the transistor and an amplifier becomes an ordinary
linear circuit, solvable with Ohm's and Kirchhoff's laws. The result is three formulas
you'll use constantly: $\dot A_u = -\beta R_L'/r_{be}$, $R_i$ and $R_o$.

## The idea: curves are straight if you look closely

The transistor's curves are curved, but a small enough piece of any smooth curve is
almost straight. If the signal only moves the operating point a little way around Q,
the transistor's response to it is linear, and we can describe it with a few constant
slopes measured at Q.

::: define Small-signal equivalent circuit method | 微变等效电路法
Under **small-signal conditions**, replace the nonlinear transistor by a **linear
model** valid around its Q point, then analyse the amplifier with linear-circuit
methods.
:::

## The BJT as a two-port: h-parameters

Treat the transistor (in the CE connection) as a two-port: base–emitter is the input
port ($u_{BE}$, $i_B$), collector–emitter the output port ($u_{CE}$, $i_C$). Its
characteristic curves say that two of these depend on the other two:

$$u_{BE} = f(i_B, u_{CE}), \qquad i_C = f(i_B, u_{CE})$$

Take the total differential at Q:

$$\d u_{BE} = \frac{\partial u_{BE}}{\partial i_B}\bigg|_{U_{CE}} \d i_B + \frac{\partial u_{BE}}{\partial u_{CE}}\bigg|_{I_B} \d u_{CE}, \qquad \d i_C = \frac{\partial i_C}{\partial i_B}\bigg|_{U_{CE}} \d i_B + \frac{\partial i_C}{\partial u_{CE}}\bigg|_{I_B} \d u_{CE}$$

For small sine signals the differentials become phasors of the AC components, and the
four partial derivatives become four constants, the {{term h-parameters | h参数}}:

::: formula The h-parameter equations | h参数方程
$$\dot U_{be} = h_{11}\dot I_b + h_{12}\dot U_{ce}, \qquad \dot I_c = h_{21}\dot I_b + h_{22}\dot U_{ce}$$
--
h_{11} | $\partial u_{BE}/\partial i_B$ at constant $u_{CE}$: the input resistance $r_{be}$ | Ω
h_{12} | $\partial u_{BE}/\partial u_{CE}$ at constant $i_B$: the reverse voltage-feedback ratio | —
h_{21} | $\partial i_C/\partial i_B$ at constant $u_{CE}$: the current gain $\beta$ | —
h_{22} | $\partial i_C/\partial u_{CE}$ at constant $i_B$: the output conductance $1/r_{ce}$ | S
:::

Each one is a slope you can see on the curves:

- $h_{11}$: the slope of the **input curve** at Q, $\Delta u_{BE}/\Delta i_B$, turned
  round. A resistance, written $r_{be}$.
- $h_{12}$: how far the input curve **shifts** sideways when $u_{CE}$ changes,
  $\Delta u_{BE}/\Delta u_{CE}$ at the same $i_B$. Beyond $U_{CE} \approx 1$ V the curves
  hardly move (lesson 2.2), so $h_{12}$ is tiny.
- $h_{21}$: the vertical **gap** between output curves at fixed $u_{CE}$,
  $\Delta i_C/\Delta i_B$: that's $\beta$.
- $h_{22}$: the slight **slope** of one output curve, $\Delta i_C/\Delta u_{CE}$. The
  curves are nearly flat, so $h_{22}$ is tiny and $r_{ce} = 1/h_{22}$ is large.

All four depend on where Q is: change the bias and they change.

The h-equations describe a circuit: at the input, $h_{11}$ in series with a
voltage source $h_{12}\dot U_{ce}$; at the output, a current source $h_{21}\dot I_b$ in
parallel with $1/h_{22}$ (labelled $r_{ce}$ in the drawing).

::: circuit The full h-parameter model
R1 0,0 4,0 h11
E1 4,4 4,0 h12Uce
F1 8,0 8,4 h21Ib
R2 10,0 10,4 rce
W 8,0 12,0
W 4,4 12,4
label b 0,0
label c 12,0
label e 6,4
:::

The two sources here are *controlled* sources, so they are diamonds: their values
depend on $\dot U_{ce}$ and $\dot I_b$ elsewhere in the circuit.

## The simplified model

Since $h_{12}$ is very small and $r_{ce} = 1/h_{22}$ is very large, we drop them both.
What's left is beautifully simple:

::: define Simplified h-parameter model | 简化h参数等效电路
The BJT's low-frequency small-signal model with $h_{12}$ and $h_{22}$ neglected: a
resistance $r_{be}$ between base and emitter, and a current source $\beta\dot I_b$ from
collector to emitter, controlled by the base current.
:::

::: circuit The simplified small-signal model of a BJT
W 0,0 2,0
R1 2,0 2,4 rbe
F1 6,0 6,4 βIb
W 6,0 8,0
W 0,4 8,4
label b 0,0
label c 8,0
label e 4,4
:::

::: callout pitfall Low and middle frequencies only
The model ignores the junction capacitances, so it only holds at low and mid-band
frequencies. It is not for high-frequency amplifiers.
:::

::: callout pitfall AC only
The model describes the **changes** around Q. It has no 0.7 V source and knows nothing
about the bias: never use it to find the Q point. Find Q first (DC path), then use Q
to get $r_{be}$, then use the model.
:::

## The input resistance r_be

Inside the transistor, the base current first crosses the base region's bulk
resistance $r_{bb'}$ to reach the "real" base point b', then crosses the emitter
junction (resistance $r_{b'e}$) and the emitter bulk resistance $r_{e'}$ (tiny,
neglected). So $r_{be} = r_{bb'} + r_{b'e}$.

The junction part comes from the diode equation (Unit 1): a forward-biased junction
carrying $I_{EQ}$ has a dynamic resistance $U_T/I_{EQ}$. But the junction carries the
*emitter* current, $(1+\beta)$ times the base current; seen from the base, its voltage
looks like a $(1+\beta)$ times larger resistance. Hence:

::: formula Input resistance of a BJT | 晶体管的输入电阻
$$r_{be} = r_{bb'} + (1+\beta)\frac{U_T}{I_{EQ}} \approx 300\ \Omega + (1+\beta)\frac{26\text{ mV}}{I_{EQ}}$$
--
r_{be} | small-signal resistance between base and emitter | Ω
r_{bb'} | base-region bulk (spreading) resistance, 200–300 Ω, from the datasheet | Ω
U_T | thermal voltage, 26 mV at room temperature | V
I_{EQ} | quiescent emitter current | A
\beta | current gain | —
:::

::: callout tip Units that make it easy
With $I_{EQ}$ in mA, $26/I_{EQ}$ comes out in ohms: $I_{EQ} = 1.3$ mA gives
$26/1.3 = 20$ Ω, and with $\beta = 60$, $61 \times 20 = 1220$ Ω. When a question gives no
$r_{bb'}$, use 300 Ω, as the slides do; many problems also take $I_{EQ} \approx I_{CQ}$.
:::

::: callout key Higher Q, smaller r_be
$r_{be}$ is inversely related to $I_{EQ}$: the higher Q sits on the input curve (the
steeper it is there), the **smaller** $r_{be}$, and the larger the gain.
:::

::: explore r_be and the gain it gives
slider rbb: 100 .. 300 = 300 | Ω
slider beta: 20 .. 200 = 60
slider IE: 0.1 .. 5 = 1.32 | mA | log
slider RL: 0.5 .. 10 = 1.5 | kΩ
rbe = rbb + (1 + beta) 26 / IE | Ω | r_be
Au = -beta RL 1000 / rbe | | CE voltage gain −βR'L/r_be
:::

(RL is $R_L'$ in kΩ.) Notice that doubling $I_{EQ}$ almost doubles $|A_u|$ once the
$(1+\beta)U_T/I_{EQ}$ term dominates.

## The divider-bias amplifier: static analysis

The method always starts with statics. For the divider-bias circuit (lesson 2.4), the
DC path is $V_{CC}$, $R_{b1}$, $R_{b2}$, $R_c$, $R_e$ and the transistor. There are two
ways to find Q.

**Exact (Thévenin) method.** As in lesson 2.4: $V_{CC}' = \dfrac{R_{b2}}{R_{b1}+R_{b2}}V_{CC}$,
$R_b' = R_{b1} /\!/ R_{b2}$, then

$$I_{BQ} = \frac{V_{CC}' - U_{BE}}{R_b' + (1+\beta)R_e}, \qquad I_{CQ} = \beta I_{BQ}, \qquad U_{CEQ} = V_{CC} - I_{CQ}(R_c + R_e)$$

**Estimate method.** If the divider current $I_1$ is much larger than the base current
($I_1 = (5 \sim 10)I_B$), the base current barely loads the divider, and the base voltage
is just the divider's output. Then work *down* from the base:

::: formula Divider bias: the estimate method | 分压偏置的估算法
$$U_B \approx \frac{R_{b2}}{R_{b1}+R_{b2}}V_{CC}, \quad I_{EQ} = \frac{U_B - U_{BE}}{R_e}, \quad I_{BQ} = \frac{I_{EQ}}{1+\beta}, \quad U_{CEQ} \approx V_{CC} - I_{CQ}(R_c + R_e)$$
--
U_B | base voltage set by the divider | V
I_{EQ} | quiescent emitter current, $\approx I_{CQ}$ | A
R_e | emitter resistor | Ω
:::

The estimate needs no $\beta$ for $I_{EQ}$, which is exactly why divider bias is popular
(lesson 2.7). It is a little high whenever $R_b'$ isn't negligible beside
$(1+\beta)R_e$.

## The divider-bias amplifier: dynamic analysis

Now the AC side. Draw the AC path (capacitors and $V_{CC}$ shorted, so $R_e$ disappears
under $C_e$ and $R_{b1}$, $R_{b2}$, $R_c$ all go to ground), then replace the transistor
by its model:

::: circuit Small-signal equivalent circuit of the divider-bias CE amplifier
W 0,0 6,0
R1 2,0 2,4 Rb1
R2 4,0 4,4 Rb2
R3 6,0 6,4 rbe
F1 9,0 9,4 βIb
W 9,0 14,0
R4 11,0 11,4 Rc
R5 14,0 14,4 RL
W 0,4 14,4
G 7,4
label ui 0,0
label b 6,0
label c 9,0
label uo 14,0
:::

The bottom line is the emitter, which is AC ground. $\dot I_b$ is the current in
$r_{be}$, flowing down from b; $\beta\dot I_b$ flows down from c to the emitter.

**Voltage gain.** The input voltage sits directly across $r_{be}$:
$\dot U_i = \dot I_b r_{be}$. At the output, the current $\beta\dot I_b$ is drawn *down*
through the source, so it flows *up* through $R_c /\!/ R_L$, making the output negative:
$\dot U_o = -\beta\dot I_b (R_c /\!/ R_L)$. Dividing:

::: formula Voltage gain of the CE amplifier | 共射放大电路的电压放大倍数
$$\dot A_u = \frac{\dot U_o}{\dot U_i} = -\frac{\beta (R_c /\!/ R_L)}{r_{be}} = -\frac{\beta R_L'}{r_{be}}$$
--
\dot A_u | voltage gain; the minus sign means inverted | —
R_L' | AC load resistance $R_c /\!/ R_L$ | Ω
r_{be} | input resistance of the transistor | Ω
:::

**Input resistance.** Looking in at the input terminals we see $R_{b1}$, $R_{b2}$ and
$r_{be}$, all from the input to ground:

::: formula Input resistance of the divider-bias CE amplifier | 分压偏置共射电路的输入电阻
$$R_i = \frac{\dot U_i}{\dot I_i} = R_{b1} /\!/ R_{b2} /\!/ r_{be}$$
--
R_i | input resistance of the amplifier | Ω
:::

Since $R_{b1}$ and $R_{b2}$ are usually much larger, $R_i \approx r_{be}$: small, around a
kilohm.

**Output resistance.** By definition (lesson 2.3): short $\dot U_s$, keep $R_s$, remove
$R_L$, drive the output with a test voltage. With no source, nothing drives the base:
$\dot I_b = 0$, so $\beta\dot I_b = 0$ and the current source is an **open circuit**. The
test source sees only $R_c$:

::: formula Output resistance of the CE amplifier | 共射放大电路的输出电阻
$$R_o = \frac{\dot U_o}{\dot I_o}\bigg|_{\dot U_s = 0,\ R_L = \infty} = R_c$$
--
R_o | output resistance | Ω
R_c | collector resistor | Ω
:::

::: callout pitfall R_L is not part of R_o
$R_o$ is found with the load removed. $R_L$ appears in $\dot A_u$ (through $R_L'$), never
in $R_o$.
:::

::: example Example 3.5.1: a divider-bias amplifier from start to finish
$V_{CC} = 15$ V, $R_{b1} = 60$ kΩ, $R_{b2} = 20$ kΩ, $R_c = 3$ kΩ, $R_e = 2$ kΩ,
$R_L = 3$ kΩ, $R_s = 600$ Ω, $\beta = 60$, $U_{BE} = 0.7$ V, all capacitors large. Find
(1) the Q point, (2) $\dot A_u$, $R_i$, $R_o$, (3) the source gain $\dot A_{us}$.
== (1) Thévenin transform ==
$V_{CC}' = 15 \times \dfrac{20}{80} = 3.75$ V, $R_b' = 60 /\!/ 20 = 15$ kΩ.
== (1) Q point ==
$I_{BQ} = \dfrac{3.75 - 0.7}{15 + 61 \times 2} = \dfrac{3.05}{137\text{ k}} = 22.3\ \mu\text{A} \approx 22\ \mu$A.
Taking 22 μA as the slide does: $I_{CQ} = 60 \times 22 = 1.32$ mA and
$U_{CEQ} = 15 - 1.32 \times (3 + 2) = 8.4$ V.
== (2) r_be ==
With $I_{EQ} \approx I_{CQ} = 1.32$ mA:
$r_{be} = 300 + 61 \times \dfrac{26}{1.32} = 300 + 1202 = 1502$ Ω $\approx 1.5$ kΩ.
== (2) Gain ==
$R_L' = 3 /\!/ 3 = 1.5$ kΩ; $\dot A_u = -\dfrac{60 \times 1.5}{1.502} = -59.9 \approx -60$.
== (2) Resistances ==
$R_i = 60 /\!/ 20 /\!/ 1.502 = 15 /\!/ 1.502 = 1.36$ kΩ; $R_o = R_c = 3$ kΩ.
== (3) Source gain ==
$\dot A_{us} = \dfrac{R_i}{R_s + R_i}\dot A_u = \dfrac{1.36}{0.6 + 1.36} \times (-60) = 0.694 \times (-60) = -41.6$.
:::

::: callout note Rounding in Example 3.5.1
Without rounding, $I_{BQ} = 22.26\ \mu$A, $I_{CQ} = 1.34$ mA and $U_{CEQ} = 8.3$ V; using
the exact $I_{EQ} = 1.36$ mA gives $r_{be} = 1.47$ kΩ, $\dot A_u = -61$, $R_i = 1.34$ kΩ
and $\dot A_{us} = -42.3$. The slide's rounded values are close enough for any exam, but
don't be surprised by small differences. The estimate method gives
$U_B = 3.75$ V, $I_{EQ} = (3.75 - 0.7)/2 = 1.53$ mA: 12% high here, because
$R_b' = 15$ kΩ is not negligible beside $(1+\beta)R_e = 122$ kΩ.
:::

::: example Example 3.5.2, part 2: gain and resistances
Continuing lesson 2.5's design: $R_{b1} = 9.3$ kΩ, $R_{b2} = 2.7$ kΩ, $R_c = 2$ kΩ,
$R_L = 6$ kΩ, $I_{EQ} = 2$ mA, $\beta = 100$, $r_{bb'} = 200$ Ω. Find $r_{be}$,
$\dot A_u$, $R_i$ and $R_o$.
== r_be ==
$r_{be} = 200 + 101 \times \dfrac{26}{2} = 200 + 1313 = 1513$ Ω $\approx 1.5$ kΩ.
== Gain ==
$R_L' = 2 /\!/ 6 = 1.5$ kΩ, so $\dot A_u = -\dfrac{100 \times 1.5}{1.5} = -100$
(−99 with 1.513 kΩ).
== Resistances ==
$R_i = 9.3 /\!/ 2.7 /\!/ 1.5 = 2.09 /\!/ 1.5 \approx 0.87$ kΩ; $R_o = R_c = 2$ kΩ.
:::

## The fixed-bias amplifier

The fixed-bias circuit (lesson 2.4) works the same way. Its Q point comes from
$I_{BQ} = (V_{CC} - U_{BE})/R_b$, $I_{CQ} = \beta I_{BQ}$, $U_{CEQ} = V_{CC} - I_{CQ}R_c$.
In its equivalent circuit the single $R_b$ takes the place of $R_{b1}$ and $R_{b2}$:

::: circuit Small-signal equivalent circuit of the fixed-bias CE amplifier
W 0,0 4,0
R1 2,0 2,4 Rb
R2 4,0 4,4 rbe
F1 7,0 7,4 βIb
W 7,0 12,0
R3 9,0 9,4 Rc
R4 12,0 12,4 RL
W 0,4 12,4
G 5,4
label ui 0,0
label b 4,0
label c 7,0
label uo 12,0
:::

So $\dot A_u = -\beta R_L'/r_{be}$ and $R_o = R_c$ exactly as before, and

$$R_i = R_b /\!/ r_{be} \approx r_{be}$$

since $R_b$ is hundreds of kilohms. The fixed-bias amplifier inverts ($\dot A_u < 0$),
has $|\dot A_u| > 1$, and amplifies current too: it amplifies both voltage and current.

::: circuit The circuit of Example 3.6.1
A1 0,12 0,8 ui
C1 0,8 4,8 C1
R1 4,0 4,8 Rb
W 4,8 8,8
Q1 npn 8,8
R2 10,0 10,3 Rc1
R3 10,3 10,6 Rc2
W 10,3 16,3
C3 16,3 16,12 C3
C2 10,6 13,6 C2
R4 13,6 13,12 RL
W 10,10 10,12
W 4,0 10,0
W 0,12 16,12
G 10,12
label +VCC 10,0
label uo 13,6
:::

::: example Example 3.6.1: a split collector resistor
$V_{CC} = 12$ V, $R_b = 400$ kΩ, $R_{c1} = R_{c2} = 2$ kΩ, $R_L = 2$ kΩ, $\beta = 50$,
$U_{BE} = 0.7$ V, all capacitors large. The collector resistor is split in two, and $C_3$
connects the point between them to ground. (1) Draw the DC path, AC path and equivalent
circuit; (2) find Q; (3) $\dot A_u$; (4) $R_i$ and $R_o$; (5) what changes if $C_3$ is
removed (open)?
== (1) The three circuits ==
DC path: $C_1$, $C_2$, $C_3$ open, so $R_{c1}$ and $R_{c2}$ are in series from $V_{CC}$ to
the collector, and $R_b$ feeds the base. AC path: $C_3$ shorts the middle point to ground,
so $R_{c1}$ is shorted out (both its ends are at AC ground) and the collector sees
$R_{c2} /\!/ R_L$. Equivalent circuit: $R_b /\!/ r_{be}$ at the input,
$\beta\dot I_b$ with $R_{c2}$ and $R_L$ at the output.
== (2) Q point ==
$I_{BQ} = \dfrac{12 - 0.7}{400\text{ k}} = 28\ \mu$A (28.25 exactly),
$I_{CQ} = 50 \times 28\ \mu\text{A} = 1.4$ mA,
$U_{CEQ} = 12 - 1.4 \times (2 + 2) = 6.4$ V.
== (3) Gain ==
$r_{be} = 300 + 51 \times \dfrac{26}{1.4} = 300 + 947 = 1247$ Ω.
$\dot A_u = -\dfrac{50 \times (2 /\!/ 2)}{1.247} = -\dfrac{50 \times 1}{1.247} = -40$.
== (4) Resistances ==
$R_i = 400 /\!/ 1.247 = 1.243$ kΩ $\approx r_{be}$; $R_o = R_{c2} = 2$ kΩ.
== (5) C3 removed ==
The DC path is unchanged (a capacitor is open to DC anyway), so **Q doesn't change**. But
now $R_{c1}$ is in the AC path: the collector sees $(R_{c1} + R_{c2}) /\!/ R_L = 4 /\!/ 2 = 1.33$ kΩ.
So $\dot A_u = -\dfrac{50 \times 1.33}{1.247} = -53.5$ and $R_o = R_{c1} + R_{c2} = 4$ kΩ:
both the gain and the output resistance **increase**.
:::

::: callout exam For the exam
The full routine is examined every year: Q point → $r_{be}$ → equivalent circuit →
$\dot A_u$, $R_i$, $R_o$ → $\dot A_{us}$. Show the equivalent circuit; it earns marks.
Watch for which resistors a capacitor removes from the AC path (like $C_3$ here, or
$C_e$ in lesson 2.7).
:::

::: cards The small-signal model
The idea of the small-signal method :: Under small signals, replace the transistor by a linear model around Q and use linear circuit analysis.
h-parameter $h_{11}$ :: $\partial u_{BE}/\partial i_B$: the input resistance $r_{be}$ (Ω).
h-parameter $h_{12}$ :: $\partial u_{BE}/\partial u_{CE}$: reverse voltage-feedback ratio; tiny, neglected.
h-parameter $h_{21}$ :: $\partial i_C/\partial i_B$: the current gain $\beta$.
h-parameter $h_{22}$ :: $\partial i_C/\partial u_{CE}$: output conductance $1/r_{ce}$; tiny, neglected.
Simplified BJT model :: $r_{be}$ from b to e; current source $\beta\dot I_b$ from c to e.
$r_{be}$ formula :: $r_{be} = r_{bb'} + (1+\beta)U_T/I_{EQ} \approx 300\,\Omega + (1+\beta)\,26\text{ mV}/I_{EQ}$
How does $r_{be}$ change when Q is higher? :: It gets smaller.
Limits of the simplified model :: Low and mid frequencies only (no junction capacitance); AC changes only, never for Q.
CE voltage gain :: $\dot A_u = -\beta R_L'/r_{be}$, $R_L' = R_c /\!/ R_L$
Divider-bias CE input resistance :: $R_i = R_{b1} /\!/ R_{b2} /\!/ r_{be}$
CE output resistance :: $R_o = R_c$
Estimate method condition :: Divider current $I_1 = (5\sim10)I_B$, so $U_B \approx V_{CC}R_{b2}/(R_{b1}+R_{b2})$.
:::

::: quiz The small-signal model
? Which h-parameter is the transistor's current gain $\beta$?
- [x] $h_{21}$
- [ ] $h_{11}$
- [ ] $h_{12}$
- [ ] $h_{22}$
> $h_{21} = \partial i_C/\partial i_B$ at constant $u_{CE}$, which is $\beta$.

? $\beta = 80$, $I_{EQ} = 2$ mA, $r_{bb'} = 300$ Ω. Find $r_{be}$.
answer: 1353 Ω
tolerance: 1%
> $r_{be} = 300 + 81 \times 26/2 = 300 + 1053 = 1353$ Ω.

? With that $r_{be}$, $R_c = 4$ kΩ and $R_L = 4$ kΩ, find $\dot A_u$ of a CE stage with $C_e$ in place.
answer: -118
tolerance: 2%
> $R_L' = 4 /\!/ 4 = 2$ kΩ; $\dot A_u = -80 \times 2/1.353 = -118$.

? Write the CE voltage gain in terms of $b$ ($\beta$), $R$ ($R_L'$) and $r$ ($r_{be}$).
expression: -b R / r
variables: b, R, r
> $\dot U_i = \dot I_b r_{be}$, $\dot U_o = -\beta\dot I_b R_L'$, so
> $\dot A_u = -\beta R_L'/r_{be}$.

? A divider-bias CE stage has $R_{b1} = 30$ kΩ, $R_{b2} = 10$ kΩ, $r_{be} = 1.5$ kΩ. What is $R_i$?
answer: 1.25 kΩ
tolerance: 1%
> $30 /\!/ 10 = 7.5$ kΩ; $7.5 /\!/ 1.5 = 11.25/9 = 1.25$ kΩ.

? Why is $R_o = R_c$ in a CE amplifier?
- [x] With $\dot U_s = 0$, $\dot I_b = 0$, so the source $\beta\dot I_b$ is open and only $R_c$ remains
- [ ] Because $R_L$ is in parallel with $R_c$
- [ ] Because $r_{be}$ is small
> Setting the source to zero kills $\dot I_b$, so the controlled source carries no current
> and acts as an open circuit; the test source sees $R_c$ alone ($R_L$ is removed).

? Fixed bias: $V_{CC} = 12$ V, $R_b = 300$ kΩ, $\beta = 50$. Find $I_{CQ}$.
answer: 1.88 mA
tolerance: 1%
> $I_{BQ} = 11.3/300 = 37.7\ \mu$A; $I_{CQ} = 50 \times 37.7\ \mu\text{A} = 1.88$ mA.

? In Example 3.6.1, if $C_3$ is removed, what happens to the Q point?
- [x] Nothing: the DC path is unchanged
- [ ] $I_{CQ}$ doubles
- [ ] $U_{CEQ}$ falls to zero
> A capacitor is an open circuit for DC whether or not it's there, so the DC path, and Q,
> stay the same. Only the AC path changes.

? Can the small-signal model be used to find $I_{CQ}$?
- [ ] Yes, it is more accurate
- [x] No: it describes only the AC changes around Q
> The model has no bias information (no 0.7 V, no DC). Q comes from the DC path; the model
> needs Q (through $r_{be}$), not the other way round.
:::

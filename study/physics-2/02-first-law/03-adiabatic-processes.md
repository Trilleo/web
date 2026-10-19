---
title: Adiabatic processes
zh: 绝热过程
summary: Processes with no heat exchange — deriving pV^γ = const and its other two forms, the work of an adiabatic process, why an adiabat is steeper than an isotherm, and two adiabatic processes that are not quasi-static, free expansion and throttling.
source: 第14章 热力学第一定律 §14.4, 2026-09-18
---

Pump up a bicycle tyre and the pump gets hot; let the air out of the tyre quickly and
the valve feels cold. In both cases the gas changes so fast that almost no heat has time
to cross the walls, so the gas has to pay for any work out of its own internal energy.
Such a process, with no heat exchanged, is called **adiabatic**. It is the fourth simple
process after the three of Lesson 2.2, and the one that makes engines work: the power
stroke of a car engine, the compression in a diesel, the expansion in a fridge, and even
a sound wave are all close to adiabatic. This lesson finds the curve an ideal gas follows
when it is compressed or expanded adiabatically, works out the work it does, compares the
curve with an isotherm, and ends with two adiabatic processes that are not quasi-static.

## What makes a process adiabatic

::: define Adiabatic process | 绝热过程
A process in which the system exchanges **no heat** with its surroundings: $Q=0$ (and
$\mathrm dQ=0$ at every step).
:::

There are two ways to get one: wrap the system in a perfect insulator (a vacuum flask),
or make the process so **fast** that heat has no time to flow. The second is the usual one
in practice. For a *quasi-static* adiabatic process the process must still be slow
compared with the relaxation time (about $10^{-3}\ \mathrm s$, Lesson 2.1), but fast
compared with the time heat takes to leak through the walls.

With $Q=0$, the first law $Q=\Delta E+A$ becomes
$$A=-\Delta E=-\nu C_{V,m}\Delta T.$$
When the gas expands it does work ($A>0$), so its internal energy falls and it **cools**.
When it is compressed ($A<0$), its internal energy rises and it **heats up** — the hot
bicycle pump.

## The adiabatic equation pV^γ = const

### Derivation

On an isotherm $pV$ is constant. What stays constant on an adiabat? Take a quasi-static
adiabatic step of an ideal gas and combine two equations.

From the equation of state $pV=\nu RT$, take the differential of both sides:
$$p\,\mathrm dV+V\,\mathrm dp=\nu R\,\mathrm dT. \tag{1}$$
From the first law with $\mathrm dQ=0$, $\mathrm dA=-\mathrm dE$:
$$p\,\mathrm dV=-\nu C_{V,m}\,\mathrm dT. \tag{2}$$
Put (2) into (1): $p\,\mathrm dV=-\nu C_{V,m}\mathrm dT$, so
$V\,\mathrm dp=\nu R\,\mathrm dT-p\,\mathrm dV=\nu R\,\mathrm dT+\nu C_{V,m}\mathrm dT$:
$$V\,\mathrm dp=\nu(C_{V,m}+R)\,\mathrm dT=\nu C_{p,m}\,\mathrm dT. \tag{3}$$
Divide (3) by (2):
$$\frac{V\,\mathrm dp}{p\,\mathrm dV}=-\frac{C_{p,m}}{C_{V,m}}=-\gamma,\qquad\text{so}\qquad \frac{\mathrm dp}p+\gamma\frac{\mathrm dV}V=0.$$
Integrate: $\ln p+\gamma\ln V=\text{const}$, that is $\ln(pV^\gamma)=\text{const}$:
$$pV^\gamma=\text{const}.$$

::: callout note A slip on the slide
The slide's line (3) reads $\nu\,\mathrm dP=\nu(C_{V,m}+R)\mathrm dT=\nu C_{V,m}\mathrm dT$. The
correct line is $V\,\mathrm dp=\nu(C_{V,m}+R)\,\mathrm dT=\nu C_{p,m}\,\mathrm dT$ (a $V$ in front
of $\mathrm dp$, and $C_{p,m}$ at the end): only then does dividing by (2) give
$-C_{p,m}/C_{V,m}=-\gamma$.
:::

### Three forms: Poisson's equations

Use $pV=\nu RT$ to swap one variable for another and you get the same law in three
forms, called {{term Poisson's equations | 泊松方程}}. Replace $p$ by $\nu RT/V$:
$TV^{\gamma-1}=$ const. Replace $V$ by $\nu RT/p$: $p^{\gamma-1}T^{-\gamma}=$ const. Use
whichever pair of variables the problem gives you.

::: formula Adiabatic process equations (Poisson's equations) | 绝热过程方程（泊松方程）
$$pV^\gamma=C_1,\qquad TV^{\gamma-1}=C_2,\qquad p^{\gamma-1}T^{-\gamma}=C_3$$
--
p | pressure | Pa
V | volume | m³
T | temperature | K
\gamma | ratio of heat capacities, $C_{p,m}/C_{V,m}=\frac{i+2}i$ | —
C_1, C_2, C_3 | constants (different from each other) for a given adiabat | —
:::

::: callout pitfall Only for a quasi-static adiabatic process of an ideal gas
The derivation used $\mathrm dA=p\,\mathrm dV$ (quasi-static) and $pV=\nu RT$ (ideal gas).
A sudden expansion into a vacuum is adiabatic too, but $pV^\gamma$ is **not** constant
there (see free expansion below).
:::

::: example Compression in a diesel engine
In a diesel engine, air ($\gamma=1.4$) at $300\ \mathrm K$ and $1.0\ \mathrm{atm}$ is compressed
quickly to $1/15$ of its volume. Treat the compression as quasi-static and adiabatic.
Find the final temperature and pressure.
== Temperature from TV^(γ−1) ==
$T_1V_1^{\gamma-1}=T_2V_2^{\gamma-1}$, so
$$T_2=T_1\left(\frac{V_1}{V_2}\right)^{\gamma-1}=300\times15^{0.4}=886\ \mathrm K.$$
That is about $613\ ^\circ\mathrm C$: hot enough to ignite diesel fuel sprayed in, with no
spark plug.
== Pressure from pV^γ ==
$$p_2=p_1\left(\frac{V_1}{V_2}\right)^\gamma=1.0\times15^{1.4}=44\ \mathrm{atm}.$$
An isothermal compression to the same volume would give only $15\ \mathrm{atm}$; the extra
comes from the rise in temperature.
:::

::: explore Adiabatic compression
slider T1: 200 .. 400 = 300 | K | Starting temperature
slider r: 1 .. 25 = 15 | | Compression ratio V₁/V₂
slider g: 1.1 .. 1.7 = 1.4 | | γ
T2 = T1 r^(g - 1) | K | Final temperature
P = r^g | | Pressure ratio p₂/p₁
Piso = r | | Pressure ratio if isothermal
:::

## Work in an adiabatic process

### Two ways to the same formula (Example 2)

::: example Work in a quasi-static adiabatic process (Example 2)
An amount of ideal gas goes through a quasi-static adiabatic process from $(p_1,V_1)$ to
$(p_2,V_2)$. The ratio of heat capacities is $\gamma$. Find the work the gas does.
== Way 1: integrate along pV^γ = C₁ ==
On the adiabat $p=C_1/V^\gamma$, with $C_1=p_1V_1^\gamma=p_2V_2^\gamma$:
$$A=\int_{V_1}^{V_2}\frac{C_1}{V^\gamma}\,\mathrm dV=\frac{C_1}{1-\gamma}\left[V^{1-\gamma}\right]_{V_1}^{V_2}=\frac1{\gamma-1}\left[\frac{C_1}{V_1^{\gamma-1}}-\frac{C_1}{V_2^{\gamma-1}}\right].$$
Since $C_1/V_1^{\gamma-1}=p_1V_1^\gamma/V_1^{\gamma-1}=p_1V_1$, and likewise for state 2,
$$A=\frac{p_1V_1-p_2V_2}{\gamma-1}.$$
== Way 2: the first law ==
$Q=0$, so
$A=-\Delta E=\nu C_{V,m}(T_1-T_2)=\frac i2\nu R(T_1-T_2)=\frac i2(p_1V_1-p_2V_2)$, using
$\nu RT=pV$. And from $\gamma=\frac{i+2}i=1+\frac2i$ we get $\frac i2=\frac1{\gamma-1}$,
so again
$$A=\frac{p_1V_1-p_2V_2}{\gamma-1}.$$
:::

::: callout note A slip on the slide
In Way 1 the slide writes the bracket as
$\left[\frac{C_1}{V_2^{\gamma-1}}-\frac{C_1}{V_1^{\gamma-1}}\right]$; with the terms in that order
the result would have the opposite sign. The correct bracket is
$\left[\frac{C_1}{V_1^{\gamma-1}}-\frac{C_1}{V_2^{\gamma-1}}\right]$, which gives the slide's
(correct) final answer $\frac1{\gamma-1}(p_1V_1-p_2V_2)$.
:::

::: formula Work in an adiabatic process | 绝热过程的功
$$A=-\Delta E=\nu C_{V,m}(T_1-T_2)=\frac{p_1V_1-p_2V_2}{\gamma-1}$$
--
A | work done by the gas | J
T_1, T_2 | temperatures at the start and end | K
p_1V_1, p_2V_2 | products of pressure and volume at the start and end | J
\gamma | ratio of heat capacities | —
:::

::: example Adiabatic expansion of helium
$2\ \mathrm{mol}$ of helium ($\gamma=\frac53$) at $300\ \mathrm K$ in $20\ \mathrm L$ expands
quasi-statically and adiabatically to $40\ \mathrm L$. Find the final temperature and
pressure and the work it does; check the work with both formulas.
== Start ==
$p_1=\dfrac{\nu RT_1}{V_1}=\dfrac{2\times8.31\times300}{0.020}=2.49\times10^5\ \mathrm{Pa}$.
== End ==
$T_2=T_1\left(\dfrac{V_1}{V_2}\right)^{\gamma-1}=300\times0.5^{2/3}=189\ \mathrm K$, and
$p_2=p_1\left(\dfrac{V_1}{V_2}\right)^\gamma=2.49\times10^5\times0.5^{5/3}=7.85\times10^4\ \mathrm{Pa}$.
== Work from the temperatures ==
$A=\nu C_{V,m}(T_1-T_2)=2\times\frac32\times8.31\times(300-189)=2.77\times10^3\ \mathrm J$.
== Work from pV ==
$A=\dfrac{p_1V_1-p_2V_2}{\gamma-1}=\dfrac{2.49\times10^5\times0.020-7.85\times10^4\times0.040}{2/3}=2.77\times10^3\ \mathrm J$. ✓
The gas did $2.77\ \mathrm{kJ}$ of work and its internal energy fell by the same amount.
:::

## Adiabats are steeper than isotherms

::: pv The helium example: the adiabat (solid) falls below the isotherm (dashed) from the same start
axes: V (L), p (kPa)
gamma: 1.667
1: V 20, p 249.3
2: V 40, p 78.5
3: V 40, p 124.65
1 -> 2: adiabatic
1 -> 3: isothermal dashed
shade: 1 -> 2
:::

Start from the same state and double the volume. Isothermally the pressure halves
($124.65\ \mathrm{kPa}$); adiabatically it drops to $78.5\ \mathrm{kPa}$. Through any point the
adiabat (an {{term adiabat | 绝热线}}) is **steeper** than the isotherm.

**From the equations.** Differentiate each curve at the same point $(V,p)$:
- isotherm, $pV=$ const: $\dfrac{\mathrm dp}{\mathrm dV}=-\dfrac pV$;
- adiabat, $pV^\gamma=$ const: $\dfrac{\mathrm dp}{\mathrm dV}=-\gamma\dfrac pV$.

Since $\gamma>1$, the adiabat's slope is $\gamma$ times as steep.

**From the molecules.** Write the pressure as $p=nkT$ (Lesson 1.2), with $n$ the number
of molecules per unit volume. In an isothermal expansion only $n$ falls (the molecules
spread out), so $p$ falls. In an adiabatic expansion $n$ falls **and** $T$ falls too
(the gas pays for its work with internal energy), so $p$ falls faster.

::: theorem The adiabat is steeper than the isotherm | 绝热线比等温线陡
Through the same point of the p–V diagram, the slope of an adiabat is $\gamma$ times the
slope of the isotherm: $\left(\frac{\mathrm dp}{\mathrm dV}\right)_Q=\gamma\left(\frac{\mathrm dp}{\mathrm dV}\right)_T$.
With $\gamma>1$, an adiabatic expansion lowers the pressure more than an isothermal
one, and an adiabatic compression raises it more.
:::

::: plot Isotherm pV = 1 and adiabat pV^γ = 1 through the same point (V = 1, p = 1)
x: 0.3 .. 4
xlabel: V
ylabel: p
iso(V) = 1 / V
adi(V) = 1 / V^g
slider g: 1 .. 1.8 = 1.4 | | γ
:::

At $\gamma=1$ the two curves are the same; raise $\gamma$ and the adiabat swings
steeper about the shared point, below the isotherm on the right and above it on the
left. A monatomic gas ($\gamma=1.67$) has the steepest adiabats.

::: callout pitfall Isotherm or adiabat?
On a diagram with two curves through one point, the **steeper** one is the adiabat. In
a problem, "insulated", "quickly" or "no heat exchange" means adiabatic ($Q=0$, $T$
changes); "slowly, in contact with a heat bath" means isothermal ($\Delta T=0$, $Q\ne0$).
:::

## Adiabatic free expansion

### A gas rushing into a vacuum

A rigid, insulated box is split by a partition. The left half holds an ideal gas at
$(p_0,V_0,T_0)$; the right half is empty. Pull the partition out: the gas rushes into the
vacuum and, after a moment of turmoil, settles down filling the whole box. What is its
new pressure?

::: define Adiabatic free expansion | 绝热自由膨胀
The expansion of a gas into a vacuum inside an insulated container. No heat is exchanged
($Q=0$), and the gas pushes on nothing while it expands ($A=0$). It is **not**
quasi-static: the states in between are not equilibrium states.
:::

::: example Free expansion into double the volume
The ideal gas above (initially $p_0,V_0,T_0$) expands freely into the empty half, so its
final volume is $2V_0$. Find its final temperature and pressure.
== Heat and work ==
The box is insulated: $Q=0$. The gas expands into a vacuum, so there's no piston to push
and no outside pressure to work against: $A=0$.
== Internal energy, then temperature ==
The first law gives $\Delta E=Q-A=0$. The internal energy of an ideal gas depends only on
$T$, so $T=T_0$: the temperature doesn't change.
== Pressure ==
From the equation of state for the start and the end,
$\dfrac{p_0V_0}{T_0}=\dfrac{p\,(2V_0)}{T_0}$, so $p=\dfrac12p_0$.
:::

::: callout pitfall Free expansion is adiabatic, but pV^γ isn't constant
Using $p_0V_0^\gamma=p(2V_0)^\gamma$ would give $p=p_0/2^\gamma$ and a lower temperature —
wrong. Poisson's equations are for *quasi-static* adiabats, where the gas does work. In a
free expansion it does none, so it doesn't cool. On a p–V diagram you can mark only the
start and end states, joined by no curve.
:::

What about a **real** gas (the slide's "拓展" question)? Its molecules attract each other.
As the gas spreads out they move apart against that attraction, so the potential energy of
the intermolecular forces rises. With $E$ fixed, the kinetic part falls: most real gases
come out of a free expansion slightly **cooler**.

## Throttling and the Joule–Thomson effect

::: define Throttling process | 节流过程
The adiabatic passage of a gas, in a steady flow, from a region of **high pressure**
$p_1$ to one of **low pressure** $p_2$ through a porous plug (or a narrow valve).
:::

Picture a tube with a porous plug {{zh 多孔塞}} in the middle and a piston on each
side. The left piston pushes gas through the plug at $p_1$; the right one draws back,
keeping $p_2$ on the other side. No heat crosses the insulated walls.

Why the temperature of an ideal gas doesn't change: push a portion of gas through.
The left piston does work $p_1V_1$ **on** it, and the gas does work $p_2V_2$ on the right
piston, so $A=p_2V_2-p_1V_1$. With $Q=0$, the first law gives
$E_2-E_1=-(p_2V_2-p_1V_1)$, that is
$$E_1+p_1V_1=E_2+p_2V_2.$$
For an ideal gas $E+pV=\frac i2\nu RT+\nu RT$ depends only on $T$, so $T_2=T_1$.

::: law Throttling of a gas | 节流过程的温度变化
After throttling, the temperature of an **ideal** gas is unchanged: $T_2=T_1$. A **real**
gas changes temperature, because of the potential energy of its intermolecular forces
(the {{term Joule–Thomson effect | 焦耳-汤姆逊效应}}): if it cools, the effect is called
**positive**; if it warms, **negative**.
:::

Most gases at room temperature show the positive effect (they cool); hydrogen and helium
warm unless they are first cooled below a certain temperature. The positive effect is
used to liquefy air and in refrigeration: compressed gas cools as it is throttled
through a valve.

| Process | Quasi-static? | Heat $Q$ | Work $A$ | Change $\Delta E$ | Ideal gas $T$ |
| --- | --- | --- | --- | --- | --- |
| Quasi-static adiabatic expansion | yes | $0$ | $>0$ | $<0$ | falls ($TV^{\gamma-1}=$ const) |
| Quasi-static adiabatic compression | yes | $0$ | $<0$ | $>0$ | rises |
| Free expansion into a vacuum | no | $0$ | $0$ | $0$ | unchanged |
| Throttling | no | $0$ | $p_2V_2-p_1V_1$ | $-(p_2V_2-p_1V_1)$ | unchanged |

::: callout key No heat doesn't mean no temperature change
In every adiabatic process $\Delta E=-A$. If the gas does work (a quasi-static expansion),
it cools; if work is done on it, it warms; if no work is done (free expansion), its
temperature stays the same.
:::

::: callout exam What exams ask
- Use $pV^\gamma$, $TV^{\gamma-1}$ or $p^{\gamma-1}T^{-\gamma}$ to find a final state, with the
  right $\gamma$ for the gas ($\frac53$ monatomic, $\frac75$ diatomic).
- The work of an adiabatic process, $\nu C_{V,m}(T_1-T_2)$ or
  $\frac{p_1V_1-p_2V_2}{\gamma-1}$.
- Which curve is the adiabat, and comparing final pressures (or works) of isothermal and
  adiabatic processes from the same start.
- Free expansion: $Q=A=\Delta E=0$, $T$ unchanged, $p$ halves when $V$ doubles.
:::

::: cards Adiabatic processes
Adiabatic process (绝热过程) :: No heat exchanged: $Q=0$, so $A=-\Delta E=-\nu C_{V,m}\Delta T$
Poisson's equations :: $pV^\gamma=C_1$, $TV^{\gamma-1}=C_2$, $p^{\gamma-1}T^{-\gamma}=C_3$ (quasi-static adiabat, ideal gas)
Work in an adiabatic process :: $A=\nu C_{V,m}(T_1-T_2)=\dfrac{p_1V_1-p_2V_2}{\gamma-1}$
Why $\frac i2=\frac1{\gamma-1}$ :: $\gamma=\frac{i+2}i=1+\frac2i$
Slopes of an isotherm and an adiabat at one point :: $-p/V$ and $-\gamma p/V$: the adiabat is $\gamma$ times steeper
Why the adiabat is steeper, from $p=nkT$ :: Isothermal expansion: only $n$ falls. Adiabatic expansion: $n$ and $T$ both fall
Adiabatic expansion: does the gas warm or cool? :: Cools: it does work at the cost of its internal energy
Adiabatic free expansion (绝热自由膨胀) :: Into a vacuum, insulated: $Q=0$, $A=0$, $\Delta E=0$; ideal gas $T$ unchanged, $p$ halves when $V$ doubles; not quasi-static
Throttling (节流过程) :: Adiabatic flow through a porous plug from high to low pressure; $E_1+p_1V_1=E_2+p_2V_2$; ideal gas $T_2=T_1$
Positive / negative Joule–Thomson effect :: A real gas cools / warms after throttling
:::

::: quiz Check yourself
? Air ($\gamma=1.4$) at $27\ ^\circ\mathrm C$ in a bicycle pump is compressed quickly (adiabatically) to half its volume. What is its final temperature in kelvin?
answer: 300 * 2^0.4 K
> $T_2=T_1(V_1/V_2)^{\gamma-1}=300\times2^{0.4}=396\ \mathrm K$ (about $123\ ^\circ\mathrm C$). Use
> $T_1=300\ \mathrm K$, not $27$: Poisson's equations need absolute temperature.

? The same compression, from $1.0\times10^5\ \mathrm{Pa}$: what is the final pressure?
answer: 1e5 * 2^1.4 Pa
> $p_2=p_1(V_1/V_2)^\gamma=1.0\times10^5\times2^{1.4}=2.64\times10^5\ \mathrm{Pa}$, more than the
> $2.0\times10^5\ \mathrm{Pa}$ an isothermal compression would give.

? $1\ \mathrm{mol}$ of oxygen (rigid diatomic) expands adiabatically and cools from $400\ \mathrm K$ to $300\ \mathrm K$. How much work does it do?
answer: 5/2 * R * 100 J
tolerance: 2%
> $A=-\Delta E=\nu C_{V,m}(T_1-T_2)=1\times\frac52\times8.31\times100=2.08\times10^3\ \mathrm J$.

? A gas expands adiabatically from $p_1=4.0\times10^5\ \mathrm{Pa}$, $V_1=1.0\ \mathrm L$ to $p_2=1.0\times10^5\ \mathrm{Pa}$, $V_2=2.7\ \mathrm L$, with $\gamma=1.4$. How much work does it do?
answer: (4e5 * 1e-3 - 1e5 * 2.7e-3) / 0.4 J
> $A=\dfrac{p_1V_1-p_2V_2}{\gamma-1}=\dfrac{400-270}{0.4}=325\ \mathrm J$. (Check: $4^{1/1.4}=2.69$,
> so these states do lie on one adiabat.)

? Write the work of a quasi-static adiabatic process in terms of $p_1, V_1, p_2, V_2$ and $\gamma$ (type γ as g).
expression: (p1 V1 - p2 V2)/(g - 1)
variables: p1, V1, p2, V2, g
> Integrate $p=C_1/V^\gamma$, or use $A=-\Delta E=\frac i2(p_1V_1-p_2V_2)$ with $\frac i2=\frac1{\gamma-1}$.

? An ideal gas expands from the same initial state to the same final volume, once isothermally and once adiabatically (both quasi-static). Which is true?
- [x] The final pressure is lower after the adiabatic expansion, and the gas does less work
- [ ] The final pressure is lower after the adiabatic expansion, and the gas does more work
- [ ] The final pressures are equal
- [ ] The final pressure is higher after the adiabatic expansion
> The adiabat is steeper, so it ends below the isotherm; the area under it (the work) is
> smaller too.

? An ideal gas in an insulated box expands freely into a vacuum until its volume is three times larger. Its initial pressure was $p_0$. What is the final pressure, as a fraction of $p_0$?
answer: 1/3
> $Q=0$ and $A=0$, so $\Delta E=0$ and $T$ is unchanged. Then $p\cdot3V_0=p_0V_0$: $p=p_0/3$.
> Not $p_0/3^\gamma$: the expansion isn't quasi-static.

? An ideal gas goes through a throttling process. Its temperature
- [ ] falls
- [ ] rises
- [x] stays the same
- [ ] depends on $\gamma$
> $E+pV$ is the same before and after, and for an ideal gas $E+pV$ depends only on $T$.
> Only real gases change temperature (the Joule–Thomson effect).

? Monatomic gas expands quasi-statically and adiabatically to 8 times its volume. By what factor does its temperature change ($T_2/T_1$)?
answer: 8^(-2/3)
> $\gamma-1=\frac23$, so $T_2/T_1=(V_1/V_2)^{2/3}=8^{-2/3}=\frac14$.
:::

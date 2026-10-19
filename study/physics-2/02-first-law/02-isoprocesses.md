---
title: Isochoric, isobaric and isothermal processes
zh: 等体、等压和等温过程
summary: The first law applied to an ideal gas held at constant volume, constant pressure or constant temperature — each process's equation, work, internal energy change and heat, a summary table of all four processes, and worked examples.
source: 第14章 热力学第一定律 §14.3.4, 2026-09-16 and 2026-09-18
---

Lesson 2.1 gave us the first law $Q=\Delta E+A$ and the tools to evaluate each term:
$\Delta E=\nu C_{V,m}\Delta T$ for an ideal gas, and $A=\int p\,\mathrm dV$, the area
under the path. Now we put them to work on the simplest processes, those in which one
of $V$, $p$ or $T$ is held fixed. They are worth knowing by heart: real cycles in engines
and fridges (Lessons 2.4 and 2.5) are built out of these pieces, and exam problems
almost always break a process into them. For each one we follow the same recipe:

1. the **process equation** — what stays constant, and how the others are related;
2. the **work** $A=\int p\,\mathrm dV$;
3. the **internal energy change** $\Delta E=\nu C_{V,m}\Delta T$;
4. the **heat**, from the first law: $Q=\Delta E+A$.

Throughout, the gas is an ideal gas ($pV=\nu RT$) and the processes are quasi-static.

## Isochoric process

Think of a gas in a sealed steel bottle left in the sun. The bottle can't stretch, so
the volume is fixed; the gas warms and its pressure rises.

::: define Isochoric process | 等体过程
A process at **constant volume** ($V=$ const). On a p–V diagram it is a vertical line.
Also called an isovolumetric or constant-volume process ({{zh 等容过程}}).
:::

**Process equation.** With $V$ fixed, $pV=\nu RT$ gives $p\propto T$:
$$\frac{p_1}{p_2}=\frac{T_1}{T_2}.$$

**Work.** $\mathrm dV=0$, so $A=\int p\,\mathrm dV=0$: nothing moves, nothing is pushed.
There is no area under a vertical line.

**Internal energy.** $\Delta E=\nu C_{V,m}\Delta T=\frac i2\nu R\Delta T$.

**Heat.** With $A=0$ the first law leaves $Q=\Delta E$: every joule of heat goes into
internal energy. (That is exactly how $C_{V,m}$ was defined in Lesson 2.1.)

::: formula Isochoric process | 等体过程
$$\frac{p_1}{p_2}=\frac{T_1}{T_2},\qquad A=0,\qquad Q=\Delta E=\nu C_{V,m}(T_2-T_1)$$
--
p_1, p_2 | pressures at the start and end | Pa
T_1, T_2 | temperatures at the start and end | K
C_{V,m} | molar heat capacity at constant volume, $\frac i2R$ | J/(mol·K)
:::

::: pv Isochoric heating of 0.5 mol of nitrogen in a 10 L bottle, 300 K → 450 K
axes: V (L), p (kPa)
a: V 10, p 124.7
b: V 10, p 187.0
a -> b: isochoric
:::

::: example Warming a sealed bottle
A rigid $10\ \mathrm L$ bottle holds $0.5\ \mathrm{mol}$ of nitrogen at $300\ \mathrm K$. It is
heated to $450\ \mathrm K$. Find the initial and final pressures, the work, the change of
internal energy and the heat absorbed.
== Pressures ==
$p_1=\dfrac{\nu RT_1}V=\dfrac{0.5\times8.31\times300}{10\times10^{-3}}=1.25\times10^5\ \mathrm{Pa}$.
At constant volume $p\propto T$: $p_2=p_1\dfrac{T_2}{T_1}=1.25\times10^5\times\dfrac{450}{300}=1.87\times10^5\ \mathrm{Pa}$.
== Work ==
The volume doesn't change: $A=0$.
== Internal energy and heat ==
Nitrogen is rigid diatomic, $C_{V,m}=\frac52R$:
$$Q=\Delta E=\nu C_{V,m}\Delta T=0.5\times\frac52\times8.31\times150=1.56\times10^3\ \mathrm J.$$
:::

## Isobaric process

Now a gas under a piston that is free to slide, with a fixed weight on it. Heated,
the gas expands and lifts the piston, but its pressure stays equal to what the weight
(plus the atmosphere) presses with.

::: define Isobaric process | 等压过程
A process at **constant pressure** ($p=$ const). On a p–V diagram it is a horizontal
line.
:::

**Process equation.** With $p$ fixed, $V\propto T$:
$$\frac{V_1}{V_2}=\frac{T_1}{T_2}.$$

**Work.** The pressure comes out of the integral:
$$A=\int_{V_1}^{V_2}p\,\mathrm dV=p(V_2-V_1)=\nu R(T_2-T_1),$$
the last step from $pV_1=\nu RT_1$ and $pV_2=\nu RT_2$. It is the rectangle under the
horizontal line.

**Internal energy.** As always, $\Delta E=\nu C_{V,m}\Delta T$.

**Heat.**
$$Q=\Delta E+A=\nu C_{V,m}\Delta T+\nu R\Delta T=\nu(C_{V,m}+R)\Delta T=\nu C_{p,m}\Delta T,$$
using Mayer's formula $C_{p,m}=C_{V,m}+R$ (Lesson 2.1).

::: formula Isobaric process | 等压过程
$$\frac{V_1}{V_2}=\frac{T_1}{T_2},\qquad A=p(V_2-V_1)=\nu R\Delta T,\qquad \Delta E=\nu C_{V,m}\Delta T,\qquad Q=\nu C_{p,m}\Delta T$$
--
p | the constant pressure | Pa
V_1, V_2 | volumes at the start and end | m³
\Delta T | temperature change, $T_2-T_1$ | K
C_{p,m} | molar heat capacity at constant pressure, $\frac{i+2}2R$ | J/(mol·K)
:::

::: callout tip The 2 : 5 : 7 rule for diatomic gases
In an isobaric process the three terms are in a fixed ratio
$A:\Delta E:Q=R:C_{V,m}:C_{p,m}=2:i:(i+2)$. For a diatomic gas that is $2:5:7$: of
every $7\ \mathrm J$ of heat, $5\ \mathrm J$ warm the gas and $2\ \mathrm J$ push the piston. For
a monatomic gas it is $2:3:5$. A quick check on any isobaric answer.
:::

::: pv Isobaric expansion; the shaded rectangle is the work p(V₂ − V₁)
axes: V, p
ticks: none
a: V 2, p 200
b: V 6, p 200
a -> b: isobaric
shade: a -> b
:::

::: example Heating nitrogen at atmospheric pressure (Example 1)
A cylinder holds $1.25\ \mathrm{kg}$ of nitrogen. It is heated **slowly** at standard
atmospheric pressure, so that its temperature rises by $1\ \mathrm K$. Find the work $A$ the
gas does as it expands, the increase $\Delta E$ of its internal energy and the heat $Q$
it absorbs. (Ignore the mass of the piston and its friction with the cylinder.)
== Which process? ==
"Slowly" makes it quasi-static, and with a free piston under the atmosphere the
pressure stays at $1\ \mathrm{atm}$: it is **isobaric**.
== Amount of gas ==
$\ce{N2}$ has $M=0.028\ \mathrm{kg/mol}$, so $\nu=\dfrac{1.25}{0.028}=44.6\ \mathrm{mol}$.
== Work ==
$$A=p(V_2-V_1)=\nu R\Delta T=\frac{1.25}{0.028}\times8.31\times1=371\ \mathrm J.$$
We never needed the volumes: $\nu R\Delta T$ is quicker than $p\Delta V$.
== Internal energy ==
Nitrogen is rigid diatomic, $i=5$:
$$\Delta E=\nu C_{V,m}\Delta T=\frac{1.25}{0.028}\times\frac52\times8.31\times1=927\ \mathrm J.$$
== Heat ==
$$Q=\Delta E+A=927+371=1298\ \mathrm J,$$
the same as $\nu C_{p,m}\Delta T=44.6\times\frac72\times8.31\times1$. The ratio
$371:927:1298$ is $2:5:7$.
:::

## Isothermal process

Let a gas expand very slowly in a cylinder that sits in a large bath of water at fixed
temperature. As soon as the expanding gas starts to cool, heat flows in from the bath
and keeps it at the bath's temperature.

::: define Isothermal process | 等温过程
A process at **constant temperature** ($T=$ const). For an ideal gas $pV=$ const, a
hyperbola on the p–V diagram called an {{term isotherm | 等温线}}.
:::

**Process equation.** $T$ fixed in $pV=\nu RT$:
$$pV=\text{const},\qquad p=\frac{\nu RT}V,\qquad p_1V_1=p_2V_2.$$

**Internal energy.** For an ideal gas $E$ depends only on $T$: $\Delta E=0$.

**Work.** Now $p$ changes along the way, so it stays inside the integral:
$$A=\int_{V_1}^{V_2}p\,\mathrm dV=\int_{V_1}^{V_2}\nu RT\frac{\mathrm dV}V=\nu RT\ln\frac{V_2}{V_1}.$$
Because $V_2/V_1=p_1/p_2$ and $\nu RT=p_1V_1=p_2V_2$, the same work can be written
$A=p_1V_1\ln\frac{p_1}{p_2}$.

**Heat.** With $\Delta E=0$: $Q=A$. In an isothermal expansion all the heat taken in is
turned into work; in an isothermal compression all the work done on the gas leaves as
heat.

::: formula Isothermal process | 等温过程
$$p_1V_1=p_2V_2,\qquad \Delta E=0,\qquad Q=A=\nu RT\ln\frac{V_2}{V_1}=p_1V_1\ln\frac{p_1}{p_2}$$
--
T | the constant temperature | K
V_1, V_2 | volumes at the start and end | m³
p_1, p_2 | pressures at the start and end | Pa
\nu | amount of gas | mol
:::

::: pv Isothermal expansion of 1 mol at 300 K from 10 L to 20 L; the shaded area is the work
axes: V (L), p (kPa)
a: V 10, p 249.3
b: V 20, p 124.65
a -> b: isothermal
shade: a -> b
:::

::: example Isothermal expansion
$1\ \mathrm{mol}$ of an ideal gas at $300\ \mathrm K$ expands isothermally from $10\ \mathrm L$ to
$20\ \mathrm L$. Find the work it does, $\Delta E$ and the heat absorbed. Check the work with
the pressure form.
== Work ==
$$A=\nu RT\ln\frac{V_2}{V_1}=1\times8.31\times300\times\ln2=1.73\times10^3\ \mathrm J.$$
== Internal energy and heat ==
$T$ is constant, so $\Delta E=0$ and $Q=A=1.73\times10^3\ \mathrm J$, absorbed from the bath.
== With pressures ==
$p_1=\dfrac{\nu RT}{V_1}=\dfrac{8.31\times300}{0.010}=2.49\times10^5\ \mathrm{Pa}$ and
$p_2=1.25\times10^5\ \mathrm{Pa}$ (half, as the volume doubled). Then
$A=p_1V_1\ln\dfrac{p_1}{p_2}=2.49\times10^5\times0.010\times\ln2=1.73\times10^3\ \mathrm J$. ✓
:::

::: explore Isothermal work
slider n: 0.1 .. 5 = 1 | mol | ν
slider T: 100 .. 1000 = 300 | K
slider V1: 1 .. 50 = 10 | L
slider V2: 1 .. 50 = 20 | L
A = n * 8.31 * T * ln(V2 / V1) | J | Work done by the gas (= heat absorbed)
p1 = n * 8.31 * T / (V1 / 1000) | Pa | Starting pressure
p2 = n * 8.31 * T / (V2 / 1000) | Pa | Final pressure
:::

Make $V_2$ smaller than $V_1$ and the work turns negative: in an isothermal compression
the gas gives out heat equal to the work done on it.

::: callout pitfall Isothermal does not mean "no heat"
Constant temperature means $\Delta E=0$, **not** $Q=0$. In an isothermal expansion the
gas absorbs heat all the time — that is what keeps it from cooling. The process with
$Q=0$ is the adiabatic one (Lesson 2.3).
:::

::: callout pitfall Natural logarithm, and SI units
$\ln$ is the natural log ($\ln2=0.693$), not $\lg$. In $\nu RT\ln(V_2/V_1)$ only the
*ratio* of volumes appears, so litres are fine there; but in $p_1V_1\ln(p_1/p_2)$ the
product $p_1V_1$ must be in $\mathrm{Pa\cdot m^3}=\mathrm J$. And $T$ is always in kelvin.
:::

## The four processes side by side

The fourth simple process, the **adiabatic** one ($Q=0$), gets its own lesson (Lesson
2.3); its results are here so the table is complete. The last column is the molar heat
capacity of each process, $C_m=\frac1\nu\frac{\mathrm dQ}{\mathrm dT}$: the isotherm takes
in heat with no temperature change ($C_m\to\infty$), the adiabat changes temperature with
no heat ($C_m=0$).

| Process | Equation | Work $A$ | Change $\Delta E$ | Heat $Q$ | Molar heat capacity $C_m$ |
| --- | --- | --- | --- | --- | --- |
| Isochoric {{zh 等体}} | $V=$ const, $p/T=$ const | $0$ | $\nu C_{V,m}\Delta T$ | $\nu C_{V,m}\Delta T$ | $C_{V,m}$ |
| Isobaric {{zh 等压}} | $p=$ const, $V/T=$ const | $p(V_2-V_1)=\nu R\Delta T$ | $\nu C_{V,m}\Delta T$ | $\nu C_{p,m}\Delta T$ | $C_{p,m}$ |
| Isothermal {{zh 等温}} | $T=$ const, $pV=$ const | $\nu RT\ln\frac{V_2}{V_1}$ | $0$ | $\nu RT\ln\frac{V_2}{V_1}$ | $\infty$ |
| Adiabatic {{zh 绝热}} | $Q=0$, $pV^\gamma=$ const | $-\nu C_{V,m}\Delta T$ | $\nu C_{V,m}\Delta T$ | $0$ | $0$ |

::: callout key One formula for ΔE, a different one for Q
Look down the $\Delta E$ column: $\nu C_{V,m}\Delta T$ every time (zero when $\Delta T=0$).
The heat is what changes from process to process. To get $Q$ for a process that isn't in
the table, find $\Delta E$ and $A$ separately and add them.
:::

## Two paths between the same states

This last example ties everything together: it breaks a path into an isochoric and an
isobaric part, and it shows once more that $A$ and $Q$ depend on the path while
$\Delta E$ doesn't.

::: pv Example 3: oxygen from state 1 to state 2, via a (isochoric, then isobaric) or along the straight line; the areas under a → 2 and 1 → 2 are shaded
axes: V (L), p (atm)
1: V 50, p 5
a: V 50, p 20
2: V 10, p 20
1 -> a: isochoric
a -> 2: isobaric
1 -> 2: line
shade: a -> 2
shade: 1 -> 2
:::

::: example Oxygen along two paths (Example 3)
$1\ \mathrm{mol}$ of oxygen, treated as a rigid ideal gas, goes from state 1
($V_1=50\ \mathrm L$, $p_1=5\ \mathrm{atm}$) to state 2 ($V_2=10\ \mathrm L$, $p_2=20\ \mathrm{atm}$) in
two ways (figure above): (1) along $1\to a\to2$, first at constant volume up to
$20\ \mathrm{atm}$, then at constant pressure down to $10\ \mathrm L$; (2) along the straight
line $1\to2$. Find $A$, $Q$ and $\Delta E$ for each. Use $1\ \mathrm{atm}=1.013\times10^5\ \mathrm{Pa}$.
== A trick for ΔE without temperatures ==
$\Delta E=\frac i2\nu R\Delta T$ and $\nu RT=pV$, so $\Delta E=\frac i2\Delta(pV)$. For
oxygen $i=5$. And $1\ \mathrm{atm\cdot L}=1.013\times10^5\times10^{-3}=101.3\ \mathrm J$.
== 1 → a (isochoric) ==
$A_{1a}=0$.
$\Delta E_{1a}=\frac i2(p_2-p_1)V_1=\frac52\times(20-5)\times1.013\times10^5\times50\times10^{-3}=1.90\times10^5\ \mathrm J$.
$Q_{1a}=\Delta E_{1a}=1.90\times10^5\ \mathrm J$ (absorbed).
== a → 2 (isobaric) ==
$A_{a2}=p_2(V_2-V_1)=20\times1.013\times10^5\times(10-50)\times10^{-3}=-0.81\times10^5\ \mathrm J$
(compression: work is done on the gas).
$\Delta E_{a2}=\frac i2p_2(V_2-V_1)=\frac52\times(-0.810\times10^5)=-2.03\times10^5\ \mathrm J$.
$Q_{a2}=\frac{i+2}2p_2(V_2-V_1)=\frac72\times(-0.810\times10^5)=-2.84\times10^5\ \mathrm J$ (given out).
== Path 1 → a → 2 in total ==
$A=0+(-0.81\times10^5)=-0.81\times10^5\ \mathrm J$
$\Delta E=1.90\times10^5-2.03\times10^5=-0.13\times10^5\ \mathrm J$
$Q=1.90\times10^5-2.84\times10^5=-0.94\times10^5\ \mathrm J$
Check: $\Delta E+A=-0.13-0.81=-0.94$ (in $10^5\ \mathrm J$). ✓
== Path 1 → 2 (straight line) ==
The work is the trapezium under the line, negative because the gas is compressed:
$$A=\tfrac12(p_1+p_2)(V_2-V_1)=\tfrac12\times25\times1.013\times10^5\times(-40)\times10^{-3}=-0.51\times10^5\ \mathrm J.$$
$\Delta E=\frac i2(p_2V_2-p_1V_1)=\frac52\times(200-250)\times101.3=-0.13\times10^5\ \mathrm J$, the same
as before.
$Q=\Delta E+A=-0.127\times10^5-0.507\times10^5=-0.63\times10^5\ \mathrm J$.
== What it shows ==
Same $\Delta E$ on both paths ($-0.13\times10^5\ \mathrm J$): $E$ is a state quantity. Different
$A$ ($-0.81$ vs $-0.51$) and $Q$ ($-0.94$ vs $-0.63$, in $10^5\ \mathrm J$): they are process
quantities. The difference in work, $0.30\times10^5\ \mathrm J$, is the triangle between the two
paths on the diagram.
:::

::: callout note Slips on the slides
- In the total for path $1\to a\to2$ the slide writes $(\Delta E)_{a2}=-2.02\times10^5\ \mathrm J$;
  the previous slide (and the exact value, $-2.026\times10^5\ \mathrm J$) give
  $-2.03\times10^5\ \mathrm J$. The total $-0.13\times10^5\ \mathrm J$ is right either way.
- For the straight line the slide prints $A=\frac12(p_1+p_2)(V_1-V_2)$; that is positive.
  The correct formula is $\frac12(p_1+p_2)(V_2-V_1)$, which gives the printed
  $-0.51\times10^5\ \mathrm J$.
- The slide's $Q=-0.64\times10^5\ \mathrm J$ for the straight line adds the rounded values
  $-0.13-0.51$; from the unrounded ones ($-0.127-0.507$) it is $-0.63\times10^5\ \mathrm J$.
:::

::: callout exam What exams ask
- Name the process from a description ("slowly heated under a free piston" = isobaric,
  "in a rigid container" = isochoric, "in contact with a heat bath" = isothermal), then
  fill in $A$, $\Delta E$, $Q$.
- Break a path drawn on a p–V diagram into its pieces, add the pieces, and check the
  totals with $Q=\Delta E+A$.
- Ratios for an isobaric process ($A/Q=2/7$ for a diatomic gas, $2/5$ for a monatomic
  one).
:::

::: cards Isochoric, isobaric and isothermal processes
Isochoric process (等体过程): A and Q :: $A=0$, $Q=\Delta E=\nu C_{V,m}\Delta T$; process equation $p_1/p_2=T_1/T_2$
Isobaric process (等压过程): A :: $A=p(V_2-V_1)=\nu R\Delta T$
Isobaric process: Q :: $Q=\nu C_{p,m}\Delta T$; process equation $V_1/V_2=T_1/T_2$
Isothermal process (等温过程): ΔE and Q :: $\Delta E=0$, so $Q=A$
Isothermal work :: $A=\nu RT\ln\dfrac{V_2}{V_1}=p_1V_1\ln\dfrac{p_1}{p_2}$
Isobaric ratio $A:\Delta E:Q$ :: $2:i:(i+2)$ — $2:5:7$ for a diatomic gas, $2:3:5$ for a monatomic one
$\Delta E$ of an ideal gas in any process :: $\nu C_{V,m}\Delta T=\frac i2\Delta(pV)$
Molar heat capacity of an isothermal / adiabatic process :: Infinite (heat with no $\Delta T$) / zero (no heat)
On a p–V diagram: isochoric, isobaric, isothermal :: A vertical line, a horizontal line, a hyperbola $pV=$ const
:::

::: quiz Check yourself
? $2\ \mathrm{mol}$ of helium is heated at constant volume from $300\ \mathrm K$ to $400\ \mathrm K$. How much heat does it absorb?
answer: 2 * 3/2 * R * 100 J
tolerance: 2%
> Isochoric: $Q=\Delta E=\nu C_{V,m}\Delta T=2\times\frac32\times8.31\times100=2.49\times10^3\ \mathrm J$.

? A diatomic ideal gas expands at constant pressure and absorbs $700\ \mathrm J$ of heat. How much work does it do?
answer: 200 J
> At constant pressure $A:Q=R:C_{p,m}=2:7$, so $A=\frac27\times700=200\ \mathrm J$ (and
> $\Delta E=500\ \mathrm J$).

? $1\ \mathrm{mol}$ of an ideal gas at $400\ \mathrm K$ is compressed isothermally to half its volume. How much heat does it absorb? (Negative if it gives heat out.)
answer: 8.31 * 400 * ln(0.5) J
tolerance: 2%
> $Q=A=\nu RT\ln\frac{V_2}{V_1}=8.31\times400\times\ln\frac12=-2.30\times10^3\ \mathrm J$: the gas
> gives out $2.30\times10^3\ \mathrm J$ of heat.

? In which process does all the heat a gas absorbs go into internal energy?
- [x] Isochoric
- [ ] Isobaric
- [ ] Isothermal
- [ ] Adiabatic
> At constant volume $A=0$, so $Q=\Delta E$. At constant pressure part goes to work;
> isothermally all of it goes to work; adiabatically there is no heat.

? $0.2\ \mathrm{mol}$ of an ideal gas at $2.0\times10^5\ \mathrm{Pa}$ expands at constant pressure from $2.0\ \mathrm L$ to $5.0\ \mathrm L$. By how much does its temperature rise?
answer: 2e5 * 3e-3 / (0.2 * 8.31) K
tolerance: 2%
> $A=p\Delta V=\nu R\Delta T$, so $\Delta T=\dfrac{p\Delta V}{\nu R}=\dfrac{2.0\times10^5\times3.0\times10^{-3}}{0.2\times8.31}=361\ \mathrm K$.

? Write the work done by $\nu$ moles of ideal gas in an isothermal process at temperature $T$, from pressure $p_1$ to pressure $p_2$.
expression: n R T ln(p1/p2)
variables: n, R, T, p1, p2
> $V_2/V_1=p_1/p_2$ on an isotherm, so $A=\nu RT\ln\frac{V_2}{V_1}=\nu RT\ln\frac{p_1}{p_2}$.
> (Type $\nu$ as n.)

? In Example 3, which quantity is the same along $1\to a\to2$ and along the straight line $1\to2$?
- [ ] The work done by the gas
- [ ] The heat absorbed
- [x] The change of internal energy
- [ ] None of them
> $\Delta E$ depends only on the end states: $-0.13\times10^5\ \mathrm J$ on both. $A$ and $Q$
> depend on the path.

? $5\ \mathrm{mol}$ of oxygen in Example 1's setting ($1\ \mathrm{atm}$, slow heating) warms by $10\ \mathrm K$. How much heat does it absorb?
answer: 5 * 7/2 * R * 10 J
tolerance: 2%
> Isobaric, diatomic: $Q=\nu C_{p,m}\Delta T=5\times\frac72\times8.31\times10=1.45\times10^3\ \mathrm J$.

? An ideal gas expands isothermally from state 1 to state 2. Which is true?
- [ ] $Q=0$, because the temperature doesn't change
- [x] $\Delta E=0$ and the gas absorbs heat equal to the work it does
- [ ] $\Delta E>0$, because the gas does work
- [ ] The gas gives out heat
> $T$ constant means $\Delta E=0$, not $Q=0$; then $Q=A>0$ for an expansion.
:::

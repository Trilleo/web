---
title: The first law, work and heat
zh: 热力学第一定律 功 热量 内能
summary: Energy conservation with heat included — internal energy, work and heat, the first law Q = ΔE + A and its signs, quasi-static processes on a p–V diagram, work as the area under a curve, heat capacities, Mayer's formula and the ratio γ.
source: 第14章 热力学第一定律 §14.1–14.3.3, 2026-09-16
---

Unit 1 looked *inside* a gas: molecules, their speeds and their energy. This unit
steps back and asks a practical question: when a gas is heated, compressed or allowed
to expand, **where does the energy go?** The answer is the **first law of
thermodynamics**, which is simply conservation of energy with heat counted as one of
the ways energy can move. It is the bookkeeping rule behind every engine, fridge and
pump in the rest of the course. This lesson sets up the three quantities in the books
(internal energy, work and heat), the sign rules, how to draw and measure work on a
p–V diagram, and the heat capacities that turn "heat absorbed" into "temperature
change".

## Internal energy, work and heat

### Internal energy: a state quantity

A gas at rest in a cylinder has no kinetic energy *as a whole*, yet it holds a lot of
energy: its molecules fly about and (in a real gas) pull on each other.

::: define Internal energy | 内能
The **internal energy** $E$ of a thermodynamic system is the total energy of the
random thermal motion of all its molecules (their kinetic energy) plus the potential
energy of the forces between them. It is a **state quantity**: it depends only on the
present state of the system, not on how the system got there. In general
$E=E(T,V)$.
:::

A {{term state quantity | 状态量}} is like your bank balance: it has a definite value at
each moment, however the money came in. For an **ideal gas** there are no forces
between molecules, so the potential-energy part is zero and $E$ is the kinetic energy
alone. Lesson 1.3 showed that this gives
$$E=\frac i2\nu RT,\qquad \Delta E=\frac i2\nu R\,\Delta T,$$
where $i$ is the number of degrees of freedom of a molecule, $\nu$ the amount of gas in
moles, $R=8.31\ \mathrm{J/(mol\cdot K)}$ and $T$ the temperature in kelvin. The
internal energy of an ideal gas is a function of the **temperature alone**: if $T$
doesn't change, $E$ doesn't change, whatever happens to $p$ and $V$.

### Two ways to change it

How can you raise the internal energy of the gas in a cylinder? Push the piston in
(the gas warms up, as a bicycle pump does), or put the cylinder on a flame. These are
the only two ways, and they are different in kind.

::: define Work and heat transfer | 做功与热传递
**Doing work** changes a system's energy through a *macroscopic displacement*: a piston
moves, a paddle turns. Ordered motion (the piston's) is turned into the disordered
motion of molecules, or the other way round.
**Heat transfer** changes it with *no* macroscopic displacement: molecules at the
boundary collide and pass energy along through molecular forces (microscopic work).
Energy of random motion flows from the hotter body to the colder one, and it needs a
temperature difference to happen.
:::

Where does this come from? In mechanics, the work–energy theorem for a system says
$A_{\text{ext}}+A_{\text{in,non-cons}}=E_B-E_A$: the work of external forces plus the work
of internal non-conservative forces equals the change of the system's energy. For a
thermodynamic system at rest (looked at in its centre-of-mass frame) only the internal
energy can change, so the external influence $A'_{\text{ext}}$ equals $\Delta E$. That
external influence comes in the two forms above: the work $A'$ done **on** the system
by the surroundings, and the heat $Q$ given to it. So $A'+Q=\Delta E$.

### Heat

::: define Heat | 热量
**Heat** $Q$ is the amount of energy a system exchanges with its surroundings by heat
transfer. It is a **process quantity**: it describes what happened during a process,
not the state the system is in. $Q>0$: the system absorbs heat; $Q<0$: it gives heat
out.
:::

You can't say a gas "contains 500 J of heat", only that it *absorbed* 500 J during
some process. Heat and work are energy *on the move*; internal energy is energy *held*.

## The first law of thermodynamics

The textbook prefers to count the work done **by** the system, written $A$. Since the
work done by the system is minus the work done on it, $A=-A'$, and $A'+Q=\Delta E$
becomes the law.

::: law First law of thermodynamics | 热力学第一定律
The heat a system absorbs equals the increase of its internal energy plus the work the
system does on its surroundings:
$$Q=\Delta E+A.$$
For a small step of a process, $\mathrm{d}Q=\mathrm{d}E+\mathrm{d}A$. The law holds for
every system and every process.
:::

::: formula First law of thermodynamics | 热力学第一定律
$$Q=\Delta E+A,\qquad \mathrm{d}Q=\mathrm{d}E+\mathrm{d}A$$
--
Q | heat absorbed by the system (negative if it gives heat out) | J
\Delta E | increase of internal energy, $E_2-E_1$ | J
A | work done **by** the system on the surroundings | J
:::

Read it as an energy budget: the heat you put in ($Q$) is spent on two things,
warming the gas up ($\Delta E$) and letting it push on the outside world ($A$).

::: callout key The signs, once and for all
- $A>0$: the system does work on the surroundings — it **expands**. $A<0$: the
  surroundings do work on it — it is **compressed**. $A=0$: no work.
- $Q>0$: the system **absorbs** heat. $Q<0$: it **gives out** heat.
- $\Delta E>0$: the internal energy rises (for an ideal gas, $T$ rises).

Every number you put into $Q=\Delta E+A$ carries its own sign.
:::

::: callout note Other books write it differently
Many physics books in English write $W$ for the work and $U$ for internal energy:
$Q=\Delta U+W$, the same law. Chemistry books (and some physics ones) count the work
done **on** the system instead, and write $\Delta U=Q+W$; there $W$ has the opposite
sign to our $A$. Always check which work a book means before copying a formula.
:::

In the small-step form the textbook puts a bar through the d of $\mathrm{d}Q$ and
$\mathrm{d}A$ (đ): it reminds you that they are small amounts of a process quantity,
not small changes of some function of state. $\mathrm{d}E$ is a true change of $E$.

::: define State and process quantities | 状态量与过程量
A **state quantity** ($p$, $V$, $T$, $E$) has a value in each equilibrium state; its
change between two states is the same whatever the path. A **process quantity** ($Q$,
$A$) only exists for a process and depends on the path taken between the states.
:::

::: define Perpetual motion machine of the first kind | 第一类永动机
A machine that would keep doing work without taking in any energy. Run in a cycle it
returns to its starting state ($\Delta E=0$), so the first law gives $A=Q$: with no
heat in, no work out. Such a machine is **impossible**: it would break the first law.
:::

::: example Reading the first law
(a) A gas absorbs $500\ \mathrm J$ of heat and does $200\ \mathrm J$ of work while
expanding. How much does its internal energy change? (b) A gas is compressed: the
piston does $300\ \mathrm J$ of work on it, and at the same time it gives out
$100\ \mathrm J$ of heat. Find $\Delta E$.
== (a) Put the signs in ==
Heat absorbed: $Q=+500\ \mathrm J$. Work done by the gas: $A=+200\ \mathrm J$.
$$\Delta E=Q-A=500-200=300\ \mathrm J.$$
The internal energy rises by $300\ \mathrm J$.
== (b) Careful with "on" and "out" ==
Work done **on** the gas is $300\ \mathrm J$, so the work done **by** it is
$A=-300\ \mathrm J$. Heat given out: $Q=-100\ \mathrm J$.
$$\Delta E=Q-A=-100-(-300)=+200\ \mathrm J.$$
The internal energy rises by $200\ \mathrm J$, even though the gas lost heat.
:::

::: callout pitfall Work "on" versus work "by"
Problems say "the surroundings do 300 J of work on the gas" as often as "the gas does
300 J of work". In $Q=\Delta E+A$, $A$ is always the work done **by** the system, so
work done on it enters with a minus sign. Most sign mistakes in this unit start here.
:::

## Quasi-static processes

### Infinitely slow, always in equilibrium

Push a piston in quickly and, for a moment, the gas near the piston is squeezed while
the gas at the far end hasn't noticed yet: the pressure and temperature are different
in different places. That gas is **not** in an equilibrium state, and there's no single
$p$ or $T$ to write down. Push very slowly, and the gas has time to even itself out
after each tiny step, so at every moment it is (almost) in equilibrium.

::: define Quasi-static process | 准静态过程
A process in which, at every moment, the system is **infinitely close to an
equilibrium state**. It is an idealisation, reached only in the limit of an
"infinitely slow" process.
:::

"Slow" is measured against the {{term relaxation time | 弛豫时间}}: the time a gas
needs to go from a non-equilibrium state back to equilibrium, about $10^{-3}\ \mathrm s$
for a gas in a cylinder. A real compression that takes much longer, say $1\ \mathrm s$,
passes through states that are all close to equilibrium, so it can be treated as
quasi-static. Real engines are not infinitely slow, but the idealisation works well
and makes calculation possible.

### Processes on a p–V diagram

An equilibrium state of a fixed amount of gas is fixed by two of $p$, $V$, $T$ (the
third follows from $pV=\nu RT$), so it is a **point** on a state diagram such as the
$p$–$V$ diagram (also $p$–$T$ or $V$–$T$). A quasi-static process is a continuous
string of equilibrium states: a **curve**. A process that returns to its starting state
is a **closed curve**, a {{term cyclic process | 循环过程}}, or cycle (Lesson 2.4).

A non-equilibrium state has no single $p$ or $V$, so it is not a point; a process that
is not quasi-static (a sudden expansion, an explosion) **cannot** be drawn as a line on
the diagram. You can mark only its start and end, if those are equilibrium states.

::: pv Points are equilibrium states; curves are quasi-static processes; a closed curve is a cycle
axes: V, p
ticks: none
1: V 2, p 300
2: V 6, p 300
3: V 6, p 100
4: V 2, p 100
1 -> 2: isobaric
2 -> 3: isochoric
3 -> 4: isobaric
4 -> 1: isochoric
shade: cycle
:::

Here $1\to2$ is at constant pressure (a horizontal line), $2\to3$ at constant volume (a
vertical line), and the four together make a cycle.

## Work in a quasi-static process

### Work from p dV

Let the gas push a piston of area $S$ outwards by a small distance $\mathrm{d}l$. The
force on the piston is $F=pS$, so the gas does the work
$$\mathrm{d}A=F\,\mathrm{d}l=pS\,\mathrm{d}l=p\,\mathrm{d}V,$$
because $S\,\mathrm{d}l$ is the small change of volume $\mathrm{d}V$. This only works
for a quasi-static process: the pressure $p$ must be one well-defined value at each
moment. Adding up the small steps from $V_1$ to $V_2$:

::: formula Work in a quasi-static process (volume work) | 准静态过程的体积功
$$\mathrm{d}A=p\,\mathrm{d}V,\qquad A=\int_{V_1}^{V_2}p\,\mathrm{d}V$$
--
A | work done by the gas | J
p | pressure of the gas at each step | Pa
V_1, V_2 | volumes at the start and end | m³
:::

The sign comes out by itself: expansion ($\mathrm dV>0$) gives $A>0$, compression
($\mathrm dV<0$) gives $A<0$, and constant volume gives $A=0$.

### Work is the area under the curve

An integral $\int p\,\mathrm dV$ is an area: on a $p$–$V$ diagram, the work done in a
quasi-static process is the **area under its curve**, down to the $V$ axis — positive
when the curve runs to the right (expansion), negative when it runs to the left.

Now the important part. Take two states 1 and 2 and join them by **different** paths.
The areas under the paths are different, so the work is different: work is **not** a
property of a state, but of the process.

::: pv Three paths from state 1 to state 2; the area under the isotherm is shaded
axes: V (L), p (kPa)
1: V 2, p 300
b: V 6, p 300
2: V 6, p 100
a: V 2, p 100
1 -> b: isobaric
b -> 2: isochoric
1 -> a: isochoric
a -> 2: isobaric
1 -> 2: isothermal
shade: 1 -> 2
:::

::: example Work along three paths
A gas goes from state 1 ($V_1=2\ \mathrm L$, $p_1=300\ \mathrm{kPa}$) to state 2
($V_2=6\ \mathrm L$, $p_2=100\ \mathrm{kPa}$) along three quasi-static paths (the figure
above): (i) at constant pressure to $b$, then at constant volume down to 2; (ii) at
constant volume down to $a$, then at constant pressure to 2; (iii) along the isotherm
$pV=\text{const}$ (note $p_1V_1=p_2V_2=600\ \mathrm J$). Find the work each time, and
the heat absorbed.
== Path (i): 1 → b → 2 ==
Only the horizontal part does work:
$A=p_1(V_2-V_1)=300\times10^3\times(6-2)\times10^{-3}=1200\ \mathrm J$.
== Path (ii): 1 → a → 2 ==
$A=p_2(V_2-V_1)=100\times10^3\times4\times10^{-3}=400\ \mathrm J$.
== Path (iii): the isotherm ==
With $p=C/V$ and $C=p_1V_1=600\ \mathrm J$:
$$A=\int_{V_1}^{V_2}\frac CV\,\mathrm dV=C\ln\frac{V_2}{V_1}=600\ln3=659\ \mathrm J.$$
(Lesson 2.2 works this integral out properly.)
== The heat ==
$pV$ is the same in states 1 and 2, so $T$ is the same ($pV=\nu RT$) and, for an ideal
gas, $\Delta E=0$ on every path. Then $Q=\Delta E+A=A$: the gas absorbs $1200$, $400$ and
$659\ \mathrm J$ on the three paths. Same start, same end, same $\Delta E$ — but
different $A$ and different $Q$.
:::

::: callout key Q and A depend on the path; ΔE doesn't
Between the same two states, $\Delta E=E_2-E_1$ is always the same, while $A$ (the area
under the path) and $Q=\Delta E+A$ change with the path. When a question gives only the
start and end states, you can find $\Delta E$ but not $Q$ or $A$.
:::

## Heat capacity

### How much heat per kelvin

Put the same flame under a cup of water and a cup of oil: the oil warms up faster. The
amount of heat needed per degree is the body's heat capacity.

::: define Heat capacity | 热容
The **heat capacity** of a body is the heat it must absorb per unit rise in
temperature:
$$C=\frac{\mathrm{d}Q}{\mathrm{d}T}\quad(\text{unit } \mathrm{J/K}).$$
Since $Q$ depends on the process, so does $C$: the heat capacity at constant volume
$C_V=\left(\frac{\mathrm dQ}{\mathrm dT}\right)_V$ and at constant pressure
$C_p=\left(\frac{\mathrm dQ}{\mathrm dT}\right)_p$ are different numbers.
:::

Heat capacity grows with the size of the body. Two ways of making it per amount:

::: define Specific heat and molar heat capacity | 比热容与摩尔热容
The **specific heat** $c$ is the heat capacity per unit mass: $C=m_{\text{body}}c$, unit
$\mathrm{J/(kg\cdot K)}$. The **molar heat capacity** $C_m$ is the heat capacity per mole:
$C=\nu C_m$, unit $\mathrm{J/(mol\cdot K)}$. So $c=C_m/M$, with $M$ the molar mass.
:::

::: callout pitfall Which m?
The slide writes $C=mc$ with $m$ the **mass of the body** in kg. Elsewhere in this
course $m$ is the mass of **one molecule** and $M$ the molar mass (kg/mol). In gas
problems it is safest to work in moles: $\nu=m_{\text{gas}}/M$ and $C=\nu C_m$.
:::

### Molar heat capacity at constant volume

Heat a gas in a rigid box. The volume can't change, so the gas does no work
($\mathrm dA=p\,\mathrm dV=0$), and the first law says all the heat goes into internal
energy: $(\mathrm dQ)_V=\mathrm dE$. With $E=\frac i2\nu RT$ (Lesson 1.3):
$$C_{V,m}=\frac{C_V}{\nu}=\frac1\nu\left(\frac{\mathrm dQ}{\mathrm dT}\right)_V=\frac1\nu\frac{\mathrm dE}{\mathrm dT}=\frac1\nu\frac{\mathrm d}{\mathrm dT}\left(\frac i2\nu RT\right)=\frac i2R.$$

::: define Molar heat capacity at constant volume | 定体摩尔热容
$C_{V,m}$: the heat one mole of a substance absorbs per kelvin while its volume is held
fixed. For an ideal gas $C_{V,m}=\frac i2R$.
:::

Turning this around gives the formula you will use in almost every problem:

::: formula Internal energy change of an ideal gas | 理想气体内能增量
$$\mathrm{d}E=\nu C_{V,m}\,\mathrm{d}T,\qquad \Delta E=E_2-E_1=\nu C_{V,m}(T_2-T_1)=\frac i2\nu R\,\Delta T$$
--
\nu | amount of gas | mol
C_{V,m} | molar heat capacity at constant volume, $\frac i2R$ | J/(mol·K)
T_1, T_2 | temperatures at the start and end | K
:::

::: callout pitfall ΔE = νC_{V,m}ΔT holds for every process
The derivation used a constant-volume process, but $E$ is a state quantity that depends
only on $T$. So $\Delta E=\nu C_{V,m}\Delta T$ is right for **any** process of an ideal
gas — at constant pressure, adiabatic, along a straight line. Don't swap in $C_{p,m}$
because "the pressure was constant": $C_{p,m}$ is for the heat, not for $\Delta E$.
:::

### Molar heat capacity at constant pressure

Now heat the gas under a freely sliding piston, so the pressure stays the same. As it
warms, it expands and pushes the piston out: part of the heat is spent on work, so
more heat is needed for the same rise in temperature. From the first law,
$(\mathrm dQ)_p=\mathrm dE+p\,\mathrm dV$:
$$C_{p,m}=\frac{C_p}{\nu}=\frac1\nu\left(\frac{\mathrm dQ}{\mathrm dT}\right)_p=\frac1\nu\frac{\mathrm dE}{\mathrm dT}+\frac p\nu\left(\frac{\mathrm dV}{\mathrm dT}\right)_p.$$
The first term is $C_{V,m}$. For the second, $pV=\nu RT$ at constant $p$ gives
$\left(\frac{\mathrm dV}{\mathrm dT}\right)_p=\frac{\nu R}p$, so it equals $R$.

::: define Molar heat capacity at constant pressure | 定压摩尔热容
$C_{p,m}$: the heat one mole absorbs per kelvin while its pressure is held fixed. For
an ideal gas $C_{p,m}=C_{V,m}+R=\frac{i+2}2R$.
:::

::: law Mayer's formula | 迈耶公式
For an ideal gas the molar heat capacities at constant pressure and at constant volume
differ by the gas constant:
$$C_{p,m}=C_{V,m}+R.$$
:::

The meaning of $R$ here: heating one mole by $1\ \mathrm K$ at constant pressure, the gas
expands and does $p\,\Delta V=R\times1\ \mathrm K=8.31\ \mathrm J$ of work. That is the
extra heat needed on top of what goes into internal energy.

### The ratio γ

::: define Ratio of heat capacities | 比热比
$$\gamma=\frac{C_{p,m}}{C_{V,m}}=\frac{C_{V,m}+R}{C_{V,m}}=1+\frac R{C_{V,m}}.$$
For an ideal gas, $\gamma=\frac{i+2}i$; it is always greater than 1. ($\gamma$ is also
called the adiabatic index; it sets the shape of adiabats, Lesson 2.3.)
:::

::: formula Molar heat capacities of an ideal gas | 理想气体的摩尔热容
$$C_{V,m}=\frac i2R,\qquad C_{p,m}=C_{V,m}+R=\frac{i+2}2R,\qquad \gamma=\frac{C_{p,m}}{C_{V,m}}=\frac{i+2}i$$
--
C_{V,m} | molar heat capacity at constant volume | J/(mol·K)
C_{p,m} | molar heat capacity at constant pressure | J/(mol·K)
\gamma | ratio of heat capacities | —
i | degrees of freedom of a molecule (Lesson 1.3) | —
R | gas constant, $8.31$ | J/(mol·K)
:::

| Molecule | Degrees of freedom $i$ | $C_{V,m}$ at constant volume | $C_{p,m}$ at constant pressure | Ratio $\gamma$ |
| --- | --- | --- | --- | --- |
| Monatomic (He, Ne, Ar) {{zh 单原子分子}} | 3 | $\frac32R$ | $\frac52R$ | $\frac53\approx1.67$ |
| Rigid diatomic (H₂, N₂, O₂, air) {{zh 刚性双原子分子}} | 5 | $\frac52R$ | $\frac72R$ | $\frac75=1.40$ |
| Rigid polyatomic (H₂O, CH₄) {{zh 刚性多原子分子}} | 6 | $3R$ | $4R$ | $\frac43\approx1.33$ |

::: callout warning Only for ideal gases
These values of $C_{V,m}$, $C_{p,m}$ and $\gamma$ come from $E=\frac i2\nu RT$, so they
apply only to ideal gases. Solids and liquids, and real gases at high pressure, have
heat capacities that must be measured.
:::

::: explore Molar heat capacities from the degrees of freedom
slider i: 3 .. 6 = 5 | | step 1
Cv = i / 2 * 8.31 | J/(mol·K) | C_V,m
Cp = Cv + 8.31 | J/(mol·K) | C_p,m
g = Cp / Cv | | γ
:::

Move $i$ from 3 to 6: both heat capacities grow (more ways for a molecule to store
energy), their difference stays $8.31$, and $\gamma$ falls towards 1.

::: example Heating helium two ways
$2\ \mathrm{mol}$ of helium (monatomic) is heated by $10\ \mathrm K$, (a) at constant volume,
(b) at constant pressure. How much heat is needed each time, and where does the
difference go?
== Constant volume ==
$C_{V,m}=\frac32R$, so $Q_V=\nu C_{V,m}\Delta T=2\times\frac32\times8.31\times10=249\ \mathrm J$.
== Constant pressure ==
$C_{p,m}=\frac52R$, so $Q_p=\nu C_{p,m}\Delta T=2\times\frac52\times8.31\times10=416\ \mathrm J$.
== The difference ==
$Q_p-Q_V=\nu R\,\Delta T=2\times8.31\times10=166\ \mathrm J$. Both gases end up with the
same $\Delta E=249\ \mathrm J$ (same $\Delta T$); at constant pressure the extra $166\ \mathrm J$
is the work done pushing the piston out.
:::

::: example The specific heat of nitrogen
Find the specific heat at constant volume of nitrogen ($\ce{N2}$, rigid diatomic,
$M=0.028\ \mathrm{kg/mol}$).
== Molar heat capacity ==
$C_{V,m}=\frac52R=\frac52\times8.31=20.8\ \mathrm{J/(mol\cdot K)}$.
== Per kilogram ==
One kilogram is $1/M$ moles, so
$c_V=\dfrac{C_{V,m}}M=\dfrac{20.8}{0.028}=742\ \mathrm{J/(kg\cdot K)}$.
(At constant pressure, $c_p=\frac72R/M=1039\ \mathrm{J/(kg\cdot K)}$.)
:::

::: callout exam What exams ask
- The sign of $Q$, $A$, $\Delta E$ in a described process (expansion/compression,
  absorbs/gives out), and using $Q=\Delta E+A$ to find the missing one.
- "Which are state quantities?" — $E$, $p$, $V$, $T$; not $Q$ or $A$.
- Work as the area under a p–V curve, and comparing the work of two paths.
- $C_{V,m}$, $C_{p,m}$ and $\gamma$ for monatomic and diatomic gases; Mayer's formula.
:::

## Summary

- Internal energy $E$ is a state quantity; for an ideal gas
  $\Delta E=\nu C_{V,m}\Delta T$ in any process.
- Work and heat are process quantities: two ways energy crosses the boundary.
- First law: $Q=\Delta E+A$, with $A$ the work done **by** the system and $Q$ the heat
  absorbed.
- Quasi-static processes are curves on a p–V diagram; $A=\int p\,\mathrm dV$ is the
  area under the curve.
- $C_{V,m}=\frac i2R$, $C_{p,m}=C_{V,m}+R$ (Mayer), $\gamma=\frac{i+2}i$.

::: cards The first law, work and heat
First law of thermodynamics :: $Q=\Delta E+A$; differential form $\mathrm dQ=\mathrm dE+\mathrm dA$; holds for every system and every process
In $Q=\Delta E+A$, what is $A$? :: The work done **by** the system on its surroundings ($A>0$ when it expands)
Sign of $Q$ :: $Q>0$: the system absorbs heat; $Q<0$: it gives heat out
State quantities vs process quantities :: State: $p$, $V$, $T$, $E$ (depend only on the state). Process: $Q$, $A$ (depend on the path)
Internal energy (内能) :: Kinetic energy of molecular thermal motion plus intermolecular potential energy; ideal gas: $E=\frac i2\nu RT$, a function of $T$ only
Perpetual motion machine of the first kind :: A machine doing work with no energy input; impossible because it violates the first law
Quasi-static process (准静态过程) :: A process in which the system is at every moment infinitely close to equilibrium; needs to be much slower than the relaxation time (~$10^{-3}$ s)
What does a point / a curve / a closed curve on a p–V diagram mean? :: An equilibrium state / a quasi-static process / a cycle
Work in a quasi-static process :: $A=\int_{V_1}^{V_2}p\,\mathrm dV$, the area under the curve on a p–V diagram
Heat capacity, specific heat, molar heat capacity :: $C=\mathrm dQ/\mathrm dT$ (J/K); $C=mc$ (J/(kg·K)); $C=\nu C_m$ (J/(mol·K))
$C_{V,m}$ of an ideal gas :: $\frac i2R$; and $\Delta E=\nu C_{V,m}\Delta T$ for any process
Mayer's formula (迈耶公式) :: $C_{p,m}=C_{V,m}+R$
Ratio of heat capacities $\gamma$ :: $\gamma=C_{p,m}/C_{V,m}=(i+2)/i$: 5/3 monatomic, 7/5 rigid diatomic, 4/3 rigid polyatomic
:::

::: quiz Check yourself
? A gas absorbs $800\ \mathrm J$ of heat and its internal energy rises by $500\ \mathrm J$. How much work does the gas do?
answer: 300 J
> $A=Q-\Delta E=800-500=300\ \mathrm J$. Positive, so the gas expands.

? While a gas is compressed, the surroundings do $400\ \mathrm J$ of work on it and it gives out $150\ \mathrm J$ of heat. What is $\Delta E$?
answer: 250 J
> Work done **by** the gas: $A=-400\ \mathrm J$. Heat absorbed: $Q=-150\ \mathrm J$.
> $\Delta E=Q-A=-150-(-400)=+250\ \mathrm J$.

? Which of these are process quantities?
- [x] The heat $Q$ absorbed
- [x] The work $A$ done by the gas
- [ ] The internal energy $E$
- [ ] The temperature $T$
> $Q$ and $A$ depend on the path between two states; $E$ and $T$ have a value in each
> state, so only their changes appear in a process.

? Which statement about a quasi-static process is right?
- [ ] It is any process that takes more than a second
- [x] At every moment the system is infinitely close to an equilibrium state
- [ ] It is a process with no heat exchange
- [ ] It can be drawn as a single point on the p–V diagram
> Quasi-static means a continuous string of equilibrium states, drawn as a curve. "Slow"
> is relative to the relaxation time (~$10^{-3}$ s), so 1 s is usually slow enough, but
> that's a consequence, not the definition. No heat exchange is "adiabatic".

? A gas expands at a constant pressure of $2.0\times10^5\ \mathrm{Pa}$ from $3.0\ \mathrm L$ to $8.0\ \mathrm L$. How much work does it do?
answer: 1000 J
> $A=p(V_2-V_1)=2.0\times10^5\times(8.0-3.0)\times10^{-3}=1.0\times10^3\ \mathrm J$, the
> area of the rectangle under the horizontal line.

? What is $C_{p,m}$ of a rigid diatomic ideal gas?
answer: 7/2 * R J/(mol·K)
> $C_{V,m}=\frac52R$ and Mayer's formula adds $R$: $C_{p,m}=\frac72R=29.1\ \mathrm{J/(mol\cdot K)}$.

? Write $\gamma$ in terms of the degrees of freedom $i$.
expression: (i + 2)/i
variables: i
> $\gamma=\dfrac{C_{p,m}}{C_{V,m}}=\dfrac{(i+2)R/2}{iR/2}=\dfrac{i+2}i$.

? $3\ \mathrm{mol}$ of oxygen (rigid diatomic) is heated from $300\ \mathrm K$ to $340\ \mathrm K$ at constant pressure. By how much does its internal energy rise?
answer: 3 * 5/2 * R * 40 J
tolerance: 2%
> $\Delta E=\nu C_{V,m}\Delta T=3\times\frac52\times8.31\times40=2493\ \mathrm J$. The pressure
> being constant doesn't matter for $\Delta E$: it's always $C_{V,m}$. (The heat would use
> $C_{p,m}$: $Q=3490\ \mathrm J$.)

? What is the specific heat at constant pressure of helium ($M=0.004\ \mathrm{kg/mol}$)?
answer: 5/2 * 8.31 / 0.004 J/(kg·K)
tolerance: 2%
> $C_{p,m}=\frac52R=20.8\ \mathrm{J/(mol\cdot K)}$, and $c_p=C_{p,m}/M=20.8/0.004\approx5.19\times10^3\ \mathrm{J/(kg\cdot K)}$.

? Two paths join the same states 1 and 2 of an ideal gas. Path I does more work than path II. Then
- [ ] $\Delta E$ is larger along path I
- [x] The gas absorbs more heat along path I
- [ ] The gas absorbs the same heat on both paths
- [ ] Nothing can be said about the heat
> $\Delta E$ is the same on both paths (same end states). $Q=\Delta E+A$, so the path
> with more work needs exactly that much more heat.
:::

---
title: Pressure and temperature from molecules
zh: 理想气体的压强与温度
summary: The microscopic model of an ideal gas, the derivation of the pressure formula p = (2/3)n ε̄t, temperature as a measure of the molecules' mean translational kinetic energy, the rms speed, and Dalton's law of partial pressures.
source: 第13章 气体动理论 §13.2, 2026-09-04 and 2026-09-09
---

In Lesson 1.1 pressure and temperature were things we *measure* — a gauge reading, a
thermometer reading — tied together by the experimental law $p=nkT$. This lesson
looks underneath. We build a simple model of a gas as a swarm of tiny elastic balls,
use nothing but Newton's laws and a little statistics, and *derive* the pressure. Then,
comparing the result with $p=nkT$, we find what temperature really is: a measure of how
fast the molecules move. This is the first real success of kinetic theory, and the
formulas here ($\bar\varepsilon_t=\frac32kT$, $\sqrt{\overline{v^2}}=\sqrt{3RT/M}$) are
used in every later lesson of the unit.

## Pressure as the effect of many collisions

Hold an umbrella in heavy rain. Each drop gives it a tiny tap, but so many drops arrive
every second that what you feel is a steady push. A gas pushes on its container's
walls the same way: about $10^{23}$ molecules hit each square centimetre every second,
each one bouncing back and giving the wall a small kick of momentum.

::: callout key What pressure is
The pressure of a gas is the **average effect** of a huge number of molecules
colliding with the walls: the momentum they deliver per unit time per unit area.
:::

To turn that into a formula we treat each molecule with Newton's laws and the whole
crowd with statistics. The plan:

- **object**: an ideal gas;
- **state**: equilibrium (Lesson 1.1), so the averages don't change;
- **method**: build a model, derive the pressure, check the result against experiment.

We look at a small piece of wall of area $\mathrm dS$. It must be **macroscopically
small** (so the pressure is the same all over it) but **microscopically large** (so
huge numbers of molecules hit it: an averaging needs many events). For a gas at room
conditions, a square 0.01 mm on a side is both.

## The microscopic model

### Assumptions about each molecule

::: define Microscopic model of an ideal gas | 理想气体的微观模型
Each molecule is treated by classical mechanics as
1. a **point mass** (its size is negligible compared with the spacing between
   molecules);
2. feeling **no forces** except at the instant of a collision (with another molecule or
   a wall), so between collisions it moves in a straight line at constant speed;
3. colliding **perfectly elastically** (no kinetic energy lost).

In short: an ideal gas is a collection of non-interacting elastic point masses obeying
classical mechanics.
:::

This is the same ideal gas as in Lesson 1.1, now described molecule by molecule.

### Statistical assumptions

The molecules' individual velocities change all the time through collisions; we can't
know them. But in equilibrium, nothing singles out any place or direction in the box,
so we assume:

::: define Statistical assumptions for a gas in equilibrium | 统计假设
1. The velocity of each molecule keeps changing (through collisions).
2. Molecules are spread **uniformly in space**: the number density is the same
   everywhere, $n=\dfrac NV=\dfrac{\mathrm dN}{\mathrm dV}$, where $\mathrm dV$ is a
   volume element that is macroscopically small but microscopically large.
3. Velocities are spread **uniformly over directions**: no direction is preferred.
:::

Assumption 3 has two consequences we need. First, for every molecule moving in $+x$
there is, on average, one moving in $-x$, so the **mean** of each velocity component is
zero:
$$\overline{v_x}=\overline{v_y}=\overline{v_z}=0 .$$
Second, the **mean of the square** (the average of $v_x^2$ over all molecules, written
$\overline{v_x^2}$) is not zero, and it is the same in every direction. Since every
molecule has $v^2=v_x^2+v_y^2+v_z^2$, averaging gives
$\overline{v^2}=\overline{v_x^2}+\overline{v_y^2}+\overline{v_z^2}$, and so

::: formula Equal sharing of the mean square velocity | 速度分量平方的平均值
$$\overline{v_x^2}=\overline{v_y^2}=\overline{v_z^2}=\frac13\,\overline{v^2}$$
--
\overline{v_x^2} | mean of the square of the $x$-component of velocity, over all molecules | m²/s²
\overline{v^2} | mean square speed | m²/s²
:::

::: callout pitfall The mean is zero, the mean square isn't
$\overline{v_x}=0$ because positive and negative values cancel. Squares are never
negative, so $\overline{v_x^2}>0$. Pressure depends on $\overline{v_x^2}$: molecules
moving either way hit some wall.
:::

## Deriving the pressure formula

Pressure is force per area, and force is momentum per time, so
$$p=\frac{\mathrm dI}{\mathrm dt\,\mathrm dS},$$
where $\mathrm dI$ is the total momentum (impulse) the molecules give the wall element
$\mathrm dS$ in a time $\mathrm dt$. Let the wall be perpendicular to the $x$ axis, with
$x$ pointing into it.

**Group the molecules.** Sort them into groups by velocity: group $i$ holds the
molecules whose velocity is (very nearly) $\vec v_i$, with number density $n_i$; all the
groups together make up $n=\sum_i n_i$.

**One collision.** A molecule of group $i$ hits the wall elastically. Its $y$ and $z$
components don't change; its $x$ component flips from $v_{ix}$ to $-v_{ix}$. Its
momentum changes by $-2mv_{ix}$, so by Newton's third law it gives the wall an
impulse $2mv_{ix}$ (here $m$ is the mass of one molecule).

**How many hit in $\mathrm dt$?** A group-$i$ molecule reaches $\mathrm dS$ within
$\mathrm dt$ if it starts inside a slanted prism with base $\mathrm dS$ and edges along
$\vec v_i$, whose depth in the $x$ direction is $v_{ix}\,\mathrm dt$. The prism's volume
is $\mathrm dS\cdot v_{ix}\,\mathrm dt$, so it holds $n_i\,v_{ix}\,\mathrm dt\,\mathrm dS$
molecules of group $i$. Together they give the wall
$$2mv_{ix}\cdot n_iv_{ix}\,\mathrm dt\,\mathrm dS .$$

**Add up the groups.** Only molecules moving *towards* the wall ($v_{ix}>0$) hit it. By
assumption 3 these are exactly half of all the molecules, and the expression is even in
$v_{ix}$, so the sum over $v_{ix}>0$ is half the sum over all groups:
$$\mathrm dI=\sum_{v_{ix}>0}2mn_iv_{ix}^2\,\mathrm dt\,\mathrm dS=\frac12\sum_i2mn_iv_{ix}^2\,\mathrm dt\,\mathrm dS=\sum_i mn_iv_{ix}^2\,\mathrm dt\,\mathrm dS .$$

**Divide.** By definition of the average, $\sum_i n_iv_{ix}^2=n\overline{v_x^2}$. So
$$p=\frac{\mathrm dI}{\mathrm dt\,\mathrm dS}=nm\overline{v_x^2}=\frac13nm\overline{v^2}=\frac23n\left(\frac12m\overline{v^2}\right).$$

(Collisions between molecules don't spoil this: in equilibrium, for every molecule
knocked out of a group another is knocked in, so the groups keep their sizes.)

The bracket is the average kinetic energy of a molecule's motion as a whole:

::: define Mean translational kinetic energy | 分子的平均平动动能
$$\bar\varepsilon_t=\frac12m\overline{v^2},$$
the average, over all the molecules, of the kinetic energy of each molecule's motion
from place to place (translation). Rotation and vibration of the molecule are not
included (Lesson 1.3).
:::

::: theorem Pressure formula of an ideal gas | 理想气体的压强公式
$$p=\frac13nm\overline{v^2}=\frac23n\bar\varepsilon_t$$
The pressure of an ideal gas is two-thirds of the mean translational kinetic energy of
its molecules per unit volume.
:::

::: formula Pressure formula | 压强公式
$$p=\frac13nm\overline{v^2}=\frac23n\bar\varepsilon_t,\qquad\bar\varepsilon_t=\frac12m\overline{v^2}$$
--
p | pressure | Pa
n | number density | m⁻³
m | mass of one molecule | kg
\overline{v^2} | mean square speed | m²/s²
\bar\varepsilon_t | mean translational kinetic energy of a molecule | J
:::

It makes sense: more molecules per volume ($n$) means more hits; faster molecules
($\overline{v^2}$) hit both more often and harder — that's why the speed enters
squared.

::: callout note A statistical law
The formula links a macroscopic quantity ($p$) to averages of microscopic ones ($n$,
$\bar\varepsilon_t$). It holds only for the gas as a whole: "the pressure of one
molecule" means nothing, and on a really tiny area the force fluctuates (Lesson 1.1).
:::

::: example Checking the formula against experiment
Nitrogen ($M=28\times10^{-3}$ kg/mol) at 300 K and 1 atm has
$n=2.45\times10^{25}$ m⁻³. Take its mean square speed as
$\overline{v^2}=3RT/M$ (we derive this below). Does $p=\frac13nm\overline{v^2}$ give
1 atm?
== Mass of one molecule ==
$$m=\frac{M}{N_A}=\frac{28\times10^{-3}}{6.023\times10^{23}}=4.65\times10^{-26}\ \mathrm{kg}.$$
== Mean square speed ==
$$\overline{v^2}=\frac{3\times8.31\times300}{28\times10^{-3}}=2.67\times10^5\ \mathrm{m^2/s^2}\quad(\sqrt{\overline{v^2}}=517\ \mathrm{m/s}).$$
== Pressure ==
$$p=\frac13\times2.45\times10^{25}\times4.65\times10^{-26}\times2.67\times10^5=1.01\times10^5\ \mathrm{Pa}.$$
One atmosphere, from molecules flying at about half a kilometre per second.
:::

## What temperature means

Lesson 1.1 gave the experimental law $p=nkT$; we have just derived
$p=\frac23n\bar\varepsilon_t$. Both describe the same gas, so
$$nkT=\frac23n\bar\varepsilon_t\quad\Rightarrow\quad\bar\varepsilon_t=\frac32kT .$$

::: theorem Microscopic meaning of temperature | 温度的微观意义
The mean translational kinetic energy of the molecules of an ideal gas depends only on
its temperature, and is proportional to the thermodynamic temperature:
$$\bar\varepsilon_t=\frac12m\overline{v^2}=\frac32kT .$$
:::

::: formula Mean translational kinetic energy and temperature | 平均平动动能与温度
$$\bar\varepsilon_t=\frac32kT$$
--
\bar\varepsilon_t | mean translational kinetic energy of a molecule | J
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
T | thermodynamic temperature | K
:::

Notice what is *not* in it: the kind of gas. At the same temperature a hydrogen
molecule and a heavy xenon atom have, on average, the same translational kinetic
energy; the light one just moves faster. And $T=0$ would mean the molecules stop —
classically, that is what absolute zero is (quantum mechanics leaves a small residual
motion).

How to understand temperature, then:

1. Temperature is a quantity that describes the **equilibrium state** of a system
   (Lesson 1.1).
2. It is a **statistical** concept: it measures how violent the random motion of a
   huge number of particles is. The temperature of a single molecule has no meaning.
3. The motion it measures is the **random** motion of the molecules relative to the
   **centre of mass** of the gas: it is a measure of the mean translational kinetic
   energy of that random motion.

::: callout pitfall A moving gas is not a hotter gas
Air in a jet flying at 250 m/s has every molecule moving 250 m/s faster relative to the
ground, but its temperature is unchanged: the ordered motion of the whole is not
thermal motion. Only the random part, measured in the gas's own centre-of-mass frame,
counts.
:::

::: example Oxygen in a container
A container holds oxygen at $p=1.013\times10^5$ Pa and $t=27$ °C. Find (1) the number
of molecules per unit volume; (2) the mass of an oxygen molecule; (3) the mean
translational kinetic energy of a molecule.
== Is it ideal? ==
The pressure is not too high and the temperature not too low, so treat it as an ideal
gas. $T=27+273=300$ K and $M=32\times10^{-3}$ kg/mol.
== (1) Number density ==
$$n=\frac{p}{kT}=\frac{1.013\times10^5}{1.38\times10^{-23}\times300}=2.45\times10^{25}\ \mathrm{m^{-3}}.$$
== (2) Mass of a molecule ==
$$m=\frac{M}{N_A}=\frac{32\times10^{-3}}{6.023\times10^{23}}=5.31\times10^{-26}\ \mathrm{kg}.$$
== (3) Mean translational kinetic energy ==
$$\bar\varepsilon_t=\frac32kT=\frac32\times1.38\times10^{-23}\times300=6.21\times10^{-21}\ \mathrm J.$$
That is about 0.039 eV. Note (3) doesn't depend on the gas being oxygen.
:::

::: example How hot is "one electronvolt"?
At what temperature would the mean translational kinetic energy of gas molecules be
$1\ \mathrm{eV}=1.6\times10^{-19}$ J?
== Solve for T ==
$$T=\frac{2\bar\varepsilon_t}{3k}=\frac{2\times1.6\times10^{-19}}{3\times1.38\times10^{-23}}=7.73\times10^3\ \mathrm K.$$
Room-temperature molecules carry about $1/26$ eV, which is why chemistry (bond energies
of a few eV) needs flames, sparks or catalysts.
:::

## The root-mean-square speed

From $\frac12m\overline{v^2}=\frac32kT$ we can find a typical molecular speed. The
square root of the mean square speed is called the
{{term root-mean-square speed | 方均根速率}}: square every molecule's speed, average,
then take the square root.

::: formula Root-mean-square speed | 方均根速率
$$\sqrt{\overline{v^2}}=\sqrt{\frac{3kT}{m}}=\sqrt{\frac{3RT}{M}}$$
--
\sqrt{\overline{v^2}} | root-mean-square speed | m/s
k | Boltzmann constant | J/K
m | mass of one molecule | kg
R | molar gas constant, 8.31 | J/(mol·K)
M | molar mass | kg/mol
T | temperature | K
:::

The two forms are equal since $k/m=(R/N_A)/(M/N_A)=R/M$. The rms speed is one kind of
**statistical average** of the molecules' speeds; individual molecules have every speed
from nearly zero to several times this. Lesson 1.4 meets two other averages, the mean
speed $\bar v$ and the most probable speed $v_p$, and shows all three are a little
different.

::: example rms speeds of hydrogen and oxygen at 0 °C
Find the rms speeds of H₂ ($M=2.02\times10^{-3}$ kg/mol) and O₂
($M=32\times10^{-3}$ kg/mol) molecules at 0 °C.
== Hydrogen ==
$$\sqrt{\overline{v^2}}=\sqrt{\frac{3RT}{M}}=\sqrt{\frac{3\times8.31\times273.15}{2.02\times10^{-3}}}=1836\ \mathrm{m/s}.$$
== Oxygen ==
$$\sqrt{\overline{v^2}}=\sqrt{\frac{3\times8.31\times273.15}{32\times10^{-3}}}=461.3\ \mathrm{m/s}.$$
== Compare ==
The ratio is $\sqrt{32/2.02}\approx4$: at the same temperature, speed goes as
$1/\sqrt M$. Hydrogen's rms speed is a sixth of Earth's escape speed (11.2 km/s), and
the fastest molecules in the spread reach it: that is one reason Earth's atmosphere has
lost almost all its free hydrogen.
:::

::: callout pitfall Molar mass in kg/mol
In $\sqrt{3RT/M}$, $M$ must be in **kg**/mol: $32\times10^{-3}$, not 32. Using g/mol
makes the speed $\sqrt{1000}\approx32$ times too small. And don't mix forms: $k$ goes
with $m$ (one molecule), $R$ with $M$ (one mole).
:::

::: explore rms speed and mean translational energy
slider T: 10 .. 2000 = 300 | K
slider M: 0.002 .. 0.2 = 0.032 | kg/mol | log
v = sqrt(3 8.31 T / M) | m/s | rms speed
E = 1.5 1.38e-23 T | J | Mean translational kinetic energy
:::

Move $M$ and only the speed changes; move $T$ and both change. Quadrupling $T$
doubles the rms speed.

::: plot rms speed against temperature for H₂, He, N₂ and O₂
x: 0 .. 1000
xlabel: T (K)
ylabel: rms speed (m/s)
h(T) = sqrt(3 8.31 T / 0.00202)
a(T) = sqrt(3 8.31 T / 0.004)
n(T) = sqrt(3 8.31 T / 0.028)
o(T) = sqrt(3 8.31 T / 0.032)
:::

From top to bottom: hydrogen ($h$), helium ($a$), nitrogen ($n$) and oxygen ($o$). Each
curve grows as $\sqrt T$.

## Mixtures: Dalton's law

Air is a mixture; so is the gas in a diver's tank. What is the pressure of a mixture of
ideal gases? Each kind of molecule hits the walls on its own (the molecules don't
interact), so the impulses simply add. If the mixture has number densities
$n_1,n_2,\dots$ of each component,
$$p=\frac23\left(n_1\overline{\varepsilon_{t1}}+n_2\overline{\varepsilon_{t2}}+\cdots\right).$$
In equilibrium all components are at the same temperature, so they all have the same
$\bar\varepsilon_t=\frac32kT$:
$$p=\frac23(n_1+n_2+\cdots)\,\bar\varepsilon_t=\frac23n\bar\varepsilon_t,\qquad n=n_1+n_2+\cdots$$
The same formula as for a pure gas. Each term $p_j=\frac23n_j\bar\varepsilon_t=n_jkT$ is
the pressure component $j$ would exert if it filled the container alone, its
{{term partial pressure | 分压}}.

::: law Dalton's law of partial pressures | 道尔顿分压定律
The pressure of a mixture of ideal gases is the sum of the partial pressures of its
components: $p=p_1+p_2+\cdots$, where each partial pressure $p_j=n_jkT=\nu_jRT/V$ is the
pressure that component would have if it alone filled the whole volume at the same
temperature.
:::

::: formula Dalton's law | 道尔顿分压定律
$$p=p_1+p_2+\cdots,\qquad p_j=n_jkT,\qquad\frac{p_j}{p}=\frac{\nu_j}{\nu}$$
--
p | total pressure of the mixture | Pa
p_j | partial pressure of component $j$ | Pa
n_j | number density of component $j$ | m⁻³
\nu_j / \nu | mole fraction of component $j$ | —
:::

The last form follows by dividing $p_j=\nu_jRT/V$ by $p=\nu RT/V$: a component's share
of the pressure equals its share of the molecules.

::: example Partial pressures in a mixture
A 10 L container at 300 K holds 0.1 mol of helium and 0.2 mol of oxygen. Find the
partial pressures and the total pressure.
== Each component alone ==
$$p_{\text{He}}=\frac{\nu_{\text{He}}RT}{V}=\frac{0.1\times8.31\times300}{10\times10^{-3}}=2.49\times10^4\ \mathrm{Pa},\qquad p_{\text{O}_2}=\frac{0.2\times8.31\times300}{10\times10^{-3}}=4.99\times10^4\ \mathrm{Pa}.$$
== Add ==
$p=p_{\text{He}}+p_{\text{O}_2}=7.48\times10^4$ Pa, the same as $(0.3\text{ mol})RT/V$.
Oxygen has $2/3$ of the molecules and $2/3$ of the pressure.
:::

::: example Breathing gas for a deep-sea diver
Our bodies work normally when the partial pressure of oxygen in the air we breathe is
about 21 kPa: much less and we suffocate, much more and oxygen itself becomes toxic.
Deep-sea divers breathe a mixture of oxygen and **helium**, not nitrogen: nitrogen
dissolves well in blood under pressure and forms bubbles when the diver comes up (the
"bends", gas embolism), while helium dissolves very little.
== At the surface ==
By Dalton's law $\dfrac{p_{\text{O}_2}}{p}=\dfrac{\nu_{\text{O}_2}}{\nu}$. At a total
pressure of about $1.0\times10^5$ Pa, a mole fraction of 21% gives
$p_{\text{O}_2}\approx21$ kPa, as in ordinary air.
== At 40 m depth ==
The diver breathes gas at the surrounding water pressure,
$p=p_0+\rho gh=1.013\times10^5+1000\times9.8\times40=4.93\times10^5$ Pa. To keep
$p_{\text{O}_2}=21$ kPa, the mole fraction of oxygen must be
$$\frac{\nu_{\text{O}_2}}{\nu}=\frac{21\times10^3}{4.93\times10^5}=4.3\%,$$
the rest helium. With 21% oxygen the diver would breathe about 100 kPa of it.
:::

::: callout note What the slide's 21% means
The slide writes $P_{O_2}/P_{总}=\nu_{O_2}/\nu_{总}=21\%$ for the diver's tank. That
ratio gives the needed 21 kPa only at a total pressure of 1 atm. What has to stay fixed
is the **partial pressure**; deeper down, where the total pressure is higher, the
oxygen fraction must be lower, as the example shows.
:::

## Using the ideal-gas law on processes

Two in-class questions closed this section. The first asks for the number of molecules:
from $pV=NkT$, $N=pV/(kT)$. The second uses a handy trick: **along any process of a
fixed amount of ideal gas, $T\propto pV$.** So to see how the temperature changes,
look at how $pV$ changes. On a p–V diagram, the isotherms $pV=$ const are hyperbolas,
higher ones hotter; a process heats the gas when it climbs across them and cools it
when it falls across them.

::: plot A process p = C/V^k against three isotherms
x: 0.5 .. 4
y: 0 .. 10
xlabel: V
ylabel: p
f(V) = 4 / V^k
a(V) = 2 / V
b(V) = 4 / V
c(V) = 8 / V
slider k: 0 .. 3 = 0.5 | | exponent k
:::

The curve $f$ starts at $V=1$, $p=4$, on the middle isotherm $b$. For $p=C/V^k$,
$pV=CV^{1-k}$: with $k<1$ the curve climbs to hotter isotherms as the gas expands, with
$k=1$ it *is* an isotherm, and with $k>1$ it drops to colder ones. (An adiabatic
expansion, $pV^\gamma=$ const with $\gamma>1$, cools the gas for this reason:
Lesson 2.3.)

::: callout exam What exams ask
Fill-in questions: $\bar\varepsilon_t$ at a given temperature, $n$ from $p$ and $T$,
rms speeds or their ratio for two gases, "which has the larger mean translational
kinetic energy" (same $T$: equal). Choice questions on the meaning of temperature
(not for one molecule) and on how $T$ changes along $pV^k=$ const. The derivation of
$p=\frac23n\bar\varepsilon_t$ is a standard "derivation and proof" question: know the
model, the assumptions and the steps.
:::

## Summary

| Quantity | Formula | Depends on |
| --- | --- | --- |
| pressure | $p=\frac13nm\overline{v^2}=\frac23n\bar\varepsilon_t=nkT$ | $n$, $T$ |
| mean translational KE | $\bar\varepsilon_t=\frac12m\overline{v^2}=\frac32kT$ | $T$ only |
| rms speed | $\sqrt{\overline{v^2}}=\sqrt{3kT/m}=\sqrt{3RT/M}$ | $T$ and the gas |
| mixture | $p=\sum p_j$, $p_j=n_jkT$ | each component |

::: cards Pressure and temperature from molecules
What is gas pressure, microscopically? :: The average effect of huge numbers of molecular collisions with the wall: momentum delivered per unit time per unit area
Single-molecule assumptions of the ideal-gas model :: Point masses; no forces except during collisions; perfectly elastic collisions
Statistical assumptions :: Velocities keep changing; molecules uniform in space ($n=\mathrm dN/\mathrm dV$); velocities uniform in direction
Mean and mean square of $v_x$ :: $\overline{v_x}=0$; $\overline{v_x^2}=\overline{v_y^2}=\overline{v_z^2}=\frac13\overline{v^2}$
Impulse from one elastic collision with a wall :: $2mv_x$
Pressure formula :: $p=\frac13nm\overline{v^2}=\frac23n\bar\varepsilon_t$
Mean translational kinetic energy :: $\bar\varepsilon_t=\frac12m\overline{v^2}=\frac32kT$, the same for every gas at the same $T$
Microscopic meaning of temperature :: A measure of the mean translational kinetic energy of the molecules' random motion (in the centre-of-mass frame); meaningless for one molecule
$\bar\varepsilon_t$ at 300 K :: $6.21\times10^{-21}$ J, about 0.039 eV
rms speed :: $\sqrt{\overline{v^2}}=\sqrt{3kT/m}=\sqrt{3RT/M}$
rms speeds at 0 °C :: H₂ 1836 m/s, O₂ 461 m/s
Dalton's law of partial pressures :: $p=p_1+p_2+\cdots$, $p_j=n_jkT$; $p_j/p=\nu_j/\nu$
Why helium for deep diving? :: Helium dissolves little in blood; nitrogen dissolves well under pressure and causes gas embolism
Temperature along a process of an ideal gas :: $T\propto pV$: compare $pV$ at the ends (or which isotherms the curve crosses)
:::

::: quiz Check yourself
? (In class) An ideal gas has volume $V$, pressure $p$ and temperature $T$; one molecule has mass $m$, $k$ is the Boltzmann constant and $R$ the molar gas constant. How many molecules does the gas contain?
- [ ] $pV/m$
- [x] $pV/(kT)$
- [ ] $pV/(RT)$
- [ ] $pV/(mT)$
> $pV=NkT$, so $N=pV/(kT)$. $pV/(RT)$ is the number of **moles** $\nu$, not of
> molecules; the other two don't even have the right units.

? (In class) A fixed amount of ideal gas expands following $pV^2=$ constant. After the expansion its temperature has
- [ ] risen
- [x] fallen
- [ ] it cannot be determined
- [ ] stayed the same
> $p=C/V^2$, so $pV=C/V$, which falls as $V$ grows. Since $T\propto pV$ for a fixed
> amount of ideal gas, $T$ falls. (In the plot above, $k=2$.)

? A container of oxygen is at $1.013\times10^5$ Pa and 27 °C (take $T=300$ K). How many molecules are there per cubic metre?
answer: 2.45e25 m^-3
> $n=p/kT=1.013\times10^5/(1.38\times10^{-23}\times300)=2.45\times10^{25}$ m⁻³.

? What is the mass of one oxygen molecule? ($M=32\times10^{-3}$ kg/mol, $N_A=6.023\times10^{23}$ mol⁻¹)
answer: 5.31e-26 kg
> $m=M/N_A=0.032/6.023\times10^{23}=5.31\times10^{-26}$ kg.

? What is the mean translational kinetic energy of a gas molecule at 27 °C ($T=300$ K)?
answer: 3/2 * k_B * 300 J
> $\bar\varepsilon_t=\frac32kT=1.5\times1.38\times10^{-23}\times300=6.21\times10^{-21}$ J,
> whatever the gas.

? Find the rms speed of hydrogen molecules ($M=2.02\times10^{-3}$ kg/mol) at 0 °C.
answer: 1836 m/s
> $\sqrt{3RT/M}=\sqrt{3\times8.31\times273.15/0.00202}=1836$ m/s.

? Hydrogen ($M=2$ g/mol) and oxygen ($M=32$ g/mol) are at the same temperature. What is the ratio of hydrogen's rms speed to oxygen's?
answer: 4
> $\sqrt{\overline{v^2}}\propto1/\sqrt M$ at fixed $T$, so the ratio is
> $\sqrt{32/2}=4$. Their mean translational kinetic energies are equal.

? At what temperature is the mean translational kinetic energy of gas molecules 1 eV ($1.6\times10^{-19}$ J)?
answer: 7.73e3 K
tolerance: 2%
> $T=2\bar\varepsilon_t/(3k)=2\times1.6\times10^{-19}/(3\times1.38\times10^{-23})=7.73\times10^3$ K.

? Write the pressure of an ideal gas in terms of the number density $n$, the molecular mass $m$ and the mean square speed $w=\overline{v^2}$.
expression: n m w / 3
variables: n, m, w
> From the derivation, $p=nm\overline{v_x^2}=\frac13nm\overline{v^2}$.

? Helium and oxygen are at the same temperature. Which statement is true?
- [x] Their molecules have the same mean translational kinetic energy, but helium's rms speed is larger
- [ ] Oxygen molecules have the larger mean translational kinetic energy, because they are heavier
- [ ] Their molecules have the same rms speed
- [ ] Helium molecules have the larger mean translational kinetic energy, because they move faster
> $\bar\varepsilon_t=\frac32kT$ depends only on $T$, so it is equal. With equal
> $\frac12m\overline{v^2}$, the lighter helium atom moves faster:
> $\sqrt{\overline{v^2}}\propto1/\sqrt M$.

? A diver at 40 m depth breathes gas at $4.93\times10^5$ Pa. What mole fraction of oxygen keeps its partial pressure at 21 kPa?
answer: 0.0426
tolerance: 2%
> By Dalton's law $\nu_{\text{O}_2}/\nu=p_{\text{O}_2}/p=21\times10^3/4.93\times10^5=0.0426$,
> about 4.3%.

? A 10 L container at 300 K holds 0.1 mol of helium and 0.2 mol of oxygen. What is the total pressure?
answer: 7.48e4 Pa
> $p=(\nu_1+\nu_2)RT/V=0.3\times8.31\times300/0.010=7.48\times10^4$ Pa (partial
> pressures $2.49\times10^4$ and $4.99\times10^4$ Pa).
:::

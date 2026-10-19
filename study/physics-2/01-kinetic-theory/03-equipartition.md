---
title: Equipartition of energy and internal energy
zh: 能量按自由度均分定理 理想气体的内能
summary: Degrees of freedom of gas molecules, the equipartition theorem (½kT per degree of freedom), the mean kinetic energy of a molecule, and the internal energy of an ideal gas, which depends on temperature alone.
source: 第13章 气体动理论 §13.3, 2026-09-09
---

Lesson 1.2 found that every gas molecule, whatever its kind, carries on average
$\bar\varepsilon_t=\frac32kT$ of kinetic energy in its motion from place to place. But
molecules are not just points: an oxygen molecule is two atoms joined together, and it
can also **spin**. How much energy goes into spinning? The answer is one of the most
useful rules in thermal physics, the **equipartition theorem**: at temperature $T$,
energy is shared out equally among all the independent ways a molecule can move, and
each way gets $\frac12kT$. Counting those "ways" (degrees of freedom) then gives the
total energy stored in a gas, its **internal energy** $E$ — the quantity the first law
of thermodynamics (Unit 2) keeps track of in every process.

## Degrees of freedom

### Counting coordinates

Ask a simple question: how many numbers do you need to say *where* something is and
*how it is turned*?

- A bead on a straight wire: one number (its position $x$ along the wire).
- A puck on a table: two numbers ($x$, $y$).
- A fly in a room: three numbers ($x$, $y$, $z$).

Each independent number is one way the object can move, so each one is a
**degree of freedom**.

::: define Degree of freedom | 自由度
The number of **independent coordinates** needed to fix the position (and, for a
body with size, the orientation) of an object. For a gas molecule it is written $i$:
$i=t+r$, the translational degrees of freedom $t$ plus the rotational degrees of
freedom $r$.
:::

Here $t$ counts the {{term translational degrees of freedom | 平动自由度}} (where the
centre of mass is) and $r$ the {{term rotational degrees of freedom | 转动自由度}}
(which way the molecule points). Any molecule's centre of mass moves in three
dimensions, so $t=3$ always. What changes from gas to gas is $r$.

### The three kinds of ideal-gas molecule

**Monatomic molecules** (He, Ne, Ar, …) are single atoms. Treated as points, they
only need their centre's position $C(x,y,z)$: $t=3$, $r=0$, so $i=3$.

**Diatomic molecules** (H₂, N₂, O₂, CO, air) look like a dumbbell: two atoms on a
rigid rod. Three numbers fix the centre $C(x,y,z)$. To say which way the rod points
you need its direction, given by the angles $\alpha,\beta,\gamma$ it makes with the
axes — but only two of them are independent, because
$\cos^2\alpha+\cos^2\beta+\cos^2\gamma=1$. Spinning the dumbbell about its own axis
changes nothing you can see (the atoms are, to a very good approximation, points on
that axis), so that rotation doesn't count. So $t=3$, $r=2$, $i=5$.

**Polyatomic molecules** (H₂O, CH₄, NH₃) have three or more atoms that are not all in
one line: three numbers for the centre, two for the direction of an
axis through the molecule, and one more, an angle $\theta$, for how far the molecule
is turned about that axis. So $t=3$, $r=3$, $i=6$.

| Molecule | Examples | Translational $t$ | Rotational $r$ | Total $i=t+r$ |
| --- | --- | --- | --- | --- |
| Monatomic | He, Ne, Ar | 3 | 0 | 3 |
| Rigid diatomic | H₂, N₂, O₂, air | 3 | 2 | 5 |
| Rigid polyatomic (non-linear) | H₂O, CH₄, NH₃ | 3 | 3 | 6 |

::: callout note Rigid molecules, and the CO₂ exception
These counts assume **rigid** molecules: the atoms keep fixed distances, so there is
no vibration. That is how this course treats gases, and it matches experiment well
at room temperature. At high temperatures the bonds start to vibrate and the
molecule gains extra degrees of freedom. A *linear* polyatomic molecule such as CO₂
($\mathrm{O{=}C{=}O}$) is like a long dumbbell, so as a rigid molecule it has $i=5$,
not 6. Exam problems that say "polyatomic" mean the non-linear $i=6$ case.
:::

::: callout pitfall i is fixed by the kind of molecule, not by the problem
"Hydrogen", "nitrogen", "oxygen" and "air" are all diatomic: $i=5$. Helium, neon and
argon are monatomic: $i=3$. Water vapour, methane and ammonia: $i=6$. Read the gas
first and write down $i$ before anything else.
:::

## The equipartition theorem

### Where the ½kT comes from

Start with what Lesson 1.2 proved for motion from place to place:
$$\bar\varepsilon_t=\frac12m\overline{v^2}=\frac32kT.$$
The speed squared splits into its three parts, $v^2=v_x^2+v_y^2+v_z^2$, so
$\overline{v_x^2}+\overline{v_y^2}+\overline{v_z^2}=\overline{v^2}$. In equilibrium the
gas has no favourite direction, so the three averages are equal:
$\overline{v_x^2}=\overline{v_y^2}=\overline{v_z^2}=\frac13\overline{v^2}$. Therefore
$$\frac12m\overline{v_x^2}=\frac12m\overline{v_y^2}=\frac12m\overline{v_z^2}=\frac13\left(\frac32kT\right)=\frac12kT.$$

So the $\frac32kT$ is really $3\times\frac12kT$: each of the three translational
degrees of freedom carries $\frac12kT$. Collisions keep shuffling energy between
moving and spinning, and there is no reason for them to favour one kind of motion
over another. Classical statistical physics (Boltzmann) shows that the same share
goes to every rotational degree of freedom too.

::: theorem Equipartition theorem | 能量按自由度均分定理
In an equilibrium state at temperature $T$, every degree of freedom of a gas molecule
has the same mean kinetic energy, $\frac12kT$.
:::

Here $k=1.38\times10^{-23}\ \mathrm{J/K}$ is Boltzmann's constant (Lesson 1.1). The
theorem is about **averages** over many molecules: one molecule at one moment can have
any energy at all.

### The mean kinetic energy of a molecule

Add up $\frac12kT$ for each of the $i$ degrees of freedom:

::: formula Mean kinetic energy of a molecule | 分子的平均总动能
$$\bar\varepsilon_k=\frac i2kT$$
--
\bar\varepsilon_k | mean total kinetic energy of one molecule (translation + rotation) | J
i | degrees of freedom: 3 (monatomic), 5 (diatomic), 6 (polyatomic) | —
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
T | thermodynamic temperature | K
:::

- Monatomic: $\bar\varepsilon_k=\frac32kT$ (all of it is translation).
- Diatomic: $\bar\varepsilon_k=\frac52kT$ ($\frac32kT$ translation + $kT$ rotation).
- Polyatomic: $\bar\varepsilon_k=3kT$ ($\frac32kT$ translation + $\frac32kT$ rotation).

::: callout key Same T means same translational energy — not the same total energy
At the same temperature **every** gas has the same $\bar\varepsilon_t=\frac32kT$. The
**total** mean kinetic energy $\frac i2kT$ is larger for molecules with more degrees of
freedom. Helium and oxygen at the same $T$: equal $\bar\varepsilon_t$, but oxygen's
$\bar\varepsilon_k$ is $\frac53$ of helium's.
:::

The slides also mention that equipartition "extends to vibration". For a vibrating
bond each vibrational degree of freedom carries $\frac12kT$ of kinetic energy *and*
$\frac12kT$ of potential energy (the stretched bond is like a spring). Since this
course treats molecules as rigid, there is no vibration and no potential energy inside
the molecule, so a molecule's **mean energy** is just its mean total kinetic energy
$\frac i2kT$.

::: example Energies of oxygen at 30 °C
Find, for oxygen at $30\ ^\circ\mathrm C$: (1) the mean translational kinetic energy of a
molecule; (2) its mean (total) kinetic energy and mean energy; (3) the internal energy
of $4\times10^{-3}$ kg of the gas. Use $k=1.38\times10^{-23}$ J/K and $R=8.31$ J/(mol·K).
== Temperature and degrees of freedom ==
$T=30+273.15=303.15$ K. Oxygen, O₂, is diatomic: $i=5$.
== Mean translational kinetic energy ==
$$\bar\varepsilon_t=\frac32kT=1.5\times1.38\times10^{-23}\times303.15=6.28\times10^{-21}\ \mathrm J.$$
== Mean kinetic energy and mean energy ==
$$\bar\varepsilon_k=\frac52kT=2.5\times1.38\times10^{-23}\times303.15=1.05\times10^{-20}\ \mathrm J.$$
A rigid molecule has no vibrational (potential) energy, so its mean energy is the same,
$1.05\times10^{-20}$ J.
== Internal energy ==
The molar mass of O₂ is $M=32\ \mathrm{g/mol}=0.032$ kg/mol, so
$\nu=\dfrac{4\times10^{-3}}{0.032}=0.125$ mol. With the formula of the next section,
$$E=\frac52\nu RT=2.5\times0.125\times8.31\times303.15=7.87\times10^2\ \mathrm J.$$
(The slide sets this example without a solution; rounding $T$ to 303 K changes only the
last digit.)
:::

## The internal energy of an ideal gas

### What internal energy is

A gas's {{term internal energy | 内能}} $E$ is the total energy of all its molecules'
random motion and interactions, measured in the frame where the gas as a whole is at
rest. (A gas in a moving train has extra kinetic energy as a whole; that is not internal
energy.) In a real gas it has two parts: the molecules' kinetic energies and the
potential energy of the forces between molecules.

In an **ideal gas** the molecules don't attract or repel each other except in collisions
(Lesson 1.1), so there is no potential energy between them. With rigid molecules there is
no vibration either. What's left is simply the sum of all the molecules' kinetic energies:
$N$ molecules, each with $\frac i2kT$ on average.

$$E=N\bar\varepsilon_k=N\cdot\frac i2kT=\nu N_A\cdot\frac i2kT=\frac i2\nu RT,$$
using $N=\nu N_A$ and $N_Ak=R$ (Lesson 1.1).

::: formula Internal energy of an ideal gas | 理想气体的内能
$$E=\frac i2\nu RT=\frac i2\frac{m_{\text{gas}}}{M}RT$$
--
E | internal energy of the gas | J
i | degrees of freedom of one molecule | —
\nu | amount of gas, $\nu=m_{\text{gas}}/M$ | mol
m_{\text{gas}} | mass of the whole gas | kg
M | molar mass | kg/mol
R | molar gas constant, $8.31$ | J/(mol·K)
T | thermodynamic temperature | K
:::

So for $\nu$ moles:

- monatomic: $E=\frac32\nu RT$;
- diatomic: $E=\frac52\nu RT$;
- polyatomic: $E=3\nu RT$.

Many textbooks write internal energy as $U$; this course and its textbook use $E$.

::: law Internal energy depends only on temperature | 理想气体内能是温度的单值函数
The internal energy of a given ideal gas is a function of its temperature alone. It
does not depend on the pressure or the volume.
:::

This is the most important conclusion of the lesson. Squeeze an ideal gas into half the
volume while keeping it at the same temperature: its internal energy does not change. Heat
it by $\Delta T$, by any route at all, and its internal energy changes by
$$\Delta E=\frac i2\nu R\,\Delta T.$$
Unit 2 uses this again and again: $\Delta E$ depends only on the start and end
temperatures, never on the path.

Because $pV=\nu RT$, the internal energy can also be written from pressure and volume:
$$E=\frac i2pV.$$
That is handy when a problem gives $p$ and $V$ but no temperature.

::: callout pitfall k or R? m or M?
$\frac i2kT$ is the energy of **one molecule** (with $k$). $\frac i2\nu RT$ is the energy
of **$\nu$ moles** (with $R$). Mixing them gives answers off by $6\times10^{23}$. In the
same way, $m$ is the mass of one molecule and $M$ the molar mass; to find $\nu$, divide
the gas's mass by $M$, in kg/mol (oxygen: $0.032$, not 32).
:::

::: callout pitfall Kelvin, always
$E\propto T$ only when $T$ is in kelvin. At $0\ ^\circ\mathrm C$ the gas still has plenty
of internal energy; doubling "°C" from 20 °C to 40 °C does not double $E$
($293\to313$ K is about 7% more).
:::

::: example Same temperature, different gases
Two moles of helium, two of nitrogen and two of methane (CH₄) are each at $27\ ^\circ\mathrm C$.
Find each internal energy. ($R=8.31$ J/(mol·K).)
== Temperature ==
$T=27+273=300$ K, $\nu=2$ mol for each gas.
== Helium (i = 3) ==
$E=\frac32\times2\times8.31\times300=7.48\times10^3$ J.
== Nitrogen (i = 5) ==
$E=\frac52\times2\times8.31\times300=1.25\times10^4$ J.
== Methane (i = 6) ==
$E=3\times2\times8.31\times300=1.50\times10^4$ J.
== What it shows ==
The same amount of gas at the same temperature stores more energy when its molecules
can also rotate: the extra energy is in the rotation. Their mean *translational* energy
per molecule, $\frac32kT$, is the same for all three.
:::

::: example The air in a room
A room of $50\ \mathrm{m^3}$ is full of air at $1.013\times10^5$ Pa. What is the internal
energy of the air? Does it change if the room warms up while air leaks out through the
gaps, so that the pressure stays the same?
== Use E = (i/2)pV ==
Air is mostly N₂ and O₂: diatomic, $i=5$.
$$E=\frac52pV=2.5\times1.013\times10^5\times50=1.27\times10^7\ \mathrm J.$$
== Warming at constant pressure ==
$E=\frac52pV$ depends only on $p$ and $V$, and both stay the same (the room's volume and
the outside pressure). So the internal energy of the air **in the room** does not change:
each molecule gets more energetic, but some molecules leave. The temperature went up,
but $\nu$ went down in proportion.
:::

The explorer shows $E=\frac i2\nu RT$ at work. Change $i$ and watch the energy jump in
steps of $\frac12\nu RT$; change $T$ and it grows in proportion.

::: explore Internal energy of an ideal gas
slider i: 3 .. 6 = 5 | | step 1
slider nu: 0.1 .. 10 = 1 | mol | amount ν
slider T: 50 .. 1000 = 300 | K
E = i/2 * nu * 8.31 * T | J | Internal energy E
et = 1.5 * 1.38e-23 * T | J | Mean translational kinetic energy per molecule
ek = i/2 * 1.38e-23 * T | J | Mean kinetic energy per molecule
:::

Plotted against temperature, internal energy is a straight line through the origin for
every gas: the slope is $\frac i2\nu R$, steeper for molecules with more degrees of freedom.

::: plot Internal energy against temperature for one amount of gas
x: 0 .. 600
xlabel: T (K)
ylabel: E (J)
mono(T) = 3/2 nu 8.31 T
di(T) = 5/2 nu 8.31 T
poly(T) = 3 nu 8.31 T
slider nu: 0.5 .. 5 = 1 | mol | amount ν
:::

::: callout exam What exams ask
- Which energies are equal for two gases at the same $T$ (and possibly the same $p$):
  $\bar\varepsilon_t$ yes, $\bar\varepsilon_k$ only if they have the same $i$.
- The internal energy of a mixture: add each component's $N\frac i2kT$ (or
  $\nu\frac i2RT$).
- $\Delta E=\frac i2\nu R\Delta T$ in any process — needed in nearly every Unit 2 problem.
- Ratios: two gases with the same $p$ and $V$ have internal energies in the ratio of
  their $i$ (since $E=\frac i2pV$).
:::

::: cards Equipartition and internal energy
Degrees of freedom $i$ :: The number of independent coordinates fixing a molecule's position and orientation; $i=t+r$ (自由度)
$i$ for a monatomic molecule :: 3 (translation only)
$i$ for a rigid diatomic molecule :: 5 ($t=3$, $r=2$)
$i$ for a rigid polyatomic molecule :: 6 ($t=3$, $r=3$)
Equipartition theorem :: In equilibrium at $T$, every degree of freedom has mean kinetic energy $\frac12kT$ (能量按自由度均分定理)
Mean kinetic energy of a molecule :: $\bar\varepsilon_k=\frac i2kT$
Mean translational kinetic energy :: $\frac32kT$, the same for every gas at the same $T$
Internal energy of an ideal gas :: $E=\frac i2\nu RT$ (理想气体的内能)
$E$ of an ideal gas in terms of $p$ and $V$ :: $E=\frac i2pV$
What does an ideal gas's internal energy depend on? :: Only its temperature (for a given gas), not on $p$ or $V$
Change of internal energy :: $\Delta E=\frac i2\nu R\Delta T$, by any path
Why does an ideal gas have no potential energy? :: Its molecules exert no forces on each other except in collisions; rigid molecules don't vibrate either
:::

::: quiz Check yourself
? Helium and oxygen are at the same temperature and pressure. How do their molecules' mean kinetic energy $\bar\varepsilon$ and mean translational kinetic energy $\bar\varepsilon_t$ compare?
- [ ] Both $\bar\varepsilon$ and $\bar\varepsilon_t$ are equal.
- [ ] $\bar\varepsilon$ is equal, $\bar\varepsilon_t$ is not.
- [x] $\bar\varepsilon_t$ is equal, $\bar\varepsilon$ is not.
- [ ] Neither is equal.
> Same $T$ gives the same $\bar\varepsilon_t=\frac32kT$ for every gas. But helium is monatomic ($\bar\varepsilon=\frac32kT$) and oxygen diatomic ($\bar\varepsilon=\frac52kT$), so $\bar\varepsilon$ differs. The pressure plays no part. (Answer C on the slide.)

? A container holds $N_1$ monatomic and $N_2$ rigid diatomic ideal-gas molecules in equilibrium at temperature $T$. Its internal energy is
- [ ] $(N_1+N_2)\left(\frac32kT+\frac52kT\right)$
- [ ] $\frac12(N_1+N_2)\left(\frac32kT+\frac52kT\right)$
- [x] $N_1\cdot\frac32kT+N_2\cdot\frac52kT$
- [ ] $N_1\cdot\frac52kT+N_2\cdot\frac32kT$
> Each kind of molecule keeps its own $\frac i2kT$: $N_1$ molecules with $i=3$ and $N_2$ with $i=5$. Add them: $E=N_1\cdot\frac32kT+N_2\cdot\frac52kT$. (Answer C on the slide.)

? What is the mean translational kinetic energy of an oxygen molecule at $30\ ^\circ\mathrm C$? (Use $k=1.38\times10^{-23}$ J/K.)
answer: 6.28e-21 J
tolerance: 1%
> $\bar\varepsilon_t=\frac32kT=1.5\times1.38\times10^{-23}\times303.15=6.28\times10^{-21}$ J.

? What is the mean kinetic energy of an oxygen molecule at $30\ ^\circ\mathrm C$?
answer: 1.05e-20 J
tolerance: 1%
> O₂ is diatomic, $i=5$: $\bar\varepsilon_k=\frac52kT=2.5\times1.38\times10^{-23}\times303.15=1.05\times10^{-20}$ J.

? What is the internal energy of $4\times10^{-3}$ kg of oxygen at $30\ ^\circ\mathrm C$? ($R=8.31$ J/(mol·K))
answer: 787 J
tolerance: 1%
> $\nu=0.004/0.032=0.125$ mol, $i=5$: $E=\frac52\nu RT=2.5\times0.125\times8.31\times303.15\approx787$ J.

? One mole of oxygen is heated from 300 K to 310 K. By how much does its internal energy increase?
answer: 5/2 * 8.31 * 10 J
tolerance: 1%
> $\Delta E=\frac i2\nu R\Delta T=\frac52\times1\times8.31\times10=208$ J, whatever the process.

? A rigid diatomic gas has pressure $p$ and volume $V$. Write its internal energy.
expression: 5/2 p V
variables: p, V
> $E=\frac i2\nu RT$ and $\nu RT=pV$, so $E=\frac52pV$.

? Equal volumes of helium and hydrogen are at the same pressure. What is the ratio $E_{\text{He}}/E_{\text{H}_2}$ of their internal energies?
answer: 3/5
> $E=\frac i2pV$ with the same $pV$: the ratio is $i_{\text{He}}/i_{\text{H}_2}=3/5$.

? An ideal gas is compressed to half its volume while its temperature is kept constant. What happens to its internal energy?
- [ ] It doubles.
- [ ] It halves.
- [x] It stays the same.
- [ ] It depends on whether the gas is monatomic or diatomic.
> An ideal gas's internal energy depends only on $T$. The temperature didn't change, so neither did $E$ (the pressure doubled instead).

? How many rotational degrees of freedom does a rigid diatomic molecule have?
answer: 2
> Two angles fix the direction of the dumbbell's axis; spinning about the axis itself doesn't count. So $r=2$ and $i=3+2=5$.
:::

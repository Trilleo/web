---
title: Mean free path and collision frequency
zh: 平均自由程与平均碰撞频率
summary: Why molecules that move at hundreds of metres per second spread slowly — the hard-sphere model, the mean collision frequency z̄ = √2πd²v̄n, the mean free path λ̄ = kT/(√2πd²p), and how both change with temperature and pressure.
source: 第13章 气体动理论 平均自由程, 2026-09-11
---

Lesson 1.4 showed that air molecules move at around 450 m/s. Then why does the smell
of coffee take seconds or minutes to cross a room, instead of a hundredth of a second?
Because no molecule gets far in a straight line: it collides with another molecule, is
knocked aside, collides again, billions of times a second. Its path is a zig-zag of very
short straight pieces. This lesson measures those pieces: the **mean free path**
$\bar\lambda$ (how far a molecule goes between collisions) and the **mean collision
frequency** $\bar z$ (how often it collides). Collisions are also what drives a gas to
equilibrium in the first place, and they set how fast gases conduct heat, diffuse and
resist flow.

## Collisions and the hard-sphere model

### Why collisions matter

A gas that is not in equilibrium — hotter on one side, or just let into a box — gets to
equilibrium by **collisions**: they share energy and momentum between molecules until
the Maxwell distribution of Lesson 1.4 is reached everywhere. This takes time; the time a
system needs to settle into equilibrium after a disturbance is called the
{{term relaxation time | 弛豫时间}}. How quickly molecules collide therefore sets how
quickly a gas "forgets" a disturbance.

### The model

Real molecules repel strongly when they get very close and attract weakly further out.
To count collisions we use a simpler picture:

::: define Hard-sphere model without attraction | 无引力的弹性刚球模型
1. A molecule is a rigid little ball of **effective diameter** $d$.
2. Collisions are elastic. While two molecules are far apart there is no force between
   them, and each moves in a straight line at constant speed. When the distance between
   their **centres** shrinks to $d$, an infinitely strong repulsion stops them coming any
   closer and turns them aside: that is a collision.
3. To count the collisions of one molecule, we pretend all the others stand still and
   let it move through them with the mean **relative** speed $\bar u$.
:::

The {{term effective diameter | 有效直径}} $d$ is the closest distance between the
centres of two colliding molecules. It is about $10^{-10}$ m (a few tenths of a
nanometre) for most gases.

## Free path, mean free path and collision frequency

::: define Free path | 自由程
The distance a molecule travels between two successive collisions.
:::

Free paths are random: one may be ten times longer than the next. So we average.

::: define Mean free path | 平均自由程
$\bar\lambda$: the average of the free paths of the gas's molecules between two
successive collisions.
:::

::: define Mean collision frequency | 平均碰撞频率
$\bar z$: the average number of collisions one molecule has per unit time (also called
the mean number of collisions, 平均碰撞次数).
:::

The two are tied together by the mean speed $\bar v$. In a time $t$ a molecule travels
a total distance $\bar vt$ and collides $\bar zt$ times, so each free stretch is on average

::: formula Mean free path and collision frequency | 平均自由程与平均碰撞频率的关系
$$\bar\lambda=\frac{\bar vt}{\bar zt}=\frac{\bar v}{\bar z}$$
--
\bar\lambda | mean free path | m
\bar v | mean speed of the molecules, $\sqrt{8RT/\pi M}$ (Lesson 1.4) | m/s
\bar z | mean collision frequency | s⁻¹
:::

So we only need to find $\bar z$.

## Deriving the collision frequency

Follow one molecule, A, for a time $t$, with all the others frozen in place. Its centre
moves along a zig-zag line of total length $\bar ut$ (relative speed × time).

Now draw a tube around that line: a cylinder of **radius $d$**, bent wherever A's path
bends. Any molecule whose **centre** lies inside the tube comes within $d$ of A's centre
at some moment, so A hits it (like molecule C in the slide's picture). A molecule whose
centre is outside the tube, even if its edge pokes in (like B), is missed. So:

- The cross-section of the tube is the {{term collision cross-section | 碰撞截面}}
  $$\sigma=\pi d^2.$$
- Its volume is $\sigma\bar ut$, and with $n$ molecules per unit volume it holds
  $\sigma\bar ut\,n$ centres: the number of collisions in time $t$.
- Per unit time: $\bar z=\dfrac{\sigma\bar ut\,n}{t}=\pi d^2n\bar u$.

The other molecules don't really stand still. Two molecules moving in random directions
approach each other on average faster than either moves alone; for Maxwell's distribution
the mean relative speed is $\bar u=\sqrt2\,\bar v$. (The slides take this without proof:
roughly, the mean square of a difference of two independent random velocities is the sum
of their mean squares, $2\overline{v^2}$.)

::: formula Mean collision frequency | 平均碰撞频率
$$\bar z=\sqrt2\,\pi d^2\bar v\,n$$
--
\bar z | mean number of collisions per molecule per second | s⁻¹
d | effective diameter of a molecule | m
\bar v | mean speed, $\sqrt{8RT/\pi M}\approx1.60\sqrt{RT/M}$ | m/s
n | number density of molecules | m⁻³
:::

::: callout pitfall Diameter, not radius; and don't drop the √2
The tube's radius is the molecule's **diameter** $d$, because two balls touch when their
centres are $d$ apart (radius + radius). So $\sigma=\pi d^2$, not $\pi(d/2)^2$. And the
$\sqrt2$ is there because all molecules move; leaving it out overestimates $\bar\lambda$ by
41%.
:::

## The mean free path

Divide: $\bar\lambda=\bar v/\bar z$. The mean speed cancels, and $p=nkT$ (Lesson 1.1)
turns $n$ into things you can measure:

::: formula Mean free path | 平均自由程
$$\bar\lambda=\frac{1}{\sqrt2\,\pi d^2n}=\frac{kT}{\sqrt2\,\pi d^2p}$$
--
\bar\lambda | mean free path | m
d | effective diameter of a molecule | m
n | number density | m⁻³
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
T | thermodynamic temperature | K
p | pressure | Pa
:::

What it says:

- $\bar\lambda$ depends only on **how crowded** the gas is ($n$) and how big the molecules
  are ($d$), **not** on their speed. Faster molecules collide more often but also cover
  more ground between collisions; the two effects cancel.
- At constant $T$: $\bar\lambda\propto1/p$. Halve the pressure and molecules go twice as far.
- At constant $p$: $\bar\lambda\propto T$ (heating at constant pressure thins the gas out).

::: callout key Orders of magnitude
At standard conditions most gases have $\bar\lambda\sim10^{-8}$–$10^{-7}$ m (hydrogen,
with its small molecules, about $10^{-7}$ m). That is hundreds of times the molecular
diameter $d\sim10^{-10}$ m, so molecules really are far apart compared with their size —
the ideal-gas picture of Lesson 1.2 holds. With $\bar v\sim500$ m/s,
$\bar z=\bar v/\bar\lambda\sim10^9$–$10^{10}$ s⁻¹: **every molecule collides billions of
times each second.**
:::

::: example Air at normal pressure and in a vacuum
Estimate the mean free path of air molecules at 273.15 K (1) at $1.013\times10^5$ Pa,
(2) at $1.333\times10^{-3}$ Pa. Take the effective diameter $d=3.10\times10^{-10}$ m. In
case (1), how often does a molecule collide? ($M=29$ g/mol, $R=8.31$ J/(mol·K))
== Formula ==
Both pressure and temperature are given, so use $\bar\lambda=\dfrac{kT}{\sqrt2\,\pi d^2p}$.
Common factor: $\sqrt2\,\pi d^2=\sqrt2\times\pi\times(3.10\times10^{-10})^2=4.27\times10^{-19}\ \mathrm{m^2}$.
== Normal pressure ==
$$\bar\lambda_1=\frac{1.38\times10^{-23}\times273.15}{4.27\times10^{-19}\times1.013\times10^5}=8.71\times10^{-8}\ \mathrm m.$$
== High vacuum ==
$$\bar\lambda_2=\frac{1.38\times10^{-23}\times273.15}{4.27\times10^{-19}\times1.333\times10^{-3}}=6.62\ \mathrm m.$$
The pressure is $7.6\times10^7$ times lower, so the path is that many times longer.
== Collision frequency ==
$\bar v=\sqrt{\dfrac{8RT}{\pi M}}=\sqrt{\dfrac{8\times8.31\times273.15}{\pi\times0.029}}=446$ m/s, so
$$\bar z_1=\frac{\bar v}{\bar\lambda_1}=\frac{446}{8.71\times10^{-8}}=5.1\times10^9\ \mathrm{s^{-1}}.$$
:::

::: callout note When the free path beats the container
In case (2), 6.6 m is longer than any ordinary vacuum vessel. Molecules then fly from wall
to wall almost without meeting each other: the "free path" is really set by the
container. That is why the molecular beams of Lesson 1.4 need a high vacuum, and why a
vacuum is a good heat insulator (a vacuum flask).
:::

::: example Nitrogen at room conditions
For nitrogen at 300 K and $1.013\times10^5$ Pa, with $d=3.7\times10^{-10}$ m, find $n$,
$\bar\lambda$ and $\bar z$, and compare $\bar\lambda$ with $d$. ($M=28$ g/mol)
== Number density ==
$n=\dfrac{p}{kT}=\dfrac{1.013\times10^5}{1.38\times10^{-23}\times300}=2.45\times10^{25}\ \mathrm{m^{-3}}$.
== Mean free path ==
$$\bar\lambda=\frac{1}{\sqrt2\,\pi d^2n}=\frac{1}{\sqrt2\times\pi\times(3.7\times10^{-10})^2\times2.45\times10^{25}}=6.7\times10^{-8}\ \mathrm m,$$
about 180 molecular diameters.
== Collision frequency ==
$\bar v=\sqrt{8\times8.31\times300/(\pi\times0.028)}=476$ m/s, so
$\bar z=\bar v/\bar\lambda=476/(6.7\times10^{-8})=7.1\times10^9\ \mathrm{s^{-1}}$.
:::

Play with the numbers: the pressure slider covers everything from a good vacuum to ten
atmospheres.

::: explore Mean free path and collision frequency
slider T: 100 .. 1000 = 273 | K
slider p: 1e-4 .. 1e6 = 101300 | Pa | log
slider d: 1 .. 5 = 3.1 | ×10⁻¹⁰ m | effective diameter
slider M: 2 .. 100 = 29 | g/mol | molar mass
n = p / (1.38e-23 * T) | m^-3 | Number density
lam = 1.38e-23 * T / (sqrt(2) * pi * (d*1e-10)^2 * p) | m | Mean free path λ̄
v = sqrt(8 * 8.31 * T / (pi * M/1000)) | m/s | Mean speed v̄
z = v / lam | s^-1 | Mean collision frequency z̄
:::

## How z̄ and λ̄ change with temperature

Exam questions ask what happens to $\bar z$ and $\bar\lambda$ when one thing changes and
another is held fixed. Always go back to
$$\bar z=\sqrt2\,\pi d^2\bar vn,\qquad \bar v\approx1.60\sqrt{\frac{RT}{M}},\qquad \bar\lambda=\frac{1}{\sqrt2\,\pi d^2n},\qquad n=\frac{p}{kT},$$
and ask which of $n$ and $\bar v$ change.

- **Constant volume** (a closed rigid container): $n=N/V$ is fixed, so $\bar\lambda$ is
  unchanged whatever the temperature, while $\bar z\propto\bar v\propto\sqrt T$.
- **Constant pressure**: $n=p/kT\propto1/T$, so $\bar\lambda\propto T$, and
  $\bar z\propto\bar v\,n\propto\sqrt T/T=1/\sqrt T$.

::: plot Collision frequency of air against temperature (d = 3.1×10⁻¹⁰ m; both start at 1 atm and 273 K)
x: 100 .. 1000
xlabel: T (K)
ylabel: z̄ (10⁹ s⁻¹)
constV(T) = sqrt(2) pi (3.1e-10)^2 (101300/(1.38e-23*273)) sqrt(8*8.31*T/(pi*0.029)) / 1e9
constp(T) = sqrt(2) pi (3.1e-10)^2 (p/(1.38e-23*T)) sqrt(8*8.31*T/(pi*0.029)) / 1e9
slider p: 20000 .. 300000 = 101300 | Pa | pressure for the constant-p curve
:::

At constant volume (constV) the curve rises like $\sqrt T$: same crowding, faster
molecules. At constant pressure (constp) it falls like $1/\sqrt T$: the gas expands, and the
thinning wins over the extra speed.

::: example Heating a sealed container
A fixed mass of ideal gas is kept at constant volume and heated from 300 K to 1200 K. How
do $\bar z$ and $\bar\lambda$ change?
== What stays fixed ==
Fixed mass and volume: $n=N/V$ is constant, and so is $\bar\lambda=1/(\sqrt2\,\pi d^2n)$.
== What changes ==
$\bar v\propto\sqrt T$ doubles ($\sqrt{1200/300}=2$), so $\bar z=\sqrt2\,\pi d^2\bar vn$
doubles.
== Answer ==
$\bar z$ increases (×2), $\bar\lambda$ stays the same — choice A of the slides' 例2.
:::

::: callout pitfall "Temperature goes up, so molecules collide less often"?
Not in general. Whether $\bar z$ rises or falls with $T$ depends on what is held fixed:
$\propto\sqrt T$ at constant $V$, $\propto1/\sqrt T$ at constant $p$. Write down $n$ first.
Likewise, $\bar\lambda$ never depends on speed directly — only on $n$.
:::

::: callout exam What exams ask
- Choice questions: how $\bar z$ and $\bar\lambda$ change when $T$ rises at constant $V$ or
  constant $p$, or when $p$ changes at constant $T$.
- A numerical $\bar\lambda=kT/(\sqrt2\pi d^2p)$, often for a vacuum, then
  $\bar z=\bar v/\bar\lambda$.
- The meaning of $\sigma=\pi d^2$ and of the $\sqrt2$.
:::

::: cards Mean free path
Relaxation time :: The time a system takes to reach equilibrium after a disturbance; collisions do the work (弛豫时间)
Effective diameter $d$ :: The distance between the centres of two molecules at the moment they collide (有效直径)
Free path :: The distance a molecule travels between two successive collisions (自由程)
Mean free path $\bar\lambda$ :: The average distance between successive collisions (平均自由程)
Mean collision frequency $\bar z$ :: The average number of collisions a molecule has per unit time (平均碰撞频率)
$\bar\lambda$ in terms of $\bar v$ and $\bar z$ :: $\bar\lambda=\bar v/\bar z$
Collision cross-section :: $\sigma=\pi d^2$ (碰撞截面)
Mean collision frequency formula :: $\bar z=\sqrt2\,\pi d^2\bar vn$
Mean free path formula :: $\bar\lambda=\dfrac{1}{\sqrt2\,\pi d^2n}=\dfrac{kT}{\sqrt2\,\pi d^2p}$
Where does the $\sqrt2$ come from? :: The mean relative speed of two molecules is $\bar u=\sqrt2\,\bar v$
Typical $\bar\lambda$ and $\bar z$ at standard conditions :: $\bar\lambda\sim10^{-8}$–$10^{-7}$ m, $\bar z\sim10^9$ s⁻¹
$\bar\lambda$ at constant $T$ / constant $p$ :: $\propto1/p$ / $\propto T$
:::

::: quiz Check yourself
? What is the mean free path of air molecules at 273.15 K and $1.013\times10^5$ Pa, with $d=3.10\times10^{-10}$ m?
answer: 8.71e-8 m
tolerance: 1%
> $\bar\lambda=\dfrac{kT}{\sqrt2\pi d^2p}=\dfrac{1.38\times10^{-23}\times273.15}{\sqrt2\pi(3.10\times10^{-10})^2\times1.013\times10^5}=8.71\times10^{-8}$ m.

? The same air is pumped down to $1.333\times10^{-3}$ Pa at the same temperature. What is the mean free path now?
answer: 6.62 m
tolerance: 1%
> $\bar\lambda\propto1/p$: $8.71\times10^{-8}\times\dfrac{1.013\times10^5}{1.333\times10^{-3}}=6.62$ m.

? Air molecules at 273.15 K have $\bar v=446$ m/s and $\bar\lambda=8.71\times10^{-8}$ m. How many collisions does one molecule have per second?
answer: 5.12e9 s^-1
tolerance: 2%
> $\bar z=\bar v/\bar\lambda=446/(8.71\times10^{-8})=5.1\times10^9$ s⁻¹.

? A fixed mass of ideal gas is kept at constant volume while its temperature rises. How do $\bar z$ and $\bar\lambda$ change?
- [x] $\bar z$ increases, $\bar\lambda$ stays the same
- [ ] $\bar z$ increases, $\bar\lambda$ increases
- [ ] $\bar z$ increases, $\bar\lambda$ decreases
- [ ] $\bar z$ decreases, $\bar\lambda$ increases
> $n$ is fixed, so $\bar\lambda=1/(\sqrt2\pi d^2n)$ is fixed; $\bar v\propto\sqrt T$ grows, so $\bar z=\sqrt2\pi d^2\bar vn$ grows (A).

? At constant pressure, how does the mean collision frequency $\bar z$ depend on the temperature $T$?
- [ ] It doesn't depend on $T$
- [ ] It is proportional to $\sqrt T$
- [x] It is inversely proportional to $\sqrt T$
- [ ] It is proportional to $T$
> $n=p/kT\propto1/T$ and $\bar v\propto\sqrt T$, so $\bar z\propto\sqrt T/T=1/\sqrt T$ (C).

? At constant temperature the pressure of a gas is halved. By what factor does $\bar\lambda$ change?
answer: 2
> $\bar\lambda=kT/(\sqrt2\pi d^2p)\propto1/p$: halving $p$ doubles $\bar\lambda$.

? Write the mean free path in terms of the mean speed $v$ and the collision frequency $z$.
expression: v/z
variables: v, z
> In time $t$ a molecule travels $\bar vt$ and collides $\bar zt$ times: $\bar\lambda=\bar v/\bar z$.

? What is the number density of nitrogen at 300 K and $1.013\times10^5$ Pa?
answer: 1.013e5/(k_B*300) m^-3
tolerance: 1%
> $n=p/kT=1.013\times10^5/(1.38\times10^{-23}\times300)=2.45\times10^{25}$ m⁻³.

? The effective diameter of a molecule is doubled (same $n$). What happens to $\bar\lambda$?
- [ ] It doubles
- [ ] It halves
- [x] It becomes a quarter
- [ ] It doesn't change
> $\bar\lambda\propto1/d^2$: doubling $d$ makes the collision cross-section $\pi d^2$ four times larger, so $\bar\lambda$ is a quarter.
:::

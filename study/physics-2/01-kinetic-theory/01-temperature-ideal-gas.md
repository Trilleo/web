---
title: Temperature and the ideal gas
zh: 平衡态 理想气体状态方程
summary: What thermal physics studies and how, equilibrium states and the zeroth law, state parameters and temperature scales, the ideal-gas equation of state pV = νRT = NkT, and how pressure and density fall with height.
source: 热学绪论; 第13章 气体动理论 §13.1, 2026-09-02 and 2026-09-04
---

This lesson opens the thermal half of the course. It sets up the language used in
every later lesson: what a *system* is, what it means for it to be in *equilibrium*,
what *temperature* is and how we put a number on it, and the one equation you will use
more than any other, the ideal-gas law $pV=\nu RT$. At the end we use that law to find
how the air thins out with height — the first time the course derives something about
gases from a simple model.

## What thermal physics studies

Rub your hands and they get warm; leave a cup of tea on the desk and it cools; pump up
a bicycle tyre and the pump heats up. Everything connected with how hot or cold
things are, and with the changes that go with it, is a
{{term thermal phenomenon | 热现象}}. {{term Thermal physics | 热学}} is the science of
the laws behind these phenomena.

Underneath them all is the endless, random jiggling of the atoms and molecules a body
is made of, called {{term thermal motion | 热运动}}. Thermal physics studies the laws of
this motion, how it affects the properties of matter, and how it turns into other
forms of motion and energy (and back). Its two great laws — the first and second laws
of thermodynamics — are the subject of Units 2 and 3.

### Two ways to attack the problem

There are two complementary methods, and this course uses both.

- **The macroscopic method** starts from the most basic experimental laws and reasons
  from them with mathematics, never asking what matter is made of. This is
  {{term thermodynamics | 热力学}}. Because it rests directly on experiment, its
  conclusions are reliable and very general. Its weakness: it describes *what* happens
  (it is "phenomenological", 唯象) but cannot say *why* at the level of molecules.
- **The microscopic method** starts from a model of the molecules and applies
  statistics to huge numbers of them. This is statistical physics; its first, simplest
  form is the {{term kinetic theory of gases | 气体动理论}} (also called 气体分子运动论),
  the subject of this unit. It explains the microscopic meaning of pressure and
  temperature, but it is only as good as its model: building the right model is the
  key step.

The two methods support each other: kinetic theory explains the laws thermodynamics
finds, and thermodynamics checks the models kinetic theory builds.

### A short history

Ideas about heat are ancient. Greek philosophers built the world from four elements
(earth, water, fire, air), and the Chinese five-elements theory (五行: metal, wood,
water, fire, earth) and the theory of 元气 saw heat (fire) as the gathering and
scattering of a basic substance; some Greeks already called fire a kind of motion. In
the 18th century the **caloric theory** (热质说) treated heat as a weightless fluid; it
gave us systematic thermometry and calorimetry but could not explain why friction
makes heat. In the 19th century heat was recognised as a form of motion: Joule's
experiments, Mayer and Helmholtz (the first law), and Joule, Clausius and Kelvin (the
second law). The 20th century brought molecular kinetic theory, statistical
mechanics, the theory of fluctuations and quantum statistics.

## Statistical laws

A {{term Galton board | 伽尔顿板}} is a vertical board with rows of pegs. Balls dropped
in at the top bounce left or right off each peg and land in one of the slots at the
bottom. Which slot will *one* ball land in? Nobody can say: that is a chance event.
Yet drop thousands of balls and they always pile up into the same bell-shaped heap,
highest in the middle.

That is the whole idea of the microscopic method in one picture. Each molecule obeys
Newton's laws, but we can never follow $10^{23}$ of them. Large numbers of them
together obey **statistical laws** instead.

::: define Statistical law | 统计规律
A regularity shown by the whole of a large number of chance events (or particles),
which no single event follows. Statistical laws
- hold for large numbers of events and fail for a few;
- apply only to the collection as a whole, not to any one member;
- depend on the macroscopic conditions the system is in;
- always come with fluctuations.
:::

::: define Fluctuation | 涨落
A deviation of a measured quantity from its statistical average. Every statistical law
has fluctuations; the relative size of the fluctuations shrinks as the number of
particles grows. Brownian motion and the tiny random noise of current in a circuit
are fluctuations.
:::

## Systems and equilibrium

Chapter 13 has four sections: equilibrium and the ideal-gas law (this lesson),
pressure and temperature from molecules (Lesson 1.2), equipartition and internal energy
(Lesson 1.3), and Maxwell's speed distribution (Lesson 1.4). Its aim: understand the
equilibrium state, use the ideal-gas law and its variants, and understand what
pressure and temperature mean and how a gas's energy is shared out.

::: define Thermodynamic system | 热力学系统
The macroscopic body (or bodies) we choose to study, such as the gas in a cylinder.
Everything around it that can affect it is the {{term surroundings | 外界}}.
- An **isolated system** (孤立系统) exchanges neither energy nor matter with the
  surroundings.
- A **closed system** (封闭系统) exchanges energy but not matter.
- An **open system** (开放系统) exchanges both.
:::

Picture a box with a wall in the middle, gas in the left half and vacuum in the right.
Pull the wall out. For a moment the gas rushes into the empty half: the density is
different from place to place and changes from moment to moment. Wait, and it settles
down, filling the box evenly, with nothing measurable changing any more. It has
reached equilibrium. A closed jar of water with vapour above it settles the same way.

::: define Equilibrium state | 平衡态
A state of a system that, **without any outside influence**, keeps all its macroscopic
properties unchanged in time. Macroscopically it is "quiet"; microscopically the
molecules move as fiercely as ever, and the averages stay put because every process
is balanced by its reverse. It is therefore a **dynamic** equilibrium, called
{{term thermodynamic equilibrium | 热动平衡}}. A perfect equilibrium is an idealised
model.
:::

::: define Steady state | 稳恒态
A state that does not change in time but is kept that way by a continuing exchange of
energy (or matter) with the surroundings. A steady state is **not** an equilibrium
state.
:::

A metal rod with one end in boiling water (100 °C) and the other in ice water (0 °C)
soon settles into fixed temperatures along its length — but heat keeps flowing
through it from the hot bath to the cold one. Cut it off from the baths and the
temperatures would change. So it is in a steady state, not in equilibrium.

::: callout pitfall "Not changing" is not enough
Equilibrium needs two things: nothing changes, **and** nothing from outside keeps it
that way. A rod carrying heat between two baths, a room kept warm by a radiator, a
river flowing steadily: all steady, none in equilibrium.
:::

### Thermal equilibrium and the zeroth law

Put a cold block and a hot block in contact through a wall that lets heat through (a
**diathermal** or conducting wall, 导热板) and keep them away from everything else.
Heat flows from hot to cold until both stop changing: they are then in
{{term thermal equilibrium | 热平衡}}. Through an **adiabatic** wall (绝热板), which lets no
heat through, nothing happens.

::: law Zeroth law of thermodynamics | 热力学第零定律
If two systems $A$ and $B$ are each in thermal equilibrium with a third system $C$,
then $A$ and $B$ are in thermal equilibrium with each other.
:::

It sounds obvious, but it is what makes temperature possible. All systems in thermal
equilibrium with one another share one property, and that property is
**temperature**. The zeroth law defines temperature qualitatively ("these two have the
same temperature"); it also explains a thermometer: system $C$ is the thermometer,
and two bodies that give it the same reading are at the same temperature. That is
why a clinical thermometer has to stay under the arm for several minutes: it must
reach thermal equilibrium with the body before its reading means anything.

## State parameters

To describe an equilibrium state we use a few numbers, the
{{term state parameters | 状态参量}}.

- **Macroscopic quantities** (宏观量) are measured directly with instruments and can be
  felt: pressure $p$, volume $V$, temperature $T$.
- **Microscopic quantities** (微观量) belong to single molecules and cannot be measured
  directly: a molecule's mass $m$, speed $v$, momentum, diameter $d$. Kinetic theory's
  job is to link the two kinds.

State parameters fall into four kinds: **geometric** (volume), **chemical** (the
components of a mixture and their amounts), **mechanical** (pressure) and
**electromagnetic** (field strengths, polarisation, magnetisation).

The units used in this course:

| Quantity | SI unit | Also seen |
| --- | --- | --- |
| pressure $p$ | Pa (N/m²) | $1\ \mathrm{cmHg}=1.333\times10^3\ \mathrm{Pa}$; $1\ \mathrm{atm}=76\ \mathrm{cmHg}=1.013\times10^5\ \mathrm{Pa}$ |
| volume $V$ | m³ | $1\ \mathrm L=10^{-3}\ \mathrm{m^3}$ |
| temperature $T$ | K | $t\,(\text{°C})=T-273.15$ |

::: define Simple system | 简单系统
A system whose equilibrium state is fixed by just its volume and pressure (with the
amount of substance given), also called a **pV system**. A fixed amount of a pure gas
is one: its temperature then follows from $p$ and $V$.
:::

Because a simple system's state is fixed by $(V,p)$, each equilibrium state is a point
on a **p–V diagram**, and a slow change of state is a curve on it. This picture runs
through the whole of Unit 2.

### The search for absolute zero

Temperature has a lowest possible value, absolute zero, 0 K; the third law of
thermodynamics says it can be approached but never reached. Getting close took two
centuries. From the late 18th century gases such as ammonia, chlorine and carbon
dioxide were liquefied by cooling and compressing them; in 1863 the **critical point**
(临界点) was found: above its critical temperature a gas cannot be liquefied however
hard it is squeezed. Linde's compression refrigerator (using the Joule–Thomson effect,
Lesson 2.3) liquefied oxygen and hydrogen; in 1908 Kamerlingh Onnes in Leiden
liquefied the last "permanent gas", helium. Magnetic cooling then reached 0.25 K
(1933), nuclear demagnetisation $1.6\times10^{-5}$ K (1956) and $5\times10^{-8}$ K
(1979), and laser cooling (Steven Chu, 朱棣文, Nobel Prize 1997) cooled atoms
further still (the slides quote $2.4\times10^{-11}$ K). A 2021 experiment that
dropped a magnetised gas down a 120 m tower measured 38 trillionths of a kelvin above
absolute zero.

::: callout note The 2021 record
The slide writes the 2021 record as "38 万亿分之一 °C" and as $2.6\times10^{-14}$ K.
"38 trillionths" means $38\times10^{-12}$ K $=3.8\times10^{-11}$ K, not 1/38 of a
trillionth; $2.6\times10^{-14}$ K comes from reading it the second way. The history is
not examined; the point is how hard the last fractions of a kelvin are.
:::

## Temperature scales

The zeroth law tells us *when* two temperatures are equal. To say *how much*, we need
a **temperature scale** (温标): a rule that assigns numbers to temperatures. There are
empirical scales (based on a particular thermometer, like a mercury column), the
ideal-gas temperature scale, and the thermodynamic scale (Lesson 3.1), which does not
depend on any substance.

::: define Temperature scale | 温标
A way of giving temperature a numerical value. Every temperature scale needs three
choices (温标三要素):
1. a **thermometric substance** and the property of it that changes with temperature
   (the length of a mercury column, the pressure of a gas at fixed volume);
2. the **relation** assumed between that property and temperature (usually
   proportional or linear);
3. one or more **fixed points**, standard temperatures given agreed values.
:::

### The ideal gas and its laws

At ordinary temperatures (not too low compared with room temperature) and pressures
(not too high compared with 1 atm), real gases all behave in the same simple way. The
idealisation of that behaviour is the ideal gas.

::: define Ideal gas | 理想气体
A gas that obeys Boyle's law exactly at every pressure. As a model: its molecules are
point masses (their size is negligible compared with the distance between them), and
apart from the instant of a collision they exert no forces on each other or on the
walls, so there is no potential energy between molecules; all collisions are
perfectly elastic (no kinetic energy is lost).
:::

Three experimental laws, each holding one quantity fixed for a fixed amount of gas:

| Held fixed | Law | Statement |
| --- | --- | --- |
| $T$ | Boyle–Mariotte law (玻意耳–马略特定律) | $pV=$ constant |
| $p$ | Gay-Lussac's law (盖–吕萨克定律) | $V/T=$ constant |
| $V$ | Charles's law (查理定律) | $p/T=$ constant |

(Some books swap the names of the last two; the equations are what count.) On a p–V
diagram these are three different curves through the same starting state:

::: pv The three gas laws from state a: isothermal a→b, isobaric a→c, isochoric a→d
axes: V (L), p (kPa)
a: V 2, p 300
b: V 6, p 100
c: V 6, p 300
d: V 2, p 100
a -> b: isothermal
a -> c: isobaric
a -> d: isochoric
:::

The isotherm $a\to b$ is the hyperbola $pV=600$ kPa·L. Along $a\to c$ the volume
triples at constant pressure, so by Gay-Lussac the temperature triples; along
$a\to d$ the pressure falls to a third at constant volume, so by Charles the
temperature falls to a third.

### The ideal-gas temperature scale

Combining the laws, for a fixed amount of ideal gas $pV\propto T$. That suggests a
scale: use the gas itself as the thermometer, and fix one point. The point chosen is
the {{term triple point of water | 水的三相点}}, the one temperature and pressure (609 Pa)
at which ice, water and water vapour coexist in equilibrium. It is given the value
$T_3=273.16$ K exactly. Then

::: formula Ideal-gas temperature scale | 理想气体温标
$$T=273.16\ \mathrm K\cdot\frac{pV}{p_3V_3}\qquad\text{(constant volume: } T=273.16\ \mathrm K\cdot\frac{p}{p_3}\text{)}$$
--
T | temperature being measured | K
p, V | the gas's pressure and volume at that temperature | Pa, m³
p_3, V_3 | the same gas's pressure and volume at the triple point of water | Pa, m³
T_3 | triple point of water, 273.16 K by definition | K
:::

A **constant-volume gas thermometer** does exactly this: a bulb of gas connected to a
mercury manometer, with the mercury always brought back to the same mark so the gas's
volume stays fixed; the height difference of the mercury gives the pressure. In the
range where gases behave ideally, the ideal-gas scale agrees with the thermodynamic
scale, and the international temperature scale is built to match both.

The everyday Celsius scale is the same scale shifted:

::: formula Celsius and kelvin | 摄氏温标
$$t=T-273.15$$
--
t | Celsius temperature | °C
T | thermodynamic temperature | K
:::

::: example A constant-volume gas thermometer
The bulb of a constant-volume gas thermometer is held at the triple point of water and
the gas pressure is $6.80\times10^3$ Pa. In boiling water the pressure is
$9.30\times10^3$ Pa. Find the temperature of the boiling water.
== Use the constant-volume formula ==
$$T=273.16\ \mathrm K\times\frac{p}{p_3}=273.16\times\frac{9.30\times10^3}{6.80\times10^3}=373.6\ \mathrm K.$$
== In Celsius ==
$t=373.6-273.15\approx100.4$ °C. (A real gas at a finite pressure is not quite ideal,
which is why careful measurements repeat this at lower and lower $p_3$ and
extrapolate.)
:::

## The equation of state of an ideal gas

For a fixed amount of one ideal gas the three laws combine into
$$\frac{pV}{T}=\frac{p_0V_0}{T_0},$$
where $p_0,V_0,T_0$ are the values in any reference state. Choose **standard
conditions**, $p_0=1.013\times10^5$ Pa and $T_0=273.15$ K. By Avogadro's law one mole
of *any* gas there takes up the same volume, $V_{m,0}=22.4\times10^{-3}$ m³/mol, so
$\nu$ moles take $V_0=\nu V_{m,0}$, and
$$pV=\nu\,\frac{p_0V_{m,0}}{T_0}\,T=\nu RT .$$
The constant $R=p_0V_{m,0}/T_0$ is the same for every gas.

Here and from now on: $\nu$ is the **amount of substance** in moles; $M$ is the
**molar mass** (kg/mol: $32\times10^{-3}$ for O₂); $m$ is the **mass of one
molecule**; $N$ is the **number of molecules**; and $N_A$ is the
{{term Avogadro constant | 阿伏伽德罗常数}}, the number of molecules in a mole. If
$m_{\text{gas}}$ is the total mass of the gas, $\nu=m_{\text{gas}}/M=N/N_A$. (The
slides write the total mass as $m$ in this one formula; everywhere else $m$ is one
molecule, so we keep it that way.)

::: formula Ideal-gas law (equation of state) | 理想气体状态方程
$$pV=\nu RT=\frac{m_{\text{gas}}}{M}RT=\frac{N}{N_A}RT=NkT$$
--
p | pressure | Pa
V | volume | m³
T | thermodynamic temperature | K
\nu | amount of gas | mol
m_{\text{gas}} | total mass of the gas | kg
M | molar mass | kg/mol
N | number of molecules | —
R | molar gas constant, 8.31 | J/(mol·K)
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
:::

The last form uses the {{term Boltzmann constant | 玻尔兹曼常数}}, the gas constant
*per molecule*:

::: formula Boltzmann constant | 玻尔兹曼常数
$$k=\frac{R}{N_A}=\frac{8.31\ \mathrm{J/(mol\cdot K)}}{6.02\times10^{23}\ \mathrm{mol^{-1}}}=1.38\times10^{-23}\ \mathrm{J/K}$$
--
k | Boltzmann constant | J/K
R | {{term molar gas constant | 普适气体常数}} | J/(mol·K)
N_A | Avogadro constant, $6.02\times10^{23}$ | mol⁻¹
:::

(The slides print $N_A=6.023\times10^{23}$, an older value; today's is
$6.022\times10^{23}$. Either gives $k=1.38\times10^{-23}$ J/K.)

Divide $pV=NkT$ by $V$ and the volume disappears. $N/V$ is the
{{term number density | 分子数密度}} $n$, the number of molecules per cubic metre:

::: formula Pressure and number density | 理想气体压强与分子数密度
$$p=nkT,\qquad n=\frac{N}{V}$$
--
p | pressure | Pa
n | number density (molecules per unit volume) | m⁻³
k | Boltzmann constant | J/K
T | temperature | K
:::

This is the form kinetic theory likes best, because it talks about molecules. It says
something surprising: at the same $p$ and $T$, **every** ideal gas has the same number
of molecules per cubic metre, whatever the molecules are.

::: callout pitfall Kelvin, SI units, and which constant
- Always put $T$ in **kelvin**: 27 °C is 300 K. With °C, $pV=\nu RT$ gives nonsense
  (and a negative pressure below 0 °C).
- Volumes in m³ (1 L $=10^{-3}$ m³), pressures in Pa, molar mass in **kg**/mol
  ($M_{\text{O}_2}=0.032$ kg/mol, not 32).
- $R$ goes with moles ($\nu$, $M$); $k$ goes with molecules ($N$, $n$, $m$). Mixing
  them is off by $6\times10^{23}$.
:::

::: example Molecules in a cubic metre of air
How many molecules are in 1 m³ of a gas at standard conditions, $1.013\times10^5$ Pa
and 0 °C?
== Use p = nkT ==
$$n=\frac{p}{kT}=\frac{1.013\times10^5}{1.38\times10^{-23}\times273.15}=2.69\times10^{25}\ \mathrm{m^{-3}}.$$
== Make sense of it ==
This is the **Loschmidt number**, the same for every ideal gas. Even a cubic
millimetre of air holds $2.7\times10^{16}$ molecules: plenty for statistics to work.
:::

::: example An oxygen cylinder
A 20 L cylinder holds oxygen ($M=32\times10^{-3}$ kg/mol) at $1.5\times10^6$ Pa and
27 °C. Find the amount of oxygen, its mass, and the number of molecules.
== Units first ==
$V=20\times10^{-3}$ m³, $T=27+273.15=300.15$ K.
== Amount and mass ==
$$\nu=\frac{pV}{RT}=\frac{1.5\times10^6\times20\times10^{-3}}{8.31\times300.15}=12.0\ \mathrm{mol},\qquad m_{\text{gas}}=\nu M=12.0\times0.032=0.385\ \mathrm{kg}.$$
== Number of molecules ==
$$N=\nu N_A=12.0\times6.023\times10^{23}=7.24\times10^{24}.$$
The same comes from $N=pV/(kT)$.
:::

::: explore The ideal-gas law
slider p: 10k .. 1M = 101.3k | Pa | log
slider V: 0.001 .. 1 = 0.0224 | m^3 | log
slider T: 50 .. 1000 = 273.15 | K
nu = p V / (8.31 T) | mol | Amount of gas
N = nu 6.023e23 | | Number of molecules
n = p / (1.38e-23 T) | m^-3 | Number density
:::

Start at the defaults (standard conditions, 22.4 L) and you get one mole. Note that $n$
depends only on $p$ and $T$: change $V$ and only $\nu$ and $N$ move.

## Air in a gravitational field

Why is the air thinner on a mountain? Each layer of air has to hold up the weight of
all the air above it, so pressure is highest at the ground and falls with height. And
since $p=nkT$, at a fixed temperature fewer molecules per cubic metre means less
pressure — so the air thins too. Let us work out how fast, assuming (to keep it
simple) that the temperature is the same at every height.

### The isothermal barometric formula

Take a thin horizontal slab of air at height $h$, thickness $\mathrm dh$, area $S$. The
pressure below it is $p$, above it $p+\mathrm dp$ (with $\mathrm dp<0$). Its mass is
$\mathrm dm'=\rho S\,\mathrm dh$, where $\rho$ is the air's density. In equilibrium the
forces balance:
$$pS=(p+\mathrm dp)S+g\,\mathrm dm'\quad\Rightarrow\quad\frac{\mathrm dp}{\mathrm dh}=-\rho g .$$
From the ideal-gas law, $pV=\dfrac{m'}{M}RT$ gives $\rho=\dfrac{m'}{V}=\dfrac{pM}{RT}$, so
$$\frac{\mathrm dp}{p}=-\frac{Mg}{RT}\,\mathrm dh\quad\Rightarrow\quad\int_{p_0}^{p}\frac{\mathrm dp}{p}=-\int_0^{z}\frac{Mg}{RT}\,\mathrm dh\quad\Rightarrow\quad\ln\frac{p}{p_0}=-\frac{Mgz}{RT}.$$

::: formula Isothermal barometric formula | 等温气压公式
$$p=p_0\,e^{-Mgz/RT}=p_0\,e^{-mgz/kT},\qquad z=\frac{RT}{Mg}\ln\frac{p_0}{p}$$
--
p | pressure at height $z$ | Pa
p_0 | pressure at $z=0$ (sea level) | Pa
z | height | m
M | molar mass of the gas (air: $28.97\times10^{-3}$) | kg/mol
m | mass of one molecule, $M/N_A$ | kg
g | gravitational acceleration | m/s²
:::

The two exponents are equal because $M/R=mN_A/(kN_A)=m/k$. The second form has a
meaning worth noticing: $mgz$ is the potential energy of **one molecule** at height
$z$, and $kT$ is the thermal energy scale. The pressure falls by a factor $e$ every
time the height grows by $RT/(Mg)$, about 8 km for air at 0 °C.

Now put $p=nkT$ and $p_0=n_0kT$ into it (same $T$ at every height):

::: formula Number density in a gravitational field | 重力场中分子数密度按高度的分布
$$n=n_0\,e^{-Mgz/RT}=n_0\,e^{-mgz/kT}$$
--
n | number density at height $z$ | m⁻³
n_0 | number density at $z=0$, where the potential energy is zero | m⁻³
mgz | potential energy of one molecule at height $z$ | J
:::

Molecules crowd where their potential energy is low. This is a first glimpse of the
**Boltzmann distribution**, which reappears with Maxwell's distribution (Lesson 1.4).

::: plot Pressure against height in an isothermal atmosphere
x: 0 .. 30
xlabel: z (km)
ylabel: p / p0
p(z) = exp(-M 9.8 z 1000 / (8.31 T))
slider M: 0.002 .. 0.044 = 0.029 | kg/mol | molar mass
slider T: 150 .. 400 = 273 | K
:::

A heavier gas (bigger $M$) falls off faster; a hotter one spreads higher. Hydrogen and
helium ($M=0.002$, $0.004$) barely thin out at all over 30 km. (The real atmosphere is
not isothermal, so the formula is only a first estimate.)

::: callout tip Other ways to the same formula
The slide asks whether you can find the barometric formula another way. One: since
$p=nkT$ with $T$ fixed, $\mathrm dp=kT\,\mathrm dn$, and the slab's weight is
$n\,m g\,S\,\mathrm dh$; balancing gives $\mathrm dn/n=-mg\,\mathrm dh/kT$, the density
formula directly. Another is the Boltzmann factor $e^{-E_p/kT}$ (Lesson 1.4).
:::

::: example How high is the mountain?
Treat the atmosphere as isothermal at $t=5.0$ °C. At sea level the pressure is
$p_0=750$ mmHg; at the top of a mountain it is $p=590$ mmHg. The molar mass of air is
$28.97\times10^{-3}$ kg/mol. Find the height of the mountain and the number density at
the top.
== Height ==
$T=5.0+273.15=278.15$ K. Only the ratio $p_0/p$ enters, so the pressures can stay in
mmHg:
$$z=\frac{RT}{Mg}\ln\frac{p_0}{p}=\frac{8.31\times278.15}{28.97\times10^{-3}\times9.8}\times\ln\frac{750}{590}=1.95\times10^3\ \mathrm m.$$
== Number density at sea level ==
Now the pressure must be in Pa: $p_0=\dfrac{750}{760}\times1.013\times10^5=1.000\times10^5$ Pa, so
$$n_0=\frac{p_0}{kT}=\frac{1.000\times10^5}{1.38\times10^{-23}\times278.15}=2.60\times10^{25}\ \mathrm{m^{-3}}.$$
== Number density at the top ==
$e^{-Mgz/RT}=p/p_0$, so
$$n=n_0\,\frac{p}{p_0}=2.60\times10^{25}\times\frac{590}{750}=2.05\times10^{25}\ \mathrm{m^{-3}}.$$
The slide stops at "可解"; these are the values.
:::

::: callout key The one idea to remember
An ideal gas in equilibrium is described by $p$, $V$, $T$ tied together by
$pV=\nu RT=NkT$, or per unit volume $p=nkT$. Nearly every gas calculation in Units 1
and 2 starts here.
:::

::: callout exam What exams ask
Fill-in questions convert between $p$, $V$, $T$, $\nu$, $N$ and $n$ with the
equation of state (watch the units: L, °C, g/mol), ask for the number of molecules
($N=pV/kT$), or for the temperature change along a given process (Lesson 1.2's quiz).
The barometric formula appears as "find the height from two pressures". Conceptual
questions test equilibrium versus steady state and statistical laws.
:::

## Summary

::: cards Temperature and the ideal gas
Thermal physics (热学) :: The science of the laws of thermal phenomena: thermal motion, its effect on matter, and its conversion to other forms of energy
Macroscopic vs microscopic method :: Thermodynamics: from experimental laws by logic, reliable and general but no mechanism. Kinetic theory / statistical physics: from a molecular model plus statistics, explains the mechanism but depends on the model
Statistical law (统计规律) :: A regularity of a large number of chance events as a whole; fails for few events, depends on conditions, always comes with fluctuations (涨落)
Equilibrium state (平衡态) :: Macroscopic properties unchanged in time with no outside influence; microscopically a dynamic balance (热动平衡)
Steady state vs equilibrium :: A steady state is unchanging only because energy keeps flowing through it (rod between two baths), so it is not equilibrium
Zeroth law of thermodynamics :: If A and B are each in thermal equilibrium with C, they are in thermal equilibrium with each other; this defines temperature
Simple (pV) system :: Its equilibrium state is fixed by $p$ and $V$ alone
Three elements of a temperature scale :: Thermometric substance and property; the relation between property and temperature; fixed point(s) with assigned values
Triple point of water :: $T_3=273.16$ K exactly (at 609 Pa); the fixed point of the ideal-gas and thermodynamic scales
Ideal gas (理想气体) :: Point molecules, no forces except in elastic collisions; obeys Boyle's law at every pressure
Ideal-gas law :: $pV=\nu RT=\dfrac{m_{\text{gas}}}{M}RT=\dfrac{N}{N_A}RT=NkT$
Pressure and number density, $p=nkT$ :: Pressure from number density $n=N/V$; same $n$ for every ideal gas at the same $p$, $T$
Boltzmann constant :: $k=R/N_A=1.38\times10^{-23}$ J/K; $R=8.31$ J/(mol·K), $N_A=6.02\times10^{23}$ mol⁻¹
1 atm :: $76$ cmHg $=1.013\times10^5$ Pa; 1 cmHg $=1.333\times10^3$ Pa
Isothermal barometric formula :: $p=p_0e^{-Mgz/RT}=p_0e^{-mgz/kT}$, and $n=n_0e^{-mgz/kT}$
:::

::: quiz Check yourself
? (In class) Which statements about statistical laws and fluctuations are correct?
- [x] A statistical law is a law that acts on a large number of chance events as a whole
- [x] The statistical law shown by a large number of chance events is stable
- [x] A statistical law always comes with fluctuations
- [x] Brownian motion and the random wobble of a current in a circuit are examples of fluctuations
> All four are correct (Rain Classroom's answer is ABCD). Statistical laws describe
> the collection, not single events (A); with many events the averages are stable (B);
> but the measured values always scatter around the averages (C), and Brownian motion
> and current noise are exactly such scatter (D).

? (In class) A doctor keeps an ordinary clinical thermometer under a feverish patient's arm for several minutes before reading it. This uses the principle of
- [ ] heat transfer
- [x] thermal equilibrium
- [ ] inertia
- [ ] conservation of momentum
> The reading only equals the body's temperature once the thermometer and the body
> are in thermal equilibrium (the zeroth law); that takes time. Heat does flow on the
> way there, but the *principle* of the measurement is equilibrium. (Other physics in
> a thermometer: thermal expansion of mercury, and the constriction that keeps the
> column in place, which is why you shake it down.)

? A metal rod joins a bath of boiling water to a bath of ice water. After a while the temperature at every point of the rod stops changing. Is the rod in an equilibrium state?
- [ ] Yes: nothing about it changes in time
- [x] No: it is a steady state, kept up by heat flowing through it
- [ ] Only its middle is in equilibrium
> Equilibrium requires no change **without** outside influence. Heat keeps flowing
> from the hot bath to the cold one through the rod; remove the baths and the
> temperatures change. That is a steady state.

? What is 27 °C in kelvin?
answer: 300.15 K
tolerance: 0.1%
> $T=t+273.15=300.15$ K (usually rounded to 300 K).

? A gas thermometer at constant volume reads $p_3=6.80\times10^3$ Pa at the triple point of water and $9.30\times10^3$ Pa in boiling water. What temperature does it give?
answer: 373.6 K
> $T=273.16\times p/p_3=273.16\times9.30/6.80=373.6$ K.

? How many molecules are there per cubic metre of an ideal gas at $1.013\times10^5$ Pa and 273.15 K?
answer: 2.69e25 m^-3
> $n=p/kT=1.013\times10^5/(1.38\times10^{-23}\times273.15)=2.69\times10^{25}$ m⁻³,
> the same for every ideal gas.

? A 20 L cylinder holds oxygen at $1.5\times10^6$ Pa and 27 °C. What mass of oxygen is in it? ($M=32\times10^{-3}$ kg/mol)
answer: 0.385 kg
tolerance: 2%
> $\nu=pV/RT=1.5\times10^6\times0.020/(8.31\times300.15)=12.0$ mol, and
> $m_{\text{gas}}=\nu M=12.0\times0.032=0.385$ kg.

? (Slide exercise) An isothermal atmosphere at 5.0 °C has 750 mmHg at sea level and 590 mmHg at a mountain top. How high is the mountain? ($M=28.97\times10^{-3}$ kg/mol, $g=9.8$ m/s²)
answer: 1.95e3 m
tolerance: 2%
> $z=\dfrac{RT}{Mg}\ln\dfrac{p_0}{p}=\dfrac{8.31\times278.15}{0.02897\times9.8}\ln\dfrac{750}{590}=1.95\times10^3$ m.

? For the same mountain, what is the number density of air molecules at the top?
answer: 2.05e25 m^-3
tolerance: 2%
> $n_0=p_0/kT$ with $p_0=750/760\times1.013\times10^5$ Pa and $T=278.15$ K gives
> $2.60\times10^{25}$ m⁻³; then $n=n_0\,p/p_0=2.60\times10^{25}\times590/750=2.05\times10^{25}$ m⁻³.

? In an isothermal atmosphere the pressure falls by a factor $e$ over a height $H$. Write $H$ in terms of $R$, $T$, $M$ and $g$.
expression: R T / (M g)
variables: R, T, M, g
> $p=p_0e^{-Mgz/RT}$ equals $p_0/e$ when $Mgz/RT=1$, so $H=RT/(Mg)$ (about 8 km for
> air at 0 °C).
:::

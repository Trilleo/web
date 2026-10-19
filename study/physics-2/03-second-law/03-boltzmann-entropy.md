---
title: Microstates and Boltzmann entropy
zh: 玻尔兹曼熵及熵的微观意义
summary: Why heat processes run one way, seen from the molecules — macrostates and microstates, the thermodynamic probability Ω, Boltzmann's entropy S = k ln Ω, how it compares with Clausius entropy, and the entropy change of melting ice.
source: 第15章 热力学第二定律 §15.3 玻尔兹曼熵及熵的微观意义, 2026-10-14
---

Lessons 3.1 and 3.2 stated the second law as a fact about heat engines and gave it a
number, the Clausius entropy $\mathrm{d}S=\mathrm{d}Q/T$, which never decreases in an
isolated system. But they never said **why**. Why does a gas fill its box and never
crowd back into one corner? Why does heat flow from hot to cold and not the other way?
This lesson answers from the molecules' point of view: a state that can be built in
more ways is more likely, and natural processes simply go to the overwhelmingly more
likely states. Counting those "ways" gives Boltzmann's entropy $S=k\ln\Omega$, one of
the most famous formulas in physics, and it agrees with the Clausius entropy wherever
both apply.

## What the second law means for molecules

Look again at the three standard irreversible processes from Lesson 3.1, this time
asking what the molecules are doing.

- **Work turning into heat.** A spinning paddle wheel in water (or a current through a
  resistor) is *ordered* motion: everything moves together. Friction turns it into heat,
  the *disordered* jiggling of molecules in every direction. The reverse never happens
  by itself.
- **Heat conduction.** Put a hot block ($T_1$) against a cold one ($T_2$). At first the
  fast molecules are on one side and the slow ones on the other: the kinetic energy is
  sorted, fairly ordered. In the end both are at the same $T$ and fast and slow
  molecules are mixed everywhere: the energy distribution is more disordered.
- **Free expansion.** Gas fills the left half of a box; the partition is removed. At
  first every molecule is known to be on the left: the *positions* are fairly ordered.
  Afterwards a molecule could be anywhere: more disordered.

In each case the system goes from more order to less. The lecture puts this in one
line:

::: law Microscopic meaning of the second law | 热力学第二定律的微观意义
Every natural process goes in the direction in which the disorder of the molecules'
thermal motion increases.
:::

There is a second, subtler point. Nothing in the laws of mechanics forbids the gas
molecules from all moving back into the left half: run a film of the expansion
backwards and every collision still obeys Newton's laws. The reverse process is not
*impossible*, only fantastically *improbable*. So the second law is not an exact law
like energy conservation:

::: callout key The second law is a statistical law
The second law of thermodynamics is a **statistical law** ({{term statistical law |
统计规律}}). It says what happens with overwhelming probability in a system of a vast
number of molecules. For a handful of molecules it can be "broken" quite often; for a
mole of gas, never in practice.
:::

To make "more disordered" and "more probable" precise, we need to count.

## Macrostates and microstates

Boltzmann's starting point: describing a gas by $p$, $V$ and $T$ is a very coarse
description. One and the same macroscopic state can be produced by an enormous number
of different arrangements of the molecules, and the coarse description cannot tell
them apart.

The simplest model shows what this means. Take a box divided (in our minds, no real
wall) into a left half and a right half, and put in **four** molecules, labelled
$a$, $b$, $c$, $d$ so that we can tell them apart. Each molecule is in one half or the
other.

::: define Macrostate | 宏观态
A description of a system by its large-scale properties only. In the box model: **how
many** molecules are in the left half and how many in the right, without saying which
ones.
:::

::: define Microstate | 微观态
A complete description of where every individual molecule is (and, in general, how it
moves). In the box model: **which** molecules are on the left and which on the right.
:::

With four molecules there are five macrostates (4:0, 3:1, 2:2, 1:3, 0:4, writing
left : right), and $2^4=16$ microstates, because each of the four molecules has two
choices. Listing them:

| Macrostate (left : right) | Microstates (left / right) | Number of microstates |
|---|---|---|
| 4 : 0 | $abcd$ / — | 1 |
| 3 : 1 | $abc/d$, $abd/c$, $acd/b$, $bcd/a$ | 4 |
| 2 : 2 | $ab/cd$, $ac/bd$, $ad/bc$, $bc/ad$, $bd/ac$, $cd/ab$ | 6 |
| 1 : 3 | $a/bcd$, $b/acd$, $c/abd$, $d/abc$ | 4 |
| 0 : 4 | — / $abcd$ | 1 |
| Total | | 16 |

The even split, 2 : 2, can be made in the most ways. The extreme ones, everything on
one side, can be made in only one way each.

In general, with $N$ molecules, a macrostate with $n$ on the left is made by choosing
which $n$ of the $N$ molecules go left, so it has
$$\binom{N}{n}=\frac{N!}{n!\,(N-n)!}$$
microstates, and there are $2^N$ microstates in all. For 4 molecules this gives
1, 4, 6, 4, 1; for 5 molecules 1, 5, 10, 10, 5, 1; for 6 molecules
1, 6, 15, 20, 15, 6, 1. Move the slider and watch the middle grow:

::: plot Number of microstates of each macrostate, for N molecules
x: 0 .. 20
xlabel: n (molecules in the left half)
bars Ω(n) = comb(N, n)
slider N: 1 .. 20 = 6 | | step 1
:::

The conclusion from these counts: **the macrostates with equal, or nearly equal,
numbers of molecules on the two sides have the most microstates.**

With 20 molecules the effect is already striking:

| Macrostate (left : right) | 20 : 0 | 18 : 2 | 15 : 5 | 11 : 9 | 10 : 10 | 9 : 11 | 5 : 15 | 2 : 18 | 0 : 20 |
|---|---|---|---|---|---|---|---|---|---|
| Microstates | 1 | 190 | 15 504 | 167 960 | 184 756 | 167 960 | 15 504 | 190 | 1 |

::: callout note A slip on the slide
The 20-molecule table on the slide gives 184 765 microstates for 10 : 10; the correct
value is $\binom{20}{10}=184\,756$ (two digits swapped). The slide's 4-molecule table
also pairs the 1 : 3 row's left and right columns in the wrong order (for example $d$
on the left beside $abc$ is right, but $c$ is printed beside $acd$); the four
microstates themselves are the right ones.
:::

## Equal probabilities and the thermodynamic probability

Which microstate is the gas in at a given moment? The molecules move and collide
constantly, so the gas keeps hopping from microstate to microstate. Statistical
physics rests on one basic assumption:

::: define Equal-probability hypothesis | 等概率假设
For an isolated system in equilibrium, every microstate allowed by the conditions is
equally likely.
:::

Then the probability of a macrostate is just its share of the microstates. For four
molecules:

| Macrostate | 4 : 0 | 3 : 1 | 2 : 2 | 1 : 3 | 0 : 4 |
|---|---|---|---|---|---|
| Microstates | 1 | 4 | 6 | 4 | 1 |
| Probability | 1/16 | 1/4 | 3/8 | 1/4 | 1/16 |

The probabilities add up to 1, and the even split is the most probable. Notice that
even with only four molecules, "all on the left" has probability $1/16$: you would see
it now and then. With 20 molecules it is $1/2^{20}\approx 10^{-6}$; with a mole of gas,
$N\approx6\times10^{23}$, it is $2^{-6\times10^{23}}\approx10^{-1.8\times10^{23}}$, a
number so small that it will not happen in the lifetime of the universe.

The number of microstates is the quantity that matters, so it gets a name:

::: define Thermodynamic probability | 热力学概率
The **thermodynamic probability** $\Omega$ of a macrostate is the number of microstates
that make up that macrostate. It is fixed by the macrostate, so $\Omega$ is a state
quantity.
:::

::: callout pitfall Ω is a count, not a probability
Despite its name, $\Omega$ is not a number between 0 and 1: it is a whole number, and
for real systems an astronomically large one. The ordinary probability of a macrostate
is $\Omega$ divided by the total number of microstates ($2^N$ in the box model).
:::

Because every microstate is equally likely, the system is most often found in the
macrostate with the most microstates. This gives a statistical picture of
equilibrium:

::: law Equilibrium as maximum Ω | 平衡态与热力学概率
Under given macroscopic conditions, the macrostate with the most microstates
(maximum $\Omega$) is the **equilibrium state**. A macrostate whose $\Omega$ is not the
maximum is a non-equilibrium state.
:::

How sharp is that maximum? Here is the number of microstates for a fraction $x$ of the
molecules on the left, as a share of the peak, for large $N$ (it is close to
$e^{-2N(x-1/2)^2}$). As $N$ grows the peak becomes a spike: practically all
microstates have very nearly half the molecules on each side. This is the tall, narrow
spike at $N/2$ drawn on the slide.

::: plot How sharp the peak at the even split is (share of the largest Ω)
x: 0 .. 1
xlabel: x (fraction of molecules on the left)
y: 0 .. 1.05
f(x) = exp(-2 N (x - 0.5)^2)
slider N: 10 .. 10000 = 100 | | log
:::

The width of the spike shrinks like $1/\sqrt N$. For $N=10^{4}$ the fraction on the
left almost never strays beyond $0.5\pm0.02$; for $N\sim10^{23}$ the deviations are
around $10^{-12}$, far too small to measure. That is why a macroscopic gas looks
perfectly steady in equilibrium, even though its molecules never stop moving.

## Boltzmann entropy

Boltzmann proposed that entropy measures how many microstates a macrostate has, and
that it goes as the logarithm: $S\propto\ln\Omega$. Max Planck later wrote it with the
constant that now bears Boltzmann's name. The formula is carved on Boltzmann's
gravestone in Vienna, as $S=k\log W$ ($\log$ meaning the natural logarithm, $W$ for
*Wahrscheinlichkeit*, "probability").

::: define Boltzmann entropy | 玻尔兹曼熵
The entropy of a macrostate whose thermodynamic probability is $\Omega$ is
$S=k\ln\Omega$. Microscopically, it measures the disorder of the molecules' thermal
motion.
:::

::: formula Boltzmann entropy formula | 玻尔兹曼熵公式
$$S=k\ln\Omega$$
--
S | entropy of the macrostate | J/K
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
\Omega | thermodynamic probability: number of microstates of the macrostate | —
:::

Three properties follow at once:

1. **It is a state function.** $\Omega$ is fixed by the macrostate, so $S$ is too.
2. **It is largest in equilibrium**, because equilibrium is the macrostate with the
   largest $\Omega$.
3. **It is additive**: the entropy of a system made of two parts is the sum of the
   parts' entropies, $S=S_1+S_2$.

Additivity is the reason for the logarithm. Take two independent subsystems with
thermodynamic probabilities $\Omega_1$ and $\Omega_2$. Every microstate of the first can
be combined with every microstate of the second (the multiplication rule for
independent events), so the whole system has $\Omega=\Omega_1\Omega_2$ microstates. The
logarithm turns the product into a sum:
$$S=k\ln(\Omega_1\Omega_2)=k\ln\Omega_1+k\ln\Omega_2=S_1+S_2.$$
Energy, volume and the number of molecules all add up when you put systems together;
with the logarithm, entropy does too.

For a change between two macrostates,
$$\Delta S=S_2-S_1=k\ln\Omega_2-k\ln\Omega_1=k\ln\frac{\Omega_2}{\Omega_1}.$$

::: formula Boltzmann entropy change | 玻尔兹曼熵变
$$\Delta S=k\ln\frac{\Omega_2}{\Omega_1}\qquad\Longleftrightarrow\qquad\frac{\Omega_2}{\Omega_1}=e^{\Delta S/k}$$
--
\Delta S | entropy change from macrostate 1 to macrostate 2 | J/K
\Omega_1,\ \Omega_2 | thermodynamic probabilities of the initial and final macrostates | —
k | Boltzmann constant | J/K
:::

::: explore Counting microstates in the box model
slider N: 2 .. 60 = 20 | | step 1 | molecules
slider n: 0 .. 60 = 10 | | step 1 | on the left
W = comb(N, min(n, N)) | | Ω, microstates
S = 1.38e-23 ln(W) | J/K | Boltzmann entropy k ln Ω
P = W / 2^N | | probability of this macrostate
:::

::: callout pitfall ln, not log₁₀
$S=k\ln\Omega$ uses the natural logarithm. The "log" on Boltzmann's gravestone is the
natural one too. Using $\log_{10}$ makes every entropy too small by a factor of
$\ln10\approx2.3$.
:::

::: example Free expansion, counted
$\nu$ moles of an ideal gas ($N$ molecules) fill one half of an insulated box; the
partition is removed and the gas spreads through the whole box. Find the entropy change
by counting microstates, and evaluate it for $\nu=1\ \mathrm{mol}$.
== Count the change in Ω ==
Only the positions change: the temperature of an ideal gas is the same after a free
expansion (Lesson 2.3), so the molecules' speeds are distributed as before. Before,
each molecule had to be in the left half; afterwards it can be in either half, twice
as many places. Every molecule doubles its choices independently, so
$$\frac{\Omega_2}{\Omega_1}=2^N.$$
== Boltzmann's formula ==
$$\Delta S=k\ln2^N=Nk\ln2.$$
Since $Nk=\nu N_A k=\nu R$, this is
$$\Delta S=\nu R\ln2.$$
== Compare with Clausius, and put in numbers ==
Lesson 3.2 found exactly $\Delta S=\nu R\ln2$ for this process by inventing reversible
paths and integrating $\mathrm{d}Q/T$. The two definitions agree. For one mole,
$$\Delta S=1\times8.31\times\ln2=5.76\ \mathrm{J/K}.$$
== How unlikely is the reverse? ==
$\ln(\Omega_2/\Omega_1)=\Delta S/k=5.76/(1.38\times10^{-23})=4.2\times10^{23}$. The
gas returning to its half by itself is less likely than the expanded state by a
factor $e^{-4.2\times10^{23}}$, which is $1/2^{N}$ with $N=6\times10^{23}$, as we found
above.
:::

## Boltzmann entropy and Clausius entropy

We now have two definitions of entropy. They are two views of the same quantity, but
their reach is different:

| Aspect | Boltzmann entropy | Clausius entropy (Lesson 3.2) |
|---|---|---|
| Formula | $S=k\ln\Omega$ | $\mathrm{d}S=\dfrac{\mathrm{d}Q}{T}$ (reversible) |
| Point of view | microscopic: counting microstates | macroscopic: heat and temperature |
| Systems | any | any |
| States | **any** macrostate, equilibrium or not | **equilibrium** states only |
| Processes | any | computed along a **reversible** process |

Where both apply (equilibrium states) they give the same entropy changes, as the free
expansion showed. Boltzmann's is the more general: it gives a meaning to the entropy of
a non-equilibrium state, and shows *why* entropy grows. Clausius's is the practical
one for calculations with heat.

Both share the properties you need for calculating:

- **Additive** over subsystems and over successive stages of a process: split a
  process into parts and add their entropy changes.
- **A state function.** The entropy change depends only on the initial and final
  states, not on the process. So if the actual process is irreversible, **imagine some
  reversible process between the same two states** and integrate $\mathrm{d}Q/T$ along
  that: the result is the entropy change of the real process too.

::: define Isentropic process | 等熵过程
A process in which the entropy does not change, $\Delta S=0$. Two cases: a reversible
process in an isolated system, and a reversible adiabatic process in any system
($\mathrm{d}Q=0$ at every step, so $\mathrm{d}S=\mathrm{d}Q/T=0$).
:::

::: callout pitfall "Adiabatic" is not "isentropic"
Only a **reversible** adiabatic process keeps $S$ fixed. The free expansion above is
adiabatic too ($Q=0$), yet $\Delta S=\nu R\ln2>0$. You cannot use $\int\mathrm{d}Q/T$
along the real, irreversible path; you must use a reversible one between the same
states.
:::

## The microscopic meaning of entropy

Put the pieces together. An isolated system wanders among its microstates, each equally
likely. It is therefore almost certain to move from a macrostate with few microstates
(small $\Omega$, small $S$) to one with many (large $\Omega$, large $S$), and once there,
to stay. That is the entropy-increase principle of Lesson 3.2, seen from inside.

::: law Statistical meaning of entropy increase | 熵增加原理的微观意义
The processes that happen in an isolated system go from macrostates of small
thermodynamic probability to macrostates of large thermodynamic probability: from
macrostates with few microstates to macrostates with many. Every natural process goes
from order to disorder.
:::

- $\Omega$ and $S$ are both measures of the disorder of molecular motion.
- The equilibrium state, where $\Omega$ is largest, is the **most disordered state** of
  the molecules' motion.
- An isolated system always passes from non-equilibrium to equilibrium. The opposite
  never happens on its own, without outside influence.

The numbers explain why "never" is fair. By the entropy-change formula, a decrease of
only $\Delta S=-1\ \mathrm{J/K}$ makes the final macrostate less likely by a factor
$e^{-1/k}=e^{-7\times10^{22}}$.

::: callout pitfall Entropy of the system or of the universe?
"Entropy never decreases" is about an **isolated** system. A part of it can lose
entropy perfectly well: water cooling in a fridge, or the heat reservoir in the next
example. What cannot decrease is the total for everything that takes part.
:::

## Example: ice melting in a warm room

::: example Ice meets a 20 °C reservoir
1 kg of ice at 0 °C is put in contact with a large heat reservoir at $t=20$ °C, and
ends as water at 20 °C. Find (1) the entropy change of the ice/water as it turns into
water at 20 °C; (2) the ratio of the numbers of microstates of the 20 °C water and the
0 °C ice; (3) the entropy change of the whole system (water plus reservoir). The latent
heat of fusion is $\lambda=3.35\times10^5\ \mathrm{J/kg}$; the specific heat of water
is $c=4.18\times10^3\ \mathrm{J/(kg\cdot K)}$.
== (1a) Melting at 0 °C ==
The real process is irreversible (heat flows across a 20 K difference), so we imagine
reversible steps between the same states. First, melting at the constant temperature
$T_1=273.15\ \mathrm{K}$ with heat supplied reversibly:
$$\Delta S_1=\int\frac{\mathrm{d}Q}{T}=\frac{Q}{T_1}=\frac{m\lambda}{T_1}=\frac{1\times3.35\times10^5}{273.15}=1.23\times10^3\ \mathrm{J/K}.$$
== (1b) Warming the water from 0 °C to 20 °C ==
Imagine the water heated by a series of reservoirs, each only infinitesimally warmer
than the water, so every heat transfer is reversible. With $\mathrm{d}Q=cm\,\mathrm{d}T$:
$$\Delta S_2=cm\int_{T_1}^{T_2}\frac{\mathrm{d}T}{T}=cm\ln\frac{T_2}{T_1}=1\times4.18\times10^3\times\ln\frac{293.15}{273.15}=2.95\times10^2\ \mathrm{J/K}.$$
== (1c) Add them ==
$$\Delta S=\Delta S_1+\Delta S_2=1226+295=1.52\times10^3\ \mathrm{J/K}.$$
== (2) The ratio of microstates ==
From $\Delta S=k\ln(\Omega_2/\Omega_1)$:
$$\ln\frac{\Omega_2}{\Omega_1}=\frac{\Delta S}{k}=\frac{1.52\times10^3}{1.38\times10^{-23}}=1.10\times10^{26},$$
so
$$\frac{\Omega_2}{\Omega_1}=e^{1.10\times10^{26}}\approx10^{4.8\times10^{25}}.$$
Water at 20 °C can be arranged in unimaginably more ways than ice at 0 °C: the
molecules leave their fixed places in the crystal and move faster.
== (3) The reservoir, and the total ==
The reservoir stays at $T_2=293.15\ \mathrm{K}$ and gives out the heat
$Q=m\lambda+cm(t_2-t_1)$, so its entropy change is
$$\Delta S'=\frac{-Q}{T_2}=-\frac{1\times3.35\times10^5+1\times4.18\times10^3\times(20-0)}{293.15}=-1.43\times10^3\ \mathrm{J/K}.$$
The total for the isolated "water + reservoir" system:
$$\Delta S_{\text{total}}=\Delta S+\Delta S'=1522-1428=+94\ \mathrm{J/K}\approx0.9\times10^2\ \mathrm{J/K}>0.$$
The total entropy increases, as it must for an irreversible process in an isolated
system.
:::

::: callout note The slide's numbers for this example
The slide prints $\Delta S=1.53\times10^3$ J/K (rounding the two parts up first; the
exact sum is $1.52\times10^3$), $\Delta S'=-1.42\times10^3$ J/K (correct: $-1.43\times10^3$)
and a total of $1.0\times10^2$ J/K (correct: about $94$ J/K). The positive sign, which is
the point, is the same. More seriously, it gives $\Omega_2/\Omega_1=1.23\times10^{26}$.
That is wrong: a number of size $10^{26}$ is $\ln(\Omega_2/\Omega_1)=\Delta S/k$, not the
ratio itself. The ratio is $e^{1.10\times10^{26}}$, vastly larger.
:::

::: explore Entropy change of m kg of ice melting and warming to t
slider m: 0.1 .. 5 = 1 | kg | mass of ice
slider t: 0 .. 100 = 20 | °C | final temperature
dS1 = m 3.35e5 / 273.15 | J/K | melting at 0 °C
dS2 = m 4180 ln((t + 273.15) / 273.15) | J/K | warming the water
dS = dS1 + dS2 | J/K | water's entropy change
r = dS / 1.38e-23 | | ln(Ω₂/Ω₁)
:::

::: callout pitfall Kelvin, always
Every $T$ in $Q/T$ and $\ln(T_2/T_1)$ is in kelvin. With degrees Celsius,
$\ln(20/0)$ is meaningless and $m\lambda/0$ is infinite. A difference such as
$t_2-t_1$ is the same in both scales, so the heat $cm(t_2-t_1)$ may use °C.
:::

::: callout exam What exams ask
- Count microstates for a few molecules in two halves ($\binom Nn$), give the most
  probable macrostate and the probabilities.
- State $S=k\ln\Omega$, what $\Omega$ is, and why the logarithm (additivity).
- Compare Boltzmann and Clausius entropy (which states and processes each covers).
- Entropy change of melting plus heating ($m\lambda/T$ and $cm\ln(T_2/T_1)$), of the
  reservoir ($-Q/T$), and the sign of the total.
- True/false: "the second law is statistical", "equilibrium is the most disordered
  state", "an adiabatic process is isentropic".
:::

::: cards Microstates and Boltzmann entropy
Microscopic meaning of the second law :: Natural processes go in the direction of increasing disorder of molecular thermal motion
Why is the second law called statistical? :: It holds with overwhelming probability for huge numbers of molecules; the reverse is improbable, not forbidden by mechanics
Macrostate (宏观态) :: The large-scale description: e.g. how many molecules are in each half, not which ones
Microstate (微观态) :: The detailed description: which molecule is where (and how it moves)
Thermodynamic probability Ω (热力学概率) :: The number of microstates of a macrostate; a whole number, not a probability between 0 and 1
Microstates of 4 molecules in two halves :: 1, 4, 6, 4, 1 (total $2^4=16$); probabilities 1/16, 1/4, 3/8, 1/4, 1/16
Microstates with $n$ of $N$ molecules on the left :: $\binom Nn=\dfrac{N!}{n!(N-n)!}$, out of $2^N$ in all
Equal-probability hypothesis (等概率假设) :: In an isolated system in equilibrium every allowed microstate is equally likely
Equilibrium state in terms of Ω :: The macrostate with the largest Ω (most microstates, most disordered)
Boltzmann entropy formula :: $S=k\ln\Omega$ (Boltzmann's $S\propto\ln\Omega$, written so by Planck)
Why the logarithm in $S=k\ln\Omega$? :: Independent parts multiply, $\Omega=\Omega_1\Omega_2$, so $S=S_1+S_2$: entropy is additive
Entropy change from microstates :: $\Delta S=k\ln(\Omega_2/\Omega_1)$, so $\Omega_2/\Omega_1=e^{\Delta S/k}$
Boltzmann vs Clausius entropy :: Boltzmann: any macrostate, any process; Clausius $\mathrm{d}S=\mathrm{d}Q/T$: equilibrium states, reversible path
Entropy change of an irreversible process :: Entropy is a state function: integrate $\mathrm{d}Q/T$ along any imagined reversible path between the same states
Isentropic process (等熵过程) :: $\Delta S=0$: a reversible process of an isolated system, or a reversible adiabatic process of any system
Entropy change of melting mass $m$ at $T$ :: $\Delta S=m\lambda/T$
:::

::: quiz Check yourself
? Six labelled molecules are spread over the two halves of a box. How many microstates does the macrostate "3 on the left, 3 on the right" have?
answer: comb(6, 3)
> $\binom63=\dfrac{6!}{3!\,3!}=20$. The other macrostates have 1, 6, 15, 15, 6, 1, so
> 20 is the largest, and there are $2^6=64$ microstates in all.

? With four molecules, what is the probability that all of them are in the left half at once?
answer: 1/16
> One microstate ($abcd$ on the left) out of $2^4=16$ equally likely ones.

? Twenty molecules: what is the thermodynamic probability Ω of the macrostate 10 : 10?
answer: comb(20, 10)
> $\Omega=\binom{20}{10}=184\,756$ (the slide prints 184 765, with two digits swapped).

? Which statement about the thermodynamic probability Ω is right?
- [ ] It is a number between 0 and 1
- [x] It is the number of microstates of a macrostate, and is largest in equilibrium
- [ ] It depends on the process by which the state was reached
- [ ] It is smallest in equilibrium, where the molecules are most ordered
> $\Omega$ counts microstates, so it is a (usually huge) whole number and a state
> quantity. Equilibrium is the macrostate with the most microstates, the most
> disordered one.

? A system changes to a macrostate with three times as many microstates. What is its entropy change?
answer: k_B * ln(3) J/K
> $\Delta S=k\ln(\Omega_2/\Omega_1)=1.38\times10^{-23}\times\ln3=1.52\times10^{-23}\ \mathrm{J/K}$.

? Two independent subsystems have thermodynamic probabilities $\Omega_1$ and $\Omega_2$. Write the entropy of the whole system.
expression: k ln(W1) + k ln(W2)
variables: k, W1, W2
> Every microstate of one combines with every microstate of the other, so
> $\Omega=\Omega_1\Omega_2$ and $S=k\ln(\Omega_1\Omega_2)=k\ln\Omega_1+k\ln\Omega_2$
> (write $\Omega_1$ as W1). This is why entropy is additive.

? 2 mol of an ideal gas expand freely into a vacuum, doubling their volume. Using $\Omega_2/\Omega_1=2^N$, find the entropy change.
answer: 2 * 8.31 * ln(2) J/K
tolerance: 1%
> $\Delta S=k\ln2^N=Nk\ln2=\nu R\ln2=2\times8.31\times0.693=11.5\ \mathrm{J/K}$, the same
> as the Clausius result of Lesson 3.2.

? Which is true of the Boltzmann entropy $S=k\ln\Omega$, compared with the Clausius entropy $\mathrm{d}S=\mathrm{d}Q/T$?
- [x] Boltzmann's applies to any macrostate, including non-equilibrium ones; Clausius's needs equilibrium states and a reversible path
- [ ] Clausius's applies to any process; Boltzmann's only to reversible ones
- [ ] They give different entropy changes for the same two equilibrium states
- [ ] Boltzmann's only applies to ideal gases
> The comparison table: Boltzmann entropy covers any system, any macrostate, any
> process. Clausius entropy is defined for equilibrium states, with $\mathrm{d}Q/T$
> taken along a reversible process. Where both apply they agree.

? Which process is isentropic ($\Delta S=0$)?
- [ ] The free expansion of a gas in an insulated box
- [x] A slow, frictionless (reversible) adiabatic expansion
- [ ] Ice melting in a warm room
- [ ] Any adiabatic process
> Isentropic: a reversible adiabatic process (any system) or a reversible process of
> an isolated system. A free expansion is adiabatic but irreversible, so $\Delta S>0$.

? 1 kg of ice at 0 °C melts into water at 0 °C ($\lambda=3.35\times10^5$ J/kg). What is its entropy change?
answer: 3.35e5 / 273.15 J/K
tolerance: 1%
> The melting happens at constant $T=273.15$ K, so
> $\Delta S=m\lambda/T=3.35\times10^5/273.15=1.23\times10^3\ \mathrm{J/K}$.

? In the ice example, the reservoir at 20 °C gives out $4.19\times10^5$ J of heat. What is the entropy change of the reservoir?
answer: -4.19e5 / 293.15 J/K
tolerance: 1%
> The reservoir's temperature stays at 293.15 K, so
> $\Delta S'=-Q/T_2=-4.19\times10^5/293.15=-1.43\times10^3\ \mathrm{J/K}$. Its entropy
> falls, but the water's rises by $1.52\times10^3$ J/K, so the total rises by about
> 94 J/K.

? In the box model, the name for the number of microstates that make up one macrostate (English or Chinese)?
text: thermodynamic probability | 热力学概率
> $\Omega$, the thermodynamic probability. Boltzmann's entropy is $S=k\ln\Omega$.
:::

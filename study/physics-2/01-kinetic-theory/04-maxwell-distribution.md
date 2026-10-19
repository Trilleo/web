---
title: Maxwell's speed distribution
zh: 麦克斯韦速率分布律
summary: The speed distribution function f(v) and what expressions built from it mean, Maxwell's speed distribution, the most probable, mean and rms speeds and how they change with temperature and molar mass, and the experiments that confirmed it.
source: 第13章 气体动理论 §13.4 麦克斯韦速率分布律, 实验验证, 2026-09-09 and 2026-09-11
---

Lesson 1.2 worked out *one* typical speed for gas molecules, the rms speed
$\sqrt{\overline{v^2}}$. But the molecules in a gas don't all move at that speed. Every
collision changes speeds: some molecules are almost at rest for a moment, a few are
racing along at several times the average. How are the speeds spread out? In 1859
James Clerk Maxwell answered that question for a gas in equilibrium. His
**speed distribution** tells you what fraction of molecules has any range of speeds,
and from it come three "typical" speeds used all through the course. It matters
wherever the fast few count: evaporation, chemical reactions, gases escaping from a
planet's atmosphere.

## The speed distribution function

### From a histogram to a curve

Imagine you could measure the speed of each of the $N$ molecules in a box. To see how
the speeds spread out, you would sort them into bins — 0–100 m/s, 100–200 m/s, and so
on — and count $\Delta N$ in each. A bar chart of $\Delta N$ already shows the shape: few
very slow molecules, a hump in the middle, a long thin tail of fast ones.

Two things make the bar chart depend on choices you made, so fix them:

1. Divide by $N$, so the answer is a **fraction** $\Delta N/N$, the same for a small or
   a large sample.
2. Divide by the bin width $\Delta v$, because a bin twice as wide catches about twice as
   many molecules. $\dfrac{\Delta N}{N\,\Delta v}$ is then the fraction **per unit speed
   interval**.

Now let the bins shrink, $\Delta v\to\mathrm dv$. The tops of the bars become a smooth
curve: the speed distribution function.

::: define Speed distribution function | 速率分布函数
For a gas of $N$ molecules in equilibrium, let $\mathrm dN$ be the number of molecules with
speeds between $v$ and $v+\mathrm dv$. The speed distribution function is
$$f(v)=\frac{\mathrm dN}{N\,\mathrm dv},$$
the fraction of the molecules per unit speed interval near the speed $v$. Equivalently,
$f(v)\,\mathrm dv=\mathrm dN/N$ is the probability that a molecule's speed lies between
$v$ and $v+\mathrm dv$.
:::

$f(v)$ has the unit s/m (one over a speed). It is **not** itself a fraction of molecules:
only $f(v)\,\mathrm dv$, a narrow strip of area under the curve, is. If you studied
probability, $f(v)$ is the probability density of the speed.

Every molecule has *some* speed between 0 and ∞, so all the strips together must add up
to all the molecules:

::: formula Normalisation condition | 归一化条件
$$\int_0^\infty f(v)\,\mathrm dv=1$$
--
f(v) | speed distribution function | s/m
v | molecular speed | m/s
:::

The total area under any speed distribution curve is 1. That one fact solves many
problems: it fixes an unknown constant in a given $f(v)$.

### What expressions built from f(v) mean

Exam questions love asking what an expression means "physically". Everything follows
from $f(v)\,\mathrm dv=\mathrm dN/N$, the number density $n=N/V$ (Lesson 1.1) and
"integrating adds up strips":

| Expression | Equals | Meaning |
| --- | --- | --- |
| $f(v)\,\mathrm dv$ | $\dfrac{\mathrm dN}{N}$ | the **fraction** of molecules with speeds in $v\sim v+\mathrm dv$ |
| $Nf(v)\,\mathrm dv$ | $\mathrm dN$ | the **number** of molecules with speeds in $v\sim v+\mathrm dv$ |
| $nf(v)\,\mathrm dv$ | $\dfrac{\mathrm dN}{V}$ | the number **per unit volume** with speeds in $v\sim v+\mathrm dv$ |
| $\displaystyle\int_{v_1}^{v_2}f(v)\,\mathrm dv$ | $\dfrac{\Delta N}{N}$ | the fraction (probability) of molecules with speeds in $v_1\sim v_2$ |
| $N\displaystyle\int_{v_1}^{v_2}f(v)\,\mathrm dv$ | $\Delta N$ | the number of molecules with speeds in $v_1\sim v_2$ |
| $n\displaystyle\int_{v_1}^{v_2}f(v)\,\mathrm dv$ | $\dfrac{\Delta N}{V}$ | the number per unit volume with speeds in $v_1\sim v_2$ |
| $\displaystyle\int_{v_1}^{v_2}vf(v)\,\mathrm dv$ | $\dfrac{1}{N}\int_{v_1}^{v_2}v\,\mathrm dN$ | the sum of the speeds in $v_1\sim v_2$, divided by **all** $N$ — not the mean speed of that group |

::: formula Number of molecules in a speed interval | 速率区间内的分子数
$$\Delta N=N\int_{v_1}^{v_2}f(v)\,\mathrm dv,\qquad P=\frac{\Delta N}{N}=\int_{v_1}^{v_2}f(v)\,\mathrm dv$$
--
\Delta N | number of molecules with speeds between $v_1$ and $v_2$ | —
P | probability that one molecule's speed is between $v_1$ and $v_2$ | —
N | total number of molecules | —
:::

To find an **average** of something over a group, add it up over the group and divide by
the number *in that group*. For the mean speed of the molecules between $v_1$ and $v_2$
(example 7 on the slides):

::: formula Mean speed within a speed interval | 速率区间内分子的平均速率
$$\bar v_{v_1\sim v_2}=\frac{\int_{v_1}^{v_2}v\,\mathrm dN}{\int_{v_1}^{v_2}\mathrm dN}=\frac{\int_{v_1}^{v_2}vf(v)\,\mathrm dv}{\int_{v_1}^{v_2}f(v)\,\mathrm dv}$$
--
\bar v_{v_1\sim v_2} | mean speed of the molecules whose speeds are between $v_1$ and $v_2$ | m/s
f(v) | speed distribution function | s/m
:::

The $N$ in $\mathrm dN=Nf(v)\,\mathrm dv$ cancels between top and bottom. (The slide
prints the denominator as $\int_{v_1}^{v_2}\Delta N$, a slip for $\Delta N=\int_{v_1}^{v_2}\mathrm dN$.)

::: callout pitfall The mean over a group divides by the group
$\int_{v_1}^{v_2}vf(v)\,\mathrm dv$ alone is **not** the mean speed of the molecules in
$v_1\sim v_2$: it divides their total speed by all $N$ molecules. Divide by the fraction
$\int_{v_1}^{v_2}f(v)\,\mathrm dv$ in that group as well. Only for the whole range
$0\sim\infty$, where that fraction is 1, is $\int_0^\infty vf(v)\,\mathrm dv$ the mean
speed $\bar v$.
:::

::: example A staircase distribution
$N$ molecules have the speed distribution shown in the figure below: $Nf(v)$ rises in steps
of $a/3$ from $a/3$ (for $0<v<v_0$) to $a$ (for $2v_0<v<3v_0$), then falls back the same
way to $a/3$ (for $4v_0<v<5v_0$); there are no molecules faster than $5v_0$. Find $a$.
== Use the area ==
$Nf(v)\,\mathrm dv=\mathrm dN$, so the area under the $Nf(v)$ graph counts molecules, and
the whole area must be $N$.
== Add the five steps ==
Each step is $v_0$ wide:
$$\left(\frac a3+\frac{2a}3+a+\frac{2a}3+\frac a3\right)v_0=3av_0=N.$$
== Answer ==
$a=\dfrac{N}{3v_0}$ (choice B on the slide).
:::

::: plot The staircase distribution (v in units of v₀, Nf(v) in units of a)
x: 0 .. 5
y: 0 .. 1.2
xlabel: v / v₀
ylabel: Nf(v) / a
Nf(v) = (3 - abs(floor(v) - 2))/3
:::

::: example A distribution made of a ramp and a step
$N$ particles have the speed distribution
$$f(v)=\begin{cases}av/v_0, & 0\le v\le v_0\\ a, & v_0\le v\le 2v_0\\ 0, & v\ge 2v_0.\end{cases}$$
(1) Sketch it and find the constant $a$. (2) How many particles are faster than $v_0$, and
how many slower? (3) Find the mean speed.
== The curve ==
A straight line from the origin up to height $a$ at $v_0$, flat at $a$ until $2v_0$, then
zero (figure below).
== Normalise ==
$$\int_0^\infty f\,\mathrm dv=\int_0^{v_0}\frac{av}{v_0}\mathrm dv+\int_{v_0}^{2v_0}a\,\mathrm dv=\frac12av_0+av_0=\frac32av_0=1\ \Rightarrow\ a=\frac{2}{3v_0}.$$
== Faster and slower than v₀ ==
$$\Delta N_1=N\int_{v_0}^{2v_0}a\,\mathrm dv=Nav_0=\frac23N,\qquad \Delta N_2=N-\Delta N_1=\frac13N.$$
== Mean speed ==
$$\bar v=\int_0^\infty vf(v)\,\mathrm dv=\int_0^{v_0}\frac{av^2}{v_0}\mathrm dv+\int_{v_0}^{2v_0}av\,\mathrm dv=\frac{av_0^2}{3}+\frac{3av_0^2}{2}=\frac{11}{6}av_0^2=\frac{11}{9}v_0.$$
:::

::: plot The ramp-and-step distribution with a = 2/(3v₀); the shaded area is the fraction faster than v₀
x: 0 .. 2.5
y: 0 .. 1
xlabel: v / v₀
ylabel: f(v) · v₀
f(v) = (2/3) min(v, 1) (1 - floor(v/2))
region P: 1 < v < 2, 0 < y < 2/3
:::

## Maxwell's speed distribution

For an ideal gas in equilibrium Maxwell found the exact shape of $f(v)$:

::: law Maxwell's speed distribution law | 麦克斯韦速率分布律
For an ideal gas in equilibrium at temperature $T$, whose molecules have mass $m$, the
speed distribution function is
$$f(v)=4\pi\left(\frac{m}{2\pi kT}\right)^{3/2}v^2\,e^{-mv^2/2kT}.$$
:::

::: formula Maxwell speed distribution | 麦克斯韦速率分布函数
$$f(v)=4\pi\left(\frac{m}{2\pi kT}\right)^{3/2}v^2e^{-mv^2/2kT}=\frac{4}{\sqrt\pi}\,\frac{v^2}{v_p^3}\,e^{-v^2/v_p^2}$$
--
f(v) | Maxwell speed distribution function | s/m
m | mass of one molecule | kg
k | Boltzmann constant, $1.38\times10^{-23}$ | J/K
T | thermodynamic temperature | K
v_p | most probable speed, $\sqrt{2kT/m}$ (below) | m/s
:::

Read the formula as two competing factors:

- $v^2$ grows with speed. It counts how many ways there are to have a speed $v$: all the
  velocity vectors of length $v$ lie on a sphere whose area $4\pi v^2$ grows with $v$.
  That is why $f(0)=0$: almost no molecule is exactly at rest.
- $e^{-mv^2/2kT}$ shrinks very fast with speed. Its exponent is the kinetic energy
  $\frac12mv^2$ compared with $kT$: high energies are exponentially rare.

Their product rises from zero, peaks, and dies away in a long tail on the right. The
second form, with $v_p$, is handy for numbers: only the ratio $v/v_p$ matters.

::: callout warning When the law applies
1. Only to a gas in **equilibrium**: a gas being stirred or just released has some other
   distribution.
2. In a **mixture**, each component has its own Maxwell distribution with its own $m$
   (all at the same $T$).
3. It is a statistical law: it describes a huge number of molecules, not any one of them.
:::

## The three characteristic speeds

### Most probable speed

The speed where $f(v)$ peaks is the {{term most probable speed | 最概然速率}} $v_p$: a
speed interval of fixed width $\mathrm dv$ near $v_p$ holds more molecules than one of the
same width anywhere else. At the peak the slope is zero:
$$\frac{\mathrm d}{\mathrm dv}\left(v^2e^{-mv^2/2kT}\right)=\left(2v-\frac{m}{kT}v^3\right)e^{-mv^2/2kT}=0\ \Rightarrow\ v^2=\frac{2kT}{m}.$$

::: formula Most probable speed | 最概然速率
$$v_p=\sqrt{\frac{2kT}{m}}=\sqrt{\frac{2RT}{M}}\approx1.41\sqrt{\frac{RT}{M}}$$
--
v_p | most probable speed (where $f(v)$ is largest) | m/s
m | mass of one molecule | kg
M | molar mass | kg/mol
R | molar gas constant, $8.31$ | J/(mol·K)
:::

The two forms are the same because $m/k=M/R$ (multiply top and bottom by $N_A$).

### Mean speed

The {{term mean speed | 平均速率}} is the ordinary average of all $N$ speeds. Grouping
molecules by speed turns the sum into an integral:
$$\bar v=\frac{v_1+v_2+\cdots+v_N}{N}=\frac{\int v\,\mathrm dN}{N}=\int_0^\infty vf(v)\,\mathrm dv.$$
With Maxwell's $f(v)$ the integral needs $\int_0^\infty v^3e^{-bv^2}\mathrm dv=\dfrac{1}{2b^2}$
($b=m/2kT$), and it gives:

::: formula Mean speed | 平均速率
$$\bar v=\int_0^\infty vf(v)\,\mathrm dv=\sqrt{\frac{8kT}{\pi m}}=\sqrt{\frac{8RT}{\pi M}}\approx1.60\sqrt{\frac{RT}{M}}$$
--
\bar v | mean (average) speed of the molecules | m/s
m | mass of one molecule | kg
M | molar mass | kg/mol
:::

### The rms speed again

The same method gives the mean of $v^2$:
$\overline{v^2}=\int_0^\infty v^2f(v)\,\mathrm dv=\dfrac{3kT}{m}$, so the
root-mean-square (rms) speed is $\sqrt{\overline{v^2}}=\sqrt{3kT/m}=\sqrt{3RT/M}\approx1.73\sqrt{RT/M}$ —
exactly the result of Lesson 1.2, now obtained from the distribution.

::: callout key Three speeds, one pattern
$$v_p:\bar v:\sqrt{\overline{v^2}}=\sqrt2:\sqrt{8/\pi}:\sqrt3\approx1.41:1.60:1.73,\qquad v_p<\bar v<\sqrt{\overline{v^2}}.$$
All three are $\propto\sqrt{T/M}$. They differ because the curve is lopsided: the long tail
of fast molecules pulls the mean above the peak, and squaring weights the fast ones even
more. Each has its use: $v_p$ for the shape of the distribution, $\bar v$ for collisions
(Lesson 1.5), $\sqrt{\overline{v^2}}$ for energy and pressure.
:::

::: example The three speeds of oxygen at 300 K
Find $v_p$, $\bar v$ and $\sqrt{\overline{v^2}}$ for oxygen at 300 K
($M=0.032$ kg/mol, $R=8.31$ J/(mol·K)).
== Common factor ==
$\dfrac{RT}{M}=\dfrac{8.31\times300}{0.032}=7.79\times10^4\ \mathrm{m^2/s^2}$.
== Most probable ==
$v_p=\sqrt{2\times7.79\times10^4}=395$ m/s.
== Mean ==
$\bar v=\sqrt{8\times7.79\times10^4/\pi}=445$ m/s.
== rms ==
$\sqrt{\overline{v^2}}=\sqrt{3\times7.79\times10^4}=483$ m/s. In the order
$v_p<\bar v<\sqrt{\overline{v^2}}$, as they must be.
:::

## How the curve changes with T and with the gas

Since $v_p\propto\sqrt{T/m}$:

- **Same gas, higher temperature**: all three speeds grow $\propto\sqrt T$. The peak
  moves right. The area must stay 1, so the curve also gets **lower and wider**.
- **Same temperature, different gases**: the speeds go $\propto1/\sqrt m$ (or
  $1/\sqrt M$). Light molecules (H₂) have a low, wide curve far to the right; heavy ones
  (O₂, CO₂) a tall, narrow curve near the origin.

So "high $T$" and "small $m$" look the same on the graph: both stretch the curve to the
right and flatten it. Try it below: the two curves have their own temperature and molar
mass (in g/mol). Set them to the same gas at two temperatures, then to two gases at one
temperature.

::: plot Maxwell distributions for two gases or two temperatures
x: 0 .. 2500
xlabel: v (m/s)
ylabel: f(v) (s/m)
f1(v) = 4 pi (M1/1000/(2*pi*8.31*T1))^(3/2) v^2 exp(-M1/1000 v^2/(2*8.31*T1))
f2(v) = 4 pi (M2/1000/(2*pi*8.31*T2))^(3/2) v^2 exp(-M2/1000 v^2/(2*8.31*T2))
slider T1: 50 .. 2000 = 300 | K | curve 1
slider M1: 2 .. 100 = 32 | g/mol | curve 1
slider T2: 50 .. 2000 = 1200 | K | curve 2
slider M2: 2 .. 100 = 32 | g/mol | curve 2
:::

With both at 32 g/mol, 300 K and 1200 K: four times the temperature doubles $v_p$
(395 → 790 m/s) and halves the height of the peak. Two curves with equal area must cross:
right of the crossing the hot gas has more molecules, left of it fewer.

::: callout pitfall The peak is not "the fraction at v_p"
The height $f(v_p)$ is not the fraction of molecules moving at $v_p$. The fraction with
speed *exactly* $v_p$ is zero; only an interval has molecules in it, and its share is the
area $f(v)\,\mathrm dv$. A lower peak doesn't mean fewer molecules overall: every
Maxwell curve has area 1.
:::

## Using the distribution: fractions near a speed

For a narrow interval $\Delta v$ near $v$, the area is almost a rectangle,
$\Delta N/N\approx f(v)\,\Delta v$. Use the $v_p$ form of Maxwell's law, which only needs
$v/v_p$.

::: example Molecules within 1% of the most probable speed
What percentage of a gas's molecules have speeds between $v_p-v_p/100$ and $v_p+v_p/100$?
== The interval ==
Width $\Delta v=\dfrac{2v_p}{100}=\dfrac{v_p}{50}$, narrow enough to treat $f$ as constant.
Take $v=\frac{99}{100}v_p$, the lower end, as the slide does (the middle, $v=v_p$, gives
the same answer to three figures).
== Apply Maxwell's law ==
$$\frac{\Delta N}{N}=\frac{4}{\sqrt\pi}\frac{v^2}{v_p^3}e^{-v^2/v_p^2}\Delta v=\frac{4}{\sqrt\pi}\left(\frac{99}{100}\right)^2e^{-(99/100)^2}\cdot\frac{1}{50}=1.66\%.$$
== Notice ==
The answer doesn't depend on the gas or the temperature: only the ratio $v/v_p$ enters.
Even the "most popular" speeds, within ±1% of $v_p$, hold under 2% of the molecules.
:::

::: example Air molecules near v_p and near 10 v_p
For air at 300 K ($M=29$ g/mol), what fraction of the molecules have speeds in a 1 m/s
interval (1) near $v_p$, (2) near $10v_p$? On average, how many molecules is that in
$10^5$ mol of air?
== Most probable speed ==
$$v_p=\sqrt{\frac{2RT}{M}}=\sqrt{\frac{2\times8.31\times300}{29\times10^{-3}}}=415\ \mathrm{m/s}.$$
== Near v_p ==
With $v=v_p$ the exponent is $-1$:
$$w_1=\frac{4}{\sqrt\pi}\frac{1}{v_p}e^{-1}\,\mathrm dv=\frac{4}{\sqrt\pi}\times\frac{1}{415}\times e^{-1}\times1=2.0\times10^{-3}=0.2\%.$$
== Near 10 v_p ==
Now $v/v_p=10$:
$$w_2=\frac{4}{\sqrt\pi}\times\frac{10^2}{415}\times e^{-100}\times1=2\times10^{-44}=2\times10^{-42}\,\%.$$
== Numbers of molecules ==
$N=10^5\times6.02\times10^{23}=6.02\times10^{28}$.
$N_1=Nw_1=6.02\times10^{28}\times0.002=1.2\times10^{26}$.
$N_2=Nw_2\approx10^{-15}$: on average **no** molecule at all. The factor $e^{-100}$ wipes
out the tail.
:::

::: callout note The slide's 1.41
The slide writes $v_p=1.41\sqrt{RT/M}$ but prints 415 m/s; $1.41\times\sqrt{8.31\times300/0.029}$
is 413 m/s, while the exact $\sqrt2$ gives 415 m/s. The difference (0.3%) changes none of
the later results.
:::

The explorer finds the fraction between any two speeds exactly. (The area under Maxwell's
curve has a closed form with the error function:
$\int_0^{v}f\,\mathrm dv=\operatorname{erf}(x)-\frac{2}{\sqrt\pi}xe^{-x^2}$ with $x=v/v_p$;
you won't need it in exams, but it lets the explorer work.)

::: explore Speeds of a gas, and the fraction between two speeds
slider T: 50 .. 2000 = 300 | K
slider M: 2 .. 100 = 29 | g/mol | molar mass
slider v1: 0 .. 3000 = 400 | m/s
slider v2: 0 .. 3000 = 800 | m/s
vp = sqrt(2 * 8.31 * T / (M/1000)) | m/s | Most probable speed v_p
vm = sqrt(8 * 8.31 * T / (pi * M/1000)) | m/s | Mean speed
vr = sqrt(3 * 8.31 * T / (M/1000)) | m/s | rms speed
P = 100 * ((erf(v2/vp) - 2/sqrt(pi) * v2/vp * exp(-(v2/vp)^2)) - (erf(v1/vp) - 2/sqrt(pi) * v1/vp * exp(-(v1/vp)^2))) | % | Fraction with speeds from v1 to v2
:::

The same area, drawn: the shaded part under the curve is the fraction of molecules between
$v_1$ and $v_2$.

::: plot The fraction of molecules between v₁ and v₂ is the area under f(v)
x: 0 .. 2000
xlabel: v (m/s)
ylabel: f(v) (s/m)
f(v) = 4 pi (M/1000/(2*pi*8.31*T))^(3/2) v^2 exp(-M/1000 v^2/(2*8.31*T))
region P: v1 < v < v2, 0 < y < 4 pi (M/1000/(2*pi*8.31*T))^(3/2) v^2 exp(-M/1000 v^2/(2*8.31*T))
slider T: 50 .. 2000 = 300 | K
slider M: 2 .. 100 = 29 | g/mol | molar mass
slider v1: 0 .. 2000 = 400 | m/s
slider v2: 0 .. 2000 = 800 | m/s
:::

For any gas in equilibrium (only $v/v_p$ matters), a few facts to remember: about 43% of the molecules are slower than
$v_p$, 53% slower than $\bar v$, and only 4.6% faster than $2v_p$.

## Checking Maxwell's law by experiment

Maxwell derived his law from statistics in 1859, long before anyone could measure
molecular speeds. Checking it needs two things: a sample of molecules taken from a gas in
equilibrium, and a way to sort them by speed.

### Molecular beams

A container O holds the gas in equilibrium. A narrow slit S in its wall lets some
molecules escape into a high vacuum outside; further slits $S_1$ and $S_2$ in line with S
let through only those moving in one direction. The result is a thin
{{term molecular beam | 分子射线}}: in the vacuum the molecules no longer collide, so the
beam carries a sample of the speeds inside the container.

### 葛正权's experiment (1934)

In 1934 the Chinese physicist 葛正权 (Ge Zhengquan) measured the speed distribution of
bismuth vapour. The beam entered a rotating hollow cylinder of diameter $D$ through a slit
$S_3$ and flew straight across to a curved glass plate G on the far side, where the
bismuth stuck.

- Crossing the diameter takes a molecule of speed $v$ a time $t=D/v$.
- Meanwhile the cylinder, turning at angular speed $\omega$, rotates by $\theta=\omega t$,
  so the plate has moved on by an arc $s=\frac D2\theta=\frac12D\omega t$.

Fast molecules land close to the point P opposite the slit; slow ones land further back.
Eliminating $t$:

::: formula Speed in Ge Zhengquan's experiment | 葛正权实验
$$v=\frac{D^2\omega}{2s}$$
--
v | speed of the molecules landing at arc distance $s$ | m/s
D | diameter of the rotating cylinder | m
\omega | angular speed of the cylinder | rad/s
s | arc distance on the plate from the point opposite the slit | m
:::

Measuring the thickness of the bismuth layer as a function of $s$ gives how many
molecules arrived with each speed, i.e. the distribution. The difficulty: bismuth vapour
contains Bi, Bi₂ and Bi₃ molecules in unknown proportions, each with its own mass and so
its own distribution.

::: example Where the molecules land
In an apparatus like Ge's, $D=10$ cm and the cylinder turns at 100 revolutions per second.
How far from P do molecules with speed 300 m/s land?
== Angular speed ==
$\omega=2\pi\times100=628$ rad/s.
== Arc distance ==
$$s=\frac{D^2\omega}{2v}=\frac{0.10^2\times628}{2\times300}=1.05\times10^{-2}\ \mathrm m\approx1.0\ \mathrm{cm}.$$
Molecules at 150 m/s would land twice as far, about 2.1 cm.
:::

### The Miller–Kusch experiment (1955)

In 1955 Miller and Kusch made a far more precise test with thallium (or potassium) vapour,
at 870 K and 4.27 Pa in the oven. The beam passed through a
{{term velocity selector | 速度选择器}} R: an aluminium cylinder of length $l$ with thin
helical slots cut along its surface, so that the exit end of a slot is turned by an angle
$\Phi$ relative to its entrance. A detector D (working like an ionisation gauge) measured
the beam's strength behind it.

While R spins at angular speed $\omega$, a molecule entering a slot gets through only if it
crosses the length $l$ in exactly the time the cylinder takes to turn by $\Phi$; otherwise
the slot wall moves into its path and it sticks there:
$$\frac lv=\frac\Phi\omega.$$

::: formula Velocity selector | 速度选择器
$$v=\frac{\omega l}{\Phi}$$
--
v | speed of the molecules that pass the selector | m/s
\omega | angular speed of the cylinder | rad/s
l | length of the cylinder | m
\Phi | angle between the entrance and exit of a slot | rad
:::

Turning R at $\omega_1,\omega_2,\omega_3,\ldots$ selects one speed after another, and the
detector's current at each gives the number of molecules with that speed.

*Can molecules a little faster or slower get through?* Yes: the slots have a width, so the
angle between entrance and exit covers a small range, and so does the speed. Each setting
lets through a narrow **interval** of speeds — which is exactly what $f(v)\,\mathrm dv$
describes.

::: callout note The angle Φ
The slide gives $\Phi=48^\circ$. Miller and Kusch's own cylinder, as usually quoted, had
$l=20.4$ cm and $\Phi\approx4.8^\circ$ (0.0841 rad); the slide's value has probably lost its
decimal point. The example below uses 4.8°.
:::

::: example Tuning the velocity selector
A selector has $l=20.4$ cm and $\Phi=4.8^\circ$. (1) Which speed passes when it turns at
100 rad/s? (2) How fast must it turn to pass thallium atoms ($M=204$ g/mol) at their most
probable speed at 870 K?
== Angle in radians ==
$\Phi=4.8\times\dfrac{\pi}{180}=0.0838$ rad.
== Speed at 100 rad/s ==
$$v=\frac{\omega l}{\Phi}=\frac{100\times0.204}{0.0838}=243\ \mathrm{m/s}.$$
== Most probable speed of thallium ==
$$v_p=\sqrt{\frac{2RT}{M}}=\sqrt{\frac{2\times8.31\times870}{0.204}}=266\ \mathrm{m/s}.$$
== Angular speed needed ==
$$\omega=\frac{v_p\Phi}{l}=\frac{266\times0.0838}{0.204}=109\ \mathrm{rad/s}\ (\text{about }1040\ \text{rpm}).$$
:::

### What the experiments found

The measured intensities for thallium lie right on Maxwell's curve. In words:

- the fraction of molecules depends on the speed and on the width of the interval;
- very fast and very slow molecules are rare;
- the fraction is largest near one particular speed (the most probable speed);
- changing the gas or its temperature changes the details, but these features stay.

(The slide's graph plots relative intensity against speed in units of a reference speed;
its axis labels are printed out of order, so they aren't copied here.)

::: callout exam What exams ask
- The physical meaning of $f(v)$, $Nf(v)\mathrm dv$, $n\int f\,\mathrm dv$ and the like.
- Normalisation to find a constant, then a number of molecules or a mean speed from a
  given (often piecewise) $f(v)$.
- Formulas and order of $v_p$, $\bar v$, $\sqrt{\overline{v^2}}$; ratios for two gases or
  two temperatures ($\propto\sqrt{T/M}$).
- Which of two Maxwell curves is hotter or lighter (the one further right and lower).
:::

::: cards Maxwell's speed distribution
Speed distribution function :: $f(v)=\dfrac{\mathrm dN}{N\,\mathrm dv}$, the fraction of molecules per unit speed interval near $v$ (速率分布函数)
Normalisation condition :: $\int_0^\infty f(v)\,\mathrm dv=1$ (归一化条件)
Meaning of $Nf(v)\,\mathrm dv$ :: The number of molecules with speeds in $v\sim v+\mathrm dv$
Meaning of $nf(v)\,\mathrm dv$ :: The number of molecules per unit volume with speeds in $v\sim v+\mathrm dv$
Meaning of $\int_{v_1}^{v_2}f(v)\,\mathrm dv$ :: The fraction (probability) of molecules with speeds from $v_1$ to $v_2$
Mean speed of the molecules between $v_1$ and $v_2$ :: $\dfrac{\int_{v_1}^{v_2}vf\,\mathrm dv}{\int_{v_1}^{v_2}f\,\mathrm dv}$
Maxwell speed distribution :: $f(v)=4\pi\left(\frac{m}{2\pi kT}\right)^{3/2}v^2e^{-mv^2/2kT}$, for a gas in equilibrium
Most probable speed :: $v_p=\sqrt{2kT/m}=\sqrt{2RT/M}\approx1.41\sqrt{RT/M}$
Mean speed :: $\bar v=\sqrt{8kT/\pi m}=\sqrt{8RT/\pi M}\approx1.60\sqrt{RT/M}$
Order of the three speeds :: $v_p<\bar v<\sqrt{\overline{v^2}}$, in the ratio $1.41:1.60:1.73$
Higher $T$ or lighter molecules :: The Maxwell curve moves right and gets lower and wider; speeds $\propto\sqrt{T/M}$
Ge Zhengquan's experiment :: 1934, bismuth vapour, rotating cylinder: $v=D^2\omega/2s$
Velocity selector (Miller–Kusch, 1955) :: A spinning cylinder with helical slots passes $v=\omega l/\Phi$
:::

::: quiz Check yourself
? $N$ molecules have the staircase distribution of this lesson: $Nf(v)$ is $a/3$, $2a/3$, $a$, $2a/3$, $a/3$ on the intervals $0\sim v_0$, …, $4v_0\sim5v_0$, and zero above $5v_0$. Then
- [ ] $a=N/(2v_0)$
- [x] $a=N/(3v_0)$
- [ ] $a=N/(4v_0)$
- [ ] $a=N/(5v_0)$
> The area under $Nf(v)$ is $N$: $(\frac13+\frac23+1+\frac23+\frac13)av_0=3av_0=N$, so $a=N/(3v_0)$ (B).

? For $f(v)=av/v_0$ ($0\le v\le v_0$), $f(v)=a$ ($v_0\le v\le2v_0$), $0$ beyond: what is $av_0$?
answer: 2/3
> Normalise: $\frac12av_0+av_0=\frac32av_0=1$, so $av_0=\frac23$, i.e. $a=\frac{2}{3v_0}$.

? For the same distribution, what fraction of the particles is faster than $v_0$?
answer: 2/3
> $\int_{v_0}^{2v_0}a\,\mathrm dv=av_0=\frac23$. The other third is slower.

? For the same distribution, the mean speed is $\bar v=c\,v_0$. What is $c$?
answer: 11/9
> $\bar v=\int_0^{v_0}\frac{av^2}{v_0}\mathrm dv+\int_{v_0}^{2v_0}av\,\mathrm dv=\frac{av_0^2}3+\frac{3av_0^2}2=\frac{11}{6}av_0^2=\frac{11}9v_0$.

? $N$ is the total number of molecules and $f(v)$ the speed distribution function. What does $Nf(v)\,\mathrm dv$ mean?
- [ ] The fraction of molecules with speeds between $v$ and $v+\mathrm dv$
- [x] The number of molecules with speeds between $v$ and $v+\mathrm dv$
- [ ] The number of molecules per unit volume with speeds between $v$ and $v+\mathrm dv$
- [ ] The mean speed of the molecules between $v$ and $v+\mathrm dv$
> $f(v)\,\mathrm dv=\mathrm dN/N$ is the fraction; multiplying by $N$ gives the number $\mathrm dN$. Per unit volume would be $nf(v)\,\mathrm dv$.

? What percentage of a gas's molecules have speeds between $0.99v_p$ and $1.01v_p$?
answer: 1.66%
tolerance: 2%
> $\frac{\Delta N}{N}=\frac{4}{\sqrt\pi}(0.99)^2e^{-0.99^2}\cdot\frac{1}{50}=0.0166=1.66\%$, for any gas at any temperature.

? What is the most probable speed of air molecules ($M=29$ g/mol) at 300 K?
answer: 415 m/s
tolerance: 1%
> $v_p=\sqrt{2RT/M}=\sqrt{2\times8.31\times300/0.029}=415$ m/s.

? For air at 300 K, what fraction of the molecules have speeds in the 1 m/s interval at $v_p$? (Give a percentage.)
answer: 0.2%
tolerance: 2%
> $w=\frac{4}{\sqrt\pi}\frac{1}{v_p}e^{-1}\mathrm dv=\frac{4}{\sqrt\pi}\times\frac1{415}\times0.368\times1=2.0\times10^{-3}=0.2\%$.

? What is the mean speed of oxygen molecules ($M=32$ g/mol) at 300 K?
answer: 445 m/s
tolerance: 1%
> $\bar v=\sqrt{8RT/\pi M}=\sqrt{8\times8.31\times300/(\pi\times0.032)}=445$ m/s.

? Hydrogen ($M=2$ g/mol) and oxygen ($M=32$ g/mol) are at the same temperature. What is $v_{p,\text{H}_2}/v_{p,\text{O}_2}$?
answer: 4
> $v_p\propto1/\sqrt M$: $\sqrt{32/2}=\sqrt{16}=4$.

? A gas is heated from 300 K to 1200 K. By what factor does its mean speed grow?
answer: 2
> All three speeds go as $\sqrt T$: $\sqrt{1200/300}=2$.

? Two Maxwell curves for the same gas are drawn on one graph. Curve 2 has its peak further right and lower than curve 1. Which is true?
- [x] Curve 2 is at the higher temperature, and the areas under the two curves are equal.
- [ ] Curve 2 is at the higher temperature, and it has fewer molecules.
- [ ] Curve 2 is at the lower temperature.
- [ ] The two curves cannot be for the same gas.
> $v_p\propto\sqrt T$, so the peak further right is the hotter gas; normalisation keeps both areas equal to 1, so the hotter curve is lower and wider.

? A velocity selector with $l=0.204$ m and $\Phi=0.0838$ rad turns at 100 rad/s. Which speed passes?
answer: 243 m/s
tolerance: 1%
> $v=\omega l/\Phi=100\times0.204/0.0838=243$ m/s.
:::

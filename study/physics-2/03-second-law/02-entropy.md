---
title: Entropy and the principle of entropy increase
zh: 克劳修斯熵公式 熵增加原理
summary: The Clausius equality and inequality, entropy as a state function with dS = dQ/T along a reversible path, the principle of entropy increase, and how to compute entropy changes for gases, mixing and heating.
source: 第15章 热力学第二定律 §15.2, 2026-09-30
---

Lesson 3.1 stated the second law in words: heat does not flow from cold to hot by
itself, and an engine can't turn all of its heat into work. Words are hard to
calculate with. This lesson turns the second law into a **number**, the entropy $S$,
that every equilibrium state has, just as it has a temperature or an internal energy.
Then the direction of a process becomes a simple test: in an isolated system, entropy
never decreases. The route goes from Carnot's engine to the Clausius equality, from
there to entropy, and then to the principle of entropy increase; the second half of
the lesson is about computing entropy changes, which is what exams ask most.

## The Clausius equality

### Start from a Carnot cycle

Take a reversible Carnot engine between $T_1$ and $T_2$ (Lesson 2.5). It absorbs heat
$Q_1$ at $T_1$ and releases $|Q_2|$ at $T_2$, and its efficiency can be written two
ways:

$$\eta=1-\frac{|Q_2|}{Q_1}=1-\frac{T_2}{T_1}\quad\Longrightarrow\quad\frac{|Q_2|}{Q_1}=\frac{T_2}{T_1}\quad\Longrightarrow\quad\frac{Q_1}{T_1}=\frac{|Q_2|}{T_2}.$$

Now switch to the course's sign rule for heat: $Q$ is heat **absorbed** by the system,
so heat released counts as negative. On the cold isotherm the gas absorbs
$Q_2=-|Q_2|$, and the last equation becomes

$$\frac{Q_1}{T_1}+\frac{Q_2}{T_2}=0.$$

The quantity $Q/T$, heat absorbed divided by the temperature at which it is absorbed,
is called the {{term heat-to-temperature ratio | 热温比}} (also "reduced heat"). For a
reversible Carnot cycle the ratios add up to zero.

::: callout pitfall Signs of Q₂
In Lesson 2.4, $Q_2$ in $\eta=1-Q_2/Q_1$ is the **amount** of heat released, a positive
number. In the Clausius equality every $Q$ is heat **absorbed**, with its sign, so the
released heat enters as a negative number. Mixing the two conventions gives
$Q_1/T_1+Q_2/T_2=2Q_1/T_1$ instead of zero.
:::

### Any reversible cycle

An arbitrary reversible cycle on a p–V diagram can be covered by a mesh of thin
isotherms and adiabats, cutting it into many narrow Carnot cycles. Neighbouring small
cycles run along their shared adiabat in opposite directions, so those inner pieces
cancel, and the zig-zag outer edge of the mesh follows the real cycle more and more
closely as the mesh gets finer. Each small Carnot cycle has $\sum Q_i/T_i=0$, so the
whole set does too:

$$\sum_{i=1}^{n}\frac{Q_i}{T_i}=0\quad\xrightarrow{\;n\to\infty\;}\quad\oint\frac{\mathrm{d}Q}{T}=0.$$

::: law Clausius equality | 克劳修斯等式
For any **reversible** cycle, the heat-to-temperature ratio summed round the cycle is
zero:
$$\oint\frac{\mathrm{d}Q}{T}=0.$$
Here $\mathrm{d}Q$ is the small heat absorbed by the system (the slides write it with a
bar, đQ, since it is not the change of anything) and $T$ the temperature at which it is
absorbed.
:::

### Irreversible cycles: the Clausius inequality

By Carnot's theorem (Lesson 3.1) an irreversible engine between the same reservoirs
does worse: $\eta=1-|Q_2|/Q_1<1-T_2/T_1$, so $|Q_2|/Q_1>T_2/T_1$, and the same steps
give $Q_1/T_1+Q_2/T_2<0$. In general:

::: law Clausius inequality | 克劳修斯不等式
For an **irreversible** cycle,
$$\oint\frac{\mathrm{d}Q}{T}<0,$$
where $T$ is the temperature of the reservoir that supplies $\mathrm{d}Q$. Together
with the equality: $\oint\mathrm{d}Q/T\le0$, "=" only for reversible cycles.
:::

::: example Checking the equality and the inequality
(a) One mole of ideal gas runs a Carnot cycle between $T_1=400$ K and $T_2=300$ K; on
the hot isotherm its volume doubles. (b) An irreversible engine between the same
reservoirs absorbs $Q_1=1000$ J and has $\eta=20\%$. Find $\sum Q/T$ for each.
== (a) Heats of the Carnot cycle ==
The adiabats exchange no heat. On the isotherms (Lesson 2.2)
$Q_1=\nu RT_1\ln2=8.31\times400\times0.693=2304$ J. For a Carnot cycle the cold
isotherm has the same volume ratio, so $Q_2=-\nu RT_2\ln2=-1728$ J.
== (a) Sum ==
$$\frac{Q_1}{T_1}+\frac{Q_2}{T_2}=\frac{2304}{400}-\frac{1728}{300}=5.76-5.76=0.$$
== (b) The irreversible engine ==
$A=\eta Q_1=200$ J, so it releases $800$ J: $Q_2=-800$ J.
$$\frac{Q_1}{T_1}+\frac{Q_2}{T_2}=\frac{1000}{400}-\frac{800}{300}=2.50-2.67=-0.17\ \text{J/K}<0.$$
A reversible engine would have released only $1000\times300/400=750$ J.
:::

## Entropy

### Path independence

Take two equilibrium states $a$ and $b$ and two reversible paths between them, path 1
and path 2. Going $a\to b$ along 1 and back $b\to a$ along 2 is a reversible cycle, so
by the Clausius equality

$$0=\oint\frac{\mathrm{d}Q}{T}=\int_{a\,(1)}^{b}\frac{\mathrm{d}Q}{T}+\int_{b\,(2)}^{a}\frac{\mathrm{d}Q}{T}=\int_{a\,(1)}^{b}\frac{\mathrm{d}Q}{T}-\int_{a\,(2)}^{b}\frac{\mathrm{d}Q}{T}.$$

(Reversing a reversible path flips the sign of every $\mathrm{d}Q$.) So the integral
of $\mathrm{d}Q/T$ is **the same along every reversible path** from $a$ to $b$: it
depends only on the end states. Heat itself depends on the path (Lesson 2.1), but heat
divided by temperature, along reversible paths, does not. Anything whose change
depends only on the end states is a function of state, so this defines a new one.

::: define Entropy | 熵
**Entropy** $S$ is the state function whose change between two equilibrium states is
the integral of $\mathrm{d}Q/T$ along **any reversible path** joining them:
$$S_b-S_a=\int_a^b\frac{\mathrm{d}Q}{T}\quad(\text{reversible}).$$
Its unit is J/K.
:::

::: formula Clausius entropy formula | 克劳修斯熵公式
$$S_b-S_a=\int_{a\,(R)}^{b}\frac{\mathrm{d}Q}{T},\qquad \mathrm{d}S=\frac{\mathrm{d}Q}{T}\ \ (\text{reversible}),\qquad \mathrm{d}S>\frac{\mathrm{d}Q}{T}\ \ (\text{irreversible})$$
--
S | entropy, a function of state | J/K
\mathrm{d}Q | small heat absorbed by the system | J
T | temperature at which the heat is absorbed (the reservoir's, for an irreversible step) | K
R | the integral is taken along a reversible path | —
:::

The integral form (积分式) gives finite changes; the differential form (微分式)
$\mathrm{d}S=\mathrm{d}Q/T$ holds for each small reversible step. For an irreversible
step the heat-to-temperature ratio falls short of the entropy change:
$\mathrm{d}Q/T<\mathrm{d}S$. (Run an irreversible path $a\to b$ and a reversible one
back: the cycle is irreversible, so the Clausius inequality makes
$\int_\text{irr}\mathrm{d}Q/T<S_b-S_a$.)

What the Clausius entropy means:

1. **$S$ is a state function.** $\Delta S$ depends only on the initial and final
   equilibrium states, never on how the system got there — even if the real process
   was irreversible.
2. **$S$ is additive.** The entropy of a system is the sum of its parts' entropies:
   $\Delta S=\Delta S_1+\Delta S_2+\cdots$.
3. **Only differences are defined.** The formula gives $S_b-S_a$; to give $S$ itself a
   value you pick a standard reference state and set its entropy (like choosing the
   zero of potential energy).

::: callout key How to compute any entropy change
Because $S$ is a state function: when the real process is irreversible, **invent a
reversible path** between the same initial and final equilibrium states and integrate
$\mathrm{d}Q/T$ along it. The result is the real process's $\Delta S$.
:::

### The Carnot cycle on a T–S diagram

Since $\mathrm{d}Q=T\,\mathrm{d}S$ on a reversible path, the heat absorbed is the area
under the path on a T–S diagram, just as work is the area under a path on a p–V
diagram. A reversible adiabat has $\mathrm{d}Q=0$, so $\mathrm{d}S=0$: it is a vertical
line (an **isentropic** process). An isotherm is a horizontal line. The Carnot cycle of
the example above becomes a rectangle; its area,
$(T_1-T_2)\Delta S=100\times5.76=576$ J, is the net heat absorbed, which equals the net
work $A=2304-1728=576$ J.

::: pv The Carnot cycle of 1 mol between 400 K and 300 K on a T–S diagram: the shaded area is the net work
axes: S (J/K), T (K)
1: S 0, T 400
2: S 5.76, T 400
3: S 5.76, T 300
4: S 0, T 300
1 -> 2: line
2 -> 3: line
3 -> 4: line
4 -> 1: line
shade: cycle
:::

(Here the entropy at state 1 is taken as the reference zero.)

## The principle of entropy increase

Now apply $\mathrm{d}S\ge\mathrm{d}Q/T$ to an **isolated system** (孤立系统), one that
exchanges neither heat nor work with anything. Then $\mathrm{d}Q=0$ for every step, so
$\mathrm{d}S\ge0$.

::: law Principle of entropy increase | 熵增加原理
The entropy of an isolated system never decreases:
$$\Delta S\ge0.$$
"=" holds for reversible processes (the entropy change equals the integral of
$\mathrm{d}Q/T$, here zero); ">" for irreversible ones. Since every natural process is
irreversible, a natural process in an isolated system always goes in the direction of
increasing entropy — increasing disorder: $\Delta S>0$.
:::

This is the second law as a single inequality. Heat flowing from hot to cold raises
the total entropy; the reverse would lower it, which is why it doesn't happen by
itself. Lesson 3.3 explains *why* entropy measures disorder, by counting the
microscopic arrangements of molecules.

::: example Heat flowing from hot to cold
$1000$ J of heat leaks from a large body at $400$ K to a large body at $300$ K (both so
big that their temperatures don't change). Find the total entropy change.
== Each body ==
Each body stays at one temperature, so it gains or loses heat as a reservoir does:
$\Delta S_\text{hot}=-1000/400=-2.50$ J/K and $\Delta S_\text{cold}=+1000/300=+3.33$ J/K.
== Total ==
$\Delta S=-2.50+3.33=+0.83$ J/K $>0$. The flow from cold to hot would give
$-0.83$ J/K: forbidden in an isolated system, which is the Clausius statement again.
:::

::: callout pitfall Entropy of the system vs entropy of the universe
"Entropy never decreases" is about an **isolated** system. The entropy of a single
body can fall: water cooling in a fridge, the gas in an isothermal compression. What
can't fall is the total for the body **plus** everything it exchanges heat with. Always
ask: is this system isolated? If not, add the surroundings (the reservoirs).
:::

## Computing entropy changes

### Example 1: the adiabatic free expansion

::: example Free expansion is irreversible (例1)
Use the Clausius entropy formula to show that the adiabatic free expansion of an ideal
gas into a vacuum, doubling its volume, is irreversible.
== Why we can't integrate directly ==
The expansion is not quasi-static: in between, the gas is not in equilibrium and has no
single $T$. Its heat is $Q=0$, but that does **not** make $\Delta S=0$, because the
process is irreversible ($\mathrm{d}S>\mathrm{d}Q/T$).
== What we know ==
The initial and final states are equilibrium states. For an ideal gas $Q=0$ and $A=0$
give $\Delta E=0$, so $T_\text{final}=T_\text{initial}$; and $V_\text{final}=2V_1$.
== The plan ==
Choose any reversible path from $(V_1,T_1)$ to $(2V_1,T_1)$ and compute
$\int\mathrm{d}Q/T$ along it. If the result is positive, the gas (an isolated system)
gained entropy, so the free expansion is irreversible. The next example does it three
ways.
:::

### Extension: one change, three reversible paths

$\nu$ moles of ideal gas go from state 1 $(p_1,V_1,T_1)$ to state 3 $(p_1/2,\,2V_1,\,T_1)$
— exactly the end states of the free expansion. Three reversible routes are drawn:
the isotherm $1\to3$; an isobaric expansion $1\to2$ then an isochoric cooling $2\to3$;
an adiabat $1\to4$ down to pressure $p_3$, then an isobaric expansion $4\to3$.

::: pv Three reversible paths from 1 to 3 (V doubles, T unchanged; γ = 1.4): isotherm, isobar + isochore, adiabat + isobar
axes: V, p
ticks: none
gamma: 1.4
1: V 10, p 200
2: V 20, p 200
3: V 20, p 100
4: V 16.41, p 100
1 -> 3: isothermal
1 -> 2: isobaric
2 -> 3: isochoric
1 -> 4: adiabatic
4 -> 3: isobaric
:::

::: example ΔS along three paths (延伸)
Compute $\Delta S=S_3-S_1$ for $\nu$ moles of ideal gas with $T_3=T_1$, $V_3=V_2=2V_1$,
along $1\to3$, $1\to2\to3$ and $1\to4\to3$.
== Path 1 → 3 (isothermal) ==
$\Delta E=0$, so $\mathrm{d}Q=p\,\mathrm{d}V=\dfrac{\nu RT}{V}\mathrm{d}V$:
$$\Delta S=\int_1^3\frac{p\,\mathrm{d}V}{T}=\int_{V_1}^{V_2}\frac{\nu R}{V}\,\mathrm{d}V=\nu R\ln\frac{V_2}{V_1}=\nu R\ln2.$$
== Path 1 → 2 → 3 (isobaric, then isochoric) ==
At constant pressure $\mathrm{d}Q=\nu C_{p,m}\mathrm{d}T$; at constant volume
$\mathrm{d}Q=\nu C_{V,m}\mathrm{d}T$:
$$\Delta S=\nu C_{p,m}\ln\frac{T_2}{T_1}+\nu C_{V,m}\ln\frac{T_3}{T_2}.$$
On the isobar $T_2/T_1=V_2/V_1=2$; on the isochore $T_3/T_2=p_3/p_2=1/2$ (since
$T_3=T_1$). So $\Delta S=\nu(C_{p,m}-C_{V,m})\ln2=\nu R\ln2$ by Mayer's formula
(Lesson 2.1).
== Path 1 → 4 → 3 (adiabatic, then isobaric) ==
The reversible adiabat has $\mathrm{d}Q=0$, so $S_4=S_1$. Then
$\Delta S=\nu C_{p,m}\ln(T_3/T_4)=\nu C_{p,m}\ln(T_1/T_4)$. From the adiabat
$p^{\gamma-1}T^{-\gamma}=$ const (Lesson 2.3),
$(T_1/T_4)^\gamma=(p_1/p_4)^{\gamma-1}$, so
$$\Delta S=\nu C_{p,m}\frac{\gamma-1}{\gamma}\ln\frac{p_1}{p_3}=\nu R\ln\frac{V_3}{V_1}=\nu R\ln2,$$
using $C_{p,m}(\gamma-1)/\gamma=R$, $p_4=p_3$, and $p_1/p_3=V_3/V_1$ on the isotherm.
== Conclusion ==
All three give $\Delta S=\nu R\ln2>0$ (for 1 mol, $8.31\times0.693=5.76$ J/K). The
free expansion has the same end states, so it too has $\Delta S=\nu R\ln2>0$; the gas is
isolated, so by the principle of entropy increase the free expansion is
irreversible.
:::

::: callout pitfall Q = 0 does not mean ΔS = 0
Only a **reversible** adiabatic process is isentropic. The free expansion is adiabatic
($Q=0$) but irreversible, and its entropy rises by $\nu R\ln2$. Never compute $\Delta S$
as $\int\mathrm{d}Q/T$ along the real path when that path is irreversible.
:::

The middle path, done for arbitrary end states, gives a formula worth keeping (heat at
constant volume to $T_2$, then isothermally to $V_2$):

::: formula Entropy change of an ideal gas | 理想气体的熵变
$$\Delta S=\nu C_{V,m}\ln\frac{T_2}{T_1}+\nu R\ln\frac{V_2}{V_1}$$
--
\nu | amount of gas | mol
C_{V,m} | molar heat capacity at constant volume, $\frac i2R$ | J/(mol·K)
T_1, T_2 | initial and final temperatures | K
V_1, V_2 | initial and final volumes | m³
:::

::: explore Entropy change of an ideal gas
slider nu: 0.1 .. 5 = 1 | mol
slider i: 3 .. 6 = 5 | | step 1 | degrees of freedom
slider T1: 100 .. 600 = 300 | K
slider T2: 100 .. 600 = 300 | K
slider r: 0.1 .. 10 = 2 | | volume ratio V2/V1
dS_T = nu (i / 2) 8.31 ln(T2 / T1) | J/K | Heating part νC_V,m ln(T2/T1)
dS_V = nu 8.31 ln(r) | J/K | Expansion part νR ln(V2/V1)
dS = dS_T + dS_V | J/K | Total ΔS
:::

::: example Heating and expanding a gas
Two moles of a diatomic ideal gas ($i=5$) go from $300$ K, $V_1$ to $400$ K, $2V_1$.
Find $\Delta S$.
== Use the formula ==
$C_{V,m}=\tfrac52R=20.8$ J/(mol·K).
$$\Delta S=2\times20.8\times\ln\frac{400}{300}+2\times8.31\times\ln2=11.96+11.52=23.5\ \text{J/K}.$$
The answer doesn't depend on whether the real process was reversible.
:::

### Example 2: mixing cold and hot water

::: example Mixing water (例2)
Cold water (mass $m_1$, temperature $T_1$) and hot water ($m_2$, $T_2$) are put
together in an insulated container. The specific heat of water is $c$. Find (1) the
final temperature, (2) the total entropy change.
== (1) Final temperature ==
The container is insulated, so the heat absorbed by the cold water equals the heat
given out by the hot water: $cm_1(T'-T_1)=cm_2(T_2-T')$, so
$$T'=\frac{m_1T_1+m_2T_2}{m_1+m_2}.$$
== (2) Design reversible paths ==
For a small change $\mathrm{d}Q=cm\,\mathrm{d}T$. Imagine heating the cold water
reversibly from $T_1$ to $T'$ and cooling the hot water reversibly from $T_2$ to $T'$
(with a row of reservoirs, Lesson 3.1):
$$\Delta S_1=\int_{T_1}^{T'}\frac{cm_1\,\mathrm{d}T}{T}=cm_1\ln\frac{T'}{T_1},\qquad \Delta S_2=cm_2\ln\frac{T'}{T_2}.$$
== Total ==
Entropy is additive:
$$\Delta S=c\Big(m_1\ln\frac{T'}{T_1}+m_2\ln\frac{T'}{T_2}\Big),$$
then substitute $T'$. $\Delta S_1>0$, $\Delta S_2<0$, and the sum is always positive
when $T_1\ne T_2$.
:::

::: example Mixing with numbers
$0.30$ kg of water at $20\ ^\circ$C is mixed with $0.20$ kg at $80\ ^\circ$C in an
insulated flask; $c=4.18\times10^3$ J/(kg·K).
== Final temperature ==
In kelvin, $T_1=293.15$ K, $T_2=353.15$ K:
$T'=\dfrac{0.30\times293.15+0.20\times353.15}{0.50}=317.15$ K $=44\ ^\circ$C.
== Entropy changes ==
$\Delta S_1=4180\times0.30\times\ln\dfrac{317.15}{293.15}=+98.7$ J/K,
$\Delta S_2=4180\times0.20\times\ln\dfrac{317.15}{353.15}=-89.9$ J/K.
== Total ==
$\Delta S=+8.8$ J/K $>0$: mixing is irreversible. (The final temperature may be worked
in °C, since it is a weighted average; the logarithms must use kelvin.)
:::

::: callout pitfall Kelvin in every logarithm
$\ln(44/20)$ is not $\ln(317.15/293.15)$. Temperature *differences* are the same in °C
and K; ratios are not.
:::

### Example 3: heating water with one reservoir or two

::: example Water and a reservoir (例3)
$1$ kg of water at $0\ ^\circ$C is put in contact with a reservoir at $100\ ^\circ$C
until it reaches equilibrium; $c=4.18\times10^3$ J/(kg·K). (1) Find the entropy change
of the system water + reservoir. Did it increase? (2) Instead, the water is first
brought to equilibrium with a $50\ ^\circ$C reservoir and then with the $100\ ^\circ$C
one. Find the entropy change and compare.
== (1) The water ==
Heating across a finite temperature difference is irreversible; design a reversible
heating from $T_1=273.15$ K to $T_2=373.15$ K:
$$\Delta S_\text{water}=\int_{T_1}^{T_2}\frac{cm\,\mathrm{d}T}{T}=cm\ln\frac{T_2}{T_1}=4.18\times10^3\times1\times\ln\frac{373.15}{273.15}=1.304\times10^3\ \text{J/K}.$$
== (1) The reservoir ==
It stays at $T_2$ and gives out $Q=cm(T_2-T_1)=4.18\times10^5$ J:
$$\Delta S_\text{res}=\frac{-cm(T_2-T_1)}{T_2}=\frac{-4.18\times10^5}{373.15}=-1.120\times10^3\ \text{J/K}.$$
== (1) Total ==
$\Delta S=1304-1120=184$ J/K $>0$: the entropy increased (the slide gives 180 J/K from
the rounded values $1.30\times10^3-1.12\times10^3$).
== (2) Two reservoirs ==
The water's entropy change is the same (same end states): $+1304$ J/K. Each reservoir
gives $cm\times50$ K $=2.09\times10^5$ J at its own temperature, $T'=323.15$ K and
$T_2=373.15$ K:
$$\Delta S=cm\ln\frac{T_2}{T_1}-\frac{cm(T'-T_1)}{T'}-\frac{cm(T_2-T')}{T_2}=1304.0-646.8-560.1=97\ \text{J/K}.$$
== Conclusion ==
The entropy still increases, but by less than with one reservoir. The more
intermediate reservoirs, the smaller the increase; with "infinitely many" the heating
becomes reversible and the total entropy change tends to zero.
:::

::: callout note A slip on the slide
The slide prints the result of part (2) as $97\times10^3$ J/K. The arithmetic gives
$97$ J/K, which is also what the conclusion needs (less than the 184 J/K of part 1).
:::

Carrying on with more reservoirs, each $100/N$ K warmer than the last, shows the
trend the slide describes (computed the same way):

| Reservoirs $N$ | Total $\Delta S$ (J/K) |
| -------------- | ---------------------- |
| 1              | 184                    |
| 2              | 97.1                   |
| 5              | 40.1                   |
| 10             | 20.3                   |
| 100            | 2.05                   |
| 1000           | 0.205                  |

$\Delta S$ falls roughly as $1/N$: with steps of $\mathrm{d}T$ the heating approaches
the reversible process of Lesson 3.1.

The plot shows part (1) for any reservoir temperature $T_\text{res}$ (water starting
at $T_0$, $cm=4.18$ kJ/K). The water's entropy change and the reservoir's always have
opposite signs, and their sum never dips below zero: it touches zero only when
$T_\text{res}=T_0$, when nothing happens. Cooling hot water in a cold reservoir raises
the total entropy just as heating does.

::: plot Total entropy change when water at T0 reaches a reservoir at temperature x
x: 150 .. 500
xlabel: T_res (K)
ylabel: ΔS (kJ/K)
water(x) = 4.18 ln(x / T0)
reservoir(x) = -4.18 (x - T0) / x
total(x) = 4.18 ln(x / T0) - 4.18 (x - T0) / x
slider T0: 200 .. 400 = 273.15 | K
:::

::: explore Heating water with one reservoir
slider m: 0.1 .. 5 = 1 | kg
slider t1: 0 .. 100 = 0 | °C | initial water temperature
slider t2: 0 .. 100 = 100 | °C | reservoir temperature
dS_w = 4180 m ln((t2 + 273.15) / (t1 + 273.15)) | J/K | Water cm ln(T2/T1)
dS_r = -4180 m (t2 - t1) / (t2 + 273.15) | J/K | Reservoir −Q/T2
dS = dS_w + dS_r | J/K | Total (never negative)
:::

::: callout exam What exams ask here
Typical questions: the entropy change of an ideal gas in an isothermal or free
expansion ($\nu R\ln(V_2/V_1)$); of a body heated at constant $c$ ($cm\ln(T_2/T_1)$); of
a reservoir ($Q/T$); and of a mixture (add the parts). Then "has the entropy of the
isolated system increased?" Always: design a reversible path, use kelvin, add up all
parts, and give the sign.
:::

::: cards Entropy
Heat-to-temperature ratio (热温比)? :: $Q/T$: heat absorbed divided by the temperature at which it is absorbed.
Clausius equality (克劳修斯等式)? :: $\oint\mathrm{d}Q/T=0$ for every reversible cycle.
Clausius inequality (克劳修斯不等式)? :: $\oint\mathrm{d}Q/T<0$ for an irreversible cycle.
Carnot cycle in heat-to-temperature ratios? :: $Q_1/T_1+Q_2/T_2=0$, with $Q_2<0$ the heat absorbed at $T_2$.
Clausius entropy formula (克劳修斯熵公式)? :: $S_b-S_a=\int_a^b\mathrm{d}Q/T$ along a reversible path; $\mathrm{d}S=\mathrm{d}Q/T$.
$\mathrm{d}S$ vs $\mathrm{d}Q/T$ for an irreversible step? :: $\mathrm{d}S>\mathrm{d}Q/T$.
Three properties of Clausius entropy? :: A state function; additive; only differences defined (choose a reference state).
Principle of entropy increase (熵增加原理)? :: The entropy of an isolated system never decreases: $\Delta S\ge0$, "=" reversible, ">" irreversible (all natural processes).
How to find $\Delta S$ for an irreversible process? :: Choose a reversible path between the same equilibrium end states and integrate $\mathrm{d}Q/T$ along it.
$\Delta S$ of an ideal gas in a free expansion $V_1\to V_2$? :: $\nu R\ln(V_2/V_1)$, the same as the isothermal expansion; $\nu R\ln2$ when the volume doubles.
$\Delta S$ of an ideal gas in general? :: $\nu C_{V,m}\ln(T_2/T_1)+\nu R\ln(V_2/V_1)$.
$\Delta S$ of a body heated from $T_1$ to $T_2$ at constant specific heat? :: $cm\ln(T_2/T_1)$.
$\Delta S$ of a reservoir at $T$ absorbing $Q$? :: $Q/T$ (negative if it gives heat out).
Final temperature when mixing water? :: $T'=(m_1T_1+m_2T_2)/(m_1+m_2)$.
:::

::: quiz Check yourself
? One mole of ideal gas expands freely into a vacuum, doubling its volume. What is its entropy change?
answer: R * ln(2) J/K
> Free expansion: $T$ doesn't change, so take the reversible isotherm between the same states: $\Delta S=\nu R\ln(V_2/V_1)=8.31\times\ln2=5.76$ J/K.

? A reservoir at $500$ K gives out $2000$ J of heat. What is its entropy change?
answer: -4 J/K
> A reservoir's temperature stays fixed, so $\Delta S=Q/T=-2000/500=-4$ J/K (negative: it lost heat).

? $2$ kg of water is heated from $20\ ^\circ$C to $80\ ^\circ$C ($c=4.18\times10^3$ J/(kg·K)). What is the water's entropy change?
answer: 1557 J/K
tolerance: 1%
> $\Delta S=cm\ln(T_2/T_1)=4180\times2\times\ln(353.15/293.15)=1.56\times10^3$ J/K. Using $\ln(80/20)$ (°C) would be wrong.

? 1 kg of water at $0\ ^\circ$C and 1 kg at $100\ ^\circ$C are mixed in an insulated container ($c=4.18\times10^3$ J/(kg·K)). What is the total entropy change?
answer: 101 J/K
tolerance: 2%
> $T'=323.15$ K. $\Delta S=4180\big(\ln\frac{323.15}{273.15}+\ln\frac{323.15}{373.15}\big)=4180\times(0.1681-0.1439)=101$ J/K $>0$.

? 1 kg of water at $100\ ^\circ$C is put into a reservoir at $0\ ^\circ$C until it cools to $0\ ^\circ$C ($c=4.18\times10^3$ J/(kg·K)). What is the total entropy change of water and reservoir?
answer: 226 J/K
tolerance: 2%
> Water: $cm\ln(273.15/373.15)=-1304$ J/K. Reservoir: absorbs $4.18\times10^5$ J at $273.15$ K, $+1530$ J/K. Total $+226$ J/K: the entropy of the isolated whole rises, though the water's own entropy fell.

? $\nu$ moles of an ideal gas with $C_{V,m}$ go from $(T_1,V_1)$ to $(T_2,V_2)$. Write $\Delta S$.
expression: nu Cv ln(T2/T1) + nu R ln(V2/V1)
variables: nu, Cv, R, T1, T2, V1, V2
> Heat at constant volume ($\int\nu C_{V,m}\mathrm{d}T/T$), then expand isothermally ($\nu R\ln(V_2/V_1)$); $S$ is a state function, so any reversible path gives the same.

? A Carnot engine absorbs $1200$ J at $600$ K and releases heat at $300$ K. Using the Clausius equality, how much heat does it release?
answer: 600 J
> $Q_1/T_1+Q_2/T_2=0$ gives $Q_2=-T_2Q_1/T_1=-600$ J: it releases 600 J.

? An engine between $500$ K and $300$ K absorbs $1000$ J and releases $700$ J per cycle. What is $\sum Q/T$ per cycle?
answer: -1/3 J/K
tolerance: 2%
> $1000/500-700/300=2.000-2.333=-0.333$ J/K. Negative: the cycle is irreversible (its efficiency 30% is below the Carnot 40%).

? Which statements are true?
- [x] In any isolated system, a natural process makes the entropy increase.
- [ ] The entropy of any system can never decrease.
- [ ] An adiabatic process always has $\Delta S=0$.
- [x] The entropy change between two equilibrium states doesn't depend on the path.
- [x] A reversible adiabatic process is isentropic.
> The principle of entropy increase is only for isolated systems: a gas compressed isothermally loses entropy (its reservoir gains more). An irreversible adiabatic process, such as free expansion, has $\Delta S>0$; only reversible adiabats have $\mathrm{d}S=\mathrm{d}Q/T=0$. $S$ is a state function.
:::

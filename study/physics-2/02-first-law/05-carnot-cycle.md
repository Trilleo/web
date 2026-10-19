---
title: The Carnot cycle
zh: 卡诺循环
summary: Carnot's ideal cycle of two isotherms and two adiabats, its efficiency η_c = 1 − T₂/T₁ and coefficient of performance ω_c = T₂/(T₁ − T₂), what they mean (absolute zero is out of reach, hotter sources make better engines), and how they are used for engines, air conditioners, heat pumps and refrigerators.
source: 第14章 热力学第一定律 §14.5.4 卡诺循环, 2026-09-23 and 2026-09-30
---

Lesson 2.4 rated engines by their efficiency $\eta=A/Q_1$, and the examples there
came out at 5%, 15%, 30%. Two questions follow naturally. **Is there an upper limit
on the efficiency of a heat engine?** And **how do we raise it?** A car engine's four
cylinders (intake, compression, power and exhaust strokes) and a power station's
turbines are both heat engines; air conditioners and fridges are refrigerators — and
China recommends setting air conditioners to no lower than 26 °C in summer. Why
that number helps is a question about the same physics. This lesson answers all of
these with one idealised cycle, Carnot's: its efficiency depends **only on the two
temperatures** it works between. The second law (Lesson 3.1) will then show that no
engine can beat it.

Notation as in Lesson 2.4: $T_1$ is the temperature of the hot reservoir, $T_2$ of
the cold one; $Q_1$ and $Q_2$ are the **sizes** of the heat taken in and given out
per cycle, $A$ the net work.

## Sadi Carnot and his ideal cycle

Sadi Carnot (1796–1832) was a young French engineer who saw that the steam engine
was "destined to bring a great revolution to the civilised world" but that nobody
understood how good it could be. In 1824 he published *Reflections on the Motive
Power of Fire*, describing an ideal cycle working between two heat sources — the
**Carnot cycle** — and the theorem that gives the theoretical limit of an engine's
efficiency (**Carnot's theorem**, Lesson 3.1).

His idea: heat that flows across a temperature difference without doing work is
wasted. So the ideal engine should take in heat only while the gas is at the hot
reservoir's temperature, give it out only while at the cold one's, and change
between the two temperatures **without** exchanging any heat, that is,
adiabatically.

::: define Carnot cycle | 卡诺循环
A quasi-static cycle that exchanges heat with **only two reservoirs, each at a
constant temperature**, and has no friction, heat leaks or gas leaks. For an ideal
gas it is made of two isotherms and two adiabats:
1. $1\to2$ isothermal expansion at $T_1$: the gas absorbs $Q_1$ from the hot reservoir;
2. $2\to3$ adiabatic expansion: cut off from the source, the gas keeps expanding and
   cools from $T_1$ to $T_2$;
3. $3\to4$ isothermal compression at $T_2$: the gas gives $Q_2$ to the cold reservoir;
4. $4\to1$ adiabatic compression: insulated, the gas is compressed back to the start,
   warming from $T_2$ to $T_1$.
:::

On the $p$–$V$ diagram the cycle is a curved quadrilateral: two isotherms on top and
bottom, joined by the two steeper adiabats (Lesson 2.3). Run clockwise it is an engine;
its energy-flow diagram is the one from Lesson 2.4 with $Q_1$ from $T_1$, $A$ out and
$Q_2$ down to $T_2$.

::: pv A Carnot cycle: 1 mol of a diatomic gas between 400 K and 300 K
axes: V (L), p (kPa)
gamma: 1.4
1: V 10, p 332.4
2: V 20, p 166.2
3: V 41.06, p 60.72
4: V 20.53, p 121.4
1 -> 2: isothermal
2 -> 3: adiabatic
3 -> 4: isothermal
4 -> 1: adiabatic
shade: cycle
:::

## The efficiency of a Carnot engine

Only the two isotherms exchange heat. On an isotherm $\Delta E=0$, so the heat equals
the work, $Q=A=\nu RT\ln(V_{\text{end}}/V_{\text{start}})$ (Lesson 2.2):

$$\begin{gathered}Q_1=\nu RT_1\ln\frac{V_2}{V_1}\quad(1\to2,\ \text{absorbed}),\\
Q_2=\nu RT_2\ln\frac{V_3}{V_4}\quad(3\to4,\ \text{size of the heat given off}).\end{gathered}$$

Now use the two adiabats, $TV^{\gamma-1}=$ const (Lesson 2.3):

$$2\to3:\ T_1V_2^{\gamma-1}=T_2V_3^{\gamma-1},\qquad 4\to1:\ T_1V_1^{\gamma-1}=T_2V_4^{\gamma-1}.$$

Divide one by the other: $(V_2/V_1)^{\gamma-1}=(V_3/V_4)^{\gamma-1}$, so

$$\frac{V_3}{V_4}=\frac{V_2}{V_1}.$$

The two logarithms are equal and cancel in the ratio: $Q_2/Q_1=T_2/T_1$. Putting this
into $\eta=1-Q_2/Q_1$:

::: formula Efficiency of a Carnot engine | 卡诺热机效率
$$\eta_c=1-\frac{Q_2}{Q_1}=1-\frac{T_2}{T_1}$$
--
\eta_c | efficiency of a Carnot engine | —
T_1 | temperature of the high-temperature reservoir (kelvin) | K
T_2 | temperature of the low-temperature reservoir (kelvin) | K
:::

The amount of gas, the volumes, even $\gamma$ have all dropped out: only the two
temperatures matter. (Lesson 3.1 shows this holds for any working substance.)

::: callout key Carnot in one line
For a Carnot cycle $\dfrac{Q_2}{Q_1}=\dfrac{T_2}{T_1}$, so $\eta_c=1-\dfrac{T_2}{T_1}$:
the hotter the source and the colder the sink, the better.
:::

::: callout note A sign on the slide
Beside the derivation the slide writes, for the isotherms, "$Q=-A=-\int p\,\mathrm dV$".
That is the other sign convention (work done **on** the gas). In this course $A$ is the
work done **by** the gas and an isothermal process has $Q=A=\int p\,\mathrm dV$. Also,
the slide's $Q_2=\nu RT_2\ln(V_3/V_4)$ is the **size** of the heat given off; the signed
heat on $3\to4$ is $\nu RT_2\ln(V_4/V_3)<0$.
:::

::: example A Carnot engine with numbers
One mole of a diatomic ideal gas runs the Carnot cycle in the figure, between
$T_1=400$ K and $T_2=300$ K, expanding isothermally from $V_1=10.0$ L to $V_2=20.0$ L.
Find $Q_1$, $Q_2$, the work per cycle and the efficiency. ($R=8.31\ \text{J/(mol·K)}$.)
== Heat absorbed at T₁ ==
$Q_1=\nu RT_1\ln\dfrac{V_2}{V_1}=1\times8.31\times400\times\ln2=2304$ J.
== Heat given off at T₂ ==
$V_3/V_4=V_2/V_1=2$, so $Q_2=\nu RT_2\ln2=8.31\times300\times0.693=1728$ J.
(The volumes themselves: $V_3=V_2(T_1/T_2)^{1/(\gamma-1)}=20.0\times(4/3)^{2.5}=41.1$ L,
$V_4=20.5$ L.)
== Work and efficiency ==
$A=Q_1-Q_2=576$ J, and
$$\eta=\frac{A}{Q_1}=\frac{576}{2304}=25\%=1-\frac{300}{400}.$$
The two routes agree, as they must.
:::

::: callout pitfall Kelvin, never Celsius
$\eta_c=1-T_2/T_1$ needs absolute temperatures. Between 580 °C and 30 °C, writing
$1-30/580=94.8\%$ is badly wrong; the right value is
$1-303.15/853.15=64.5\%$. Convert every temperature first: $T=t+273.15$.
:::

::: plot Carnot efficiency against the hot-reservoir temperature
x: 300 .. 2000
xlabel: T₁ (K)
ylabel: η_c
η(x) = 1 - T2 / x
slider T2: 200 .. 400 = 300 | K | cold reservoir
:::

The curve rises fast at first and then flattens: each extra 100 K at the hot side
buys less, and $\eta_c$ only approaches 1 as $T_1\to\infty$ or $T_2\to0$.

## The Carnot refrigerator

Run the same cycle counter-clockwise: $1\to4\to3\to2\to1$. Now the gas absorbs $Q_2$
from the cold reservoir while expanding isothermally at $T_2$ and gives $Q_1$ to the
hot one at $T_1$, and work $A=Q_1-Q_2$ is done on it. The heats are the same sizes as
before, so still $Q_2/Q_1=T_2/T_1$, and the coefficient of performance
$\omega=Q_2/(Q_1-Q_2)$ (Lesson 2.4) becomes:

::: formula Coefficient of performance of a Carnot refrigerator | 卡诺致冷机的致冷系数
$$\omega_c=\frac{Q_2}{A}=\frac{T_2}{T_1-T_2}$$
--
\omega_c | coefficient of performance of a Carnot refrigerator | —
T_1 | temperature of the hot reservoir (where heat is dumped, e.g. the room) | K
T_2 | temperature of the cold reservoir (where heat is taken from, e.g. the freezer) | K
:::

Unlike $\eta_c$, $\omega_c$ is large when the two temperatures are **close**: moving
heat up a small temperature step is cheap; up a big one, expensive.

A refrigerator used to warm the hot side — a house in winter, with the outdoors as the
cold reservoir — is called a {{term heat pump | 热泵}}. What it delivers is $Q_1$, and
for a Carnot machine $Q_1/A=T_1/(T_1-T_2)=\omega_c+1$, always more than 1: a heat pump
gives more heat than the electricity it uses, because most of the heat is fetched
from outside.

::: plot COP of a Carnot refrigerator against the cold-side temperature
x: 150 .. 290
xlabel: T₂ (K)
ylabel: ω_c
ω(x) = x / (T1 - x)
slider T1: 295 .. 320 = 308 | K | hot side (room or outdoors)
:::

::: explore Carnot engine and refrigerator between two reservoirs
slider T1: 250 .. 1200 = 400 | K | hot reservoir
slider T2: 50 .. 400 = 300 | K | cold reservoir (keep it below T₁)
η_c = 1 - T2 / T1 | | Carnot efficiency
ω_c = T2 / (T1 - T2) | | Carnot COP
heat = T1 / (T1 - T2) | | heat-pump heat Q₁ per joule of work
:::

## What the Carnot formulas mean

### Absolute zero cannot be reached

Try to cool something towards $T_2\to0$ with the best possible refrigerator. Its
coefficient of performance $\omega_c=T_2/(T_1-T_2)$ goes to **zero**. To remove any
heat $Q_2\ne0$ at all you need work $A=Q_2/\omega_c\to\infty$. So the colder you get,
the more work every joule costs, without limit, and 0 K itself is out of reach.

::: law Third law of thermodynamics (unattainability of absolute zero) | 热力学第三定律
It is impossible to cool a system to absolute zero, $T=0$ K, by any finite number of
steps (any finite process).
:::

Experiments creep ever closer. The slides cite laser cooling by 朱棣文 (Steven Chu) and
colleagues, who shared the 1997 Nobel Prize for it, with a laboratory record of
$2.4\times10^{-11}$ K, and a 2021 experiment in which a magnetised gas cloud dropped
from a 120 m tower reached about 38 trillionths of a kelvin above absolute zero,
$1/(38\times10^{12})\approx2.6\times10^{-14}$ K. Close, but never zero.

### How to make better engines

$\eta_c=1-T_2/T_1$ says efficiency comes from a **large temperature difference**:
raise $T_1$ or lower $T_2$. In practice $T_2$ is the environment (river, air), so
engineers raise $T_1$: higher steam temperatures, better materials. Real engines also
lose to friction, heat leaks and fast (not quasi-static) processes, so they stay well
below $\eta_c$.

::: example A modern thermal power plant
A steam turbine runs with steam at $t_1=580\ ^\circ$C and a condenser at
$t_2=30\ ^\circ$C. What is the Carnot limit? Real plants of this kind reach about 26%.
== Kelvin first ==
$T_1=580+273.15=853.15$ K, $T_2=30+273.15=303.15$ K.
== Carnot limit ==
$$\eta_c=1-\frac{303.15}{853.15}=64.5\%.$$
== Compare ==
The real plant converts only about 26% of the fuel's heat into work; the rest warms
the river and the air. Low efficiency and pollution are why the slides point to wind,
water, solar, nuclear and hydrogen energy as the sustainable path.
:::

## Using the Carnot formulas

### Two Carnot cycles with the same area

::: pv Two Carnot cycles with equal areas, sharing the cold isotherm T₂: abcd (shaded) between T₁ and T₂, a′b′c′d′ (dashed) between a hotter T₁′ and T₂
axes: V, p
ticks: none
gamma: 1.4
a: V 1, p 400
b: V 8, p 50
c: V 16.42, p 18.27
d: V 2.053, p 146.1
a2: V 3, p 200
b2: V 6, p 100
c2: V 33.94, p 8.839
d2: V 16.97, p 17.68
a -> b: isothermal
b -> c: adiabatic
c -> d: isothermal
d -> a: adiabatic
a2 -> b2: isothermal dashed
b2 -> c2: adiabatic dashed
c2 -> d2: isothermal dashed
d2 -> a2: adiabatic dashed
shade: cycle
:::

(In the figure the primed states are labelled a2, b2, c2, d2. With $\nu R=1$, the
first cycle runs between 400 and 300 and expands 8-fold at $T_1$; the second between
600 and 300 and expands 2-fold; both enclose $100\ln8=300\ln2=208$ units of work.)

::: example Equal areas: what follows? (slides 学以致用)
Two Carnot cycles of an ideal gas work between $T_1$ and $T_2$ and between $T_1'$ and
$T_2$, and enclose equal areas $S=S'$ on the $p$–$V$ diagram. (1) Which must be true:
(A) the efficiencies are equal; (B) the heats taken from the cold reservoir are equal;
(C) the heats given to the cold reservoir are equal; (D) the differences between heat
absorbed and heat given off are equal? (2) If $T_1<T_1'$, how do the heats absorbed per
cycle, $Q_1$ and $Q_1'$, compare?
== (1) ==
The enclosed area is the net work, and over a cycle $\Delta E=0$, so
$A=Q_1-Q_2$. Equal areas mean equal $Q_1-Q_2$: **(D)**. The efficiencies differ when
$T_1\ne T_1'$, and the area alone fixes neither $Q_1$ nor $Q_2$.
== (2) ==
Same $A$; $\eta_c=1-T_2/T_1$ is smaller for the cycle with the lower $T_1$. Since
$Q_1=A/\eta_c$, the less efficient engine must absorb more: $Q_1>Q_1'$ **(A)**.
:::

### Air conditioners: 26 °C in summer, 20 °C in winter

The national advice is to set air conditioners **no lower than 26 °C in summer** and
heating **no higher than 20 °C in winter**. The Carnot formulas show why this matters
twice over: heat leaks through the walls in proportion to the temperature difference,
and the work needed per joule moved is $1/\omega_c=(T_1-T_2)/T_2$, which also grows
with the difference.

::: example Setting the air conditioner to 26 °C instead of 22 °C
It is 35 °C outside. The walls let in heat at a rate proportional to the inside–outside
difference. Treating the air conditioner as a Carnot refrigerator, compare the power it
needs at 26 °C and at 22 °C.
== Coefficients of performance ==
At 26 °C: $\omega_c=\dfrac{299.15}{35-26}=33.2$. At 22 °C: $\omega_c=\dfrac{295.15}{13}=22.7$.
== Power needed ==
Leak $=k\times\Delta t$, power $=$ leak$/\omega_c$:
26 °C: $9k/33.2=0.271k$; 22 °C: $13k/22.7=0.573k$.
== Conclusion ==
Four degrees warmer roughly **halves** the ideal power (0.271/0.573 = 0.47): less heat
leaks in, and each joule is cheaper to pump out. That is the "sustainable development"
point of the slide.
:::

### A house on the Moon

::: example Living on the Moon (slide 课后练习)
On the Moon the daytime maximum is $T_1=116\ ^\circ$C and the night minimum
$T_3=-151\ ^\circ$C. A living room is kept at $T_2=20\ ^\circ$C; its walls pass
0.2 kW of heat per kelvin of temperature difference. What power must an ideal (Carnot)
machine have at the hottest time of day and the coldest of night?
== Kelvin ==
$T_1=389.15$ K, $T_2=293.15$ K, $T_3=122.15$ K.
== Day: a refrigerator ==
Heat leaks **in** at $P_2=0.2\times(389.15-293.15)=19.2$ kW and must be pumped out to the
hot surface. $\omega_c=\dfrac{T_2}{T_1-T_2}=\dfrac{Q_2/t}{A/t}=\dfrac{P_2}{P}$, so
$$P=\frac{(T_1-T_2)P_2}{T_2}=\frac{96\times19.2}{293.15}=6.29\ \text{kW}.$$
== Night: a heat pump ==
Heat leaks **out** at $P_3=0.2\times(293.15-122.15)=34.2$ kW. The machine must deliver
34.2 kW **into the room** (its hot side), taking heat from the cold surface. For a Carnot
heat pump the heat delivered per unit work is $T_2/(T_2-T_3)$, so
$$P'=\frac{(T_2-T_3)P_3}{T_2}=\frac{171\times34.2}{293.15}=19.9\ \text{kW}.$$
:::

::: callout note The slide's night value
The slide (option B: 6.29 kW; 47.88 kW) uses $\omega_c'=T_3/(T_2-T_3)=P_3/P'$ at night,
i.e. it sets the heat **taken from the cold lunar surface** equal to the wall's leak:
$P'=171\times34.2/122.15=47.88$ kW. But then the room would receive
$34.2+47.88=82$ kW while losing only 34.2 kW. What must equal the leak is the heat
**delivered to the room**, which gives 19.9 kW. The daytime value, 6.29 kW, is right
either way. If the multiple-choice question comes up, B is the option the slide marks,
being the only one with 6.29 kW by day.
:::

### Raising a Carnot engine's efficiency

::: example From 40% to 50% (slide 课堂练习)
A Carnot engine's cold reservoir is at 7.0 °C and its efficiency is 40%. By how many
degrees must the hot reservoir be raised to make the efficiency 50%?
== Hot temperature from the efficiency ==
$\eta=1-T_2/T_1$ gives $T_1=\dfrac{T_2}{1-\eta}$, with $T_2=280.15$ K.
== Before and after ==
$T_1=\dfrac{280.15}{0.6}=466.9$ K, $T_1'=\dfrac{280.15}{0.5}=560.3$ K.
== Difference ==
$\Delta T_1=560.3-466.9=93.4$ K (a rise of 93.4 °C too: a difference is the same in both
scales).
:::

::: callout note Rounding on the slide
The slide gives 93.3 K. With 273.15 the result is $560.30-466.92=93.38\approx93.4$ K;
93.3 K comes from using 273 instead of 273.15.
:::

### A heating system: engine plus heat pump

::: example A heat engine driving a heat pump (textbook 14.20)
A heating system burns coal to run a Carnot heat engine between $t_1=210\ ^\circ$C and
the radiator water at $t_2=60\ ^\circ$C (the water is the engine's cold reservoir). The
engine's work drives a Carnot refrigerator that takes heat from a river at
$t_3=15\ ^\circ$C and gives it to the same water. For 1 kg of coal (heat of combustion
$3.34\times10^7$ J/kg), how much heat does the water get, and how many times the coal's
heat is that?
== Kelvin ==
$T_1=483.15$ K, $T_2=333.15$ K, $T_3=288.15$ K.
== The engine ==
$Q_1=3.34\times10^7$ J. $A=Q_1\left(1-\dfrac{T_2}{T_1}\right)=3.34\times10^7\times\dfrac{150}{483.15}=1.04\times10^7$ J,
and it gives the water $Q_2=Q_1-A=2.30\times10^7$ J.
== The heat pump ==
Driven by $A$, it delivers to the water
$Q_2'=A\,\dfrac{T_2}{T_2-T_3}=1.04\times10^7\times\dfrac{333.15}{45}=7.68\times10^7$ J
(of which $A$ is the work and the rest comes from the river).
== Total ==
$Q_2+Q_2'=9.98\times10^7$ J, about **3.0 times** the heat of the coal. Burning the coal
straight in the radiator would give only $3.34\times10^7$ J.
:::

## How a refrigerator works

A household refrigerator runs a reverse cycle with a substance that turns liquid
easily. The slides take ammonia as the example (modern fridges use other
refrigerants, on the same principle):

| Part | What happens to the ammonia | Heat and work |
| --- | --- | --- |
| {{term compressor | 压缩机}} | the vapour is compressed quickly: pressure and temperature rise | work $A$ done on it |
| {{term condenser | 冷凝器}} (hot reservoir) | the hot vapour gives heat to the cooling water or the room air and condenses to liquid | gives off $Q_1$ |
| {{term throttle valve | 节流阀}} | the liquid is forced through a narrow opening; pressure and temperature drop (throttling, Lesson 2.3) | no heat exchanged |
| {{term evaporator | 蒸发器}} (cold reservoir) | the cold liquid absorbs heat from the food compartment and boils away completely | absorbs $Q_2$ |

The vapour then returns to the compressor and the cycle repeats. Energy balances as in
any refrigerator: $Q_1=Q_2+A$, which is why the coils at the back of a fridge are warm.

## Practice: a cycle that only looks like Carnot

::: example Two isobars and two adiabats (训练1)
A diatomic ideal gas runs the cycle $A\to B\to C\to D\to A$: $AB$ and $CD$ are isobaric
(at $p_2$ and $p_1$), $BC$ and $DA$ adiabatic. $T_C=300$ K and $T_B=400$ K. Find the
efficiency.
== Heats ==
Heat is absorbed on the isobaric expansion $AB$ and given off on the isobaric
compression $CD$; the adiabats exchange none:
$$\begin{aligned}\eta&=1-\frac{|Q_{CD}|}{Q_{AB}}=1-\frac{\nu C_{p,m}(T_C-T_D)}{\nu C_{p,m}(T_B-T_A)}\\&=1-\frac{T_C-T_D}{T_B-T_A}.\end{aligned}$$
== The adiabats link the temperatures ==
With $p^{\gamma-1}T^{-\gamma}=$ const (Lesson 2.3) between the same two pressures:
$p_1^{\gamma-1}T_D^{-\gamma}=p_2^{\gamma-1}T_A^{-\gamma}$ and
$p_1^{\gamma-1}T_C^{-\gamma}=p_2^{\gamma-1}T_B^{-\gamma}$. Dividing,
$\dfrac{T_A}{T_B}=\dfrac{T_D}{T_C}$, i.e. $T_D=\dfrac{T_C}{T_B}T_A$.
== Efficiency ==
$$\eta=1-\frac{\frac{T_C}{T_B}(T_B-T_A)}{T_B-T_A}=1-\frac{T_C}{T_B}=1-\frac{300}{400}=25\%.$$
:::

::: pv The isobar–adiabat cycle of 训练1 (γ = 1.4)
axes: V, p
ticks: none
gamma: 1.4
A: V 1, p 200
B: V 2, p 200
C: V 4.106, p 73.07
D: V 2.053, p 73.07
A -> B: isobaric
B -> C: adiabatic
C -> D: isobaric
D -> A: adiabatic
shade: cycle
:::

::: callout pitfall 1 − T_C/T_B is not a Carnot efficiency
The answer looks like Carnot's formula, but $T_B$ and $T_C$ are not the temperatures of
two reservoirs: the gas's temperature changes all along both isobars. The hottest point
is $B$ (400 K), and the coldest is $D$, below 300 K (in the figure 150 K). A Carnot
engine between the cycle's extreme temperatures would do much better
($1-150/400=62.5\%$ here). Use $\eta_c=1-T_2/T_1$ **only** for a Carnot cycle, with
reservoir temperatures.
:::

::: callout exam What exams ask about Carnot
- $\eta_c$ or $\omega_c$ from two temperatures, in kelvin; or a temperature back from an
  efficiency (the 40% → 50% question).
- Comparison questions on two Carnot cycles drawn on one diagram (equal areas, shared
  isotherms): use $A=Q_1-Q_2=$ area and $Q_1=A/\eta_c$.
- Combined machines: an engine driving a refrigerator or heat pump, a house kept at a
  set temperature (heat leak = heat pumped).
- Recognising a non-Carnot cycle, and the meaning of the third law.
:::

::: cards The Carnot cycle
Carnot cycle (卡诺循环) :: Two isotherms and two adiabats; heat exchanged only with two constant-temperature reservoirs; no friction, heat leaks or gas leaks
The four steps of a Carnot engine :: Isothermal expansion at $T_1$ (absorbs $Q_1$), adiabatic expansion, isothermal compression at $T_2$ (gives off $Q_2$), adiabatic compression
Carnot efficiency (卡诺热机效率) :: $\eta_c=1-\dfrac{T_2}{T_1}$, temperatures in kelvin
Carnot COP (卡诺致冷系数) :: $\omega_c=\dfrac{T_2}{T_1-T_2}$
Why $V_3/V_4=V_2/V_1$ :: Divide the adiabat relations $T_1V_2^{\gamma-1}=T_2V_3^{\gamma-1}$ and $T_1V_1^{\gamma-1}=T_2V_4^{\gamma-1}$
For a Carnot cycle, $Q_2/Q_1=$ :: $T_2/T_1$
How to raise $\eta_c$ :: Increase the temperature difference: raise $T_1$ (or lower $T_2$)
When is $\omega_c$ large? :: When $T_1$ and $T_2$ are close
Third law (热力学第三定律) :: Absolute zero cannot be reached in a finite number of steps; as $T_2\to0$, $\omega_c\to0$ and $A\to\infty$
Heat pump (热泵) :: A refrigerator used for heating; Carnot: $Q_1/A=T_1/(T_1-T_2)=\omega_c+1>1$
Sadi Carnot :: French engineer (1796–1832); in 1824 proposed the Carnot cycle and Carnot's theorem
Refrigerator's four parts :: Compressor (work in), condenser (gives $Q_1$), throttle valve (pressure drop), evaporator (absorbs $Q_2$)
Two Carnot cycles with equal areas :: Equal net work $Q_1-Q_2$; efficiencies may differ
:::

::: quiz Check yourself
? A Carnot engine works between 400 K and 300 K. What is its efficiency?
answer: 0.25
> $\eta_c=1-300/400=0.25=25\%$.

? A steam turbine has steam at 580 °C and a condenser at 30 °C. What is the Carnot efficiency?
answer: 1 - 303.15/853.15
> Convert first: $\eta_c=1-303.15/853.15=0.645=64.5\%$. Using Celsius ($1-30/580$) would give an impossible 94.8%.

? A Carnot refrigerator keeps a freezer at $-18\ ^\circ$C in a 27 °C kitchen. What is its coefficient of performance?
answer: 255.15/45
> $\omega_c=\dfrac{T_2}{T_1-T_2}=\dfrac{255.15}{300.15-255.15}=5.67$.

? (课堂练习) A Carnot engine's cold reservoir is at 7.0 °C and its efficiency is 40%. By how many kelvin must the hot reservoir be raised to reach 50%?
answer: 93.4 K
> $T_1=280.15/0.6=466.9$ K and $T_1'=280.15/0.5=560.3$ K, so $\Delta T=93.4$ K (the slide's 93.3 K uses 273).

? (学以致用) Two Carnot cycles of an ideal gas, between $T_1$ and $T_2$ and between $T_1'$ and $T_2$, enclose equal areas. Which must be true?
- [ ] The two efficiencies are equal
- [ ] They absorb equal heats from the cold reservoir
- [ ] They give equal heats to the cold reservoir
- [x] The difference between heat absorbed and heat given off is the same for both
> The area is the net work $A=Q_1-Q_2$ (since $\Delta E=0$). Equal areas fix only that difference; the efficiencies differ when $T_1\ne T_1'$.

? (举一反三) Same two cycles with equal areas, and $T_1<T_1'$. How do the heats absorbed from the hot reservoir per cycle compare?
- [x] $Q_1>Q_1'$
- [ ] $Q_1=Q_1'$
- [ ] $Q_1<Q_1'$
- [ ] It can't be decided
> Same $A$, and $\eta_c=1-T_2/T_1<\eta_c'$. Since $Q_1=A/\eta_c$, the lower efficiency needs the larger heat: $Q_1>Q_1'$.

? (Moon house) The room at 20 °C, the lunar day at 116 °C, walls passing 0.2 kW per kelvin. What power does a Carnot refrigerator need to hold the room temperature?
answer: 6.29 kW
> Leak $P_2=0.2\times96=19.2$ kW; $P=P_2(T_1-T_2)/T_2=19.2\times96/293.15=6.29$ kW.

? (Moon house) At night it is $-151\ ^\circ$C outside. What power does a Carnot heat pump need to keep the room at 20 °C?
answer: 19.9 kW
tolerance: 2%
> The leak is $P_3=0.2\times171=34.2$ kW, and that is what the pump must deliver to the room: $P'=P_3(T_2-T_3)/T_2=34.2\times171/293.15=19.9$ kW. (The slide's 47.88 kW wrongly sets the heat taken from the cold side equal to the leak.)

? (14.20) A Carnot engine between 210 °C and 60 °C drives a Carnot heat pump between a 15 °C river and the 60 °C radiator water; both machines' waste and output heat go into the water. How many times the coal's heat does the water receive?
answer: 2.99
tolerance: 2%
> Per joule of coal: work $1-333.15/483.15=0.310$, waste heat to the water 0.690; the heat pump delivers $0.310\times333.15/45=2.30$. Total $2.99\approx3$.

? (训练1) A diatomic gas runs a cycle of two isobars ($AB$, $CD$) and two adiabats ($BC$, $DA$), with $T_B=400$ K and $T_C=300$ K. What is its efficiency?
answer: 0.25
> The adiabats give $T_A/T_B=T_D/T_C$, so $\eta=1-\dfrac{T_C-T_D}{T_B-T_A}=1-\dfrac{T_C}{T_B}=25\%$. It is not a Carnot cycle: the coldest point $D$ is below 300 K.

? Why can't a refrigerator cool something to 0 K?
- [ ] Because its efficiency would exceed 1
- [x] Because $\omega_c=T_2/(T_1-T_2)\to0$ as $T_2\to0$, so removing any heat would need infinite work
- [ ] Because gases liquefy before 0 K
- [ ] Because the Carnot cycle needs $T_2>T_1$
> With $A=Q_2/\omega_c$ and $\omega_c\to0$, any $Q_2\ne0$ needs $A\to\infty$: absolute zero is unreachable in a finite process (the third law).
:::

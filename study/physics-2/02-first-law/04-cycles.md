---
title: Cycles, heat engines and refrigerators
zh: 循环过程、热机与致冷机
summary: What a cyclic process is, why its internal energy change is zero, how a heat engine turns heat into work (efficiency η) and a refrigerator uses work to move heat (coefficient of performance ω), with the lecture's worked cycles.
source: 第14章 热力学第一定律 §14.5.1–14.5.3 循环过程, 2026-09-18 and 2026-09-23
---

A single expansion can turn heat into work, but only once: the piston reaches the end
of the cylinder and stops. Every real engine — a steam engine, a car engine, a power
station — keeps going by bringing its gas (or steam) **back to where it started** and
doing the same thing again. Such a closed loop of processes is a **cycle**. This
lesson shows why a cycle is so easy to book-keep with the first law ($\Delta E=0$ for
the whole loop), defines the two numbers that rate machines built on cycles — the
**efficiency** $\eta$ of a heat engine and the **coefficient of performance** $\omega$
of a refrigerator — and works through the lecture's examples, which put all four
processes of Lessons 2.2 and 2.3 to use. Lesson 2.5 then asks how good a cycle can
possibly be.

Notation as before (Lesson 2.1): $Q$ is heat **absorbed** by the gas, $A$ is work
done **by** the gas, $E$ its internal energy, and the first law reads $Q=\Delta E+A$.

## What a cycle is

Picture a steam engine, the machine the slides start from. Water goes round a closed
loop of pipes:

1. In the **boiler** (B), over the fire (A, the hot source), water boils into
   high-pressure steam. The water **absorbs heat** $Q_1$ from the fire.
2. The steam enters the **cylinder** (D) and pushes the piston: it **does work**
   $A_1$ on the outside world.
3. The used steam goes to the **condenser** (E, a cooling coil in cold water, the cold
   source), turns back into water and **gives off heat** $Q_2$.
4. A **pump** (C) pushes the water back into the boiler. Pumping takes some work $A_2$
   **from** outside.

After step 4 the water is exactly as it was before step 1: same pressure, same
temperature, same everything. The loop can run again and again. The water is just
the carrier of energy; physicists call it the {{term working substance | 工质}}.

::: define Cyclic process | 循环过程
A process in which a system passes through a series of states and **returns to its
initial state**. Each pass round the loop is one *cycle*. On a $p$–$V$ diagram a
quasi-static cycle is a **closed curve**.
:::

Because internal energy is a state quantity (Lesson 2.1), and the end state is the
start state, the internal energy cannot have changed:

$$\Delta E_{\text{cycle}}=E_{\text{end}}-E_{\text{start}}=0 .$$

Put that into the first law for the whole loop: $Q_{\text{net}}=0+A_{\text{net}}$.
Whatever net heat goes in comes out as net work, and nothing else. In the steam engine,
the net heat is $Q_1-Q_2$ and the net work is $A_1-A_2$, so $A_1-A_2=Q_1-Q_2$.

Where is the work on the diagram? Work is the area under a path (Lesson 2.1): positive
going right (expansion), negative going left (compression). Round a loop, the gas
expands along one side and is compressed along the other. The two areas under them
partly cancel, and what's left is exactly the area **enclosed** by the loop.

::: formula First law over a cycle | 循环过程的特点
$$\Delta E=0,\qquad A_{\text{net}}=Q_{\text{net}}=Q_1-Q_2=\text{area enclosed by the cycle}$$
--
\Delta E | change in internal energy over a whole cycle | J
A_{\text{net}} | net work done by the working substance in one cycle | J
Q_1 | heat absorbed in one cycle (all the parts where heat goes in), a positive number | J
Q_2 | heat given off in one cycle, as a positive number | J
:::

::: callout key The one fact about a cycle
Over a whole cycle $\Delta E=0$. So the net heat in equals the net work out, and both
equal the area inside the loop on the $p$–$V$ diagram.
:::

## Clockwise and counter-clockwise

On a $p$–$V$ diagram it matters which way you go round. The loop below runs
$1\to2\to3\to4\to1$: expansion at high pressure along the top, compression at low
pressure along the bottom. The gas does more work expanding (big area under the top)
than is done on it while it is compressed (smaller area under the bottom): the net
work is **positive**. That is an engine.

::: pv A clockwise cycle: the net work done by the gas is the shaded area
axes: V (L), p (kPa)
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

Here $A_{\text{net}}=(300-100)\,\text{kPa}\times(6-2)\,\text{L}=800$ J (a kPa·L is a
joule). Run the same loop the other way, $1\to4\to3\to2\to1$, and the gas now expands
at **low** pressure and is compressed at **high** pressure. The net work done by the
gas is $-800$ J: the outside world must do 800 J of work on it each cycle. That is how
a refrigerator works.

::: pv The same loop run counter-clockwise: now work is done on the gas
axes: V (L), p (kPa)
1: V 2, p 300
4: V 2, p 100
3: V 6, p 100
2: V 6, p 300
1 -> 4: isochoric
4 -> 3: isobaric
3 -> 2: isochoric
2 -> 1: isobaric
shade: cycle
:::

::: define Forward cycle | 正循环
A cycle that runs **clockwise** on the $p$–$V$ diagram. The net work done by the
system is positive: it takes in heat and gives out work. Heat engines run forward
cycles.
:::

::: define Reverse cycle | 逆循环
A cycle that runs **counter-clockwise** on the $p$–$V$ diagram. The net work done by
the system is negative: work is done on it, and heat is moved from a cold body to a
hot one. Refrigerators run reverse cycles.
:::

## Heat engines and their efficiency

::: define Heat engine | 热机
A device whose working substance runs a forward cycle: each cycle it absorbs heat $Q_1$
from a {{term high-temperature reservoir | 高温热源}} at $T_1$, does net work $A$ on the
outside, and gives off heat $Q_2$ to a {{term low-temperature reservoir | 低温热源}} at
$T_2$.
:::

A **reservoir** (热源, also 热库) is a body so large that taking heat from it or giving
heat to it does not change its temperature: the furnace, the atmosphere, a river.

The slides draw an engine as an {{term energy-flow diagram | 能流图}}: the hot reservoir
on top, an arrow $Q_1$ down into a circle (the working substance), an arrow $A$ out to
the side, and an arrow $Q_2$ down to the cold reservoir. In words:

| Quantity | Heat engine (forward cycle) | Refrigerator (reverse cycle) |
| --- | --- | --- |
| Direction on $p$–$V$ | clockwise | counter-clockwise |
| From the hot reservoir $T_1$ | takes $Q_1$ | **receives** $Q_1$ |
| Work | gives out $A=Q_1-Q_2$ | takes in $A=Q_1-Q_2$ |
| To/from the cold reservoir $T_2$ | **receives** $Q_2$ | takes $Q_2$ |
| What we want | the work $A$ | the heat $Q_2$ removed from the cold side |
| What we pay for | the heat $Q_1$ (fuel) | the work $A$ (electricity) |

In both columns energy balances: $Q_1=A+Q_2$. The figure of merit is always **what we
want divided by what we pay for**. For an engine:

::: formula Efficiency of a heat engine | 热机效率
$$\eta=\frac{A}{Q_1}=\frac{Q_1-Q_2}{Q_1}=1-\frac{Q_2}{Q_1}$$
--
\eta | efficiency: the share of the absorbed heat turned into work | —
A | net work done by the engine in one cycle | J
Q_1 | total heat absorbed in one cycle (magnitude) | J
Q_2 | total heat given off in one cycle (magnitude) | J
:::

Since $Q_2$ is never zero in practice (every real engine dumps heat: a car's radiator
and exhaust, a power station's cooling towers), $\eta<1$. Lesson 2.5 shows there is a
hard upper limit, and Lesson 3.1 that $Q_2=0$ is forbidden outright.

::: callout pitfall Q₁ and Q₂ are sizes, not signed heats
In $\eta=1-Q_2/Q_1$ and $\omega=Q_2/(Q_1-Q_2)$ both $Q_1$ and $Q_2$ are **positive
numbers**: the amounts absorbed and given off (the slides write
"$Q_1$，$Q_2$ 代表吸放热的数值"). If you have a signed heat for a process where the gas
gives off heat, say $Q=-2.08RT_1$, use its magnitude $|Q|$. Writing $1-(-2.08)/3$ gives
an "efficiency" above 1, a sure sign of a sign slip.
:::

::: callout pitfall Q₁ is the heat absorbed, not the net heat
$Q_1$ adds up **only** the parts of the cycle where the gas takes heat in. The net
heat $Q_1-Q_2$ is the work, so $A/Q_{\text{net}}$ would always be 1. In every cycle
problem, first decide process by process whether heat goes in or out.
:::

::: example An engine's efficiency
In each cycle an engine absorbs $Q_1=2000$ J from its hot reservoir and gives
$Q_2=1500$ J to the cold one. Find the work per cycle and the efficiency. If it runs
10 cycles a second, what is its power?
== Work ==
$\Delta E=0$ over the cycle, so $A=Q_1-Q_2=2000-1500=500$ J.
== Efficiency ==
$$\eta=\frac{A}{Q_1}=\frac{500}{2000}=0.25=25\%,$$
or $1-Q_2/Q_1=1-1500/2000=25\%$, the same.
== Power ==
$P=10\times500\ \text{J}/1\ \text{s}=5000$ W $=5$ kW.
:::

::: callout note Other books
Many English textbooks write $W$ for work, $Q_H$ and $Q_C$ (or $|Q_H|$, $|Q_C|$) for
the heats at the hot and cold sides, and call $\omega$ the COP, $K$ or $\beta$. The
formulas are the same: $\eta=W/Q_H=1-|Q_C|/|Q_H|$. Some also write the first law as
$\Delta U=Q-W$ or, counting work done **on** the gas, $\Delta U=Q+W$; this course
always uses $Q=\Delta E+A$ with $A$ done by the gas.
:::

## Refrigerators and the coefficient of performance

A refrigerator does the opposite job. Heat flows by itself from hot to cold; to move it
the other way — out of the food compartment (cold) into the kitchen (warm) — you must
pay with work. Run the engine cycle backwards: the working substance takes heat $Q_2$
from the cold reservoir, work $A$ is done on it, and it hands $Q_1=Q_2+A$ to the hot
reservoir. (The kitchen behind a fridge feels warm for exactly this reason.)

::: define Refrigerator | 致冷机
A device whose working substance runs a reverse cycle: each cycle, work $A$ done on it
lets it absorb heat $Q_2$ from a low-temperature reservoir at $T_2$ and give heat
$Q_1=Q_2+A$ to a high-temperature reservoir at $T_1$.
:::

What we want is $Q_2$ (heat removed from the cold space); what we pay for is $A$:

::: formula Coefficient of performance of a refrigerator | 致冷系数
$$\omega=\frac{Q_2}{A}=\frac{Q_2}{Q_1-Q_2}$$
--
\omega | coefficient of performance: heat removed from the cold side per joule of work | —
Q_2 | heat absorbed from the low-temperature reservoir in one cycle (magnitude) | J
A | work done on the working substance in one cycle (magnitude) | J
Q_1 | heat given to the high-temperature reservoir in one cycle (magnitude) | J
:::

Unlike $\eta$, $\omega$ is usually **bigger than 1**: a household fridge moves two to
five joules of heat for every joule of electricity. Nothing is being created: the work
is only moving heat, not turning into it.

::: example A refrigerator
A refrigerator takes $Q_2=600$ J of heat out of its cold compartment for each $A=200$ J
of work done by the compressor. Find its coefficient of performance and the heat it
gives to the room.
== Coefficient of performance ==
$$\omega=\frac{Q_2}{A}=\frac{600}{200}=3.$$
== Heat to the room ==
$\Delta E=0$ for the working substance over a cycle, so everything that goes in comes
out: $Q_1=Q_2+A=600+200=800$ J. A fridge with its door open warms the kitchen.
:::

Play with the numbers below. Notice that the same $Q_1$ and $Q_2$ make a poor engine
(small $\eta$) but a good refrigerator (large $\omega$) when they are close together.

::: explore Efficiency and coefficient of performance
slider Q1: 1000 .. 5000 = 2000 | J | heat at the hot side
slider Q2: 100 .. 4900 = 1500 | J | heat at the cold side (keep it below Q₁)
A = Q1 - Q2 | J | Net work per cycle
η = 1 - Q2 / Q1 | | Efficiency as an engine
ω = Q2 / (Q1 - Q2) | | COP as a refrigerator
:::

## How to find a cycle's efficiency

The lecture's examples all follow one routine. It uses the process formulas of
Lessons 2.2 and 2.3 (isochoric: $A=0$; isobaric: $A=p\Delta V$; isothermal:
$\Delta E=0$, $Q=A=\nu RT\ln(V_2/V_1)$; adiabatic: $Q=0$) and, for any process of an
ideal gas, $\Delta E=\nu C_{V,m}\Delta T$.

::: callout key Recipe for a cycle
1. **Temperatures** at every corner, from $pV=\nu RT$ (often only ratios like
   $T_2=2T_1$ are needed).
2. **Each process**: $A$, $\Delta E$ and $Q=\Delta E+A$, with signs.
3. **Heat absorbed** $Q_1$: add up only the positive $Q$'s. The negative ones together
   give $Q_2$.
4. **Net work** $A$: add up all the $A$'s, or read off the enclosed area, or use
   $A=Q_1-Q_2$ (a good check).
5. $\eta=A/Q_1$.
:::

A quick way to see where heat goes in: moving **up or to the right** at once raises
$pV$, so $T$ and $E$ rise, and expansion means $A>0$; with both $\Delta E>0$ and $A>0$,
$Q>0$. Moving down and to the left, $Q<0$. Other directions need the numbers.

### Example 1: a triangular cycle

::: example A triangle of hydrogen (slide 例1)
One mole of hydrogen at room temperature (rigid diatomic, $i=5$) runs the cycle
$1\to2\to3\to1$: $1\to2$ a straight line whose extension passes through the origin,
$2\to3$ at constant volume $V_2$, $3\to1$ at constant pressure $p_1$. Given
$p_1,p_2,V_1,V_2$, find $\eta$. Then put in $p_1=100$ kPa, $V_1=10$ L, $p_2=200$ kPa,
$V_2=20$ L.
== Which parts absorb heat? ==
State 3 is $(V_2,p_1)$. Compare $pV$: $p_1V_1<p_1V_2<p_2V_2$, so $T_1<T_3<T_2$.
$1\to2$: temperature rises **and** the gas expands, so $Q>0$. $2\to3$: constant volume,
temperature falls, $Q=\Delta E<0$. $3\to1$: compression with falling temperature, $Q<0$.
Only $1\to2$ absorbs heat.
== Net work ==
The enclosed area is a right triangle:
$$A=\tfrac12(V_2-V_1)(p_2-p_1).$$
== Heat absorbed on 1 → 2 ==
The work is the trapezium under the line, and $\Delta E=\tfrac i2R(T_2-T_1)=\tfrac52(p_2V_2-p_1V_1)$:
$$Q_1=\tfrac12(p_1+p_2)(V_2-V_1)+\tfrac52(p_2V_2-p_1V_1).$$
== Efficiency ==
$$\eta=\frac{A}{Q_1}=\frac{\tfrac12(V_2-V_1)(p_2-p_1)}{\tfrac12(p_1+p_2)(V_2-V_1)+\tfrac52(p_2V_2-p_1V_1)}.$$
== Numbers ==
$A=\tfrac12(0.010\ \text{m}^3)(1.00\times10^5\ \text{Pa})=500$ J.
$Q_1=\tfrac12(3.00\times10^5)(0.010)+\tfrac52(4000-1000)=1500+7500=9000$ J.
$\eta=500/9000=5.6\%$. A poor engine: most of the heat absorbed goes into raising the
internal energy, which is then thrown away on $2\to3$ and $3\to1$.
:::

The slide stops at the general formula. Because the line passes through the origin,
$p_2/p_1=V_2/V_1=r$, and everything simplifies: $A=\tfrac12p_1V_1(r-1)^2$ and
$Q_1=3p_1V_1(r^2-1)$, so

$$\eta=\frac{r-1}{6(r+1)}.$$

::: plot Efficiency of the triangular cycle against the ratio r = V₂/V₁
x: 1 .. 20
xlabel: r = V₂/V₁
ylabel: η
η(r) = (r - 1) / (6 (r + 1))
:::

However wide you make the triangle, $\eta$ stays below $1/6\approx17\%$.

::: pv The triangular cycle with r = 2 (1 → 2 lies on a line through the origin)
axes: V (L), p (kPa)
1: V 10, p 100
2: V 20, p 200
3: V 20, p 100
1 -> 2: line
2 -> 3: isochoric
3 -> 1: isobaric
shade: cycle
:::

## Heat along different paths

The next two examples are less about efficiency than about the first law itself: the
heat and the work depend on the **path**, the change in internal energy only on the
**end states**.

### Example 2: which paths absorb heat?

In the figure below, $MT$ is an isotherm and $MQ$ an adiabat (both dashed). Three
quasi-static compressions start on the same vertical line and end at $M$: from $A$ (a
straight line, drawn), and from $B$ and $C$ along curves. On the slide the curve from
$B$ stays between the isotherm and the adiabat, and the curve from $C$ stays below the
adiabat; the diagram here marks only their starting points.

::: pv Example 2: isotherm MT and adiabat MQ (dashed), with the starting points A, B, C
axes: V, p
ticks: none
M: V 2, p 300
T: V 6, p 100
Q: V 6, p 64.4
A: V 6, p 150
B: V 6, p 85
C: V 6, p 45
A -> M: line
M -> T: isothermal dashed
M -> Q: adiabatic dashed
:::

::: example Which compressions warm the gas, and which absorb heat? (slide 例2)
For the three processes $AM$, $BM$, $CM$: (1) in which does the temperature rise?
(2) in which does the gas absorb heat?
== (1) Temperature ==
Isotherms of higher temperature lie further from the origin. $A$ is above the isotherm
through $M$ and $T$, so $T_A>T_M$: the temperature **falls** along $AM$. $B$ and $C$ lie
below it, on colder isotherms, so the temperature **rises** along $BM$ and $CM$.
== Compare with the adiabat ==
Along the adiabat $Q\to M$: $0=\Delta E_1+A_1$ … (1).
Along $C\to M$: $Q=\Delta E_2+A_2$ … (2).
Subtract: $Q=(\Delta E_2-\Delta E_1)+(A_2-A_1)$.
== Signs ==
Both end at $M$, and $C$ is colder than $Q$ (same volume, lower pressure), so
$\Delta E_2>\Delta E_1$. Both are compressions over the same volumes, so both works are
negative; the $C$ curve lies under the adiabat, so less work is done on the gas:
$|A_2|<|A_1|$, i.e. $A_2>A_1$ ("系统对外作负功，绝对值小者数值大"). Both brackets are
positive: $Q>0$, the gas **absorbs** heat along $CM$.
== The others ==
For $BM$ both brackets flip: $B$ is hotter than $Q$ and its curve lies above the adiabat,
so $Q<0$. Along $AM$ the gas is compressed ($A<0$) **and** cools ($\Delta E<0$), so
$Q<0$. **Answers: (1) $BM$, $CM$; (2) $CM$ only.**
:::

::: callout tip Use the adiabat as a ruler
To decide the sign of $Q$ on a path that ends at a point, compare it with the adiabat
through that point: the adiabat has $Q=0$ exactly. A compression ending at $M$ that runs
**below** the adiabat absorbs heat; one **above** it gives heat off. (For expansions
leaving $M$, it's the other way round.)
:::

### Example 3: one change of state, three paths

::: example Heat along acb, adb and back along ba (slide 例3)
A system goes from state $a$ to state $b$ along $acb$, absorbing 334 J of heat and doing
126 J of work. (1) Along $adb$ it does 42.0 J of work: how much heat does it absorb?
(2) If also $E_d-E_a=40.0$ J, how much heat does it absorb along $ad$ and along $db$?
(3) Returning from $b$ to $a$ along the curve $ba$, the surroundings do 84.0 J of work on
it. Does it absorb or give off heat, and how much?
== ΔE from the known path ==
$E_b-E_a=Q_{acb}-A_{acb}=334-126=208$ J. This holds for **every** path from $a$ to $b$.
== (1) Path adb ==
$Q_{adb}=\Delta E+A_{adb}=208+42=250$ J. Positive: it absorbs 250 J.
== (2) Split adb ==
Along $adb$, work is done only on the horizontal part $ad$ ($db$ is at constant
volume). So $Q_{ad}=(E_d-E_a)+A_{ad}=40+42=82$ J and
$Q_{db}=Q_{adb}-Q_{ad}=250-82=168$ J. (Check: $Q_{db}=E_b-E_d=208-40=168$ J, with no
work.)
== (3) Back along ba ==
$\Delta E_{ba}=E_a-E_b=-208$ J. Work **done on** the system is 84.0 J, so the work done
**by** it is $A_{ba}=-84.0$ J. Then
$$Q_{ba}=\Delta E_{ba}+A_{ba}=-208+(-84)=-292\ \text{J}.$$
Negative: the system **gives off** 292 J.
:::

With $p_c=3p_a$ the numbers fit a simple picture: 126 J along the top and 42 J along the
bottom over the same volume change. Taking $p_a=100$ kPa, $p_c=300$ kPa and
$V_b-V_a=0.42$ L (1 kPa·L = 1 J), a straight return path from $b$ to $a$ has exactly
84 J under it:

::: pv Example 3: the paths acb, adb and the return ba (drawn straight)
axes: V (L), p (kPa)
a: V 1, p 100
c: V 1, p 300
b: V 1.42, p 300
d: V 1.42, p 100
a -> c: isochoric
c -> b: isobaric
b -> a: line
a -> d: isobaric dashed
d -> b: isochoric dashed
shade: cycle
:::

The shaded loop $a\to c\to b\to a$ is a cycle: $126-84=42$ J of net work, and indeed
$334+(-292)=42$ J of net heat.

::: callout pitfall Q and A belong to the path, ΔE to the end points
Three paths from $a$ to $b$ gave three different heats (334 J, 250 J; and $-292$ J on
the way back) and different works, but $E_b-E_a=208$ J every time. Never write
"$Q_b-Q_a$" or "the heat of state $b$": a state *has* internal energy, it doesn't
*have* heat or work.
:::

::: callout pitfall Work done on vs work done by
"The surroundings do 84 J of work on the system" means $A=-84$ J in $Q=\Delta E+A$.
Missing this sign turns the answer $-292$ J into $-124$ J.
:::

## A cycle with an adiabat and an isotherm

::: example A diatomic cycle: line, adiabat, isotherm (slide 例4)
One mole of a diatomic ideal gas ($C_{V,m}=\tfrac52R$) runs the cycle in the figure:
$1\to2$ a straight line whose extension passes through the origin, $2\to3$ adiabatic,
$3\to1$ isothermal. $T_2=2T_1$ and $V_3=8V_1$. Find (1) the work, change of internal
energy and heat of each process, (2) the efficiency, in terms of $T_1$ and constants.
== 1 → 2, the straight line ==
$\Delta E_1=\nu C_{V,m}(T_2-T_1)=\tfrac52RT_1$.
The work is the trapezium under the line. On a line through the origin $p_1V_2=p_2V_1$,
so the cross terms cancel:
$$A_1=\tfrac12(p_1+p_2)(V_2-V_1)=\tfrac12(p_2V_2-p_1V_1)=\tfrac12R(T_2-T_1)=\tfrac12RT_1.$$
$Q_1=\Delta E_1+A_1=3RT_1$, absorbed.
== 2 → 3, adiabatic expansion ==
$Q_2=0$. Since $3\to1$ is an isotherm, $T_3=T_1$, so
$\Delta E_2=C_{V,m}(T_1-T_2)=-\tfrac52RT_1$ and $A_2=-\Delta E_2=\tfrac52RT_1$.
== 3 → 1, isothermal compression ==
$\Delta E_3=0$, and
$$A_3=RT_1\ln\frac{V_1}{V_3}=RT_1\ln\frac18=-2.08RT_1=Q_3,$$
given off.
== (2) Efficiency ==
Only $1\to2$ absorbs heat, and $3\to1$ gives off $|Q_3|=2.08RT_1$:
$$\eta=1-\frac{|Q_3|}{Q_1}=1-\frac{2.08RT_1}{3RT_1}=30.7\%.$$
Check with the work: $A=A_1+A_2+A_3=(0.5+2.5-2.08)RT_1=0.92RT_1$, and
$0.92/3=30.7\%$.
:::

The data hang together: on the line through the origin, $T\propto pV\propto V^2$, so
$T_2=2T_1$ gives $V_2=\sqrt2\,V_1$; the adiabat back down to $T_1$ multiplies the volume
by $2^{1/(\gamma-1)}=2^{2.5}$, giving $V_3=\sqrt2\cdot2^{2.5}V_1=8V_1$. Drawn with
$V_1=1$ and $p_1=100$ (any units):

::: pv Example 4: line 1 → 2, adiabat 2 → 3, isotherm 3 → 1 (γ = 1.4)
axes: V, p
gamma: 1.4
1: V 1, p 100
2: V 1.414, p 141.4
3: V 8, p 12.5
1 -> 2: line
2 -> 3: adiabatic
3 -> 1: isothermal
shade: cycle
:::

## More practice: a rectangular cycle

The slides close the chapter with self-study exercises (自主提升训练). This one belongs
here; the others are in the quiz below and in Lesson 2.5.

::: example One mole of helium round a rectangle (训练2)
One mole of helium ($C_{V,m}=\tfrac32R$, $C_{p,m}=\tfrac52R$) runs the cycle
$1\to2\to3\to4\to1$: $1\to2$ isochoric with $p_2=2p_1$, $2\to3$ isobaric to $V_4=2V_1$,
$3\to4$ isochoric, $4\to1$ isobaric. Find the heat in each process and the efficiency.
== Temperatures ==
$T\propto pV$: $T_2=2T_1$, $T_3=4T_1$ (double $p$, double $V$), $T_4=2T_1$.
== Heats ==
$Q_{12}=C_{V,m}(T_2-T_1)=C_{V,m}T_1=1.5RT_1$ (in)
$Q_{23}=C_{p,m}(T_3-T_2)=2C_{p,m}T_1=5RT_1$ (in)
$Q_{34}=C_{V,m}(T_4-T_3)=-2C_{V,m}T_1=-3RT_1$ (out)
$Q_{41}=C_{p,m}(T_1-T_4)=-C_{p,m}T_1=-2.5RT_1$ (out)
== Work and efficiency ==
$A=(p_2-p_1)(V_4-V_1)=p_1V_1=RT_1$, and $Q_1=Q_{12}+Q_{23}=6.5RT_1$:
$$\eta=\frac{A}{Q_1}=\frac{RT_1}{3C_{V,m}T_1+2RT_1}=\frac{1}{6.5}=15.4\%.$$
Check: $Q_1-|Q_2|=6.5RT_1-5.5RT_1=RT_1=A$.
:::

::: callout note A slip on the slide
The slide prints $\eta=15.3\%$. With $C_{V,m}=\tfrac32R$ the result is
$1/6.5=0.1538$, which rounds to **15.4%**.
:::

::: pv The helium rectangle (p₂ = 2p₁, V₄ = 2V₁)
axes: V, p
ticks: none
1: V 1, p 1
2: V 1, p 2
3: V 2, p 2
4: V 2, p 1
1 -> 2: isochoric
2 -> 3: isobaric
3 -> 4: isochoric
4 -> 1: isobaric
shade: cycle
:::

::: callout exam What exams ask about cycles
- "Find $\eta$" for a cycle made of the four standard processes (and straight lines):
  follow the recipe, and be sure $Q_1$ counts only the heat absorbed.
- Fill-ins on the first law along paths, like Example 3: $\Delta E$ from one path,
  then $Q$ on another; mind "work done on" vs "work done by".
- Reading a $p$–$V$ diagram: which way round is an engine, what the enclosed area
  means, which processes absorb heat (Example 2).
:::

::: cards Cycles, engines and refrigerators
Cyclic process (循环过程) :: The system returns to its initial state; a closed curve on the $p$–$V$ diagram
$\Delta E$ over a whole cycle :: Zero: internal energy is a state quantity
Net work of a cycle :: $A=Q_1-Q_2$ = the area enclosed by the loop on the $p$–$V$ diagram
Forward cycle (正循环) :: Clockwise on $p$–$V$; net work done by the gas $>0$; heat engines
Reverse cycle (逆循环) :: Counter-clockwise on $p$–$V$; net work done on the gas; refrigerators
Working substance (工质) :: The gas or fluid that runs the cycle and carries the energy
Heat-engine efficiency (热机效率) :: $\eta=\dfrac{A}{Q_1}=1-\dfrac{Q_2}{Q_1}$
Coefficient of performance (致冷系数) :: $\omega=\dfrac{Q_2}{A}=\dfrac{Q_2}{Q_1-Q_2}$; usually above 1
In $\eta$ and $\omega$, $Q_1$ and $Q_2$ are… :: Magnitudes (positive numbers): heat absorbed and heat given off
$Q_1$ in a cycle problem :: Only the processes where heat goes in, added up — not the net heat
A refrigerator's heat to the room :: $Q_1=Q_2+A$, more than it removes from the inside
Steam engine's four parts :: Boiler (absorbs $Q_1$), cylinder (does work), condenser (gives off $Q_2$), pump (takes in work)
Sign of $Q$ on a path ending at $M$ :: Compare with the adiabat through $M$ ($Q=0$ there)
:::

::: quiz Check yourself
? An engine absorbs 2000 J and gives off 1500 J each cycle. What is its efficiency?
answer: 0.25
> $\Delta E=0$, so $A=2000-1500=500$ J and $\eta=500/2000=0.25=25\%$.

? A refrigerator removes 600 J from its cold compartment for every 200 J of work. How much heat does it give to the room per 200 J of work?
answer: 800 J
> Over a cycle $\Delta E=0$: $Q_1=Q_2+A=600+200=800$ J. Its coefficient of performance is $600/200=3$.

? On a $p$–$V$ diagram a cycle runs counter-clockwise and encloses an area worth 800 J. What is the net work done **by** the gas per cycle?
answer: -800 J
> Counter-clockwise means the gas is compressed at higher pressure than it expands: the net work done by it is minus the enclosed area, $-800$ J. That is a refrigerator's cycle.

? (例3) Going from $a$ to $b$ along $acb$, a system absorbs 334 J and does 126 J of work. Along $adb$ it does 42.0 J of work. How much heat does it absorb along $adb$?
answer: 250 J
> $E_b-E_a=334-126=208$ J for any path. Then $Q_{adb}=208+42=250$ J.

? (例3 continued) With $E_d-E_a=40.0$ J, and no work done on the constant-volume part $db$, how much heat is absorbed along $db$?
answer: 168 J
> $Q_{ad}=40+42=82$ J, so $Q_{db}=250-82=168$ J; or directly $Q_{db}=E_b-E_d=208-40=168$ J.

? (例3 continued) Returning from $b$ to $a$, the surroundings do 84.0 J of work on the system. What is the heat $Q_{ba}$ it absorbs (negative if it gives heat off)?
answer: -292 J
> $\Delta E_{ba}=-208$ J and the work done by the system is $A_{ba}=-84$ J, so $Q_{ba}=-208-84=-292$ J: it gives off 292 J.

? (例2) In the figure of Example 2 ($MT$ isotherm, $MQ$ adiabat), the gas is compressed to $M$ along $AM$, $BM$ (between the isotherm and the adiabat) or $CM$ (below the adiabat). In which processes does the temperature rise?
- [ ] $AM$ only
- [x] $BM$ and $CM$
- [ ] $CM$ only
- [ ] all three
> $B$ and $C$ lie below the isotherm through $M$, on colder isotherms, so going to $M$ warms the gas. $A$ lies above it, so $AM$ cools the gas.

? (例2) In which of the three processes does the gas absorb heat?
- [ ] $AM$
- [ ] $BM$
- [x] $CM$
- [ ] $BM$ and $CM$
> Compare with the adiabat $QM$ ($Q=0$): $Q_{CM}=(\Delta E_{CM}-\Delta E_{QM})+(A_{CM}-A_{QM})$. $C$ is colder than $Q$ and the $C$ curve lies below the adiabat (less work done on the gas), so both brackets are positive. For $BM$ both are negative, and $AM$ is a compression that also cools.

? (例4) One mole of a diatomic gas runs a cycle in which only $1\to2$ absorbs heat, $Q_1=3RT_1$, and the isothermal compression $3\to1$ from $8V_1$ to $V_1$ gives heat off. What is the efficiency?
answer: 1 - ln(8)/3
> $|Q_3|=RT_1\ln8=2.08RT_1$, so $\eta=1-2.08/3=30.7\%$.

? (训练2) One mole of helium runs a rectangle: isochoric $1\to2$ with $p_2=2p_1$, isobaric to $2V_1$, isochoric down, isobaric back. What is the efficiency?
answer: 2/13
> $A=p_1V_1=RT_1$; heat goes in on $1\to2$ ($\tfrac32RT_1$) and $2\to3$ ($5RT_1$), so $Q_1=6.5RT_1$ and $\eta=1/6.5=2/13=15.4\%$ (the slide's 15.3% is a rounding slip).

? (例1) For the triangular cycle whose side $1\to2$ lies on a line through the origin ($i=5$), write $\eta$ in terms of $r=V_2/V_1$.
expression: (r - 1)/(6 (r + 1))
variables: r
> $A=\tfrac12p_1V_1(r-1)^2$ and $Q_1=\tfrac12p_1V_1(r^2-1)+\tfrac52p_1V_1(r^2-1)=3p_1V_1(r^2-1)$, so $\eta=\dfrac{(r-1)^2}{6(r^2-1)}=\dfrac{r-1}{6(r+1)}$.

? (训练3) A cylinder, insulated except at its base, is split by a fixed heat-conducting plate: 1 mol of N₂ below (A), 1 mol of He above (B) under a piston kept at constant pressure. 334 J of heat is supplied at the base. By how much does the temperature rise? (Use $R=8.31$.)
answer: 334/(5*8.31) K
> Both parts end at the same temperature, so $\Delta T$ is common. Only B does work, $A=p\Delta V_B=R\Delta T$. First law for the whole: $334=\tfrac52R\Delta T+\tfrac32R\Delta T+R\Delta T=5R\Delta T$, so $\Delta T=8.04$ K. Then A (constant volume) absorbs $\tfrac52R\Delta T=167$ J, and B absorbs $\tfrac32R\Delta T+R\Delta T=167$ J.

? (训练4) For a fixed amount of ideal gas in a quasi-static adiabatic process, how does the density $\rho$ vary with the pressure $p$?
- [ ] $\rho\propto p$: a straight line through the origin
- [ ] $\rho$ stays constant
- [ ] $\rho$ rises ever more steeply with $p$ (curving upward)
- [x] $\rho\propto p^{1/\gamma}$: rises steeply at first, then flattens
> $\rho=m_{\text{total}}/V$ and $pV^\gamma=$ const give $V\propto p^{-1/\gamma}$, so $\rho\propto p^{1/\gamma}$. Since $1/\gamma<1$ the curve through the origin bends over (concave): the slide's graph (D). (The slide gets there through $\rho=\frac{M}{R}\frac pT$ and $p^{\gamma-1}T^{-\gamma}=$ const.)
:::

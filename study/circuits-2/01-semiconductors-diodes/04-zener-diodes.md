---
title: Zener diodes
zh: 稳压二极管
summary: The Zener diode's breakdown characteristic and ratings, how temperature affects it, and how to build and size a simple Zener voltage regulator.
source: 第2章 半导体二极管及其基本应用电路（2.5）, 2026-09-03
---

An ordinary diode must be kept out of breakdown. A {{term Zener diode | 稳压二极管}} is a
diode made to live there: in breakdown its voltage hardly changes however much the
current changes, so it can hold a voltage steady. This lesson covers its characteristic,
the numbers on its datasheet, and the simplest voltage regulator — a resistor and a
Zener — including the calculation the exam is most likely to ask: choosing the series
resistor.

## The Zener characteristic

Think of a pressure-relief valve: below a set pressure it stays shut; once the pressure
reaches the set point, it opens just as wide as needed to keep the pressure from rising
further. A Zener diode does the same with voltage. Below $U_Z$ in the reverse direction
it passes (almost) nothing; at $U_Z$ it passes whatever current is needed to keep the
voltage at about $U_Z$.

::: define Zener diode | 稳压二极管
A silicon diode built to work in reverse breakdown. Within a range of reverse current,
its breakdown characteristic is nearly vertical, so the voltage across it stays almost
constant at its Zener voltage $U_Z$. Also called a voltage-regulator diode (稳压管).
:::

Its symbol is a diode whose bar is bent into a small Z. In use it is connected
**reverse biased**: cathode (the bar) to the more positive point.

- **Forward**, it behaves like any silicon diode: an exponential curve, about 0.7 V.
- **Reverse**, almost no current flows until the voltage reaches $U_Z$. Then it breaks
  down, and the curve drops almost vertically: a large change of current $\Delta I_Z$
  gives only a tiny change of voltage $\Delta U_Z$.

The steep part works only between two currents. Below $I_{Zmin}$ (just past the knee)
the curve is still bending and the voltage isn't held; above $I_{Zmax}$ the diode
overheats. Breakdown is not damage — overheating is.

Change $U_Z$ and the dynamic resistance $r_Z$ (the slope of the breakdown line, defined
below) and watch the reverse branch:

::: plot Zener diode characteristic
x: -16 .. 1
y: -40 .. 10
xlabel: u (V)
ylabel: i (mA)
i(u) = 1e-11 (exp(u/0.026) - 1) + 1000 min(0, (u + UZ) / rZ)
slider UZ: 3 .. 15 = 6 | V
slider rZ: 2 .. 100 = 20 | Ω
:::

::: callout key What the Zener does
In breakdown, between $I_{Zmin}$ and $I_{Zmax}$, a Zener diode is (almost) a constant
voltage source of $U_Z$. Outside that range it is not.
:::

## The main parameters

::: define Zener voltage | 稳定电压
$U_Z$: the reverse voltage across a Zener diode at its specified reverse working current
$I_Z$. Diodes of the same type spread around the nominal value.
:::

::: define Zener dynamic resistance | 稳压管动态电阻
$r_Z$: the dynamic resistance of a Zener diode, defined like a diode's $r_d$ but taken
from the reverse breakdown curve. The smaller $r_Z$, the steeper the breakdown and the
better the diode regulates.
:::

::: formula Zener dynamic resistance | 稳压管动态电阻
$$r_Z = \frac{\Delta U_Z}{\Delta I_Z}$$
--
r_Z | dynamic resistance in breakdown | Ω
\Delta U_Z | change of the Zener voltage | V
\Delta I_Z | change of the Zener current that causes it | A
:::

::: define Maximum power dissipation | 最大耗散功率
$P_{ZM}$: the largest power a Zener diode may dissipate; it depends on the junction's
area and how well heat is carried away.
:::

::: define Maximum and minimum Zener current | 最大和最小稳定工作电流
$I_{Zmax}$: the largest working current, set by $P_{ZM}$. $I_{Zmin}$: the current just
past the knee, where the curve has just broken down; below it the diode doesn't
regulate.
:::

In breakdown the diode has $U_Z$ across it and $I_Z$ through it, so it dissipates
$U_Z I_Z$; the maximum power fixes the maximum current.

::: formula Zener power limit | 稳压管最大耗散功率
$$P_{ZM} = U_Z I_{Zmax}, \qquad I_{Zmax} = \frac{P_{ZM}}{U_Z}$$
--
P_{ZM} | maximum power dissipation | W
U_Z | Zener voltage | V
I_{Zmax} | maximum Zener current | A
:::

::: example Reading a Zener's ratings
A 6.2 V Zener is rated $P_{ZM} = 0.5$ W and has $r_Z = 10$ Ω. Find $I_{Zmax}$, and how
much $U_Z$ changes when the current goes from 10 mA to 30 mA.
== Maximum current ==
$I_{Zmax} = P_{ZM}/U_Z = 0.5/6.2 \approx 80.6$ mA.
== Voltage change ==
$\Delta U_Z = r_Z\,\Delta I_Z = 10 \times 0.020 = 0.20$ V: the current tripled, the voltage
moved by about 3%.
:::

## Temperature coefficient

$U_Z$ drifts with temperature, and which way depends on the breakdown mechanism from
lesson 2.

::: define Temperature coefficient of the Zener voltage | 稳定电压的温度系数
$\alpha$: how much $U_Z$ changes per degree of temperature change, usually given as a
fraction of $U_Z$ per °C ($\alpha = \dfrac{\Delta U_Z / U_Z}{\Delta T}$).
:::

::: law Sign of the Zener temperature coefficient | 稳压管温度系数的正负
For $|U_Z| > 7$ V the breakdown is avalanche breakdown and $\alpha > 0$ ($U_Z$ rises when
warmer). For $|U_Z| < 4$ V it is Zener breakdown and $\alpha < 0$. Between 4 V and 7 V
both mechanisms act, their effects cancel, and $\alpha$ is close to zero.
:::

Why opposite signs? In avalanche breakdown, warmer atoms vibrate more and scatter the
carriers, so they need a stronger field (more voltage) to gain avalanche energy. In
Zener breakdown, heat makes electrons easier to pull out of their bonds, so less voltage
is needed.

That is why Zeners of about 5–6 V are used as **reference diodes** (标准稳压管): their
voltage barely moves with temperature, giving a very stable DC voltage.

::: example Temperature drift
A 12 V Zener has $\alpha = +0.08\ \%/°\text{C}$. By how much does $U_Z$ change when it
warms up by 50 °C?
== Change ==
$\Delta U_Z = \alpha\, U_Z\, \Delta T = 0.0008 \times 12 \times 50 = 0.48$ V, up to about
12.48 V. The sign fits: 12 V is above 7 V, avalanche breakdown, positive coefficient.
:::

## The Zener regulator

The simplest regulator: the input $U_I$ feeds the load $R_L$ through a series
{{term current-limiting resistor | 限流电阻}} $R$, and the Zener $VD_Z$ sits across the load,
reverse biased.

::: circuit Zener voltage regulator
V1 0,4 0,0 UI
R1 0,0 4,0 R
Z1 4,4 4,0 VDZ
R2 7,0 7,4 RL
W 4,0 7,0
W 0,4 7,4
G 0,4
label UO 7,0
:::

The output is the Zener's voltage, $U_O = U_Z$. The currents obey KCL at the output node
and Ohm's law in $R$:

$$I_R = \frac{U_I - U_Z}{R} = I_Z + I_L, \qquad I_L = \frac{U_Z}{R_L}$$

$R$ is essential: it takes up the difference between $U_I$ and $U_Z$. Without it the
Zener would be connected straight across the source and its current would be limited by
nothing.

### How it regulates

The idea: $R$ always carries $I_R$; the Zener takes whatever part the load doesn't, so
that $R$'s voltage drop is just right. The slides show it as two chains.

**The input rises** (load unchanged):

$$U_I\uparrow \to U_O(U_Z)\uparrow \to I_Z\uparrow\uparrow \to I_R\uparrow \to U_R\uparrow \to U_O\downarrow$$

A tiny rise in $U_O$ makes the steep Zener draw much more current; that current flows
through $R$, whose extra drop takes up almost all of the rise in $U_I$.

**The load resistance falls** (input unchanged):

$$R_L\downarrow \to I_L\uparrow \to I_R\uparrow \to U_R\uparrow \to U_O\downarrow \to I_Z\downarrow \to I_R\downarrow \to U_R\downarrow \to U_O\uparrow$$

The load takes more current, which would pull $U_O$ down; the Zener responds by taking
less, so $I_R$ (and the drop in $R$) stays nearly the same.

::: law Regulation principle of the Zener regulator | 稳压管稳压原理
The Zener's current changes to absorb changes of input voltage and load current, and the
series resistor turns those current changes into voltage drops, so the output stays
close to $U_Z$ as long as $I_{Zmin} \le I_Z \le I_{Zmax}$.
:::

Try it. Here the Zener is replaced by its breakdown model, a 11.85 V source in series
with $r_Z = 15$ Ω (so $U_Z = 12$ V at 10 mA). Move $U_I$ from 27 V to 33 V and watch the
output move by only about 0.07 V while the Zener's current swings by about 5 mA. The model
only holds while the Zener current is positive (above $I_{Zmin}$, really); if the
simulator shows it negative, a real Zener would have stopped conducting.

::: circuit-sim Zener regulator with the Zener's breakdown model
V1 0,6 0,0 30V [20..40]
R1 0,0 4,0 1.2k [200..3k]
R2 4,0 4,3 15 [1..50]
V2 4,6 4,3 11.85V [5..15]
R3 7,0 7,6 2.4k [500..100k]
W 4,0 7,0
W 0,6 4,6 7,6
G 0,6
label UO 7,0
:::

The explorer below does the same with an ideal Zener that switches off: if
$U_I R_L/(R + R_L)$ is below $U_Z$, the Zener carries nothing and the output is just a
voltage divider.

::: explore Zener regulator: currents and output
slider UI: 0 .. 40 = 30 | V
slider R: 200 .. 3000 = 1200 | Ω
slider RL: 500 .. 20000 = 2400 | Ω
slider UZ: 3 .. 15 = 12 | V
UO = min(UZ, UI RL / (R + RL)) | V | Output voltage
IR = (UI - UO) / R | A | Current in R
IL = UO / RL | A | Load current
IZ = IR - IL | A | Zener current
PZ = UZ IZ | W | Zener power
:::

## Choosing the current-limiting resistor

$R$ must keep the Zener current inside $[I_{Zmin}, I_{Zmax}]$ in the worst cases. The
input $U_I$ varies between $U_{Imin}$ and $U_{Imax}$, the load current between
$I_{Lmin}$ and $I_{Lmax}$. Since $I_Z = \dfrac{U_I - U_Z}{R} - I_L$:

- $I_Z$ is **largest** when the input is highest and the load takes least
  ($U_{Imax}$, $I_{Lmin}$). It must not exceed $I_{Zmax}$:
  $$\frac{U_{Imax} - U_Z}{R} - I_{Lmin} \le I_{Zmax}$$
- $I_Z$ is **smallest** when the input is lowest and the load takes most
  ($U_{Imin}$, $I_{Lmax}$). It must not fall below $I_{Zmin}$:
  $$\frac{U_{Imin} - U_Z}{R} - I_{Lmax} \ge I_{Zmin}$$

Solving each for $R$ gives a range.

::: formula Range of the current-limiting resistor | 限流电阻的取值范围
$$R_{min} = \frac{U_{Imax} - U_Z}{I_{Zmax} + I_{Lmin}} \le R \le R_{max} = \frac{U_{Imin} - U_Z}{I_{Zmin} + I_{Lmax}}$$
--
U_{Imax}, U_{Imin} | highest and lowest input voltage | V
I_{Lmax}, I_{Lmin} | largest and smallest load current | A
I_{Zmax}, I_{Zmin} | largest and smallest allowed Zener current | A
U_Z | Zener voltage | V
:::

::: callout pitfall Pair the worst cases correctly
The maximum Zener current goes with $U_{Imax}$ **and** $I_{Lmin}$; the minimum with
$U_{Imin}$ **and** $I_{Lmax}$. Mixing them (say $U_{Imax}$ with $I_{Lmax}$) gives a range
that fails in practice. And note which bound gives which: the $I_{Zmax}$ condition gives
the *smallest* allowed $R$. If $R_{min} > R_{max}$, no resistor works: choose another
Zener or a better-regulated input.
:::

::: example Example 2.5.1: sizing the resistor
$U_I = 30$ V with a variation of ±10%; the Zener has $U_Z = 12$ V, $I_{Zmin} = 5$ mA,
$I_{Zmax} = 20$ mA; the load current $I_L$ is between 0 and 5 mA. Find the range of $R$.
== Worst-case values ==
$U_{Imax} = 30 \times 1.1 = 33$ V, $U_{Imin} = 30 \times 0.9 = 27$ V; $I_{Lmin} = 0$,
$I_{Lmax} = 5$ mA.
== Lower limit (Zener current not too large) ==
$$R \ge \frac{U_{Imax} - U_Z}{I_{Zmax} + I_{Lmin}} = \frac{33 - 12}{20 + 0\ \text{mA}} = 1.05\ \text{k}\Omega$$
== Upper limit (Zener current not too small) ==
$$R \le \frac{U_{Imin} - U_Z}{I_{Zmin} + I_{Lmax}} = \frac{27 - 12}{5 + 5\ \text{mA}} = 1.5\ \text{k}\Omega$$
== Choose ==
$1.05\ \text{k}\Omega \le R \le 1.5\ \text{k}\Omega$; a standard value inside it is
$R = 1.2$ kΩ. (The slide's numbers check out.)
:::

::: example Checking the choice of 1.2 kΩ
For Example 2.5.1 with $R = 1.2$ kΩ, find the Zener current in both worst cases, the
largest power in the Zener and in $R$, and compare with $P_{ZM} = U_Z I_{Zmax}$.
== Largest Zener current ==
$U_I = 33$ V, $I_L = 0$: $I_Z = \dfrac{33 - 12}{1.2\ \text{k}\Omega} - 0 = 17.5$ mA ≤ 20 mA. ✓
== Smallest Zener current ==
$U_I = 27$ V, $I_L = 5$ mA: $I_Z = \dfrac{27 - 12}{1.2\ \text{k}\Omega} - 5 = 12.5 - 5 = 7.5$ mA ≥ 5 mA. ✓
== Power ==
Zener: at most $12 \times 17.5 = 210$ mW, under $P_{ZM} = 12 \times 20 = 240$ mW.
Resistor: at most $(33 - 12)^2/1200 \approx 0.37$ W, so use a 0.5 W resistor.
:::

The slides end with a question: if the calculation gives $R = 200$–$300$ Ω, should you
pick a value near 200 Ω or near 300 Ω? They don't give the answer. Nearer the **larger**
end is usually better: a larger $R$ means less Zener current and power (cooler, more
margin from $I_{Zmax}$), less power wasted in $R$, and better regulation, since an input
change divides between $R$ and $r_Z$ as $\Delta U_O \approx \dfrac{r_Z}{R + r_Z}\Delta U_I$.
But stay a little inside the limit, so the resistor's tolerance and the spread of $U_Z$
can't push $I_Z$ below $I_{Zmin}$ at the lowest input and heaviest load.

::: callout exam What's typically asked
Find $R_{min}$ and $R_{max}$ from the worst cases (as Example 2.5.1), pick a standard
value and check it; explain the regulation chains; state the sign of the temperature
coefficient from $U_Z$ (above 7 V positive, below 4 V negative, 4–7 V about zero).
:::

::: cards Zener diodes
How a Zener diode is connected in a regulator :: Reverse biased: cathode to the positive side, in breakdown.
Zener parameter $U_Z$ :: The Zener voltage: the reverse voltage at the specified working current.
Zener parameter $r_Z$ :: $r_Z = \Delta U_Z/\Delta I_Z$ in breakdown; smaller means steeper and better regulation.
Zener parameter $I_{Zmin}$ :: The current just past the knee; below it the Zener doesn't regulate.
$I_{Zmax}$ from $P_{ZM}$ :: $I_{Zmax} = P_{ZM}/U_Z$
Temperature coefficient for $U_Z > 7$ V :: Positive (avalanche breakdown).
Temperature coefficient for $U_Z < 4$ V :: Negative (Zener breakdown).
Which Zeners make reference diodes? :: About 4–7 V (5–6 V), where the temperature coefficient is close to zero.
Why the series resistor? :: It takes up $U_I - U_Z$ and turns the Zener's current changes into voltage drops; without it the current is unlimited.
Smallest series resistor $R_{min}$ :: $\dfrac{U_{Imax} - U_Z}{I_{Zmax} + I_{Lmin}}$ (keeps $I_Z \le I_{Zmax}$)
Largest series resistor $R_{max}$ :: $\dfrac{U_{Imin} - U_Z}{I_{Zmin} + I_{Lmax}}$ (keeps $I_Z \ge I_{Zmin}$)
Example 2.5.1 answer :: $1.05\ \text{k}\Omega \le R \le 1.5\ \text{k}\Omega$, choose 1.2 kΩ.
:::

::: quiz Zener diodes
? A 5.1 V Zener is rated 0.5 W. What is its maximum current?
answer: 98 mA
tolerance: 1%
> $I_{Zmax} = P_{ZM}/U_Z = 0.5/5.1 \approx 0.098$ A.

? A Zener's voltage changes by 0.1 V when its current changes from 5 mA to 25 mA. What is $r_Z$?
answer: 5 Ω
> $r_Z = \Delta U_Z/\Delta I_Z = 0.1/0.020 = 5$ Ω.

? A 3.3 V Zener: what sign is its temperature coefficient?
- [ ] Positive
- [x] Negative
- [ ] About zero
> Below 4 V the breakdown is Zener breakdown, whose voltage falls as temperature rises: $\alpha < 0$.

? In a Zener regulator, when is the Zener current largest?
- [x] Highest input voltage, smallest load current
- [ ] Highest input voltage, largest load current
- [ ] Lowest input voltage, smallest load current
- [ ] Lowest input voltage, largest load current
> $I_Z = (U_I - U_Z)/R - I_L$ is largest when the first term is largest and the subtracted load current is smallest.

? $U_I = 15$ V ± 10%, $U_Z = 6$ V, $I_{Zmin} = 5$ mA, $I_{Zmax} = 40$ mA, $I_L$ from 0 to 10 mA. What is the smallest allowed $R$?
answer: 262.5 Ω
tolerance: 1%
> $R_{min} = \dfrac{U_{Imax} - U_Z}{I_{Zmax} + I_{Lmin}} = \dfrac{16.5 - 6}{40 + 0\ \text{mA}} = 262.5$ Ω.

? Same regulator: what is the largest allowed $R$?
answer: 500 Ω
> $R_{max} = \dfrac{U_{Imin} - U_Z}{I_{Zmin} + I_{Lmax}} = \dfrac{13.5 - 6}{5 + 10\ \text{mA}} = 500$ Ω.

? Write the largest allowed series resistance in terms of $U_{Imin}$, $U_Z$, $I_{Zmin}$ and $I_{Lmax}$ (type them as Ui, Uz, Iz, Il).
expression: (Ui - Uz) / (Iz + Il)
variables: Ui, Uz, Iz, Il
> At the lowest input and heaviest load, $I_Z = (U_{Imin} - U_Z)/R - I_{Lmax} \ge I_{Zmin}$, so $R \le (U_{Imin} - U_Z)/(I_{Zmin} + I_{Lmax})$.

? In Example 2.5.1 ($U_I$ 27–33 V, $U_Z = 12$ V, $I_L$ 0–5 mA) with $R = 1.2$ kΩ, what is the smallest Zener current?
answer: 7.5 mA
> At $U_I = 27$ V and $I_L = 5$ mA: $I_Z = 15/1.2\ \text{k}\Omega - 5\ \text{mA} = 12.5 - 5 = 7.5$ mA, above $I_{Zmin} = 5$ mA.

? The load resistance of a Zener regulator falls. What does the Zener current do (input unchanged)?
- [ ] It rises
- [x] It falls
- [ ] It stays the same
> The load takes more current; $I_R$ stays nearly fixed because $U_O$ hardly changes, so the Zener takes less: $I_Z = I_R - I_L$ falls.

? Zeners whose temperature coefficient is close to zero have $U_Z$ between 4 V and … V.
answer: 7 V
> Between about 4 and 7 V both breakdown mechanisms act and their temperature effects cancel.
:::

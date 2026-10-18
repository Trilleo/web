---
title: Smoothing filters and voltage multipliers
zh: 滤波电路与倍压整流
summary: How a capacitor or an inductor smooths a rectifier's pulsating output, how to size the capacitor, what the filter does to the diodes, and how voltage doublers and multipliers reach several times the secondary's peak.
source: 第10章 直流电源 (10.4 and 倍压整流), 2026-09-21 → 09-24
---

## Why the rectifier needs a filter

The last lesson ended with a bridge rectifier whose output still has a ripple factor
of 0.67: a 100 Hz wobble two-thirds the size of the DC itself. Feed that to an
amplifier and you hear a loud hum. The rectified voltage is full of
{{term harmonics | 谐波成分}}, and the filter's job is to keep the DC and throw away
the AC part. This lesson shows the two basic filters, the capacitor and the
inductor, what each does to the output and to the diodes, and then a trick that uses
capacitors and diodes to *multiply* the voltage.

## Where the filter element goes

Both filters use an energy-storage element that resists change:

- A capacitor's voltage can't jump. It's an open circuit to DC and a small impedance
  to AC, so it goes **in parallel** with the load: the AC ripple is shorted away
  through it, the DC stays on the load.
- An inductor's current can't jump. It has a tiny resistance to DC and a large
  impedance to AC, so it goes **in series** with the load: the ripple voltage drops
  across the inductor, the DC passes through.

::: callout key C across, L in series
A capacitor filter is a capacitor across the load; an inductor filter is an inductor
in series with it. Each puts the AC where it can't reach the load.
:::

## The capacitor filter

### How it smooths

Think of the capacitor as a water tank between a pump that delivers in bursts and a
tap that runs all the time. Each burst tops the tank up; between bursts the tank
keeps the tap running.

- While the rectified voltage **rises** above the capacitor's voltage, the diodes
  conduct: the rectifier feeds the load and also charges $C$, storing energy.
- Once the rectified voltage starts to **fall** faster than the capacitor can, the
  diodes are reverse-biased and switch off. Now $C$ alone feeds the load,
  discharging exponentially through $R_L$, until the next rising half-sine catches
  up with it.

::: circuit Bridge rectifier with a capacitor filter
A1 8,4 4,4 u2
D1 4,4 4,0
D4 4,8 4,4
D2 8,4 8,0
D3 8,8 8,4
W 4,0 8,0 12,0 16,0
W 4,8 8,8 12,8 16,8
C1 12,0 12,8 C
R1 16,0 16,8 RL
G 16,8
label uO 16,0
:::

::: define Capacitor filter | 电容滤波电路
A filter made of a capacitor connected in parallel with the load after the
rectifier. It charges while the rectified voltage rises and discharges into the load
while it falls, so the output stays near the peak voltage with only a small ripple.
:::

**With no load** ($R_L$ open) there's nowhere for the charge to go. The capacitor
charges up to the peak on the first quarter-cycle and then stays there:
$u_O = \sqrt2U_2$, perfectly flat.

**With a load**, the capacitor discharges between peaks with the
{{term discharge time constant | 放电时间常数}} $\tau_d = R_LC$. The bigger $\tau_d$,
the less the voltage sags before the next recharge. Try it: the plot shows the
filtered output (in steady state) over the rectified humps it rides on, for a 50 Hz
supply.

::: plot Capacitor-filtered output of a bridge rectifier (50 Hz)
x: 0 .. 60
xlabel: t (ms)
ylabel: u_O (V)
uO(t) = sqrt(2) U2 max(abs(sin(pi t/10)), exp(-(t - 5 - 10 floor((t - 5)/10))/tau))
rectified(t) = sqrt(2) U2 abs(sin(pi t/10))
slider U2: 5 .. 30 = 10 | V
slider tau: 2 .. 200 = 30 | ms | log
:::

At $\tau_d = 2$ ms the capacitor empties almost at once and the output is nearly the
bare rectified wave; at 200 ms it barely dips between peaks.

### The conduction angle

Look at where the output *follows* the sine in the plot: only a short stretch before
each peak. That's the only time the diodes conduct.

::: define Conduction angle | 导通角
$\theta$: the electrical angle (part of the cycle, in degrees or radians) during
which a rectifier diode conducts. Without a filter it's $\pi$ (a whole half-cycle);
with a capacitor filter $\theta < \pi$, and the larger $R_LC$, the smaller $\theta$.
:::

All the charge the load uses in a half-cycle has to be put back into the capacitor
during that short conduction time. So the diode current comes as tall, narrow pulses
instead of a gentle half-sine: the better the filtering (larger $R_LC$), the
narrower and taller the spikes. This {{term surge current | 冲击电流}} heats the
diodes and shortens their life. (There's also a big surge at switch-on, when the
empty capacitor first charges.)

The *average* diode current hasn't changed: in a bridge each diode still carries
half the load current,

$$I_{D(AV)} = \frac{I_L}{2} = \frac{U_{O(AV)}}{2R_L}$$

but because of the peaks, the slides' rule is to choose diodes whose maximum average
rectified current $I_F$ is **2–3 times the load current**.

::: callout pitfall Same average, much bigger peaks
Adding the capacitor doesn't change the diode's *average* current formula, but it
makes the current arrive in short pulses. Size the diode by $I_F > (2\sim3)I_L$, not
by $I_{D(AV)}$ alone.
:::

### Choosing the capacitor

For a smooth output, the capacitor should take several half-periods to discharge
noticeably.

::: formula Capacitor filter time constant | 电容滤波放电时间常数
$$\tau_d = R_LC \ge (3\sim5)\,\frac{T}{2}$$
--
\tau_d | discharge time constant | s
R_L | load resistance | Ω
C | filter capacitance | F
T | period of the AC mains, $1/f$ (20 ms at 50 Hz) | s
:::

Here $T/2$ is the time between recharges of a bridge rectifier (it recharges every
half period).

### The average output voltage

To get a number, the slides replace the curved output with a sawtooth: the voltage
jumps up to $U_{OMAX}$ at each peak, then falls in a straight line, the tangent of
the exponential, which would reach zero after a time $R_LC$. In the half period
$T/2$ it falls to $U_{OMIN}$. Matching the slopes:

$$\frac{U_{OMAX}}{R_LC} = \frac{U_{OMAX}-U_{OMIN}}{T/2}$$

and the average of the sawtooth is

$$U_{O(AV)} = \frac{U_{OMAX}+U_{OMIN}}{2} = U_{OMAX}\left(1-\frac{T}{4R_LC}\right)$$

::: formula Capacitor filter output | 电容滤波输出电压平均值
$$U_{O(AV)} = \sqrt2U_2\left(1-\frac{T}{4R_LC}\right) \approx 1.2\,U_2$$
--
U_{O(AV)} | average output of a bridge rectifier with a capacitor filter | V
U_2 | RMS secondary voltage; $\sqrt2U_2 = U_{OMAX}$, the peak | V
T | mains period | s
R_L C | discharge time constant | s
:::

With $R_LC = 3\cdot T/2$ the bracket is $1 - 1/6$, giving $1.18U_2$; with
$5\cdot T/2$ it's $1 - 1/10$, giving $1.27U_2$. Real diodes and the transformer's
own resistance pull it down a little more, so the design value is
$U_{O(AV)} \approx 1.2U_2$.

| Condition (bridge) | $U_{O(AV)}$ |
| --- | --- |
| No filter | $0.9\,U_2$ |
| Capacitor filter, normal load, $R_LC \ge (3\sim5)T/2$ | $\approx 1.2\,U_2$ |
| Capacitor filter, no load | $\sqrt2U_2 \approx 1.41\,U_2$ |

### The ripple factor

The real output isn't a neat function, so the ripple factor is also estimated from
the sawtooth: half its peak-to-peak swing over its average.

::: formula Capacitor filter ripple factor | 电容滤波脉动系数
$$S = \frac{T}{4R_LC - T}$$
--
S | approximate ripple factor of the capacitor-filtered output | 1
T | mains period | s
R_L C | discharge time constant | s
:::

The bigger the capacitor, the smaller $S$; and the higher the AC frequency, the
smaller $S$ (a hint of why switching supplies, which rectify at tens of kHz, get by
with small capacitors).

::: explore Sizing a capacitor filter (bridge, 50 Hz)
slider U2: 5 .. 30 = 20 | V
slider RL: 10 .. 2k = 200 | Ω | log
slider C: 47 .. 4700 = 250 | µF | log
T = 20 | ms | Mains period
tau = RL C / 1000 | ms | Time constant R_L C
ratio = tau / (T/2) | | R_L C in half-periods (aim for 3–5)
UOmax = sqrt(2) U2 | V | Peak, U_OMAX
UO = UOmax (1 - T/(4 tau)) | V | Average output U_O(AV)
S = T / (4 tau - T) | | Ripple factor
:::

::: example Sizing the capacitor for a 20 V bridge
A bridge rectifier has $U_2 = 20$ V at 50 Hz and feeds $R_L = 200$ Ω through a
capacitor filter. Choose $C$ for $R_LC = 5\cdot T/2$, then estimate the output, the
ripple factor and the ratings.
== Capacitance ==
$T = 20$ ms, so $R_LC \ge 5 \times 10 = 50$ ms and $C \ge 50\ \text{ms}/200\ \Omega = 250$ µF.
Take the next standard value up, 330 µF (or use 250 µF in the sums).
== Output ==
With exactly 250 µF: $U_{O(AV)} = 28.3\,(1 - 20/200) \approx 25.5$ V. The design rule
$1.2U_2$ gives 24 V; the difference is the diode drops and transformer resistance the
formula ignores.
== Ripple ==
$S = 20/(200 - 20) \approx 0.11$, against 0.67 without the capacitor.
== Ratings ==
Load current $I_L \approx 24/200 = 0.12$ A, so $I_{D(AV)} = 60$ mA, but choose
$I_F > (2\sim3) \times 0.12$ A, so at least 0.36 A: a 1 A diode such as the 1N4001.
Diode reverse voltage and capacitor voltage rating: above $1.1\sqrt2 \times 20 \approx 31$ V,
so a 35 V or 50 V capacitor.
:::

### The output and filter characteristics

How does the capacitor filter cope when the load current changes? Substitute
$R_L = U_{O(AV)}/I_O$ into the average and the formula becomes a straight line in
$I_O$:

$$U_{O(AV)} \approx \sqrt2U_2 - \frac{T}{4C}\,I_O$$

::: define Output characteristic of a supply | 外特性
The curve of a rectifier-filter's average output voltage $U_{O(AV)}$ against its
output current $I_O$: how much the output drops as the load draws more.
:::

The capacitor filter starts at $\sqrt2U_2$ with no load and drops quickly as $I_O$
grows, more steeply for a smaller $C$, until with a very heavy load it has hardly
any effect and the output approaches the unfiltered $0.9U_2$. Its
{{term load-driving capability | 带负载能力}} is poor.

::: plot Output characteristics of the filters (U₂ = 20 V, 50 Hz)
x: 0 .. 2
xlabel: I_O (A)
ylabel: U_O(AV) (V)
capacitor(I) = max(sqrt(2) U2 - 5000 I / C, 0.9 U2)
halfC(I) = max(sqrt(2) U2 - 10000 I / C, 0.9 U2)
inductor(I) = 0.9 U2 - R I
none(I) = 0.9 U2
slider U2: 5 .. 30 = 20 | V
slider C: 100 .. 4700 = 1000 | µF | log
slider R: 0 .. 5 = 1 | Ω
:::

(The first curve uses the slider's $C$, the second half of it; $5000I/C$ is
$TI/(4C)$ with $T = 20$ ms and $C$ in µF. The inductor curve is explained below.)

::: define Filter characteristic | 滤波特性
The curve of the ripple factor $S$ against the output current $I_O$, for given
filter parts.
:::

For the capacitor filter, $S$ rises with $I_O$ (a smaller $R_L$ discharges $C$
faster) and rises when $C$ is made smaller. So:

::: callout key Where the capacitor filter fits
The capacitor filter is simple and gives a high output ($\approx 1.2U_2$), but its
output drops and its ripple grows as the load current rises. Use it for small or
steady load currents.
:::

### Faults in a bridge with a capacitor filter

A voltmeter on the output tells you a lot about what's happening inside. This is the
slides' in-class discussion (讨论), with $U_2 = 10$ V and a large capacitor.

::: example What does the meter read?
A bridge rectifier with a capacitor filter has $U_2 = 10$ V, a large $C$ and a load
$R_L$. Estimate $U_{O(AV)}$ when (1) it works normally, (2) $C$ is open, (3) $R_L$ is
open, (4) D1 and $C$ are both open, (5) D1 alone is open.
== Normal ==
Bridge plus capacitor: $U_{O(AV)} \approx 1.2U_2 = 12$ V.
== C open ==
No filter, plain full-wave: $0.9U_2 = 9$ V.
== Load open ==
Nothing discharges the capacitor: $\sqrt2U_2 \approx 14.1$ V.
== D1 and C open ==
With one arm missing the bridge passes only one half-cycle, and there's no filter:
a half-wave output, $0.45U_2 = 4.5$ V.
== D1 open ==
Half-wave rectifier with a capacitor filter. Now the capacitor recharges only once
per period $T$, so it sags for twice as long: about
$\sqrt2U_2(1 - T/(2R_LC))$, which for $R_LC$ between $3T/2$ and $5T/2$ is 9.4–11.3 V.
The usual answer is $U_{O(AV)} \approx U_2 = 10$ V.
:::

::: callout exam For the exam
"The meter reads 28 V / 24 V / 18 V / 9 V; what's wrong?" is a classic (workbook
10-1 in lesson 4 is one). Match the reading to $\sqrt2U_2$ (load open), $1.2U_2$
(normal), $0.9U_2$ (capacitor open) or $0.45U_2$ (a diode and the capacitor open).
:::

## The inductor filter

An inductor in series with the load fights every change of current: when the current
tries to rise, the inductor's {{term induced EMF | 感应电势}} pushes back; when it
tries to fall, the EMF keeps it going. Its DC resistance is small but its AC
impedance $\omega L$ is large, so most of the ripple voltage drops across $L$ and
the DC reaches the load.

::: circuit Bridge rectifier with an inductor filter
A1 8,4 4,4 u2
D1 4,4 4,0
D4 4,8 4,4
D2 8,4 8,0
D3 8,8 8,4
W 4,0 8,0 10,0
L1 10,0 14,0 L
W 4,8 8,8 14,8
R1 14,0 14,8 RL
G 14,8
label uO' 10,0
label uO 14,0
:::

::: define Inductor filter | 电感滤波电路
A filter made of an inductor in series between the rectifier and the load. The
inductor's large AC impedance takes most of the ripple, its small DC resistance
loses little of the DC, and because its current is continuous each bridge diode
conducts for a full half-cycle ($\theta = 180°$).
:::

The rectifier's output $u_O'$ is still the full-wave humps; the inductor takes the
AC part of them. The load current becomes nearly constant, $I_O$ with a small
ripple. Because the current never stops, each diode pair conducts for its full half
cycle: the conduction angle is back to $\theta = 180°$, and there are no current
spikes.

::: formula Inductor filter output | 电感滤波输出电压平均值
$$U_{O(AV)} = \frac{R_L}{R + R_L}\cdot 0.9\,U_2$$
--
U_{O(AV)} | average output voltage | V
R | DC (winding) resistance of the inductor | Ω
R_L | load resistance | Ω
U_2 | RMS secondary voltage | V
:::

The DC part of $u_O'$ is $0.9U_2$ (the bridge's average); the inductor's resistance
$R$ and the load just divide it. With an ideal inductor ($R = 0$) the output is
$0.9U_2$, and the load current is $I_O = 0.9U_2/R_L$.

::: callout note The slide's label for the current
The slide gives $I_{O(AV)} = 0.9U_2/R_L$ under the heading "diode average forward
current". That expression is the load's average current (for an ideal inductor).
Each diode still conducts every other half-cycle, so a diode carries half of it:
$I_{D(AV)} = I_O/2$.
:::

How well it smooths depends on the ratio $\omega L/R_L$, so the inductor filter
works *better* as the load current grows (smaller $R_L$): the opposite of the
capacitor. Its output characteristic is almost flat, falling only by $R I_O$ (the
"inductor" curve in the plot above; move $R$), and its ripple factor starts at the
bare bridge's 67 % with no load and falls as $I_O$ rises.

::: example An inductor filter
A bridge with $U_2 = 20$ V feeds $R_L = 20$ Ω through an inductor of DC resistance
$R = 5$ Ω. Find the output voltage and the load current.
== Output ==
$U_{O(AV)} = \dfrac{20}{5 + 20}\times 0.9 \times 20 = 0.8 \times 18 = 14.4$ V.
== Current ==
$I_O = 14.4/20 = 0.72$ A; each diode carries $0.36$ A on average.
== Note ==
5 Ω is a lot for a choke: a real one would lose less. But it shows why large
currents need an inductor with a low winding resistance.
:::

## Comparing the filters

| | Capacitor filter | Inductor filter |
| --- | --- | --- |
| Connection | $C$ across the load | $L$ in series with the load |
| $U_{O(AV)}$ | $\approx 1.2U_2$ (up to $\sqrt2U_2$ unloaded) | $\le 0.9U_2$ |
| As $I_O$ rises | output drops quickly, ripple grows | output nearly constant, ripple falls |
| Diode conduction angle | $\theta < \pi$: current spikes | $\theta = \pi$: no spikes |
| Suits | small, steady load currents | large and changing load currents |
| Drawbacks | surge currents in the diodes | heavy, bulky inductor; lower output |

::: callout tip Combining them
Not on the slides, but worth knowing: practical supplies often use both, an inductor
in series followed by a capacitor across the load (an LC filter), or a capacitor, an
inductor and another capacitor (a π filter), to get the smoothness of one and the
current handling of the other.
:::

## Voltage doublers and multipliers

Sometimes you need a high DC voltage at a small current: a few hundred volts for a
display, kilovolts for a photomultiplier or an X-ray tube. A transformer with a huge
secondary is expensive. Instead, diodes and capacitors can stack the secondary's
peak on top of itself.

::: define Voltage-multiplier rectifier | 倍压整流电路
A rectifier of diodes and capacitors in which each half-cycle charges one capacitor
from the secondary plus the voltage already on another, so the output reaches two
(or more) times the secondary's peak $\sqrt2U_2$. It suits high voltages at small
load currents.
:::

### The voltage doubler

::: circuit Voltage doubler (load open)
A1 0,6 0,0 u2
W 0,0 4,0 8,0
D1 4,0 4,6
C1 0,6 4,6 C1
D2 4,6 8,6
C2 8,0 8,6 C2
label A 0,0
label B 0,6
label P 4,6
label N 8,6
:::

Two simplifications make it easy: assume the load is open, and look at the steady
state (after the first few cycles).

- **Positive half-cycle** (A positive): current flows A → D1 → P → C1 → B. $C_1$
  charges to the peak of the secondary, with P positive: $U_{C1} = \sqrt2U_2$.
- **Negative half-cycle** (B positive): now the secondary and the charged $C_1$ are
  in series, adding up. Current flows B → C1 → P → D2 → N → C2 → A, and $C_2$
  charges to the sum of the two: $U_{C2} = \sqrt2U_2 + \sqrt2U_2 = 2\sqrt2U_2$, with N
  positive.

::: formula Voltage doubler | 二倍压整流
$$U_{C1} = \sqrt2\,U_2, \qquad U_{O} = U_{C2} = 2\sqrt2\,U_2$$
--
U_{C1} | voltage on the first capacitor | V
U_{C2} | voltage on the output capacitor, the doubler's output | V
U_2 | RMS secondary voltage | V
:::

The output is taken across $C_2$: in this drawing its lower end N is the positive
one (the slide marks it in colour).

::: example A doubler from a 100 V secondary
A doubler like the one above runs from $U_2 = 100$ V. Find the capacitor voltages
and each diode's maximum reverse voltage.
== Capacitors ==
$U_{C1} = \sqrt2 \times 100 \approx 141$ V; $U_{C2} = 2 \times 141 \approx 283$ V.
== D1 ==
Take B as 0 V. P sits at +141 V (the charge on $C_1$). At the negative peak A is at
−141 V, so D1 (anode A, cathode P) has $141 + 141 = 283$ V reverse across it.
== D2 ==
N is 283 V above A. At the positive peak A is at +141 V, so N is at 424 V while P is
at 141 V: D2 has $283$ V reverse across it.
== Lesson ==
Each diode and capacitor must be rated for $2\sqrt2U_2$, and the output sags as soon
as the load draws much current, because the capacitors only top up once a cycle.
:::

### Multipliers

Keep going: add more diode–capacitor stages, each one pumped by the stage before.
In the four-stage circuit below, the capacitors on the top row ($C_1$, $C_3$) are
"pumped" by the secondary and the ones on the bottom row ($C_2$, $C_4$) hold the
results.

::: circuit Voltage quadrupler (load open)
A1 0,6 0,0 u2
C1 0,0 4,0 C1
W 4,0 8,0
C3 8,0 12,0 C3
W 12,0 16,0
W 0,6 4,6
C2 4,6 8,6 C2
W 8,6 12,6
C4 12,6 16,6 C4
D1 4,6 4,0
D2 8,0 8,6
D3 12,6 12,0
D4 16,0 16,6
label X1 4,0
label X2 12,0
label Y0 0,6
label Y1 8,6
label Y2 16,6
:::

With $U_m = \sqrt2U_2$ (the secondary's peak), in steady state $C_1$ holds $U_m$ and
$C_2$, $C_3$, $C_4$ each hold $2U_m$. Measured from the secondary's lower end
(Y0), the bottom row gives $2U_m$ at Y1 and $4U_m$ at Y2; measured from its upper
end, the top row gives $U_m$ at X1 and $3U_m$ at X2. Choosing where to take the
output gives $U_m$, $2U_m$, $3U_m$ or $4U_m$.

| Stage | Capacitor | Its voltage | Output available |
| --- | --- | --- | --- |
| 1 | $C_1$ | $U_m$ | $U_m$ (top, X1) |
| 2 | $C_2$ | $2U_m$ | $2U_m$ (bottom, Y1) |
| 3 | $C_3$ | $2U_m$ | $3U_m$ (top, X2) |
| 4 | $C_4$ | $2U_m$ | $4U_m$ (bottom, Y2) |

::: cards Smoothing filters and multipliers
Where does a filter capacitor go, and where does a filter inductor go? :: Capacitor in parallel with the load; inductor in series with it.
Capacitor filter design rule? :: $\tau_d = R_LC \ge (3\sim5)\,T/2$, with $T$ the mains period.
$U_{O(AV)}$ of a bridge with a capacitor filter? :: $\approx 1.2U_2$ (normal load); $\sqrt2U_2$ with no load.
Capacitor filter average (sawtooth estimate)? :: $U_{O(AV)} = \sqrt2U_2\left(1 - \frac{T}{4R_LC}\right)$
Capacitor filter ripple factor? :: $S = \frac{T}{4R_LC - T}$: bigger $C$ or higher frequency, smaller $S$.
Conduction angle with a capacitor filter? :: $\theta < \pi$, smaller as $R_LC$ grows; the diode current comes in tall narrow pulses.
Diode rating rule with a capacitor filter? :: Maximum average rectified current $I_F$ 2–3 times the load current.
Output characteristic (外特性)? :: $U_{O(AV)}$ against $I_O$; the capacitor filter's falls quickly with load.
Inductor filter output? :: $U_{O(AV)} = \frac{R_L}{R+R_L}\,0.9U_2$, with $R$ the inductor's DC resistance; $\theta = 180°$.
Which filter for large, changing load currents? :: The inductor filter; the capacitor filter suits small, steady currents.
Voltage doubler output? :: $2\sqrt2U_2$ (with $U_{C1} = \sqrt2U_2$).
Multiplier capacitor voltages? :: The first holds $U_m$, every later one $2U_m$; outputs $U_m$, $2U_m$, $3U_m$, $4U_m$…
:::

::: quiz Check yourself
? A bridge rectifier with a capacitor filter runs on 50 Hz and feeds $R_L = 100$ Ω. What's the smallest $C$ that meets $R_LC \ge 5\cdot T/2$?
answer: 500 µF
tolerance: 1%
> $T/2 = 10$ ms, so $R_LC \ge 50$ ms and $C \ge 0.05/100 = 500$ µF.

? A bridge with a capacitor filter has $U_2 = 15$ V and a normal load. Roughly what average output voltage do you expect?
answer: 18 V
tolerance: 3%
> $U_{O(AV)} \approx 1.2U_2 = 18$ V.

? The same circuit with its load disconnected: what's the output now?
answer: 21.2 V
tolerance: 2%
> No discharge path, so the capacitor stays at the peak: $\sqrt2 \times 15 \approx 21.2$ V.

? Using the sawtooth estimate, write $U_{O(AV)}$ of the capacitor filter in terms of the peak $U_m$, the period $T$, and $R_L$ and $C$.
expression: Um (1 - T/(4 RL C))
variables: Um, T, RL, C
> The output falls along a line of slope $U_m/(R_LC)$ for $T/2$, a drop of $U_mT/(2R_LC)$; the average is the peak minus half the drop: $U_m(1 - T/(4R_LC))$.

? With $R_LC = 2.5T$ (that is, $5\cdot T/2$), what's the estimated ripple factor $S$?
answer: 0.11
tolerance: 5%
> $S = T/(4R_LC - T) = T/(10T - T) = 1/9 \approx 0.11$.

? Adding a filter capacitor to a bridge rectifier changes the diodes' current. Which statements are true?
- [x] The conduction angle becomes less than π.
- [x] The diode current flows in short, tall pulses.
- [ ] Each diode's average current doubles.
- [ ] The diodes now conduct for a full half-cycle each.
> The capacitor holds the voltage near the peak, so the diodes conduct only briefly before each peak ($\theta < \pi$), in tall pulses; their average current is still $I_L/2$. Conducting for a full half-cycle is what happens with an *inductor* filter.

? A bridge with $U_2 = 24$ V feeds $R_L = 30$ Ω through an inductor with 6 Ω of DC resistance. What's the average output?
answer: 18 V
tolerance: 2%
> $U_{O(AV)} = \frac{30}{6 + 30} \times 0.9 \times 24 = \frac{5}{6} \times 21.6 = 18$ V.

? Which filter suits a load that draws a large, varying current?
- [x] An inductor filter
- [ ] A capacitor filter
> The capacitor filter's output falls and its ripple grows as the current rises; the inductor filter's output is nearly flat and its smoothing improves with current.

? A voltage doubler runs from a secondary of $U_2 = 50$ V. What's its no-load output?
answer: 141 V
tolerance: 2%
> $U_O = 2\sqrt2U_2 = 2 \times 1.414 \times 50 \approx 141$ V.

? In a bridge with a capacitor filter ($U_2 = 10$ V), the meter reads 9 V. What's most likely wrong?
- [x] The filter capacitor is open (disconnected)
- [ ] The load is open
- [ ] One diode and the capacitor are open
- [ ] Nothing: it's working normally
> 9 V is $0.9U_2$, the bare full-wave output, so the capacitor isn't doing anything. Load open would give 14.1 V, one diode and the capacitor open 4.5 V, and normal operation about 12 V.
:::

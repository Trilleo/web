---
title: The diode and its models
zh: 二极管及其模型
summary: How a diode is built, its V–I characteristic and equation, breakdown, its ratings, and the four models used to analyse diode circuits.
source: 第2章 半导体二极管及其基本应用电路（2.4.1–2.4.4）, 2026-09-03
---

A {{term diode | 二极管}} is a PN junction with two leads and a case. The last lesson
explained *why* it conducts one way only; this one describes *how much* it conducts:
its curve, its equation, the limits on its datasheet, and — most useful in practice —
the simplified models that let you analyse a diode circuit with nothing but Ohm's law.
Choosing the right model for the job is a skill the exams test directly.

## How diodes are built

A diode has two terminals: the {{term anode | 阳极}}, connected to the P side, and the
{{term cathode | 阴极}}, connected to the N side. In the symbol, the triangle points the
way conventional current flows when it conducts (anode → cathode), and the bar is the
cathode.

The slides show three ways of making the junction:

| Type | How it's made | Junction area | Good for |
|---|---|---|---|
| {{term Point-contact | 点接触型}} | A fine metal wire pressed onto an N-type germanium chip | Tiny | Small currents, high frequencies (detectors, like the phone detector's 1N34) |
| {{term Junction (area-contact) | 面接触型}} | An aluminium-alloy bead fused onto N-type silicon; the PN junction forms at the interface | Large | Large currents, low frequencies (rectifiers) |
| {{term Planar | 平面型}} | P-type silicon diffused into N-type silicon under an SiO₂ protective layer | Small to large, chosen by design | Switching diodes and integrated circuits |

The trade-off follows from the last lesson: a large junction area carries a large
current, but it also has a large junction capacitance, which slows the diode down. A
tiny point contact carries little current but has almost no capacitance.

::: callout tip Point-contact = low power, high frequency
Small area → small current (low power) *and* small capacitance (high frequency). A
point-contact diode is a low-power, high-frequency device (小功率高频管).
:::

## The V–I characteristic

To see how a diode behaves, put it in the simplest test circuit: an adjustable source
$E$, a resistor $R$ to limit the current, and the diode. Vary $E$, and record the
current $i_D$ through the diode against the voltage $u_D$ across it (anode +).

::: circuit Test circuit for the diode's V–I characteristic
V1 0,4 0,0 E
R1 0,0 4,0 R
D1 4,0 4,4 D
W 0,4 4,4
G 0,4
label uD 4,0
:::

::: define V–I characteristic | 伏安特性
The relation between the current $i_D$ through a device and the voltage $u_D$ across it,
usually drawn as a curve (特性曲线). For a diode it is very different in the forward and
reverse directions.
:::

### The forward characteristic

Raise $u_D$ from zero and, at first, almost nothing happens: the barrier still holds
the majority carriers back. This flat start is the {{term dead zone | 死区}}. Only past
the {{term turn-on voltage | 开启电压}} $U_{th}$ does a noticeable current appear, and
from there it rises very steeply — exponentially at first, then almost as a straight
line when the current is large.

::: define Turn-on voltage | 开启电压
The forward voltage $U_{th}$ (also written $U_{th(on)}$) at which a diode's forward
current starts to become noticeable; below it is the dead zone. About 0.5 V for silicon
and 0.1 V for germanium.
:::

Once a silicon diode is conducting a useful current, its voltage stays in a narrow band,
about 0.6–0.8 V (germanium 0.1–0.3 V). That is why "a conducting silicon diode drops
about 0.7 V" is such a useful rule.

### The reverse characteristic

Make $u_D$ negative and only the tiny drift current of minority carriers flows: the
{{term reverse saturation current | 反向饱和电流}} $I_S$. It hardly changes as the reverse
voltage grows. Silicon and germanium differ here:

- **silicon**: a very small reverse current (nanoamps), and a "hard", steep breakdown;
- **germanium**: a much larger reverse current (microamps), and a "soft" breakdown
  that bends over gradually.

Both are explained by the first lesson: germanium has about a thousand times more
minority carriers.

### Breakdown

Push the reverse voltage far enough and, at the {{term breakdown voltage | 击穿电压}}
$U_{BR}$, the reverse current suddenly shoots up: {{term reverse breakdown | 反向击穿}}.
There are two mechanisms.

::: define Avalanche breakdown | 雪崩击穿
Breakdown in a wide depletion layer (lightly doped junctions): carriers swept across by
the strong field gain enough energy to knock electrons out of bonds, the new carriers do
the same, and the number of carriers multiplies like an avalanche. In silicon it
dominates when $|U_{BR}| \ge 7$ V.
:::

::: define Zener breakdown | 齐纳击穿
Breakdown in a very narrow depletion layer (heavily doped junctions): even a few volts
make the field so strong that it pulls electrons straight out of their bonds. In
silicon it dominates when $|U_{BR}| \le 4$ V; between 4 and 7 V both mechanisms occur.
:::

Breakdown itself doesn't destroy a diode; overheating does. If the current is limited,
the diode recovers when the voltage is removed — and the Zener diode of lesson 4 is
designed to work there all the time.

### The diode equation

The whole curve up to breakdown is described by one equation, derived from the physics
of the PN junction.

::: formula Diode equation | 二极管伏安特性方程
$$i_D = I_S\left(e^{u_D/U_T} - 1\right)$$
--
i_D | current through the diode, anode to cathode | A
u_D | voltage across the diode, anode + | V
I_S | reverse saturation current | A
U_T | thermal voltage (below) | V
:::

::: formula Thermal voltage | 温度的电压当量
$$U_T = \frac{kT}{q} \approx 26\ \text{mV at } T = 300\ \text{K}$$
--
U_T | thermal voltage | V
k | Boltzmann's constant, $1.38\times10^{-23}$ | J/K
T | absolute temperature | K
q | electron charge, $1.60\times10^{-19}$ | C
:::

Read the equation in both directions:

- **Forward**, $u_D \gg U_T$ (more than about 0.1 V): the $-1$ is negligible and
  $i_D \approx I_S e^{u_D/U_T}$, an exponential. Every extra
  $U_T \ln 10 \approx 60$ mV multiplies the current by ten.
- **Reverse**, $u_D \ll -U_T$: the exponential vanishes and $i_D \approx -I_S$, the
  small constant reverse current.

$I_S$ is tiny for silicon (around $10^{-14}$ A for a small diode) — which is exactly why
the current only becomes visible at about 0.5–0.6 V. Move the sliders: a larger $I_S$
(more like germanium) moves the knee to the left; $U_T$ (the temperature) changes how
sharp it is.

::: plot The diode equation
x: -0.2 .. 0.8
y: -1 .. 10
xlabel: u_D (V)
ylabel: i_D (mA)
i(u) = 1000 Is (exp(u/UT) - 1)
slider Is: 1e-15 .. 1e-8 = 1e-14 | A | log
slider UT: 0.020 .. 0.035 = 0.026 | V
:::

::: callout note The equation and the real curve
The equation leaves out breakdown, and for large forward currents the real curve bends
over towards a straight line, because the silicon itself has some resistance. The
slides' "with large current the curve is fairly linear" is that effect.
:::

::: example Reading the diode equation
A silicon diode has $I_S = 1.0\times10^{-14}$ A; take $U_T = 26$ mV. Find $i_D$ at
$u_D = 0.6$ V and 0.7 V, and at $u_D = -5$ V.
== At 0.6 V ==
$u_D/U_T = 0.6/0.026 = 23.08$, so
$i_D \approx 10^{-14} e^{23.08} \approx 10^{-14} \times 1.05\times10^{10} \approx 0.11$ mA.
== At 0.7 V ==
$u_D/U_T = 26.92$, so $i_D \approx 10^{-14} \times 4.9\times10^{11} \approx 4.9$ mA:
about 47 times more for 0.1 V more.
== At −5 V ==
$e^{-5/0.026}$ is practically 0, so $i_D \approx -I_S = -10^{-14}$ A. A real diode leaks
more than this (nanoamps) through its surface, but it is still effectively zero.
:::

::: callout pitfall The two currents with "S" and "R"
$I_S$ is the reverse saturation current in the equation (a physics constant of the
junction); $I_R$ is the reverse current measured on a real diode below breakdown (a
datasheet value, larger than $I_S$). Both are "the reverse current", but don't mix them
up in formulas.
:::

## The main parameters

A datasheet lists the limits a diode must be kept within. The slides list four.

::: define Maximum rectified current | 最大整流电流
$I_F$: the largest **average** forward current the diode can carry continuously over a
long time without overheating.
:::

::: define Maximum reverse working voltage | 最大反向工作电压
$U_{RM}$: the largest reverse voltage the diode can safely withstand in use. It is
usually about half the breakdown voltage, $U_{RM} \approx \tfrac12 U_{BR}$, to leave a
safety margin.
:::

::: define Reverse current | 反向电流
$I_R$: the diode's reverse current before breakdown. Nanoamps for silicon, microamps for
germanium; the smaller $I_R$, the better the diode's one-way conduction. It rises
quickly with temperature.
:::

::: define Maximum operating frequency | 最高工作频率
$f_M$: the highest frequency at which the diode still works properly. It is set by the
junction capacitance; above $f_M$ the capacitance lets current through in both
directions and one-way conduction gets worse.
:::

::: example Reading a rating
A rectifier diode breaks down at $U_{BR} = 100$ V. Roughly what reverse voltage should
it be used up to? And if $I_F = 1$ A, may it carry a current that peaks at 2 A but
averages 0.6 A?
== Reverse voltage ==
$U_{RM} \approx U_{BR}/2 = 50$ V.
== Current ==
$I_F$ limits the **average** forward current: 0.6 A < 1 A, so yes, as far as this
rating goes (short peaks have their own rating on a datasheet).
:::

## Equivalent models

The diode equation is exact but awkward: an exponential in a circuit means solving a
nonlinear equation. For most circuits that is overkill. Instead we replace the diode by
an {{term equivalent model | 等效模型}} made of ideal parts — switches, batteries,
resistors — chosen to be just accurate enough.

### The ideal model

::: define Ideal diode | 理想二极管
A diode model with zero forward voltage drop when conducting and infinite reverse
resistance (zero reverse current) when cut off. It is an ideal switch (理想开关): closed
when forward biased, open when reverse biased.
:::

Its characteristic is two straight lines: the vertical $i_D$ axis (any current, zero
voltage) and the negative $u_D$ axis (any reverse voltage, zero current). Use it when
the signals are much larger than the diode's 0.7 V, so the drop doesn't matter — say a
rectifier fed with tens of volts.

### The constant-voltage-drop model

::: define Constant-voltage-drop model | 恒压降模型
A diode model whose forward voltage is a constant $U_D$ when conducting, with infinite
reverse resistance and zero reverse current: an ideal diode in series with a constant
voltage source $U_D$ (恒压源). For silicon $U_D = 0.7$ V (germanium about 0.2 V).
:::

Its characteristic is zero current up to $U_D$, then a vertical line at $U_D$. This is
the model you will use most: in almost every diode circuit, "conducting" means "0.7 V
across it".

### The piecewise-linear model

The vertical line of the last model says the voltage never changes, but the real curve
does slope. The {{term piecewise-linear model | 折线化模型}} replaces the curve by two
straight lines: zero current up to $U_{th}$, then a sloped line.

::: define Piecewise-linear model | 折线化模型
A diode model with zero current below the turn-on voltage $U_{th}$, and above it a
straight line from $(U_{th}, 0)$ through a chosen point $Q(U_D, I_D)$ on the real curve:
an ideal diode in series with a source $U_{th}$ and a resistance $r_D$.
:::

::: formula Piecewise-linear model resistance | 折线化模型电阻
$$r_D = \frac{U_D - U_{th}}{I_D}, \qquad u_D = U_{th} + r_D\, i_D \ \ (i_D > 0)$$
--
r_D | slope resistance of the model's straight line | Ω
U_D, I_D | voltage and current at the chosen point Q | V, A
U_{th} | turn-on voltage | V
:::

Drag the sliders to fit the straight line to the exponential: it can only match well
near the point you choose.

::: plot Piecewise-linear model against the real curve
x: 0 .. 0.9
y: 0 .. 10
xlabel: u_D (V)
ylabel: i_D (mA)
real(u) = 1000e-14 (exp(u/0.026) - 1)
model(u) = max(0, (u - Uth) / rD) 1000
slider Uth: 0.4 .. 0.7 = 0.6 | V
slider rD: 5 .. 100 = 20 | Ω
:::

::: callout pitfall r_D is not r_d
The slides stress this: $r_D$ is the slope of a **chord** from $(U_{th}, 0)$ to Q, not of
the **tangent** at Q, so it is *not* the dynamic resistance $r_d$ of the next section.
And the piecewise-linear model isn't fixed: change Q and you get a different line.
:::

Since this model is made only of linear parts once the diode conducts, a circuit
simulator can show it. Here a 0.6 V source and $r_D = 20$ Ω stand for the conducting
diode (valid only while the source is above $U_{th}$, so the diode really is on):

::: circuit-sim A source, a resistor and a conducting diode (piecewise-linear model)
V1 0,4 0,0 5V [1..12]
R1 0,0 4,0 1k [100..5k]
R2 4,0 4,2 20 [1..100]
V2 4,4 4,2 0.6V [0.4..0.8]
W 0,4 4,4
G 0,4
label anode 4,0
:::

### The small-signal model

Now a different question. Suppose a diode already carries a steady current, and a small
signal (a few millivolts) is added. How much does the diode's voltage wiggle? Near the
operating point, a tiny piece of the curve is practically straight, so the diode acts
like a resistor for the small changes — with the resistance given by the slope of the
**tangent** there.

::: define Operating point | 静态工作点
The point $Q(U_D, I_D)$ on a device's characteristic where it sits with only the DC
(bias) voltages and currents applied, before any signal; also called the quiescent
point.
:::

::: define Dynamic resistance | 动态电阻
The resistance $r_d$ a diode presents to small changes of voltage and current around its
operating point: the reciprocal of the slope of its characteristic at Q. It is an AC
parameter and depends on where Q is.
:::

::: formula Dynamic resistance of a diode | 二极管动态电阻
$$r_d = \frac{\Delta u_D}{\Delta i_D}\bigg|_Q \approx \frac{U_T}{I_D}$$
--
r_d | dynamic (small-signal) resistance at Q | Ω
\Delta u_D, \Delta i_D | small changes of voltage and current around Q | V, A
I_D | DC current at the operating point | A
U_T | thermal voltage, about 26 mV at room temperature | V
:::

Where does $U_T/I_D$ come from? Differentiate the diode equation:

$$\frac{1}{r_d} = \frac{\d i_D}{\d u_D} = \frac{\d}{\d u_D}\left[I_S\left(e^{u_D/U_T}-1\right)\right] = \frac{I_S e^{u_D/U_T}}{U_T} \approx \frac{I_D}{U_T}$$

because in forward bias $I_S e^{u_D/U_T} = I_D + I_S \approx I_D$. So $r_d$ is set by the
current alone: 26 Ω at 1 mA, 2.6 Ω at 10 mA, 2.6 kΩ at 10 μA.

::: define Small-signal model | 小信号模型
A model of a diode for small changes around a given operating point: the resistance
$r_d$ alone. It gives only the changes (the AC part) of $u_D$ and $i_D$, never their DC
values.
:::

::: callout key Always find Q first
"注意，一定要先提供一个工作点Q！！！" — the slides' warning. $r_d$ depends on $I_D$, so
the small-signal model is meaningless until you have found the DC operating point with
one of the other models. The recipe: (1) set the signal to zero and find $I_D$;
(2) compute $r_d = U_T/I_D$; (3) put $r_d$ in place of the diode and solve for the
signal alone.
:::

::: explore Dynamic resistance and the signal across a diode
slider U: 0.8 .. 12 = 1 | V
slider R: 100 .. 1k = 300 | Ω
slider us: 0.001 .. 0.05 = 0.01 | V
ID = (U - 0.7) / R | A | DC current (constant-drop model)
rd = 0.026 / ID | Ω | Dynamic resistance
ud = us rd / (R + rd) | V | Signal amplitude across the diode
:::

### Choosing a model

| Model | The diode is replaced by | Use it when |
|---|---|---|
| Ideal | A switch | Signals are much larger than 0.7 V |
| Constant drop | A switch + a 0.7 V source | Most DC calculations |
| Piecewise linear | A switch + $U_{th}$ + $r_D$ | The drop's change with current matters |
| Small signal | $r_d = U_T/I_D$ | Small AC signals around a known Q |

::: example DC voltage across a diode for three supply voltages
In the circuit below, $u_s = 0$ and the silicon diode follows the constant-drop model
(turn-on about 0.5 V, conducting drop 0.7 V). Find $u_D$ for $U = 0.3$ V, 1 V and 10 V.

::: circuit A DC source and a small signal driving a diode through R
A1 0,3 0,0 us
V1 0,6 0,3 U
R1 0,0 4,0 R
D1 4,0 4,6 D
W 0,6 4,6
G 0,6
label uD 4,0
:::

== U = 0.3 V ==
0.3 V is below the turn-on voltage: the diode is off, no current flows, so nothing drops
across $R$ and the whole 0.3 V appears across the diode: $u_D = 0.3$ V.
== U = 1 V and 10 V ==
Both are well above the turn-on voltage, so the diode conducts and holds
$u_D \approx 0.7$ V; the rest drops across $R$.
== Answer ==
$u_D = 0.3$ V, 0.7 V, 0.7 V. (A tempting wrong answer is 0 for the first: an off diode
has no current, not no voltage.)
:::

::: example The signal across the diode
Same circuit, now with $u_s = 10\sin(2\pi f t)$ mV and $R = 300$ Ω. Find the amplitude of
the AC part of $u_D$ for $U = 0.3$ V, 1 V and 10 V ($U_T = 26$ mV).
== U = 0.3 V ==
The diode is off ($I_D \approx 0$, so $r_d \to \infty$). No current flows, so the whole
signal appears across the diode: 10 mV.
== U = 1 V ==
DC first: $I_D = (1 - 0.7)/300 = 1$ mA, so $r_d = 26\ \text{mV}/1\ \text{mA} = 26$ Ω.
The signal divides between $R$ and $r_d$:
$u_d = 10 \times \dfrac{26}{300 + 26} \approx 0.80$ mV, about 1 mV.
== U = 10 V ==
$I_D = (10 - 0.7)/300 = 31$ mA, $r_d = 26/31 \approx 0.84$ Ω, and
$u_d = 10 \times \dfrac{0.84}{300.8} \approx 0.028$ mV.
== What it shows ==
The more current a diode carries, the smaller its dynamic resistance and the less the
signal moves its voltage: about 10, 1 and 0.03 mV. The slides' option rounds these to
10, 1 and 0.026 mV.
:::

The slides confirm this with Multisim simulations of the same circuit using a 1N4001
diode and a 200 mV rms, 100 Hz signal:

- **Large bias** ($U = 2$ V, $R = 1.3$ Ω): the meter reads 0.832 A and the diode sits
  at about 0.92 V (check: $(2 - 0.92)/1.3 \approx 0.83$ A). At that current $r_d$ is a
  fraction of an ohm, so the oscilloscope shows the diode's voltage as an almost flat
  line: nearly all the signal is dropped across $R$.
- **Almost no bias** ($U = 0.1$ V, $R = 100$ Ω): only 8.56 μA flows, so
  $r_d \approx 26\ \text{mV}/8.56\ \mu\text{A} \approx 3$ kΩ, far more than $R$. The
  diode's voltage follows the source almost exactly.
- **Bias and signal kept apart**: a 2 V source biases the diode through 1.3 kΩ
  (about 1.13 mA DC, so $u_D \approx 2 - 1.13 \times 1.3 \approx 0.53$ V and
  $r_d \approx 23$ Ω), while a 30 mV rms signal is coupled in through two 1 mF
  capacitors and 13 Ω. The capacitors block DC, so the signal only sees the 13 Ω and
  $r_d$ (in parallel with 1.3 kΩ): the same voltage-divider picture.

::: callout exam What's typically asked
Find $u_D$ or a current with the constant-drop model (check first whether the diode is
on), then find $r_d = U_T/I_D$ and the small-signal response. Know that $r_D$ (chord) ≠
$r_d$ (tangent), and the rough numbers: Si turn-on 0.5 V, drop 0.7 V; Ge 0.1 V and
0.2 V; $U_T \approx 26$ mV.
:::

::: cards The diode and its models
Anode and cathode :: Anode = P side; cathode = N side (the bar in the symbol). Current flows anode → cathode when it conducts.
Point-contact diode is … :: Low power, high frequency (tiny junction area: small current, small capacitance).
Diode equation :: $i_D = I_S\left(e^{u_D/U_T} - 1\right)$
$U_T$ at room temperature :: $U_T = kT/q \approx 26$ mV
Turn-on voltage $U_{th}$: Si and Ge :: Si about 0.5 V, Ge about 0.1 V
Conducting drop: Si and Ge :: Si 0.6–0.8 V (use 0.7 V), Ge 0.1–0.3 V (use 0.2 V)
Avalanche vs Zener breakdown (Si) :: Avalanche when $|U_{BR}| \ge 7$ V; Zener when $|U_{BR}| \le 4$ V; both in between.
Diode rating $U_{RM}$ :: Maximum reverse working voltage, about half of $U_{BR}$.
Diode rating $I_F$ :: Maximum rectified current: the largest average forward current.
$f_M$ is set by … :: The junction capacitance.
Ideal model :: An ideal switch: no drop when on, no current when off.
Constant-drop model :: Ideal diode in series with $U_D$ (0.7 V for Si).
Piecewise-linear model :: Ideal diode + $U_{th}$ + $r_D$, the chord from $(U_{th},0)$ to Q; $r_D \ne r_d$.
Dynamic resistance :: $r_d = \Delta u_D/\Delta i_D|_Q \approx U_T/I_D$ (26 Ω at 1 mA)
Before using the small-signal model … :: Find the operating point Q (the DC current $I_D$) first.
:::

::: quiz The diode and its models
? A point-contact diode is a …
- [ ] high-power, low-frequency device
- [ ] low-power, low-frequency device
- [ ] high-power, high-frequency device
- [x] low-power, high-frequency device
> Its contact area is tiny: it can carry only a small current (low power), but its junction capacitance is also tiny, so it works up to high frequencies.

? In the circuit with $u_s = 0$, what are $u_D$ for $U = 0.3$ V, 1 V and 10 V (silicon, constant-drop model)?
- [ ] 0.3, 0, 0.7 V
- [ ] 0, 0.7, 0 V
- [x] 0.3, 0.7, 0.7 V
- [ ] 0, 0.7, 0.7 V
> At 0.3 V the diode is off: no current, no drop across $R$, so all 0.3 V is across the diode. At 1 V and 10 V it conducts at about 0.7 V.

? Same circuit, $u_s = 10\sin(2\pi f t)$ mV, $R = 300$ Ω. The AC part of $u_D$ for $U = 0.3$, 1 and 10 V is about … mV.
- [x] 10, 1, 0.026
- [ ] 10, 5, 1
- [ ] 0, 1, 0.026
- [ ] 10, 0.7, 0.7
> Off at 0.3 V: all 10 mV. At 1 V: $I_D = 1$ mA, $r_d = 26$ Ω, $10 \times 26/326 \approx 0.8 \approx 1$ mV. At 10 V: $I_D = 31$ mA, $r_d \approx 0.84$ Ω, about 0.028 mV.

? A diode carries a DC current of 2 mA. What is its dynamic resistance ($U_T = 26$ mV)?
answer: 13 Ω
tolerance: 2%
> $r_d \approx U_T/I_D = 26\ \text{mV}/2\ \text{mA} = 13$ Ω.

? Write the dynamic resistance of a diode in terms of the thermal voltage $U_T$ and the DC current $I_D$.
expression: U_T / I_D
variables: U_T, I_D
> Differentiating $i_D = I_S(e^{u_D/U_T}-1)$ gives $1/r_d = I_S e^{u_D/U_T}/U_T \approx I_D/U_T$.

? A silicon diode has $I_S = 10^{-14}$ A. What current flows at $u_D = 0.7$ V ($U_T = 26$ mV)?
answer: 4.9 mA
tolerance: 4%
> $i_D \approx I_S e^{u_D/U_T} = 10^{-14} \times e^{0.7/0.026} = 10^{-14} \times e^{26.92} \approx 4.9\times10^{-3}$ A.

? In the forward region, how much more voltage multiplies the diode current by ten (to the nearest mV, $U_T = 26$ mV)?
answer: 60 mV
tolerance: 2%
> $e^{\Delta u/U_T} = 10$ gives $\Delta u = U_T \ln 10 = 26 \times 2.303 \approx 60$ mV.

? A diode breaks down at 80 V. About what is its maximum reverse working voltage $U_{RM}$?
answer: 40 V
> $U_{RM} \approx U_{BR}/2 = 40$ V, leaving a safety margin.

? Which statements about the piecewise-linear model are true? (Choose all that apply.)
- [x] Its resistance $r_D$ is the slope of a chord, not a tangent
- [ ] $r_D$ is the same as the dynamic resistance $r_d$
- [x] It changes with the choice of the point Q
- [ ] It describes the reverse breakdown region
> The line runs from $(U_{th}, 0)$ to Q, a chord; $r_d$ is the tangent's slope at Q. Move Q and the line, so the model, changes. It says nothing about breakdown.

? Silicon diodes break down mainly by which mechanism when $|U_{BR}| \ge 7$ V?
text: avalanche | avalanche breakdown | 雪崩 | 雪崩击穿
> A wide depletion layer lets carriers gain enough energy to knock out more carriers: avalanche breakdown. Zener breakdown dominates below about 4 V.
:::

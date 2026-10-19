---
title: Semiconductors and the PN junction
zh: 半导体基础与PN结
summary: Why semiconductors conduct, how doping makes N-type and P-type material, and how joining the two gives the PN junction its one-way conduction and its capacitance.
source: 第2章 半导体二极管及其基本应用电路（2.1–2.3）, 2026-09-01 → 09-03
---

Every device in this course — diodes, transistors, the op-amps built from them — is
a piece of semiconductor crystal with carefully placed impurities. This lesson explains
what happens inside that crystal: where the moving charges come from, why adding a
tiny amount of impurity changes everything, and how putting two kinds of doped
material side by side makes a {{term PN junction | PN结}}, a structure that lets current
through in one direction only. The rest of the course is built on that one idea.

## From a real chip to the crystal inside

The course opens with a real part: the **LM324**, a 14-pin chip that holds four
{{term operational amplifiers | 运算放大器}} (op-amps). On a schematic each one is a
triangle with an {{term inverting input | 反相输入端}} (−), a
{{term non-inverting input | 同相输入端}} (+), an output, and two supply pins
($V+$ on pin 4, $V-$ on pin 11 for the whole chip).

Inside, each op-amp is a circuit of about twenty transistors, a few resistors and one
small capacitor (the slides show the classic textbook circuit: a differential input
pair, current mirrors as loads and bias sources, a gain stage and a push-pull output
stage). A hobby circuit from the slides uses just one of the four amplifiers as a
mobile-phone detector: an antenna and two germanium diodes pick up the phone's radio
bursts, the op-amp amplifies them, and a transistor switches on an LED and a buzzer.
It runs on 4.5–12 V.

You don't need to understand those circuits yet. The point is the direction of the
course: to understand the chip you have to understand the transistor, to understand
the transistor you have to understand the diode, and the diode is just a PN junction.
So we start with the material.

## What a semiconductor is

::: define Semiconductor | 半导体
A material whose ability to conduct lies between that of a {{term conductor | 导体}}
and an {{term insulator | 绝缘体}}, such as silicon (Si, 硅), germanium (Ge, 锗) and
gallium arsenide (GaAs, 砷化镓).
:::

"In between" is not what makes semiconductors useful. What matters is that their
conductivity **can be changed**, and changed a lot, by:

- **temperature** — warmer means more free charges; a {{term thermistor | 热敏电阻}}
  uses this;
- **light, magnetic and electric fields** — a {{term photoresistor | 光敏电阻}}
  uses light;
- **adding impurities** ({{term doping | 掺杂}}) — a few parts per million raise the
  conductivity enormously.

A copper wire always conducts and a piece of glass never does. A semiconductor can be
made to conduct in one place and not in the next, or conduct only when another signal
says so. That controllability is why diodes and transistors are made from
semiconductors and not from conductors or insulators.

## Intrinsic semiconductors

::: define Intrinsic semiconductor | 本征半导体
A semiconductor crystal that is completely pure and has no structural defects.
:::

Silicon and germanium atoms have four outer {{term valence electrons | 价电子}}. In the
crystal each atom shares one electron with each of its four neighbours, so every pair
of neighbours is held together by a shared pair of electrons, a
{{term covalent bond | 共价键}}. Picture a square grid of atoms (each drawn as a "+4"
core) with two dots on every link between them: that is the ordered
{{term crystal lattice | 晶格}} on the slides.

### Intrinsic excitation: electrons and holes

At absolute zero (0 K) every electron is locked in a bond, and the crystal is a perfect
insulator. Above 0 K the lattice vibrates, and now and then a valence electron gains
enough energy to break free.

::: define Intrinsic excitation | 本征激发
At temperatures above 0 K, some valence electrons escape their bonds and become free
electrons, each leaving behind a vacancy in its bond. This is how a pure semiconductor
produces charge carriers.
:::

The escaped electron is a {{term free electron | 自由电子}}: it wanders through the
crystal and carries current. The empty place it left is a {{term hole | 空穴}}. A hole
can move too: a neighbouring bound electron hops into it, so the vacancy is now where
that electron came from. A chain of such hops (the slides draw it A → B → C → D) looks
exactly like a positive charge moving the opposite way to the electrons.

::: define Hole | 空穴
The vacancy left in a covalent bond when a valence electron escapes. It behaves as a
movable positive charge, because bound electrons filling it one after another make the
vacancy travel through the crystal.
:::

So a semiconductor has two kinds of {{term charge carrier | 载流子}}: free electrons
(negative) and holes (positive). A metal has only free electrons.

::: callout pitfall A hole is not a moving proton
Nothing positive actually travels. Holes move because *bound* electrons move from bond
to bond. It is still far easier to track one "positive charge" than millions of bound
electrons, so we treat the hole as a particle.
:::

### Pairs, recombination and equilibrium

Excitation always makes an {{term electron-hole pair | 电子空穴对}}: one free electron
and one hole at the same moment. So in a pure crystal the two are **equal in number and
in concentration**.

The reverse also happens. When a wandering free electron meets a hole, it drops into
it and both disappear.

::: define Recombination | 复合
A free electron meeting a hole and filling it, so that both carriers disappear.
:::

Excitation creates pairs at a rate set by temperature; recombination removes them
faster the more of them there are. At a steady temperature the two rates balance:
a {{term dynamic equilibrium | 动态平衡}}, with a fixed number of carriers even though
individual pairs are constantly being born and destroyed.

::: law Intrinsic carrier balance | 本征载流子浓度
In an intrinsic semiconductor at a given temperature, the free-electron concentration
equals the hole concentration, and their product is a constant fixed by the material
and the temperature.
:::

::: formula Intrinsic carrier product | 本征载流子浓度积
$$n_i \cdot p_i = C(K), \qquad n_i = p_i$$
--
n_i | free-electron concentration in the intrinsic crystal | cm⁻³
p_i | hole concentration in the intrinsic crystal | cm⁻³
C(K) | a constant that depends on the material and on the temperature $K$ | cm⁻⁶
:::

The constant grows very steeply with temperature. It also depends on how tightly the
material holds its electrons: germanium's bonds are weaker than silicon's (a smaller
band gap, 0.66 eV against 1.12 eV), so at the same temperature germanium has far more
carriers. The plot shows roughly how many (on a logarithmic scale: each step of 1 on
the vertical axis is ten times more carriers).

::: plot Intrinsic carrier concentration against temperature (log scale)
x: 250 .. 450
xlabel: T (K)
ylabel: lg(nᵢ / cm⁻³)
Si(T) = 10 + 1.5 lg(T/300) - 2822 (1/T - 1/300)
Ge(T) = 13.38 + 1.5 lg(T/300) - 1663 (1/T - 1/300)
:::

At room temperature (300 K) silicon has about $10^{10}$ free electrons per cm³ and
germanium about $2\times10^{13}$, over a thousand times more. Silicon's number also
climbs by about ten times for every 30 K or so. Compare: silicon has about $5\times10^{22}$
atoms per cm³, so only about one atom in $10^{12}$ has lost an electron. A pure
semiconductor conducts very poorly.

::: example How rare are carriers in pure silicon?
Pure silicon at 300 K has $n_i \approx 1.0\times10^{10}\ \text{cm}^{-3}$ and about
$5.0\times10^{22}$ atoms per cm³. What fraction of atoms has given up an electron? What
is $p_i$, and the product $n_i p_i$?
== Fraction of atoms ==
$\dfrac{1.0\times10^{10}}{5.0\times10^{22}} = 2\times10^{-13}$: one atom in about
5 million million.
== Holes and the product ==
In a pure crystal every free electron left a hole, so $p_i = n_i = 1.0\times10^{10}\ \text{cm}^{-3}$
and $n_i p_i = 1.0\times10^{20}\ \text{cm}^{-6}$. That product stays the same at
300 K even after doping (next section): only how it is shared between electrons and
holes changes.
:::

## Doped semiconductors

Pure silicon conducts badly and its few carriers depend wildly on temperature. Doping
fixes both problems: we add a controlled, tiny amount of another element.

::: define Impurity semiconductor | 杂质半导体
A semiconductor with a small, controlled amount of another element added (doped) to
it. Also called a doped or extrinsic semiconductor.
:::

### N-type: adding pentavalent atoms

Replace a few silicon atoms with atoms that have **five** valence electrons, such as
phosphorus (P, 磷) or arsenic (As, 砷). Four of the five electrons form bonds with the
neighbours; the fifth has no bond to join and is so loosely held that at room
temperature it is practically always free. Each impurity atom *donates* one free
electron and is left as a fixed positive ion.

::: define N-type semiconductor | N型半导体
A semiconductor doped with pentavalent atoms (P, As), which are called
{{term donor atoms | 施主原子}}. Free electrons are the majority carriers and holes the
minority carriers; it is also called an electron-type semiconductor (电子型半导体).
:::

### P-type: adding trivalent atoms

Now use atoms with only **three** valence electrons, such as boron (B, 硼), gallium
(Ga, 镓) or indium (In, 铟). One of the four bonds around each impurity atom is missing
an electron. A neighbouring bound electron easily hops in to fill that vacancy
(填补空位), which leaves a hole in the neighbour's bond. Each impurity atom *accepts* an
electron, becomes a fixed negative ion, and creates one mobile hole.

::: define P-type semiconductor | P型半导体
A semiconductor doped with trivalent atoms (B, Ga, In), which are called
{{term acceptor atoms | 受主原子}}. Holes are the majority carriers and free electrons
the minority carriers; it is also called a hole-type semiconductor (空穴型半导体).
:::

::: define Majority and minority carriers | 多数载流子与少数载流子
In a doped semiconductor, the carrier the dopant supplies is the majority carrier
(多子): electrons in N-type, holes in P-type. The other kind, still made by intrinsic
excitation, is the minority carrier (少子).
:::

### What sets each concentration

The two kinds of carrier come from different sources, and that decides what controls
them:

| Property | Majority carriers (多子) | Minority carriers (少子) |
|---|---|---|
| Where they come from | Mostly the dopant atoms | Only intrinsic excitation |
| Concentration set by | The **doping** concentration | The **temperature** |
| Effect on the device | They carry the current: they decide how well it conducts | Few, but very temperature-sensitive: they cause the device's temperature drift |

Dopants are added in far larger numbers than the intrinsic carriers (say $10^{16}$ per
cm³ against $10^{10}$), so in N-type silicon nearly every free electron comes from a
donor. Meanwhile the extra electrons recombine with most of the intrinsic holes:
the product $n \cdot p$ stays at the value $C(K)$ fixed by the temperature, so if $n$
rises a million times, $p$ falls a million times.

::: example Carriers in N-type silicon
Silicon at 300 K ($n_i = 1.0\times10^{10}\ \text{cm}^{-3}$) is doped with
$N_D = 1.0\times10^{16}$ phosphorus atoms per cm³. Estimate the electron and hole
concentrations.
== Majority carriers ==
Each donor gives one free electron, and $10^{16} \gg 10^{10}$, so
$n \approx N_D = 1.0\times10^{16}\ \text{cm}^{-3}$: a million times more than in pure
silicon.
== Minority carriers ==
The product stays at $n_i^2 = 1.0\times10^{20}\ \text{cm}^{-6}$, so
$p = \dfrac{n_i^2}{n} = \dfrac{10^{20}}{10^{16}} = 1.0\times10^{4}\ \text{cm}^{-3}$.
== What it means ==
The current is carried almost entirely by electrons, and their number is fixed by the
doping, not the temperature. The holes are a million times fewer than in pure silicon,
but since they come only from excitation, they rise steeply when it gets warmer.
:::

::: callout key The one idea to keep
Majority carriers are set by doping and decide how well a device conducts. Minority
carriers are set by temperature and decide how much the device drifts when it warms
up.
:::

This also answers why devices start from ultra-pure, perfect crystals even though pure
silicon conducts badly: only a clean starting point lets the doping, and so every
carrier concentration, be **controlled** precisely. Stray impurities would add
carriers nobody planned.

::: callout note Is temperature sensitivity good or bad?
The slides leave this as a question to think about. Both: for amplifiers and
references it is a drawback (the operating point drifts as the chip warms up, and
later chapters spend effort cancelling it); for sensors it is the whole point
(thermistors, temperature-sensing diodes, light sensors). The same physics is a
nuisance or a feature depending on the job.
:::

## The PN junction

Take one crystal and dope its left half P-type and its right half N-type, so the two
regions meet at the atomic scale. The boundary, the {{term PN junction | PN结}}, is
where everything interesting happens.

### How the junction forms

Think of two rooms of people, one crowded with red shirts (holes, on the P side) and
one crowded with blue shirts (electrons, on the N side). Open the door between them and
people drift across simply because one side is more crowded. That is
{{term diffusion | 扩散}}.

1. **Majority carriers diffuse.** Holes diffuse from P into N, electrons from N into
   P, driven only by the difference in concentration. Near the boundary they meet and
   recombine.
2. **A layer of fixed charge is left behind.** On the P side, the acceptor ions that
   lost their holes are negative; on the N side, the donor ions that lost their
   electrons are positive. These ions are locked in the lattice and can't move. The
   thin layer that now holds only ions and no free carriers is the
   {{term space-charge region | 空间电荷区}}, also called the
   {{term depletion layer | 耗尽层}}.
3. **The ions set up a field.** Positive ions on the N side and negative ions on the P
   side make a {{term built-in electric field | 内电场}} pointing from N to P. It pushes
   holes back to P and electrons back to N: it opposes further diffusion.
4. **Minority carriers drift.** The same field sweeps any minority carrier that
   wanders into the region across it (electrons from P to N, holes from N to P). That
   field-driven motion is {{term drift | 漂移}}.
5. **Equilibrium.** The region widens until diffusion and drift balance. Then the net
   current is zero and the depletion layer keeps a fixed width.

::: define Space-charge region | 空间电荷区
The thin layer on both sides of a PN junction that has lost its free carriers by
diffusion and recombination, leaving only the fixed ions: negative on the P side,
positive on the N side. Also called the depletion layer (耗尽层).
:::

::: define Diffusion and drift | 扩散与漂移
Diffusion is carrier motion caused by a difference in concentration (in a PN junction,
the majority carriers). Drift is carrier motion caused by an electric field (in a PN
junction, the minority carriers swept across by the built-in field).
:::

::: law Equilibrium of the PN junction | PN结的动态平衡
With no external voltage, majority-carrier diffusion and minority-carrier drift across
the junction balance, so no net current flows and the space-charge region has a fixed
width.
:::

How wide does the region grow? It stops when its field (and the voltage across it, the
"barrier") is strong enough to hold diffusion back. Silicon has far fewer minority
carriers than germanium, so it needs a larger barrier to reach balance (about 0.6–0.7 V
against 0.2–0.3 V), and at the same doping and temperature its space-charge region is
**wider**.

## One-way conduction

Now connect a battery across the junction. What happens depends only on which way
round it goes.

### Forward bias: the junction conducts

{{term Forward bias | 正向偏置}} (正偏) means the P side connected to + and the N side to
−. The external field points from P to N, *against* the built-in field, so it weakens
the barrier:

- the space-charge region becomes **narrower**;
- diffusion is helped and drift is held back, so the balance is broken;
- huge numbers of majority carriers now diffuse across, and the battery keeps
  supplying more.

The result is a large {{term diffusion current | 扩散电流}} carried by **majority
carriers**. The junction looks like a small resistance: it is **conducting** (正向导通).
A resistor $R$ in series is needed to keep the current from getting too large.

### Reverse bias: the junction blocks

{{term Reverse bias | 反向偏置}} (反偏) means the P side to − and the N side to +. Now the
external field points the same way as the built-in field and strengthens it:

- the space-charge region becomes **wider**;
- diffusion is held back almost completely, drift is helped;
- the only carriers that can cross are the minority carriers swept by the field.

The current is a tiny {{term drift current | 漂移电流}} carried by **minority
carriers**. The junction looks like a very large resistance: it is **cut off**
(反向截止).

::: law One-way conduction of the PN junction | PN结的单向导电性
A forward-biased PN junction conducts (a large diffusion current of majority carriers,
low resistance); a reverse-biased PN junction is cut off (a tiny drift current of
minority carriers, high resistance).
:::

The two circuits below are the same except that the junction (drawn as a diode, the
packaged PN junction of the next lesson, anode = P side) is turned round.

::: circuit Forward bias: P side to +, the junction conducts
V1 0,4 0,0 U
R1 0,0 4,0 R
D1 4,0 4,4 PN
W 0,4 4,4
G 0,4
label P 4,0
:::

::: circuit Reverse bias: P side to −, the junction blocks
V1 0,4 0,0 U
R1 0,0 4,0 R
D1 4,4 4,0 PN
W 0,4 4,4
G 0,4
label N 4,0
:::

::: callout pitfall Which carriers make which current
Forward current is majority carriers diffusing; reverse current is minority carriers
drifting. Because minority carriers come from thermal excitation, the reverse current
grows quickly with temperature but hardly at all with voltage: once every minority
carrier that reaches the junction is swept across, more voltage can't find more of
them. That is why it is called the reverse *saturation* current.
:::

::: example Which way does it conduct?
A 3 V battery and a 1 kΩ resistor are connected to a silicon PN junction. (a) The +
terminal goes to the P side. (b) The + terminal goes to the N side. In which case does
a current of milliamps flow, and what is happening in the space-charge region?
== Case (a) ==
P to +, N to −: forward bias. The external field opposes the built-in field, the
depletion layer narrows, and majority carriers diffuse across freely. A current of a
few milliamps flows (about $(3-0.7)/1\,\text{k}\Omega = 2.3$ mA, using the 0.7 V
drop of the next lesson).
== Case (b) ==
N to +: reverse bias. The fields add, the depletion layer widens, and only minority
carriers drift across: the current is of the order of nanoamps for silicon,
effectively zero.
:::

## Junction capacitance

A PN junction stores charge, and charge that changes with voltage is exactly what a
capacitor does. A junction has two such effects.

### Barrier capacitance

The space-charge region is two thin layers of opposite charge, negative ions on one
side and positive on the other, separated by a gap: just like the two plates of a
capacitor. Increase the reverse voltage and the region widens, uncovering more ions:
the stored charge grows, as if the capacitor were charging. Lower it and the charge
shrinks.

::: define Barrier capacitance | 势垒电容
The capacitance $C_B$ of the PN junction caused by the layers of fixed ions in the
space-charge region, whose charge changes as the applied voltage changes the region's
width. It matters most under reverse bias.
:::

Because the "plates" move apart as the reverse voltage grows, $C_B$ **falls** as the
reverse voltage rises, and rises steeply towards forward bias. The curve below has the
shape on the slides ($C_B \propto 1/\sqrt{1 - u/U_\text{ho}}$ for an abrupt junction,
with a barrier voltage $U_\text{ho}$ of about 0.7 V; the formula is only for the shape
and isn't from the slides).

::: plot Barrier capacitance against the junction voltage
x: -10 .. 0.6
y: 0 .. 25
xlabel: u (V)
ylabel: C_B (pF)
C(u) = C0 / sqrt(1 - u/0.7)
slider C0: 1 .. 10 = 4 | pF
:::

This is used on purpose in the {{term varactor diode | 变容二极管}}, a reverse-biased
diode used as a voltage-controlled capacitor for tuning radios.

### Diffusion capacitance

Under forward bias, carriers that diffuse across do not recombine at once. Electrons
arriving from N pile up in the P region just beside the junction, and holes from P pile
up in the N region, each with a concentration that falls off with distance (the slides'
curves of non-equilibrium minority-carrier concentration, 非平衡少子浓度). A larger forward
voltage means a larger current and a bigger pile of stored carriers; a smaller voltage,
a smaller pile. Charge that changes with voltage is again a capacitance.

::: define Diffusion capacitance | 扩散电容
The capacitance $C_D$ of a forward-biased PN junction caused by the minority carriers
that pile up on each side after diffusing across, whose amount changes with the forward
voltage. It matters most under forward bias.
:::

::: callout key Both are nonlinear
Barrier and diffusion capacitance both depend on the voltage across the junction: they
are **nonlinear capacitances** (非线性电容), not fixed values like an ordinary capacitor's.
Together they make the {{term junction capacitance | 结电容}} $C_j$, which limits how fast
a diode or transistor can switch.
:::

How big are they? For a small transistor or diode, $C_j$ is about 1 pF to a few pF.
That only matters at high frequency, as the slides' question shows.

::: example Does a 1 pF junction matter at 50 Hz?
A junction capacitance of $C_j = 1$ pF is in parallel with a 1000 Ω resistor. Find its
reactance at the power frequency (工频, $f = 50$ Hz) and say what the pair is equivalent to.
== Reactance ==
$$X_C = \frac{1}{2\pi f C} = \frac{1}{2\pi \times 50 \times 10^{-12}} \approx 3.2\times10^{9}\ \Omega$$
about 3 GΩ (for 5 pF, still about 0.64 GΩ).
== Equivalent circuit ==
A 3 GΩ path in parallel with 1 kΩ takes about one three-millionth of the current. The
capacitor can be ignored: the pair is just the 1000 Ω resistor.
== And at high frequency? ==
$X_C$ falls as $1/f$. At 100 MHz the same 1 pF is only about 1.6 kΩ, comparable with
the resistor, so junction capacitance limits the highest frequency a device can
handle.
:::

Try other values: at what frequency does a few picofarads start to matter next to
1 kΩ?

::: explore Reactance of a junction capacitance
slider C: 0.5 .. 10 = 1 | pF
slider f: 50 .. 1e9 = 50 | Hz | log
X = 1 / (2 pi f C 1e-12) | Ω | Reactance
ratio = 1000 / X | | Current in C as a fraction of the 1 kΩ current
:::

::: callout exam What the slides check
The in-class questions test the carrier picture: Si against Ge, intrinsic against
doped, what sets majority and minority carriers, and the forward/reverse explanation
(diffusion of majority carriers / drift of minority carriers, narrower / wider
depletion layer). Be able to explain one-way conduction in those words.
:::

::: cards Semiconductors and the PN junction
Intrinsic semiconductor :: A completely pure semiconductor crystal without structural defects (本征半导体).
Intrinsic excitation :: Above 0 K some valence electrons break free, making electron-hole pairs (本征激发).
Hole :: The vacancy left in a bond by an escaped electron; it acts as a movable positive charge (空穴).
Recombination :: A free electron fills a hole and both disappear (复合).
Intrinsic carriers: $n_i p_i = ?$ :: A constant $C(K)$ set by the material and the temperature; in a pure crystal $n_i = p_i$.
Si or Ge: more intrinsic carriers at the same temperature? :: Ge (smaller band gap, about 1000× more at 300 K).
N-type: dopant and majority carrier :: Pentavalent donors (P, As); electrons are the majority carriers.
P-type: dopant and majority carrier :: Trivalent acceptors (B, Ga, In); holes are the majority carriers.
Majority-carrier concentration is set by … :: The doping concentration.
Minority-carrier concentration is set by … :: The temperature.
Space-charge region :: The layer at the junction with only fixed ions and no free carriers; also the depletion layer (空间电荷区, 耗尽层).
Forward bias: depletion layer and current :: Narrower; a large diffusion current of majority carriers, low resistance.
Reverse bias: depletion layer and current :: Wider; a tiny drift current of minority carriers, high resistance.
Barrier capacitance :: From the ion layers of the space-charge region; matters under reverse bias; falls as reverse voltage rises (势垒电容).
Diffusion capacitance :: From minority carriers piled up beside the junction under forward bias (扩散电容).
:::

::: quiz Semiconductors and the PN junction
? At the same temperature, which has the higher intrinsic carrier concentration?
- [ ] Silicon
- [x] Germanium
- [ ] They are the same
- [ ] It can't be told
> Germanium holds its valence electrons less tightly (band gap 0.66 eV against 1.12 eV), so far more of them break free: about $2\times10^{13}$ per cm³ at 300 K against about $10^{10}$ for silicon.

? Under the same conditions, which conducts better?
- [ ] An intrinsic semiconductor
- [x] An ordinary (doped) semiconductor
- [ ] It can't be told
> Doping adds majority carriers in numbers far beyond the intrinsic ones (say $10^{16}$ against $10^{10}$ per cm³), so a doped semiconductor conducts far better.

? In a doped semiconductor, what do the carrier concentrations depend on? (Choose all that apply.)
- [ ] The majority-carrier concentration is set by the temperature
- [x] The minority-carrier concentration is set by the temperature
- [x] The majority-carrier concentration is set by the doping concentration
- [ ] The minority-carrier concentration is set by the doping concentration
> Majority carriers come mostly from the dopant atoms, so the doping sets them. Minority carriers come only from intrinsic excitation, so the temperature sets them. (Strictly, doping also pushes the minority carriers down through $np = C(K)$, but it is the temperature that makes them change.)

? Why are devices made from ultra-pure, defect-free crystals before doping?
- [ ] A pure crystal conducts worse
- [ ] A pure crystal conducts better
- [x] Starting pure makes the carrier concentrations controllable
- [ ] A pure crystal is less affected by temperature
> Pure silicon actually conducts badly. The point is control: from a clean start, every carrier comes from doping we chose, in the amount we chose.

? Si and Ge junctions have the same doping and temperature. Which has the wider space-charge region?
- [x] Si
- [ ] Ge
- [ ] It can't be told
> Silicon has far fewer minority carriers, so the junction needs a larger barrier (about 0.7 V against 0.3 V) before drift balances diffusion. A larger barrier at the same doping means more uncovered ions, a wider region.

? A PN junction is forward biased. What carries the current, and what happens to the space-charge region?
- [x] Majority carriers diffusing; the region narrows
- [ ] Minority carriers drifting; the region narrows
- [ ] Majority carriers diffusing; the region widens
- [ ] Minority carriers drifting; the region widens
> The external field opposes the built-in field, so the region narrows and majority carriers diffuse across in large numbers: a large diffusion current, a low resistance.

? A 1 pF junction capacitance: what is its reactance at 50 Hz?
answer: 3.18 GΩ
tolerance: 3%
> $X_C = \dfrac{1}{2\pi f C} = \dfrac{1}{2\pi \times 50 \times 10^{-12}} \approx 3.18\times10^{9}$ Ω. Next to a 1 kΩ resistor in parallel, it can be ignored.

? Silicon at 300 K has $n_i = 10^{10}$ cm⁻³. Doped N-type with $10^{15}$ donors per cm³, how many holes per cm³ are there? (Give the number, as a power of ten like 1e5.)
answer: 1e5
tolerance: 2%
> $n \approx 10^{15}$, and $np = n_i^2 = 10^{20}$, so $p = 10^{20}/10^{15} = 10^{5}$ cm⁻³.

? The kind of capacitance that matters most in a **reverse**-biased junction is the … capacitance.
text: barrier | 势垒 | 势垒电容 | depletion | transition
> Under reverse bias almost no carriers diffuse, so there is no diffusion capacitance to speak of; what remains is the barrier capacitance of the ion layers, which shrinks as the reverse voltage grows.
:::

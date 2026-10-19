---
title: The Kelvin and Clausius statements
zh: 热力学第二定律的两种表述
summary: Why natural processes have a direction — the Kelvin and Clausius statements of the second law, reversible and irreversible processes, why every irreversibility implies every other, and Carnot's theorem.
source: 第15章 热力学第二定律 §15.1, 2026-09-30
---

The first law (Lesson 2.1) is a bookkeeping rule: energy is never made or lost, only
moved between heat, work and internal energy. But it says nothing about **which way**
things go. A hot cup of tea cools down in a cold room and never warms itself up by
taking heat from the room, even though that would conserve energy just as well. The
**second law of thermodynamics** ({{term second law of thermodynamics | 热力学第二定律}})
is the law of direction. This lesson states it in its two classic forms, explains what
"reversible" means, shows that all the one-way processes of nature are tied together,
and ends with Carnot's theorem, the upper limit on the efficiency of every heat engine.
Lesson 3.2 then turns the same idea into a number, entropy.

## Why we need a second law

Picture the energy of the ocean: about $10^{21}$ kg of water. Cooling it by just
$0.01\ \text{K}$ would release roughly $4\times10^{22}$ J, enough to run the world for
decades. The first law has no objection: the work you get out is exactly the heat you
take in. Yet nobody has ever built such a machine. Something else forbids it.

Recall from Lesson 2.4 how a heat engine is rated. Its efficiency is

$$\eta=\frac{A_\text{net}}{Q_\text{abs}}=1-\frac{Q_\text{rel}}{Q_\text{abs}},$$

where $A_\text{net}$ is the net work done **by** the working substance in one cycle,
$Q_\text{abs}$ the heat it absorbs and $Q_\text{rel}$ the heat it releases (both
counted as positive amounts here). An engine with $\eta=1$ would have
$Q_\text{rel}=0$: it would take heat from a single body and turn all of it into work,
cycle after cycle, with nothing thrown away.

There are two kinds of "perpetual motion machine" people have dreamed of:

- a {{term perpetual motion machine of the first kind | 第一类永动机}} gives out work
  with no energy put in. It breaks the first law, and can't be built.
- a {{term perpetual motion machine of the second kind | 第二类永动机}} gives out work
  using heat from one reservoir only, with $\eta=1$. It obeys the first law. The
  second law is exactly the statement that this machine is impossible too.

::: callout note Notation
This course writes $A$ for the work done **by** the system and $Q$ for the heat it
absorbs, so the first law reads $Q=\Delta E+A$. Many English books write $W$ for work,
and some count work done **on** the system, writing $\Delta U=Q+W$. The physics is the
same; only the signs on paper change.
:::

## The Kelvin statement

First the direction that *does* happen. In Joule's experiment a falling weight turns
a paddle wheel in water; friction in the water turns the weight's work entirely into
heat, and the water warms up. Work → heat, completely, with nothing else needed. Kelvin
(William Thomson, 开尔文) noticed that the reverse is never seen.

::: law Kelvin statement of the second law | 开尔文表述
It is impossible to take heat from a **single** reservoir and turn it **completely**
into useful work **without causing any other change**.

Equivalently: no process whose *only* effect is that heat turns entirely into work is
possible; a perpetual motion machine of the second kind cannot be built.
:::

The words "without any other change" (the slide underlines "唯一效果", *only effect*)
carry the whole statement. Heat *can* turn completely into work if something else
changes at the same time — as the next example shows.

::: example Heat turned entirely into work — with another change
One mole of an ideal gas expands isothermally at $T=300$ K from $V_1=10$ L to
$V_2=20$ L, in contact with a reservoir. How much heat does it absorb, and how much
work does it do? Does this contradict the Kelvin statement?
== Internal energy ==
The temperature does not change, so $\Delta E=0$ for an ideal gas (Lesson 1.3).
== Work and heat ==
$$A=\nu RT\ln\frac{V_2}{V_1}=1\times8.31\times300\times\ln2=1.73\times10^3\ \text{J}$$
and by the first law $Q=\Delta E+A=A=1.73\times10^3$ J.
== Verdict ==
All the heat became work, but the gas is left with twice its volume and half its
pressure (249 kPa → 125 kPa). That is "another change". To use the gas again you must
compress it back, which costs work and dumps heat. So no contradiction: Kelvin
forbids complete conversion **in a cycle** (with nothing else changed), not in a
single process.
:::

::: pv Isothermal expansion: the shaded work equals the heat absorbed, but the gas does not come back
axes: V (L), p (kPa)
1: V 10, p 249.3
2: V 20, p 124.65
1 -> 2: isothermal
shade: 1 -> 2
:::

::: callout pitfall "Heat can never be fully turned into work" is wrong
The correct version always carries the condition: not *with no other change*, or not
*in a cycle* using one reservoir. An isothermal expansion turns heat completely into
work; it just leaves the gas changed.
:::

## The Clausius statement

The second everyday direction: heat flows by itself from hot to cold. Two bodies in
contact end up at the same temperature, and a cold body never spontaneously gives heat
to a hotter one. Clausius (克劳修斯) made this the law.

::: law Clausius statement of the second law | 克劳修斯表述
Heat cannot pass **by itself** (自动地) from a body at a lower temperature to a body at
a higher temperature. Heat transfer has a direction.
:::

"By itself" is the key word again. A refrigerator does move heat $Q_2$ out of a cold
interior at $T_2$ and gives heat $Q_1$ to the warmer room at $T_1$ — but only because
work $A$ is put in from outside, so $Q_1=Q_2+A$ (Lesson 2.4). The outside world
changes (the power station burns fuel), so the transfer is not "by itself".

::: example A refrigerator does not break the Clausius statement
A refrigerator with coefficient of performance $\omega=3$ removes $Q_2=900$ J from its
cold interior. How much work does it need, and how much heat reaches the kitchen?
== Work ==
$\omega=Q_2/A$, so $A=Q_2/\omega=900/3=300$ J.
== Heat to the kitchen ==
$Q_1=Q_2+A=900+300=1200$ J.
== Verdict ==
Heat did go from cold to hot, but 300 J of work had to be supplied from outside.
Switch the power off and the flow stops: it never happens by itself.
:::

The slides add one more one-way process: the {{term adiabatic free expansion | 绝热自由膨胀}}.
A box is divided by a partition, gas on the left, vacuum on the right. Pull out the
partition and the gas fills the whole box. You will wait forever for it to gather
back into the left half by itself. **Free expansion has a direction too.** (Lesson 2.3
showed that for an ideal gas the temperature ends up the same: $Q=0$, $A=0$,
$\Delta E=0$.)

## Reversible and irreversible processes

To talk about direction precisely we need a word for processes that have *no*
preferred direction.

::: define Reversible process | 可逆过程
A process is **reversible** if its reverse can pass back through every state of the
forward process **and** leave no change anywhere else. Equivalently: changing the
outside conditions by an infinitesimal amount makes the process run backwards, and
then system and surroundings both return to their initial states.
:::

::: define Irreversible process | 不可逆过程
A process that is not reversible: however it is undone, the system and its
surroundings cannot both be put back as they were.
:::

A reversible process is an **idealisation**, one step further than a quasi-static
process (准静态过程, Lesson 2.1). Quasi-static means "passing through equilibrium
states"; reversible adds "with no dissipation". A process is irreversible whenever

1. friction, viscosity or other **dissipative effects** (耗散效应) are present, or
2. the system is **not in mechanical or thermal equilibrium** with its surroundings
   (a finite pressure difference, a finite temperature difference).

So a reversible process has to be built carefully:

- **Work, without friction, quasi-statically.** Push a frictionless piston with an
  outside pressure only infinitesimally larger than the gas's and the gas is
  compressed slowly; make it infinitesimally smaller and the gas expands slowly. A tiny
  nudge either way reverses the motion.
- **Heat, across an infinitesimal temperature difference** (等温热传递). In the two
  isothermal steps of a Carnot cycle (Lesson 2.5) the gas is kept at the reservoir's
  own temperature. And to heat a body from $T_1$ to a finite $T_2$ reversibly, put it
  in contact with a long row of reservoirs at $T_1+\Delta T$, $T_1+2\Delta T$, …,
  $T_2$ in turn, each only infinitesimally warmer than the body. Lesson 3.2 shows how
  close this comes to reversible as the steps shrink.

::: pv A Carnot cycle: every step is reversible (isotherms at the reservoirs' temperatures, frictionless adiabats)
axes: V (L), p (kPa)
gamma: 1.4
1: V 10, p 400
2: V 20, p 200
3: V 40, p 75.8
4: V 20, p 151.6
1 -> 2: isothermal
2 -> 3: adiabatic
3 -> 4: isothermal
4 -> 1: adiabatic
shade: cycle
:::

Real processes always have some friction and some finite differences, which leads to
one of the most important sentences of the chapter:

::: callout key Every natural process involving heat is irreversible
All real macroscopic processes that involve heat (一切与热现象有关的自然过程) are
irreversible: they run one way only.
:::

That one-way character is what gives time its direction, the
{{term arrow of time | 时间箭头}}. Film a cup shattering and play it backwards:
everyone sees at once that the film is reversed. Life is the clearest example: birth,
childhood, youth, middle age, old age, never the other way. As the slide puts it, today
cannot replay yesterday's story.

::: callout pitfall Irreversible does not mean "can't go backwards"
A gas that expanded freely *can* be compressed back into the left half: push a piston.
The process is irreversible because doing so leaves a change elsewhere (work spent,
heat dumped into the surroundings), not because the system can never return. The test
is "system **and** surroundings back as they were, with no trace".
:::

## All irreversible processes are linked

Kelvin talks about engines and work, Clausius about heat flow, the free expansion about
gases. They look like three different facts. They are one fact: if any one of them
could be cheated, so could the others. The slides show this with imaginary devices.

### Breaking Kelvin breaks Clausius

Suppose a single-reservoir engine existed (violating Kelvin). It takes heat $Q$ from
the hot reservoir $T_1$ and turns all of it into work $A=Q$. Use that work to drive an
ordinary refrigerator, which takes $Q_2$ from the cold reservoir $T_2$ and gives
$Q_2+A$ to $T_1$. Look at the pair as one machine: the hot reservoir lost $Q$ and
gained $Q_2+Q$, a net gain of $Q_2$; the cold reservoir lost $Q_2$; no outside work
is involved. **Heat $Q_2$ went from cold to hot by itself** — a violation of Clausius.

### Breaking Clausius breaks Kelvin

Suppose instead heat could flow from cold to hot by itself (violating Clausius). Run
an ordinary Carnot engine between the reservoirs: it takes $Q_1$ from $T_1$, does
work $A=Q_1-Q_2$, and gives $Q_2$ to $T_2$. Now let that $Q_2$ flow back up to $T_1$
by itself. Net result: the cold reservoir is unchanged, and the hot reservoir gave out
$Q_1-Q_2$, which became work $A$ — **heat from a single reservoir turned entirely into
work**, a violation of Kelvin.

::: example Putting numbers on the first device
A (hypothetical) single-reservoir engine takes $Q=300$ J from the hot reservoir and
gives $A=300$ J of work, which drives the refrigerator of the earlier example
($\omega=3$). Find the net heat exchanged by each reservoir.
== The refrigerator ==
With $A=300$ J it removes $Q_2=\omega A=900$ J from the cold reservoir and delivers
$Q_2+A=1200$ J to the hot one.
== Net effect ==
Hot reservoir: $-300+1200=+900$ J. Cold reservoir: $-900$ J. Work from outside: $0$.
== Verdict ==
900 J went from cold to hot with nothing else changed: if Kelvin failed, Clausius
would fail too.
:::

### Free expansion and heat → work

The same works for gases. Let a gas in a cylinder expand isothermally against a
piston, taking heat $Q$ from a reservoir at $T$ and doing work $A=Q$ (the example
above). If the expanded gas could then **compress itself** back to its initial volume,
with no help — a reversed free expansion — the cylinder would be back where it
started, and the only net effect would be heat $Q$ from one reservoir turned entirely
into work. Again Kelvin would fail.

::: callout key One law, many faces
The irreversibilities of all natural macroscopic processes involving heat are
**equivalent**: deny one and you deny all of them.
:::

## What the second law really says

Directions show up everywhere — heat flow, friction, diffusion, mixing, free
expansion — and each could be written as its own "statement". But because they all
imply one another, the textbook keeps just two standard forms, **Kelvin's and
Clausius's**, and sums up their content in one line:

::: callout key The essence of the second law | 热力学第二定律的实质
Every actual macroscopic process involving heat is irreversible.
:::

::: callout exam What exams ask here
Expect true/false statements testing the exact wording: "completely" and "without
other change" in Kelvin, "by itself" in Clausius, and the difference between
"reversible", "quasi-static" and "can run backwards". Also: show with a device sketch
that a violation of one statement implies a violation of the other.
:::

## Carnot's theorem

In 1824, decades before the first law was settled, the French engineer Sadi Carnot
asked how efficient a heat engine could possibly be. His answer, proved properly once
the second law was known, is **Carnot's theorem**. The efficiency $\eta_c=1-T_2/T_1$
of an ideal-gas Carnot cycle comes from Lesson 2.5; the theorem says it is far more
general than ideal gases.

::: theorem Carnot's theorem | 卡诺定理
For engines working between a hot reservoir at $T_1$ and a cold reservoir at $T_2$:

1. **all reversible engines** have the same efficiency, whatever the working
   substance, namely
   $$\eta=1-\frac{T_2}{T_1};$$
2. **no irreversible engine** can be more efficient than a reversible one:
   $$\eta_\text{irr}<1-\frac{T_2}{T_1}.$$
:::

Together: $\eta\le1-T_2/T_1$, with "=" for reversible engines and "<" for
irreversible ones. Since every real engine has friction and finite temperature
differences, every real engine falls below the Carnot value. The theorem also tells you
how to improve an engine: make the temperature difference between the reservoirs as
large as possible (raise $T_1$, lower $T_2$), and cut the irreversible losses
(friction, processes that are not quasi-static).

### The proof (for self-study)

The slides leave the proof for self-study. It works by contradiction (反证法), using
the Clausius statement.

**Part 1: all reversible engines have the same efficiency.** Take two reversible
engines $E$ and $E'$ between $T_1$ and $T_2$. $E$ absorbs $Q_1$ from the hot
reservoir and releases $Q_2$ to the cold one; $E'$ absorbs $Q_1'$ and releases $Q_2'$.
Adjust them to give the same work per cycle, $A=Q_1-Q_2=Q_1'-Q_2'$, so

$$\eta_E=\frac{A}{Q_1},\qquad \eta_{E'}=\frac{A}{Q_1'}.$$

Suppose $\eta_E>\eta_{E'}$. Then $A/Q_1>A/Q_1'$, so $Q_1'>Q_1$; and from
$Q_1'-Q_1=Q_2'-Q_2$ also $Q_2'>Q_2$. Because $E'$ is reversible we can run it
**backwards** as a refrigerator, driven by the work $A$ of $E$: it takes $Q_2'$ from
the cold reservoir and gives $Q_1'$ to the hot one. After one cycle of the pair both
engines are back where they started, no outside work was used, and

- the cold reservoir has given out $Q_2'-Q_2>0$,
- the hot reservoir has received $Q_1'-Q_1$, the same amount.

Heat went from cold to hot with nothing else changed: impossible by Clausius. So
$\eta_E>\eta_{E'}$ is false. Running $E$ backwards instead rules out
$\eta_E<\eta_{E'}$ the same way. Hence $\eta_E=\eta_{E'}$, and since the ideal-gas
Carnot engine is one of the reversible engines, they all have $\eta=1-T_2/T_1$.

**Part 2: reversible engines are the most efficient.** Replace $E'$ by an
irreversible engine $E''$. Now only one half of the argument works: we can still run
the reversible $E$ backwards, driven by $E''$, which shows that $\eta_{E''}>\eta_E$
would make heat flow from cold to hot by itself. So $\eta_{E''}\le\eta_E$. The other
half fails, because the irreversible $E''$ cannot be run backwards as a refrigerator
with the same heats — so nothing forbids $\eta_{E''}<\eta_E$, and in fact real engines
are strictly less efficient.

::: callout note About the slides' proof
The self-study slides write the heats of the combined cycle as $Q_2-Q_2'$ (given out
by the cold reservoir) and $Q_1-Q_1'$ (received by the hot one). With $Q_1'>Q_1$ and
$Q_2'>Q_2$ those are negative; the amounts are $Q_2'-Q_2$ and $Q_1'-Q_1$, as above.
In Part 2 the slide's sentence has the two engines swapped: what the argument proves
is that $\eta_{E''}$ cannot exceed $\eta_E$, while it cannot prove that $\eta_E$ cannot
exceed $\eta_{E''}$. Neither slip changes the conclusion
$\eta_\text{irr}\le\eta_\text{rev}$.
:::

::: example The proof with numbers
Suppose someone claims an engine $E$ with $\eta_E=50\%$ between two reservoirs where a
reversible engine $E'$ has $\eta_{E'}=40\%$. Both deliver $A=400$ J per cycle. Run $E'$
backwards with $E$'s work and find the net heat of each reservoir.
== Engine E ==
$Q_1=A/\eta_E=400/0.5=800$ J from the hot reservoir; $Q_2=Q_1-A=400$ J to the cold one.
== E' run backwards ==
Forwards it would need $Q_1'=A/\eta_{E'}=1000$ J and reject $Q_2'=600$ J. Reversed, it
takes $600$ J from the cold reservoir and gives $1000$ J to the hot one, using $E$'s
400 J of work.
== Net ==
Hot reservoir: $-800+1000=+200$ J. Cold reservoir: $+400-600=-200$ J. No outside work.
200 J has flowed from cold to hot by itself, so the claimed 50% is impossible.
:::

::: example Checking an inventor's claim
An inventor says her engine takes $1000$ J of heat per cycle from steam at $500$ K,
releases heat to river water at $300$ K, and delivers $450$ J of work. Is it possible?
== The best possible efficiency ==
$$\eta_c=1-\frac{T_2}{T_1}=1-\frac{300}{500}=0.40$$
== The claim ==
$\eta=A/Q_1=450/1000=0.45>0.40$.
== Verdict ==
Impossible: no engine between these reservoirs, reversible or not, beats 40%. A claim
of, say, 350 J (35%) would be allowed: it is below the limit, as a real, irreversible
engine must be.
:::

::: example How good is a power station?
A steam power station takes heat at $550\ ^\circ$C and rejects it to cooling water at
$30\ ^\circ$C. What is the highest efficiency Carnot's theorem allows?
== Kelvin, not Celsius ==
$T_1=550+273.15=823.15$ K, $T_2=30+273.15=303.15$ K.
== Carnot limit ==
$$\eta_\text{max}=1-\frac{303.15}{823.15}=0.632=63.2\%$$
== Comment ==
Real stations reach about 40%: friction, heat flowing across finite temperature
differences and other irreversibilities take the rest.
:::

::: callout pitfall Temperatures in kelvin
Carnot's formula needs absolute temperatures. With Celsius the example above would
give $1-30/550=94.5\%$, which is nonsense.
:::

::: explore Is an engine possible?
slider T1: 300 .. 1500 = 800 | K
slider T2: 200 .. 400 = 300 | K
slider Q1: 100 .. 5000 = 1000 | J
slider A: 0 .. 3000 = 500 | J
eta_c = 1 - T2 / T1 | | Carnot limit 1 − T2/T1
eta = A / Q1 | | Claimed efficiency A/Q1
margin = eta_c - eta | | Limit minus claim (must be ≥ 0, and > 0 for a real engine)
:::

::: cards The second law and Carnot's theorem
Perpetual motion machine of the second kind (第二类永动机)? :: An engine with $\eta=1$: it takes heat from a single reservoir and turns it all into work. It obeys the first law but is forbidden by the second.
Kelvin statement (开尔文表述)? :: It is impossible to take heat from a single reservoir and turn it completely into work without any other change.
Clausius statement (克劳修斯表述)? :: Heat cannot pass by itself from a colder body to a hotter body.
Key words in the two statements? :: Kelvin: "single reservoir", "completely", "without other change". Clausius: "by itself" (自动地).
Reversible process (可逆过程)? :: Its reverse retraces every state and leaves system and surroundings both unchanged; quasi-static with no dissipation.
Two causes of irreversibility? :: Dissipation (friction, viscosity) and lack of mechanical or thermal equilibrium (finite pressure or temperature differences).
How can heat flow reversibly? :: Across an infinitesimal temperature difference, e.g. via a series of reservoirs each $\mathrm{d}T$ warmer.
The essence of the second law? :: Every actual macroscopic process involving heat is irreversible.
Why are Kelvin and Clausius equivalent? :: A device that broke either could be combined with an ordinary engine or refrigerator to break the other.
Carnot's theorem, part 1? :: All reversible engines between $T_1$ and $T_2$ have the same efficiency, $\eta=1-T_2/T_1$, whatever the working substance.
Carnot's theorem, part 2? :: No irreversible engine between $T_1$ and $T_2$ is more efficient than a reversible one: $\eta\le1-T_2/T_1$.
How is Carnot's theorem proved? :: By contradiction: a more efficient engine driving a reversed reversible engine would move heat from cold to hot by itself.
How to raise an engine's efficiency? :: Increase the temperature difference of the reservoirs and reduce irreversible losses (friction, non-quasi-static steps).
:::

::: quiz Check yourself
? True or false: work can be turned completely into heat, but heat can never be turned completely into work.
- [ ] True
- [x] False
> False. An isothermal expansion of an ideal gas turns all the heat it absorbs into work ($\Delta E=0$, $Q=A$); it just leaves the gas expanded. The Kelvin statement only forbids it **with no other change**.

? True or false: heat can flow from a hot body to a cold one, but never from a cold body to a hot one.
- [ ] True
- [x] False
> False. A refrigerator moves heat from cold to hot. What is impossible is for this to happen **by itself**, without work supplied from outside.

? True or false: an irreversible process is one that cannot run in the opposite direction.
- [ ] True
- [x] False
> False. Many irreversible processes can be driven backwards (compress a freely expanded gas with a piston). Irreversible means they cannot be undone **without leaving a change elsewhere**; the second law is about what happens by itself (自动地).

? Which of these statements are true? (例5 and 例4 from the slides)
- [x] A reversible process must be quasi-static.
- [ ] A quasi-static process must be reversible.
- [x] Any process with friction is irreversible.
- [x] All spontaneous processes are irreversible.
- [ ] An irreversible process is one in which the system cannot return to its initial state.
- [ ] An irreversible process is one in which the surroundings change.
- [x] For an irreversible process there is no other process that brings system and surroundings back together.
- [x] Every actual process involving heat is irreversible.
- [x] A gas can expand freely but cannot contract by itself.
> Reversible needs quasi-static **and** no dissipation, so the first is true but its converse is false (a slow process with friction is quasi-static but irreversible). Friction always dissipates, so it is irreversible. Spontaneous processes and real processes involving heat are irreversible (the essence of the second law), and free expansion has a direction. The system *can* return to its initial state, and the surroundings *can* change in a reversible process (a reservoir gives heat); what defines irreversibility is that system **and** surroundings can't both be restored.

? An engine runs between reservoirs at $600$ K and $300$ K. What is the highest efficiency it can have?
answer: 0.5
> Carnot's theorem: $\eta\le1-T_2/T_1=1-300/600=0.5$, i.e. 50%, reached only by a reversible engine.

? An inventor's engine works between $227\ ^\circ$C and $27\ ^\circ$C, absorbs $2000$ J per cycle and claims $900$ J of work. What is the most work per cycle Carnot's theorem allows?
answer: 800 J
> In kelvin, $T_1=500$ K and $T_2=300$ K, so $\eta_c=1-300/500=0.4$ and $A_\text{max}=0.4\times2000=800$ J. The claimed 900 J is impossible.

? A hypothetical single-reservoir engine takes $500$ J from a hot reservoir and drives a refrigerator with $\omega=4$. How much heat goes, in total, from the cold reservoir into the hot one?
answer: 2000 J
> The engine gives $A=500$ J. The refrigerator removes $Q_2=\omega A=2000$ J from the cold reservoir and delivers $Q_2+A=2500$ J to the hot one. Net for the hot reservoir: $-500+2500=+2000$ J; the cold one loses 2000 J, with no outside work — a violation of Clausius.

? In the proof of Carnot's theorem, suppose $\eta_E=0.6$ and a reversible $\eta_{E'}=0.5$, both giving $A=300$ J, with $E'$ run backwards. How much heat flows from the cold to the hot reservoir by itself per cycle?
answer: 100 J
> $E$: $Q_1=300/0.6=500$ J, $Q_2=200$ J. Reversed $E'$: takes $Q_2'=600-300=300$ J from cold and gives $Q_1'=300/0.5=600$ J to hot. Net: hot $-500+600=+100$ J, cold $+200-300=-100$ J.

? Which change raises the Carnot limit of an engine between $T_1=500$ K and $T_2=300$ K the most?
- [x] Lower $T_2$ by 50 K
- [ ] Raise $T_1$ by 50 K
- [ ] Use helium instead of air as the working substance
> Lowering $T_2$ gives $1-250/500=0.50$; raising $T_1$ gives $1-300/550=0.455$; the working substance makes no difference to a reversible engine (Carnot's theorem, part 1).
:::

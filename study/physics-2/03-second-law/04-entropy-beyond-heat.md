---
title: Information, life and energy degradation
zh: 信息熵 生命熵 能量退降
summary: Entropy outside the heat engine — the heat death of the universe, Maxwell's demon, Shannon's information entropy, Prigogine's dissipative structures, how living things stay ordered, and why entropy measures how much energy has lost its use.
source: 第15章 热力学第二定律 拓展专题：信息熵 生命熵 能量退降, 2026-10-14
---

Entropy began as a quantity for heat engines (Lesson 3.2) and became, with Boltzmann,
a measure of molecular disorder (Lesson 3.3). That second meaning reaches much
further than steam: wherever there is order and disorder, certainty and uncertainty,
useful and useless energy, the same ideas apply. This lesson is the lecture's
enrichment topic. It asks what the second law says about the universe as a whole, how
a little "demon" with information seems to beat it, how information itself can be
measured as an entropy, how ordered structures (snowflakes, convection cells, living
things) can form even though entropy increases, and why an energy crisis is really an
"entropy crisis". It is less about calculation and more about understanding, but the
few formulas here are worth knowing.

## The puzzle: everything decays, except life

The entropy-increase principle (Lesson 3.2) says that in an **isolated** system the
entropy never decreases. Since entropy measures disorder, this means an isolated
system becomes more and more disordered, until it reaches equilibrium: then its
entropy is at its maximum, nothing changes any more, and the system falls still.

Everyday life is full of this one-way traffic, and Chinese has many sayings for it:
spilt water can't be gathered back up (覆水难收), a broken mirror can't be made whole
again (破镜难圆), cooked rice can't be made raw again (生米煮成熟饭). Leaves fall, ashes
don't rekindle, people grow old and not young. Every one is an irreversible process in
which entropy increases.

Living things seem to be the exception. A living organism keeps itself in a highly
ordered, low-entropy state for its whole life: its organs and cells work in an
intricate, well-organised way, and as an embryo grows it even becomes *more* ordered.
Does life break the second law?

No, because a living thing is not an isolated system but an
{{term open system | 开放系统}}: it exchanges matter and energy with its surroundings.
The entropy change of an open system has two parts:

- **Entropy production**, caused by the irreversible processes inside the system
  (friction, diffusion, chemical reactions, heat conduction). It is always positive (or
  zero for an ideal reversible process).
- **Entropy exchange**, caused by matter and energy crossing the boundary. It can be
  positive, negative or zero.

Their sum is the system's total entropy change, and it *can* be negative if the system
exports more entropy than it produces. In his 1944 book *What Is Life?*, Erwin
Schrödinger put it this way: the only way an organism avoids sliding towards maximum
entropy (death) is by continually drawing "negative entropy" from its environment:
**life feeds on negative entropy**.

::: callout note There is no "negative-entropy substance"
Entropy is never negative, and no material "contains negative entropy". What exists are
**low-entropy** and **high-entropy** forms of matter and energy. Food (ordered
molecules full of chemical energy) and sunlight are low-entropy; CO₂, water vapour,
waste and heat given off at body temperature are high-entropy. Seen through entropy,
**metabolism** ({{term metabolism | 新陈代谢}}) is the process of taking in low-entropy
matter and giving out high-entropy matter. "Taking in negative entropy" is shorthand
for exactly this.
:::

The same way of thinking about order and disorder has been used to study:

1. how much information something carries, and how ordered it is;
2. economic structure (how diverse an economy is, and how stable);
3. the currents of ideas in society and how stable a society is;
4. how the universe evolves.

The rest of this lesson goes through the physical ones: the fate of the universe,
information entropy, Prigogine's theory of dissipative structures, life entropy, and
energy degradation.

## The heat death of the universe

Apply the two laws of thermodynamics to the whole universe, treated as the most
complete isolated system there could be. Two conclusions follow:

- the **energy** of the universe is constant (first law);
- the **entropy** of the universe tends to a maximum (second law).

Follow the arrow of time to its end, and the universe would reach equilibrium: one
uniform temperature everywhere, no temperature differences left to run any engine,
star or living thing, nothing ever happening again. Clausius drew this conclusion in
the 1860s. It became known as the {{term heat death | 热寂}} of the universe
({{zh 热寂说}}), a scientific "end of the world".

::: callout warning Why the simple argument does not settle it
The argument treats the universe like gas in a box that has a fixed equilibrium state.
The lecture's reply: the universe is not such an isolated system. It has been
**expanding** ever since the Big Bang, and as it expands the largest entropy it could
have keeps growing, so its actual state stays far from equilibrium rather than settling
into it. Gravity changes the picture too: for a gas held together by gravity, clumping
into stars and galaxies *raises* the entropy, so a lumpy universe is not "more
ordered" in the way a box of gas would be. Whether, and how, the universe ends in a
"heat death" is still a question for cosmology, not something the second law alone
decides.
:::

## Maxwell's demon

In 1871 James Clerk Maxwell imagined a way to beat the second law, and his little
thought experiment turned out to be about **information**.

A box full of gas at one temperature is split into two parts, A and B, by a wall with
a tiny trapdoor. A tiny being (later named {{term Maxwell's demon | 麦克斯韦妖}}) watches
the molecules and works the door. When a **fast** molecule comes towards the door from A,
it opens the door and lets it into B; when a **slow** molecule comes from B, it lets it
into A; otherwise the door stays shut. The door is frictionless, so this costs no work.

Gradually A collects slow molecules and cools; B collects fast ones and warms. A
temperature difference appears out of a uniform gas, so heat has gone from the colder
part A to the warmer part B, with no work done. That is exactly what the Clausius
statement forbids (Lesson 3.1): the system has gone from disorder to order, **against**
the natural direction.

What does the demon have that an ordinary wall doesn't? It **knows** each molecule's
position and speed, and it uses that **information** to intervene. So the lecture's
point is:

::: callout key Information can act like negative entropy
Information about a system can be turned into a decrease of the system's entropy:
used well, it makes a system go from disorder to order, against the spontaneous
direction. Information and entropy are two sides of one quantity.
:::

Then is the second law broken? No: the demon is part of the system. Leo Szilard (1929)
showed that the demon must pay for each bit of information it gains, and Rolf
Landauer (1961) and Charles Bennett (1982) found where the bill comes due: the
demon's memory fills up, and **erasing** one bit of memory must give off at least
$kT\ln2$ of heat to the surroundings, an entropy of at least $k\ln2$. Counting the
demon's memory and the surroundings, the total entropy still does not decrease. The
demon is a "prototype" of the dissipative structures later in this lesson: an ordered
state kept up by something outside the gas.

::: example The price of forgetting one bit
What is the least heat that must be given off to erase one bit of memory at room
temperature, 300 K? What entropy does it give the surroundings?
== Landauer's limit ==
$$Q_{\min}=kT\ln2=1.38\times10^{-23}\times300\times0.693=2.87\times10^{-21}\ \mathrm{J}.$$
== The entropy ==
$$\Delta S=\frac{Q_{\min}}{T}=k\ln2=1.38\times10^{-23}\times0.693=9.57\times10^{-24}\ \mathrm{J/K}.$$
This is tiny, far below what real computer chips spend per bit (about a million times
more), but it can never be zero. One bit of information is "worth" $k\ln2$ of entropy.
:::

## Information entropy

In 1948 the American mathematician Claude Shannon, the founder of information theory,
introduced **information entropy**: a number that measures how uncertain we are about
the outcome of something. It has the same form as Boltzmann's entropy, with the
number of possibilities in place of the number of microstates.

Suppose an event has $N$ possible outcomes, side by side, unrelated, and equally
likely, so each has probability $P=1/N$. The more outcomes, the less we know which one
will happen.

::: define Information entropy | 信息熵
For an event with $N$ equally likely outcomes (each of probability $P=1/N$), the
information entropy is $S=k\ln N=-k\ln P$. It measures how uncertain the outcome is:
the larger it is, the less we know.
:::

::: formula Information entropy | 信息熵
$$S=k\ln N=k\ln\frac1P=-k\ln P,\qquad\text{with }k=\frac{1\ \text{bit}}{\ln2}:\quad S=\log_2N\ \text{bits}$$
--
S | information entropy of the event | bit
N | number of equally likely outcomes | —
P | probability of each outcome, $P=1/N$ | —
k | proportionality constant: $1/\ln2\approx1.442$ bit | bit
:::

The unit is the {{term bit | 比特}}: the amount of information needed to make one choice
between two equally likely, unrelated possibilities (heads or tails, 0 or 1). Choosing
one possibility out of $2^H$ takes $H$ bits: halve the possibilities $H$ times and one
is left. With $k=1/\ln2=1.442$ bit, $S=k\ln N=\ln N/\ln2=\log_2N$ bits.

::: callout pitfall Two different k's
In information entropy, $k=1/\ln2$ bit, a pure scale factor that turns $\ln$ into
$\log_2$. In Boltzmann's $S=k\ln\Omega$, $k=1.38\times10^{-23}$ J/K, a physical
constant. The formulas look alike, but the two $k$'s are not the same number. (If you
want one bit in thermodynamic units, it is $k_{\text{B}}\ln2=9.57\times10^{-24}$ J/K, as in
the demon example.)
:::

**More information, less entropy.** Information is what removes uncertainty: the
information you gain is the drop in entropy it causes. So the larger the entropy, the
more uncertain the event, and the less information we have about it.

::: example Who stole the jewel?
A jewel is stolen. 100 people were at the scene. (1) What is the entropy of the event
"who stole the jewel"? (2) We learn that 50 of them are certainly innocent. (3) Then the
thief is found.
== (1) 100 suspects ==
$$S=k\ln100=\log_2100=6.64\ \text{bits}.$$
== (2) 50 cleared ==
$$S=k\ln50=\log_250=5.64\ \text{bits}.$$
The entropy fell by $k\ln100-k\ln50=k\ln2=1$ bit: halving the suspects is exactly one
bit of information.
== (3) The thief is known ==
$$S=k\ln1=0.$$
No uncertainty is left. Altogether the investigation gathered 6.64 bits of
information. The more we know, the smaller the information entropy and the more
certain the event.
:::

Outcomes are not always equally likely. Shannon's general definition, for outcomes
with probabilities $p_1, p_2, \dots$, takes the average of $-\log_2 p$ over them:

::: formula Shannon entropy (general) | 香农熵
$$H=-\sum_i p_i\log_2p_i\ \ \text{bits}$$
--
H | average uncertainty of the event (information entropy) | bit
p_i | probability of outcome $i$, with $\sum_i p_i=1$ | —
:::

For $N$ equally likely outcomes ($p_i=1/N$) this gives back $H=\log_2N$. Information
entropy measures the **average uncertainty** of a random event: the more uncertain, the
higher the entropy; the more certain, the lower. A coin shows it nicely: a fair coin
has 1 bit; a biased one is more predictable and carries less; a coin that always lands
heads carries none.

::: plot Information entropy of a coin that lands heads with probability p
x: 0.001 .. 0.999
xlabel: p
y: 0 .. 1.1
H(x) = -(x log(x) + (1 - x) log(1 - x)) / log(2)
:::

::: explore Bits needed to pick one of N equally likely outcomes
slider N: 1 .. 1000000 = 100 | | log | outcomes
H = ln(N) / ln(2) | bit | information entropy log₂ N
S = 1.38e-23 ln(N) | J/K | the same in thermodynamic units, k_B ln N
:::

## Prigogine's dissipative structures

Order does form by itself in nature, in the non-living world and the living one.
Snowflakes grow into six-fold patterns; heated from below, a thin layer of oil breaks up
into neat hexagonal convection cells (Bénard cells); certain chemical mixtures (the
Belousov–Zhabotinsky reaction) pulse between colours like a clock; plants and animals
build themselves from simple molecules.

::: define Self-organisation | 自组织
A system's spontaneous change, inside itself, from disorder to order, under suitable
outside conditions.
:::

This seems to clash with thermodynamics. Two pictures stand side by side:

| Aspect | Clausius's thermodynamics | Darwin's evolution |
|---|---|---|
| Direction | initial → final state: order → disorder, non-equilibrium → equilibrium | single cells → humans (extremely ordered) |
| Entropy | increases; energy degrades | decreases: ever more complex, ever more ordered |
| Tendency | an isolated system becomes uniform and simple, differences are wiped out ("degradation") | evolution ("progress") |

The Belgian scientist Ilya Prigogine reconciled them with his theory of
{{term dissipative structures | 耗散结构}}, put forward in 1967; it opened a window from the
physical sciences to the life sciences, and won him the Nobel Prize (in chemistry) in
1977. The key is to split the entropy change of an **open** system into two parts.

::: define Entropy production and entropy flow | 熵产生与熵流
For an open system, $\mathrm{d}_iS$ is the **entropy production**, the entropy created by
irreversible processes inside the system; always $\mathrm{d}_iS\ge0$. $\mathrm{d}_eS$ is the
**entropy flow**, the entropy change caused by exchanging energy and matter with the
surroundings; it can be negative (a **negative entropy flow**, 负熵流), zero or positive.
:::

::: formula Entropy balance of an open system | 开放系统的熵变
$$\mathrm{d}S=\mathrm{d}_iS+\mathrm{d}_eS,\qquad\mathrm{d}_iS\ge0$$
--
\mathrm{d}S | total entropy change of the system | J/K
\mathrm{d}_iS | entropy production inside the system (never negative) | J/K
\mathrm{d}_eS | entropy flow from exchange with the surroundings (any sign) | J/K
:::

For an isolated system $\mathrm{d}_eS=0$, so $\mathrm{d}S=\mathrm{d}_iS\ge0$: the
entropy-increase principle again. For an open system there are two cases:

1. **Negative entropy flow larger than the production**: $\mathrm{d}_eS<0$ and
   $|\mathrm{d}_eS|>\mathrm{d}_iS$. Then $\mathrm{d}S<0$: the system's entropy falls, it
   becomes more ordered, and self-organisation can happen.
2. **Positive entropy flow**: $\mathrm{d}_eS>0$. Then $\mathrm{d}S>0$: the system becomes
   more disordered, and self-organisation cannot happen.

An ordered structure that is kept up this way, by continually taking in energy or
matter from outside and dissipating it, is a dissipative structure. It is not a
frozen, equilibrium order like a crystal's: stop the flow and it falls apart.

::: law Conditions for a dissipative structure | 自组织形成有序结构的条件
An ordered structure (a dissipative structure) can form by self-organisation only when
1. the system is **open**;
2. it is **far from equilibrium**, in the non-linear region;
3. the outside supplies the trigger: the system **dissipates energy or matter** from
   outside;
4. there are complex **non-linear coherent effects** inside it, such as positive and
   negative feedback, which make its parts act together and turn chaos into order;
5. there are **fluctuations**, small random deviations that set the new order going.
:::

::: callout note Bifurcations and chaos
The slide shows a **bifurcation diagram**. As a control parameter $\lambda$ (how hard the
system is driven) increases, a single steady state $a_1$ becomes unstable and splits into
two ($b_1$, $b_2$), these split again ($c_1$, $c_2$, …), and so on, faster and faster
(period doubling), until beyond a value $\lambda_\infty$ the behaviour becomes chaotic
(混沌状态). Which branch the system takes at each split is decided by a fluctuation:
this is how condition 5 enters. Driven harder still, an ordered structure can thus give
way to chaos.
:::

::: example A Bénard cell's entropy books
A thin layer of oil is heated from below by a hot plate at $T_1=350\ \mathrm{K}$ and
cooled at the top by air at $T_2=300\ \mathrm{K}$. In steady convection a heat of
$Q=6.0\ \mathrm{J}$ passes through the layer every second, and its own entropy stays
constant. Find the entropy flow into the oil, its entropy production per second, and
the entropy the surroundings gain.
== Entropy flow ==
Heat $Q$ enters at 350 K, carrying in $Q/T_1$, and leaves at 300 K, carrying out
$Q/T_2$:
$$\mathrm{d}_eS=\frac{Q}{T_1}-\frac{Q}{T_2}=\frac{6.0}{350}-\frac{6.0}{300}=0.01714-0.02000=-2.9\times10^{-3}\ \mathrm{J/K}$$
per second: a **negative** entropy flow.
== Entropy production ==
The oil is in a steady state, so $\mathrm{d}S=0$ and
$$\mathrm{d}_iS=-\mathrm{d}_eS=+2.9\times10^{-3}\ \mathrm{J/K}$$
per second, made by the irreversible heat conduction and fluid friction inside.
== The surroundings ==
The hot plate loses $6.0/350$ and the air gains $6.0/300$, so the surroundings gain
$2.9\times10^{-3}$ J/K per second. The ordered cells are paid for by an entropy increase
outside: overall, entropy still grows.
:::

## Life entropy

A living organism is the most striking dissipative structure. Treat it as an open
system:

| Flow | Goes in | Comes out |
|---|---|---|
| Matter | carbohydrates (food), clean water, oxygen | CO₂, waste water, excreta |
| Energy | chemical energy | work, heat |
| Entropy | low entropy ("negative entropy") | high entropy |

Life is a dissipative process. High entropy means disorder, and complete thermal
equilibrium means death; to stay alive, the body must keep itself in a low-entropy
state. The stages of a life can be read off the entropy balance, with a negative
entropy flow $\mathrm{d}_eS<0$:

| Stage | Condition | Meaning |
|---|---|---|
| Growth (生长阶段) | $\lvert\mathrm{d}_eS\rvert>\mathrm{d}_iS$, so $\mathrm{d}S<0$ | order increases: from one order to a higher one |
| Maturity (成熟阶段) | $\lvert\mathrm{d}_eS\rvert=\mathrm{d}_iS$, so $\mathrm{d}S=0$ | an order is maintained |
| Decline (衰亡阶段) | $\lvert\mathrm{d}_eS\rvert<\mathrm{d}_iS$, so $\mathrm{d}S>0$ | order falls; when entropy piles up locally or for a while, the organism is ill |

From the physicist's point of view, then, the aim of medical treatment is to remove the
accumulated entropy. Schrödinger said that life lives on negative entropy; Boltzmann
had already written that the struggle of living things for existence is not a struggle
for matter, nor for energy, but for entropy. And one rule always holds: **an organism
takes in negative entropy only at the price of a larger entropy increase somewhere
else**, in its food, its surroundings, and ultimately the Sun.

::: example A person's entropy export
A resting adult turns food energy into heat at about $100\ \mathrm{W}$, given off from a
body at $37\ ^\circ\mathrm{C}$ to a room at $20\ ^\circ\mathrm{C}$. How much entropy does the
room gain in one day?
== Heat given off ==
$$Q=Pt=100\times86400=8.64\times10^6\ \mathrm{J}.$$
== Entropy given to the room ==
The room, at $T=293\ \mathrm{K}$, takes in this heat:
$$\Delta S_{\text{room}}=\frac{Q}{T}=\frac{8.64\times10^6}{293}=2.95\times10^4\ \mathrm{J/K}.$$
== Where it comes from ==
Only $Q/310=2.79\times10^4$ J/K of it leaves the body with the heat; the rest,
$1.6\times10^3$ J/K, is made as the heat crosses from 37 °C to 20 °C. The body's own entropy
stays roughly constant (an adult is in the "mature" stage). The entropy produced inside
by metabolism is carried away with the heat and the high-entropy waste; the food came in
with low entropy. So the person stays ordered, and the surroundings pay.
:::

## Energy degradation

The second law can also be read from the point of view of **using** energy. Look again
at the three processes from Lesson 3.3:

- **Work turning into heat**: mechanical (or electrical) work, ordered motion, becomes
  thermal energy, disordered motion.
- **Heat conduction**: two blocks at $T_1$ and $T_2$ end at one $T$; the kinetic energy
  goes from a more ordered distribution to a more disordered one.
- **Free expansion**: the positions go from more ordered to more disordered.

In each, the total energy is unchanged, yet afterwards less of it can be turned into
work. The hot and cold blocks could have run a heat engine; at one temperature, they
cannot. So:

::: law Direction of natural processes (energy view) | 热力学第二定律的实质（能量利用角度）
Every natural process goes in the direction in which the **unavailability** of energy
increases: part of the energy loses its ability to do work.
:::

::: define Energy degradation | 能量退降
The first law says that after a real process the total amount of energy is unchanged.
The second law says that although energy can be converted, it cannot be used 100%:
in every irreversible process part of the energy loses its ability to do work. This
loss is **energy degradation**. Its amount is proportional to the entropy increase.
:::

The proportionality can be made exact. If the coldest place you can dump heat into is
the environment at $T_0$, an irreversible process that increases the total entropy by
$\Delta S$ throws away the chance of doing work $T_0\Delta S$:

::: formula Energy degraded | 退降的能量
$$E_{\text{d}}=T_0\,\Delta S$$
--
E_{\text{d}} | energy that has lost its ability to do work | J
T_0 | temperature of the coldest available reservoir (the environment) | K
\Delta S | total entropy increase in the irreversible process (system and surroundings) | J/K
:::

::: example Heat leaking from a hot reservoir to a cold one
$Q=1000\ \mathrm{J}$ of heat leaks straight from a reservoir at $T_1=600\ \mathrm{K}$ to
the environment at $T_0=300\ \mathrm{K}$. How much energy has been degraded?
== Before: what the heat could have done ==
Run through a Carnot engine (Lesson 2.5) between 600 K and 300 K, the heat could have
given
$$A_{\max}=Q\left(1-\frac{T_0}{T_1}\right)=1000\times\left(1-\frac{300}{600}\right)=500\ \mathrm{J}.$$
At 300 K, the same heat can give no work at all.
== By the entropy ==
$$\Delta S=\frac{Q}{T_0}-\frac{Q}{T_1}=\frac{1000}{300}-\frac{1000}{600}=1.67\ \mathrm{J/K},\qquad E_{\text{d}}=T_0\Delta S=300\times1.67=500\ \mathrm{J}.$$
Both ways, 500 J have lost their ability to do work, though none of the 1000 J has
disappeared.
:::

**The quality of energy.** Energy comes in different "qualities":

- Energy of strongly structured or **ordered** motion is **high-quality** energy; energy
  that is poorly structured, with high entropy, is **low-quality**.
- Heat and work of the same amount are not of the same "quality": **work is the highest
  quality**, since it can all be turned into anything else.
- Heat from a hot reservoir and the same amount from a cooler one are not equal either:
  **heat at a higher temperature has higher quality**; it can do more work. The fraction
  of heat at $T$ that could become work, with the environment at $T_0$, is the Carnot
  factor $1-T_0/T$:

::: plot How much of the heat at T could become work (environment at T₀)
x: 200 .. 3000
xlabel: T (K)
y: 0 .. 1
f(x) = max(0, 1 - T0 / x)
slider T0: 200 .. 400 = 300 | K | environment
:::

- Energy going from high quality to low quality is a **spontaneous** process; the
  reverse needs something else to pay for it.

So: **entropy measures how unavailable energy has become**. We never run out of energy
(the first law guarantees that); what we use up is its quality, its low entropy. An
energy crisis is really an **entropy crisis**. Saving energy, cutting emissions, the
circular economy and sustainable development are all ways of **slowing down the
growth of entropy**.

::: callout pitfall "Using up energy"
Energy is never used up or destroyed: a power station's fuel, a car's petrol and your
lunch all end as the same amount of energy, mostly heat in the environment. What is
lost is the *ability to do work*, measured by $T_0\Delta S$. Saying "energy is
conserved, so why save it?" mixes up the first law with the second.
:::

::: callout exam What to remember for the exam
This topic is enrichment, so expect concepts rather than long calculations: why life
doesn't break the second law (open system, $\mathrm{d}S=\mathrm{d}_iS+\mathrm{d}_eS$, negative
entropy flow), the conditions for a dissipative structure, what Maxwell's demon does and
why information matters, $S=k\ln N$ and bits, and energy degradation (work is
high-quality energy; entropy measures how unavailable energy is).
:::

::: cards Entropy beyond heat
Why living things don't break the second law :: They are open systems: they take in low-entropy matter and energy and give out high-entropy ones, so their own entropy can stay low
Schrödinger, 1944, *What Is Life?* :: Life feeds on negative entropy: metabolism takes in low-entropy and gives out high-entropy matter
Heat death (热寂说) :: Applying the two laws to the universe as an isolated system: energy constant, entropy tends to a maximum, everything at one temperature and still
Maxwell's demon (麦克斯韦妖), 1871 :: A being that lets fast molecules one way and slow ones the other, making a temperature difference without work, by using information
Why Maxwell's demon doesn't break the second law :: Gaining and especially erasing information costs entropy: at least $k\ln2$ per bit (Landauer), so the total still grows
Information entropy (信息熵) :: $S=k\ln N=-k\ln P$ for $N$ equally likely outcomes; with $k=1/\ln2$ bit, $S=\log_2N$ bits (Shannon, 1948)
One bit (比特) :: The information needed to choose between two equally likely, unrelated possibilities; one of $2^H$ needs $H$ bits
Information and entropy :: The more information, the smaller the information entropy and the more certain the event
Self-organisation (自组织) :: A system's spontaneous change from disorder to order under suitable outside conditions
Entropy balance of an open system :: $\mathrm{d}S=\mathrm{d}_iS+\mathrm{d}_eS$, production $\mathrm{d}_iS\ge0$, flow $\mathrm{d}_eS$ of any sign
Conditions for a dissipative structure (耗散结构) :: Open; far from equilibrium; dissipating outside energy or matter; non-linear coherent effects (feedback); fluctuations
Life stages by entropy :: Growth $\lvert\mathrm{d}_eS\rvert>\mathrm{d}_iS$ ($\mathrm{d}S<0$); maturity $=$ ($\mathrm{d}S=0$); decline $<$ ($\mathrm{d}S>0$)
Energy degradation (能量退降) :: In irreversible processes part of the energy loses its ability to do work; the loss is $T_0\Delta S$, proportional to the entropy increase
Quality of energy :: Work is highest; heat at a higher temperature is better than at a lower one; high to low quality is spontaneous
"An energy crisis is an entropy crisis" :: Energy is conserved; what runs out is low entropy, the ability to do work
:::

::: quiz Check yourself
? A number is one of 64 equally likely possibilities. How many bits of information are needed to pin it down?
answer: 6
> $64=2^6$, so $S=\log_264=6$ bits: each yes/no answer that halves the possibilities
> gives 1 bit, and six halvings leave one.

? A jewel was stolen with 100 people at the scene. What is the information entropy of "who stole it", in bits?
answer: ln(100)/ln(2)
tolerance: 1%
> $S=k\ln100$ with $k=1/\ln2$ bit: $S=\log_2100=6.64$ bits.

? Then 50 of the 100 are shown to be innocent. How many bits of information did that give?
answer: 1
> The entropy drops from $k\ln100$ to $k\ln50$, a fall of $k\ln2=1$ bit: halving the
> possibilities is one bit.

? For an open system with entropy production $\mathrm{d}_iS$ and entropy flow $\mathrm{d}_eS$, when does its entropy decrease?
- [ ] Whenever $\mathrm{d}_eS<0$
- [x] When $\mathrm{d}_eS<0$ and $\lvert\mathrm{d}_eS\rvert>\mathrm{d}_iS$
- [ ] When $\mathrm{d}_iS<0$
- [ ] Never: entropy always increases
> $\mathrm{d}S=\mathrm{d}_iS+\mathrm{d}_eS$ with $\mathrm{d}_iS\ge0$. A negative flow is
> needed and it must outweigh the production. $\mathrm{d}_iS$ is never negative, and
> "entropy always increases" holds only for isolated systems.

? Which is **not** a condition for a dissipative structure to form?
- [ ] The system is open
- [x] The system is close to equilibrium
- [ ] The system has non-linear interactions such as feedback
- [ ] There are fluctuations
> It must be **far** from equilibrium, in the non-linear region; near equilibrium,
> disturbances just die away. The other three are on the list, along with dissipating
> energy or matter from outside.

? An organism is in its growth stage. Which holds?
- [x] $\lvert\mathrm{d}_eS\rvert>\mathrm{d}_iS$ and $\mathrm{d}S<0$
- [ ] $\lvert\mathrm{d}_eS\rvert=\mathrm{d}_iS$ and $\mathrm{d}S=0$
- [ ] $\lvert\mathrm{d}_eS\rvert<\mathrm{d}_iS$ and $\mathrm{d}S>0$
- [ ] $\mathrm{d}_eS>0$ and $\mathrm{d}S>0$
> Growth means order increases, so the entropy must fall: the negative entropy flow
> outweighs the production. Equality is maturity; the third is decline.

? Why doesn't Maxwell's demon break the second law?
- [ ] Because the trapdoor always has friction
- [ ] Because molecules can't be told apart by speed
- [x] Because getting and erasing the information it uses produces at least as much entropy as the sorting removes
- [ ] Because the second law doesn't apply to gases
> The demon is part of the system. Its information has an entropy cost: erasing one bit
> gives off at least $kT\ln2$ of heat (Landauer), so the total entropy of gas, demon and
> surroundings does not decrease.

? What is the least heat that must be given off to erase one bit of memory at 300 K?
answer: k_B * 300 * ln(2) J
> Landauer's limit: $Q_{\min}=kT\ln2=1.38\times10^{-23}\times300\times0.693=2.87\times10^{-21}\ \mathrm{J}$.

? 1000 J of heat leaks from a reservoir at 600 K to the environment at 300 K. How much energy has been degraded (lost its ability to do work)?
answer: 500 J
> $\Delta S=1000/300-1000/600=1.67$ J/K and $E_{\text{d}}=T_0\Delta S=300\times1.67=500$ J,
> the same as the work a Carnot engine could have given, $1000(1-300/600)=500$ J.

? A resting person gives off 100 W of heat to a room at 293 K. How much entropy does the room gain in one hour?
answer: 100 * 3600 / 293 J/K
> $Q=100\times3600=3.6\times10^5$ J, and $\Delta S=Q/T=3.6\times10^5/293=1.23\times10^3$ J/K.

? Which form of energy has the highest "quality"?
- [x] 1000 J of work
- [ ] 1000 J of heat from a reservoir at 1000 K
- [ ] 1000 J of heat from a reservoir at 400 K
- [ ] They are all the same, since energy is conserved
> Work can be turned into anything, entirely. Heat can only partly become work, a
> fraction $1-T_0/T$, which is larger at higher $T$. The amounts are equal; the quality
> is not.
:::

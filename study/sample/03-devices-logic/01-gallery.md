---
title: Parts and logic gallery
zh: 器件与逻辑示例
summary: Every kind of part a schematic can show, gate symbols, a Karnaugh map, the logic lab, and the probability figures (Venn diagrams, distribution bars, shaded regions).
source: Written for the study platform
---

## Diodes and sources

A half-wave rectifier: the diode passes the positive half of the AC input.

::: circuit Half-wave rectifier
A1 0,4 0,0 u2
D1 0,0 4,0 1N4007
R1 4,0 4,4 RL
W 0,4 4,4
G 0,4
label uo 4,0
:::

A Zener regulator, and a switch:

::: circuit Zener regulator
V1 0,4 0,0 12V
S1 0,0 2,0 closed
R1 2,0 6,0 1k
Z1 6,4 6,0 6V
W 0,4 6,4
G 0,4
:::

## Transistors and op-amps

::: circuit Common-emitter amplifier
R1 4,0 4,4 Rb
R2 8,0 8,4 Rc
Q1 npn 4,6 β=50
W 4,0 8,0
W 6,4 8,4
W 4,4 4,6
W 6,8 6,10
G 6,10
label +VCC 8,0
label uo 8,4
:::

::: circuit FETs and an op-amp
M1 nmos 2,2
M2 njfet 8,2
U1 opamp 12,2
:::

## Gates

::: gates
and or not nand nor xor xnor
:::

## A Karnaugh map

::: kmap Y
vars: A B C D
ones: 0 2 5 7 8 10 13 15
group: B D
group: B' D'
:::

## The logic lab

::: logic Exclusive OR from basic gates
inputs: A B
Y = A B' + A' B
Z = A ⊕ B
:::

## Events as sets

Shading what an expression in events means, one panel per expression:

::: venn De Morgan's law: the two panels agree
shade: (A ∪ B)'
shade: A'B'
:::

::: venn Three events
sets: A B C
shade: A - B
shade: AB ∪ C
:::

## Distributions

Bars stand at whole numbers; a curve can run over them.

::: plot Binomial B(n, p) and its Poisson approximation
x: 0 .. 15
xlabel: k
bars P(k) = comb(n, k) p^k (1 - p)^(n - k)
bars Q(k) = e^(-n p) (n p)^k / k!
slider n: 1 .. 60 = 30 | | step 1
slider p: 0.01 .. 0.5 = 0.1
:::

::: plot The normal density and Φ
x: -4 .. 4
f(x) = e^(-x^2/2) / sqrt(2 pi)
F(x) = Phi(x)
:::

## Regions

::: plot Where 0 < y < x < 1, and below x + y = z
x: 0 .. 1.2
y: 0 .. 1.2
region G: 0 < y < x < 1
region H: 0 < y < x < 1, x + y <= z
f(x) = x
g(x) = z - x
slider z: 0 .. 2 = 1
:::

## p–V diagrams

Processes are drawn from their equations, so the end states must fit them:

::: pv A Carnot cycle of air (γ = 1.4)
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

::: pv Work in an isobaric expansion, and an isotherm for comparison
axes: V (L), p (kPa)
a: V 2, p 300
b: V 6, p 300
c: V 6, p 100
a -> b: isobaric
a -> c: isothermal dashed
shade: a -> b
:::

::: quiz Worked-out answers
? Three cards from ten, four of them red. The chance that all three are red?
answer: C(4,3)/C(10,3)
> $\binom43/\binom{10}3 = 4/120 = 1/30$; typing 1/30 or 0.0333 is right too.

? $P\{|X-\mu| < 3\sigma\}$ for a normal $X$?
answer: 2 Phi(3) - 1
tolerance: 0.0001
> $2\Phi(3) - 1 \approx 0.9973$.
:::


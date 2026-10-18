---
title: Parts and logic gallery
zh: 器件与逻辑示例
summary: Every kind of part a schematic can show, plus gate symbols, a Karnaugh map and the logic lab.
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

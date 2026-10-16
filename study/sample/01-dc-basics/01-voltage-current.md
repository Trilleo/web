---
title: Voltage and current
zh: 电压与电流
summary: What voltage and current are, how they're measured, and which way they point.
source: Sample lecture 1
---

## Current

A {{term current | 电流}} is a flow of charge. Its size is how much charge passes a
point each second.

::: define Current | 电流
The rate at which charge flows past a point: $i = \dfrac{\d q}{\d t}$, measured in
amperes (A). One ampere is one coulomb per second.
:::

The direction we call positive is a choice, the {{term reference direction | 参考方向}}.
If the real current flows the other way, the number comes out negative; nothing
else changes.

## Voltage

::: define Voltage | 电压
The energy each unit of charge gains or loses between two points:
$u_{ab} = \dfrac{\d w}{\d q}$, measured in volts (V).
:::

::: callout pitfall Signs
$u_{ab}$ is the voltage of $a$ *relative to* $b$, so $u_{ba} = -u_{ab}$. Write the
subscripts every time until it's a habit.
:::

## Power

::: formula Power | 功率
$$p = u\,i$$
--
p | power absorbed (with associated reference directions) | W
u | voltage across the part | V
i | current through it, + to − | A
:::

With current flowing *into* the + end (associated directions, {{zh 关联参考方向}}), a
positive $p$ means the part absorbs power; a negative one means it supplies it.

::: cards Units
Unit of current? :: The ampere, A (安培)
Unit of voltage? :: The volt, V (伏特)
$1\ \text{mA}$ in amperes? :: $10^{-3}$ A
:::

::: quiz Check yourself
? A part has 5 V across it and 2 A flowing into its + end. How much power does it absorb?
answer: 10 W
> $p = ui = 5 \times 2 = 10$ W, positive: it absorbs power.

? Which are true of $u_{ab}$?
- [x] $u_{ab} = -u_{ba}$
- [ ] It's always positive
- [x] It's measured in volts

? What do we call the direction chosen as positive for a current?
text: reference direction | the reference direction | 参考方向
:::

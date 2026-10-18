---
title: Algebraic simplification
zh: 公式化简法
summary: What the simplest sum-of-products form is, and how to reach it with the laws: combining, absorption, consensus, factor elimination, adding terms, and all of them together, including simplifying a product of sums through its dual.
source: 第3章 逻辑代数基础 3.4, 2026-10-08
---

Each term in a logic expression becomes a gate, and each variable in a term becomes a
gate input. A shorter expression is therefore a cheaper, faster, more reliable circuit
that does exactly the same job. This lesson turns the laws of the last lesson into a
toolkit for shortening expressions by hand. It takes practice, which is why the next
lesson brings a more mechanical method (Karnaugh maps); but the algebraic method works
for any number of variables, and exams expect both.

## What "simplest" means

From an expression you can draw its {{term logic diagram | 逻辑图}}: one gate per
operation, wired as the expression says. The simpler the expression, the fewer gates.
Simplification aims first at the simplest **sum of products** (AND-OR form,
与或式), because the other forms can be reached from it by the rules (for example,
double complement and De Morgan turn it into a NAND-NAND form).

::: define Minimal sum-of-products form | 最简与或式
An AND-OR expression is minimal when (1) it has the fewest possible product terms, and
(2) among those, each product has the fewest possible variables. Fewer terms means
fewer AND gates and a smaller OR gate; fewer variables means fewer gate inputs.
:::

::: example Why it pays
$Y = AB + A\overline{B} + \overline{A}B$ needs three 2-input ANDs, a 3-input OR and two
inverters. Simplify it.
== Duplicate a term (allowed, since $X + X = X$) ==
$Y = (AB + A\overline{B}) + (AB + \overline{A}B)$.
== Combine each pair ==
$= A + B$: one 2-input OR gate does the same job.
:::

The idea of the algebraic method, as the slides put it: apply the basic and common
formulas again and again to remove **redundant terms** and **redundant factors**. It is
"formulas plus technique": each method below is one formula used deliberately.

| Method                            | Formula used                                  | What it removes                               |
| --------------------------------- | --------------------------------------------- | --------------------------------------------- |
| Combining terms (并项法)          | $AB + A\overline{B} = A$                      | merges two terms into one, dropping a variable |
| Absorption (吸收法)               | $A + AB = A$                                  | a term containing another term                |
| Term elimination (消项法)         | $AB + \overline{A}C + BC = AB + \overline{A}C$ | a consensus term                             |
| Factor elimination (消因子法)     | $A + \overline{A}B = A + B$                   | a factor whose complement is a term           |
| Adding terms (配项法)             | $A + A = A$, $A + \overline{A} = 1$           | adds a copy or a $(A + \overline{A})$ factor to help the others |
| Combined (综合法)                  | all of them                                   |                                               |

::: callout tip $A$ can be anything
In every formula, $A$, $B$, $C$ may stand for whole expressions (the substitution rule).
Most of the skill is spotting that, say, $\overline{\overline{B}CD}$ and $\overline{B}CD$
are an "$X$ and $\overline{X}$" pair.
:::

## Combining terms

Two terms that are the same except for one factor, which appears as $X$ in one and
$\overline{X}$ in the other, merge: $PX + P\overline{X} = P$.

::: example Combining terms (例1)
Simplify:
$Y_1 = A\,\overline{\overline{B}CD} + A\overline{B}CD$,
$Y_2 = A\overline{B} + ACD + \overline{A}\,\overline{B} + \overline{A}CD$,
$Y_3 = \overline{A}B\overline{C} + A\overline{C} + \overline{B}\,\overline{C}$,
$Y_4 = B\overline{C}D + BC\overline{D} + B\overline{C}\,\overline{D} + BCD$.
== $Y_1$ ==
With $X = \overline{B}CD$, the two terms are $A\overline{X}$ and $AX$:
$Y_1 = A(\overline{X} + X) = A$.
== $Y_2$ ==
Pair the $\overline{B}$ terms and the $CD$ terms:
$Y_2 = (A + \overline{A})\overline{B} + (A + \overline{A})CD = \overline{B} + CD$.
== $Y_3$ ==
$Y_3 = \overline{A}B\overline{C} + (A + \overline{B})\overline{C}$. By De Morgan,
$A + \overline{B} = \overline{\overline{A}B}$, so
$Y_3 = \overline{A}B\,\overline{C} + \overline{\overline{A}B}\,\overline{C} = \overline{C}$.
== $Y_4$ ==
$Y_4 = B\overline{C}(D + \overline{D}) + BC(\overline{D} + D) = B\overline{C} + BC = B$.
:::

## Absorption

If one term contains another whole term as a factor, it disappears: $P + PQ = P$,
however complicated $Q$ is.

::: example Absorption (例2)
Simplify:
$Y_1 = (\overline{\overline{A}B} + C)ABD + AD$,
$Y_2 = AB + AB\overline{C} + ABD + AB(\overline{C} + \overline{D})$,
$Y_3 = (A + BC) + (A + BC)\big(\overline{A} + \overline{\overline{B}\,\overline{C} + D}\big)$.
== $Y_1$ ==
Both terms contain $AD$: $Y_1 = \big[(\overline{\overline{A}B} + C)B + 1\big]AD = AD$,
since anything $+ 1 = 1$. You never had to work out the messy bracket.
== $Y_2$ ==
Every term contains $AB$: $Y_2 = AB\big[1 + \overline{C} + D + (\overline{C} + \overline{D})\big] = AB$.
== $Y_3$ ==
With $P = A + BC$, $Y_3 = P + P(\ldots) = P = A + BC$.
:::

## Term elimination (consensus)

If two terms contain $X$ and $\overline{X}$, the product of their other factors (and any
term containing it) is redundant: $PX + Q\overline{X} + PQR = PX + Q\overline{X}$.

::: example Term elimination (例3)
Simplify:
$Y_1 = AC + A\overline{B} + \overline{B + C}$,
$Y_2 = A\overline{B}C\overline{D} + \overline{A\overline{B}}\,E + \overline{A}C\overline{D}E$,
$Y_3 = \overline{A}\,\overline{B}C + ABC + \overline{A}B\overline{D} + A\overline{B}\,\overline{D} + \overline{A}BC\overline{D} + BC\overline{D}\,\overline{E}$.
== $Y_1$ ==
De Morgan first: $\overline{B + C} = \overline{B}\,\overline{C}$, so
$Y_1 = AC + A\overline{B} + \overline{B}\,\overline{C}$. Now $AC$ and $\overline{B}\,\overline{C}$
contain $C$ and $\overline{C}$; their consensus is $A \cdot \overline{B} = A\overline{B}$, which
is the middle term. Delete it: $Y_1 = AC + \overline{B}\,\overline{C}$.
== $Y_2$ ==
Treat $X = A\overline{B}$ as one variable: the first two terms are $X \cdot C\overline{D}$ and
$\overline{X} \cdot E$. Their consensus is $C\overline{D}E$, and the third term
$\overline{A}C\overline{D}E$ contains it, so it goes:
$Y_2 = A\overline{B}C\overline{D} + \overline{A\overline{B}}\,E$.
== $Y_3$: group into XOR and XNOR ==
$\overline{A}\,\overline{B}C + ABC = (\overline{A}\,\overline{B} + AB)C = \overline{A \oplus B}\,C$ and
$\overline{A}B\overline{D} + A\overline{B}\,\overline{D} = (A \oplus B)\overline{D}$. The last two terms
are $(\overline{A}B + B\overline{E})C\overline{D}$.
== $Y_3$: eliminate ==
$\overline{A \oplus B}\,C$ and $(A \oplus B)\overline{D}$ are an "$\overline{X}P + XQ$" pair with
consensus $C\overline{D}$, and the last bracket contains $C\overline{D}$. So
$Y_3 = \overline{A \oplus B}\,C + (A \oplus B)\overline{D}$.
:::

## Factor elimination

If a term $P$ appears and another term contains $\overline{P}$ as a factor, delete that
factor: $P + \overline{P}Q = P + Q$.

::: example Factor elimination (例4)
Simplify $Y_1 = \overline{B} + ABC$, $Y_2 = A\overline{B} + B + \overline{A}B$ and
$Y_3 = AC + \overline{A}D + \overline{C}D$.
== $Y_1$ ==
The term $\overline{B}$ is present, so the factor $B$ in $ABC$ can go: $Y_1 = \overline{B} + AC$.
== $Y_2$ ==
The term $B$ removes the factor $\overline{B}$ from $A\overline{B}$:
$Y_2 = A + B + \overline{A}B$. Now the term $A$ removes $\overline{A}$ from
$\overline{A}B$, giving $A + B + B = A + B$.
== $Y_3$ ==
Factor the last two terms and use De Morgan:
$Y_3 = AC + (\overline{A} + \overline{C})D = AC + \overline{AC}\,D$. With $P = AC$:
$Y_3 = AC + D$.
:::

## Adding terms

Sometimes the formulas only apply after you **add** something: a copy of an existing
term ($X + X = X$, the idempotent law 重叠律) so it can be used twice, or a factor
$(X + \overline{X}) = 1$ to split a term in two.

::: example Adding terms (例5)
Simplify $Y = \overline{A}B\overline{C} + \overline{A}BC + ABC$.
== Spot the problem ==
$\overline{A}BC$ combines with $\overline{A}B\overline{C}$ (differs in $C$) *and* with $ABC$
(differs in $A$), but it can only be used once.
== Duplicate it ==
$Y = \overline{A}B\overline{C} + \overline{A}BC + \overline{A}BC + ABC$.
== Combine the two pairs ==
$Y = (\overline{A}B\overline{C} + \overline{A}BC) + (\overline{A}BC + ABC) = \overline{A}B + BC$.
:::

## Putting it together

Real problems need several methods in turn. A useful order: absorb what you can, remove
factors, absorb again, then look for consensus terms.

::: example Combined method (例6)
Simplify
$Y = AC + \overline{B}C + B\overline{D} + C\overline{D} + A(B + \overline{C}) + \overline{A}BC\overline{D} + A\overline{B}DE$.
== Absorption ==
$\overline{A}BC\overline{D}$ contains $C\overline{D}$, which is a term: delete it.
== Factor elimination ==
By De Morgan, $B + \overline{C} = \overline{\overline{B}C}$, so the fifth term is
$A\,\overline{\overline{B}C}$. Since $\overline{B}C$ is a term, $\overline{B}C + A\overline{\overline{B}C} = \overline{B}C + A$:
$Y = AC + \overline{B}C + B\overline{D} + C\overline{D} + A + A\overline{B}DE$.
== Absorption again ==
$A$ is now a term, so it absorbs $AC$ and $A\overline{B}DE$:
$Y = \overline{B}C + B\overline{D} + C\overline{D} + A$.
== Term elimination ==
$\overline{B}C$ and $B\overline{D}$ have consensus $C\overline{D}$: delete it.
$$Y = \overline{B}C + B\overline{D} + A$$
:::

Check the result: $Y$ (the original) and $Z$ (the simplified form) agree for all 32
input combinations.

::: logic Example 6: before and after
inputs: A B C D E
Y = A C + B' C + B D' + C D' + A (B + C') + A' B C D' + A B' D E
Z = B' C + B D' + A
:::

## Simplifying a product of sums through its dual

Our methods are built for sums of products. Given a **product of sums**
(或与式), take its dual (which is a sum of products), simplify that, and take the dual
again. The duality rule guarantees that the dual of the simplified dual equals the
original.

::: example Through the dual (例7)
Simplify $F = (\overline{B} + D)(\overline{B} + D + A + G)(C + E)(\overline{C} + G)(A + E + G)$.
== Take the dual ==
Swap $+ \leftrightarrow \cdot$:
$F^D = \overline{B}D + \overline{B}DAG + CE + \overline{C}G + AEG$.
== Absorption ==
$\overline{B}DAG$ contains $\overline{B}D$: delete it.
== Consensus ==
$CE$ and $\overline{C}G$ have consensus $EG$, and $AEG$ contains it: delete it.
$F^D = \overline{B}D + CE + \overline{C}G$.
== Dual again ==
$F = (F^D)^D = (\overline{B} + D)(C + E)(\overline{C} + G)$.
:::

::: logic Example 7: before and after
inputs: A B C D E G
F = (B' + D)(B' + D + A + G)(C + E)(C' + G)(A + E + G)
H = (B' + D)(C + E)(C' + G)
:::

::: callout pitfall Is it really minimal?
The algebraic method gives no signal that you have finished, and two people can stop at
different places. When no formula applies any more, check each term: can a variable be
removed (factor elimination), or is the term a consensus of two others? A Karnaugh map
(next lesson) settles it for up to four variables.
:::

::: callout key The one idea to remember
Each method is one formula: combine $PX + P\overline{X}$; absorb $P + PQ$; drop a consensus
term; drop a factor whose complement is a term; and duplicate a term or multiply by
$(X + \overline{X})$ when that lets the others apply.
:::

::: callout exam For the exam
Typical questions: simplify an expression by algebra and name the method at each step;
simplify a product of sums (often through its dual). Show each step and the formula.
:::

::: cards Algebraic simplification
Minimal sum-of-products form (最简与或式) :: Fewest product terms; then the fewest variables in each term.
Combining-terms method (并项法) uses … :: $AB + A\overline{B} = A$
Absorption method (吸收法) uses … :: $A + AB = A$
Term-elimination method (消项法) uses … :: the consensus theorem $AB + \overline{A}C + BC = AB + \overline{A}C$
Factor-elimination method (消因子法) uses … :: $A + \overline{A}B = A + B$
Adding-terms method (配项法) uses … :: $A + A = A$ (duplicate a term) and $A + \overline{A} = 1$ (split a term)
How do you simplify a product of sums with SOP methods? :: Take the dual, simplify it, take the dual again.
$\overline{B} + ABC$ simplifies to … :: $\overline{B} + AC$
$AC + \overline{A}D + \overline{C}D$ simplifies to … :: $AC + D$
:::

::: quiz Check yourself
? Simplify $Y = AB + A\overline{B}C + A\overline{B}\,\overline{C}$ to the fewest terms.
logic: A
> Combine the last two: $A\overline{B}C + A\overline{B}\,\overline{C} = A\overline{B}$. Then $AB + A\overline{B} = A$.

? Simplify $Y = A\overline{B} + ACD + \overline{A}\,\overline{B} + \overline{A}CD$ to the fewest terms.
logic: B' + C D
> $(A + \overline{A})\overline{B} + (A + \overline{A})CD = \overline{B} + CD$ (example 1, $Y_2$).

? Simplify $Y = AC + \overline{A}D + \overline{C}D$ to the fewest terms.
logic: A C + D
> $\overline{A}D + \overline{C}D = \overline{AC}\,D$, and factor elimination gives $AC + \overline{AC}D = AC + D$.

? Simplify $Y = \overline{A}B\overline{C} + \overline{A}BC + ABC$ to the fewest terms.
logic: A' B + B C
> Duplicate $\overline{A}BC$ and combine each pair: $\overline{A}B + BC$ (example 5). Two terms of two variables each; no further formula applies.

? Simplify $Y = AC + A\overline{B} + \overline{B + C}$ to the fewest terms.
logic: A C + B' C'
> De Morgan: $\overline{B+C} = \overline{B}\,\overline{C}$. The consensus of $AC$ and $\overline{B}\,\overline{C}$ is $A\overline{B}$, so that term goes.

? Which method removes $BC$ from $AB + \overline{A}C + BC$?
- [ ] Combining terms
- [ ] Absorption
- [x] Term elimination (consensus)
- [ ] Factor elimination
> $BC$ is the consensus of $AB$ and $\overline{A}C$, so the term-elimination (消项) method deletes it.

? Simplify $F = (A + B)(A + \overline{B})$ to the fewest terms.
logic: A
> Dual: $AB + A\overline{B} = A$; the dual of $A$ is $A$. (Or expand: $A + A\overline{B} + AB + B\overline{B} = A$.)

? Simplify $Y = A\overline{B} + B + \overline{A}B$ to the fewest terms.
logic: A + B
> The term $B$ removes $\overline{B}$ from $A\overline{B}$, giving $A + B + \overline{A}B$; then $A$ removes $\overline{A}$ from $\overline{A}B$: $A + B + B = A + B$.
:::

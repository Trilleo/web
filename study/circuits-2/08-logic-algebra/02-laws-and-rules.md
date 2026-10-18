---
title: Laws and rules of logic algebra
zh: 逻辑代数的基本定律和规则
summary: The basic laws (including 1 + 1 = 1, A + BC = (A + B)(A + C) and De Morgan's laws), the common formulas for combining, absorption, factor elimination and consensus with proofs, and the substitution, duality and complement rules.
source: 第3章 逻辑代数基础 3.3, 2026-09-29 → 10-08
---

The previous lesson gave us the operations; this one gives the rules for rewriting
expressions built from them. They are what lets you turn a long expression into a short
one (fewer gates), prove two circuits do the same thing, or find the complement of a
function. Most look like ordinary algebra, but a few do not, and those are exactly the
ones exams test.

## The basic laws

Every law here can be proved in one of two ways: by algebra from laws already proved,
or by a truth table. A truth table always works, because a variable has only two
values: check every row, and if both sides agree in all of them, the law holds.

| Law                                 | AND form                                        | OR form                                     |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Complement of constants (非律)      | $\overline{0} = 1$                              | $\overline{1} = 0$                          |
| Axioms (公理)                       | $0\cdot0 = 0$, $0\cdot1 = 1\cdot0 = 0$, $1\cdot1 = 1$ | $1+1 = 1$, $1+0 = 0+1 = 1$, $0+0 = 0$ |
| 0-1 laws (0-1律)                    | $A \cdot 0 = 0$, $A \cdot 1 = A$                | $A + 1 = 1$, $A + 0 = A$                    |
| Idempotent (重叠律)                 | $A \cdot A = A$                                 | $A + A = A$                                 |
| Complement (互补律)                 | $A \cdot \overline{A} = 0$                      | $A + \overline{A} = 1$                      |
| Commutative (交换律)                | $AB = BA$                                       | $A + B = B + A$                             |
| Associative (结合律)                | $(AB)C = A(BC)$                                 | $(A+B)+C = A+(B+C)$                         |
| Distributive (分配律)               | $A(B+C) = AB + AC$                              | $A + BC = (A+B)(A+C)$                       |
| De Morgan (德·摩根定律)             | $\overline{AB} = \overline{A} + \overline{B}$   | $\overline{A+B} = \overline{A}\,\overline{B}$ |
| Involution (还原律)                 | $\overline{\overline{A}} = A$                   |                                             |

::: callout pitfall Where logic algebra differs from ordinary algebra
The slides single these out: $\overline{0} = 1$ and $\overline{1} = 0$; $1 + 1 = 1$
(not 2); $A + A = A$ and $AA = A$ (there are no coefficients or powers: $2A$ and $A^2$
never appear); $A + 1 = 1$; and the second distributive law
$A + BC = (A+B)(A+C)$, which is false for ordinary numbers. Also, there is no
subtraction or division: you cannot "cancel" $A$ from both sides of $A + B = A + C$
(try $A = 1$: it holds for any $B$ and $C$).
:::

### The second distributive law

$A + BC = (A+B)(A+C)$ says OR distributes over AND, the mirror image of the familiar
$A(B+C) = AB + AC$. It is the law people forget, so prove it both ways.

::: law Second distributive law | 分配律
$A + BC = (A + B)(A + C)$, and more generally $A + BCD\cdots = (A+B)(A+C)(A+D)\cdots$
:::

::: example Proving $A + BC = (A+B)(A+C)$
Prove the second distributive law algebraically, then by truth table.
== Expand the right-hand side ==
$(A+B)(A+C) = AA + AB + AC + BC$ by the first distributive law.
== Use $AA = A$ and factor out $A$ ==
$= A + AB + AC + BC = A(1 + B + C) + BC$.
== Use $1 + \text{anything} = 1$ ==
$= A \cdot 1 + BC = A + BC$, the left-hand side.
== Check by truth table ==
| A B C | BC | A + BC | A + B | A + C | (A+B)(A+C) |
| ----- | --- | ------ | ----- | ----- | ---------- |
| 0 0 0 | 0  | 0      | 0     | 0     | 0          |
| 0 0 1 | 0  | 0      | 0     | 1     | 0          |
| 0 1 0 | 0  | 0      | 1     | 0     | 0          |
| 0 1 1 | 1  | 1      | 1     | 1     | 1          |
| 1 0 0 | 0  | 1      | 1     | 1     | 1          |
| 1 0 1 | 0  | 1      | 1     | 1     | 1          |
| 1 1 0 | 0  | 1      | 1     | 1     | 1          |
| 1 1 1 | 1  | 1      | 1     | 1     | 1          |

The A + BC and (A+B)(A+C) columns agree in every row, so the law holds.
:::

You can run the same check yourself: $Y$ and $Z$ below always agree.

::: logic The second distributive law
inputs: A B C
Y = A + B C
Z = (A + B)(A + C)
:::

### De Morgan's laws

**Intuition.** "It is not the case that both $A$ and $B$ are true" means the same as "at
least one of them is false". And "neither $A$ nor $B$" means "not $A$ and not $B$".
Breaking a bar over a product or a sum flips the operation underneath.

::: law De Morgan's laws | 德·摩根定律
$\overline{A \cdot B} = \overline{A} + \overline{B}$ and $\overline{A + B} = \overline{A} \cdot \overline{B}$.
They extend to any number of variables: $\overline{ABC\cdots} = \overline{A} + \overline{B} + \overline{C} + \cdots$ and $\overline{A + B + C + \cdots} = \overline{A}\,\overline{B}\,\overline{C}\cdots$.
:::

In gate terms: a NAND is the same as an OR of inverted inputs, and a NOR is the same as
an AND of inverted inputs. Switch through the four rows: $Y = Z$ and $U = V$ every time.

::: logic De Morgan's laws side by side
inputs: A B
Y = (A B)'
Z = A' + B'
U = (A + B)'
V = A' B'
:::

::: callout pitfall Breaking a bar
$\overline{AB}$ is **not** $\overline{A}\,\overline{B}$, and $\overline{A+B}$ is not
$\overline{A} + \overline{B}$. When you break the bar, the operation underneath must
flip (AND ↔ OR). Check with $A = 1$, $B = 0$: $\overline{AB} = \overline{0} = 1$, but
$\overline{A}\,\overline{B} = 0 \cdot 1 = 0$.
:::

## Common formulas

Four more results come up so often in simplification that they have names. Each has a
dual form (the next section explains duals), shown on the right.

| Name                       | Formula                                                    | Dual form                                                        |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Combining (合并律)         | $AB + A\overline{B} = A$                                   | $(A+B)(A+\overline{B}) = A$                                      |
| Absorption (吸收律)        | $A + AB = A$                                               | $A(A+B) = A$                                                     |
| Factor elimination (消因律) | $A + \overline{A}B = A + B$; $\overline{A} + AB = \overline{A} + B$ | $A(\overline{A}+B) = AB$; $\overline{A}(A+B) = \overline{A}B$ |
| Consensus (包含律)         | $AB + \overline{A}C + BC = AB + \overline{A}C$             | $(A+B)(\overline{A}+C)(B+C) = (A+B)(\overline{A}+C)$             |

::: law Combining law | 合并律
$AB + A\overline{B} = A$. Two products that are the same except that one variable appears
plain in one and complemented in the other merge into one product without that variable.
:::

Proof: $AB + A\overline{B} = A(B + \overline{B}) = A \cdot 1 = A$. Intuitively: if $A$ is
true, the sum is true whatever $B$ is, so $B$ doesn't matter.

::: law Absorption law | 吸收律
$A + AB = A$. A product that contains another whole term of the sum is absorbed by it.
:::

Proof: $A + AB = A(1 + B) = A$. Intuitively: whenever $AB$ is 1, $A$ is already 1, so
$AB$ adds nothing.

::: law Factor-elimination law | 消因律
$A + \overline{A}B = A + B$. If a term's complement appears as a factor in another
product, that factor can be deleted.
:::

::: example Proving the factor-elimination law
Show that $A + \overline{A}B = A + B$.
== Apply the second distributive law ==
With $A + XY = (A+X)(A+Y)$, $X = \overline{A}$, $Y = B$:
$A + \overline{A}B = (A + \overline{A})(A + B)$.
== Simplify ==
$= 1 \cdot (A + B) = A + B$.
== Why it makes sense ==
The $\overline{A}$ in $\overline{A}B$ only matters when $A = 0$; but then the first term
is 0 anyway, so the second term may just as well be $B$.
:::

The other form, $\overline{A} + AB = \overline{A} + B$, is the same law with $A$ replaced by
$\overline{A}$.

### The consensus theorem

**Intuition.** In $AB + \overline{A}C$, one term needs $A$ and the other needs
$\overline{A}$. If $B$ and $C$ are both 1, then whichever value $A$ has, one of the two
terms is already 1. So a third term $BC$ never changes the result: it is redundant.

::: law Consensus theorem | 包含律
$AB + \overline{A}C + BC = AB + \overline{A}C$. If two products contain a variable and its
complement ($A$ and $\overline{A}$), the product of their remaining factors ($BC$, the
*consensus term*) is redundant, and so is any product that contains it:
$AB + \overline{A}C + BCD\cdots = AB + \overline{A}C$.
Also called the redundancy law (冗余定律) or redundant-term theorem (多余项定理).
:::

::: example Proving the consensus theorem
Prove $AB + \overline{A}C + BC = AB + \overline{A}C$.
== Multiply the consensus term by 1 ==
$BC = (A + \overline{A})BC = ABC + \overline{A}BC$, so the left side is
$AB + \overline{A}C + ABC + \overline{A}BC$.
== Group and factor ==
$= AB(1 + C) + \overline{A}C(1 + B)$.
== Finish ==
$= AB + \overline{A}C$. The same steps with $BCD\cdots$ in place of $BC$ prove the
general form.
:::

::: logic The consensus term changes nothing
inputs: A B C
Y = A B + A' C + B C
Z = A B + A' C
:::

::: callout tip Spotting the consensus
Look for a variable that appears plain in one term and complemented in another
($A$ in $AB$, $\overline{A}$ in $\overline{A}C$). Multiply what is left of those two
terms ($B \cdot C$): any other term that contains that product can be deleted.
:::

## The three rules

Laws are about particular expressions. The three rules below are ways of making new
true equations out of ones we already have.

### Substitution

::: define Substitution rule | 代入规则
In any equation containing a variable $A$, replacing **every** occurrence of $A$ by the
same logic function leaves an equation that is still true. (代入定理)
:::

This is why every law holds for whole expressions, not just single letters.

::: example Substituting into De Morgan's law
Starting from $\overline{A \cdot B} = \overline{A} + \overline{B}$, set $A = X + Y$.
== Replace every $A$ ==
$\overline{(X + Y) \cdot B} = \overline{X + Y} + \overline{B}$.
== Keep going if you like ==
Apply De Morgan again to $\overline{X+Y}$: the result is
$\overline{X}\,\overline{Y} + \overline{B}$.
:::

### Duality

::: define Dual | 对偶式
The dual $Y^D$ of an expression $Y$ is what you get by swapping every $+$ with $\cdot$
and every 0 with 1, leaving the variables (and their bars) as they are.
:::

::: law Duality rule | 对偶规则
If two expressions are equal, their duals are equal too. (对偶定理)
:::

This halves what you need to prove and remember: every law comes in a pair. The first
distributive law $A(B+C) = AB + AC$ dualises to $A + BC = (A+B)(A+C)$; that is where the
"strange" second law comes from. The table lists the basic formulas in dual pairs
(numbers as on the slides; 8, 17 and 18 are the ones highlighted, De Morgan's laws and
the second distributive law):

| No. | Formula                           | No. | Dual formula                       |
| --- | --------------------------------- | --- | ---------------------------------- |
|     |                                   | 10  | $\overline{1} = 0$; $\overline{0} = 1$ |
| 1   | $0 \cdot A = 0$                   | 11  | $1 + A = 1$                        |
| 2   | $1 \cdot A = A$                   | 12  | $0 + A = A$                        |
| 3   | $A \cdot A = A$                   | 13  | $A + A = A$                        |
| 4   | $A \cdot \overline{A} = 0$        | 14  | $A + \overline{A} = 1$             |
| 5   | $AB = BA$                         | 15  | $A + B = B + A$                    |
| 6   | $A(BC) = (AB)C$                   | 16  | $A + (B+C) = (A+B)+C$              |
| 7   | $A(B+C) = AB + AC$                | 17  | $A + BC = (A+B)(A+C)$              |
| 8   | $\overline{AB} = \overline{A} + \overline{B}$ | 18 | $\overline{A+B} = \overline{A}\,\overline{B}$ |
| 9   | $\overline{\overline{A}} = A$     |     |                                    |

### The complement (inversion) rule

::: law Complement rule | 反演规则
To get the complement $\overline{Y}$ of an expression $Y$: swap every $+$ with $\cdot$,
every 0 with 1, and every true variable with its complement (原变量 ↔ 反变量). (反演定理)
:::

It is De Morgan's law applied all at once, and it saves many steps. It differs from the
dual only in the third swap: the dual keeps variables as they are, the complement flips
them.

::: callout pitfall Two cautions for duals and complements
1. **Keep the order of operations.** If $AB$ was worked out first in the original, it
   must still be worked out first: put brackets in. The complement of $AB + C$ is
   $(\overline{A} + \overline{B})\,\overline{C}$, not $\overline{A} + \overline{B}\,\overline{C}$.
2. **Bars over more than one variable stay as they are.** Only single variables are
   flipped; a long bar stays, and you apply the swaps underneath it.
:::

::: example The complement of a function with long bars
Find $\overline{Y}$ for $Y = \overline{\overline{A\overline{B} + C} + D} + C$.
== Work from the inside ==
Under the inner long bar is $A\overline{B} + C$. Swapping $\cdot \leftrightarrow +$ and
flipping each variable gives $(\overline{A} + B)\cdot\overline{C}$ (brackets keep the
order). The long bar over it stays.
== Next level ==
Under the outer long bar we had $\overline{\,\cdots\,} + D$; this becomes
$\overline{(\overline{A}+B)\overline{C}} \cdot \overline{D}$, and its long bar stays.
== Outermost ==
The final $+\,C$ becomes $\cdot\,\overline{C}$:
$$\overline{Y} = \overline{\overline{(\overline{A}+B)\,\overline{C}}\cdot\overline{D}}\cdot\overline{C}$$
== Check ==
De Morgan the long way: $\overline{Y} = \overline{\overline{X + D}+ C} = (X + D)\,\overline{C}$
with $X = \overline{A\overline{B}+C} = (\overline{A}+B)\overline{C}$, and the rule's
answer also simplifies to $\big((\overline{A}+B)\overline{C} + D\big)\overline{C}$. They
agree (checked over all 16 input rows).
:::

::: example Two duals
Find the duals of (a) $F = \overline{A}\cdot\overline{\overline{B\,\overline{C}}}$ and
(b) $F = A\overline{B} + A(0 + C)$.
== (a) ==
Change each $\cdot$ to $+$; leave the variables and all bars alone (the double bar over
$B\overline{C}$ is a bar over more than one variable, so it stays):
$F^D = \overline{A} + \overline{\overline{B + \overline{C}}}$.
== (b) ==
Swap $+ \leftrightarrow \cdot$ and $0 \leftrightarrow 1$, keeping the grouping:
$F^D = (A + \overline{B})(A + 1\cdot C)$.
:::

::: callout note About the slide's bars
On the slide the extents of the long bars in these two examples are hard to read. The
readings above are the ones consistent with the two cautions, and the complement was
checked against De Morgan's laws by truth table.
:::

::: callout exam For the exam
Expect to prove a formula (by algebra or truth table), to use De Morgan's laws, and to
write a dual or a complement with the rules, where the marks go for keeping the brackets
and the long bars right.
:::

::: callout key The one idea to remember
Every law has a dual (swap $+ \leftrightarrow \cdot$, $0 \leftrightarrow 1$). The
complement rule is the dual plus flipping every single variable, and De Morgan's laws
are its simplest case.
:::

::: cards Laws and rules
$A + 1 = $ ? :: $1$
$A + A = $ ? :: $A$ (no coefficients in logic algebra)
$A + BC = $ ? (second distributive law) :: $(A+B)(A+C)$
De Morgan for a product :: $\overline{AB} = \overline{A} + \overline{B}$
De Morgan for a sum :: $\overline{A+B} = \overline{A}\,\overline{B}$
Combining law (合并律) :: $AB + A\overline{B} = A$
Absorption law (吸收律) :: $A + AB = A$
Factor-elimination law (消因律) :: $A + \overline{A}B = A + B$
Consensus theorem (包含律) :: $AB + \overline{A}C + BC = AB + \overline{A}C$
How do you form the dual $Y^D$? :: Swap $+ \leftrightarrow \cdot$ and $0 \leftrightarrow 1$; keep the variables.
How do you form the complement $\overline{Y}$ by the complement rule? :: Swap $+ \leftrightarrow \cdot$, $0 \leftrightarrow 1$, and every variable with its complement.
Two cautions for duals and complements :: Keep the order of operations (add brackets); leave bars over more than one variable unchanged.
Substitution rule (代入规则) :: Replacing every occurrence of a variable in a true equation by the same function keeps it true.
:::

::: quiz Check yourself
? Simplify $A + AB$ to the fewest terms.
logic: A
> Absorption: $A + AB = A(1 + B) = A$.

? Simplify $A + \overline{A}B$ to the fewest terms.
logic: A + B
> Factor elimination: $A + \overline{A}B = (A + \overline{A})(A + B) = A + B$.

? Simplify $AB + \overline{A}C + BC$ to the fewest terms.
logic: A B + A' C
> $A$ and $\overline{A}$ appear in $AB$ and $\overline{A}C$; their consensus is $BC$, which is redundant.

? Which of these equals $\overline{A + B + C}$?
- [x] $\overline{A}\,\overline{B}\,\overline{C}$
- [ ] $\overline{A} + \overline{B} + \overline{C}$
- [ ] $\overline{A}\,\overline{B} + \overline{C}$
- [ ] $ABC$
> De Morgan: breaking the bar flips every OR to AND and complements each variable.

? Which statements are true in logic algebra?
- [x] $1 + 1 = 1$
- [x] $A + BC = (A+B)(A+C)$
- [ ] $A + A = 2A$
- [ ] If $A + B = A + C$ then $B = C$
> $1 + 1 = 1$ (OR) and the second distributive law hold. There are no coefficients ($A + A = A$), and $A + B = A + C$ holds for any $B$, $C$ when $A = 1$, so you cannot cancel.

? What is the dual of $Y = A(B + C)$?
logic: A + B C
> Swap $\cdot \leftrightarrow +$, keep the grouping: $(A) + (B \cdot C) = A + BC$. (By duality, since $A(B+C) = AB + AC$, also $A + BC = (A+B)(A+C)$.)

? Using the complement rule, what is $\overline{Y}$ for $Y = AB + C$?
logic: (A' + B') C'
> Swap $\cdot \leftrightarrow +$ and flip each variable, keeping $AB$ grouped: $(\overline{A} + \overline{B})\cdot\overline{C}$. Writing $\overline{A} + \overline{B}\,\overline{C}$ would break the first caution.

? The complement rule and the duality rule differ in which swap?
- [ ] $+ \leftrightarrow \cdot$
- [ ] $0 \leftrightarrow 1$
- [x] true variable ↔ complemented variable
> Both swap $+$ with $\cdot$ and 0 with 1. Only the complement rule also flips each single variable.

? In $Y = \overline{A}\,\overline{\overline{B\,\overline{C}}}$, what happens to the double bar over $B\overline{C}$ when you take the dual?
- [x] It stays, and the $\cdot$ underneath becomes $+$
- [ ] It is removed
- [ ] $B$ and $\overline{C}$ are complemented
> Bars over more than one variable are kept. The dual changes only the operations and constants: $F^D = \overline{A} + \overline{\overline{B + \overline{C}}}$.
:::

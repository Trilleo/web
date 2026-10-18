---
title: Binary arithmetic and complements
zh: 二进制运算与原码、反码、补码
summary: Adding, subtracting, multiplying and dividing in binary, and writing negative numbers in sign-magnitude, ones' complement and two's complement so that subtraction becomes addition.
source: 第2章 数制和码制 (2.4 二进制算术运算), 2026-09-29
---

A computer's arithmetic unit is built from logic gates, and gates are much easier to build
for one operation than for four. This lesson shows the binary versions of the four
operations, then the key trick of the chapter: a way of writing negative numbers, the
{{term two's complement | 补码}}, that turns subtraction into addition. With it, one adder
circuit can add, subtract and (by repeating) multiply and divide. You'll need these
representations whenever a later chapter builds an adder or a subtractor.

## Binary arithmetic

Binary arithmetic follows exactly the rules you learned for decimal at school. The only
difference is where the carries and borrows happen: a column carries when it reaches
**two** ({{zh 逢二进一}}), and a borrow from the next column is worth **two**
({{zh 借一当二}}).

### Addition

The whole addition table is four lines:

$$0 + 0 = 0,\qquad 0 + 1 = 1,\qquad 1 + 0 = 1,\qquad 1 + 1 = 10 \;(\text{0, carry }1)$$

and with a carry coming in, $1 + 1 + 1 = 11$ (1, carry 1). Work from the right, column by
column, exactly as in decimal.

::: example Adding in binary
Work out $(1001)_B + (0101)_B$ (the slides' example), then $(1011)_B + (0110)_B$.
== First sum ==
```
  1001      (9)
+ 0101      (5)
------
  1110      (14)
```
Right column $1 + 1 = 10$: write 0, carry 1. Next: $0 + 0 + 1 = 1$. Next: $0 + 1 = 1$.
Left: $1 + 0 = 1$. Result $1110 = 14$ ✓.
== Second sum, with a carry out ==
```
  1011      (11)
+ 0110      (6)
------
 10001      (17)
```
$1+0 = 1$; $1+1 = 10$ (0, carry 1); $0+1+1 = 10$ (0, carry 1); $1+0+1 = 10$ (0, carry 1);
the last carry becomes a fifth bit. $10001 = 16 + 1 = 17$ ✓.
:::

Notice the second sum needed one more bit than its inputs. In hardware, where every number
has a fixed width, that extra carry matters a lot: it comes back later as *overflow*.

### Subtraction

Subtract column by column; when the top bit is smaller ($0 - 1$), borrow 1 from the next
column, which is worth 2 here: $10 - 1 = 1$.

::: example Subtracting in binary
Work out $(1001)_B - (0101)_B$.
== Columns ==
```
  1001      (9)
- 0101      (5)
------
  0100      (4)
```
Right: $1 - 1 = 0$. Next: $0 - 0 = 0$. Next: $0 - 1$ can't be done, so borrow from the
leftmost column: its 1 becomes 0, and this column becomes $10 - 1 = 1$ (two minus one).
Left: $0 - 0 = 0$. Result $0100 = 4$ ✓.
:::

Borrowing across several zeros is fiddly, which is exactly why hardware avoids it: below
we'll subtract by adding instead.

### Multiplication

Multiplying by one bit is trivial: $\times 1$ copies the number, $\times 0$ gives zero. So
binary long multiplication is only **shifting and adding**: write the multiplicand once
for every 1 in the multiplier, shifted to that bit's position, and add.

::: example Multiplying in binary
Work out $(1001)_B \times (0101)_B$.
== Partial products ==
```
        1001
     ×  0101
     -------
        1001      (×1)
       0000       (×0, shifted 1)
      1001        (×1, shifted 2)
     0000         (×0, shifted 3)
     -------
     0101101
```
== Result ==
$(0101101)_B = 32 + 8 + 4 + 1 = 45$, and $9 \times 5 = 45$ ✓.
:::

### Division

Division is repeated **shift and subtract**: at each step the divisor either fits (write 1,
subtract) or doesn't (write 0). Each quotient bit is only 0 or 1, so there's no guessing
as in decimal long division.

::: example Dividing in binary
Work out $(1001)_B \div (0101)_B$, that is $9 \div 5$.
== Integer part ==
$0101$ fits into $1001$ once: quotient bit 1, remainder $1001 - 0101 = 0100$.
== After the point ==
Bring down a 0: $1000$; $0101$ fits, bit 1, remainder $1000 - 0101 = 0011$. Bring down 0:
$0110$; fits, bit 1, remainder $0001$. The slide stops here with $1.11\ldots$
== Going on ==
$0010$: doesn't fit, 0. $0100$: 0. $1000$: 1, remainder 0011, and the pattern repeats:
$9 \div 5 = (1.1100\,1100\ldots)_B$. Check: $1.8 = 1 + 0.5 + 0.25 + 0.03125 + \ldots$ ✓.
:::

::: callout key Everything reduces to adding and shifting
Multiplication is shifts and additions; division is shifts and subtractions. If
subtraction can also be done by addition, a single adder (plus shifting) does all four
operations, which greatly simplifies the arithmetic circuits. That is the point of
complement codes.
:::

## Writing signed numbers

A circuit has no "−" sign to write. The standard idea is to give up one bit, the leftmost
(most significant), as the {{term sign bit | 符号位}}: **0 for positive, 1 for negative**.
The remaining bits are the {{term magnitude bits | 数值位}}. How the magnitude bits are
written for a negative number gives three different codes. For positive numbers all three
are the same.

The slides write the sign bit with a small gap, like $1\,0101$, to keep it visible.

### Sign-magnitude

::: define Sign-magnitude | 原码
The sign bit (0 positive, 1 negative) followed by the magnitude in ordinary binary.
$+5 = 0\,0101$, $-5 = 1\,0101$.
:::

This is how we write numbers on paper, so it's easy to read. But it is awkward for
circuits: to add $+5$ and $-3$ the circuit must compare magnitudes and subtract, and there
are two zeros, $0\,0000$ ($+0$) and $1\,0000$ ($-0$).

### Ones' complement

::: define Ones' complement | 反码
For a positive number, the same as its sign-magnitude form. For a negative number, keep
the sign bit 1 and **invert every magnitude bit** of the sign-magnitude form
({{zh 逐位求反}}): $[1\,0101]_{反} = 1\,1010$.
:::

### Two's complement

Think of a car's odometer with four wheels showing 0000. Roll it back one step and it shows
9999: in a fixed number of digits, "one less than zero" is the largest pattern. In 4-bit
binary, $0000 - 1 = 1111$, so $1111$ is a natural way to write $-1$, $1110$ is $-2$, and so
on. That is the two's complement: the pattern you get by going backwards from zero, so
that adding works without any special rules.

::: define Two's complement | 补码
For a positive number, the same as its sign-magnitude form. For a negative number, keep
the sign bit 1, invert the magnitude bits and **add 1 at the lowest bit**:
$[1\,0101]_{补} = 1\,1011$.
:::

::: law From sign-magnitude to two's complement | 原码、反码、补码的关系
Invert the magnitude bits of the sign-magnitude form to get the ones' complement; add 1
to the ones' complement to get the two's complement ({{zh 原码按位求反，得到反码；反码加1，得到补码}}).
The sign bit stays the same, and positive numbers are unchanged in all three codes.
:::

::: example The three codes of N = 1 0101
$N = 1\,0101$ is the sign-magnitude form of $-5$ (sign 1, magnitude $0101 = 5$). Find its
ones' and two's complement.
== Ones' complement ==
Keep the sign 1, invert $0101 \to 1010$: $[N]_{反} = 1\,1010$.
== Two's complement ==
Add 1: $1\,1010 + 1 = 1\,1011$, so $[N]_{补} = 1\,1011$.
== Check with the odometer idea ==
With 5 bits, $-5$ should be $2^5 - 5 = 27 = (11011)_B$ ✓.
:::

The check in the last step is a general rule (not on the slides, but useful): with $n$
bits in all, the two's complement of a negative number $-x$ is the pattern for $2^n - x$.
It's why the trick works: in $n$ bits, anything $2^n$ or bigger falls off the end, so
adding $2^n - x$ is the same as subtracting $x$.

::: formula Two's complement of a negative number | 负数的补码
$$[-x]_{补} = 2^n - x \qquad (0 < x \le 2^{n-1})$$
--
x | the magnitude of the negative number |
n | total number of bits, sign bit included |
:::

::: formula Range of n-bit two's complement | 补码的表示范围
$$-2^{n-1} \;\le\; N \;\le\; 2^{n-1} - 1$$
--
N | a value that $n$ bits of two's complement can hold |
n | total number of bits, sign bit included |
:::

So 8 bits hold $-128$ to $+127$, while 8-bit sign-magnitude holds only $-127$ to $+127$,
because it wastes a pattern on $-0$. Two's complement has a single zero.

The plot shows all 256 patterns of an 8-bit code, read as an ordinary unsigned number $u$
(the horizontal axis) and as two's complement (the curve). Patterns 0–127 start with 0
and mean themselves; patterns 128–255 start with 1 and mean $u - 256$.

::: plot An 8-bit pattern read as two's complement
x: 0 .. 255
xlabel: pattern read as unsigned (0–255)
ylabel: two's complement value
v(u) = u - 256 floor(u/128)
:::

Slide $x$ to see the 8-bit two's complement of a number from $-128$ to $127$.

::: explore 8-bit two's complement
slider x: -128 .. 127 = -26
n = round(x) | | The number
c = n + 256 max(0, -sign(n)) | | Pattern read as unsigned (n, or 256 + n if negative)
b7 = floor(c/128) | | Bit 7: the sign bit
b6 = floor(c/64) - 2 floor(c/128) | | Bit 6
b5 = floor(c/32) - 2 floor(c/64) | | Bit 5
b4 = floor(c/16) - 2 floor(c/32) | | Bit 4
b3 = floor(c/8) - 2 floor(c/16) | | Bit 3
b2 = floor(c/4) - 2 floor(c/8) | | Bit 2
b1 = floor(c/2) - 2 floor(c/4) | | Bit 1
b0 = c - 2 floor(c/2) | | Bit 0
:::

## Subtraction by adding the two's complement

Here is the payoff. To work out $A - B$, add $A$ and $-B$, both in two's complement. Any
carry out of the sign bit is simply thrown away ({{zh 舍去}}). The result is itself in two's
complement.

::: law Subtraction by complement addition | 补码减法
$$[A - B]_{补} = [A]_{补} + [-B]_{补}$$
Add the two codes, sign bits included, as plain binary, and discard any carry out of the
sign bit. A result with sign bit 0 is positive and reads directly; a result with sign bit 1
is negative, and its magnitude is found by taking the two's complement again.
:::

::: example 9 − 5 by addition
Work out $9 - 5 = (1001)_B - (0101)_B$ using two's complement with a sign bit and 4
magnitude bits (the slides' example).
== Write both in two's complement ==
$+9 = 0\,1001$ (positive: unchanged). $-5$: sign-magnitude $1\,0101$, invert $1\,1010$, add
1: $1\,1011$.
== Add ==
```
    0 1001     (+9)
  + 1 1011     (−5)
  --------
  1 0 0100
```
== Discard the carry ==
The leftmost 1 is a carry out of the sign bit: throw it away. What remains is $0\,0100$:
sign 0, so positive, magnitude $0100 = 4$. Subtraction has become addition
({{zh 减法变加法}}), and $9 - 5 = 4$ ✓.
:::

::: example A negative result
Work out $5 - 9$ the same way.
== Codes ==
$+5 = 0\,0101$; $-9$: $1\,1001 \to 1\,0110 \to 1\,0111$.
== Add ==
$0\,0101 + 1\,0111 = 1\,1100$, with no carry out.
== Read it ==
Sign 1: negative. Take the two's complement again for the magnitude: invert the magnitude
bits $1100 \to 0011$, add 1: $0100 = 4$. So the result is $-4$ ✓. (Or by the formula:
$11100_B = 28 = 32 - 4$.)
:::

## Examples and rules

The slides' table: write the ones' and two's complement of the signed 8-bit numbers
$+26$, $-26$, $+45$, $-45$ (1 sign bit, 7 magnitude bits).

| Number | Sign-magnitude 原码 | Ones' complement 反码 | Two's complement 补码 |
| --- | --- | --- | --- |
| $+26$ | 0001 1010 | 0001 1010 | 0001 1010 |
| $-26$ | 1001 1010 | 1110 0101 | 1110 0110 |
| $+45$ | 0010 1101 | 0010 1101 | 0010 1101 |
| $-45$ | 1010 1101 | 1101 0010 | 1101 0011 |

::: example Checking −45
Derive the $-45$ row.
== Sign-magnitude ==
$45 = 32 + 8 + 4 + 1 = (010\,1101)_B$ in 7 bits; with sign 1: $1010\,1101$.
== Ones' complement ==
Invert the 7 magnitude bits, keep the sign: $1101\,0010$.
== Two's complement ==
Add 1: $1101\,0011$. Check: $256 - 45 = 211 = 128 + 64 + 16 + 2 + 1 = (1101\,0011)_B$ ✓.
:::

::: callout summary Three rules from the slides
1. For a **positive** number, the two's complement and ones' complement are the same as the
   sign-magnitude form.
2. For a **negative** number, the two's complement is the sign-magnitude form with the
   magnitude bits inverted and 1 added at the lowest bit; the sign bit stays 1.
3. **The two's complement of a two's complement gives back the sign-magnitude form**
   ({{zh 补码的补码等于原码}}): $1\,1011 \to 1\,0100 \to 1\,0101$.
:::

::: callout tip A shortcut for negating
To take the two's complement of the magnitude bits by eye: copy bits from the right up to
and including the first 1, then invert all the rest. $0101\,1000 \to 1010\,1000$.
:::

::: callout pitfall Inverting the sign bit
Ones' and two's complement invert only the **magnitude** bits of the sign-magnitude form;
the sign bit stays 1. And positive numbers are never inverted at all: $[+26]_{补}$ is just
$0001\,1010$.
:::

## Overflow: use enough bits

The slides add two cautions for two's complement arithmetic:

1. A sum of two's complement codes is itself a two's complement code. If its sign bit is 1
   the sum is negative, and the magnitude bits are **not** its absolute value: take the
   two's complement again to read it.
2. The magnitude part must have **enough bits for the largest absolute value of the
   result**. Otherwise the result is wrong.

The second one is {{term overflow | 溢出}}: the true result doesn't fit in the bits
available, the carry spills into the sign bit, and the sign comes out wrong.

::: example −13 + (−10)
Work out $-13 + (-10) = -23$ in two's complement, first with 4 magnitude bits, then with 5.
== Four magnitude bits ==
Sign-magnitude: $-13 = 1\,1101$, $-10 = 1\,1010$. Two's complement: $1\,0011$ and
$1\,0110$.
```
    1 0011
  + 1 0110
  --------
  1 0 1001
```
Discard the carry: $0\,1001$, which reads as $+9$. **Wrong**: two negatives cannot add to a
positive. $|-23| = 23$ needs 5 magnitude bits ($16 \le 23 < 32$), and we only had 4.
== Five magnitude bits ==
Sign-magnitude: $-13 = 1\,01101$, $-10 = 1\,01010$. Two's complement: $1\,10011$ and
$1\,10110$.
```
    1 10011
  + 1 10110
  ---------
  1 1 01001
```
Discard the carry: $1\,01001$. Sign 1, negative.
== Read the result ==
Two's complement again: invert $01001 \to 10110$, add 1: $1\,10111$, the sign-magnitude
form of $-23$ ✓.
:::

::: callout key Spotting overflow
Overflow can only happen when two numbers of the **same sign** are added. If two
positives give a negative result, or two negatives give a positive one, the bits weren't
enough. Adding a positive and a negative number never overflows.
:::

::: callout exam What to expect
Writing the sign-magnitude, ones' and two's complement of a given number (like the
$\pm 26$, $\pm 45$ table), doing a subtraction by two's complement addition, and deciding
how many bits are needed so the result doesn't overflow.
:::

::: cards Binary arithmetic and complements
Binary carry and borrow rules? :: 逢二进一 (a column carries at 2), 借一当二 (a borrow is worth 2).
$1 + 1$ in binary? :: $10$: write 0, carry 1. ($1+1+1 = 11$.)
How does binary multiplication work? :: Shift and add: the multiplicand, shifted, once for every 1 in the multiplier.
Sign bit convention? :: The leftmost bit: 0 positive, 1 negative.
原码 (sign-magnitude)? :: Sign bit, then the magnitude in plain binary.
反码 (ones' complement) of a negative number? :: Keep the sign bit 1, invert every magnitude bit of the 原码.
补码 (two's complement) of a negative number? :: Its 反码 plus 1 at the lowest bit (sign bit stays 1).
Codes of a positive number? :: 原码 = 反码 = 补码.
补码 of a 补码? :: The 原码 again.
$[-x]_{补}$ with $n$ bits? :: The pattern for $2^n - x$.
Range of $n$-bit two's complement? :: $-2^{n-1}$ to $2^{n-1} - 1$ (8 bits: −128 to 127).
How do you subtract with two's complement? :: $[A-B]_{补} = [A]_{补} + [-B]_{补}$; discard the carry out of the sign bit.
When can overflow happen? :: Only when adding two numbers of the same sign; the result's sign comes out wrong.
Why use two's complement? :: Subtraction becomes addition, there's one zero, and one adder does all the arithmetic.
:::

::: quiz Check yourself
? Work out $(1101)_B + (0111)_B$.
text: 10100 | (10100)B | (10100)2 | 010100
> $1+1 = 10$ (0, carry 1); $0+1+1 = 10$ (0, carry 1); $1+1+1 = 11$ (1, carry 1); $1+0+1 = 10$ (0, carry 1); the last carry is the fifth bit. $13 + 7 = 20 = 10100_B$.

? Work out $(1101)_B - (0110)_B$.
text: 111 | 0111 | (111)B | (0111)B
> $13 - 6 = 7$. Column by column: $1 - 0 = 1$; $0 - 1$ borrows (the next column's 1 becomes 0): $10 - 1 = 1$; $0 - 1$ borrows again: $10 - 1 = 1$; $0 - 0 = 0$. Result $0111$.

? Work out $(110)_B \times (101)_B$.
text: 11110 | (11110)B | 011110
> Shift and add: $110$ (for the right 1) $+ 11000$ (for the left 1, shifted two places) $= 11110 = 30 = 6 \times 5$.

? What is the 8-bit two's complement of $-19$?
text: 11101101 | 1110 1101 | (11101101)补
> $19 = 0010011$ in 7 bits; sign-magnitude $1001\,0011$; invert the magnitude: $1110\,1100$; add 1: $1110\,1101$. Check: $256 - 19 = 237 = 11101101_B$.

? What is the 8-bit ones' complement of $-19$?
text: 11101100 | 1110 1100
> Sign-magnitude $1001\,0011$, magnitude bits inverted, sign kept: $1110\,1100$ (one less than the two's complement).

? An 8-bit two's complement number is $1111\,1011$. What value is it?
answer: -5
tolerance: 0
> Sign 1, negative. Take the two's complement again: invert the magnitude bits $111\,1011 \to 000\,0100$, add 1: $000\,0101 = 5$. So $-5$. (Or $251 - 256 = -5$.)

? Work out $7 - 12$ in two's complement with a sign bit and 4 magnitude bits. Which is the sum, after discarding any carry, and what does it mean?
- [x] $1\,1011$, which is $-5$
- [ ] $0\,0101$, which is $+5$
- [ ] $1\,0101$, which is $-5$ directly
- [ ] It overflows
> $+7 = 0\,0111$; $-12$: $1\,1100 \to 1\,0011 \to 1\,0100$. Sum $0\,0111 + 1\,0100 = 1\,1011$, no carry. Sign 1: take the complement again, $1011 \to 0100 + 1 = 0101 = 5$, so $-5$. A positive plus a negative can't overflow.

? With a sign bit and 4 magnitude bits (two's complement, −16 to +15), which of these sums overflow?
- [x] $9 + 8$
- [x] $(-13) + (-10)$
- [ ] $7 + (-12)$
- [ ] $(-8) + (-7)$
> $9 + 8 = 17 > 15$ and $-23 < -16$ don't fit, so they overflow. $7 - 12 = -5$ fits (and mixed signs never overflow); $-15$ fits.

? How many bits in all (sign included) does two's complement need to hold $-100$?
answer: 8
tolerance: 0
> $n$ bits hold $-2^{n-1}$ to $2^{n-1}-1$. 7 bits reach only $-64$; 8 bits reach $-128$, so 8.
:::

---
title: Number systems and conversions
zh: 数制与数制转换
summary: Why electronics goes digital, how a positional number system works, and how to move numbers between decimal, binary, octal and hexadecimal.
source: 第1&2章 绪论 & 数制、码制, 2026-09-29
---

This lesson starts the digital half of the course. Everything a digital circuit does,
from adding two numbers to showing a clock on a display, is done with only two
symbols, 0 and 1. Before we can build circuits that handle numbers, we need to be fluent
in writing numbers with those two symbols, and in moving between binary and the
shorter forms engineers actually write down (octal and hexadecimal). These conversions
come up in every later chapter and are a reliable exam question.

## Why digital electronics

The first half of the course was {{term analogue electronics | 模拟电子技术}}: diodes,
transistor amplifiers, filters, oscillators, power supplies. The second half is
{{term digital electronics | 数字电子技术}}. Its chapters follow on from this one: logic
algebra, logic gate circuits, combinational logic, flip-flops, sequential logic, memories
and programmable logic, hardware description languages, pulse circuits, and finally the
converters that join the two worlds (D/A and A/D).

### Analogue and digital signals

Think of a thermometer. A mercury column rises *smoothly*: at every instant it has some
height, and any height in between is possible. That is an analogue signal: a quantity
that varies continuously in time and in value. A digital thermometer instead shows
"23.5", then "23.6": it looks at the temperature at fixed moments and rounds it to one
of a limited set of values, each written as a code of 0s and 1s.

::: define Analogue signal | 模拟信号
A signal that is continuous in time and in value: between any two values it can take,
it can also take every value in between (a microphone's voltage, a thermocouple's output).
:::

::: define Digital signal | 数字信号
A signal that is discrete in time and in value: it is only defined at certain instants,
and only takes a limited set of values, each represented by a code of 0s and 1s.
:::

In the plot, $u(t)$ is an analogue signal. $d(t)$ is what an A/D converter makes of it:
it samples every $T$ seconds and holds the value, rounded to one of a few levels. Make
$T$ smaller and add levels, and the digital version follows the original more closely,
at the cost of more numbers to store.

::: plot Sampling and rounding an analogue signal
x: 0 .. 12.6
xlabel: t (s)
ylabel: u (V)
u(t) = 2 sin(t)
d(t) = 2 round(round(q) sin(T floor(t/T))) / round(q)
slider T: 0.1 .. 2 = 0.6 | s
slider q: 1 .. 16 = 2 | levels each side of 0
:::

Why bother? A digital circuit only has to tell two states apart: a voltage that is
"clearly high" is 1 and "clearly low" is 0. A little noise or drift doesn't change a 1
into a 0, so digital signals can be copied, stored and sent without getting worse, and
the circuits are simple, cheap and easy to integrate by the billion. Digital electronics
studies how digital signals are coded, computed with, remembered, counted, stored,
routed, measured and transmitted, and it is everywhere: computers, phones,
communications, radar, control, cars, aircraft, household appliances.

### A typical electronic system

Real-world quantities (sound, temperature, position) are analogue, and so are most
things we want to drive (a speaker, a motor). So a modern system is a chain, with a
digital core in the middle:

| Block | What it does |
| --- | --- |
| Signal acquisition {{zh 信号获取}} | A sensor turns the physical quantity into a voltage |
| Amplifier {{zh 信号放大}} | Raises the small sensor voltage to a useful level (analogue half of the course) |
| A/D converter {{zh A/D转换器}} | Samples and codes the voltage as binary numbers |
| Digital processing system {{zh 数字电子处理系统}} | Computes with the numbers: a CPU, an FPGA … |
| D/A converter {{zh D/A转换器}} | Turns the results back into a voltage |
| Power amplifier {{zh 功率放大}} | Optional: gives the voltage enough power to drive a load |
| Actuator {{zh 执行单元}} | Does something physical: motor, speaker, valve, display |

::: define Digital electronic system | 数字电子系统
The part of the chain that works on numbers: the A/D converter, the digital processor
and the D/A converter.
:::

::: callout key Analogue at the edges, digital in the middle
Sensors and actuators are analogue; the processing is digital. The A/D and D/A
converters are where the two halves of this course meet.
:::

## Number systems and codes

Chapter 2 of the slides is called 数制和码制, two words that look alike but mean
different things.

::: define Number system | 数制
A way of writing the *size* of a number: decimal, binary, octal, hexadecimal. Also
called a positional number system {{zh 进位计数制}}.
:::

::: define Coding scheme | 码制
A way of *encoding* information as groups of bits, where the bit pattern is a label
rather than a quantity to calculate with: BCD codes, Gray (cyclic) code, ASCII.
:::

This lesson and the next are about number systems; the third lesson is about codes.

## Base and place value

With only ten symbols 0–9 we can still write 1 000 000, because the *position* of a
digit says how much it is worth. The 7 in 700 is worth seven hundred; in 70 it's seventy.
When a position "fills up" (9 + 1), we write 0 there and carry 1 into the next position.
A number system is fixed by two things: how many digit symbols it has, and how much each
position is worth.

::: define Base | 基数
The number of different digit symbols {{zh 数码}} a number system uses: 10 for decimal,
2 for binary, 8 for octal, 16 for hexadecimal. Also called the radix. A position carries
into the next when it reaches the base ("逢 $R$ 进一") and a borrow from the next
position is worth the base ("借一当 $R$").
:::

::: define Positional weight | 位权
The fixed number each digit is multiplied by because of its position: a power of the
base. Position $i$ (counting from 0 just left of the point, negative to the right of it)
has weight $R^i$.
:::

Putting the two together, any number is its digits times their weights, added up. This
is the {{term weighted expansion | 权展开式}} of the number, and it is the single formula
behind every conversion in this lesson.

::: formula Weighted expansion of a number | 按权展开式
$$N = \sum_{i=-m}^{n-1} k_i \, R^{\,i} = k_{n-1}R^{n-1} + \dots + k_1 R^1 + k_0 R^0 + k_{-1}R^{-1} + \dots + k_{-m}R^{-m}$$
--
N | the value of the number |
R | the base (radix) |
k_i | the digit in position $i$, from 0 to $R-1$ |
R^i | the weight of position $i$ |
n | number of digits before the point |
m | number of digits after the point |
:::

## Four common number systems

### Decimal

{{term Decimal | 十进制}} uses the digits 0–9, base 10, written with the letter **D**
(Decimal) or a subscript 10. It carries at ten ($9 + 1 = 10$) and a borrow is worth ten.
Position $i$ has weight $10^i$, so $D = \sum k_i \times 10^i$:

$$(143.75)_D = 1\times10^2 + 4\times10^1 + 3\times10^0 + 7\times10^{-1} + 5\times10^{-2}$$

Decimal is natural for people, but awkward for circuits: a circuit storing one decimal
digit would need ten distinct, reliably distinguishable states. That is technically hard
and uneconomical.

### Binary

{{term Binary | 二进制}} uses only 0 and 1, base 2, letter **B** (Binary) or subscript 2.
It carries at two: $1 + 1 = 10$ ("one zero", which is two). Position $i$ has weight $2^i$:

$$\begin{aligned}(101.11)_B &= 1\times2^2 + 0\times2^1 + 1\times2^0 + 1\times2^{-1} + 1\times2^{-2}\\&= 4 + 1 + 0.5 + 0.25\\&= (5.75)_D\end{aligned}$$

A binary digit is a {{term bit | 位}} (binary digit). Binary is what circuits use: a
transistor that is either fully on or fully off, a voltage that is either high or low,
gives exactly two states, which is easy to build and hard to confuse.

### Octal

{{term Octal | 八进制}} uses 0–7, base 8, letter **O** (Octal) or subscript 8. It
carries at eight: $7 + 1 = 10$. Weights are $8^i$:

$$\begin{aligned}(207.04)_O &= 2\times8^2 + 0\times8^1 + 7\times8^0 + 0\times8^{-1} + 4\times8^{-2}\\&= 128 + 7 + \tfrac{4}{64}\\&= (135.0625)_D\end{aligned}$$

### Hexadecimal

{{term Hexadecimal | 十六进制}} needs sixteen digit symbols, so after 0–9 it borrows the
letters A–F for ten to fifteen: A = 10, B = 11, C = 12, D = 13, E = 14, F = 15. Base 16,
letter **H** (Hexadecimal) or subscript 16. It carries at sixteen: $F + 1 = 10$.
Weights are $16^i$:

$$\begin{aligned}(2A.7F)_H &= 2\times16^1 + 10\times16^0 + 7\times16^{-1} + 15\times16^{-2}\\&= 32 + 10 + 0.4375 + 0.05859375\\&= (42.49609375)_D\end{aligned}$$

::: callout note Rounding on the slide
The slide prints $(2A.7F)_H = (42.4960937)_D$, cutting off the last digit. The exact value
is $42.49609375$: a fraction with a power of 2 in the denominator always ends.
:::

::: callout pitfall "10" depends on the base
$(10)_B = 2$, $(10)_O = 8$, $(10)_D = 10$, $(10)_H = 16$. Whenever more than one base is
around, write the base on every number, as the slides do with $(\ldots)_B$, $(\ldots)_D$.
:::

Octal and hex are not used by circuits themselves. They are shorthand for people: as
you'll see below, one octal digit is exactly three bits and one hex digit exactly four,
so a long binary number becomes short and readable without any calculation.

## The numbers 0 to 15 in each base

This table is worth knowing by heart, especially the binary and hex columns: every
conversion between binary, octal and hex is a lookup in it.

| Decimal D | Binary B | Octal O | Hex H |
| --- | --- | --- | --- |
| 0 | 0000 | 0 | 0 |
| 1 | 0001 | 1 | 1 |
| 2 | 0010 | 2 | 2 |
| 3 | 0011 | 3 | 3 |
| 4 | 0100 | 4 | 4 |
| 5 | 0101 | 5 | 5 |
| 6 | 0110 | 6 | 6 |
| 7 | 0111 | 7 | 7 |
| 8 | 1000 | 10 | 8 |
| 9 | 1001 | 11 | 9 |
| 10 | 1010 | 12 | A |
| 11 | 1011 | 13 | B |
| 12 | 1100 | 14 | C |
| 13 | 1101 | 15 | D |
| 14 | 1110 | 16 | E |
| 15 | 1111 | 17 | F |

Notice the pattern in the binary column: the last bit alternates 0, 1, 0, 1; the next one
in pairs; the next in fours; the first in eights. That is counting with carries.

The longer a number, the more digits each base needs. Binary needs about 3.3 times as many
digits as decimal, which is why nobody writes long binary numbers by hand.

::: plot Digits needed to write a whole number
x: 1 .. 1000
xlabel: value (decimal)
ylabel: digits
binary(x) = floor(log2(x)) + 1
octal(x) = floor(log2(x)/3) + 1
decimal(x) = floor(lg(x)) + 1
hex(x) = floor(log2(x)/4) + 1
:::

## Any base to decimal: expand and add

To turn a binary (or octal, or hex) number into decimal, write out its weighted expansion
and add. Nothing more.

::: example Binary to decimal
Convert $(1011.01)_B$ to decimal.
== Weights ==
The positions, left to right, have weights $2^3, 2^2, 2^1, 2^0, 2^{-1}, 2^{-2}$, that is
$8, 4, 2, 1, 0.5, 0.25$.
== Expand ==
$$1\times2^3 + 0\times2^2 + 1\times2^1 + 1\times2^0 + 0\times2^{-1} + 1\times2^{-2}$$
== Add ==
$8 + 2 + 1 + 0.25 = 11.25$, so $(1011.01)_B = (11.25)_D$.
:::

A quick way: just add the weights of the positions that hold a 1. For a 4-bit number the
weights are 8, 4, 2, 1:

$$(1000)_B = 8,\quad (0100)_B = 4,\quad (0010)_B = 2,\quad (0001)_B = 1$$

These weights, written as one word, give the name of the most common BCD code you'll meet
in lesson 3: the **8421** code.

## Decimal to any base: divide and multiply

Going the other way needs a little more work, because we must *find* the digits. The
integer part and the fraction part are converted separately, then put back together
around the point. The method is called {{term repeated division and multiplication by the base | 基数连除、连乘法}},
and it converts a decimal number into *any* base $R$, not just binary.

::: law Integer part: divide by the base, keep the remainders | 除基取余
Divide the integer part by $R$ again and again until the quotient is 0. The remainders are
the digits, the **first** remainder being the **lowest** digit $k_0$. Read the remainders
from the bottom up.
:::

Why it works: dividing by $R$ moves every digit one place right, and the digit that falls
off the end (the remainder) is the last digit. Do it again and the next one falls off.
In decimal: $143 \div 10 = 14$ remainder **3**, $14 \div 10 = 1$ remainder **4**,
$1 \div 10 = 0$ remainder **1**: the digits 3, 4, 1 come out lowest first.

::: law Fraction part: multiply by the base, keep the integer parts | 乘基取整
Multiply the fraction part by $R$; the integer part of the product is the next digit, and
the remaining fraction is multiplied again. The **first** integer is the digit right after
the point, $k_{-1}$. Read the integers from the top down. Stop when the fraction becomes 0,
or when you have enough digits.
:::

Why it works: multiplying by $R$ moves every digit one place left, so the first digit after
the point jumps across into the integer part.

::: example 44.375 to binary
Convert $(44.375)_D$ to binary (the slides' example).
== Integer part: divide by 2 ==
| Division | Quotient | Remainder |
| --- | --- | --- |
| 44 ÷ 2 | 22 | 0 = $k_0$ (lowest) |
| 22 ÷ 2 | 11 | 0 = $k_1$ |
| 11 ÷ 2 | 5 | 1 = $k_2$ |
| 5 ÷ 2 | 2 | 1 = $k_3$ |
| 2 ÷ 2 | 1 | 0 = $k_4$ |
| 1 ÷ 2 | 0 | 1 = $k_5$ (highest) |

Read from the bottom up: $44 = (101100)_B$. Check: $32 + 8 + 4 = 44$.
== Fraction part: multiply by 2 ==
| Product | Integer part |
| --- | --- |
| 0.375 × 2 = 0.750 | 0 = $k_{-1}$ |
| 0.750 × 2 = 1.500 | 1 = $k_{-2}$ |
| 0.500 × 2 = 1.000 | 1 = $k_{-3}$ (fraction is now 0: stop) |

Read from the top down: $0.375 = (0.011)_B$. Check: $0.25 + 0.125 = 0.375$.
== Combine ==
$(44.375)_D = (101100.011)_B$.
:::

::: callout pitfall Opposite reading directions
Remainders are read **bottom up** (the last remainder is the highest bit); integer parts
from the fraction are read **top down** (the first one sits next to the point). Mixing
these up reverses the digits, a very common exam mistake.
:::

Not every decimal fraction ends in binary. $0.1$ gives $0.2 \to 0$, $0.4 \to 0$,
$0.8 \to 0$, $1.6 \to 1$, $1.2 \to 1$, $0.4 \to 0$ … and the pattern 0011 repeats forever:
$(0.1)_D = (0.0\,0011\,0011\ldots)_B$. A decimal fraction ends in binary only if it is a
sum of halves, quarters, eighths and so on. Otherwise stop after the number of bits the
question asks for (the result is then an approximation).

The same two rules work for any base. These were the two in-class questions:

::: example 44.375 to octal and hexadecimal
Convert $(44.375)_D$ to octal, then to hexadecimal.
== Octal, integer part ==
$44 \div 8 = 5$ remainder **4**; $5 \div 8 = 0$ remainder **5**. Bottom up: $(54)_O$.
Check: $5 \times 8 + 4 = 44$.
== Octal, fraction part ==
$0.375 \times 8 = 3.000$: integer **3**, fraction 0, stop. So $(0.3)_O$.
== Octal result ==
$(44.375)_D = (54.3)_O$ (choice B on the slide).
== Hex, integer part ==
$44 \div 16 = 2$ remainder **12** = C; $2 \div 16 = 0$ remainder **2**. Bottom up: $(2C)_H$.
Check: $2 \times 16 + 12 = 44$.
== Hex, fraction part ==
$0.375 \times 16 = 6.000$: integer **6**, stop. So $(0.6)_H$.
== Hex result ==
$(44.375)_D = (2C.6)_H$ (choice C on the slide). A remainder of 10–15 must be written as a
letter A–F: writing "212.6" would be wrong.
:::

Slide $N$ to see a whole number's digits in each base. Each bit is worth its weight; the
hex digits show 10–15 as numbers (read them as A–F).

::: explore A whole number in binary, octal and hex
slider N: 0 .. 255 = 44
n = round(N) | | The number (decimal)
b7 = floor(n/128) | | Bit 7 (weight 128)
b6 = floor(n/64) - 2 floor(n/128) | | Bit 6 (64)
b5 = floor(n/32) - 2 floor(n/64) | | Bit 5 (32)
b4 = floor(n/16) - 2 floor(n/32) | | Bit 4 (16)
b3 = floor(n/8) - 2 floor(n/16) | | Bit 3 (8)
b2 = floor(n/4) - 2 floor(n/8) | | Bit 2 (4)
b1 = floor(n/2) - 2 floor(n/4) | | Bit 1 (2)
b0 = n - 2 floor(n/2) | | Bit 0 (1)
O2 = floor(n/64) | | Octal digit 2 (weight 64)
O1 = floor(n/8) - 8 floor(n/64) | | Octal digit 1 (8)
O0 = n - 8 floor(n/8) | | Octal digit 0 (1)
H1 = floor(n/16) | | Hex digit 1 (weight 16)
H0 = n - 16 floor(n/16) | | Hex digit 0 (1)
:::

## Binary and hexadecimal: groups of four

Because $16 = 2^4$, four bits make exactly one hex digit: $0000$ to $1111$ is $0$ to $F$.
So converting between binary and hex needs no arithmetic at all, only the table.

::: law Binary to hexadecimal | 二进制转换为十六进制
Starting **from the binary point**, split the integer part into groups of 4 bits going
left and the fraction part into groups of 4 going right. Pad the outer groups with zeros
to make them 4 bits long ({{zh 不够4位补零}}). Each group is one hex digit. In reverse,
write each hex digit as its 4 bits.
:::

::: example Binary to hex and back
Convert $(1011110.1011001)_B$ to hex, and $(8FA.C6)_H$ to binary.
== Group from the point ==
Integer part, from the point leftwards: $1011110 \to 101\,|\,1110$; pad the left group to
$0101$. Fraction part, from the point rightwards: $1011001 \to 1011\,|\,001$; pad the right
group to $0010$.
$$(0101\;1110\,.\,1011\;0010)_B$$
== Read each group ==
$0101 = 5$, $1110 = E$, $1011 = B$, $0010 = 2$, so $(1011110.1011001)_B = (5E.B2)_H$.
== Back again ==
Each hex digit becomes 4 bits: $8 = 1000$, $F = 1111$, $A = 1010$, $C = 1100$,
$6 = 0110$:
$$(8FA.C6)_H = (1000\;1111\;1010\,.\,1100\;0110)_B$$
The leading zeros of the whole number and trailing zeros of the fraction can be dropped:
$(100011111010.1100011)_B$.
:::

::: callout pitfall Pad on the outside, never in the middle
Zeros go on the **left** end of the integer part and the **right** end of the fraction.
In the fraction, $.001$ padded to the right is $.0010 = (.2)_H$; padding on the left
($.0001$) would give $(.1)_H$, a different number. Always group outwards from the point:
grouping the fraction from its right end is the classic mistake.
:::

## Binary and octal: groups of three

The same idea with $8 = 2^3$: three bits make one octal digit, $000$ to $111$ is 0 to 7.

::: law Binary to octal | 二进制转换为八进制
Group the bits in threes outwards from the binary point, padding the outer groups with
zeros; each group is one octal digit. In reverse, write each octal digit as 3 bits.
:::

::: example Binary to octal and back
Convert $(1101010.01)_B$ to octal, and $(374.26)_O$ to binary.
== Group in threes ==
Integer part: $1101010 \to 1\,|\,101\,|\,010 \to 001\,|\,101\,|\,010$. Fraction:
$01 \to 010$ (pad on the right).
== Read ==
$001 = 1$, $101 = 5$, $010 = 2$, $010 = 2$: $(1101010.01)_B = (152.2)_O$.
== Back again ==
$3 = 011$, $7 = 111$, $4 = 100$, $2 = 010$, $6 = 110$:
$(374.26)_O = (011\;111\;100\,.\,010\;110)_B = (11111100.01011)_B$.
:::

This gives a second, often quicker, route for the in-class questions: convert $44.375$ to
binary once, $(101100.011)_B$, then group. In threes: $101\,|\,100\,.\,011 = (54.3)_O$. In
fours: $0010\,|\,1100\,.\,0110 = (2C.6)_H$. The same answers as before.

::: callout tip Octal ↔ hex
To convert between octal and hex, go through binary: write each octal digit as 3 bits,
then regroup in fours. $(54.3)_O = (101\,100.011)_B = (0010\,1100.0110)_B = (2C.6)_H$.
:::

## Hexadecimal and decimal, and other bases

**Hex to decimal**: expand by weights and add, as for any base.
**Decimal to hex**: either divide and multiply by 16 directly, or convert to binary first
and then group in fours. Dividing by 16 is quicker by hand for small numbers; going via
binary avoids long divisions and is what the slides suggest.

::: example Hex and decimal
Convert $(3B)_H$ to decimal, and $(200)_D$ to hex.
== Hex to decimal ==
$(3B)_H = 3\times16 + 11\times1 = 48 + 11 = (59)_D$.
== Decimal to hex directly ==
$200 \div 16 = 12$ remainder **8**; $12 \div 16 = 0$ remainder **12** = C. Bottom up:
$(C8)_H$. Check: $12\times16 + 8 = 200$.
== Via binary ==
$200 = 128 + 64 + 8 = (1100\,1000)_B$, and $1100 = C$, $1000 = 8$: $(C8)_H$ again.
:::

For any other bases (3, 5, 7, 12 …), there's no grouping shortcut. Use the
{{term indirect conversion | 间接转换法}}: convert the source number to decimal by weighted
expansion, then from decimal to the target base by dividing and multiplying.

::: example Base 3 to base 5
Convert $(212)_3$ to base 5.
== Source to decimal ==
$(212)_3 = 2\times3^2 + 1\times3^1 + 2\times3^0 = 18 + 3 + 2 = (23)_D$.
== Decimal to target ==
$23 \div 5 = 4$ remainder **3**; $4 \div 5 = 0$ remainder **4**. Bottom up: $(43)_5$.
== Check ==
$4\times5 + 3 = 23$. So $(212)_3 = (43)_5$.
:::

::: callout key One formula, two directions
To decimal: **expand by weights and add**. From decimal: **divide (integer) and multiply
(fraction) by the base**. Between 2, 8 and 16: **group bits in 3s or 4s from the point**.
Everything else goes through decimal.
:::

::: callout exam What to expect
Conversions between the four bases, including fractions, in single-choice or fill-in
form, like the in-class questions on $44.375$. Check an answer by converting it back.
:::

::: cards Number systems
数制 vs 码制? :: 数制 (number system) writes a number's size: binary, octal, decimal, hex. 码制 (coding scheme) encodes information as bit patterns: BCD, Gray code, ASCII.
What is the base (基数) of a number system? :: The number of digit symbols it uses; a position carries when it reaches the base.
What is a positional weight (位权)? :: The power of the base a digit is multiplied by because of its position: $R^i$ for position $i$.
Weighted expansion of a number? :: $N = \sum k_i R^i$, with $i$ negative after the point.
Letters for the four bases? :: D decimal, B binary, O octal, H hexadecimal.
Hex digits A–F are worth? :: A = 10, B = 11, C = 12, D = 13, E = 14, F = 15.
Weights of a 4-bit binary number? :: 8, 4, 2, 1.
Decimal integer part to base $R$? :: 除基取余: divide by $R$ repeatedly; remainders are the digits, read bottom up (first remainder = lowest digit).
Decimal fraction part to base $R$? :: 乘基取整: multiply by $R$ repeatedly; integer parts are the digits, read top down (first = right after the point).
Binary ↔ hex? :: Groups of 4 bits outwards from the point, padding the outer ends with 0s.
Binary ↔ octal? :: Groups of 3 bits outwards from the point, padding the outer ends with 0s.
Converting between two unusual bases? :: 间接转换法: source → decimal → target.
Why do circuits use binary? :: Two states (on/off, high/low) are easy to build and hard to confuse; ten reliable states would be hard and uneconomical.
$(44.375)_D$ in binary, octal and hex? :: $(101100.011)_B = (54.3)_O = (2C.6)_H$.
:::

::: quiz Check yourself
? Convert $(44.375)_D$ to octal. (In-class question.)
- [ ] $(53.4)_O$
- [x] $(54.3)_O$
- [ ] $(45.3)_O$
- [ ] $(34.5)_O$
> $44 \div 8 = 5$ r 4, $5 \div 8 = 0$ r 5, so the integer part is $54$; $0.375 \times 8 = 3.0$, so the fraction is $.3$. Or group $(101100.011)_B$ in threes: $101\,|\,100\,.\,011 = 54.3$.

? Convert $(44.375)_D$ to hexadecimal. (In-class question.)
- [ ] $(1C.4)_H$
- [ ] $(2C.3)_H$
- [x] $(2C.6)_H$
- [ ] $(3C.5)_H$
> $44 = 2 \times 16 + 12$, and 12 is C; $0.375 \times 16 = 6.0$. Or group $(101100.011)_B$ in fours from the point: $0010\,|\,1100\,.\,0110 = 2C.6$.

? What is $(110101.101)_B$ in decimal?
answer: 53.625
tolerance: 0
> Add the weights of the 1s: $32 + 16 + 4 + 1 = 53$ before the point and $0.5 + 0.125 = 0.625$ after it.

? Convert $(25.75)_D$ to binary.
text: 11001.11 | 11001.110 | (11001.11)B | (11001.11)2 | 011001.11
> Integer: $25 \to$ remainders 1, 0, 0, 1, 1 (bottom up $11001$). Fraction: $0.75\times2 = 1.5 \to 1$, $0.5\times2 = 1.0 \to 1$. So $(11001.11)_B$; check $16+8+1+0.5+0.25 = 25.75$.

? Convert $(10110101.1)_B$ to hexadecimal.
text: B5.8 | (B5.8)H | (B5.8)16 | 0B5.8
> Groups from the point: $1011\,|\,0101\,.\,1000$ (the fraction's single 1 is padded on the right). $1011 = B$, $0101 = 5$, $1000 = 8$.

? Convert $(10110101.1)_B$ to octal.
text: 265.4 | (265.4)O | (265.4)8
> Groups of three from the point: $010\,|\,110\,|\,101\,.\,100$, that is $2, 6, 5$ and $4$. Check: $2\times64 + 6\times8 + 5 = 181 = (B5)_H$.

? What is $(7E)_H$ in decimal?
answer: 126
tolerance: 0
> $7 \times 16 + 14 = 112 + 14 = 126$.

? Convert $(201)_3$ to base 4.
text: 103 | (103)4
> Indirect method. $(201)_3 = 2\times9 + 0 + 1 = 19$. Then $19 \div 4 = 4$ r 3, $4 \div 4 = 1$ r 0, $1 \div 4 = 0$ r 1: bottom up $(103)_4$. Check $16 + 0 + 3 = 19$.

? Which statements are true?
- [x] $(10)_H = (16)_D$
- [ ] One hex digit stands for exactly three bits
- [x] The first remainder in repeated division is the lowest digit
- [ ] Every decimal fraction has an exact, finite binary form
> One hex digit is four bits ($16 = 2^4$); octal digits are three. $0.1$ is an example of a decimal fraction that repeats forever in binary.
:::

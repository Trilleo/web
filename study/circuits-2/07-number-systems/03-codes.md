---
title: Codes
zh: 常用编码
summary: How bit patterns stand for digits, positions and characters rather than quantities — BCD codes, Gray code, ASCII and the seven-segment display code.
source: 第2章 数制和码制 (2.5 几种常用的编码), 2026-09-29
---

The last two lessons used bits to write the *size* of a number. Very often, though, a group
of bits is just a *label*: the digit a calculator key stands for, the position of a rotating
shaft, the letter "A" in a text file, the segments to light on a display. Such an agreed set
of labels is a {{term code | 编码}}. This lesson covers the codes the course uses again and
again: BCD codes (decimal digits for circuits), Gray code (positions that change one bit at a
time, and the ordering behind Karnaugh maps), ASCII (characters) and the seven-segment code
(what a digit display needs). Later chapters build circuits that convert between them
(encoders, decoders, code converters).

## Numbers as quantities and numbers as codes

The same digits can be used in two quite different ways:

- as a **quantity**: a score of 60 is a pass, and $60 > 59$ means something;
- as a **code**: in "unit 8341" (8341部队) the digits are a name. Nobody adds two unit
  numbers or asks which is larger.

The same is true of bits. A {{term code word | 码字}} is one pattern of the code, and each
of its digits is a {{term code element | 码元}}. What a code word means is fixed by the code's
table, not by arithmetic.

## BCD codes

People think in decimal; hardware works in binary. A calculator therefore has to store each
decimal digit 0–9 as bits. A code that does that is a
{{term binary-coded decimal | BCD码 (Binary Coded Decimal)}} code.

How many bits does one decimal digit need? Three bits give only $2^3 = 8$ patterns, too few
for ten digits. Four bits give $2^4 = 16$, so a BCD code uses 4 bits per digit and picks
**10 of the 16 patterns**; the other 6 are unused. Different choices of the ten patterns
give different BCD codes.

::: define BCD code | BCD码
A code that represents each decimal digit 0–9 by its own group of 4 bits, chosen from the 16
possible patterns. A multi-digit decimal number is written digit by digit, one 4-bit group
per digit.
:::

### The 8421 code

The obvious choice: write each digit in plain 4-bit binary, $0 = 0000$ to $9 = 1001$, and
leave $1010$–$1111$ unused. Its bit weights are 8, 4, 2, 1, hence the name.

::: define 8421 BCD code | 8421码
The BCD code in which each digit is its 4-bit binary value, with weights 8, 4, 2, 1 from the
highest bit. The patterns 1010–1111 are never used. It is a weighted code ({{zh 有权码}}):
the digit is the sum of the weights of its 1 bits.
:::

::: example A decimal number in 8421 BCD
Write $(1995)_D$ in 8421 BCD, and $(0111\,0010\,0110)_{8421BCD}$ in decimal.
== Digit by digit ==
$1 = 0001$, $9 = 1001$, $9 = 1001$, $5 = 0101$:
$(1995)_D = (0001\,1001\,1001\,0101)_{8421BCD}$.
== Back ==
Split into groups of 4 and read each: $0111 = 7$, $0010 = 2$, $0110 = 6$, so the number
is $726$.
:::

### Binary or BCD?

A string of bits means nothing until you know whether it's a binary number or a BCD code.
The slides' example takes the same 12 bits, $100010010011$:

::: example The same bits, two meanings
Read $100010010011$ as a binary number and as 8421 BCD.
== As a binary number ==
Weights from $2^{11}$ down: $2048 + 128 + 16 + 2 + 1 = 2195$, so
$(100010010011)_B = (2195)_D$.
== As 8421 BCD ==
Split into 4-bit groups and read each one as a digit: $1000 = 8$, $1001 = 9$, $0011 = 3$, so
$(1000\,1001\,0011)_{8421BCD} = (893)_D$.
:::

::: callout pitfall BCD is not conversion to binary
Writing 893 in BCD is **not** converting 893 to binary. $893 = (11\,0111\,1101)_B$ (10 bits),
while BCD writes each digit separately and needs 12. BCD wastes some patterns but makes
showing and typing decimal numbers easy; arithmetic is done in plain binary. Never group
a binary number into fours and read the groups as decimal digits.
:::

### Excess-3, 2421 and 5421 codes

The other BCD codes on the slides choose their ten patterns differently:

::: define Excess-3 code | 余3码
The BCD code obtained by adding 3 ($0011$) to each digit's 8421 code: $0 = 0011$ to
$9 = 1100$. It is an unweighted code ({{zh 无权码}}): the bits have no fixed weights.
:::

::: formula Excess-3 from 8421 | 余3码
$$[\,d\,]_{\text{余3}} = [\,d\,]_{8421} + 0011$$
--
d | a decimal digit, 0–9 |
:::

::: define 2421 code | 2421码
A weighted BCD code with weights 2, 4, 2, 1 from the highest bit. Digits 0–4 are written
as in 8421; 5–9 as $1011$–$1111$ (on the slides).
:::

::: define 5421 code | 5421码
A weighted BCD code with weights 5, 4, 2, 1. Digits 0–4 are as in 8421; 5–9 are $1000$–$1100$.
:::

The table of common BCD codes (the slide also lists the first ten Gray code words, explained
below):

| Decimal | 8421 | Excess-3 余3码 | Gray 格雷码 | 2421 | 5421 |
| --- | --- | --- | --- | --- | --- |
| 0 | 0000 | 0011 | 0000 | 0000 | 0000 |
| 1 | 0001 | 0100 | 0001 | 0001 | 0001 |
| 2 | 0010 | 0101 | 0011 | 0010 | 0010 |
| 3 | 0011 | 0110 | 0010 | 0011 | 0011 |
| 4 | 0100 | 0111 | 0110 | 0100 | 0100 |
| 5 | 0101 | 1000 | 0111 | 1011 | 1000 |
| 6 | 0110 | 1001 | 0101 | 1100 | 1001 |
| 7 | 0111 | 1010 | 0100 | 1101 | 1010 |
| 8 | 1000 | 1011 | 1100 | 1110 | 1011 |
| 9 | 1001 | 1100 | 1101 | 1111 | 1100 |
| Weights | 8421 | none | none | 2421 | 5421 |

::: example Reading weighted codes
Which digits are $(1110)_{2421}$, $(1011)_{5421}$ and $(1010)_{余3}$?
== 2421 ==
Weights 2, 4, 2, 1: $2 + 4 + 2 = 8$.
== 5421 ==
Weights 5, 4, 2, 1: $5 + 2 + 1 = 8$.
== Excess-3 ==
No weights: subtract 3 instead. $1010 - 0011 = 0111 = 7$.
:::

::: callout note Why so many codes?
In 2421 and 5421 some digits could be written two ways ($5 = 0101$ or $1011$ in 2421), so
each code fixes one choice, the one in the table. The choices give useful properties. In
excess-3 and the slides' 2421 code, inverting all four bits gives the **9's complement**
($9 - d$): $2 = 0101 \to 1010 = 7$ in excess-3, $4 = 0100 \to 1011 = 5$ in 2421. That made
decimal subtraction easy in early calculators. In 5421 the highest bit says at once
whether the digit is 5 or more.
:::

## Gray code

### Why change only one bit at a time

Imagine a disc on a motor shaft, with tracks of black and white printed on it, read by four
light sensors to report the shaft's position as a 4-bit number. Going from position 3 to 4
in 8421, the reading changes from $0011$ to $0100$: **three** bits change at once. The
sensors are never perfectly lined up, so for a moment some have switched and others
haven't, and the reading can briefly be $0111$, $0001$ or anything in between: a
false position. This {{term transition noise | 过渡噪声}} happens whenever several bits must
change together.

The cure is a code in which neighbouring values differ in exactly **one** bit. Then a
change is either not seen yet or seen completely; there's nothing in between.

::: define Gray code | 格雷码
A code in which any two neighbouring code words differ in exactly one bit, the others staying
the same. The last word and the first also differ in one bit, so it is a cyclic code
({{zh 循环码}}). It is unweighted. Because it avoids transition noise it is a reliable code
({{zh 可靠性编码}}), widely used for inputs and outputs such as position sensors.
:::

The slides' example, going from 3 to 4:

| Decimal | 8421 | Gray |
| --- | --- | --- |
| 3 | 0011 | 0010 |
| 4 | 0100 | 0110 |
| Bits that change | 3 | 1 |

### Building Gray code: the snake

The slides draw Gray code as a "snake" through a grid. Label the columns and rows with a
shorter Gray code, then walk the grid row by row, turning back at each end (left to right,
then right to left …). Reading each cell as *row label then column label* gives the longer
code.

- **2 bits**: a 2 × 2 grid with rows 0, 1 and columns 0, 1. Row 0 left to right gives 00, 01;
  row 1 right to left gives 11, 10. Sequence: **00, 01, 11, 10**.
- **3 bits**: rows 0, 1; columns 00, 01, 11, 10 (the 2-bit code). Row 0 forwards, row 1
  backwards: **000, 001, 011, 010, 110, 111, 101, 100**.
- **4 bits**: rows and columns both 00, 01, 11, 10, four rows snaking:

| Row \ column | 00 | 01 | 11 | 10 | Direction |
| --- | --- | --- | --- | --- | --- |
| 00 | 0000 | 0001 | 0011 | 0010 | → |
| 01 | 0110 | 0111 | 0101 | 0100 | ← |
| 11 | 1100 | 1101 | 1111 | 1110 | → |
| 10 | 1010 | 1011 | 1001 | 1000 | ← |

So the 4-bit Gray code is 0000, 0001, 0011, 0010, 0110, 0111, 0101, 0100, 1100, 1101, 1111,
1110, 1010, 1011, 1001, 1000. Moving one step along the snake changes either the column
(one bit, since the column labels are Gray) or, at a turn, the row (one bit); never both.

::: callout key The grid is a Karnaugh map
The row and column labels 00, 01, 11, 10 are in Gray order, exactly as in a **Karnaugh map**,
which you'll meet in logic algebra. That is why neighbouring cells of a Karnaugh map differ
in one variable.
:::

### Building Gray code: reflect and prefix

The same sequence comes from a mirror rule ({{zh 反射法}}), the reason Gray code is also called
the *reflected* binary code. Take the $n$-bit code, write it again below in reverse order (the
mirror image), put 0 in front of the top half and 1 in front of the bottom half.

::: example From 2-bit to 3-bit Gray code by reflection
Build the 3-bit Gray code from the 2-bit one.
== Write and mirror ==
2-bit code: 00, 01, 11, 10. Mirrored below it: 10, 11, 01, 00.
== Prefix ==
Top half with 0: 000, 001, 011, 010. Bottom half with 1: 110, 111, 101, 100.
== Result ==
000, 001, 011, 010, 110, 111, 101, 100, the same as the snake. Across the mirror line
(010 → 110) only the new front bit changes; inside each half only the old bits change.
:::

### Converting binary to Gray code

There's also a direct rule (not on the slides, but standard): keep the highest bit, then each
Gray bit says whether two neighbouring binary bits **differ**. "Differ" is the exclusive-OR
$\oplus$, which you'll meet properly in logic algebra: $0\oplus0 = 0$, $0\oplus1 = 1$,
$1\oplus0 = 1$, $1\oplus1 = 0$.

::: formula Binary to Gray code | 二进制码转换为格雷码
$$G_{n-1} = B_{n-1}, \qquad G_i = B_{i+1} \oplus B_i$$
--
B_i | bit $i$ of the binary number |
G_i | bit $i$ of the Gray code |
\oplus | exclusive OR: 1 when the two bits differ |
:::

::: example Binary 0110 to Gray
Convert the binary number $0110$ (6) to Gray code.
== Bit by bit ==
$G_3 = B_3 = 0$; $G_2 = B_3 \oplus B_2 = 0 \oplus 1 = 1$; $G_1 = B_2 \oplus B_1 = 1\oplus1 = 0$;
$G_0 = B_1 \oplus B_0 = 1 \oplus 0 = 1$.
== Result ==
$0101$, which is the Gray code for 6 in the table ✓.
:::

Flip the binary inputs below and watch the Gray outputs; the truth table shows the whole
4-bit code, and each row's Gray word differs from the next row's in one bit.

::: logic Binary to Gray converter
inputs: B3 B2 B1 B0
G3 = B3
G2 = B3 ⊕ B2
G1 = B2 ⊕ B1
G0 = B1 ⊕ B0
:::

::: callout pitfall Gray code is not for arithmetic
Gray code has no weights, so a Gray word can't be read by adding weights: $(0110)_{Gray}$ is 4,
not 6. Convert to binary first (or look it up).
:::

## ASCII: codes for characters

Text needs codes too. The standard one is {{term ASCII | 美国标准信息交换码}} (American
Standard Code for Information Interchange). It began as a US national standard and became an
international one; it fixes the code of every character so that different computers and
programs can exchange text, and practically every computer uses it.

::: define ASCII | ASCII码
A 7-bit character code, $d_6d_5d_4\,d_3d_2d_1d_0$: $2^7 = 128$ code words for 128 characters,
namely 33 control characters (line feed, carriage return …), the space, digits, upper and
lower case letters and punctuation.
:::

In the table, the column gives the three high bits $d_6d_5d_4$ and the row the four low bits
$d_3d_2d_1d_0$. For example column 100 and row 0001 meet at **A**, so A is $100\,0001$
($41_H = 65$). The table below is standard ASCII; the characters `$`, `\` and the vertical bar
are written in words where a table can't show them.

| Low bits $d_3d_2d_1d_0$ | 000 | 001 | 010 | 011 | 100 | 101 | 110 | 111 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0000 | NUL | DLE | space | 0 | @ | P | grave accent | p |
| 0001 | SOH | DC1 | ! | 1 | A | Q | a | q |
| 0010 | STX | DC2 | double quote | 2 | B | R | b | r |
| 0011 | ETX | DC3 | # | 3 | C | S | c | s |
| 0100 | EOT | DC4 | dollar sign | 4 | D | T | d | t |
| 0101 | ENQ | NAK | % | 5 | E | U | e | u |
| 0110 | ACK | SYN | & | 6 | F | V | f | v |
| 0111 | BEL | ETB | apostrophe | 7 | G | W | g | w |
| 1000 | BS | CAN | ( | 8 | H | X | h | x |
| 1001 | HT | EM | ) | 9 | I | Y | i | y |
| 1010 | LF | SUB | * | : | J | Z | j | z |
| 1011 | VT | ESC | + | ; | K | [ | k | { |
| 1100 | FF | FS | , | < | L | backslash | l | vertical bar |
| 1101 | CR | GS | hyphen | = | M | ] | m | } |
| 1110 | SO | RS | . | > | N | caret ^ | n | ~ |
| 1111 | SI | US | / | ? | O | underscore _ | o | DEL |

::: callout note Where the slide's table differs
The slide's table has a few differences from standard ASCII: code $001\,0000$ is printed
"DEL" (standard: DLE, data link escape; DEL is $111\,1111$, at the bottom right), $001\,1111$ is
printed "HS" (standard: US, unit separator), and $101\,1110$ and $101\,1111$ show ↑ and ←,
the glyphs of the 1963 version of ASCII, for what is now the caret ^ and the underscore _.
Use the standard names in answers.
:::

A few patterns make the table easy to use:

- The digits 0–9 are $011\,0000$ to $011\,1001$: the low four bits are the digit's **8421 BCD**
  code ("0" is $30_H$, "9" is $39_H$).
- Upper case A–Z start at $100\,0001$ ($41_H$); lower case a–z at $110\,0001$ ($61_H$). A letter
  and its other case differ only in bit $d_5$.
- Columns 000 and 001 (and DEL) are control characters, not printed: LF (line feed) is
  $000\,1010$, CR (carriage return) $000\,1101$.

::: example Spelling a word in ASCII
Write "Hi" in ASCII, in binary and hex.
== H ==
Column 100, row 1000: $100\,1000 = 48_H$ (72).
== i ==
Column 110, row 1001: $110\,1001 = 69_H$ (105).
== Result ==
"Hi" = $100\,1000\;\;110\,1001$, or $48_H\;69_H$.
:::

## The seven-segment display code

A digital clock or a meter shows each digit with seven bar-shaped segments, named **a** to **g**:
a at the top, then clockwise b (upper right), c (lower right), d (bottom), e (lower left),
f (upper left), and g across the middle. Showing a digit means lighting the right segments, so
each digit gets a 7-bit code, one bit per segment, 1 for lit. This is the
{{term seven-segment display code | 数符编码}}.

| Digit | a | b | c | d | e | f | g |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 1 | 1 | 1 | 1 | 1 | 1 | 0 |
| 1 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| 2 | 1 | 1 | 0 | 1 | 1 | 0 | 1 |
| 3 | 1 | 1 | 1 | 1 | 0 | 0 | 1 |
| 4 | 0 | 1 | 1 | 0 | 0 | 1 | 1 |
| 5 | 1 | 0 | 1 | 1 | 0 | 1 | 1 |
| 6 | 1 | 0 | 1 | 1 | 1 | 1 | 1 |
| 7 | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| 8 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 9 | 1 | 1 | 1 | 1 | 0 | 1 | 1 |

::: example Checking a row
Check the code for 2 by picturing the display.
== Segments ==
A "2" has the top (a), upper right (b), middle (g), lower left (e) and bottom (d) lit; the
upper left (f) and lower right (c) are dark.
== Code ==
a b c d e f g = 1 1 0 1 1 0 1, as in the table.
:::

A calculator stores digits in 8421 BCD but displays them in seven-segment code, so between
the two sits a code converter, the BCD-to-seven-segment decoder of the combinational logic
chapter. Each segment is a logic function of the four BCD bits. Here is segment **a** as a
Karnaugh map over the 8421 bits $A B C D$ (A the highest): 1 for the digits that light a, and
× for the unused patterns 10–15, which never occur. You don't need to read the groups yet;
notice that the map's labels are the Gray code from above.

::: kmap a
vars: A B C D
ones: 0 2 3 5 6 7 8 9
dont-care: 10 11 12 13 14 15
group: A
group: C
group: B D
group: B' D'
:::

::: callout note Lit can also be 0
The table assumes a display that lights a segment on a 1 (common cathode, {{zh 共阴极}}). In a
common-anode display ({{zh 共阳极}}) a segment lights on a 0, and every bit of the code is
inverted.
:::

::: callout exam What to expect
Writing a decimal number in 8421 BCD or excess-3, telling a binary number from a BCD code
(the 2195 / 893 example), writing out or recognising Gray code sequences and explaining why
Gray code is reliable, and reading a character's ASCII code from the table.
:::

::: cards Codes
Why does BCD need 4 bits per digit? :: 3 bits give only 8 patterns; 4 give 16, from which 10 are chosen for 0–9.
8421 BCD? :: Each decimal digit as its 4-bit binary value (weights 8, 4, 2, 1); 1010–1111 unused.
Excess-3 code (余3码)? :: 8421 code + 0011; unweighted; 0 = 0011, 9 = 1100.
2421 and 5421 codes? :: Weighted BCD codes with weights 2, 4, 2, 1 and 5, 4, 2, 1.
$(100010010011)$ as binary and as 8421 BCD? :: Binary: 2195. BCD: 1000 1001 0011 = 893.
Gray code's defining property? :: Neighbouring code words differ in exactly one bit (and the last and first too: cyclic).
Why is Gray code reliable (可靠性编码)? :: Only one bit changes per step, so no false intermediate values (transition noise) appear while it changes.
3-bit Gray code? :: 000, 001, 011, 010, 110, 111, 101, 100.
How do you build the next Gray code by reflection? :: Write the code, mirror it below, prefix the top half with 0 and the bottom half with 1.
Binary to Gray rule? :: $G_{n-1} = B_{n-1}$, $G_i = B_{i+1} \oplus B_i$.
Basic ASCII? :: A 7-bit code, 128 characters; column $d_6d_5d_4$, row $d_3d_2d_1d_0$.
ASCII of A, a and 0? :: A = 100 0001 (41H), a = 110 0001 (61H), 0 = 011 0000 (30H).
Seven-segment segment names? :: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle.
Seven-segment code of 8? :: 1111111: every segment lit.
:::

::: quiz Check yourself
? Write $(59)_D$ in 8421 BCD.
text: 0101 1001 | 01011001 | 1011001
> Digit by digit: $5 = 0101$, $9 = 1001$. (Not the binary $111011$.)

? What decimal number is $(0111\,1000)_{8421BCD}$?
answer: 78
tolerance: 0
> Read each group of four: $0111 = 7$, $1000 = 8$.

? Write the digit 6 in excess-3 code.
text: 1001
> $0110 + 0011 = 1001$.

? The 12 bits $0011\,0101\,0010$ are read once as binary and once as 8421 BCD. Which is right?
- [x] Binary: 850; BCD: 352
- [ ] Binary: 352; BCD: 850
- [ ] Both are 352
- [ ] Binary: 850; BCD: it isn't a valid BCD code
> As binary, $001101010010 = 512 + 256 + 64 + 16 + 2 = 850$. As BCD, $0011 = 3$, $0101 = 5$, $0010 = 2$: 352. All three groups are valid digits.

? Which digit is $(1101)_{2421}$?
answer: 7
tolerance: 0
> Weights 2, 4, 2, 1: $2 + 4 + 1 = 7$.

? Convert the binary number $1011$ to Gray code.
text: 1110
> $G_3 = 1$; $G_2 = 1\oplus0 = 1$; $G_1 = 0\oplus1 = 1$; $G_0 = 1\oplus1 = 0$. So $1110$. In the 4-bit sequence, 1110 is the 12th word (counting from 0 it's position 11 = $1011_B$) ✓.

? Which of these pairs could be neighbours in a Gray code sequence?
- [x] 0110 and 0111
- [ ] 0011 and 0100
- [x] 1000 and 0000
- [ ] 0101 and 0110
> Neighbours differ in exactly one bit. 0110/0111 and 1000/0000 (the end and start of the 4-bit cycle) do; 0011/0100 differ in three bits, 0101/0110 in two.

? Which character has the ASCII code $110\,0001$?
text: a | lowercase a | small a
> Column 110 is lower case, row 0001 the first letter: "a" ($61_H$ = 97). Upper case A is $100\,0001$.

? Write the seven-segment code (a b c d e f g) for the digit 4.
text: 0110011 | 0 1 1 0 0 1 1
> A "4" lights b, c (the right side), f (upper left) and g (middle): a b c d e f g = 0 1 1 0 0 1 1.

? Why is Gray code used for position encoders?
- [x] Only one bit changes between neighbouring positions, so no false readings appear during a change
- [ ] It needs fewer bits than binary
- [ ] Its bits have weights, which makes it easy to add
- [ ] It represents each decimal digit separately
> It uses the same number of bits as binary and has no weights. Its one-bit-change property is what avoids transition noise.
:::

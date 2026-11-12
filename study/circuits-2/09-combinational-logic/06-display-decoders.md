---
title: Display decoders
zh: 显示译码器
summary: Showing a BCD digit on a seven-segment display - LED and LCD displays, common-cathode and common-anode LED displays, the BCD-to-seven-segment decoders 74LS48 (active high) and 74LS47 (active low), their lamp-test and blanking pins, function table, and blanking leading and trailing zeros by ripple blanking.
source: 第5章 组合逻辑电路 5.6 译码器: 显示译码器 (teacher's slides 60–65)
---

A digital circuit keeps numbers as binary codes, but people want to read digits. The
display on a microwave or a multimeter shows each digit with seven bars that light
up in different patterns, and something has to turn the 4-bit code of a digit into the
right seven on/off signals. That something is a display decoder. This lesson explains
the display itself, the two standard decoder chips that drive it (the 74LS48 and
74LS47), and how a row of them hides the meaningless zeros at the start and end of a
number. For the exam you need to read these chips' outputs in a correctly wired circuit.

## What a display decoder is

The binary decoder of the last lesson turned a code into one active line out of eight.
A display decoder also translates a code, but into a pattern: several outputs on at
once, chosen so that a display shows the digit.

::: define Display decoder | 显示译码器
A circuit that converts a code (usually BCD) into a decimal display or a particular code,
such as a seven-segment code, and shows the result on a display device.
:::

Recall that BCD (from the codes lesson) writes each decimal digit 0–9 as its own 4-bit
binary number, 0000 to 1001. The display decoder's inputs are those four bits, called
$D$, $C$, $B$, $A$ here, with $D$ the most significant (high) and $A$ the least (low).

## Display devices

The slides show two kinds of display device (显示器件):

- **LED** (Light-Emitting Diode, 发光二极管): each segment is a small light-emitting
  diode that glows when current flows through it. Bright, cheap, used in the classic red
  digit modules.
- **LCD** (Liquid Crystal Display, 液晶显示器): segments or dots that change how they let
  light through when a voltage is applied. They use far less power, so they suit
  battery-powered devices; the slide's example is a two-line character LCD module.

This lesson's chips drive LED displays.

### The seven-segment LED display

::: define Seven-segment display | 七段数码管
A digit display made of seven bar-shaped LED segments, named a to g, arranged as a
figure 8, usually with an eighth LED for the decimal point (dp). Lighting a chosen set of
segments shows a digit.
:::

The segments go clockwise from the top: **a** top, **b** upper right, **c** lower right,
**d** bottom, **e** lower left, **f** upper left, and **g** the middle bar. Every
segment's LED has two ends, and to save pins one end of all eight LEDs is joined into a
common pin (com). That gives two kinds of display.

::: define Common-cathode display | 共阴极数码管
A seven-segment display whose LEDs' cathodes are all joined to the common pin, which
goes to ground. A segment lights when its own pin is driven **high**: it is driven
active high (驱动电平为高电平有效).
:::

::: define Common-anode display | 共阳极数码管
A seven-segment display whose LEDs' anodes are all joined to the common pin, which goes
to $+V_{CC}$. A segment lights when its own pin is pulled **low**: it is driven active
low (驱动电平为低电平有效).
:::

A diode conducts from anode to cathode. With the cathodes grounded, a segment needs a
high voltage at its anode; with the anodes at $+V_{CC}$, it needs a low voltage at its
cathode. Below, one segment of each kind with its series resistor. On the left the
decoder's output acts like a switch to ground (closed = output low, segment lit); on the
right it is a high output driving current down through the LED.

::: circuit One segment: common anode (left, lit by a low output) and common cathode (right, lit by a high output)
D1 0,0 0,4 a
R1 0,4 0,8 300Ω
S1 0,8 0,12 closed
G 0,12
label +VCC 0,0
label low 0,8
label high 8,0
R2 8,0 8,4 300Ω
D2 8,4 8,8 a
G 8,8
:::

The resistor limits each segment's current. Not on the slide, but useful: with the
LED's forward voltage $U_F$ and the output's voltage taken as 0 when low,

::: formula Segment current | 段电流
$$I_F \approx \frac{V_{CC} - U_F}{R}$$
--
I_F | current through one lit segment | mA
V_{CC} | supply on the common anode | V
U_F | the LED's forward voltage (about 1.8–2.2 V for red) | V
R | series resistor for that segment | Ω
:::

::: explore Segment current of a common-anode display
slider VCC: 3 .. 12 = 5 | V
slider UF: 1.5 .. 3.5 = 2 | V
slider R: 100 .. 2000 = 300 | Ω
I = (VCC - UF) / R * 1000 | mA | Segment current
:::

::: example The slide's 300 Ω resistors
The slide's 74LS47 drives a common-anode display through seven 300 Ω resistors
(300Ω×7), with the common pin at $+V_{CC}$. Take $V_{CC} = 5$ V and $U_F = 2$ V. What current
flows in a lit segment?
== Formula ==
$I_F \approx (V_{CC} - U_F)/R$.
== Numbers ==
$I_F = (5 - 2)/300 = 0.01$ A $= 10$ mA, a typical brightness for a small LED digit.
:::

### Which segments make each digit

The slide's table of shapes (显示字型) shows what both chips display for each input code.
Note two details: the 6 has **no top bar** and the 9 **has** its bottom bar.

| Digit | Input DCBA | Segments lit |
|---|---|---|
| 0 | 0000 | a b c d e f |
| 1 | 0001 | b c |
| 2 | 0010 | a b d e g |
| 3 | 0011 | a b c d g |
| 4 | 0100 | b c f g |
| 5 | 0101 | a c d f g |
| 6 | 0110 | c d e f g |
| 7 | 0111 | a b c |
| 8 | 1000 | a b c d e f g |
| 9 | 1001 | a b c d f g |
| (10) | 1010 | d e g (a small "c") |
| (11) | 1011 | c d g (a reversed small "c") |
| (12) | 1100 | b f g (a "u" in the upper half) |
| (13) | 1101 | a d f g |
| (14) | 1110 | d e f g (a small "t") |
| (15) | 1111 | none: blank |

Codes 10–15 aren't BCD digits, but the chips still show something definite for them;
1111 shows nothing.

### Building one segment yourself

A display decoder is just seven 4-variable functions, one per segment. Here is segment
$a$ designed by hand as an exercise (not from the slides): it is 1 for digits 0, 2, 3, 5, 7,
8, 9. If we treat codes 10–15 as don't-cares (a BCD input never gives them), the map is:

::: kmap a
vars: D C B A
ones: 0 2 3 5 7 8 9
dont-care: 10 11 12 13 14 15
group: D
group: C A
group: C' A'
group: B A
:::

So $a = D + CA + \overline{C}\,\overline{A} + BA$. Doing the same for every segment gives the lab
below: set $DCBA$ to a BCD digit and the lamps show which segments light (for 10–15 this
hand-made version shows whatever the simplification gives, not the chips' shapes).

::: logic A hand-made BCD-to-seven-segment decoder, active high (for a common-cathode display)
inputs: D C B A
a = D + C A + C' A' + B A
b = C' + B' A' + B A
c = B' + A + C
d = D + C' A' + B A' + C' B + C B' A
e = C' A' + B A'
f = D + B' A' + C B' + C A'
g = D + C' B + C B' + B A'
:::

## The 74LS48 and 74LS47

Two medium-scale (中规模) chips do this job, and they differ only in which display they
suit:

::: define 74LS48 | 74LS48
A BCD-to-seven-segment display decoder whose outputs are active high: a lit segment's
output is 1. It drives **common-cathode** LED displays.
:::

::: define 74LS47 | 74LS47
A BCD-to-seven-segment display decoder whose outputs are active low: a lit segment's
output is 0. It drives **common-anode** LED displays.
:::

::: callout key Match the decoder to the display
Common cathode ↔ 74LS48 (outputs active high). Common anode ↔ 74LS47 (outputs active
low). The "lit" level the display needs must be the level the decoder gives.
:::

Both chips have the same pins (logic symbol marked BIN/7-SEG):

| Pin | Name | Role |
|---|---|---|
| 7, 1, 2, 6 | $A$, $B$, $C$, $D$ | data inputs (数据输入), BCD, $A$ low to $D$ high |
| 13, 12, 11, 10, 9, 15, 14 | $a$, $b$, $c$, $d$, $e$, $f$, $g$ | seven-segment code outputs (七段码输出) |
| 3 | $\overline{LT}$ | lamp-test input (试灯输入), active low |
| 5 | $\overline{RBI}$ | ripple-blanking input (动态灭灯输入), active low |
| 4 | $\overline{BI}/\overline{RBO}$ | blanking input (灭灯输入) / ripple-blanking output (动态灭灯输出), one pin used both ways |

The three control pins:

::: define Lamp test | 试灯输入
$\overline{LT}$: pulling it to 0 (with $\overline{BI}/\overline{RBO}$ at 1) lights **all seven
segments** whatever the data, to check that none is burnt out.
:::

::: define Blanking input | 灭灯输入
$\overline{BI}$: driving pin 4 to 0 from outside turns **all segments off** whatever the
other inputs are. It overrides everything else.
:::

::: define Ripple blanking | 动态灭灯
$\overline{RBI}$ (input) and $\overline{RBO}$ (output) blank an unwanted zero. If
$\overline{RBI} = 0$ and the data are $DCBA = 0000$, the chip shows nothing instead of a 0
and drives $\overline{RBO} = 0$ to tell its neighbour. If the digit isn't 0, or
$\overline{RBI} = 1$, the digit shows normally and $\overline{RBO} = 1$.
:::

### The 74LS47 function table

The slide gives the 74LS47's table (for a common-anode display, so 1 means a segment is
**off** and 0 means it is **lit**):

| Pin $\overline{BI}/\overline{RBO}$ | Pin $\overline{LT}$ | Pin $\overline{RBI}$ | Data DCBA | Outputs a–g | What the display shows |
|---|---|---|---|---|---|
| 0 (input) | × | × | ×××× | 1111111 | blank (灭灯) |
| 1 | 0 | × | ×××× | 0000000 | 8, all segments (试灯) |
| 0 (output, $\overline{RBO}$) | 1 | 0 | 0000 | 1111111 | blank: the zero is suppressed (动态灭灯) |
| 1 | 1 | 1 | 0000 to 1111 | the digit's code | the digit (显示字型) |

In the third row pin 4 is an **output**: the chip itself pulls it to 0 to say "I
blanked a zero". In the first row it is an **input** driven to 0 from outside. The
74LS48's table is the same with every output inverted (blank = 0000000, lamp test =
1111111).

::: example Reading a 74LS47 and a 74LS48
(a) A 74LS47 has $\overline{BI}/\overline{RBO} = 1$, $\overline{LT} = 1$, $\overline{RBI} = 1$, $DCBA = 0101$.
Find $abcdefg$. (b) The same inputs on a 74LS48. (c) The 74LS47 with $\overline{LT} = 0$.
== (a) Normal display ==
All controls inactive, so the chip shows the digit 5: segments a, c, d, f, g lit, b and e
dark. The 74LS47 is active low, so lit = 0: $abcdefg = 0100100$.
== (b) The 74LS48 ==
Active high: lit = 1, so $abcdefg = 1011011$. Same picture, inverted signals.
== (c) Lamp test ==
$\overline{LT} = 0$ lights everything: $abcdefg = 0000000$ on the 74LS47, showing "8".
:::

::: callout pitfall Lit is 0 on the 74LS47
Writing $abcdefg = 1011011$ for a 5 on a 74LS47 is the 74LS48's answer. First decide which
segments are lit from the shape, then write each lit one as 0 (47) or 1 (48).
:::

::: callout pitfall A 6 has no top bar here
On these chips 6 is c d e f g (no a) and 9 is a b c d f g (with d). Other decoders draw
them differently, so use the slide's shapes in exam answers.
:::

## Ripple blanking: hiding leading and trailing zeros

A six-digit display showing the number 3.2 with fixed positions would read
**003.200**. The zeros at the front (leading zeros) and the back (trailing zeros) carry
no information and clutter the display. Ripple blanking hides exactly those zeros, and
no others, by passing a "blank" signal along the row of decoders.

The slide's display has six digits, decoders I to VI, with the decimal point after
digit III. Digit III (the units digit, 个位) and digit IV (the first decimal place, 小数点后第1位)
always show their value, even 0. The rest show a 0 only when a non-zero digit stands
between them and the decimal point.

| Decoder | $\overline{RBI}$ connected to | $\overline{RBO}$ connected to |
|---|---|---|
| I (highest integer digit) | 0 | II's $\overline{RBI}$ |
| II | I's $\overline{RBO}$ | not used |
| III (units) | 1 | not used |
| IV (first decimal) | 1 | not used |
| V | VI's $\overline{RBO}$ | not used |
| VI (lowest decimal) | 0 | V's $\overline{RBI}$ |

::: law Ripple blanking of zeros | 灭零的级联
A decoder blanks its digit when $\overline{RBI} = 0$ and the digit is 0, and then outputs
$\overline{RBO} = 0$. Chaining $\overline{RBO}$ into the next digit's $\overline{RBI}$, from the
outside in towards the decimal point, blanks a run of zeros at the ends of the number and
stops at the first non-zero digit. The digits next to the decimal point get
$\overline{RBI} = 1$, so they always show.
:::

::: example 003.200 shows as "3.2"
The six decoders get the digits 0, 0, 3, 2, 0, 0 (I to VI). What does the display show?
== Decoder I ==
$\overline{RBI} = 0$ and its digit is 0: blanked, $\overline{RBO} = 0$.
== Decoder II ==
Its $\overline{RBI}$ = I's $\overline{RBO}$ = 0 and its digit is 0: blanked.
== Decoders III and IV ==
$\overline{RBI} = 1$: they show 3 and 2. (The decimal point after III is lit separately;
the decoder doesn't drive dp.)
== Decoder VI ==
$\overline{RBI} = 0$, digit 0: blanked, $\overline{RBO} = 0$.
== Decoder V ==
$\overline{RBI}$ = VI's $\overline{RBO}$ = 0, digit 0: blanked.
== Result ==
"3.2", which is what the slide's drawing shows.
:::

::: example 105.030
The digits are 1, 0, 5, 0, 3, 0. What does the display show?
== Integer side ==
Decoder I's digit is 1, not 0, so it shows 1 and gives $\overline{RBO} = 1$. Decoder II then
has $\overline{RBI} = 1$, so its 0 **shows**: it's a zero inside the number. III shows 5.
== Decimal side ==
VI: $\overline{RBI} = 0$, digit 0: blanked, $\overline{RBO} = 0$. V: $\overline{RBI} = 0$ but its digit
is 3, not 0, so it shows 3. IV has $\overline{RBI} = 1$: shows 0.
== Result ==
"105.03": only the trailing zero is hidden.
:::

::: callout note Only two zeros in a row on each side
The slide's chain goes only two digits deep on each side (I → II and VI → V). A longer
display continues the same way: each digit's $\overline{RBI}$ comes from the $\overline{RBO}$ of
the digit further from the decimal point.
:::

::: callout exam What display-decoder questions look like
The scope asks you to analyse a correctly wired 74LS47/48: say which display type it
suits, give the seven outputs for an input (lit = 0 on the 47, 1 on the 48), know what
$\overline{LT}$, $\overline{BI}$ and $\overline{RBI}$ do, and say which zeros a ripple-blanking chain
hides.
:::

::: cards Display decoders
Display decoder (显示译码器) :: Converts a code (BCD) into the segment pattern of a digit and shows it on a display.
Seven segments, a to g :: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle; plus dp.
Common-cathode display (共阴极) :: Cathodes joined to ground; a segment lights on a high level.
Common-anode display (共阳极) :: Anodes joined to $+V_{CC}$; a segment lights on a low level.
74LS48 :: BCD-to-7-segment decoder, outputs active high: drives common-cathode displays.
74LS47 :: BCD-to-7-segment decoder, outputs active low: drives common-anode displays.
Lamp test $\overline{LT} = 0$ :: All seven segments light (shows 8), to test the display.
Blanking input $\overline{BI} = 0$ :: All segments off, whatever the other inputs.
Ripple blanking condition :: $\overline{RBI} = 0$ and $DCBA = 0000$: the zero is blanked and $\overline{RBO} = 0$.
Digit 5 on a 74LS47 (abcdefg) :: $0100100$ (a, c, d, f, g lit = 0).
Digit 6 on these chips :: Segments c d e f g: no top bar.
Ripple blanking chain :: $\overline{RBO}$ of the outer digit to $\overline{RBI}$ of the next one in; digits beside the point get $\overline{RBI} = 1$.
Segment current :: $I_F \approx (V_{CC} - U_F)/R$, e.g. $(5 - 2)/300 = 10$ mA.
:::

::: quiz Display decoders
? A common-anode seven-segment display should be driven by which decoder?
- [x] 74LS47 (outputs active low)
- [ ] 74LS48 (outputs active high)
- [ ] Either, without change
> In a common-anode display the anodes sit at $+V_{CC}$, so a segment lights when its
> cathode pin is pulled low. The 74LS47's lit outputs are 0, which is what it needs.

? A 74LS47 (controls all at 1) gets $DCBA = 0011$. Which is its output $abcdefg$?
- [x] 0000110
- [ ] 1111001
- [ ] 0010010
> Digit 3 lights a, b, c, d, g; e and f are dark. Active low (lit = 0):
> $a b c d e f g = 0\,0\,0\,0\,1\,1\,0$. 1111001 is the 74LS48's output for the same digit.

? A 74LS48 (controls all at 1) gets $DCBA = 0111$. How many of its seven outputs are 1?
answer: 3
tolerance: 0
> Digit 7 is segments a, b, c only. The 74LS48 is active high, so exactly those three
> outputs are 1.

? On a 74LS47, $\overline{BI}/\overline{RBO}$ is held at 1 and $\overline{LT} = 0$. What does the display show?
- [x] All seven segments lit (an 8)
- [ ] Nothing: all segments off
- [ ] The digit given by DCBA
> $\overline{LT} = 0$ is the lamp test: every output goes to its "lit" level (0 on the 74LS47),
> so all segments light whatever the data. Only $\overline{BI} = 0$ would override it.

? A 74LS48 has $\overline{RBI} = 0$, $\overline{LT} = 1$ and $DCBA = 0000$. What is $\overline{RBO}$, and what does the display show?
- [x] $\overline{RBO} = 0$; the display is blank
- [ ] $\overline{RBO} = 1$; the display shows 0
- [ ] $\overline{RBO} = 0$; the display shows 0
> This is the ripple-blanking condition: $\overline{RBI} = 0$ with the data 0000. The chip
> suppresses the zero (all segments off) and signals it by pulling $\overline{RBO}$ to 0.

? A 74LS48 has $\overline{RBI} = 0$, $\overline{LT} = 1$, pin 4 not driven, and $DCBA = 0100$. What does the display show?
- [x] 4
- [ ] Nothing
- [ ] 8
> Blanking needs **both** $\overline{RBI} = 0$ and the digit 0. The digit is 4, so it shows
> normally and $\overline{RBO} = 1$.

? The slide's six-digit display (decimal point after digit III) receives 0, 7, 0, 0, 5, 0. What does it show?
- [x] 70.05
- [ ] 070.050
- [ ] 7.5
> I: $\overline{RBI} = 0$, digit 0, blanked. II: $\overline{RBI} = 0$ from I, but its digit is 7, so
> it shows. III and IV have $\overline{RBI} = 1$: they show 0 and 0. VI: $\overline{RBI} = 0$, digit 0,
> blanked. V: digit 5, shown. So "70.05": the zeros inside the number stay.

? In the slide's display, why are decoders III and IV given $\overline{RBI} = 1$?
- [x] So the units digit and the first decimal digit always show, even when 0
- [ ] To test their lamps
- [ ] To blank them
> A number like 0.5 must show "0.5", not ".5". With $\overline{RBI} = 1$ those two digits can't
> be ripple-blanked.

? A common-anode display at $V_{CC} = 5$ V has 300 Ω series resistors and LEDs with $U_F = 2$ V. What current flows in a lit segment?
answer: 10 mA
tolerance: 2%
> $I_F \approx (V_{CC} - U_F)/R = (5 - 2)/300 = 0.01$ A $= 10$ mA (taking the 74LS47's low
> output as 0 V).
:::

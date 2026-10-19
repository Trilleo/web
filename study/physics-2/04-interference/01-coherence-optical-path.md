---
title: Coherent light and optical path
zh: 相干光与光程
summary: When two light waves can interfere — the coherence conditions, the intensity of two superposed waves, why ordinary lamps are not coherent and how coherent beams are made — and the optical path, the tool for working out phase differences in any medium.
source: 第18章 光的干涉 §18.1, 2026-10-14 and 2026-10-16
---

Light is a wave, and waves can **interfere**: where two of them meet, their crests can
pile up and make the light brighter, or a crest can fall on a trough and the light goes
dark. That is why a soap bubble or an oil slick shows colours, and it is the basis of
some of the most precise measurements in physics. But you never see interference
between two torches pointed at the same wall. This lesson explains why: two beams must
be **coherent** to interfere, and ordinary light sources are not. It then introduces
the **optical path**, the single idea that turns every interference problem in this
chapter into "count the wavelengths along each path".

## What this chapter covers

Chapter 18, {{term interference of light | 光的干涉}}, has three parts:

- §18.1 coherent light (this lesson): the conditions for interference, how to get
  coherent beams, and the optical path;
- §18.2 Young's double-slit experiment (杨氏双缝干涉);
- §18.3 thin-film interference (薄膜干涉): wedges, Newton's rings and films.

The aims the course sets: understand the conditions for interference and the classic
ways of getting coherent light; understand what the optical path really is and why it
is introduced; and be able to analyse Young's double slit, wedge (劈尖) and Newton's
ring (牛顿环) interference and their uses. Only §18.1 has been taught so far; the
double slit and thin films are coming next. Lesson 4.2 reviews geometrical optics and
Fermat's principle, which the course teaches alongside §18.1.

::: callout note A slip on the first slide
The chapter's aims list wedge and Newton's-ring interference as "等倾干涉"
(equal-inclination interference). They are in fact **equal-thickness** interference
(等厚干涉): their fringes follow lines of equal film thickness. Equal-inclination
fringes are a different kind, which §18.3 will also meet.
:::

## Visible light

{{term Visible light | 可见光}} is the narrow band of electromagnetic waves the eye
can see, with vacuum wavelengths from about 400 nm (violet) to 760 nm (red). Its
wavelength $\lambda$ and frequency $\nu$ are tied by the speed of light in vacuum,
$c=3.0\times10^8$ m/s:

$$c=\lambda\nu .$$

The colour of light is set by its frequency, which never changes when light goes from
one medium into another; the wavelength does change (more on that under the optical
path). The slides' table:

| Colour | Wavelength (nm) | Frequency (Hz) | Centre wavelength (nm) |
| --- | --- | --- | --- |
| red 红 | 760 – 622 | $3.9\times10^{14}$ – $4.8\times10^{14}$ | 660 |
| orange 橙 | 622 – 597 | $4.8\times10^{14}$ – $5.0\times10^{14}$ | 610 |
| yellow 黄 | 597 – 577 | $5.0\times10^{14}$ – $5.2\times10^{14}$ | 570 |
| green 绿 | 577 – 492 | $5.2\times10^{14}$ – $6.1\times10^{14}$ | 540 |
| cyan 青 | 492 – 470 | $6.1\times10^{14}$ – $6.4\times10^{14}$ | 480 |
| blue 蓝 (the slide writes 兰) | 470 – 455 | $6.4\times10^{14}$ – $6.6\times10^{14}$ | 460 |
| violet 紫 | 455 – 400 | $6.6\times10^{14}$ – $7.5\times10^{14}$ | 430 |

::: callout note The slide's yellow–green boundary
The slide puts the yellow–green boundary at $5.4\times10^{14}$ Hz. With $\nu=c/\lambda$,
577 nm is $3.0\times10^8/577\times10^{-9}=5.2\times10^{14}$ Hz ($5.4\times10^{14}$ Hz
would be 555 nm). The table above uses $5.2\times10^{14}$ Hz; every other boundary on
the slide agrees with $c/\lambda$.
:::

::: example The frequency of green light
Find the frequency of light at the centre of the green band, $\lambda=540$ nm.
== Use c = λν ==
$$\nu=\frac{c}{\lambda}=\frac{3.0\times10^{8}\ \text{m/s}}{540\times10^{-9}\ \text{m}}=5.56\times10^{14}\ \text{Hz}.$$
== Compare ==
That is inside the green band, $5.2$–$6.1\times10^{14}$ Hz. Light oscillates about
$5\times10^{14}$ times a second: far too fast for any eye or detector to follow. We
only ever see the **average** brightness, and that fact decides everything about
coherence below.
:::

## The coherence conditions and two-wave intensity

Picture two pebbles dropped into a pond at the same moment: their ripples cross and
make a steady pattern, calm in some places and choppy in others. Drop them at random
times, again and again, and the pattern shifts all the time; on average you see no
pattern at all. Light is the same, except that its waves are a million billion times
faster, so "shifting all the time" always wins unless the sources are locked together.

Take two light waves with the **same vibration direction** and the **same frequency**,
from sources 1 and 2, meeting at a point P at distances $r_1$ and $r_2$. The vibrating
quantity is the electric field $\vec E$ (the "light vector"). At the sources,

$$E_1=E_{10}\cos(\omega t+\varphi_1),\qquad E_2=E_{20}\cos(\omega t+\varphi_2),$$

where $E_{10}$, $E_{20}$ are the amplitudes, $\omega$ the angular frequency and
$\varphi_1$, $\varphi_2$ the initial phases. Travelling a distance $r$ delays a wave's
phase by $2\pi r/\lambda$ (one full cycle, $2\pi$, per wavelength), so at P

$$E_{1P}=E_{10}\cos\!\Big(\omega t+\varphi_1-\frac{2\pi}{\lambda}r_1\Big),\qquad
E_{2P}=E_{20}\cos\!\Big(\omega t+\varphi_2-\frac{2\pi}{\lambda}r_2\Big).$$

Two vibrations along the same line with the same frequency add up to one vibration of
the same frequency, $E_P=E_0\cos(\omega t+\varphi)$, whose amplitude is (as for adding
two simple harmonic motions in mechanics)

$$E_0^2=E_{10}^2+E_{20}^2+2E_{10}E_{20}\cos\Delta\varphi,\qquad
\Delta\varphi=\varphi_2-\varphi_1-\frac{2\pi}{\lambda}(r_2-r_1).$$

Here $\Delta\varphi$ is the {{term phase difference | 相位差}} of the two vibrations at
P. The {{term intensity | 光强}} $I$ of a wave is the energy it carries per unit area
per unit time; for a mechanical wave it is $I=\frac12\rho\omega^2A^2u$ (density $\rho$,
amplitude $A$, wave speed $u$), and for light too it is proportional to the square of
the amplitude. So $I\propto E_0^2$, and the line above becomes the key formula.

::: formula Intensity of two superposed waves | 两相干光叠加的光强
$$I_0=I_1+I_2+2\sqrt{I_1I_2}\cos\Delta\varphi$$
--
I_0 | intensity where the two waves meet | W/m²
I_1,\ I_2 | intensities of each wave alone | W/m²
\Delta\varphi | phase difference of the two vibrations at that point | rad
:::

The last term, $2\sqrt{I_1I_2}\cos\Delta\varphi$, is the **interference term**. The
brightness at P is not simply the sum of the two brightnesses: it depends on the phase
difference.

- $\cos\Delta\varphi=1$, i.e. $\Delta\varphi=2k\pi$ ($k=0,\pm1,\pm2,\dots$):
  $I_0=I_1+I_2+2\sqrt{I_1I_2}$, the largest possible. This is
  {{term constructive interference | 相长干涉}} (干涉加强), a **bright fringe** (明纹).
- $\cos\Delta\varphi=-1$, i.e. $\Delta\varphi=(2k+1)\pi$:
  $I_0=I_1+I_2-2\sqrt{I_1I_2}$, the smallest. This is
  {{term destructive interference | 相消干涉}} (干涉减弱), a **dark fringe** (暗纹).
- Anything in between gives a brightness between the two.

Move the sliders: with equal intensities the dark fringes are truly black; make one
beam weaker and the fringes wash out. The flat line N is what you would see
with no interference at all.

::: plot Intensity against phase difference
x: -12.57 .. 18.85
xlabel: Δφ (rad)
ylabel: I₀
I(x) = a + b + 2 sqrt(a b) cos(x)
N(x) = a + b
slider a: 0 .. 4 = 1 | | I₁
slider b: 0 .. 4 = 1 | | I₂
:::

The x axis runs from $-4\pi$ to $6\pi$: peaks sit at $0,\pm2\pi,4\pi,\dots$ and the
minima at the odd multiples of $\pi$, exactly as on the slide's fringe strip.

Now the crucial point. The eye sees the **time average** of $I_0$. If $\Delta\varphi$
stays fixed, the average is just the value above, and a steady pattern of bright and
dark fringes appears. If $\Delta\varphi$ jumps about at random, $\cos\Delta\varphi$
averages to zero and $I_0=I_1+I_2$ everywhere: uniform light, no fringes. So a stable
pattern needs three things.

::: law Coherence conditions | 相干条件
Two (or more) light waves meeting in space give a stable pattern of strong and weak
intensity only if they have the **same vibration direction**, the **same frequency**,
and a **constant phase difference** (振动方向相同、频率相同、相位差恒定).
:::

::: define Coherent light | 相干光
Light waves that satisfy the coherence conditions, so that where they overlap they
produce a stable interference pattern. Their sources are called coherent sources
(相干光源).
:::

Why each condition matters: with different vibration directions (say one vertical, one
horizontal) the fields do not add along one line and there is no $\cos\Delta\varphi$
term to speak of; with different frequencies $\Delta\varphi$ changes steadily with time
and averages out; and with a wandering phase difference it averages out too.

::: example Fringe contrast from unequal beams
Two coherent beams have intensities $I_1=4I$ and $I_2=I$. Find the intensity at a
bright fringe, at a dark fringe, and without interference.
== Bright fringe ==
$I_{\max}=I_1+I_2+2\sqrt{I_1I_2}=4I+I+2\sqrt{4I^2}=5I+4I=9I$.
== Dark fringe ==
$I_{\min}=5I-4I=I$. The dark fringes are not black: a weaker beam cannot cancel a
stronger one completely.
== No interference ==
$I_1+I_2=5I$, which is also the average of $9I$ and $I$: interference does not create
or destroy energy, it moves it from the dark places to the bright ones.
== Equal beams, for comparison ==
With $I_1=I_2=I$: $I_{\max}=4I$ and $I_{\min}=0$, the clearest fringes possible.
:::

::: callout pitfall Intensities don't simply add
For coherent waves, the intensity at a point is **not** $I_1+I_2$: two equal beams give
$4I$ at a bright fringe, not $2I$. Add the *amplitudes* (with their phases), then
square. Only for incoherent light do the intensities add.
:::

## Why ordinary light sources are not coherent

An ordinary source (a bulb, a candle, the Sun) makes light atom by atom. An atom is
lifted to an {{term excited state | 激发态}} (by heat or a collision), stays there
briefly, then drops back towards the {{term ground state | 基态}} and gives the energy
off as light: {{term spontaneous emission | 自发辐射}}. Each drop lasts only about
$\Delta t\approx10^{-8}$ s, so what comes out is a short burst of waves, a
{{term wave train | 波列}}.

The slides list the three features of ordinary sources:

1. one atom, one emission, gives one wave train;
2. an atom's emission is intermittent: it emits, pauses, emits again;
3. different atoms, and different emissions of the same atom, are completely
   independent of each other.

So the trains from different atoms, and successive trains from the same atom, have
random directions, random vibration directions and random initial phases. Two separate
lamps, or two different parts of one lamp, give a phase difference that jumps about
every $10^{-8}$ s or so; any detector averages over far longer times, the
$\cos\Delta\varphi$ term averages to zero, and no fringes appear. That is why two
torches never interfere. (A laser is different: its atoms emit in step, which is why it
is the usual source in interference experiments today.)

::: example How long is one wave train?
An atom emits for $\Delta t=1.0\times10^{-8}$ s. How long is its wave train in vacuum,
and how many wavelengths of 600 nm light does it hold?
== Length ==
$l_0=c\,\Delta t=3.0\times10^8\times1.0\times10^{-8}=3.0$ m.
== Number of wavelengths ==
$l_0/\lambda=3.0/(600\times10^{-9})=5.0\times10^{6}$.
== What it means ==
Within one train the phase is perfectly regular; between trains it is random. Five
million wavelengths sounds like a lot, but it lasts a hundred-millionth of a second.
(Real lamps give shorter trains still, because collisions between atoms cut them off.)
:::

## Spatial and temporal coherence

Two practical limits follow from how sources emit, and each has a name.

::: define Spatial coherence | 空间相干性
The property that clear fringes are only obtained when the source, or the slit or hole
the light comes through, is small enough. It describes how closely the light vibrations
at two points side by side across the beam (transverse to its direction) are correlated
at the same moment, so it is also called transverse coherence (横向相干性).
:::

Why size matters: different points of a wide source are independent atoms. Each point
makes its own fringe pattern, slightly shifted from its neighbours'; add enough shifted
patterns and they blur into uniform light. A narrow slit lets through light from only a
small region, so the patterns nearly coincide.

::: define Temporal coherence | 时间相干性
The property that interference fringes blur, and finally disappear, when the optical
path difference between the two coherent beams becomes large.
:::

Why: to interfere, the two beams must be two halves of the **same** wave train. If one
path is longer than the other by more than the length of a train, the two halves no
longer overlap when they meet: the front of a train meets the tail of a *different*
one, with an unrelated phase.

::: define Coherence length | 相干长度
If one wave train travels a geometric length $l_0$ in a medium of refractive index $n$,
the corresponding optical path $L_0=nl_0$ is the coherence length. Two beams split from
the same source interfere only if their optical path difference is less than $L_0$.
:::

The "optical path" in these two definitions is defined properly below; for now read it
as "the path length counted as if in vacuum".

::: example The same train in glass
A wave train lasting $1.0\times10^{-8}$ s travels in glass with $n=1.5$. Find its
geometric length and its coherence length.
== Geometric length ==
Light in glass moves at $v=c/n=2.0\times10^8$ m/s, so
$l_0=v\,\Delta t=2.0\times10^8\times1.0\times10^{-8}=2.0$ m.
== Coherence length ==
$L_0=nl_0=1.5\times2.0=3.0$ m, the same as the train's length in vacuum. The optical
length of a train doesn't depend on the medium, which is why the coherence length is
defined with $nl_0$.
:::

## Getting coherent light: divide one beam in two

If separate sources can't be coherent, the trick is to take **one** wave train from
**one** point of a source and split it in two ("一分为二"). The two parts carry the
same random phase jumps at the same moments, so their phase *difference* stays
constant. Then send them along different paths and let them meet again. There are two
classic ways.

::: define Division of amplitude | 分振幅法
Coherent beams made by splitting the energy (amplitude) of one wave: a ray falls on a
thin transparent film, part reflects off the top surface, and part goes in, reflects
off the bottom surface and comes back out. The two reflected rays are coherent.
Thin-film interference (§18.3) works this way.
:::

::: define Division of wavefront | 分波阵面法
Coherent beams made by taking two different parts of the same wavefront: light from
one small source reaches a screen with two narrow slits $S_1$ and $S_2$, which act as
two coherent sources. Young's double slit (§18.2) works this way.
:::

::: callout tip Which method is which?
Wavefront: the beams come from two different *places* on one wave (two slits). Amplitude:
the same place on the wave is split into two *parts* of its energy (reflection and
transmission at a surface).
:::

## Optical path

Interference depends on the phase difference, and phase lags pile up along each path.
In vacuum the rule is "one wavelength of path, $2\pi$ of phase". In a medium, light
slows down to $v=c/n$, where $n$ is the {{term refractive index | 折射率}}. Its
frequency $\nu$ stays the same (it is set by the source), so its wavelength shrinks:

$$\lambda'=\frac{v}{\nu}=\frac{c}{n\nu}=\frac{\lambda}{n},$$

where $\lambda$ is the wavelength in vacuum. Going a distance $r$ in the medium, the
phase falls behind by

$$\Delta\varphi=\frac{2\pi}{\lambda'}r=\frac{2\pi}{\lambda}\,nr .$$

Read the right-hand side as a vacuum formula: going $r$ in the medium delays the phase
exactly as much as going $nr$ in vacuum. So we can replace every path by its "vacuum
equivalent" and then use the vacuum wavelength throughout. That equivalent length is
the optical path: it is a **converted quantity** (光程为折合量), not a real distance.

::: define Optical path | 光程
For light travelling a geometric distance $r$ in a medium of refractive index $n$, the
product $nr$ is the optical path of that distance. It is the distance light would
cover in vacuum in the same time, and it gives the same phase lag, $2\pi nr/\lambda$.
Over several media it is the sum $\sum n_ir_i$.
:::

::: formula Optical path | 光程
$$L=nr,\qquad \Delta\varphi=\frac{2\pi}{\lambda}\,nr$$
--
L | optical path | m
n | refractive index of the medium | —
r | geometric distance travelled in it | m
\lambda | wavelength **in vacuum** | m
\Delta\varphi | phase lag along the path | rad
:::

::: example Optical path through a glass film
Light of vacuum wavelength 600 nm crosses a glass film $3.0\ \mu$m thick with $n=1.5$.
Find the optical path and the phase lag.
== Optical path ==
$L=nr=1.5\times3.0\ \mu\text{m}=4.5\ \mu$m.
== Phase lag ==
$$\Delta\varphi=\frac{2\pi}{\lambda}L=\frac{2\pi\times4.5\times10^{-6}}{600\times10^{-9}}=15\pi .$$
== Check with the wavelength in glass ==
$\lambda'=600/1.5=400$ nm, and $3.0\ \mu$m holds $3000/400=7.5$ of them:
$7.5\times2\pi=15\pi$. Same answer, as it must be.
:::

## Optical path difference and phase difference

Now two coherent sources $S_1$ and $S_2$ (in phase) send light to a point P, the first
through a distance $r_1$ in a medium of index $n_1$, the second through $r_2$ in a
medium of index $n_2$. The phase difference at P is the difference of the two lags:

$$\Delta\varphi=\frac{2\pi}{\lambda_2}r_2-\frac{2\pi}{\lambda_1}r_1
=\frac{2\pi}{\lambda}n_2r_2-\frac{2\pi}{\lambda}n_1r_1
=\frac{2\pi}{\lambda}(n_2r_2-n_1r_1),$$

with $\lambda_1$, $\lambda_2$ the wavelengths in the two media and $\lambda$ the vacuum
wavelength.

::: define Optical path difference | 光程差
The difference of the optical paths of two beams from their (in-phase) coherent
sources to the point where they meet: $\delta=n_2r_2-n_1r_1$.
:::

::: formula Phase difference from optical path difference | 相位差与光程差的关系
$$\delta=n_2r_2-n_1r_1,\qquad \Delta\varphi=\frac{2\pi}{\lambda}\,\delta$$
--
\delta | optical path difference | m
n_1r_1,\ n_2r_2 | optical paths of the two beams | m
\lambda | wavelength in vacuum | m
\Delta\varphi | phase difference at the meeting point | rad
:::

(When the sources have different initial phases, add $\varphi_2-\varphi_1$ as in the
general formula above; in this chapter's set-ups the two beams come from one wave, so
it is zero. The sign of $\Delta\varphi$ doesn't matter for $\cos\Delta\varphi$.)

Putting $\Delta\varphi=2k\pi$ or $(2k+1)\pi$ into this gives the fringe conditions in
terms of $\delta$, the form you will use for the rest of the chapter: whole numbers of
wavelengths for bright, odd numbers of half-wavelengths for dark.

::: formula Interference conditions in optical path difference | 干涉明暗条件
$$\delta=\begin{cases}\pm k\lambda, & k=0,1,2,\dots \quad\text{constructive (bright)}\\[4pt]
\pm(2k+1)\dfrac{\lambda}{2}, & k=0,1,2,\dots \quad\text{destructive (dark)}\end{cases}$$
--
\delta | optical path difference | m
k | order of the fringe | —
\lambda | wavelength in vacuum | m
:::

The dark condition is also written $\pm(2k-1)\frac{\lambda}{2}$ with $k=1,2,\dots$;
both list the same odd multiples $\frac{\lambda}{2},\frac{3\lambda}{2},\dots$.

::: callout key Learn to think in optical path differences
Every interference problem reduces to three steps: find the optical path of each beam
($\sum nr$), subtract to get $\delta$, then compare $\delta$ with $\lambda$ (or use
$\Delta\varphi=2\pi\delta/\lambda$).
:::

Try it: change the media and lengths and watch whether P is bright or dark.

::: explore Optical path difference at P
slider n1: 1 .. 2 = 1 | | index along path 1
slider r1: 0 .. 20 = 12 | μm | length of path 1
slider n2: 1 .. 2 = 1.5 | | index along path 2
slider r2: 0 .. 20 = 9 | μm | length of path 2
slider l: 400 .. 760 = 600 | nm | vacuum wavelength λ
d = n2 r2 - n1 r1 | μm | optical path difference δ
w = 1000 d / l | | δ in wavelengths (whole: bright, half: dark)
p = 2 w | | Δφ in units of π
q = cos(pi p) | | cos Δφ
:::

::: example Geometric path says bright, optical path says dark
Two in-phase coherent beams of vacuum wavelength 600 nm reach P. Beam 1 travels
$12.0\ \mu$m in air ($n=1$); beam 2 travels $9.0\ \mu$m in glass ($n=1.5$). Is P bright
or dark?
== Optical paths ==
$n_1r_1=12.0\ \mu$m; $n_2r_2=1.5\times9.0=13.5\ \mu$m.
== Optical path difference ==
$\delta=13.5-12.0=1.5\ \mu\text{m}=1500/600\ \lambda=2.5\lambda=(2\cdot2+1)\frac{\lambda}{2}$.
== Phase difference and verdict ==
$\Delta\varphi=2\pi\times2.5=5\pi$, an odd multiple of $\pi$: **dark**.
== The wrong way ==
The geometric difference is $9.0-12.0=-3.0\ \mu$m $=-5\lambda$, a whole number of
wavelengths, which would wrongly predict a bright point.
:::

::: callout pitfall Vacuum wavelength, optical paths
In $\Delta\varphi=2\pi\delta/\lambda$ the $\lambda$ is the **vacuum** wavelength, and
$\delta$ is a difference of **optical** paths. Mixing geometric lengths with the vacuum
wavelength (or optical paths with the wavelength in the medium) gives wrong fringes,
as in the example above.
:::

## A slab in one path

The slides' example: a slab of transparent medium, refractive index $n$ and thickness
$d$, is put in the path $S_2P$. What is the phase difference at P now?

Along $S_2P$ the light still covers the geometric length $r_2$, but $d$ of it is in the
slab and only $r_2-d$ in air. Its optical path is $(r_2-d)+nd$. Path $S_1P$ is all in
air, optical path $r_1$. So

$$\Delta\varphi=\frac{2\pi}{\lambda}\delta=\frac{2\pi}{\lambda}\Big\{\big[(r_2-d)+nd\big]-r_1\Big\}
=\frac{2\pi}{\lambda}\big[(r_2-r_1)+(n-1)d\big].$$

::: formula Slab inserted in one path | 插入介质片的相位差
$$\Delta\varphi=\frac{2\pi}{\lambda}\big[(r_2-r_1)+(n-1)d\big]$$
--
r_1,\ r_2 | geometric lengths $S_1P$ and $S_2P$ | m
n | refractive index of the slab | —
d | thickness of the slab, along the ray | m
\lambda | wavelength in vacuum | m
:::

The slab adds $(n-1)d$, not $nd$: it *replaces* a length $d$ of air (optical path $d$)
by glass (optical path $nd$). This is how interference measures thin films: a slab
shifts the whole fringe pattern by $(n-1)d/\lambda$ fringes, and counting the shift
gives $d$ or $n$.

::: example A mica sheet over one source
In the set-up above, P is equally far from both sources ($r_1=r_2$), so without the
slab it is bright ($\delta=0$). A mica sheet with $n=1.58$ and $d=6.6\ \mu$m is put in
$S_2P$; the light has $\lambda=550$ nm. Find the new phase difference at P.
== Optical path difference ==
$\delta=(r_2-r_1)+(n-1)d=0+0.58\times6.6\ \mu\text{m}=3.83\ \mu$m.
== In wavelengths ==
$\delta/\lambda=3.828\times10^{-6}/550\times10^{-9}=6.96\approx7$.
== Phase difference ==
$\Delta\varphi=2\pi\times6.96\approx14\pi$: P is (very nearly) bright again, but it is
now the 7th-order bright point, not the zeroth. The slab has moved the pattern by about
seven fringes.
:::

::: explore A slab in one beam
slider n: 1 .. 2 = 1.58 | | refractive index of the slab
slider d: 0 .. 20 = 6.6 | μm | thickness
slider l: 400 .. 760 = 550 | nm | vacuum wavelength λ
x = (n - 1) d | μm | extra optical path (n − 1)d
N = 1000 x / l | | fringes the pattern shifts
:::

## A thin lens adds no extra optical path

Interference experiments often use a lens to bring parallel beams together on a screen.
Doesn't the lens itself add path differences? The answer is an important result.

::: theorem A thin lens adds no extra optical path | 薄透镜不引入附加光程
Rays that leave one wavefront of a parallel beam and are brought to a focus by a thin
lens all have the same optical path from that wavefront to the focus, whether the beam
is along the axis (focus $F$ on the axis) or tilted (a focus off the axis, in the focal
plane).
:::

Why: look at three parallel rays A, B, C crossing a wavefront (perpendicular to them)
and meeting at the focus F. The ray through the middle of a convex lens has the
shortest geometric path to F, but it crosses the **thickest** glass; the rays near the
edge go further through air but through thinner glass. The extra glass on the short
path makes up exactly for its shorter length. In wave language: a lens focuses a plane
wave into a converging spherical wave, and all points of one wavefront are in phase, so
they arrive at the focus in phase, which is why the focus is bright. (Lesson 4.2 meets
this again with Fermat's principle: between an object point and its image all rays
have the same optical path.)

::: callout key What this buys you
Path differences are decided **before** the lens. If two parallel beams have optical
path difference $\delta$ across a plane perpendicular to them, they still have $\delta$
when the lens brings them together on its focal plane. So in the double slit and in
thin films, you may ignore the lens (or the eye's lens) completely.
:::

::: callout pitfall Equal optical paths, unequal geometric paths
The rays through a lens to the focus have **different geometric** lengths and **equal
optical** lengths. Don't try to compute a path difference from the geometric lengths
through a lens.
:::

::: callout exam What exams ask on this section
State the coherence conditions; explain why two lamps don't interfere; write
$I_0=I_1+I_2+2\sqrt{I_1I_2}\cos\Delta\varphi$ and its maxima and minima; compute an
optical path difference (often with a slab in one beam, giving $(n-1)d$) and decide
bright or dark from $\delta=k\lambda$ or $(2k+1)\lambda/2$; name the two ways of
getting coherent light.
:::

## Summary

| Idea | Formula or rule |
| --- | --- |
| Coherence conditions | same vibration direction, same frequency, constant phase difference |
| Two coherent waves | $I_0=I_1+I_2+2\sqrt{I_1I_2}\cos\Delta\varphi$ |
| Incoherent waves | $I=I_1+I_2$ |
| Optical path | $L=nr$ (sum $\sum n_ir_i$ over media) |
| Phase from optical path | $\Delta\varphi=2\pi\delta/\lambda$, $\lambda$ in vacuum |
| Bright / dark | $\delta=\pm k\lambda$ / $\delta=\pm(2k+1)\lambda/2$ |
| Slab in one path | extra optical path $(n-1)d$ |
| Coherence length | $L_0=nl_0$; fringes need $\delta<L_0$ |
| Thin lens | adds no extra optical path |

::: cards Coherent light and optical path
Coherence conditions (相干条件) :: Same vibration direction, same frequency, constant phase difference
Intensity of two coherent waves :: $I_0=I_1+I_2+2\sqrt{I_1I_2}\cos\Delta\varphi$
Bright fringe (相长干涉) condition :: $\Delta\varphi=2k\pi$, or $\delta=\pm k\lambda$
Dark fringe (相消干涉) condition :: $\Delta\varphi=(2k+1)\pi$, or $\delta=\pm(2k+1)\lambda/2$
Why don't two ordinary lamps interfere? :: Atoms emit independent, intermittent wave trains (about $10^{-8}$ s) with random phases, so the phase difference keeps changing and $\cos\Delta\varphi$ averages to 0
Visible light wavelengths :: About 400 nm (violet) to 760 nm (red)
Spatial coherence (空间相干性) :: Clear fringes need a small enough source or slit; also called transverse coherence
Temporal coherence (时间相干性) :: Fringes blur and vanish when the optical path difference gets too large
Coherence length (相干长度) :: $L_0=nl_0$, the optical length of one wave train; interference needs $\delta<L_0$
Division of wavefront (分波阵面法) :: Two parts of one wavefront, e.g. two slits (Young's double slit)
Division of amplitude (分振幅法) :: One ray split by reflection and refraction at a film's surfaces (thin films)
Optical path (光程) :: $nr$: the vacuum distance with the same phase lag as distance $r$ in index $n$
Phase difference from optical path difference :: $\Delta\varphi=\dfrac{2\pi}{\lambda}\delta$, with the vacuum wavelength
Slab of index $n$, thickness $d$ in one path :: Adds optical path $(n-1)d$
Does a thin lens add optical path difference? :: No: rays from one wavefront to the focus have equal optical paths
:::

::: quiz Check yourself
? What is the frequency of green light of vacuum wavelength 540 nm? (Take $c=3.0\times10^8$ m/s.)
answer: 5.56e14 Hz
> $\nu=c/\lambda=3.0\times10^8/(540\times10^{-9})=5.56\times10^{14}$ Hz.

? Which of these is **not** one of the coherence conditions?
- [ ] the same vibration direction
- [ ] the same frequency
- [ ] a constant phase difference
- [x] the same amplitude
> Equal amplitudes give the clearest fringes (perfectly dark minima), but beams of
> unequal amplitude still interfere: the conditions are same direction, same frequency
> and constant phase difference.

? Two coherent beams with intensities $4I$ and $I$ overlap. What is the ratio $I_{\max}/I_{\min}$ of the brightest to the darkest intensity in the pattern?
answer: 9
> $I_{\max}=4I+I+2\sqrt{4I\cdot I}=9I$ and $I_{\min}=5I-4I=I$, so the ratio is 9.

? Two identical lamps each give intensity $I$ on a wall where their light overlaps. What intensity is seen there?
- [x] $2I$ everywhere
- [ ] $4I$ at some points and 0 at others
- [ ] $4I$ everywhere
- [ ] 0 everywhere
> Independent lamps are not coherent: their phase difference changes randomly every
> $10^{-8}$ s or so, so $\cos\Delta\varphi$ averages to 0 and the intensities just add.

? An atom emits a wave train for $1.0\times10^{-8}$ s. How long is the train in vacuum?
answer: 3 m
> $l_0=c\,\Delta t=3.0\times10^8\times1.0\times10^{-8}=3.0$ m.

? Light crosses $3.0\ \mu$m of glass with $n=1.5$. What is the optical path?
answer: 4.5 μm
> $L=nr=1.5\times3.0\ \mu\text{m}=4.5\ \mu$m.

? Two in-phase coherent beams of vacuum wavelength 600 nm meet with an optical path difference of $1.5\ \mu$m. What is their phase difference (in rad)?
answer: 5*pi rad
> $\Delta\varphi=2\pi\delta/\lambda=2\pi\times1500/600=5\pi$ rad.

? At that point, is the light bright or dark?
- [ ] bright
- [x] dark
- [ ] in between
> $5\pi$ is an odd multiple of $\pi$ (equivalently $\delta=2.5\lambda$, an odd number of
> half-wavelengths): destructive interference, a dark point.

? A point is bright with $\delta=0$. What is the thinnest slab of $n=1.5$, placed in one beam, that makes it dark, for $\lambda=500$ nm?
answer: 500 nm
> Dark needs the slab's extra optical path $(n-1)d=\lambda/2$, so
> $d=\lambda/[2(n-1)]=500/(2\times0.5)=500$ nm.

? A slab of index $n$ and thickness $d$ is in the path $S_2P$. Write the phase difference at P in terms of `r1`, `r2`, `n`, `d` and `lambda`.
expression: 2 pi / lambda ((r2 - r1) + (n - 1) d)
variables: r1, r2, n, d, lambda
> The path through the slab has optical path $(r_2-d)+nd$, the other $r_1$, so
> $\Delta\varphi=\frac{2\pi}{\lambda}[(r_2-r_1)+(n-1)d]$.

? Young's double slit gets its two coherent beams by which method? (English or Chinese)
text: division of wavefront | wavefront | splitting the wavefront | 分波阵面法 | 分波阵面
> The two slits take two different parts of one wavefront. Thin films use division of
> amplitude (分振幅法) instead.

? Parallel rays are focused by a thin convex lens. Compared with the rays near the edge, the ray along the axis has, from the wavefront to the focus,
- [ ] a shorter optical path
- [x] the same optical path
- [ ] a longer optical path
> Its geometric path is shorter, but it crosses more glass; the optical paths are
> equal, which is why a thin lens adds no extra optical path difference.
:::

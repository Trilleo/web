---
title: Fermat's principle and geometrical optics
zh: 费马原理与几何光学
summary: A review of geometrical optics built on one idea — light takes the path of extremal optical path — with the laws of reflection and refraction derived from it, ray bending in a graded medium, thin lenses, ray diagrams, focal planes, the Gaussian lens formula and total internal reflection.
source: 第18章 光的干涉, 补充：薄透镜成像 费马原理, 2026-10-16
---

Before going further with interference, the course pauses to review **geometrical
optics**: the optics of rays, mirrors and lenses you met at school. This time it is
built on one principle instead of a list of rules. **Fermat's principle** says that
light travels between two points along the path whose optical path (Lesson 4.1) is
extremal — usually the shortest. From it, straight-line travel, the law of reflection
and the law of refraction all follow, and it explains why a lens forms an image. The
lesson ends with the practical tools: ray diagrams, focal planes, the lens formula and
total internal reflection, which the interference experiments later rely on.

## Geometrical optics and when it works

::: define Geometrical optics | 几何光学
The part of optics that ignores the wave nature of light and its interaction with
matter. It works only with **rays** (光线) and a few laws founded on experiment, and
finds how optical systems form images by calculation and by drawing.
:::

Rays are an approximation. A wave passing an obstacle or an opening spreads out a
little behind it (diffraction); the spreading is noticeable only when the obstacle is
not much bigger than the wavelength. So rays are good when everything in the light's
way is large compared with $\lambda$.

::: law Validity of geometrical optics | 几何光学的适用条件
Geometrical optics holds when the size $D$ of the obstacles (openings, lenses,
mirrors) across the light's path is much larger than the wavelength:
$D\gg\lambda$, or $\lambda/D\to0$.
:::

::: example Rays or waves?
Visible light has $\lambda\approx500$ nm. Compare it with a 5 cm lens and with a slit
$1\ \mu$m wide.
== The lens ==
$\lambda/D=500\times10^{-9}/0.05=1\times10^{-5}$: tiny, so rays describe the lens well.
== The slit ==
$\lambda/D=500\times10^{-9}/1\times10^{-6}=0.5$: not small at all. Light spreads
strongly behind the slit and only wave optics (interference and diffraction) can
describe it.
:::

## The basic laws

Geometrical optics rests on five experimental laws. Take a ray hitting a flat boundary
between medium 1 (index $n_1$) and medium 2 (index $n_2$); the **normal** is the line
perpendicular to the boundary at the point of incidence, and every angle is measured
from it.

::: law Straight-line propagation | 光的直线传播定律
In a uniform medium (or in vacuum), light travels in straight lines.
:::

::: law Law of reflection | 反射定律
The reflected ray lies in the plane of the incident ray and the normal; the two rays
are on opposite sides of the normal; and the angle of reflection equals the angle of
incidence, $i_1'=i_1$.
:::

::: law Law of refraction | 折射定律
The refracted ray lies in the plane of the incident ray and the normal; the two rays
are on opposite sides of the normal; and $n_1\sin i_1=n_2\sin i_2$, where $i_1$ is the
angle of incidence and $i_2$ the angle of refraction.
:::

::: formula Law of refraction (Snell's law) | 折射定律
$$n_1\sin i_1=n_2\sin i_2$$
--
n_1,\ n_2 | refractive indices of the first and second medium | —
i_1 | angle of incidence, from the normal | °
i_2 | angle of refraction, from the normal | °
:::

::: law Independent propagation | 光的独立传播定律
Rays travelling in different directions that cross in a medium carry on afterwards
exactly as before, as if the others weren't there.
:::

::: law Reversibility of light paths | 光路可逆原理
In geometrical optics every light path is reversible: send light back along the
outgoing ray and it retraces the incoming one.
:::

(Independent propagation is a ray statement: where coherent beams cross they do
interfere, Lesson 4.1, but they still leave the crossing unchanged.)

::: example Into glass at 30°
Light in air ($n_1=1.00$) hits glass ($n_2=1.50$) at $i_1=30^\circ$. Find the angle of
refraction.
== Snell's law ==
$\sin i_2=\dfrac{n_1}{n_2}\sin i_1=\dfrac{1.00\times0.500}{1.50}=0.333$.
== Angle ==
$i_2=\arcsin0.333=19.5^\circ$. Going into the denser medium (larger $n$), the ray bends
**towards** the normal.
:::

::: explore Snell's law
slider n1: 1 .. 2 = 1 | | index of the first medium
slider n2: 1 .. 2 = 1.5 | | index of the second medium
slider i: 0 .. 89 = 30 | ° | angle of incidence i₁
s = n1 sin(i pi / 180) / n2 | | sin i₂ (above 1: no refracted ray)
r = asin(min(1, s)) 180 / pi | ° | angle of refraction i₂
k = asin(min(1, n2 / n1)) 180 / pi | ° | critical angle (only when n₁ > n₂)
:::

## Fermat's principle

Why should light obey these laws? Think of a lifeguard on the beach running to a
swimmer out in the sea. Running is faster than swimming, so the quickest route is not
the straight line: it runs further along the sand and swims less. Light "chooses" its
path the same way: between two points it takes the route of extremal (usually least)
**time**.

Suppose light crosses several media one after another, covering a geometric length
$s_i$ at speed $v_i=c/n_i$ in each. The time it takes from A to B is

$$t=\sum_i\frac{s_i}{v_i}=\frac1c\sum_i n_is_i ,$$

and $\sum_i n_is_i$ is the optical path. In a medium whose index changes continuously,
the sum becomes an integral along the path:

$$t=\frac1c\int_A^B n\,\mathrm ds .$$

Since $c$ is a constant, "extremal time" and "extremal optical path" are the same
thing.

::: law Fermat's principle | 费马原理
Light travels from one point in space to another along the path for which the travel
time is an extremum. Equivalently: along the path for which the **optical path**
$\int_A^B n\,\mathrm ds$ is an extremum.
:::

::: formula Travel time and optical path | 光程与传播时间
$$t=\sum_i\frac{s_i}{v_i}=\frac1c\sum_i n_is_i,\qquad t=\frac1c\int_A^B n\,\mathrm ds$$
--
t | time for light to go from A to B | s
s_i | geometric length in the $i$-th medium | m
v_i | speed of light there, $c/n_i$ | m/s
n_i | refractive index of the $i$-th medium | —
\sum_i n_is_i | optical path from A to B | m
:::

What the principle means and what it is for, as the slides put it:

- **Meaning**: it is the basic principle of geometrical optics, describing how light
  goes between two fixed points.
- **Uses**: (A) it proves the experimental laws, reflection and refraction among them,
  and since those laws are well established, that in turn confirms the principle; (B)
  it gives the conditions for ideal imaging.
- **"Extremum"** can mean a **minimum**, a **maximum** or a **constant (stationary)
  value**; in practice the actual optical path is most often a minimum.

::: example Time through water and glass
Light goes 2.0 m through water ($n=1.33$) and then 1.0 m through glass ($n=1.50$).
Find the optical path and the travel time.
== Optical path ==
$\sum n_is_i=1.33\times2.0+1.50\times1.0=2.66+1.50=4.16$ m.
== Time ==
$t=\dfrac{4.16}{3.0\times10^8}=1.39\times10^{-8}$ s, the time light would need to go
4.16 m in vacuum. That is what "optical path" means.
:::

## The laws of geometrical optics from Fermat's principle

### Straight-line propagation

In a uniform medium $n$ is constant, so $\int_A^B n\,\mathrm dl=n\int_A^B\mathrm dl$:
the optical path is $n$ times the geometric length. The shortest line between two
points is the straight segment $\overline{AB}$, so the optical path is least along it,
and light travels in straight lines.

### The law of refraction

A ray leaves A in medium $n_1$, crosses a flat boundary at C and reaches B in medium
$n_2$. Fermat's principle gives all three parts of the law. (Parts ① and ② were set for
self-study.)

**① The refracted ray lies in the plane of incidence.** Let M be the plane through A
and B perpendicular to the boundary; it meets the boundary in a line $OO'$. We show C
must lie on $OO'$. Suppose instead the ray crossed at a point $C'$ off that line. Drop
a perpendicular from $C'$ to $OO'$, with foot $C''$. In the right triangles that
appear, the hypotenuse is the longest side, so $\overline{AC'}>\overline{AC''}$ and
$\overline{C'B}>\overline{C''B}$. Then the optical path $AC'B$ is longer than $AC''B$,
so it is not a minimum — contradicting Fermat's principle. Hence C lies on $OO'$, and
the refracted ray is in the plane of the incident ray and the normal.

**② The two rays are on opposite sides of the normal.** Put the boundary on the $x$
axis: A $=(x_1,y_1)$ above, B $=(x_2,y_2)$ below (take $y_1$, $y_2$ as the two
distances from the boundary), C $=(x,0)$. The optical path is

$$\begin{aligned}\Delta_{ACB}&=n_1\overline{AC}+n_2\overline{CB}\\&=n_1\sqrt{(x-x_1)^2+y_1^2}+n_2\sqrt{(x_2-x)^2+y_2^2}.\end{aligned}$$

At the extremum $\mathrm d\Delta/\mathrm dx=0$:

$$\frac{n_1(x-x_1)}{\sqrt{(x-x_1)^2+y_1^2}}-\frac{n_2(x_2-x)}{\sqrt{(x_2-x)^2+y_2^2}}=0 .$$

Both fractions must have the same sign. For a ray coming in from the left, $x>x_1$, so
also $x_2>x$: $x_1<x<x_2$. A and B are on opposite sides of the normal through C.

**③ Snell's law.** The two fractions are exactly sines: $(x-x_1)/\overline{AC}$ is the
side $\overline{A'C}$ (along the boundary) over the hypotenuse $\overline{AC}$, which
is $\sin i_1$, and likewise the second is $\sin i_2$. So the condition reads

$$n_1\sin i_1-n_2\sin i_2=0\quad\Longrightarrow\quad n_1\sin i_1=n_2\sin i_2 .$$

Here is that calculation as a graph: A is 1 unit above the boundary at $x=0$, B is 1
unit below it at $x=2$, and the curve is the optical path through the crossing point
$x$. Its minimum is where the real ray crosses. With $n_1=n_2$ it is at $x=1$ (a
straight line); make $n_2$ larger and the minimum moves right, so the ray spends less
of its path in the slower medium, like the lifeguard.

::: plot Optical path from A to B through the crossing point x
x: 0 .. 2
xlabel: crossing point x
ylabel: optical path
L(x) = n1 sqrt(x^2 + 1) + n2 sqrt((2 - x)^2 + 1)
slider n1: 1 .. 2 = 1 | | index above
slider n2: 1 .. 2 = 1.5 | | index below
:::

### The law of reflection

Light from Q reflects off a mirror at a point M and reaches P (self-study). Let $Q'$ be
the mirror image of Q, as far behind the mirror as Q is in front. By symmetry the angles
$\alpha$ (QM with the surface) and $\beta$ ($MQ'$ with the surface) are equal, and
$QM=Q'M$, so the optical path $QMP$ equals $Q'MP$. That is least when $Q'MP$ is one
straight line rather than a bent one. Then the angle $\alpha'$ of MP with the surface
equals $\beta$ (vertically opposite angles), so $\alpha'=\beta=\alpha$, and therefore
$i'=i$: the angle of reflection equals the angle of incidence.

That argument kept Q, M and P in one plane of incidence. If M were outside it, the path
QMP would be longer still, as in the refraction proof: among all paths, the one in the
plane of incidence is the shortest.

A second proof by calculus: A is at height $a$ above the mirror, B at height $b$, the
horizontal distance between them is $d$, and the ray reflects at P, a distance $x$
along from A (in air, $n=1$). Then

$$\begin{gathered}l=\sqrt{a^2+x^2}+\sqrt{b^2+(d-x)^2},\\
\frac{\mathrm dl}{\mathrm dx}=\frac{x}{\sqrt{a^2+x^2}}-\frac{d-x}{\sqrt{b^2+(d-x)^2}}=0,\end{gathered}$$

so $\dfrac{x}{\sqrt{a^2+x^2}}=\dfrac{d-x}{\sqrt{b^2+(d-x)^2}}$, which says
$\sin i=\sin i'$, that is $i=i'$. (Set $n_1=n_2$ in the plot above and it is this
problem too, with B replaced by its mirror image.)

::: example Where does the reflection happen?
A is 1.0 m above a flat mirror, B is 2.0 m above it, and they are 3.0 m apart
horizontally. Where on the mirror does light from A reflect to reach B, and how long is
the path?
== Use the image ==
Replace A by its image $A'$, 1.0 m below the mirror. The ray is the straight line from
$A'$ to B: it climbs $1.0+2.0=3.0$ m over a horizontal 3.0 m.
== Reflection point ==
It crosses the mirror after rising 1.0 m of the 3.0 m, i.e. one third of the way:
$x=3.0\times\frac13=1.0$ m from A.
== Check the angles ==
$\tan i=x/a=1.0/1.0$ and $\tan i'=(d-x)/b=2.0/2.0$: both $45^\circ$, so $i=i'$.
== Path length ==
$l=\sqrt{1.0^2+1.0^2}+\sqrt{2.0^2+2.0^2}=1.41+2.83=4.24$ m, equal to
$\overline{A'B}=\sqrt{3.0^2+3.0^2}=4.24$ m.
:::

Since reflection and refraction are experimental laws everyone accepts, deriving them
shows that Fermat's principle is right.

## Minimum, maximum or stationary

The extremum isn't always a minimum.

- **Minimum**: the real paths between two points in a uniform medium (straight line),
  via a plane mirror, and across a plane boundary are all paths of **least** optical
  path.
- **Stationary (constant)**: between an object point and its image through a thin lens,
  **every** ray has the same optical path: it takes a constant value. That is what an
  image is: all rays from Q arrive at $Q'$ in phase. It is the same fact as "a thin
  lens adds no extra optical path" (Lesson 4.1).
- **Maximum**: a concave mirror can give a path of greatest optical path. Here is how.

Take a mirror shaped as an ellipsoid of revolution (an ellipse spun about its long
axis), with a source S at one focus and a detector P at the other. An ellipse is the
set of points whose distances to the two foci add up to the same length, so **every**
point Q on it has the same $SQ+QP$; and at every Q the reflection law $i=r$ holds (the
ellipse's famous focusing property). So from S to P by reflection all paths have equal
optical path: a stationary case.

Now replace the ellipsoid by a concave mirror $\sigma$ that touches it from inside at Q,
curving more tightly. Light from S reaching P must reflect at Q (the only point of
$\sigma$ where the reflection law sends it to P), and every other point of $\sigma$ lies
inside the ellipsoid, where $SQ^*+Q^*P$ is shorter. So the real path $SQP$ is
**longer** than every neighbouring path: a maximum. (A mirror touching the ellipsoid
from outside would make it a minimum.)

::: example Paths in an ellipse
An ellipse has semi-major axis $a=5.0$ cm and its foci S and P are $2c=6.0$ cm apart.
What is $SQ+QP$ for a point Q on it, and for a point inside?
== On the ellipse ==
$SQ+QP=2a=10.0$ cm, whichever Q you take. At the end of the long axis, for example,
$SQ=5.0+3.0=8.0$ cm and $QP=5.0-3.0=2.0$ cm, sum 10.0 cm; at the end of the short axis,
$SQ=QP=\sqrt{4.0^2+3.0^2}=5.0$ cm, sum 10.0 cm (the semi-minor axis is
$\sqrt{5.0^2-3.0^2}=4.0$ cm).
== Inside ==
At the centre, $SQ+QP=3.0+3.0=6.0$ cm $<10.0$ cm. Any point inside gives less than
$2a$, so a mirror inside the ellipse, touching it at Q, makes $SQP$ the longest path.
:::

::: callout pitfall "Least time" is not the whole story
Fermat's principle is often quoted as the principle of *least* time. The correct
statement is *extremal* (or stationary) optical path: minimum in most everyday cases,
constant between an object and its image, and even a maximum for a suitably curved
concave mirror.
:::

## Light bending in a graded-index medium

The slides' example (self-study): a medium whose refractive index grows steadily
upwards, $n=n_0+n'y$, where $n_0$ is the index at $y=0$ and $n'\ll n_0$. A ray leaves
the origin travelling along the $+x$ axis. What path does it follow?

Slice the medium into thin horizontal layers, each with its own index. Measure the
ray's angle $\theta$ from the **normal to the layers** (the $y$ direction), as in
Snell's law. At each boundary $n\sin\theta$ stays the same, so it keeps its starting
value. At the origin the ray runs along $x$, perpendicular to the normal:
$\theta=90^\circ$, $\sin\theta=1$, $n=n_0$. So

$$\begin{gathered}n_0=n_1\sin\theta_1=\dots=n\sin\theta,\\
n_0=n_0\Big(1+\frac{n'}{n_0}y\Big)\sin\theta=n_0(1+\alpha y)\sin\theta,\end{gathered}$$

with $\alpha=n'/n_0$. In a layer from $y$ to $y+\mathrm dy$ the ray advances
$\mathrm dx$; since $\theta$ is measured from the $y$ direction,
$\tan\theta=\mathrm dx/\mathrm dy$, and so

$$\sin\theta=\frac{1}{\sqrt{1+(\mathrm dy/\mathrm dx)^2}} .$$

Put that in: $\sqrt{1+(\mathrm dy/\mathrm dx)^2}=1+\alpha y$, so
$(\mathrm dy/\mathrm dx)^2=2\alpha y+\alpha^2y^2$. Dropping the tiny $\alpha^2$ term,

$$\frac{\mathrm dy}{\mathrm dx}=\sqrt{2\alpha y}.$$

Separate the variables, $\mathrm dy/\sqrt y=\sqrt{2\alpha}\,\mathrm dx$, and integrate:
$2\sqrt y=\sqrt{2\alpha}\,x+C$. At $x=0$, $y=0$, so $C=0$, and squaring,

::: formula Ray path in a graded-index medium | 渐变折射率介质中的光线
$$y=\frac12\alpha x^2,\qquad \alpha=\frac{n'}{n_0}$$
--
n=n_0+n'y | refractive index, growing with height | —
\alpha | relative rate of change of the index | 1/m
x,\ y | position along and across the starting direction | m
:::

The ray curves into a parabola **towards the higher index**. That is the general rule:
in a medium whose index varies, light bends towards the denser side. Mirages are this
effect: over a hot road the air near the ground is thinner (lower $n$), so light from
the sky curves up into your eye and looks as if it came from a puddle on the road.

::: plot Ray paths for different gradients
x: 0 .. 10
xlabel: x (m)
ylabel: y (m)
y(x) = a x^2 / 2
slider a: 0 .. 0.005 = 0.001 | 1/m | α = n′/n₀
:::

::: example How far does the ray rise?
In such a medium $\alpha=n'/n_0=1.0\times10^{-3}$ m⁻¹. How high is the ray after
$x=10$ m?
== Use the path ==
$y=\frac12\alpha x^2=\frac12\times1.0\times10^{-3}\times10^2=0.050$ m $=5.0$ cm.
== Check the approximation ==
$\alpha y=5\times10^{-5}\ll1$, so dropping $\alpha^2y^2$ was safe.
:::

## Thin lenses

::: define Lens | 透镜
A thin piece of glass or another transparent material, ground and polished so that its
two surfaces are both spherical, or one spherical and one flat. Lenses are usually
round.
:::

Lenses come in two families, by shape:

| Family | Shape | Kinds |
| --- | --- | --- |
| {{term convex lens | 凸透镜}} (positive lens, 正透镜) | thicker in the middle than at the edge | biconvex 双凸, plano-convex 平凸, meniscus 弯凸 |
| {{term concave lens | 凹透镜}} (negative lens, 负透镜) | thinner in the middle than at the edge | biconcave 双凹, plano-concave 平凹, meniscus 弯凹 |

A flat face counts as a sphere of infinite radius ($r\to\infty$). The slides mark the
radii of the faces with signs (some $-r$); the sign rules for radii aren't set out yet,
and you won't need them in this lesson.

::: define Principal axis | 主轴
The straight line through the centres of curvature of a lens's two spherical surfaces.
:::

::: define Lens thickness | 透镜厚度
The distance between the lens's two surfaces, measured along the principal axis.
:::

::: define Thin lens | 薄透镜
A lens whose thickness is much smaller than the radii of curvature of its surfaces.
Its two surfaces can then be treated as meeting at one point on the axis, the
**optical centre** $O$ (光心).
:::

::: define Aperture | 孔径
The width of a lens across the principal axis.
:::

## Ray diagrams

{{term Paraxial rays | 近轴光线}} are rays close to the axis and nearly parallel to it.
Under this paraxial condition a thin lens forms sharp images, and you can find an image
by drawing, using the optical centre $O$ and the two foci: the **object focus** $F$
(物方焦点), on the side the light comes from, and the **image focus** $F'$ (像方焦点).
For a convex lens $F'$ is on the far side; for a concave lens the two are swapped,
$F'$ on the near side.

To find the image $Q'$ of a point Q off the axis, draw two of these three special rays
from Q; where they meet after the lens (or where their backward extensions meet) is
$Q'$.

| Ray | Convex lens | Concave lens |
| --- | --- | --- |
| ① parallel to the axis | passes through $F'$ | spreads out as if it came from $F'$ |
| ② through the optical centre $O$ | goes straight on | goes straight on |
| ③ through $F$ (convex) or aimed at $F$ (concave) | leaves parallel to the axis | leaves parallel to the axis |

For an object outside the focal length, a convex lens gives a real, inverted image on
the far side: the rays really meet there. A concave lens always gives a virtual,
upright image, between $F'$ and $O$ on the object's side: only the backward extensions
meet.

## Focal planes and secondary axes

Rays not parallel to the axis need two more ideas.

::: define Focal planes | 焦平面
Under the paraxial condition, the **object focal plane** (物方焦平面) is the plane
through the object focus $F$ perpendicular to the principal axis; the **image focal
plane** (像方焦平面) is the plane through the image focus $F'$ perpendicular to the
axis.
:::

::: define Secondary axis | 副轴
A line joining any point of a focal plane to the optical centre $O$. There are
infinitely many. (The slide writes 付轴, a slip for 副轴.)
:::

A ray along a secondary axis goes through $O$, so it is not bent. That gives two rules:

- **Image focal plane**: a parallel beam tilted to the axis converges (convex lens) to
  one point $P'$ of the image focal plane, or seems to spread from one (concave lens):
  the point where the secondary axis **parallel to the beam** meets that plane.
- **Object focal plane**: rays from one point $P$ of the object focal plane (or, for a
  concave lens, aimed at it) leave the lens **parallel** to the secondary axis $PO$.

These let you follow **any** ray, for instance to find the image $P'$ of a point $P$ on
the axis, where the three special rays don't help (they all lie along the axis). Draw
any ray from $P$, meeting the lens at A, then either:

1. **with the object focal plane**: the ray crosses the object focal plane at B; draw
   the secondary axis $BO$; the ray leaves A parallel to $BO$;
2. **with the image focal plane**: draw the secondary axis through $O$ parallel to $PA$,
   meeting the image focal plane at B; the ray leaves A through B.

Where the outgoing ray crosses the axis is $P'$ (for a concave lens, extend it
backwards: $P'$ is virtual).

::: callout tip Why this matters for interference
In interference experiments a lens brings parallel beams together on a screen in its
focal plane. Beams leaving at an angle $\theta$ meet at the point where the secondary
axis at angle $\theta$ crosses the focal plane — and, by Lesson 4.1, with their optical
path difference unchanged.
:::

## The Gaussian lens formula

The ray diagram's result in numbers. Measure every distance **from the lens**, positive
in the direction the light travels (to the right) and negative against it. Write $s$
for the object distance, $s'$ for the image distance, $f$ for the object focal length
(lens to $F$) and $f'$ for the image focal length (lens to $F'$).

::: formula Gaussian lens formula | 薄透镜的高斯物像公式
$$\frac{f}{s}+\frac{f'}{s'}=1$$
--
s | object distance, from the lens (negative for a real object on the left) | m
s' | image distance, from the lens (positive: real image on the right) | m
f | object focal length, lens to $F$ | m
f' | image focal length, lens to $F'$ | m
:::

For a convex lens forming a real image, with light going left to right:
$s<0$, $f<0$, $s'>0$, $f'>0$, the signs the slide shows. For a concave lens $f'<0$ and
$f>0$. The formula is the general rule for **paraxial** imaging: every imaging system
obeys it, only how the distances are measured and signed can change from one system
to another. (This slide was set for reading.)

For a thin lens in air the two focal lengths are equal and opposite, $f=-f'$, and the
formula becomes the familiar

$$\frac{1}{s'}-\frac{1}{s}=\frac{1}{f'} .$$

The image is $s'/s$ times as tall as the object (negative: inverted), a result from
the same similar triangles as the ray diagram.

::: callout pitfall Signs, not just sizes
School books often write $\frac1u+\frac1v=\frac1f$ with all distances positive for a
real object and image. Here the signs carry the direction, so a real object has $s<0$.
Put the object distance in as a positive number and every answer comes out wrong.
:::

::: example A convex lens
An object stands 30 cm in front of a convex lens with $f'=10$ cm (so $f=-10$ cm). Find
the image.
== Signs ==
$s=-30$ cm, $f=-10$ cm, $f'=+10$ cm.
== Gaussian formula ==
$\dfrac{-10}{-30}+\dfrac{10}{s'}=1\ \Rightarrow\ \dfrac{10}{s'}=\dfrac23\ \Rightarrow\ s'=15$ cm.
== Check with the air form ==
$\dfrac1{15}-\dfrac1{-30}=\dfrac{2+1}{30}=\dfrac1{10}=\dfrac1{f'}$. ✓
== Describe it ==
$s'>0$: a real image 15 cm behind the lens. $s'/s=15/(-30)=-0.5$: inverted, half
size, as a ray diagram with rays ① and ② shows.
:::

::: example A concave lens
The same object, 30 cm in front of a concave lens with $f'=-10$ cm ($f=+10$ cm).
== Gaussian formula ==
$\dfrac{10}{-30}+\dfrac{-10}{s'}=1\ \Rightarrow\ -\dfrac{10}{s'}=\dfrac43\ \Rightarrow\ s'=-7.5$ cm.
== Describe it ==
$s'<0$: the image is on the object's side, 7.5 cm from the lens, between $F'$ and $O$:
virtual. $s'/s=(-7.5)/(-30)=+0.25$: upright, a quarter size.
:::

::: explore Thin lens in air
slider s: -100 .. -1 = -30 | cm | object distance s
slider f: -40 .. 40 = 10 | cm | image focal length f′ (negative: concave)
v = 1 / (1/f + 1/s) | cm | image distance s′ (positive: real, behind the lens)
m = v / s | | magnification s′/s (negative: inverted)
:::

Slide the object towards a convex lens: at $s=-f'$ the image runs off to infinity (the
object is in the focal plane, so the rays leave parallel), and closer still $s'$ turns
negative: a virtual image, as in a magnifying glass.

## Total internal reflection and optical fibres

Going from a denser medium into a less dense one ($n_1>n_2$, say glass to air), Snell's
law gives $\sin i_2=\frac{n_1}{n_2}\sin i_1>\sin i_1$: the refracted ray bends **away**
from the normal, and $i_2$ grows faster than $i_1$. At some angle of incidence $i_C$ the
refracted ray skims along the surface, $i_2=90^\circ$. Beyond it Snell's law would need
$\sin i_2>1$: there is no refracted ray at all, and all the light reflects.

::: define Total internal reflection | 全反射
Reflection with no refraction: all the light is reflected at the boundary. It happens
when light goes from an optically denser medium to a less dense one
($n_1>n_2$, 光密射向光疏) at an angle of incidence greater than the critical angle,
$i_1>i_C$.
:::

::: define Critical angle | 临界角
The angle of incidence $i_C$ at which the refracted ray grazes the boundary
($i_2=90^\circ$), for light going from index $n_1$ to a smaller index $n_2$.
:::

::: formula Critical angle | 临界角
$$\sin i_C=\frac{n_2}{n_1},\qquad i_C=\arcsin\frac{n_2}{n_1}\quad(n_1>n_2)$$
--
i_C | critical angle | °
n_1 | index of the medium the light comes from (the denser one) | —
n_2 | index of the medium beyond the boundary | —
:::

(The slide says total reflection happens for $i_1\ge i_C$ in one line and $i_1>i_C$ in
the conditions. At exactly $i_C$ the refracted ray grazes the surface; just beyond it,
everything reflects. The difference doesn't matter in practice.)

::: example Critical angles
Find the critical angle (a) from glass ($n=1.50$) into air; (b) from water ($n=1.33$)
into air; (c) in an optical fibre whose core has $n_1=1.62$ and cladding $n_2=1.52$.
== Glass to air ==
$i_C=\arcsin(1.00/1.50)=\arcsin0.667=41.8^\circ$. A 45° glass prism therefore reflects
light totally, which is how prism binoculars fold their light path.
== Water to air ==
$i_C=\arcsin(1.00/1.33)=48.8^\circ$.
== Fibre core to cladding ==
$i_C=\arcsin(1.52/1.62)=\arcsin0.938=69.8^\circ$. Rays hitting the core's wall at more
than $69.8^\circ$ from its normal — that is, travelling nearly along the fibre — are
reflected again and again and stay trapped inside.
:::

An {{term optical fibre | 光学纤维}} is exactly that: a thin glass core surrounded by
cladding of lower index, which guides light round bends by total internal reflection
with almost no loss. It carries the internet's long-distance traffic and the light in
medical endoscopes.

::: callout pitfall Total reflection needs the right direction
Total internal reflection is only possible going from the **higher** index to the
lower ($n_1>n_2$). Going from air into glass there is always a refracted ray, at any
angle.
:::

::: callout exam What exams ask on this part
State Fermat's principle (extremal optical path, not just "least time") and use it to
derive the law of reflection or refraction; say which cases are minimum, maximum or
stationary; draw ray diagrams with the three special rays and with focal planes; use
the lens formula with the right signs; find a critical angle and state the two
conditions for total reflection.
:::

::: cards Fermat's principle and geometrical optics
When does geometrical optics hold? :: When obstacles are much larger than the wavelength: $D\gg\lambda$
Law of reflection (反射定律) :: In the plane of incidence, opposite side of the normal, $i_1'=i_1$
Law of refraction (折射定律) :: In the plane of incidence, opposite side of the normal, $n_1\sin i_1=n_2\sin i_2$
Reversibility of light paths (光路可逆) :: Any light path can be travelled backwards
Fermat's principle (费马原理) :: Light goes between two points along the path of extremal travel time, i.e. extremal optical path $\int n\,\mathrm ds$
Travel time through several media :: $t=\sum s_i/v_i=\frac1c\sum n_is_i$
Three kinds of extremum :: Minimum (straight line, plane mirror, plane refraction), constant (object to image through a lens), maximum (concave mirror inside a tangent ellipsoid)
Ray in a medium with $n=n_0+n'y$ :: A parabola $y=\frac12\alpha x^2$, $\alpha=n'/n_0$, bending towards the higher index
Thin lens (薄透镜) :: Thickness much smaller than the radii of curvature of its surfaces
Three special rays (convex lens) :: Parallel → through $F'$; through $O$ → straight on; through $F$ → parallel
Secondary axis (副轴) :: A line from a point of a focal plane through the optical centre $O$
Parallel tilted beam through a convex lens :: Converges to the point where the parallel secondary axis meets the image focal plane
Gaussian lens formula :: $\dfrac{f}{s}+\dfrac{f'}{s'}=1$; in air $\dfrac1{s'}-\dfrac1s=\dfrac1{f'}$
Conditions for total internal reflection (全反射) :: $n_1>n_2$ (dense to less dense) and $i_1>i_C$
Critical angle (临界角) :: $i_C=\arcsin(n_2/n_1)$
:::

::: quiz Check yourself
? Light goes from air ($n=1.00$) into glass ($n=1.50$) at an angle of incidence of 30°. What is the angle of refraction?
answer: 19.5 °
> $\sin i_2=\sin30^\circ/1.50=0.333$, so $i_2=\arcsin0.333=19.5^\circ$.

? What is the critical angle from glass ($n=1.50$) into air?
answer: 41.8 °
> $i_C=\arcsin(n_2/n_1)=\arcsin(1/1.50)=41.8^\circ$.

? An optical fibre has a core of index 1.62 and cladding of index 1.52. What is the critical angle at the core's wall?
answer: 69.8 °
> $i_C=\arcsin(1.52/1.62)=\arcsin0.938=69.8^\circ$.

? Write $\sin i_C$ for light going from index `n1` to a smaller index `n2`.
expression: n2 / n1
variables: n1, n2
> At $i_1=i_C$, $i_2=90^\circ$: $n_1\sin i_C=n_2\sin90^\circ=n_2$.

? Light crosses 2.0 m of water ($n=1.33$) and then 1.0 m of glass ($n=1.50$). What is its optical path?
answer: 4.16 m
> $\sum n_is_i=1.33\times2.0+1.50\times1.0=4.16$ m.

? An object is 30 cm in front of a convex lens of image focal length $f'=10$ cm, in air. What is the image distance $s'$?
answer: 15 cm
> $s=-30$ cm: $\frac1{s'}=\frac1{f'}+\frac1s=\frac1{10}-\frac1{30}=\frac1{15}$, so
> $s'=15$ cm, a real image behind the lens.

? The same object is 30 cm in front of a concave lens with $f'=-10$ cm. What is $s'$ (with its sign)?
answer: -7.5 cm
> $\frac1{s'}=-\frac1{10}-\frac1{30}=-\frac4{30}$, so $s'=-7.5$ cm: a virtual image on
> the object's side.

? In a medium with $n=n_0+n'y$ and $\alpha=n'/n_0=1.0\times10^{-3}$ m⁻¹, a ray starts along the $x$ axis. How high is it after 10 m?
answer: 5 cm
> $y=\frac12\alpha x^2=\frac12\times10^{-3}\times100=0.05$ m $=5$ cm.

? Between an object point and its image formed by a thin lens, the optical path of the rays is
- [ ] a minimum
- [ ] a maximum
- [x] the same for every ray (stationary)
> All rays from the object point reach the image in phase: their optical paths are
> equal, the "constant value" case of Fermat's principle.

? A concave mirror touches an ellipsoidal mirror from inside at Q; a source and a detector sit at the ellipsoid's foci. The real path via Q has
- [ ] the least optical path
- [x] the greatest optical path
- [ ] the same optical path as its neighbours on the mirror
> On the ellipsoid all paths focus-to-focus are equal; the concave mirror's other
> points lie inside it, where the sum of the distances is shorter. So the real path is
> a maximum.

? When can geometrical optics be used?
- [x] when the obstacles in the light's path are much larger than the wavelength
- [ ] when the obstacles are about the size of the wavelength
- [ ] only in vacuum
- [ ] only for monochromatic light
> The condition is $D\gg\lambda$. When $D$ is comparable with $\lambda$, diffraction
> and interference matter and wave optics is needed.

? Light hits a glass–air boundary at 50°. Which happens?
- [ ] it refracts into the air at 50°
- [ ] it refracts into the air at about 30°
- [x] going from glass into air, all of it reflects; going from air into glass, it refracts
- [ ] it always reflects totally, whichever way it travels
> From glass ($n=1.5$) into air the critical angle is 41.8°, and 50° is beyond it, so
> it reflects totally. From air into glass there is always a refracted ray
> ($\sin i_2=\sin50^\circ/1.5$, $i_2=30.7^\circ$).
:::

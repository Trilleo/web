/**
 * Page transitions (styles in styles/theme.css). Elements marked `data-morph` carry a
 * view-transition-name shared with the other page, so they morph across the
 * navigation: a tool's name in a list grows into its page title.
 *
 * Only in that direction, though. Mark list items `data-morph="from"`: they are
 * where a morph starts, never where one lands, so going back to a list doesn't send
 * the title flying down to its row. And nothing morphs to an element that's off
 * screen.
 */

/**
 * Inline `<head>` script. When a page arrives by a view transition, it unnames its
 * `data-morph="from"` elements and any `data-morph` element outside the viewport, so
 * the other end leaves with the rest of the old page instead (theme.css animates
 * those unpaired leftovers like the page itself). Names come back once the
 * transition is over, for the next navigation. Must be inline: `pagereveal` fires
 * before deferred scripts run. Dependency-free, like themeInitScript;
 * page-transition.test.ts runs it.
 */
export const morphGuardScript = `addEventListener("pagereveal",function(e){var t=e.viewTransition;if(!t)return;var h=innerHeight,off=[];document.querySelectorAll("[data-morph]").forEach(function(m){var r=m.getBoundingClientRect();if(m.getAttribute("data-morph")==="from"||r.bottom<=0||r.top>=h){off.push([m,m.style.getPropertyValue("view-transition-name")]);m.style.setProperty("view-transition-name","none")}});if(off.length){var back=function(){off.forEach(function(o){o[0].style.setProperty("view-transition-name",o[1])})};t.finished.then(back,back)}});`;

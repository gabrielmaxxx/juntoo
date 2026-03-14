

## Problem

Both "Em Alta" and "Seus amigos vão" use identical card styles (full-width rounded image with gradient overlay), creating visual monotony. There's no breathing room or visual cue separating them.

## Solution

Add subtle but effective visual separators between homepage sections:

1. **Section dividers**: Add a thin horizontal line or decorative divider between major sections (a `<Separator />` or a custom styled `<hr>` with muted color and margin).

2. **Differentiate card styles**: Keep "Em Alta" as the horizontal carousel with large image cards, but give "Seus amigos vão" a slightly different treatment -- e.g., a card with a left-side thumbnail + text on the right (similar to the "Perto de você" nearby events style), or add a subtle background tint to the section.

3. **Add section spacing + subtle background contrast**: Wrap alternating sections in a light tinted background (`bg-muted/30` or similar) to create visual rhythm, similar to how premium apps alternate section backgrounds.

**Recommended approach**: Combine options 1 and 2 -- add a separator line between sections AND change "Seus amigos vão" to use the compact horizontal layout (thumbnail + text) instead of full-bleed images, creating clear visual contrast with the "Em Alta" carousel.

### Files to edit
- `src/components/HomePage.tsx` -- add separators between sections and restyle the "Seus amigos vão" cards to use a compact list layout (thumbnail on left, event info on right) instead of the same full-image overlay style used by "Em Alta"


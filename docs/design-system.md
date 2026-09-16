# Design System

**Before writing or changing any UI, read the style guide.** It is the single reference for colour tokens, the type scale, rounding tiers, the brand accent, motion, and every shared component — and it renders the real tokens and primitives rather than describing them, so it cannot silently go stale.

- **Live page:** `/style-guide` — signed-in **admin** accounts only; everyone else gets a 404
- **Source:** `components/styleGuide/` (sections in `components/styleGuide/sections/`)
- **Underlying truth:** tokens and utility classes in `app/globals.css`, primitives in `components/ui/`, the class merger in `lib/utils.ts`

The rules that matter most when editing (all covered in full on the page):

- Merge classes with `cn()` from `lib/utils.ts` — it registers the `text-display … text-caption` scale with tailwind-merge, which otherwise mistakes those for text colours and drops one of size/colour. It also registers the `radius-*` tiers into the `rounded` group, so a tier actually replaces a raw `rounded-*` instead of losing to it in the cascade.
- Use semantic tokens, never literal colours or stock Tailwind greys. The shadcn token block in `globals.css` aliases onto the semantic tokens; never put a literal value there.
- `--brand` is the only chromatic colour in the chrome. It reaches the page through `bg-brand` / `text-brand` / `border-brand` and the `.brand-border` / `.brand-border-bright` / `.brand-card` / `.brand-fill` / `.brand-ring` family. It never identifies a person — that is `USER_COLOUR_PALETTE` in `lib/userColour.ts`, hashed on the person's lower-cased email (falling back to the Clerk `userId` when there is none) and drawn only through `components/UserAvatar.tsx` and the canvas. `getUserColour` takes a `ColourIdentity` — `{ id, email }` — rather than a bare string, so the fallback and the lower-casing live in one place. The hash is FNV-1a followed by the murmur3 `fmix32` finaliser, both via `Math.imul`. The finaliser is the load-bearing part: the index is `hash % 48`, which reads the low bits, and a plain multiply-and-add hash mixes those poorly — a real pair of addresses here collided under 15% of all multipliers, seven times the 1-in-48 baseline, so swapping the multiplier was never a reliable fix. Its array length and the hash constants are load-bearing; changing either reshuffles every existing user's colour. The array order is load-bearing too, and is deliberately not sorted by hue: it is solved so entries within three positions of each other stay at least ΔE 0.141 apart, because ids sharing a long prefix hash to nearby indices. Do not tidy it into hue order.
- Use the type scale (`text-body`, `text-caption`, …), never raw `text-sm`/`text-lg`. Those classes live in `@layer components`, so a utility-layer size outranks them — which is why no primitive in `components/ui/` carries a `text-*` size in its base class string.
- Use the rounding tiers `radius-tag` / `radius-control` / `radius-surface` over raw `rounded-*`.
- `dark:` modifiers are dead code — nothing sets `.dark`; the app is permanently dark via `:root`. Strip them when pasting from the shadcn registry.
- Four-space indentation. There is no Prettier config, so a bare `npx prettier --write` reformats to two spaces. Files under `components/ui/` came from the registry at two spaces and are left as-is.
- British spelling in identifiers and copy (`colour`, `optimisation`); shadcn's `--color-*` token names are the exception.

When you add a token, utility class or shared component, add a specimen to the style guide in the same change.

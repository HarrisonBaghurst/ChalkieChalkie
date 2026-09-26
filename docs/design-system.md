# Design System

**Before writing or changing any UI, read the style guide.** It is the single reference for colour tokens, the type scale, rounding tiers, the brand accent, motion, and every shared component — and it renders the real tokens and primitives rather than describing them, so it cannot silently go stale.

- **Live page:** `/style-guide` — signed-in **admin** accounts only; everyone else gets a 404
- **Source:** `components/styleGuide/` (sections in `components/styleGuide/sections/`)
- **Underlying truth:** tokens and utility classes in `app/globals.css`, primitives in `components/ui/`, the class merger in `lib/utils.ts`

The rules that matter most when editing (all covered in full on the page):

- Merge classes with `cn()` from `lib/utils.ts` — it registers the `text-display … text-caption` scale with tailwind-merge, which otherwise mistakes those for text colours and drops one of size/colour. It also registers the `radius-*` tiers into the `rounded` group, so a tier actually replaces a raw `rounded-*` instead of losing to it in the cascade.
- Use semantic tokens, never literal colours or stock Tailwind greys. The shadcn token block in `globals.css` aliases onto the semantic tokens; never put a literal value there.
- `--brand` is the only chromatic colour in the chrome. It reaches the page through `bg-brand` / `text-brand` / `border-brand` and the `.brand-border` / `.brand-border-bright` / `.brand-card` / `.brand-fill` / `.brand-ring` family. It never identifies a person — that is the person's blobatar (the `blobatar` npm package), generated client-side by `getUserBlobatar` in `lib/userColour.ts` from the Clerk `userId` with its `user_` prefix stripped, and drawn only through `components/UserAvatar.tsx`. `UserAvatar` takes an optional `expression` imported from `blobatar/expression` and defaults to `thinking`; it renders statically, with no `animate` and no gaze, so a pose change swaps the image rather than morphing. `getUserColour` ignores the expression, so tinted poses (`mad`, `love`, `shy`, `sick`) never shift a person's cursor colour. `getUserColour` returns that blobatar's body colour for the canvas — cursor, name pill, selection outline, roster dot — so avatar and cursor always match. It is never keyed on email: other people's addresses must not reach a browser unless the two users are directly linked, so email is not available to hash. Both take a `ColourIdentity` — `{ id }` — rather than a bare string, so the prefix stripping lives in one place. `BLOBATAR_OPTIONS` passes `normalize: false` because Clerk ids are case-sensitive and blobatar lowercases by default, and pins `traits.tone` to positions below 0.93, which excludes the near-black ink tone so every body colour clears 4.5:1 against `--background`. Changing those options, or upgrading blobatar across a major, changes every existing user's blob and colour.
- Use the type scale (`text-body`, `text-caption`, …), never raw `text-sm`/`text-lg`. Those classes live in `@layer components`, so a utility-layer size outranks them — which is why no primitive in `components/ui/` carries a `text-*` size in its base class string.
- Use the rounding tiers `radius-tag` / `radius-control` / `radius-surface` over raw `rounded-*`.
- `dark:` modifiers are dead code — nothing sets `.dark`; the app is permanently dark via `:root`. Strip them when pasting from the shadcn registry.
- Four-space indentation. There is no Prettier config, so a bare `npx prettier --write` reformats to two spaces. Files under `components/ui/` came from the registry at two spaces and are left as-is.
- British spelling in identifiers and copy (`colour`, `optimisation`); shadcn's `--color-*` token names are the exception.

When you add a token, utility class or shared component, add a specimen to the style guide in the same change.

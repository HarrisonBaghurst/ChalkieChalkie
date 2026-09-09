# Design System

**Before writing or changing any UI, read the style guide.** It is the single reference for colour tokens, the type scale, rounding tiers, the chalk gradient, motion, and every shared component — and it renders the real tokens and primitives rather than describing them, so it cannot silently go stale.

- **Live page:** `/style-guide` — signed-in **admin** accounts only; everyone else gets a 404
- **Source:** `components/styleGuide/` (sections in `components/styleGuide/sections/`)
- **Underlying truth:** tokens and utility classes in `app/globals.css`, primitives in `components/ui/`, the class merger in `lib/utils.ts`

The rules that matter most when editing (all covered in full on the page):

- Merge classes with `cn()` from `lib/utils.ts` — it registers the `text-display … text-caption` scale with tailwind-merge, which otherwise mistakes those for text colours and drops one of size/colour.
- Use semantic tokens, never literal colours or stock Tailwind greys. The shadcn token block in `globals.css` aliases onto the semantic tokens; never put a literal value there.
- Use the type scale (`text-body`, `text-caption`, …), never raw `text-sm`/`text-lg`. Those classes live in `@layer components`, so a utility-layer size outranks them — which is why no primitive in `components/ui/` carries a `text-*` size in its base class string.
- Use the rounding tiers `radius-tag` / `radius-control` / `radius-surface` over raw `rounded-*`.
- `dark:` modifiers are dead code — nothing sets `.dark`; the app is permanently dark via `:root`. Strip them when pasting from the shadcn registry.
- Four-space indentation. There is no Prettier config, so a bare `npx prettier --write` reformats to two spaces. Files under `components/ui/` came from the registry at two spaces and are left as-is.
- British spelling in identifiers and copy (`colour`, `optimisation`); shadcn's `--color-*` token names are the exception.

When you add a token, utility class or shared component, add a specimen to the style guide in the same change.

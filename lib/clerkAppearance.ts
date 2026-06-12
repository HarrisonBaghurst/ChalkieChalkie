import type { Appearance } from "@clerk/types";

/**
 * Shared Clerk theme that mirrors the dashboard's dark look (see globals.css):
 * #121212 surfaces, hsl(0 0% 12%) cards, #0d0d0a inputs, near-white text, a
 * white primary button with dark text, and the Inter font family.
 *
 * Applied at <ClerkProvider> so it cascades to every Clerk surface — most
 * importantly the clickable UserButton avatar/popover and the sign-in flow.
 */
export const clerkAppearance: Appearance = {
    variables: {
        colorBackground: "hsl(0, 0%, 12%)", // --card-background
        colorPrimary: "hsl(0, 0%, 92%)", // --foreground (white CTA fill)
        colorTextOnPrimaryBackground: "#121212", // --background (dark label)
        colorText: "hsl(0, 0%, 92%)", // --foreground
        colorTextSecondary: "hsl(0, 0%, 40%)", // --foreground-third
        colorInputBackground: "#0d0d0a", // .card-style background
        colorInputText: "hsl(0, 0%, 92%)",
        colorNeutral: "#ffffff",
        colorShimmer: "rgba(255, 255, 255, 0.08)",
        colorDanger: "hsl(0, 70%, 55%)",
        borderRadius: "0.5rem", // ~ --radius-md
        fontFamily: "InterRegular, var(--font-sans), sans-serif",
        fontFamilyButtons: "InterBold, var(--font-sans), sans-serif",
    },
    elements: {
        // White-on-dark primary button, matching components/dashboard/Button.tsx
        formButtonPrimary:
            "font-inter-bold normal-case shadow-none hover:opacity-90 transition-opacity",
        headerTitle: "font-inter-bold",
        // Subtle border on the UserButton dropdown (the sign-in card is themed
        // separately with the gradient accent in its own appearance prop).
        userButtonPopoverCard: "border border-white/5 shadow-xl",
        userButtonPopoverActionButton:
            "hover:bg-white/5 transition-colors",
        avatarBox: "rounded-full",
    },
};

import type { Appearance } from "@clerk/types";

// Clerk's Appearance API can't read CSS variables, so these are literal
// mirrors of the tokens in globals.css.
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
        formButtonPrimary:
            "font-inter-bold normal-case shadow-none hover:opacity-90 transition-opacity",
        headerTitle: "font-inter-bold",
        userButtonPopoverCard: "border border-white/5 shadow-xl",
        userButtonPopoverActionButton:
            "hover:bg-white/5 transition-colors",
        avatarBox: "rounded-full",
    },
};

const TIERS = [
    { label: "xs", width: "<640px", visibility: "sm:hidden" },
    { label: "sm", width: "≥640px", visibility: "hidden sm:inline md:hidden" },
    { label: "md", width: "≥768px", visibility: "hidden md:inline lg:hidden" },
    { label: "lg", width: "≥1024px", visibility: "hidden lg:inline xl:hidden" },
    { label: "xl", width: "≥1280px", visibility: "hidden xl:inline 2xl:hidden" },
    { label: "2xl", width: "≥1536px", visibility: "hidden 2xl:inline" },
];

// DEBUG is deliberately not NEXT_PUBLIC_, so this must stay a server component:
// in the browser the variable reads undefined and the badge silently never shows.
const DebugBreakpoint = () => {
    if (process.env.DEBUG !== "true") return null;

    return (
        <div
            aria-hidden
            className="fixed bottom-4 left-4 z-[100] pointer-events-none control-surface radius-tag px-2 py-1 text-caption text-foreground-third"
        >
            {TIERS.map((tier) => (
                <span key={tier.label} className={tier.visibility}>
                    <span className="text-foreground">{tier.label}</span>{" "}
                    {tier.width}
                </span>
            ))}
        </div>
    );
};

export default DebugBreakpoint;

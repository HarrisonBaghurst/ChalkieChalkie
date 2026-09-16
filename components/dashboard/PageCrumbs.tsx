import React from "react";
import Link from "next/link";

export type Crumb = {
    label: string;
    href?: string;
};

export const ROOT_CRUMB: Crumb = { label: "Chalkie Chalkie", href: "/" };

type PageCrumbsProps = {
    crumbs: Crumb[];
    className?: string;
};

const PageCrumbs = ({ crumbs, className }: PageCrumbsProps) => (
    <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-2 text-caption">
            {crumbs.map((crumb, i) => {
                const last = i === crumbs.length - 1;

                return (
                    <li key={crumb.label} className="flex items-center gap-2">
                        {i > 0 && (
                            <span
                                aria-hidden
                                className="text-foreground-third select-none"
                            >
                                /
                            </span>
                        )}
                        {crumb.href && !last ? (
                            <Link
                                href={crumb.href}
                                className="text-foreground-third transition-colors hover:text-foreground-second"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span
                                aria-current={last ? "page" : undefined}
                                className={
                                    last
                                        ? "font-inter-bold text-foreground-second"
                                        : "text-foreground-third"
                                }
                            >
                                {crumb.label}
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    </nav>
);

export default PageCrumbs;

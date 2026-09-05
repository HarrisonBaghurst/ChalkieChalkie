// Inline markup inside `text`, `intro` and untagged changes is the same pass the
// policy documents use: [label](url), **bold**, {{CONTACT_EMAIL}}.
export type ChangeTag = "Added" | "Fixed" | "Changed" | "Removed";

// A bare string is an untagged bullet.
export type ChangelogChange = string | { tag: ChangeTag; text: string };

export interface ChangelogEntry {
    version: string;
    date: string; // human-readable, e.g. "5 September 2026"
    changes: ChangelogChange[];
}

export interface ChangelogDocument {
    title: string;
    currentVersion: string; // the single source of truth for the version shown in the app
    intro?: string;
    entries: ChangelogEntry[]; // rendered in file order, so author newest first
}

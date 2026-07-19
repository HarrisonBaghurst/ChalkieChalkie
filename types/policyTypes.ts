/**
 * Schema for legal / information policy pages (privacy policy, terms, etc.).
 *
 * Content is authored as JSON in `data/policies/*.json` and rendered by
 * `components/policy/PolicyDocument.tsx`. Keep the shape flat and simple so a
 * new policy page is just a new JSON file passed to the same component.
 *
 * Inline markup is supported inside any `text` field:
 *   - `[label](https://url)`   → external link (opens in a new tab)
 *   - `{{CONTACT_EMAIL}}`      → replaced with the env CONTACT_EMAIL as a mailto link
 *   - `**bold**`               → emphasised text
 */

/** A block of content within a section. */
export type PolicyBlock =
    | { type: "paragraph"; text: string }
    /** A minor heading within a section. */
    | { type: "subheading"; text: string }
    /** A bullet (or numbered) list. */
    | { type: "list"; ordered?: boolean; items: string[] }
    /**
     * Term/description pairs — used in place of tables so tabular information
     * (e.g. "category → what it covers") stays easy to author in JSON.
     */
    | { type: "definitions"; items: { term: string; description: string }[] };

/** A top-level, headed section of the document. */
export interface PolicySection {
    /** Stable anchor id (kebab-case). */
    id: string;
    heading: string;
    blocks: PolicyBlock[];
}

/** A complete policy document. */
export interface PolicyDocument {
    title: string;
    /** Human-readable date, e.g. "19 July 2026". */
    lastUpdated: string;
    /** Optional lead-in blocks shown before the first numbered section. */
    intro?: PolicyBlock[];
    sections: PolicySection[];
}

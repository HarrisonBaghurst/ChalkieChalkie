// Inline markup supported inside any `text` field:
//   [label](https://url)  → external link, opens in a new tab
//   {{CONTACT_EMAIL}}     → mailto link built from the env var
//   **bold**              → emphasis
export type PolicyBlock =
    | { type: "paragraph"; text: string }
    | { type: "subheading"; text: string }
    | { type: "list"; ordered?: boolean; items: string[] }
    // Used in place of tables, which are awkward to author in JSON.
    | { type: "definitions"; items: { term: string; description: string }[] };

export interface PolicySection {
    id: string; // kebab-case anchor
    heading: string;
    blocks: PolicyBlock[];
}

export interface PolicyDocument {
    title: string;
    lastUpdated: string; // human-readable, e.g. "19 July 2026"
    intro?: PolicyBlock[];
    sections: PolicySection[];
}

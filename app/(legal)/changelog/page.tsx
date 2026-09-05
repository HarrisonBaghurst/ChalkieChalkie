import ChangelogDocument from "@/components/changelog/ChangelogDocument";
import type { ChangelogDocument as ChangelogDocumentType } from "@/types/changelogTypes";
import changelog from "@/data/changelog.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Changelog",
    description: "What has changed in Chalkie Chalkie, version by version.",
    alternates: { canonical: "/changelog" },
};

const ChangelogPage = () => {
    const contactEmail = process.env.CONTACT_EMAIL ?? "";

    return (
        <ChangelogDocument
            document={changelog as ChangelogDocumentType}
            contactEmail={contactEmail}
        />
    );
};

export default ChangelogPage;

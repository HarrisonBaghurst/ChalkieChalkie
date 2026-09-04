import PolicyDocument from "@/components/policy/PolicyDocument";
import type { PolicyDocument as PolicyDocumentType } from "@/types/policyTypes";
import policy from "@/data/policies/cookie-policy.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description:
        "What cookies Chalkie Chalkie uses and how to control them.",
    alternates: { canonical: "/cookie-policy" },
};

const CookiePolicyPage = () => {
    const contactEmail = process.env.CONTACT_EMAIL ?? "";

    return (
        <PolicyDocument
            document={policy as PolicyDocumentType}
            contactEmail={contactEmail}
        />
    );
};

export default CookiePolicyPage;

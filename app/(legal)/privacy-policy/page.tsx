import PolicyDocument from "@/components/policy/PolicyDocument";
import type { PolicyDocument as PolicyDocumentType } from "@/types/policyTypes";
import policy from "@/data/policies/privacy-policy.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "How Chalkie Chalkie collects, uses and protects your personal information.",
    alternates: { canonical: "/privacy-policy" },
};

const PrivacyPolicyPage = () => {
    const contactEmail = process.env.CONTACT_EMAIL ?? "";

    return (
        <PolicyDocument
            document={policy as PolicyDocumentType}
            contactEmail={contactEmail}
        />
    );
};

export default PrivacyPolicyPage;

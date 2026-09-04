import PolicyDocument from "@/components/policy/PolicyDocument";
import type { PolicyDocument as PolicyDocumentType } from "@/types/policyTypes";
import policy from "@/data/policies/terms-of-service.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service",
    description:
        "The terms you agree to when using Chalkie Chalkie.",
    alternates: { canonical: "/terms-of-service" },
};

const TermsOfServicePage = () => {
    const contactEmail = process.env.CONTACT_EMAIL ?? "";

    return (
        <PolicyDocument
            document={policy as PolicyDocumentType}
            contactEmail={contactEmail}
        />
    );
};

export default TermsOfServicePage;

import PolicyDocument from "@/components/policy/PolicyDocument";
import type { PolicyDocument as PolicyDocumentType } from "@/types/policyTypes";
import policy from "@/data/policies/privacy-policy.json";

export const metadata = {
    title: "Privacy Policy",
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

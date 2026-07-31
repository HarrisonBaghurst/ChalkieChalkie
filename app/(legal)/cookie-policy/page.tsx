import PolicyDocument from "@/components/policy/PolicyDocument";
import type { PolicyDocument as PolicyDocumentType } from "@/types/policyTypes";
import policy from "@/data/policies/cookie-policy.json";

export const metadata = {
    title: "Cookie Policy",
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

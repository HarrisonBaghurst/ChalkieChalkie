import { FormSpec } from "./formSpec";

export const BETA_REQUEST: FormSpec = {
    title: "Join the private beta",
    subject: "Early Access Request",
    endpoint: "/api/contact",
    steps: [
        {
            label: "About you",
            fields: [
                {
                    key: "firstName",
                    label: "First name",
                    kind: "input",
                    placeholder: "John",
                    half: true,
                },
                {
                    key: "lastName",
                    label: "Last name",
                    kind: "input",
                    placeholder: "Doe",
                    half: true,
                },
                {
                    key: "email",
                    label: "Email",
                    kind: "input",
                    type: "email",
                    placeholder: "john@email.com",
                },
            ],
        },
        {
            label: "Your interest",
            fields: [
                {
                    key: "useCase",
                    label: "How would you use Chalkie Chalkie?",
                    kind: "textarea",
                    placeholder: "Tell us about your use case...",
                    rows: 5,
                },
                {
                    key: "referral",
                    label: "How were you referred to us?",
                    kind: "textarea",
                    placeholder: "Where did you hear about Chalkie Chalkie...",
                    rows: 3,
                },
            ],
        },
    ],
    note: {
        text: "We are currently in private beta. All requests are reviewed manually. You will be notified by email if you are accepted.",
    },
};

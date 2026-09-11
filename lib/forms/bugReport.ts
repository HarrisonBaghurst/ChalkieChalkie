import { FormSpec } from "./formSpec";

const SEVERITY_OPTIONS = [
    "Low",
    "Medium",
    "High - Blocks usage",
    "Critical - Data loss",
] as const;

export const BUG_REPORT: FormSpec = {
    title: "Contact Chalkie Chalkie",
    subject: "Bug Report",
    endpoint: "/api/contact",
    steps: [
        {
            label: "Overview",
            fields: [
                {
                    key: "email",
                    label: "Email",
                    kind: "input",
                    type: "email",
                    placeholder: "john@email.com",
                },
                {
                    key: "summary",
                    label: "Summary",
                    kind: "input",
                    placeholder: "One line summary of the issue",
                },
                {
                    key: "severity",
                    label: "Issue severity",
                    kind: "select",
                    options: SEVERITY_OPTIONS,
                },
            ],
        },
        {
            label: "Details",
            fields: [
                {
                    key: "reproduceSteps",
                    label: "Steps to reproduce",
                    kind: "textarea",
                    placeholder: "Go to ... and click ...",
                    rows: 5,
                },
                {
                    key: "expectedVsActual",
                    label: "Expected vs actual behaviour",
                    kind: "textarea",
                    placeholder: "Expected... Actual...",
                    rows: 5,
                },
                {
                    key: "browserAndOS",
                    label: "Browser and OS",
                    kind: "input",
                    placeholder: "e.g. Chrome 124 on macOS 14",
                },
            ],
        },
    ],
    note: {
        text: "We are currently in private beta and expect issues to be found. Current known issues can be found on ",
        link: {
            label: "ChalkieChalkie's GitHub",
            href: "https://github.com/HarrisonBaghurst/ChalkieChalkie/issues",
        },
        trailing: ".",
    },
};

import { FormSpec } from "./formSpec";

const STUDENT_COUNT_OPTIONS = ["1-5", "6-20", "21-50", "50+"] as const;

const SETTING_OPTIONS = ["Independent", "Agency", "School", "Other"] as const;

export const TUTOR_ACCESS: FormSpec = {
    title: "Request tutor access",
    subject: "Tutor Access Request",
    endpoint: "/api/tutor-access",
    steps: [
        {
            label: "About you",
            fields: [
                {
                    key: "subjects",
                    label: "Subjects taught",
                    kind: "input",
                    placeholder: "e.g. A-level Maths and Further Maths",
                },
                {
                    key: "studentCount",
                    label: "Roughly how many students",
                    kind: "select",
                    options: STUDENT_COUNT_OPTIONS,
                },
                {
                    key: "setting",
                    label: "Where you tutor now",
                    kind: "select",
                    options: SETTING_OPTIONS,
                },
            ],
        },
        {
            label: "Details",
            fields: [
                {
                    key: "profileLink",
                    label: "Website or profile link",
                    kind: "input",
                    placeholder: "Optional",
                    optional: true,
                },
                {
                    key: "notes",
                    label: "Anything else",
                    kind: "textarea",
                    placeholder: "Anything that would help us review this...",
                    rows: 5,
                },
            ],
        },
    ],
    note: {
        text: "Your name, email and account are attached automatically. Tutor accounts are reviewed manually and you will be notified by email once yours is upgraded.",
    },
    successDescription:
        "We aim to review tutor requests within 2 business days.",
};

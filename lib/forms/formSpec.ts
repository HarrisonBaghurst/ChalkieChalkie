export type FieldKind = "input" | "textarea" | "select";

export type FieldSpec = {
    key: string;
    label: string;
    kind: FieldKind;
    placeholder?: string;
    type?: string;
    rows?: number;
    options?: readonly string[];
    optional?: boolean;
    half?: boolean;
};

export type FormStepSpec = {
    label: string;
    fields: readonly FieldSpec[];
};

export type FormNote = {
    text: string;
    link?: { label: string; href: string };
    trailing?: string;
};

export type FormSpec = {
    title: string;
    subject: string;
    endpoint: string;
    steps: readonly FormStepSpec[];
    reviewLabel?: string;
    note?: FormNote;
    successDescription?: string;
};

export const formFields = (spec: FormSpec): FieldSpec[] =>
    spec.steps.flatMap((step) => [...step.fields]);

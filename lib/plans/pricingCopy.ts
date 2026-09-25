import { PlanId } from "@/types/planTypes";

export type PlanCopy = {
    price: string;
    cadence: string;
    tagline: string;
    features: string[];
};

export const ONELINK_URL = "https://link.com";

export const PLAN_ORDER: PlanId[] = ["basic", "plus", "professional"];

export const planRank = (plan: PlanId): number => PLAN_ORDER.indexOf(plan);

export const PLAN_COPY: Record<PlanId, PlanCopy> = {
    basic: {
        price: "£5",
        cadence: "per month",
        tagline: "For tutors teaching one-to-one, a couple of lessons a week.",
        features: [
            "One-to-one lessons.",
            "10 lessons per month — around two a week.",
            "Workspaces stay available for 14 days after your lesson.",
            "Open your workspace 1 hour before you start.",
            "Keep up to 3 students on your account.",
        ],
    },
    plus: {
        price: "£15",
        cadence: "per month",
        tagline:
            "For tutors with a busy timetable or entering an exam period.",
        features: [
            "Up to 3 students in a lesson.",
            "50 lessons per month — around ten a week.",
            "Workspaces stay available for 30 days after your lesson.",
            "Open your workspace 24 hours before you start.",
            "Keep up to 25 students on your account.",
        ],
    },
    professional: {
        price: "£45",
        cadence: "per month",
        tagline: "For full-time tutors teaching several lessons a day.",
        features: [
            "Up to 5 students in a lesson.",
            "Unlimited lessons.",
            "Workspaces stay available for 90 days after your lesson.",
            "Open your workspace 3 days before you start.",
            "Keep unlimited students on your account.",
        ],
    },
};

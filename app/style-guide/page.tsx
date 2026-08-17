import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/serverRole";
import StyleGuide from "@/components/styleGuide/StyleGuide";

export const metadata: Metadata = {
    title: "Style guide | Chalkie Chalkie",
    robots: { index: false, follow: false },
};

// Gated here rather than in proxy.ts: a sign-in redirect would advertise that
// the route exists, so every unauthorised case 404s instead.
const page = async () => {
    const { userId } = await auth();
    if (!userId) notFound();

    const role = await getUserRole(userId).catch(() => null);
    if (role !== "admin") notFound();

    return <StyleGuide />;
};

export default page;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/serverRole";
import StyleGuide from "@/components/styleGuide/StyleGuide";

export const metadata: Metadata = {
    title: "Style guide | Chalkie Chalkie",
    robots: { index: false, follow: false },
};

/**
 * Internal design-system reference, restricted to the `admin` account role.
 *
 * Deliberately NOT listed in `proxy.ts`: a protected route would bounce signed
 * out visitors to the sign-in page and so advertise that something exists here.
 * Instead every unauthorised case — signed out, wrong role, or a failed Clerk
 * lookup — renders the ordinary 404, making the route indistinguishable from
 * one that was never built. Fails closed by construction: only an explicit
 * "admin" gets through.
 *
 * Note that admin is not a superset of tutor. Nothing on this page needs tutor
 * data, and nothing tutor-gated should be opened up to admins to make an
 * internal tool easier to build.
 */
const page = async () => {
    const { userId } = await auth();
    if (!userId) notFound();

    const role = await getUserRole(userId).catch(() => null);
    if (role !== "admin") notFound();

    return <StyleGuide />;
};

export default page;

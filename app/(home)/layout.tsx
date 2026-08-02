import Navbar from "@/components/home/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Navbar />
            <div className="pt-16 w-full min-h-svh">{children}</div>
        </div>
    );
}

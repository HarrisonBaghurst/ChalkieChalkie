import Navbar from "@/components/home/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Navbar />
            {children}
        </div>
    );
}

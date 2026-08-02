import Footer from "@/components/Footer";
import Navbar from "@/components/home/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Navbar />
            <div className="pt-16 w-full min-h-svh">
                {children}
                <div className="px-[8dvw] pt-[20svh] relative w-full">
                    <Footer />
                </div>
            </div>
        </div>
    );
}

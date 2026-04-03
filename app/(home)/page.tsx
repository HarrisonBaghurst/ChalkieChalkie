import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Workspaces from "@/components/Workspaces";

const page = () => {
    return (
        <div className="h-fit">
            <Hero />
            <Workspaces />
            <Footer />
        </div>
    );
};

export default page;

import Actions from "@/components/dashboard/Actions";
import Filters from "@/components/dashboard/Filters";
import Next from "@/components/dashboard/Next";
import Previous from "@/components/dashboard/Previous";
import Upcoming from "@/components/dashboard/Upcoming";

const page = () => {
    return (
        <div className="p-16 flex flex-col gap-16">
            <Next />
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <Actions />
                    <Filters />
                </div>
                <div className="flex gap-8">
                    <Upcoming />
                    <Previous />
                </div>
            </div>
        </div>
    );
};

export default page;

import React from "react";
import Button from "./Button";

const WorkspaceCard = ({ description }: { description: Boolean }) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-foreground-third" />
            <div className="flex justify-between">
                <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-foreground-third rounded-full" />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-inter-bold">
                            Harrison Baghurst 55
                        </p>
                        <p className="text-xs text-foreground-third max-w-65">
                            This is a thing that I would like to say because
                            there will be a description here
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-inter-bold">
                            Thursday 20:30
                        </p>
                        <p className="text-xs text-foreground-third text-right">
                            19/12/26
                        </p>
                    </div>
                    <Button text="Join" onClick={() => {}} />
                    <Button text="Edit" onClick={() => {}} />
                </div>
            </div>
            {description == true && (
                <div className="text-xs text-foreground-third">
                    Name here did a good join in today's lesson with good effort
                    but struggled with some topics. We managed to cover a good
                    number of topics and will continue with pythagoras next
                    lesson.
                </div>
            )}
        </div>
    );
};

export default WorkspaceCard;

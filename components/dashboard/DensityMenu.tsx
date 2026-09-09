"use client";

import { Rows3Icon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DENSITY_LABEL,
    TABLE_DENSITIES,
    TableDensity,
    useTableDensity,
} from "./tableDensity";

const DensityMenu = () => {
    const { density, setDensity } = useTableDensity();

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger
                        aria-label="Row height"
                        // px/py rather than a size-*, so the box matches the
                        // text controls beside it exactly.
                        className="control-surface px-2.5 py-2 text-small text-foreground cursor-pointer outline-none hover:bg-card-background-hover focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <Rows3Icon className="size-4 align-middle" />
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Row height</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Row height</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={density}
                    onValueChange={(value) => setDensity(value as TableDensity)}
                >
                    {TABLE_DENSITIES.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                            {DENSITY_LABEL[option]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default DensityMenu;

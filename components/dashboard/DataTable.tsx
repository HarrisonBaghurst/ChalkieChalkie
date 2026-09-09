"use client";

import React, { ReactNode, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    ColumnPin,
    columnWidthPercent,
    TableColumn,
    totalMinWidth,
} from "@/lib/tableColumns";
import { DENSITY_ROW_CLASS, useTableDensity } from "./tableDensity";

const TABLE_CLASS = "w-full table-fixed border-separate border-spacing-0";

const HEAD_CELL_CLASS =
    "px-3 py-3 text-left text-caption font-inter-regular text-foreground-third";

const CELL_CLASS =
    "px-3 align-middle text-small border-b border-foreground-third/10";

const HEAD_PIN_CLASS: Record<ColumnPin, string> = {
    left: "sticky left-0 z-10 bg-background-second",
    right: "sticky right-0 z-10 bg-background-second",
};

const BODY_PIN_CLASS: Record<ColumnPin, string> = {
    left: "sticky left-0 z-10 bg-card-background group-data-[scroll-start=false]/table:shadow-[8px_0_12px_-8px_var(--color-background)]",
    right: "sticky right-0 z-10 bg-card-background group-data-[scroll-end=false]/table:shadow-[-8px_0_12px_-8px_var(--color-background)]",
};

const Cols = <K extends string>({
    columns,
}: {
    columns: readonly TableColumn<K>[];
}) => (
    <colgroup>
        {columns.map((col) => (
            <col
                key={col.key}
                style={{ width: columnWidthPercent(col, columns) }}
            />
        ))}
    </colgroup>
);

type DataTableRowProps<K extends string> = {
    columns: readonly TableColumn<K>[];
    cells: Record<K, ReactNode>;
};

export const DataTableRow = <K extends string>({
    columns,
    cells,
}: DataTableRowProps<K>) => {
    const { density } = useTableDensity();

    return (
        <tr>
            {columns.map((col) => (
                <td
                    key={col.key}
                    className={cn(
                        CELL_CLASS,
                        DENSITY_ROW_CLASS[density],
                        col.pin && BODY_PIN_CLASS[col.pin],
                    )}
                >
                    {cells[col.key]}
                </td>
            ))}
        </tr>
    );
};

type DataTableProps<K extends string> = {
    columns: readonly TableColumn<K>[];
    toolbar?: ReactNode;
    empty?: ReactNode;
    sticky?: boolean;
    children: ReactNode;
};

const DataTable = <K extends string>({
    columns,
    toolbar,
    empty,
    sticky = true,
    children,
}: DataTableProps<K>) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const minWidth = totalMinWidth(columns);
    const isEmpty = React.Children.count(children) === 0;

    const sync = useCallback(() => {
        const root = rootRef.current;
        const head = headRef.current;
        const body = bodyRef.current;
        if (!root || !head || !body) return;

        head.scrollLeft = body.scrollLeft;
        const max = body.scrollWidth - body.clientWidth;
        root.dataset.scrollStart = String(body.scrollLeft <= 0);
        root.dataset.scrollEnd = String(body.scrollLeft >= max - 1);
    }, []);

    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(body);
        return () => observer.disconnect();
    }, [sync]);

    return (
        <div
            ref={rootRef}
            data-scroll-start="true"
            data-scroll-end="true"
            className="group/table w-full min-w-0"
        >
            <div
                className={cn(
                    "z-20 flex flex-col gap-4 bg-background",
                    sticky && "sticky top-0 -mt-[2.5dvw] pt-[2.5dvw]",
                )}
            >
                {toolbar}
                <div
                    ref={headRef}
                    aria-hidden
                    className="relative w-full min-w-0 overflow-x-hidden radius-surface rounded-b-none border border-foreground-third/15 bg-background-second"
                >
                    <table className={TABLE_CLASS} style={{ minWidth }}>
                        <Cols columns={columns} />
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            HEAD_CELL_CLASS,
                                            col.pin && HEAD_PIN_CLASS[col.pin],
                                        )}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    </table>
                </div>
            </div>

            <div
                ref={bodyRef}
                onScroll={sync}
                className="relative w-full min-w-0 overflow-x-auto radius-surface rounded-t-none border border-t-0 border-foreground-third/15 bg-card-background"
            >
                <table
                    className={cn(
                        TABLE_CLASS,
                        "[&_tbody_tr:last-child>td]:border-b-0",
                    )}
                    style={{ minWidth }}
                >
                    <Cols columns={columns} />
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className="h-0 border-0 p-0"
                                >
                                    <span className="sr-only">{col.label}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isEmpty ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-3 py-8 text-center text-caption text-foreground-third"
                                >
                                    {empty}
                                </td>
                            </tr>
                        ) : (
                            children
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;

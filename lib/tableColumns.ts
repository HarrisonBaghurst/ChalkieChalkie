export type ColumnPin = "left" | "right";

export type TableColumn<K extends string = string> = {
    key: K;
    label: string;
    minWidth: number;
    grow?: number;
    pin?: ColumnPin;
};

export const totalMinWidth = (columns: readonly TableColumn[]): number =>
    columns.reduce((sum, col) => sum + col.minWidth, 0);

export const columnWidthPercent = (
    column: TableColumn,
    columns: readonly TableColumn[],
): string => {
    const weight = (col: TableColumn) => col.grow ?? col.minWidth;
    const total = columns.reduce((sum, col) => sum + weight(col), 0);
    return `${(weight(column) / total) * 100}%`;
};

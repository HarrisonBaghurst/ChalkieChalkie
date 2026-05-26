export type Point = {
    x: number;
    y: number;
}

export type Stroke = {
    id: string;
    points: Point[];
    colour: string;
    highlight?: boolean;
}

/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * Point/vector/size
 */

import {instanceOf} from "prop-types";

export interface IPoint {
    x: number;
    y: number;
}

export function isPointLike(v: any): v is IPoint {
    return (typeof v === 'object') && (typeof v.x === 'number') && (typeof v.y === 'number');
}

export function isPoint(v: any): v is Point {
    return v instanceof Point;
}

export class Point implements Readonly<IPoint> {
    public readonly x: number;
    public readonly y: number;
    constructor(x?: number|IPoint, y?: number) {
        if (isPointLike(x)) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x || 0;
            this.y = y || 0;
        }
    }

    /**
     * Create a new [[Point]] offset by the supplied amounts
     * @param x
     * @param y
     */
    public add(x: number, y: number): Point;

    /**
     * Create a new [[Point]] offset by the supplied point (vector) value.
     * @param offset
     */
    public add(offset: Point): Point;

    /**
     * Implementation of [[Point.move]].
     * @param x
     * @param y
     */
    public add(x: number|IPoint, y?: number) {
        if (isPointLike(x)) {
            return this.add(x.x, x.y);
        }
        return new Point(x + this.x, y + this.y);
    }

    /**
     * Create a new [[Point]] offset by the supplied amounts
     * @param x
     * @param y
     */
    public sub(x: number, y: number): Point;

    /**
     * Create a new [[Point]] offset by the supplied point (vector) value.
     * @param offset
     */
    public sub(offset: IPoint): Point;

    /**
     * Implementation of [[Point.move]].
     * @param x
     * @param y
     */
    public sub(x: number|IPoint, y?: number) {
        if (isPointLike(x)) {
            return this.sub(x.x, x.y);
        }
        return new Point(this.x - x, this.y - y);
    }

    /**
     * Scale a point/vector/size by different X/Y values
     * @param x
     * @param y (defaults to be the same as x).
     */
    public mult(x: number, y?: number): Point;

    /**
     * Scal a point/vector/size by different X/Y values
     * @param p
     */
    public mult(p: IPoint): Point;
    public mult(x: number|IPoint, y?: number): Point {
        if (isPointLike(x)) {
            return this.mult(x.x, x.y);
        }
        if (y === undefined) {
            y = x;
        }
        return new Point(this.x * x, this.y * y);
    }

    /**
     * Calculate the distance from this point to another.
     * @param x
     * @param y
     */
    public distance(x: number, y: number): number;

    /**
     * Calculate the distance from this point to another.
     * @param p
     */
    public distance(p: IPoint): number;

    public distance(x: number|IPoint, y?: number) {
        if (isPointLike(x)) {
            return this.distance(x.x, x.y);
        }
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Return the length or magnitude of the vector.
     */
    public magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Format points as {x,y}
     */
    public toString(): string {
        return `{${this.x},${this.y}}`;
    }
}

export default Point;

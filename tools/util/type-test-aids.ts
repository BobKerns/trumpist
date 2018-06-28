/*
 * Copyright (c) 2018 Bob Kerns.
 */



export function accepting<T>(val: () => T): T {
    return undefined as any as T;
}

export function producing<T>(val?: any): T {
    return val! as T;
}

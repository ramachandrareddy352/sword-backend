import { Request, Response } from "express";

const success = function (res: Response, body = {}) {
    return res.status(200).json(convertBigIntsToStrings(body));
};
// Helper function to convert BigInts to strings recursively                           
const convertBigIntsToStrings = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntsToStrings);
    }
    if (obj instanceof Date) {
        return obj;
    }
    if (typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = convertBigIntsToStrings(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}


const error = function (res: Response, err: any) {
    let code = 500;
    if (typeof err === "string") {
        code = 400;
    }

    let message =
        typeof err === "object" ? (err.message ? err.message : err.response?.data) : err;

    return res.status(code).json({
        error: message,
    });
};

export const responseHandler = {
    success,
    error,
};

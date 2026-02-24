"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_ts_1 = __importDefault(require("../config/cloudinary.ts"));
const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        cloudinary_ts_1.default.uploader
            .upload_stream({ folder }, (error, result) => {
            if (error) {
                console.log(error);
                reject(error);
            }
            resolve(result);
        })
            .end(fileBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
//# sourceMappingURL=uploadToCloudinary.js.map
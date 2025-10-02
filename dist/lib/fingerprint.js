"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFingerprint = getFingerprint;
const fingerprintjs_1 = __importDefault(require("@fingerprintjs/fingerprintjs"));
let fpPromise = null;
async function getFingerprint() {
    if (!fpPromise) {
        fpPromise = fingerprintjs_1.default.load();
    }
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
}

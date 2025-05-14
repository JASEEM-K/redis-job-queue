"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT = exports.REDIS_URI = void 0;
const getEnv = (name) => {
    try {
        const env = process.env[name];
        if (!env) {
            throw new Error(`evn is missing ${name}`);
        }
        return env;
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
};
exports.REDIS_URI = getEnv("HOST");
exports.PORT = getEnv("PORT");

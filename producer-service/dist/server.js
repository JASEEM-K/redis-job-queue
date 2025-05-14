"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const env_1 = require("./utils/env");
const uuid_1 = require("uuid");
const redis_1 = require("redis");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
const client = (0, redis_1.createClient)({
    socket: {
        host: "localhost",
        port: 6379,
    },
});
client.connect();
app.post("/", async (req, res, next) => {
    try {
        const { type, payload } = req.body;
        if (!type || !payload) {
            res.status(400).json({
                message: " type and payload is requried",
            });
        }
        const jobId = (0, uuid_1.v4)();
        await client.lPush("jobQueue", `job:${jobId}`);
        await client.set(`job:${jobId}:status`, "queued");
        await client.set(`job:${jobId}:type`, type);
        await client.hSet(`job:${jobId}:payload`, payload);
        res.status(200).json({
            jobId,
            status: "queued",
            type,
            payload,
        });
    }
    catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "something went wrong" });
    }
});
app.get("/", async (req, res, next) => {
    try {
        const jobId = await client.rPop("jobQueue");
        const status = await client.get(`${jobId}:status`);
        const jobType = await client.get(`${jobId}:type`);
        const jobPayloads = await client.hGetAll(`${jobId}:payload`);
        res.status(200).json({
            jobId,
            status,
            type: jobType,
            payload: jobPayloads,
        });
    }
    catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "something went wrong" });
    }
});
app.listen(env_1.PORT, () => {
    console.log("server is running of port ", env_1.PORT);
});

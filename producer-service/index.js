import "dotenv/config";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "redis";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = createClient({
    socket: {
        host: process.env.HOST,
        port: 6379,
    },
});

await client.connect();

client.on("connect", () => console.log("redis ok"));

app.post("/", async (req, res, next) => {
    try {
        const { type, payload } = req.body;
        if (!type || !payload) {
            res.status(400).json({
                message: " type and payload is requried",
            });
        }
        const jobId = uuidv4();
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
    } catch (error) {
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
    } catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "something went wrong" });
    }
});
// Add error handling for Redis connection
client.on("error", (err) => console.error("Redis Client Error", err));

// ...existing code...

// Graceful shutdown handling
process.on("SIGINT", async () => {
    client.destroy();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    client.destroy();
    process.exit(0);
});

app.listen(process.env.PORT, () => {
    console.log("server is running of port ");
});

import "dotenv/config";
import express from "express";
import { HOST, PORT } from "./utils/env";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "redis";
import { Server } from "socket.io";
import { Socket } from "dgram";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Configure this according to your needs
        methods: ["GET", "POST"],
    },
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

const client = createClient({
    socket: {
        host: HOST,
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
        const jobId = uuidv4();
        await client.lPush("jobQueue", `job:${jobId}`);
        await client.set(`job:${jobId}:status`, "queued");
        await client.set(`job:${jobId}:type`, type);
        await client.hSet(`job:${jobId}:payload`, payload);

        io.emit("job", "jobadded");
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

app.get("/status/:jobId", async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const status = await client.get(`job:${jobId}:status`);
        const result = await client.get(`job:${jobId}:result`);
        res.status(200).json({
            jobId,
            status,
            result,
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

io.on("connection", (Socket) => {
    console.log("new connection");
    Socket.on("job", (msg) => {
        console.log(msg);
    });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("job", (msg) => {
        console.log("Job message received:", msg);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Replace separate listen calls with single httpServer.listen
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

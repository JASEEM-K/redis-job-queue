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

const subscribeClient = createClient({
    socket: {
        host: HOST,
        port: 6379,
    },
});

const client = createClient({
    socket: {
        host: HOST,
        port: 6379,
    },
});

subscribeClient.connect();

client.connect();

// Storing the connections
type connecStorageType = {
    socketId: string;
    jobId: string;
};
let connections: connecStorageType[] = [];

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

        () => {
            io.emit("job", "jobadded");
        };
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

// subscribing to a channel
subscribeClient.subscribe("channel:job:done", (returnJobId: string) => {
    console.log(`${returnJobId} is done`);
    const conres = connections.filter((con) => {
        console.log(
            `checking ${con.jobId} and ${returnJobId} and the answer is ${
                con.jobId === returnJobId ? true : false
            }`
        );
        if (con.jobId === returnJobId) {
            return con;
        } else {
            return null;
        }
    });
    // Check if connection exists
    console.log(
        "after filter ",
        conres,
        "and the connection list is ",
        connections
    );

    try {
        if (conres.length > 0) {
            const socketId = conres[0].socketId;
            io.emit(socketId, {
                message: "job done",
                jobId: returnJobId,
                socketId,
            });
        } else {
            console.log(`No socket connection found for job ${returnJobId}`);
        }
    } catch (error) {
        console.log("catching error ", error);
    }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(
        "Client connected:",
        socket.id,
        "Total connection",
        io.engine.clientsCount
    );
    socket.on(
        "job:add",
        async ({ type, payload }: { type: string; payload: {} }) => {
            console.log("got new task: ", { type, payload });

            try {
                if (!type || !payload) {
                    io.emit("job", {
                        message: " type and payload is requried",
                    });
                }
                const jobId = uuidv4();
                await client.lPush("jobQueue", `job:${jobId}`);
                await client.set(`job:${jobId}:status`, "queued");
                await client.set(`job:${jobId}:type`, type);
                await client.hSet(`job:${jobId}:payload`, payload);

                // () => {
                io.emit("job:add:consumer", "jobadded");
                console.log(`job send job:${jobId} for socket ${socket.id}`);

                connections.push({
                    socketId: socket.id,
                    jobId: `job:${jobId}`,
                });
                // };
            } catch (error) {
                console.log("error", error);
                io.emit("job", { message: "something went wrong" });
            }
        }
    );

    socket.on(
        "job",
        ({ message, jobDone }: { message: string; jobDone: string[] }) => {
            console.log("Job message received:", message);
        }
    );

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Replace separate listen calls with single httpServer.listen
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

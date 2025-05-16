import { createClient } from "redis";
import { io } from "socket.io-client";

const client = createClient({
    socket: {
        host: process.env.HOST,
        port: 6379,
    },
});

const socket = io("http://localhost:3000");

let IsProcessing = false;
let isWorking = false;

client.connect();

const checkforJob = async () => {
    try {
        const result = await client.brPop("jobQueue", 0);
        if (!result) {
            console.log("No jobs in queue, waiting...");
            return null;
        }
        const jobId = result.element;
        console.log("got job", result);

        const status = await client.get(`${jobId}:status`);
        const type = await client.get(`${jobId}:type`);
        const payloads = await client.hGetAll(`${jobId}:payload`);
        console.log("log after parsing");
        console.log({ jobId, status, type, payloads });
        return jobId;
    } catch (error) {
        console.log("ERROR ==> ", error);
        return null;
    }
};

const handleJob = async (jobId) => {
    try {
        if (IsProcessing) return;
        const statusupdation = await client.set(
            `${jobId}:status`,
            "processing"
        );
        IsProcessing = true;
        if (statusupdation === "OK")
            console.log("status updated to processing ");
        // IsProcessing
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const finalupdation = await client.set(`${jobId}:status`, "done");
        if (finalupdation === "OK") console.log("status updated to done");
        const result = await client.set(`${jobId}:result`, "result got stored");
        if (result === "OK") console.log("result is got");
        console.log("==========================================");
        IsProcessing = false;
        return jobId;
    } catch (error) {
        console.log("ERROR ==> ", error);
        return null;
    }
};

const jobLoop = async () => {
    isWorking = true;
    const job = await checkforJob();
    console.log("Took job for working:", job);

    if (job) {
        const result = await handleJob(job);
        console.log("this is the result after handling", result);
        if (result) await client.publish("channel:job:done", result);
    } else {
        socket.emit("job", { message: "jobdone" });
        isWorking = false;
        return;
    }
    jobLoop();
};

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("job:add:consumer", async (msg) => {
    console.log(msg);
    if (msg === "jobadded" && !isWorking) {
        console.log("job added , :)");
        await jobLoop();
    }
});

// const inter = setInterval(async () => {
// if (IsProcessing) return;
// }, 2000);

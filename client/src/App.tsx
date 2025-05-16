import { useEffect, useReducer, useRef, useState } from "react";
import { io } from "socket.io-client";

interface Datainetrface {
    type: string;
    payload: {
        [key: string]: string;
    };
}

function App() {
    const [data, setData] = useState<Datainetrface>({
        type: "",
        payload: {},
    });
    const [name, setName] = useState("");
    const [value, setValue] = useState("");
    const [message, setMessage] = useState({
        message: "",
        jobId: "",
        socketId: "",
    });
    const payloadInputRef = useRef<HTMLInputElement | null>(null);
    const sockeRef = useRef<any>(null);
    if (sockeRef.current) {
        sockeRef.current.on(
            sockeRef.current.id,
            ({
                message,
                jobId,
                socketId,
            }: {
                message: string;
                jobId: string;
                socketId: string;
            }) => {
                setMessage({ message, jobId, socketId });
            }
        );
    }
    const handleSumbit = () => {
        sockeRef.current && sockeRef.current.emit("job:add", data);
    };
    const pushPayload = () => {
        setData({
            ...data,
            payload: {
                ...data.payload,
                [name]: value, // Use square brackets for dynamic property names
            },
        });
        setName("");
        setValue("");
    };

    // useEffect(() => {
    //     if (payloadInputRef.current) {
    //         payloadInputRef.current.addEventListener("keydown", (e) => {
    //             if (e.key === "Enter") {
    //                 pushPayload(name, value);
    //             }
    //         });
    //     }
    // }, []);
    useEffect(() => {
        const socket = io("http://localhost:3000");
        sockeRef.current = socket;

        // Return cleanup function
        return () => {
            if (sockeRef.current) {
                sockeRef.current.disconnect();
            }
        };
    }, []);
    return (
        <>
            <div className="w-full h-full ">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    <input
                        name="type"
                        className="border-2 border-red-500"
                        placeholder="type"
                        value={data?.type}
                        onChange={(e) =>
                            setData({ ...data, type: e.target.value })
                        }
                    />

                    <input
                        name="payload"
                        className="border-2 border-red-500"
                        placeholder="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <input
                        ref={payloadInputRef}
                        name="payload"
                        className="border-2 border-red-500"
                        placeholder="payload"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <button onClick={pushPayload}>add</button>
                </form>

                <button onClick={handleSumbit}>send Job</button>

                <div>
                    <div>Type:{data.type}</div>
                    <div>payload:{JSON.stringify(data.payload)}</div>
                </div>
                <br />
                <div>
                    Jod Done
                    <div>message:{message.message}</div>
                    <div>JobId:{message.jobId}</div>
                    <div>socketId:{message.socketId}</div>
                </div>
            </div>
        </>
    );
}

export default App;

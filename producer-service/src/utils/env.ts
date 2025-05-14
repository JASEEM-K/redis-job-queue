const getEnv = (name: string) => {
    try {
        const env = process.env[name];
        if (!env) {
            throw new Error(`evn is missing ${name}`);
        }
        return env;
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

export const HOST = getEnv("HOST");
export const PORT = getEnv("PORT");

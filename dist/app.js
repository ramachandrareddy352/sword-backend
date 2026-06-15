import { config } from "dotenv";
import server from "./config/server.js";
import { connectRedis } from "./config/redis.js";
config();
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    await connectRedis();
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=app.js.map
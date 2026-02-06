import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";

import AdminActionRouters from "../routes/adminActionRoutes";
import AdminAuthRouters from "../routes/adminAuthRoutes";
import AdminGetterRouters from "../routes/adminGetterRoutes";

import PublicGetterRouters from "../routes/publicGetterRoutes";

import UserActionRouters from "../routes/userActionRoutes";
import UserAuthRouters from "../routes/userAuthRoutes";
import UserGetterRouters from "../routes/userGetterRoutes";

export const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

const corsOptions = {
  origin: (_origin: any, callback: (arg0: null, arg1: boolean) => void) => {
    // Check if the origin is in the list of allowed origins
    /**
         * write all logic/conditions to allow the origins
        if (true) {
            callback(null, true);
        } else {
            console.log('Requested origin is blocked:', origin);
            callback(null, false); // Don't throw error, just don't allow
        }
         */
    callback(null, true);
  },
  //   origin: "http://localhost:3000",
  methods: "GET,PUT,POST,OPTIONS,DELETE,PATCH", // Specify allowed methods
  // credentials: true,
  allowedHeaders: "*",
};

app.use(cors(corsOptions));

app.get("/", (req: Request, res: Response) => {
  res.send("Sword Backend");
});

app.use("/api/adminActions", AdminActionRouters);
app.use("/api/adminAuth", AdminAuthRouters);
app.use("/api/adminGetters", AdminGetterRouters);

app.use("/api/publicGetters", PublicGetterRouters);

app.use("/api/userActions", UserActionRouters);
app.use("/api/userAuth", UserAuthRouters);
app.use("/api/userGetters", UserGetterRouters);

const server = createServer(app);
export default server;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reelsRouter from "./reels";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reelsRouter);
router.use(storageRouter);

export default router;

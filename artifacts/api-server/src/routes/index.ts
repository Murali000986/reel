import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reelsRouter from "./reels";
import storageRouter from "./storage";
import usersRouter from "./users";
import feedRouter from "./feed";
import interactionsRouter from "./interactions";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reelsRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(feedRouter);
router.use(interactionsRouter);
router.use(messagesRouter);
router.use(notificationsRouter);

export default router;


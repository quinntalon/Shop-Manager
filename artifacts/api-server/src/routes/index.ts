import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import salesRouter from "./sales";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(settingsRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(salesRouter);
router.use(dashboardRouter);

export default router;

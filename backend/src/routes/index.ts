import type { FastifyPluginAsync } from "fastify";
import healthRoutes from "./health";
import storageRoutes from "./storage";
import categoriesRoutes from "./categories";
import productsRoutes from "./products";
import publicProductsRoutes from "./publicProducts";
import salesRoutes from "./sales";
import dashboardRoutes from "./dashboard";
import usersRoutes from "./users";
import settingsRoutes from "./settings";
import receiptTemplatesRoutes from "./receiptTemplates";
import customersRoutes from "./customers";
import reportsRoutes from "./reports";
import stockTransfersRoutes from "./stockTransfers";
import loyaltyRoutes from "./loyalty";

const router: FastifyPluginAsync = async (fastify) => {
  await fastify.register(publicProductsRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(storageRoutes);
  await fastify.register(usersRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(receiptTemplatesRoutes);
  await fastify.register(categoriesRoutes);
  await fastify.register(productsRoutes);
  await fastify.register(salesRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(customersRoutes);
  await fastify.register(reportsRoutes);
  await fastify.register(stockTransfersRoutes);
  await fastify.register(loyaltyRoutes);
};

export default router;

import express from 'express';
import { createProduct, deleteProduct, getAllProducts } from '../controllers/product.controller.js';
import { adminRoute, protectedRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/',protectedRoute,adminRoute, getAllProducts);
router.get("/featured", protectedRoute, adminRoute,);
router.post("/create-post", protectedRoute, adminRoute, createProduct);
router.delete("/:id", protectedRoute, adminRoute, deleteProduct);
export default router;
import express from "express";
import {signup, login, logout, refresh_Token, getProfile } from "../controllers/auth.controller.js"
import { protectedRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refresh_Token);
router.get("/getProfile", protectedRoute, getProfile);

export default router;
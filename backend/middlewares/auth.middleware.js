import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/AsyncHandler.js";
import jwt from 'jsonwebtoken';

// Flow : accessToken -> verify -> fetch user -> attach req.user -> next()
export const protectedRoute = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
        throw new ApiError(401, 'Unauthorized - Token not found!');
    }
    let decoded;
    try {
        decoded=jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    } catch(error) {
        throw new ApiError(401,'Invalid or expired token')
    }
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    req.user = user;
    next();
});

export const adminRoute=asyncHandler(async (req,res,next) => {
    if (req.user?.role === 'admin') return next();
    else
        throw new ApiError(403, 'Access denied - Admin only');
})
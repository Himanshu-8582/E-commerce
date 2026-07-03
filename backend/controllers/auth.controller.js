import asyncHandler from "../utils/AsyncHandler.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';

import { redis } from "../lib/redis.js";
import dotenv from 'dotenv';
dotenv.config();


// For generating tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m',
    })
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '7d',
    });

    return { accessToken, refreshToken };
}


// To Store refresh token in redis
const storeRefreshToken = asyncHandler(async (userId, refreshToken) => {
    await redis.set(`refresh_token:${userId}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
});


// For storing tokens in cookies
const setCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15*60*1000,
    })
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7*24*60*60*1000,
    })
}






export const signup = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    if (
        [name, email, password].some(
            (field) => !field || field?.trim() === "",
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ApiError(400, 'User Already Exists');
    }

    const user = await User.create({ name, email, password });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    const createdUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    }
    return res.status(201).json(new ApiResponse(201, 'User created successfully', createdUser));
});


export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials');
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    const loggedInUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    }
    return res.status(201).json(new ApiResponse(201, 'User logged in successfully', loggedInUser));
});


export const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    // console.log(refreshToken);
    if (refreshToken) {
        const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        await redis.del(`refresh_token:${decode.userId}`);
    } else {
        throw new ApiError(404, 'token not found || login first');
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json(new ApiResponse(200,'Logged out Successfully'))
});


export const refresh_Token = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new ApiError(404, 'token not found || login first');
    }
    const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const storedRefreshToken = await redis.get(`refresh_token:${decode.userId}`);
    if (storedRefreshToken !== refreshToken) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    const accessToken = jwt.sign({ userId: decode.userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m',
    });
    setCookies(res, accessToken, refreshToken);
    return res.json(new ApiResponse(200, 'Access token refreshed successfully'));
});


export const getProfile = asyncHandler(async (req, res) => {
    return res.json(new ApiResponse(200, 'Profile retrieved successfully', req.user));
});

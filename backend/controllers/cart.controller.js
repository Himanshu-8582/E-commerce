import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import asyncHandler from '../utils/AsyncHandler.js';
import Product from '../models/product.model.js';


export const addToCart = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) throw new ApiError(400, 'Product id required');
    const user = req.user;
    if (!user) throw new ApiError(404, 'User not found!');
    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const existingItem = user.cartItems.find(
        (item) => item.product.toString() === productId,
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        user.cartItems.push({
            product: productId,
            quantity: 1,
        });
    }

    // console.log(user);
    await user.save();;
    return res.status(200).json(new ApiResponse(200, 'Product added', user.cartItems));
});


export const getCartProducts = asyncHandler(async (req, res) => {
    const productIds = req.user.cartItems.map((item) => item.product);

    const products = await Product.find({
        _id: { $in: productIds },
    });

    const cartItems = products.map((product) => {
        const item = req.user.cartItems.find(
            (cartItem) => cartItem.product.toString() === product._id.toString(),
        );

        return {
            ...product.toObject(),
            quantity: item.quantity,
        };
    });


    // optamized production code
    // const quantityMap = new Map(
    //   req.user.cartItems.map((item) => [
    //     item.product.toString(),
    //     item.quantity,
    //   ]),
    // );

    // const cartItems = products.map((product) => ({
    //   ...product.toObject(),
    //   quantity: quantityMap.get(product._id.toString()),
    // }));


    return res
        .status(200)
        .json(new ApiResponse(200, "Accessed all products", cartItems));
});


export const removeAllFromCart = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    const user = req.user;
    if (!user) throw new ApiError(404, "User not found!");
    if (!productId) {
        user.cartItems = [];
    } else {
        user.cartItems = user.cartItems.filter(
          (item) => item.product.toString() !== productId,
        );
    }

    // Optamized one
    // await User.updateOne(
    //   { _id: req.user._id },
    //   {
    //     $set: {
    //       cartItems: [],
    //     },
    //   },
    // );

    await user.save();
    return res.status(200).json(new ApiResponse(200, 'cart is empty', user.cartItems));
});


export const updateQuantity = asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    const user = req.user;
    const existingItem = user.cartItems.find(
        (item) => item.product.toString() === productId,
    );

    if (!existingItem) {
        throw new ApiError(404, "Item not found");
    }

    if (quantity <= 0) {
        user.cartItems = user.cartItems.filter(
            (item) => item.product.toString() !== productId,
        );
    } else {
        existingItem.quantity = quantity;
    }
    await user.save();
    return res.status(200).json(new ApiResponse(200, 'Updated quantity successfully', user.cartItems));
});
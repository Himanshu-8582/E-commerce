import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import asyncHandler from '../utils/AsyncHandler.js';


export const addToCart = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) throw new ApiError(400, 'Product id required');
    const user = req.user;
    if (!user) throw new ApiError(404, 'User not found!');
    const product = await Product.findById(productId);

     if (!product) {
       throw new ApiError(404, "Product not found");
     }

    const existingItem = user.cartItems.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        existingItem.push(productId);
    }
    await user.save();
    return res.status(200).json(200, 'Product added', user.cartItems);
});


export const getCartProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ _id: { $in: req.user.cartItems } });
    
    // add quantity of each product
    const cartItems = products.map(product => {
        const item = req.user.cartItems.find(cartItem => cartItem.id === product.id);
        return res.status(200).json(new ApiResponse(200, 'Accessd all products', { ...product.toJSON(), quantity: item.qunatity }));
    });
    return res.status(200).json(new ApiResponse(200, 'Accessed all products', cartItems));
})


export const removeAllFromCart = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    const user = req.user;
    if (!user) throw new ApiError(404, "User not found!");
    if (!productId) {
        user.cartItems = [];
    } else {
        user.cartItems = user.cartItems.filter((item) => item.id !== productId);
    }
    await user.save();
    return res.status(200).json(new ApiResponse(200, 'cart is empty', user.cartItems));
});


export const updateQuantity = asyncHandler(async (req, res) => {
    const { id: productId } = req.body;
    const { quantity } = req.body;
    const user = req.user;
    const existingItem = user.cartItems.find((item) => item.id === productId);
    if (!existingItem) {
        throw new ApiError(404, 'Item not found');
    }
    if (quantity === 0) {
      user.cartItems = user.cartItems.filter((item) => item.id !== productId);
    } else {
        existingItem.quantity = quantity;
    }
    await user.save();
    return res.status(200).json(new ApiResponse(200, 'Updated quantity successfully', user.cartItems));
});
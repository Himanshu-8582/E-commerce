import asyncHandler from "../utils/AsyncHandler.js";
import Product from '../models/product.model.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import { redis } from "../lib/redis.js";
import { ApiError } from "../utils/ApiError.js";
import cloudinary from "../lib/cloudinary.js";



const updateFeaturedProductsCache = async (req, res) => {
  const featuredProducts = await Product.find({ isFeatured: true }).lean();
  await redis.set("featured_products", JSON.stringify(featuredProducts));
};





export const getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({});
    return res
      .status(200)
      .json(new ApiResponse(200, "Products fetched successfully", products));
});

// check redis -> if miss -> fatch from momgo -> store in redis -> return ; else hit then return 
export const getFeaturedProducts = asyncHandler(async (req, res) => {
    let featuredProducts = await redis.get('featured_products');
    if (featuredProducts) {
        return res.json(
          new ApiResponse(200, " ", JSON.parse(featuredProducts)),
        );
    }

    // if not in redis, then fetch it from MongoDB
    featuredProducts = await Product.find({ isFeatured: true }).lean();
    if (!featuredProducts) {
        throw new ApiError(404, "No featured products found");
    }

    // Store in redis
    await redis.set('featured_products', JSON.stringify(featuredProducts));
    return res.status(200).json(new ApiResponse(200, ' ',featuredProducts));
});


export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, image, category } = req.body;
    if (
      [name, description, image, category].some(
        (field) => !field || field.trim() === "",
      )
    ) {
      throw new ApiError(400, "All fields are required");
    };

    let cloudinaryResponse = null;
    if (image) {
        cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: 'products' });
    }

    const product = await Product.create({
        name,
        description,
        price,
        image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
        category
    });

    return res.status(201).json(new ApiResponse(201, " ", product));
});


export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    if (product.image) {
        const publicId = product.image.split('/').pop().split('.')[0];
        try {
            await cloudinary.uploader.destroy(`products/${publicId}`);
            console.log('delete image from cloudinary');
        } catch (e) {
            console.log('Error in deleting image from cloudinary', e);
        }
    }
    await Product.findByIdAndDelete(req.params.id);
    return res.json(new ApiResponse(200, 'message deleted successfully'));
});


export const getRecommendedProducts = asyncHandler(async (req, res) => {
    const products = await Product.aggregate([
        {
            $sample: { size: 3 }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                image: 1,
                price: 1,
            }
        }
    ]);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Recommended products fetched successfully",
          products,
        ),
      );
})


export const getProductsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    if (!category) throw new ApiError(404, 'category not Found!');
    const products = await Product.find({ category }).lean();
    return res.status(200).json(new ApiResponse(200, 'Products by category', products));
})


export const toggleFeaturedProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new ApiError(404, 'Product not found!');
    }
    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();

    await updateFeaturedProductsCache();

    // console.log("Updated product featured status:", updatedProduct);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Featured status updated successfully",
          updatedProduct,
        ),
      );
})
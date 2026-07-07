import express from 'express';
import asyncHandler from '../utils/AsyncHandler.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';

const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

export const getAnalyticsData = async () => {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const salesData = await Order.aggregate([
        {
            $group: {
                _id: null,    // gorup of all document together
                totalSales: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                
            }
        }
    ]);
    const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 };
    return {
        users: totalUsers,
        products: totalProducts,
        totalSales,
        totalRevenue,
    }
}

export const getDailySalesData = async (startDate, endDate) => {
    const dailySalesData = await Order.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate,
                },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                sales: { $sum: 1 },
                revenue: { $sum: '$totalAmount' },
            },
        },
        {
            $sort: { _id: 1 },
        }
    ]);

    const dateArray = getDatesInRange(startDate, endDate);
    // console.log(dateArray);
    return dateArray.map(date => {
        const salesMap = new Map(
          dailySalesData.map((item) => [item._id, item]),
        );

        return dateArray.map((date) => {
          const foundData = salesMap.get(date);

          return {
            date,
            sales: foundData?.sales ?? 0,
            revenue: foundData?.revenue ?? 0,
          };
        });
    })
}
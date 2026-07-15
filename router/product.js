import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";
import { upload } from "../utilities/cloudinary.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        reviews: {
          select: { rating: true },
        },
      },
    });

    // attach computed rating + review count to each product :::::::::::::::::
    const formatted = products.map((product) => {
      const reviewsCount = product.reviews.length;
      const avgRating =
        reviewsCount > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
          : 0;

      const { reviews, ...rest } = product;

      return {
        ...rest,
        rating: Math.round(avgRating * 10) / 10, // round to 1 decimal
        reviewsCount,
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products/upload-image — admin only
router.post(
  "/upload-image",
  [loginRequired, adminRequired],
  upload.single("image"),
  async (req, res, next) => {
    try {
      console.log("req.file:", req.file); // ← add this
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }
      res.json({ imageUrl: req.file.path });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const {
      name,
      description,
      unitPrice,
      originalPrice,
      stock,
      badge,
      homeFeature,
      imageUrl,
      images,
      categoryId,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name: name,
        description: description,
        unitPrice: unitPrice,
        originalPrice: originalPrice || null,
        stock: stock || 0,
        status: (stock || 0) > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        badge: badge || null,
        homeFeature: homeFeature || false,
        imageUrl: imageUrl,
        images: images || [],
        categoryId: categoryId,
      },
      select: {
        id: true,
        name: true,
        unitPrice: true,
        stock: true,
        status: true,
      },
    });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/category/:categoryId", async (req, res, next) => {
  try {
    const product = await prisma.product.findMany({
      where: {
        categoryId: req.params.categoryId,
      },
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        reviews: {
          include: {
            user: { select: { username: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const reviewsCount = product.reviews.length;
    const avgRating =
      reviewsCount > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
        : 0;

    res.json({
      ...product,
      rating: Math.round(avgRating * 10) / 10,
      reviewsCount,
    });
  } catch (error) {
    next(error);
  }
});
// UPDATE PRODUCT
// 1. only admin can update a product
// 2. recompute status if stock is part of the update
router.put("/:id", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      unitPrice,
      originalPrice,
      stock,
      badge,
      homeFeature,
      imageUrl,
      images,
      categoryId,
    } = req.body;

    const data = {
      name,
      description,
      unitPrice,
      originalPrice,
      stock,
      badge,
      homeFeature,
      imageUrl,
      images,
      categoryId,
    };

    if (stock !== undefined) {
      data.status = stock > 0 ? "ACTIVE" : "OUT_OF_STOCK";
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE PRODUCT
// 1. only admin can delete a product
router.delete(
  "/:id",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Product deleted",
        product,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

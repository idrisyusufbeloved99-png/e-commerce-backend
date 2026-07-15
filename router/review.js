import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";

const router = express.Router();

// GET ALL REVIEWS FOR A PRODUCT
router.get("/product/:productId", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      include: {
        user: {
          select: { username: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// CREATE REVIEW
// 1. must be logged in
// 2. one review per user per product (enforced by schema's @@unique)
router.post("/", [loginRequired], async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const review = await prisma.review.create({
      data: {
        userId: req.user.userId,
        productId: productId,
        rating: rating,
        comment: comment,
      },
      include: {
        user: {
          select: { username: true, avatar: true },
        },
      },
    });

    res.json(review);
  } catch (error) {
    // P2002 = unique constraint violation, meaning this user already reviewed this product
    if (error.code === "P2002") {
      return res.status(400).json({ error: "You already reviewed this product" });
    }
    next(error);
  }
});

// UPDATE REVIEW
// 1. only the review's owner can edit it
router.put("/:id", [loginRequired], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const existingReview = await prisma.review.findUnique({ where: { id } });

    if (!existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (existingReview.userId !== req.user.userId) {
      return res.status(403).json({ error: "You can only edit your own review" });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { rating, comment },
    });

    res.json(review);
  } catch (error) {
    next(error);
  }
});

// DELETE REVIEW
// 1. owner of the review OR an admin can delete it
router.delete("/:id", [loginRequired], async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingReview = await prisma.review.findUnique({ where: { id } });

    if (!existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    const requester = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (existingReview.userId !== req.user.userId && requester.role !== "ADMIN") {
      return res.status(403).json({ error: "You can only delete your own review" });
    }

    await prisma.review.delete({ where: { id } });

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
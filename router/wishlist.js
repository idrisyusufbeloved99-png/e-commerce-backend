import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";

const router = express.Router();

// GET MY WISHLIST
router.get("/", [loginRequired], async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.userId },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(wishlist);
  } catch (error) {
    next(error);
  }
});

// ADD TO WISHLIST
router.post("/", [loginRequired], async (req, res, next) => {
  try {
    const { productId } = req.body;

    const item = await prisma.wishlist.create({
      data: {
        userId: req.user.userId,
        productId: productId,
      },
      include: {
        product: true,
      },
    });

    res.json(item);
  } catch (error) {
    // P2002 = already in wishlist (unique constraint)
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Already in your wishlist" });
    }
    next(error);
  }
});

// REMOVE FROM WISHLIST
router.delete("/:productId", [loginRequired], async (req, res, next) => {
  try {
    const { productId } = req.params;

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: req.user.userId,
          productId: productId,
        },
      },
    });

    res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
});

export default router;
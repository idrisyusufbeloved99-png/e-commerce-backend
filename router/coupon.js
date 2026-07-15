import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";

const router = express.Router();

// VALIDATE COUPON — any logged in user
router.post("/validate", [loginRequired], async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid coupon code" });
    }
    if (!coupon.active) {
      return res.status(400).json({ error: "This coupon is no longer active" });
    }
    if (coupon.usedCount >= coupon.maxUses) {
      return res
        .status(400)
        .json({ error: "This coupon has reached its usage limit" });
    }
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({ error: "This coupon has expired" });
    }
    if (coupon.startDate && new Date() < new Date(coupon.startDate)) {
      return res.status(400).json({ error: "This coupon is not active yet" });
    }
    if (coupon.minOrderSubtotal && subtotal < Number(coupon.minOrderSubtotal)) {
      return res.status(400).json({
        error: `Minimum order of ₦${Number(coupon.minOrderSubtotal).toLocaleString()} required`,
      });
    }

    // check if this specific user has already used this coupon ::::::::::::::::
    const alreadyUsed = await prisma.couponUsage.findUnique({
      where: {
        couponId_userId: {
          couponId: coupon.id,
          userId: req.user.userId,
        },
      },
    });

    if (alreadyUsed) {
      return res
        .status(400)
        .json({ error: "You have already used this coupon" });
    }

    // calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
    } else if (coupon.discountType === "FIXED_AMOUNT") {
      discountAmount = Math.min(Number(coupon.discountValue), subtotal);
    } else if (coupon.discountType === "FREE_SHIPPING") {
      discountAmount = 0;
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      message:
        coupon.discountType === "PERCENTAGE"
          ? `${coupon.discountValue}% discount applied!`
          : coupon.discountType === "FIXED_AMOUNT"
            ? `₦${Number(coupon.discountValue).toLocaleString()} off applied!`
            : "Free shipping applied!",
    });
  } catch (error) {
    next(error);
  }
});

// USE COUPON — increment usedCount after successful payment
router.patch("/use", [loginRequired], async (req, res, next) => {
  try {
    const { code } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // record this user's usage + increment global count in one transaction ::::
    await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId: req.user.userId,
        },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    // P2002 = unique constraint — user already used this coupon
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "You have already used this coupon" });
    }
    next(error);
  }
});

// GET ALL COUPONS — admin only
router.get("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
});

// CREATE COUPON — admin only
router.post("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderSubtotal,
      maxUses,
      startDate,
      expiresAt,
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderSubtotal: minOrderSubtotal
          ? parseFloat(minOrderSubtotal)
          : null,
        maxUses: parseInt(maxUses) || 1,
        startDate: startDate ? new Date(startDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.json(coupon);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Coupon code already exists" });
    }
    next(error);
  }
});

// TOGGLE ACTIVE — admin only
router.patch(
  "/:id/toggle",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const coupon = await prisma.coupon.findUnique({ where: { id } });
      const updated = await prisma.coupon.update({
        where: { id },
        data: { active: !coupon.active },
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE COUPON — admin only
router.delete(
  "/:id",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await prisma.coupon.delete({ where: { id } });
      res.json({ success: true, message: "Coupon deleted" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

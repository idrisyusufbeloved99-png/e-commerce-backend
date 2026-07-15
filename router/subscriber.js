import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";

const router = express.Router();

// SUBSCRIBE — public
router.post("/", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email?.trim() || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const existing = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ error: "This email is already subscribed" });
    }

    const subscriber = await prisma.subscriber.create({
      data: { email: email.toLowerCase().trim() },
    });

    res.json({
      success: true,
      message: "You're subscribed! 🎉",
      subscriber,
    });
  } catch (error) {
    next(error);
  }
});

// GET ALL SUBSCRIBERS — admin only
router.get("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(subscribers);
  } catch (error) {
    next(error);
  }
});

// DELETE SUBSCRIBER — admin only
router.delete("/:id", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.subscriber.delete({ where: { id } });
    res.json({ success: true, message: "Subscriber removed" });
  } catch (error) {
    next(error);
  }
});

export default router;
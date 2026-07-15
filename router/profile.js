import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findMany({});

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.get("/getProfile/:userId", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: {
        userId: req.params.userId,
      },
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.post("/createProfile", [loginRequired], async (req, res, next) => {
  try {
    const { fullName, address, phoneNumber, city, state } = req.body;

    const profile = await prisma.profile.create({
      data: {
        fullName: fullName,
        address: address,
        phoneNumber: phoneNumber,
        city: city,
        state: state,
        userId: req.user.userId,
      },
    });
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// UPDATE PROFILE
// 1. only the owner of the profile can update it
router.put("/:userId", [loginRequired], async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { fullName, address, phoneNumber, city, state } = req.body;

    if (req.user.userId !== userId) {
      return res.status(403).json({ error: "You can only update your own profile" });
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: { fullName, address, phoneNumber, city, state },
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// DELETE PROFILE
// 1. only the owner of the profile can delete it
router.delete("/:userId", [loginRequired], async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own profile" });
    }

    await prisma.profile.delete({ where: { userId } });

    res.json({ success: true, message: "Profile deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
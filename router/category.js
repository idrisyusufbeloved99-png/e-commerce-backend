import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany();

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

router.post("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { name, slug, emoji } = req.body;
    const category = await prisma.category.create({
      data: {
        name: name,
        slug: slug,
        emoji: emoji,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        emoji: true,
      },
    });
    res.json(category);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: {
        id: req.params.id,
      },
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// UPDATE CATEGORY
router.put("/:id", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, emoji } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name, slug, emoji },
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// DELETE CATEGORY
router.delete("/:id", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Category deleted",
      category,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
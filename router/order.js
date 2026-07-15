import express from "express";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";

const router = express.Router();

// CREATE ORDER
// 1. user must be logged in
// 2. items come from the frontend cart [{ productId, quantity, price }]
// 3. compute shipping + tax + total on the server, not trusting the client
router.post("/", [loginRequired], async (req, res, next) => {
  try {
    const { items, fullName, email, phoneNumber, address, city, state } =
      req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = subtotal * 0.075;
    const total = subtotal + shipping + tax;

    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        total,
        shipping,
        tax,
        fullName,
        email,
        phoneNumber,
        address,
        city,
        state,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // ✅ decrement stock for each purchased product
    await Promise.all(
      items.map(async (item) => {
        const updated = await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        // auto mark OUT_OF_STOCK if stock hits 0
        if (updated.stock <= 0) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { status: "OUT_OF_STOCK", stock: 0 },
          });
        }
      }),
    );

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// GET MY ORDERS — for OrderPage
router.get("/my-orders", [loginRequired], async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET ALL ORDERS — admin only, for AdminOrderPage
        router.get("/", [loginRequired, adminRequired], async (req, res, next) => {
          try {
            const orders = await prisma.order.findMany({
              include: {
                items: {
                  include: { product: true },
                },
                user: {
                  select: { username: true, email: true },
                },
              },
              orderBy: { createdAt: "desc" },
            });

            res.json(orders);
          } catch (error) {
            next(error);
          }
        });

// GET SINGLE ORDER
// 1. owner of the order OR an admin can view it
// GET /api/v1/orders/:id
router.get("/:id", [loginRequired], async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            profile: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const requester = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (order.userId !== req.user.userId && requester.role !== "ADMIN") {
      return res.status(403).json({ error: "You can only view your own orders" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// UPDATE ORDER STATUS — admin only, for AdminOrderPage
router.patch(
  "/:id/status",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // "PROCESSING" | "SHIPPING" | "DELIVERED" | "CANCELLED"

      const order = await prisma.order.update({
        where: { id },
        data: { status },
      });

      res.json(order);
    } catch (error) {
      next(error);
    }
  },
);

export default router;

import express from "express";
import argon2 from "argon2";
import prisma from "../utilities/prismaClient.js";
import loginRequired from "../middlewares/loginRequired.js";
import adminRequired from "../middlewares/adminRequired.js";

const router = express.Router();

// GET users — admin only, for AdminUsersPage
router.get("/", [loginRequired, adminRequired], async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const where = {};

    if (role && role !== "all") where.role = role.toUpperCase();
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        orders: {
          select: { total: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // compute ordersCount and totalSpent ::::::::::::::::::::::::
    const formatted = users.map((u) => {
      const { orders, ...rest } = u;
      return {
        ...rest,
        ordersCount: orders.length,
        totalSpent: parseFloat(
          orders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2),
        ),
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});
// GET /api/v1/users — admin only
export async function getUsers(req, res, next) {
  try {
    const { role, search } = req.query;
    const where = {};

    if (role && role !== "all") where.role = role.toUpperCase();
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        // ✅ include orders with total so we can compute spent
        orders: {
          select: { total: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // compute ordersCount and totalSpent ::::::::::::::::::::::::::::
    const formatted = users.map((u) => ({
      ...u,
      ordersCount: u.orders.length,
      totalSpent: u.orders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: undefined, // strip raw orders array from response
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
}

// SING UP - POST
// 1. check if username, email,password are supplied
// 2. check if username/email is already register
router.post("/", async (req, res, next) => {
  try {
    const { username, password, email, avatar } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // check not an empty variables  ::::::::::::::::::::::::::
    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        error: "username/password required",
      });
    }

    // to check if username/email is already register ::::::::::::::::::::::::::
    if (user) {
      return res.status(400).json({
        error: "Email/Username taken",
      });
    }

    // HASH PASSWORD    ::::::::::::::::::::::::::

    const hashPwd = await argon2.hash(password);

    // CREATING A NEW USER    ::::::::::::::::::::::::::

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashPwd,
        avatar,
      },
      select: {
        username: true,
        createdAt: true,
      },
    });

    res.json({
      message: "Account created successfully",
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
});

// GET user/me
router.get("/me", [loginRequired], async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        profile: true,
        orders: {
          include: {
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // compute stats ::::::::::::::::::::::::::::::::::::::::::::::::
    const ordersCount = user.orders.length;
    const totalSpent  = user.orders.reduce((sum, o) => sum + Number(o.total), 0);

    res.json({ ...user, ordersCount, totalSpent });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", [loginRequired], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, password, avatar } = req.body;

    // only allow a user to edit themselves, unless they are an admin :::::::::
    const requester = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (req.user.userId !== id && requester.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "You can only update your own account" });
    }

    const data = { username, email, avatar };

    // only re-hash if a new password was actually supplied :::::::::::::::::::
    if (password) {
      data.password = await argon2.hash(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:id",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.delete({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

// BAN / UNBAN USER — admin only, for AdminUsersPage
router.patch(
  "/:id/status",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // "ACTIVE" | "BANNED"

      const user = await prisma.user.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

// CHANGE ROLE — admin only, for AdminUsersPage
router.patch(
  "/:id/role",
  [loginRequired, adminRequired],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body; // "ADMIN" | "CUSTOMER"

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

export default router;

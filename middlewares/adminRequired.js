import prisma from "../utilities/prismaClient.js";

const adminRequired = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "Authentication Required or token invalid" });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default adminRequired;
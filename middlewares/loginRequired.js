import jwt from "jsonwebtoken";
import prisma from "../utilities/prismaClient.js";

const loginRequired = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication Required or token invalid" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // check if user is still active in DB ::::::::::::::::::::::::::::
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true },
    });

    if (!user || user.status === "BANNED") {
      return res.status(403).json({ error: "Your account has been banned" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default loginRequired;
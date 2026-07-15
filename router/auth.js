import express from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import prisma from "../utilities/prismaClient.js";
import error from "../middlewares/error.js";

const router = express.Router();

// LOG IN
// 1. check if email is register
// 2. check if password is correct
// 3. generate a jwt token and pass it into the res header
router.post("/", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userPresent = await prisma.user.findUnique({
      where: {
        email
      },
    });

    if (!userPresent) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

      // check if password is correct correct :::::::::::::::::::::::::::::
    const isMatch = await argon2.verify(userPresent.password, password)
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }
   

    //
    const payload = {
      userId: userPresent.id,
      email: userPresent.email,
      username: userPresent.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // add the token response header as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "login successful",
      access_token: token,
      user: {
        id: userPresent.id,
        username: userPresent.username,
        email: userPresent.email,
      },
    });

  
  } catch (error) {
    next(error);
  }
});

// LOG OUT
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  })
  res.json({message:"Logged out successfully"})
});

// RESET PASSWORD
// 1. check if user with this email exists
// 2. hash the new password
// 3. update the user record
router.patch("/reset-password", async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const hashedPassword = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
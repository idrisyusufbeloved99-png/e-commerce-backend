import express from "express";
// import { config } from "dotenv";
// config();
// import cors from "cors";
// import users from "./router/user.js";
// import products from "./router/product.js";
// import categories from "./router/category.js";
// import profiles from "./router/profile.js";
// import auth from "./router/auth.js";
// import orders from "./router/order.js";
// import reviews from "./router/review.js";
// import cookieParser from "cookie-parser";
// import error from "./middlewares/error.js";
// import wishlist from "./router/wishlist.js";
// import coupons from "./router/coupon.js";
// import subscribers from "./router/subscriber.js";

const app = express();


// app.use(cors({
//   origin: [
//     process.env.CLIENT_URL,
//     "https://e-commerce-frontend-teal-nine.vercel.app",
//   ],
//   credentials: true,
// }));
// app.use(cookieParser());
// app.use(express.json());

// app.use("/api/v1/users", users);
// app.use("/api/v1/products", products);
// app.use("/api/v1/categories", categories);
// app.use("/api/v1/profile", profiles);
// app.use("/api/v1/auth", auth);
// app.use("/api/v1/orders", orders);
// app.use("/api/v1/reviews", reviews);
// app.use("/api/v1/wishlist", wishlist);
// app.use("/api/v1/coupons", coupons);
// app.use("/api/v1/subscribers", subscribers);



app.get("/", async (req, res, next) => {
  res.send("GET request received for /");
});

// app.use(error);

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});

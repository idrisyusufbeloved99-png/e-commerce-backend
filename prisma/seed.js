import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // CREATE CATEGORIES ::::::::::::::::::::::::::::::::::::::::::::::::::::
  const fashion = await prisma.category.upsert({
    where: { slug: "fashion" },
    update: {},
    create: { name: "Fashion", slug: "fashion", emoji: "👗" },
  });

  const gadgets = await prisma.category.upsert({
    where: { slug: "gadgets" },
    update: {},
    create: { name: "Gadgets", slug: "gadgets", emoji: "📱" },
  });

  const kitchenware = await prisma.category.upsert({
    where: { slug: "kitchenware" },
    update: {},
    create: { name: "Kitchenware", slug: "kitchenware", emoji: "🍳" },
  });

  const beauty = await prisma.category.upsert({
    where: { slug: "beauty" },
    update: {},
    create: { name: "Beauty", slug: "beauty", emoji: "✨" },
  });

  // CREATE PRODUCTS — upsert by name so no duplicates :::::::::::::::::::
  const products = [
    {
      name: "Wireless Earbuds Pro",
      description: "Premium sound quality with active noise cancellation, 30hr battery life, and IPX5 water resistance.",
      unitPrice: 49999,
      originalPrice: 79999,
      stock: 45,
      badge: "Sale",
      homeFeature: true,
      hot: false,
      categoryId: gadgets.id,
    },
    {
      name: "Linen Summer Dress",
      description: "Lightweight breathable linen fabric perfect for warm weather. Relaxed fit with side pockets.",
      unitPrice: 34999,
      originalPrice: null,
      stock: 12,
      badge: "New",
      homeFeature: true,
      hot: false,
      categoryId: fashion.id,
    },
    {
      name: "Cast Iron Skillet",
      description: "Pre-seasoned cast iron skillet compatible with all stovetops including induction.",
      unitPrice: 29999,
      originalPrice: null,
      stock: 0,
      badge: null,
      homeFeature: false,
      hot: false,
      categoryId: kitchenware.id,
    },
    {
      name: "Smart Watch Series 5",
      description: "Track your health 24/7 with heart rate, SpO2, sleep monitoring. GPS, 5ATM waterproof.",
      unitPrice: 129999,
      originalPrice: 159999,
      stock: 8,
      badge: "Sale",
      homeFeature: true,
      hot: true,
      categoryId: gadgets.id,
    },
    {
      name: "Leather Crossbody Bag",
      description: "Premium genuine leather crossbody bag with adjustable strap and multiple compartments.",
      unitPrice: 59999,
      originalPrice: null,
      stock: 20,
      badge: null,
      homeFeature: false,
      hot: false,
      categoryId: fashion.id,
    },
    {
      name: "Air Fryer XL",
      description: "6.5L capacity air fryer with digital display. Cook crispy food with 80% less oil.",
      unitPrice: 89999,
      originalPrice: 119999,
      stock: 15,
      badge: "Sale",
      homeFeature: false,
      hot: false,
      categoryId: kitchenware.id,
    },
    {
      name: "Moisturizing Face Cream",
      description: "Dermatologist-tested deep moisturizing face cream suitable for all skin types.",
      unitPrice: 24999,
      originalPrice: null,
      stock: 30,
      badge: "New",
      homeFeature: true,
      hot: false,
      categoryId: beauty.id,
    },
    {
      name: "Bluetooth Speaker",
      description: "360° surround sound with 24hr battery life. Waterproof and dustproof IPX7 rated.",
      unitPrice: 39999,
      originalPrice: 59999,
      stock: 25,
      badge: "Sale",
      homeFeature: false,
      hot: true,
      categoryId: gadgets.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {
        description:   p.description,
        unitPrice:     p.unitPrice,
        originalPrice: p.originalPrice,
        stock:         p.stock,
        status:        p.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        badge:         p.badge,
        homeFeature:   p.homeFeature,
        categoryId:    p.categoryId,
      },
      create: {
        ...p,
        status: p.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
      },
    });
  }

  // CREATE ADMIN USER ::::::::::::::::::::::::::::::::::::::::::::::::::::
  const hashedPassword = await argon2.hash("admin123");
  await prisma.user.upsert({
    where: { email: "admin@mystore.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@mystore.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Seeding complete!");
  console.log("Admin login -> email: admin@mystore.com | password: admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
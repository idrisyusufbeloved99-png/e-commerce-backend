import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const connectToDatabase = async () => {
  const connected = await prisma.$connect;

  if (!connected) {
    console.error("db is down ❌");
  } else {
    console.log("successfully connected to the db ✅");
  }
};

connectToDatabase();

export default prisma;

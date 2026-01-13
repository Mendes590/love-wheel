import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;

if (!secret) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(secret, {
  apiVersion: "2025-12-15.clover",
});

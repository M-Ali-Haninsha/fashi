const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a valid id");
const email = z.string().trim().toLowerCase().email("must be a valid email");
const text = (max) => z.string().trim().min(1, "is required").max(max);
const optionalText = (max) => z.string().trim().max(max).optional().default("");
const password = z.string().min(6, "must be at least 6 characters").max(100);
const money = z.coerce.number({ error: "must be a number" }).min(0);
const date = z.coerce.date({ error: "must be a valid date" });

const withId = z.object({ id: objectId });

const signup = z.object({
  username: text(50),
  email,
  phone: z.string().trim().regex(/^\d{10}$/, "must be a 10-digit number"),
  password,
});

const otp = z.object({ otp: z.string().trim().regex(/^\d{6}$/, "must be 6 digits") });

const login = z.object({ Email: email, pass: z.string().min(1, "is required") });
const adminLogin = z.object({ adminEmail: email, adminPassword: z.string().min(1, "is required") });

const forgotPassword = z.object({ fEmail: email });
const resetPassword = z.object({ token: z.string().min(1), password });

const address = z.object({
  firstname: text(50),
  lastname: text(50),
  address: text(200),
  country: text(50),
  postcode: z.coerce.number({ error: "must be a number" }).int().positive(),
  district: text(50),
  city: text(50),
  email,
  phone: z.coerce.number({ error: "must be a number" }).int().positive(),
});
const addressWithId = address.extend({ id: objectId });

const checkout = z.object({
  firstname: text(50),
  lastname: text(50),
  address: text(200),
  country: text(50),
  city: text(50),
  district: text(50),
  pincode: z.coerce.number({ error: "must be a number" }).int().positive(),
  phone: z.coerce.number({ error: "must be a number" }).int().positive(),
  mail: email,
  // "paypal" is what the checkout page has always sent for online payment.
  payment: z.enum(["cod", "wallet", "paypal", "online"], { error: "Please choose a payment method" }),
});

const verifyPayment = z
  .object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  })
  .transform((b) => ({
    orderId: b.razorpay_order_id,
    paymentId: b.razorpay_payment_id,
    signature: b.razorpay_signature,
  }));

const couponCode = z.object({ couponCode: text(50) });
const cartQuantity = z.object({ id: objectId, quantity: z.coerce.number().int().min(1).max(99) });

const shop = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(""),
  categoryId: objectId.optional().catch(undefined),
  minPrice: z.coerce.number().min(0).catch(0),
  maxPrice: z.coerce.number().min(0).catch(Number.MAX_SAFE_INTEGER),
  sortValue: z.coerce.number().refine((v) => v === 1 || v === -1).catch(1),
});

const dashboard = z.object({
  from: date.optional().catch(undefined),
  to: date.optional().catch(undefined),
});

const product = z.object({
  pName: text(100),
  pQuantity: z.coerce.number().int().min(0),
  pPrice: money,
  description: optionalText(2000),
});
const newProduct = product.extend({ category: text(50) });
const editProduct = product.extend({ pCategory: text(50) });
const removeImage = z.object({ productId: objectId, imageName: z.string().min(1) });

const category = z.object({ name: text(50) });
const renameCategory = category.extend({ id: objectId });

const coupon = z.object({
  couponname: text(50),
  couponcode: z.string().trim().min(3).max(30),
  discountvalue: money.positive(),
  minpurchase: money,
  startingdate: date,
  expiredate: date,
});

// The add and edit banner forms use different field names.
const newBanner = z
  .object({ span: optionalText(100), mainBannerMainHeading: text(100), paragraph: optionalText(300) })
  .transform((b) => ({ span1: b.span, mainH1: b.mainBannerMainHeading, mainP: b.paragraph }));
const editBanner = z
  .object({ subheading: optionalText(100), MainH: text(100), para: optionalText(300), dir: optionalText(50) })
  .transform((b) => ({ span1: b.subheading, mainH1: b.MainH, mainP: b.para, direction: b.dir }));

module.exports = {
  objectId,
  withId,
  signup,
  otp,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  address,
  addressWithId,
  checkout,
  verifyPayment,
  couponCode,
  cartQuantity,
  shop,
  dashboard,
  newProduct,
  editProduct,
  removeImage,
  category,
  renameCategory,
  coupon,
  newBanner,
  editBanner,
};

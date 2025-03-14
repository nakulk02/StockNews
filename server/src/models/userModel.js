import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const stockDetailSchema = new mongoose.Schema({
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    icon: { type: String },
    news: { type: [String] }
}, { timestamps: true });


export const User = mongoose.model("User", userSchema);
export const StockDetail = mongoose.model("StockDetail", stockDetailSchema);

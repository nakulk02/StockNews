import jwt from "jsonwebtoken";

export const generateToken = (user)=>{
    return jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,   
        { expiresIn: "1h" }
    );
}


export const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied" });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token" });
    }
};

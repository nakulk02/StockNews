import express from "express";
import { 
    startup,
    getUsers, 
    addUser, 
    fetchStockList, 
    fetchStockInfo, 
    login 
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export const router = express.Router();

router.get("/",startup);
router.post("/login",login);
router.post("/add_user",authMiddleware,addUser);
router.get("/users",authMiddleware, getUsers);
router.get("/stock_info/:stock",fetchStockInfo);
router.post("/stock_list",authMiddleware,fetchStockList);
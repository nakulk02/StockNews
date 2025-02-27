const express = require("express");
const { getUsers,getGroqResponse,addUser,fetchStockList,fetchStockInfo,login} = require("../controllers/userController");
const {authMiddleware} = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/",login);
router.post("/add_user",authMiddleware,addUser);
router.get("/users",authMiddleware, getUsers);
router.post('/compare',authMiddleware,getGroqResponse);
router.post("/stock_info",authMiddleware,fetchStockInfo);
router.post("/stock_list",authMiddleware,fetchStockList);
module.exports = router;
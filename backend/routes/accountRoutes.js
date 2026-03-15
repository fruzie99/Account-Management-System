const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getDashboard,
  getBalance,
  getStatement,
  transferMoney,
} = require("../controllers/accountController");

const router = express.Router();

router.use(authMiddleware);
router.get("/dashboard", getDashboard);
router.get("/balance", getBalance);
router.get("/statement", getStatement);
router.post("/transfer", transferMoney);

module.exports = router;
// src/routes/orderRoutes.js
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { bulkOrderSchema, orderSchema } = require('../validators/orderValidator');
const {
  listOrders,
  getOrdersByCustomer,
  createOrder,
  bulkCreateOrders,
} = require('../controllers/orderController');

const router = Router();

router.get('/', listOrders);
router.get('/customer/:customerId', getOrdersByCustomer);
router.post('/', validate(orderSchema), createOrder);
router.post('/bulk', validate(bulkOrderSchema), bulkCreateOrders);

module.exports = router;

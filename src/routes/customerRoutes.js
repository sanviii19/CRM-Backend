// src/routes/customerRoutes.js
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { bulkCustomerSchema, customerSchema } = require('../validators/customerValidator');
const {
  listCustomers,
  getCustomer,
  createCustomer,
  bulkCreateCustomers,
} = require('../controllers/customerController');

const router = Router();

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', validate(customerSchema), createCustomer);
router.post('/bulk', validate(bulkCustomerSchema), bulkCreateCustomers);

module.exports = router;

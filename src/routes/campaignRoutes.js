// src/routes/campaignRoutes.js
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { campaignSchema } = require('../validators/campaignValidator');
const {
  createCampaign,
  listCampaigns,
  getCampaign,
  getCampaignMessages,
} = require('../controllers/campaignController');

const router = Router();

router.post('/', validate(campaignSchema), createCampaign);
router.get('/', listCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/messages', getCampaignMessages);

module.exports = router;

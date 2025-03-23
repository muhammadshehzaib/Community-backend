const express = require('express');
const groupMilestoneController = require('../controllers/groupMilestoneController');
const authMiddleware = require('../middleware/validate.middleware');
const router = express.Router();

// Protect all group milestone routes with authMiddleware
router.use(authMiddleware);

// Group milestone routes
router.post('/group-milestones', groupMilestoneController.createGroupMilestone);
router.put('/group-milestones/:milestoneId', groupMilestoneController.updateGroupMilestone);
router.delete('/group-milestones/:milestoneId', groupMilestoneController.deleteGroupMilestone);
router.get('/group-milestones/:groupId', groupMilestoneController.getGroupMilestones);

module.exports = router;
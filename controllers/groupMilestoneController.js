const GroupMilestone = require('../models/groupMilestoneModel');
const Room = require('../models/roomModel');
const notificationService = require('../services/notificationService');

// Timeout tracking for group milestones
const groupMilestoneTimeouts = new Map();

const setGroupCompletionTimeout = (milestone) => {
    const timeoutKey = `group-${milestone._id}`;

    // Clear existing timeout
    if (groupMilestoneTimeouts.has(timeoutKey)) {
        clearTimeout(groupMilestoneTimeouts.get(timeoutKey));
    }

    const timeRemaining = milestone.end - Date.now();
    if (timeRemaining > 0) {
        const timeoutId = setTimeout(() => handleGroupCompletion(milestone), timeRemaining);
        groupMilestoneTimeouts.set(timeoutKey, timeoutId);
    }
};

const handleGroupCompletion = async (milestone) => {
    try {
        milestone.status = 'Completed';
        await milestone.save();

        await notificationService.createGroupNotification({
            groupId: milestone.group,
            senderId: milestone.createdBy,
            type: notificationService.notificationTypes.GROUP_MILESTONE_COMPLETED,
            metadata: {
                milestoneId: milestone._id,
                title: milestone.title
            }
        });

        groupMilestoneTimeouts.delete(`group-${milestone._id}`);
    } catch (error) {
        console.error('Group completion error:', error);
    }
};

// Create group milestone
const createGroupMilestone = async (req, res) => {
    try {
        const { title, start, end, description, category, groupId } = req.body;
        const userId = req.user;
        console.log(userId, 'userId');

        // Verify user is group admin (optional)
        const group = await Room.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const milestone = new GroupMilestone({
            title,
            start,
            end,
            description,
            category,
            group: groupId,
            createdBy: userId
        });

        await milestone.save();
        setGroupCompletionTimeout(milestone);

        // // Notify all group members
        // await notificationService.createGroupNotification({
        //     groupId,
        //     senderId: userId,
        //     type: notificationService.notificationTypes.GROUP_MILESTONE_CREATED,
        //     metadata: {
        //         milestoneId: milestone._id,
        //         title,
        //         description
        //     },
        //     read:'false'

        // });

        res.status(201).json(milestone);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update group milestone
const updateGroupMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.id;
        const userId = req.user._id;
        const updates = req.body;

        const milestone = await GroupMilestone.findOne({
            _id: milestoneId,
            createdBy: userId
        });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        Object.assign(milestone, updates);
        await milestone.save();
        setGroupCompletionTimeout(milestone);

        await notificationService.createGroupNotification({
            groupId: milestone.group,
            senderId: userId,
            type: notificationService.notificationTypes.GROUP_MILESTONE_UPDATED,
            metadata: {
                milestoneId: milestone._id,
                title: milestone.title,
                changes: Object.keys(updates)
            }
        });

        res.json(milestone);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete group milestone
const deleteGroupMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.id;
        const userId = req.user._id;

        const milestone = await GroupMilestone.findOneAndDelete({
            _id: milestoneId,
            createdBy: userId
        });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        // Clear timeout if exists
        const timeoutKey = `group-${milestoneId}`;
        if (groupMilestoneTimeouts.has(timeoutKey)) {
            clearTimeout(groupMilestoneTimeouts.get(timeoutKey));
            groupMilestoneTimeouts.delete(timeoutKey);
        }

        await notificationService.createGroupNotification({
            groupId: milestone.group,
            senderId: userId,
            type: notificationService.notificationTypes.GROUP_MILESTONE_DELETED,
            metadata: {
                milestoneTitle: milestone.title
            }
        });

        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all milestones for a group
const getGroupMilestones = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        console.log(groupId,'groupId');
        
        const milestones = await GroupMilestone.find({ group: groupId });
        res.json(milestones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGroupMilestone,
    updateGroupMilestone,
    deleteGroupMilestone,
    getGroupMilestones,
    handleGroupCompletion
};
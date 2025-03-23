const GroupMilestone = require('../models/groupMilestoneModel');
const Room = require('../models/roomModel');
const { sendEmail } = require('../utils/emailUtils');
const { completeMilestone } = require('../utils/milestoneUtils');

// Create a group milestone (only admin can create)
const createGroupMilestone = async (req, res) => {
    try {
        const { title, start, end, description, category, groupId } = req.body;
        const userId = req.user;

        // Check if the user is the admin of the group
        const group = await Room.findById(groupId);
        if (!group) {
            return res.status(404).send({ message: 'Group not found' });
        }
        // if (group.admin.toString() !== userId) {
        //     return res.status(403).send({ message: 'Only the group admin can create milestones' });
        // }

        // Create the group milestone
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

        // Set a timeout for milestone completion
        const timeRemaining = milestone.end - Date.now();
        if (timeRemaining > 0) {
            setTimeout(() => completeMilestone(milestone), timeRemaining);
        }

        // Broadcast the new milestone to all group members
        // req.io.to(groupId).emit('new-group-milestone', milestone);

        res.status(201).send(milestone);
    } catch (error) {
        res.status(400).send(error);
    }
};

// Update a group milestone (only admin can update)
const updateGroupMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.milestoneId;
        const userId = req.user;

        const milestone = await GroupMilestone.findById(milestoneId);

        if (!milestone) {
            return res.status(404).send({ message: 'Milestone not found' });
        }

        // Check if the user is the admin of the group
        const group = await Room.findById(milestone.group);
        // if (group.admin.toString() !== userId) {
        //     return res.status(403).send({ message: 'Only the group admin can update milestones' });
        // }

        // Update the milestone
        const updatedMilestone = await GroupMilestone.findByIdAndUpdate(milestoneId, req.body, {
            new: true,
            runValidators: true
        });

        // Broadcast the updated milestone to all group members
        // req.io.to(milestone.group).emit('new-group-milestone', updatedMilestone);

        res.status(200).send(updatedMilestone);
    } catch (error) {
        res.status(400).send(error);
    }
};

// Delete a group milestone (only admin can delete)
const deleteGroupMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.milestoneId;
        const userId = req.user;

        const milestone = await GroupMilestone.findById(milestoneId);

        if (!milestone) {
            return res.status(404).send({ message: 'Milestone not found' });
        }

        // Check if the user is the admin of the group
        const group = await Room.findById(milestone.group);
        // if (group.admin.toString() !== userId) {
        //     return res.status(403).send({ message: 'Only the group admin can delete milestones' });
        // }

        // Delete the milestone
        await GroupMilestone.findByIdAndDelete(milestoneId);

        // Broadcast the deleted milestone to all group members
        // socket.io.to(milestone.group).emit('new-group-milestone', milestoneId);

        res.status(200).send({ message: 'Milestone deleted successfully', milestone });
    } catch (error) {
        res.status(500).send(error);
    }
};

// Get all milestones for a group (only group members can access)
const getGroupMilestones = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user;

        // Check if the user is a member of the group
        const group = await Room.findById(groupId);
        if (!group) {
            return res.status(404).send({ message: 'Group not found' });
        }
        if (!group.members.includes(userId)) {
            return res.status(403).send({ message: 'You are not a member of this group' });
        }

        // Fetch milestones for the group
        const milestones = await GroupMilestone.find({ group: groupId });
        res.status(200).send(milestones);
    } catch (error) {
        res.status(500).send(error);
    }
};

module.exports = {
    createGroupMilestone,
    updateGroupMilestone,
    deleteGroupMilestone,
    getGroupMilestones
};
const Milestone = require('../models/milestonModel');
const { completeMilestone } = require('../utils/milestoneUtils');

// Create a new milestone
const createMilestone = async (req, res) => {
    try {
        const { title, start, end, description, category } = req.body;
        const userId = req.user;

        const milestone = new Milestone({
            title,
            start,
            end,
            description,
            category,
            user: userId,
        });

        await milestone.save();

        // Set a timeout for milestone completion
        const timeRemaining = milestone.end - Date.now();
        if (timeRemaining > 0) {
            setTimeout(() => completeMilestone(milestone), timeRemaining);
        }

        res.status(201).send(milestone);
    } catch (error) {
        res.status(400).send(error);
    }
};

// Update a milestone by ID
const updateMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.milestoneId;
        const userId = req.user;

        const milestone = await Milestone.findById(milestoneId);

        if (!milestone) {
            return res.status(404).send({ message: 'Milestone not found' });
        }
        if (milestone.user.toString() !== userId) {
            return res.status(403).send({ message: 'You are not authorized to update this milestone' });
        }

        // Update the milestone
        const updatedMilestone = await Milestone.findByIdAndUpdate(milestoneId, req.body, {
            new: true,
            runValidators: true
        });

        // Set a timeout for milestone completion
        const timeRemaining = updatedMilestone.end - Date.now();
        if (timeRemaining > 0) {
            setTimeout(() => completeMilestone(updatedMilestone), timeRemaining);
        }

        res.status(200).send(updatedMilestone);
    } catch (error) {
        res.status(400).send(error);
    }
};

// Get all milestones for the authenticated user
const getUserMilestones = async (req, res) => {
    try {
        const milestones = await Milestone.find({ user: req.user });
        res.status(200).send(milestones);
    } catch (error) {
        res.status(500).send(error);
    }
};

// Get a single milestone by ID
const getMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.milestoneId;
        const userId = req.user;

        const milestone = await Milestone.findById(milestoneId);

        if (!milestone) {
            return res.status(404).send({ message: 'Milestone not found' });
        }
        if (milestone.user.toString() !== userId) {
            return res.status(403).send({ message: 'You are not authorized to access this milestone' });
        }

        res.status(200).send(milestone);
    } catch (error) {
        res.status(500).send(error);
    }
};

// Delete a milestone by ID
const deleteMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.milestoneId;
        const userId = req.user;

        const milestone = await Milestone.findById(milestoneId);

        if (!milestone) {
            return res.status(404).send({ message: 'Milestone not found' });
        }
        if (milestone.user.toString() !== userId) {
            return res.status(403).send({ message: 'You are not authorized to delete this milestone' });
        }

        await Milestone.findByIdAndDelete(milestoneId);
        res.status(200).send({ message: 'Milestone deleted successfully', milestone });
    } catch (error) {
        res.status(500).send(error);
    }
};

module.exports = {
    createMilestone,
    updateMilestone,
    getUserMilestones,
    getMilestone,
    deleteMilestone
};
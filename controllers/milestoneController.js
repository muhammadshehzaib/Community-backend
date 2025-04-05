const Milestone = require('../models/milestonModel');
const notificationService = require('../services/notificationService');

// Timeout tracking for auto-completion
const milestoneTimeouts = new Map();

const setCompletionTimeout = (milestone) => {
    // Clear existing timeout if any
    if (milestoneTimeouts.has(milestone._id.toString())) {
        clearTimeout(milestoneTimeouts.get(milestone._id.toString()));
    }

    const timeRemaining = milestone.end - Date.now();
    if (timeRemaining > 0) {
        const timeoutId = setTimeout(() => handleCompletion(milestone), timeRemaining);
        milestoneTimeouts.set(milestone._id.toString(), timeoutId);
    }
};

const handleCompletion = async (milestone) => {
    try {
        milestone.status = 'Completed';
        await milestone.save();

        milestoneTimeouts.delete(milestone._id.toString());
    } catch (error) {
        console.error('Completion handler error:', error);
    }
};

// Create personal milestone
const createMilestone = async (req, res) => {
    try {
        const { title, start, end, description, category } = req.body;
        const userId = req.user._id;

        const milestone = new Milestone({
            title,
            start,
            end,
            description,
            category,
            user: userId
        });

        await milestone.save();
        setCompletionTimeout(milestone);

        res.status(201).json(milestone);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update personal milestone
const updateMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.id;
        const userId = req.user._id;
        const updates = req.body;

        const milestone = await Milestone.findOne({
            _id: milestoneId,
            user: userId
        });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        Object.assign(milestone, updates);
        await milestone.save();
        setCompletionTimeout(milestone);


        res.json(milestone);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete personal milestone
const deleteMilestone = async (req, res) => {
    try {
        const milestoneId = req.params.id;
        const userId = req.user._id;

        const milestone = await Milestone.findOneAndDelete({
            _id: milestoneId,
            user: userId
        });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        // Clear timeout if exists
        if (milestoneTimeouts.has(milestoneId)) {
            clearTimeout(milestoneTimeouts.get(milestoneId));
            milestoneTimeouts.delete(milestoneId);
        }
        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all personal milestones
const getMilestones = async (req, res) => {
    try {
        console.log('Fetching milestones for user:');
        // if (!req.user || !req.user._id) {
        //     return res.status(401).json({ message: 'Unauthorized' });
        // }
        
        // const milestones = await Milestone.find({ user: req.user._id });
        res.json({milestones:"hello"});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getMilestones,
    handleCompletion
};
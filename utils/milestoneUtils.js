const Milestone = require('../models/milestonModel');
const { sendEmail } = require('./emailUtils');

// Function to handle milestone completion
const completeMilestone = async (milestone) => {
    try {
        // Update the milestone status to "Completed"
        milestone.status = 'Completed';
        await milestone.save();
        console.log(`Milestone "${milestone.title}" marked as completed`);

        // Send email notification for completed milestone
        await sendEmail(
            milestone.user.email,
            'Milestone Completed',
            `Your milestone "${milestone.title}" has been completed.`
        );
    } catch (error) {
        console.error('Error completing milestone:', error);
    }
};

module.exports = { completeMilestone };
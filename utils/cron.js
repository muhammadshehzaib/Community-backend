const Milestone = require("../models/milestonModel");

// Function to set timeouts for pending milestones on server start
const setTimeoutsForPendingMilestones = async () => {
    try {
        const pendingMilestones = await Milestone.find({
            end: { $gt: new Date() }, // Milestones that have not yet ended
            status: { $ne: 'Completed' } // Exclude completed milestones
        });

        for (const milestone of pendingMilestones) {
            const timeRemaining = milestone.end - Date.now();
            if (timeRemaining > 0) {
                setTimeout(() => completeMilestone(milestone), timeRemaining);
            }
        }

        console.log(`Timeouts set for ${pendingMilestones.length} pending milestones`);
    } catch (error) {
        console.error('Error setting timeouts for pending milestones:', error);
    }
};

// Call the function when the server starts
setTimeoutsForPendingMilestones();
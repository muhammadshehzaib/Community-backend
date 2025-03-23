const mongoose = require('mongoose');

const groupMilestoneSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room', // Reference to the existing Room model (group)
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    }
}, { timestamps: true });

const GroupMilestone = mongoose.model('GroupMilestone', groupMilestoneSchema);

module.exports = GroupMilestone;
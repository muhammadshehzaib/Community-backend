const messageModel = require("../models/messagesModel");
const roomModel = require("../models/roomModel");
const userModel = require("../models/userModel");
const v2 = require("../utils/cloudinaryConfig");
const { cloudinary_js_config } = require("../utils/cloudinaryConfig");
const { getIdFromToken, checkAuthenticity } = require("./userController");
const mongoose = require("mongoose");

// Function to get rooms with recent 10 messages
const getRoomsWithRecentMessages = async (userId, type) => {
  try {
    const rooms = await roomModel.aggregate([
      { $match: { type: type, members: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $lookup: {
          from: "messages",
          let: { roomId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$room", "$$roomId"] } } },
            { $sort: { timestamp: -1 } },
            { $limit: 10 },
          ],
          as: "recentMessages",
        },
      },
      {
        $addFields: {
          latestMessage: { $arrayElemAt: ["$recentMessages", 0] },
        },
      },
      { $sort: { "latestMessage.timestamp": -1 } },
      { $project: { latestMessage: 0 } },
    ]);

    return rooms;
  } catch (error) {
    console.error("Error fetching rooms with recent messages:", error);
  }
};

module.exports.createRoom = async (req, res) => {
  try {
    console.log(req.body);
    const authenticated = checkAuthenticity(req.header("Authorization"));
    const currentUserId = await getIdFromToken(req.header("Authorization"));
    if (
      req.body.type === "personal" &&
      req.body.members.includes(currentUserId)
    ) {
      console.log("Room creation with yourself is not allowed.");
      return res
        .status(200)
        .json({ message: "Room creation with yourself is not allowed" });
    }
    console.log([...req.body.members, currentUserId]);
    const roomExist = await roomModel.findOne({
      type: "personal",
      members: { $all: [...req.body.members, currentUserId] },
    });
    console.log(roomExist);

    if (roomExist) {
      console.log("personal room already exist of these members");
      console.log(roomExist);
      return res
        .status(200)
        .json({ message: "room already exist with these members" });
    }
    if (authenticated) {
      console.log("creating room");
      const newRoom = new roomModel({
        ...req.body,
        members: [...req.body.members, currentUserId],
      });
      newRoom.save();
      res.status(200).json({ room: newRoom });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

module.exports.getPersonalRooms = async (req, res) => {
  try {
    const userId = await getIdFromToken(req.header("Authorization"));
    const personalRooms = await getRoomsWithRecentMessages(userId, "personal");

    res.status(200).json(personalRooms);
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

// Group

module.exports.createGroup = async (req, res) => {
  try {
    const { name, members, goal } = req.body;
    console.log("Incoming members:", members);

    const currentUserId = await getIdFromToken(req.header("Authorization"));

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Validate and parse members
    const parsedMembers =
      typeof members === "string" ? JSON.parse(members) : members;
    const isValidMembers =
      Array.isArray(parsedMembers) &&
      parsedMembers.every((member) => mongoose.Types.ObjectId.isValid(member));

    if (!isValidMembers) {
      return res.status(400).json({ message: "Invalid member IDs" });
    }

    // Add current user to members if not already included
    if (!parsedMembers.includes(currentUserId)) {
      parsedMembers.push(currentUserId);
    }

    // Upload image if provided
    let imageUrl = null;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const upload = v2?.uploader?.upload_stream((error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        upload?.end(req?.file?.buffer);
      });
      imageUrl = result.secure_url;
    }

    // Create and save the group
    const newGroup = await roomModel.create({
      type: "group",
      name,
      goal,
      members: parsedMembers,
      admin: currentUserId,
      imageUrl,
    });

    res.status(200).json({ group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(400).json({ message: "Failed to create group" });
  }
};

module.exports.getAllMessagesForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1 } = req.query;
    const group = await roomModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group does not exist" });
    }

    const limit = 100;
    const skip = (page - 1) * limit;

    // Fetch messages for the specified group, sorted by timestamp in descending order
    const messages = await messageModel
      .find({ room: groupId })
      .sort({ timestamp: -1 }) // Latest messages first
      .skip(skip)
      .limit(limit);

    // Optionally reverse messages if you want oldest to newest within each page
    const sortedMessages = messages.reverse();

    res.status(200).json({
      messages: sortedMessages,
      currentPage: page,
      hasNextPage: messages.length === limit, // Check if there are more messages
    });
  } catch (error) {
    console.error("Error fetching messages for group:", error);
    res.status(400).json({ message: "Failed to fetch messages" });
  }
};

module.exports.getAllGroups = async (req, res) => {
  try {
    const allGroups = await roomModel.find({ type: "group" });
    res.status(200).json(allGroups);
  } catch (error) {
    console.error("Error fetching all groups:", error);
    res.status(400).json({ message: "Failed to fetch all groups" });
  }
};

module.exports.getJoinedGroups = async (req, res) => {
  try {
    const currentUserId = await getIdFromToken(req.header("Authorization"));
    const joinedGroups = await roomModel.find({
      type: "group",
      members: currentUserId,
    });
    res.status(200).json(joinedGroups);
  } catch (error) {
    console.error("Error fetching joined groups:", error);
    res.status(400).json({ message: "Failed to fetch joined groups" });
  }
};

module.exports.joinGroup = async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header is missing" });
    }

    const currentUserId = await getIdFromToken(authHeader);
    console.log("Current User ID:", currentUserId);

    if (!currentUserId) {
      return res.status(400).json({ message: "Invalid token or user ID not found" });
    }

    const { groupId } = req.body;
    console.log("Group ID:", groupId);

    if (!groupId) {
      return res.status(400).json({ message: "Group ID is missing" });
    }

    // Check if the group exists
    const group = await roomModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group does not exist" });
    }
    console.log('Group members:',group.members);
    // Check if the user is already a member
    if (group.members.includes(currentUserId)) {
      return res.status(400).json({ message: "You have already joined this group" });
    }

    // Debugging the update query
    console.log("Attempting to add user to group...");
    const updatedGroup = await roomModel.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: currentUserId } },
      { new: true } // Return the updated document
    );

    if (!updatedGroup) {
      console.error("Failed to update group members.");
      return res.status(500).json({ message: "Failed to update group members" });
    }

    console.log("Updated Group:", updatedGroup);

    res.status(200).json({ message: "Successfully joined the group", group: updatedGroup });
  } catch (error) {
    console.error("Error joining group:", error.message || error);
    res.status(500).json({ message: "Failed to join group" });
  }
};


module.exports.getSuggestedGroups = async (req, res) => {
  try {
    const userId = await getIdFromToken(req.header("Authorization"));

    // Ensure userId was retrieved and convert it to ObjectId
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch the user's personal goal from their profile
    console.log("Fetching user data for userId:", userId);
    const user = await userModel.findOne({ _id: userObjectId });
    console.log("Fetching user data for userId:", user);

    if (!user._id || !user.life_style_goals) {
      return res.status(400).json({
        message: "User goal not set or user not found.",
      });
    }

    // Find groups that match the user's goal
    const suggestedGroups = await roomModel
      .find({ type: "group", goal: user.life_style_goals })
      .select("name goal members createdAt");

    console.log("Suggested groups:", suggestedGroups);

    // Return suggested groups or a message if none are found
    if (!suggestedGroups.length) {
      return res.status(200).json([]);
    }

    res.status(200).json(suggestedGroups);
  } catch (error) {
    console.error("Error fetching suggested groups:", error);
    res.status(500).json({
      message: "Failed to fetch suggested groups.",
      error: error.message,
    });
  }
};

module.exports.editGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, goal, members } = req.body;
    const currentUserId = await getIdFromToken(req.header("Authorization"));

    // Check if the group exists
    const group = await roomModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group does not exist" });
    }

    // Check if the current user is the admin of the group
    if (group.admin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can edit the group" });
    }

    const updateFields = {
      ...(name && { name }),
      ...(goal && { goal }),
    };

    if (req.file) {
      if (group.imageUrl) {
        const publicId = group.imageUrl.split("/").pop().split(".")[0];
        await v2?.uploader?.destroy(publicId);
      }

      const result = await new Promise((resolve, reject) => {
        const upload = v2?.uploader?.upload_stream((error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        upload.end(req.file.buffer);
      });

      updateFields.imageUrl = result.secure_url;
    }

    const updatedGroup = await roomModel.findByIdAndUpdate(
      groupId,
      { $set: updateFields },
      { new: true }
    );

    let parsedMembers = members;
    if (typeof members === "string") {
      try {
        parsedMembers = JSON.parse(members);
      } catch (error) {
        return res.status(400).json({ message: "Invalid members format" });
      }
    }

    // Convert parsedMembers to ObjectId array with `new` keyword
    const memberIds = parsedMembers.map(
      (member) => new mongoose.Types.ObjectId(member)
    );

    if (memberIds.length) {
      const currentMembers = group.members.map((member) => member.toString());
      const newMembers = memberIds.filter(
        (member) => !currentMembers.includes(member.toString())
      );
      const membersToRemove = currentMembers.filter(
        (member) => !memberIds.map((id) => id.toString()).includes(member)
      );

      if (newMembers.length > 0) {
        await roomModel.findByIdAndUpdate(
          groupId,
          { $addToSet: { members: { $each: newMembers } } },
          { new: true }
        );
      }

      if (membersToRemove.length > 0) {
        await roomModel.findByIdAndUpdate(
          groupId,
          { $pull: { members: { $in: membersToRemove } } },
          { new: true }
        );
      }
    }

    res.status(200).json({ group: updatedGroup });
  } catch (error) {
    console.error("Error editing group:", error);
    res.status(400).json({ message: "Failed to edit group" });
  }
};

module.exports.getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    // Find the group by its ID
    const group = await roomModel
      .findById(groupId)
      .populate("members", "name email");
    if (!group) {
      return res.status(404).json({ message: "Group does not exist" });
    }

    res.status(200).json({ group });
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    res.status(400).json({ message: "Failed to fetch group by ID" });
  }
};

module.exports.addFriendsToGroup = async (req, res) => {
  try {
    const { groupId, friends } = req.body;
    await roomModel.findByIdAndUpdate(groupId, {
      $addToSet: { members: { $each: friends } },
    });
    res.status(200).json({ message: "Friends added to the group" });
  } catch (error) {
    console.error("Error adding friends:", error);
    res.status(400).json({ message: "Failed to add friends" });
  }
};

const express = require("express");
const roomController = require("../controllers/roomController");
const upload = require("../middleware/multer-config");
const router = express.Router()

router.post('/create-room', roomController.createRoom);
router.get('/personal-rooms', roomController.getPersonalRooms);
router.get('/joined-groups', roomController.getJoinedGroups);
// router.get('/search-groups', roomController.searchGroups);
router.get('/all-groups', roomController.getAllGroups);
router.get('/suggested-groups', roomController.getSuggestedGroups)
router.post('/create-group',upload.single('imageURL') ,roomController.createGroup)
router.post('/join-group', roomController.joinGroup)
router.get('/groups/:groupId/messages', roomController.getAllMessagesForGroup)
router.put("/groups/:groupId",upload.single('imageURL') ,roomController.editGroup);
router.get("/groups/:groupId", roomController.getGroupById);

module.exports = router
const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', adminController.getDashboard);

// Place moderation
router.get('/places', adminController.getPlacesForModeration);
router.patch('/places/:id/approve', adminController.approvePlace);
router.patch('/places/:id/reject', adminController.rejectPlace);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.updateUserRole);

module.exports = router;

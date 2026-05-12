const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', adminController.getDashboard);

// Place moderation
router.get('/places', adminController.getPlacesForModeration);
router.patch('/places/:id', adminController.updatePlace);
router.patch('/places/:id/approve', adminController.approvePlace);
router.patch('/places/:id/reject', adminController.rejectPlace);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users/:id/verify', adminController.verifyUser);
router.post('/users/:id/unverify', adminController.unverifyUser);

// Seed test data (for demo/testing)
router.post('/seed-test-messages', adminController.seedTestMessages);

// Cleanup all mock data (WARNING: Destructive!)
router.delete('/cleanup-all', adminController.cleanupAllData);

// Referral management
const referralController = require('../controllers/referralController');
router.get('/referrals', referralController.getAllReferrals);
router.patch('/referrals/:id/complete', referralController.adminCompleteReferral);

// Host application management
router.get('/host-applications', adminController.getHostApplications);
router.patch('/host-applications/:id/approve', adminController.approveHostApplication);
router.patch('/host-applications/:id/reject', adminController.rejectHostApplication);

module.exports = router;

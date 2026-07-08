const express = require('express');
const { authMiddleware, adminMiddleware, crmMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require auth at minimum
router.use(authMiddleware);

// Place moderation - accessible by admin OR employee
router.get('/places', crmMiddleware, adminController.getPlacesForModeration);
router.post('/places', crmMiddleware, adminController.createPlaceForUser);
router.patch('/places/:id', crmMiddleware, adminController.updatePlace);
router.patch('/places/:id/approve', crmMiddleware, adminController.approvePlace);
router.patch('/places/:id/reject', crmMiddleware, adminController.rejectPlace);
router.patch('/places/:id/visibility', crmMiddleware, adminController.setPlaceVisibility);

// Everything below is admin-only
router.use(adminMiddleware);

router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUserAsAdmin);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id', adminController.updateUser);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users/:id/send-password-reset', adminController.sendPasswordResetEmailAction);
router.post('/users/:id/verify', adminController.verifyUser);
router.post('/users/:id/unverify', adminController.unverifyUser);

// Seed test data (for demo/testing)
router.post('/seed-test-messages', adminController.seedTestMessages);

// Send a set of sample booking emails to a target address (for previewing templates)
router.post('/test-booking-emails', adminController.sendSampleBookingEmails);

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

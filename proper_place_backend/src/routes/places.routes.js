import express from 'express';
import { PlacesService } from '../services/places.service.js';
import { validatePlaceSubmission } from '../middleware/validation.js';

const router = express.Router();

// GET /places - Get all approved places
router.get('/', async (req, res) => {
  try {
    const places = await PlacesService.getApprovedPlaces();
    return res.status(200).json({
      message: 'Places retrieved successfully',
      places,
      count: places.length,
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    return res.status(500).json({
      message: 'Failed to fetch places',
    });
  }
});

// GET /places/bounds - Get places in bounding box
router.get('/bounds', async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;
    
    if (!minLat || !maxLat || !minLng || !maxLng) {
      return res.status(400).json({
        message: 'Missing bounding box parameters',
        errors: ['minLat, maxLat, minLng, maxLng are required'],
      });
    }

    const places = await PlacesService.getPlacesInBounds(
      parseFloat(minLat),
      parseFloat(maxLat),
      parseFloat(minLng),
      parseFloat(maxLng)
    );

    return res.status(200).json({
      message: 'Places retrieved successfully',
      places,
      count: places.length,
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    return res.status(500).json({
      message: 'Failed to fetch places',
    });
  }
});

// GET /places/:placeId - Get single place details
router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const place = await PlacesService.getPlaceById(placeId);
    
    return res.status(200).json({
      message: 'Place retrieved successfully',
      place,
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    if (error.message === 'Place not found') {
      return res.status(404).json({
        message: 'Place not found',
      });
    }
    return res.status(500).json({
      message: 'Failed to fetch place',
    });
  }
});

// POST /places - Submit new place (host only)
router.post('/', async (req, res) => {
  try {
    const { userId: hostId, role } = req.user || {};
    
    if (!hostId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const validation = validatePlaceSubmission(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const place = await PlacesService.submitPlace(hostId, req.body);

    return res.status(201).json({
      message: 'Place submitted successfully',
      place,
    });
  } catch (error) {
    console.error('Error submitting place:', error);
    return res.status(500).json({
      message: error.message || 'Failed to submit place',
    });
  }
});

// GET /places/host/my-places - Get host's places
router.get('/host/my-places', async (req, res) => {
  try {
    const { userId: hostId } = req.user || {};
    
    if (!hostId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const places = await PlacesService.getHostPlaces(hostId);

    return res.status(200).json({
      message: 'Places retrieved successfully',
      places,
      count: places.length,
    });
  } catch (error) {
    console.error('Error fetching host places:', error);
    return res.status(500).json({
      message: 'Failed to fetch places',
    });
  }
});

// GET /places/admin/pending - Get pending places (admin only)
router.get('/admin/pending', async (req, res) => {
  try {
    const { role } = req.user || {};
    
    if (role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required',
      });
    }

    const places = await PlacesService.getPendingPlaces();

    return res.status(200).json({
      message: 'Pending places retrieved successfully',
      places,
      count: places.length,
    });
  } catch (error) {
    console.error('Error fetching pending places:', error);
    return res.status(500).json({
      message: 'Failed to fetch pending places',
    });
  }
});

// POST /places/:placeId/approve - Approve place (admin only)
router.post('/:placeId/approve', async (req, res) => {
  try {
    const { userId: adminId, role } = req.user || {};
    const { placeId } = req.params;
    const { notes } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required',
      });
    }

    const place = await PlacesService.approvePlace(placeId, adminId, notes);

    return res.status(200).json({
      message: 'Place approved successfully',
      place,
    });
  } catch (error) {
    console.error('Error approving place:', error);
    if (error.message === 'Place not found') {
      return res.status(404).json({
        message: 'Place not found',
      });
    }
    return res.status(500).json({
      message: 'Failed to approve place',
    });
  }
});

// POST /places/:placeId/reject - Reject place (admin only)
router.post('/:placeId/reject', async (req, res) => {
  try {
    const { userId: adminId, role } = req.user || {};
    const { placeId } = req.params;
    const { reason } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required',
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: 'Rejection reason required',
        errors: ['reason field is required'],
      });
    }

    const place = await PlacesService.rejectPlace(placeId, adminId, reason);

    return res.status(200).json({
      message: 'Place rejected successfully',
      place,
    });
  } catch (error) {
    console.error('Error rejecting place:', error);
    if (error.message === 'Place not found') {
      return res.status(404).json({
        message: 'Place not found',
      });
    }
    return res.status(500).json({
      message: 'Failed to reject place',
    });
  }
});

export default router;
